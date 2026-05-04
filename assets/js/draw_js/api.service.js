/**
 * API Service - File upload üçün
 */

class ApiService {
    constructor() {
        this.baseUrl = "https://guvenfinans.az/proxy.php";
        this.token = this.loadToken();
    }

    loadToken() {
        console.log('🔑 Token yüklənir...');

        // Əvvəlcə localStorage-dən
        let token = localStorage.getItem('guven_token');
        if (token && token !== 'null' && token !== 'undefined') {
            console.log('✅ guven_token tapıldı');
            return token;
        }

        console.warn('⚠️ Token tapılmadı');
        return null;
    }


    // ==================== DEBUG FUNCTIONS ====================

    async debugToken() {
        console.log('🔍 Token debug başladılır...');

        const token = this.token;
        if (!token) {
            console.error('❌ Token yoxdur');
            return { error: 'No token' };
        }

        console.log('='.repeat(60));
        console.log('🔐 TOKEN DEBUG INFORMATION');
        console.log('='.repeat(60));

        console.log('🔑 Token:', token);
        console.log('📏 Token length:', token.length);
        console.log('🔠 Token first 100 chars:', token.substring(0, 100));
        console.log('🔡 Token last 100 chars:', token.substring(token.length - 100));

        // JWT parse etməyə cəhd
        try {
            const parts = token.split('.');
            console.log('🔢 JWT parts count:', parts.length);

            if (parts.length === 3) {
                // Base64 decode et (URL-safe base64)
                const base64UrlDecode = (str) => {
                    // Base64URL to Base64
                    str = str.replace(/-/g, '+').replace(/_/g, '/');

                    // Padding əlavə et
                    const pad = str.length % 4;
                    if (pad) {
                        if (pad === 1) {
                            throw new Error('Invalid base64 string');
                        }
                        str += new Array(5 - pad).join('=');
                    }

                    return atob(str);
                };

                try {
                    const header = JSON.parse(base64UrlDecode(parts[0]));
                    const payload = JSON.parse(base64UrlDecode(parts[1]));

                    console.log('📋 JWT Header:', header);
                    console.log('📄 JWT Payload:', payload);

                    if (payload.sub) {
                        console.log('👤 User ID (sub):', payload.sub);
                        console.log('👤 User ID type:', typeof payload.sub);
                    }

                    if (payload.exp) {
                        const expDate = new Date(payload.exp * 1000);
                        console.log('⏰ Expires at:', expDate.toISOString());
                        console.log('⏰ Expires in:', Math.round((payload.exp * 1000 - Date.now()) / 1000), 'seconds');
                    }

                    if (payload.iat) {
                        const iatDate = new Date(payload.iat * 1000);
                        console.log('🕐 Issued at:', iatDate.toISOString());
                    }

                    console.log('📧 Email in payload:', payload.email);
                    console.log('👥 User type:', payload.user_type);

                    return {
                        isJWT: true,
                        header,
                        payload,
                        user_id: payload.sub,
                        expires_at: payload.exp,
                        issued_at: payload.iat
                    };
                } catch (parseError) {
                    console.error('❌ JWT parse error:', parseError);
                    return { isJWT: false, parseError: parseError.message };
                }
            } else {
                console.warn('⚠️ Token JWT formatında deyil (3 hissəli deyil)');
                return { isJWT: false };
            }
        } catch (error) {
            console.error('❌ JWT analysis error:', error);
            return { isJWT: false, error: error.message };
        }
    }



    // ==================== TEST FUNCTIONS ====================

