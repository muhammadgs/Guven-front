// Admin Panel JavaScript - dashboard.js
async function loadDashboardData() {
    try {
        const token = localStorage.getItem('guven_token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        console.log('Dashboard məlumatları yüklənir...');

        const response = await fetch(`${API_BASE}/api/v1/admin/dashboard`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Dashboard məlumatları:', data);

            // Kartları güncəllə
            updateStatElement('totalUsers', data.stats?.total_users);
            updateStatElement('pendingRegistrations', data.stats?.pending_users);
            updateStatElement('activeUsers', data.stats?.active_users);
            updateStatElement('rejectedApplications', data.stats?.rejected_users);
            updateStatElement('totalCompanies', data.stats?.total_companies);
            updateStatElement('activeCompanies', data.stats?.active_companies);
            updateStatElement('totalEmployees', data.stats?.total_employees);
            updateStatElement('activeEmployees', data.stats?.active_employees);
            updateStatElement('todayRegistrations', data.stats?.today_registrations);
            updateStatElement('weekRegistrations', data.stats?.week_registrations);
            updateStatElement('monthRegistrations', data.stats?.month_registrations);
            updateStatElement('approvalRate', `${data.stats?.approval_rate || 0}%`);

            // Gözləmədə olan sayını menyuda göstər
            updateStatElement('pendingCount', data.stats?.pending_users);

            // Son qeydiyyatları göstər
            if (data.recent_registrations) {
                displayRecentRegistrations(data.recent_registrations || []);
            } else {
                // Əgər recent_registrations yoxdursa, boş cədvəl göstər
                const tbody = document.getElementById('recentRegistrationsBody');
                if (tbody) {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="9" class="text-center">Son qeydiyyat tapılmadı</td>
                        </tr>
                    `;
                }
            }

        } else if (response.status === 403) {
            showError('Bu səhifəyə giriş hüququnuz yoxdur. Admin hüquqları tələb olunur.');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 3000);
        } else {
            console.error('Dashboard məlumatları alınarkən xəta:', response.status, response.statusText);
            showError('Dashboard məlumatları alına bilmədi');
        }
    } catch (error) {
        console.error('Dashboard yüklənərkən xəta:', error);
        showError('Dashboard məlumatları yüklənərkən xəta baş verdi');
    }
}

function updateStatElement(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value || '0';
    }
}

function displayRecentRegistrations(registrations) {
    const tbody = document.getElementById('recentRegistrationsBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!registrations || registrations.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center">Son qeydiyyat tapılmadı</td>
            </tr>
        `;
        return;
    }

    registrations.forEach(reg => {
        const statusClass = reg.is_active ? 'status-active' : 'status-pending';
        const statusText = reg.is_active ? 'Aktiv' : 'Gözləmədə';
        const date = formatDate(reg.created_at);

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${reg.id || '-'}</td>
            <td>${reg.full_name || `${reg.ceo_name || ''} ${reg.ceo_lastname || ''}`.trim() || '-'}</td>
            <td>${reg.ceo_email || reg.email || '-'}</td>
            <td>${reg.ceo_phone || reg.phone || '-'}</td>
            <td>${reg.company_name || '-'}</td>
            <td>${reg.voen || '-'}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td>${date}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn view" onclick="viewUser(${reg.id})" title="Bax">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${!reg.is_active ? `
                        <button class="action-btn approve" onclick="showApproveModal(${reg.id})" title="Təsdiqlə">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="action-btn delete" onclick="showRejectModal(${reg.id})" title="Rədd et">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}