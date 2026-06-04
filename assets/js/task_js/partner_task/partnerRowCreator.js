// partnerRowCreator.js - TƏKMİLLƏŞDİRİLMİŞ VERSİYA
// A şirkəti seçilir, B şirkəti (siz) və C şirkəti (partnyor) taskı görür

const PartnerRowCreator = {

    /**
     * Partner task üçün HTML sətri yaradır
     * Həm göndərən (A şirkəti), həm də qəbul edən (C şirkəti) üçün görünür
     */
    createPartnerRowHTML: function(task, index, currentPage) {
        try {
            console.log(`🤝 PARTNER TASK SƏTRİ YARADILIR: ID=${task.id}, Index=${index}`);
            console.log('🔍 TASK MƏLUMATLARI:', JSON.stringify(task, null, 2));

            const serialNumber = (currentPage - 1) * 20 + index + 1;

            // ===== Cari istifadəçi məlumatları =====
            const currentUser = window.taskManager?.userData;
            const myCompanyId = currentUser?.companyId;
            const myCompanyName = currentUser?.companyName || 'Mənim şirkətim';
            const myUserId = currentUser?.userId;

            let fromCompany = ''; // A şirkəti (yaradan)
            let toCompany = '';   // C şirkəti (partnyor)
            let direction = 'unknown';

            // ===== 1. METADATA-DAN MƏLUMATLARI ÇIXART =====
            if (task.metadata) {
                try {
                    const metadata = typeof task.metadata === 'string'
                        ? JSON.parse(task.metadata)
                        : task.metadata;

                    console.log('📊 METADATA:', metadata);

                    // A ŞİRKƏTİ (yaradan) - BÜTÜN MÜMKÜN VARİANTLAR
                    fromCompany = metadata.created_by_company ||
                                 metadata.source_company_name ||
                                 metadata.requester_company_name ||
                                 metadata.original_company_name ||
                                 metadata.sender_company_name ||
                                 metadata.from_company ||
                                 metadata.creator_company ||
                                 '';

                    // C ŞİRKƏTİ (partnyor) - BÜTÜN MÜMKÜN VARİANTLAR
                    toCompany = metadata.partner_company_name ||
                               metadata.target_company_name ||
                               metadata.destination_company_name ||
                               metadata.for_company ||
                               metadata.receiver_company_name ||
                               metadata.to_company ||
                               metadata.display_company_name ||
                               '';

                    // ƏGƏR METADATA-DA MÜVAFİQ ŞİRKƏT TAPILMADISA, BAŞQA FİELDLARA BAX
                    if (!fromCompany && metadata.partner_company_name && metadata.created_by) {
                        // Əgər partner varsa, yaradan şirkət cari istifadəçinin şirkəti ola bilər
                        fromCompany = myCompanyName;
                    }

                    // YARADAN ŞƏXS ADI (ƏGƏR VARSa)
                    if (!task.creator_name && !task.created_by_name) {
                        if (metadata.created_by_name) {
                            task.creator_name = metadata.created_by_name;
                        } else if (metadata.creator_name) {
                            task.creator_name = metadata.creator_name;
                        }
                    }

                    // İCRAÇI ADI (ƏGƏR VARSa)
                    if (!task.assigned_to_name && !task.executor_name) {
                        if (metadata.assigned_to_name) {
                            task.assigned_to_name = metadata.assigned_to_name;
                        } else if (metadata.executor_name) {
                            task.executor_name = metadata.executor_name;
                        }
                    }

                } catch (e) {
                    console.warn('⚠️ Metadata parse xətası:', e);
                }
            }

            // ===== 2. TASK OBYEKTİNDƏN MƏLUMATLARI GÖTÜR =====

            // A ŞİRKƏTİ (YARADAN) - ƏGƏR METADATA-DAN TAPILMADISA
            if (!fromCompany) {
                // Task obyektində yaradan şirkət
                fromCompany = task.created_by_company ||
                             task.creator_company ||
                             task.source_company ||
                             task.sender_company ||
                             (task.created_by_user?.company_name) ||
                             (task.creator?.company_name) ||
                             (task.created_by_user?.company?.name) ||
                             (task.creator?.company?.name) ||
                             '';

                // Əgər hələ də tapılmadısa, metadata-dan original_company_name-ə bax
                if (!fromCompany && task.metadata) {
                    try {
                        const metadata = typeof task.metadata === 'string'
                            ? JSON.parse(task.metadata)
                            : task.metadata;
                        fromCompany = metadata.original_company_name || metadata.created_by_company || '';
                    } catch (e) {}
                }
            }

            // C ŞİRKƏTİ (PARTNYOR) - ƏGƏR METADATA-DAN TAPILMADISA
            if (!toCompany) {
                toCompany = task.partner_company_name ||
                           task.target_company_name ||
                           task.destination_company_name ||
                           task.company_name ||
                           task.receiver_company ||
                           (task.partner_company?.name) ||
                           (task.target_company?.name) ||
                           (task.for_company?.name) ||
                           '';

                // Əgər hələ də tapılmadısa, metadata-dan display_company_name-ə bax
                if (!toCompany && task.metadata) {
                    try {
                        const metadata = typeof task.metadata === 'string'
                            ? JSON.parse(task.metadata)
                            : task.metadata;
                        toCompany = metadata.display_company_name ||
                                   metadata.target_company_name ||
                                   metadata.partner_company_name ||
                                   '';
                    } catch (e) {}
                }
            }

            // ===== 3. SON ÇARƏ: DEFAULT DƏYƏRLƏR =====
            if (!fromCompany) {
                fromCompany = myCompanyName; // Mənim şirkətim
                console.log('ℹ️ A şirkəti tapılmadı, default olaraq mənim şirkətim götürüldü');
            }

            if (!toCompany) {
                toCompany = 'Partnyor şirkət';
                console.log('ℹ️ C şirkəti tapılmadı, default dəyər götürüldü');
            }

            // ===== YARADAN ŞƏXS =====
            let creatorName = task.creator_name ||
                              task.created_by_name ||
                              (task.created_by_user?.name) ||
                              (task.created_by_user?.full_name) ||
                              (task.creator?.name) ||
                              (task.creator?.full_name) ||
                              (task.metadata?.created_by_name) ||
                              (task.metadata?.creator_name) ||
                              (task.created_by ? `ID: ${task.created_by}` : 'Sistem');

            // ===== İCRAÇI =====
            let executorName = task.assigned_to_name ||
                               task.executor_name ||
                               (task.assigned_to_user?.name) ||
                               (task.assigned_to_user?.full_name) ||
                               (task.executor?.name) ||
                               (task.executor?.full_name) ||
                               (task.metadata?.assigned_to_name) ||
                               (task.metadata?.executor_name) ||
                               (task.assigned_to ? `İşçi ID: ${task.assigned_to}` : 'Təyin edilməyib');

            // ===== DEBUG ÜÇÜN MƏLUMAT =====
            console.log('📋 ŞİRKƏT MƏLUMATLARI:', {
                fromCompany,
                toCompany,
                myCompanyName,
                creatorName,
                executorName,
                taskId: task.id
            });

            // ===== DİRECTION MÜƏYYƏN ET =====
            if (toCompany === myCompanyName) {
                direction = 'incoming'; // Mən C şirkətiyəm (qəbul edən)
                console.log('📥 Mənə gələn task (Mən C şirkətiyəm)');
            } else if (fromCompany === myCompanyName) {
                direction = 'outgoing'; // Mən A şirkətiyəm (göndərən)
                console.log('📤 Məndən gedən task (Mən A şirkətiyəm)');
            } else {
                // Task başqa şirkətlər arasındadır, amma mən görə bilirəm
                direction = 'visible';
                console.log('👁️ Mənə görünən task (başqa şirkətlər arasında)');
            }

            // ===== GÖRÜNÜRLÜK ÜÇÜN XÜSUSİ İŞARƏ =====
            let visibilityBadge = '';
            if (direction === 'incoming' || direction === 'outgoing') {
                visibilityBadge = '<span class="badge bg-purple ms-1" title="Hər iki şirkət görür">👥</span>';
            }

            // İş növü
            let workTypeName = task.work_type_name ||
                               task.work_type?.name ||
                               (task.work_type_id ? `İş növü ID: ${task.work_type_id}` : '-');

            // Şöbə
            let departmentName = task.department_name ||
                                 task.department?.name ||
                                 (task.department_id ? `Şöbə ID: ${task.department_id}` : '-');

            // Təsvir
            const description = task.task_description ||
                                task.description ||
                                '';

            // Müddət
            const durationMinutes = task.duration_minutes ||
                                    (task.estimated_hours ? task.estimated_hours * 60 : 0) ||
                                    0;

            // Saatlıq əmək haqqı
            const hourlyRate = task.hourly_rate ||
                               task.billing_rate ||
                               0;

            // Maaş hesablaması
            let calculatedSalary = '0.00';
            const hours = durationMinutes / 60;
            calculatedSalary = (hourlyRate * hours).toFixed(2);

            // Status və deadline
            const now = new Date();
            const dueDate = task.due_date ? new Date(task.due_date) : null;
            const isOverdue = dueDate && dueDate < now &&
                task.status !== 'completed' &&
                task.status !== 'cancelled';

            const dueDateClass = isOverdue ? 'text-danger fw-bold overdue-date' : '';
            const dueDateIcon = isOverdue ?
                '<i class="fa-solid fa-exclamation-triangle ms-1" title="Bu taskın vaxtı keçib!"></i>' : '';

            // Status badge
            let statusBadgeHTML = '';
            let statusClass = 'status-pending';
            let statusText = task.status || 'pending';

            if (task.status === 'completed') statusClass = 'status-completed';
            else if (task.status === 'in_progress') statusClass = 'status-in-progress';
            else if (task.status === 'overdue') statusClass = 'status-overdue';
            else if (task.status === 'cancelled') statusClass = 'status-cancelled';

            if (task.status === 'pending') statusText = 'Gözləmədə';
            else if (task.status === 'in_progress') statusText = 'İcra olunur';
            else if (task.status === 'completed') statusText = 'Tamamlandı';
            else if (task.status === 'overdue') statusText = 'Vaxtı keçib';
            else if (task.status === 'cancelled') statusText = 'Ləğv edildi';

            statusBadgeHTML = `<span class="status-badge ${statusClass}">${statusText}</span>`;

            // Bitmə tarixi
            const completedDate = task.completed_date ||
                                  task.completed_at ||
                                  null;

            // ===== DIRECTION BADGE =====
            let directionBadge = '';
            if (direction === 'incoming') {
                directionBadge = '<span class="badge bg-info ms-1" title="Mənə gələn task (Mən C şirkətiyəm)">📥 C</span>';
            } else if (direction === 'outgoing') {
                directionBadge = '<span class="badge bg-success ms-1" title="Məndən gedən task (Mən A şirkətiyəm)">📤 A</span>';
            } else {
                directionBadge = '<span class="badge bg-secondary ms-1" title="Başqa şirkətlər arasında">👁️</span>';
            }

            // ===== GÖRÜNƏN ŞİRKƏTLƏR =====
            let visibleCompaniesHTML = `
                <div class="visible-companies" style="font-size: 11px; color: #64748b; margin-top: 2px;">
                    <small>
                        <i class="fas fa-eye"></i> Görünür: 
                        <span class="badge bg-light text-dark">${this.escapeHtml(fromCompany)}</span> 
                        <i class="fas fa-arrow-right" style="font-size: 8px;"></i> 
                        <span class="badge bg-light text-dark">${this.escapeHtml(toCompany)}</span>
                    </small>
                </div>
            `;

            // ===== ƏMƏLİYYAT DÜYMƏLƏRİ =====
            let actionButtons = '';

            actionButtons += `
                <button class="btn btn-sm btn-info" onclick="PartnerRowCreator.viewPartnerTaskDetails(${task.id})" title="Detallara bax">
                    <i class="fa-solid fa-eye"></i>
                </button>
            `;

            if (task.created_by == myUserId || currentUser?.isAdmin) {
                actionButtons += `
                    <button class="btn btn-sm btn-warning" onclick="PartnerRowCreator.openEditPartnerTask(${task.id})" title="Taskı redaktə et">
                        <i class="fa-solid fa-edit"></i>
                    </button>
                `;
            }



            if (direction === 'incoming' && !task.assigned_to && task.status === 'pending') {
                actionButtons += `
                    <button class="btn btn-sm btn-success" onclick="PartnerRowCreator.takePartnerTask(${task.id})" title="Bu işi götür">
                        <i class="fa-solid fa-hand-paper"></i>
                    </button>
                `;
            }

            const commentCount = task.comment_count || task._count?.comments || 0;
            actionButtons += `
                <button class="btn btn-sm btn-outline-info" onclick="PartnerRowCreator.viewPartnerTaskComments(${task.id})" title="Comment-lər">
                    <i class="fa-solid fa-comments"></i>
                    ${commentCount > 0 ? `<span class="comment-count">${commentCount}</span>` : ''}
                </button>
            `;

            // ===== FAYL SÜTUNU =====
            let fileColumnHTML = this.createFileColumnHTML(task);

            // ===== AÇIQLAMA SÜTUNU =====
            let descriptionHTML = '';
            if (description.length > 50) {
                descriptionHTML = `
                    <div class="description-container">
                        <span title="${this.escapeHtml(description)}">
                            ${this.truncateText(description, 50)}
                        </span>
                    </div>
                `;
            } else {
                descriptionHTML = `
                    <div class="description-container">
                        ${this.escapeHtml(description) || '-'}
                    </div>
                `;
            }

            // ===== HTML SƏTRİ - BÜTÜN SÜTUNLAR =====
            return `
                <tr data-task-id="${task.id}" 
                    data-task-type="partner" 
                    data-direction="${direction}"
                    data-from-company="${fromCompany}"
                    data-to-company="${toCompany}"
                    class="partner-task-row">
                    
                    <!-- 1. № sütunu -->
                    <td class="text-center">${serialNumber}</td>
                    
                    <!-- 2. Tarix -->
                    <td>${this.formatDate(task.created_at)}</td>
                    
                    <!-- 3. Şirkətlər (A və C yan-yana) -->
                    <td>
                        <div style="display: flex; align-items: center; gap: 15px; flex-wrap: wrap;">
                            <!-- A şirkəti -->
                            <div style="display: flex; align-items: center; gap: 5px; background: #f8fafc; padding: 4px 10px; border-radius: 20px; border: 1px solid #e2e8f0;">
                                <span style="background: #4f46e5; color: white; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-size: 12px; font-weight: bold;">A</span>
                                <span style="font-weight: 500; color: #1e293b;" title="Yaradan şirkət">${fromCompany || 'Naməlum şirkət'}</span>
                            </div>
                            
                            <!-- Ox işarəsi -->
                            <i class="fas fa-arrow-right" style="color: #94a3b8; font-size: 14px;"></i>
                            
                            <!-- C şirkəti -->
                            <div style="display: flex; align-items: center; gap: 5px; background: #f0fdf4; padding: 4px 10px; border-radius: 20px; border: 1px solid #bbf7d0;">
                                <span style="background: #10b981; color: white; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-size: 12px; font-weight: bold;">C</span>
                                <span style="font-weight: 500; color: #065f46;" title="Partnyor şirkət">${toCompany || 'Partnyor şirkət'}</span>
                            </div>
                            
                            <!-- Sizin şirkət indikatoru -->
                            ${direction === 'outgoing' ? 
                                '<span style="background: #dbeafe; color: #1e40af; font-size: 10px; padding: 2px 6px; border-radius: 12px; margin-left: 5px;">Siz (A)</span>' : 
                                direction === 'incoming' ? 
                                '<span style="background: #d1fae5; color: #065f46; font-size: 10px; padding: 2px 6px; border-radius: 12px; margin-left: 5px;">Siz (C)</span>' : ''}
                        </div>
                    </td>
                    
                    <!-- 4. Yaradan şəxs (A şirkəti) -->
                    <td>
                        <div style="display: flex; flex-direction: column;">
                            <small style="color: #4f46e5; font-size: 10px;">${fromCompany || 'Naməlum şirkət'}</small>
                            <span style="font-weight: 500;">${creatorName || '-'}</span>             
                        </div>
                    </td>
                    
                    <!-- 5. İcraçı (C şirkəti) -->
                    <td>
                        <div style="display: flex; flex-direction: column;">
                            <small style="color: #10b981; font-size: 10px;">${toCompany || 'Partnyor şirkət'}</small>
                            <span style="font-weight: 500;">${executorName || 'Təyin edilməyib'}</span>
                        </div>
                    </td>
                    
                    <!-- 10. Son müddət -->
                    <td class="${dueDateClass}">
                        ${this.formatDate(task.due_date)}
                        ${dueDateIcon}
                    </td>
                    
                    <!-- 11. Status -->
                    <td>${statusBadgeHTML}</td>
                    
                    <!-- 6. Əməliyyatlar -->
                    <td>
                        <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                            ${actionButtons}
                        </div>
                    </td>
                    
                    <!-- 7. İş növü -->
                    <td>${workTypeName || '-'}</td>
                    
                    <!-- 8. Açıqlama -->
                    <td class="description-col">${descriptionHTML}</td>
                    
                    <!-- 9. Fayl -->
                    <td>${fileColumnHTML}</td>

                    <!-- 13. Müddət (dəq) -->
                    <td style="text-align: right;">${durationMinutes}</td>
               
                    <!-- 14. Şöbə -->
                    <td>${departmentName || '-'}</td>
                </tr>
            `;

        } catch (error) {
            console.error('❌ Partner row yaradılarkən xəta:', error);
            return this.createFallbackRow(task, index, currentPage);
        }
    },

    /**
     * Fayl sütunu HTML yaradır
     */
    createFileColumnHTML: function(task) {
        if (!task.attachments || task.attachments.length === 0) {
            return '<span class="text-muted">-</span>';
        }

        const count = Array.isArray(task.attachments) ? task.attachments.length : 0;
        return `
            <div class="file-indicator" title="${count} fayl">
                <i class="fas fa-paperclip"></i>
                <span>${count}</span>
            </div>
        `;
    },

    /**
     * Tarixi formatla
     */
    formatDate: function(dateStr) {
        if (!dateStr) return '-';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;
            return date.toLocaleDateString('az-AZ');
        } catch {
            return dateStr;
        }
    },

    /**
     * HTML escape et
     */
    escapeHtml: function(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    /**
     * Mətni qısalt
     */
    truncateText: function(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    },

    /**
     * Taskı tamamla və arxivə göndər
     */
    completePartnerTask: async function(taskId) {
        try {
            console.log(`✅ Partner task tamamlanır: ${taskId}`);

            // İstifadəçidən təsdiq al
            const confirmComplete = await Swal.fire({
                title: 'Taskı tamamla və arxivə göndər?',
                text: 'Bu task tamamlanmış kimi işarələnəcək və arxivə göndəriləcək. Siyahıdan silinəcək.',
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#10b981',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'Bəli, tamamla',
                cancelButtonText: 'İmtina'
            });

            if (!confirmComplete.isConfirmed) return;

            // Loading göstər
            Swal.fire({
                title: 'Gözləyin...',
                text: 'Task tamamlanır və arxivə göndərilir',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            // Cari istifadəçi ID-sini al
            let currentUserId = null;
            if (window.taskManager?.userData?.userId) {
                currentUserId = window.taskManager.userData.userId;
            } else {
                const token = localStorage.getItem('access_token');
                if (token) {
                    try {
                        const payload = JSON.parse(atob(token.split('.')[1]));
                        currentUserId = payload.user_id || payload.sub || payload.id;
                    } catch (e) {}
                }
            }

            // 1. Task məlumatlarını al
            const taskResponse = await makeApiRequest(`/partner-tasks/${taskId}`, 'GET');
            if (taskResponse.error) {
                throw new Error('Task məlumatları alına bilmədi');
            }

            const task = taskResponse.data || taskResponse;

            // 2. Task-ı yenilə (status = completed)
            const updateData = {
                status: 'completed',
                progress_percentage: 100,
                completed_date: new Date().toISOString().split('T')[0],
                updated_by: currentUserId
            };

            const updateResponse = await makeApiRequest(`/partner-tasks/${taskId}`, 'PATCH', updateData);
            if (updateResponse.error) {
                throw new Error('Task yenilənə bilmədi');
            }

            // 3. Arxivə köçür
            const archiveData = {
                original_task_id: parseInt(taskId),
                task_code: task.task_code,
                task_title: task.task_title,
                task_description: task.task_description || '',
                assigned_to: task.assigned_to,
                assigned_by: task.assigned_by || task.created_by,
                company_id: task.company_id,
                department_id: task.department_id,
                priority: task.priority || 'medium',
                status: 'completed',
                due_date: task.due_date,
                completed_date: new Date().toISOString().split('T')[0],
                estimated_hours: parseFloat(task.estimated_hours) || 0,
                actual_hours: parseFloat(task.actual_hours) || 0,
                work_type_id: task.work_type_id,
                progress_percentage: 100,
                is_billable: task.is_billable || false,
                billing_rate: parseFloat(task.billing_rate || task.hourly_rate) || 0,
                tags: task.tags || null,
                created_by: task.created_by,
                creator_name: task.creator_name || `ID: ${task.created_by}`,
                started_date: task.started_date,
                archive_reason: 'Tamamlandığı üçün arxivləndi (birbaşa düymə)'
            };

            const archiveResponse = await makeApiRequest('/task-archive/archive', 'POST', archiveData);
            console.log('📥 Arxiv cavabı:', archiveResponse);

            if (archiveResponse && !archiveResponse.error) {
                // 4. Orijinal task-ı deaktiv et (sil)
                try {
                    const deactivateData = {
                        is_active: false,
                        status: 'completed',
                        updated_by: currentUserId
                    };
                    await makeApiRequest(`/partner-tasks/${taskId}`, 'PATCH', deactivateData);
                    console.log('✅ Orijinal task deaktiv edildi');
                } catch (deactivateError) {
                    console.warn('⚠️ Task deaktiv edilə bilmədi:', deactivateError);
                }

                Swal.fire({
                    title: 'Uğurlu!',
                    text: 'Task tamamlandı, arxivə köçürüldü və siyahıdan silindi',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                Swal.fire({
                    title: 'Qismən uğurlu!',
                    text: 'Task tamamlandı, lakin arxivə köçürülə bilmədi. Siyahıdan silinməyəcək.',
                    icon: 'warning',
                    timer: 3000,
                    showConfirmButton: false
                });
            }

            // Cədvəli yenilə
            setTimeout(() => {
                if (window.PartnerTableManager) {
                    PartnerTableManager.refresh();
                } else {
                    location.reload();
                }
            }, 2000);

        } catch (error) {
            console.error('❌ Task tamamlanarkən xəta:', error);
            Swal.fire({
                title: 'Xəta!',
                text: error.message || 'Task tamamlanarkən xəta baş verdi',
                icon: 'error',
                confirmButtonText: 'Bağla'
            });
        }
    },

    /**
     * Task detallarına bax
     */
    viewPartnerTaskDetails: async function(taskId) {
        console.log('👁️ Task details:', taskId);
        alert(`Task ID: ${taskId} detalları göstərilir (modal hazırlanır)`);
    },

    openEditPartnerTask: function(taskId) {
        console.log('✏️ Partner task redaktə edilir, PartnerTaskEditModule-ə yönləndirilir:', taskId);

        // PartnerTaskEditModule varsa, ona yönləndir
        if (window.PartnerTaskEditModule && typeof window.PartnerTaskEditModule.openEditPartnerTaskModal === 'function') {
            window.PartnerTaskEditModule.openEditPartnerTaskModal(taskId);
        } else {
            console.error('❌ PartnerTaskEditModule tapılmadı');

            // Fallback: TaskEditModule-ə yönləndir
            if (window.TaskEditModule && typeof window.TaskEditModule.openEditTaskModal === 'function') {
                window.TaskEditModule.openEditTaskModal(taskId, 'partner');
            } else {
                alert('Task redaktə modulu yüklənməyib');
            }
        }
    },

    /**
     * Task götür
     */
    takePartnerTask: async function(taskId) {
        console.log('🤝 Task götürülür:', taskId);
        alert(`Task ID: ${taskId} götürülür...`);
    },

    /**
     * Comments-ə bax
     */
    viewPartnerTaskComments: function(taskId) {
        console.log('💬 Task comments:', taskId);
        alert(`Task ID: ${taskId} comments (modal hazırlanır)`);
    },

    /**
     * Fallback sətir
     */
    createFallbackRow: function(task, index, currentPage) {
        const serialNumber = (currentPage - 1) * 20 + index + 1;
        return `
            <tr data-task-id="${task.id}" class="fallback-row">
                <td colspan="16" class="text-center text-muted">
                    <small>Task ID: ${task.id} - Məlumat göstərilə bilmədi</small>
                </td>
            </tr>
        `;
    }
};

// Global export
if (typeof window !== 'undefined') {
    window.PartnerRowCreator = PartnerRowCreator;
    console.log('✅ PartnerRowCreator yükləndi - Tamamla düyməsi əlavə edildi');
}