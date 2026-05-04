// file_service/file.service.js
/**
 * File Service - Şəkil yükləmə və fayl əməliyyatları üçün
 * TAM DÜZƏLDİLMİŞ VERSİYA
 */
class FileService {
    constructor(api) {
        this.api = api || window.apiService || null;
        this.files = [];
        this.folders = [];
        this.selectedFiles = new Set();
        this.currentView = 'grid';
        this.baseUrl = 'https://guvenfinans.az/proxy.php/api/v1';
        this.currentFolder = null;
        this.onFileChange = null;

        // Cache
        this._cache = {
            files: [],
            folders: [],
            allFiles: [],
            fileFolderMap: {},
            lastRefresh: 0,
            breadcrumbs: []
        };

        this.loadLocalFolders();
        console.log('🚀 FileService yaradıldı');
        this.init();
    }

    async init() {
        console.log('🚀 FileService init başladı...');

        if (!this.api) {
            console.log('⏳ API hazır deyil, gözlənilir...');
            await this.waitForApi();
        }

        try {
            await this.loadFiles();
        } catch (error) {
            console.warn('⚠️ Fayllar yüklənə bilmədi, boş siyahı ilə davam edilir');
            this.files = [];
            this.folders = this._cache.folders || [];
        }

        console.log('✅ FileService init tamamlandı');
    }

