// ===========================================
// TASK LİST MODULU - 50, 100 + RESET FILTERS
// AKTİV, EXTERNAL, PARTNER, ARCHIVE
// MÖVCUD CƏDVƏLLƏRDƏ GÖSTƏRİR, MODAL AÇILMIR
// ===========================================
// ==================== TOKEN-DAN BİRBAŞA COMPANY_ID AL ====================
// Bu funksiyanı load_buttons.js faylının ən ƏVVƏLİNƏ əlavə edin

function getRealCompanyIdFromToken() {
    const token = localStorage.getItem('guven_token') || localStorage.getItem('access_token');
    if (token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload.company_id) {
                console.log('✅ TOKEN-dan company_id:', payload.company_id);
                return payload.company_id;
            }
        } catch(e) {
            console.warn('⚠️ Token parse xətası:', e);
        }
    }

    // Token-dan alınmadısa, company koduna görə
    const companyCode = localStorage.getItem('company_code') || 'GUV26001';
    if (companyCode === 'GUV26001') return 51;
    if (companyCode === 'SOC26001') return 55;
    return 51; // default
}


(function() {
    'use strict';

    console.log('🚀 Task List modulu başladılır (50/100 task + reset filters)...');

    // ==================== MODUL DƏYİŞƏNLƏRİ ====================
    let isLoading = false;
    let loadingOverlay = null;

    // Cədvəl konfiqurasiyası
    const tableConfig = {
        active: {
            tbodyId: 'tableBody',
            sectionId: 'activeTableSection',
            apiStatus: 'pending,in_progress,overdue,waiting,pending_approval,paused',
            apiFilter: 'assigned_to'
        },
        external: {
            tbodyId: 'externalTableBody',
            sectionId: 'externalTableSection',
            apiStatus: 'pending,in_progress,overdue,waiting,pending_approval,paused',
            apiFilter: 'target_company_id'
        },
        partner: {
            tbodyId: 'partnerTableBody',
            sectionId: 'partnerTableSection',
            apiStatus: 'pending,in_progress,overdue,waiting,pending_approval,paused',
            apiFilter: 'partner_company_id'
        },
        archive: {
            tbodyId: 'archiveTableBody',
            sectionId: 'archiveTableSection',
            apiStatus: 'completed,archived',
            apiFilter: 'assigned_to'
        }
    };

    // ==================== DÜYMƏLƏRİ HAZIRLA ====================
    function setupLoadButtons() {
        // ========== SELECT ELEMENTLƏRİ ==========
        const limitSelects = document.querySelectorAll('.task-limit-select');

        limitSelects.forEach(select => {
            const newSelect = select.cloneNode(true);
            select.parentNode.replaceChild(newSelect, select);

            const tableType = newSelect.getAttribute('data-table');

            // LocalStorage-dan əvvəlki seçimi yüklə
            const savedValue = localStorage.getItem(`task_limit_${tableType}`);
            if (savedValue) {
                newSelect.value = savedValue;
            }

            newSelect.addEventListener('change', async (e) => {
                e.preventDefault();
                e.stopPropagation();

                if (isLoading) return;

                const limit = newSelect.value;
                const finalTableType = newSelect.getAttribute('data-table');

                // Seçimi yadda saxla
                localStorage.setItem(`task_limit_${finalTableType}`, limit);

                console.log(`📦 ${finalTableType} cədvəli üçün ${limit} task yüklənir...`);
                await loadTasksToTable(finalTableType, limit);
            });
        });

        // ========== ORİJİNAL YÜKLƏMƏ DÜYMƏLƏRİ ==========
        const loadButtons = document.querySelectorAll('.load-tasks-btn');

        loadButtons.forEach(button => {
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);

            const tableType = newButton.getAttribute('data-table');

            if (!tableType) {
                newButton.setAttribute('data-table', 'active');
            }

            const finalTableType = newButton.getAttribute('data-table') || 'active';

            newButton.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();

                if (isLoading) return;

                const limit = newButton.getAttribute('data-load-count');
                console.log(`📦 ${finalTableType} cədvəli üçün ${limit} task yüklənir...`);
                await loadTasksToTable(finalTableType, limit);
            });
        });

        // Reset filters düymələri
        const resetButtons = document.querySelectorAll('.reset-filters-btn');

        resetButtons.forEach(button => {
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);

            const tableType = newButton.getAttribute('data-table');

            if (!tableType) {
                newButton.setAttribute('data-table', 'active');
            }

            const finalTableType = newButton.getAttribute('data-table') || 'active';

            newButton.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();

                if (isLoading) return;

                console.log(`🔄 ${finalTableType} cədvəli üçün filtrlər ləğv edilir...`);
                await resetFiltersAndReload(finalTableType);
            });
        });

        setupArchiveTabs();

        console.log(`✅ ${limitSelects.length} select, ${loadButtons.length} yükləmə düyməsi, ${resetButtons.length} reset düyməsi hazırlandı`);
    }

    // ==================== FİLTRİ LƏĞV ET VƏ YENİDƏN YÜKLƏ ====================
    async function resetFiltersAndReload(tableType) {
        try {
            isLoading = true;
            disableButtons(true);

            showLoadingOverlay(`${getTableName(tableType)} - filtrlər ləğv edilir...`);

            if (window.taskManager) {
                if (window.taskManager.currentFilters) {
                    window.taskManager.currentFilters = {};
                }
                if (window.taskManager.currentFilterTable) {
                    window.taskManager.currentFilterTable = null;
                }
                console.log('✅ TaskManager filtrləri sıfırlandı');
            }

            const filterForm = document.getElementById('filterForm');
            if (filterForm) {
                filterForm.reset();
                const activeRadio = document.querySelector('input[name="filter_table"][value="active"]');
                if (activeRadio) {
                    activeRadio.checked = true;
                }
            }

            const filterBadge = document.getElementById('filterBadge');
            if (filterBadge) {
                filterBadge.style.display = 'none';
            }

            showAllTables();

            const userInfo = getCurrentUserInfo();
            if (!userInfo.userId) {
                throw new Error('İstifadəçi məlumatı tapılmadı');
            }

            const config = tableConfig[tableType];
            if (!config) {
                throw new Error(`Bilinməyən cədvəl tipi: ${tableType}`);
            }

            const tasks = await fetchTasksByTableType(tableType, userInfo, 100, config);
            console.log(`✅ ${tableType} cədvəli üçün ${tasks.length} task yükləndi (filtrsiz)`);

            if (tasks.length === 0) {
                showEmptyTable(tableType, config);
                showNotification(`${getTableName(tableType)} cədvəlində heç bir tapşırıq tapılmadı`, 'info');
                return;
            }

            renderTasksInTable(tableType, tasks, 'Bütün', config);
            updateTableHeaderCount(tableType, tasks.length, 'Bütün');
            showNotification(`${getTableName(tableType)} cədvəlində filtrlər ləğv edildi, ${tasks.length} tapşırıq göstərilir`, 'success');

        } catch (error) {
            console.error(`❌ ${tableType} filter reset xətası:`, error);
            showNotification(`Filtrlər ləğv edilərkən xəta baş verdi: ${error.message}`, 'error');
        } finally {
            isLoading = false;
            hideLoadingOverlay();
            disableButtons(false);
        }
    }

    
    function showTaskManagerSection(section) {
        if (!section) return;
        const isTaskTableCard = section.classList.contains('table-card') && !section.classList.contains('new-task-section');
        section.style.display = isTaskTableCard ? 'flex' : 'block';
        section.classList.add('active-section');

        if (section.id === 'reportTableSection') {
            section.scrollTop = 0;
        }
    }

