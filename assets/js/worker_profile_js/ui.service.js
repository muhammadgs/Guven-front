/**
 * UI Service - İnterfeys əməliyyatları
 */

class UIService {
    constructor() {
        this.notifications = [];
    }

    populateForm(formData) {
        console.log('📝 Form doldurulur...');
        console.log('📋 Form data:', formData);

        // ƏSAS DÜZƏLİŞ: HTML ID-ləri ilə uyğunlaşdırma
        const fieldMapping = {
            // Şəxsi məlumatlar
            'firstName': formData.firstName || formData.ceo_name || '',
            'lastName': formData.lastName || formData.ceo_lastname || '',
            'fatherName': formData.fatherName || '',
            'gender': formData.gender || '',
            'birthDate': formData.birthDate || '',
            'voen': formData.voen || '',

            // ASAN məlumatları
            'asanImza': formData.asanImza || '',
            'asanId': formData.asanId || '',
            'pin1': formData.pin1 || '',
            'pin2': formData.pin2 || '',
            'puk': formData.puk || '',
            'finCode': formData.finCode || '',

            // Əlaqə məlumatları
            'email': formData.email || '',
            'phone': formData.phone || '',

            // ✅ ŞİRKƏT ADI - ƏN VACİB DÜZƏLİŞ: ID 'companyName' olduğu üçün
            'companyName': formData.company_name || formData.companyName || formData.originalData?.company_name || '',

            // Şirkət kodu
            'companyCode': formData.companyCode || formData.originalData?.company_code || '',

            // Telegram
            'telegramUsername': formData.telegramUsername || ''
        };

        // Hər bir field-i doldur
        Object.keys(fieldMapping).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                element.value = fieldMapping[key];
                console.log(`✅ ${key} dolduruldu:`, fieldMapping[key]);
            } else {
                console.warn(`⚠️ Element tapılmadı: ${key}`);
            }
        });

        // Status indikatorlarını yenilə
        this.updateStatusIndicators(formData);

        console.log('✅ Form tam dolduruldu');
    }

    // Formdan məlumatları almaq
    getFormData(formId) {
        const form = document.getElementById(formId);
        if (!form) return {};

        const formData = new FormData(form);
        const data = {};

        formData.forEach((value, key) => {
            data[key] = value;
        });

        return data;
    }

    // Status indikatorlarını yeniləmək
    updateStatusIndicators(statusData) {
        const indicators = {
            emailStatus: {
                verified: statusData.emailVerified,
                elementId: 'emailStatus'
            },
            phoneStatus: {
                verified: statusData.phoneVerified,
                elementId: 'phoneStatus'
            },
            telegramStatus: {
                verified: statusData.telegramVerified,
                elementId: 'telegramStatus'
            }
        };

        Object.keys(indicators).forEach(key => {
            const indicator = indicators[key];
            const element = document.getElementById(indicator.elementId);

            if (element) {
                if (indicator.verified) {
                    element.innerHTML = '<i class="fa-solid fa-check-circle text-green-500"></i><span class="ml-1">Təsdiqlənib</span>';
                    element.className = 'text-xs font-normal text-green-500';
                } else {
                    element.innerHTML = '<i class="fa-solid fa-times-circle text-red-500"></i><span class="ml-1">Təsdiqlənməyib</span>';
                    element.className = 'text-xs font-normal text-red-500';
                }
            }
        });
    }

    // Notification göstərmək
    showNotification(message, type = 'success', duration = 4000) {
        console.log(`📢 ${type.toUpperCase()}: ${message}`);

        // Köhnə notifikasiyaları təmizlə
        this.clearNotifications();

        // Yeni notification yarat
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 px-6 py-3 rounded-xl text-white font-semibold z-50 shadow-lg transition-all duration-300 transform translate-x-full`;

        // Tipə görə rəng
        switch (type) {
            case 'success':
                notification.classList.add('bg-green-500');
                break;
            case 'error':
                notification.classList.add('bg-red-500');
                break;
            case 'warning':
                notification.classList.add('bg-yellow-500');
                break;
            case 'info':
                notification.classList.add('bg-blue-500');
                break;
            default:
                notification.classList.add('bg-brand-blue');
        }

        notification.textContent = message;
        notification.dataset.id = Date.now();

        document.body.appendChild(notification);

        // Animasiya başlat
        requestAnimationFrame(() => {
            notification.classList.remove('translate-x-full');
        });

        // Array-ə əlavə et
        this.notifications.push(notification.dataset.id);

        // Müddətdən sonra sil
        setTimeout(() => {
            this.removeNotification(notification);
        }, duration);
    }

    // Notification silmək
    removeNotification(notification) {
        notification.classList.add('translate-x-full');

        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }

            // Array-dən sil
            const index = this.notifications.indexOf(notification.dataset.id);
            if (index > -1) {
                this.notifications.splice(index, 1);
            }
        }, 300);
    }

    // Bütün notifikasiyaları təmizləmək
    clearNotifications() {
        document.querySelectorAll('.fixed.top-4.right-4').forEach(notification => {
            this.removeNotification(notification);
        });
        this.notifications = [];
    }

    // Loading state göstərmək
    setLoading(element, isLoading) {
        if (!element) return;

        if (isLoading) {
            element.dataset.originalText = element.innerHTML;
            element.innerHTML = '<div class="loading-spinner"></div>';
            element.disabled = true;
            element.classList.add('opacity-75');
        } else {
            if (element.dataset.originalText) {
                element.innerHTML = element.dataset.originalText;
                delete element.dataset.originalText;
            }
            element.disabled = false;
            element.classList.remove('opacity-75');
        }
    }

    // Error mesajlarını göstərmək
    showFormErrors(errors, formId = 'profileForm') {
        // Köhnə error'ları təmizlə
        this.clearFormErrors(formId);

        errors.forEach(error => {
            this.showError(error.field || 'general', error.message);
        });
    }

    // Error göstərmək
    showError(fieldId, message) {
        const field = document.getElementById(fieldId);
        if (!field) return;

        // Error border əlavə et
        field.classList.add('border-red-500');

        // Error mesajı yarat
        const errorElement = document.createElement('div');
        errorElement.className = 'text-red-500 text-sm mt-1';
        errorElement.textContent = message;

        // Error mesajını əlavə et
        field.parentNode.appendChild(errorElement);

        // 5 saniyədən sonra sil
        setTimeout(() => {
            if (errorElement.parentNode) {
                errorElement.parentNode.removeChild(errorElement);
            }
            field.classList.remove('border-red-500');
        }, 5000);
    }

    // Form error'larını təmizləmək
    clearFormErrors(formId) {
        const form = document.getElementById(formId);
        if (!form) return;

        // Error border'ları sil
        form.querySelectorAll('.border-red-500').forEach(el => {
            el.classList.remove('border-red-500');
        });

        // Error mesajlarını sil
        form.querySelectorAll('.text-red-500.text-sm.mt-1').forEach(el => {
            if (el.parentNode) {
                el.parentNode.removeChild(el);
            }
        });
    }

    // Image göstərmək
    displayImage(file, containerSelector, isRound = false) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const container = document.querySelector(containerSelector);
            if (!container) return;

            // Köhnə şəkli sil
            const oldImg = container.querySelector('img');
            if (oldImg) oldImg.remove();

            // Yeni şəkli əlavə et
            const img = document.createElement('img');
            img.src = e.target.result;
            img.className = 'w-full h-full object-cover';
            img.alt = 'Uploaded image';

            if (isRound) {
                img.classList.add('rounded-full');
            } else {
                img.classList.add('rounded-xl');
            }

            container.appendChild(img);
        };
        reader.readAsDataURL(file);
    }
}

// Global export
window.UIService = UIService;