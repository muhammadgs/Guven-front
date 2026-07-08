// taskEditModule.js - TAM VERSİYA (İşçi adları + Sticky düymələr)
const TaskEditModule = {
    // Timer state-ni saxla
    timerInterval: null,
    currentTaskElapsedTime: 0,
    hasManualTimeAdded: false,

    // İşçi və iş növü cache
    employeesCache: [],
    workTypesCache: [],

    // ==================== TASK EDIT MODAL ====================
    openEditTaskModal: async function (taskId, taskType = 'active') {
        try {
            console.log(`✏️ Task redaktə modalı açılır: ${taskId} (${taskType})`);

            this.currentTaskId = taskId;
            this.currentTableType = taskType;

            // 1. Task məlumatlarını yüklə
            let endpoint = `/tasks/${taskId}`;
            const response = await makeApiRequest(endpoint, 'GET');

            if (!response || response.error) {
                alert('❌ Task məlumatları tapılmadı!');
                return;
            }

            const task = response.data || response;
            console.log('📋 Task məlumatları:', task);

            // Vaxt məlumatlarını saxla
            this.currentTaskElapsedTime = task.total_elapsed_seconds || 0;

            // 2. Company cache yoxla
            if (!window.companyCache || Object.keys(window.companyCache).length === 0) {
                await this.loadCompanies();
            } else {
                console.log('✅ Company cache mövcuddur, select yenilənir');
                this.updateCompanySelect();
            }

            // 3. 🔥 İŞÇİLƏRİ YÜKLƏ (əgər cache yoxdursa)
            if (this.employeesCache.length === 0) {
                await this.loadEmployees();
            }

            // 4. 🔥 İŞ NÖVLƏRİNİ YÜKLƏ (əgər cache yoxdursa)
            if (this.workTypesCache.length === 0) {
                await this.loadWorkTypesForEdit();
            }

            // Modal göstər
            this.showEditModal(task, taskType, taskId);

        } catch (error) {
            console.error('❌ Edit modal açılarkən xəta:', error);
            alert('❌ Xəta: ' + error.message);
        }
    },

    // ==================== İŞÇİLƏRİ YÜKLƏ ====================
    loadEmployees: async function () {
        try {
            console.log('👥 İşçilər yüklənir...');

            const companyCode = window.taskManager?.userData?.companyCode
                || window.taskManager?.userData?.company_code;

            if (!companyCode) {
                console.warn('⚠️ Company code tapılmadı, işçilər yüklənə bilmədi');
                return;
            }

            let list = [];

            // 1. makeApiRequest ilə cəhd
            try {
                const r1 = await makeApiRequest(`/users/company/${companyCode}`, 'GET', null, {silent: true});
                const arr = Array.isArray(r1) ? r1 : (r1?.data || r1?.items || []);
                if (arr.length > 0) {
                    list = arr;
                    console.log(`✅ makeApiRequest: ${list.length} işçi`);
                }
            } catch(e) {
                console.warn('makeApiRequest failed:', e.message);
            }

            // 2. taskManager.employees fallback
            if (list.length > 0) {
                this.employeesCache = list.map(emp => {
                    // Adı tapmaq üçün normallaşdırma (API-də ceo_name + ceo_lastname var)
                    let employeeName = null;

                    if (emp.ceo_name && emp.ceo_lastname) {
                        employeeName = `${emp.ceo_name} ${emp.ceo_lastname}`;
                    }
                    else if (emp.ceo_name) {
                        employeeName = emp.ceo_name;
                    }
                    else if (emp.ceo_lastname) {
                        employeeName = emp.ceo_lastname;
                    }
                    else if (emp.name && emp.name !== 'undefined') employeeName = emp.name;
                    else if (emp.full_name && emp.full_name !== 'undefined') employeeName = emp.full_name;
                    else if (emp.username && emp.username !== 'undefined') employeeName = emp.username;
                    else if (emp.first_name) {
                        employeeName = emp.first_name;
                        if (emp.last_name && emp.last_name !== 'undefined') employeeName += ' ' + emp.last_name;
                    }
                    else if (emp.display_name && emp.display_name !== 'undefined') employeeName = emp.display_name;

                    return {
                        id: emp.id || emp.user_id || emp.userId,
                        name: employeeName || `İşçi ${emp.id || emp.user_id || '?'}`,
                        original: emp
                    };
                });

            console.log(`✅ ${this.employeesCache.length} işçi yükləndi və normallaşdırıldı`);
            console.log('📋 İlk işçi:', this.employeesCache[0]);

            this.updateEmployeeSelect();
        } else {
                console.warn('⚠️ Heç bir işçi tapılmadı');
            }
        } catch (err) {
            console.error('❌ loadEmployees xətası:', err);
            if (window.taskManager?.employees?.length > 0) {
                this.employeesCache = window.taskManager.employees;
                this.updateEmployeeSelect();
            }
        }
    },

    // ==================== İŞ NÖVLƏRİNİ YÜKLƏ ====================
    loadWorkTypesForEdit: async function () {
        try {
            console.log('🏷️ İş növləri yüklənir...');

            const companyId = window.taskManager?.userData?.companyId
                || window.taskManager?.userData?.company_id
                || 51;

            const response = await makeApiRequest(`/worktypes/company/${companyId}`, 'GET', null, {silent: true});

            if (response) {
                let list = Array.isArray(response) ? response : (response.data || response.items || []);
                if (list.length > 0) {
                    this.workTypesCache = list.filter(wt => wt.is_active !== false);
                    console.log(`✅ ${this.workTypesCache.length} iş növü yükləndi`);
                    this.updateWorkTypeSelect();
                } else {
                    console.warn('⚠️ İş növü tapılmadı');
                }
            }
        } catch (error) {
            console.error('❌ İş növləri xətası:', error);
        }
    },

    // ==================== İŞÇİ SELECT-İNİ YENİLƏ (DÜZƏLDİLMİŞ - AD GÖSTƏRƏN) ====================
    updateEmployeeSelect: function () {
        const employeeSelect = document.getElementById('editAssignedTo');
        if (!employeeSelect) return;

        let options = '<option value="">İşçi seçin...</option>';

        if (this.employeesCache.length > 0) {
            this.employeesCache.forEach(emp => {
                const empId = emp.id || emp.user_id;

                // 🔥 DÜZƏLİŞ: API-dən gələn sahələrə uyğun ad tapmaq
                let empName = null;

                // API cavabındakı sahələr: ceo_name, ceo_lastname
                if (emp.ceo_name && emp.ceo_lastname) {
                    empName = `${emp.ceo_name} ${emp.ceo_lastname}`;
                }
                else if (emp.ceo_name) {
                    empName = emp.ceo_name;
                }
                else if (emp.ceo_lastname) {
                    empName = emp.ceo_lastname;
                }
                // Əgər yuxarıdakılar yoxdursa, digər variantları yoxla
                else if (emp.name && emp.name !== 'undefined') empName = emp.name;
                else if (emp.full_name && emp.full_name !== 'undefined') empName = emp.full_name;
                else if (emp.username && emp.username !== 'undefined') empName = emp.username;
                else if (emp.first_name) {
                    empName = emp.first_name;
                    if (emp.last_name && emp.last_name !== 'undefined') empName += ' ' + emp.last_name;
                }
                else if (emp.display_name && emp.display_name !== 'undefined') empName = emp.display_name;
                else {
                    empName = `İşçi ${empId}`;
                }

                // Konsola yazdır (debug üçün)
                console.log(`📌 İşçi: ID=${empId}, Ad=${empName}`);

                options += `<option value="${empId}">👤 ${this.escapeHtml(empName)}</option>`;
            });

            console.log(`✅ ${this.employeesCache.length} işçi select-ə əlavə edildi`);
        } else {
            options += '<option value="" disabled>İşçi tapılmadı</option>';
            console.warn('⚠️ İşçi cache-i boşdur!');
        }

        employeeSelect.innerHTML = options;

        // Cari assignee-i seç (əgər varsa)
        const currentAssigneeId = document.getElementById('editOriginalAssignee')?.value;
        if (currentAssigneeId && currentAssigneeId !== 'null' && currentAssigneeId !== 'undefined') {
            employeeSelect.value = currentAssigneeId;
            console.log(`✅ Cari işçi seçildi: ID=${currentAssigneeId}`);
        }
    },

    // ==================== İŞ NÖVÜ SELECT-İNİ YENİLƏ ====================
    updateWorkTypeSelect: function () {
        const workTypeSelect = document.getElementById('editWorkType');
        if (!workTypeSelect) return;

        let options = '<option value="">İş növü seçin...</option>';

        if (this.workTypesCache.length > 0) {
            this.workTypesCache.forEach(wt => {
                const wtId = wt.id;
                const wtName = wt.work_type_name || wt.name || `İş növü ${wtId}`;
                options += `<option value="${wtId}">📋 ${this.escapeHtml(wtName)}</option>`;
            });
        } else {
            options += '<option value="" disabled>İş növü tapılmadı</option>';
        }

        workTypeSelect.innerHTML = options;

        // 🔥 Cari work type-i seç
        const currentWorkTypeId = document.getElementById('editOriginalWorkType')?.value;
        if (currentWorkTypeId) {
            workTypeSelect.value = currentWorkTypeId;
        }
    },

    // ==================== ŞİRKƏTLƏRİ YÜKLƏ ====================

    loadCompanies: async function () {
        try {
            console.log(' Şirkətlər yüklənir...');

            // 1. Token-dan company məlumatlarını al
            const token = localStorage.getItem('guven_token') || localStorage.getItem('access_token');
            let myCompanyId = null;
            let myCompanyCode = null;
            let myCompanyName = null;

            if (token) {
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    myCompanyId = payload.company_id;
                    myCompanyCode = payload.company_code;
                    myCompanyName = payload.company_name;
                    console.log('🔑 Token-dan şirkət:', { myCompanyId, myCompanyCode, myCompanyName });
                } catch(e) {}
            }

            // 2. TaskManager-dan fallback
            if (!myCompanyId && window.taskManager?.userData) {
                myCompanyId = window.taskManager.userData.companyId || window.taskManager.userData.company_id;
                myCompanyCode = window.taskManager.userData.companyCode || window.taskManager.userData.company_code;
                myCompanyName = window.taskManager.userData.companyName || window.taskManager.userData.company_name;
            }

            if (!window.companyCache) {
                window.companyCache = {};
            }

            // 3. Öz şirkətini əlavə et
            if (myCompanyId && myCompanyCode) {
                // Şirkət adını API-dən al (daha dəqiq)
                let realCompanyName = myCompanyName;
                try {
                    const companyResponse = await makeApiRequest(`/companies/code/${myCompanyCode}`, 'GET', null, {silent: true});
                    if (companyResponse && !companyResponse.error) {
                        const companyData = companyResponse.data || companyResponse;
                        if (companyData.company_name) {
                            realCompanyName = companyData.company_name;
                        } else if (companyData.name) {
                            realCompanyName = companyData.name;
                        }
                    }
                } catch(e) {
                    console.log('ℹ️ Şirkət API xətası:', e.message);
                }

                window.companyCache[myCompanyId] = {
                    id: myCompanyId,
                    name: realCompanyName || myCompanyName || myCompanyCode,
                    code: myCompanyCode,
                    is_my_company: true
                };
                console.log(`✅ Öz şirkət əlavə edildi: ${realCompanyName} (${myCompanyId})`);
            }

            // 4. Subsidiary şirkətlərini yüklə (🔥 ƏSAS DÜZƏLİŞ BURADA)
            if (myCompanyCode) {
                try {
                    // DÜZGÜN ENDPOINT: /companies/company/{company_code}/sub-companies
                    const endpoint = `/companies/company/${myCompanyCode}/sub-companies`;
                    console.log(`📡 Subsidiary yüklənir: ${endpoint}`);

                    const response = await makeApiRequest(endpoint, 'GET', null, {silent: true});
                    console.log('📥 Subsidiary API cavabı:', response);

                    let subsidiaries = [];

                    if (response && !response.error) {
                        // Cavab formatını yoxla
                        if (Array.isArray(response)) {
                            subsidiaries = response;
                        } else if (response.data && Array.isArray(response.data)) {
                            subsidiaries = response.data;
                        } else if (response.subsidiary_companies && Array.isArray(response.subsidiary_companies)) {
                            subsidiaries = response.subsidiary_companies;
                        } else if (response.sub_companies && Array.isArray(response.sub_companies)) {
                            subsidiaries = response.sub_companies;
                        }
                    }

                    if (subsidiaries.length > 0) {
                        subsidiaries.forEach(sub => {
                            const subId = sub.id || sub.company_id;
                            const subName = sub.company_name || sub.name;
                            const subCode = sub.company_code || sub.code;

                            if (subId && subName) {
                                window.companyCache[subId] = {
                                    id: subId,
                                    name: subName,
                                    code: subCode,
                                    is_subsidiary: true
                                };
                                console.log(`  - Subsidiary: ${subName} (${subId})`);
                            }
                        });
                        console.log(`✅ ${subsidiaries.length} subsidiary şirkət əlavə edildi`);
                    } else {
                        console.log('ℹ️ Subsidiary şirkət tapılmadı');
                    }

                } catch (err) {
                    console.error('❌ Subsidiary yükləmə xətası:', err);
                }
            }

            // 5. Parent şirkətlərini yüklə (varsa)
            if (myCompanyCode) {
                try {
                    const endpoint = `/companies/${myCompanyCode}/parent-companies`;
                    console.log(`📡 Parent yüklənir: ${endpoint}`);

                    const response = await makeApiRequest(endpoint, 'GET', null, {silent: true});
                    console.log('📥 Parent API cavabı:', response);

                    let parents = [];

                    if (response && !response.error) {
                        if (Array.isArray(response)) {
                            parents = response;
                        } else if (response.data && Array.isArray(response.data)) {
                            parents = response.data;
                        } else if (response.parent_companies && Array.isArray(response.parent_companies)) {
                            parents = response.parent_companies;
                        }
                    }

                    if (parents.length > 0) {
                        parents.forEach(parent => {
                            const parentId = parent.company_id || parent.id;
                            const parentName = parent.company_name || parent.name;
                            const parentCode = parent.company_code || parent.code;

                            if (parentId && parentName) {
                                window.companyCache[parentId] = {
                                    id: parentId,
                                    name: parentName,
                                    code: parentCode,
                                    is_parent: true
                                };
                                console.log(`  - Parent: ${parentName} (${parentId})`);
                            }
                        });
                        console.log(`✅ ${parents.length} parent şirkət əlavə edildi`);
                    }

                } catch (err) {
                    console.log('ℹ️ Parent yükləmə xətası (normal ola bilər):', err.message);
                }
            }

            // 6. TaskManager-dan subsidiary varsa onları da əlavə et
            if (window.taskManager?.subsidiaryCompanies?.length > 0) {
                window.taskManager.subsidiaryCompanies.forEach(sub => {
                    const subId = sub.id;
                    const subName = sub.company_name || sub.name;
                    if (subId && subName && !window.companyCache[subId]) {
                        window.companyCache[subId] = {
                            id: subId,
                            name: subName,
                            code: sub.company_code,
                            is_subsidiary: true,
                            from_taskmanager: true
                        };
                    }
                });
            }

            // 7. LocalStorage-a cache et
            try {
                localStorage.setItem('companies_cache', JSON.stringify(window.companyCache));
            } catch(e) {}

            console.log(` ÜMUMİ ŞİRKƏT SAYI: ${Object.keys(window.companyCache).length}`);
            console.log('Şirkət siyahısı:', window.companyCache);

            // 8. Select-i yenilə
            this.updateCompanySelect();

        } catch (error) {
            console.error('❌ loadCompanies xətası:', error);
            await this.loadCompaniesFromLocal();
        }
    },



    loadCompaniesFromLocal: async function () {
        try {
            if (!window.companyCache) {
                window.companyCache = {};
            }

            if (window.taskManager?.companyCache) {
                Object.entries(window.taskManager.companyCache).forEach(([id, name]) => {
                    if (!window.companyCache[id]) {
                        window.companyCache[id] = {name: name, id: id, from_taskmanager: true};
                    }
                });
                const myId = window.taskManager?.myCompany?.id || window.taskManager?.userData?.companyId;
                if (myId && window.companyCache[myId]) {
                    window.companyCache[myId].is_my_company = true;
                }
            }

            try {
                const cachedCompanies = localStorage.getItem('companies_cache');
                if (cachedCompanies) {
                    const parsed = JSON.parse(cachedCompanies);
                    Object.entries(parsed).forEach(([id, data]) => {
                        if (!window.companyCache[id]) {
                            window.companyCache[id] = typeof data === 'string'
                                ? {name: data, id: id}
                                : data;
                        }
                    });
                }
            } catch (e) {
            }

            const userData = window.taskManager?.userData;
            if (userData) {
                const myCompanyId = userData.companyId || userData.company_id;
                if (myCompanyId && !window.companyCache[myCompanyId]) {
                    window.companyCache[myCompanyId] = {
                        name: userData.companyName || userData.company_name,
                        id: myCompanyId,
                        is_my_company: true
                    };
                }
            }

            this.updateCompanySelect();
        } catch (e) {
            console.error('❌ loadCompaniesFromLocal xətası:', e);
        }
    },

    updateCompanySelect: function () {
        const companySelect = document.getElementById('editCompany');
        if (!companySelect) return;

        let options = '<option value="">Şirkət seçin...</option>';

        if (window.companyCache && Object.keys(window.companyCache).length > 0) {
            const myCompanyEntries = [];
            const otherEntries = [];

            Object.entries(window.companyCache).forEach(([companyId, companyData]) => {
                if (!companyData) return;
                let companyName = typeof companyData === 'object'
                    ? (companyData.name || companyData.company_name || `Şirkət ${companyId}`)
                    : companyData;
                const isMyCompany = typeof companyData === 'object' && companyData.is_my_company === true;
                (isMyCompany ? myCompanyEntries : otherEntries).push({id: companyId, name: companyName, isMyCompany});
            });

            myCompanyEntries.forEach(e => {
                options += `<option value="${e.id}">${this.escapeHtml(e.name)}</option>`;
            });
            otherEntries.forEach(e => {
                options += `<option value="${e.id}"> ${this.escapeHtml(e.name)}</option>`;
            });
        } else {
            options += '<option value="" disabled>Şirkət tapılmadı</option>';
        }

        companySelect.innerHTML = options;
    },

    _getCompanyNameById: function (companyId) {
        if (!companyId) return null;

        if (window.companyCache && window.companyCache[companyId]) {
            const d = window.companyCache[companyId];
            return typeof d === 'object' ? (d.name || d.company_name) : d;
        }

        if (window.taskManager?.companyCache?.[companyId]) {
            return window.taskManager.companyCache[companyId];
        }

        if (window.taskManager?.subsidiaryCompanies) {
            const found = window.taskManager.subsidiaryCompanies.find(c => String(c.id) === String(companyId));
            if (found) return found.company_name;
        }

        if (window.taskManager?.myCompany && String(window.taskManager.myCompany.id) === String(companyId)) {
            return window.taskManager.myCompany.company_name;
        }

        return null;
    },

    // ==================== VAXT FORMATLAYICISI ====================
    formatSeconds: function (seconds) {
        if (!seconds || seconds < 0) return '0 dəq';

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (hours > 0 && minutes > 0) {
            return `${hours} saat ${minutes} dəq`;
        } else if (hours > 0) {
            return `${hours} saat`;
        } else if (minutes > 0) {
            return `${minutes} dəq`;
        } else {
            return '0 dəq';
        }
    },

    // ==================== SAATI GÜNCƏLLƏ ====================
    startTimeTimer: function () {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }

        this.timerInterval = setInterval(() => {
            this.currentTaskElapsedTime++;
            const timerEl = document.getElementById('currentTimeDisplay');
            if (timerEl) {
                timerEl.textContent = this.formatSeconds(this.currentTaskElapsedTime);
            }
        }, 1000);
    },

    stopTimeTimer: function () {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    },

    showEditModal: function (task, taskType, taskId) {
        const oldModal = document.getElementById('taskEditModalOverlay');
        if (oldModal) oldModal.remove();

        const realCompanyId = task.company_id;
        const realCompanyName = task.company_name || this._getCompanyNameById(realCompanyId) || `Şirkət ID: ${realCompanyId}`;

        console.log(` Task ${taskId} üçün əsl sahib şirkət:`);
        console.log(`   company_id: ${realCompanyId}`);
        console.log(`   company_name: ${realCompanyName}`);

        const selectedViewableId = task.viewable_company_id;
        let selectedViewableName = task.viewable_company_name;

        // 🔥 Cari təyin edilmiş işçi
        const currentAssigneeId = task.assigned_to;
        let currentAssigneeName = task.assigned_to_name || 'Təyin edilməyib';

        // 🔥 Cari iş növü
        const currentWorkTypeId = task.work_type_id;
        let currentWorkTypeName = task.work_type_name || 'Seçilməyib';

        console.log(`👤 Cari təyin: ${currentAssigneeName} (ID: ${currentAssigneeId})`);
        console.log(`🏷️ Cari iş növü: ${currentWorkTypeName} (ID: ${currentWorkTypeId})`);

        // ========== ŞİRKƏT SİYAHISINI HAZIRLA ==========
        let companyOptions = '<option value="">Şirkət seçin...</option>';
        let selectedOptionHtml = '';

        if (window.companyCache && Object.keys(window.companyCache).length > 0) {
            const myCompanyEntries = [];
            const otherEntries = [];

            Object.entries(window.companyCache).forEach(([companyId, companyData]) => {
                if (!companyData) return;
                let companyName = typeof companyData === 'object'
                    ? (companyData.name || companyData.company_name || `Şirkət ${companyId}`)
                    : companyData;
                const isMyCompany = typeof companyData === 'object' && companyData.is_my_company === true;

                if (isMyCompany) {
                    myCompanyEntries.push({ id: companyId, name: companyName, isMyCompany: true });
                } else {
                    otherEntries.push({ id: companyId, name: companyName, isMyCompany: false });
                }
            });

            let selectedEntry = null;
            selectedEntry = otherEntries.find(entry => String(entry.id) === String(selectedViewableId));
            if (!selectedEntry) {
                selectedEntry = myCompanyEntries.find(entry => String(entry.id) === String(selectedViewableId));
            }

            if (selectedEntry) {
                const icon = selectedEntry.isMyCompany ? '' : ' ';
                selectedOptionHtml = `<option value="${selectedEntry.id}" selected>${icon}${this.escapeHtml(selectedEntry.name)} ✓</option>`;
                console.log(`✅ Seçilmiş görünən şirkət tapıldı: ${selectedEntry.name} (ID: ${selectedEntry.id})`);
            } else if (selectedViewableId) {
                let fallbackName = selectedViewableName;
                if (!fallbackName) {
                    fallbackName = `Şirkət ID: ${selectedViewableId}`;
                }
                selectedOptionHtml = `<option value="${selectedViewableId}" selected> ${this.escapeHtml(fallbackName)} ✓</option>`;
            }

            myCompanyEntries.forEach(entry => {
                if (!selectedEntry || String(entry.id) !== String(selectedEntry.id)) {
                    companyOptions += `<option value="${entry.id}">${this.escapeHtml(entry.name)}</option>`;
                }
            });

            otherEntries.forEach(entry => {
                if (!selectedEntry || String(entry.id) !== String(selectedEntry.id)) {
                    companyOptions += `<option value="${entry.id}"> ${this.escapeHtml(entry.name)}</option>`;
                }
            });

            if (selectedOptionHtml) {
                companyOptions = selectedOptionHtml + companyOptions;
            }
        }

        // 🕐 CARI VAXT MƏLUMATLARI
        const totalSeconds = task.total_elapsed_seconds || 0;

        // 🔥 Modal HTML - STICKY DÜYMƏLƏR İLƏ
        const modalHTML = `
            <div class="task-edit-modal-overlay" id="taskEditModalOverlay">
                <div class="task-edit-modal ${taskType === 'external' ? '' : 'task-edit-internal-glass'}">
                    <div class="modal-header">
                        <h3><span class="task-edit-title-icon"><i class="fa-solid fa-pen-to-square"></i></span> Task Redaktəsi</h3>
                        <button class="close-btn" onclick="TaskEditModule.closeEditModal()" aria-label="Modalı bağla"><i class="fa-solid fa-times"></i></button>
                    </div>
                    
                    <!-- SCROLLABLE BODY -->
                    <div class="modal-body-scrollable" id="modalBodyScrollable">
                        <div class="task-info-header">
                            <span class="task-type-badge ${taskType}">
                                ${taskType === 'external' ? ' Xarici Task' : ' Daxili Task'}
                            </span>
                            <span class="task-id">ID: ${taskId}</span>
                        </div>
                        
                        <form id="taskEditForm">
                            <div class="form-grid">
                                <div class="form-row edit-task-top-controls task-edit-top-fields">
                                    <div class="form-group task-edit-card">
                                        <label for="editDueDate"><i class="fa-solid fa-calendar-days"></i> Son Tarix</label>
                                        <input type="date" id="editDueDate" class="form-control" 
                                               value="${task.due_date ? task.due_date.split('T')[0] : ''}">
                                    </div>
                                    <div class="form-group task-edit-card">
                                        <label for="editPriority"><i class="fa-solid fa-flag"></i> Prioritet</label>
                                        <select id="editPriority" class="form-control">
                                            <option value="low" ${task.priority === 'low' ? 'selected' : ''}>Aşağı</option>
                                            <option value="medium" ${(!task.priority || task.priority === 'medium') ? 'selected' : ''}>Orta</option>
                                            <option value="high" ${task.priority === 'high' ? 'selected' : ''}>Yüksək</option> 
                                        </select>
                                    </div>
                                    <div class="form-group task-edit-card">
                                        <label for="editStatus"><i class="fa-solid fa-circle-check"></i> Status</label>
                                        <select id="editStatus" class="form-control">
                                            <option value="defoult" ${task.status === 'defoult' ? 'selected' : ''}>Status seçin</option>
                                            <option value="completed" ${task.status === 'completed' ? 'selected' : ''}>Tamamlandı</option>
                                            <option value="rejected" ${task.status === 'rejected' ? 'selected' : ''}>İmtina edildi</option>
                                            <option value="cancelled" ${task.status === 'cancelled' ? 'selected' : ''}>Ləğv edildi</option>
                                        </select>
                                    </div>
                                    <div class="form-group task-edit-card">
                                        <label for="editProgress"><i class="fa-solid fa-chart-line"></i> Proqress</label>
                                        <div class="progress-container">
                                            <input type="range" id="editProgress" class="form-control-range" 
                                                   min="0" max="100" step="5"
                                                   value="${task.progress_percentage || 0}">
                                            <span id="progressValue" class="progress-value">${task.progress_percentage || 0}%</span>
                                        </div>
                                    </div>
                                </div>

                                <div class="form-group task-edit-title-row">
                                    <label for="editTaskTitle"><i class="fa-solid fa-heading"></i> Task Başlığı</label>
                                    <input type="text" id="editTaskTitle" class="form-control" 
                                           value="${this.escapeHtml(task.task_title || task.title || '')}" required>
                                </div>
                                
                                <div class="form-group">
                                    <label for="editTaskDescription"><i class="fa-solid fa-align-left"></i> Açıqlama</label>
                                    <textarea id="editTaskDescription" class="form-control" rows="3">${this.escapeHtml(task.task_description || task.description || '')}</textarea>
                                </div>
                                
                                <!-- 🔥 İKİ SÜTUN: İŞÇİ + İŞ NÖVÜ -->
                                <div class="form-row two-columns">
                                    <div class="form-group">
                                        <label for="editAssignedTo">
                                            <i class="fa-solid fa-user-check"></i> Təyin Edilmiş İşçi:
                                        </label>
                                        <select id="editAssignedTo" class="form-control">
                                            <option value="">İşçi yüklənir...</option>
                                        </select>
                                        <small style="color:#6c757d;display:block;margin-top:5px;">
                                            <i class="fa-solid fa-info-circle"></i> Taskı başqa işçiyə təyin edin
                                        </small>
                                    </div>
                                    
                                    <div class="form-group">
                                        <label for="editWorkType">
                                            <i class="fa-solid fa-briefcase"></i> İş Növü:
                                        </label>
                                        <select id="editWorkType" class="form-control">
                                            <option value="">İş növü yüklənir...</option>
                                        </select>
                                        <small style="color:#6c757d;display:block;margin-top:5px;">
                                            <i class="fa-solid fa-info-circle"></i> Taskın kateqoriyasını dəyişin
                                        </small>
                                    </div>
                                </div>
                                
                                <div class="form-group" id="notesFormGroup">
                                    <label for="editTaskNotes" id="notesLabel">
                                        <i class="fa-solid fa-pen"></i> Qeydlər:
                                        <span id="notesRequiredWarning" style="display:none; color:#dc2626; font-size:12px; margin-left:8px;">
                                            <i class="fa-solid fa-circle-exclamation"></i> Mütləq qeyd əlavə edin!
                                        </span>
                                    </label>
                                    <textarea id="editTaskNotes" class="form-control" rows="3" 
                                              placeholder="Qeydlər...${this.hasManualTimeAdded ? ' (Manual vaxt əlavə edilib, qeyd yazmağınız mütləqdir!)' : ''}"
                                              style="${this.hasManualTimeAdded ? 'border:2px solid #dc2626; background:#fef2f2;' : ''}">${this.escapeHtml(task.notes || '')}</textarea>
                                    <small id="notesHelpText" style="display:${this.hasManualTimeAdded ? 'block' : 'none'}; color:#dc2626; font-size:11px; margin-top:5px;">
                                        <i class="fa-solid fa-info-circle"></i> ⚠️ Manual vaxt əlavə etdiyiniz üçün bu sahəyə qeyd yazmağınız MÜTLƏQDİR!
                                    </small>
                                </div>

                                <!-- MANUAL SAAT ƏLAVƏ ET -->
                                <div class="form-group manual-time-section">
                                    <label><i class="fa-solid fa-plus-circle"></i> Əl ilə Saat Əlavə Et</label>
                                    <div class="form-group timer-section">
                                        <label><i class="fa-solid fa-clock"></i> Toplam İşlənmiş Vaxt</label>
                                        <div class="timer-display">
                                            <div class="timer-item">
                                                <span class="timer-value" id="currentTimeDisplay" style="font-size:18px; font-weight:bold;">${this.formatSeconds(totalSeconds)}</span>
                                            </div>
                                        </div>
                                        <small style="color:#6c757d; margin-top:5px; display:block;">
                                            <i class="fa-solid fa-info-circle"></i> Yalnız işlənmiş vaxt (saat/dəq)
                                        </small>
                                    </div>
                                    <div class="manual-time-input">
                                        <div class="time-inputs">
                                            <div class="time-input-group">
                                                <label for="addHours">Saat:</label>
                                                <input type="number" id="addHours" class="form-control" min="0" max="23" value="0" placeholder="0">
                                            </div>
                                            <div class="time-input-group">
                                                <label for="addMinutes">Dəqiqə:</label>
                                                <input type="number" id="addMinutes" class="form-control" min="0" max="59" value="0" placeholder="0">
                                            </div>
                                        </div>
                                        <button type="button" class="btn btn-add-time" onclick="TaskEditModule.addManualTime()">
                                            <i class="fa-solid fa-plus"></i> Əlavə Et
                                        </button>
                                    </div>
                                    <small style="color:#6c757d;display:block;margin-top:8px;">
                                        <i class="fa-solid fa-info-circle"></i> Daxil etdiyiniz vaxt cari vaxtla toplanacaq
                                    </small>
                                </div>
                                
                                <!-- GİZLİ SAHİB ŞİRKƏTİ (company_id) -->
                                <input type="hidden" id="editRealCompanyId" value="${realCompanyId}">
                                
                                <div class="form-group">
                                    <label for="editCompany">
                                        <i class="fa-solid fa-building"></i> Görünən Şirkət:
                                    </label>
                                    <select id="editCompany" class="form-control">
                                        ${companyOptions}
                                    </select>
                                    <small style="color:#6c757d;display:block;margin-top:5px;">
                                        <i class="fa-solid fa-info-circle"></i> 
                                        Task bu şirkətə görünəcək (Əsl sahib: <strong>${this.escapeHtml(realCompanyName)}</strong>)
                                    </small>
                                </div>
                                
                                <!-- Görünmə Ayarları -->
                                <div class="form-group viewable-company-section" style="margin-top:15px;padding:15px;background:#f8f9fa;border-radius:8px;border:1px solid #e9ecef;">
                                    <label style="font-weight:600;color:#2c3e50;margin-bottom:10px;display:block;">
                                        <i class="fa-solid fa-eye"></i> Görünmə Ayarları
                                    </label>
                                    <div style="display:flex;align-items:center;gap:10px;">
                                        <input type="checkbox" id="editIsCompanyViewable" class="form-check-input" 
                                               ${task.is_company_viewable ? 'checked' : ''} style="width:18px;height:18px;">
                                        <label for="editIsCompanyViewable" style="margin:0;cursor:pointer;">
                                            Başqa şirkətlərə görünsün
                                        </label>
                                    </div>
                                    <div id="viewableCompanyInfo" style="margin-top:10px;font-size:12px;color:#6c757d;">
                                        <i class="fa-solid fa-info-circle"></i> 
                                        Task yalnız seçilmiş şirkət tərəfindən görünəcək
                                    </div>
                                </div>
                                
                                <div class="task-details-section">
                                    <div class="detail-item">
                                        <span class="detail-label">Yaradan:</span>
                                        <span class="detail-value">${this.escapeHtml(task.creator_name || task.created_by_name || 'Bilinmir')}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- GİZLİ INPUTLAR -->
                            <input type="hidden" id="editTaskId" value="${taskId}">
                            <input type="hidden" id="editTaskType" value="${taskType}">
                            <input type="hidden" id="editTotalSeconds" value="${totalSeconds}">
                            <input type="hidden" id="editOriginalAssignee" value="${currentAssigneeId || ''}">
                            <input type="hidden" id="editOriginalWorkType" value="${currentWorkTypeId || ''}">
                        </form>
                    </div>
                    
                    <!-- 🔥 STICKY FOOTER - DÜYMƏLƏR HƏMİŞƏ GÖRÜNƏCƏK -->
                    <div class="modal-footer-sticky">
                        <button type="button" class="btn btn-primary" onclick="TaskEditModule.saveTaskEdit()">
                            <i class="fa-solid fa-save"></i> Yadda Saxla
                        </button>
                        <button type="button" class="btn btn-secondary" onclick="TaskEditModule.closeEditModal()">
                            <i class="fa-solid fa-times"></i> Ləğv et
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // 🔥 SELECT-ləri doldur (modal açıldıqdan sonra)
        this.updateEmployeeSelect();
        this.updateWorkTypeSelect();

        // Timer başlat
        this.startTimeTimer();

        // Event listeners
        const isViewableCheckbox = document.getElementById('editIsCompanyViewable');
        if (isViewableCheckbox) {
            isViewableCheckbox.addEventListener('change', function () {
                const infoDiv = document.getElementById('viewableCompanyInfo');
                if (infoDiv) {
                    if (this.checked) {
                        infoDiv.innerHTML = '<i class="fa-solid fa-info-circle"></i> Task seçilmiş şirkət tərəfindən görünəcək';
                    } else {
                        infoDiv.innerHTML = '<i class="fa-solid fa-info-circle"></i> Task yalnız öz şirkətiniz tərəfindən görünəcək';
                    }
                }
            });
        }

        const progressSlider = document.getElementById('editProgress');
        const progressValue = document.getElementById('progressValue');
        if (progressSlider && progressValue) {
            progressSlider.addEventListener('input', function () {
                progressValue.textContent = this.value + '%';
            });
        }
    },

    // ==================== MANUAL SAAT ƏLAVƏ ET ====================
    addManualTime: async function () {
        const hoursEl = document.getElementById('addHours');
        const minutesEl = document.getElementById('addMinutes');
        const taskId = document.getElementById('editTaskId')?.value;

        if (!taskId) {
            alert('❌ Task ID tapılmadı!');
            return;
        }

        const hours = parseInt(hoursEl?.value || 0);
        const minutes = parseInt(minutesEl?.value || 0);

        if (hours === 0 && minutes === 0) {
            alert('⚠️ Zəhmət olmasa saat və/və ya dəqiqə daxil edin!');
            return;
        }

        const totalSecondsToAdd = (hours * 3600) + (minutes * 60);

        const addBtn = document.querySelector('.btn-add-time');
        const originalBtnText = addBtn?.innerHTML;
        if (addBtn) {
            addBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Əlavə edilir...';
            addBtn.disabled = true;
        }

        try {
            const response = await makeApiRequest(`/tasks/${taskId}/add-manual-time`, 'POST', {
                added_seconds: totalSecondsToAdd,
                reason: 'Manual vaxt əlavəsi'
            });

            if (response && !response.error) {
                this.currentTaskElapsedTime = response.new_total_seconds;
                const timerEl = document.getElementById('currentTimeDisplay');
                if (timerEl) {
                    timerEl.textContent = this.formatSeconds(this.currentTaskElapsedTime);
                }

                const editTotalSecondsInput = document.getElementById('editTotalSeconds');
                if (editTotalSecondsInput) {
                    editTotalSecondsInput.value = response.new_total_seconds;
                }

                hoursEl.value = 0;
                minutesEl.value = 0;

                this.hasManualTimeAdded = true;
                this.highlightNotesField(true);

                alert(`✅ ${response.added_hours} saat əlavə edildi!\n📊 Ümumi vaxt: ${response.new_actual_hours} saat\n\n📝 Xahiş olunur Qeydlər sahəsinə izahat yazın!`);

            } else {
                throw new Error(response?.detail || response?.error || 'Əlavə alınmadı');
            }

        } catch (error) {
            console.error('❌ Manual vaxt əlavə xətası:', error);
            alert('❌ Xəta: ' + error.message);
        } finally {
            if (addBtn) {
                addBtn.innerHTML = originalBtnText;
                addBtn.disabled = false;
            }
        }
    },

    highlightNotesField: function(highlight) {
        const notesTextarea = document.getElementById('editTaskNotes');
        const notesFormGroup = document.getElementById('notesFormGroup');
        const notesHelpText = document.getElementById('notesHelpText');
        const notesRequiredWarning = document.getElementById('notesRequiredWarning');

        if (highlight) {
            if (notesTextarea) {
                notesTextarea.style.border = '2px solid #dc2626';
                notesTextarea.style.backgroundColor = '#fef2f2';
                notesTextarea.placeholder = '⚠️ Mütləq qeyd yazın! Manual vaxt əlavə edildi.';
            }
            if (notesFormGroup) {
                notesFormGroup.classList.add('required-field');
            }
            if (notesHelpText) {
                notesHelpText.style.display = 'block';
                notesHelpText.style.color = '#dc2626';
                notesHelpText.style.fontWeight = 'bold';
                notesHelpText.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> ⚠️ Manual vaxt əlavə etdiyiniz üçün bu sahəyə qeyd yazmağınız MÜTLƏQDİR!';
            }
            if (notesRequiredWarning) {
                notesRequiredWarning.style.display = 'inline-block';
            }
        } else {
            if (notesTextarea) {
                notesTextarea.style.border = '';
                notesTextarea.style.backgroundColor = '';
                notesTextarea.placeholder = 'Qeydlər...';
            }
            if (notesFormGroup) {
                notesFormGroup.classList.remove('required-field');
            }
            if (notesHelpText) {
                notesHelpText.style.display = 'none';
            }
            if (notesRequiredWarning) {
                notesRequiredWarning.style.display = 'none';
            }
        }
    },

    validateNotesBeforeSave: function() {
        if (this.hasManualTimeAdded) {
            const notesTextarea = document.getElementById('editTaskNotes');
            const notesValue = notesTextarea?.value || '';

            if (!notesValue.trim()) {
                alert('⚠️ Manual vaxt əlavə etdiyiniz üçün Qeydlər sahəsini doldurmağınız MÜTLƏQDİR!\n\nZəhmət olmasa əlavə etdiyiniz vaxtla bağlı izahat yazın.');

                if (notesTextarea) {
                    notesTextarea.style.border = '3px solid #dc2626';
                    notesTextarea.style.backgroundColor = '#fee2e2';
                    notesTextarea.focus();
                    notesTextarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }

                const notesHelpText = document.getElementById('notesHelpText');
                if (notesHelpText) {
                    notesHelpText.style.display = 'block';
                    notesHelpText.style.color = '#dc2626';
                    notesHelpText.style.fontWeight = 'bold';
                    notesHelpText.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> ⚠️ Mütləq qeyd yazın! Manual vaxt əlavə edilib.';
                }

                const notesRequiredWarning = document.getElementById('notesRequiredWarning');
                if (notesRequiredWarning) {
                    notesRequiredWarning.style.display = 'inline-block';
                }

                return false;
            }
        }
        return true;
    },

    closeEditModal: function () {
        this.stopTimeTimer();
        this.hasManualTimeAdded = false;
        const modal = document.getElementById('taskEditModalOverlay');
        if (modal) modal.remove();
    },


    saveTaskEdit: async function() {
        console.log('🔍 saveTaskEdit ÇAĞIRILDI!');

        if (!this.validateNotesBeforeSave()) {
            return;
        }

        try {
            const taskId = document.getElementById('editTaskId')?.value;
            if (!taskId) { alert('Task ID tapılmadı!'); return; }

            const titleEl       = document.getElementById('editTaskTitle');
            const descEl        = document.getElementById('editTaskDescription');
            const notesEl       = document.getElementById('editTaskNotes');
            const companyEl     = document.getElementById('editCompany');
            const dueDateEl     = document.getElementById('editDueDate');
            const priorityEl    = document.getElementById('editPriority');
            const statusEl      = document.getElementById('editStatus');
            const progressEl    = document.getElementById('editProgress');
            const assignedToEl  = document.getElementById('editAssignedTo');
            const workTypeEl    = document.getElementById('editWorkType');

            // 🔥 Orijinal viewable_company_id-ni al (hidden input-dan)
            const originalViewableId = document.getElementById('editOriginalViewableCompanyId')?.value;

            if (!titleEl?.value) { alert('❌ Task başlığı boş ola bilməz!'); return; }

            const selectedStatus = statusEl?.value || '';
            const shouldChangeStatus = selectedStatus !== '' && selectedStatus !== 'defoult';

            // ========== COMPANY ID - TOKEN-DAN AL ==========
            let finalCompanyId   = null;
            let finalCompanyName = null;

            const token = localStorage.getItem('guven_token') || localStorage.getItem('access_token');
            if (token) {
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    if (payload.company_id) {
                        finalCompanyId   = payload.company_id;
                        finalCompanyName = payload.company_name || null;
                    }
                } catch(e) { console.warn('⚠️ Token parse xətası:', e); }
            }

            if (!finalCompanyId && window.taskManager?.userData) {
                finalCompanyId   = window.taskManager.userData.companyId || window.taskManager.userData.company_id;
                finalCompanyName = window.taskManager.userData.companyName || window.taskManager.userData.company_name;
            }

            if (!finalCompanyId) {
                const currentTaskCheck = await makeApiRequest(`/tasks/${taskId}`, 'GET');
                const taskCheck = currentTaskCheck.data || currentTaskCheck;
                if (taskCheck?.company_id) {
                    finalCompanyId   = taskCheck.company_id;
                    finalCompanyName = taskCheck.company_name;
                }
            }

            if (!finalCompanyId) {
                alert('❌ Şirkət məlumatları tapılmadı. Səhifəni yeniləyin.');
                return;
            }

            // ========== CARİ TASK MƏLUMATLARI ==========
            const taskResponse  = await makeApiRequest(`/tasks/${taskId}`, 'GET');
            const currentTask   = taskResponse.data || taskResponse;
            const oldStatus     = currentTask.status;
            const oldAssigneeId = currentTask.assigned_to;
            const oldWorkTypeId = currentTask.work_type_id;

            const originalTotalSeconds  = currentTask.total_elapsed_seconds || 0;
            const currentUITotalSeconds = this.currentTaskElapsedTime;

            // ============================================================
            // 🔥 ƏSAS DÜZƏLİŞ: viewable_company_id seçimi
            // ============================================================
            // İstifadəçi select-də dəyişiklik etdisə → yeni dəyər
            // Etmədisə → taskın orijinal viewable_company_id-si qalsın
            const userSelectedViewableId = companyEl?.value || '';

            let finalViewableCompanyId;
            let finalIsViewable;

            if (userSelectedViewableId && userSelectedViewableId !== '') {
                // İstifadəçi select-dən bir şirkət seçib
                finalViewableCompanyId = parseInt(userSelectedViewableId);
                finalIsViewable        = true;
                console.log('✅ İstifadəçi yeni viewable şirkət seçdi:', finalViewableCompanyId);
            } else if (originalViewableId && originalViewableId !== '' && originalViewableId !== 'null') {
                // İstifadəçi dəyişmədi, orijinal viewable_company_id-ni saxla
                finalViewableCompanyId = parseInt(originalViewableId);
                finalIsViewable        = currentTask.is_company_viewable !== false; // orijinal flag
                console.log('✅ Orijinal viewable şirkət saxlanıldı:', finalViewableCompanyId);
            } else {
                // Heç bir viewable şirkət yoxdur
                finalViewableCompanyId = null;
                finalIsViewable        = false;
                console.log('ℹ️ Viewable şirkət yoxdur');
            }

            // YENİ DƏYƏRLƏR
            const newAssigneeId = assignedToEl?.value ? parseInt(assignedToEl.value) : null;
            const newWorkTypeId = workTypeEl?.value  ? parseInt(workTypeEl.value)  : null;

            // Notes + vaxt dəyişikliyi
            let finalNotes = notesEl?.value || '';
            const timeDifference = currentUITotalSeconds - originalTotalSeconds;
            const userName = window.taskManager?.userData?.name
                          || window.taskManager?.userData?.ceo_name
                          || 'İstifadəçi';
            const userId = window.taskManager?.userData?.id;

            if (Math.abs(timeDifference) > 0) {
                const diffHours = (timeDifference / 3600).toFixed(2);
                const sign      = timeDifference > 0 ? '+' : '';
                const action    = timeDifference > 0 ? 'əlavə edildi' : 'çıxarıldı';
                const timeChangeNote = `\n[${new Date().toLocaleString('az-AZ')}] ${userName} tərəfindən vaxt dəyişdirildi: ${this.formatSeconds(originalTotalSeconds)} → ${this.formatSeconds(currentUITotalSeconds)} (${sign}${diffHours} saat ${action})`;
                finalNotes = finalNotes ? finalNotes + timeChangeNote : timeChangeNote;
            }

            if (newAssigneeId && newAssigneeId !== oldAssigneeId) {
                const newAssigneeName = this.getEmployeeNameById(newAssigneeId);
                const assigneeChangeNote = `\n[${new Date().toLocaleString('az-AZ')}] ${userName} tərəfindən təyin edilən işçi dəyişdirildi: ${oldAssigneeId ? (this.getEmployeeNameById(oldAssigneeId) || 'İşçi ID ' + oldAssigneeId) : 'Təyin edilməmiş'} → ${newAssigneeName || 'İşçi ID ' + newAssigneeId}`;
                finalNotes = finalNotes ? finalNotes + assigneeChangeNote : assigneeChangeNote;
            }

            if (newWorkTypeId && newWorkTypeId !== oldWorkTypeId) {
                const newWorkTypeName = this.getWorkTypeNameById(newWorkTypeId);
                const workTypeChangeNote = `\n[${new Date().toLocaleString('az-AZ')}] ${userName} tərəfindən iş növü dəyişdirildi: ${oldWorkTypeId ? (this.getWorkTypeNameById(oldWorkTypeId) || 'İş növü ID ' + oldWorkTypeId) : 'Seçilməmiş'} → ${newWorkTypeName || 'İş növü ID ' + newWorkTypeId}`;
                finalNotes = finalNotes ? finalNotes + workTypeChangeNote : workTypeChangeNote;
            }

            let priorityValue = priorityEl?.value || 'medium';
            if (priorityValue === 'critical') priorityValue = 'high';

            // ========== 1. ADDIM: YENİLƏ ==========
            const updateData = {
                task_title:             titleEl?.value || '',
                task_description:       descEl?.value  || '',
                notes:                  finalNotes,
                company_id:             finalCompanyId,
                viewable_company_id:    finalViewableCompanyId,   // 🔥 DÜZƏLDİLDİ
                is_company_viewable:    finalIsViewable,           // 🔥 DÜZƏLDİLDİ
                due_date:               dueDateEl?.value || null,
                priority:               priorityValue,
                progress_percentage:    parseInt(progressEl?.value) || 0,
                total_elapsed_seconds:  currentUITotalSeconds,
                actual_hours:           parseFloat((currentUITotalSeconds / 3600).toFixed(2))
            };

            if (newAssigneeId) updateData.assigned_to  = newAssigneeId;
            if (newWorkTypeId) updateData.work_type_id  = newWorkTypeId;

            if (currentUITotalSeconds > originalTotalSeconds) {
                const currentManualSeconds = currentTask.manual_added_seconds || 0;
                const newManualSeconds     = currentManualSeconds + (currentUITotalSeconds - originalTotalSeconds);
                updateData.manual_added_seconds       = newManualSeconds;
                updateData.manual_added_hours         = parseFloat((newManualSeconds / 3600).toFixed(2));
                updateData.last_manual_added_by       = userId;
                updateData.last_manual_added_by_name  = userName;
                updateData.last_manual_added_at       = new Date().toISOString();
            }

            console.log('📦 viewable_company_id:', finalViewableCompanyId);
            console.log('📦 is_company_viewable:', finalIsViewable);
            console.log('📦 Məlumatlar yenilənir:', updateData);

            const firstUpdateResponse = await makeApiRequest(`/tasks/${taskId}`, 'PATCH', updateData);
            if (firstUpdateResponse?.error) {
                throw new Error(firstUpdateResponse.detail || firstUpdateResponse.error || 'Task məlumatları yenilənə bilmədi');
            }
            console.log('✅ Task məlumatları yeniləndi');

            // ========== 2. ADDIM: STATUS ==========
            let finalStatus = null;

            if (shouldChangeStatus) {
                switch(selectedStatus) {
                    case 'cancelled': finalStatus = 'cancelled'; break;
                    case 'rejected':  finalStatus = 'rejected';  break;
                    case 'completed': finalStatus = 'completed'; break;
                    default:          finalStatus = null;
                }

                if (finalStatus) {
                    let statusNote = '';
                    if (finalStatus === 'rejected')  statusNote = `[${new Date().toLocaleString('az-AZ')}] ${userName} tərəfindən imtina edildi`;
                    if (finalStatus === 'cancelled') statusNote = `[${new Date().toLocaleString('az-AZ')}] ${userName} tərəfindən ləğv edildi`;

                    const statusUpdateData = {
                        status: finalStatus,
                        ...(finalStatus === 'completed' ? { completed_date: new Date().toISOString(), progress_percentage: 100 } : {}),
                        ...(statusNote ? { notes: finalNotes ? `${finalNotes}\n\n---\n${statusNote}` : statusNote } : {})
                    };

                    const statusUpdateResponse = await makeApiRequest(`/tasks/${taskId}`, 'PATCH', statusUpdateData);
                    if (!statusUpdateResponse?.error) {
                        console.log(`✅ Status: ${finalStatus}`);
                        if (oldStatus !== finalStatus) {
                            setTimeout(() => {
                                window.TelegramHelper?.notifyStatusChanged?.(currentTask, oldStatus, finalStatus, { name: userName, userId });
                            }, 100);
                        }
                    }
                }
            }



            // ========== 3. ADDIM: ARXİV (completed) ==========

            // 🔥 Arxiv üçün həqiqi göstərilən (target) şirkət adını tap
            let archiveCompanyName = finalCompanyName || currentTask.company_name || '';
            if (finalViewableCompanyId) {
                const viewableName = this._getCompanyNameById(finalViewableCompanyId)
                    || currentTask.target_company_name
                    || currentTask.viewable_company_name;
                if (viewableName) {
                    archiveCompanyName = viewableName;
                }
            }

            if (finalStatus === 'completed') {
                let freshTask = currentTask;
                try {
                    const fr = await makeApiRequest(`/tasks/${taskId}`, 'GET');
                    freshTask = fr.data || fr;
                } catch(e) {}

                const archiveData = {
                    original_task_id:         parseInt(taskId),
                    task_code:                currentTask.task_code || `TASK-${taskId}`,
                    task_title:               currentTask.task_title || titleEl?.value || '',
                    task_description:         currentTask.task_description || descEl?.value || '',
                    assigned_to:              newAssigneeId || currentTask.assigned_to || null,
                    assigned_by:              currentTask.assigned_by || currentTask.created_by || null,
                    company_id:               finalCompanyId,
                    company_name:             archiveCompanyName,
                    department_id:            currentTask.department_id || null,
                    priority:                 priorityValue,
                    status:                   'completed',
                    due_date:                 currentTask.due_date || dueDateEl?.value || null,
                    completed_date:           new Date().toISOString().split('T')[0],
                    estimated_hours:          parseFloat(currentTask.estimated_hours) || 0,
                    actual_hours:             parseFloat(freshTask.actual_hours) || parseFloat(currentUITotalSeconds / 3600) || 0,
                    work_type_id:             newWorkTypeId || currentTask.work_type_id || null,
                    progress_percentage:      100,
                    is_billable:              currentTask.is_billable === true,
                    billing_rate:             parseFloat(currentTask.billing_rate) || 0,
                    tags:                     currentTask.tags || null,
                    created_by:               currentTask.created_by ? parseInt(currentTask.created_by) : null,
                    creator_name:             currentTask.creator_name || userName,
                    started_date:             currentTask.started_date || null,
                    archive_reason:           'Tamamlandığı üçün arxivləndi',
                    total_elapsed_seconds:    parseInt(freshTask.total_elapsed_seconds) || parseInt(currentUITotalSeconds) || 0,
                    total_paused_seconds:     parseInt(freshTask.total_paused_seconds) || 0,
                    manual_added_seconds:     parseInt(freshTask.manual_added_seconds) || 0,
                    manual_added_hours:       parseFloat(freshTask.manual_added_hours) || 0,
                    manual_time_history:      freshTask.manual_time_history || '[]',
                    last_manual_added_by:     freshTask.last_manual_added_by || null,
                    last_manual_added_by_name:freshTask.last_manual_added_by_name || null,
                    last_manual_added_at:     freshTask.last_manual_added_at || null,
                    notes:                    finalNotes || ''
                };

                Object.keys(archiveData).forEach(key => {
                    if (archiveData[key] === null || archiveData[key] === undefined) delete archiveData[key];
                });

                if (archiveData.company_id) {
                    try {
                        await makeApiRequest('/task-archive/archive', 'POST', archiveData);
                        console.log('✅ Task arxivə köçürüldü');
                    } catch(e) {
                        console.error('❌ Arxiv xətası:', e);
                    }
                }
            }

            const finalHours = (currentUITotalSeconds / 3600).toFixed(2);
            const statusMsg  = finalStatus ? `\n📌 Yeni status: ${finalStatus}` : '\n📌 Status dəyişdirilmədi';
            alert(`✅ Task uğurla yeniləndi!\n🕐 İşlənmiş vaxt: ${finalHours} saat${statusMsg}`);

            this.closeEditModal();
            this.stopTimeTimer();
            this.hasManualTimeAdded = false;

            if (window.TaskCache) window.TaskCache.clear();
            if (window.taskManager) {
                await window.taskManager.loadActiveTasks(1, true);
                await window.taskManager.loadExternalTasks();
                if (window.taskManager.loadArchiveTasks) await window.taskManager.loadArchiveTasks();
            }

        } catch(error) {
            console.error('❌ saveTaskEdit xətası:', error);
            alert('❌ Xəta: ' + error.message);
        }
    },

    // ==================== KÖMƏKÇİ FUNKSİYALAR ====================
    getEmployeeNameById: function(employeeId) {
        if (!employeeId) return null;
        const employee = this.employeesCache.find(emp => String(emp.id || emp.user_id) === String(employeeId));
        if (employee) {
            return employee.name || employee.full_name || employee.username ||
                   (employee.first_name ? employee.first_name + (employee.last_name ? ' ' + employee.last_name : '') : null);
        }
        return null;
    },

    getWorkTypeNameById: function(workTypeId) {
        if (!workTypeId) return null;
        const workType = this.workTypesCache.find(wt => String(wt.id) === String(workTypeId));
        if (workType) {
            return workType.work_type_name || workType.name;
        }
        return null;
    },

    sendCompletionNotification: async function (taskId, taskTitle, completedBy) {
        try {
            const currentUser = window.taskManager?.userData;
            const userId = currentUser?.id || currentUser?.userId || 79;

            let creatorId = null;
            try {
                const taskResponse = await makeApiRequest(`/tasks/${taskId}`, 'GET', null, {silent: true});
                if (taskResponse && !taskResponse.error) {
                    const task = taskResponse.data || taskResponse;
                    creatorId = task.created_by || task.creator_id;
                }
            } catch (_) {
            }

            const targetUserId = creatorId || userId;

            const completionData = {
                user_id: parseInt(targetUserId),
                task_id: parseInt(taskId),
                task_title: taskTitle || `Task ${taskId}`,
                action: 'completed',
                completed_by: completedBy || currentUser?.name || currentUser?.ceo_name || 'İstifadəçi',
                completed_date: new Date().toISOString().split('T')[0],
                message_type: 'task_completed'
            };

            const response = await makeApiRequest('/telegram/send-notification', 'POST', completionData);
            return response && !response.error ? {success: true} : {success: false};

        } catch (error) {
            console.error('❌ Telegram tamamlanma bildiriş xətası:', error);
            return {success: false, error: error.message};
        }
    },

    sendTelegramNotification: async function (taskId, taskTitle, userId, action) {
        try {
            if (!userId) {
                const u = window.taskManager?.userData;
                userId = u?.id || u?.userId || 79;
            }

            let taskDescription = '', priority = 'medium', dueDate = null;
            try {
                const tr = await makeApiRequest(`/tasks/${taskId}`, 'GET', null, {silent: true});
                if (tr && !tr.error) {
                    const t = tr.data || tr;
                    taskDescription = t.task_description || '';
                    priority = t.priority || 'medium';
                    dueDate = t.due_date || null;
                }
            } catch (_) {
            }

            const notificationData = {
                task_id: parseInt(taskId),
                task_title: taskTitle || `Task ${taskId}`,
                user_id: parseInt(userId),
                action: action || 'updated',
                task_description: taskDescription,
                priority,
                due_date: dueDate
            };

            const response = await makeApiRequest('/telegram/send-notification', 'POST', notificationData);
            return response && !response.error ? {success: true} : {success: false};

        } catch (error) {
            console.error('❌ Telegram bildiriş xətası:', error);
            return {success: false, error: error.message};
        }
    },

    rejectTask: async function (taskId, taskType = 'active') {
        try {
            const reason = prompt('❌ İmtina səbəbini yazın:');
            if (!reason?.trim()) {
                alert('❌ İmtina səbəbi məcburidir!');
                return;
            }
            if (!confirm(`Bu işi imtina etmək istədiyinizə əminsiniz?\nSəbəb: ${reason}`)) return;

            const currentUser = window.taskManager?.userData;
            const taskResponse = await makeApiRequest(`/tasks/${taskId}`, 'GET');
            const task = taskResponse.data || taskResponse;

            const response = await makeApiRequest(`/tasks/${taskId}/reject-and-restore`, 'PUT', {reason});

            if (response && !response.error) {
                await this.sendTelegramNotification(taskId, task.task_title || task.title, currentUser?.id, 'rejected');
                alert('✅ Task imtina edildi və "Gözləyir" statusuna keçdi!');
                if (window.TaskCache) window.TaskCache.clearTasks();
                setTimeout(() => {
                    window.taskManager?.loadActiveTasks();
                    window.taskManager?.loadExternalTasks();
                }, 500);
            } else {
                throw new Error(response?.detail || response?.error || 'Task imtina edilə bilmədi');
            }
        } catch (error) {
            console.error('❌ rejectTask xətası:', error);
            alert('❌ Xəta: ' + error.message);
        }
    },

    cancelTask: async function (taskId, taskType = 'active') {
        try {
            const reason = prompt('🗑️ Ləğv etmə səbəbini yazın:');
            if (!reason?.trim()) {
                alert('❌ Ləğv etmə səbəbi məcburidir!');
                return;
            }
            if (!confirm(`Bu işi ləğv etmək istədiyinizə əminsiniz?\nSəbəb: ${reason}\n\n⚠️ Ləğv edilən task ARXİVƏ gedəcək!`)) return;

            const currentUser = window.taskManager?.userData;
            const userName = currentUser?.name || currentUser?.ceo_name || 'İstifadəçi';

            const taskResponse = await makeApiRequest(`/tasks/${taskId}`, 'GET');
            const task = taskResponse.data || taskResponse;
            const cancelNote = `[${new Date().toLocaleString('az-AZ')}] ${userName} tərəfindən ləğv edildi. Səbəb: ${reason}`;
            const existingNotes = task.notes || '';

            const response = await makeApiRequest(`/tasks/${taskId}`, 'PATCH', {
                status: 'cancelled',
                notes: existingNotes ? `${existingNotes}\n\n---\n${cancelNote}` : cancelNote,
                completed_date: new Date().toISOString(),
                progress_percentage: 0
            });

            if (response && !response.error) {
                await this.sendTelegramNotification(taskId, task.task_title || task.title, currentUser?.id, 'cancelled');
                alert('✅ Task ləğv edildi!');
                if (window.TaskCache) window.TaskCache.clearTasks();
                setTimeout(() => {
                    window.taskManager?.loadActiveTasks();
                    window.taskManager?.loadExternalTasks();
                    window.taskManager?.loadArchiveTasks();
                }, 500);
            } else {
                throw new Error(response?.detail || 'Task ləğv edilə bilmədi');
            }
        } catch (error) {
            console.error('❌ cancelTask xətası:', error);
            alert('❌ Xəta: ' + error.message);
        }
    },

    completeTask: async function (taskId, taskType = 'active') {
        try {
            const comment = prompt('✅ Tamamlanma comment-i əlavə edin (isteğe bağlı):', '');
            const currentUser = window.taskManager?.userData;
            const userName = currentUser?.name || currentUser?.ceo_name || 'İstifadəçi';

            let updatedNotes = '';
            if (comment) {
                const taskResponse = await makeApiRequest(`/tasks/${taskId}`, 'GET');
                const task = taskResponse.data || taskResponse;
                const completeNote = `[${new Date().toLocaleString('az-AZ')}] ${userName} tərəfindən tamamlandı. Qeyd: ${comment}`;
                updatedNotes = task.notes ? `${task.notes}\n\n---\n${completeNote}` : completeNote;
            }

            const response = await makeApiRequest(`/tasks/${taskId}`, 'PATCH', {
                status: 'completed',
                completed_date: new Date().toISOString(),
                progress_percentage: 100,
                ...(updatedNotes ? {notes: updatedNotes} : {})
            });

            if (response && !response.error) {
                await this.sendCompletionNotification(taskId, response.data?.task_title || `Task ${taskId}`, userName);
                alert('✅ Task tamamlandı!');
                if (window.TaskCache) window.TaskCache.clearTasks();
                setTimeout(() => {
                    window.taskManager?.loadActiveTasks();
                    window.taskManager?.loadExternalTasks();
                    window.taskManager?.loadArchiveTasks();
                }, 1000);
            } else {
                throw new Error(response?.detail || 'Task tamamlandı edilə bilmədi');
            }
        } catch (error) {
            console.error('❌ completeTask xətası:', error);
            alert('❌ Xəta: ' + error.message);
        }
    },

    formatDate: function (d) {
        if (!d) return '-';
        try {
            return new Date(d).toLocaleDateString('az-AZ');
        } catch (_) {
            return d;
        }
    },

    escapeHtml: function (text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    truncateText: function (text, length) {
        if (!text) return '';
        if (text.length <= length) return this.escapeHtml(text);
        return this.escapeHtml(text.substring(0, length)) + '...';
    },

    calculateSalary: function (hourlyRate, durationMinutes) {
        if (!hourlyRate || !durationMinutes) return '0.00';
        return ((durationMinutes / 60) * parseFloat(hourlyRate)).toFixed(2);
    }
};

// ==================== CSS ƏLAVƏLƏR (Sticky düymələr üçün) ====================
const taskEditStyles = document.createElement('style');
taskEditStyles.textContent = `
    /* Modal overlay */
    .task-edit-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        backdrop-filter: blur(4px);
    }
    
    /* Modal əsas konteyner */
    .task-edit-modal {
        background: white;
        border-radius: 16px;
        width: 90%;
        max-width: 800px;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-sizing: border-box;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        animation: modalSlideIn 0.3s ease;
    }

    .task-edit-modal,
    .task-edit-modal * {
        box-sizing: border-box;
    }
    
    @keyframes modalSlideIn {
        from {
            opacity: 0;
            transform: translateY(-30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    /* Modal header - sabit */
    .modal-header {
        padding: 20px 24px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-shrink: 0;
    }
    
    .modal-header h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
    }
    
    .modal-header .close-btn {
        background: none;
        border: none;
        color: white;
        font-size: 28px;
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        transition: background 0.2s;
    }
    
    .modal-header .close-btn:hover {
        background: rgba(255,255,255,0.2);
    }
    
    /* 🔥 SCROLLABLE BODY - əsas içindəkiler burada scroll olacaq */
    .task-edit-modal .modal-body-scrollable {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 24px;
        max-height: calc(90vh - 130px);
        width: 100%;
        max-width: 100%;
        min-width: 0;
    }
    
    /* Scrollbar stilləri */
    .modal-body-scrollable::-webkit-scrollbar {
        width: 8px;
    }
    
    .modal-body-scrollable::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 10px;
    }
    
    .modal-body-scrollable::-webkit-scrollbar-thumb {
        background: #c1c1c1;
        border-radius: 10px;
    }
    
    .modal-body-scrollable::-webkit-scrollbar-thumb:hover {
        background: #a8a8a8;
    }
    
    /* 🔥 STICKY FOOTER - düymələr həmişə görünəcək */
    .task-edit-modal .modal-footer-sticky {
        padding: 16px 24px;
        background: white;
        border-top: 1px solid #e9ecef;
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        flex-wrap: wrap;
        flex-shrink: 0;
        position: sticky;
        bottom: 0;
        z-index: 10;
        width: 100%;
        max-width: 100%;
        min-width: 0;
        overflow-x: hidden;
    }
    
    /* Düymə stilləri */
    .modal-footer-sticky .btn {
        padding: 10px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        border: none;
    }
    
    .modal-footer-sticky .btn-primary {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
    }
    
    .modal-footer-sticky .btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(102,126,234,0.4);
    }
    
    .modal-footer-sticky .btn-secondary {
        background: #6c757d;
        color: white;
    }
    
    .modal-footer-sticky .btn-secondary:hover {
        background: #5a6268;
        transform: translateY(-2px);
    }
    
    /* Daxili task redaktə modalının əsas form axını */
    .task-edit-modal #taskEditForm > .form-grid {
        display: flex;
        flex-direction: column;
        gap: 28px;
        width: 100%;
        max-width: 100%;
        min-width: 0;
        margin-bottom: 20px;
        align-items: stretch;
        overflow-x: hidden;
    }

    /* Yuxarı redaktə kartları */
    .task-edit-modal .task-edit-top-fields {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 18px;
        width: 100%;
        max-width: 100%;
        min-width: 0;
        margin-top: 28px;
        margin-bottom: 0;
        align-items: stretch;
        position: relative;
        z-index: 1;
        overflow-x: hidden;
    }

    .task-edit-modal .task-edit-top-fields .task-edit-card {
        min-height: 140px;
        min-width: 0;
        max-width: 100%;
        margin-bottom: 0;
        position: relative;
        z-index: 1;
        transform: none;
    }

    .task-edit-modal .task-edit-title-row {
        width: 100%;
        max-width: 100%;
        min-width: 0;
        margin-bottom: 0;
        position: relative;
        z-index: 1;
        transform: none;
    }

    .task-edit-modal .task-edit-title-row input,
    .task-edit-modal .form-control,
    .task-edit-modal textarea,
    .task-edit-modal select,
    .task-edit-modal input {
        width: 100%;
        max-width: 100%;
        min-width: 0;
    }

    .task-edit-modal .form-row,
    .task-edit-modal .form-group,
    .task-edit-modal .task-info-header,
    .task-edit-modal .task-details-section,
    .task-edit-modal .manual-time-section,
    .task-edit-modal .timer-section,
    .task-edit-modal .viewable-company-section,
    .task-edit-modal .progress-container,
    .task-edit-modal .manual-time-input,
    .task-edit-modal .time-inputs,
    .task-edit-modal .time-input-group {
        max-width: 100%;
        min-width: 0;
    }

    /* İki sütunlu layout */
    .form-row.two-columns {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        margin-bottom: 15px;
    }
    
    @media (max-width: 1200px) {
        .task-edit-modal .task-edit-top-fields {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }
    }

    @media (max-width: 768px) {
        .task-edit-modal .task-edit-top-fields,
        .form-row.two-columns {
            grid-template-columns: 1fr;
            gap: 16px;
        }
    }
    
    /* Form qrupları */
    .form-group {
        margin-bottom: 20px;
    }
    
    .form-group label {
        display: block;
        margin-bottom: 8px;
        font-weight: 500;
        color: #2c3e50;
    }
    
    .form-control {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid #ddd;
        border-radius: 8px;
        font-size: 14px;
        transition: all 0.2s;
    }
    
    .form-control:focus {
        outline: none;
        border-color: #667eea;
        box-shadow: 0 0 0 2px rgba(102,126,234,0.2);
    }
    
    /* Task info header */
    .task-info-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 1px solid #e9ecef;
    }
    
    .task-type-badge {
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 500;
    }
    
    .task-type-badge.active {
        background: #e3f2fd;
        color: #1976d2;
    }
    
    .task-type-badge.external {
        background: #f3e5f5;
        color: #7b1fa2;
    }
    
    .task-id {
        color: #6c757d;
        font-size: 12px;
    }
    
    /* Progress container */
    .task-edit-modal .progress-container {
        display: flex;
        align-items: center;
        gap: 12px;
        overflow-x: hidden;
    }
    
    .task-edit-modal .form-control-range {
        flex: 1 1 auto;
        min-width: 0;
    }
    
    .progress-value {
        min-width: 45px;
        font-weight: 500;
        color: #667eea;
    }
    
    /* Manual time input */
    .task-edit-modal .manual-time-input {
        display: flex;
        gap: 15px;
        align-items: flex-end;
        margin-top: 10px;
        flex-wrap: wrap;
    }
    
    .task-edit-modal .time-inputs {
        display: flex;
        gap: 10px;
        flex: 1 1 260px;
    }
    
    .time-input-group {
        flex: 1;
    }
    
    .time-input-group label {
        font-size: 12px;
        margin-bottom: 4px;
    }
    
    .btn-add-time {
        background: #28a745;
        color: white;
        border: none;
        padding: 10px 16px;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
    }
    
    .btn-add-time:hover {
        background: #218838;
        transform: translateY(-1px);
    }
    
    /* Task details */
    .task-details-section {
        background: #f8f9fa;
        padding: 15px;
        border-radius: 8px;
        margin-top: 20px;
    }
    
    .detail-item {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
    }
    
    .detail-label {
        font-weight: 500;
        color: #6c757d;
    }
    
    .detail-value {
        color: #2c3e50;
    }
    
    /* Timer display */
    .timer-display {
        background: #f8f9fa;
        padding: 12px;
        border-radius: 8px;
        text-align: center;
        margin-bottom: 10px;
    }
    
    .timer-value {
        font-size: 24px;
        font-weight: bold;
        color: #667eea;
    }
    
    /* Required field warning */
    .required-field textarea {
        border-color: #dc2626 !important;
    }

    /* Compact professional layout for Task Redaktəsi modal */
    .task-edit-modal {
        width: min(94vw, 1080px);
        max-width: 1080px;
        border-radius: 24px;
    }

    .task-edit-modal .modal-header {
        padding: 18px 28px;
    }

    .task-edit-modal .modal-body-scrollable {
        padding: 22px 30px 28px;
        gap: 0;
        overflow-x: hidden;
        scrollbar-gutter: stable;
    }

    .task-edit-modal #taskEditForm > .form-grid {
        gap: 18px;
        margin-bottom: 0;
    }

    .task-edit-modal .task-info-header {
        margin-bottom: 18px;
        padding-bottom: 12px;
    }

    .task-edit-modal .task-edit-top-fields {
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 16px;
        margin-top: 0;
        margin-bottom: 2px;
    }

    .task-edit-modal .task-edit-top-fields .task-edit-card,
    .task-edit-modal .task-edit-title-row,
    .task-edit-modal #taskEditForm > .form-grid > .form-group:not(.manual-time-section),
    .task-edit-modal .form-row.two-columns > .form-group {
        padding: 18px 20px;
        border: 1px solid rgba(226, 232, 240, 0.9);
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.92);
        box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
    }

    .task-edit-modal .task-edit-top-fields .task-edit-card {
        min-height: 112px;
    }

    .task-edit-modal .form-row.two-columns {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 18px;
        margin-bottom: 0;
    }

    .task-edit-modal .form-group {
        margin-bottom: 0;
    }

    .task-edit-modal .form-group label,
    .task-edit-modal .time-input-group label {
        margin-bottom: 7px;
        font-size: 13px;
        font-weight: 700;
        color: #334155;
    }

    .task-edit-modal .form-control,
    .task-edit-modal select,
    .task-edit-modal input {
        min-height: 46px;
        padding: 10px 13px;
        border-radius: 14px;
        font-size: 14px;
    }

    .task-edit-modal .task-edit-title-row input {
        min-height: 50px;
        font-size: 15px;
    }

    .task-edit-modal textarea.form-control,
    .task-edit-modal textarea {
        min-height: 118px;
        max-height: 168px;
        resize: vertical;
    }

    .task-edit-modal .progress-container {
        gap: 10px;
        min-height: 46px;
    }

    .task-edit-modal .progress-value {
        min-width: 42px;
        font-size: 13px;
    }

    .task-edit-modal .manual-time-section {
        padding: 16px 18px;
        margin-top: 0;
        margin-bottom: 0;
        border-radius: 20px;
        border: 1px solid rgba(251, 146, 60, 0.22);
        background: linear-gradient(135deg, rgba(255, 247, 237, 0.96) 0%, rgba(255, 255, 255, 0.94) 58%, rgba(238, 242, 255, 0.78) 100%);
        box-shadow: 0 12px 30px rgba(249, 115, 22, 0.08);
    }

    .task-edit-modal .manual-time-section > label {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
        font-size: 16px;
        color: #9a3412;
    }

    .task-edit-modal .manual-time-section .timer-section {
        padding: 12px 14px;
        margin-bottom: 12px;
        border: 1px solid rgba(251, 146, 60, 0.18);
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.78);
    }

    .task-edit-modal .manual-time-section .timer-section > label {
        margin-bottom: 8px;
        font-size: 13px;
    }

    .task-edit-modal .timer-display {
        padding: 10px 12px;
        margin-bottom: 6px;
        border-radius: 14px;
        background: rgba(248, 250, 252, 0.96);
    }

    .task-edit-modal .timer-item {
        min-height: 0;
        padding: 0;
    }

    .task-edit-modal .timer-value,
    .task-edit-modal #currentTimeDisplay {
        font-size: 17px !important;
        line-height: 1.25;
    }

    .task-edit-modal .manual-time-input {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 14px;
        align-items: end;
        margin-top: 8px;
    }

    .task-edit-modal .time-inputs {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
        flex: none;
    }

    .task-edit-modal .manual-time-section input {
        min-height: 44px;
        height: 44px;
        font-size: 14px;
    }

    .task-edit-modal .btn-add-time {
        min-height: 44px;
        padding: 0 18px;
        border-radius: 14px;
        white-space: nowrap;
    }

    .task-edit-modal .manual-time-section small,
    .task-edit-modal .form-row.two-columns small,
    .task-edit-modal #notesHelpText {
        margin-top: 6px !important;
        font-size: 11px !important;
        line-height: 1.35;
    }

    .task-edit-modal .modal-footer-sticky {
        padding: 16px 30px;
        justify-content: flex-end;
        gap: 14px;
        border-radius: 0 0 24px 24px;
        flex-wrap: nowrap;
        background: rgba(255, 255, 255, 0.96);
        backdrop-filter: blur(10px);
    }

    .task-edit-modal .modal-footer-sticky .btn {
        min-width: 158px;
        min-height: 50px;
        border-radius: 16px;
        padding: 0 22px;
        font-weight: 700;
    }

    @media (max-width: 1200px) {
        .task-edit-modal .task-edit-top-fields {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }
    }

    @media (max-width: 768px) {
        .task-edit-modal {
            width: 96vw;
            border-radius: 20px;
        }

        .task-edit-modal .modal-body-scrollable {
            padding: 18px 16px 24px;
        }

        .task-edit-modal .task-edit-top-fields,
        .task-edit-modal .form-row.two-columns,
        .task-edit-modal .manual-time-input,
        .task-edit-modal .time-inputs {
            grid-template-columns: 1fr;
        }

        .task-edit-modal .modal-footer-sticky {
            padding: 14px 16px;
            flex-direction: column-reverse;
        }

        .task-edit-modal .modal-footer-sticky .btn {
            width: 100%;
        }
    }


    /* Internal Task Redaktəsi: align with Yeni Tapşırıq → Daxili Tapşırıq glass modal */
    .task-edit-modal-overlay:has(.task-edit-internal-glass) {
        padding: 20px 24px;
        background: rgba(15, 23, 42, 0.38);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        overflow: hidden;
    }

    .task-edit-modal.task-edit-internal-glass {
        width: min(1120px, calc(100vw - 48px));
        max-width: 1120px;
        max-height: calc(100vh - 40px);
        border-radius: clamp(28px, 3.6vw, 44px);
        background: linear-gradient(145deg, rgba(248, 251, 255, .96), rgba(231, 238, 248, .88));
        border: 1px solid rgba(255, 255, 255, .78);
        box-shadow: 0 32px 90px rgba(15, 23, 42, .28), inset 0 1px 0 rgba(255,255,255,.85);
        backdrop-filter: blur(22px);
        -webkit-backdrop-filter: blur(22px);
        overflow: hidden;
    }

    .task-edit-modal.task-edit-internal-glass .modal-header {
        margin: 14px 14px 0;
        padding: clamp(16px, 2.4vw, 24px) clamp(22px, 4vw, 42px);
        border-radius: clamp(22px, 3vw, 34px);
        color: #0f172a;
        background: rgba(255,255,255,.62);
        border: 1px solid rgba(226, 234, 246, .92);
        box-shadow: 0 14px 34px rgba(29, 54, 93, .08), inset 0 1px 0 rgba(255,255,255,.82);
    }

    .task-edit-modal.task-edit-internal-glass .modal-header h3 {
        display: flex;
        align-items: center;
        gap: 12px;
        color: #0f172a;
        font-size: clamp(1.35rem, 2vw, 1.72rem);
        font-weight: 800;
        letter-spacing: -.03em;
    }

    .task-edit-modal.task-edit-internal-glass .task-edit-title-icon {
        width: 48px;
        height: 48px;
        display: inline-grid;
        place-items: center;
        border-radius: 18px;
        color: #2563eb;
        background: rgba(255,255,255,.72);
        border: 1px solid rgba(226, 234, 246, .92);
        box-shadow: inset 0 1px 0 rgba(255,255,255,.9), 0 8px 18px rgba(35, 62, 104, .06);
    }

    .task-edit-modal.task-edit-internal-glass .modal-header .close-btn {
        width: 42px;
        height: 42px;
        border-radius: 999px;
        background: #111827;
        color: #fff;
        border: 1px solid rgba(17, 24, 39, .18);
        font-size: 16px;
        box-shadow: 0 14px 28px rgba(15, 23, 42, .22);
    }

    .task-edit-modal.task-edit-internal-glass .modal-header .close-btn:hover {
        background: #ef4444;
        transform: scale(1.06);
    }

    .task-edit-modal.task-edit-internal-glass .modal-body-scrollable {
        padding: 22px clamp(22px, 4vw, 42px) 18px;
        max-height: calc(100vh - 190px);
        overflow-y: auto;
        overflow-x: hidden;
    }

    .task-edit-modal.task-edit-internal-glass #taskEditForm > .form-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px 18px;
    }

    .task-edit-modal.task-edit-internal-glass .task-info-header,
    .task-edit-modal.task-edit-internal-glass .task-edit-top-fields,
    .task-edit-modal.task-edit-internal-glass .task-edit-title-row,
    .task-edit-modal.task-edit-internal-glass #taskEditForm > .form-grid > .form-group,
    .task-edit-modal.task-edit-internal-glass .form-row.two-columns,
    .task-edit-modal.task-edit-internal-glass .manual-time-section,
    .task-edit-modal.task-edit-internal-glass .task-details-section {
        grid-column: 1 / -1;
    }

    .task-edit-modal.task-edit-internal-glass .task-edit-top-fields,
    .task-edit-modal.task-edit-internal-glass .form-row.two-columns {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px 18px;
        margin: 0;
    }

    .task-edit-modal.task-edit-internal-glass .task-edit-top-fields .task-edit-card,
    .task-edit-modal.task-edit-internal-glass .task-edit-title-row,
    .task-edit-modal.task-edit-internal-glass #taskEditForm > .form-grid > .form-group:not(.manual-time-section),
    .task-edit-modal.task-edit-internal-glass .form-row.two-columns > .form-group,
    .task-edit-modal.task-edit-internal-glass .manual-time-section {
        padding: 16px;
        border-radius: 24px;
        background: rgba(255,255,255,.56);
        border: 1px solid rgba(226, 234, 246, .92);
        box-shadow: 0 12px 30px rgba(29, 54, 93, .07), inset 0 1px 0 rgba(255,255,255,.82);
    }

    .task-edit-modal.task-edit-internal-glass .form-group label,
    .task-edit-modal.task-edit-internal-glass .time-input-group label {
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: auto;
        margin-bottom: 8px;
        color: #23395d;
        font-size: 14px;
        font-weight: 800;
    }

    .task-edit-modal.task-edit-internal-glass .form-group label i { width: 18px; color: #4169e1; }

    .task-edit-modal.task-edit-internal-glass .form-control,
    .task-edit-modal.task-edit-internal-glass select,
    .task-edit-modal.task-edit-internal-glass input {
        min-height: 50px;
        border-radius: 16px !important;
        border: 1px solid rgba(204, 216, 234, .95) !important;
        background: rgba(255,255,255,.96) !important;
        box-shadow: inset 0 1px 0 rgba(255,255,255,.95), 0 8px 18px rgba(35, 62, 104, .06) !important;
    }

    .task-edit-modal.task-edit-internal-glass textarea.form-control {
        min-height: 96px;
        max-height: 140px;
        resize: vertical;
    }

    .task-edit-modal.task-edit-internal-glass .manual-time-section {
        display: grid;
        grid-template-columns: 1fr 1.4fr;
        gap: 12px 16px;
        background: rgba(255,255,255,.58);
    }

    .task-edit-modal.task-edit-internal-glass .manual-time-section > label,
    .task-edit-modal.task-edit-internal-glass .manual-time-section > small { grid-column: 1 / -1; }
    .task-edit-modal.task-edit-internal-glass .manual-time-section .timer-section { padding: 12px; margin: 0; border-radius: 18px; background: rgba(255,255,255,.7); }
    .task-edit-modal.task-edit-internal-glass .timer-display { padding: 8px 10px; margin: 0; background: rgba(248,250,252,.82); }
    .task-edit-modal.task-edit-internal-glass .manual-time-input { margin: 0; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 12px; align-items: end; }
    .task-edit-modal.task-edit-internal-glass .time-inputs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }

    .task-edit-modal.task-edit-internal-glass .modal-footer-sticky {
        margin: 0 14px 14px;
        padding: 16px clamp(22px, 4vw, 42px);
        border-radius: 24px;
        background: rgba(255,255,255,.68);
        border: 1px solid rgba(226,234,246,.92);
        box-shadow: 0 12px 30px rgba(29, 54, 93, .07), inset 0 1px 0 rgba(255,255,255,.82);
    }

    .task-edit-modal.task-edit-internal-glass .modal-footer-sticky .btn {
        border-radius: 16px;
        min-height: 50px;
        min-width: 150px;
        box-shadow: 0 10px 22px rgba(35, 62, 104, .10);
    }

    @media (max-width: 768px) {
        .task-edit-modal.task-edit-internal-glass #taskEditForm > .form-grid,
        .task-edit-modal.task-edit-internal-glass .task-edit-top-fields,
        .task-edit-modal.task-edit-internal-glass .form-row.two-columns,
        .task-edit-modal.task-edit-internal-glass .manual-time-section,
        .task-edit-modal.task-edit-internal-glass .manual-time-input,
        .task-edit-modal.task-edit-internal-glass .time-inputs {
            grid-template-columns: 1fr;
        }
    }

