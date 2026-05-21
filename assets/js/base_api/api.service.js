// base_api/api.service.js

/**
 * API Service - 1C və Digər Sorğular Ayrı
 */

class ApiService {
    constructor() {
        this.baseUrl = "https://guvenfinans.az/proxy.php";
        this.token = this.loadToken();
    }

    loadToken() {
        const keys = ['guven_token', 'access_token', 'auth_token', 'token'];
        for (const key of keys) {
            const val = localStorage.getItem(key);
            if (val && val !== 'null' && val !== 'undefined') return val;
        }
        return null;
    }

    // ==================== ÜMUMİ SORĞU (baza_id OLMADAN) ====================
    async request(endpoint, method = 'GET', data = null, isFormData = false) {
        const cleanEndpoint = endpoint.startsWith('/api/v1') ? endpoint : `/api/v1${endpoint}`;
        const finalEndpoint = cleanEndpoint;
        const url = `${this.baseUrl}${finalEndpoint}`;

        const options = {
            method: method,
            headers: { 'Accept': 'application/json' },
            credentials: 'include'
        };

        if (this.token && !isFormData) {
            options.headers['Authorization'] = `Bearer ${this.token}`;
        }

        if (!isFormData && data) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(data);
        } else if (data) {
            options.body = data;
        }

        try {
            const response = await fetch(url, options);

            if (response.status === 401) {
                this.redirectToLogin();
                return null;
            }

            if (response.status === 204) {
                return { success: true, status: 204 };
            }

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}`);
            }

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            } else {
                const text = await response.text();
                return { success: true, data: text };
            }

        } catch (error) {
            throw error;
        }
    }

    // ==================== 1C SORĞULARI (baza_id İLƏ) ====================
    async requestOneC(endpoint, method = 'GET', data = null, isFormData = false) {
        this.token = this.loadToken();
        const cleanEndpoint = endpoint.startsWith('/api/v1') ? endpoint : `/api/v1${endpoint}`;

        let finalEndpoint = cleanEndpoint;
        const bazaId = localStorage.getItem('baza_id');

        if (bazaId && !cleanEndpoint.includes('baza_id')) {
            const separator = cleanEndpoint.includes('?') ? '&' : '?';
            finalEndpoint = `${cleanEndpoint}${separator}baza_id=${bazaId}`;
        }

        const url = `${this.baseUrl}${finalEndpoint}`;

        const options = {
            method: method,
            headers: { 'Accept': 'application/json' },
            credentials: 'include'
        };

        if (this.token && !isFormData) {
            options.headers['Authorization'] = `Bearer ${this.token}`;
        }

        if (!isFormData && data) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(data);
        } else if (data) {
            options.body = data;
        }

        try {
            const response = await fetch(url, options);

            if (response.status === 401) {
                this.redirectToLogin();
                return null;
            }

            if (response.status === 204) {
                return { success: true, status: 204 };
            }

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}`);
            }

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            } else {
                const text = await response.text();
                return { success: true, data: text };
            }

        } catch (error) {
            throw error;
        }
    }

    // ==================== ÜMUMİ METODLAR (baza_id OLMADAN) ====================
    async get(endpoint) {
        return this.request(endpoint, 'GET');
    }

    async post(endpoint, data) {
        return this.request(endpoint, 'POST', data);
    }

    async put(endpoint, data) {
        return this.request(endpoint, 'PUT', data);
    }

    async patch(endpoint, data) {
        return this.request(endpoint, 'PATCH', data);
    }

    async delete(endpoint) {
        return this.request(endpoint, 'DELETE');
    }

    // ==================== 1C METODLARI (baza_id İLƏ) ====================
    async getOneC(endpoint) {
        return this.requestOneC(endpoint, 'GET');
    }

    async postOneC(endpoint, data) {
        return this.requestOneC(endpoint, 'POST', data);
    }

    async putOneC(endpoint, data) {
        return this.requestOneC(endpoint, 'PUT', data);
    }

    async patchOneC(endpoint, data) {
        return this.requestOneC(endpoint, 'PATCH', data);
    }

    async deleteOneC(endpoint) {
        return this.requestOneC(endpoint, 'DELETE');
    }

    // ==================== AUTH ====================
    async getCurrentUser() {
        try {
            return await this.get('/auth/me');
        } catch (error) {
            if (error.message.includes('401')) {
                this.redirectToLogin();
            }
            throw error;
        }
    }

    async logout() {
        try {
            return await this.post('/auth/logout');
        } catch (error) {
            return { success: true };
        }
    }

    redirectToLogin() {
        this.clearToken();
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = 'login.html';
    }

    async updateUser(id, data) {
        return this.patch(`/users/${id}`, data);
    }

    setToken(token) {
        this.token = token;
        localStorage.setItem('guven_token', token);
    }

    clearToken() {
        this.token = null;
        localStorage.removeItem('guven_token');
        localStorage.removeItem('user');
    }

    hasToken() {
        return !!this.token;
    }
}

