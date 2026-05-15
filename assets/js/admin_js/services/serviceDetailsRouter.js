(function (window, document) {
  'use strict';

  const STORAGE_KEY = 'guvenfinans-active-services';
  const FALLBACK_STORAGE_KEY = 'guvenfinans-services';
  const ROUTE_PARAM = 'service';
  const HOME_PATH = 'index.html';

  const CATEGORY_META = {
    muhasibatliq: {
      title: 'Mühasibatlıq xidmətləri',
      description: 'Maliyyə uçotunu şəffaf, düzgün və auditə hazır şəkildə idarə edirik.'
    },
    vergi: {
      title: 'Vergi xidmətləri',
      description: 'Vergi öhdəliklərini düzgün planlama və icra ilə riskləri minimuma endiririk.'
    },
    'insan-resurslari': {
      title: 'İnsan Resursları',
      description: 'İşçi idarəçiliyi, sənədləşmə və HR proseslərini standartlara uyğun qururuq.'
    },
    huquqi: {
      title: 'Hüquqi xidmətlər',
      description: 'Biznesinizi hüquqi baxımdan təhlükəsiz və dayanıqlı mühitdə inkişaf etdirməyə dəstək oluruq.'
    },
    ikt: {
      title: 'İKT',
      description: 'İnfrastruktur, texniki dəstək və rəqəmsal həllərlə işinizin fasiləsizliyini təmin edirik.'
    }
  };

  const SYNC = {
    muhasibatliq: ['muhasibatliq', 'mühasibatlıq', 'muhasibat', 'accounting', 'muhasib', 'muhasibatliq-xidmetleri'],
    vergi: ['vergi', 'tax', 'taxation', 'vergi-xidmetleri'],
    'insan-resurslari': ['insan-resurslari', 'insan resurslari', 'insan-resurslari-xidmetleri', 'hr', 'human-resources', 'human resources'],
    huquqi: ['huquqi', 'hüquqi', 'huquq', 'legal', 'law', 'huquqi-xidmetler'],
    ikt: ['ikt', 'it', 'information-technology', 'information technology', 'tech', 'texnologiya']
  };

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function normalizeText(value) {
    const map = { ə: 'e', Ə: 'e', ğ: 'g', Ğ: 'g', ı: 'i', I: 'i', İ: 'i', ö: 'o', Ö: 'o', ş: 's', Ş: 's', ü: 'u', Ü: 'u', ç: 'c', Ç: 'c' };
    return String(value || '')
      .replace(/[əƏğĞıIİöÖşŞüÜçÇ]/g, (letter) => map[letter] || letter)
      .toLowerCase()
      .replace(/[_\s]+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function resolveCategorySlug(raw) {
    const value = normalizeText(raw);
    if (!value) return '';
    if (CATEGORY_META[value]) return value;

    for (const [slug, variants] of Object.entries(SYNC)) {
      if (variants.some((variant) => normalizeText(variant) === value)) {
        return slug;
      }
    }

    return '';
  }

  function readServices() {
    let data = [];
    try {
      if (window.ApiMainService && window.ApiMainService.services && typeof window.ApiMainService.services.getPublic === 'function') {
        // synchronous localStorage-backed reader in this codebase
        const response = window.ApiMainService.services.getPublic();
        if (response && typeof response.then === 'function') {
          return response.then((result) => normalizeServices(result && result.data)).catch(() => normalizeServices(getLocalServices()));
        }
      }
    } catch (e) {}

    data = getLocalServices();
    return Promise.resolve(normalizeServices(data));
  }

  function getLocalServices() {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(FALLBACK_STORAGE_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch (e) {
      return [];
    }
  }

  function normalizeServices(data) {
    if (!Array.isArray(data)) return [];

    return data
      .filter(Boolean)
      .filter((service) => service.active !== false)
      .map((service, index) => {
        const title = service.title || service.name || `Xidmət ${index + 1}`;
        const description = service.description || service.desc || service.text || '';
        const itemList = Array.isArray(service.items)
          ? service.items.map((item) => (typeof item === 'string' ? { title: item, description: '' } : {
            title: item.title || item.name || item.text || '',
            description: item.description || item.desc || ''
          }))
          : [];

        const categorySlug = resolveCategorySlug(
          service.category_slug || service.categorySlug || service.service_category || service.category || title
        );

        return {
          id: service.id || index + 1,
          order: Number.isFinite(Number(service.order)) ? Number(service.order) : 9999,
          title,
          description,
          categorySlug,
          items: itemList
        };
      })
      .sort((a, b) => a.order - b.order);
  }

  function getRouteSlug() {
    const url = new URL(window.location.href);
    return resolveCategorySlug(url.searchParams.get(ROUTE_PARAM));
  }

  function ensureDetailContainer() {
    let node = document.getElementById('service-detail-route-view');
    if (node) return node;

    node = document.createElement('section');
    node.id = 'service-detail-route-view';
    node.style.display = 'none';
    const main = document.getElementById('main');
    if (main) main.prepend(node);
    return node;
  }

  function setHomeVisibility(hidden) {
    const main = document.getElementById('main');
    if (!main) return;
    Array.from(main.children).forEach((child) => {
      if (child.id === 'service-detail-route-view') return;
      child.style.display = hidden ? 'none' : '';
    });
  }

  function toServiceCards(services, slug) {
    return services
      .filter((service) => service.categorySlug === slug)
      .flatMap((service) => {
        if (service.items.length) {
          return service.items.map((item, idx) => ({
            name: item.title || service.title,
            description: item.description || service.description || 'Peşəkar komandamız tərəfindən bu xidmət tam nəzarətdə icra olunur.',
            order: service.order + idx / 100
          }));
        }

        return [{
          name: service.title,
          description: service.description || 'Peşəkar komandamız tərəfindən bu xidmət tam nəzarətdə icra olunur.',
          order: service.order
        }];
      })
      .sort((a, b) => a.order - b.order);
  }

  function renderDetailPage(slug, cards) {
    const meta = CATEGORY_META[slug];
    const view = ensureDetailContainer();
    const listHtml = cards.length
      ? cards.map((card) => `<article class="service-route-card"><h4>${escapeHtml(card.name)}</h4><p>${escapeHtml(card.description)}</p></article>`).join('')
      : '<div class="service-route-empty">Bu sahə üzrə xidmət əlavə edilməyib</div>';

    view.innerHTML = `
      <style>
        .service-route-wrap{max-width:1200px;margin:0 auto;padding:120px 20px 72px}
        .service-route-hero{background:linear-gradient(135deg,#111827,#1f2937);color:#fff;border-radius:20px;padding:32px}
        .service-route-breadcrumb{opacity:.85;font-size:14px;margin-bottom:12px}
        .service-route-meta{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;align-items:flex-end}
        .service-route-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;margin-top:24px}
        .service-route-card{background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:18px;box-shadow:0 10px 30px rgba(17,24,39,.05)}
        .service-route-card h4{margin:0 0 8px;font-size:18px}
        .service-route-card p{margin:0;color:#4b5563;line-height:1.5}
        .service-route-empty{margin-top:20px;background:#fff8f0;border:1px dashed #f59e0b;color:#92400e;border-radius:12px;padding:18px}
        .service-route-actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:24px}
        .service-route-btn{display:inline-flex;align-items:center;justify-content:center;padding:11px 18px;border-radius:10px;text-decoration:none;font-weight:600}
        .service-route-btn.back{background:#111827;color:#fff}
        .service-route-btn.cta{background:#ff6b00;color:#fff}
      </style>
      <div class="service-route-wrap">
        <div class="service-route-hero">
          <div class="service-route-breadcrumb">Ana səhifə / Xidmətlər / ${escapeHtml(meta.title)}</div>
          <div class="service-route-meta">
            <div>
              <h2>${escapeHtml(meta.title)}</h2>
              <p>${escapeHtml(meta.description)}</p>
            </div>
            <strong>${cards.length} xidmət</strong>
          </div>
        </div>
        <div class="service-route-grid">${listHtml}</div>
        <div class="service-route-actions">
          <a class="service-route-btn back" href="${HOME_PATH}#xidmetler" data-back-services>Bütün xidmətlərə qayıt</a>
          <a class="service-route-btn cta" href="${HOME_PATH}#konsultasiya">Konsultasiya üçün müraciət et</a>
        </div>
      </div>`;

    view.style.display = '';
    setHomeVisibility(true);
  }

  function hideDetailPage() {
    const view = document.getElementById('service-detail-route-view');
    if (view) view.style.display = 'none';
    setHomeVisibility(false);
  }

  async function renderFromRoute() {
    const slug = getRouteSlug();
    if (!slug || !CATEGORY_META[slug]) {
      hideDetailPage();
      return;
    }

    const services = await readServices();
    const cards = toServiceCards(services, slug);
    renderDetailPage(slug, cards);
  }

  function bindServiceLinks() {
    const map = {
      'Mühasibatlıq xidmətləri': 'muhasibatliq',
      'Vergi xidmətləri': 'vergi',
      'İnsan Resursları': 'insan-resurslari',
      'Hüquqi xidmətlər': 'huquqi',
      'İKT': 'ikt'
    };

    document.querySelectorAll('.service-card').forEach((card) => {
      const title = card.querySelector('.service-title')?.textContent?.trim() || '';
      const slug = resolveCategorySlug(card.dataset.serviceSlug || map[title] || title);
      const button = card.querySelector('.service-btn');
      if (button && slug) {
        button.setAttribute('href', `${HOME_PATH}?service=${encodeURIComponent(slug)}`);
        button.setAttribute('data-service-slug', slug);
      }
    });
  }

  function init() {
    bindServiceLinks();
    renderFromRoute();
    window.addEventListener('popstate', renderFromRoute);
    window.addEventListener('storage', function (event) {
      if (event.key === STORAGE_KEY || event.key === FALLBACK_STORAGE_KEY) renderFromRoute();
    });

    document.addEventListener('click', function (event) {
      const link = event.target.closest('a[data-back-services]');
      if (!link) return;
      event.preventDefault();
      const url = new URL(window.location.href);
      url.searchParams.delete(ROUTE_PARAM);
      url.hash = '#xidmetler';
      history.pushState({}, '', url.pathname + url.search + url.hash);
      renderFromRoute();
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})(window, document);
