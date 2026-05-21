// raport/reportUtils.js
// Ümumi köməkçi funksiyalar

/**
 * Report Utilities
 * Formatlaşdırma, validasiya və digər köməkçi funksiyalar
 */

const ReportUtils = {
    /**
     * Tarixi formatla
     * @param {string|Date} date
     * @param {string} format
     * @returns {string}
     */
    formatDate(date, format = 'DD.MM.YYYY') {
        if (!date) return '-';
        const d = new Date(date);
        if (isNaN(d.getTime())) return '-';

        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');

        switch(format) {
            case 'YYYY-MM-DD': return `${year}-${month}-${day}`;
            case 'DD.MM.YYYY HH:MM': return `${day}.${month}.${year} ${hours}:${minutes}`;
            case 'HH:MM': return `${hours}:${minutes}`;
            default: return `${day}.${month}.${year}`;
        }
    },

    /**
     * Pul formatla (AZN)
     */
    formatMoney(amount) {
        if (amount === undefined || amount === null) return '0 ₼';
        return new Intl.NumberFormat('az-AZ', {
            style: 'currency',
            currency: 'AZN',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(amount).replace('AZN', '₼').trim();
    },

    /**
     * Status label-i
     */
    getStatusLabel(status) {
        const map = {
            'completed': 'Tamamlanıb',
            'pending': 'Gözləmədə',
            'in_progress': 'İcra edilir',
            'overdue': 'Müddəti keçib',
            'rejected': 'İmtina edilib',
            'pending_approval': 'Təsdiq gözləyir',
            'waiting_approval': 'Təsdiq gözləyir'
        };
        return map[status] || status || '-';
    },

    /**
     * Status üçün CSS class
     */
    getStatusClass(status) {
        const map = {
            'completed': 'success',
            'pending': 'warning',
            'in_progress': 'info',
            'overdue': 'danger',
            'rejected': 'danger',
            'pending_approval': 'warning',
            'waiting_approval': 'warning'
        };
        return `badge-${map[status] || 'secondary'}`;
    },

    /**
     * Prioritet label-i
     */
    getPriorityLabel(priority) {
        const map = {
            'critical': 'Kritik',
            'high': 'Yüksək',
            'medium': 'Orta',
            'low': 'Aşağı'
        };
        return map[priority] || priority || '-';
    },

    /**
     * Xəbərdarlıq göstər
     */
    showNotification(message, type = 'info', duration = 3000) {
        if (window.showNotification) {
            window.showNotification(message, type, duration);
        } else {
            console.log(`[${type}] ${message}`);
        }
    },

    /**
     * Yükləmə statusu
     */
    showLoading(show) {
        if (show && window.showLoading) window.showLoading();
        else if (!show && window.hideLoading) window.hideLoading();
    },

    /**
     * Excel export (XLSX ilə)
     */
    exportToExcel(data, fileName = 'hesabat') {
        if (typeof XLSX === 'undefined') {
            console.error('XLSX kitabxanası yüklənməyib');
            return;
        }

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Hesabat');
        XLSX.writeFile(wb, `${fileName}_${this.formatDate(new Date(), 'YYYY-MM-DD')}.xlsx`);
    },

    /**
     * CSV export
     */
    exportToCSV(data, fileName = 'hesabat') {
        if (!data?.length) return;

        const headers = Object.keys(data[0]);
        const csvRows = [
            headers.join(','),
            ...data.map(row => headers.map(h => JSON.stringify(row[h] || '')).join(','))
        ];

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName}_${this.formatDate(new Date(), 'YYYY-MM-DD')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    },

    /**
     * PDF export (window.print istifadə edir)
     */
    printReport(elementId, title = 'Hesabat') {
        const content = document.getElementById(elementId);
        if (!content) return;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>${title}</title>
                    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
                    <style>
                        body { font-family: Arial, sans-serif; padding: 30px; }
                        table { border-collapse: collapse; width: 100%; margin: 15px 0; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background: #3b82f6; color: white; }
                        .print-header { text-align: center; margin-bottom: 30px; }
                        .print-footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
                    </style>
                </head>
                <body>
                    <div class="print-header">
                        <h1>${title}</h1>
                        <p>Tarix: ${this.formatDate(new Date())}</p>
                    </div>
                    ${content.innerHTML}
                    <div class="print-footer">
                        <p>Hesabat ${this.formatDate(new Date())} tarixində yaradılmışdır</p>
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    },

    /**
     * Debounce funksiyası (axtarış üçün)
     */
    debounce(func, delay) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    },

    /**
     * Throttle funksiyası
     */
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * HTML escape
     */
    escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    /**
     * Tarix aralığını validate et
     */
    validateDateRange(start, end) {
        const startDate = new Date(start);
        const endDate = new Date(end);

        if (isNaN(startDate) || isNaN(endDate)) {
            return { valid: false, error: 'Tarix formatı düzgün deyil' };
        }
        if (startDate > endDate) {
            return { valid: false, error: 'Başlanğıc tarix bitiş tarixindən böyük ola bilməz' };
        }
        const diffDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
        if (diffDays > 365) {
            return { valid: false, error: 'Tarix aralığı maksimum 365 gün ola bilər' };
        }
        return { valid: true };
    }
};

window.ReportUtils = ReportUtils;