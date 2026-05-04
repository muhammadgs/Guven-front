/**
 * FolderPermissionModal - Qovluq icazələri modalı
 * Öz şirkətinin işçilərinə icazə vermə
 */
class FolderPermissionModal {
    constructor(companyFolderService) {
        this.service = companyFolderService;
        this.folder = null;
        this.targetCompanyCode = null;  // Baxılan şirkət (SOC26001)
        this.ownCompanyCode = null;      // Öz şirkəti (AZE26003)
        this.employees = [];
        this.permissions = [];
        this.onSave = null;
        this.loading = false;
    }

    /**
     * Modalı aç
     * @param {Object} folder - Qovluq obyekti
     * @param {string} targetCompanyCode - Baxılan şirkət kodu (SOC26001)
     * @param {Function} onSave - Yadda saxlananda çağırılacaq funksiya
     */
    async open(folder, targetCompanyCode, onSave = null) {
        this.folder = folder;
        this.targetCompanyCode = targetCompanyCode;
        this.ownCompanyCode = this.service.getUserCompanyCode();  // Öz şirkəti
        this.onSave = onSave;

        console.log('📂 İcazə modalı açılır:', {
            folder: folder.name,
            targetCompany: targetCompanyCode,  // SOC26001 (baxılan)
            ownCompany: this.ownCompanyCode    // AZE26003 (icazə verən)
        });

        // Loading göstər
        this.showLoading();

        try {
            // Məlumatları yüklə
            await this.loadData();

            // Modalı render et
            this.render();
        } catch (error) {
            console.error('❌ Modal açılarkən xəta:', error);
            this.showError(error.message);
        }
    }

    /**
     * Məlumatları yüklə
     */
    async loadData() {
        this.loading = true;

        try {
            // 1. ÖZ ŞİRKƏTİNİN işçilərini götür (AZE26003)
            console.log('📥 Öz şirkətinin işçiləri yüklənir...');
            const employeesResult = await this.service.getCompanyEmployees(this.targetCompanyCode);
            // QEYD: getCompanyEmployees artıq öz şirkətini qaytarır!

            if (employeesResult.success) {
                this.employees = employeesResult.data || [];
                console.log(`✅ ${this.employees.length} işçi tapıldı (öz şirkəti: ${this.ownCompanyCode})`);
            } else {
                console.warn('⚠️ İşçilər yüklənmədi');
                this.employees = [];
            }

            // 2. Qovluq icazələrini götür
            console.log('📥 İcazələr yüklənir...');
            const permissionsResult = await this.service.getFolderPermissions(this.folder.id);

            if (permissionsResult.success) {
                this.permissions = permissionsResult.data || [];
                console.log(`✅ ${this.permissions.length} icazə tapıldı`);
            } else {
                console.warn('⚠️ İcazələr yüklənmədi');
                this.permissions = [];
            }

            // 3. İşçilərə mövcud icazələri əlavə et
            this.employees = this.employees.map(emp => {
                const perm = this.permissions.find(p => p.user_id === emp.id || p.user_id === emp.user_id);
                return {
                    ...emp,
                    can_view: perm ? perm.can_view : false,
                    can_upload: perm ? perm.can_upload : false,
                    can_create_folder: perm ? perm.can_create_folder : false,
                    can_delete: perm ? perm.can_delete : false
                };
            });

        } catch (error) {
            console.error('❌ loadData xətası:', error);
            this.employees = this.getMockEmployees();
        } finally {
            this.loading = false;
        }
    }

    /**
     * Mock işçi data
     */
    getMockEmployees() {
        return [
            {
                id: 1,
                user_id: 1,
                ceo_name: 'Nigar Zərbəliyeva',
                ceo_email: 'zarbaliyevanigar17@gmail.com',
                is_admin: true,
                position: 'Admin',
                company_code: this.ownCompanyCode,
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
                company_code: this.ownCompanyCode,
                can_view: false,
                can_upload: false,
                can_create_folder: false,
                can_delete: false
            }
        ];
    }

