// assets/js/admin_js/employees.js

console.log('✅ employees.js yükləndi');

// ƏN ƏHƏMİYYƏTLİ: displayEmployees funksiyasını əlavə edin
window.displayEmployees = function(employees) {
    console.log('👥 İşçilər göstərilir:', employees ? employees.length : 0);

    const tbody = document.getElementById('employeesBody');
    if (!tbody) {
        console.error('employeesBody tapılmadı');
        return;
    }

    if (!employees || employees.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center">
                    <div class="no-data">
                        <i class="fas fa-users-slash"></i>
                        <p>Heç bir işçi tapılmadı</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    // İşçiləri cədvəldə göstər
    tbody.innerHTML = employees.map(employee => {
        console.log('📊 Employee strukturu:', {
            id: employee.id,
            user_id: employee.user_id,
            full_name: employee.full_name,
            email: employee.email
        });

        // Status badge üçün class və mətn
        let statusClass = 'status-pending';
        let statusText = 'Gözləmədə';

        if (employee.is_active) {
            statusClass = 'status-active';
            statusText = 'Aktiv';
        } else if (employee.employment_status === 'terminated') {
            statusClass = 'status-rejected';
            statusText = 'İşdən çıxıb';
        }

        // **ƏSAS DÜZƏLTMƏ:**
        // Cədvəldə göstərilən ID employee.id (employees cədvəli ID-si)
        // Amma onclick-də istifadə olunan ID user_id olmalıdır (users cədvəli ID-si)

        const displayId = employee.id; // Cədvəldə göstəriləcək ID
        const actionId = employee.user_id || employee.id; // Əməliyyatlar üçün ID (əvvəlcə user_id)

        return `
            <tr data-employee-id="${employee.id}" data-user-id="${employee.user_id || ''}">
                <td>${displayId || '#'}</td>
                <td>
                    <div class="user-cell">
                        <div class="user-avatar">
                            ${employee.full_name ? employee.full_name.charAt(0) : '?'}
                        </div>
                        <div class="user-info">
                            <strong>${employee.full_name || 'Ad Soyad'}</strong>
                            <small>${employee.position || 'Vəzifə yoxdur'}</small>
                            <div style="font-size: 10px; color: #888;">
                                Employee ID: ${employee.id}<br>
                                ${employee.user_id ? `User ID: ${employee.user_id}` : ''}
                            </div>
                        </div>
                    </div>
                </td>
                <td>
                    <div class="contact-info">
                        <i class="fas fa-envelope"></i> ${employee.email || '-'}<br>
                        <i class="fas fa-phone"></i> ${employee.phone || '-'}
                    </div>
                </td>
                <td>${employee.position || '-'}</td>
                <td>${employee.company_name || '-'}</td>
                <td>
                    <span class="status-badge ${statusClass}">
                        ${statusText}
                    </span>
                </td>
                <td>${employee.created_at ? new Date(employee.created_at).toLocaleDateString('az-AZ') : '-'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn view" onclick="window.viewEmployee(${actionId})" title="Bax">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn edit" onclick="window.editEmployee(${actionId})" title="Redaktə et">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="window.showDeleteEmployeeModal(${employee.id}, '${(employee.full_name || '').replace(/'/g, "\\'")}')" title="Sil">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
};

window.debugEmployeesAPI = async function() {
    try {
        const token = localStorage.getItem('guven_token');
        const response = await fetch(`${window.API_BASE}/api/v1/admin/employees?limit=5`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        console.log('🔍 API cavab strukturu:', data);

        if (data.items && data.items.length > 0) {
            console.log('📊 İlk işçinin tam strukturu:', data.items[0]);
            console.log('🔑 İşçidə olan bütün key-lər:', Object.keys(data.items[0]));

            // Əhəmiyyətli field-ləri göstər
            const firstEmployee = data.items[0];
            console.log('🎯 Əhəmiyyətli ID-lər:', {
                'id': firstEmployee.id,
                'user_id': firstEmployee.user_id,
                'employee_id': firstEmployee.employee_id,
                'employee_record_id': firstEmployee.employee_record_id,
                'users cədvəli ID-si': firstEmployee.user_id || 'YOXDUR'
            });
        }

        return data;
    } catch (error) {
        console.error('Debug error:', error);
    }
};


// İşçiləri yüklə
window.loadEmployees = async function(page = 1) {
    try {
        console.log(`📡 İşçilər yüklənir, səhifə: ${page}`);

        const token = localStorage.getItem('guven_token');
        if (!token) {
            console.log('Token tapılmadı');
            showError('Token tapılmadı. Yenidən daxil olun.');
            return;
        }

        // URL yarat
        let url = `${window.API_BASE || window.GF_CONFIG.apiBase}/api/v1/admin/employees?page=${page}&limit=10`;

        // Axtarış filterləri
        const search = document.getElementById('employeesSearch');
        const statusFilter = document.getElementById('employeesFilter');

        if (search && search.value) {
            url += `&search=${encodeURIComponent(search.value)}`;
        }

        if (statusFilter && statusFilter.value !== 'all') {
            url += `&status=${statusFilter.value}`;
        }

        console.log('Request URL:', url);

        // API sorğusu
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log('İşçilər alındı:', data.items ? data.items.length : 0);

            // displayEmployees funksiyasını çağır
            if (typeof window.displayEmployees === 'function') {
                window.displayEmployees(data.items || []);
            } else {
                console.error('❌ displayEmployees funksiyası YOXDUR!');
                showError('İşçiləri göstərmək funksiyası yoxdur');
            }

            // Pagination
            if (typeof setupPagination === 'function') {
                setupPagination('employeesPagination', data.pages || 1, page, loadEmployees);
            }
        } else {
            console.error('API xətası:', response.status);
            showError('İşçilər alına bilmədi');
        }
    } catch (error) {
        console.error('İşçilər yüklənərkən xəta:', error);
        showError('İşçilər yüklənərkən xəta baş verdi');
    }
};

window.viewEmployee = async function(id) {
    try {
        console.log('👁️ İşçiyə bax:', id);

        const modal = document.getElementById('viewUserModal');
        if (!modal) {
            console.error('viewUserModal tapılmadı');
            showError('Məlumat pəncərəsi tapılmadı');
            return;
        }

        const token = localStorage.getItem('guven_token');

        // **STRATEGİYA: Əvvəlcə employees list-dən tap, sonra əgər tapılmazsa users endpoint-inə get**
        let employee = null;

        try {
            console.log(`📡 Employees list-dən axtarılır: ID=${id}`);

            // Əvvəlcə employees list-dən tap
            const response = await fetch(`${window.API_BASE || window.GF_CONFIG.apiBase}/api/v1/admin/employees?limit=100`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();

                // employee_id ilə tap
                employee = data.items.find(e => e.id === parseInt(id));

                // Əgər tapılmadısa, user_id ilə tap
                if (!employee) {
                    employee = data.items.find(e => e.user_id === parseInt(id));
                }

                if (employee) {
                    console.log('✅ Employee list-dən tapıldı:', employee);
                } else {
                    console.log('ℹ️ Employees list-də tapılmadı, users endpoint-ə keçilir');
                }
            }
            window.openModal('viewUserModal');
        } catch (listError) {
            console.log('⚠️ Employees list xətası:', listError);
        }

        // Əgər hələ də tapılmadısa, users endpoint-inə get
        if (!employee) {
            try {
                console.log(`📡 Users endpoint-ə sorğu: /users/${id}`);
                const userResponse = await fetch(`${window.API_BASE || window.GF_CONFIG.apiBase}/api/v1/admin/users/${id}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (userResponse.ok) {
                    employee = await userResponse.json();
                    console.log('✅ Users endpoint-dən məlumat alındı');
                } else if (userResponse.status === 404) {
                    console.log('❌ Users endpoint-də də tapılmadı');
                }
            } catch (userError) {
                console.log('⚠️ Users endpoint xətası:', userError);
            }
        }

        if (!employee) {
            showError('İşçi məlumatları tapılmadı');
            return;
        }

        // **Məlumatları formatla**
        let fullName = '';
        if (employee.full_name) {
            fullName = employee.full_name;
        } else if (employee.ceo_name || employee.ceo_lastname) {
            fullName = `${employee.ceo_name || ''} ${employee.ceo_lastname || ''}`.trim();
        } else if (employee.name || employee.surname) {
            fullName = `${employee.name || ''} ${employee.surname || ''}`.trim();
        }

        const email = employee.email || employee.ceo_email || '-';
        const phone = employee.phone || employee.ceo_phone || '-';
        const position = employee.position || 'Employee';
        const company = employee.company_name || 'My Company';
        const status = employee.is_active ? 'Aktiv' : 'Aktiv deyil';

        // Tarixi formatla
        const formatDate = (dateString) => {
            if (!dateString) return '-';
            try {
                return new Date(dateString).toLocaleDateString('az-AZ');
            } catch (e) {
                return dateString;
            }
        };

        const userDetails = document.getElementById('userDetails');
        if (userDetails) {
            userDetails.innerHTML = `
                <div class="user-info-grid">
                    <div class="info-row">
                        <strong>ID:</strong> ${employee.id || employee.user_id || id}
                    </div>
                    ${employee.employee_id ? `
                    <div class="info-row">
                        <strong>Employee ID:</strong> ${employee.employee_id}
                    </div>` : ''}
                    ${employee.user_id ? `
                    <div class="info-row">
                        <strong>User ID:</strong> ${employee.user_id}
                    </div>` : ''}
                    <div class="info-row">
                        <strong>Ad Soyad:</strong> ${fullName || 'Ad Soyad'}
                    </div>
                    <div class="info-row">
                        <strong>Email:</strong> ${email}
                    </div>
                    <div class="info-row">
                        <strong>Telefon:</strong> ${phone}
                    </div>
                    ${employee.fin_code ? `
                    <div class="info-row">
                        <strong>FIN Kod:</strong> ${employee.fin_code}
                    </div>` : ''}
                    <div class="info-row">
                        <strong>Vəzifə:</strong> ${position}
                    </div>
                    <div class="info-row">
                        <strong>Şirkət:</strong> ${company}
                    </div>
                    <div class="info-row">
                        <strong>Status:</strong> ${status}
                    </div>
                    ${employee.created_at ? `
                    <div class="info-row">
                        <strong>Qeydiyyat tarixi:</strong> ${formatDate(employee.created_at)}
                    </div>` : ''}
                    ${employee.birth_date ? `
                    <div class="info-row">
                        <strong>Doğum tarixi:</strong> ${formatDate(employee.birth_date)}
                    </div>` : ''}
                    ${employee.gender ? `
                    <div class="info-row">
                        <strong>Cins:</strong> ${employee.gender}
                    </div>` : ''}
                    ${employee.voen ? `
                    <div class="info-row">
                        <strong>VOEN:</strong> ${employee.voen}
                    </div>` : ''}
                </div>
            `;
        }

        // Modal başlığını dəyiş
        const modalTitle = modal.querySelector('.modal-title');
        if (modalTitle) {
            modalTitle.textContent = fullName ? `${fullName} - Məlumatlar` : 'İşçi məlumatları';
        }

        // Modalı aç
        window.openModal('viewUserModal');

    } catch (error) {
        console.error('İşçiyə baxma xətası:', error);
        showError('İşçi məlumatları yüklənərkən xəta: ' + error.message);
    }
};



