// worker_profile_js/file_service/files.ui.js
/**
 * Files UI - Professional Design with Fixed Sizes
 * FIXED VERSION - Breadcrumb, geri qayıtma və axtarış filtirasiyası
 */
class FilesUI {
    // files.ui.js - constructor-da metodları bind edin

    constructor(fileService, api) {
        this.fileService = fileService;
        this.api = api || window.apiService;
        this.container = null;
        this.currentFilter = 'all';
        this.selectedItems = new Set();
        this.viewMode = 'grid';
        this.companyViewMode = 'grid';
        this.activePanel = null;
        this.companyCode = 'AZE26003';
        this.currentFolder = null;
        this.employees = [];
        this.departments = [];
        this.filteredEmployees = [];

        // Axtarış üçün dəyişənlər
        this.searchTerm = '';
        this.filteredFolders = [];
        this.filteredFiles = [];

        // Şirkətlər və Partnyorlar üçün dəyişənlər
        this.companies = [];
        this.partners = [];
        this.selectedCompany = null;
        this.selectedCompanyType = null;
        this.companySearchTerm = '';
        this.companyFilter = 'all';
        this.userCompanyCode = null;

        // Cache for folders
        this.foldersCache = new Map(); // companyCode üçün qovluqların cache-i
        this.allFolders = []; // Bütün qovluqlar
        this.allFiles = []; // Bütün fayllar

        // Metodları bind et
        this.selectCompany = this.selectCompany.bind(this);
        this.loadCompanyFiles = this.loadCompanyFiles.bind(this);
        this.renderCompaniesList = this.renderCompaniesList.bind(this);
        this.loadCompaniesAndPartners = this.loadCompaniesAndPartners.bind(this);
        this.goToCompanyFolder = this.goToCompanyFolder.bind(this);
        this.goToCompanyRoot = this.goToCompanyRoot.bind(this);
        this.getFolderPath = this.getFolderPath.bind(this);
        this.updateCompanyBreadcrumb = this.updateCompanyBreadcrumb.bind(this);
        this.setCompanyViewMode = this.setCompanyViewMode.bind(this);
        this.searchCompanyFiles = this.searchCompanyFiles.bind(this);
        this.filterItemsBySearch = this.filterItemsBySearch.bind(this);

        this.fileService.onFileChange = this.handleFileChange.bind(this);
    }

    render(containerId = 'filesContent') {
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        this.container.innerHTML = this.getLayoutHTML();
        this.attachEventListeners();
    }

    getLayoutHTML() {
        return `
            <div class="files-manager flex flex-col h-full bg-gray-50 rounded-2xl overflow-hidden" style="height: 800px;">
                <!-- Header -->
                <div class="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
                    <h2 class="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <i class="fa-solid fa-folder-open text-brand-blue"></i>
                        Fayl Meneceri
                    </h2>
                </div>

                <!-- Two Panels - Fixed Height -->
                <div class="flex flex-10 p-4 gap-4" id="mainPanels" style="height: 720px;">
                    
                    <!-- PERSONAL PANEL -->
                    <div class="flex-1 bg-white rounded-xl shadow-soft overflow-hidden border-2 border-gray-200 transition-all duration-300 hover:border-brand-blue/50 hover:shadow-lg cursor-pointer" id="personalPanel">
                        <div class="h-full flex flex-col items-center justify-center p-6 text-center">
                            <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-blue/10 to-blue-100/30 flex items-center justify-center mb-3">
                                <i class="fa-solid fa-user text-4xl text-brand-blue/50"></i>
                            </div>
                            <h3 class="text-lg font-bold text-gray-800 mb-2">Şəxsi Fayllarım</h3>
                            <p class="text-sm text-gray-500 mb-3 max-w-[200px]">Şəxsi fayllarınıza daxil olun</p>
                            <span class="px-3 py-1.5 bg-brand-blue/10 text-brand-blue rounded-full text-xs font-medium">
                                <i class="fa-solid fa-lock-open"></i> Daxil ol
                            </span>
                        </div>
                    </div>

                    <!-- COMPANY PANEL -->
                    <div class="flex-1 bg-white rounded-xl shadow-soft overflow-hidden border-2 border-gray-200 transition-all duration-300 hover:border-brand-blue/50 hover:shadow-lg cursor-pointer" id="companyPanel">
                        <div class="h-full flex flex-col items-center justify-center p-6 text-center">
                            <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/10 to-purple-100/30 flex items-center justify-center mb-3">
                                <i class="fa-solid fa-building text-4xl text-purple-500/50"></i>
                            </div>
                            <h3 class="text-lg font-bold text-gray-800 mb-2">Şirkət Faylları</h3>
                            <p class="text-sm text-gray-500 mb-3 max-w-[200px]">Komanda fayllarına daxil olun</p>
                            <span class="px-3 py-1.5 bg-purple-500/10 text-purple-500 rounded-full text-xs font-medium">
                                <i class="fa-solid fa-users"></i> Daxil ol
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Active Panel Content -->
                <div id="activePanelContent" class="hidden flex-1 flex flex-col" style="height: 720px;"></div>

                <!-- Upload Panel -->
                <div id="uploadPanel" class="hidden fixed bottom-4 right-4 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50"></div>
            </div>
        `;
    }

    // ==================== PERSONAL FAYLLAR ÜÇÜN ====================

