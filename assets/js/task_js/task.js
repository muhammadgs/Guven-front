// task.js - User-specific TaskCache
const TaskCache = {
    prefix: 'tc_',
    ttl: 5 * 60 * 1000,

    // ✅ YENİ: Cari user ID-ni al
    getCurrentUserId() {
        try {
            // Token-dan user_id al
            const token = getAuthToken();
            if (token) {
                const payload = parseTokenPayload(token);
                if (payload && payload.user_id) {
                    return payload.user_id;
                }
            }

            // TaskManager-dan al
            if (window.taskManager?.userData?.userId) {
                return window.taskManager.userData.userId;
            }

            // LocalStorage-dan al
            const stored = localStorage.getItem('guven_user_data');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.user_id) return parsed.user_id;
            }

            return 'anonymous';
        } catch (e) {
            return 'anonymous';
        }
    },

    // ✅ DƏYİŞDİ: User-specific açar yarat
    getUserKey(key) {
        const userId = this.getCurrentUserId();
        return `${this.prefix}${userId}_${key}`;
    },

    set(key, data) {
        try {
            // DATA-NIN ARRAY OLDUĞUNDAN ƏMİN OL
            let dataToStore = data;

            if (key === 'active_tasks' && !Array.isArray(data)) {
                console.warn('⚠️ set: active_tasks array deyil, çevrilir');
                if (data?.data && Array.isArray(data.data)) {
                    dataToStore = data.data;
                } else if (data?.items && Array.isArray(data.items)) {
                    dataToStore = data.items;
                } else {
                    dataToStore = [];
                }
            }

            const cacheKey = this.getUserKey(key);
            sessionStorage.setItem(cacheKey, JSON.stringify({
                data: dataToStore,
                ts: Date.now(),
                userId: this.getCurrentUserId()  // ✅ Kimin cache-i olduğunu qeyd et
            }));

            console.log(`💾 Cache yazıldı: ${cacheKey}, user: ${this.getCurrentUserId()}`);
        } catch (e) {
            console.error('❌ Cache set xətası:', e);
        }
    },

    get(key) {
        try {
            const cacheKey = this.getUserKey(key);
            const raw = sessionStorage.getItem(cacheKey);

            if (!raw) {
                console.log(`📭 Cache boş: ${cacheKey}`);
                return null;
            }

            const {data, ts, userId} = JSON.parse(raw);

            // ✅ Yoxlama: Bu cache cari user-ə aiddirmi?
            const currentUserId = this.getCurrentUserId();
            if (userId && userId !== currentUserId) {
                console.warn(`⚠️ Cache başqa user-ə aid: stored=${userId}, current=${currentUserId}, silinir`);
                sessionStorage.removeItem(cacheKey);
                return null;
            }

            // TTL yoxlaması
            if (Date.now() - ts > this.ttl) {
                console.log(`⏰ Cache vaxtı bitib: ${cacheKey}`);
                sessionStorage.removeItem(cacheKey);
                return null;
            }

            console.log(`📖 Cache oxundu: ${cacheKey}, user: ${userId}, yaş: ${((Date.now() - ts)/1000).toFixed(0)}s`);
            return data;
        } catch (e) {
            console.error('❌ Cache get xətası:', e);
            return null;
        }
    },

    clear() {
        const currentUserId = this.getCurrentUserId();
        const prefix = `${this.prefix}${currentUserId}_`;

        Object.keys(sessionStorage)
            .filter(k => k.startsWith(prefix))
            .forEach(k => {
                sessionStorage.removeItem(k);
                console.log(`🗑️ Cache silindi: ${k}`);
            });

        console.log(`✅ Bütün cache-lər təmizləndi (user: ${currentUserId})`);
    },

    // ✅ YENİ: Bütün user-lərin cache-lərini təmizlə (logout zamanı)
    clearAllUsersCache() {
        Object.keys(sessionStorage)
            .filter(k => k.startsWith(this.prefix))
            .forEach(k => {
                sessionStorage.removeItem(k);
                console.log(`🗑️ Bütün user cache-i silindi: ${k}`);
            });
    }
};

// ============================================================
class TaskManager {
    constructor() {
        console.log('🚀 Task Manager başladılır...');

        this.userData = {userId: null, companyId: null, companyCode: null, role: null, name: null};
        this.myCompany = null;
        this.subsidiaryCompanies = [];
        this.departments = [];
        this.employees = [];
        this.companyCache = {};

        this.pagination = {
            active: {page: 1, hasMore: true, pageSize: 20, total: 0, totalPages: 1},
            archive: {page: 1, hasMore: true, pageSize: 20, total: 0, totalPages: 1},
            external: {page: 1, hasMore: true, pageSize: 20, total: 0, totalPages: 1},
            partner: {page: 1, hasMore: true, pageSize: 20, total: 0, totalPages: 1}
        };

        this.currentFilters = {};
        this.currentFilterTable = 'active';

        // Modal bağlama
        this.resetFormAndCloseModal = () => {
            try {
                document.getElementById('taskForm')?.reset();
                const modalEl = document.getElementById('taskModal');
                if (modalEl) {
                    const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
                    modal.hide();
                    document.body.classList.remove('modal-open');
                    document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
                }
                window.fileUploadManager?.clearFiles?.();
                window.audioRecorder?.reset?.();
                document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
                document.querySelectorAll('.invalid-feedback').forEach(el => el.remove());
            } catch (e) {
                document.getElementById('taskForm')?.reset();
                const m = document.getElementById('taskModal');
                if (m) {
                    m.style.display = 'none';
                    m.classList.remove('show');
                }
            }
        };
    }

