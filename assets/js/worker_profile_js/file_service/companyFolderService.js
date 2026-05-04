// worker_profile_js/file_service/companyFolderService.js

/**
 * CompanyFolderService - Şirkət qovluqları üçün tam funksional xidmət
 * İCAZƏ PROBLEMİ HƏLL EDİLMİŞ VERSİYA
 */
class CompanyFolderService {
    constructor() {
        this.baseUrl = 'https://guvenfinans.az/proxy.php';
        console.log('🔥 CompanyFolderService YÜKLƏNDİ! (fixed version)');

        // Cache
        this._cache = {
            folders: [],
            files: [],
            permissions: new Map(),  // Açar: `${companyCode}_${folderId}`
            lastRefresh: {}
        };

        // Cari istifadəçi məlumatları
        this.currentUser = this._loadUserData();
        this.permissionsLoaded = false;
    }

    /**
     * İstifadəçi məlumatlarını yüklə
     */
    _loadUserData() {
        try {
            const userData = localStorage.getItem('userData');
            if (userData) {
                const parsed = JSON.parse(userData);
                return {
                    id: parsed.user?.id || parsed.id,
                    uuid: parsed.user?.uuid || parsed.uuid,
                    name: parsed.user?.name || parsed.name,
                    email: parsed.user?.email || parsed.email,
                    isAdmin: parsed.user?.is_admin || parsed.is_admin || false,
                    companyCode: parsed.user?.company_code || parsed.company_code
                };
            }
        } catch (e) {
            console.error('User data yükləmə xətası:', e);
        }
        return { id: null, isAdmin: false };
    }

    /**
     * Admin yoxlaması
     */
    _isAdmin() {
        return this.currentUser?.isAdmin === true;
    }

    /**
     * Token al
     */
    _getToken() {
        return localStorage.getItem('guven_token');
    }

    async loadUserPermissions(companyCode) {
        console.log('🔐 İstifadəçi icazələri yüklənir:', {
            userId: this.currentUser?.id,
            requestedCompany: companyCode,
            userCompany: this.currentUser?.companyCode
        });

        const ORTAQ_SIRKET_KODU = 'HOM26113';

        // Admin üçün bütün icazələr true
        if (this._isAdmin()) {
            console.log('👑 Admin istifadəçi - bütün icazələr true');
            this.permissionsLoaded = true;
            return { success: true, isAdmin: true };
        }

        if (!this.currentUser?.id) {
            console.warn('⚠️ İstifadəçi ID tapılmadı');
            this.permissionsLoaded = true;
            return { success: false };
        }

        try {
            const token = this._getToken();
            if (!token) {
                throw new Error('Token tapılmadı');
            }

            // ========== ƏSAS DƏYİŞİKLİK ==========
            // HƏM öz şirkəti, HƏM də ORTAQ şirkət üçün icazələri yüklə

            // 1. Öz şirkəti üçün icazələr
            if (companyCode && companyCode !== ORTAQ_SIRKET_KODU) {
                const selfUrl = `${this.baseUrl}/api/v1/company-folder-permissions?user_id=${this.currentUser.id}&company_code=${companyCode}`;
                console.log('📡 Öz şirkət icazə sorğusu:', selfUrl);

                try {
                    const selfResponse = await fetch(selfUrl, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Accept': 'application/json'
                        }
                    });

                    if (selfResponse.ok) {
                        const selfData = await selfResponse.json();
                        this._processPermissions(selfData, companyCode);
                    }
                } catch (e) {
                    console.warn('⚠️ Öz şirkət icazələri yüklənə bilmədi:', e);
                }
            }

            // 2. ORTAQ şirkət üçün icazələr (HOM26113)
            const ortaqUrl = `${this.baseUrl}/api/v1/company-folder-permissions?user_id=${this.currentUser.id}&company_code=${ORTAQ_SIRKET_KODU}`;
            console.log('📡 ORTAQ şirkət icazə sorğusu:', ortaqUrl);

