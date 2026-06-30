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

        if (typeof InvitationService !== 'undefined') {
            this.invitationService = new InvitationService(
                this.api,
                this.auth,
                this.ui
            );
            window.invitationService = this.invitationService;
            console.log('✅ InvitationService instance yaradıldı');
        }

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

            this.setupProtocolNotesButton();

            // 8. Modul event listener-larını qur
            this.bindModuleButtons();

            // Dashboard açılışda görünür olduğu üçün scroll rejimini yalnız ona tətbiq et
            this.setDashboardScrollMode(true);

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

        // Dashboard scroll rejimi yalnız Əsas səhifə linkində aktiv qalmalıdır.
        document.addEventListener('click', (event) => {
            const sidebarItem = event.target.closest('[data-sidebar-item]');
            if (sidebarItem && sidebarItem.id !== 'dashboardBtn') {
                this.setDashboardScrollMode(false);
            }
            if (sidebarItem && sidebarItem.id !== 'openCompaniesModalBtn') {
                document.getElementById('profileContent')?.classList.remove('companies-scroll-mode');
            }
        }, true);

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
                this.setDashboardScrollMode(true);
                requestAnimationFrame(() => {
                    this.applyDashboardScrollMode();
                    window.dashboardManager?.scheduleRecentActivitiesFullRowFit?.();
                });

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

                    // Şirkətlər bölməsində ümumi profile scrollunu söndür,
                    // yalnız aşağıdakı cədvəl pəncərəsi scroll etsin.
                    if (typeof this.setCompaniesScrollMode === 'function') {
                        this.setCompaniesScrollMode(true);
                    } else {
                        document.getElementById('profileContent')?.classList.add('companies-scroll-mode');
                    }

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

        // ==================== DƏVƏT LİNKLƏRİ - MODAL İLƏ ====================

        if (typeof InvitationService !== 'undefined' && !window.invitationService) {
            const api = window.apiService || new ApiService();
            const auth = window.authService || new AuthService(api);
            window.invitationService = new InvitationService(api, auth);
            console.log('✅ InvitationService instance yaradıldı');
        }

        // 2. Dəvət linkləri düyməsi - modal aç
        const setupInvitationButton = () => {
            const inviteBtn = document.getElementById('generateInvitationLinkBtn');
            if (!inviteBtn) {
                console.log('⏳ generateInvitationLinkBtn tapılmadı, 1 saniyə sonra yenidən cəhd...');
                setTimeout(setupInvitationButton, 1000);
                return;
            }

            console.log('✅ Dəvət linkləri düyməsi tapıldı!');

            // Köhnə event listener-ları təmizlə
            const newBtn = inviteBtn.cloneNode(true);
            inviteBtn.parentNode.replaceChild(newBtn, inviteBtn);

            newBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('📧 Dəvət linkləri açılır...');

                // Bütün bölmələri təmizlə
                if (window.profileApp && typeof window.profileApp.clearAllSections === 'function') {
                    window.profileApp.clearAllSections();
                }

                if (window.invitationService) {
                    window.invitationService.showInvitationsSection();
                } else {
                    console.error('❌ InvitationService tapılmadı!');
                    if (window.profileApp?.ui) {
                        window.profileApp.ui.showNotification('Xəta: Xidmət hazır deyil', 'error');
                    }
                }
            });

            console.log('✅ Dəvət linkləri düyməsi InvitationService-ə bağlandı');
        };

        // Düyməni qur
        setTimeout(setupInvitationButton, 500);

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

                // Mark Task Manager as active so profile padding is removed only in this state.
                container.classList.add('profile-content-task-active');
                document.body.classList.add('task-manager-open');
                container.classList.remove('p-8');

                const taskSection = document.createElement('section');
                taskSection.id = 'taskManagerSection';
                taskSection.className = 'task-manager-embedded-root w-full h-full p-0';
                taskSection.style.display = 'block';
                taskSection.style.height = '100%';

                const oldSection = document.getElementById('taskManagerSection');
                if (oldSection) oldSection.remove();

                container.appendChild(taskSection);

                // İFRAME ilə yüklə - ƏN SADƏ VƏ ƏN ETİBARLI ÜSUL
                taskSection.innerHTML = `
                    <iframe 
                        src="../task/task.html" 
                        style="width: 100%; height: 100%; border: none; border-radius: 0; background: transparent; display: block;"
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


    // ==================== PRATAKOL-QEYDLƏR DÜYMƏSİ ====================
    setupProtocolNotesButton() {
        const protocolNotesBtn = document.getElementById('protocolNotesBtn');

        if (protocolNotesBtn) {
            const newBtn = protocolNotesBtn.cloneNode(true);
            protocolNotesBtn.parentNode.replaceChild(newBtn, protocolNotesBtn);

            newBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();

                this.clearAllSections();

                const container = document.querySelector('main .overflow-y-auto') || document.querySelector('main');
                if (!container) return;

                const oldSection = document.getElementById('protocolNotesSection');
                if (oldSection) oldSection.remove();

                this.injectProtocolNotesStyles();

                const protocolNotesSection = document.createElement('section');
                protocolNotesSection.id = 'protocolNotesSection';
                protocolNotesSection.className = 'profile-section w-full';
                protocolNotesSection.style.display = 'block';
                container.classList.add('protocol-full-height-mode');

                protocolNotesSection.innerHTML = `
                    <div class="protocol-notes-page rounded-3xl border border-white/60 bg-white/80 p-8 shadow-soft backdrop-blur-xl">
                        <div class="protocol-notes-header">
                            <div class="protocol-notes-icon">
                                <i class="fas fa-clipboard-list"></i>
                            </div>
                            <div>
                                <h2>Pratakol/Qeydlər</h2>
                                <p>Pratakol və qeydlərin idarə edilməsi.</p>
                            </div>
                        </div>


                        <div id="protocolListView" class="protocol-page-view hidden">
                            <div class="protocol-page-top protocol-page-top-clean">
                                <div class="protocol-page-actions protocol-actions-stack">
                                    <div class="protocol-notes-label-row">
                                        <button id="openNotesPageBtn" class="protocol-notes-round-btn" type="button" title="Qeydlər" aria-label="Qeydlər">
                                            <i class="fas fa-note-sticky"></i>
                                        </button>
                                        <span class="protocol-notes-label">Qeydlər</span>
                                    </div>
                                    <button id="createProtocolBtn" class="protocol-create-btn" type="button">
                                        <i class="fas fa-plus"></i>
                                        Yeni pratakol yarat
                                    </button>
                                </div>
                            </div>

                            <div class="protocol-lists-grid">
                                <div class="protocol-list-card">
                                    <h3>Əvvəlki pratakollar</h3>
                                    <div id="completedProtocolsList"></div>
                                </div>
                                <div class="protocol-list-card">
                                    <h3>Tamamlanmamış pratakollar</h3>
                                    <div id="incompleteProtocolsList"></div>
                                </div>
                            </div>
                        </div>

                        <div id="protocolDetailView" class="protocol-page-view hidden">
                            <div class="protocol-page-top">
                                <button class="protocol-back-btn" data-back-to-protocol-list type="button">
                                    <i class="fas fa-arrow-left"></i>
                                    Geri
                                </button>
                                <h2 id="protocolDetailTitle"></h2>
                            </div>

                            <div class="protocol-top-grid protocol-top-grid-three">
                                <div class="protocol-info-card"><span>Tarix</span><strong id="protocolDetailDate"></strong></div>
                                <div class="protocol-info-card"><span>Rəhbər</span><strong id="protocolDetailLeader"></strong></div>
                                <div class="protocol-info-card"><span>Pratakolun başlığı</span><strong id="protocolDetailProtocolTitle"></strong></div>
                            </div>

                            <div class="protocol-main-grid">
                                <div class="protocol-participants-card">
                                    <div class="protocol-card-header"><div><h3>Əməkdaşların siyahısı</h3><p>Seçilmiş iştirakçılar</p></div></div>
                                    <div id="protocolDetailParticipantsList"></div>
                                </div>
                                <div class="protocol-notes-card">
                                    <div class="protocol-card-header"><div><h3>Qeyd</h3><p>Pratakol qeydləri</p></div></div>
                                    <textarea id="protocolDetailNoteText" placeholder="Pratakol qeydlərini yazın..."></textarea>
                                    <div id="protocolParticipantActions" class="protocol-participant-actions hidden">
                                        <button id="acceptProtocolBtn" class="protocol-accept-btn" type="button">Qəbul et</button>
                                        <button id="rejectProtocolBtn" class="protocol-reject-btn" type="button">İmtina et</button>
                                    </div>
                                    <button id="saveProtocolDetailNoteBtn" class="protocol-save-btn" type="button"><i class="fas fa-save"></i> Yadda saxla</button>
                                </div>
                            </div>
                        </div>

                        <div id="createProtocolModal" class="protocol-modal hidden">
                            <div class="protocol-modal-card">
                                <div class="protocol-modal-header"><h3>Yeni pratakol yarat</h3><button data-close-create-protocol-modal type="button"><i class="fas fa-times"></i></button></div>
                                <div class="protocol-form-group"><label>Tarix</label><input id="protocolCreateDate" type="text" readonly /></div>
                                <div class="protocol-form-group"><label>Pratakolun başlığı</label><input id="protocolTitleInput" type="text" placeholder="Pratakolun başlığını yazın..." required /></div>
                                <div class="protocol-form-group"><label>Əməkdaşlar</label><input id="protocolEmployeeSearch" type="text" placeholder="Əməkdaş axtar..." /><div id="protocolEmployeeSelectList" class="protocol-employee-select-list"></div></div>
                                <div class="protocol-modal-actions"><button data-close-create-protocol-modal type="button">Ləğv et</button><button id="submitCreateProtocolBtn" class="protocol-save-btn" type="button">Yarat</button></div>
                            </div>
                        </div>

                        <div id="protocolEmployeeInfoModal" class="protocol-modal hidden">
                            <div class="protocol-modal-card protocol-small-modal-card">
                                <div class="protocol-modal-header"><h3>Əməkdaş məlumatı</h3><button data-close-employee-info-modal type="button"><i class="fas fa-times"></i></button></div>
                                <div id="protocolEmployeeInfoContent"></div>
                                <div class="protocol-modal-actions"><button data-close-employee-info-modal type="button">Ləğv et</button><button id="confirmEmployeeProtocolInfoBtn" class="protocol-save-btn" type="button">Təsdiq et</button></div>
                            </div>
                        </div>

                        <div id="notesPageView" class="protocol-page-view hidden">
                            <div class="protocol-page-top">
                                <button class="protocol-back-btn" data-back-to-protocol-list type="button">
                                    <i class="fas fa-arrow-left"></i>
                                    Geri
                                </button>
                                <h2>Qeydlər</h2>
                            </div>

                            <div class="protocol-notes-card protocol-notes-placeholder">
                                <h3>Qeydlər</h3>
                                <p>Qeydlər bölməsi hazırlanır.</p>
                            </div>
                        </div>
                    </div>
                `;

                container.appendChild(protocolNotesSection);
                await this.initProtocolNotesSection();

                document.querySelectorAll('nav a').forEach(a => {
                    a.classList.remove('bg-brand-soft', 'text-brand-blue');
                });
                newBtn.classList.add('bg-brand-soft', 'text-brand-blue');

                const sidebar = document.getElementById('mainSidebar');
                if (sidebar) sidebar.classList.add('sidebar-collapsed');
            });
        }
    }

    getTodayDateAz() {
        const today = new Date();
        const day = String(today.getDate()).padStart(2, '0');
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const year = today.getFullYear();
        return `${day}.${month}.${year}`;
    }

    createProtocolId() { return `protocol_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }
    getProtocolsStorageKey() { return 'gf44_protocols'; }
    getProtocolNotificationsKey() { return 'gf44_protocol_notifications'; }
    getProtocolRemovedLogKey() { return 'gf44_protocol_removed_participants'; }

    escapeProtocolHtml(value = '') {
        return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
    }

    getCurrentUserForProtocol() {
        const sources = [window.currentUser, window.owner, window.profile, window.app?.user];
        try {
            const saved = JSON.parse(localStorage.getItem('userData') || '{}');
            sources.push(saved.user, saved);
        } catch (e) {}
        for (const user of sources) {
            if (!user) continue;
            const combined = `${user.first_name || user.ceo_name || ''} ${user.last_name || user.ceo_lastname || ''}`.trim();
            const name = user.full_name || user.name || user.username || combined;
            if (name || user.id || user.user_id) return { id: String(user.id || user.user_id || user.uuid || user.users_uuid || name || 'owner'), name: name || 'Rəhbər' };
        }
        return { id: 'owner', name: 'Rəhbər' };
    }

    getCurrentLeaderName() { return this.getCurrentUserForProtocol().name; }

    normalizeProtocolEmployee(emp) {
        const fullName = emp.full_name || emp.name || `${emp.first_name || emp.ceo_name || ''} ${emp.last_name || emp.ceo_lastname || ''}`.trim() || emp.username || 'Adsız əməkdaş';
        return {
            id: String(emp.id || emp.user_id || emp.uuid || emp.users_uuid || fullName),
            fullName,
            department: emp.department_name || emp.department || emp.department_title || emp.work_type || '',
            raw: emp
        };
    }

    async getProtocolEmployees() {
        if (this.employeesService?.employees?.length) return this.employeesService.employees.map(emp => this.normalizeProtocolEmployee(emp));
        const globalLists = [window.employees, window.workers, window.allEmployees, window.staff, window.companyEmployees];
        const foundGlobal = globalLists.find(list => Array.isArray(list) && list.length);
        if (foundGlobal) return foundGlobal.map(emp => this.normalizeProtocolEmployee(emp));
        try {
            let companyCode = this.currentCompanyCode || this.employeesService?.currentCompanyCode;
            if (!companyCode) {
                const saved = JSON.parse(localStorage.getItem('userData') || '{}');
                companyCode = saved.user?.company_code || saved.company_code || saved.user?.companyCode || saved.companyCode;
            }
            if (!companyCode || !this.api?.get) return [];
            const employees = await this.api.get(`/users/company/${companyCode}`);
            const list = Array.isArray(employees) ? employees : [];
            if (this.employeesService) this.employeesService.employees = list;
            return list.map(emp => this.normalizeProtocolEmployee(emp));
        } catch (error) {
            console.warn('⚠️ Pratakol əməkdaş siyahısı yüklənmədi:', error);
        }
        return [];
    }

    loadProtocols() {
        try { return JSON.parse(localStorage.getItem(this.getProtocolsStorageKey()) || '[]'); } catch (e) { return []; }
    }

    saveProtocols(protocols) { localStorage.setItem(this.getProtocolsStorageKey(), JSON.stringify(protocols.map(p => this.normalizeProtocolStatus(p)))); }

    normalizeProtocolStatus(protocol) {
        return { ...protocol, status: this.isProtocolCompleted(protocol) ? 'completed' : 'incomplete' };
    }

    isProtocolCompleted(protocol) {
        return Array.isArray(protocol?.participants) && protocol.participants.length > 0 && protocol.participants.every(p => p.status === 'accepted' || p.status === 'rejected');
    }

    getProtocolById(protocolId) { return this.loadProtocols().find(protocol => String(protocol.id) === String(protocolId)); }

    updateProtocol(protocolId, updater) {
        const protocols = this.loadProtocols();
        const index = protocols.findIndex(protocol => String(protocol.id) === String(protocolId));
        if (index === -1) return null;
        protocols[index] = this.normalizeProtocolStatus(updater(protocols[index]) || protocols[index]);
        this.saveProtocols(protocols);
        return protocols[index];
    }

    addProtocolNotification(notification) {
        const notifications = (() => { try { return JSON.parse(localStorage.getItem(this.getProtocolNotificationsKey()) || '[]'); } catch (e) { return []; } })();
        notifications.unshift({ id: `notification_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, createdAt: new Date().toISOString(), read: false, ...notification });
        localStorage.setItem(this.getProtocolNotificationsKey(), JSON.stringify(notifications));
    }

    protocolStatusLabels() { return { completed: 'Tamamlanıb', incomplete: 'Tamamlanmayıb' }; }
    participantStatusLabels() { return { pending: 'Gözləyir', accepted: 'Qəbul etdi', rejected: 'İmtina etdi' }; }

    async initProtocolNotesSection() {
        this.protocolEmployeesCache = await this.getProtocolEmployees();
        this.currentProtocolId = null;
        this.selectedProtocolEmployeeInfoId = null;
        const protocolListView = document.getElementById('protocolListView');
        const protocolDetailView = document.getElementById('protocolDetailView');
        const notesPage = document.getElementById('notesPageView');
        const showView = (view) => {
            [protocolListView, protocolDetailView, notesPage].forEach(el => el?.classList.add('hidden'));
            view?.classList.remove('hidden');
        };
        document.getElementById('openNotesPageBtn')?.addEventListener('click', () => { showView(notesPage); });
        document.querySelectorAll('[data-back-to-protocol-list]').forEach(btn => btn.addEventListener('click', () => { showView(protocolListView); this.renderProtocolLists(); }));
        document.getElementById('createProtocolBtn')?.addEventListener('click', () => this.openCreateProtocolModal());
        document.querySelectorAll('[data-close-create-protocol-modal]').forEach(btn => btn.addEventListener('click', () => this.closeCreateProtocolModal()));
        document.getElementById('protocolEmployeeSearch')?.addEventListener('input', () => this.renderProtocolEmployeeSelectList());
        document.getElementById('submitCreateProtocolBtn')?.addEventListener('click', () => this.createProtocolFromModal());
        document.getElementById('saveProtocolDetailNoteBtn')?.addEventListener('click', () => this.saveCurrentProtocolNote());
        document.getElementById('acceptProtocolBtn')?.addEventListener('click', () => this.respondToProtocol('accepted'));
        document.getElementById('rejectProtocolBtn')?.addEventListener('click', () => this.respondToProtocol('rejected'));
        document.querySelectorAll('[data-close-employee-info-modal]').forEach(btn => btn.addEventListener('click', () => this.closeEmployeeInfoModal()));
        document.getElementById('confirmEmployeeProtocolInfoBtn')?.addEventListener('click', () => this.confirmEmployeeProtocolInfo());
        showView(protocolListView);
        this.renderProtocolLists();
    }

    renderProtocolLists() {
        const protocols = this.loadProtocols().map(p => this.normalizeProtocolStatus(p));
        this.saveProtocols(protocols);
        const render = (items, emptyText) => items.length ? items.map(protocol => this.renderProtocolListItem(protocol)).join('') : `<div class="protocol-empty-state">${emptyText}</div>`;
        const completed = protocols.filter(p => p.status === 'completed');
        const incomplete = protocols.filter(p => p.status !== 'completed');
        const completedEl = document.getElementById('completedProtocolsList');
        const incompleteEl = document.getElementById('incompleteProtocolsList');
        if (completedEl) completedEl.innerHTML = render(completed, 'Tamamlanmış pratakol yoxdur.');
        if (incompleteEl) incompleteEl.innerHTML = render(incomplete, 'Tamamlanmamış pratakol yoxdur.');
        document.querySelectorAll('[data-open-protocol-detail]').forEach(item => item.addEventListener('click', () => this.openProtocolDetail(item.dataset.openProtocolDetail)));
    }

    renderProtocolListItem(protocol) {
        const labels = this.protocolStatusLabels();
        const counts = this.getProtocolCounts(protocol);
        return `<button class="protocol-list-item" type="button" data-open-protocol-detail="${this.escapeProtocolHtml(protocol.id)}">
            <div class="protocol-list-item-head"><span class="protocol-list-item-title">${this.escapeProtocolHtml(protocol.title)}</span><span class="protocol-status-badge ${protocol.status}">${labels[protocol.status]}</span></div>
            <div class="protocol-list-item-meta">${this.escapeProtocolHtml(protocol.createdDateAz)} • Rəhbər: ${this.escapeProtocolHtml(protocol.createdBy?.name || 'Rəhbər')} • İştirakçı: ${counts.total}</div>
            <div class="protocol-list-item-stats"><span><i class="fas fa-check"></i> ${counts.accepted}</span><span><i class="fas fa-times"></i> ${counts.rejected}</span><span><i class="fas fa-clock"></i> ${counts.pending}</span></div>
        </button>`;
    }

    getProtocolCounts(protocol) {
        const participants = Array.isArray(protocol.participants) ? protocol.participants : [];
        return { total: participants.length, accepted: participants.filter(p => p.status === 'accepted').length, rejected: participants.filter(p => p.status === 'rejected').length, pending: participants.filter(p => p.status === 'pending').length };
    }

    openCreateProtocolModal() {
        const modal = document.getElementById('createProtocolModal');
        const dateInput = document.getElementById('protocolCreateDate');
        const titleInput = document.getElementById('protocolTitleInput');
        const searchInput = document.getElementById('protocolEmployeeSearch');
        if (dateInput) dateInput.value = this.getTodayDateAz();
        if (titleInput) titleInput.value = '';
        if (searchInput) searchInput.value = '';
        this.renderProtocolEmployeeSelectList();
        modal?.classList.remove('hidden');
    }

    closeCreateProtocolModal() { document.getElementById('createProtocolModal')?.classList.add('hidden'); }

    renderProtocolEmployeeSelectList() {
        const list = document.getElementById('protocolEmployeeSelectList');
        if (!list) return;
        const term = (document.getElementById('protocolEmployeeSearch')?.value || '').toLowerCase().trim();
        const employees = (this.protocolEmployeesCache || []).filter(emp => `${emp.fullName} ${emp.department}`.toLowerCase().includes(term));
        list.innerHTML = employees.length ? employees.map(emp => `<label class="protocol-employee-select-row"><input type="checkbox" value="${this.escapeProtocolHtml(emp.id)}"><span class="protocol-participant-avatar">${this.escapeProtocolHtml(emp.fullName.charAt(0).toUpperCase())}</span><span><strong>${this.escapeProtocolHtml(emp.fullName)}</strong><small>${this.escapeProtocolHtml(emp.department || 'Şöbə qeyd edilməyib')}</small></span></label>`).join('') : '<div class="protocol-empty-state">Əməkdaş tapılmadı.</div>';
    }

    createProtocolFromModal() {
        const title = (document.getElementById('protocolTitleInput')?.value || '').trim();
        if (!title) { alert('Pratakolun başlığı boş ola bilməz.'); return; }
        const checked = [...document.querySelectorAll('#protocolEmployeeSelectList input[type="checkbox"]:checked')].map(input => input.value);
        if (!checked.length) { alert('Ən azı bir əməkdaş seçilməlidir.'); return; }
        const currentUser = this.getCurrentUserForProtocol();
        const selected = (this.protocolEmployeesCache || []).filter(emp => checked.includes(String(emp.id)));
        const protocol = {
            id: this.createProtocolId(), title, createdAt: new Date().toISOString(), createdDateAz: this.getTodayDateAz(),
            createdBy: { id: currentUser.id, name: currentUser.name }, status: 'incomplete', note: '',
            participants: selected.map(emp => ({ id: emp.id, name: emp.fullName, department: emp.department || 'Şöbə qeyd edilməyib', status: 'pending', respondedAt: null, note: '', confirmed: false }))
        };
        this.saveProtocols([protocol, ...this.loadProtocols()]);
        selected.forEach(emp => this.addProtocolNotification({ toUserId: emp.id, protocolId: protocol.id, text: `${currentUser.name} sizin üçün yeni pratakol yaratdı: ${title}` }));
        this.closeCreateProtocolModal();
        this.openProtocolDetail(protocol.id);
    }

    openProtocolDetail(protocolId) {
        const protocol = this.getProtocolById(protocolId);
        if (!protocol) return;
        this.currentProtocolId = protocol.id;
        document.getElementById('protocolListView')?.classList.add('hidden');
        document.getElementById('protocolDetailView')?.classList.remove('hidden');
        this.renderProtocolDetail();
    }

    renderProtocolDetail() {
        const protocol = this.getProtocolById(this.currentProtocolId);
        if (!protocol) return;
        const setText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text || ''; };
        setText('protocolDetailTitle', protocol.title); setText('protocolDetailDate', protocol.createdDateAz); setText('protocolDetailLeader', protocol.createdBy?.name || 'Rəhbər'); setText('protocolDetailProtocolTitle', protocol.title);
        const noteEl = document.getElementById('protocolDetailNoteText'); if (noteEl) noteEl.value = protocol.note || '';
        this.renderProtocolDetailParticipants(protocol);
        this.renderProtocolParticipantActions(protocol);
    }

    renderProtocolDetailParticipants(protocol) {
        const list = document.getElementById('protocolDetailParticipantsList');
        if (!list) return;
        const labels = this.participantStatusLabels();
        const canRemove = String(protocol.createdBy?.id) === String(this.getCurrentUserForProtocol().id);
        list.innerHTML = protocol.participants?.length ? protocol.participants.map(p => `<div class="protocol-participant-row" data-protocol-info-id="${this.escapeProtocolHtml(p.id)}"><div class="protocol-participant-left"><span class="protocol-participant-avatar">${this.escapeProtocolHtml((p.name || 'Ə').charAt(0).toUpperCase())}</span><span class="protocol-participant-main"><strong>${this.escapeProtocolHtml(p.name)}</strong><small>${this.escapeProtocolHtml(p.department || 'Şöbə qeyd edilməyib')}</small></span></div><span class="protocol-participant-status ${p.status}"><i class="fas ${p.status === 'accepted' ? 'fa-check' : p.status === 'rejected' ? 'fa-times' : 'fa-clock'}"></i> ${labels[p.status]}</span><span class="protocol-date-badge">${this.escapeProtocolHtml(p.respondedAt ? this.formatProtocolDateAz(p.respondedAt) : protocol.createdDateAz)}</span>${canRemove ? `<button class="protocol-remove-participant-btn" type="button" data-remove-protocol-participant="${this.escapeProtocolHtml(p.id)}"><i class="fas fa-trash"></i></button>` : ''}</div>`).join('') : '<div class="protocol-empty-state">İştirakçı yoxdur.</div>';
        list.querySelectorAll('[data-protocol-info-id]').forEach(row => row.addEventListener('click', () => this.openEmployeeInfoModal(row.dataset.protocolInfoId)));
        list.querySelectorAll('[data-remove-protocol-participant]').forEach(btn => btn.addEventListener('click', e => { e.stopPropagation(); this.removeProtocolParticipant(btn.dataset.removeProtocolParticipant); }));
    }

    formatProtocolDateAz(iso) { try { return new Date(iso).toLocaleDateString('az-AZ'); } catch (e) { return ''; } }

    renderProtocolParticipantActions(protocol) {
        const actions = document.getElementById('protocolParticipantActions');
        const currentUser = this.getCurrentUserForProtocol();
        const participant = protocol.participants?.find(p => String(p.id) === String(currentUser.id));
        const isCreator = String(protocol.createdBy?.id) === String(currentUser.id);
        actions?.classList.toggle('hidden', !participant || isCreator || participant.status !== 'pending');
    }

    saveCurrentProtocolNote() {
        const note = document.getElementById('protocolDetailNoteText')?.value || '';
        const currentUser = this.getCurrentUserForProtocol();
        this.updateProtocol(this.currentProtocolId, protocol => {
            protocol.note = note;
            const participant = protocol.participants?.find(p => String(p.id) === String(currentUser.id));
            if (participant && String(protocol.createdBy?.id) !== String(currentUser.id)) participant.note = note;
            return protocol;
        });
        document.getElementById('saveProtocolDetailNoteBtn')?.classList.add('protocol-saved');
        setTimeout(() => document.getElementById('saveProtocolDetailNoteBtn')?.classList.remove('protocol-saved'), 1200);
        this.renderProtocolDetail();
    }

    respondToProtocol(status) {
        const currentUser = this.getCurrentUserForProtocol();
        const updated = this.updateProtocol(this.currentProtocolId, protocol => {
            const participant = protocol.participants?.find(p => String(p.id) === String(currentUser.id));
            if (participant && participant.status === 'pending' && String(protocol.createdBy?.id) !== String(currentUser.id)) { participant.status = status; participant.respondedAt = new Date().toISOString(); participant.note = document.getElementById('protocolDetailNoteText')?.value || participant.note || ''; }
            return protocol;
        });
        if (updated) this.addProtocolNotification({ toUserId: updated.createdBy?.id, protocolId: updated.id, text: `${currentUser.name} pratakolu ${status === 'accepted' ? 'qəbul etdi' : 'pratakoldan imtina etdi'}: ${updated.title}` });
        this.renderProtocolDetail();
    }

    removeProtocolParticipant(participantId) {
        if (!confirm('Bu əməkdaşı pratakoldan çıxartmaq istəyirsiniz?')) return;
        this.updateProtocol(this.currentProtocolId, protocol => {
            const participant = protocol.participants?.find(p => String(p.id) === String(participantId));
            if (participant) {
                const log = (() => { try { return JSON.parse(localStorage.getItem(this.getProtocolRemovedLogKey()) || '[]'); } catch (e) { return []; } })();
                log.push({ protocolId: protocol.id, removedAt: new Date().toISOString(), participant });
                localStorage.setItem(this.getProtocolRemovedLogKey(), JSON.stringify(log));
            }
            protocol.participants = (protocol.participants || []).filter(p => String(p.id) !== String(participantId));
            return protocol;
        });
        this.renderProtocolDetail();
    }

    openEmployeeInfoModal(participantId) {
        const protocol = this.getProtocolById(this.currentProtocolId);
        const participant = protocol?.participants?.find(p => String(p.id) === String(participantId));
        if (!participant) return;
        this.selectedProtocolEmployeeInfoId = participant.id;
        const labels = this.participantStatusLabels();
        const content = document.getElementById('protocolEmployeeInfoContent');
        if (content) content.innerHTML = `<div class="protocol-detail-row"><strong>${this.escapeProtocolHtml(participant.name)}</strong></div><div class="protocol-detail-row">Tarix: ${this.escapeProtocolHtml(participant.respondedAt ? this.formatProtocolDateAz(participant.respondedAt) : protocol.createdDateAz)}</div><div class="protocol-detail-row">Status: ${this.escapeProtocolHtml(labels[participant.status])}</div><div class="protocol-detail-row"><strong>Əməkdaşın qeydi:</strong><p>${this.escapeProtocolHtml(participant.note || 'Qeyd yoxdur.')}</p></div>`;
        document.getElementById('protocolEmployeeInfoModal')?.classList.remove('hidden');
    }

    closeEmployeeInfoModal() { document.getElementById('protocolEmployeeInfoModal')?.classList.add('hidden'); }

    confirmEmployeeProtocolInfo() {
        const participantId = this.selectedProtocolEmployeeInfoId;
        this.updateProtocol(this.currentProtocolId, protocol => { const p = protocol.participants?.find(item => String(item.id) === String(participantId)); if (p) p.confirmed = true; return protocol; });
        this.closeEmployeeInfoModal();
        this.renderProtocolDetail();
    }

    injectProtocolNotesStyles() {
        if (document.getElementById('protocolNotesStyles')) return;
        const style = document.createElement('style');
        style.id = 'protocolNotesStyles';
        style.textContent = `
            .hidden{display:none!important}.protocol-full-height-mode{min-height:calc(100vh - 32px)}#protocolNotesSection{min-height:calc(100vh - 32px);display:flex;flex-direction:column;box-sizing:border-box}.protocol-full-height-mode .protocol-notes-page{min-height:calc(100vh - 96px)}.protocol-notes-page{min-height:calc(100vh - 96px);display:flex;flex-direction:column;box-sizing:border-box;overflow-x:hidden;padding-top:18px!important;padding-bottom:24px!important}.protocol-notes-header{display:flex;align-items:center;gap:16px;margin-bottom:12px!important}.protocol-notes-icon{width:56px;height:56px;border-radius:22px;display:grid;place-items:center;background:rgba(59,130,246,.12);color:#2563eb;font-size:24px}.protocol-notes-header h2{margin:0;color:#1f2937;font-size:30px;font-weight:800}.protocol-notes-header p,.protocol-card-header p{margin:4px 0 0;color:#64748b;font-size:14px}.protocol-page-view{margin-top:4px!important}.protocol-page-top,.protocol-modal-header,.protocol-modal-actions{display:flex;align-items:center;justify-content:space-between;gap:16px}.protocol-page-top{gap:16px;margin-top:4px!important;margin-bottom:18px!important}.protocol-page-top-clean{display:flex;align-items:flex-start;justify-content:flex-end;gap:16px;margin-top:8px!important;margin-bottom:18px!important}.protocol-page-title-wrap{display:none!important}.protocol-page-title-wrap h2,.protocol-page-top h2{margin:0;font-size:30px;font-weight:800;color:#1f2937}.protocol-page-actions,.protocol-actions-stack{display:flex;flex-direction:column;align-items:flex-end;justify-content:flex-end;gap:12px}.protocol-page-actions-inline{flex-direction:row;align-items:center}.protocol-page-actions-stacked{flex-direction:column;align-items:flex-end}.protocol-notes-label-row{display:inline-flex;align-items:center;justify-content:flex-end;gap:12px}.protocol-back-btn,.protocol-create-btn,.protocol-secondary-btn{border:none;border-radius:18px;padding:12px 18px;background:rgba(239,246,255,.95);color:#2563eb;font-weight:800;cursor:pointer;box-shadow:0 10px 24px rgba(37,99,235,.12);display:inline-flex;align-items:center;gap:8px}.protocol-secondary-btn{border:1px solid rgba(59,130,246,.18);border-radius:20px;background:rgba(255,255,255,.78);padding:14px 20px;box-shadow:0 12px 28px rgba(15,23,42,.06);transition:all .22s ease}.protocol-secondary-btn:hover{transform:translateY(-2px);box-shadow:0 16px 34px rgba(37,99,235,.14)}.protocol-notes-round-btn{width:64px;height:64px;min-width:64px;border-radius:50%;border:1px solid rgba(59,130,246,.22);background:rgba(255,255,255,.88);color:#2563eb;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 14px 32px rgba(15,23,42,.08);transition:all .22s ease}.protocol-notes-round-btn i{font-size:24px;color:#3b82f6}.protocol-notes-round-btn:hover{transform:translateY(-2px);background:rgba(239,246,255,.96);box-shadow:0 18px 38px rgba(37,99,235,.16)}.protocol-notes-label{font-size:22px;font-weight:800;color:#1f2937;line-height:1;user-select:none;pointer-events:none}.protocol-create-btn,.protocol-save-btn{background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff}.protocol-lists-grid{display:grid;grid-template-columns:repeat(2,minmax(340px,1fr));gap:20px!important;margin-top:10px!important;align-items:stretch}.protocol-list-card,.protocol-modal-card,.protocol-info-card,.protocol-participants-card,.protocol-notes-card{border-radius:28px;background:rgba(255,255,255,.76);border:1px solid rgba(226,232,240,.85);box-shadow:0 18px 50px rgba(15,23,42,.08);backdrop-filter:blur(18px)}.protocol-list-card{padding:22px!important;min-height:330px}.protocol-list-card h3{margin:0 0 14px!important;font-size:24px;font-weight:800;color:#1f2937}.protocol-list-item{width:100%;text-align:left;border-radius:18px;background:rgba(248,250,252,.94);border:1px solid rgba(226,232,240,.8);padding:16px;margin-top:12px;cursor:pointer;transition:all .2s ease}.protocol-list-item:hover{transform:translateY(-2px);box-shadow:0 14px 30px rgba(37,99,235,.12)}.protocol-list-item-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.protocol-list-item-title{font-size:18px;font-weight:800;color:#1f2937}.protocol-list-item-meta{margin-top:6px;font-size:14px;color:#64748b}.protocol-list-item-stats{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;color:#475569;font-weight:700}.protocol-status-badge,.protocol-participant-status{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:6px 10px;font-size:13px;font-weight:700}.protocol-status-badge.completed,.protocol-participant-status.accepted{background:rgba(34,197,94,.12);color:#16a34a}.protocol-status-badge.incomplete,.protocol-participant-status.pending{background:rgba(245,158,11,.14);color:#d97706}.protocol-participant-status.rejected{background:rgba(239,68,68,.12);color:#dc2626}.protocol-modal{position:fixed;inset:0;background:rgba(15,23,42,.38);backdrop-filter:blur(10px);display:grid;place-items:center;z-index:9999}.protocol-modal.hidden{display:none!important}.protocol-modal-card{width:min(780px,calc(100vw - 40px));max-height:88vh;overflow-y:auto;padding:28px}.protocol-small-modal-card{width:min(520px,calc(100vw - 40px))}.protocol-modal-header h3{margin:0;color:#1f2937;font-size:22px;font-weight:800}.protocol-modal-header button{width:38px;height:38px;border:none;border-radius:14px;background:rgba(239,246,255,.9);color:#2563eb;cursor:pointer}.protocol-form-group{margin-top:18px}.protocol-form-group label{display:block;margin-bottom:8px;font-weight:800;color:#1f2937}.protocol-form-group input{width:100%;border-radius:18px;border:1px solid rgba(203,213,225,.8);padding:14px 16px;font-family:inherit;font-size:16px;outline:none;box-sizing:border-box}.protocol-employee-select-list{max-height:280px;overflow-y:auto;border-radius:18px;border:1px solid rgba(226,232,240,.85);padding:10px;margin-top:12px}.protocol-employee-select-row{display:flex;align-items:center;gap:12px;padding:12px;border-radius:14px}.protocol-employee-select-row:hover{background:rgba(239,246,255,.85)}.protocol-employee-select-row input{width:18px;height:18px;accent-color:#2563eb}.protocol-top-grid{display:grid;gap:20px;margin-bottom:24px}.protocol-top-grid-three{grid-template-columns:repeat(3,minmax(220px,1fr))}.protocol-info-card,.protocol-participants-card,.protocol-notes-card{padding:24px}.protocol-info-card span{display:block;color:#64748b;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.06em}.protocol-info-card strong{display:block;margin-top:8px;color:#1f2937;font-size:24px}.protocol-main-grid{display:grid;grid-template-columns:minmax(320px,.9fr) minmax(420px,1.4fr);gap:24px;align-items:stretch}.protocol-card-header{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:18px}.protocol-card-header h3,.protocol-notes-card h3{margin:0;color:#1f2937;font-size:20px;font-weight:800}.protocol-participant-row{border-radius:18px;background:rgba(248,250,252,.94);border:1px solid rgba(226,232,240,.8);padding:14px;display:flex;align-items:center;justify-content:space-between;gap:14px;cursor:pointer;margin-bottom:12px}.protocol-participant-left{display:flex;align-items:center;gap:12px;min-width:0;flex:1}.protocol-participant-avatar{width:42px;height:42px;min-width:42px;border-radius:50%;display:grid;place-items:center;background:rgba(59,130,246,.13);color:#2563eb;font-weight:800}.protocol-participant-main{display:flex;flex:1;min-width:0;flex-direction:column}.protocol-participant-main strong,.protocol-employee-select-row strong{color:#1f2937}.protocol-participant-main small,.protocol-employee-select-row small{display:block;color:#64748b}.protocol-date-badge{border-radius:999px;background:rgba(37,99,235,.1);color:#2563eb;padding:6px 10px;font-size:12px;font-weight:800}.protocol-remove-participant-btn{border:none;border-radius:12px;background:rgba(239,68,68,.1);color:#dc2626;width:34px;height:34px;cursor:pointer}.protocol-notes-card textarea{width:100%;min-height:260px;border-radius:22px;border:1px solid rgba(203,213,225,.75);background:rgba(255,255,255,.86);resize:vertical;padding:18px;font-family:inherit;font-size:16px;color:#1f2937;outline:none;box-sizing:border-box;margin-bottom:16px}.protocol-empty-state{border-radius:18px;background:rgba(248,250,252,.72);border:1px dashed rgba(148,163,184,.5);padding:18px;text-align:center;color:#64748b}.protocol-save-btn,.protocol-modal-actions button{border:none;border-radius:18px;font-weight:800;padding:12px 18px;cursor:pointer}.protocol-save-btn.protocol-saved{background:linear-gradient(135deg,#22c55e,#16a34a)}.protocol-modal-actions button:first-child{background:rgba(226,232,240,.85);color:#334155}.protocol-participant-actions{display:flex;gap:12px;margin-top:16px}.protocol-accept-btn{border:none;border-radius:16px;background:#22c55e;color:#fff;font-weight:800;padding:12px 18px;cursor:pointer}.protocol-reject-btn{border:none;border-radius:16px;background:#ef4444;color:#fff;font-weight:800;padding:12px 18px;cursor:pointer}.protocol-detail-row{color:#334155;margin:12px 0}.protocol-notes-placeholder{min-height:180px}@media (max-width:1100px){.protocol-lists-grid,.protocol-main-grid,.protocol-top-grid,.protocol-top-grid-three{grid-template-columns:1fr}}@media (max-width:900px){.protocol-page-top{flex-direction:column;align-items:stretch;gap:14px}.protocol-page-top-clean{align-items:stretch}.protocol-page-title-wrap{text-align:left}.protocol-page-actions,.protocol-actions-stack,.protocol-page-actions-stacked,.protocol-page-actions-inline{width:100%;align-items:flex-start;justify-content:flex-start}.protocol-notes-round-btn{width:56px;height:56px;min-width:56px}.protocol-notes-label{font-size:20px}.protocol-lists-grid{grid-template-columns:1fr}}@media (max-width:800px){.protocol-notes-page{padding:20px}.protocol-participant-row{align-items:flex-start;flex-direction:column}}
        `;
        document.head.appendChild(style);
    }

    /**
     * Dashboard üçün scroll rejimini yalnız Əsas səhifə aktiv olanda saxla.
     */
    setDashboardScrollMode(isDashboard) {
        if (isDashboard) {
            this.applyDashboardScrollMode();
        } else {
            this.removeDashboardScrollMode();
        }
    }

    /**
     * Əsas səhifə üçün ümumi səhifə scrollunu söndür, Son Aktivliklər panelinin
     * öz daxili scroll rejimini aktiv saxla.
     */
    applyDashboardScrollMode() {
        document.body.classList.add('profile-dashboard-active');
        document.getElementById('profileContent')?.classList.remove('companies-scroll-mode');

        const profileContent = document.getElementById('profileContent');
        const dashboardSection = document.getElementById('dashboardSection');

        if (!profileContent || !dashboardSection) return;

        profileContent.classList.add('dashboard-scroll-mode');
        dashboardSection.classList.add('dashboard-scroll-ready');

        // clearAllSections() klik zamanı inline display:none yazır; dashboard klikində
        // display:block saxlanarsa CSS-dəki flex layoutu üstələyir və daxili scroll itir.
        dashboardSection.style.removeProperty('display');
        window.dashboardManager?.scheduleRecentActivitiesFullRowFit?.();
    }

    /**
     * Dashboarddan başqa bölmələrdə normal profileContent scroll davranışını bərpa et.
     */
    removeDashboardScrollMode() {
        document.body.classList.remove('profile-dashboard-active');

        const profileContent = document.getElementById('profileContent');
        const dashboardSection = document.getElementById('dashboardSection');

        profileContent?.classList.remove('dashboard-scroll-mode');
        dashboardSection?.classList.remove('dashboard-scroll-ready');
    }

    /**
     * BÜTÜN BÖLMƏLƏRİ TƏMİZLƏ
     */
    clearAllSections() {
        console.log('🧹 Bütün bölmələr təmizlənir...');

        // Restore padding if it was removed
        const container = document.querySelector('main .overflow-y-auto');
        if (container) {
            container.classList.add('p-8');
            container.classList.remove('profile-content-task-active');
            container.classList.remove('protocol-full-height-mode');
        }
        document.body.classList.remove('task-manager-open');
        this.setDashboardScrollMode(false);

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
            'taskManagerSection',
            'protocolNotesSection'
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
        initVoenModalEvents();
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
// main.js - init funksiyasına əlavə edin

function initVoenModalEvents() {
    // Modal bağlama
    const closeBtn = document.getElementById('closeVoenInfoModal');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            const modal = document.getElementById('voenInfoModal');
            if (modal) {
                modal.classList.add('hidden');
                modal.style.display = 'none';
            }
        });
    }

    // Modal xaricinə klik
    const modal = document.getElementById('voenInfoModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
                modal.style.display = 'none';
            }
        });
    }

    // ESC düyməsi
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modalEl = document.getElementById('voenInfoModal');
            if (modalEl && modalEl.style.display === 'flex') {
                modalEl.classList.add('hidden');
                modalEl.style.display = 'none';
            }
        }
    });
}
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
// ==================== QRCodeService AVTOMAT İNİT ====================
(function() {
    console.log('🔧 QRCodeService avtomatik init başlayır...');

    // Əgər artıq qlobal instance varsa, onu istifadə et
    if (window.qrService && window.qrService._initialized) {
        console.log('✅ QRCodeService artıq init olunub');
        return;
    }

    // ApiService yoxlanışı
    if (typeof window.apiService === 'undefined' && typeof ApiService !== 'undefined') {
        window.apiService = new ApiService();
        console.log('✅ ApiService yaradıldı');
    }

    // QRCodeService yarat
    if (typeof window.qrService === 'undefined' || !window.qrService._initialized) {
        if (window.apiService) {
            window.qrService = new QRCodeService(window.apiService);
            console.log('✅ QRCodeService instance yaradıldı');
        } else {
            console.error('❌ ApiService tapılmadı!');
        }
    }

    // DOM hazır olduqda init et
    function initQR() {
        if (window.qrService && !window.qrService._initialized) {
            window.qrService.initQrCodeModal();
            console.log('✅ QRCodeService init edildi (DOM-ready)');
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initQR);
    } else {
        // DOM artıq hazırdırsa, bir az gecikmə ilə çağır
        setTimeout(initQR, 300);
    }

    console.log('✅ QRCodeService avtomatik init tamamlandı');
})();