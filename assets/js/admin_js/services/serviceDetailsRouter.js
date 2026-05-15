(function () {
  'use strict';

  var CATEGORY_META = {
    muhasibatliq: {
      title: 'Mühasibatlıq xidmətləri',
      description: 'Maliyyə uçotu, hesabatlılıq və audit proseslərinizi peşəkar şəkildə idarə edirik.'
    },
    vergi: {
      title: 'Vergi xidmətləri',
      description: 'Vergi planlaması, qeydiyyat və hesabatların düzgün, vaxtında icrasını təmin edirik.'
    },
    'insan-resurslari': {
      title: 'İnsan Resursları',
      description: 'Kadr idarəçiliyi və HR proseslərini sistemli və hüquqi tələblərə uyğun qururuq.'
    },
    huquqi: {
      title: 'Hüquqi xidmətlər',
      description: 'Müqavilələr, korporativ hüquq və hüquqi müşayiət üzrə etibarlı dəstək təqdim edirik.'
    },
    ikt: {
      title: 'İKT',
      description: 'İT infrastruktur, texniki dəstək və rəqəmsal həllər ilə biznesinizi gücləndiririk.'
    }
  };

  var SYNONYMS = {
    muhasibatliq: ['muhasibatliq', 'mühasibatlıq', 'muhasibat', 'accounting'],
    vergi: ['vergi', 'tax', 'taxes'],
    'insan-resurslari': ['insanresurslari', 'insan resurslari', 'insan resursları', 'hr', 'humanresources', 'human resources'],
    huquqi: ['huquqi', 'hüquqi', 'legal', 'law'],
    ikt: ['ikt', 'it', 'informationtechnology', 'information technology', 'texnologiya']
  };

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalize(text) {
    return String(text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ı/g, 'i')
      .replace(/[^a-z0-9\s-_]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  function categorySlugFromValue(value) {
    var norm = normalize(value);
    if (!norm) return '';
    var compact = norm.replace(/-/g, '');
    var keys = Object.keys(SYNONYMS);
    for (var i = 0; i < keys.length; i++) {
      var slug = keys[i];
      var list = SYNONYMS[slug];
      for (var j = 0; j < list.length; j++) {
        var option = normalize(list[j]);
        if (norm === option || compact === option.replace(/-/g, '')) return slug;
      }
    }
    if (CATEGORY_META[norm]) return norm;
    return '';
  }

  function getServiceList() {
    var raw = localStorage.getItem('guvenfinans-active-services') || localStorage.getItem('guvenfinans-services');
    if (!raw) return [];
    try {
      var data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    } catch (_) {
      return [];
    }
  }

  function toPublicServices(list, slug) {
    return list
      .filter(function (item) { return item && item.active !== false; })
      .map(function (item) {
        var name = item.title || item.name || 'Adsız xidmət';
        var description = item.description || item.desc || item.text || '';
        if (!description && Array.isArray(item.items)) description = item.items.join(' • ');
        var cat = item.category_slug || item.category || item.service_category || name;
        return {
          name: name,
          description: description,
          order: Number(item.order),
          slug: categorySlugFromValue(cat || name)
        };
      })
      .filter(function (item) { return item.slug === slug; })
      .sort(function (a, b) {
        var ao = Number.isFinite(a.order) ? a.order : 9999;
        var bo = Number.isFinite(b.order) ? b.order : 9999;
        return ao - bo;
      });
  }

  function getRouteSlug() {
    var params = new URLSearchParams(window.location.search);
    return categorySlugFromValue(params.get('service'));
  }

  function ensureCardLinks() {
    var buttons = document.querySelectorAll('.service-card .service-btn');
    buttons.forEach(function (btn) {
      var card = btn.closest('.service-card');
      if (!card) return;
      var title = (card.querySelector('.service-title') || {}).textContent || '';
      var slug = categorySlugFromValue(title);
      if (!slug) return;
      btn.setAttribute('href', 'index.html?service=' + slug);
      btn.removeAttribute('data-scroll-target');
      btn.dataset.serviceSlug = slug;
    });
  }

  function renderDetail(slug) {
    var meta = CATEGORY_META[slug];
    if (!meta) return;
    var main = document.getElementById('main');
    if (!main) return;
    var services = toPublicServices(getServiceList(), slug);
    var cards = services.map(function (s) {
      return '<article class="service-detail-card"><h3>' + esc(s.name) + '</h3><p>' + esc(s.description || 'Bu xidmət üçün təsvir əlavə edilməyib.') + '</p></article>';
    }).join('');

    main.innerHTML = '<section class="service-detail-view"><div class="container">'
      + '<a class="service-detail-back" href="index.html#xidmetler">← Bütün xidmətlərə qayıt</a>'
      + '<p class="service-breadcrumb">Ana səhifə / Xidmətlər / ' + esc(meta.title) + '</p>'
      + '<div class="service-detail-hero"><h1>' + esc(meta.title) + '</h1><p>' + esc(meta.description) + '</p><span>' + services.length + ' xidmət</span></div>'
      + (services.length ? '<div class="service-detail-grid">' + cards + '</div>' : '<div class="service-detail-empty">Bu sahə üzrə xidmət əlavə edilməyib</div>')
      + '<div class="service-detail-cta"><h3>Peşəkar dəstəyə ehtiyacınız var?</h3><a href="index.html#konsultasiya">Müraciət et</a></div>'
      + '</div></section>';

    if (!document.getElementById('service-detail-style')) {
      var style = document.createElement('style');
      style.id = 'service-detail-style';
      style.textContent = '.service-detail-view{padding:40px 0;background:#f7f9fc}.service-breadcrumb{color:#6b7280;margin:10px 0}.service-detail-hero{background:#fff;border-radius:16px;padding:24px;box-shadow:0 10px 30px rgba(0,0,0,.08)}.service-detail-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;margin-top:20px}.service-detail-card{background:#fff;border-radius:14px;padding:18px;box-shadow:0 8px 24px rgba(0,0,0,.06)}.service-detail-empty{margin-top:20px;background:#fff3cd;padding:16px;border-radius:12px}.service-detail-back{display:inline-block;margin-bottom:8px}.service-detail-cta{margin-top:24px;background:#0f172a;color:#fff;padding:22px;border-radius:16px;display:flex;justify-content:space-between;align-items:center;gap:12px}.service-detail-cta a{background:#22c55e;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none}@media(max-width:768px){.service-detail-cta{flex-direction:column;align-items:flex-start}}';
      document.head.appendChild(style);
    }
  }

  function initRoute() {
    ensureCardLinks();
    var slug = getRouteSlug();
    if (slug) renderDetail(slug);
  }

  window.addEventListener('DOMContentLoaded', initRoute);
  window.addEventListener('popstate', initRoute);
  window.addEventListener('storage', function (e) {
    if (e.key === 'guvenfinans-active-services' || e.key === 'guvenfinans-services') initRoute();
  });
})();
