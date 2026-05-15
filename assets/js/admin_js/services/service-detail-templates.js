// assets/js/admin_js/services/service-detail-templates.js
// HTML templates for the standalone public service detail pages.
(function(window) {
    'use strict';

    const namespace = window.GuvenServiceDetails = window.GuvenServiceDetails || {};
    const { escapeHtml } = namespace.utils;

    function pageShell(content, modifier = '') {
        return `<section class="service-page ${modifier}" aria-live="polite">${content}</section>`;
    }

    function loading() {
        return pageShell(`
            <div class="service-page-hero service-page-skeleton-wrap">
                <div class="container service-page-hero-inner">
                    <div class="service-page-skeleton service-page-skeleton-kicker"></div>
                    <div class="service-page-skeleton service-page-skeleton-title"></div>
                    <div class="service-page-skeleton service-page-skeleton-text"></div>
                </div>
            </div>
            <div class="container service-page-grid service-page-loading-grid">
                <div class="service-page-skeleton-card"></div>
                <div class="service-page-skeleton-card"></div>
                <div class="service-page-skeleton-card"></div>
            </div>
        `, 'is-loading');
    }

    function state({ icon, title, message, actionHref = '/', actionText = 'Ana səhifəyə qayıt' }) {
        return pageShell(`
            <div class="container service-page-state">
                <div class="service-page-state-card">
                    <div class="service-page-state-icon"><i class="${escapeHtml(icon)}"></i></div>
                    <h1>${escapeHtml(title)}</h1>
                    <p>${escapeHtml(message)}</p>
                    <a class="service-page-primary-action" href="${escapeHtml(actionHref)}">${escapeHtml(actionText)}</a>
                </div>
            </div>
        `, 'has-state');
    }

    function serviceCard(item, index, fallbackIcon) {
        const number = String(index + 1).padStart(2, '0');
        const title = item.title || `Xidmət ${index + 1}`;
        const description = item.description || 'Bu istiqamət üzrə peşəkar komandamız biznesiniz üçün dəqiq, ölçüləbilən və davamlı icra modeli təqdim edir.';
        const visual = item.image
            ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(title)}" loading="lazy">`
            : `<i class="${escapeHtml(item.icon || fallbackIcon)}" aria-hidden="true"></i>`;

        return `
            <article class="service-page-card" style="--card-index: ${index}">
                <div class="service-page-card-topline">
                    <span>${number}</span>
                    <div class="service-page-card-icon">${visual}</div>
                </div>
                <h2>${escapeHtml(title)}</h2>
                <p>${escapeHtml(description)}</p>
            </article>
        `;
    }

    function details({ category, items }) {
        const meta = category.meta || {};
        const source = category.service || {};
        const title = source.name || source.title || meta.title || 'Xidmət detalları';
        const subtitle = source.description || source.shortDescription || source.short_description || source.fullDescription || source.full_description || meta.subtitle || 'Seçilmiş kateqoriya üzrə xidmətlərimiz biznesinizin gündəlik ehtiyaclarına uyğun çevik və ölçüləbilən formada təqdim olunur.';
        const cardHtml = items.map((item, index) => serviceCard(item, index, meta.icon || 'fa-solid fa-briefcase')).join('');

        return pageShell(`
            <div class="service-page-hero">
                <div class="container service-page-hero-inner">
                    <nav class="service-page-breadcrumb" aria-label="Breadcrumb">
                        <a href="/">Ana səhifə</a>
                        <span aria-hidden="true">/</span>
                        <a href="/#xidmetler">Xidmətlər</a>
                        <span aria-hidden="true">/</span>
                        <strong>${escapeHtml(title)}</strong>
                    </nav>

                    <div class="service-page-hero-grid">
                        <div class="service-page-hero-copy">
                            <p class="service-page-eyebrow">${escapeHtml(meta.eyebrow || 'Korporativ xidmətlər')}</p>
                            <h1>${escapeHtml(title)}</h1>
                            <p>${escapeHtml(subtitle)}</p>
                            <div class="service-page-actions">
                                <a href="/#konsultasiya" class="service-page-primary-action">Konsultasiya al</a>
                                <a href="/#xidmetler" class="service-page-secondary-action">Bütün xidmətlər</a>
                            </div>
                        </div>
                        <div class="service-page-hero-visual" aria-hidden="true">
                            <div class="service-page-orb service-page-orb-one"></div>
                            <div class="service-page-orb service-page-orb-two"></div>
                            <div class="service-page-hero-badge">
                                <i class="${escapeHtml(meta.icon || 'fa-solid fa-briefcase')}"></i>
                                <strong>${items.length}</strong>
                                <span>aktiv xidmət</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="container service-page-content">
                <div class="service-page-section-head">
                    <p class="section-kicker">Xidmət paketi</p>
                    <h2>Bu kateqoriya üzrə təqdim etdiyimiz xidmətlər</h2>
                    <p>Admin paneldə idarə olunan xidmət maddələri avtomatik olaraq bu səhifədə yenilənir.</p>
                </div>
                <div class="service-page-grid">
                    ${cardHtml}
                </div>
            </div>

            <div class="container service-page-cta-wrap">
                <div class="service-page-cta">
                    <div>
                        <p class="section-kicker">Növbəti addım</p>
                        <h2>Biznesiniz üçün uyğun xidmət modelini birlikdə quraq.</h2>
                    </div>
                    <a href="/#konsultasiya" class="service-page-primary-action">Əlaqə saxla</a>
                </div>
            </div>
        `);
    }

    namespace.templates = {
        loading,
        state,
        details
    };
})(window);
