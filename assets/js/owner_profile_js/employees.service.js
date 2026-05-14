/**
 * İŞÇİLƏRİN İDARƏ EDİLMƏSİ ÜÇÜN XİDMƏT
 * Modal yox, sağ content-də göstərilir
 */
class EmployeesService {
    constructor(apiService) {
        this.api = apiService;
        this.currentCompanyCode = null;
        this.employees = [];
        this.filteredEmployees = [];
        this.departments = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.searchTerm = '';
        this.filterStatus = 'all';
        this.filterDepartment = 'all';

        this.employeesSection = null;
        this.employeeDetailsSection = null;
        this.addModal = null;
        this.editModal = null;

        // Company kodunu yüklə
        this.loadUserCompanyCode();

        console.log('👥 İşçilər modulu işə salındı, company code:', this.currentCompanyCode);
    }

    /**
     * Company kodunu localStorage-dan yüklə
     */
    loadUserCompanyCode() {
        try {
            const userData = localStorage.getItem('userData');
            if (userData) {
                const parsed = JSON.parse(userData);
                this.currentCompanyCode = parsed.user?.company_code ||
                                         parsed.company_code ||
                                         parsed.user?.companyCode ||
                                         parsed.companyCode;
            }

            // Əgər localStorage-da yoxdursa, window.app-dən yoxla
            if (!this.currentCompanyCode && window.app?.user) {
                this.currentCompanyCode = window.app.user.company_code || window.app.user.companyCode;
            }

            console.log('📋 İşçilər üçün company code:', this.currentCompanyCode);
        } catch (e) {
            console.error('❌ Company code yükləmə xətası:', e);
        }
    }

    /**
     * İşçilər bölməsini göstər
     */
    async showEmployeesSection() {
        console.log('👥 İşçilər bölməsi göstərilir...');

        try {
            // 1. BÜTÜN BÖLMƏLƏRİ GİZLƏT
            const dashboardSection = document.getElementById('dashboardSection');
            const profileSection = document.getElementById('profileSection');
            const companiesSection = document.getElementById('companiesSection');
            const companyDetailsSection = document.getElementById('companyDetailsSection');
            const filesSection = document.getElementById('filesSection');

            if (dashboardSection) dashboardSection.style.display = 'none';
            if (profileSection) profileSection.style.display = 'none';
            if (companiesSection) companiesSection.style.display = 'none';
            if (companyDetailsSection) companyDetailsSection.style.display = 'none';
            if (filesSection) filesSection.style.display = 'none';

            // 2. KÖHNƏ İŞÇİLƏR BÖLMƏSİNİ TAMAMİLƏ SİL
            const oldEmployeesSection = document.getElementById('employeesSection');
            if (oldEmployeesSection) {
                oldEmployeesSection.remove();
                this.employeesSection = null;
                console.log('🗑️ Köhnə işçilər bölməsi silindi');
            }

            // 3. KÖHNƏ DETALLAR BÖLMƏSİNİ DƏ SİL
            const oldDetailsSection = document.getElementById('employeeDetailsSection');
            if (oldDetailsSection) {
                oldDetailsSection.remove();
                this.employeeDetailsSection = null;
                console.log('🗑️ Köhnə detallar bölməsi silindi');
            }

            // 4. YENİ İŞÇİLƏR BÖLMƏSİ YARAT
            this.createEmployeesSection();

            // 5. İŞÇİLƏR BÖLMƏSİNİ GÖSTƏR
            if (this.employeesSection) {
                this.employeesSection.style.display = 'block';
                await this.loadEmployees();
                console.log('✅ Yeni işçilər bölməsi göstərildi');
            }

            // 7. SİDEBAR-I DARALT
            const sidebar = document.getElementById('mainSidebar');
            if (sidebar) sidebar.classList.add('sidebar-collapsed');

        } catch (error) {
            console.error('❌ İşçilər bölməsi göstərilərkən xəta:', error);
        }
    }

    /**
     * İşçilər bölməsini yarat
     */
    createEmployeesSection() {
        const mainElement = document.querySelector('main .overflow-y-auto') ||
                           document.querySelector('main #profileContent') ||
                           document.querySelector('main > div') ||
                           document.querySelector('main');

        if (!mainElement) {
            console.error('❌ Ana element tapılmadı');
            return;
        }

        // YENİDƏN YOXLA - əgər hələ də varsa, sil
        const existingSection = document.getElementById('employeesSection');
        if (existingSection) {
            existingSection.remove();
        }

        this.employeesSection = document.createElement('section');
        this.employeesSection.id = 'employeesSection';
        this.employeesSection.className = ''; // 'hidden' deyil, birbaşa göstərəcəyik
        this.employeesSection.innerHTML = `
            <div class="mb-8">
                <div class="flex items-center justify-between">
                    <div>
                        <span class="text-sm font-semibold uppercase tracking-widest text-brand-blue">İşçilər</span>
                        <p class="text-slate-500 mt-2">Şirkətinizin işçi siyahısı</p>
                    </div>
                    <div class="flex gap-3">
                        <button id="addEmployeeBtn" class="px-4 py-2 bg-brand-blue text-white rounded-xl hover:bg-blue-600 transition flex items-center gap-2">
                            <i class="fa-solid fa-user-plus"></i> Yeni İşçi
                        </button>
                        <button id="backToProfileFromEmployeesBtn" class="px-4 py-2 bg-brand-soft text-brand-blue rounded-xl hover:bg-brand-blue hover:text-white transition flex items-center gap-2">
                            <i class="fa-solid fa-arrow-left"></i> Profilə Qayıt
                        </button>
                    </div>
                </div>
            </div>

            <!-- Statistik kartlar -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div class="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-600">Cəmi İşçi</p>
                            <p class="text-2xl font-bold text-gray-900" id="totalEmployeesCount">0</p>
                        </div>
                        <div class="h-12 w-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                            <i class="fa-solid fa-users text-blue-600"></i>
                        </div>
                    </div>
                </div>
                <div class="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-600">Aktiv İşçi</p>
                            <p class="text-2xl font-bold text-gray-900" id="activeEmployeesCount">0</p>
                        </div>
                        <div class="h-12 w-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                            <i class="fa-solid fa-user-check text-green-600"></i>
                        </div>
                    </div>
                </div>
                <div class="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-600">Departamentlər</p>
                            <p class="text-2xl font-bold text-gray-900" id="departmentsCount">0</p>
                        </div>
                        <div class="h-12 w-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                            <i class="fa-solid fa-building text-purple-600"></i>
                        </div>
                    </div>
                </div>
                <div class="bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-600">Son əlavə</p>
                            <p class="text-lg font-bold text-gray-900" id="lastEmployeeAdded">-</p>
                        </div>
                        <div class="h-12 w-12 rounded-lg bg-orange-500/20 flex items-center justify-center">
                            <i class="fa-solid fa-calendar-plus text-orange-600"></i>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Axtarış və filter -->
            <div class="flex flex-col md:flex-row gap-4 mb-6">
                <div class="flex-1">
                    <div class="relative">
                        <i class="fa-solid fa-search absolute left-4 top-3.5 text-gray-400"></i>
                        <input type="text" id="employeeSearch" placeholder="Ad, soyad, email, telefon üzrə axtar..." 
                               class="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue">
                    </div>
                </div>
                <div class="flex gap-2">
                    <select id="employeeFilter" class="px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue">
                        <option value="all">Hamısı</option>
                        <option value="active">Aktiv işçilər</option>
                        <option value="inactive">Deaktiv işçilər</option>
                    </select>
                    <button id="refreshEmployeesBtn" class="px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 flex items-center gap-2">
                        <i class="fa-solid fa-rotate-right"></i> Yenilə
                    </button>
                </div>
            </div>

            <!-- İşçilər cədvəli -->
            <div id="employeesTableContainer" class="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div class="text-center py-16">
                    <div class="inline-block h-12 w-12 animate-spin rounded-full border-4 border-brand-blue border-t-transparent"></div>
                    <p class="text-gray-500 mt-4">İşçi siyahısı yüklənir...</p>
                </div>
            </div>

            <!-- Pagination -->
            <div class="mt-6 flex items-center justify-between">
                <div class="text-sm text-gray-600">
                    <span id="employeeShowingText">0-0 / 0</span>
                </div>
                <div class="flex gap-2">
                    <button id="employeePrevPage" class="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50" disabled>
                        <i class="fa-solid fa-chevron-left"></i>
                    </button>
                    <button id="employeeNextPage" class="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50" disabled>
                        <i class="fa-solid fa-chevron-right"></i>
                    </button>
                </div>
            </div>
        `;

        mainElement.appendChild(this.employeesSection);
        this.bindSectionEvents();
    }

