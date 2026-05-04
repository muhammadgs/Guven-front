// authService.js - TOKEN AVTOMATİK YENİLƏNMƏ VERSİYASI (SESSİYA KƏSİLMƏZ)
const AuthService = {
    // Debounce üçün tracking
    _lastCheckTime: 0,
    _checking: false,
    _lastAuthCheck: 0,
    _lastAuthResult: false,
    _cachedToken: null,
    _refreshPromise: null,
    _refreshTimeout: null,
    _refreshAttempts: 0,           // Yeniləmə cəhdlərinin sayı
    _maxRefreshAttempts: 3,        // Maksimum cəhd sayı
    _isRefreshing: false,          // Yeniləmə prosesi gedir?

    // Konfiqurasiya
    _config: {
        debounceDelay: 10000,
        refreshThreshold: 300,      // 5 dəqiqə qalmış yenilə
        checkInterval: 60000,       // 1 dəqiqədə bir yoxla
        refreshEndpoint: '/api/auth/refresh',
        loginEndpoint: '/login.html',
        silentRefresh: true,        // Səssiz rejim - istifadəçiyə bildiriş GÖSTERMƏ!
        autoRedirectOnFailure: false // ❌ Uğursuz olsa belə LOGIN-ə YÖNLƏNDİRMƏ!
    },

    // Token vaxtı yoxlamaq
    isTokenExpired: function(token) {
        if (!token) return true;
        try {
            const payload = this.parseTokenPayload(token);
            if (!payload || !payload.exp) return true;
            const currentTime = Math.floor(Date.now() / 1000);
            return payload.exp < currentTime;
        } catch (error) {
            return true;
        }
    },

    // Token-in bitməsinə nə qədər qaldığını hesabla (saniyə ilə)
    getTokenTimeLeft: function(token) {
        if (!token) return 0;
        try {
            const payload = this.parseTokenPayload(token);
            if (!payload || !payload.exp) return 0;
            const currentTime = Math.floor(Date.now() / 1000);
            return payload.exp - currentTime;
        } catch (error) {
            return 0;
        }
    },

    // Token parse etmək
    parseTokenPayload: function(token) {
        if (!token) return null;
        try {
            const parts = token.split('.');
            if (parts.length !== 3) return null;
            const base64Url = parts[1];
            let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const pad = base64.length % 4;
            if (pad && pad !== 1) {
                base64 += '==='.slice(0, 4 - pad);
            }
            const jsonPayload = atob(base64);
            return JSON.parse(jsonPayload);
        } catch (error) {
            console.error('❌ Token parse error:', error);
            return null;
        }
    },

    // Auth məlumatlarını təmizlə (SADƏCƏ TƏMİZLƏ, LOGIN-ə GETMƏ!)
    clearAuthData: function(silent = true) {
        console.log('🧹 Auth məlumatları təmizlənir... (silent:', silent, ')');

        const localStorageKeys = ['guven_token', 'access_token', 'accessToken', 'token', 'refresh_token', 'refreshToken', 'user_data', 'user'];
        localStorageKeys.forEach(key => localStorage.removeItem(key));

        const sessionStorageKeys = ['guven_token', 'access_token', 'accessToken', 'token', 'refresh_token', 'refreshToken', 'user_data', 'user'];
        sessionStorageKeys.forEach(key => sessionStorage.removeItem(key));

        document.cookie.split(";").forEach(function(c) {
            document.cookie = c.replace(/^ +/, "")
                .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });

        this._cachedToken = null;
        this._lastAuthResult = false;
        this._refreshPromise = null;
        this._refreshAttempts = 0;

        if (this._refreshTimeout) {
            clearTimeout(this._refreshTimeout);
            this._refreshTimeout = null;
        }

        // ✅ SADƏCƏ bildiriş GÖSTER, LOGIN-ə GETMƏ!
        if (!silent) {
            this.showNotification('Sessiya vaxtı bitdi, avtomatik yenilənir...', 'warning');
        }
    },

    // Token almaq
    getToken: function() {
        const now = Date.now();
        if (now - this._lastCheckTime < 2000 && this._cachedToken !== undefined) {
            return this._cachedToken;
        }
        this._lastCheckTime = now;

        const tokenKeys = ['guven_token', 'access_token', 'accessToken', 'token'];
        for (const key of tokenKeys) {
            let token = localStorage.getItem(key);
            if (token && token.trim() && token !== 'null' && token !== 'undefined') {
                this._cachedToken = token.trim();
                return this._cachedToken;
            }
            token = sessionStorage.getItem(key);
            if (token && token.trim() && token !== 'null' && token !== 'undefined') {
                this._cachedToken = token.trim();
                return this._cachedToken;
            }
        }

        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            cookie = cookie.trim();
            if (cookie.startsWith('access_token=')) {
                const token = cookie.substring('access_token='.length);
                this._cachedToken = token;
                return this._cachedToken;
            }
            if (cookie.startsWith('guven_token=')) {
                const token = cookie.substring('guven_token='.length);
                this._cachedToken = token;
                return this._cachedToken;
            }
        }

        this._cachedToken = null;
        return null;
    },

    // Refresh token almaq
    getRefreshToken: function() {
        const refreshKeys = ['refresh_token', 'refreshToken', 'guven_refresh_token'];
        for (const key of refreshKeys) {
            let token = localStorage.getItem(key);
            if (token && token.trim() && token !== 'null' && token !== 'undefined') {
                return token.trim();
            }
            token = sessionStorage.getItem(key);
            if (token && token.trim() && token !== 'null' && token !== 'undefined') {
                return token.trim();
            }
        }
        return null;
    },

    // ✅ YENİ - Refresh token-ı saxla (başqa yerdən gələndə)
    setRefreshToken: function(refreshToken) {
        if (!refreshToken) return;
        localStorage.setItem('refresh_token', refreshToken);
        sessionStorage.setItem('refresh_token', refreshToken);
        console.log('✅ Refresh token saxlanıldı');
    },

    // ✅ DÜZGÜN - Token yeniləmə (SESSİYA KƏSİLMƏZ)
    refreshToken: async function(force = false) {
        // Əgər artıq yeniləmə prosesi varsa, həmin Promise-i qaytar
        if (this._refreshPromise && !force) {
            console.log('⏳ Token artıq yenilənir, gözləyin...');
            return this._refreshPromise;
        }

        // Maksimum cəhd sayını keçibsə, dayan
        if (this._refreshAttempts >= this._maxRefreshAttempts && !force) {
            console.error('❌ Maksimum yeniləmə cəhdi keçildi');
            this._refreshAttempts = 0;
            return null;
        }

        this._isRefreshing = true;
        this._refreshAttempts++;

        const refreshToken = this.getRefreshToken();

        // Refresh token yoxdursa, YENİ TOKEN YARATMAĞA ÇALIŞ (LOGIN-ə GETMƏ)
        if (!refreshToken) {
            console.warn('⚠️ Refresh token tapılmadı, yeni token almağa çalışırıq...');
            // Bura öz mantığınıza görə doldurula bilər
            // Məsələn: silent login, və ya sadəcə gözlə
            this._isRefreshing = false;
            return null;
        }

        console.log(`🔄 Token yenilənir... (cəhd ${this._refreshAttempts}/${this._maxRefreshAttempts})`);

        this._refreshPromise = fetch(this._config.refreshEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${refreshToken}`
            },
            body: JSON.stringify({ refresh_token: refreshToken })
        })
        .then(async response => {
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    // Refresh token da bitibsə, yeni token yaratmağa çalış
                    console.warn('⚠️ Refresh token da bitib, yeni token almağa çalışırıq...');
                    // ✅ BURADA SİLENT LOGIN EDİLƏ BİLƏR
                    // Məsələn: await this.silentLogin();
                    return null;
                }
                throw new Error(`Refresh token failed: ${response.status}`);
            }

            const data = await response.json();

            if (data.access_token || data.token) {
                const newToken = data.access_token || data.token;
                this.saveToken(newToken);

                if (data.refresh_token) {
                    this.saveRefreshToken(data.refresh_token);
                }

                console.log('✅ Token uğurla yeniləndi');
                this._cachedToken = newToken;
                this._lastAuthResult = true;
                this._lastAuthCheck = Date.now();
                this._refreshAttempts = 0;  // Cəhdləri sıfırla
                this._isRefreshing = false;

                // ✅ SESSİYA YENİLƏNDİ - BİLDİRİŞ GÖSTER
                this.showNotification('Sessiya avtomatik yeniləndi', 'success');

                return newToken;
            } else {
                throw new Error('Yeni token tapılmadı');
            }
        })
        .catch(error => {
            console.error('❌ Token yeniləmə xətası:', error);
            this._isRefreshing = false;

            // Hələ cəhd qalıbsa, təkrar et
            if (this._refreshAttempts < this._maxRefreshAttempts) {
                console.log(`🔄 ${2} saniyə sonra təkrar cəhd ediləcək...`);
                setTimeout(() => this.refreshToken(), 2000);
            } else {
                console.error('❌ Token yeniləmək mümkün olmadı');
                this._refreshAttempts = 0;
                // ✅ LOGIN-ə GETMƏ, SADƏCƏ BİLDİRİŞ GÖSTER
                this.showNotification('Sessiya yenilənə bilmədi, zəhmət olmasa səhifəni yeniləyin', 'warning');
            }
            return null;
        })
        .finally(() => {
            this._refreshPromise = null;
        });

        return this._refreshPromise;
    },

    // ✅ SİLENT LOGIN (opsiyonel - öz backend-inizə görə doldurun)
    silentLogin: async function() {
        console.log('🔐 Silent login cəhdi...');
        try {
            // Burada backend-inizin silent login endpoint-inə sorğu göndərin
            // const response = await fetch('/api/auth/silent-refresh', { method: 'POST' });
            // if (response.ok) {
            //     const data = await response.json();
            //     this.saveToken(data.access_token);
            //     if (data.refresh_token) this.saveRefreshToken(data.refresh_token);
            //     return true;
            // }
            return false;
        } catch (error) {
            console.error('❌ Silent login xətası:', error);
            return false;
        }
    },

    // Token-ı saxla
    saveToken: function(token) {
        if (!token) return;
        localStorage.setItem('access_token', token);
        localStorage.setItem('guven_token', token);
        sessionStorage.setItem('access_token', token);
        sessionStorage.setItem('guven_token', token);
        this._cachedToken = token;
        this.scheduleTokenRefresh(token);
    },

    // Refresh token-ı saxla
    saveRefreshToken: function(refreshToken) {
        if (!refreshToken) return;
        localStorage.setItem('refresh_token', refreshToken);
        sessionStorage.setItem('refresh_token', refreshToken);
    },

    // Token bitmə vaxtına görə avtomatik yeniləmə planla
    scheduleTokenRefresh: function(token) {
        if (this._refreshTimeout) {
            clearTimeout(this._refreshTimeout);
            this._refreshTimeout = null;
        }

        const timeLeft = this.getTokenTimeLeft(token);
        if (timeLeft <= 0) {
            console.log('⚠️ Token vaxtı artıq bitib, dərhal yenilənir...');
            this.refreshToken();
            return;
        }

        const refreshTime = Math.max(0, (timeLeft - this._config.refreshThreshold) * 1000);
        if (refreshTime > 0) {
            console.log(`⏰ Token ${Math.floor(timeLeft / 60)} dəqiqə sonra bitir. ${Math.floor(refreshTime / 1000)} saniyə sonra yenilənəcək.`);
            this._refreshTimeout = setTimeout(() => {
                console.log('🔄 Planlı token yeniləmə başlayır...');
                this.refreshToken();
            }, refreshTime);
        } else {
            console.log('⚠️ Token refresh threshold keçib, dərhal yenilənir...');
            this.refreshToken();
        }
    },

    // ✅ DÜZGÜN - Auth yoxlama (HEÇ VAXT LOGIN-ə GETMƏZ)
    checkAuth: async function(force = false) {
        const now = Date.now();

        if (this._checking && !force) {
            console.log('⏳ Auth yoxlanılır, gözləyin...');
            return true;
        }

        if (!force && now - this._lastAuthCheck < 5000 && this._lastAuthResult !== undefined) {
            return this._lastAuthResult;
        }

        this._checking = true;
        console.log('🔐 Auth yoxlanılır...');

        let token = this.getToken();

        // Token yoxdursa - YENİ TOKEN ALMAĞA ÇALIŞ
        if (!token) {
            console.warn('⚠️ Token tapılmadı, yeni token almağa çalışırıq...');
            const newToken = await this.refreshToken(true);
            if (newToken) {
                this._checking = false;
                this._lastAuthResult = true;
                this._lastAuthCheck = Date.now();
                return true;
            }
            this._checking = false;
            this._lastAuthResult = false;
            this._lastAuthCheck = now;
            // ✅ LOGIN-ə GETMƏ, SADƏCƏ BİLDİRİŞ
            this.showNotification('Token tapılmadı, səhifəni yeniləyin', 'warning');
            return false;
        }

        // Token expired-dirsə, yeniləməyə çalış
        if (this.isTokenExpired(token)) {
            console.log('⚠️ Token vaxtı bitmişdir, yeniləməyə çalışılır...');
            const newToken = await this.refreshToken();
            if (newToken) {
                console.log('✅ Token uğurla yeniləndi, auth davam edir');
                this._checking = false;
                this._lastAuthResult = true;
                this._lastAuthCheck = Date.now();
                return true;
            } else {
                console.error('❌ Token yeniləmək mümkün olmadı');
                this._checking = false;
                this._lastAuthResult = false;
                this._lastAuthCheck = now;
                // ✅ LOGIN-ə GETMƏ, SADƏCƏ BİLDİRİŞ
                this.showNotification('Sessiya yenilənə bilmədi, səhifəni yeniləyin', 'warning');
                return false;
            }
        }

        // Token etibarlıdır, bitməyə yaxındırsa arxa planda yenilə
        const timeLeft = this.getTokenTimeLeft(token);
        if (timeLeft > 0 && timeLeft < this._config.refreshThreshold) {
            console.log(`⚠️ Token bitməyə ${Math.floor(timeLeft / 60)} dəqiqə qalıb, arxa planda yenilənir...`);
            this.refreshToken();
        }

        this._checking = false;
        this._lastAuthResult = true;
        this._lastAuthCheck = now;
        return true;
    },

    // ✅ DƏYİŞDİ - UNAUTHORIZED OLANDA LOGIN-ə GETMƏ, SADƏCƏ YENİLƏ!
    handleUnauthorized: function(message) {
        console.log(`⚠️ Unauthorized: ${message}`);

        // SADƏCƏ xəbərdarlıq göstər
        this.showNotification(message, 'warning');

        // Token-i təmizlə
        this.clearAuthData(true);

        // YENİ TOKEN ALMAĞA ÇALIŞ (LOGIN-ə GETMƏ!)
        setTimeout(() => {
            this.refreshToken(true);
        }, 1000);
    },

    // ✅ DƏYİŞDİ - 401 xətasında LOGIN-ə GETMƏ!
    fetchWithAuth: async function(url, options = {}) {
        const isAuthenticated = await this.checkAuth();
        if (!isAuthenticated) {
            // LOGIN-ə GETMƏ, sadəcə xəta qaytar
            throw new Error('Not authenticated - token refresh needed');
        }

        let token = this.getToken();
        const headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`
        };

        let response = await fetch(url, { ...options, headers });

        if (response.status === 401) {
            console.log('⚠️ 401 xətası alındı, token yenilənir...');
            const newToken = await this.refreshToken();

            if (newToken) {
                const newHeaders = {
                    ...options.headers,
                    'Authorization': `Bearer ${newToken}`
                };
                response = await fetch(url, { ...options, headers: newHeaders });
            } else {
                // LOGIN-ə GETMƏ, sadəcə xəta qaytar
                throw new Error('Token refresh failed');
            }
        }

        return response;
    },

    // Notification göstərmək
    showNotification: function(message, type = 'info') {
        if (this._config.silentRefresh && type === 'info') {
            console.log(`ℹ️ [Silent] ${message}`);
            return;
        }

        if (document.querySelector('.auth-notification')) return;

        const notification = document.createElement('div');
        notification.className = `auth-notification auth-notification-${type}`;
        notification.innerHTML = `
            <div class="auth-notification-content">
                <i class="fas ${type === 'danger' ? 'fa-exclamation-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) notification.remove();
        }, 5000);
    },

    // Interval ilə auth yoxlama
    startAuthMonitor: function() {
        console.log('⏱️ Auth monitor başladılır...');
        if (this.authCheckInterval) clearInterval(this.authCheckInterval);
        this.authCheckInterval = setInterval(() => {
            this.checkAuth();
        }, this._config.checkInterval);
        console.log(`✅ Auth monitor aktiv (${this._config.checkInterval / 1000} saniyə interval)`);
    },

    stopAuthMonitor: function() {
        if (this.authCheckInterval) {
            clearInterval(this.authCheckInterval);
            this.authCheckInterval = null;
        }
        if (this._refreshTimeout) {
            clearTimeout(this._refreshTimeout);
            this._refreshTimeout = null;
        }
    },

    // Initialize
    initialize: function(config = {}) {
        console.log('🔐 Auth Service initialize edilir...');
        this._config = { ...this._config, ...config };

        this.checkAuth().then(isAuthenticated => {
            if (!isAuthenticated) {
                console.warn('⚠️ Auth yoxlaması uğursuz oldu, amma login-ə getmirik');
            }
            this.startAuthMonitor();
            console.log('✅ Auth Service hazırdır (Sessiya KESİLMƏZ rejimdə)');
        });

        window.addEventListener('beforeunload', () => this.stopAuthMonitor());
        return this;
    }
};

// Global export
if (typeof window !== 'undefined') {
    window.AuthService = AuthService;
}