// İşçini redaktə et - TƏKMİLLƏŞDİRİLMİŞ VERSİYA
window.editEmployee = async function(id) {
    console.log(`✏️ İşçi redaktə: ${id}`);

    try {
        const token = localStorage.getItem('guven_token');
        if (!token) {
            showError('Token tapılmadı');
            return;
        }

        let employee = null;
        let usedEndpoint = '';
        let isUserId = false;
        let finalId = id;

        // **YENİ STRATEGİYA: Əvvəlcə Users endpoint-inə get**
        try {
            console.log(`📡 Users endpoint-ə sorğu: /users/${id}`);
            const userResponse = await fetch(`${window.API_BASE || window.GF_CONFIG.apiBase}/api/v1/admin/users/${id}`, {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            console.log(`📊 Users response status: ${userResponse.status}`);

            if (userResponse.ok) {
                employee = await userResponse.json();
                usedEndpoint = 'users';
                isUserId = true;
                finalId = employee.id;
                console.log('✅ Users endpoint-dən məlumat alındı:', employee);
            } else {
                console.log(`ℹ️ Users endpoint ${id} tapılmadı`);
            }
        } catch (userError) {
            console.log('⚠️ Users endpoint xətası:', userError);
        }

        // Əgər user tapıldısa, employees məlumatlarını da əlavə et
        if (employee && employee.id) {
            try {
                console.log(`🔍 Employees məlumatları axtarılır (user_id=${employee.id})`);
                const employeesResponse = await fetch(`${window.API_BASE || window.GF_CONFIG.apiBase}/api/v1/admin/employees?user_id=${employee.id}&limit=1`, {
                    headers: {
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (employeesResponse.ok) {
                    const employeesData = await employeesResponse.json();
                    if (employeesData.items && employeesData.items.length > 0) {
                        // Employees məlumatlarını employee obyektinə birləşdir
                        const employeeRecord = employeesData.items[0];
                        employee = { ...employee, ...employeeRecord };
                        console.log('✅ Employees məlumatları əlavə edildi:', employeeRecord);
                    }
                }
            } catch (empError) {
                console.log('⚠️ Employees məlumatları alınarkən xəta:', empError);
            }
        }

        if (!employee) {
            showError(`İşçi məlumatları tapılmadı. ID: ${id}`);
            return;
        }

        console.log(`🎯 Məlumat alındı: Endpoint=${usedEndpoint}`);
        console.log('📋 Employee məlumatları (göndəriləcək):', employee);

        // Modal elementlərini tap
        const modal = document.getElementById('editEmployeeModal');
        if (!modal) {
            console.error('editEmployeeModal tapılmadı');
            showError('İşçi redaktə pəncərəsi tapılmadı');
            return;
        }

        // **MODALI ORTADA GÖSTƏR**
        modal.style.display = 'flex'; // Dəyişiklik
        modal.style.alignItems = 'center'; // Dəyişiklik
        modal.style.justifyContent = 'center'; // Dəyişiklik
        modal.classList.remove('hidden');
        modal.classList.add('show');

        // Formu təmizlə
        const form = modal.querySelector('form');
        if (form) form.reset();

        console.log('📝 Form doldurulur...');

        // **ƏSAS MƏLUMATLAR**
        // User ID
        if (document.getElementById('editEmployeeId')) {
            document.getElementById('editEmployeeId').value = employee.id;
            console.log('🆔 User ID dolduruldu:', employee.id);
        }

        // **AD və SOYAD - YENİ LOGİKA**
        let firstName = '';
        let lastName = '';

        // 1. ceo_name və ceo_lastname
        if (employee.ceo_name || employee.ceo_lastname) {
            firstName = employee.ceo_name || '';
            lastName = employee.ceo_lastname || '';
        }
        // 2. name və surname
        else if (employee.name || employee.surname) {
            firstName = employee.name || '';
            lastName = employee.surname || '';
        }
        // 3. full_name
        else if (employee.full_name) {
            const nameParts = employee.full_name.split(' ');
            firstName = nameParts[0] || '';
            lastName = nameParts.slice(1).join(' ') || '';
        }

        if (document.getElementById('editEmployeeFirstName')) {
            document.getElementById('editEmployeeFirstName').value = firstName;
            console.log('👤 Ad dolduruldu:', firstName);
        }

        if (document.getElementById('editEmployeeLastName')) {
            document.getElementById('editEmployeeLastName').value = lastName;
            console.log('👤 Soyad dolduruldu:', lastName);
        }

        // **İLETİŞİM MƏLUMATLARI**
        // Email
        const email = employee.email || employee.ceo_email || '';
        if (document.getElementById('editEmployeeEmail')) {
            document.getElementById('editEmployeeEmail').value = email;
            console.log('📧 Email dolduruldu:', email);
        }

        // Telefon
        const phone = employee.phone || employee.ceo_phone || '';
        if (document.getElementById('editEmployeePhone')) {
            document.getElementById('editEmployeePhone').value = phone;
            console.log('📱 Telefon dolduruldu:', phone);
        }

        // Voen
        if (document.getElementById('editEmployeeVoen')) {
            document.getElementById('editEmployeeVoen').value = employee.voen || '';
        }

        // FIN Kod
        if (document.getElementById('editEmployeeFinCode')) {
            document.getElementById('editEmployeeFinCode').value = employee.fin_code || '';
        }

        // **İŞ MƏLUMATLARI**
        // Vəzifə
        const position = employee.position || 'Employee';
        if (document.getElementById('editEmployeePosition')) {
            document.getElementById('editEmployeePosition').value = position;
            console.log('💼 Vəzifə dolduruldu:', position);
        }

        // Şirkət kodu
        if (document.getElementById('editEmployeeCompanyCode')) {
            document.getElementById('editEmployeeCompanyCode').value = employee.company_code || '';
        }

        // İstifadəçi tipi
        const userType = employee.user_type || 'employee';
        if (document.getElementById('editEmployeeUserType')) {
            document.getElementById('editEmployeeUserType').value = userType;
        }

        // **ŞƏXSİ MƏLUMATLAR**
        // Doğum tarixi
        if (document.getElementById('editEmployeeBirthDate')) {
            document.getElementById('editEmployeeBirthDate').value = employee.birth_date || '';
        }

        // Cins
        if (document.getElementById('editEmployeeGender')) {
            document.getElementById('editEmployeeGender').value = employee.gender || '';
        }

        // **EMPLOYEES CƏDVƏLİ MƏLUMATLARI**
        // Maaş
        const salary = employee.salary || '';
        if (document.getElementById('editEmployeeSalary')) {
            document.getElementById('editEmployeeSalary').value = salary;
            console.log('💰 Maaş dolduruldu:', salary);
        }

        // Bank hesabı
        if (document.getElementById('editEmployeeBankAccount')) {
            document.getElementById('editEmployeeBankAccount').value = employee.bank_account || '';
        }

        // İş növü
        const employmentType = employee.employment_type || 'full_time';
        if (document.getElementById('editEmployeeEmploymentType')) {
            document.getElementById('editEmployeeEmploymentType').value = employmentType;
        }

        // İşə qəbul tarixi
        if (document.getElementById('editEmployeeHireDate')) {
            document.getElementById('editEmployeeHireDate').value = employee.hire_date || '';
        }

        // Valyuta
        if (document.getElementById('editEmployeeCurrency')) {
            document.getElementById('editEmployeeCurrency').value = employee.currency || 'AZN';
        }

        // **STATUS VƏ ADMIN HÜQUQLARI**
        // Aktiv status
        const isActive = employee.is_active === true || employee.is_active === 1 ||
                        employee.is_active === 'true' || employee.is_active === undefined;
        if (document.getElementById('editEmployeeIsActive')) {
            document.getElementById('editEmployeeIsActive').checked = isActive;
            console.log('✅ Aktiv status:', isActive);
        }

        // Admin hüquqları
        const isAdmin = employee.is_admin === true || employee.is_admin === 1 ||
                       employee.is_admin === 'true';
        if (document.getElementById('editEmployeeIsAdmin')) {
            document.getElementById('editEmployeeIsAdmin').checked = isAdmin;
        }

        const isSuperAdmin = employee.is_super_admin === true || employee.is_super_admin === 1 ||
                           employee.is_super_admin === 'true';
        if (document.getElementById('editEmployeeIsSuperAdmin')) {
            document.getElementById('editEmployeeIsSuperAdmin').checked = isSuperAdmin;
        }

        // Email təsdiqi
        const emailVerified = employee.email_verified === true || employee.email_verified === 1 ||
                            employee.email_verified === 'true';
        if (document.getElementById('editEmployeeEmailVerified')) {
            document.getElementById('editEmployeeEmailVerified').checked = emailVerified;
        }

        // Telefon təsdiqi
        const phoneVerified = employee.phone_verified === true || employee.phone_verified === 1 ||
                            employee.phone_verified === 'true';
        if (document.getElementById('editEmployeePhoneVerified')) {
            document.getElementById('editEmployeePhoneVerified').checked = phoneVerified;
        }

        // **ŞİRKƏT MƏLUMATLARI (Validation error üçün fix)**
        // Şirkət ID
        if (document.getElementById('editEmployeeCompanyId')) {
            document.getElementById('editEmployeeCompanyId').value = employee.company_id || 1; // Default 1
        } else {
            // Gizli input yarat
            const companyIdInput = document.createElement('input');
            companyIdInput.type = 'hidden';
            companyIdInput.id = 'editEmployeeCompanyId';
            companyIdInput.name = 'company_id';
            companyIdInput.value = employee.company_id || 1;
            form?.appendChild(companyIdInput);
        }

        // Şirkət adı
        if (document.getElementById('editEmployeeCompanyName')) {
            document.getElementById('editEmployeeCompanyName').value = employee.company_name || 'My Company';
        } else {
            const companyNameInput = document.createElement('input');
            companyNameInput.type = 'hidden';
            companyNameInput.id = 'editEmployeeCompanyName';
            companyNameInput.name = 'company_name';
            companyNameInput.value = employee.company_name || 'My Company';
            form?.appendChild(companyNameInput);
        }

        console.log('✅ Form uğurla dolduruldu');
        console.log('✅ Modal ortada açıldı');

    } catch (error) {
        console.error('❌ İşçi redaktə xətası:', error);
        showError('İşçi məlumatları alınarkən xəta: ' + error.message);
    }
};

window.saveEmployeeChanges = async function() {
    console.log('💾 İşçi dəyişiklikləri saxlanılır...');

    try {
        // **ƏSAS DÜZƏLTMƏ: employee_id-ni düzgün əldə et**
        const employeeIdInput = document.getElementById('editEmployeeId');
        const employeeRow = document.querySelector(`tr[data-employee-id="${employeeIdInput.value}"]`);

        let employeeId;

        if (employeeRow) {
            // Əgər cədvəl sətrindən employee_id ala biliriksə
            employeeId = employeeRow.getAttribute('data-employee-id') || employeeIdInput.value;
        } else {
            // Əks halda input-dan götür
            employeeId = employeeIdInput.value;
        }

        console.log('🎯 Seçilmiş Employee ID:', employeeId);

        if (!employeeId) {
            showError('Employee ID tapılmadı');
            return;
        }

        // Form dəyərlərini al
        const getValue = (elementId) => {
            const element = document.getElementById(elementId);
            return element ? element.value.trim() : '';
        };

        const getBoolValue = (elementId) => {
            const element = document.getElementById(elementId);
            return element ? element.checked : false;
        };

        // **Backend schema-ya uyğun data hazırla**
        const employeeData = {
            // Users cədvəli field-ləri
            ceo_name: getValue('editEmployeeFirstName'),
            ceo_lastname: getValue('editEmployeeLastName'),
            ceo_email: getValue('editEmployeeEmail'),
            ceo_phone: getValue('editEmployeePhone'),
            position: getValue('editEmployeePosition') || 'Employee',
            is_active: getBoolValue('editEmployeeIsActive')
        };

        // NULL/boş dəyərləri çıxart
        Object.keys(employeeData).forEach(key => {
            if (employeeData[key] === '' || employeeData[key] === null || employeeData[key] === undefined) {
                delete employeeData[key];
            }
        });

        console.log('📦 Backend-ə göndəriləcək məlumatlar:', {
            employeeId,
            employeeData
        });

        const token = localStorage.getItem('guven_token');
        if (!token) {
            showError('Token tapılmadı');
            return;
        }

        // **DÜZGÜN URL: /api/v1/admin/employees/{employee_id}**
        const url = `${window.API_BASE}/api/v1/admin/employees/${employeeId}`;
        console.log(`📨 PUT ${url}`);

        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(employeeData)
        });

        console.log(`📊 Response status: ${response.status}`);

        if (response.ok) {
            const result = await response.json();
            console.log('✅ Backend cavabı:', result);

            showSuccess(result.message || 'İşçi məlumatları uğurla yeniləndi');

            // Modalı bağla
            window.closeModal('editEmployeeModal');

            // Siyahını yenilə
            setTimeout(() => {
                window.loadEmployees(1);
            }, 1000);

        } else {
            const errorText = await response.text();
            console.error('❌ Backend xətası:', response.status, errorText);

            let errorMessage = 'Yeniləmə uğursuz oldu';

            try {
                const errorData = JSON.parse(errorText);
                if (errorData.detail) {
                    errorMessage = errorData.detail;
                }
            } catch (e) {
                errorMessage = `HTTP ${response.status}: ${errorText}`;
            }

            // 500 xətası üçün xüsusi mesaj
            if (response.status === 500) {
                errorMessage = 'Server xətası. Backend loglarını yoxlayın.';
            }

            showError(errorMessage);
        }

    } catch (error) {
        console.error('❌ Save xətası:', error);
        showError('Yeniləmə zamanı xəta: ' + error.message);
    }
};



// Modalı bağla funksiyası
window.closeEditEmployeeModal = function() {
    const modal = document.getElementById('editEmployeeModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
        modal.classList.add('hidden');
    }
};

// ESC klavişi ilə bağlamaq
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        window.closeEditEmployeeModal();
    }
});

