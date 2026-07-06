/**
 * QR Code Service - Sadələşdirilmiş və İşlək Versiya
 */

class QRCodeService {
    constructor(apiService) {
        this.api = apiService;
        this.currentQrData = null;
        this.isViewMode = false;
        this._userProfile = null;
        this._initialized = false;
        console.log('🔧 QRCodeService constructor çağırıldı');
    }

    // ==================== MODAL YARAT ====================

    createModal() {
        // Mövcud modalı sil
        const existing = document.getElementById('qrCodeModal');
        if (existing) {
            existing.remove();
            console.log('🗑️ Köhnə modal silindi');
        }

        console.log('🔄 QR Modal dinamik yaradılır...');

        const modal = document.createElement('div');
        modal.id = 'qrCodeModal';
        modal.className = 'fixed inset-0 bg-black/50 z-[10000]';
        modal.style.display = 'none';


        modal.innerHTML = `
            <div class="bg-white rounded-3xl w-full max-w-2xl mx-4 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 95%; max-width: 650px;">
                <!-- Header -->
                <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-brand-blue/10 to-white flex-shrink-0">
                    <div>
                        <h3 class="text-xl font-bold text-brand-ink flex items-center gap-2">
                            <i class="fa-solid fa-qrcode text-brand-blue"></i>
                            QR Kod Yaradıcı
                        </h3>
                        <p class="text-sm text-gray-500 mt-1">Məlumatları doldurun və QR kod yaradın</p>
                    </div>
                    <button id="closeQrCodeModal" class="text-gray-400 hover:text-gray-600 transition text-2xl">
                        <i class="fa-solid fa-times"></i>
                    </button>
                </div>

                <!-- Body -->
                <div class="p-6 overflow-y-auto flex-1">
                    <!-- FORM -->
                    <div id="qrCodeFormContainer">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="text-sm font-medium text-gray-700">Ad <span class="text-red-500">*</span></label>
                                <input type="text" id="vcardFirstName" class="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:border-brand-blue focus:outline-none" placeholder="Ad">
                            </div>
                            <div>
                                <label class="text-sm font-medium text-gray-700">Soyad <span class="text-red-500">*</span></label>
                                <input type="text" id="vcardLastName" class="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:border-brand-blue focus:outline-none" placeholder="Soyad">
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div>
                                <label class="text-sm font-medium text-gray-700">Telefon <span class="text-red-500">*</span></label>
                                <input type="tel" id="vcardPhone" class="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:border-brand-blue focus:outline-none" placeholder="Telefon">
                            </div>
                            <div>
                                <label class="text-sm font-medium text-gray-700">Email <span class="text-red-500">*</span></label>
                                <input type="email" id="vcardEmail" class="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:border-brand-blue focus:outline-none" placeholder="Email">
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div>
                                <label class="text-sm font-medium text-gray-700">Şirkət</label>
                                <input type="text" id="vcardCompany" class="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:border-brand-blue focus:outline-none" placeholder="Şirkət">
                            </div>
                            <div>
                                <label class="text-sm font-medium text-gray-700">Vəzifə</label>
                                <input type="text" id="vcardTitle" class="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:border-brand-blue focus:outline-none" placeholder="Vəzifə">
                            </div>
                        </div>

                        <div class="mt-4">
                            <label class="text-sm font-medium text-gray-700">Vebsayt</label>
                            <input type="url" id="vcardUrl" class="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:border-brand-blue focus:outline-none" placeholder="Vebsayt">
                        </div>

                        <div class="mt-4">
                            <label class="text-sm font-medium text-gray-700">Ünvan</label>
                            <input type="text" id="vcardAddress" class="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:border-brand-blue focus:outline-none" placeholder="Ünvan">
                        </div>

                        <div class="mt-4">
                            <div class="flex items-center justify-between">
                                <label class="text-sm font-medium text-gray-700">VCard Məzmunu (önizləmə)</label>
                                <button type="button" id="updateVCardBtn" class="text-xs bg-brand-blue text-white px-3 py-1 rounded-lg hover:bg-blue-600 transition">
                                    <i class="fa-solid fa-rotate"></i> Yenilə
                                </button>
                            </div>
                            <textarea id="qrCodeContent" rows="4" class="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-brand-blue focus:outline-none font-mono text-sm bg-gray-50" readonly></textarea>
                        </div>

                        <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="text-sm font-medium text-gray-700">Bitmə Tarixi</label>
                                <input type="datetime-local" id="qrCodeExpires" class="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:border-brand-blue focus:outline-none">
                            </div>
                            <div>
                                <label class="text-sm font-medium text-gray-700">Ölçü</label>
                                <select id="qrCodeSize" class="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:border-brand-blue focus:outline-none">
                                    <option value="300">Kiçik (300x300)</option>
                                    <option value="500" selected>Orta (500x500)</option>
                                    <option value="800">Böyük (800x800)</option>
                                    <option value="1200">Çox Böyük (1200x1200)</option>
                                </select>
                            </div>
                        </div>

                        <div class="mt-6 flex gap-3">
                            <button id="generateQrCodeBtn" class="flex-1 bg-gradient-to-r from-brand-blue to-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition flex items-center justify-center gap-2">
                                <i class="fa-solid fa-qrcode"></i> QR Kod Yarat
                            </button>
                            <button id="downloadQrCodeBtn" class="px-6 py-3 bg-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-300 transition disabled:opacity-50" disabled>
                                <i class="fa-solid fa-download"></i> Yüklə
                            </button>
                        </div>
                    </div>

                    <!-- Display -->
                    <div id="qrCodeDisplayContainer" class="hidden mt-6">
                        <div class="bg-gray-50 rounded-2xl p-6 text-center">
                            <div class="inline-block bg-white p-4 rounded-2xl shadow-md">
                                <img id="qrCodeImage" src="" alt="QR Kod" style="max-height: 300px;">
                            </div>
                            <div class="mt-4">
                                <p class="text-sm text-gray-500"><i class="fa-regular fa-copy"></i> <span id="qrCodeDisplayName">QR Kod</span></p>
                                <p class="text-xs text-gray-400 mt-1"><span id="qrCodeDisplayId">ID: -</span></p>
                            </div>
                            <div class="mt-4 flex gap-3 justify-center flex-wrap">
                                <button id="saveQrCodeBtn" class="px-6 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition flex items-center gap-2">
                                    <i class="fa-solid fa-save"></i> Yadda Saxla
                                </button>
                                <button id="newQrCodeBtn" class="px-6 py-2 bg-gray-200 text-gray-600 rounded-xl hover:bg-gray-300 transition flex items-center gap-2">
                                    <i class="fa-solid fa-plus"></i> Yeni
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- List -->
                    <div id="qrCodeListContainer" class="hidden mt-6">
                        <div class="flex justify-between mb-4">
                            <h4 class="font-semibold text-brand-ink">QR Kodlarım</h4>
                            <button id="refreshQrListBtn" class="text-brand-blue hover:underline text-sm flex items-center gap-1">
                                <i class="fa-solid fa-rotate"></i> Yenilə
                            </button>
                        </div>
                        <div id="qrCodeList" class="space-y-3 max-h-96 overflow-y-auto">
                            <div class="text-center py-8 text-gray-400">
                                <i class="fa-solid fa-spinner fa-spin text-3xl mb-2"></i>
                                <p>Yüklənir...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        console.log('✅ QR Modal dinamik yaradıldı');
    }



    // ==================== İNİT ====================

    initQrCodeModal() {
        if (this._initialized) {
            console.log('ℹ️ QRCodeService artıq init edilib');
            return;
        }

        console.log('🔧 QR Kod Modal başladılır...');

        // Modal yoxdursa yarat
        if (!document.getElementById('qrCodeModal')) {
            this.createModal();
        }

        // Düymələri bağla - BURADA ƏSAS DÜZƏLİŞ
        this.bindButtons();

        // Profil məlumatlarını yüklə
        this.loadUserProfileForVCard();

        this._initialized = true;
        console.log('✅ QR Kod Modal hazırdır');
    }

    // ==================== DÜYMƏLƏRİ BAĞLA ====================

    bindButtons() {
        console.log('🔗 Düymələr bağlanır...');

        // ===== QR Kod Yarat düyməsi =====
        const openBtn = document.getElementById('openQrCodeModalBtn');
        if (openBtn) {
            // Köhnə event-ləri silmək üçün clone
            const newBtn = openBtn.cloneNode(true);
            openBtn.parentNode.replaceChild(newBtn, openBtn);

            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🟢 QR Kod Yarat düyməsinə klik edildi');
                this.openQrCodeModal('create');
            });
            console.log('✅ openQrCodeModalBtn bağlandı');
        }

        // ===== QR Kodlarım düyməsi =====
        const viewBtn = document.getElementById('viewQrCodesBtn');
        if (viewBtn) {
            const newViewBtn = viewBtn.cloneNode(true);
            viewBtn.parentNode.replaceChild(newViewBtn, viewBtn);

            newViewBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🟢 QR Kodlarım düyməsinə klik edildi');
                this.openQrCodeModal('list');
            });
            console.log('✅ viewQrCodesBtn bağlandı');
        }

        // ===== Modal bağla düyməsi - ƏN VACİB =====
        const closeBtn = document.getElementById('closeQrCodeModal');
        if (closeBtn) {
            const newCloseBtn = closeBtn.cloneNode(true);
            closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);

            newCloseBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('❌ Bağla düyməsinə klik edildi');
                this.closeQrCodeModal();
            });
            console.log('✅ closeQrCodeModal bağlandı');
        }

        // ===== QR Kod yarat (generate) düyməsi =====
        const generateBtn = document.getElementById('generateQrCodeBtn');
        if (generateBtn) {
            const newGenerateBtn = generateBtn.cloneNode(true);
            generateBtn.parentNode.replaceChild(newGenerateBtn, generateBtn);

            newGenerateBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔄 QR Kod yarat düyməsinə klik edildi');
                this.generateQrCode();
            });
            console.log('✅ generateQrCodeBtn bağlandı');
        }

        // ===== VCard yenilə düyməsi =====
        const updateBtn = document.getElementById('updateVCardBtn');
        if (updateBtn) {
            const newUpdateBtn = updateBtn.cloneNode(true);
            updateBtn.parentNode.replaceChild(newUpdateBtn, updateBtn);

            newUpdateBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.updateVCardContent();
            });
            console.log('✅ updateVCardBtn bağlandı');
        }

        // ===== Yüklə düyməsi =====
        const downloadBtn = document.getElementById('downloadQrCodeBtn');
        if (downloadBtn) {
            const newDownloadBtn = downloadBtn.cloneNode(true);
            downloadBtn.parentNode.replaceChild(newDownloadBtn, downloadBtn);

            newDownloadBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.downloadQrCode();
            });
            console.log('✅ downloadQrCodeBtn bağlandı');
        }

        // ===== Yadda saxla düyməsi =====
        const saveBtn = document.getElementById('saveQrCodeBtn');
        if (saveBtn) {
            const newSaveBtn = saveBtn.cloneNode(true);
            saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);

            newSaveBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.saveQrCode();
            });
            console.log('✅ saveQrCodeBtn bağlandı');
        }

        // ===== Yeni düyməsi =====
        const newBtn = document.getElementById('newQrCodeBtn');
        if (newBtn) {
            const newNewBtn = newBtn.cloneNode(true);
            newBtn.parentNode.replaceChild(newNewBtn, newBtn);

            newNewBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.resetToCreateMode();
            });
            console.log('✅ newQrCodeBtn bağlandı');
        }

        // ===== Yenilə düyməsi =====
        const refreshBtn = document.getElementById('refreshQrListBtn');
        if (refreshBtn) {
            const newRefreshBtn = refreshBtn.cloneNode(true);
            refreshBtn.parentNode.replaceChild(newRefreshBtn, refreshBtn);

            newRefreshBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.loadQrCodeList();
            });
            console.log('✅ refreshQrListBtn bağlandı');
        }

        // ===== Input dəyişiklikləri =====
        const inputs = ['vcardFirstName', 'vcardLastName', 'vcardPhone', 'vcardEmail',
                       'vcardCompany', 'vcardTitle', 'vcardUrl', 'vcardAddress'];
        inputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                const newEl = el.cloneNode(true);
                el.parentNode.replaceChild(newEl, el);
                newEl.addEventListener('input', () => this.updateVCardContent());
            }
        });

        // ===== Modal xaricinə klik =====
        const modal = document.getElementById('qrCodeModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeQrCodeModal();
                }
            });
        }

        // ===== ESC düyməsi =====
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modalEl = document.getElementById('qrCodeModal');
                if (modalEl && modalEl.style.display === 'flex') {
                    this.closeQrCodeModal();
                }
            }
        });

        console.log('✅ Bütün düymələr bağlandı');
    }

    // ==================== VCARD FUNKSİYALARI ====================

    updateVCardContent() {
        const firstName = document.getElementById('vcardFirstName')?.value || '';
        const lastName = document.getElementById('vcardLastName')?.value || '';
        const phone = document.getElementById('vcardPhone')?.value || '';
        const email = document.getElementById('vcardEmail')?.value || '';
        const company = document.getElementById('vcardCompany')?.value || '';
        const title = document.getElementById('vcardTitle')?.value || '';
        const url = document.getElementById('vcardUrl')?.value || '';
        const address = document.getElementById('vcardAddress')?.value || '';

        const fullName = `${firstName} ${lastName}`.trim();
        const lastNameFirst = `${lastName};${firstName};;;`;

        // ✅ QR kodun UUID-i (əgər varsa)
        const qrUuid = this.currentQrData?.qr_code_uuid || this.currentQrData?.uuid || 'unknown';

        // ✅ Skan URL-i (backend-ə bildiriş göndərmək üçün)
        const scanUrl = `https://guvenfinans.az/api/v1/qr-codes/scan/${qrUuid}`;

        // ✅ VCard yarat
        let vcard = `BEGIN:VCARD\nVERSION:3.0\n`;

        if (fullName) vcard += `FN:${fullName}\n`;
        if (lastNameFirst) vcard += `N:${lastNameFirst}\n`;
        if (phone) vcard += `TEL;TYPE=CELL:${phone}\n`;
        if (email) vcard += `EMAIL:${email}\n`;
        if (company) vcard += `ORG:${company}\n`;
        if (title) vcard += `TITLE:${title}\n`;

        // ✅ URL sahəsinə skan linkini əlavə et (kontakt saxlanılanda link açılacaq)
        if (url) {
            vcard += `URL:${url}\n`;
        }

        // ✅ NOTE sahəsinə skan linkini əlavə et (bəzi telefonlar bunu avtomatik açır)
        vcard += `NOTE:Skan linki: ${scanUrl}\n`;

        if (address) vcard += `ADR;TYPE=WORK:;;${address};;\n`;

        vcard += `END:VCARD`;

        const content = document.getElementById('qrCodeContent');
        if (content) content.value = vcard;
    }

