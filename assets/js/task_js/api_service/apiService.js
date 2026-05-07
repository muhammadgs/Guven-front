// apiService.js - OPTİMLƏŞDİRİLMİŞ VERSİYA
// Bütün endpointlar üçün cache dəstəyi, dublikat sorğular yoxdur

const API_BASE = "https://guvenfinans.az/proxy.php";

// ============ URL QURMA ============
function buildUrl(endpoint) {
    if (endpoint.startsWith('http')) return endpoint;
    let clean = endpoint.startsWith('/proxy.php')
        ? endpoint.replace('/proxy.php', '')
        : endpoint;
    if (!clean.startsWith('/api/v1')) clean = `/api/v1${clean}`;
    return `${API_BASE}${clean}`;
}

// ============ ƏSAS API SORĞUSU ============
async function makeApiRequest(endpoint, method = 'GET', data = null, requiresAuth = true) {
    console.group(`📡 API: ${method} ${endpoint}`);

    let token = null;
    if (requiresAuth) {
        token = getAuthToken();
        if (!token) {
            console.error('❌ Auth token yoxdur!');
            if (typeof AuthService !== 'undefined') {
                setTimeout(() => AuthService.redirectToLogin(), 1000);
            }
            console.groupEnd();
            return { error: 'No auth token', status: 401 };
        }
    }

    const isFormData = data instanceof FormData;
    const headers = { 'Accept': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!isFormData) headers['Content-Type'] = 'application/json';

    const url = buildUrl(endpoint);
    console.log('🌐 URL:', url);

    const options = { method, headers, credentials: 'include', mode: 'cors' };
    if (isFormData) delete options.headers['Content-Type'];

    if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
        options.body = isFormData ? data : JSON.stringify(data);
    }

    try {
        const response = await fetch(url, options);
        const responseText = await response.text();
        let responseData = {};

        if (responseText && responseText.trim() !== '') {
            try {
                responseData = JSON.parse(responseText);
            } catch (e) {
                if (response.ok) responseData = { text: responseText };
                else throw new Error(`JSON parse xətası: ${e.message}`);
            }
        }

        if (response.status === 401) {
            if (typeof AuthService !== 'undefined') {
                AuthService.showNotification('Sessiya bitdi. Yenidən daxil olun.', 'danger');
                AuthService.clearAuthData();
                setTimeout(() => AuthService.redirectToLogin(), 1500);
            } else {
                localStorage.removeItem('guven_token');
                sessionStorage.removeItem('guven_token');
                setTimeout(() => { window.location.href = '/login.html'; }, 1500);
            }
            console.groupEnd();
            return { error: 'Token müddəti bitmişdir', status: 401 };
        }

        if (!response.ok) {
            const msg = responseData?.detail || responseData?.message || responseData?.error || `HTTP ${response.status}`;
            console.groupEnd();
            return { error: msg, status: response.status, details: responseData };
        }

        // Response format normallaşdırma
        let result;
        if (responseData.success === true && responseData.task) {
            result = { success: true, data: responseData.task, id: responseData.task.id, status: response.status, raw: responseData };
        } else if (responseData.id && (responseData.task_title || responseData.title)) {
            result = { success: true, data: responseData, id: responseData.id, status: response.status, raw: responseData };
        } else if (responseData.data !== undefined) {
            result = { data: responseData.data, id: responseData.data?.id || null, status: response.status, raw: responseData };
        } else if (responseData.items !== undefined) {
            result = {
                data: responseData.items,
                pagination: { total: responseData.total || 0, page: responseData.page || 1, pages: responseData.pages || 1, page_size: responseData.page_size || 20 },
                status: response.status, raw: responseData
            };
        } else if (Array.isArray(responseData)) {
            result = { data: responseData, total: responseData.length, status: response.status, raw: responseData };
        } else {
            result = { data: responseData, id: responseData.id || null, status: response.status, raw: responseData };
        }

        console.groupEnd();
        return result;

    } catch (error) {
        console.error('❌ Fetch xətası:', error);
        console.groupEnd();
        return { error: error.message, status: 0, isNetworkError: error.name === 'TypeError' };
    }
}

