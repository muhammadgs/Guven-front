
// task_js/raport/utils.js
class Utils {
    formatDate(date, format = 'DD.MM.YYYY') {
        if (!date) return '-';
        const d = new Date(date);
        if (isNaN(d.getTime())) return '-';

        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();

        if (format === 'YYYY-MM-DD') {
            return `${year}-${month}-${day}`;
        }
        return `${day}.${month}.${year}`;
    }

    formatMoney(amount) {
        if (amount === undefined || amount === null) return '0 ₼';
        return new Intl.NumberFormat('az-AZ', {
            style: 'currency',
            currency: 'AZN',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(amount).replace('AZN', '₼').trim();
    }

    formatNumber(num) {
        if (num === undefined || num === null) return '0';
        return new Intl.NumberFormat('az-AZ').format(num);
    }

    formatPercent(num) {
        if (num === undefined || num === null) return '0%';
        return `${Math.round(num)}%`;
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    getStatusClass(status) {
        const classes = {
            completed: 'success',
            pending: 'warning',
            in_progress: 'info',
            overdue: 'danger'
        };
        return classes[status] || 'secondary';
    }

    getStatusText(status) {
        const texts = {
            completed: 'Tamamlanıb',
            pending: 'Gözləmədə',
            in_progress: 'İcra edilir',
            overdue: 'Müddəti keçib'
        };
        return texts[status] || status;
    }

    getStatusIcon(status) {
        const icons = {
            completed: 'fa-check-circle',
            pending: 'fa-clock',
            in_progress: 'fa-spinner',
            overdue: 'fa-exclamation-triangle'
        };
        return icons[status] || 'fa-circle';
    }

    getPriorityClass(priority) {
        const classes = {
            high: 'danger',
            medium: 'warning',
            low: 'success'
        };
        return classes[priority] || 'secondary';
    }

    groupBy(array, key) {
        return array.reduce((result, item) => {
            const groupKey = item[key];
            if (!result[groupKey]) {
                result[groupKey] = [];
            }
            result[groupKey].push(item);
            return result;
        }, {});
    }

    sortBy(array, key, order = 'asc') {
        return [...array].sort((a, b) => {
            if (order === 'asc') {
                return a[key] > b[key] ? 1 : -1;
            } else {
                return a[key] < b[key] ? 1 : -1;
            }
        });
    }

    unique(array) {
        return [...new Set(array)];
    }

    sum(array, key) {
        return array.reduce((total, item) => total + (item[key] || 0), 0);
    }

    average(array, key) {
        if (array.length === 0) return 0;
        return this.sum(array, key) / array.length;
    }

    downloadFile(content, fileName, type = 'text/plain') {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
    }

    copyToClipboard(text) {
        navigator.clipboard.writeText(text).catch(err => {
            console.error('Kopyalama xətası:', err);
        });
    }

    getQueryParams() {
        const params = new URLSearchParams(window.location.search);
        const result = {};
        for (const [key, value] of params) {
            result[key] = value;
        }
        return result;
    }

    setQueryParams(params) {
        const url = new URL(window.location);
        Object.entries(params).forEach(([key, value]) => {
            if (value) {
                url.searchParams.set(key, value);
            } else {
                url.searchParams.delete(key);
            }
        });
        window.history.pushState({}, '', url);
    }
}

// Global modula əlavə et
window.ReportModules = window.ReportModules || {};
window.ReportModules.Utils = Utils;