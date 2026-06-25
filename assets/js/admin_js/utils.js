// Admin Panel JavaScript - utils.js

// Tarixi formatla
function formatDate(dateString) {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('az-AZ', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return dateString;
    }
}

// İstifadəçi tipini mətnə çevir
function getUserTypeText(userType) {
    switch(userType) {
        case 'ceo': return 'CEO';
        case 'company_admin': return 'Şirkət Admini';
        case 'employee': return 'İşçi';
        case 'admin': return 'Sistem Admini';
        default: return userType;
    }
}

// Pagination quraşdır
function setupPagination(elementId, totalPages, currentPage, callback) {
    const paginationDiv = document.getElementById(elementId);
    if (!paginationDiv) return;

    paginationDiv.innerHTML = '';

    if (totalPages <= 1) return;

    // Əvvəlki səhifə
    if (currentPage > 1) {
        const prevBtn = document.createElement('button');
        prevBtn.className = 'pagination-btn';
        prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevBtn.onclick = () => callback(currentPage - 1);
        paginationDiv.appendChild(prevBtn);
    }

    // Səhifə nömrələri
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
        pageBtn.textContent = i;
        pageBtn.onclick = () => callback(i);
        paginationDiv.appendChild(pageBtn);
    }

    // Növbəti səhifə
    if (currentPage < totalPages) {
        const nextBtn = document.createElement('button');
        nextBtn.className = 'pagination-btn';
        nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextBtn.onclick = () => callback(currentPage + 1);
        paginationDiv.appendChild(nextBtn);
    }
}

// Modal funksiyaları
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
}

// Telefon nömrəsini formatla
window.formatPhoneNumber = function(phone) {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{2})(\d{2})$/);
    if (match) {
        return `+994 (${match[1]}) ${match[2]}-${match[3]}-${match[4]}`;
    }
    return phone;
};

// Status mətnini gətir
window.getStatusText = function(status) {
    switch(status) {
        case true:
        case 'active':
            return 'Aktiv';
        case false:
        case 'inactive':
            return 'Aktiv deyil';
        case 'pending':
            return 'Gözləmədə';
        case 'rejected':
            return 'Rədd edilib';
        default:
            return status;
    }
};

// Safe string function - NULL və undefined dəyərləri handle et
function safeString(value, defaultValue = '-') {
    if (value === null || value === undefined || value === '') {
        return defaultValue;
    }
    return String(value);
}




// Safe API call wrapper
window.safeApiCall = async function(url, options = {}) {
    try {
        console.log(`📡 API Call: ${url}`);

        const token = localStorage.getItem('guven_token') || localStorage.getItem('admin_token');

        // Default headers
        const defaultHeaders = {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };

        // Token varsa əlavə et
        if (token) {
            defaultHeaders['Authorization'] = `Bearer ${token}`;
        }

        // Options merge et
        const finalOptions = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers
            }
        };

        const response = await fetch(url, finalOptions);

        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorData.detail || errorMessage;
            } catch (e) {
                // JSON parse olunmursa, response text götür
                try {
                    const text = await response.text();
                    if (text) errorMessage = text.substring(0, 100);
                } catch (textError) {
                    // Heç nə etmə
                }
            }

            throw new Error(errorMessage);
        }

        // Response JSON deyilsə
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        } else {
            return await response.text();
        }

    } catch (error) {
        console.error('❌ API Call Error:', error.message);

        // Əgər showError varsa istifadə et
        if (typeof showError === 'function') {
            showError(`API xətası: ${error.message}`);
        } else {
            console.error('Error:', error.message);
        }

        throw error;
    }
};

// Common API functions
window.apiGet = async function(endpoint) {
    return await safeApiCall(`${window.API_BASE}${endpoint}`, {
        method: 'GET'
    });
};

window.apiPost = async function(endpoint, data) {
    return await safeApiCall(`${window.API_BASE}${endpoint}`, {
        method: 'POST',
        body: JSON.stringify(data)
    });
};