    waitForApi() {
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 20;

            const checkInterval = setInterval(() => {
                attempts++;
                this.api = window.apiService || (window.app?.api) || null;

                if (this.api) {
                    clearInterval(checkInterval);
                    console.log('✅ API tapıldı');
                    resolve();
                } else if (attempts >= maxAttempts) {
                    clearInterval(checkInterval);
                    console.warn('⚠️ API tapılmadı, local rejimdə işləyir');
                    resolve();
                }
            }, 500);
        });
    }

    // ==================== LOCAL STORAGE METODLARI ====================

    loadLocalFolders() {
        try {
            const saved = localStorage.getItem('local_folders');
            if (saved) {
                this._cache.folders = JSON.parse(saved);
                console.log(`📁 ${this._cache.folders.length} local qovluq yükləndi`);
            } else {
                this._cache.folders = [];
            }
        } catch (e) {
            this._cache.folders = [];
        }
    }

    saveLocalFolders() {
        try {
            localStorage.setItem('local_folders', JSON.stringify(this._cache.folders));
        } catch (e) {
            console.warn('Local folders save error:', e);
        }
    }


    // file.service.js - createCompanyFolder metodunu ApiService ilə işləyən versiya

    async createCompanyFolder(name, companyUuid, folderType = 'company', parentUuid = null) {
        try {
            console.log('📁 Şirkət qovluğu yaradılır:', { name, companyUuid, folderType, parentUuid });

            // ApiService istifadə et
            if (this.api) {
                // Query parametrlərini qur
                const params = new URLSearchParams();
                params.append('name', name);
                params.append('company_uuid', companyUuid);
                params.append('folder_type', folderType);

                if (parentUuid) {
                    params.append('parent_uuid', parentUuid);
                }

                // POST sorğusu - body boş, parametrlər URL-də
                const result = await this.api.post(`/company-folders?${params.toString()}`, {});

                console.log('✅ Qovluq yaradıldı:', result);

                return {
                    success: true,
                    data: result.data || result
                };
            } else {
                // ApiService yoxdursa, birbaşa fetch
                const token = localStorage.getItem('guven_token');

                const params = new URLSearchParams();
                params.append('name', name);
                params.append('company_uuid', companyUuid);
                params.append('folder_type', folderType);

                if (parentUuid) {
                    params.append('parent_uuid', parentUuid);
                }

                const response = await fetch(`https://guvenfinans.az/proxy.php/api/v1/company-folders?${params.toString()}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({})
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const data = await response.json();

                return {
                    success: true,
                    data: data.data || data
                };
            }
        } catch (error) {
            console.error('❌ Şirkət qovluğu yaratma xətası:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }


    async getCompanyFolders(companyUuid, parentUuid = null) {
        try {
            console.log('📋 Şirkət qovluqları gətirilir:', { companyUuid, parentUuid });

            const token = localStorage.getItem('guven_token');
            if (!token) throw new Error('Token tapılmadı');

            // DÜZGÜN ENDPOINT: /api/v1/company-folders/company/{companyUuid}
            let url = `https://guvenfinans.az/proxy.php/api/v1/company-folders/company/${companyUuid}`;

            if (parentUuid) {
                url += `?parent_uuid=${parentUuid}`;
            }

            console.log('📡 URL:', url);

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            console.log('📦 Cavab:', data);

            // Router cavabı: { success: true, data: [], total: 0 }
            return {
                success: true,
                data: data.data || []
            };

        } catch (error) {
            console.error('❌ Şirkət qovluqlarını gətirmə xətası:', error);
            return {
                success: false,
                data: [],
                error: error.message
            };
        }
    }

    /**
     * Faylı şirkət qovluğuna əlavə et
     * @param {string} fileUuid - Fayl UUID-i
     * @param {string} folderUuid - Qovluq UUID-i
     */
    async addFileToCompanyFolder(fileUuid, folderUuid) {
        try {
            const url = `/api/v1/company-folders/files/${fileUuid}/folders/${folderUuid}`;

            console.log('📎 Adding file to company folder:', { fileUuid, folderUuid });

            const response = await this.api.post(url);

            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('❌ Add file to folder error:', error);
            return {
                success: false,
                error: error.response?.data?.detail || error.message
            };
        }
    }

    /**
     * Qovluğun içindəkiləri gətir
     * @param {string} folderUuid - Qovluq UUID-i
     */
    async getCompanyFolderContents(folderUuid) {
        try {
            const url = `/api/v1/company-folders/${folderUuid}/contents`;

            console.log('📋 Getting folder contents:', folderUuid);

            const response = await this.api.get(url);

            if (response && response.data) {
                return {
                    success: true,
                    data: response.data.data || response.data
                };
            }

            return {
                success: false,
                error: 'Cavab alınmadı'
            };
        } catch (error) {
            console.error('❌ Get folder contents error:', error);
            return {
                success: false,
                error: error.response?.data?.detail || error.message
            };
        }
    }

    /**
     * Şirkət qovluğunu sil
     * @param {string} folderUuid - Qovluq UUID-i
     * @param {boolean} permanent - Tamamilə silinsin?
     */
    async deleteCompanyFolder(folderUuid, permanent = false) {
        try {
            const url = `/api/v1/company-folders/${folderUuid}?permanent=${permanent}`;

            console.log('🗑️ Deleting company folder:', folderUuid);

            const response = await this.api.delete(url);

            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('❌ Delete company folder error:', error);
            return {
                success: false,
                error: error.response?.data?.detail || error.message
            };
        }
    }


    async createFolder(name, parentUuid = null, options = {}) {
        try {
            const { isCompany = false, companyUuid = null } = options;

            console.log('📁 Yeni qovluq yaradılır:', { name, parentUuid, isCompany, companyUuid });

            const token = localStorage.getItem('guven_token');
            if (!token) throw new Error('Token tapılmadı');

            let payload;
            let url;

            if (isCompany && companyUuid) {
                // ŞİRKƏT QOVLUĞU YARAT (bütün işçilər görsün)
                url = `/api/v1/company-folders`;

                // Query parametrləri
                const params = new URLSearchParams();
                params.append('name', name);
                params.append('company_uuid', companyUuid);
                params.append('folder_type', 'company');

                if (parentUuid) {
                    params.append('parent_uuid', parentUuid);
                }

                url = `/api/v1/company-folders?${params.toString()}`;
                payload = {}; // Body boş olacaq, parametrlər URL-də
            } else {
                // ŞƏXSİ QOVLUQ YARAT (yalnız sizin üçün)
                const users_uuid = await this.getUserUUIDFromId(this.getCurrentUserId());

                if (!users_uuid) {
                    throw new Error('UUID tapılmadı');
                }

                url = `/api/v1/folders`;
                payload = {
                    name: name,
                    parent_uuid: parentUuid,
                    users_uuid: users_uuid
                };
            }

            console.log('📡 URL:', url);
            console.log('📦 Payload:', payload);

            const response = await fetch(`https://guvenfinans.az/proxy.php${url}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const responseText = await response.text();
            let responseData;

            try {
                responseData = JSON.parse(responseText);
            } catch (e) {
                console.log('Cavab JSON deyil:', responseText);
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${responseText}`);
            }

            console.log('✅ Qovluq yaradıldı:', responseData);
            return { success: true, data: responseData.data || responseData };

        } catch (error) {
            console.error('❌ Qovluq yaratma xətası:', error);
            return { success: false, error: error.message };
        }
    }

    // ==================== ƏSAS METODLAR ====================

    async getUserFiles(folderId = null, filter = 'all') {
        console.log(`📁 getUserFiles: folder=${folderId}, filter=${filter}`);

        try {
            const now = Date.now();

            if (this.currentFolder !== folderId) {
                this.currentFolder = folderId;
                this._cache.lastRefresh = 0;
            }

            if (this._cache.lastRefresh > 0 && now - this._cache.lastRefresh < 2000) {
                console.log('📦 Cache-dən qaytarılır');
                return this.prepareResponse(filter);
            }

            const userUUID = this.getCurrentUserUUID();
            console.log('👤 İstifadəçi UUID:', userUUID);

            await this.loadFiles(userUUID, folderId);
            this._cache.lastRefresh = now;

            return this.prepareResponse(filter);

        } catch (error) {
            console.error('❌ getUserFiles xətası:', error);
            return {
                success: true,
                folders: this._cache.folders || [],
                files: this._cache.files || [],
                breadcrumbs: this.getBreadcrumbs(folderId),
                total: (this._cache.files?.length || 0) + (this._cache.folders?.length || 0)
            };
        }
    }

    async getCompanyFiles(companyCode, filter = 'all') {
        try {
            console.log(`🏢 Şirkət faylları yüklənir: ${companyCode}, filter: ${filter}`);

            const token = localStorage.getItem('guven_token');

            const url = `${this.baseUrl}/files/companies/${companyCode}/files?filter=${filter}&page=1&per_page=100`;

            console.log('📡 URL:', url);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                return {
                    success: false,
                    folders: [],
                    files: [],
                    total: 0
                };
            }

            const data = await response.json();

            return {
                success: true,
                folders: data.folders || [],
                files: data.files || [],
                total: (data.folders?.length || 0) + (data.files?.length || 0)
            };

        } catch (error) {
            console.error('❌ Company files error:', error);
            return {
                success: false,
                folders: [],
                files: [],
                total: 0
            };
        }
    }

    prepareResponse(filter) {
        const currentFolder = this.currentFolder;

        console.log(`📊 prepareResponse başladı: currentFolder=${currentFolder}`);
        console.log(`   - allFiles: ${this._cache.allFiles?.length || 0}`);
        console.log(`   - folders: ${this._cache.folders?.length || 0}`);

        let files = [];
        let folders = [];

        if (currentFolder && currentFolder !== 'null' && currentFolder !== 'undefined') {
            files = (this._cache.allFiles || []).filter(f => {
                const fileFolderId = f.folder_id || f.parent_id;
                return String(fileFolderId) === String(currentFolder);
            });

            console.log(`📂 Cari folder: ${currentFolder}`);
            console.log(`   - Fayllar (birbaşa): ${files.length}`);

            if (files.length === 0 && this._cache.fileFolderMap) {
                files = (this._cache.allFiles || []).filter(f => {
                    const mapFolderId = this._cache.fileFolderMap[f.uuid];
                    return String(mapFolderId) === String(currentFolder);
                });
                console.log(`   - Fayllar (map): ${files.length}`);
            }

            folders = (this._cache.folders || []).filter(f =>
                String(f.parent_id) === String(currentFolder)
            );
            console.log(`   - Alt qovluqlar: ${folders.length}`);

        } else {
            folders = (this._cache.folders || []).filter(f => !f.parent_id);
            files = (this._cache.allFiles || []).filter(f => {
                const hasFolder = f.folder_id || f.parent_id;
                return !hasFolder;
            });

            console.log(`🏠 Root qovluq`);
            console.log(`   - Fayllar: ${files.length}`);
            console.log(`   - Qovluqlar: ${folders.length}`);
        }

        if (filter !== 'all') {
            files = files.filter(file => {
                if (filter === 'images') return this.isImage(file);
                if (filter === 'documents') {
                    const docTypes = ['pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx'];
                    return docTypes.includes(this.getFileExtension(file));
                }
                if (filter === 'videos') {
                    const videoTypes = ['mp4', 'avi', 'mov', 'mkv'];
                    return videoTypes.includes(this.getFileExtension(file));
                }
                return true;
            });
        }

        return {
            success: true,
            folders: folders,
            files: files,
            breadcrumbs: this.getBreadcrumbs(currentFolder),
            total: files.length + folders.length
        };
    }

    getBreadcrumbs(folderId) {
        const breadcrumbs = [{ id: null, name: 'Bütün fayllar' }];

        if (folderId && folderId !== 'null' && folderId !== 'undefined') {
            const folder = this._cache.folders?.find(f =>
                String(f.id) === String(folderId) || String(f.uuid) === String(folderId)
            );
            if (folder) {
                breadcrumbs.push({ id: folder.uuid || folder.id, name: folder.name });
            } else {
                breadcrumbs.push({ id: folderId, name: 'Qovluq' });
            }
        }

        return breadcrumbs;
    }



    async loadFiles(userIdentifier, folderUuid = null) {
        try {
            console.log(`📁 Backend-dən real fayllar yüklənir... folderUuid: ${folderUuid}`);
            console.log('👤 İstifadəçi identifikatoru:', userIdentifier);

            // 1. USER UUID-Nİ TAP - ƏN VACİB HİSSƏ!
            let usersUuid = null;
            let userId = this.getCurrentUserId();

            // UUID formatındadırsa (d152b378-...), onu istifadə et
            if (userIdentifier && typeof userIdentifier === 'string' && userIdentifier.includes('-') && userIdentifier.length > 30) {
                usersUuid = userIdentifier;
            } else {
                // ID-dirsə, UUID-ni tapmağa çalış
                usersUuid = await this.getUserUUIDFromId(userId);
            }

            console.log('🎯 İstifadə olunacaq UUID:', usersUuid);

            // 2. BÜTÜN FAYLLARI YÜKLƏ (ID ilə)
            let allFiles = [];
            try {
                const token = localStorage.getItem('guven_token');
                const filesUrl = `${this.baseUrl}/files/user/${userId}?per_page=100`;

                console.log('📡 Fayl URL (ID ilə):', filesUrl);

                const filesResponse = await fetch(filesUrl, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    }
                });

                if (filesResponse.ok) {
                    const filesData = await filesResponse.json();
                    const rawFiles = filesData.data?.files || filesData.files || filesData.data || [];
                    console.log(`📄 ${rawFiles.length} fayl tapıldı`);
                    allFiles = this.formatFiles(rawFiles);
                }
            } catch (e) {
                console.warn('Fayllar yüklənə bilmədi:', e);
            }

            // 3. QOVLUQLARI YÜKLƏ - UUID İLƏ!
            let folders = [];
            try {
                const token = localStorage.getItem('guven_token');

                // Əgər UUID varsa, onunla yüklə
                if (usersUuid) {
                    let foldersUrl = `${this.baseUrl}/folders?users_uuid=${usersUuid}&per_page=100`;

                    if (folderUuid && folderUuid !== 'null' && folderUuid !== 'undefined') {
                        foldersUrl += `&parent_uuid=${folderUuid}`;
                    }

                    console.log('📡 Qovluq URL (UUID ilə):', foldersUrl);

                    const foldersResponse = await fetch(foldersUrl, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Accept': 'application/json'
                        }
                    });

                    if (foldersResponse.ok) {
                        const foldersData = await foldersResponse.json();

                        // Cavab strukturuna uyğunlaş
                        let rawFolders = [];
                        if (foldersData.folders) rawFolders = foldersData.folders;
                        else if (foldersData.data) rawFolders = foldersData.data;
                        else if (Array.isArray(foldersData)) rawFolders = foldersData;

                        console.log('📦 Qovluq cavabı:', foldersData);

                        folders = rawFolders.map(f => ({
                            id: f.uuid || f.id,
                            uuid: f.uuid || f.id,
                            name: f.name,
                            type: 'folder',
                            parent_id: f.parent_uuid || f.parent_id,
                            item_count: f.item_count || 0,
                            created_at: f.created_at,
                            is_local: f.is_local || false
                        }));

                        console.log(`📁 ${folders.length} qovluq tapıldı`);
                    } else {
                        console.warn('Qovluqlar yüklənə bilmədi, status:', foldersResponse.status);
                    }
                } else {
                    console.warn('⚠️ UUID tapılmadı, qovluqlar yüklənə bilməz');
                }
            } catch (e) {
                console.warn('Qovluqlar yüklənə bilmədi:', e);
            }

            // 4. CACHE-İ YENİLƏ
            this._cache.allFiles = allFiles;
            this._cache.folders = folders;

            // 5. CARI QOVLUQDAKI FAYLLARI TAP
            let currentFolderFiles = [];

            if (folderUuid && folderUuid !== 'null' && folderUuid !== 'undefined') {
                currentFolderFiles = allFiles.filter(f => {
                    const fileFolderId = f.folder_id || f.parent_id;
                    return String(fileFolderId) === String(folderUuid);
                });
                console.log(`📂 Cari qovluqdakı fayllar: ${currentFolderFiles.length}`);
            } else {
                currentFolderFiles = allFiles.filter(f => {
                    const hasFolder = f.folder_id || f.parent_id;
                    return !hasFolder;
                });
                console.log(`🏠 Root fayllar: ${currentFolderFiles.length}`);
            }

            // 6. CACHE-İ YENİLƏ
            this._cache.files = currentFolderFiles;
            this._cache.lastRefresh = Date.now();
            this.files = currentFolderFiles;
            this.folders = folders;

            console.log(`📊 Ümumi: ${currentFolderFiles.length} fayl, ${folders.length} qovluq`);
            return currentFolderFiles;

        } catch (error) {
            console.error('❌ loadFiles xətası:', error);
            return [];
        }
    }

    // Yeni metod - ID-dən UUID tap
    async getUserUUIDFromId(userId) {
        try {
            // Əvvəlcə localStorage-dən bax
            const userData = localStorage.getItem('userData');
            if (userData) {
                const parsed = JSON.parse(userData);
                const uuid = parsed.user?.uuid || parsed.uuid;
                if (uuid && uuid.includes('-') && uuid.length > 30) {
                    console.log('✅ UUID localStorage-dən tapıldı:', uuid);
                    return uuid;
                }
            }

            // API-dən yüklə
            const token = localStorage.getItem('guven_token');
            const response = await fetch(`https://guvenfinans.az/proxy.php/api/v1/users/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (response.ok) {
                const userData = await response.json();
                const uuid = userData.uuid || userData.data?.uuid;
                if (uuid) {
                    console.log('✅ UUID API-dən tapıldı:', uuid);

                    // localStorage-ə yadda saxla
                    const existingData = localStorage.getItem('userData');
                    let newData = existingData ? JSON.parse(existingData) : {};
                    if (!newData.user) newData.user = {};
                    newData.user.uuid = uuid;
                    newData.uuid = uuid;
                    localStorage.setItem('userData', JSON.stringify(newData));

                    return uuid;
                }
            }
        } catch (e) {
            console.error('UUID tapma xətası:', e);
        }
        return null;
    }

    async uploadMultipleFiles(files, category = 'USER_FILE', folderId = null) {
        console.log(`📤 ${files.length} fayl yüklənir...`);

        const results = {
            uploaded: [],
            errors: []
        };

        for (const file of files) {
            try {
                const result = await this.uploadFile(file, category, folderId);
                results.uploaded.push(result);
            } catch (error) {
                console.error(`❌ ${file.name} yüklənə bilmədi:`, error);
                results.errors.push({
                    file: file.name,
                    error: error.message
                });
            }
        }

        if (results.uploaded.length > 0) {
            this._cache.lastRefresh = 0;
            await this.loadFiles();
        }

        return results;
    }

    async uploadFile(file, category = 'USER_FILE', folderId = null) {
        try {
            console.log(`📤 Fayl yüklənir: ${file.name}, folderId: ${folderId}`);

            // ========== 1. ÖLÇÜ LİMİTİ YOXLAMASI ==========
            const MAX_SIZE = 50 * 1024 * 1024; // 50 MB
            const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);

            console.log(`📏 Fayl ölçüsü: ${fileSizeMB} MB`);

            if (file.size > MAX_SIZE) {
                const errorMsg = `Fayl ölçüsü 50 MB-dan böyükdür! (${fileSizeMB} MB)`;
                console.error('❌', errorMsg);

                // BİRBAŞA NOTIFICATION GÖSTƏR - ƏN SADƏ ÜSUL
                try {
                    // Əgər filesUI varsa
                    if (window.filesUI && window.filesUI.showNotification) {
                        window.filesUI.showNotification(errorMsg, 'error');
                    }
                    // Əgər apiService varsa
                    else if (window.apiService && window.apiService.showNotification) {
                        window.apiService.showNotification(errorMsg, 'error');
                    }
                    // Heç biri yoxdursa, öz notification-u yarat
                    else {
                        this._showErrorNotification(errorMsg);
                    }
                } catch (e) {
                    console.warn('Notification göstərilə bilmədi:', e);
                    alert(errorMsg); // Ən son çarə
                }

                return {
                    success: false,
                    error: errorMsg,
                    size: file.size,
                    maxSize: MAX_SIZE
                };
            }
            // ===============================================

            const token = localStorage.getItem('guven_token');
            if (!token) throw new Error('Token tapılmadı');

            const formData = new FormData();
            formData.append('file', file);
            formData.append('category', category === 'USER_FILE' ? 'other' : category);

            if (folderId && folderId !== 'null' && folderId !== 'undefined') {
                formData.append('folder_uuid', folderId);
                console.log(`📂 Fayl folder-ə əlavə olunacaq: ${folderId}`);
            }

            const url = `${this.baseUrl}/files/simple-upload`;
            console.log('📡 URL:', url);

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            console.log('📥 Response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const responseText = await response.text();
            console.log('📦 Server cavabı:', responseText);

            if (!responseText || responseText.trim() === '') {
                const fakeFileId = 'temp_' + Date.now();
                console.warn('⚠️ Fake file ID yaradılır:', fakeFileId);

                const newFile = {
                    id: fakeFileId,
                    uuid: fakeFileId,
                    name: file.name,
                    original_filename: file.name,
                    filename: file.name,
                    type: file.name.split('.').pop() || 'unknown',
                    file_extension: file.name.split('.').pop() || 'unknown',
                    category: category,
                    size: file.size,
                    file_size: file.size,
                    folder_id: folderId,
                    parent_id: folderId,
                    modified: new Date().toISOString().split('T')[0],
                    created_at: new Date().toISOString(),
                    icon: this.getFileIcon(file.name),
                    color: this.getFileColor(file.name),
                    url: ''
                };

                this._cache.allFiles = this._cache.allFiles || [];
                this._cache.allFiles.push(newFile);
                this._cache.fileFolderMap[fakeFileId] = folderId;

                return { success: true, data: newFile };
            }

            let result;
            try {
                result = JSON.parse(responseText);
            } catch (e) {
                console.error('❌ JSON parse xətası:', e);
                throw new Error('Serverdən düzgün JSON cavabı gəlmədi');
            }

            const fileData = result.data || result.file || result;
            const fileUuid = fileData.uuid || fileData.id || result.file_id;

            if (!fileUuid) {
                throw new Error('Serverdən file ID gəlmədi');
            }

            const newFile = {
                id: fileUuid,
                uuid: fileUuid,
                name: file.name,
                original_filename: file.name,
                filename: file.name,
                type: fileData.file_extension || file.name.split('.').pop() || 'unknown',
                file_extension: fileData.file_extension || file.name.split('.').pop() || 'unknown',
                category: fileData.category || category,
                size: fileData.size || fileData.file_size || file.size,
                file_size: fileData.size || fileData.file_size || file.size,
                folder_id: folderId,
                parent_id: folderId,
                modified: new Date().toISOString().split('T')[0],
                created_at: new Date().toISOString(),
                icon: this.getFileIcon(file.name),
                color: this.getFileColor(file.name),
                url: fileData.url || result.url || ''
            };

            this._cache.allFiles = this._cache.allFiles || [];
            this._cache.allFiles.push(newFile);
            this._cache.fileFolderMap[fileUuid] = folderId;

            console.log(`✅ Fayl cache-ə əlavə edildi: ${file.name}, folder: ${folderId}`);

            if (folderId && folderId === this.currentFolder) {
                console.log('🔄 UI yenilənir...');

                // Düzgün metod adı - loadPersonalFiles və ya loadFiles?
                if (window.filesUI && typeof window.filesUI.loadPersonalFiles === 'function') {
                    window.filesUI.loadPersonalFiles();
                } else if (window.filesUI && typeof window.filesUI.loadFiles === 'function') {
                    window.filesUI.loadFiles();
                } else if (window.filesUI && typeof window.filesUI.refresh === 'function') {
                    window.filesUI.refresh();
                } else {
                    // Əgər heç biri yoxdursa, səhifəni yenilə
                    console.log('⚠️ filesUI metodu tapılmadı, cache sıfırlanır');
                    this._cache.lastRefresh = 0;

                    // Əgər currentFolder varsa, onu yüklə
                    if (this.currentFolder) {
                        this.getUserFiles(this.currentFolder);
                    }
                }
            }

            return { success: true, data: newFile };

        } catch (error) {
            console.error('❌ Yükləmə xətası:', error);
            throw error;
        }
    }

    async deleteFile(fileId) {
        console.log(`🗑️ Fayl silinir: ${fileId}`);

        try {
            if (this.api && fileId && !fileId.toString().startsWith('temp_')) {
                const response = await this.api.delete(`/files/${fileId}`);
                console.log('✅ Silmə cavabı:', response);
            }

            this._cache.allFiles = (this._cache.allFiles || []).filter(f =>
                String(f.id) !== String(fileId) && String(f.uuid) !== String(fileId)
            );
            this._cache.files = (this._cache.files || []).filter(f =>
                String(f.id) !== String(fileId) && String(f.uuid) !== String(fileId)
            );
            this._cache.lastRefresh = 0;

            if (this.onFileChange) {
                this.onFileChange('delete', { id: fileId });
            }

            return { success: true };

        } catch (error) {
            console.error('❌ Silmə xətası:', error);
            throw error;
        }
    }

    // ==================== QOVLUQ ƏMƏLİYYATLARI ====================

    async createFolder(folderName, parentId = null) {
        console.log(`📁 Yeni qovluq yaradılır: "${folderName}", parentId: ${parentId}`);

        try {
            const token = localStorage.getItem('guven_token');
            if (!token) throw new Error('Token tapılmadı');

            // UUID-ni tap
            const users_uuid = await this.getUserUUIDFromId(this.getCurrentUserId());

            if (!users_uuid) {
                throw new Error('UUID tapılmadı');
            }

            const payload = {
                name: folderName,
                parent_uuid: parentId,
                users_uuid: users_uuid
            };

            console.log('📦 Payload:', payload);

            const response = await fetch(`${this.baseUrl}/folders`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const responseText = await response.text();
            let responseData;

            try {
                responseData = JSON.parse(responseText);
            } catch (e) {
                console.log('Cavab JSON deyil:', responseText);
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${responseText}`);
            }

            console.log('✅ Qovluq yaradıldı:', responseData);

            // Yeni qovluğu cache-ə əlavə et
            const newFolder = {
                id: responseData.data?.uuid || responseData.uuid,
                uuid: responseData.data?.uuid || responseData.uuid,
                name: folderName,
                type: 'folder',
                parent_id: parentId,
                item_count: 0,
                created_at: new Date().toISOString(),
                is_local: false
            };

            if (!this._cache.folders) this._cache.folders = [];
            this._cache.folders.push(newFolder);
            this._cache.lastRefresh = 0;

            // UI-ı yenilə
            if (this.onFileChange) {
                this.onFileChange('folder_created', newFolder);
            }

            // Dərhal faylları yenidən yüklə - VACİB!
            setTimeout(() => {
                this.loadFiles(users_uuid, this.currentFolder);
            }, 100);

            if (window.filesUI?.showNotification) {
                window.filesUI.showNotification(`"${folderName}" qovluğu yaradıldı`, 'success');
            }

            return { success: true, data: newFolder };

        } catch (error) {
            console.error('❌ Qovluq yaratma xətası:', error);

            if (window.filesUI?.showNotification) {
                window.filesUI.showNotification(`Qovluq yaradıla bilmədi: ${error.message}`, 'error');
            }

            return { success: false, error: error.message };
        }
    }

    createLocalFolder(folderName, parentId = null) {
        console.log('⚠️ Local qovluq yaradılır...');

        const newFolder = {
            id: 'local_' + Date.now(),
            uuid: 'local_' + Date.now(),
            name: folderName,
            parent_id: parentId,
            type: 'folder',
            item_count: 0,
            created_at: new Date().toISOString(),
            is_local: true
        };

        if (!this._cache.folders) this._cache.folders = [];
        this._cache.folders.push(newFolder);
        this.saveLocalFolders();
        this._cache.lastRefresh = 0;

        if (this.onFileChange) {
            this.onFileChange('folder_created_local', newFolder);
        }

        if (window.filesUI?.showNotification) {
            window.filesUI.showNotification(`"${folderName}" qovluğu yaradıldı (lokal)`, 'info');
        }

        return { success: true, data: newFolder };
    }

    /**
     * Qovluğu sil - UI-DA ÇAĞIRILIR (folder-item click-də)
     */
    async deleteFolder(folderId) {
        console.log(`🗑️ Qovluq silinir: ${folderId}`);
        console.log(`📌 folderId tipi: ${typeof folderId}, dəyər:`, folderId);

        // Local qovluqdursa (client-side only)
        if (folderId && (folderId.toString().startsWith('local_') || folderId.toString().startsWith('temp_'))) {
            try {
                this._cache.folders = this._cache.folders.filter(f =>
                    f.id != folderId && f.uuid != folderId
                );
                this.saveLocalFolders();
                this._cache.lastRefresh = 0;

                if (window.filesUI?.showNotification) {
                    window.filesUI.showNotification('Qovluq silindi', 'success');
                }

                return {success: true};
            } catch (e) {
                console.error('Local qovluq silmə xətası:', e);
                return {success: false, error: e.message};
            }
        }

        // Backend-ə cəhd et - SADƏ VERSİYA
        try {
            const token = localStorage.getItem('guven_token');
            if (!token) {
                throw new Error('Token tapılmadı');
            }

            // UUID-ni təmizlə - sadəcə string olduğuna əmin ol
            const cleanFolderId = String(folderId).trim();

            console.log(`📡 Backend-dən qovluq silinir: ${cleanFolderId}`);

            // Fetch ilə birbaşa sorğu
            const response = await fetch(`https://guvenfinans.az/proxy.php/api/v1/folders/${cleanFolderId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            console.log('📥 Response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Server cavabı:', response.status, errorText);

                // Xəta olsa belə, UI-dan sil (optimistic delete)
                this._cache.folders = this._cache.folders.filter(f =>
                    f.id != folderId && f.uuid != folderId
                );
                this._cache.lastRefresh = 0;

                if (window.filesUI?.showNotification) {
                    window.filesUI.showNotification('Qovluq silindi (server xətası)', 'warning');
                }

                return {success: true, local: true};
            }

            const result = await response.json();
            console.log('✅ Qovluq silindi:', result);

            // Cache-dən də sil
            this._cache.folders = this._cache.folders.filter(f =>
                f.id != folderId && f.uuid != folderId
            );
            this._cache.lastRefresh = 0;

            if (window.filesUI?.showNotification) {
                window.filesUI.showNotification('Qovluq silindi', 'success');
            }

            return result;

        } catch (error) {
            console.error('❌ Qovluq silmə xətası:', error);

            // Xəta olsa belə, UI-dan sil (optimistic delete)
            this._cache.folders = this._cache.folders.filter(f =>
                f.id != folderId && f.uuid != folderId
            );
            this._cache.lastRefresh = 0;

            if (window.filesUI?.showNotification) {
                window.filesUI.showNotification('Qovluq silindi (lokal)', 'warning');
            }

            return {success: true, local: true};
        }
    }


        // ==================== ŞİRKƏT VƏ PARTNYOR METODLARI ====================

    /**
     * İstifadəçinin şirkət kodunu tap
     */
    getUserCompanyCode() {
        try {
            // Profil məlumatlarından companyCode-u götür
            if (window.profileData) {
                return window.profileData.companyCode;
            }

            // localStorage-dən user-in şirkət kodunu al
            const userData = localStorage.getItem('userData');
            if (userData) {
                const parsedData = JSON.parse(userData);
                if (parsedData.user) {
                    return parsedData.user.company_code || parsedData.user.companyCode;
                } else {
                    return parsedData.company_code || parsedData.companyCode;
                }
            }

            // Əgər tapılmadısa, default dəyər
            console.warn('⚠️ Şirkət kodu tapılmadı, default dəyər istifadə olunur');
            return 'AZE26003';
        } catch (e) {
            console.error('❌ Şirkət kodu alma xətası:', e);
            return 'AZE26003';
        }
    }

    /**
     * Şirkətləri yüklə - /companies/${companyCode}/sub-companies
     */
    async loadCompanies(companyCode = null) {
        try {
            const code = companyCode || this.getUserCompanyCode();
            console.log(`📥 Şirkətlər yüklənir: ${code}`);

            if (!this.api) {
                console.warn('⚠️ API service tapılmadı');
                return this.getMockCompanies();
            }

            const response = await this.api.get(`/companies/${code}/sub-companies`);
            console.log('📦 API cavabı (şirkətlər):', response);

            let companies = [];

            // Cavab formatını yoxla
            if (response && response.sub_companies) {
                companies = response.sub_companies;
            } else if (Array.isArray(response)) {
                companies = response;
            } else if (response && response.data && Array.isArray(response.data)) {
                companies = response.data;
            } else if (response && response.companies && Array.isArray(response.companies)) {
                companies = response.companies;
            }

            // Şirkətləri formatla
            const formattedCompanies = companies.map(company => ({
                id: company.id || company.uuid || `comp_${Math.random()}`,
                name: company.company_name || company.name || 'Adsız Şirkət',
                code: company.company_code || company.code || '',
                type: 'company',
                is_active: company.is_active !== false,
                voen: company.voen || '',
                created_at: company.created_at
            }));

            console.log(`✅ ${formattedCompanies.length} şirkət yükləndi`);
            return formattedCompanies;

        } catch (error) {
            console.error('❌ Şirkətlər yüklənmədi:', error);
            return this.getMockCompanies();
        }
    }

    /**
     * Partnyorları yüklə - /partners/?company_code=${companyCode}
     */
    async loadPartners(companyCode = null) {
        try {
            const code = companyCode || this.getUserCompanyCode();
            console.log(`📥 Partnyorlar yüklənir: ${code}`);

            if (!this.api) {
                console.warn('⚠️ API service tapılmadı');
                return this.getMockPartners();
            }

            const response = await this.api.get(`/partners/?company_code=${code}`);
            console.log('📦 API cavabı (partnyorlar):', response);

            let allPartners = [];

            // Cavab formatını yoxla
            if (response && response.items && Array.isArray(response.items)) {
                allPartners = response.items;
            } else if (Array.isArray(response)) {
                allPartners = response;
            } else if (response && response.data && Array.isArray(response.data)) {
                allPartners = response.data;
            } else if (response && response.partners && Array.isArray(response.partners)) {
                allPartners = response.partners;
            }

            // Hər bir partnyor üçün məlumatları formatla (yalnız bu şirkətə aid olanlar)
            const formattedPartners = allPartners
                .filter(partner => partner.child_company_code === code)
                .map(partner => ({
                    id: partner.id || `partner_${Math.random()}`,
                    name: partner.parent_company?.company_name || partner.parent_company_name || 'Adsız Partnyor',
                    code: partner.parent_company_code || '',
                    type: 'partner',
                    relationship_type: partner.relationship_type || 'unknown',
                    status: partner.status || 'active',
                    contract_number: partner.contract_number || '',
                    contact_person: partner.contact_person || '',
                    contact_phone: partner.contact_phone || '',
                    contact_email: partner.contact_email || '',
                    description: partner.description || '',
                    total_projects: partner.total_projects || 0,
                    last_contact_date: partner.last_contact_date,
                    created_at: partner.created_at,
                    is_active: partner.status !== 'deactivated'
                }));

            console.log(`✅ ${formattedPartners.length} partnyor yükləndi`);
            return formattedPartners;

        } catch (error) {
            console.error('❌ Partnyorlar yüklənmədi:', error);
            return this.getMockPartners();
        }
    }

    /**
     * Bütün şirkət və partnyorları bir siyahıda yüklə
     */
    async loadAllCompaniesAndPartners(companyCode = null) {
        try {
            const code = companyCode || this.getUserCompanyCode();
            console.log(`📥 Bütün şirkət və partnyorlar yüklənir: ${code}`);

            // Paralel olaraq hər ikisini yüklə
            const [companies, partners] = await Promise.all([
                this.loadCompanies(code),
                this.loadPartners(code)
            ]);

            // Birləşdir və qaytar
            const allItems = [...companies, ...partners];
            console.log(`✅ Ümumi ${allItems.length} şirkət və partnyor yükləndi`);

            return allItems;

        } catch (error) {
            console.error('❌ Məlumatlar yüklənmədi:', error);
            return [...this.getMockCompanies(), ...this.getMockPartners()];
        }
    }

    /**
     * Mock şirkət məlumatları (API xəta verəndə göstərmək üçün)
     */
    getMockCompanies() {
        return [
            {
                id: 'comp1',
                name: 'AzeriKori MMC',
                code: 'AZE26003',
                type: 'company',
                is_active: true,
                voen: '1242141241'
            },
            {
                id: 'comp2',
                name: 'Guven Finans',
                code: 'GF12345',
                type: 'company',
                is_active: true,
                voen: '9876543210'
            },
            {
                id: 'comp3',
                name: 'Tech Solutions',
                code: 'TS78901',
                type: 'company',
                is_active: true,
                voen: '4567891230'
            }
        ];
    }

    /**
     * Mock partnyor məlumatları (API xəta verəndə göstərmək üçün)
     */
    getMockPartners() {
        return [
            {
                id: 'part1',
                name: 'ABC Corp',
                code: 'ABC001',
                type: 'partner',
                relationship_type: 'distributor',
                is_active: true,
                contract_number: 'CTR-2023-001',
                contact_person: 'John Doe',
                contact_phone: '+994501234567'
            },
            {
                id: 'part2',
                name: 'XYZ Ltd',
                code: 'XYZ002',
                type: 'partner',
                relationship_type: 'supplier',
                is_active: true,
                contract_number: 'CTR-2023-002',
                contact_person: 'Jane Smith',
                contact_phone: '+994507654321'
            },
            {
                id: 'part3',
                name: 'Global Trade',
                code: 'GT003',
                type: 'partner',
                relationship_type: 'customer',
                is_active: true,
                contract_number: 'CTR-2023-003'
            }
        ];
    }

    /**
     * Şirkətə aid faylları yüklə
     */
    async getCompanyFilesByCode(companyCode, filter = 'all', page = 1, perPage = 100) {
        try {
            console.log(`🏢 Şirkət faylları yüklənir: ${companyCode}, filter: ${filter}`);

            const token = localStorage.getItem('guven_token');
            const url = `${this.baseUrl}/files/companies/${companyCode}/files?filter=${filter}&page=${page}&per_page=${perPage}`;

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                return {
                    success: true,
                    folders: data.folders || [],
                    files: this.formatFiles(data.files || []),
                    total: data.total || 0,
                    page: data.page || page,
                    per_page: data.per_page || perPage
                };
            }

            return { success: false, folders: [], files: [], total: 0 };

        } catch (error) {
            console.error('❌ Şirkət faylları yüklənmədi:', error);
            return { success: false, folders: [], files: [], total: 0 };
        }
    }

    /**
     * Partnyora aid faylları yüklə
     */
    async getPartnerFiles(partnerId, filter = 'all', page = 1, perPage = 100) {
        try {
            console.log(`🤝 Partnyor faylları yüklənir: ${partnerId}, filter: ${filter}`);

            const token = localStorage.getItem('guven_token');
            const url = `${this.baseUrl}/partners/${partnerId}/files?filter=${filter}&page=${page}&per_page=${perPage}`;

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                return {
                    success: true,
                    folders: data.folders || [],
                    files: this.formatFiles(data.files || []),
                    total: data.total || 0,
                    page: data.page || page,
                    per_page: data.per_page || perPage
                };
            }

            return { success: false, folders: [], files: [], total: 0 };

        } catch (error) {
            console.error('❌ Partnyor faylları yüklənmədi:', error);
            return { success: false, folders: [], files: [], total: 0 };
        }
    }



    async uploadFileForCompany(file, companyCode, category = 'COMPANY_FILE', folderId = null, options = {}) {
        try {
            console.log('='.repeat(60));
            console.log('🏢 ŞİRKƏT FAYLI YÜKLƏNİR (company_files)');
            console.log('='.repeat(60));
            console.log('📁 Fayl:', file.name);
            console.log('🏢 Şirkət kodu:', companyCode);
            console.log('📂 Folder ID:', folderId);
            console.log('📂 Folder ID tipi:', typeof folderId);

            // ========== 1. ÖLÇÜ LİMİTİ YOXLAMASI ==========
            const MAX_SIZE = 50 * 1024 * 1024; // 50 MB
            const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);

            console.log(`📏 Fayl ölçüsü: ${fileSizeMB} MB`);

            if (file.size > MAX_SIZE) {
                const errorMsg = `Fayl ölçüsü 50 MB-dan böyükdür! (${fileSizeMB} MB)`;
                console.error('❌', errorMsg);

                // BİRBAŞA NOTIFICATION GÖSTƏR - ƏN SADƏ ÜSUL
                try {
                    // Əgər filesUI varsa
                    if (window.filesUI && window.filesUI.showNotification) {
                        window.filesUI.showNotification(errorMsg, 'error');
                    }
                    // Əgər apiService varsa
                    else if (window.apiService && window.apiService.showNotification) {
                        window.apiService.showNotification(errorMsg, 'error');
                    }
                    // Heç biri yoxdursa, öz notification-u yarat
                    else {
                        this._showErrorNotification(errorMsg);
                    }
                } catch (e) {
                    console.warn('Notification göstərilə bilmədi:', e);
                    alert(errorMsg); // Ən son çarə
                }

                return {
                    success: false,
                    error: errorMsg,
                    size: file.size,
                    maxSize: MAX_SIZE
                };
            }

            console.log('✅ Fayl ölçüsü limit daxilindədir');
            // ===============================================

            const token = localStorage.getItem('guven_token');
            if (!token) throw new Error('Token tapılmadı');

            // ========== 2. KATEQORİYA SEÇİMİ ==========
            let fileCategory;
            const fileExt = file.name.split('.').pop()?.toLowerCase() || '';

            if (fileExt.match(/^(jpg|jpeg|png|gif|webp|svg)$/)) fileCategory = 'image';
            else if (fileExt.match(/^(mp4|avi|mov|mkv|webm)$/)) fileCategory = 'company_video';
            else if (fileExt.match(/^(pdf)$/)) fileCategory = 'document_pdf';
            else if (fileExt.match(/^(xls|xlsx|csv)$/)) fileCategory = 'document_excel';
            else if (fileExt.match(/^(doc|docx|txt|rtf)$/)) fileCategory = 'document_word';
            else fileCategory = 'other';

            console.log('📁 Kateqoriya:', fileCategory);

            // ========== 3. FAYLI YÜKLƏ (company-upload) ==========
            const uploadUrl = `${this.baseUrl}/files/company-upload`;
            console.log('📡 Yükləmə URL:', uploadUrl);

            const formData = new FormData();
            formData.append('file', file);
            formData.append('category', fileCategory);
            formData.append('company_code', companyCode);

            // ƏN VACİB HİSSƏ - FOLDER_ID MÜTLƏQ GÖNDƏRİLSİN!
            if (folderId && folderId !== 'null' && folderId !== 'undefined' && folderId !== '') {
                formData.append('folder_id', folderId);
                console.log('📂 FOLDER_ID GÖNDƏRİLİR:', folderId);
            } else {
                console.log('📂 FOLDER_ID yoxdur, root-a yüklənir');
            }

            const metadata = {
                company_code: companyCode,
                is_company_file: true,
                uploaded_at: new Date().toISOString(),
                original_filename: file.name
            };
            formData.append('metadata', JSON.stringify(metadata));

            const uploadResponse = await fetch(uploadUrl, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            console.log('📥 Upload status:', uploadResponse.status);

            if (!uploadResponse.ok) {
                const errorText = await uploadResponse.text();
                throw new Error(`HTTP ${uploadResponse.status}: ${errorText}`);
            }

            const result = await uploadResponse.json();
            console.log('✅ Fayl yükləndi:', result);

            // ========== 4. FAYL ID ==========
            const fileUuid = result.file_id || result.data?.uuid || result.uuid;

            if (!fileUuid) {
                console.warn('⚠️ Fayl ID alına bilmədi');
                return result;
            }

            console.log('✅ Fayl UUID:', fileUuid);

            // ========== 5. FAYLI COMPANY_FILES CƏDVƏLİNƏ ƏLAVƏ ET ==========
            try {
                console.log('📎 Fayl company_files cədvəlinə əlavə edilir...');

                // URL-i qur - ƏN VACİB HİSSƏ!
                let addUrl = `${this.baseUrl}/company-files/add?file_uuid=${fileUuid}&company_code=${companyCode}`;

                // Folder ID varsa, URL-ə əlavə et!
                if (folderId && folderId !== 'null' && folderId !== 'undefined' && folderId !== '') {
                    addUrl += `&folder_id=${folderId}`;
                    console.log('📂 FOLDER_ID URL-Ə ƏLAVƏ EDİLDİ:', folderId);
                }

                console.log('📡 company_files URL:', addUrl);

                const addResponse = await fetch(addUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                });

                if (addResponse.ok) {
                    const addResult = await addResponse.json();
                    console.log('✅ Fayl company_files cədvəlinə əlavə edildi:', addResult);
                } else {
                    const addError = await addResponse.text();
                    console.error('❌ company_files əlavəsi xətası:', addError);
                }
            } catch (e) {
                console.error('❌ company_files əlavəsi xətası:', e);
            }

            // ========== 6. UI YENİLƏMƏ ==========
            if (window.filesUI) {
                console.log('🔄 UI yenilənir...');

                setTimeout(() => {
                    if (window.filesUI.selectedCompany) {
                        console.log('🔄 Company files yenilənir:', window.filesUI.selectedCompany.code);
                        window.filesUI.loadCompanyFiles(window.filesUI.selectedCompany);
                    }
                }, 2000);
            }

            console.log('='.repeat(60));
            console.log('✅ ŞİRKƏT FAYLI UĞURLA YÜKLƏNDİ');
            console.log(`📊 Fayl ölçüsü: ${fileSizeMB} MB`);
            console.log('='.repeat(60));

            return {
                success: true,
                fileUuid: fileUuid,
                data: result,
                size: file.size,
                sizeMB: fileSizeMB
            };

        } catch (error) {
            console.error('❌ Şirkət faylı yükləmə xətası:', error);

            if (window.filesUI?.showNotification) {
                window.filesUI.showNotification('Fayl yüklənə bilmədi: ' + error.message, 'error');
            }

            return {
                success: false,
                error: error.message
            };
        }
    }
    /**
     * Error notification göstər (əgər filesUI yoxdursa)
     */
    _showErrorNotification(message) {
        // Köhnə notificationu sil
        const oldNotif = document.getElementById('file-size-error-notification');
        if (oldNotif) oldNotif.remove();

        // Yeni notification yarat
        const notification = document.createElement('div');
        notification.id = 'file-size-error-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ef4444;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 99999;
            font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 10px;
            max-width: 400px;
            animation: slideInRight 0.3s ease;
        `;

        notification.innerHTML = `
            <i class="fa-solid fa-circle-exclamation" style="font-size: 18px;"></i>
            <div style="flex: 1;">${message}</div>
            <button onclick="this.parentElement.remove()" style="background: none; border: none; color: white; cursor: pointer; font-size: 16px; opacity: 0.8;">&times;</button>
        `;

        document.body.appendChild(notification);

        // 4 saniyə sonra sil
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }
        }, 4000);

        // CSS əlavə et (əgər yoxdursa)
        if (!document.getElementById('file-service-notification-styles')) {
            const style = document.createElement('style');
            style.id = 'file-service-notification-styles';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOutRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }



    // ==================== KÖMƏKÇİ METODLAR ====================

    formatFiles(files) {
        if (!Array.isArray(files)) return [];

        return files.map(f => {
            const fileName = f.original_filename || f.name || f.filename || 'adsız fayl';
            const fileExt = f.file_extension || fileName.split('.').pop() || 'unknown';

            return {
                id: f.uuid || f.id,
                uuid: f.uuid || f.id,
                name: fileName,
                original_filename: fileName,
                filename: fileName,
                type: fileExt,
                file_extension: fileExt,
                category: f.category || 'other',
                size: f.file_size || f.size || 0,
                file_size: f.file_size || f.size || 0,
                folder_id: f.folder_id || f.parent_id || null,
                parent_id: f.parent_id || null,
                modified: f.updated_at || f.created_at,
                created_at: f.created_at,
                icon: this.getFileIcon(fileName),
                color: this.getFileColor(fileName),
                url: f.storage_url || f.url || ''
            };
        });
    }

    getFileIcon(file) {
        if (!file) return 'fa-file';
        const ext = typeof file === 'string' ? file.split('.').pop() :
                   (file.file_extension || this.getFileExtension(file.name || ''));

        const icons = {
            pdf: 'fa-file-pdf',
            doc: 'fa-file-word', docx: 'fa-file-word',
            xls: 'fa-file-excel', xlsx: 'fa-file-excel',
            ppt: 'fa-file-powerpoint', pptx: 'fa-file-powerpoint',
            jpg: 'fa-file-image', jpeg: 'fa-file-image', png: 'fa-file-image',
            gif: 'fa-file-image', svg: 'fa-file-image', webp: 'fa-file-image',
            mp4: 'fa-file-video', avi: 'fa-file-video', mov: 'fa-file-video', mkv: 'fa-file-video',
            mp3: 'fa-file-audio', wav: 'fa-file-audio',
            zip: 'fa-file-zipper', rar: 'fa-file-zipper', '7z': 'fa-file-zipper',
            txt: 'fa-file-lines',
            json: 'fa-file-code', xml: 'fa-file-code', html: 'fa-file-code',
            css: 'fa-file-code', js: 'fa-file-code'
        };
        return icons[ext?.toLowerCase()] || 'fa-file';
    }

    isImage(file) {
        if (!file) return false;
        const ext = file.file_extension || this.getFileExtension(file.name || '');
        const imgTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'];
        return imgTypes.includes(ext?.toLowerCase());
    }

    getFileExtension(filename) {
        if (!filename) return '';
        const parts = filename.split('.');
        return parts.length > 1 ? parts.pop().toLowerCase() : '';
    }

    formatFileSize(bytes) {
        if (!bytes || bytes === 0 || isNaN(bytes)) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i];
    }

    formatDate(dateString) {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '-';
            return date.toLocaleDateString('az-AZ', {
                day: '2-digit', month: '2-digit', year: 'numeric'
            });
        } catch {
            return '-';
        }
    }

    getFileColor(file) {
        let filename = '';
        if (typeof file === 'string') filename = file;
        else if (file && typeof file === 'object') filename = file.name || file.original_filename || '';

        const ext = filename.split('.').pop()?.toLowerCase() || '';
        const colors = {
            pdf: '#dc2626', doc: '#0284c7', docx: '#0284c7',
            xls: '#16a34a', xlsx: '#16a34a',
            jpg: '#9333ea', jpeg: '#9333ea', png: '#9333ea',
            mp4: '#7c3aed', zip: '#f59e0b', rar: '#f59e0b',
            txt: '#64748b', js: '#f7df1e', html: '#ea580c',
            css: '#2563eb', json: '#059669', default: '#64748b'
        };
        return colors[ext] || colors.default;
    }

    getCurrentUserId() {
        try {
            const userData = localStorage.getItem('userData');
            if (userData) {
                const parsed = JSON.parse(userData);
                return parsed.user?.id || parsed.id;
            }
            if (window.profileApp?.currentUserId) return window.profileApp.currentUserId;
            if (window.app?.currentUserId) return window.app.currentUserId;
        } catch (e) {
            console.error('User ID alma xətası:', e);
        }
        return 134;
    }


    // file_service/file.service.js - getCurrentUserUUID metodu (DÜZGÜN VERSİYA)

    getCurrentUserUUID() {
        try {
            // Əvvəlcə localStorage-dən bax
            const userData = localStorage.getItem('userData');
            if (userData) {
                const parsed = JSON.parse(userData);
                // users cədvəlindəki uuid (d152b378-... formatında)
                const uuid = parsed.user?.uuid || parsed.uuid;
                if (uuid && uuid.includes('-') && uuid.length > 30) {
                    console.log('✅ UUID localStorage-dən tapıldı:', uuid);
                    return uuid;
                }
            }

            // Token-dən user ID-ni götür (71)
            const userId = this.getCurrentUserId();
            console.log('⚠️ UUID tapılmadı, ID istifadə olunur:', userId);
            return userId;  // UUID yoxdursa, ID qaytar

        } catch (e) {
            console.error('UUID alma xətası:', e);
            return this.getCurrentUserId();
        }
    }

    // API-dən UUID yüklə
    async fetchUserUUID(userId) {
        try {
            const token = localStorage.getItem('guven_token');

            console.log('📡 API-dən UUID yüklənir, userId:', userId);

            const response = await fetch(`https://guvenfinans.az/proxy.php/api/v1/users/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (response.ok) {
                const userData = await response.json();
                console.log('📦 API cavabı:', userData);

                // UUID-ni tap
                const uuid = userData.uuid || userData.data?.uuid;

                if (uuid) {
                    console.log('✅ UUID API-dən tapıldı:', uuid);

                    // UUID-ni localStorage-ə yadda saxla
                    this.saveUserData(userId, uuid);

                    // Səhifəni yeniləmədən cache-i təmizlə və yenidən yüklə
                    this._cache.lastRefresh = 0;
                    this.loadFiles(uuid, this.currentFolder);

                    return uuid;
                }
            }
        } catch (e) {
            console.error('❌ UUID yükləmə xətası:', e);
        }
        return null;
    }

    // User məlumatlarını yadda saxla
    saveUserData(userId, uuid) {
        try {
            const userData = {
                id: userId,
                uuid: uuid,
                user: {
                    id: userId,
                    uuid: uuid
                }
            };
            localStorage.setItem('userData', JSON.stringify(userData));
            console.log('💾 User məlumatları yadda saxlanıldı:', userData);
        } catch (e) {
            console.warn('User data save xətası:', e);
        }
    }

    getFileUrl(file) {
        if (file.url) return file.url;
        if (file.storage_url) return file.storage_url;
        if (file.id || file.uuid) {
            const id = file.uuid || file.id;
            return `${this.baseUrl}/files/${id}`;
        }
        return '#';
    }

    async downloadFile(file) {
        try {
            const fileId = file.uuid || file.id;
            if (!fileId) throw new Error('File ID tapılmadı');

            console.log(`📥 Fayl yüklənir: ${file.name} (${fileId})`);

            const token = localStorage.getItem('guven_token');
            if (!token) throw new Error('Token tapılmadı');

            const downloadUrl = `${this.baseUrl}/files/${fileId}/download`;

            const response = await fetch(downloadUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': '*/*'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const blob = await response.blob();
            if (blob.size === 0) throw new Error('Boş fayl');

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.name || 'download';
            document.body.appendChild(a);
            a.click();

            setTimeout(() => {
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }, 100);

            return true;

        } catch (error) {
            console.error('❌ Download xətası:', error);

            const fileId = file.uuid || file.id;
            const token = localStorage.getItem('guven_token');
            window.open(`${this.baseUrl}/files/${fileId}/download?token=${encodeURIComponent(token)}`, '_blank');

            throw error;
        }
    }
}

// Global instance
window.FileService = FileService;

// Auto-initialize
if (!window.fileService) {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            window.fileService = new FileService();
            console.log('✅ FileService global olaraq yaradıldı');
        }, 1000);
    });
}