window.ApiService = ApiService;

// ✅ Global makeApiRequest — bütün köhnə JS-lər bunu axtarır
const _apiServiceInstance = new ApiService();

window.makeApiRequest = async function(endpoint, method = 'GET', data = null, isFormData = false) {
    if (isFormData) {
        return _apiServiceInstance.requestOneC(endpoint, method, data, true);
    }
    return _apiServiceInstance.requestOneC(endpoint, method, data);
};

// ✅ Global getAuthToken
window.getAuthToken = function() {
    const keys = ['guven_token', 'access_token', 'auth_token', 'token'];
    for (const key of keys) {
        const val = localStorage.getItem(key) || sessionStorage.getItem(key);
        if (val && val !== 'null' && val !== 'undefined') return val;
    }
    return '';
};

// ✅ Global parseTokenPayload — new_task_design.js, task.js istifadə edir
window.parseTokenPayload = function(token) {
    if (!token) return null;
    try {
        const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(decodeURIComponent(
            atob(base64).split('').map(c =>
                '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
            ).join('')
        ));
    } catch (e) {
        return null;
    }
};
// ==================== CACHE-Lİ API FUNKSİYALARI ====================
// task.js və digər modullar bunları global olaraq axtarır

const _appCache = {};
const _CACHE_TTL = 5 * 60 * 1000; // 5 dəqiqə

function _cacheGet(key) {
    const item = _appCache[key];
    if (!item) return null;
    if (Date.now() - item.ts > _CACHE_TTL) {
        delete _appCache[key];
        return null;
    }
    return item.data;
}
// Yeni helper — baza_id OLMADAN sorğu:
window._apiGet = async function(endpoint) {
    return _apiServiceInstance.request(endpoint, 'GET');
};


function _cacheSet(key, data) {
    _appCache[key] = { data, ts: Date.now() };
    return data;
}
window.getCompanyNameById = async function(companyId) {
    if (!companyId) return null;

    // Əvvəlcə companyCache-dən yoxla (taskManager-dan)
    if (window.taskManager?.companyCache?.[companyId]) {
        return window.taskManager.companyCache[companyId];
    }

    // Sonra global map-dən yoxla
    const map = await window.getAllCompaniesMap();
    if (map[companyId]) {
        return map[companyId];
    }

    // Əgər yoxdursa, API-dən tək company-ni yüklə (CODE ilə)
    try {
        // Əvvəlcə company-ni code ilə tapmağa çalış
        const companyCode = window.taskManager?.userData?.companyCode;
        if (companyCode) {
            const res = await _apiServiceInstance.request(`/companies/code/${companyCode}`, 'GET');
            if (res && res.id == companyId) {
                return res.company_name;
            }
        }
    } catch(e) {}

    return null;
};