    /**
     * Loading göstər
     */
    showLoading() {
        const modalHtml = `
            <div id="folderPermissionModal" class="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
                <div class="bg-white rounded-xl max-w-md w-full p-8 text-center">
                    <i class="fa-solid fa-spinner fa-spin text-4xl text-purple-500 mb-4"></i>
                    <p class="text-gray-600">Məlumatlar yüklənir...</p>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    /**
     * Xəta göstər
     */
    showError(message) {
        const modal = document.getElementById('folderPermissionModal');
        if (modal) modal.remove();

        const errorHtml = `
            <div id="folderPermissionModal" class="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
                <div class="bg-white rounded-xl max-w-md w-full p-6">
                    <div class="text-center">
                        <div class="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
                            <i class="fa-solid fa-exclamation-triangle text-2xl text-red-500"></i>
                        </div>
                        <h3 class="text-lg font-bold text-gray-800 mb-2">Xəta baş verdi</h3>
                        <p class="text-sm text-gray-600 mb-4">${message || 'Məlumatlar yüklənə bilmədi'}</p>
                        <button onclick="window.folderPermissionModal?.close()" 
                                class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                            Bağla
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', errorHtml);
        window.folderPermissionModal = this;
    }

    /**
     * Modalı render et
     */
    render() {
        // Köhnə modalı sil
        const oldModal = document.getElementById('folderPermissionModal');
        if (oldModal) oldModal.remove();

        // Modal HTML
        const modalHtml = `
            <div id="folderPermissionModal" class="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4" style="backdrop-filter: blur(2px);">
                <div class="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl">
                    <!-- Header -->
                    <div class="p-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-t-xl">
                        <div class="flex items-center justify-between">
                            <div>
                                <h3 class="text-lg font-bold flex items-center gap-2">
                                    <i class="fa-solid fa-folder-open"></i>
                                    Qovluq icazələri: "${this.escapeHtml(this.folder.name)}"
                                </h3>
                                <div class="flex items-center gap-3 mt-1 text-xs text-white/80">
                                    <span>
                                        <i class="fa-solid fa-building mr-1"></i>
                                        Hədəf şirkət: ${this.targetCompanyCode}
                                    </span>
                                    <span>•</span>
                                    <span>
                                        <i class="fa-solid fa-users mr-1"></i>
                                        Öz işçiləri: ${this.ownCompanyCode}
                                    </span>
                                </div>
                            </div>
                            <button onclick="window.folderPermissionModal.close()" class="w-8 h-8 bg-white/20 rounded-lg hover:bg-white/30 flex items-center justify-center">
                                <i class="fa-solid fa-times text-sm"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Info Message -->
                    <div class="mx-3 mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
                        <i class="fa-solid fa-info-circle mr-1"></i>
                        <strong>${this.ownCompanyCode}</strong> şirkətinin işçilərinə <strong>${this.targetCompanyCode}</strong> qovluğuna icazə verirsiniz.
                    </div>

                    <!-- Search -->
                    <div class="p-3 border-b border-gray-200">
                        <div class="relative">
                            <i class="fa-solid fa-search absolute left-3 top-2.5 text-gray-400 text-sm"></i>
                            <input type="text" id="permSearchInput" placeholder="İşçi axtar (ad, email)..." 
                                   class="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                        </div>
                    </div>

                    <!-- Employees List -->
                    <div class="flex-1 overflow-y-auto p-3" id="permEmployeesList" style="max-height: 400px;">
                        ${this.renderEmployeesList()}
                    </div>

                    <!-- Footer -->
                    <div class="p-3 border-t border-gray-200 bg-gray-50 rounded-b-xl flex items-center justify-between">
                        <div class="text-xs text-gray-500">
                            <i class="fa-solid fa-info-circle mr-1"></i>
                            <span id="selectedCount">0</span> işçi seçilib
                        </div>
                        <div class="flex gap-2">
                            <button onclick="window.folderPermissionModal.close()" 
                                    class="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                                <i class="fa-solid fa-times"></i> Bağla
                            </button>
                            <button onclick="window.folderPermissionModal.savePermissions()" 
                                    class="px-4 py-2 text-sm bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700">
                                <i class="fa-solid fa-save"></i> Yadda saxla
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Event listener-ları əlavə et
        this.attachEventListeners();

        // Global reference
        window.folderPermissionModal = this;
    }

    /**
     * İşçilər siyahısını render et
     */
    renderEmployeesList(filteredEmployees = null) {
        const employees = filteredEmployees || this.employees;

        if (!employees || employees.length === 0) {
            return `
                <div class="text-center py-12">
                    <div class="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <i class="fa-solid fa-users-slash text-3xl text-gray-400"></i>
                    </div>
                    <p class="text-base text-gray-500 mb-2">İşçi tapılmadı</p>
                    <p class="text-sm text-gray-400">${this.ownCompanyCode} şirkətində işçi yoxdur</p>
                </div>
            `;
        }

        return employees.map(emp => `
            <div class="employee-permission-item p-4 border border-gray-200 rounded-lg mb-3 hover:border-purple-300 transition-colors ${emp.is_admin ? 'bg-purple-50/30' : ''}" data-user-id="${emp.id || emp.user_id}">
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/10 to-purple-100/30 flex items-center justify-center">
                            <i class="fa-solid fa-user-circle text-xl ${emp.is_admin ? 'text-purple-600' : 'text-gray-500'}"></i>
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <span class="text-sm font-medium text-gray-800">${this.escapeHtml(emp.ceo_name || emp.name || 'Adsız')}</span>
                                ${emp.is_admin ? '<span class="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-[10px] font-medium">Admin</span>' : ''}
                                <span class="text-[8px] bg-gray-100 px-1.5 py-0.5 rounded-full text-gray-600">${emp.company_code || this.ownCompanyCode}</span>
                            </div>
                            <p class="text-xs text-gray-500">${emp.ceo_email || emp.email || 'Email yoxdur'}</p>
                            <p class="text-[10px] text-gray-400 mt-0.5">${emp.position || 'İşçi'}</p>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <label class="flex items-center gap-2 text-xs cursor-pointer p-2 rounded hover:bg-gray-50">
                        <input type="checkbox" class="perm-checkbox w-4 h-4 text-purple-500 rounded" 
                               data-perm="view" data-user="${emp.id || emp.user_id}" 
                               ${emp.can_view ? 'checked' : ''} ${emp.is_admin ? 'disabled' : ''}>
                        <span class="flex items-center gap-1">
                            <i class="fa-solid fa-eye text-gray-500"></i> Görə bilər
                        </span>
                    </label>
                    <label class="flex items-center gap-2 text-xs cursor-pointer p-2 rounded hover:bg-gray-50">
                        <input type="checkbox" class="perm-checkbox w-4 h-4 text-purple-500 rounded" 
                               data-perm="upload" data-user="${emp.id || emp.user_id}" 
                               ${emp.can_upload ? 'checked' : ''} ${emp.is_admin ? 'disabled' : ''}>
                        <span class="flex items-center gap-1">
                            <i class="fa-solid fa-upload text-gray-500"></i> Yükləyə bilər
                        </span>
                    </label>
                    <label class="flex items-center gap-2 text-xs cursor-pointer p-2 rounded hover:bg-gray-50">
                        <input type="checkbox" class="perm-checkbox w-4 h-4 text-purple-500 rounded" 
                               data-perm="create" data-user="${emp.id || emp.user_id}" 
                               ${emp.can_create_folder ? 'checked' : ''} ${emp.is_admin ? 'disabled' : ''}>
                        <span class="flex items-center gap-1">
                            <i class="fa-solid fa-folder-plus text-gray-500"></i> Qovluq yarada bilər
                        </span>
                    </label>
                    <label class="flex items-center gap-2 text-xs cursor-pointer p-2 rounded hover:bg-gray-50">
                        <input type="checkbox" class="perm-checkbox w-4 h-4 text-purple-500 rounded" 
                               data-perm="delete" data-user="${emp.id || emp.user_id}" 
                               ${emp.can_delete ? 'checked' : ''} ${emp.is_admin ? 'disabled' : ''}>
                        <span class="flex items-center gap-1">
                            <i class="fa-solid fa-trash text-gray-500"></i> Silə bilər
                        </span>
                    </label>
                </div>

                ${emp.is_admin ? '<p class="text-[10px] text-purple-500 mt-2">Adminlər bütün icazələrə malikdir</p>' : ''}
            </div>
        `).join('');
    }

    /**
     * Event listener-ları əlavə et
     */
    attachEventListeners() {
        // Axtarış
        const searchInput = document.getElementById('permSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                const filtered = this.employees.filter(emp =>
                    (emp.ceo_name || emp.name || '').toLowerCase().includes(term) ||
                    (emp.ceo_email || emp.email || '').toLowerCase().includes(term)
                );
                document.getElementById('permEmployeesList').innerHTML = this.renderEmployeesList(filtered);
                this.updateSelectedCount();
            });
        }

        // Checkbox dəyişikliklərini izlə
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('perm-checkbox')) {
                this.updateSelectedCount();
            }
        });

        // ESC düyməsi
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.close();
        });

        // Modal xaricinə klik
        document.getElementById('folderPermissionModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'folderPermissionModal') this.close();
        });

        this.updateSelectedCount();
    }

    /**
     * Seçilmiş checkbox sayını yenilə
     */
    updateSelectedCount() {
        const checkboxes = document.querySelectorAll('.perm-checkbox:checked:not([disabled])');
        const countSpan = document.getElementById('selectedCount');
        if (countSpan) {
            countSpan.textContent = checkboxes.length;
        }
    }

    /**
     * İcazələri yadda saxla
     */
    async savePermissions() {
        try {
            const userPerms = {};
            const checkboxes = document.querySelectorAll('.perm-checkbox');

            checkboxes.forEach(cb => {
                if (cb.disabled) return;

                const userId = cb.dataset.user;
                const permType = cb.dataset.perm;

                if (!userId) return;

                if (!userPerms[userId]) {
                    userPerms[userId] = {
                        user_id: parseInt(userId),
                        can_view: false,
                        can_upload: false,
                        can_create_folder: false,
                        can_delete: false
                    };
                }

                switch(permType) {
                    case 'view': userPerms[userId].can_view = cb.checked; break;
                    case 'upload': userPerms[userId].can_upload = cb.checked; break;
                    case 'create': userPerms[userId].can_create_folder = cb.checked; break;
                    case 'delete': userPerms[userId].can_delete = cb.checked; break;
                }
            });

            const permissionsArray = Object.values(userPerms);

            // Loading göstər
            const saveBtn = document.querySelector('[onclick*="savePermissions"]');
            if (saveBtn) {
                saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saxlanılır...';
                saveBtn.disabled = true;
            }

            // API-ə göndər (targetCompanyCode = SOC26001)
            const result = await this.service.setFolderPermissions(
                this.folder.id,
                this.targetCompanyCode,  // Hədəf şirkət (SOC26001)
                permissionsArray
            );

            if (result.success) {
                if (window.filesUI?.showNotification) {
                    window.filesUI.showNotification('İcazələr uğurla yadda saxlandı', 'success');
                }

                if (this.onSave) {
                    this.onSave();
                }

                setTimeout(() => this.close(), 500);
            }

        } catch (error) {
            console.error('❌ İcazələr yadda saxlanarkən xəta:', error);
            if (window.filesUI?.showNotification) {
                window.filesUI.showNotification('Xəta: ' + error.message, 'error');
            }
        } finally {
            const saveBtn = document.querySelector('[onclick*="savePermissions"]');
            if (saveBtn) {
                saveBtn.innerHTML = '<i class="fa-solid fa-save"></i> Yadda saxla';
                saveBtn.disabled = false;
            }
        }
    }

    /**
     * Modalı bağla
     */
    close() {
        const modal = document.getElementById('folderPermissionModal');
        if (modal) {
            modal.remove();
        }
        window.folderPermissionModal = null;
    }

    /**
     * HTML escape
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Global instance
window.FolderPermissionModal = FolderPermissionModal;