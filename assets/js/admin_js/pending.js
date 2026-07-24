if (typeof safeFetch === 'undefined') {
    window.safeFetch = async function(url, options = {}) {
        try {
            const token = localStorage.getItem('guven_token');

            const defaultHeaders = {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            };

            if (token) {
                defaultHeaders['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(url, {
                ...options,
                headers: {
                    ...defaultHeaders,
                    ...options.headers
                }
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.message || `HTTP ${response.status}`);
            }

            return await response.json();

        } catch (error) {
            console.error('Fetch xətası:', error);

            // showError funksiyası varsa istifadə et
            if (typeof showError === 'function') {
                showError(error.message || 'Xəta baş verdi');
            }

            throw error;
        }
    };
}

// Qalan kodlar eyni qalsın...
async function loadPendingRegistrations(page = 1) {
    try {
        const token = localStorage.getItem('guven_token');
        if (!token) return;

        // Gözləmədə olan istifadəçiləri yüklə
        let url = `${API_BASE}/api/v1/admin/users?page=${page}&limit=${itemsPerPage}&status=pending`;

        const search = document.getElementById('pendingSearch');
        const filter = document.getElementById('pendingFilter');

        if (search && search.value) {
            url += `&search=${encodeURIComponent(search.value)}`;
        }

        if (filter && filter.value !== 'all') {
            url += `&user_type=${filter.value}`;
        }

        // İndi safeFetch istifadə edə bilərik
        const data = await safeFetch(url, {
            method: 'GET'
            // Headers artıq safeFetch içində var
        });

        displayPendingRegistrations(data.items || []);
        setupPagination('pendingPagination', data.pages || 1, page, loadPendingRegistrations);

    } catch (error) {
        console.error('Gözləmədə olan qeydiyyatlar yüklənərkən xəta:', error);
    }
}

// Admin Panel JavaScript - pending.js
async function loadPendingRegistrations(page = 1) {
    try {
        const token = localStorage.getItem('guven_token');
        if (!token) return;

        // Gözləmədə olan istifadəçiləri yüklə
        let url = `${API_BASE}/api/v1/admin/users?page=${page}&limit=${itemsPerPage}&status=pending`;

        const search = document.getElementById('pendingSearch');
        const filter = document.getElementById('pendingFilter');

        if (search && search.value) {
            url += `&search=${encodeURIComponent(search.value)}`;
        }

        if (filter && filter.value !== 'all') {
            url += `&user_type=${filter.value}`;
        }

        // safeFetch istifadə et
        const data = await safeFetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        displayPendingRegistrations(data.items || []);
        setupPagination('pendingPagination', data.pages || 1, page, loadPendingRegistrations);

    } catch (error) {
        console.error('Gözləmədə olan qeydiyyatlar yüklənərkən xəta:', error);
        // Xəta artıq handleApiError tərəfindən idarə olunur
    }
}



// Force status colors on load
function applyStatusColors() {
    console.log('🎨 Applying status colors...');

    // Tabledaki bütün status badge-ləri tap
    const statusBadges = document.querySelectorAll('.status-badge');

    statusBadges.forEach(badge => {
        const text = badge.textContent.toLowerCase();

        // Remove all classes first
        badge.classList.remove('status-active', 'status-pending', 'status-rejected');

        // Apply correct class
        if (text.includes('təsdiqləndi') || text.includes('approved') || text.includes('aktiv')) {
            badge.classList.add('status-active');
            badge.innerHTML = '<i class="fas fa-check-circle"></i> Təsdiqləndi';
        } else if (text.includes('rədd') || text.includes('rejected')) {
            badge.classList.add('status-rejected');
            badge.innerHTML = '<i class="fas fa-times-circle"></i> Rədd edildi';
        } else {
            badge.classList.add('status-pending');
            badge.innerHTML = '<i class="fas fa-clock"></i> Gözləmədə';
        }
    });

    // Table rows üçün
    const rows = document.querySelectorAll('#pendingRegistrationsBody tr');
    rows.forEach(row => {
        const statusBadge = row.querySelector('.status-badge');
        if (!statusBadge) return;

        // Remove row classes
        row.classList.remove('approved-row', 'pending-row', 'rejected-row');

        // Add correct row class
        if (statusBadge.classList.contains('status-active')) {
            row.classList.add('approved-row');
        } else if (statusBadge.classList.contains('status-rejected')) {
            row.classList.add('rejected-row');
        } else {
            row.classList.add('pending-row');
        }
    });

    console.log(`✅ Applied colors to ${statusBadges.length} status badges`);
}


// Hər dəfə məlumatlar yüklənəndə çağır
function displayPendingRegistrations(registrations) {
    const tbody = document.getElementById('pendingRegistrationsBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!registrations || registrations.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center py-4">
                    <div class="alert alert-info mb-0">
                        <i class="fas fa-info-circle me-2"></i>
                        Gözləmədə olan qeydiyyat tapılmadı
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    registrations.forEach(reg => {
        const date = formatDate(reg.created_at);
        const userType = getUserTypeText(reg.user_type);

        // Status müəyyən et - ÇOX SADƏ!
        const isActive = reg.is_active === true;
        const isRejected = reg.status === 'rejected';

        let statusClass = 'status-pending';
        let statusText = 'Gözləmədə';
        let statusIcon = 'fa-clock';

        if (isActive) {
            statusClass = 'status-active';
            statusText = 'Təsdiqləndi';
            statusIcon = 'fa-check-circle';
        }

        if (isRejected) {
            statusClass = 'status-rejected';
            statusText = 'Rədd edildi';
            statusIcon = 'fa-times-circle';
        }

        const row = document.createElement('tr');
        row.classList.add(statusClass.replace('status-', '') + '-row');

        const fullName = `${reg.ceo_name || reg.name || ''} ${reg.ceo_lastname || reg.surname || ''}`.trim() || '-';
        const email = reg.ceo_email || reg.email || '-';
        const phone = reg.ceo_phone || reg.phone || '-';

        row.innerHTML = `
            <td>${reg.id || '-'}</td>
            <td>${fullName}</td>
            <td>${email}</td>
            <td>${phone}</td>
            <td>${userType}</td>
            <td>${reg.company_name || '-'}</td>
            <td>${date}</td>
            <td>
                <span class="status-badge ${statusClass}" data-status="${statusText}">
                    <i class="fas ${statusIcon}"></i> ${statusText}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn view" onclick="viewUser(${reg.id})" title="Bax">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${statusClass === 'status-pending' ? `
                        <button class="action-btn approve" onclick="showApproveModal(${reg.id})" title="Təsdiqlə">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="action-btn reject" onclick="showRejectModal(${reg.id})" title="Rədd et">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                </div>
            </td>
        `;

        tbody.appendChild(row);
    });

    // Force apply colors
    setTimeout(applyStatusColors, 100);
}



// Axtarış funksiyası
window.searchPending = function() {
    loadPendingRegistrations(1);
};

// Təsdiqləmə modalını göstər
window.showApproveModal = function(id) {
    selectedApplicationId = id;
    document.getElementById('approvalDecision').value = 'approve';
    document.getElementById('approvalComment').value = '';
    loadApplicationInfo(id);
    openModal('approveRejectModal');
};

// Rədd etmə modalını göstər
window.showRejectModal = function(id) {
    selectedApplicationId = id;
    document.getElementById('approvalDecision').value = 'reject';
    document.getElementById('approvalComment').value = '';
    loadApplicationInfo(id);
    openModal('approveRejectModal');
};

// Export funksiyası
window.exportPending = function() {
    showSuccess('Export funksiyası hazırlanır...');
};