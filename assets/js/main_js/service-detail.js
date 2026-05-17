(function () {
  'use strict';

  const BASE_API = 'https://guvenfinans.az/proxy.php/api/v1';
  const EMPTY_MESSAGE = 'Bu xidmət üzrə məlumatlar tezliklə əlavə olunacaq.';

  const AZ_CHAR_MAP = {
    'ə': 'e', 'Ə': 'e',
    'ı': 'i', 'I': 'i', 'İ': 'i',
    'ö': 'o', 'Ö': 'o',
    'ü': 'u', 'Ü': 'u',
    'ş': 's', 'Ş': 's',
    'ç': 'c', 'Ç': 'c',
    'ğ': 'g', 'Ğ': 'g'
  };

  function normalizeSlug(value) {
    const mapped = (value || '')
      .toString()
      .split('')
      .map((char) => AZ_CHAR_MAP[char] || char)
      .join('');

    return mapped
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function normalizeItems(raw) {
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string' && raw.trim()) return [raw.trim()];
    return [];
  }

  function normalizeService(raw) {
    if (!raw || typeof raw !== 'object') return null;

    const images = Array.isArray(raw.images)
      ? raw.images
      : Array.isArray(raw.service_images)
        ? raw.service_images
        : [];

    const cover = raw.coverImage || raw.cover_image || raw.cover
      || images.find((img) => img && (img.is_cover || img.isCover))
      || null;

    return {
      id: raw.id || raw.service_id || null,
      name: raw.name || raw.title || '',
      slug: raw.slug || raw.service_slug || '',
      description: raw.description || raw.short_description || raw.text || '',
      items: normalizeItems(raw.items || raw.details || raw.service_items),
      order: raw.order || raw.sort_order || 0,
      active: raw.active !== false && raw.status !== 'inactive',
      coverImage: cover,
      images,
      original: raw
    };
  }

  function extractList(payload) {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.data)) return payload.data;
    if (payload && Array.isArray(payload.services)) return payload.services;
    return [];
  }

  function extractDetail(payload) {
    if (!payload) return null;
    if (payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) return payload.data;
    if (payload.service && typeof payload.service === 'object') return payload.service;
    if (typeof payload === 'object' && !Array.isArray(payload)) return payload;
    return null;
  }

  async function safeJsonFetch(url) {
    const response = await fetch(url, { credentials: 'include' });
    let data = null;
    try { data = await response.json(); } catch (_) {}
    return { ok: response.ok, status: response.status, data };
  }

  async function fetchServiceBySlug(slug) {
    if (window.ApiMainService?.services?.getBySlug) {
      const result = await window.ApiMainService.services.getBySlug(slug);
      if (result?.success && result.data) return normalizeService(result.data);
    }

    const response = await safeJsonFetch(`${BASE_API}/services/public/${encodeURIComponent(slug)}`);
    if (!response.ok) return null;
    return normalizeService(extractDetail(response.data));
  }

  async function fetchPublicServices() {
    if (window.ApiMainService?.services?.getPublic) {
      const result = await window.ApiMainService.services.getPublic();
      if (result?.success && Array.isArray(result.data)) {
        return result.data.map(normalizeService).filter(Boolean);
      }
    }

    const response = await safeJsonFetch(`${BASE_API}/services/public`);
    if (!response.ok) return [];
    return extractList(response.data).map(normalizeService).filter(Boolean);
  }

  function matchServiceBySlug(list, pageSlug) {
    const normalizedPageSlug = normalizeSlug(pageSlug);
    return list.find((service) => {
      const keys = [service.slug, service.name, service.original?.title];
      return keys.some((k) => normalizeSlug(k) === normalizedPageSlug);
    }) || null;
  }

  function renderServiceHero(service) {
    const titleEl = document.getElementById('service-title');
    const descEl = document.getElementById('service-description');
    const coverEl = document.getElementById('service-cover');

    if (titleEl) titleEl.textContent = service.name || 'Xidmət';
    if (descEl) descEl.textContent = service.description || EMPTY_MESSAGE;

    if (coverEl) {
      const url = service.coverImage?.url || service.coverImage?.image_url || service.coverImage;
      coverEl.innerHTML = url
        ? `<img src="${url}" alt="${service.name || 'Xidmət'}">`
        : '<div class="placeholder">Güvən Finans</div>';
    }
  }

  function renderItems(service) {
    const container = document.getElementById('service-items');
    if (!container) return;

    const items = normalizeItems(service.items);
    if (!items.length) {
      container.innerHTML = `<p class="status">${EMPTY_MESSAGE}</p>`;
      return;
    }

    container.innerHTML = items.map((item, index) => {
      if (typeof item === 'string') {
        return `<article class="item-card"><strong>#${index + 1}</strong><h4>${item}</h4></article>`;
      }

      const title = item?.title || item?.name || item?.text || item?.description || '';
      const description = item?.description || item?.text || '';
      return `<article class="item-card"><strong>#${index + 1}</strong><h4>${title}</h4>${description ? `<p>${description}</p>` : ''}</article>`;
    }).join('');
  }

  function renderGallery(service) {
    const el = document.getElementById('service-gallery');
    if (!el) return;

    const images = (service.images || []).filter(Boolean);
    if (!images.length) {
      el.innerHTML = '';
      return;
    }

    el.innerHTML = images.map((img) => {
      const url = img.url || img.image_url || img;
      return `<article class="gallery-card"><img src="${url}" alt="Xidmət şəkli"></article>`;
    }).join('');
  }

  function renderEmptyState() {
    const statusEl = document.getElementById('loading-status');
    const itemsEl = document.getElementById('service-items');
    const titleEl = document.getElementById('service-title');
    const descEl = document.getElementById('service-description');
    if (statusEl) statusEl.textContent = '';
    if (titleEl) titleEl.textContent = 'Xidmət';
    if (descEl) descEl.textContent = EMPTY_MESSAGE;
    if (itemsEl) itemsEl.innerHTML = `<p class="status">${EMPTY_MESSAGE}</p>`;
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const statusEl = document.getElementById('loading-status');
    const pageSlug = document.body?.getAttribute('data-service-slug') || '';
    const normalizedPageSlug = normalizeSlug(pageSlug);

    if (!normalizedPageSlug) {
      renderEmptyState();
      return;
    }

    try {
      let service = await fetchServiceBySlug(normalizedPageSlug);

      if (!service) {
        const services = await fetchPublicServices();
        service = matchServiceBySlug(services, normalizedPageSlug);
      }

      if (!service) {
        const savedServices = JSON.parse(localStorage.getItem('guvenfinans-active-services') || '[]');
        const normalizedSaved = (savedServices || []).map(normalizeService).filter(Boolean);
        service = matchServiceBySlug(normalizedSaved, normalizedPageSlug);
      }

      if (!service) {
        renderEmptyState();
        return;
      }

      renderServiceHero(service);
      renderItems(service);
      renderGallery(service);
      if (statusEl) statusEl.textContent = '';
    } catch (error) {
      console.error('Service detail load error:', error);
      renderEmptyState();
    }
  });
})();
