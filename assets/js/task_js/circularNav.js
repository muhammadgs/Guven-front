/**
 * circularNav.js - Dalğa Formasında Naviqasiya Sistemi
 * @version 1.0.8
 * @lastModified 2024-01-16
 */

document.addEventListener('DOMContentLoaded', function() {
    'use strict';

    console.log('🌊 WaveNav yükləndi - v1.0.9 (Finance redesign compact nav)');

    // ===== ELEMENTLƏRİ SEÇ =====
    const waveNav = document.getElementById('waveNav');
    const navItems = document.querySelectorAll('.wave-item');

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
    let currentSection = 'new';
    let lastClickedItem = null; // ƏLAVƏ EDİLDİ - Son kliklənən item-i izləmək üçün

    // ===== BÜTÜN BÖLMƏLƏRİ GİZLƏ =====
    function getTaskManagerRoot() {
        return document.querySelector('.task-manager-container') ||
            document.getElementById('taskManagerSection') ||
            document.body;
    }

    function setTaskManagerInitialState() {
        const root = getTaskManagerRoot();
        root.classList.add('task-manager-initial');
        root.classList.remove('task-manager-section-active');
        hideAllSections();
    }

    function setTaskManagerActiveState() {
        const root = getTaskManagerRoot();
        root.classList.remove('task-manager-initial');
        root.classList.add('task-manager-section-active');
    }

    function hideSection(section) {
        if (!section) return;
        section.classList.remove('task-section-active', 'active-section', 'fade-in');
        section.classList.add('task-section-hidden');
        section.style.display = 'none';
    }

    function hideAllSections() {
        Object.values(sections).forEach(hideSection);
    }

    function showTaskManagerSection(section, target) {
        if (!section) return;

        const isTaskTableCard = section.classList.contains('table-card');
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
        navItems.forEach(item => item.classList.remove('selected'));
    }

    // ===== PANEL BALACALAŞ =====
    function minimizePanel() {
        if(waveNav) waveNav.classList.add('minimized');
    }

    // ===== PANEL NORMALA QAYIT =====
    function restorePanel() {
        if(waveNav) waveNav.classList.remove('minimized');
    }

    // ===== BÜTÜN PANELLERİ GÖSTER (sadece panel görünsün, bölmələr gizlənsin) =====
    function showOnlyPanel() {
        hideAllSections();
        restorePanel();
        console.log('📌 Sadəcə panel göstərilir');
    }

    // ===== KLİK HADİSƏLƏRİ =====
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();

            const target = this.dataset.target;
            console.log('🔘 Klik:', target, 'Son klik:', lastClickedItem ? lastClickedItem.dataset.target : 'yoxdur');

            // FINANCE REDESIGN: repeated clicks keep the compact SaaS row active.
            // The old interaction expanded/restored the game-like wave panel; ESC still returns to initial state.
            if(lastClickedItem === this) {
                console.log('🔄 Eyni item-ə təkrar klik - kompakt panel aktiv saxlanılır');
                this.classList.add('selected');
                activeItem = this;
                showSection(target);
                minimizePanel();
                return;
            }

            // ƏGƏR YENİ İTEM-Ə KLİK OLUNUB SA

            // Seçimi idarə et
            removeSelected();
            this.classList.add('selected');
            activeItem = this;

            // Bölməni göstər
            showSection(target);

            // Panel balacalaş (yuxarı qalxsın)
            minimizePanel();

            // Son klikləni yadda saxla
            lastClickedItem = this;
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
            if(waveNav?.classList.contains('minimized')) {
                // Balacalaşmışdırsa - normala qayıt
                restorePanel();
                if(activeItem) {
                    const target = activeItem.dataset.target;
                    showSection(target);
                }
            } else {
                // Normal vəziyyətdədirsə - sadəcə paneli göstər
                showOnlyPanel();
                removeSelected();
                lastClickedItem = null;
                activeItem = null;
            }
        }
    });

    // ===== İLKİN YÜKLƏMƏ =====
    setTaskManagerInitialState();
    window.__taskNavManagedByCircular = true;


    // İlk açılışda heç bir item seçili olmasın.
// İstifadəçi ilk klikdə paneli yuxarı linear vəziyyətə aparacaq.
    removeSelected();
    activeItem = null;
    lastClickedItem = null;

    console.log('✅ Panel hazır - Finance redesign kompakt naviqasiya aktiv');
    console.log('📌 İstifadə:');
    console.log('   - Eyni item-ə təkrar klik → kompakt panel aktiv qalır');
    console.log('   - ESC düyməsi → panel normala qayıdır');
    console.log('   - Panel boşluğuna klik → seçim dəyişmir');
});
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