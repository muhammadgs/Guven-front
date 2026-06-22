/**
 * Profile Service - YENİLƏNMİŞ VERSİYA (DÜZGÜN İŞLƏYƏN)
 */

class ProfileService {
    constructor(apiService, authService, uiService = null) {
        this.api = apiService;
        this.auth = authService;
        this.ui = uiService;
    }

    setUI(uiService) {
        this.ui = uiService;
        console.log('✅ ProfileService UI referansı təyin edildi');
    }

    async loadProfile() {
        console.log('📋 Profil məlumatları yüklənir...');

        try {
            const userData = await this.api.get('/users/me');
            console.log('📥 /users/me cavabı:', userData);

            if (!userData) {
                throw new Error('Auth məlumatları alına bilmədi');
            }

            // Şirkət adını tap - əgər gəlməyibsə, company_code ilə gətir
            let companyName = userData.company_name || '';

            if (!companyName && userData.company_code) {
                try {
                    console.log(`🏢 Şirkət adı gətirilir: /companies/code/${userData.company_code}`);
                    const companyData = await this.api.get(`/companies/code/${userData.company_code}`);
                    console.log('📥 companyData:', companyData);

                    if (companyData && companyData.company_name) {
                        companyName = companyData.company_name;
                    } else if (companyData && companyData.name) {
                        companyName = companyData.name;
                    }
                    console.log('✅ Şirkət adı tapıldı:', companyName);
                } catch (companyError) {
                    console.warn('⚠️ Şirkət məlumatları gətirilmədi:', companyError);
                    // Backup: şirkət kodunu göstər
                    companyName = userData.company_code;
                }
            }

            // Məlumatları formatla
            const formattedData = {
                firstName: userData.ceo_name || '',
                lastName: userData.ceo_lastname || '',
                fatherName: userData.father_name || '',
                gender: userData.gender || '',
                birthDate: userData.birth_date ? this.formatDate(userData.birth_date) : '',
                voen: userData.voen || '',
                asanImza: userData.asan_imza || userData.asan_imza_number || '',
                asanId: userData.asan_id || '',
                pin1: userData.pin1 || '',
                pin2: userData.pin2 || '',
                puk: userData.puk || '',
                finCode: userData.fin_code || '',
                email: userData.ceo_email || '',
                phone: userData.ceo_phone || '',
                companyCode: userData.company_code || '',
                company_name: companyName,  // ✅ ƏLƏ GƏTİRİLMİŞ AD
                companyName: companyName,   // ✅ HTML üçün
                telegramChatId: userData.telegram_chat_id || '',  // DƏYİŞİKLİK: telegram_username -> telegram_chat_id
                telegramVerified: userData.is_telegram_verified || false,
                id: userData.id,
                companyId: userData.company_id,
                originalData: userData
            };

            console.log('📝 Formatlanmış məlumat:', {
                company_name: formattedData.company_name,
                companyName: formattedData.companyName,
                telegramChatId: formattedData.telegramChatId,
                telegramVerified: formattedData.telegramVerified
            });

            if (this.ui && this.ui.populateForm) {
                this.ui.populateForm(formattedData);
            }

            this.updateLocalStorage({
                ...userData,
                company_name: companyName,
                telegram_chat_id: userData.telegram_chat_id,  // DƏYİŞİKLİK
                is_telegram_verified: userData.is_telegram_verified
            });

            return formattedData;

        } catch (error) {
            console.error('❌ Profil yükləmə xətası:', error);
            return this.loadProfileBackup();
        }
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
                telegramChatId: userData.telegram_chat_id || '',  // DƏYİŞİKLİK
                telegramVerified: userData.is_telegram_verified || false,
                id: userData.id,
                companyId: userData.company_id,
                originalData: userData
            };

            if (this.ui && this.ui.populateForm) {
                this.ui.populateForm(formattedData);
            }

