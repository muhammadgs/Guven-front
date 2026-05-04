// error-handler.js - Backend error handling

console.log('✅ Error handler loaded');

// Global error handler
window.handleApiError = function(error, endpoint) {
    console.error(`API Error (${endpoint}):`, error);

    // Pydantic error detection
    if (error.message && error.message.includes('ceo_name')) {
        console.warn('⚠️ Pydantic validation error - NULL values in database');
        showError('Verilənlər bazasında boş dəyərlər var. Backend developer ilə əlaqə saxlayın.');
        return true;
    }

    if (error.status === 500) {
        showError('Server daxili xəta (500). Backend konfiqurasiya problemi.');
        return true;
    }

    if (error.status === 401) {
        showError('Giriş etməlisiniz. Zəhmət olmasa yenidən giriş edin.');
        setTimeout(() => window.location.href = 'login.html', 2000);
        return true;
    }

    if (error.status === 403) {
        showError('Bu əməliyyat üçün icazəniz yoxdur.');
        return true;
    }

    showError('Xəta baş verdi. Yenidən cəhd edin.');
    return false;
};

// Safe API call wrapper
window.safeApiCall = async function(url, options = {}) {
    try {
        const token = localStorage.getItem('guven_token');

        const headers = {
            'Accept': 'application/json',
            ...options.headers
        };

        if (token && !headers['Authorization']) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(url, {
            ...options,
            headers
        });

        if (!response.ok) {
            let errorText = '';
            try {
                errorText = await response.text();
            } catch (e) {
                errorText = response.statusText;
            }

            const error = new Error(`HTTP ${response.status}: ${errorText.substring(0, 100)}`);
            error.status = response.status;
            error.responseText = errorText;

            // Handle specific errors
            if (response.status === 500) {
                console.warn(`Backend 500 error for ${url}`);

                // Pydantic error
                if (errorText.includes('ceo_name') || errorText.includes('validation error')) {
                    console.warn('Pydantic validation error');
                    showPydanticWarning();
                    return getFallbackData(url);
                }

                // General 500 error
                showBackendWarning();
                return getFallbackData(url);
            }

            throw error;
        }

        return await response.json();

    } catch (error) {
        console.error(`API call failed (${url}):`, error.message);

        // Pydantic error detection
        if (error.responseText && error.responseText.includes('ceo_name')) {
            showPydanticWarning();
            return getFallbackData(url);
        }

        // Network error
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            showError('Serverlə bağlantı problem var. İnternet bağlantınızı yoxlayın.');
            return getFallbackData(url);
        }

        // Backend admin endpoints fallback
        if (url.includes('/api/v1/admin/')) {
            return getFallbackData(url);
        }

        throw error;
    }
};

// Fallback data for when backend is down
function getFallbackData(url) {
    console.log(`🔄 Using fallback data for: ${url}`);

    // Companies fallback
    if (url.includes('/api/v1/admin/companies')) {
        return {
            items: [
                {
                    id: 1,
                    company_name: 'Guven Finans',
                    company_code: 'GVN001',
                    voen: '1234567890',
                    ceo_name: 'Əli Balakişiyev',
                    address: 'Bakı şəhəri',
                    phone: '+994501234567',
                    email: 'info@guvenfinans.az',
                    is_active: true,
                    created_at: '2024-01-01T00:00:00.000Z',
                    total_employees: 5
                },
                {
                    id: 2,
                    company_name: 'Demo Şirkət',
                    company_code: 'DEMO001',
                    voen: '0987654321',
                    ceo_name: 'Demo CEO',
                    address: 'Bakı',
                    phone: '+994502345678',
                    email: 'info@demo.az',
                    is_active: true,
                    created_at: '2024-01-02T00:00:00.000Z',
                    total_employees: 3
                }
            ],
            total: 2,
            page: 1,
            pages: 1,
            limit: 10
        };
    }

    // Users fallback
    if (url.includes('/api/v1/admin/users')) {
        const status = url.includes('status=pending') ? 'pending' :
                      url.includes('status=rejected') ? 'rejected' : 'approved';

        return {
            items: [
                {
                    id: 1,
                    ceo_name: 'Demo İstifadəçi 1',
                    ceo_lastname: 'Test',
                    ceo_email: 'demo1@example.com',
                    ceo_phone: '+994501234567',
                    user_type: 'ceo',
                    company_name: 'Demo Şirkət',
                    is_active: status !== 'pending',
                    status: status,
                    created_at: new Date().toISOString(),
                    voen: '1234567890'
                },
                {
                    id: 2,
                    ceo_name: 'Demo İstifadəçi 2',
                    ceo_lastname: 'Test',
                    ceo_email: 'demo2@example.com',
                    ceo_phone: '+994502345678',
                    user_type: 'company_admin',
                    company_name: 'Demo Şirkət 2',
                    is_active: status === 'approved',
                    status: status,
                    created_at: new Date().toISOString(),
                    voen: '0987654321'
                }
            ],
            total: 2,
            page: 1,
            pages: 1,
            limit: 10
        };
    }

    // Default fallback
    return { items: [], total: 0, page: 1, pages: 1, limit: 10 };
}

// Warning banners
function showPydanticWarning() {
    if (document.getElementById('pydanticWarning')) return;

    const warning = document.createElement('div');
    warning.id = 'pydanticWarning';
    warning.innerHTML = `
        <div style="
            position: fixed;
            top: 70px;
            left: 0;
            right: 0;
            background: #e74c3c;
            color: white;
            padding: 10px 20px;
            text-align: center;
            z-index: 9998;
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
        ">
            <i class="fas fa-exclamation-triangle"></i>
            <span>Backend Pydantic validation error. Demo data göstərilir.</span>
            <button onclick="this.parentElement.parentElement.remove()" style="
                background: none;
                border: none;
                color: white;
                cursor: pointer;
                margin-left: 20px;
            ">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

    document.body.appendChild(warning);
}

function showBackendWarning() {
    if (document.getElementById('backendWarning')) return;

    const warning = document.createElement('div');
    warning.id = 'backendWarning';
    warning.innerHTML = `
        <div style="
            position: fixed;
            top: 70px;
            left: 0;
            right: 0;
            background: #f39c12;
            color: white;
            padding: 10px 20px;
            text-align: center;
            z-index: 9997;
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
        ">
            <i class="fas fa-server"></i>
            <span>Backend server problem. Demo data göstərilir.</span>
            <button onclick="this.parentElement.parentElement.remove()" style="
                background: none;
                border: none;
                color: white;
                cursor: pointer;
                margin-left: 20px;
            ">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

    document.body.appendChild(warning);
}

console.log('✅ Error handler initialization complete');