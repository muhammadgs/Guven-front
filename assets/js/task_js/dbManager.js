// dbManager.js - User-specific IndexedDB
class DatabaseManager {
    constructor() {
        this.dbName = 'TaskManagerDB';
        this.dbVersion = 3; // ⬆️ Version artır
        this.db = null;
        this.currentCompanyId = null;
        this.currentUserId = null;

        this.stores = {
            tasks: 'tasks',
            partners: 'partners',
            externalTasks: 'externalTasks',
            archiveTasks: 'archiveTasks',
            cacheInfo: 'cacheInfo'
        };
    }

    // ✅ YENİ: Current user təyin et
    setCurrentUser(companyId, userId) {
        this.currentCompanyId = companyId;
        this.currentUserId = userId;
        console.log(`👤 Cache user-specific mode: company=${companyId}, user=${userId}`);
    }

    // ✅ YENİ: User-specific açar yarat
    getCacheKey(type) {
        if (!this.currentCompanyId) {
            this.loadCurrentUserFromStorage();
        }
        return `${type}_company_${this.currentCompanyId}_user_${this.currentUserId}`;
    }

    async open() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('❌ IndexedDB açılmadı:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('✅ IndexedDB açıldı');
                this.loadCurrentUserFromStorage();
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                console.log('🔄 IndexedDB upgrade edilir...');

                // Tasks store - user-specific
                if (!db.objectStoreNames.contains(this.stores.tasks)) {
                    const taskStore = db.createObjectStore(this.stores.tasks, {keyPath: 'cacheKey'});
                    taskStore.createIndex('user_id', 'user_id', {unique: false});
                    taskStore.createIndex('company_id', 'company_id', {unique: false});
                    taskStore.createIndex('status', 'status', {unique: false});
                }

                // Partners store
                if (!db.objectStoreNames.contains(this.stores.partners)) {
                    const partnerStore = db.createObjectStore(this.stores.partners, {keyPath: 'cacheKey'});
                    partnerStore.createIndex('company_id', 'company_id', {unique: false});
                }

                // External tasks store
                if (!db.objectStoreNames.contains(this.stores.externalTasks)) {
                    const externalStore = db.createObjectStore(this.stores.externalTasks, {keyPath: 'cacheKey'});
                    externalStore.createIndex('target_company_id', 'target_company_id', {unique: false});
                }

                // Archive tasks store
                if (!db.objectStoreNames.contains(this.stores.archiveTasks)) {
                    const archiveStore = db.createObjectStore(this.stores.archiveTasks, {keyPath: 'cacheKey'});
                    archiveStore.createIndex('completed_date', 'completed_date', {unique: false});
                }

                // Cache info store - user-specific
                if (!db.objectStoreNames.contains(this.stores.cacheInfo)) {
                    const cacheInfoStore = db.createObjectStore(this.stores.cacheInfo, {keyPath: 'cacheKey'});
                    cacheInfoStore.createIndex('user_id', 'user_id', {unique: false});
                    cacheInfoStore.createIndex('lastUpdated', 'lastUpdated', {unique: false});
                }
            };
        });
    }

    loadCurrentUserFromStorage() {
        try {
            const token = this.getAuthToken();
            if (token) {
                const payload = this.parseJwt(token);
                if (payload) {
                    this.currentCompanyId = payload.company_id;
                    this.currentUserId = payload.user_id || payload.sub;
                    console.log(`🔑 Token-dan: company=${this.currentCompanyId}, user=${this.currentUserId}`);
                    return;
                }
            }

            if (window.taskManager?.userData) {
                this.currentCompanyId = window.taskManager.userData.companyId;
                this.currentUserId = window.taskManager.userData.userId;
                console.log(`📦 taskManager-dan: company=${this.currentCompanyId}, user=${this.currentUserId}`);
                return;
            }

            const stored = localStorage.getItem('guven_user_data');
            if (stored) {
                const parsed = JSON.parse(stored);
                this.currentCompanyId = parsed.company_id;
                this.currentUserId = parsed.user_id;
            }
        } catch (error) {
            console.error('❌ User məlumatları xətası:', error);
        }
    }

    parseJwt(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch (e) {
            return null;
        }
    }

    getAuthToken() {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'access_token' || name === 'guven_token') {
                return value;
            }
        }
        return localStorage.getItem('access_token') || localStorage.getItem('guven_token');
    }

    async saveData(storeName, data, type = 'tasks') {
        if (!this.db) await this.open();
        if (!this.currentCompanyId) this.loadCurrentUserFromStorage();

        const cacheKey = this.getCacheKey(type);

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);

            const itemsToSave = Array.isArray(data) ? data : [data];

            itemsToSave.forEach(item => {
                const saveItem = {
                    ...item,
                    cacheKey: cacheKey,
                    user_id: this.currentUserId,
                    company_id: this.currentCompanyId,
                    saved_at: Date.now()
                };

                if (saveItem.id || saveItem.task_id) {
                    saveItem.id = saveItem.id || saveItem.task_id;
                }

                store.put(saveItem);
            });

            const cacheInfoStore = this.db.transaction([this.stores.cacheInfo], 'readwrite')
                .objectStore(this.stores.cacheInfo);

            cacheInfoStore.put({
                cacheKey: cacheKey,
                type: type,
                user_id: this.currentUserId,
                company_id: this.currentCompanyId,
                lastUpdated: Date.now(),
                count: itemsToSave.length
            });

            transaction.oncomplete = () => {
                console.log(`💾 ${storeName} store-a ${itemsToSave.length} məlumat yadda saxlanıldı (user: ${this.currentUserId})`);
                resolve();
            };

            transaction.onerror = () => reject(transaction.error);
        });
    }

    async isCacheValid(type, maxAgeMinutes = 5) {
        if (!this.db) await this.open();
        if (!this.currentCompanyId) this.loadCurrentUserFromStorage();

        const cacheKey = this.getCacheKey(type);

        return new Promise((resolve) => {
            const transaction = this.db.transaction([this.stores.cacheInfo], 'readonly');
            const store = transaction.objectStore(this.stores.cacheInfo);
            const request = store.get(cacheKey);

            request.onsuccess = () => {
                const cacheInfo = request.result;
                if (!cacheInfo) {
                    resolve(false);
                    return;
                }

                // Yalnız cari user-ə aid cache-ləri yoxla
                if (cacheInfo.user_id !== this.currentUserId) {
                    console.log(`⚠️ Cache başqa user-ə aid: ${cacheInfo.user_id} !== ${this.currentUserId}`);
                    resolve(false);
                    return;
                }

                const now = Date.now();
                const age = (now - cacheInfo.lastUpdated) / (1000 * 60);
                resolve(age < maxAgeMinutes);
            };

            request.onerror = () => resolve(false);
        });
    }

    async clearCache(storeName = null) {
        if (!this.db) await this.open();
        if (!this.currentCompanyId) this.loadCurrentUserFromStorage();

        if (storeName) {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const index = store.index('user_id');
            const request = index.getAll(this.currentUserId);

            request.onsuccess = () => {
                request.result.forEach(item => {
                    store.delete(item.cacheKey);
                });
                console.log(`🗑️ ${storeName} cache-i təmizləndi (user: ${this.currentUserId})`);
            };
        } else {
            for (const storeName of Object.values(this.stores)) {
                if (storeName === this.stores.cacheInfo) continue;

                const transaction = this.db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const index = store.index('user_id');
                const request = index.getAll(this.currentUserId);

                request.onsuccess = () => {
                    request.result.forEach(item => {
                        store.delete(item.cacheKey);
                    });
                };
            }

            const cacheInfoTransaction = this.db.transaction([this.stores.cacheInfo], 'readwrite');
            const cacheInfoStore = cacheInfoTransaction.objectStore(this.stores.cacheInfo);
            const cacheKey = this.getCacheKey('all');
            cacheInfoStore.delete(cacheKey);

            console.log(`🗑️ Bütün cache-lər təmizləndi (user: ${this.currentUserId})`);
        }
    }
}