window.apiPut = async function(endpoint, data) {
    return await safeApiCall(`${window.API_BASE}${endpoint}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
};

window.apiDelete = async function(endpoint) {
    return await safeApiCall(`${window.API_BASE}${endpoint}`, {
        method: 'DELETE'
    });
};


window.formatDate = function(dateString) {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('az-AZ', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return dateString;
    }
};

// İstifadəçi tipini mətnə çevir
window.getUserTypeText = function(userType) {
    switch(userType) {
        case 'ceo': return 'CEO';
        case 'company_admin': return 'Şirkət Admini';
        case 'employee': return 'İşçi';
        case 'admin': return 'Sistem Admini';
        case 'super_admin': return 'Super Admin';
        default: return userType || '-';
    }
};

// Pagination quraşdır
window.setupPagination = function(elementId, totalPages, currentPage, callback) {
    const paginationDiv = document.getElementById(elementId);
    if (!paginationDiv) return;

    paginationDiv.innerHTML = '';

    if (totalPages <= 1) return;

    // Əvvəlki səhifə
    if (currentPage > 1) {
        const prevBtn = document.createElement('button');
        prevBtn.className = 'pagination-btn';
        prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevBtn.onclick = () => callback(currentPage - 1);
        paginationDiv.appendChild(prevBtn);
    }

    // Səhifə nömrələri
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
        pageBtn.textContent = i;
        pageBtn.onclick = () => callback(i);
        paginationDiv.appendChild(pageBtn);
    }

    // Növbəti səhifə
    if (currentPage < totalPages) {
        const nextBtn = document.createElement('button');
        nextBtn.className = 'pagination-btn';
        nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextBtn.onclick = () => callback(currentPage + 1);
        paginationDiv.appendChild(nextBtn);
    }
};

// Status mətnini gətir
window.getStatusText = function(status) {
    if (status === true || status === 'active' || status === 'approved') {
        return 'Aktiv';
    } else if (status === false || status === 'inactive') {
        return 'Aktiv deyil';
    } else if (status === 'pending') {
        return 'Gözləmədə';
    } else if (status === 'rejected') {
        return 'Rədd edilib';
    }
    return status || '-';
};

// Status badge class-ını gətir
window.getStatusClass = function(status) {
    if (status === true || status === 'active' || status === 'approved') {
        return 'status-active';
    } else if (status === false || status === 'inactive') {
        return 'status-rejected';
    } else if (status === 'pending') {
        return 'status-pending';
    } else if (status === 'rejected') {
        return 'status-rejected';
    }
    return 'status-default';
};

// Safe string function - NULL və undefined dəyərləri handle et
window.safeString = function(value, defaultValue = '-') {
    if (value === null || value === undefined || value === '') {
        return defaultValue;
    }
    return String(value);
};

// Safe name combination
window.safeFullName = function(firstName, lastName) {
    const first = safeString(firstName, '');
    const last = safeString(lastName, '');

    const fullName = `${first} ${last}`.trim();
    return fullName || '-';
};

// Safe email
window.safeEmail = function(email) {
    return safeString(email, 'Email yoxdur');
};

// Safe phone
window.safePhone = function(phone) {
    return safeString(phone, 'Telefon yoxdur');
};

// Telefon nömrəsini formatla
window.formatPhoneNumber = function(phone) {
    if (!phone) return '-';
    const cleaned = phone.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{2})(\d{2})$/);
    if (match) {
        return `+994 (${match[1]}) ${match[2]}-${match[3]}-${match[4]}`;
    }
    return phone;
};

// İş növünü mətnə çevir
window.getEmploymentTypeText = function(type) {
    const types = {
        'full_time': 'Tam ştat',
        'part_time': 'Yarım ştat',
        'contract': 'Müqavilə',
        'remote': 'Uzaqdan',
        'freelance': 'Freelance'
    };
    return types[type] || type || '-';
};

// Form validation
window.validateRequired = function(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return false;

    if (!field.value.trim()) {
        field.style.borderColor = '#dc3545';
        return false;
    }

    field.style.borderColor = '';
    return true;
};

// Password validation
window.validatePassword = function(password) {
    if (password.length < 6) {
        return { valid: false, message: 'Şifrə ən azı 6 simvoldan ibarət olmalıdır' };
    }
    return { valid: true };
};

// Email validation
window.validateEmailFormat = function(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
};

// DOM ready helper
window.domReady = function(callback) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', callback);
    } else {
        callback();
    }
};

// Loading göstər
window.showLoading = function(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Yüklənir...</span>
                </div>
                <p class="mt-2">Yüklənir...</p>
            </div>
        `;
    }
};

// Səhifə yüklənəndə
domReady(function() {
    console.log('utils.js DOM ready');
});