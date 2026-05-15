// assets/js/admin_js/services.js

let currentServiceId = null;
let servicesData = [];

document.addEventListener('DOMContentLoaded', function() {
    loadServices();
});

function loadServices() {
    // Əvvəlcə localStorage-dan yüklə
    const savedServices = localStorage.getItem('guvenfinans-services');

    if (savedServices) {
        servicesData = JSON.parse(savedServices);
    } else {
        // Default xidmətlər
        servicesData = [
            {
                id: 1,
                name: "Mühasibatlıq xidmətləri",
                items: [
                    "Mühasibatlığın qurulması və idarə edilməsi",
                    "Müəssisələr üçün balansın hazırlanması və hesabatların verilməsi",
                    "Əmək haqqının hesablanması"
                ],
                order: 1,
                cta: "Ətraflı...",
                target: "konsultasiya",
                active: true
            },
            {
                id: 2,
                name: "Vergi xidmətləri",
                items: [
                    "VÖEN alınması və qeydiyyat işləri",
                    "ƏDV qeydiyyatı və qeydiyyatın ləğvi",
                    "Bank rekvizitlərinin alınması",
                    "Kassa aparatlarının qurulması"
                ],
                order: 2,
                cta: "Ətraflı...",
                target: "konsultasiya",
                active: true
            },
            {
                id: 3,
                name: "İnsan Resursları",
                items: [
                    "Kadr inzibatçılığı və sənədləşməsi üzrə məsləhət",
                    "Sənədlərin ekspertizası və rəy"
                ],
                order: 3,
                cta: "Ətraflı...",
                target: "konsultasiya",
                active: true
            },
            {
                id: 4,
                name: "Hüquqi xidmətlər",
                items: [
                    "Şirkət iclaslarında iştirak və hüquqi müşayiət",
                    "Müqavilələrin hazırlanması və yoxlanması"
                ],
                order: 4,
                cta: "Ətraflı...",
                target: "konsultasiya",
                active: true
            },
            {
                id: 5,
                name: "İKT",
                items: [
                    "IT Texniki dəstək (Help desk)",
                    "Şəbəkə sisteminin çəkilişi və qurulması",
                    "Analoq telefon sisteminin quraşdırılması"
                ],
                order: 5,
                cta: "Ətraflı...",
                target: "konsultasiya",
                active: true
            }
        ];

        saveServicesToStorage();
    }

    renderServicesTable();
    updateMainPageServices();
}