    getPersonalPanelHTML() {
        return `
            <div class="bg-white rounded-xl shadow-soft overflow-hidden h-full flex flex-col">
                <!-- Panel Header -->
                <div class="p-3 bg-gradient-to-r from-brand-blue to-blue-600 text-white">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <button id="closePanelBtn" class="w-7 h-7 bg-white/20 rounded-lg hover:bg-white/30 flex items-center justify-center transition-colors">
                                <i class="fa-solid fa-arrow-left text-xs"></i>
                            </button>
                            <div>
                                <h3 class="text-base font-bold flex items-center gap-1">
                                    <i class="fa-solid fa-user text-sm"></i>
                                    Şəxsi Fayllarım
                                </h3>
                            </div>
                        </div>
                        <div class="flex gap-1">
                            <span class="px-2 py-0.5 bg-white/20 rounded-full text-xs" id="personalFileCount">
                                <i class="fa-solid fa-file"></i> 0
                            </span>
                            <span class="px-2 py-0.5 bg-white/20 rounded-full text-xs" id="personalFolderCount">
                                <i class="fa-solid fa-folder"></i> 0
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Toolbar -->
                <div class="p-2 border-b border-gray-200 flex items-center justify-between">
                    <div class="flex gap-1">
                        <select id="personalFilter" class="px-2 py-1 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-blue w-24">
                            <option value="all">Bütün</option>
                            <option value="images">Şəkillər</option>
                            <option value="documents">Sənədlər</option>
                            <option value="videos">Videolar</option>
                        </select>
                        <button id="newPersonalFolderBtn" class="px-2 py-1 bg-gradient-to-r from-brand-blue to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 flex items-center gap-1 text-xs">
                            <i class="fa-solid fa-folder-plus"></i>
                            <span>Yeni</span>
                        </button>
                        <button id="uploadPersonalFileBtn" class="px-2 py-1 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 flex items-center gap-1 text-xs">
                            <i class="fa-solid fa-cloud-upload-alt"></i>
                            <span>Yüklə</span>
                        </button>
                    </div>
                </div>

                <!-- Search -->
                <div class="p-2 border-b border-gray-100">
                    <div class="relative">
                        <i class="fa-solid fa-search absolute left-2 top-1.5 text-gray-400 text-xs"></i>
                        <input type="text" id="personalSearch" placeholder="Axtar (qovluq və ya fayl adı)..." class="w-full pl-7 pr-2 py-1 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-blue">
                    </div>
                </div>

                <!-- Breadcrumb -->
                <div class="px-2 py-1 bg-gray-50 border-b border-gray-200 text-xs text-gray-600 flex items-center gap-1" id="personalBreadcrumb">
                    <i class="fa-solid fa-folder-open text-brand-blue text-xs"></i>
                    <span class="font-medium">Bütün Fayllar</span>
                </div>

                <!-- Files Container -->
                <div class="flex-1 p-2 overflow-y-auto" id="personalFilesContainer" style="height: 520px;">
                    <div class="flex justify-center items-center h-full">
                        <div class="text-center">
                            <div class="inline-block p-4 bg-gradient-to-br from-brand-blue/10 to-blue-100/30 rounded-full mb-2">
                                <i class="fa-solid fa-cloud-upload-alt text-3xl text-brand-blue/50"></i>
                            </div>
                            <p class="text-xs text-gray-500">Fayllar yüklənir...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // ==================== ŞİRKƏT FAYLLARI ÜÇÜN ====================

    getCompanyLayoutHTML() {
        return `
            <div class="flex h-full bg-white rounded-xl shadow-soft overflow-hidden">
                <!-- SOL PANEL - Şirkətlər və Partnyorlar Listi -->
                <div class="w-80 bg-gray-50 border-r border-gray-200 flex flex-col">
                    <!-- Header -->
                    <div class="p-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <button id="closeCompanyPanelBtn" class="w-7 h-7 bg-white/20 rounded-lg hover:bg-white/30 flex items-center justify-center transition-colors">
                                    <i class="fa-solid fa-arrow-left text-xs"></i>
                                </button>
                                <h3 class="text-base font-bold">Şirkətlər</h3>
                            </div>
                            <button id="refreshCompaniesBtn" class="w-7 h-7 bg-white/20 rounded-lg hover:bg-white/30 flex items-center justify-center transition-colors" title="Yenilə">
                                <i class="fa-solid fa-rotate-right text-xs"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Axtarış və Filter -->
                    <div class="p-2 border-b border-gray-200">
                        <div class="relative mb-2">
                            <i class="fa-solid fa-search absolute left-2 top-2 text-gray-400 text-xs"></i>
                            <input type="text" id="companySearch" placeholder="Şirkət və ya partnyor axtar..." 
                                   class="w-full pl-7 pr-2 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500">
                        </div>
                        <select id="companyTypeFilter" class="w-full px-2 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500">
                            <option value="all">Bütün</option>
                            <option value="companies">Şirkətlər</option>
                            <option value="partners">Partnyorlar</option>
                        </select>
                    </div>

                    <!-- Companies List -->
                    <div id="companiesList" class="flex-1 overflow-y-auto p-2" style="max-height: 580px;">
                        <div class="flex justify-center items-center h-full">
                            <div class="text-center">
                                <i class="fa-solid fa-spinner fa-spin text-purple-500 text-2xl"></i>
                                <p class="text-xs text-gray-500 mt-2">Yüklənir...</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- SAĞ PANEL - Seçilmiş Şirkətin Faylları -->
                <div class="flex-1 flex flex-col bg-white" id="companyFilesPanel">
                    <!-- Seçilməyib state -->
                    <div class="flex-1 flex items-center justify-center p-6" id="noCompanySelected">
                        <div class="text-center">
                            <div class="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-purple-500/10 to-purple-100/30 flex items-center justify-center mb-3">
                                <i class="fa-solid fa-building text-4xl text-purple-500/50"></i>
                            </div>
                            <h3 class="text-lg font-bold text-gray-800 mb-2">Şirkət seçin</h3>
                            <p class="text-sm text-gray-500">Soldan bir şirkət və ya partnyor seçin</p>
                        </div>
                    </div>

                    <!-- Seçilmiş şirkətin faylları -->
                    <div id="selectedCompanyFiles" class="hidden flex-1 flex flex-col h-full">
                        <!-- Header -->
                        <div class="p-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white" id="companyHeader">
                            <div class="flex items-center justify-between">
                                <div>
                                    <h3 class="text-base font-bold" id="selectedCompanyName"></h3>
                                    <p class="text-xs text-white/80" id="selectedCompanyCode"></p>
                                </div>
                                <div class="flex gap-1">
                                    <span class="px-2 py-0.5 bg-white/20 rounded-full text-xs" id="companyFileCount">0</span>
                                    <span class="px-2 py-0.5 bg-white/20 rounded-full text-xs" id="companyFolderCount">0</span>
                                </div>
                            </div>
                        </div>

                        <!-- Toolbar -->
                        <div class="p-2 border-b border-gray-200 flex items-center justify-between">
                            <div class="flex gap-1">
                                <select id="companyFileFilter" class="px-2 py-1 text-xs bg-gray-50 border border-gray-200 rounded-lg w-24">
                                    <option value="all">Bütün</option>
                                    <option value="images">Şəkillər</option>
                                    <option value="documents">Sənədlər</option>
                                    <option value="videos">Videolar</option>
                                </select>
                                <button id="newCompanyFolderBtn" class="px-2 py-1 bg-purple-500 text-white rounded-lg text-xs">
                                    <i class="fa-solid fa-folder-plus"></i> Yeni
                                </button>
                                <button id="uploadCompanyFileBtn" class="px-2 py-1 bg-green-500 text-white rounded-lg text-xs">
                                    <i class="fa-solid fa-cloud-upload-alt"></i> Yüklə
                                </button>
                            </div>
                        </div>

                        <!-- Search -->
                        <div class="p-2 border-b border-gray-100">
                            <div class="relative">
                                <i class="fa-solid fa-search absolute left-2 top-1.5 text-gray-400 text-xs"></i>
                                <input type="text" id="companyFileSearch" placeholder="Axtar (qovluq və ya fayl adı)..." class="w-full pl-7 pr-2 py-1 text-xs bg-gray-50 border border-gray-200 rounded-lg">
                            </div>
                        </div>

                        <!-- Breadcrumb və View Düymələri - GERİ DÜYMƏSİ ƏLAVƏ EDİLDİ -->
                        <div class="px-2 py-1 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <!-- Geri qayıtma düyməsi -->
                                <button id="backButton" class="p-1 rounded-lg bg-purple-100 text-purple-600 hover:bg-purple-200 transition-colors" title="Geri qayıt">
                                    <i class="fa-solid fa-arrow-left text-xs"></i>
                                </button>
                                <div class="text-xs text-gray-600 flex items-center gap-1 flex-wrap" id="companyBreadcrumb">
                                    <i class="fa-solid fa-folder-open text-purple-500"></i>
                                    <span>Bütün Fayllar</span>
                                </div>
                            </div>
                            
                            <!-- View dəyişdirmə düymələri -->
                            <div class="flex items-center gap-1">
                                <button id="gridViewBtn" class="view-toggle-btn p-1.5 rounded-lg bg-purple-100 text-purple-600 hover:bg-purple-200 transition-colors" title="Şəbəkə görünüşü">
                                    <i class="fa-solid fa-grid-2 text-xs"></i>
                                </button>
                                <button id="listViewBtn" class="view-toggle-btn p-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors" title="Siyahı görünüşü">
                                    <i class="fa-solid fa-list text-xs"></i>
                                </button>
                            </div>
                        </div>

                        <!-- Files Container -->
                        <div class="flex-1 p-2 overflow-y-auto" id="companyFilesContainer"></div>
                    </div>
                </div>
            </div>
        `;
    }

    // ==================== EVENT LISTENERS ====================

    attachEventListeners() {
        document.getElementById('personalPanel')?.addEventListener('click', () => {
            this.activePanel = 'personal';
            this.openPersonalPanel();
        });

        document.getElementById('companyPanel')?.addEventListener('click', () => {
            this.activePanel = 'company';
            this.openCompanyPanel();
        });
    }

    // ==================== PERSONAL PANEL ====================

    async openPersonalPanel() {
        document.getElementById('mainPanels').style.display = 'none';

        const contentDiv = document.getElementById('activePanelContent');
        contentDiv.innerHTML = this.getPersonalPanelHTML();
        contentDiv.classList.remove('hidden');

        this.attachPersonalPanelListeners();
        await this.loadPersonalFiles();
    }

    attachPersonalPanelListeners() {
        document.getElementById('closePanelBtn')?.addEventListener('click', () => {
            this.closePersonalPanel();
        });

        document.getElementById('personalFilter')?.addEventListener('change', (e) => {
            this.currentFilter = e.target.value;
            this.loadPersonalFiles();
        });

        document.getElementById('newPersonalFolderBtn')?.addEventListener('click', () => {
            this.showNewFolderDialog('personal');
        });

        document.getElementById('uploadPersonalFileBtn')?.addEventListener('click', () => {
            this.showFileUploadDialog('personal');
        });

        // Axtarış üçün
        let searchTimeout;
        document.getElementById('personalSearch')?.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.searchPersonalFiles(e.target.value);
            }, 300);
        });
    }

    closePersonalPanel() {
        document.getElementById('activePanelContent').classList.add('hidden');
        document.getElementById('mainPanels').style.display = 'flex';
        this.activePanel = null;
        this.currentFolder = null;
        this.searchTerm = '';
    }

    async loadPersonalFiles() {
        const container = document.getElementById('personalFilesContainer');
        if (!container) return;

        container.innerHTML = `
            <div class="flex justify-center items-center h-full">
                <div class="text-center">
                    <i class="fa-solid fa-spinner fa-spin text-3xl text-brand-blue"></i>
                    <p class="text-xs mt-2">Fayllar yüklənir...</p>
                </div>
            </div>
        `;

        try {
            const result = await this.fileService.getUserFiles(this.currentFolder, this.currentFilter);
            console.log('📦 Personal files result:', result);

            if (result && result.success) {
                this.allFolders = result.folders || [];
                this.allFiles = result.files || [];

                // Axtarış varsa, filtirə et
                if (this.searchTerm) {
                    this.filterPersonalItems();
                } else {
                    this.displayPersonalFiles(container, this.allFolders, this.allFiles);
                }

                this.updatePersonalCounters(result);
            } else {
                container.innerHTML = this.getEmptyStateHTML('personal');
            }
        } catch (error) {
            console.error('Error loading personal files:', error);
            container.innerHTML = this.getErrorStateHTML('personal');
        }
    }

    filterPersonalItems() {
        const container = document.getElementById('personalFilesContainer');
        const term = this.searchTerm.toLowerCase();

        // Qovluqları filtrlə
        const filteredFolders = this.allFolders.filter(folder =>
            folder.name?.toLowerCase().includes(term)
        );

        // Faylları filtrlə
        const filteredFiles = this.allFiles.filter(file =>
            file.name?.toLowerCase().includes(term) ||
            file.original_filename?.toLowerCase().includes(term)
        );

        this.displayPersonalFiles(container, filteredFolders, filteredFiles);
    }

    searchPersonalFiles(term) {
        this.searchTerm = term;

        if (!term) {
            // Axtarış yoxdursa, bütün faylları göstər
            this.loadPersonalFiles();
            return;
        }

        this.filterPersonalItems();
    }

    displayPersonalFiles(container, folders, files) {
        if (folders.length === 0 && files.length === 0) {
            if (this.searchTerm) {
                container.innerHTML = `
                    <div class="flex flex-col items-center justify-center h-full py-8">
                        <div class="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-2">
                            <i class="fa-solid fa-search text-3xl text-gray-400"></i>
                        </div>
                        <h4 class="text-sm font-semibold text-gray-700 mb-1">Nəticə tapılmadı</h4>
                        <p class="text-xs text-gray-400">"${this.searchTerm}" üçün heç nə tapılmadı</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = this.getEmptyStateHTML('personal');
            return;
        }

        let html = '';

        // Qovluqlar
        if (folders.length > 0) {
            html += '<div class="mb-3"><span class="text-xs font-semibold text-gray-500">Qovluqlar</span></div>';
            html += '<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">';
            folders.forEach(item => {
                html += this.getFolderCardHTML(item, 'personal');
            });
            html += '</div>';
        }

        // Fayllar
        if (files.length > 0) {
            html += '<div class="mb-3"><span class="text-xs font-semibold text-gray-500">Fayllar</span></div>';
            html += '<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">';
            files.forEach(item => {
                html += this.getFileCardHTML(item, 'personal');
            });
            html += '</div>';
        }

        container.innerHTML = html;
        this.attachItemListeners(container, 'personal');

