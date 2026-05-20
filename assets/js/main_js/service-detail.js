(function () {
    'use strict';

    function normalizeAzSlug(value) {
        return String(value || '')
            .replace(/[Əə]/g, 'e')
            .replace(/[Iİıi]/g, 'i')
            .replace(/[Öö]/g, 'o')
            .replace(/[Üü]/g, 'u')
            .replace(/[Şş]/g, 's')
            .replace(/[Çç]/g, 'c')
            .replace(/[Ğğ]/g, 'g')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    function getSlugFromPage() {
        const params = new URLSearchParams(window.location.search);
        return params.get('slug') || document.body.dataset.serviceSlug || '';
    }

    function getEls() {
        return {
            status: document.getElementById('service-detail-status'),
            title: document.getElementById('service-detail-title'),
            items: document.getElementById('service-detail-items'),
            descriptionSection: document.getElementById('service-detail-description-section'),
            description: document.getElementById('service-detail-description')
        };
    }

    function renderState(type, message) {
        const { status } = getEls();
        if (!status) return;
        status.className = 'service-state ' + type;
        status.textContent = message;
    }

    function getItemText(item) {
        if (!item) return '';
        if (typeof item === 'string' || typeof item === 'number') return String(item).trim();
        if (typeof item !== 'object') return '';
        return String(item.title || item.name || item.text || item.description || item.content || item.item_text || item.service_item || item.service_text || item.value || item.label || '').trim();
    }

    function normalizeItem(item, index) {
        const heading = getItemText(item);
        const body = (item && typeof item === 'object') ? String(item.description || item.content || '').trim() : '';
        const order = (item && typeof item === 'object') ? Number(item.order ?? item.order_num ?? item.sort_order ?? item.position ?? index) || index : index;
        if (!heading && !body) return null;
        return { heading: heading || 'Xidmət detalı', body, order };
    }

    function getServiceRichDescription(service) {
        if (!service) return '';

        const direct = String(
            service.descriptionHtml ||
            service.content ||
            service.fullDescription ||
            service.full_description ||
            service.description_html ||
            service.long_description ||
            service.longDescription ||
            service.body ||
            service.about ||
            service.details ||
            service.detail ||
            service.text ||
            service.description ||
            ''
        ).trim();

        if (direct) return direct;

        const raw = service.original || {};
        return String(
            raw.description_html ||
            raw.descriptionHtml ||
            raw.content ||
            raw.full_description ||
            raw.fullDescription ||
            raw.long_description ||
            raw.longDescription ||
            raw.body ||
            raw.about ||
            raw.details ||
            raw.detail ||
            raw.text ||
            raw.description ||
            ''
        ).trim();
    }

    function renderService(service) {
        const { title, items } = getEls();
        title.textContent = service.name || 'Xidmət';

        const normalizedItems = Array.isArray(service.items)
            ? service.items.map((item, index) => normalizeItem(item, index)).filter(Boolean).sort((a, b) => a.order - b.order)
            : [];

        if (!normalizedItems.length) {
            items.innerHTML = '<div class="service-empty">Bu xidmət üzrə məlumatlar tezliklə əlavə olunacaq.</div>';
        } else {
            items.innerHTML = normalizedItems.map(function (item) {
                return '<article class="service-item-card">' +
                    '<h3>' + item.heading + '</h3>' +
                    (item.body ? '<p>' + item.body + '</p>' : '') +
                    '</article>';
            }).join('');
        }

        renderServiceDescription(service);
        renderState('success', 'Məlumatlar yeniləndi.');
    }

    function renderServiceDescription(service) {
        const { descriptionSection, description } = getEls();
        if (!descriptionSection || !description) return;

        const rawDescription = normalizeEditorHtml(getServiceRichDescription(service));

        console.log('DESCRIPTION THAT WILL BE INSERTED INTO HTML:', rawDescription);

        if (!rawDescription) {
            description.innerHTML = '';
            descriptionSection.hidden = true;
            console.warn('No service description returned from public API for this service:', service);
            return;
        }

        if (containsHtmlTags(rawDescription)) {
            description.innerHTML = sanitizeRichHtml(rawDescription);
        } else {
            description.innerHTML = '<p>' + escapeHtml(rawDescription) + '</p>';
        }

        description.querySelectorAll('a').forEach((a) => {
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
        });

        descriptionSection.hidden = false;
    }

    function normalizeEditorHtml(html) {
        const clean = String(html || '').trim();
        if (!clean || clean === '<p><br></p>') return '';
        return clean;
    }

    function containsHtmlTags(value) {
        return /<[^>]+>/.test(String(value || ''));
    }

    function stripHtml(html) {
        const div = document.createElement('div');
        div.innerHTML = html || '';
        return (div.textContent || div.innerText || '').trim();
    }

    function escapeHtml(text) {
        return String(text || '').replace(/[&<>"]/g, function(ch) {
            return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch] || ch;
        });
    }

    function sanitizeRichHtml(html) {
        if (!html) return '';
        if (window.DOMPurify) {
            return window.DOMPurify.sanitize(html, {
                ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'h2', 'h3', 'ul', 'ol', 'li', 'a', 'span'],
                ALLOWED_ATTR: ['href', 'target', 'rel', 'style', 'class']
            });
        }
        return '<p>' + escapeHtml(stripHtml(html)) + '</p>';
    }

    function findBySlug(services, slug) {
        const target = normalizeAzSlug(slug);
        return (services || []).find(function (service) {
            return normalizeAzSlug(service.slug || service.name) === target;
        });
    }

    async function init() {
        const slug = normalizeAzSlug(getSlugFromPage());
        if (!slug) {
            renderState('error', 'Xidmət açarı tapılmadı.');
            return;
        }

        renderState('loading', 'Xidmət məlumatları yüklənir...');

        const api = window.ApiMainService && window.ApiMainService.services;
        let service = null;

        if (api && typeof api.getBySlug === 'function') {
            const bySlug = await api.getBySlug(slug);
            if (bySlug && bySlug.success && bySlug.data && (bySlug.data.name || bySlug.data.slug)) {
                service = bySlug.data;
            }
        }

        if (!service && api && typeof api.getPublic === 'function') {
            const pub = await api.getPublic();
            if (pub && pub.success && Array.isArray(pub.data)) {
                service = findBySlug(pub.data, slug);
            }
        }

        if (!service) {
            try {
                const saved = JSON.parse(localStorage.getItem('guvenfinans-active-services') || '[]');
                service = findBySlug(saved, slug);
            } catch (e) {}
        }

        if (!service) {
            renderState('error', 'Xidmət məlumatı tapılmadı.');
            return;
        }

        renderService(service);
    }

    document.addEventListener('DOMContentLoaded', init);
})();
