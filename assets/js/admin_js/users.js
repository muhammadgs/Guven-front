// Admin Panel JavaScript - users.js

// Bütün istifadəçiləri yüklə
async function loadAllUsers(page = 1) {
    try {
        const token = localStorage.getItem('guven_token');
        if (!token) return;

        // Bütün istifadəçiləri yüklə
        let url = `${API_BASE}/api/v1/admin/users?page=${page}&limit=${itemsPerPage}`;

        const search = document.getElementById('usersSearch');
        const statusFilter = document.getElementById('usersStatusFilter');
        const typeFilter = document.getElementById('usersTypeFilter');

        if (search && search.value) {
            url += `&search=${encodeURIComponent(search.value)}`;
        }

        if (statusFilter && statusFilter.value !== 'all') {
            url += `&status=${statusFilter.value}`;
        }

        if (typeFilter && typeFilter.value !== 'all') {
            url += `&user_type=${typeFilter.value}`;
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            displayAllUsers(data.items || []);
            setupPagination('usersPagination', data.pages || 1, page, loadAllUsers);
        } else {
            console.error('İstifadəçilər alınarkən xəta:', response.status);
            showError('İstifadəçilər alına bilmədi');
        }
    } catch (error) {
        console.error('İstifadəçilər yüklənərkən xəta:', error);
        showError('İstifadəçilər yüklənərkən xəta baş verdi.');
    }
}

function displayAllUsers(users) {
    const tbody = document.getElementById('allUsersBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!users || users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center">İstifadəçi tapılmadı</td>
            </tr>
        `;
        return;
    }

    users.forEach(user => {
        const statusClass = user.is_active ? 'status-active' :
                          user.status === 'rejected' ? 'status-rejected' : 'status-pending';
        const statusText = user.is_active ? 'Aktiv' :
                          user.status === 'rejected' ? 'Rədd edilib' : 'Gözləmədə';
        const date = formatDate(user.created_at);
        const userType = getUserTypeText(user.user_type);

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.id || '-'}</td>
            <td>${user.ceo_name || user.name || ''} ${user.ceo_lastname || user.surname || ''}</td>
            <td>${user.ceo_email || user.email || '-'}</td>
            <td>${user.ceo_phone || user.phone || '-'}</td>
            <td>${userType}</td>
            <td>${user.company_name || '-'}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td>${date}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn view" onclick="viewUser(${user.id})" title="Bax">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn edit" onclick="editUser(${user.id})" title="Redaktə et">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" onclick="showDeleteUserModal(${user.id})" title="Sil">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// İstifadəçi axtarışı
window.searchUsers = function() {
    loadAllUsers(1);
};

// İstifadəçiə baxış
window.viewUser = async function(id) {
    try {
        const token = localStorage.getItem('guven_token');
        if (!token) return;

        const response = await fetch(`${API_BASE}/api/v1/admin/users/${id}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const user = await response.json();
            const detailsDiv = document.getElementById('userDetails');
            if (detailsDiv) {
                detailsDiv.innerHTML = `
                    <div class="user-info-display">
                        <h4>İstifadəçi məlumatları</h4>
                        <div class="row">
                            <div class="col-md-6">
                                <p><strong>Ad:</strong> ${user.ceo_name || user.name || '-'}</p>
                                <p><strong>Soyad:</strong> ${user.ceo_lastname || user.surname || '-'}</p>
                                <p><strong>Email:</strong> ${user.ceo_email || user.email || '-'}</p>
                                <p><strong>Telefon:</strong> ${user.ceo_phone || user.phone || '-'}</p>
                                <p><strong>VÖEN:</strong> ${user.voen || '-'}</p>
                                <p><strong>FIN kodu:</strong> ${user.fin_code || '-'}</p>
                            </div>
                            <div class="col-md-6">
                                <p><strong>İstifadəçi tipi:</strong> ${getUserTypeText(user.user_type)}</p>
                                <p><strong>Vəzifə:</strong> ${user.position || '-'}</p>
                                <p><strong>Şirkət:</strong> ${user.company_name || '-'}</p>
                                <p><strong>Status:</strong> <span class="status-badge ${user.is_active ? 'status-active' : 'status-rejected'}">${user.is_active ? 'Aktiv' : 'Aktiv deyil'}</span></p>
                                <p><strong>Admin:</strong> ${user.is_admin ? 'Bəli' : 'Xeyr'}</p>
                                <p><strong>Super Admin:</strong> ${user.is_super_admin ? 'Bəli' : 'Xeyr'}</p>
                            </div>
                        </div>
                        <hr>
                        <div class="row">
                            <div class="col-md-6">
                                <p><strong>Doğum tarixi:</strong> ${user.birth_date || '-'}</p>
                                <p><strong>Cinsiyyət:</strong> ${user.gender || '-'}</p>
                                <p><strong>Email təsdiqlənib:</strong> ${user.email_verified ? 'Bəli' : 'Xeyr'}</p>
                            </div>
                            <div class="col-md-6">
                                <p><strong>Telefon təsdiqlənib:</strong> ${user.phone_verified ? 'Bəli' : 'Xeyr'}</p>
                                <p><strong>Qeydiyyat tarixi:</strong> ${formatDate(user.created_at)}</p>
                                <p><strong>Son giriş:</strong> ${user.last_login_at ? formatDate(user.last_login_at) : 'Heç vaxt'}</p>
                            </div>
                        </div>
                    </div>
                `;
            }
            openModal('viewUserModal');
        } else {
            showError('İstifadəçi məlumatları alına bilmədi');
        }
    } catch (error) {
        console.error('İstifadəçi məlumatları yüklənərkən xəta:', error);
        showError('İstifadəçi məlumatları yüklənərkən xəta baş verdi.');
    }
};

