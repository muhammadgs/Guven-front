// assets/js/admin_js/services/service-detail-utils.js
// Small utilities used by the service detail routing/rendering modules.
(function(window) {
    'use strict';

    const namespace = window.GuvenServiceDetails = window.GuvenServiceDetails || {};

    const characterMap = {
        ə: 'e', Ə: 'e', ğ: 'g', Ğ: 'g', ı: 'i', I: 'i', İ: 'i',
        ö: 'o', Ö: 'o', ş: 's', Ş: 's', ü: 'u', Ü: 'u', ç: 'c', Ç: 'c'
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
        return String(value ?? '')
            .replace(/[əƏğĞıIİöÖşŞüÜçÇ]/g, (letter) => characterMap[letter] || letter)
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
        const config = namespace.config || {};
        const comparableValues = [
            service?.slug,
            service?.key,
            service?.id,
            service?.name,
            service?.title,
            service?.category,
            service?.categoryName,
            service?.category_name
        ].filter(Boolean).map(normalizeComparable);

        const categories = config.categories || {};
        const foundSlug = Object.values(categories).find((category) => {
            const aliases = [category.slug, category.title, ...(category.aliases || [])].map(normalizeComparable);
            return comparableValues.some((value) => aliases.includes(value));
        })?.slug;

        return foundSlug || slugify(service?.slug || service?.name || service?.title || getServiceKey(service));
    }

    function isActiveService(service) {
        return service?.active !== false && service?.is_active !== false && service?.status !== 'inactive';
    }

    namespace.utils = {
        escapeHtml,
        slugify,
        normalizeComparable,
        getServiceKey,
        getServiceSlug,
        isActiveService
    };
})(window);
