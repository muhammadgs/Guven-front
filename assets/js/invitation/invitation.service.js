/**
 * Dəvət Linkləri (Invitation) Service
 * Profile app üçün tam inteqrasiya
 */

class InvitationService {
    constructor(apiService, authService, uiService = null) {
        this.api = apiService;
        this.auth = authService;
        this.ui = uiService;
        this.currentPage = 1;
        this.pageSize = 10;
        this.invitationsSection = null;
        this._initialized = false;
    }

    setUI(uiService) {
        this.ui = uiService;
    }

    // ==================== API FUNKSİYALARI ====================

    async createInvitation(data) {
        try {
            console.log('📤 Yeni dəvət linki yaradılır:', data);
            const response = await this.api.post('/invitations/create', data);
            return response;
        } catch (error) {
            console.error('❌ Dəvət linki yaradılarkən xəta:', error);
            throw error;
        }
    }

    async getInvitations(companyCode, page = 1, limit = 10) {
        try {
            const response = await this.api.get(`/invitations/company/${companyCode}?page=${page}&limit=${limit}`);
            return response;
        } catch (error) {
            console.error('❌ Dəvət linkləri gətirilərkən xəta:', error);
            throw error;
        }
    }

    async getInvitationStats(companyCode = null) {
        try {
            const url = companyCode ? `/invitations/stats?company_code=${companyCode}` : '/invitations/stats';
            const response = await this.api.get(url);
            return response;
        } catch (error) {
            console.error('❌ Statistik gətirilərkən xəta:', error);
            return {
                total: 0,
                used_count: 0,
                active_count: 0,
                expired_count: 0
            };
        }
    }

    async cancelInvitation(token) {
        try {
            const response = await this.api.delete(`/invitations/cancel/${token}`);
            return response;
        } catch (error) {
            console.error('❌ Link ləğv edilərkən xəta:', error);
            throw error;
        }
    }

    // ==================== UI FUNKSİYALARI ====================

    /**
     * Dəvət linkləri bölməsini göstər
     */
    async showInvitationsSection() {
        console.log('📋 Dəvət linkləri bölməsi açılır...');

        // Artıq varsa, yenidən yaratma
        const existing = document.getElementById('invitationsSection');
        if (existing) {
            existing.style.display = 'block';
            await this.loadInvitations();
            return;
        }

        // Main container-i tap
        const container = document.querySelector('main .overflow-y-auto') || document.querySelector('main');
        if (!container) {
            console.error('❌ Container tapılmadı');
            return;
        }

        // Bölməni yarat
        const section = document.createElement('section');
        section.id = 'invitationsSection';
        section.className = 'w-full';
        section.style.display = 'block';

        section.innerHTML = this.getInvitationsHTML();
        container.appendChild(section);

        this.invitationsSection = section;

        // Event listener-lar
        this.attachSectionEvents();

        // Məlumatları yüklə
        await this.loadInvitations();

        console.log('✅ Dəvət linkləri bölməsi yaradıldı');
    }