function renderServicesTable() {
    const tbody = document.getElementById('servicesListBody');

    if (!tbody) return;

    if (servicesData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">Xidmət yoxdur</td>
            </tr>
        `;
        return;
    }

    // Sıraya görə sırala
    servicesData.sort((a, b) => a.order - b.order);

    let html = '';

    servicesData.forEach((service, index) => {
        html += `
            <tr data-service-id="${service.id}">
                <td>${index + 1}</td>
                <td><strong>${service.name}</strong></td>
                <td>${service.items.length}</td>
                <td>${service.order}</td>
                <td>
                    <span class="badge ${service.active ? 'badge-success' : 'badge-danger'}">
                        ${service.active ? 'Aktiv' : 'Deaktiv'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editService(${service.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteService(${service.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="btn btn-sm btn-info" onclick="previewService(${service.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="moveService(${service.id}, 'up')" ${index === 0 ? 'disabled' : ''}>
                        <i class="fas fa-arrow-up"></i>
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="moveService(${service.id}, 'down')" ${index === servicesData.length - 1 ? 'disabled' : ''}>
                        <i class="fas fa-arrow-down"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

function showAddServiceModal() {
    currentServiceId = null;
    document.getElementById('serviceModalTitle').textContent = 'Yeni Xidmət Əlavə Et';
    document.getElementById('serviceId').value = '';
    document.getElementById('serviceName').value = '';
    document.getElementById('serviceOrder').value = servicesData.length + 1;
    document.getElementById('serviceCta').value = 'Ətraflı...';
    document.getElementById('serviceTarget').value = 'konsultasiya';
    document.getElementById('serviceIsActive').checked = true;

    // Maddələr container-ini təmizlə
    const container = document.getElementById('serviceItemsContainer');
    container.innerHTML = `
        <div class="service-item-input">
            <div class="form-row">
                <div class="form-col" style="flex: 1;">
                    <input type="text" class="form-control service-item" 
                           placeholder="Xidmət maddəsini daxil edin">
                </div>
                <div class="form-col" style="width: 100px;">
                    <button type="button" class="btn btn-danger" onclick="removeServiceItem(this)" disabled>
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `;

    openModal('serviceModal');
}

function editService(id) {
    const service = servicesData.find(s => s.id == id);
    if (!service) return;

    currentServiceId = id;
    document.getElementById('serviceModalTitle').textContent = 'Xidməti Redaktə Et';
    document.getElementById('serviceId').value = service.id;
    document.getElementById('serviceName').value = service.name;
    document.getElementById('serviceOrder').value = service.order;
    document.getElementById('serviceCta').value = service.cta;
    document.getElementById('serviceTarget').value = service.target;
    document.getElementById('serviceIsActive').checked = service.active;

    // Maddələri yüklə
    const container = document.getElementById('serviceItemsContainer');
    container.innerHTML = '';

    service.items.forEach((item, index) => {
        container.innerHTML += `
            <div class="service-item-input">
                <div class="form-row">
                    <div class="form-col" style="flex: 1;">
                        <input type="text" class="form-control service-item" 
                               value="${item}" placeholder="Xidmət maddəsini daxil edin">
                    </div>
                    <div class="form-col" style="width: 100px;">
                        <button type="button" class="btn btn-danger" onclick="removeServiceItem(this)" ${index === 0 ? 'disabled' : ''}>
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    });

    openModal('serviceModal');
}

function addServiceItem() {
    const container = document.getElementById('serviceItemsContainer');
    container.innerHTML += `
        <div class="service-item-input">
            <div class="form-row">
                <div class="form-col" style="flex: 1;">
                    <input type="text" class="form-control service-item" 
                           placeholder="Xidmət maddəsini daxil edin">
                </div>
                <div class="form-col" style="width: 100px;">
                    <button type="button" class="btn btn-danger" onclick="removeServiceItem(this)">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function removeServiceItem(button) {
    const itemInput = button.closest('.service-item-input');
    if (itemInput) {
        itemInput.remove();
    }
}

function saveService() {
    const serviceId = document.getElementById('serviceId').value;
    const name = document.getElementById('serviceName').value.trim();
    const order = parseInt(document.getElementById('serviceOrder').value) || 1;
    const cta = document.getElementById('serviceCta').value.trim();
    const target = document.getElementById('serviceTarget').value.trim();
    const active = document.getElementById('serviceIsActive').checked;

    // Maddələri topla
    const itemInputs = document.querySelectorAll('.service-item');
    const items = [];
    itemInputs.forEach(input => {
        if (input.value.trim()) {
            items.push(input.value.trim());
        }
    });

    if (!name) {
        alert('Xidmət adı daxil edin!');
        return;
    }

    if (items.length === 0) {
        alert('Ən azı bir xidmət maddəsi əlavə edin!');
        return;
    }

    if (serviceId) {
        // Redaktə et
        const index = servicesData.findIndex(s => s.id == serviceId);
        if (index !== -1) {
            servicesData[index] = {
                id: parseInt(serviceId),
                name,
                items,
                order,
                cta,
                target,
                active
            };
        }
    } else {
        // Yeni xidmət yarat
        const newId = servicesData.length > 0 ? Math.max(...servicesData.map(s => s.id)) + 1 : 1;
        servicesData.push({
            id: newId,
            name,
            items,
            order,
            cta,
            target,
            active
        });
    }

    // Sıraya görə sırala
    servicesData.sort((a, b) => a.order - b.order);

    // Yenidən assign et
    servicesData.forEach((service, index) => {
        service.order = index + 1;
    });

    saveServicesToStorage();
    renderServicesTable();
    updateMainPageServices();
    closeModal('serviceModal');

    showNotification('Xidmət uğurla yadda saxlanıldı!', 'success');
}

function deleteService(id) {
    const service = servicesData.find(s => s.id == id);
    if (!service) return;

    currentServiceId = id;
    document.getElementById('deleteServiceMessage').textContent =
        `"${service.name}" xidmətini silmək istədiyinizə əminsiniz? Bu əməliyyat geri qaytarıla bilməz.`;

    openModal('deleteServiceModal');
}

function confirmDeleteService() {
    servicesData = servicesData.filter(s => s.id != currentServiceId);

    // Sıra nömrələrini yenilə
    servicesData.forEach((service, index) => {
        service.order = index + 1;
    });

    saveServicesToStorage();
    renderServicesTable();
    updateMainPageServices();
    closeModal('deleteServiceModal');

    showNotification('Xidmət uğurla silindi!', 'success');
}

function moveService(id, direction) {
    const index = servicesData.findIndex(s => s.id == id);
    if (index === -1) return;

    if (direction === 'up' && index > 0) {
        // Yuxarı hərəkət
        [servicesData[index], servicesData[index - 1]] = [servicesData[index - 1], servicesData[index]];
    } else if (direction === 'down' && index < servicesData.length - 1) {
        // Aşağı hərəkət
        [servicesData[index], servicesData[index + 1]] = [servicesData[index + 1], servicesData[index]];
    }

    // Sıra nömrələrini yenilə
    servicesData.forEach((service, idx) => {
        service.order = idx + 1;
    });

    saveServicesToStorage();
    renderServicesTable();
    updateMainPageServices();
}

function previewService(id) {
    const service = servicesData.find(s => s.id == id);
    if (!service) return;

    const preview = document.getElementById('servicePreview');

    let itemsHtml = '';
    service.items.forEach(item => {
        itemsHtml += `<li>${item}</li>`;
    });

    preview.innerHTML = `
        <div class="service-card preview-card">
            <h3 class="service-title">${service.name}</h3>
            <ul class="service-list">
                ${itemsHtml}
            </ul>
            <a href="#${service.target}" class="service-btn">${service.cta}</a>
            <div class="service-meta">
                <span class="meta-item"><i class="fas fa-sort-numeric-up"></i> Sıra: ${service.order}</span>
                <span class="meta-item"><i class="fas fa-circle ${service.active ? 'text-success' : 'text-danger'}"></i> ${service.active ? 'Aktiv' : 'Deaktiv'}</span>
            </div>
        </div>
    `;
}

function searchServices() {
    const searchTerm = document.getElementById('serviceSearch').value.toLowerCase();

    if (!searchTerm) {
        renderServicesTable();
        return;
    }

    const filteredServices = servicesData.filter(service =>
        service.name.toLowerCase().includes(searchTerm)
    );

    const tbody = document.getElementById('servicesListBody');

    if (filteredServices.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">Axtarışa uyğun xidmət tapılmadı</td>
            </tr>
        `;
        return;
    }

    let html = '';

    filteredServices.forEach((service, index) => {
        const originalIndex = servicesData.findIndex(s => s.id === service.id);

        html += `
            <tr data-service-id="${service.id}">
                <td>${originalIndex + 1}</td>
                <td><strong>${service.name}</strong></td>
                <td>${service.items.length}</td>
                <td>${service.order}</td>
                <td>
                    <span class="badge ${service.active ? 'badge-success' : 'badge-danger'}">
                        ${service.active ? 'Aktiv' : 'Deaktiv'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editService(${service.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteService(${service.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="btn btn-sm btn-info" onclick="previewService(${service.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

function saveServicesToStorage() {
    localStorage.setItem('guvenfinans-services', JSON.stringify(servicesData));
}

function updateMainPageServices() {
    // Ana səhifədəki xidmətləri yenilə
    const activeServices = servicesData
        .filter(s => s.active)
        .sort((a, b) => a.order - b.order);

    localStorage.setItem('guvenfinans-active-services', JSON.stringify(activeServices));
}