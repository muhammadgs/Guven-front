/**
 * ÜST ŞİRKƏTLƏR MODULU
 * Modal yox, sağ content-də göstərilir
 */
class PartnersService {
    constructor() {
        this.parentCompanies = [];
        this.filteredParents = [];
        this.currentPage = 1;
        this.itemsPerPage = 8;
        this.searchTerm = '';
        this.filterStatus = 'all';
        this.currentCompanyCode = null;

        // DOM elementləri
        this.partnersSection = null;
        this.detailsSection = null;
        this.addModal = null;
        this.apiService = null;

        this.init();
    }

    init() {
        console.log('🔄 Üst Şirkətlər modulu işə salınır...');

        // ApiService-i əldə et
        if (window.app?.api) {
            this.apiService = window.app.api;
        } else if (window.ApiService) {
            this.apiService = new ApiService();
        }

        this.partnersSection = document.getElementById('partnersSection');
        this.detailsSection = document.getElementById('partnerDetailsSection');

        // DƏRHAL ŞİRKƏT KODUNU YÜKLƏ
        this.loadUserCompanyCode();

        // Əgər tapılmadısa və URL-də varsa, oradan götür
        if (!this.currentCompanyCode) {
            const urlParams = new URLSearchParams(window.location.search);
            const urlCompany = urlParams.get('company_code');
            if (urlCompany) {
                this.currentCompanyCode = urlCompany;
                console.log('✅ URL-dən kod tapıldı:', this.currentCompanyCode);
            }
        }

        this.setupEventListeners();

        console.log('✅ Şirkət kodu:', this.currentCompanyCode || 'TAPILMADI');
    }

    loadUserCompanyCode() {
        try {
            console.log('🔍 Şirkət kodu axtarılır...');

            // LocalStorage-dan userData-nı əldə et
            const userData = localStorage.getItem('userData');
            console.log('📦 userData:', userData);

            if (userData) {
                const parsed = JSON.parse(userData);
                console.log('📦 Parsed userData:', parsed);

                // BÜTÜN MÜMKÜN YOLLARLA ŞİRKƏT KODUNU AXTAR
                this.currentCompanyCode =
                    parsed.user?.company_code ||
                    parsed.company_code ||
                    parsed.user?.companyCode ||
                    parsed.companyCode ||
                    parsed.user?.company?.code ||
                    parsed.company?.code ||
                    parsed.user?.company?.company_code ||
                    parsed.company?.company_code;

                console.log('✅ Tapılan şirkət kodu:', this.currentCompanyCode);
            }

            // Əgər hələ də tapılmadısa, başqa mənbələrə bax
            if (!this.currentCompanyCode) {
                // Auth məlumatlarına bax
                const authData = localStorage.getItem('authData');
                if (authData) {
                    const parsed = JSON.parse(authData);
                    this.currentCompanyCode = parsed.company_code || parsed.companyCode;
                    console.log('✅ Auth-dan tapılan kod:', this.currentCompanyCode);
                }
            }

            if (!this.currentCompanyCode) {
                console.error('❌ Şirkət kodu heç bir yerdə tapılmadı');
            }

        } catch (e) {
            console.error('❌ User code oxunarkən xəta:', e);
            this.currentCompanyCode = null;
        }
    }

