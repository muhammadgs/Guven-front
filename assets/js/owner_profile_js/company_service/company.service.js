/**
 * ŞİRKƏTLƏR MODAL MODULU
 * assets/js/owner_profile_js/company.service.js
 */

class CompaniesService {
    constructor() {
        this.companies = [];
        this.filteredCompanies = [];
        this.currentPage = 1;
        this.itemsPerPage = 8;
        this.searchTerm = '';
        this.filterStatus = 'all';
        this.relationshipFilter = 'all'; // 'all', 'parent', 'child'
        this.userCompanyCode = ''; // Login olan şirkətin kodu
        this.parentCompanies = []; // Üst şirkətlər
        this.childCompanies = []; // Alt şirkətlər
        this.isLoadingRelationships = false;

        // DOM elementləri
        this.modal = null;
        this.addModal = null;
        this.detailsModal = null;
        this.apiService = null;
        this.isAddingCompanyByCode = false;

        this.init();
    }

    /**
     * İNİTİALİZASIYA
     */
    init() {
        console.log('🔄 Şirkətlər modul meneceri işə salınır...');

        // API service-i tap
        if (window.app && window.app.api) {
            this.apiService = window.app.api;
        } else if (window.ApiService) {
            this.apiService = new ApiService();
        }

        // Event listener-ları qur
        this.setupEventListeners();

        // Səhifə yükləndikdə məlumatları gətir
        this.loadCompanies();

        this.forceAttachSearchListener();

        console.log('✅ Şirkətlər modul meneceri hazır');
    }

