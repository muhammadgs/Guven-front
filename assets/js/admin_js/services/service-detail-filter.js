// assets/js/admin_js/services/service-detail-filter.js
// Category matching and category-specific item extraction for public service detail pages.
(function(window) {
    'use strict';

    const namespace = window.GuvenServiceDetails = window.GuvenServiceDetails || {};
    const { normalizeComparable, getServiceKey, getServiceSlug } = namespace.utils;
    const config = namespace.config;

    function resolveCategorySlug(value) {
        const comparable = normalizeComparable(String(value || '').replace(/^\/?services\/?/, ''));
        if (!comparable) return '';

        const match = Object.values(config.categories).find((category) => {
            const aliases = [category.slug, category.title, ...(category.aliases || [])].map(normalizeComparable);
            return aliases.includes(comparable);
        });

        return match?.slug || comparable;
    }

    function buildServiceComparables(service) {
        return [
            getServiceKey(service),
            getServiceSlug(service),
            service.slug,
            service.key,
            service.id,
            service.name,
            service.title,
            service.category,
            service.categoryName,
            service.category_name
        ].filter(Boolean).map(normalizeComparable);
    }

    function getCategoryBySlug(services, requestedSlug) {
        const canonicalSlug = resolveCategorySlug(requestedSlug);
        const meta = config.categories[canonicalSlug];
        const acceptedValues = [canonicalSlug, meta?.title, ...(meta?.aliases || [])]
            .filter(Boolean)
            .map(normalizeComparable);

        const service = services.find((item) => {
            const comparables = buildServiceComparables(item);
            return comparables.some((value) => acceptedValues.includes(value));
        });

        return {
            slug: canonicalSlug,
            meta,
            service: service || null
        };
    }

    function normalizeItem(item, category, index) {
        if (typeof item === 'string') {
            return {
                id: `${category.slug}-${index}`,
                title: item,
                description: ''
            };
        }

        return {
            id: item.id || `${category.slug}-${index}`,
            title: item.title || item.name || item.service_name || `Xidmət ${index + 1}`,
            description: item.description || item.short_description || item.fullDescription || item.full_description || '',
            icon: item.icon || item.iconClass || item.icon_class || '',
            image: item.image || item.imageUrl || item.image_url || item.mediaUrl || item.media_url || ''
        };
    }

    function getCategoryItems(services, category) {
        if (!category?.service) return [];

        const embeddedItems = category.service.items || category.service.services || category.service.children || category.service.details;
        if (Array.isArray(embeddedItems)) {
            return embeddedItems.filter(Boolean).map((item, index) => normalizeItem(item, category, index));
        }

        const acceptedValues = [category.slug, category.service.name, category.service.title, category.service.id]
            .filter(Boolean)
            .map(normalizeComparable);

        return services
            .filter((service) => {
                const value = service.categoryId || service.category_id || service.categorySlug || service.category_slug || service.category || service.categoryName || service.category_name;
                return value && acceptedValues.includes(normalizeComparable(value));
            })
            .map((service, index) => normalizeItem(service, category, index));
    }

    namespace.filter = {
        resolveCategorySlug,
        getCategoryBySlug,
        getCategoryItems
    };
})(window);