// ==================== BÜTÜN CƏDVƏLLƏRİ GÖSTƏR ====================
    function showAllTables() {
        const activeSection = document.getElementById('activeTableSection');
        const externalSection = document.getElementById('externalTableSection');
        const partnerSection = document.getElementById('partnerTableSection');
        const archiveSection = document.getElementById('archiveTableSection');

        if (activeSection) showTaskManagerSection(activeSection);
        if (externalSection) showTaskManagerSection(externalSection);
        if (partnerSection) showTaskManagerSection(partnerSection);
        if (archiveSection) showTaskManagerSection(archiveSection);

        const archiveCheckbox = document.getElementById('showArchiveTable');
        if (archiveCheckbox && archiveCheckbox.checked === false) {
            archiveCheckbox.checked = true;
            if (archiveSection) showTaskManagerSection(archiveSection);
        }

        console.log('✅ Bütün cədvəllər göstərildi');
    }

    // ==================== TASKLARI CƏDVƏLDƏ YÜKLƏ ====================
    async function loadTasksToTable(tableType, limit) {
        try {
            isLoading = true;
            disableButtons(true);

            const config = tableConfig[tableType];

            if (!config) {
                console.warn(`⚠️ Bilinməyən cədvəl tipi: ${tableType}, default active istifadə olunur`);
                return loadTasksToTable('active', limit);
            }

            showLoadingOverlay(`${getTableName(tableType)} - ${limit} task yüklənir...`);

            const userInfo = getCurrentUserInfo();

            if (!userInfo.userId) {
                throw new Error('İstifadəçi məlumatı tapılmadı');
            }

            const tasks = await fetchTasksByTableType(tableType, userInfo, limit, config);

            console.log(`✅ ${tableType} cədvəli üçün ${tasks.length} task yükləndi`);

            if (tasks.length === 0) {
                showEmptyTable(tableType, config);
                showNotification(`${getTableName(tableType)} cədvəlində heç bir tapşırıq tapılmadı`, 'info');
                return;
            }

            renderTasksInTable(tableType, tasks, limit, config);
            updateTableHeaderCount(tableType, tasks.length, limit);
            showNotification(`${tasks.length} tapşırıq yükləndi (${getTableName(tableType)})`, 'success');

        } catch (error) {
            console.error(`❌ ${tableType} task yükləmə xətası:`, error);
            showNotification(`Tasklar yüklənərkən xəta baş verdi: ${error.message}`, 'error');
        } finally {
            isLoading = false;
            hideLoadingOverlay();
            disableButtons(false);
        }
    }


    // ==================== CƏDVƏL TİPİNƏ GÖRƏ TASKLARI YÜKLƏ ====================
    async function fetchTasksByTableType(tableType, userInfo, limit, config) {

        // ===== ACTIVE =====
        if (tableType === 'active') {
            const queryParams = new URLSearchParams({
                page: 1,
                limit: limit,
                status: config.apiStatus,
                assigned_to: userInfo.userId
            });
            const apiUrl = `/tasks/detailed?${queryParams.toString()}`;
            console.log(`📡 ${tableType} API: ${apiUrl}`);
            const response = await makeApiRequest(apiUrl, 'GET');
            return parseTasksResponse(response);
        }

        // ===== EXTERNAL =====
        if (tableType === 'external') {
            console.log(`📡 ${tableType} API: /tasks-external/`);
            const response = await window.taskManager.apiRequest('/tasks-external/', 'GET');
            console.log('📦 External tasks cavabı:', response);

            let tasks = [];
            if (response && response.data && Array.isArray(response.data)) {
                tasks = response.data;
            } else if (Array.isArray(response)) {
                tasks = response;
            }

            const activeStatuses = ['pending', 'in_progress', 'overdue', 'paused'];
            tasks = tasks.filter(task => activeStatuses.includes(task.status));

            return tasks.slice(0, limit);
        }

        // ===== PARTNER =====
        if (tableType === 'partner') {
            const queryParams = new URLSearchParams({
                page: 1,
                limit: limit,
                status: config.apiStatus
            });

            if (userInfo.companyId) {
                queryParams.append('company_id', userInfo.companyId);
            }

            const endpoint = `/partner-tasks/detailed?${queryParams.toString()}`;
            console.log(`📡 ${tableType} API: ${endpoint}`);

            const response = await makeApiRequest(endpoint, 'GET');
            console.log('📦 Partner cavab:', response);

            let tasks = [];
            if (response && response.data && Array.isArray(response.data)) {
                tasks = response.data;
            } else if (Array.isArray(response)) {
                tasks = response;
            } else if (response && response.items && Array.isArray(response.items)) {
                tasks = response.items;
            }

            return tasks;
        }

        // ===== ARCHIVE =====
        if (tableType === 'archive') {
            const activeArchiveTab = document.querySelector('.archive-tab-btn.active');
            let archiveType = 'internal';

            if (activeArchiveTab) {
                const archiveTypeAttr = activeArchiveTab.getAttribute('data-archive-type');
                if (archiveTypeAttr === 'external') {
                    archiveType = 'external';
                } else if (archiveTypeAttr === 'partner') {
                    archiveType = 'partner';
                } else {
                    archiveType = 'internal';
                }
            }

            console.log(`📡 ${tableType} API - Tip: ${archiveType}, Limit: ${limit}`);

            let apiUrl = '';
            let response = null;
            let tasks = [];

            // 🔥🔥🔥 BURADA YENİ FUNKSİYADAN İSTİFADƏ EDİN! 🔥🔥🔥
            const realCompanyId = getRealCompanyIdFromToken();
            console.log('🎯 ARCHIVE SORĞUSU ÜÇÜN COMPANY_ID:', realCompanyId);

            if (archiveType === 'external') {
                apiUrl = `/task-archive/external?page=1&limit=${limit}`;
                console.log(`📡 External Archive API: ${apiUrl}`);
                response = await makeApiRequest(apiUrl, 'GET');
            }
            else if (archiveType === 'partner') {
                apiUrl = `/task-archive/partners?page=1&limit=${limit}`;
                console.log(`📡 Partner Archive API: ${apiUrl}`);
                response = await makeApiRequest(apiUrl, 'GET');
            }
            else {
                // 🔥 MÜTLƏQ realCompanyId GEDİR!
                const queryParams = new URLSearchParams({
                    page: 1,
                    limit: limit,
                    company_id: realCompanyId
                });
                apiUrl = `/task-archive/?${queryParams.toString()}`;
                console.log(`📡 Internal Archive API: ${apiUrl}`);
                response = await makeApiRequest(apiUrl, 'GET');
            }

            console.log(`📦 ${archiveType} Archive cavab:`, response);

            if (response && response.items && Array.isArray(response.items)) {
                tasks = response.items;
            } else if (response && response.data && Array.isArray(response.data)) {
                tasks = response.data;
            } else if (Array.isArray(response)) {
                tasks = response;
            }

            console.log(`✅ ${archiveType} Archive-də ${tasks.length} task tapıldı (limit: ${limit})`);
            return tasks;
        }

        return [];
    }

    // ==================== PARSE TASKS RESPONSE ====================
    function parseTasksResponse(response) {
        let tasks = [];
        if (Array.isArray(response)) {
            tasks = response;
        } else if (response && response.data) {
            if (Array.isArray(response.data)) {
                tasks = response.data;
            } else if (response.data.items && Array.isArray(response.data.items)) {
                tasks = response.data.items;
            }
        } else if (response && response.items && Array.isArray(response.items)) {
            tasks = response.items;
        }
        return tasks;
    }

    // ==================== TASKLARI CƏDVƏLDƏ GÖSTƏR ====================
    function renderTasksInTable(tableType, tasks, limit, config) {
        const tbody = document.getElementById(config.tbodyId);

        if (!tbody) {
            console.error(`❌ ${config.tbodyId} elementi tapılmadı`);
            return;
        }

        if (!tasks || tasks.length === 0) {
            showEmptyTable(tableType, config);
            return;
        }

        let html = '';
        const currentPage = 1;

        tasks.forEach((task, index) => {
            let rowHtml = null;

            if (tableType === 'active' && window.ActiveRowCreator && typeof window.ActiveRowCreator.createActiveRowHTML === 'function') {
                rowHtml = window.ActiveRowCreator.createActiveRowHTML(task, index, currentPage);
            }
            else if (tableType === 'external' && window.ExternalRowCreator && typeof window.ExternalRowCreator.createExternalRowHTML === 'function') {
                rowHtml = window.ExternalRowCreator.createExternalRowHTML(task, index, currentPage);
            }
            else if (tableType === 'partner' && window.PartnerRowCreator && typeof window.PartnerRowCreator.createPartnerRowHTML === 'function') {
                rowHtml = window.PartnerRowCreator.createPartnerRowHTML(task, index, currentPage);
            }
            else if (tableType === 'archive' && window.ArchiveRowCreator && typeof window.ArchiveRowCreator.createArchiveRowHTML === 'function') {
                rowHtml = window.ArchiveRowCreator.createArchiveRowHTML(task, index, currentPage);
            }

            if (!rowHtml) {
                rowHtml = createSimpleRowHTML(tableType, task, index);
            }

            html += rowHtml;
        });

        tbody.innerHTML = html;

        const section = document.getElementById(config.sectionId);
        if (section && section.style.display === 'none') {
            showTaskManagerSection(section);
        }

        console.log(`✅ ${tableType} cədvəlinə ${tasks.length} task yükləndi`);
        updatePagination(tableType, tasks.length, limit);
    }

    // ==================== PAGINATION YENİLƏ ====================
    function updatePagination(tableType, totalTasks, limit) {
        if (window.taskManager && window.taskManager.pagination && window.taskManager.pagination[tableType]) {
            window.taskManager.pagination[tableType].hasMore = totalTasks >= (limit === 'Bütün' ? totalTasks : parseInt(limit));
            window.taskManager.pagination[tableType].page = 1;
            window.taskManager.pagination[tableType].total = totalTasks;

            if (typeof window.taskManager.updatePaginationUI === 'function') {
                window.taskManager.updatePaginationUI(tableType);
            }
        }
    }

    // ==================== SADƏ SƏTİR YARAT (FALLBACK) ====================
    function createSimpleRowHTML(tableType, task, index) {
        const serialNumber = index + 1;
        const statusText = getStatusText(task.status);
        const statusClass = getStatusClass(task.status);
        const dueDate = formatDate(task.due_date);
        const createdDate = formatDate(task.created_at);

        if (tableType === 'archive') {
            return `
                <tr data-task-id="${task.id}">
                    <td class="text-center">${serialNumber}</td>
                    <td>${createdDate}</td>
                    <td>${escapeHtml(task.company_name || task.company || '-')}</td>
                    <td>${escapeHtml(task.created_by_name || task.creator_name || '-')}</td>
                    <td>${escapeHtml(task.assigned_to_name || task.executor_name || '-')}</td>
                    <td>${escapeHtml(task.department_name || task.department || '-')}</td>
                    <td>${escapeHtml(task.work_type_name || task.work_type || '-')}</td>
                    <td class="description-col">${truncateText(task.task_description || task.description || '-', 50)}</td>
                    <td class="file-col">${hasAttachment(task.attachments) ? '<i class="fas fa-paperclip"></i>' : '-'}</td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td>${dueDate}</td>
                    <td>${formatDate(task.completed_date)}</td>
                    <td>${task.duration_minutes || '-'}</td>
                    <td>${task.hourly_rate || task.billing_rate || '-'}</td>
                    <td>${task.calculated_salary || '-'}</td>
                </tr>
            `;
        }

        if (tableType === 'partner') {
            return `
                <tr data-task-id="${task.id}">
                    <td class="text-center">${serialNumber}</td>
                    <td>${createdDate}</td>
                    <td>${escapeHtml(task.company_name || '-')}</td>
                    <td>${escapeHtml(task.created_by_name || '-')}</td>
                    <td>${escapeHtml(task.assigned_to_name || '-')}</td>
                    <td>${dueDate}</td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn view-details" onclick="if(window.TableManager) TableManager.viewTaskDetails(${task.id})">
                                <i class="fas fa-info-circle"></i>
                            </button>
                        </div>
                    </td>
                    <td>${escapeHtml(task.work_type_name || '-')}</td>
                    <td class="description-col">${truncateText(task.description || '-', 50)}</td>
                    <td class="file-col">${hasAttachment(task.attachments) ? '<i class="fas fa-paperclip"></i>' : '-'}</td>
                    <td>${task.duration_minutes || '-'}</td>
                    <td>${escapeHtml(task.department_name || '-')}</td>
                </tr>
            `;
        }

        return `
            <tr data-task-id="${task.id}">
                <td class="text-center">${serialNumber}</td>
                <td>${createdDate}</td>
                <td>${escapeHtml(task.company_name || '-')}</td>
                <td>${escapeHtml(task.created_by_name || '-')}</td>
                <td>${escapeHtml(task.assigned_to_name || '-')}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>${escapeHtml(task.work_type_name || '-')}</td>
                <td class="description-col">${truncateText(task.description || '-', 50)}</td>
                <td class="file-col">${hasAttachment(task.attachments) ? '<i class="fas fa-paperclip"></i>' : '-'}</td>
                <td>${dueDate}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn view-details" onclick="if(window.TableManager) TableManager.viewTaskDetails(${task.id})">
                            <i class="fas fa-info-circle"></i>
                        </button>
                    </div>
                </td>
                <td>${formatDate(task.completed_date)}</td>
                <td>${task.duration_minutes || '-'}</td>
                <td>${escapeHtml(task.department_name || '-')}</td>
            </tr>
        `;
    }

    // ==================== BOŞ CƏDVƏL GÖSTƏR ====================
    function showEmptyTable(tableType, config) {
        const tbody = document.getElementById(config.tbodyId);
        if (!tbody) return;

        const emptyMessage = getEmptyMessage(tableType);

        tbody.innerHTML = `
            <tr class="empty-row">
                <td colspan="16">
                    <div class="empty-state">
                        <i class="fas fa-inbox fa-2x"></i>
                        <h3>${emptyMessage.title}</h3>
                        <p>${emptyMessage.description}</p>
                        <p class="empty-hint">${emptyMessage.hint || ''}</p>
                    </div>
                </td>
            </tr>
        `;

        updateTableHeaderCount(tableType, 0, null);
    }

    function getEmptyMessage(tableType) {
        const messages = {
            active: {
                title: 'Aktiv tapşırıq yoxdur',
                description: 'Hazırda sizə aid heç bir aktiv tapşırıq yoxdur.',
                hint: 'Yeni tapşırıq yaratmaq üçün "Yeni" bölməsini istifadə edin.'
            },
            external: {
                title: 'Digər şirkət tapşırıqları yoxdur',
                description: 'Hazırda digər şirkətlərdən heç bir tapşırıq gəlməyib.',
                hint: 'Digər şirkətlər sizə tapşırıq göndərdikdə burada görünəcək.'
            },
            partner: {
                title: 'Partnyor tapşırıqları yoxdur',
                description: 'Hazırda partnyor şirkətlərdən heç bir tapşırıq yoxdur.',
                hint: 'Partnyorlarınız sizə tapşırıq göndərdikdə burada görünəcək.'
            },
            archive: {
                title: 'Arxivlənmiş tapşırıq yoxdur',
                description: 'Hazırda heç bir arxivlənmiş tapşırıq yoxdur.',
                hint: 'Tamamlanmış tapşırıqlar avtomatik olaraq buraya arxivlənir.'
            }
        };
        return messages[tableType] || messages.active;
    }

    // ==================== CƏDVƏL BAŞLIĞINI YENİLƏ ====================
    function updateTableHeaderCount(tableType, count, limit) {
        const section = document.getElementById(tableConfig[tableType]?.sectionId);
        if (!section) return;

        const tableHeader = section.querySelector('.table-header');
        if (!tableHeader) return;

        const oldBadge = tableHeader.querySelector('.tasks-count-badge');
        if (oldBadge) oldBadge.remove();

        const badge = document.createElement('div');
        badge.className = '  tasks-count-badge';


        const tableMeta = tableHeader.querySelector('.table-meta');
        if (tableMeta) {
            tableMeta.appendChild(badge);
        } else {
            tableHeader.appendChild(badge);
        }
    }

    // ==================== DÜYMƏLƏRİ DEAKTİV ET ====================
    function disableButtons(disabled) {
        const buttons = document.querySelectorAll('.load-tasks-btn, .reset-filters-btn');
        buttons.forEach(btn => {
            btn.disabled = disabled;
        });
    }

    // ==================== İSTİFADƏÇİ MƏLUMATLARINI AL ====================
    function getCurrentUserInfo() {
        let userId = null;
        let companyId = null;

        // 🔥 1. TOKEN-dan yoxla (ƏN ETİBARLISI - HƏMİŞƏ İŞLƏYİR!)
        const token = localStorage.getItem('guven_token') || localStorage.getItem('access_token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                if (payload.company_id) {
                    companyId = payload.company_id;
                    userId = payload.user_id || payload.sub || payload.id;
                    console.log('✅ company_id TOKEN-dan alındı:', companyId);
                    console.log('✅ user_id TOKEN-dan alındı:', userId);
                    return { userId, companyId };
                }
            } catch(e) {
                console.warn('⚠️ Token parse xətası:', e);
            }
        }

        // 2. TaskManager-dan yoxla (fallback)
        if (window.taskManager && window.taskManager.userData) {
            userId = window.taskManager.userData.userId || window.taskManager.userData.id;
            companyId = window.taskManager.userData.companyId || window.taskManager.userData.company_id;
            if (companyId) {
                console.log('✅ company_id taskManager-dan alındı:', companyId);
                return { userId, companyId };
            }
        }

        // 3. LocalStorage-dan yoxla (son çarə)
        const stored = localStorage.getItem('guven_user_data');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (parsed.company_id) {
                    companyId = parsed.company_id;
                    userId = parsed.user_id;
                    console.log('✅ company_id localStorage-dan alındı:', companyId);
                    return { userId, companyId };
                }
                if (parsed.user?.company_id) {
                    companyId = parsed.user.company_id;
                    userId = parsed.user.id;
                    console.log('✅ company_id localStorage.user-dan alındı:', companyId);
                    return { userId, companyId };
                }
            } catch(e) {}
        }

        // 4. Company koduna görə təyin et (son çarə)
        const companyCode = localStorage.getItem('company_code') ||
                           window.taskManager?.userData?.companyCode ||
                           'GUV26001';
        if (companyCode === 'GUV26001') {
            companyId = 51;
            console.log('🎯 HARDCODE (GUV26001) company_id:', companyId);
        } else if (companyCode === 'SOC26001') {
            companyId = 55;
            console.log('🎯 HARDCODE (SOC26001) company_id:', companyId);
        } else {
            companyId = 51;
            console.log('🎯 DEFAULT company_id:', companyId);
        }

        // User ID üçün də default
        if (!userId) {
            userId = 134; // Güvən Finans üçün
            console.log('🎯 DEFAULT user_id:', userId);
        }

        return { userId, companyId };
    }

    // ==================== LOADING OVERLAY ====================
    function showLoadingOverlay(message = 'Yüklənir...') {
        if (loadingOverlay) {
            loadingOverlay.style.display = 'flex';
            const msgElement = loadingOverlay.querySelector('.loading-message');
            if (msgElement) msgElement.textContent = message;
            return;
        }

        loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'task-loading-overlay';
        loadingOverlay.innerHTML = `
            <div class="task-loading-spinner">
                <div class="spinner"></div>
                <p class="loading-message">${message}</p>
            </div>
        `;
        document.body.appendChild(loadingOverlay);
    }

    function hideLoadingOverlay() {
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }

    function setupArchiveTabs() {
        const archiveTabs = document.querySelectorAll('.archive-tab-btn');

        archiveTabs.forEach(tab => {
            const newTab = tab.cloneNode(true);
            tab.parentNode.replaceChild(newTab, tab);

            newTab.addEventListener('click', async (e) => {
                e.preventDefault();

                // Active class-ı dəyiş
                document.querySelectorAll('.archive-tab-btn').forEach(t => {
                    t.classList.remove('active');
                });
                newTab.classList.add('active');

                // Archive tipini al
                const archiveType = newTab.getAttribute('data-archive-type');

                // Limit-i al
                const archiveSelect = document.querySelector('.task-limit-select[data-table="archive"]');
                let limit = '50';
                if (archiveSelect) {
                    limit = archiveSelect.value;
                }

                console.log(`🔄 Archive tab dəyişdi: ${archiveType}, limit: ${limit}`);

                // Taskları yüklə
                await loadTasksToTable('archive', limit);

                // SAYI YENİLƏ - ARCHIVE TİPİNƏ GÖRƏ
                if (window.taskManager && typeof window.taskManager.updateArchiveTaskCount === 'function') {
                    // Bir az gecikmə ilə çağır ki, cədvəl yüklənsin
                    setTimeout(() => {
                        window.taskManager.updateArchiveTaskCount(archiveType);
                    }, 300);
                }
            });
        });

        console.log('✅ Archive tab eventləri hazırlandı');
    }

    // ==================== BİLDİRİŞ SİSTEMİ ====================
    function showNotification(message, type = 'info') {
        if (window.notificationService && typeof window.notificationService.show === 'function') {
            window.notificationService.show(message, type);
            return;
        }

        const toast = document.createElement('div');
        const bgColor = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6';
        toast.style.cssText = `
            position: fixed; bottom: 20px; right: 20px; background: ${bgColor};
            color: white; padding: 12px 20px; border-radius: 12px; z-index: 10000;
            font-size: 14px; font-weight: 500; animation: slideInRight 0.3s ease;
            cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);

        toast.onclick = () => {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        };

        if (!document.querySelector('#toastAnimations')) {
            const style = document.createElement('style');
            style.id = 'toastAnimations';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOutRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // ==================== YARDIMÇI FUNKSİYALAR ====================
    function getTableName(tableType) {
        const names = {
            active: 'Aktiv tapşırıqlar',
            external: 'Digər şirkət tapşırıqları',
            partner: 'Partnyor tapşırıqları',
            archive: 'Arxiv tapşırıqları'
        };
        return names[tableType] || tableType;
    }

    function formatDate(dateString) {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('az-AZ');
        } catch {
            return dateString;
        }
    }

    function getStatusText(status) {
        const statusMap = {
            'pending': 'Gözləmədə',
            'in_progress': 'İcra edilir',
            'completed': 'Tamamlandı',
            'overdue': 'Gecikmiş',
            'paused': 'Fasilə',
            'rejected': 'İmtina edildi',
            'cancelled': 'Ləğv edildi',
            'archived': 'Arxivləndi'
        };
        return statusMap[status] || status || '-';
    }

    function getStatusClass(status) {
        const classMap = {
            'pending': 'status-pending',
            'in_progress': 'status-in-progress',
            'completed': 'status-completed',
            'overdue': 'status-overdue',
            'paused': 'Fasilə',
            'rejected': 'status-pending',
            'cancelled': 'status-pending',
            'archived': 'status-completed'
        };
        return classMap[status] || 'status-pending';
    }

    function hasAttachment(attachments) {
        if (!attachments) return false;
        if (Array.isArray(attachments) && attachments.length > 0) return true;
        if (typeof attachments === 'string' && attachments !== '[]' && attachments !== 'null') return true;
        return false;
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function truncateText(text, maxLength) {
        if (!text) return '-';
        if (text.length <= maxLength) return escapeHtml(text);
        return escapeHtml(text.substring(0, maxLength)) + '...';
    }

    // ==================== MODULU İNİSİALİZASIYA ET ====================
    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(setupLoadButtons, 100);
            });
        } else {
            setTimeout(setupLoadButtons, 100);
        }

        console.log('✅ Task List modulu hazırdır (50/100 task + reset filters)');
    }

    init();

    window.addEventListener('taskManagerReady', () => {
        setTimeout(setupLoadButtons, 500);
    });

})();