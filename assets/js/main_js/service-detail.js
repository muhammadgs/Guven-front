(function() {
    'use strict';

    var DEFAULT_DESCRIPTION = 'Bu xidmət üzrə peşəkar dəstək təqdim edirik.';

    function normalizeSlug(input) {
        return String(input || '')
            .toLowerCase()
            .replace(/[əƏ]/g, 'e')
            .replace(/[ıİI]/g, 'i')
            .replace(/[öÖ]/g, 'o')
            .replace(/[üÜ]/g, 'u')
            .replace(/[şŞ]/g, 's')
            .replace(/[çÇ]/g, 'c')
            .replace(/[ğĞ]/g, 'g')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    function getEls() {
        return {
            status: document.getElementById('service-status'),
            title: document.getElementById('service-title'),
            description: document.getElementById('service-description'),
            items: document.getElementById('service-items'),
            fallback: document.getElementById('service-fallback')
        };
    }

    function setStatus(text, state) {
        var els = getEls();
        if (!els.status) return;
        els.status.textContent = text || '';
        els.status.classList.remove('is-error', 'is-empty');
        if (state) els.status.classList.add(state);
    }

    function normalizeItem(item) {
        if (typeof item === 'string') {
            var clean = item.trim();
            if (!clean) return null;
            return { heading: clean, body: clean };
        }
        if (!item || typeof item !== 'object') return null;

        var heading = item.title || item.name || item.text || '';
        var body = item.description || item.content || item.text || heading || '';
        heading = String(heading || '').trim();
        body = String(body || '').trim();

        if (!heading && !body) return null;
        if (!heading) heading = body;
        if (!body) body = heading;
        return { heading: heading, body: body };
    }

    function renderService(service) {
        var els = getEls();
        if (!els.title || !els.description || !els.items) return;

        els.title.textContent = service.name || 'Xidmət';
        els.description.textContent = service.description || DEFAULT_DESCRIPTION;
        els.items.innerHTML = '';

        var items = Array.isArray(service.items) ? service.items.map(normalizeItem).filter(Boolean) : [];
        if (!items.length) {
            els.items.innerHTML = '<div class="service-empty-box">Bu xidmət üzrə məlumatlar tezliklə əlavə olunacaq.</div>';
        } else {
            items.forEach(function(item) {
                var card = document.createElement('article');
                card.className = 'service-item-card';
                card.innerHTML = '<h3></h3><p></p>';
                card.querySelector('h3').textContent = item.heading;
                card.querySelector('p').textContent = item.body;
                els.items.appendChild(card);
            });
        }

        if (els.fallback) els.fallback.innerHTML = '';
        setStatus('Məlumatlar yeniləndi.');
    }

    function findServiceBySlug(services, slug) {
        var target = normalizeSlug(slug);
        if (!Array.isArray(services)) return null;
        for (var i = 0; i < services.length; i += 1) {
            var s = services[i] || {};
            if (normalizeSlug(s.slug) === target || normalizeSlug(s.name) === target) return s;
        }
        return null;
    }

    function readLocalServices() {
        try {
            var raw = localStorage.getItem('guvenfinans-active-services');
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    async function init() {
        var slug = (document.body && document.body.dataset && document.body.dataset.serviceSlug) || '';
        var api = window.ApiMainService && window.ApiMainService.services;
        setStatus('Xidmət məlumatları yüklənir...');

        var service = null;

        if (api && typeof api.getBySlug === 'function') {
            try {
                var detail = await api.getBySlug(slug);
                if (detail && detail.success && detail.data && detail.data.name) service = detail.data;
            } catch (e) {}
        }

        if (!service && api && typeof api.getPublic === 'function') {
            try {
                var listResult = await api.getPublic();
                if (listResult && listResult.success) {
                    service = findServiceBySlug(listResult.data, slug);
                }
            } catch (e) {}
        }

        if (!service) {
            service = findServiceBySlug(readLocalServices(), slug);
        }

        if (service) {
            renderService(service);
            return;
        }

        setStatus('Xidmət məlumatı tapılmadı.', 'is-error');
        var els = getEls();
        if (els.title) els.title.textContent = 'Xidmət tapılmadı';
        if (els.description) els.description.textContent = 'Hazırda bu xidmət üzrə məlumat təqdim etmək mümkün olmadı.';
        if (els.items) els.items.innerHTML = '<div class="service-empty-box">Lütfən bir qədər sonra yenidən cəhd edin.</div>';
        if (els.fallback) {
            els.fallback.innerHTML = '<a class="secondary" href="index.html#xidmetler">Xidmətlərə qayıt</a>';
        }
    }

    document.addEventListener('DOMContentLoaded', init);
})();