            return formattedData;

        } catch (error) {
            console.error('❌ Backup xətası:', error);
            throw error;
        }
    }

    /**
     * LocalStorage-ı yenilə
     */
    updateLocalStorage(userData) {
        try {
            const savedData = {
                user: {
                    id: userData.id,
                    ceo_name: userData.ceo_name,
                    ceo_lastname: userData.ceo_lastname,
                    company_name: userData.company_name,
                    company_code: userData.company_code,
                    ceo_email: userData.ceo_email,
                    ceo_phone: userData.ceo_phone,
                    voen: userData.voen,
                    telegram_chat_id: userData.telegram_chat_id,  // DƏYİŞİKLİK
                    is_telegram_verified: userData.is_telegram_verified
                }
            };
            localStorage.setItem('userData', JSON.stringify(savedData));
            console.log('💾 LocalStorage yeniləndi');
        } catch (e) {
            console.warn('⚠️ LocalStorage xətası:', e);
        }
    }

    /**
     * Profil məlumatlarını yenilə
     */
    async updateProfile(profileData) {
        console.log('💾 Profil yenilənir...');
        console.log('📤 Update data:', profileData);

        const updateData = {
            ceo_name: profileData.firstName || '',
            ceo_lastname: profileData.lastName || '',
            father_name: profileData.fatherName || '',
            gender: profileData.gender || null,
            birth_date: profileData.birthDate ? this.parseDate(profileData.birthDate) : null,
            voen: profileData.voen || '',
            asan_imza_number: profileData.asanImza || '',
            asan_id: profileData.asanId || '',
            pin1: profileData.pin1 || '',
            pin2: profileData.pin2 || '',
            puk: profileData.puk || '',
            fin_code: profileData.finCode || '',
            ceo_email: profileData.email || '',
            ceo_phone: profileData.phone || '',
            telegram_chat_id: profileData.telegramChatId || '',  // DƏYİŞİKLİK: telegram_username -> telegram_chat_id
            company_name: profileData.company_name || ''
        };

        if (profileData.password && profileData.password.trim() !== '') {
            updateData.ceo_password = profileData.password;
        }

        const userId = this.auth.getUserId();
        if (!userId) {
            throw new Error('User ID tapılmadı');
        }

        try {
            const response = await this.api.patch(`/users/${userId}`, updateData);
            console.log('✅ API Cavabı:', response);

            // Uğurlu olarsa, profili yenidən yüklə
            if (response) {
                await this.loadProfile();
            }

            return response;

        } catch (error) {
            console.error('❌ Profil yeniləmə xətası:', error);
            throw error;
        }
    }

    // Tarix formatları
    formatDate(dateString) {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return date.toISOString().split('T')[0];
        } catch (e) {
            return '';
        }
    }

    parseDate(dateString) {
        if (!dateString) return null;
        try {
            return new Date(dateString).toISOString();
        } catch (e) {
            return null;
        }
    }

    /**
     * Profili yadda saxla - UI-dan birbaşa çağırıla bilər
     */
    async saveProfile() {
        console.log('💾 Profil yadda saxlanılır (ProfileService.saveProfile)...');

        // Loading state üçün button-u tap
        const saveBtn = document.getElementById('saveProfileBtn');
        if (!saveBtn) {
            console.error('❌ saveProfileBtn tapılmadı');
            return;
        }

        // Loading state
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Yadda saxlanılır...';
        saveBtn.disabled = true;

        try {
            // Form məlumatlarını topla
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
                puk: document.getElementById('puk')?.value || '',
                finCode: document.getElementById('finCode')?.value || '',
                email: document.getElementById('email')?.value || '',
                phone: document.getElementById('phone')?.value || '',
                company_name: document.getElementById('companyName')?.value || '',
                companyCode: document.getElementById('companyCode')?.value || '',
                telegramChatId: document.getElementById('telegramChatId')?.value || '',  // DƏYİŞİKLİK: input ID dəyişdi
                password: document.getElementById('password')?.value || ''
            };

            console.log('📤 Form məlumatları:', formData);

            // Validasiya
            const validation = this.validateProfileData(formData);
            if (!validation.isValid) {
                if (this.ui) {
                    this.ui.showNotification(validation.errors[0], 'error');
                } else {
                    alert(validation.errors[0]);
                }
                return;
            }

            // Profili yenilə - öz updateProfile metodunu çağır
            const response = await this.updateProfile(formData);
            console.log('✅ updateProfile cavabı:', response);

            // Uğurlu mesaj
            if (this.ui) {
                this.ui.showNotification('Profil uğurla yeniləndi!', 'success');
            } else {
                alert('Profil uğurla yeniləndi!');
            }

            // Şifrə inputunu təmizlə
            const passwordInput = document.getElementById('password');
            if (passwordInput) passwordInput.value = '';

            // Header-i yenilə (əgər şirkət adı dəyişibsə)
            if (formData.company_name) {
                const companyEl = document.getElementById('companyNameDisplay');
                if (companyEl) companyEl.textContent = formData.company_name;
            }

            // İstifadəçi adını yenilə
            if (formData.firstName || formData.lastName) {
                const userEl = document.getElementById('userNameDisplay');
                if (userEl) {
                    userEl.textContent = `${formData.firstName} ${formData.lastName}`.trim();
                }
            }

            // Telegram verified status-u yenilə (əgər Telegram ID daxil edilibsə)
            if (formData.telegramChatId) {
                const telegramStatusEl = document.getElementById('telegramVerifiedStatus');
                if (telegramStatusEl) {
                    telegramStatusEl.textContent = 'Təsdiqlənib';
                    telegramStatusEl.className = 'text-green-600 font-medium';
                }

                const telegramVerifiedBadge = document.getElementById('telegramVerifiedBadge');
                if (telegramVerifiedBadge) {
                    telegramVerifiedBadge.innerHTML = '<span class="badge-success"><i class="fa-solid fa-check-circle"></i> Təsdiqlənib</span>';
                }
            }

            return response;

        } catch (error) {
            console.error('❌ Profil yadda saxlanılarkən xəta:', error);

            let errorMessage = 'Xəta baş verdi';
            if (error.message) errorMessage = error.message;

            if (this.ui) {
                this.ui.showNotification(errorMessage, 'error');
            } else {
                alert('Xəta: ' + errorMessage);
            }

        } finally {
            // Button-u əvvəlki vəziyyətinə qaytar
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        }
    }

    // Validasiya
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

        // Telegram Chat ID validasiyası (əgər daxil edilibsə)
        if (data.telegramChatId && !this.isValidTelegramChatId(data.telegramChatId)) {
            errors.push('Düzgün Telegram ID daxil edin (rəqəm olmalıdır)');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    isValidPhone(phone) {
        const phoneRegex = /^\+994\d{9}$/;
        return phoneRegex.test(phone);
    }

    // YENİ: Telegram Chat ID validasiyası
    isValidTelegramChatId(chatId) {
        // Telegram chat ID rəqəm olmalıdır (bəzən mənfi dəyər də ola bilər)
        return /^-?\d+$/.test(chatId.trim());
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
}

window.ProfileService = ProfileService;