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

    // DÜZƏLDİLMİŞ loadCompanies() metodu
    async loadCompanies() {
        try {
            console.log('📥 Şirkət məlumatları yüklənir...');

            let companies = [];
            let userCompanyCode = null;

            // localStorage-dən user-in şirkət kodunu al
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

            if (!userCompanyCode) {
                console.warn('⚠️ User company code tapılmadı');
                this.companies = [];
                this.filteredCompanies = [];
                return [];
            }

            if (!this.apiService) {
                console.warn('⚠️ API service tapılmadı');
                this.companies = [];
                this.filteredCompanies = [];
                return [];
            }

            // ========== 1. ALT ŞİRKƏTLƏR (sub-companies) ==========
            try {
                console.log(`🌐 API çağırışı: /companies/${userCompanyCode}/sub-companies`);
                const subResponse = await this.apiService.get(`/companies/${userCompanyCode}/sub-companies`);

                if (subResponse && subResponse.sub_companies) {
                    const subCompanies = subResponse.sub_companies.map(c => ({
                        ...c,
                        relationship_type: 'child',
                        is_child: true,
                        company_code: c.company_code || c.code,
                        company_name: c.company_name || c.name || 'Adsız şirkət'
                    }));
                    companies = [...companies, ...subCompanies];
                    console.log(`✅ ${subCompanies.length} alt şirkət yükləndi`);
                }
            } catch (subError) {
                console.log('ℹ️ Alt şirkətlər yüklənə bilmədi:', subError.message);
            }

            // ========== 2. RƏSMİ ALT ŞİRKƏTLƏR (real-subsidiaries) ==========
            try {
                console.log(`🌐 API çağırışı: /companies/${userCompanyCode}/real-subsidiaries`);
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
                    console.log(`✅ ${subsidiaryCodes.size} rəsmi alt şirkət işarələndi`);
                }
            } catch (relError) {
                console.log('ℹ️ Rəsmi alt şirkətlər yüklənə bilmədi:', relError.message);
            }

            // ========== 3. ÜST ŞİRKƏTLƏR (parent-companies) ==========
            try {
                console.log(`🌐 API çağırışı: /companies/${userCompanyCode}/parent-companies`);
                const parentResponse = await this.apiService.get(`/companies/${userCompanyCode}/parent-companies`);

                if (parentResponse && parentResponse.success && parentResponse.parent_companies) {
                    const parentCompanies = parentResponse.parent_companies.map(p => ({
                        ...p,
                        company_code: p.parent_company_code,
                        relationship_type: 'parent',
                        is_parent: true,
                        company_name: p.company_name || p.name || 'Adsız şirkət'
                    }));
                    companies = [...companies, ...parentCompanies];
                    console.log(`✅ ${parentCompanies.length} üst şirkət yükləndi`);
                }
            } catch (parentError) {
                console.log('ℹ️ Üst şirkətlər yüklənə bilmədi:', parentError.message);
            }

            // ========== ƏSAS ŞİRKƏTİ FULL ENDPOINT-İLƏ GƏTİR ==========
            // QEYD: Sadəcə şirkət məlumatları üçün ayrıca endpoint yoxdur,
            // amma /full endpoint-i var!
            try {
                console.log(`🌐 API çağırışı: /companies/${userCompanyCode}/full`);
                const fullResponse = await this.apiService.get(`/companies/${userCompanyCode}/full`);

                if (fullResponse) {
                    const mainCompany = {
                        ...fullResponse,
                        company_code: userCompanyCode,
                        relationship_type: 'main',
                        is_main: true,
                        is_active: fullResponse.is_active !== false,
                        employee_count: fullResponse.employee_count || 0
                    };
                    // Əsas şirkəti başa əlavə et (ən üstə)
                    companies.unshift(mainCompany);
                    console.log('✅ Əsas şirkət yükləndi:', mainCompany.company_name);
                }
            } catch (fullError) {
                console.log('ℹ️ Əsas şirkət məlumatları yüklənə bilmədi:', fullError.message);

                // Əgər /full işləmirsə, heç olmasa əsas şirkəti əlavə et
                companies.unshift({
                    company_code: userCompanyCode,
                    company_name: userCompanyCode,
                    relationship_type: 'main',
                    is_main: true,
                    is_active: true,
                    employee_count: 0
                });
            }

            // Təkrarlanan şirkətləri sil (eyni company_code)
            const uniqueCompanies = new Map();
            companies.forEach(company => {
                const code = company.company_code;
                if (code && !uniqueCompanies.has(code)) {
                    uniqueCompanies.set(code, company);
                }
            });
            this.companies = Array.from(uniqueCompanies.values());

            console.log(`✅ CƏMİ ${this.companies.length} şirkət yükləndi:`);
            console.log(`   - Əsas: ${this.companies.filter(c => c.is_main).length}`);
            console.log(`   - Üst: ${this.companies.filter(c => c.is_parent).length}`);
            console.log(`   - Alt: ${this.companies.filter(c => c.is_child).length}`);

            this.filteredCompanies = [...this.companies];
            this.separateCompaniesByRelationship();

            return this.companies;

        } catch (error) {
            console.error('❌ Şirkət məlumatları yüklənmədi:', error);
            this.companies = [];
            this.filteredCompanies = [];
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

    // ── YENİ viewCompany() ───────────────────────────────────────
    async viewCompany(companyCode) {
        console.log('🔥 viewCompany:', companyCode);

        // ✅ Cari baxılan şirkətin kodunu saxla (employees tab üçün)
        this.activeCode = companyCode;

        // Bütün bölmələri gizlət
        ['dashboardSection','profileSection','companiesSection','companyDetailsSection','filesSection'].forEach(id => {
            const s = document.getElementById(id);
            if (s) s.style.display = 'none';
        });

        // companyDetailsSection tap/yarat
        let sec = document.getElementById('companyDetailsSection');
        if (!sec) {
            sec = document.createElement('section');
            sec.id = 'companyDetailsSection';
            const main = document.querySelector('main .overflow-y-auto') || document.querySelector('main > div') || document.querySelector('main');
            if (main) main.appendChild(sec);
        }
        sec.style.display = 'block';
        sec.innerHTML = `
            <div style="margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
                <div>
                    <span style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#7DB6FF;">
                        <i class="fa-solid fa-building" style="margin-right:6px;"></i>Şirkət Detalları
                    </span>
                </div>
                <button id="backToCompaniesBtn"
                    style="padding:8px 18px;background:#EAF3FF;color:#7DB6FF;border:none;border-radius:10px;font-size:13px;cursor:pointer;display:flex;align-items:center;gap:6px;font-family:inherit;font-weight:500;transition:all .15s;"
                    onmouseover="this.style.background='#7DB6FF';this.style.color='#fff';"
                    onmouseout="this.style.background='#EAF3FF';this.style.color='#7DB6FF';">
                    <i class="fa-solid fa-arrow-left"></i> Geri
                </button>
            </div>
            <div id="cdpRoot" style="min-height:400px;">
                <div style="text-align:center;padding:60px;color:#9ca3af;font-size:14px;">
                    <div style="width:20px;height:20px;border:2px solid #7DB6FF;border-top-color:transparent;border-radius:50%;animation:cdpSpin .8s linear infinite;margin:0 auto 12px;"></div>
                    Məlumatlar yüklənir...
                </div>
            </div>
            <style>@keyframes cdpSpin{to{transform:rotate(360deg)}}</style>
        `;

        document.getElementById('backToCompaniesBtn').addEventListener('click', () => {
            sec.style.display = 'none';
            this.showCompaniesSection();
        });

        // Şirkəti tap
        let company = this.companies.find(c => c.company_code === companyCode) || { company_code: companyCode };

        // API-dən tam məlumatları gətir
        try {
            if (this.apiService) {
                const full = await this.apiService.get(`/companies/${companyCode}/full`);
                if (full) company = { ...company, ...full };
            }
        } catch(e) { console.warn('Full load:', e); }

        // Paneli render et
        document.getElementById('cdpRoot').innerHTML = this._cdpPanel(company, companyCode);
        this._cdpBindTabs(company, companyCode);
    }


    // ── _cdpPanel() — sinifin sonuna əlavə edin ─────────────────
    _cdpPanel(company, companyCode) {
        const c = company;
        const isActive = c.is_active !== false;
        const colors = this._cdpColor(companyCode);
        const initials = this._cdpInitials(c.company_name || companyCode);
        const f = v => (v !== null && v !== undefined && v !== '') ? v : '—';
        const regDate = c.registration_date ? new Date(c.registration_date).toLocaleDateString('az-AZ') : '—';

        return `
    <style>
    .cdp-tab{padding:10px 20px;font-size:13px;font-weight:400;color:#6b7280;background:none;border:none;border-bottom:2px solid transparent;cursor:pointer;transition:all .15s;white-space:nowrap;font-family:inherit;}
    .cdp-tab.on{color:#185FA5;border-bottom-color:#185FA5;font-weight:500;}
    .cdp-tab:hover{color:#111;}
    .cdp-row{display:flex;justify-content:space-between;align-items:flex-start;padding:9px 0;border-bottom:.5px solid #e5e7eb;font-size:13px;}
    .cdp-row:last-child{border-bottom:none;}
    .cdp-row .l{color:#6b7280;flex-shrink:0;margin-right:10px;}
    .cdp-row .r{font-weight:500;color:#111;text-align:right;word-break:break-word;max-width:55%;}
    .cdp-sec{font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;margin:18px 0 8px;}
    .cdp-box{border:.5px solid #e5e7eb;border-radius:10px;padding:0 14px;}
    .cdp-stat{background:#f9fafb;border-radius:8px;padding:12px 14px;}
    .cdp-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border:.5px solid #e5e7eb;border-radius:8px;margin-bottom:6px;}
    .cdp-ok{font-size:11px;padding:2px 9px;border-radius:10px;background:#EAF3DE;color:#3B6D11;}
    .cdp-pend{font-size:11px;padding:2px 9px;border-radius:10px;background:#FAEEDA;color:#854F0B;}
    .cdp-add{display:flex;align-items:center;gap:7px;padding:9px 14px;font-size:13px;border:.5px dashed #d1d5db;border-radius:8px;background:none;color:#6b7280;cursor:pointer;width:100%;margin-top:10px;font-family:inherit;transition:all .12s;}
    .cdp-add:hover{background:#f9fafb;color:#111;border-style:solid;}
    .cdp-empty{text-align:center;padding:32px;color:#9ca3af;font-size:13px;}
    .cdp-up{border:.5px dashed #d1d5db;border-radius:8px;padding:20px;text-align:center;margin-top:12px;cursor:pointer;}
    .cdp-up:hover{background:#f9fafb;}
    </style>
     
    <!-- Başlıq kart -->
    <div style="background:#fff;border:.5px solid #e5e7eb;border-radius:12px;padding:20px 24px;margin-bottom:14px;">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;flex-wrap:wrap;">
            <div style="width:52px;height:52px;border-radius:12px;background:${colors.bg};color:${colors.fg};display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:500;flex-shrink:0;">${initials}</div>
            <div style="flex:1;min-width:0;">
                <div style="font-size:18px;font-weight:500;color:#111;word-break:break-word;">${f(c.company_name)}</div>
                <div style="font-size:12px;color:#6b7280;margin-top:3px;">${companyCode}${c.voen ? ' · VÖEN: ' + c.voen : ''}</div>
            </div>
            <span style="font-size:12px;padding:4px 12px;border-radius:10px;background:${isActive?'#EAF3DE':'#FCEBEB'};color:${isActive?'#3B6D11':'#A32D2D'};flex-shrink:0;">${isActive?'Aktiv':'Deaktiv'}</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;">
            <div class="cdp-stat"><div style="font-size:11px;color:#6b7280;margin-bottom:4px;">İşçi sayı</div><div style="font-size:20px;font-weight:500;color:#111;">${c.employee_count||c.total_employees||0}</div></div>
            <div class="cdp-stat"><div style="font-size:11px;color:#6b7280;margin-bottom:4px;">Əlaqə növü</div><div style="font-size:13px;font-weight:500;color:#111;">${c.is_parent?'Üst şirkət':c.is_child?'Alt şirkət':'—'}</div></div>
            <div class="cdp-stat"><div style="font-size:11px;color:#6b7280;margin-bottom:4px;">Qeydiyyat</div><div style="font-size:13px;font-weight:500;color:#111;">${regDate}</div></div>
            <div class="cdp-stat"><div style="font-size:11px;color:#6b7280;margin-bottom:4px;">Sənaye</div><div style="font-size:12px;font-weight:500;color:#111;word-break:break-word;">${f(c.industry_sector||c.industry)}</div></div>
        </div>
    </div>
     
    <!-- Tab panel -->
    <div style="background:#fff;border:.5px solid #e5e7eb;border-radius:12px;overflow:hidden;">
        <div style="display:flex;border-bottom:.5px solid #e5e7eb;padding:0 8px;overflow-x:auto;" id="cdpTabBar">
            <button class="cdp-tab on" data-tab="info"><i class="fa-solid fa-circle-info" style="font-size:12px;margin-right:5px;"></i>Məlumatlar</button>
            <button class="cdp-tab" data-tab="services"><i class="fa-solid fa-handshake" style="font-size:12px;margin-right:5px;"></i>Xidmətlər</button>
            <button class="cdp-tab" data-tab="employees"><i class="fa-solid fa-users" style="font-size:12px;margin-right:5px;"></i>Əməkdaşlar</button>
            <button class="cdp-tab" data-tab="files"><i class="fa-solid fa-folder-open" style="font-size:12px;margin-right:5px;"></i>Fayllar</button>
        </div>
        <div id="cdpBody" style="padding:20px 24px;min-height:280px;"></div>
    </div>
    <div id="cdpModal"></div>
        `;
    }

    _cdpBindTabs(company, companyCode) {
        this._cdpRenderInfo(company);
        // Xidmətləri avtomatik yüklə (göstərməsə də, cache üçün)
        this._cdpRenderServices(companyCode).catch(e => console.warn('Services load:', e));

        document.querySelectorAll('.cdp-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.cdp-tab').forEach(b => b.classList.remove('on'));
                btn.classList.add('on');
                const tab = btn.dataset.tab;
                if (tab === 'info') this._cdpRenderInfo(company);
                if (tab === 'services') this._cdpRenderServices(companyCode);
                if (tab === 'employees') this._cdpRenderEmployees();
                if (tab === 'files') this._cdpRenderFiles(companyCode);
            });
        });
    }

    _cdpRenderInfo(c) {
        const f = v => (v !== null && v !== undefined && v !== '') ? v : '—';
        const row = (l,v) => `<div class="cdp-row"><span class="l">${l}</span><span class="r">${f(v)}</span></div>`;
        const sec = t => `<div class="cdp-sec">${t}</div>`;
        const box = inner => `<div class="cdp-box">${inner}</div>`;
        const body = document.getElementById('cdpBody');
        if (!body) return;
        body.innerHTML = `
    ${sec('Şirkət məlumatları')}
    ${box(row('VÖEN',c.voen)+row('Hüquqi forma',c.company_structure||c.legal_form)+row('Fəaliyyət sahəsi',c.industry_sector||c.industry)+row('Ünvan',c.address)+row('Vebsayt',c.company_website||c.website))}
    ${sec('Əlaqə')}
    ${box(row('Telefon',c.phone)+row('Email',c.email)+row('Bank',c.bank_name||c.bank)+row('Hesab',c.bank_account))}
    ${sec('Rəhbər')}
    ${box(row('Ad Soyad',c.ceo_name||''+(c.ceo_info?.ceo_name||''))+row('Email',c.ceo_email||c.ceo_info?.ceo_email)+row('Telefon',c.ceo_phone||c.ceo_info?.ceo_phone))}
    ${sec('Maliyyə')}
    ${box(row('Kapital',c.capital)+row('Dövriyyə',c.annual_turnover||c.turnover)+row('Vergi oranı',c.tax_rate?c.tax_rate+'%':null)+row('ƏDV statusu',c.vat_registered?'ƏDV-li':'ƏDV-siz'))}
        `;
    }

    async _cdpRenderServices(companyCode) {
        console.log('🔍 _cdpRenderServices çağırıldı, companyCode:', companyCode);

        const body = document.getElementById('cdpBody');
        if (!body) {
            console.error('❌ cdpBody elementi tapılmadı!');
            return;
        }

        body.innerHTML = '<div style="text-align:center;padding:40px;color:#9ca3af;font-size:13px;">Yüklənir...</div>';

        // ============ 1. ŞİRKƏT MƏLUMATLARINI YÜKLƏ ============
        let companyInfo = {};
        try {
            if (this.apiService) {
                const fullResponse = await this.apiService.get(`/companies/${companyCode}/full`);
                if (fullResponse) {
                    companyInfo = fullResponse;
                    console.log('✅ Şirkət məlumatları yükləndi:', companyInfo);
                }
            }
        } catch(e) {
            console.warn('Şirkət məlumatları yüklənə bilmədi:', e);
        }

        // ============ 2. ASAN İMZA MƏLUMATLARINI YÜKLƏ ============
        let asanImzalar = [];
        try {
            if (this.apiService) {
                console.log(`🌐 API çağırışı: /asan-imza/company/${companyCode}`);
                const res = await this.apiService.get(`/asan-imza/company/${companyCode}`);
                console.log('📦 API cavabı:', res);

                if (res && res.success && res.asan_imzalar) {
                    asanImzalar = res.asan_imzalar;
                    console.log(`✅ ${asanImzalar.length} ASAN İmza tapıldı`);
                }
            }
        } catch(e) {
            console.error('❌ ASAN İmza yükləmə xətası:', e);
        }

        // ============ 3. TELEFON VƏ EMAIL MƏLUMATLARINI AL (ceo_info-dan) ============
        const phoneValue = companyInfo.ceo_info?.ceo_phone ||
                           companyInfo.phone ||
                           companyInfo.telephone ||
                           companyInfo.contact_phone ||
                           '—';

        const emailValue = companyInfo.ceo_info?.ceo_email ||
                           companyInfo.email ||
                           companyInfo.ceo_email ||
                           '—';

        const ceoName = companyInfo.ceo_info?.ceo_name || '';
        const ceoLastname = companyInfo.ceo_info?.ceo_lastname || '';
        const ceoFullName = (ceoName + ' ' + ceoLastname).trim() || '—';

        console.log('📞 Telefon:', phoneValue);
        console.log('✉️ Email:', emailValue);
        console.log('👨‍💼 CEO:', ceoFullName);

        // ============ 4. ŞİRKƏT MƏLUMATLARI HTML ============
        const companyHtml = `
            <div style="background: white; border: 1px solid #e5e7eb; border-radius: 16px; padding: 20px; margin-bottom: 24px;">
                <h3 style="font-size: 16px; font-weight: 600; color: #1f2937; margin: 0 0 16px 0; display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-building" style="color: #185FA5;"></i> Şirkət Məlumatları
                </h3>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
                    <div style="background: #f8fafc; padding: 12px; border-radius: 12px;">
                        <div style="color: #6b7280; font-size: 11px; margin-bottom: 4px;">🏢 Şirkət adı</div>
                        <div style="font-weight: 600; color: #111; font-size: 14px;">${companyInfo.company_name || companyInfo.name || '—'}</div>
                    </div>
                    <div style="background: #f8fafc; padding: 12px; border-radius: 12px;">
                        <div style="color: #6b7280; font-size: 11px; margin-bottom: 4px;">🔑 Şirkət kodu</div>
                        <div style="font-weight: 600; color: #111; font-size: 14px;">${companyInfo.company_code || companyCode}</div>
                    </div>
                    <div style="background: #f8fafc; padding: 12px; border-radius: 12px;">
                        <div style="color: #6b7280; font-size: 11px; margin-bottom: 4px;">📊 VÖEN</div>
                        <div style="font-weight: 600; color: #111;">${companyInfo.voen || '—'}</div>
                    </div>
                    <div style="background: #f8fafc; padding: 12px; border-radius: 12px;">
                        <div style="color: #6b7280; font-size: 11px; margin-bottom: 4px;">👥 İşçi sayı</div>
                        <div style="font-weight: 600; color: #111;">${companyInfo.employee_count || companyInfo.total_employees || 0}</div>
                    </div>
                    <div style="background: #f8fafc; padding: 12px; border-radius: 12px;">
                        <div style="color: #6b7280; font-size: 11px; margin-bottom: 4px;">📞 Telefon</div>
                        <div style="font-weight: 600; color: #111; direction: ltr; font-family: monospace;">${phoneValue}</div>
                    </div>
                    <div style="background: #f8fafc; padding: 12px; border-radius: 12px;">
                        <div style="color: #6b7280; font-size: 11px; margin-bottom: 4px;">✉️ Email</div>
                        <div style="font-weight: 600; color: #111;">${emailValue}</div>
                    </div>
                    <div style="background: #f8fafc; padding: 12px; border-radius: 12px; grid-column: span 2;">
                        <div style="color: #6b7280; font-size: 11px; margin-bottom: 4px;">📍 Ünvan</div>
                        <div style="font-weight: 500; color: #111;">${companyInfo.address || companyInfo.company_address || '—'}</div>
                    </div>
                    <div style="background: #f8fafc; padding: 12px; border-radius: 12px;">
                        <div style="color: #6b7280; font-size: 11px; margin-bottom: 4px;">📅 Qeydiyyat</div>
                        <div style="font-weight: 500; color: #111;">${companyInfo.registration_date ? new Date(companyInfo.registration_date).toLocaleDateString('az-AZ') : '—'}</div>
                    </div>
                    <div style="background: #f8fafc; padding: 12px; border-radius: 12px;">
                        <div style="color: #6b7280; font-size: 11px; margin-bottom: 4px;">⭐ Status</div>
                        <div style="font-weight: 500; color: ${companyInfo.is_active !== false ? '#10b981' : '#ef4444'};">${companyInfo.is_active !== false ? '✅ Aktiv' : '❌ Deaktiv'}</div>
                    </div>
                    ${ceoFullName !== '—' ? `
                    <div style="background: #f8fafc; padding: 12px; border-radius: 12px; grid-column: span 2;">
                        <div style="color: #6b7280; font-size: 11px; margin-bottom: 4px;">👨‍💼 Rəhbər</div>
                        <div style="font-weight: 500; color: #111;">${ceoFullName}</div>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;

        // ============ 5. ASAN İMZA HTML ============
        let asanHtml = '';
        if (asanImzalar.length === 0) {
            asanHtml = `
                <div style="text-align:center;padding:40px;color:#9ca3af;">
                    <i class="fa-regular fa-file-lines" style="font-size:32px;margin-bottom:12px;display:block;"></i>
                    Hələ ASAN İmza əlavə edilməyib
                </div>
                <button id="cdpAddAsanBtn" style="width:100%;margin-top:16px;padding:14px;background:linear-gradient(135deg, #185FA5 0%, #0E3D6B 100%);color:white;border:none;border-radius:10px;cursor:pointer;font-weight:600;">
                    <i class="fa-solid fa-plus-circle"></i> Yeni ASAN İmza Əlavə Et
                </button>
            `;
        } else {
            const items = asanImzalar.map((imza, index) => {
                const isActive = imza.is_active === true;
                const statusColor = isActive ? '#10b981' : '#ef4444';
                const statusText = isActive ? 'Aktiv' : 'Deaktiv';

                return `
                    <div class="asan-imza-card" data-imza-index="${index}" style="background:white;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:12px;cursor:pointer;transition:all 0.2s;">
                        <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
                            <div style="display:flex;align-items:center;gap:8px;">
                                <i class="fa-solid fa-id-card" style="color:#185FA5;font-size:18px;"></i>
                                <span style="font-weight:600;">${imza.asan_imza_number || 'ASAN İmza'}</span>
                            </div>
                            <span style="background:${statusColor}20;color:${statusColor};padding:4px 12px;border-radius:20px;font-size:12px;">${statusText}</span>
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13px;">
                            <div><span style="color:#6b7280;">🆔 ASAN ID:</span> ${imza.asan_id || '—'}</div>
                            <div><span style="color:#6b7280;">🔐 PIN1:</span> ${imza.pin1 || '—'}</div>
                            <div><span style="color:#6b7280;">🔐 PIN2:</span> ${imza.pin2 || '—'}</div>
                            <div><span style="color:#6b7280;">🔒 PUK:</span> ${imza.puk || '—'}</div>
                        </div>
                        <div style="margin-top:10px;font-size:11px;color:#9ca3af;">
                            <i class="fa-regular fa-calendar"></i> ${imza.created_at ? new Date(imza.created_at).toLocaleDateString('az-AZ') : '-'}
                        </div>
                    </div>
                `;
            }).join('');

            asanHtml = `
                <div style="margin-bottom:16px;">
                    <h3 style="font-size:16px;font-weight:600;color:#1f2937;">📋 ASAN İmza Sertifikatları (${asanImzalar.length})</h3>
                </div>
                <div id="asanImzaList">${items}</div>
                <button id="cdpAddAsanBtn" style="width:100%;margin-top:16px;padding:14px;background:linear-gradient(135deg, #185FA5 0%, #0E3D6B 100%);color:white;border:none;border-radius:10px;cursor:pointer;font-weight:600;">
                    <i class="fa-solid fa-plus-circle"></i> Yeni ASAN İmza Əlavə Et
                </button>
                <style>
                    .asan-imza-card:hover { background:#f8fafc !important; border-color:#185FA5 !important; transform:translateX(4px); }
                </style>
            `;
        }

        // ============ 6. BİRLƏŞDİRİLMİŞ HTML ============
        body.innerHTML = companyHtml + asanHtml;

        // Klik eventləri
        document.querySelectorAll('.asan-imza-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const index = parseInt(card.dataset.imzaIndex);
                const selectedImza = asanImzalar[index];
                if (selectedImza) {
                    this._showImzaDetailsModal(selectedImza);
                }
            });
        });

        const addBtn = document.getElementById('cdpAddAsanBtn');
        if (addBtn) addBtn.addEventListener('click', () => this._cdpAsanImzaModal(companyCode));
    }



    _infoRow(label, value) {
        const displayValue = (value && value !== 'null' && value !== 'undefined') ? value : '—';
        return `
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e5e7eb;">
                <span style="font-size:12px;color:#6b7280;">${label}</span>
                <span style="font-size:12px;font-weight:500;color:#111;">${displayValue}</span>
            </div>
        `;
    }
    _cdpAsanImzaModal(companyCode) {
        const m = document.getElementById('cdpModal');
        if (!m) return;

        m.innerHTML = `
            <div style="position:fixed;inset:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;z-index:10000;" id="asanAddOverlay">
                <div style="background:#fff;border-radius:16px;width:400px;max-width:90vw;">
                    <div style="padding:20px 24px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;">
                        <h3 style="margin:0;">Yeni ASAN İmza</h3>
                        <button onclick="document.getElementById('cdpModal').innerHTML=''" style="background:none;border:none;font-size:20px;cursor:pointer;">&times;</button>
                    </div>
                    <div style="padding:20px 24px;">
                        <label style="display:block;margin-bottom:5px;font-size:12px;">Sertifikat nömrəsi *</label>
                        <input id="asanNumber" type="text" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;margin-bottom:12px;" placeholder="ASAN-2024-001">
                        
                        <label style="display:block;margin-bottom:5px;font-size:12px;">ASAN ID</label>
                        <input id="asanId" type="text" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;margin-bottom:12px;">
                        
                        <label style="display:block;margin-bottom:5px;font-size:12px;">PIN1</label>
                        <input id="pin1" type="password" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;margin-bottom:12px;">
                        
                        <label style="display:block;margin-bottom:5px;font-size:12px;">PIN2</label>
                        <input id="pin2" type="password" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;margin-bottom:12px;">
                        
                        <label style="display:block;margin-bottom:5px;font-size:12px;">PUK</label>
                        <input id="puk" type="password" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;margin-bottom:20px;">
                        
                        <div style="display:flex;gap:10px;">
                            <button onclick="document.getElementById('cdpModal').innerHTML=''" style="flex:1;padding:10px;background:#e5e7eb;border:none;border-radius:8px;">Ləğv</button>
                            <button id="saveAsanBtn" style="flex:1;padding:10px;background:#185FA5;color:white;border:none;border-radius:8px;">Əlavə Et</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('asanAddOverlay')?.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) m.innerHTML = '';
        });

        document.getElementById('saveAsanBtn')?.addEventListener('click', async () => {
            const asanNumber = document.getElementById('asanNumber')?.value.trim();
            if (!asanNumber) {
                alert('Sertifikat nömrəsi daxil edin!');
                return;
            }

            try {
                // Şirkətə aid istifadəçiləri tap
                const usersRes = await this.apiService.get(`/users/company/${companyCode}`);
                const users = usersRes?.users || (Array.isArray(usersRes) ? usersRes : []);

                if (users.length === 0) {
                    alert(`"${companyCode}" şirkətinə aid istifadəçi tapılmadı!`);
                    return;
                }

                await this.apiService.post('/asan-imza/', {
                    user_id: users[0].id,
                    asan_imza_number: asanNumber,
                    asan_id: document.getElementById('asanId')?.value.trim() || null,
                    pin1: document.getElementById('pin1')?.value.trim() || null,
                    pin2: document.getElementById('pin2')?.value.trim() || null,
                    puk: document.getElementById('puk')?.value.trim() || null,
                    is_active: true
                });

                alert('✅ ASAN İmza əlavə edildi!');
                m.innerHTML = '';
                this._cdpRenderServices(companyCode);
            } catch(e) {
                alert('Xəta: ' + (e.message || 'Əlavə edilə bilmədi'));
            }
        });
    }


    async _cdpRenderEmployees() {
        const body = document.getElementById('cdpBody');
        if (!body) return;
        
        const targetCompanyCode = this.activeCode;

        if (!targetCompanyCode) {
            body.innerHTML = '<div class="cdp-empty">Şirkət kodu tapılmadı</div>';
            return;
        }

        console.log(`👥 Əməkdaşlar yüklənir (şirkət: ${targetCompanyCode})...`);
        body.innerHTML = '<div style="text-align:center;padding:40px;">Yüklənir...</div>';

        let allUsers = [];

        try {
            if (this.apiService) {
                // 1. Şirkətin ÖZ işçiləri (company_code = targetCompanyCode)
                const ownResponse = await this.apiService.get(`/users/company/${targetCompanyCode}`);
                let ownUsers = Array.isArray(ownResponse) ? ownResponse : (ownResponse?.users || []);

                // 2. Təyin edilmiş işçilər (assigned_company_codes-da targetCompanyCode olanlar)
                const assignedResponse = await this.apiService.get(`/users/by-assigned-company/${targetCompanyCode}/users`);
                let assignedUsers = [];
                if (assignedResponse && assignedResponse.success) {
                    assignedUsers = assignedResponse.users || [];
                } else if (Array.isArray(assignedResponse)) {
                    assignedUsers = assignedResponse;
                }

                // Birləşdir və təkrarları sil
                const userMap = new Map();
                ownUsers.forEach(u => userMap.set(u.id, u));
                assignedUsers.forEach(u => {
                    if (!userMap.has(u.id)) userMap.set(u.id, { ...u, _is_assigned: true });
                });

                allUsers = Array.from(userMap.values());
                console.log(`✅ Cəmi ${allUsers.length} işçi (öz: ${ownUsers.length}, təyin: ${assignedUsers.length})`);
            }
        } catch(e) {
            console.error('❌ İşçilər yüklənərkən xəta:', e);
        }

        if (allUsers.length === 0) {
            body.innerHTML = `<div class="cdp-empty">
                <i class="fa-solid fa-users" style="font-size:26px;margin-bottom:8px;"></i>
                "${targetCompanyCode}" şirkətinə aid işçi tapılmadı
            </div>`;
            return;
        }

        // Render işçiləri...
        const colors = [['#B5D4F4','#185FA5'],['#9FE1CB','#0F6E56'],['#CECBF6','#533AB7']];
        const items = allUsers.map((user, idx) => {
            const [bg, fg] = colors[idx % colors.length];
            const fullName = [user.ceo_name, user.ceo_lastname].filter(Boolean).join(' ') || 'İstifadəçi';
            const isAssigned = user._is_assigned ? '<span style="font-size:9px;margin-left:6px;background:#EAF3DE;color:#3B6D11;padding:2px 6px;border-radius:10px;">Təyin</span>' : '';

            return `<div class="cdp-item">
                <div style="width:34px;height:34px;border-radius:50%;background:${bg};color:${fg};display:flex;align-items:center;justify-content:center;">${this._cdpInitials(fullName)}</div>
                <div style="flex:1;">
                    <div style="font-weight:500;">${fullName} ${isAssigned}</div>
                    <div style="font-size:11px;color:#6b7280;">${user.position || 'İşçi'} · ${user.ceo_email || ''}</div>
                </div>
            </div>`;
        }).join('');

        body.innerHTML = `<div class="cdp-sec">Əməkdaşlar (${allUsers.length})</div>${items}`;
    }

    async _cdpRenderFiles(companyCode) {
        const body = document.getElementById('cdpBody');
        if (!body) return;
        body.innerHTML = '<div style="text-align:center;padding:40px;color:#9ca3af;font-size:13px;">Yüklənir...</div>';

        let list = [];
        try {
            if (this.apiService) {
                const res = await this.apiService.get(`/company-files/${companyCode}`);
                const d = res && (res.data||res);
                list = d?.files || (Array.isArray(d)?d:[]);
            }
        } catch(e) { console.warn('Files:', e); }

        const extColor = name => {
            const ext = ((name||'').split('.').pop()||'').toUpperCase();
            const m = {PDF:['#F7C1C1','#A32D2D'],DOC:['#B5D4F4','#185FA5'],DOCX:['#B5D4F4','#185FA5'],XLS:['#C0DD97','#3B6D11'],XLSX:['#C0DD97','#3B6D11'],PNG:['#CECBF6','#533AB7'],JPG:['#CECBF6','#533AB7'],JPEG:['#CECBF6','#533AB7']};
            return {ext:ext||'FILE',bg:(m[ext]||['#D3D1C7','#5F5E5A'])[0],fg:(m[ext]||['#D3D1C7','#5F5E5A'])[1]};
        };
        const fmtSize = b => { if(!b)return'—'; if(b<1024)return b+'B'; if(b<1048576)return Math.round(b/1024)+'KB'; return(b/1048576).toFixed(1)+'MB'; };

        const items = list.length ? list.map(f => {
            const {ext,bg,fg} = extColor(f.file_name||f.name||f.filename);
            return `<div class="cdp-item">
                <div style="width:32px;height:32px;border-radius:8px;background:${bg};color:${fg};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:500;flex-shrink:0;">${ext}</div>
                <div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:500;color:#111;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${f.file_name||f.name||f.filename||'—'}</div><div style="font-size:11px;color:#6b7280;margin-top:1px;">${f.created_at?new Date(f.created_at).toLocaleDateString('az-AZ'):''}</div></div>
                <span style="font-size:11px;color:#6b7280;flex-shrink:0;">${fmtSize(f.file_size||f.size)}</span>
            </div>`;
        }).join('') : `<div class="cdp-empty"><i class="fa-solid fa-folder-open" style="font-size:26px;margin-bottom:8px;display:block;"></i>Hələ fayl yoxdur</div>`;

        body.innerHTML = `
    <div class="cdp-sec">Ortaq fayllar (${list.length})</div>
    ${items}
    <div class="cdp-up" id="cdpUpload"><i class="fa-solid fa-cloud-arrow-up" style="font-size:20px;color:#9ca3af;margin-bottom:6px;display:block;"></i><p style="font-size:13px;color:#6b7280;">Fayl yükləmək üçün klikləyin</p></div>
        `;
        document.getElementById('cdpUpload')?.addEventListener('click', () => this._cdpFileModal(companyCode));
    }

    _cdpServiceModal(companyCode) {
        const m = document.getElementById('cdpModal');
        if (!m) return;
        m.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;z-index:9999;" id="cdpOvr">
      <div style="background:#fff;border-radius:12px;padding:24px;width:360px;max-width:90vw;box-shadow:0 20px 60px rgba(0,0,0,.15);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
            <h4 style="font-size:15px;font-weight:500;color:#111;margin:0;">Yeni xidmət əlavə et</h4>
            <button onclick="document.getElementById('cdpModal').innerHTML=''" style="background:none;border:none;cursor:pointer;color:#9ca3af;font-size:18px;line-height:1;">&times;</button>
        </div>
        <div style="background:#FAEEDA;border-radius:8px;padding:8px 12px;margin-bottom:14px;font-size:12px;color:#854F0B;"><i class="fa-solid fa-circle-info" style="margin-right:5px;"></i>Əlavə etdikdən sonra qarşı tərəf təsdiqləməlidir</div>
        <label style="font-size:12px;font-weight:500;color:#6b7280;display:block;margin-bottom:4px;">Xidmət adı *</label>
        <input id="cdpSN" type="text" placeholder="məs. Mühasibat xidməti" style="width:100%;padding:9px 12px;font-size:13px;border:.5px solid #d1d5db;border-radius:8px;margin-bottom:10px;box-sizing:border-box;font-family:inherit;color:#111;" />
        <label style="font-size:12px;font-weight:500;color:#6b7280;display:block;margin-bottom:4px;">Dövr</label>
        <select id="cdpSP" style="width:100%;padding:9px 12px;font-size:13px;border:.5px solid #d1d5db;border-radius:8px;margin-bottom:10px;font-family:inherit;color:#111;">
            <option>Aylıq</option><option>Rüblük</option><option>İllik</option><option>Birdəfəlik</option>
        </select>
        <label style="font-size:12px;font-weight:500;color:#6b7280;display:block;margin-bottom:4px;">Başlama tarixi</label>
        <input id="cdpSD" type="date" style="width:100%;padding:9px 12px;font-size:13px;border:.5px solid #d1d5db;border-radius:8px;margin-bottom:16px;box-sizing:border-box;font-family:inherit;color:#111;" />
        <div style="display:flex;gap:8px;justify-content:flex-end;">
            <button onclick="document.getElementById('cdpModal').innerHTML=''" style="padding:9px 18px;font-size:13px;background:none;border:.5px solid #d1d5db;border-radius:8px;cursor:pointer;color:#6b7280;font-family:inherit;">Ləğv et</button>
            <button id="cdpSave" style="padding:9px 18px;font-size:13px;font-weight:500;background:#185FA5;color:#fff;border:none;border-radius:8px;cursor:pointer;font-family:inherit;"><i class="fa-solid fa-paper-plane" style="margin-right:6px;"></i>Göndər</button>
        </div>
      </div>
    </div>`;
        document.getElementById('cdpOvr').addEventListener('click', e => { if(e.target===e.currentTarget) m.innerHTML=''; });
        document.getElementById('cdpSave').addEventListener('click', async () => {
            const name = document.getElementById('cdpSN')?.value.trim();
            if (!name) { document.getElementById('cdpSN').style.borderColor='#E24B4A'; return; }
            try {
                if (this.apiService) await this.apiService.post('/services/company-service', {
                    service_name: name,
                    service_period: document.getElementById('cdpSP')?.value,
                    start_date: document.getElementById('cdpSD')?.value || null,
                    company_code: companyCode,
                    provider_company_code: this.userCompanyCode,
                });
            } catch(e) { console.warn(e); }
            m.innerHTML = '';
            this._cdpRenderServices(companyCode);
            document.querySelectorAll('.cdp-tab').forEach(b => b.classList.toggle('on', b.dataset.tab==='services'));
        });
    }

    _cdpFileModal(companyCode) {
        const m = document.getElementById('cdpModal');
        if (!m) return;
        m.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;z-index:9999;" id="cdpOvr">
      <div style="background:#fff;border-radius:12px;padding:24px;width:340px;max-width:90vw;box-shadow:0 20px 60px rgba(0,0,0,.15);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
            <h4 style="font-size:15px;font-weight:500;color:#111;margin:0;">Fayl yüklə</h4>
            <button onclick="document.getElementById('cdpModal').innerHTML=''" style="background:none;border:none;cursor:pointer;color:#9ca3af;font-size:18px;line-height:1;">&times;</button>
        </div>
        <input id="cdpFI" type="file" style="width:100%;font-size:13px;margin-bottom:16px;color:#111;" />
        <div style="display:flex;gap:8px;justify-content:flex-end;">
            <button onclick="document.getElementById('cdpModal').innerHTML=''" style="padding:9px 18px;font-size:13px;background:none;border:.5px solid #d1d5db;border-radius:8px;cursor:pointer;color:#6b7280;font-family:inherit;">Ləğv et</button>
            <button id="cdpFSave" style="padding:9px 18px;font-size:13px;font-weight:500;background:#185FA5;color:#fff;border:none;border-radius:8px;cursor:pointer;font-family:inherit;"><i class="fa-solid fa-cloud-arrow-up" style="margin-right:6px;"></i>Yüklə</button>
        </div>
      </div>
    </div>`;
        document.getElementById('cdpOvr').addEventListener('click', e => { if(e.target===e.currentTarget) m.innerHTML=''; });
        document.getElementById('cdpFSave').addEventListener('click', async () => {
            const file = document.getElementById('cdpFI')?.files?.[0];
            if (!file) return;
            if (window.fileService?.uploadFile) {
                try { await window.fileService.uploadFile(file, companyCode); } catch(e) { console.warn(e); }
            }
            m.innerHTML = '';
            this._cdpRenderFiles(companyCode);
            document.querySelectorAll('.cdp-tab').forEach(b => b.classList.toggle('on', b.dataset.tab==='files'));
        });
    }

    _cdpInitials(name) {
        if (!name) return '?';
        const w = name.trim().split(/\s+/);
        return (w.length>=2 ? w[0][0]+w[1][0] : name.substring(0,2)).toUpperCase();
    }

    _cdpColor(code) {
        const p=[['#E6F1FB','#185FA5'],['#E1F5EE','#0F6E56'],['#EEEDFE','#533AB7'],['#FAEEDA','#854F0B'],['#FAECE7','#993C1D'],['#EAF3DE','#3B6D11']];
        let h=0; for(let i=0;i<(code||'').length;i++) h=(h*31+code.charCodeAt(i))&0xFFFFFF;
        const c=p[Math.abs(h)%p.length]; return {bg:c[0],fg:c[1]};
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