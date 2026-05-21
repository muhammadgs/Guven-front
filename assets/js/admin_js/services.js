// assets/js/admin_js/services.js

let currentServiceId = null;
let servicesData = [];

async function loadServices(status = null) {
    console.log('🎯 Xidmətlər yüklənir...');

    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) loadingOverlay.style.display = 'flex';

    try {
        let endpoint = '/services/';
        if (status) endpoint += `?status=${status}`;

        const result = await makeApiRequest(endpoint, 'GET', null, true);

        if (result && result.success && result.data) {
            servicesData = result.data.map(service => ({
                id: service.id,
                name: service.name,
                items: service.items ? service.items.map(item => item.text) : [],
                order: service.order_num || 0,
                cta: service.cta_text || 'Ətraflı...',
                target: service.cta_target || 'konsultasiya',
                active: service.status === 'active'
            }));

            localStorage.setItem('guvenfinans-services', JSON.stringify(servicesData));
            renderServicesTable();
            console.log(`✅ ${servicesData.length} xidmət yükləndi`);
        } else {
            const saved = localStorage.getItem('guvenfinans-services');
            if (saved && JSON.parse(saved).length > 0) {
                servicesData = JSON.parse(saved);
                renderServicesTable();
            }
        }
    } catch (error) {
        console.error('Xəta:', error);
    } finally {
        if (loadingOverlay) loadingOverlay.style.display = 'none';
    }
}