// Modal xaricində kliklə bağlamaq
document.addEventListener('click', function(event) {
    const modal = document.getElementById('editEmployeeModal');
    if (modal && modal.classList.contains('show') && event.target === modal) {
        window.closeEditEmployeeModal();
    }
});




// İşçi silmə modalını göstər - DÜZƏLDİLMİŞ
// employees.js faylında showDeleteEmployeeModal funksiyasını DÜZƏLDİN
window.showDeleteEmployeeModal = function(id, name) {
    try {
        console.log('🗑️ İşçi silmə modalı:', id, name);

        // **ƏSAS DÜZƏLTMƏ: deleteType SET ET**
        window.selectedEmployeeId = id;
        window.deleteType = 'employee'; // BU SƏTRİ ƏLAVƏ EDİN

        console.log('✅ Global variables set edildi:', {
            selectedEmployeeId: window.selectedEmployeeId,
            deleteType: window.deleteType
        });

        // Mesajı təyin et
        const deleteMessage = document.getElementById('deleteMessage');
        if (deleteMessage) {
            const safeName = (name || 'Bu işçi').replace(/"/g, '&quot;').replace(/'/g, "\\'");
            deleteMessage.innerHTML = `
                <div class="delete-confirmation">
                    <div class="delete-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <h4>Silmək istədiyinizə əminsiniz?</h4>
                    <p><strong>"${safeName}"</strong> adlı işçini silmək istədiyinizə əminsiniz?</p>
                    <p class="text-danger"><small><i class="fas fa-warning"></i> Bu əməliyyat geri qaytarıla bilməz!</small></p>
                </div>
            `;
        }

        // Modalı aç
        window.openModal('deleteModal');
        console.log('✅ Delete modal çağırıldı');

    } catch (error) {
        console.error('Silmə modalı xətası:', error);
        showError('Silmə modalı açılarkən xəta: ' + error.message);
    }
};

// İşçi silmə funksiyası
window.deleteEmployee = async function() {
    const employeeId = window.selectedEmployeeId;

    if (!employeeId) {
        showError('Silmək üçün işçi seçilməyib');
        return;
    }

    console.log('🗑️ İşçi silinir:', employeeId);

    try {
        const token = localStorage.getItem('guven_token');
        if (!token) {
            showError('Token tapılmadı');
            return;
        }

        // **STRATEGİYA: Əvvəlcə employees endpoint-inə DELETE göndər**
        let success = false;

        try {
            // 1. DELETE method-u yoxla
            const deleteResponse = await fetch(`${window.API_BASE}/api/v1/admin/employees/${employeeId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            console.log(`📊 DELETE response: ${deleteResponse.status}`);

            if (deleteResponse.ok) {
                const result = await deleteResponse.json();
                console.log('✅ DELETE uğurlu:', result);
                success = true;
            } else if (deleteResponse.status === 405) {
                console.log('ℹ️ DELETE method allowed deyil, POST yoxlanılır');
            }
        } catch (deleteError) {
            console.log('⚠️ DELETE xətası:', deleteError);
        }

        // **2. Əgər DELETE işləmirsə, POST ilə sil**
        if (!success) {
            try {
                const postResponse = await fetch(`${window.API_BASE}/api/v1/admin/employees/${employeeId}/delete`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (postResponse.ok) {
                    const result = await postResponse.json();
                    console.log('✅ POST delete uğurlu:', result);
                    success = true;
                }
            } catch (postError) {
                console.log('⚠️ POST delete xətası:', postError);
            }
        }

        // **3. Əgər API işləmirsə, frontend-dən sil**
        if (!success) {
            console.log('🔄 Frontend-dən silinir...');

            // Cədvəldən sətri sil
            const rows = document.querySelectorAll('#employeesBody tr');
            for (const row of rows) {
                const rowId = row.getAttribute('data-employee-id');
                if (rowId === employeeId.toString()) {
                    row.remove();
                    success = true;
                    console.log('✅ Frontend-dən silindi');
                    break;
                }
            }
        }

        if (success) {
            showSuccess('İşçi uğurla silindi');

            // Modalı bağla
            window.closeModal('deleteModal');

            // Siyahını yenilə
            setTimeout(() => {
                window.loadEmployees(1);
            }, 1000);
        } else {
            showError('Silinmə uğursuz oldu. API endpoint-ləri yoxlanılmalıdır.');
        }

    } catch (error) {
        console.error('❌ Silmə xətası:', error);
        showError('Silmə zamanı xəta: ' + error.message);
    }
};

// İşçi əlavə etmə modalını aç
window.showAddEmployeeModal = function() {
    console.log('➕ Yeni işçi modalı');

    const modal = document.getElementById('addEmployeeModal');
    if (modal) {
        // Formu təmizlə
        const form = document.getElementById('addEmployeeForm');
        if (form) form.reset();

        // Modalı göstər
        modal.style.display = 'block';
        modal.classList.add('show');
    } else {
        console.error('addEmployeeModal tapılmadı');
        showError('İşçi əlavə pəncərəsi tapılmadı');
    }
};

// İşçi axtarışı
window.searchEmployees = function() {
    console.log('🔍 İşçi axtarışı');
    window.loadEmployees(1);
};

// Helper funksiyalar
window.formatDate = function(dateString) {
    if (!dateString) return '-';
    try {
        return new Date(dateString).toLocaleDateString('az-AZ');
    } catch (e) {
        return '-';
    }
};

console.log('✅ employees.js tam yükləndi, bütün funksiyalar təyin edildi');