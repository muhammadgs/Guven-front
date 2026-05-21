/**
 * Auth Service - Token yoxdursa və ya vaxtı bitibsə SƏHİFƏNİ YENİLƏ
 */

class AuthService {
    constructor(apiService) {
        this.api = apiService;
        this.currentUser = null;

        // ✅ LOGIN SƏHİFƏSİNDƏ HİÇ BİR ŞEY ETMƏ
        if (this.isLoginPage()) {
            console.log('📄 Login səhifəsi, auth yoxlanılmır');
            return;
        }

        // ✅ SƏHİFƏ AÇILAN KİMİ TOKEN YOXLA
        this.checkTokenAndRedirect();

        this.setupProfileButtons();
    }

    // ✅ Login səhifəsi yoxlanışı
    isLoginPage() {
        const path = window.location.pathname;
        return path.includes('login.html') ||
               path.includes('index.html') ||
               path === '/' ||
               path === '/login';
    }

    // ✅ Token var və etibarlıdır?
    hasValidToken() {
        // Token varmı?
        let token = localStorage.getItem('guven_token') ||
                    localStorage.getItem('access_token') ||
                    sessionStorage.getItem('guven_token');

        if (!token || token === 'null' || token === 'undefined' || token === '') {
            console.log('❌ Token tapılmadı');
            return false;
        }

        // Token vaxtı bitibmi?
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const exp = payload.exp;
            const now = Math.floor(Date.now() / 1000);

            if (exp < now) {
                console.log(`❌ Token vaxtı bitib: ${new Date(exp * 1000)} < ${new Date(now * 1000)}`);
                return false;
            }

            console.log('✅ Token etibarlıdır');
            return true;
        } catch (e) {
            console.error('❌ Token parse xətası:', e);
            return false;
        }
    }

    // ✅ Token yoxla, yoxdursa və ya bitibsə SƏHİFƏNİ YENİLƏ
    checkTokenAndRedirect() {
        // Login səhifəsində yoxlama
        if (this.isLoginPage()) {
            return;
        }

        console.log('🔐 Token yoxlanılır...');

        // Token yoxdursa və ya bitibsə
        if (!this.hasValidToken()) {
            console.log('🔄 Token problemi, səhifə yenilənir...');
            this.refreshPage();
        }
    }

    // ✅ Səhifəni yenilə və loginə yönləndir
    refreshPage() {
        // Cari path
        const currentPath = window.location.pathname;

        // Bütün məlumatları təmizlə
        localStorage.clear();
        sessionStorage.clear();

        // Cookies təmizlə
        document.cookie.split(";").forEach(function(c) {
            document.cookie = c.replace(/^ +/, "")
                .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });

        // Düzgün login path
        let loginPath = '/login.html';
        if (currentPath.includes('/owner/')) {
            loginPath = '../login.html';
        } else if (currentPath.includes('/admin/')) {
            loginPath = '../login.html';
        }

        console.log('🚪 Loginə yönləndirilir:', loginPath);

        // Səhifəni yenilə
        window.location.href = loginPath;
    }



    async checkAuthStatus() {
        console.log('🔐 Auth status yoxlanılır...');

        try {
            // Token yoxdursa
            if (!this.hasValidToken()) {
                console.log('🔴 Token yoxdur və ya bitib, səhifə yenilənir...');
                this.refreshPage();
                return false;
            }

            const response = await this.api.getCurrentUser();
            console.log('📄 API Response:', response);

            if (response === null) {
                this.refreshPage();
                return false;
            }

            // 🔥 BURADA DÜZƏLİŞ: user YOX, user_service VAR!
            if (response && response.success && response.user_service) {  // <-- user_service
                this.currentUser = response.user_service;
                console.log('✅ Auth successful for user:', this.currentUser.email);

                // 🆕 baza_id-ni də saxla
                if (this.currentUser.baza_id) {
                    localStorage.setItem('baza_id', this.currentUser.baza_id);
                    console.log('✅ baza_id saved from auth:', this.currentUser.baza_id);
                }

                return true;
            }

            console.warn('⚠️ Auth uğursuz - no user_service in response');
            this.refreshPage();
            return false;

        } catch (error) {
            console.error('❌ Auth xətası:', error.message);

            const cachedUser = this.getCachedUserData();
            if (cachedUser) {
                console.log('⚠️ Using cached user data due to API error');
                this.currentUser = cachedUser;
                return true;
            }

            this.refreshPage();
            return false;
        }
    }

    saveUserData(response) {
        if (!response || !response.user_service) return;  // <-- user_service

        localStorage.setItem('guven_user_data', JSON.stringify({
            success: true,
            user: response.user_service,  // <-- user_service
            timestamp: Date.now(),
            source: 'api-response'
        }));

        localStorage.setItem('user', JSON.stringify(response.user_service));  // <-- user_service

        if (response.user_service.email) {
            localStorage.setItem('user_email', response.user_service.email);
        }

        // baza_id-ni də saxla
        if (response.user_service.baza_id) {
            localStorage.setItem('baza_id', response.user_service.baza_id);
            console.log('💾 baza_id saved:', response.user_service.baza_id);
        }

        localStorage.setItem('guven_last_me_body', JSON.stringify(response));

        console.log('💾 User data saved to localStorage:', response.user_service.email);
    }

    // Cached user_service data almaq
    getCachedUserData() {
        const lastMeBody = localStorage.getItem('guven_last_me_body');
        if (lastMeBody) {
            try {
                const parsed = JSON.parse(lastMeBody);
                if (parsed.success && parsed.user_service) {  // <-- user_service
                    console.log('✅ Cached data from guven_last_me_body');
                    return parsed.user_service;
                }
            } catch (e) {
                console.error('Parse guven_last_me_body error:', e);
            }
        }

        const guvenData = localStorage.getItem('guven_user_data');
        if (guvenData) {
            try {
                const parsed = JSON.parse(guvenData);
                if (parsed.user) {
                    console.log('✅ Cached data from guven_user_data');
                    return parsed.user;
                }
            } catch (e) {
                console.error('Parse guven_user_data error:', e);
            }
        }

        const userData = localStorage.getItem('user');
        if (userData) {
            try {
                console.log('✅ Cached data from user');
                return JSON.parse(userData);
            } catch (e) {
                console.error('Parse user error:', e);
            }
        }

        return null;
    }

    // User ID-ni almaq
    getUserId() {
        console.log('🔍 getUserId çağırıldı');

        if (this.currentUser && this.currentUser.id) {
            console.log('✅ User ID currentUser-dən:', this.currentUser.id);
            return this.currentUser.id;
        }

        const guvenData = localStorage.getItem('guven_user_data');
        if (guvenData) {
            try {
                const parsed = JSON.parse(guvenData);
                if (parsed.user && parsed.user.id) {
                    console.log('✅ User ID guven_user_data-dan:', parsed.user.id);
                    this.currentUser = parsed.user;
                    return parsed.user.id;
                }
            } catch (e) {
                console.error('❌ Parse guven_user_data error:', e);
            }
        }

        const token = localStorage.getItem('guven_token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const userId = payload.sub || payload.user_id || payload.id;
                if (userId) {
                    console.log('✅ User ID token-dən:', userId);
                    return userId;
                }
            } catch (e) {
                console.error('❌ Token parse error:', e);
            }
        }

        if (window.app && window.app.currentUserId) {
            console.log('✅ User ID window.app-dən:', window.app.currentUserId);
            return window.app.currentUserId;
        }

        console.warn('⚠️ User ID tapılmadı');
        return null;
    }

    setupProfileButtons() {
        const profileMenuBtn = document.getElementById('profileMenuBtn');
        if (profileMenuBtn) {
            profileMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleProfileMenu();
            });
        }

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.handleLogout();
            });
        }

        document.addEventListener('click', (e) => {
            const profileMenu = document.getElementById('profileMenu');
            if (profileMenu &&
                !profileMenu.contains(e.target) &&
                !profileMenuBtn?.contains(e.target)) {
                profileMenu.classList.remove('show');
            }
        });
    }

    toggleProfileMenu() {
        const profileMenu = document.getElementById('profileMenu');
        if (profileMenu) {
            profileMenu.classList.toggle('show');
        }
    }

    showLoading(message) {
        console.log('⏳ Loading:', message);
    }

    showNotification(message, type = 'info') {
        console.log(`📢 ${type.toUpperCase()}: ${message}`);
    }

    async handleLogout() {
        try {
            if (confirm('Hesabdan çıxmaq istədiyinizə əminsiniz?')) {
                this.showLoading('Çıxış edilir...');

                try {
                    await this.api.post('/auth/logout');
                } catch (error) {
                    console.log('Logout API not available, proceeding with local cleanup');
                }

                this.clearAllStorage();
                this.clearAllCookies();
                await this.clearServiceWorkerCaches();
                await this.clearIndexedDB();
                await this.clearCacheStorage();
                sessionStorage.clear();

                setTimeout(() => {
                    const currentPath = window.location.pathname;
                    let loginPath = '/login.html';

                    if (currentPath.includes('/owner/')) {
                        loginPath = '../login.html';
                    } else if (currentPath.includes('/admin/')) {
                        loginPath = '../login.html';
                    }

                    console.log('🔀 Yönləndirilir:', loginPath);
                    window.location.href = loginPath;
                }, 1000);
            }
        } catch (error) {
            console.error('❌ Logout error:', error);
            this.showNotification('Çıxış zamanı xəta baş verdi', 'error');
        }
    }

    clearAllStorage() {
        console.log('🧹 BÜTÜN storage-lar təmizlənir...');
        this.clearLocalStorage();
        sessionStorage.clear();
        this.clearAllCookies();
        this.currentUser = null;
        if (this.api) {
            this.api.clearToken();
        }
        console.log('✅ Bütün storage-lar təmizləndi');
    }

    clearLocalStorage() {
        console.log('🗑️ LocalStorage təmizlənir...');
        localStorage.clear();

        const specificKeys = [
            'access_token', 'refresh_token', 'auth_token', 'token',
            'session_token', 'user_token', 'login_token', 'user', 'user_data',
            'user_info', 'user_profile', 'user_email', 'user_id', 'user_name',
            'last_login', 'remember_me', 'auth_state', 'login_state'
        ];

        specificKeys.forEach(key => {
            localStorage.removeItem(key);
        });

        console.log('✅ LocalStorage təmizləndi');
    }

    clearAllCookies() {
        console.log('🍪 Bütün cookies-lər təmizlənir...');

        const domain = window.location.hostname;
        const baseDomain = domain.replace(/^www\./, '.');
        const pastDate = 'Thu, 01 Jan 1970 00:00:00 UTC';

        document.cookie.split(';').forEach(cookie => {
            const cookieName = cookie.trim().split('=')[0];
            if (cookieName) {
                const domains = [domain, baseDomain, ''];
                const paths = ['/', '', '/;'];

                domains.forEach(d => {
                    paths.forEach(p => {
                        document.cookie = `${cookieName}=; expires=${pastDate}; path=${p}; domain=${d};`;
                    });
                });
            }
        });

        console.log('✅ Bütün cookies-lər təmizləndi');
    }

    async clearServiceWorkerCaches() {
        try {
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
                console.log('✅ Service Worker cache-ləri təmizləndi');
            }
        } catch (error) {
            console.warn('⚠️ Service Worker cache təmizləmə xətası:', error);
        }
    }

    async clearIndexedDB() {
        try {
            if ('indexedDB' in window) {
                const dbs = await indexedDB.databases();
                await Promise.all(dbs.map(db => {
                    return new Promise((resolve) => {
                        const request = indexedDB.deleteDatabase(db.name);
                        request.onsuccess = () => resolve();
                        request.onerror = () => resolve();
                    });
                }));
                console.log(`✅ ${dbs.length} IndexedDB database təmizləndi`);
            }
        } catch (error) {
            console.warn('⚠️ IndexedDB təmizləmə xətası:', error);
        }
    }

    async clearCacheStorage() {
        try {
            if ('caches' in window) {
                const keys = await caches.keys();
                await Promise.all(keys.map(key => caches.delete(key)));
                console.log('✅ Cache Storage təmizləndi');
            }
        } catch (error) {
            console.warn('⚠️ Cache Storage təmizləmə xətası:', error);
        }
    }

    async logout() {
        try {
            await this.api.post('/auth/logout');
        } catch (error) {
            console.warn('Logout API xətası:', error);
        }
        await this.clearAllStorage();
        this.currentUser = null;
        console.log('✅ Logout completed');
        return true;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isAuthenticated() {
        return !!this.currentUser && this.hasValidToken();
    }

    hasToken() {
        return this.hasValidToken();
    }

    getCurrentUserId() {
        return this.getUserId();
    }
}

window.AuthService = AuthService;