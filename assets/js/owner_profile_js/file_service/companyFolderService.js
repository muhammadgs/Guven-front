/**
 * CompanyFolderService - Şirkət qovluqları üçün tam funksional xidmət
 * Öz şirkətinin işçilərinə başqa şirkətin qovluqlarına icazə vermə
 */
class CompanyFolderService {
    constructor() {
        this.baseUrl = 'https://guvenfinans.az/proxy.php';
        console.log('🔥🔥🔥 CompanyFolderService YÜKLƏNDİ! 🔥🔥🔥');

        // Cache
        this._cache = {
            folders: {},
            files: {},
            lastRefresh: {}
        };

        // Cari şirkət (baxılan şirkət)
        this.currentCompany = null;
        this.currentFolder = null;

        // API Service reference
        this.api = window.apiService || null;
    }

    /**
     * ============ 1. İSTİFADƏÇİ MƏLUMATLARI ============
     */

    /**
     * Cari istifadəçinin ÖZ şirkət kodunu tap
     */
    getUserCompanyCode() {
        try {
            // 1. localStorage-dan userData
            const userData = localStorage.getItem('userData');
            if (userData) {
                const parsed = JSON.parse(userData);
                const code = parsed.user?.company_code || parsed.company_code;
                if (code) {
                    console.log('🏢 Öz şirkət kodu (userData):', code);
                    return code;
                }
            }

            // 2. Token-dan
            const token = localStorage.getItem('guven_token');
            if (token) {
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    const code = payload.company_code;
                    if (code) {
                        console.log('🏢 Öz şirkət kodu (token):', code);
                        return code;
                    }
                } catch (e) {
                    console.warn('Token parse xətası:', e);
                }
            }

            // 3. Default
            console.log('🏢 Default şirkət kodu istifadə olunur: AZE26003');
            return 'AZE26003';

        } catch (e) {
            console.error('❌ Company code alma xətası:', e);
            return 'AZE26003';
        }
    }


    async loadCompanyFolders(companyCode, parentId = null) {
        console.log(`📂 loadCompanyFolders çağırıldı: ${companyCode}, parentId: ${parentId}`);

        try {
            if (!companyCode) {
                console.error('❌ companyCode yoxdur');
                return [];
            }

            const token = localStorage.getItem('guven_token');
            if (!token) {
                console.warn('⚠️ Token tapılmadı');
                return [];
            }

            // URL qur - parentId parametri əlavə edin
            let url = `${this.baseUrl}/api/v1/company-folders?company_code=${companyCode}`;

            if (parentId && parentId !== 'null' && parentId !== 'undefined' && parentId !== '') {
                url += `&parent_id=${parentId}`;
            }

            console.log('📡 URL:', url);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                console.warn(`⚠️ HTTP xətası: ${response.status}`);
                return [];
            }

            const data = await response.json();
            console.log('📦 API cavabı:', data);

            let folders = [];
            if (data.data && Array.isArray(data.data)) {
                folders = data.data;
            } else if (Array.isArray(data)) {
                folders = data;
            } else if (data.folders && Array.isArray(data.folders)) {
                folders = data.folders;
            }

            console.log(`✅ ${folders.length} qovluq tapıldı (parentId: ${parentId || 'root'})`);
            return folders;

        } catch (error) {
            console.error('❌ loadCompanyFolders xətası:', error);
            return [];
        }
    }


    /**
     * Cari istifadəçi ID-sini tap
     */
    getCurrentUserId() {
        try {
            // 1. localStorage-dan userData
            const userData = localStorage.getItem('userData');
            if (userData) {
                const parsed = JSON.parse(userData);
                // userData-da həm 'user' obyekti, həm də birbaşa ID ola bilər
                const id = parsed.user?.id || parsed.id;
                if (id) {
                    console.log('👤 Cari user ID (userData):', id);
                    return id;
                }
            }

            // 2. Token-dan
            const token = localStorage.getItem('guven_token');
            if (token) {
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    const id = payload.user_id || payload.sub;
                    if (id) {
                        console.log('👤 Cari user ID (token):', id);
                        return id;
                    }
                } catch (e) {
                    console.warn('Token parse xətası:', e);
                }
            }

            console.warn('⚠️ User ID tapılmadı');
            return null;

        } catch (e) {
            console.error('❌ User ID alma xətası:', e);
            return null;
        }
    }

    /**
     * ============ 2. ÖZ ŞİRKƏTİNİN İŞÇİLƏRİNİ GƏTİR ============
     * @param {string} targetCompanyCode - Baxılan şirkət kodu (istifadə edilmir, ancaq parametr qalır)
     */
    async getCompanyEmployees(targetCompanyCode) {
        // ÖZ şirkətinin kodunu tap
        const ownCompanyCode = this.getUserCompanyCode();

        console.log('👥 Öz şirkətinin işçiləri gətirilir:', {
            targetCompany: targetCompanyCode,  // Baxılan şirkət (SOC26001)
            ownCompany: ownCompanyCode         // Öz şirkəti (AZE26003)
        });

        try {
            const token = localStorage.getItem('guven_token');

            if (!token) {
                console.warn('⚠️ Token tapılmadı');
                return {
                    success: false,
                    data: this._getFallbackEmployees(ownCompanyCode),
                    error: 'Token tapılmadı'
                };
            }

            // ========== ÖZ ŞİRKƏTİNİN İŞÇİLƏRİ ÜÇÜN ENDPOINT ==========
            // Bu endpoint işləyir: /api/v1/users/company/AZE26003
            const url = `${this.baseUrl}/api/v1/users/company/${ownCompanyCode}`;
            console.log('📡 URL (GET employees from own company):', url);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            // 405 xətası üçün alternativ endpoint-lər
            if (response.status === 405) {
                console.warn('⚠️ 405 xətası, alternativ endpoint-lər sınaqdan keçirilir...');

                // Alternativ 1: /api/users?company_code=AZE26003
                const altUrl1 = `${this.baseUrl}/api/users?company_code=${ownCompanyCode}`;
                const altResponse1 = await fetch(altUrl1, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (altResponse1.ok) {
                    const data = await altResponse1.json();
                    console.log('✅ Alternativ 1 işlədi');
                    return this._normalizeEmployees(data, ownCompanyCode);
                }

                // Alternativ 2: /api/employees?company_code=AZE26003
                const altUrl2 = `${this.baseUrl}/api/employees?company_code=${ownCompanyCode}`;
                const altResponse2 = await fetch(altUrl2, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (altResponse2.ok) {
                    const data = await altResponse2.json();
                    console.log('✅ Alternativ 2 işlədi');
                    return this._normalizeEmployees(data, ownCompanyCode);
                }
            }

            if (!response.ok) {
                console.warn(`⚠️ HTTP xətası: ${response.status}`);
                return {
                    success: false,
                    data: this._getFallbackEmployees(ownCompanyCode),
                    error: `HTTP ${response.status}`
                };
            }

            const data = await response.json();
            console.log('📦 API cavabı:', data);

            return this._normalizeEmployees(data, ownCompanyCode);

        } catch (error) {
            console.error('❌ getCompanyEmployees xətası:', error);

            // Xəta olarsa, fallback data qaytar
            console.warn('⚠️ Fallback data istifadə olunur');
            return {
                success: true,
                data: this._getFallbackEmployees(ownCompanyCode),
                mock: true
            };
        }
    }

    /**
     * API cavabını normalize et
     */
    _normalizeEmployees(data, companyCode) {
        let employees = [];

        // Müxtəlif API cavab strukturlarını tanı
        if (data.data && Array.isArray(data.data)) {
            employees = data.data;
        } else if (Array.isArray(data)) {
            employees = data;
        } else if (data.users && Array.isArray(data.users)) {
            employees = data.users;
        } else if (data.employees && Array.isArray(data.employees)) {
            employees = data.employees;
        } else if (data.items && Array.isArray(data.items)) {
            employees = data.items;
        }

        // Hər işçini normalize et
        employees = employees.map(emp => ({
            id: emp.id || emp.user_id,
            user_id: emp.id || emp.user_id,
            ceo_name: emp.ceo_name || emp.name || emp.full_name || 'Adsız',
            ceo_email: emp.ceo_email || emp.email || '',
            ceo_phone: emp.ceo_phone || emp.phone || '',
            is_admin: emp.is_admin || false,
            is_super_admin: emp.is_super_admin || false,
            user_type: emp.user_type || 'employee',
            company_code: companyCode,  // ÖZ şirkət kodu
            is_active: emp.is_active !== false,
            position: emp.position || emp.department || 'İşçi',
            // Default icazələr
            can_view: false,
            can_upload: false,
            can_create_folder: false,
            can_delete: false
        }));

        console.log(`✅ ${employees.length} işçi normalize edildi (şirkət: ${companyCode})`);
        return { success: true, data: employees };
    }

    /**
     * Fallback işçi data (API işləmədikdə)
     */
    _getFallbackEmployees(companyCode) {
        console.log('📋 Fallback işçi data yaradılır...');

        // Real işçilər - ÖZ şirkətində olanlar
        const currentUserId = this.getCurrentUserId();

        return [
            {
                id: 1,
                user_id: 1,
                ceo_name: 'Nigar Zərbəliyeva',
                ceo_email: 'zarbaliyevanigar17@gmail.com',
                is_admin: true,
                position: 'Admin',
                company_code: companyCode,
                can_view: true,
                can_upload: true,
                can_create_folder: true,
                can_delete: true
            },
            {
                id: 71,
                user_id: 71,
                ceo_name: 'Rəhbər İstifadəçi',
                ceo_email: 'rehber@example.com',
                is_admin: true,
                position: 'Şirkət Rəhbəri',
                company_code: companyCode,
                can_view: true,
                can_upload: true,
                can_create_folder: true,
                can_delete: true
            },
            {
                id: 73,
                user_id: 73,
                ceo_name: 'serxan',
                ceo_email: 'serxan@gmail.com',
                is_admin: false,
                position: 'İşçi',
                company_code: companyCode,
                can_view: false,
                can_upload: false,
                can_create_folder: false,
                can_delete: false
            },
            {
                id: currentUserId || 131,
                user_id: currentUserId || 131,
                ceo_name: 'Siz',
                ceo_email: 'siz@example.com',
                is_admin: true,
                position: 'İstifadəçi',
                company_code: companyCode,
                can_view: true,
                can_upload: true,
                can_create_folder: true,
                can_delete: true
            }
        ];
    }

    /**
     * ============ QOVLUQ İCAZƏLƏRİNİ TƏYİN ET (DÜZƏLDİLMİŞ) ============
     */
    async setFolderPermissions(folderId, targetCompanyCode, permissions) {
        console.log('🔐 İcazələr təyin edilir:', {
            folderId,
            targetCompany: targetCompanyCode,
            permissionsCount: permissions.length
        });

        try {
            const token = localStorage.getItem('guven_token');

            if (!token) {
                return { success: false, error: 'Token tapılmadı' };
            }

            // Hər bir icazə üçün AYRI-AYRI POST göndər (folder_id ilə)
            const results = [];

            for (const perm of permissions) {
                const params = new URLSearchParams({
                    user_id: perm.user_id,
                    company_code: targetCompanyCode,
                    folder_id: folderId,  // MÜTLƏQ ƏLAVƏ ET!
                    can_view: perm.can_view,
                    can_upload: perm.can_upload,
                    can_create_folder: perm.can_create_folder,
                    can_delete: perm.can_delete
                });

                const url = `${this.baseUrl}/api/v1/company-folder-permissions?${params.toString()}`;
                console.log(`📡 POST URL (user ${perm.user_id}):`, url);

                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    }
                });

                if (response.ok) {
                    results.push({ user_id: perm.user_id, success: true });
                    console.log(`✅ User ${perm.user_id} icazə təyin edildi`);
                } else {
                    const errorText = await response.text();
                    console.warn(`⚠️ User ${perm.user_id} xətası:`, errorText);
                    results.push({ user_id: perm.user_id, success: false, error: errorText });
                }
            }

            const successCount = results.filter(r => r.success).length;
            console.log(`✅ ${successCount}/${permissions.length} icazə təyin edildi`);

            // Uğurlu bildiriş
            if (window.filesUI?.showNotification) {
                if (successCount > 0) {
                    window.filesUI.showNotification(`${successCount} işçiyə icazə verildi`, 'success');
                } else {
                    window.filesUI.showNotification('Heç bir icazə təyin edilə bilmədi', 'warning');
                }
            }

            return {
                success: successCount > 0,
                data: results,
                message: `${successCount} işçiyə icazə verildi`
            };

        } catch (error) {
            console.error('❌ setFolderPermissions xətası:', error);

            if (window.filesUI?.showNotification) {
                window.filesUI.showNotification('İcazə təyin edilə bilmədi: ' + error.message, 'error');
            }

            return { success: false, error: error.message };
        }
    }

    /**
     * ============ QOVLUQ İCAZƏLƏRİNİ GƏTİR (DÜZƏLDİLMİŞ) ============
     */
    async getFolderPermissions(folderId) {
        console.log('📋 Qovluq icazələri gətirilir:', folderId);

        try {
            const token = localStorage.getItem('guven_token');

            // 1. folder_id ilə yüklə
            const url = `${this.baseUrl}/api/v1/company-folder-permissions?folder_id=${folderId}`;
            console.log('📡 GET URL:', url);

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                console.warn(`⚠️ GET xətası: ${response.status}`);
                return { success: true, data: [] };
            }

            const data = await response.json();

            let permissions = [];
            if (data.data && Array.isArray(data.data)) {
                permissions = data.data;
            } else if (Array.isArray(data)) {
                permissions = data;
            }

            console.log(`📊 folder_id=${folderId} üçün ${permissions.length} icazə tapıldı`);

            // Hər bir icazəni logla
            permissions.forEach(p => {
                console.log(`  👤 User ${p.user_id}: view=${p.can_view}, upload=${p.can_upload}, create=${p.can_create_folder}, delete=${p.can_delete}`);
            });

            return { success: true, data: permissions };

        } catch (error) {
            console.error('❌ getFolderPermissions xətası:', error);
            return { success: false, error: error.message, data: [] };
        }
    }

    async getFolders(companyCode, parentId = null, search = null) {
        console.log('📋 getFolders çağırıldı:', { companyCode, parentId, search });

        try {
            const token = localStorage.getItem('guven_token');
            if (!token) {
                console.warn('⚠️ Token tapılmadı');
                return { success: false, data: [] };
            }

            // URL qur
            let url = `${this.baseUrl}/api/v1/company-folders?company_code=${companyCode}`;

            if (parentId !== null && parentId !== undefined && parentId !== 'null' && parentId !== '') {
                url += `&parent_id=${parentId}`;
            }

            if (search) {
                url += `&search=${encodeURIComponent(search)}`;
            }

            console.log('📡 URL:', url);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                console.warn(`HTTP xətası: ${response.status}`);
                return { success: false, data: [] };
            }

            const data = await response.json();

            let folders = [];
            if (data.data && Array.isArray(data.data)) {
                folders = data.data;
            } else if (Array.isArray(data)) {
                folders = data;
            } else if (data.folders && Array.isArray(data.folders)) {
                folders = data.folders;
            }

            folders = folders.map(f => ({
                ...f,
                uuid: f.uuid || f.id,
                id: f.id || f.uuid,
                canEdit: true,
                canDelete: f.created_by === this.getCurrentUserId(),
                item_count: f.item_count || 0,
                created_by_name: f.created_by_name || 'Naməlum',
                created_at: f.created_at || new Date().toISOString()
            }));

            console.log(`📁 ${folders.length} qovluq tapıldı (parentId: ${parentId || 'root'})`);

            // Cache-ə sal
            const cacheKey = `${companyCode}_${parentId || 'root'}`;
            this._cache.folders[cacheKey] = folders;
            this._cache.lastRefresh[cacheKey] = Date.now();

            return { success: true, data: folders };

        } catch (error) {
            console.error('❌ getFolders xətası:', error);
            return { success: false, data: [] };
        }
    }

    /**
     * ============ 6. FAYLLARI GƏTİR ============
     * @param {string} companyCode - Şirkət kodu
     * @param {number} folderId - Qovluq ID-si
     * @param {string} filter - Filtr tipi
     */
    async getFiles(companyCode, folderId = null, filter = 'all') {
        console.log('📄 getFiles çağırıldı:', { companyCode, folderId, filter });

        try {
            const token = localStorage.getItem('guven_token');

            // URL qur
            let url = `${this.baseUrl}/api/v1/company-files/${companyCode}`;

            // Əgər folder ID varsa əlavə et
            if (folderId && folderId !== 'null' && folderId !== 'undefined' && folderId !== '') {
                url += `?folder_id=${folderId}`;
                console.log('📡 URL (folder_id ilə):', url);
            } else {
                console.log('📡 URL (root):', url);
            }

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                console.warn(`HTTP xətası: ${response.status}`);
                return { success: false, data: [] };
            }

            const data = await response.json();
            console.log('📦 API cavabı:', data);

            let files = [];

            // Cavab strukturunu normalize et
            if (data.data?.files) {
                files = data.data.files;
                console.log('📦 data.data.files:', files.length);
            } else if (data.files) {
                files = data.files;
                console.log('📦 data.files:', files.length);
            } else if (Array.isArray(data)) {
                files = data;
                console.log('📦 Array:', files.length);
            } else if (data.data && Array.isArray(data.data)) {
                files = data.data;
                console.log('📦 data.data:', files.length);
            }

            // Filtr tətbiq et
            if (filter !== 'all') {
                files = files.filter(f => {
                    if (filter === 'images') return f.mime_type?.startsWith('image/');
                    if (filter === 'documents') return f.file_extension?.match(/^(pdf|doc|docx|xls|xlsx|txt)$/);
                    if (filter === 'videos') return f.mime_type?.startsWith('video/');
                    return true;
                });
            }

            console.log(`📄 ${files.length} fayl tapıldı (folder_id: ${folderId || 'root'})`);
            return { success: true, data: files };

        } catch (error) {
            console.error('❌ getFiles xətası:', error);
            return { success: false, data: [] };
        }
    }

    /**
     * ============ 7. YENİ QOVLUQ YARAT ============
     * @param {string} name - Qovluq adı
     * @param {string} companyCode - Şirkət kodu
     * @param {number} parentId - Ana qovluq ID-si
     */
    async createFolder(name, companyCode, parentId = null) {
        console.log('📁 Yeni qovluq yaradılır:', { name, companyCode, parentId });

        try {
            const token = localStorage.getItem('guven_token');
            const userId = this.getCurrentUserId();

            if (!token || !userId) {
                return { success: false, error: 'İstifadəçi məlumatları tapılmadı' };
            }

            // URL parametrləri
            const params = new URLSearchParams();
            params.append('name', name);
            params.append('company_code', companyCode);
            params.append('created_by', userId);

            if (parentId !== null && parentId !== undefined && parentId !== 'null' && parentId !== '') {
                params.append('parent_id', parentId);
            }

            const url = `${this.baseUrl}/api/v1/company-folders?${params.toString()}`;
            console.log('📡 URL:', url);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({})
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            console.log('✅ Qovluq yaradıldı:', result);

            // Cache-i təmizlə
            this._cache.lastRefresh = {};

            // Bildiriş göstər
            if (window.filesUI?.showNotification) {
                window.filesUI.showNotification(`"${name}" qovluğu yaradıldı`, 'success');
            }

            return {
                success: true,
                data: result.data || result,
                message: 'Qovluq uğurla yaradıldı'
            };

        } catch (error) {
            console.error('❌ createFolder xətası:', error);

            if (window.filesUI?.showNotification) {
                window.filesUI.showNotification('Qovluq yaradıla bilmədi: ' + error.message, 'error');
            }

            return { success: false, error: error.message };
        }
    }

    /**
     * ============ 8. QOVLUĞU SİL ============
     * @param {number} folderId - Qovluq ID-si
     * @param {string} companyCode - Şirkət kodu
     */
    async deleteFolder(folderId, companyCode) {
        console.log(`🗑️ Qovluq silinir: ${folderId}`);

        try {
            const token = localStorage.getItem('guven_token');

            // Əgər UUID formatındadırsa, integer ID-yə çevir
            let finalFolderId = folderId;

            if (typeof folderId === 'string' && folderId.includes('-') && folderId.length === 36) {
                console.log('🔍 UUID formatında ID, integer-ə çevrilir...');

                const foldersResult = await this.getFolders(companyCode);
                if (foldersResult.success) {
                    const folder = foldersResult.data.find(f => f.uuid === folderId);
                    if (folder && folder.id) {
                        finalFolderId = folder.id;
                        console.log(`✅ Integer ID tapıldı: ${finalFolderId}`);
                    }
                }
            }

            const url = `${this.baseUrl}/api/v1/company-folders/${finalFolderId}`;
            console.log('📡 DELETE URL:', url);

            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            console.log('✅ Qovluq silindi:', result);

            // Cache-i təmizlə
            this._cache.lastRefresh = {};

            if (window.filesUI?.showNotification) {
                window.filesUI.showNotification('Qovluq silindi', 'success');
            }

            return { success: true, data: result };

        } catch (error) {
            console.error('❌ deleteFolder xətası:', error);

            if (window.filesUI?.showNotification) {
                window.filesUI.showNotification('Qovluq silinə bilmədi', 'error');
            }

            return { success: false, error: error.message };
        }
    }

    /**
     * ============ 9. FAYLI SİL ============
     * @param {string} fileUuid - Fayl UUID-si
     * @param {string} companyCode - Şirkət kodu
     */
    async deleteFile(fileUuid, companyCode) {
        console.log(`🗑️ Fayl silinir: ${fileUuid}`);

        try {
            const token = localStorage.getItem('guven_token');
            const url = `${this.baseUrl}/api/v1/company-files/${fileUuid}/${companyCode}`;

            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            console.log('✅ Fayl silindi:', result);

            if (window.filesUI?.showNotification) {
                window.filesUI.showNotification('Fayl silindi', 'success');
            }

            return { success: true, data: result };

        } catch (error) {
            console.error('❌ deleteFile xətası:', error);

            if (window.filesUI?.showNotification) {
                window.filesUI.showNotification('Fayl silinə bilmədi', 'error');
            }

            return { success: false, error: error.message };
        }
    }
}

// Global instance
window.CompanyFolderService = CompanyFolderService;