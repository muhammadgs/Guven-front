/**
 * circularNav.js - Dalğa Formasında Naviqasiya Sistemi
 * @version 1.0.8
 * @lastModified 2024-01-16
 */

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
            section.scrollTop = 0;
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
        }
    }

    // ===== PANEL NORMALA QAYIT =====
    function restorePanel() {
        if (waveNav) {
            waveNav.classList.remove('minimized', 'collapsed', 'has-selection', 'is-selected', 'pinned', 'centered', 'expanded', 'fullscreen');
            waveNav.removeAttribute('data-active-target');
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