    setupEventListeners() {
        const openBtn = document.getElementById('openPartniorModalBtn');
        if (openBtn) {
            const newBtn = openBtn.cloneNode(true);
            openBtn.parentNode.replaceChild(newBtn, openBtn);
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showPartnersSection();
            });
        }


        const backToPartnersBtn = document.getElementById('backToPartnersBtn');
        if (backToPartnersBtn) {
            backToPartnersBtn.addEventListener('click', () => {
                if (this.detailsSection) this.detailsSection.style.display = 'none';
                if (this.partnersSection) this.partnersSection.style.display = 'block';
            });
        }

        const searchInput = document.getElementById('partnerSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.filterParents();
                this.renderTable();
            });
        }

        const filterSelect = document.getElementById('partnerStatusFilter');
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                this.filterStatus = e.target.value;
                this.filterParents();
                this.renderTable();
            });
        }

        const prevBtn = document.getElementById('partnerPrevPage');
        if (prevBtn) prevBtn.addEventListener('click', () => this.previousPage());

        const nextBtn = document.getElementById('partnerNextPage');
        if (nextBtn) nextBtn.addEventListener('click', () => this.nextPage());

        const refreshBtn = document.getElementById('refreshPartnersBtn');
        if (refreshBtn) refreshBtn.addEventListener('click', () => this.loadParents());

        const addBtn = document.getElementById('addPartnerBtn');
        if (addBtn) addBtn.addEventListener('click', () => this.openAddPartnerForm());
    }

    /**
     * Üst Şirkətlər bölməsini göstər
     */
    async showPartnersSection() {
        console.log('🤝 Üst Şirkətlər bölməsi göstərilir...');

        try {
            // ===== 1. ŞİRKƏT KODUNU YOXLA =====
            if (!this.currentCompanyCode) {
                console.warn('⚠️ Şirkət kodu tapılmadı, yenidən yüklənir...');
                this.loadUserCompanyCode();

                // Hələ də yoxdursa, istifadəçidən soruş
                if (!this.currentCompanyCode) {
                    const manualCode = prompt('Şirkət kodunuzu daxil edin (məsələn: SOC26001):');
                    if (manualCode) {
                        this.currentCompanyCode = manualCode.toUpperCase().trim();

                        // LocalStorage-a yadda saxla
                        try {
                            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
                            if (typeof userData === 'object') {
                                userData.company_code = this.currentCompanyCode;
                                localStorage.setItem('userData', JSON.stringify(userData));
                            }
                        } catch (e) {
                            console.error('LocalStorage yazma xətası:', e);
                        }

                        console.log('✅ İstifadəçi tərəfindən daxil edilən kod:', this.currentCompanyCode);
                    } else {
                        this.showError('Şirkət kodu olmadan davam edə bilməz');
                        return;
                    }
                }
            }

            console.log('📍 İstifadə olunacaq şirkət kodu:', this.currentCompanyCode);

            // ===== 2. BÜTÜN BÖLMƏLƏRİ GİZLƏ =====
            const dashboardSection = document.getElementById('dashboardSection');
            const profileSection = document.getElementById('profileSection');
            const companiesSection = document.getElementById('companiesSection');
            const employeesSection = document.getElementById('employeesSection');
            const filesSection = document.getElementById('filesSection');
            const reportsSection = document.getElementById('reportsSection');
            const settingsSection = document.getElementById('settingsSection');

            if (dashboardSection) dashboardSection.style.display = 'none';
            if (profileSection) profileSection.style.display = 'none';
            if (companiesSection) companiesSection.style.display = 'none';
            if (employeesSection) employeesSection.style.display = 'none';
            if (filesSection) filesSection.style.display = 'none';
            if (reportsSection) reportsSection.style.display = 'none';
            if (settingsSection) settingsSection.style.display = 'none';
            if (this.detailsSection) this.detailsSection.style.display = 'none';

            // ===== 3. PARTNYOR BÖLMƏSİNİ YARAT (ƏGƏR YOXDURSA) =====
            if (!this.partnersSection) {
                this.partnersSection = this.createPartnersSection();
            }

            // ===== 4. PARTNYOR BÖLMƏSİNİ GÖSTƏR =====
            if (this.partnersSection) {
                this.partnersSection.style.display = 'block';

                // Yükləmə indikatorunu göstər
                const container = document.getElementById('partnersTableContainer');
                if (container) {
                    container.innerHTML = `
                        <div class="text-center py-16">
                            <div class="inline-block h-12 w-12 animate-spin rounded-full border-4 border-brand-blue border-t-transparent"></div>
                            <p class="text-gray-500 mt-4">Partnyorlar siyahısı yüklənir...</p>
                        </div>
                    `;
                }

                // Məlumatları yüklə
                await this.loadParents();
            } else {
                console.error('❌ Partnyor bölməsi yaradıla bilmədi');
                this.showError('Partnyor bölməsi göstərilə bilmədi');
                return;
            }
            
            // ===== 6. SİDEBAR-I YIGIŞDIR (ƏGƏR VARSA) =====
            const sidebar = document.getElementById('mainSidebar');
            if (sidebar) {
                sidebar.classList.add('sidebar-collapsed');
            }

            console.log('✅ Üst Şirkətlər bölməsi uğurla göstərildi');

        } catch (error) {
            console.error('❌ Üst Şirkətlər bölməsi göstərilərkən xəta:', error);
            this.showError('Bölmə göstərilərkən xəta baş verdi: ' + (error.message || 'Bilinməyən xəta'));
        }
    }

    /**
     * Partnyor bölməsinin HTML-ni yarat
     */
    createPartnersSection() {
        const mainElement = document.querySelector('main .overflow-y-auto') ||
            document.querySelector('main #profileContent') ||
            document.querySelector('main > div') ||
            document.querySelector('main');

        if (!mainElement) {
            console.error('❌ Ana element tapılmadı');
            return null;
        }

        // Əgər artıq varsa, onu qaytar
        const existing = document.getElementById('partnersSection');
        if (existing) return existing;

        const section = document.createElement('section');
        section.id = 'partnersSection';
        section.className = 'hidden';
        section.innerHTML = `
            <div class="mb-8">
                <div class="flex items-center justify-between">
                    <div>
                        <span class="text-sm font-semibold uppercase tracking-widest text-brand-blue">Partnyorlar</span>
                        <p class="text-slate-500 mt-2">Partnyor şirkətlərinin siyahısı</p>
                    </div>
                    <div class="flex gap-3">
                        <button id="addPartnerBtn" class="px-4 py-2 bg-brand-blue text-white rounded-xl hover:bg-blue-600 transition flex items-center gap-2">
                            <i class="fa-solid fa-plus"></i> Yeni Partnyor
                        </button>
                        <button id="refreshPartnersBtn" class="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition flex items-center gap-2">
                            <i class="fa-solid fa-rotate-right"></i> Yenilə
                        </button>
                    </div>
                </div>
            </div>
    
            <!-- Statistik kartlar -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div class="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-600">Cəmi Partnyor</p>
                            <p class="text-2xl font-bold text-gray-900" id="totalPartnersCount">0</p>
                        </div>
                        <div class="h-12 w-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                            <i class="fa-solid fa-building text-purple-600"></i>
                        </div>
                    </div>
                </div>
                <div class="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-600">Aktiv</p>
                            <p class="text-2xl font-bold text-gray-900" id="activePartnersCount">0</p>
                        </div>
                        <div class="h-12 w-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                            <i class="fa-solid fa-check-circle text-green-600"></i>
                        </div>
                    </div>
                </div>
                <div class="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-600">Layihələr</p>
                            <p class="text-2xl font-bold text-gray-900" id="totalProjectsCount">0</p>
                        </div>
                        <div class="h-12 w-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                            <i class="fa-solid fa-diagram-project text-blue-600"></i>
                        </div>
                    </div>
                </div>
                <div class="bg-gradient-to-r from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-600">Son əlavə</p>
                            <p class="text-lg font-bold text-gray-900" id="lastPartnerAdded">-</p>
                        </div>
                        <div class="h-12 w-12 rounded-lg bg-amber-500/20 flex items-center justify-center">
                            <i class="fa-solid fa-calendar-plus text-amber-600"></i>
                        </div>
                    </div>
                </div>
            </div>
    
            <!-- Axtarış və filter -->
            <div class="flex flex-col md:flex-row gap-4 mb-6">
                <div class="flex-1">
                    <div class="relative">
                        <i class="fa-solid fa-search absolute left-4 top-3.5 text-gray-400"></i>
                        <input type="text" id="partnerSearch" placeholder="Partnyor adı, kodu üzrə axtar..." 
                               class="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue">
                    </div>
                </div>
                <select id="partnerStatusFilter" class="px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue">
                    <option value="all">Bütün statuslar</option>
                    <option value="active">Aktiv</option>
                    <option value="pending">Gözləmədə</option>
                    <option value="rejected">Rədd edilmiş</option>
                </select>
            </div>
    
            <!-- Cədvəl konteyneri -->
            <div id="partnersTableContainer" class="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div class="text-center py-16">
                    <div class="inline-block h-12 w-12 animate-spin rounded-full border-4 border-brand-blue border-t-transparent"></div>
                    <p class="text-gray-500 mt-4">Partnyorlar siyahısı yüklənir...</p>
                </div>
            </div>
    
            <!-- Pagination -->
            <div class="mt-6 flex items-center justify-between">
                <div class="text-sm text-gray-600">
                    <span id="partnerShowingText">0-0 / 0</span>
                </div>
                <div class="flex gap-2">
                    <button id="partnerPrevPage" class="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50" disabled>
                        <i class="fa-solid fa-chevron-left"></i> Əvvəl
                    </button>
                    <button id="partnerNextPage" class="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50" disabled>
                        Sonraki <i class="fa-solid fa-chevron-right"></i>
                    </button>
                </div>
            </div>
        `;

        mainElement.appendChild(section);

        // Event listener-ları əlavə et
        this.bindSectionEvents();

        return section;
    }

    bindSectionEvents() {
        const backBtn = document.getElementById('backToProfileFromPartnersBtn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                if (this.partnersSection) this.partnersSection.style.display = 'none';
                const profileSection = document.getElementById('profileSection');
                if (profileSection) profileSection.style.display = 'block';
            });
        }

        const searchInput = document.getElementById('partnerSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.filterParents();
                this.renderTable();
            });
        }

        const filterSelect = document.getElementById('partnerStatusFilter');
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                this.filterStatus = e.target.value;
                this.filterParents();
                this.renderTable();
            });
        }

        const refreshBtn = document.getElementById('refreshPartnersBtn');
        if (refreshBtn) refreshBtn.addEventListener('click', () => this.loadParents());

        const prevBtn = document.getElementById('partnerPrevPage');
        if (prevBtn) prevBtn.addEventListener('click', () => this.previousPage());

        const nextBtn = document.getElementById('partnerNextPage');
        if (nextBtn) nextBtn.addEventListener('click', () => this.nextPage());

        const addBtn = document.getElementById('addPartnerBtn');
        if (addBtn) addBtn.addEventListener('click', () => this.openAddPartnerForm());
    }

    async loadParents() {
        try {
            if (!this.currentCompanyCode) {
                this.loadUserCompanyCode();
                if (!this.currentCompanyCode) {
                    this.showError('Şirkət kodu tapılmadı');
                    return;
                }
            }

            console.log(`📡 Partnyorlar yüklənir: ${this.currentCompanyCode}`);

            // service-dəki get_partners endpoint-ini çağır
            const response = await this.apiService.get(`/partners/?company_code=${this.currentCompanyCode}`);
            console.log('📥 API cavabı (RAW):', response);

            let allPartners = [];
            if (response.items && Array.isArray(response.items)) {
                allPartners = response.items;
                console.log(`📦 items array: ${allPartners.length} məlumat`);
            }

            // Məlumatları birbaşa saxla - heç bir dəyişiklik etmədən!
            this.parentCompanies = allPartners;
            this.filteredParents = [...this.parentCompanies];

            console.log(`✅ ${this.parentCompanies.length} partnyor formatlandı`);
            console.log('📊 Formatlanmış partnyorlar:', this.parentCompanies.map(p => ({
                id: p.id,
                user_role: p.user_role,
                direction: p.direction,
                needs_my_approval: p.needs_my_approval,
                waiting_for: p.waiting_for,
                status_message: p.status_message
            })));

            this.updateStatistics();
            this.filterParents();
            this.renderTable();

        } catch (error) {
            console.error('❌ Xəta:', error);
            this.parentCompanies = [];
            this.filteredParents = [];
            this.renderTable();
        }
    }

    async addParentCompanyAPI(companyCode, parentData) {
        try {
            const effectiveCompanyCode = companyCode || this.currentCompanyCode;

            const requestData = {
                child_company_code: effectiveCompanyCode,
                parent_company_code: parentData.parent_company_code,
                relationship_type: 'parent',
                description: parentData.description || '',
                contract_number: parentData.contract_number || '',
                contract_date: parentData.contract_date || null,
                contact_person: parentData.contact_person || '',
                contact_phone: parentData.contact_phone || '',
                contact_email: parentData.contact_email || '',
                status: 'active'  // Birbaşa active et
            };

            const endpoint = `/partners/?company_code=${effectiveCompanyCode}`;
            const data = await this.apiService.post(endpoint, requestData);

            return data;

        } catch (error) {
            console.error('❌ API xətası:', error);
            throw error;
        }
    }


    /**
     * PARTNYORU SİL - REAL ENDPOINT
     * Endpoint: /api/v1/partners/{relationship_id}?company_code={company_code}
     */
    async removeParentCompanyAPI(companyCode, partnerId) {
        try {
            console.log(`🗑️ API: Partnyor silinir: ${companyCode}, ID: ${partnerId}`);

            if (!this.apiService) {
                throw new Error('ApiService tapılmadı');
            }

            const endpoint = `/partners/${partnerId}?company_code=${companyCode}`;
            console.log(`📤 DELETE sorğusu: ${endpoint}`);

            const response = await this.apiService.delete(endpoint);

            // 204 cavabı uğurlu deməkdir
            console.log('✅ Partnyor uğurla silindi', response);

            // Siyahını yenilə
            await this.loadParents();

            return true;

        } catch (error) {
            console.error('❌ API xətası:', error);
            throw error;
        }
    }

    updateStatistics() {
        const total = this.parentCompanies.length;
        const active = this.parentCompanies.filter(p => p.status === 'active').length;
        const totalProjects = this.parentCompanies.reduce((sum, p) => sum + (p.total_projects || 0), 0);

        document.getElementById('totalPartnersCount') &&
        (document.getElementById('totalPartnersCount').textContent = total);
        document.getElementById('activePartnersCount') &&
        (document.getElementById('activePartnersCount').textContent = active);
        document.getElementById('totalProjectsCount') &&
        (document.getElementById('totalProjectsCount').textContent = totalProjects);

        if (this.parentCompanies.length) {
            const sorted = [...this.parentCompanies].sort((a, b) =>
                new Date(b.contract_date || 0) - new Date(a.contract_date || 0)
            );
            document.getElementById('lastPartnerAdded') &&
            (document.getElementById('lastPartnerAdded').textContent =
                this.formatDate(sorted[0].contract_date));
        }
    }

    filterParents() {
        this.filteredParents = this.parentCompanies.filter(parent => {
            if (this.filterStatus !== 'all' && parent.status !== this.filterStatus) return false;

            if (this.searchTerm) {
                const searchFields = [
                    parent.parent_company_code || '',
                    parent.parent_company?.company_name || '',
                    parent.contract_number || '',
                    parent.contact_person || ''
                ].join(' ').toLowerCase();

                return searchFields.includes(this.searchTerm);
            }

            return true;
        });

        this.currentPage = 1;
    }

    renderTable() {
        const container = document.getElementById('partnersTableContainer');
        if (!container) return;

        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        const pageParents = this.filteredParents.slice(start, end);
        const totalPages = Math.ceil(this.filteredParents.length / this.itemsPerPage);

        this.updatePagination(totalPages);

        if (!this.filteredParents.length) {
            container.innerHTML = this.getEmptyStateHTML();
            return;
        }

        container.innerHTML = this.getTableHTML(pageParents);

        document.getElementById('partnerShowingText') &&
        (document.getElementById('partnerShowingText').textContent =
            `${start + 1}-${Math.min(end, this.filteredParents.length)} / ${this.filteredParents.length}`);

        this.attachTableEvents();
    }

    getEmptyStateHTML() {
        return `
            <div class="text-center py-16">
                <div class="inline-block h-24 w-24 rounded-full bg-gray-100 flex items-center justify-center mb-6">
                    <i class="fa-solid fa-building text-3xl text-gray-400"></i>
                </div>
                <h3 class="text-xl font-semibold text-gray-700 mb-2">Partnyor şirkət tapılmadı</h3>
                <p class="text-gray-500 mb-6">Hələ heç bir partnyor şirkət əlavə edilməyib</p>
                <button class="add-partner-from-empty px-6 py-3 bg-brand-blue text-white rounded-xl hover:bg-blue-600 font-medium">
                    <i class="fa-solid fa-plus mr-2"></i> Yeni partnyor əlavə et
                </button>
            </div>
        `;
    }

    getTableHTML(parents) {
        return `
            <div class="overflow-x-auto">
                <table class="w-full">
                    <thead>
                        <tr class="bg-gray-50 border-b">
                            <th class="text-left py-4 px-6 text-sm font-semibold text-gray-700">Partnyor Şirkət</th>
                            <th class="text-left py-4 px-6 text-sm font-semibold text-gray-700">Müqavilə</th>
                            <th class="text-left py-4 px-6 text-sm font-semibold text-gray-700">Əlaqə şəxsi</th>
                            <th class="text-left py-4 px-6 text-sm font-semibold text-gray-700">Layihələr</th>
                            <th class="text-left py-4 px-6 text-sm font-semibold text-gray-700">Status</th>
                            <th class="text-left py-4 px-6 text-sm font-semibold text-gray-700">Əməliyyatlar</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${parents.map(p => this.getTableRowHTML(p)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    getTableRowHTML(p) {
        // Şirkət adı - partner_company_name varsa onu göstər
        let companyName = p.partner_company_name || 'Bilinmir';
        let companyCode = p.partner_company_code || '';

        const statusClass = this.getStatusClass(p.status);
        const statusText = this.getStatusText(p.status);
        const contractDate = p.contract_date ? this.formatDate(p.contract_date) : '-';

        let actionButtons = '';
        let statusBadge = '';

        // KONSOLA YAZ - GƏLƏN MƏLUMATLARI GÖR
        console.log(`Partnyor ${p.id}:`, {
            user_role: p.user_role,
            direction: p.direction,
            needs_my_approval: p.needs_my_approval,
            waiting_for: p.waiting_for,
            status: p.status
        });

        // SADƏ MƏNTİQ - user_role ƏSASINDA
        if (p.status === 'pending') {

            // TƏKLİF ALAN (target) - Təsdiq etməli olan
            if (p.user_role === 'target' || p.direction === 'received' || p.needs_my_approval === true) {
                actionButtons = `
                    <button class="approve-from-list-btn px-3 py-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100" data-id="${p.id}" title="Təsdiq et">
                        <i class="fa-solid fa-check"></i>
                    </button>
                    <button class="reject-from-list-btn px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100" data-id="${p.id}" title="Rədd et">
                        <i class="fa-solid fa-times"></i>
                    </button>
                `;
                // Status mesajı - service-dən gələn
                statusBadge = `<span class="text-xs text-yellow-600 block mt-1"><i class="fa-solid fa-bell mr-1"></i>${p.status_message || 'Sizdən təsdiq gözlənilir'}</span>`;
            }
            // TƏKLİF GÖNDƏRƏN (requester) - Yalnız imtina edə bilər
            else if (p.user_role === 'requester' || p.direction === 'sent') {
                actionButtons = `
                    <button class="reject-from-list-btn px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100" data-id="${p.id}" title="Təklifi geri götür">
                        <i class="fa-solid fa-times"></i>
                    </button>
                `;
                statusBadge = `<span class="text-xs text-blue-600 block mt-1"><i class="fa-solid fa-paper-plane mr-1"></i>${p.status_message || 'Təklif göndərildi, qarşı tərəf gözlənilir'}</span>`;
            }
            // Hər ehtimala qarşı
            else {
                actionButtons = `
                    <button class="approve-from-list-btn px-3 py-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100" data-id="${p.id}" title="Təsdiq et">
                        <i class="fa-solid fa-check"></i>
                    </button>
                    <button class="reject-from-list-btn px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100" data-id="${p.id}" title="Rədd et">
                        <i class="fa-solid fa-times"></i>
                    </button>
                `;
                statusBadge = `<span class="text-xs text-gray-600 block mt-1"><i class="fa-solid fa-hourglass-half mr-1"></i>${p.status_message || 'Təsdiq gözləyir'}</span>`;
            }
        }
        // AKTİV PARTNYOR
        else if (p.status === 'active') {
            actionButtons = `
                <button class="remove-partner-btn px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100" data-id="${p.id}" title="Əlaqəni sil">
                    <i class="fa-solid fa-trash"></i>
                </button>
            `;
        }
        // RƏDD EDİLMİŞ
        else {
            actionButtons = `
                <button class="remove-partner-btn px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100" data-id="${p.id}" title="Sil">
                    <i class="fa-solid fa-trash"></i>
                </button>
            `;
        }

        return `
            <tr class="border-b hover:bg-gray-50" data-partner-id="${p.id}">
                <td class="py-4 px-6">
                    <div class="flex items-center">
                        <div class="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center mr-3">
                            <i class="fa-solid fa-building text-purple-600"></i>
                        </div>
                        <div>
                            <div class="font-medium text-gray-900">${companyName}</div>
                            <div class="text-sm text-gray-500">Kod: ${companyCode}</div>
                            ${statusBadge}
                        </div>
                    </div>
                </td>
                <td class="py-4 px-6">
                    <div class="font-medium">${p.contract_number || '—'}</div>
                    <div class="text-xs text-gray-500">${contractDate}</div>
                </td>
                <td class="py-4 px-6">
                    <div class="font-medium">${p.contact_person || '—'}</div>
                    <div class="text-xs text-gray-500">${p.contact_phone || ''}</div>
                </td>
                <td class="py-4 px-6 text-center">${p.total_projects || 0}</td>
                <td class="py-4 px-6">
                    <span class="px-3 py-1 rounded-full text-xs font-medium ${statusClass}">${statusText}</span>
                </td>
                <td class="py-4 px-6">
                    <div class="flex space-x-2">
                        <button class="view-partner-btn px-3 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100" data-id="${p.id}" title="Detallara bax">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                        ${actionButtons}
                    </div>
                </td>
            </tr>
        `;
    }

    getStatusClass(status) {
        const classes = {
            'active': 'bg-green-100 text-green-800',
            'inactive': 'bg-red-100 text-red-800',
            'pending': 'bg-amber-100 text-amber-800'
        };
        return classes[status] || 'bg-gray-100 text-gray-800';
    }

    getStatusText(status) {
        const texts = {
            'active': 'Aktiv',
            'inactive': 'Deaktiv',
            'pending': 'Gözləmədə'
        };
        return texts[status] || status;
    }

    attachTableEvents() {
        // View butonları
        document.querySelectorAll('.view-partner-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.viewPartner(e.currentTarget.dataset.id));
        });

        // Təsdiq butonları
        document.querySelectorAll('.approve-from-list-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.approveRequest(e.currentTarget.dataset.id);
            });
        });

        // Rədd butonları
        document.querySelectorAll('.reject-from-list-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.rejectRequest(e.currentTarget.dataset.id);
            });
        });

        // Silmə butonları
        document.querySelectorAll('.remove-partner-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.removePartner(e.currentTarget.dataset.id));
        });

        // Boş vəziyyətdə əlavə etmə butonu
        document.querySelectorAll('.add-partner-from-empty').forEach(btn => {
            btn.addEventListener('click', () => this.openAddPartnerForm());
        });
    }

    updatePagination(totalPages) {
        const prevBtn = document.getElementById('partnerPrevPage');
        const nextBtn = document.getElementById('partnerNextPage');

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
        const totalPages = Math.ceil(this.filteredParents.length / this.itemsPerPage);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.renderTable();
        }
    }

    /**
     * Partnyor detallarına bax
     */
    async viewPartner(partnerId) {
        try {
            const partner = this.parentCompanies.find(p => p.id == partnerId);
            if (!partner) return;

            if (!this.detailsSection) {
                this.createDetailsSection();
            }

            const contentDiv = document.getElementById('partnerDetailsContent');
            if (!contentDiv) return;

            const companyName = partner.parent_company?.company_name || partner.parent_company_code;
            const statusClass = this.getStatusClass(partner.status);
            const statusText = this.getStatusText(partner.status);

            // Təsdiq statusunu yoxla - YALNIZ ƏGƏR PARTNER PENDING STATUSDADIRSA
            let approvalData = null;
            if (partner.status === 'pending') {
                try {
                    approvalData = await this.checkApprovalStatus(partnerId);
                    console.log('Təsdiq statusu:', approvalData);
                } catch (e) {
                    console.log('Təsdiq statusu yoxlanılmadı:', e);
                }
            }

            // Təsdiq gözləyən və mənim təsdiq etməli olduğum partnyor?
            const needsMyApproval = approvalData?.needsMyApproval === true;

            contentDiv.innerHTML = `
                <div class="bg-white rounded-xl border border-gray-200 p-6">
                    <div class="flex items-center gap-4 mb-6 pb-4 border-b">
                        <div class="h-16 w-16 rounded-xl bg-purple-100 flex items-center justify-center">
                            <i class="fa-solid fa-building text-3xl text-purple-600"></i>
                        </div>
                        <div>
                            <h2 class="text-2xl font-bold text-gray-900">${companyName}</h2>
                            <p class="text-gray-600">Kod: ${partner.parent_company_code}</p>
                        </div>
                    </div>
    
                    <!-- TƏSDİQ STATUSU - yalnız pending və mənim təsdiqim gözlənirsə göstər -->
                    ${needsMyApproval ? `
                    <div class="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="font-medium text-yellow-800">
                                    <i class="fa-solid fa-clock mr-2"></i>
                                    Təsdiq gözləyir
                                </p>
                                <p class="text-sm text-yellow-600 mt-1">
                                    Bu şirkət sizinlə partnyor olmaq istəyir. Təklifi təsdiq edin və ya rədd edin.
                                </p>
                            </div>
                            <div class="flex gap-2">
                                <button class="approve-from-details-btn px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600" data-id="${partner.id}">
                                    <i class="fa-solid fa-check"></i> Təsdiq et
                                </button>
                                <button class="reject-from-details-btn px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600" data-id="${partner.id}">
                                    <i class="fa-solid fa-times"></i> Rədd et
                                </button>
                            </div>
                        </div>
                    </div>
                    ` : partner.status === 'pending' ? `
                    <div class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div class="flex items-center">
                            <i class="fa-solid fa-hourglass-half text-blue-500 mr-3"></i>
                            <div>
                                <p class="font-medium text-blue-800">Təsdiq gözlənilir</p>
                                <p class="text-sm text-blue-600">Qarşı tərəfin təsdiqi gözlənilir</p>
                            </div>
                        </div>
                    </div>
                    ` : ''}
    
                    <!-- Müqavilə məlumatları -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h3 class="font-semibold text-gray-700 mb-3">Müqavilə məlumatları</h3>
                            <div class="space-y-2">
                                <div class="flex justify-between py-2 border-b">
                                    <span class="text-gray-600">Nömrə:</span>
                                    <span class="font-medium">${partner.contract_number || '—'}</span>
                                </div>
                                <div class="flex justify-between py-2 border-b">
                                    <span class="text-gray-600">Tarix:</span>
                                    <span class="font-medium">${this.formatDate(partner.contract_date)}</span>
                                </div>
                                <div class="flex justify-between py-2 border-b">
                                    <span class="text-gray-600">Status:</span>
                                    <span class="px-3 py-1 rounded-full text-xs font-medium ${statusClass}">${statusText}</span>
                                </div>
                            </div>
                        </div>
    
                        <div>
                            <h3 class="font-semibold text-gray-700 mb-3">Əlaqə məlumatları</h3>
                            <div class="space-y-2">
                                <div class="flex justify-between py-2 border-b">
                                    <span class="text-gray-600">Şəxs:</span>
                                    <span class="font-medium">${partner.contact_person || '—'}</span>
                                </div>
                                <div class="flex justify-between py-2 border-b">
                                    <span class="text-gray-600">Telefon:</span>
                                    <span class="font-medium">${partner.contact_phone || '—'}</span>
                                </div>
                                <div class="flex justify-between py-2 border-b">
                                    <span class="text-gray-600">Email:</span>
                                    <span class="font-medium">${partner.contact_email || '—'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
    
                    ${partner.description ? `
                    <div class="mt-6 pt-6 border-t">
                        <h3 class="font-semibold text-gray-700 mb-3">Təsvir</h3>
                        <p class="text-gray-600 bg-gray-50 p-4 rounded-lg">${partner.description}</p>
                    </div>
                    ` : ''}
    
                    <div class="mt-6 flex justify-end gap-3">
                        <button class="back-to-partners-btn px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200">
                            <i class="fa-solid fa-arrow-left mr-2"></i> Geri
                        </button>
                    </div>
                </div>
            `;

            if (this.partnersSection) this.partnersSection.style.display = 'none';
            if (this.detailsSection) this.detailsSection.style.display = 'block';

            // Event listener-ları əlavə et
            document.querySelector('.back-to-partners-btn')?.addEventListener('click', () => {
                if (this.detailsSection) this.detailsSection.style.display = 'none';
                if (this.partnersSection) this.partnersSection.style.display = 'block';
            });

            // Təsdiq butonları - yalnız varsa əlavə et
            document.querySelector('.approve-from-details-btn')?.addEventListener('click', (e) => {
                this.approveRequest(e.currentTarget.dataset.id);
            });

            document.querySelector('.reject-from-details-btn')?.addEventListener('click', (e) => {
                this.rejectRequest(e.currentTarget.dataset.id);
            });

        } catch (error) {
            console.error('❌ Xəta:', error);
            this.showError('Məlumat göstərilmədi: ' + error.message);
        }
    }

    async checkApprovalStatus(partnerId) {
        try {
            if (!this.apiService) return null;

            const response = await this.apiService.get(
                `/partners/check-approval/${partnerId}?company_code=${this.currentCompanyCode}`
            );

            console.log(`🔍 Təsdiq statusu cavabı (ID ${partnerId}):`, response.data);

            // response.data.data strukturundan məlumatları götür
            return response.data?.data || null;
        } catch (error) {
            console.error('Təsdiq statusu yoxlanılmadı:', error);
            return null;
        }
    }


    async approveRequest(requestId) {
        try {
            if (!confirm('Bu partnyor təklifini təsdiq etmək istədiyinizə əminsiniz?')) return;

            // KÖHNƏ: /partners/approve/${requestId}
            // YENİ: /partners/respond/${requestId}
            await this.apiService.post(`/partners/respond/${requestId}?company_code=${this.currentCompanyCode}`, {
                action: 'approve'
            });

            this.showSuccess('Partnyor təklifi təsdiq edildi');

            if (this.detailsSection) this.detailsSection.style.display = 'none';
            if (this.partnersSection) this.partnersSection.style.display = 'block';

            await this.loadParents();
        } catch (error) {
            console.error('❌ Təsdiq xətası:', error);
            this.showError('Təsdiq edilərkən xəta: ' + error.message);
        }
    }

    /**
     * Təklifi rədd et (YENİ ENDPOINT)
     */
    async rejectRequest(requestId) {
        try {
            const reason = prompt('Rədd etmə səbəbini daxil edin (istəyə bağlı):');

            if (!confirm('Bu partnyor təklifini rədd etmək istədiyinizə əminsiniz?')) return;

            // KÖHNƏ: /partners/reject/${requestId}
            // YENİ: /partners/respond/${requestId}
            const payload = {
                action: 'reject'
            };

            if (reason) {
                payload.rejection_reason = reason;
            }

            await this.apiService.post(`/partners/respond/${requestId}?company_code=${this.currentCompanyCode}`, payload);

            this.showSuccess('Partnyor təklifi rədd edildi');

            if (this.detailsSection) this.detailsSection.style.display = 'none';
            if (this.partnersSection) this.partnersSection.style.display = 'block';

            await this.loadParents();
        } catch (error) {
            console.error('❌ Rədd etmə xətası:', error);
            this.showError('Rədd edilərkən xəta: ' + error.message);
        }
    }

    createDetailsSection() {
        const mainElement = document.querySelector('main .overflow-y-auto') ||
            document.querySelector('main #profileContent') ||
            document.querySelector('main > div') ||
            document.querySelector('main');

        if (!mainElement) return;

        this.detailsSection = document.createElement('section');
        this.detailsSection.id = 'partnerDetailsSection';
        this.detailsSection.className = 'hidden';
        this.detailsSection.innerHTML = `
            <div class="mb-8">
                <div class="flex items-center justify-between">
                    <div>
                        <span class="text-sm font-semibold uppercase tracking-widest text-brand-blue">Partnyor Detalları</span>
                        <p class="text-slate-500 mt-2">Partnyor şirkət haqqında ətraflı məlumat</p>
                    </div>
                </div>
            </div>
            <div id="partnerDetailsContent"></div>
        `;

        mainElement.appendChild(this.detailsSection);
    }

    async removePartner(partnerId) {
        try {
            const partner = this.parentCompanies.find(p => p.id == partnerId);
            if (!partner) return;

            const companyName = partner.parent_company?.company_name || partner.parent_company_code;

            if (!confirm(`"${companyName}" partnyor şirkətini silmək istədiyinizə əminsiniz?`)) return;

            await this.removeParentCompanyAPI(this.currentCompanyCode, partnerId);

            this.showSuccess('Partnyor şirkət silindi');
            await this.loadParents();

        } catch (error) {
            console.error('❌ Xəta:', error);
            this.showError('Partnyor silinə bilmədi: ' + error.message);
        }
    }

    openAddPartnerForm() {
        this.closeModals();

        const modalHTML = `
            <div id="addPartnerModal" class="fixed inset-0 z-[200] overflow-y-auto bg-black bg-opacity-50">
                <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center">
                    <div class="inline-block w-full max-w-2xl my-8 text-left align-middle transition-all transform bg-white shadow-2xl rounded-3xl overflow-hidden">
                        <div class="bg-white border-b border-gray-200 px-8 py-6">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-3">
                                    <div class="h-12 w-12 rounded-xl bg-purple-100 flex items-center justify-center">
                                        <i class="fa-solid fa-building text-purple-600"></i>
                                    </div>
                                    <div>
                                        <h3 class="text-xl font-bold text-gray-900">Yeni Partnyor Təklifi Göndər</h3>
                                        <p class="text-gray-600 text-sm">Partnyor şirkətə təklif göndərin, təsdiq gözləsin</p>
                                    </div>
                                </div>
                                <button id="closeAddPartnerModalBtn" class="h-10 w-10 rounded-full bg-gray-100 hover:bg-gray-200">
                                    <i class="fa-solid fa-times text-gray-600"></i>
                                </button>
                            </div>
                        </div>
    
                        <div class="px-8 py-6 max-h-[70vh] overflow-y-auto">
                            <form id="addPartnerForm" class="space-y-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Partnyor Şirkətinin Kodu</label>
                                    <input type="text" required id="newPartnerCompanyCode" 
                                           class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500" 
                                           placeholder="AZE26001">
                                    <p id="companyCodeStatus" class="text-xs mt-1 text-gray-500">Kodu daxil edin, məlumatlar avtomatik yüklənəcək</p>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Şirkət Adı</label>
                                    <input type="text" id="newPartnerCompanyName" readonly
                                           class="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 focus:outline-none" 
                                           placeholder="Kod daxil edildikdə avtomatik yüklənəcək">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">VÖEN</label>
                                    <input type="text" id="newPartnerVoen" readonly
                                           class="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 focus:outline-none" 
                                           placeholder="Kod daxil edildikdə avtomatik yüklənəcək">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Müqavilə nömrəsi</label>
                                    <input type="text" id="newPartnerContractNumber" 
                                           class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500" 
                                           placeholder="PAR-001">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Müqavilə tarixi</label>
                                    <input type="date" id="newPartnerContractDate" 
                                           class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Əlaqə şəxsi</label>
                                    <input type="text" id="newPartnerContactPerson" 
                                           class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500" 
                                           placeholder="Əlaqə şəxsinin adı">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Əlaqə telefonu</label>
                                    <input type="tel" id="newPartnerContactPhone" 
                                           class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500" 
                                           placeholder="+994501234567">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                                    <input type="email" id="newPartnerContactEmail" 
                                           class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500" 
                                           placeholder="email@example.com">
                                </div>
                                <!-- STATUS SELECT TAMAMİLƏ SİLİNDİ -->
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Təsvir</label>
                                    <textarea id="newPartnerDescription" rows="3" 
                                              class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                                              placeholder="Əlavə məlumat..."></textarea>
                                </div>
    
                                <div class="flex justify-end gap-3 pt-4">
                                    <button type="button" id="cancelAddPartnerBtn" class="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50">
                                        Ləğv et
                                    </button>
                                    <button type="submit" class="px-6 py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600">
                                        Təklif göndər
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.bindAddPartnerEvents();

        // Auto-fill üçün event listener
        const codeInput = document.getElementById('newPartnerCompanyCode');
        if (codeInput) {
            codeInput.addEventListener('input', this.debounce(async (e) => {
                const code = e.target.value.trim().toUpperCase();
                e.target.value = code;
                if (code.length >= 3) {
                    await this.autoFillCompanyDetails(code);
                }
            }, 500));
        }
    }

    /**
     * Debounce funksiyası - input daxil edilərkən çoxlu API çağrısının qarşısını alır
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Gözləyən təsdiqləri gətir
     */
    async loadPendingApprovals() {
        try {
            if (!this.currentCompanyCode) return;

            const response = await this.apiService.get(`/partners/pending-approvals?company_code=${this.currentCompanyCode}`);

            if (response.data) {
                this.renderPendingApprovals(response.data);
            }

            return response.data;
        } catch (error) {
            console.error('❌ Gözləyən təsdiqlər yüklənmədi:', error);
            return {incoming: [], outgoing: []};
        }
    }

    /**
     * Gözləyən təsdiqləri göstər
     */
    renderPendingApprovals(data) {
        const container = document.getElementById('pendingApprovalsContainer');
        if (!container) return;

        const {incoming, outgoing, total_pending} = data;

        let html = `
            <div class="mb-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">Gözləyən Təsdiqlər (${total_pending})</h3>
        `;

        // Gələn təkliflər (mən təsdiq etməliyəm)
        if (incoming.length > 0) {
            html += `
                <div class="mb-4">
                    <h4 class="text-md font-medium text-gray-700 mb-2">Mənə gələn təkliflər</h4>
                    <div class="space-y-3">
            `;

            incoming.forEach(req => {
                html += `
                    <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="font-medium text-gray-900">${req.company_name} (${req.company_code})</p>
                                <p class="text-sm text-gray-600">Əlaqə növü: ${req.relationship_type}</p>
                                <p class="text-xs text-gray-500">Göndərilib: ${new Date(req.request_sent_at).toLocaleString('az-AZ')}</p>
                            </div>
                            <div class="flex gap-2">
                                <button class="approve-request-btn px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600" data-id="${req.id}">
                                    <i class="fa-solid fa-check"></i> Təsdiq et
                                </button>
                                <button class="reject-request-btn px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600" data-id="${req.id}">
                                    <i class="fa-solid fa-times"></i> Rədd et
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            });

            html += `</div></div>`;
        }

        // Gedən təkliflər (qarşı tərəfin təsdiqini gözləyirəm)
        if (outgoing.length > 0) {
            html += `
                <div class="mt-4">
                    <h4 class="text-md font-medium text-gray-700 mb-2">Gözlədiyim təsdiqlər</h4>
                    <div class="space-y-3">
            `;

            outgoing.forEach(req => {
                html += `
                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="font-medium text-gray-900">${req.company_name} (${req.company_code})</p>
                                <p class="text-sm text-gray-600">Əlaqə növü: ${req.relationship_type}</p>
                                <p class="text-xs text-gray-500">Göndərilib: ${new Date(req.request_sent_at).toLocaleString('az-AZ')}</p>
                            </div>
                            <span class="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                                Təsdiq gözlənir
                            </span>
                        </div>
                    </div>
                `;
            });

            html += `</div></div>`;
        }

        if (total_pending === 0) {
            html += `
                <div class="text-center py-8 bg-gray-50 rounded-lg">
                    <i class="fa-solid fa-check-circle text-4xl text-gray-400 mb-2"></i>
                    <p class="text-gray-600">Gözləyən təsdiq yoxdur</p>
                </div>
            `;
        }

        html += `</div>`;

        container.innerHTML = html;

        // Event listener-ları əlavə et
        document.querySelectorAll('.approve-request-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.approveRequest(e.currentTarget.dataset.id));
        });

        document.querySelectorAll('.reject-request-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.rejectRequest(e.currentTarget.dataset.id));
        });
    }


    /**
     * Şirkət koduna əsasən məlumatları avtomatik doldur
     */
    async autoFillCompanyDetails(companyCode) {
        const statusEl = document.getElementById('companyCodeStatus');
        const nameEl = document.getElementById('newPartnerCompanyName');
        const voenEl = document.getElementById('newPartnerVoen');
        const contactPersonEl = document.getElementById('newPartnerContactPerson');
        const contactPhoneEl = document.getElementById('newPartnerContactPhone');
        const contactEmailEl = document.getElementById('newPartnerContactEmail');

        try {
            // Əvvəlcə kodu təmizlə (dırnaqları sil)
            const cleanCode = companyCode.replace(/^"|"$/g, '');

            statusEl.textContent = '⏳ Məlumatlar yüklənir...';
            statusEl.className = 'text-xs mt-1 text-blue-500';

            // Öz şirkəti ilə yoxlama
            if (cleanCode === this.currentCompanyCode) {
                statusEl.textContent = '❌ Öz şirkətinizi partnyor olaraq əlavə edə bilməzsiniz';
                statusEl.className = 'text-xs mt-1 text-red-500';
                if (nameEl) nameEl.value = '';
                if (voenEl) voenEl.value = '';
                return;
            }

            // getCompanyDetailsByCode metodunun varlığını yoxla
            if (typeof this.getCompanyDetailsByCode !== 'function') {
                console.error('❌ getCompanyDetailsByCode metodu tapılmadı');
                statusEl.textContent = '❌ Texniki xəta: Metod tapılmadı';
                statusEl.className = 'text-xs mt-1 text-red-500';
                return;
            }

            const companyData = await this.getCompanyDetailsByCode(cleanCode);

            if (companyData) {
                if (nameEl) nameEl.value = companyData.company_name || '';
                if (voenEl) voenEl.value = companyData.voen || '';

                if (contactPersonEl && !contactPersonEl.value) {
                    contactPersonEl.value = companyData.contact_person || '';
                }
                if (contactPhoneEl && !contactPhoneEl.value) {
                    contactPhoneEl.value = companyData.contact_phone || '';
                }
                if (contactEmailEl && !contactEmailEl.value) {
                    contactEmailEl.value = companyData.contact_email || '';
                }

                statusEl.textContent = '✅ Məlumatlar yükləndi';
                statusEl.className = 'text-xs mt-1 text-green-500';
            } else {
                statusEl.textContent = '⚠️ Şirkət tapılmadı, məlumatları əl ilə daxil edin';
                statusEl.className = 'text-xs mt-1 text-yellow-600';
                if (nameEl) nameEl.value = '';
                if (voenEl) voenEl.value = '';
            }
        } catch (error) {
            console.error('❌ Auto-fill xətası:', error);
            statusEl.textContent = '❌ Məlumatlar yüklənə bilmədi';
            statusEl.className = 'text-xs mt-1 text-red-500';
        }
    }

    /**
     * ŞİRKƏT MƏLUMATLARINI KOD İLƏ GƏTİR
     */
    async getCompanyDetailsByCode(companyCode) {
        try {
            // Əvvəlcə kodu təmizlə (dırnaqları sil)
            const cleanCode = companyCode.replace(/^"|"$/g, '');

            console.log(`🔍 Şirkət məlumatları gətirilir: ${cleanCode}`);

            if (!this.apiService) {
                console.error('❌ ApiService tapılmadı');
                return null;
            }

            const data = await this.apiService.get(`/companies/by-code/${cleanCode}`);

            console.log('✅ Şirkət məlumatları:', data);

            return {
                id: data.id,
                company_code: data.company_code,
                company_name: data.company_name,
                voen: data.voen,
                contact_person: data.ceo_info ?
                    (data.ceo_info.ceo_name + ' ' + (data.ceo_info.ceo_lastname || '')).trim() : '',
                contact_phone: data.ceo_info?.ceo_phone || '',
                contact_email: data.ceo_info?.ceo_email || '',
                status: data.is_active ? 'active' : 'inactive'
            };

        } catch (error) {
            console.error('❌ Şirkət məlumatları gətirilmədi:', error);
            if (error.message && error.message.includes('404')) {
                console.log('ℹ️ Şirkət tapılmadı (404)');
                return null;
            }
            return null;
        }
    }

    // Köhnə metod adı ilə uyğunluq üçün
    async open(companyCode = null) {
        console.log('🚀 open() çağırıldı -> showPartnersSection() çağırılır');

        if (companyCode) {
            this.currentCompanyCode = companyCode;
        }

        return this.showPartnersSection();
    }


    bindAddPartnerEvents() {
        const closeBtn = document.getElementById('closeAddPartnerModalBtn');
        const cancelBtn = document.getElementById('cancelAddPartnerBtn');

        if (closeBtn) closeBtn.addEventListener('click', () => this.closeModals());
        if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeModals());

        const form = document.getElementById('addPartnerForm');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();

                const submitBtn = e.target.querySelector('button[type="submit"]');
                const originalText = submitBtn.innerHTML;
                submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Göndərilir...';
                submitBtn.disabled = true;

                try {
                    const parentCompanyCode = document.getElementById('newPartnerCompanyCode').value.trim().toUpperCase();
                    const cleanParentCode = parentCompanyCode.replace(/^"|"$/g, '');

                    if (!cleanParentCode) {
                        this.showError('Partnyor şirkət kodu daxil edin');
                        return;
                    }

                    if (cleanParentCode === this.currentCompanyCode) {
                        this.showError('Öz şirkətinizə təklif göndərə bilməzsiniz');
                        return;
                    }

                    // STATUS GÖNDƏRİLMİR!
                    const data = {
                        parent_company_code: cleanParentCode,
                        description: document.getElementById('newPartnerDescription').value,
                        contract_number: document.getElementById('newPartnerContractNumber').value,
                        contract_date: document.getElementById('newPartnerContractDate').value,
                        // status: document.getElementById('newPartnerStatus').value,  <-- SİLİNDİ
                        contact_person: document.getElementById('newPartnerContactPerson').value,
                        contact_phone: document.getElementById('newPartnerContactPhone').value,
                        contact_email: document.getElementById('newPartnerContactEmail').value
                    };

                    await this.addParentCompanyAPI(this.currentCompanyCode, data);

                    this.showSuccess('Partnyor təklifi göndərildi. Qarşı tərəfin təsdiqi gözlənilir.');
                    this.closeModals();
                    await this.loadParents();

                } catch (error) {
                    console.error('❌ Xəta:', error);
                    this.showError('Təklif göndərilmədi: ' + error.message);
                } finally {
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }
            });
        }
    }

    closeModals() {
        const modal = document.getElementById('addPartnerModal');
        if (modal) modal.remove();
    }

    formatDate(date) {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('az-AZ');
    }

    showSuccess(message) {
        alert('✅ ' + message);
    }

    showError(message) {
        alert('❌ ' + message);
    }
}

window.PartnersService = PartnersService;