// ============ TOKEN ============
function getAuthToken() {
    const local = localStorage.getItem('guven_token');
    if (local && !['null','undefined',''].includes(local)) return local;

    const session = sessionStorage.getItem('guven_token');
    if (session && !['null','undefined',''].includes(session)) {
        localStorage.setItem('guven_token', session);
        return session;
    }

    for (const cookie of document.cookie.split(';')) {
        const c = cookie.trim();
        for (const key of ['access_token=', 'guven_token=']) {
            if (c.startsWith(key)) {
                const t = c.substring(key.length);
                if (t && !['null','undefined',''].includes(t)) {
                    localStorage.setItem('guven_token', t);
                    return t;
                }
            }
        }
    }

    if (window.taskManager?.userData?.token) {
        const t = window.taskManager.userData.token;
        localStorage.setItem('guven_token', t);
        return t;
    }

    return null;
}

function parseTokenPayload(token) {
    if (!token) return null;
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(parts[1].length / 4) * 4, '=');
        const payload = JSON.parse(atob(b64));
        return {
            user_id: payload.sub || payload.user_id || payload.id,
            company_id: payload.company_id,
            company_code: payload.company_code,
            role: payload.role,
            name: payload.name,
            email: payload.email
        };
    } catch (e) { return null; }
}

function isTokenValid() {
    const token = getAuthToken();
    if (!token) return false;
    const payload = parseTokenPayload(token);
    if (!payload) return false;
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return false;
    return true;
}

async function refreshToken() {
    try {
        const response = await makeApiRequest('/auth/refresh', 'POST', null, false);
        if (response.data?.access_token) {
            localStorage.setItem('guven_token', response.data.access_token);
            return true;
        }
    } catch (e) {}
    return false;
}

// ============ PAGİNASİYA HELPER ============
function buildEndpointWithPagination(baseEndpoint, filters = {}, page = 1, pageSize = 20) {
    const params = new URLSearchParams({ page, page_size: pageSize });
    for (const [k, v] of Object.entries(filters)) {
        if (v !== undefined && v !== '' && v !== null) {
            params.append(k, Array.isArray(v) ? v.join(',') : (typeof v === 'object' ? JSON.stringify(v) : v));
        }
    }
    return `${baseEndpoint}?${params.toString()}`;
}

// ============ BİLDİRİŞ HELPERLARI ============
function showApiError(error, fallbackMessage = 'Xəta baş verdi') {
    const message = (typeof error === 'string' ? error : error?.error || error?.message || error?.detail || fallbackMessage);
    if (typeof notificationService !== 'undefined' && notificationService.showError) {
        notificationService.showError(message);
    } else if (typeof Swal !== 'undefined') {
        Swal.fire({ title: 'Xəta!', text: message, icon: 'error', toast: true, timer: 3000 });
    } else {
        alert('❌ ' + message);
    }
}

function showApiSuccess(message) {
    if (typeof notificationService !== 'undefined' && notificationService.showSuccess) {
        notificationService.showSuccess(message);
    } else if (typeof Swal !== 'undefined') {
        Swal.fire({ title: 'Uğurlu!', text: message, icon: 'success', toast: true, timer: 2000 });
    } else {
        alert('✅ ' + message);
    }
}

// ============================================================
// CACHE SİSTEMİ
// ============================================================

// ============================================================
// DÜZGÜN CACHE SİSTEMİ - company_id ilə
// ============================================================

const _apiCache = {
    store: new Map(),

    // ✅ Key format: "cacheType_companyId" və ya "cacheType_param1_param2"
    getKey(type, ...params) {
        if (params.length > 0) {
            return `${type}_${params.join('_')}`;
        }
        return type;
    },

    set(type, data, ttlMinutes = 5, ...params) {
        const key = this.getKey(type, ...params);
        this.store.set(key, { data, expires: Date.now() + ttlMinutes * 60 * 1000 });
        console.log(`💾 Cache yazıldı: ${key}, ${Array.isArray(data) ? data.length : 1} məlumat`);
    },

    get(type, ...params) {
        const key = this.getKey(type, ...params);
        const entry = this.store.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expires) {
            this.store.delete(key);
            console.log(`⏰ Cache vaxtı bitdi: ${key}`);
            return null;
        }
        console.log(`📦 Cache-dən oxundu: ${key}`);
        return entry.data;
    },

    clear(type, ...params) {
        if (params.length > 0) {
            const key = this.getKey(type, ...params);
            this.store.delete(key);
            console.log(`🗑️ Cache silindi: ${key}`);
        } else if (type) {
            // Type-a uyğun bütün key-ləri sil
            for (const [key, _] of this.store) {
                if (key.startsWith(type)) {
                    this.store.delete(key);
                }
            }
            console.log(`🗑️ Bütün ${type} cache-ləri silindi`);
        } else {
            this.store.clear();
            console.log(`🗑️ Bütün cache-lər silindi`);
        }
    }
};

