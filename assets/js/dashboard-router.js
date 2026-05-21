// assets/js/dashboard-router.js

(function() {
    console.log('📍 Dashboard Router started');

    var API_BASE = "/proxy.php";
    var statusEl = document.getElementById('routing-status');

    var setStatus = function(message) {
        if (!statusEl) return;
        statusEl.textContent = message;
    };

    var showError = function(message) {
        if (!statusEl) return;
        statusEl.textContent = message;
        statusEl.style.color = '#b00020';
    };

    var clearAuthStorage = function() {
        var keys = [
            'guven_token', 'guven_token_type', 'guven_user_role',
            'guven_user_id', 'guven_user', 'guven_user_name',
            'guven_company_name', 'guven_last_role_raw', 'guven_last_role_norm',
            'auth_token', 'user_email', 'user_name', 'user_uuid'
        ];
        keys.forEach(function(key) { localStorage.removeItem(key); });
    };

    var normalizeRole = function(role) {
        var normalized = String(role || '').trim().toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/-/g, '_');
        if (normalized === 'companyadmin')  return 'company_admin';
        if (normalized === 'superadmin')    return 'super_admin';
        if (normalized === 'company')       return 'company_admin';
        if (normalized === 'worker')        return 'employee';
        if (normalized === 'user')          return 'employee';
        return normalized;
    };

    var extractRole = function(userData) {
        if (!userData) return '';

        // user_service obyekti varsa
        if (userData.user_service) {
            const us = userData.user_service;
            return us.role
                || us.user_role
                || us.user_type
                || us.type
                || us.access_level
                || us.permission
                || '';
        }

        // Əsas obyekt
        return userData.role
            || userData.user_role
            || userData.user_type
            || userData.type
            || userData.access_level
            || (userData.user && (
                userData.user.role
                || userData.user.user_role
                || userData.user.user_type
            ))
            || '';
    };

    // 🔥 DÜZGÜN LOGIN YOLU
    var LOGIN_URL = '/login.html';

    var handleAuthFailure = function(reason) {
        console.warn('🔐 Auth uğursuz:', reason);
        clearAuthStorage();
        window.location.href = LOGIN_URL + '?reason=' + encodeURIComponent(reason);
    };

    var routeByRole = function(rawRole) {
        var raw = rawRole == null ? '' : String(rawRole);
        var normalized = normalizeRole(raw);

        localStorage.setItem('guven_last_role_raw', raw);
        localStorage.setItem('guven_last_role_norm', normalized);

        console.log('🎯 Role:', raw, '→', normalized);

        if (normalized === 'company_admin' || normalized === 'company') {
            window.location.href = '/owner/owp.html';
            return;
        }
        if (normalized === 'employee') {
            window.location.href = '/worker/wp.html';
            return;
        }
        if (normalized === 'super_admin' || normalized === 'admin') {
            window.location.href = '/admin.html';
            return;
        }

        console.error('❌ Naməlum rol:', raw, normalized);
        showError('Naməlum istifadəçi rolu: ' + raw);
    };

    // ============ TOKEN AL ============
    var token = localStorage.getItem('guven_token')
             || localStorage.getItem('auth_token')
             || sessionStorage.getItem('guven_token')
             || sessionStorage.getItem('auth_token');

    if (!token || token === 'null' || token === 'undefined' || token.trim() === '') {
        console.warn('❌ Token tapılmadı');
        clearAuthStorage();
        window.location.href = LOGIN_URL + '?reason=missing';
        return;
    }

    // Token type
    var tokenTypeRaw = localStorage.getItem('guven_token_type') || 'Bearer';
    var tokenType = tokenTypeRaw
        ? tokenTypeRaw.charAt(0).toUpperCase() + tokenTypeRaw.slice(1).toLowerCase()
        : 'Bearer';

    // ============ TOKEN EXPIRE YOXLAMA ============
    var isTokenExpired = function(t) {
        try {
            var parts = t.split('.');
            if (parts.length !== 3) return true;
            var payload = JSON.parse(atob(
                parts[1].replace(/-/g, '+').replace(/_/g, '/')
                    .padEnd(Math.ceil(parts[1].length / 4) * 4, '=')
            ));
            if (!payload.exp) return false;
            return payload.exp < Math.floor(Date.now() / 1000);
        } catch(e) {
            return false; // Parse olmursa expired saymırıq
        }
    };

    if (isTokenExpired(token)) {
        console.warn('⚠️ Token vaxtı bitib');
        handleAuthFailure('expired');
        return;
    }

    // ============ /auth/me SORĞUSU ============
    var fetchUserMe = function(attempt) {
        setStatus('Yönləndirilir...');

        var url = '/proxy.php/api/v1/auth/me';
        console.log('🔗 Sorğu:', url, '(cəhd:', attempt + 1, ')');

        fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': tokenType + ' ' + token,
                'Accept': 'application/json'
            },
            credentials: 'include'
        })
        .then(function(response) {
            console.log('📥 Status:', response.status);

            if (response.status === 401 || response.status === 403) {
                handleAuthFailure('auth');
                return null;
            }

            // 5xx — retry
            if (response.status >= 500 && attempt < 2) {
                console.warn('⚠️ Server xətası, yenidən cəhd...');
                setTimeout(function() { fetchUserMe(attempt + 1); }, 800);
                return null;
            }

            if (!response.ok) {
                showError('Server xətası: ' + response.status);
                return null;
            }

            return response.text().then(function(bodyText) {
                if (!bodyText || bodyText.trim() === '') {
                    showError('Boş cavab');
                    return null;
                }
                try {
                    return JSON.parse(bodyText);
                } catch(e) {
                    console.error('❌ JSON parse xətası:', bodyText.substring(0, 200));
                    showError('Cavab oxuna bilmədi');
                    return null;
                }
            });
        })
        .then(function(userData) {
            if (!userData) return;

            console.log('✅ İstifadəçi məlumatı:', userData);

            // Məlumatları saxla
            var userId   = userData.id || userData.user_id || (userData.user && userData.user.id) || '';
            var userName = userData.ceo_name || userData.name || userData.full_name
                        || (userData.user && (userData.user.name || userData.user.ceo_name)) || '';
            var compName = userData.company_name
                        || (userData.user && userData.user.company_name) || '';

            if (userId)   localStorage.setItem('guven_user_id', userId);
            if (userName) localStorage.setItem('guven_user_name', userName);
            if (compName) localStorage.setItem('guven_company_name', compName);

            var roleRaw = extractRole(userData);

            if (!roleRaw) {
                console.error('❌ Rol tapılmadı:', userData);
                showError('İstifadəçi rolu tapılmadı');
                return;
            }

            routeByRole(roleRaw);
        })
        .catch(function(err) {
            console.error('❌ Fetch xətası:', err);

            if (attempt < 2) {
                setStatus('Yenidən cəhd edilir...');
                setTimeout(function() { fetchUserMe(attempt + 1); }, 1000 * (attempt + 1));
                return;
            }

            showError('Bağlantı xətası. Yenidən cəhd edin.');
            setTimeout(function() {
                handleAuthFailure('network');
            }, 2000);
        });
    };

    fetchUserMe(0);

})();