    async loadUserProfileForVCard() {
        try {
            const userData = await this.api.get('/users/me');
            if (userData) {
                this._userProfile = userData;

                const firstName = document.getElementById('vcardFirstName');
                const lastName = document.getElementById('vcardLastName');
                const phone = document.getElementById('vcardPhone');
                const email = document.getElementById('vcardEmail');

                if (firstName) firstName.value = userData.ceo_name || '';
                if (lastName) lastName.value = userData.ceo_lastname || '';
                if (phone) phone.value = userData.ceo_phone || '';
                if (email) email.value = userData.ceo_email || '';

                if (userData.company_code) {
                    try {
                        const companyData = await this.api.get(`/companies/code/${userData.company_code}`);
                        if (companyData) {
                            const company = document.getElementById('vcardCompany');
                            const title = document.getElementById('vcardTitle');
                            if (company) company.value = companyData.company_name || '';
                            if (title) title.value = userData.position || '';
                        }
                    } catch (e) {
                        console.warn('Şirkət məlumatları gətirilə bilmədi:', e);
                    }
                }

                this.updateVCardContent();
                console.log('✅ Profil məlumatları yükləndi');
            }
        } catch (error) {
            console.warn('⚠️ Profil məlumatları yüklənə bilmədi:', error);
        }
    }

