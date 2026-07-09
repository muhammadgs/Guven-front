// assets/js/admin_js/partners.js

console.log('🚀 partners.js başladı');

let partnersData = [];
let currentPartnerId = null;

// Helper funksiyalar
function showSuccess(msg) { console.log('✅', msg); alert('✅ ' + msg); }
function showError(msg) { console.error('❌', msg); alert('❌ ' + msg); }
function showWarning(msg) { console.warn('⚠️', msg); alert('⚠️ ' + msg); }

// ============ PARTNYORLARI YÜKLƏ ============
window.loadPartners = async function() {
    console.log('🔄 Partnyorlar yüklənir...');

    try {
        const token = localStorage.getItem('auth_token') || localStorage.getItem('guven_token');
        const apiUrl = '/proxy.php/api/v1/main_company_partners/admin?page=1&per_page=100';

        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        console.log('📦 API cavabı:', result);

        let partners = [];

        if (result.success && result.data) {
            partners = Array.isArray(result.data) ? result.data : [];
        } else if (Array.isArray(result)) {
            partners = result;
        }

        console.log(`📊 ${partners.length} partnyor tapıldı`);

        partnersData = partners.map(p => ({
            id: p.id,
            name: p.name || 'Adsız',
            logo: p.logo || '',
            website: p.website || '',
            order: p.order || 1,
            active: p.active === true || p.status === 'active'
        }));

        renderPartnersTable();
        updatePartnerPreview();

        localStorage.setItem('guvenfinans-partners', JSON.stringify(partnersData));
        console.log(`✅ ${partnersData.length} partnyor yükləndi`);

    } catch (error) {
        console.error('❌ Yükləmə xətası:', error);
        showError('Partnyorlar yüklənmədi: ' + error.message);
        loadPartnersFromLocalStorage();
    }
};

// ============ LOKAL STORAGE ============
function loadPartnersFromLocalStorage() {
    const saved = localStorage.getItem('guvenfinans-partners');
    if (saved) {
        try {
            partnersData = JSON.parse(saved);
            renderPartnersTable();
            updatePartnerPreview();
            showWarning('Lokal yaddaşdan yükləndi');
        } catch (e) {
            partnersData = [];
        }
    } else {
        partnersData = [];
        renderPartnersTable();
        updatePartnerPreview();
    }
}

// ============ CƏDVƏL ============
function renderPartnersTable() {
    const tbody = document.getElementById('partnersListBody');
    if (!tbody) return;

    if (partnersData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Heç bir partnyor tapılmadı</td></tr>';
        return;
    }

    let html = '';
    partnersData.sort((a, b) => (a.order || 999) - (b.order || 999)).forEach((p, i) => {
        let logoUrl = p.logo || '';
        if (logoUrl && logoUrl.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)) {
            logoUrl = `/proxy.php/api/v1/files/${logoUrl}/download`;
        }
        const placeholder = getPlaceholderForPartner(p.name);

        html += `<tr data-partner-id="${p.id}">
            <td>${i+1}</td>
            <td><strong>${p.name}</strong></td>
            <td>
                <div style="width:60px;height:40px;display:flex;align-items:center;justify-content:center;border:1px solid #ddd;border-radius:4px;overflow:hidden;background:#f8f9fa;">
                    ${logoUrl ? 
                        `<img src="${logoUrl}" alt="${p.name}" 
                              style="max-width:55px;max-height:35px;object-fit:contain;"
                              onerror="this.onerror=null; this.src='${placeholder}'">` : 
                        `<img src="${placeholder}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;">`
                    }
                </div>
            </td>
            <td>
                ${p.website ? 
                    `<a href="${p.website}" target="_blank" class="text-primary" style="font-size:12px;word-break:break-all;">${p.website}</a>` : 
                    '<span class="text-muted">Website yoxdur</span>'
                }
            </td>
            <td>${p.order || 1}</td>
            <td>
                <span class="badge ${p.active ? 'badge-success' : 'badge-secondary'}">
                    ${p.active ? 'Aktiv' : 'Deaktiv'}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editPartner(${p.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deletePartner(${p.id})">
                    <i class="fas fa-trash"></i>
                </button>
                <button class="btn btn-sm btn-warning" onclick="togglePartnerActive(${p.id})">
                    <i class="fas fa-power-off"></i>
                </button>
            </td>
        </tr>`;
    });

    tbody.innerHTML = html;
    console.log('✅ Partnyor cədvəli render edildi');
}

