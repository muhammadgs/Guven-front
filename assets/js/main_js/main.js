// alembic/main.page/main.js - TAM DÜZGÜN VERSİYA

document.addEventListener('DOMContentLoaded', () => {
    console.log('=== GÜVƏN FİNANS AUTH STATUS ===');
    console.log('auth_token:', localStorage.getItem('auth_token') ? 'VAR' : 'YOX');
    console.log('guven_token:', localStorage.getItem('guven_token') ? 'VAR' : 'YOX');
    console.log('user_email:', localStorage.getItem('user_email'));
    console.log('user_name:', localStorage.getItem('user_name'));

    const loader = document.getElementById('gti-loader');
    const siteShell = document.getElementById('site-shell');
    const body = document.body;
    const MIN_DURATION = 1350;
    const startTime = performance.now();

    const navigationEntry = performance.getEntriesByType('navigation')[0];
    const legacyNavType = performance.navigation?.type === 1 ? 'reload' : 'navigate';
    const navigationType = navigationEntry?.type || legacyNavType;
    const loaderAlreadyShown = sessionStorage.getItem('gtiLoaderShown') === '1';
    const shouldShowLoader = navigationType === 'reload' || !loaderAlreadyShown;

    const revealSite = () => {
        if (loader) {
            loader.classList.add('fade-out');
            setTimeout(() => loader.remove(), 360);
        }
        body.classList.add('loaded');
        body.classList.remove('loader-active');
        if (siteShell) siteShell.style.pointerEvents = 'auto';
    };

    if (shouldShowLoader) {
        body.classList.add('loader-active');
        sessionStorage.setItem('gtiLoaderShown', '1');

        const elapsed = () => performance.now() - startTime;
        const remaining = Math.max(0, MIN_DURATION - elapsed());
        setTimeout(revealSite, remaining);
    } else {
        if (loader) loader.remove();
        body.classList.add('loaded');
        body.classList.remove('loader-active');
        if (siteShell) siteShell.style.pointerEvents = 'auto';
    }

    const header = document.getElementById('main-header');

    // Header rəng dəyişmə effekti
    if (header && !header.classList.contains('no-scroll-effect')) {
        const updateHeaderState = () => {
            if (window.scrollY > 10) header.classList.add('header-scrolled');
            else header.classList.remove('header-scrolled');
        };
        updateHeaderState();
        window.addEventListener('scroll', updateHeaderState, { passive: true });
    }

    // Telefon linki təsdiqi
    const phoneLink = document.getElementById('header-phone-link');
    if (phoneLink) {
        phoneLink.addEventListener('click', (e) => {
            if (!confirm('Hörmətli istifadəçi, bu nömrəyə zəng etmək istəyirsiniz?')) {
                e.preventDefault();
            }
        });
    }

    // Mobil menyu açılıb-bağlanması
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');

    if (mobileMenuToggle && mobileMenuOverlay) {
        const setMobileMenuState = (isActive) => {
            mobileMenuOverlay.classList.toggle('is-active', isActive);
            mobileMenuToggle.classList.toggle('is-open', isActive);
            mobileMenuOverlay.setAttribute('aria-hidden', (!isActive).toString());
            mobileMenuToggle.setAttribute('aria-expanded', isActive.toString());
            document.body.classList.toggle('menu-open', isActive);

            const icon = mobileMenuToggle.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-bars', !isActive);
                icon.classList.toggle('fa-times', isActive);
            }
        };

        mobileMenuToggle.addEventListener('click', () => {
            const isActive = !mobileMenuOverlay.classList.contains('is-active');
            setMobileMenuState(isActive);
        });

        mobileMenuOverlay.addEventListener('click', (event) => {
            if (event.target === mobileMenuOverlay) {
                setMobileMenuState(false);
            }
        });

        const overlayLinks = mobileMenuOverlay.querySelectorAll('a, .mobile-auth-btn, .mobile-contact-link');
        overlayLinks.forEach((link) => link.addEventListener('click', () => setMobileMenuState(false)));

        const desktopMediaQuery = window.matchMedia('(min-width: 769px)');
        desktopMediaQuery.addEventListener('change', (event) => {
            if (event.matches) {
                setMobileMenuState(false);
            }
        });
    }

    // Naviqasiya linkləri üçün hamar sürüşdürmə
    const scrollLinks = document.querySelectorAll('a[data-scroll-target]');
    const headerOffset = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--header-offset')
    ) || 0;

    const scrollToSection = (targetId) => {
        const target = document.getElementById(targetId);
        if (!target) return false;

        const targetPosition = target.getBoundingClientRect().top + window.scrollY - headerOffset;
        window.scrollTo({ top: targetPosition, behavior: 'smooth' });
        return true;
    };

    scrollLinks.forEach((link) => {
        link.addEventListener('click', (event) => {
            const targetId = link.getAttribute('data-scroll-target');
            if (!targetId) return;

            const didScroll = scrollToSection(targetId);
            if (didScroll) {
                event.preventDefault();
                link.blur();
            }
        });
    });

    // PARTNERS carousel drag
    const carousel = document.querySelector('[data-projects-carousel]');
    if (carousel) {
        let isDown = false;
        let startX = 0;
        let scrollLeft = 0;

        const startDrag = (e) => {
            isDown = true;
            carousel.classList.add('is-dragging');
            startX = e.pageX - carousel.offsetLeft;
            scrollLeft = carousel.scrollLeft;
        };

        const stopDrag = () => {
            isDown = false;
            carousel.classList.remove('is-dragging');
        };

        const moveDrag = (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - carousel.offsetLeft;
            const walk = (x - startX) * 2;
            carousel.scrollLeft = scrollLeft - walk;
        };

        carousel.addEventListener('mousedown', startDrag);
        carousel.addEventListener('mouseleave', stopDrag);
        window.addEventListener('mouseup', stopDrag);
        carousel.addEventListener('mousemove', moveDrag);
    }

    // Projects slider arrows
    const slider = document.getElementById('projects-container');
    const prevBtn = document.getElementById('project-prev-btn');
    const nextBtn = document.getElementById('project-next-btn');

    if (slider && prevBtn && nextBtn) {
        const updateButtons = () => {
            if (slider.scrollLeft <= 5) prevBtn.classList.add('is-hidden');
            else prevBtn.classList.remove('is-hidden');

            if (Math.ceil(slider.scrollLeft) >= slider.scrollWidth - slider.clientWidth - 5)
                nextBtn.classList.add('is-hidden');
            else nextBtn.classList.remove('is-hidden');
        };

        slider.addEventListener('scroll', updateButtons);
        window.addEventListener('resize', updateButtons);
        updateButtons();

        nextBtn.addEventListener('click', () => {
            const cols = window.innerWidth >= 1024 ? 3 : window.innerWidth >= 768 ? 2 : 1;
            const scrollAmount = slider.clientWidth / cols;
            slider.scrollBy({ left: scrollAmount + 24, behavior: 'smooth' });
        });

        prevBtn.addEventListener('click', () => {
            const cols = window.innerWidth >= 1024 ? 3 : window.innerWidth >= 768 ? 2 : 1;
            const scrollAmount = slider.clientWidth / cols;
            slider.scrollBy({ left: -(scrollAmount + 24), behavior: 'smooth' });
        });
    }

    // Konsultasiya formu göndər
    const consultForm = document.querySelector('.consult-form');
    if (consultForm) {
        consultForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const name = this.querySelector('input[type="text"]').value;
            const phone = this.querySelector('input[type="tel"]').value;
            const message = this.querySelector('textarea').value;

            if (!name || !phone) {
                alert('Zəhmət olmasa ad və telefon nömrənizi daxil edin.');
                return;
            }

            console.log('📞 Konsultasiya sorğusu:', { name, phone, message });
            alert('Sorğunuz qeydə alındı. Tezliklə sizinlə əlaqə saxlayacağıq.');

            // Formu təmizlə
            this.reset();
        });
    }

    // ==================== SAYTI BAŞLAT ====================
    // DOM tam yükləndikdə saytı başlat
    initializePage();
});