function renderServicesTable() {
    const tbody = document.getElementById('servicesListBody');
    if (!tbody) return;

    if (servicesData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Xidmət yoxdur</td></tr>';
        return;
    }

    servicesData.sort((a, b) => a.order - b.order);
    let html = '';

    servicesData.forEach((service, index) => {
        const statusClass = service.active ? 'badge-success' : 'badge-danger';
        const statusText = service.active ? 'Aktiv' : 'Deaktiv';

        html += `
            <tr>
                <td>${index + 1}</td>
                <td><strong>${escapeHtml(service.name)}</strong></td>
                <td>${service.items.length}</td>
                <td>${service.order}</td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
                <td>
                    <button class="action-btn edit" onclick="editService(${service.id})"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" onclick="deleteService(${service.id})"><i class="fas fa-trash"></i></button>
                    <button class="action-btn ${service.active ? 'warning' : 'success'}" onclick="toggleServiceStatus(${service.id})"><i class="fas ${service.active ? 'fa-ban' : 'fa-check'}"></i></button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

function showAddServiceModal() {
    currentServiceId = null;
    document.getElementById('serviceId').value = '';
    document.getElementById('serviceName').value = '';
    document.getElementById('serviceOrder').value = servicesData.length + 1;
    document.getElementById('serviceCta').value = 'Ətraflı...';
    document.getElementById('serviceTarget').value = 'konsultasiya';
    document.getElementById('serviceIsActive').checked = true;

    const container = document.getElementById('serviceItemsContainer');
    if (container) {
        container.innerHTML = `
            <div class="service-item-input" style="margin-bottom: 10px;">
                <div style="display: flex; gap: 10px;">
                    <input type="text" class="form-control service-item" placeholder="Xidmət maddəsini daxil edin" style="flex: 1;">
                    <button type="button" class="btn btn-danger btn-sm" onclick="removeServiceItem(this)" disabled><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    }

    document.querySelector('#serviceModal .modal-title').textContent = 'Yeni Xidmət';
    openModal('serviceModal');
}

function editService(id) {
    const service = servicesData.find(s => s.id == id);
    if (!service) return;

    currentServiceId = id;
    document.getElementById('serviceId').value = service.id;
    document.getElementById('serviceName').value = service.name;
    document.getElementById('serviceOrder').value = service.order;
    document.getElementById('serviceCta').value = service.cta;
    document.getElementById('serviceTarget').value = service.target;
    document.getElementById('serviceIsActive').checked = service.active;

    const container = document.getElementById('serviceItemsContainer');
    if (container) {
        container.innerHTML = '';
        service.items.forEach((item, index) => {
            container.innerHTML += `
                <div class="service-item-input" style="margin-bottom: 10px;">
                    <div style="display: flex; gap: 10px;">
                        <input type="text" class="form-control service-item" value="${escapeHtml(item)}" placeholder="Xidmət maddəsi" style="flex: 1;">
                        <button type="button" class="btn btn-danger btn-sm" onclick="removeServiceItem(this)" ${index === 0 ? 'disabled' : ''}><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
        });
    }

    document.querySelector('#serviceModal .modal-title').textContent = 'Xidməti Redaktə Et';
    openModal('serviceModal');
}

// ============ ƏSAS FUNKSİYA - HTML "saveService" çağırır ============
async function saveService() {
    const serviceId = document.getElementById('serviceId').value;
    const name = document.getElementById('serviceName').value.trim();
    const order = parseInt(document.getElementById('serviceOrder').value) || 1;
    const cta = document.getElementById('serviceCta').value.trim();
    const target = document.getElementById('serviceTarget').value.trim();
    const active = document.getElementById('serviceIsActive').checked;

    // Maddələri topla
    const itemInputs = document.querySelectorAll('.service-item');
    const items = [];
    itemInputs.forEach((input, idx) => {
        const text = input.value.trim();
        if (text) {
            items.push({
                text: text,
                order_num: idx
            });
        }
    });

    // Validasiya
    if (!name) {
        alert('Xidmət adı daxil edin!');
        return;
    }

    if (items.length === 0) {
        alert('Ən azı bir maddə əlavə edin!');
        return;
    }

    // Slug yarat
    const slug = name.toLowerCase()
        .replace(/[ğ]/g, 'g')
        .replace(/[ü]/g, 'u')
        .replace(/[ş]/g, 's')
        .replace(/[ı]/g, 'i')
        .replace(/[ö]/g, 'o')
        .replace(/[ç]/g, 'c')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

    // API-ə göndəriləcək məlumat
    const serviceData = {
        name: name,
        slug: slug,
        description: name,
        content: "",
        image_url: null,
        icon: "fa-chart-bar",
        order_num: order,
        status: active ? "active" : "inactive",
        is_featured: false,
        cta_text: cta,
        cta_target: target,
        items: items
    };

    console.log("📤 Göndərilən məlumat:", JSON.stringify(serviceData, null, 2));

    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) loadingOverlay.style.display = 'flex';

    try {
        let result;

        if (serviceId) {
            console.log(`📝 Yenilənir ID: ${serviceId}`);
            result = await makeApiRequest(`/services/${serviceId}`, 'PUT', serviceData, true);
        } else {
            console.log("➕ Yeni xidmət yaradılır...");
            result = await makeApiRequest('/services/', 'POST', serviceData, true);
        }

        console.log("📥 Cavab:", result);

        if (result && (result.success === true || result.data)) {
            alert(serviceId ? 'Xidmət yeniləndi!' : 'Xidmət yaradıldı!');
            closeModal('serviceModal');
            await loadServices();
        } else {
            const errorMsg = result?.error || result?.detail || 'Xidmət saxlanılmadı';
            alert(`Xəta: ${errorMsg}`);
        }

    } catch (error) {
        console.error("❌ Xəta:", error);
        alert(`Xəta: ${error.message}`);
    } finally {
        if (loadingOverlay) loadingOverlay.style.display = 'none';
    }
}

// HTML bəzən saveServiceItem çağıra bilər - ehtiyat
async function saveServiceItem() {
    await saveService();
}

function deleteService(id) {
    const service = servicesData.find(s => s.id == id);
    if (!service) return;
    currentServiceId = id;
    const msg = document.getElementById('deleteServiceMessage');
    if (msg) msg.textContent = `"${service.name}" silmək istədiyinizə əminsiniz?`;
    openModal('deleteServiceModal');
}

async function confirmDeleteService() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) loadingOverlay.style.display = 'flex';

    try {
        const result = await makeApiRequest(`/services/${currentServiceId}`, 'DELETE', null, true);

        if (result && (result.success === true || result.status === 204)) {
            alert('Xidmət silindi!');
            closeModal('deleteServiceModal');
            await loadServices();
        } else {
            alert('Xidmət silinərkən xəta!');
        }
    } catch (error) {
        console.error("❌ Xəta:", error);
        alert(`Xəta: ${error.message}`);
    } finally {
        if (loadingOverlay) loadingOverlay.style.display = 'none';
    }
}

// HTML confirmDeleteServiceItem çağıra bilər - ehtiyat
async function confirmDeleteServiceItem() {
    await confirmDeleteService();
}

async function toggleServiceStatus(id) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) loadingOverlay.style.display = 'flex';

    try {
        const result = await makeApiRequest(`/services/${id}/toggle-status`, 'PATCH', null, true);

        if (result && (result.success === true || result.data)) {
            alert('Status dəyişdirildi!');
            await loadServices();
        } else {
            alert('Status dəyişdirilmədi!');
        }
    } catch (error) {
        console.error("❌ Xəta:", error);
        alert(`Xəta: ${error.message}`);
    } finally {
        if (loadingOverlay) loadingOverlay.style.display = 'none';
    }
}

function searchServices() {
    const term = document.getElementById('serviceSearch')?.value.toLowerCase() || '';
    const tbody = document.getElementById('servicesListBody');
    if (!tbody) return;

    if (!term) { renderServicesTable(); return; }

    const filtered = servicesData.filter(s => s.name.toLowerCase().includes(term));

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Tapılmadı</td></tr>';
        return;
    }

    let html = '';
    filtered.forEach((service, index) => {
        const statusClass = service.active ? 'badge-success' : 'badge-danger';
        html += `
            <tr>
                <td>${index + 1}</td>
                <td><strong>${escapeHtml(service.name)}</strong></td>
                <td>${service.items.length}</td>
                <td>${service.order}</td>
                <td><span class="badge ${statusClass}">${service.active ? 'Aktiv' : 'Deaktiv'}</span></td>
                <td>
                    <button class="action-btn edit" onclick="editService(${service.id})"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" onclick="deleteService(${service.id})"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function addServiceItem() {
    const container = document.getElementById('serviceItemsContainer');
    if (container) {
        const newItem = document.createElement('div');
        newItem.className = 'service-item-input';
        newItem.style.marginBottom = '10px';
        newItem.innerHTML = `
            <div style="display: flex; gap: 10px;">
                <input type="text" class="form-control service-item" placeholder="Yeni maddə" style="flex: 1;">
                <button type="button" class="btn btn-danger btn-sm" onclick="removeServiceItem(this)"><i class="fas fa-trash"></i></button>
            </div>
        `;
        container.appendChild(newItem);
    }
}

function removeServiceItem(btn) {
    const container = document.getElementById('serviceItemsContainer');
    if (container && container.children.length > 1) {
        btn.closest('.service-item-input').remove();
    } else {
        alert('Ən azı bir maddə olmalıdır!');
    }
}

function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Global funksiyalar
window.loadServices = loadServices;
window.showAddServiceModal = showAddServiceModal;
window.editService = editService;
window.saveService = saveService;        // HTML bunu çağırır
window.saveServiceItem = saveServiceItem; // ehtiyat
window.deleteService = deleteService;
window.confirmDeleteService = confirmDeleteService;
window.confirmDeleteServiceItem = confirmDeleteServiceItem;
window.toggleServiceStatus = toggleServiceStatus;
window.searchServices = searchServices;
window.addServiceItem = addServiceItem;
window.removeServiceItem = removeServiceItem;

document.addEventListener('DOMContentLoaded', function() {
    console.log('services.js yükləndi');
    const servicesPage = document.getElementById('contentServicesPage');
    if (servicesPage && !servicesPage.classList.contains('hidden')) {
        loadServices();
    }
});