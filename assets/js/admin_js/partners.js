// assets/js/admin_js/partners.js

let currentPartnerId = null;
let partnersData = [];

// Modal funksiyaları (əgər core.js-də yoxdursa)
if (typeof window.showModal === 'undefined') {
    console.log('⚠️ showModal funksiyası yoxdur, partners.js-də yaradılır...');

    window.showModal = function(modalId) {
        console.log('🔘 Modal açılır:', modalId);
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            console.log('✅ Modal açıldı:', modalId);
        } else {
            console.error('❌ Modal tapılmadı:', modalId);
        }
    };

    window.closeModal = function(modalId) {
        console.log('🔘 Modal bağlanır:', modalId);
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = 'auto';
            console.log('✅ Modal bağlandı:', modalId);
        }
    };
}

// Notification funksiyaları (əgər yoxdursa)
if (typeof window.showNotification === 'undefined') {
    window.showNotification = function(title, message, type = 'info') {
        console.log(`📢 ${type.toUpperCase()}: ${title} - ${message}`);
        alert(`${title}: ${message}`);
    };

    window.showSuccess = function(message) {
        window.showNotification('Uğurlu', message, 'success');
    };

    window.showError = function(message) {
        window.showNotification('Xəta', message, 'error');
    };
}

// URL validation helper
window.isValidUrl = function(string) {
    if (!string) return false;
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
};

