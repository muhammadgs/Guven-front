// base_api/auth.service.js

class AuthService {
    constructor(apiService) {
        this.api = apiService;
        this.currentUser = null;

        if (this.isLoginPage()) {
            console.log('📄 Login səhifəsi, auth yoxlanılmır');
            return;
        }

        // ✅ Constructor-da yalnız token DEcode yoxlaması (sinxron)
        // API çağırısını ayrıca init() ilə et
        this._quickTokenCheck();
        this.setupProfileButtons();
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
            const payload = JSON.parse(atob(token.split('.')[1]));
            const now = Math.floor(Date.now() / 1000);
            // ✅ 30 saniyə tolerance — clock skew üçün
            return payload.exp > (now - 30);
        } catch (e) {
            return false;
        }
    }

    // ✅ YENİ: Səhifə yükləndikdə çağırılacaq async init
    async init() {
        if (this.isLoginPage()) return true;

        try {
            const isAuth = await this.checkAuthStatus();
            if (!isAuth) {
                this._redirectToLogin();
                return false;
            }
            return true;
        } catch (e) {
            console.error('❌ init() xətası:', e);
            // ✅ Cached data varsa, loginə atmadan davam et
            const cached = this.getCachedUserData();
            if (cached) {
                this.currentUser = cached;
                return true;
            }
            this._redirectToLogin();
            return false;
        }
    }

    async checkAuthStatus() {
        if (!this.hasValidToken()) {
            console.log('🔴 Token yoxdur və ya bitib');
            return false;
        }

        try {
            const response = await this.api.getCurrentUser();

            if (response === null) return false;

            if (response && response.success && response.user_service) {
                this.currentUser = response.user_service;

                // baza_id saxla
                if (this.currentUser.baza_id) {
                    localStorage.setItem('baza_id', this.currentUser.baza_id);
                }

                this.saveUserData(response);
                console.log('✅ Auth uğurlu:', this.currentUser.email);
                return true;
            }

            console.warn('⚠️ API cavabında user_service yoxdur');
            return false;

        } catch (error) {
            console.error('❌ checkAuthStatus xətası:', error.message);

            // ✅ Şəbəkə xətasında cached datanı istifadə et (loginə atma)
            const cached = this.getCachedUserData();
            if (cached) {
                console.log('⚠️ Şəbəkə xətası — cached user istifadə edilir');
                this.currentUser = cached;
                return true;
            }

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
        const p = window.location.pathname;
        const loginPath = (p.includes('/owner/') || p.includes('/admin/'))
            ? '../login.html'
            : '/login.html';
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

        try { await this.api.post('/auth/logout'); } catch {}

        await this._clearServiceWorkerCaches();
        await this._clearIndexedDB();
        this._clearAll();

        setTimeout(() => this._redirectToLogin(), 500);
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