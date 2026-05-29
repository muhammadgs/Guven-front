/**
 * circularNav.js - Dalğa Formasında Naviqasiya Sistemi
 * @version 1.0.8
 * @lastModified 2024-01-16
 */

function initTaskDockMagnification() {
    const nav = document.getElementById('waveNav');
    const row = nav?.querySelector('.wave-nav-items');

    if (!nav || !row) return;

    // Unbind previous if re-initializing (hot reload safe)
    if (row._dockCleanup) {
        row._dockCleanup();
    }

    /* ─── Configuration ─── */
    const CFG = {
        maxDistance: 200,         // px radius of influence from cursor
        maxScaleBoost: 0.38,     // peak scale above 1.0
        maxLift: 16,             // px upward translation at peak
        maxShadow: 12,           // extra shadow blur at peak
        maxShadowAlpha: 0.06,    // extra shadow opacity at peak
        lerpSpeed: 0.18,         // interpolation factor per frame (0-1, lower = smoother)
        lerpReturnSpeed: 0.12,   // interpolation when returning to rest (slower = more graceful)
        epsilon: 0.0005,         // threshold to stop animating (close enough to target)
    };

    /* ─── State ─── */
    let items = [];
    let itemCount = 0;

    // Current animated values per item (what's visually rendered)
    let curScale, curY, curShadow, curAlpha;
    // Target values per item (what we're animating toward)
    let tgtScale, tgtY, tgtShadow, tgtAlpha;

    let pointerX = -9999;       // current pointer X (screen coords)
    let isHovering = false;     // is pointer inside the dock row?
    let isAnimating = false;    // is the RAF loop running?
    let rafId = 0;

    function cacheItems() {
        items = Array.from(row.querySelectorAll('.wave-item'));
        itemCount = items.length;
        curScale  = new Float64Array(itemCount).fill(1);
        curY      = new Float64Array(itemCount).fill(0);
        curShadow = new Float64Array(itemCount).fill(0);
        curAlpha  = new Float64Array(itemCount).fill(0);
        tgtScale  = new Float64Array(itemCount).fill(1);
        tgtY      = new Float64Array(itemCount).fill(0);
        tgtShadow = new Float64Array(itemCount).fill(0);
        tgtAlpha  = new Float64Array(itemCount).fill(0);
    }

    function isCollapsedMode() {
        return nav.classList.contains('minimized') ||
               nav.classList.contains('has-selection');
    }

    /* Hermite smoothstep for organic feel */
    function smoothstep(t) {
        return t * t * (3 - 2 * t);
    }

    /* Compute target values based on current pointer position */
    function computeTargets() {
        if (!isHovering || !isCollapsedMode()) {
            // Return all targets to rest
            for (let i = 0; i < itemCount; i++) {
                tgtScale[i] = 1;
                tgtY[i] = 0;
                tgtShadow[i] = 0;
                tgtAlpha[i] = 0;
            }
            return;
        }

        for (let i = 0; i < itemCount; i++) {
            const el = items[i];
            const rect = el.getBoundingClientRect();
            const centerX = rect.left + rect.width * 0.5;
            const dist = Math.abs(pointerX - centerX);

            const raw = Math.max(0, 1 - dist / CFG.maxDistance);
            const inf = smoothstep(raw);

            tgtScale[i]  = 1 + inf * CFG.maxScaleBoost;
            tgtY[i]      = -inf * CFG.maxLift;
            tgtShadow[i] = inf * CFG.maxShadow;
            tgtAlpha[i]  = inf * CFG.maxShadowAlpha;
        }
    }

    /* Main render loop — runs continuously while animating */
    function tick() {
        rafId = 0;

        computeTargets();

        let stillMoving = false;

        for (let i = 0; i < itemCount; i++) {
            // Choose lerp speed: faster when approaching target while hovering,
            // slower on the way back for a graceful ease-out
            const speed = isHovering ? CFG.lerpSpeed : CFG.lerpReturnSpeed;

            // Exponential interpolation (lerp)
            curScale[i]  += (tgtScale[i]  - curScale[i])  * speed;
            curY[i]      += (tgtY[i]      - curY[i])      * speed;
            curShadow[i] += (tgtShadow[i] - curShadow[i]) * speed;
            curAlpha[i]  += (tgtAlpha[i]  - curAlpha[i])   * speed;

            // Snap to target if close enough
            const dScale = Math.abs(tgtScale[i] - curScale[i]);
            const dY     = Math.abs(tgtY[i]     - curY[i]);

            if (dScale > CFG.epsilon || dY > CFG.epsilon * 10) {
                stillMoving = true;
            } else {
                curScale[i]  = tgtScale[i];
                curY[i]      = tgtY[i];
                curShadow[i] = tgtShadow[i];
                curAlpha[i]  = tgtAlpha[i];
            }

            // Write CSS custom properties (batched, no layout thrash)
            const el = items[i];
            el.style.setProperty('--dock-scale', curScale[i].toFixed(4));
            el.style.setProperty('--dock-y', curY[i].toFixed(2) + 'px');
            el.style.setProperty('--dock-shadow', curShadow[i].toFixed(2) + 'px');
            el.style.setProperty('--dock-shadow-alpha', curAlpha[i].toFixed(4));
        }

        isAnimating = stillMoving;

        if (stillMoving) {
            rafId = requestAnimationFrame(tick);
        }
    }

    function startLoop() {
        if (!isAnimating) {
            isAnimating = true;
            if (!rafId) {
                rafId = requestAnimationFrame(tick);
            }
        }
    }

    function hardReset() {
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = 0;
        }
        isAnimating = false;
        isHovering = false;
        pointerX = -9999;
        for (let i = 0; i < itemCount; i++) {
            curScale[i] = tgtScale[i] = 1;
            curY[i] = tgtY[i] = 0;
            curShadow[i] = tgtShadow[i] = 0;
            curAlpha[i] = tgtAlpha[i] = 0;
            const el = items[i];
            el.style.setProperty('--dock-scale', '1');
            el.style.setProperty('--dock-y', '0px');
            el.style.setProperty('--dock-shadow', '0px');
            el.style.setProperty('--dock-shadow-alpha', '0');
        }
    }

    /* ─── Event Handlers ─── */
    function onPointerMove(e) {
        if (!isCollapsedMode()) {
            if (isHovering) {
                isHovering = false;
                startLoop(); // animate back to rest
            }
            return;
        }
        pointerX = e.clientX;
        isHovering = true;
        startLoop();
    }

    function onPointerLeave() {
        isHovering = false;
        pointerX = -9999;
        startLoop(); // animate gracefully back to rest
    }

    /* ─── Bind ─── */
    cacheItems();

    row.addEventListener('pointermove', onPointerMove, { passive: true });
    row.addEventListener('pointerleave', onPointerLeave, { passive: true });
    row.addEventListener('pointercancel', onPointerLeave, { passive: true });
    row.addEventListener('blur', onPointerLeave, true);

    // Re-cache items when DOM changes (e.g. dynamic nav items)
    const observer = new MutationObserver(() => {
        cacheItems();
    });
    observer.observe(row, { childList: true });

    hardReset();

    // Cleanup function for hot-reload
    row._dockCleanup = () => {
        if (rafId) cancelAnimationFrame(rafId);
        row.removeEventListener('pointermove', onPointerMove);
        row.removeEventListener('pointerleave', onPointerLeave);
        row.removeEventListener('pointercancel', onPointerLeave);
        row.removeEventListener('blur', onPointerLeave, true);
        observer.disconnect();
        hardReset();
        delete row._dockCleanup;
    };
}

