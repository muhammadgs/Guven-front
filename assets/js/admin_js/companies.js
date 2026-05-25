// assets/js/admin_js/companies.js - TAM VERSİYA
let allCompanies = [];
let currentCompanySearchTerm = '';
let currentCompanyFilter = 'all';
let currentCompanyPage = 1;

console.log('✅ companies.js yükləndi');

// Şirkətləri yüklə
window.loadCompanies = async function(page = 1) {
    try {
        currentCompanyPage = page;

        const API_BASE = window.API_BASE || window.GF_CONFIG.apiBase;
        const token = localStorage.getItem('guven_token');

        // Axtarış parametrlərini əlavə et
        let url = `${API_BASE}/api/v1/admin/companies?page=${page}&limit=10`;

        // Axtarış sözünü əlavə et
        if (currentCompanySearchTerm.trim()) {
            url += `&search=${encodeURIComponent(currentCompanySearchTerm.trim())}`;
        }

        // Filter əlavə et
        if (currentCompanyFilter !== 'all') {
            url += `&is_active=${currentCompanyFilter === 'active' ? 'true' : 'false'}`;
        }

        console.log(`📡 Şirkət axtarış URL: ${url}`);

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`Axtarış nəticələri:`, data);

        // Əgər axtarış varsa və nəticə yoxdursa mesaj göstər
        if (currentCompanySearchTerm && (!data.items || data.items.length === 0)) {
            displayCompanies([]);
            if (typeof showInfo === 'function') {
                showInfo(`"${currentCompanySearchTerm}" üçün nəticə tapılmadı`);
            }
        } else {
            displayCompanies(data.items || []);
        }

        // Pagination yarat
        if (data.total && data.per_page) {
            setupCompaniesPagination(data.total, data.per_page);
        }

    } catch (error) {
        console.error('Şirkətlər yüklənərkən xəta:', error);
        if (typeof showError === 'function') {
            showError('Şirkətlər yüklənərkən xəta: ' + error.message);
        }
    }
};

window.resetCompaniesSearch = function() {
    try {
        const searchInput = document.getElementById('companiesSearch');
        const filterSelect = document.getElementById('companiesFilter');

        if (searchInput) searchInput.value = '';
        if (filterSelect) filterSelect.value = 'all';

        currentCompanySearchTerm = '';
        currentCompanyFilter = 'all';
        currentCompanyPage = 1;

        loadCompanies(1);

        if (typeof showInfo === 'function') {
            showInfo('Axtarış sıfırlandı');
        }

    } catch (error) {
        console.error('Axtarış sıfırlama xətası:', error);
    }
};
// Pagination yarat
function setupCompaniesPagination(totalItems, itemsPerPage) {
    try {
        const pagination = document.getElementById('companiesPagination');
        if (!pagination) return;

        const totalPages = Math.ceil(totalItems / itemsPerPage);

        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }

        let paginationHTML = `
            <div class="pagination-info">
                Cəmi: ${totalItems} şirkət, Səhifə: ${currentCompanyPage}/${totalPages}
            </div>
            <div class="pagination-buttons">
        `;

        // Əvvəlki səhifə
        if (currentCompanyPage > 1) {
            paginationHTML += `
                <button class="pagination-btn" onclick="loadCompanies(${currentCompanyPage - 1})">
                    <i class="fas fa-chevron-left"></i>
                </button>
            `;
        }

        // Səhifə nömrələri
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentCompanyPage - 2 && i <= currentCompanyPage + 2)) {
                paginationHTML += `
                    <button class="pagination-btn ${i === currentCompanyPage ? 'active' : ''}" 
                            onclick="loadCompanies(${i})">
                        ${i}
                    </button>
                `;
            } else if (i === currentCompanyPage - 3 || i === currentCompanyPage + 3) {
                paginationHTML += `<span class="pagination-dots">...</span>`;
            }
        }

        // Növbəti səhifə
        if (currentCompanyPage < totalPages) {
            paginationHTML += `
                <button class="pagination-btn" onclick="loadCompanies(${currentCompanyPage + 1})">
                    <i class="fas fa-chevron-right"></i>
                </button>
            `;
        }

        paginationHTML += '</div>';
        pagination.innerHTML = paginationHTML;

    } catch (error) {
        console.error('Pagination xətası:', error);
    }
}


