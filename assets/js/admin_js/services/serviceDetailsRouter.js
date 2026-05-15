(function () {
  'use strict';

  var CATEGORY_META = {
    muhasibatliq: { title: 'Mühasibatlıq xidmətləri', illustrationClass: 'illustration-accounting' },
    vergi: { title: 'Vergi xidmətləri', illustrationClass: 'illustration-tax' },
    'insan-resurslari': { title: 'İnsan Resursları', illustrationClass: 'illustration-hr' },
    huquqi: { title: 'Hüquqi xidmətlər', illustrationClass: 'illustration-legal' },
    ikt: { title: 'İKT', illustrationClass: 'illustration-ikt' }
  };

  var SYNONYMS = {
    muhasibatliq: ['muhasibatliq', 'mühasibatlıq', 'muhasibat', 'accounting'],
    vergi: ['vergi', 'tax', 'taxes'],
    'insan-resurslari': ['insanresurslari', 'insan resurslari', 'insan resursları', 'hr', 'humanresources', 'human resources'],
    huquqi: ['huquqi', 'hüquqi', 'legal', 'law'],
    ikt: ['ikt', 'it', 'informationtechnology', 'information technology', 'texnologiya']
  };

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

  function toPublicItems(list, slug) {
    return list
      .filter(function (service) { return service && service.active !== false; })
      .map(function (service) {
        var serviceName = service.name || service.title || '';
        var category = service.category_slug || service.category || service.service_category || serviceName;
        var items = Array.isArray(service.items) ? service.items : [];
        return {
          slug: categorySlugFromValue(category),
          items: items.filter(function (item) { return typeof item === 'string' && item.trim(); }),
          order: Number(service.order)
        };
      })
      .filter(function (service) { return service.slug === slug; })
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
      var slug = categorySlugFromValue(title);
      if (!slug) return;

      btn.setAttribute('href', 'index.html?service=' + slug);
      btn.removeAttribute('data-scroll-target');
      btn.dataset.serviceSlug = slug;
    });
  }

  function setDetailMode(active) {
    document.body.classList.toggle('service-detail-mode', !!active);
  }

  function createBackButton() {
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

    if (slug) {
      renderDetail(slug);
    } else {
      setDetailMode(false);
    }
  }

  window.addEventListener('DOMContentLoaded', initRoute);
  window.addEventListener('popstate', initRoute);
  window.addEventListener('storage', function (e) {
    if (e.key === 'guvenfinans-active-services' || e.key === 'guvenfinans-services') {
      initRoute();
    }
  });
})();
