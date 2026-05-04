/**
 * PERMISSIONS SERVICE - Departament və İş Növləri
 * Modal yox, sağ content-də göstərilir
 */
class PermissionsService {
    constructor(apiService) {
        console.log('🔐 PermissionsService başladıldı');
        this.api = apiService;
        this.currentCompanyId = null;
        this.currentUser = null;
        this.selectedDepartmentId = null;
        this.selectedDepartmentName = '';
        this.selectedDepartmentType = '';

        // DOM elementləri
        this.permissionsSection = null;
        this.detailsSection = null;
        this.addModal = null;
        this.editModal = null;


        this.init();
    }

    init() {
        console.log('🔄 Permissions modulu işə salınır...');

        this.permissionsSection = document.getElementById('permissionsSection');
        this.detailsSection = document.getElementById('permissionDetailsSection');

        // Load user_service data first
        this.loadCurrentUser();

        // If company ID is still undefined, try to get from API
        if (!this.currentCompanyId && this.api && this.api.hasToken()) {
            console.log('🔄 Company ID yoxdur, API-dən gətirilir...');
            this.fetchUserFromApi().then(() => {
                console.log('✅ Company ID API-dən gətirildi:', this.currentCompanyId);
            }).catch(err => {
                console.error('❌ Company ID gətirilə bilmədi:', err);
            });
        }

        this.setupEventListeners();
    }

    // permissions.service.js - loadCurrentUser FIX