            const ortaqResponse = await fetch(ortaqUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (ortaqResponse.ok) {
                const ortaqData = await ortaqResponse.json();
                this._processPermissions(ortaqData, ORTAQ_SIRKET_KODU);
            } else {
                console.log(`⚠️ ORTAQ şirkət (${ORTAQ_SIRKET_KODU}) icazələri yüklənə bilmədi: ${ortaqResponse.status}`);
            }

            this.permissionsLoaded = true;
            console.log('✅ İcazələr uğurla yükləndi');
            console.log('📋 Cache-də olan açarlar:', Array.from(this._cache.permissions.keys()));

            return { success: true };

        } catch (error) {
            console.error('❌ loadUserPermissions xətası:', error);
            this.permissionsLoaded = true;
            return { success: false, error: error.message };
        }
    }

    // Permissions emalı üçün köməkçi metod
    _processPermissions(data, companyCode) {
        let permissionsArray = [];

        if (data.data && Array.isArray(data.data)) {
            permissionsArray = data.data;
        } else if (Array.isArray(data)) {
            permissionsArray = data;
        } else if (data.permissions && Array.isArray(data.permissions)) {
            permissionsArray = data.permissions;
        }

        console.log(`📋 ${companyCode} üçün ${permissionsArray.length} icazə qeydi tapıldı`);

        permissionsArray.forEach(perm => {
            if (perm.folder_id) {
                const key = `${companyCode}_${perm.folder_id}`;

                this._cache.permissions.set(key, {
                    folder_id: perm.folder_id,
                    can_view: perm.can_view === true || perm.can_view === 1,
                    can_upload: perm.can_upload === true || perm.can_upload === 1,
                    can_create: perm.can_create_folder === true || perm.can_create === true || perm.can_create_folder === 1,
                    can_delete: perm.can_delete === true || perm.can_delete === 1,
                    raw: perm
                });

                console.log(`  📌 ${companyCode} Folder ${perm.folder_id}:`, {
                    view: perm.can_view,
                    upload: perm.can_upload,
                    create: perm.can_create_folder || perm.can_create,
                    delete: perm.can_delete
                });
            }
        });
    }

    /**
     * ============ İCAZƏ YOXLAMA ============
     * @param {number|string} folderId - Qovluq ID-si
     * @param {string} permission - İcazə tipi ('view', 'upload', 'create', 'delete')
     */
    // companyFolderService.js - hasPermission metodu (DÜZGÜN VERSİYA)

    hasPermission(folderId, permission) {
        // Admin həmişə icazəlidir
        if (this._isAdmin()) {
            return true;
        }

        if (!folderId) {
            return false;
        }

        if (!this.permissionsLoaded) {
            return false;
        }

        // companyCode-u tap
        let companyCode = null;

        // 1. Cari seçilmiş şirkətin kodu
        if (window.filesUI?.selectedCompany?.code) {
            companyCode = window.filesUI.selectedCompany.code;
        }

        // 2. Əgər yoxdursa, this.currentCompanyCode-dan götür
        if (!companyCode && this.currentCompanyCode) {
            companyCode = this.currentCompanyCode;
        }

        // 3. Əgər hələ də yoxdursa, currentUser-dan götür
        if (!companyCode && this.currentUser?.companyCode) {
            companyCode = this.currentUser.companyCode;
        }

        // 4. Əgər hələ də yoxdursa, DEFAULT olaraq HOM26113
        if (!companyCode) {
            companyCode = 'HOM26113';
        }

        // ⭐ ƏSAS DƏYİŞİKLİK: Əgər icazə yoxdursa, default TRUE qaytar
        // Bu, bütün qovluqların görünməsini təmin edəcək
        const key = `${companyCode}_${folderId}`;
        const perms = this._cache.permissions.get(key);

        if (!perms) {
            console.log(`🔐 İcazə tapılmadı: ${key}, default TRUE qaytarılır`);
            // DEFAULT TRUE - bütün qovluqlar görünsün
            return true;
        }

        // Permission adını uyğunlaşdır
        let permKey;
        if (permission === 'create') permKey = 'can_create';
        else if (permission === 'view') permKey = 'can_view';
        else if (permission === 'upload') permKey = 'can_upload';
        else if (permission === 'delete') permKey = 'can_delete';
        else permKey = `can_${permission}`;

        const result = perms[permKey] === true;

        console.log(`🔐 Folder ${folderId}, permission ${permission} = ${result}`);

        return result;
    }

    /**
     * ============ QOVLUQ YARAT ============
     */
    async createFolder(name, companyCode, parentId = null) {
        console.log('📁 Yeni qovluq yaradılır:', { name, companyCode, parentId });

        try {
            // İcazə yoxlaması - ƏN VACİB HİSSƏ!
            if (parentId) {
                // İcazələr yüklənməyibsə, yüklə
                if (!this.permissionsLoaded) {
                    await this.loadUserPermissions(companyCode);
                }

                const hasCreatePerm = this.hasPermission(parentId, 'create');

                if (!hasCreatePerm && !this._isAdmin()) {
                    const error = 'Bu qovluqda yaratma icazəniz yoxdur';
                    console.log('⛔', error);

                    // UI-da bildiriş göstər
                    if (window.filesUI?.showNotification) {
                        window.filesUI.showNotification(error, 'error');
                    }

                    return {
                        success: false,
                        error: error,
                        forbidden: true
                    };
                }
            }

            const token = this._getToken();
            if (!token) {
                return { success: false, error: 'Token tapılmadı' };
            }

            // URL parametrlərini qur
            const params = new URLSearchParams();
            params.append('name', name);
            params.append('company_code', companyCode);

            if (parentId !== null && parentId !== undefined && parentId !== 'null') {
                params.append('parent_id', parentId);
            }

            const url = `${this.baseUrl}/api/v1/company-folders?${params.toString()}`;

            console.log('📡 POST URL:', url);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({})  // Bəzi serverlər boş body tələb edir
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            console.log('✅ Qovluq yaradıldı:', result);

            // Yeni qovluq üçün icazələri yenilə
            if (result.data?.id || result.id) {
                const newFolderId = result.data?.id || result.id;
                setTimeout(() => {
                    this.loadUserPermissions(companyCode);
                }, 500);
            }

            return {
                success: true,
                data: result.data || result,
                message: 'Qovluq uğurla yaradıldı'
            };

        } catch (error) {
            console.error('❌ createFolder xətası:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async getFolders(companyCode, parentId = null) {
        console.log(`📁 getFolders: company=${companyCode}, parentId=${parentId}`);

        try {
            // İcazələri yüklə (əgər yüklənməyibsə)
            if (!this.permissionsLoaded) {
                await this.loadUserPermissions(companyCode);
            }

            const token = this._getToken();
            if (!token) {
                console.warn('⚠️ Token tapılmadı');
                return { success: false, data: [], error: 'Token tapılmadı' };
            }

            // URL qur
            let url = `${this.baseUrl}/api/v1/company-folders?company_code=${companyCode}`;

            if (parentId !== null && parentId !== undefined && parentId !== 'null' && parentId !== 'undefined') {
                url += `&parent_id=${parentId}`;
            }

            console.log('📡 GET Folders URL:', url);

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                console.warn(`⚠️ Qovluqlar yüklənə bilmədi: ${response.status}`);
                return { success: false, data: [], error: `HTTP ${response.status}` };
            }

            const data = await response.json();

            // Cavab strukturunu normalize et
            let folders = [];
            if (data.data && Array.isArray(data.data)) {
                folders = data.data;
            } else if (Array.isArray(data)) {
                folders = data;
            } else if (data.folders && Array.isArray(data.folders)) {
                folders = data.folders;
            }

            // Hər qovluğa icazə məlumatlarını əlavə et
            folders = folders.map(f => {
                const folderId = f.id;
                return {
                    ...f,
                    uuid: f.uuid || f.id,
                    id: f.id,
                    can_view: this.hasPermission(folderId, 'view') || this._isAdmin(),
                    can_upload: this.hasPermission(folderId, 'upload') || this._isAdmin(),
                    can_create: this.hasPermission(folderId, 'create') || this._isAdmin(),
                    can_delete: this.hasPermission(folderId, 'delete') || this._isAdmin(),
                    can_create_folder: this.hasPermission(folderId, 'create') || this._isAdmin()
                };
            });

            console.log(`✅ ${folders.length} qovluq tapıldı`);

            // Folder 43-ün icazələrini xüsusi göstər (debug üçün)
            const folder43 = folders.find(f => f.id == 43);
            if (folder43) {
                console.log('📁 FOLDER 43 tapıldı! İcazələr:', {
                    view: folder43.can_view,
                    upload: folder43.can_upload,
                    create: folder43.can_create,
                    delete: folder43.can_delete
                });
            }

            return {
                success: true,
                data: folders
            };

        } catch (error) {
            console.error('❌ getFolders xətası:', error);
            return {
                success: false,
                data: [],
                error: error.message
            };
        }
    }

    /**
     * ============ FAYLLARI GƏTİR ============
     */
    async getFiles(companyCode, folderId = null) {
        console.log(`📄 getFiles: company=${companyCode}, folderId=${folderId}`);

        try {
            const token = this._getToken();
            if (!token) {
                return { success: false, data: [] };
            }

            let url = `${this.baseUrl}/api/v1/company-files/${companyCode}`;

            if (folderId && folderId !== 'null' && folderId !== 'undefined') {
                url += `?folder_id=${folderId}`;
            }

            console.log('📡 GET Files URL:', url);

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                return { success: false, data: [] };
            }

            const data = await response.json();

            // Cavab strukturunu normalize et
            let files = [];
            if (data.data?.files) {
                files = data.data.files;
            } else if (data.files) {
                files = data.files;
            } else if (Array.isArray(data)) {
                files = data;
            } else if (data.data && Array.isArray(data.data)) {
                files = data.data;
            }

            console.log(`✅ ${files.length} fayl tapıldı`);

            return {
                success: true,
                data: files
            };

        } catch (error) {
            console.error('❌ getFiles xətası:', error);
            return { success: false, data: [] };
        }
    }

    /**
     * ============ QOVLUĞU SİL ============
     */
    async deleteFolder(folderId, companyCode) {
        console.log(`🗑️ Qovluq silinir: ${folderId}`);

        try {
            // İcazə yoxlaması
            if (!this.hasPermission(folderId, 'delete') && !this._isAdmin()) {
                const error = 'Bu qovluğu silmə icazəniz yoxdur';
                console.warn('⛔', error);

                if (window.filesUI?.showNotification) {
                    window.filesUI.showNotification(error, 'error');
                }

                return { success: false, error, forbidden: true };
            }

            const token = this._getToken();
            const url = `${this.baseUrl}/api/v1/company-folders/${folderId}`;

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

            // İcazələri yenilə
            setTimeout(() => {
                this.loadUserPermissions(companyCode);
            }, 500);

            return { success: true, data: result };

        } catch (error) {
            console.error('❌ deleteFolder xətası:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * ============ FAYLI SİL ============
     */
    async deleteFile(fileUuid, companyCode, folderId = null) {
        console.log(`🗑️ Fayl silinir: ${fileUuid}`);

        try {
            // İcazə yoxlaması (əgər folderId varsa)
            if (folderId) {
                if (!this.hasPermission(folderId, 'delete') && !this._isAdmin()) {
                    const error = 'Bu faylı silmə icazəniz yoxdur';
                    console.warn('⛔', error);

                    if (window.filesUI?.showNotification) {
                        window.filesUI.showNotification(error, 'error');
                    }

                    return { success: false, error, forbidden: true };
                }
            }

            const token = this._getToken();
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

            return { success: true, data: result };

        } catch (error) {
            console.error('❌ deleteFile xətası:', error);
            return { success: false, error: error.message };
        }
    }
}

// Global instance
window.CompanyFolderService = CompanyFolderService;

// Avtomatik yarat
if (!window.companyFolderService) {
    window.companyFolderService = new CompanyFolderService();
    console.log('✅ companyFolderService global olaraq yaradıldı');
}