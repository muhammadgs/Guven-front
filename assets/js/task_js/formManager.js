// formManager.js - DÜZƏLDİLMİŞ VERSİYA
const FormManager = {
    // Form elementləri
    forms: {},

    // Cache storage
    cachedDepartments: null,
    cachedEmployees: null,
    cachedWorkTypes: null,
    cachedCompanies: null,

    // Settings
    settings: {
        autoLoad: true,
        cacheDuration: 5 * 60 * 5000, // 5 dəqiqə
        debug: true
    },

    // ==================== INITIALIZATION ====================
    initialize: function() {
        console.log('📝 FormManager initialize edilir...');

        // Formları tap
        this.initializeForms();

        // Event listener-ları qoş
        this.setupFormListeners();

        // Filter form setup
        this.setupFilterForm();

        console.log('✅ FormManager hazırdır');
        return this;
    },

    initializeForms: function() {
        const forms = ['taskForm', 'filterForm', 'serialRequestForm'];

        forms.forEach(formId => {
            const form = document.getElementById(formId);
            if (form) {
                this.forms[formId] = form;
            }
        });
    },

    // ==================== API REQUEST FUNCTIONS ====================
    apiRequest: async function(endpoint, method = 'GET', data = null) {
        try {
            console.log(`📡 FormManager API Request: ${method} ${endpoint}`);

            // Global makeApiRequest istifadə et
            if (typeof window.makeApiRequest === 'function') {
                return await window.makeApiRequest(endpoint, method, data);
            }

            // Fallback: direkt fetch
            console.warn('⚠️ makeApiRequest tapılmadı, direkt fetch istifadə olunur');

            const token = localStorage.getItem('guven_token') || localStorage.getItem('token');
            if (!token) {
                throw new Error('Auth token not found');
            }

            const headers = {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            };

            if (!(data instanceof FormData)) {
                headers['Content-Type'] = 'application/json';
            }

            const options = {
                method: method,
                headers: headers,
                credentials: 'include'
            };

            if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
                if (data instanceof FormData) {
                    options.body = data;
                } else {
                    options.body = JSON.stringify(data);
                }
            }

            // URL qur
            let url = endpoint;
            if (!url.startsWith('http')) {
                url = `/proxy.php/api/v1${url}`;
            }

            console.log(`🌐 FormManager Request: ${method} ${url}`);

            const response = await fetch(url, options);

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ HTTP ${response.status}: ${errorText}`);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }

            return await response.text();

        } catch (error) {
            console.error('❌ FormManager API xətası:', error);
            throw error;
        }
    },

    // ==================== FORM EVENT HANDLERS ====================
    setupFormListeners: function() {
        const taskForm = this.forms['taskForm'];
        if (taskForm) {
            this.setupTaskFormListeners(taskForm);
        }

        // Status select listener
        const statusSelect = document.getElementById('statusSelect');
        if (statusSelect) {
            statusSelect.addEventListener('change', this.handleStatusChange.bind(this));
        }

        // Executor select listener
        const executorSelect = document.getElementById('executorSelect');
        if (executorSelect) {
            executorSelect.addEventListener('change', async (event) => {
                await this.handleExecutorChange(event);
                await this.autoFillDepartmentFromEmployee(event.target.value);
            });
        }
    },

    setupTaskFormListeners: function(form) {
        // Əmək haqqı hesablanması
        const durationInput = form.querySelector('[name="duration_minutes"]');
        const hourlyRateInput = form.querySelector('[name="hourly_rate"]');
        const calculatedCostInput = form.querySelector('[name="calculated_cost"]');

        if (durationInput && hourlyRateInput && calculatedCostInput) {
            const calculateCost = () => {
                const duration = parseFloat(durationInput.value) || 0;
                const hourlyRate = parseFloat(hourlyRateInput.value) || 0;
                const hours = duration / 60;
                const cost = hours * hourlyRate;
                calculatedCostInput.value = cost.toFixed(2);
            };

            durationInput.addEventListener('input', calculateCost);
            hourlyRateInput.addEventListener('input', calculateCost);
        }

        // İcraçı dəyişdikdə şöbəni avtomatik doldur
        const executorSelect = form.querySelector('#executorSelect');
        if (executorSelect) {
            executorSelect.addEventListener('change', async (event) => {
                await this.handleExecutorChange(event);
                await this.autoFillDepartmentFromEmployee(event.target.value);
            });
        }

        // Şöbə dəyişdikdə (heç bir şey etmir - iş növləri şirkətə bağlıdır)
        const departmentSelect = form.querySelector('#departmentSelect');
        if (departmentSelect) {
            departmentSelect.addEventListener('change', async () => {
                // Şöbə dəyişəndə heç bir şey etmirik - iş növləri şirkətə bağlıdır
            });
        }

        // Form yükləndikdə iş növlərini yüklə
        setTimeout(async () => {
            await this.loadWorkTypes();
        }, 1000);
    },

    handleStatusChange: function(event) {
        const completedAtInput = document.getElementById('completedAtInput');

        if (completedAtInput) {
            if (event.target.value === 'completed') {
                const now = new Date();
                const formattedDate = now.toISOString().slice(0, 16);
                completedAtInput.value = formattedDate;
                completedAtInput.readOnly = true;
            } else {
                completedAtInput.value = '';
                completedAtInput.readOnly = false;
            }
        }
    },

    async handleExecutorChange(event) {
        const employeeId = event.target ? event.target.value : event;
        const hourlyRateInput = document.getElementById('hourlyRateInput');

        if (employeeId && hourlyRateInput) {
            try {
                // Əvvəlcə cache yoxla
                let employeeData = null;
                if (window.taskManager && window.taskManager.employeeCache) {
                    employeeData = window.taskManager.employeeCache[employeeId];
                }

                // Əgər cache-də yoxdursa, API-dən gətir
                if (!employeeData) {
                    const response = await this.apiRequest(`/users/${employeeId}`, 'GET');
                    if (response && !response.error) {
                        employeeData = response.data || response;

                        // Cache-ə yadda saxla
                        if (window.taskManager) {
                            if (!window.taskManager.employeeCache) {
                                window.taskManager.employeeCache = {};
                            }
                            window.taskManager.employeeCache[employeeId] = employeeData;
                        }
                    }
                }

                if (employeeData && employeeData.hourly_rate !== undefined) {
                    hourlyRateInput.value = parseFloat(employeeData.hourly_rate).toFixed(2);
                    this.calculateSalary();
                }
            } catch (error) {
                console.error('❌ İşçinin saatlıq əmək haqqı yüklənərkən xəta:', error);
            }
        }
    },

    // ==================== DEPARTMENT & WORK TYPE FUNCTIONS ====================
    async autoFillDepartmentFromEmployee(employeeId) {
        try {
            if (!employeeId) return;

            const departmentSelect = document.getElementById('departmentSelect');
            if (!departmentSelect) return;

            console.log(`👤 İşçi seçildi, şöbə avtomatik doldurulur: ${employeeId}`);

            // 1. Cache-dən işçi məlumatlarını gətir
            let employeeData = null;

            // Əvvəlcə local cache yoxla
            if (window.taskManager && window.taskManager.employeeCache) {
                employeeData = window.taskManager.employeeCache[employeeId];
            }

            // Əgər cache-də yoxdursa, API-dən gətir
            if (!employeeData) {
                const response = await this.apiRequest(`/users/${employeeId}`, 'GET');
                if (response && !response.error) {
                    employeeData = response.data || response;

                    // Cache-ə yadda saxla
                    if (window.taskManager) {
                        if (!window.taskManager.employeeCache) {
                            window.taskManager.employeeCache = {};
                        }
                        window.taskManager.employeeCache[employeeId] = employeeData;
                    }
                }
            }

            if (employeeData && employeeData.department_id) {
                const departmentId = employeeData.department_id;

                // 2. Şöbə select-i avtomatik doldur
                departmentSelect.value = departmentId;
                console.log(`✅ Şöbə avtomatik dolduruldu: ${departmentId}`);

                // 3. Əgər mövcud şöbə options-da yoxdursa, əlavə et
                if (!departmentSelect.querySelector(`option[value="${departmentId}"]`)) {
                    const departmentName = employeeData.department_name ||
                                          employeeData.department?.name ||
                                          `Şöbə ${departmentId}`;

                    const option = document.createElement('option');
                    option.value = departmentId;
                    option.textContent = departmentName;
                    departmentSelect.appendChild(option);
                    console.log(`📝 Yeni şöbə əlavə edildi: ${departmentName}`);
                }

                // İŞ NÖVLƏRİ YENİLƏNMİR - ÇÜNKÜ İŞ NÖVLƏRİ ŞİRKƏTƏ BAĞLIDIR

            } else {
                console.log('⚠️ İşçidə şöbə məlumatı yoxdur');
                // Şöbəni sıfırla
                departmentSelect.value = '';
            }

        } catch (error) {
            console.error('❌ Şöbə avtomatik dolma xətası:', error);
        }
    },

    // ŞİRKƏTİN BÜTÜN İŞ NÖVLƏRİNİ GƏTİR
    async getCompanyWorkTypes() {
        try {
            console.log('📝 Şirkətin bütün iş növləri yüklənir...');

            // Cari şirkət ID-sini al - YENİ ÜSUL
            let companyId = null;

            // 1. Əvvəlcə token-dan gətir
            const token = localStorage.getItem('guven_token') || localStorage.getItem('token');
            if (token) {
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    if (payload.company_id) {
                        companyId = payload.company_id;
                        console.log(`🏢 Şirkət ID (token-dan): ${companyId}`);
                    }
                } catch (e) {
                    console.log('⚠️ Token parse xətası:', e);
                }
            }

            // 2. Əgər token-dan gəlmədiyisə, taskManager-dan yoxla
            if (!companyId && window.taskManager && window.taskManager.userData) {
                companyId = window.taskManager.userData.companyId;
                console.log(`🏢 Şirkət ID (taskManager-dan): ${companyId}`);
            }

            // 3. Əgər hələ də yoxdursa, userData-dan yoxla
            if (!companyId && window.taskManager && window.taskManager.userData && window.taskManager.userData.companyId) {
                companyId = window.taskManager.userData.companyId;
                console.log(`🏢 Şirkət ID (userData-dan): ${companyId}`);
            }

            // 4. Əgər hələ də yoxdursa, localStorage-dan yoxla
            if (!companyId) {
                const userDataStr = localStorage.getItem('user_data');
                if (userDataStr) {
                    try {
                        const userData = JSON.parse(userDataStr);
                        companyId = userData.company_id || userData.companyId;
                        console.log(`🏢 Şirkət ID (localStorage-dan): ${companyId}`);
                    } catch (e) {
                        console.log('⚠️ localStorage parse xətası:', e);
                    }
                }
            }

            if (!companyId) {
                console.warn('⚠️ Şirkət ID-si tapılmadı, cəhd davam edir...');
                // Əgər heç yerdən tapılmadısa, default dəyər istifadə et
                companyId = 50; // Default şirkət ID (logda görünür)
                console.log(`🏢 Default şirkət ID istifadə edilir: ${companyId}`);
            }

            let worktypes = [];

            // 1. ƏVVƏLCƏ ŞİRKƏT ÜÇÜN XÜSUSİ ENDPOINT
            try {
                console.log(`🔄 /worktypes/company/${companyId} endpoint-i sınanır...`);
                const response = await this.apiRequest(
                    `/worktypes/company/${companyId}`,
                    'GET'
                );

                // Response formatını yoxla
                if (Array.isArray(response)) {
                    worktypes = response;
                    console.log(`✅ Şirkət iş növləri tapıldı: ${worktypes.length} iş növü`);
                } else if (response && response.data && Array.isArray(response.data)) {
                    worktypes = response.data;
                    console.log(`✅ Şirkət iş növləri tapıldı: ${worktypes.length} iş növü`);
                } else {
                    console.log('⚠️ Şirkət endpoint-i işlədi, lakin format tanınmadı');
                }

            } catch (error) {
                console.log(`🔄 Şirkət endpoint-i işləmədi: ${error.message}`);
            }

            // 2. ƏGƏR ŞİRKƏT ENDPOINT-I İŞLƏMƏDİSƏ, BÜTÜN İŞ NÖVLƏRİNİ GƏTİR
            if (worktypes.length === 0) {
                try {
                    console.log('🔄 /worktypes endpoint-i sınanır...');
                    const response = await this.apiRequest('/worktypes', 'GET');

                    if (Array.isArray(response)) {
                        // Əgər company_id varsa, filter et
                        worktypes = response.filter(wt => !wt.company_id || wt.company_id == companyId);
                        console.log(`✅ Ümumi endpoint-dən filtirlənmiş: ${worktypes.length} iş növü`);
                    } else if (response && response.data && Array.isArray(response.data)) {
                        worktypes = response.data.filter(wt => !wt.company_id || wt.company_id == companyId);
                        console.log(`✅ Ümumi endpoint-dən filtirlənmiş: ${worktypes.length} iş növü`);
                    } else {
                        // Əgər format fərqlidirsə, nə gəlibsə onu götür
                        console.log('⚠️ Ümumi endpoint formatı fərqli');
                    }
                } catch (error) {
                    console.log(`🔄 Ümumi endpoint də işləmədi: ${error.message}`);
                }
            }


            console.log(`📊 Şirkət üçün ${worktypes.length} iş növü tapıldı`);
            return worktypes;

        } catch (error) {
            console.error('❌ Şirkət iş növləri yüklənərkən xəta:', error);
            return [];
        }
    },

    // İŞ NÖVLƏRİNİ DROPDOWN-A YÜKLƏ
    async loadWorkTypes() {
        try {
            const taskTypeSelect = document.getElementById('taskTypeSelect');
            if (!taskTypeSelect) {
                console.warn('⚠️ taskTypeSelect elementi tapılmadı');
                return;
            }

            console.log('📝 Şirkət iş növləri dropdown-a yüklənir...');

            // Şirkətin bütün iş növlərini gətir
            const workTypes = await this.getCompanyWorkTypes();

            // Select-i yenilə
            const currentValue = taskTypeSelect.value;
            taskTypeSelect.innerHTML = '<option value="">İş növü seçin</option>';

            if (workTypes.length === 0) {
                const option = document.createElement('option');
                option.value = "";
                option.textContent = "İş növü tapılmadı";
                taskTypeSelect.appendChild(option);
                console.log('⚠️ İş növü tapılmadı');
                return;
            }

            // İş növlərini əlavə et
            workTypes.forEach(workType => {
                const option = document.createElement('option');
                option.value = workType.id;
                option.textContent = workType.work_type_name || workType.name || `İş növü ${workType.id}`;
                taskTypeSelect.appendChild(option);
            });

            // Köhnə dəyəri saxla
            if (currentValue && taskTypeSelect.querySelector(`option[value="${currentValue}"]`)) {
                taskTypeSelect.value = currentValue;
            }

            console.log(`✅ ${workTypes.length} iş növü dropdown-a yükləndi`);

            // Həmçinin filter iş növü select-ini də doldur
            this.populateFilterWorkTypeSelect(workTypes);

        } catch (error) {
            console.error('❌ İş növləri yüklənərkən xəta:', error);
            const taskTypeSelect = document.getElementById('taskTypeSelect');
            if (taskTypeSelect) {
                taskTypeSelect.innerHTML = '<option value="">Xəta baş verdi</option>';
            }
        }
    },

    // Filter iş növü select-ini doldur
    populateFilterWorkTypeSelect(workTypes) {
        const filterTaskTypeSelect = document.getElementById('filterTaskTypeSelect');
        if (!filterTaskTypeSelect) return;

        let html = '<option value="">Hamısı</option>';

        workTypes.forEach(workType => {
            const name = workType.work_type_name || workType.name || `İş növü ${workType.id}`;
            html += `<option value="${workType.id}">${name}</option>`;
        });

        filterTaskTypeSelect.innerHTML = html;
        console.log(`✅ Filter iş növü select-i dolduruldu: ${workTypes.length} iş növü`);
    },

    // ==================== FILTER FORM FUNCTIONS ====================
    setupFilterForm: function() {
        const filterForm = document.getElementById('filterForm');
        if (!filterForm) return;

        // Filter form submit
        filterForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = new FormData(filterForm);
            const filters = Object.fromEntries(formData.entries());

            // Cari şirkət ID-sini əlavə et
            if (window.taskManager && window.taskManager.currentUserCompanyId) {
                filters.company_id = window.taskManager.currentUserCompanyId;
            }

            // Boş dəyərləri sil
            Object.keys(filters).forEach(key => {
                if (!filters[key]) {
                    delete filters[key];
                }
            });

            window.taskManager.filters.active = filters;
            window.taskManager.pagination.active.page = 1;

            await window.taskManager.loadActiveTasks(1, false);

            // Modal bağla
            if (window.ModalManager && window.ModalManager.close) {
                window.ModalManager.close('filterModal');
            } else {
                const modal = document.getElementById('filterModal');
                if (modal) {
                    modal.style.display = 'none';
                }
            }
        });
    },

    // ==================== HELPER FUNCTIONS ====================
    calculateSalary: function() {
        const durationInput = document.getElementById('durationInput');
        const hourlyRateInput = document.getElementById('hourlyRateInput');
        const calculatedCostInput = document.getElementById('calculatedCostInput');

        if (durationInput && hourlyRateInput && calculatedCostInput) {
            const duration = parseFloat(durationInput.value) || 0;
            const hourlyRate = parseFloat(hourlyRateInput.value) || 0;
            const hours = duration / 60;
            const cost = hours * hourlyRate;
            calculatedCostInput.value = cost.toFixed(2);
        }
    },

    resetTaskForm: function() {
        const form = document.getElementById('taskForm');
        if (form) {
            form.reset();

            // Xüsusi inputları sıfırla
            const hourlyRateInput = document.getElementById('hourlyRateInput');
            const calculatedCostInput = document.getElementById('calculatedCostInput');

            if (hourlyRateInput) hourlyRateInput.value = '';
            if (calculatedCostInput) calculatedCostInput.value = '';

            // Select-ləri default-a qaytar
            const selects = form.querySelectorAll('select');
            selects.forEach(select => {
                select.selectedIndex = 0;
            });

            // İş növlərini yenidən yüklə
            this.loadWorkTypes();
        }
    },

    populateTaskForm: function(taskData) {
        try {
            const form = document.getElementById('taskForm');
            if (!form || !taskData) return;

            // Form field-lərini doldur
            const fields = {
                'companySelect': 'company_id',
                'executorSelect': 'executor_user_id',
                'departmentSelect': 'department_id',
                'taskTypeSelect': 'task_type_id',
                'descriptionInput': 'description',
                'notesInput': 'notes',
                'dueAtInput': 'due_date',
                'durationInput': 'duration_minutes',
                'hourlyRateInput': 'hourly_rate',
                'calculatedCostInput': 'calculated_cost'
            };

            Object.entries(fields).forEach(([fieldId, dataKey]) => {
                const field = document.getElementById(fieldId);
                if (field && taskData[dataKey] !== undefined && taskData[dataKey] !== null) {
                    field.value = taskData[dataKey];
                }
            });

            // Status select-i
            const statusSelect = document.getElementById('statusSelect');
            if (statusSelect && taskData.status) {
                statusSelect.value = taskData.status;
                this.handleStatusChange({ target: statusSelect });
            }

            console.log('✅ Form task məlumatları ilə dolduruldu');

        } catch (error) {
            console.error('❌ Form doldurularkən xəta:', error);
        }
    },

   

    // ==================== VALIDATION FUNCTIONS ====================
    validateTaskForm: function() {
        const form = document.getElementById('taskForm');
        if (!form) return { isValid: false, errors: [] };

        const errors = [];
        const requiredFields = [
            { id: 'companySelect', name: 'Şirkət' },
            { id: 'executorSelect', name: 'İcraçı' },
            { id: 'taskTypeSelect', name: 'İş növü' },
            { id: 'descriptionInput', name: 'Açıqlama' },
            { id: 'dueAtInput', name: 'Son tarix' }
        ];

        requiredFields.forEach(field => {
            const element = document.getElementById(field.id);
            if (element && !element.value.trim()) {
                errors.push(`${field.name} seçilməyib`);
            }
        });

        // Duration validation
        const durationInput = document.getElementById('durationInput');
        if (durationInput && durationInput.value) {
            const duration = parseFloat(durationInput.value);
            if (isNaN(duration) || duration < 0) {
                errors.push('Müddət düzgün daxil edilməyib');
            }
        }

        // Hourly rate validation
        const hourlyRateInput = document.getElementById('hourlyRateInput');
        if (hourlyRateInput && hourlyRateInput.value) {
            const rate = parseFloat(hourlyRateInput.value);
            if (isNaN(rate) || rate < 0) {
                errors.push('Saatlıq əmək haqqı düzgün daxil edilməyib');
            }
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
};

// Global export
if (typeof window !== 'undefined') {
    window.FormManager = FormManager;
}

// Auto initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    if (window.FormManager && window.FormManager.initialize) {
        window.FormManager.initialize();
    }
});

console.log('📝 FormManager script loaded');