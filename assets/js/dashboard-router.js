// assets/js/dashboard-router.js - SADƏ VƏ ETİBARLI VERSİYA

(function() {
    'use strict';

    console.log('📍 Dashboard Router v6.0 - Sadə versiya');

    var API_BASE = "/proxy.php";
    var USER_ME_ENDPOINT = API_BASE + "/api/v1/auth/me";
    var REFRESH_ENDPOINT = API_BASE + "/api/v1/auth/refresh";

    var statusEl = document.getElementById('routing-status');
    var loadingEl = document.getElementById('loading-spinner');

    var setStatus = function(message, isError) {
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.style.color = isError ? '#b00020' : '#333';
        }
        console.log(message);
    };

    var showLoading = function(show) {
        if (loadingEl) loadingEl.style.display = show ? 'flex' : 'none';
    };

    // Token alma
    var getToken = function() {
        var token = localStorage.getItem('guven_token') ||
                    localStorage.getItem('access_token') ||
                    document.cookie.match(/access_token=([^;]+)/)?.[1];

        if (token && token !== 'null' && token !== 'undefined') {
            return token;
        }
        return null;
    };

    // Refresh token alma
    var getRefreshToken = function() {
        return localStorage.getItem('guven_refresh_token') ||
               localStorage.getItem('refresh_token');
    };

    // Token vaxtını yoxla
    var isTokenExpired = function(token) {
        if (!token) return true;
        try {
            var payload = JSON.parse(atob(token.split('.')[1]));
            var exp = payload.exp;
            var now = Math.floor(Date.now() / 1000);
            return exp < now;
        } catch(e) {
            return true;
        }
    };

    // Token yenilə
    var refreshToken = async function() {
        var refreshToken = getRefreshToken();
        if (!refreshToken) {
            console.log('❌ Refresh token yoxdur');
            return false;
        }

        console.log('🔄 Token yenilənir...');
        setStatus('Token yenilənir...');

        try {
            var response = await fetch(REFRESH_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: refreshToken }),
                credentials: 'include'
            });

            if (response.ok) {
                var data = await response.json();
                if (data.access_token) {
                    localStorage.setItem('guven_token', data.access_token);
                    localStorage.setItem('access_token', data.access_token);
                    console.log('✅ Token yeniləndi');
                    return true;
                }
            }

            console.log('❌ Token yenilənmədi, status:', response.status);
            return false;
        } catch(e) {
            console.error('Refresh xətası:', e);
            return false;
        }
    };

    // ROLU TAP (MÜTLƏQ)
    var extractRole = function(userData) {
        console.log('🔍 Rol axtarılır:', userData);

        // 1. user_service.role
        if (userData.user_service) {
            var role = userData.user_service.role ||
                      userData.user_service.user_type ||
                      userData.user_service.user_role;
            if (role && role !== 'null' && role !== 'undefined') {
                console.log('✅ Rol user_service-dən:', role);
                return role;
            }
        }

        // 2. Root səviyyə
        var directRole = userData.role || userData.user_type || userData.user_role;
        if (directRole && directRole !== 'null' && directRole !== 'undefined') {
            console.log('✅ Rol root-dan:', directRole);
            return directRole;
        }

        // 3. Token-dən
        var token = getToken();
        if (token) {
            try {
                var payload = JSON.parse(atob(token.split('.')[1]));
                var tokenRole = payload.role || payload.user_type || payload.user_role;
                if (tokenRole) {
                    console.log('✅ Rol token-dən:', tokenRole);
                    return tokenRole;
                }
            } catch(e) {}
        }

        // 4. LocalStorage-dan
        var storedRole = localStorage.getItem('guven_user_role');
        if (storedRole && storedRole !== 'null') {
            console.log('✅ Rol localStorage-dan:', storedRole);
            return storedRole;
        }

        console.warn('⚠️ Rol tapılmadı, default "employee"');
        return 'employee';
    };

    // Rol normallaşdır
    var normalizeRole = function(role) {
        if (!role) return 'employee';
        var r = String(role).toLowerCase().trim();

        if (r === 'company_admin' || r === 'companyadmin' || r === 'ceo' || r === 'company') {
            return 'company_admin';
        }
        if (r === 'super_admin' || r === 'superadmin' || r === 'admin') {
            return 'super_admin';
        }
        return 'employee';
    };

    // Yönləndir
    var redirect = function(role) {
        var normalized = normalizeRole(role);
        console.log('🎯 Yönləndirilir:', normalized);

        var pages = {
            'company_admin': '/owner/owp.html',
            'super_admin': '/admin.html',
            'employee': '/worker/wp.html'
        };

        var url = pages[normalized] || '/worker/wp.html';

        // 1 saniyə gözlə və yönləndir
        setTimeout(function() {
            window.location.href = url;
        }, 500);
    };

    // ƏSAS FUNKSİYA
    var init = async function(retryCount) {
        retryCount = retryCount || 0;
        if (retryCount > 3) {
            setStatus('Xəta: Çox sayda cəhd', true);
            setTimeout(function() { window.location.href = '/login.html'; }, 2000);
            return;
        }

        showLoading(true);
        setStatus('Yoxlanılır...');

        var token = getToken();

        // Token yoxdursa, refresh et
        if (!token) {
            console.log('Token yoxdur, refresh edilir...');
            var refreshed = await refreshToken();
            if (!refreshed) {
                setStatus('Token tapılmadı, loginə yönləndirilir', true);
                setTimeout(function() { window.location.href = '/login.html'; }, 1000);
                return;
            }
            token = getToken();
        }

        // Token bitibsə, refresh et
        if (isTokenExpired(token)) {
            console.log('Token bitib, refresh edilir...');
            var refreshed = await refreshToken();
            if (!refreshed) {
                setStatus('Token bitib, loginə yönləndirilir', true);
                setTimeout(function() { window.location.href = '/login.html'; }, 1000);
                return;
            }
            token = getToken();
        }

        if (!token) {
            setStatus('Token yoxdur', true);
            setTimeout(function() { window.location.href = '/login.html'; }, 1000);
            return;
        }

        // İstifadəçi məlumatlarını al
        try {
            console.log('📡 İstifadəçi məlumatları alınır...');
            var response = await fetch(USER_ME_ENDPOINT, {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            console.log('📡 Response status:', response.status);

            if (response.status === 401) {
                console.log('401 xətası, refresh edilir...');
                var refreshed = await refreshToken();
                if (refreshed) {
                    return init(retryCount + 1);
                } else {
                    setStatus('Sessiya bitib, yenidən daxil olun', true);
                    setTimeout(function() { window.location.href = '/login.html'; }, 1000);
                    return;
                }
            }

            if (!response.ok) {
                throw new Error('HTTP ' + response.status);
            }

            var data = await response.json();
            console.log('📡 Cavab:', data);

            // Məlumatları saxla
            if (data.user_service) {
                var user = data.user_service;
                if (user.id) localStorage.setItem('guven_user_id', user.id);
                if (user.email) localStorage.setItem('guven_user_email', user.email);
                if (user.baza_id) localStorage.setItem('baza_id', user.baza_id);
                if (user.company_code) localStorage.setItem('guven_company_code', user.company_code);
                if (user.company_name) localStorage.setItem('guven_company_name', user.company_name);
            }

            // ROLU TAP VƏ YÖNLƏNDİR
            var role = extractRole(data);
            console.log('🎯 Təyin edilmiş rol:', role);

            // Rolu saxla
            localStorage.setItem('guven_user_role', role);
            localStorage.setItem('user_role', role);

            setStatus('Yönləndirilir: ' + role);
            redirect(role);

        } catch(error) {
            console.error('Xəta:', error);
            setStatus('Xəta: ' + error.message, true);

            if (retryCount < 2) {
                console.log('Yenidən cəhd edilir...');
                setTimeout(function() { init(retryCount + 1); }, 1500);
            } else {
                setTimeout(function() { window.location.href = '/login.html'; }, 2000);
            }
        }
    };

    // BAŞLAT
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { init(); });
    } else {
        init();
    }
})();