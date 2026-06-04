// taskEditModule.js - FIXED VERSION for external tasks
const TaskEditModule = {
    // ==================== TASK EDIT MODAL ====================
    openEditTaskModal: async function(taskId, taskType = 'active') {
        try {
            console.log(`✏️ Task redaktə modalı açılır: ${taskId} (${taskType})`);

            this.currentTaskId = taskId;
            this.currentTableType = taskType;

            let endpoint = '';

            // 🔥 FIX: Different endpoints for different task types
            if (taskType === 'external') {
                endpoint = `/external-tasks/${taskId}`;
                console.log('🌐 Xarici task üçün endpoint:', endpoint);
            } else {
                endpoint = `/tasks/${taskId}`;
                console.log('🏢 Daxili task üçün endpoint:', endpoint);
            }

            const response = await makeApiRequest(endpoint, 'GET');

            if (!response || response.error) {
                console.error('❌ Task məlumatları tapılmadı:', response);
                alert('❌ Task məlumatları tapılmadı!');
                return;
            }

            const task = response.data || response;
            console.log('📋 Task məlumatları:', task);

            // Add task type to task object
            task.task_type = taskType;

            // Company cache yoxla və lazım olduqda yüklə
            if (!window.companyCache || Object.keys(window.companyCache).length === 0) {
                await this.loadCompanies();
            } else {
                console.log('✅ Company cache mövcuddur, select yenilənir');
                this.updateCompanySelect();
            }

            // Modal göstər
            this.showEditModal(task, taskType, taskId);

        } catch (error) {
            console.error('❌ Edit modal açılarkən xəta:', error);
            alert('❌ Xəta: ' + error.message);
        }
    },

    // ==================== ŞİRKƏTLƏRİ YÜKLƏ ====================
    loadCompanies: async function() {
        try {
            console.log('🏢 Şirkətlər yüklənir...');

            // 🔥 DÜZƏLİŞ: Əvvəlcə TaskManager-dan companyCache-i yoxla!
            if (window.taskManager && window.taskManager.companyCache) {
                console.log('✅ TaskManager.companyCache tapıldı:', window.taskManager.companyCache);

                // TaskManager-dakı cache-i window.companyCache-ə kopyala
                if (!window.companyCache) {
                    window.companyCache = {};
                }

                Object.entries(window.taskManager.companyCache).forEach(([id, name]) => {
                    window.companyCache[id] = {
                        name: name,
                        id: id,
                        from_taskmanager: true
                    };
                });

                console.log(`✅ TaskManager-dən ${Object.keys(window.taskManager.companyCache).length} şirkət kopyalandı`);
                console.log('📊 window.companyCache:', window.companyCache);

                this.updateCompanySelect();
                return;
            }

            // TaskManager yoxdursa, əvvəlki kimi davam et...
            console.log('⚠️ TaskManager.companyCache tapılmadı, API-dən yüklənir...');

            const userData = window.taskManager?.userData;
            if (!userData) {
                console.warn('⚠️ User data tapılmadı');
                await this.loadCompaniesFromLocal();
                return;
            }

            const companyCode = userData.companyCode || userData.company_code;
            const myCompanyId = userData.companyId || userData.company_id;

            if (!companyCode || !myCompanyId) {
                console.warn('⚠️ Company məlumatları tapılmadı');
                await this.loadCompaniesFromLocal();
                return;
            }

            if (!window.companyCache) {
                window.companyCache = {};
            }

            // Öz şirkət adını API-dən al
            let myCompanyRealName = null;

            try {
                const companyResponse = await makeApiRequest(`/companies/code/${companyCode}`, 'GET', null, { silent: true });
                if (companyResponse && !companyResponse.error) {
                    const companyData = companyResponse.data || companyResponse;
                    myCompanyRealName = companyData.company_name || companyData.name;
                }
            } catch (err) {
                console.log('ℹ️ API-dən şirkət adı alınmadı:', err.message);
            }

            if (!myCompanyRealName) {
                myCompanyRealName = userData.companyName || userData.company_name || 'Mənim şirkətim';
            }

            window.companyCache[myCompanyId] = {
                name: myCompanyRealName,
                code: companyCode,
                id: myCompanyId,
                is_my_company: true
            };
            console.log(`✅ Öz şirkəti cache-ə əlavə edildi: ${myCompanyId}: ${myCompanyRealName}`);

            // 🔥 DÜZƏLİŞ: TaskManager-dan alt şirkətləri götür!
            if (window.taskManager && window.taskManager.subsidiaryCompanies) {
                console.log('✅ TaskManager.subsidiaryCompanies tapıldı:', window.taskManager.subsidiaryCompanies);

                window.taskManager.subsidiaryCompanies.forEach(company => {
                    if (company.id && company.company_name) {
                        window.companyCache[company.id] = {
                            name: company.company_name,
                            code: company.company_code,
                            id: company.id,
                            is_subsidiary: true,
                            from_taskmanager: true
                        };
                        console.log(`  ✅ Alt şirkət (TaskManager-dən): ${company.id}: ${company.company_name}`);
                    }
                });
            } else {
                // Fallback: API-dən yüklə
                console.log('⚠️ TaskManager.subsidiaryCompanies tapılmadı, API-dən yüklənir...');

                try {
                    const endpoint = `/companies/code/${companyCode}`;
                    const response = await makeApiRequest(endpoint, 'GET', null, { silent: true });

                    let companies = [];
                    if (response && response.data) {
                        if (Array.isArray(response.data)) {
                            companies = response.data;
                        } else if (response.data.sub_companies && Array.isArray(response.data.sub_companies)) {
                            companies = response.data.sub_companies;
                        }
                    } else if (response && Array.isArray(response)) {
                        companies = response;
                    } else if (response && response.sub_companies && Array.isArray(response.sub_companies)) {
                        companies = response.sub_companies;
                    }

                    if (companies.length > 0) {
                        companies.forEach(company => {
                            if (!company) return;
                            const companyId = company.id || company.company_id;
                            if (!companyId) return;
                            let companyName = company.name || company.company_name || 'Adsız şirkət';
                            const companyCodeVal = company.code || company.company_code;
                            window.companyCache[companyId] = {
                                name: companyName,
                                code: companyCodeVal,
                                id: companyId,
                                is_subsidiary: true
                            };
                            console.log(`  ✅ Alt şirkət (API-dən): ${companyId}: ${companyName}`);
                        });
                    }
                } catch (error) {
                    console.error(`❌ API xətası:`, error);
                }
            }

            // Cache-i localStorage-da saxla
            try {
                localStorage.setItem('companies_cache', JSON.stringify(window.companyCache));
            } catch (e) {
                console.warn('⚠️ LocalStorage save xətası:', e);
            }

            this.updateCompanySelect();

        } catch (error) {
            console.error('❌ Şirkətlər yüklənərkən xəta:', error);
            await this.loadCompaniesFromLocal();
        }
    },

    // LocalStorage-dan şirkətləri yüklə (fallback)
    loadCompaniesFromLocal: async function() {
        try {
            console.log('🏢 LocalStorage-dan şirkətlər yüklənir...');

            if (!window.companyCache) {
                window.companyCache = {};
            }

            // TaskManager-dən companyCache-i yoxla
            if (window.taskManager?.companyCache) {
                Object.entries(window.taskManager.companyCache).forEach(([id, name]) => {
                    if (!window.companyCache[id]) {
                        window.companyCache[id] = {
                            name: name,
                            id: id,
                            from_taskmanager: true
                        };
                    }
                });
                console.log('✅ TaskManager-dən companyCache istifadə edildi');
            }

            // LocalStorage-dan cəhd et
            try {
                const cachedCompanies = localStorage.getItem('companies_cache');
                if (cachedCompanies) {
                    const parsed = JSON.parse(cachedCompanies);

                    Object.entries(parsed).forEach(([id, data]) => {
                        if (!window.companyCache[id]) {
                            if (typeof data === 'string') {
                                window.companyCache[id] = {
                                    name: data,
                                    id: id,
                                    from_localstorage: true
                                };
                            } else if (data && typeof data === 'object') {
                                window.companyCache[id] = data;
                            }
                        }
                    });
                    console.log('✅ LocalStorage-dan companyCache yükləndi');
                }
            } catch (e) {
                console.error('❌ LocalStorage yükləmə xətası:', e);
            }

            // Öz şirkətini əlavə et
            const userData = window.taskManager?.userData;
            if (userData) {
                const myCompanyId = userData.companyId || userData.company_id;
                if (myCompanyId && !window.companyCache[myCompanyId]) {
                    const myCompanyName = userData.companyName || userData.company_name || 'Mənim şirkətim';
                    window.companyCache[myCompanyId] = {
                        name: myCompanyName,
                        id: myCompanyId,
                        is_my_company: true
                    };
                    console.log(`✅ Öz şirkəti əlavə edildi: ${myCompanyId}`);
                }
            }

            this.updateCompanySelect();

        } catch (e) {
            console.error('❌ loadCompaniesFromLocal xətası:', e);
        }
    },

    // Modalda company select-i yenilə
    updateCompanySelect: function() {
        const companySelect = document.getElementById('editCompany');
        if (!companySelect) return;

        let options = '<option value="">Şirkət seçin...</option>';

        if (window.companyCache && Object.keys(window.companyCache).length > 0) {
            const myCompanyEntries = [];
            const otherEntries = [];

            Object.entries(window.companyCache).forEach(([companyId, companyData]) => {
                if (!companyData) return;

                let companyName = 'Adsız şirkət';
                let isMyCompany = false;

                if (typeof companyData === 'object') {
                    companyName = companyData.name || companyData.company_name || `Şirkət ${companyId}`;
                    isMyCompany = companyData.is_my_company === true;
                } else if (typeof companyData === 'string') {
                    companyName = companyData;
                }

                const entry = {id: companyId, name: companyName, isMyCompany};

                if (isMyCompany) {
                    myCompanyEntries.push(entry);
                } else {
                    otherEntries.push(entry);
                }
            });

            myCompanyEntries.forEach(entry => {
                options += `<option value="${entry.id}">📍 ${this.escapeHtml(entry.name)} (Mənim şirkətim)</option>`;
            });

            otherEntries.forEach(entry => {
                options += `<option value="${entry.id}">🏢 ${this.escapeHtml(entry.name)}</option>`;
            });
        } else {
            options += '<option value="" disabled>Şirkət tapılmadı</option>';
        }

        companySelect.innerHTML = options;
        console.log('✅ Company select yeniləndi, seçim sayı:', Object.keys(window.companyCache || {}).length);
    },

    // ==================== MODAL GÖSTER ====================
    showEditModal: function(task, taskType, taskId) {
        const oldModal = document.getElementById('taskEditModalOverlay');
        if (oldModal) oldModal.remove();

        let companyOptions = '<option value="">Şirkət seçin...</option>';

        if (window.companyCache && Object.keys(window.companyCache).length > 0) {
            const myCompanyEntries = [];
            const otherEntries = [];

            Object.entries(window.companyCache).forEach(([companyId, companyData]) => {
                if (!companyData) return;

                let companyName = 'Adsız şirkət';
                let isMyCompany = false;

                if (typeof companyData === 'object') {
                    companyName = companyData.name || companyData.company_name || `Şirkət ${companyId}`;
                    isMyCompany = companyData.is_my_company === true;
                } else if (typeof companyData === 'string') {
                    companyName = companyData;
                }

                const entry = {id: companyId, name: companyName, isMyCompany};

                if (isMyCompany) {
                    myCompanyEntries.push(entry);
                } else {
                    otherEntries.push(entry);
                }
            });

            const taskCompanyId = task.company_id || task.viewable_company_id;

            myCompanyEntries.forEach(entry => {
                const isSelected = (taskCompanyId == entry.id);
                const selectedAttr = isSelected ? 'selected' : '';
                companyOptions += `<option value="${entry.id}" ${selectedAttr}>📍 ${this.escapeHtml(entry.name)} (Mənim şirkətim)</option>`;
            });

            otherEntries.forEach(entry => {
                const isSelected = (taskCompanyId == entry.id);
                const selectedAttr = isSelected ? 'selected' : '';
                companyOptions += `<option value="${entry.id}" ${selectedAttr}>🏢 ${this.escapeHtml(entry.name)}</option>`;
            });
        }

        const modalHTML = `
            <div class="task-edit-modal-overlay" id="taskEditModalOverlay">
                <div class="task-edit-modal">
                    <div class="modal-header">
                        <h3><i class="fa-solid fa-edit"></i> Task Redaktəsi</h3>
                        <button class="close-btn" onclick="TaskEditModule.closeEditModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="task-info-header">
                            <span class="task-type-badge ${taskType}">
                                ${taskType === 'external' ? '🌐 Xarici Task' : '🏢 Daxili Task'}
                            </span>
                            <span class="task-id">ID: ${taskId}</span>
                        </div>
                        
                        <form id="taskEditForm">
                            <div class="form-grid">
                                <div class="form-group">
                                    <label for="editTaskTitle">Task Başlığı:</label>
                                    <input type="text" id="editTaskTitle" class="form-control" 
                                           value="${this.escapeHtml(task.task_title || task.title || '')}" required>
                                </div>
                                
                                <div class="form-group">
                                    <label for="editTaskDescription">Açıqlama:</label>
                                    <textarea id="editTaskDescription" class="form-control" rows="3">${this.escapeHtml(task.task_description || task.description || '')}</textarea>
                                </div>
                                
                                <div class="form-group">
                                    <label for="editTaskNotes">Qeydlər:</label>
                                    <textarea id="editTaskNotes" class="form-control" rows="2">${this.escapeHtml(task.notes || '')}</textarea>
                                </div>
                                
                                <div class="form-group">
                                    <label for="editCompany">Şirkət:</label>
                                    <select id="editCompany" class="form-control">
                                        ${companyOptions}
                                    </select>
                                </div>
                                
                                <div class="form-group viewable-company-section" style="margin-top: 15px; padding: 15px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e9ecef;">
                                    <label style="font-weight: 600; color: #2c3e50; margin-bottom: 10px; display: block;">
                                        <i class="fa-solid fa-eye"></i> Görünmə Ayarları
                                    </label>
                                    
                                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                                        <input type="checkbox" id="editIsCompanyViewable" class="form-check-input" 
                                               ${task.is_company_viewable ? 'checked' : ''} style="width: 18px; height: 18px;">
                                        <label for="editIsCompanyViewable" style="margin: 0; cursor: pointer;">
                                            Başqa şirkətlərə görünsün
                                        </label>
                                    </div>
                                    
                                    <div id="viewableCompanySelectContainer" style="margin-top: 10px; ${task.is_company_viewable ? '' : 'display: none;'}">
                                        <label for="editViewableCompany">Görünəcək Şirkət:</label>
                                        <select id="editViewableCompany" class="form-control">
                                            <option value="">Seçim edin...</option>
                                            ${companyOptions.replace(/selected/g, '')}
                                        </select>
                                        <small style="color: #6c757d; display: block; margin-top: 5px;">
                                            <i class="fa-solid fa-info-circle"></i> 
                                            Bu şirkət taskı görə biləcək
                                        </small>
                                    </div>
                                </div>
                                
                                <div class="form-row">
                                    <div class="form-group">
                                        <label for="editDueDate">Son Tarix:</label>
                                        <input type="date" id="editDueDate" class="form-control" 
                                               value="${task.due_date ? task.due_date.split('T')[0] : ''}">
                                    </div>
                                    
                                    <div class="form-group">
                                        <label for="editPriority">Prioritet:</label>
                                        <select id="editPriority" class="form-control">
                                            <option value="low" ${task.priority === 'low' ? 'selected' : ''}>Aşağı</option>
                                            <option value="medium" ${(!task.priority || task.priority === 'medium') ? 'selected' : ''}>Orta</option>
                                            <option value="high" ${task.priority === 'high' ? 'selected' : ''}>Yüksək</option>
                                            <option value="critical" ${task.priority === 'critical' ? 'selected' : ''}>Kritik</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <div class="form-row">
                                    <div class="form-group">
                                        <label for="editStatus">Status:</label>
                                        <select id="editStatus" class="form-control">
                                            <option value="pending" ${task.status === 'pending' ? 'selected' : ''}>Gözləyir</option>
                                            <option value="in_progress" ${task.status === 'in_progress' ? 'selected' : ''}>İşlənir</option>
                                            <option value="completed" ${task.status === 'completed' ? 'selected' : ''}>Tamamlandı</option>
                                            <option value="rejected" ${task.status === 'rejected' ? 'selected' : ''}>İmtina edildi</option>
                                            <option value="cancelled" ${task.status === 'cancelled' ? 'selected' : ''}>Ləğv edildi</option>
                                        </select>
                                    </div>
                                    
                                    <div class="form-group">
                                        <label for="editProgress">Proqress (%):</label>
                                        <div class="progress-container">
                                            <input type="range" id="editProgress" class="form-control-range" 
                                                   min="0" max="100" step="5"
                                                   value="${task.progress_percentage || 0}">
                                            <span id="progressValue" class="progress-value">${task.progress_percentage || 0}%</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="task-details-section">
                                    <div class="detail-item">
                                        <span class="detail-label">Yaradan:</span>
                                        <span class="detail-value">${this.escapeHtml(task.creator_name || task.created_by_name || 'Bilinmir')}</span>
                                    </div>
                                    <div class="detail-item">
                                        <span class="detail-label">Təyin edilib:</span>
                                        <span class="detail-value">${this.escapeHtml(task.assigned_to_name || 'Təyin edilməyib')}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="form-actions">
                                <input type="hidden" id="editTaskId" value="${taskId}">
                                <input type="hidden" id="editTaskType" value="${taskType}">
                                
                                <button type="button" class="btn btn-primary" onclick="TaskEditModule.saveTaskEdit()">
                                    <i class="fa-solid fa-save"></i> Yadda Saxla
                                </button>
                                <button type="button" class="btn btn-secondary" onclick="TaskEditModule.closeEditModal()">
                                    <i class="fa-solid fa-times"></i> Ləğv et
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        const isViewableCheckbox = document.getElementById('editIsCompanyViewable');
        const viewableContainer = document.getElementById('viewableCompanySelectContainer');
        const viewableSelect = document.getElementById('editViewableCompany');
        const companySelect = document.getElementById('editCompany');

        if (isViewableCheckbox && viewableContainer) {
            isViewableCheckbox.addEventListener('change', function() {
                viewableContainer.style.display = this.checked ? 'block' : 'none';
            });
        }

        if (viewableSelect && task.viewable_company_id) {
            const options = viewableSelect.options;
            for (let i = 0; i < options.length; i++) {
                if (options[i].value == task.viewable_company_id) {
                    options[i].selected = true;
                    break;
                }
            }
        }

        const progressSlider = document.getElementById('editProgress');
        const progressValue = document.getElementById('progressValue');

        if (progressSlider && progressValue) {
            progressSlider.addEventListener('input', function() {
                progressValue.textContent = this.value + '%';
            });
        }
    },

    closeEditModal: function() {
        const modal = document.getElementById('taskEditModalOverlay');
        if (modal) {
            modal.remove();
        }
    },

   sendCompletionNotification: async function(taskId, taskTitle, completedBy) {
        try {
            console.log(`📱 Telegram tamamlanma bildirişi göndərilir: Task ${taskId}`);

            // ✅ Cari istifadəçini tap
            const currentUser = window.taskManager?.userData;
            const userId = currentUser?.id || currentUser?.userId || 79;

            // Task yaradanı tap (bildiriş ona gedəcək)
            let creatorId = null;
            let creatorName = 'Task yaradan';

            try {
                const taskResponse = await makeApiRequest(`/tasks/${taskId}`, 'GET', null, { silent: true });
                if (taskResponse && !taskResponse.error) {
                    const task = taskResponse.data || taskResponse;
                    creatorId = task.created_by || task.creator_id;
                    creatorName = task.creator_name || `İstifadəçi #${creatorId}`;
                }
            } catch (e) {
                console.log('ℹ️ Task details not available');
            }

            // Əgər task yaradan tapılmadısa, özümüzə bildiriş göndər
            const targetUserId = creatorId || userId;

            // ✅ TAMAMLANMA BİLDİRİŞİ ÜÇÜN XÜSUSİ DATA
            const completionData = {
                user_id: parseInt(targetUserId),  // <-- Task yaradana!
                task_id: parseInt(taskId),
                task_title: taskTitle || `Task ${taskId}`,
                action: 'completed',  // <-- VACİB: action = 'completed'
                completed_by: completedBy || currentUser?.name || currentUser?.ceo_name || 'İstifadəçi',
                completed_date: new Date().toISOString().split('T')[0],
                message_type: 'task_completed'  // <-- Əlavə tip
            };

            console.log('📦 Tamamlanma bildiriş data:', completionData);

            // Eyni endpoint-ə göndər, amma action='completed' ilə
            const response = await makeApiRequest('/telegram/send-notification', 'POST', completionData);

            if (response && !response.error) {
                console.log('✅ Telegram tamamlanma bildirişi göndərildi');
                return { success: true };
            } else {
                console.warn('⚠️ Telegram tamamlanma bildirişi göndərilə bilmədi:', response?.error || response);
                return { success: false, error: response?.error || 'Unknown error' };
            }

        } catch (error) {
            console.error('❌ Telegram tamamlanma bildiriş xətası:', error);
            return { success: false, error: error.message };
        }
    },

    sendTelegramNotification: async function(taskId, taskTitle, userId, action) {
        try {
            console.log(`📱 Telegram bildirişi göndərilir: ${action} - Task: ${taskId}`);

            // Əgər userId yoxdursa, cari istifadəçini götür
            if (!userId) {
                const currentUser = window.taskManager?.userData;
                userId = currentUser?.id || currentUser?.userId;
                console.log('👤 User ID cari istifadəçidən götürüldü:', userId);
            }

            if (!userId) {
                console.warn('⚠️ Telegram bildirişi üçün user ID tapılmadı');
                // Fallback olaraq 79
                console.log('ℹ️ Fallback user ID 79 istifadə olunur');
                userId = 79;
            }

            // Task məlumatlarını əldə etməyə çalış (əgər varsa)
            let taskDescription = '';
            let priority = 'medium';
            let dueDate = null;

            try {
                const taskResponse = await makeApiRequest(`/tasks/${taskId}`, 'GET', null, { silent: true });
                if (taskResponse && !taskResponse.error) {
                    const task = taskResponse.data || taskResponse;
                    taskDescription = task.task_description || task.description || '';
                    priority = task.priority || 'medium';
                    dueDate = task.due_date || null;
                }
            } catch (e) {
                // Task məlumatlarını almaq mümkün olmadısa, sadəcə davam et
                console.log('ℹ️ Task details not available for telegram notification');
            }

            // ✅ DÜZGÜN DATA STRUKTURU
            const notificationData = {
                task_id: parseInt(taskId),
                task_title: taskTitle || `Task ${taskId}`,
                user_id: parseInt(userId),
                action: action || 'updated',
                task_description: taskDescription,
                priority: priority,
                due_date: dueDate
            };

            console.log('📦 Telegram bildiriş data:', notificationData);

            const response = await makeApiRequest('/telegram/send-notification', 'POST', notificationData);

            if (response && !response.error) {
                console.log('✅ Telegram bildirişi göndərildi');
                return { success: true };
            } else {
                console.warn('⚠️ Telegram bildirişi göndərilə bilmədi:', response?.error || response);
                return { success: false, error: response?.error || 'Unknown error' };
            }

        } catch (error) {
            console.error('❌ Telegram bildiriş xətası:', error);
            return { success: false, error: error.message };
        }
    },

    // ==================== SAVE TASK EDIT ====================
    saveTaskEdit: async function() {
        console.log('🔍 saveTaskEdit ÇAĞIRILDI!');

        try {
            const taskId = document.getElementById('editTaskId')?.value;
            const taskType = document.getElementById('editTaskType')?.value;
            console.log('📌 taskId:', taskId, 'taskType:', taskType);

            if (!taskId) {
                console.error('❌ taskId tapılmadı!');
                alert('Task ID tapılmadı!');
                return;
            }

            const titleEl = document.getElementById('editTaskTitle');
            const descEl = document.getElementById('editTaskDescription');
            const notesEl = document.getElementById('editTaskNotes');
            const companyEl = document.getElementById('editCompany');  // Task sahibi şirkət
            const viewableCompanyEl = document.getElementById('editViewableCompany');  // Görünəcək şirkət
            const isViewableCheckbox = document.getElementById('editIsCompanyViewable');
            const dueDateEl = document.getElementById('editDueDate');
            const priorityEl = document.getElementById('editPriority');
            const statusEl = document.getElementById('editStatus');
            const progressEl = document.getElementById('editProgress');

            if (!titleEl || !titleEl.value) {
                alert('❌ Task başlığı boş ola bilməz!');
                return;
            }

            const currentUser = window.taskManager?.userData;
            console.log('👤 Cari istifadəçi:', currentUser);

            // Cari task məlumatlarını al
            let currentTask = null;
            try {
                let endpoint = '';
                if (taskType === 'external') {
                    endpoint = `/external-tasks/${taskId}`;
                } else {
                    endpoint = `/tasks/${taskId}`;
                }
                const taskResponse = await makeApiRequest(endpoint, 'GET');
                currentTask = taskResponse.data || taskResponse;
            } catch (error) {
                console.warn('⚠️ Task məlumatları alınarkən xəta:', error);
                currentTask = {};
            }

            // 🔥 DÜZƏLİŞ 1: Şirkət seçimini al (task sahibi)
            const selectedCompanyId = companyEl?.value;
            const oldCompanyId = currentTask?.company_id;

            // 🔥 DÜZƏLİŞ 2: Görünmə ayarlarını al
            const isViewable = isViewableCheckbox?.checked || false;
            const selectedViewableCompanyId = viewableCompanyEl?.value || null;

            // Köhnə statusu saxla
            const oldStatus = currentTask?.status;
            const newStatus = statusEl?.value || 'pending';

            console.log('📊 Status dəyişikliyi:', { oldStatus, newStatus });
            console.log('🏢 Şirkət dəyişikliyi:', { oldCompanyId, selectedCompanyId });
            console.log('👁️ Görünmə dəyişikliyi:', { isViewable, selectedViewableCompanyId });

            // 🔥 DÜZƏLİŞ 3: company_id və viewable_company_id ayrı-ayrı işlənsin!
            let finalCompanyId = oldCompanyId;  // Default olaraq köhnə şirkət ID
            let finalViewableCompanyId = null;
            let finalIsViewable = false;

            // Şirkət seçimi dəyişibsə, company_id yenilənsin
            if (selectedCompanyId && selectedCompanyId !== '') {
                finalCompanyId = parseInt(selectedCompanyId);
                console.log(`✅ Şirkət dəyişdirildi: ${oldCompanyId} → ${finalCompanyId}`);
            }

            // Görünmə ayarları
            if (isViewable && selectedViewableCompanyId && selectedViewableCompanyId !== '') {
                finalIsViewable = true;
                finalViewableCompanyId = parseInt(selectedViewableCompanyId);
                console.log(`✅ Görünmə aktiv: viewable_company_id = ${finalViewableCompanyId}`);
            } else if (isViewable && (!selectedViewableCompanyId || selectedViewableCompanyId === '')) {
                // Checkbox işarələnib amma şirkət seçilməyibsə
                console.warn('⚠️ Görünmə aktiv edilib amma şirkət seçilməyib');
                finalIsViewable = false;
                finalViewableCompanyId = null;
            } else {
                finalIsViewable = false;
                finalViewableCompanyId = null;
                console.log('❌ Görünmə deaktiv');
            }

            // İmtina qeydi
            let finalNotes = notesEl?.value || '';
            if (statusEl?.value === 'rejected') {
                console.log('⚠️ "İmtina edildi" seçildi, status "pending" olaraq dəyişdirilir!');
                const userName = currentUser?.name || currentUser?.username || currentUser?.ceo_name || 'İstifadəçi';
                const rejectNote = `[${new Date().toLocaleString('az-AZ')}] ${userName} tərəfindən imtina edildi`;
                finalNotes = finalNotes ? `${finalNotes}\n\n---\n${rejectNote}` : rejectNote;
            }

            // 🔥 DÜZƏLİŞ 4: Update data - company_id və viewable_company_id AYRI!
            const updateData = {
                task_title: titleEl?.value || '',
                task_description: descEl?.value || '',
                notes: finalNotes,

                // Şirkət məlumatları - AYRI AYRI!
                company_id: finalCompanyId,  // Task sahibi şirkət
                viewable_company_id: finalIsViewable ? finalViewableCompanyId : null,  // Görünəcək şirkət
                is_company_viewable: finalIsViewable,

                // Digər məlumatlar
                due_date: dueDateEl?.value || null,
                priority: priorityEl?.value || 'medium',
                status: newStatus,
                progress_percentage: parseInt(progressEl?.value) || 0
            };

            console.log('📦 Update data:', updateData);

            // 🔥 FIX: Different endpoints for update based on task type
            let endpoint = '';
            if (taskType === 'external') {
                endpoint = `/external-tasks/${taskId}`;
                console.log('🌐 Xarici task yenilənir:', endpoint);
            } else {
                endpoint = `/tasks/${taskId}`;
                console.log('🏢 Daxili task yenilənir:', endpoint);
            }

            console.log('🚀 API sorğusu GÖNDƏRİLİR: PATCH', endpoint);

            const response = await makeApiRequest(endpoint, 'PATCH', updateData);
            console.log('📥 Server response:', response);

            if (response && !response.error) {
                const userId = currentUser?.id || 79;
                const userName = currentUser?.name || currentUser?.username || currentUser?.ceo_name || 'Server Resulov';
                const taskTitle = titleEl?.value || `Task ${taskId}`;

                // Telegram bildirişləri...
                if (oldStatus !== newStatus && oldStatus) {
                    setTimeout(() => {
                        if (window.TelegramHelper && window.TelegramHelper.notifyStatusChanged) {
                            window.TelegramHelper.notifyStatusChanged(currentTask, oldStatus, newStatus, { name: userName, userId: userId });
                        }
                    }, 100);
                }

                if (newStatus === 'completed') {
                    setTimeout(() => {
                        if (window.TelegramHelper && window.TelegramHelper.notifyTaskCompleted) {
                            window.TelegramHelper.notifyTaskCompleted(currentTask, { name: userName, userId: userId });
                        }
                    }, 200);
                }

                // Task tamamlandısa arxivə köçür (only for internal tasks)
                if (newStatus === 'completed' && taskType !== 'external') {
                    console.log('✅ Task tamamlandı, arxivləşdirilir...');

                    const taskDetails = response.data || response;

                    // Görünəcək şirkət adını tap
                    let viewableCompanyName = null;
                    if (finalIsViewable && finalViewableCompanyId && window.companyCache) {
                        const companyData = window.companyCache[finalViewableCompanyId];
                        viewableCompanyName = typeof companyData === 'object' ? companyData.name : companyData;
                    }

                    const archiveData = {
                        original_task_id: parseInt(taskId),
                        task_code: taskDetails.task_code || `TASK-${taskId}`,
                        task_title: taskDetails.task_title || taskTitle,
                        task_description: taskDetails.task_description || '',
                        assigned_to: taskDetails.assigned_to,
                        assigned_by: taskDetails.assigned_by || taskDetails.created_by,
                        company_id: finalCompanyId,  // Task sahibi şirkət
                        company_name: viewableCompanyName || currentUser?.companyName || 'Socarrr',
                        viewable_company_id: finalIsViewable ? finalViewableCompanyId : null,
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
                        creator_name: taskDetails.creator_name || userName,
                        started_date: taskDetails.started_date,
                        archive_reason: 'Tamamlandığı üçün arxivləndi'
                    };

                    try {
                        const archiveResponse = await makeApiRequest('/task-archive/archive', 'POST', archiveData);
                        if (archiveResponse && !archiveResponse.error) {
                            alert('✅ Task tamamlandı və arxivə köçürüldü!');
                        } else {
                            alert('✅ Task yeniləndi, amma arxivə köçürülmədi: ' + (archiveResponse?.error || 'Bilinməyən xəta'));
                        }
                    } catch (archiveError) {
                        alert('✅ Task yeniləndi, amma arxivə köçürülmədi: ' + archiveError.message);
                    }
                } else {
                    if (statusEl?.value === 'rejected') {
                        // İmtina bildirişi artıq göndərildi
                    } else {
                        alert('✅ Task uğurla yeniləndi!');
                    }
                }

                this.closeEditModal();

                setTimeout(() => {
                    if (window.taskManager) {
                        window.taskManager.loadActiveTasks();
                        window.taskManager.loadExternalTasks();
                        if (newStatus === 'completed') {
                            if (window.archiveTableManager && window.archiveTableManager.loadArchiveTasks) {
                                window.archiveTableManager.loadArchiveTasks();
                            }
                        }
                    }
                }, 1000);
            } else {
                throw new Error(response?.detail || response?.error || 'Task yenilənə bilmədi');
            }

        } catch(error) {
            console.error('❌ saveTaskEdit xətası:', error);
            alert('❌ Xəta: ' + error.message);
        }
    },

    // ==================== REJECT & COMPLETE & CANCEL FUNCTIONS ====================
    rejectTask: async function(taskId, taskType = 'active') {
        try {
            const reason = prompt('❌ İmtina səbəbini yazın:');
            if (!reason || reason.trim() === '') {
                alert('❌ İmtina səbəbi məcburidir!');
                return;
            }

            if (!confirm(`Bu işi imtina etmək istədiyinizə əminsiniz?\nSəbəb: ${reason}`)) {
                return;
            }

            const currentUser = window.taskManager?.userData;
            const userName = currentUser?.name || currentUser?.username || currentUser?.ceo_name || 'İstifadəçi';

            let task = null;
            try {
                let endpoint = '';
                if (taskType === 'external') {
                    endpoint = `/external-tasks/${taskId}`;
                } else {
                    endpoint = `/tasks/${taskId}`;
                }
                const taskResponse = await makeApiRequest(endpoint, 'GET');
                task = taskResponse.data || taskResponse;
            } catch (error) {
                console.warn('⚠️ Task məlumatları alınarkən xəta:', error);
            }

            console.log(`❌ Task imtina edilir: ${taskId}`);

            let endpoint = '';
            if (taskType === 'external') {
                endpoint = `/external-tasks/${taskId}/reject-and-restore`;
            } else {
                endpoint = `/tasks/${taskId}/reject-and-restore`;
            }
            console.log(`🚀 API: PUT ${endpoint}`);

            const response = await makeApiRequest(endpoint, 'PUT', {
                reason: reason
            });

            console.log('📥 Server response:', response);

            if (response && !response.error) {
                // ✅ TELEGRAM BİLDİRİŞİ - İMTİNA
                await this.sendTelegramNotification(taskId, task?.task_title || task?.title || `Task ${taskId}`, currentUser?.id, 'rejected');

                alert('✅ Task imtina edildi və "Gözləyir" statusuna keçdi!');

                setTimeout(() => {
                    if (window.taskManager) {
                        window.taskManager.loadActiveTasks();
                        window.taskManager.loadExternalTasks();
                    }
                }, 500);
            } else {
                throw new Error(response?.detail || response?.error || 'Task imtina edilə bilmədi');
            }

        } catch (error) {
            console.error('❌ Task imtina edilərkən xəta:', error);
            alert('❌ Xəta: ' + error.message);
        }
    },

    cancelTask: async function(taskId, taskType = 'active') {
        try {
            const reason = prompt('🗑️ Ləğv etmə səbəbini yazın:');
            if (!reason || reason.trim() === '') {
                alert('❌ Ləğv etmə səbəbi məcburidir!');
                return;
            }

            if (!confirm(`Bu işi ləğv etmək istədiyinizə əminsiniz?\nSəbəb: ${reason}\n\n⚠️ Ləğv edilən task ARXİVƏ gedəcək!`)) {
                return;
            }

            const currentUser = window.taskManager?.userData;
            const userName = currentUser?.name || currentUser?.username || currentUser?.ceo_name || 'İstifadəçi';

            const cancelNote = `[${new Date().toLocaleString('az-AZ')}] ${userName} tərəfindən ləğv edildi. Səbəb: ${reason}`;

            let task = null;
            try {
                let endpoint = '';
                if (taskType === 'external') {
                    endpoint = `/external-tasks/${taskId}`;
                } else {
                    endpoint = `/tasks/${taskId}`;
                }
                const taskResponse = await makeApiRequest(endpoint, 'GET');
                task = taskResponse.data || taskResponse;
            } catch (error) {
                console.warn('⚠️ Task məlumatları alınarkən xəta:', error);
            }

            const existingNotes = task?.notes || '';

            const updatedNotes = existingNotes
                ? `${existingNotes}\n\n---\n${cancelNote}`
                : cancelNote;

            const updateData = {
                status: 'cancelled',
                notes: updatedNotes,
                completed_date: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                progress_percentage: 0
            };

            console.log(`🗑️ Task ləğv edilir: ${taskId}`);

            let endpoint = '';
            if (taskType === 'external') {
                endpoint = `/external-tasks/${taskId}`;
            } else {
                endpoint = `/tasks/${taskId}`;
            }

            const response = await makeApiRequest(endpoint, 'PATCH', updateData);

            if (response && !response.error) {
                // ✅ TELEGRAM BİLDİRİŞİ - LƏĞV
                await this.sendTelegramNotification(taskId, task?.task_title || task?.title || `Task ${taskId}`, currentUser?.id, 'cancelled');

                alert('✅ Task ləğv edildi!');

                setTimeout(() => {
                    if (window.taskManager) {
                        window.taskManager.loadActiveTasks();
                        window.taskManager.loadExternalTasks();
                        window.taskManager.loadArchiveTasks();
                    }
                }, 500);
            } else {
                throw new Error(response?.detail || 'Task ləğv edilə bilmədi');
            }

        } catch (error) {
            console.error('❌ Task ləğv edilərkən xəta:', error);
            alert('❌ Xəta: ' + error.message);
        }
    },

    completeTask: async function(taskId, taskType = 'active') {
        try {
            const comment = prompt('✅ Tamamlanma comment-i əlavə edin (isteğe bağlı):', '');

            const currentUser = window.taskManager?.userData;
            const userName = currentUser?.name || currentUser?.username || currentUser?.ceo_name || 'İstifadəçi';

            let updatedNotes = '';
            if (comment) {
                const completeNote = `[${new Date().toLocaleString('az-AZ')}] ${userName} tərəfindən tamamlandı. Qeyd: ${comment}`;

                try {
                    let endpoint = '';
                    if (taskType === 'external') {
                        endpoint = `/external-tasks/${taskId}`;
                    } else {
                        endpoint = `/tasks/${taskId}`;
                    }
                    const taskResponse = await makeApiRequest(endpoint, 'GET');
                    const task = taskResponse.data || taskResponse;
                    const existingNotes = task.notes || '';

                    updatedNotes = existingNotes
                        ? `${existingNotes}\n\n---\n${completeNote}`
                        : completeNote;
                } catch (error) {
                    console.warn('⚠️ Task notes alınarkən xəta:', error);
                }
            }

            const updateData = {
                status: 'completed',
                completed_date: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                progress_percentage: 100,
                ...(updatedNotes ? { notes: updatedNotes } : {})
            };

            console.log(`✅ Task tamamlanır: ${taskId}`);

            let endpoint = '';
            if (taskType === 'external') {
                endpoint = `/external-tasks/${taskId}`;
            } else {
                endpoint = `/tasks/${taskId}`;
            }

            const response = await makeApiRequest(endpoint, 'PATCH', updateData);

            if (response && !response.error) {
                // ✅ TELEGRAM BİLDİRİŞİ - TAMAMLANMA
                await this.sendCompletionNotification(taskId, response.data?.task_title || `Task ${taskId}`, userName);

                alert('✅ Task tamamlandı!');

                setTimeout(() => {
                    if (window.taskManager) {
                        window.taskManager.loadActiveTasks();
                        window.taskManager.loadExternalTasks();
                        window.taskManager.loadArchiveTasks();
                    }
                }, 1000);
            } else {
                throw new Error(response?.detail || 'Task tamamlandı edilə bilmədi');
            }

        } catch (error) {
            console.error('❌ Task tamamlanarkən xəta:', error);
            alert('❌ Xəta: ' + error.message);
        }
    },

    // ==================== HELPER FUNCTIONS ====================
    formatDate: function(dateString) {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('az-AZ');
        } catch (e) {
            return dateString;
        }
    },

    escapeHtml: function(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    truncateText: function(text, length) {
        if (!text) return '';
        if (text.length <= length) return this.escapeHtml(text);
        return this.escapeHtml(text.substring(0, length)) + '...';
    },

    calculateSalary: function(hourlyRate, durationMinutes) {
        if (!hourlyRate || !durationMinutes) return '0.00';
        const hours = durationMinutes / 60;
        const salary = hours * parseFloat(hourlyRate);
        return salary.toFixed(2);
    }
};

