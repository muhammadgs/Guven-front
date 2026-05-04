// alembic/task/formatters.js
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
    } catch (e) {
        return dateString;
    }
}

// Status üçün CSS class adı
function getStatusClass(status) {
    const statusMap = {
        'pending': 'status-pending',        // Gözləmədə - YAŞIL
        'in_progress': 'status-in-progress', // İşlənir - MAVİ
        'completed': 'status-completed',     // Tamamlandı - YAŞIL (qoyu)
        'overdue': 'status-overdue',         // Vaxtı keçib - QIRMIZI
        'cancelled': 'status-cancelled',     // Ləğv edilib - BOZ
        'archived': 'status-archived'        // Arxivlənib - Bənövşəyi
    };
    return statusMap[status] || 'status-pending';
}

// Status mətni
function getStatusText(status) {
    const statusMap = {
        'pending': 'GÖZLƏYİR',
        'in_progress': 'İŞLƏNİR',
        'completed': 'TAMAMLANDI',
        'overdue': 'GÖZLƏMƏ MÜDDƏTİ KEÇİB',
        'cancelled': 'LƏĞV EDİLDİ',
        'archived': 'ARXİVLƏNDİ'
    };
    return statusMap[status] || status;
}

// Əmək haqqı hesablama
function calculateSalary(hourlyRate, minutes) {
    if (!hourlyRate || !minutes) return '0.00';
    const hours = minutes / 60;
    return (hours * hourlyRate).toFixed(2);
}

// Mətn truncate
function truncateText(text, maxLength = 50, suffix = '...') {
    if (!text) return '-';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + suffix;
}