    async testToken() {
        console.log('🔍 Token test edilir...');

        if (!this.token) {
            console.warn('⚠️ Test üçün token yoxdur');
            return { valid: false, message: 'No token available' };
        }

        // Əvvəlcə token debug
        const debugInfo = await this.debugToken();
        console.log('🔍 Token debug info:', debugInfo);

        try {
            // 1. Əvvəlcə header auth ilə test et
            console.log('1. 📋 Testing with header auth...');
            const headerResponse = await fetch(`${this.baseUrl}/api/v1/files/test-header-auth-only`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            console.log(`📥 Header auth response: ${headerResponse.status} ${headerResponse.statusText}`);

            if (headerResponse.ok) {
                const result = await headerResponse.json();
                console.log('✅ Header auth successful:', result);
                return {
                    valid: true,
                    auth_type: 'header',
                    ...result
                };
            } else {
                const errorText = await headerResponse.text();
                console.error('❌ Header auth failed:', errorText);

                // 2. Əgər header auth uğursuz olarsa, cookie auth ilə cəhd et
                console.log('2. 🍪 Trying cookie auth...');
                const cookieResponse = await fetch(`${this.baseUrl}/api/v1/files/test-cookie-auth-only`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                console.log(`📥 Cookie auth response: ${cookieResponse.status}`);

                if (cookieResponse.ok) {
                    const cookieResult = await cookieResponse.json();
                    console.log('✅ Cookie auth successful:', cookieResult);
                    return {
                        valid: true,
                        auth_type: 'cookie',
                        ...cookieResult
                    };
                }

                // 3. Əgər hər ikisi uğursuz olarsa, direct validation test et
                console.log('3. 🎯 Trying direct validation...');
                if (debugInfo.isJWT && debugInfo.user_id) {
                    return {
                        valid: true,
                        auth_type: 'jwt_parsed',
                        user_id: debugInfo.user_id,
                        message: 'Token is valid JWT but auth endpoints failing'
                    };
                }

                return {
                    valid: false,
                    message: `Header: HTTP ${headerResponse.status}, Cookie: HTTP ${cookieResponse.status}`
                };
            }

        } catch (error) {
            console.error('❌ Token test error:', error);
            return { valid: false, message: error.message };
        }
    }

    // ==================== FILE UPLOAD ====================

    async simpleUpload(file, category = 'USER_PROFILE') {
        console.log('📤 Simple file upload başladılır...');

        if (!this.token) {
            console.error('❌ Upload üçün token yoxdur');
            throw new Error('Authentication required for file upload');
        }

        // Token debug
        const debugInfo = await this.debugToken();
        console.log('🔍 Upload token debug:', debugInfo);

        // 1. ƏVVƏLCƏ FORMDATA DEBUG
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', category);

        console.log('📋 FormData creation debug:');
        console.log('  File object:', file);
        console.log('  File name:', file.name);
        console.log('  File size:', file.size);
        console.log('  File type:', file.type);

        // FormData entries check
        console.log('  FormData entries check:');
        for (let [key, value] of formData.entries()) {
            console.log(`    ${key}:`, value);
            if (value instanceof File) {
                console.log(`      ✅ Is File: YES, ${value.name}`);
            }
        }

        const url = `${this.baseUrl}/api/v1/files/simple-upload`;

        console.log(`🌐 Upload URL: ${url}`);
        console.log(`📁 File: ${file.name} (${file.size} bytes)`);
        console.log(`📦 Category: ${category}`);

        // 2. DÜZGÜN HEADERS
        const headers = {
            'Authorization': `Bearer ${this.token}`,
            'Accept': 'application/json'
            // ⚠️ 'Content-Type' BUYURMADAN - FormData avtomatik 'multipart/form-data' set edir
        };

        console.log('📤 Request headers:', headers);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: formData
            });

            console.log(`📥 Upload response: ${response.status} ${response.statusText}`);

            // Response headers
            console.log('📋 Response headers:');
            response.headers.forEach((value, key) => {
                console.log(`  ${key}: ${value}`);
            });

            const responseText = await response.text();
            console.log('📄 Response text:', responseText);

            if (response.status === 401) {
                console.error('❌ 401 Unauthorized');
                this.clearToken();
                throw new Error('Session expired. Please login again.');
            }

            if (response.status === 422) {
                console.error('❌ 422 Validation error');
                try {
                    const errorJson = JSON.parse(responseText);
                    console.error('🔍 Validation error details:', errorJson);

                    // Əlavə info
                    console.error('⚠️ Possible causes:');
                    console.error('  1. File field not in FormData');
                    console.error('  2. Wrong field name (should be "file")');
                    console.error('  3. Backend expecting different parameter names');
                    console.error('  4. File size too large');
                    console.error('  5. File type not allowed');

                    throw new Error(`Validation error: ${JSON.stringify(errorJson.detail)}`);
                } catch {
                    throw new Error(`Validation error: ${responseText.substring(0, 200)}`);
                }
            }

            if (!response.ok) {
                throw new Error(`Upload failed: HTTP ${response.status} - ${responseText.substring(0, 200)}`);
            }

            // Parse JSON
            try {
                const result = JSON.parse(responseText);
                console.log('✅ Upload successful:', result);
                return result;
            } catch (jsonError) {
                console.error('❌ JSON parse error:', jsonError);
                throw new Error('Server returned invalid JSON');
            }

        } catch (error) {
            console.error('❌ Upload error:', error);

            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                throw new Error('Network error: Cannot connect to server');
            }

