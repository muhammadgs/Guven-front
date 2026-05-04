(() => {
    'use strict';


    // LOADER PROBLEMİNİ DƏRHAL HƏLL ET

    (function fixLoaderIssue() {
        // Loader elementini tap və dərhal gizlət
        const loader = document.getElementById('gti-loader');
        if (loader) {
            loader.style.display = 'none';
            loader.style.opacity = '0';
            loader.style.visibility = 'hidden';
            loader.style.pointerEvents = 'none';
            loader.classList.add('fade-out');

            // 1 saniyə sonra DOM-dan sil
            setTimeout(() => {
                try {
                    if (loader.parentNode) {
                        loader.parentNode.removeChild(loader);
                    }
                } catch (e) {

                }
            }, 1000);
        }

        // Body class və style düzəlt
        const body = document.body;
        if (body) {
            body.classList.remove('loader-active');
            body.classList.add('loaded');
            body.style.opacity = '1';
            body.style.visibility = 'visible';
            body.style.overflow = 'auto';
        }

        // Site shell-i aktiv et
        const siteShell = document.getElementById('site-shell');
        if (siteShell) {
            siteShell.style.opacity = '1';
            siteShell.style.pointerEvents = 'auto';
            siteShell.style.visibility = 'visible';
            siteShell.style.minHeight = '100vh';
        }

        // Storage-dan köhnə loader məlumatlarını sil
        try {
            sessionStorage.removeItem('gtiLoaderShown');
            localStorage.removeItem('gtiLoaderShown');
        } catch (e) {
            console.warn('Storage təmizlənmədi:', e);
        }

        console.log('✅ Loader problemi həll edildi');
    })();


    //  KONFİQURASİYA

    const CONFIG = {
        API_BASE: "/proxy.php",
        DEBOUNCE_DELAY: 800,
        PASSWORD_STRENGTH_LEVELS: {
            weak: {color: '#ef4444', minScore: 0},
            medium: {color: '#f59e0b', minScore: 2},
            strong: {color: '#10b981', minScore: 3}
        }
    };


    // DOM ELEMENTLƏRİNİN CACHE-LƏNMƏSİ

    const DOM = {
        form: document.querySelector("[data-owner-registration]"),
        statusEl: document.querySelector("[data-api-status]"),
        companyCodeInput: document.querySelector("#company_code"),
        companyNameDisplay: document.querySelector("#companyNameDisplay"),
        verifiedCompanyNameSpan: document.querySelector("#verifiedCompanyName"),
        verifyCompanyBtn: document.querySelector("#verify-company-code"),
        validateVoenBtn: document.querySelector("#validate-voen"),
        previewModal: document.querySelector("#preview-modal"),
        previewContent: document.querySelector("#preview-content"),
        btnPreview: document.querySelector("#btn-preview"),
        progressBar: document.querySelector("#progress-bar")
    };


    // STATE MANAGEMENT

    const state = {
        isCompanyVerified: false,
        parentCompanyCode: null,
        verifiedCompanyData: null,
        voenValidated: false,
        formValid: false,
        currentStep: 1,
        formData: {},
        debounceTimer: null
    };


    // UTILITY FUNCTIONS

    const utils = {
        cleanCompanyCode: (str) => String(str || "").replace(/['"]+/g, '').trim().toUpperCase(),

        sanitizeAlphaNumeric: (str) => String(str || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase(),

        onlyDigits: (str) => String(str || "").replace(/\D/g, ""),

        formatPhone: (prefix, number) => {
            const p = utils.onlyDigits(prefix);
            const n = utils.onlyDigits(number);
            return `+994${p}${n}`;
        },

        validateEmail: (email) => {
            const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return re.test(email);
        },

        validatePassword: (password) => {
            if (!password) return {valid: false, score: 0, strength: 'weak'};

            let score = 0;
            if (password.length >= 8) score++;
            if (/[A-Z]/.test(password)) score++;
            if (/[a-z]/.test(password)) score++;
            if (/\d/.test(password)) score++;
            if (/[^A-Za-z0-9]/.test(password)) score++;

            const valid = password.length >= 8;
            let strength = 'weak';
            if (score >= 4) strength = 'strong';
            else if (score >= 2) strength = 'medium';

            return {valid, score, strength};
        },

        debounce: (func, wait) => {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },

        generateId: () => 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    };


    // API SERVICE

    const api = {
        async request(url, options = {}) {
            console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);

            try {
                const response = await fetch(url, {
                    headers: {
                        "Content-Type": "application/json",
                        "X-Request-ID": utils.generateId()
                    },
                    credentials: "include",
                    ...options,
                });

                let data = null;
                const contentType = response.headers.get("content-type") || "";

                if (contentType.includes("application/json")) {
                    data = await response.json();
                } else {
                    data = await response.text();
                }

                console.log(`📨 API Response: ${response.status}`, data);

                if (!response.ok) {
                    let errorMsg = `Xəta baş verdi (${response.status})`;

                    if (data) {
                        // ⚠️ DÜZƏLİŞ: FastAPI error formatı
                        if (data.detail) {
                            if (Array.isArray(data.detail)) {
                                errorMsg = data.detail.map(err =>
                                    `${err.loc?.join('.') || 'unknown'}: ${err.msg}`
                                ).join(', ');
                            } else {
                                errorMsg = data.detail;
                            }
                        } else if (data.message) {
                            errorMsg = data.message;
                        } else if (typeof data === 'string') {
                            errorMsg = data;
                        }
                    }

                    const err = new Error(errorMsg);
                    err.status = response.status;
                    err.data = data;
                    throw err;
                }
                return data;
            } catch (error) {
                console.error('❌ API Error:', error);
                throw error;
            }
        },


        // API SERVICE bölməsində - registerCompany funksiyasını bu şəkildə düzəldin:
        async registerCompany(data) {
            let url = `${CONFIG.API_BASE}/api/v1/companies/create_company_subsidiaries`;

            console.log('🔍 DEBUG - registerCompany called:', {
                originalData: data,
                parent_company_code: data.parent_company_code,
                hasParentCode: !!data.parent_company_code
            });

            // Query parameter əlavə et
            if (data.parent_company_code && data.parent_company_code.trim() !== '') {
                const encodedCode = encodeURIComponent(data.parent_company_code.trim());
                url += `?company_code=${encodedCode}`;
                console.log(`✅ Şirkət kodu əlavə edildi: ${data.parent_company_code}`);
                console.log(`✅ Final URL: ${url}`);
            } else {
                console.log('ℹ️ Şirkət kodu yoxdur - müstəqil şirkət');
            }

            console.log('📤 Sending request to:', url);

            // ⚠️ DİQQƏT: parent_company_code artıq body-də qala bilər, həm də query param kimi göndərilir
            console.log('📦 Request body:', {
                ...data,
                ceo_password: '••••••••'
            });

            return await this.request(url, {
                method: 'POST',
                body: JSON.stringify(data)
            });
        },

        // ✅ YENİ: Şirkət kodunu yoxla
        async checkCompanyCode(code) {
            const cleanCode = utils.cleanCompanyCode(code);
            if (!cleanCode) {
                throw new Error('Şirkət kodu daxil edilməlidir');
            }

            return await this.request(`${CONFIG.API_BASE}/api/v1/companies/code/${encodeURIComponent(cleanCode)}`, {
                method: 'GET'
            });
        },

        // ✅ YENİ: VOEN yoxla
        async checkVoen(voen) {
            const digits = utils.onlyDigits(voen);
            if (digits.length !== 10) {
                throw new Error('VOEN 10 rəqəm olmalıdır');
            }

            return await this.request(`${CONFIG.API_BASE}/api/v1/companies/check/voen/${digits}`, {
                method: 'GET'
            });
        }
    };


    //  UI COMPONENTS

    const ui = {
        setStatus(type, message, duration = 0) {
            if (!DOM.statusEl) return;

            DOM.statusEl.hidden = false;
            DOM.statusEl.className = 'api-status';
            DOM.statusEl.classList.add(type);

            const icon = {
                success: 'fa-check-circle',
                error: 'fa-exclamation-circle',
                warning: 'fa-exclamation-triangle',
                info: 'fa-info-circle'
            }[type] || 'fa-info-circle';

            DOM.statusEl.innerHTML = `
                <div class="status-content">
                    <i class="fas ${icon}"></i>
                    <span>${message}</span>
                </div>
            `;

            // Scroll to status message
            DOM.statusEl.scrollIntoView({behavior: 'smooth', block: 'nearest'});

            // Auto hide after duration
            if (duration > 0) {
                setTimeout(() => this.clearStatus(), duration);
            }
        },

        clearStatus() {
            if (DOM.statusEl) {
                DOM.statusEl.hidden = true;
                DOM.statusEl.className = 'api-status hidden';
                DOM.statusEl.textContent = '';
            }
        },

        showLoading(selector) {
            const element = document.querySelector(selector);
            if (element) {
                const loader = element.querySelector('.submit-loader');
                if (loader) loader.style.display = 'flex';
                element.disabled = true;
            }
        },

        hideLoading(selector) {
            const element = document.querySelector(selector);
            if (element) {
                const loader = element.querySelector('.submit-loader');
                if (loader) loader.style.display = 'none';
                element.disabled = false;
            }
        },

        showCompanyNameDisplay(data, isVerified = true) {
            if (!DOM.companyNameDisplay || !DOM.verifiedCompanyNameSpan) return;

            DOM.companyNameDisplay.style.display = 'block';
            DOM.verifiedCompanyNameSpan.textContent = data.company_name || 'Məlumat yoxdur';

            DOM.companyNameDisplay.className = 'company-name-display';
            if (isVerified) {
                DOM.companyNameDisplay.classList.add('verified');
            } else {
                DOM.companyNameDisplay.classList.add('error');
            }
        },

        hideCompanyNameDisplay() {
            if (DOM.companyNameDisplay) {
                DOM.companyNameDisplay.style.display = 'none';
            }
        },

        updatePasswordStrength(password) {
            const strengthContainer = document.querySelector('#password-strength');
            if (!strengthContainer) return;

            if (!password) {
                strengthContainer.setAttribute('data-strength', 'none');
                const textEl = strengthContainer.querySelector('.strength-text');
                if (textEl) textEl.textContent = '';
                return;
            }

            const validation = utils.validatePassword(password);
            strengthContainer.setAttribute('data-strength', validation.strength);

            const strengthText = {
                weak: 'Zəif',
                medium: 'Orta',
                strong: 'Güclü'
            }[validation.strength] || 'Zəif';

            const textEl = strengthContainer.querySelector('.strength-text');
            if (textEl) textEl.textContent = `Şifrə gücü: ${strengthText}`;
        },

        updateProgressBar(percentage) {
            if (DOM.progressBar) {
                DOM.progressBar.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
            }
        },

        showModal(modal) {
            if (modal) {
                modal.classList.add('show');
                document.body.style.overflow = 'hidden';
            }
        },

        hideModal(modal) {
            if (modal) {
                modal.classList.remove('show');
                document.body.style.overflow = '';
            }
        },

        showFieldError(field, message) {
            // Xüsusi ID-lərə görə error elementlərini tap
            let errorElement = null;

            switch (field.id) {
                case 'phone_number':
                    errorElement = document.getElementById('phone-error');
                    break;
                case 'password':
                    errorElement = document.getElementById('password-error');
                    break;
                case 're_password':
                    errorElement = document.getElementById('re-password-error');
                    break;
                case 'pin1':
                    errorElement = document.getElementById('pin1-error');
                    break;
                case 'pin2':
                    errorElement = document.getElementById('pin2-error');
                    break;
                case 'puk':
                    errorElement = document.getElementById('puk-error');
                    break;
                case 'asan_imza':
                    errorElement = document.getElementById('asan-imza-error');
                    break;
                case 'asan_id':
                    errorElement = document.getElementById('asan-id-error');
                    break;
                case 'finkod':
                    errorElement = document.getElementById('fin-error');
                    break;
                default:
                    // Ümumi error elementi
                    errorElement = field.nextElementSibling;
                    if (!errorElement || !errorElement.classList.contains('field-error')) {
                        errorElement = field.closest('.field')?.querySelector('.field-error');
                    }
            }

            if (errorElement) {
                errorElement.textContent = message;
                errorElement.style.display = 'block';
            }

            field.setAttribute('aria-invalid', 'true');
            field.classList.add('error');
        },
        hideFieldError(field) {
            // Xüsusi ID-lərə görə error elementlərini tap
            let errorElement = null;

            switch (field.id) {
                case 'phone_number':
                    errorElement = document.getElementById('phone-error');
                    break;
                case 'password':
                    errorElement = document.getElementById('password-error');
                    break;
                case 're_password':
                    errorElement = document.getElementById('re-password-error');
                    break;
                case 'pin1':
                    errorElement = document.getElementById('pin1-error');
                    break;
                case 'pin2':
                    errorElement = document.getElementById('pin2-error');
                    break;
                case 'puk':
                    errorElement = document.getElementById('puk-error');
                    break;
                case 'asan_imza':
                    errorElement = document.getElementById('asan-imza-error');
                    break;
                case 'asan_id':
                    errorElement = document.getElementById('asan-id-error');
                    break;
                case 'finkod':
                    errorElement = document.getElementById('fin-error');
                    break;
                default:
                    // Ümumi error elementi
                    errorElement = field.nextElementSibling;
                    if (!errorElement || !errorElement.classList.contains('field-error')) {
                        errorElement = field.closest('.field')?.querySelector('.field-error');
                    }
            }

            if (errorElement) {
                errorElement.style.display = 'none';
            }

            field.removeAttribute('aria-invalid');
            field.classList.remove('error');
        },

        updateStep(currentStep) {
            const steps = document.querySelectorAll('.step');
            steps.forEach(step => {
                const stepNum = parseInt(step.dataset.step);
                step.classList.remove('active', 'completed');

                if (stepNum < currentStep) {
                    step.classList.add('completed');
                } else if (stepNum === currentStep) {
                    step.classList.add('active');
                }
            });

            state.currentStep = currentStep;
        }
    };


    //  FORM VALIDATION

    const validation = {
        validateField(field) {
            const value = field.value.trim();
            let isValid = true;
            let message = '';

            switch (field.id) {
                case 'company_name':
                    if (!value) {
                        message = 'Şirkət adı daxil edilməlidir';
                        isValid = false;
                    } else if (value.length < 3) {
                        message = 'Şirkət adı ən az 3 simvol olmalıdır';
                        isValid = false;
                    }
                    break;

                case 'email':
                    if (!value) {
                        message = 'E-poçt ünvanı daxil edilməlidir';
                        isValid = false;
                    } else if (!utils.validateEmail(value)) {
                        message = 'Düzgün e-poçt ünvanı daxil edin';
                        isValid = false;
                    }
                    break;

                case 'phone_number':
                    const prefix = document.querySelector('#phone_prefix');
                    const prefixValue = prefix ? prefix.value : '';
                    if (!value) {
                        message = 'Telefon nömrəsi daxil edilməlidir';
                        isValid = false;
                    } else if (utils.onlyDigits(value).length !== 7) {
                        message = 'Telefon nömrəsi 7 rəqəm olmalıdır';
                        isValid = false;
                    } else if (!prefixValue) {
                        message = 'Telefon prefixi seçilməlidir';
                        isValid = false;
                    }
                    break;

                case 'password':
                    const passwordValidation = utils.validatePassword(value);
                    if (!passwordValidation.valid) {
                        message = 'Şifrə ən az 8 simvol olmalıdır';
                        isValid = false;
                    }
                    break;

                case 're_password':
                    const password = document.querySelector('#password');
                    if (value !== password.value) {
                        message = 'Şifrələr uyğun deyil';
                        isValid = false;
                    }
                    break;

                // ✅ ASAN İMZA məcburi validasiya
                case 'asan_imza':
                    if (!value) {
                        message = 'Asan İmza № daxil edilməlidir';
                        isValid = false;
                    } else if (utils.onlyDigits(value).length !== 10) {
                        message = 'Asan İmza № 10 rəqəm olmalıdır';
                        isValid = false;
                    }
                    break;

                case 'asan_id':
                    if (!value) {
                        message = 'Asan ID daxil edilməlidir';
                        isValid = false;
                    } else if (utils.onlyDigits(value).length !== 6) {
                        message = 'Asan ID 6 rəqəm olmalıdır';
                        isValid = false;
                    }
                    break;

                case 'pin1':
                    if (!value) {
                        message = 'PIN 1 daxil edilməlidir';
                        isValid = false;
                    } else if (utils.onlyDigits(value).length !== 4) {
                        message = 'PIN 1 4 rəqəm olmalıdır';
                        isValid = false;
                    }
                    break;

                case 'pin2':
                    if (!value) {
                        message = 'PIN 2 daxil edilməlidir';
                        isValid = false;
                    } else if (utils.onlyDigits(value).length !== 5) {
                        message = 'PIN 2 5 rəqəm olmalıdır';
                        isValid = false;
                    }
                    break;

                case 'puk':
                    if (!value) {
                        message = 'PUK daxil edilməlidir';
                        isValid = false;
                    } else if (utils.onlyDigits(value).length !== 8) {
                        message = 'PUK 8 rəqəm olmalıdır';
                        isValid = false;
                    }
                    break;

                case 'voen':
                    if (!value) {
                        message = 'VOEN daxil edilməlidir';
                        isValid = false;
                    } else if (utils.onlyDigits(value).length !== 10) {
                        message = 'VOEN 10 rəqəm olmalıdır';
                        isValid = false;
                    }
                    break;


                // validateField metodunda 'finkod' case:
                case 'finkod':
                    const finType = document.querySelector('#fin_type');
                    const selectedType = finType ? finType.value : 'FIN';
                    const finErrorEl = document.querySelector('#fin-error');
                    const cleanValue = utils.sanitizeAlphaNumeric(value);

                    if (!value) {
                        message = 'Kod daxil edilməlidir';
                        isValid = false;
                        if (finErrorEl) finErrorEl.textContent = message;
                    } else {
                        // Tipə görə uzunluq yoxlaması
                        let expectedLength;
                        let typeName;

                        switch (selectedType) {
                            case 'FIN':
                                expectedLength = 7;
                                typeName = 'FIN';
                                break;
                            case 'MYI':
                                expectedLength = 6;
                                typeName = 'MYI';
                                break;
                            case 'DYI':
                                expectedLength = 5;
                                typeName = 'DYI';
                                break;
                            default:
                                expectedLength = 7;
                                typeName = 'FIN';
                        }

                        // Uzunluq yoxlaması
                        if (cleanValue.length !== expectedLength) {
                            message = `${typeName} kod tam ${expectedLength} simvol olmalıdır`;
                            isValid = false;
                            if (finErrorEl) finErrorEl.textContent = message;
                        }
                        // Hərf/rəqəm yoxlaması
                        else if (!/^[A-Z0-9]+$/.test(cleanValue)) {
                            message = 'Kod yalnız hərf və rəqəmlərdən ibarət ola bilər';
                            isValid = false;
                            if (finErrorEl) finErrorEl.textContent = message;
                        } else {
                            isValid = true;
                        }
                    }
                    break;

                case 'terms':
                    if (!field.checked) {
                        message = 'İstifadəçi razılaşmasını qəbul etməlisiniz';
                        isValid = false;
                    }
                    break;
            }

            if (isValid) {
                ui.hideFieldError(field);
            } else {
                ui.showFieldError(field, message);
            }

            return isValid;
        },

        validateForm() {
            if (!DOM.form) return false;

            // Qeydiyyat növünü yoxla
            const asanRadio = document.getElementById('reg_type_asan');
            const isAsanMode = asanRadio ? asanRadio.checked : true;

            // Bütün required sahələr
            const requiredFields = DOM.form.querySelectorAll('[required]');

            let isValid = true;

            // Required sahələri yoxla
            requiredFields.forEach(field => {
                // Disabled olanları yoxlama (Sadə qeydiyyatda Asan İmza sahələri disabled olur)
                if (field.disabled) return;

                if (!this.validateField(field)) {
                    isValid = false;
                }
            });

            // Şifrə uyğunluğunu yoxla
            const password = document.querySelector('#password');
            const rePassword = document.querySelector('#re_password');

            if (password && rePassword && password.value !== rePassword.value) {
                ui.showFieldError(rePassword, 'Şifrələr uyğun deyil');
                isValid = false;
            }

            // Asan İmza modunda əlavə yoxlama (əgər disable olmayıbsa)
            if (isAsanMode) {
                const asanFields = ['asan_imza', 'asan_id', 'pin1', 'pin2', 'puk'];
                asanFields.forEach(id => {
                    const field = document.getElementById(id);
                    if (field && !field.disabled && !this.validateField(field)) {
                        isValid = false;
                    }
                });
            }

            // Update step based on validation
            if (isValid) {
                ui.updateStep(3);
            } else {
                ui.updateStep(1);
            }

            state.formValid = isValid;
            return isValid;
        },

        async validateCompanyCode(code) {
            if (!code || code.trim() === '') {
                state.isCompanyVerified = false;
                state.parentCompanyCode = null;
                state.verifiedCompanyData = null;
                ui.hideCompanyNameDisplay();
                ui.clearStatus();
                return false;
            }

            try {
                ui.showLoading('#verify-company-code');
                const data = await api.checkCompanyCode(code);

                state.isCompanyVerified = true;
                state.parentCompanyCode = code;
                state.verifiedCompanyData = data;

                ui.showCompanyNameDisplay(data, true);
                ui.setStatus('success', `Şirkət təsdiqləndi: ${data.company_name}`, 3000);

                return true;
            } catch (error) {
                state.isCompanyVerified = false;
                state.parentCompanyCode = null;
                state.verifiedCompanyData = null;

                if (error.status === 404) {
                    ui.showCompanyNameDisplay({company_name: 'Şirkət tapılmadı'}, false);
                    ui.setStatus('error', 'Bu kodla şirkət tapılmadı. Kodu yoxlayın və ya boş buraxın.', 3000);
                } else {
                    ui.setStatus('error', 'Şirkət yoxlanılarkən xəta baş verdi', 3000);
                }

                return false;
            } finally {
                ui.hideLoading('#verify-company-code');
            }
        },

        async validateVoen(voen) {
            const digits = utils.onlyDigits(voen);
            if (digits.length !== 10) {
                ui.setStatus('error', 'VOEN 10 rəqəm olmalıdır', 3000);
                return false;
            }

            try {
                ui.showLoading('#validate-voen');
                const response = await api.checkVoen(digits);

                if (response.exists) {
                    ui.setStatus('error', 'Bu VOEN artıq qeydiyyatdan keçib!', 5000);
                    state.voenValidated = false;
                    return false;
                } else {
                    ui.setStatus('success', 'VOEN mövcud deyil - istifadə edilə bilər', 3000);
                    state.voenValidated = true;
                    return true;
                }
            } catch (error) {
                ui.setStatus('error', 'VOEN yoxlanılarkən xəta baş verdi', 3000);
                state.voenValidated = false;
                return false;
            } finally {
                ui.hideLoading('#validate-voen');
            }
        }
    };


    const formData = {
        collectFormData() {
            const getValue = (id) => {
                const el = document.getElementById(id);
                return el ? el.value.trim() : '';
            };

            // Qeydiyyat növünü yoxla
            const asanRadio = document.getElementById('reg_type_asan');
            const isAsanMode = asanRadio ? asanRadio.checked : true;

            // Client IP alma funksiyası
            const getClientIP = async () => {
                try {
                    const response = await fetch('https://api.ipify.org?format=json');
                    const data = await response.json();
                    return data.ip || '0.0.0.0';
                } catch (error) {
                    console.warn('IP alma xətası, fallback:', error);
                    try {
                        const fallbackResponse = await fetch('https://api64.ipify.org?format=json');
                        const fallbackData = await fallbackResponse.json();
                        return fallbackData.ip || '0.0.0.0';
                    } catch {
                        return '0.0.0.0';
                    }
                }
            };

            // IP-ni asinxron almaq üçün
            let clientIP = '0.0.0.0';

            const fetchIP = async () => {
                clientIP = await getClientIP();
                console.log(`📱 JavaScript-dən alınan IP: ${clientIP}`);
                return clientIP;
            };

            fetchIP().then(ip => {
                console.log(`✅ IP hazır: ${ip}`);
            }).catch(err => {
                console.warn('IP alma alınmadı:', err);
            });

            // 🔴 DƏYİŞDİRİLMİŞ HİSSƏ - Asan İmza dəyərlərini düzgün göndər
            let asan_imza_number = null;
            let asan_id = null;
            let pin1 = null;
            let pin2 = null;
            let puk = null;

            if (isAsanMode) {
                // Asan modunda - bütün dəyərləri yığ (əgər varsa)
                asan_imza_number = getValue('asan_imza') ? utils.onlyDigits(getValue('asan_imza')).slice(0, 10) : '';
                asan_id = getValue('asan_id') ? utils.sanitizeAlphaNumeric(getValue('asan_id')).slice(0, 6) : '';
                pin1 = getValue('pin1') ? utils.onlyDigits(getValue('pin1')).slice(0, 4) : '';
                pin2 = getValue('pin2') ? utils.onlyDigits(getValue('pin2')).slice(0, 5) : '';
                puk = getValue('puk') ? utils.onlyDigits(getValue('puk')).slice(0, 8) : '';
            } else {
                // 🟢 Sadə modada - boş string göndər (null yox)
                asan_imza_number = '';
                asan_id = '';
                pin1 = '';
                pin2 = '';
                puk = '';
            }

            const data = {
                // Şirkət məlumatları
                company_name: getValue('company_name'),
                voen: getValue('voen'),

                // CEO məlumatları
                ceo_name: getValue('ceo_name'),
                ceo_lastname: getValue('ceo_lastname'),
                ceo_email: getValue('email'),
                ceo_phone: utils.formatPhone(getValue('phone_prefix'), getValue('phone_number')),
                ceo_password: getValue('password'),

                // Digər məlumatlar
                fin_code: utils.sanitizeAlphaNumeric(getValue('finkod')),

                // 🟢 DƏYİŞDİ - null əvəzinə boş string
                asan_imza_number: asan_imza_number,
                asan_id: asan_id,
                pin1: pin1,
                pin2: pin2,
                puk: puk,

                // Ana şirkət kodu (formdan gəlir)
                parent_company_code: state.isCompanyVerified ? state.parentCompanyCode : null,

                // Registration IP
                registration_ip: clientIP,

                // Terms
                terms: document.getElementById('terms') ? document.getElementById('terms').checked : false,

                // Qeydiyyat növü (əlavə məlumat)
                registration_type: isAsanMode ? 'asan' : 'simple'
            };

            console.log('📋 Form data collected:', {
                ...data,
                ceo_password: '••••••••',
                registration_ip: clientIP
            });

            return data;
        },


        generatePreview() {
            const data = this.collectFormData();
            return `
                <div class="preview-section">
                    <h4><i class="fas fa-building"></i> Şirkət Məlumatları</h4>
                    <div class="preview-grid">
                        <div class="preview-item">
                            <strong>Şirkət Adı:</strong> ${data.company_name || '-'}
                        </div>
                        <div class="preview-item">
                            <strong>VOEN:</strong> ${data.voen || '-'}
                        </div>
                        <div class="preview-item">
                            <strong>FIN Kod:</strong> ${data.fin_code || '-'}
                        </div>
                        ${state.isCompanyVerified ? `
                            <div class="preview-item highlight">
                                <strong>🏢 Ana Şirkət:</strong> ${state.verifiedCompanyData?.company_name || state.parentCompanyCode}
                                <br><small><i class="fas fa-info-circle"></i> Bu şirkətin listinə əlavə olunacaqsınız</small>
                            </div>
                        ` : `
                            <div class="preview-item">
                                <strong>Ana Şirkət:</strong> <em><i class="fas fa-user-tie"></i> Müstəqil şirkət</em>
                            </div>
                        `}
                    </div>
                </div>
                
                <div class="preview-section">
                    <h4><i class="fas fa-user-tie"></i> Rəhbər Məlumatları</h4>
                    <div class="preview-grid">
                        <div class="preview-item">
                            <strong>Ad:</strong> ${data.ceo_name || '-'}
                        </div>
                        <div class="preview-item">
                            <strong>Soyad:</strong> ${data.ceo_lastname || '-'}
                        </div>
                        <div class="preview-item">
                            <strong>E-poçt:</strong> ${data.ceo_email || '-'}
                        </div>
                        <div class="preview-item">
                            <strong>Telefon:</strong> ${data.ceo_phone || '-'}
                        </div>
                    </div>
                </div>
                
                ${data.asan_imza_number ? `
                    <div class="preview-section">
                        <h4><i class="fas fa-signature"></i> Asan İmza Məlumatları</h4>
                        <div class="preview-grid">
                            <div class="preview-item">
                                <strong>Asan İmza №:</strong> ${data.asan_imza_number || '-'}
                            </div>
                            ${data.asan_id ? `<div class="preview-item"><strong>Asan ID:</strong> ${data.asan_id}</div>` : ''}
                            ${data.pin1 ? `<div class="preview-item"><strong>PIN 1:</strong> ••••</div>` : ''}
                            ${data.pin2 ? `<div class="preview-item"><strong>PIN 2:</strong> •••••</div>` : ''}
                            ${data.puk ? `<div class="preview-item"><strong>PUK:</strong> ••••••••</div>` : ''}
                        </div>
                    </div>
                ` : ''}
                
                <div class="preview-note">
                    <i class="fas fa-info-circle"></i> Yuxarıdakı məlumatları diqqətlə yoxlayın. Göndərdikdən sonra dəyişiklik etmək mümkün olmaya bilər.
                </div>
            `;
        }
    };


    //  EVENT HANDLERS

    const events = {
        init() {
            // Form submission
            if (DOM.form) {
                DOM.form.addEventListener('submit', this.handleFormSubmit.bind(this));
            }

            // Company code verification
            if (DOM.companyCodeInput) {
                const debouncedValidation = utils.debounce(
                    () => validation.validateCompanyCode(DOM.companyCodeInput.value),
                    CONFIG.DEBOUNCE_DELAY
                );

                DOM.companyCodeInput.addEventListener('input', debouncedValidation);

                DOM.companyCodeInput.addEventListener('blur', () => {
                    if (DOM.companyCodeInput.value.trim()) {
                        validation.validateCompanyCode(DOM.companyCodeInput.value);
                    }
                });
            }

            // Verify company button
            if (DOM.verifyCompanyBtn) {
                DOM.verifyCompanyBtn.addEventListener('click', () => {
                    const code = DOM.companyCodeInput ? DOM.companyCodeInput.value : '';
                    if (code.trim()) {
                        validation.validateCompanyCode(code);
                    } else {
                        ui.setStatus('error', 'Zəhmət olmasa şirkət kodu daxil edin', 3000);
                    }
                });
            }

            // VOEN validation
            if (DOM.validateVoenBtn) {
                DOM.validateVoenBtn.addEventListener('click', () => {
                    const voenInput = document.querySelector('#voen');
                    if (voenInput && voenInput.value.trim()) {
                        validation.validateVoen(voenInput.value);
                    } else {
                        ui.setStatus('error', 'Zəhmət olmasa VOEN daxil edin', 3000);
                    }
                });
            }

            // Preview modal
            if (DOM.btnPreview) {
                DOM.btnPreview.addEventListener('click', this.showPreview.bind(this));
            }

            // Modal close buttons
            document.querySelectorAll('.btn-close, #btn-close-preview').forEach(btn => {
                btn.addEventListener('click', () => {
                    ui.hideModal(DOM.previewModal);
                });
            });

            // Modal outside click
            if (DOM.previewModal) {
                DOM.previewModal.addEventListener('click', (e) => {
                    if (e.target === DOM.previewModal) {
                        ui.hideModal(DOM.previewModal);
                    }
                });
            }

            // Submit from preview
            const submitFromPreviewBtn = document.querySelector('#btn-submit-from-preview');
            if (submitFromPreviewBtn) {
                submitFromPreviewBtn.addEventListener('click', () => {
                    ui.hideModal(DOM.previewModal);
                    if (DOM.form) {
                        DOM.form.dispatchEvent(new Event('submit'));
                    }
                });
            }

            // Real-time validation
            this.setupRealTimeValidation();

            // Password strength
            this.setupPasswordStrength();

            // Toggle password visibility
            this.setupPasswordToggle();

            // Input formatting
            this.setupInputFormatting();

            // Progress bar updates
            this.setupProgressTracking();

            // Terms checkbox validation
            this.setupTermsValidation();

            console.log('✅ Event handlers initialized');
        },

        handleFormSubmit(e) {
            e.preventDefault();

            if (!validation.validateForm()) {
                ui.setStatus('error', 'Zəhmət olmasa bütün məcburi sahələri düzgün doldurun.');
                return;
            }

            this.submitForm();
        },


        async submitForm() {
            const data = formData.collectFormData();
            const submitBtn = document.querySelector('[data-owner-submit]');

            try {
                ui.showLoading('[data-owner-submit]');
                ui.setStatus('info', 'Qeydiyyat göndərilir...', 0);

                // ✅ IP alma prosesi (promise ilə)
                try {
                    const ipResponse = await fetch('https://api.ipify.org?format=json');
                    const ipData = await ipResponse.json();
                    data.registration_ip = ipData.ip;
                    console.log(`🌐 Real IP alındı: ${data.registration_ip}`);
                } catch (ipError) {
                    console.warn('IP alma alınmadı:', ipError);
                    data.registration_ip = '0.0.0.0';
                }

                console.log('🚀 Qeydiyyat başladılır:', {
                    hasParentCode: !!data.parent_company_code,
                    parentCode: data.parent_company_code,
                    registration_ip: data.registration_ip
                });

                // ✅ API çağırışı (TƏK DƏFƏ)
                const response = await api.registerCompany(data);

                console.log('✅ Qeydiyyat response:', response);

                let successMessage = "";
                let showTelegramInfo = false;

                // SUCCESS MESSAGES
                if (state.isCompanyVerified && data.parent_company_code) {
                    // Alt şirkət qeydiyyatı
                    successMessage = `✅ Şirkətiniz uğurla yaradıldı!`;

                    if (response.parent_company_name) {  // ✅ parent_company -> parent_company_name
                        successMessage += `\n\n📍 <strong>"${response.parent_company_name}"</strong> şirkətinin listinə əlavə edildiniz.`;
                    }

                    if (response.relationship_created) {
                        successMessage += `\n✅ Şirkət əlaqəsi uğurla qeyd edildi.`;
                    }

                    if (response.message) {
                        successMessage = response.message;
                    }
                } else {
                    // Müstəqil şirkət qeydiyyatı
                    successMessage = "✅ Müstəqil şirkət olaraq qeydiyyat tamamlandı!";
                }

                // Telegram verification
                if (response.telegram?.requires_telegram_verification) {
                    successMessage = response.telegram.telegram_message || successMessage;
                    showTelegramInfo = true;
                } else if (response.message) {
                    successMessage = response.message;
                }

                // UI-da göstər
                ui.setStatus('success', successMessage);
                ui.updateProgressBar(100);

                // Telegram linki göstər
                if (showTelegramInfo && response.telegram?.telegram_bot_link) {
                    const telegramInfo = document.querySelector('#telegram-info');
                    if (telegramInfo) {
                        telegramInfo.style.display = 'block';
                        telegramInfo.innerHTML = `
                        <div class="telegram-section">
                            <h5><i class="fab fa-telegram"></i> Telegram Bot</h5>
                            <p>Qeydiyyatınızı tamamlamaq üçün Telegram botuna qoşulun:</p>
                            <a href="${response.telegram.telegram_bot_link}" 
                               target="_blank" 
                               class="telegram-link">
                                <i class="fab fa-telegram"></i> Bot-a qoşul
                            </a>
                            <p class="small-text"><i class="fas fa-info-circle"></i> Bot-a qoşulduqdan sonra <code>/start</code> yazın</p>
                        </div>
                    `;
                    }
                }

                // Redirect (5 saniyə sonra)
                const redirectUrl = DOM.form ? DOM.form.getAttribute('data-success-redirect') : 'login.html';
                setTimeout(() => {
                    console.log(`🔀 Redirect to: ${redirectUrl}`);
                    window.location.href = redirectUrl;
                }, 5000);

            } catch (error) {
                console.error('❌ Registration error:', error);
                console.error('Error details:', {
                    status: error.status,
                    message: error.message,
                    data: error.data
                });

                let errorMessage = 'Qeydiyyat zamanı xəta baş verdi';
                let errorType = 'error';

                // ERROR HANDLING
                if (error.status === 400) {
                    errorMessage = 'Yanlış məlumat daxil edilib. Zəhmət olmasa bütün sahələri yoxlayın.';
                    errorType = 'warning';
                } else if (error.status === 404) {
                    if (error.data?.detail?.includes('şirkət') || error.data?.detail?.includes('company')) {
                        errorMessage = 'Ana şirkət tapılmadı. Şirkət kodunu yoxlayın.';
                    } else {
                        errorMessage = 'Serverə qoşula bilmədim. İnternet əlaqənizi yoxlayın.';
                    }
                } else if (error.status === 409) {
                    errorMessage = 'Bu e-poçt, VOEN və ya FIN kod artıq qeydiyyatdan keçib.';
                } else if (error.status === 422) {
                    errorMessage = 'Məlumatlar düzgün deyil. Bütün tələb olunan sahələri doldurun.';
                    if (error.data?.detail) {
                        errorMessage += '\n\nXəta detalları:\n' +
                            (Array.isArray(error.data.detail)
                                ? error.data.detail.map(d => `• ${d.msg}`).join('\n')
                                : error.data.detail);
                    }
                } else if (error.status === 500) {
                    errorMessage = 'Server xətası. Zəhmət olmasa bir az sonra yenidən cəhd edin.';
                } else if (error.message && error.message.includes('NetworkError')) {
                    errorMessage = 'İnternet əlaqəsi yoxdur. Zəhmət olmasa əlaqənizi yoxlayın.';
                } else if (error.message) {
                    errorMessage = error.message;
                }

                ui.setStatus(errorType, errorMessage);

            } finally {
                ui.hideLoading('[data-owner-submit]');
            }
        },

        fin_code: (() => {
            const finType = document.querySelector('#fin_type');
            const finValue = document.querySelector('#finkod')?.value || '';
            const type = finType?.value || 'FIN';

            // Bütün tiplər üçün alfanumerik, böyük hərf formatında saxla
            return utils.sanitizeAlphaNumeric(finValue);
        })(),

        showPreview() {
            if (!validation.validateForm()) {
                ui.setStatus('error', 'Əvvəlcədən baxış üçün bütün məcburi sahələri doldurun.');
                return;
            }

            if (DOM.previewContent) {
                DOM.previewContent.innerHTML = formData.generatePreview();
            }

            ui.showModal(DOM.previewModal);
            ui.updateStep(2);
        },

        setupRealTimeValidation() {
            if (!DOM.form) return;

            const inputs = DOM.form.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                // Blur-da tam validasiya
                input.addEventListener('blur', () => validation.validateField(input));

                // Input-da real-time validasiya
                input.addEventListener('input', () => {
                    // Error-u gizlət (əgər varsa)
                    ui.hideFieldError(input);

                    // Real-time validasiya (boş deyilsə)
                    if (input.value.trim() !== '') {
                        validation.validateField(input);
                    }
                });

                // Change event (select üçün)
                input.addEventListener('change', () => validation.validateField(input));
            });
        },

        setupPasswordStrength() {
            const passwordInput = document.querySelector('#password');
            if (passwordInput) {
                passwordInput.addEventListener('input', (e) => {
                    ui.updatePasswordStrength(e.target.value);

                    // Check password match
                    const rePasswordInput = document.querySelector('#re_password');
                    if (rePasswordInput && rePasswordInput.value) {
                        validation.validateField(rePasswordInput);
                    }
                });
            }
        },

        setupPasswordToggle() {
            document.querySelectorAll('.toggle-password').forEach(button => {
                button.addEventListener('click', function () {
                    const targetId = this.getAttribute('data-target');
                    const input = document.getElementById(targetId);
                    if (!input) return;

                    const icon = this.querySelector('i');
                    if (input.type === 'password') {
                        input.type = 'text';
                        icon.classList.remove('fa-eye');
                        icon.classList.add('fa-eye-slash');
                        this.setAttribute('aria-label', 'Şifrəni gizlət');
                    } else {
                        input.type = 'password';
                        icon.classList.remove('fa-eye-slash');
                        icon.classList.add('fa-eye');
                        this.setAttribute('aria-label', 'Şifrəni göstər');
                    }

                    input.focus();
                });
            });
        },

        setupInputFormatting() {
            // Digits only inputs
            document.querySelectorAll('[data-digit-length]').forEach(input => {
                input.addEventListener('input', function () {
                    const maxLength = parseInt(this.getAttribute('data-digit-length')) || 999;
                    this.value = utils.onlyDigits(this.value).slice(0, maxLength);
                });
            });

            // Company code input
            if (DOM.companyCodeInput) {
                DOM.companyCodeInput.addEventListener('input', function () {
                    this.value = this.value.replace(/[^A-Za-z0-9\-]/g, '').toUpperCase();
                });
            }

            // FIN kod input - tipə görə formatla
            const finInput = document.querySelector('#finkod');
            const finType = document.querySelector('#fin_type');
            const finInfo = document.querySelector('#fin-type-info');
            const finError = document.querySelector('#fin-error');

            if (finInput && finType) {
                const updateFinValidation = () => {
                    const type = finType.value;

                    // Tipə görə maxlength və placeholder dəyiş
                    switch (type) {
                        case 'FIN':
                            finInput.maxLength = 7;
                            finInput.placeholder = '7 simvol (məsələn: AB123CD)';
                            finInput.pattern = '[A-Z0-9]{7}';
                            break;
                        case 'MYI':
                            finInput.maxLength = 6;
                            finInput.placeholder = '6 simvol (məsələn: F43H34)';
                            finInput.pattern = '[A-Z0-9]{6}';
                            break;
                        case 'DYI':
                            finInput.maxLength = 5;
                            finInput.placeholder = '5 simvol (məsələn: 5DF4D)';
                            finInput.pattern = '[A-Z0-9]{5}';
                            break;
                    }

                    // İnfo mesajı
                    if (finInfo) {
                        let infoText = '';
                        let icon = 'fa-info-circle';
                        let example = '';

                        switch (type) {
                            case 'FIN':
                                infoText = 'FIN: 7 simvol (hərf və rəqəm)';
                                example = 'AB123CD';
                                icon = 'fa-id-card';
                                break;
                            case 'MYI':
                                infoText = 'MYI: 6 simvol (hərf və rəqəm)';
                                example = 'F43H34';
                                icon = 'fa-mobile-alt';
                                break;
                            case 'DYI':
                                infoText = 'DYI: 5 simvol (hərf və rəqəm)';
                                example = '5DF4D';
                                icon = 'fa-passport';
                                break;
                        }

                        finInfo.innerHTML = `<i class="fas ${icon}"></i> ${infoText} <span class="example">${example}</span>`;
                    }

                    // Error mesajını təmizlə
                    if (finError) {
                        finError.style.display = 'none';
                    }

                    // Input-u təmizlə
                    finInput.value = '';
                };

                // Tip dəyişdikdə
                finType.addEventListener('change', function () {
                    updateFinValidation();
                    finInput.focus();
                });

                // Input daxil edildikdə
                finInput.addEventListener('input', function () {
                    const type = finType.value;
                    const maxLength = type === 'FIN' ? 7 : (type === 'MYI' ? 6 : 5);

                    // Alfanumerik, böyük hərf et
                    let newValue = utils.sanitizeAlphaNumeric(this.value);

                    // Uzunluğu məhdudlaşdır
                    if (newValue.length > maxLength) {
                        newValue = newValue.slice(0, maxLength);
                    }

                    this.value = newValue;

                    // Error-u real-time yoxla
                    if (window.validation) {
                        window.validation.validateField(this);
                    }
                });

                // Blur olanda validasiya
                finInput.addEventListener('blur', function () {
                    if (window.validation) {
                        window.validation.validateField(this);
                    }
                });

                // İlkin info mesajı
                updateFinValidation();
            }

            // Phone number formatting
            const phoneInput = document.querySelector('#phone_number');
            if (phoneInput) {
                phoneInput.addEventListener('input', function () {
                    const digits = utils.onlyDigits(this.value);
                    let formatted = '';

                    if (digits.length > 0) formatted = digits.substring(0, 3);
                    if (digits.length > 3) formatted += '-' + digits.substring(3, 5);
                    if (digits.length > 5) formatted += '-' + digits.substring(5, 7);

                    this.value = formatted;
                });
            }

            // Asan İmza fields
            ['asan_imza', 'asan_id', 'pin1', 'pin2', 'puk'].forEach(id => {
                const input = document.getElementById(id);
                if (input) {
                    input.addEventListener('input', function () {
                        const maxLength = parseInt(this.getAttribute('data-digit-length') || '999');
                        this.value = utils.onlyDigits(this.value).slice(0, maxLength);
                    });
                }
            });
        },

        setupProgressTracking() {
            if (!DOM.form) return;

            const updateProgress = () => {
                const requiredFields = DOM.form.querySelectorAll('[required]');
                if (requiredFields.length === 0) return;

                const filledFields = Array.from(requiredFields).filter(field => {
                    if (field.type === 'checkbox') return field.checked;
                    if (field.type === 'select-one') return field.value !== '';
                    return field.value.trim() !== '';
                }).length;

                const progress = Math.round((filledFields / requiredFields.length) * 100);
                ui.updateProgressBar(progress);
            };

            DOM.form.querySelectorAll('input, select, textarea').forEach(field => {
                field.addEventListener('input', updateProgress);
                field.addEventListener('change', updateProgress);
            });

            // Initial progress
            setTimeout(updateProgress, 100);
        },

        setupTermsValidation() {
            const termsCheckbox = document.querySelector('#terms');
            if (termsCheckbox) {
                termsCheckbox.addEventListener('change', function () {
                    validation.validateField(this);
                });
            }
        }
    };

    // Registration type switching
    function setupRegistrationTypeToggle() {
        const asanRadio = document.getElementById('reg_type_asan');
        const simpleRadio = document.getElementById('reg_type_simple');
        const asanSection = document.getElementById('asan-imza-section');
        const asanFields = ['asan_imza', 'asan_id', 'pin1', 'pin2', 'puk'];

        if (!asanRadio || !simpleRadio || !asanSection) return;

        function toggleAsanFields(isAsanMode) {
            // Section-u disable et və ya aktiv et
            if (isAsanMode) {
                asanSection.classList.remove('disabled');
            } else {
                asanSection.classList.add('disabled');
            }

            // Hər bir field-in required atributunu dəyiş
            asanFields.forEach(id => {
                const field = document.getElementById(id);
                if (field) {
                    if (isAsanMode) {
                        field.setAttribute('required', 'required');
                        field.removeAttribute('disabled');

                        // Error mesajlarını göstər/gizlət
                        setTimeout(() => {
                            if (field.value.trim() === '') {
                                ui.showFieldError(field, `${field.previousElementSibling?.textContent || 'Bu sahə'} doldurulmalıdır`);
                            }
                        }, 100);
                    } else {
                        field.removeAttribute('required');
                        field.setAttribute('disabled', 'disabled');
                        ui.hideFieldError(field);

                        // Dəyərləri təmizlə (istəyə bağlı)
                        // field.value = '';
                    }
                }
            });

            // Qeyd mətnini yenilə
            const asanNote = document.getElementById('asan-note');
            if (asanNote) {
                asanNote.innerHTML = isAsanMode
                    ? '<i class="fas fa-info-circle"></i> Asan İmza məlumatları "Asan İmza ilə qeydiyyat" seçimində <strong>məcburidir</strong>.'
                    : '<i class="fas fa-check-circle"></i> Sadə qeydiyyat seçildiyi üçün Asan İmza məlumatları <strong>tələb olunmur</strong>.';
            }

            // Form validation-u yenilə
            if (window.validation) {
                setTimeout(() => {
                    validation.validateForm();
                }, 50);
            }
        }

        // Radio dəyişikliklərini dinlə
        asanRadio.addEventListener('change', function () {
            if (this.checked) {
                toggleAsanFields(true);
            }
        });

        simpleRadio.addEventListener('change', function () {
            if (this.checked) {
                toggleAsanFields(false);
            }
        });

        // İlkin vəziyyət: Asan İmza seçili
        toggleAsanFields(true);

        console.log('✅ Registration type toggle initialized');
    }


    //  INITIALIZATION

    function init() {
        console.log('🚀 Initializing registration page...');

        // 1. Dərhal loader-i təmizlə (yenidən)
        const loader = document.getElementById('gti-loader');
        if (loader) {
            loader.style.display = 'none';
            loader.style.opacity = '0';
            setTimeout(() => {
                try {
                    if (loader.parentNode) loader.parentNode.removeChild(loader);
                } catch (e) {
                }
            }, 500);
        }

        // 2. Body və site shell-i görünən et
        document.body.classList.remove('loader-active');
        document.body.classList.add('loaded');
        document.body.style.opacity = '1';

        const siteShell = document.getElementById('site-shell');
        if (siteShell) {
            siteShell.style.opacity = '1';
            siteShell.style.pointerEvents = 'auto';
        }

        // 3. Event handlers-i başlat
        events.init();

        // 🟢🟢🟢 ƏLAVƏ EDİN - Qeydiyyat növü toggle funksiyasını çağır
        setupRegistrationTypeToggle();

        // 4. Update initial step
        ui.updateStep(1);

        // 5. Progress bar başlat
        setTimeout(() => {
            if (DOM.progressBar) {
                DOM.progressBar.style.width = '0%';
            }
        }, 100);

        console.log('✅ Registration page initialized successfully');
    }


    //  START APPLICATION

    // DOM ready-də başlat
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // DOM artıq hazırdırsa, dərhal başlat
        setTimeout(init, 0);
    }

    // Window load event-də də yoxla
    window.addEventListener('load', () => {
        // Son tədbir: hər hansı qalmış loader-i gizlət
        setTimeout(() => {
            const remainingLoader = document.getElementById('gti-loader');
            if (remainingLoader) {
                remainingLoader.style.display = 'none';
            }
        }, 1000);
    });

})();


//  GLOBAL ERROR HANDLING

window.addEventListener('error', function (e) {
    console.error('Global error caught:', e.error);

    // Loader-i gizlət
    const loader = document.getElementById('gti-loader');
    if (loader) {
        loader.style.display = 'none';
    }

    return false;
});

window.addEventListener('unhandledrejection', function (e) {
    console.error('Unhandled promise rejection:', e.reason);
});