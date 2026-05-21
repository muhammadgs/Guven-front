(function () {
    'use strict';

    const FALLBACK_DESCRIPTION = '';
    const ALLOWED_TAGS = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'UL', 'OL', 'LI', 'H1', 'H2', 'H3', 'H4', 'BLOCKQUOTE', 'A', 'SPAN']);
    const BLOCKED_TAGS = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'FORM', 'INPUT']);
    const SAFE_LINK_PROTOCOLS = ['http:', 'https:', 'mailto:', 'tel:'];

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

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }


    function sanitizeInlineStyle(styleValue) {
        if (!styleValue) return '';
        const allowed = new Set(['color', 'background-color', 'font-family', 'text-align']);
        return styleValue
            .split(';')
            .map(function (declaration) {
                const parts = declaration.split(':');
                if (parts.length < 2) return '';
                const prop = parts[0].trim().toLowerCase();
                const val = parts.slice(1).join(':').trim();
                if (!allowed.has(prop) || !val) return '';
                if (/url\s*\(|expression\s*\(/i.test(val)) return '';
                return prop + ': ' + val;
            })
            .filter(Boolean)
            .join('; ');
    }
    function sanitizeServiceHtml(rawHtml) {
        if (!rawHtml || typeof rawHtml !== 'string') return '';

        const template = document.createElement('template');
        template.innerHTML = rawHtml;

        const walk = function (root) {
            Array.from(root.children).forEach(function (node) {
                const tag = node.tagName;

                if (BLOCKED_TAGS.has(tag)) {
                    node.remove();
                    return;
                }

                if (!ALLOWED_TAGS.has(tag)) {
                    const parent = node.parentNode;
                    while (node.firstChild) parent.insertBefore(node.firstChild, node);
                    parent.removeChild(node);
                    return;
                }

                Array.from(node.attributes).forEach(function (attr) {
                    const attrName = attr.name.toLowerCase();
                    const attrValue = (attr.value || '').trim();
                    if (attrName.startsWith('on')) {
                        node.removeAttribute(attr.name);
                        return;
                    }
                    if (tag === 'A' && attrName === 'href') {
                        if (attrValue.startsWith('#')) return;
                        try {
                            const parsed = new URL(attrValue, window.location.origin);
                            if (!SAFE_LINK_PROTOCOLS.includes(parsed.protocol)) {
                                node.removeAttribute(attr.name);
                            }
                        } catch (e) {
                            node.removeAttribute(attr.name);
                        }
                        return;
                    }
                    if (tag === 'A' && (attrName === 'target' || attrName === 'rel')) return;
                    if (attrName === 'class') {
                        const filtered = (attrValue.match(/\bql-[a-z0-9-]+\b/gi) || []).join(' ').trim();
                        if (filtered) {
                            node.setAttribute('class', filtered);
                        } else {
                            node.removeAttribute(attr.name);
                        }
                        return;
                    }
                    if (attrName === 'style') {
                        const safeStyle = sanitizeInlineStyle(attrValue);
                        if (safeStyle) node.setAttribute('style', safeStyle);
                        else node.removeAttribute(attr.name);
                        return;
                    }
                    node.removeAttribute(attr.name);
                });

                walk(node);
            });
        };

        walk(template.content);
        return template.innerHTML.trim();
    }

    function renderService(service) {
        const { title, desc, items } = getEls();
        title.textContent = service.name || 'Xidmət';
        const safeDescriptionHtml = sanitizeServiceHtml(service.description || '');
        if (safeDescriptionHtml) {
            desc.innerHTML = safeDescriptionHtml;
            desc.style.display = '';
        } else {
            desc.innerHTML = FALLBACK_DESCRIPTION ? `<p>${escapeHtml(FALLBACK_DESCRIPTION)}</p>` : '';
            desc.style.display = 'none';
        }

        const normalizedItems = Array.isArray(service.items)
            ? service.items.map((item, index) => normalizeItem(item, index)).filter(Boolean).sort((a, b) => a.order - b.order)
            : [];

        if (!normalizedItems.length) {
            items.innerHTML = '<div class="service-empty">Bu xidmət üzrə məlumatlar tezliklə əlavə olunacaq.</div>';
        } else {
            items.innerHTML = normalizedItems.map(function (item) {
                return '<article class="service-item-card">' +
                    '<h3>' + escapeHtml(item.heading) + '</h3>' +
                    (item.body ? '<p>' + escapeHtml(item.body) + '</p>' : '') +
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