        // Breadcrumb yenilə
        this.updatePersonalBreadcrumb();
    }

    updatePersonalCounters(data) {
        const fileSpan = document.getElementById('personalFileCount');
        const folderSpan = document.getElementById('personalFolderCount');

        if (fileSpan) fileSpan.innerHTML = `<i class="fa-solid fa-file"></i> ${data.files?.length || 0}`;
        if (folderSpan) folderSpan.innerHTML = `<i class="fa-solid fa-folder"></i> ${data.folders?.length || 0}`;
    }

    updatePersonalBreadcrumb() {
        const nav = document.getElementById('personalBreadcrumb');
        if (!nav) return;

        if (this.currentFolder) {
            const folder = this.fileService._cache.folders?.find(f => f.id == this.currentFolder);
            if (folder) {
                nav.innerHTML = `
                    <i class="fa-solid fa-folder-open text-brand-blue text-xs"></i>
                    <a href="#" class="hover:text-brand-blue text-xs" onclick="window.filesUI.goToPersonalRoot();return false;">Bütün Fayllar</a>
                    <i class="fa-solid fa-chevron-right text-[8px] text-gray-400"></i>
                    <span class="font-medium text-xs">${folder.name}</span>
                `;
                return;
            }
        }

        nav.innerHTML = `
            <i class="fa-solid fa-folder-open text-brand-blue text-xs"></i>
            <span class="font-medium">Bütün Fayllar</span>
        `;
    }

    goToPersonalRoot() {
        this.currentFolder = null;
        this.searchTerm = '';
        const searchInput = document.getElementById('personalSearch');
        if (searchInput) searchInput.value = '';
        this.updatePersonalBreadcrumb();
        this.loadPersonalFiles();
    }

    // ==================== COMPANY PANEL ====================

    async openCompanyPanel() {
        document.getElementById('mainPanels').style.display = 'none';

        const contentDiv = document.getElementById('activePanelContent');
        contentDiv.innerHTML = this.getCompanyLayoutHTML();
        contentDiv.classList.remove('hidden');

        this.attachCompanyPanelListeners();
        await this.loadUserCompanyCode();
        await this.loadCompaniesAndPartners();
    }

    attachCompanyPanelListeners() {
        document.getElementById('closeCompanyPanelBtn')?.addEventListener('click', () => {
            this.closeCompanyPanel();
        });

        document.getElementById('companySearch')?.addEventListener('input', (e) => {
            this.companySearchTerm = e.target.value;
            this.renderCompaniesList();
        });

        document.getElementById('companyTypeFilter')?.addEventListener('change', (e) => {
            this.companyFilter = e.target.value;
            this.renderCompaniesList();
        });

        document.getElementById('refreshCompaniesBtn')?.addEventListener('click', () => {
            this.loadCompaniesAndPartners();
        });

        document.getElementById('companyFileFilter')?.addEventListener('change', (e) => {
            if (this.selectedCompany) {
                this.currentFilter = e.target.value;
                this.loadCompanyFiles(this.selectedCompany);
            }
        });

        document.getElementById('newCompanyFolderBtn')?.addEventListener('click', () => {
            if (this.selectedCompany) {
                this.showNewFolderDialog('company');
            } else {
                this.showNotification('Əvvəlcə şirkət seçin', 'warning');
            }
        });

        document.getElementById('uploadCompanyFileBtn')?.addEventListener('click', () => {
            if (this.selectedCompany) {
                this.showFileUploadDialog('company');
            } else {
                this.showNotification('Əvvəlcə şirkət seçin', 'warning');
            }
        });

        // Geri qayıtma düyməsi
        document.getElementById('backButton')?.addEventListener('click', () => {
            this.goBack();
        });

        // View dəyişdirmə düymələri
        document.getElementById('gridViewBtn')?.addEventListener('click', () => {
            this.setCompanyViewMode('grid');
        });

        document.getElementById('listViewBtn')?.addEventListener('click', () => {
            this.setCompanyViewMode('list');
        });

        // Axtarış üçün
        let searchTimeout;
        document.getElementById('companyFileSearch')?.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            this.searchTerm = e.target.value;
            searchTimeout = setTimeout(() => {
                this.searchCompanyFiles(this.searchTerm);
            }, 300);
        });
    }

    // Geri qayıtma funksiyası
    goBack() {
        console.log('⬅️ Geri qayıtma klikləndi, currentFolder:', this.currentFolder);

        if (!this.currentFolder) {
            // Artıq root-dadır, heç nə etmə
            console.log('📂 Artıq root-dadır');
            return;
        }

        // Parent qovluğu tap
        const folder = this.allFolders.find(f => f.id == this.currentFolder);
        if (folder && folder.parent_id) {
            // Parent qovluğa get
            console.log('📂 Parent qovluğa gedilir:', folder.parent_id);
            this.goToCompanyFolder(folder.parent_id);
        } else {
            // Root-a get
            console.log('📂 Root-a gedilir');
            this.goToCompanyRoot();
        }
    }

    setCompanyViewMode(mode) {
        this.companyViewMode = mode;

        // Düymə stillərini yenilə
        const gridBtn = document.getElementById('gridViewBtn');
        const listBtn = document.getElementById('listViewBtn');

        if (mode === 'grid') {
            gridBtn?.classList.add('bg-purple-100', 'text-purple-600');
            gridBtn?.classList.remove('bg-gray-100', 'text-gray-600');
            listBtn?.classList.add('bg-gray-100', 'text-gray-600');
            listBtn?.classList.remove('bg-purple-100', 'text-purple-600');
        } else {
            listBtn?.classList.add('bg-purple-100', 'text-purple-600');
            listBtn?.classList.remove('bg-gray-100', 'text-gray-600');
            gridBtn?.classList.add('bg-gray-100', 'text-gray-600');
            gridBtn?.classList.remove('bg-purple-100', 'text-purple-600');
        }

        // Mövcud faylları yenidən göstər
        if (this.selectedCompany) {
            this.loadCompanyFiles(this.selectedCompany);
        }
    }

    closeCompanyPanel() {
        document.getElementById('activePanelContent').classList.add('hidden');
        document.getElementById('mainPanels').style.display = 'flex';
        this.selectedCompany = null;
        this.currentFolder = null;
        this.searchTerm = '';
        this.companySearchTerm = '';

        // Cache-i təmizlə
        this.foldersCache.clear();
        this.allFolders = [];
        this.allFiles = [];
    }

    async loadUserCompanyCode() {
        if (this.fileService?.getUserCompanyCode) {
            this.userCompanyCode = this.fileService.getUserCompanyCode();
        } else {
            const userData = localStorage.getItem('userData');
            if (userData) {
                const parsed = JSON.parse(userData);
                this.userCompanyCode = parsed.user?.company_code || parsed.company_code || 'AZE26003';
            } else {
                this.userCompanyCode = 'AZE26003';
            }
        }
        console.log('🏢 User company code:', this.userCompanyCode);
    }

    async loadCompaniesAndPartners() {
        const companiesList = document.getElementById('companiesList');
        if (!companiesList) return;

        companiesList.innerHTML = `
            <div class="flex justify-center items-center h-full">
                <div class="text-center">
                    <i class="fa-solid fa-spinner fa-spin text-purple-500 text-2xl"></i>
                    <p class="text-xs text-gray-500 mt-2">Şirkətlər yüklənir...</p>
                </div>
            </div>
        `;

        try {
            const companyCode = this.userCompanyCode || await this.getUserCompanyCode();
            console.log('🏢 User company code:', companyCode);

            if (!companyCode) {
                throw new Error('Şirkət kodu tapılmadı');
            }

            const token = localStorage.getItem('guven_token');

            // Öz şirkəti
            const ownCompany = {
                id: 'own_' + companyCode,
                uuid: companyCode,
                name: 'Öz Şirkətim',
                code: companyCode,
                type: 'company',
                is_active: true,
                is_own: true
            };

            console.log('🏢 Öz şirkəti əlavə edilir:', ownCompany);

            // Sub-companies
            let companies = [];
            try {
                const companiesResponse = await fetch(`https://guvenfinans.az/proxy.php/api/v1/companies/${companyCode}/sub-companies`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    }
                });

                if (companiesResponse.ok) {
                    const companiesData = await companiesResponse.json();
                    console.log('📦 Companies cavabı:', companiesData);

                    if (Array.isArray(companiesData)) {
                        companies = companiesData;
                    } else if (companiesData.sub_companies && Array.isArray(companiesData.sub_companies)) {
                        companies = companiesData.sub_companies;
                    } else if (companiesData.data && Array.isArray(companiesData.data)) {
                        companies = companiesData.data;
                    }
                } else {
                    console.warn('Companies API xətası:', companiesResponse.status);
                }
            } catch (e) {
                console.warn('Companies fetch xətası:', e);
            }

            // Partners
            let partners = [];
            try {
                const partnersResponse = await fetch(`https://guvenfinans.az/proxy.php/api/v1/partners/?company_code=${companyCode}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    }
                });

                if (partnersResponse.ok) {
                    const partnersData = await partnersResponse.json();
                    console.log('📦 Partners cavabı:', partnersData);

                    if (Array.isArray(partnersData)) {
                        partners = partnersData;
                    } else if (partnersData.items && Array.isArray(partnersData.items)) {
                        partners = partnersData.items;
                    } else if (partnersData.data && Array.isArray(partnersData.data)) {
                        partners = partnersData.data;
                    } else if (partnersData.partners && Array.isArray(partnersData.partners)) {
                        partners = partnersData.partners;
                    }
                } else {
                    console.warn('Partners API xətası:', partnersResponse.status);
                }
            } catch (e) {
                console.warn('Partners fetch xətası:', e);
            }

            // Formatla
            this.companies = [
                ownCompany,
                ...companies.map(c => ({
                    id: c.uuid || c.id || `comp_${Math.random()}`,
                    uuid: c.uuid || c.id,
                    name: c.company_name || c.name || 'Adsız Şirkət',
                    code: c.company_code || c.code || '',
                    type: 'company',
                    is_active: c.is_active !== false,
                    is_own: false
                }))
            ];

            this.partners = partners
                .filter(p => p.child_company_code === companyCode)
                .map(p => ({
                    id: p.parent_company?.uuid || p.parent_company_id || `partner_${Math.random()}`,
                    uuid: p.parent_company?.uuid || p.parent_company_id,
                    name: p.parent_company?.company_name || p.parent_company_name || 'Adsız Partnyor',
                    code: p.parent_company_code || '',
                    type: 'partner',
                    is_active: p.status !== 'deactivated'
                }));

            console.log('✅ Şirkətlər:', this.companies);
            console.log('✅ Partnyorlar:', this.partners);

            this.renderCompaniesList();

        } catch (error) {
            console.error('❌ loadCompaniesAndPartners xətası:', error);

            const companyCode = this.userCompanyCode || 'AZE26003';

            this.companies = [
                {
                    id: 'own_' + companyCode,
                    uuid: companyCode,
                    name: 'Öz Şirkətim',
                    code: companyCode,
                    type: 'company',
                    is_own: true
                }
            ];
            this.partners = [];
            this.renderCompaniesList();

            companiesList.innerHTML = `
                <div class="text-center py-4">
                    <i class="fa-solid fa-exclamation-triangle text-yellow-500 text-2xl mb-2"></i>
                    <p class="text-xs text-gray-500">Məlumatlar yüklənə bilmədi</p>
                    <button class="mt-2 px-3 py-1 bg-purple-500 text-white rounded-lg text-xs" onclick="window.filesUI.loadCompaniesAndPartners()">
                        <i class="fa-solid fa-rotate-right"></i> Yenidən
                    </button>
                </div>
            `;
        }
    }

    renderCompaniesList() {
        const container = document.getElementById('companiesList');
        if (!container) return;

        let allItems = [...this.companies, ...this.partners];
        console.log('📋 Göstəriləcək itemlər:', allItems);

        if (this.companySearchTerm) {
            const term = this.companySearchTerm.toLowerCase();
            allItems = allItems.filter(i =>
                i.name?.toLowerCase().includes(term) ||
                i.code?.toLowerCase().includes(term)
            );
        }

        if (this.companyFilter === 'companies') {
            allItems = allItems.filter(i => i.type === 'company');
        } else if (this.companyFilter === 'partners') {
            allItems = allItems.filter(i => i.type === 'partner');
        }

        if (!allItems.length) {
            container.innerHTML = '<div class="text-center py-8 text-gray-500 text-xs">Nəticə tapılmadı</div>';
            return;
        }

        let html = '';
        allItems.forEach(item => {
            const isPartner = item.type === 'partner';
            const isOwn = item.is_own || item.code === this.userCompanyCode;
            const isSelected = this.selectedCompany?.id === item.id;

            let bgClass = 'hover:bg-purple-50';
            let iconBgClass = isPartner ? 'bg-green-100' : 'bg-purple-100';
            let iconClass = isPartner ? 'text-green-600' : 'text-purple-600';

            if (isOwn) {
                bgClass = 'hover:bg-blue-50';
                iconBgClass = 'bg-blue-100';
                iconClass = 'text-blue-600';
            }

            html += `
                <div class="company-item p-2 rounded-lg cursor-pointer transition-all ${bgClass} border ${isSelected ? 'bg-purple-50 border-purple-300' : 'border-transparent'} mb-1"
                     data-id="${item.id}" data-uuid="${item.uuid || item.id}" data-type="${item.type}" data-code="${item.code || ''}" data-name="${item.name}" data-own="${isOwn}">
                    <div class="flex items-center gap-2">
                        <div class="h-8 w-8 rounded-lg ${iconBgClass} flex items-center justify-center flex-shrink-0">
                            <i class="fa-solid ${isPartner ? 'fa-handshake' : 'fa-building'} ${iconClass}"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-1">
                                <span class="text-xs font-medium truncate ${isOwn ? 'text-blue-700' : ''}">${item.name}</span>
                                ${isOwn ? '<span class="text-[8px] bg-blue-100 text-blue-700 px-1 rounded whitespace-nowrap">Sizin</span>' : ''}
                            </div>
                            <p class="text-[9px] text-gray-500">${item.code || ''}</p>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

        container.querySelectorAll('.company-item').forEach(el => {
            el.addEventListener('click', (e) => {
                const company = {
                    id: el.dataset.id,
                    uuid: el.dataset.uuid,
                    type: el.dataset.type,
                    name: el.dataset.name,
                    code: el.dataset.code,
                    is_own: el.dataset.own === 'true'
                };
                console.log('🖱️ Şirkət seçildi:', company);
                this.selectCompany(company);
            });
        });
    }

    async selectCompany(company) {
        console.log('🎯 selectCompany:', company);

        try {
            this.selectedCompany = company;
            this.selectedCompanyType = company.type;
            this.currentFolder = null;
            this.searchTerm = '';

            // Axtarış inputunu təmizlə
            const searchInput = document.getElementById('companyFileSearch');
            if (searchInput) searchInput.value = '';

            // Cache-i təmizlə
            this.foldersCache.delete(company.code);
            this.allFolders = [];
            this.allFiles = [];

            console.log('✅ Seçilmiş şirkət:', this.selectedCompany);
            console.log('✅ Seçilmiş şirkət kodu:', this.selectedCompany.code);

            document.getElementById('noCompanySelected')?.classList.add('hidden');
            document.getElementById('selectedCompanyFiles')?.classList.remove('hidden');

            document.getElementById('selectedCompanyName').textContent = company.name;
            document.getElementById('selectedCompanyCode').textContent = company.code || '';

            await this.loadCompanyFiles(company);

        } catch (error) {
            console.error('❌ selectCompany xətası:', error);
            this.showNotification('Şirkət seçilə bilmədi', 'error');
        }
    }

    async loadCompanyFiles(company) {
        const container = document.getElementById('companyFilesContainer');
        if (!container) return;

        console.log('📂 loadCompanyFiles çağırıldı:', company);

        container.innerHTML = `
            <div class="flex justify-center items-center h-full">
                <div class="text-center">
                    <i class="fa-solid fa-spinner fa-spin text-purple-500 text-2xl"></i>
                    <p class="text-xs mt-2">Fayllar yüklənir...</p>
                </div>
            </div>
        `;

        try {
            let companyService = window.companyFolderService;
            if (!companyService) {
                if (window.CompanyFolderService) {
                    companyService = new window.CompanyFolderService();
                    window.companyFolderService = companyService;
                }
            }

            if (companyService && companyService.loadUserPermissions) {
                await companyService.loadUserPermissions(company.code);
            }

            let folders = [];
            let files = [];

            if (companyService) {
                const foldersResult = await companyService.getFolders(
                    company.code,
                    this.currentFolder
                );

                if (foldersResult.success) {
                    folders = foldersResult.data;
                    console.log(`📁 ${folders.length} qovluq tapıldı`);

                    // Qovluqları cache-ə sal
                    if (!this.foldersCache.has(company.code)) {
                        this.foldersCache.set(company.code, []);
                    }

                    // Bütün qovluqları əlavə et
                    const allFolders = this.foldersCache.get(company.code) || [];
                    folders.forEach(f => {
                        const existingIndex = allFolders.findIndex(ef => ef.id == f.id);
                        if (existingIndex >= 0) {
                            allFolders[existingIndex] = f;
                        } else {
                            allFolders.push(f);
                        }
                    });
                    this.foldersCache.set(company.code, allFolders);

                    // Cari qovluqdakı qovluqları saxla
                    this.allFolders = folders;
                }

                const filesResult = await companyService.getFiles(
                    company.code,
                    this.currentFolder
                );

                if (filesResult.success) {
                    files = filesResult.data;
                    console.log(`📄 ${files.length} fayl tapıldı`);

                    // Cari qovluqdakı faylları saxla
                    this.allFiles = files;
                }
            }

            document.getElementById('companyFileCount').innerHTML = `<i class="fa-solid fa-file"></i> ${files.length}`;
            document.getElementById('companyFolderCount').innerHTML = `<i class="fa-solid fa-folder"></i> ${folders.length}`;

            // Axtarış varsa, filtirə et
            if (this.searchTerm) {
                this.filterItemsBySearch();
            } else {
                this.displayCompanyItems(folders, files);
            }

            // Breadcrumb yenilə
            await this.updateCompanyBreadcrumb(this.currentFolder);

        } catch (error) {
            console.error('❌ loadCompanyFiles xətası:', error);
            container.innerHTML = this.getCompanyErrorStateHTML();
        }
    }

    // Axtarış filtirasiyası
    filterItemsBySearch() {
        const term = this.searchTerm.toLowerCase();

        // Qovluqları filtrlə
        const filteredFolders = this.allFolders.filter(folder =>
            folder.name?.toLowerCase().includes(term)
        );

        // Faylları filtrlə
        const filteredFiles = this.allFiles.filter(file =>
            file.name?.toLowerCase().includes(term) ||
            file.original_filename?.toLowerCase().includes(term) ||
            file.file_extension?.toLowerCase().includes(term)
        );

        this.displayCompanyItems(filteredFolders, filteredFiles);
    }

    searchCompanyFiles(term) {
        this.searchTerm = term;

        if (!term) {
            // Axtarış yoxdursa, bütün faylları göstər
            this.loadCompanyFiles(this.selectedCompany);
            return;
        }

        this.filterItemsBySearch();
    }

    displayCompanyItems(folders, files) {
        const container = document.getElementById('companyFilesContainer');
        if (!container) return;

        if (folders.length === 0 && files.length === 0) {
            if (this.searchTerm) {
                container.innerHTML = this.getSearchEmptyHTML();
                return;
            }
            container.innerHTML = this.getCompanyEmptyStateHTML();
            return;
        }

        let html = '';
        const isAdmin = this._checkIfAdmin();

        // 🔧 DƏYİŞİKLİK: Admin deyilsə belə, can_view yoxlamasını SİL
        if (this.companyViewMode === 'list') {
            if (folders.length > 0) {
                html += '<div class="mb-3"><span class="text-xs font-semibold text-gray-500">Qovluqlar</span></div>';
                folders.forEach(item => {
                    // 🔧 BURADAKİ YOXLAMANI SİL
                    html += this.getCompanyFolderListHTML(item);
                });
            }

            if (files.length > 0) {
                if (folders.length > 0) html += '<div class="mt-4 mb-3"><span class="text-xs font-semibold text-gray-500">Fayllar</span></div>';
                files.forEach(item => {
                    html += this.getCompanyFileListHTML(item);
                });
            }
        } else {
            if (folders.length > 0) {
                html += '<div class="mb-3"><span class="text-xs font-semibold text-gray-500">Qovluqlar</span></div>';
                html += '<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">';
                folders.forEach(item => {
                    // 🔧 BURADAKİ YOXLAMANI SİL
                    html += this.getCompanyFolderCardHTML(item);
                });
                html += '</div>';
            }

            if (files.length > 0) {
                html += '<div class="mb-3"><span class="text-xs font-semibold text-gray-500">Fayllar</span></div>';
                html += '<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">';
                files.forEach(item => {
                    html += this.getCompanyFileCardHTML(item);
                });
                html += '</div>';
            }
        }

        container.innerHTML = html;

        let companyService = window.companyFolderService;
        this.attachCompanyItemListeners(container, companyService, this.selectedCompany?.code);
    }

    // ==================== BREADCRUMB METODLARI ====================
    async updateCompanyBreadcrumb(folderId) {
        const nav = document.getElementById('companyBreadcrumb');
        if (!nav || !this.selectedCompany) return;

        console.log('🍞 Breadcrumb yenilənir, folderId:', folderId);

        try {
            let breadcrumbHtml = '<i class="fa-solid fa-folder-open text-purple-500 text-xs mr-1"></i>';

            if (!folderId) {
                // Root səviyyə
                breadcrumbHtml += '<span class="font-medium text-xs">Bütün Fayllar</span>';
            } else {
                // Root link
                breadcrumbHtml += `
                    <a href="#" class="hover:text-purple-500 text-xs breadcrumb-link" data-folder-id="">Bütün Fayllar</a>
                    <i class="fa-solid fa-chevron-right text-[8px] text-gray-400 mx-1"></i>
                `;

                // Folder path-i tap
                const folderPath = await this.getFolderPath(folderId);
                console.log('📂 Folder path:', folderPath);

                if (folderPath && folderPath.length > 0) {
                    // Path-dəki hər bir qovluğu əlavə et
                    folderPath.forEach((folder, index) => {
                        if (index === folderPath.length - 1) {
                            // Sonuncu qovluq (cari) - link deyil
                            breadcrumbHtml += `<span class="font-medium text-xs">${this.escapeHtml(folder.name)}</span>`;
                        } else {
                            // Parent qovluqlar - link olsun
                            breadcrumbHtml += `
                                <a href="#" class="hover:text-purple-500 text-xs breadcrumb-link" data-folder-id="${folder.id}">${this.escapeHtml(folder.name)}</a>
                                <i class="fa-solid fa-chevron-right text-[8px] text-gray-400 mx-1"></i>
                            `;
                        }
                    });
                } else {
                    // Path tapılmadısa, sadəcə ID-ni göstər
                    breadcrumbHtml += `<span class="font-medium text-xs">Qovluq #${folderId}</span>`;
                }
            }

            nav.innerHTML = breadcrumbHtml;

            // Breadcrumb linklərinə event listener əlavə et
            nav.querySelectorAll('.breadcrumb-link').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const targetFolderId = link.dataset.folderId;
                    console.log('🍞 Breadcrumb klik:', targetFolderId);

                    if (targetFolderId === '') {
                        this.goToCompanyRoot();
                    } else {
                        this.goToCompanyFolder(targetFolderId);
                    }
                });
            });

        } catch (error) {
            console.error('❌ Breadcrumb xətası:', error);
            // Fallback
            nav.innerHTML = `
                <i class="fa-solid fa-folder-open text-purple-500 text-xs mr-1"></i>
                <a href="#" class="hover:text-purple-500 text-xs" onclick="window.filesUI.goToCompanyRoot();return false;">Bütün Fayllar</a>
            `;
        }
    }

    async getFolderPath(folderId) {
        if (!folderId || !this.selectedCompany) return [];

        console.log('🔍 Folder path axtarılır ID:', folderId);

        try {
            // Cache-dən qovluqları götür
            let allFolders = this.foldersCache.get(this.selectedCompany.code) || [];

            // Əgər cache boşdursa, yüklə
            if (allFolders.length === 0) {
                const companyService = window.companyFolderService;
                if (companyService) {
                    const result = await companyService.getFolders(this.selectedCompany.code, null);
                    if (result.success) {
                        allFolders = result.data;
                        this.foldersCache.set(this.selectedCompany.code, allFolders);
                    }
                }
            }

            console.log(`📚 Cache-də ${allFolders.length} qovluq var`);

            // Folder path-i qur
            const path = [];
            let currentId = folderId;
            let maxDepth = 10;

            while (currentId && maxDepth > 0) {
                const folder = allFolders.find(f => f.id == currentId);

                if (!folder) {
                    console.log(`⚠️ Folder tapılmadı ID: ${currentId}`);
                    break;
                }

                console.log(`📁 Tapıldı: ${folder.name} (ID: ${folder.id}, parent: ${folder.parent_id})`);

                path.unshift(folder);
                currentId = folder.parent_id;
                maxDepth--;
            }

            console.log('📂 Tam path:', path.map(f => f.name).join(' → '));
            return path;

        } catch (error) {
            console.error('❌ getFolderPath xətası:', error);
            return [];
        }
    }

    goToCompanyFolder(folderId) {
        if (!this.selectedCompany) return;

        console.log('📂 Gedilən qovluq ID:', folderId);

        // Axtarışı təmizlə
        this.searchTerm = '';
        const searchInput = document.getElementById('companyFileSearch');
        if (searchInput) searchInput.value = '';

        this.currentFolder = folderId;
        this.updateCompanyBreadcrumb(folderId);
        this.loadCompanyFiles(this.selectedCompany);
    }

    goToCompanyRoot() {
        console.log('🏠 Root-a qayıdılır');

        // Axtarışı təmizlə
        this.searchTerm = '';
        const searchInput = document.getElementById('companyFileSearch');
        if (searchInput) searchInput.value = '';

        this.currentFolder = null;
        this.updateCompanyBreadcrumb(null);
        this.loadCompanyFiles(this.selectedCompany);
    }

    async loadCompanyFolders(companyCode) {
        try {
            const companyService = window.companyFolderService;
            if (!companyService) return;

            const result = await companyService.getFolders(
                companyCode,
                this.currentFolder
            );

            if (result.success) {
                console.log(`📁 ${result.data.length} qovluq yeniləndi`);
                return result.data;
            }
        } catch (error) {
            console.error('❌ loadCompanyFolders xətası:', error);
        }
        return [];
    }

    async showNewFolderDialog(panelType) {
        const name = prompt('Yeni qovluq adını daxil edin:');
        if (!name || !name.trim()) return;

        try {
            if (panelType === 'company' && this.selectedCompany) {
                console.log('🏢 Şirkət qovluğu yaradılır:', {
                    name: name.trim(),
                    companyCode: this.selectedCompany.code,
                    parentId: this.currentFolder
                });

                let companyService = window.companyFolderService;
                if (!companyService) {
                    if (window.CompanyFolderService) {
                        companyService = new window.CompanyFolderService();
                        window.companyFolderService = companyService;
                    } else {
                        console.error('❌ CompanyFolderService tapılmadı');
                        this.showNotification('Xəta: Service tapılmadı', 'error');
                        return;
                    }
                }

                console.log('🔐 İcazələr yüklənir...');
                await companyService.loadUserPermissions(this.selectedCompany.code);

                if (this.currentFolder) {
                    const hasPerm = companyService.hasPermission(this.currentFolder, 'create');
                    console.log(`🔐 Folder ${this.currentFolder} üçün create icazəsi:`, hasPerm);

                    if (!hasPerm && !companyService._isAdmin()) {
                        const confirmForce = confirm('İcazəniz yoxdur. Yenə də davam etmək istəyirsiniz?');
                        if (!confirmForce) return;
                    }
                }

                const result = await companyService.createFolder(
                    name.trim(),
                    this.selectedCompany.code,
                    this.currentFolder
                );

                if (result.success) {
                    this.showNotification(`"${name}" qovluğu yaradıldı`, 'success');

                    // Cache-i təmizlə
                    this.foldersCache.delete(this.selectedCompany.code);

                    setTimeout(() => {
                        this.loadCompanyFiles(this.selectedCompany);
                    }, 1000);
                } else {
                    this.showNotification(result.error || 'Qovluq yaradıla bilmədi', 'error');
                }
            }
        } catch (error) {
            console.error('❌ Qovluq yaratma xətası:', error);
            this.showNotification('Xəta: ' + error.message, 'error');
        }
    }

    async deleteFolder(folderId, companyCode, panelType) {
        if (!confirm('Bu qovluğu silmək istədiyinizə əminsiniz?')) return;

        try {
            if (panelType === 'company') {
                let companyService = window.companyFolderService;
                if (!companyService && window.CompanyFolderService) {
                    companyService = new window.CompanyFolderService();
                    window.companyFolderService = companyService;
                }

                if (companyService) {
                    console.log('🗑️ Silinəcək qovluq ID:', folderId);

                    const result = await companyService.deleteFolder(folderId, companyCode);

                    if (result.success) {
                        this.showNotification('Qovluq silindi', 'success');

                        // Cache-i təmizlə
                        this.foldersCache.delete(companyCode);

                        setTimeout(() => {
                            this.loadCompanyFiles(this.selectedCompany);
                        }, 500);
                    } else {
                        this.showNotification(result.error || 'Qovluq silinə bilmədi', 'error');
                    }
                }
            }
        } catch (error) {
            console.error('❌ Silmə xətası:', error);
            this.showNotification('Xəta: ' + error.message, 'error');
        }
    }

    async deleteFile(fileId, companyCode, panelType) {
        if (!confirm('Bu faylı silmək istədiyinizə əminsiniz?')) return;

        try {
            if (panelType === 'company') {
                let companyService = window.companyFolderService;
                if (!companyService && window.CompanyFolderService) {
                    companyService = new window.CompanyFolderService();
                    window.companyFolderService = companyService;
                }

                if (companyService) {
                    const result = await companyService.deleteFile(fileId, companyCode);

                    if (result.success) {
                        this.showNotification('Fayl silindi', 'success');
                        await this.loadCompanyFiles(this.selectedCompany);
                    } else {
                        this.showNotification(result.error || 'Fayl silinə bilmədi', 'error');
                    }
                } else {
                    await this.fileService.deleteFile(fileId);
                    this.showNotification('Fayl silindi', 'success');
                    await this.loadCompanyFiles(this.selectedCompany);
                }
            } else {
                await this.fileService.deleteFile(fileId);
                this.showNotification('Fayl silindi', 'success');
                await this.loadPersonalFiles();
            }
        } catch (error) {
            console.error('❌ Silmə xətası:', error);
            this.showNotification('Xəta: ' + error.message, 'error');
        }
    }

    getCompanyFolderListHTML(item) {
        const createdByName = item.created_by_name || 'Naməlum';
        const itemCount = item.item_count || 0;
        const isAdmin = this._checkIfAdmin();

        return `
            <div class="folder-list-item group relative bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-all cursor-pointer p-2 mb-1" 
                 data-id="${item.id}" data-uuid="${item.uuid}" data-type="folder">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <i class="fa-solid fa-folder text-purple-600"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between">
                            <p class="text-sm font-medium text-gray-700 truncate" title="${item.name}">${item.name}</p>
                            <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                ${isAdmin ? `
                                <button class="permission-btn text-purple-500 hover:text-purple-700" data-id="${item.id}" data-name="${item.name}" title="İcazə ver">
                                    <i class="fa-solid fa-user-lock text-xs"></i>
                                </button>
                                ` : ''}
                                ${(isAdmin || item.can_create_folder) ? `
                                <button class="create-subfolder-btn text-orange-500 hover:text-orange-700" data-id="${item.id}" title="Alt qovluq yarat">
                                    <i class="fa-solid fa-folder-plus text-xs"></i>
                                </button>
                                ` : ''}
                                ${(isAdmin || item.can_delete) ? `
                                <button class="delete-folder-btn text-red-500 hover:text-red-700" data-id="${item.id}" title="Sil">
                                    <i class="fa-solid fa-trash text-xs"></i>
                                </button>
                                ` : ''}
                            </div>
                        </div>
                        <div class="flex items-center gap-2 text-[10px] text-gray-400">
                            <span>${this.formatDate(item.created_at)}</span>
                            ${itemCount > 0 ? `<span>• ${itemCount} fayl</span>` : ''}
                            <span>• ${createdByName}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getCompanyFileListHTML(item) {
        const isImage = item.mime_type?.startsWith('image/');
        const icon = isImage ? 'fa-file-image' : 'fa-file';
        const size = this.formatFileSize(item.file_size || 0);
        const fileExt = item.file_extension || item.name?.split('.').pop() || 'FILE';
        const folderId = item.folder_id;

        let canDelete = false;
        if (window.companyFolderService && typeof window.companyFolderService.hasPermission === 'function') {
            canDelete = window.companyFolderService.hasPermission(folderId, 'delete');
        }
        const isAdmin = this._checkIfAdmin();

        return `
            <div class="file-list-item group relative bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-all cursor-pointer p-2 mb-1" 
                 data-id="${item.file_uuid || item.uuid}" data-uuid="${item.file_uuid || item.uuid}" data-type="file">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        ${isImage ? 
                            `<img src="${this.fileService?.getFileUrl({uuid: item.file_uuid}) || '#'}" class="w-full h-full object-cover" alt="${item.original_filename}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">` : 
                            `<i class="fa-solid ${icon} text-purple-600"></i>`
                        }
                        ${isImage ? `<i class="fa-solid ${icon} text-purple-600 hidden"></i>` : ''}
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between">
                            <p class="text-sm font-medium text-gray-700 truncate" title="${item.original_filename}">${item.original_filename}</p>
                            <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button class="download-btn text-purple-500 hover:text-purple-700" data-id="${item.file_uuid || item.uuid}" title="Yüklə">
                                    <i class="fa-solid fa-download text-xs"></i>
                                </button>
                                ${(canDelete || isAdmin) ? `
                                <button class="delete-file-btn text-red-500 hover:text-red-700" data-id="${item.file_uuid || item.uuid}" data-folder="${folderId || ''}" title="Sil">
                                    <i class="fa-solid fa-trash text-xs"></i>
                                </button>
                                ` : ''}
                            </div>
                        </div>
                        <div class="flex items-center gap-2 text-[10px] text-gray-400">
                            <span>${fileExt.toUpperCase()}</span>
                            <span>•</span>
                            <span>${size}</span>
                            <span>•</span>
                            <span>${item.uploaded_by_name || 'Naməlum'}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getCompanyFileCardHTML(item) {
        const isImage = item.mime_type?.startsWith('image/');
        const icon = isImage ? 'fa-file-image' : 'fa-file';
        const size = this.formatFileSize(item.file_size || 0);
        const fileExt = item.file_extension || item.name?.split('.').pop() || 'FILE';
        const folderId = item.folder_id;

        let canDelete = false;
        if (window.companyFolderService && typeof window.companyFolderService.hasPermission === 'function') {
            canDelete = window.companyFolderService.hasPermission(folderId, 'delete');
        }
        const isAdmin = this._checkIfAdmin();

        return `
            <div class="file-item group relative bg-white rounded-lg border border-gray-200 hover:shadow transition-all cursor-pointer p-2" 
                 data-id="${item.file_uuid || item.uuid}" data-uuid="${item.file_uuid || item.uuid}" data-type="file" data-folder="${folderId || ''}">
                <div class="flex flex-col items-center text-center">
                    <div class="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center mb-1 overflow-hidden">
                        ${isImage ? 
                            `<img src="${this.fileService?.getFileUrl({uuid: item.file_uuid}) || '#'}" class="w-full h-full object-cover" alt="${item.original_filename}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">` : 
                            `<i class="fa-solid ${icon} text-xl text-purple-600"></i>`
                        }
                        ${isImage ? `<i class="fa-solid ${icon} text-xl text-purple-600 hidden"></i>` : ''}
                    </div>
                    <p class="text-xs font-medium text-gray-700 truncate w-full" title="${item.original_filename}">${item.original_filename}</p>
                    <div class="flex items-center justify-center gap-1 text-[10px] text-gray-400">
                        <span>${fileExt.toUpperCase()}</span>
                        <span>•</span>
                        <span>${size}</span>
                    </div>
                    <p class="text-[8px] text-gray-400 mt-1">${item.uploaded_by_name || ''}</p>
                </div>
                
                <div class="absolute inset-0 bg-black/30 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                    <button class="w-6 h-6 bg-white rounded-full flex items-center justify-center text-blue-500 hover:bg-blue-500 hover:text-white transition-colors action-btn" 
                            data-action="info" data-id="${item.file_uuid || item.uuid}" title="Məlumat">
                        <i class="fa-solid fa-info text-xs"></i>
                    </button>
                    
                    <button class="w-6 h-6 bg-white rounded-full flex items-center justify-center text-green-500 hover:bg-green-500 hover:text-white transition-colors action-btn" 
                            data-action="share" data-id="${item.file_uuid || item.uuid}" title="Paylaş">
                        <i class="fa-solid fa-share-nodes text-xs"></i>
                    </button>
                    
                    <button class="w-6 h-6 bg-white rounded-full flex items-center justify-center text-purple-500 hover:bg-purple-500 hover:text-white transition-colors download-btn" 
                            data-id="${item.file_uuid || item.uuid}" title="Yüklə">
                        <i class="fa-solid fa-download text-xs"></i>
                    </button>
                    
                    ${(canDelete || isAdmin) ? `
                    <button class="w-6 h-6 bg-white rounded-full flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-colors delete-file-btn" 
                            data-id="${item.file_uuid || item.uuid}" data-folder="${folderId || ''}" title="Sil">
                        <i class="fa-solid fa-trash text-xs"></i>
                    </button>
                    ` : ''}
                    <button class="delete-file-btn text-red-500 hover:text-red-700" data-id="${item.file_uuid || item.uuid}" data-folder="${folderId || ''}" title="Sil">
                        <i class="fa-solid fa-trash text-xs"></i>
                    </button>
                </div>
            </div>
        `;
    }

    getCompanyFolderCardHTML(item) {
        const createdByName = item.created_by_name || 'Naməlum';
        const itemCount = item.item_count || 0;
        const isAdmin = this._checkIfAdmin();

        return `
            <div class="folder-item group relative bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all cursor-pointer p-3" 
                 data-id="${item.id}" data-uuid="${item.uuid}" data-type="folder">
                <div class="flex flex-col items-center text-center">
                    <div class="w-14 h-14 rounded-xl bg-purple-100 flex items-center justify-center mb-2">
                        <i class="fa-solid fa-folder text-3xl text-purple-600"></i>
                    </div>
                    <p class="text-sm font-medium text-gray-700 truncate w-full mb-1" title="${item.name}">${item.name}</p>
                    <div class="flex items-center gap-1 text-[10px] text-gray-400">
                        <span>${this.formatDate(item.created_at)}</span>
                        ${itemCount > 0 ? `<span>• ${itemCount} fayl</span>` : ''}
                    </div>
                    <p class="text-[8px] text-gray-400 mt-1">${createdByName}</p>
                </div>
                
                <div class="absolute inset-0 bg-black/30 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                    
                    ${isAdmin ? `
                    <button class="w-6 h-6 bg-white rounded-full flex items-center justify-center text-purple-500 hover:bg-purple-500 hover:text-white transition-colors permission-btn" 
                            data-id="${item.id}" data-name="${item.name}" title="İcazə ver">
                        <i class="fa-solid fa-user-lock text-xs"></i>
                    </button>
                    ` : ''}
                    
                    <button class="w-6 h-6 bg-white rounded-full flex items-center justify-center text-blue-500 hover:bg-blue-500 hover:text-white transition-colors action-btn" 
                            data-action="info" data-id="${item.id}" title="Məlumat">
                        <i class="fa-solid fa-info text-xs"></i>
                    </button>
                    
                    ${(isAdmin || item.can_upload) ? `
                    <button class="w-6 h-6 bg-white rounded-full flex items-center justify-center text-green-500 hover:bg-green-500 hover:text-white transition-colors upload-btn" 
                            data-id="${item.id}" title="Fayl yüklə">
                        <i class="fa-solid fa-upload text-xs"></i>
                    </button>
                    ` : ''}
                    
                    ${(isAdmin || item.can_create_folder) ? `
                    <button class="w-6 h-6 bg-white rounded-full flex items-center justify-center text-orange-500 hover:bg-orange-500 hover:text-white transition-colors create-subfolder-btn" 
                            data-id="${item.id}" title="Alt qovluq yarat">
                        <i class="fa-solid fa-folder-plus text-xs"></i>
                    </button>
                    ` : ''}
                    
                    ${(isAdmin || item.can_delete) ? `
                    <button class="w-6 h-6 bg-white rounded-full flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-colors delete-folder-btn" 
                            data-id="${item.id}" data-uuid="${item.uuid}" title="Sil">
                        <i class="fa-solid fa-trash text-xs"></i>
                    </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    _checkIfAdmin() {
        try {
            const userData = localStorage.getItem('userData');
            if (userData) {
                const parsed = JSON.parse(userData);
                return parsed.user?.is_admin || parsed.is_admin || false;
            }
        } catch (e) {
            console.warn('Admin yoxlama xətası:', e);
        }
        return false;
    }

    attachCompanyItemListeners(container, companyService, companyCode) {
        container.querySelectorAll('.delete-folder-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const folderId = btn.dataset.id;

                if (confirm('Bu qovluğu silmək istədiyinizə əminsiniz?')) {
                    if (companyService) {
                        const result = await companyService.deleteFolder(folderId, companyCode);
                        if (result.success) {
                            this.showNotification('Qovluq silindi', 'success');
                            this.foldersCache.delete(companyCode);
                            await this.loadCompanyFiles(this.selectedCompany);
                        } else {
                            this.showNotification(result.error || 'Qovluq silinə bilmədi', 'error');
                        }
                    } else {
                        await this.deleteFolder(folderId, companyCode, 'company');
                    }
                }
            });
        });

        container.querySelectorAll('.delete-file-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const fileId = btn.dataset.id;

                if (confirm('Bu faylı silmək istədiyinizə əminsiniz?')) {
                    if (companyService) {
                        const result = await companyService.deleteFile(fileId, companyCode);
                        if (result.success) {
                            this.showNotification('Fayl silindi', 'success');
                            await this.loadCompanyFiles(this.selectedCompany);
                        } else {
                            this.showNotification(result.error || 'Fayl silinə bilmədi', 'error');
                        }
                    } else {
                        await this.deleteFile(fileId, companyCode, 'company');
                    }
                }
            });
        });

        container.querySelectorAll('.folder-item, .folder-list-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('button')) return;

                const id = item.dataset.id;
                this.goToCompanyFolder(id);
            });
        });

        container.querySelectorAll('.file-item, .file-list-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('button')) return;

                const id = item.dataset.id;
                const file = {
                    id,
                    uuid: id,
                    name: item.querySelector('p')?.textContent,
                };
                this.previewFile(file);
            });
        });

        container.querySelectorAll('.download-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                window.open(`https://guvenfinans.az/proxy.php/api/v1/files/${id}/download?token=${localStorage.getItem('guven_token')}`, '_blank');
            });
        });

        container.querySelectorAll('.permission-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const folderId = btn.dataset.id;
                const folderName = btn.dataset.name;

                const folder = {
                    id: folderId,
                    name: folderName
                };

                if (window.folderPermissionModal) {
                    window.folderPermissionModal.open(
                        folder,
                        this.selectedCompany.code,
                        () => {
                            this.loadCompanyFiles(this.selectedCompany);
                        }
                    );
                } else {
                    const modal = new FolderPermissionModal(window.companyFolderService);
                    modal.open(
                        folder,
                        this.selectedCompany.code,
                        () => {
                            this.loadCompanyFiles(this.selectedCompany);
                        }
                    );
                }
            });
        });

        container.querySelectorAll('.create-subfolder-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const folderId = btn.dataset.id;

                this.currentFolder = folderId;
                this.showNewFolderDialog('company');
            });
        });

        container.querySelectorAll('.upload-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const folderId = btn.dataset.id;

                this.currentFolder = folderId;
                this.showFileUploadDialog('company');
            });
        });
    }

    formatDate(dateString) {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('az-AZ');
        } catch {
            return '-';
        }
    }

    formatFileSize(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i];
    }

    async confirmDelete(id, type) {
        if (!confirm('Bu elementi silmək istədiyinizə əminsiniz?')) return false;

        try {
            if (type === 'company_folder' && this.companyFolderService) {
                const result = await this.companyFolderService.deleteFolder(parseInt(id), false);
                if (result.success) {
                    this.showNotification('Qovluq silindi', 'success');
                    return true;
                } else {
                    this.showNotification(result.error || 'Silinmə xətası', 'error');
                    return false;
                }
            } else if (type === 'folder') {
                await this.fileService?.deleteFolder(id);
                this.showNotification('Qovluq silindi', 'success');
                return true;
            } else {
                await this.fileService?.deleteFile(id);
                this.showNotification('Fayl silindi', 'success');
                return true;
            }
        } catch (error) {
            console.error('Silinmə xətası:', error);
            this.showNotification('Silinmə xətası', 'error');
            return false;
        }
    }

    async showFileUploadDialog(panelType) {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;

        input.onchange = async (e) => {
            const files = Array.from(e.target.files);
            this.showNotification(`${files.length} fayl yüklənir...`, 'info');

            try {
                let uploadedCount = 0;
                let errorCount = 0;

                if (panelType === 'company' && this.selectedCompany) {
                    console.log('🏢 Şirkət faylı yüklənir');
                    console.log('📂 Cari qovluq (currentFolder):', this.currentFolder);

                    let folderIdToSend = this.currentFolder;

                    if (folderIdToSend && folderIdToSend !== 'null' && folderIdToSend !== 'undefined') {
                        console.log('📂 Qovluq ID göndəriləcək:', folderIdToSend);
                    } else {
                        console.log('📂 Qovluq yoxdur, root-a yüklənəcək');
                        folderIdToSend = null;
                    }

                    for (const file of files) {
                        try {
                            console.log(`📤 Fayl yüklənir: ${file.name}, folderId: ${folderIdToSend}`);

                            const result = await this.fileService?.uploadFileForCompany(
                                file,
                                this.selectedCompany.code || this.selectedCompany.id,
                                'COMPANY_FILE',
                                folderIdToSend
                            );

                            if (result?.success) {
                                uploadedCount++;
                                console.log(`✅ ${file.name} yükləndi`);
                            } else {
                                errorCount++;
                                console.error(`❌ ${file.name} yüklənmədi:`, result?.error);
                            }
                        } catch (error) {
                            errorCount++;
                            console.error(`❌ ${file.name} xətası:`, error);
                        }
                    }

                    // Cache-i təmizlə
                    this.foldersCache.delete(this.selectedCompany.code);

                } else {
                    for (const file of files) {
                        try {
                            const result = await this.fileService?.uploadFile(
                                file,
                                panelType === 'personal' ? 'USER_FILE' : 'COMPANY_FILE',
                                this.currentFolder
                            );

                            if (result?.success) {
                                uploadedCount++;
                            } else {
                                errorCount++;
                            }
                        } catch (error) {
                            errorCount++;
                            console.error(`❌ ${file.name} xətası:`, error);
                        }
                    }
                }

                if (errorCount > 0) {
                    this.showNotification(
                        `${uploadedCount} fayl yükləndi, ${errorCount} xəta`,
                        'warning'
                    );
                } else {
                    this.showNotification(`${uploadedCount} fayl uğurla yükləndi`, 'success');
                }

                setTimeout(() => {
                    if (panelType === 'personal') {
                        this.loadPersonalFiles();
                    } else if (this.selectedCompany) {
                        console.log('🔄 Company files yenilənir, cari qovluq:', this.currentFolder);
                        this.loadCompanyFiles(this.selectedCompany);
                    }
                }, 2000);

            } catch (error) {
                console.error('❌ showFileUploadDialog xətası:', error);
                this.showNotification('Yükləmə xətası: ' + error.message, 'error');
            }
        };

        input.click();
    }

    showShareDialog(panelType, shareType, item = null) {
        const title = item ? `"${item.name}" faylını paylaş` : 'Faylları paylaş';

        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-white rounded-xl max-w-md w-full p-4">
                <div class="flex items-center justify-between mb-3">
                    <h3 class="text-base font-bold text-gray-800">${title}</h3>
                    <button class="text-gray-500 hover:text-gray-700" onclick="this.closest('.fixed').remove()">
                        <i class="fa-solid fa-times"></i>
                    </button>
                </div>
                <p class="text-xs text-gray-600 mb-3">
                    Paylaşma funksiyası hazırlanır
                </p>
                <div class="flex justify-end gap-2 mt-4">
                    <button class="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-xs" onclick="this.closest('.fixed').remove()">Bağla</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    showFileInfo(item) {
        const isPersonal = this.activePanel === 'personal';
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-white rounded-xl max-w-md w-full p-4">
                <div class="flex items-center justify-between mb-3">
                    <h3 class="text-base font-bold text-gray-800">Fayl məlumatları</h3>
                    <button class="text-gray-500 hover:text-gray-700" onclick="this.closest('.fixed').remove()">
                        <i class="fa-solid fa-times"></i>
                    </button>
                </div>
                <div class="space-y-2 text-sm">
                    <div class="flex">
                        <span class="w-24 text-gray-500 text-xs">Ad:</span>
                        <span class="flex-1 font-medium text-xs">${item.name}</span>
                    </div>
                    <div class="flex">
                        <span class="w-24 text-gray-500 text-xs">Tip:</span>
                        <span class="flex-1 text-xs">${item.type === 'folder' ? 'Qovluq' : (item.file_extension || 'Fayl')}</span>
                    </div>
                    <div class="flex">
                        <span class="w-24 text-gray-500 text-xs">Ölçü:</span>
                        <span class="flex-1 text-xs">${item.type === 'folder' ? '-' : (this.fileService?.formatFileSize(item.size) || '0 B')}</span>
                    </div>
                    <div class="flex">
                        <span class="w-24 text-gray-500 text-xs">Tarix:</span>
                        <span class="flex-1 text-xs">${this.fileService?.formatDate(item.created_at) || '-'}</span>
                    </div>
                    <div class="flex">
                        <span class="w-24 text-gray-500 text-xs">Yer:</span>
                        <span class="flex-1 text-xs">${isPersonal ? 'Şəxsi' : 'Şirkət'}</span>
                    </div>
                </div>
                <div class="flex justify-end mt-4">
                    <button class="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-xs" onclick="this.closest('.fixed').remove()">Bağla</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    previewFile(file) {
        if (this.fileService?.isImage(file)) {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4';
            modal.innerHTML = `
                <div class="relative max-w-3xl max-h-[90vh]">
                    <button class="absolute -top-8 right-0 text-white text-xl hover:text-gray-300" onclick="this.closest('.fixed').remove()">
                        <i class="fa-solid fa-times"></i>
                    </button>
                    <img src="${this.fileService?.getFileUrl(file)}" class="max-w-full max-h-[80vh] object-contain rounded-lg" alt="${file.name}">
                </div>
            `;
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });
            document.body.appendChild(modal);
        } else {
            this.fileService?.downloadFile(file);
        }
    }

    showNotification(message, type = 'info') {
        const oldNotification = document.querySelector('.files-notification');
        if (oldNotification) oldNotification.remove();

        const notification = document.createElement('div');
        notification.className = `files-notification fixed top-4 right-4 z-[9999] px-4 py-2 rounded-lg shadow-2xl transform transition-all duration-300 text-sm ${
            type === 'success' ? 'bg-gradient-to-r from-green-500 to-green-600 text-white' : 
            type === 'error' ? 'bg-gradient-to-r from-red-500 to-red-600 text-white' : 
            'bg-gradient-to-r from-brand-blue to-blue-600 text-white'
        }`;

        notification.innerHTML = `
            <div class="flex items-center gap-2">
                <i class="fa-solid fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'} text-sm"></i>
                <span class="text-xs font-medium">${message}</span>
            </div>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('opacity-0', 'translate-x-full');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    handleFileChange(action, data) {
        if (this.activePanel === 'personal') {
            this.loadPersonalFiles();
        } else if (this.activePanel === 'company' && this.selectedCompany) {
            this.loadCompanyFiles(this.selectedCompany);
        }
    }

    findItemById(id) {
        return this.fileService?._cache?.files?.find(f => f.id == id || f.uuid == id) ||
               this.fileService?._cache?.folders?.find(f => f.id == id || f.uuid == id);
    }

    getEmptyStateHTML(panelType) {
        const isPersonal = panelType === 'personal';
        const gradient = isPersonal ? 'from-brand-blue/10 to-blue-100/30' : 'from-purple-500/10 to-purple-100/30';
        const icon = isPersonal ? 'fa-cloud-upload-alt' : 'fa-users';
        const iconColor = isPersonal ? 'text-brand-blue/50' : 'text-purple-500/50';
        const title = isPersonal ? 'Şəxsi fayllar yoxdur' : 'Şirkət faylları yoxdur';
        const btnColor = isPersonal ? 'bg-brand-blue' : 'bg-purple-500';

        return `
            <div class="flex flex-col items-center justify-center h-full py-8">
                <div class="w-16 h-16 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-2">
                    <i class="fa-solid ${icon} text-3xl ${iconColor}"></i>
                </div>
                <h4 class="text-sm font-semibold text-gray-700 mb-1">${title}</h4>
                <p class="text-xs text-gray-400 mb-3">Fayl yükləyin</p>
                <button class="px-3 py-1.5 ${btnColor} text-white rounded-lg hover:opacity-90 text-xs upload-panel-btn" onclick="document.getElementById('upload${isPersonal ? 'Personal' : 'Company'}FileBtn').click()">
                    <i class="fa-solid fa-upload"></i> Yüklə
                </button>
            </div>
        `;
    }

    getCompanyEmptyStateHTML() {
        return `
            <div class="flex flex-col items-center justify-center h-full py-8">
                <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/10 to-purple-100/30 flex items-center justify-center mb-2">
                    <i class="fa-solid fa-cloud-upload-alt text-3xl text-purple-500/50"></i>
                </div>
                <h4 class="text-sm font-semibold text-gray-700 mb-1">Fayl yoxdur</h4>
                <p class="text-xs text-gray-400 mb-3">Fayl yükləyin</p>
                <button class="px-3 py-1.5 bg-purple-500 text-white rounded-lg hover:opacity-90 text-xs upload-company-btn" onclick="document.getElementById('uploadCompanyFileBtn').click()">
                    <i class="fa-solid fa-upload"></i> Yüklə
                </button>
            </div>
        `;
    }

    getCompanyErrorStateHTML() {
        return `
            <div class="flex flex-col items-center justify-center h-full py-8">
                <div class="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mb-2">
                    <i class="fa-solid fa-exclamation-triangle text-3xl text-red-500"></i>
                </div>
                <h4 class="text-sm font-semibold text-gray-700 mb-1">Yükləmə xətası</h4>
                <button class="px-3 py-1.5 bg-purple-500 text-white rounded-lg hover:opacity-90 text-xs" onclick="window.filesUI.loadCompanyFiles(window.filesUI.selectedCompany)">
                    <i class="fa-solid fa-rotate-right"></i> Yenidən
                </button>
            </div>
        `;
    }

    getErrorStateHTML(panelType) {
        const isPersonal = panelType === 'personal';
        const btnColor = isPersonal ? 'bg-brand-blue' : 'bg-purple-500';

        return `
            <div class="flex flex-col items-center justify-center h-full py-8">
                <div class="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mb-2">
                    <i class="fa-solid fa-exclamation-triangle text-3xl text-red-500"></i>
                </div>
                <h4 class="text-sm font-semibold text-gray-700 mb-1">Yükləmə xətası</h4>
                <button class="px-3 py-1.5 ${btnColor} text-white rounded-lg hover:opacity-90 text-xs" onclick="window.filesUI.${isPersonal ? 'loadPersonalFiles' : 'loadCompanyFiles'}(window.filesUI.selectedCompany)">
                    <i class="fa-solid fa-rotate-right"></i> Yenidən
                </button>
            </div>
        `;
    }

    getFolderCardHTML(item, panelType) {
        const isSelected = this.selectedItems.has(item.id);
        const isPersonal = panelType === 'personal';
        const bgColor = isPersonal ? 'from-brand-blue/10 to-blue-100/30' : 'from-purple-500/10 to-purple-100/30';
        const iconColor = isPersonal ? 'text-brand-blue' : 'text-purple-500';

        return `
            <div class="folder-item group relative bg-white rounded-lg border ${isSelected ? 'border-brand-blue ring-1 ring-brand-blue/20' : 'border-gray-200'} hover:shadow transition-all cursor-pointer p-2" data-id="${item.id}" data-type="folder" data-panel="${panelType}">
                <div class="absolute top-1 right-1 z-10">
                    <input type="checkbox" class="item-checkbox w-3 h-3 rounded border-gray-300 text-brand-blue" ${isSelected ? 'checked' : ''} data-id="${item.id}">
                </div>
                <div class="flex flex-col items-center text-center">
                    <div class="w-12 h-12 rounded-xl bg-gradient-to-br ${bgColor} flex items-center justify-center mb-1">
                        <i class="fa-solid fa-folder text-2xl ${iconColor}"></i>
                    </div>
                    <p class="text-xs font-medium text-gray-700 truncate w-full mb-0.5" title="${item.name}">${item.name}</p>
                    <p class="text-[10px] text-gray-400">${this.fileService?.formatDate(item.created_at) || '-'}</p>
                </div>
                <!-- Hover Actions -->
                <div class="absolute inset-0 bg-black/30 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-0.5">
                    <button class="w-5 h-5 bg-white rounded-full flex items-center justify-center text-blue-500 hover:bg-blue-500 hover:text-white transition-colors action-btn" data-action="info" data-id="${item.id}" title="Məlumat">
                        <i class="fa-solid fa-info text-[8px]"></i>
                    </button>
                    <button class="w-5 h-5 bg-white rounded-full flex items-center justify-center text-green-500 hover:bg-green-500 hover:text-white transition-colors action-btn" data-action="share" data-id="${item.id}" title="Paylaş">
                        <i class="fa-solid fa-share-nodes text-[8px]"></i>
                    </button>
                    <button class="w-5 h-5 bg-white rounded-full flex items-center justify-center text-purple-500 hover:bg-purple-500 hover:text-white transition-colors action-btn" data-action="send" data-id="${item.id}" title="Göndər">
                        <i class="fa-solid fa-paper-plane text-[8px]"></i>
                    </button>
                    <button class="w-5 h-5 bg-white rounded-full flex items-center justify-center text-brand-blue hover:bg-brand-blue hover:text-white transition-colors download-btn" data-id="${item.id}" title="Yüklə">
                        <i class="fa-solid fa-download text-[8px]"></i>
                    </button>
                    <button class="w-5 h-5 bg-white rounded-full flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-colors delete-btn" data-id="${item.id}" title="Sil">
                        <i class="fa-solid fa-trash text-[8px]"></i>
                    </button>
                </div>
            </div>
        `;
    }

    getFileCardHTML(item, panelType) {
        const isSelected = this.selectedItems.has(item.id);
        const isImage = this.fileService?.isImage(item) || false;
        const icon = this.fileService?.getFileIcon(item) || 'fa-file';
        const size = this.fileService?.formatFileSize(item.size || item.file_size || 0) || '0 B';
        const isPersonal = panelType === 'personal';
        const bgColor = isPersonal ? 'from-brand-blue/10 to-blue-100/30' : 'from-purple-500/10 to-purple-100/30';

        return `
            <div class="file-item group relative bg-white rounded-lg border ${isSelected ? 'border-brand-blue ring-1 ring-brand-blue/20' : 'border-gray-200'} hover:shadow transition-all cursor-pointer p-2" data-id="${item.id}" data-type="file" data-panel="${panelType}">
                <div class="absolute top-1 right-1 z-10">
                    <input type="checkbox" class="item-checkbox w-3 h-3 rounded border-gray-300 text-brand-blue" ${isSelected ? 'checked' : ''} data-id="${item.id}">
                </div>
                <div class="flex flex-col items-center text-center">
                    <div class="w-12 h-12 rounded-xl bg-gradient-to-br ${bgColor} flex items-center justify-center mb-1 overflow-hidden">
                        ${isImage ? 
                            `<img src="${this.fileService?.getFileUrl(item) || '#'}" class="w-full h-full object-cover" alt="${item.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">` : 
                            `<i class="fa-solid ${icon} text-xl text-gray-500"></i>`
                        }
                        ${isImage ? `<i class="fa-solid ${icon} text-xl text-gray-500 hidden"></i>` : ''}
                    </div>
                    <p class="text-xs font-medium text-gray-700 truncate w-full mb-0.5" title="${item.name}">${item.name}</p>
                    <div class="flex items-center justify-center gap-1 text-[10px] text-gray-400">
                        <span>${item.file_extension?.toUpperCase() || item.name?.split('.').pop()?.toUpperCase() || 'FILE'}</span>
                        <span>•</span>
                        <span>${size}</span>
                    </div>
                </div>
                <!-- Hover Actions -->
                <div class="absolute inset-0 bg-black/30 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-0.5">
                    <button class="w-5 h-5 bg-white rounded-full flex items-center justify-center text-blue-500 hover:bg-blue-500 hover:text-white transition-colors action-btn" data-action="info" data-id="${item.id}" title="Məlumat">
                        <i class="fa-solid fa-info text-[8px]"></i>
                    </button>
                    <button class="w-5 h-5 bg-white rounded-full flex items-center justify-center text-green-500 hover:bg-green-500 hover:text-white transition-colors action-btn" data-action="share" data-id="${item.id}" title="Paylaş">
                        <i class="fa-solid fa-share-nodes text-[8px]"></i>
                    </button>
                    <button class="w-5 h-5 bg-white rounded-full flex items-center justify-center text-purple-500 hover:bg-purple-500 hover:text-white transition-colors action-btn" data-action="send" data-id="${item.id}" title="Göndər">
                        <i class="fa-solid fa-paper-plane text-[8px]"></i>
                    </button>
                    <button class="w-5 h-5 bg-white rounded-full flex items-center justify-center text-brand-blue hover:bg-brand-blue hover:text-white transition-colors download-btn" data-id="${item.id}" title="Yüklə">
                        <i class="fa-solid fa-download text-[8px]"></i>
                    </button>
                    <button class="w-5 h-5 bg-white rounded-full flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-colors delete-btn" data-id="${item.id}" title="Sil">
                        <i class="fa-solid fa-trash text-[8px]"></i>
                    </button>
                </div>
            </div>
        `;
    }

    attachItemListeners(container, panelType) {
        container.querySelectorAll('.item-checkbox').forEach(cb => {
            cb.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = cb.dataset.id;
                if (cb.checked) {
                    this.selectedItems.add(id);
                } else {
                    this.selectedItems.delete(id);
                }
                this.updateItemSelection(id, cb.checked);
            });
        });

        container.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                const id = btn.dataset.id;
                const item = this.findItemById(id);

                switch(action) {
                    case 'info':
                        this.showFileInfo(item);
                        break;
                    case 'share':
                        this.showShareDialog(panelType, 'company', item);
                        break;
                    case 'send':
                        this.showShareDialog(panelType, 'user', item);
                        break;
                }
            });
        });

        container.querySelectorAll('.download-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const file = this.fileService?._cache?.files?.find(f => f.id == id || f.uuid == id);
                if (file && this.fileService) {
                    await this.fileService.downloadFile(file);
                }
            });
        });

        container.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const type = btn.closest('[data-type]')?.dataset.type;
                if (await this.confirmDelete(id, type)) {
                    if (panelType === 'personal') {
                        await this.loadPersonalFiles();
                    } else if (this.selectedCompany) {
                        await this.loadCompanyFiles(this.selectedCompany);
                    }
                }
            });
        });

        container.querySelectorAll('.folder-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.type === 'checkbox' || e.target.closest('button')) return;

                const id = item.dataset.id;
                const folder = this.fileService?._cache?.folders?.find(f => f.id == id || f.uuid == id);

                if (folder) {
                    this.currentFolder = folder.uuid || folder.id;

                    if (panelType === 'personal') {
                        this.updatePersonalBreadcrumb();
                        this.loadPersonalFiles();
                    } else if (this.selectedCompany) {
                        this.updateCompanyBreadcrumb(folder);
                        this.loadCompanyFiles(this.selectedCompany);
                    }
                }
            });
        });

        container.querySelectorAll('.file-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.type === 'checkbox' || e.target.closest('button')) return;

                const id = item.dataset.id;
                const file = this.fileService?._cache?.files?.find(f => f.id == id || f.uuid == id);
                if (file) this.previewFile(file);
            });
        });
    }

    updateItemSelection(id, selected) {
        const items = document.querySelectorAll(`[data-id="${id}"]`);
        items.forEach(item => {
            if (selected) {
                item.classList.add('border-brand-blue', 'ring-1', 'ring-brand-blue/20');
            } else {
                item.classList.remove('border-brand-blue', 'ring-1', 'ring-brand-blue/20');
            }
        });
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Global instance
window.FilesUI = FilesUI;