// ==================== AUTHENTICATION FUNKSİYALARI ====================

function checkAuthStatus() {
    console.log('🔐 Auth status yoxlanılır...');

    // Həm köhnə, həm də yeni token formatlarını yoxla
    const authToken = localStorage.getItem('auth_token') || localStorage.getItem('guven_token');
    const userEmail = localStorage.getItem('user_email');
    const userName = localStorage.getItem('user_name');

    console.log('Giriş statusu:', !!authToken);
    console.log('İstifadəçi email:', userEmail);
    console.log('İstifadəçi adı:', userName);

    const isLoggedIn = !!authToken;

    // Desktop düymələrini yoxla
    const desktopLoginBtn = document.getElementById('login-btn');
    const desktopRegisterBtn = document.getElementById('register-btn');
    const desktopProfileBtn = document.getElementById('nav-profile-btn');

    // Mobil düymələri yoxla
    const mobileLoginBtn = document.querySelector('.mobile-auth-solid:not(.mobile-profile-btn)');
    const mobileRegisterBtn = document.querySelector('.mobile-auth-outline');
    const mobileProfileBtn = document.getElementById('mobile-profile-btn');

    if (isLoggedIn) {
        try {
            // Desktop düymələri
            if (desktopLoginBtn) {
                desktopLoginBtn.style.display = 'none';
                desktopLoginBtn.hidden = true;
            }
            if (desktopRegisterBtn) {
                desktopRegisterBtn.style.display = 'none';
                desktopRegisterBtn.hidden = true;
            }
            if (desktopProfileBtn) {
                desktopProfileBtn.style.display = 'flex';
                desktopProfileBtn.hidden = false;

                // İstifadəçi adını düzəlt (əgər varsa)
                const profileSpan = desktopProfileBtn.querySelector('span');
                if (profileSpan && userName) {
                    // Adın ilk hərfini böyük et
                    const firstName = userName.split(' ')[0];
                    const displayName = firstName.length > 10 ?
                        firstName.substring(0, 10) + '...' : firstName;
                    profileSpan.textContent = displayName;
                } else if (profileSpan && userEmail) {
                    // Email-dən istifadə et
                    const username = userEmail.split('@')[0];
                    const displayName = username.length > 10 ?
                        username.substring(0, 10) + '...' : username;
                    profileSpan.textContent = displayName;
                }
            }

            // Mobil düymələr
            if (mobileLoginBtn) {
                mobileLoginBtn.style.display = 'none';
                mobileLoginBtn.hidden = true;
            }
            if (mobileRegisterBtn) {
                mobileRegisterBtn.style.display = 'none';
                mobileRegisterBtn.hidden = true;
            }
            if (mobileProfileBtn) {
                mobileProfileBtn.style.display = 'block';
                mobileProfileBtn.hidden = false;

                // Mobil üçün də adı düzəlt
                if (userName) {
                    const firstName = userName.split(' ')[0];
                    mobileProfileBtn.textContent = `Profil (${firstName})`;
                } else if (userEmail) {
                    const username = userEmail.split('@')[0];
                    mobileProfileBtn.textContent = `Profil (${username})`;
                } else {
                    mobileProfileBtn.textContent = 'Profil';
                }
            }

            console.log('✅ Profil düymələri göstərildi');

        } catch (error) {
            console.error('❌ Profil düymələri göstərilərkən xəta:', error);
            showLoginButtons();
        }
    } else {
        // Giriş edilməyibsə, login/register düymələrini göstər
        showLoginButtons();
    }
}

