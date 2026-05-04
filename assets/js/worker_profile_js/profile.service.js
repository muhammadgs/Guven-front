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
}

window.ProfileService = ProfileService;