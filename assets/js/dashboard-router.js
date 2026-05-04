// assets/js/dashboard-router.js - FIXED (ROL DÜZGÜN OXUNUR)

(function() {
    console.log('📍 Dashboard Router v4.0 - Rol fix');

    var API_BASE = "/proxy.php";
    var USER_ME_ENDPOINT = API_BASE + "/api/v1/auth/me";

    var statusEl = document.getElementById('routing-status');
    var loadingEl = document.getElementById('loading-spinner');

    var setStatus = function (message, isError = false) {
        if (!statusEl) return;
        statusEl.textContent = message;
        if (isError) {
            statusEl.style.color = '#b00020';
        } else {
            statusEl.style.color = '#333';
        }
    };

    var showLoading = function (show) {
        if (loadingEl) {
            loadingEl.style.display = show ? 'flex' : 'none';
        }
    };

    var clearAuthStorage = function () {
        var keys = [
            'guven_token', 'guven_token_type', 'guven_user_role',
            'guven_user_id', 'guven_user', 'guven_user_name',
            'guven_company_name', 'guven_last_role_raw', 'guven_last_role_norm',
            'auth_token', 'user_email', 'user_name', 'user_uuid',
            'access_token', 'refresh_token', 'token_type', 'user_service'
        ];
        keys.forEach(key => localStorage.removeItem(key));
        sessionStorage.clear();
    };

    var getToken = function() {
        var token = localStorage.getItem('guven_token') ||
                   localStorage.getItem('access_token') ||
                   localStorage.getItem('auth_token');

        if (!token) {
            var cookies = document.cookie.split(';');
            for (var i = 0; i < cookies.length; i++) {
                var cookie = cookies[i].trim();
                if (cookie.startsWith('access_token=')) {
                    token = decodeURIComponent(cookie.substring('access_token='.length));
                    if (token) {
                        localStorage.setItem('guven_token', token);
                    }
                    break;
                }
            }
        }

        return token;
    };

    var getTokenType = function() {
        var type = localStorage.getItem('guven_token_type') || localStorage.getItem('token_type');
        return type === 'Bearer' ? 'Bearer' : 'Bearer';
    };

    // ✅ ROLU DÜZGÜN ÇIXARTMAQ ÜÇÜN YENİ FUNKSİYA
    var extractRoleFromResponse = function(userData) {
        console.log('🔍 Rol axtarılır:', userData);

        // 1. Əvvəlcə user_service obyektindən yoxla
        if (userData.user_service) {
            var user = userData.user_service;

            // Mümkün rol field-ləri (prioritet sırası ilə)
            var role = user.role ||           // "role": "company_admin"
                      user.user_type ||        // "user_type": "company_admin"
                      user.user_role ||        // "user_role": "company_admin"
                      user.type;               // "type": "company_admin"

            if (role) {
                console.log('✅ Rol user_service-dən tapıldı:', role);
                return role;
            }

            // Əgər ayrıca rol field-i yoxdursa, user_type-dən götür
            if (user.user_type) {
                console.log('✅ Rol user_type-dən tapıldı:', user.user_type);
                return user.user_type;
            }
        }

        // 2. Birbaşa root səviyyədən yoxla
        var directRole = userData.role || userData.user_type || userData.user_role;
        if (directRole) {
            console.log('✅ Rol root səviyyədən tapıldı:', directRole);
            return directRole;
        }

        // 3. Əgər heç nə tapılmadısa, default employee
        console.warn('⚠️ Rol tapılmadı, default "employee" istifadə olunur');
        return 'employee';
    };

    var saveUserData = function(userData) {
        console.log('💾 İstifadəçi məlumatları yadda saxlanır...');

        // User service obyektini tap
        var user = userData.user_service || userData;

        // ROLU DÜZGÜN TAP
        var role = extractRoleFromResponse(userData);

        // Əsas məlumatları yadda saxla
        if (user.id) {
            localStorage.setItem('guven_user_id', user.id);
            localStorage.setItem('user_id', user.id);
        }
        if (user.name) {
            localStorage.setItem('guven_user_name', user.name);
            localStorage.setItem('user_name', user.name);
        }
        if (user.email) {
            localStorage.setItem('guven_user_email', user.email);
            localStorage.setItem('user_email', user.email);
        }
        if (user.surname) {
            localStorage.setItem('guven_user_surname', user.surname);
        }
        if (user.company_name) {
            localStorage.setItem('guven_company_name', user.company_name);
        }
        if (user.company_code) {
            localStorage.setItem('guven_company_code', user.company_code);
        }
        if (user.baza_id) {
            localStorage.setItem('guven_baza_id', user.baza_id);
        }

        // ✅ ROLU YADDA SAXLA
        localStorage.setItem('guven_user_role', role);
        localStorage.setItem('user_role', role);

        // Bütün məlumatları saxla
        localStorage.setItem('user_service', JSON.stringify(user));

        console.log('✅ Məlumatlar yadda saxlandı. ROL:', role);
        console.log('📦 localStorage-da guven_user_role:', localStorage.getItem('guven_user_role'));

        return role;
    };

    var normalizeRole = function (role) {
        if (!role) return 'employee';

        var normalized = String(role).trim().toLowerCase();

        console.log('🔄 Normallaşdırma:', role, '→', normalized);

        // Company admin
        if (normalized === 'company_admin' || normalized === 'companyadmin' ||
            normalized === 'ceo' || normalized === 'company' || normalized === 'company_admin') {
            return 'company_admin';
        }

        // Super admin
        if (normalized === 'super_admin' || normalized === 'superadmin' ||
            normalized === 'admin') {
            return 'super_admin';
        }

        // Employee
        if (normalized === 'employee' || normalized === 'user' ||
            normalized === 'worker' || normalized === 'user') {
            return 'employee';
        }

        console.warn('⚠️ Tanınmayan rol formatı:', role, '- default employee');
        return 'employee';
    };

    var routeByRole = function (rawRole) {
        var normalized = normalizeRole(rawRole);

        localStorage.setItem('guven_last_role_raw', rawRole);
        localStorage.setItem('guven_last_role_norm', normalized);

        console.log(`🎯 YÖNLƏNDİRMƏ: raw=${rawRole} → normalized=${normalized}`);

        // Səhifələrin mövcudluğunu yoxla
        switch(normalized) {
            case 'company_admin':
                console.log('🏢 Company Admin → /owner/owp.html');
                window.location.href = '/owner/owp.html';
                break;
            case 'super_admin':
                console.log('👑 Super Admin → /admin.html');
                window.location.href = '/admin.html';
                break;
            case 'employee':
                console.log('👷 Employee → /worker/wp.html');
                window.location.href = '/worker/wp.html';
                break;
            default:
                console.warn('⚠️ Default: employee → /worker/wp.html');
                window.location.href = '/worker/wp.html';
        }
    };

    var authenticateAndRoute = async function(retryCount = 0) {
        showLoading(true);
        setStatus('Giriş yoxlanılır...');

        var token = getToken();

        if (!token) {
            console.warn('⚠️ Token tapılmadı');
            clearAuthStorage();
            showLoading(false);
            window.location.href = '/login.html?reason=no_token';
            return;
        }

        var tokenType = getTokenType();
        console.log(`🔗 Sorğu: ${USER_ME_ENDPOINT} (cəhd: ${retryCount + 1})`);

        try {
            var response = await fetch(USER_ME_ENDPOINT, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `${tokenType} ${token}`,
                    'Accept': 'application/json'
                },
                credentials: 'include',
                cache: 'no-cache'
            });

            console.log(`📥 Status: ${response.status}`);

            if (response.status === 401 || response.status === 403) {
                console.error('❌ Auth xətası:', response.status);
                clearAuthStorage();
                window.location.href = '/login.html?reason=session_expired';
                return;
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            var responseData = await response.json();
            console.log('✅ İstifadəçi məlumatı:', responseData);

            // ✅ ROLU DÜZGÜN TAP
            var role = saveUserData(responseData);

            console.log(`🎯 Təyin edilmiş rol: "${role}"`);

            if (!role || role === 'undefined') {
                console.error('❌ Rol təyin edilə bilmədi!');
                setStatus('Rol tapılmadı', true);
                setTimeout(() => {
                    window.location.href = '/login.html?reason=no_role';
                }, 2000);
                return;
            }

            setStatus(`Yönləndirilir: ${role}...`);

            // Yönləndirmədən əvvəl qısa gözləmə
            setTimeout(() => {
                routeByRole(role);
            }, 500);

        } catch (error) {
            console.error('❌ Xəta:', error);
            setStatus('Xəta: ' + error.message, true);

            if (retryCount < 2) {
                console.log(`🔄 Yenidən cəhd ${retryCount + 1}/2...`);
                setTimeout(() => {
                    authenticateAndRoute(retryCount + 1);
                }, 1500);
            } else {
                showLoading(false);
                setTimeout(() => {
                    window.location.href = '/login.html?reason=error';
                }, 2000);
            }
        }
    };

    // Başlat
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => authenticateAndRoute());
    } else {
        authenticateAndRoute();
    }
})();