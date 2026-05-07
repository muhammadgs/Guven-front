// tableManager.js - Təmizlənmiş versiya
// YALNIZ ÖZ JAVA SKRİPTİMİZDƏN İSTİFADƏ EDİR

const TableManager = {

    // Element references
    tableBodies: {
        active: null,
        archive: null,
        external: null,
        partner: null
    },
    metaElements: {
        active: null,
        archive: null,
        external: null,
        partner: null
    },

    totalTasks: 0,

    // ==================== INITIALIZATION ====================
    initialize: function () {
        console.log('📊 TableManager initialize edilir...');

        // Get table bodies
        this.tableBodies.active = document.getElementById('tableBody');
        this.tableBodies.archive = document.getElementById('archiveTableBody');
        this.tableBodies.external = document.getElementById('externalTableBody');
        this.tableBodies.partner = document.getElementById('partnerTableBody');

        // Get meta elements
        this.metaElements.active = document.getElementById('tableMeta');
        this.metaElements.archive = document.getElementById('archiveMeta');
        this.metaElements.external = document.getElementById('externalMeta');
        this.metaElements.partner = document.getElementById('partnerMeta');

        console.log('✅ TableManager hazırdır');
        return this;
    },

    // ==================== TABLE RENDERING ====================
    renderTasksTable: function (tableType, tasks, append = false, currentPage = 1) {
        const tbody = this.tableBodies[tableType];
        if (!tbody) {
            console.error(`❌ ${tableType} tbody tapılmadı`);
            return;
        }

        if (!append) {
            tbody.innerHTML = '';
        }

        if (!tasks || tasks.length === 0) {
            this.showEmptyTable(tableType, tbody);
            return;
        }

        // Loading indicator-ı gizlət (əgər varsa)
        const loadingRow = tbody.querySelector('.loading-row');
        if (loadingRow) {
            loadingRow.style.display = 'none';
        }

        const tasksWithAttachments = tasks.map(async (task) => {
            if (tableType === 'active') {
                try {
                    const response = await this.apiRequest(`/tasks/${task.id}`, 'GET');
                    if (response && !response.error) {
                        const taskDetail = response.data || response;

                        if (taskDetail.attachments && taskDetail.attachments !== '[]') {
                            task.attachments = taskDetail.attachments;
                        }

                        // ✅ file_uuids - PostgreSQL "{uuid,uuid}" formatını düzəlt
                        let rawUuids = taskDetail.file_uuids;

                        if (typeof rawUuids === 'string') {
                            rawUuids = rawUuids
                                .replace(/^\{/, '').replace(/\}$/, '')
                                .split(',')
                                .map(s => s.trim().replace(/"/g, ''))
                                .filter(s => s.length === 36 && s.includes('-'));
                        }

                        if (Array.isArray(rawUuids) && rawUuids.length > 0) {
                            const validUuids = rawUuids.filter(uuid =>
                                typeof uuid === 'string' &&
                                uuid.length === 36 &&
                                uuid.includes('-')
                            );
                            task.file_uuids = validUuids;
                            task.file_count = validUuids.length;
                        } else {
                            task.file_uuids = [];
                            task.file_count = 0;
                        }
                    }
                } catch (e) {
                    console.error(`❌ Task ${task.id} xətası:`, e);
                }
            }

            if (!task.attachments) task.attachments = [];
            return task;
        });

        // ========== 2. BÜTÜN SƏTİRLƏRİ YARAT ==========
        Promise.all(tasksWithAttachments).then(async (processedTasks) => {
            const rows = [];

            for (let i = 0; i < processedTasks.length; i++) {
                const task = processedTasks[i];
                try {
                    let html = '';

                    switch (tableType) {
                        case 'active':
                            if (window.ActiveRowCreator && typeof window.ActiveRowCreator.createActiveRowHTML === 'function') {
                                html = window.ActiveRowCreator.createActiveRowHTML(task, i, currentPage);
                            } else {
                                console.error('❌ ActiveRowCreator.createActiveRowHTML funksiyası mövcud deyil!');
                                html = this.createFallbackActiveRowHTML(task, i, currentPage);
                            }
                            break;

                        case 'archive':
                            if (window.ArchiveTasks && typeof window.ArchiveTasks.createArchiveRowHTML === 'function') {
                                html = window.ArchiveTasks.createArchiveRowHTML(task, i, currentPage);
                            } else {
                                html = this.createFallbackArchiveRowHTML(task, i, currentPage);
                            }
                            break;

                        case 'external':
                            if (window.ExternalRowCreator && typeof window.ExternalRowCreator.createExternalRowHTML === 'function') {
                                html = window.ExternalRowCreator.createExternalRowHTML(task, i, currentPage);
                            } else {
                                html = this.createFallbackExternalRowHTML(task, i, currentPage);
                            }
                            break;

                        case 'partner':
                            if (window.PartnerRowCreator && typeof window.PartnerRowCreator.createPartnerRowHTML === 'function') {
                                html = window.PartnerRowCreator.createPartnerRowHTML(task, i, currentPage);
                            } else {
                                html = this.createFallbackPartnerRowHTML(task, i, currentPage);
                            }
                            break;

                        default:
                            html = this.createFallbackActiveRowHTML(task, i, currentPage);
                    }

                    const row = document.createElement('tr');
                    row.innerHTML = html;
                    row.setAttribute('data-task-id', task.id);
                    rows.push(row);

                } catch (error) {
                    console.error(`❌ ${tableType} sətir yaradılarkən xəta (task ${task.id}):`, error);
                    const errorRow = document.createElement('tr');
                    errorRow.innerHTML = `<td colspan="20" style="color: #ef4444; text-align: center;">Xəta: ${error.message}</td>`;
                    rows.push(errorRow);
                }
            }

            // ========== 3. SƏTİRLƏRİ CƏDVƏLƏ ƏLAVƏ ET ==========
            if (append) {
                rows.forEach(row => {
                    if (row) tbody.appendChild(row);
                });
            } else {
                tbody.innerHTML = '';
                rows.forEach(row => {
                    if (row) tbody.appendChild(row);
                });
            }

            // ========== 4. META MƏLUMATLARI YENİLƏ ==========
            this.updateTableMeta(tableType, tasks.length);

            // ========== 5. SAYLARI YENİLƏ (active cədvəli üçün) ==========
            if (tableType === 'active') {
                if (typeof this.updateTaskCount === 'function') {
                    await this.updateTaskCount();
                }
                if (typeof this.updateExternalTaskCount === 'function') {
                    this.updateExternalTaskCount();
                }
                if (typeof this.updatePartnerTaskCount === 'function') {
                    this.updatePartnerTaskCount();
                }
                if (typeof this.updateArchiveTaskCount === 'function') {
                    this.updateArchiveTaskCount();
                }
            }

            // ========== 6. COMMENT BADGE-LƏRİNİ YENİLƏ ==========
            if (tableType === 'active' && tasks.length > 0 && window.CommentTracker) {
                const taskIds = tasks.map(t => t.id).filter(id => id);
                setTimeout(() => {
                    window.CommentTracker.initForTasks(taskIds);
                }, 150);
            }

            // ========== 7. TIMER SİSTEMLƏRİNİ BAŞLAT (active cədvəli üçün) ==========
            if (tableType === 'active' && window.TaskTimerSystem) {
                tasks.forEach(task => {
                    if (task.status === 'pending_approval' || task.status === 'approval_overdue') {
                        setTimeout(() => {
                            window.TaskTimerSystem.startConfirmationCountdown(task.id, task.approval_expires_at);
                        }, 100);
                    } else if (task.status === 'in_progress' || task.status === 'paused') {
                        setTimeout(() => {
                            const isPaused = task.status === 'paused';
                            window.TaskTimerSystem.startWorkTimer(task.id, task.started_at, task.total_paused_seconds || 0);
                            if (isPaused && window.TaskTimerSystem.workTimers[`work_${task.id}`]) {
                                window.TaskTimerSystem.workTimers[`work_${task.id}`].isPaused = true;
                            }
                        }, 150);
                    }
                });
            }

            console.log(`✅ ${tableType} cədvəli ${tasks.length} sətirlə yeniləndi`);

            // ========== 8. CUSTOM EVENT GÖNDƏR ==========
            window.dispatchEvent(new CustomEvent('tableRendered', {
                detail: { tableType, taskCount: tasks.length, page: currentPage }
            }));

        }).catch(error => {
            console.error(`❌ ${tableType} sətirlər yaradılarkən ümumi xəta:`, error);
            tbody.innerHTML = `<tr><td colspan="20" style="color: #ef4444; text-align: center;">Cədvəl yüklənərkən xəta: ${error.message}</td></tr>`;
        });
    },

    // ==================== FALLBACK FUNCTIONS ====================
    createFallbackExternalRowHTML: function (task, index, currentPage) {
        console.log('⚠️ Fallback createExternalRowHTML istifadə olunur');
        const serialNumber = (currentPage - 1) * 20 + index + 1;

        return `
            <td>${serialNumber}</td>
            <td>${this.formatDate(task.created_at)}</td>
            <td>${this.escapeHtml(task.company_name || '-')}</td>
            <td>${this.escapeHtml(task.creator_name || '-')}</td>
            <td>${this.escapeHtml(task.assigned_to_name || 'Təyin edilməyib')}</td>
            <td>${this.escapeHtml(task.task_title || task.title || '-')}</td>
            <td>${this.truncateText(task.task_description || task.description || '', 50)}</td>
            <td>${this.formatDate(task.due_date)}</td>
            <td><span class="status-badge ${this.getStatusClass(task.status)}">${this.getStatusText(task.status)}</span></td>
            <td>
                <button class="btn btn-sm btn-info" onclick="TableManager.viewTaskDetails(${task.id})">
                    <i class="fa-solid fa-eye"></i>
                </button>
                ${task.status === 'pending' ? `
                <button class="btn btn-sm btn-success" onclick="TableManager.takeTaskFromOthers(${task.id})">
                    <i class="fa-solid fa-hand-paper"></i>
                </button>
                ` : ''}
            </td>
        `;
    },

    createFallbackPartnerRowHTML: function (task, index, currentPage) {
        console.log('⚠️ Fallback createPartnerRowHTML istifadə olunur');
        const serialNumber = (currentPage - 1) * 20 + index + 1;

        return `
            <td>${serialNumber}</td>
            <td>${this.formatDate(task.created_at)}</td>
            <td>${this.escapeHtml(task.partner_company_name || task.company_name || '-')}</td>
            <td>${this.escapeHtml(task.creator_name || '-')}</td>
            <td>${this.escapeHtml(task.assigned_to_name || 'Təyin edilməyib')}</td>
            <td>${this.escapeHtml(task.task_title || task.title || '-')}</td>
            <td>${this.truncateText(task.task_description || task.description || '', 50)}</td>
            <td>${this.formatDate(task.due_date)}</td>
            <td><span class="status-badge ${this.getStatusClass(task.status)}">${this.getStatusText(task.status)}</span></td>
            <td>
                <button class="btn btn-sm btn-info" onclick="TableManager.viewTaskDetails(${task.id})">
                    <i class="fa-solid fa-eye"></i>
                </button>
            </td>
        `;
    },

    createFallbackActiveRowHTML: function (task, index, currentPage) {
        console.log('⚠️ Fallback createActiveRowHTML istifadə olunur');
        const serialNumber = (currentPage - 1) * 20 + index + 1;

        return `
            <td>${serialNumber}</td>
            <td>${this.formatDate(task.created_at)}</td>
            <td>${this.escapeHtml(task.company_name || '-')}</td>
            <td>${this.escapeHtml(task.creator_name || '-')}</td>
            <td>${this.escapeHtml(task.assigned_to_name || 'Təyin edilməyib')}</td>
            <td>${this.formatDate(task.due_date)}</td>
            <td><span class="status-badge ${this.getStatusClass(task.status)}">${this.getStatusText(task.status)}</span></td>
            <td>
                <button class="btn btn-sm btn-info" onclick="TableManager.viewTaskDetails(${task.id})">
                    <i class="fa-solid fa-eye"></i>
                </button>
            </td>
        `;
    },

    createFallbackArchiveRowHTML: function (task, index, currentPage) {
        console.log('⚠️ Fallback createArchiveRowHTML istifadə olunur');
        const serialNumber = (currentPage - 1) * 20 + index + 1;

        return `
            <td>${serialNumber}</td>
            <td>${this.formatDate(task.created_at)}</td>
            <td>${this.escapeHtml(task.company_name || '-')}</td>
            <td>${this.escapeHtml(task.creator_name || '-')}</td>
            <td>${this.escapeHtml(task.assigned_to_name || 'Təyin edilməyib')}</td>
            <td>${this.formatDate(task.due_date)}</td>
            <td><span class="status-badge ${this.getStatusClass(task.status)}">${this.getStatusText(task.status)}</span></td>
            <td>${this.formatDate(task.completed_date || task.completed_at)}</td>
            <td>${this.formatDate(task.archived_at || '-')}</td>
            <td>
                <button class="btn btn-sm btn-info" onclick="TableManager.viewTaskDetails(${task.id})">
                    <i class="fa-solid fa-eye"></i>
                </button>
            </td>
        `;
    },

    // ==================== FILE FUNCTIONS (FileUploadManager-ə YÖNLƏNDİRİLDİ) ====================
    previewFile: function(fileId, filename, mimeType, isAudioRecording = false) {
        if (window.FileUploadManager && typeof window.FileUploadManager.previewFile === 'function') {
            window.FileUploadManager.previewFile(fileId, filename, mimeType, isAudioRecording);
        } else {
            console.error('❌ FileUploadManager.previewFile tapılmadı');
            this.showError('Fayl önizləmə modulu yüklənməyib');
        }
    },

    showAllFiles: function(taskId) {
        if (window.FileUploadManager && typeof window.FileUploadManager.showAllFiles === 'function') {
            window.FileUploadManager.showAllFiles(taskId);
        } else {
            console.error('❌ FileUploadManager.showAllFiles tapılmadı');
            this.showError('Fayl göstərmə funksiyası tapılmadı');
        }
    },

    showTaskFiles: function(taskId) {
        // tableManager.js - showTaskFiles funksiyasını DƏYİŞDİRİN
        TableManager.showTaskFiles = function(taskId) {
            console.log(`📁 TableManager.showTaskFiles çağırıldı: ${taskId}`);
            if (FileUploadManager && FileUploadManager.showTaskFiles) {
                FileUploadManager.showTaskFiles(taskId);
            } else {
                console.error('❌ FileUploadManager.showTaskFiles tapılmadı');
                alert('Fayl göstərmə funksiyası hazır deyil. Səhifəni yeniləyin.');
            }
        };
    },

    downloadFile: function(fileId, filename) {
        if (window.FileUploadManager && typeof window.FileUploadManager.downloadFile === 'function') {
            window.FileUploadManager.downloadFile(fileId, filename);
        } else {
            console.error('❌ FileUploadManager.downloadFile tapılmadı');
            this.showError('Fayl yükləmə modulu yüklənməyib');
        }
    },

    closeModal: function(modalId) {
        if (window.FileUploadManager && typeof window.FileUploadManager.closeModal === 'function') {
            window.FileUploadManager.closeModal(modalId);
        } else {
            const modal = document.getElementById(modalId);
            if (modal) modal.remove();
        }
    },

    // tableManager.js - takeTaskFromOthers metodunu sadələşdirin
    takeExternalTaskFromOthers: async function (taskId) {
        try {
            console.log(`🔄 İş götürülür: ${taskId}`);

            // Birbaşa ExternalTableManager-ə yönləndir
            if (window.ExternalTableManager && window.ExternalTableManager.takeTaskFromOthers) {
                console.log('📞 Birbaşa ExternalTableManager.takeTaskFromOthers çağırılır');
                return await window.ExternalTableManager.takeTaskFromOthers(taskId);
            } else {
                console.error('❌ ExternalTableManager tapılmadı');
                alert('External iş götürmə funksiyası tapılmadı');
                return false;
            }
        } catch (error) {
            console.error('❌ İş götürülərkən xəta:', error);
            alert('Xəta: ' + error.message);
            return false;
        }
    },

    startTask: async function (taskId) {
        try {
            console.log(`▶️ Task başladılır: ${taskId}`);

            const updateData = {
                status: 'in_progress',
                started_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            console.log('📦 Start task data (PATCH):', updateData);

            const response = await this.apiRequest(`/tasks/${taskId}`, 'PATCH', updateData);

            if (response && !response.error) {
                this.autoRefreshAfterAction();
            } else {
                throw new Error('İş başladıla bilmədi');
            }

        } catch (error) {
            console.error('❌ İş başladılarkən xəta:', error);
            this.showError('Xəta: ' + error.message);
        }
    },

    // completeTask funksiyasının içində (təxminən sətir 400-500 arası)

    completeTask: async function(taskId, tableType = 'active') {
        try {
            console.log(`🔵 completeTask başladı: ${taskId}, table: ${tableType}`);

            const taskResponse = await this.apiRequest(`/tasks/${taskId}`, 'GET');

            if (!taskResponse || taskResponse.error) {
                console.error('❌ Task tapılmadı:', taskResponse);
                throw new Error('Task tapılmadı');
            }

            const task = taskResponse.data || taskResponse;
            const taskTitle = task.task_title || task.title || 'Task';
            const confirmMsg = `"${taskTitle}" task-ını tamamlandı olaraq qeyd etmək istədiyinizə əminsiniz?`;

            if (!confirm(confirmMsg)) {
                console.log('❌ İstifadəçi ləğv etdi');
                return;
            }

            const updateData = {
                status: 'completed',
                completed_date: new Date().toISOString()
            };

            console.log(`🔄 Task yenilənir (PATCH): ${taskId}`, updateData);
            const updateResponse = await this.apiRequest(`/tasks/${taskId}`, 'PATCH', updateData);

            if (updateResponse && !updateResponse.error) {
                this.playTaskSound('taskCompleted');
                this.showSuccess('✅ İş tamamlandı!');

                // 🔥 DƏYİŞİKLİK BURADA - 'completed' actionType ilə çağır
                await this.autoRefreshAfterAction(taskId, tableType, 'completed');
            } else {
                console.error('❌ Task tamamlandı edilə bilmədi:', updateResponse);
                throw new Error('Task tamamlandı edilə bilmədi');
            }

        } catch (error) {
            console.error('❌ Task tamamlanarkən xəta:', error);
            this.showError('Xəta: ' + error.message);
        }
    },

    rejectTask: async function (taskId, tableType = 'active') {
        try {
            const comment = prompt('Rədd etmə səbəbini yazın (məcburi):', '');

            if (!comment || comment.trim() === '') {
                alert('❌ Rədd etmə səbəbi məcburidir!');
                return;
            }

            if (!confirm(`Bu işi imtina etmək istədiyinizə əminsiniz?\n\nSəbəb: ${comment}`)) {
                return;
            }

            console.log(`❌ Task imtina edilir: ${taskId}`);

            const updateData = {
                status: 'rejected',
                reason: comment
            };

            const response = await this.apiRequest(`/tasks/${taskId}`, 'PATCH', updateData);

            if (response && !response.error) {
                this.playTaskSound('taskRejected');
                this.showSuccess('✅ İş imtina edildi!');
                this.autoRefreshAfterAction(taskId, tableType, 'rejected');
            } else {
                throw new Error('Task imtina edilə bilmədi');
            }

        } catch (error) {
            console.error('❌ Task imtina edilərkən xəta:', error);
            this.showError('Xəta: ' + error.message);
        }
    },

    openEditModal: async function(taskId, tableType = 'active') {
        console.log(`✏️ Edit modal açılır: ${taskId}, ${tableType}`);

        if (window.TaskEditModule && typeof window.TaskEditModule.openEditTaskModal === 'function') {
            await window.TaskEditModule.openEditTaskModal(taskId, tableType);
        } else {
            console.error('❌ TaskEditModule tapılmadı!');
            this.showError('Redaktə modulu yüklənməyib. Səhifəni yeniləyin.');
        }
    },

    // ==================== API REQUEST FUNCTION ====================
    apiRequest: async function(endpoint, method = 'GET', data = null) {
        try {
            console.log(`📡 TableManager API Request: ${method} ${endpoint}`);

            if (typeof window.makeApiRequest === 'function') {
                return await window.makeApiRequest(endpoint, method, data);
            } else {
                console.error('❌ makeApiRequest function not found!');
                throw new Error('API request function not available');
            }
        } catch (error) {
            console.error('❌ TableManager API Request Error:', error);
            throw error;
        }
    },

    // ==================== FILE UPLOAD FUNCTIONS ====================
    openFileUpload: function(taskId, tableType) {
        if (window.FileUploadManager && typeof window.FileUploadManager.openFileUploadModal === 'function') {
            window.FileUploadManager.openFileUploadModal(taskId, tableType);
        } else {
            console.error('❌ FileUploadManager.openFileUploadModal tapılmadı');
            this.showError('Fayl yükləmə modulu yüklənməyib');
        }
    },

    uploadFiles: async function(taskId, tableType) {
        if (window.FileUploadManager && typeof window.FileUploadManager.uploadFiles === 'function') {
            return await window.FileUploadManager.uploadFiles(taskId, tableType);
        } else {
            console.error('❌ FileUploadManager.uploadFiles tapılmadı');
            this.showError('Fayl yükləmə modulu yüklənməyib');
            return { success: false, count: 0 };
        }
    },


    // ==================== TOGGLE FUNCTIONS ====================
    toggleDescription: function (taskId) {
        const truncated = document.getElementById(`desc-${taskId}`);
        const full = document.getElementById(`full-desc-${taskId}`);
        const button = truncated?.nextElementSibling?.nextElementSibling ||
            truncated?.parentElement?.querySelector('.expand-btn');

        if (truncated && full) {
            if (truncated.style.display === 'none') {
                truncated.style.display = 'block';
                full.style.display = 'none';
                if (button) {
                    button.innerHTML = '<i class="fas fa-expand-alt"></i> Tam bax';
                    button.title = 'Tam açıqlamaya bax';
                }
            } else {
                truncated.style.display = 'none';
                full.style.display = 'block';
                if (button) {
                    button.innerHTML = '<i class="fas fa-compress-alt"></i> Qısa bax';
                    button.title = 'Qısa versiyaya qayıt';
                }
            }
        }
    },

    togglePartnerDescription: function(taskId) {
        if (window.PartnerRowCreator && typeof window.PartnerRowCreator.togglePartnerDescription === 'function') {
            window.PartnerRowCreator.togglePartnerDescription(taskId);
        } else {
            console.warn('⚠️ PartnerRowCreator.togglePartnerDescription tapılmadı');
        }
    },

    // ==================== NOTIFICATION FUNCTIONS ====================
    showSuccess: function (message) {
        if (typeof notificationService !== 'undefined' && notificationService.showSuccess) {
            notificationService.showSuccess(message);
        } else {
            alert('✅ ' + message);
        }
    },

    showError: function (message) {
        if (typeof notificationService !== 'undefined' && notificationService.showError) {
            notificationService.showError(message);
        } else {
            alert('❌ ' + message);
        }
    },

    showInfo: function(message) {
        if (typeof notificationService !== 'undefined' && notificationService.showInfo) {
            notificationService.showInfo(message);
        } else {
            alert('ℹ️ ' + message);
        }
    },

    viewTaskComments: async function (taskId) {
        try {
            console.log(`🔍 Viewing comments for task ${taskId}`);

            // 🔥 MODAL AÇILANDA - oxunmamış comment-ləri SIFIRLA
            if (window.CommentTracker) {
                window.CommentTracker.markAsRead(taskId);
            }

            const existingModal = document.getElementById('commentsModalOverlay');
            const existingTaskId = existingModal?.dataset.taskId;

            if (existingModal && existingTaskId == taskId) {
                console.log('🔄 Refreshing existing modal');
                await this.refreshComments(taskId);
                return;
            }

            const response = await this.apiRequest(`/comments/task/${taskId}`, 'GET');

            if (response && !response.error) {
                const comments = response.items || response.data || response || [];
                console.log(`✅ Found ${comments.length} comments`);
                this.showCommentsModal(taskId, comments, false);
            } else {
                console.warn('⚠️ No comments found');
                this.showCommentsModal(taskId, [], false);
            }

        } catch (error) {
            console.error('❌ Error viewing comments:', error);
            this.showCommentsModal(taskId, [], false);
        }
    },
    refreshComments: async function (taskId) {
        try {
            console.log(`🔄 Refreshing comments for task ${taskId}`);

            // Sonsuz dövrə qarşı
            if (this._isRefreshing === taskId) {
                console.log('⚠️ Already refreshing');
                return;
            }

            this._isRefreshing = taskId;

            const response = await this.apiRequest(`/comments/task/${taskId}`, 'GET');

            if (response && !response.error) {
                let comments = [];
                if (Array.isArray(response)) {
                    comments = response;
                } else if (response.data && Array.isArray(response.data)) {
                    comments = response.data;
                } else if (response.items && Array.isArray(response.items)) {
                    comments = response.items;
                }

                console.log(`✅ Refreshed: ${comments.length} comments`);

                // Modal mövcuddursa, yenilə
                const modal = document.getElementById('commentsModalOverlay');
                if (modal) {
                    this.updateCommentsModal(comments);
                } else {
                    // Modal yoxdursa, yenidən yarat
                    this.showCommentsModal(taskId, comments, false);
                }

                if (typeof window.refreshCommentCount === 'function') {
                    window.refreshCommentCount(taskId);
                }
            }

            delete this._isRefreshing;

        } catch (error) {
            console.error('❌ Error refreshing comments:', error);
            delete this._isRefreshing;
            this.showToast('❌ Comment-lər yenilənərkən xəta', 'error');
        }
    },

    // Yeni köməkçi metod
    updateCommentsListOnly: function(commentsList, comments) {
        if (!comments || comments.length === 0) {
            commentsList.innerHTML = '<div class="no-comments">Heç bir comment yoxdur</div>';
            return;
        }

        let html = '';
        comments.forEach((comment) => {
            const commentData = comment.data || comment;
            let userName = this.getCommentUserName(commentData);
            const dateStr = this.formatDate(commentData.created_at);
            const commentText = commentData.comment_text || '';

            html += `
                <div class="comment-item" data-comment-id="${commentData.id}">
                    <div class="comment-header">
                        <span class="comment-author"><i class="fa-regular fa-user"></i> ${this.escapeHtml(userName)}</span>
                        <span class="comment-date"><i class="fa-regular fa-calendar"></i> ${dateStr}</span>
                    </div>
                    <div class="comment-text">${this.escapeHtml(commentText)}</div>
                </div>
            `;
        });

        commentsList.innerHTML = html;

        // Scroll to bottom
        const modalBody = document.querySelector('#commentsModalOverlay .modal-body');
        if (modalBody) {
            modalBody.scrollTop = modalBody.scrollHeight;
        }
    },

    getCommentUserName: function(commentData) {
        if (commentData.user) {
            if (commentData.user.full_name_with_lastname) return this.escapeHtml(commentData.user.full_name_with_lastname);
            if (commentData.user.full_name) {
                const lastName = commentData.user.last_name || '';
                return this.escapeHtml(`${commentData.user.full_name} ${lastName}`.trim());
            }
            if (commentData.user.name) return this.escapeHtml(commentData.user.name);
            if (commentData.user.username) return this.escapeHtml(commentData.user.username);
            if (commentData.user.email) return this.escapeHtml(commentData.user.email.split('@')[0]);
        }
        if (commentData.created_by_name) return this.escapeHtml(commentData.created_by_name);
        if (commentData.user_id) return `İstifadəçi ID: ${commentData.user_id}`;
        return 'Anonim';
    },

    showTaskDetailsModal: function (task, taskType) {
        const modalHTML = `
            <div class="task-details-modal-overlay" id="taskDetailsModalOverlay">
                <div class="task-details-modal">
                    <div class="modal-header">
                        <h3><i class="fa-solid fa-info-circle"></i> Task Detalları</h3>
                        <button class="close-btn" onclick="TableManager.closeTaskDetailsModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="task-details-grid">
                            <div class="detail-group">
                                <label>Task Başlığı:</label>
                                <div class="detail-value">${this.escapeHtml(task.task_title || task.title || 'Adsız')}</div>
                            </div>
                            
                            <div class="detail-group">
                                <label>Açıqlama:</label>
                                <div class="detail-value">${this.escapeHtml(task.task_description || task.description || 'Yoxdur')}</div>
                            </div>
                            
                            <div class="detail-group">
                                <label>Qeydlər:</label>
                                <div class="detail-value">${this.escapeHtml(task.notes || 'Yoxdur')}</div>
                            </div>
                            
                            <div class="detail-row">
                                <div class="detail-group">
                                    <label>Status:</label>
                                    <div class="detail-value">
                                        <span class="status-badge ${this.getStatusClass(task.status)}">
                                            ${this.getStatusText(task.status)}
                                        </span>
                                    </div>
                                </div>
                                
                                <div class="detail-group">
                                    <label>Prioritet:</label>
                                    <div class="detail-value">
                                        <span class="priority-badge priority-${task.priority || 'medium'}">
                                            ${this.getPriorityText(task.priority)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="detail-row">
                                <div class="detail-group">
                                    <label>Yaradılma Tarixi:</label>
                                    <div class="detail-value">${this.formatDate(task.created_at)}</div>
                                </div>
                                
                                <div class="detail-group">
                                    <label>Son Tarix:</label>
                                    <div class="detail-value">${this.formatDate(task.due_date || task.due_at)}</div>
                                </div>
                            </div>
                            
                            <div class="detail-row">
                                <div class="detail-group">
                                    <label>Şirkət:</label>
                                    <div class="detail-value">${this.escapeHtml(task.company_name || 'Naməlum')}</div>
                                </div>
                                
                                <div class="detail-group">
                                    <label>İşçi:</label>
                                    <div class="detail-value">${this.escapeHtml(task.assigned_to_name || 'Təyin edilməyib')}</div>
                                </div>
                            </div>
                            
                            ${task.attachment_url ? `
                            <div class="detail-group">
                                <label>Fayl:</label>
                                <div class="detail-value">
                                    <a href="${task.attachment_url}" target="_blank" class="file-link">
                                        <i class="fa-solid fa-file"></i> Fayla bax
                                    </a>
                                </div>
                            </div>
                            ` : ''}
                            
                            <div class="detail-group">
                                <label>Proqress:</label>
                                <div class="detail-value">
                                    <div class="progress-bar">
                                        <div class="progress-fill" style="width: ${task.progress_percentage || 0}%"></div>
                                        <span class="progress-text">${task.progress_percentage || 0}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="modal-actions">
                            <button type="button" class="btn btn-secondary" onclick="TableManager.closeTaskDetailsModal()">
                                <i class="fa-solid fa-times"></i> Bağla
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const oldModal = document.getElementById('taskDetailsModalOverlay');
        if (oldModal) oldModal.remove();

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    },

    showCommentsModal: function (taskId, comments, append = false) {
        try {
            console.log(`🎯 showCommentsModal: taskId=${taskId}, comments=${comments?.length || 0}, append=${append}`);

            let modal = document.getElementById('commentsModalOverlay');

            if (!modal) {
                this.createCommentsModal(taskId, comments);
                console.log('✅ New modal created');
            } else {
                modal.dataset.taskId = taskId;  // 🔥 DATA-TASK-ID ƏLAVƏ ET

                if (append && comments && comments.length > 0) {
                    this.appendCommentsToModal(comments);
                    console.log(`📝 Appended ${comments.length} comments`);
                } else {
                    this.updateCommentsModal(comments || []);
                    console.log(`🔄 Updated modal with ${comments?.length || 0} comments`);
                }

                const commentInput = document.getElementById('newCommentText');
                if (commentInput) {
                    commentInput.value = '';
                    commentInput.focus();
                }
            }

        } catch (error) {
            console.error('❌ Error in showCommentsModal:', error);
        }
    },

    updateCommentsModal: function (comments) {
        try {
            const commentsList = document.getElementById('commentsList');
            if (!commentsList) {
                console.error('❌ Comments list not found');
                return;
            }

            console.log(`🔄 Updating modal with ${comments.length} comments`);

            if (!comments || comments.length === 0) {
                commentsList.innerHTML = '<div class="no-comments">Heç bir comment yoxdur</div>';
                return;
            }

            let html = '';

            comments.forEach((comment, index) => {
                // 🔥 Həm data, həm də birbaşa comment obyektini dəstəklə
                const commentData = comment.data || comment;

                let userName = 'Anonim';

                // User məlumatlarını çıxar
                if (commentData.user) {
                    if (commentData.user.full_name_with_lastname) {
                        userName = this.escapeHtml(commentData.user.full_name_with_lastname);
                    } else if (commentData.user.full_name) {
                        const fullName = commentData.user.full_name;
                        const lastName = commentData.user.last_name || '';
                        userName = this.escapeHtml(`${fullName} ${lastName}`.trim());
                    } else if (commentData.user.name) {
                        userName = this.escapeHtml(commentData.user.name);
                    } else if (commentData.user.username) {
                        userName = this.escapeHtml(commentData.user.username);
                    } else if (commentData.user.email) {
                        userName = this.escapeHtml(commentData.user.email.split('@')[0]);
                    }
                } else {
                    if (commentData.created_by_name) {
                        userName = this.escapeHtml(commentData.created_by_name);
                    } else if (commentData.user_id) {
                        const currentUser = window.taskManager?.userData;
                        if (currentUser && commentData.user_id == currentUser.userId) {
                            userName = this.escapeHtml(currentUser.fullName || currentUser.name || 'Siz');
                        } else {
                            userName = `İstifadəçi ID: ${commentData.user_id}`;
                        }
                    }
                }

                const dateStr = this.formatDate(commentData.created_at);
                const commentText = commentData.comment_text || '';

                html += `
                    <div class="comment-item" data-comment-id="${commentData.id}">
                        <div class="comment-header">
                            <span class="comment-author"><i class="fa-regular fa-user"></i> ${userName}</span>
                            <span class="comment-date"><i class="fa-regular fa-calendar"></i> ${dateStr}</span>
                        </div>
                        <div class="comment-text">${this.escapeHtml(commentText)}</div>
                    </div>
                `;
            });

            commentsList.innerHTML = html;
            console.log('✅ Modal updated successfully');

            // Scroll to bottom
            const modalBody = document.querySelector('#commentsModalOverlay .modal-body');
            if (modalBody) {
                modalBody.scrollTop = modalBody.scrollHeight;
            }

        } catch (error) {
            console.error('❌ Error updating modal:', error);
        }
    },

    createCommentsModal: function (taskId, initialComments = []) {
        try {
            console.log(`🆕 Creating new modal for task ${taskId}, comments: ${initialComments?.length || 0}`);

            let commentsHTML = '';

            if (initialComments && initialComments.length > 0) {
                commentsHTML = initialComments.map((comment) => {
                    const commentData = comment.data || comment;

                    let userName = 'Anonim';
                    if (commentData.user) {
                        if (commentData.user.full_name_with_lastname) {
                            userName = this.escapeHtml(commentData.user.full_name_with_lastname);
                        } else if (commentData.user.full_name) {
                            const fullName = commentData.user.full_name;
                            const lastName = commentData.user.last_name || '';
                            userName = this.escapeHtml(`${fullName} ${lastName}`.trim());
                        } else if (commentData.user.name) {
                            userName = this.escapeHtml(commentData.user.name);
                        } else if (commentData.user.username) {
                            userName = this.escapeHtml(commentData.user.username);
                        } else if (commentData.user.email) {
                            userName = this.escapeHtml(commentData.user.email.split('@')[0]);
                        }
                    } else {
                        if (commentData.created_by_name) {
                            userName = this.escapeHtml(commentData.created_by_name);
                        } else if (commentData.user_id) {
                            const currentUser = window.taskManager?.userData;
                            if (currentUser && commentData.user_id == currentUser.userId) {
                                userName = this.escapeHtml(currentUser.fullName || currentUser.name || 'Siz');
                            } else {
                                userName = `İstifadəçi ID: ${commentData.user_id}`;
                            }
                        }
                    }

                    const dateStr = this.formatDate(commentData.created_at);
                    const commentText = commentData.comment_text || '';

                    return `
                        <div class="comment-item" data-comment-id="${commentData.id}">
                            <div class="comment-header">
                                <span class="comment-author"><i class="fa-regular fa-user"></i> ${userName}</span>
                                <span class="comment-date"><i class="fa-regular fa-calendar"></i> ${dateStr}</span>
                            </div>
                            <div class="comment-text">${this.escapeHtml(commentText)}</div>
                        </div>
                    `;
                }).join('');
            } else {
                commentsHTML = '<div class="no-comments">Heç bir comment yoxdur</div>';
            }

            const modalHTML = `
                <div class="comments-modal-overlay" id="commentsModalOverlay" data-task-id="${taskId}">
                    <div class="comments-modal">
                        <div class="modal-header">
                            <h3><i class="fa-solid fa-comments"></i> Comment-lər (Task ${taskId})</h3>
                            <button class="close-btn" onclick="TableManager.closeCommentsModal()">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div class="comments-list" id="commentsList">
                                ${commentsHTML}
                            </div>
                            
                            <div class="add-comment">
                                <textarea id="newCommentText" class="form-control" placeholder="Yeni comment əlavə et..." rows="3"></textarea>
                                <button class="btn btn-primary" onclick="TableManager.addComment(${taskId})">
                                    <i class="fa-solid fa-paper-plane"></i> Göndər
                                </button>
                            </div>
                            
                            <div class="modal-actions">
                                <button type="button" class="btn btn-secondary" onclick="TableManager.closeCommentsModal()">
                                    <i class="fa-solid fa-times"></i> Bağla
                                </button>
                                <button type="button" class="btn btn-info" onclick="TableManager.refreshComments(${taskId})">
                                    <i class="fa-solid fa-sync-alt"></i> Yenilə
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Köhnə modalı sil
            const oldModal = document.getElementById('commentsModalOverlay');
            if (oldModal) oldModal.remove();

            document.body.insertAdjacentHTML('beforeend', modalHTML);
            console.log('✅ Modal created successfully with', initialComments.length, 'comments');

            // Scroll to bottom
            setTimeout(() => {
                const modalBody = document.querySelector('#commentsModalOverlay .modal-body');
                if (modalBody) {
                    modalBody.scrollTop = modalBody.scrollHeight;
                }
            }, 100);

        } catch (error) {
            console.error('❌ Error creating modal:', error);
        }
    },

    appendCommentsToModal: function (comments) {
        try {
            const commentsList = document.getElementById('commentsList');
            if (!commentsList) return;

            const noComments = commentsList.querySelector('.no-comments');
            if (noComments) noComments.remove();

            let html = '';

            comments.forEach((comment, index) => {
                const commentData = comment.data || comment;

                let userName = 'Anonim';

                if (commentData.user) {
                    if (commentData.user.full_name_with_lastname) {
                        userName = this.escapeHtml(commentData.user.full_name_with_lastname);
                    }
                    else if (commentData.user.full_name) {
                        const fullName = commentData.user.full_name;
                        const lastName = commentData.user.last_name || '';
                        userName = this.escapeHtml(`${fullName} ${lastName}`.trim());
                    }
                    else if (commentData.user.name) {
                        userName = this.escapeHtml(commentData.user.name);
                    }
                    else if (commentData.user.username) {
                        userName = this.escapeHtml(commentData.user.username);
                    }
                    else if (commentData.user.email) {
                        userName = this.escapeHtml(commentData.user.email.split('@')[0]);
                    }
                } else {
                    if (commentData.user_id) {
                        userName = `İstifadəçi ID: ${commentData.user_id}`;
                    }
                }

                const commentText = commentData.comment_text || '';
                const commentDate = this.formatDate(commentData.created_at);

                html += `
                    <div class="comment-item" data-comment-id="${commentData.id}">
                        <div class="comment-header">
                            <span class="comment-author">${userName}</span>
                            <span class="comment-date">${commentDate}</span>
                        </div>
                        <div class="comment-text">${this.escapeHtml(commentText)}</div>
                    </div>
                `;
            });

            commentsList.insertAdjacentHTML('afterbegin', html);
            console.log(`📝 Appended ${comments.length} comments to modal`);

        } catch (error) {
            console.error('❌ Error appending comments:', error);
        }
    },

    updateCommentCount: function(taskId) {
        // Artıq CommentTracker idarə edir, birbaşa ona yönləndir
        if (window.CommentTracker) {
            window.CommentTracker.onCommentAdded(taskId);
        }
    },


    addComment: async function (taskId) {
        try {
            const commentText = document.getElementById('newCommentText').value;

            if (!commentText.trim()) {
                this.showError('Zəhmət olmasa comment yazın!');
                return;
            }

            console.log(`📝 Adding comment to task ${taskId}: ${commentText}`);

            const response = await this.apiRequest('/comments/', 'POST', {
                task_id: taskId,
                comment_text: commentText
            });

            if (response && !response.error) {
                console.log('✅ Comment response:', response);

                const commentData = response.data || response;

                // Formu təmizlə
                document.getElementById('newCommentText').value = '';

                // Yeni comment-i modal-a əlavə et
                this.appendCommentsToModal([{ data: commentData }]);

                // 🔥 BURADA - COMMENT TRACKER-İ YENİLƏ (+1 ANİMASİYASI ÜÇÜN)
                if (window.CommentTracker) {
                    window.CommentTracker.onCommentAdded(taskId);
                }

                // Həmçinin refresh et (backend-dən təsdiqləmək üçün)
                setTimeout(() => {
                    this.refreshComments(taskId);
                }, 500);

            } else {
                throw new Error('Comment əlavə edilə bilmədi');
            }

        } catch (error) {
            console.error('❌ Comment əlavə edilərkən xəta:', error);
            this.showError('Xəta: ' + error.message);
        }
    },

    showToast: function (message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px 20px;
            background: ${type === 'success' ? '#28a745' : '#dc3545'};
            color: white;
            border-radius: 4px;
            z-index: 9999;
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    },

    // ==================== WEBSOCKET INTEGRATION ====================
    initializeWebSocket: function() {
        try {
            console.log('🔌 WebSocket listener qoşulur...');

            if (!window.WebSocketManager) {
                console.warn('⚠️ WebSocketManager tapılmadı, 3 saniyə sonra yenidən cəhd ediləcək');
                setTimeout(() => {
                    this.initializeWebSocket();
                }, 3000);
                return;
            }

            if (window.WebSocketManager.on) {
                window.WebSocketManager.on('task_notification', (data) => {
                    console.log('🔔 WebSocket task bildirişi alındı:', data);
                    this.handleWebSocketNotification(data);
                });

                window.WebSocketManager.on('system_message', (data) => {
                    console.log('🔔 WebSocket system message:', data);
                    this.handleSystemMessage(data);
                });
            } else if (window.WebSocketManager.addEventListener) {
                window.WebSocketManager.addEventListener('message', (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        if (data.type === 'task_notification') {
                            this.handleWebSocketNotification(data);
                        }
                    } catch (e) {
                        console.error('WebSocket message parse xətası:', e);
                    }
                });
            }

            console.log('✅ WebSocket listener qoşuldu');

        } catch (error) {
            console.error('❌ WebSocket initialize xətası:', error);
        }
    },

    handleWebSocketNotification: function(data) {
        try {
            const { event, message, title, icon, task } = data;

            console.log(`🔔 WebSocket Notification: ${event}`);

            if (window.SoundManager) {
                if (window.SoundManager.playForWebSocketEvent) {
                    window.SoundManager.playForWebSocketEvent(event);
                } else if (window.SoundManager.playSound) {
                    const soundMap = {
                        'task_created': 'taskAdded',
                        'task_completed': 'taskCompleted',
                        'task_rejected': 'taskRejected',
                        'task_assigned': 'taskAssigned',
                        'task_updated': 'taskAdded',
                        'task_started': 'taskAdded'
                    };
                    const soundType = soundMap[event] || 'taskAdded';
                    window.SoundManager.playSound(soundType);
                }
            } else {
                console.warn('⚠️ SoundManager tapılmadı, fallback səs istifadə edilir');
                this.playFallbackSound('taskAdded');
            }

            this.showWebSocketToast(data);

            if (task && task.company_id) {
                this.refreshTableIfNeeded(task);
            }

            if (document.hidden) {
                this.showBrowserNotification(data);
            }

        } catch (error) {
            console.error('❌ WebSocket notification handle xətası:', error);
        }
    },

    showWebSocketToast: function(data) {
        try {
            const { event, message, title, icon = '🔔', task } = data;

            const toast = document.createElement('div');
            toast.className = 'websocket-toast notification-toast';

            if (!document.querySelector('#toastStyles')) {
                const style = document.createElement('style');
                style.id = 'toastStyles';
                style.textContent = `
                    .websocket-toast {
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        background: white;
                        border-left: 4px solid #4cd964;
                        padding: 15px;
                        border-radius: 8px;
                        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                        z-index: 9999;
                        max-width: 350px;
                        animation: slideIn 0.3s ease;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    }
                    @keyframes slideIn {
                        from { transform: translateX(100%); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                    .toast-icon {
                        font-size: 24px;
                    }
                    .toast-content {
                        flex: 1;
                    }
                    .toast-title {
                        font-weight: bold;
                        margin-bottom: 5px;
                        color: #333;
                    }
                    .toast-message {
                        color: #666;
                        font-size: 14px;
                    }
                    .toast-close {
                        background: none;
                        border: none;
                        font-size: 20px;
                        cursor: pointer;
                        color: #999;
                    }
                    .toast-task {
                        font-size: 12px;
                        color: #888;
                        margin-top: 3px;
                    }
                `;
                document.head.appendChild(style);
            }

            let displayTitle = title;
            let displayMessage = message;

            if (!displayTitle) {
                const titleMap = {
                    'task_created': '➕ Yeni Task',
                    'task_completed': '✅ Task Tamamlandı',
                    'task_rejected': '❌ Task İmtina',
                    'task_assigned': '👤 Task Təyin Edildi',
                    'task_updated': '✏️ Task Yeniləndi',
                    'task_started': '🚀 Task Başladı'
                };
                displayTitle = titleMap[event] || '🔔 Yeni Bildiriş';
            }

            toast.innerHTML = `
                <div class="toast-icon">${icon}</div>
                <div class="toast-content">
                    <div class="toast-title">${displayTitle}</div>
                    <div class="toast-message">${displayMessage || ''}</div>
                    ${task?.task_title ? `<div class="toast-task">${task.task_title}</div>` : ''}
                </div>
                <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
            `;

            document.body.appendChild(toast);

            setTimeout(() => {
                if (toast.parentElement) {
                    toast.style.opacity = '0';
                    toast.style.transform = 'translateX(100%)';
                    setTimeout(() => {
                        if (toast.parentElement) {
                            toast.remove();
                        }
                    }, 300);
                }
            }, 5000);

        } catch (error) {
            console.error('❌ Toast göstərilərkən xəta:', error);
        }
    },

    refreshTableIfNeeded: function(task) {
        try {
            if (!task) return;

            const currentUser = window.taskManager?.userData;
            if (!currentUser) return;

            if (task.company_id && task.company_id === currentUser.companyId) {
                const activeTab = document.querySelector('.nav-tabs .active');
                if (!activeTab) return;

                const tabId = activeTab.id;

                setTimeout(() => {
                    try {
                        switch(tabId) {
                            case 'active-tab':
                            case 'nav-active':
                                if (window.taskManager?.loadActiveTasks) {
                                    window.taskManager.loadActiveTasks();
                                    console.log('🔄 Aktiv cədvəl yeniləndi (WebSocket)');
                                }
                                break;
                            case 'archive-tab':
                            case 'nav-archive':
                                if (window.taskManager?.loadArchiveTasks) {
                                    window.taskManager.loadArchiveTasks();
                                    console.log('🔄 Arxiv cədvəli yeniləndi (WebSocket)');
                                }
                                break;
                            case 'external-tab':
                            case 'nav-external':
                                if (window.ExternalTableManager?.loadTasks) {
                                    window.ExternalTableManager.loadTasks();
                                    console.log('🔄 Xarici cədvəl yeniləndi (WebSocket)');
                                }
                                break;
                            case 'partner-tab':
                            case 'nav-partner':
                                if (window.taskManager?.loadPartnerTasks) {
                                    window.taskManager.loadPartnerTasks();
                                    console.log('🔄 Partner cədvəl yeniləndi (WebSocket)');
                                }
                                break;
                        }
                    } catch (refreshError) {
                        console.error('Cədvəl yenilənərkən xəta:', refreshError);
                    }
                }, 2000);
            }

        } catch (error) {
            console.error('❌ Cədvəl yenilənərkən xəta:', error);
        }
    },

    showBrowserNotification: function(data) {
        try {
            if (!('Notification' in window)) return;

            if (Notification.permission === 'default') {
                Notification.requestPermission();
                return;
            }

            if (Notification.permission !== 'granted') return;

            const { title, message, task, event } = data;

            let notificationTitle = title;
            if (!notificationTitle) {
                const titleMap = {
                    'task_created': 'Yeni Task',
                    'task_completed': 'Task Tamamlandı',
                    'task_rejected': 'Task İmtina',
                    'task_assigned': 'Task Təyin Edildi'
                };
                notificationTitle = titleMap[event] || 'Task Bildirişi';
            }

            let notificationBody = message || '';
            if (task?.task_title) {
                notificationBody = task.task_title + (message ? ` - ${message}` : '');
            }

            const notification = new Notification(notificationTitle, {
                body: notificationBody,
                icon: '/favicon.ico',
                tag: 'task-notification-' + Date.now(),
                requireInteraction: false
            });

            notification.onclick = function() {
                window.focus();
                notification.close();
            };

            setTimeout(() => {
                notification.close();
            }, 5000);

        } catch (error) {
            console.error('❌ Browser notification xətası:', error);
        }
    },

    handleSystemMessage: function(data) {
        try {
            const { message, message_type } = data;

            console.log(`🔔 System Message: ${message_type} - ${message}`);

            if (message_type === 'urgent' && window.SoundManager) {
                if (window.SoundManager.playSound) {
                    window.SoundManager.playSound('taskCompleted');
                }
            }

            this.showToast(message, message_type === 'error' ? 'error' : 'info');

        } catch (error) {
            console.error('❌ System message handle xətası:', error);
        }
    },


    closeTaskDetailsModal: function () {
        const modal = document.getElementById('taskDetailsModalOverlay');
        if (modal) {
            modal.remove();
        }
    },

    closeCommentsModal: function () {
        const modal = document.getElementById('commentsModalOverlay');
        if (modal) {
            modal.remove();
        }
    },

    // ==================== HELPER FUNCTIONS ====================
    createFileLink: function (fileUrl) {
        if (!fileUrl) return '-';
        return `<a href="${fileUrl}" target="_blank" class="file-link"><i class="fa-solid fa-file"></i> Fayl</a>`;
    },

    calculateSalary: function (hourlyRate, durationMinutes) {
        if (!hourlyRate || !durationMinutes) return '0.00';
        const hours = durationMinutes / 60;
        const salary = hours * parseFloat(hourlyRate);
        return salary.toFixed(2);
    },

    formatDate: function (dateString) {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('az-AZ');
        } catch (e) {
            return dateString;
        }
    },

    formatFileSize: function(bytes) {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    getStatusText: function (status) {
        const statusMap = {
            'pending': 'Gözləyir',
            'waiting': 'İşin Başlanmasını gözləyir',
            'pending_approval': 'Tapşırıqı təstiqlə',
            'in_progress': 'İşlənir',
            'completed': 'Tamamlandı',
            'overdue': 'Gözləyir',
            'rejected': 'Rədd edildi'
        };
        return statusMap[status] || status;
    },

    getStatusClass: function (status) {
        const classMap = {
            'pending': 'status-pending',
            'waiting': 'status-waiting',
            'pending_approval': 'pending_approval_pending',
            'in_progress': 'status-in-progress',
            'completed': 'status-completed',
            'overdue': 'status-pending',
            'rejected': 'status-rejected'
        };
        return classMap[status] || '';
    },

    getPriorityText: function (priority) {
        const priorityMap = {
            'low': 'Aşağı',
            'medium': 'Orta',
            'high': 'Yüksək',
            'critical': 'Kritik'
        };
        return priorityMap[priority] || priority;
    },

    truncateText: function (text, length) {
        if (!text) return '';
        if (text.length <= length) return this.escapeHtml(text);
        return this.escapeHtml(text.substring(0, length)) + '...';
    },

    escapeHtml: function (text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    showEmptyTable: function (tableType, tbody) {
        let message = '';
        let subMessage = '';
        let colspan = 0;

        switch (tableType) {
            case 'active':
                message = '📋 Hazırda heç bir aktiv iş yoxdur';
                subMessage = 'Yeni iş yaratmaq üçün "Yeni İş" düyməsinə basın';
                colspan = 16;
                break;
            case 'archive':
                message = '📁 Hazırda heç bir arxiv işi yoxdur';
                subMessage = 'Tamamlanmış işlər həftəlik olaraq buraya arxivlənir';
                colspan = 15;
                break;
            case 'external':
                message = '🌐 Hazırda digər şirkətlərdən heç bir iş tapılmadı';
                subMessage = 'Digər şirkətlər sizə task göndərdikdə burada görünəcək';
                colspan = 16;
                break;
            case 'partner':
                message = '🤝 Hazırda partner şirkətlərdən heç bir iş tapılmadı';
                subMessage = 'Partner şirkətlər sizə task göndərdikdə burada görünəcək';
                colspan = 16;
                break;
        }

        tbody.innerHTML = `
            <tr>
                <td colspan="${colspan}" class="empty-state">
                    ${message}
                    <br>
                    <small>${subMessage}</small>
                </td>
            </tr>
        `;
    },

    updateTaskCount: async function() {
        const countElement = document.getElementById('countActive');
        const tableTotalElement = document.getElementById('activeTableTotalCount');

        const rows = document.querySelectorAll('#tableBody tr[data-task-id]');
        const count = rows.length;

        if (countElement) countElement.textContent = count;
        if (tableTotalElement) tableTotalElement.textContent = count;

        return count;
    },

    // External task sayını yenilə (sadə versiya)
    updateExternalTaskCount: function() {
        console.log('🔍 updateExternalTaskCount çağırıldı');

        const countElement = document.getElementById('countExternal');
        if (!countElement) {
            console.error('❌ countExternal elementi tapılmadı!');
            return;
        }

        // Cədvəldəki row-ları say
        const rows = document.querySelectorAll('#externalTableBody tr[data-task-id]');
        const count = rows.length;

        countElement.textContent = count;

        const tableMetaElement = document.getElementById('externalTableTotalCount');
        if (tableMetaElement) {
            tableMetaElement.textContent = count;
        }

        console.log(`📊 External task sayı: ${count}`);
    },

    // Partner task sayını yenilə (sadə versiya)
    updatePartnerTaskCount: function() {
        console.log('🔍 updatePartnerTaskCount çağırıldı');

        const countElement = document.getElementById('countPartner');
        if (!countElement) {
            console.error('❌ countPartner elementi tapılmadı!');
            return;
        }

        // Cədvəldəki row-ları say
        const rows = document.querySelectorAll('#partnerTableBody tr[data-task-id]');
        const count = rows.length;

        countElement.textContent = count;

        const tableMetaElement = document.getElementById('partnerTableTotalCount');
        if (tableMetaElement) {
            tableMetaElement.textContent = count;
        }

        console.log(`📊 Partner task sayı: ${count}`);
    },

    updateArchiveTaskCount: async function(archiveType = 'internal') {
        console.log(`🔍 updateArchiveTaskCount çağırıldı - Tip: ${archiveType}`);

        // Elementi yoxla
        let countElement = document.getElementById('countArchive');
        if (!countElement) {
            console.warn('⚠️ countArchive elementi tapılmadı, yaradılır...');

            // Dalğa naviqasiyasındakı archive elementini tap
            const archiveWaveItem = document.querySelector('.wave-item[data-section="archive"]');
            if (archiveWaveItem) {
                const existingSpan = archiveWaveItem.querySelector('.wave-count');
                if (existingSpan) {
                    existingSpan.id = 'countArchive';
                    countElement = existingSpan;
                } else {
                    const newSpan = document.createElement('span');
                    newSpan.className = 'wave-count';
                    newSpan.id = 'countArchive';
                    newSpan.textContent = '0';
                    archiveWaveItem.appendChild(newSpan);
                    countElement = newSpan;
                }
            }
        }

        const tableCountElement = document.getElementById('archiveTableTotalCount');

        try {
            let endpoint = '';
            let totalCount = 0;

            // Archive tipinə görə endpoint seç
            if (archiveType === 'external') {
                endpoint = `/task-archive/external?page=1&limit=1`;
            } else if (archiveType === 'partner') {
                endpoint = `/task-archive/partners?page=1&limit=1`;
            } else {
                // Internal archive
                const companyId = this.getCurrentUserInfo?.().companyId || window.taskManager?.userData?.companyId || 51;
                endpoint = `/task-archive/?page=1&limit=1&company_id=${companyId}`;
            }

            console.log(`📡 Archive count API: ${endpoint}`);
            const response = await this.apiRequest(endpoint, 'GET');

            if (response?.total !== undefined) {
                totalCount = response.total;
            } else if (response?.pagination?.total !== undefined) {
                totalCount = response.pagination.total;
            } else if (response?.data && Array.isArray(response.data)) {
                totalCount = response.data.length;
            } else if (Array.isArray(response)) {
                totalCount = response.length;
            }

            // Dalğa naviqasiyasına yaz
            if (countElement) {
                countElement.textContent = totalCount;
            }

            // Cədvəl başlığına yaz
            if (tableCountElement) {
                tableCountElement.textContent = totalCount;
            }

            console.log(`✅ Archive task sayı (${archiveType}): ${totalCount}`);

        } catch (error) {
            console.error(`❌ Archive sayı alınmadı (${archiveType}):`, error);

            // Fallback: cədvəldəki row-ları say
            const rows = document.querySelectorAll('#archiveTableBody tr[data-task-id]');
            const fallbackCount = rows.length;

            if (countElement) {
                countElement.textContent = fallbackCount;
            }
            if (tableCountElement) {
                tableCountElement.textContent = fallbackCount;
            }
            console.log(`📊 Fallback archive sayı: ${fallbackCount}`);
        }
    },

    updateTableMeta: function (tableType, taskCount) {
        const element = this.metaElements[tableType];
        if (!element) return;

        const labels = {
            'active': 'aktiv iş',
            'archive': 'arxiv işi',
            'external': 'xarici iş',
            'partner': 'partner iş'
        };

        element.textContent = `${taskCount} ${labels[tableType] || 'iş'}`;
    },


    // tableManager.js - autoRefreshAfterAction metodunu TAMAMİLƏ BU ŞƏKİLDƏ DƏYİŞDİRİN

    autoRefreshAfterAction: async function(taskId, tableType, actionType = null) {
        try {
            console.log(`🔄 Auto refresh başladı: task ${taskId}, table ${tableType}, action ${actionType}`);

            // ========== 🔥 BÜTÜN CACHE-LƏRİ TƏMİZLƏ ==========
            console.log('🧹 Bütün cache-lər təmizlənir...');

            // 1. SessionStorage cache təmizlə
            const sessionKeys = Object.keys(sessionStorage);
            sessionKeys.forEach(key => {
                if (key.startsWith('tc_') || key.startsWith('task_') || key.startsWith('cache_')) {
                    sessionStorage.removeItem(key);
                    console.log(`🗑️ SessionStorage-dan silindi: ${key}`);
                }
            });

            // 2. LocalStorage cache təmizlə
            const localStorageKeys = Object.keys(localStorage);
            localStorageKeys.forEach(key => {
                if (key.startsWith('task_confirm_end_') ||
                    key.startsWith('task_delay_') ||
                    key.startsWith('task_work_start_') ||
                    key.startsWith('cache_') ||
                    key === 'tasks_cache' ||
                    key === 'tasks_cache_timestamp' ||
                    key === 'externalTasks_cache' ||
                    key === 'externalTasks_cache_timestamp') {
                    localStorage.removeItem(key);
                    console.log(`🗑️ LocalStorage-dan silindi: ${key}`);
                }
            });

            // 3. Memory cache təmizlə
            if (window._apiCache && window._apiCache.clear) {
                window._apiCache.clear('tasks');
                window._apiCache.clear('externalTasks');
                window._apiCache.clear('partners');
                console.log('🗑️ Memory cache təmizləndi');
            }

            // 4. IndexedDB cache təmizlə
            if (window.dbManager) {
                try {
                    await window.dbManager.clearCache('tasks');
                    await window.dbManager.clearCache('externalTasks');
                    await window.dbManager.clearCache('partners');
                    console.log('🗑️ IndexedDB cache təmizləndi');
                } catch(e) {
                    console.warn('⚠️ IndexedDB təmizləmə xətası:', e);
                }
            }

            // 5. Timer sistemlərini təmizlə (əgər varsa)
            if (window.TaskTimerSystem) {
                if (taskId) {
                    window.TaskTimerSystem.clearConfirmation(taskId);
                    window.TaskTimerSystem.clearWorkTimer(taskId);
                }
                console.log('⏱️ Timer sistemləri təmizləndi');
            }

            // ========== 🔥 YENİ MƏLUMATLARI YÜKLƏ ==========
            console.log('🔄 Yeni məlumatlar yüklənir...');

            // 1. Aktiv taskları yenilə (force refresh ilə)
            if (window.taskManager) {
                await window.taskManager.loadActiveTasks(1, true);
                console.log('✅ Aktiv tasklar yeniləndi');

                // 2. External taskları yenilə
                if (window.ExternalTableManager && window.ExternalTableManager.loadTasks) {
                    await window.ExternalTableManager.loadTasks(true);
                    console.log('✅ External tasklar yeniləndi');
                }

                // 3. Partner taskları yenilə
                if (window.PartnerTableManager && window.PartnerTableManager.loadTasks) {
                    await window.PartnerTableManager.loadTasks(1, true);
                    console.log('✅ Partner tasklar yeniləndi');
                }

                // 4. Archive taskları yenilə
                if (window.ArchiveTableManager && window.ArchiveTableManager.loadArchiveTasks) {
                    await window.ArchiveTableManager.loadArchiveTasks(1);
                    console.log('✅ Archive tasklar yeniləndi');
                }
            } else {
                // Fallback: birbaşa API sorğusu
                console.log('⚠️ taskManager tapılmadı, birbaşa API sorğusu edilir...');

                const activeEndpoint = '/tasks/detailed?page=1&limit=100&status=pending,in_progress,overdue,pending_approval,waiting,paused,approval_overdue';
                const activeResponse = await this.apiRequest(activeEndpoint, 'GET');
                const allTasks = activeResponse?.data || activeResponse || [];
                const activeTasks = allTasks.filter(t => ['pending_approval','pending','in_progress','overdue','waiting','paused','approval_overdue'].includes(t.status));

                if (this.renderTasksTable) {
                    this.renderTasksTable('active', activeTasks, false, 1);
                    console.log(`✅ Active cədvəli ${activeTasks.length} task ilə yeniləndi`);
                }
            }

            // 3. Sayları yenilə
            if (typeof this.updateTaskCount === 'function') await this.updateTaskCount();
            if (typeof this.updateExternalTaskCount === 'function') await this.updateExternalTaskCount();
            if (typeof this.updatePartnerTaskCount === 'function') await this.updatePartnerTaskCount();
            if (typeof this.updateArchiveTaskCount === 'function') await this.updateArchiveTaskCount();

            // 4. Bildiriş göstər
            if (actionType) {
                const messages = {
                    'completed': '✅ İş tamamlandı və cədvəl yeniləndi!',
                    'rejected': '✅ İş imtina edildi və cədvəl yeniləndi!',
                    'taken': '✅ İş özünüzə götürüldü və cədvəl yeniləndi!',
                    'paused': '✅ İş fasile verildi və cədvəl yeniləndi!',
                    'updated': '✅ İş yeniləndi və cədvəl yeniləndi!',
                    'approved': '✅ İş təsdiq edildi və cədvəl yeniləndi!',
                    'started': '✅ İşə başlanıldı və cədvəl yeniləndi!'
                };
                if (messages[actionType]) this.showSuccess(messages[actionType]);
            }

            // 5. Xüsusi bildiriş
            const successMessage = document.createElement('div');
            successMessage.className = 'cache-refresh-success';
            successMessage.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: linear-gradient(135deg, #10b981, #059669);
                color: white;
                padding: 12px 20px;
                border-radius: 10px;
                font-size: 13px;
                font-weight: 600;
                z-index: 10006;
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                display: flex;
                align-items: center;
                gap: 10px;
                animation: slideInRight 0.3s ease;
            `;
            successMessage.innerHTML = `
                <i class="fas fa-sync-alt fa-spin"></i>
                <span>Cədvəl yeniləndi!</span>
                <i class="fas fa-check-circle"></i>
            `;
            document.body.appendChild(successMessage);

            setTimeout(() => {
                successMessage.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => successMessage.remove(), 300);
            }, 2000);

            console.log('🎉 Auto refresh tamamlandı!');

        } catch (error) {
            console.error('❌ Auto refresh xətası:', error);

            // Xəta halında sadəcə səhifəni yenilə
            if (error.message && error.message.includes('Network')) {
                console.log('🌐 Şəbəkə xətası, 3 saniyə sonra səhifə yenilənir...');
                setTimeout(() => window.location.reload(), 3000);
            }
        }
    },

    // ==================== SOUND FUNCTIONS ====================
    playTaskSound: function (soundType) {
        try {
            if (typeof SoundManager !== 'undefined' && SoundManager.playSound) {
                SoundManager.playSound(soundType);
            } else {
                this.playFallbackSound(soundType);
            }
        } catch (error) {
            console.error('Səs oynadıla bilmədi:', error);
        }
    },

    viewTaskDetails: async function(taskId) {
        try {
            console.log(`🔍 Viewing details for task ${taskId}`);

            const response = await this.apiRequest(`/tasks/${taskId}`, 'GET');

            if (response && !response.error) {
                const task = response.data || response;
                const taskType = task.type || 'active';
                this.showTaskDetailsModal(task, taskType);
            } else {
                this.showError('Task məlumatları tapılmadı');
            }
        } catch (error) {
            console.error('❌ Error viewing task details:', error);
            this.showError('Xəta: ' + error.message);
        }
    },

    playFallbackSound: function (soundType) {
        try {
            if (!window.AudioContext && !window.webkitAudioContext) {
                console.log('AudioContext dəstəklənmir');
                return;
            }

            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            const frequencies = {
                taskCompleted: 523.25,
                taskAdded: 659.25,
                taskRejected: 392.00,
                notification: 440.00
            };

            oscillator.frequency.value = frequencies[soundType] || 440;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);

        } catch (error) {
            console.log('Fallback səs də oynadıla bilmədi:', error);
        }
    },

    showTaskNotification: function (title, message) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                body: message,
                icon: '/assets/images/logo.png'
            });
        }

        if (typeof notificationService !== 'undefined' && notificationService.showInfo) {
            notificationService.showInfo(message);
        }
    },

    getCurrentUser: function() {
        return window.taskManager?.userData || null;
    }
};

// Global export for browser
if (typeof window !== 'undefined') {
    window.TableManager = TableManager;
    window.tableManager = TableManager;

    console.log('✅ TableManager exported to window as both TableManager and tableManager');

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            TableManager.initialize && TableManager.initialize();
        });
    } else {
        TableManager.initialize && TableManager.initialize();
    }
}