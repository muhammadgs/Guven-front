// ===========================================
// PROFİL ŞƏKLİ - CSS FIX İLƏ
// ===========================================
(function() {
    console.log('🚀 Profil şəkli yükləyici başladı');

    let attempts = 0;
    const maxAttempts = 20;

    const interval = setInterval(async function() {
        attempts++;

        const container = document.querySelector('#profileImageUpload');
        if (!container) {
            if (attempts >= maxAttempts) clearInterval(interval);
            return;
        }

        const token = localStorage.getItem('guven_token');
        if (!token) {
            if (attempts >= maxAttempts) clearInterval(interval);
            return;
        }

        let userId = null;
        try {
            const userData = localStorage.getItem('userData');
            if (userData) {
                const parsed = JSON.parse(userData);
                userId = parsed.user?.id || parsed.id;
            }
        } catch (e) {}

        if (!userId) {
            if (attempts >= maxAttempts) clearInterval(interval);
            return;
        }

        clearInterval(interval);
        console.log('✅ Container, token və user_service ID tapıldı');

        try {
            const response = await fetch(`https://guvenfinans.az/proxy.php/api/v1/users/${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                console.log('❌ API xətası:', response.status);
                return;
            }

            const userData = await response.json();
            const imageUrl = userData.profile_image_url;

            if (!imageUrl) {
                console.log('❌ profile_image_url tapılmadı');

                // Default şəkil
                container.innerHTML = `
                    <div class="flex flex-col items-center justify-center">
                        <div class="w-20 h-20 rounded-full bg-brand-soft flex items-center justify-center text-brand-blue">
                            <i class="fa-solid fa-user text-3xl"></i>
                        </div>
                        <p class="text-sm text-slate-500 mt-2">Şəkli yükləmək üçün klik edin</p>
                    </div>
                `;
                return;
            }

            let fullUrl = imageUrl;
            if (!imageUrl.startsWith('http')) {
                if (imageUrl.startsWith('/')) {
                    fullUrl = `https://guvenfinans.az/proxy.php${imageUrl}`;
                } else {
                    fullUrl = `https://guvenfinans.az/proxy.php/${imageUrl}`;
                }
            }

            console.log('✅ Şəkil URL:', fullUrl);

            // Container-in bütün class-larını təmizlə və şəkli göstər
            container.className = 'relative rounded-2xl border-2 border-dashed border-slate-200 min-h-[200px] flex flex-col items-center justify-center cursor-pointer hover:border-brand-blue transition group';

            container.innerHTML = `
                <div class="flex flex-col items-center justify-center w-full h-full p-4">
                    <img src="${fullUrl}" 
                         alt="Profil şəkli" 
                         class="w-32 h-32 rounded-full object-cover border-4 border-brand-blue shadow-lg"
                         onload="console.log('✅ Şəkil yükləndi', this.naturalWidth, this.naturalHeight)"
                         onerror="this.onerror=null; console.log('❌ Şəkil yüklənmədi'); this.parentElement.innerHTML='<div class=\\'flex flex-col items-center justify-center\\'><div class=\\'w-20 h-20 rounded-full bg-brand-soft flex items-center justify-center text-brand-blue\\'><i class=\\'fa-solid fa-user_service text-3xl\\'></i></div><p class=\\'text-sm text-slate-500 mt-2\\'>Şəkli yükləmək üçün klik edin</p></div>'">
                    <p class="text-sm text-slate-500 mt-2">Şəkli dəyişmək üçün klik edin</p>
                </div>
            `;

            localStorage.setItem('profileImage', fullUrl);

            // Click event-i əlavə et
            const fileInput = document.getElementById('profileImageInput');
            if (fileInput) {
                container.onclick = () => fileInput.click();
            }

            console.log('✅ Profil şəkli göstərildi');

        } catch (error) {
            console.error('❌ Xəta:', error);
        }

    }, 500);
})();

/**
 * Main Application File
 */

class ProfileApp {
    constructor() {
        console.log('🚀 Profil tətbiqi başladılır...');
        this.isAppReady = false;

        // Servisləri yarat
        this.api = new ApiService();
        this.auth = new AuthService(this.api);
        this.ui = new UIService();  // ✅ ƏVVƏLCƏ UI yarat

        // ✅ DÜZƏLİŞ: ProfileService-ə ui parametrini göndər
        this.profile = new ProfileService(this.api, this.auth, this.ui);

        // ✅ ƏLAVƏ TƏMİNAT: setUI metodu ilə də təyin et
        if (this.profile.setUI) {
            this.profile.setUI(this.ui);
        }

        // Qalan servislər
        this.employeesService = new EmployeesService(this.api);
        this.partnersSection = new PartnersService(this.api);
        this.companiesService = new CompaniesService(this.api);
        this.permissionsService = new PermissionsService(this.api);
        this.obligationsService = new ObligationsService(this.api);
        this.positionsService = new PositionsService(this.api);
        this.fileService = {
            // Boş service - heç nə etmir
            files: [],
            loadFiles: () => Promise.resolve([]),
            getUserFiles: () => Promise.resolve({ success: true, files: [] }),
            init: () => {},
            showNotification: () => {}
        };

        // ✅ PARTNERS SERVİSİ - Mütləq yarat
        if (!this.partnersService) {
            console.log('🆕 PartnersService yaradılır...');
            this.partnersService = new PartnersService();
            window.partnersService = this.partnersService; // Global saxla
        }

        // ✅ PERMISSIONS SERVİSİ - Mütləq yarat
        if (!this.permissionsService) {
            console.log('🆕 PermissionsService yaradılır...');
            this.permissionsService = new PermissionsService(this.api);
            window.permissionsService = this.permissionsService; // Global saxla
        }


        // App state
        this.currentCompanyCode = null;
        this.currentCompanyId = null;
        this.currentUserId = null;

        // Başlat
        this.init();
    }

    async init() {
        try {
            // 1. Auth yoxla
            const isAuthenticated = await this.auth.checkAuthStatus();
            if (!isAuthenticated) {
                console.log('🔴 Auth uğursuz - ApiService artıq yönləndirəcək');
                return;
            }

            console.log('✅ Authentication uğurlu');

            // 2. Current user_service məlumatlarını yüklə
            await this.loadCurrentUserData();


            this.updateHeaderFromProfile();

            // 4. Profil məlumatlarını yüklə (formu doldur)
            console.log('🎯 Profil məlumatları yüklənir...');
            await this.loadProfileAndUpdateHeader();

            // 5. Event listeners qur
            this.setupEventListeners();

            // 6. Şirkət məlumatlarını yüklə
            await this.loadCompanyData();

            // 7. Modal listener-larını qur
            this.setupModalListeners();

            // ASAN İmza Modalını başlat
            if (this.profile && typeof this.profile.initAsanImzaModal === 'function') {
                this.profile.initAsanImzaModal();
                console.log('✅ ASAN İmza Modal başladıldı');
            }

            this.setupFayllarimButton();

            this.setupTaskManagerButton();

            // 8. Modul event listener-larını qur
            this.bindModuleButtons();

            // 9. App hazırdır
            this.isInitialized = true;
            this.isAppReady = true; // ✅ ƏLAVƏ EDİLDİ
            this.ui.showNotification('Səhifə hazırdır', 'success');
            console.log('✅ Profil tətbiqi hazırdır!');

            // Loader-ə xəbər ver - ✅ ƏLAVƏ EDİLDİ
            window.dispatchEvent(new CustomEvent('appReady'));

        } catch (error) {
            console.error('❌ Başlatma xətası:', error);
        }
    }