    /**
     * Bölmə event-lərini bağla
     */
    bindSectionEvents() {
        // Profilə qayıt
        const backToProfileBtn = document.getElementById('backToProfileFromEmployeesBtn');
        if (backToProfileBtn) {
            backToProfileBtn.addEventListener('click', () => {
                // Bütün bölmələri gizlət
                const dashboardSection = document.getElementById('dashboardSection');
                const profileSection = document.getElementById('profileSection');
                const companiesSection = document.getElementById('companiesSection');
                const companyDetailsSection = document.getElementById('companyDetailsSection');
                const filesSection = document.getElementById('filesSection');

                if (dashboardSection) dashboardSection.style.display = 'none';
                if (companiesSection) companiesSection.style.display = 'none';
                if (companyDetailsSection) companyDetailsSection.style.display = 'none';
                if (filesSection) filesSection.style.display = 'none';

                // İşçilər bölməsini gizlət
                if (this.employeesSection) this.employeesSection.style.display = 'none';

                // Profil bölməsini göstər
                if (profileSection) profileSection.style.display = 'block';
            });
        }

        // Axtarış
        const searchInput = document.getElementById('employeeSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.filterEmployees();
                this.renderTable();
            });
        }

        // Filter
        const filterSelect = document.getElementById('employeeFilter');
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                this.filterStatus = e.target.value;
                this.filterEmployees();
                this.renderTable();
            });
        }

        // Yenilə
        const refreshBtn = document.getElementById('refreshEmployeesBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadEmployees());
        }

        // Pagination
        const prevBtn = document.getElementById('employeePrevPage');
        const nextBtn = document.getElementById('employeeNextPage');

        if (prevBtn) prevBtn.addEventListener('click', () => this.previousPage());
        if (nextBtn) nextBtn.addEventListener('click', () => this.nextPage());

        // Yeni işçi əlavə et
        const addBtn = document.getElementById('addEmployeeBtn');
        if (addBtn) addBtn.addEventListener('click', () => this.openAddEmployeeForm());
    }

    /**
     * İşçiləri yüklə - GÜCLƏNDİRİLMİŞ VERSİYA
     */
    async loadEmployees() {
        const container = document.getElementById('employeesTableContainer');

        try {
            if (!this.currentCompanyCode) {

                return;
            }

            console.log('📥 İşçilər yüklənir:', this.currentCompanyCode);

            // 1. İşçiləri yüklə
            const employees = await this.api.get(`/users/company/${this.currentCompanyCode}`);
            this.employees = Array.isArray(employees) ? employees : [];

            console.log(`✅ ${this.employees.length} işçi tapıldı`);

            // 2. Departamentləri yüklə (xəta olsa da davam et)
            try {
                const departments = await this.getCompanyDepartments();
                this.departments = Array.isArray(departments) ? departments : [];
                console.log(`✅ ${this.departments.length} departament tapıldı`);
            } catch (deptError) {
                console.warn('⚠️ Departamentlər yüklənmədi, davam edirik');
                this.departments = [];
            }

            // 3. Filterləri tətbiq et
            this.filterEmployees();

            // 4. Statistikaları yenilə
            this.updateStatistics();

            // 5. Cədvəli render et
            this.renderTable();

        } catch (error) {
            console.error('❌ İşçilər yüklənmədi:', error);

            if (container) {
                container.innerHTML = `
                    <div class="text-center py-16">
                        <div class="inline-block h-24 w-24 rounded-full bg-red-100 flex items-center justify-center mb-6">
                            <i class="fa-solid fa-exclamation-triangle text-3xl text-red-500"></i>
                        </div>
                        <h3 class="text-xl font-semibold text-gray-700 mb-2">Xəta baş verdi</h3>
                        <p class="text-gray-500 mb-6">İşçilər yüklənə bilmədi</p>
                        <button onclick="window.employeesService?.loadEmployees()" 
                                class="px-6 py-3 bg-brand-blue text-white rounded-xl hover:bg-blue-600">
                            <i class="fa-solid fa-refresh mr-2"></i> Təkrar cəhd et
                        </button>
                    </div>
                `;
            }
        }
    }

    /**
     * Departamentləri gətir - DÜZGÜN VERSİYA
     */
    async getCompanyDepartments() {
        try {
            console.log('🔍 Departamentlər yüklənir...');

            // 1. Əvvəlcə company_id-ni tap
            const companyId = await this.getCompanyIdByCode(this.currentCompanyCode);

            if (!companyId) {
                console.warn('⚠️ Company ID tapılmadı');
                return [];
            }

            console.log(`✅ Company ID tapıldı: ${companyId}`);

            // 2. İndi integer ID ilə sorğu göndər
            const response = await this.api.get(`/departments/company/${companyId}`);

            console.log('📦 Departamentlər cavabı:', response);

            // 3. Cavabı array-ə çevir
            let departments = [];

            if (Array.isArray(response)) {
                departments = response;
            } else if (response && response.data && Array.isArray(response.data)) {
                departments = response.data;
            } else if (response && response.items && Array.isArray(response.items)) {
                departments = response.items;
            }

            console.log(`✅ ${departments.length} departament tapıldı`);
            return departments;

        } catch (error) {
            console.warn('⚠️ Departamentlər gətirilə bilmədi:', error);
            return [];
        }
    }

    /**
     * Company koduna görə ID-ni tap - TAM VERSİYA
     */
    async getCompanyIdByCode(companyCode) {
        try {
            console.log(`🔍 Company ID axtarılır: ${companyCode}`);

            // METHOD 1: Users endpoint-dən company_id götür
            try {
                const users = await this.api.get(`/users/company/${companyCode}`);

                if (users && users.length > 0) {
                    const companyId = users[0].company_id;
                    if (companyId) {
                        console.log(`✅ Users-dən company_id tapıldı: ${companyId}`);
                        return companyId;
                    }
                }
            } catch (e) {
                console.log('ℹ️ Users endpoint-dən company_id alınmadı');
            }

            // METHOD 2: Companies endpoint-dən id götür
            try {
                const company = await this.api.get(`/companies/code/${companyCode}`);

                if (company && company.id) {
                    console.log(`✅ Companies endpoint-dən id tapıldı: ${company.id}`);
                    return company.id;
                }

                if (company && company.company && company.company.id) {
                    return company.company.id;
                }
            } catch (e) {
                console.log('ℹ️ Companies endpoint-dən id alınmadı');
            }

            // METHOD 3: /companies/check/{code} endpoint-i yoxla (əgər varsa)
            try {
                const check = await this.api.get(`/companies/check/${companyCode}`);
                if (check && check.id) {
                    return check.id;
                }
            } catch (e) {}

            // METHOD 4: localStorage-da company_id saxlanılıbsa
            try {
                const userData = localStorage.getItem('userData');
                if (userData) {
                    const parsed = JSON.parse(userData);
                    if (parsed.user && parsed.user.company_id) {
                        return parsed.user.company_id;
                    }
                    if (parsed.company_id) {
                        return parsed.company_id;
                    }
                }
            } catch (e) {}

            console.warn('⚠️ Company ID tapılmadı');
            return null;

        } catch (error) {
            console.error('❌ Company ID tapma xətası:', error);
            return null;
        }
    }

    /**
     * Filter tətbiq et
     */
    filterEmployees() {
        this.filteredEmployees = this.employees.filter(emp => {
            if (this.filterStatus === 'active' && !emp.is_active) return false;
            if (this.filterStatus === 'inactive' && emp.is_active) return false;

            if (this.searchTerm) {
                const searchFields = [
                    emp.first_name, emp.last_name, emp.email, emp.phone,
                    emp.ceo_name, emp.ceo_email, emp.ceo_phone
                ].filter(Boolean).join(' ').toLowerCase();
                return searchFields.includes(this.searchTerm);
            }

            return true;
        });

        this.currentPage = 1;
    }

    /**
     * Statistikaları yenilə
     */
    updateStatistics() {
        const totalEl = document.getElementById('totalEmployeesCount');
        const activeEl = document.getElementById('activeEmployeesCount');
        const deptEl = document.getElementById('departmentsCount');
        const lastEl = document.getElementById('lastEmployeeAdded');

        if (totalEl) totalEl.textContent = this.employees.length;

        const activeCount = this.employees.filter(e => e.is_active).length;
        if (activeEl) activeEl.textContent = activeCount;

        if (deptEl) deptEl.textContent = this.departments.length;

        if (lastEl && this.employees.length) {
            const sorted = [...this.employees].sort((a, b) =>
                new Date(b.created_at || 0) - new Date(a.created_at || 0)
            );
            lastEl.textContent = this.formatDate(sorted[0].created_at);
        }
    }

    /**
     * Cədvəli render et - GÜCLƏNDİRİLMİŞ VERSİYA
     */
    renderTable() {
        const container = document.getElementById('employeesTableContainer');
        if (!container) return;

        // Əgər işçi yoxdursa
        if (!this.filteredEmployees || this.filteredEmployees.length === 0) {
            container.innerHTML = this.getEmptyStateHTML();

            // Pagination gizlət
            document.getElementById('employeePrevPage').disabled = true;
            document.getElementById('employeeNextPage').disabled = true;
            document.getElementById('employeeShowingText').textContent = '0-0 / 0';
            return;
        }

        // Pagination hesabla
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = Math.min(start + this.itemsPerPage, this.filteredEmployees.length);
        const pageEmployees = this.filteredEmployees.slice(start, end);
        const totalPages = Math.ceil(this.filteredEmployees.length / this.itemsPerPage);

        console.log(`📊 Cədvəl render: ${pageEmployees.length} işçi (səhifə ${this.currentPage}/${totalPages})`);

        // Cədvəli göstər
        container.innerHTML = this.getTableHTML(pageEmployees);

        // Pagination yenilə
        this.updatePagination(totalPages);

        // Showing text yenilə
        const showingText = document.getElementById('employeeShowingText');
        if (showingText) {
            showingText.textContent = `${start + 1}-${end} / ${this.filteredEmployees.length}`;
        }

        // Event listener-ları bağla
        this.attachTableEvents();
    }

    /**
     * Boş vəziyyət HTML
     */
    getEmptyStateHTML() {
        return `
            <div class="text-center py-16">
                <div class="inline-block h-24 w-24 rounded-full bg-gray-100 flex items-center justify-center mb-6">
                    <i class="fa-solid fa-users text-3xl text-gray-400"></i>
                </div>
                <h3 class="text-xl font-semibold text-gray-700 mb-2">İşçi tapılmadı</h3>
                <p class="text-gray-500 mb-6">Axtarış kriteriyalarınıza uyğun işçi tapılmadı</p>
                <button class="reset-employee-search px-6 py-3 bg-brand-blue text-white rounded-xl hover:bg-blue-600 font-medium">
                    <i class="fa-solid fa-refresh mr-2"></i> Bütün işçiləri göstər
                </button>
            </div>
        `;
    }

    /**
     * Cədvəl HTML
     */
    getTableHTML(employees) {
        return `
            <div class="overflow-x-auto">
                <table class="w-full">
                    <thead>
                        <tr class="bg-gray-50 border-b">
                            <th class="text-left py-4 px-6 text-sm font-semibold text-gray-700">İşçi</th>
                            <th class="text-left py-4 px-6 text-sm font-semibold text-gray-700">Email</th>
                            <th class="text-left py-4 px-6 text-sm font-semibold text-gray-700">Telefon</th>
                            <th class="text-left py-4 px-6 text-sm font-semibold text-gray-700">Departament</th>
                            <th class="text-left py-4 px-6 text-sm font-semibold text-gray-700">Vəzifə</th>
                            <th class="text-left py-4 px-6 text-sm font-semibold text-gray-700">Status</th>
                            <th class="text-left py-4 px-6 text-sm font-semibold text-gray-700">Əməliyyatlar</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${employees.map(emp => this.getTableRowHTML(emp)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    /**
     * Cədvəl sətri HTML - departament adı üçün düzəliş
     */
    getTableRowHTML(emp) {
        const name = emp.first_name || emp.ceo_name || '';
        const surname = emp.last_name || emp.ceo_lastname || '';
        const fullName = `${name} ${surname}`.trim() || '—';
        const email = emp.email || emp.ceo_email || '—';
        const phone = emp.phone || emp.ceo_phone || '—';

        // Departament adını tap
        const deptName = this.getDepartmentName(emp.department_id);

        const position = emp.position || emp.user_type || '—';
        const statusClass = emp.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
        const statusText = emp.is_active ? 'Aktiv' : 'Deaktiv';

        return `
            <tr class="border-b hover:bg-gray-50">
                <td class="py-4 px-6">
                    <div class="flex items-center">
                        <div class="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                            <span class="text-blue-600 font-semibold">${fullName.charAt(0)}</span>
                        </div>
                        <div class="font-medium text-gray-900">${fullName}</div>
                    </div>
                </td>
                <td class="py-4 px-6">
                    <div class="text-sm">${email}</div>
                </td>
                <td class="py-4 px-6 text-sm">${phone}</td>
                <td class="py-4 px-6">
                    <div class="text-sm">${deptName}</div>
                </td>
                <td class="py-4 px-6 text-sm">${position}</td>
                <td class="py-4 px-6">
                    <span class="px-3 py-1 rounded-full text-xs font-medium ${statusClass}">${statusText}</span>
                </td>
                <td class="py-4 px-6">
                    <div class="flex space-x-2">
                        <button class="view-employee-btn px-3 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100" data-id="${emp.id}" title="Bax">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                        <button class="edit-employee-btn px-3 py-2 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100" data-id="${emp.id}" title="Redaktə et">
                            <i class="fa-solid fa-edit"></i>
                        </button>
                        <button class="assign-companies-btn px-3 py-2 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100" data-id="${emp.id}" title="Şirkət təyin et">
                            <i class="fa-solid fa-building-user"></i>
                        </button>
                        <button class="delete-employee-btn px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100" data-id="${emp.id}" title="Sil">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    /**
     * Departament adını tap
     */
    getDepartmentName(deptId) {
        if (!deptId) return 'Təyin edilməyib';
        const dept = this.departments.find(d => d.id == deptId || d.department_id == deptId);
        return dept ? dept.department_name : 'Təyin edilməyib';
    }

    /**
     * Cədvəl event-lərini bağla
     */
    attachTableEvents() {
        // Reset search
        document.querySelectorAll('.reset-employee-search').forEach(btn => {
            btn.addEventListener('click', () => {
                this.searchTerm = '';
                this.filterStatus = 'all';
                const searchInput = document.getElementById('employeeSearch');
                const filterSelect = document.getElementById('employeeFilter');
                if (searchInput) searchInput.value = '';
                if (filterSelect) filterSelect.value = 'all';
                this.filterEmployees();
                this.renderTable();
            });
        });

        // View buttons
        document.querySelectorAll('.view-employee-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.viewEmployee(e.currentTarget.dataset.id));
        });

        // Edit buttons
        document.querySelectorAll('.edit-employee-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.openEditEmployeeModal(e.currentTarget.dataset.id));
        });

        // ✅ ASSIGN COMPANIES BUTTONS - YENİ ƏLAVƏ EDİLDİ
        document.querySelectorAll('.assign-companies-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const employeeId = e.currentTarget.dataset.id;
                console.log('🏢 Şirkət təyin et düyməsi klikləndi, işçi ID:', employeeId);
                this.openAssignCompaniesModal(employeeId);
            });
        });

        // Delete buttons
        document.querySelectorAll('.delete-employee-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.deleteEmployee(e.currentTarget.dataset.id));
        });
    }

    /**
     * İşçiyə şirkət təyin etmə modalını aç
     */
    async openAssignCompaniesModal(employeeId) {
        try {
            // İşçi məlumatlarını yüklə
            const employee = await this.getEmployeeById(employeeId);
            const employeeName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'İşçi';

            this.closeModals();

            // Loading göstər
            const loadingHtml = `
                <div id="assignCompaniesModal" class="fixed inset-0 z-[200] overflow-y-auto bg-black bg-opacity-50">
                    <div class="flex items-center justify-center min-h-screen px-4">
                        <div class="bg-white rounded-2xl p-8 text-center">
                            <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-brand-blue border-t-transparent"></div>
                            <p class="mt-4 text-gray-600">Şirkət siyahısı yüklənir...</p>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', loadingHtml);

            // ✅ DÜZƏLDİLƏN SORĞU - query params yox, birbaşa GET
            const myCompaniesResponse = await this.api.get('/users/my-companies');

            // Loading modalını sil
            document.getElementById('assignCompaniesModal')?.remove();

            if (!myCompaniesResponse || !myCompaniesResponse.success) {
                this.showError(myCompaniesResponse?.error || 'Şirkət siyahısı yüklənmədi');
                return;
            }

            const availableCompanies = myCompaniesResponse.companies || [];

            // İşçinin təyin olunduğu şirkətləri yüklə
            let assignedCodes = [];
            try {
                const assignedResponse = await this.api.get(`/users/${employeeId}/assigned-companies`);
                console.log('📋 Assigned response:', assignedResponse);
                assignedCodes = assignedResponse.assigned_company_codes || [];
                console.log('📋 Assigned codes:', assignedCodes);
            } catch(e) {
                console.warn('⚠️ Assigned companies yüklənmədi:', e);
            }
            if (availableCompanies.length === 0) {
                this.showError('Təyin edə biləcəyiniz şirkət tapılmadı');
                return;
            }

            const modalHTML = `
                <div id="assignCompaniesModal" class="fixed inset-0 z-[200] overflow-y-auto bg-black bg-opacity-50">
                    <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center">
                        <div class="inline-block w-full max-w-2xl my-8 text-left align-middle transition-all transform bg-white shadow-2xl rounded-3xl overflow-hidden">
                            <div class="bg-white border-b border-gray-200 px-8 py-6">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-3">
                                        <div class="h-12 w-12 rounded-xl bg-purple-100 flex items-center justify-center">
                                            <i class="fa-solid fa-building-user text-purple-600"></i>
                                        </div>
                                        <div>
                                            <h3 class="text-xl font-bold text-gray-900">Şirkət Təyinatı</h3>
                                            <p class="text-gray-600 text-sm">
                                                ${employeeName}
                                                <span class="text-gray-400">(ID: ${employee.id})</span>
                                            </p>
                                        </div>
                                    </div>
                                    <button id="closeAssignModalBtn" class="h-10 w-10 rounded-full bg-gray-100 hover:bg-gray-200">
                                        <i class="fa-solid fa-times text-gray-600"></i>
                                    </button>
                                </div>
                            </div>
                            
                            <div class="px-8 py-6">
                                <div class="bg-blue-50 rounded-xl p-4 mb-6">
                                    <p class="text-sm text-blue-800">
                                        <i class="fa-solid fa-info-circle mr-2"></i>
                                        Aşağıdakı şirkətlərdən bir və ya bir neçəsini seçin. 
                                        İşçi seçilən şirkətlərdə xidmət göstərə biləcək.
                                    </p>
                                </div>
                                
                                <div class="mb-6">
                                    <label class="block text-sm font-medium text-gray-700 mb-3">Mövcud Şirkətlər:</label>
                                    <div id="companiesChecklist" class="space-y-2 max-h-80 overflow-y-auto border border-gray-200 rounded-xl p-4">
                                        ${availableCompanies.map(company => {
                                            const isChecked = assignedCodes.includes(company.company_code);
                                            const typeLabel = company.relationship_type === 'own' ? 'Əsas şirkət' : 'Alt şirkət';
                                            const typeClass = company.relationship_type === 'own' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700';
                                            return `
                                                <label class="flex items-center p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition">
                                                    <input type="checkbox" 
                                                           class="company-checkbox h-5 w-5 text-brand-blue rounded border-gray-300"
                                                           value="${company.company_code}"
                                                           data-name="${company.company_name}"
                                                           data-type="${company.relationship_type}"
                                                           ${isChecked ? 'checked' : ''}>
                                                    <div class="ml-3 flex-1">
                                                        <div class="flex items-center">
                                                            <span class="font-medium text-gray-900">${company.company_name}</span>
                                                            <span class="ml-2 text-xs px-2 py-0.5 rounded-full ${typeClass}">
                                                                ${typeLabel}
                                                            </span>
                                                        </div>
                                                        <div class="text-xs text-gray-500 mt-0.5">${company.company_code}</div>
                                                    </div>
                                                </label>
                                            `;
                                        }).join('')}
                                    </div>
                                </div>
                                
                                <div class="bg-gray-50 rounded-xl p-4 mb-6">
                                    <div class="flex items-center justify-between">
                                        <span class="text-sm text-gray-600">Seçilən şirkət sayı:</span>
                                        <span id="selectedCount" class="text-lg font-bold text-brand-blue">${assignedCodes.length}</span>
                                    </div>
                                </div>
                                
                                <div class="flex justify-end gap-3 pt-4">
                                    <button type="button" id="cancelAssignBtn" class="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50">
                                        Ləğv et
                                    </button>
                                    <button type="button" id="saveAssignBtn" class="px-6 py-3 bg-brand-blue text-white rounded-xl hover:bg-blue-600 flex items-center gap-2">
                                        <i class="fa-solid fa-save"></i> Yadda saxla
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHTML);

            // Seçim sayını yenilə
            const updateSelectedCount = () => {
                const checked = document.querySelectorAll('#companiesChecklist .company-checkbox:checked');
                const countSpan = document.getElementById('selectedCount');
                if (countSpan) countSpan.textContent = checked.length;
            };

            // Checkbox eventləri
            document.querySelectorAll('#companiesChecklist .company-checkbox').forEach(cb => {
                cb.addEventListener('change', updateSelectedCount);
            });

            // Bağlama düymələri
            const closeBtn = document.getElementById('closeAssignModalBtn');
            const cancelBtn = document.getElementById('cancelAssignBtn');
            const saveBtn = document.getElementById('saveAssignBtn');
            const modal = document.getElementById('assignCompaniesModal');

            if (closeBtn) closeBtn.addEventListener('click', () => this.closeModals());
            if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeModals());

            saveBtn.addEventListener('click', async () => {
                const selected = [];
                document.querySelectorAll('#companiesChecklist .company-checkbox:checked').forEach(cb => {
                    selected.push(cb.value);
                });

                if (selected.length === 0) {
                    this.showError('Ən azı bir şirkət seçin');
                    return;
                }

                saveBtn.disabled = true;
                saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saxlanılır...';

                try {
                    const params = new URLSearchParams();
                    selected.forEach(code => params.append('company_codes', code));

                    const response = await this.api.post(
                        `/users/${employeeId}/assign-companies?${params.toString()}`
                    );

                    console.log('✅ Assign response:', response); // nə gəldiyin gör

                    // ✅ FIX: response.success yox, sadəcə response-u yoxla
                    if (response && (response.success === true || response.user_id)) {
                        // Əvvəl modalı bağla
                        document.getElementById('assignCompaniesModal')?.remove();

                        this.showSuccess(`${selected.length} şirkət təyin edildi`);
                        await this.loadEmployees();
                    } else {
                        this.showError(response?.message || response?.detail || 'Xəta baş verdi');
                    }

                } catch (error) {
                    console.error('❌ Assign xətası:', error);
                    this.showError('Xəta: ' + error.message);
                } finally {
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = '<i class="fa-solid fa-save"></i> Yadda saxla';
                }
            });

            // Overlay klik
            if (modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) this.closeModals();
                });
            }

            // Escape düyməsi
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    this.closeModals();
                    document.removeEventListener('keydown', escHandler);
                }
            };
            document.addEventListener('keydown', escHandler);

        } catch (error) {
            console.error('❌ Şirkət siyahısı yüklənmədi:', error);
            document.getElementById('assignCompaniesModal')?.remove();
            this.showError('Şirkət siyahısı yüklənmədi: ' + error.message);
        }
    }

    /**
     * Pagination yenilə
     */
    updatePagination(totalPages) {
        const prevBtn = document.getElementById('employeePrevPage');
        const nextBtn = document.getElementById('employeeNextPage');

        if (prevBtn) prevBtn.disabled = this.currentPage <= 1;
        if (nextBtn) nextBtn.disabled = this.currentPage >= totalPages;
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.renderTable();
        }
    }

    nextPage() {
        const totalPages = Math.ceil(this.filteredEmployees.length / this.itemsPerPage);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.renderTable();
        }
    }

    /**
     * İşçi detallarına bax (sağ content-də)
     */
    async viewEmployee(employeeId) {
        try {
            const employee = await this.getEmployeeById(employeeId);

            // Detallar bölməsini yarat (əgər yoxdursa)
            if (!this.employeeDetailsSection) {
                this.createEmployeeDetailsSection();
            }

            const contentDiv = document.getElementById('employeeDetailsContent');
            if (!contentDiv) return;

            const name = employee.first_name || employee.ceo_name || '';
            const surname = employee.last_name || employee.ceo_lastname || '';
            const fullName = `${name} ${surname}`.trim() || '—';
            const email = employee.email || employee.ceo_email || '—';
            const phone = employee.phone || employee.ceo_phone || '—';
            const deptName = this.getDepartmentName(employee.department_id);
            const position = employee.position || '—';
            const statusClass = employee.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
            const statusText = employee.is_active ? 'Aktiv' : 'Deaktiv';

            contentDiv.innerHTML = `
                <div class="bg-white rounded-xl border border-gray-200 p-6">
                    <div class="flex items-center gap-4 mb-6 pb-4 border-b">
                        <div class="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                            <span class="text-2xl text-blue-600 font-semibold">${fullName.charAt(0)}</span>
                        </div>
                        <div>
                            <h2 class="text-2xl font-bold text-gray-900">${fullName}</h2>
                            <p class="text-gray-600">ID: ${employee.id}</p>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h3 class="font-semibold text-gray-700 mb-3">Əlaqə məlumatları</h3>
                            <div class="space-y-2">
                                <div class="flex justify-between py-2 border-b">
                                    <span class="text-gray-600">Email:</span>
                                    <span class="font-medium">${email}</span>
                                </div>
                                <div class="flex justify-between py-2 border-b">
                                    <span class="text-gray-600">Telefon:</span>
                                    <span class="font-medium">${phone}</span>
                                </div>
                                ${employee.fin_code ? `
                                <div class="flex justify-between py-2 border-b">
                                    <span class="text-gray-600">FİN kod:</span>
                                    <span class="font-medium">${employee.fin_code}</span>
                                </div>
                                ` : ''}
                            </div>
                        </div>
                        
                        <div>
                            <h3 class="font-semibold text-gray-700 mb-3">İş məlumatları</h3>
                            <div class="space-y-2">
                                <div class="flex justify-between py-2 border-b">
                                    <span class="text-gray-600">Departament:</span>
                                    <span class="font-medium">${deptName}</span>
                                </div>
                                <div class="flex justify-between py-2 border-b">
                                    <span class="text-gray-600">Vəzifə:</span>
                                    <span class="font-medium">${position}</span>
                                </div>
                                <div class="flex justify-between py-2 border-b">
                                    <span class="text-gray-600">Status:</span>
                                    <span class="px-3 py-1 rounded-full text-xs font-medium ${statusClass}">${statusText}</span>
                                </div>
                                ${employee.hire_date ? `
                                <div class="flex justify-between py-2 border-b">
                                    <span class="text-gray-600">İşə başlama:</span>
                                    <span class="font-medium">${this.formatDate(employee.hire_date)}</span>
                                </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    
                    <div class="mt-6 flex justify-end gap-3">
                        <button class="back-to-employees-btn px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200">
                            <i class="fa-solid fa-arrow-left mr-2"></i> Geri
                        </button>
                        <button class="edit-from-details-btn px-4 py-2 bg-amber-500 text-white rounded-xl hover:bg-amber-600" data-id="${employee.id}">
                            <i class="fa-solid fa-edit mr-2"></i> Redaktə et
                        </button>
                    </div>
                </div>
            `;

            // İşçilər bölməsini gizlət, detalları göstər
            if (this.employeesSection) this.employeesSection.style.display = 'none';
            if (this.employeeDetailsSection) this.employeeDetailsSection.style.display = 'block';

            // Geri düyməsi
            document.querySelector('.back-to-employees-btn')?.addEventListener('click', () => {
                if (this.employeeDetailsSection) this.employeeDetailsSection.style.display = 'none';
                if (this.employeesSection) this.employeesSection.style.display = 'block';
            });

            // Redaktə düyməsi
            document.querySelector('.edit-from-details-btn')?.addEventListener('click', (e) => {
                this.openEditEmployeeModal(e.currentTarget.dataset.id);
            });

        } catch (error) {
            console.error('❌ Xəta:', error);
            this.showError('İşçi məlumatları göstərilmədi');
        }
    }

    /**
     * İşçi detalları bölməsini yarat
     */
    createEmployeeDetailsSection() {
        const mainElement = document.querySelector('main .overflow-y-auto') ||
                           document.querySelector('main #profileContent') ||
                           document.querySelector('main > div') ||
                           document.querySelector('main');

        if (!mainElement) return;

        this.employeeDetailsSection = document.createElement('section');
        this.employeeDetailsSection.id = 'employeeDetailsSection';
        this.employeeDetailsSection.className = 'hidden';
        this.employeeDetailsSection.innerHTML = `
            <div class="mb-8">
                <div class="flex items-center justify-between">
                    <div>
                        <span class="text-sm font-semibold uppercase tracking-widest text-brand-blue">İşçi Detalları</span>
                        <p class="text-slate-500 mt-2">İşçi haqqında ətraflı məlumat</p>
                    </div>
                </div>
            </div>
            <div id="employeeDetailsContent"></div>
        `;

        mainElement.appendChild(this.employeeDetailsSection);
    }

    /**
     * Yeni işçi əlavə et (modal)
     */
    openAddEmployeeForm() {
        this.closeModals();

        const departmentOptions = this.departments.length
            ? this.departments.map(d => `<option value="${d.id}">${d.department_name}</option>`).join('')
            : '<option value="">Departament yoxdur</option>';

        const modalHTML = `
            <div id="addEmployeeModal" class="fixed inset-0 z-[200] overflow-y-auto bg-black bg-opacity-50">
                <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center">
                    <div class="inline-block w-full max-w-4xl my-8 text-left align-middle transition-all transform bg-white shadow-2xl rounded-3xl overflow-hidden">
                        <div class="bg-white border-b border-gray-200 px-8 py-6">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-3">
                                    <div class="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center">
                                        <i class="fa-solid fa-user-plus text-green-600"></i>
                                    </div>
                                    <div>
                                        <h3 class="text-xl font-bold text-gray-900">Yeni İşçi Əlavə Et</h3>
                                        <p class="text-gray-600 text-sm">Məlumatları daxil edin</p>
                                    </div>
                                </div>
                                <button id="closeAddEmployeeModalBtn" class="h-10 w-10 rounded-full bg-gray-100 hover:bg-gray-200">
                                    <i class="fa-solid fa-times text-gray-600"></i>
                                </button>
                            </div>
                        </div>
                        
                        <div class="px-8 py-6 max-h-[70vh] overflow-y-auto">
                            <form id="addEmployeeForm" class="space-y-6">
                                <div class="bg-blue-50 rounded-xl p-5">
                                    <h4 class="text-lg font-semibold text-blue-800 mb-4">Şəxsi Məlumatlar</h4>
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-2">Ad *</label>
                                            <input type="text" required id="addFirstName" class="w-full px-4 py-3 border border-gray-300 rounded-xl" placeholder="Ad">
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-2">Soyad *</label>
                                            <input type="text" required id="addLastName" class="w-full px-4 py-3 border border-gray-300 rounded-xl" placeholder="Soyad">
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-2">Ata adı</label>
                                            <input type="text" id="addFatherName" class="w-full px-4 py-3 border border-gray-300 rounded-xl" placeholder="Ata adı">
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-2">Doğum tarixi</label>
                                            <input type="date" id="addBirthDate" class="w-full px-4 py-3 border border-gray-300 rounded-xl">
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-2">Cinsiyyət</label>
                                            <select id="addGender" class="w-full px-4 py-3 border border-gray-300 rounded-xl">
                                                <option value="">Seçin</option>
                                                <option value="male">Kişi</option>
                                                <option value="female">Qadın</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="bg-green-50 rounded-xl p-5">
                                    <h4 class="text-lg font-semibold text-green-800 mb-4">Əlaqə Məlumatları</h4>
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                                            <input type="email" required id="addEmail" class="w-full px-4 py-3 border border-gray-300 rounded-xl" placeholder="email@example.com">
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-2">Telefon</label>
                                            <input type="tel" id="addPhone" class="w-full px-4 py-3 border border-gray-300 rounded-xl" placeholder="+994501234567">
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-2">FİN Kod</label>
                                            <input type="text" id="addFinCode" class="w-full px-4 py-3 border border-gray-300 rounded-xl" placeholder="1234567">
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- 🔐 PASSWORD BÖLMƏSİ - YENİ ƏLAVƏ EDİLDİ -->
                                <div class="bg-red-50 rounded-xl p-5 border-2 border-red-200">
                                    <h4 class="text-lg font-semibold text-red-800 mb-4 flex items-center gap-2">
                                        <i class="fa-solid fa-lock text-red-600"></i>
                                        Giriş Məlumatları
                                    </h4>
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div class="md:col-span-2">
                                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                                Şifrə * 
                                                <span class="text-xs text-gray-500 ml-2">(minimum 6 simvol)</span>
                                            </label>
                                            <div class="relative">
                                                <input type="password" required id="addPassword" minlength="6" 
                                                       class="w-full px-4 py-3 border border-gray-300 rounded-xl pr-12" 
                                                       placeholder="●●●●●●●●">
                                                <button type="button" class="absolute right-3 top-3 text-gray-500 toggle-password">
                                                    <i class="fa-solid fa-eye"></i>
                                                </button>
                                            </div>
                                            <p class="text-xs text-gray-500 mt-2">
                                                <i class="fa-solid fa-info-circle"></i>
                                                İşçi bu şifrə ilə sistemə daxil ola biləcək
                                            </p>
                                        </div>
                                    </div>
                                </div>
                               
                                <div class="bg-purple-50 rounded-xl p-5">
                                    <h4 class="text-lg font-semibold text-purple-800 mb-4">İş Məlumatları</h4>
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-2">Departament *</label>
                                            <select required id="addDepartment" class="w-full px-4 py-3 border border-gray-300 rounded-xl">
                                                <option value="">Seçin</option>
                                                ${departmentOptions}
                                            </select>
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-2">Vəzifə</label>
                                            <input type="text" id="addPosition" class="w-full px-4 py-3 border border-gray-300 rounded-xl" placeholder="Developer">
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-2">İşə başlama tarixi</label>
                                            <input type="date" id="addHireDate" class="w-full px-4 py-3 border border-gray-300 rounded-xl">
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="bg-yellow-50 rounded-xl p-5">
                                    <h4 class="text-lg font-semibold text-yellow-800 mb-4">Status</h4>
                                    <div class="flex items-center">
                                        <input type="checkbox" id="addIsActive" checked class="h-4 w-4 text-blue-600 border-gray-300 rounded">
                                        <label for="addIsActive" class="ml-2 text-sm text-gray-700">Aktiv işçi</label>
                                    </div>
                                </div>
                                
                                <div class="flex justify-end gap-3 pt-4">
                                    <button type="button" id="cancelAddEmployeeBtn" class="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50">Ləğv et</button>
                                    <button type="submit" class="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 flex items-center gap-2">
                                        <i class="fa-solid fa-check"></i> Əlavə et
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // ✅ Password toggle - DÜZGÜN İŞLƏYƏN VERSİYA
        setTimeout(() => {
            const toggleBtn = document.querySelector('#addEmployeeModal .toggle-password');
            if (toggleBtn) {
                toggleBtn.addEventListener('click', function() {
                    const input = document.getElementById('addPassword');
                    const icon = this.querySelector('i');

                    if (input.type === 'password') {
                        input.type = 'text';
                        icon.classList.remove('fa-eye');
                        icon.classList.add('fa-eye-slash');
                    } else {
                        input.type = 'password';
                        icon.classList.remove('fa-eye-slash');
                        icon.classList.add('fa-eye');
                    }
                });
            }
        }, 100);


        this.bindAddEmployeeEvents();
    }

    /**
     * İşçi redaktə modalını aç
     */
    async openEditEmployeeModal(employeeId) {
        try {
            const employee = await this.getEmployeeById(employeeId);
            this.closeModals();

            const departmentOptions = this.departments.length
                ? this.departments.map(d =>
                    `<option value="${d.id}" ${employee.department_id == d.id ? 'selected' : ''}>${d.department_name}</option>`
                  ).join('')
                : '<option value="">Departament yoxdur</option>';

            const modalHTML = `
                <div id="editEmployeeModal" class="fixed inset-0 z-[200] overflow-y-auto bg-black bg-opacity-50">
                    <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center">
                        <div class="inline-block w-full max-w-4xl my-8 text-left align-middle transition-all transform bg-white shadow-2xl rounded-3xl overflow-hidden">
                            <div class="bg-white border-b border-gray-200 px-8 py-6">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-3">
                                        <div class="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center">
                                            <i class="fa-solid fa-user-edit text-amber-600"></i>
                                        </div>
                                        <div>
                                            <h3 class="text-xl font-bold text-gray-900">İşçi Redaktəsi</h3>
                                            <p class="text-gray-600 text-sm">ID: ${employee.id}</p>
                                        </div>
                                    </div>
                                    <button id="closeEditEmployeeModalBtn" class="h-10 w-10 rounded-full bg-gray-100 hover:bg-gray-200">
                                        <i class="fa-solid fa-times text-gray-600"></i>
                                    </button>
                                </div>
                            </div>
                            
                            <div class="px-8 py-6 max-h-[70vh] overflow-y-auto">
                                <form id="editEmployeeForm" class="space-y-6">
                                    <input type="hidden" id="editEmployeeId" value="${employee.id}">
                                    
                                    <div class="bg-blue-50 rounded-xl p-5">
                                        <h4 class="text-lg font-semibold text-blue-800 mb-4">Şəxsi Məlumatlar</h4>
                                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label class="block text-sm font-medium text-gray-700 mb-2">Ad *</label>
                                                <input type="text" required id="editFirstName" class="w-full px-4 py-3 border border-gray-300 rounded-xl" value="${this.escapeHtml(employee.first_name || employee.ceo_name || '')}">
                                            </div>
                                            <div>
                                                <label class="block text-sm font-medium text-gray-700 mb-2">Soyad *</label>
                                                <input type="text" required id="editLastName" class="w-full px-4 py-3 border border-gray-300 rounded-xl" value="${this.escapeHtml(employee.last_name || employee.ceo_lastname || '')}">
                                            </div>
                                            <div>
                                                <label class="block text-sm font-medium text-gray-700 mb-2">Ata adı</label>
                                                <input type="text" id="editFatherName" class="w-full px-4 py-3 border border-gray-300 rounded-xl" value="${this.escapeHtml(employee.father_name || '')}">
                                            </div>
                                            <div>
                                                <label class="block text-sm font-medium text-gray-700 mb-2">Doğum tarixi</label>
                                                <input type="date" id="editBirthDate" class="w-full px-4 py-3 border border-gray-300 rounded-xl" value="${employee.birth_date || ''}">
                                            </div>
                                            <div>
                                                <label class="block text-sm font-medium text-gray-700 mb-2">Cinsiyyət</label>
                                                <select id="editGender" class="w-full px-4 py-3 border border-gray-300 rounded-xl">
                                                    <option value="">Seçin</option>
                                                    <option value="male" ${employee.gender === 'male' ? 'selected' : ''}>Kişi</option>
                                                    <option value="female" ${employee.gender === 'female' ? 'selected' : ''}>Qadın</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="bg-green-50 rounded-xl p-5">
                                        <h4 class="text-lg font-semibold text-green-800 mb-4">Əlaqə Məlumatları</h4>
                                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label class="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                                                <input type="email" required id="editEmail" class="w-full px-4 py-3 border border-gray-300 rounded-xl" value="${this.escapeHtml(employee.email || employee.ceo_email || '')}">
                                            </div>
                                            <div>
                                                <label class="block text-sm font-medium text-gray-700 mb-2">Telefon</label>
                                                <input type="tel" id="editPhone" class="w-full px-4 py-3 border border-gray-300 rounded-xl" value="${this.escapeHtml(employee.phone || employee.ceo_phone || '')}">
                                            </div>
                                            <div>
                                                <label class="block text-sm font-medium text-gray-700 mb-2">FİN Kod</label>
                                                <input type="text" id="editFinCode" class="w-full px-4 py-3 border border-gray-300 rounded-xl" value="${this.escapeHtml(employee.fin_code || '')}">
                                            </div>
                                        </div>
                                    </div>
                                   
                                    <div class="bg-purple-50 rounded-xl p-5">
                                        <h4 class="text-lg font-semibold text-purple-800 mb-4">İş Məlumatları</h4>
                                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label class="block text-sm font-medium text-gray-700 mb-2">Departament</label>
                                                <select id="editDepartment" class="w-full px-4 py-3 border border-gray-300 rounded-xl">
                                                    <option value="">Seçin</option>
                                                    ${departmentOptions}
                                                </select>
                                            </div>
                                            <div>
                                                <label class="block text-sm font-medium text-gray-700 mb-2">Vəzifə</label>
                                                <input type="text" id="editPosition" class="w-full px-4 py-3 border border-gray-300 rounded-xl" value="${this.escapeHtml(employee.position || '')}">
                                            </div>
                                            <div>
                                                <label class="block text-sm font-medium text-gray-700 mb-2">İşə başlama tarixi</label>
                                                <input type="date" id="editHireDate" class="w-full px-4 py-3 border border-gray-300 rounded-xl" value="${employee.hire_date || ''}">
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="bg-yellow-50 rounded-xl p-5">
                                        <h4 class="text-lg font-semibold text-yellow-800 mb-4">Status</h4>
                                        <div class="flex items-center">
                                            <input type="checkbox" id="editIsActive" ${employee.is_active ? 'checked' : ''} class="h-4 w-4 text-blue-600 border-gray-300 rounded">
                                            <label for="editIsActive" class="ml-2 text-sm text-gray-700">Aktiv işçi</label>
                                        </div>
                                    </div>
                                    
                                    <div class="flex justify-end gap-3 pt-4">
                                        <button type="button" id="cancelEditEmployeeBtn" class="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50">Ləğv et</button>
                                        <button type="submit" class="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 flex items-center gap-2">
                                            <i class="fa-solid fa-save"></i> Yadda saxla
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // ✅ BURADA HTML-İ DOM-A ƏLAVƏ ET
            document.body.insertAdjacentHTML('beforeend', modalHTML);

            // ✅ İndi event-ləri bağla (elementlər artıq DOM-da var)
            this.bindEditEmployeeEvents();

        } catch (error) {
            console.error('❌ Xəta:', error);
            this.showError('İşçi məlumatları yüklənmədi: ' + error.message);
        }
    }

    /**
     * Redaktə form eventləri - DÜZƏLDİLDİ
     */
    bindEditEmployeeEvents(originalEmployeeData) {
        const closeBtn = document.getElementById('closeEditEmployeeModalBtn');
        const cancelBtn = document.getElementById('cancelEditEmployeeBtn');
        const modal = document.getElementById('editEmployeeModal');
        const form = document.getElementById('editEmployeeForm');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModals());
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeModals());
        }

        // Overlay kliklə bağlama
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModals();
                }
            });
        }

        // Escape düyməsi
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                this.closeModals();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

        if (form) {
            // Köhnə event listener-ları təmizləmək üçün clone
            const newForm = form.cloneNode(true);
            form.parentNode.replaceChild(newForm, form);

            newForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                const employeeId = document.getElementById('editEmployeeId')?.value;
                if (!employeeId) return;

                const submitBtn = newForm.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saxlanılır...';
                }

                try {
                    // ✅ Əvvəlcə İŞÇİNİN HAZIRKI MƏLUMATLARINI YENİDƏN YÜKLƏ
                    const currentEmployee = await this.getEmployeeById(employeeId);

                    // ✅ YALNIZ DƏYİŞƏN FIELD-LƏRİ GÖNDƏR
                    const data = {};

                    const firstName = document.getElementById('editFirstName')?.value;
                    if (firstName && firstName !== (currentEmployee.first_name || currentEmployee.ceo_name || ''))
                        data.first_name = firstName;

                    const lastName = document.getElementById('editLastName')?.value;
                    if (lastName && lastName !== (currentEmployee.last_name || currentEmployee.ceo_lastname || ''))
                        data.last_name = lastName;

                    const fatherName = document.getElementById('editFatherName')?.value;
                    if (fatherName !== (currentEmployee.father_name || ''))
                        data.father_name = fatherName;

                    const birthDate = document.getElementById('editBirthDate')?.value;
                    if (birthDate !== (currentEmployee.birth_date || ''))
                        data.birth_date = birthDate;

                    const gender = document.getElementById('editGender')?.value;
                    if (gender !== (currentEmployee.gender || ''))
                        data.gender = gender;

                    const email = document.getElementById('editEmail')?.value;
                    if (email !== (currentEmployee.email || currentEmployee.ceo_email || ''))
                        data.email = email;

                    const phone = document.getElementById('editPhone')?.value;
                    if (phone !== (currentEmployee.phone || currentEmployee.ceo_phone || ''))
                        data.phone = phone;

                    const finCode = document.getElementById('editFinCode')?.value;
                    if (finCode !== (currentEmployee.fin_code || ''))
                        data.fin_code = finCode;

                    const departmentId = document.getElementById('editDepartment')?.value;
                    if (departmentId != (currentEmployee.department_id || ''))
                        data.department_id = parseInt(departmentId) || null;

                    const position = document.getElementById('editPosition')?.value;
                    if (position !== (currentEmployee.position || ''))
                        data.position = position;

                    const hireDate = document.getElementById('editHireDate')?.value;
                    if (hireDate !== (currentEmployee.hire_date || ''))
                        data.hire_date = hireDate;

                    const isActive = document.getElementById('editIsActive')?.checked || false;
                    if (isActive !== currentEmployee.is_active)
                        data.is_active = isActive;

                    console.log('📤 Göndərilən data (yalnız dəyişənlər):', data);

                    // Heç bir field dəyişməyibsə, xəta göstərmə
                    if (Object.keys(data).length === 0) {
                        this.showSuccess('Heç bir dəyişiklik edilmədi');
                        this.closeModals();
                        return;
                    }

                    // ✅ PATCH istifadə et
                    await this.api.patch(`/users/${employeeId}`, data);

                    this.showSuccess('Məlumatlar yeniləndi');
                    this.closeModals();
                    await this.loadEmployees();

                } catch (error) {
                    console.error('❌ Update xətası:', error);
                    let errorMsg = error.message;
                    if (error.response?.data?.detail) {
                        errorMsg = error.response.data.detail;
                    } else if (error.response?.data?.message) {
                        errorMsg = error.response.data.message;
                    }
                    this.showError('Xəta: ' + errorMsg);
                } finally {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = '<i class="fa-solid fa-save"></i> Yadda saxla';
                    }
                }
            });
        }
    }

    /**
     * HTML special characters escape et (XSS qarşısını almaq üçün)
     */
    escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    bindAddEmployeeEvents() {
        const closeBtn = document.getElementById('closeAddEmployeeModalBtn');
        const cancelBtn = document.getElementById('cancelAddEmployeeBtn');
        const modal = document.getElementById('addEmployeeModal');

        // ✅ İNDİ:
        if (closeBtn) closeBtn.addEventListener('click', () => {
            document.getElementById('assignCompaniesModal')?.remove();
        });
        if (cancelBtn) cancelBtn.addEventListener('click', () => {
            document.getElementById('assignCompaniesModal')?.remove();
        });


        // Escape düyməsi ilə bağlama
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                this.closeModals();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

        const form = document.getElementById('addEmployeeForm');
        if (form) {
            // Köhnə event listener-ları təmizlə
            const newForm = form.cloneNode(true);
            form.parentNode.replaceChild(newForm, form);

            newForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                const submitBtn = e.target.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Əlavə edilir...';
                }

                try {
                    // Məlumatları topla
                    const data = {
                        ceo_name: document.getElementById('addFirstName').value,
                        ceo_lastname: document.getElementById('addLastName').value,
                        father_name: document.getElementById('addFatherName').value,
                        birth_date: document.getElementById('addBirthDate').value || null,
                        gender: document.getElementById('addGender').value || null,
                        ceo_email: document.getElementById('addEmail').value,
                        ceo_phone: document.getElementById('addPhone').value || '',
                        ceo_password: document.getElementById('addPassword').value,
                        fin_code: document.getElementById('addFinCode').value || '',
                        position: document.getElementById('addPosition').value || 'İşçi',
                        company_code: this.currentCompanyCode,
                        is_active: document.getElementById('addIsActive').checked,
                        department_id: document.getElementById('addDepartment').value || null,
                        hire_date: document.getElementById('addHireDate').value || null
                    };

                    console.log('📤 Göndərilən data:', data);

                    // Password yoxlanışı
                    if (!data.ceo_password || data.ceo_password.length < 6) {
                        throw new Error('Şifrə ən az 6 simvol olmalıdır');
                    }

                    // API sorğusu
                    const response = await this.api.post('/users/employee', data);
                    console.log('📥 Server cavabı:', response);

                    // ✅ YENİ İŞÇİNİ SİYAHIYA ƏLAVƏ ET
                    if (response) {
                        const newEmployee = {
                            id: response.id,
                            first_name: response.ceo_name || data.ceo_name,
                            last_name: response.ceo_lastname || data.ceo_lastname,
                            father_name: response.father_name || data.father_name,
                            email: response.ceo_email || data.ceo_email,
                            phone: response.ceo_phone || data.ceo_phone,
                            fin_code: response.fin_code || data.fin_code,
                            position: response.position || data.position,
                            department_id: response.department_id || data.department_id,
                            hire_date: response.hire_date || data.hire_date,
                            is_active: response.is_active !== undefined ? response.is_active : data.is_active,
                            created_at: response.created_at || new Date().toISOString(),
                            company_code: response.company_code || data.company_code
                        };

                        // Siyahıya əlavə et
                        this.employees.unshift(newEmployee);

                        // Filterləri yenilə
                        this.filterEmployees();

                        // Statistikaları yenilə
                        this.updateStatistics();

                        // Cədvəli yenidən render et
                        this.renderTable();
                    }

                    // Modalı bağla
                    this.closeModals();

                    // Uğur mesajı
                    this.showSuccess('İşçi uğurla əlavə edildi');

                } catch (error) {
                    console.error('❌ Xəta:', error);
                    this.showError('Xəta: ' + (error.response?.data?.detail || error.message));
                } finally {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = '<i class="fa-solid fa-check"></i> Əlavə et';
                    }
                }
            });
        }

        // Overlay kliklə bağlama
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModals();
                }
            });
        }
    }



    /**
     * İşçi sil
     */
    async deleteEmployee(employeeId) {
        try {
            const employee = await this.getEmployeeById(employeeId);
            const name = `${employee.first_name || employee.ceo_name || ''} ${employee.last_name || employee.ceo_lastname || ''}`.trim();

            if (!confirm(`"${name}" adlı işçini silmək istədiyinizə əminsiniz?`)) return;

            await this.api.delete(`/users/${employeeId}/soft`);
            this.showSuccess('İşçi silindi');
            await this.loadEmployees();
        } catch (error) {
            console.error('❌ Xəta:', error);
            this.showError('İşçi silinmədi: ' + error.message);
        }
    }

    /**
     * İşçi məlumatlarını gətir - MAPPİNG ƏLAVƏ EDİLDİ
     */
    async getEmployeeById(employeeId) {
        try {
            const response = await this.api.get(`/users/${employeeId}`);

            // Backend-dən gələn məlumatları frontend formatına çevir
            if (response) {
                return {
                    id: response.id,
                    first_name: response.ceo_name || response.first_name || '',
                    last_name: response.ceo_lastname || response.last_name || '',
                    father_name: response.father_name || '',
                    birth_date: response.birth_date || '',
                    gender: response.gender || '',
                    email: response.ceo_email || response.email || '',
                    phone: response.ceo_phone || response.phone || '',
                    fin_code: response.fin_code || '',
                    department_id: response.department_id,
                    position: response.position || '',
                    hire_date: response.hire_date || '',
                    is_active: response.is_active !== undefined ? response.is_active : true,
                    created_at: response.created_at,
                    company_code: response.company_code
                };
            }
            return response;
        } catch (error) {
            console.error('❌ Xəta:', error);
            throw error;
        }
    }

    /**
     * Tarixi formatla
     */
    formatDate(date) {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('az-AZ');
    }

    /**
     * Modalları bağla
     */
    closeModals() {
        const addModal = document.getElementById('addEmployeeModal');
        const editModal = document.getElementById('editEmployeeModal');
        const assignModal = document.getElementById('assignCompaniesModal'); // ✅ ƏLAVƏ ET

        if (addModal) addModal.remove();
        if (editModal) editModal.remove();
        if (assignModal) assignModal.remove(); // ✅ ƏLAVƏ ET
    }

    showSuccess(message) {
        alert('✅ ' + message);
    }

    showError(message) {
        alert('❌ ' + message);
    }
}

window.EmployeesService = EmployeesService;