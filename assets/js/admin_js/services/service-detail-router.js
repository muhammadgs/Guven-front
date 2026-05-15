// assets/js/admin_js/services/service-detail-router.js
// History API router for dedicated public service detail views.
(function(window, document) {
    'use strict';

    const namespace = window.GuvenServiceDetails = window.GuvenServiceDetails || {};
    const config = namespace.config;
    const store = namespace.store;
    const filter = namespace.filter;
    const renderer = namespace.renderer;
    const utils = namespace.utils;

    const state = {
        initialized: false,
        activeSlug: null,
        lastRenderToken: 0
    };

    function getPathname() {
        return window.location.pathname.replace(/\/index\.html$/, '/') || '/';
    }

    function getRouteSlug() {
        const path = getPathname();
        if (!path.startsWith(config.routePrefix)) return '';
        return decodeURIComponent(path.slice(config.routePrefix.length).replace(/^\/+|\/+$/g, ''));
    }

    function buildUrl(slug) {
        return `${config.routePrefix}${encodeURIComponent(slug)}`;
    }

    async function open(slug, options = {}) {
        const canonicalSlug = filter.resolveCategorySlug(slug);
        const renderToken = ++state.lastRenderToken;
        state.activeSlug = canonicalSlug;
        renderer.renderLoading();

        if (options.push !== false) {
            window.history.pushState({ serviceDetailSlug: canonicalSlug }, '', buildUrl(canonicalSlug));
        }

        try {
            const services = await store.fetchServices(options.force === true);
            if (renderToken !== state.lastRenderToken) return;

            const category = filter.getCategoryBySlug(services, canonicalSlug);
            if (!category.service) {
                renderer.renderNotFound();
                return;
            }

            const items = filter.getCategoryItems(services, category);
            if (!items.length) {
                renderer.renderEmpty(category);
                return;
            }

            document.title = `${category.service.name || category.meta?.title || 'Xidmət'} | Güvən Finans`;
            renderer.renderDetails({ category, items });
        } catch (error) {
            console.error('Service detail route failed:', error);
            renderer.renderError(error.message);
        }
    }

    function goHome(url = '/#xidmetler') {
        state.activeSlug = null;
        document.title = 'Güvən Finans | Innovativ maliyyə həlləri';
        renderer.showHome();
        if (url) window.history.pushState({}, '', url);
    }

    function handleCurrentRoute(options = {}) {
        const slug = getRouteSlug();
        if (slug) {
            open(slug, { push: false, force: options.force === true });
            return true;
        }

        if (renderer.isActive()) {
            renderer.showHome();
            state.activeSlug = null;
        }
        return false;
    }

    function handleClick(event) {
        const detailTrigger = event.target.closest('[data-service-detail-trigger]');
        if (detailTrigger) {
            event.preventDefault();
            const slug = detailTrigger.dataset.serviceSlug || detailTrigger.dataset.serviceKey || utils.slugify(detailTrigger.textContent);
            open(slug);
            return;
        }

        const routedServiceLink = event.target.closest('a[href^="/services/"]');
        if (routedServiceLink) {
            const url = new URL(routedServiceLink.href, window.location.origin);
            if (url.origin === window.location.origin) {
                event.preventDefault();
                open(url.pathname.slice(config.routePrefix.length));
            }
            return;
        }

        const homeAnchor = event.target.closest('a[href^="/#"], a[href="/"]');
        if (homeAnchor && renderer.isActive()) {
            event.preventDefault();
            const href = homeAnchor.getAttribute('href') || '/';
            goHome(href);
            const targetId = href.includes('#') ? href.split('#')[1] : '';
            if (targetId) {
                requestAnimationFrame(() => document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
            }
        }
    }

    function handleStorage(event) {
        if (!config.storageKeys.includes(event.key)) return;
        store.invalidate();
        if (state.activeSlug) open(state.activeSlug, { push: false, force: true });
    }

    function init() {
        if (state.initialized) return;
        state.initialized = true;
        document.addEventListener('click', handleClick, true);
        window.addEventListener('popstate', () => handleCurrentRoute());
        window.addEventListener('storage', handleStorage);
        handleCurrentRoute();
    }

    namespace.router = {
        init,
        open,
        refresh: () => state.activeSlug && open(state.activeSlug, { push: false, force: true }),
        currentSlug: () => state.activeSlug,
        getRouteSlug,
        buildUrl
    };
})(window, document);
