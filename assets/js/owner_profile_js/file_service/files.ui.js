// worker_profile_js/file_service/files.ui.js
/**
 * Files UI - Professional Design with Fixed Sizes
 * YENİ DİZAYN - Geri qayıtma düyməsi, view toggle və təkmilləşdirilmiş UI
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
        this.companyViewMode = 'grid'; // Company panel üçün view mode
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
        this.foldersCache = new Map();
        this.allFolders = [];
        this.allFiles = [];

        // Metodları bind et
        this.selectCompany = this.selectCompany.bind(this);
        this.loadCompanyFiles = this.loadCompanyFiles.bind(this);
        this.renderCompaniesList = this.renderCompaniesList.bind(this);
        this.loadCompaniesAndPartners = this.loadCompaniesAndPartners.bind(this);
        this.goToCompanyFolder = this.goToCompanyFolder.bind(this);
        this.goToCompanyRoot = this.goToCompanyRoot.bind(this);
        this.goBack = this.goBack.bind(this);
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

    // ==================== ŞİRKƏT FAYLLARI ÜÇÜN - YENİ DİZAYN ====================

    getCompanyLayoutHTML() {
        return `
            <div class="flex h-full bg-white rounded-xl shadow-soft overflow-hidden">
                <!-- SOL PANEL - Şirkətlər və Partnyorlar Listi -->
                <div class="w-80 bg-gradient-to-b from-gray-50 to-white border-r border-gray-200 flex flex-col">
                    <!-- Header -->
                    <div class="p-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <button id="closeCompanyPanelBtn" class="w-8 h-8 bg-white/20 rounded-lg hover:bg-white/30 flex items-center justify-center transition-all hover:scale-105" title="Geri qayıt">
                                    <i class="fa-solid fa-arrow-left text-sm"></i>
                                </button>
                                <h3 class="text-base font-bold tracking-wide">Şirkətlər</h3>
                            </div>
                            <button id="refreshCompaniesBtn" class="w-8 h-8 bg-white/20 rounded-lg hover:bg-white/30 flex items-center justify-center transition-all hover:rotate-90" title="Yenilə">
                                <i class="fa-solid fa-rotate-right text-sm"></i>
                            </button>
                        </div>
                        <p class="text-xs text-white/70 mt-1">Cari şirkət: ${this.userCompanyCode || 'AZE26003'}</p>
                    </div>

                    <!-- Axtarış və Filter -->
                    <div class="p-3 border-b border-gray-200 bg-white/50 backdrop-blur-sm">
                        <div class="relative mb-2">
                            <i class="fa-solid fa-search absolute left-3 top-2.5 text-gray-400 text-xs"></i>
                            <input type="text" id="companySearch" placeholder="Şirkət və ya partnyor axtar..." 
                                   class="w-full pl-8 pr-3 py-2 text-xs bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all">
                        </div>
                        <select id="companyTypeFilter" class="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all appearance-none cursor-pointer">
                            <option value="all">Bütün şirkətlər</option>
                            <option value="companies">Şirkətlər</option>
                            <option value="partners">Partnyorlar</option>
                        </select>
                    </div>

                    <!-- Companies List with Scrollbar -->
                    <div class="flex-1 overflow-y-auto p-3 space-y-1" id="companiesList" style="max-height: 580px;">
                        <div class="flex justify-center items-center h-full">
                            <div class="text-center">
                                <div class="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                                <p class="text-xs text-gray-500">Yüklənir...</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- SAĞ PANEL - Seçilmiş Şirkətin Faylları - YENİ DİZAYN -->
                <div class="flex-1 flex flex-col bg-gray-50" id="companyFilesPanel">
                    <!-- Seçilməyib state -->
                    <div class="flex-1 flex items-center justify-center p-6" id="noCompanySelected">
                        <div class="text-center max-w-sm">
                            <div class="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-purple-500/10 to-purple-100/30 flex items-center justify-center mb-4 animate-pulse">
                                <i class="fa-solid fa-building text-5xl text-purple-500/50"></i>
                            </div>
                            <h3 class="text-xl font-bold text-gray-800 mb-2">Şirkət seçin</h3>
                            <p class="text-sm text-gray-500 mb-4">Fayllara baxmaq üçün soldan bir şirkət və ya partnyor seçin</p>
                            <div class="flex gap-2 justify-center">
                                <span class="px-3 py-1 bg-purple-100 text-purple-600 rounded-full text-xs font-medium">
                                    <i class="fa-regular fa-building mr-1"></i>Şirkətlər
                                </span>
                                <span class="px-3 py-1 bg-green-100 text-green-600 rounded-full text-xs font-medium">
                                    <i class="fa-regular fa-handshake mr-1"></i>Partnyorlar
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- Seçilmiş şirkətin faylları -->
                    <div id="selectedCompanyFiles" class="hidden flex-1 flex flex-col h-full">
                        <!-- Header with Company Info -->
                        <div class="p-4 bg-gradient-to-r from-purple-600 via-purple-500 to-purple-600 text-white shadow-lg" id="companyHeader">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                                        <i class="fa-solid fa-building text-xl"></i>
                                    </div>
                                    <div>
                                        <h3 class="text-lg font-bold" id="selectedCompanyName"></h3>
                                        <div class="flex items-center gap-2 text-xs text-white/80">
                                            <i class="fa-regular fa-hashtag"></i>
                                            <span id="selectedCompanyCode"></span>
                                        </div>
                                    </div>
                                </div>
                                <div class="flex gap-2">
                                    <span class="px-3 py-1.5 bg-white/20 backdrop-blur rounded-xl text-xs font-medium flex items-center gap-1" id="companyFolderCount">
                                        <i class="fa-regular fa-folder"></i> 0
                                    </span>
                                    <span class="px-3 py-1.5 bg-white/20 backdrop-blur rounded-xl text-xs font-medium flex items-center gap-1" id="companyFileCount">
                                        <i class="fa-regular fa-file"></i> 0
                                    </span>
                                </div>
                            </div>
                        </div>

                        <!-- Toolbar with Actions -->
                        <div class="p-3 bg-white border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
                            <div class="flex gap-2">
                                <select id="companyFileFilter" class="px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all cursor-pointer">
                                    <option value="all">📁 Bütün fayllar</option>
                                    <option value="images">🖼️ Şəkillər</option>
                                    <option value="documents">📄 Sənədlər</option>
                                    <option value="videos">🎥 Videolar</option>
                                </select>
                                <button id="newCompanyFolderBtn" class="px-3 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 flex items-center gap-1 text-xs font-medium transition-all hover:shadow-lg hover:scale-105">
                                    <i class="fa-solid fa-folder-plus"></i>
                                    <span>Yeni qovluq</span>
                                </button>
                                <button id="uploadCompanyFileBtn" class="px-3 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 flex items-center gap-1 text-xs font-medium transition-all hover:shadow-lg hover:scale-105">
                                    <i class="fa-solid fa-cloud-upload-alt"></i>
                                    <span>Fayl yüklə</span>
                                </button>
                            </div>
                        </div>

                        <!-- Search Bar -->
                        <div class="p-3 bg-white border-b border-gray-200">
                            <div class="relative">
                                <i class="fa-solid fa-search absolute left-3 top-2.5 text-gray-400 text-sm"></i>
                                <input type="text" id="companyFileSearch" placeholder="Qovluq və ya fayl adı ilə axtar..." 
                                       class="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all">
                                <button id="clearSearchBtn" class="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 hidden">
                                    <i class="fa-solid fa-times"></i>
                                </button>
                            </div>
                        </div>

                        <!-- Navigation Bar with Back Button and View Toggle -->
                        <div class="px-3 py-2 bg-white border-b border-gray-200 flex items-center justify-between">
                            <div class="flex items-center gap-2 flex-1">
                                <button id="backButton" class="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 hover:bg-purple-200 transition-all hover:scale-105 flex items-center justify-center" title="Geri qayıt">
                                    <i class="fa-solid fa-arrow-left text-sm"></i>
                                </button>
                                <div class="text-sm text-gray-600 flex items-center gap-1 flex-wrap bg-gray-50 px-3 py-1.5 rounded-xl" id="companyBreadcrumb">
                                    <i class="fa-solid fa-folder-open text-purple-500"></i>
                                    <span class="font-medium">Bütün Fayllar</span>
                                </div>
                            </div>
                            
                            <!-- View Toggle Buttons -->
                            <div class="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                                <button id="gridViewBtn" class="view-toggle-btn w-8 h-8 rounded-lg flex items-center justify-center transition-all bg-purple-500 text-white hover:bg-purple-600" title="Şəbəkə görünüşü">
                                    <i class="fa-solid fa-grid-2 text-sm"></i>
                                </button>
                                <button id="listViewBtn" class="view-toggle-btn w-8 h-8 rounded-lg flex items-center justify-center transition-all text-gray-600 hover:bg-gray-200" title="Siyahı görünüşü">
                                    <i class="fa-solid fa-list text-sm"></i>
                                </button>
                            </div>
                        </div>

                        <!-- Files Container with Modern Cards -->
                        <div class="flex-1 p-4 overflow-y-auto bg-gray-50" id="companyFilesContainer">
                            <div class="flex justify-center items-center h-full">
                                <div class="text-center">
                                    <div class="animate-spin w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                                    <p class="text-sm text-gray-500">Fayllar yüklənir...</p>
                                </div>
                            </div>
                        </div>
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
                    <div class="animate-spin w-10 h-10 border-4 border-brand-blue border-t-transparent rounded-full mx-auto mb-3"></div>
                    <p class="text-sm text-gray-500">Fayllar yüklənir...</p>
                </div>
            </div>
        `;

        try {
            const result = await this.fileService.getUserFiles(this.currentFolder, this.currentFilter);
            console.log('📦 Personal files result:', result);

            if (result && result.success) {
                this.allFolders = result.folders || [];
                this.allFiles = result.files || [];

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

        const filteredFolders = this.allFolders.filter(folder =>
            folder.name?.toLowerCase().includes(term)
        );

        const filteredFiles = this.allFiles.filter(file =>
            file.name?.toLowerCase().includes(term) ||
            file.original_filename?.toLowerCase().includes(term)
        );

        this.displayPersonalFiles(container, filteredFolders, filteredFiles);
    }

    searchPersonalFiles(term) {
        this.searchTerm = term;

        if (!term) {
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
                        <div class="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
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

        if (folders.length > 0) {
            html += '<div class="mb-4"><span class="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-full">📁 Qovluqlar</span></div>';
            html += '<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">';
            folders.forEach(item => {
                html += this.getFolderCardHTML(item, 'personal');
            });
            html += '</div>';
        }

        if (files.length > 0) {
            html += '<div class="mb-4"><span class="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-full">📄 Fayllar</span></div>';
            html += '<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">';
            files.forEach(item => {
                html += this.getFileCardHTML(item, 'personal');
            });
            html += '</div>';
        }

        container.innerHTML = html;
        this.attachItemListeners(container, 'personal');
        this.updatePersonalBreadcrumb();
    }

    updatePersonalCounters(data) {
        const fileSpan = document.getElementById('personalFileCount');
        const folderSpan = document.getElementById('personalFolderCount');

        if (fileSpan) fileSpan.innerHTML = `<i class="fa-regular fa-file"></i> ${data.files?.length || 0}`;
        if (folderSpan) folderSpan.innerHTML = `<i class="fa-regular fa-folder"></i> ${data.folders?.length || 0}`;
    }

    updatePersonalBreadcrumb() {
        const nav = document.getElementById('personalBreadcrumb');
        if (!nav) return;

        if (this.currentFolder) {
            const folder = this.fileService._cache.folders?.find(f => f.id == this.currentFolder);
            if (folder) {
                nav.innerHTML = `
                    <i class="fa-solid fa-folder-open text-brand-blue"></i>
                    <a href="#" class="hover:text-brand-blue transition-colors" onclick="window.filesUI.goToPersonalRoot();return false;">Bütün Fayllar</a>
                    <i class="fa-solid fa-chevron-right text-[10px] text-gray-400"></i>
                    <span class="font-medium">${folder.name}</span>
                `;
                return;
            }
        }

        nav.innerHTML = `
            <i class="fa-solid fa-folder-open text-brand-blue"></i>
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

    // ==================== COMPANY PANEL - YENİ DİZAYN ====================

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

        document.getElementById('backButton')?.addEventListener('click', () => {
            this.goBack();
        });

        document.getElementById('gridViewBtn')?.addEventListener('click', () => {
            this.setCompanyViewMode('grid');
        });

        document.getElementById('listViewBtn')?.addEventListener('click', () => {
            this.setCompanyViewMode('list');
        });

        document.getElementById('clearSearchBtn')?.addEventListener('click', () => {
            const searchInput = document.getElementById('companyFileSearch');
            if (searchInput) {
                searchInput.value = '';
                this.searchTerm = '';
                document.getElementById('clearSearchBtn')?.classList.add('hidden');
                this.loadCompanyFiles(this.selectedCompany);
            }
        });

        let searchTimeout;
        document.getElementById('companyFileSearch')?.addEventListener('input', (e) => {
            this.searchTerm = e.target.value;

            const clearBtn = document.getElementById('clearSearchBtn');
            if (clearBtn) {
                if (this.searchTerm) {
                    clearBtn.classList.remove('hidden');
                } else {
                    clearBtn.classList.add('hidden');
                }
            }

            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.searchCompanyFiles(this.searchTerm);
            }, 300);
        });
    }

    setCompanyViewMode(mode) {
        this.companyViewMode = mode;

        const gridBtn = document.getElementById('gridViewBtn');
        const listBtn = document.getElementById('listViewBtn');

        if (mode === 'grid') {
            gridBtn?.classList.add('bg-purple-500', 'text-white');
            gridBtn?.classList.remove('text-gray-600', 'hover:bg-gray-200');
            listBtn?.classList.remove('bg-purple-500', 'text-white');
            listBtn?.classList.add('text-gray-600', 'hover:bg-gray-200');
        } else {
            listBtn?.classList.add('bg-purple-500', 'text-white');
            listBtn?.classList.remove('text-gray-600', 'hover:bg-gray-200');
            gridBtn?.classList.remove('bg-purple-500', 'text-white');
            gridBtn?.classList.add('text-gray-600', 'hover:bg-gray-200');
        }

        if (this.selectedCompany) {
            this.loadCompanyFiles(this.selectedCompany);
        }
    }

    goBack() {
        console.log('⬅️ Geri qayıtma, currentFolder:', this.currentFolder);

        if (!this.currentFolder) {
            return;
        }

        const folder = this.allFolders.find(f => f.id == this.currentFolder);
        if (folder && folder.parent_id) {
            this.goToCompanyFolder(folder.parent_id);
        } else {
            this.goToCompanyRoot();
        }
    }

    closeCompanyPanel() {
        document.getElementById('activePanelContent').classList.add('hidden');
        document.getElementById('mainPanels').style.display = 'flex';
        this.selectedCompany = null;
        this.currentFolder = null;
        this.searchTerm = '';
        this.companySearchTerm = '';

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
                    <div class="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                    <p class="text-xs text-gray-500">Şirkətlər yüklənir...</p>
                </div>
            </div>
        `;

        try {
            const companyCode = this.userCompanyCode || 'AZE26003';
            console.log('🏢 User company code:', companyCode);

            const token = localStorage.getItem('guven_token');

            const ownCompany = {
                id: 'own_' + companyCode,
                uuid: companyCode,
                name: '🏢 Öz Şirkətim',
                code: companyCode,
                type: 'company',
                is_active: true,
                is_own: true
            };

            console.log('🏢 Öz şirkəti əlavə edilir:', ownCompany);

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
                    if (Array.isArray(companiesData)) {
                        companies = companiesData;
                    } else if (companiesData.sub_companies && Array.isArray(companiesData.sub_companies)) {
                        companies = companiesData.sub_companies;
                    } else if (companiesData.data && Array.isArray(companiesData.data)) {
                        companies = companiesData.data;
                    }
                }
            } catch (e) {
                console.warn('Companies fetch xətası:', e);
            }

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
                    if (Array.isArray(partnersData)) {
                        partners = partnersData;
                    } else if (partnersData.items && Array.isArray(partnersData.items)) {
                        partners = partnersData.items;
                    } else if (partnersData.data && Array.isArray(partnersData.data)) {
                        partners = partnersData.data;
                    } else if (partnersData.partners && Array.isArray(partnersData.partners)) {
                        partners = partnersData.partners;
                    }
                }
            } catch (e) {
                console.warn('Partners fetch xətası:', e);
            }

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
            this.companies = [{
                id: 'own_' + (this.userCompanyCode || 'AZE26003'),
                uuid: this.userCompanyCode || 'AZE26003',
                name: '🏢 Öz Şirkətim',
                code: this.userCompanyCode || 'AZE26003',
                type: 'company',
                is_own: true
            }];
            this.partners = [];
            this.renderCompaniesList();
        }
    }

    renderCompaniesList() {
        const container = document.getElementById('companiesList');
        if (!container) return;

        let allItems = [...this.companies, ...this.partners];

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
            container.innerHTML = '<div class="text-center py-8 text-gray-500 text-sm">🔍 Nəticə tapılmadı</div>';
            return;
        }

        let html = '';
        allItems.forEach(item => {
            const isPartner = item.type === 'partner';
            const isOwn = item.is_own || item.code === this.userCompanyCode;
            const isSelected = this.selectedCompany?.id === item.id;

            let bgClass = isSelected ? 'bg-purple-50 border-purple-300' : 'border-transparent hover:bg-purple-50';
            let iconBgClass = isPartner ? 'bg-green-100' : 'bg-purple-100';
            let iconClass = isPartner ? 'text-green-600' : 'text-purple-600';
            let icon = isPartner ? 'fa-handshake' : 'fa-building';

            if (isOwn) {
                iconBgClass = 'bg-blue-100';
                iconClass = 'text-blue-600';
                icon = 'fa-star';
            }

            html += `
                <div class="company-item p-3 rounded-xl cursor-pointer transition-all ${bgClass} border ${isSelected ? 'border-purple-300 shadow-sm' : 'border-gray-200'} mb-2 hover:shadow-md"
                     data-id="${item.id}" data-uuid="${item.uuid || item.id}" data-type="${item.type}" data-code="${item.code || ''}" data-name="${item.name}" data-own="${isOwn}">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl ${iconBgClass} flex items-center justify-center flex-shrink-0">
                            <i class="fa-solid ${icon} ${iconClass}"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2">
                                <span class="text-sm font-medium truncate ${isOwn ? 'text-blue-700' : 'text-gray-800'}">${item.name}</span>
                                ${isOwn ? '<span class="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full whitespace-nowrap">Sizin</span>' : ''}
                            </div>
                            <p class="text-xs text-gray-500">${item.code || ''}</p>
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
                    name: el.dataset.name.replace('🏢 ', ''),
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
            // Şirkəti yadda saxla
            this.selectedCompany = company;
            this.selectedCompanyType = company.type;
            this.currentFolder = null;
            this.searchTerm = '';

            // Axtarış inputunu təmizlə
            const searchInput = document.getElementById('companyFileSearch');
            if (searchInput) searchInput.value = '';

            // Paneli göstər
            document.getElementById('noCompanySelected')?.classList.add('hidden');
            document.getElementById('selectedCompanyFiles')?.classList.remove('hidden');

            // Şirkət adını və kodunu göstər
            document.getElementById('selectedCompanyName').textContent = company.name;
            document.getElementById('selectedCompanyCode').textContent = company.code || '';

            // Faylları yüklə
            await this.loadCompanyFiles(company);

        } catch (error) {
            console.error('❌ selectCompany xətası:', error);
            this.showNotification('Şirkət seçilə bilmədi', 'error');
        }
    }


    async loadCompanyFiles(company) {
        console.log('📂 loadCompanyFiles çağırıldı:', company);

        const container = document.getElementById('companyFilesContainer');
        if (!container) return;

        container.innerHTML = `
            <div class="flex justify-center items-center h-full">
                <div class="text-center">
                    <div class="animate-spin w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                    <p class="text-sm text-gray-500">Fayllar yüklənir...</p>
                </div>
            </div>
        `;

        try {
            if (!company || !company.code) {
                console.error('❌ Şirkət kodu yoxdur');
                container.innerHTML = this.getCompanyErrorStateHTML();
                return;
            }

            let companyService = window.companyFolderService;
            if (!companyService && window.CompanyFolderService) {
                companyService = new window.CompanyFolderService();
                window.companyFolderService = companyService;
            }

            if (!companyService) {
                console.error('❌ CompanyFolderService tapılmadı');
                container.innerHTML = this.getCompanyErrorStateHTML();
                return;
            }

            // ========== DƏYİŞİKLİK BURADADIR ==========
            // parentId parametri ilə çağırın
            const folders = await companyService.loadCompanyFolders(company.code, this.currentFolder);
            console.log('📁 Yüklənən qovluqlar:', folders);
            // ==========================================

            // Faylları yüklə - getFiles metodu artıq folder_id qəbul edir
            const filesResult = await companyService.getFiles(company.code, this.currentFolder);
            const files = filesResult.success ? filesResult.data : [];

            // Sayğacları yenilə
            document.getElementById('companyFileCount').innerHTML = `<i class="fa-regular fa-file"></i> ${files.length}`;
            document.getElementById('companyFolderCount').innerHTML = `<i class="fa-regular fa-folder"></i> ${folders.length}`;

            // Qovluqları və faylları cache-də saxla (breadcrumb üçün)
            this.allFolders = folders;
            this.allFiles = files;

            // Qovluqları göstər
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

    filterItemsBySearch() {
        const term = this.searchTerm.toLowerCase();

        const filteredFolders = this.allFolders.filter(folder =>
            folder.name?.toLowerCase().includes(term)
        );

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
                container.innerHTML = `
                    <div class="flex flex-col items-center justify-center h-full py-8">
                        <div class="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                            <i class="fa-solid fa-search text-3xl text-gray-400"></i>
                        </div>
                        <h4 class="text-sm font-semibold text-gray-700 mb-1">Nəticə tapılmadı</h4>
                        <p class="text-xs text-gray-400">"${this.searchTerm}" üçün heç nə tapılmadı</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = this.getCompanyEmptyStateHTML();
            return;
        }

        let html = '';

        if (this.companyViewMode === 'list') {
            if (folders.length > 0) {
                html += '<div class="mb-4"><span class="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-full">📁 Qovluqlar</span></div>';
                folders.forEach(item => {
                    html += this.getCompanyFolderListHTML(item);
                });
            }

            if (files.length > 0) {
                if (folders.length > 0) html += '<div class="mt-6 mb-4"><span class="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-full">📄 Fayllar</span></div>';
                files.forEach(item => {
                    html += this.getCompanyFileListHTML(item);
                });
            }
        } else {
            if (folders.length > 0) {
                html += '<div class="mb-4"><span class="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-full">📁 Qovluqlar</span></div>';
                html += '<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">';
                folders.forEach(item => {
                    html += this.getCompanyFolderCardHTML(item);
                });
                html += '</div>';
            }

            if (files.length > 0) {
                html += '<div class="mb-4"><span class="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-full">📄 Fayllar</span></div>';
                html += '<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">';
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

    // ==================== YENİ BREADCRUMB METODU ====================
    async updateCompanyBreadcrumb(folderId) {
        const nav = document.getElementById('companyBreadcrumb');
        if (!nav || !this.selectedCompany) return;

        console.log('🍞 Breadcrumb yenilənir, folderId:', folderId);

        try {
            let breadcrumbHtml = '<i class="fa-solid fa-folder-open text-purple-500 mr-1"></i>';

            if (!folderId) {
                breadcrumbHtml += '<span class="font-medium">Bütün Fayllar</span>';
            } else {
                breadcrumbHtml += `
                    <a href="#" class="hover:text-purple-600 transition-colors breadcrumb-link" data-folder-id="">Bütün Fayllar</a>
                    <i class="fa-solid fa-chevron-right text-[10px] text-gray-400 mx-1"></i>
                `;

                const folderPath = await this.getFolderPath(folderId);

                if (folderPath && folderPath.length > 0) {
                    folderPath.forEach((folder, index) => {
                        if (index === folderPath.length - 1) {
                            breadcrumbHtml += `<span class="font-medium">${this.escapeHtml(folder.name)}</span>`;
                        } else {
                            breadcrumbHtml += `
                                <a href="#" class="hover:text-purple-600 transition-colors breadcrumb-link" data-folder-id="${folder.id}">${this.escapeHtml(folder.name)}</a>
                                <i class="fa-solid fa-chevron-right text-[10px] text-gray-400 mx-1"></i>
                            `;
                        }
                    });
                } else {
                    breadcrumbHtml += `<span class="font-medium">Qovluq</span>`;
                }
            }

            nav.innerHTML = breadcrumbHtml;

            nav.querySelectorAll('.breadcrumb-link').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const targetFolderId = link.dataset.folderId;

                    if (targetFolderId === '') {
                        this.goToCompanyRoot();
                    } else {
                        this.goToCompanyFolder(targetFolderId);
                    }
                });
            });

        } catch (error) {
            console.error('❌ Breadcrumb xətası:', error);
            nav.innerHTML = `
                <i class="fa-solid fa-folder-open text-purple-500 mr-1"></i>
                <a href="#" class="hover:text-purple-600 transition-colors" onclick="window.filesUI.goToCompanyRoot();return false;">Bütün Fayllar</a>
            `;
        }
    }

    async getFolderPath(folderId) {
        if (!folderId || !this.selectedCompany) return [];
    
        try {
            let allFolders = this.foldersCache.get(this.selectedCompany.code) || [];

            if (allFolders.length === 0) {
                const companyService = window.companyFolderService;
                if (companyService) {
                    // parentId = null ilə bütün qovluqları yüklə
                    const result = await companyService.getFolders(this.selectedCompany.code, null);
                    if (result.success) {
                        allFolders = result.data;
                        this.foldersCache.set(this.selectedCompany.code, allFolders);
                    }
                }
            }

            const path = [];
            let currentId = folderId;
            let maxDepth = 10;

            while (currentId && maxDepth > 0) {
                const folder = allFolders.find(f => f.id == currentId);
                if (!folder) break;

                path.unshift(folder);
                currentId = folder.parent_id;
                maxDepth--;
            }

            console.log('🗺️ Qovluq yolu:', path.map(p => p.name));
            return path;

        } catch (error) {
            console.error('❌ getFolderPath xətası:', error);
            return [];
        }
    }

    goToCompanyFolder(folderId) {
        if (!this.selectedCompany) return;

        this.searchTerm = '';
        const searchInput = document.getElementById('companyFileSearch');
        if (searchInput) {
            searchInput.value = '';
            document.getElementById('clearSearchBtn')?.classList.add('hidden');
        }

        this.currentFolder = folderId;
        this.updateCompanyBreadcrumb(folderId);
        this.loadCompanyFiles(this.selectedCompany);
    }

    goToCompanyRoot() {
        this.searchTerm = '';
        const searchInput = document.getElementById('companyFileSearch');
        if (searchInput) {
            searchInput.value = '';
            document.getElementById('clearSearchBtn')?.classList.add('hidden');
        }

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
                let companyService = window.companyFolderService;

                if (!companyService) {
                    if (window.CompanyFolderService) {
                        companyService = new window.CompanyFolderService();
                        window.companyFolderService = companyService;
                    } else {
                        this.showNotification('Xəta: Service tapılmadı', 'error');
                        return;
                    }
                }

                const result = await companyService.createFolder(
                    name.trim(),
                    this.selectedCompany.code,
                    this.currentFolder
                );

                if (result && result.success) {
                    this.showNotification(`"${name}" qovluğu yaradıldı`, 'success');

                    if (companyService.loadUserPermissions) {
                        companyService.loadUserPermissions(this.selectedCompany.code).catch(() => {});
                    }

                    setTimeout(() => {
                        this.loadCompanyFiles(this.selectedCompany);
                    }, 500);
                } else {
                    const errorMsg = result?.error || 'Qovluq yaradıla bilmədi';
                    this.showNotification(errorMsg, 'error');
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
                    const result = await companyService.deleteFolder(folderId, companyCode);

                    if (result.success) {
                        this.showNotification('Qovluq silindi', 'success');
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

    // ==================== YENİ KART DİZAYNLARI ====================

    getCompanyFolderListHTML(item) {
        const createdByName = item.created_by_name || 'Naməlum';
        const itemCount = item.item_count || 0;

        return `
            <div class="folder-list-item group bg-white rounded-xl border border-gray-200 hover:shadow-md transition-all cursor-pointer mb-2 overflow-hidden" 
                 data-id="${item.id}" data-uuid="${item.uuid}" data-type="folder">
                <div class="flex items-center p-3">
                    <div class="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0 mr-3">
                        <i class="fa-solid fa-folder text-purple-600 text-xl"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between">
                            <p class="text-sm font-medium text-gray-800 truncate" title="${item.name}">${item.name}</p>
                            <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button class="permission-btn w-7 h-7 rounded-lg bg-purple-100 text-purple-600 hover:bg-purple-200 transition-colors flex items-center justify-center" data-id="${item.id}" data-name="${item.name}" title="İcazə ver">
                                    <i class="fa-solid fa-user-lock text-xs"></i>
                                </button>
                                <button class="delete-folder-btn w-7 h-7 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors flex items-center justify-center" data-id="${item.id}" title="Sil">
                                    <i class="fa-solid fa-trash text-xs"></i>
                                </button>
                            </div>
                        </div>
                        <div class="flex items-center gap-2 text-xs text-gray-500 mt-1">
                            <span>${this.formatDate(item.created_at)}</span>
                            ${itemCount > 0 ? `<span class="w-1 h-1 rounded-full bg-gray-300"></span><span>${itemCount} fayl</span>` : ''}
                            <span class="w-1 h-1 rounded-full bg-gray-300"></span>
                            <span>${createdByName}</span>
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

        return `
            <div class="file-list-item group bg-white rounded-xl border border-gray-200 hover:shadow-md transition-all cursor-pointer mb-2 overflow-hidden" 
                 data-id="${item.file_uuid || item.uuid}" data-uuid="${item.file_uuid || item.uuid}" data-type="file">
                <div class="flex items-center p-3">
                    <div class="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0 mr-3 overflow-hidden">
                        ${isImage ? 
                            `<img src="${this.fileService?.getFileUrl({uuid: item.file_uuid}) || '#'}" class="w-full h-full object-cover" alt="${item.original_filename}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">` : 
                            `<i class="fa-solid ${icon} text-purple-600 text-xl"></i>`
                        }
                        ${isImage ? `<i class="fa-solid ${icon} text-purple-600 text-xl hidden"></i>` : ''}
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between">
                            <p class="text-sm font-medium text-gray-800 truncate" title="${item.original_filename}">${item.original_filename}</p>
                            <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button class="download-btn w-7 h-7 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition-colors flex items-center justify-center" data-id="${item.file_uuid || item.uuid}" title="Yüklə">
                                    <i class="fa-solid fa-download text-xs"></i>
                                </button>
                                <button class="delete-file-btn w-7 h-7 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors flex items-center justify-center" data-id="${item.file_uuid || item.uuid}" title="Sil">
                                    <i class="fa-solid fa-trash text-xs"></i>
                                </button>
                            </div>
                        </div>
                        <div class="flex items-center gap-2 text-xs text-gray-500 mt-1">
                            <span class="uppercase">${fileExt}</span>
                            <span class="w-1 h-1 rounded-full bg-gray-300"></span>
                            <span>${size}</span>
                            <span class="w-1 h-1 rounded-full bg-gray-300"></span>
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

        return `
            <div class="file-item group relative bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-all cursor-pointer overflow-hidden" 
                 data-id="${item.file_uuid || item.uuid}" data-uuid="${item.file_uuid || item.uuid}" data-type="file">
                <div class="p-4">
                    <div class="flex flex-col items-center text-center">
                        <div class="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center mb-3 overflow-hidden shadow-sm">
                            ${isImage ? 
                                `<img src="${this.fileService?.getFileUrl({uuid: item.file_uuid}) || '#'}" class="w-full h-full object-cover" alt="${item.original_filename}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">` : 
                                `<i class="fa-solid ${icon} text-2xl text-purple-600"></i>`
                            }
                            ${isImage ? `<i class="fa-solid ${icon} text-2xl text-purple-600 hidden"></i>` : ''}
                        </div>
                        <p class="text-sm font-medium text-gray-800 truncate w-full mb-1" title="${item.original_filename}">${item.original_filename}</p>
                        <div class="flex items-center justify-center gap-2 text-xs text-gray-500">
                            <span class="uppercase bg-gray-100 px-2 py-0.5 rounded-full">${fileExt}</span>
                            <span>•</span>
                            <span>${size}</span>
                        </div>
                        <p class="text-xs text-gray-400 mt-2">${item.uploaded_by_name || ''}</p>
                    </div>
                </div>
                
                <!-- Hover Actions -->
                <div class="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button class="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-blue-600 hover:bg-blue-500 hover:text-white transition-colors shadow-lg transform hover:scale-110" 
                            data-action="info" data-id="${item.file_uuid || item.uuid}" title="Məlumat">
                        <i class="fa-solid fa-info"></i>
                    </button>
                    <button class="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-green-600 hover:bg-green-500 hover:text-white transition-colors shadow-lg transform hover:scale-110 download-btn" 
                            data-id="${item.file_uuid || item.uuid}" title="Yüklə">
                        <i class="fa-solid fa-download"></i>
                    </button>
                    <button class="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-red-600 hover:bg-red-500 hover:text-white transition-colors shadow-lg transform hover:scale-110 delete-file-btn" 
                            data-id="${item.file_uuid || item.uuid}" title="Sil">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }

    getCompanyFolderCardHTML(item) {
        const createdByName = item.created_by_name || 'Naməlum';
        const itemCount = item.item_count || 0;

        return `
            <div class="folder-item group relative bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-all cursor-pointer overflow-hidden" 
                 data-id="${item.id}" data-uuid="${item.uuid}" data-type="folder">
                <div class="p-4">
                    <div class="flex flex-col items-center text-center">
                        <div class="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center mb-3 shadow-sm">
                            <i class="fa-solid fa-folder text-3xl text-purple-600"></i>
                        </div>
                        <p class="text-sm font-medium text-gray-800 truncate w-full mb-1" title="${item.name}">${item.name}</p>
                        <div class="flex items-center gap-2 text-xs text-gray-500">
                            <span>${this.formatDate(item.created_at)}</span>
                            ${itemCount > 0 ? `<span class="bg-gray-100 px-2 py-0.5 rounded-full">${itemCount} fayl</span>` : ''}
                        </div>
                        <p class="text-xs text-gray-400 mt-2">${createdByName}</p>
                    </div>
                </div>
                
                <!-- Hover Actions -->
                <div class="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button class="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-purple-600 hover:bg-purple-500 hover:text-white transition-colors shadow-lg transform hover:scale-110 permission-btn" 
                            data-id="${item.id}" data-name="${item.name}" title="İcazə ver">
                        <i class="fa-solid fa-user-lock"></i>
                    </button>
                    <button class="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-blue-600 hover:bg-blue-500 hover:text-white transition-colors shadow-lg transform hover:scale-110 action-btn" 
                            data-action="info" data-id="${item.id}" title="Məlumat">
                        <i class="fa-solid fa-info"></i>
                    </button>
                    <button class="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-red-600 hover:bg-red-500 hover:text-white transition-colors shadow-lg transform hover:scale-110 delete-folder-btn" 
                            data-id="${item.id}" title="Sil">
                        <i class="fa-solid fa-trash"></i>
                    </button>
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

        // files.ui.js - attachCompanyItemListeners metodunda İCAZƏ DÜYMƏSİ hissəsi (DÜZƏLDİLMİŞ)

        // İcazə düyməsi
        container.querySelectorAll('.permission-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const folderId = btn.dataset.id;
                const folderName = btn.dataset.name;

                console.log('🔐 İcazə düyməsi klikləndi:', { folderId, folderName });

                // Folder obyekti yarat
                const folder = {
                    id: folderId,
                    name: folderName || 'Qovluq'
                };

                // CompanyFolderService-i əldə et
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

                // FolderPermissionModal instance yarat və global olaraq təyin et
                if (!window.folderPermissionModal) {
                    window.folderPermissionModal = new FolderPermissionModal(companyService);
                }

                // Modalı aç
                window.folderPermissionModal.open(
                    folder,
                    this.selectedCompany.code,
                    () => {
                        // İcazələr yadda saxlanandan sonra yenilə
                        console.log('✅ İcazələr yadda saxlandı, panel yenilənir...');
                        this.loadCompanyFiles(this.selectedCompany);
                    }
                );
            });
        });
    }

    // ==================== KÖMƏKÇİ METODLAR ====================

    formatDate(dateString) {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('az-AZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
                    let folderIdToSend = this.currentFolder;

                    if (folderIdToSend && folderIdToSend !== 'null' && folderIdToSend !== 'undefined') {
                        console.log('📂 Qovluq ID göndəriləcək:', folderIdToSend);
                    } else {
                        folderIdToSend = null;
                    }

                    for (const file of files) {
                        try {
                            const result = await this.fileService?.uploadFileForCompany(
                                file,
                                this.selectedCompany.code || this.selectedCompany.id,
                                'COMPANY_FILE',
                                folderIdToSend
                            );

                            if (result?.success) {
                                uploadedCount++;
                            } else {
                                errorCount++;
                            }
                        } catch (error) {
                            errorCount++;
                        }
                    }

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
            <div class="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-bold text-gray-800">${title}</h3>
                    <button class="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors flex items-center justify-center" onclick="this.closest('.fixed').remove()">
                        <i class="fa-solid fa-times"></i>
                    </button>
                </div>
                <p class="text-sm text-gray-600 mb-4">
                    Paylaşma funksiyası hazırlanır
                </p>
                <div class="flex justify-end gap-2">
                    <button class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium transition-colors" onclick="this.closest('.fixed').remove()">Bağla</button>
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
            <div class="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-bold text-gray-800">Fayl məlumatları</h3>
                    <button class="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors flex items-center justify-center" onclick="this.closest('.fixed').remove()">
                        <i class="fa-solid fa-times"></i>
                    </button>
                </div>
                <div class="space-y-3 text-sm">
                    <div class="flex">
                        <span class="w-24 text-gray-500">Ad:</span>
                        <span class="flex-1 font-medium text-gray-800">${item.name}</span>
                    </div>
                    <div class="flex">
                        <span class="w-24 text-gray-500">Tip:</span>
                        <span class="flex-1 text-gray-800">${item.type === 'folder' ? 'Qovluq' : (item.file_extension || 'Fayl')}</span>
                    </div>
                    <div class="flex">
                        <span class="w-24 text-gray-500">Ölçü:</span>
                        <span class="flex-1 text-gray-800">${item.type === 'folder' ? '-' : (this.fileService?.formatFileSize(item.size) || '0 B')}</span>
                    </div>
                    <div class="flex">
                        <span class="w-24 text-gray-500">Tarix:</span>
                        <span class="flex-1 text-gray-800">${this.fileService?.formatDate(item.created_at) || '-'}</span>
                    </div>
                    <div class="flex">
                        <span class="w-24 text-gray-500">Yer:</span>
                        <span class="flex-1 text-gray-800">${isPersonal ? 'Şəxsi' : 'Şirkət'}</span>
                    </div>
                </div>
                <div class="flex justify-end mt-4">
                    <button class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium transition-colors" onclick="this.closest('.fixed').remove()">Bağla</button>
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
                <div class="relative max-w-4xl max-h-[90vh]">
                    <button class="absolute -top-10 right-0 text-white text-xl hover:text-gray-300 transition-colors" onclick="this.closest('.fixed').remove()">
                        <i class="fa-solid fa-times"></i>
                    </button>
                    <img src="${this.fileService?.getFileUrl(file)}" class="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl" alt="${file.name}">
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
        notification.className = `files-notification fixed top-4 right-4 z-[9999] px-4 py-3 rounded-xl shadow-2xl transform transition-all duration-300 text-sm font-medium ${
            type === 'success' ? 'bg-gradient-to-r from-green-500 to-green-600 text-white' : 
            type === 'error' ? 'bg-gradient-to-r from-red-500 to-red-600 text-white' : 
            'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
        }`;

        notification.innerHTML = `
            <div class="flex items-center gap-2">
                <i class="fa-solid fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
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
                <div class="w-20 h-20 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-4">
                    <i class="fa-solid ${icon} text-4xl ${iconColor}"></i>
                </div>
                <h4 class="text-lg font-semibold text-gray-700 mb-2">${title}</h4>
                <p class="text-sm text-gray-400 mb-4">Fayl yükləyin</p>
                <button class="px-4 py-2 ${btnColor} text-white rounded-xl hover:opacity-90 text-sm font-medium transition-all hover:scale-105 upload-panel-btn" onclick="document.getElementById('upload${isPersonal ? 'Personal' : 'Company'}FileBtn').click()">
                    <i class="fa-solid fa-upload mr-1"></i> Yüklə
                </button>
            </div>
        `;
    }

    getCompanyEmptyStateHTML() {
        return `
            <div class="flex flex-col items-center justify-center h-full py-8">
                <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/10 to-purple-100/30 flex items-center justify-center mb-4">
                    <i class="fa-solid fa-cloud-upload-alt text-4xl text-purple-500/50"></i>
                </div>
                <h4 class="text-lg font-semibold text-gray-700 mb-2">Fayl yoxdur</h4>
                <p class="text-sm text-gray-400 mb-4">Fayl yükləyin</p>
                <button class="px-4 py-2 bg-purple-500 text-white rounded-xl hover:opacity-90 text-sm font-medium transition-all hover:scale-105 upload-company-btn" onclick="document.getElementById('uploadCompanyFileBtn').click()">
                    <i class="fa-solid fa-upload mr-1"></i> Yüklə
                </button>
            </div>
        `;
    }

    getCompanyErrorStateHTML() {
        return `
            <div class="flex flex-col items-center justify-center h-full py-8">
                <div class="w-20 h-20 rounded-2xl bg-red-100 flex items-center justify-center mb-4">
                    <i class="fa-solid fa-exclamation-triangle text-4xl text-red-500"></i>
                </div>
                <h4 class="text-lg font-semibold text-gray-700 mb-2">Yükləmə xətası</h4>
                <button class="px-4 py-2 bg-purple-500 text-white rounded-xl hover:opacity-90 text-sm font-medium transition-all hover:scale-105" onclick="window.filesUI.loadCompanyFiles(window.filesUI.selectedCompany)">
                    <i class="fa-solid fa-rotate-right mr-1"></i> Yenidən
                </button>
            </div>
        `;
    }

    getErrorStateHTML(panelType) {
        const isPersonal = panelType === 'personal';
        const btnColor = isPersonal ? 'bg-brand-blue' : 'bg-purple-500';

        return `
            <div class="flex flex-col items-center justify-center h-full py-8">
                <div class="w-20 h-20 rounded-2xl bg-red-100 flex items-center justify-center mb-4">
                    <i class="fa-solid fa-exclamation-triangle text-4xl text-red-500"></i>
                </div>
                <h4 class="text-lg font-semibold text-gray-700 mb-2">Yükləmə xətası</h4>
                <button class="px-4 py-2 ${btnColor} text-white rounded-xl hover:opacity-90 text-sm font-medium transition-all hover:scale-105" onclick="window.filesUI.${isPersonal ? 'loadPersonalFiles' : 'loadCompanyFiles'}(window.filesUI.selectedCompany)">
                    <i class="fa-solid fa-rotate-right mr-1"></i> Yenidən
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
            <div class="folder-item group relative bg-white rounded-xl border ${isSelected ? 'border-brand-blue ring-2 ring-brand-blue/20' : 'border-gray-200'} hover:shadow-lg transition-all cursor-pointer overflow-hidden" data-id="${item.id}" data-type="folder" data-panel="${panelType}">
                <div class="absolute top-2 right-2 z-10">
                    <input type="checkbox" class="item-checkbox w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue" ${isSelected ? 'checked' : ''} data-id="${item.id}">
                </div>
                <div class="p-3">
                    <div class="flex flex-col items-center text-center">
                        <div class="w-14 h-14 rounded-xl bg-gradient-to-br ${bgColor} flex items-center justify-center mb-2">
                            <i class="fa-solid fa-folder text-2xl ${iconColor}"></i>
                        </div>
                        <p class="text-sm font-medium text-gray-700 truncate w-full mb-1" title="${item.name}">${item.name}</p>
                        <p class="text-xs text-gray-400">${this.fileService?.formatDate(item.created_at) || '-'}</p>
                    </div>
                </div>
                <!-- Hover Actions -->
                <div class="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                    <button class="w-7 h-7 bg-white rounded-lg flex items-center justify-center text-blue-600 hover:bg-blue-500 hover:text-white transition-colors shadow-lg action-btn" data-action="info" data-id="${item.id}" title="Məlumat">
                        <i class="fa-solid fa-info text-xs"></i>
                    </button>
                    <button class="w-7 h-7 bg-white rounded-lg flex items-center justify-center text-green-600 hover:bg-green-500 hover:text-white transition-colors shadow-lg action-btn" data-action="share" data-id="${item.id}" title="Paylaş">
                        <i class="fa-solid fa-share-nodes text-xs"></i>
                    </button>
                    <button class="w-7 h-7 bg-white rounded-lg flex items-center justify-center text-brand-blue hover:bg-brand-blue hover:text-white transition-colors shadow-lg download-btn" data-id="${item.id}" title="Yüklə">
                        <i class="fa-solid fa-download text-xs"></i>
                    </button>
                    <button class="w-7 h-7 bg-white rounded-lg flex items-center justify-center text-red-600 hover:bg-red-500 hover:text-white transition-colors shadow-lg delete-btn" data-id="${item.id}" title="Sil">
                        <i class="fa-solid fa-trash text-xs"></i>
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
            <div class="file-item group relative bg-white rounded-xl border ${isSelected ? 'border-brand-blue ring-2 ring-brand-blue/20' : 'border-gray-200'} hover:shadow-lg transition-all cursor-pointer overflow-hidden" data-id="${item.id}" data-type="file" data-panel="${panelType}">
                <div class="absolute top-2 right-2 z-10">
                    <input type="checkbox" class="item-checkbox w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue" ${isSelected ? 'checked' : ''} data-id="${item.id}">
                </div>
                <div class="p-3">
                    <div class="flex flex-col items-center text-center">
                        <div class="w-14 h-14 rounded-xl bg-gradient-to-br ${bgColor} flex items-center justify-center mb-2 overflow-hidden">
                            ${isImage ? 
                                `<img src="${this.fileService?.getFileUrl(item) || '#'}" class="w-full h-full object-cover" alt="${item.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">` : 
                                `<i class="fa-solid ${icon} text-2xl text-gray-500"></i>`
                            }
                            ${isImage ? `<i class="fa-solid ${icon} text-2xl text-gray-500 hidden"></i>` : ''}
                        </div>
                        <p class="text-sm font-medium text-gray-700 truncate w-full mb-1" title="${item.name}">${item.name}</p>
                        <div class="flex items-center justify-center gap-1 text-xs text-gray-400">
                            <span class="uppercase">${item.file_extension?.toUpperCase() || item.name?.split('.').pop()?.toUpperCase() || 'FILE'}</span>
                            <span>•</span>
                            <span>${size}</span>
                        </div>
                    </div>
                </div>
                <!-- Hover Actions -->
                <div class="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                    <button class="w-7 h-7 bg-white rounded-lg flex items-center justify-center text-blue-600 hover:bg-blue-500 hover:text-white transition-colors shadow-lg action-btn" data-action="info" data-id="${item.id}" title="Məlumat">
                        <i class="fa-solid fa-info text-xs"></i>
                    </button>
                    <button class="w-7 h-7 bg-white rounded-lg flex items-center justify-center text-green-600 hover:bg-green-500 hover:text-white transition-colors shadow-lg action-btn" data-action="share" data-id="${item.id}" title="Paylaş">
                        <i class="fa-solid fa-share-nodes text-xs"></i>
                    </button>
                    <button class="w-7 h-7 bg-white rounded-lg flex items-center justify-center text-brand-blue hover:bg-brand-blue hover:text-white transition-colors shadow-lg download-btn" data-id="${item.id}" title="Yüklə">
                        <i class="fa-solid fa-download text-xs"></i>
                    </button>
                    <button class="w-7 h-7 bg-white rounded-lg flex items-center justify-center text-red-600 hover:bg-red-500 hover:text-white transition-colors shadow-lg delete-btn" data-id="${item.id}" title="Sil">
                        <i class="fa-solid fa-trash text-xs"></i>
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
                        this.updateCompanyBreadcrumb(folder.id);
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
                item.classList.add('border-brand-blue', 'ring-2', 'ring-brand-blue/20');
            } else {
                item.classList.remove('border-brand-blue', 'ring-2', 'ring-brand-blue/20');
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