(function () {
  'use strict';

  var DEBUG_SERVICE_DETAILS = false;

  var CATEGORY_META = {
    muhasibatliq: { title: 'Mühasibatlıq xidmətləri', illustrationClass: 'illustration-accounting' },
    vergi: { title: 'Vergi xidmətləri', illustrationClass: 'illustration-tax' },
    'insan-resurslari': { title: 'İnsan Resursları', illustrationClass: 'illustration-hr' },
    huquqi: { title: 'Hüquqi xidmətlər', illustrationClass: 'illustration-legal' },
    ikt: { title: 'İKT', illustrationClass: 'illustration-ikt' }
  };

  var CANONICAL_KEYWORDS = {
    muhasibatliq: ['muhasibatliq', 'muhasibat', 'accounting', 'maliyye ucotu'],
    vergi: ['vergi', 'tax'],
    'insan-resurslari': ['insanresurslari', 'insan resurslari', 'hr', 'humanresources', 'human resources'],
    huquqi: ['huquqi', 'huquq', 'legal', 'law'],
    ikt: ['ikt', 'it', 'informationtechnology', 'information technology', 'texnologiya']
  };

  var CATEGORY_FIELDS = ['category_slug', 'slug', 'service_slug', 'category', 'service_category', 'type', 'group', 'section'];
  var FALLBACK_FIELDS = ['title', 'name'];

  function debugLog() {
    if (!DEBUG_SERVICE_DETAILS || !window.console || typeof window.console.log !== 'function') return;
    window.console.log.apply(window.console, arguments);
  }

  function toAscii(value) {
    return String(value || '')
      .replace(/[Əə]/g, 'e')
      .replace(/[Iİıi]/g, 'i')
      .replace(/[Öö]/g, 'o')
      .replace(/[Üü]/g, 'u')
      .replace(/[Çç]/g, 'c')
      .replace(/[Şş]/g, 's')
      .replace(/[Ğğ]/g, 'g');
  }

  function normalizeText(value) {
    return toAscii(value)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[_-]+/g, ' ')
      .replace(/\b(xidmet|xidmeti|xidmetleri|xidmetlerin|xidmetlerin\s+tesviri|xidmetler|xidmetleri|xidmetleridir|sahesi|sahəsi|services|service)\b/g, ' ')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function slugify(value) {
    return normalizeText(value).replace(/\s+/g, '-');
  }

  function categorySlugFromValue(value) {
    var normalized = normalizeText(value);
    if (!normalized) return '';
    var collapsed = normalized.replace(/\s+/g, '');

    var keys = Object.keys(CANONICAL_KEYWORDS);
    for (var i = 0; i < keys.length; i++) {
      var slug = keys[i];
      if (slugify(slug) === slugify(normalized)) return slug;

      var synonyms = CANONICAL_KEYWORDS[slug];
      for (var j = 0; j < synonyms.length; j++) {
        var synonymNorm = normalizeText(synonyms[j]);
        var synonymCollapsed = synonymNorm.replace(/\s+/g, '');

        if (!synonymNorm) continue;

        if (
          normalized === synonymNorm ||
          collapsed === synonymCollapsed ||
          normalized.indexOf(synonymNorm) !== -1 ||
          synonymNorm.indexOf(normalized) !== -1 ||
          collapsed.indexOf(synonymCollapsed) !== -1
        ) {
          return slug;
        }
      }
    }

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

  function findSlugByFields(service, fields) {
    for (var i = 0; i < fields.length; i++) {
      var field = fields[i];
      var value = service[field];
      var slug = categorySlugFromValue(value);
      if (slug) return slug;
    }
    return '';
  }

  function toPublicItems(list, routeSlug) {
    return list
      .filter(function (service) { return service && service.active !== false; })
      .map(function (service) {
        var explicitSlug = findSlugByFields(service, CATEGORY_FIELDS);
        var fallbackSlug = explicitSlug ? '' : findSlugByFields(service, FALLBACK_FIELDS);
        var finalSlug = explicitSlug || fallbackSlug;

        var items = Array.isArray(service.items) ? service.items : [];

        debugLog('service category resolution', {
          name: service.name,
          explicitSlug: explicitSlug,
          fallbackSlug: fallbackSlug,
          finalSlug: finalSlug,
          routeSlug: routeSlug
        });

        return {
          slug: finalSlug,
          items: items.filter(function (item) { return typeof item === 'string' && item.trim(); }),
          order: Number(service.order)
        };
      })
      .filter(function (service) { return service.slug === routeSlug; })
      .sort(function (a, b) {
        var ao = Number.isFinite(a.order) ? a.order : 9999;
        var bo = Number.isFinite(b.order) ? b.order : 9999;
        return ao - bo;
      })
      .reduce(function (acc, service) {
        return acc.concat(service.items);
      }, []);
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
      var slug = categorySlugFromValue(btn.dataset.serviceSlug || title);
      if (!slug) return;

      btn.setAttribute('href', 'index.html?service=' + slug);
      btn.removeAttribute('data-scroll-target');
      btn.dataset.serviceSlug = slug;
    });
  }

  function setDetailMode(active) {
    document.body.classList.toggle('service-detail-mode', !!active);
  }

  function createBackButton() { /* unchanged */
    var backBtn = document.createElement('button');
    backBtn.className = 'service-detail-back';
    backBtn.type = 'button';
    backBtn.textContent = '← Bütün xidmətlərə qayıt';

    backBtn.addEventListener('click', function () {
      var url = new URL(window.location.href);
      url.searchParams.delete('service');
      window.location.href = url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : '') + '#xidmetler';
    });

    return backBtn;
  }

  function renderDetail(slug) {
    var meta = CATEGORY_META[slug];
    if (!meta) return;
    var main = document.getElementById('main');
    if (!main) return;

    var items = toPublicItems(getServiceList(), slug);

    var section = document.createElement('section');
    section.className = 'service-detail-view';
    var container = document.createElement('div');
    container.className = 'container service-detail-container';
    container.appendChild(createBackButton());

    var panel = document.createElement('div');
    panel.className = 'service-detail-panel';
    var content = document.createElement('div');
    content.className = 'service-detail-content';
    var title = document.createElement('h1');
    title.className = 'service-detail-title';
    title.textContent = meta.title;
    content.appendChild(title);

    if (items.length) {
      var list = document.createElement('ul');
      list.className = 'service-detail-list';
      items.forEach(function (item) {
        var li = document.createElement('li');
        li.textContent = item;
        list.appendChild(li);
      });
      content.appendChild(list);
    } else {
      var empty = document.createElement('p');
      empty.className = 'service-detail-empty';
      empty.textContent = 'Bu sahə üzrə xidmət əlavə edilməyib';
      content.appendChild(empty);
    }

    var artwork = document.createElement('div');
    artwork.className = 'service-detail-artwork ' + (meta.illustrationClass || '');
    artwork.setAttribute('aria-hidden', 'true');

    panel.appendChild(content);
    panel.appendChild(artwork);
    container.appendChild(panel);
    section.appendChild(container);

    main.innerHTML = '';
    main.appendChild(section);
    setDetailMode(true);
  }

  function initRoute() {
    ensureCardLinks();
    var slug = getRouteSlug();
    if (slug) renderDetail(slug);
    else setDetailMode(false);
  }

  window.addEventListener('DOMContentLoaded', initRoute);
  window.addEventListener('popstate', initRoute);
  window.addEventListener('storage', function (e) {
    if (e.key === 'guvenfinans-active-services' || e.key === 'guvenfinans-services') initRoute();
  });
})();