function showLoginButtons() {
    console.log('🔓 Login düymələri göstərilir');

    // Desktop
    const desktopLoginBtn = document.getElementById('login-btn');
    const desktopRegisterBtn = document.getElementById('register-btn');
    const desktopProfileBtn = document.getElementById('nav-profile-btn');

    if (desktopLoginBtn) {
        desktopLoginBtn.style.display = 'flex';
        desktopLoginBtn.hidden = false;
    }
    if (desktopRegisterBtn) {
        desktopRegisterBtn.style.display = 'flex';
        desktopRegisterBtn.hidden = false;
    }
    if (desktopProfileBtn) {
        desktopProfileBtn.style.display = 'none';
        desktopProfileBtn.hidden = true;
    }

    // Mobil
    const mobileLoginBtn = document.querySelector('.mobile-auth-solid:not(.mobile-profile-btn)');
    const mobileRegisterBtn = document.querySelector('.mobile-auth-outline');
    const mobileProfileBtn = document.getElementById('mobile-profile-btn');

    if (mobileLoginBtn) {
        mobileLoginBtn.style.display = 'block';
        mobileLoginBtn.hidden = false;
    }
    if (mobileRegisterBtn) {
        mobileRegisterBtn.style.display = 'block';
        mobileRegisterBtn.hidden = false;
    }
    if (mobileProfileBtn) {
        mobileProfileBtn.style.display = 'none';
        mobileProfileBtn.hidden = true;
    }
}

function logout() {
    console.log('🚪 Çıxış edilir...');

    // LocalStorage-dan bütün auth məlumatlarını sil
    localStorage.removeItem('auth_token');
    localStorage.removeItem('guven_token');
    localStorage.removeItem('guven_token_type');
    localStorage.removeItem('guven_user_role');
    localStorage.removeItem('guven_user_id');
    localStorage.removeItem('guven_user');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_name');
    localStorage.removeItem('guvenfinans-isLoggedIn');
    localStorage.removeItem('guvenfinans-userData');

    // Düymələri yenilə
    showLoginButtons();

    // Ana səhifəyə yönləndir
    window.location.href = 'index.html';
}

function setupProfileButtons() {
    // Desktop profil düyməsi
    const desktopProfileBtn = document.getElementById('nav-profile-btn');
    if (desktopProfileBtn) {
        desktopProfileBtn.addEventListener('click', function(e) {
            e.preventDefault();

            const authToken = localStorage.getItem('auth_token') || localStorage.getItem('guven_token');
            if (authToken) {
                // Dashboard səhifəsinə yönləndir
                window.location.href = 'dashboard.html';
            } else {
                // Login səhifəsinə yönləndir
                window.location.href = 'login.html';
            }
        });
    }

    // Mobil profil düyməsi
    const mobileProfileBtn = document.getElementById('mobile-profile-btn');
    if (mobileProfileBtn) {
        mobileProfileBtn.addEventListener('click', function(e) {
            e.preventDefault();

            const authToken = localStorage.getItem('auth_token') || localStorage.getItem('guven_token');
            if (authToken) {
                window.location.href = 'dashboard.html';
            } else {
                window.location.href = 'login.html';
            }
        });
    }

    // Login düyməsi üçün əlavə yoxlama
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', function(e) {
            const authToken = localStorage.getItem('auth_token') || localStorage.getItem('guven_token');
            if (authToken) {
                e.preventDefault();
                window.location.href = 'dashboard.html';
            }
        });
    }
}

// ==================== XİDMƏTLƏR FUNKSİYALARI ====================

function loadServicesFromStorage() {
    console.log('🔄 Ana səhifə xidmətləri yüklənir...');

    const savedServices = localStorage.getItem('guvenfinans-active-services') || localStorage.getItem('guvenfinans-services');
    console.log('LocalStorage məlumatı:', savedServices);

    if (savedServices) {
        try {
            const services = JSON.parse(savedServices);
            console.log('✅ Xidmətlər yükləndi:', services.length);
            renderServicesOnPage(services);
        } catch (error) {
            console.error('❌ JSON parse xətası:', error);
            loadDefaultServices();
        }
    } else {
        console.log('📂 Default xidmətlər yüklənir');
        loadDefaultServices();
    }
}

