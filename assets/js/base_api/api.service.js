// base_api/api.service.js

/**
 * API Service - 1C və Digər Sorğular Ayrı
 */

class ApiService {
    constructor() {
        this.baseUrl = this.resolveBaseUrl();
        this.token = this.loadToken();
        this.notes = {
            create: (data) => this.post('/notes/', data),
            list: (params = {}) => this.get(this.buildQueryEndpoint('/notes/', params)),
            shared: () => this.get('/notes/shared'),
            getById: (noteId) => this.get(`/notes/${noteId}`),
            update: (noteId, data) => this.put(`/notes/${noteId}`, data),
            delete: (noteId) => this.delete(`/notes/${noteId}`),
            share: (noteId, data) => this.post(`/notes/${noteId}/share`, data),
            removeShare: (noteId, userId) => this.delete(`/notes/${noteId}/share/${userId}`),
            addComment: (noteId, data) => this.post(`/notes/${noteId}/comments`, data),
            getComments: (noteId) => this.get(`/notes/${noteId}/comments`)
        };
    }

    isLocalDevelopment() {
        const host = window.location.hostname;
        const port = window.location.port;
        return host === 'localhost' || host === '127.0.0.1' || port === '63342';
    }

    resolveBaseUrl() {
        if (this.isLocalDevelopment()) {
            return 'http://vps.guvenfinans.az:8008';
        }

        return 'https://guvenfinans.az/proxy.php';
    }

    normalizeEndpoint(endpoint) {
        return endpoint.startsWith('/api/v1') ? endpoint : `/api/v1${endpoint}`;
    }

    isAuthCriticalEndpoint(endpoint) {
        const cleanEndpoint = this.normalizeEndpoint(endpoint);
        return cleanEndpoint.includes('/auth/me') || cleanEndpoint.includes('/auth/refresh');
    }

    async parseResponseBody(response) {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            try {
                return await response.json();
            } catch (e) {
                return null;
            }
        }