// ============================================================
// CACHE İLƏ YÜKLƏMƏ - ƏSAS FUNKSIYA
// ============================================================

async function loadDataWithCache(loadFunction, cacheType, ttlMinutes = 5, ...cacheParams) {
    // 1. Memory cache yoxla (cacheParams ilə)
    const cached = _apiCache.get(cacheType, ...cacheParams);
    if (cached !== null) {
        return cached;
    }

    // 2. IndexedDB cache yoxla (cacheParams ilə)
    if (window.dbManager) {
        const dbKey = `${cacheType}_${cacheParams.join('_')}`;
        const isValid = await window.dbManager.isCacheValid(dbKey, ttlMinutes).catch(() => false);
        if (isValid) {
            const dbCached = await window.dbManager.loadData(dbKey).catch(() => null);
            if (dbCached && dbCached.length > 0) {
                console.log(`📦 IndexedDB cache-dən [${dbKey}]: ${dbCached.length} məlumat`);
                _apiCache.set(cacheType, dbCached, ttlMinutes, ...cacheParams);
                return dbCached;
            }
        }
    }

    // 3. API-dən yüklə
    console.log(`🌐 API-dən yüklənir [${cacheType}_${cacheParams.join('_')}]...`);
    const freshData = await loadFunction();

    // 4. Cache-ə yaz
    if (freshData !== null && freshData !== undefined) {
        _apiCache.set(cacheType, freshData, ttlMinutes, ...cacheParams);

        // IndexedDB-ə də yaz
        if (window.dbManager && Array.isArray(freshData) && freshData.length > 0) {
            const dbKey = `${cacheType}_${cacheParams.join('_')}`;
            await window.dbManager.saveData(dbKey, freshData, dbKey).catch(() => {});
        }
    }

    return freshData;
}


// ============================================================
// Cari İstifadəçi Məlumatlarını Etibarlı Şəkildə AL
// ============================================================

function getCurrentUserCompanyId() {
    // 1. Token-dan yoxla (ƏN ETİBARLISI)
    const token = localStorage.getItem('guven_token');
    if (token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload.company_id) {
                console.log(`🔐 Token-dan company_id: ${payload.company_id}`);
                return payload.company_id;
            }
        } catch(e) {}
    }

    // 2. taskManager-dan yoxla
    if (window.taskManager?.userData) {
        const companyId = window.taskManager.userData.companyId ||
                         window.taskManager.userData.company_id;
        if (companyId) {
            console.log(`🏢 taskManager-dan company_id: ${companyId}`);
            return companyId;
        }
    }

}



// ============================================================
// CACHE İLƏ HAZIR FUNKSİYALAR
// ============================================================

// 1. Aktiv tasklar (5 dəq) - /tasks/detailed
// ✅ DÜZGÜN - user_id ilə cache
async function getTasksWithCache(userId, statusList = null) {
    if (!userId) {
        console.error('❌ getTasksWithCache: user_id tələb olunur');
        return [];
    }

    const statusParam = statusList || 'pending,in_progress,overdue,waiting,pending_approval,paused';

    return loadDataWithCache(
        async () => {
            const res = await makeApiRequest(`/tasks/detailed?page=1&limit=100&status=${statusParam}&assigned_to=${userId}`, 'GET');
            return res?.data || res || [];
        },
        'tasks',                  // cache type
        5,                        // 5 dəqiqə TTL
        userId, statusParam       // ✅ cache params - user_id
    );
}

// 2. Partnyor siyahısı (10 dəq) - /partners/
async function getPartnersWithCache() {
    const companyCode = window.taskManager?.userData?.companyCode || 'SOC26001';
    return loadDataWithCache(async () => {
        const res = await makeApiRequest(`/partners/?company_code=${companyCode}`, 'GET');
        return res?.data?.items || res?.data || res || [];
    }, 'partners', 10);
}

