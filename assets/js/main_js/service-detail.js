(function () {
    'use strict';

    const FALLBACK_DESCRIPTION = 'Bu xidmət üzrə peşəkar dəstək təqdim edirik.';

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

    function getEls() {
        return {
            status: document.getElementById('service-detail-status'),
            title: document.getElementById('service-detail-title'),
            desc: document.getElementById('service-detail-description'),
            items: document.getElementById('service-detail-items')
        };
    }

    function renderState(type, message) {
        const { status } = getEls();
        if (!status) return;
        status.className = 'service-state ' + type;
        status.textContent = message;
    }

    function normalizeItem(item) {
        if (typeof item === 'string') {
            const text = item.trim();
            if (!text) return null;
            return { heading: text, body: '' };
        }
        if (!item || typeof item !== 'object') return null;
        const heading = String(item.title || item.name || item.text || '').trim();
        const body = String(item.description || item.content || '').trim();
        if (!heading && !body) return null;
        return { heading: heading || 'Xidmət detalı', body };
    }

    function renderService(service) {
        const { title, desc, items } = getEls();
        title.textContent = service.name || 'Xidmət';
        desc.textContent = service.description || FALLBACK_DESCRIPTION;

        const normalizedItems = Array.isArray(service.items) ? service.items.map(normalizeItem).filter(Boolean) : [];

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

        renderState('success', 'Məlumatlar yeniləndi.');
    }

    function findBySlug(services, slug) {
        const target = normalizeAzSlug(slug);
        return (services || []).find(function (service) {
            return normalizeAzSlug(service.slug || service.name) === target;
        });
    }

    async function init() {
        const slug = (document.body && document.body.dataset && document.body.dataset.serviceSlug) || '';
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
            const { items } = getEls();
            items.innerHTML = '<a class="service-back-link" href="index.html#xidmetler">Bütün xidmətlərə qayıt</a>';
            return;
        }

        renderService(service);
    }

    document.addEventListener('DOMContentLoaded', init);
})();
