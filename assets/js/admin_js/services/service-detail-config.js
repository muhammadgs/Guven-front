// assets/js/admin_js/services/service-detail-config.js
// Shared configuration for the public service detail pages.
(function(window) {
    'use strict';

    const namespace = window.GuvenServiceDetails = window.GuvenServiceDetails || {};

    const CATEGORY_META = {
        accounting: {
            slug: 'accounting',
            icon: 'fa-solid fa-calculator',
            eyebrow: 'Maliyyə əməliyyatları',
            title: 'Mühasibatlıq xidmətləri',
            subtitle: 'Şirkətinizin uçot, hesabat və gündəlik maliyyə proseslərini dəqiq, şəffaf və auditə hazır formada idarə edirik.',
            aliases: ['muhasibatliq-xidmetleri', 'muhasibatliq', 'accounting', '1']
        },
        tax: {
            slug: 'tax',
            icon: 'fa-solid fa-file-invoice-dollar',
            eyebrow: 'Vergi uyğunluğu',
            title: 'Vergi xidmətləri',
            subtitle: 'Vergi risklərini öncədən görən, qanunvericiliyə uyğun və biznesinizin böyüməsini dəstəkləyən peşəkar vergi müşayiəti.',
            aliases: ['vergi-xidmetleri', 'vergi', 'tax', '2']
        },
        hr: {
            slug: 'hr',
            icon: 'fa-solid fa-users-gear',
            eyebrow: 'Komanda idarəçiliyi',
            title: 'İnsan Resursları',
            subtitle: 'Kadr inzibatçılığı, əmək münasibətləri və sənədləşmə proseslərini etibarlı HR standartlarına uyğun qururuq.',
            aliases: ['insan-resurslari', 'hr', 'human-resources', '3']
        },
        legal: {
            slug: 'legal',
            icon: 'fa-solid fa-scale-balanced',
            eyebrow: 'Hüquqi müşayiət',
            title: 'Hüquqi xidmətlər',
            subtitle: 'Müqavilələrdən korporativ idarəetməyə qədər hüquqi qərarlarınızı peşəkar komanda ilə təhlükəsizləşdiririk.',
            aliases: ['huquqi-xidmetler', 'huquq', 'legal', '4']
        },
        it: {
            slug: 'it',
            icon: 'fa-solid fa-network-wired',
            eyebrow: 'Rəqəmsal infrastruktur',
            title: 'İKT',
            subtitle: 'Texniki dəstək, şəbəkə və kommunikasiya infrastrukturunu fasiləsiz biznes əməliyyatları üçün layihələndirir və idarə edirik.',
            aliases: ['ikt', 'it', 'informasiya-kommunikasiya-texnologiyalari', '5']
        }
    };

    const orderedSlugs = ['accounting', 'tax', 'hr', 'legal', 'it'];

    namespace.config = {
        routePrefix: '/services/',
        homePath: '/',
        cacheTtl: 60 * 1000,
        storageKeys: ['guvenfinans-active-services', 'guvenfinans-services'],
        categories: CATEGORY_META,
        orderedSlugs
    };
})(window);
