// modal-forms.js - YALNIZ ƏSAS FUNKSİYALAR

// İstifadəçi məlumatlarını yüklə
async function loadApplicationInfo(applicationId) {
    try {
        const token = localStorage.getItem('guven_token');
        if (!token) return;

        console.log(`🔍 İstifadəçi məlumatları yüklənir: ID=${applicationId}`);

        const response = await fetch(`${API_BASE}/api/v1/admin/users/${applicationId}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const user = await response.json();
            const infoDiv = document.getElementById('currentApplicationInfo');
            if (infoDiv) {
                infoDiv.innerHTML = `
                    <div class="alert alert-info">
                        <p><strong>İstifadəçi:</strong> ${user.ceo_name || user.name || ''} ${user.ceo_lastname || user.surname || ''}</p>
                        <p><strong>Email:</strong> ${user.ceo_email || user.email || '-'}</p>
                        <p><strong>Şirkət:</strong> ${user.company_name || '-'}</p>
                        <p><strong>VÖEN:</strong> ${user.voen || '-'}</p>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('İstifadəçi məlumatları yüklənərkən xəta:', error);
    }
}

// Qərar təsdiqlə
window.submitApprovalDecision = async function() {
    try {
        const token = localStorage.getItem('guven_token');
        if (!token) {
            showError('Giriş etməlisiniz');
            return;
        }

        if (!selectedApplicationId) {
            showError('İstifadəçi seçilməyib');
            return;
        }

        const decision = document.getElementById('approvalDecision').value;
        const comment = document.getElementById('approvalComment').value;

        console.log(`🔍 Qərar təsdiqlənir: ID=${selectedApplicationId}, Qərar=${decision}`);

        const response = await fetch(`${API_BASE}/api/v1/admin/users/${selectedApplicationId}/review`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                decision: decision,
                comment: comment || ''
            })
        });

        if (response.ok) {
            const result = await response.json();
            showSuccess('Qərar uğurla təsdiqləndi.');
            closeModal('approveRejectModal');
            refreshData();
        } else {
            showError('Qərar təsdiqlənərkən xəta baş verdi.');
        }
    } catch (error) {
        console.error('Qərar təsdiqlənərkən xəta:', error);
        showError('Qərar təsdiqlənərkən xəta baş verdi.');
    }
};


window.confirmDelete = async function() {
    try {
        console.log('🗑️ Silinmə təsdiqlənir (modal-forms.js):', {
            deleteType: window.deleteType,
            companyId: window.selectedCompanyId,
            userId: window.selectedUserId,
            employeeId: window.selectedEmployeeId
        });

        const token = localStorage.getItem('guven_token');
        if (!token) {
            showError('Giriş etməlisiniz');
            return;
        }

        let url = '';
        let id = null;
        let elementType = '';

        // **1. ƏSAS YOXLANIŞ: Əvvəlcə employee yoxla**
        if (window.selectedEmployeeId) {
            id = window.selectedEmployeeId;
            elementType = 'employee';
            url = `${window.API_BASE}/api/v1/admin/employees/${id}`;
        }
        // **2. deleteType ilə yoxla**
        else if (window.deleteType === 'company' && window.selectedCompanyId) {
            id = window.selectedCompanyId;
            elementType = 'company';
            url = `${window.API_BASE}/api/v1/admin/companies/${id}`;
        }
        else if (window.deleteType === 'user' && window.selectedUserId) {
            id = window.selectedUserId;
            elementType = 'user';
            url = `${window.API_BASE}/api/v1/admin/users/${id}`;
        }
        else if (window.deleteType === 'employee' && window.selectedEmployeeId) {
            id = window.selectedEmployeeId;
            elementType = 'employee';
            url = `${window.API_BASE}/api/v1/admin/employees/${id}`;
        }
        else {
            console.error('❌ Silinəcək element tapılmadı. Global variables:', {
                deleteType: window.deleteType,
                selectedCompanyId: window.selectedCompanyId,
                selectedUserId: window.selectedUserId,
                selectedEmployeeId: window.selectedEmployeeId
            });
            showError('Silinəcək element tapılmadı. Yenidən cəhd edin.');
            return;
        }

        console.log(`🗑️ ${elementType} silinir:`, id, 'URL:', url);

        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        console.log(`📊 ${elementType} delete response: ${response.status}`);

        if (response.ok) {
            const result = await response.json();
            console.log(`✅ ${elementType} silindi:`, result);

            showSuccess(result.message || `${elementType} uğurla silindi.`);

            // Modalı bağla
            if (typeof window.closeModal === 'function') {
                window.closeModal('deleteModal');
            } else {
                // Fallback
                const modal = document.getElementById('deleteModal');
                if (modal) modal.classList.add('hidden');
            }

            // Global dəyişənləri reset et
            window.selectedUserId = null;
            window.selectedCompanyId = null;
            window.selectedEmployeeId = null;
            window.deleteType = null;

            // Səhifə məlumatlarını yenilə
            if (elementType === 'employee') {
                if (typeof window.loadEmployees === 'function') {
                    setTimeout(() => window.loadEmployees(1), 1000);
                }
            } else if (elementType === 'company') {
                if (typeof window.loadCompanies === 'function') {
                    setTimeout(() => window.loadCompanies(1), 1000);
                }
            } else if (elementType === 'user') {
                if (typeof window.loadUsers === 'function') {
                    setTimeout(() => window.loadUsers(1), 1000);
                }
            }

        } else {
            let errorMessage = `${elementType} silinərkən xəta baş verdi.`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorData.detail || errorMessage;
            } catch (e) {
                errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            }

            // 405 xətası üçün xüsusi mesaj
            if (response.status === 405) {
                errorMessage = `DELETE method-u icazə verilmir. Backend developer ilə əlaqə saxlayın.`;
            }

            showError(errorMessage);
            console.error(`❌ ${elementType} delete error:`, response.status, errorMessage);
        }
    } catch (error) {
        console.error('Silinərkən xəta:', error);
        showError('Element silinərkən xəta baş verdi: ' + error.message);
    }
};