    /**
     * HTML template - PROFESİONAL GÖRÜNÜŞ
     */
    getInvitationsHTML() {
        return `
            <!-- Başlıq -->
            <div class="flex items-center justify-between mb-6">
                <div>
                    <h2 class="text-2xl font-bold text-gray-800 flex items-center gap-3">
                        <i class="fa-solid fa-link text-blue-500"></i>
                        Dəvət Linkləri
                    </h2>
                    <p class="text-sm text-gray-500 mt-1">Şirkətə yeni istifadəçilər dəvət etmək üçün linklər</p>
                </div>
                <button id="createInvitationBtn" class="px-5 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all duration-200 flex items-center gap-2 text-sm font-medium shadow-sm hover:shadow-md">
                    <i class="fa-solid fa-plus"></i> Yeni Link Yarat
                </button>
            </div>
    
            <!-- Statistik kartlar -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div class="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-xs font-medium text-gray-400 uppercase tracking-wider">Cəmi</p>
                            <p class="text-2xl font-bold text-gray-800 mt-1" id="totalInvitationsCount">0</p>
                        </div>
                        <div class="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                            <i class="fa-solid fa-link text-blue-500"></i>
                        </div>
                    </div>
                </div>
                <div class="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-xs font-medium text-gray-400 uppercase tracking-wider">Aktiv</p>
                            <p class="text-2xl font-bold text-green-600 mt-1" id="activeInvitationsCount">0</p>
                        </div>
                        <div class="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                            <i class="fa-solid fa-circle-check text-green-500"></i>
                        </div>
                    </div>
                </div>
                <div class="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-xs font-medium text-gray-400 uppercase tracking-wider">İstifadə olunmuş</p>
                            <p class="text-2xl font-bold text-amber-600 mt-1" id="usedInvitationsCount">0</p>
                        </div>
                        <div class="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                            <i class="fa-solid fa-check-double text-amber-500"></i>
                        </div>
                    </div>
                </div>
                <div class="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-xs font-medium text-gray-400 uppercase tracking-wider">Vaxtı keçmiş</p>
                            <p class="text-2xl font-bold text-red-600 mt-1" id="expiredInvitationsCount">0</p>
                        </div>
                        <div class="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                            <i class="fa-solid fa-clock text-red-500"></i>
                        </div>
                    </div>
                </div>
            </div>
    
            <!-- Linklər cədvəli -->
            <div class="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead>
                            <tr class="bg-gray-50/80 border-b border-gray-100">
                                <th class="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3.5">#</th>
                                <th class="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3.5">Token</th>
                                <th class="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3.5">Email</th>
                                <th class="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3.5">Status</th>
                                <th class="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3.5">Bitmə vaxtı</th>
                                <th class="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3.5">Əməliyyatlar</th>
                            </tr>
                        </thead>
                        <tbody id="invitationsTableBody" class="divide-y divide-gray-50">
                            <tr>
                                <td colspan="6" class="text-center py-12 text-gray-400">
                                    <div class="flex flex-col items-center gap-2">
                                        <div class="w-10 h-10 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin"></div>
                                        <p class="text-sm">Linklər yüklənir...</p>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
    
            <!-- Pagination -->
            <div class="mt-5 flex items-center justify-between">
                <div class="text-sm text-gray-500">
                    <span id="invitationShowingText">0-0 / 0</span>
                </div>
                <div class="flex gap-1.5">
                    <button id="invitationPrevPageBtn" class="px-3.5 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition text-sm flex items-center gap-1">
                        <i class="fa-solid fa-chevron-left text-xs"></i> Əvvəlki
                    </button>
                    <button id="invitationNextPageBtn" class="px-3.5 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition text-sm flex items-center gap-1">
                        Sonrakı <i class="fa-solid fa-chevron-right text-xs"></i>
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Bölmə event listener-ları
     */
    attachSectionEvents() {
        // Yeni Link Yarat
        const createBtn = document.getElementById('createInvitationBtn');
        if (createBtn) {
            createBtn.addEventListener('click', () => {
                this.showCreateInvitationModal();
            });
        }

        // Pagination
        const prevBtn = document.getElementById('invitationPrevPageBtn');
        const nextBtn = document.getElementById('invitationNextPageBtn');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.loadInvitations();
                }
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.currentPage++;
                this.loadInvitations();
            });
        }
    }

    /**
     * Linkləri yüklə
     */
    async loadInvitations() {
        try {
            // ✅ DÜZƏLİŞ: getUserData əvəzinə birbaşa localStorage-dan oxu
            let companyCode = null;

            // 1. localStorage-dan yoxla
            const savedData = localStorage.getItem('userData');
            if (savedData) {
                try {
                    const parsed = JSON.parse(savedData);
                    companyCode = parsed.user?.company_code || parsed.user?.companyCode || parsed.company_code || parsed.companyCode;
                    console.log('📋 localStorage-dan şirkət kodu:', companyCode);
                } catch (e) {
                    console.warn('localStorage parse error:', e);
                }
            }

            // 2. Əgər localStorage-dan alınmadısa, window.app-dan yoxla
            if (!companyCode && window.app) {
                companyCode = window.app.currentCompanyCode || window.app.user?.company_code;
                console.log('📋 window.app-dan şirkət kodu:', companyCode);
            }

            // 3. Hələ də yoxdursa, authService-dən cəhd et
            if (!companyCode && this.auth && this.auth.getUser) {
                try {
                    const user = await this.auth.getUser();
                    companyCode = user?.company_code || user?.companyCode;
                    console.log('📋 authService-dən şirkət kodu:', companyCode);
                } catch (e) {
                    console.warn('authService.getUser xətası:', e);
                }
            }

            if (!companyCode) {
                console.warn('⚠️ Şirkət kodu tapılmadı');
                this.showEmptyState();
                return;
            }

            // Statistikaları yüklə
            await this.loadStats(companyCode);

            // Linkləri yüklə
            const response = await this.getInvitations(companyCode, this.currentPage, this.pageSize);
            console.log('📥 Dəvət linkləri:', response);

            if (response && response.invitations && response.invitations.length > 0) {
                this.renderInvitationsTable(response.invitations);
                this.updatePagination(response.total || response.invitations.length);
            } else {
                this.showEmptyState();
            }

        } catch (error) {
            console.error('❌ Linklər yüklənərkən xəta:', error);
            this.showErrorState(error.message);
        }
    }

    /**
     * Statistikaları yüklə
     */
    async loadStats(companyCode) {
        try {
            const stats = await this.getInvitationStats(companyCode);
            console.log('📊 Statistikalar:', stats);

            document.getElementById('totalInvitationsCount').textContent = stats.total || 0;
            document.getElementById('activeInvitationsCount').textContent = stats.active_count || 0;
            document.getElementById('usedInvitationsCount').textContent = stats.used_count || 0;
            document.getElementById('expiredInvitationsCount').textContent = stats.expired_count || 0;
        } catch (error) {
            console.error('❌ Statistik yüklənərkən xəta:', error);
        }
    }

    renderInvitationsTable(invitations) {
        const tbody = document.getElementById('invitationsTableBody');
        if (!tbody) return;

        if (!invitations || invitations.length === 0) {
            this.showEmptyState();
            return;
        }

        let html = '';
        invitations.forEach((inv, index) => {
            const isActive = !inv.used && new Date(inv.expires_at) > new Date() && inv.status !== 'cancelled';
            const statusClass = inv.used ? 'bg-gray-100 text-gray-600' :
                               isActive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600';
            const statusText = inv.used ? 'İstifadə olunub' :
                              isActive ? 'Aktiv' : 'Vaxtı keçib';

            html += `
                <tr class="border-b border-gray-100 hover:bg-gray-50 transition">
                    <td class="px-6 py-4 text-sm text-gray-500">${(this.currentPage - 1) * this.pageSize + index + 1}</td>
                    <td class="px-6 py-4">
                        <div class="flex items-center gap-2">
                            <span class="text-sm font-mono text-gray-600 truncate max-w-[150px]">${inv.token.substring(0, 16)}...</span>
                            <button class="copy-token-btn text-gray-400 hover:text-brand-blue" data-token="${inv.token}">
                                <i class="fa-regular fa-copy text-sm"></i>
                            </button>
                        </div>
                    </td>
                    <td class="px-6 py-4 text-sm text-gray-600">${inv.email || '-'}</td>
                    <td class="px-6 py-4">
                        <span class="px-2 py-1 rounded-full text-xs font-medium ${statusClass}">${statusText}</span>
                    </td>
                    <td class="px-6 py-4 text-sm text-gray-500">${new Date(inv.expires_at).toLocaleString('az-AZ')}</td>
                    <td class="px-6 py-4">
                        <div class="flex items-center gap-2">
                            ${isActive ? `
                                <button class="copy-link-btn text-blue-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50" data-token="${inv.token}" title="Linki kopyala">
                                    <i class="fa-regular fa-copy"></i>
                                </button>
                                <button class="cancel-invitation-btn text-amber-500 hover:text-amber-700 p-1 rounded hover:bg-amber-50" data-token="${inv.token}" title="Ləğv et">
                                    <i class="fa-solid fa-trash-can"></i>
                                </button>
                                <button class="hard-delete-btn text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50" data-token="${inv.token}" title="Tam sil">
                                    <i class="fa-solid fa-trash-can"></i>
                                </button>
                            ` : `
                                <span class="text-gray-400 text-xs">-</span>
                            `}
                        </div>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
        this.attachTableEvents();
    }

