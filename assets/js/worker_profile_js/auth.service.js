// assets/js/auth.service.js

class AuthService {
    constructor(apiService) {
        this.api = apiService;
        this.currentUser = null;

        if (this.isLoginPage()) return;

        // ✅ Cookie-dən tokeni localStorage-a KÖÇÜR
        this.syncTokenFromCookie();

        // Token yoxla
        this.checkTokenAndRedirect();

        this.setupProfileButtons();
    }

    // ✅ Cookie-dən tokeni al və localStorage-a yaz
    syncTokenFromCookie() {
        // Cookie-dən access_token-i oxu
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            cookie = cookie.trim();
            if (cookie.startsWith('access_token=')) {
                const token = decodeURIComponent(cookie.substring('access_token='.length));
                if (token && token !== 'null' && token !== 'undefined') {
                    localStorage.setItem('guven_token', token);
                    localStorage.setItem('access_token', token);
                    console.log('✅ Token cookie-dən localStorage-a köçürüldü');
                    break;
                }
            }
        }

        // Refresh token-i də köçür
        for (let cookie of cookies) {
            cookie = cookie.trim();
            if (cookie.startsWith('refresh_token=')) {
                const token = decodeURIComponent(cookie.substring('refresh_token='.length));
                if (token) {
                    localStorage.setItem('guven_refresh_token', token);
                    localStorage.setItem('refresh_token', token);
                    console.log('✅ Refresh token cookie-dən localStorage-a köçürüldü');
                    break;
                }
            }
        }
    }

    // ✅ Tokeni həm cookie, həm localStorage-a yaz
    saveToken(token, refreshToken = null) {
        if (token) {
            localStorage.setItem('guven_token', token);
            localStorage.setItem('access_token', token);

            // Cookie də yaz (backend ilə sync üçün)
            document.cookie = `access_token=${token}; path=/; max-age=${30 * 24 * 3600}; SameSite=Lax`;
        }

        if (refreshToken) {
            localStorage.setItem('guven_refresh_token', refreshToken);
            localStorage.setItem('refresh_token', refreshToken);
            document.cookie = `refresh_token=${refreshToken}; path=/; max-age=${90 * 24 * 3600}; SameSite=Lax`;
        }

        console.log('✅ Token həm cookie, həm localStorage-a yazıldı');
    }

    // ✅ Tokeni al (əvvəl localStorage, sonra cookie)
    getToken() {
        let token = localStorage.getItem('guven_token');
        if (token && token !== 'null') return token;

        // Cookie-dən yoxla
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            cookie = cookie.trim();
            if (cookie.startsWith('access_token=')) {
                token = decodeURIComponent(cookie.substring('access_token='.length));
                if (token) {
                    localStorage.setItem('guven_token', token);
                    return token;
                }
            }
        }

        return null;
    }

    // ✅ Token etibarlıdır?
    hasValidToken() {
        let token = this.getToken();

        if (!token || token === 'null' || token === 'undefined') {
            console.log('❌ Token tapılmadı');
            return false;
        }

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const exp = payload.exp;
            const now = Math.floor(Date.now() / 1000);

            if (exp < now) {
                console.log(`❌ Token bitib: ${new Date(exp * 1000)}`);
                return false;
            }

            const daysLeft = ((exp - now) / 86400).toFixed(1);
            console.log(`✅ Token etibarlı, bitməsinə ${daysLeft} gün`);
            return true;
        } catch (e) {
            console.error('Token parse xətası:', e);
            return false;
        }
    }

    // ✅ Token yoxla, bitibsə loginə at
    checkTokenAndRedirect() {
        if (this.isLoginPage()) return;

        // Hər dəfə cookie-dən sync et
        this.syncTokenFromCookie();

        if (!this.hasValidToken()) {
            console.log('🔴 Token problemi, loginə yönləndirilir');
            this.redirectToLogin();
        }
    }

    // ✅ Loginə yönləndir
    redirectToLogin() {
        localStorage.clear();
        sessionStorage.clear();

        let loginPath = 'login';
        if (window.location.pathname.includes('/') ||
            window.location.pathname.includes('/')) {
            loginPath = '../login.html';
        }

        window.location.href = loginPath;
    }

    isLoginPage() {
        const path = window.location.pathname;
        return path.includes('login.html') || path === '/' || path === '/login';
    }

    async checkAuthStatus() {
        this.syncTokenFromCookie();

        if (!this.hasValidToken()) {
            this.redirectToLogin();
            return false;
        }

        try {
            const response = await this.api.getCurrentUser();
            if (response && response.success && response.user_service) {
                this.currentUser = response.user_service;
                return true;
            }
        } catch (error) {
            console.error('Auth xətası:', error);
        }

        return true;
    }

    getUserId() {
        const token = this.getToken();
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                return payload.sub || payload.user_id || payload.id;
            } catch(e) {}
        }
        return null;
    }

    setupProfileButtons() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (confirm('Hesabdan çıxmaq?')) {
                    this.redirectToLogin();
                }
            });
        }
    }

    getCurrentUser() { return this.currentUser; }
    isAuthenticated() { return this.hasValidToken(); }
    hasToken() { return this.hasValidToken(); }
    getCurrentUserId() { return this.getUserId(); }
}

window.AuthService = AuthService;