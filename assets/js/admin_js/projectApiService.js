// ==================== PROJECTAPISERVICE ====================
// core.js-dəki makeApiRequest-dən istifadə edir

class ProjectApiService {
    constructor() {
        console.log('✅ ProjectApiService yaradıldı');

        // Token yoxla
        this.token = localStorage.getItem('guven_token') ||
                     localStorage.getItem('access_token') ||
                     localStorage.getItem('token');
        console.log('🔑 Token var:', this.token ? 'Bəli' : 'Xeyr');
    }

    // ============ MAKE REQUEST - ƏSAS METOD ============
    async makeRequest(endpoint, method = 'GET', data = null, requiresAuth = true) {
        try {
            console.log(`📡 API Request: ${method} ${endpoint}`);

            // ✅ ƏSAS DÜZƏLİŞ - URL-ə proxy əlavə et
            const baseUrl = '/proxy.php/api/v1';
            const url = `${baseUrl}${endpoint}`;

            console.log(`🌐 Tam URL: ${url}`);

            // Headers
            const headers = {
                'Accept': 'application/json'
            };

            // Token əlavə et
            const token = this.token || localStorage.getItem('guven_token') ||
                         localStorage.getItem('access_token') || localStorage.getItem('token');

            if (requiresAuth && token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            // Options
            const options = {
                method: method,
                headers: headers,
                credentials: 'include',
                mode: 'cors'
            };

            // Body əlavə et (GET deyilsə)
            if (method !== 'GET' && data) {
                if (data instanceof FormData) {
                    options.body = data;
                    // FormData üçün Content-Type-i sil
                    delete headers['Content-Type'];
                } else {
                    options.body = JSON.stringify(data);
                    headers['Content-Type'] = 'application/json';
                }
            }

            // FETCH
            const response = await fetch(url, options);

            // Cavabı oxu
            let responseData;
            const contentType = response.headers.get('content-type');

            if (contentType && contentType.includes('application/json')) {
                responseData = await response.json();
            } else {
                responseData = await response.text();
            }

            console.log(`📥 API Response [${response.status}]:`, responseData);

            // Xəta yoxla
            if (!response.ok) {
                throw {
                    message: responseData?.detail || responseData?.message || responseData || 'Xəta baş verdi',
                    status: response.status,
                    data: responseData
                };
            }

            return responseData;

        } catch (error) {
            console.error(`❌ makeRequest xətası (${endpoint}):`, error);
            throw error;
        }
    }

    // ============ LAYİHƏLƏR ============
    async loadProjects(page = 1, perPage = 50) {
        console.log('📥 API: loadProjects');

        try {
            const result = await this.makeRequest(
                `/projects/?page=${page}&per_page=${perPage}`,
                'GET',
                null,
                true
            );

            const responseData = result?.data || result;

            console.log('📦 API cavab strukturu:', {
                hasItems: !!responseData?.items,
                hasData: !!responseData?.data,
                isArray: Array.isArray(responseData),
                itemsCount: responseData?.items?.length,
                dataCount: responseData?.data?.length
            });

            // ✅ ƏN ETİBARLİ YANAŞMA
            let projects = [];

            // 1. Format: { items: [...] }
            if (responseData?.items && Array.isArray(responseData.items)) {
                projects = responseData.items;
            }
            // 2. Format: { data: [...] }
            else if (responseData?.data && Array.isArray(responseData.data)) {
                projects = responseData.data;
            }
            // 3. Format: direk array
            else if (Array.isArray(responseData)) {
                projects = responseData;
            }
            // 4. Format: { success: true, data: [...] }
            else if (responseData?.success && responseData?.data && Array.isArray(responseData.data)) {
                projects = responseData.data;
            }

            return {
                data: projects,
                total: responseData?.total || projects.length || 0,
                page: responseData?.page || page,
                per_page: responseData?.per_page || responseData?.limit || perPage,
                total_pages: responseData?.total_pages || responseData?.pages || 0
            };

        } catch (error) {
            console.error('❌ loadProjects xətası:', error);
            throw error;
        }
    }

    async createProject(data) {
        console.log('📝 API: createProject');

        const result = await this.makeRequest(
            '/projects/',
            'POST',
            data,
            true
        );

        return result?.data;
    }

    async updateProject(id, data) {
        console.log('📝 API: updateProject', id);

        const result = await this.makeRequest(
            `/projects/${id}`,
            'PUT',
            data,
            true
        );

        return result?.data;
    }

    async deleteProject(id) {
        console.log('🗑️ API: deleteProject', id);

        const result = await this.makeRequest(
            `/projects/${id}`,
            'DELETE',
            null,
            true
        );

        return true;
    }

    async toggleProjectActive(id) {
        console.log('🔄 API: toggleProjectActive', id);

        const result = await this.makeRequest(
            `/projects/${id}/toggle`,
            'PATCH',
            null,
            true
        );

        return result?.data;
    }

    async uploadProjectFile(file, category = 'project_image') {
        try {
            console.log(`📤 Fayl yüklənir: ${file.name}, kateqoriya: ${category}`);

            const formData = new FormData();
            formData.append('file', file);
            formData.append('category', category);

            // ✅ DÜZƏLİŞ - makeRequest istifadə et
            const result = await this.makeRequest(
                '/files/simple-upload',
                'POST',
                formData,
                true
            );

            console.log('✅ Upload cavabı:', result);
            return result;

        } catch (error) {
            console.error('❌ Fayl yükləmə xətası:', error);
            throw error;
        }
    }

    // ============ FAYL SİL ============
    async deleteFile(fileUuid) {
        try {
            console.log(`🗑️ Fayl silinir: ${fileUuid}`);

            const result = await this.makeRequest(
                `/files/${fileUuid}`,
                'DELETE',
                null,
                true
            );

            console.log('✅ Fayl silindi:', result);
            return result;
        } catch (error) {
            console.error('❌ Fayl silinmədi:', error);
            throw error;
        }
    }
}

// Global instance yarat
window.ProjectApiService = new ProjectApiService();
console.log('✅ ProjectApiService yükləndi');