window.initTaskDockMagnification = initTaskDockMagnification;

function initializeCircularNav() {
    'use strict';

    console.log('🌊 WaveNav yükləndi - v1.0.9 (Finance redesign compact nav)');

    // ===== ELEMENTLƏRİ SEÇ =====
    const waveNav = document.getElementById('waveNav');
    const navItems = document.querySelectorAll('.wave-item');

    if (!waveNav || navItems.length === 0) {
        window.__taskNavManagedByCircular = false;
        console.warn('⚠️ WaveNav tapılmadı - circular nav init təxirə salındı');
        return;
    }

    if (waveNav.dataset.circularNavBound === 'true') {
        initTaskDockMagnification();
        window.__taskNavManagedByCircular = true;
        console.log('ℹ️ WaveNav artıq initialize edilib');
        return;
    }

    waveNav.dataset.circularNavBound = 'true';

    // Bölmələr
    const sections = {
        new: document.getElementById('newTaskCreateSection'),
        active: document.getElementById('activeTableSection'),
        external: document.getElementById('externalTableSection'),
        partner: document.getElementById('partnerTableSection'),
        report: document.getElementById('reportTableSection'),
        archive: document.getElementById('archiveTableSection')
    };

    
    // Dəyişənlər
    let activeItem = null;
    let currentActiveTarget = null;

    // ===== BÜTÜN BÖLMƏLƏRİ GİZLƏ =====
    function getTaskManagerRoot() {
        return document.querySelector('.task-manager-container') ||
            document.getElementById('taskManagerSection') ||
            document.body;
    }

    function setTaskManagerInitialState() {
        const root = getTaskManagerRoot();
        root.classList.add('task-manager-initial');
        root.classList.remove('task-manager-section-active', 'task-page-selected');
        hideAllSections();
    }

    function setTaskManagerActiveState() {
        const root = getTaskManagerRoot();
        root.classList.remove('task-manager-initial');
        root.classList.add('task-manager-section-active', 'task-page-selected');
    }

    function hideSection(section) {
        if (!section) return;
        section.classList.remove('task-section-active', 'active-section', 'fade-in', 'active', 'is-active', 'show');
        section.classList.add('task-section-hidden');
        section.hidden = true;
        section.style.display = 'none';
    }

    function hideAllSections() {
        Object.values(sections).forEach(hideSection);
    }

    function showTaskManagerSection(section, target) {
        if (!section) return;

        const isTaskTableCard = section.classList.contains('table-card');
        section.hidden = false;
        section.classList.remove('task-section-hidden');
        section.classList.add('task-section-active', 'active-section', 'fade-in');
        section.style.display = isTaskTableCard ? 'flex' : 'block';

        if (target === 'report') {
            const reportScrollContent = section.querySelector('.report-scroll-content');
            (reportScrollContent || section).scrollTop = 0;
        }
    }

    // ===== BÖLMƏ GÖSTƏR =====
    function showSection(name) {
        setTaskManagerActiveState();
        hideAllSections();
        showTaskManagerSection(sections[name], name);
    }

    // ===== SEÇİMİ TƏMİZLƏ =====
    function removeSelected() {
        navItems.forEach(item => {
            item.classList.remove('selected', 'active-item', 'is-active');
            item.setAttribute('aria-selected', 'false');
        });
    }

    // ===== PANEL BALACALAŞ =====
    function minimizePanel(target) {
        if (waveNav) {
            waveNav.classList.remove('pinned', 'centered', 'expanded', 'fullscreen', 'collapsed', 'is-selected');
            waveNav.classList.add('minimized', 'has-selection');
            if (target) waveNav.setAttribute('data-active-target', target);
            initTaskDockMagnification();
        }
    }

    // ===== PANEL NORMALA QAYIT =====
    function restorePanel() {
        if (waveNav) {
            waveNav.classList.remove('minimized', 'collapsed', 'has-selection', 'is-selected', 'pinned', 'centered', 'expanded', 'fullscreen');
            waveNav.removeAttribute('data-active-target');
            initTaskDockMagnification();
        }
    }

    // ===== BÜTÜN PANELLERİ GÖSTER (sadece panel görünsün, bölmələr gizlənsin) =====
    function resetTaskMenuToLanding() {
        currentActiveTarget = null;
        activeItem = null;
        setTaskManagerInitialState();
        restorePanel();
        removeSelected();
        console.log('📌 Task menyusu ilkin 3x2 vəziyyətinə qaytarıldı');
    }

    function activateTaskMenuItem(item) {
        const target = item.dataset.target;
        currentActiveTarget = target;
        activeItem = item;

        removeSelected();
        item.classList.add('selected', 'active-item');
        item.setAttribute('aria-selected', 'true');

        showSection(target);
        minimizePanel(target);
    }

    // ===== KLİK HADİSƏLƏRİ =====
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();

            const target = this.dataset.target;
            const navIsCollapsed = waveNav?.classList.contains('minimized') ||
                waveNav?.classList.contains('has-selection');
            const alreadyActive = currentActiveTarget === target ||
                waveNav?.getAttribute('data-active-target') === target ||
                this.classList.contains('selected') ||
                this.classList.contains('active-item');

            console.log('🔘 Klik:', target, 'Aktiv:', currentActiveTarget || 'yoxdur');

            if (alreadyActive && navIsCollapsed) {
                resetTaskMenuToLanding();
                return;
            }

            activateTaskMenuItem(this);
        });
    });

    // ===== PANELƏ KLİK (balacalaşmış vəziyyətdə açmaq üçün) =====
    if (waveNav) {
        waveNav.addEventListener('click', function(e) {
            if (!e.target.closest('.wave-item')) {
                e.preventDefault();
                e.stopPropagation();
            }
        });
    }

    // ===== ESC DÜYMƏSİ =====
    document.addEventListener('keydown', e => {
        if(e.key === 'Escape') {
            resetTaskMenuToLanding();
        }
    });

    // ===== İLKİN YÜKLƏMƏ =====
    setTaskManagerInitialState();
    initTaskDockMagnification();
    window.__taskNavManagedByCircular = true;


    // İlk açılışda heç bir item seçili olmasın.