            if (error.name === 'AbortError') {
                throw new Error('Request timeout');
            }

            throw error;
        }
    }

    async alternativeUpload() {
        const api = new ApiService();

        // Test faylı
        const testFile = new File(['Alternative upload test'], 'alt-test.txt', {
            type: 'text/plain'
        });

        // YENİ YANAŞMA: Blob kimi göndər
        console.log('🔄 Alternative upload method');

        // 1. Base64-ə çevir
        const reader = new FileReader();

        return new Promise((resolve, reject) => {
            reader.onload = async function(e) {
                try {
                    const base64Data = e.target.result.split(',')[1];

                    // JSON olaraq göndər
                    const payload = {
                        filename: testFile.name,
                        content: base64Data,
                        category: 'USER_PROFILE',
                        content_type: testFile.type
                    };

                    console.log('📦 JSON payload size:', JSON.stringify(payload).length);

                    const response = await fetch(
                        `${api.baseUrl}/api/v1/files/base64-upload`,
                        {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${api.token}`,
                                'Content-Type': 'application/json',
                                'Accept': 'application/json'
                            },
                            body: JSON.stringify(payload)
                        }
                    );

                    console.log(`📥 Response: ${response.status}`);
                    const result = await response.json();
                    console.log('📦 Result:', result);

                    resolve(result);
                } catch (error) {
                    console.error('❌ Alternative upload error:', error);
                    reject(error);
                }
            };

            reader.readAsDataURL(testFile);
        });
    }

    // ==================== BASIC API METHODS ====================

    async request(endpoint, method = 'GET', data = null, isFormData = false) {
        const cleanEndpoint = endpoint.startsWith('/api/v1') ? endpoint : `/api/v1${endpoint}`;
        const url = `${this.baseUrl}${cleanEndpoint}`;

        console.log(`🌐 API: ${method} ${cleanEndpoint}`);

        const options = {
            method: method,
            headers: {
                'Accept': 'application/json'
            },
            credentials: 'include'
        };

        if (this.token && !isFormData) {
            options.headers['Authorization'] = `Bearer ${this.token}`;
        }

        if (!isFormData && data) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(data);
        } else if (data) {
            options.body = data;
        }

        try {
            const response = await fetch(url, options);

            // ✅ TOKEN EXPIRED YOXLAMASI
            if (response.status === 401) {
                console.log('🔴 Token vaxtı qurtardı, login səhifəsinə yönləndirilir...');
                this.redirectToLogin();
                return null; // Request-i dayandır
            }

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ HTTP ${response.status}:`, errorText);
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();
            console.log(`✅ Response uğurlu`);
            return result;

        } catch (error) {
            console.error(`❌ API xətası (${cleanEndpoint}):`, error.message);
            throw error;
        }
    }

    async get(endpoint) {
        return this.request(endpoint, 'GET');
    }

    async post(endpoint, data) {
        return this.request(endpoint, 'POST', data);
    }

    async put(endpoint, data) {
        return this.request(endpoint, 'PUT', data);
    }

    async patch(endpoint, data) {
        return this.request(endpoint, 'PATCH', data);
    }

    async delete(endpoint) {
        return this.request(endpoint, 'DELETE');
    }

    // ==================== AUTH API ====================

    async getCurrentUser() {
        try {
            return await this.get('/auth/me');
        } catch (error) {
            // Əgər error 401-dirsə, login səhifəsinə göndər
            if (error.message.includes('401')) {
                console.log('🔴 getCurrentUser: Token expired, redirecting to login...');
                this.redirectToLogin();
            }
            throw error;
        }
    }


    async logout() {
        return this.post('/auth/logout');
    }

    // ==================== LOGIN REDIRECT ====================

    redirectToLogin() {
        // Bütün token və user məlumatlarını sil
        this.clearToken();
        localStorage.clear();
        sessionStorage.clear();

        // Həmən login səhifəsinə yönləndir
        window.location.href = 'login.html';
    }


    // ==================== USERS API ====================


    async updateUser(id, data) {
        return this.patch(`/users/${id}`, data);
    }


    // ==================== UTILITIES ====================

    setToken(token) {
        this.token = token;
        localStorage.setItem('guven_token', token);
    }

    clearToken() {
        this.token = null;
        localStorage.removeItem('guven_token');
        localStorage.removeItem('user');
    }



    hasToken() {
        return !!this.token;
    }
}

window.ApiService = ApiService;