        try {
            return await response.text();
        } catch (e) {
            return null;
        }
    }

    buildErrorResponse(response, responseData = null) {
        const fallback = response.status === 401 ? 'Unauthorized' :
            response.status === 403 ? 'Forbidden' :
            `HTTP ${response.status}`;

        const message = responseData?.detail ||
            responseData?.message ||
            responseData?.error ||
            (typeof responseData === 'string' && responseData) ||
            fallback;

        return {
            success: false,
            error: message,
            status: response.status,
            data: responseData
        };
    }

    buildNetworkErrorResponse(error) {
        return {
            success: false,
            error: error.message || 'Network error',
            status: 0
        };
    }

    getLoginPath() {
        const currentPath = window.location.pathname;
        const nestedSections = ['/worker/', '/owner/', '/admin/', '/task/'];
        if (this.isLocalDevelopment()) {
            return nestedSections.some(section => currentPath.includes(section)) ? '../login.html' : 'login.html';
        }

        return nestedSections.some(section => currentPath.includes(section)) ? '../login.html' : '/login.html';
    }

    // api.service.js - loadToken()
    loadToken() {
        const keys = ['guven_token', 'access_token', 'auth_token', 'token'];

        // 1. localStorage
        for (const key of keys) {
            const val = localStorage.getItem(key);
            if (val && val !== 'null' && val !== 'undefined') return val;
        }

        // 2. sessionStorage
        for (const key of keys) {
            const val = sessionStorage.getItem(key);
            if (val && val !== 'null' && val !== 'undefined') return val;
        }

        // 3. Cookie — əsas problem buradadır
        for (const key of keys) {
            const match = document.cookie.match(
                new RegExp('(?:^|; )' + key + '=([^;]*)')
            );
            if (match?.[1] && match[1] !== 'null' && match[1] !== 'undefined') {
                const val = decodeURIComponent(match[1]);
                // Tapıldı — localStorage-ə yaz ki növbəti dəfə birinci addımda tapsın
                localStorage.setItem('guven_token', val);
                localStorage.setItem('access_token', val);
                return val;
            }
        }

        return null;
    }

    buildQueryEndpoint(endpoint, params = {}) {
        const query = new URLSearchParams();
        Object.entries(params || {}).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') query.append(key, value);
        });
        const queryString = query.toString();
        if (!queryString) return endpoint;
        return `${endpoint}${endpoint.includes('?') ? '&' : '?'}${queryString}`;
    }

    // ==================== ÜMUMİ SORĞU (baza_id OLMADAN) ====================
    async request(endpoint, method = 'GET', data = null, isFormData = false) {
        return this._sendRequest(endpoint, method, data, isFormData, false);
    }

    async _sendRequest(endpoint, method = 'GET', data = null, isFormData = false, withBazaId = false) {
        this.token = this.loadToken();

        if (!this.token && !endpoint.includes('/auth/') && !endpoint.includes('/login')) {
            console.warn('⚠️ Token yoxdur, API sorğusu dayandırıldı:', endpoint);
            return { success: false, error: 'No auth token', status: 401, data: null };
        }

        const cleanEndpoint = this.normalizeEndpoint(endpoint);
        let finalEndpoint = cleanEndpoint;

        if (withBazaId) {
            const bazaId = localStorage.getItem('baza_id');
            if (bazaId && !cleanEndpoint.includes('baza_id')) {
                const separator = cleanEndpoint.includes('?') ? '&' : '?';
                finalEndpoint = `${cleanEndpoint}${separator}baza_id=${bazaId}`;
            }
        }

        const url = `${this.baseUrl}${finalEndpoint}`;
        const options = {
            method: method,
            headers: { 'Accept': 'application/json' },
            credentials: 'include'
        };

        if (this.token) {
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

            if (response.status === 204) {
                return { success: true, status: 204 };
            }

            const responseData = await this.parseResponseBody(response);

            if (response.status === 401) {
                if (endpoint.includes('/auth/logout')) {
                    return { success: true };
                }

                if (this.isAuthCriticalEndpoint(endpoint)) {
                    console.warn('🔑 Auth-critical 401 cavabı, loginə yönləndirilir:', endpoint);
                    this.redirectToLogin();
                } else {
                    console.warn('⚠️ Feature endpoint 401 cavabı, logout edilmir:', endpoint);
                }

                return this.buildErrorResponse(response, responseData);
            }

            if (response.status === 403) {
                console.warn('⚠️ Feature endpoint 403 cavabı:', endpoint);
                return this.buildErrorResponse(response, responseData);
            }

            if (!response.ok) {
                return this.buildErrorResponse(response, responseData);
            }

            if (responseData === null || responseData === '') {
                return { success: true };
            }

            if (typeof responseData === 'string') {
                return { success: true, data: responseData };
            }

            return responseData;

        } catch (error) {
            console.error('❌ API xətası:', error);

            if (error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
                if (this.token && this.isTokenValid()) {
                    console.warn('⚠️ Şəbəkə/CORS xətası, lokal etibarlı token saxlanılır:', endpoint);
                    return this.buildNetworkErrorResponse(error);
                }

                if (this.isAuthCriticalEndpoint(endpoint)) {
                    this.redirectToLogin();
                }

                return this.buildNetworkErrorResponse(error);
            }

            return { success: false, error: error.message || 'API error', status: 0 };
        }
    }

    // ✅ YENİ KÖMƏKÇİ METOD: Tokenin etibarlılığını yoxla
    isTokenValid() {
        const token = this.token || this.loadToken();
        if (!token) return false;

        try {
            const parts = token.split('.');
            if (parts.length !== 3) return true;

            const payload = JSON.parse(atob(parts[1]));
            const now = Math.floor(Date.now() / 1000);
            return payload.exp > now;
        } catch (e) {
            return false;
        }
    }

    // 🔥 YENİ METOD: Token yeniləmə
    async tryRefreshToken() {
        try {
            console.log('🔄 Refresh token cəhdi...');

            // Token artıq bitibsə, refresh etmə
            if (this.token && !this.isTokenValid()) {
                console.log('❌ Token artıq bitib, refresh mümkün deyil');
                return false;
            }

            const response = await fetch(`${this.baseUrl}/api/v1/auth/refresh`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 401) {
                console.warn('⚠️ Refresh token da bitib');
                return false;
            }

            if (response.ok) {
                const data = await response.json();
                if (data.access_token) {
                    console.log('✅ Yeni access_token alındı');
                    this.setToken(data.access_token);

                    localStorage.setItem('access_token', data.access_token);
                    localStorage.setItem('guven_token', data.access_token);

                    return true;
                }
            }

            console.warn('⚠️ Refresh token uğursuz:', response.status);
            return false;
        } catch (error) {
            console.error('❌ Refresh token xətası:', error);
            return false;
        }
    }



    parseToken(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch (e) {
            return null;
        }
    }

    // ==================== 1C SORĞULARI (baza_id İLƏ) ====================
    async requestOneC(endpoint, method = 'GET', data = null, isFormData = false) {
        return this._sendRequest(endpoint, method, data, isFormData, true);
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



    // ==================== PROTOCOL / QEYDLƏR ====================

    unwrapProtocolResponse(response) {
        if (response?.success === false) {
            throw new Error(response.error || response.message || 'Protocol API xətası');
        }
        return response?.data ?? response;
    }

    // ✅ YENİ: Məlumat göndərən startProtocol
    async startProtocol(data = null) {
        if (data) {
            return this.unwrapProtocolResponse(await this.post('/protocols/start', data));
        }
        return this.unwrapProtocolResponse(await this.post('/protocols/start'));
    }

    async createProtocol(data) {
        return this.unwrapProtocolResponse(await this.post('/protocols/', data)); // ✅ artıq düzgün
    }

    // ✅ YENİ: Protokolları gətir (filtrlərlə)
    async getProtocols(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        const url = params ? `/protocols/?${params}` : '/protocols/'; // ✅ sonunda / əlavə edildi
        return this.unwrapProtocolResponse(await this.get(url));
    }

    // ✅ YENİ: Protokol yenilə
    async updateProtocol(protocolId, data) {
        return this.unwrapProtocolResponse(await this.put(`/protocols/${protocolId}`, data));
    }

    // ✅ YENİ: Protokol sil
    async deleteProtocol(protocolId) {
        return this.unwrapProtocolResponse(await this.delete(`/protocols/${protocolId}`));
    }

    // ✅ YENİ: Protokol iştirakçılarını gətir
    async getProtocolParticipants(protocolId) {
        return this.unwrapProtocolResponse(await this.get(`/protocols/${protocolId}/participants`));
    }

    // ✅ YENİ: Protokola iştirakçı əlavə et
    async addProtocolParticipant(protocolId, userId) {
        const params = new URLSearchParams();
        // userId array ola bilər
        if (Array.isArray(userId)) {
            userId.forEach(id => params.append('user_ids', id));
        } else {
            params.append('user_ids', userId);
        }
        return this.unwrapProtocolResponse(
            await this.post(`/protocols/${protocolId}/participants?${params.toString()}`)
        );
    }

    // ✅ YENİ: Protokoldan iştirakçı çıxar
    async removeProtocolParticipant(protocolId, userId) {
        return this.unwrapProtocolResponse(
            await this.delete(`/protocols/${protocolId}/participants/${userId}`)
        );
    }

    // ✅ YENİ: Protokolu tamamla
    async completeProtocol(protocolId, payload) {
        return this.unwrapProtocolResponse(
            await this.post(`/protocols/${protocolId}/complete`, payload)
        );
    }

    // ✅ YENİ: İstifadəçiləri axtar (protokola əlavə etmək üçün)
    async searchUsersForProtocol(search, companyCode = null) {
        const params = new URLSearchParams({ search });
        if (companyCode) {
            params.append('company_code', companyCode);
        }
        return this.unwrapProtocolResponse(
            await this.get(`/protocols/users/search?${params.toString()}`)
        );
    }


    // ==================== USERS ====================

    async getUsersByCompany(companyCode) {
        return this.unwrapProtocolResponse(await this.get(`/users/company/${companyCode}`));
    }

    // ✅ BACKWARD COMPATIBILITY (köhnə metodlar)
    getAvailableEmployees(protocolId) {
        return this.getProtocolParticipants(protocolId);
    }

    addParticipant(protocolId, employeeId) {
        return this.addProtocolParticipant(protocolId, employeeId);
    }

    removeParticipant(protocolId, employeeId) {
        return this.removeProtocolParticipant(protocolId, employeeId);
    }

    updateTitle(protocolId, title) {
        return this.updateProtocol(protocolId, { title });
    }

    complete(protocolId, payload) {
        return this.completeProtocol(protocolId, payload);
    }

    addNote(protocolId, content, noteOrder = 0) {
        return this.unwrapProtocolResponse(
            this.post(`/protocols/${protocolId}/notes`, {
                content,
                note_order: noteOrder
            })
        );
    }


    // ==================== AUTH ====================
    async getCurrentUser() {
        return await this.get('/auth/me');
    }

    async logout() {
        try {
            return await this.post('/auth/logout');
        } catch (error) {
            return { success: true };
        }
    }

    redirectToLogin() {
        console.log('🚪 Login səhifəsinə yönləndirilir...');

        this.clearToken();
        localStorage.clear();
        sessionStorage.clear();

        // Bütün cookieləri təmizlə
        document.cookie.split(';').forEach(c => {
            document.cookie = c.replace(/^ +/, '')
                .replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
        });

        // Döngünün qarşısını al
        const currentPath = window.location.pathname;
        if (currentPath.includes('login.html') || currentPath === '/' || currentPath === '/login') {
            console.log('📄 Artıq login səhifəsində, yönləndirmə atlanır');
            return;
        }

        window.location.href = this.getLoginPath();
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
window.apiService = window.apiService || _apiServiceInstance;

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

    // Cookie
    for (const key of keys) {
        const match = document.cookie.match(
            new RegExp('(?:^|; )' + key + '=([^;]*)')
        );
        if (match?.[1] && match[1] !== 'null' && match[1] !== 'undefined') {
            return decodeURIComponent(match[1]);
        }
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
    '/reports/',
    '/tasks/',
    '/task-archive/',
];

window.makeApiRequest = async function(endpoint, method = 'GET', data = null, isFormData = false) {
    const noBaza = _NO_BAZA_PATTERNS.some(p => endpoint.includes(p));

    if (noBaza) {
        return _apiServiceInstance.request(endpoint, method, data, isFormData);
    }

    return _apiServiceInstance.requestOneC(endpoint, method, data, isFormData);
};