    // ==================== INITIALIZE ====================
    async initialize() {
        try {
            console.log('🔧 Task Manager initialize...');
            await this.loadUserData();

            TableManager?.initialize?.();
            FormManager?.initializeForms?.();
            ModalManager?.initModals?.();

            this.setupEventListeners();
            this.setupVisibilityControls();
            this.initializeModules();
            this.setupAutoArchiveCheck();
            this.ensureParentCompanySelect();

            await this.loadInitialData();

            console.log('✅ Task Manager hazırdır');
            window.dispatchEvent(new CustomEvent('taskManagerReady', {detail: {ready: true}}));

        } catch (error) {
            console.error('❌ Initialize xətası:', error);
            window.dispatchEvent(new CustomEvent('taskManagerReady', {detail: {ready: false, error: error.message}}));
        }
    }

    initializeModules() {
        if (window.TaskEditModule?.initialize) {
            try {
                window.TaskEditModule.initialize();
            } catch (e) {
                console.warn('⚠️ TaskEditModule init xətası:', e);
            }
        }
        if (window.TableManager?.initialize) {
            try {
                window.TableManager.initialize();
            } catch (e) {
            }
        }
        if (window.FormManager?.initializeForms) {
            try {
                window.FormManager.initializeForms();
            } catch (e) {
            }
        }
        if (window.ModalManager?.initModals) {
            try {
                window.ModalManager.initModals();
            } catch (e) {
            }
        }
    }

    ensureParentCompanySelect() {
        if (document.getElementById('parentCompanySelect')) return;
        const form = document.getElementById('taskForm');
        if (!form) return;
        const partniyorGroup = document.querySelector('.form-group:has(#partniyorSelect)');
        if (!partniyorGroup) return;
        const parentGroup = document.createElement('div');
        parentGroup.className = 'form-group';
        parentGroup.id = 'parentCompanyGroup';
        parentGroup.style.display = 'none';
        parentGroup.innerHTML = `
            <label for="parentCompanySelect" class="form-label"><i class="fas fa-arrow-up text-primary"></i> Üst Şirkət</label>
            <div class="select-wrapper">
                <select id="parentCompanySelect" name="parent_company_id" class="form-select">
                    <option value="">Üst şirkət seçin</option>
                </select>
                <i class="fas fa-chevron-down select-icon"></i>
            </div>`;
        partniyorGroup.parentNode.insertBefore(parentGroup, partniyorGroup.nextSibling);
    }

    // task.js - loadUserData metodunda
    async loadUserData() {
        try {
            const token = getAuthToken();
            if (token) {
                const payload = parseTokenPayload(token);
                if (payload) {
                    this.userData = {
                        userId: payload.user_id || payload.sub,
                        companyId: payload.company_id,
                        companyCode: payload.company_code,
                        role: payload.role,
                        name: payload.ceo_name || payload.name,
                        ceoName: payload.ceo_name || '',
                        ceoLastName: payload.ceo_lastname || '',
                        email: payload.ceo_email || payload.email,
                        companyName: payload.company_name
                    };

                    // ✅ YENİ: dbManager-ə current user məlumatlarını ötür
                    if (window.dbManager && window.dbManager.setCurrentUser) {
                        window.dbManager.setCurrentUser(this.userData.companyId, this.userData.userId);
                    }

                    console.log('✅ UserData token-dən:', this.userData);
                    return;
                }
            }
        } catch (error) {
            console.error('❌ User data xətası:', error);
        }
    }

    // ==================== INITIAL DATA (CACHE İLƏ) ====================
    async loadInitialData() {
        try {
            this.showLoading('Məlumatlar yüklənir...');

            // ✅ BÜTÜN MƏLUMATLAR CACHE İLƏ YÜKLƏNIR - yalnız bir dəfə API sorğusu
            const [subCompanies, departments, employees] = await Promise.all([
                getSubCompaniesWithCache(this.userData.companyCode),
                getDepartmentsWithCache(this.userData.companyCode),
                getEmployeesWithCache(this.userData.companyCode)
            ]);

            // Şirkət məlumatı
            this.myCompany = {
                id: this.userData.companyId,
                company_name: this.userData.companyName,
                company_code: this.userData.companyCode
            };

            // Alt şirkətlər
            const rawSubs = Array.isArray(subCompanies) ? subCompanies : (subCompanies?.sub_companies || []);
            this.subsidiaryCompanies = rawSubs.map(s => ({
                id: s.id || s.company_id,
                company_code: s.company_code || s.code,
                company_name: s.company_name || s.name,
                relationship_type: 'subsidiary',
                relationship_status: 'active'
            }));

            // Şöbələr
            this.departments = Array.isArray(departments) ? departments.filter(d => d.is_active !== false) : [];

            // İşçilər
            const rawEmp = Array.isArray(employees) ? employees : (employees?.data || []);
            this.employees = rawEmp
                .filter(u => u.is_active !== false)
                .map(u => ({
                    id: u.id,
                    full_name: [u.ceo_name, u.ceo_lastname].filter(Boolean).join(' ') || u.full_name || u.name || u.email || 'Ad yoxdur',
                    email: u.email || u.ceo_email,
                    department_id: u.department_id,
                    hourly_rate: u.hourly_rate || 0,
                    position: u.position || 'İşçi',
                    is_admin: u.is_admin || false
                }));

            // Company cache (bütün şirkətlər)
            await this._buildCompanyCache();

            // UI yenilə
            this.populateCompanySelects();
            this.populateDepartmentSelects();
            this.populateEmployeeSelect();

            // İş növləri cache ilə
            if (window.FormManager?.loadWorkTypes) {
                await window.FormManager.loadWorkTypes();
            } else {
                const wt = await getWorkTypesWithCache(this.userData.companyId);
                this.workTypes = Array.isArray(wt) ? wt : [];
            }

            // Partner şirkətlər cache ilə
            await this.loadPartnerCompanies();
            this.setupPartnerSelection();

            // Taskları yüklə (cache ilə)
            await this.loadTasksData();

            this.hideLoading();
        } catch (error) {
            console.error('❌ Initial data xətası:', error);
            this.hideLoading();
            this.showError('Məlumatlar yüklənərkən xəta baş verdi');
        }
    }

    // ✅ Company cache - bir sorğu ilə hamısı

