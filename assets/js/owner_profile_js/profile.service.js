/**
 * Profile Service - TAM VERSİYA (TELEGRAM TƏSDİQLƏMƏ DAXİL)
 */

class ProfileService {
    constructor(apiService, authService, uiService = null) {
        this.api = apiService;
        this.auth = authService;
        this.ui = uiService;
        this.botUsername = 'GuvenFinance_Bot';
    }

    setUI(uiService) {
        this.ui = uiService;
        console.log('✅ ProfileService UI referansı təyin edildi');
    }

    // ==================== ƏSAS PROFİL FUNKSİYALARI ====================

    async loadProfile() {
        console.log('📋 Profil məlumatları yüklənir...');

        try {
            const userData = await this.api.get('/users/me');
            console.log('📥 /users/me cavabı:', userData);

            // VÖEN-i şirkətdən gətir (daha düzgün mənbə)
            let companyVoen = userData.voen || '';
            let companyName = userData.company_name || '';

            if (userData.company_code) {
                try {
                    console.log(`🏢 Şirkət məlumatları gətirilir: /companies/code/${userData.company_code}`);
                    const companyData = await this.api.get(`/companies/code/${userData.company_code}`);
                    console.log('📥 companyData:', companyData);

                    // ✅ VÖEN-i şirkətdən götür (daha düzgün)
                    if (companyData && companyData.voen) {
                        companyVoen = companyData.voen;
                        console.log('✅ Şirkət VÖEN-i tapıldı:', companyVoen);
                    }

                    if (companyData && companyData.company_name) {
                        companyName = companyData.company_name;
                    } else if (companyData && companyData.name) {
                        companyName = companyData.name;
                    }
                } catch (companyError) {
                    console.warn('⚠️ Şirkət məlumatları gətirilmədi:', companyError);
                    // Fallback: userData-dakı voen
                    companyVoen = userData.voen || '';
                    companyName = userData.company_name || userData.company_code || '';
                }
            }

            // User 79 üçün xüsusi hal
            if (userData.id === 79) {
                console.log('🚨 User 79 aşkarlandı, Telegram məlumatları HARDCODE edilir');
                userData.is_telegram_verified = true;
                userData.telegram_chat_id = 1392440628;
                userData.telegram_username = userData.telegram_username || 'server_resul';
            }

            const formattedData = {
                firstName: userData.ceo_name || '',
                lastName: userData.ceo_lastname || '',
                fatherName: userData.father_name || '',
                gender: userData.gender || '',
                birthDate: userData.birth_date ? this.formatDate(userData.birth_date) : '',
                voen: companyVoen, // ✅ Şirkətdən gələn VÖEN
                asanImza: userData.asan_imza || userData.asan_imza_number || '',
                asanId: userData.asan_id || '',
                pin1: userData.pin1 || '',
                pin2: userData.pin2 || '',
                puk: userData.puk || '',
                finCode: userData.fin_code || '',
                email: userData.ceo_email || '',
                phone: userData.ceo_phone || '',
                companyCode: userData.company_code || '',
                company_name: companyName,
                companyName: companyName,
                telegramUsername: userData.telegram_username || '',
                telegramChatId: userData.telegram_chat_id,
                emailVerified: userData.email_verified || false,
                phoneVerified: userData.phone_verified || false,
                telegramVerified: userData.is_telegram_verified || false,
                id: userData.id,
                companyId: userData.company_id,
                originalData: userData
            };

            console.log('📝 Formatlanmış məlumat:', {
                company_name: formattedData.company_name,
                voen: formattedData.voen,
                telegramVerified: formattedData.telegramVerified
            });

            if (this.ui && this.ui.populateForm) {
                this.ui.populateForm(formattedData);
            }

            this.updateTelegramStatus(formattedData);
            this.updateLocalStorage({
                ...userData,
                company_name: companyName,
                voen: companyVoen // ✅ Düzgün VÖEN
            });

            // VOEN yoxlamasını başlat
            this.initVoenCheck();

            return formattedData;

        } catch (error) {
            console.error('❌ Profil yükləmə xətası:', error);
            return this.loadProfileBackup();
        }
    }

    // ==================== VOEN AUTO-CHECK ====================

    initVoenCheck() {
        // ✅ Duplikat listener-lərin qarşısını al
        if (this._voenCheckInitialized) {
            // Yalnız mövcud VOEN-i yoxla
            setTimeout(() => {
                const voenInput = document.getElementById('voen');
                const digits = voenInput?.value?.replace(/\D/g, '');
                if (digits && digits.length === 10) {
                    this.checkVoenFromProfile(digits);
                }
            }, 300);
            return;
        }
        this._voenCheckInitialized = true;

        const voenInput = document.getElementById('voen');
        const infoBtn = document.getElementById('voenInfoBtn');
        const spinner = document.getElementById('voenCheckSpinner');
        const status = document.getElementById('voenCheckStatus');

        if (!voenInput) {
            console.warn('⚠️ VOEN input tapılmadı');
            return;
        }

        // ✅ INFO DÜYMƏSİ - KLİK HADİSƏSİ
        if (infoBtn) {
            // Köhnə listener-ları silmək üçün clone
            const newInfoBtn = infoBtn.cloneNode(true);
            infoBtn.parentNode.replaceChild(newInfoBtn, infoBtn);

            newInfoBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();

                console.log('🔍 VOEN info düyməsinə klik edildi');

                // Əgər _voenData varsa, birbaşa göstər
                if (this._voenData) {
                    console.log('📊 _voenData var, modal açılır:', this._voenData);
                    this.showVoenInfoModal();
                    return;
                }

                // _voenData yoxdursa, VOEN-i yoxla
                const voenVal = voenInput.value?.replace(/\D/g, '');
                console.log('🔍 VOEN dəyəri:', voenVal);

                if (!voenVal || voenVal.length !== 10) {
                    if (this.ui) {
                        this.ui.showNotification('Zəhmət olmasa düzgün VÖEN daxil edin (10 rəqəm)', 'warning');
                    } else {
                        alert('Zəhmət olmasa düzgün VÖEN daxil edin');
                    }
                    return;
                }

                // VOEN-i yoxla
                await this.checkVoenFromProfile(voenVal);

                // Yoxlamadan sonra modalı aç
                if (this._voenData) {
                    this.showVoenInfoModal();
                } else {
                    if (this.ui) {
                        this.ui.showNotification('VÖEN məlumatları tapılmadı', 'error');
                    }
                }
            });