    /**
     * SADƏ VƏ İŞLƏK HƏLL - Header-i yenilə
     */
    updateHeaderFromProfile() {
        console.log('🔍 Header yenilənir...');

        // Elementləri ID ilə tap
        const companyEl = document.getElementById('companyNameDisplay');
        const userEl = document.getElementById('userNameDisplay');

        if (!companyEl || !userEl) {
            console.log('❌ Header elementləri tapılmadı');
            return;
        }

        // Profil məlumatlarını yüklə
        this.profile.loadProfile().then(profileData => {
            console.log('📥 Profil məlumatları:', profileData);

            // 1. Şirkət adı
            if (profileData.company_name) {
                companyEl.textContent = profileData.company_name;
                console.log('🏢 Şirkət adı:', profileData.company_name);
            }

            // 2. İstifadəçi adı - Ad + Soyad birləşdir
            let fullName = '';
            if (profileData.firstName || profileData.lastName) {
                fullName = `${profileData.firstName || ''} ${profileData.lastName || ''}`.trim();
            }

            if (fullName) {
                userEl.textContent = fullName;
                console.log('👤 İstifadəçi adı:', fullName);
            }

            // 3. Avatar (əgər varsa)
            if (profileData.originalData?.profile_image_url) {
                this.updateAvatarSimple(profileData.originalData.profile_image_url);
            }

        }).catch(error => {
            console.error('❌ Profil yüklənərkən xəta:', error);

            // Xəta olarsa, localStorage-dən cəhd et
            const savedUser = localStorage.getItem('userData');
            if (savedUser) {
                try {
                    const parsed = JSON.parse(savedUser);
                    const user = parsed.user || parsed;

                    if (user.company_name) {
                        companyEl.textContent = user.company_name;
                    }

                    let name = '';
                    if (user.ceo_name && user.ceo_lastname) {
                        name = `${user.ceo_name} ${user.ceo_lastname}`;
                    } else if (user.first_name && user.last_name) {
                        name = `${user.first_name} ${user.last_name}`;
                    }

                    if (name) {
                        userEl.textContent = name;
                    }

                    console.log('✅ Header localStorage-dən yeniləndi');
                } catch (e) {
                    console.error('❌ localStorage xətası:', e);
                }
            }
        });
    }

    /**
     * Optimallaşdırılmış header yeniləmə funksiyası
     */
    async loadProfileAndUpdateHeader() {
        try {
            console.log('🎯 Profil və header eyni anda yüklənir...');

            // 1. Profil məlumatlarını yüklə
            const profileData = await this.profile.loadProfile();
            console.log('📥 Profile data:', profileData);

            // 2. Header-i yenilə
            this.updateHeaderWithProfileData(profileData);

            // 3. Formu doldur
            if (this.ui && this.ui.populateForm) {
                this.ui.populateForm(profileData);
            }

            console.log('✅ Profil və header uğurla yeniləndi');
        } catch (error) {
            console.error('❌ Profil yükləmə xətası:', error);
        }
    }

