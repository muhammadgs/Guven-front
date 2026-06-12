// assets/js/draw_js/dashboard-redirect.js
// FlowDraw üçün Dashboard yönləndirmə sistemi

class DashboardRedirect {
    constructor() {
        console.log('🚀 FlowDraw Dashboard Redirect başladılır...');
        this.apiService = null;
        this.initializeApiService();
    }

    // ==================== API SERVICE INIT ====================
    initializeApiService() {
        try {
            // Əgər ApiService artıq yüklənibsə
            if (typeof ApiService !== 'undefined') {
                this.apiService = new ApiService();
                console.log('✅ ApiService yükləndi');
            } else {
                console.warn('⚠️ ApiService tapılmadı, manual auth yoxlanışı ediləcək');
            }
        } catch (error) {
            console.error('❌ ApiService init xətası:', error);
        }
    }

    // ==================== ROLE DETECTION ====================
    async getUserRole() {
        try {
            console.log('🔍 İstifadəçi rolu axtarılır...');

            // 1. Əvvəlcə API-dən yoxla (ən etibarlı)
            if (this.apiService && typeof this.apiService.getCurrentUser === 'function') {
                try {
                    const userData = await this.apiService.getCurrentUser();
                    console.log('👤 API-dən user məlumatı:', userData);

                    if (userData && userData.role) {
                        console.log('✅ Rol API-dən götürüldü:', userData.role);
                        this.saveRoleToStorage(userData.role);
                        return userData.role;
                    }
                } catch (apiError) {
                    console.warn('⚠️ API-dən rol alınmadı:', apiError.message);
                }
            }

            // 2. localStorage-dan yoxla
            const storedRole = this.getRoleFromStorage();
            if (storedRole) {
                console.log('💾 Rol localStorage-dan götürüldü:', storedRole);
                return storedRole;
            }

            // 3. Token-dən yoxla
            const token = this.getAuthToken();
            if (token) {
                const payload = this.parseTokenPayload(token);
                if (payload && payload.role) {
                    console.log('🔐 Rol token-dən götürüldü:', payload.role);
                    this.saveRoleToStorage(payload.role);
                    return payload.role;
                }
            }

            // 4. taskManager-dən yoxla (əgər varsa)
            if (window.taskManager && window.taskManager.userData && window.taskManager.userData.role) {
                const role = window.taskManager.userData.role;
                console.log('👥 Rol taskManager-dən götürüldü:', role);
                this.saveRoleToStorage(role);
                return role;
            }

            // 5. Default rol
            console.warn('⚠️ Rol tapılmadı, default "employee" qəbul edilir');
            return 'employee';

        } catch (error) {
            console.error('❌ Rol yoxlanışı xətası:', error);
            return 'employee';
        }
    }

    getRoleFromStorage() {
        const ROLE_KEYS = [
            'guven_user_role',
            'current_role',
            'userRole',
            'user_role',
            'flowdraw_role',
            'diagram_role'
        ];

        for (const key of ROLE_KEYS) {
            const value = localStorage.getItem(key) || sessionStorage.getItem(key);
            if (value && value.trim() && value !== 'null' && value !== 'undefined') {
                return value.trim();
            }
        }

        return null;
    }

    saveRoleToStorage(role) {
        if (!role) return;

        const ROLE_KEYS = ['guven_user_role', 'current_role', 'flowdraw_role'];
        ROLE_KEYS.forEach(key => {
            localStorage.setItem(key, role);
            sessionStorage.setItem(key, role);
        });

        console.log('💾 Rol saxlamaq:', role);
    }

    // ==================== TOKEN OPERATIONS ====================
    getAuthToken() {
        const TOKEN_KEYS = [
            'guven_token',
            'access_token',
            'accessToken',
            'token',
            'auth_token',
            'jwt_token',
            'flowdraw_token'
        ];

        for (const key of TOKEN_KEYS) {
            // localStorage-dan yoxla
            const localValue = localStorage.getItem(key);
            if (localValue && this.isValidToken(localValue)) {
                console.log('🔑 Token tapıldı (localStorage):', key);
                return localValue.trim();
            }

            // sessionStorage-dan yoxla
            const sessionValue = sessionStorage.getItem(key);
            if (sessionValue && this.isValidToken(sessionValue)) {
                console.log('🔑 Token tapıldı (sessionStorage):', key);
                return sessionValue.trim();
            }

            // Cookies-dən yoxla
            const cookieValue = this.getCookie(key);
            if (cookieValue && this.isValidToken(cookieValue)) {
                console.log('🍪 Token tapıldı (cookies):', key);
                return cookieValue.trim();
            }
        }

        console.warn('⚠️ Token tapılmadı');
        return null;
    }

    isValidToken(token) {
        return token &&
               token.trim() &&
               token !== 'null' &&
               token !== 'undefined' &&
               token.length > 10;
    }

    getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }

    parseTokenPayload(token) {
        if (!token) return null;

        try {
            // JWT formatını yoxla
            const parts = token.split('.');
            if (parts.length !== 3) {
                console.warn('⚠️ Token JWT formatında deyil');
                return null;
            }

            // Base64URL decode
            const base64Url = parts[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');

            // Padding əlavə et
            const pad = base64.length % 4;
            const paddedBase64 = pad ? base64 + '='.repeat(4 - pad) : base64;

            // Decode et
            const jsonPayload = decodeURIComponent(atob(paddedBase64).split('').map(c => {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));

            return JSON.parse(jsonPayload);
        } catch (error) {
            console.error('❌ Token parse xətası:', error);
            return null;
        }
    }

    // ==================== DASHBOARD REDIRECT ====================
    async getDashboardUrl(role = '') {
        const userRole = role || await this.getUserRole();
        console.log('🔄 Dashboard URL-i müəyyən edilir, rol:', userRole);

        const roleLower = userRole.toLowerCase().trim();

        // Role mapping
        if (roleLower.includes('super_admin') ||
            roleLower.includes('superadmin') ||
            (roleLower.includes('admin') && roleLower.includes('super'))) {
            console.log('👑 Super Admin panelinə yönləndirilir');
            return '../admin.html';
        }
        else if (roleLower.includes('company_admin') ||
                roleLower.includes('owner') ||
                roleLower.includes('business_admin') ||
                (roleLower.includes('admin') && !roleLower.includes('super'))) {
            console.log('🏢 Company Admin panelinə yönləndirilir');
            return '../owner/owp.html';
        }
        else if (roleLower.includes('employee') ||
                roleLower.includes('worker') ||
                roleLower.includes('staff') ||
                roleLower.includes('user')) {
            console.log('👷 Employee panelinə yönləndirilir');
            return '../worker/wp.html';
        }
        else {
            console.warn('⚠️ Tanınmayan rol:', userRole, '- Əsas səhifəyə yönləndirilir');
            return '../index.html';
        }
    }

    async redirectToDashboard() {
        try {
            console.log('📍 Dashboard-a yönləndirilir...');

            // Rol və URL-i tap
            const role = await this.getUserRole();
            const dashboardUrl = await this.getDashboardUrl(role);

            console.log('🎯 Yönləndirilən URL:', dashboardUrl);

            // 3 saniyə gözlə və yönləndir
            setTimeout(() => {
                window.location.href = dashboardUrl;
            }, 300);

        } catch (error) {
            console.error('❌ Yönləndirmə xətası:', error);
            // Əsas səhifəyə yönləndir
            window.location.href = '../index.html';
        }
    }

    // ==================== BUTTON MANAGEMENT ====================
    async updateBackButton() {
        try {
            const backButton = document.getElementById('backPanelBtn');
            if (!backButton) {
                console.warn('⚠️ Back button tapılmadı (id: backPanelBtn)');
                return;
            }

            // Rol və URL-i al
            const role = await this.getUserRole();
            const dashboardUrl = await this.getDashboardUrl(role);

            // Button mətnini dəyiş
            const spanElement = backButton.querySelector('span');
            if (spanElement) {
                const roleLower = role.toLowerCase();

                if (roleLower.includes('super_admin')) {
                    spanElement.textContent = 'Admin Panel';
                } else if (roleLower.includes('company_admin')) {
                    spanElement.textContent = 'Owner Panel';
                } else if (roleLower.includes('employee')) {
                    spanElement.textContent = 'Worker Panel';
                } else {
                    spanElement.textContent = 'Dashboard';
                }
            }

            // Href-i təyin et
            backButton.href = dashboardUrl;

            // Click event əlavə et
            backButton.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.redirectToDashboard();
            });

            console.log('✅ Back button yeniləndi:', backButton);

        } catch (error) {
            console.error('❌ Button yeniləmə xətası:', error);
        }
    }

    // ==================== INITIALIZATION ====================
    init() {
        console.log('🔧 Dashboard Redirect init edilir...');

        // Back button-u qur
        this.updateBackButton();

        // Əlavə button-lar üçün
        this.setupAdditionalButtons();

        console.log('✅ Dashboard Redirect hazırdır');
    }

    setupAdditionalButtons() {
        // Əlavə back button-lar üçün
        const additionalBackBtns = document.querySelectorAll('[data-action="back-to-dashboard"]');
        additionalBackBtns.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.redirectToDashboard();
            });
        });
    }

    // ==================== TEST FUNCTIONS ====================
    async testSystem() {
        console.log('🧪 === FLOWDRAW REDIRECT TESTİ ===');

        console.log('1. Token var?', this.getAuthToken() ? '✅ Var' : '❌ Yox');

        const token = this.getAuthToken();
        if (token) {
            const payload = this.parseTokenPayload(token);
            console.log('2. Token payload:', payload);
        }

        console.log('3. localStorage-dan rol:', this.getRoleFromStorage());

        const detectedRole = await this.getUserRole();
        console.log('4. Aşkar edilən rol:', detectedRole);

        const dashboardUrl = await this.getDashboardUrl(detectedRole);
        console.log('5. Dashboard URL:', dashboardUrl);

        console.log('✅ === TEST TAMAMLANDI ===');

        return {
            role: detectedRole,
            url: dashboardUrl,
            token: token ? 'Mövcud' : 'Yox'
        };
    }
}

// Global instance yarat
window.flowDrawDashboard = new DashboardRedirect();

// HTML yükləndikdə işə düş
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 FlowDraw səhifəsi hazırdır');

    // Əgər debug istəyirsinizsə:
    // await window.flowDrawDashboard.testSystem();

    // Redirect sistemini başlat
    window.flowDrawDashboard.init();
});

// Əgər ApiService gec yüklənərsə
if (typeof ApiService !== 'undefined') {
    console.log('⚡ ApiService artıq mövcuddur');
    window.flowDrawDashboard.initializeApiService();
}