// ============ PREVIEW ============
function updatePartnerPreview(partner = null) {
    const preview = document.getElementById('partnerPreview');
    if (!preview) return;

    if (!partner) {
        preview.innerHTML = '<div style="padding:40px;text-align:center;">Partnyor seçin</div>';
        return;
    }

    let logoUrl = partner.logo || '';
    if (logoUrl && logoUrl.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)) {
        logoUrl = `/proxy.php/api/v1/files/${logoUrl}/download`;
    }
    const placeholder = getPlaceholderForPartner(partner.name);

    preview.innerHTML = `<div style="display:flex;align-items:center;gap:15px;">
                        <div style="width:80px;height:60px;display:flex;align-items:center;justify-content:center;border:1px solid #ddd;border-radius:4px;overflow:hidden;background:#f8f9fa;">
                            ${logoUrl ? 
                                `<img src="${logoUrl}" alt="${partner.name}" 
                                      style="max-width:70px;max-height:50px;object-fit:contain;"
                                      onerror="this.onerror=null; this.src='${placeholder}'">` : 
                                `<img src="${placeholder}" alt="${partner.name}" style="width:100%;height:100%;object-fit:cover;">`
                            }
                        </div>
                        <div>
                            <h4>${partner.name}</h4>
                            <p>${partner.website || ''}</p>
                            <p>Status: ${partner.active ? 'Aktiv' : 'Deaktiv'}</p>
                        </div>
                    </div>`;
}

// ============ MODAL AÇ ============
window.showAddPartnerModal = function() {
    currentPartnerId = null;

    document.getElementById('partnerId').value = '';
    document.getElementById('partnerName').value = '';
    document.getElementById('partnerLogo').value = '';
    document.getElementById('partnerWebsite').value = '';
    document.getElementById('partnerOrder').value = partnersData.length > 0 ?
        Math.max(...partnersData.map(p => p.order || 1)) + 1 : 1;
    document.getElementById('partnerIsActive').checked = true;
    document.getElementById('partnerLogoPreviewContainer').style.display = 'none';
    document.getElementById('partnerRemoveLogoBtn').style.display = 'none';

    const modal = document.getElementById('partnerModal');
    if (modal) modal.classList.remove('hidden');
};

// ============ FAYL YÜKLƏ ============
window.showPartnerFileUploadModal = function() {
    console.log('🔘 showPartnerFileUploadModal çağırıldı');

    partnerUploadedUuid = null;
    partnerTempLogoUrl = null;

    const fileInput = document.getElementById('partnerFileInput');
    if (fileInput) fileInput.value = '';

    document.getElementById('partnerUploadProgress').style.display = 'none';
    document.getElementById('partnerUploadResult').style.display = 'none';
    document.getElementById('partnerUploadProgressBar').style.width = '0%';
    document.getElementById('partnerUploadPercent').textContent = '0%';

    const dropArea = document.getElementById('partnerFileDropArea');
    if (dropArea) {
        dropArea.style.borderColor = '#dee2e6';
        dropArea.style.background = 'transparent';
    }

    const modal = document.getElementById('partnerFileUploadModal');
    if (modal) modal.classList.remove('hidden');
};