    /**
     * Header-i profildən gələn məlumatlarla yenilə
     */
    updateHeaderWithProfileData(profileData) {
        if (!profileData) return;

        let userName;
        let companyName ;

        // 1. ƏVVƏLCƏ localStorage-dan şirkət adını yoxla
        const savedData = localStorage.getItem('userData');
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                if (parsed.user && parsed.user.company_name) {
                    companyName = parsed.user.company_name;
                    console.log('🏢 Şirkət adı localStorage-dan:', companyName);
                }
            } catch (e) {
                console.error('❌ localStorage parse error:', e);
            }
        }

        // 2. Əgər hələ "Güvən Finans"dırsa, profildən yoxla
        if (companyName === 'Güvən Finans' && profileData.company_name) {
            companyName = profileData.company_name;
            console.log('🏢 Şirkət adı profildən:', companyName);
        }

        // 3. İstifadəçi adı
        if (profileData.ceo_name && profileData.ceo_lastname) {
            userName = `${profileData.ceo_name} ${profileData.ceo_lastname}`;
        } else if (profileData.firstName && profileData.lastName) {
            userName = `${profileData.firstName} ${profileData.lastName}`;
        }

        console.log('📝 Final header update:', {
            userName,
            companyName,
            hasCompanyInProfile: !!profileData.company_name
        });

        // 4. Header-i yenilə
        this.updateHeaderElements(companyName, userName);
    }

    async loadCurrentUserData() {
        try {
            const userResponse = await this.api.getCurrentUser();
            if (userResponse && userResponse.success && userResponse.user) {
                this.currentUserId = userResponse.user.id;

                // ✅ ƏSAS DÜZƏLİŞ: company_code formatını təmin et
                if (userResponse.user.company_code) {
                    this.currentCompanyCode = userResponse.user.company_code;
                } else if (userResponse.user.companyCode) {
                    this.currentCompanyCode = userResponse.user.companyCode;
                } else {
                    console.warn('⚠️ User object-də company_code tapılmadı');
                }

                // ✅ ƏSAS DÜZƏLİŞ: company_id formatını təmin et
                if (userResponse.user.company_id) {
                    this.currentCompanyId = parseInt(userResponse.user.company_id);
                } else {
                    // Əgər user_service object-də company_id yoxdursa, API-dən gətir
                    await this.fetchCompanyIdFromCode();
                }

                // ✅ ƏSAS DÜZƏLİŞ: window.app.user_service-i set et
                window.app = window.app || this;
                window.app.user = {
                    id: this.currentUserId,
                    company_code: this.currentCompanyCode,
                    company_id: this.currentCompanyId,
                    ...userResponse.user
                };

                // ✅ ƏSAS DÜZƏLİŞ: localStorage-də düzgün formatda saxla
                const userDataToStore = {
                    success: true,
                    user: {
                        id: this.currentUserId,
                        company_code: this.currentCompanyCode,
                        company_id: this.currentCompanyId,
                        companyCode: this.currentCompanyCode, // ikinci format
                        ...userResponse.user
                    },
                    message: 'User data loaded'
                };

                localStorage.setItem('userData', JSON.stringify(userDataToStore));

                console.log('👤 User loaded:', {
                    id: this.currentUserId,
                    companyCode: this.currentCompanyCode,
                    companyId: this.currentCompanyId
                });

                console.log('💾 User data saved to localStorage:', this.currentCompanyCode);
            } else {
                console.warn('⚠️ User response formatı düzgün deyil:', userResponse);
            }
        } catch (error) {
            console.error('❌ User data load error:', error);

        }
    }



    /**
     * Header elementlərini tap və dəyiş
     */
    updateHeaderElements(companyName, userName) {
        try {
            console.log('🔍 Header elementləri axtarılır...');

            // 1. Header-dakı user_service info div-i tap
            const userInfoDiv = document.querySelector('.flex.items-center.gap-3.rounded-2xl.bg-white.px-4.py-2.shadow-soft');

            if (userInfoDiv) {
                console.log('✅ User info div tapıldı');

                // Div içindəki p elementlərini tap
                const pElements = userInfoDiv.querySelectorAll('p');

                // Şirkət adı (ilk p elementi)
                if (pElements[0]) {
                    console.log(`Şirkət adı dəyişdirilir: "${pElements[0].textContent}" → "${companyName}"`);
                    pElements[0].textContent = companyName;
                }

                // User adı (ikinci p elementi)
                if (pElements[1]) {
                    console.log(`User adı dəyişdirilir: "${pElements[1].textContent}" → "${userName}"`);
                    pElements[1].textContent = userName;
                }

                console.log('✅ Header uğurla dəyişdirildi');
                return;
            }

            console.log('❌ User info div tapılmadı, alternativ axtarış...');

            // 2. Əgər div tapılmadısa, bütün p elementlərində axtar
            document.querySelectorAll('p').forEach((p, index) => {
                const text = p.textContent.trim();

                // "Sahibkar" yazanı tap
                if (text === 'Sahibkar') {
                    console.log(`✅ "Sahibkar" tapıldı və dəyişdirilir (element ${index})`);
                    p.textContent = userName;
                }

                // "Güvən Finans" yazanı tap
                if (text === 'Güvən Finans') {
                    console.log(`✅ "Güvən Finans" tapıldı və dəyişdirilir (element ${index})`);
                    p.textContent = companyName;
                }
            });

        } catch (error) {
            console.error('❌ Header elements update xətası:', error);
        }
    }


    async fetchCompanyIdFromCode() {
        try {
            if (!this.currentCompanyCode) return;

            console.log(`🔍 Şirkət ID gətirilir: ${this.currentCompanyCode}`);

            const response = await this.api.get(`/companies/code/${this.currentCompanyCode}`);

            if (response && response.id) {
                this.currentCompanyId = response.id;
                console.log(`✅ Şirkət ID tapıldı: ${this.currentCompanyId}`);
            }
        } catch (error) {
            console.error('❌ Şirkət ID gətirmə xətası:', error);
            // Default dəyər
            this.currentCompanyId = 1;
        }
    }


    async loadCompanyData() {
        try {
            if (!this.currentCompanyCode) {
                console.warn('⚠️ Şirkət kodu yoxdur');
                return;
            }

            console.log('🏢 Şirkət məlumatları yüklənir...');

            const companyData = await this.companiesService.loadCompanyData(this.currentCompanyCode);
        } catch (error) {

        }
    }

    setupEventListeners() {
        console.log('🔧 Event listeners qurulur...');

        // ==================== GİRİŞ (DASHBOARD) DÜYMƏSİ ====================
        const dashboardBtn = document.getElementById('dashboardBtn');
        if (dashboardBtn) {
            console.log('✅ Giriş düyməsi tapıldı');

            // Köhnə event listener-ları sil
            const newDashboardBtn = dashboardBtn.cloneNode(true);
            dashboardBtn.parentNode.replaceChild(newDashboardBtn, dashboardBtn);

            newDashboardBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('📊 Giriş düyməsinə klik edildi');

                // BÜTÜN BÖLMƏLƏRİ TƏMİZLƏ
                if (typeof this.clearAllSections === 'function') {
                    this.clearAllSections();
                }

                // DASHBOARD BÖLMƏSİNİ GÖSTƏR
                const dashboardSection = document.getElementById('dashboardSection');
                if (dashboardSection) {
                    dashboardSection.style.display = 'block';
                }

                // PROFİL BÖLMƏSİNİ GİZLƏT
                const profileSection = document.getElementById('profileSection');
                if (profileSection) {
                    profileSection.style.display = 'none';
                }

                // AKTİV MENYU STİLİNİ YENİLƏ
                document.querySelectorAll('nav a').forEach(a => {
                    a.classList.remove('bg-brand-soft', 'text-brand-blue');
                });
                newDashboardBtn.classList.add('bg-brand-soft', 'text-brand-blue');

                // SİDEBAR-I DARALT
                const sidebar = document.getElementById('mainSidebar');
                if (sidebar) sidebar.classList.add('sidebar-collapsed');
            });

            console.log('✅ Giriş düyməsi bağlandı');
        }

        // ==================== TELEGRAM TƏSDİQLƏMƏ ====================
        const verifyTelegramBtn = document.getElementById('verifyTelegram');
        if (verifyTelegramBtn) {
            const newVerifyBtn = verifyTelegramBtn.cloneNode(true);
            verifyTelegramBtn.parentNode.replaceChild(newVerifyBtn, verifyTelegramBtn);

            newVerifyBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();

                console.log('✅ Telegram təsdiqləmə buttonuna klik');

                if (!this.profile) {
                    console.error('❌ profileService tapılmadı');
                    return;
                }

                // Loading state
                const originalHtml = newVerifyBtn.innerHTML;
                newVerifyBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
                newVerifyBtn.disabled = true;

                try {
                    await this.profile.verifyTelegram();
                } catch (error) {
                    console.error('❌ Xəta:', error);
                } finally {
                    newVerifyBtn.innerHTML = originalHtml;
                    newVerifyBtn.disabled = false;
                }
            });
        }

        // ==================== PROFİL DÜYMƏSİ ====================
        const profileBtn = document.getElementById('profileBtn');
        if (profileBtn) {
            console.log('✅ Profil düyməsi tapıldı');

            // Köhnə event listener-ları sil
            const newProfileBtn = profileBtn.cloneNode(true);
            profileBtn.parentNode.replaceChild(newProfileBtn, profileBtn);

            newProfileBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('👤 Profil düyməsinə klik edildi');

                // BÜTÜN BÖLMƏLƏRİ TƏMİZLƏ
                if (typeof this.clearAllSections === 'function') {
                    this.clearAllSections();
                }

                // PROFİL BÖLMƏSİNİ GÖSTƏR
                const profileSection = document.getElementById('profileSection');
                if (profileSection) {
                    profileSection.style.display = 'block';
                }

                // DASHBOARD BÖLMƏSİNİ GİZLƏT
                const dashboardSection = document.getElementById('dashboardSection');
                if (dashboardSection) {
                    dashboardSection.style.display = 'none';
                }

                // AKTİV MENYU STİLİNİ YENİLƏ
                document.querySelectorAll('nav a').forEach(a => {
                    a.classList.remove('bg-brand-soft', 'text-brand-blue');
                });
                newProfileBtn.classList.add('bg-brand-soft', 'text-brand-blue');

                // SİDEBAR-I GENİŞLƏT
                const sidebar = document.getElementById('mainSidebar');
                if (sidebar) sidebar.classList.remove('sidebar-collapsed');
            });

            console.log('✅ Profil düyməsi bağlandı');
        }

        // ==================== SETTINGS MENU ====================
        const settingsToggle = document.getElementById('settingsToggle');
        const settingsMenu = document.getElementById('settingsMenu');

        if (settingsToggle && settingsMenu) {
            console.log('✅ Settings toggle tapıldı');

            const newSettingsToggle = settingsToggle.cloneNode(true);
            settingsToggle.parentNode.replaceChild(newSettingsToggle, settingsToggle);

            newSettingsToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('⚙️ Settings menu açılır');
                settingsMenu.classList.toggle('hidden');
            });

            // Menu xaricində klikləyəndə bağla
            document.addEventListener('click', (e) => {
                if (!settingsMenu.contains(e.target) && !newSettingsToggle.contains(e.target)) {
                    settingsMenu.classList.add('hidden');
                }
            });

            // Menu daxilində klikləyəndə bağlanmasın
            settingsMenu.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }

        // Settings menu
        const toggle = document.getElementById('settingsToggle');
        const menu = document.getElementById('settingsMenu');
        if (toggle && menu) {
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                menu.classList.toggle('hidden');
            });
            document.addEventListener('click', () => menu.classList.add('hidden'));
        }

        // Logout
        const logoutBtn = document.getElementById('logoutButton');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                if (confirm('Hesabdan çıxmaq istədiyinizə əminsiniz?')) {
                    try {
                        // ========== 🔥 BÜTÜN CACHE-LƏRİ TƏMİZLƏ ==========
                        console.log('🧹 Logout: Bütün cache-lər təmizlənir...');

                        // 1. SessionStorage təmizlə (TaskCache prefix ilə)
                        const sessionKeys = Object.keys(sessionStorage);
                        sessionKeys.forEach(key => {
                            if (key.startsWith('tc_') ||           // TaskCache prefix
                                key.includes('task') ||             // task cache
                                key.includes('cache') ||            // ümumi cache
                                key.startsWith('_api_') ||          // API cache
                                key.includes('external') ||         // external tasks
                                key.includes('partner')) {          // partner tasks
                                sessionStorage.removeItem(key);
                                console.log(`🗑️ SessionStorage-dan silindi: ${key}`);
                            }
                        });

                        // 2. LocalStorage təmizlə (task ilə əlaqəli olanlar)
                        const localStorageKeys = Object.keys(localStorage);
                        localStorageKeys.forEach(key => {
                            if (key.includes('task') ||
                                key.includes('cache') ||
                                key.startsWith('tc_') ||
                                key.includes('external') ||
                                key.includes('partner') ||
                                key === 'tasks_cache' ||
                                key === 'tasks_cache_timestamp' ||
                                key === 'externalTasks_cache' ||
                                key === 'externalTasks_cache_timestamp' ||
                                key.startsWith('task_confirm_end_') ||
                                key.startsWith('task_delay_') ||
                                key.startsWith('task_work_start_')) {
                                localStorage.removeItem(key);
                                console.log(`🗑️ LocalStorage-dan silindi: ${key}`);
                            }
                        });

                        // 3. IndexedDB təmizlə (əgər varsa)
                        if (window.dbManager) {
                            try {
                                // Bütün store-ları təmizlə
                                const stores = ['tasks', 'externalTasks', 'partners', 'companies', 'employees', 'departments'];
                                for (const store of stores) {
                                    if (window.dbManager.clearCache) {
                                        await window.dbManager.clearCache(store);
                                        console.log(`🗑️ IndexedDB store silindi: ${store}`);
                                    }
                                }
                            } catch(e) {
                                console.warn('⚠️ IndexedDB təmizləmə xətası:', e);
                            }
                        }

                        // 4. Memory cache təmizlə (apiService-dəki cache)
                        if (window._apiCache && window._apiCache.clear) {
                            window._apiCache.clear();
                            console.log('🗑️ Memory cache təmizləndi');
                        }

                        // 5. TaskManager cache təmizlə
                        if (window.TaskCache && window.TaskCache.clear) {
                            window.TaskCache.clear();
                            console.log('🗑️ TaskCache təmizləndi');
                        }

                        // 6. TableManager cache təmizlə
                        if (window.TableManager && window.TableManager.clearCache) {
                            await window.TableManager.clearCache();
                            console.log('🗑️ TableManager cache təmizləndi');
                        }

                        // 7. ExternalTableManager cache təmizlə
                        if (window.ExternalTableManager && window.ExternalTableManager.clearCache) {
                            await window.ExternalTableManager.clearCache();
                            console.log('🗑️ ExternalTableManager cache təmizləndi');
                        }

                        // 8. PartnerTableManager cache təmizlə
                        if (window.PartnerTableManager && window.PartnerTableManager.clearCache) {
                            await window.PartnerTableManager.clearCache();
                            console.log('🗑️ PartnerTableManager cache təmizləndi');
                        }

                        console.log('✅ Bütün cache-lər təmizləndi!');

                        // ========== LOGOUT ==========
                        await this.auth.logout();
                        this.ui.showNotification('Uğurla çıxış edildi', 'success');

                        setTimeout(() => {
                            window.location.href = 'login.html';
                        }, 1000);

                    } catch (error) {
                        console.error('Logout error:', error);
                        this.ui.showNotification('Çıxış zamanı xəta baş verdi', 'error');
                    }
                }
            });
        }

        // Save profile
        const saveBtn = document.getElementById('saveProfileBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveProfile());
        }

        // Image uploads
        this.setupImageUpload('profileImageUpload', 'profileImageInput', true);
        this.setupImageUpload('companyImageUpload', 'companyImageInput', false);

        // Verification buttons
        ['verifyEmail', 'verifyPhone', 'verifyTelegram'].forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.addEventListener('click', () => this[`verify${btnId.replace('verify', '')}`]());
            }
        });

        // Password toggle
        const togglePass = document.getElementById('togglePassword');
        const passInput = document.getElementById('password');
        if (togglePass && passInput) {
            togglePass.addEventListener('click', () => {
                const type = passInput.type === 'password' ? 'text' : 'password';
                passInput.type = type;
                const icon = togglePass.querySelector('i');
                if (icon) icon.className = type === 'password' ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash';
            });
        }

        console.log('✅ Event listeners quruldu');
    }

    // Modul düymələrini bağlamaq
    bindModuleButtons() {
        console.log('🔧 Modul düymələri bağlanır...');

        // Event listener dublikasiyasını qarşısını almaq üçün flag
        if (this._moduleButtonsBound) {
            console.log('⚠️ Modul düymələri artıq bağlanıb');
            return;
        }

        this._moduleButtonsBound = true;

        // Bütün modul kartlarını tap
        const cards = document.querySelectorAll('.border.border-slate-200.rounded-2xl.p-6');

        cards.forEach((card, index) => {
            // Göz düyməsi (baxış)
            const viewBtn = card.querySelector('button.text-slate-400.hover\\:text-brand-blue');
            if (viewBtn) {
                viewBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.openModuleView(index);
                });
            }

            // Əlavə et düyməsi (əlavə)
            const addBtn = card.querySelector('button.text-sm.text-brand-blue.hover\\:underline');
            if (addBtn) {
                addBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.openModuleAdd(index);
                });
            }
        });

        // ==================== DEPARTAMENT İCAZƏLƏRİ ====================
        // Bu hissəni kart dövrəsindən ÇIXARDIN və ayrıca yazın

        const openPermissionsModalBtn = document.getElementById('openPermissionsModalBtn');
        const addPermissionBtn = document.getElementById('addPermissionBtn');

        // Köhnə event listener-ları sil
        if (openPermissionsModalBtn) {
            openPermissionsModalBtn.replaceWith(openPermissionsModalBtn.cloneNode(true));
        }
        if (addPermissionBtn) {
            addPermissionBtn.replaceWith(addPermissionBtn.cloneNode(true));
        }

        // YENİ Düymələri tap (clone edildikdən sonra)
        const newOpenPermissionsModalBtn = document.getElementById('openPermissionsModalBtn');
        const newAddPermissionBtn = document.getElementById('addPermissionBtn');

        // Event listener əlavə et
        if (newOpenPermissionsModalBtn) {
            console.log('✅ Permissions düyməsi tapıldı, event listener əlavə edilir...');

            const handlePermissionsClick = async (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔐 Departament icazələri modulu açılır (SADƏCƏ 1 DƏFƏ)...');

                // Debounce: 500ms gözlə
                if (this._permissionsClickDebounce) {
                    console.log('⏱️ Çox tez klik, gözləyin...');
                    return;
                }

                this._permissionsClickDebounce = true;
                setTimeout(() => {
                    this._permissionsClickDebounce = false;
                }, 500);

                try {
                    // 1. Əgər modal artıq açıqdırsa, bağla
                    const existingModal = document.getElementById('departmentPermissionsModal');
                    if (existingModal) {
                        console.log('⚠️ Modal artıq açıqdır, bağlanır...');
                        existingModal.remove();
                        return;
                    }

                    // 2. PermissionsService-dən istifadə et
                    if (this.permissionsService && typeof this.permissionsService.openDepartmentPermissions === 'function') {
                        await this.permissionsService.openDepartmentPermissions();
                    } else {
                        console.error('PermissionsService və ya openDepartmentPermissions metodu tapılmadı');
                        this.ui.showNotification('Departament icazələri modulu hazır deyil', 'error');
                    }
                } catch (error) {
                    console.error('❌ Permissions modulu xətası:', error);
                    this.ui.showNotification('Modul açıla bilmədi: ' + error.message, 'error');
                }
            };

            newOpenPermissionsModalBtn.addEventListener('click', handlePermissionsClick);
        }

        if (newAddPermissionBtn) {
            console.log('✅ Add Permission düyməsi tapıldı...');

            newAddPermissionBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('➕ İcazələr tənzimlənir...');

                // Eyni funksiyanı çağır
                if (newOpenPermissionsModalBtn) {
                    newOpenPermissionsModalBtn.click();
                }
            });
        }

        console.log('✅ Modul düymələri bağlandı');
    }

    openModuleView(index) {
        const modules = [
            'employees',
            'companies',
            'permissions',
            'obligations',
            'positions',
            'salary'
        ];

        if (modules[index]) {
            console.log(`👁️ ${modules[index]} modulu açılır (baxış)`);
            this[`open${modules[index].charAt(0).toUpperCase() + modules[index].slice(1)}Module`]();
        }
    }

    openModuleAdd(index) {
        const modules = [
            'addEmployee',
            'addCompany',
            'addPermission',
            'addObligation',
            'addPosition',
            'assignSalary'
        ];

        if (modules[index]) {
            console.log(`➕ ${modules[index]} funksiyası çağırılır`);
            this[modules[index]]();
        }
    }

    setupImageUpload(uploadId, inputId, isProfile) {
        const uploadArea = document.getElementById(uploadId);
        const fileInput = document.getElementById(inputId);
        if (!uploadArea || !fileInput) return;

        uploadArea.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', async (e) => {
            if (e.target.files[0]) {
                try {
                    await this.fileService.uploadImage(e.target.files[0], isProfile ? 'profile' : 'company');
                    this.ui.showNotification('Şəkil uğurla yükləndi!', 'success');
                } catch (error) {
                    this.ui.showNotification('Şəkil yüklənərkən xəta baş verdi', 'error');
                }
            }
        });
    }

    // Form məlumatlarını almaq
    getFormData() {
        const formData = {
            firstName: document.getElementById('firstName')?.value || '',
            lastName: document.getElementById('lastName')?.value || '',
            fatherName: document.getElementById('fatherName')?.value || '',
            gender: document.getElementById('gender')?.value || '',
            birthDate: document.getElementById('birthDate')?.value || '',
            voen: document.getElementById('voen')?.value || '',
            asanImza: document.getElementById('asanImza')?.value || '',
            asanId: document.getElementById('asanId')?.value || '',
            pin1: document.getElementById('pin1')?.value || '',
            pin2: document.getElementById('pin2')?.value || '',
            puk: document.getElementById('puk')?.value || '',  // ✅ BURANI ƏLAVƏ EDİN
            finCode: document.getElementById('finCode')?.value || '',
            email: document.getElementById('email')?.value || '',
            phone: document.getElementById('phone')?.value || '',
            telegramUsername: document.getElementById('telegramUsername')?.value || '',
            password: document.getElementById('password')?.value || ''
        };

        return formData;
    }

    async saveProfile() {
        const saveBtn = document.getElementById('saveProfileBtn');
        if (!saveBtn) return;

        this.ui.setLoading(saveBtn, true);

        try {
            const formData = this.getFormData();
            const validation = this.profile.validateProfileData(formData);
            if (!validation.isValid) {
                this.ui.showFormErrors(validation.errors.map(msg => ({message: msg})));
                throw new Error('Form validasiya xətası');
            }

            await this.profile.updateProfile(formData);
            this.ui.showNotification('Profil məlumatlarınız uğurla yeniləndi!', 'success');

            const passwordField = document.getElementById('password');
            if (passwordField) passwordField.value = '';

        } catch (error) {
            console.error('❌ Profil saxlama xətası:', error);
            // ✅ DƏYİŞİKLİK: Error mesajı göstərmə, çünki token expired ola bilər
            if (!error.message.includes('Token') && !error.message.includes('401')) {
                this.ui.showNotification('Profil saxlanarkən xəta baş verdi', 'error');
            }
        } finally {
            this.ui.setLoading(saveBtn, false);
        }
    }

    verifyEmail() {
        const email = document.getElementById('email')?.value;
        if (!email) {
            this.ui.showNotification('Email ünvanı daxil edin', 'error');
            return;
        }
        this.auth.verifyUserEmail(email)
            .then(() => this.ui.showNotification('Təsdiqləmə email-i göndərildi', 'success'))
            .catch(() => this.ui.showNotification('Email təsdiqləmə xətası', 'error'));
    }

    verifyPhone() {
        const phone = document.getElementById('phone')?.value;
        if (!phone) {
            this.ui.showNotification('Telefon nömrəsi daxil edin', 'error');
            return;
        }
        this.auth.verifyUserPhone(phone)
            .then(() => this.ui.showNotification('SMS təsdiqləmə kodu göndərildi', 'success'))
            .catch(() => this.ui.showNotification('Telefon təsdiqləmə xətası', 'error'));
    }

    // DÜZƏLDİLMİŞ KOD:
    verifyTelegram() {
        console.log('📱 Telegram təsdiqləmə başladıldı');

        // ProfileService-in verifyTelegram metodunu çağır
        if (this.profile) {
            this.profile.verifyTelegram();
        } else {
            console.error('❌ profileService tapılmadı');
            this.ui.showNotification('Xəta: Profil servisi tapılmadı', 'error');
        }
    }

    // ==================== MODUL FUNKSİYALARI ====================


    setupModalListeners(){
        console.log('🔧 Modal düymələri bağlanır...');


        // ==================== 1. İŞÇİLƏR DÜYMƏSİ ====================
        const employeesBtn = document.getElementById('openEmployeesModalBtn');
        if (employeesBtn) {
            console.log('✅ İşçilər düyməsi tapıldı');

            employeesBtn.replaceWith(employeesBtn.cloneNode(true));
            const newEmployeesBtn = document.getElementById('openEmployeesModalBtn');

            newEmployeesBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('👥 İşçilər düyməsinə klik edildi');

                try {
                    if (this._employeesClickDebounce) {
                        console.log('⏱️ Çox tez klik, gözləyin...');
                        return;
                    }

                    this._employeesClickDebounce = true;
                    setTimeout(() => { this._employeesClickDebounce = false; }, 500);

                    // BÜTÜN BÖLMƏLƏRİ SİL VƏ YA GİZLƏT
                    this.clearAllSections();

                    // İşçilər bölməsini göstər
                    if (!this.employeesService) {
                        this.employeesService = new EmployeesService(this.api);
                        window.employeesService = this.employeesService;
                    }

                    await this.employeesService.showEmployeesSection();

                    // Aktiv menyu stilini yenilə
                    document.querySelectorAll('nav a').forEach(a => {
                        a.classList.remove('bg-brand-soft', 'text-brand-blue');
                    });
                    newEmployeesBtn.classList.add('bg-brand-soft', 'text-brand-blue');

                    // Sidebar-ı daralt
                    const sidebar = document.getElementById('mainSidebar');
                    if (sidebar) sidebar.classList.add('sidebar-collapsed');

                } catch (error) {
                    console.error('❌ İşçilər modulu xətası:', error);
                }
            });

            console.log('✅ İşçilər düyməsi bağlandı');
        }

        // ==================== 2. ŞİRKƏTLƏR DÜYMƏSİ ====================
        const companiesBtn = document.getElementById('openCompaniesModalBtn');
        if (companiesBtn) {
            console.log('✅ Şirkətlər düyməsi tapıldı');

            companiesBtn.replaceWith(companiesBtn.cloneNode(true));
            const newCompaniesBtn = document.getElementById('openCompaniesModalBtn');

            newCompaniesBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🏢 Şirkətlər düyməsinə klik edildi');

                try {
                    if (this._companiesClickDebounce) {
                        console.log('⏱️ Çox tez klik...');
                        return;
                    }

                    this._companiesClickDebounce = true;
                    setTimeout(() => { this._companiesClickDebounce = false; }, 500);

                    // BÜTÜN BÖLMƏLƏRİ SİL VƏ YA GİZLƏT
                    this.clearAllSections();

                    // Şirkətlər bölməsini göstər
                    if (!this.companiesService) {
                        this.companiesService = new CompaniesService(this.api);
                        window.companiesService = this.companiesService;
                    }

                    // companiesSection-i göstər (əgər varsa)
                    let companiesSection = document.getElementById('companiesSection');
                    if (companiesSection) {
                        companiesSection.style.display = 'block';
                        await this.companiesService.loadCompanies();
                        this.companiesService.filterCompanies();
                        this.companiesService.renderTable();
                    } else if (this.companiesService.showCompaniesSection) {
                        await this.companiesService.showCompaniesSection();
                    }

                    // Aktiv menyu stilini yenilə
                    document.querySelectorAll('nav a').forEach(a => {
                        a.classList.remove('bg-brand-soft', 'text-brand-blue');
                    });
                    newCompaniesBtn.classList.add('bg-brand-soft', 'text-brand-blue');

                    // Sidebar-ı daralt
                    const sidebar = document.getElementById('mainSidebar');
                    if (sidebar) sidebar.classList.add('sidebar-collapsed');

                } catch (error) {
                    console.error('❌ Şirkətlər modulu xətası:', error);
                }
            });

            console.log('✅ Şirkətlər düyməsi bağlandı');
        }

        // ==================== 3. ÜST ŞİRKƏTLƏR (PARTNİORLAR) DÜYMƏSİ ====================
        const partnersBtn = document.getElementById('openPartniorModalBtn');
        if (partnersBtn) {
            console.log('✅ Üst Şirkətlər düyməsi tapıldı');

            partnersBtn.replaceWith(partnersBtn.cloneNode(true));
            const newPartnersBtn = document.getElementById('openPartniorModalBtn');

            newPartnersBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🤝 Üst Şirkətlər düyməsinə klik edildi');

                try {
                    if (this._partnersClickDebounce) {
                        console.log('⏱️ Çox tez klik...');
                        return;
                    }

                    this._partnersClickDebounce = true;
                    setTimeout(() => { this._partnersClickDebounce = false; }, 500);

                    // BÜTÜN BÖLMƏLƏRİ SİL VƏ YA GİZLƏT
                    this.clearAllSections();

                    if (!this.partnersService) {
                        this.partnersService = new PartnersService();
                        window.partnersService = this.partnersService;
                    }

                    if (!this.currentCompanyCode) {
                        await this.loadUserDataFromStorage();
                    }

                    if (this.partnersService && typeof this.partnersService.showPartnersSection === 'function') {
                        await this.partnersService.showPartnersSection();
                    }

                    // Aktiv menyu stilini yenilə
                    document.querySelectorAll('nav a').forEach(a => {
                        a.classList.remove('bg-brand-soft', 'text-brand-blue');
                    });
                    newPartnersBtn.classList.add('bg-brand-soft', 'text-brand-blue');

                    // Sidebar-ı daralt
                    const sidebar = document.getElementById('mainSidebar');
                    if (sidebar) sidebar.classList.add('sidebar-collapsed');

                } catch (error) {
                    console.error('❌ Xəta:', error);
                }
            });
        }

        // ==================== 4. SƏLAHİYYƏTLƏR (PERMISSIONS) DÜYMƏSİ ====================
        const permissionsBtn = document.getElementById('openPermissionsModalBtn');
        if (permissionsBtn) {
            console.log('✅ Səlahiyyətlər düyməsi tapıldı');

            permissionsBtn.replaceWith(permissionsBtn.cloneNode(true));
            const newPermissionsBtn = document.getElementById('openPermissionsModalBtn');

            newPermissionsBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔐 Səlahiyyətlər düyməsinə klik edildi');

                try {
                    if (this._permissionsClickDebounce) {
                        console.log('⏱️ Çox tez klik...');
                        return;
                    }

                    this._permissionsClickDebounce = true;
                    setTimeout(() => { this._permissionsClickDebounce = false; }, 500);

                    // BÜTÜN BÖLMƏLƏRİ SİL VƏ YA GİZLƏT
                    this.clearAllSections();

                    if (!this.permissionsService) {
                        this.permissionsService = new PermissionsService(this.api);
                        window.permissionsService = this.permissionsService;
                    }

                    if (!this.currentCompanyId) {
                        await this.loadUserDataFromStorage();
                    }

                    if (this.permissionsService && typeof this.permissionsService.showPermissionsSection === 'function') {
                        await this.permissionsService.showPermissionsSection();
                    }

                    // Aktiv menyu stilini yenilə
                    document.querySelectorAll('nav a').forEach(a => {
                        a.classList.remove('bg-brand-soft', 'text-brand-blue');
                    });
                    newPermissionsBtn.classList.add('bg-brand-soft', 'text-brand-blue');

                    // Sidebar-ı daralt
                    const sidebar = document.getElementById('mainSidebar');
                    if (sidebar) sidebar.classList.add('sidebar-collapsed');

                } catch (error) {
                    console.error('❌ Xəta:', error);
                }
            });
        }


        // ==================== 5. VƏZİFƏLƏR DÜYMƏSİ ====================
        const positionsBtn = document.getElementById('openPositionsModalBtn');
        if (positionsBtn) {
            console.log('✅ Vəzifələr düyməsi tapıldı');

            positionsBtn.replaceWith(positionsBtn.cloneNode(true));
            const newPositionsBtn = document.getElementById('openPositionsModalBtn');

            newPositionsBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('💼 Vəzifələr düyməsinə klik edildi');

                try {
                    if (this._positionsClickDebounce) {
                        console.log('⏱️ Çox tez klik...');
                        return;
                    }

                    this._positionsClickDebounce = true;
                    setTimeout(() => { this._positionsClickDebounce = false; }, 500);

                    // BÜTÜN BÖLMƏLƏRİ SİL VƏ YA GİZLƏT
                    this.clearAllSections();

                    if (!this.positionsService) {
                        this.positionsService = new PositionsService(this.api);
                        window.positionsService = this.positionsService;
                    }

                    if (!this.currentCompanyId) {
                        await this.loadUserDataFromStorage();
                    }

                    if (this.positionsService && typeof this.positionsService.showPositionsSection === 'function') {
                        await this.positionsService.showPositionsSection();
                    }

                    // Aktiv menyu stilini yenilə
                    document.querySelectorAll('nav a').forEach(a => {
                        a.classList.remove('bg-brand-soft', 'text-brand-blue');
                    });
                    newPositionsBtn.classList.add('bg-brand-soft', 'text-brand-blue');

                    // Sidebar-ı daralt
                    const sidebar = document.getElementById('mainSidebar');
                    if (sidebar) sidebar.classList.add('sidebar-collapsed');

                } catch (error) {
                    console.error('❌ Xəta:', error);
                }
            });
        }

        // ==================== 6. ÖHDƏLİKLƏR DÜYMƏSİ ====================
        const obligationsBtn = document.getElementById('openObligationsModalBtn');
        if (obligationsBtn) {
            console.log('✅ Öhdəliklər düyməsi tapıldı');

            obligationsBtn.replaceWith(obligationsBtn.cloneNode(true));
            const newObligationsBtn = document.getElementById('openObligationsModalBtn');

            newObligationsBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('📋 Öhdəliklər düyməsinə klik edildi');

                try {
                    if (this._obligationsClickDebounce) {
                        console.log('⏱️ Çox tez klik...');
                        return;
                    }

                    this._obligationsClickDebounce = true;
                    setTimeout(() => { this._obligationsClickDebounce = false; }, 500);

                    // BÜTÜN BÖLMƏLƏRİ SİL VƏ YA GİZLƏT
                    this.clearAllSections();

                    if (!this.obligationsService) {
                        this.obligationsService = new ObligationsService(this.api);
                        window.obligationsService = this.obligationsService;
                    }

                    if (!this.currentCompanyId) {
                        await this.loadUserDataFromStorage();
                    }

                    if (this.obligationsService && typeof this.obligationsService.showObligationsSection === 'function') {
                        await this.obligationsService.showObligationsSection();
                    }

                    // Aktiv menyu stilini yenilə
                    document.querySelectorAll('nav a').forEach(a => {
                        a.classList.remove('bg-brand-soft', 'text-brand-blue');
                    });
                    newObligationsBtn.classList.add('bg-brand-soft', 'text-brand-blue');

                    // Sidebar-ı daralt
                    const sidebar = document.getElementById('mainSidebar');
                    if (sidebar) sidebar.classList.add('sidebar-collapsed');

                } catch (error) {
                    console.error('❌ Xəta:', error);
                }
            });
            // ==================== 1C MƏLUMATLARIM DÜYMƏSİ ====================
            const oneCLinks = document.querySelectorAll('a[href*="1c-dashboard"]');
            oneCLinks.forEach(function(link) {
                const newLink = link.cloneNode(true);
                link.parentNode.replaceChild(newLink, link);

                newLink.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('⬡ 1C Məlumatlarım açılır...');

                    if (typeof GF1C !== 'undefined' && typeof GF1C.open === 'function') {
                        GF1C.open();
                    } else {
                        console.error('❌ GF1C tapılmadı, skript yüklənibmi?');
                    }
                });
            });
        }

        console.log('✅ Bütün düymələr bağlandı');
    }


    /**
     * FAYLLARIM DÜYMƏSİ - AYRI METOD
     */
    setupFayllarimButton() {
        console.log('📂 Fayllarım düyməsi hazırlanır...');

        const fayllarimBtn = document.getElementById('fayllarimBtn');

        if (fayllarimBtn) {
            // Köhnə event listener-ları sil
            const newBtn = fayllarimBtn.cloneNode(true);
            fayllarimBtn.parentNode.replaceChild(newBtn, fayllarimBtn);

            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('📂 Fayllarım klikləndi -', new Date().toISOString());

                try {
                    // 1. BÜTÜN BÖLMƏLƏRİ TƏMİZLƏ
                    this.clearAllSections();

                    // 2. YENİ FILESECTION YARAT
                    const container = document.querySelector('main .overflow-y-auto') ||
                                     document.querySelector('main');

                    if (!container) {
                        console.error('❌ Container tapılmadı');
                        return;
                    }

                    // 3. BİR DAHA YOXLA (əgər qalıbsa)
                    const oldFiles = document.getElementById('filesSection');
                    if (oldFiles) oldFiles.remove();

                    const filesSection = document.createElement('section');
                    filesSection.id = 'filesSection';
                    filesSection.className = 'w-full h-full';
                    filesSection.style.display = 'block';
                    container.appendChild(filesSection);

                    const filesContent = document.createElement('div');
                    filesContent.id = 'filesContent';
                    filesContent.className = 'h-full';
                    filesSection.appendChild(filesContent);

                    // 4. FileService və FilesUI yarat
                    setTimeout(() => {
                        if (!window.fileService) {
                            window.fileService = new FileService(this.api);
                        }
                        if (!window.filesUI) {
                            window.filesUI = new FilesUI(window.fileService);
                        }
                        window.filesUI.render('filesContent');
                    }, 100);

                    // 5. SİDEBAR
                    const sidebar = document.getElementById('mainSidebar');
                    if (sidebar) sidebar.classList.add('sidebar-collapsed');

                    // 6. AKTİV MENÜ
                    document.querySelectorAll('nav a').forEach(a => {
                        a.classList.remove('bg-brand-soft', 'text-brand-blue');
                    });
                    newBtn.classList.add('bg-brand-soft', 'text-brand-blue');

                } catch (error) {
                    console.error('❌ Fayllarım xətası:', error);
                }
            });

            console.log('✅ Fayllarım düyməsi hazır');
        } else {
            console.warn('⚠️ Fayllarım düyməsi tapılmadı');
        }
    }

    // ==================== TASK MANAGER DÜYMƏSİ ====================
    setupTaskManagerButton() {
        const taskManagerBtn = document.getElementById('taskManagerBtn');

        if (taskManagerBtn) {
            const newBtn = taskManagerBtn.cloneNode(true);
            taskManagerBtn.parentNode.replaceChild(newBtn, taskManagerBtn);

            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                this.clearAllSections();

                const container = document.querySelector('main .overflow-y-auto') || document.querySelector('main');
                if (!container) return;

                const taskSection = document.createElement('section');
                taskSection.id = 'taskManagerSection';
                taskSection.className = 'w-full h-full p-0';
                taskSection.style.display = 'block';
                taskSection.style.height = 'calc(100vh - 70px)';

                const oldSection = document.getElementById('taskManagerSection');
                if (oldSection) oldSection.remove();

                container.appendChild(taskSection);

                // İFRAME ilə yüklə - ƏN SADƏ VƏ ƏN ETİBARLI ÜSUL
                taskSection.innerHTML = `
                    <iframe 
                        src="../task/task.html" 
                        style="width: 100%; height: 100%; border: none; border-radius: 1rem; background: white;"
                        title="Task Manager"
                    ></iframe>
                `;

                document.querySelectorAll('nav a').forEach(a => {
                    a.classList.remove('bg-brand-soft', 'text-brand-blue');
                });
                newBtn.classList.add('bg-brand-soft', 'text-brand-blue');

                const sidebar = document.getElementById('mainSidebar');
                if (sidebar) sidebar.classList.add('sidebar-collapsed');
            });
        }
    }

    /**
     * BÜTÜN BÖLMƏLƏRİ TƏMİZLƏ
     */
    clearAllSections() {
        console.log('🧹 Bütün bölmələr təmizlənir...');

        // 1. HTML-də olan əsas bölmələri gizlət
        const dashboardSection = document.getElementById('dashboardSection');
        const profileSection = document.getElementById('profileSection');
        const companiesSection = document.getElementById('companiesSection');
        const companyDetailsSection = document.getElementById('companyDetailsSection');

        if (dashboardSection) dashboardSection.style.display = 'none';
        if (profileSection) profileSection.style.display = 'none';
        if (companiesSection) companiesSection.style.display = 'none';
        if (companyDetailsSection) companyDetailsSection.style.display = 'none';

        // 2. Dinamik yaradılan bölmələri sil - FILESECTION ƏLAVƏ EDİLDİ!
        const sectionsToRemove = [
            'employeesSection',
            'employeeDetailsSection',
            'filesSection',           // ← ƏLAVƏ EDİLDİ
            'filesContent',           // ← ƏLAVƏ EDİLDİ (əgər varsa)
            'partnersSection',
            'permissionsSection',
            'positionsSection',
            'obligationsSection',
            'taskManagerSection'
        ];

        sectionsToRemove.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.remove();
                console.log(`🗑️ ${id} silindi`);
            }
        });

        // 3. Service-lərdəki referansları təmizlə
        if (this.employeesService) {
            this.employeesService.employeesSection = null;
            this.employeesService.employeeDetailsSection = null;
        }

        sectionsToRemove.forEach(id => {
        const element = document.getElementById(id);
            if (element) {
                element.remove();
                console.log(`🗑️ ${id} silindi`);
            }
        });

        if (this.partnersService) {
            this.partnersService.partnersSection = null;
        }

        if (this.permissionsService) {
            this.permissionsService.permissionsSection = null;
        }

        if (this.positionsService) {
            this.positionsService.positionsSection = null;
        }

        if (this.obligationsService) {
            this.obligationsService.obligationsSection = null;
        }

        // 4. FileService referanslarını təmizlə
        if (window.filesUI) {
            window.filesUI = null;
        }

        // FileService-i saxla, amma UI referansını sil
        if (window.fileService) {
            window.fileService.onFileChange = null;
        }

        // 5. Açıq modalları bağla - ASAN İMZA MODALINI SAXLA
        const modals = document.querySelectorAll('[id$="Modal"]');
        modals.forEach(modal => {
            // ✅ ASAN İmza modalını SİLME, sadəcə gizlət
            if (modal.id === 'asanImzaModal') {
                modal.classList.add('hidden');
                modal.style.display = 'none';
            }
            // Digər modalları sil
            else if (modal.id !== 'settingsMenu') {
                modal.remove();
            }
        });

        console.log('✅ Bütün bölmələr təmizləndi');
    }

    async loadUserDataFromStorage() {
        try {
            const savedUser = localStorage.getItem('userData');
            if (savedUser) {
                const parsed = JSON.parse(savedUser);

                if (parsed.user) {
                    this.currentCompanyCode = parsed.user.company_code || parsed.user.companyCode;
                    this.currentCompanyId = parsed.user.company_id;
                    this.currentUserId = parsed.user.id;
                } else {
                    this.currentCompanyCode = parsed.company_code || parsed.companyCode;
                    this.currentCompanyId = parsed.company_id;
                    this.currentUserId = parsed.id;
                }

                console.log('📋 localStorage-dən yükləndi:', {
                    code: this.currentCompanyCode,
                    id: this.currentCompanyId
                });
                return true;
            }
            return false;
        } catch (error) {
            console.error('❌ localStorage parsing error:', error);
            return false;
        }
    }

    showParentCompanyInfo() {
        const parentInfo = document.getElementById('parent-company-info');
        if (parentInfo) {
            parentInfo.classList.remove('hidden');

            // window.app.user_service-dən götür
            const user = window.app?.user || {};

            document.getElementById('parent-company-code').textContent = user.company_code || this.currentCompanyCode || '-';
            document.getElementById('parent-company-name').textContent = user.company_name || user.company_code || '-';
            document.getElementById('parent-total-subs').textContent = this.companiesService.currentCompany?.total_sub_companies || '0';

            // VOEN-i tapmaq üçün cəhd et
            if (user.voen) {
                document.getElementById('parent-company-voen').textContent = user.voen;
            } else if (this.companiesService.currentCompany && this.companiesService.currentCompany.voen) {
                document.getElementById('parent-company-voen').textContent = this.companiesService.currentCompany.voen;
            }
        }
    }


    addCompany() {
        this.ui.showNotification('Yeni şirkət əlavə etmə funksiyası tezliklə', 'info');
    }



    addPermission() {
        this.ui.showNotification('Yeni səlahiyyət əlavə etmə funksiyası tezliklə', 'info');
    }



    addObligation() {
        this.ui.showNotification('Yeni öhdəlik əlavə etmə funksiyası tezliklə', 'info');
    }



    addPosition() {
        this.ui.showNotification('Yeni vəzifə əlavə etmə funksiyası tezliklə', 'info');
    }


    assignSalary() {
        this.ui.showNotification('Maaş təyinatı funksiyası tezliklə', 'info');
    }

}


