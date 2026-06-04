// ============ HTTPS-dən HTTP-yə MƏCBURİ YÖNLƏNDİRMƏ ============
(function() {
    // Yalnız qeydiyyat səhifələri üçün işləsin
    if (window.location.pathname.includes('register-owner.html') ||
        window.location.pathname.includes('register-worker.html')) {

        if (window.location.protocol === 'https:') {
            console.log('🔄 HTTPS detected on registration page, redirecting to HTTP...');
            var httpUrl = 'http://' + window.location.host + window.location.pathname + window.location.search;
            window.location.replace(httpUrl);
            return; // Əhəmiyyətli: geri qalan kod işləməsin
        }
    }
})();
// ============ YÖNLƏNDİRMƏ SONU ============

// ============ ORİJİNAL REGISTER.JS KODU ============
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
        API_BASE: "http://vps.guvenfinans.az:8008",
        DEBOUNCE_DELAY: 800,
        PASSWORD_STRENGTH_LEVELS: {
            weak: { color: '#ef4444', minScore: 0 },
            medium: { color: '#f59e0b', minScore: 2 },
            strong: { color: '#10b981', minScore: 3 }
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
            if (!password) return { valid: false, score: 0, strength: 'weak' };

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

            return { valid, score, strength };
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


    async registerCompany(data) {
        let url = `${CONFIG.API_BASE}/api/v1/companies/create_company_subsidiaries`;

        console.log('🔍 DEBUG - registerCompany called:', {
            originalData: data,
            parent_company_code: data.parent_company_code,
            hasParentCode: !!data.parent_company_code
        });

        if (data.parent_company_code && data.parent_company_code.trim() !== '') {
            const encodedCode = encodeURIComponent(data.parent_company_code.trim());
            url += `?company_code=${encodedCode}`;
            console.log(`✅ Şirkət kodu əlavə edildi: ${data.parent_company_code}`);
            console.log(`✅ Final URL: ${url}`);
        } else {
            console.log('ℹ️ Şirkət kodu yoxdur - müstəqil şirkət');
        }

        console.log('📤 Sending request to:', url);

        console.log('📦 Request body:', {
            ...data,
            ceo_password: '••••••••'
        });

        return await this.request(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

        async checkCompanyCode(code) {
            const cleanCode = utils.cleanCompanyCode(code);
            if (!cleanCode) {
                throw new Error('Şirkət kodu daxil edilməlidir');
            }

            return await this.request(`${CONFIG.API_BASE}/api/v1/companies/code/${encodeURIComponent(cleanCode)}`, {
                method: 'GET'
            });
        },

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
            let errorElement = field.nextElementSibling;
            if (!errorElement || !errorElement.classList.contains('field-error')) {
                errorElement = field.parentElement.querySelector('.field-error');
            }

            if (errorElement) {
                errorElement.textContent = message;
                errorElement.style.display = 'block';
                field.setAttribute('aria-invalid', 'true');
                field.classList.add('error');
            }
        },

        hideFieldError(field) {
            let errorElement = field.nextElementSibling;
            if (!errorElement || !errorElement.classList.contains('field-error')) {
                errorElement = field.parentElement.querySelector('.field-error');
            }

            if (errorElement) {
                errorElement.style.display = 'none';
                field.removeAttribute('aria-invalid');
                field.classList.remove('error');
            }
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

                case 'voen':
                    if (!value) {
                        message = 'VOEN daxil edilməlidir';
                        isValid = false;
                    } else if (utils.onlyDigits(value).length !== 10) {
                        message = 'VOEN 10 rəqəm olmalıdır';
                        isValid = false;
                    }
                    break;

                case 'finkod':
                    if (!value) {
                        message = 'FIN kod daxil edilməlidir';
                        isValid = false;
                    } else if (value.length !== 7) {
                        message = 'FIN kod 7 simvol olmalıdır';
                        isValid = false;
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

            const requiredFields = DOM.form.querySelectorAll('[required]');
            let isValid = true;

            requiredFields.forEach(field => {
                if (!this.validateField(field)) {
                    isValid = false;
                }
            });

            const password = document.querySelector('#password');
            const rePassword = document.querySelector('#re_password');

            if (password && rePassword && password.value !== rePassword.value) {
                ui.showFieldError(rePassword, 'Şifrələr uyğun deyil');
                isValid = false;
            }

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
                    ui.showCompanyNameDisplay({ company_name: 'Şirkət tapılmadı' }, false);
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


    //  FORM DATA COLLECTION

const formData = {
        collectFormData() {
            const getValue = (id) => {
                const el = document.getElementById(id);
                return el ? el.value.trim() : '';
            };

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

            const data = {
                company_name: getValue('company_name'),
                voen: getValue('voen'),

                ceo_name: getValue('ceo_name'),
                ceo_lastname: getValue('ceo_lastname'),
                ceo_email: getValue('email'),
                ceo_phone: utils.formatPhone(getValue('phone_prefix'), getValue('phone_number')),
                ceo_password: getValue('password'),

                fin_code: utils.sanitizeAlphaNumeric(getValue('finkod')),
                asan_imza_number: getValue('asan_imza') ? utils.onlyDigits(getValue('asan_imza')).slice(0, 10) : null,
                asan_id: getValue('asan_id') ? utils.sanitizeAlphaNumeric(getValue('asan_id')).slice(0, 6) : null,
                pin1: getValue('pin1') ? utils.onlyDigits(getValue('pin1')).slice(0, 4) : null,
                pin2: getValue('pin2') ? utils.onlyDigits(getValue('pin2')).slice(0, 5) : null,
                puk: getValue('puk') ? utils.onlyDigits(getValue('puk')).slice(0, 8) : null,

                parent_company_code: state.isCompanyVerified ? state.parentCompanyCode : null,

                registration_ip: clientIP,

                terms: document.getElementById('terms') ? document.getElementById('terms').checked : false
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
            if (DOM.form) {
                DOM.form.addEventListener('submit', this.handleFormSubmit.bind(this));
            }

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

            if (DOM.btnPreview) {
                DOM.btnPreview.addEventListener('click', this.showPreview.bind(this));
            }

            document.querySelectorAll('.btn-close, #btn-close-preview').forEach(btn => {
                btn.addEventListener('click', () => {
                    ui.hideModal(DOM.previewModal);
                });
            });

            if (DOM.previewModal) {
                DOM.previewModal.addEventListener('click', (e) => {
                    if (e.target === DOM.previewModal) {
                        ui.hideModal(DOM.previewModal);
                    }
                });
            }

            const submitFromPreviewBtn = document.querySelector('#btn-submit-from-preview');
            if (submitFromPreviewBtn) {
                submitFromPreviewBtn.addEventListener('click', () => {
                    ui.hideModal(DOM.previewModal);
                    if (DOM.form) {
                        DOM.form.dispatchEvent(new Event('submit'));
                    }
                });
            }

            this.setupRealTimeValidation();
            this.setupPasswordStrength();
            this.setupPasswordToggle();
            this.setupInputFormatting();
            this.setupProgressTracking();
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

                const response = await api.registerCompany(data);

                console.log('✅ Qeydiyyat response:', response);

                let successMessage = "";
                let showTelegramInfo = false;

                if (state.isCompanyVerified && data.parent_company_code) {
                    successMessage = `✅ Şirkətiniz uğurla yaradıldı!`;

                    if (response.parent_company_name) {
                        successMessage += `\n\n📍 <strong>"${response.parent_company_name}"</strong> şirkətinin listinə əlavə edildiniz.`;
                    }

                    if (response.relationship_created) {
                        successMessage += `\n✅ Şirkət əlaqəsi uğurla qeyd edildi.`;
                    }

                    if (response.message) {
                        successMessage = response.message;
                    }
                } else {
                    successMessage = "✅ Müstəqil şirkət olaraq qeydiyyat tamamlandı!";
                }

                if (response.telegram?.requires_telegram_verification) {
                    successMessage = response.telegram.telegram_message || successMessage;
                    showTelegramInfo = true;
                }
                else if (response.message) {
                    successMessage = response.message;
                }

                ui.setStatus('success', successMessage);
                ui.updateProgressBar(100);

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

                if (error.status === 400) {
                    errorMessage = 'Yanlış məlumat daxil edilib. Zəhmət olmasa bütün sahələri yoxlayın.';
                    errorType = 'warning';
                }
                else if (error.status === 404) {
                    if (error.data?.detail?.includes('şirkət') || error.data?.detail?.includes('company')) {
                        errorMessage = 'Ana şirkət tapılmadı. Şirkət kodunu yoxlayın.';
                    } else {
                        errorMessage = 'Serverə qoşula bilmədim. İnternet əlaqənizi yoxlayın.';
                    }
                }
                else if (error.status === 409) {
                    errorMessage = 'Bu e-poçt, VOEN və ya FIN kod artıq qeydiyyatdan keçib.';
                }
                else if (error.status === 422) {
                    errorMessage = 'Məlumatlar düzgün deyil. Bütün tələb olunan sahələri doldurun.';
                    if (error.data?.detail) {
                        errorMessage += '\n\nXəta detalları:\n' +
                            (Array.isArray(error.data.detail)
                                ? error.data.detail.map(d => `• ${d.msg}`).join('\n')
                                : error.data.detail);
                    }
                }
                else if (error.status === 500) {
                    errorMessage = 'Server xətası. Zəhmət olmasa bir az sonra yenidən cəhd edin.';
                }
                else if (error.message && error.message.includes('NetworkError')) {
                    errorMessage = 'İnternet əlaqəsi yoxdur. Zəhmət olmasa əlaqənizi yoxlayın.';
                }
                else if (error.message) {
                    errorMessage = error.message;
                }

                ui.setStatus(errorType, errorMessage);

            } finally {
                ui.hideLoading('[data-owner-submit]');
            }
        },

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
                input.addEventListener('blur', () => validation.validateField(input));
                input.addEventListener('input', () => ui.hideFieldError(input));
            });
        },

        setupPasswordStrength() {
            const passwordInput = document.querySelector('#password');
            if (passwordInput) {
                passwordInput.addEventListener('input', (e) => {
                    ui.updatePasswordStrength(e.target.value);

                    const rePasswordInput = document.querySelector('#re_password');
                    if (rePasswordInput && rePasswordInput.value) {
                        validation.validateField(rePasswordInput);
                    }
                });
            }
        },

        setupPasswordToggle() {
            document.querySelectorAll('.toggle-password').forEach(button => {
                button.addEventListener('click', function() {
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
            document.querySelectorAll('[data-digit-length]').forEach(input => {
                input.addEventListener('input', function() {
                    const maxLength = parseInt(this.getAttribute('data-digit-length')) || 999;
                    this.value = utils.onlyDigits(this.value).slice(0, maxLength);
                });
            });

            if (DOM.companyCodeInput) {
                DOM.companyCodeInput.addEventListener('input', function() {
                    this.value = this.value.replace(/[^A-Za-z0-9\-]/g, '').toUpperCase();
                });
            }

            const finInput = document.querySelector('#finkod');
            if (finInput) {
                finInput.addEventListener('input', function() {
                    this.value = utils.sanitizeAlphaNumeric(this.value).slice(0, 7);
                });
            }

            const phoneInput = document.querySelector('#phone_number');
            if (phoneInput) {
                phoneInput.addEventListener('input', function() {
                    const digits = utils.onlyDigits(this.value);
                    let formatted = '';

                    if (digits.length > 0) formatted = digits.substring(0, 3);
                    if (digits.length > 3) formatted += '-' + digits.substring(3, 5);
                    if (digits.length > 5) formatted += '-' + digits.substring(5, 7);

                    this.value = formatted;
                });
            }

            ['asan_imza', 'asan_id', 'pin1', 'pin2', 'puk'].forEach(id => {
                const input = document.getElementById(id);
                if (input) {
                    input.addEventListener('input', function() {
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

            setTimeout(updateProgress, 100);
        },

        setupTermsValidation() {
            const termsCheckbox = document.querySelector('#terms');
            if (termsCheckbox) {
                termsCheckbox.addEventListener('change', function() {
                    validation.validateField(this);
                });
            }
        }
    };


    //  INITIALIZATION

    function init() {
        console.log('🚀 Initializing registration page...');

        const loader = document.getElementById('gti-loader');
        if (loader) {
            loader.style.display = 'none';
            loader.style.opacity = '0';
            setTimeout(() => {
                try {
                    if (loader.parentNode) loader.parentNode.removeChild(loader);
                } catch (e) {}
            }, 500);
        }

        document.body.classList.remove('loader-active');
        document.body.classList.add('loaded');
        document.body.style.opacity = '1';

        const siteShell = document.getElementById('site-shell');
        if (siteShell) {
            siteShell.style.opacity = '1';
            siteShell.style.pointerEvents = 'auto';
        }

        events.init();

        ui.updateStep(1);

        setTimeout(() => {
            if (DOM.progressBar) {
                DOM.progressBar.style.width = '0%';
            }
        }, 100);

        console.log('✅ Registration page initialized successfully');
    }


    //  START APPLICATION

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 0);
    }

    window.addEventListener('load', () => {
        setTimeout(() => {
            const remainingLoader = document.getElementById('gti-loader');
            if (remainingLoader) {
                remainingLoader.style.display = 'none';
            }
        }, 1000);
    });

})();


//  GLOBAL ERROR HANDLING

window.addEventListener('error', function(e) {
    console.error('Global error caught:', e.error);

    const loader = document.getElementById('gti-loader');
    if (loader) {
        loader.style.display = 'none';
    }

    return false;
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled promise rejection:', e.reason);
});