// alembic/task/notification.js
const NOTIFICATION_CONFIG = {
    enabled: true,
    showApiErrors: false,
    showBackendErrors: false,
    showAuthErrors: false,
    showSuccessMessages: true,
    showInfoMessages: true,
    showWarningMessages: false,

    // Gizlənməli olan error pattern-ləri
    hiddenErrorPatterns: [
        'Not authenticated',
        'İşçilər gətirilərkən xəta',
        'Arxivlənmiş tapşırıqlar gətirilərkən xəta',
        'type object.*has no attribute',
        'HTTP 403',
        'HTTP 500',
        'Forbidden',
        'Internal Server Error'
    ]
};

// Bildiriş göstərmək
function showNotification(message, type = 'info', options = {}) {
    // Config yoxla
    if (!NOTIFICATION_CONFIG.enabled) return;

    // Type-a görə filter
    if (type === 'error' && !NOTIFICATION_CONFIG.showApiErrors) {
        if (isHiddenError(message)) return;
    }
    if (type === 'warning' && !NOTIFICATION_CONFIG.showWarningMessages) return;
    if (type === 'success' && !NOTIFICATION_CONFIG.showSuccessMessages) return;
    if (type === 'info' && !NOTIFICATION_CONFIG.showInfoMessages) return;

    // Auth error-larını gizlə
    if (type === 'error' && isAuthError(message) && !NOTIFICATION_CONFIG.showAuthErrors) return;

    // Backend Python error-larını gizlə
    if (type === 'error' && isBackendError(message) && !NOTIFICATION_CONFIG.showBackendErrors) return;

    // Sessiya timeout-u varsa, yalnız o zaman göster
    if (type === 'error' && message.includes('Session expired')) {
        // Sessiya bitib
        console.warn('Session expired, redirecting to login');
        setTimeout(() => {
            window.GF_CONFIG.redirectToLogin('session_expired');
        }, 2000);
    }

    // Bildiriş container-i
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-width: 400px;
        `;
        document.body.appendChild(container);
    }

    // Rənglər
    const colors = {
        success: { bg: '#d4edda', border: '#c3e6cb', text: '#155724' },
        error: { bg: '#f8d7da', border: '#f5c6cb', text: '#721c24' },
        warning: { bg: '#fff3cd', border: '#ffeaa7', text: '#856404' },
        info: { bg: '#d1ecf1', border: '#bee5eb', text: '#0c5460' }
    };

    const color = colors[type] || colors.info;

    // Bildiriş elementi
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;

    notification.style.cssText = `
        background: ${color.bg};
        color: ${color.text};
        border: 1px solid ${color.border};
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        animation: slideIn 0.3s ease;
        word-wrap: break-word;
        display: flex;
        justify-content: space-between;
        align-items: center;
        max-width: 400px;
    `;

    // İkonlar
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };

    const icon = icons[type] || '';

    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
            ${icon ? `<span style="font-size: 18px;">${icon}</span>` : ''}
            <span style="flex: 1;">${message}</span>
        </div>
        <button class="notification-close" style="
            background: none;
            border: none;
            font-size: 18px;
            cursor: pointer;
            color: inherit;
            margin-left: 10px;
            padding: 0;
            line-height: 1;
        ">×</button>
    `;

    container.appendChild(notification);

    // Bağlama düyməsi
    notification.querySelector('.notification-close').addEventListener('click', function() {
        removeNotification(notification);
    });

    // Auto-remove (error-lar üçün daha qısa)
    const duration = type === 'error' ? 3000 : 5000;
    setTimeout(function() {
        removeNotification(notification);
    }, duration);

    // CSS style əlavə et
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
}

// Helper funksiyalar
function isHiddenError(message) {
    return NOTIFICATION_CONFIG.hiddenErrorPatterns.some(pattern =>
        message.includes(pattern) ||
        message.toLowerCase().includes(pattern.toLowerCase())
    );
}

function isAuthError(message) {
    const authPatterns = [
        'Not authenticated',
        'Forbidden',
        'Unauthorized',
        'HTTP 401',
        'HTTP 403',
        'Giriş icazəniz yoxdur',
        'Token expired'
    ];
    return authPatterns.some(pattern =>
        message.includes(pattern) ||
        message.toLowerCase().includes(pattern.toLowerCase())
    );
}

function isBackendError(message) {
    const backendPatterns = [
        'type object.*has no attribute',
        'Internal Server Error',
        'HTTP 500',
        'Python error',
        'has no attribute'
    ];
    return backendPatterns.some(pattern =>
        message.includes(pattern) ||
        message.toLowerCase().includes(pattern.toLowerCase())
    );
}

function removeNotification(notification) {
    if (notification.parentNode) {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(function() {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }
}

// Bütün bildirişləri sil
function clearAllNotifications() {
    const container = document.getElementById('notification-container');
    if (container) {
        container.innerHTML = '';
    }
}

// API xəta mesajlarını idarə etmək
function handleApiError(error, defaultMessage = 'Xəta baş verdi') {
    const errorMessage = error.details || error.message || defaultMessage;

    // Backend Python xətalarını gizlə
    if (isBackendError(errorMessage)) {
        console.error('Backend error (hidden):', errorMessage);
        return 'backend_error';
    }

    // Auth xətalarını gizlə (sessiya xaric)
    if (isAuthError(errorMessage) && !errorMessage.includes('Session expired')) {
        console.warn('Auth error (hidden):', errorMessage);
        return 'auth_error';
    }

    // Digər xətalar
    if (error.status === 404) {
        console.warn('Not found:', errorMessage);
        return 'not_found';
    } else if (error.status === 429) {
        console.warn('Rate limit:', errorMessage);
        return 'rate_limit';
    } else if (error.status === 500) {
        console.error('Server error:', errorMessage);
        return 'server_error';
    } else {
        console.error('Unknown error:', errorMessage);
        return 'unknown_error';
    }
}

// Config dəyişdirmək üçün
function setNotificationConfig(config) {
    Object.assign(NOTIFICATION_CONFIG, config);
}

// Debug üçün
function logApiErrorSilently(error) {
    console.group('🔴 Silent API Error');
    console.log('Status:', error.status);
    console.log('Message:', error.message);
    console.log('Details:', error.details);
    console.groupEnd();
}