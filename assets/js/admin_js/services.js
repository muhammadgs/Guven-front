// assets/js/admin_js/services.js

let currentServiceId = null;
let servicesData = [];
let serviceDescriptionQuill = null;
let serviceItemDescriptionEditors = new Map();

function pickServiceDescription(source) {
    if (!source || typeof source !== 'object') return '';
    const keys = ['description_html', 'full_description', 'service_description', 'content', 'description', 'text', 'about', 'detail_description'];
    for (const key of keys) {
        const value = source[key];
        if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return '';
}

function initServiceDescriptionEditor() {
    if (serviceDescriptionQuill) return serviceDescriptionQuill;

    const hiddenField = document.getElementById('serviceDescription');
    const editorEl = document.getElementById('serviceDescriptionEditor');
    const toolbarEl = document.getElementById('serviceDescriptionToolbar');

    if (!hiddenField || !editorEl || !toolbarEl || typeof window.Quill !== 'function') {
        return null;
    }

    const Font = window.Quill.import('formats/font');
    Font.whitelist = ['poppins', 'inter', 'roboto', 'montserrat', 'open-sans', 'lato', 'merriweather', 'playfair-display', 'arial'];
    window.Quill.register(Font, true);

    const Size = window.Quill.import('attributors/class/size');
    Size.whitelist = ['small', 'normal', 'large', 'huge'];
    window.Quill.register(Size, true);

    serviceDescriptionQuill = new window.Quill('#serviceDescriptionEditor', {
        theme: 'snow',
        modules: { toolbar: '#serviceDescriptionToolbar' },
        placeholder: 'Xidmət üçün ətraflı açıqlama daxil edin...'
    });

    serviceDescriptionQuill.on('text-change', function () {
        hiddenField.value = getServiceDescriptionValue();
    });

    return serviceDescriptionQuill;
}

function getServiceDescriptionValue() {
    const descEl = document.getElementById('serviceDescription');
    if (!descEl) return '';

    if (serviceDescriptionQuill && serviceDescriptionQuill.root) {
        const html = String(serviceDescriptionQuill.root.innerHTML || '').trim();
        const normalized = html === '<p><br></p>' ? '' : html;
        descEl.value = normalized;
        return normalized;
    }

    return String(descEl.value || '').trim();
}

function setServiceDescriptionValue(value) {
    const descEl = document.getElementById('serviceDescription');
    if (!descEl) return;
    const safeValue = String(value || '');
    descEl.value = safeValue;

    if (serviceDescriptionQuill && serviceDescriptionQuill.clipboard) {
        serviceDescriptionQuill.setText('');
        if (safeValue.trim()) {
            serviceDescriptionQuill.clipboard.dangerouslyPasteHTML(safeValue);
        }
        return;
    }

    descEl.value = safeValue;
}

function clearServiceDescriptionEditor() {
    setServiceDescriptionValue('');
}

function pickServiceItemText(source) {
    if (!source || typeof source !== 'object') return '';
    const keys = ['text', 'title', 'name', 'item_text', 'service_item', 'service_text', 'label', 'value'];
    for (const key of keys) {
        const value = source[key];
        if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return '';
}

function pickServiceItemDescription(source) {
    if (!source || typeof source !== 'object') return '';
    const keys = ['description_html', 'full_description', 'item_description', 'service_item_description', 'content', 'description', 'detail_description', 'about'];
    for (const key of keys) {
        const value = source[key];
        if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return '';
}

function normalizeServiceItem(item, index = 0) {
    if (typeof item === 'string' || typeof item === 'number') {
        const text = String(item).trim();
        return { id: null, text, description: '', order_num: index, original: item };
    }
    if (!item || typeof item !== 'object') return null;
    return {
        id: item.id || item.item_id || item.service_item_id || null,
        text: pickServiceItemText(item),
        description: pickServiceItemDescription(item),
        order_num: Number(item.order_num ?? item.order ?? item.sort_order ?? item.position ?? index) || index,
        original: item
    };
}

function createServiceItemMarkup(item = {}, index = 0) {
    const itemId = item.id ? ` data-item-id="${escapeHtml(String(item.id))}"` : '';
    const label = `Maddə ${index + 1}`;
    return `
        <div class="service-item-input" data-item-index="${index}"${itemId}>
            <div class="service-item-header">
                <span class="service-item-label">${label}</span>
                <input type="text" class="form-control service-item" value="${escapeHtml(item.text || '')}" placeholder="Xidmət maddəsini daxil edin">
                <button type="button" class="btn btn-outline btn-sm service-item-desc-toggle" onclick="toggleServiceItemDescription(this)">Açıqlama</button>
                <button type="button" class="btn btn-danger btn-sm service-item-remove-btn" onclick="removeServiceItem(this)"><i class="fas fa-trash"></i></button>
            </div>
            <div class="service-item-description-panel">
                <input type="hidden" class="service-item-description" value="${escapeHtml(item.description || '')}">
                <div class="service-item-description-toolbar"></div>
                <div class="service-item-description-editor"></div>
            </div>
        </div>
    `;
}
function initServiceItemDescriptionEditor(itemEl) {
    if (!itemEl || serviceItemDescriptionEditors.has(itemEl)) return;
    const hiddenField = itemEl.querySelector('.service-item-description');
    const toolbarEl = itemEl.querySelector('.service-item-description-toolbar');
    const editorEl = itemEl.querySelector('.service-item-description-editor');
    if (!hiddenField || !toolbarEl || !editorEl) return;
    const initialHtml = String(hiddenField.value || '');

    if (typeof window.Quill !== 'function') {
        editorEl.innerHTML = `<textarea class="form-control service-item-description-fallback" rows="6" placeholder="Maddə açıqlaması...">${escapeHtml(initialHtml)}</textarea>`;
        const area = editorEl.querySelector('textarea');
        if (area) area.addEventListener('input', function () { hiddenField.value = area.value; });
        serviceItemDescriptionEditors.set(itemEl, { fallback: true, textarea: area });
        return;
    }

    toolbarEl.innerHTML = `
        <select class="ql-font"></select><select class="ql-size"></select><select class="ql-header"><option selected></option><option value="1"></option><option value="2"></option></select>
        <button class="ql-bold"></button><button class="ql-italic"></button><button class="ql-underline"></button>
        <button class="ql-list" value="ordered"></button><button class="ql-list" value="bullet"></button>
        <select class="ql-align"></select><button class="ql-link"></button><select class="ql-color"></select><select class="ql-background"></select><button class="ql-clean"></button>
    `;
    const quill = new window.Quill(editorEl, { theme: 'snow', modules: { toolbar: toolbarEl }, placeholder: 'Maddə açıqlaması...' });
    if (initialHtml.trim()) quill.clipboard.dangerouslyPasteHTML(initialHtml);
    quill.on('text-change', function () {
        const html = String(quill.root.innerHTML || '').trim();
        hiddenField.value = html === '<p><br></p>' ? '' : html;
    });
    serviceItemDescriptionEditors.set(itemEl, { quill, fallback: false });
}
function initAllServiceItemDescriptionEditors() { document.querySelectorAll('#serviceItemsContainer .service-item-input').forEach(initServiceItemDescriptionEditor); }
function getServiceItemDescriptionValue(itemEl) {
    const hidden = itemEl?.querySelector('.service-item-description');
    if (!hidden) return '';
    const ref = serviceItemDescriptionEditors.get(itemEl);
    if (ref?.quill?.root) {
        const html = String(ref.quill.root.innerHTML || '').trim();
        hidden.value = html === '<p><br></p>' ? '' : html;
    } else if (ref?.fallback && ref?.textarea) {
        hidden.value = ref.textarea.value || '';
    }
    return String(hidden.value || '').trim();
}
function destroyServiceItemDescriptionEditor(itemEl) { serviceItemDescriptionEditors.delete(itemEl); }
function clearServiceItemDescriptionEditors() { serviceItemDescriptionEditors.clear(); }
function refreshServiceItemIndexes() {
    const allItems = Array.from(document.querySelectorAll('#serviceItemsContainer .service-item-input'));
    allItems.forEach((itemEl, index) => {
        itemEl.dataset.itemIndex = String(index);
        const label = itemEl.querySelector('.service-item-label');
        if (label) label.textContent = `Maddə ${index + 1}`;
        const btn = itemEl.querySelector('.service-item-remove-btn');
        if (btn) btn.disabled = allItems.length === 1;
    });
}

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
                items: Array.isArray(service.items) ? service.items.map((item, index) => normalizeServiceItem(item, index)).filter(Boolean) : [],
                description: pickServiceDescription(service),
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
    setServiceDescriptionValue('');

    const container = document.getElementById('serviceItemsContainer');
    if (container) {
        clearServiceItemDescriptionEditors();
        container.innerHTML = createServiceItemMarkup({}, 0);
        initAllServiceItemDescriptionEditors();
        refreshServiceItemIndexes();
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
    setServiceDescriptionValue(service.description || '');

    const container = document.getElementById('serviceItemsContainer');
    if (container) {
        container.innerHTML = '';
        clearServiceItemDescriptionEditors();
        const items = Array.isArray(service.items) ? service.items : [];
        if (!items.length) {
            container.innerHTML = createServiceItemMarkup({}, 0);
        } else {
            container.innerHTML = items.map((item, index) => createServiceItemMarkup(normalizeServiceItem(item, index) || {}, index)).join('');
        }
        initAllServiceItemDescriptionEditors();
        refreshServiceItemIndexes();
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
    const descriptionHtml = getServiceDescriptionValue();

    // Maddələri topla
    const itemBlocks = document.querySelectorAll('#serviceItemsContainer .service-item-input');
    const items = [];
    itemBlocks.forEach((itemEl, idx) => {
        const input = itemEl.querySelector('.service-item');
        const text = String(input?.value || '').trim();
        const description = getServiceItemDescriptionValue(itemEl);
        const itemId = itemEl.dataset.itemId;
        if (text) {
            const payload = {
                text: text,
                title: text,
                description: description,
                content: description,
                description_html: description,
                full_description: description,
                item_description: description,
                service_item_description: description,
                order_num: idx,
                order: idx
            };
            if (itemId) payload.id = itemId;
            items.push(payload);
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
        description: descriptionHtml,
        content: descriptionHtml,
        full_description: descriptionHtml,
        description_html: descriptionHtml,
        service_description: descriptionHtml,
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
        const template = document.createElement('div');
        const nextIndex = container.querySelectorAll('.service-item-input').length;
        template.innerHTML = createServiceItemMarkup({}, nextIndex);
        const newItem = template.firstElementChild;
        container.appendChild(newItem);
        initServiceItemDescriptionEditor(newItem);
        refreshServiceItemIndexes();
    }
}

function removeServiceItem(btn) {
    const container = document.getElementById('serviceItemsContainer');
    if (container && container.children.length > 1) {
        const itemEl = btn.closest('.service-item-input');
        destroyServiceItemDescriptionEditor(itemEl);
        itemEl.remove();
        refreshServiceItemIndexes();
    } else {
        alert('Ən azı bir maddə olmalıdır!');
    }
}
function toggleServiceItemDescription(btn) {
    const wrapper = btn.closest('.service-item-input');
    if (!wrapper) return;
    wrapper.classList.toggle('is-description-open');
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
window.toggleServiceItemDescription = toggleServiceItemDescription;
window.initServiceDescriptionEditor = initServiceDescriptionEditor;
window.getServiceDescriptionValue = getServiceDescriptionValue;
window.setServiceDescriptionValue = setServiceDescriptionValue;
window.clearServiceDescriptionEditor = clearServiceDescriptionEditor;

document.addEventListener('DOMContentLoaded', function() {
    console.log('services.js yükləndi');
    initServiceDescriptionEditor();
    const servicesPage = document.getElementById('contentServicesPage');
    if (servicesPage && !servicesPage.classList.contains('hidden')) {
        loadServices();
    }
});