async function uploadPartnerLogoFile(file) {
    console.log('📤 Partnyor logo yüklənir...', file.name);

    const progressContainer = document.getElementById('partnerUploadProgress');
    const progressBar = document.getElementById('partnerUploadProgressBar');
    const percentText = document.getElementById('partnerUploadPercent');
    const fileNameText = document.getElementById('partnerUploadFileName');

    progressContainer.style.display = 'block';
    fileNameText.textContent = file.name;

    if (!file.type.startsWith('image/')) {
        showError('Zəhmət olmasa şəkil faylı seçin (PNG, JPG, SVG, WebP)');
        progressContainer.style.display = 'none';
        return null;
    }

    if (file.size > 2 * 1024 * 1024) {
        showError('Fayl ölçüsü 2MB-dan çoxdur!');
        progressContainer.style.display = 'none';
        return null;
    }

    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', 'partner_logo');

        const token = localStorage.getItem('auth_token') || localStorage.getItem('guven_token');
        const response = await fetch('/proxy.php/api/v1/files/public-upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        progressBar.style.width = '70%';
        percentText.textContent = '70%';

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        console.log('📦 Yükləmə cavabı:', result);

        progressBar.style.width = '90%';
        percentText.textContent = '90%';

        if (result.success && result.data) {
            const fileData = result.data;
            let uuid = fileData.uuid || fileData.id || fileData.file_uuid || fileData.file_id;

            if (!uuid && fileData.download_url) {
                const match = fileData.download_url.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
                if (match) uuid = match[0];
            }

            if (!uuid && fileData.url) {
                const match = fileData.url.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
                if (match) uuid = match[0];
            }

            if (uuid) {
                partnerUploadedUuid = uuid;
                partnerTempLogoUrl = `/proxy.php/api/v1/files/${uuid}/download`;

                progressBar.style.width = '100%';
                percentText.textContent = '100%';

                setTimeout(() => {
                    document.getElementById('partnerUploadProgress').style.display = 'none';
                    document.getElementById('partnerUploadResult').style.display = 'block';
                    document.getElementById('partnerLogo').value = uuid;
                    showPartnerLogoPreview(partnerTempLogoUrl);
                    document.getElementById('partnerRemoveLogoBtn').style.display = 'inline-block';
                    showSuccess('Logo uğurla yükləndi!');
                }, 500);

                console.log('✅ Partnyor logo yükləndi, UUID:', uuid);
                return uuid;
            }

            console.warn('⚠️ UUID tapılmadı:', fileData);
            progressBar.style.width = '0%';
            percentText.textContent = '0%';
            progressContainer.style.display = 'none';
            showError('Fayl yükləndi, lakin UUID tapılmadı!');
            return null;
        }

        console.error('❌ Yükləmə uğursuz:', result);
        progressBar.style.width = '0%';
        percentText.textContent = '0%';
        progressContainer.style.display = 'none';
        showError('Fayl yüklənərkən xəta baş verdi!');
        return null;

    } catch (error) {
        console.error('❌ Yükləmə xətası:', error);
        progressBar.style.width = '0%';
        percentText.textContent = '0%';
        progressContainer.style.display = 'none';
        showError('Fayl yüklənərkən xəta baş verdi: ' + error.message);
        return null;
    }
}

function showPartnerLogoPreview(url) {
    const container = document.getElementById('partnerLogoPreviewContainer');
    const img = document.getElementById('partnerLogoPreviewImg');

    if (url) {
        if (img) {
            img.src = url;
            img.onerror = function() {
                this.style.display = 'none';
                this.parentElement.innerHTML = '<span class="text-muted">Preview yüklənmədi</span>';
            };
            img.style.display = 'block';
        }
        if (container) {
            container.style.display = 'block';
        }
    } else {
        if (container) {
            container.style.display = 'none';
        }
    }
}

window.removePartnerLogo = function() {
    console.log('🔘 removePartnerLogo çağırıldı');
    document.getElementById('partnerLogo').value = '';
    document.getElementById('partnerLogoPreviewContainer').style.display = 'none';
    document.getElementById('partnerRemoveLogoBtn').style.display = 'none';
    partnerUploadedUuid = null;
    partnerTempLogoUrl = null;
};

