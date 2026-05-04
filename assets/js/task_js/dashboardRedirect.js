// assets/js/task_js/dashboardRedirect.js
// Dashboard yönləndirmələri və role idarəetməsi

class DashboardRedirect {
    constructor() {
        console.log('🚀 Dashboard Redirect başladılır...');
        this.authCheckInterval = null;
        this._lastCheck = 0;
        this._checking = false;

        // SADƏCƏ bir dəfə init et
        setTimeout(() => {
            this.initAuthCheck();
        }, 1000);
    }

    // ==================== AUTH CHECK ====================
    initAuthCheck() {
        console.log('🔐 Auth yoxlaması işə salınır...');

        // Bir dəfə yoxla
        this.checkAuthStatus();

        // Interval yalnız bir dəfə qur
        if (!this.authCheckInterval) {
            // Hər 2 dəqiqədən bir yoxla
            this.authCheckInterval = setInterval(() => {
                this.checkAuthStatus();
            }, 120000); // 2 dəqiqə

            console.log('✅ Auth monitor aktiv edildi (2 dəqiqə interval)');
        }
    }

    checkAuthStatus() {
        const now = Date.now();

        // Əgər son 30 saniyədə yoxlanılıbsa, yoxlama
        if (now - this._lastCheck < 30000 && this._checking === false) {
            return true;
        }

        this._lastCheck = now;
        this._checking = true;

        try {
            // AuthService varsa onunla yoxla
            if (typeof AuthService !== 'undefined') {
                // AuthService-in öz debounce-unu istifadə et
                const result = AuthService.checkAuth();
                this._checking = false;
                return result;
            } else {
                // AuthService yoxdursa, sadə yoxlama
                return this.basicAuthCheck();
            }
        } catch (error) {
            console.error('❌ Auth yoxlama xətası:', error);
            this._checking = false;
            return false;
        }
    }

    basicAuthCheck() {
        try {
            const token = this.getAuthToken();

            if (!token) {
                console.warn('⚠️ Token tapılmadı');
                this.handleUnauthorized();
                return false;
            }

            return true;
        } catch (error) {
            console.error('❌ Basic auth yoxlama xətası:', error);
            return false;
        } finally {
            this._checking = false;
        }
    }

    handleUnauthorized() {
        console.log('🔐 Session sonlandı, login səhifəsinə yönləndirilir...');

        // Auth data təmizlə
        this.clearAuthData();

        // Login səhifəsinə yönləndir
        setTimeout(() => {
            window.location.href = '../login.html';
        }, 1500);
    }

    // ==================== ROLE DETECTION ====================
    getUserRole() {
        try {
            // 1. localStorage-dan yoxla
            const storedRole = localStorage.getItem('guven_user_role') ||
                               localStorage.getItem('current_role') ||
                               localStorage.getItem('userRole');

            if (storedRole) {
                return storedRole;
            }

            // 2. Token-dən yoxla
            const token = this.getAuthToken();
            if (token) {
                const payload = this.parseTokenPayload(token);
                if (payload && payload.role) {
                    return payload.role;
                }
            }

            return 'employee';

        } catch (error) {
            console.error('❌ Rol yoxlanışı xətası:', error);
            return 'employee';
        }
    }

    // ==================== TOKEN OPERATIONS ====================
    getAuthToken() {
        const AUTH_TOKEN_KEYS = ['guven_token', 'access_token', 'token'];

        for (const key of AUTH_TOKEN_KEYS) {
            const localValue = localStorage.getItem(key);
            if (localValue && localValue.trim() && localValue !== 'null' && localValue !== 'undefined') {
                return localValue.trim();
            }
        }

        return '';
    }

    parseTokenPayload(token) {
        if (!token) return null;

        try {
            const parts = token.split('.');
            if (parts.length === 3) {
                const base64Url = parts[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));

                return JSON.parse(jsonPayload);
            }
        } catch (error) {
            console.error('❌ Token parse xətası:', error);
        }

        return null;
    }

    // ==================== QALAN FUNKSİYALAR ====================
    getDashboardUrl(role = '') {
        const userRole = role || this.getUserRole();
        const roleLower = userRole.toLowerCase();

        if (roleLower.includes('company_admin') || roleLower.includes('owner')) {
            return '../owner/owp.html';
        }
        else if (roleLower.includes('employee') || roleLower.includes('worker')) {
            return '../worker/wp.html';
        }
        else if (roleLower.includes('super_admin') || roleLower.includes('superadmin')) {
            return '../admin.html';
        }
        else {
            return '../index.html';
        }
    }

    redirectToDashboard(role = '') {
        const dashboardUrl = this.getDashboardUrl(role);
        window.location.href = dashboardUrl;
    }

    updateBackButtonText() {
        const backButton = document.getElementById('backPanelBtn');
        const backButtonText = backButton ? backButton.querySelector('span') : null;

        if (!backButtonText) return;

        const userRole = this.getUserRole();
        const roleLower = userRole.toLowerCase();

        let buttonText = 'Panelə qayıt';

        if (roleLower.includes('company_admin') || roleLower.includes('owner')) {
            buttonText = 'Panelə Qayıt';
        }
        else if (roleLower.includes('super_admin') || roleLower.includes('superadmin')) {
            buttonText = 'Admin Panelinə Qayıt';
        }

        backButtonText.textContent = buttonText;
    }

    setupBackButtons() {
        const backHomeBtn = document.getElementById('backHomeBtn');
        const backPanelBtn = document.getElementById('backPanelBtn');

        if (backHomeBtn) {
            backHomeBtn.addEventListener('click', () => {
                window.location.href = '../index.html';
            });
        }

        if (backPanelBtn) {
            backPanelBtn.addEventListener('click', () => {
                this.redirectToDashboard();
            });
        }

        this.updateBackButtonText();
    }

    cleanup() {
        if (this.authCheckInterval) {
            clearInterval(this.authCheckInterval);
            this.authCheckInterval = null;
        }
    }
}

// Global instance yarat
window.dashboardRedirect = new DashboardRedirect();

// HTML yükləndikdə
document.addEventListener('DOMContentLoaded', function() {
    // Back button-ları qur
    if (window.dashboardRedirect) {
        window.dashboardRedirect.setupBackButtons();
    }
});

// Page unload zamanı cleanup
window.addEventListener('beforeunload', function() {
    if (window.dashboardRedirect) {
        window.dashboardRedirect.cleanup();
    }
});