    /**
     * Cədvəl event listener-ları
     */
    attachTableEvents() {
        // Token kopyala
        document.querySelectorAll('.copy-token-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const token = btn.dataset.token;
                navigator.clipboard.writeText(token).then(() => {
                    if (this.ui) {
                        this.ui.showNotification('Token kopyalandı!', 'success');
                    }
                });
            });
        });

        // Link kopyala
        document.querySelectorAll('.copy-link-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const token = btn.dataset.token;
                const link = `https://guvenfinans.az/register-owner.html?token=${token}`;
                navigator.clipboard.writeText(link).then(() => {
                    if (this.ui) {
                        this.ui.showNotification('Dəvət linki kopyalandı!', 'success');
                    }
                });
            });
        });
        // ✅ TAM SİL (HARD DELETE)
        document.querySelectorAll('.hard-delete-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const token = btn.dataset.token;

                if (typeof Swal !== 'undefined') {
                    const result = await Swal.fire({
                        title: 'Linki tam sil?',
                        text: 'Bu link verilənlər bazasından tamamilə silinəcək. Bu əməliyyat geri alına bilməz!',
                        icon: 'error',
                        showCancelButton: true,
                        confirmButtonColor: '#ef4444',
                        cancelButtonColor: '#6b7280',
                        confirmButtonText: 'Bəli, tam sil',
                        cancelButtonText: 'Ləğv et'
                    });

                    if (!result.isConfirmed) return;
                } else {
                    if (!confirm('Bu linki tamamilə silmək istədiyinizə əminsiniz? (Geri alına bilməz)')) return;
                }

                try {
                    await this.hardDeleteInvitation(token);
                    if (this.ui) {
                        this.ui.showNotification('Link tamamilə silindi!', 'success');
                    }
                    await this.loadInvitations();
                } catch (error) {
                    if (this.ui) {
                        this.ui.showNotification(error.message || 'Link silinə bilmədi', 'error');
                    }
                }
            });
        });



        // ✅ Ləğv et (status = 'cancelled')
        document.querySelectorAll('.cancel-invitation-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const token = btn.dataset.token;

                if (typeof Swal !== 'undefined') {
                    const result = await Swal.fire({
                        title: 'Linki ləğv et?',
                        text: 'Bu link ləğv ediləcək.',
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#f59e0b',
                        cancelButtonColor: '#6b7280',
                        confirmButtonText: 'Bəli, ləğv et',
                        cancelButtonText: 'Ləğv et'
                    });

                    if (!result.isConfirmed) return;
                } else {
                    if (!confirm('Bu linki ləğv etmək istədiyinizə əminsiniz?')) return;
                }

                try {
                    await this.cancelInvitation(token);
                    if (this.ui) {
                        this.ui.showNotification('Link ləğv edildi!', 'success');
                    }
                    await this.loadInvitations();
                } catch (error) {
                    if (this.ui) {
                        this.ui.showNotification(error.message || 'Link ləğv edilə bilmədi', 'error');
                    }
                }
            });
        });

        // ✅ TAM SİL (HARD DELETE)
        document.querySelectorAll('.hard-delete-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const token = btn.dataset.token;

                if (typeof Swal !== 'undefined') {
                    const result = await Swal.fire({
                        title: 'Linki tam sil?',
                        text: 'Bu link verilənlər bazasından tamamilə silinəcək. Bu əməliyyat geri alına bilməz!',
                        icon: 'error',
                        showCancelButton: true,
                        confirmButtonColor: '#ef4444',
                        cancelButtonColor: '#6b7280',
                        confirmButtonText: 'Bəli, tam sil',
                        cancelButtonText: 'Ləğv et'
                    });

                    if (!result.isConfirmed) return;
                } else {
                    if (!confirm('Bu linki tamamilə silmək istədiyinizə əminsiniz? (Geri alına bilməz)')) return;
                }

                try {
                    await this.hardDeleteInvitation(token);
                    if (this.ui) {
                        this.ui.showNotification('Link tamamilə silindi!', 'success');
                    }
                    await this.loadInvitations();
                } catch (error) {
                    if (this.ui) {
                        this.ui.showNotification(error.message || 'Link silinə bilmədi', 'error');
                    }
                }
            });
        });
    }

    /**
     * Linki tamamilə sil (HARD DELETE)
     */
    async hardDeleteInvitation(token) {
        try {
            const response = await this.api.delete(`/invitations/hard-delete/${token}`);
            return response;
        } catch (error) {
            console.error('❌ Link tam silinərkən xəta:', error);
            throw error;
        }
    }

    /**
     * Link yaratma modalı - PƏNCƏRƏ AÇILMIR, SADƏCƏ YARADIR VƏ KOPYALAYIR
     */
    showCreateInvitationModal() {
        if (typeof Swal === 'undefined') {
            alert('SweetAlert2 yüklənməyib');
            return;
        }

        Swal.fire({
            title: 'Yeni Dəvət Linki Yarat',
            html: `
                <div class="text-left">
                    <div class="mb-3">
                        <label class="text-sm font-medium text-gray-700">Email (opsional)</label>
                        <input type="email" id="invitationEmail" class="w-full mt-1 px-4 py-2 border border-gray-300 rounded-xl focus:border-brand-blue focus:outline-none" placeholder="email@example.com">
                    </div>
                    <div class="mb-3">
                        <label class="text-sm font-medium text-gray-700">Etibarlılıq müddəti (saat)</label>
                        <select id="invitationExpiresHours" class="w-full mt-1 px-4 py-2 border border-gray-300 rounded-xl focus:border-brand-blue focus:outline-none">
                            <option value="24">24 saat</option>
                            <option value="48" selected>48 saat</option>
                            <option value="72">72 saat (3 gün)</option>
                            <option value="168">168 saat (7 gün)</option>
                            <option value="336">336 saat (14 gün)</option>
                            <option value="720">720 saat (30 gün)</option>
                        </select>
                    </div>
                    <div class="mt-4 text-sm text-gray-500 flex items-center gap-2">
                        <i class="fa-solid fa-info-circle text-brand-blue"></i>
                        <span>Link yaradıldıqdan sonra avtomatik kopyalanacaq</span>
                    </div>
                </div>
            `,
            confirmButtonText: 'Link Yarat',
            confirmButtonColor: '#7DB6FF',
            showCancelButton: true,
            cancelButtonText: 'Ləğv et',
            cancelButtonColor: '#6b7280',
            preConfirm: () => {
                const email = document.getElementById('invitationEmail').value;
                const expiresHours = parseInt(document.getElementById('invitationExpiresHours').value);
                return { email: email || null, expires_in_hours: expiresHours };
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                const data = result.value;
                try {
                    let companyCode = null;
                    const savedData = localStorage.getItem('userData');
                    if (savedData) {
                        try {
                            const parsed = JSON.parse(savedData);
                            companyCode = parsed.user?.company_code || parsed.user?.companyCode || parsed.company_code || parsed.companyCode;
                        } catch (e) {}
                    }

                    if (!companyCode) {
                        throw new Error('Şirkət kodu tapılmadı');
                    }

                    console.log('🏢 Şirkət kodu:', companyCode);
                    console.log('📧 Email:', data.email);
                    console.log('⏰ Müddət:', data.expires_in_hours);

                    // Loading state
                    Swal.fire({
                        title: 'Link yaradılır...',
                        text: 'Zəhmət olmasa gözləyin',
                        allowOutsideClick: false,
                        didOpen: () => {
                            Swal.showLoading();
                        }
                    });

                    // API-ya sorğu göndər
                    const response = await this.createInvitation({
                        company_code: companyCode,
                        email: data.email,
                        expires_in_hours: data.expires_in_hours
                    });

                    console.log('✅ API cavabı:', response);

                    // Linki yarat
                    let linkUrl = null;
                    if (response && response.full_link) {
                        linkUrl = response.full_link;
                    } else if (response && response.token) {
                        linkUrl = `https://guvenfinans.az/register-owner.html?token=${response.token}`;
                    } else {
                        throw new Error('Link yaradılmadı!');
                    }

                    console.log('🔗 Yaradılan LINK:', linkUrl);

                    // ✅ SADƏCƏ KOPYALA - PƏNCƏRƏ AÇMA
                    if (navigator.clipboard) {
                        await navigator.clipboard.writeText(linkUrl);
                        console.log('✅ Link kopyalandı!');
                    } else {
                        // Clipboard dəstəklənmirsə, prompt ilə göstər
                        prompt('Linki kopyalayın (Ctrl+C):', linkUrl);
                    }

                    // Uğurlu mesajı göstər - PƏNCƏRƏ AÇMADAN
                    await this.showInvitationSuccessModal(response, linkUrl);

                    // Linkləri yenilə
                    await this.loadInvitations();

                } catch (error) {
                    console.error('❌ Link yaradılarkən xəta:', error);
                    Swal.fire({
                        icon: 'error',
                        title: 'Xəta!',
                        text: error.message || 'Link yaradıla bilmədi'
                    });
                }
            }
        });
    }

    /**
     * Linki tamamilə sil (zibil qabından)
     */
    async deleteInvitationPermanently(token) {
        try {
            const response = await this.api.delete(`/invitations/permanent/${token}`);
            return response;
        } catch (error) {
            console.error('❌ Link tam silinərkən xəta:', error);
            throw error;
        }
    }

    /**
     * Uğurlu yaradılma modalı - PƏNCƏRƏ AÇMIR
     */
    async showInvitationSuccessModal(data, linkUrl) {
        if (typeof Swal === 'undefined') return;

        const token = data?.token || '';
        const email = data?.email || 'Göstərilməyib';
        const expiresAt = data?.expires_at ? new Date(data.expires_at).toLocaleString('az-AZ') : '-';

        await Swal.fire({
            title: '✅ Dəvət Linki Yaradıldı!',
            html: `
                <div class="text-left">
                    <div class="bg-blue-50 p-4 rounded-xl mb-4">
                        <p class="text-sm text-gray-600 mb-2">Link avtomatik kopyalandı! İstifadəçiyə göndərin:</p>
                        <div class="flex items-center gap-2">
                            <input type="text" id="invitationLinkInput" value="${linkUrl}" 
                                   class="flex-1 px-4 py-2 border border-gray-300 rounded-xl bg-white text-sm focus:border-brand-blue focus:outline-none" 
                                   readonly>
                            <button id="copyInvitationLinkBtn" class="px-4 py-2 bg-brand-blue text-white rounded-xl hover:bg-blue-600 transition">
                                <i class="fa-regular fa-copy"></i>
                            </button>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-2 text-sm">
                        <div><span class="text-gray-500">Token:</span> <strong class="font-mono text-xs">${token.substring(0, 16)}...</strong></div>
                        <div><span class="text-gray-500">Email:</span> <strong>${email}</strong></div>
                        <div class="col-span-2"><span class="text-gray-500">Bitmə vaxtı:</span> <strong>${expiresAt}</strong></div>
                    </div>
                    <div class="mt-4 text-sm text-gray-500 flex items-center gap-2 bg-green-50 p-3 rounded-xl">
                        <i class="fa-solid fa-check-circle text-green-500"></i>
                        <span>Link kopyalandı! İstədiyiniz şəxsə göndərə bilərsiniz.</span>
                    </div>
                </div>
            `,
            icon: 'success',
            confirmButtonText: 'Bagla',
            confirmButtonColor: '#7DB6FF',
            didOpen: () => {
                const copyBtn = document.getElementById('copyInvitationLinkBtn');
                if (copyBtn) {
                    copyBtn.addEventListener('click', () => {
                        const input = document.getElementById('invitationLinkInput');
                        if (input) {
                            navigator.clipboard.writeText(input.value).then(() => {
                                if (this.ui) {
                                    this.ui.showNotification('Link kopyalandı!', 'success');
                                }
                            });
                        }
                    });
                }
            }
        });
    }



    /**
     * Boş vəziyyət
     */
    showEmptyState() {
        const tbody = document.getElementById('invitationsTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-12 text-gray-400">
                        <i class="fa-solid fa-paper-plane text-4xl mb-3"></i>
                        <p>Hələ heç bir dəvət linki yaradılmayıb</p>
                        <p class="text-sm mt-1">"Yeni Link Yarat" düyməsi ilə ilk linkinizi yaradın</p>
                    </td>
                </tr>
            `;
        }
        this.updatePagination(0);
    }

    /**
     * Xəta vəziyyəti
     */
    showErrorState(message) {
        const tbody = document.getElementById('invitationsTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-12 text-red-400">
                        <i class="fa-solid fa-circle-exclamation text-4xl mb-3"></i>
                        <p>Xəta: ${message || 'Məlumat yüklənə bilmədi'}</p>
                        <button class="mt-2 text-brand-blue hover:underline" onclick="window.invitationService?.loadInvitations()">
                            <i class="fa-solid fa-rotate"></i> Yenidən cəhd et
                        </button>
                    </td>
                </tr>
            `;
        }
        this.updatePagination(0);
    }

    /**
     * Pagination yenilə
     */
    updatePagination(total) {
        const totalPages = Math.ceil(total / this.pageSize);
        const showingText = document.getElementById('invitationShowingText');
        const prevBtn = document.getElementById('invitationPrevPageBtn');
        const nextBtn = document.getElementById('invitationNextPageBtn');

        if (showingText) {
            const start = (this.currentPage - 1) * this.pageSize + 1;
            const end = Math.min(start + this.pageSize - 1, total);
            showingText.textContent = total > 0 ? `${start}-${end} of ${total}` : '0 of 0';
        }

        if (prevBtn) {
            prevBtn.disabled = this.currentPage <= 1 || total === 0;
        }

        if (nextBtn) {
            nextBtn.disabled = this.currentPage >= totalPages || total === 0;
        }
    }
}

// Global
window.InvitationService = InvitationService;
console.log('✅ InvitationService yükləndi');