// 3. External tasklar (5 dəq) - /tasks-external/
async function getExternalTasksWithCache() {
    return loadDataWithCache(async () => {
        const res = await makeApiRequest('/tasks-external/', 'GET');
        return res?.data || res || [];
    }, 'externalTasks', 5);
}

// 4. Partner tasklar (5 dəq) - /partner-tasks/detailed
async function getPartnerTasksWithCache() {
    return loadDataWithCache(async () => {
        const res = await makeApiRequest('/partner-tasks/detailed', 'GET');
        return res?.data || res || [];
    }, 'partnerTasks', 5);
}

// 5. Üst şirkətlər (30 dəq) - /companies/{code}/parent-companies
async function getParentCompaniesWithCache(companyCode) {
    const code = companyCode || window.taskManager?.userData?.companyCode;
    return loadDataWithCache(async () => {
        const res = await makeApiRequest(`/companies/${code}/parent-companies`, 'GET');
        const raw = res?.data || res;
        return raw?.parent_companies || raw || [];
    }, 'parentCompanies', 30);
}

// 6. İş növləri (30 dəq) - /worktypes/company/{id}
// ✅ DÜZGÜN - company_id ilə cache
async function getWorkTypesWithCache(companyId) {
    // company_id mütləq olmalıdır!
    let finalCompanyId = companyId;

    if (!finalCompanyId) {
        // Token-dan al
        const token = getAuthToken();
        if (token) {
            const payload = parseTokenPayload(token);
            finalCompanyId = payload?.company_id;
        }
    }

    if (!finalCompanyId) {
        console.error('❌ getWorkTypesWithCache: company_id tapılmadı');
        return [];
    }

    console.log(`🔧 getWorkTypesWithCache: company_id=${finalCompanyId}`);

    return loadDataWithCache(
        async () => {
            const res = await makeApiRequest(`/worktypes/company/${finalCompanyId}`, 'GET');
            return res?.data || res || [];
        },
        'workTypes',              // cache type
        30,                       // 30 dəqiqə TTL
        finalCompanyId            // ✅ cache params - company_id
    );
}

// 7. Alt şirkətlər (30 dəq) - /companies/{code}/sub-companies
async function getSubCompaniesWithCache(companyCode) {
    const code = companyCode || window.taskManager?.userData?.companyCode;
    return loadDataWithCache(async () => {
        const res = await makeApiRequest(`/companies/${code}/sub-companies`, 'GET');
        const raw = res?.data || res;
        return raw?.sub_companies || raw || [];
    }, 'subCompanies', 30);
}

// 8. Şöbələr (30 dəq) - /departments/company-code/{code}
async function getDepartmentsWithCache(companyCode) {
    const code = companyCode || window.taskManager?.userData?.companyCode;
    return loadDataWithCache(async () => {
        const res = await makeApiRequest(`/departments/company-code/${code}`, 'GET');
        return res?.data || res || [];
    }, 'departments', 30);
}

// 9. İşçilər (30 dəq) - /users/company/{code}
async function getEmployeesWithCache(companyCode) {
    const code = companyCode || window.taskManager?.userData?.companyCode;
    return loadDataWithCache(async () => {
        const res = await makeApiRequest(`/users/company/${code}`, 'GET');
        return res?.data || res || [];
    }, 'employees', 30);
}

// 10. Arxiv tasklar (3 dəq) - /task-archive/
// ✅ DÜZ - company_id ilə cache
async function getArchiveTasksWithCache(companyId, page = 1, limit = 20) {
    // company_id mütləq olmalıdır!
    if (!companyId) {
        console.error('❌ getArchiveTasksWithCache: company_id tələb olunur');
        return [];
    }

    return loadDataWithCache(
        async () => {
            const res = await makeApiRequest(`/task-archive/?page=${page}&limit=${limit}&company_id=${companyId}`, 'GET');
            let tasks = res?.data?.items || res?.data || res || [];

            // Əgər tasks array deyilsə, düzəlt
            if (!Array.isArray(tasks)) {
                if (tasks.items && Array.isArray(tasks.items)) tasks = tasks.items;
                else tasks = [];
            }

            return tasks;
        },
        'archiveTasks',           // cache type
        3,                        // 3 dəqiqə TTL
        companyId, page, limit    // ✅ cache params - company_id DAXİL!
    );
}


