// assets/js/admin_js/reports.js

let currentReportsPage = 1;
const reportsLimit = 10;

// Hesabatları yüklə
window.loadReports = function() {
    const month = document.getElementById('reportMonth') ? document.getElementById('reportMonth').value : '';
    const year = document.getElementById('reportYear') ? document.getElementById('reportYear').value : '';

    console.log('📊 Hesabatlar yüklənir...', { month, year });

    // API endpoint
    let url = `/proxy.php/api/v1/admin/reports?page=${currentReportsPage}&limit=${reportsLimit}`;

    if (month) {
        url += `&month=${month}`;
    }

    if (year) {
        url += `&year=${year}`;
    }

    console.log('Request URL:', url);

    const token = localStorage.getItem('admin_token') || localStorage.getItem('guven_token');

    fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Hesabat məlumatları:', data);
        displayReports(data);
        if (data.stats) {
            updateReportStats(data.stats);
        }
    })
    .catch(error => {
        console.error('Hesabatları yükləmək xətası:', error);
        if (typeof showError === 'function') {
            showError('Hesabatları yükləmək mümkün olmadı: ' + error.message);
        } else {
            console.error('showError funksiyası tapılmadı');
        }
    });
};

// Hesabatları göstər
function displayReports(data) {
    const reportsBody = document.getElementById('reportsBody');

    if (!reportsBody) {
        console.error('reportsBody elementi tapılmadı');
        return;
    }

    if (!data.reports || data.reports.length === 0) {
        reportsBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">Məlumat tapılmadı</td>
            </tr>
        `;
        return;
    }

    reportsBody.innerHTML = data.reports.map(report => `
        <tr>
            <td>${formatDate(report.date)}</td>
            <td>${report.new_registrations || 0}</td>
            <td>${report.approved || 0}</td>
            <td>${report.rejected || 0}</td>
            <td>${report.new_companies || 0}</td>
            <td>${report.new_employees || 0}</td>
        </tr>
    `).join('');

    // Pagination yarat
    if (typeof createPagination === 'function') {
        createPagination(
            data.pagination || { current_page: 1, total_pages: 1, total: data.reports.length },
            'reportsPagination',
            (page) => {
                currentReportsPage = page;
                loadReports();
            }
        );
    }
}

// Hesabat statistikalarını yenilə
function updateReportStats(stats) {
    const elements = {
        'monthlyRegistrationsReport': stats.monthly_registrations || 0,
        'newCompaniesReport': stats.new_companies || 0,
        'newEmployeesReport': stats.new_employees || 0,
        'approvalRateReport': (stats.approval_rate || 0) + '%'
    };

    Object.keys(elements).forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = elements[id];
        }
    });
}

// Hesabatı ixrac et
window.exportReport = function() {
    const month = document.getElementById('reportMonth') ? document.getElementById('reportMonth').value : '';
    const year = document.getElementById('reportYear') ? document.getElementById('reportYear').value : '';

    let url = `/proxy.php/api/v1/admin/reports/export`;

    const params = new URLSearchParams();
    if (month) params.append('month', month);
    if (year) params.append('year', year);

    if (params.toString()) {
        url += '?' + params.toString();
    }

    // Yükləmə başladı bildirişi
    if (typeof showNotification === 'function') {
        showNotification('Hesabat yüklənir...', 'info');
    }

    const token = localStorage.getItem('admin_token') || localStorage.getItem('guven_token');

    // API-dən fayl yüklə
    fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.blob();
    })
    .then(blob => {
        // Faylı yüklə
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hesabat_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        if (typeof showSuccess === 'function') {
            showSuccess('Hesabat uğurla yükləndi');
        }
    })
    .catch(error => {
        console.error('Hesabatı ixrac etmək xətası:', error);
        if (typeof showError === 'function') {
            showError('Hesabatı ixrac etmək mümkün olmadı: ' + error.message);
        }
    });
};

// İl seçimlərini yüklə
function loadYearOptions() {
    const select = document.getElementById('reportYear');
    if (!select) return;

    const currentYear = new Date().getFullYear();

    // Əvvəlcə mövcud seçimləri təmizlə
    select.innerHTML = '<option value="">Bütün illər</option>';

    // Son 5 il üçün seçimlər əlavə et
    for (let i = currentYear; i >= currentYear - 5; i--) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        if (i === currentYear) {
            option.selected = true;
        }
        select.appendChild(option);
    }
}

// Tarixi formatla
function formatDate(dateString) {
    if (!dateString) return '-';

    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('az-AZ', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    } catch (error) {
        return dateString;
    }
}

// Səhifə yüklənəndə il seçimlərini yüklə
document.addEventListener('DOMContentLoaded', function() {
    loadYearOptions();

    // Hesabatlar səhifəsinə keçid zamanı hesabatları avtomatik yüklə
    document.querySelectorAll('.menu-item[data-page="reports"]').forEach(item => {
        item.addEventListener('click', function() {
            // Kiçik gecikmə ilə hesabatları yüklə
            setTimeout(() => {
                const reportsPage = document.getElementById('reportsPage');
                if (reportsPage && !reportsPage.classList.contains('hidden')) {
                    if (typeof loadReports === 'function') {
                        loadReports();
                    } else {
                        console.error('loadReports funksiyası tapılmadı');
                    }
                }
            }, 100);
        });
    });

    // Reports səhifəsində olduqda hesabatları avtomatik yüklə
    if (document.getElementById('reportsPage') &&
        !document.getElementById('reportsPage').classList.contains('hidden')) {
        setTimeout(() => {
            if (typeof loadReports === 'function') {
                loadReports();
            }
        }, 500);
    }
});