function loadDefaultServices() {
    console.warn('Aktiv xidmət mənbəyi tapılmadı; admin paneldə xidmət əlavə edilənədək boş vəziyyət göstərilir.');
    renderServicesOnPage([]);
}

function escapeServiceHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function getPublicServiceKey(service) {
    if (window.PublicServiceDetails?.getServiceKey) {
        return window.PublicServiceDetails.getServiceKey(service);
    }

    return String(service.id || service.slug || service.key || service.name || service.title || '');
}

function getPublicServiceSlug(service) {
    if (window.PublicServiceDetails?.getServiceSlug) {
        return window.PublicServiceDetails.getServiceSlug(service);
    }

    if (window.PublicServiceDetails?.slugify) {
        return window.PublicServiceDetails.slugify(service.slug || service.name || service.title || getPublicServiceKey(service));
    }

    return String(service.slug || service.name || service.title || getPublicServiceKey(service))
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function renderServicesOnPage(services) {
    console.log('🎨 Xidmətlər render edilir:', services.length);

    const servicesGrid = document.querySelector('.services-grid');
    if (!servicesGrid) {
        console.error('❌ services-grid tapılmadı');
        return;
    }

    const activeServices = Array.isArray(services)
        ? services.filter(service => service && service.active !== false).sort((a, b) => (a.order || 0) - (b.order || 0))
        : [];

    if (activeServices.length === 0) {
        servicesGrid.innerHTML = '<p class="empty-msg">Aktiv xidmət tapılmadı</p>';
        return;
    }

    const html = activeServices.map(service => {
        const serviceKey = getPublicServiceKey(service);
        const serviceSlug = getPublicServiceSlug(service);
        const items = Array.isArray(service.items) ? service.items : [];
        const itemsHtml = items.slice(0, 4).map(item => {
            const title = typeof item === 'string' ? item : (item.title || item.name || item.service_name || 'Xidmət');
            return `<li>${escapeServiceHtml(title)}</li>`;
        }).join('');

        return `
            <article class="service-card" data-service-id="${escapeServiceHtml(serviceKey)}" data-service-slug="${escapeServiceHtml(serviceSlug)}">
                <h3 class="service-title">${escapeServiceHtml(service.name || service.title || 'Xidmət')}</h3>
                <ul class="service-list">
                    ${itemsHtml}
                </ul>
                <a href="/services/${escapeServiceHtml(serviceSlug)}"
                   class="service-btn"
                   data-service-detail-trigger
                   data-service-key="${escapeServiceHtml(serviceKey)}"
                   data-service-slug="${escapeServiceHtml(serviceSlug)}">
                    ${escapeServiceHtml(service.cta || 'Ətraflı...')}
                </a>
            </article>
        `;
    }).join('');

    servicesGrid.innerHTML = html;

    if (window.PublicServiceDetails?.refreshServices) {
        window.PublicServiceDetails.refreshServices();
    }

    console.log('✅ Xidmətlər render edildi');
}

// ==================== PARTNYORLAR FUNKSİYALARI ====================

function loadPartners() {
    console.log('🔄 Partnyorlar yüklənir...');

    const partnersContainer = document.getElementById('partners-container');
    if (!partnersContainer) {
        console.error('❌ partners-container tapılmadı');
        return;
    }

    // LocalStorage-dan partnyorları yüklə
    const savedPartners = localStorage.getItem('guvenfinans-partners');

    if (savedPartners) {
        try {
            const partners = JSON.parse(savedPartners);
            renderPartners(partners);
        } catch (error) {
            console.error('❌ JSON parse xətası:', error);
            loadDefaultPartners();
        }
    } else {
        console.log('📂 Default partnyorlar yüklənir');
        loadDefaultPartners();
    }
}

function renderPartners(partners) {
    const container = document.getElementById('partners-container');
    if (!container) return;

    console.log('🎨 Partnyorlar render edilir:', partners.length);

    const activePartners = partners.filter(p => p.active);

    if (activePartners.length === 0) {
        container.innerHTML = '<p class="empty-msg">Heç bir partnyor tapılmadı</p>';
        return;
    }

    let html = '';

    activePartners.forEach(partner => {
        // Placeholder URL-i düzəldin
        const placeholderUrl = `https://via.placeholder.com/150x80/007bff/ffffff?text=${encodeURIComponent(partner.name.substring(0, 15))}&font-size=14`;

        html += `
            <div class="partner-item" data-partner-id="${partner.id}">
                <a href="${partner.website || '#'}" target="_blank" class="partner-link-full" ${!partner.website ? 'onclick="return false;"' : ''}>
                    <div class="partner-logo-container">
                        ${partner.logo ?
                            `<img src="${partner.logo}" alt="${partner.name}" class="partner-logo"
                                  onerror="this.onerror=null; this.src='${placeholderUrl}'">` :
                            `<div class="partner-placeholder">${partner.name.charAt(0)}</div>`
                        }
                    </div>
                </a>
                <div class="partner-info">
                    <h4 class="partner-name">${partner.name}</h4>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
    console.log('✅ Partnyorlar render edildi');
}

// ==================== LAYİHƏLƏR FUNKSİYALARI ====================

function loadProjects() {
    console.log('🔄 Layihələr API-dən yüklənir...');

    const projectsContainer = document.getElementById('projects-container');
    if (!projectsContainer) {
        console.error('❌ projects-container tapılmadı');
        return;
    }

    // 📢 API-dən public layihələri çək
    if (window.ApiMainService && window.ApiMainService.projects) {
        window.ApiMainService.projects.getPublic(10, 0)
            .then(result => {
                console.log('📦 API cavabı:', result);

                if (result.success && result.data) {
                    console.log(`✅ API-dən ${result.data.length} layihə alındı`);

                    // Məlumatları localStorage-da saxla (offline üçün)
                    localStorage.setItem('guvenfinans-projects', JSON.stringify(result.data));

                    // Layihələri göstər
                    renderProjectsOnPage(result.data);
                    setupProjectSlider();

                } else {
                    console.error('❌ API xətası:', result.error);
                    // Xəta olarsa localStorage-a müraciət et
                    loadProjectsFromLocalStorage();
                }
            })
            .catch(error => {
                console.error('❌ API çağırış xətası:', error);
                loadProjectsFromLocalStorage();
            });
    } else {
        console.warn('⚠️ ApiMainService tapılmadı!');
        loadProjectsFromLocalStorage();
    }
}
function renderProjectsOnPage(projects) {
    const container = document.getElementById('projects-container');
    if (!container) return;

    const activeProjects = projects.filter(p => p.active)
        .sort((a, b) => (a.order || 999) - (b.order || 999));

    if (activeProjects.length === 0) {
        container.innerHTML = '<p class="empty-msg">Heç bir layihə tapılmadı</p>';
        return;
    }

    let html = '';

    activeProjects.forEach(project => {
        // Rəngli placeholder
        const getPlaceholder = () => {
            const colors = ['#4361ee', '#3a0ca3', '#7209b7', '#f72585', '#4cc9f0', '#38b000', '#e85d04'];
            const color = colors[Math.abs(project.name.length) % colors.length];

            const words = project.name.split(' ');
            let initials = '';
            if (words.length >= 2) {
                initials = words[0][0] + words[1][0];
            } else {
                initials = project.name.substring(0, 2);
            }
            initials = initials.toUpperCase();

            return `
                <div class="project-placeholder" style="background: linear-gradient(135deg, ${color}15, ${color}30); display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; width: 100%;">
                    <span style="font-size: 3.5rem; font-weight: bold; color: ${color}; line-height: 1; margin-bottom: 8px;">${initials}</span>
                    <span style="font-size: 0.85rem; color: ${color}; background: ${color}20; padding: 4px 12px; border-radius: 20px;">Şəkil yoxdur</span>
                </div>
            `;
        };

        // URL-i düzgün formatla
        let mediaUrl = project.mediaUrl || '';

        // UUID formatında id (əgər birbaşa UUID gəlibsə)
        if (mediaUrl && mediaUrl.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            mediaUrl = `/proxy.php/api/v1/files/${mediaUrl}/download`;
        }
        // /api/ ilə başlayan
        else if (mediaUrl && mediaUrl.startsWith('/api/')) {
            mediaUrl = '/proxy.php' + mediaUrl;
        }
        // artıq proxy var
        else if (mediaUrl && mediaUrl.startsWith('/proxy.php')) {
            mediaUrl = mediaUrl; // olduğu kimi saxla
        }

        // Media content
        let mediaContent = '';

        if (project.mediaType === 'image') {
            mediaContent = `
                <div class="project-image-wrapper" style="height: 100%; width: 100%;">
                    <img src="${mediaUrl}" 
                         alt="${project.name}" 
                         class="project-media"
                         loading="lazy"
                         style="width: 100%; height: 100%; object-fit: cover;"
                         onerror="this.onerror=null; this.parentNode.innerHTML=\`${getPlaceholder()}\`; console.log('🖼️ Şəkil yüklənmədi:', '${mediaUrl}');">
                </div>
            `;
        }
        else if (project.mediaType === 'video') {
            mediaContent = `
                <div class="project-video-container" data-video-url="${mediaUrl}" style="height: 100%; width: 100%; position: relative; cursor: pointer;">
                    <video class="project-media" 
                           style="width: 100%; height: 100%; object-fit: cover; background: #000;"
                           muted 
                           loop 
                           preload="metadata"
                           poster="${mediaUrl}?poster=1"
                           onerror="this.parentNode.innerHTML=\`${getPlaceholder()}\`; console.log('🎬 Video yüklənmədi:', '${mediaUrl}');">
                        <source src="${mediaUrl}" type="video/mp4">
                    </video>
                    <div class="video-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; pointer-events: none;">
                        <div class="video-play-btn" style="width: 50px; height: 50px; background: rgba(255,255,255,0.9); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-play" style="color: #4361ee; font-size: 20px; margin-left: 3px;"></i>
                        </div>
                    </div>
                </div>
            `;
        }
        else if (project.mediaType === 'youtube' && project.mediaUrl) {
            let youtubeId = project.mediaUrl;
            if (youtubeId.includes('youtube.com') || youtubeId.includes('youtu.be')) {
                const match = youtubeId.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
                if (match) youtubeId = match[1];
            }

            mediaContent = `
                <div class="project-youtube-container" data-youtube-id="${youtubeId}" style="height: 100%; width: 100%; position: relative; cursor: pointer;">
                    <div class="youtube-thumbnail" style="height: 100%; width: 100%;">
                        <img src="https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg"
                             alt="${project.name}" 
                             class="project-media"
                             loading="lazy"
                             style="width: 100%; height: 100%; object-fit: cover;"
                             onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22480%22%20height%3D%22360%22%20viewBox%3D%220%200%20480%20360%22%3E%3Crect%20width%3D%22480%22%20height%3D%22360%22%20fill%3D%22%23e63946%22%2F%3E%3Ctext%20x%3D%22240%22%20y%3D%22180%22%20font-family%3D%22Arial%22%20font-size%3D%2224%22%20fill%3D%22%23ffffff%22%20text-anchor%3D%22middle%22%3EYouTube%20Video%3C%2Ftext%3E%3C%2Fsvg%3E';">
                        <div class="youtube-play-btn" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 60px; height: 60px; background: rgba(255,0,0,0.9); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                            <i class="fab fa-youtube" style="color: white; font-size: 30px;"></i>
                        </div>
                    </div>
                </div>
            `;
        }
        else {
            mediaContent = getPlaceholder();
        }

        html += `
            <div class="project-item" data-project-id="${project.id}">
                <div class="project-media-container" style="height: 220px; overflow: hidden; position: relative;">
                    ${mediaContent}
                </div>
                <div class="project-info" style="padding: 15px;">
                    <h3 class="project-title" style="margin: 0 0 8px 0; font-size: 18px;">${project.name}</h3>
                    <p class="project-desc" style="margin: 0 0 10px 0; color: #666; font-size: 14px;">${project.description || ''}</p>
                    <div class="project-meta" style="display: flex; gap: 8px; flex-wrap: wrap;">
                        ${project.category ? `<span class="project-category" style="background: #e9ecef; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${project.category}</span>` : ''}
                        ${project.client ? `<span class="project-client" style="background: #e9ecef; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${project.client}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;

    // Video hover effekti
    setTimeout(() => {
        document.querySelectorAll('.project-video-container').forEach(container => {
            // Mouse enter - video başlasın
            container.addEventListener('mouseenter', function() {
                const video = this.querySelector('video');
                if (video) {
                    video.muted = true;
                    video.play().catch(e => console.log('Video play error:', e));
                }
            });

            // Mouse leave - video dayansın
            container.addEventListener('mouseleave', function() {
                const video = this.querySelector('video');
                if (video) {
                    video.pause();
                    video.currentTime = 0;
                }
            });

            // Click - modal açılsın
            container.addEventListener('click', function(e) {
                e.stopPropagation();
                const videoUrl = this.dataset.videoUrl;
                const projectItem = this.closest('.project-item');

                // Təhlükəsiz şəkildə project title-i tap
                let projectName = 'Video';
                if (projectItem) {
                    const titleElement = projectItem.querySelector('.project-title');
                    if (titleElement) {
                        projectName = titleElement.textContent;
                    }
                }

                console.log('Video click:', videoUrl, projectName);

                if (window.openVideoModal) {
                    window.openVideoModal(videoUrl, projectName);
                } else {
                    console.error('openVideoModal funksiyası tapılmadı');
                }
            });
        });

        // YouTube container click
        document.querySelectorAll('.project-youtube-container').forEach(container => {
            container.addEventListener('click', function(e) {
                e.stopPropagation();
                const youtubeId = this.dataset.youtubeId;
                const projectItem = this.closest('.project-item');

                // Təhlükəsiz şəkildə project title-i tap
                let projectName = 'Video';
                if (projectItem) {
                    const titleElement = projectItem.querySelector('.project-title');
                    if (titleElement) {
                        projectName = titleElement.textContent;
                    }
                }

                console.log('YouTube click:', youtubeId, projectName);

                if (window.openYouTubeModal) {
                    window.openYouTubeModal(youtubeId, projectName);
                } else {
                    console.error('openYouTubeModal funksiyası tapılmadı');
                }
            });
        });

        // Click handler-ları çağır
        if (window.setupProjectClickEvents) {
            window.setupProjectClickEvents();
        }
    }, 200);
}


// ==================== SLIDER FUNKSİYALARI ====================

function setupProjectSlider() {
    const slider = document.getElementById('projects-container');
    const prevBtn = document.getElementById('project-prev-btn');
    const nextBtn = document.getElementById('project-next-btn');

    if (!slider || !prevBtn || !nextBtn) {
        console.error('❌ Slider elementləri tapılmadı');
        return;
    }

    console.log('🎬 Layihə slider-i quraşdırılır...');

    // Düymələrin vəziyyətini yenilə
    const updateButtons = () => {
        const isAtStart = slider.scrollLeft <= 10;
        const isAtEnd = Math.ceil(slider.scrollLeft) >= slider.scrollWidth - slider.clientWidth - 10;

        prevBtn.classList.toggle('is-hidden', isAtStart);
        nextBtn.classList.toggle('is-hidden', isAtEnd);

        // ARIA attributes
        prevBtn.setAttribute('aria-disabled', isAtStart);
        nextBtn.setAttribute('aria-disabled', isAtEnd);
    };

    // Scroll event listener
    slider.addEventListener('scroll', updateButtons, { passive: true });

    // Resize event listener
    window.addEventListener('resize', updateButtons, { passive: true });

    // Növbəti düyməsi
    nextBtn.addEventListener('click', () => {
        scrollToNextItem(slider);
    });

    // Əvvəlki düyməsi
    prevBtn.addEventListener('click', () => {
        scrollToPrevItem(slider);
    });

    // Keyboard navigation
    slider.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            scrollToPrevItem(slider);
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            scrollToNextItem(slider);
        }
    });

    // Touch/swipe support
    let startX = 0;
    let scrollLeft = 0;
    let isDragging = false;

    slider.addEventListener('touchstart', (e) => {
        startX = e.touches[0].pageX;
        scrollLeft = slider.scrollLeft;
        isDragging = true;
        slider.classList.add('dragging');
    }, { passive: true });

    slider.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.touches[0].pageX;
        const walk = (x - startX) * 2;
        slider.scrollLeft = scrollLeft - walk;
    });

    slider.addEventListener('touchend', () => {
        isDragging = false;
        slider.classList.remove('dragging');
    });

    // Mouse drag support
    slider.addEventListener('mousedown', (e) => {
        startX = e.pageX;
        scrollLeft = slider.scrollLeft;
        isDragging = true;
        slider.classList.add('dragging');
        e.preventDefault();
    });

    slider.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const x = e.pageX;
        const walk = (x - startX) * 2;
        slider.scrollLeft = scrollLeft - walk;
    });

    slider.addEventListener('mouseup', () => {
        isDragging = false;
        slider.classList.remove('dragging');
    });

    slider.addEventListener('mouseleave', () => {
        isDragging = false;
        slider.classList.remove('dragging');
    });

    // İlkin vəziyyəti təyin et
    updateButtons();
}

function scrollToNextItem(slider) {
    if (!slider) return;

    const items = slider.querySelectorAll('.project-item');
    if (items.length === 0) return;

    // Cari görünən elementləri tap
    const containerWidth = slider.clientWidth;
    const itemWidth = items[0].offsetWidth;
    const gap = 30; // CSS-dəki gap dəyəri
    const itemsPerView = Math.floor((containerWidth + gap) / (itemWidth + gap));

    // Cari scroll pozisiyasına əsasən növbəti qrupa keç
    const currentScroll = slider.scrollLeft;
    const scrollAmount = itemsPerView * (itemWidth + gap);

    slider.scrollTo({
        left: currentScroll + scrollAmount,
        behavior: 'smooth'
    });
}

function scrollToPrevItem(slider) {
    if (!slider) return;

    const items = slider.querySelectorAll('.project-item');
    if (items.length === 0) return;

    // Cari görünən elementləri tap
    const containerWidth = slider.clientWidth;
    const itemWidth = items[0].offsetWidth;
    const gap = 30;
    const itemsPerView = Math.floor((containerWidth + gap) / (itemWidth + gap));

    // Cari scroll pozisiyasına əsasən əvvəlki qrupa keç
    const currentScroll = slider.scrollLeft;
    const scrollAmount = itemsPerView * (itemWidth + gap);

    slider.scrollTo({
        left: Math.max(0, currentScroll - scrollAmount),
        behavior: 'smooth'
    });
}

// ==================== ADMIN PANEL ƏLAQƏSİ ====================

function connectToAdminPanel() {
    console.log('🔗 Admin panel ilə əlaqə qurulur...');

    // Admin panel açıqdırsa, xidmətləri soruş
    if (window.opener && !window.opener.closed) {
        try {
            // Xidmətləri soruş
            window.opener.postMessage({
                type: 'GET_SERVICES'
            }, '*');

            // Partnyorları soruş
            window.opener.postMessage({
                type: 'GET_PARTNERS'
            }, '*');

            console.log('📤 Admin panelyə sorğular göndərildi');
        } catch (error) {
            console.error('❌ Admin panelyə sorğu göndərilmədi:', error);
        }
    }

    // Message listener
    window.addEventListener('message', function(event) {
        if (event.data && event.data.type === 'SERVICES_DATA') {
            console.log('📥 Admin paneldən xidmətlər alındı:', event.data.services.length);

            // LocalStorage-a yadda saxla
            localStorage.setItem('guvenfinans-active-services', JSON.stringify(event.data.services));

            // Render et
            renderServicesOnPage(event.data.services);
        }

        if (event.data && event.data.type === 'UPDATE_SERVICES') {
            console.log('🔄 Admin paneldən xidmət yeniləməsi alındı');

            // LocalStorage-a yadda saxla
            localStorage.setItem('guvenfinans-active-services', JSON.stringify(event.data.services));

            // Render et
            renderServicesOnPage(event.data.services);
        }

        if (event.data && event.data.type === 'PARTNERS_DATA') {
            console.log('📥 Admin paneldən partnyorlar alındı:', event.data.partners.length);

            // LocalStorage-a yadda saxla
            localStorage.setItem('guvenfinans-partners', JSON.stringify(event.data.partners));

            // Render et
            renderPartners(event.data.partners);
        }

        if (event.data && event.data.type === 'UPDATE_PARTNERS') {
            console.log('🔄 Admin paneldən partnyor yeniləməsi alındı');

            // LocalStorage-a yadda saxla
            localStorage.setItem('guvenfinans-partners', JSON.stringify(event.data.partners));

            // Render et
            renderPartners(event.data.partners);
        }

        if (event.data && event.data.type === 'UPDATE_PROJECTS') {
            console.log('🔄 Admin paneldən layihə yeniləməsi alındı');
            renderProjectsOnPage(event.data.projects);
        }
    });
}

// ==================== LOCALSTORAGE EVENT LISTENER ====================

window.addEventListener('storage', function(event) {
    console.log('📦 Storage event:', event.key);

    if (event.key === 'guvenfinans-active-services') {
        console.log('🔄 Xidmətlər yenilənir...');

        try {
            if (event.newValue) {
                const services = JSON.parse(event.newValue);
                renderServicesOnPage(services);
                console.log('✅ Xidmətlər avtomatik yeniləndi');
            }
        } catch (error) {
            console.error('❌ Xidmətlər yenilənərkən xəta:', error);
        }
    }

    if (event.key === 'guvenfinans-partners') {
        console.log('🔄 Partnyorlar yenilənir...');

        try {
            if (event.newValue) {
                const partners = JSON.parse(event.newValue);
                renderPartners(partners);
                console.log('✅ Partnyorlar avtomatik yeniləndi');
            }
        } catch (error) {
            console.error('❌ Partnyorlar yenilənərkən xəta:', error);
        }
    }

    if (event.key === 'guvenfinans-projects') {
        console.log('🔄 Layihələr yenilənir...');

        try {
            if (event.newValue) {
                const projects = JSON.parse(event.newValue);
                renderProjectsOnPage(projects);
                console.log('✅ Layihələr avtomatik yeniləndi');
            }
        } catch (error) {
            console.error('❌ Layihələr yenilənərkən xəta:', error);
        }
    }

    // Auth status dəyişiklikləri
    if (event.key === 'auth_token' || event.key === 'guven_token' || event.key === 'user_email') {
        console.log('🔄 Auth status dəyişdi, yenilənir...');
        setTimeout(() => {
            checkAuthStatus();
        }, 100);
    }
});

// ==================== İNİT FUNKSİYALARI ====================

// main.js faylının sonunda - initializePage əvəzinə:

document.addEventListener('DOMContentLoaded', () => {
    console.log('🏠 Ana səhifə başladılır... (main.js)');

    // Auth statusunu yoxla
    if (typeof checkAuthStatus === 'function') {
        checkAuthStatus();
    }

    // Profil düymələrini quraşdır
    if (typeof setupProfileButtons === 'function') {
        setupProfileButtons();
    }

    // Xidmətləri yüklə
    if (typeof loadServicesFromStorage === 'function') {
        loadServicesFromStorage();
    } else {
        console.warn('loadServicesFromStorage tapılmadı');
        loadDefaultServices(); // main.js-də bu funksiya olmalıdır
    }

    // Partnyorları yüklə
    if (typeof loadPartners === 'function') {
        loadPartners();
    } else {
        console.warn('loadPartners tapılmadı');
        // Partnyorlar üçün default
    }

    // Layihələri yüklə
    if (typeof loadProjects === 'function') {
        setTimeout(() => {
            loadProjects();
        }, 100);
    } else {
        console.warn('loadProjects tapılmadı');
    }
});

// Stats animasiyası
function animateStats() {
    const stats = document.querySelectorAll('.stat-count');
    if (stats.length === 0) return;

    let animationStarted = false;

    function startAnimation() {
        if (animationStarted) return;

        stats.forEach(stat => {
            const text = stat.textContent;
            const numberMatch = text.match(/\d+/);
            if (!numberMatch) return;

            const targetValue = parseInt(numberMatch[0]);
            const suffix = text.replace(numberMatch[0], '');
            const duration = 1500;
            const startTime = Date.now();
            const startValue = 0;

            function updateCounter() {
                const currentTime = Date.now();
                const progress = Math.min((currentTime - startTime) / duration, 1);
                const currentValue = Math.floor(progress * targetValue);

                stat.textContent = currentValue + suffix;

                if (progress < 1) {
                    requestAnimationFrame(updateCounter);
                }
            }

            updateCounter();
        });

        animationStarted = true;
    }

    // Intersection Observer ilə scroll-da animasiya başlat
    const statsSection = document.querySelector('.stats');
    if (statsSection) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    startAnimation();
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.3 });

        observer.observe(statsSection);
    }
}

// Sayt tam yüklənəndə auth statusunu yenilə
window.addEventListener('load', function() {
    console.log('🔄 Sayt tam yükləndi, auth statusu yoxlanılır...');
    setTimeout(() => {
        checkAuthStatus();
    }, 500);
});

(function loadProjectModal() {
    const script = document.createElement('script');
    script.src = 'assets/js/main_js/project-modal.js';
    script.async = false;
    script.defer = true;
    script.onload = () => console.log('✅ Project modal yükləndi');
    script.onerror = () => console.error('❌ Project modal yüklənmədi');
    document.body.appendChild(script);
})();