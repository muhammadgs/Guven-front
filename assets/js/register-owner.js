// ── LOADER FIX ──────────────────────────────────────────────────────────────
(function fixLoaderIssue() {
    const loader = document.getElementById('gti-loader');
    if (loader) {
        loader.style.display = 'none';
        loader.style.opacity = '0';
        loader.style.visibility = 'hidden';
        loader.style.pointerEvents = 'none';
        loader.classList.add('fade-out');
        setTimeout(() => {
            try {
                if (loader.parentNode) loader.parentNode.removeChild(loader);
            } catch (e) {}
        }, 1000);
    }
    const body = document.body;
    if (body) {
        body.classList.remove('loader-active');
        body.classList.add('loaded');
        body.style.opacity = '1';
        body.style.visibility = 'visible';
        body.style.overflow = 'auto';
    }
    const siteShell = document.getElementById('site-shell');
    if (siteShell) {
        siteShell.style.opacity = '1';
        siteShell.style.pointerEvents = 'auto';
        siteShell.style.visibility = 'visible';
        siteShell.style.minHeight = '100vh';
    }
    try {
        sessionStorage.removeItem('gtiLoaderShown');
        localStorage.removeItem('gtiLoaderShown');
    } catch (e) {
        console.warn('Storage təmizlənmədi:', e);
    }
    console.log('✅ Loader problemi həll edildi');
})();

// ── KONFİQURASİYA ────────────────────────────────────────────────────────────
const CONFIG = {
    API_BASE: "/proxy.php",
    DEBOUNCE_DELAY: 800,
    PASSWORD_STRENGTH_LEVELS: {
        weak:   { color: '#ef4444', minScore: 0 },
        medium: { color: '#f59e0b', minScore: 2 },
        strong: { color: '#10b981', minScore: 3 }
    }
};

// ── DOM CACHE ────────────────────────────────────────────────────────────────
const DOM = {
    form:                    document.querySelector("[data-owner-registration]"),
    statusEl:                document.querySelector("[data-api-status]"),
    companyCodeInput:        document.querySelector("#company_code"),
    companyNameDisplay:      document.querySelector("#companyNameDisplay"),
    verifiedCompanyNameSpan: document.querySelector("#verifiedCompanyName"),
    verifyCompanyBtn:        document.querySelector("#verify-company-code"),
    validateVoenBtn:         document.querySelector("#validate-voen"),
    previewModal:            document.querySelector("#preview-modal"),
    previewContent:          document.querySelector("#preview-content"),
    btnPreview:              document.querySelector("#btn-preview"),
    progressBar:             document.querySelector("#progress-bar")
};

// ── STATE ────────────────────────────────────────────────────────────────────
const state = {
    isCompanyVerified:  false,
    parentCompanyCode:  null,
    verifiedCompanyData: null,
    voenValidated:      false,
    formValid:          false,
    currentStep:        1,
    formData:           {},
    debounceTimer:      null,
    currentUserType:    'sirket',   // 'sirket' | 'fiziki' | 'vetendas'
    voenData:           null        // e-taxes.gov.az-dan gələn məlumatlar
};