    // ==================== MODAL IDARƏSİ ====================

    openQrCodeModal(mode = 'create') {
        console.log('📂 QR Modal açılır, mode:', mode);

        let modal = document.getElementById('qrCodeModal');

        if (!modal) {
            console.log('⚠️ QR Kod modal tapılmadı, yaradılır...');
            this.createModal();
            modal = document.getElementById('qrCodeModal');
            if (!modal) {
                console.error('❌ Modal yaradıla bilmədi!');
                return;
            }
        }

        // Modalı göstər
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        // Düymələri təkrar bağla (modal yeni yaradılıbsa)
        this.bindButtons();

        // Reset et
        this.resetToCreateMode();

        if (mode === 'list') {
            this.isViewMode = true;
            const form = document.getElementById('qrCodeFormContainer');
            const display = document.getElementById('qrCodeDisplayContainer');
            const list = document.getElementById('qrCodeListContainer');
            if (form) form.classList.add('hidden');
            if (display) display.classList.add('hidden');
            if (list) list.classList.remove('hidden');
            this.loadQrCodeList();
        } else {
            this.isViewMode = false;
            const form = document.getElementById('qrCodeFormContainer');
            const display = document.getElementById('qrCodeDisplayContainer');
            const list = document.getElementById('qrCodeListContainer');
            if (form) form.classList.remove('hidden');
            if (display) display.classList.add('hidden');
            if (list) list.classList.add('hidden');
            this.updateVCardContent();
        }

        console.log('✅ Modal açıldı');
    }