// Şirkətləri göstər
function displayCompanies(companies) {
    const tbody = document.getElementById('companiesBody');
    if (!tbody) {
        console.error('companiesBody elementi tapılmadı');
        return;
    }

    tbody.innerHTML = '';

    if (!companies || companies.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" class="text-center py-4">
                    <div class="alert alert-info mb-0">
                        <i class="fas fa-info-circle me-2"></i>
                        Şirkət tapılmadı
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    companies.forEach(company => {
        const statusClass = company.is_active ? 'status-active' : 'status-rejected';
        const statusText = company.is_active ? 'Aktiv' : 'Aktiv deyil';
        const date = company.created_at ? formatDate(company.created_at) : '-';

        const row = document.createElement('tr');

        row.innerHTML = `
            <td>${company.id || '-'}</td>
            <td><strong>${company.company_name || company.name || '-'}</strong></td>
            <td><code>${company.company_code || company.code || '-'}</code></td>
            <td>${company.voen || '-'}</td>
            <td>${company.ceo_name || '-'}</td>
            <td>${company.address || '-'}</td>
            <td>${company.phone || '-'}</td>
            <td>${company.email || '-'}</td>
            <td>
                <span class="status-badge ${statusClass}">
                    <i class="fas fa-${company.is_active ? 'check-circle' : 'times-circle'}"></i>
                    ${statusText}
                </span>
            </td>
            <td>${date}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn view" onclick="viewCompany(${company.id})" title="Bax">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn edit" onclick="editCompany(${company.id})" title="Redaktə et">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" onclick="showDeleteCompanyModal(${company.id}, '${(company.company_name || company.name || '').replace(/'/g, "\\'")}')" title="Sil">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;

        tbody.appendChild(row);
    });

    console.log(`📊 ${companies.length} şirkət göstərildi`);
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

// Şirkətə bax
window.viewCompany = async function(id) {
    try {
        console.log('👁️ Şirkətə bax:', id);

        const modal = document.getElementById('viewUserModal');
        if (!modal) {
            console.error('viewUserModal tapılmadı');
            if (typeof showError === 'function') {
                showError('Məlumat pəncərəsi tapılmadı');
            }
            return;
        }

        const API_BASE = window.API_BASE || window.GF_CONFIG.apiBase;
        const token = localStorage.getItem('guven_token');
        const response = await fetch(`${API_BASE}/api/v1/admin/companies/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const company = await response.json();
            const userDetails = document.getElementById('userDetails');
            if (userDetails) {
                userDetails.innerHTML = `
                    <div class="user-info-grid">
                        <div class="info-row">
                            <strong>ID:</strong> ${company.id || '-'}
                        </div>
                        <div class="info-row">
                            <strong>Şirkət adı:</strong> ${company.company_name || company.name || '-'}
                        </div>
                        <div class="info-row">
                            <strong>Şirkət kodu:</strong> ${company.company_code || company.code || '-'}
                        </div>
                        <div class="info-row">
                            <strong>VÖEN:</strong> ${company.voen || '-'}
                        </div>
                        <div class="info-row">
                            <strong>CEO:</strong> ${company.ceo_name || '-'} ${company.ceo_lastname || ''}
                        </div>
                        <div class="info-row">
                            <strong>CEO Email:</strong> ${company.ceo_email || '-'}
                        </div>
                        <div class="info-row">
                            <strong>Ünvan:</strong> ${company.address || '-'}
                        </div>
                        <div class="info-row">
                            <strong>Telefon:</strong> ${company.phone || '-'}
                        </div>
                        <div class="info-row">
                            <strong>Email:</strong> ${company.email || '-'}
                        </div>
                        <div class="info-row">
                            <strong>Status:</strong> ${company.is_active ? 'Aktiv' : 'Aktiv deyil'}
                        </div>
                        <div class="info-row">
                            <strong>Qeydiyyat tarixi:</strong> ${company.created_at ? formatDate(company.created_at) : '-'}
                        </div>
                    </div>
                `;
            }

            const modalTitle = modal.querySelector('.modal-title');
            if (modalTitle) {
                modalTitle.textContent = 'Şirkət məlumatları';
            }

            if (typeof openModal === 'function') {
                openModal('viewUserModal');
            } else if (modal) {
                modal.classList.remove('hidden');
            }

        } else {
            throw new Error(`HTTP ${response.status}`);
        }

    } catch (error) {
        console.error('Şirkətə baxma xətası:', error);
        if (typeof showError === 'function') {
            showError('Şirkət məlumatları yüklənərkən xəta: ' + error.message);
        }
    }
};

// Yeni şirkət modalını göstər
window.showAddCompanyModal = function() {
    console.log('➕ Yeni şirkət modalı');

    const modal = document.getElementById('addCompanyModal');
    if (!modal) {
        console.error('addCompanyModal tapılmadı');
        if (typeof showError === 'function') {
            showError('Yeni şirkət pəncərəsi tapılmadı');
        }
        return;
    }

    if (typeof openModal === 'function') {
        openModal('addCompanyModal');
    } else if (modal) {
        modal.classList.remove('hidden');
    }
};

// Şirkət silmə modalı
window.showDeleteCompanyModal = function(id, name) {
    try {
        console.log('🗑️ Şirkət silmə modalı:', id);

        const modal = document.getElementById('deleteModal');
        if (!modal) {
            console.error('deleteModal tapılmadı');
            if (typeof showError === 'function') {
                showError('Silmə pəncərəsi tapılmadı');
            }
            return;
        }

        // GLOBAL dəyişənləri TƏMİZ TƏYİN ET
        window.selectedCompanyId = id;
        window.selectedUserId = null; // digərləri null et
        window.selectedEmployeeId = null; // digərləri null et
        window.deleteType = 'company'; // BU ÇÖX VACİBDİR

        console.log('Global dəyişənlər təyin edildi:', {
            deleteType: window.deleteType,
            companyId: window.selectedCompanyId,
            userId: window.selectedUserId,
            employeeId: window.selectedEmployeeId
        });

        // Mesajı təyin et
        const deleteMessage = document.getElementById('deleteMessage');
        if (deleteMessage) {
            // Xüsusi simvolları escape et
            const safeName = (name || 'Bu şirkət')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');

            deleteMessage.innerHTML = `
                <p><strong>"${safeName}"</strong> adlı şirkəti silmək istədiyinizə əminsiniz?</p>
                <p class="text-danger"><small>Bu əməliyyat geri qaytarıla bilməz!</small></p>
            `;
        }

        if (typeof openModal === 'function') {
            openModal('deleteModal');
        } else if (modal) {
            modal.classList.remove('hidden');
        }

    } catch (error) {
        console.error('Silmə modalı xətası:', error);
        if (typeof showError === 'function') {
            showError('Silmə modalı açılarkən xəta: ' + error.message);
        }
    }
};

// Şirkət redaktə

// companies.js faylında editCompany funksiyasını yoxlayın

window.editCompany = async function(id) {
    try {
        console.log('✏️ Şirkət redaktə:', id);

        const modal = document.getElementById('editCompanyModal');
        if (!modal) {
            console.error('editCompanyModal tapılmadı');
            if (typeof showError === 'function') {
                showError('Redaktə pəncərəsi tapılmadı');
            }
            return;
        }

        const API_BASE = window.API_BASE || window.GF_CONFIG.apiBase;
        const token = localStorage.getItem('guven_token');
        const response = await fetch(`${API_BASE}/api/v1/admin/companies/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const company = await response.json();
            console.log('Redaktə üçün şirkət:', company);

            const editForm = document.getElementById('editCompanyForm');

            if (editForm) {
                // Yalnız bu field-ları göstərək
                editForm.innerHTML = `
                    <div class="form-group">
                        <label class="form-label">Şirkət adı *</label>
                        <input type="text" class="form-control" id="editCompanyName" 
                               value="${(company.company_name || '').replace(/"/g, '&quot;')}" required>
                    </div>

                    <div class="form-group">
                        <label class="form-label">VÖEN *</label>
                        <input type="text" class="form-control" id="editCompanyVoen" 
                               value="${(company.voen || '').replace(/"/g, '&quot;')}" required maxlength="10">
                    </div>

                    <div class="form-group">
                        <label class="form-label">Ünvan</label>
                        <input type="text" class="form-control" id="editCompanyAddress" 
                               value="${(company.address || '').replace(/"/g, '&quot;')}">
                    </div>

                    <div class="form-group">
                        <label class="form-label">Telefon</label>
                        <input type="tel" class="form-control" id="editCompanyPhone" 
                               value="${(company.phone || '').replace(/"/g, '&quot;')}">
                    </div>

                    <div class="form-group">
                        <label class="form-label">Email</label>
                        <input type="email" class="form-control" id="editCompanyEmail" 
                               value="${(company.email || '').replace(/"/g, '&quot;')}" 
                               placeholder="info@example.com">
                        <small class="form-text text-muted">Düzgün email formatında olmalıdır (nümunə: info@example.com)</small>
                    </div>

                    <div class="form-check">
                        <input type="checkbox" class="form-check-input" id="editCompanyIsActive" 
                               ${company.is_active ? 'checked' : ''}>
                        <label class="form-check-label">Aktiv</label>
                    </div>
                    
                    <input type="hidden" id="editCompanyId" value="${company.id}">
                    
                    <!-- INFO: Digər field-lar göndərilməyəcək -->
                    <div class="alert alert-info mt-3">
                        <i class="fas fa-info-circle"></i>
                        Qeyd: Yalnız bu sahələr redaktə edilə bilər.
                    </div>
                `;
            }

            // Seçilmiş şirkət ID-sini saxla
            window.selectedCompanyId = company.id;

            if (typeof openModal === 'function') {
                openModal('editCompanyModal');
            } else if (modal) {
                modal.classList.remove('hidden');
            }

        } else {
            throw new Error(`HTTP ${response.status}`);
        }

    } catch (error) {
        console.error('Şirkət redaktə xətası:', error);
        if (typeof showError === 'function') {
            showError('Şirkət məlumatları yüklənərkən xəta: ' + error.message);
        }
    }
};
// companies.js faylında saveCompanyChanges funksiyasını DÜZƏLDİN:

window.saveCompanyChanges = async function() {
    try {
        console.log('💾 Şirkət yeniləmə başladı...');

        const companyId = document.getElementById('editCompanyId')?.value || window.selectedCompanyId;
        if (!companyId) {
            showError('Şirkət ID-si tapılmadı');
            return;
        }

        const API_BASE = window.API_BASE || window.GF_CONFIG.apiBase;
        const token = localStorage.getItem('guven_token');

        if (!token) {
            showError('Token tapılmadı. Yenidən giriş edin.');
            return;
        }

        // Yalnız bu field-ları göndərək
        const formData = {
            company_name: document.getElementById('editCompanyName')?.value?.trim() || '',
            voen: document.getElementById('editCompanyVoen')?.value?.trim() || '',
            address: document.getElementById('editCompanyAddress')?.value?.trim() || '',
            phone: document.getElementById('editCompanyPhone')?.value?.trim() || '',
            email: document.getElementById('editCompanyEmail')?.value?.trim() || null, // null göndər
            is_active: document.getElementById('editCompanyIsActive')?.checked || true
        };

        console.log('📤 Göndəriləcək məlumatlar:', formData);

        // VALIDATION
        // 1. Zəruri sahələr
        if (!formData.company_name.trim()) {
            showError('Şirkət adı məcburidir');
            return;
        }

        if (!formData.voen.trim()) {
            showError('VÖEN məcburidir');
            return;
        }

        // 2. VÖEN validation
        if (formData.voen.length !== 10) {
            showError('VÖEN 10 rəqəmdən ibarət olmalıdır');
            return;
        }

        // 3. Email validation
        if (formData.email && formData.email.trim()) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formData.email)) {
                showError('Düzgün email ünvanı daxil edin (nümunə: info@example.com)');
                return;
            }
        } else {
            formData.email = null; // Boş email null göndərilsin
        }

        // 4. Boş string-ləri null-a çevir
        ['address', 'phone'].forEach(field => {
            if (formData[field] === '') {
                formData[field] = null;
            }
        });

        console.log('🔍 Son format:', formData);

        // Loading göstər
        const saveBtn = document.querySelector('#editCompanyModal .btn-primary');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saxlanılır...';
        }

        // PUT request göndər
        console.log('🚀 PUT request göndərilir...');
        const putResponse = await fetch(`${API_BASE}/api/v1/admin/companies/${companyId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });

        console.log('📨 Response status:', putResponse.status, putResponse.statusText);

        // Response-u oxu
        let responseData;
        try {
            responseData = await putResponse.json();
            console.log('📊 Response data:', responseData);
        } catch (e) {
            console.error('Response JSON parse xətası:', e);
        }

        if (putResponse.ok) {
            showSuccess('Şirkət məlumatları uğurla yeniləndi');
            closeModal('editCompanyModal');
            loadCompanies(); // Şirkət siyahısını yenilə
        } else {
            // Xəta məlumatlarını ətraflı göstər
            let errorMessage = `Server xətası (${putResponse.status}): ${putResponse.statusText}`;

            if (responseData) {
                if (responseData.detail) {
                    errorMessage = responseData.detail;
                } else if (responseData.message) {
                    errorMessage = responseData.message;
                }
            }

            console.error('❌ Server xətası detalları:', {
                status: putResponse.status,
                statusText: putResponse.statusText,
                data: responseData,
                sentData: formData
            });

            showError(errorMessage);
        }

    } catch (error) {
        console.error('💥 Şirkət yeniləmə xətası:', error);
        showError('Şirkət yenilənərkən xəta: ' + error.message);
    } finally {
        // Button-u yenidən aktiv et
        const saveBtn = document.querySelector('#editCompanyModal .btn-primary');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Yadda saxla';
        }
    }
};