function getPlaceholderForPartner(name) {
    const colors = ['007bff', '28a745', 'dc3545', 'ffc107', '17a2b8', '6f42c1', 'fd7e14'];
    const color = colors[Math.abs(name.length) % colors.length];
    const text = name.substring(0, 3).toUpperCase();
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="150" height="80"><rect width="100%" height="100%" fill="%23${color}"/><text x="50%" y="50%" font-family="Arial" font-size="16" font-weight="bold" fill="white" text-anchor="middle" dy=".3em">${text}</text></svg>`;
}

// ============ YADDA SAXLA ============
window.savePartner = async function() {
    const id = document.getElementById('partnerId').value;
    const name = document.getElementById('partnerName').value.trim();
    const logo = document.getElementById('partnerLogo').value.trim();
    const website = document.getElementById('partnerWebsite').value.trim();
    const order = parseInt(document.getElementById('partnerOrder').value) || 1;
    const active = document.getElementById('partnerIsActive').checked;

    if (!name) {
        showError('Partnyor adı daxil edilməlidir!');
        return;
    }

    try {
        showSuccess('🚀 Partnyor yadda saxlanılır...');

        let logoUrl = logo;
        if (logoUrl && logoUrl.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)) {
            logoUrl = logoUrl;
        }

        const payload = {
            name: name,
            logo: logoUrl || '',
            website: website || '',
            order: order,
            active: active
        };

        console.log('📦 Göndərilən məlumat:', payload);

        const token = localStorage.getItem('auth_token') || localStorage.getItem('guven_token');
        let apiUrl = '/proxy.php/api/v1/main_company_partners/';
        let method = 'POST';

        if (id) {
            apiUrl = `/proxy.php/api/v1/main_company_partners/${id}/`;
            method = 'PUT';
        }

        const response = await fetch(apiUrl, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || errorData.message || `HTTP ${response.status}`);
        }

        const result = await response.json();
        console.log('✅ Cavab:', result);

        showSuccess(id ? '✅ Partnyor yeniləndi!' : '✅ Partnyor yaradıldı!');

        await window.loadPartners();

        const modal = document.getElementById('partnerModal');
        if (modal) modal.classList.add('hidden');

    } catch (error) {
        console.error('❌ Xəta:', error);
        showError('Xəta: ' + (error.message || 'Bilinməyən xəta'));
    }
};

// ============ REDAKTƏ ============
window.editPartner = function(id) {
    console.log('✏️ Partnyor redaktə edilir:', id);

    const partner = partnersData.find(p => p.id == id);
    if (!partner) {
        showError('Partnyor tapılmadı!');
        return;
    }

    currentPartnerId = id;

    document.getElementById('partnerId').value = partner.id || '';
    document.getElementById('partnerName').value = partner.name || '';
    document.getElementById('partnerWebsite').value = partner.website || '';
    document.getElementById('partnerOrder').value = partner.order || 1;
    document.getElementById('partnerIsActive').checked = partner.active === true;

    let logoUuid = partner.logo || '';
    document.getElementById('partnerLogo').value = logoUuid;

    if (logoUuid) {
        let logoUrl = logoUuid;
        if (logoUuid.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)) {
            logoUrl = `/proxy.php/api/v1/files/${logoUuid}/download`;
        }
        showPartnerLogoPreview(logoUrl);
        document.getElementById('partnerRemoveLogoBtn').style.display = 'inline-block';
    } else {
        document.getElementById('partnerLogoPreviewContainer').style.display = 'none';
        document.getElementById('partnerRemoveLogoBtn').style.display = 'none';
    }

    const modal = document.getElementById('partnerModal');
    if (modal) modal.classList.remove('hidden');
};

// ============ SİL - PROJECTS.JS KİMİ ============
window.deletePartner = async function(id) {
    if (!confirm('Partnyoru silmək istədiyinizə əminsiniz?')) return;

    try {
        const token = localStorage.getItem('auth_token') || localStorage.getItem('guven_token');
        const response = await fetch(`/proxy.php/api/v1/main_company_partners/${id}/`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 204) {
            await window.loadPartners();
            showSuccess('✅ Partnyor silindi!');
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || errorData.message || `HTTP ${response.status}`);
        }
    } catch (error) {
        console.error('❌ Silmə xətası:', error);
        showError('Silinmədi: ' + error.message);
    }
};

// ============ STATUS DƏYİŞ ============
window.togglePartnerActive = async function(id) {
    try {
        const partner = partnersData.find(p => p.id == id);
        if (!partner) {
            showError('Partnyor tapılmadı!');
            return;
        }

        const newStatus = !partner.active;
        const token = localStorage.getItem('auth_token') || localStorage.getItem('guven_token');

        const response = await fetch(`/proxy.php/api/v1/main_company_partners/${id}/`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                ...partner,
                active: newStatus
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        await window.loadPartners();
        showSuccess('✅ Status dəyişdirildi!');
    } catch (error) {
        console.error('❌ Status dəyişmə xətası:', error);
        showError('Xəta: ' + error.message);
    }
};

// ============ AXTAR ============
window.searchPartners = function() {
    const searchTerm = document.getElementById('partnerSearch').value.toLowerCase();
    const tbody = document.getElementById('partnersListBody');

    if (!searchTerm) {
        renderPartnersTable();
        return;
    }

    const filtered = partnersData.filter(p =>
        p.name.toLowerCase().includes(searchTerm) ||
        (p.website && p.website.toLowerCase().includes(searchTerm))
    );

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Axtarışa uyğun partnyor tapılmadı</td></tr>';
        return;
    }

    let html = '';
    filtered.sort((a, b) => (a.order || 999) - (b.order || 999)).forEach((p, i) => {
        let logoUrl = p.logo || '';
        if (logoUrl && logoUrl.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)) {
            logoUrl = `/proxy.php/api/v1/files/${logoUrl}/download`;
        }
        const placeholder = getPlaceholderForPartner(p.name);

        html += `<tr data-partner-id="${p.id}">
            <td>${i+1}</td>
            <td><strong>${p.name}</strong></td>
            <td>
                <div style="width:60px;height:40px;display:flex;align-items:center;justify-content:center;border:1px solid #ddd;border-radius:4px;overflow:hidden;background:#f8f9fa;">
                    ${logoUrl ? 
                        `<img src="${logoUrl}" alt="${p.name}" 
                              style="max-width:55px;max-height:35px;object-fit:contain;"
                              onerror="this.onerror=null; this.src='${placeholder}'">` : 
                        `<img src="${placeholder}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;">`
                    }
                </div>
            </td>
            <td>
                ${p.website ? 
                    `<a href="${p.website}" target="_blank" class="text-primary" style="font-size:12px;word-break:break-all;">${p.website}</a>` : 
                    '<span class="text-muted">Website yoxdur</span>'
                }
            </td>
            <td>${p.order || 1}</td>
            <td>
                <span class="badge ${p.active ? 'badge-success' : 'badge-secondary'}">
                    ${p.active ? 'Aktiv' : 'Deaktiv'}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editPartner(${p.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deletePartner(${p.id})">
                    <i class="fas fa-trash"></i>
                </button>
                <button class="btn btn-sm btn-warning" onclick="togglePartnerActive(${p.id})">
                    <i class="fas fa-power-off"></i>
                </button>
            </td>
        </tr>`;
    });

    tbody.innerHTML = html;
};

// ============ MODAL BAĞLA ============
window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('hidden');

    if (modalId === 'partnerModal') {
        if (window.pendingFile && window.pendingFile.blobUrl) {
            URL.revokeObjectURL(window.pendingFile.blobUrl);
        }
        window.pendingFile = null;
    }
};

// ============ INIT ============
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM yükləndi - partners.js');

    const logoInput = document.getElementById('partnerLogo');
    if (logoInput) {
        logoInput.addEventListener('input', function() {
            const val = this.value.trim();
            if (val) {
                let previewUrl = val;
                if (val.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)) {
                    previewUrl = `/proxy.php/api/v1/files/${val}/download`;
                }
                showPartnerLogoPreview(previewUrl);
                document.getElementById('partnerRemoveLogoBtn').style.display = 'inline-block';
            } else {
                document.getElementById('partnerLogoPreviewContainer').style.display = 'none';
                document.getElementById('partnerRemoveLogoBtn').style.display = 'none';
            }
        });
    }

    const fileInput = document.getElementById('partnerFileInput');
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                uploadPartnerLogoFile(file);
            }
        });
    }

    const dropArea = document.getElementById('partnerFileDropArea');
    if (dropArea) {
        dropArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.style.borderColor = '#4361ee';
            this.style.background = '#f0f3ff';
        });

        dropArea.addEventListener('dragleave', function(e) {
            e.preventDefault();
            this.style.borderColor = '#dee2e6';
            this.style.background = 'transparent';
        });

        dropArea.addEventListener('drop', function(e) {
            e.preventDefault();
            this.style.borderColor = '#dee2e6';
            this.style.background = 'transparent';
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const file = files[0];
                if (file.type.startsWith('image/')) {
                    uploadPartnerLogoFile(file);
                } else {
                    showError('Zəhmət olmasa şəkil faylı yükləyin!');
                }
            }
        });

        dropArea.addEventListener('click', function(e) {
            if (e.target === this || e.target.closest('.file-upload-area')) {
                document.getElementById('partnerFileInput').click();
            }
        });
    }

    setTimeout(() => {
        const partnersPage = document.getElementById('contentPartnersPage');
        if (partnersPage && !partnersPage.classList.contains('hidden')) {
            console.log('🎯 Partnyorlar səhifəsi aktiv, yüklənir...');
            window.loadPartners();
        }
    }, 500);
});

console.log('✅ partners.js hazırdır');