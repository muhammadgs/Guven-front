// assets/js/admin_js/services/public-service-details.js
// Public homepage service detail router/view powered by the existing services source.

(function(window, document) {
    'use strict';

    const STORAGE_KEY = 'guvenfinans-active-services';
    const ALL_SERVICES_STORAGE_KEY = 'guvenfinans-services';
    const ROUTE_PREFIX = 'xidmetler/';
    const CACHE_TTL = 60 * 1000;

    const state = {
        initialized: false,
        root: null,
        activeKey: null,
        cache: null,
        cacheTime: 0,
        isLoading: false
    };

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function slugify(value) {
        const map = {
            ə: 'e', Ə: 'e', ğ: 'g', Ğ: 'g', ı: 'i', I: 'i', İ: 'i',
            ö: 'o', Ö: 'o', ş: 's', Ş: 's', ü: 'u', Ü: 'u', ç: 'c', Ç: 'c'
        };

        return String(value ?? '')
            .replace(/[əƏğĞıIİöÖşŞüÜçÇ]/g, (letter) => map[letter] || letter)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    function normalizeComparable(value) {
        return slugify(value).replace(/-xidmetlerin-tesviri$/, '-xidmetler');
    }

    function getServiceKey(service) {
        if (!service) return '';
        return String(service.id || service.slug || service.key || slugify(service.name || service.title));
    }

    function getServiceSlug(service) {
        return slugify(service?.slug || service?.name || service?.title || getServiceKey(service));
    }

    function isActiveService(service) {
        return service?.active !== false && service?.is_active !== false && service?.status !== 'inactive';
    }

    function normalizeServiceList(rawData) {
        let list = rawData;

        if (rawData && !Array.isArray(rawData)) {
            list = rawData.data || rawData.services || rawData.results || rawData.items || [];
        }

        return Array.isArray(list)
            ? list.filter(Boolean).filter(isActiveService).sort((a, b) => (a.order || 0) - (b.order || 0))
            : [];
    }

    async function fetchServices(force = false) {
        const now = Date.now();
        if (!force && state.cache && now - state.cacheTime < CACHE_TTL) {
            return state.cache;
        }

        state.isLoading = true;

        try {
            if (window.ApiMainService?.services?.getPublic) {
                const response = await window.ApiMainService.services.getPublic();
                if (response?.success) {
                    state.cache = normalizeServiceList(response.data);
                    state.cacheTime = now;
                    return state.cache;
                }
            }

            const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(ALL_SERVICES_STORAGE_KEY);
            if (saved) {
                state.cache = normalizeServiceList(JSON.parse(saved));
                state.cacheTime = now;
                return state.cache;
            }

            state.cache = [];
            state.cacheTime = now;
            return state.cache;
        } finally {
            state.isLoading = false;
        }
    }

    function getCategoryByKey(services, key) {
        const comparableKey = normalizeComparable(key);

        return services.find((service) => {
            const keys = [
                getServiceKey(service),
                getServiceSlug(service),
                service.name,
                service.title,
                service.category,
                service.categoryName,
                service.category_name
            ].filter(Boolean).map(normalizeComparable);

            return keys.includes(comparableKey);
        });
    }

    function getCategoryItems(services, category, requestedKey) {
        if (!category) {
            return [];
        }

        const embeddedItems = category.items || category.services || category.children || category.details;
        if (Array.isArray(embeddedItems)) {
            return embeddedItems
                .filter(Boolean)
                .map((item, index) => typeof item === 'string'
                    ? { id: `${getServiceKey(category)}-${index}`, title: item, description: '' }
                    : {
                        id: item.id || `${getServiceKey(category)}-${index}`,
                        title: item.title || item.name || item.service_name || `Xidmət ${index + 1}`,
                        description: item.description || item.short_description || item.fullDescription || item.full_description || '',
                        icon: item.icon || item.iconClass || item.icon_class || '',
                        image: item.image || item.imageUrl || item.image_url || item.mediaUrl || item.media_url || ''
                    });
        }

        const categoryComparables = [requestedKey, getServiceKey(category), getServiceSlug(category), category.name, category.title]
            .filter(Boolean)
            .map(normalizeComparable);

        return services.filter((service) => {
            const value = service.categoryId || service.category_id || service.categorySlug || service.category_slug || service.category || service.categoryName || service.category_name;
            return value && categoryComparables.includes(normalizeComparable(value));
        });
    }

    function getDescription(category) {
        return category?.description || category?.shortDescription || category?.short_description || category?.fullDescription || category?.full_description || 'Seçilmiş kateqoriya üzrə xidmətlərimiz biznesinizin gündəlik ehtiyaclarına uyğun çevik və ölçüləbilən formada təqdim olunur.';
    }

    function ensureRoot() {
        if (state.root) return state.root;

        const servicesSection = document.getElementById('xidmetler');
        const container = servicesSection?.querySelector('.container') || document.body;
        const root = document.createElement('div');
        root.id = 'service-detail-view';
        root.className = 'service-detail-view';
        root.setAttribute('aria-live', 'polite');
        root.hidden = true;
        container.appendChild(root);
        state.root = root;
        return root;
    }

    function renderLoading(key) {
        const root = ensureRoot();
        root.hidden = false;
        root.innerHTML = `
            <section class="service-detail-panel is-loading" data-active-service-key="${escapeHtml(key)}">
                <div class="service-detail-toolbar">
                    <span class="service-detail-eyebrow">Xidmət detalları</span>
                    <button type="button" class="service-detail-close" data-service-detail-close aria-label="Bağla">×</button>
                </div>
                <div class="service-detail-skeleton service-detail-skeleton-title"></div>
                <div class="service-detail-skeleton service-detail-skeleton-text"></div>
                <div class="service-detail-items">
                    <div class="service-detail-skeleton-card"></div>
                    <div class="service-detail-skeleton-card"></div>
                    <div class="service-detail-skeleton-card"></div>
                </div>
            </section>
        `;
        scrollIntoView();
    }

    function renderError(message) {
        const root = ensureRoot();
        root.hidden = false;
        root.innerHTML = `
            <section class="service-detail-panel service-detail-state">
                <button type="button" class="service-detail-close" data-service-detail-close aria-label="Bağla">×</button>
                <div class="service-detail-state-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
                <h3>Xidmət məlumatı yüklənmədi</h3>
                <p>${escapeHtml(message || 'Zəhmət olmasa bir az sonra yenidən cəhd edin.')}</p>
            </section>
        `;
        scrollIntoView();
    }

    function renderEmpty(category) {
        const root = ensureRoot();
        root.hidden = false;
        root.innerHTML = `
            <section class="service-detail-panel service-detail-state">
                <button type="button" class="service-detail-close" data-service-detail-close aria-label="Bağla">×</button>
                <div class="service-detail-state-icon"><i class="fa-regular fa-folder-open"></i></div>
                <h3>${escapeHtml(category?.name || category?.title || 'Xidmət tapılmadı')}</h3>
                <p>Bu kateqoriya üzrə aktiv xidmət əlavə edilməyib. Admin paneldən xidmət maddələri əlavə edildikdə burada avtomatik görünəcək.</p>
            </section>
        `;
        scrollIntoView();
    }

    function renderDetails(category, items) {
        const root = ensureRoot();
        const categoryTitle = category.name || category.title || 'Xidmət detalları';
        const categoryKey = getServiceKey(category);
        const serviceCards = items.map((item, index) => {
            const title = item.title || item.name || item.service_name || `Xidmət ${index + 1}`;
            const description = item.description || item.short_description || item.fullDescription || item.full_description || '';
            const image = item.image || item.imageUrl || item.image_url || item.mediaUrl || item.media_url || '';
            const icon = item.icon || item.iconClass || item.icon_class || '';
            const number = String(index + 1).padStart(2, '0');

            const visual = image
                ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" loading="lazy">`
                : icon
                    ? `<i class="${escapeHtml(icon)}"></i>`
                    : `<span>${number}</span>`;

            return `
                <article class="service-detail-item">
                    <div class="service-detail-item-icon">${visual}</div>
                    <div>
                        <h4>${escapeHtml(title)}</h4>
                        ${description ? `<p>${escapeHtml(description)}</p>` : '<p>Bu xidmət üzrə peşəkar komanda tərəfindən tam dəstək göstərilir.</p>'}
                    </div>
                </article>
            `;
        }).join('');

        root.hidden = false;
        root.innerHTML = `
            <section class="service-detail-panel" data-active-service-key="${escapeHtml(categoryKey)}">
                <div class="service-detail-toolbar">
                    <span class="service-detail-eyebrow">Xidmət detalları</span>
                    <button type="button" class="service-detail-close" data-service-detail-close aria-label="Bağla">×</button>
                </div>
                <div class="service-detail-hero">
                    <div>
                        <h3>${escapeHtml(categoryTitle)}</h3>
                        <p>${escapeHtml(getDescription(category))}</p>
                    </div>
                    <div class="service-detail-count">
                        <strong>${items.length}</strong>
                        <span>aktiv xidmət</span>
                    </div>
                </div>
                <div class="service-detail-items">
                    ${serviceCards}
                </div>
                <div class="service-detail-footer">
                    <a href="#konsultasiya" data-scroll-target="konsultasiya" class="service-detail-cta">Konsultasiya al</a>
                </div>
            </section>
        `;
        scrollIntoView();
    }

    function scrollIntoView() {
        requestAnimationFrame(() => {
            ensureRoot().scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    async function openByKey(key, options = {}) {
        if (!key) {
            renderError('Seçilmiş xidmət kateqoriyası düzgün deyil.');
            return;
        }

        const normalizedKey = decodeURIComponent(String(key).replace(/^#?xidmetler\/?/, ''));
        state.activeKey = normalizedKey;
        renderLoading(normalizedKey);

        try {
            const services = await fetchServices(options.force === true);
            const category = getCategoryByKey(services, normalizedKey);

            if (!category) {
                renderError('Seçilmiş kateqoriya aktiv xidmətlər arasında tapılmadı.');
                return;
            }

            const items = getCategoryItems(services, category, normalizedKey);
            if (!items.length) {
                renderEmpty(category);
                return;
            }

            renderDetails(category, items);

            if (options.updateHash !== false) {
                const route = `${ROUTE_PREFIX}${getServiceSlug(category)}`;
                if (window.location.hash.slice(1) !== route) {
                    window.history.pushState({ serviceDetail: getServiceKey(category) }, '', `#${route}`);
                }
            }
        } catch (error) {
            console.error('Service detail rendering failed:', error);
            renderError(error.message);
        }
    }

    function closeDetails(options = {}) {
        if (state.root) {
            state.root.hidden = true;
            state.root.innerHTML = '';
        }
        state.activeKey = null;

        if (options.updateHash !== false && window.location.hash.startsWith(`#${ROUTE_PREFIX}`)) {
            window.history.pushState({}, '', '#xidmetler');
        }
    }

    function getTriggerKey(trigger) {
        return trigger.dataset.serviceKey || trigger.dataset.serviceSlug || trigger.dataset.serviceId || slugify(trigger.closest('.service-card')?.querySelector('.service-title')?.textContent || '');
    }

    function handleClick(event) {
        const closeButton = event.target.closest('[data-service-detail-close]');
        if (closeButton) {
            event.preventDefault();
            closeDetails();
            return;
        }

        const dynamicScrollLink = event.target.closest('.service-detail-view [data-scroll-target]');
        if (dynamicScrollLink) {
            const target = document.getElementById(dynamicScrollLink.getAttribute('data-scroll-target'));
            if (target) {
                event.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                closeDetails({ updateHash: false });
                window.history.pushState({}, '', dynamicScrollLink.getAttribute('href') || '#konsultasiya');
            }
            return;
        }

        const trigger = event.target.closest('[data-service-detail-trigger]');
        if (!trigger) return;

        event.preventDefault();
        openByKey(getTriggerKey(trigger));
    }

    function handleRouteChange() {
        const hash = decodeURIComponent(window.location.hash.replace(/^#/, ''));
        if (hash.startsWith(ROUTE_PREFIX)) {
            openByKey(hash.slice(ROUTE_PREFIX.length), { updateHash: false });
        } else if (state.activeKey && hash !== ROUTE_PREFIX) {
            closeDetails({ updateHash: false });
        }
    }

    function invalidateCache() {
        state.cache = null;
        state.cacheTime = 0;
    }

    function init() {
        if (state.initialized) return;
        state.initialized = true;
        ensureRoot();
        document.addEventListener('click', handleClick);
        window.addEventListener('hashchange', handleRouteChange);
        window.addEventListener('popstate', handleRouteChange);
        window.addEventListener('storage', (event) => {
            if ([STORAGE_KEY, ALL_SERVICES_STORAGE_KEY].includes(event.key)) {
                invalidateCache();
                if (state.activeKey) openByKey(state.activeKey, { force: true, updateHash: false });
            }
        });
        handleRouteChange();
    }

    window.PublicServiceDetails = {
        init,
        open: openByKey,
        close: closeDetails,
        refreshServices: invalidateCache,
        slugify,
        getServiceKey
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})(window, document);