// ── UTILS ────────────────────────────────────────────────────────────────────
const utils = {
    cleanCompanyCode:     (str) => String(str || "").replace(/['"]+/g, '').trim().toUpperCase(),
    sanitizeAlphaNumeric: (str) => String(str || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase(),
    onlyDigits:           (str) => String(str || "").replace(/\D/g, ""),
    formatPhone: (prefix, number) => {
        const p = utils.onlyDigits(prefix);
        const n = utils.onlyDigits(number);
        return `+994${p}${n}`;
    },
    validateEmail: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    validatePassword: (password) => {
        if (!password) return { valid: false, score: 0, strength: 'weak' };
        let score = 0;
        if (password.length >= 8)        score++;
        if (/[A-Z]/.test(password))      score++;
        if (/[a-z]/.test(password))      score++;
        if (/\d/.test(password))         score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        const valid = password.length >= 8;
        let strength = 'weak';
        if (score >= 4) strength = 'strong';
        else if (score >= 2) strength = 'medium';
        return { valid, score, strength };
    },
    debounce: (func, wait) => {
        let timeout;
        return function (...args) {
            const later = () => { clearTimeout(timeout); func(...args); };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    generateId: () => 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
};

// ── API SERVICE ──────────────────────────────────────────────────────────────
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
                        errorMsg = Array.isArray(data.detail)
                            ? data.detail.map(err => `${err.loc?.join('.') || 'unknown'}: ${err.msg}`).join(', ')
                            : data.detail;
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
        if (data.parent_company_code && data.parent_company_code.trim() !== '') {
            url += `?company_code=${encodeURIComponent(data.parent_company_code.trim())}`;
            console.log(`✅ Şirkət kodu: ${data.parent_company_code}`);
        } else {
            console.log('ℹ️ Müstəqil şirkət');
        }
        return await this.request(url, { method: 'POST', body: JSON.stringify(data) });
    },

    async registerFiziki(data) {
        const url = `${CONFIG.API_BASE}/api/v1/users/register_simple`;
        return await this.request(url, { method: 'POST', body: JSON.stringify(data) });
    },

    async registerVetendas(data) {
        const url = `${CONFIG.API_BASE}/api/v1/users/register_simple`;
        const payload = {
            ad:               data.ad,
            soyad:            data.soyad,
            email:            data.email,
            phone:            data.phone,
            password:         data.password,
            fealiyyet_sahesi: data.fealiyyet_sahesi || 'Sahibkar',
            registration_ip:  data.registration_ip || '0.0.0.0'
        };
        if (data.voen     && data.voen.trim     && data.voen.trim()     !== '') payload.voen     = data.voen;
        if (data.fin_code && data.fin_code.trim && data.fin_code.trim() !== '') payload.fin_code = data.fin_code;
        return await this.request(url, { method: 'POST', body: JSON.stringify(payload) });
    },

    async checkCompanyCode(code) {
        const cleanCode = utils.cleanCompanyCode(code);
        if (!cleanCode) throw new Error('Şirkət kodu daxil edilməlidir');
        return await this.request(`${CONFIG.API_BASE}/api/v1/companies/code/${encodeURIComponent(cleanCode)}`, { method: 'GET' });
    },

    async checkVoen(voen) {
        const digits = utils.onlyDigits(voen);
        if (digits.length !== 10) throw new Error('VOEN 10 rəqəm olmalıdır');
        return await this.request(`${CONFIG.API_BASE}/api/v1/companies/check/voen/${digits}`, { method: 'GET' });
    }
};

// ── UI COMPONENTS ────────────────────────────────────────────────────────────
const ui = {
    setStatus(type, message, duration = 0) {
        if (!DOM.statusEl) return;
        DOM.statusEl.hidden = false;
        DOM.statusEl.className = 'api-status';
        DOM.statusEl.classList.add(type);
        const icon = {
            success: 'fa-check-circle',
            error:   'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info:    'fa-info-circle'
        }[type] || 'fa-info-circle';
        DOM.statusEl.innerHTML = `<div class="status-content"><i class="fas ${icon}"></i><span>${message}</span></div>`;
        DOM.statusEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        if (duration > 0) setTimeout(() => this.clearStatus(), duration);
    },

    clearStatus() {
        if (DOM.statusEl) {
            DOM.statusEl.hidden = true;
            DOM.statusEl.className = 'api-status hidden';
            DOM.statusEl.textContent = '';
        }
    },

    showLoading(selector) {
        const el = document.querySelector(selector);
        if (el) {
            const loader = el.querySelector('.submit-loader');
            if (loader) loader.style.display = 'flex';
            el.disabled = true;
        }
    },

    hideLoading(selector) {
        const el = document.querySelector(selector);
        if (el) {
            const loader = el.querySelector('.submit-loader');
            if (loader) loader.style.display = 'none';
            el.disabled = false;
        }
    },

    showCompanyNameDisplay(data, isVerified = true) {
        if (!DOM.companyNameDisplay || !DOM.verifiedCompanyNameSpan) return;
        DOM.companyNameDisplay.style.display = 'block';
        DOM.verifiedCompanyNameSpan.textContent = data.company_name || 'Məlumat yoxdur';
        DOM.companyNameDisplay.className = 'company-name-display';
        DOM.companyNameDisplay.classList.add(isVerified ? 'verified' : 'error');
    },

    hideCompanyNameDisplay() {
        if (DOM.companyNameDisplay) DOM.companyNameDisplay.style.display = 'none';
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
        const result = utils.validatePassword(password);
        strengthContainer.setAttribute('data-strength', result.strength);
        const labels = { weak: 'Zəif', medium: 'Orta', strong: 'Güclü' };
        const textEl = strengthContainer.querySelector('.strength-text');
        if (textEl) textEl.textContent = `Şifrə gücü: ${labels[result.strength] || 'Zəif'}`;
    },

    updateProgressBar(percentage) {
        if (DOM.progressBar) {
            DOM.progressBar.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
        }
    },

    showModal(modal) {
        if (modal) { modal.classList.add('show'); document.body.style.overflow = 'hidden'; }
    },

    hideModal(modal) {
        if (modal) { modal.classList.remove('show'); document.body.style.overflow = ''; }
    },

    showFieldError(field, message) {
        let errorElement = null;
        const errorIdMap = {
            'phone_number':      'phone-error',
            'fiziki_telefon':    'fiziki-phone-error',
            'vet_telefon':       'vet-phone-error',
            'password':          'password-error',
            'fiziki_password':   'fiziki-password-error',
            'vet_password':      'vet-password-error',
            're_password':       'password-match',
            'fiziki_re_password':'fiziki-password-match',
            'vet_re_password':   'vet-password-match',
            'pin1':              'pin1-error',
            'pin2':              'pin2-error',
            'puk':               'puk-error',
            'asan_imza':         'asan-imza-error',
            'asan_id':           'asan-id-error',
            'finkod':            'fin-error'
        };
        if (errorIdMap[field.id]) {
            errorElement = document.getElementById(errorIdMap[field.id]);
        } else {
            errorElement = field.nextElementSibling;
            if (!errorElement || !errorElement.classList.contains('field-error')) {
                errorElement = field.closest('.field')?.querySelector('.field-error');
            }
        }
        if (errorElement) { errorElement.textContent = message; errorElement.style.display = 'block'; }
        field.setAttribute('aria-invalid', 'true');
        field.classList.add('error');
    },

    hideFieldError(field) {
        const errorIdMap = {
            'phone_number':      'phone-error',
            'fiziki_telefon':    'fiziki-phone-error',
            'vet_telefon':       'vet-phone-error',
            'password':          'password-error',
            'fiziki_password':   'fiziki-password-error',
            'vet_password':      'vet-password-error',
            're_password':       'password-match',
            'fiziki_re_password':'fiziki-password-match',
            'vet_re_password':   'vet-password-match',
            'pin1':              'pin1-error',
            'pin2':              'pin2-error',
            'puk':               'puk-error',
            'asan_imza':         'asan-imza-error',
            'asan_id':           'asan-id-error',
            'finkod':            'fin-error'
        };
        let errorElement = null;
        if (errorIdMap[field.id]) {
            errorElement = document.getElementById(errorIdMap[field.id]);
        } else {
            errorElement = field.nextElementSibling;
            if (!errorElement || !errorElement.classList.contains('field-error')) {
                errorElement = field.closest('.field')?.querySelector('.field-error');
            }
        }
        if (errorElement) errorElement.style.display = 'none';
        field.removeAttribute('aria-invalid');
        field.classList.remove('error');
    },

    updateStep(currentStep) {
        document.querySelectorAll('.step').forEach(step => {
            const stepNum = parseInt(step.dataset.step);
            step.classList.remove('active', 'completed');
            if (stepNum < currentStep) step.classList.add('completed');
            else if (stepNum === currentStep) step.classList.add('active');
        });
        state.currentStep = currentStep;
    }
};

// ── FORM VALIDATION ──────────────────────────────────────────────────────────
const validation = {
    validateField(field) {
        const value = field.value.trim();
        let isValid = true;
        let message = '';

        switch (field.id) {
            case 'company_name':
                if (!value) { message = 'Şirkət adı daxil edilməlidir'; isValid = false; }
                else if (value.length < 3) { message = 'Şirkət adı ən az 3 simvol olmalıdır'; isValid = false; }
                break;

            case 'fealiyyet_sahesi_sirket':
            case 'fiziki_fealiyyet':
            case 'vet_fealiyyet':
                if (!value) { message = 'Fəaliyyət sahəsini daxil edin'; isValid = false; }
                break;

            case 'email':
            case 'fiziki_email':
            case 'vet_email':
                if (!value) { message = 'E-poçt ünvanı daxil edilməlidir'; isValid = false; }
                else if (!utils.validateEmail(value)) { message = 'Düzgün e-poçt ünvanı daxil edin'; isValid = false; }
                break;

            case 'phone_number':
                if (!value) { message = 'Telefon nömrəsi daxil edilməlidir'; isValid = false; }
                else if (utils.onlyDigits(value).length !== 7) { message = 'Telefon nömrəsi 7 rəqəm olmalıdır'; isValid = false; }
                break;
            case 'fiziki_telefon':
            case 'vet_telefon':
                if (!value) { message = 'Telefon nömrəsi daxil edilməlidir'; isValid = false; }
                else if (utils.onlyDigits(value).length !== 7) { message = 'Telefon nömrəsi 7 rəqəm olmalıdır'; isValid = false; }
                break;

            case 'vet_voen':
                if (value && utils.onlyDigits(value).length !== 10) {
                    message = 'VOEN daxil edilibsə tam 10 rəqəm olmalıdır'; isValid = false;
                }
                break;

            case 'vet_fin_code':
                if (value) {
                    const cleanValue = utils.sanitizeAlphaNumeric(value);
                    if (cleanValue.length !== 7) { message = 'FIN kod daxil edilibsə 7 simvol olmalıdır'; isValid = false; }
                    else if (!/^[A-Z0-9]+$/.test(cleanValue)) { message = 'FIN kod yalnız hərf və rəqəmlərdən ibarət ola bilər'; isValid = false; }
                }
                break;

            case 'password':
            case 'fiziki_password':
            case 'vet_password':
                if (!utils.validatePassword(value).valid) { message = 'Şifrə ən az 8 simvol olmalıdır'; isValid = false; }
                break;

            case 're_password': {
                const pw = document.querySelector('#password');
                if (value !== (pw?.value || '')) { message = 'Şifrələr uyğun deyil'; isValid = false; }
                break;
            }
            case 'fiziki_re_password': {
                const pw = document.querySelector('#fiziki_password');
                if (value !== (pw?.value || '')) { message = 'Şifrələr uyğun deyil'; isValid = false; }
                break;
            }
            case 'vet_re_password': {
                const pw = document.querySelector('#vet_password');
                if (value !== (pw?.value || '')) { message = 'Şifrələr uyğun deyil'; isValid = false; }
                break;
            }

            case 'voen':
            case 'fiziki_voen':
                if (!value) { message = 'VOEN daxil edilməlidir'; isValid = false; }
                else if (utils.onlyDigits(value).length !== 10) { message = 'VOEN tam 10 rəqəm olmalıdır'; isValid = false; }
                break;

            case 'ceo_name':
            case 'ceo_lastname':
            case 'fiziki_ad':
            case 'fiziki_soyad':
            case 'vet_ad':
            case 'vet_soyad':
                if (!value) { message = 'Bu sahə doldurulmalıdır'; isValid = false; }
                break;

            case 'asan_imza':
                if (!value) { message = 'Asan İmza № daxil edilməlidir'; isValid = false; }
                else if (utils.onlyDigits(value).length !== 10) { message = 'Asan İmza № 10 rəqəm olmalıdır'; isValid = false; }
                break;
            case 'asan_id':
                if (!value) { message = 'Asan ID daxil edilməlidir'; isValid = false; }
                else if (utils.onlyDigits(value).length !== 6) { message = 'Asan ID 6 rəqəm olmalıdır'; isValid = false; }
                break;
            case 'pin1':
                if (!value) { message = 'PIN 1 daxil edilməlidir'; isValid = false; }
                else if (utils.onlyDigits(value).length !== 4) { message = 'PIN 1 4 rəqəm olmalıdır'; isValid = false; }
                break;
            case 'pin2':
                if (!value) { message = 'PIN 2 daxil edilməlidir'; isValid = false; }
                else if (utils.onlyDigits(value).length !== 5) { message = 'PIN 2 5 rəqəm olmalıdır'; isValid = false; }
                break;
            case 'puk':
                if (!value) { message = 'PUK daxil edilməlidir'; isValid = false; }
                else if (utils.onlyDigits(value).length !== 8) { message = 'PUK 8 rəqəm olmalıdır'; isValid = false; }
                break;

            case 'finkod': {
                const finType = document.querySelector('#fin_type');
                const selectedType = finType ? finType.value : 'FIN';
                const finErrorEl = document.querySelector('#fin-error');
                const cleanValue = utils.sanitizeAlphaNumeric(value);
                const lenMap = { FIN: 7, MYI: 6, DYI: 5 };
                const expectedLength = lenMap[selectedType] || 7;
                if (!value) {
                    message = 'Kod daxil edilməlidir'; isValid = false;
                    if (finErrorEl) finErrorEl.textContent = message;
                } else if (cleanValue.length !== expectedLength) {
                    message = `${selectedType} kod tam ${expectedLength} simvol olmalıdır`; isValid = false;
                    if (finErrorEl) finErrorEl.textContent = message;
                } else if (!/^[A-Z0-9]+$/.test(cleanValue)) {
                    message = 'Kod yalnız hərf və rəqəmlərdən ibarət ola bilər'; isValid = false;
                    if (finErrorEl) finErrorEl.textContent = message;
                }
                break;
            }

            case 'terms':
                if (!field.checked) { message = 'İstifadəçi razılaşmasını qəbul etməlisiniz'; isValid = false; }
                break;

            default:
                if (field.required && !value) { message = 'Bu sahə doldurulmalıdır'; isValid = false; }
                break;
        }

        if (isValid) ui.hideFieldError(field);
        else ui.showFieldError(field, message);
        return isValid;
    },

    validateForm() {
        if (!DOM.form) return false;
        const userType = state.currentUserType;
        const activeSectionId = `section-${userType}`;
        const activeSection = document.getElementById(activeSectionId);
        let isValid = true;

        if (activeSection) {
            activeSection.querySelectorAll('input[required], select[required]').forEach(field => {
                if (field.disabled) return;
                if (!this.validateField(field)) isValid = false;
            });
        } else {
            DOM.form.querySelectorAll('[required]').forEach(field => {
                if (field.disabled) return;
                if (!this.validateField(field)) isValid = false;
            });
        }

        if (userType === 'sirket') {
            const asanRadio = document.getElementById('reg_type_asan');
            const isAsanMode = asanRadio ? asanRadio.checked : true;
            if (isAsanMode) {
                ['asan_imza', 'asan_id', 'pin1', 'pin2', 'puk'].forEach(id => {
                    const field = document.getElementById(id);
                    if (field && !field.disabled && !this.validateField(field)) isValid = false;
                });
            }
            const pw = document.querySelector('#password');
            const rpw = document.querySelector('#re_password');
            if (pw && rpw && pw.value !== rpw.value) {
                ui.showFieldError(rpw, 'Şifrələr uyğun deyil'); isValid = false;
            }
        }

        if (userType === 'fiziki') {
            const pw = document.querySelector('#fiziki_password');
            const rpw = document.querySelector('#fiziki_re_password');
            if (pw && rpw && pw.value !== rpw.value) {
                ui.showFieldError(rpw, 'Şifrələr uyğun deyil'); isValid = false;
            }
        }

        if (userType === 'vetendas') {
            const pw = document.querySelector('#vet_password');
            const rpw = document.querySelector('#vet_re_password');
            if (pw && rpw && pw.value !== rpw.value) {
                ui.showFieldError(rpw, 'Şifrələr uyğun deyil'); isValid = false;
            }
        }

        if (isValid) ui.updateStep(3);
        else ui.updateStep(1);
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
            ui.showCompanyNameDisplay({ company_name: error.status === 404 ? 'Şirkət tapılmadı' : 'Xəta' }, false);
            ui.setStatus('error', 'Bu kodla şirkət tapılmadı. Kodu yoxlayın və ya boş buraxın.', 3000);
            return false;
        } finally {
            ui.hideLoading('#verify-company-code');
        }
    },

    async validateVoen(voen) {
        const digits = utils.onlyDigits(voen);
        if (digits.length !== 10) { ui.setStatus('error', 'VOEN 10 rəqəm olmalıdır', 3000); return false; }
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

// ── FORM DATA ────────────────────────────────────────────────────────────────
const formData = {
    getValue: (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ''; },

    async getClientIP() {
        try {
            const r = await fetch('https://api.ipify.org?format=json');
            const d = await r.json();
            return d.ip || '0.0.0.0';
        } catch {
            try {
                const r2 = await fetch('https://api64.ipify.org?format=json');
                const d2 = await r2.json();
                return d2.ip || '0.0.0.0';
            } catch { return '0.0.0.0'; }
        }
    },

    collectSirket() {
        const v = this.getValue.bind(this);
        const isAsan = document.getElementById('reg_type_asan')?.checked ?? true;

        return {
            user_type:         'sirket',
            registration_type: isAsan ? 'asan' : 'simple',
            company_name:      v('company_name'),
            voen:              utils.onlyDigits(v('voen')),
            fealiyyet_sahesi:  v('fealiyyet_sahesi_sirket'),
            ceo_name:          v('ceo_name'),
            ceo_lastname:      v('ceo_lastname'),
            ceo_email:         v('email'),
            ceo_phone:         utils.formatPhone(v('phone_prefix'), v('phone_number')),
            ceo_password:      v('password'),
            fin_type:          v('fin_type'),
            fin_code:          utils.sanitizeAlphaNumeric(v('finkod')),
            asan_imza_number:  isAsan ? utils.onlyDigits(v('asan_imza')).slice(0, 10) : '',
            asan_id:           isAsan ? utils.sanitizeAlphaNumeric(v('asan_id')).slice(0, 6) : '',
            pin1:              isAsan ? utils.onlyDigits(v('pin1')).slice(0, 4) : '',
            pin2:              isAsan ? utils.onlyDigits(v('pin2')).slice(0, 5) : '',
            puk:               isAsan ? utils.onlyDigits(v('puk')).slice(0, 8) : '',
            parent_company_code: state.isCompanyVerified ? state.parentCompanyCode : null,
            registration_ip:   '0.0.0.0',

            // ✅ e-taxes məlumatları — frontend-də görünmür, DB-yə yazılır
            taxpayer_info: state.voenData || null
        };
    },

    collectFiziki() {
        const v = this.getValue.bind(this);
        return {
            user_type:        'fiziki',
            ad:               v('fiziki_ad'),
            soyad:            v('fiziki_soyad'),
            voen:             utils.onlyDigits(v('fiziki_voen')),
            fealiyyet_sahesi: v('fiziki_fealiyyet'),
            phone:            utils.formatPhone(v('fiziki_phone_prefix'), v('fiziki_telefon')),
            email:            v('fiziki_email'),
            password:         v('fiziki_password'),
            registration_ip:  '0.0.0.0',
            taxpayer_info:    state.voenData || null
        };
    },

    collectVetendas() {
        const v = this.getValue.bind(this);
        const voenValue    = v('vet_voen');
        const finCodeValue = v('vet_fin_code');
        return {
            user_type:        'vetendas',
            ad:               v('vet_ad'),
            soyad:            v('vet_soyad'),
            fealiyyet_sahesi: v('vet_fealiyyet'),
            phone:            utils.formatPhone(v('vet_phone_prefix'), v('vet_telefon')),
            email:            v('vet_email'),
            password:         v('vet_password'),
            voen:             voenValue    ? utils.onlyDigits(voenValue)             : null,
            fin_code:         finCodeValue ? utils.sanitizeAlphaNumeric(finCodeValue): null,
            registration_ip:  '0.0.0.0'
        };
    },

    collect() {
        const t = state.currentUserType;
        if (t === 'fiziki')   return this.collectFiziki();
        if (t === 'vetendas') return this.collectVetendas();
        return this.collectSirket();
    },

    generatePreview() {
        const data = this.collectSirket();
        return `
        <div class="preview-section">
            <h4><i class="fas fa-building"></i> Şirkət Məlumatları</h4>
            <div class="preview-grid">
                <div class="preview-item"><strong>Şirkət Adı:</strong> ${data.company_name || '-'}</div>
                <div class="preview-item"><strong>VOEN:</strong> ${data.voen || '-'}</div>
                <div class="preview-item"><strong>FIN Kod:</strong> ${data.fin_code || '-'}</div>
                ${state.isCompanyVerified ? `
                    <div class="preview-item highlight">
                        <strong>🏢 Ana Şirkət:</strong> ${state.verifiedCompanyData?.company_name || state.parentCompanyCode}
                        <br><small>Bu şirkətin listinə əlavə olunacaqsınız</small>
                    </div>` : `
                    <div class="preview-item"><strong>Ana Şirkət:</strong> <em>Müstəqil şirkət</em></div>`}
            </div>
        </div>
        <div class="preview-section">
            <h4><i class="fas fa-user-tie"></i> Rəhbər Məlumatları</h4>
            <div class="preview-grid">
                <div class="preview-item"><strong>Ad:</strong> ${data.ceo_name || '-'}</div>
                <div class="preview-item"><strong>Soyad:</strong> ${data.ceo_lastname || '-'}</div>
                <div class="preview-item"><strong>E-poçt:</strong> ${data.ceo_email || '-'}</div>
                <div class="preview-item"><strong>Telefon:</strong> ${data.ceo_phone || '-'}</div>
            </div>
        </div>
        ${data.asan_imza_number ? `
            <div class="preview-section">
                <h4><i class="fas fa-signature"></i> Asan İmza</h4>
                <div class="preview-grid">
                    <div class="preview-item"><strong>Asan İmza №:</strong> ${data.asan_imza_number}</div>
                    ${data.asan_id ? `<div class="preview-item"><strong>Asan ID:</strong> ${data.asan_id}</div>` : ''}
                    ${data.pin1   ? `<div class="preview-item"><strong>PIN 1:</strong> ••••</div>` : ''}
                    ${data.pin2   ? `<div class="preview-item"><strong>PIN 2:</strong> •••••</div>` : ''}
                    ${data.puk    ? `<div class="preview-item"><strong>PUK:</strong> ••••••••</div>` : ''}
                </div>
            </div>` : ''}
        <div class="preview-note">
            <i class="fas fa-info-circle"></i> Məlumatları diqqətlə yoxlayın. Göndərdikdən sonra dəyişiklik mümkün olmaya bilər.
        </div>`;
    }
};

// ── VOEN AUTO-LOOKUP (e-taxes.gov.az) ────────────────────────────────────────

function setupVoenAutoLookup() {
    const voenInputs = [
        { id: 'voen',        section: 'sirket' },
        { id: 'fiziki_voen', section: 'fiziki' }
    ];

    voenInputs.forEach(({ id, section }) => {
        const input = document.getElementById(id);
        if (!input) return;

        const debouncedLookup = utils.debounce(async (voen) => {
            if (utils.onlyDigits(voen).length !== 10) {
                // 10 rəqəmdən az — overlay-i gizlət, formanı açıq saxla
                const overlay = getOrCreateVoenOverlay(section);
                overlay.hide();
                setFormInteractive(section, true);
                return;
            }
            await voenAutoFill(voen, section);
        }, CONFIG.DEBOUNCE_DELAY);

        input.addEventListener('input', () => debouncedLookup(input.value));
    });
}

async function voenAutoFill(voen, section) {
    const digits  = utils.onlyDigits(voen);
    const overlay = getOrCreateVoenOverlay(section);

    overlay.show('loading');
    setFormInteractive(section, false);

    try {
        const res = await fetch(`${CONFIG.API_BASE}/api/v1/taxpayer/lookup`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ tin: digits })
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const tp   = data?.taxpayers?.[0];
        if (!tp)  throw new Error('Vergi ödəyicisi tapılmadı');

        // Sahələri doldur
        fillVoenFields(tp, section);

        // Riskli yoxlama
        const isRisky = tp.riskyPayer === true ||
                        tp.legalTaxpayerStatus?.riskyTaxpayer === true;

        overlay.show(isRisky ? 'risky' : 'safe', tp);
        // Risklidirşə formanı blokda saxla, deyilsə aç
        setFormInteractive(section, !isRisky);

    } catch (err) {
        console.error('❌ VOEN lookup xəta:', err);
        overlay.show('error', null, err.message || 'VOEN məlumatı əldə edilə bilmədi');
        setFormInteractive(section, true);
    }
}

function fillVoenFields(tp, section) {
    const ls  = tp.legalTaxpayerStatus || {};

    // ✅ Şirkət adını təmizlə - dırnaq və hüquqi formanı sil
    function cleanCompanyName(name) {
        if (!name) return '';
        return name
            .replace(/["""«»]/g, '')           // bütün dırnaq növlərini sil
            .replace(/\s*Məhdud\s+Məsuliyyətli\s+Cəmiyyəti\s*/gi, '')
            .replace(/\s*MƏhdud\s+MƏsuliyyƏtli\s+CƏmiyyƏti\s*/gi, '')
            .replace(/\s*MƏHDUD\s+MƏSULİYYƏTLİ\s+CƏMİYYƏTİ\s*/gi, '')
            .replace(/\s*MMC\s*/gi, '')
            .replace(/\s*SC\s*/gi, '')
            .replace(/\s*ASC\s*/gi, '')
            .replace(/\s*QSC\s*/gi, '')
            .trim();
    }

    // Şirkət adı
    const nameEl = document.getElementById('company_name');
    if (nameEl && tp.name) {
        nameEl.value = cleanCompanyName(tp.name);
        nameEl.dispatchEvent(new Event('input'));
    }


    // Rəhbər adı / soyadı (yalnız şirkət bölməsində, boşdursa)
    if (ls.legitimate && section === 'sirket') {
        const parts   = ls.legitimate.trim().split(' ');
        const nameEl2 = document.getElementById('ceo_name');
        const lastEl  = document.getElementById('ceo_lastname');
        if (nameEl2 && !nameEl2.value) nameEl2.value = parts[0] || '';
        if (lastEl  && !lastEl.value)  lastEl.value  = parts[1] || '';
    }

    // Fəaliyyət sahəsi → təşkilat tipi (boşdursa)
    const orgType = tp.organizationType || ls.legalForm?.name?.az || '';
    const fsId    = section === 'sirket' ? 'fealiyyet_sahesi_sirket' : 'fiziki_fealiyyet';
    const fsEl    = document.getElementById(fsId);
    if (fsEl && !fsEl.value && orgType) fsEl.value = orgType;

    // Bütün e-taxes məlumatlarını state-ə yaz (DB üçün payload-a əlavə edilir)
    state.voenData = {
        tin:              tp.tin,
        name:             tp.name,
        type:             tp.type,
        active:           tp.active,
        vatPayer:         tp.vatPayer,
        riskyPayer:       tp.riskyPayer,
        debt:             tp.debt,
        taxAuthority:     tp.taxOrganizationName,
        organizationType: tp.organizationType,
        legalAddress:     ls.legalAddress     || null,
        legitimate:       ls.legitimate       || null,
        voenRegisteredAt: ls.voenRegisteredAt || null,
        taxpayerStatus:   ls.taxpayerStatus?.name?.az || null,
        charterCapital:   ls.charterCapital   || null
    };
    console.log('✅ VOEN state.voenData:', state.voenData);
}

function setFormInteractive(section, enabled) {
    const sec = document.getElementById('section-' + section);
    if (!sec) return;
    const voenId = section === 'sirket' ? 'voen' : 'fiziki_voen';

    sec.querySelectorAll('input, select, button, textarea').forEach(el => {
        if (el.id === voenId) return; // VOEN inputunu həmişə aktiv saxla
        el.style.pointerEvents = enabled ? '' : 'none';
        el.style.opacity       = enabled ? '' : '0.45';
    });

    // Submit düyməsini də idarə et
    const submitBtn = document.querySelector('[data-owner-submit]');
    if (submitBtn) submitBtn.disabled = !enabled;
}

// ── VOEN OVERLAY (yükləmə + nəticə bildirişi) ────────────────────────────────
function getOrCreateVoenOverlay(section) {
    const containerId = 'voen-overlay-' + section;
    let el = document.getElementById(containerId);

    if (!el) {
        el = document.createElement('div');
        el.id = containerId;
        el.style.cssText = 'margin: 10px 0 16px; display: none;';

        // VOEN input-unun closest .field-ından sonraya yerləşdir
        const voenId    = section === 'sirket' ? 'voen' : 'fiziki_voen';
        const voenInput = document.getElementById(voenId);
        const fieldDiv  = voenInput?.closest('.field');
        if (fieldDiv) fieldDiv.insertAdjacentElement('afterend', el);
    }

    return {
        show(type, tp, errMsg) {
            el.style.display = 'block';
            el.className     = '';

            if (type === 'loading') {
                el.innerHTML = `
                    <div class="voen-status voen-loading">
                        <span class="voen-spinner"></span>
                        <span>VOEN yoxlanılır, məlumatlar gətirilir...</span>
                    </div>`;
            } else if (type === 'safe') {
                el.innerHTML = `
                    <div class="voen-status voen-safe">
                        <span class="voen-icon voen-icon-safe">✓</span>
                        <div class="voen-text">
                            <strong>Riskli vergi ödəyicisi deyildir</strong>
                            <span>${tp?.name || ''}</span>
                            ${tp?.taxOrganizationName ? `<span class="voen-meta">${tp.taxOrganizationName}</span>` : ''}
                        </div>
                    </div>`;
            } else if (type === 'risky') {
                el.innerHTML = `
                    <div class="voen-status voen-risky">
                        <span class="voen-icon voen-icon-risky">⚠</span>
                        <div class="voen-text">
                            <strong>Siz riskli vergi ödəyicisiniz</strong>
                            <span>Qarşı tərəf şirkətin cavabını gözləyin</span>
                            ${tp?.name ? `<span class="voen-meta">${tp.name}</span>` : ''}
                        </div>
                    </div>`;
            } else {
                el.innerHTML = `
                    <div class="voen-status voen-error">
                        <span class="voen-icon">✕</span>
                        <div class="voen-text">
                            <strong>VOEN tapılmadı</strong>
                            <span>${errMsg || 'Məlumat əldə edilə bilmədi'}</span>
                        </div>
                    </div>`;
            }
        },
        hide() {
            el.style.display = 'none';
            el.innerHTML     = '';
        }
    };
}

// ── EVENT HANDLERS ───────────────────────────────────────────────────────────
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
                if (DOM.companyCodeInput.value.trim()) validation.validateCompanyCode(DOM.companyCodeInput.value);
            });
        }

        if (DOM.verifyCompanyBtn) {
            DOM.verifyCompanyBtn.addEventListener('click', () => {
                const code = DOM.companyCodeInput ? DOM.companyCodeInput.value : '';
                if (code.trim()) validation.validateCompanyCode(code);
                else ui.setStatus('error', 'Zəhmət olmasa şirkət kodu daxil edin', 3000);
            });
        }

        if (DOM.validateVoenBtn) {
            DOM.validateVoenBtn.addEventListener('click', () => {
                const voenInput = document.querySelector('#voen');
                if (voenInput?.value.trim()) validation.validateVoen(voenInput.value);
                else ui.setStatus('error', 'Zəhmət olmasa VOEN daxil edin', 3000);
            });
        }

        if (DOM.btnPreview) {
            DOM.btnPreview.addEventListener('click', this.showPreview.bind(this));
        }

        document.querySelectorAll('.btn-close, #btn-close-preview').forEach(btn => {
            btn.addEventListener('click', () => ui.hideModal(DOM.previewModal));
        });

        if (DOM.previewModal) {
            DOM.previewModal.addEventListener('click', (e) => {
                if (e.target === DOM.previewModal) ui.hideModal(DOM.previewModal);
            });
        }

        const submitFromPreviewBtn = document.querySelector('#btn-submit-from-preview');
        if (submitFromPreviewBtn) {
            submitFromPreviewBtn.addEventListener('click', () => {
                ui.hideModal(DOM.previewModal);
                if (DOM.form) DOM.form.dispatchEvent(new Event('submit'));
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
        const data     = formData.collect();
        const userType = state.currentUserType;

        try {
            ui.showLoading('[data-owner-submit]');
            ui.setStatus('info', 'Qeydiyyat göndərilir...', 0);

            // IP al
            try {
                const ipResponse = await fetch('https://api.ipify.org?format=json');
                const ipData     = await ipResponse.json();
                data.registration_ip = ipData.ip;
            } catch { data.registration_ip = '0.0.0.0'; }

            let response;
            if      (userType === 'fiziki')   response = await api.registerFiziki(data);
            else if (userType === 'vetendas') response = await api.registerVetendas(data);
            else                              response = await api.registerCompany(data);

            let successMessage = response?.message || '✅ Qeydiyyat uğurla tamamlandı!';

            if (userType === 'sirket') {
                if (state.isCompanyVerified && data.parent_company_code) {
                    successMessage = response.message || `✅ Şirkətiniz uğurla yaradıldı!`;
                } else {
                    successMessage = response?.message || '✅ Müstəqil şirkət olaraq qeydiyyat tamamlandı!';
                }
            } else if (userType === 'fiziki') {
                successMessage = response?.message || '✅ Fiziki şəxs qeydiyyatı tamamlandı!';
            } else if (userType === 'vetendas') {
                successMessage = response?.message || '✅ Qeydiyyatınız tamamlandı!';
            }

            // Telegram
            if (response?.telegram?.requires_telegram_verification) {
                successMessage = response.telegram.telegram_message || successMessage;
                if (response.telegram.telegram_bot_link) {
                    const telegramInfo = document.querySelector('#telegram-info');
                    if (telegramInfo) {
                        telegramInfo.style.display = 'block';
                        telegramInfo.innerHTML = `
                        <div class="telegram-section">
                            <h5><i class="fab fa-telegram"></i> Telegram Bot</h5>
                            <p>Qeydiyyatı tamamlamaq üçün Telegram botuna qoşulun:</p>
                            <a href="${response.telegram.telegram_bot_link}" target="_blank" class="telegram-link">
                                <i class="fab fa-telegram"></i> Bot-a qoşul
                            </a>
                            <p class="small-text"><i class="fas fa-info-circle"></i> Bot-a qoşulduqdan sonra <code>/start</code> yazın</p>
                        </div>`;
                    }
                }
            }

            ui.setStatus('success', successMessage);
            ui.updateProgressBar(100);

            const redirectUrl = DOM.form?.getAttribute('data-success-redirect') || 'login.html';
            setTimeout(() => { window.location.href = redirectUrl; }, 5000);

        } catch (error) {
            console.error('❌ Qeydiyyat xətası:', error);
            let errorMessage = 'Qeydiyyat zamanı xəta baş verdi';
            let errorType    = 'error';

            if (error.status === 400) {
                errorMessage = 'Yanlış məlumat daxil edilib. Zəhmət olmasa bütün sahələri yoxlayın.';
                errorType = 'warning';
            } else if (error.status === 404) {
                errorMessage = 'Serverə qoşula bilmədim. İnternet əlaqənizi yoxlayın.';
            } else if (error.status === 409) {
                errorMessage = 'Bu e-poçt, VOEN və ya FIN kod artıq qeydiyyatdan keçib.';
            } else if (error.status === 422) {
                errorMessage = 'Məlumatlar düzgün deyil. Bütün tələb olunan sahələri doldurun.';
                if (error.data?.detail) {
                    errorMessage += '\n\nXəta detalları:\n' + (
                        Array.isArray(error.data.detail)
                            ? error.data.detail.map(d => `• ${d.msg}`).join('\n')
                            : error.data.detail
                    );
                }
            } else if (error.status === 500) {
                errorMessage = 'Server xətası. Zəhmət olmasa bir az sonra yenidən cəhd edin.';
            } else if (error.message?.includes('NetworkError')) {
                errorMessage = 'İnternet əlaqəsi yoxdur.';
            } else if (error.message) {
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
        if (DOM.previewContent) DOM.previewContent.innerHTML = formData.generatePreview();
        ui.showModal(DOM.previewModal);
        ui.updateStep(2);
    },

    setupRealTimeValidation() {
        if (!DOM.form) return;
        DOM.form.querySelectorAll('input, select, textarea').forEach(input => {
            input.addEventListener('blur',   () => validation.validateField(input));
            input.addEventListener('input',  () => { ui.hideFieldError(input); if (input.value.trim() !== '') validation.validateField(input); });
            input.addEventListener('change', () => validation.validateField(input));
        });
    },

    setupPasswordStrength() {
        const passwordInput = document.querySelector('#password');
        if (passwordInput) {
            passwordInput.addEventListener('input', (e) => {
                ui.updatePasswordStrength(e.target.value);
                const rp = document.querySelector('#re_password');
                if (rp?.value) validation.validateField(rp);
            });
        }

        const fizikiPw = document.querySelector('#fiziki_password');
        if (fizikiPw) {
            fizikiPw.addEventListener('input', function () {
                const sc = document.querySelector('#fiziki-password-strength');
                if (!sc) return;
                const r      = utils.validatePassword(this.value);
                const labels = { weak: 'Zəif', medium: 'Orta', strong: 'Güclü' };
                sc.textContent = this.value ? `Şifrə gücü: ${labels[r.strength]}` : '';
                sc.className   = `password-strength ${r.strength}`;
            });
        }

        const vetPw = document.querySelector('#vet_password');
        if (vetPw) {
            vetPw.addEventListener('input', function () {
                const sc = document.querySelector('#vet-password-strength');
                if (!sc) return;
                const r      = utils.validatePassword(this.value);
                const labels = { weak: 'Zəif', medium: 'Orta', strong: 'Güclü' };
                sc.textContent = this.value ? `Şifrə gücü: ${labels[r.strength]}` : '';
                sc.className   = `password-strength ${r.strength}`;
            });
        }
    },

    setupPasswordToggle() {
        document.querySelectorAll('.toggle-password').forEach(button => {
            button.addEventListener('click', function () {
                const input = document.getElementById(this.getAttribute('data-target'));
                if (!input) return;
                const icon = this.querySelector('i');
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.classList.replace('fa-eye', 'fa-eye-slash');
                } else {
                    input.type = 'password';
                    icon.classList.replace('fa-eye-slash', 'fa-eye');
                }
                input.focus();
            });
        });
    },

    setupInputFormatting() {
        // Yalnız rəqəm sahələri
        document.querySelectorAll('[data-digit-length]').forEach(input => {
            input.addEventListener('input', function () {
                const max  = parseInt(this.getAttribute('data-digit-length')) || 999;
                this.value = utils.onlyDigits(this.value).slice(0, max);
            });
        });

        // Şirkət kodu formatı
        if (DOM.companyCodeInput) {
            DOM.companyCodeInput.addEventListener('input', function () {
                this.value = this.value.replace(/[^A-Za-z0-9\-]/g, '').toUpperCase();
            });
        }

        // FIN kod
        const finInput = document.querySelector('#finkod');
        const finType  = document.querySelector('#fin_type');
        const finError = document.querySelector('#fin-error');

        if (finInput && finType) {
            const updateFin = () => {
                const lenMap = { FIN: 7, MYI: 6, DYI: 5 };
                const phMap  = { FIN: '7 simvol (AB123CD)', MYI: '6 simvol (F43H34)', DYI: '5 simvol (5DF4D)' };
                const type   = finType.value;
                finInput.maxLength   = lenMap[type] || 7;
                finInput.placeholder = phMap[type]  || 'Kod daxil edin';
                finInput.pattern     = `[A-Z0-9]{${lenMap[type] || 7}}`;
                if (finError) finError.style.display = 'none';
                finInput.value = '';
            };
            finType.addEventListener('change', () => { updateFin(); finInput.focus(); });
            finInput.addEventListener('input', function () {
                const max  = { FIN: 7, MYI: 6, DYI: 5 }[finType.value] || 7;
                this.value = utils.sanitizeAlphaNumeric(this.value).slice(0, max);
            });
            finInput.addEventListener('blur', function () { validation.validateField(this); });
            updateFin();
        }

        // Telefon sahələri XXX-XX-XX formatı
        ['phone_number', 'fiziki_telefon', 'vet_telefon'].forEach(id => {
            const input = document.getElementById(id);
            if (!input) return;
            input.addEventListener('input', function () {
                const d = utils.onlyDigits(this.value);
                let f   = d.slice(0, 3);
                if (d.length > 3) f += '-' + d.slice(3, 5);
                if (d.length > 5) f += '-' + d.slice(5, 7);
                this.value = f;
            });
        });

        // Asan İmza sahələri
        ['asan_imza', 'asan_id', 'pin1', 'pin2', 'puk'].forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('input', function () {
                    const max  = parseInt(this.getAttribute('data-digit-length') || '999');
                    this.value = utils.onlyDigits(this.value).slice(0, max);
                });
            }
        });

        // ── VOEN avtomatik axtarış ──────────────────────────────────────────
        setupVoenAutoLookup();
    },

    setupProgressTracking() {
        if (!DOM.form) return;
        const updateProgress = () => {
            const requiredFields = DOM.form.querySelectorAll('[required]');
            if (!requiredFields.length) return;
            const filled = Array.from(requiredFields).filter(f => {
                if (f.type === 'checkbox')   return f.checked;
                if (f.type === 'select-one') return f.value !== '';
                return f.value.trim() !== '';
            }).length;
            ui.updateProgressBar(Math.round((filled / requiredFields.length) * 100));
        };
        DOM.form.querySelectorAll('input, select, textarea').forEach(f => {
            f.addEventListener('input',  updateProgress);
            f.addEventListener('change', updateProgress);
        });
        setTimeout(updateProgress, 100);
    },

    setupTermsValidation() {
        const terms = document.querySelector('#terms');
        if (terms) terms.addEventListener('change', function () { validation.validateField(this); });
    }
};

// ── ASAN İMZA TOGGLE ─────────────────────────────────────────────────────────
function setupRegistrationTypeToggle() {
    const asanRadio   = document.getElementById('reg_type_asan');
    const simpleRadio = document.getElementById('reg_type_simple');
    const asanSection = document.getElementById('asan-imza-section');
    const asanFields  = ['asan_imza', 'asan_id', 'pin1', 'pin2', 'puk'];

    if (!asanRadio || !simpleRadio || !asanSection) return;

    function toggleAsanFields(isAsan) {
        asanSection.classList.toggle('disabled', !isAsan);
        asanFields.forEach(id => {
            const field = document.getElementById(id);
            if (!field) return;
            if (isAsan) {
                field.setAttribute('required', 'required');
                field.removeAttribute('disabled');
            } else {
                field.removeAttribute('required');
                field.setAttribute('disabled', 'disabled');
                ui.hideFieldError(field);
            }
        });
        const asanNote = document.getElementById('asan-note');
        if (asanNote) {
            asanNote.innerHTML = isAsan
                ? '<i class="fas fa-info-circle"></i> Asan İmza məlumatları <strong>məcburidir</strong>.'
                : '<i class="fas fa-check-circle"></i> Sadə qeydiyyat — Asan İmza <strong>tələb olunmur</strong>.';
        }
    }

    asanRadio.addEventListener('change',   function () { if (this.checked) toggleAsanFields(true);  });
    simpleRadio.addEventListener('change', function () { if (this.checked) toggleAsanFields(false); });
    toggleAsanFields(true);
}


// ── USER TYPE SWITCH ──────────────────────────────────────────────────────────
function setupUserTypeSwitch() {
    const radios = document.querySelectorAll('input[name="reg_user_type"]');
    const cards  = document.querySelectorAll('.reg-type-card');

    function switchTo(type) {
        state.currentUserType = type;

        cards.forEach(c => {
            const r = c.querySelector('input[type="radio"]');
            c.classList.toggle('active', r?.value === type);
        });

        ['sirket', 'fiziki', 'vetendas'].forEach(t => {
            const sec = document.getElementById(`section-${t}`);
            if (!sec) return;
            const isActive = t === type;
            sec.classList.toggle('visible', isActive);

            sec.querySelectorAll('input, select').forEach(f => {
                if (isActive) {
                    if (f.getAttribute('data-was-required')) {
                        f.setAttribute('required', 'required');
                        f.removeAttribute('data-was-required');
                    }
                } else {
                    if (f.hasAttribute('required')) {
                        f.setAttribute('data-was-required', '1');
                        f.removeAttribute('required');
                    }
                }
            });

            // Aktiv olmayan bölmənin overlay-lərini gizlət
            if (!isActive) {
                const overlay = document.getElementById('voen-overlay-' + t);
                if (overlay) { overlay.style.display = 'none'; overlay.innerHTML = ''; }
                setFormInteractive(t, true);
            }
        });

        state.voenData = null;
        ui.clearStatus();
    }

    radios.forEach(r => r.addEventListener('change', () => switchTo(r.value)));
    cards.forEach(c => c.addEventListener('click', () => {
        const r = c.querySelector('input[type="radio"]');
        if (r) { r.checked = true; switchTo(r.value); }
    }));

    switchTo('sirket');
}

// ── INIT ──────────────────────────────────────────────────────────────────────
function init() {
    console.log('🚀 Initializing registration page...');

    const loader = document.getElementById('gti-loader');
    if (loader) {
        loader.style.display = 'none';
        setTimeout(() => { try { loader.parentNode?.removeChild(loader); } catch (e) {} }, 500);
    }
    document.body.classList.remove('loader-active');
    document.body.classList.add('loaded');
    document.body.style.opacity = '1';
    const shell = document.getElementById('site-shell');
    if (shell) { shell.style.opacity = '1'; shell.style.pointerEvents = 'auto'; }

    events.init();
    setupRegistrationTypeToggle();
    setupUserTypeSwitch();
    ui.updateStep(1);

    setTimeout(() => { if (DOM.progressBar) DOM.progressBar.style.width = '0%'; }, 100);

    console.log('✅ Registration page initialized successfully');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    setTimeout(init, 0);
}

window.addEventListener('load', () => {
    setTimeout(() => {
        const l = document.getElementById('gti-loader');
        if (l) l.style.display = 'none';
    }, 1000);
});

// ── GLOBAL ERROR HANDLING ────────────────────────────────────────────────────
window.addEventListener('error', function (e) {
    console.error('Global error caught:', e.error);
    const loader = document.getElementById('gti-loader');
    if (loader) loader.style.display = 'none';
    return false;
});
window.addEventListener('unhandledrejection', function (e) {
    console.error('Unhandled promise rejection:', e.reason);
});
// ===========================================
// TOKEN İŞLƏMƏSİ (Dəvət linki ilə gələnlər üçün)
// ===========================================

document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (token) {
        console.log('🔑 Token tapıldı:', token);

        // Token-i yoxla
        fetch(`/proxy.php/api/v1/invitations/verify/${token}`)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then(data => {
                console.log('📥 Token cavabı:', data);

                if (data.valid) {
                    // 1. Company kodunu gizli input-a yaz
                    const companyCodeInput = document.getElementById('company_code');
                    if (companyCodeInput) {
                        companyCodeInput.value = data.company_code;
                        companyCodeInput.disabled = true;
                        companyCodeInput.style.backgroundColor = '#f3f4f6';
                        companyCodeInput.style.color = '#1f2937';
                        console.log('✅ Company code dolduruldu:', data.company_code);
                    }

                    // 2. Şirkət adını göstər
                    const companyNameDisplay = document.getElementById('verifiedCompanyName');
                    if (companyNameDisplay && data.company_name) {
                        companyNameDisplay.textContent = data.company_name;
                        companyNameDisplay.style.display = 'block';
                    }

                    // 3. Token-i formaya əlavə et (gizli input)
                    let tokenInput = document.querySelector('input[name="invitation_token"]');
                    if (!tokenInput) {
                        tokenInput = document.createElement('input');
                        tokenInput.type = 'hidden';
                        tokenInput.name = 'invitation_token';
                        tokenInput.value = token;
                        const form = document.querySelector('[data-owner-registration]') || document.querySelector('form');
                        if (form) form.appendChild(tokenInput);
                        console.log('✅ Token formaya əlavə edildi');
                    }

                    // 4. İstifadəçiyə məlumat göstər
                    const form = document.querySelector('[data-owner-registration]') || document.querySelector('form');
                    if (form) {
                        // Əvvəlki mesajı sil
                        const oldMsg = document.querySelector('.invitation-info');
                        if (oldMsg) oldMsg.remove();

                        const infoDiv = document.createElement('div');
                        infoDiv.className = 'invitation-info alert alert-success';
                        infoDiv.style.cssText = `
                            margin-bottom: 20px;
                            padding: 16px 20px;
                            background: #d1fae5;
                            border: 1px solid #10b981;
                            border-radius: 12px;
                            color: #065f46;
                        `;
                        infoDiv.innerHTML = `
                            <div style="display: flex; align-items: flex-start; gap: 12px;">
                                <i class="fas fa-check-circle" style="color: #10b981; font-size: 24px; margin-top: 2px;"></i>
                                <div>
                                    <strong style="font-size: 16px;">Dəvət linki ilə qeydiyyat</strong>
                                    <p style="margin: 4px 0 0 0; font-size: 14px;">
                                        <strong>${data.company_name || 'Şirkət'}</strong> - alt şirkət kimi qeydiyyatdan keçirsiniz
                                    </p>
                                    <p style="margin: 4px 0 0 0; font-size: 13px; color: #065f46;">
                                        <i class="fas fa-info-circle"></i> Şirkət kodu avtomatik dolduruldu və dəyişdirilə bilməz
                                    </p>
                                </div>
                            </div>
                        `;
                        form.insertBefore(infoDiv, form.firstChild);
                    }

                    // 5. DOM-da company_code inputunu tap və dəyərini yenilə
                    const allCompanyCodeInputs = document.querySelectorAll('#company_code, [name="company_code"]');
                    allCompanyCodeInputs.forEach(input => {
                        input.value = data.company_code;
                        input.disabled = true;
                        input.style.backgroundColor = '#f3f4f6';
                    });

                } else {
                    // Link etibarsızdır
                    console.warn('⚠️ Etibarsız token:', data.message);
                    alert(data.message || 'Bu link etibarsızdır və ya vaxtı keçib');
                    window.location.href = '/';
                }
            })
            .catch(error => {
                console.error('❌ Token yoxlama xətası:', error);
                // Xətanı göstər amma səhifəni bağlama
                const form = document.querySelector('[data-owner-registration]') || document.querySelector('form');
                if (form) {
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'alert alert-error';
                    errorDiv.style.cssText = `
                        margin-bottom: 20px;
                        padding: 16px 20px;
                        background: #fee2e2;
                        border: 1px solid #ef4444;
                        border-radius: 12px;
                        color: #991b1b;
                    `;
                    errorDiv.innerHTML = `
                        <i class="fas fa-exclamation-circle"></i>
                        <strong>Xəta:</strong> Link yoxlanılarkən problem yarandı. Zəhmət olmasa səhifəni yeniləyin.
                    `;
                    form.insertBefore(errorDiv, form.firstChild);
                }
            });
    }
});

// ===========================================
// TOKEN İŞLƏMƏSİ - DƏVƏT LİNKİ İLƏ GƏLƏNLƏR ÜÇÜN
// ===========================================

document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const code = urlParams.get('code');  // Köhnə sistem üçün

    // ƏGƏR TOKEN VARSA - ƏSAS SİSTEM
    if (token) {
        console.log('🔑 Token tapıldı:', token);
        processInvitationToken(token);
    }
    // ƏGƏR COMPANY CODE VARSA - KÖHNƏ SİSTEM
    else if (code) {
        console.log('🏢 Company code tapıldı:', code);
        processCompanyCode(code);
    }
});

// ===========================================
// TOKEN İŞLƏMƏSİ
// ===========================================
async function processInvitationToken(token) {
    try {
        // 1. Token-i yoxla
        const response = await fetch(`/proxy.php/api/v1/invitations/verify/${token}`);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log('📥 Token cavabı:', data);

        if (data.valid) {
            // ✅ Link etibarlıdır

            // 1. Company kodunu doldur
            const companyCodeInput = document.getElementById('company_code');
            if (companyCodeInput) {
                companyCodeInput.value = data.company_code;
                companyCodeInput.disabled = true;
                companyCodeInput.style.backgroundColor = '#f3f4f6';
                companyCodeInput.style.color = '#1f2937';
                console.log('✅ Company code dolduruldu:', data.company_code);
            }

            // 2. Şirkət adını göstər
            const nameDisplay = document.getElementById('verifiedCompanyName');
            const nameDisplayContainer = document.getElementById('companyNameDisplay');

            if (nameDisplay && data.company_name) {
                nameDisplay.textContent = data.company_name;
                if (nameDisplayContainer) {
                    nameDisplayContainer.style.display = 'block';
                }
            }

            // 3. Token-i formaya əlavə et (gizli input)
            let tokenInput = document.querySelector('input[name="invitation_token"]');
            if (!tokenInput) {
                tokenInput = document.createElement('input');
                tokenInput.type = 'hidden';
                tokenInput.name = 'invitation_token';
                tokenInput.value = token;
                const form = document.querySelector('[data-owner-registration]') || document.querySelector('form');
                if (form) form.appendChild(tokenInput);
                console.log('✅ Token formaya əlavə edildi');
            }

            // 4. İstifadəçiyə məlumat göstər
            showInvitationInfo(data.company_name || data.company_code, data.expires_at);

        } else {
            // ❌ Link etibarsızdır
            console.warn('⚠️ Etibarsız token:', data.message);
            showInvitationError(data.message || 'Bu link etibarsızdır və ya vaxtı keçib');
        }

    } catch (error) {
        console.error('❌ Token yoxlama xətası:', error);
        showInvitationError('Link yoxlanılarkən xəta baş verdi. Zəhmət olmasa səhifəni yeniləyin.');
    }
}

// ===========================================
// COMPANY CODE İŞLƏMƏSİ (Köhnə sistem)
// ===========================================
async function processCompanyCode(code) {
    try {
        // Şirkət məlumatlarını gətir
        const response = await fetch(`/proxy.php/api/v1/companies/code/${encodeURIComponent(code)}`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log('📥 Şirkət məlumatları:', data);

        // Company code inputunu doldur
        const companyCodeInput = document.getElementById('company_code');
        if (companyCodeInput) {
            companyCodeInput.value = code;
            companyCodeInput.disabled = true;
            companyCodeInput.style.backgroundColor = '#f3f4f6';
        }

        // Şirkət adını göstər
        const nameDisplay = document.getElementById('verifiedCompanyName');
        if (nameDisplay && data.company_name) {
            nameDisplay.textContent = data.company_name;
            document.getElementById('companyNameDisplay').style.display = 'block';
        }

        showInvitationInfo(data.company_name || code);

    } catch (error) {
        console.error('❌ Company code xətası:', error);
        // Kod yenə də doldurulsun
        const companyCodeInput = document.getElementById('company_code');
        if (companyCodeInput) {
            companyCodeInput.value = code;
        }
        showInvitationInfo(code);
    }
}

// ===========================================
// UI KÖMƏKÇİ FUNKSİYALAR
// ===========================================
function showInvitationInfo(companyName, expiresAt) {
    const form = document.querySelector('[data-owner-registration]') || document.querySelector('form');
    if (!form) return;

    // Əvvəlki mesajı sil
    const oldMsg = document.querySelector('.invitation-info');
    if (oldMsg) oldMsg.remove();

    const expiresText = expiresAt ? `⏰ Bitmə vaxtı: ${new Date(expiresAt).toLocaleString('az-AZ')}` : '';

    const infoDiv = document.createElement('div');
    infoDiv.className = 'invitation-info';
    infoDiv.style.cssText = `
        margin-bottom: 20px;
        padding: 16px 20px;
        background: #d1fae5;
        border: 1px solid #10b981;
        border-radius: 12px;
        color: #065f46;
    `;
    infoDiv.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 12px;">
            <i class="fas fa-check-circle" style="color: #10b981; font-size: 24px; margin-top: 2px;"></i>
            <div>
                <strong style="font-size: 16px;">✅ Dəvət linki ilə qeydiyyat</strong>
                <p style="margin: 4px 0 0 0; font-size: 14px;">
                    <strong>${companyName || 'Şirkət'}</strong> - alt şirkət kimi qeydiyyatdan keçirsiniz
                </p>
                <p style="margin: 4px 0 0 0; font-size: 13px; color: #065f46;">
                    <i class="fas fa-info-circle"></i> Şirkət kodu avtomatik dolduruldu və dəyişdirilə bilməz
                </p>
                ${expiresText ? `<p style="margin: 4px 0 0 0; font-size: 13px; color: #065f46;">${expiresText}</p>` : ''}
            </div>
        </div>
    `;
    form.insertBefore(infoDiv, form.firstChild);
}

function showInvitationError(message) {
    const form = document.querySelector('[data-owner-registration]') || document.querySelector('form');
    if (!form) return;

    const oldMsg = document.querySelector('.invitation-info');
    if (oldMsg) oldMsg.remove();

    const errorDiv = document.createElement('div');
    errorDiv.className = 'invitation-info';
    errorDiv.style.cssText = `
        margin-bottom: 20px;
        padding: 16px 20px;
        background: #fee2e2;
        border: 1px solid #ef4444;
        border-radius: 12px;
        color: #991b1b;
    `;
    errorDiv.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 12px;">
            <i class="fas fa-exclamation-circle" style="color: #ef4444; font-size: 24px; margin-top: 2px;"></i>
            <div>
                <strong style="font-size: 16px;">❌ Link etibarsızdır</strong>
                <p style="margin: 4px 0 0 0; font-size: 14px;">${message}</p>
                <p style="margin: 8px 0 0 0; font-size: 13px;">
                    <a href="/" style="color: #7DB6FF; text-decoration: underline;">Ana səhifəyə qayıt</a>
                </p>
            </div>
        </div>
    `;
    form.insertBefore(errorDiv, form.firstChild);
}