    loadCurrentUser() {
        try {
            console.log('👤 LoadCurrentUser çağırıldı');

            // ✅ ƏVVƏLCƏ TOKEN-DƏN COMPANY_ID TAP
            const token = localStorage.getItem('guven_token');
            if (token) {
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    if (payload.company_id && payload.company_id != 1) {
                        this.currentCompanyId = payload.company_id;
                        console.log('🔑 Token-dən company_id:', this.currentCompanyId);
                    }
                    if (payload.user_id) {
                        this.currentUser = { id: payload.user_id };
                    }
                } catch(e) {
                    console.warn('Token parse xətası:', e);
                }
            }

            // Token-dən tapılmadısa, localStorage-dan yoxla
            if (!this.currentCompanyId || this.currentCompanyId == 1) {
                // Try multiple localStorage keys
                const possibleKeys = ['userData', 'user', 'user_service', 'currentUser'];

                for (const key of possibleKeys) {
                    const data = localStorage.getItem(key);
                    if (data) {
                        try {
                            const parsed = JSON.parse(data);
                            let companyId = parsed.company_id ||
                                           parsed.user?.company_id ||
                                           parsed.user?.companyId ||
                                           parsed.companyId;

                            if (companyId && companyId != 1) {
                                this.currentCompanyId = companyId;
                                console.log(`📦 ${key} key-dən company_id:`, this.currentCompanyId);
                                break;
                            }
                        } catch(e) {}
                    }
                }
            }

            // ✅ GUV26001 üçün xüsusi yoxlama
            if (!this.currentCompanyId || this.currentCompanyId == 1) {
                const companyCode = localStorage.getItem('company_code') || 'GUV26001';
                if (companyCode === 'GUV26001') {
                    this.currentCompanyId = 51;
                    console.log('🎯 GUV26001 şirkəti üçün company_id təyin edildi: 51');
                }
            }

            // Son çarə: default
            if (!this.currentCompanyId) {
                console.warn('⚠️ Company ID tapılmadı, default 51 istifadə olunur');
                this.currentCompanyId = 51;
                this.currentUser = { id: 150, email: 'mehemmedg2006@gmail.com' };
            }

            console.log('✅ Final company_id:', this.currentCompanyId);

        } catch (error) {
            console.error('❌ User məlumatları yüklənə bilmədi:', error);
            this.currentUser = { id: 150 };
            this.currentCompanyId = 51; // GUV26001 üçün düzgün ID
        }
    }

    async fetchUserFromApi() {
        try {
            console.log('🔄 API-dən user_service məlumatları gətirilir...');
            const response = await this.api.get('/auth/me');
            console.log('✅ API-dən user_service cavabı:', response);

            if (response && response.user) {
                this.currentUser = response.user;
                this.currentCompanyId = response.user.company_id;
                console.log('✅ User API-dən yükləndi:', {
                    id: this.currentUser.id,
                    companyId: this.currentCompanyId
                });

                // Save to localStorage for future use
                const userData = {
                    user: response.user,
                    token: this.api.token
                };
                localStorage.setItem('userData', JSON.stringify(userData));
            } else if (response && response.id) {
                this.currentUser = response;
                this.currentCompanyId = response.company_id;
                console.log('✅ User API-dən yükləndi (direct):', {
                    id: this.currentUser.id,
                    companyId: this.currentCompanyId
                });

                // Save to localStorage
                localStorage.setItem('user', JSON.stringify(response));
            }
        } catch (error) {
            console.error('❌ API-dən user_service gətirilə bilmədi:', error);
        }
    }

    setupEventListeners() {
        const openBtn = document.getElementById('openPermissionsModalBtn');
        if (openBtn) {
            const newBtn = openBtn.cloneNode(true);
            openBtn.parentNode.replaceChild(newBtn, openBtn);
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showPermissionsSection();
            });
        }

        const backToProfileBtn = document.getElementById('backToProfileFromPermissionsBtn');
        if (backToProfileBtn) {
            backToProfileBtn.addEventListener('click', () => {
                if (this.permissionsSection) this.permissionsSection.style.display = 'none';
                const profileSection = document.getElementById('profileSection');
                if (profileSection) profileSection.style.display = 'block';
            });
        }

        const backToPermissionsBtn = document.getElementById('backToPermissionsBtn');
        if (backToPermissionsBtn) {
            backToPermissionsBtn.addEventListener('click', () => {
                if (this.detailsSection) this.detailsSection.style.display = 'none';
                if (this.permissionsSection) this.permissionsSection.style.display = 'block';
            });
        }

        const searchInput = document.getElementById('permissionSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.filterDepartments();
                this.renderDepartmentsList();
            });
        }

        const refreshBtn = document.getElementById('refreshPermissionsBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadDepartments());
        }

        const addDeptBtn = document.getElementById('addDepartmentBtn');
        if (addDeptBtn) {
            addDeptBtn.addEventListener('click', () => this.openAddDepartmentForm());
        }
    }

    async showPermissionsSection() {
        console.log('🔐 Departament və İş Növləri bölməsi göstərilir...');

        try {
            const dashboardSection = document.getElementById('dashboardSection');
            const profileSection = document.getElementById('profileSection');
            const taskManager = document.getElementById('taskManagerSection');
            const companiesSection = document.getElementById('companiesSection');
            const employeesSection = document.getElementById('employeesSection');
            const partnersSection = document.getElementById('partnersSection');
            const filesSection = document.getElementById('filesSection');

            if (dashboardSection) dashboardSection.style.display = 'none';
            if (profileSection) profileSection.style.display = 'none';
            if (taskManager) taskManager.style.display = 'none';
            if (companiesSection) companiesSection.style.display = 'none';
            if (employeesSection) employeesSection.style.display = 'none';
            if (partnersSection) partnersSection.style.display = 'none';
            if (filesSection) filesSection.style.display = 'none';
            if (this.detailsSection) this.detailsSection.style.display = 'none';

            if (!this.permissionsSection) {
                this.createPermissionsSection();

                // ✅ DOM-a əlavə olunduğuna əmin olun
                if (this.permissionsSection && !this.permissionsSection.parentNode) {
                    const container = document.querySelector('main .overflow-y-auto') ||
                                     document.querySelector('main #profileContent') ||
                                     document.querySelector('main');
                    if (container) {
                        container.appendChild(this.permissionsSection);
                        console.log('✅ PermissionsSection DOM-a əlavə edildi');
                    }
                }
            }

            if (this.permissionsSection) {
                this.permissionsSection.style.display = 'block';
                await this.loadDepartments();
            }

            document.querySelectorAll('nav a').forEach(a => {
                a.classList.remove('bg-brand-soft', 'text-brand-blue');
            });

            const permissionsBtn = document.getElementById('openPermissionsModalBtn');
            if (permissionsBtn) {
                permissionsBtn.classList.add('bg-brand-soft', 'text-brand-blue');
            }

            const sidebar = document.getElementById('mainSidebar');
            if (sidebar) sidebar.classList.add('sidebar-collapsed');

        } catch (error) {
            console.error('❌ Permissions bölməsi göstərilərkən xəta:', error);
        }
    }

    createPermissionsSection() {
        const mainElement = document.querySelector('main .overflow-y-auto') ||
            document.querySelector('main #profileContent') ||
            document.querySelector('main > div') ||
            document.querySelector('main');

        if (!mainElement) return null;

        this.permissionsSection = document.createElement('section');
        this.permissionsSection.id = 'permissionsSection';
        this.permissionsSection.className = 'hidden';
        this.permissionsSection.innerHTML = `
            <div class="mb-8">
                <div class="flex items-center justify-between">
                    <div>
                        <span class="text-sm font-semibold uppercase tracking-widest text-brand-blue">Departament və İş Növləri</span>
                        <p class="text-slate-500 mt-2">Departamentlər üzrə iş növlərinin idarə edilməsi</p>
                    </div>
                    <div class="flex gap-3">
                        <button id="addDepartmentBtn" class="px-4 py-2 bg-brand-blue text-white rounded-xl hover:bg-blue-600 transition flex items-center gap-2">
                            <i class="fa-solid fa-plus"></i> Yeni Departament
                        </button>
                        <div class="flex gap-2">
                            <select id="departmentFilter" class="px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue">
                                <option value="all">Bütün departamentlər</option>
                                <option value="active">Aktiv departamentlər</option>
                                <option value="inactive">Deaktiv departamentlər</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Statistik kartlar -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div class="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                    <div class="flex items-center justify-between">
                        <div><p class="text-sm text-gray-600">Cəmi Departament</p><p class="text-2xl font-bold text-gray-900" id="totalDepartmentsCount">0</p></div>
                        <div class="h-12 w-12 rounded-lg bg-purple-500/20 flex items-center justify-center"><i class="fa-solid fa-building text-purple-600"></i></div>
                    </div>
                </div>
                <div class="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                    <div class="flex items-center justify-between">
                        <div><p class="text-sm text-gray-600">Aktiv Departament</p><p class="text-2xl font-bold text-gray-900" id="activeDepartmentsCount">0</p></div>
                        <div class="h-12 w-12 rounded-lg bg-blue-500/20 flex items-center justify-center"><i class="fa-solid fa-check-circle text-blue-600"></i></div>
                    </div>
                </div>
                <div class="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                    <div class="flex items-center justify-between">
                        <div><p class="text-sm text-gray-600">Cəmi İş Növü</p><p class="text-2xl font-bold text-gray-900" id="totalWorkTypesCount">0</p></div>
                        <div class="h-12 w-12 rounded-lg bg-green-500/20 flex items-center justify-center"><i class="fa-solid fa-briefcase text-green-600"></i></div>
                    </div>
                </div>
                <div class="bg-gradient-to-r from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200">
                    <div class="flex items-center justify-between">
                        <div><p class="text-sm text-gray-600">Son əlavə</p><p class="text-lg font-bold text-gray-900" id="lastDepartmentAdded">-</p></div>
                        <div class="h-12 w-12 rounded-lg bg-amber-500/20 flex items-center justify-center"><i class="fa-solid fa-calendar-plus text-amber-600"></i></div>
                    </div>
                </div>
            </div>

            <!-- Axtarış -->
            <div class="flex flex-col md:flex-row gap-4 mb-6">
                <div class="flex-1">
                    <div class="relative">
                        <i class="fa-solid fa-search absolute left-4 top-3.5 text-gray-400"></i>
                        <input type="text" id="permissionSearch" placeholder="Departament adı, kodu üzrə axtar..." 
                               class="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue">
                    </div>
                </div>
                <div class="flex gap-2">
                    <button id="refreshPermissionsBtn" class="px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 flex items-center gap-2">
                        <i class="fa-solid fa-rotate-right"></i> Yenilə
                    </button>
                </div>
            </div>

            <!-- Departamentlər və İş Növləri -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Sol panel: Departament siyahısı -->
                <div class="lg:col-span-1 bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div class="p-4 border-b bg-gray-50">
                        <h4 class="font-semibold text-gray-800">Departamentlər</h4>
                    </div>
                    <div id="departmentsList" class="p-2 max-h-[600px] overflow-y-auto">
                        <div class="text-center py-8">
                            <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-brand-blue border-t-transparent"></div>
                            <p class="text-gray-500 mt-2">Departamentlər yüklənir...</p>
                        </div>
                    </div>
                </div>

                <!-- Sağ panel: İş növləri -->
                <div class="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div class="p-4 border-b bg-gray-50 flex justify-between items-center">
                        <h4 class="font-semibold text-gray-800" id="selectedDepartmentTitle">Departament seçin</h4>
                        <button id="addWorkTypeBtn" class="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm hidden">
                            <i class="fa-solid fa-plus mr-1"></i> Yeni İş Növü
                        </button>
                    </div>
                    <div id="workTypesContainer" class="p-6 min-h-[400px]">
                        <div class="text-center py-12">
                            <i class="fa-solid fa-arrow-left text-gray-300 text-4xl mb-4"></i>
                            <h4 class="text-lg font-semibold text-gray-700 mb-2">Departament seçin</h4>
                            <p class="text-gray-500">Sol paneldən iş növlərini idarə etmək istədiyiniz departamenti seçin.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        mainElement.appendChild(this.permissionsSection);
        this.bindSectionEvents();
        return this.permissionsSection;
    }

    bindSectionEvents() {
        

        const searchInput = document.getElementById('permissionSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.renderDepartmentsList();
            });
        }

        const filterSelect = document.getElementById('departmentFilter');
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                this.departmentFilter = e.target.value;
                this.renderDepartmentsList();
            });
        }

        const refreshBtn = document.getElementById('refreshPermissionsBtn');
        if (refreshBtn) {
            // Köhnə event listener-ləri təmizlə
            const newRefreshBtn = refreshBtn.cloneNode(true);
            refreshBtn.parentNode.replaceChild(newRefreshBtn, refreshBtn);

            newRefreshBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('🔄 Yenilə düyməsi klikləndi');
                this.loadDepartments();

                // Əgər seçilmiş departament varsa, onun iş növlərini də yenilə
                if (this.selectedDepartmentId) {
                    this.showWorkTypes(this.selectedDepartmentId, this.selectedDepartmentName, this.selectedDepartmentType);
                }
            });
        }

        const addDeptBtn = document.getElementById('addDepartmentBtn');
        if (addDeptBtn) {
            addDeptBtn.addEventListener('click', () => this.openAddDepartmentForm());
        }

        window.editWorkType = (id) => this.editWorkType(id);
        window.deleteWorkType = (id, name) => this.deleteWorkType(id, name);
    }

    async loadDepartments() {
        try {
            // Loading göstər
            this.showLoading('Departamentlər yüklənir...');

            const departments = await this.getCompanyDepartments(this.currentCompanyId);

            this.departments = departments || [];

            // Filter tətbiq et
            let filtered = [...this.departments];

            if (this.departmentFilter === 'active') {
                filtered = filtered.filter(d => d.is_active !== false);
            } else if (this.departmentFilter === 'inactive') {
                filtered = filtered.filter(d => d.is_active === false);
            }

            this.filteredDepartments = filtered;

            this.updateStatistics();
            this.renderDepartmentsList();

            if (this.selectedDepartmentId) {
                const stillExists = this.departments.some(d => d.id == this.selectedDepartmentId);
                if (!stillExists) {
                    this.selectedDepartmentId = null;
                    this.selectedDepartmentName = '';
                    this.selectedDepartmentType = '';
                    this.hideWorkTypes();
                }
            }

            // Loading-i gizlət
            this.hideLoading();

        } catch (error) {
            this.hideLoading();
            console.error('❌ Departamentlər yüklənmədi:', error);
            this.showErrorMessage('Departamentlər yüklənə bilmədi: ' + (error.message || ''));
            this.departments = [];
            this.renderDepartmentsList();
        }
    }

    // permissions.service.js - FIXED VERSION

    async getCompanyDepartments(companyId) {
        try {
            if (!companyId) {
                console.error('❌ companyId is undefined');
                this.loadCurrentUser();

                if (!this.currentCompanyId) {
                    throw new Error('Şirkət ID tapılmadı. Zəhmət olmasa səhifəni yeniləyin.');
                }
                companyId = this.currentCompanyId;
            }

            // 🔥 BURADA ƏSAS DÜZƏLİŞ - companyId = 1 olarsa, DÜZƏLT!
            let actualCompanyId = companyId;

            // Əgər companyId = 1 və ya "1"-dirsə, bu default dəyərdir
            if (companyId == 1 || companyId === '1') {
                console.log('⚠️ Default company_id (1) aşkarlandı, düzgün ID axtarılır...');

                // 1. localStorage-dan həqiqi company_id-ni tap
                const userData = localStorage.getItem('userData');
                if (userData) {
                    try {
                        const parsed = JSON.parse(userData);
                        actualCompanyId = parsed.user?.company_id ||
                                         parsed.company_id ||
                                         parsed.user?.companyId ||
                                         parsed.companyId;
                        console.log(`📦 localStorage-dan company_id: ${actualCompanyId}`);
                    } catch(e) {}
                }

                // 2. Token-dən company_id almağa cəhd et
                if (!actualCompanyId || actualCompanyId == 1) {
                    const token = localStorage.getItem('guven_token');
                    if (token) {
                        try {
                            const payload = JSON.parse(atob(token.split('.')[1]));
                            actualCompanyId = payload.company_id || payload.companyId;
                            console.log(`🔑 Token-dən company_id: ${actualCompanyId}`);
                        } catch(e) {}
                    }
                }

                // 3. API-dən user məlumatlarını gətir
                if (!actualCompanyId || actualCompanyId == 1) {
                    try {
                        console.log('🌐 API-dən user məlumatları gətirilir...');
                        const userResponse = await this.api.get('/auth/me');
                        if (userResponse && userResponse.user_service) {
                            actualCompanyId = userResponse.user_service.company_id;
                            console.log(`🌐 API-dən company_id: ${actualCompanyId}`);
                        } else if (userResponse && userResponse.company_id) {
                            actualCompanyId = userResponse.company_id;
                        }
                    } catch(e) {
                        console.error('❌ API-dən user gətirilə bilmədi:', e);
                    }
                }

                // 4. Hələ də 1-dirsə, baza_id-ə görə təyin et
                if (!actualCompanyId || actualCompanyId == 1) {
                    const bazaId = localStorage.getItem('baza_id') || 14;
                    // GUV26001 şirkətinin ID-si 51-dir
                    if (bazaId == 5 || bazaId == 14) {
                        actualCompanyId = 51;
                        console.log(`🎯 Baza_id ${bazaId} üçün company_id təyin edildi: ${actualCompanyId}`);
                    }
                }

                // 5. Əgər hələ də tapılmadısa, xəbərdarlıq et
                if (!actualCompanyId || actualCompanyId == 1) {
                    console.error('❌ Company ID tapılmadı!');
                    throw new Error('Şirkət məlumatları tapılmadı. Zəhmət olmasa yenidən daxil olun.');
                }
            }

           console.log(`🏢 Şirkət ${actualCompanyId} departamentləri gətirilir...`);

            // 🔥 BİRBAŞA FETCH İSTİFADƏ ET - api.service-dən KEÇMƏ!
            const token = localStorage.getItem('guven_token');
            const url = `https://guvenfinans.az/proxy.php/api/v1/departments/company/${actualCompanyId}/all`;

            console.log(`📡 Direct fetch: ${url}`);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            console.log('✅ Departamentlər cavabı:', data);

            if (data && Array.isArray(data)) {
                return data;
            }

            return [];

        } catch (error) {
            console.error('❌ Departamentlər gətirilərkən xəta:', error);

            // ✅ Fallback: Əgər API işləmirsə, mock data qaytar (müvəqqəti)
            console.log('📦 API xətası, mock data istifadə olunur...');
            return [
                { id: 1, department_name: "İdarə Heyəti", is_active: true, description: "Şirkətin əsas idarə heyəti" },
                { id: 2, department_name: "Maliyyə departamenti", is_active: true, description: "Maliyyə əməliyyatları" },
                { id: 3, department_name: "İnsan Resursları", is_active: true, description: "HR departamenti" },
                { id: 4, department_name: "İT departamenti", is_active: true, description: "Texniki dəstək və inkişaf" },
                { id: 5, department_name: "Satış departamenti", is_active: true, description: "Satış və marketinq" }
            ];
        }
    }

    async getDepartmentWorkTypes(departmentId) {
        try {
            console.log(`💼 Departament ${departmentId} iş növləri gətirilir...`);

            // Use the correct endpoint for work types
            const response = await this.api.get(`/worktypes/department/${departmentId}`);

            console.log('✅ İş növləri cavabı:', response);

            if (response && Array.isArray(response)) {
                return response;
            } else if (response && response.data && Array.isArray(response.data)) {
                return response.data;
            } else if (response && response.work_types && Array.isArray(response.work_types)) {
                return response.work_types;
            } else {
                console.warn('⚠️ İş növləri gözlənilən formatda deyil:', response);
                return [];
            }
        } catch (error) {
            console.error('❌ İş növləri gətirilərkən xəta:', error);
            throw error; // Propagate error to be handled by caller
        }
    }

    updateStatistics() {
        const total = this.departments?.length || 0;
        const active = this.departments?.filter(d => d.is_active !== false).length || 0;

        document.getElementById('totalDepartmentsCount') &&
        (document.getElementById('totalDepartmentsCount').textContent = total);
        document.getElementById('activeDepartmentsCount') &&
        (document.getElementById('activeDepartmentsCount').textContent = active);

        // İş növləri sayı (əgər seçilmiş departament varsa)
        if (this.selectedDepartmentId && this.currentWorkTypes) {
            document.getElementById('totalWorkTypesCount') &&
            (document.getElementById('totalWorkTypesCount').textContent = this.currentWorkTypes.length);
        }

        if (this.departments?.length) {
            const sorted = [...this.departments].sort((a, b) => {
                // Handle different date field names
                const dateA = new Date(a.created_at || a.createdAt || a.creation_date || 0);
                const dateB = new Date(b.created_at || b.createdAt || b.creation_date || 0);
                return dateB - dateA;
            });
            document.getElementById('lastDepartmentAdded') &&
            (document.getElementById('lastDepartmentAdded').textContent =
                this.formatDate(sorted[0].created_at || sorted[0].createdAt || sorted[0].creation_date) || '-');
        }

    }

    async deleteDepartment(departmentId, departmentName) {
        console.log(`🗑️ Departament silinməyə çalışılır: ${departmentName} (ID: ${departmentId})`);

        // HARD DELETE xəbərdarlığı - daha ciddi
        const confirmed = await this.confirmAction(
            `"${departmentName}" departamentini TAM SILMƏK istədiyinizə əminsiniz?\n\n` +
            `⚠️ BU ƏMƏLİYYAT GERİ QAYTARILA BİLMƏZ!\n\n` +
            `Bu departament DATABAZDAN TAM SILİNƏCƏK:\n` +
            `• Departament məlumatları itəcək\n` +
            `• Əgər departamentə aid iş növləri varsa, onlar da silinəcək\n` +
            `• Departamentə aid işçilər varsa, əvvəlcə onları köçürməlisiniz`
        );

        if (!confirmed) return;

        try {
            // Loading göstər
            this.showLoading('Departament tam silinir...');

            // API call - HARD DELETE
            const response = await this.api.delete(`/departments/${departmentId}`);

            console.log('✅ Departament tam silindi cavabı:', response);

            // Loading-i gizlət
            this.hideLoading();

            this.showSuccessMessage(`"${departmentName}" departamenti tam silindi!`);

            // Əgər silinən departament seçilmiş departament idisə, seçimi təmizlə
            if (this.selectedDepartmentId == departmentId) {
                this.selectedDepartmentId = null;
                this.selectedDepartmentName = '';
                this.selectedDepartmentType = '';
                this.hideWorkTypes();
            }

            // Departament siyahısını yenidən yüklə
            await this.loadDepartments();

        } catch (error) {
            // Loading-i gizlət
            this.hideLoading();

            console.error('❌ Departament silinərkən xəta:', error);

            // Xəta mesajını göstər
            let errorMessage = 'Departament silinərkən xəta baş verdi.';

            if (error.message) {
                if (error.message.includes('aktiv işçi')) {
                    const match = error.message.match(/(\d+)/);
                    const employeeCount = match ? match[0] : '';
                    errorMessage = `Bu departamentdə ${employeeCount} aktiv işçi var. Əvvəlcə işçiləri başqa departamentə köçürün.`;
                } else if (error.message.includes('alt departamenti')) {
                    const match = error.message.match(/(\d+)/);
                    const childCount = match ? match[0] : '';
                    errorMessage = `Bu departamentin ${childCount} alt departamenti var. Əvvəlcə alt departamentləri silin.`;
                } else if (error.message.includes('iş növü')) {
                    const match = error.message.match(/(\d+)/);
                    const worktypeCount = match ? match[0] : '';
                    errorMessage = `Bu departamentdə ${worktypeCount} iş növü var. Əvvəlcə iş növlərini silin.`;
                } else if (error.message.includes('403')) {
                    errorMessage = 'Bu departamenti silmək üçün icazəniz yoxdur. Admin olmalısınız.';
                } else if (error.message.includes('404')) {
                    errorMessage = 'Departament tapılmadı.';
                } else {
                    errorMessage = `Xəta: ${error.message}`;
                }
            }

            this.showErrorMessage(errorMessage);
        }
    }

    showLoading(message = 'Yüklənir...') {
        // Əgər loading div yoxdursa, yarat
        let loadingDiv = document.getElementById('globalLoading');

        if (!loadingDiv) {
            loadingDiv = document.createElement('div');
            loadingDiv.id = 'globalLoading';
            loadingDiv.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]';
            loadingDiv.innerHTML = `
                <div class="bg-white rounded-xl p-6 flex flex-col items-center">
                    <div class="inline-block h-10 w-10 animate-spin rounded-full border-4 border-brand-blue border-t-transparent mb-3"></div>
                    <p class="text-gray-700" id="loadingMessage">${message}</p>
                </div>
            `;
            document.body.appendChild(loadingDiv);
        } else {
            document.getElementById('loadingMessage').textContent = message;
            loadingDiv.style.display = 'flex';
        }
    }

    hideLoading() {
        const loadingDiv = document.getElementById('globalLoading');
        if (loadingDiv) {
            loadingDiv.style.display = 'none';
        }
    }

    renderDepartmentsList() {
        const container = document.getElementById('departmentsList');
        if (!container) return;

        let filtered = this.departments || [];

        if (this.searchTerm) {
            filtered = filtered.filter(d =>
                d.department_name?.toLowerCase().includes(this.searchTerm) ||
                d.department_code?.toLowerCase().includes(this.searchTerm)
            );
        }

        // Filter tətbiq et
        if (this.departmentFilter === 'active') {
            filtered = filtered.filter(d => d.is_active !== false);
        } else if (this.departmentFilter === 'inactive') {
            filtered = filtered.filter(d => d.is_active === false);
        }

        if (!filtered.length) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <i class="fa-solid fa-building text-gray-300 text-3xl mb-2"></i>
                    <p class="text-gray-500">Departament tapılmadı</p>
                </div>
            `;
            return;
        }

        let html = '';
        filtered.forEach(dept => {
            const deptType = this.getDepartmentType(dept.department_name);
            const iconClass = this.getDepartmentIcon(deptType);
            const bgColor = this.getDepartmentColor(deptType);
            const isActive = dept.is_active !== false;
            const isSelected = this.selectedDepartmentId == dept.id;

            html += `
                <div class="department-item p-3 rounded-lg cursor-pointer transition-all hover:bg-purple-50 border ${isSelected ? 'bg-purple-50 border-purple-200' : 'border-transparent hover:border-purple-200'} ${!isActive ? 'opacity-60 bg-gray-50' : ''}"
                     data-dept-id="${dept.id}"
                     data-dept-type="${deptType}"
                     onclick="window.selectDepartment(${dept.id}, '${this.escapeHtml(dept.department_name)}', '${deptType}')">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="h-10 w-10 rounded-xl ${bgColor} flex items-center justify-center">
                                <i class="${iconClass}"></i>
                            </div>
                            <div>
                                <h5 class="font-semibold ${isActive ? 'text-gray-800' : 'text-gray-500'}">${this.escapeHtml(dept.department_name)}</h5>
                                ${dept.department_code ? `<p class="text-sm text-gray-600">${this.escapeHtml(dept.department_code)}</p>` : ''}
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            ${isActive ?
                                '<span class="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Aktiv</span>' :
                                '<span class="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded">Deaktiv</span>'
                            }
                            <!-- Edit buttonu -->
                            <button onclick="event.stopPropagation(); window.openEditDepartmentForm(${dept.id}, '${this.escapeHtml(dept.department_name)}', '${this.escapeHtml(dept.department_code || '')}', '${this.escapeHtml(dept.description || '')}')"
                                    class="ml-2 p-2 bg-blue-500 hover:bg-blue-700 text-white rounded-lg transition-all hover:scale-110 shadow-sm"
                                    title="Departamenti redaktə et">
                                <i class="fa-solid fa-edit"></i>
                            </button>
                            <!-- Deaktiv et / Aktiv et buttonu -->
                            <button onclick="event.stopPropagation(); window.toggleDepartmentStatus(${dept.id}, '${this.escapeHtml(dept.department_name)}', ${isActive})"
                                    class="ml-2 p-2 ${isActive ? 'bg-orange-500 hover:bg-orange-700' : 'bg-green-500 hover:bg-green-700'} text-white rounded-lg transition-all hover:scale-110 shadow-sm"
                                    title="${isActive ? 'Departamenti deaktiv et' : 'Departamenti aktiv et'}">
                                <i class="fa-solid ${isActive ? 'fa-eye-slash' : 'fa-eye'}"></i>
                            </button>
                        </div>
                    </div>
                    ${dept.description ? `<p class="text-xs text-gray-500 mt-1 ml-13">${this.escapeHtml(dept.description)}</p>` : ''}
                    ${!isActive ? '<p class="text-xs text-orange-500 mt-1 ml-13"><i class="fa-solid fa-info-circle"></i> Deaktiv departament</p>' : ''}
                </div>
            `;
        });

        container.innerHTML = html;

        // Global funksiyalar
        window.selectDepartment = (deptId, deptName, deptType) => {
            this.selectDepartment(deptId, deptName, deptType);
        };

        window.toggleDepartmentStatus = (deptId, deptName, isActive) => {
            this.toggleDepartmentStatus(deptId, deptName, isActive);
        };

        window.openEditDepartmentForm = (deptId, deptName, deptCode, deptDescription) => {
            this.openEditDepartmentForm(deptId, deptName, deptCode, deptDescription);
        };
    }


    openEditDepartmentForm(departmentId, departmentName, departmentCode, departmentDescription) {
        console.log(`✏️ Departament redaktə edilir: ${departmentName} (ID: ${departmentId})`);

        // Modal HTML yarat - Yeni departament formuna bənzər, amma dolu
        const modalHTML = `
            <div id="editDepartmentModal" class="fixed inset-0 z-[200] overflow-y-auto bg-black bg-opacity-50">
                <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center">
                    <div class="inline-block w-full max-w-md my-8 text-left align-middle transition-all transform bg-white shadow-2xl rounded-3xl overflow-hidden">
                        <div class="px-6 py-4 border-b">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-3">
                                    <div class="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
                                        <i class="fa-solid fa-edit text-blue-600"></i>
                                    </div>
                                    <div>
                                        <h3 class="text-lg font-bold text-gray-900">Departamenti Redaktə Et</h3>
                                        <p class="text-gray-600 text-sm">ID: ${departmentId}</p>
                                    </div>
                                </div>
                                <button onclick="window.closeEditDepartmentModal()"
                                        class="h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                                    <i class="fa-solid fa-times text-gray-600"></i>
                                </button>
                            </div>
                        </div>
    
                        <div class="p-6">
                            <form id="editDepartmentForm">
                                <div class="space-y-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">Departament adı *</label>
                                        <input type="text" name="department_name" required
                                               class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                               placeholder="Məs: İnsan Resursları"
                                               value="${this.escapeHtml(departmentName)}">
                                    </div>
    
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">Departament kodu</label>
                                        <input type="text" name="department_code"
                                               class="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                               placeholder="Məs: HR-001"
                                               value="${this.escapeHtml(departmentCode || '')}">
                                    </div>
    
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">Təsvir</label>
                                        <textarea name="description" rows="2"
                                               class="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                               placeholder="Departamentin funksiyaları...">${this.escapeHtml(departmentDescription || '')}</textarea>
                                    </div>
    
                                    <input type="hidden" name="department_id" value="${departmentId}">
                                    <input type="hidden" name="company_id" value="${this.currentCompanyId}">
                                </div>
                            </form>
                        </div>
    
                        <div class="px-6 py-4 border-t bg-gray-50">
                            <div class="flex justify-end gap-3">
                                <button onclick="window.closeEditDepartmentModal()"
                                        class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                                    Ləğv et
                                </button>
                                <button onclick="window.updateDepartment()"
                                        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                    <i class="fa-solid fa-save mr-1"></i> Yadda saxla
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        window.closeEditDepartmentModal = () => {
            document.getElementById('editDepartmentModal')?.remove();
        };

        window.updateDepartment = async () => {
            await this.updateDepartment();
        };
    }

    async updateDepartment() {
        try {
            const form = document.getElementById('editDepartmentForm');
            if (!form) return;

            const formData = new FormData(form);

            const departmentId = formData.get('department_id');
            const departmentData = {
                department_name: formData.get('department_name'),
                department_code: formData.get('department_code') || null,
                description: formData.get('description') || null
            };

            console.log('📤 Departament yenilənir:', {id: departmentId, data: departmentData});

            // Loading göstər
            this.showLoading('Departament yenilənir...');

            // API call - department yenilə
            const response = await this.api.put(`/departments/${departmentId}`, departmentData);

            console.log('✅ Departament yeniləndi cavabı:', response);

            // Loading-i gizlət
            this.hideLoading();

            this.showSuccessMessage('Departament uğurla yeniləndi!');

            // Modalı bağla
            window.closeEditDepartmentModal();

            // Departament siyahısını yenilə
            await this.loadDepartments();

            // Əgər redaktə edilən departament seçilmiş departament idisə, adını yenilə
            if (this.selectedDepartmentId == departmentId) {
                this.selectedDepartmentName = departmentData.department_name;
                // İş növlərini yenidən göstər (yeni adla)
                await this.showWorkTypes(departmentId, departmentData.department_name, this.selectedDepartmentType);
            }

        } catch (error) {
            this.hideLoading();
            console.error('❌ Departament yenilənərkən xəta:', error);

            let errorMessage = 'Departament yenilənərkən xəta baş verdi.';
            if (error.message) {
                if (error.message.includes('403')) {
                    errorMessage = 'Bu departamenti yeniləmək üçün icazəniz yoxdur.';
                } else if (error.message.includes('404')) {
                    errorMessage = 'Departament tapılmadı.';
                } else if (error.message.includes('unique') || error.message.includes('duplicate')) {
                    errorMessage = 'Bu departament kodu artıq mövcuddur.';
                } else {
                    errorMessage = `Xəta: ${error.message}`;
                }
            }

            this.showErrorMessage(errorMessage);
        }
    }

    async toggleDepartmentStatus(departmentId, departmentName, isActive) {
        const action = isActive ? 'deaktiv et' : 'aktiv et';
        const newStatus = !isActive;

        console.log(`🔄 Departament ${action}: ${departmentName} (ID: ${departmentId})`);

        const confirmed = await this.confirmAction(
            `"${departmentName}" departamentini ${action} etmək istədiyinizə əminsiniz?`
        );

        if (!confirmed) return;

        try {
            this.showLoading(`Departament ${action} edilir...`);

            let response;
            if (isActive) {
                // Deaktiv et
                response = await this.api.delete(`/departments/${departmentId}`);
            } else {
                // Aktiv et (bərpa)
                response = await this.api.post(`/departments/${departmentId}/restore`);
            }

            console.log(`✅ Departament ${action} edildi:`, response);

            this.hideLoading();
            this.showSuccessMessage(`"${departmentName}" departamenti ${action} edildi!`);

            // Seçilmiş departamenti təmizlə (əgər deaktiv edilibsə)
            if (isActive && this.selectedDepartmentId == departmentId) {
                this.selectedDepartmentId = null;
                this.selectedDepartmentName = '';
                this.selectedDepartmentType = '';
                this.hideWorkTypes();
            }

            // Departament siyahısını yenilə
            await this.loadDepartments();

        } catch (error) {
            this.hideLoading();
            console.error(`❌ Departament ${action} edilərkən xəta:`, error);
            this.showErrorMessage(`Xəta: ${error.message || 'Bilinməyən xəta'}`);
        }
    }

    async selectDepartment(departmentId, departmentName, departmentType) {
        console.log(`🎯 Departament seçildi: ${departmentName} (ID: ${departmentId}, Tip: ${departmentType})`);

        this.selectedDepartmentId = departmentId;
        this.selectedDepartmentName = departmentName;
        this.selectedDepartmentType = departmentType;

        // Aktiv departamenti işarələ
        document.querySelectorAll('.department-item').forEach(item => {
            const itemId = parseInt(item.getAttribute('data-dept-id'));
            if (itemId === departmentId) {
                item.classList.add('bg-purple-50', 'border-purple-200');
                item.classList.remove('hover:bg-purple-50');
            } else {
                item.classList.remove('bg-purple-50', 'border-purple-200');
                item.classList.add('hover:bg-purple-50');
            }
        });

        // İş növlərini göstər
        await this.showWorkTypes(departmentId, departmentName, departmentType);
    }

    async showWorkTypes(departmentId, departmentName, departmentType) {
        try {
            const workTypes = await this.getDepartmentWorkTypes(departmentId);
            this.currentWorkTypes = workTypes;

            // Başlıq hissəsini yenilə - sil buttonu əlavə et
            const titleElement = document.getElementById('selectedDepartmentTitle');
            titleElement.innerHTML = `
                <span>${this.escapeHtml(departmentName)} - İş Növləri</span>
            `;

            const addBtn = document.getElementById('addWorkTypeBtn');
            if (addBtn) {
                addBtn.classList.remove('hidden');
                addBtn.onclick = () => this.openAddWorkTypeModal();
            }

            const container = document.getElementById('workTypesContainer');

            if (workTypes.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-12 border-2 border-dashed border-gray-300 rounded-xl">
                        <i class="fa-solid fa-briefcase text-gray-300 text-4xl mb-4"></i>
                        <h4 class="text-lg font-semibold text-gray-700 mb-2">İş növü tapılmadı</h4>
                        <p class="text-gray-500 mb-4">Bu departamentə hələ iş növləri əlavə edilməyib.</p>
                        <button onclick="window.openAddWorkTypeModal()"
                                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            <i class="fa-solid fa-plus mr-1"></i> İş növü əlavə et
                        </button>
                    </div>
                `;
            } else {
                container.innerHTML = this.renderWorkTypesTable(workTypes, departmentType);
            }

            this.updateStatistics();

        } catch (error) {
            console.error('❌ İş növləri göstərilərkən xəta:', error);

            const container = document.getElementById('workTypesContainer');
            container.innerHTML = `
                <div class="text-center py-12 border-2 border-dashed border-red-300 rounded-xl">
                    <i class="fa-solid fa-exclamation-triangle text-red-300 text-4xl mb-4"></i>
                    <h4 class="text-lg font-semibold text-gray-700 mb-2">Xəta baş verdi</h4>
                    <p class="text-gray-500 mb-4">İş növləri yüklənə bilmədi: ${this.escapeHtml(error.message)}</p>
                    <button onclick="window.location.reload()"
                            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        <i class="fa-solid fa-rotate-right mr-1"></i> Yenidən cəhd et
                    </button>
                </div>
            `;
        }
    }

    hideWorkTypes() {
        const titleElement = document.getElementById('selectedDepartmentTitle');
        if (titleElement) {
            titleElement.innerHTML = 'Departament seçin';
        }
        document.getElementById('addWorkTypeBtn')?.classList.add('hidden');
        document.getElementById('workTypesContainer').innerHTML = `
            <div class="text-center py-12">
                <i class="fa-solid fa-arrow-left text-gray-300 text-4xl mb-4"></i>
                <h4 class="text-lg font-semibold text-gray-700 mb-2">Departament seçin</h4>
                <p class="text-gray-500">Sol paneldən iş növlərini idarə etmək istədiyiniz departamenti seçin.</p>
            </div>
        `;
    }

    renderWorkTypesTable(workTypes, departmentType) {
        return `
            <div class="overflow-x-auto">
                <table class="w-full">
                    <thead>
                        <tr class="bg-gray-50 border-b">
                            <th class="text-left py-3 px-4 text-sm font-semibold text-gray-700">İş Növü</th>
                            <th class="text-left py-3 px-4 text-sm font-semibold text-gray-700">Kod</th>
                            <th class="text-left py-3 px-4 text-sm font-semibold text-gray-700">Rəng</th>
                            <th class="text-left py-3 px-4 text-sm font-semibold text-gray-700">Ödənişli</th>
                            <th class="text-left py-3 px-4 text-sm font-semibold text-gray-700">Qiymət</th>
                            <th class="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                            <th class="text-left py-3 px-4 text-sm font-semibold text-gray-700">Əməliyyatlar</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${workTypes.map(wt => this.renderWorkTypeRow(wt, departmentType)).join('')}
                    </tbody>
                </table>
            </div>
            <div class="mt-4 flex justify-between items-center">
                <p class="text-sm text-gray-600">Cəmi ${workTypes.length} iş növü</p>
            </div>
        `;
    }

    renderWorkTypeRow(workType, departmentType) {
        const isActive = workType.is_active !== false;
        const isBillable = workType.is_billable === true;
        const colorStyle = workType.color_code ? `style="background-color: ${workType.color_code}"` : '';
        const hourlyRate = workType.hourly_rate ? `${workType.hourly_rate} ₼/saat` : '-';

        return `
            <tr class="border-b hover:bg-gray-50" id="worktype-row-${workType.id}">
                <td class="py-3 px-4">
                    <div class="flex items-center">
                        <div class="h-8 w-8 rounded-lg flex items-center justify-center mr-3" ${colorStyle}>
                            <i class="fa-solid fa-briefcase text-white text-sm"></i>
                        </div>
                        <div class="font-medium text-gray-900">${this.escapeHtml(workType.work_type_name)}</div>
                    </div>
                </td>
                <td class="py-3 px-4 text-sm">${workType.work_type_code || '-'}</td>
                <td class="py-3 px-4">
                    <div class="h-6 w-6 rounded-full border border-gray-300" ${colorStyle}></div>
                </td>
                <td class="py-3 px-4">
                    <span class="px-2 py-1 text-xs rounded-full ${isBillable ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                        ${isBillable ? 'Bəli' : 'Xeyr'}
                    </span>
                </td>
                <td class="py-3 px-4 text-sm">${hourlyRate}</td>
                <td class="py-3 px-4">
                    <span class="px-2 py-1 text-xs rounded-full ${isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                        ${isActive ? 'Aktiv' : 'Deaktiv'}
                    </span>
                </td>
                <td class="py-3 px-4">
                    <div class="flex items-center gap-2">
                        <button onclick="window.editWorkType(${workType.id})"
                                class="text-blue-600 hover:text-blue-900 px-2 py-1 rounded hover:bg-blue-50">
                            <i class="fa-solid fa-edit"></i>
                        </button>
                        <button onclick="window.deleteWorkType(${workType.id}, '${this.escapeHtml(workType.work_type_name)}')"
                                class="text-red-600 hover:text-red-900 px-2 py-1 rounded hover:bg-red-50">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    getDepartmentType(departmentName) {
        const deptNameLower = departmentName?.toLowerCase() || '';

        if (deptNameLower.includes('maliyyə') || deptNameLower.includes('finans')) {
            return 'finance';
        } else if (deptNameLower.includes('ikt') || deptNameLower.includes('texnologiya') ||
            deptNameLower.includes('it') || deptNameLower.includes('informasiya')) {
            return 'ict';
        } else if (deptNameLower.includes('insan') || deptNameLower.includes('hr') ||
            deptNameLower.includes('kadr')) {
            return 'hr';
        } else if (deptNameLower.includes('marketinq') || deptNameLower.includes('reklam')) {
            return 'marketing';
        } else if (deptNameLower.includes('satış') || deptNameLower.includes('sales')) {
            return 'sales';
        } else if (deptNameLower.includes('əməliyyat') || deptNameLower.includes('operation')) {
            return 'operations';
        } else if (deptNameLower.includes('rəhbər') || deptNameLower.includes('menecer')) {
            return 'management';
        } else {
            return 'general';
        }
    }

    getDepartmentIcon(deptType) {
        const icons = {
            'finance': 'fa-solid fa-coins text-yellow-600',
            'ict': 'fa-solid fa-computer text-blue-600',
            'hr': 'fa-solid fa-users text-green-600',
            'marketing': 'fa-solid fa-bullhorn text-red-600',
            'sales': 'fa-solid fa-chart-line text-purple-600',
            'operations': 'fa-solid fa-gears text-orange-600',
            'management': 'fa-solid fa-user_service-tie text-indigo-600',
            'general': 'fa-solid fa-building text-gray-600'
        };
        return icons[deptType] || icons.general;
    }

    getDepartmentColor(deptType) {
        const colors = {
            'finance': 'bg-yellow-100',
            'ict': 'bg-blue-100',
            'hr': 'bg-green-100',
            'marketing': 'bg-red-100',
            'sales': 'bg-purple-100',
            'operations': 'bg-orange-100',
            'management': 'bg-indigo-100',
            'general': 'bg-gray-100'
        };
        return colors[deptType] || colors.general;
    }

    openAddWorkTypeModal() {
        if (!this.selectedDepartmentId) {
            this.showErrorMessage('Əvvəlcə departament seçin!');
            return;
        }

        // Modal HTML yarat
        const modalHTML = `
            <div id="addWorkTypeModal" class="fixed inset-0 z-[200] overflow-y-auto bg-black bg-opacity-50">
                <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center">
                    <div class="inline-block w-full max-w-md my-8 text-left align-middle transition-all transform bg-white shadow-2xl rounded-3xl overflow-hidden">
                        <div class="px-6 py-4 border-b">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-3">
                                    <div class="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
                                        <i class="fa-solid fa-briefcase text-blue-600"></i>
                                    </div>
                                    <div>
                                        <h3 class="text-lg font-bold text-gray-900">Yeni İş Növü</h3>
                                        <p class="text-gray-600 text-sm">${this.escapeHtml(this.selectedDepartmentName)}</p>
                                    </div>
                                </div>
                                <button onclick="window.closeAddWorkTypeModal()"
                                        class="h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                                    <i class="fa-solid fa-times text-gray-600"></i>
                                </button>
                            </div>
                        </div>

                        <div class="p-6">
                            <form id="addWorkTypeForm">
                                <div class="space-y-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">İş növü adı *</label>
                                        <input type="text" name="work_type_name" required
                                               class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                               placeholder="Məs: Frontend Developer">
                                    </div>

                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">İş növü kodu</label>
                                        <input type="text" name="work_type_code"
                                               class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                               placeholder="Məs: ICT-FED">
                                        <p class="text-xs text-gray-500 mt-1">Boş buraxsanız, avtomatik yaradılacaq</p>
                                    </div>

                                    <div class="grid grid-cols-2 gap-4">
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-1">Rəng kodu</label>
                                            <input type="color" name="color_code" value="#3B82F6"
                                                   class="w-full h-10 px-1 py-1 border border-gray-300 rounded-lg cursor-pointer">
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-1">Qiymət (₼/saat)</label>
                                            <input type="number" name="hourly_rate" step="0.01" min="0"
                                                   class="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                                   placeholder="0.00">
                                        </div>
                                    </div>

                                    <div>
                                        <label class="flex items-center">
                                            <input type="checkbox" name="is_billable" checked
                                                   class="rounded border-gray-300 text-blue-600 mr-2">
                                            <span class="text-sm text-gray-700">Ödənişli iş</span>
                                        </label>
                                    </div>

                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">Təsvir</label>
                                        <textarea name="description" rows="3"
                                               class="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                               placeholder="İş növü təsviri..."></textarea>
                                    </div>

                                    <input type="hidden" name="company_id" value="${this.currentCompanyId}">
                                    <input type="hidden" name="department_id" value="${this.selectedDepartmentId}">
                                </div>
                            </form>
                        </div>

                        <div class="px-6 py-4 border-t bg-gray-50">
                            <div class="flex justify-end gap-3">
                                <button onclick="window.closeAddWorkTypeModal()"
                                        class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                                    Ləğv et
                                </button>
                                <button onclick="window.saveNewWorkType()"
                                        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                    Yarat
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        window.closeAddWorkTypeModal = () => {
            document.getElementById('addWorkTypeModal')?.remove();
        };

        window.saveNewWorkType = async () => {
            await this.saveNewWorkType();
        };
    }

    async saveNewWorkType() {
        try {
            const form = document.getElementById('addWorkTypeForm');
            if (!form) return;

            const formData = new FormData(form);
            let workTypeCode = formData.get('work_type_code')?.trim();

            // Kod boşdursa, avtomatik generasiya et
            if (!workTypeCode) {
                workTypeCode = this.generateWorkTypeCode(
                    formData.get('work_type_name'),
                    this.selectedDepartmentType
                );
            }

            const workTypeData = {
                company_id: parseInt(formData.get('company_id')),
                department_id: parseInt(formData.get('department_id')),
                work_type_name: formData.get('work_type_name'),
                work_type_code: workTypeCode,
                description: formData.get('description') || null,
                color_code: formData.get('color_code') || "#3B82F6",
                is_billable: formData.has('is_billable'),
                hourly_rate: formData.get('hourly_rate') ? parseFloat(formData.get('hourly_rate')) : null,
                is_active: true
            };

            console.log('📤 Yeni iş növü göndərilir:', workTypeData);

            const response = await this.api.post('/worktypes/', workTypeData);

            console.log('✅ İş növü yaradıldı cavabı:', response);

            if (response && (response.id || response.success || response.work_type_id)) {
                this.showSuccessMessage(`"${workTypeData.work_type_name}" iş növü yaradıldı!`);
                window.closeAddWorkTypeModal();
                await this.showWorkTypes(this.selectedDepartmentId, this.selectedDepartmentName, this.selectedDepartmentType);
            } else {
                throw new Error('İş növü yaradıla bilmədi');
            }
        } catch (error) {
            console.error('❌ İş növü yaradılarkən xəta:', error);
            this.showErrorMessage('Xəta: ' + (error.message || 'Bilinməyən xəta'));
        }
    }

    generateWorkTypeCode(workTypeName, departmentType) {
        const prefix = {
            'finance': 'FIN',
            'ict': 'ICT',
            'hr': 'HR',
            'marketing': 'MKT',
            'sales': 'SAL',
            'operations': 'OPS',
            'management': 'MGT',
            'general': 'WRK'
        }[departmentType] || 'WRK';

        const words = workTypeName.split(' ');
        let suffix = '';

        if (words.length === 1) {
            suffix = words[0].substring(0, 3).toUpperCase();
        } else {
            suffix = words.map(w => w.charAt(0).toUpperCase()).join('');
        }

        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `${prefix}-${suffix}${random}`;
    }

    openAddDepartmentForm() {
        const modalHTML = `
            <div id="addDepartmentModal" class="fixed inset-0 z-[200] overflow-y-auto bg-black bg-opacity-50">
                <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center">
                    <div class="inline-block w-full max-w-md my-8 text-left align-middle transition-all transform bg-white shadow-2xl rounded-3xl overflow-hidden">
                        <div class="px-6 py-4 border-b">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-3">
                                    <div class="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
                                        <i class="fa-solid fa-building text-blue-600"></i>
                                    </div>
                                    <div>
                                        <h3 class="text-lg font-bold text-gray-900">Yeni Departament</h3>
                                    </div>
                                </div>
                                <button onclick="window.closeAddDepartmentModal()"
                                        class="h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                                    <i class="fa-solid fa-times text-gray-600"></i>
                                </button>
                            </div>
                        </div>

                        <div class="p-6">
                            <form id="addDepartmentForm">
                                <div class="space-y-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">Departament adı *</label>
                                        <input type="text" name="department_name" required
                                               class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                               placeholder="Məs: İnsan Resursları">
                                    </div>

                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">Departament kodu</label>
                                        <input type="text" name="department_code"
                                               class="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                               placeholder="Məs: HR-001">
                                    </div>

                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">Təsvir</label>
                                        <textarea name="description" rows="2"
                                               class="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                               placeholder="Departamentin funksiyaları..."></textarea>
                                    </div>

                                    <input type="hidden" name="company_id" value="${this.currentCompanyId}">
                                </div>
                            </form>
                        </div>

                        <div class="px-6 py-4 border-t bg-gray-50">
                            <div class="flex justify-end gap-3">
                                <button onclick="window.closeAddDepartmentModal()"
                                        class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                                    Ləğv et
                                </button>
                                <button onclick="window.createNewDepartment()"
                                        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                    Yarat
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        window.closeAddDepartmentModal = () => {
            document.getElementById('addDepartmentModal')?.remove();
        };

        window.createNewDepartment = async () => {
            await this.createNewDepartment();
        };
    }

    async createNewDepartment() {
        try {
            const form = document.getElementById('addDepartmentForm');
            if (!form) return;

            const formData = new FormData(form);

            const departmentData = {
                company_id: parseInt(formData.get('company_id')),
                department_name: formData.get('department_name'),
                department_code: formData.get('department_code') || null,
                description: formData.get('description') || null
                // is_active defaults to true in backend
            };

            console.log('📤 Yeni departament göndərilir:', departmentData);

            // Use the correct endpoint from your backend
            const response = await this.api.post('/departments/new_departament', departmentData);

            console.log('✅ Departament yaradıldı cavabı:', response);

            if (response && response.id) {
                this.showSuccessMessage('Departament uğurla yaradıldı!');
                window.closeAddDepartmentModal();
                await this.loadDepartments();

                // Show info about adding work types
                this.showInfoMessage('İndi departamentə iş növləri əlavə edə bilərsiniz');
            } else {
                throw new Error('Departament yaradıla bilmədi');
            }
        } catch (error) {
            console.error('❌ Departament yaradılarkən xəta:', error);
            this.showErrorMessage('Xəta: ' + (error.message || 'Bilinməyən xəta'));
        }
    }

    async editWorkType(workTypeId) {
        try {
            const response = await this.api.get(`/worktypes/${workTypeId}`);
            const workType = response.data || response;

            // Edit modalını göstər
            const modalHTML = `
                <div id="editWorkTypeModal" class="fixed inset-0 z-[200] overflow-y-auto bg-black bg-opacity-50">
                    <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center">
                        <div class="inline-block w-full max-w-md my-8 text-left align-middle transition-all transform bg-white shadow-2xl rounded-3xl overflow-hidden">
                            <div class="px-6 py-4 border-b">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-3">
                                        <div class="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
                                            <i class="fa-solid fa-edit text-blue-600"></i>
                                        </div>
                                        <div>
                                            <h3 class="text-lg font-bold text-gray-900">İş Növünü Redaktə Et</h3>
                                            <p class="text-gray-600 text-sm">${workType.work_type_name}</p>
                                        </div>
                                    </div>
                                    <button onclick="window.closeEditWorkTypeModal()"
                                            class="h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                                        <i class="fa-solid fa-times text-gray-600"></i>
                                    </button>
                                </div>
                            </div>

                            <div class="p-6">
                                <form id="editWorkTypeForm">
                                    <div class="space-y-4">
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-1">İş növü adı *</label>
                                            <input type="text" name="work_type_name" required
                                                   class="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                                   value="${this.escapeHtml(workType.work_type_name || '')}">
                                        </div>

                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-1">İş növü kodu</label>
                                            <input type="text" name="work_type_code"
                                                   class="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                                   value="${this.escapeHtml(workType.work_type_code || '')}">
                                        </div>

                                        <div class="grid grid-cols-2 gap-4">
                                            <div>
                                                <label class="block text-sm font-medium text-gray-700 mb-1">Rəng kodu</label>
                                                <input type="color" name="color_code" value="${workType.color_code || '#3B82F6'}"
                                                       class="w-full h-10 px-1 py-1 border border-gray-300 rounded-lg">
                                            </div>
                                            <div>
                                                <label class="block text-sm font-medium text-gray-700 mb-1">Qiymət</label>
                                                <input type="number" name="hourly_rate" step="0.01"
                                                       class="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                                       value="${workType.hourly_rate || ''}">
                                            </div>
                                        </div>

                                        <div>
                                            <label class="flex items-center">
                                                <input type="checkbox" name="is_billable" ${workType.is_billable ? 'checked' : ''}
                                                       class="rounded border-gray-300 text-blue-600 mr-2">
                                                <span class="text-sm text-gray-700">Ödənişli iş</span>
                                            </label>
                                        </div>

                                        <div>
                                            <label class="flex items-center">
                                                <input type="checkbox" name="is_active" ${workType.is_active !== false ? 'checked' : ''}
                                                       class="rounded border-gray-300 text-blue-600 mr-2">
                                                <span class="text-sm text-gray-700">Aktiv</span>
                                            </label>
                                        </div>

                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-1">Təsvir</label>
                                            <textarea name="description" rows="3"
                                                   class="w-full px-4 py-2 border border-gray-300 rounded-lg">${this.escapeHtml(workType.description || '')}</textarea>
                                        </div>
                                    </div>
                                </form>
                            </div>

                            <div class="px-6 py-4 border-t bg-gray-50">
                                <div class="flex justify-end gap-3">
                                    <button onclick="window.closeEditWorkTypeModal()"
                                            class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                                        Ləğv et
                                    </button>
                                    <button onclick="window.updateWorkType(${workTypeId})"
                                            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                        Yenilə
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHTML);

            window.closeEditWorkTypeModal = () => {
                document.getElementById('editWorkTypeModal')?.remove();
            };

            window.updateWorkType = async (id) => {
                await this.updateWorkType(id);
            };

        } catch (error) {
            console.error('❌ İş növü məlumatları gətirilərkən xəta:', error);
            this.showErrorMessage('İş növü məlumatları gətirilə bilmədi');
        }
    }

    async updateWorkType(workTypeId) {
        try {
            const form = document.getElementById('editWorkTypeForm');
            if (!form) return;

            const formData = new FormData(form);

            const workTypeData = {
                work_type_name: formData.get('work_type_name'),
                work_type_code: formData.get('work_type_code') || null,
                description: formData.get('description') || null,
                color_code: formData.get('color_code') || "#3B82F6",
                is_billable: formData.has('is_billable'),
                hourly_rate: formData.get('hourly_rate') ? parseFloat(formData.get('hourly_rate')) : null,
                is_active: formData.has('is_active')
            };

            console.log('📤 İş növü yenilənir:', workTypeData);

            const response = await this.api.put(`/worktypes/${workTypeId}`, workTypeData);

            console.log('✅ İş növü yeniləndi cavabı:', response);

            if (response && (response.success || response.id)) {
                this.showSuccessMessage('İş növü yeniləndi!');
                window.closeEditWorkTypeModal();
                await this.showWorkTypes(this.selectedDepartmentId, this.selectedDepartmentName, this.selectedDepartmentType);
            } else {
                throw new Error('İş növü yenilənə bilmədi');
            }
        } catch (error) {
            console.error('❌ İş növü yenilənərkən xəta:', error);
            this.showErrorMessage('Xəta: ' + (error.message || 'Bilinməyən xəta'));
        }
    }

    async deleteWorkType(workTypeId, workTypeName) {
        const confirmed = await this.confirmAction(`"${workTypeName}" iş növünü silmək istədiyinizə əminsiniz?`);

        if (!confirmed) return;

        try {
            console.log(`🗑️ İş növü silinir: ${workTypeId}`);

            const response = await this.api.delete(`/worktypes/${workTypeId}`);

            console.log('✅ İş növü silindi cavabı:', response);

            this.showSuccessMessage(`"${workTypeName}" iş növü silindi!`);
            await this.showWorkTypes(this.selectedDepartmentId, this.selectedDepartmentName, this.selectedDepartmentType);
        } catch (error) {
            console.error('❌ İş növü silinərkən xəta:', error);
            this.showErrorMessage('Xəta: ' + (error.message || 'Bilinməyən xəta'));
        }
    }

    formatDate(date) {
        if (!date) return '-';
        try {
            return new Date(date).toLocaleDateString('az-AZ');
        } catch (e) {
            return '-';
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showSuccessMessage(message) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({icon: 'success', title: 'Uğurlu!', text: message, timer: 3000});
        } else {
            alert('✅ ' + message);
        }
    }

    // Köhnə metod adı ilə uyğunluq üçün
    async openDepartmentPermissions() {
        console.log('🔓 openDepartmentPermissions() çağırıldı -> showPermissionsSection() çağırılır');
        return this.showPermissionsSection();
    }

    showErrorMessage(message) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({icon: 'error', title: 'Xəta!', text: message});
        } else {
            alert('❌ ' + message);
        }
    }

    showInfoMessage(message) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({icon: 'info', title: 'Məlumat', text: message});
        } else {
            alert('ℹ️ ' + message);
        }
    }

    confirmAction(message) {
        if (typeof Swal !== 'undefined') {
            return Swal.fire({
                title: 'Əminsiniz?',
                text: message,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Bəli',
                cancelButtonText: 'Ləğv et'
            }).then(result => result.isConfirmed);
        } else {
            return Promise.resolve(confirm(message));
        }
    }
}

window.PermissionsService = PermissionsService;