    closeQrCodeModal() {
        console.log('📂 QR Modal bağlanır');
        const modal = document.getElementById('qrCodeModal');
        if (!modal) return;

        modal.style.display = 'none';
        document.body.style.overflow = '';
    }

    resetToCreateMode() {
        this.isViewMode = false;
        this.currentQrData = null;

        const form = document.getElementById('qrCodeFormContainer');
        const display = document.getElementById('qrCodeDisplayContainer');
        const list = document.getElementById('qrCodeListContainer');
        const image = document.getElementById('qrCodeImage');
        const displayName = document.getElementById('qrCodeDisplayName');
        const displayId = document.getElementById('qrCodeDisplayId');
        const downloadBtn = document.getElementById('downloadQrCodeBtn');

        if (form) form.classList.remove('hidden');
        if (display) display.classList.add('hidden');
        if (list) list.classList.add('hidden');
        if (image) image.src = '';
        if (displayName) displayName.textContent = 'QR Kod';
        if (displayId) displayId.textContent = 'ID: -';
        if (downloadBtn) downloadBtn.disabled = true;

        this.updateVCardContent();
    }

    // ==================== QR KOD YARAT ====================

    async generateQrCode() {
        console.log('🔄 QR kod yaradılır...');

        const firstName = document.getElementById('vcardFirstName')?.value || '';
        const lastName = document.getElementById('vcardLastName')?.value || '';
        const phone = document.getElementById('vcardPhone')?.value || '';
        const email = document.getElementById('vcardEmail')?.value || '';
        const company = document.getElementById('vcardCompany')?.value || '';
        const title = document.getElementById('vcardTitle')?.value || '';
        const url = document.getElementById('vcardUrl')?.value || '';
        const address = document.getElementById('vcardAddress')?.value || '';
        const expires = document.getElementById('qrCodeExpires')?.value || '';

        const name = `${firstName} ${lastName}`.trim() || 'QR Kod';

        if (!firstName || !lastName || !phone || !email) {
            this.showNotification('Zəhmət olmasa Ad, Soyad, Telefon və Email doldurun', 'warning');
            return;
        }

        const generateBtn = document.getElementById('generateQrCodeBtn');
        if (!generateBtn) return;

        const originalText = generateBtn.innerHTML;
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Yaradılır...';

        try {
            // ✅ Cari istifadəçi ID-ni tap
            let userId = null;
            const userData = localStorage.getItem('userData');
            if (userData) {
                try {
                    const parsed = JSON.parse(userData);
                    userId = parsed.user?.id || parsed.id;
                } catch (e) {}
            }
            if (!userId && window.app?.user?.id) userId = window.app.user.id;
            if (!userId && window.profileApp?.currentUserId) userId = window.profileApp.currentUserId;

            if (!userId) {
                try {
                    const currentUser = await this.api.get('/users/me');
                    if (currentUser && currentUser.id) userId = currentUser.id;
                } catch (e) {}
            }

            if (!userId) {
                throw new Error('İstifadəçi ID tapılmadı!');
            }

            console.log('👤 İstifadəçi ID:', userId);

            // ✅ VCard məzmununu yarat (metadata üçün)
            const vcardContent = this.generateVCardContent(firstName, lastName, phone, email, company, title, url, address);

            // ✅ ƏVVƏLCƏ QR KODU YARAT (məlumatları backend-ə göndər)
            const qrData = {
                user_id: userId,
                qr_code_name: name,
                qr_code_type: 'vcard',
                qr_content: vcardContent,  // VCard məzmunu
                expires_at: expires || null,
                metadata: {
                    first_name: firstName,
                    last_name: lastName,
                    phone: phone,
                    email: email,
                    company: company,
                    title: title,
                    url: url,
                    address: address,
                    vcard: vcardContent  // VCard-ı metadata-da saxla
                }
            };

            console.log('📤 QR kod yaradılır...');

            const token = this.api.token || localStorage.getItem('guven_token') || localStorage.getItem('access_token');
            const baseUrl = this.api.baseUrl || 'https://guvenfinans.az/proxy.php';
            const apiUrl = `${baseUrl}/api/v1/qr-codes/create`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(qrData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const responseData = await response.json();
            console.log('📥 Cavab:', responseData);

            // ✅ UUID-ni saxla
            const qrUuid = responseData.qr_code_uuid || responseData.uuid;
            this.currentQrData = responseData;
            this.currentQrData.qr_code_uuid = qrUuid;

            // ✅ QR KODUN MƏZMUNU URL İLƏ DƏYİŞ - YALNIZ URL!
            const scanUrl = `https://guvenfinans.az/qr-scan/qr-scan.html?qr=${qrUuid}`;

            // QR kodu URL ilə yenilə (backend-də)
            const updateResponse = await fetch(`${baseUrl}/api/v1/qr-codes/${responseData.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    qr_content: scanUrl,  // ✅ VCard əvəzinə URL
                    metadata: {
                        ...qrData.metadata,
                        qr_uuid: qrUuid,
                        scan_url: scanUrl,
                        vcard: vcardContent
                    }
                })
            });

            if (!updateResponse.ok) {
                console.warn('⚠️ QR kod yenilənə bilmədi, amma davam edirik...');
            }

            // ✅ QR kodu yenidən gətir (yenilənmiş məlumatlarla)
            const finalResponse = await fetch(`${baseUrl}/api/v1/qr-codes/${responseData.id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            const finalData = await finalResponse.json();
            console.log('📥 Son məlumat:', finalData);

            // ✅ QR kodu göstər (URL ilə)
            this.currentQrData = finalData;
            this.displayQrCode(finalData);

            this.showNotification('✅ QR kod uğurla yaradıldı!', 'success');

        } catch (error) {
            console.error('❌ QR kod xətası:', error);
            this.showNotification(`❌ ${error.message}`, 'error');
        } finally {
            generateBtn.disabled = false;
            generateBtn.innerHTML = originalText;
        }
    }

    /**
     * VCard məzmunu yarat (metadata üçün)
     */
    generateVCardContent(firstName, lastName, phone, email, company, title, url, address) {
        const fullName = `${firstName} ${lastName}`.trim();
        const lastNameFirst = `${lastName};${firstName};;;`;

        let vcard = `BEGIN:VCARD\nVERSION:3.0\n`;

        if (fullName) vcard += `FN:${fullName}\n`;
        if (lastNameFirst) vcard += `N:${lastNameFirst}\n`;
        if (phone) vcard += `TEL;TYPE=CELL:${phone}\n`;
        if (email) vcard += `EMAIL:${email}\n`;
        if (company) vcard += `ORG:${company}\n`;
        if (title) vcard += `TITLE:${title}\n`;
        if (url) vcard += `URL;TYPE=WORK:${url}\n`;
        if (address) vcard += `ADR;TYPE=WORK:;;${address};;\n`;

        vcard += `END:VCARD`;

        return vcard;
    }

    // ==================== LOKAL QR KOD ====================

    createLocalQrCode(content, size = 500) {
        return new Promise((resolve, reject) => {
            try {
                if (typeof QRCode === 'undefined') {
                    const script = document.createElement('script');
                    script.src = 'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js';
                    script.onload = () => this._generateLocalQr(content, size, resolve, reject);
                    script.onerror = () => reject(new Error('QRCode.js yüklənə bilmədi'));
                    document.head.appendChild(script);
                } else {
                    this._generateLocalQr(content, size, resolve, reject);
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    _generateLocalQr(content, size, resolve, reject) {
        try {
            const container = document.createElement('div');
            container.style.position = 'absolute';
            container.style.left = '-9999px';
            container.style.top = '-9999px';
            document.body.appendChild(container);

            new QRCode(container, {
                text: content,
                width: size,
                height: size,
                colorDark: '#000000',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.H
            });

            const canvas = container.querySelector('canvas');
            if (!canvas) {
                document.body.removeChild(container);
                reject(new Error('Canvas yaradıla bilmədi'));
                return;
            }

            const imageData = canvas.toDataURL('image/png');
            document.body.removeChild(container);

            resolve({
                qr_image_data: imageData.split(',')[1],
                qr_code_name: 'Lokal QR Kod',
                qr_code_type: 'vcard',
                id: 'local-' + Date.now()
            });
        } catch (error) {
            reject(error);
        }
    }

    // ==================== GÖSTƏR ====================

    displayQrCode(qrData) {
        const form = document.getElementById('qrCodeFormContainer');
        const display = document.getElementById('qrCodeDisplayContainer');
        const list = document.getElementById('qrCodeListContainer');
        const image = document.getElementById('qrCodeImage');
        const displayName = document.getElementById('qrCodeDisplayName');
        const displayId = document.getElementById('qrCodeDisplayId');
        const downloadBtn = document.getElementById('downloadQrCodeBtn');
        const saveBtn = document.getElementById('saveQrCodeBtn');

        if (form) form.classList.add('hidden');
        if (display) display.classList.remove('hidden');
        if (list) list.classList.add('hidden');

        // Şəkli göstər
        if (image) {
            let src = qrData.qr_image_data;
            if (src && !src.startsWith('data:image')) {
                src = 'data:image/png;base64,' + src;
            }
            image.src = src || '';
            image.onload = () => {
                console.log('✅ QR şəkil yükləndi');
                if (downloadBtn) downloadBtn.disabled = false;
            };
            image.onerror = () => {
                console.warn('⚠️ QR şəkil yüklənmədi');
                if (downloadBtn) downloadBtn.disabled = false;
            };
        }

        // ✅ QR kod məzmununu göstər
        const content = qrData.qr_content || '';
        const isUrl = content.startsWith('http://') || content.startsWith('https://');

        if (displayName) {
            const scanInfo = qrData.scan_count !== undefined ? ` (${qrData.scan_count} skan)` : '';
            displayName.textContent = `${qrData.qr_code_name || 'QR Kod'}${scanInfo}`;
        }

        // ✅ ID və məzmun haqqında məlumat
        let idText = `ID: ${qrData.id || '-'}`;
        if (qrData.qr_code_uuid) {
            idText += ` | UUID: ${qrData.qr_code_uuid.substring(0, 8)}...`;
        }
        if (isUrl) {
            idText += ` | 📎 Link: ${content.substring(0, 30)}...`;
        }
        if (qrData.last_scanned_at) {
            const lastScan = new Date(qrData.last_scanned_at).toLocaleString('az-AZ');
            idText += ` | Son skan: ${lastScan}`;
        }
        if (displayId) displayId.textContent = idText;

        if (downloadBtn) downloadBtn.disabled = false;

        if (saveBtn) {
            if (qrData.id && !qrData.id.toString().startsWith('local')) {
                saveBtn.disabled = true;
                saveBtn.title = 'Bu QR kod artıq sistemdə saxlanılıb';
                saveBtn.classList.add('opacity-50', 'cursor-not-allowed');
            } else {
                saveBtn.disabled = false;
                saveBtn.title = 'QR kodu yadda saxla';
                saveBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        }

        // ✅ QR kodun altında linki göstər
        const displayContainer = document.getElementById('qrCodeDisplayContainer');
        if (displayContainer && isUrl) {
            // Köhnə link elementini sil
            const oldLink = displayContainer.querySelector('.qr-content-link');
            if (oldLink) oldLink.remove();

            // Yeni link elementi əlavə et
            const linkDiv = document.createElement('div');
            linkDiv.className = 'qr-content-link mt-3 p-3 bg-blue-50 rounded-xl text-left';
            linkDiv.innerHTML = `
                <p class="text-xs text-gray-500 mb-1">📎 QR kod məzmunu (URL):</p>
                <a href="${content}" target="_blank" class="text-brand-blue hover:underline text-sm break-all">
                    ${content}
                </a>
                <button onclick="navigator.clipboard.writeText('${content}')" 
                        class="ml-2 text-xs text-gray-400 hover:text-brand-blue">
                    <i class="fa-regular fa-copy"></i>
                </button>
            `;
            displayContainer.appendChild(linkDiv);
        }
    
        this.currentQrData = qrData;
    }

    displayLocalQrCode(qrData, name, type) {
        const form = document.getElementById('qrCodeFormContainer');
        const display = document.getElementById('qrCodeDisplayContainer');
        const list = document.getElementById('qrCodeListContainer');
        const image = document.getElementById('qrCodeImage');
        const displayName = document.getElementById('qrCodeDisplayName');
        const displayId = document.getElementById('qrCodeDisplayId');
        const downloadBtn = document.getElementById('downloadQrCodeBtn');

        if (form) form.classList.add('hidden');
        if (display) display.classList.remove('hidden');
        if (list) list.classList.add('hidden');

        if (image) image.src = 'data:image/png;base64,' + qrData.qr_image_data;
        if (displayName) displayName.textContent = name || 'QR Kod';
        if (displayId) displayId.textContent = 'ID: lokal';
        if (downloadBtn) downloadBtn.disabled = false;

        this.currentQrData = qrData;
    }

    // ==================== YÜKLƏ ====================

    downloadQrCode() {
        const image = document.getElementById('qrCodeImage');
        if (!image || !image.src || image.src === '') {
            this.showNotification('Yüklənəcək QR kod yoxdur', 'warning');
            return;
        }

        try {
            // Şəklin adını al
            const name = document.getElementById('qrCodeDisplayName')?.textContent || 'qr_code';
            const fileName = `${name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.png`;

            // 1. Canvas ilə yüksək keyfiyyətli yüklə
            const img = new Image();
            img.crossOrigin = 'anonymous';

            img.onload = () => {
                // Canvas yarat
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // Böyük ölçüdə canvas (yüksək keyfiyyət üçün)
                const size = 1200;
                canvas.width = size;
                canvas.height = size;

                // Ağ fon
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, size, size);

                // Mərkəzləşdirilmiş şəkil
                const margin = size * 0.1;
                const drawSize = size - (margin * 2);
                ctx.drawImage(img, margin, margin, drawSize, drawSize);

                // PNG olaraq yüklə
                const link = document.createElement('a');
                link.download = fileName;
                link.href = canvas.toDataURL('image/png', 1.0);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                this.showNotification('✅ QR kod yükləndi!', 'success');
            };

            img.onerror = () => {
                // Canvas işləmirsə, birbaşa şəkli yüklə
                const link = document.createElement('a');
                link.download = fileName;
                link.href = image.src;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                this.showNotification('✅ QR kod yükləndi!', 'success');
            };

            img.src = image.src;

        } catch (error) {
            console.error('❌ Yükləmə xətası:', error);
            this.showNotification('❌ QR kod yüklənə bilmədi', 'error');
        }
    }

    // ==================== YADDA SAXLA ====================

    async saveQrCode() {
        if (!this.currentQrData) {
            this.showNotification('Yadda saxlanacaq QR kod yoxdur', 'warning');
            return;
        }

        const saveBtn = document.getElementById('saveQrCodeBtn');
        if (!saveBtn) return;

        const originalText = saveBtn.innerHTML;
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saxlanılır...';

        try {
            // Əgər artıq backend-də saxlanılıbsa, təkrar saxlamaya ehtiyac yoxdur
            if (this.currentQrData.id && !this.currentQrData.id.toString().startsWith('local')) {
                this.showNotification('✅ QR kod artıq sistemdə saxlanılıb!', 'success');
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalText;
                return;
            }

            const name = document.getElementById('qrCodeDisplayName')?.textContent || 'QR Kod';
            const content = document.getElementById('qrCodeContent')?.value || '';

            // İstifadəçi ID-ni tap
            let userId = null;
            const userData = localStorage.getItem('userData');
            if (userData) {
                try {
                    const parsed = JSON.parse(userData);
                    userId = parsed.user?.id || parsed.id;
                } catch (e) {}
            }
            if (!userId && window.app?.user?.id) {
                userId = window.app.user.id;
            }
            if (!userId) {
                throw new Error('İstifadəçi ID tapılmadı');
            }

            const qrData = {
                user_id: userId,
                qr_code_name: name,
                qr_code_type: 'vcard',
                qr_content: content,
                qr_image_data: this.currentQrData.qr_image_data,
                expires_at: this.currentQrData.expires_at || null
            };

            console.log('💾 QR kod saxlanılır:', qrData);

            const response = await this.api.post('/qr-codes/create', qrData);

            // Cavabı yenilə
            this.currentQrData = response;
            this.displayQrCode(response);

            this.showNotification('✅ QR kod uğurla yadda saxlanıldı!', 'success');

        } catch (error) {
            console.error('❌ Saxlama xətası:', error);

            // Xəta mesajını göstər
            let errorMsg = 'QR kod saxlanıla bilmədi';
            if (error.message && error.message.includes('duplicate')) {
                errorMsg = 'Bu QR kod artıq sistemdə mövcuddur';
            } else if (error.message) {
                errorMsg = error.message;
            }

            this.showNotification(`❌ ${errorMsg}`, 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;
        }
    }

    // ==================== QR KODLAR SİYAHISI ====================

    async loadQrCodeList() {
        const listContainer = document.getElementById('qrCodeList');
        if (!listContainer) return;

        listContainer.innerHTML = `
            <div class="text-center py-8 text-gray-400">
                <i class="fa-solid fa-spinner fa-spin text-3xl mb-2"></i>
                <p>QR kodlar yüklənir...</p>
            </div>
        `;

        try {
            const response = await this.api.get('/qr-codes/list?limit=50');
            const items = response.items || [];

            if (items.length === 0) {
                listContainer.innerHTML = `
                    <div class="text-center py-8 text-gray-400">
                        <i class="fa-solid fa-qrcode text-4xl mb-2"></i>
                        <p>Heç bir QR kod tapılmadı</p>
                    </div>
                `;
                return;
            }

            let html = '';
            items.forEach(qr => {
                html += `
                    <div class="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="font-semibold">${this._escapeHtml(qr.qr_code_name) || 'Adsız'}</p>
                                <p class="text-xs text-gray-400">${qr.qr_code_type || 'text'} • ${qr.scan_count || 0} skan</p>
                                <p class="text-xs text-gray-400">${qr.created_at ? new Date(qr.created_at).toLocaleDateString('az-AZ') : '-'}</p>
                            </div>
                            <div class="flex gap-2">
                                <button class="view-qr-btn text-brand-blue hover:text-blue-700 p-2 rounded-full hover:bg-blue-50" data-id="${qr.id}">
                                    <i class="fa-solid fa-eye"></i>
                                </button>
                                <button class="delete-qr-btn text-red-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50" data-id="${qr.id}">
                                    <i class="fa-solid fa-trash-can"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            });

            listContainer.innerHTML = html;

            listContainer.querySelectorAll('.view-qr-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const id = btn.dataset.id;
                    try {
                        const qrData = await this.api.get(`/qr-codes/${id}`);
                        this.displayQrCode(qrData);
                        document.getElementById('qrCodeListContainer').classList.add('hidden');
                        document.getElementById('qrCodeDisplayContainer').classList.remove('hidden');
                    } catch (error) {
                        this.showNotification('QR kod tapılmadı', 'error');
                    }
                });
            });

            listContainer.querySelectorAll('.delete-qr-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const id = btn.dataset.id;
                    if (confirm('Bu QR kodu silmək istədiyinizə əminsiniz?')) {
                        try {
                            await this.api.delete(`/qr-codes/${id}?permanent=false`);
                            this.showNotification('QR kod silindi', 'success');
                            await this.loadQrCodeList();
                        } catch (error) {
                            this.showNotification('QR kod silinə bilmədi', 'error');
                        }
                    }
                });
            });

        } catch (error) {
            console.error('❌ QR kodlar yüklənərkən xəta:', error);
            listContainer.innerHTML = `
                <div class="text-center py-8 text-red-400">
                    <i class="fa-solid fa-circle-exclamation text-3xl mb-2"></i>
                    <p>Məlumatlar yüklənərkən xəta baş verdi</p>
                </div>
            `;
        }
    }

    // ==================== KÖMƏKÇİ ====================

    showNotification(message, type = 'info') {
        console.log(`📢 [${type}] ${message}`);

        if (typeof Swal !== 'undefined') {
            const icons = { success: 'success', error: 'error', warning: 'warning', info: 'info' };
            Swal.fire({
                icon: icons[type] || 'info',
                title: message,
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true
            });
        } else {
            alert(message);
        }
    }

    _escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }
}

// Global
window.QRCodeService = QRCodeService;
console.log('✅ QRCodeService yükləndi');