    /**
     * EVENT LISTENER-LARI QUR
     */
    setupEventListeners() {
        console.log('🔧 Şirkət event listener-ları qurulur...');

        // Açma düyməsi
        const openBtn = document.getElementById('openCompaniesModalBtn');
        if (openBtn) {
            openBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🏢 Şirkətlər düyməsinə klik edildi');
                this.showCompaniesSection();
            });
            console.log('✅ Şirkətlər düyməsi event listener-ı quruldu');
        } else {
            // DOM dəyişikliklərini izlə
            this.waitForElement('#openCompaniesModalBtn', (element) => {
                element.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🏢 Şirkətlər düyməsinə klik edildi (gecikmiş)');
                    this.showCompaniesSection();
                });
                console.log('✅ Şirkətlər düyməsi event listener-ı gecikmiş quruldu');
            });
        }

        // Relationship filter buttonları üçün event listener-lar
        document.addEventListener('click', (e) => {
            if (e.target.closest('#showAllCompaniesBtn')) {
                e.preventDefault();
                e.stopPropagation();
                this.setRelationshipFilter('all');
            }
            if (e.target.closest('#showParentCompaniesBtn')) {
                e.preventDefault();
                e.stopPropagation();
                this.setRelationshipFilter('parent');
            }
            if (e.target.closest('#showChildCompaniesBtn')) {
                e.preventDefault();
                e.stopPropagation();
                this.setRelationshipFilter('child');
            }
        });

        // Bağlama düyməsi
        const closeBtn = document.getElementById('closeCompaniesModalBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        // Export düyməsi
        const exportBtn = document.getElementById('exportCompaniesBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportCompanies());
        }

        // Pagination düymələri - bunlar sonra yaradılacaq, ona görə global listener
        document.addEventListener('click', (e) => {
            if (e.target.id === 'prevPageBtn' || e.target.closest('#prevPageBtn')) {
                this.previousPage();
            }
            if (e.target.id === 'nextPageBtn' || e.target.closest('#nextPageBtn')) {
                this.nextPage();
            }
        });

        // Overlay klikləri (modalı bağlamaq üçün)
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('bg-black') || e.target.classList.contains('bg-opacity-50')) {
                if (this.modal && !this.modal.classList.contains('hidden')) {
                    this.close();
                }
                if (this.addModal && !this.addModal.classList.contains('hidden')) {
                    this.closeAddCompanyModal();
                }
                if (this.detailsModal && !this.detailsModal.classList.contains('hidden')) {
                    this.closeCompanyDetails();
                }
            }
        });

        // Escape düyməsi ilə bağlamaq
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.modal && !this.modal.classList.contains('hidden')) {
                    this.close();
                }
                if (this.addModal && !this.addModal.classList.contains('hidden')) {
                    this.closeAddCompanyModal();
                }
                if (this.detailsModal && !this.detailsModal.classList.contains('hidden')) {
                    this.closeCompanyDetails();
                }
            }
        });
    }

    /**
     * Elementin görünməsini gözlə
     */
    waitForElement(selector, callback) {
        if (document.querySelector(selector)) {
            callback(document.querySelector(selector));
            return;
        }

        const observer = new MutationObserver((mutations) => {
            if (document.querySelector(selector)) {
                callback(document.querySelector(selector));
                observer.disconnect();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * ŞİRKƏTLƏR BÖLMƏSİNİ GÖSTƏR
     */
    showCompaniesSection() {
        console.log('🏢 Şirkətlər bölməsi göstərilir...', new Date().toISOString());

        try {
            // Bütün bölmələri gizlət
            const sections = [
                'dashboardSection',
                'profileSection',
                'companiesSection',
                'companyDetailsSection',
                'filesSection'
            ];

            sections.forEach(id => {
                const section = document.getElementById(id);
                if (section) {
                    section.style.display = 'none';
                    console.log(`📋 ${id} gizlədildi`);
                }
            });

            // Şirkətlər bölməsini yarat (əgər yoxdursa)
            let companiesSection = document.getElementById('companiesSection');
            if (!companiesSection) {
                console.log('⚠️ companiesSection tapılmadı, yaradılır...');
                companiesSection = this.createCompaniesSection();
            }

            // Şirkətlər bölməsini göstər
            if (companiesSection) {
                companiesSection.style.display = 'block';
                console.log('✅ companiesSection göstərildi');

                // MƏLUMATLARI YÜKLƏ
                this.loadCompanies().then(() => {
                    console.log('📊 Məlumatlar yükləndi, filter tətbiq edilir...');

                    // Relationship filter-i 'all' olaraq sıfırla
                    this.relationshipFilter = 'all';

                    // Button stillərini yenilə
                    this.updateRelationshipButtons('all');

                    this.filterCompanies();
                    this.calculateStatistics();
                    this.renderTable();

                    // AXTARIŞ EVENT LİSTENER-LARINI YENİDƏN QUR
                    console.log('🔧 Axtarış event listener-ları yenidən qurulur...');
                    this.attachSearchAndFilterEvents();

                    // Axtarış inputuna birbaşa manual event listener əlavə et
                    this.forceAttachSearchListener();

                    // RELATIONSHIP BUTTONLARINA EVENT LİSTENER ƏLAVƏ ET
                    this.attachRelationshipButtonEvents();
                }).catch(error => {
                    console.error('❌ Şirkətlər yüklənərkən xəta:', error);
                    const tableContainer = document.getElementById('companiesTableContainer');
                    if (tableContainer) {
                        tableContainer.innerHTML = `
                            <div class="text-center py-16">
                                <i class="fa-solid fa-exclamation-triangle text-4xl text-red-500 mb-4"></i>
                                <p class="text-gray-700">Şirkətlər yüklənərkən xəta baş verdi</p>
                                <p class="text-sm text-gray-500 mt-2">${error.message || 'Bilinməyən xəta'}</p>
                                <button onclick="window.companiesService?.loadCompanies().then(() => window.companiesService?.renderTable())" 
                                    class="mt-4 px-6 py-2 bg-brand-blue text-white rounded-xl hover:bg-blue-600">
                                    <i class="fa-solid fa-refresh mr-2"></i>Təkrar cəhd et
                                </button>
                            </div>
                        `;
                    }
                });
            }

            // Aktiv menü stilini yenilə
            document.querySelectorAll('nav a, .sidebar-link').forEach(a => {
                a.classList.remove('bg-brand-soft', 'text-brand-blue');
            });

            const companiesBtn = document.getElementById('openCompaniesModalBtn');
            if (companiesBtn) {
                companiesBtn.classList.add('bg-brand-soft', 'text-brand-blue');
            }

        } catch (error) {
            console.error('❌ showCompaniesSection xətası:', error);
        }
    }

    /**
     * MƏCBURİ AXTARIŞ LİSTENER
     */
    forceAttachSearchListener() {
        console.log('🔧 Məcburi axtarış listener-i əlavə edilir...');

        const searchInput = document.getElementById('companySearch');
        if (!searchInput) {
            setTimeout(() => {
                const retryInput = document.getElementById('companySearch');
                if (retryInput) {
                    console.log('✅ Axtarış inputu tapıldı (gecikmiş)');
                    this.addDirectSearchListener(retryInput);
                }
            }, 500);
            return;
        }

        this.addDirectSearchListener(searchInput);
    }

    /**
     * BİRBAŞA AXTARIŞ LİSTENER
     */
    addDirectSearchListener(input) {
        const newInput = input.cloneNode(true);
        input.parentNode.replaceChild(newInput, input);

        newInput.addEventListener('input', (e) => {
            const value = e.target.value;
            this.searchTerm = value;
            this.filterCompanies();
            this.renderTable();
        });
    }

    /**
     * Axtarış və filter event listener-larını əlavə et
     */
    attachSearchAndFilterEvents() {
        // AXTARIŞ INPUTU
        const searchInput = document.getElementById('companySearch');
        if (searchInput) {
            const newSearch = searchInput.cloneNode(true);
            searchInput.parentNode.replaceChild(newSearch, searchInput);

            newSearch.addEventListener('input', (e) => {
                this.searchTerm = e.target.value;
                this.filterCompanies();
                this.renderTable();
            });
        }

        // STATUS FILTER
        const filterSelect = document.getElementById('companyFilter');
        if (filterSelect) {
            const newFilter = filterSelect.cloneNode(true);
            filterSelect.parentNode.replaceChild(newFilter, filterSelect);

            newFilter.addEventListener('change', (e) => {
                this.filterStatus = e.target.value;
                this.filterCompanies();
                this.renderTable();
            });
        }

        // EXPORT DÜYMƏSİ
        const exportBtn = document.getElementById('exportCompaniesBtn');
        if (exportBtn) {
            const newExport = exportBtn.cloneNode(true);
            exportBtn.parentNode.replaceChild(newExport, exportBtn);
            newExport.addEventListener('click', () => this.exportCompanies());
        }

        // YENİ ŞİRKƏT ƏLAVƏ ET DÜYMƏSİ
        const addBtn = document.getElementById('addCompanyByCodeBtn');
        if (addBtn) {
            const newAddBtn = addBtn.cloneNode(true);
            addBtn.parentNode.replaceChild(newAddBtn, addBtn);
            newAddBtn.addEventListener('click', () => {
                this.openCompanyCodeModal();
            });
        }
    }

    /**
     * ŞİRKƏTLƏR BÖLMƏSİ YARAT
     */
    createCompaniesSection() {
        const mainContent = document.querySelector('main .overflow-y-auto') ||
                           document.querySelector('main #profileContent') ||
                           document.querySelector('main > div') ||
                           document.querySelector('main');

        if (!mainContent) {
            console.error('❌ Ana element tapılmadı');
            return null;
        }

        const companiesSection = document.createElement('section');
        companiesSection.id = 'companiesSection';
        companiesSection.className = 'hidden';
        companiesSection.innerHTML = `
            <div class="mb-8">
                <div class="flex items-center justify-between">
                    <div>
                        <span class="text-sm font-semibold uppercase tracking-widest text-brand-blue">Şirkətlər</span>
                        <p class="text-slate-500 mt-2">Bağlı şirkətlərinizin siyahısı</p>
                    </div>
                    <button id="addCompanyByCodeBtn" class="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl transition font-medium flex items-center shadow-lg border-2 border-green-300" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
                        <i class="fa-solid fa-plus-circle text-white text-lg mr-2"></i>
                        <span class="font-semibold">Yeni Şirkət Əlavə Et</span>
                    </button>
                </div>
            </div>

            <!-- Statistik kartlar -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div class="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                    <div class="flex items-center justify-between">
                        <div><p class="text-sm text-gray-600">Cəmi Şirkət</p><p class="text-2xl font-bold text-gray-900" id="totalCompaniesCount">0</p></div>
                        <div class="h-12 w-12 rounded-lg bg-blue-500/20 flex items-center justify-center"><i class="fa-solid fa-building text-blue-600"></i></div>
                    </div>
                </div>
                <div class="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                    <div class="flex items-center justify-between">
                        <div><p class="text-sm text-gray-600">Aktiv Şirkət</p><p class="text-2xl font-bold text-gray-900" id="activeCompaniesCount">0</p></div>
                        <div class="h-12 w-12 rounded-lg bg-green-500/20 flex items-center justify-center"><i class="fa-solid fa-check-circle text-green-600"></i></div>
                    </div>
                </div>
                <div class="bg-gradient-to-r from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200">
                    <div class="flex items-center justify-between">
                        <div><p class="text-sm text-gray-600">Ümumi İşçi</p><p class="text-2xl font-bold text-gray-900" id="totalEmployeesCount">0</p></div>
                        <div class="h-12 w-12 rounded-lg bg-amber-500/20 flex items-center justify-center"><i class="fa-solid fa-users text-amber-600"></i></div>
                    </div>
                </div>
                <div class="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                    <div class="flex items-center justify-between">
                        <div><p class="text-sm text-gray-600">Son əlavə</p><p class="text-lg font-bold text-gray-900" id="lastAddedDate">-</p></div>
                        <div class="h-12 w-12 rounded-lg bg-purple-500/20 flex items-center justify-center"><i class="fa-solid fa-calendar-plus text-purple-600"></i></div>
                    </div>
                </div>
            </div>

            <!-- Axtarış və filter - RELATIONSHIP BUTTONLARI İLƏ -->
            <div class="flex flex-col md:flex-row gap-4 mb-6">
                <div class="flex gap-2 bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
                    <button id="showAllCompaniesBtn" class="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 bg-brand-blue text-white shadow-md">
                        <i class="fa-solid fa-building"></i>
                        <span>Şirkətlər</span>
                    </button>
                    <button id="showParentCompaniesBtn" class="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 text-gray-600 hover:bg-blue-50">
                        <i class="fa-solid fa-arrow-up-wide-short"></i>
                        <span>Icraçı</span>
                    </button>
                    <button id="showChildCompaniesBtn" class="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 text-gray-600 hover:bg-blue-50">
                        <i class="fa-solid fa-arrow-down-wide-short"></i>
                        <span>Sifarişçi</span>
                    </button>
                    <button id="showPartnerCompaniesBtn" class="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 text-gray-600 hover:bg-blue-50">
                        <i class="fa-solid fa-arrow-down-wide-short"></i>
                        <span>Partniyor</span>
                    </button>
                </div>
                
                <div class="flex-1">
                    <div class="relative">
                        <i class="fa-solid fa-search absolute left-4 top-3.5 text-gray-400"></i>
                        <input type="text" id="companySearch" placeholder="Şirkət adı, kodu və ya VOEN üzrə axtar..." class="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent shadow-sm">
                    </div>
                </div>
                <div class="flex gap-2">
                    <select id="companyFilter" class="px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent shadow-sm">
                        <option value="all">Hamısı</option>
                        <option value="active">Yalnız aktiv</option>
                        <option value="inactive">Yalnız deaktiv</option>
                    </select>
                    <button id="exportCompaniesBtn" class="px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 flex items-center gap-2 shadow-sm"><i class="fa-solid fa-download"></i> Export</button>
                </div>
            </div>

            <!-- Şirkətlər cədvəli -->
            <div id="companiesTableContainer" class="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div class="text-center py-16">
                    <div class="inline-block h-12 w-12 animate-spin rounded-full border-4 border-brand-blue border-t-transparent"></div>
                    <p class="text-gray-500 mt-4">Şirkət siyahısı yüklənir...</p>
                </div>
            </div>

            <!-- Pagination -->
            <div class="mt-6 flex items-center justify-between">
                <div class="text-sm text-gray-600"><span id="showingText">0-0 of 0</span></div>
                <div class="flex gap-2">
                    <button id="prevPageBtn" class="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" disabled><i class="fa-solid fa-chevron-left"></i></button>
                    <button id="nextPageBtn" class="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" disabled><i class="fa-solid fa-chevron-right"></i></button>
                </div>
            </div>
        `;

        mainContent.appendChild(companiesSection);
        console.log('✅ Yeni companiesSection yaradıldı');

        this.attachSearchAndFilterEvents();
        this.attachRelationshipButtonEvents();

        return companiesSection;
    }

    /**
     * ŞİRKƏT MƏLUMATLARINI YÜKLƏ
     */
    async loadCompanies() {
        try {
            console.log('📥 Şirkət məlumatları yüklənir...');

            let companies = [];
            let userCompanyCode = null;

            // localStorage-dən user_service-in şirkət kodunu al
            try {
                const userData = localStorage.getItem('userData');
                if (userData) {
                    const parsedData = JSON.parse(userData);
                    if (parsedData.user) {
                        userCompanyCode = parsedData.user.company_code || parsedData.user.companyCode;
                    } else {
                        userCompanyCode = parsedData.company_code || parsedData.companyCode;
                    }
                    this.userCompanyCode = userCompanyCode;
                    console.log('🏢 User company code:', userCompanyCode);
                }
            } catch (e) {
                console.log('ℹ️ localStorage oxuma xətası:', e);
            }

            // API service varsa, məlumatları gətir
            if (this.apiService && userCompanyCode) {
                try {
                    // 1. Alt şirkətləri gətir
                    console.log(`🌐 API çağırışı: /companies/${userCompanyCode}/sub-companies`);
                    const subResponse = await this.apiService.get(`/companies/${userCompanyCode}/sub-companies`);

                    if (subResponse && subResponse.sub_companies) {
                        companies = subResponse.sub_companies.map(c => ({
                            ...c,
                            relationship_type: 'child',
                            is_child: true
                        }));
                    }

                    // 2. Rəsmi alt şirkətləri gətir
                    try {
                        const subsidiariesResponse = await this.apiService.get(`/companies/${userCompanyCode}/real-subsidiaries`);

                        if (subsidiariesResponse && subsidiariesResponse.success && subsidiariesResponse.subsidiaries) {
                            const subsidiaryCodes = new Set(subsidiariesResponse.subsidiaries.map(s => s.child_company_code));

                            companies = companies.map(company => {
                                if (subsidiaryCodes.has(company.company_code)) {
                                    return {
                                        ...company,
                                        is_official_subsidiary: true
                                    };
                                }
                                return company;
                            });
                        }
                    } catch (relError) {
                        console.log('ℹ️ Rəsmi alt şirkətlər yüklənə bilmədi:', relError.message);
                    }

                    // 3. Üst şirkətləri gətir (əgər varsa)
                    try {
                        console.log(`🌐 API çağırışı: /companies/${userCompanyCode}/parent-companies`);
                        const parentResponse = await this.apiService.get(`/companies/${userCompanyCode}/parent-companies`);

                        if (parentResponse && parentResponse.success && parentResponse.parent_companies) {
                            const parentCompanies = parentResponse.parent_companies.map(p => ({
                                ...p,
                                company_code: p.parent_company_code,
                                relationship_type: 'parent',
                                is_parent: true
                            }));

                            // Mövcud companies-ə parent şirkətləri əlavə et
                            companies = [...companies, ...parentCompanies];
                        }
                    } catch (parentError) {
                        console.log('ℹ️ Üst şirkətlər yüklənə bilmədi:', parentError.message);
                    }

                } catch (apiError) {
                    console.error('❌ API xətası:', apiError);
                }
            }

            this.companies = companies;
            console.log(`✅ ${this.companies.length} şirkət yükləndi (${this.companies.filter(c => c.is_child).length} alt, ${this.companies.filter(c => c.is_parent).length} üst)`);

            // Parent və Child şirkətləri ayır
            this.separateCompaniesByRelationship();

            // Kartda sayı göstər
            const countText = document.getElementById('companiesCountText');
            if (countText) {
                countText.textContent = `${this.companies.length} bağlı şirkət tapıldı`;
            }

            return this.companies;

        } catch (error) {
            console.error('❌ Şirkət məlumatları yüklənmədi:', error);
            this.companies = [];
            return [];
        }
    }

    /**
     * ŞİRKƏTLƏRİ ƏLAQƏ NÖVÜNƏ GÖRE AYIR
     */
    separateCompaniesByRelationship() {
        if (!this.companies || !Array.isArray(this.companies)) {
            this.parentCompanies = [];
            this.childCompanies = [];
            return;
        }

        // Parent şirkətlər (bu şirkətin üstündə olanlar)
        this.parentCompanies = this.companies.filter(company =>
            company.is_parent === true ||
            company.relationship_type === 'parent' ||
            company.parent_company_id // əgər parent_company_id varsa, demək bu şirkət parent-dir
        );

        // Child şirkətlər (bu şirkətin altında olanlar)
        this.childCompanies = this.companies.filter(company =>
            company.is_child === true ||
            company.relationship_type === 'child' ||
            company.child_company_id // əgər child_company_id varsa, demək bu şirkət child-dir
        );

        console.log(`📊 Parent şirkətlər: ${this.parentCompanies.length}`);
        console.log(`📊 Child şirkətlər: ${this.childCompanies.length}`);

        // Əgər həm parent, həm də child varsa (hər ikisi)
        const bothRelationships = this.companies.filter(c =>
            (c.is_parent || c.relationship_type === 'parent') &&
            (c.is_child || c.relationship_type === 'child')
        );

        if (bothRelationships.length > 0) {
            console.log(`📊 Həm parent, həm child olanlar: ${bothRelationships.length}`);
        }
    }

    /**
     * RELATIONSHIP NÖVÜNƏ GÖRƏ ŞİRKƏTLƏRİ YÜKLƏ
     */
    async loadCompaniesByRelationship(type) {
        try {
            console.log(`📥 ${type === 'parent' ? 'Üst' : 'Alt'} şirkətlər yüklənir...`);

            if (!this.userCompanyCode) {
                try {
                    const userData = localStorage.getItem('userData');
                    if (userData) {
                        const parsedData = JSON.parse(userData);
                        if (parsedData.user) {
                            this.userCompanyCode = parsedData.user.company_code || parsedData.user.companyCode;
                        } else {
                            this.userCompanyCode = parsedData.company_code || parsedData.companyCode;
                        }
                    }
                } catch (e) {
                    console.log('ℹ️ localStorage oxuma xətası:', e);
                }
            }

            if (!this.userCompanyCode) {
                throw new Error('İstifadəçi şirkət kodu tapılmadı');
            }

            let companies = [];

            if (type === 'child') {
                // Alt şirkətlər üçün
                if (this.apiService) {
                    try {
                        // 1. real-subsidiaries endpoint-i
                        const response = await this.apiService.get(`/companies/${this.userCompanyCode}/real-subsidiaries`);

                        if (response && response.success && response.subsidiaries) {
                            companies = response.subsidiaries.map(s => ({
                                ...s,
                                company_code: s.child_company_code,
                                company_name: s.company_name,
                                relationship_type: 'child',
                                is_child: true,
                                is_official_subsidiary: true
                            }));
                        }

                        // 2. sub-companies endpoint-i
                        const subResponse = await this.apiService.get(`/companies/${this.userCompanyCode}/sub-companies`);

                        if (subResponse && subResponse.sub_companies) {
                            const subCompanies = subResponse.sub_companies.map(c => ({
                                ...c,
                                relationship_type: 'child',
                                is_child: true
                            }));

                            const existingCodes = new Set(companies.map(c => c.company_code));
                            subCompanies.forEach(c => {
                                if (!existingCodes.has(c.company_code)) {
                                    companies.push(c);
                                }
                            });
                        }
                    } catch (apiError) {
                        console.error('❌ API xətası:', apiError);
                        companies = this.companies.filter(c =>
                            c.child_company_id ||
                            c.relationship_type === 'child' ||
                            c.is_child === true
                        );
                    }
                }
            } else if (type === 'parent') {
                // ============ YENİ: ÜST ŞİRKƏTLƏR ÜÇÜN ============
                console.log('👆 Üst şirkətlər yüklənir...');

                if (this.apiService) {
                    try {
                        // Yeni yaratdığımız parent-companies endpoint-indən istifadə et
                        const response = await this.apiService.get(`/companies/${this.userCompanyCode}/parent-companies`);
                        console.log('📦 Parent companies cavabı:', response);

                        if (response && response.success && response.parent_companies) {
                            companies = response.parent_companies.map(p => ({
                                ...p,
                                relationship_type: 'parent',
                                is_parent: true,
                                company_code: p.parent_company_code,
                                company_name: p.company_name,
                                voen: p.voen,
                                employee_count: p.employee_count || 0
                            }));
                        }
                    } catch (apiError) {
                        console.error('❌ Parent companies API xətası:', apiError);

                        // Xəta olarsa, mövcud companies-dən filter et
                        companies = this.companies.filter(c =>
                            c.parent_company_id ||
                            c.relationship_type === 'parent' ||
                            c.is_parent === true
                        );
                    }
                }
            }

            this.companies = companies;
            this.filteredCompanies = [...companies];

            console.log(`✅ ${companies.length} ${type === 'parent' ? 'üst' : 'alt'} şirkət yükləndi`);

        } catch (error) {
            console.error(`❌ ${type} şirkətlər yüklənərkən xəta:`, error);
            this.companies = [];
            this.filteredCompanies = [];
            throw error;
        }
    }

    /**
     * RELATIONSHIP FILTER-İ TƏYİN ET
     */
    async setRelationshipFilter(type) {
        console.log(`🔀 Relationship filter dəyişdirilir: ${this.relationshipFilter} -> ${type}`);

        if (this.relationshipFilter === type) {
            console.log('ℹ️ Eyni filter, dəyişiklik yoxdur');
            return;
        }

        const oldFilter = this.relationshipFilter;

        this.showLoading(true);

        try {
            this.relationshipFilter = type;

            if (type === 'parent' || type === 'child') {
                await this.loadCompaniesByRelationship(type);
            } else {
                await this.loadCompanies();
            }

            this.updateRelationshipButtons(type);
            this.calculateStatistics();
            this.renderTable();

            console.log(`✅ Relationship filter dəyişdirildi: ${oldFilter} -> ${type}`);
            console.log(`📊 Göstərilən şirkət sayı: ${this.filteredCompanies.length}`);

        } catch (error) {
            console.error('❌ Relationship filter dəyişdirilərkən xəta:', error);
            alert('Filter dəyişdirilərkən xəta baş verdi: ' + error.message);

            this.relationshipFilter = oldFilter;
            this.updateRelationshipButtons(oldFilter);
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * RELATIONSHIP BUTTON STİLLƏRİNİ YENİLƏ
     */
    updateRelationshipButtons(activeType) {
        const allBtn = document.getElementById('showAllCompaniesBtn');
        const parentBtn = document.getElementById('showParentCompaniesBtn');
        const childBtn = document.getElementById('showChildCompaniesBtn');

        if (!allBtn || !parentBtn || !childBtn) {
            console.log('⚠️ Relationship buttonları tapılmadı');
            return;
        }

        [allBtn, parentBtn, childBtn].forEach(btn => {
            btn.classList.remove('bg-brand-blue', 'text-white', 'shadow-md');
            btn.classList.add('text-gray-600', 'hover:bg-blue-50');
        });

        switch(activeType) {
            case 'all':
                allBtn.classList.remove('text-gray-600', 'hover:bg-blue-50');
                allBtn.classList.add('bg-brand-blue', 'text-white', 'shadow-md');
                break;
            case 'parent':
                parentBtn.classList.remove('text-gray-600', 'hover:bg-blue-50');
                parentBtn.classList.add('bg-brand-blue', 'text-white', 'shadow-md');
                break;
            case 'child':
                childBtn.classList.remove('text-gray-600', 'hover:bg-blue-50');
                childBtn.classList.add('bg-brand-blue', 'text-white', 'shadow-md');
                break;
        }
    }

    /**
     * YÜKLƏNMƏ VƏZİYYƏTİNİ GÖSTƏR
     */
    showLoading(show) {
        const container = document.getElementById('companiesTableContainer');
        if (!container) return;

        if (show) {
            container.innerHTML = `
                <div class="text-center py-16">
                    <div class="inline-block h-12 w-12 animate-spin rounded-full border-4 border-brand-blue border-t-transparent"></div>
                    <p class="text-gray-500 mt-4">Məlumatlar yüklənir...</p>
                </div>
            `;
        }
    }

    /**
     * RELATIONSHIP BUTTONLARINA EVENT LİSTENER ƏLAVƏ ET
     */
    attachRelationshipButtonEvents() {
        setTimeout(() => {
            const allBtn = document.getElementById('showAllCompaniesBtn');
            const parentBtn = document.getElementById('showParentCompaniesBtn');
            const childBtn = document.getElementById('showChildCompaniesBtn');

            if (allBtn) {
                const newAllBtn = allBtn.cloneNode(true);
                allBtn.parentNode.replaceChild(newAllBtn, allBtn);

                newAllBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.setRelationshipFilter('all');
                });
                console.log('✅ All companies button listener əlavə edildi');
            }

            if (parentBtn) {
                const newParentBtn = parentBtn.cloneNode(true);
                parentBtn.parentNode.replaceChild(newParentBtn, parentBtn);

                newParentBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.setRelationshipFilter('parent');
                });
                console.log('✅ Parent companies button listener əlavə edildi');
            }

            if (childBtn) {
                const newChildBtn = childBtn.cloneNode(true);
                childBtn.parentNode.replaceChild(newChildBtn, childBtn);

                newChildBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.setRelationshipFilter('child');
                });
                console.log('✅ Child companies button listener əlavə edildi');
            }
        }, 500);
    }

    /**
     * ŞİRKƏTLƏRİ FİLTER ET
     */
    filterCompanies() {
        if (!this.companies || this.companies.length === 0) {
            this.filteredCompanies = [];
            return;
        }

        // Relationship filter artıq tətbiq olunubsa
        if (this.relationshipFilter !== 'all') {
            let filtered = [...this.companies];

            // Status filter
            if (this.filterStatus === 'active') {
                filtered = filtered.filter(c => c.is_active === true);
            } else if (this.filterStatus === 'inactive') {
                filtered = filtered.filter(c => c.is_active === false);
            }

            // Axtarış
            if (this.searchTerm && this.searchTerm.trim() !== '') {
                const searchLower = this.searchTerm.toLowerCase().trim();
                filtered = filtered.filter(company => {
                    const companyName = (company.company_name || company.name || '').toLowerCase();
                    const companyCode = (company.company_code || company.code || '').toLowerCase();
                    const voen = (company.voen || company.vat_number || '').toLowerCase();

                    return companyName.includes(searchLower) ||
                           companyCode.includes(searchLower) ||
                           voen.includes(searchLower);
                });
            }

            this.filteredCompanies = filtered;
            this.currentPage = 1;
            return;
        }

        // 'all' filteri üçün
        let filtered = [...this.companies];

        // Status filter
        if (this.filterStatus === 'active') {
            filtered = filtered.filter(c => c.is_active === true);
        } else if (this.filterStatus === 'inactive') {
            filtered = filtered.filter(c => c.is_active === false);
        }

        // Axtarış
        if (this.searchTerm && this.searchTerm.trim() !== '') {
            const searchLower = this.searchTerm.toLowerCase().trim();
            filtered = filtered.filter(company => {
                const companyName = (company.company_name || company.name || '').toLowerCase();
                const companyCode = (company.company_code || company.code || '').toLowerCase();
                const voen = (company.voen || company.vat_number || '').toLowerCase();

                return companyName.includes(searchLower) ||
                       companyCode.includes(searchLower) ||
                       voen.includes(searchLower);
            });
        }

        this.filteredCompanies = filtered;
        this.currentPage = 1;
    }

    /**
     * STATİSTİKALARI HESABLA
     */
    calculateStatistics() {
        const total = this.companies.length;
        const active = this.companies.filter(c => c.is_active).length;
        const totalEmployees = this.companies.reduce((sum, c) =>
            sum + (c.total_employees || c.employee_count || 0), 0);

        let lastAdded = '-';
        if (this.companies.length > 0) {
            const sorted = [...this.companies].sort((a, b) =>
                new Date(b.created_at || b.registration_date || 0) -
                new Date(a.created_at || a.registration_date || 0)
            );
            if (sorted[0].registration_date) {
                lastAdded = new Date(sorted[0].registration_date).toLocaleDateString('az-AZ');
            }
        }

        this.updateElement('totalCompaniesCount', total);
        this.updateElement('activeCompaniesCount', active);
        this.updateElement('totalEmployeesCount', totalEmployees);
        this.updateElement('lastAddedDate', lastAdded);
    }

    /**
     * ELEMENTİ YENİLƏ
     */
    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    }

    /**
     * CƏDVƏLİ RENDER ET
     */
    renderTable() {
        const container = document.getElementById('companiesTableContainer');
        if (!container) {
            console.error('❌ companiesTableContainer tapılmadı');
            return;
        }

        if (this.filteredCompanies.length === 0) {
            container.innerHTML = this.createEmptyState();
            return;
        }

        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageCompanies = this.filteredCompanies.slice(startIndex, endIndex);
        const totalPages = Math.ceil(this.filteredCompanies.length / this.itemsPerPage);

        container.innerHTML = `
            <div class="overflow-x-auto">
                <table class="w-full">
                    <thead>
                        <tr class="bg-gray-50 border-b">
                            <th class="text-left py-4 px-6 text-sm font-semibold text-gray-700">Şirkət</th>
                            <th class="text-left py-4 px-6 text-sm font-semibold text-gray-700">VOEN</th>
                            <th class="text-left py-4 px-6 text-sm font-semibold text-gray-700">İşçi</th>
                            <th class="text-left py-4 px-6 text-sm font-semibold text-gray-700">Tarix</th>
                            <th class="text-left py-4 px-6 text-sm font-semibold text-gray-700">Status</th>
                            <th class="text-left py-4 px-6 text-sm font-semibold text-gray-700">Əməliyyatlar</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${pageCompanies.map(company => this.createTableRow(company)).join('')}
                    </tbody>
                </table>
            </div>
        `;

        this.updatePaginationControls(totalPages);

        const showingStart = this.filteredCompanies.length > 0 ? startIndex + 1 : 0;
        const showingEnd = Math.min(endIndex, this.filteredCompanies.length);
        this.updateElement('showingText', `${showingStart}-${showingEnd} / ${this.filteredCompanies.length}`);

        this.attachTableEventListeners();
    }

    /**
     * CƏDVƏL SƏTRİ YARAT
     */
    createTableRow(company) {
        const statusClass = company.is_active
            ? 'bg-gradient-to-r from-green-500 to-emerald-500'
            : 'bg-gradient-to-r from-red-500 to-rose-500';
        const statusText = company.is_active ? 'Aktiv' : 'Deaktiv';
        const regDate = company.registration_date
            ? new Date(company.registration_date).toLocaleDateString('az-AZ')
            : '-';
        const employeeCount = company.total_employees || company.employee_count || 0;

        let relationshipIcon = '';
        let relationshipTooltip = '';

        if (company.relationship_type === 'parent' || company.is_parent) {
            relationshipIcon = `<i class="fa-solid fa-arrow-up text-blue-600 ml-1" title="Üst Şirkət"></i>`;
            relationshipTooltip = 'Üst Şirkət';
        } else if (company.relationship_type === 'child' || company.is_child) {
            relationshipIcon = `<i class="fa-solid fa-arrow-down text-green-600 ml-1" title="Alt Şirkət"></i>`;
            relationshipTooltip = 'Alt Şirkət';
        }

        return `
            <tr class="company-row border-b hover:bg-gray-50 transition-all duration-200" data-company-code="${company.company_code}">
                <td class="py-4 px-6">
                    <div class="flex items-center">
                        <div class="h-10 w-10 flex-shrink-0 rounded-lg bg-gradient-to-br from-brand-blue/20 to-blue-100 flex items-center justify-center mr-3">
                            <i class="fa-solid fa-building text-brand-blue"></i>
                        </div>
                        <div>
                            <div class="font-semibold text-gray-900 flex items-center">
                                ${company.company_name || company.company_code}
                                ${relationshipIcon}
                                ${relationshipTooltip ? `<span class="text-xs text-gray-400 ml-2">(${relationshipTooltip})</span>` : ''}
                            </div>
                            <div class="text-sm text-gray-500 mt-1">${company.company_code}</div>
                            ${company.address ? `
                            <div class="text-xs text-gray-400 mt-1 flex items-center">
                                <i class="fa-solid fa-location-dot mr-1"></i>
                                <span class="truncate max-w-xs">${company.address}</span>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                </td>
                <td class="py-4 px-6">
                    <div class="font-medium text-gray-900">${company.voen || '—'}</div>
                </td>
                <td class="py-4 px-6">
                    <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-100 to-blue-50 text-blue-800 border border-blue-200">
                        <i class="fa-solid fa-users mr-1.5"></i>${employeeCount}
                    </span>
                </td>
                <td class="py-4 px-6">
                    <div class="text-sm text-gray-500">
                        <i class="fa-solid fa-calendar-days mr-2"></i>${regDate}
                    </div>
                </td>
                <td class="py-4 px-6">
                    <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold text-white ${statusClass}">
                        ${statusText}
                    </span>
                </td>
                <td class="py-4 px-6">
                    <div class="flex space-x-2">
                        <button class="view-company-btn px-3 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center gap-1.5"
                                data-company-code="${company.company_code}"
                                title="Detallı baxış">
                            <i class="fa-solid fa-eye"></i>
                            <span class="hidden md:inline">Bax</span>
                        </button>
                        <button class="edit-company-btn px-3 py-2 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 flex items-center gap-1.5"
                                data-company-code="${company.company_code}"
                                title="Redaktə et">
                            <i class="fa-solid fa-edit"></i>
                            <span class="hidden md:inline">Redaktə</span>
                        </button>
                        <button class="delete-company-btn px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 flex items-center gap-1.5"
                                data-company-code="${company.company_code}"
                                title="Sil">
                            <i class="fa-solid fa-trash"></i>
                            <span class="hidden md:inline">Sil</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    /**
     * CƏDVƏL DÜYMƏLƏRİ ÜÇÜN EVENT LISTENER-LAR
     */
    attachTableEventListeners() {
        const resetBtn = document.querySelector('.reset-search-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.searchTerm = '';
                this.filterStatus = 'all';
                const searchInput = document.getElementById('companySearch');
                const filterSelect = document.getElementById('companyFilter');
                if (searchInput) searchInput.value = '';
                if (filterSelect) filterSelect.value = 'all';
                this.filterCompanies();
                this.renderTable();
            });
        }

        document.querySelectorAll('.view-company-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const companyCode = btn.dataset.companyCode;
                this.viewCompany(companyCode);
            });
        });

        document.querySelectorAll('.edit-company-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const companyCode = btn.dataset.companyCode;
                this.editCompany(companyCode);
            });
        });
    }

    /**
     * BOŞ VƏZİYYƏT ÜÇÜN HTML
     */
    createEmptyState() {
        return `
            <div class="text-center py-16">
                <div class="inline-block h-24 w-24 rounded-full bg-gray-100 flex items-center justify-center mb-6">
                    <i class="fa-solid fa-building text-3xl text-gray-400"></i>
                </div>
                <h3 class="text-xl font-semibold text-gray-700 mb-2">Şirkət tapılmadı</h3>
                <p class="text-gray-500 mb-6">Axtarış kriteriyalarınıza uyğun şirkət tapılmadı</p>
                <button class="reset-search-btn px-6 py-3 bg-brand-blue text-white rounded-xl hover:bg-blue-600 transition font-medium">
                    <i class="fa-solid fa-refresh mr-2"></i> Bütün şirkətləri göstər
                </button>
            </div>
        `;
    }

    /**
     * PAGINATION KONTROLLERLƏRİ YENİLƏ
     */
    updatePaginationControls(totalPages) {
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');

        if (prevBtn) {
            prevBtn.disabled = this.currentPage <= 1;
        }

        if (nextBtn) {
            nextBtn.disabled = this.currentPage >= totalPages || totalPages === 0;
        }
    }

    /**
     * ƏVVƏLKİ SƏHİFƏ
     */
    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.renderTable();
        }
    }

    /**
     * NÖVBƏTİ SƏHİFƏ
     */
    nextPage() {
        const totalPages = Math.ceil(this.filteredCompanies.length / this.itemsPerPage);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.renderTable();
        }
    }

    async viewCompany(companyCode) {
        try {
            console.log('🔥 viewCompany ÇAĞIRILDI!', companyCode);

            this.showLoading(true);

            let company = this.companies.find(c => c.company_code === companyCode);
            const allAsanImzas = [];

            if (this.apiService && companyCode) {
                try {
                    // 1. Şirkətin əsas məlumatları
                    const fullResponse = await this.apiService.get(`/companies/${companyCode}/full`);
                    if (fullResponse) {
                        company = { ...(company || {}), ...fullResponse };
                    }

                    // ============ ƏSAS HƏLL: Şirkətin bütün user-lərini tap ============
                    // Şirkətə aid bütün user-ləri gətir
                    let companyUsers = [];
                    try {
                        // users/company endpoint-i (əgər varsa)
                        const usersResponse = await this.apiService.get(`/users/company/${companyCode}`);
                        console.log('👥 Şirkət user cavabı:', usersResponse);

                        if (usersResponse && usersResponse.success && usersResponse.users) {
                            companyUsers = usersResponse.users;
                        } else if (Array.isArray(usersResponse)) {
                            companyUsers = usersResponse;
                        }
                    } catch (err) {
                        console.log('ℹ️ /users/company endpoint-i işləmədi, alternativ üsulla...');
                    }

                    // Əgər yuxarıda tapılmadısa, öz məlumatlarımızdan yoxla
                    if (companyUsers.length === 0 && company.employees) {
                        companyUsers = company.employees;
                    }

                    // Əgər hələ də yoxdursa, əlaqəli şirkətlər siyahısından yoxla
                    if (companyUsers.length === 0) {
                        // Bu şirkət əlaqəli şirkətdirsə, onun user məlumatlarını əldə etmək üçün
                        // birbaşa company məlumatlarından istifadə et
                        if (company.ceo_email || company.email) {
                            companyUsers.push({
                                id: company.user_id || company.id,
                                name: company.ceo_name || company.name,
                                email: company.ceo_email || company.email,
                                phone: company.ceo_phone || company.phone,
                                position: 'CEO'
                            });
                        }
                    }

                    console.log(`👥 Tapılan user sayı: ${companyUsers.length}`);

                    // ============ HƏR BİR USER-İN ASAN İMZALARINI GƏTİR ============
                    for (const user of companyUsers) {
                        const userId = user.id || user.user_id;
                        if (!userId) continue;

                        try {
                            const asanResponse = await this.apiService.get(`/asan-imza/company/${companyCode}`);
                            console.log('🏢 Şirkətin ASAN İmzaları:', asanResponse);

                            if (asanResponse && asanResponse.success && asanResponse.asan_imzalar) {
                                for (const imza of asanResponse.asan_imzalar) {
                                    allAsanImzas.push({
                                        id: imza.id,
                                        user_id: imza.user_id,
                                        user_name: imza.user_name || imza.ceo_name || 'İstifadəçi',
                                        user_email: imza.user_email,
                                        user_phone: imza.user_phone,
                                        asan_imza_number: imza.asan_imza_number,
                                        asan_id: imza.asan_id,
                                        pin1: imza.pin1,
                                        pin2: imza.pin2,
                                        puk: imza.puk,
                                        is_primary: imza.is_primary === true,
                                        is_active: imza.is_active !== false,
                                        position: imza.position
                                    });
                                }
                            }
                        } catch (err) {
                            console.log('ℹ️ ASAN İmza tapılmadı:', err.message);
                        }
                    }

                    // ============ ƏGƏR HƏÇ BİR ASAN İMZA TAPILMADIBSA, BİRBAŞA COMPANY-İ YOXLA ============
                    if (allAsanImzas.length === 0 && company.asan_imza_number) {
                        allAsanImzas.push({
                            id: 'company_direct',
                            user_id: null,
                            user_name: company.ceo_name || company.name || 'Şirkət Rəhbəri',
                            user_email: company.ceo_email,
                            user_phone: company.ceo_phone,
                            asan_imza_number: company.asan_imza_number,
                            asan_id: company.asan_id,
                            pin1: company.pin1,
                            pin2: company.pin2,
                            puk: company.puk,
                            is_primary: true,
                            is_active: true,
                            position: 'CEO / Rəhbər'
                        });
                    }

                } catch (apiError) {
                    console.error('❌ API xətası:', apiError);
                }
            }

            company.all_asan_imzalar = allAsanImzas;
            company.asan_imza_count = allAsanImzas.length;

            console.log(`✅ BÜTÜN ASAN İMZALAR (${allAsanImzas.length} ədəd):`, allAsanImzas);

            if (!company) {
                alert('❌ Şirkət tapılmadı');
                this.showLoading(false);
                return;
            }

            // BÜTÜN BÖLMƏLƏRİ GİZLƏT
            const sections = ['dashboardSection', 'profileSection', 'companiesSection', 'companyDetailsSection', 'filesSection'];
            sections.forEach(id => {
                const section = document.getElementById(id);
                if (section) section.style.display = 'none';
            });

            const detailsSection = document.getElementById('companyDetailsSection');
            if (detailsSection) detailsSection.style.display = 'block';

            const detailsContent = document.getElementById('companyDetailsContent');
            if (detailsContent) {
                detailsContent.innerHTML = this.formatCompanyDetails(company);
            }

            const backBtn = document.getElementById('backToCompaniesBtn');
            if (backBtn) {
                const newBackBtn = backBtn.cloneNode(true);
                backBtn.parentNode.replaceChild(newBackBtn, backBtn);
                newBackBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showCompaniesSection();
                });
            }

            this.showLoading(false);

        } catch (error) {
            console.error('❌ Xəta:', error);
            this.showLoading(false);
            alert('Şirkət detalları göstərilmədi: ' + error.message);
        }
    }

    formatCompanyDetails(company) {
        // ============ KÖMƏKÇİ FUNKSİYALAR ============
        const getValue = (possibleKeys, defaultValue = '—') => {
            if (!company) return defaultValue;

            for (const key of possibleKeys) {
                // Birbaşa yoxla
                const value = company[key];
                if (value !== null && value !== undefined && value !== '') {
                    return value;
                }

                // Nested obyektlərdə yoxla
                if (key.includes('.')) {
                    const parts = key.split('.');
                    let nested = company;
                    for (const part of parts) {
                        if (nested && nested[part] !== undefined) {
                            nested = nested[part];
                        } else {
                            nested = null;
                            break;
                        }
                    }
                    if (nested !== null && nested !== undefined && nested !== '') {
                        return nested;
                    }
                }
            }

            return defaultValue;
        };

        const formatValue = (value) => {
            if (value === null || value === undefined || value === '') return '—';
            return value;
        };

        const formatDate = (dateString) => {
            if (!dateString) return '—';
            try {
                const date = new Date(dateString);
                if (isNaN(date.getTime())) return '—';
                return date.toLocaleDateString('az-AZ', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            } catch {
                return '—';
            }
        };

        const formatCurrency = (value) => {
            if (!value || value === '—') return '—';
            if (isNaN(value)) return value;

            return new Intl.NumberFormat('az-AZ', {
                style: 'currency',
                currency: 'AZN',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(value);
        };

        const maskString = (str, visibleChars = 4) => {
            if (!str || str === '—' || str === '-') return str;
            if (str.length <= visibleChars) return str;
            const start = str.substring(0, visibleChars);
            const masked = '*'.repeat(Math.min(str.length - visibleChars, 8));
            return `${start}${masked}`;
        };

        // ============ BÜTÜN ASAN İMZA MƏLUMATLARINI TOPLA ============
        let allAsanImzaList = [];

        console.log('🔍 formatCompanyDetails-də company.all_asan_imzalar:', company.all_asan_imzalar);

        // Əgər viewCompany-dən all_asan_imzalar gəlibsə, birbaşa istifadə et
        if (company.all_asan_imzalar && Array.isArray(company.all_asan_imzalar) && company.all_asan_imzalar.length > 0) {
            allAsanImzaList = company.all_asan_imzalar;
            console.log(`✅ viewCompany-dən ${allAsanImzaList.length} ASAN İmza gəldi`);
        }
        // Əgər gəlməyibsə, köhnə üsulla yığ
        else {
            console.log('⚠️ company.all_asan_imzalar tapılmadı, köhnə üsulla yığılır...');

            // 1. Şirkətin birbaşa asan_imzalar massivindən
            if (company.asan_imzalar && Array.isArray(company.asan_imzalar) && company.asan_imzalar.length > 0) {
                for (const imza of company.asan_imzalar) {
                    allAsanImzaList.push({
                        ...imza,
                        user_name: company.ceo_name || company.name || 'CEO',
                        user_email: company.ceo_email,
                        user_phone: company.ceo_phone,
                        position: 'CEO / Rəhbər',
                        source: 'asan_imzalar'
                    });
                }
            }

            // 2. Şirkətin işçilərinin ASAN İmzalarından
            if (company.employees && Array.isArray(company.employees) && company.employees.length > 0) {
                for (const employee of company.employees) {
                    if (employee.asan_imzalar && Array.isArray(employee.asan_imzalar) && employee.asan_imzalar.length > 0) {
                        for (const imza of employee.asan_imzalar) {
                            allAsanImzaList.push({
                                ...imza,
                                user_name: employee.name || employee.ceo_name || employee.full_name || employee.first_name || 'İşçi',
                                user_email: employee.email || employee.ceo_email,
                                user_phone: employee.phone || employee.ceo_phone,
                                position: employee.position || employee.user_type || 'İşçi',
                                employee_id: employee.id,
                                source: 'employee_asan_imzalar'
                            });
                        }
                    }

                    // İşçinin birbaşa ASAN İmza məlumatları
                    if (employee.asan_imza_number) {
                        allAsanImzaList.push({
                            id: employee.id,
                            user_name: employee.name || employee.ceo_name || employee.full_name || 'İstifadəçi',
                            user_email: employee.email || employee.ceo_email,
                            user_phone: employee.phone || employee.ceo_phone,
                            asan_imza_number: employee.asan_imza_number,
                            asan_id: employee.asan_id,
                            pin1: employee.pin1,
                            pin2: employee.pin2,
                            puk: employee.puk,
                            is_primary: employee.is_primary === true,
                            is_active: employee.is_active !== false,
                            position: employee.position || 'İşçi',
                            employee_id: employee.id,
                            source: 'employee_direct'
                        });
                    }
                }
            }

            // 3. Şirkətin öz birbaşa məlumatlarından
            if (allAsanImzaList.length === 0 && company.asan_imza_number) {
                allAsanImzaList.push({
                    id: 'direct',
                    user_name: company.ceo_name || company.name || 'Şirkət Rəhbəri',
                    user_email: company.ceo_email,
                    user_phone: company.ceo_phone,
                    asan_imza_number: company.asan_imza_number,
                    asan_id: company.asan_id,
                    pin1: company.pin1,
                    pin2: company.pin2,
                    puk: company.puk,
                    is_primary: true,
                    is_active: company.is_active !== false,
                    position: 'CEO / Rəhbər',
                    source: 'company_direct'
                });
            }
        }

        console.log(`📊 Cəmi ${allAsanImzaList.length} ASAN İmza tapıldı`);

        // ============ ASAN İMZA HTML ============
        let asanImzaHtml = '';
        if (allAsanImzaList.length > 0) {
            asanImzaHtml = `
                <div class="space-y-3 max-h-96 overflow-y-auto pr-1">
                    <div class="bg-blue-50 rounded-lg p-2 mb-3 text-center">
                        <span class="text-sm font-semibold text-brand-blue">
                            <i class="fa-solid fa-id-card mr-1"></i> 
                            Cəmi ${allAsanImzaList.length} ASAN İmza
                        </span>
                    </div>
                    ${allAsanImzaList.map((imza, index) => `
                        <div class="border rounded-xl p-3 ${imza.is_primary ? 'bg-blue-50 border-brand-blue' : 'bg-white border-gray-200'}">
                            <div class="flex justify-between items-center mb-2 flex-wrap gap-2">
                                <div class="flex items-center gap-2 flex-wrap">
                                    <i class="fa-solid fa-id-card ${imza.is_primary ? 'text-brand-blue' : 'text-gray-400'}"></i>
                                    <span class="font-medium text-sm">${imza.user_name || 'İstifadəçi'}</span>
                                    ${imza.position ? `<span class="text-xs text-gray-500">(${imza.position})</span>` : ''}
                                    ${imza.is_primary ? '<span class="text-xs bg-brand-blue text-white px-2 py-0.5 rounded-full">⭐ Əsas</span>' : ''}
                                    ${!imza.is_active ? '<span class="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">❌ Deaktiv</span>' : ''}
                                    <span class="text-xs text-gray-400">#${index + 1}</span>
                                </div>
                                <button class="toggle-asan-detail-btn text-gray-400 hover:text-brand-blue text-sm" data-target="asan-detail-${index}">
                                    <i class="fa-solid fa-eye"></i> 
                                    <span class="text-xs">Göstər</span>
                                </button>
                            </div>
                            
                            <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                                <div>
                                    <p class="text-xs text-gray-500">ASAN İmza</p>
                                    <p class="font-mono text-sm">${maskString(imza.asan_imza_number, 4) || '-'}</p>
                                </div>
                                <div>
                                    <p class="text-xs text-gray-500">ASAN ID</p>
                                    <p class="font-mono text-sm">${maskString(imza.asan_id, 4) || '-'}</p>
                                </div>
                                <div>
                                    <p class="text-xs text-gray-500">PIN1</p>
                                    <p class="font-mono text-sm">${imza.pin1 ? '••••' : '-'}</p>
                                </div>
                                <div>
                                    <p class="text-xs text-gray-500">PIN2</p>
                                    <p class="font-mono text-sm">${imza.pin2 ? '••••' : '-'}</p>
                                </div>
                            </div>
                            
                            <div id="asan-detail-${index}" class="hidden mt-3 pt-3 border-t border-gray-200">
                                <div class="grid grid-cols-2 gap-3">
                                    <div class="col-span-2">
                                        <p class="text-xs text-gray-500">ASAN İmza (tam):</p>
                                        <p class="font-mono text-sm break-all bg-gray-100 p-2 rounded">${imza.asan_imza_number || '-'}</p>
                                    </div>
                                    <div class="col-span-2">
                                        <p class="text-xs text-gray-500">ASAN ID (tam):</p>
                                        <p class="font-mono text-sm break-all bg-gray-100 p-2 rounded">${imza.asan_id || '-'}</p>
                                    </div>
                                    <div>
                                        <p class="text-xs text-gray-500">PIN1 (tam):</p>
                                        <p class="font-mono text-lg font-bold tracking-wider bg-gray-100 p-2 rounded text-center">${imza.pin1 || '-'}</p>
                                    </div>
                                    <div>
                                        <p class="text-xs text-gray-500">PIN2 (tam):</p>
                                        <p class="font-mono text-lg font-bold tracking-wider bg-gray-100 p-2 rounded text-center">${imza.pin2 || '-'}</p>
                                    </div>
                                    <div class="col-span-2">
                                        <p class="text-xs text-gray-500">PUK (tam):</p>
                                        <p class="font-mono text-lg font-bold tracking-wider bg-gray-100 p-2 rounded text-center">${imza.puk || '-'}</p>
                                    </div>
                                    ${imza.user_email ? `<div class="col-span-2 text-xs text-gray-500"><i class="fa-regular fa-envelope mr-1"></i> ${imza.user_email}</div>` : ''}
                                    ${imza.user_phone ? `<div class="col-span-2 text-xs text-gray-500"><i class="fa-regular fa-phone mr-1"></i> ${imza.user_phone}</div>` : ''}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            asanImzaHtml = `
                <div class="text-center py-6 text-gray-400">
                    <i class="fa-solid fa-id-card text-3xl mb-2"></i>
                    <p>ASAN İmza məlumatı tapılmadı</p>
                    <p class="text-xs mt-1">Bu şirkət üçün heç bir ASAN İmza qeydiyyatdan keçməyib</p>
                </div>
            `;
        }

        // ============ ƏSAS MƏLUMATLAR ============
        const companyName = getValue(['company_name', 'name', 'companyName', 'title']);
        const companyCode = getValue(['company_code', 'code', 'companyCode']);
        const voen = getValue(['voen', 'vat_number', 'vat', 'tax_id', 'tin']);
        const isActive = company.is_active || company.isActive || company.status === 'active' || company.status === true;
        const employeeCount = getValue(['employee_count', 'total_employees', 'employees', 'employeeCount', 'totalEmployees'], 0);
        const regDate = getValue(['registration_date', 'created_at', 'createdAt', 'registered_date', 'created']);
        const address = getValue(['address', 'full_address', 'street_address', 'location']);
        const city = getValue(['city', 'region', 'district', 'area', 'city_name']);

        const industry = getValue(['industry_sector', 'activity_field', 'industry', 'sector', 'business_type']) || '—';
        const legalForm = getValue(['company_structure', 'legal_form', 'legal_type', 'legal_structure', 'company_type']) || '—';

        const phone = getValue(['phone', 'phone_number', 'contact_phone', 'telephone', 'mobile']);
        const email = getValue(['email', 'email_address', 'contact_email', 'mail']);
        const website = getValue(['company_website', 'website', 'web_site', 'web', 'url']);

        const ceoName = getValue(['ceo_name', 'ceo', 'director', 'director_name', 'responsible_person', 'contact_person', 'ceoName', 'ceo_info.ceo_name']);
        const ceoEmail = getValue(['ceo_email', 'ceoEmail', 'director_email', 'ceo_email_address', 'ceo_info.ceo_email']);
        const ceoPhone = getValue(['ceo_phone', 'ceoPhone', 'director_phone', 'ceo_phone_number', 'ceo_info.ceo_phone']);

        const capital = getValue(['capital', 'authorized_capital', 'fund', 'initial_capital', 'share_capital']) || '—';
        const turnover = getValue(['annual_turnover', 'turnover', 'revenue', 'annual_revenue']) || '—';
        const bankName = getValue(['bank_name', 'bank', 'banking_institution', 'bankName']) || '—';
        const bankAccount = getValue(['bank_account', 'account_number', 'iban', 'bankAccount']) || '—';

        const reportingYear = getValue(['reporting_year', 'fiscal_year', 'tax_year']) || new Date().getFullYear();
        const taxRate = company.tax_rate || company.taxRate || company.tax;
        const vatRegistered = company.vat_registered || company.vatRegistered || company.vat === 'yes' || company.vat === true;

        const notes = getValue(['description', 'notes', 'comment', 'remarks']);

        // ============ HTML ============
        const html = `
            <div class="p-6">
                <!-- Header -->
                <div class="flex justify-between items-center mb-6 pb-4 border-b">
                    <div class="flex items-center gap-4">
                        <div class="h-16 w-16 rounded-xl bg-gradient-to-br from-brand-blue to-blue-500 flex items-center justify-center shadow-lg">
                            <i class="fa-solid fa-building text-3xl text-white"></i>
                        </div>
                        <div>
                            <h2 class="text-2xl font-bold text-gray-900">${formatValue(companyName)}</h2>
                            <p class="text-gray-600 flex items-center gap-2 mt-1">
                                <i class="fa-solid fa-hashtag text-xs"></i>
                                ${formatValue(companyCode)}
                            </p>
                        </div>
                    </div>
                </div>
                
                <!-- Statistik kartlar -->
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div class="bg-gradient-to-br from-blue-50 to-white rounded-xl p-4 border border-blue-100">
                        <div class="text-sm text-gray-600 mb-1">Status</div>
                        <div class="flex items-center gap-2">
                            <span class="w-2 h-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-red-500'}"></span>
                            <span class="font-semibold">${isActive ? 'Aktiv' : 'Deaktiv'}</span>
                        </div>
                    </div>
                    <div class="bg-gradient-to-br from-green-50 to-white rounded-xl p-4 border border-green-100">
                        <div class="text-sm text-gray-600 mb-1">İşçi sayı</div>
                        <div class="text-xl font-bold">${formatValue(employeeCount)}</div>
                    </div>
                    <div class="bg-gradient-to-br from-purple-50 to-white rounded-xl p-4 border border-purple-100">
                        <div class="text-sm text-gray-600 mb-1">Qeydiyyat</div>
                        <div class="text-sm font-medium">${formatDate(regDate)}</div>
                    </div>
                    <div class="bg-gradient-to-br from-amber-50 to-white rounded-xl p-4 border border-amber-100">
                        <div class="text-sm text-gray-600 mb-1">VÖEN</div>
                        <div class="text-sm font-mono font-medium">${formatValue(voen)}</div>
                    </div>
                </div>
                
                <!-- Əsas məlumatlar - 3 sütunlu -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <!-- Sütun 1: Şirkət məlumatları -->
                    <div class="space-y-4">
                        <div class="bg-gray-50 rounded-xl p-4">
                            <h4 class="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                <i class="fa-solid fa-building text-brand-blue"></i>
                                Şirkət məlumatları
                            </h4>
                            <div class="space-y-2">
                                <div class="flex justify-between py-1 border-b border-gray-200">
                                    <span class="text-gray-600">Fəaliyyət sahəsi:</span>
                                    <span class="font-medium">${formatValue(industry)}</span>
                                </div>
                                <div class="flex justify-between py-1 border-b border-gray-200">
                                    <span class="text-gray-600">Hüquqi forma:</span>
                                    <span class="font-medium">${formatValue(legalForm)}</span>
                                </div>
                                <div class="flex justify-between py-1 border-b border-gray-200">
                                    <span class="text-gray-600">Ünvan:</span>
                                    <span class="font-medium text-right">${formatValue(address)}</span>
                                </div>
                                <div class="flex justify-between py-1">
                                    <span class="text-gray-600">Şəhər/Bölgə:</span>
                                    <span class="font-medium">${formatValue(city)}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="bg-gray-50 rounded-xl p-4">
                            <h4 class="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                <i class="fa-solid fa-user-tie text-brand-blue"></i>
                                Rəhbər məlumatları
                            </h4>
                            <div class="space-y-2">
                                <div class="flex justify-between py-1 border-b border-gray-200">
                                    <span class="text-gray-600">Ad:</span>
                                    <span class="font-medium">${formatValue(ceoName)}</span>
                                </div>
                                <div class="flex justify-between py-1 border-b border-gray-200">
                                    <span class="text-gray-600">Email:</span>
                                    <span class="font-medium">${formatValue(ceoEmail)}</span>
                                </div>
                                <div class="flex justify-between py-1">
                                    <span class="text-gray-600">Telefon:</span>
                                    <span class="font-medium">${formatValue(ceoPhone)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Sütun 2: Əlaqə və maliyyə -->
                    <div class="space-y-4">
                        <div class="bg-gray-50 rounded-xl p-4">
                            <h4 class="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                <i class="fa-solid fa-phone text-brand-blue"></i>
                                Əlaqə məlumatları
                            </h4>
                            <div class="space-y-2">
                                <div class="flex justify-between py-1 border-b border-gray-200">
                                    <span class="text-gray-600">Telefon:</span>
                                    <span class="font-medium">${formatValue(phone)}</span>
                                </div>
                                <div class="flex justify-between py-1 border-b border-gray-200">
                                    <span class="text-gray-600">Email:</span>
                                    <span class="font-medium">${formatValue(email)}</span>
                                </div>
                                <div class="flex justify-between py-1">
                                    <span class="text-gray-600">Vebsayt:</span>
                                    <span class="font-medium">${formatValue(website)}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="bg-gray-50 rounded-xl p-4">
                            <h4 class="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                <i class="fa-solid fa-coins text-brand-blue"></i>
                                Maliyyə məlumatları
                            </h4>
                            <div class="grid grid-cols-2 gap-2">
                                <div class="p-2">
                                    <div class="text-xs text-gray-500">Kapital</div>
                                    <div class="font-semibold">${formatCurrency(capital)}</div>
                                </div>
                                <div class="p-2">
                                    <div class="text-xs text-gray-500">Dövriyyə</div>
                                    <div class="font-semibold">${formatCurrency(turnover)}</div>
                                </div>
                                <div class="p-2">
                                    <div class="text-xs text-gray-500">Bank</div>
                                    <div class="font-semibold text-sm">${formatValue(bankName)}</div>
                                </div>
                                <div class="p-2">
                                    <div class="text-xs text-gray-500">Hesab</div>
                                    <div class="font-semibold text-sm">${formatValue(bankAccount)}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Sütun 3: ASAN İmza -->
                    <div class="space-y-4">
                        <div class="bg-gray-50 rounded-xl p-4">
                            <h4 class="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                <i class="fa-solid fa-id-card text-brand-blue"></i>
                                ASAN İmza Məlumatları
                                <span class="text-xs text-gray-400 font-normal">(${allAsanImzaList.length} ədəd)</span>
                            </h4>
                            ${asanImzaHtml}
                        </div>
                        
                        <div class="bg-gray-50 rounded-xl p-4">
                            <h4 class="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                <i class="fa-solid fa-scale-balanced text-brand-blue"></i>
                                Vergi məlumatları
                            </h4>
                            <div class="space-y-2">
                                <div class="flex justify-between py-1 border-b border-gray-200">
                                    <span class="text-gray-600">Hesabat ili:</span>
                                    <span class="font-medium">${formatValue(reportingYear)}</span>
                                </div>
                                <div class="flex justify-between py-1 border-b border-gray-200">
                                    <span class="text-gray-600">Vergi oranı:</span>
                                    <span class="font-medium">${taxRate ? taxRate + '%' : '—'}</span>
                                </div>
                                <div class="flex justify-between py-1">
                                    <span class="text-gray-600">ƏDV statusu:</span>
                                    <span class="font-medium">${vatRegistered ? 'ƏDV-li' : 'ƏDV-siz'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Qeydlər -->
                ${notes && notes !== '—' ? `
                <div class="mt-6 bg-gray-50 rounded-xl p-4">
                    <h4 class="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <i class="fa-solid fa-note-sticky text-brand-blue"></i>
                        Qeydlər
                    </h4>
                    <p class="text-gray-600">${formatValue(notes)}</p>
                </div>
                ` : ''}
                
                <!-- Tarixçə -->
                <div class="mt-6 text-sm text-gray-500 border-t pt-4">
                    <div class="flex justify-between">
                        <span>Yaradılma: ${formatDate(company.created_at || company.createdAt || company.created)}</span>
                        <span>Son yenilənmə: ${formatDate(company.updated_at || company.updatedAt || company.updated)}</span>
                    </div>
                </div>
            </div>
        `;

        // ASAN İmza toggle event listener-larını əlavə et
        setTimeout(() => {
            document.querySelectorAll('.toggle-asan-detail-btn').forEach(btn => {
                btn.removeEventListener('click', this._asanToggleHandler);
                this._asanToggleHandler = (e) => {
                    e.preventDefault();
                    const targetId = btn.dataset.target;
                    const targetDiv = document.getElementById(targetId);
                    const icon = btn.querySelector('i');
                    const textSpan = btn.querySelector('span');

                    if (targetDiv) {
                        if (targetDiv.classList.contains('hidden')) {
                            targetDiv.classList.remove('hidden');
                            if (icon) {
                                icon.classList.remove('fa-eye');
                                icon.classList.add('fa-eye-slash');
                            }
                            if (textSpan) textSpan.textContent = 'Gizlət';
                        } else {
                            targetDiv.classList.add('hidden');
                            if (icon) {
                                icon.classList.remove('fa-eye-slash');
                                icon.classList.add('fa-eye');
                            }
                            if (textSpan) textSpan.textContent = 'Göstər';
                        }
                    }
                };
                btn.addEventListener('click', this._asanToggleHandler);
            });
        }, 100);

        return html;
    }
    /**
     * ŞİRKƏTİ REDAKTƏ ET
     */
    editCompany(companyCode) {
        alert(`Redaktə: ${companyCode} (hələ hazır deyil)`);
    }

    /**
     * ŞİRKƏT KODU MODALINI YARAT
     */
    createCompanyCodeModal() {
        const modalHTML = `
            <div id="companyCodeModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style="z-index: 9999;">
                <div class="bg-white rounded-2xl w-full max-w-md mx-4 shadow-2xl">
                    <div class="px-8 py-6 border-b">
                        <div class="flex items-center justify-between">
                            <div>
                                <h3 class="text-xl font-bold text-gray-900">Mövcud Şirkəti Alt Şirkət Et</h3>
                                <p class="text-gray-600 mt-1">Şirkət kodunu daxil edin</p>
                            </div>
                            <button id="closeCompanyCodeModalBtn" class="h-10 w-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                                <i class="fa-solid fa-times text-gray-600"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="px-8 py-6">
                        <form id="companyCodeForm">
                            <div class="mb-4">
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    Şirkət Kodu <span class="text-red-500">*</span>
                                </label>
                                <input 
                                    type="text" 
                                    id="existingCompanyCode"
                                    class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-blue focus:border-transparent transition"
                                    placeholder="AZE26001"
                                    required
                                    autocomplete="off"
                                    maxlength="20"
                                >
                                <div id="companyCodeValidation" class="mt-2 text-sm min-h-[40px]"></div>
                            </div>
                            
                            <div id="companyInfoBox" class="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 hidden">
                                <div class="flex items-start">
                                    <i class="fa-solid fa-info-circle text-blue-500 mt-1 mr-3"></i>
                                    <div id="companyInfoContent">
                                        <p class="text-sm text-blue-800 font-medium">Şirkət məlumatları yüklənir...</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="flex justify-end space-x-3">
                                <button 
                                    type="button" 
                                    id="cancelCompanyCodeBtn"
                                    class="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium"
                                >
                                    Ləğv et
                                </button>
                                <button 
                                    type="submit" 
                                    id="submitCompanyCodeBtn"
                                    class="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:opacity-90 transition font-medium flex items-center"
                                    disabled
                                >
                                    <i class="fa-solid fa-link mr-2"></i>
                                    Alt Şirkət Et
                                </button>
                            </div>
                        </form>
                    </div>
                    
                    <div id="companyCodeLoading" class="hidden px-8 py-6 border-t bg-blue-50">
                        <div class="flex items-center justify-center">
                            <i class="fa-solid fa-spinner fa-spin text-brand-blue text-xl mr-3"></i>
                            <span class="text-gray-700">Şirkət yoxlanılır və əlavə edilir...</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer.firstElementChild);

        this.setupRealTimeValidation();
        this.setupCompanyCodeModalEvents();
    }

    /**
     * REAL-TIME VALİDASİYA
     */
    setupRealTimeValidation() {
        const input = document.getElementById('existingCompanyCode');
        const validationDiv = document.getElementById('companyCodeValidation');
        const submitBtn = document.getElementById('submitCompanyCodeBtn');

        if (!input) return;

        let timeoutId = null;

        input.addEventListener('input', (e) => {
            const value = e.target.value.trim().toUpperCase();
            if (submitBtn) submitBtn.disabled = true;
            if (validationDiv) validationDiv.innerHTML = '';

            if (!value) {
                validationDiv.innerHTML = '<span class="text-gray-500">Şirkət kodunu daxil edin</span>';
                return;
            }

            if (value.length < 2) {
                validationDiv.innerHTML = '<span class="text-amber-500">⚠️ Kod çox qısadır (minimum 2 simvol)</span>';
                return;
            }

            if (value.length > 20) {
                validationDiv.innerHTML = '<span class="text-amber-500">⚠️ Kod çox uzundur (maksimum 20 simvol)</span>';
                return;
            }

            const invalidChars = /[^A-Z0-9-]/;
            if (invalidChars.test(value)) {
                validationDiv.innerHTML = '<span class="text-red-500">❌ Yalnız böyük hərflər, rəqəmlər və tire (-) işarəsi istifadə edin</span>';
                return;
            }

            validationDiv.innerHTML = '<span class="text-blue-500"><i class="fa-solid fa-spinner fa-spin mr-1"></i>Şirkət məlumatları yoxlanılır...</span>';

            if (timeoutId) clearTimeout(timeoutId);

            timeoutId = setTimeout(() => {
                this.checkCompanyInfo(value);
            }, 500);
        });
    }

    async checkCompanyInfo(companyCode) {
        const validationDiv = document.getElementById('companyCodeValidation');
        const infoBox = document.getElementById('companyInfoBox');
        const infoContent = document.getElementById('companyInfoContent');
        const submitBtn = document.getElementById('submitCompanyCodeBtn');

        try {
            if (!this.apiService) {
                validationDiv.innerHTML = '<span class="text-red-500">❌ Sistem xətası: API servis tapılmadı</span>';
                if (submitBtn) submitBtn.disabled = true;
                return;
            }

            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            const userCompanyCode = userData.company_code || userData.user?.company_code;

            if (companyCode === userCompanyCode) {
                validationDiv.innerHTML = '<span class="text-red-500">❌ Öz şirkətinizi alt şirkət kimi əlavə edə bilməzsiniz</span>';
                if (infoBox) infoBox.classList.add('hidden');
                if (submitBtn) submitBtn.disabled = true;
                return;
            }

            if (this.companies && this.companies.some(c => c.company_code === companyCode)) {
                validationDiv.innerHTML = '<span class="text-red-500">❌ Bu şirkət artıq siyahınızda mövcuddur</span>';
                if (infoBox) infoBox.classList.add('hidden');
                if (submitBtn) submitBtn.disabled = true;
                return;
            }

            // Şirkət məlumatlarını yoxla
            try {
                const response = await this.apiService.get(`/companies/by-code/${companyCode}`);

                if (response) {
                    validationDiv.innerHTML = '<span class="text-green-500">✅ Şirkət tapıldı</span>';

                    if (infoBox && infoContent) {
                        infoBox.classList.remove('hidden');
                        infoContent.innerHTML = `
                            <p class="text-sm text-blue-800 font-semibold">${response.company_name || companyCode}</p>
                            <p class="text-xs text-blue-700 mt-1">🔑 Kod: ${companyCode}</p>
                            <p class="text-xs text-blue-700">📊 VÖEN: ${response.voen || '—'}</p>
                            ${response.address ? `<p class="text-xs text-blue-700">📍 Ünvan: ${response.address}</p>` : ''}
                        `;
                    }

                    if (submitBtn) submitBtn.disabled = false;
                }
            } catch (error) {
                console.log('Şirkət bazada tapılmadı, amma yenə də əlavə edilə bilər');
                validationDiv.innerHTML = `<span class="text-amber-500">⚠️ "${companyCode}" kodlu şirkət bazada tapılmadı, amma yenə də əlavə edə bilərsiniz</span>`;

                if (infoBox && infoContent) {
                    infoBox.classList.remove('hidden');
                    infoContent.innerHTML = `
                        <p class="text-sm text-amber-800 font-medium">Şirkət bazada tapılmadı</p>
                        <p class="text-xs text-amber-700 mt-1">🔑 Kod: ${companyCode}</p>
                        <p class="text-xs text-amber-700">Bu kodu yenə də alt şirkət kimi əlavə edə bilərsiniz</p>
                    `;
                }

                if (submitBtn) submitBtn.disabled = false;
            }

        } catch (error) {
            validationDiv.innerHTML = `<span class="text-amber-500">⚠️ Xəta: ${error.message}, amma yenə də əlavə edə bilərsiniz</span>`;

            if (infoBox && infoContent) {
                infoBox.classList.remove('hidden');
                infoContent.innerHTML = `
                    <p class="text-sm text-amber-800 font-medium">Xəta baş verdi</p>
                    <p class="text-xs text-amber-700 mt-1">🔑 Kod: ${companyCode}</p>
                    <p class="text-xs text-amber-700">Yenə də əlavə edə bilərsiniz</p>
                `;
            }

            if (submitBtn) submitBtn.disabled = false;
        }
    }

    /**
     * ŞİRKƏT KODU MODAL EVENT-LƏRİ
     */
    setupCompanyCodeModalEvents() {
        const modal = document.getElementById('companyCodeModal');
        const closeBtn = document.getElementById('closeCompanyCodeModalBtn');
        const cancelBtn = document.getElementById('cancelCompanyCodeBtn');
        const form = document.getElementById('companyCodeForm');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeCompanyCodeModal());
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeCompanyCodeModal());
        }

        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAddCompanyByCode();
            });
        }

        document.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeCompanyCodeModal();
            }
        });
    }

    /**
     * ŞİRKƏT KODU MODALINI AÇ
     */
    openCompanyCodeModal() {
        if (!document.getElementById('companyCodeModal')) {
            this.createCompanyCodeModal();
        }

        const modal = document.getElementById('companyCodeModal');
        if (modal) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';

            const input = document.getElementById('existingCompanyCode');
            if (input) {
                setTimeout(() => input.focus(), 100);
            }
        }
    }

    /**
     * ŞİRKƏT KODU MODALINI BAĞLA
     */
    closeCompanyCodeModal() {
        const modal = document.getElementById('companyCodeModal');
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = 'auto';

            const form = document.getElementById('companyCodeForm');
            if (form) form.reset();
        }
    }

    /**
     * ŞİRKƏT KODU İLƏ ALT ŞİRKƏT ƏLAVƏ ET
     */
    async handleAddCompanyByCode() {
        if (this.isAddingCompanyByCode) {
            console.log('⏳ Əlavə etmə prosesi davam edir, gözləyin...');
            return;
        }
        this.isAddingCompanyByCode = true;

        const loadingDiv = document.getElementById('companyCodeLoading');
        const submitBtn = document.getElementById('submitCompanyCodeBtn');
        const validationDiv = document.getElementById('companyCodeValidation');
        const infoBox = document.getElementById('companyInfoBox');

        if (loadingDiv) loadingDiv.classList.remove('hidden');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Yoxlanılır...';
        }

        try {
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            const userCompanyCode = userData.company_code || userData.user?.company_code;

            if (!userCompanyCode) {
                throw new Error('Sizin şirkət kodunuz tapılmadı. Yenidən giriş edin.');
            }

            const companyCodeInput = document.getElementById('existingCompanyCode');
            const childCompanyCode = companyCodeInput?.value.trim().toUpperCase();

            if (!childCompanyCode) {
                throw new Error('Zəhmət olmasa şirkət kodunu daxil edin');
            }

            if (childCompanyCode.length < 2) {
                throw new Error('Şirkət kodu ən azı 2 simvol olmalıdır');
            }

            if (childCompanyCode === userCompanyCode) {
                throw new Error('Öz şirkətinizi alt şirkət kimi əlavə edə bilməzsiniz');
            }

            const alreadyExists = this.companies.some(c => c.company_code === childCompanyCode);
            if (alreadyExists) {
                throw new Error(`"${childCompanyCode}" kodu artıq sizin alt şirkətlər siyahınızda mövcuddur`);
            }

            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Əlavə edilir...';
            }

            const requestData = {
                child_company_code: childCompanyCode
            };

            let addSuccess = false;
            let addMessage = '';
            let newCompany = null;

            if (this.apiService) {
                try {
                    const response = await this.apiService.post('/companies/add_existing_as_subsidiary', requestData);

                    if (response && response.success) {
                        addSuccess = true;
                        addMessage = response.message || 'Şirkət uğurla əlavə edildi';

                        if (response.child_company) {
                            newCompany = response.child_company;
                        } else {
                            newCompany = {
                                company_code: childCompanyCode,
                                company_name: childCompanyCode,
                                is_active: true,
                                registration_date: new Date().toISOString().split('T')[0],
                                employee_count: 0,
                                voen: '—',
                                relationship_type: 'child',
                                is_child: true
                            };
                        }

                        this.companies.unshift(newCompany);
                    } else {
                        addMessage = response?.detail || response?.message || 'Xəta baş verdi';
                    }
                } catch (apiError) {
                    // Xəta olsa da əlavə et
                    addSuccess = true;
                    addMessage = `"${childCompanyCode}" kodlu şirkət alt şirkət kimi əlavə edildi (lokal)`;

                    newCompany = {
                        company_code: childCompanyCode,
                        company_name: childCompanyCode,
                        is_active: true,
                        registration_date: new Date().toISOString().split('T')[0],
                        employee_count: 0,
                        voen: '—',
                        relationship_type: 'child',
                        is_child: true,
                        note: 'Lokal əlavə edildi'
                    };

                    this.companies.unshift(newCompany);
                }
            } else {
                addSuccess = true;
                addMessage = 'Şirkət əlavə edildi (API olmadan)';

                newCompany = {
                    company_code: childCompanyCode,
                    company_name: childCompanyCode,
                    is_active: true,
                    registration_date: new Date().toISOString().split('T')[0],
                    employee_count: 0,
                    voen: '—',
                    relationship_type: 'child',
                    is_child: true
                };

                this.companies.unshift(newCompany);
            }

            if (addSuccess) {
                this.filterCompanies();
                this.renderTable();
                this.calculateStatistics();
                this.closeCompanyCodeModal();
                alert(`✅ ${addMessage}`);
            } else {
                throw new Error(addMessage);
            }

        } catch (error) {
            alert(`❌ Xəta: ${error.message}`);
        } finally {
            this.isAddingCompanyByCode = false;
            if (loadingDiv) loadingDiv.classList.add('hidden');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fa-solid fa-link mr-2"></i>Alt Şirkət Et';
            }
            if (validationDiv) validationDiv.innerHTML = '';
            if (infoBox) infoBox.classList.add('hidden');
        }
    }

    /**
     * ŞİRKƏTLƏRİ EXCEL FORMATINDA EXPORT ET
     */
    async exportCompanies() {
        try {
            const exportData = this.filteredCompanies.length > 0 ? this.filteredCompanies : this.companies;

            if (exportData.length === 0) {
                alert('❌ Export üçün şirkət məlumatı yoxdur');
                return;
            }

            if (typeof XLSX === 'undefined') {
                await this.loadXLSXLibrary();
            }

            const headers = [
                'Şirkət Adı', 'Kod', 'VÖEN', 'Status', 'İşçi Sayı',
                'Qeydiyyat Tarixi', 'Ünvan', 'Email', 'Telefon',
                'Əlaqə Tipi'
            ];

            const rows = exportData.map(c => [
                c.company_name || '—',
                c.company_code || '—',
                c.voen || '—',
                c.is_active ? 'Aktiv' : 'Deaktiv',
                c.employee_count || 0,
                c.registration_date || '—',
                c.address || '—',
                c.email || '—',
                c.phone || '—',
                c.relationship_type === 'parent' ? 'Üst Şirkət' :
                c.relationship_type === 'child' ? 'Alt Şirkət' : '—'
            ]);

            const wb = this.createExcelWorkbook(headers, rows);
            const fileName = `sirket_hesabati_${this.getCurrentDateTime()}.xlsx`;
            this.downloadExcelFile(wb, fileName);

            const exportCount = exportData.length;
            const totalCount = this.companies.length;
            const filterInfo = exportCount < totalCount ? ` (${exportCount} filter edilmiş)` : '';

            alert(`✅ Şirkət hesabatı uğurla export edildi!${filterInfo}\n📁 Fayl adı: ${fileName}`);

        } catch (error) {
            console.error('❌ Export xətası:', error);
            alert('❌ Export zamanı xəta baş verdi: ' + error.message);
        }
    }

    /**
     * Excel faylı yarat
     */
    createExcelWorkbook(headers, rows) {
        if (typeof XLSX === 'undefined') {
            throw new Error('XLSX library tapılmadı');
        }

        const data = [headers, ...rows];
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(data);

        const colWidths = [
            { wch: 30 }, // Şirkət adı
            { wch: 15 }, // Kod
            { wch: 15 }, // VÖEN
            { wch: 10 }, // Status
            { wch: 10 }, // İşçi sayı
            { wch: 12 }, // Qeydiyyat tarixi
            { wch: 30 }, // Ünvan
            { wch: 25 }, // Email
            { wch: 15 }, // Telefon
            { wch: 15 }  // Əlaqə tipi
        ];
        ws['!cols'] = colWidths;

        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
            if (!ws[cellAddress]) continue;

            ws[cellAddress].s = {
                font: { bold: true, sz: 12, color: { rgb: "FFFFFF" } },
                fill: { fgColor: { rgb: "7DB6FF" } },
                alignment: { horizontal: "center", vertical: "center" }
            };
        }

        XLSX.utils.book_append_sheet(wb, ws, "Şirkət Hesabatı");

        wb.Props = {
            Title: "Şirkət Hesabatı",
            Subject: "Güvən Finans - Şirkət Məlumatları",
            Author: "Güvən Finans",
            CreatedDate: new Date()
        };

        return wb;
    }

    /**
     * Excel faylını yüklə
     */
    downloadExcelFile(wb, fileName) {
        XLSX.writeFile(wb, fileName);
    }

    /**
     * XLSX library-ni yüklə
     */
    loadXLSXLibrary() {
        return new Promise((resolve, reject) => {
            if (typeof XLSX !== 'undefined') {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js';
            script.onload = () => {
                console.log('✅ XLSX library yükləndi');
                resolve();
            };
            script.onerror = () => {
                reject(new Error('XLSX library yüklənə bilmədi'));
            };
            document.head.appendChild(script);
        });
    }

    /**
     * Cari tarix və vaxtı formatla
     */
    getCurrentDateTime() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');

        return `${year}${month}${day}_${hours}${minutes}`;
    }
}

// Global obyekt yarat
if (typeof window !== 'undefined') {
    window.CompaniesService = CompaniesService;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.companiesService = new CompaniesService();
        });
    } else {
        window.companiesService = new CompaniesService();
    }
}