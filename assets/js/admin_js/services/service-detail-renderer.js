// assets/js/admin_js/services/service-detail-renderer.js
// Owns page mounting, state transitions and homepage visibility for service detail routes.
(function(window, document) {
    'use strict';

    const namespace = window.GuvenServiceDetails = window.GuvenServiceDetails || {};
    const templates = namespace.templates;

    const state = {
        root: null,
        homeChildren: [],
        active: false
    };

    function getRoot() {
        if (state.root) return state.root;

        const main = document.getElementById('main') || document.querySelector('main');
        const root = document.createElement('div');
        root.id = 'service-detail-page-root';
        root.className = 'service-detail-page-root';
        root.hidden = true;
        main.appendChild(root);
        state.root = root;
        return root;
    }

    function captureHomeChildren() {
        if (state.homeChildren.length) return;
        const main = document.getElementById('main') || document.querySelector('main');
        state.homeChildren = Array.from(main.children).filter((child) => child.id !== 'service-detail-page-root');
    }

    function setServiceMode(enabled) {
        captureHomeChildren();
        state.active = enabled;
        document.body.classList.toggle('service-route-active', enabled);
        state.homeChildren.forEach((child) => {
            child.hidden = enabled;
        });
        getRoot().hidden = !enabled;
    }

    function render(html) {
        const root = getRoot();
        root.innerHTML = html;
        setServiceMode(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function renderLoading() {
        render(templates.loading());
    }

    function renderDetails(payload) {
        render(templates.details(payload));
    }

    function renderEmpty(category) {
        const title = category?.service?.name || category?.meta?.title || 'Xidmət tapılmadı';
        render(templates.state({
            icon: 'fa-regular fa-folder-open',
            title,
            message: 'Bu kateqoriya üzrə aktiv xidmət əlavə edilməyib. Admin paneldən xidmət maddələri əlavə edildikdə səhifə avtomatik yenilənəcək.',
            actionHref: '/#xidmetler',
            actionText: 'Xidmətlərə qayıt'
        }));
    }

    function renderNotFound() {
        render(templates.state({
            icon: 'fa-solid fa-route',
            title: 'Xidmət səhifəsi tapılmadı',
            message: 'Axtardığınız xidmət kateqoriyası mövcud deyil və ya hazırda deaktivdir.',
            actionHref: '/#xidmetler',
            actionText: 'Xidmətlərə qayıt'
        }));
    }

    function renderError(message) {
        render(templates.state({
            icon: 'fa-solid fa-triangle-exclamation',
            title: 'Xidmət məlumatı yüklənmədi',
            message: message || 'Zəhmət olmasa bir az sonra yenidən cəhd edin.',
            actionHref: '/#xidmetler',
            actionText: 'Yenidən cəhd et'
        }));
    }

    function showHome() {
        setServiceMode(false);
        if (state.root) state.root.innerHTML = '';
    }

    namespace.renderer = {
        renderLoading,
        renderDetails,
        renderEmpty,
        renderNotFound,
        renderError,
        showHome,
        isActive: () => state.active
    };
})(window, document);
