// ===============================================
// archiveTasks.js - Arxiv Tasklar üçün Genişləndirilmiş Funksiyalar
// ===============================================

const ArchiveTasks = {

    createArchiveRowHTML: function(task, index, currentPage) {
        console.log(`🔍 REAL createArchiveRowHTML çağırıldı: task ${task.id}`);

        const serialNumber = (currentPage - 1) * 20 + index + 1;
        const hourlyRate = task.hourly_rate || task.billing_rate || 0;
        const durationMinutes = task.duration_minutes ||
            (task.estimated_hours ? task.estimated_hours * 60 : 0) ||
            (task.actual_hours ? task.actual_hours * 60 : 0) || 0;
        const calculatedSalary = this.calculateSalary(hourlyRate, durationMinutes);

        let creatorName = task.creator_name || task.created_by_name || `ID: ${task.created_by}`;
        let executorName = task.assigned_to_name || task.executor_name || (task.assigned_to ? `İşçi ID: ${task.assigned_to}` : 'Təyin edilməyib');

        // ✅ ŞİRKƏT ADINI TAP - ƏVVƏLCƏ TASK TITLE-DAN, SONRA CACHE-DƏN
        let displayCompanyName = 'Bilinmir';

        // 1. Task title-da [BMW] və ya [Lukoil] formatında şirkət adı varsa
        if (task.task_title && task.task_title.includes('[') && task.task_title.includes(']')) {
            const match = task.task_title.match(/\[(.*?)\]/);
            if (match && match[1]) {
                displayCompanyName = match[1];
                console.log(`🏢 Task title-dan şirkət adı tapıldı: ${displayCompanyName}`);
            }
        }
        // 2. viewable_company_id varsa, cache-dən götür
        else if (task.viewable_company_id && window.companyCache && window.companyCache[task.viewable_company_id]) {
            const companyData = window.companyCache[task.viewable_company_id];
            if (typeof companyData === 'object') {
                displayCompanyName = companyData.name || companyData.company_name || `Şirkət ${task.viewable_company_id}`;
            } else {
                displayCompanyName = companyData;
            }
            console.log(`🏢 viewable_company_id-dən şirkət adı: ${displayCompanyName}`);
        }
        // 3. viewable_company_id varsa ama cache-də yoxdursa, ID-ni göstər
        else if (task.viewable_company_id) {
            displayCompanyName = `Şirkət ID: ${task.viewable_company_id}`;
            console.log(`⚠️ viewable_company_id cache-də tapılmadı: ${task.viewable_company_id}`);
        }
        // 4. company_name varsa (backup)
        else if (task.company_name) {
            displayCompanyName = task.company_name;
            console.log(`🏢 company_name istifadə olunur: ${displayCompanyName}`);
        }
        // 5. company_id-dən cache-dən götür
        else if (task.company_id && window.companyCache && window.companyCache[task.company_id]) {
            const companyData = window.companyCache[task.company_id];
            if (typeof companyData === 'object') {
                displayCompanyName = companyData.name || companyData.company_name || `Şirkət ${task.company_id}`;
            } else {
                displayCompanyName = companyData;
            }
            console.log(`🏢 company_id-dən cache: ${displayCompanyName}`);
        }
        // 6. Ən pis halda
        else if (task.company_id) {
            displayCompanyName = `Şirkət ID: ${task.company_id}`;
        }

        // ✅ DEBUG: Nəyin göstərildiyini yoxla
        console.log(`📌 Task ${task.id} üçün şirkət adı: "${displayCompanyName}"`, {
            task_title: task.task_title,
            viewable_company_id: task.viewable_company_id,
            company_name: task.company_name,
            company_id: task.company_id
        });

        const departmentName = task.department_name || (task.department_id ? `Şöbə ID: ${task.department_id}` : '-');
        const workTypeName = task.work_type_name || (task.work_type_id ? `İş növü ID: ${task.work_type_id}` : '-');
        const description = task.task_description || task.description || '';

        // Deadline kontrolu
        const now = new Date();
        const dueDate = task.due_date ? new Date(task.due_date) : null;
        const isOverdue = dueDate && dueDate < now && task.status !== 'completed' && task.status !== 'rejected';
        const dueDateClass = isOverdue ? 'text-danger fw-bold overdue-date' : '';
        const dueDateIcon = isOverdue ? '<i class="fa-solid fa-exclamation-triangle ms-1" title="Bu taskın vaxtı keçib!"></i>' : '';

        const currentUser = window.taskManager?.userData;
        const currentUserId = currentUser?.userId;
        const isAdmin = currentUser?.role === 'company_admin' || currentUser?.role === 'admin';
        const canRestore = isAdmin ? true : false;

        // Restore düyməsi
        const restoreButton = canRestore ? `
            <button class="btn btn-sm btn-success" onclick="ArchiveTasks.restoreTask(${task.id})" title="Taskı bərpa et">
                <i class="fa-solid fa-rotate-left"></i>
            </button>
        ` : '';

        // Details düyməsi
        const detailsButton = `
            <button class="btn btn-sm btn-secondary" onclick="ArchiveTasks.viewArchiveTaskDetails(${task.id})" title="Detallara bax">
                <i class="fa-solid fa-eye"></i>
            </button>
        `;

        const commentsButton = `
            <button class="btn btn-sm btn-info" onclick="ArchiveTasks.viewTaskComments(${task.id})" title="Comment-lərə bax">
                <i class="fa-solid fa-comments"></i>
            </button>
        `;

        // Status badge
        let statusBadgeHTML = '';
        let statusText = '';
        let statusClass = '';

        if (task.status === 'completed') {
            statusText = 'Tamamlandı';
            statusClass = 'status-completed';
        } else if (task.status === 'rejected') {
            statusText = 'Ləğv edildi';
            statusClass = 'status-rejected';
        } else if (task.status === 'cancelled') {
            statusText = 'Ləğv edildi';
            statusClass = 'status-rejected';
        } else {
            statusText = task.status || 'Bilinmir';
            statusClass = 'status-pending';
        }

        statusBadgeHTML = `<span class="status-badge ${statusClass}">${statusText}</span>`;

        // Fayl sütunu
        let fileColumnHTML = '-';
        if (task.attachments && task.attachments.length > 0) {
            let attachments = task.attachments;
            if (typeof attachments === 'string') {
                try { attachments = JSON.parse(attachments); } catch (e) {}
            }
            if (Array.isArray(attachments)) {
                const count = attachments.length;
                fileColumnHTML = `
                    <div class="file-indicator" onclick="ArchiveTasks.showTaskFiles(${task.id})" style="cursor: pointer;" title="${count} fayl">
                        <i class="fas fa-paperclip"></i>
                        <span>${count}</span>
                    </div>
                `;
            }
        }

        const archivedDate = task.archived_at || task.archived_date || '-';
        const archivedByName = task.archived_by_fullname || (task.archived_by ? `ID: ${task.archived_by}` : '-');

        // HTML qaytar - displayCompanyName istifadə olunur
        return `
            <tr data-archive-id="${task.id}" data-task-id="${task.original_task_id}" class="archive-task-row">
                <td class="text-center">${serialNumber}</td>
                <td>${this.formatDate(task.created_at)}</td>
                <td>${this.escapeHtml(displayCompanyName)}</td>
                <td>${this.escapeHtml(creatorName)}</td>
                <td>${this.escapeHtml(executorName)}</td>
                <td class="actions-col">
                    <div class="action-buttons">
                        ${restoreButton}
                        ${commentsButton}
                        ${detailsButton}
                    </div>
                </td>
                <td>${this.escapeHtml(workTypeName)}</td>
                <td class="description-col">
                    <div class="description-container">
                        ${description.length > 100 ? 
                            `<span title="${this.escapeHtml(description)}">${this.truncateText(description, 100)}</span>` : 
                            this.escapeHtml(description) || '-'
                        }
                    </div>
                </td>
                <td class="file-col">${fileColumnHTML}</td>
                <td class="${dueDateClass}">${this.formatDate(task.due_date)} ${dueDateIcon}</td>
                <td>${statusBadgeHTML}</td>
                <td>${this.formatDate(task.completed_date)}</td>
                <td>${this.formatDate(archivedDate)}</td>
                <td class="text-right">${durationMinutes}</td>
                <td class="text-right">${parseFloat(hourlyRate).toFixed(2)}</td>
                <td class="text-right">${calculatedSalary} ₼</td>
                <td>${this.escapeHtml(departmentName)}</td>
            </tr>
        `;
    },

    /**
     * Arxiv taskının detallı görünüşü - TAM VERSİYA (UUID array dəstəkli)
     * @param {number} taskId - Arxiv task ID-si
     */
    viewArchiveTaskDetails: async function(taskId) {
        try {
            console.log(`📋 Arxiv task detalları göstərilir: ID=${taskId}`);

            // Yükləmə göstəricisi
            this.showLoading('Arxiv task detalları yüklənir...');

            // Task məlumatlarını yüklə
            const response = await makeApiRequest(`/task-archive/${taskId}`, 'GET');

            // 404 xətasını yoxla
            if (response.status === 404) {
                this.hideLoading();
                alert(`❌ Arxivdə ID ${taskId} olan qeyd tapılmadı!\n\nBu task arxivləşdirilməyib və ya silinib.`);
                return;
            }

            const task = response.data || response;

            if (!task) {
                throw new Error('Arxiv task tapılmadı');
            }

            console.log('📦 Arxiv task məlumatları:', task);

            // Köhnə modalı sil
            const oldModal = document.getElementById('archiveTaskDetailsModal');
            if (oldModal) oldModal.remove();

            // Task tipini təyin et
            const taskType = task.partner_id ? 'partner' : 'internal';
            const taskTypeBadge = task.partner_id ?
                '<span class="badge bg-purple"><i class="fa-solid fa-handshake"></i> Partnyor Task</span>' :
                '<span class="badge bg-primary"><i class="fa-solid fa-building"></i> Daxili Task</span>';

            // Status badge
            const statusBadge = this.getStatusBadgeHTML(task.status);

            // Task mənbəyi badge
            const taskSourceBadge = this.getTaskSourceBadge(task.task_source);

            // Şirkət məlumatları
            const companyInfo = task.company_name || `Şirkət ID: ${task.company_id}`;
            const partnerInfo = task.partner_company_name ?
                `<div class="info-row">
                    <span class="info-label"><i class="fa-solid fa-handshake"></i> Partnyor Şirkət:</span>
                    <span class="info-value">${this.escapeHtml(task.partner_company_name)}</span>
                </div>` : '';

            // Yaradan və icraçı
            const creatorName = task.creator_name || task.created_by_name || `ID: ${task.created_by}`;
            const executorName = task.assigned_to_name || task.executor_name || 'Təyin edilməyib';
            const departmentName = task.department_name || 'Təyin edilməyib';
            const workTypeName = task.work_type_name || 'Təyin edilməyib';

            // Tarixlər
            const createdDate = this.formatDateTime(task.created_at);
            const dueDate = this.formatDate(task.due_date);
            const completedDate = this.formatDateTime(task.completed_date);
            const archivedDate = this.formatDateTime(task.archived_at);

            // Maaş məlumatları
            const hourlyRate = parseFloat(task.hourly_rate || task.billing_rate || 0).toFixed(2);
            const durationMinutes = task.duration_minutes ||
                (task.actual_hours ? task.actual_hours * 60 : 0) ||
                (task.estimated_hours ? task.estimated_hours * 60 : 0) || 0;
            const calculatedSalary = this.calculateSalary(parseFloat(hourlyRate), durationMinutes);

            // ✅ FAYLLARI YÜKLƏ - UUID array-dən
            let attachments = [];

            // Əgər file_uuids varsa (UUID array)
            if (task.file_uuids && Array.isArray(task.file_uuids) && task.file_uuids.length > 0) {
                console.log(`📎 ${task.file_uuids.length} fayl UUID-si tapıldı, yüklənir...`);

                try {
                    // BÜTÜN UUID-lər üçün Promise
                    const filePromises = task.file_uuids.map(uuid =>
                        makeApiRequest(`/files/${uuid}`, 'GET')
                            .then(response => {
                                const fileData = response.data || response;
                                return {
                                    ...fileData,
                                    uuid: uuid, // UUID-ni mütləq saxla
                                    original_filename: fileData.original_filename || fileData.filename || 'Adsız fayl',
                                    mime_type: fileData.mime_type || fileData.type || '',
                                    file_size: fileData.file_size || fileData.size || 0
                                };
                            })
                            .catch(error => {
                                console.warn(`⚠️ Fayl yüklənə bilmədi UUID: ${uuid}`, error);
                                return {
                                    uuid: uuid,
                                    original_filename: 'Fayl tapılmadı',
                                    mime_type: 'unknown',
                                    file_size: 0,
                                    error: true
                                };
                            })
                    );

                    // Hamısını gözlə
                    const fileResults = await Promise.all(filePromises);

                    // Null olmayanları götür
                    attachments = fileResults.filter(f => f !== null);

                    console.log(`✅ ${attachments.length}/${task.file_uuids.length} fayl uğurla yükləndi`);

                    // Hansı fayllar yüklənə bilmədi?
                    const failedCount = attachments.filter(f => f.error).length;
                    if (failedCount > 0) {
                        console.warn(`⚠️ ${failedCount} fayl tapılmadı`);
                    }

                } catch (e) {
                    console.error('❌ Fayllar yüklənərkən xəta:', e);
                }
            }
            // Köhnə attachments formatı (əgər varsa) - backup üçün
            else if (task.attachments) {
                console.log('📎 Köhnə format attachments tapıldı');
                if (typeof task.attachments === 'string') {
                    try { attachments = JSON.parse(task.attachments); } catch (e) {}
                } else if (Array.isArray(task.attachments)) {
                    attachments = task.attachments;
                }
            }

            // Tags
            let tags = [];
            if (task.tags) {
                if (typeof task.tags === 'string') {
                    try { tags = JSON.parse(task.tags); } catch (e) {
                        if (task.tags.startsWith('{') && task.tags.endsWith('}')) {
                            tags = task.tags.slice(1, -1).split(',').map(t => t.replace(/"/g, ''));
                        }
                    }
                } else if (Array.isArray(task.tags)) {
                    tags = task.tags;
                }
            }

            // Arxiv edən şəxs
            const archivedByName = task.archived_by_fullname ||
                (task.archived_by ? `ID: ${task.archived_by}` : 'Sistem');

            // Modal HTML
            const modalHTML = `
                <div class="modal-backdrop" id="archiveTaskDetailsModal" style="z-index: 10000;">
                    <div class="modal" style="width: 900px; max-width: 95%; max-height: 90vh; overflow-y: auto;">
                        <div class="modal-header" style="background: linear-gradient(135deg, #64748b 0%, #475569 100%); color: white; position: sticky; top: 0; z-index: 10;">
                            <div style="display: flex; align-items: center; gap: 15px;">
                                <i class="fas fa-archive fa-2x"></i>
                                <div>
                                    <h3 style="margin: 0; display: flex; align-items: center; gap: 10px;">
                                        Arxiv Task Detalları
                                        ${taskTypeBadge}
                                    </h3>
                                    <small style="opacity: 0.9;">ID: ${task.id} | Kod: ${task.task_code || 'Yoxdur'}</small>
                                </div>
                            </div>
                            <button class="close-btn" onclick="document.getElementById('archiveTaskDetailsModal').remove()" style="color: white;">&times;</button>
                        </div>
    
                        <div class="modal-body" style="padding: 25px; background: #f8fafc;">
                            <!-- Status və Prioritet Kartları -->
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 25px;">
                                <div class="info-card" style="background: white; padding: 15px; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                                    <div style="color: #64748b; font-size: 12px; margin-bottom: 5px;">Status</div>
                                    <div style="font-size: 18px; font-weight: 600;">${statusBadge}</div>
                                </div>
                                <div class="info-card" style="background: white; padding: 15px; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                                    <div style="color: #64748b; font-size: 12px; margin-bottom: 5px;">Prioritet</div>
                                    <div style="font-size: 18px; font-weight: 600;">${this.getPriorityBadge(task.priority)}</div>
                                </div>
                                <div class="info-card" style="background: white; padding: 15px; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                                    <div style="color: #64748b; font-size: 12px; margin-bottom: 5px;">Proqress</div>
                                    <div style="display: flex; align-items: center; gap: 10px;">
                                        <div style="flex: 1; height: 8px; background: #e2e8f0; border-radius: 4px;">
                                            <div style="width: ${task.progress_percentage || 0}%; height: 8px; background: linear-gradient(90deg, #3b82f6, #8b5cf6); border-radius: 4px;"></div>
                                        </div>
                                        <span style="font-weight: 600;">${task.progress_percentage || 0}%</span>
                                    </div>
                                </div>
                            </div>
    
                            <!-- Əsas Məlumatlar Grid -->
                            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 25px;">
                                <!-- Sol Sütun - Task Məlumatları -->
                                <div style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                                    <h4 style="margin: 0 0 15px 0; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
                                        <i class="fas fa-info-circle" style="color: #3b82f6;"></i> 
                                        Task Məlumatları
                                    </h4>
                                    
                                    <div style="display: flex; flex-direction: column; gap: 12px;">
                                        <div class="info-row" style="display: flex; padding: 8px 0; border-bottom: 1px dashed #e2e8f0;">
                                            <span style="width: 140px; color: #64748b; font-weight: 500;">Başlıq:</span>
                                            <span style="flex: 1; font-weight: 600; color: #1e293b;">${this.escapeHtml(task.task_title)}</span>
                                        </div>
                                        
                                        <div class="info-row" style="display: flex; padding: 8px 0; border-bottom: 1px dashed #e2e8f0;">
                                            <span style="width: 140px; color: #64748b; font-weight: 500;">Şirkət:</span>
                                            <span style="flex: 1;">${this.escapeHtml(companyInfo)}</span>
                                        </div>
                                        
                                        ${partnerInfo}
                                        
                                        <div class="info-row" style="display: flex; padding: 8px 0; border-bottom: 1px dashed #e2e8f0;">
                                            <span style="width: 140px; color: #64748b; font-weight: 500;">Task mənbəyi:</span>
                                            <span style="flex: 1;">${taskSourceBadge}</span>
                                        </div>
                                        
                                        <div class="info-row" style="display: flex; padding: 8px 0; border-bottom: 1px dashed #e2e8f0;">
                                            <span style="width: 140px; color: #64748b; font-weight: 500;">Yaradan:</span>
                                            <span style="flex: 1;">${this.escapeHtml(creatorName)}</span>
                                        </div>
                                        
                                        <div class="info-row" style="display: flex; padding: 8px 0; border-bottom: 1px dashed #e2e8f0;">
                                            <span style="width: 140px; color: #64748b; font-weight: 500;">İcraçı:</span>
                                            <span style="flex: 1;">${this.escapeHtml(executorName)}</span>
                                        </div>
                                        
                                        <div class="info-row" style="display: flex; padding: 8px 0; border-bottom: 1px dashed #e2e8f0;">
                                            <span style="width: 140px; color: #64748b; font-weight: 500;">Şöbə:</span>
                                            <span style="flex: 1;">${this.escapeHtml(departmentName)}</span>
                                        </div>
                                        
                                        <div class="info-row" style="display: flex; padding: 8px 0; border-bottom: 1px dashed #e2e8f0;">
                                            <span style="width: 140px; color: #64748b; font-weight: 500;">İş növü:</span>
                                            <span style="flex: 1;">${this.escapeHtml(workTypeName)}</span>
                                        </div>
                                    </div>
                                </div>
    
                                <!-- Sağ Sütun - Tarixlər və Maliyyə -->
                                <div style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                                    <h4 style="margin: 0 0 15px 0; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
                                        <i class="fas fa-calendar-alt" style="color: #10b981;"></i> 
                                        Tarixlər və Maliyyə
                                    </h4>
                                    
                                    <div style="display: flex; flex-direction: column; gap: 12px;">
                                        <div class="info-row" style="display: flex; padding: 8px 0; border-bottom: 1px dashed #e2e8f0;">
                                            <span style="width: 140px; color: #64748b; font-weight: 500;">Yaradılma:</span>
                                            <span style="flex: 1;">${createdDate}</span>
                                        </div>
                                        
                                        <div class="info-row" style="display: flex; padding: 8px 0; border-bottom: 1px dashed #e2e8f0;">
                                            <span style="width: 140px; color: #64748b; font-weight: 500;">Son müddət:</span>
                                            <span style="flex: 1; ${this.isOverdue(task.due_date) ? 'color: #ef4444; font-weight: 600;' : ''}">
                                                ${dueDate}
                                                ${this.isOverdue(task.due_date) ? '<i class="fas fa-exclamation-triangle ms-2" style="color: #ef4444;" title="Vaxtı keçib"></i>' : ''}
                                            </span>
                                        </div>
                                        
                                        <div class="info-row" style="display: flex; padding: 8px 0; border-bottom: 1px dashed #e2e8f0;">
                                            <span style="width: 140px; color: #64748b; font-weight: 500;">Tamamlanma:</span>
                                            <span style="flex: 1;">${completedDate}</span>
                                        </div>
                                        
                                        <div class="info-row" style="display: flex; padding: 8px 0; border-bottom: 1px dashed #e2e8f0;">
                                            <span style="width: 140px; color: #64748b; font-weight: 500;">Arxiv tarixi:</span>
                                            <span style="flex: 1;">${archivedDate}</span>
                                        </div>
                                        
                                        <div class="info-row" style="display: flex; padding: 8px 0; border-bottom: 1px dashed #e2e8f0;">
                                            <span style="width: 140px; color: #64748b; font-weight: 500;">Arxivləyən:</span>
                                            <span style="flex: 1;">${this.escapeHtml(archivedByName)}</span>
                                        </div>
                                        
                                        <div class="info-row" style="display: flex; padding: 8px 0; border-bottom: 1px dashed #e2e8f0;">
                                            <span style="width: 140px; color: #64748b; font-weight: 500;">Səbəb:</span>
                                            <span style="flex: 1;">${task.archive_reason || 'Göstərilməyib'}</span>
                                        </div>
                                    </div>
    
                                    <!-- Maliyyə Bölməsi -->
                                    <h4 style="margin: 20px 0 15px 0; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
                                        <i class="fas fa-coins" style="color: #f59e0b;"></i> 
                                        Maliyyə Məlumatları
                                    </h4>
                                    
                                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                                        <div style="background: #f8fafc; padding: 12px; border-radius: 8px; text-align: center;">
                                            <div style="color: #64748b; font-size: 12px; margin-bottom: 5px;">Saatlıq tarif</div>
                                            <div style="font-size: 18px; font-weight: 700; color: #f59e0b;">${hourlyRate} ₼</div>
                                        </div>
                                        <div style="background: #f8fafc; padding: 12px; border-radius: 8px; text-align: center;">
                                            <div style="color: #64748b; font-size: 12px; margin-bottom: 5px;">Müddət (dəq)</div>
                                            <div style="font-size: 18px; font-weight: 700;">${durationMinutes}</div>
                                        </div>
                                        <div style="background: #f8fafc; padding: 12px; border-radius: 8px; text-align: center; grid-column: span 2;">
                                            <div style="color: #64748b; font-size: 12px; margin-bottom: 5px;">Formalaşan əmək haqqı</div>
                                            <div style="font-size: 24px; font-weight: 800; color: #10b981;">${calculatedSalary} ₼</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
    
                            <!-- Açıqlama Bölməsi -->
                            ${task.task_description ? `
                            <div style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 25px;">
                                <h4 style="margin: 0 0 15px 0; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
                                    <i class="fas fa-align-left" style="color: #8b5cf6;"></i> 
                                    Tapşırıq Açıqlaması
                                </h4>
                                <div style="background: #f8fafc; padding: 15px; border-radius: 8px; white-space: pre-wrap; line-height: 1.6;">
                                    ${this.escapeHtml(task.task_description)}
                                </div>
                            </div>
                            ` : ''}
    
                            <!-- Qeydlər Bölməsi -->
                            ${task.notes ? `
                            <div style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 25px;">
                                <h4 style="margin: 0 0 15px 0; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
                                    <i class="fas fa-pen" style="color: #ec4899;"></i> 
                                    Qeydlər
                                </h4>
                                <div style="background: #f8fafc; padding: 15px; border-radius: 8px; white-space: pre-wrap; line-height: 1.6;">
                                    ${this.escapeHtml(task.notes)}
                                </div>
                            </div>
                            ` : ''}
    
                            <!-- ✅ FAYLLAR BÖLMƏSİ - neçə fayl varsa hamısı -->
                            ${attachments.length > 0 ? `
                            <div style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 25px;">
                                <h4 style="margin: 0 0 15px 0; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
                                    <i class="fas fa-paperclip" style="color: #3b82f6;"></i> 
                                    Fayllar (${attachments.length})
                                </h4>
                                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 15px;">
                                    ${attachments.map((file, index) => this.createFileCardHTML(file, index, task.id)).join('')}
                                </div>
                            </div>
                            ` : ''}
    
                            <!-- Tags Bölməsi -->
                            ${tags.length > 0 ? `
                            <div style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                                <h4 style="margin: 0 0 15px 0; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
                                    <i class="fas fa-tags" style="color: #10b981;"></i> 
                                    Teqlər
                                </h4>
                                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                                    ${tags.map(tag => `<span class="badge" style="background: #e2e8f0; color: #1e293b; padding: 5px 12px; border-radius: 20px; font-size: 12px;">${this.escapeHtml(tag)}</span>`).join('')}
                                </div>
                            </div>
                            ` : ''}
                        </div>
    
                        <div class="modal-footer" style="padding: 15px 25px; border-top: 1px solid #e2e8f0; background: white; position: sticky; bottom: 0; z-index: 10;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <small class="text-muted">
                                    <i class="fa-regular fa-clock me-1"></i>
                                    Son yenilənmə: ${this.formatDateTime(task.updated_at)}
                                </small>
                                <div>
                                    <button class="secondary-btn" onclick="ArchiveTasks.restoreTask(${task.id})" style="margin-right: 10px;">
                                        <i class="fas fa-undo-alt"></i> Bərpa et
                                    </button>
                                    <button class="secondary-btn" onclick="document.getElementById('archiveTaskDetailsModal').remove()">
                                        <i class="fas fa-times"></i> Bağla
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHTML);
            this.addArchiveModalStyles();

            // Modal görünürlüyünü yoxla
            setTimeout(() => {
                const modal = document.getElementById('archiveTaskDetailsModal');
                if (modal) {
                    console.log('✅ Modal uğurla əlavə edildi');
                    modal.style.display = 'flex';
                } else {
                    console.error('❌ Modal əlavə edilmədi!');
                }
            }, 100);

        } catch (error) {
            console.error('❌ Arxiv task detalları göstərilərkən xəta:', error);

            // 404 xətasını daha yaxşı idarə et
            if (error.status === 404 || (error.data && error.data.detail === 'Arxiv qeydi tapılmadı')) {
                alert(`❌ Arxivdə ID ${taskId} olan qeyd tapılmadı!\n\nBu task arxivləşdirilməyib və ya silinib.`);
            } else {
                alert('❌ Xəta: ' + (error.message || 'Bilinməyən xəta'));
            }
        } finally {
            this.hideLoading();
        }
    },

    /**
     * Task mənbəyi badge-i yaradır
     */
    getTaskSourceBadge: function(source) {
        const sourceMap = {
            'daxili': {
                text: '🏢 Daxili Task',
                class: 'badge bg-primary',
                icon: 'fa-solid fa-building'
            },
            'partnyor': {
                text: '🤝 Partnyor Task',
                class: 'badge bg-purple',
                icon: 'fa-solid fa-handshake'
            },
            'sifarishci': {
                text: '📦 Sifarişçi Task',
                class: 'badge bg-warning text-dark',
                icon: 'fa-solid fa-truck'
            }
        };

        const s = sourceMap[source] || {
            text: source,
            class: 'badge bg-secondary',
            icon: 'fa-solid fa-question'
        };

        return `<span class="${s.class}"><i class="${s.icon} me-1"></i> ${s.text}</span>`;
    },


    /**
     * Fayl kartı HTML-i yaradır
     */
    createFileCardHTML: function(file, index, taskId) {
        // UUID-ni təyin et
        const fileUuid = file.uuid || file.file_uuid || file.id;

        const fileType = this.getFileType(file.mime_type || file.type || '');
        const fileSize = this.formatFileSize(file.file_size || file.size || 0);
        const fileIcon = this.getFileIcon(fileType);
        const fileColor = this.getFileColor(fileType);
        const isAudioRecording = file.is_audio_recording || false;

        return `
            <div class="file-card" data-file-uuid="${fileUuid}" 
                 onclick="ArchiveTasks.previewFile('${fileUuid}', '${file.original_filename || file.filename || ''}', '${file.mime_type || ''}', ${isAudioRecording})"
                 style="cursor: pointer; border: 1px solid #e9ecef; border-radius: 10px; padding: 12px; background: white; transition: all 0.3s ease; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 40px; height: 40px; border-radius: 8px; background: ${fileColor}20; display: flex; align-items: center; justify-content: center;">
                        <i class="${fileIcon}" style="color: ${fileColor}; font-size: 20px;"></i>
                    </div>
                    
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-weight: 500; color: #333; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${file.original_filename || file.filename || 'Adsız fayl'}
                            ${isAudioRecording ? '<i class="fas fa-microphone ms-2" style="color: #ef4444;"></i>' : ''}
                        </div>
                        
                        <div style="display: flex; gap: 8px; font-size: 11px; color: #666;">
                            <span><i class="fa-regular fa-file"></i> ${fileType}</span>
                            ${fileSize ? `<span><i class="fa-regular fa-hard-drive"></i> ${fileSize}</span>` : ''}
                            <span><i class="fa-regular fa-id-card"></i> ${fileUuid ? fileUuid.substring(0,8) + '...' : ''}</span>
                        </div>
                    </div>
                    
                    <div class="file-actions" style="display: flex; gap: 5px;">
                        <button class="btn btn-sm btn-outline-primary" onclick="event.stopPropagation(); ArchiveTasks.previewFile('${fileUuid}', '${file.original_filename || file.filename || ''}', '${file.mime_type || ''}', ${isAudioRecording})" title="Önizlə">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-success" onclick="event.stopPropagation(); ArchiveTasks.downloadFile('${fileUuid}', '${file.original_filename || file.filename || ''}')" title="Yüklə">
                            <i class="fas fa-download"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Prioritet badge-i yaradır
     */
    getPriorityBadge: function(priority) {
        const priorityMap = {
            'low': { text: 'Aşağı', class: 'badge bg-success' },
            'medium': { text: 'Orta', class: 'badge bg-warning text-dark' },
            'high': { text: 'Yüksək', class: 'badge bg-danger' },
            'critical': { text: 'Kritik', class: 'badge bg-dark' }
        };
        const p = priorityMap[priority] || { text: priority || 'Bilinmir', class: 'badge bg-secondary' };
        return `<span class="${p.class}">${p.text}</span>`;
    },

    /**
     * Status badge-i yaradır
     */
    getStatusBadgeHTML: function(status) {
        const statusMap = {
            'pending': { text: 'Gözləyir', class: 'status-pending' },
            'in_progress': { text: 'İşlənir', class: 'status-in-progress' },
            'completed': { text: 'Tamamlandı', class: 'status-completed' },
            'rejected': { text: 'Rədd edildi', class: 'status-rejected' },
            'cancelled': { text: 'Ləğv edildi', class: 'status-rejected' }
        };
        const s = statusMap[status] || { text: status || 'Bilinmir', class: 'status-pending' };
        return `<span class="status-badge ${s.class}">${s.text}</span>`;
    },

    /**
     * Tarixi formatla (saat daxil)
     */
    formatDateTime: function(dateString) {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('az-AZ') + ' ' +
                   date.toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return dateString;
        }
    },

    /**
     * Vaxtın keçib-keçmədiyini yoxla
     */
    isOverdue: function(dueDate) {
        if (!dueDate) return false;
        try {
            const due = new Date(dueDate);
            const now = new Date();
            return due < now;
        } catch (e) {
            return false;
        }
    },

    /**
     * Fayl tipini təyin edir
     */
    getFileType: function(mimeType) {
        if (!mimeType) return 'unknown';
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType.startsWith('video/')) return 'video';
        if (mimeType.startsWith('audio/')) return 'audio';
        if (mimeType.includes('pdf')) return 'pdf';
        if (mimeType.includes('word') || mimeType.includes('document')) return 'word';
        if (mimeType.includes('excel') || mimeType.includes('sheet')) return 'excel';
        if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'powerpoint';
        if (mimeType.includes('text/')) return 'text';
        return 'unknown';
    },

    getFileIcon: function(fileType) {
        const icons = {
            'image': 'fa-regular fa-image',
            'video': 'fa-regular fa-file-video',
            'audio': 'fa-regular fa-file-audio',
            'pdf': 'fa-regular fa-file-pdf',
            'word': 'fa-regular fa-file-word',
            'excel': 'fa-regular fa-file-excel',
            'powerpoint': 'fa-regular fa-file-powerpoint',
            'text': 'fa-regular fa-file-lines',
            'unknown': 'fa-regular fa-file'
        };
        return icons[fileType] || icons.unknown;
    },

    getFileColor: function(fileType) {
        const colors = {
            'image': '#4f46e5',
            'video': '#8b5cf6',
            'audio': '#ec4899',
            'pdf': '#ef4444',
            'word': '#2563eb',
            'excel': '#10b981',
            'powerpoint': '#f97316',
            'text': '#64748b',
            'unknown': '#94a3b8'
        };
        return colors[fileType] || colors.unknown;
    },

    formatFileSize: function(bytes) {
        if (!bytes || bytes === 0) return '';
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        return `${size.toFixed(1)} ${units[unitIndex]}`;
    },

    downloadFile: async function(fileUuid, filename) {
        try {
            console.log('📥 Fayl yüklənir:', { fileUuid, filename });
            window.open(`/api/v1/files/${fileUuid}/download`, '_blank');
        } catch (error) {
            console.error('❌ Yükləmə xətası:', error);
            alert('Xəta: ' + error.message);
        }
    },

    previewFile: function(fileUuid, filename, mimeType, isAudio) {
        console.log('📎 Fayl önizləmə:', { fileUuid, filename, mimeType, isAudio });
        if (isAudio) {
            this.previewAudioFile(fileUuid, filename);
        } else if (mimeType && mimeType.startsWith('image/')) {
            this.previewImageFile(fileUuid, filename);
        } else if (mimeType && mimeType.includes('pdf')) {
            this.previewPdfFile(fileUuid, filename);
        } else {
            window.open(`/api/v1/files/${fileUuid}/preview`, '_blank');
        }
    },

    previewAudioFile: function(fileId, filename) {
        const modalHTML = `
            <div class="modal-backdrop" id="audioPreviewModal" style="z-index: 10001;">
                <div class="modal" style="width: 400px;">
                    <div class="modal-header">
                        <h4><i class="fas fa-microphone"></i> Səs yazısı</h4>
                        <button class="close-btn" onclick="document.getElementById('audioPreviewModal').remove()">&times;</button>
                    </div>
                    <div class="modal-body" style="text-align: center; padding: 30px;">
                        <i class="fas fa-file-audio fa-4x mb-3" style="color: #ec4899;"></i>
                        <p>${filename || 'Səs yazısı'}</p>
                        <audio controls style="width: 100%; margin-top: 15px;">
                            <source src="/api/v1/files/${fileId}/stream" type="audio/mpeg">
                            Brauzeriniz audio elementini dəstəkləmir.
                        </audio>
                    </div>
                </div>
            </div>
        `;
        const oldModal = document.getElementById('audioPreviewModal');
        if (oldModal) oldModal.remove();
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    },

    previewImageFile: function(fileId, filename) {
        const modalHTML = `
            <div class="modal-backdrop" id="imagePreviewModal" style="z-index: 10001; background: rgba(0,0,0,0.9);">
                <div style="position: relative; width: 100%; height: 100vh; display: flex; align-items: center; justify-content: center;">
                    <img src="/api/v1/files/${fileId}/preview" alt="${filename}" 
                         style="max-width: 90%; max-height: 90vh; border-radius: 8px;">
                    <button class="close-btn" onclick="document.getElementById('imagePreviewModal').remove()" 
                            style="position: absolute; top: 20px; right: 20px; background: rgba(255,255,255,0.2); color: white;">&times;</button>
                </div>
            </div>
        `;
        const oldModal = document.getElementById('imagePreviewModal');
        if (oldModal) oldModal.remove();
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    },

    previewPdfFile: function(fileId, filename) {
        window.open(`/api/v1/files/${fileId}/preview`, '_blank');
    },

    showLoading: function(message = 'Yüklənir...') {
        let overlay = document.getElementById('loadingOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loadingOverlay';
            overlay.className = 'loading-overlay';
            overlay.innerHTML = `
                <div class="loading-content">
                    <div class="loader">
                        <div></div>
                        <div></div>
                    </div>
                    <p class="loading-text">${message}</p>
                </div>
            `;
            document.body.appendChild(overlay);
        } else {
            const textEl = overlay.querySelector('.loading-text');
            if (textEl) textEl.textContent = message;
            overlay.style.display = 'flex';
        }
    },

    hideLoading: function() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    },

    addArchiveModalStyles: function() {
        if (document.getElementById('archive-modal-styles')) return;
        const style = document.createElement('style');
        style.id = 'archive-modal-styles';
        style.textContent = `
            .file-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 16px rgba(0,0,0,0.1) !important;
                border-color: #3b82f6 !important;
            }
            .file-card .btn {
                opacity: 0.7;
                transition: opacity 0.2s ease;
            }
            .file-card:hover .btn {
                opacity: 1;
            }
            .badge.bg-purple {
                background: linear-gradient(135deg, #8b5cf6, #6d28d9);
                color: white;
                padding: 4px 10px;
                border-radius: 20px;
                font-size: 12px;
            }
            .status-badge {
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                display: inline-block;
            }
            .status-badge.status-completed {
                background: #d1fae5;
                color: #065f46;
            }
            .status-badge.status-pending {
                background: #fef3c7;
                color: #92400e;
            }
            .status-badge.status-in-progress {
                background: #dbeafe;
                color: #1e40af;
            }
            .status-badge.status-rejected {
                background: #fee2e2;
                color: #991b1b;
            }
            .info-row {
                transition: background-color 0.2s ease;
            }
            .info-row:hover {
                background-color: #f8fafc;
            }
        `;
        document.head.appendChild(style);
    },

    // ==================== QRİJİNAL FUNKSİYALAR ====================

    archivePartnerTask: async function(taskId, task, userId = null) {
        try {
            console.log(`📦 Partner task arxivləşdirilir: ${taskId}`);
            const currentUser = window.taskManager?.userData;
            const currentUserId = userId || currentUser?.userId || this.getCurrentUserId();
            if (!currentUserId) throw new Error('User ID tapılmadı');

            let fullTask = task;
            if (!task.assigned_to || !task.company_id) {
                try {
                    const response = await makeApiRequest(`/partner-tasks/${taskId}`, 'GET');
                    fullTask = response.data || response;
                } catch (e) {}
            }

            // ✅ ŞİRKƏT ADINI TAP
            let companyName = null;
            if (fullTask.company_id) {
                // Company cache-dən şirkət adını tap
                if (window.companyCache && window.companyCache[fullTask.company_id]) {
                    const companyData = window.companyCache[fullTask.company_id];
                    companyName = typeof companyData === 'object' ? companyData.name : companyData;
                }
                // Əgər cache-də yoxdursa, fullTask-dan götür
                else if (fullTask.company_name) {
                    companyName = fullTask.company_name;
                }
                // Ən pis halda ID-ni göstər
                else {
                    companyName = `Şirkət ID: ${fullTask.company_id}`;
                }
            }

            // Task mənbəyini təyin et
            let taskSource = 'daxili';
            if (fullTask.partner_id) {
                taskSource = 'partnyor';
            }
            else if (fullTask.company_id && currentUser?.company_id &&
                     fullTask.company_id !== currentUser.company_id) {
                taskSource = 'sifarishci';
            }

            // Fayl UUID-lərini əldə et
            let fileUuids = fullTask.file_uuids || [];
            if (fullTask.attachments && Array.isArray(fullTask.attachments)) {
                fullTask.attachments.forEach(att => {
                    if (att.uuid) fileUuids.push(att.uuid);
                });
            }

            // ✅ DÜZGÜN: fullTask istifadə et!
            const archiveData = {
                original_task_id: parseInt(taskId),
                task_code: fullTask.task_code || `TASK-${taskId}`,
                task_title: fullTask.task_title || fullTask.title || 'Task',
                task_description: fullTask.task_description || fullTask.description || '',
                assigned_to: fullTask.assigned_to,
                assigned_by: fullTask.assigned_by || fullTask.created_by,
                company_id: fullTask.company_id,
                company_name: companyName,  // ✅ 8-ci parametr
                department_id: fullTask.department_id || null,
                priority: fullTask.priority || 'medium',
                status: fullTask.status === 'rejected' ? 'rejected' : 'completed',
                due_date: fullTask.due_date || fullTask.due_at || null,
                completed_date: fullTask.completed_date || new Date().toISOString().split('T')[0],
                started_date: fullTask.started_date || fullTask.started_at || null,
                estimated_hours: parseFloat(fullTask.estimated_hours) || 0,
                actual_hours: parseFloat(fullTask.actual_hours) || 0,
                work_type_id: fullTask.work_type_id || null,
                progress_percentage: fullTask.status === 'rejected' ? 0 : 100,
                is_billable: fullTask.is_billable || false,
                billing_rate: parseFloat(fullTask.billing_rate || fullTask.hourly_rate) || 0,
                tags: fullTask.tags || null,
                created_by: fullTask.created_by,
                creator_name: fullTask.creator_name || fullTask.created_by_name || this.getCreatorName(fullTask),
                archived_by: currentUserId,
                archive_reason: fullTask.archive_reason || (fullTask.status === 'rejected' ? 'Ləğv edildiyi üçün arxivləndi' : 'Tamamlandığı üçün arxivləndi'),
                created_at: fullTask.created_at || new Date().toISOString(),
                updated_at: new Date().toISOString(),
                updated_by: currentUserId,
                task_source: taskSource,
                file_uuids: fileUuids.length > 0 ? `{${fileUuids.map(u => `"${u}"`).join(',')}}` : null
            };

            // Tags-ı PostgreSQL array formatına çevir
            if (archiveData.tags && Array.isArray(archiveData.tags)) {
                if (archiveData.tags.length > 0) {
                    archiveData.tags = '{' + archiveData.tags.map(t => `"${t}"`).join(',') + '}';
                } else {
                    archiveData.tags = null;
                }
            }

            // Undefined olanları null et
            Object.keys(archiveData).forEach(key => {
                if (archiveData[key] === undefined) archiveData[key] = null;
            });

            console.log('📦 Arxiv data hazırlandı:', {
                taskId: archiveData.original_task_id,
                title: archiveData.task_title,
                company_id: archiveData.company_id,
                company_name: archiveData.company_name,
                status: archiveData.status
            });

            const archiveResponse = await makeApiRequest('/task-archive/archive', 'POST', archiveData);
            console.log('📥 Arxiv API cavabı:', archiveResponse);
            return archiveResponse;

        } catch (error) {
            console.error(`❌ Arxiv xətası:`, error);
            if (error.data && error.data.detail) console.error('📋 Validation xətaları:', error.data.detail);
            throw error;
        }
    },


    restoreTask: async function(archiveId) {
        try {
            if (!confirm('Bu taskı arxivdən bərpa etmək istədiyinizə əminsiniz?')) return;
            console.log('🔄 Task bərpa edilir:', archiveId);
            const response = await makeApiRequest(`/task-archive/restore/${archiveId}`, 'POST');
            if (response && !response.error) {
                if (window.notificationService) {
                    notificationService.showSuccess('Task uğurla bərpa edildi');
                } else {
                    alert('✅ Task uğurla bərpa edildi');
                }
                setTimeout(() => {
                    if (window.ArchiveTableManager) {
                        window.ArchiveTableManager.refresh();
                    }
                }, 500);
            }
        } catch (error) {
            console.error('❌ Bərpa xətası:', error);
            if (window.notificationService) {
                notificationService.showError('Xəta: ' + error.message);
            } else {
                alert('❌ Xəta: ' + error.message);
            }
        }
    },

    viewTaskComments: function(taskId) {
        console.log('💬 Task comments:', taskId);
        alert(`Task ID: ${taskId} commentləri göstərilir`);
    },


    showTaskFiles: function(taskId) {
        console.log('📁 Task files:', taskId);
        alert(`Task ID: ${taskId} faylları göstərilir`);
    },

    getCurrentUserId: function() {
        try {
            if (window.taskManager?.userData?.userId) return window.taskManager.userData.userId;
            const token = localStorage.getItem('access_token');
            if (token) {
                const payload = JSON.parse(atob(token.split('.')[1]));
                return payload.user_id || payload.sub || payload.id;
            }
        } catch (e) {}
        return null;
    },

    getCreatorName: function(task) {
        if (task.creator_name) return task.creator_name;
        if (task.created_by_name) return task.created_by_name;
        const currentUser = window.taskManager?.userData;
        if (currentUser && task.created_by == currentUser.userId) return currentUser.fullName || currentUser.name;
        return `ID: ${task.created_by}`;
    },

    calculateSalary: function(hourlyRate, durationMinutes) {
        if (!hourlyRate || !durationMinutes) return '0.00';
        const hours = durationMinutes / 60;
        const salary = hours * parseFloat(hourlyRate);
        return salary.toFixed(2);
    },

    formatDate: function(dateString) {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString;
            return date.toLocaleDateString('az-AZ');
        } catch (e) {
            return dateString;
        }
    },

    escapeHtml: function(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    truncateText: function(text, length) {
        if (!text) return '';
        if (text.length <= length) return this.escapeHtml(text);
        return this.escapeHtml(text.substring(0, length)) + '...';
    }
};

// Global export
if (typeof window !== 'undefined') {
    window.ArchiveTasks = ArchiveTasks;
    console.log('✅ ArchiveTasks yükləndi - Genişləndirilmiş versiya');
    console.log('📌 Arxivə yalnız "completed" və "rejected" statusları düşür');
}