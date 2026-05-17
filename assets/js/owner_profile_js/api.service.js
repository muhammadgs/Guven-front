/**
 * API Service - 1C və Digər Sorğular Ayrı
 */

class ApiService {
    constructor() {
        this.baseUrl = "https://guvenfinans.az/proxy.php";
        this.token = this.loadToken();
    }

    loadToken() {
        let token = localStorage.getItem('guven_token');
        if (token && token !== 'null' && token !== 'undefined') {
            return token;
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