    async _buildCompanyCache() {
        try {
            this.companyCache = {};

            // Öz şirkət - REAL ADINI AL
            if (this.myCompany && this.myCompany.id) {
                // Əvvəlcə userData-dan şirkət adını al
                let myCompanyName = this.userData?.companyName || this.myCompany?.company_name;

                // Əgər yoxdursa, API-dən yüklə
                if (!myCompanyName) {
                    try {
                        const companyResponse = await makeApiRequest(`/companies/${this.myCompany.id}`, 'GET');
                        if (companyResponse && !companyResponse.error) {
                            const company = companyResponse.data || companyResponse;
                            myCompanyName = company.company_name || company.name;
                        }
                    } catch (e) {
                        console.warn('⚠️ Şirkət adı API-dən alınmadı:', e);
                    }
                }

                // Hələ də yoxdursa, fallback
                if (!myCompanyName) {
                    myCompanyName = this.userData?.companyName || this.myCompany.company_name;
                }

                this.companyCache[this.myCompany.id] = myCompanyName;
                console.log(`✅ Öz şirkət cache-ə əlavə edildi: ${this.myCompany.id} = ${myCompanyName}`);
            }

            // Alt şirkətlər
            this.subsidiaryCompanies.forEach(s => {
                if (s.id && s.company_name) {
                    this.companyCache[s.id] = s.company_name;
                }
            });

            // Bütün şirkətlər cache ilə
            const all = await getAllCompaniesWithCache();
            const allArr = Array.isArray(all) ? all : [];
            allArr.forEach(c => {
                if (c.id && c.company_name && !this.companyCache[c.id]) {
                    this.companyCache[c.id] = c.company_name;
                }
            });

            console.log(`✅ Company cache: ${Object.keys(this.companyCache).length} şirkət`);
            console.log('📋 Company cache məzmunu:', this.companyCache);

        } catch (e) {
            console.warn('⚠️ Company cache xətası:', e);
        }
    }

    // ==================== PARTNER COMPANIES ====================
    async loadPartnerCompanies() {
        try {
            const partniyorSelect = document.getElementById('partniyorSelect');
            if (!partniyorSelect) return;

            partniyorSelect.innerHTML = '<option value="">Yüklənir...</option>';
            partniyorSelect.disabled = true;

            // ✅ CACHE İSTİFADƏ ET
            const partners = await getPartnersWithCache(this.userData.companyCode);
            const arr = Array.isArray(partners) ? partners : (partners?.items || partners?.data || []);

            if (!arr.length) {
                partniyorSelect.innerHTML = '<option value="">Partnyor tapılmadı</option>';
                partniyorSelect.disabled = false;
                return;
            }

            const code = this.userData.companyCode;
            let html = '<option value="">Partnyor şirkət seçin</option>';

            arr.forEach(p => {
                let partnerName = '', partnerCode = '';
                const statusIcon = p.status === 'active' || p.status === 'approved' ? '✅ ' : (p.status === 'pending' ? '⏳ ' : '🤝 ');

                if (p.requester_company_code === code) {
                    partnerName = p.partner_company_name || p.target_company_name || `Şirkət ${p.target_company_code}`;
                    partnerCode = p.target_company_code;
                } else if (p.target_company_code === code) {
                    partnerName = p.partner_company_name || p.requester_company_name || `Şirkət ${p.requester_company_code}`;
                    partnerCode = p.requester_company_code;
                } else {
                    partnerName = p.company_name || 'Adsız partnyor';
                    partnerCode = p.company_code || '';
                }

                html += `<option value="${p.id}" data-code="${partnerCode}" data-status="${p.status || 'active'}">${statusIcon}${partnerName}</option>`;
            });

            partniyorSelect.innerHTML = html;
            partniyorSelect.disabled = false;

        } catch (error) {
            console.error('❌ Partner load xətası:', error);
            const el = document.getElementById('partniyorSelect');
            if (el) {
                el.innerHTML = '<option value="">Xəta baş verdi</option>';
                el.disabled = false;
            }
        }
    }

    // ==================== PARENT COMPANIES (CACHE) ====================
    async loadParentCompanies() {
        try {
            const parentSelect = document.getElementById('parentCompanySelect');
            const parentGroup = document.getElementById('parentCompanyGroup');
            if (!parentSelect) return;
            if (parentGroup) parentGroup.style.display = 'block';

            parentSelect.innerHTML = '<option value="">Yüklənir...</option>';
            parentSelect.disabled = true;

            // ✅ CACHE İSTİFADƏ ET
            const parents = await getParentCompaniesWithCache(this.userData.companyCode);
            const arr = Array.isArray(parents) ? parents : (parents?.parent_companies || []);

            this.populateParentSelect(parentSelect, arr);
        } catch (error) {
            console.error('❌ Parent companies xətası:', error);
            const parentGroup = document.getElementById('parentCompanyGroup');
            if (parentGroup) parentGroup.style.display = 'block';
            const parentSelect = document.getElementById('parentCompanySelect');
            if (parentSelect) {
                parentSelect.innerHTML = '<option value="">Xəta baş verdi</option>';
                parentSelect.disabled = false;
            }
        }
    }

    populateParentSelect(selectEl, companies) {
        if (!selectEl) return;
        if (!companies?.length) {
            selectEl.innerHTML = '<option value="">Üst şirkət tapılmadı</option>';
            selectEl.disabled = false;
            return;
        }
        let html = '<option value="">Üst şirkət seçin</option>';
        companies.forEach(c => {
            const id = c.company_id || c.id;
            const name = c.company_name || c.name;
            const code = c.parent_company_code || c.company_code || c.code;
            if (id && name) {
                html += `<option value="${id}" data-code="${code || ''}" data-name="${name}">⬆️ ${name} (${code || id})</option>`;
            }
        });
        selectEl.innerHTML = html;
        selectEl.disabled = false;
    }

