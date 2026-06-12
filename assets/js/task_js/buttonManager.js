/**
 * Professional Button Manager
 * Handles all button functionality in Task Manager Pro
 */

class ButtonManager {
    constructor(taskManager) {
        this.taskManager = taskManager;
        this.modalManager = window.ModalManager || null;

        // Notification service-i düzgün yüklə
        this.notificationService = window.notificationService || null;

        // Əgər notificationService yoxdursa, fallback yarat
        if (!this.notificationService) {
            this.notificationService = this.createFallbackNotificationService();
        }

        this.init();
    }



    init() {
        console.log('🔄 Button Manager başladılır...');
        this.setupButtonListeners();
        this.setupKeyboardShortcuts();
        this.setupTooltips();
        this.updateButtonStates();

    }

    createFallbackNotificationService() {
        return {
            showSuccess: (msg) => {
                // console.log('✅ Success:', msg); // BUNU SİLİN
                if (typeof Swal !== 'undefined') {
                    Swal.fire('Uğurlu!', msg, 'success');
                } else {

                    return;
                }
            },
            showError: (msg) => {

                if (typeof Swal !== 'undefined') {
                    Swal.fire('Xəta!', msg, 'error');
                } else {
                    return;
                }
            },
            showInfo: (msg) => {
                if (typeof Swal !== 'undefined') {
                    Swal.fire('Məlumat', msg, 'info');
                } else {
                    return;
                }
            },
            showWarning: (msg) => {
                if (typeof Swal !== 'undefined') {
                    Swal.fire('Xəbərdarlıq', msg, 'warning');
                } else {
                    // alert('⚠️ ' + msg); // alert də istəmirsinizsə, bunu da silin
                    return;
                }
            },
            show: (message, type = 'info') => {
                const service = this;
                switch(type) {
                    case 'success':
                        service.showSuccess(message);
                        break;
                    case 'error':
                        service.showError(message);
                        break;
                    case 'info':
                        service.showInfo(message);
                        break;
                    case 'warning':
                        service.showWarning(message);
                        break;
                    default:
                        service.showInfo(message);
                }
            }
        };
    }

    // ==================== BUTTON SETUP ====================

    setupButtonListeners() {
        this.setupNavigationButtons();
        this.setupActionButtons();
        this.setupTableButtons();
        this.setupModalButtons();
        this.setupFormButtons();
        this.setupUtilityButtons();
        this.setupProfileButtons();
    }

