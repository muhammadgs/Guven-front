// assets/js/admin_js/services/public-service-details.js
// Compatibility facade for the modular public service-detail page system.
(function(window, document) {
    'use strict';

    const namespace = window.GuvenServiceDetails = window.GuvenServiceDetails || {};

    function init() {
        namespace.router?.init();
    }

    window.PublicServiceDetails = {
        init,
        open: (key, options = {}) => namespace.router?.open(key, { push: options.updateHistory !== false, force: options.force === true }),
        close: () => namespace.renderer?.showHome(),
        refreshServices: () => {
            namespace.store?.invalidate();
            namespace.router?.refresh();
        },
        slugify: (value) => namespace.utils?.slugify(value) || String(value || ''),
        getServiceKey: (service) => namespace.utils?.getServiceKey(service) || String(service?.id || service?.name || ''),
        getServiceSlug: (service) => namespace.utils?.getServiceSlug(service) || String(service?.slug || service?.name || '')
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})(window, document);