// İstifadəçi ilk klikdə paneli yuxarı linear vəziyyətə aparacaq.
    removeSelected();
    activeItem = null;
    currentActiveTarget = null;

    console.log('✅ Panel hazır - Finance redesign kompakt naviqasiya aktiv');
    console.log('📌 İstifadə:');
    console.log('   - Eyni aktiv item-ə təkrar klik → ilkin 3x2 menyuya qayıdır');
    console.log('   - ESC düyməsi → ilkin 3x2 menyuya qayıdır');
    console.log('   - Panel boşluğuna klik → seçim dəyişmir');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCircularNav);
} else {
    initializeCircularNav();
}

window.initializeCircularNav = initializeCircularNav;
// Panel və başlıq arasında əlaqə
document.addEventListener('DOMContentLoaded', function() {
    const waveNav = document.getElementById('waveNav');
    const tasksHeader = document.querySelector('.tasks-header');

    if (waveNav && tasksHeader) {
        // Panel dəyişdikdə başlığa da class əlavə et
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.attributeName === 'class') {
                    if (waveNav.classList.contains('minimized')) {
                        tasksHeader.classList.add('minimized');
                    } else {
                        tasksHeader.classList.remove('minimized');
                    }
                }
            });
        });

        observer.observe(waveNav, { attributes: true });
    }
});