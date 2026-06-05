// partnerTaskEditModule.js - DÜZƏLDİLMİŞ VERSİYA (ARXİV ENDPOINT)

const PartnerTaskEditModule = {
    currentTaskId: null,
    currentTask: null,

    /**
     * Cari istifadəçi ID-sini al
     */
    getCurrentUserId: function() {
        try {
            if (window.taskManager?.userData?.userId) {
                return window.taskManager.userData.userId;
            }

            const token = localStorage.getItem('access_token');
            if (token) {
                const payload = JSON.parse(atob(token.split('.')[1]));
                return payload.user_id || payload.sub || payload.id;
            }
        } catch (e) {
            console.warn('⚠️ Token parse xətası:', e);
        }
        return null;
    },

    /**
     * Partner task redaktə modalını açır
     */
    openEditPartnerTaskModal: async function(taskId) {
        try {
            console.log(`🤝 Partner task redaktə modalı açılır: ${taskId}`);

            this.currentTaskId = taskId;

            this.showLoading();

            const response = await makeApiRequest(`/partner-tasks/${taskId}`, 'GET');

            if (!response || response.error) {
                throw new Error(response?.detail || response?.error || 'Task məlumatları tapılmadı');
            }

            const task = response.data || response;
            console.log('📋 Partner task məlumatları:', task);

            this.currentTask = task;

            this.showEditModal(task, taskId);

        } catch (error) {
            console.error('❌ Partner task edit modal açılarkən xəta:', error);
            if (window.notificationService) {
                notificationService.showError('Xəta: ' + error.message);
            } else {
                alert('❌ Xəta: ' + error.message);
            }
        } finally {
            this.hideLoading();
        }
    },

    /**
     * Edit modalını göstər
     */
    showEditModal: function(task, taskId) {
        const oldModal = document.getElementById('partnerTaskEditModalOverlay');
        if (oldModal) oldModal.remove();

        const statusOptions = [
            { value: 'pending', label: 'Gözləmədə', icon: '⏳' },
            { value: 'in_progress', label: 'İcra olunur', icon: '⚙️' },
            { value: 'completed', label: 'Tamamlandı', icon: '✅' },
            { value: 'rejected', label: 'İmtina edildi', icon: '❌' }
        ];

        const priorityOptions = [
            { value: 'low', label: 'Aşağı', icon: '🔽' },
            { value: 'medium', label: 'Orta', icon: '⏺️' },
            { value: 'high', label: 'Yüksək', icon: '🔼' },
            { value: 'critical', label: 'Kritik', icon: '🔥' }
        ];

        let fromCompany = task.created_by_company || 'Göndərən şirkət';
        let toCompany = task.partner_company_name || task.company_name || 'Partnyor şirkət';

        const creatorName = task.creator_name || task.created_by_name || `ID: ${task.created_by}`;
        const executorName = task.assigned_to_name || task.executor_name || 'Təyin edilməyib';

        const modalHTML = `
            <div class="partner-task-edit-modal-overlay" id="partnerTaskEditModalOverlay">
                <div class="partner-task-edit-modal">
                    <div class="modal-header">
                        <div class="header-left">
                            <h3>
                                <i class="fa-solid fa-handshake" style="color: #4f46e5;"></i> 
                                Partner Task Redaktəsi
                            </h3>
                            <span class="task-id-badge">ID: ${taskId}</span>
                        </div>
                        <button class="close-btn" onclick="PartnerTaskEditModule.closeEditModal()">
                            <i class="fa-solid fa-times"></i>
                        </button>
                    </div>

                    <div class="modal-body">
                        <div class="company-cards">
                            <div class="company-card from-company">
                                <div class="company-label">
                                    <span class="company-badge A">A</span>
                                    <span class="company-title">Göndərən şirkət</span>
                                </div>
                                <div class="company-name">
                                    <i class="fa-solid fa-building"></i>
                                    ${this.escapeHtml(fromCompany)}
                                </div>
                                <div class="company-person">
                                    <i class="fa-solid fa-user"></i>
                                    ${this.escapeHtml(creatorName)}
                                </div>
                            </div>

                            <div class="arrow-icon">
                                <i class="fa-solid fa-arrow-right"></i>
                            </div>

                            <div class="company-card to-company">
                                <div class="company-label">
                                    <span class="company-badge C">C</span>
                                    <span class="company-title">Partnyor şirkət</span>
                                </div>
                                <div class="company-name">
                                    <i class="fa-solid fa-building"></i>
                                    ${this.escapeHtml(toCompany)}
                                </div>
                                <div class="company-person">
                                    <i class="fa-solid fa-user"></i>
                                    ${this.escapeHtml(executorName)}
                                </div>
                            </div>
                        </div>

                        <form id="partnerTaskEditForm" class="edit-form" onsubmit="event.preventDefault();">
                            <div class="form-row">
                                <div class="form-group full-width">
                                    <label for="editPartnerTaskTitle">
                                        <i class="fa-solid fa-heading"></i> Task başlığı
                                    </label>
                                    <input type="text" 
                                           id="editPartnerTaskTitle" 
                                           class="form-control" 
                                           value="${this.escapeHtml(task.task_title || task.title || '')}"
                                           required>
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="form-group full-width">
                                    <label for="editPartnerTaskDescription">
                                        <i class="fa-solid fa-align-left"></i> Açıqlama
                                    </label>
                                    <textarea id="editPartnerTaskDescription" 
                                              class="form-control" 
                                              rows="3">${this.escapeHtml(task.task_description || task.description || '')}</textarea>
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label for="editPartnerDueDate">
                                        <i class="fa-solid fa-calendar"></i> Son tarix
                                    </label>
                                    <input type="date" 
                                           id="editPartnerDueDate" 
                                           class="form-control"
                                           value="${task.due_date ? task.due_date.split('T')[0] : ''}">
                                </div>

                                <div class="form-group">
                                    <label for="editPartnerProgress">
                                        <i class="fa-solid fa-chart-line"></i> Proqress
                                    </label>
                                    <div class="progress-input-group">
                                        <input type="range" 
                                               id="editPartnerProgress" 
                                               class="form-control-range" 
                                               min="0" max="100" step="5"
                                               value="${task.progress_percentage || 0}">
                                        <span class="progress-value" id="partnerProgressValue">${task.progress_percentage || 0}%</span>
                                    </div>
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label for="editPartnerPriority">
                                        <i class="fa-solid fa-flag"></i> Prioritet
                                    </label>
                                    <select id="editPartnerPriority" class="form-control">
                                        ${priorityOptions.map(opt => `
                                            <option value="${opt.value}" 
                                                    ${(task.priority || 'medium') === opt.value ? 'selected' : ''}>
                                                ${opt.icon} ${opt.label}
                                            </option>
                                        `).join('')}
                                    </select>
                                </div>

                                <div class="form-group">
                                    <label for="editPartnerStatus">
                                        <i class="fa-solid fa-circle"></i> Status
                                    </label>
                                    <select id="editPartnerStatus" class="form-control">
                                        ${statusOptions.map(opt => `
                                            <option value="${opt.value}" 
                                                    ${(task.status || 'pending') === opt.value ? 'selected' : ''}>
                                                ${opt.icon} ${opt.label}
                                            </option>
                                        `).join('')}
                                    </select>
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label for="editPartnerNotes">
                                        <i class="fa-solid fa-pen"></i> Qeydlər
                                    </label>
                                    <textarea id="editPartnerNotes" 
                                              class="form-control" 
                                              rows="2">${this.escapeHtml(task.notes || '')}</textarea>
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label for="editPartnerHourlyRate">
                                        <i class="fa-solid fa-dollar-sign"></i> Saatlıq tarif (₼)
                                    </label>
                                    <input type="number" 
                                           id="editPartnerHourlyRate" 
                                           class="form-control" 
                                           step="0.01" min="0"
                                           value="${task.hourly_rate || task.billing_rate || 0}">
                                </div>
                            </div>

                            <input type="hidden" id="editPartnerTaskId" value="${taskId}">
                        </form>
                    </div>

                    <div class="modal-footer">
                        <div class="footer-left">
                            <span class="created-info">
                                <i class="fa-regular fa-clock"></i>
                                Yaradılma: ${this.formatDate(task.created_at)}
                            </span>
                        </div>
                        <div class="footer-right">
                            <button type="button" class="btn btn-secondary" onclick="PartnerTaskEditModule.closeEditModal()">
                                <i class="fa-solid fa-times"></i> Ləğv et
                            </button>
                            <button type="button" class="btn btn-primary" onclick="PartnerTaskEditModule.savePartnerTask()">
                                <i class="fa-solid fa-save"></i> Yadda saxla
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        const progressSlider = document.getElementById('editPartnerProgress');
        const progressValue = document.getElementById('partnerProgressValue');

        if (progressSlider && progressValue) {
            progressSlider.addEventListener('input', function() {
                progressValue.textContent = this.value + '%';
            });
        }

        document.addEventListener('keydown', this.handleEscKey);
    },

    savePartnerTask: async function() {
        try {
            console.log('💾 Partner task yadda saxlanılır...');

            const taskId = document.getElementById('editPartnerTaskId')?.value;
            const title = document.getElementById('editPartnerTaskTitle')?.value;
            const description = document.getElementById('editPartnerTaskDescription')?.value;
            const notes = document.getElementById('editPartnerNotes')?.value;
            const dueDate = document.getElementById('editPartnerDueDate')?.value;
            const priority = document.getElementById('editPartnerPriority')?.value;
            const status = document.getElementById('editPartnerStatus')?.value;
            const progress = parseInt(document.getElementById('editPartnerProgress')?.value) || 0;
            const hourlyRate = parseFloat(document.getElementById('editPartnerHourlyRate')?.value) || 0;

            if (!title || title.trim() === '') {
                throw new Error('Task başlığı boş ola bilməz');
            }

            const saveBtn = document.querySelector('.btn-primary[onclick*="savePartnerTask"]');
            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saxlanılır...';
            }

            const currentUserId = this.getCurrentUserId();

            if (!currentUserId) {
                throw new Error('İstifadəçi ID tapılmadı');
            }

            const updateData = {
                task_title: title.trim(),
                task_description: description?.trim() || '',
                notes: notes?.trim() || '',
                priority: priority || 'medium',
                status: status || 'pending',
                progress_percentage: progress,
                hourly_rate: hourlyRate,
                updated_by: currentUserId
            };

            if (dueDate) {
                updateData.due_date = dueDate;
            }

            console.log('📦 Partner task update data:', updateData);

            // Task-ı yenilə
            const updateResponse = await makeApiRequest(`/partner-tasks/${taskId}`, 'PUT', updateData);
            console.log('📥 Update cavabı:', updateResponse);

            if (updateResponse && !updateResponse.error) {
                // ✅ ƏGƏR STATUS "completed" OLARSA, ARXİVƏ KÖÇÜR VƏ SİL
                if (status === 'completed') {
                    console.log('✅ Task tamamlandı, arxivləşdirilir və silinir...');

                    const taskDetails = updateResponse.data || updateResponse;

                    // 🔥 PARTNER TASK ARXİV DATA - is_partner_task = TRUE
                    const archiveData = {
                        original_task_id: parseInt(taskId),
                        task_code: taskDetails.task_code,
                        task_title: taskDetails.task_title,
                        task_description: taskDetails.task_description || '',
                        assigned_to: taskDetails.assigned_to,
                        assigned_by: taskDetails.assigned_by || taskDetails.created_by,
                        company_id: taskDetails.company_id,
                        target_company_id: taskDetails.partner_company_id,
                        target_company_name: taskDetails.partner_company_name,
                        department_id: taskDetails.department_id,
                        priority: taskDetails.priority || 'medium',
                        status: 'completed',
                        due_date: taskDetails.due_date,
                        completed_date: new Date().toISOString().split('T')[0],
                        estimated_hours: parseFloat(taskDetails.estimated_hours) || 0,
                        actual_hours: parseFloat(taskDetails.actual_hours) || 0,
                        work_type_id: taskDetails.work_type_id,
                        progress_percentage: 100,
                        is_billable: taskDetails.is_billable || false,
                        billing_rate: parseFloat(taskDetails.billing_rate || taskDetails.hourly_rate) || 0,
                        tags: taskDetails.tags || null,
                        created_by: taskDetails.created_by,
                        creator_name: taskDetails.creator_name || `ID: ${taskDetails.created_by}`,
                        started_date: taskDetails.started_date,
                        archive_reason: 'Partner task tamamlandığı üçün arxivləndi',
                        // 🔥 BUNLAR VACİB!
                        is_partner_task: true,
                        company_name: taskDetails.created_by_company || taskDetails.company_name
                    };

                    console.log('📦 Partner arxiv data hazırlandı:', archiveData);

                    try {
                        // Arxivə göndər
                        const archiveResponse = await makeApiRequest('/task-archive/archive-partner', 'POST', archiveData);
                        console.log('📥 Arxiv cavabı:', archiveResponse);

                        if (archiveResponse && !archiveResponse.error) {
                            // ✅ SİLMƏ ƏMƏLİYYATI - DELETE metodu ilə
                            try {
                                console.log(`🗑️ Partner task silinir: /partner-tasks/${taskId}`);

                                const deleteResponse = await makeApiRequest(`/partner-tasks/${taskId}`, 'DELETE');

                                if (deleteResponse && !deleteResponse.error) {
                                    console.log('✅ Partner task uğurla silindi');
                                    this.showSuccess('Partner task tamamlandı, arxivə köçürüldü və silindi!');
                                } else {
                                    console.warn('⚠️ DELETE işləmədi');
                                    this.showSuccess('Partner task tamamlandı və arxivə köçürüldü');
                                }
                            } catch (deleteError) {
                                console.error('❌ Silmə xətası:', deleteError);
                                this.showSuccess('Partner task tamamlandı və arxivə köçürüldü');
                            }
                        } else {
                            console.error('❌ Arxiv xətası:', archiveResponse?.error);
                            this.showSuccess('Task yeniləndi, amma arxivə köçürülmədi');
                        }
                    } catch (archiveError) {
                        console.error('❌ Arxiv sorğusu xətası:', archiveError);
                        this.showSuccess('Task yeniləndi, amma arxivə köçürülmədi');
                    }
                } else {
                    this.showSuccess('Task uğurla yeniləndi!');
                }

                this.closeEditModal();

                setTimeout(() => {
                    if (window.PartnerTableManager) {
                        window.PartnerTableManager.refresh();
                    }
                }, 500);
            } else {
                throw new Error(updateResponse?.detail || updateResponse?.error || 'Task yenilənə bilmədi');
            }

        } catch (error) {
            console.error('❌ Partner task yadda saxlanılarkən xəta:', error);
            if (window.notificationService) {
                notificationService.showError('Xəta: ' + error.message);
            } else {
                alert('❌ Xəta: ' + error.message);
            }
        } finally {
            const saveBtn = document.querySelector('.btn-primary[onclick*="savePartnerTask"]');
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="fa-solid fa-save"></i> Yadda saxla';
            }
        }
    },

    /**
     * Modalı bağla
     */
    closeEditModal: function() {
        const modal = document.getElementById('partnerTaskEditModalOverlay');
        if (modal) {
            modal.classList.add('fade-out');
            setTimeout(() => {
                modal.remove();
            }, 300);
        }
        document.removeEventListener('keydown', this.handleEscKey);
    },

    handleEscKey: function(e) {
        if (e.key === 'Escape') {
            PartnerTaskEditModule.closeEditModal();
        }
    },

    showLoading: function() {
        const existingModal = document.getElementById('partnerTaskEditModalOverlay');
        if (existingModal) {
            const body = existingModal.querySelector('.modal-body');
            if (body) {
                body.innerHTML = `
                    <div class="loading-spinner">
                        <div class="spinner"></div>
                        <p>Yüklənir...</p>
                    </div>
                `;
            }
        }
    },

    hideLoading: function() {},

    showSuccess: function(message) {
        if (window.notificationService) {
            notificationService.showSuccess(message);
        } else {
            alert('✅ ' + message);
        }
    },

    formatDate: function(dateStr) {
        if (!dateStr) return '-';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('az-AZ') + ' ' +
                   date.toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' });
        } catch {
            return dateStr;
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
    }
};

// Global export
if (typeof window !== 'undefined') {
    window.PartnerTaskEditModule = PartnerTaskEditModule;
    console.log('✅ PartnerTaskEditModule yükləndi (birbaşa arxiv endpoint)');
}