// İstifadəçi redaktəsi
window.editUser = async function(id) {
    selectedUserId = id;
    try {
        const token = localStorage.getItem('guven_token');
        if (!token) return;

        const response = await fetch(`${API_BASE}/api/v1/admin/users/${id}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const user = await response.json();
            const formDiv = document.getElementById('editUserForm');
            if (formDiv) {
                formDiv.innerHTML = `
                    <div class="form-group">
                        <label class="form-label">Ad *</label>
                        <input type="text" class="form-control" id="editUserName" value="${user.ceo_name || user.name || ''}" required>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Soyad</label>
                        <input type="text" class="form-control" id="editUserLastname" value="${user.ceo_lastname || user.surname || ''}">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Email *</label>
                        <input type="email" class="form-control" id="editUserEmail" value="${user.ceo_email || user.email || ''}" required>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Telefon nömrəsi *</label>
                        <input type="tel" class="form-control" id="editUserPhone" value="${user.ceo_phone || user.phone || ''}" required>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">VÖEN</label>
                        <input type="text" class="form-control" id="editUserVoen" value="${user.voen || ''}">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">FIN kodu</label>
                        <input type="text" class="form-control" id="editUserFinCode" value="${user.fin_code || ''}">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Vəzifə</label>
                        <input type="text" class="form-control" id="editUserPosition" value="${user.position || ''}">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">İstifadəçi tipi</label>
                        <select class="form-control" id="editUserType">
                            <option value="admin" ${user.user_type === 'admin' ? 'selected' : ''}>Admin</option>
                            <option value="company_admin" ${user.user_type === 'company_admin' ? 'selected' : ''}>Şirkət Admini</option>
                            <option value="employee" ${user.user_type === 'employee' ? 'selected' : ''}>İşçi</option>
                            <option value="ceo" ${user.user_type === 'ceo' ? 'selected' : ''}>CEO</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Şirkət</label>
                        <select class="form-control" id="editUserCompany">
                            <option value="">Seçin</option>
                        </select>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-4">
                            <div class="form-group">
                                <label class="form-label">Status</label>
                                <select class="form-control" id="editUserIsActive">
                                    <option value="true" ${user.is_active ? 'selected' : ''}>Aktiv</option>
                                    <option value="false" ${!user.is_active ? 'selected' : ''}>Aktiv deyil</option>
                                </select>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="form-group">
                                <label class="form-label">Admin</label>
                                <select class="form-control" id="editUserIsAdmin">
                                    <option value="true" ${user.is_admin ? 'selected' : ''}>Bəli</option>
                                    <option value="false" ${!user.is_admin ? 'selected' : ''}>Xeyr</option>
                                </select>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="form-group">
                                <label class="form-label">Super Admin</label>
                                <select class="form-control" id="editUserIsSuperAdmin">
                                    <option value="true" ${user.is_super_admin ? 'selected' : ''}>Bəli</option>
                                    <option value="false" ${!user.is_super_admin ? 'selected' : ''}>Xeyr</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Yeni şifrə (boş buraxın, dəyişmək istəmirsinizsə)</label>
                        <input type="password" class="form-control" id="editUserPassword">
                    </div>
                `;

                // Şirkətləri yüklə
                await loadCompaniesForEdit(user.company_id);
                openModal('editUserModal');
            }
        }
    } catch (error) {
        console.error('İstifadəçi məlumatları yüklənərkən xəta:', error);
        showError('İstifadəçi məlumatları yüklənərkən xəta baş verdi.');
    }
};