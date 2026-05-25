// assets/js/dashboard-router.js - DÜZƏLDİLMİŞ VERSİYA

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
            'auth_token', 'user_email', 'user_name', 'user_uuid',
            'access_token', 'refresh_token'  // 🔥 ƏLAVƏ EDİLDİ
        ];
        keys.forEach(function(key) {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });
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

    var LOGIN_URL = (window.GF_CONFIG && window.GF_CONFIG.getLoginUrl()) || '/login.html';

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

    // ============ TOKEN AL - HƏR DƏFƏ YENİDƏN OXU ============
    var getCurrentToken = function() {
        return localStorage.getItem('guven_token')
             || localStorage.getItem('access_token')
             || localStorage.getItem('auth_token')
             || sessionStorage.getItem('guven_token')
             || sessionStorage.getItem('auth_token');
    };

    var getTokenType = function() {
        var tokenTypeRaw = localStorage.getItem('guven_token_type') || 'Bearer';
        return tokenTypeRaw
            ? tokenTypeRaw.charAt(0).toUpperCase() + tokenTypeRaw.slice(1).toLowerCase()
            : 'Bearer';
    };

    // ============ TOKEN EXPIRE YOXLAMA ============
    var isTokenExpired = function(t) {
        if (!t) return true;
        try {
            var parts = t.split('.');
            if (parts.length !== 3) return true;
            var payload = JSON.parse(atob(
                parts[1].replace(/-/g, '+').replace(/_/g, '/')
                    .padEnd(Math.ceil(parts[1].length / 4) * 4, '=')
            ));
            if (!payload.exp) return false;
            var timeLeft = payload.exp - Math.floor(Date.now() / 1000);
            console.log('⏰ Token expires in:', Math.floor(timeLeft / 60), 'minutes');
            return timeLeft < 0;
        } catch(e) {
            console.warn('Token parse error:', e);
            return false;
        }
    };

    // ============ REFRESH TOKEN FUNKSİYASI ============
    var refreshAccessToken = function() {
        console.log('🔄 Refreshing token...');

        return fetch('/proxy.php/api/v1/auth/refresh', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(function(response) {
            if (response.ok) {
                return response.json();
            }
            throw new Error('Refresh failed: ' + response.status);
        })
        .then(function(data) {
            if (data.access_token) {
                localStorage.setItem('guven_token', data.access_token);
                localStorage.setItem('access_token', data.access_token);
                console.log('✅ Token refreshed successfully');
                return data.access_token;
            }
            throw new Error('No access_token in refresh response');
        })
        .catch(function(err) {
            console.error('❌ Refresh error:', err);
            return null;
        });
    };

    // ============ FETCH USER ME (DÜZƏLDİLMİŞ) ============
    var fetchUserMe = function(attempt, retryToken) {
        setStatus('Yönləndirilir...');

        // 🔥 HƏR DƏFƏ TƏZƏ TOKEN AL
        var currentToken = retryToken || getCurrentToken();

        if (!currentToken || currentToken === 'null' || currentToken === 'undefined') {
            console.warn('❌ Token tapılmadı');
            handleAuthFailure('missing');
            return;
        }

        // Token bitibsə, refresh et
        if (isTokenExpired(currentToken)) {
            console.warn('⚠️ Token expired, refreshing...');
            refreshAccessToken().then(function(newToken) {
                if (newToken) {
                    fetchUserMe(0, newToken);
                } else {
                    handleAuthFailure('expired');
                }
            });
            return;
        }

        var tokenType = getTokenType();
        var url = '/proxy.php/api/v1/auth/me';
        console.log('🔗 Sorğu:', url, '(cəhd:', attempt + 1, ')');
        console.log('🔑 Token:', currentToken.substring(0, 50) + '...');

        fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': tokenType + ' ' + currentToken,
                'Accept': 'application/json'
            },
            credentials: 'include'
        })
        .then(function(response) {
            console.log('📥 Status:', response.status);

            // 401 -> token refresh et
            if (response.status === 401 || response.status === 403) {
                console.warn('🔑 401 received, trying refresh...');
                return refreshAccessToken().then(function(newToken) {
                    if (newToken) {
                        return fetchUserMe(attempt + 1, newToken);
                    }
                    handleAuthFailure('auth');
                    return null;
                });
            }

            // 5xx -> retry
            if (response.status >= 500 && attempt < 2) {
                console.warn('⚠️ Server xətası, yenidən cəhd...');
                setTimeout(function() { fetchUserMe(attempt + 1, currentToken); }, 800);
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
            var user_obj = userData.user_service || userData.user || userData;

            var userId   = user_obj.id || userData.id || userData.user_id || '';
            var userName = user_obj.ceo_name || user_obj.name || userData.ceo_name || userData.name || '';
            var compName = user_obj.company_name || userData.company_name || '';

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
                setTimeout(function() { fetchUserMe(attempt + 1, currentToken); }, 1000 * (attempt + 1));
                return;
            }

            showError('Bağlantı xətası. Yenidən cəhd edin.');
            setTimeout(function() {
                handleAuthFailure('network');
            }, 2000);
        });
    };

    // ============ BAŞLAT ============
    var initialToken = getCurrentToken();

    if (!initialToken || initialToken === 'null' || initialToken === 'undefined' || initialToken.trim() === '') {
        console.warn('❌ Token tapılmadı');
        clearAuthStorage();
        window.location.href = LOGIN_URL + '?reason=missing';
        return;
    }

    // Token bitibsə, əvvəlcə refresh et
    if (isTokenExpired(initialToken)) {
        console.warn('⚠️ Initial token expired, refreshing...');
        refreshAccessToken().then(function(newToken) {
            if (newToken) {
                fetchUserMe(0, newToken);
            } else {
                handleAuthFailure('expired');
            }
        });
    } else {
        fetchUserMe(0, initialToken);
    }

})();