    // ==================== SELECT POPULATION ====================
    populateCompanySelects() {
        const companySelect = document.getElementById('companySelect');
        if (companySelect) {
            let html = '<option value="">Seçin</option>';
            if (this.myCompany) {
                html += `<option value="${this.myCompany.id}" data-is-my-company="true" data-company-code="${this.myCompany.company_code}" selected>${this.myCompany.company_name}</option>`;
            }
            if (this.subsidiaryCompanies.length) {
                html += '<optgroup label="👇 Alt Şirkətlərim">';
                this.subsidiaryCompanies.filter(s => s.relationship_status === 'active').forEach(s => {
                    html += `<option value="${s.id}" data-is-my-company="false" data-company-code="${s.company_code}"> ${s.company_name}</option>`;
                });
                html += '</optgroup>';
            }
            companySelect.innerHTML = html;
        }
    }

    populateDepartmentSelects() {
        ['departmentSelect', 'filterDepartmentSelect', 'editDepartmentSelect'].forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            const isFilter = id.includes('filter');
            let html = `<option value="">${isFilter ? 'Hamısı' : 'Seçin'}</option>`;
            this.departments.forEach(d => {
                html += `<option value="${d.id}">${d.department_name || d.name || `Şöbə ${d.id}`}</option>`;
            });
            el.innerHTML = html;
        });
    }

    populateEmployeeSelect() {
        ['executorSelect', 'filterExecutorSelect', 'editExecutorSelect'].forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            const isFilter = id.includes('filter');
            let html = `<option value="">${isFilter ? 'Hamısı' : 'Seçin'}</option>`;
            this.employees.forEach(e => {
                html += `<option value="${e.id}">${e.full_name}${e.email ? ` (${e.email})` : ''}</option>`;
            });
            el.innerHTML = html;
        });
    }

    setupVisibilityControls() {
        const cb = document.getElementById('isVisibleToOtherCompanies');
        const sel = document.getElementById('viewableCompanySelect');
        const grp = document.getElementById('viewableCompanyGroup');
        if (!cb || !sel) return;
        cb.addEventListener('change', e => {
            if (grp) grp.style.display = e.target.checked ? 'block' : 'none';
            sel.required = e.target.checked;
        });
    }

    setupPartnerSelection() {
        const partniyorSelect = document.getElementById('partniyorSelect');
        const companySelect = document.getElementById('companySelect');
        if (!partniyorSelect) return;

        partniyorSelect.addEventListener('change', e => {
            if (e.target.value && companySelect) {
                const myOpt = Array.from(companySelect.options).find(o => o.dataset.isMyCompany === 'true');
                if (myOpt) {
                    companySelect.value = myOpt.value;
                    this.loadSelectedCompanyEmployees(myOpt.value);
                }
            }
        });

        companySelect?.addEventListener('change', e => {
            if (e.target.value) this.loadSelectedCompanyEmployees(e.target.value);
        });
    }

    async loadSelectedCompanyEmployees(companyId) {
        const el = document.getElementById('selectedCompanyExecutor');
        if (!el) return;
        el.innerHTML = '<option value="">Yüklənir...</option>';
        el.disabled = true;

        try {
            const companySelect = document.getElementById('companySelect');
            const opt = companySelect?.options[companySelect.selectedIndex];
            let code = opt?.dataset?.code;

            if (!code) {
                const sub = this.subsidiaryCompanies.find(s => s.id == companyId);
                code = sub?.company_code || (this.myCompany?.id == companyId ? this.myCompany.company_code : null);
            }

            if (!code) {
                el.innerHTML = '<option value="">Şirkət kodu tapılmadı</option>';
                el.disabled = false;
                return;
            }

            // ✅ Cache ilə yüklə
            const emps = await getEmployeesWithCache(code);
            const arr = Array.isArray(emps) ? emps : (emps?.data || []);

            let html = '<option value="">İşçi seçin</option>';
            arr.forEach(e => {
                const name = [e.ceo_name, e.ceo_lastname].filter(Boolean).join(' ') || e.full_name || e.name || 'Ad yoxdur';
                html += `<option value="${e.id}">👤 ${name}${e.position ? ` (${e.position})` : ''}</option>`;
            });
            el.innerHTML = arr.length ? html : '<option value="">İşçi tapılmadı</option>';
            el.disabled = false;
        } catch (e) {
            el.innerHTML = '<option value="">Xəta baş verdi</option>';
            el.disabled = false;
        }
    }

    // ==================== TASK YÜKLƏMƏSİ (CACHE İLƏ) ====================
    async loadTasksData() {
        await Promise.all([
            this.loadActiveTasks(),
            this.loadExternalTasks()
        ]);
    }


    async loadActiveTasks(page = 1, forceRefresh = false) {
        try {
            console.log(`📋 Aktiv tasklar yüklənir... (page: ${page}, forceRefresh: ${forceRefresh})`);

            let allTasks = null;

            if (!forceRefresh) {
                allTasks = TaskCache.get('active_tasks');
                if (allTasks && !Array.isArray(allTasks)) {
                    if (allTasks.data && Array.isArray(allTasks.data)) allTasks = allTasks.data;
                    else if (allTasks.items && Array.isArray(allTasks.items)) allTasks = allTasks.items;
                    else allTasks = [];
                }
            }

            if (!allTasks) {
                console.log('🔄 API-dən aktiv tasklar yüklənir...');

                const endpoint = `/tasks/detailed?page=${page}&limit=${this.pagination.active.pageSize}&status=pending,in_progress,waiting,overdue,pending_approval,paused,approval_overdue`;
                const response = await this.apiRequest(endpoint, 'GET');

                if (Array.isArray(response)) allTasks = response;
                else if (response?.data && Array.isArray(response.data)) allTasks = response.data;
                else if (response?.items && Array.isArray(response.items)) allTasks = response.items;
                else allTasks = [];

                // 🔥 COMMENT SAYLARINI BURADA YÜKLƏMƏ - CommentTracker özü yükləyəcək
                // Sadəcə cache-ə yaz
                TaskCache.set('active_tasks', allTasks);
                console.log(`✅ API-dən ${allTasks.length} task yükləndi`);
            }

            const validStatuses = ['pending_approval', 'approval_overdue', 'pending', 'in_progress', 'overdue', 'waiting', 'paused'];
            const activeTasks = allTasks.filter(t => validStatuses.includes(t.status));

            if (TableManager?.renderTasksTable) {
                TableManager.renderTasksTable('active', activeTasks, false, page);
            }

            this.pagination.active.total = activeTasks.length;
            this.pagination.active.page = page;
            this.pagination.active.totalPages = Math.ceil(activeTasks.length / this.pagination.active.pageSize) || 1;
            this.updatePaginationUI('active');

            // 🔥 CommentTracker cədvəl render OLDUQDAN SONRA başlasın
            if (activeTasks.length > 0 && window.CommentTracker) {
                const taskIds = activeTasks.map(t => t.id).filter(id => id);
                setTimeout(() => {
                    window.CommentTracker.initForTasks(taskIds);
                }, 500); // 500ms gözlə ki DOM tam hazır olsun
            }

            console.log(`✅ ${activeTasks.length} aktiv task göstərildi`);
            return activeTasks;

        } catch (error) {
            console.error('❌ Aktiv tasklar xətası:', error);
            TableManager?.renderTasksTable?.('active', []);
            return [];
        }
    }
    async loadExternalTasks(page = 1, append = false) {
        // ✅ Tamamilə ExternalTableManager-ə yönləndir (o özü cache istifadə edir)
        if (window.ExternalTableManager) {
            await window.ExternalTableManager.loadTasks();
        } else {
            console.warn('⚠️ ExternalTableManager tapılmadı');
            this.showEmptyExternalTable();
        }
    }

    async loadPartnerTasks(page = 1) {
        // ✅ Tamamilə PartnerTableManager-ə yönləndir
        if (window.PartnerTableManager) {
            await window.PartnerTableManager.loadTasks(page);
        }
    }

    async loadArchiveTasks(page = 1) {
        if (window.ArchiveTableManager?.loadArchiveTasks) {
            await window.ArchiveTableManager.loadArchiveTasks(page);
        }
    }

    async checkAndArchiveOverdueTasks() {
        try {
            console.log('⏰ Overdue yoxlama başladı...');

            // Cache-dən yoxla
            let allTasks = TaskCache.get('active_tasks');

            if (!allTasks) {
                console.log('🔄 Cache boşdur, API-dən yüklənir...');
                const endpoint = `/tasks/detailed?limit=100&status=pending,in_progress,waiting,overdue,pending_approval,paused,approval_overdue`;
                const response = await this.apiRequest(endpoint, 'GET');
                allTasks = response?.data || response || [];
                if (!Array.isArray(allTasks)) {
                    if (allTasks.data && Array.isArray(allTasks.data)) allTasks = allTasks.data;
                    else allTasks = [];
                }
            }

            const pendingTasks = allTasks.filter(t => t.status === 'pending' || t.status === 'pending_approval');
            if (!pendingTasks.length) {
                console.log('ℹ️ Overdue task yoxdur');
                return;
            }

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            let overdueCount = 0;

            for (const task of pendingTasks) {
                if (!task.due_date) continue;
                const due = new Date(task.due_date);
                due.setHours(0, 0, 0, 0);
                if (due < today) {
                    try {
                        await this.apiRequest(`/tasks/${task.id}/status`, 'PUT', {
                            status: 'overdue',
                            reason: 'Deadline expired'
                        });
                        overdueCount++;
                    } catch (e) {
                        console.error(`Task ${task.id} overdue xəta:`, e);
                    }
                }
            }

            if (overdueCount > 0) {
                console.log(`✅ ${overdueCount} task overdue edildi`);
                TaskCache.clear();
                setTimeout(() => this.loadActiveTasks(1, true), 1500);
            }

        } catch (error) {
            console.error('❌ Overdue yoxlama xətası:', error);
        }
    }


    setupAutoArchiveCheck() {
        setInterval(() => this.checkAndArchiveOverdueTasks(), 60 * 1000);
    }

    // ==================== PAGİNASİYA ====================
    async changePage(tableType, newPage) {
        if (newPage < 1) return;
        const pg = this.pagination[tableType];
        if (pg.totalPages && newPage > pg.totalPages) return;
        pg.page = newPage;

        switch (tableType) {
            case 'active':
                await this.loadActiveTasks(newPage, false);
                break;
            case 'external':
                await this.loadExternalTasks(newPage, false);
                break;
            case 'archive':
                await this.loadArchiveTasks(newPage);
                break;
            case 'partner':
                await this.loadPartnerTasks(newPage);
                break;
        }
        this.updatePaginationUI(tableType);
    }

    updatePaginationUI(tableType) {
        const pg = this.pagination[tableType];
        if (tableType === 'archive' && window.ArchiveTableManager?.pagination) {
            const ap = window.ArchiveTableManager.pagination;
            pg.page = ap.currentPage || pg.page;
            pg.total = ap.totalItems || 0;
            pg.totalPages = ap.totalPages || 1;
        }

        const prevBtn = tableType === 'active'
            ? document.getElementById('prevBtnList')
            : document.getElementById(`${tableType}PrevBtn`);
        const nextBtn = tableType === 'active'
            ? document.getElementById('nextBtnList')
            : document.getElementById(`${tableType}NextBtn`);
        const numbersEl = document.getElementById(`${tableType}PaginationNumbers`);
        const pageInfo  = document.getElementById(`${tableType}PageInfo`);

        if (prevBtn) {
            prevBtn.disabled = pg.page <= 1;
            prevBtn.style.opacity = pg.page <= 1 ? '0.5' : '1';
        }
        if (nextBtn) {
            const last = pg.totalPages && pg.page >= pg.totalPages;
            nextBtn.disabled = last;
            nextBtn.style.opacity = last ? '0.5' : '1';
        }

        if (pageInfo && pg.total > 0) {
            const s = (pg.page - 1) * pg.pageSize + 1;
            const e = Math.min(pg.page * pg.pageSize, pg.total);
            pageInfo.textContent = `Səhifə ${pg.page} - ${s}-${e} məlumat`;
        }

        if (numbersEl) this.generatePaginationNumbers(tableType, numbersEl);
    }



    // ==================== CACHE TƏMİZLƏMƏ METODLARI ====================

    clearTaskCache() {
        console.log('🧹 Task cache təmizlənir...');

        // 1. TaskCache təmizlə
        if (TaskCache && TaskCache.clear) {
            TaskCache.clear();
            console.log('✅ TaskCache təmizləndi');
        }

        // 2. SessionStorage-dan task ilə əlaqəli olanları sil
        const sessionKeys = Object.keys(sessionStorage);
        sessionKeys.forEach(key => {
            if (key.startsWith('tc_') || key.includes('task') || key.includes('cache')) {
                sessionStorage.removeItem(key);
                console.log(`🗑️ SessionStorage-dan silindi: ${key}`);
            }
        });

        // 3. LocalStorage-dan task ilə əlaqəli olanları sil
        const localStorageKeys = Object.keys(localStorage);
        localStorageKeys.forEach(key => {
            if (key.startsWith('task_confirm_end_') ||
                key.startsWith('task_delay_') ||
                key.startsWith('task_work_start_') ||
                key === 'tasks_cache' ||
                key === 'tasks_cache_timestamp' ||
                key === 'externalTasks_cache' ||
                key === 'externalTasks_cache_timestamp') {
                localStorage.removeItem(key);
                console.log(`🗑️ LocalStorage-dan silindi: ${key}`);
            }
        });

        console.log('✅ Bütün task cache-ləri təmizləndi');
    }

    async refreshAllTaskLists() {
        console.log('🔄 Bütün task listlər YENİDƏN YÜKLƏNİR...');

        // Cache təmizlə
        this.clearTaskCache();

        // 🔥 BÜTÜN TASKLARI DƏRHAL YENİDƏN YÜKLƏ (setTimeout OLMADAN!)
        try {
            // 1. Aktiv taskları yenilə (force refresh)
            await this.loadActiveTasks(1, true);
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

            // 4. Arxiv taskları yenilə
            if (window.ArchiveTableManager && window.ArchiveTableManager.loadArchiveTasks) {
                await window.ArchiveTableManager.loadArchiveTasks(1);
                console.log('✅ Arxiv tasklar yeniləndi');
            }

            console.log('🎉 Bütün task listlər YENİLƏNDİ!');

        } catch (error) {
            console.error('❌ Task list yeniləmə xətası:', error);
        }
    }

    generatePaginationNumbers(tableType, container) {
        const pg = this.pagination[tableType];
        const cur = pg.page || 1;
        const tot = pg.totalPages || 1;
        let html = '';

        const pages = tot <= 7
            ? Array.from({length: tot}, (_, i) => i + 1)
            : (() => {
                const a = [1];
                if (cur > 3) a.push('...');
                for (let i = Math.max(2, cur - 1); i <= Math.min(tot - 1, cur + 1); i++) a.push(i);
                if (cur < tot - 2) a.push('...');
                if (tot > 1) a.push(tot);
                return a;
            })();

        pages.forEach(p => {
            html += p === '...'
                ? '<span class="pagination-ellipsis">...</span>'
                : `<button class="pagination-number ${p === cur ? 'active' : ''}" data-page="${p}">${p}</button>`;
        });

        container.innerHTML = html;
        container.querySelectorAll('.pagination-number').forEach(btn => {
            btn.addEventListener('click', e => {
                e.preventDefault();
                e.stopPropagation();
                const page = parseInt(btn.dataset.page);
                if (page && page !== cur) this.changePage(tableType, page);
            });
        });
    }

    // ==================== FİLTER ====================
    async handleFilterFormSubmit(e) {
        e.preventDefault();
        e.stopPropagation();
        try {
            const form = e.target;
            const filters = {};
            for (const el of form.elements) {
                if (el.name && el.value && el.value !== '') filters[el.name] = el.value;
            }
            const selectedTable = document.querySelector('input[name="filter_table"]:checked')?.value || 'active';
            this.currentFilterTable = selectedTable;
            const {filter_table, ...filterParams} = filters;
            this.currentFilters = filterParams;
            this.closeFilterModal();
            await this.applyFilterToSelectedTable(selectedTable, filterParams);
            this.updateFilterBadge();
        } catch (error) {
            this.showError('Filtr tətbiqi xətası: ' + error.message);
        }
    }

    async applyFilterToSelectedTable(tableType, filters) {
        this.currentFilters = filters;
        switch (tableType) {
            case 'active':
                await this.loadActiveTasks(1, false);
                break;
            case 'external':
                await this.loadExternalTasks(1, false);
                break;
            default:
                await this.loadActiveTasks(1, false);
        }
    }

    resetFilters() {
        const form = document.getElementById('filterForm');
        if (form) {
            form.reset();
            const r = form.querySelector('input[name="filter_table"][value="active"]');
            if (r) r.checked = true;
        }
        this.currentFilters = {};
        this.currentFilterTable = 'active';
        const badge = document.getElementById('filterBadge');
        if (badge) badge.style.display = 'none';
        this.loadActiveTasks(1, false);
        this.loadExternalTasks(1, false);
    }

    openFilterModal() {
        this._populateFilterSelects();
        const m = document.getElementById('filterModal');
        if (m) {
            m.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }

    closeFilterModal() {
        const m = document.getElementById('filterModal');
        if (m) {
            m.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    _populateFilterSelects() {
        // Şirkət
        const fcs = document.getElementById('filterCompanySelect');
        if (fcs && this.myCompany) {
            let html = '<option value="">Hamısı</option>';
            html += `<option value="${this.myCompany.id}">${this.myCompany.company_name} (Mənim)</option>`;
            this.subsidiaryCompanies.filter(s => s.relationship_status === 'active').forEach(s => {
                html += `<option value="${s.id}">${s.company_name}</option>`;
            });
            fcs.innerHTML = html;
        }

        // İşçi
        const fes = document.getElementById('filterExecutorSelect');
        if (fes && this.employees.length) {
            let html = '<option value="">Hamısı</option>';
            this.employees.forEach(e => {
                html += `<option value="${e.id}">${e.full_name}</option>`;
            });
            fes.innerHTML = html;
        }

        // Şöbə
        const fds = document.getElementById('filterDepartmentSelect');
        if (fds && this.departments.length) {
            let html = '<option value="">Hamısı</option>';
            this.departments.forEach(d => {
                html += `<option value="${d.id}">${d.department_name || d.name}</option>`;
            });
            fds.innerHTML = html;
        }

        // İş növü
        const fts = document.getElementById('filterTaskTypeSelect');
        if (fts && this.workTypes?.length) {
            let html = '<option value="">Hamısı</option>';
            this.workTypes.filter(w => w.is_active !== false).forEach(w => {
                html += `<option value="${w.id}">${w.work_type_name || w.name}</option>`;
            });
            fts.innerHTML = html;
        }
    }

    updateFilterBadge() {
        const badge = document.getElementById('filterBadge');
        if (!badge) return;
        const count = Object.values(this.currentFilters || {}).filter(v => v && v !== '').length;
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
    }

    // ==================== EVENT LISTENERS ====================
    setupEventListeners() {
        console.log('🔌 Event listeners qurulur...');

        // Pagination düymələri
        document.getElementById('prevBtnList')?.addEventListener('click', () => {
            this.changePage('active', this.pagination.active.page - 1);
        });

        document.getElementById('nextBtnList')?.addEventListener('click', () => {
            this.changePage('active', this.pagination.active.page + 1);
        });

        document.getElementById('externalPrevBtn')?.addEventListener('click', () => {
            this.changePage('external', this.pagination.external.page - 1);
        });

        document.getElementById('externalNextBtn')?.addEventListener('click', () => {
            this.changePage('external', this.pagination.external.page + 1);
        });

        document.getElementById('archivePrevBtn')?.addEventListener('click', () => {
            this.changePage('archive', this.pagination.archive.page - 1);
        });

        document.getElementById('archiveNextBtn')?.addEventListener('click', () => {
            this.changePage('archive', this.pagination.archive.page + 1);
        });

        // ===== ARXİV LOAD MORE BUTTON =====
        const archiveLoadMoreBtn = document.getElementById('archiveLoadMoreBtn');
        if (archiveLoadMoreBtn) {
            console.log('✅ archiveLoadMoreBtn tapıldı, event listener əlavə edilir...');

            archiveLoadMoreBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();

                console.log('📦 Archive load more basıldı', this.pagination.archive);

                if (this.pagination.archive.hasMore) {
                    // Yüklənir vəziyyəti
                    archiveLoadMoreBtn.disabled = true;
                    archiveLoadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Yüklənir...</span>';

                    // Növbəti səhifəyə keç
                    this.pagination.archive.page++;

                    // ArchiveTableManager-i çağır
                    if (window.ArchiveTableManager) {
                        await window.ArchiveTableManager.loadArchiveTasks(this.pagination.archive.page);
                    } else {
                        console.error('❌ ArchiveTableManager tapılmadı');
                    }

                    // Butonu geri qaytar (loadArchiveTasks özü yeniləyəcək)
                } else {
                    console.log('✅ Daha çox arxiv task yoxdur');
                    archiveLoadMoreBtn.disabled = true;
                    archiveLoadMoreBtn.innerHTML = '<i class="fas fa-check"></i><span>Bütün məlumatlar yükləndi</span>';
                }
            });

            console.log('✅ archiveLoadMoreBtn event listener əlavə edildi');
        } else {
            console.warn('⚠️ archiveLoadMoreBtn tapılmadı!');
        }

        // Digər event listenerlar...
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('pagination-number')) {
                const page = parseInt(e.target.textContent);
                const container = e.target.closest('.pagination-numbers');

                let tableType = 'active';
                if (container.id === 'externalPaginationNumbers') {
                    tableType = 'external';
                } else if (container.id === 'archivePaginationNumbers') {
                    tableType = 'archive';
                }

                this.changePage(tableType, page);
            }
        });

        // Qalan listenerlar (dəyişməz qalır)...
        const taskForm = document.getElementById('taskForm');
        if (taskForm) {
            taskForm.addEventListener('submit', (e) => {
                if (window.TaskCreationModule && typeof window.TaskCreationModule.handleTaskFormSubmit === 'function') {
                    window.TaskCreationModule.handleTaskFormSubmit(e);
                } else {
                    console.error('❌ TaskCreationModule.handleTaskFormSubmit tapılmadı!');
                    e.preventDefault();
                    this.showError('Task yaratma modulu yüklənməyib');
                }
            });
        }

        const companySelect = document.getElementById('companySelect');
        if (companySelect) {
            companySelect.addEventListener('change', (e) => {
                const selectedOption = e.target.options[e.target.selectedIndex];
                const isMyCompany = selectedOption.getAttribute('data-is-my-company') === 'true';
                const isVisibleCheckbox = document.getElementById('isVisibleToOtherCompanies');

                if (isVisibleCheckbox) {
                    if (isMyCompany) {
                        isVisibleCheckbox.disabled = true;
                        isVisibleCheckbox.checked = false;
                    } else {
                        isVisibleCheckbox.disabled = false;
                    }
                }
            });
        }

        const openFilterBtn = document.getElementById('openFilterBtn');
        if (openFilterBtn) {
            openFilterBtn.addEventListener('click', () => this.openFilterModal());
        }

        const filterForm = document.getElementById('filterForm');
        if (filterForm) {
            filterForm.addEventListener('submit', (e) => this.handleFilterFormSubmit(e));
        }

        const resetFiltersBtn = document.getElementById('resetFiltersBtn');
        if (resetFiltersBtn) {
            resetFiltersBtn.addEventListener('click', () => this.resetFilters());
        }

        const closeFilterBtn = document.getElementById('closeFilterBtn');
        if (closeFilterBtn) {
            closeFilterBtn.addEventListener('click', () => this.closeFilterModal());
        }

        const openSerialRequestBtn = document.getElementById('openSerialRequestBtn');
        if (openSerialRequestBtn) {
            openSerialRequestBtn.addEventListener('click', () => this.openSerialRequestModal());
        }

        const activeLoadMoreBtn = document.getElementById('activeLoadMoreBtn');
        if (activeLoadMoreBtn) {
            activeLoadMoreBtn.addEventListener('click', async () => {
                if (this.pagination.active.hasMore) {
                    this.pagination.active.page++;
                    await this.loadActiveTasks(this.pagination.active.page, true);
                }
            });
        }

        const externalLoadMoreBtn = document.getElementById('externalLoadMoreBtn');
        if (externalLoadMoreBtn) {
            externalLoadMoreBtn.addEventListener('click', async () => {
                if (this.pagination.external.hasMore) {
                    this.pagination.external.page++;
                    await this.loadExternalTasks(this.pagination.external.page, true);
                }
            });
        }

        const executorSelect = document.getElementById('executorSelect');
        if (executorSelect) {
            executorSelect.addEventListener('change', async (e) => {
                await this.handleExecutorChange(e);
            });
        }

        const departmentSelect = document.getElementById('departmentSelect');
        if (departmentSelect) {
            departmentSelect.addEventListener('change', async (e) => {
                await this.handleDepartmentChange(e);
            });
        }

        const durationInput = document.getElementById('durationInput');
        const hourlyRateInput = document.getElementById('hourlyRateInput');

        if (durationInput) {
            durationInput.addEventListener('input', () => this.calculateSalary());
        }

        if (hourlyRateInput) {
            hourlyRateInput.addEventListener('input', () => this.calculateSalary());
        }

        console.log('✅ Bütün event listeners quruldu');
    }

    // ==================== TASK STATUS ====================
    async changeTaskStatus(taskId, newStatus, additionalData = {}) {
        try {
            const updateData = {status: newStatus, ...additionalData};
            if (newStatus === 'completed') updateData.completed_date = new Date().toISOString().split('T')[0];

            const res = await this.apiRequest(`/tasks/${taskId}/status`, 'PUT', updateData);

            if (res && (res.success === true || res.data?.success === true || res.status === newStatus)) {
                // Cache təmizlə
                if (window.refreshTaskCache) await window.refreshTaskCache();
                setTimeout(() => this.loadActiveTasks(), 100);
                return res.data || res;
            } else {
                throw new Error(res?.detail || res?.message || 'Status dəyişdirilə bilmədi');
            }
        } catch (error) {
            this.showError('Status dəyişdirilərkən xəta: ' + error.message);
            throw error;
        }
    }

    // ==================== UTILITIES ====================
    showEmptyExternalTable() {
        const tbody = document.getElementById('externalTableBody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="8" class="empty-state">🌐 Hazırda digər şirkətlərdən iş tapılmadı.</td></tr>`;
        }
    }

    apiRequest(endpoint, method = 'GET', data = null) {
        return makeApiRequest(endpoint, method, data);
    }

    showSuccess(message) {
        if (typeof notificationService !== 'undefined' && notificationService.showSuccess) {
            notificationService.showSuccess(message);
        } else {
            alert('✅ ' + message);
        }
    }

    showError(message) {
        if (typeof notificationService !== 'undefined' && notificationService.showError) {
            notificationService.showError(message);
        } else {
            alert('❌ ' + message);
        }
    }

    showLoading() {
        const el = document.getElementById('loadingOverlay');
        if (el) el.style.display = 'flex';
    }

    hideLoading() {
        const el = document.getElementById('loadingOverlay');
        if (el) el.style.display = 'none';
    }

    getStatusText(status) {
        return {
            pending: 'Gözləmədə',
            in_progress: 'İcra edilir',
            completed: 'Tamamlandı',
            overdue: 'Gecikmiş',
            rejected: 'İmtina edildi'
        }[status] || status;
    }
}

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', () => {
    try {
        if (typeof makeApiRequest === 'undefined') {
            console.error('❌ makeApiRequest tapılmadı! apiService.js yüklənməyib');
            return;
        }

        // TaskManager instance-ını yarat və globala təyin et
        window.taskManager = new TaskManager();

        // Initialize et
        window.taskManager.initialize().then(() => {
            console.log('🎉 Task Manager uğurla başladıldı');
            console.log('✅ window.taskManager hazırdır:', window.taskManager);
        }).catch(err => {
            console.error('❌ Task Manager başlatma xətası:', err);
        });

    } catch (error) {
        console.error('❌ Initialization xətası:', error);
    }
});

// ==================== PAGE LOADER ====================
(function () {
    const loader = document.getElementById('pageLoader');
    if (!loader) return;

    document.body.classList.remove('loading');
    loader.style.cssText = 'opacity:1;visibility:visible;display:flex;';

    const hideLoader = () => {
        if (loader.classList.contains('loader-hidden')) return;
        loader.classList.add('loader-hidden');
        loader.style.opacity = '0';
        setTimeout(() => {
            loader.style.display = 'none';
            document.body.style.overflow = 'auto';
        }, 500);
    };

    window.addEventListener('taskManagerReady', () => hideLoader());

    // Cədvəldə məlumat gəldikdə
    const check = setInterval(() => {
        const tbody = document.getElementById('tableBody');
        if (tbody && tbody.children.length > 0 && !tbody.querySelector('.loading-row')) {
            hideLoader();
            clearInterval(check);
        }
    }, 200);

    // Maks 5 saniyə
    setTimeout(() => {
        hideLoader();
        clearInterval(check);
    }, 5000);
})();