async function getAllCompaniesWithCache() {
    return loadDataWithCache(async () => {
        const res = await makeApiRequest('/companies/all', 'GET');
        return res?.data?.items || res?.data || res || [];
    }, 'allCompanies', 30);
}

// 12. Tək task detali (cache ilə - attachment sorğularını aradan qaldırır)
const _taskDetailCache = new Map();

async function getTaskDetailWithCache(taskId) {
    if (_taskDetailCache.has(taskId)) {
        const entry = _taskDetailCache.get(taskId);
        if (Date.now() < entry.expires) {
            return entry.data;
        }
        _taskDetailCache.delete(taskId);
    }
    const res = await makeApiRequest(`/tasks/${taskId}`, 'GET');
    const detail = res?.data || res;
    if (detail && !detail.error) {
        _taskDetailCache.set(taskId, { data: detail, expires: Date.now() + 3 * 60 * 1000 });
    }
    return detail;
}

// ============================================================
// CACHE TƏMİZLƏMƏ
// ============================================================

async function clearAllCache() {
    _apiCache.clear();
    _taskDetailCache.clear();
    if (window.dbManager) await window.dbManager.clearCache().catch(() => {});
    console.log('🗑️ Bütün cache-lər təmizləndi');
    return true;
}

async function clearCacheByType(cacheType) {
    _apiCache.clear(cacheType);
    if (window.dbManager) await window.dbManager.clearCache(cacheType).catch(() => {});
    console.log(`🗑️ [${cacheType}] cache-i təmizləndi`);
    return true;
}

async function refreshTaskCache() {
    ['tasks', 'externalTasks', 'partnerTasks', 'archiveTasks'].forEach(t => _apiCache.clear(t));
    _taskDetailCache.clear();
    if (window.dbManager) {
        for (const t of ['tasks', 'externalTasks', 'partnerTasks', 'archiveTasks']) {
            await window.dbManager.clearCache(t).catch(() => {});
        }
    }
    console.log('✅ Task cache-ləri təmizləndi');
}

async function refreshPartnerCache() {
    _apiCache.clear('partners');
    _apiCache.clear('partnerTasks');
    if (window.dbManager) {
        await window.dbManager.clearCache('partners').catch(() => {});
        await window.dbManager.clearCache('partnerTasks').catch(() => {});
    }
    console.log('✅ Partnyor cache-i təmizləndi');
}

// ============================================================
// GLOBAL EXPORT
// ============================================================
if (typeof window !== 'undefined') {
    // Əsas
    window.makeApiRequest = makeApiRequest;
    window.getAuthToken = getAuthToken;
    window.parseTokenPayload = parseTokenPayload;
    window.buildEndpointWithPagination = buildEndpointWithPagination;
    window.isTokenValid = isTokenValid;
    window.refreshToken = refreshToken;
    window.showApiError = showApiError;
    window.showApiSuccess = showApiSuccess;
    window.buildUrl = buildUrl;

    // Cache əsas
    window.loadDataWithCache = loadDataWithCache;
    window._apiCache = _apiCache;

    // Cache ilə hazır funksiyalar
    window.getTasksWithCache = getTasksWithCache;
    window.getPartnersWithCache = getPartnersWithCache;
    window.getExternalTasksWithCache = getExternalTasksWithCache;
    window.getPartnerTasksWithCache = getPartnerTasksWithCache;
    window.getParentCompaniesWithCache = getParentCompaniesWithCache;
    window.getWorkTypesWithCache = getWorkTypesWithCache;
    window.getSubCompaniesWithCache = getSubCompaniesWithCache;
    window.getDepartmentsWithCache = getDepartmentsWithCache;
    window.getEmployeesWithCache = getEmployeesWithCache;
    window.getArchiveTasksWithCache = getArchiveTasksWithCache;
    window.getAllCompaniesWithCache = getAllCompaniesWithCache;
    window.getTaskDetailWithCache = getTaskDetailWithCache;

    // Cache təmizləmə
    window.clearAllCache = clearAllCache;
    window.clearCacheByType = clearCacheByType;
    window.refreshTaskCache = refreshTaskCache;
    window.refreshPartnerCache = refreshPartnerCache;

    window.API_BASE = API_BASE;
}

console.log('✅ API Service yükləndi (OPTİMLƏŞDİRİLMİŞ - CACHE DƏSTƏKLİ)');
console.log('📡 API Base:', API_BASE);