// Global funksiyalar
window.refreshSubCompanies = async function () {
    try {
        console.log('🔄 Alt şirkətlər yenilənir...');

        if (window.profileApp && window.profileApp.companiesService) {
            const companies = await window.profileApp.companiesService.getAllCompanies();

            if (window.profileApp.companiesService.displayCompaniesTable) {
                window.profileApp.companiesService.displayCompaniesTable(companies);
                window.profileApp.showParentCompanyInfo();
            }
        } else if (window.app && window.app.companiesService) {
            const companies = await window.app.companiesService.getAllCompanies();

            if (window.app.companiesService.displayCompaniesTable) {
                window.app.companiesService.displayCompaniesTable(companies);
                window.app.showParentCompanyInfo();
            }
        }
    } catch (error) {
        console.error('❌ Yeniləmə xətası:', error);
        // ✅ DƏYİŞİKLİK: Error mesajı göstərmə
        // alert(`Yeniləmə xətası: ${error.message}`);
    }
};


// Check localStorage button
window.checkLocalStorage = function () {
    const data = localStorage.getItem('userData');
    if (data) {
        try {
            const parsed = JSON.parse(data);
            alert(`LocalStorage userData:\n\nCompany Code: ${parsed.user?.company_code || parsed.company_code || 'Not found'}\nUser ID: ${parsed.user?.id || parsed.id || 'Not found'}`);
        } catch (e) {
            alert('LocalStorage parsing error');
        }
    } else {
        alert('LocalStorage userData not found');
    }
};