    setupNavigationButtons() {
        // Back Home Button
        const backHomeBtn = document.getElementById('backHomeBtn');
        if (backHomeBtn) {
            backHomeBtn.addEventListener('click', () => {
                this.handleNavigation('home');
            });
        }

        // Back Panel Button
        const backPanelBtn = document.getElementById('backPanelBtn');
        if (backPanelBtn) {
            backPanelBtn.addEventListener('click', () => {
                this.handleNavigation('panel');
            });
        }

        // Refresh Button
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.handleRefresh();
            });
        }
    }

    setupActionButtons() {
        // New Task Button
        const openModalBtn = document.getElementById('openModalBtn');
        if (openModalBtn) {
            openModalBtn.addEventListener('click', () => {
                this.openTaskModal();
            });
        }

        // Filter Button
        const openFilterBtn = document.getElementById('openFilterBtn');
        if (openFilterBtn) {
            openFilterBtn.addEventListener('click', () => {
                this.openFilterModal();
            });
        }

        // Edit Button (Serial Request)
        const openSerialRequestBtn = document.getElementById('openSerialRequestBtn');
        if (openSerialRequestBtn) {
            openSerialRequestBtn.addEventListener('click', () => {
                this.openSerialRequestModal();
            });
        }

        // Export Button
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.handleExport();
            });
        }
    }

    setupTableButtons() {
        const activeSortBtn = document.getElementById('activeSortBtn');
        if (activeSortBtn) {
            activeSortBtn.addEventListener('click', () => {
                this.showSortOptions('active');
            });
        }

        const activeColumnsBtn = document.getElementById('activeColumnsBtn');
        if (activeColumnsBtn) {
            activeColumnsBtn.addEventListener('click', () => {
                this.toggleTableColumns('active');
            });
        }

        const activeSearchBtn = document.getElementById('activeSearchBtn');
        if (activeSearchBtn) {
            activeSearchBtn.addEventListener('click', () => {
                this.showSearchInput('active');
            });
        }

        // Digər şirkətlər işləri üçün düymələr
        const externalSortBtn = document.getElementById('externalSortBtn');
        if (externalSortBtn) {
            externalSortBtn.addEventListener('click', () => {
                this.showSortOptions('external');
            });
        }

        const externalColumnsBtn = document.getElementById('externalColumnsBtn');
        if (externalColumnsBtn) {
            externalColumnsBtn.addEventListener('click', () => {
                this.toggleTableColumns('external');
            });
        }

        const externalSearchBtn = document.getElementById('externalSearchBtn');
        if (externalSearchBtn) {
            externalSearchBtn.addEventListener('click', () => {
                this.showSearchInput('external');
            });
        }

        // Load More Buttons
        this.setupLoadMoreButtons();
        this.setupDynamicTableButtons();
    }

    setupModalButtons() {
        // Close Buttons
        document.querySelectorAll('.close-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.closeModal(e.target.closest('.modal-backdrop'));
            });
        });

        // Modal Cancel Buttons
        document.querySelectorAll('[id$="Btn"][id*="cancel"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.handleCancel(e.target);
            });
        });


        const taskForm = document.getElementById('taskForm');
        if (taskForm) {
            taskForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                console.log('📝 Task form submit edildi');

                try {
                    // 1. Əvvəlcə window.taskManager yoxla
                    if (window.taskManager && typeof window.taskManager.handleTaskFormSubmit === 'function') {
                        console.log('✅ taskManager.handleTaskFormSubmit çağırılır');
                        await window.taskManager.handleTaskFormSubmit(e);
                    }
                    // 2. Əgər taskManager yoxdursa, amma TaskManager class-ı varsa
                    else if (typeof TaskManager !== 'undefined' && typeof TaskManager.prototype.handleTaskFormSubmit === 'function') {
                        console.log('✅ TaskManager class-ından instance yaradılır');
                        const taskManagerInstance = new TaskManager();
                        await taskManagerInstance.handleTaskFormSubmit(e);
                    }
                    // 3. Əgər heç biri yoxdursa, ButtonManager-in öz funksiyasını istifadə et
                    else {

                    }
                } catch (error) {
                    console.error('❌ Task form submit xətası:', error);
                    this.showNotification('error', 'Task yaradılarkən xəta: ' + error.message);
                }
            });
        }
    }

    setupFormButtons() {
        // Form Tab Navigation
        const prevTabBtn = document.getElementById('prevTabBtn');
        const nextTabBtn = document.getElementById('nextTabBtn');

        if (prevTabBtn) {
            prevTabBtn.addEventListener('click', () => {
                this.navigateFormTab(-1);
            });
        }

        if (nextTabBtn) {
            nextTabBtn.addEventListener('click', () => {
                this.navigateFormTab(1);
            });
        }

        // Form Tabs
        document.querySelectorAll('.form-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchFormTab(e.target.dataset.tab);
            });
        });

        // File Upload
        const fileDropZone = document.getElementById('fileDropZone');
        const fileInput = document.getElementById('taskAttachment');

        if (fileDropZone && fileInput) {
            this.setupFileUpload(fileDropZone, fileInput);
        }

        // Form Reset
        const resetFiltersBtn = document.getElementById('resetFiltersBtn');
        if (resetFiltersBtn) {
            resetFiltersBtn.addEventListener('click', () => {
                this.resetFilters();
            });
        }
    }

    setupUtilityButtons() {
        // Theme Toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }

        // Archive Toggle Button
        const archiveToggleBtn = document.getElementById('archiveToggleBtn');
        if (archiveToggleBtn) {
            archiveToggleBtn.addEventListener('click', () => {
                this.toggleArchiveSection();
            });
        }

        // Export Archive
        const exportArchiveBtn = document.getElementById('exportArchiveBtn');
        if (exportArchiveBtn) {
            exportArchiveBtn.addEventListener('click', () => {
                this.exportArchive();
            });
        }
    }

    /**
     * Arxiv bölməsini aç/bağla
     */
    toggleArchiveSection() {
        const archiveSection = document.querySelector('.archive-section');
        const toggleBtn = document.getElementById('archiveToggleBtn');

        if (!archiveSection || !toggleBtn) return;

        const toggleIcon = toggleBtn.querySelector('i');
        const toggleText = toggleBtn.querySelector('span');

        if (archiveSection.classList.contains('hidden')) {
            // Arxiv bölməsini aç
            archiveSection.classList.remove('hidden');
            toggleBtn.classList.add('active');
            if (toggleText) toggleText.textContent = 'Arxiv İşləri Gizlət';
            if (toggleIcon) toggleIcon.className = 'fas fa-archive';

            // Əgər arxiv məlumatları yoxdursa, ArchiveTableManager ilə yüklə
            const archiveTableBody = document.getElementById('archiveTableBody');
            if (archiveTableBody && archiveTableBody.querySelector('.empty-row')) {
                if (window.ArchiveTableManager) {
                    window.ArchiveTableManager.loadArchiveTasks(1);
                }
            }

        } else {
            // Arxiv bölməsini bağla
            archiveSection.classList.add('hidden');
            toggleBtn.classList.remove('active');
            if (toggleText) toggleText.textContent = 'Arxiv İşləri Göstər';
            if (toggleIcon) toggleIcon.className = 'fas fa-archive';
        }
    }

    setupProfileButtons() {
        // Profile Menu
        const profileMenuBtn = document.getElementById('profileMenuBtn');
        if (profileMenuBtn) {
            profileMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleProfileMenu();
            });
        }

        // Logout Button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.handleLogout();
            });
        }

        // Close profile menu when clicking outside
        document.addEventListener('click', (e) => {
            const profileMenu = document.getElementById('profileMenu');
            if (profileMenu &&
                !profileMenu.contains(e.target) &&
                !profileMenuBtn?.contains(e.target)) {
                profileMenu.classList.remove('show');
            }
        });
    }

    setupLoadMoreButtons() {
        const loadMoreButtons = [
            'activeLoadMoreBtn',
            'archiveLoadMoreBtn',
            'externalLoadMoreBtn'
        ];

        loadMoreButtons.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.addEventListener('click', () => {
                    this.handleLoadMore(btnId);
                });
            }
        });
    }

    setupDynamicTableButtons() {
        // Table row  buttons will be setup by TableManager
        const tableBody = document.getElementById('tableBody');
        if (tableBody) {
            tableBody.addEventListener('click', (e) => {
                this.handleTableRowClick(e);
            });
        }

        const externalTableBody = document.getElementById('externalTableBody');
        if (externalTableBody) {
            externalTableBody.addEventListener('click', (e) => {
                this.handleTableRowClick(e);
            });
        }

        const archiveTableBody = document.getElementById('archiveTableBody');
        if (archiveTableBody) {
            archiveTableBody.addEventListener('click', (e) => {
                this.handleTableRowClick(e);
            });
        }
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Close modals on Escape
            if (e.key === 'Escape') {
                this.closeAllModals();
            }

            // New task on Ctrl+N
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                this.openTaskModal();
            }

            // Search on Ctrl+F
            if (e.ctrlKey && e.key === 'f') {
                e.preventDefault();
                this.showSearchInput();
            }

            // Refresh on F5 or Ctrl+R
            if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
                e.preventDefault();
                this.handleRefresh();
            }

            // Export on Ctrl+E
            if (e.ctrlKey && e.key === 'e') {
                e.preventDefault();
                this.handleExport();
            }
        });
    }

    setupTooltips() {
        // Add tooltips to buttons with title attribute
        document.querySelectorAll('button[title], a[title]').forEach(element => {
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = element.getAttribute('title');

            element.addEventListener('mouseenter', (e) => {
                const rect = e.target.getBoundingClientRect();
                tooltip.style.left = `${rect.left + rect.width / 2}px`;
                tooltip.style.top = `${rect.top - 10}px`;
                document.body.appendChild(tooltip);
            });

            element.addEventListener('mouseleave', () => {
                if (tooltip.parentNode) {
                    tooltip.parentNode.removeChild(tooltip);
                }
            });
        });
    }

    // ==================== BUTTON HANDLERS ====================

    handleNavigation(type) {
        switch (type) {
            case 'home':
                window.location.href = '../index.html';
                break;
            case 'panel':
                // Get dashboard URL based on role
                const role = this.taskManager?.userData?.role || 'company_admin';
                const dashboardUrl = this.getDashboardUrl(role);
                window.location.href = dashboardUrl;
                break;
        }
    }

    getDashboardUrl(role) {
        const roleLower = role.toLowerCase();

        if (roleLower.includes('company_admin') || roleLower.includes('owner')) {
            return '../owner/owp.html';
        } else if (roleLower.includes('employee') || roleLower.includes('worker')) {
            return '../worker/wp.html';
        } else if (roleLower.includes('super_admin')) {
            return '../admin.html';
        } else {
            return '../index.html';
        }
    }

    async handleRefresh() {
        try {
            const refreshBtn = document.getElementById('refreshBtn');
            if (refreshBtn) {
                this.setButtonLoading(refreshBtn, true);
            }

            // Reload all data
            if (this.taskManager) {
                await this.taskManager.loadInitialData();
            }

        } catch (error) {
            console.error('❌ Refresh error:', error);
            this.showNotification('Yeniləmə zamanı xəta baş verdi', 'error');
        } finally {
            const refreshBtn = document.getElementById('refreshBtn');
            if (refreshBtn) {
                this.setButtonLoading(refreshBtn, false);
            }
        }
    }

    openTaskModal() {
        const modal = document.getElementById('taskModal');
        if (modal) {
            this.showModal(modal);

            // 🔒 Modal içində klik backdrop-a keçməsin
            const modalBox = modal.querySelector('.modal');
            if (modalBox) {
                modalBox.addEventListener('click', function (e) {
                    e.stopPropagation();
                });
            }

            // ❌ Backdrop click ilə bağlanmanı ləğv et
            modal.addEventListener('click', function (e) {
                e.preventDefault();
            });

            // Reset form if not editing
            const taskForm = document.getElementById('taskForm');
            if (taskForm && !taskForm.dataset.editingTaskId) {
                taskForm.reset();

                // Set default values
                const dueAtInput = document.getElementById('dueAtInput');
                if (dueAtInput) {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    dueAtInput.value = tomorrow.toISOString().slice(0, 16);
                }
            }
        }
    }


    openFilterModal() {
        const modal = document.getElementById('filterModal');
        if (modal) {
            this.showModal(modal);
        }
    }

    openSerialRequestModal() {
        const modal = document.getElementById('serialRequestModal');
        if (modal) {
            this.showModal(modal);
        }
    }

    // buttonManager.js - handleExport funksiyasını tapın və düzəldin
    async handleExport() {
        try {
            this.showLoading('Export hazırlanır...');

            // Get current filter state
            const filters = this.taskManager?.currentFilters || {};

            // Status filterində rejected istisna et
            const exportFilters = { ...filters };

            // Əgər status filteri varsa, rejected çıxar
            if (exportFilters.status) {
                if (exportFilters.status.includes('rejected')) {
                    exportFilters.status = exportFilters.status.replace('rejected', '').replace(',,', ',');
                    if (exportFilters.status.endsWith(',')) {
                        exportFilters.status = exportFilters.status.slice(0, -1);
                    }
                    if (exportFilters.status.startsWith(',')) {
                        exportFilters.status = exportFilters.status.substring(1);
                    }
                    if (exportFilters.status.trim() === '') {
                        delete exportFilters.status;
                    }
                }
            }

            // Ya da sadəcə status göndərmə
            if (exportFilters.status === 'rejected') {
                delete exportFilters.status;
            }

            // Generate export data
            const exportData = await this.generateExportData(exportFilters);

            // Create and download CSV
            this.downloadCSV(exportData, 'task_manager_export.csv');

            this.showNotification('Məlumatlar uğurla export edildi', 'success');
        } catch (error) {
            console.error('❌ Export error:', error);
            this.showNotification('Export zamanı xəta baş verdi', 'error');
        } finally {
            this.hideLoading();
        }
    }

    // generateExportData funksiyasını da düzəldin
    async generateExportData(filters) {
        try {
            console.log('📊 Export data hazırlanır:', filters);

            // Status filterində rejected istisna et
            const safeFilters = { ...filters };

            // Status filterini temizle
            if (safeFilters.status) {
                if (safeFilters.status.includes('rejected')) {
                    console.log('⚠️ Rejected status filter edilir');
                    // Ya boş burax, ya da digər statusları saxla
                    const statuses = safeFilters.status.split(',')
                        .filter(s => s.trim() !== 'rejected')
                        .join(',');

                    if (statuses) {
                        safeFilters.status = statuses;
                    } else {
                        delete safeFilters.status;
                    }
                }
            }

            // Ya da heç status göndərmə - bütün statusları gətir
            delete safeFilters.status;

            const queryParams = new URLSearchParams(safeFilters);
            const response = await makeApiRequest(
                `/tasks/detailed?${queryParams.toString()}`,
                'GET'
            );

            console.log('📥 Export API cavabı:', response);

            if (response && response.data) {
                const tasks = Array.isArray(response.data) ? response.data : response.data.items || [];

                // Frontend-də rejected statuslu task-ları filtrlə
                const filteredTasks = tasks.filter(task =>
                    task.status !== 'rejected' && task.status !== 'rejected'
                );

                console.log(`📊 ${filteredTasks.length} task export ediləcək (rejected çıxarıldı)`);

                // Convert to CSV format
                return this.convertToCSV(filteredTasks);
            }

            return '';
        } catch (error) {
            console.error('❌ Generate export data error:', error);

            // Əgər status xətasıdırsa, status filterini çıxar və yenidən cəhd et
            if (error.message.includes('status') && error.message.includes('rejected')) {
                console.log('🔄 Status filterini çıxarıb yenidən cəhd edilir...');

                const newFilters = { ...filters };
                delete newFilters.status;

                const queryParams = new URLSearchParams(newFilters);
                const response = await makeApiRequest(
                    `/tasks/detailed?${queryParams.toString()}`,
                    'GET'
                );

                if (response && response.data) {
                    const tasks = Array.isArray(response.data) ? response.data : response.data.items || [];
                    return this.convertToCSV(tasks);
                }
            }

            return '';
        }
    }

    showSortOptions(tableType = 'active') {
        console.log(`📊 ${tableType} cədvəli üçün sıralama seçimləri`);

        let sortOptions = [];
        let popupTitle = '';

        if (tableType === 'active') {
            popupTitle = 'Aktiv İşlər - Sıralama Seçimləri';
            sortOptions = [
                { text: 'Tarixə görə (əskiyə)', value: 'created_at_desc' },
                { text: 'Tarixə görə (yeni)', value: 'created_at_asc' },
                { text: 'Statusa görə', value: 'status' },
                { text: 'Son müddətə görə (yaxın)', value: 'due_date_asc' },
                { text: 'Son müddətə görə (uzaq)', value: 'due_date_desc' },
                { text: 'İcra edənə görə', value: 'executor' },
                { text: 'Şirkətə görə', value: 'company' }
            ];
        } else if (tableType === 'external') {
            popupTitle = 'Digər Şirkətlər - Sıralama Seçimləri';
            sortOptions = [
                { text: 'Tarixə görə (əskiyə)', value: 'created_at_desc' },
                { text: 'Tarixə görə (yeni)', value: 'created_at_asc' },
                { text: 'Şirkətə görə', value: 'company' },
                { text: 'Statusa görə', value: 'status' },
                { text: 'Son müddətə görə (yaxın)', value: 'due_date_asc' },
                { text: 'Son müddətə görə (uzaq)', value: 'due_date_desc' }
            ];
        } else if (tableType === 'archive') {
            popupTitle = 'Arxiv - Sıralama Seçimləri';
            sortOptions = [
                { text: 'Tamamlanma tarixinə görə (yeni)', value: 'completed_at_desc' },
                { text: 'Tamamlanma tarixinə görə (əskiyə)', value: 'completed_at_asc' },
                { text: 'İcra müddətinə görə (artana)', value: 'duration_asc' },
                { text: 'İcra müddətinə görə (azalana)', value: 'duration_desc' },
                { text: 'Formalaşan əmək haqqına görə (artana)', value: 'calculated_cost_asc' },
                { text: 'Formalaşan əmək haqqına görə (azalana)', value: 'calculated_cost_desc' }
            ];
        }

        const sortPopup = this.createPopup(popupTitle, sortOptions, false);

        sortPopup.addEventListener('select', (e) => {
            console.log('Sıralama seçildi:', e.detail);
            const selectedValue = e.detail.value || e.detail.values?.[0];
            if (selectedValue) {
                this.applySort(selectedValue, tableType);
            }
            sortPopup.remove();
        });

        document.body.appendChild(sortPopup);
    }

    toggleTableColumns(tableType = 'active') {
        console.log(`📊 ${tableType} cədvəli sütunları`);

        // Düzgün cədvəli seç
        const tableSelector = tableType === 'active' ? '.table-card:not(.external-section):not(.archive-section) .excel-table' :
                            tableType === 'external' ? '.external-section .excel-table' :
                            '.archive-section .excel-table';

        const table = document.querySelector(tableSelector);
        if (!table) {
            console.error(`❌ ${tableType} cədvəli tapılmadı`);
            return;
        }

        // Get all column headers
        const headers = table.querySelectorAll('th');
        const columns = Array.from(headers).map((header, index) => ({
            index,
            name: this.getColumnName(header.textContent.trim()),
            visible: !header.style.display || header.style.display === ''
        }));

        // Başlığı sadəcə mətni ilə yazın
        const popupTitle = tableType === 'active' ? 'Aktiv İşlər - Sütunları Yönləndir' :
                          tableType === 'external' ? 'Digər Şirkətlər - Sütunları Yönləndir' :
                          'Arxiv - Sütunları Yönləndir';

        // Create column toggle popup
        const columnPopup = this.createPopup(popupTitle,
            columns.map(col => ({
                text: col.name,
                value: col.index,
                checked: col.visible
            })),
            true // multi-select
        );

        columnPopup.addEventListener('select', (e) => {
            this.toggleColumnVisibility(e.detail.values, tableType);
            columnPopup.remove();
        });

        document.body.appendChild(columnPopup);
    }

    // Əgər getColumnName funksiyası yoxdursa, onu da əlavə edin
    getColumnName(headerText) {
        const cleanText = headerText.replace(/[\n\r]/g, '').trim();

        // Əgər içində icon varsa, yalnız mətni götür
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = cleanText;
        return tempDiv.textContent || tempDiv.innerText || cleanText;
    }

    showSearchInput(tableType = 'active') {
        // Create search input
        const searchInput = document.createElement('div');
        searchInput.className = 'search-container';
        searchInput.innerHTML = `
            <div class="search-box">
                <input type="text" id="globalSearch" placeholder="Axtarış..." autofocus>
                <button class="search-clear" title="Təmizlə">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        // Position it near the search button
        let searchBtn;
        if (tableType === 'active') {
            searchBtn = document.getElementById('activeSearchBtn');
        } else if (tableType === 'external') {
            searchBtn = document.getElementById('externalSearchBtn');
        }

        if (searchBtn) {
            const rect = searchBtn.getBoundingClientRect();
            searchInput.style.position = 'absolute';
            searchInput.style.top = `${rect.bottom + 5}px`;
            searchInput.style.right = `${window.innerWidth - rect.right}px`;
        } else {
            searchInput.style.position = 'fixed';
            searchInput.style.top = '20px';
            searchInput.style.right = '20px';
        }

        document.body.appendChild(searchInput);

        // Setup search functionality
        const input = searchInput.querySelector('input');
        const clearBtn = searchInput.querySelector('.search-clear');

        let searchTimeout;
        input.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.performSearch(e.target.value, tableType);
            }, 300);
        });

        clearBtn.addEventListener('click', () => {
            input.value = '';
            this.performSearch('', tableType);
        });

        // Close on escape
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                searchInput.remove();
                this.performSearch('', tableType);
            }
        });

        // Close on click outside
        document.addEventListener('click', function closeSearch(e) {
            if (!searchInput.contains(e.target) && e.target !== searchBtn) {
                searchInput.remove();
                this.performSearch('', tableType);
                document.removeEventListener('click', closeSearch);
            }
        }.bind(this));
    }

    /**
     * handleLoadMore - Daha çox yüklə düyməsi
     */
    handleLoadMore(buttonId) {
        const button = document.getElementById(buttonId);
        if (!button || button.disabled) return;

        this.setButtonLoading(button, true);

        setTimeout(() => {
            if (buttonId === 'activeLoadMoreBtn') {
                // Active tasks üçün taskManager istifadə et
                if (this.taskManager?.loadActiveTasks) {
                    this.taskManager.loadActiveTasks(
                        this.taskManager.pagination?.active?.page + 1 || 2,
                        true
                    );
                }
            }
            else if (buttonId === 'archiveLoadMoreBtn') {
                // Archive tasks üçün ArchiveTableManager istifadə et
                const button = document.getElementById(buttonId);
                if (!button || button.disabled) return;

                if (buttonId === 'archiveLoadMoreBtn') {
                    console.log('📦 Archive next page');
                    if (window.ArchiveTableManager) {
                        window.ArchiveTableManager.nextPage();
                    }
                }
            }
            else if (buttonId === 'externalLoadMoreBtn') {
                // External tasks üçün
                if (this.taskManager?.loadExternalTasks) {
                    this.taskManager.loadExternalTasks(
                        this.taskManager.pagination?.external?.page + 1 || 2,
                        true
                    );
                }
            }

            this.setButtonLoading(button, false);
        }, 500);
    }

    handleTableRowClick(e) {
        const button = e.target.closest('button');
        if (!button) return;

        const row = button.closest('tr');
        const taskId = row?.dataset?.taskId;

        if (!taskId) return;

        const action = button.dataset.action;

        switch (action) {
            case 'edit':
                this.editTask(taskId);
                break;
            case 'view':
                this.viewTaskDetails(taskId);
                break;
            case 'complete':
                this.completeTask(taskId);
                break;
            case 'delete':
                this.deleteTask(taskId);
                break;
            case 'archive':
                this.archiveTask(taskId);
                break;
        }
    }

    closeModal(modal) {
        if (!modal) return;

        modal.style.display = 'none';
        document.body.style.overflow = 'auto';

        // Trigger close animation
        modal.classList.add('closing');
        setTimeout(() => {
            modal.classList.remove('closing');
        }, 300);
    }

    closeAllModals() {
        document.querySelectorAll('.modal-backdrop').forEach(modal => {
            this.closeModal(modal);
        });
    }

    handleCancel(button) {
        const modal = button.closest('.modal-backdrop');
        if (modal) {
            this.closeModal(modal);
        }
    }




    navigateFormTab(direction) {
        const tabs = document.querySelectorAll('.form-tab');
        const currentIndex = Array.from(tabs).findIndex(tab =>
            tab.classList.contains('active')
        );

        let newIndex = currentIndex + direction;

        // Ensure index is within bounds
        if (newIndex < 0) newIndex = 0;
        if (newIndex >= tabs.length) newIndex = tabs.length - 1;

        // Activate new tab
        this.switchFormTab(tabs[newIndex].dataset.tab);
    }

    switchFormTab(tabName) {
        // Update tabs
        document.querySelectorAll('.form-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update tab content
        document.querySelectorAll('.form-tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}Tab`);
        });

        // Update steps
        document.querySelectorAll('.step').forEach((step, index) => {
            const stepNumber = parseInt(step.dataset.step);
            step.classList.toggle('active', stepNumber === this.getTabIndex(tabName) + 1);
        });

        // Update navigation buttons
        const prevBtn = document.getElementById('prevTabBtn');
        const nextBtn = document.getElementById('nextTabBtn');

        if (prevBtn) {
            prevBtn.style.visibility = this.getTabIndex(tabName) === 0 ? 'hidden' : 'visible';
        }

        if (nextBtn) {
            if (this.getTabIndex(tabName) === 2) {
                nextBtn.style.display = 'none';
            } else {
                nextBtn.style.display = 'flex';
            }
        }
    }

    getTabIndex(tabName) {
        const tabs = ['basic', 'details', 'financial'];
        return tabs.indexOf(tabName);
    }

    setupFileUpload(dropZone, fileInput) {
        // Click to upload
        dropZone.addEventListener('click', () => {
            fileInput.click();
        });

        // Drag and drop
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');

            if (e.dataTransfer.files.length) {
                this.handleFiles(e.dataTransfer.files);
            }
        });

        // File input change
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) {
                this.handleFiles(e.target.files);
            }
        });
    }

    handleFiles(files) {
        const fileList = document.getElementById('fileList');
        if (!fileList) return;

        for (let file of files) {
            // Validate file
            if (file.size > 10 * 1024 * 1024) {
                this.showNotification(`${file.name} - Fayl ölçüsü 10MB-dan çox ola bilməz`, 'error');
                continue;
            }

            const allowedTypes = [
                '.xlsx', '.xls', '.pdf', '.jpg', '.png',
                '.jpeg', '.doc', '.docx', '.txt'
            ];

            const fileExt = '.' + file.name.split('.').pop().toLowerCase();
            if (!allowedTypes.includes(fileExt)) {
                this.showNotification(`${file.name} - Bu fayl tipi dəstəklənmir`, 'error');
                continue;
            }

            // Add to file list
            this.addFileToList(file);
        }
    }

    addFileToList(file) {
        const fileList = document.getElementById('fileList');
        if (!fileList) return;

        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <div class="file-info">
                <div class="file-icon">
                    <i class="${this.getFileIcon(file.name)}"></i>
                </div>
                <div class="file-details">
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${this.formatFileSize(file.size)}</div>
                </div>
            </div>
            <button type="button" class="file-remove" title="Faylı sil">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Remove button
        fileItem.querySelector('.file-remove').addEventListener('click', () => {
            fileItem.remove();
        });

        fileList.appendChild(fileItem);
    }

    getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const icons = {
            pdf: 'fas fa-file-pdf',
            xlsx: 'fas fa-file-excel',
            xls: 'fas fa-file-excel',
            doc: 'fas fa-file-word',
            docx: 'fas fa-file-word',
            jpg: 'fas fa-file-image',
            jpeg: 'fas fa-file-image',
            png: 'fas fa-file-image',
            txt: 'fas fa-file-alt'
        };

        return icons[ext] || 'fas fa-file';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    resetFilters() {
        const filterForm = document.getElementById('filterForm');
        if (filterForm) {
            filterForm.reset();
        }

        // Clear task manager filters
        if (this.taskManager) {
            this.taskManager.currentFilters = {};
        }

        // Reset filter badge
        this.updateFilterBadge(0);

        this.showNotification('Filtr sıfırlandı', 'info');
    }

    toggleTheme() {
        const html = document.documentElement;
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('taskManagerTheme', newTheme);

        // Update theme icon
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            const icon = themeToggle.querySelector('i');
            const text = themeToggle.querySelector('.theme-text');

            if (newTheme === 'dark') {
                icon.className = 'fas fa-sun';
                text.textContent = 'Açıq rejim';
            } else {
                icon.className = 'fas fa-moon';
                text.textContent = 'Qaranlıq rejim';
            }
        }

    }

    async exportArchive() {
        try {
            // Əvvəlcə arxiv bölməsini aç
            const archiveSection = document.querySelector('.archive-section');
            if (archiveSection.classList.contains('hidden')) {
                this.toggleArchiveSection();

                // Bir az gözlə ki arxiv yüklənsin
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            this.showLoading('Arxiv export hazırlanır...');
            console.log('📊 Arşiv export başlatılıyor...');
            this.showLoading('Arşiv export hazırlanır...');

            // Cari user və şirkət məlumatlarını al
            const currentUser = this.taskManager?.userData;
            const companyId = currentUser?.companyId || currentUser?.company_id;

            if (!companyId) {
                throw new Error('Şirkət ID tapılmadı');
            }

            console.log(`🏢 Şirkət ID: ${companyId}`);

            // 1. Pagination ilə bütün arşiv məlumatlarını götür
            let allArchiveData = [];
            let page = 1;
            const pageSize = 200; // API limiti
            let hasMore = true;

            while (hasMore) {
                console.log(`📥 Arşiv səhifə ${page} gətirilir...`);

                const response = await this.taskManager.apiRequest(
                    `/task-archive/?company_id=${companyId}&page=${page}&limit=${pageSize}`,
                    'GET'
                );

                console.log(`📦 Səhifə ${page} API cavabı:`, response);

                let currentPageData = [];

                if (response && response.items) {
                    // Yeni format: PaginatedResponse
                    currentPageData = response.items;
                    hasMore = response.has_next || false;
                } else if (response && response.data && response.data.items) {
                    // Alternativ format
                    currentPageData = response.data.items;
                    hasMore = response.data.has_next || false;
                } else if (response && response.data && Array.isArray(response.data)) {
                    // Sade array formatı
                    currentPageData = response.data;
                    hasMore = currentPageData.length >= pageSize;
                } else if (response && Array.isArray(response)) {
                    // Direkt array
                    currentPageData = response;
                    hasMore = currentPageData.length >= pageSize;
                } else {
                    console.warn('⚠️ Arşiv veri formatı tanınmadı, döngü bitir:', response);
                    hasMore = false;
                }

                if (currentPageData.length > 0) {
                    allArchiveData = allArchiveData.concat(currentPageData);
                    console.log(`✅ Səhifə ${page}: ${currentPageData.length} qeyd əlavə edildi. Ümumi: ${allArchiveData.length}`);
                    page++;
                } else {
                    console.log('ℹ️ Daha çox qeyd yoxdur');
                    hasMore = false;
                }

                // Maksimum 5 səhifə (1000 qeyd) götür
                if (page > 5) {
                    console.log('⚠️ Maksimum səhifə limitinə çatıldı');
                    hasMore = false;
                }
            }

            if (allArchiveData.length === 0) {
                throw new Error('Export edilecek arşiv verisi bulunamadı');
            }

            console.log(`📊 ${allArchiveData.length} arşiv kaydı işleniyor...`);

            // 2. Excel Export modulunu istifadə et
            if (typeof ExcelExport !== 'undefined') {
                console.log('✅ ExcelExport modulu istifadə olunacaq');

                try {
                    const filename = await ExcelExport.exportArchiveToExcel(
                        allArchiveData,
                        {
                            filename: 'task_archive_export.xlsx',
                            sheetName: 'Arşiv Verileri'
                        }
                    );

                    this.showNotification(`Arxiv uğurla export edildi: ${filename}`, 'success');

                } catch (excelError) {
                    console.error('❌ Excel export xətası:', excelError);

                    // CSV fallback
                    this.showNotification('Excel xətası, CSV olaraq export edilir...', 'warning');
                    await this.exportArchiveAsCSV(allArchiveData, companyId);
                }

            } else {
                console.warn('⚠️ ExcelExport modulu tapılmadı, CSV fallback');
                await this.exportArchiveAsCSV(allArchiveData, companyId);
            }

        } catch (error) {
            console.error('❌ Arşiv export xətası:', error);
            this.showNotification(`Arşiv export xətası: ${error.message}`, 'error');
        } finally {
            this.hideLoading();
        }
    }

    // CSV fallback funksiyası (düzgün parametrlə)
    async exportArchiveAsCSV(archiveData, companyId) {
        try {
            console.log('📊 CSV fallback export başladılır...');

            if (!archiveData || archiveData.length === 0) {
                throw new Error('Arşiv verisi yoxdur');
            }

            // CSV məzmununu hazırla
            const csvContent = this.convertArchiveToCSV(archiveData);

            if (!csvContent) {
                throw new Error('CSV məzmunu hazırlana bilmədi');
            }

            // Fayl adını yarat
            const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const filename = `task_archive_${companyId}_${date}.csv`;

            // Faylı endir
            this.downloadCSV(csvContent, filename);

            this.showNotification(`Arşiv CSV olaraq export edildi: ${filename}`, 'success');

        } catch (csvError) {
            console.error('❌ CSV export xətası:', csvError);
            throw csvError;
        }
    }



    toggleProfileMenu() {
        const profileMenu = document.getElementById('profileMenu');
        if (profileMenu) {
            profileMenu.classList.toggle('show');
        }
    }

    async handleLogout() {
        try {
            if (confirm('Hesabdan çıxmaq istədiyinizə əminsiniz?')) {
                this.showLoading('Çıxış edilir...');

                // Call logout API if exists
                try {
                    await this.taskManager.apiRequest('/auth/logout', 'POST');
                } catch (error) {
                    console.log('Logout API not available, clearing local data only');
                }

                // Clear all local data
                localStorage.clear();
                sessionStorage.clear();

                // Redirect to login
                setTimeout(() => {
                    window.location.href = '../login.html';
                }, 1000);
            }
        } catch (error) {
            console.error('❌ Logout error:', error);
            this.showNotification('Çıxış zamanı xəta baş verdi', 'error');
        }
    }

    // ==================== UTILITY METHODS ====================

    showModal(modal) {
        if (!modal) return;

        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        // Trigger show animation
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
    }

    setButtonLoading(button, isLoading) {
        if (!button) return;

        if (isLoading) {
            button.classList.add('loading');
            button.disabled = true;

            // Save original content
            if (!button.dataset.originalContent) {
                button.dataset.originalContent = button.innerHTML;
            }

            // Show loading spinner
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        } else {
            button.classList.remove('loading');
            button.disabled = false;

            // Restore original content
            if (button.dataset.originalContent) {
                button.innerHTML = button.dataset.originalContent;
                delete button.dataset.originalContent;
            }
        }
    }

    showNotification(message, type = 'info') {

        if (this.notificationService) {
            try {
                if (type === 'success' && typeof this.notificationService.showSuccess === 'function') {
                    this.notificationService.showSuccess(message);
                }
                else if (type === 'error' && typeof this.notificationService.showError === 'function') {
                    this.notificationService.showError(message);
                }
                else if (type === 'info' && typeof this.notificationService.showInfo === 'function') {
                    this.notificationService.showInfo(message);
                }
                else if (type === 'warning' && typeof this.notificationService.showWarning === 'function') {
                    this.notificationService.showWarning(message);
                }
                else if (typeof this.notificationService.show === 'function') {
                    this.notificationService.show(message, type);
                }
            } catch (err) {

            }
        }

        // 2. notificationService yoxdursa, sizin fallback notification-unuzu göstər
        else {
            this.showFallbackNotification(message, type);
        }
    }

    // Fallback notification - AMA CONSOLE LOG OLMASIN
    showFallbackNotification(message, type = 'info') {
        // Əvvəlcə notification.js faylındakı funksiyanı çağır
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
            return;
        }

        // Əgər yoxdursa, öz funksiyanızı işlədin
        const container = document.getElementById('notificationsContainer');
        if (!container) {
            console.error('❌ notificationsContainer tapılmadı!');
            return;
        }

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;

        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        notification.innerHTML = `
            <div class="notification-icon">
                <i class="${icons[type] || 'fas fa-info-circle'}"></i>
            </div>
            <div class="notification-content">
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        `;

        container.appendChild(notification);

        // Auto remove
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);

        // Close button
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        });
    }

    showLoading(message = 'Yüklənir...') {
        const overlay = document.getElementById('loadingOverlay');
        const loadingText = document.getElementById('loadingText');

        if (overlay && loadingText) {
            loadingText.textContent = message;
            overlay.classList.add('active');
        }
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
    }

    updateFilterBadge(count) {
        const filterBadge = document.getElementById('filterBadge');
        if (!filterBadge) return;

        if (count > 0) {
            filterBadge.textContent = count;
            filterBadge.style.display = 'flex';
        } else {
            filterBadge.style.display = 'none';
        }
    }

    createPopup(title, options, multiSelect = false) {
        const popup = document.createElement('div');
        popup.className = 'custom-popup';

        let optionsHTML = options.map(option => `
            <label class="popup-option ${multiSelect ? 'checkbox' : 'radio'}">
                ${multiSelect ? 
                    `<input type="checkbox" value="${option.value}" ${option.checked ? 'checked' : ''}>` :
                    `<input type="radio" name="popup-option" value="${option.value}">`
                }
                <span>${option.text}</span>
            </label>
        `).join('');

        popup.innerHTML = `
            <div class="popup-content">
                <div class="popup-header">
                    <h3>${title}</h3>
                    <button class="popup-close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="popup-body">
                    ${optionsHTML}
                </div>
                <div class="popup-footer">
                    <button class="btn secondary-btn popup-cancel">İmtina</button>
                    <button class="btn primary-btn popup-confirm">Tətbiq et</button>
                </div>
            </div>
        `;

        // Close button
        popup.querySelector('.popup-close').addEventListener('click', () => {
            popup.remove();
        });

        // Cancel button
        popup.querySelector('.popup-cancel').addEventListener('click', () => {
            popup.remove();
        });

        // Confirm button
        popup.querySelector('.popup-confirm').addEventListener('click', () => {
            let selectedValues;

            if (multiSelect) {
                selectedValues = Array.from(popup.querySelectorAll('input[type="checkbox"]:checked'))
                    .map(input => input.value);
            } else {
                const selected = popup.querySelector('input[type="radio"]:checked');
                selectedValues = selected ? [selected.value] : [];
            }

            if (selectedValues.length > 0) {
                popup.dispatchEvent(new CustomEvent('select', {
                    detail: { values: selectedValues }
                }));
            }

            popup.remove();
        });

        // Close on backdrop click
        popup.addEventListener('click', (e) => {
            if (e.target === popup) {
                popup.remove();
            }
        });

        return popup;
    }

    async editTask(taskId) {
        try {
            this.showLoading('İş məlumatları yüklənir...');

            // Get task details
            const response = await this.taskManager.apiRequest(`/tasks/${taskId}`, 'GET');

            if (response && response.data) {
                const task = response.data;

                // Populate form
                this.populateTaskForm(task);

                // Open modal
                this.openTaskModal();
            } else {
                throw new Error('İş məlumatları alınmadı');
            }
        } catch (error) {
            console.error('❌ Edit task error:', error);
            this.showNotification('İş məlumatları yüklənərkən xəta', 'error');
        } finally {
            this.hideLoading();
        }
    }

    populateTaskForm(task) {
        const form = document.getElementById('taskForm');
        if (!form) return;

        // Set editing mode
        form.dataset.editingTaskId = task.id;

        // Update modal title
        const modalTitle = document.getElementById('modalTitle');
        if (modalTitle) {
            modalTitle.innerHTML = '<i class="fas fa-edit"></i><span>İşi Redaktə Et</span>';
        }

        // Populate form fields
        const fields = {
            'taskTitleInput': task.task_title || task.title,
            'companySelect': task.company_id,
            'executorSelect': task.assigned_to || task.executor_user_id,
            'departmentSelect': task.department_id,
            'taskTypeSelect': task.work_type_id || task.task_type_id,
            'descriptionInput': task.task_description || task.description,
            'notesInput': task.notes,
            'dueAtInput': task.due_date ? this.formatDateTimeForInput(task.due_date) : '',
            'durationInput': task.duration_minutes || task.estimated_hours * 60,
            'hourlyRateInput': task.hourly_rate || task.billing_rate,
            'calculatedCostInput': task.calculated_cost || 0
        };

        Object.entries(fields).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element && value !== undefined && value !== null) {
                element.value = value;
            }
        });

        // Calculate salary if needed
        if (task.duration_minutes && task.hourly_rate) {
            this.calculateSalary();
        }
    }

    formatDateTimeForInput(dateTime) {
        const date = new Date(dateTime);
        return date.toISOString().slice(0, 16);
    }

    calculateSalary() {
        const durationInput = document.getElementById('durationInput');
        const hourlyRateInput = document.getElementById('hourlyRateInput');
        const calculatedCostInput = document.getElementById('calculatedCostInput');

        if (!durationInput || !hourlyRateInput || !calculatedCostInput) return;

        const duration = parseFloat(durationInput.value) || 0;
        const hourlyRate = parseFloat(hourlyRateInput.value) || 0;
        const hours = duration / 60;
        const cost = hours * hourlyRate;

        calculatedCostInput.value = cost.toFixed(2);

        // Update calculation summary
        this.updateCalculationSummary(duration, hourlyRate, cost);
    }

    updateCalculationSummary(duration, hourlyRate, cost) {
        const calcDuration = document.getElementById('calcDuration');
        const calcHourlyRate = document.getElementById('calcHourlyRate');
        const calcTotal = document.getElementById('calcTotal');

        if (calcDuration) {
            const hours = Math.floor(duration / 60);
            const minutes = duration % 60;
            calcDuration.textContent = `${hours} saat ${minutes} dəq`;
        }

        if (calcHourlyRate) {
            calcHourlyRate.textContent = `${hourlyRate.toFixed(2)} AZN`;
        }

        if (calcTotal) {
            calcTotal.textContent = `${cost.toFixed(2)} AZN`;
        }
    }

    validateTaskForm(formData) {
        const errors = [];

        // Required fields
        const requiredFields = [
            'task_title',
            'company_id',
            'executor_user_id',
            'department_id',
            'task_type_id',
            'due_at'
        ];

        requiredFields.forEach(field => {
            if (!formData.get(field)) {
                const fieldNames = {
                    'task_title': 'İş başlığı',
                    'company_id': 'Şirkət',
                    'executor_user_id': 'İcra edən',
                    'department_id': 'Şöbə',
                    'task_type_id': 'İş növü',
                    'due_at': 'Son müddət'
                };
                errors.push(`${fieldNames[field]} tələb olunur`);
            }
        });

        // Duration validation
        const duration = parseInt(formData.get('duration_minutes'));
        if (isNaN(duration) || duration < 0) {
            errors.push('İcra müddəti düzgün daxil edilməyib');
        }

        // Due date validation
        const dueDate = new Date(formData.get('due_at'));
        if (dueDate < new Date()) {
            errors.push('Son müddət keçmiş tarix ola bilməz');
        }

        return errors;
    }

    updateButtonStates() {
        // Update load more button states
        this.updateLoadMoreButtonState();

        // Update filter badge
        const filterCount = Object.keys(this.taskManager?.currentFilters || {}).length;
        this.updateFilterBadge(filterCount);

        // Update user info
        this.updateUserInfo();
    }

    updateLoadMoreButtonState() {
        const buttons = [
            { id: 'activeLoadMoreBtn', type: 'active' },
            { id: 'archiveLoadMoreBtn', type: 'archive' },
            { id: 'externalLoadMoreBtn', type: 'external' }
        ];

        buttons.forEach(({ id, type }) => {
            const button = document.getElementById(id);
            if (!button || !this.taskManager) return;

            const hasMore = this.taskManager.pagination[type]?.hasMore;

            if (hasMore) {
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-chevron-down"></i><span>Daha çox</span>';
            } else {
                button.disabled = true;
                button.innerHTML = '<i class="fas fa-check"></i><span>Hamısı yükləndi</span>';
            }
        });
    }

    updateUserInfo() {
        if (!this.taskManager?.userData) return;

        const userName = document.getElementById('userName');
        const userRole = document.getElementById('userRole');
        const profileMenuName = document.getElementById('profileMenuName');
        const profileMenuEmail = document.getElementById('profileMenuEmail');

        const userData = this.taskManager.userData;

        if (userName) {
            userName.textContent = userData.fullName || userData.name || 'İstifadəçi';
        }

        if (userRole) {
            userRole.textContent = this.formatUserRole(userData.role);
        }

        if (profileMenuName) {
            profileMenuName.textContent = userData.fullName || userData.name || 'İstifadəçi';
        }

        if (profileMenuEmail) {
            profileMenuEmail.textContent = userData.email || 'email@example.com';
        }
    }

    formatUserRole(role) {
        const roles = {
            'company_admin': 'Şirkət Admini',
            'employee': 'İşçi',
            'super_admin': 'Super Admin',
            'admin': 'Admin'
        };

        return roles[role] || role;
    }



    // ==================== TABLE METHODS ====================

    applySort(sortOption, tableType = 'active') {
        console.log(`Sıralama tətbiq edildi: ${sortOption} - Cədvəl: ${tableType}`);
        this.showNotification(`${tableType} cədvəli sıralandı: ${sortOption}`, 'info');
    }

    toggleColumnVisibility(visibleColumns, tableType = 'active') {
        let table;
        if (tableType === 'active') {
            table = document.querySelector('.table-card:not(.external-section):not(.archive-section) .excel-table');
        } else if (tableType === 'external') {
            table = document.querySelector('.external-section .excel-table');
        } else {
            table = document.querySelector('.archive-section .excel-table');
        }

        if (!table) return;

        // Hide/show columns
        const headers = table.querySelectorAll('th');
        const rows = table.querySelectorAll('tr');

        headers.forEach((header, index) => {
            const isVisible = visibleColumns.includes(index.toString());
            header.style.display = isVisible ? '' : 'none';

            rows.forEach(row => {
                const cell = row.cells[index];
                if (cell) {
                    cell.style.display = isVisible ? '' : 'none';
                }
            });
        });

        this.showNotification(`${tableType} sütunları yönləndirildi`, 'success');
    }

    performSearch(query, tableType = 'active') {
        let table;
        if (tableType === 'active') {
            table = document.querySelector('.table-card:not(.external-section):not(.archive-section) .excel-table');
        } else if (tableType === 'external') {
            table = document.querySelector('.external-section .excel-table');
        } else {
            table = document.querySelector('.archive-section .excel-table');
        }

        if (!table) return;

        const rows = table.querySelectorAll('tbody tr');

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(query.toLowerCase()) ? '' : 'none';
        });

        if (query) {
            this.showNotification(`${tableType} axtarış: "${query}"`, 'info');
        }
    }

    async findTaskBySerialNumber(serialNumber) {
        try {
            // Get all tasks and find by index
            const response = await this.taskManager.apiRequest('/tasks/detailed', 'GET');

            if (response && response.data) {
                const tasks = Array.isArray(response.data) ? response.data : response.data.items || [];
                const taskIndex = parseInt(serialNumber) - 1;

                if (taskIndex >= 0 && taskIndex < tasks.length) {
                    return tasks[taskIndex];
                }
            }

            return null;
        } catch (error) {
            console.error('❌ Find task error:', error);
            return null;
        }
    }

    viewTaskDetails(taskId) {
        this.showNotification('İş detalları göstəriləcək', 'info');
        // Implementation would open task details modal
    }

    async completeTask(taskId) {
        if (!confirm('Bu işi tamamlandı olaraq qeyd etmək istədiyinizə əminsiniz?')) {
            return;
        }

        try {
            this.showLoading('İş tamamlandı olaraq qeyd edilir...');

            await this.taskManager.changeTaskStatus(taskId, 'completed');

            this.showNotification('İş tamamlandı olaraq qeyd edildi', 'success');

            // Refresh tasks
            await this.taskManager.loadActiveTasks();
            await this.taskManager.loadArchiveTasks();
        } catch (error) {
            console.error('❌ Complete task error:', error);
            this.showNotification('İş tamamlandı edilərkən xəta', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async deleteTask(taskId) {
        if (!confirm('Bu işi silmək istədiyinizə əminsiniz? Bu əməliyyat geri qaytarıla bilməz.')) {
            return;
        }

        try {
            this.showLoading('İş silinir...');

            await this.taskManager.apiRequest(`/tasks/${taskId}`, 'DELETE');

            this.showNotification('İş uğurla silindi', 'success');

            // Refresh tasks
            await this.taskManager.loadActiveTasks();
        } catch (error) {
            console.error('❌ Delete task error:', error);
            this.showNotification('İş silinərkən xəta', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async archiveTask(taskId) {
        if (!confirm('Bu işi arxivə köçürmək istədiyinizə əminsiniz?')) {
            return;
        }

        try {
            this.showLoading('İş arxivə köçürülür...');

            await this.taskManager.apiRequest(`/tasks/${taskId}/archive`, 'POST');

            this.showNotification('İş uğurla arxivə köçürüldü', 'success');

            // Refresh tasks
            await this.taskManager.loadActiveTasks();
            await this.taskManager.loadArchiveTasks();
        } catch (error) {
            console.error('❌ Archive task error:', error);
            this.showNotification('İş arxivə köçürülərkən xəta', 'error');
        } finally {
            this.hideLoading();
        }
    }

    // ==================== EXPORT METHODS ====================

    convertToCSV(tasks) {
        if (!tasks.length) return '';

        // Define columns
        const columns = [
            { key: 'id', title: 'ID' },
            { key: 'task_title', title: 'İş Başlığı' },
            { key: 'status', title: 'Status' },
            { key: 'priority', title: 'Prioritet' },
            { key: 'due_date', title: 'Son Müddət' },
            { key: 'assigned_to_name', title: 'İcra Edən' },
            { key: 'department_name', title: 'Şöbə' },
            { key: 'company_name', title: 'Şirkət' },
            { key: 'duration_minutes', title: 'Müddət (dəq)' },
            { key: 'hourly_rate', title: 'Saatlıq Əmək Haqqı' },
            { key: 'calculated_cost', title: 'Ümumi Xərc' }
        ];

        // Create header row
        const headers = columns.map(col => `"${col.title}"`).join(',');

        // Create data rows
        const rows = tasks.map(task => {
            return columns.map(col => {
                let value = task[col.key] || '';

                // Format dates
                if (col.key === 'due_date' && value) {
                    value = new Date(value).toLocaleDateString('az-AZ');
                }

                // Escape quotes and wrap in quotes
                value = String(value).replace(/"/g, '""');
                return `"${value}"`;
            }).join(',');
        });

        return [headers, ...rows].join('\n');
    }

    downloadCSV(csvContent, fileName) {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');

        if (navigator.msSaveBlob) {
            // For IE
            navigator.msSaveBlob(blob, fileName);
        } else {
            // For modern browsers
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', fileName);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    async uploadFile(file) {
        try {
            this.showLoading('Fayl yüklənir...');

            const formData = new FormData();
            formData.append('file', file);
            formData.append('category', 'TASK_ATTACHMENT');

            const response = await this.taskManager.apiRequest(
                '/files/simple-upload',
                'POST',
                formData,
                false // Not JSON
            );

            if (response && response.data) {
                return response.data.url || response.data.file_url;
            }

            return null;
        } catch (error) {
            console.error('❌ File upload error:', error);
            this.showNotification('Fayl yüklənmədi', 'error');
            return null;
        } finally {
            this.hideLoading();
        }
    }

    // TaskManager class-ının sonuna əlavə edin
    setupAutoArchiveCheck() {
        setInterval(() => {
            this.checkAndArchiveOverdueTasks();
        }, 5 * 60 * 1000);

        setTimeout(() => {
            this.checkAndArchiveOverdueTasks();
        }, 10000);

        // ButtonManager ilə əlaqə yarat
        this.setupButtonManagerConnection();
    }

    setupButtonManagerConnection() {
        // ButtonManager-in TaskManager-ə çatması üçün
        if (typeof window.ButtonManager !== 'undefined') {
            // ButtonManager varsa, onun taskManager property-sini təyin et
            window.ButtonManager.taskManager = this;
            console.log('✅ ButtonManager ilə əlaqə quruldu');
        } else {
            // Əgər ButtonManager hələ yoxdursa, bir az gözlə və yenidən cəhd et
            setTimeout(() => {
                if (typeof window.ButtonManager !== 'undefined') {
                    window.ButtonManager.taskManager = this;
                    console.log('✅ ButtonManager ilə əlaqə quruldu (gözləmədən sonra)');
                }
            }, 1000);
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait for TaskManager to be available
    if (window.taskManager) {
        window.buttonManager = new ButtonManager(window.taskManager);
        console.log('✅ Button Manager başladıldı');
    } else {
        // If TaskManager not available yet, wait for it
        const checkTaskManager = setInterval(() => {
            if (window.taskManager) {
                clearInterval(checkTaskManager);
                window.buttonManager = new ButtonManager(window.taskManager);
                console.log('✅ Button Manager başladıldı');
            }
        }, 100);
    }
});