// Yerli placeholder generator
function getPlaceholderForPartner(name) {
    const colors = ['007bff', '28a745', 'dc3545', 'ffc107', '17a2b8'];
    const color = colors[Math.abs(name.length) % colors.length];
    const text = name.substring(0, 3).toUpperCase();

    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="150" height="80"><rect width="100%" height="100%" fill="%23${color}"/><text x="50%" y="50%" font-family="Arial" font-size="16" font-weight="bold" fill="white" text-anchor="middle" dy=".3em">${text}</text></svg>`;
}

// Ana səhifəyə məlumat göndərmək
window.sendPartnersToMainPage = function() {
    try {
        if (window.opener && !window.opener.closed) {
            const activePartners = partnersData.filter(p => p.active)
                .sort((a, b) => a.order - b.order);

            window.opener.postMessage({
                type: 'UPDATE_PARTNERS',
                partners: activePartners
            }, '*');
            console.log('📤 Ana səhifəyə partnyorlar göndərildi', activePartners.length);
        }

        localStorage.setItem('guvenfinans-partners', JSON.stringify(partnersData));
    } catch (error) {
        console.error('❌ Ana səhifəyə partnyorlar göndərilmədi:', error);
    }
};

// Partnyorları yüklə
window.loadPartners = function() {
    console.log('🔄 loadPartners çağırıldı');

    const savedPartners = localStorage.getItem('guvenfinans-partners');

    if (savedPartners) {
        try {
            partnersData = JSON.parse(savedPartners);
        } catch (error) {
            console.error('❌ JSON parse xətası:', error);
            loadDefaultPartners();
        }
    } else {
        loadDefaultPartners();
    }

    renderPartnersTable();
    updatePartnerPreview();
};

function loadDefaultPartners() {
    partnersData = [
        {
            id: 1,
            name: "Microsoft",
            logo: "",
            website: "https://microsoft.com",
            order: 1,
            active: true
        },
        {
            id: 2,
            name: "IBM",
            logo: "",
            website: "https://ibm.com",
            order: 2,
            active: true
        },
        {
            id: 3,
            name: "Oracle",
            logo: "",
            website: "https://oracle.com",
            order: 3,
            active: true
        }
    ];

    localStorage.setItem('guvenfinans-partners', JSON.stringify(partnersData));
}

function renderPartnersTable() {
    const tableBody = document.getElementById('partnersListBody');
    if (!tableBody) return;

    if (partnersData.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">Heç bir partnyor tapılmadı</td>
            </tr>
        `;
        return;
    }

    const sortedPartners = [...partnersData].sort((a, b) => a.order - b.order);

    let html = '';

    sortedPartners.forEach((partner, index) => {
        const placeholder = getPlaceholderForPartner(partner.name);

        html += `
            <tr data-partner-id="${partner.id}">
                <td>${index + 1}</td>
                <td><strong>${partner.name}</strong></td>
                <td>
                    <div style="width:60px;height:40px;display:flex;align-items:center;justify-content:center;border:1px solid #ddd;border-radius:4px;overflow:hidden;">
                        ${partner.logo ? 
                            `<img src="${partner.logo}" alt="${partner.name}" 
                                  style="max-width:55px;max-height:35px;object-fit:contain;"
                                  onerror="this.onerror=null; this.src='${placeholder}'">` : 
                            `<img src="${placeholder}" alt="${partner.name}" style="width:100%;height:100%;object-fit:cover;">`
                        }
                    </div>
                </td>
                <td>
                    ${partner.website ? 
                        `<a href="${partner.website}" target="_blank" class="text-primary" style="font-size:12px;">${partner.website}</a>` : 
                        '<span class="text-muted">Website yoxdur</span>'
                    }
                </td>
                <td>${partner.order}</td>
                <td>
                    <span class="badge ${partner.active ? 'badge-success' : 'badge-secondary'}">
                        ${partner.active ? 'Aktiv' : 'Deaktiv'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editPartner(${partner.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-info" onclick="viewPartner(${partner.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deletePartner(${partner.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    tableBody.innerHTML = html;
}

function updatePartnerPreview(partner = null) {
    const preview = document.getElementById('partnerPreview');
    if (!preview) return;

    if (!partner) {
        preview.innerHTML = `
            <div class="preview-placeholder">
                <p>Soldan partnyor seçin və ya yeni partnyor yaradın.</p>
            </div>
        `;
        return;
    }

    const placeholder = getPlaceholderForPartner(partner.name);

    preview.innerHTML = `
        <div class="preview-card">
            <div class="preview-header">
                <h4>${partner.name}</h4>
                <span class="badge ${partner.active ? 'badge-success' : 'badge-secondary'}">
                    ${partner.active ? 'Aktiv' : 'Deaktiv'}
                </span>
            </div>
            <div class="preview-body">
                <div class="logo-preview-large">
                    <div style="width:180px;height:90px;margin:0 auto;display:flex;align-items:center;justify-content:center;border:1px solid #ddd;border-radius:6px;overflow:hidden;background:#f8f9fa;">
                        ${partner.logo ? 
                            `<img src="${partner.logo}" alt="${partner.name}" 
                                  style="max-width:170px;max-height:80px;object-fit:contain;"
                                  onerror="this.onerror=null; this.src='${placeholder}'">` : 
                            `<img src="${placeholder}" alt="${partner.name}" style="width:100%;height:100%;object-fit:cover;">`
                        }
                    </div>
                </div>
                <div class="partner-info-preview">
                    <p><strong>Website:</strong> ${partner.website || 'Yoxdur'}</p>
                    <p><strong>Sıra:</strong> ${partner.order}</p>
                    <p><strong>ID:</strong> ${partner.id}</p>
                </div>
            </div>
        </div>
    `;
}

// Partnyor əlavə et modalını göstər
window.showAddPartnerModal = function() {
    console.log('🔘 showAddPartnerModal çağırıldı');

    currentPartnerId = null;

    // Modal varsa istifadə et
    const modal = document.getElementById('partnerModal');
    if (modal && typeof window.showModal !== 'undefined') {
        document.getElementById('partnerModalTitle').textContent = 'Yeni Partnyor Əlavə Et';
        document.getElementById('partnerId').value = '';
        document.getElementById('partnerName').value = '';
        document.getElementById('partnerLogo').value = '';
        document.getElementById('partnerWebsite').value = '';
        document.getElementById('partnerOrder').value = partnersData.length > 0 ?
            Math.max(...partnersData.map(p => p.order)) + 1 : 1;
        document.getElementById('partnerIsActive').checked = true;

        document.getElementById('logoPreviewContainer').style.display = 'none';

        window.showModal('partnerModal');
    } else {
        // Modal yoxdursa, sadə prompt ilə
        console.log('⚠️ Modal yoxdur, prompt istifadə ediləcək');
        const name = prompt('Yeni partnyor adı:');
        if (name && name.trim() !== '') {
            const newPartner = {
                id: partnersData.length > 0 ? Math.max(...partnersData.map(p => p.id)) + 1 : 1,
                name: name.trim(),
                logo: '',
                website: '',
                order: partnersData.length > 0 ? Math.max(...partnersData.map(p => p.order)) + 1 : 1,
                active: true
            };
            partnersData.push(newPartner);
            renderPartnersTable();
            updatePartnerPreview(newPartner);
            sendPartnersToMainPage();
            showSuccess('Yeni partnyor əlavə edildi');
        }
    }
};

// Partnyor redaktə et - ƏSAS DÜZƏLİŞ BURADA!
window.editPartner = function(partnerId) {
    console.log('🔘 editPartner çağırıldı:', partnerId);

    const partner = partnersData.find(p => p.id === partnerId);
    if (!partner) return;

    currentPartnerId = partnerId;

    // Modal varsa istifadə et
    const modal = document.getElementById('partnerModal');
    if (modal && typeof window.showModal !== 'undefined') {
        console.log('✅ Modal istifadə ediləcək');

        document.getElementById('partnerModalTitle').textContent = 'Partnyoru Redaktə Et';
        document.getElementById('partnerId').value = partner.id;
        document.getElementById('partnerName').value = partner.name;
        document.getElementById('partnerLogo').value = partner.logo || '';
        document.getElementById('partnerWebsite').value = partner.website || '';
        document.getElementById('partnerOrder').value = partner.order;
        document.getElementById('partnerIsActive').checked = partner.active;

        // Logo preview
        if (partner.logo) {
            document.getElementById('logoPreviewContainer').style.display = 'block';
            document.getElementById('logoPreview').innerHTML = `
                <img src="${partner.logo}" alt="Logo preview" 
                     style="max-width: 150px; max-height: 80px; object-fit: contain;"
                     onerror="this.style.display='none'">
            `;
        } else {
            document.getElementById('logoPreviewContainer').style.display = 'none';
        }

        window.showModal('partnerModal');
    } else {
        // Modal yoxdursa, sadə prompt ilə
        console.log('⚠️ Modal yoxdur, prompt istifadə ediləcək');
        const newName = prompt('Partnyor adını dəyişin:', partner.name);
        if (newName && newName.trim() !== '') {
            partner.name = newName.trim();
            renderPartnersTable();
            updatePartnerPreview(partner);
            sendPartnersToMainPage();
            showSuccess('Partnyor yeniləndi');
        }
    }
};

// Partnyor yadda saxla
window.savePartner = function() {
    console.log('🔘 savePartner çağırıldı');

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

    if (logo && !isValidUrl(logo)) {
        showError('Logo URL düzgün formatda deyil!');
        return;
    }

    if (website && !isValidUrl(website)) {
        showError('Website URL düzgün formatda deyil!');
        return;
    }

    let partner;

    if (id) {
        partner = partnersData.find(p => p.id === parseInt(id));
        if (partner) {
            partner.name = name;
            partner.logo = logo || '';
            partner.website = website || '';
            partner.order = order;
            partner.active = active;

            showSuccess('Partnyor yeniləndi!');
        }
    } else {
        const newId = partnersData.length > 0 ? Math.max(...partnersData.map(p => p.id)) + 1 : 1;
        partner = {
            id: newId,
            name,
            logo: logo || '',
            website: website || '',
            order,
            active
        };

        partnersData.push(partner);
        showSuccess('Yeni partnyor əlavə edildi!');
    }

    localStorage.setItem('guvenfinans-partners', JSON.stringify(partnersData));

    renderPartnersTable();
    updatePartnerPreview(partner);

    sendPartnersToMainPage();

    if (typeof window.closeModal !== 'undefined') {
        window.closeModal('partnerModal');
    } else {
        // Fallback
        const modal = document.getElementById('partnerModal');
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = 'auto';
        }
    }
};

// Partnyoru sil - ƏSAS DÜZƏLİŞ BURADA!
window.deletePartner = function(partnerId) {
    console.log('🔘 deletePartner çağırıldı:', partnerId);

    const partner = partnersData.find(p => p.id === partnerId);
    if (!partner) return;

    currentPartnerId = partnerId;

    const deleteModal = document.getElementById('deletePartnerModal');
    if (deleteModal && typeof window.showModal !== 'undefined') {
        console.log('✅ Delete modal istifadə ediləcək');

        document.getElementById('deletePartnerMessage').textContent =
            `"${partner.name}" partnyorunu silmək istədiyinizə əminsiniz?`;

        window.showModal('deletePartnerModal');
    } else {
        // Modal yoxdursa, sadə confirm ilə
        console.log('⚠️ Modal yoxdur, confirm istifadə ediləcək');
        if (confirm(`"${partner.name}" partnyorunu silmək istədiyinizə əminsiniz?`)) {
            confirmDeletePartner();
        }
    }
};

// Partnyor silməni təsdiqlə
window.confirmDeletePartner = function() {
    console.log('🔘 confirmDeletePartner çağırıldı');

    const partnerId = currentPartnerId;

    const index = partnersData.findIndex(p => p.id === partnerId);
    if (index !== -1) {
        const partnerName = partnersData[index].name;
        partnersData.splice(index, 1);

        localStorage.setItem('guvenfinans-partners', JSON.stringify(partnersData));

        renderPartnersTable();
        updatePartnerPreview();

        sendPartnersToMainPage();

        showSuccess(`"${partnerName}" partnyoru silindi!`);
    }

    if (typeof window.closeModal !== 'undefined') {
        window.closeModal('deletePartnerModal');
    } else {
        // Fallback
        const modal = document.getElementById('deletePartnerModal');
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = 'auto';
        }
    }

    currentPartnerId = null;
};

// Partnyora bax
window.viewPartner = function(partnerId) {
    console.log('🔘 viewPartner çağırıldı:', partnerId);

    const partner = partnersData.find(p => p.id === partnerId);
    if (!partner) return;

    updatePartnerPreview(partner);
};

// Partnyor axtar
window.searchPartners = function() {
    console.log('🔘 searchPartners çağırıldı');

    const searchTerm = document.getElementById('partnerSearch').value.toLowerCase();

    if (!searchTerm) {
        renderPartnersTable();
        return;
    }

    const filteredPartners = partnersData.filter(partner =>
        partner.name.toLowerCase().includes(searchTerm) ||
        (partner.website && partner.website.toLowerCase().includes(searchTerm))
    );

    const tableBody = document.getElementById('partnersListBody');
    if (!tableBody) return;

    if (filteredPartners.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">Axtarışa uyğun partnyor tapılmadı</td>
            </tr>
        `;
        return;
    }

    let html = '';

    filteredPartners.forEach(partner => {
        const placeholder = getPlaceholderForPartner(partner.name);

        html += `
            <tr data-partner-id="${partner.id}">
                <td>${partner.id}</td>
                <td>${partner.name}</td>
                <td>
                    <div style="width:60px;height:40px;display:flex;align-items:center;justify-content:center;border:1px solid #ddd;border-radius:4px;overflow:hidden;">
                        ${partner.logo ? 
                            `<img src="${partner.logo}" alt="${partner.name}" 
                                  style="max-width:55px;max-height:35px;object-fit:contain;"
                                  onerror="this.onerror=null; this.src='${placeholder}'">` : 
                            `<img src="${placeholder}" alt="${partner.name}" style="width:100%;height:100%;object-fit:cover;">`
                        }
                    </div>
                </td>
                <td>
                    ${partner.website ? 
                        `<a href="${partner.website}" target="_blank" class="text-primary" style="font-size:12px;">${partner.website}</a>` : 
                        '<span class="text-muted">Website yoxdur</span>'
                    }
                </td>
                <td>${partner.order}</td>
                <td>
                    <span class="badge ${partner.active ? 'badge-success' : 'badge-secondary'}">
                        ${partner.active ? 'Aktiv' : 'Deaktiv'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editPartner(${partner.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-info" onclick="viewPartner(${partner.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deletePartner(${partner.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    tableBody.innerHTML = html;
};

// Ana səhifədən partnyor sorğusu alındıqda
window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'GET_PARTNERS') {
        console.log('📥 Ana səhifədən partnyor sorğusu alındı');

        try {
            if (window.opener && !window.opener.closed) {
                window.opener.postMessage({
                    type: 'PARTNERS_DATA',
                    partners: partnersData
                }, event.origin);
                console.log('📤 Ana səhifəyə partnyorlar göndərildi');
            }
        } catch (error) {
            console.error('❌ Ana səhifəyə cavab göndərilmədi:', error);
        }
    }
});

// DOM yükləndikdə logo input eventini təyin et
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ partners.js DOMContentLoaded');

    const logoInput = document.getElementById('partnerLogo');
    if (logoInput) {
        logoInput.addEventListener('input', function() {
            const partnerName = document.getElementById('partnerName').value || 'Partnyor';
            const previewContainer = document.getElementById('logoPreviewContainer');
            const preview = document.getElementById('logoPreview');

            if (!this.value) {
                if (previewContainer) previewContainer.style.display = 'none';
                return;
            }

            if (preview) {
                preview.innerHTML = `
                    <img src="${this.value}" alt="Logo preview" 
                         style="max-width: 150px; max-height: 80px; object-fit: contain;"
                         onerror="this.style.display='none'">
                `;
            }

            if (previewContainer) previewContainer.style.display = 'block';
        });
    }

    // Əgər partnyorlar səhifəsindədirsə, avtomatik yüklə
    setTimeout(() => {
        const partnersPage = document.getElementById('contentPartnersPage');
        if (partnersPage && !partnersPage.classList.contains('hidden')) {
            console.log('🎯 Partnyorlar səhifəsi aktiv, yüklənir...');
            loadPartners();
        }
    }, 1000);
});

// Test üçün
console.log('✅ partners.js yükləndi, showModal funksiyası:', typeof window.showModal);