// ✅ TABLEMANAGER-Ə TASK ƏMƏLİYYATLARINI ƏLAVƏ ET (TELEGRAM İLE)
if (typeof TableManager !== 'undefined') {
    const originalStartTask = TableManager.startTask;
    const originalCompleteTask = TableManager.completeTask;

    TableManager.startTaskWithNotification = async function(taskId, taskTitle) {
        try {
            console.log(`▶️ Task başladılır: ${taskId} - ${taskTitle}`);

            if (originalStartTask) {
                await originalStartTask.call(this, taskId);
            } else {
                await this.apiRequest(`/tasks/${taskId}/status`, 'PUT', { status: 'in_progress' });
            }

            // ✅ TELEGRAM BİLDİRİŞİ - BAŞLATMA
            const currentUser = window.taskManager?.userData;
            if (window.TaskEditModule) {
                await TaskEditModule.sendTelegramNotification(taskId, taskTitle, currentUser?.id, 'started');
            }

            if (window.notificationService) {
                notificationService.showSuccess(`"${taskTitle}" tapşırığına başlanıldı`);
            }

        } catch (error) {
            console.error('Task başlatma xətası:', error);
            if (originalStartTask) {
                await originalStartTask.call(this, taskId);
            }
        }
    };

    TableManager.completeTaskWithNotification = async function(taskId, taskTitle) {
        try {
            console.log(`✅ Task tamamlanır: ${taskId} - ${taskTitle}`);

            if (originalCompleteTask) {
                await originalCompleteTask.call(this, taskId);
            } else {
                await this.apiRequest(`/tasks/${taskId}/status`, 'PUT', { status: 'completed' });
            }

            // ✅ TELEGRAM BİLDİRİŞİ - TAMAMLANMA
            const currentUser = window.taskManager?.userData;
            if (window.TaskEditModule) {
                await TaskEditModule.sendCompletionNotification(taskId, taskTitle, currentUser?.name || 'İstifadəçi');
            }

            if (window.notificationService) {
                notificationService.showSuccess(`"${taskTitle}" tapşırığı tamamlandı`);
            }

            if (window.SoundManager) {
                SoundManager.playTaskCompleted();
            }

            setTimeout(() => {
                if (window.taskManager) {
                    window.taskManager.loadActiveTasks();
                    window.taskManager.loadArchiveTasks?.();
                }
            }, 500);

        } catch (error) {
            console.error('Task tamamlama xətası:', error);
            if (originalCompleteTask) {
                await originalCompleteTask.call(this, taskId);
            }
        }
    };
}

// Global export
window.TaskEditModule = TaskEditModule;
console.log('✅ TaskEditModule yükləndi (TELEGRAM BİLDİRİŞLƏRİ İLE)');