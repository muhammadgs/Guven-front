/**
 * circularNav.js - Dalğa Formasında Naviqasiya Sistemi
 * @version 1.0.8
 * @lastModified 2024-01-16
 */

document.addEventListener('DOMContentLoaded', function() {
    'use strict';

    console.log('🌊 WaveNav yükləndi - v1.0.8 (Toggle funksiyası əlavə olundu)');

    // ===== ELEMENTLƏRİ SEÇ =====
    const waveNav = document.getElementById('waveNav');
    const navItems = document.querySelectorAll('.wave-item');

    // Bölmələr
    const sections = {
        new: document.getElementById('newTableSection'),
        active: document.getElementById('activeTableSection'),
        external: document.getElementById('externalTableSection'),
        partner: document.getElementById('partnerTableSection'),
        report: document.getElementById('reportTableSection'),
        archive: document.getElementById('archiveTableSection')
    };

    const newTaskSection = document.getElementById('newTaskCreateSection');

    // Dəyişənlər
    let activeItem = null;
    let currentSection = 'new';
    let lastClickedItem = null; // ƏLAVƏ EDİLDİ - Son kliklənən item-i izləmək üçün

    // ===== BÜTÜN BÖLMƏLƏRİ GİZLƏ =====
    function hideAllSections() {
        Object.values(sections).forEach(section => {
            if (section) {
                section.style.display = 'none';
                section.classList.remove('active-section');
            }
        });
        if (newTaskSection) {
            newTaskSection.style.display = 'none';
            newTaskSection.classList.remove('active-section');
        }
    }

    function showTaskManagerSection(section) {
        if (!section) return;

        const isTaskTableCard =
            section.classList.contains('table-card') &&
            !section.classList.contains('new-task-section');

        section.style.display = isTaskTableCard ? 'flex' : 'block';
        section.classList.add('active-section');

        if (section.id === 'reportTableSection') {
            section.scrollTop = 0;
        }
    }

    // ===== BÖLMƏ GÖSTƏR =====
    function showSection(name) {
        hideAllSections();
        if(name === 'new' && newTaskSection) showTaskManagerSection(newTaskSection);
        else if(sections[name]) showTaskManagerSection(sections[name]);
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

            // ƏGƏR EYNİ İTEM-Ə TƏKRAR KLİK OLUNUB SA
            if(lastClickedItem === this) {
                console.log('🔄 Eyni item-ə təkrar klik - panel geri qayıdır');

                // Seçimi təmizlə
                removeSelected();

                // Panel normala qayıt (mərkəzdə görünsün)
                restorePanel();

                // Bütün bölmələri gizlət (sadəcə panel qalsın)
                hideAllSections();

                // Son klikləni sıfırla
                lastClickedItem = null;
                activeItem = null;

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
    hideAllSections();


    // İlk açılışda heç bir item seçili olmasın.
// İstifadəçi ilk klikdə paneli yuxarı linear vəziyyətə aparacaq.
    removeSelected();
    activeItem = null;
    lastClickedItem = null;

    console.log('✅ Panel hazır - Toggle funksiyası aktiv');
    console.log('📌 İstifadə:');
    console.log('   - Eyni item-ə təkrar klik → panel geri qayıdır');
    console.log('   - ESC düyməsi → panel normala qayıdır');
    console.log('   - Panelə klik → panel açılır');
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