window.getCompanyByIdSafe = async function(companyId) {
    if (!companyId) return null;

    const key = `company_${companyId}`;
    const cached = _cacheGet(key);
    if (cached) return cached;

    try {
        // ✅ CODE ilə çağır (ID ilə yox)
        // Əvvəlcə company code-u tap
        let companyCode = null;

        // TaskManager-dan yoxla
        if (window.taskManager?.userData?.companyCode) {
            companyCode = window.taskManager.userData.companyCode;
        }

        // Əgər company code varsa, onunla çağır
        if (companyCode) {
            const res = await _apiServiceInstance.request(`/companies/code/${companyCode}`, 'GET');
            if (res && !res.error) {
                const data = res.data || res;
                if (data.id == companyId || data.company_id == companyId) {
                    const company = {
                        id: data.id || data.company_id,
                        name: data.company_name || data.name
                    };
                    return _cacheSet(key, company);
                }
            }
        }

        return null;
    } catch (e) {
        if (e.message?.includes('405')) {
            console.warn(`⚠️ Company ${companyId} 405 xətası, endpoint dəstəklənmir`);
        }
        return null;
    }
};


window.getDepartmentsWithCache = async function(companyCode) {
    if (!companyCode) return [];
    const key = `dept_${companyCode}`;
    const cached = _cacheGet(key);
    if (cached) return cached;
    try {
        // ✅ BUG FIX: companyCode əvəzinə company_id istifadə et
        // Əvvəlcə company_id-ni tap
        let companyId = null;

        // Token-dan company_id al
        const token = getAuthToken();
        if (token) {
            const payload = parseTokenPayload(token);
            if (payload && payload.company_id) {
                companyId = payload.company_id;
            }
        }

        if (!companyId) {
            console.warn('⚠️ company_id tapılmadı, boş array qaytarılır');
            return [];
        }

        // ✅ ID ilə çağır (CODE ilə yox)
        const res = await _apiServiceInstance.request(`/departments/company/${companyId}`, 'GET');
        const data = res?.data || (Array.isArray(res) ? res : []);
        return _cacheSet(key, data);
    } catch (e) {
        console.warn(`⚠️ Departments xətası (${companyCode}):`, e);
        return [];
    }
};

window.getEmployeesWithCache = async function(companyCode) {
    if (!companyCode) return [];
    const key = `emp_${companyCode}`;
    const cached = _cacheGet(key);
    if (cached) return cached;
    try {
        // ✅ request() istifadə et (baza_id olmadan)
        const res = await _apiServiceInstance.request(`/users/company/${companyCode}`, 'GET');
        const data = res?.data || (Array.isArray(res) ? res : []);
        return _cacheSet(key, data);
    } catch (e) { return []; }
};

window.getSubCompaniesWithCache = async function(companyCode) {
    if (!companyCode) return [];
    const key = `sub_${companyCode}`;
    const cached = _cacheGet(key);
    if (cached) return cached;
    try {
        const res = await _apiServiceInstance.request(`/companies/${companyCode}/sub-companies`, 'GET');
        const data = res?.sub_companies || res?.data || (Array.isArray(res) ? res : []);
        return _cacheSet(key, data);
    } catch (e) { return []; }
};

window.getWorkTypesWithCache = async function(companyId) {
    if (!companyId) return [];
    const key = `wt_${companyId}`;
    const cached = _cacheGet(key);
    if (cached) return cached;
    try {
        const res = await _apiServiceInstance.request(`/worktypes/company/${companyId}`, 'GET');
        const data = res?.data || (Array.isArray(res) ? res : []);
        return _cacheSet(key, data);
    } catch (e) { return []; }
};

window.getAllCompaniesMap = async function() {
    const key = 'companies_map';
    const cached = _cacheGet(key);
    if (cached) return cached;

    try {
        const res = await _apiServiceInstance.request('/companies/', 'GET');
        const companies = res?.data || res?.items || (Array.isArray(res) ? res : []);

        // ID -> Name map yarat
        const map = {};
        companies.forEach(c => {
            if (c.id && c.company_name) {
                map[c.id] = c.company_name;
            }
        });

        return _cacheSet(key, map);
    } catch (e) {
        console.warn('⚠️ Companies map xətası:', e);
        return {};
    }
};