`;

document.head.appendChild(taskEditStyles);

// TableManager interfeysi
if (typeof TableManager !== 'undefined') {
    const origStart = TableManager.startTask;
    const origComplete = TableManager.completeTask;

    TableManager.startTaskWithNotification = async function (taskId, taskTitle) {
        try {
            if (origStart) await origStart.call(this, taskId);
            else await this.apiRequest(`/tasks/${taskId}/status`, 'PUT', {status: 'in_progress'});
            const u = window.taskManager?.userData;
            await TaskEditModule.sendTelegramNotification(taskId, taskTitle, u?.id, 'started');
            window.notificationService?.showSuccess?.(`"${taskTitle}" tapşırığına başlanıldı`);
        } catch (e) {
            if (origStart) await origStart.call(this, taskId);
        }
    };

    TableManager.completeTaskWithNotification = async function (taskId, taskTitle) {
        try {
            if (origComplete) await origComplete.call(this, taskId);
            else await this.apiRequest(`/tasks/${taskId}/status`, 'PUT', {status: 'completed'});
            const u = window.taskManager?.userData;
            await TaskEditModule.sendCompletionNotification(taskId, taskTitle, u?.name || u?.ceo_name || 'İstifadəçi');
            window.notificationService?.showSuccess?.(`"${taskTitle}" tapşırığı tamamlandı`);
            window.SoundManager?.playTaskCompleted?.();
            if (window.TaskCache) window.TaskCache.clearTasks();
            setTimeout(() => {
                window.taskManager?.loadActiveTasks();
                window.taskManager?.loadArchiveTasks?.();
            }, 500);
        } catch (e) {
            if (origComplete) await origComplete.call(this, taskId);
        }
    };
}

window.TaskEditModule = TaskEditModule;
console.log('✅ TaskEditModule yükləndi (İŞÇİ ADLARI + STICKY DÜYMƏLƏR versiyası)');