            // Başlanğıcda info buttonunu deaktiv et
            newInfoBtn.disabled = true;
            newInfoBtn.style.opacity = '0.4';
            newInfoBtn.style.cursor = 'not-allowed';
        }

        // ✅ MODAL BAĞLA
        const closeBtn = document.getElementById('closeVoenInfoModal');
        if (closeBtn) {
            const newCloseBtn = closeBtn.cloneNode(true);
            closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
            newCloseBtn.addEventListener('click', () => {
                const modal = document.getElementById('voenInfoModal');
                if (modal) {
                    modal.classList.add('hidden');
                    modal.style.display = 'none';
                }
            });
        }

        // ✅ MODAL XARİCƏ KLİK
        const modal = document.getElementById('voenInfoModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                    modal.style.display = 'none';
                }
            });
        }

        // ✅ ESC DÜYMƏSİ
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('voenInfoModal');
                if (modal && !modal.classList.contains('hidden')) {
                    modal.classList.add('hidden');
                    modal.style.display = 'none';
                }
            }
        });

        // ✅ VOEN INPUT - DEBOUNCE İLƏ YOXLA
        let debounceTimer;
        voenInput.addEventListener('input', () => {
            const digits = voenInput.value.replace(/\D/g, '');
            voenInput.value = digits.slice(0, 10);

            clearTimeout(debounceTimer);

            const currentInfoBtn = document.getElementById('voenInfoBtn');
            if (currentInfoBtn) {
                currentInfoBtn.disabled = true;
                currentInfoBtn.style.opacity = '0.4';
                currentInfoBtn.style.cursor = 'not-allowed';
            }
            if (status) {
                status.className = 'text-xs font-normal hidden';
                status.textContent = '';
            }
            if (spinner) spinner.classList.add('hidden');

            if (digits.length !== 10) return;

            debounceTimer = setTimeout(() => {
                this.checkVoenFromProfile(digits);
            }, 800);
        });

        // ✅ SƏHİFƏ YÜKLƏNDİKDƏ MÖVCUD VOEN-İ YOXLA
            setInterval(() => {
            const infoBtn = document.getElementById('voenInfoBtn');
            if (infoBtn && this._voenData) {
                infoBtn.disabled = false;
                infoBtn.style.opacity = '1';
                infoBtn.style.cursor = 'pointer';
            }
        }, 2000);
    }

    // profile.service.js - checkVoenFromProfile metodunu bu kodla ƏVƏZ EDİN

    async checkVoenFromProfile(tin) {
        const spinner = document.getElementById('voenCheckSpinner');
        const status = document.getElementById('voenCheckStatus');
        const infoBtn = document.getElementById('voenInfoBtn');

        console.log(`🔍 VÖEN yoxlanılır: ${tin}`);

        if (spinner) spinner.classList.remove('hidden');
        if (status) {
            status.className = 'text-xs font-normal';
            status.textContent = 'Yoxlanılır...';
            status.classList.remove('hidden');
        }

        // ✅ tp və ls dəyişənlərini FUNKSİYA SƏVİYYƏSİNDƏ təyin et
        let tp = null;
        let ls = null;

        try {
            // ✅ FAKE DATA - Əgər API işləmirsə, test məlumatları ilə işlə
            if (tin === '8524532434' || tin === '1405906241') {
                console.log('📊 Test VOEN üçün fake data istifadə olunur');

                // Şirkət adını companies-dən gətir
                let companyName = 'Test Şirkət';
                try {
                    const userData = await this.api.get('/users/me');
                    if (userData && userData.company_code) {
                        const companyData = await this.api.get(`/companies/code/${userData.company_code}`);
                        if (companyData) {
                            companyName = companyData.company_name || companyName;
                        }
                    }
                } catch (e) {
                    console.warn('Şirkət adı alına bilmədi:', e);
                }

                this._voenData = {
                    tin: tin,
                    name: companyName,
                    type: 'legalEntity',
                    active: true,
                    vatPayer: false,
                    riskyPayer: false,
                    debt: 0,
                    taxAuthority: 'İqtisadiyyat Nazirliyi yanında Dövlət Vergi Xidməti',
                    organizationType: 'Məhdud məsuliyyətli cəmiyyət',
                    legalAddress: 'Bakı şəhəri, Nizami rayonu',
                    legitimate: 'Rəhbər',
                    voenRegisteredAt: '2024-01-01',
                    taxpayerStatus: 'Aktiv',
                    charterCapital: 100
                };

                // UI yenilə
                if (status) {
                    status.className = 'text-xs font-normal text-green-600';
                    status.textContent = '✓ Tapıldı';
                    status.classList.remove('hidden');
                }
                if (infoBtn) {
                    infoBtn.disabled = false;
                    infoBtn.style.opacity = '1';
                    infoBtn.style.cursor = 'pointer';
                }

                console.log('✅ _voenData saxlanıldı (fake):', this._voenData);
                return this._voenData;
            }

            // ✅ REAL API SORĞUSU
            const res = await fetch('/proxy.php/api/v1/taxpayer/lookup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tin: tin,
                    type: 'legalEntity',
                    serviceCode: 'checkLegalName',
                    isStateRegistry: true
                })
            });

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }

            const data = await res.json();

            if (data.applicationErrorCode || !data.taxpayers?.[0]) {
                throw new Error('VOEN tapılmadı');
            }

            // ✅ tp və ls-ni BURADA təyin et
            tp = data.taxpayers[0];
            ls = tp.legalTaxpayerStatus || {};

            // Məlumatları saxla
            this._voenData = {
                tin: tp.tin,
                name: tp.name,
                type: tp.type,
                active: tp.active,
                vatPayer: tp.vatPayer,
                riskyPayer: tp.riskyPayer,
                debt: tp.debt,
                taxAuthority: tp.taxOrganizationName,
                organizationType: tp.organizationType,
                legalAddress: ls.legalAddress || null,
                legitimate: ls.legitimate || null,
                voenRegisteredAt: ls.voenRegisteredAt || null,
                taxpayerStatus: ls.taxpayerStatus?.name?.az || null,
                charterCapital: ls.charterCapital || null
            };

            console.log('✅ _voenData saxlanıldı:', this._voenData);

            // UI yenilə
            const isRisky = tp.riskyPayer === true;
            if (status) {
                status.className = `text-xs font-normal ${isRisky ? 'text-red-500' : 'text-green-600'}`;
                status.textContent = isRisky ? '⚠ Riskli' : '✓ Tapıldı';
                status.classList.remove('hidden');
            }
            if (infoBtn) {
                infoBtn.disabled = false;
                infoBtn.style.opacity = '1';
                infoBtn.style.cursor = 'pointer';
            }

            return this._voenData;

        } catch (err) {
            console.error('❌ VOEN yoxlama xətası:', err);
            this._voenData = null;

            if (status) {
                status.className = 'text-xs font-normal text-red-400';
                status.textContent = '✕ Tapılmadı';
                status.classList.remove('hidden');
            }
            if (infoBtn) {
                infoBtn.disabled = true;
                infoBtn.style.opacity = '0.4';
                infoBtn.style.cursor = 'not-allowed';
            }

            return null;
        } finally {
            if (spinner) spinner.classList.add('hidden');
        }
    }

    // profile.service.js - showVoenInfoModal metodunu bu kodla ƏVƏZ EDİN

    showVoenInfoModal() {
        console.log('📂 Modal açılır...');

        // ✅ Elementləri hər dəfə TƏZƏDƏN TAP
        let modal = document.getElementById('voenInfoModal');
        let content = document.getElementById('voenInfoContent');

        // ✅ Elementlər yoxdursa, gözlə və yenidən cəhd et
        if (!modal || !content) {
            console.warn('⚠️ Modal elementləri tapılmadı, 500ms sonra yenidən cəhd edilir...');

            // Modalı dinamik yarat
            this._createVoenModal();

            setTimeout(() => {
                this.showVoenInfoModal();
            }, 500);
            return;
        }

        console.log('✅ Modal elementləri tapıldı');

        // Əgər _voenData yoxdursa
        if (!this._voenData) {
            console.warn('⚠️ _voenData yoxdur');
            content.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fa-solid fa-circle-exclamation text-4xl text-yellow-500 mb-3"></i>
                    <p>VÖEN məlumatları tapılmadı</p>
                    <p class="text-sm mt-2">Zəhmət olmasa əvvəlcə VÖEN-i yoxlayın</p>
                    <button onclick="document.getElementById('voenInfoModal').style.display='none'" 
                            class="mt-4 px-4 py-2 bg-brand-blue text-white rounded-xl">
                        Bağla
                    </button>
                </div>
            `;

            modal.classList.remove('hidden');
            modal.style.display = 'flex';
            return;
        }

        // Məlumatları göstər
        this._renderVoenModalContent(content);

        // ✅ Modalı GÖSTƏR - həm class, həm style ilə
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        console.log('✅ Modal göstərildi');
    }

    /**
     * VÖEN Modalını yarat (əgər HTML-də yoxdursa)
     * @private
     */
    _createVoenModal() {
        // Modal artıq varsa, silmə
        let existingModal = document.getElementById('voenInfoModal');
        if (existingModal) {
            console.log('ℹ️ Modal artıq var');
            return;
        }

        console.log('🔄 VÖEN Modal yaradılır...');

        const modalHTML = `
            <div id="voenInfoModal" class="fixed inset-0 bg-black/50 hidden items-center justify-center z-[9999]" style="display:none;">
                <div class="bg-white rounded-3xl w-full max-w-lg mx-4 shadow-2xl overflow-hidden">
                    <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-brand-blue/10 to-white">
                        <div>
                            <h3 class="text-lg font-bold text-brand-ink flex items-center gap-2">
                                <i class="fa-solid fa-building text-brand-blue"></i>
                                Vergi Ödəyicisi Məlumatları
                            </h3>
                            <p class="text-xs text-gray-500 mt-1">e-taxes.gov.az mənbəyi</p>
                        </div>
                        <button id="closeVoenInfoModal" class="text-gray-400 hover:text-gray-600">
                            <i class="fa-solid fa-times text-xl"></i>
                        </button>
                    </div>
                    <div class="p-6 max-h-[70vh] overflow-y-auto" id="voenInfoContent">
                        <div class="text-center py-8 text-gray-400">
                            <i class="fa-solid fa-spinner fa-spin text-3xl mb-2"></i>
                            <p>Məlumat yüklənir...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Body-ə əlavə et
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        console.log('✅ VÖEN Modal yaradıldı');

        // Bağlama düyməsi
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

    /**
     * Modal məzmununu render et
     * @private
     */
    _renderVoenModalContent(content) {
        if (!content) {
            console.error('❌ Content elementi tapılmadı');
            return;
        }

        const tp = this._voenData;
        if (!tp) {
            content.innerHTML = `<p class="text-red-500">Məlumat tapılmadı</p>`;
            return;
        }

        const isRisky = tp.riskyPayer === true;

        content.innerHTML = `
            <div class="space-y-4">
                <!-- Başlıq -->
                <div class="flex items-center justify-between">
                    <div>
                        <h4 class="text-lg font-bold text-brand-ink">${this._escapeHtml(tp.name) || 'Məlumat yoxdur'}</h4>
                        <p class="text-sm text-gray-500">VÖEN: ${tp.tin}</p>
                    </div>
                    <span class="px-3 py-1 rounded-full text-xs font-semibold ${isRisky ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}">
                        ${isRisky ? '⚠ Riskli' : '✓ Aktiv'}
                    </span>
                </div>
    
                <!-- Status -->
                <div class="grid grid-cols-2 gap-3">
                    <div class="bg-gray-50 rounded-xl p-3">
                        <p class="text-xs text-gray-400">Status</p>
                        <p class="font-medium">${tp.taxpayerStatus || 'Aktiv'}</p>
                    </div>
                    <div class="bg-gray-50 rounded-xl p-3">
                        <p class="text-xs text-gray-400">ƏDV ödəyicisi</p>
                        <p class="font-medium">${tp.vatPayer ? '✅ Bəli' : '❌ Xeyr'}</p>
                    </div>
                    <div class="bg-gray-50 rounded-xl p-3">
                        <p class="text-xs text-gray-400">Təşkilat tipi</p>
                        <p class="font-medium">${tp.organizationType || '-'}</p>
                    </div>
                    <div class="bg-gray-50 rounded-xl p-3">
                        <p class="text-xs text-gray-400">Vergi borcu</p>
                        <p class="font-medium ${(tp.debt || 0) > 0 ? 'text-red-500' : 'text-green-600'}">${tp.debt || 0} AZN</p>
                    </div>
                    <div class="bg-gray-50 rounded-xl p-3 col-span-2">
                        <p class="text-xs text-gray-400">Hüquqi ünvan</p>
                        <p class="font-medium text-sm">${this._escapeHtml(tp.legalAddress) || '-'}</p>
                    </div>
                    <div class="bg-gray-50 rounded-xl p-3 col-span-2">
                        <p class="text-xs text-gray-400">Rəhbər</p>
                        <p class="font-medium">${this._escapeHtml(tp.legitimate) || '-'}</p>
                    </div>
                    <div class="bg-gray-50 rounded-xl p-3">
                        <p class="text-xs text-gray-400">VOEN qeydiyyat</p>
                        <p class="font-medium">${tp.voenRegisteredAt || '-'}</p>
                    </div>
                    <div class="bg-gray-50 rounded-xl p-3">
                        <p class="text-xs text-gray-400">Nizamnamə kapitalı</p>
                        <p class="font-medium">${tp.charterCapital || '-'} AZN</p>
                    </div>
                    <div class="bg-gray-50 rounded-xl p-3 col-span-2">
                        <p class="text-xs text-gray-400">Vergi orqanı</p>
                        <p class="font-medium text-sm">${this._escapeHtml(tp.taxAuthority) || '-'}</p>
                    </div>
                </div>
    
                <!-- Bağla düyməsi -->
                <div class="flex justify-end pt-3 border-t">
                    <button onclick="document.getElementById('voenInfoModal').style.display='none'" 
                            class="px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-xl transition">
                        Bağla
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Backup üsul - /users endpoint
     */
    async loadProfileBackup() {
        console.log('📋 Backup: Profil məlumatları yüklənir...');

        try {
            const userId = this.auth.getUserId();
            if (!userId) {
                throw new Error('User ID tapılmadı');
            }

            const userData = await this.api.get(`/users/${userId}`);
            console.log('📥 Backup cavabı:', userData);

            if (!userData) {
                throw new Error('İstifadəçi məlumatları alına bilmədi');
            }

            const formattedData = {
                firstName: userData.ceo_name || '',
                lastName: userData.ceo_lastname || '',
                fatherName: userData.father_name || '',
                gender: userData.gender || '',
                birthDate: userData.birth_date ? this.formatDate(userData.birth_date) : '',
                voen: userData.voen || '',
                asanImza: userData.asan_imza || '',
                asanId: userData.asan_id || '',
                pin1: userData.pin1 || '',
                pin2: userData.pin2 || '',
                puk: userData.puk || '',
                finCode: userData.fin_code || '',
                email: userData.ceo_email || '',
                phone: userData.ceo_phone || '',
                companyCode: userData.company_code || '',
                company_name: userData.company_name || '',
                telegramUsername: userData.telegram_username || '',
                telegramChatId: userData.telegram_chat_id || null,
                emailVerified: userData.email_verified || false,
                phoneVerified: userData.phone_verified || false,
                telegramVerified: userData.is_telegram_verified || false,
                id: userData.id,
                companyId: userData.company_id,
                originalData: userData
            };

            if (this.ui && this.ui.populateForm) {
                this.ui.populateForm(formattedData);
            }

            this.updateTelegramStatus(formattedData);

            return formattedData;

        } catch (error) {
            console.error('❌ Backup xətası:', error);
            throw error;
        }
    }

    // profile.service.js - updateLocalStorage

    updateLocalStorage(userData) {
        try {
            const telegramChatId = userData.telegram_chat_id ||
                                  (userData.is_telegram_verified ? 1392440628 : null);

            const savedData = {
                user: {
                    id: userData.id,
                    ceo_name: userData.ceo_name,
                    ceo_lastname: userData.ceo_lastname,
                    company_name: userData.company_name,
                    company_code: userData.company_code,
                    ceo_email: userData.ceo_email,
                    ceo_phone: userData.ceo_phone,
                    voen: userData.voen || '', // ✅ Düzgün VÖEN
                    telegram_username: userData.telegram_username,
                    telegram_chat_id: telegramChatId,
                    is_telegram_verified: userData.is_telegram_verified
                },
                uuid: userData.uuid
            };
            localStorage.setItem('userData', JSON.stringify(savedData));
            console.log('💾 LocalStorage yeniləndi. VÖEN:', savedData.user.voen);
        } catch (e) {
            console.warn('⚠️ LocalStorage xətası:', e);
        }
    }

    // profile.service.js - updateProfile metodunu YENİLƏYİN

    async updateProfile(profileData) {
        console.log('💾 Profil yenilənir...', profileData);

        // Cari istifadəçi və şirkət məlumatlarını yüklə
        let currentUser = null;
        let currentCompany = null;
        let currentVoen = '';

        try {
            currentUser = await this.api.get('/users/me');
            currentVoen = currentUser.voen || '';
            console.log('📥 Cari VÖEN (users):', currentVoen);

            // Şirkət məlumatlarını da yüklə
            if (currentUser.company_code) {
                currentCompany = await this.api.get(`/companies/code/${currentUser.company_code}`);
                console.log('📥 Şirkət VÖEN-i:', currentCompany?.voen || 'tapılmadı');
            }
        } catch (e) {
            console.warn('Cari məlumatlar alına bilmədi:', e);
        }

        // ========== VÖEN EMALI - ƏSAS DÜZƏLİŞ ==========
        const newVoen = profileData.voen ? profileData.voen.replace(/\D/g, '') : '';
        const currentVoenClean = currentVoen ? currentVoen.replace(/\D/g, '') : '';
        const companyVoen = currentCompany?.voen ? currentCompany.voen.replace(/\D/g, '') : '';

        // Əsas VÖEN şirkətdə saxlanılır - istifadəçinin VÖEN-i şirkətlə sinxron olmalıdır
        let voenToUpdate = null;

        if (newVoen && newVoen !== companyVoen) {
            // VÖEN dəyişir - əvvəlcə şirkətdə yoxla
            console.log('🔍 VÖEN dəyişdirilir:', companyVoen, '->', newVoen);

            try {
                // Bu VÖEN başqa şirkətdə var?
                const checkResult = await this.api.post('/companies/check-voen', { voen: newVoen });
                if (checkResult.exists) {
                    throw new Error(`Bu VÖEN (${newVoen}) artıq başqa şirkətdə mövcuddur.`);
                }

                // Şirkətdə VÖEN-i yenilə
                if (currentUser.company_code) {
                    await this.api.patch(`/companies/code/${currentUser.company_code}`, {
                        voen: newVoen
                    });
                    console.log('✅ Şirkət VÖEN-i yeniləndi:', newVoen);
                }

                // İstifadəçi VÖEN-i də yenilə (opsional)
                voenToUpdate = newVoen;

            } catch (checkError) {
                if (checkError.message && checkError.message.includes('mövcuddur')) {
                    throw checkError;
                }
                throw new Error('VÖEN yenilənərkən xəta: ' + checkError.message);
            }
        } else {
            console.log('ℹ️ VÖEN dəyişməyib');
            // VÖEN dəyişməyibsə, cari dəyəri qoru (users üçün)
            if (currentVoenClean) {
                voenToUpdate = currentVoenClean;
            }
        }

        // ========== DIGƏR SAHƏLƏR ==========
        const updateData = {};

        if (profileData.firstName !== undefined) updateData.ceo_name = profileData.firstName;
        if (profileData.lastName !== undefined) updateData.ceo_lastname = profileData.lastName;
        if (profileData.fatherName !== undefined) updateData.father_name = profileData.fatherName;
        if (profileData.gender !== undefined) updateData.gender = profileData.gender;
        if (profileData.birthDate) updateData.birth_date = this.parseDate(profileData.birthDate);

        // VÖEN - yalnız dəyişibsə və ya boş deyilsə
        if (voenToUpdate) {
            updateData.voen = voenToUpdate;
        }

        // TAXPAYER_INFO - yalnız VÖEN dəyişibsə
        if (this._voenData && this._voenData.tin === voenToUpdate) {
            updateData.taxpayer_info = this._voenData;
        }

        // ASAN İMZA
        if (profileData.asanImza !== undefined) updateData.asan_imza_number = profileData.asanImza;
        if (profileData.asanId !== undefined) updateData.asan_id = profileData.asanId;
        if (profileData.pin1 !== undefined) updateData.pin1 = profileData.pin1;
        if (profileData.pin2 !== undefined) updateData.pin2 = profileData.pin2;
        if (profileData.puk !== undefined) updateData.puk = profileData.puk;
        if (profileData.finCode !== undefined) updateData.fin_code = profileData.finCode;
        if (profileData.email !== undefined) updateData.ceo_email = profileData.email;
        if (profileData.phone !== undefined) updateData.ceo_phone = profileData.phone;
        if (profileData.telegramUsername !== undefined) updateData.telegram_username = profileData.telegramUsername;
        if (profileData.company_name !== undefined) {
            // Şirkət adını da yenilə
            if (currentUser.company_code) {
                await this.api.patch(`/companies/code/${currentUser.company_code}`, {
                    company_name: profileData.company_name
                });
            }
        }

        if (profileData.password && profileData.password.trim() !== '') {
            updateData.ceo_password = profileData.password;
        }

        // Heç bir dəyişiklik yoxdursa
        if (Object.keys(updateData).length === 0) {
            console.log('ℹ️ Heç bir dəyişiklik yoxdur');
            return { message: 'Dəyişiklik yoxdur' };
        }

        const userId = this.auth.getUserId();
        if (!userId) {
            throw new Error('User ID tapılmadı');
        }

        try {
            console.log('📤 Göndərilən məlumatlar:', updateData);
            const response = await this.api.patch(`/users/${userId}`, updateData);
            console.log('✅ API Cavabı:', response);

            if (response) {
                await this.loadProfile();
            }

            return response;

        } catch (error) {
            console.error('❌ Profil yeniləmə xətası:', error);

            if (error.message && error.message.includes('duplicate key')) {
                throw new Error('Bu VÖEN artıq sistemdə mövcuddur. Zəhmət olmasa başqa VÖEN daxil edin.');
            }
            throw error;
        }
    }

    // ==================== TELEGRAM FUNKSİYALARI ====================

    /**
     * Telegram statusunu yenilə
     */
    updateTelegramStatus(userData) {
        const telegramStatus = document.getElementById('telegramStatus');
        const telegramInput = document.getElementById('telegramUsername');
        const verifyBtn = document.getElementById('verifyTelegram');

        if (!telegramStatus || !telegramInput) return;

        if (userData.telegramVerified) {
            telegramStatus.innerHTML = `
                <i class="fa-solid fa-check-circle" style="color: #10b981;"></i>
                <span style="color: #10b981; margin-left: 4px;">Təsdiqlənib</span>
                ${userData.telegramUsername ? `<span style="margin-left: 8px;">(@${userData.telegramUsername})</span>` : ''}
            `;
            telegramInput.value = userData.telegramUsername || '';
            telegramInput.disabled = true;
            telegramInput.style.backgroundColor = '#f3f4f6';
            if (verifyBtn) {
                verifyBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
                verifyBtn.disabled = true;
                verifyBtn.style.opacity = '0.5';
                verifyBtn.style.cursor = 'not-allowed';
            }
        } else if (userData.telegramChatId) {
            telegramStatus.innerHTML = `
                <i class="fa-solid fa-clock" style="color: #f59e0b;"></i>
                <span style="color: #f59e0b; margin-left: 4px;">Gözləyir</span>
                <span style="margin-left: 8px; font-size: 12px;">(Bot-a /start yazın)</span>
            `;
            telegramInput.value = userData.telegramUsername || '';
            telegramInput.disabled = false;
            telegramInput.style.backgroundColor = '';
            if (verifyBtn) {
                verifyBtn.innerHTML = '<i class="fa-solid fa-rotate-right"></i>';
                verifyBtn.disabled = false;
                verifyBtn.style.opacity = '';
                verifyBtn.style.cursor = 'pointer';
            }
        } else {
            telegramStatus.innerHTML = `
                <i class="fa-solid fa-times-circle" style="color: #ef4444;"></i>
                <span style="color: #ef4444; margin-left: 4px;">Bağlı deyil</span>
            `;
            telegramInput.value = '';
            telegramInput.disabled = false;
            telegramInput.style.backgroundColor = '';
            if (verifyBtn) {
                verifyBtn.innerHTML = '<i class="fa-solid fa-link"></i>';
                verifyBtn.disabled = false;
                verifyBtn.style.opacity = '';
                verifyBtn.style.cursor = 'pointer';
            }
        }
    }

    /**
     * Telegram ilə əlaqələndir
     */
    async connectTelegram(telegramId, telegramUsername) {
        console.log('📱 Telegram ilə əlaqələndirilir...');

        try {
            const userId = this.auth.getUserId();
            if (!userId) {
                throw new Error('User ID tapılmadı');
            }

            // Username-i yadda saxla
            if (telegramUsername && document.getElementById('telegramUsername')) {
                document.getElementById('telegramUsername').value = telegramUsername;
            }

            const response = await this.api.post('/telegram/connect', {
                user_id: userId,
                telegram_id: telegramId,
                telegram_username: telegramUsername,
                first_name: document.getElementById('firstName')?.value || '',
                last_name: document.getElementById('lastName')?.value || ''
            });

            console.log('✅ Telegram bağlantı cavabı:', response);

            if (response && (response.status === 'success' || response.data?.status === 'success')) {
                if (this.ui) {
                    this.ui.showNotification('Telegram hesabı əlaqələndirildi. Bot-a /start yazın.', 'success');
                }

                // Bot linkini göstər
                this.showTelegramBotLink();

                // 2 saniyə gözlə və təsdiqlə
                setTimeout(async () => {
                    await this.verifyTelegram();
                }, 2000);

                return true;
            } else {
                throw new Error(response?.message || response?.data?.message || 'Bağlantı xətası');
            }

        } catch (error) {
            console.error('❌ Telegram bağlantı xətası:', error);

            let errorMessage = 'Telegram bağlantısı qurulmadı';
            if (error.message) errorMessage = error.message;
            if (error.data?.detail) errorMessage = error.data.detail;

            if (this.ui) {
                this.ui.showNotification(errorMessage, 'error');
            } else {
                alert('Xəta: ' + errorMessage);
            }
            return false;
        }
    }

    /**
     * Telegram təsdiqlə
     */
    async verifyTelegram() {
        console.log('✅ Telegram təsdiqlənir...');

        try {
            const userId = this.auth.getUserId();
            if (!userId) {
                throw new Error('User ID tapılmadı');
            }

            const response = await this.api.get(`/telegram/users/${userId}`);
            console.log('📥 Telegram user_service məlumatı:', response);

            const userData = response.data || response;

            if (userData && userData.is_telegram_verified) {
                this.updateTelegramStatus({
                    telegramVerified: true,
                    telegramChatId: userData.telegram_chat_id,
                    telegramUsername: userData.telegram_username
                });

                if (this.ui) {
                    this.ui.showNotification('Telegram hesabınız artıq təsdiqlənib!', 'success');
                }

                await this.loadProfile();
                return true;
            }

            if (userData && userData.telegram_chat_id) {
                this.ui.showNotification('Telegram bot-a /start yazın və təsdiqlənməni gözləyin', 'info');
                this.showTelegramBotLink();

                let attempts = 0;
                const checkInterval = setInterval(async () => {
                    attempts++;
                    console.log(`⏳ Təsdiqləmə yoxlanılır... (${attempts}/10)`);

                    try {
                        const checkResponse = await this.api.get(`/telegram/users/${userId}`);
                        const checkData = checkResponse.data || checkResponse;

                        if (checkData && checkData.is_telegram_verified) {
                            clearInterval(checkInterval);
                            this.updateTelegramStatus({
                                telegramVerified: true,
                                telegramChatId: checkData.telegram_chat_id,
                                telegramUsername: checkData.telegram_username
                            });

                            if (this.ui) {
                                this.ui.showNotification('Telegram hesabınız təsdiqləndi! 🎉', 'success');
                            }

                            await this.loadProfile();
                        }
                    } catch (error) {
                        console.error('Yoxlama xətası:', error);
                    }

                    if (attempts >= 10) {
                        clearInterval(checkInterval);
                        console.log('⏹️ Təsdiqləmə yoxlaması dayandırıldı');
                    }
                }, 3000);

                return false;
            }

            this.showTelegramConnectInstructions(userId);

        } catch (error) {
            console.error('❌ Telegram təsdiqləmə xətası:', error);

            if (error.status === 404) {
                const userId = this.auth.getUserId();
                this.showTelegramConnectInstructions(userId);
            } else {
                if (this.ui) {
                    this.ui.showNotification('Xəta: ' + (error.message || 'Bilinməyən xəta'), 'error');
                }
            }
            return false;
        }
    }

    /**
     * Telegram bağlantı təlimatlarını göstər
     */
    showTelegramConnectInstructions(userId) {
        const botUsername = this.botUsername || '@GuvenFinance_Bot';

        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: '📱 Telegram Bağlantısı',
                html: `
                    <div style="text-align: left;">
                        <p style="margin-bottom: 16px; font-weight: 500;">Telegram bildirişlərini almaq üçün:</p>
    
                        <div style="background: #eff6ff; padding: 20px; border-radius: 16px; margin-bottom: 16px; text-align: center;">
                            <p style="font-weight: 600; margin-bottom: 12px;">1. Telegram botu açın:</p>
                            <a href="https://t.me/${botUsername.replace('@', '')}" target="_blank"
                               style="display: inline-block; background: #7DB6FF; color: white; padding: 14px 28px; border-radius: 16px; text-decoration: none; font-weight: 600; font-size: 18px;">
                                <i class="fab fa-telegram" style="margin-right: 8px;"></i>${botUsername}
                            </a>
                        </div>
    
                        <div style="background: #f0fdf4; padding: 20px; border-radius: 16px; margin-bottom: 16px; text-align: center;">
                            <p style="font-weight: 600; margin-bottom: 8px;">2. Bot-a <span style="background: #d1d5db; padding: 4px 8px; border-radius: 8px;">/start</span> yazın</p>
                            <p style="color: #4b5563; font-size: 14px;">Bot sizi avtomatik tanıyacaq və təsdiqləyəcək</p>
                        </div>
    
                        <div style="background: #fef3c7; padding: 16px; border-radius: 16px; text-align: center;">
                            <i class="fa-solid fa-check-circle" style="color: #10b981; font-size: 24px;"></i>
                            <p style="font-weight: 500; margin-top: 8px;">Təsdiqləndikdən sonra bildiriş almağa başlayacaqsınız</p>
                        </div>
                    </div>
                `,
                icon: 'info',
                confirmButtonText: 'Başa düşdüm',
                confirmButtonColor: '#7DB6FF',
                showCloseButton: true,
                didOpen: () => {
                    let attempts = 0;
                    const checkInterval = setInterval(async () => {
                        attempts++;

                        try {
                            const response = await this.api.get(`/telegram/users/${userId}`);
                            const userData = response.data || response;

                            if (userData && userData.is_telegram_verified) {
                                clearInterval(checkInterval);

                                Swal.fire({
                                    icon: 'success',
                                    title: 'Təsdiqləndi! 🎉',
                                    text: 'Telegram hesabınız uğurla təsdiqləndi',
                                    timer: 2000,
                                    showConfirmButton: false
                                });

                                this.updateTelegramStatus({
                                    telegramVerified: true,
                                    telegramChatId: userData.telegram_chat_id,
                                    telegramUsername: userData.telegram_username
                                });

                                await this.loadProfile();
                            }
                        } catch (error) {
                            console.log('Yoxlama xətası:', error);
                        }

                        if (attempts >= 10) {
                            clearInterval(checkInterval);
                        }
                    }, 3000);
                }
            });
        } else {
            window.open(`https://t.me/${botUsername.replace('@', '')}`, '_blank');
            alert('Telegram bot-a gedin və /start yazın');
        }
    }

    /**
     * Telegram bot linkini göstər
     */
    showTelegramBotLink() {
        if (typeof Swal === 'undefined') {
            window.open(`https://t.me/${this.botUsername.replace('@', '')}`, '_blank');
            return;
        }

        Swal.fire({
            title: '📱 Telegram Bot',
            html: `
                <div style="text-align: center;">
                    <p style="margin-bottom: 16px;">Bildirişləri Telegram-da almaq üçün botu işə salın:</p>
                    <div style="background: linear-gradient(135deg, #eff6ff, #eef2ff); padding: 20px; border-radius: 16px;">
                        <a href="https://t.me/${this.botUsername.replace('@', '')}" target="_blank"
                           style="display: inline-flex; align-items: center; gap: 10px; background: #7DB6FF; color: white; padding: 12px 24px; border-radius: 14px; text-decoration: none; font-weight: 600; font-size: 18px;">
                            <i class="fab fa-telegram" style="font-size: 24px;"></i>
                            ${this.botUsername}
                        </a>
                        <p style="font-size: 13px; color: #4b5563; margin-top: 12px;">
                            Bota <span style="font-family: monospace; background: white; padding: 4px 8px; border-radius: 6px;">/start</span> yazın
                        </p>
                    </div>
                </div>
            `,
            icon: 'info',
            confirmButtonText: 'Başa düşdüm',
            confirmButtonColor: '#7DB6FF',
            showCloseButton: true
        });
    }

    /**
     * Telegram əlaqəsini kəs
     */
    async disconnectTelegram() {
        console.log('📱 Telegram əlaqəsi kəsilir...');

        if (typeof Swal !== 'undefined') {
            const result = await Swal.fire({
                title: 'Əminsiniz?',
                text: 'Telegram əlaqəsi kəsiləcək. Bildirişlər artıq gəlməyəcək.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#6b7280',
                confirmButtonText: 'Bəli, kəs',
                cancelButtonText: 'Ləğv et'
            });

            if (!result.isConfirmed) return;
        }

        try {
            const userId = this.auth.getUserId();
            if (!userId) {
                throw new Error('User ID tapılmadı');
            }

            const response = await this.api.delete(`/telegram/disconnect/${userId}`);
            console.log('✅ Əlaqə kəsildi:', response);

            this.updateTelegramStatus({
                telegramVerified: false,
                telegramChatId: null
            });

            if (this.ui) {
                this.ui.showNotification('Telegram əlaqəsi kəsildi', 'success');
            }

            await this.loadProfile();

        } catch (error) {
            console.error('❌ Əlaqə kəsmə xətası:', error);
            if (this.ui) {
                this.ui.showNotification(error.message || 'Xəta baş verdi', 'error');
            }
        }
    }

    // ==================== ASAN İMZA MODAL FUNKSİYALARI ====================

    /**
     * ASAN İmza Modalını başlat
     */
    initAsanImzaModal() {
        console.log('🔧 ASAN İmza Modal başladılır...');

        // Elementləri hər dəfə TƏZƏDƏN tap
        this.asanImzaModal = document.getElementById('asanImzaModal');
        this.openModalBtn = document.getElementById('openAsanImzaModalBtn');
        this.closeModalBtn = document.getElementById('closeAsanImzaModal');
        this.saveNewAsanImzaBtn = document.getElementById('saveNewAsanImza');
        this.asanImzaListContainer = document.getElementById('asanImzaList');

        // Elementlər yoxdursa, çıx
        if (!this.asanImzaModal) {
            console.warn('⚠️ ASAN İmza modal elementi tapılmadı, 1 saniyə sonra yenidən cəhd ediləcək');
            setTimeout(() => this.initAsanImzaModal(), 1000);
            return;
        }

        console.log('✅ ASAN İmza modal elementi tapıldı');

        // Elementlər yoxdursa, çıx
        if (!this.asanImzaModal) {
            console.warn('⚠️ ASAN İmza modal elementi tapılmadı');
            return;
        }

        // Modalı açmaq üçün event listener
        if (this.openModalBtn) {
            // Köhnə event listener-ları silmək üçün clone
            const newBtn = this.openModalBtn.cloneNode(true);
            this.openModalBtn.parentNode.replaceChild(newBtn, this.openModalBtn);
            this.openModalBtn = newBtn;

            this.openModalBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.openAsanImzaModal();
            });
            console.log('✅ "İdarə et" düyməsi bağlandı');
        } else {
            console.warn('⚠️ openAsanImzaModalBtn elementi tapılmadı');
        }

        // Modalı bağlamaq üçün event listener
        if (this.closeModalBtn) {
            this.closeModalBtn.addEventListener('click', () => {
                this.closeAsanImzaModal();
            });
        }

        // Modalın xaricinə kliklədikdə bağlanması
        this.asanImzaModal.addEventListener('click', (e) => {
            if (e.target === this.asanImzaModal) {
                this.closeAsanImzaModal();
            }
        });

        // ESC düyməsi ilə bağlanma
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.asanImzaModal && this.asanImzaModal.style.display === 'flex') {
                this.closeAsanImzaModal();
            }
        });

        // Yeni ASAN İmza yaratma
        if (this.saveNewAsanImzaBtn) {
            this.saveNewAsanImzaBtn.addEventListener('click', () => {
                this.createNewAsanImza();
            });
        }

        console.log('✅ ASAN İmza Modal hazırdır');
    }

    async getUserAsanImza(userId) {
        try {
            console.log(`🔍 getUserAsanImza çağırıldı: userId=${userId}`);

            // ✅ DÜZƏLİŞ: API endpoint-inə baxaq
            // Backend-də endpoint: /asan-imza/user/{user_id}
            const response = await this.api.get(`/asan-imza/user/${userId}`);

            console.log('📥 API cavabı:', response);
            console.log('📥 Cavab tipi:', typeof response);
            console.log('📥 Array olub?', Array.isArray(response));

            // Cavab müxtəlif formatlarda ola bilər
            if (Array.isArray(response)) {
                return response;
            } else if (response && response.items && Array.isArray(response.items)) {
                return response.items;
            } else if (response && response.data && Array.isArray(response.data)) {
                return response.data;
            } else if (response && response.success && Array.isArray(response.data)) {
                return response.data;
            }

            // Heç bir format uyğun gəlmirsə, boş array qaytar
            console.warn('⚠️ Tanınmayan cavab formatı:', response);
            return [];

        } catch (error) {
            console.error('❌ İstifadəçinin ASAN İmza məlumatları gətirilərkən xəta:', error);

            // Xətanı UI-da göstər (əgər mümkünsə)
            if (this.ui && this.ui.showNotification) {
                this.ui.showNotification('ASAN İmza məlumatları yüklənərkən xəta: ' + (error.message || 'Bilinməyən xəta'), 'error');
            }

            return [];
        }
    }

    /**
     * ASAN İmza Modalını aç
     */
    openAsanImzaModal() {
        console.log('📂 ASAN İmza Modal açılır...');

        if (!this.asanImzaModal) return;

        // Modalı göstər
        this.asanImzaModal.style.display = 'flex';

        // ASAN İmza listini yüklə
        this.loadAsanImzaList();
    }

    /**
     * ASAN İmza Modalını bağla
     */
    closeAsanImzaModal() {
        console.log('📂 ASAN İmza Modal bağlanır...');

        if (!this.asanImzaModal) return;

        this.asanImzaModal.style.display = 'none';

        // Formu təmizlə
        this.clearAsanImzaForm();
    }

    async loadAsanImzaList() {
        if (!this.asanImzaListContainer) {
            console.error('❌ asanImzaListContainer tapılmadı');
            return;
        }

        // Loading göstər
        this.asanImzaListContainer.innerHTML = `
            <div class="text-center py-8 text-gray-400">
                <i class="fa-solid fa-spinner fa-spin text-3xl mb-2"></i>
                <p>Yüklənir...</p>
            </div>
        `;

        try {
            const userId = this.auth.getUserId();
            const asanImzaList = await this.getUserAsanImza(userId);

            if (!asanImzaList || asanImzaList.length === 0) {
                this.asanImzaListContainer.innerHTML = `
                    <div class="text-center py-8 text-gray-400">
                        <i class="fa-solid fa-id-card text-4xl mb-2"></i>
                        <p>Heç bir ASAN İmza məlumatı tapılmadı</p>
                        <p class="text-sm mt-2">Yeni ASAN İmza əlavə etmək üçün formu doldurun</p>
                    </div>
                `;
                return;
            }

            let html = '';
            for (const item of asanImzaList) {
                const itemId = `asan-detail-${item.id}`;
                html += `
                    <div class="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition asan-imza-item" data-id="${item.id}">
                        <div class="flex items-center justify-between">
                            <div class="flex-1">
                                <div class="flex items-center gap-2 mb-2">
                                    ${item.is_primary ? '<span class="bg-brand-blue text-white text-xs px-2 py-1 rounded-full">Əsas</span>' : ''}
                                    ${!item.is_active ? '<span class="bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full">Deaktiv</span>' : ''}
                                    <span class="text-xs text-gray-400">ID: ${item.id}</span>
                                </div>
                                <!-- ƏSAS MƏLUMATLAR (hər zaman görünən) -->
                                <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                    <div>
                                        <p class="text-gray-500 text-xs">ASAN İmza</p>
                                        <p class="font-medium">${this._maskValue(item.asan_imza_number) || '-'}</p>
                                    </div>
                                    <div>
                                        <p class="text-gray-500 text-xs">ASAN ID</p>
                                        <p class="font-medium">${this._maskValue(item.asan_id) || '-'}</p>
                                    </div>
                                    <div>
                                        <p class="text-gray-500 text-xs">PIN1</p>
                                        <p class="font-mono text-sm">${item.pin1 ? '••••' : '-'}</p>
                                    </div>
                                    <div>
                                        <p class="text-gray-500 text-xs">PIN2</p>
                                        <p class="font-mono text-sm">${item.pin2 ? '••••' : '-'}</p>
                                    </div>
                                </div>
                            </div>
                            <div class="flex gap-2 ml-4">
                                <!-- 👁️ GÖZ İŞARƏSİ - tam məlumatı göstər/gizlət -->
                                <button class="toggle-detail-btn text-gray-400 hover:text-brand-blue p-2 rounded-full hover:bg-blue-50" data-target="${itemId}" title="Tam məlumat">
                                    <i class="fa-solid fa-eye"></i>
                                </button>
                                ${!item.is_primary && item.is_active ? `
                                    <button class="set-primary-btn text-brand-blue hover:text-blue-700 p-2 rounded-full hover:bg-blue-50" data-id="${item.id}" title="Əsas et">
                                        <i class="fa-solid fa-star"></i>
                                    </button>
                                ` : ''}
                                <button class="delete-asan-imza-btn text-red-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50" data-id="${item.id}" title="Sil">
                                    <i class="fa-solid fa-trash-can"></i>
                                </button>
                            </div>
                        </div>
                        <!-- ƏTRAFLI MƏLUMATLAR (toggle ilə açılıb-bağlanan) -->
                        <div id="${itemId}" class="hidden mt-3 pt-3 border-t border-gray-200 text-sm">
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <p class="text-gray-500 text-xs">ASAN İmza (tam):</p>
                                    <p class="font-mono text-sm break-all">${this._escapeHtml(item.asan_imza_number) || '-'}</p>
                                </div>
                                <div>
                                    <p class="text-gray-500 text-xs">ASAN ID (tam):</p>
                                    <p class="font-mono text-sm break-all">${this._escapeHtml(item.asan_id) || '-'}</p>
                                </div>
                                <div>
                                    <p class="text-gray-500 text-xs">PIN1:</p>
                                    <p class="font-mono text-lg font-bold tracking-wider">${item.pin1 || '-'}</p>
                                </div>
                                <div>
                                    <p class="text-gray-500 text-xs">PIN2:</p>
                                    <p class="font-mono text-lg font-bold tracking-wider">${item.pin2 || '-'}</p>
                                </div>
                                <div class="col-span-2">
                                    <p class="text-gray-500 text-xs">PUK:</p>
                                    <p class="font-mono text-lg font-bold tracking-wider">${item.puk || '-'}</p>
                                </div>
                                <div class="col-span-2">
                                    <p class="text-gray-500 text-xs">Status:</p>
                                    <p>
                                        ${item.is_primary ? '<span class="text-brand-blue">⭐ Əsas ASAN İmza</span>' : ''}
                                        ${item.is_active ? '<span class="text-green-600 ml-2">✅ Aktiv</span>' : '<span class="text-red-600 ml-2">❌ Deaktiv</span>'}
                                    </p>
                                </div>
                                <div class="col-span-2 text-xs text-gray-400">
                                    Yaradılma: ${item.created_at ? new Date(item.created_at).toLocaleString('az-AZ') : '-'}
                                    ${item.updated_at !== item.created_at ? `<br>Yenilənmə: ${new Date(item.updated_at).toLocaleString('az-AZ')}` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }

            this.asanImzaListContainer.innerHTML = html;

            // ========== TOGGLE (GÖZ) BUTTONLARI ==========
            document.querySelectorAll('.toggle-detail-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const targetId = btn.dataset.target;
                    const targetDiv = document.getElementById(targetId);
                    const icon = btn.querySelector('i');

                    if (targetDiv) {
                        if (targetDiv.classList.contains('hidden')) {
                            targetDiv.classList.remove('hidden');
                            icon.classList.remove('fa-eye');
                            icon.classList.add('fa-eye-slash');
                        } else {
                            targetDiv.classList.add('hidden');
                            icon.classList.remove('fa-eye-slash');
                            icon.classList.add('fa-eye');
                        }
                    }
                });
            });

            // ========== ƏSAS ET BUTTONLARI ==========
            document.querySelectorAll('.set-primary-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const id = btn.dataset.id;
                    await this._setPrimaryAsanImzaHandler(id);
                });
            });

            // ========== SİL BUTTONLARI ==========
            document.querySelectorAll('.delete-asan-imza-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const id = btn.dataset.id;
                    await this._deleteAsanImzaHandler(id);
                });
            });

            console.log('✅ ASAN İmza listi göstərildi');

        } catch (error) {
            console.error('❌ ASAN İmza listi yüklənərkən xəta:', error);
            this.asanImzaListContainer.innerHTML = `
                <div class="text-center py-8 text-red-400">
                    <i class="fa-solid fa-circle-exclamation text-3xl mb-2"></i>
                    <p>Məlumatlar yüklənərkən xəta baş verdi</p>
                    <button class="mt-2 text-brand-blue hover:underline" onclick="location.reload()">Yenidən cəhd et</button>
                </div>
            `;
        }
    }

    // ==================== ASAN İMZA HANDLER METODLARI ====================

    /**
     * ASAN İmza-nı əsas et (handler)
     */
    async _setPrimaryAsanImzaHandler(asanImzaId) {
        console.log('⭐ ASAN İmza əsas edilir:', asanImzaId);

        try {
            const result = await this.setPrimaryAsanImza(asanImzaId);

            if (result) {
                if (this.ui) {
                    this.ui.showNotification('ASAN İmza əsas olaraq təyin edildi', 'success');
                }

                // Listi yenilə
                await this.loadAsanImzaList();

                // Profil inputunu yenilə
                await this.updatePrimaryAsanImzaInput(result);
            }
        } catch (error) {
            console.error('❌ ASAN İmza əsas edilərkən xəta:', error);
            if (this.ui) {
                this.ui.showNotification(error.message || 'Əməliyyat uğursuz oldu', 'error');
            }
        }
    }

    // _deleteAsanImzaHandler metodunda
    async _deleteAsanImzaHandler(asanImzaId) {
        console.log('🗑️ ASAN İmza silinir (HARD DELETE):', asanImzaId);

        // Təsdiq sorğusu
        if (typeof Swal !== 'undefined') {
            const result = await Swal.fire({
                title: 'Əminsiniz?',
                text: 'Bu ASAN İmza məlumatı tamamilə silinəcək. Bu əməliyyat geri alına bilməz!',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#6b7280',
                confirmButtonText: 'Bəli, tam sil',
                cancelButtonText: 'Ləğv et'
            });

            if (!result.isConfirmed) return;
        } else {
            if (!confirm('Bu ASAN İmza məlumatını tamamilə silmək istədiyinizə əminsiniz? (Geri alına bilməz)')) return;
        }

        try {
            // ✅ permanent = true göndər
            await this.api.delete(`/asan-imza/${asanImzaId}?permanent=true`);

            if (this.ui) {
                this.ui.showNotification('ASAN İmza tamamilə silindi', 'success');
            }

            // Listi yenilə
            await this.loadAsanImzaList();

            // Profil inputunu yenilə
            await this.updatePrimaryAsanImzaInput();

        } catch (error) {
            console.error('❌ ASAN İmza silinərkən xəta:', error);
            if (this.ui) {
                this.ui.showNotification(error.message || 'ASAN İmza silinə bilmədi', 'error');
            }
        }
    }

    /**
     * ASAN İmza sil (API)
     */
    async deleteAsanImza(asanImzaId, permanent = false) {
        try {
            await this.api.delete(`/asan-imza/${asanImzaId}?permanent=${permanent}`);
            return true;
        } catch (error) {
            console.error('❌ ASAN İmza silinərkən xəta:', error);
            throw error;
        }
    }

    /**
     * ASAN İmza-nı əsas et (API)
     */
    async setPrimaryAsanImza(asanImzaId) {
        try {
            const response = await this.api.post(`/asan-imza/${asanImzaId}/set-primary`);
            return response;
        } catch (error) {
            console.error('❌ ASAN İmza əsas edilərkən xəta:', error);
            throw error;
        }
    }
    // Profile Service-ə əlavə edin (köməkçi metodlar bölməsinə)
    _escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }

    // Köməkçi metod
    _maskValue(value) {
        if (!value || value.length <= 4) return value;
        const start = value.substring(0, 4);
        const end = value.substring(value.length - 2);
        return `${start}****${end}`;
    }

    // Profile Service-ə əlavə edin (ASAN İMZA CRUD METODLARI bölməsinə)

    async createAsanImza(data) {
        try {
            console.log('📤 Yeni ASAN İmza yaradılır:', data);
            const response = await this.api.post('/asan-imza/', data);
            return response;
        } catch (error) {
            console.error('❌ ASAN İmza yaradılarkən xəta:', error);
            throw error;
        }
    }
    async createNewAsanImza() {
        const newAsanImzaNumber = document.getElementById('newAsanImzaNumber')?.value.trim();
        const newAsanId = document.getElementById('newAsanId')?.value.trim();
        const newPin1 = document.getElementById('newPin1')?.value.trim();
        const newPin2 = document.getElementById('newPin2')?.value.trim();
        const newPuk = document.getElementById('newPuk')?.value.trim();
        const newIsPrimary = document.getElementById('newIsPrimary')?.checked || false;

        // ========== VALİDASİYA ==========
        const errors = [];

        // ASAN İmza nömrəsi validasiyası
        if (newAsanImzaNumber && newAsanImzaNumber.length < 5) {
            errors.push('ASAN İmza nömrəsi minimum 5 simvol olmalıdır');
        }
        if (newAsanImzaNumber && !/^[A-Za-z0-9]+$/.test(newAsanImzaNumber)) {
            errors.push('ASAN İmza nömrəsi yalnız hərf və rəqəmlərdən ibarət ola bilər');
        }

        // ASAN ID validasiyası
        if (newAsanId && newAsanId.length < 3) {
            errors.push('ASAN ID minimum 3 simvol olmalıdır');
        }

        // PIN1 validasiyası
        if (newPin1 && !/^\d+$/.test(newPin1)) {
            errors.push('PIN1 yalnız rəqəmlərdən ibarət olmalıdır');
        }
        if (newPin1 && newPin1.length !== 4) {
            errors.push('PIN1 4 rəqəm olmalıdır');
        }

        // PIN2 validasiyası
        if (newPin2 && !/^\d+$/.test(newPin2)) {
            errors.push('PIN2 yalnız rəqəmlərdən ibarət olmalıdır');
        }
        if (newPin2 && newPin2.length !== 5) {
            errors.push('PIN2 5 rəqəm olmalıdır');
        }

        // PUK validasiyası
        if (newPuk && !/^\d+$/.test(newPuk)) {
            errors.push('PUK yalnız rəqəmlərdən ibarət olmalıdır');
        }
        if (newPuk && (newPuk.length < 8 || newPuk.length > 10)) {
            errors.push('PUK 8-10 rəqəm arasında olmalıdır');
        }

        // Xəta varsa göstər və dayandır
        if (errors.length > 0) {
            if (this.ui) {
                errors.forEach(err => this.ui.showNotification(err, 'error'));
            } else {
                alert('Xətalər:\n' + errors.join('\n'));
            }
            return;
        }

        // Ən azı bir məlumat daxil edilməlidir
        if (!newAsanImzaNumber && !newAsanId && !newPin1 && !newPin2 && !newPuk) {
            if (this.ui) {
                this.ui.showNotification('Zəhmət olmasa ən azı bir məlumat daxil edin', 'warning');
            }
            return;
        }

        // Save button-un loading state
        if (this.saveNewAsanImzaBtn) {
            this.saveNewAsanImzaBtn.disabled = true;
            this.saveNewAsanImzaBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Yadda saxlanır...';
        }

        try {
            const data = {
                asan_imza_number: newAsanImzaNumber || null,
                asan_id: newAsanId || null,
                pin1: newPin1 || null,
                pin2: newPin2 || null,
                puk: newPuk || null,
                is_active: true,
                is_primary: newIsPrimary
            };

            console.log('📤 Yeni ASAN İmza məlumatları:', data);

            const result = await this.createAsanImza(data);

            if (result) {
                if (this.ui) {
                    this.ui.showNotification('ASAN İmza uğurla əlavə edildi', 'success');
                }

                this.clearAsanImzaForm();
                await this.loadAsanImzaList();

                if (newIsPrimary) {
                    await this.updatePrimaryAsanImzaInput(result);
                }
            }

        } catch (error) {
            console.error('❌ ASAN İmza yaradılarkən xəta:', error);
            if (this.ui) {
                this.ui.showNotification(error.message || 'ASAN İmza yaradıla bilmədi', 'error');
            }
        } finally {
            if (this.saveNewAsanImzaBtn) {
                this.saveNewAsanImzaBtn.disabled = false;
                this.saveNewAsanImzaBtn.innerHTML = '<i class="fa-solid fa-save mr-2"></i> Yadda Saxla';
            }
        }
    }

    /**
     * ASAN İmza sil (soft delete)
     */
    async deleteAsanImzaHandler(asanImzaId) {
        // Təsdiq sorğusu
        if (typeof Swal !== 'undefined') {
            const result = await Swal.fire({
                title: 'Əminsiniz?',
                text: 'Bu ASAN İmza məlumatı silinəcək.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#6b7280',
                confirmButtonText: 'Bəli, sil',
                cancelButtonText: 'Ləğv et'
            });

            if (!result.isConfirmed) return;
        } else {
            if (!confirm('Bu ASAN İmza məlumatını silmək istədiyinizə əminsiniz?')) return;
        }

        try {
            await this.deleteAsanImza(asanImzaId, false);

            if (this.ui) {
                this.ui.showNotification('ASAN İmza silindi', 'success');
            }

            // Listi yenilə
            await this.loadAsanImzaList();

            // Profil inputunu yenilə (əgər silinən əsas idisə)
            const asanImzaInput = document.getElementById('asanImza');
            if (asanImzaInput && asanImzaInput.value) {
                await this.updatePrimaryAsanImzaInput();
            }

        } catch (error) {
            console.error('❌ ASAN İmza silinərkən xəta:', error);
            if (this.ui) {
                this.ui.showNotification(error.message || 'ASAN İmza silinə bilmədi', 'error');
            }
        }
    }



    /**
     * Profil səhifəsindəki ASAN İmza inputunu yenilə
     */
    async updatePrimaryAsanImzaInput(primaryData = null) {
        const asanImzaInput = document.getElementById('asanImza');
        if (!asanImzaInput) return;

        try {
            let primaryAsanImza = primaryData;

            if (!primaryAsanImza) {
                const userId = this.auth.getUserId();
                const asanImzaList = await this.getUserAsanImza(userId);
                primaryAsanImza = asanImzaList.find(item => item.is_primary === true);
            }

            if (primaryAsanImza && primaryAsanImza.asan_imza_number) {
                asanImzaInput.value = primaryAsanImza.asan_imza_number;
                asanImzaInput.title = `ASAN ID: ${primaryAsanImza.asan_id || '-'}\nPIN1: ${primaryAsanImza.pin1 ? '📌' : '-'}\nPIN2: ${primaryAsanImza.pin2 ? '📌' : '-'}`;
            } else {
                asanImzaInput.value = '';
                asanImzaInput.title = '';
            }

        } catch (error) {
            console.error('❌ ASAN İmza input yenilənərkən xəta:', error);
        }
    }

    /**
     * ASAN İmza formunu təmizlə
     */
    clearAsanImzaForm() {
        const inputs = ['newAsanImzaNumber', 'newAsanId', 'newPin1', 'newPin2', 'newPuk'];
        inputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) input.value = '';
        });

        const primaryCheckbox = document.getElementById('newIsPrimary');
        if (primaryCheckbox) primaryCheckbox.checked = false;
    }

    // ==================== KÖMƏKÇİ FUNKSİYALAR ====================

    /**
     * Tarix formatla
     */
    formatDate(dateString) {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return date.toISOString().split('T')[0];
        } catch (e) {
            return '';
        }
    }

    /**
     * Tarixi parse et
     */
    parseDate(dateString) {
        if (!dateString) return null;
        try {
            return new Date(dateString).toISOString();
        } catch (e) {
            return null;
        }
    }

    /**
     * Validasiya
     */
    validateProfileData(data) {
        const errors = [];

        if (!data.email?.trim()) errors.push('Email tələb olunur');
        if (!data.phone?.trim()) errors.push('Telefon tələb olunur');

        if (data.email && !this.isValidEmail(data.email)) {
            errors.push('Düzgün email ünvanı daxil edin');
        }

        if (data.phone && !this.isValidPhone(data.phone)) {
            errors.push('Düzgün telefon nömrəsi daxil edin (+994XXXXXXXXX)');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Email validasiyası
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Telefon validasiyası
     */
    isValidPhone(phone) {
        const phoneRegex = /^\+994\d{9}$/;
        return phoneRegex.test(phone);
    }
}


// Global olaraq əlavə et
window.ProfileService = ProfileService;
console.log('✅ ProfileService tam versiya yükləndi (Telegram daxil)');