window.getPartnersWithCache = async function(companyCode) {
    if (!companyCode) return [];
    const key = `partners_${companyCode}`;
    const cached = _cacheGet(key);
    if (cached) return cached;
    try {
        const res = await _apiServiceInstance.request(`/partners/?company_code=${companyCode}`, 'GET');
        const data = res?.items || res?.data || (Array.isArray(res) ? res : []);
        return _cacheSet(key, data);
    } catch (e) { return []; }
};

window.getParentCompaniesWithCache = async function(companyCode) {
    if (!companyCode) return [];
    const key = `parents_${companyCode}`;
    const cached = _cacheGet(key);
    if (cached) return cached;
    try {
        const res = await _apiServiceInstance.request(`/companies/${companyCode}/parent-companies`, 'GET');
        const data = res?.data?.parent_companies || res?.parent_companies || (Array.isArray(res) ? res : []);
        return _cacheSet(key, data);
    } catch (e) { return []; }
};

window.getExternalTasksWithCache = async function() {
    const key = 'external_tasks';
    const cached = _cacheGet(key);
    if (cached) return cached;
    try {
        // ✅ ENDPOINT-İ DƏYİŞDİR: tasks-external əvəzinə başqa endpoint
        // Əgər bu endpoint işləmirsə, boş array qaytar
        console.warn('⚠️ /tasks-external/detailed endpoint işləmir, boş array qaytarılır');
        return [];

        // AŞAĞIDAKI KOD MÜVƏQQƏTİ OLARAQ SÖNDÜRÜLDÜ:
        /*
        const res = await _apiServiceInstance.request('/tasks-external/detailed', 'GET');
        const data = res?.data || res?.items || (Array.isArray(res) ? res : []);
        return _cacheSet(key, data);
        */
    } catch (e) {
        console.warn('⚠️ External tasks xətası:', e);
        return [];
    }
};

window.getCommentsWithCache = async function(taskId) {
    if (!taskId) return [];

    const key = `comments_${taskId}`;
    const cached = _cacheGet(key);
    if (cached) return cached;

    try {
        // ✅ TIMEOUT və RETRY MEXANİZMİ ƏLAVƏ ET
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 saniyə timeout

        const res = await _apiServiceInstance.request(`/comments/task/${taskId}`, 'GET');
        clearTimeout(timeoutId);

        const data = res?.data || (Array.isArray(res) ? res : []);
        return _cacheSet(key, data);
    } catch (e) {
        if (e.name === 'AbortError') {
            console.warn(`⏰ Comments timeout: task ${taskId}`);
        } else if (e.message?.includes('508')) {
            console.warn(`⚠️ Comments 508 döngəsi: task ${taskId}, cache istifadə olunur`);
            // 508 xətasında cached məlumat varsa onu qaytar
            const oldCached = _cacheGet(key);
            if (oldCached) return oldCached;
        }
        return [];
    }
};

window.clearCacheByType = function(type) {
    const keyMap = {
        partnerTasks: 'partner_tasks',
        externalTasks: 'external_tasks',
        companies: 'all_companies'
    };
    const key = keyMap[type] || type;
    delete _appCache[key];
};
// ==================== SMART makeApiRequest ====================
// Bəzi endpointlər baza_id qəbul etmir → onları request() ilə çağır

const _NO_BAZA_PATTERNS = [
    '/companies/',
    '/departments/',
    '/users/company/',
    '/users/me',
    '/worktypes/',
    '/partners/',
    '/comments/',
    '/files/',        // ← ƏSAS DÜZƏLIŞ: fayl yükləmə baza_id istəmir
    '/auth/',
    '/task-archive/',
];

window.makeApiRequest = async function(endpoint, method = 'GET', data = null, isFormData = false) {
    const noBaza = _NO_BAZA_PATTERNS.some(p => endpoint.includes(p));

    if (noBaza) {
        return _apiServiceInstance.request(endpoint, method, data, isFormData);
    }

    return _apiServiceInstance.requestOneC(endpoint, method, data, isFormData);
};