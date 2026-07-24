// externalRowCreator.js
// Bu fayl External task sətirlərinin yaradılmasını təmin edir
// API sorğuları OLMADAN, task obyektinin özündə olan məlumatlardan istifadə edir

const ExternalRowCreator = {

    /**
     * External task üçün HTML sətri yaradır
     * @param {Object} task - Task obyekti
     * @param {number} index - Sıra nömrəsi
     * @param {number} currentPage - Cari səhifə
     * @returns {string} HTML sətri
     */
    createExternalRowHTML: function(task, index, currentPage) {
        console.log(`🔍 EXTERNAL TASK: `, task);

        const serialNumber = (currentPage - 1) * 20 + index + 1;

        // ===== METADATA PARSE =====
        let metadata = {};
        let isParentCompanyTask = false;

        if (task.metadata) {
            try {
                metadata = typeof task.metadata === 'string'
                    ? JSON.parse(task.metadata)
                    : task.metadata;

                console.log('📦 External metadata:', metadata);

                if (metadata.task_type === 'external' || metadata.is_external) {
                    isParentCompanyTask = true;
                }
            } catch (e) {
                console.error('❌ External task metadata parse xətası:', e);
            }
        }

        // ===== ŞİRKƏT ADI MƏNTİQİ =====
        let displayCompanyName = '';
        let directionIcon = '';

        const currentCompanyId = window.taskManager?.userData?.companyId;

        // Şirkət adını təyin et - BİRBAŞA TASK.OBJECT-DƏN!
        if (task.target_company_name) {
            displayCompanyName = task.target_company_name;

            if (task.company_id == currentCompanyId) {
                directionIcon = '<i class="fas fa-arrow-up text-primary ms-1" title="Siz göndərdiniz"></i>';
            } else if (task.target_company_id == currentCompanyId) {
                directionIcon = '<i class="fas fa-arrow-down text-success ms-1" title="Sizə göndərildi"></i>';
            }
        } else if (task.company_name) {
            displayCompanyName = task.company_name;

            if (task.company_id == currentCompanyId) {
                directionIcon = '<i class="fas fa-building text-secondary ms-1" title="Sizin şirkətiniz"></i>';
            }
        } else {
            displayCompanyName = 'Üst şirkət taskı';
        }

        // ===== ADLARI TASK.OBJECT-DƏN GÖTÜR - HEÇ BİR API SORĞUSU YOX! =====

        // İcraçı adı - BİRBAŞA TASK.OBJECT-DƏN
        let executorName = task.assigned_to_name || task.executor_name;
        if (!executorName || executorName.includes('İşçi ID:')) {
            executorName = task.assigned_to ? `İşçi #${task.assigned_to}` : 'Təyin edilməyib';
        }

        // Yaradan adı - BİRBAŞA TASK.OBJECT-DƏN
        let creatorName = task.creator_name || metadata?.created_by_name || task.created_by_name;
        if (!creatorName || creatorName.includes('İstifadəçi ID:')) {
            creatorName = task.created_by ? `İstifadəçi #${task.created_by}` : 'Sistem';
        }

        // Şöbə adı - BİRBAŞA TASK.OBJECT-DƏN
        let departmentName = task.department_name || task.department?.name;
        if (!departmentName || departmentName.includes('Şöbə ID:')) {
            departmentName = task.department_id ? `Şöbə #${task.department_id}` : '-';
        }

        // İş növü adı - BİRBAŞA TASK.OBJECT-DƏN
        let workTypeName = task.work_type_name || task.work_type?.name;
        if (!workTypeName || workTypeName.includes('İş növü ID:')) {
            workTypeName = task.work_type_id ? `İş növü #${task.work_type_id}` : '-';
        }

        // ===== DIGƏR MƏLUMATLAR =====
        const hourlyRate = task.billing_rate || task.hourly_rate || task.rate || 0;
        const durationMinutes = task.duration_minutes ||
            (task.estimated_hours ? task.estimated_hours * 60 : 0) ||
            (task.actual_hours ? task.actual_hours * 60 : 0) || 0;

        const description = task.task_description || task.description || '';

        // ===== STATUS VƏ İCAZƏLƏR =====
        const currentUser = window.taskManager?.userData;
        const currentUserId = currentUser?.userId;
        const isAssignedToMe = task.assigned_to == currentUserId;

        // ===== DEADLINE KONTROLU =====
        const now = new Date();
        const dueDate = task.due_date ? new Date(task.due_date) : null;
        const isOverdue = dueDate && dueDate < now &&
            task.status !== 'completed' &&
            task.status !== 'rejected';

        const dueDateClass = isOverdue ? 'text-danger fw-bold overdue-date' : '';
        const dueDateIcon = isOverdue ?
            '<i class="fa-solid fa-exclamation-triangle ms-1" title="Bu taskın vaxtı keçib!"></i>' : '';

        // ===== STATUS BADGE =====
        let statusBadgeHTML = '';
        if (isOverdue && task.status === 'overdue') {
            statusBadgeHTML = `
                <span class="status-badge status-overdue" title="GECİKMƏ!">
                    <i class="fa-solid fa-clock"></i> GECİKMƏ
                </span>
            `;
        } else {
            statusBadgeHTML = `
                <span class="status-badge ${this.getStatusClass(task.status)}">
                    ${this.getStatusText(task.status)}
                </span>
            `;
        }

        // ===== STATUS BUTONLARI =====
        let statusButtons = '';
        let editButton = '';

        if (isAssignedToMe) {
            if (task.status === 'pending') {
                statusButtons = `
                    <button class="btn btn-sm btn-success take-external-task" 
                            onclick="ExternalTableManager.takeTask(${task.id})" 
                            title="Bu işi götür"
                            data-task-id="${task.id}"
                            data-table-type="external">
                        <i class="fa-solid fa-hand-paper"></i> Götür
                    </button>
                `;
            } else if (task.status === 'in_progress') {
                editButton = `
                    <button class="btn btn-sm btn-warning" onclick="TaskEditExternalModule.openEditTaskModal(${task.id}, 'external')" title="Taskı redaktə et">
                        <i class="fa-solid fa-edit"></i>
                    </button>
                `;
            }
        } else if (task.status === 'pending') {
            statusButtons = `
                <button class="btn btn-sm btn-info" onclick="ExternalTableManager.takeTaskFromOthers(${task.id})" title="Bu işi özümə götür">
                    <i class="fa-solid fa-user-plus"></i> Götür
                </button>
            `;
        }

        // ===== BUTONLAR =====
        const commentsButton = `
            <button class="btn btn-sm btn-outline-info" 
                    onclick="TableManager.viewTaskComments(${task.id})">
                <i class="fa-solid fa-comments"></i> 
                <span class="comment-count">${task.comment_count || 0}</span>
            </button>
        `;

        const detailsButton = `
            <button class="btn btn-sm btn-secondary" onclick="TableManager.viewExternalTask(${task.id})" title="Detallara bax">
                <i class="fa-solid fa-eye"></i>
            </button>
        `;

        // ===== FAYL SÜTUNU =====
        let fileColumnHTML = this.createFileColumnHTML(task);

        // ===== ƏMƏLİYYAT BUTONLARI =====
        const actionButtons = `
            <div class="action-buttons" style="display: flex; gap: 4px; flex-wrap: wrap;">
                ${editButton || ''}
                ${commentsButton}
                ${detailsButton}
            </div>
        `;

        // ===== HTML SƏTRİ =====
        return `
            <tr class="external-task-row ${isParentCompanyTask ? 'parent-company-task' : ''}" data-task-id="${task.id}">
                <td class="text-center">${serialNumber}</td>
                <td>${this.formatDate(task.created_at)}</td>
                <td>
                    <div class="company-name-cell">
                        ${this.escapeHtml(displayCompanyName)}
                        ${directionIcon}
                    </div>
                </td>
                <td>${this.escapeHtml(creatorName)}</td>
                <td>${this.escapeHtml(executorName)}</td>
                <td class="actions-col">
                    ${actionButtons}
                </td>
                <td>${this.escapeHtml(workTypeName)}</td>
                <td class="description-col">
                    ${this.createDescriptionHTML(description, task.id, isOverdue)}
                </td>
                <td class="file-col">
                    ${fileColumnHTML}
                </td>
                <td class="${dueDateClass}" title="${isOverdue ? 'Bu taskın vaxtı keçib!' : ''}">
                    ${this.formatDate(task.due_date || task.due_at)}
                    ${dueDateIcon}
                </td>
                <td>
                    <div class="status-section">
                        ${statusBadgeHTML}
                        ${statusButtons}
                    </div>
                </td>
                <td>${this.formatDate(task.completed_date || task.completed_at)}</td>
                <td>${durationMinutes}</td>
                <td>${this.escapeHtml(departmentName)}</td>
            </tr>
        `;
    },

    /**
     * Fayl sütunu HTML-i yaradır
     */
    createFileColumnHTML: function(task) {
        if (!task.attachments || task.attachments.length === 0) {
            return '<span class="text-muted">-</span>';
        }

        try {
            const attachments = Array.isArray(task.attachments)
                ? task.attachments
                : JSON.parse(task.attachments);

            if (attachments.length === 0) return '<span class="text-muted">-</span>';

            const hasMultipleFiles = attachments.length > 1;
            const firstAttachment = attachments[0];

            const getFileIcon = (attachment) => {
                const mimeType = attachment.mime_type || '';
                const filename = attachment.filename || '';
                const isAudioRecording = attachment.is_audio_recording || false;

                if (isAudioRecording || mimeType.includes('audio/') ||
                    filename.includes('səs-qeydi') || filename.includes('recording')) {
                    return '<i class="fas fa-microphone text-primary"></i>';
                } else if (mimeType.includes('image/')) {
                    return '<i class="fas fa-image text-primary"></i>';
                } else if (mimeType.includes('video/')) {
                    return '<i class="fas fa-video text-danger"></i>';
                } else if (mimeType.includes('pdf')) {
                    return '<i class="fas fa-file-pdf text-danger"></i>';
                } else if (mimeType.includes('excel') || mimeType.includes('spreadsheet') ||
                          filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
                    return '<i class="fas fa-file-excel text-success"></i>';
                } else if (mimeType.includes('word') || mimeType.includes('document') ||
                          filename.endsWith('.docx') || filename.endsWith('.doc')) {
                    return '<i class="fas fa-file-word text-primary"></i>';
                } else {
                    return '<i class="fas fa-file text-secondary"></i>';
                }
            };

            const formatFileName = (filename) => {
                if (!filename) return 'Fayl';
                if (filename.length > 15) {
                    return filename.substring(0, 12) + '...';
                }
                return filename;
            };

            if (!hasMultipleFiles) {
                const fileIcon = getFileIcon(firstAttachment);
                const fileName = formatFileName(firstAttachment.filename);

                return `
                    <div class="file-preview-single" 
                         onclick="TableManager.previewFile(
                             '${firstAttachment.file_id}', 
                             '${firstAttachment.filename}', 
                             '${firstAttachment.mime_type || ''}',
                             ${firstAttachment.is_audio_recording || false}
                         )" 
                         style="cursor: pointer;" 
                         title="${firstAttachment.filename}">
                        <div class="file-icon">${fileIcon}</div>
                        <div class="file-name">${fileName}</div>
                    </div>
                `;
            } else {
                return `
                    <div class="file-preview-multiple">
                        <div class="file-count-badge" onclick="TableManager.showTaskFiles(${task.id})" 
                             style="cursor: pointer;" title="${attachments.length} fayl">
                            <i class="fas fa-paperclip"></i>
                            <span>${attachments.length}</span>
                        </div>
                    </div>
                `;
            }
        } catch (e) {
            console.error('Fayl parse xətası:', e);
            return '<span class="text-muted">-</span>';
        }
    },

    /**
     * Təsvir HTML-i yaradır
     */
    createDescriptionHTML: function(description, taskId, isOverdue) {

        const escapedDesc = this.escapeHtml(description);

        if (description.length > 100) {
            return `
                <div class="description-container">
                    <div class="truncated-description" id="desc-${taskId}">
                        ${this.truncateText(escapedDesc, 100)}
                    </div>
                    <div class="full-description" id="full-desc-${taskId}" style="display: none">
                        ${escapedDesc}
                    </div>
                    <button class="expand-btn" onclick="TableManager.toggleDescription(${taskId})" 
                            title="Tam açıqlamaya bax">
                        <i class="fas fa-expand-alt"></i> Tam bax
                    </button>
                </div>
            `;
        }

        return `
            <div class="description-container">
                ${escapedDesc}
            </div>
        `;
    },


    /**
     * Maaş hesablayır
     */
    calculateSalary: function(hourlyRate, durationMinutes) {
        if (!hourlyRate || !durationMinutes) return '0.00';
        const hours = durationMinutes / 60;
        const salary = hours * parseFloat(hourlyRate);
        return salary.toFixed(2);
    },

    /**
     * Tarixi formatla
     */
    formatDate: function(dateString) {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '-';

            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();

            return `${day}.${month}.${year}`;
        } catch (e) {
            return '-';
        }
    },

    /**
     * Status class-ı
     */
    getStatusClass: function(status) {
        const classes = {
            'pending': 'status-pending',
            'in_progress': 'status-progress',
            'completed': 'status-completed',
            'rejected': 'status-rejected',
            'overdue': 'status-overdue',
            'approved': 'status-approved',
            'cancelled': 'status-cancelled'
        };
        return classes[status] || 'status-pending';
    },

    /**
     * Status mətni
     */
    getStatusText: function(status) {
        const texts = {
            'pending': 'Gözləmədə',
            'in_progress': 'İcra olunur',
            'completed': 'Tamamlandı',
            'rejected': 'İmtina edildi',
            'overdue': 'Gecikmiş',
            'approved': 'Təsdiqləndi',
            'cancelled': 'Ləğv edildi'
        };
        return texts[status] || status || 'Gözləmədə';
    },

    /**
     * Mətni qısalt
     */
    truncateText: function(text, maxLength = 100) {
        if (!text) return '-';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    },

    /**
     * HTML-dən qoru
     */
    escapeHtml: function(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Global export
if (typeof window !== 'undefined') {
    window.ExternalRowCreator = ExternalRowCreator;

    // TableManager-ə funksiyanı əlavə et
    if (window.TableManager) {
        window.TableManager.createExternalRowHTML = ExternalRowCreator.createExternalRowHTML.bind(ExternalRowCreator);
        console.log('✅ ExternalRowCreator TableManager-ə əlavə edildi');
    }

    console.log('✅ ExternalRowCreator yükləndi - API sorğuları OLMADAN!');
}