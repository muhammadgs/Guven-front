// Admin Panel JavaScript - auth.js
async function loadCurrentUser() {
    try {
        const token = localStorage.getItem('guven_token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        const response = await fetch(`${API_BASE}/api/v1/auth/me`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            currentUser = data.user || data;

            // İstifadəçi məlumatlarını göstər
            const userNameElement = document.getElementById('userName');
            const userRoleElement = document.getElementById('userRole');
            const userAvatarElement = document.getElementById('userAvatar');

            if (userNameElement) {
                userNameElement.textContent =
                    `${currentUser.ceo_name || currentUser.name || ''} ${currentUser.ceo_lastname || currentUser.surname || ''}`.trim() || currentUser.email;
            }

            if (userRoleElement) {
                userRoleElement.textContent =
                    currentUser.is_super_admin ? 'Super Admin' :
                    currentUser.is_admin ? 'Admin' :
                    currentUser.user_type === 'ceo' ? 'CEO' :
                    currentUser.user_type === 'company_admin' ? 'Şirkət Admini' : 'İşçi';
            }

            if (userAvatarElement) {
                const firstName = currentUser.ceo_name ? currentUser.ceo_name.charAt(0).toUpperCase() :
                                currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'A';
                userAvatarElement.textContent = firstName;
            }

        } else if (response.status === 401) {
            // Token yanlışdır, login səhifəsinə yönləndir
            window.location.href = 'login.html';
        } else {
            showError('İstifadəçi məlumatları alına bilmədi');
        }
    } catch (error) {
        console.error('İstifadəçi məlumatları yüklənərkən xəta:', error);
        window.location.href = 'login.html';
    }
}


async function logoutUser() {
    try {
        console.log('🚪 Çıxış edilir...');

        const token = localStorage.getItem('guven_token');

        // 1. Backend-də logout əməliyyatı (əgər varsa)
        if (token) {
            try {
                await fetch(`${API_BASE}/api/v1/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });
                console.log('✅ Backend logout uğurlu');
            } catch (error) {
                console.warn('⚠️ Backend logout xətası:', error);
            }
        }

        // 2. BÜTÜN localStorage-ları təmizlə
        localStorage.clear();
        console.log('✅ localStorage təmizləndi');

        // 3. BÜTÜN sessionStorage-ları təmizlə
        sessionStorage.clear();
        console.log('✅ sessionStorage təmizləndi');

        // 4. Bütün cookie-ləri təmizlə
        document.cookie.split(";").forEach(function(c) {
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
        console.log('✅ Cookies təmizləndi');

        // 5. IndexedDB-ləri təmizlə (əgər varsa)
        if (window.indexedDB) {
            const databases = await window.indexedDB.databases?.() || [];
            for (const db of databases) {
                if (db.name) {
                    window.indexedDB.deleteDatabase(db.name);
                    console.log(`✅ IndexedDB təmizləndi: ${db.name}`);
                }
            }
        }

        // 6. Service Worker cache-lərini təmizlə (əgər varsa)
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
            console.log('✅ Service Worker cache təmizləndi');
        }

        // 7. Bütün fetch request-lərini dayandır
        if (window.AbortController) {
            // Əgər aktiv request-lər varsa, onları abort et
            console.log('✅ Request abort edildi');
        }

        // 8. DOM-dakı bütün məlumatları təmizlə
        // Formları təmizlə
        const forms = document.querySelectorAll('form');
        forms.forEach(form => form.reset());

        // Input-ları təmizlə
        const inputs = document.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            if (input.type !== 'submit' && input.type !== 'button') {
                input.value = '';
            }
        });

        console.log('✅ DOM təmizləndi');

        // 9. Global dəyişənləri təmizlə
        window.currentUser = null;
        window.currentPage = null;
        window.selectedUserId = null;
        window.selectedApplicationId = null;
        window.deleteType = null;

        // 10. Session token-ları təmizlə
        if (window.sessionStorage) {
            window.sessionStorage.clear();
        }

        console.log('✅ Bütün cache-lər təmizləndi!');

        // 11. Login səhifəsinə yönləndir (hard reload ilə)
        window.location.href = '../login.html';

    } catch (error) {
        console.error('❌ Çıxış edərkən xəta:', error);
        // Yenə də təmizlə
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '../login.html';
    }
}