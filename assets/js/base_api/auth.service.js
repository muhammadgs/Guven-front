// base_api/auth.service.js

class AuthService {
    constructor(apiService) {
        this.api = apiService;
        this.currentUser = null;

        if (this.isLoginPage()) {
            console.log('📄 Login səhifəsi, auth yoxlanılmır');
            return;
        }

        // 🔥 CONSTRUCTOR-DA REDIRECT ETMƏ — yalnız loq yaz
        const token = this._getToken();
        if (!token) {
            console.log('❌ Token tapılmadı');
        } else {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const now = Math.floor(Date.now() / 1000);
                if (payload.exp < now) {
                    console.log('❌ Token müddəti bitib');
                } else {
                    console.log('✅ Token lokal olaraq etibarlıdır');
                }
            } catch (e) {
                console.error('❌ Token parse xətası:', e);
            }
        }
        // ← REDIRECT YOX

        this.setupProfileButtons();
    }

    async init() {
        if (this.isLoginPage()) return true;

        // Token-i yoxla
        if (!this.hasValidToken()) {
            console.log('🔴 Token yoxdur və ya bitib');
            this._redirectToLogin();
            return false;
        }

        try {
            const isAuth = await this.checkAuthStatus();
            if (!isAuth) {
                this._redirectToLogin();
                return false;
            }

            // ✅ ƏLAVƏ: API sorğuları üçün tokeni yoxla
            await this._ensureValidTokenForApi();

            return true;
        } catch (e) {
            console.error('❌ Init xətası:', e);
            const cached = this.getCachedUserData();
            if (cached && this.hasValidToken()) {
                this.currentUser = cached;
                return true;
            }
            this._redirectToLogin();
            return false;
        }
    }

    // ✅ YENİ METOD: API sorğusundan əvvəl tokeni yoxla
    async _ensureValidTokenForApi() {
        const token = this._getToken();
        if (!token) {
            this._redirectToLogin();
            return false;
        }

        // Token vaxtını yoxla
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const now = Math.floor(Date.now() / 1000);

            // 30 saniyədən az qalıbsa, refresh etməyə çalış
            if (payload.exp - now < 30) {
                console.log('🔄 Token bitmək üzrə, refresh edilir...');
                const refreshed = await this._tryRefreshToken();
                if (!refreshed) {
                    this._redirectToLogin();
                    return false;
                }
            }
        } catch (e) {
            console.warn('⚠️ Token parse xətası:', e);
        }

        return true;
    }

    // ✅ YENİ METOD: Token refresh
    async _tryRefreshToken() {
        try {
            const response = await fetch('https://guvenfinans.az/proxy.php/api/v1/auth/refresh', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.access_token) {
                    localStorage.setItem('guven_token', data.access_token);
                    localStorage.setItem('access_token', data.access_token);
                    console.log('✅ Token uğurla yeniləndi');
                    return true;
                }
            }

            console.warn('⚠️ Token refresh uğursuz:', response.status);
            return false;
        } catch (error) {
            console.error('❌ Token refresh xətası:', error);
            return false;
        }
    }

    isLoginPage() {
        const path = window.location.pathname;
        return path.includes('login.html') ||
               path.includes('index.html') ||
               path === '/' ||
               path === '/login';
    }

    // ✅ DÜZƏLDİ: Yalnız sürətli lokal yoxlama (sinxron, redirectsiz)
    _quickTokenCheck() {
        const token = this._getToken();
        if (!token) {
            console.log('❌ Token tapılmadı');
            // ← REDIRECT ETMƏ, yalnız init()-də et
            return;
        }

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const now = Math.floor(Date.now() / 1000);
            if (payload.exp < now) {
                console.log('❌ Token müddəti bitib');
                // ← BURADA DA REDIRECT ETMƏ
                return;
            }
            console.log('✅ Token lokal olaraq etibarlıdır');
        } catch (e) {
            console.error('❌ Token parse xətası:', e);
        }
    }

    // ✅ DÜZƏLDİ: Bütün mümkün key adlarını yoxlayan vahid funksiya
    _getToken() {
        const keys = ['guven_token', 'access_token', 'auth_token', 'token'];
        for (const key of keys) {
            const val = localStorage.getItem(key) || sessionStorage.getItem(key);
            if (val && val !== 'null' && val !== 'undefined' && val !== '') {
                return val;
            }
        }
        return null;
    }

    hasValidToken() {
        const token = this._getToken();
        if (!token) return false;

        try {
            const parts = token.split('.');
            if (parts.length !== 3) {
                console.warn('⚠️ Token formatı düzgün deyil (JWT deyil)');
                // JWT deyilsə, yalnız tokenin mövcudluğunu yoxla
                return true;
            }

            const payload = JSON.parse(atob(parts[1]));
            const now = Math.floor(Date.now() / 1000);

            // Token bitibsə, false qaytar
            if (payload.exp <= now) {
                console.log('❌ Token vaxtı bitib');
                return false;
            }

            return true;
        } catch (e) {
            console.warn('⚠️ Token parse xətası:', e.message);
            return false;  // ✅ DÜZƏLDİ: Parse olunmayan token üçün false qaytar
        }
    }



    async checkAuthStatus() {
        if (!this.hasValidToken()) {
            console.log('🔴 Token yoxdur və ya bitib');
            this._redirectToLogin();  // ✅ DÜZƏLDİ: Birbaşa loginə at
            return false;
        }

        try {
            const response = await this.api.getCurrentUser();

            if (!response || response === null) {
                console.warn('⚠️ API-dən null cavab gəldi');
                const cached = this.getCachedUserData();
                if (cached && this.hasValidToken()) {
                    console.log('⚠️ Null cavab — cached user istifadə edilir');
                    this.currentUser = cached;
                    return true;
                }
                this._redirectToLogin();
                return false;
            }

            if (response.success && response.user_service) {
                this.currentUser = response.user_service;

                if (this.currentUser.baza_id) {
                    localStorage.setItem('baza_id', this.currentUser.baza_id);
                }

                this.saveUserData(response);
                console.log('✅ Auth uğurlu:', this.currentUser.email);
                return true;
            }

            // ✅ 401 və ya unauthorized cavabı
            if (response.status === 401 || response.message === 'Unauthorized') {
                console.warn('🔑 API unauthorized cavab qaytardı');
                this._redirectToLogin();
                return false;
            }

            if (response.data && response.data.user_service) {
                this.currentUser = response.data.user_service;
                this.saveUserData({ user_service: this.currentUser, success: true });
                console.log('✅ Auth uğurlu (alternativ format):', this.currentUser.email);
                return true;
            }

            console.warn('⚠️ API cavabında user_service yoxdur', response);

            const cached = this.getCachedUserData();
            if (cached && this.hasValidToken()) {
                console.log('⚠️ API-dan user_service gəlmədi — cached user istifadə edilir');
                this.currentUser = cached;
                return true;
            }

            this._redirectToLogin();
            return false;

        } catch (error) {
            console.error('❌ checkAuthStatus xətası:', error.message);

            // ✅ 401 xətası
            if (error.message.includes('401')) {
                this._redirectToLogin();
                return false;
            }

            const cached = this.getCachedUserData();
            if (cached && this.hasValidToken()) {
                console.log('⚠️ Şəbəkə xətası — cached user istifadə edilir');
                this.currentUser = cached;
                return true;
            }

            this._redirectToLogin();
            return false;
        }
    }

    saveUserData(response) {
        if (!response?.user_service) return;

        const u = response.user_service;
        localStorage.setItem('guven_token', this._getToken()); // tokeni standart key-ə yaz
        localStorage.setItem('guven_user_data', JSON.stringify({
            success: true,
            user: u,
            timestamp: Date.now()
        }));
        localStorage.setItem('user', JSON.stringify(u));
        if (u.email)   localStorage.setItem('user_email', u.email);
        if (u.baza_id) localStorage.setItem('baza_id', u.baza_id);
        localStorage.setItem('guven_last_me_body', JSON.stringify(response));
    }

    getCachedUserData() {
        const sources = [
            () => {
                const d = localStorage.getItem('guven_last_me_body');
                if (!d) return null;
                const p = JSON.parse(d);
                return p?.user_service || null;
            },
            () => {
                const d = localStorage.getItem('guven_user_data');
                if (!d) return null;
                const p = JSON.parse(d);
                return p?.user || null;
            },
            () => {
                const d = localStorage.getItem('user');
                return d ? JSON.parse(d) : null;
            }
        ];

        for (const fn of sources) {
            try {
                const result = fn();
                if (result) return result;
            } catch (e) { /* davam et */ }
        }
        return null;
    }

    getUserId() {
        if (this.currentUser?.id) return this.currentUser.id;

        const cached = this.getCachedUserData();
        if (cached?.id) {
            this.currentUser = cached;
            return cached.id;
        }

        const token = this._getToken();
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                return payload.sub || payload.user_id || payload.id || null;
            } catch (e) {}
        }

        return null;
    }

    _redirectToLogin() {
        this._clearAll();
        const pathName = window.location.pathname;
        const loginPath = (pathName.includes('/worker/') || pathName.includes('/owner/') || pathName.includes('/admin/'))
            ? '../login.html'
            : '/login.html';

        const inIframe = window.self !== window.top;
        console.warn(`🚪 Auth redirect login (${inIframe ? 'top' : 'self'}): ${loginPath}`);

        if (inIframe) {
            window.top.location.href = loginPath;
            return;
        }

        window.location.href = loginPath;
    }

    // Legacy alias (köhnə kod uyumluluğu üçün)
    checkTokenAndRedirect() {
        this._quickTokenCheck();
    }

    refreshPage() {
        this._redirectToLogin();
    }

    _clearAll() {
        localStorage.clear();
        sessionStorage.clear();
        document.cookie.split(';').forEach(c => {
            document.cookie = c.replace(/^ +/, '')
                .replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
        });
    }

    setupProfileButtons() {
        document.getElementById('profileMenuBtn')
            ?.addEventListener('click', e => { e.stopPropagation(); this.toggleProfileMenu(); });

        document.getElementById('logoutBtn')
            ?.addEventListener('click', () => this.handleLogout());

        document.addEventListener('click', e => {
            const menu = document.getElementById('profileMenu');
            if (menu &&
                !menu.contains(e.target) &&
                !document.getElementById('profileMenuBtn')?.contains(e.target)) {
                menu.classList.remove('show');
            }
        });
    }

    toggleProfileMenu() {
        document.getElementById('profileMenu')?.classList.toggle('show');
    }

    async handleLogout() {
        if (!confirm('Hesabdan çıxmaq istədiyinizə əminsiniz?')) return;

        // 🔥 Əvvəlcə clear et, sonra logout API çağır
        // (API 401 versə belə problem olmasın)
        await this._clearServiceWorkerCaches();
        await this._clearIndexedDB();
        this._clearAll();

        try {
            await this.api.post('/auth/logout');
        } catch {} // xəta olsa da davam et

        setTimeout(() => this._redirectToLogin(), 200);
    }

    async _clearServiceWorkerCaches() {
        try {
            if ('caches' in window) {
                const keys = await caches.keys();
                await Promise.all(keys.map(k => caches.delete(k)));
            }
        } catch {}
    }

    async _clearIndexedDB() {
        try {
            const dbs = await indexedDB.databases?.() || [];
            await Promise.all(dbs.map(db => new Promise(res => {
                const r = indexedDB.deleteDatabase(db.name);
                r.onsuccess = r.onerror = res;
            })));
        } catch {}
    }

    getCurrentUser()     { return this.currentUser; }
    isAuthenticated()    { return !!this.currentUser && this.hasValidToken(); }
    hasToken()           { return this.hasValidToken(); }
    getCurrentUserId()   { return this.getUserId(); }
    async logout()       { await this.handleLogout(); }
}

window.AuthService = AuthService;