// App-i başlat - DÜZƏLDİLMİŞ VERSİYA
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('🚀 DOM Content Loaded - App başladılır...');

        // ProfileApp instance yarat
        window.profileApp = new ProfileApp();

        // window.app referansını da qoy
        window.app = window.profileApp;

        console.log('✅ App instance yaradıldı:', window.profileApp);

    } catch (error) {
        console.error('❌ App başlatma xətası:', error);

    }
});
// DÜZƏLDİLMİŞ VERSİYA:
document.addEventListener('DOMContentLoaded', function() {
    // Settings panel toggle
    const settingsMainBtn = document.getElementById('settingsMainBtn');
    const settingsPanel = document.getElementById('settingsPanel');
    const settingsArrow = document.getElementById('settingsArrow');

    if (settingsMainBtn && settingsPanel && settingsArrow) {
        settingsMainBtn.addEventListener('click', function(e) {
            e.preventDefault();
            settingsPanel.classList.toggle('hidden');
            settingsArrow.style.transform = settingsPanel.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(180deg)';
        });

        document.addEventListener('click', function(event) {
            if (!settingsMainBtn.contains(event.target) && !settingsPanel.contains(event.target)) {
                settingsPanel.classList.add('hidden');
                settingsArrow.style.transform = 'rotate(0deg)';
            }
        });
    }

    // ========== YENİ THEME TOGGLE ==========
    const themeToggle = document.getElementById('themeToggle');

    if (themeToggle) {
        // Yadda saxlanmış temanı yüklə
        const savedTheme = localStorage.getItem('theme') || 'light';

        // Temanı tətbiq et
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-theme');
            themeToggle.innerHTML = '<i class="fas fa-sun w-5"></i><span class="flex-1 text-left">İşıq rejim</span><i class="fa-solid fa-toggle-on text-brand-blue text-xl"></i>';
        }

        // Click event
        themeToggle.addEventListener('click', function() {
            document.body.classList.toggle('dark-theme');

            if (document.body.classList.contains('dark-theme')) {
                localStorage.setItem('theme', 'dark');
                themeToggle.innerHTML = '<i class="fas fa-sun w-5"></i><span class="flex-1 text-left">İşıq rejim</span><i class="fa-solid fa-toggle-on text-brand-blue text-xl"></i>';
            } else {
                localStorage.setItem('theme', 'light');
                themeToggle.innerHTML = '<i class="fas fa-moon w-5"></i><span class="flex-1 text-left">Qaranlıq rejim</span><i class="fa-solid fa-toggle-off text-brand-blue text-xl"></i>';
            }
        });
    }
});
// ============= ŞİRKƏT BUTTONU - DÜZƏLDİLMİŞ VERSİYA =============
(function() {
    console.log('🚀 Şirkət buttonu yoxlaması başladı...');

    // CompaniesService-i tapmaq üçün köməkçi funksiya
    function getCompaniesService() {
        // Mümkün bütün adları yoxla
        return window.companiesService ||    // company.service.js-də yaradılır
               window.companiesModal ||      // Sizin köhnə kodda istifadə olunur
               window.profileApp?.companiesService ||
               window.app?.companiesService;
    }

    // Hər saniyə yoxla
    const checkInterval = setInterval(function() {
        const companiesSection = document.getElementById('companiesSection');

        if (companiesSection && companiesSection.style.display !== 'none') {

            let addBtn = document.getElementById('addCompanyByCodeBtn');

            if (!addBtn) {
                console.log('➕ Şirkət buttonu yaradılır...');

                addBtn = document.createElement('button');
                addBtn.id = 'addCompanyByCodeBtn';
                addBtn.className = 'px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl font-medium flex items-center shadow-lg transform transition-all hover:scale-105';
                addBtn.innerHTML = '<i class="fa-solid fa-plus-circle text-lg mr-2"></i>Yeni Şirkət Əlavə Et';

                const headerDiv = companiesSection.querySelector('.mb-8 > div:first-child');
                if (headerDiv) {
                    headerDiv.appendChild(addBtn);
                    console.log('✅ Button əlavə olundu!');

                    addBtn.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('➕ Şirkət əlavə et klikləndi');

                        // CompaniesService-i tap
                        const service = getCompaniesService();

                        if (service) {
                            console.log('✅ CompaniesService tapıldı:', service);
                            service.openCompanyCodeModal();
                        } else {
                            console.error('❌ CompaniesService tapılmadı!');
                            console.log('Window obyekti:', Object.keys(window).filter(key =>
                                key.includes('company') || key.includes('Company') || key.includes('modal')
                            ));
                            alert('Xəta: CompaniesService tapılmadı. Səhifəni yeniləyin.');
                        }
                    });
                }
            }
        }
    }, 1000);

    // 30 saniyədən sonra dayandır
    setTimeout(() => clearInterval(checkInterval), 30000);
})();
// ===========================================
// SƏHİFƏ LOADER - TAM PROFESİONAL HƏLL
// ===========================================
(function() {
    console.log('⏳ Loader yoxlaması başladı...');

    // Loader elementi
    const loader = document.getElementById('pageLoader');
    if (!loader) {
        console.log('⚠️ Loader elementi tapılmadı');
        return;
    }

    // Yüklənməsi gözlənilən elementlər
    const criticalElements = [
        'dashboardSection',
        'profileSection',
        'dashboardCompaniesCount',
        'dashboardEmployeesCount',
        'dashboardTasksCount',
        'companyNameDisplay',
        'userNameDisplay'
    ];

    // App-in hazır olmasını yoxla
    const checkAppReady = () => {
        return window.profileApp && window.profileApp.isAppReady === true;
    };

    // Elementlərin görünməsini yoxla
    const checkElements = () => {
        // Əsas bölmə görünür?
        const dashboard = document.getElementById('dashboardSection');
        if (!dashboard || dashboard.style.display === 'none') return false;

        // Kritik elementlər dolu?
        for (const id of criticalElements) {
            const el = document.getElementById(id);
            if (el && (!el.textContent || el.textContent === 'Şirkət' || el.textContent === 'İstifadəçi')) {
                // Hələ də default dəyərlər varsa, gözlə
                return false;
            }
        }

        return true;
    };

    // Event listener - appReady event-i
    window.addEventListener('appReady', () => {
        console.log('✅ appReady event-i alındı');

        // Bir az gözlə, UI-nin tam yenilənməsi üçün
        setTimeout(() => {
            if (loader.style.display !== 'none') {
                loader.style.opacity = '0';
                setTimeout(() => {
                    loader.style.display = 'none';
                    document.body.style.overflow = 'auto';
                    console.log('✅ Loader event ilə gizləndi');
                }, 500);
            }
        }, 500);
    });

    // Hər 100ms-də yoxla (ehtiyat)
    const checkInterval = setInterval(() => {
        const appReady = checkAppReady();
        const elementsReady = checkElements();

        console.log(`⏳ Loader status: App: ${appReady}, Elements: ${elementsReady}`);

        if (appReady && elementsReady) {
            console.log('✅ Hər şey hazır! Loader gizlənir...');

            loader.style.opacity = '0';

            setTimeout(() => {
                loader.style.display = 'none';
                document.body.style.overflow = 'auto';
                console.log('✅ Loader interval ilə gizləndi');
            }, 500);

            clearInterval(checkInterval);
        }
    }, 100);

    // Maksimum 10 saniyədən sonra məcburi gizlət
    setTimeout(() => {
        if (loader && loader.style.display !== 'none') {
            console.log('⚠️ Timeout - Loader məcburi gizlədilir');
            loader.style.opacity = '0';
            setTimeout(() => {
                loader.style.display = 'none';
                document.body.style.overflow = 'auto';
            }, 500);
            clearInterval(checkInterval);
        }
    }, 10000);
})();

// main.js faylında, CompaniesService yaradıldıqdan sonra əlavə edin

// companiesService yaradıldıqdan sonra
if (window.companiesService) {
    // Bir az gözlə, companies yüklənsin
    setTimeout(() => {
        const companiesSection = document.getElementById('companiesSection');
        if (companiesSection && companiesSection.style.display !== 'none') {
            window.companiesService.initDetailPanel();
        }
    }, 1000);
}