// Axtarış funksiyasını DÜZƏLDİN
window.searchCompanies = function() {
    try {
        console.log('🔍 Şirkət axtarışı başladı...');

        // Axtarış dəyərlərini al
        const searchInput = document.getElementById('companiesSearch');
        const filterSelect = document.getElementById('companiesFilter');

        if (!searchInput || !filterSelect) {
            console.error('Axtarış elementləri tapılmadı');
            return;
        }

        // Global dəyişənlərə təyin et
        currentCompanySearchTerm = searchInput.value;
        currentCompanyFilter = filterSelect.value;
        currentCompanyPage = 1; // Axtarış zamanı 1-ci səhifəyə qayıt

        console.log('Axtarış parametrləri:', {
            search: currentCompanySearchTerm,
            filter: currentCompanyFilter,
            page: currentCompanyPage
        });

        // Axtarış edərkən loading göstər
        const tbody = document.getElementById('companiesBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="11" class="text-center py-5">
                        <div class="loading-spinner">
                            <i class="fas fa-spinner fa-spin fa-2x"></i>
                            <p class="mt-2">Axtarılır...</p>
                        </div>
                    </td>
                </tr>
            `;
        }

        // Axtarış nəticələrini yüklə
        loadCompanies(1);

    } catch (error) {
        console.error('Axtarış xətası:', error);
        if (typeof showError === 'function') {
            showError('Axtarış zamanı xəta: ' + error.message);
        }
    }
};

// DOM yüklənəndə event listener-lar əlavə et
document.addEventListener('DOMContentLoaded', function() {
    console.log('companies.js DOM ready');

    // Enter düyməsi ilə axtarış
    const searchInput = document.getElementById('companiesSearch');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchCompanies();
            }
        });

        // Clear button əlavə et
        searchInput.insertAdjacentHTML('afterend', `
            <button class="btn btn-secondary ml-2" onclick="resetCompaniesSearch()" 
                    title="Axtarışı sıfırla" style="display: none;" id="clearSearchBtn">
                <i class="fas fa-times"></i>
            </button>
        `);

        // Input dəyişəndə clear button göstər/gizlət
        searchInput.addEventListener('input', function() {
            const clearBtn = document.getElementById('clearSearchBtn');
            if (clearBtn) {
                clearBtn.style.display = this.value.trim() ? 'inline-block' : 'none';
            }
        });
    }

    // Səhifə yüklənəndə şirkətləri yüklə
    loadCompanies(1);
});