// Admin Panel JavaScript - notifications.js

// Xəta göstər
function showError(message) {
    console.error('Xəta:', message);

    if (!notificationContainer) {
        createNotificationContainer();
    }

    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger';
    alertDiv.innerHTML = `
        <i class="fas fa-exclamation-circle"></i> ${message}
        <button type="button" class="close-btn" onclick="this.parentElement.remove()">
            <span>&times;</span>
        </button>
    `;

    // Stil əlavə et
    alertDiv.style.cssText = `
        background: #f8d7da;
        color: #721c24;
        padding: 12px 15px;
        margin-bottom: 10px;
        border-radius: 4px;
        border: 1px solid #f5c6cb;
        display: flex;
        align-items: center;
        justify-content: space-between;
        animation: slideIn 0.3s ease;
        min-width: 300px;
    `;

    const closeBtn = alertDiv.querySelector('.close-btn');
    closeBtn.style.cssText = `
        background: none;
        border: none;
        color: #721c24;
        font-size: 20px;
        cursor: pointer;
        padding: 0;
        margin-left: 10px;
    `;

    notificationContainer.appendChild(alertDiv);

    setTimeout(() => {
        if (alertDiv.parentNode === notificationContainer) {
            notificationContainer.removeChild(alertDiv);
        }
    }, 5000);
}

// Uğur göstər
function showSuccess(message) {
    console.log('Uğur:', message);

    if (!notificationContainer) {
        createNotificationContainer();
    }

    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success';
    alertDiv.innerHTML = `
        <i class="fas fa-check-circle"></i> ${message}
        <button type="button" class="close-btn" onclick="this.parentElement.remove()">
            <span>&times;</span>
        </button>
    `;

    // Stil əlavə et
    alertDiv.style.cssText = `
        background: #d4edda;
        color: #155724;
        padding: 12px 15px;
        margin-bottom: 10px;
        border-radius: 4px;
        border: 1px solid #c3e6cb;
        display: flex;
        align-items: center;
        justify-content: space-between;
        animation: slideIn 0.3s ease;
        min-width: 300px;
    `;

    const closeBtn = alertDiv.querySelector('.close-btn');
    closeBtn.style.cssText = `
        background: none;
        border: none;
        color: #155724;
        font-size: 20px;
        cursor: pointer;
        padding: 0;
        margin-left: 10px;
    `;

    notificationContainer.appendChild(alertDiv);

    setTimeout(() => {
        if (alertDiv.parentNode === notificationContainer) {
            notificationContainer.removeChild(alertDiv);
        }
    }, 5000);
}