// ===========================================
// TASK MANAGER LOADER - Yenilənmiş versiya
// Seçilmiş funksiya yuxarı qalxır, təkrar klikdə panel ortaya gəlir
// ===========================================

const TaskManagerLoader = {
    // Ana funksiya - Task Manager-i yükləyir
    loadInContainer: function(container, callback) {
        console.log('📋 TaskManagerLoader: Yükləmə başladı...');

        try {
            if (!container) {
                console.error('❌ TaskManagerLoader: Container tapılmadı');
                return;
            }

            this.showLoading(container);

            setTimeout(() => {
                this.fetchTaskManagerContent(container, callback);
            }, 100);

        } catch (error) {
            console.error('❌ TaskManagerLoader xətası:', error);
            this.showError(container, error.message);
        }
    },

    // Loading göstər
    showLoading: function(container) {
        container.innerHTML = `
            <div class="flex items-center justify-center h-64">
                <div class="text-center">
                    <div class="inline-block h-12 w-12 animate-spin rounded-full border-4 border-brand-blue border-t-transparent"></div>
                    <p class="text-gray-500 mt-4">Task Manager yüklənir...</p>
                </div>
            </div>
        `;
    },

    // Task Manager məzmununu fetch et
    fetchTaskManagerContent: function(container, callback) {
        console.log('📥 TaskManagerLoader: task.html yüklənir...');

        fetch('../task/task.html')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.text();
            })
            .then(html => {
                console.log('✅ TaskManagerLoader: task.html yükləndi');

                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');

                let content = '';
                if (doc.body) {
                    content = doc.body.innerHTML;
                } else {
                    content = html;
                }

                container.innerHTML = content;

                // ƏSAS DƏYİŞİKLİK: CSS və Script-ləri yüklə
                this.loadTaskManagerStyles();
                this.loadTaskManagerScripts(() => {
                    this.initializeTaskManager(callback);

                    // YENİ: Naviqasiya sistemini aktivləşdir
                    setTimeout(() => {
                        this.enhanceNavigation();
                    }, 500);
                });
            })
            .catch(error => {
                console.error('❌ TaskManagerLoader: task.html yüklənmədi:', error);
                this.loadFallbackContent(container, callback);
            });
    },

    // YENİ FUNKSİYA: Naviqasiyanı gücləndir
    enhanceNavigation: function() {
        console.log('🎯 TaskManagerLoader: Naviqasiya gücləndirilir...');

        if (window.__taskNavManagedByCircular) {
            console.log('ℹ️ Circular nav state manager aktivdir, əlavə handler bağlanmadı');
            return;
        }

        const waveNav = document.getElementById('waveNav');
        const sections = this.getTaskManagerSections();

        // Yeni stillər əlavə et
        this.addNavigationStyles();

        // İlkin ekran: heç bir bölmə göstərilməsin, yalnız mərkəzi 6-li menyu qalsın
        this.resetTaskMenuToLanding(sections);

        if (waveNav && waveNav.dataset.navBound !== 'true') {
            waveNav.dataset.navBound = 'true';
            waveNav.addEventListener('click', function(e) {
                const item = e.target.closest('.wave-item');

                if (!item || !waveNav.contains(item)) {
                    if (waveNav.classList.contains('minimized')) {
                        e.preventDefault();
                        e.stopPropagation();
                    }
                    return;
                }

                e.preventDefault();
                e.stopPropagation();

                const target = item.getAttribute('data-target');
                const navIsCollapsed = waveNav.classList.contains('minimized') ||
                    waveNav.classList.contains('has-selection');
                const alreadyActive = waveNav.getAttribute('data-active-target') === target ||
                    item.classList.contains('selected') ||
                    item.classList.contains('active-item');

                console.log('🎯 Klik edildi:', target);

                if (alreadyActive && navIsCollapsed) {
                    TaskManagerLoader.resetTaskMenuToLanding(sections);
                    return;
                }

                TaskManagerLoader.activateTaskMenuItem(item, sections);
            });
        }

        console.log('✅ Naviqasiya gücləndirildi');
    },



    getTaskManagerRoot: function() {
        return document.querySelector('.task-manager-container') ||
            document.getElementById('taskManagerSection') ||
            document.body;
    },

    getTaskManagerSections: function() {
        return {
            new: document.getElementById('newTaskCreateSection') || document.getElementById('newTableSection'),
            active: document.getElementById('activeTableSection'),
            external: document.getElementById('externalTableSection'),
            partner: document.getElementById('partnerTableSection'),
            report: document.getElementById('reportTableSection'),
            archive: document.getElementById('archiveTableSection')
        };
    },

    resetTaskMenuToLanding: function(sections = this.getTaskManagerSections()) {
        const waveNav = document.getElementById('waveNav');
        const navItems = document.querySelectorAll('.wave-item');
        const root = this.getTaskManagerRoot();

        if (root) {
            root.classList.add('task-manager-initial');
            root.classList.remove('task-manager-section-active');
        }

        if (waveNav) {
            waveNav.classList.remove('minimized', 'collapsed', 'has-selection', 'is-selected', 'pinned', 'centered', 'expanded', 'fullscreen');
            waveNav.removeAttribute('data-active-target');
        }

        navItems.forEach(item => {
            item.classList.remove('selected', 'active-item', 'is-active');
            item.setAttribute('aria-selected', 'false');
        });

        this.hideAllTaskManagerSections(sections);
        this.collapseContent();
        localStorage.removeItem('lastSelectedTarget');
    },

    activateTaskMenuItem: function(item, sections = this.getTaskManagerSections()) {
        const target = item.getAttribute('data-target');
        const waveNav = document.getElementById('waveNav');
        const navItems = document.querySelectorAll('.wave-item');
        const root = this.getTaskManagerRoot();

        if (root) {
            root.classList.remove('task-manager-initial');
            root.classList.add('task-manager-section-active');
        }

        navItems.forEach(navItem => {
            const isActive = navItem.getAttribute('data-target') === target;
            navItem.classList.toggle('selected', isActive);
            navItem.classList.toggle('active-item', isActive);
            navItem.classList.toggle('is-active', isActive);
            navItem.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });

        if (waveNav) {
            waveNav.classList.remove('pinned', 'centered', 'expanded', 'fullscreen', 'collapsed', 'is-selected');
            waveNav.classList.add('minimized', 'has-selection');
            waveNav.setAttribute('data-active-target', target);
        }

        this.adjustPanelState(target);
        this.showTargetSection(target, sections);
    },

    hideTaskManagerSection: function(section) {
        if (!section) return;

        section.classList.remove('task-section-active', 'active-section', 'fade-in', 'active', 'is-active', 'show');
        section.classList.add('task-section-hidden');
        section.hidden = true;
        section.style.display = 'none';
    },

    hideAllTaskManagerSections: function(sections) {
        Object.values(sections).forEach(section => this.hideTaskManagerSection(section));

        const newTaskSection = document.getElementById('newTaskCreateSection');
        this.hideTaskManagerSection(newTaskSection);
    },

    showTaskManagerSection: function(section) {
        if (!section) return;

        const isTaskTableCard = section.classList.contains('table-card') && !section.classList.contains('new-task-section');
        section.hidden = false;
        section.classList.remove('task-section-hidden');
        section.classList.add('task-section-active', 'active-section');
        section.style.display = isTaskTableCard ? 'flex' : 'block';

        if (section.id === 'reportTableSection') {
            section.scrollTop = 0;
        }
    },

    showTargetSection: function(target, sections) {
        this.hideAllTaskManagerSections(sections);

        const newTaskSection = document.getElementById('newTaskCreateSection');
        if (target === 'new') {
            this.showTaskManagerSection(newTaskSection);
            return;
        }

        this.showTaskManagerSection(sections[target]);
    },

    // FINANCE REDESIGN: Panel vəziyyəti - seçilmiş bölmədə kompakt horizontal SaaS row qalır.
    adjustPanelState: function(target) {
        const waveNav = document.getElementById('waveNav');
        if (!waveNav) return;

        // Köhnə fullscreen/expanded/pinned dalğa effektlərini neytrallaşdır.
        waveNav.classList.remove('pinned', 'centered', 'expanded', 'fullscreen', 'collapsed', 'is-selected');
        waveNav.classList.add('minimized', 'has-selection');
        if (target) waveNav.setAttribute('data-active-target', target);
        this.collapseContent();

        localStorage.setItem('lastSelectedTarget', target);
    },

    // YENİ: Məzmunu böyüt (tam ekran effekti)
    expandContent: function() {
        const waveNav = document.getElementById('waveNav');
        const tables = document.querySelectorAll('.table-card');
        const container = document.querySelector('.task-manager-container');

        // Panel arxa fonunu böyüt
        if (waveNav) {
            waveNav.style.transition = 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
        }

        // Cədvəlləri böyüt
        tables.forEach(table => {
            table.style.transition = 'all 0.5s ease';
            table.style.transform = 'scale(1.02)';
            table.style.boxShadow = '0 25px 50px -12px rgba(59, 130, 246, 0.5)';
            table.style.border = '2px solid #3b82f6';
        });

        // Konteynerə fullscreen class-ı əlavə et
        if (container) {
            container.classList.add('content-expanded');
        }
    },

    // YENİ: Məzmunu kiçilt (normal vəziyyətə qayıt)
    collapseContent: function() {
        const waveNav = document.getElementById('waveNav');
        const tables = document.querySelectorAll('.table-card');
        const container = document.querySelector('.task-manager-container');

        // Cədvəlləri normal vəziyyətə qaytar
        tables.forEach(table => {
            table.style.transform = 'scale(1)';
            table.style.boxShadow = '';
            table.style.border = '';
        });

        // Konteynerdən fullscreen class-ını sil
        if (container) {
            container.classList.remove('content-expanded');
        }

        setTimeout(() => {
            if (waveNav) {
                waveNav.style.transition = '';
            }
        }, 500);
    },

    // addNavigationStyles funksiyasına FULLSCREEN stillərini əlavə et
    addNavigationStyles: function() {
        const styleElement = document.createElement('style');
        styleElement.id = 'task-manager-nav-styles';

        // Əgər artıq varsa, sil
        const existingStyle = document.getElementById('task-manager-nav-styles');
        if (existingStyle) existingStyle.remove();

        styleElement.textContent = `
            /* SEÇİLMİŞ İTEM ÜÇÜN XÜSUSİ STİLLƏR */
            .wave-item.selected {
                background: rgba(255, 255, 255, 0.3) !important;
                border: 3px solid #ffffff !important;
                transform: translateY(-8px) scale(1.05);
                box-shadow: 0 15px 30px rgba(0, 0, 0, 0.2);
                position: relative;
                z-index: 101;
                transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            
            .wave-item.selected .wave-icon {
                background: rgba(255, 255, 255, 0.4);
                transform: scale(1.1) rotate(5deg);
                box-shadow: 0 5px 15px rgba(255, 255, 255, 0.3);
            }
            
            .wave-item.selected .wave-title {
                font-weight: 700;
                text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            }
            
            .wave-item.selected .wave-count {
                background: #ffffff;
                color: #3b82f6;
                font-weight: 800;
                transform: scale(1.1);
            }
            
            /* PANEL YAPIŞIQ VƏZİYYƏT (PINNED) */
            .wave-nav-container.pinned {
                position: sticky !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                z-index: 1000 !important;
                border-radius: 0 0 30px 30px !important;
                animation: slideDown 0.4s ease;
                margin-bottom: 30px !important;
                box-shadow: 0 10px 30px -5px rgba(59, 130, 246, 0.4) !important;
                width: 100% !important;
            }
            
            /* TAM EKRAN VƏZİYYƏT (FULLSCREEN) */
            .wave-nav-container.fullscreen {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                z-index: 9999 !important;
                background: linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899) !important;
                background-size: 300% 300% !important;
                animation: fullscreenGradient 8s ease infinite !important;
                border-radius: 0 !important;
                margin: 0 !important;
                padding: 20px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                transform-origin: center !important;
                transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
                backdrop-filter: blur(10px);
            }
            
            .wave-nav-container.fullscreen::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.3);
                backdrop-filter: blur(5px);
                z-index: -1;
            }
            
            .wave-nav-container.fullscreen .wave-nav-content {
                transform: scale(1.5);
                animation: contentPulse 2s ease infinite;
            }
            
            .wave-nav-container.fullscreen .wave-item {
                transform: scale(1.2);
                margin: 20px;
                background: rgba(255, 255, 255, 0.2);
                border: 3px solid white;
                animation: itemFloat 3s ease infinite;
            }
            
            .wave-nav-container.fullscreen .wave-item:hover {
                transform: scale(1.4) translateY(-15px);
                background: rgba(255, 255, 255, 0.3);
                box-shadow: 0 30px 50px rgba(0, 0, 0, 0.3);
            }
            
            .wave-nav-container.fullscreen .wave-icon {
                width: 100px;
                height: 100px;
                font-size: 45px;
                background: rgba(255, 255, 255, 0.3);
                border: 4px solid white;
                animation: iconSpin 10s linear infinite;
            }
            
            .wave-nav-container.fullscreen .wave-title {
                font-size: 20px;
                font-weight: 700;
                text-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
            }
            
            .wave-nav-container.fullscreen .wave-count {
                font-size: 28px;
                padding: 8px 16px;
                background: white;
                color: #3b82f6;
                border-radius: 40px;
                font-weight: 800;
            }
            
            /* MƏZMUN BÖYÜTMƏ EFFEKTİ */
            .content-expanded .table-card {
                transform: scale(1.02) !important;
                transition: all 0.5s ease !important;
                box-shadow: 0 30px 60px -15px rgba(59, 130, 246, 0.6) !important;
            }
            
            /* PANEL ORTA VƏZİYYƏT (CENTERED/EXPANDED) - Alternativ */
            .wave-nav-container.centered {
                position: relative !important;
                width: 90% !important;
                max-width: 1200px !important;
                margin: 30px auto 50px auto !important;
                border-radius: 60px !important;
                background: linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899) !important;
                background-size: 200% 200% !important;
                animation: gradientShift 3s ease infinite, bounceIn 0.6s ease !important;
                transform: scale(1.05) !important;
                box-shadow: 0 30px 50px -15px rgba(59, 130, 246, 0.6) !important;
                border: 3px solid rgba(255, 255, 255, 0.3) !important;
            }
            
            .wave-nav-container.centered .wave-nav-items {
                justify-content: center;
                padding: 20px 0;
            }
            
            .wave-nav-container.centered .wave-item {
                transform: scale(1);
                min-width: 140px;
            }
            
            .wave-nav-container.centered .wave-item:hover {
                transform: scale(1.15) translateY(-8px);
                background: rgba(255, 255, 255, 0.3);
            }
            
            .wave-nav-container.centered .wave-icon {
                width: 70px;
                height: 70px;
                font-size: 30px;
                background: rgba(255, 255, 255, 0.25);
                border: 2px solid white;
            }
            
            .wave-nav-container.centered .wave-title {
                font-size: 14px;
                font-weight: 600;
            }
            
            .wave-nav-container.centered .wave-count {
                font-size: 22px;
                padding: 4px 12px;
                background: white;
                color: #3b82f6;
            }
            
            /* MINİMİZED VƏZİYYƏT (SAĞ ÜST) */
            .wave-nav-container.minimized {
                position: fixed !important;
                top: 20px !important;
                right: 20px !important;
                left: auto !important;
                width: auto !important;
                min-width: 80px;
                max-width: 120px;
                padding: 12px !important;
                border-radius: 50px !important;
                background: white !important;
                box-shadow: 0 15px 40px rgba(59, 130, 246, 0.25) !important;
                z-index: 1000 !important;
                margin: 0 !important;
                cursor: pointer;
                border: 2px solid #3b82f6;
                animation: slideInRight 0.4s ease;
            }
            
            .wave-nav-container.minimized .wave-nav-content {
                display: none;
            }
            
            .wave-nav-container.minimized::before {
                content: "📋";
                font-size: 32px;
                display: block;
                text-align: center;
                line-height: 1;
            }
            
            .wave-nav-container.minimized::after {
                content: "Task Paneli";
                font-size: 12px;
                color: #3b82f6;
                display: block;
                text-align: center;
                margin-top: 5px;
                font-weight: 600;
            }
            
            .wave-nav-container.minimized:hover {
                transform: scale(1.1);
                background: linear-gradient(135deg, #3b82f6, #8b5cf6);
                border-color: white;
            }
            
            .wave-nav-container.minimized:hover::before {
                color: white;
            }
            
            .wave-nav-container.minimized:hover::after {
                color: white;
            }
            
            /* BÖLMƏ ANİMASİYALARI */
            .table-card.active-section {
                animation: fadeInScale 0.5s ease;
            }
            
            @keyframes fullscreenGradient {
                0% { background-position: 0% 0%; }
                25% { background-position: 100% 0%; }
                50% { background-position: 100% 100%; }
                75% { background-position: 0% 100%; }
                100% { background-position: 0% 0%; }
            }
            
            @keyframes contentPulse {
                0% { transform: scale(1.5); }
                50% { transform: scale(1.55); }
                100% { transform: scale(1.5); }
            }
            
            @keyframes itemFloat {
                0% { transform: scale(1.2) translateY(0); }
                50% { transform: scale(1.2) translateY(-15px); }
                100% { transform: scale(1.2) translateY(0); }
            }
            
            @keyframes iconSpin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            
            @keyframes fadeInScale {
                0% {
                    opacity: 0;
                    transform: scale(0.95);
                }
                100% {
                    opacity: 1;
                    transform: scale(1);
                }
            }
            
            @keyframes bounceIn {
                0% {
                    opacity: 0;
                    transform: scale(0.3);
                }
                50% {
                    opacity: 1;
                    transform: scale(1.1);
                }
                70% {
                    transform: scale(0.95);
                }
                100% {
                    transform: scale(1.05);
                }
            }
            
            @keyframes gradientShift {
                0% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
                100% { background-position: 0% 50%; }
            }
            
            @keyframes slideInRight {
                from {
                    opacity: 0;
                    transform: translateX(100px);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            
            @keyframes slideDown {
                from {
                    opacity: 0;
                    transform: translateY(-50px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            /* FADE-IN ANİMASİYASI */
            .fade-in {
                animation: fadeIn 0.4s ease;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            /* RESPONSİV DÜZƏLİŞLƏR */
            @media (max-width: 768px) {
                .wave-nav-container.fullscreen .wave-nav-content {
                    transform: scale(1.2);
                }
                
                .wave-nav-container.fullscreen .wave-item {
                    margin: 10px;
                }
                
                .wave-nav-container.fullscreen .wave-icon {
                    width: 70px;
                    height: 70px;
                    font-size: 35px;
                }
                
                .wave-nav-container.centered {
                    width: 95% !important;
                    border-radius: 40px !important;
                }
                
                .wave-nav-container.centered .wave-item {
                    min-width: 100px;
                }
                
                .wave-nav-container.centered .wave-icon {
                    width: 50px;
                    height: 50px;
                    font-size: 22px;
                }
            }
            
            @media (max-width: 480px) {
                .wave-nav-container.fullscreen .wave-nav-items {
                    grid-template-columns: repeat(2, 1fr);
                }
                
                .wave-nav-container.fullscreen .wave-icon {
                    width: 60px;
                    height: 60px;
                    font-size: 28px;
                }
                
                .wave-nav-container.centered .wave-nav-items {
                    grid-template-columns: repeat(2, 1fr);
                }
                
                .wave-nav-container.minimized {
                    min-width: 60px;
                    padding: 8px !important;
                }
                
                .wave-nav-container.minimized::before {
                    font-size: 24px;
                }
                
                .wave-nav-container.minimized::after {
                    font-size: 10px;
                }
            }
        `;

        document.head.appendChild(styleElement);
        console.log('🎨 Naviqasiya stilləri əlavə edildi (Fullscreen versiya)');
    },

    // Task Manager script-lərini yüklə
    loadTaskManagerScripts: function(callback) {
        console.log('📚 TaskManagerLoader: Script-lər yüklənir...');

        const scripts = [
            '../assets/js/task_js/dashboardRedirect.js',
            '../assets/js/task_js/soundManager.js',
            '../assets/js/task_js/apiService.js',
            '../assets/js/task_js/authService.js',
            '../assets/js/task_js/cacheService.js',
            '../assets/js/task_js/columnResizer.js',
            '../assets/js/task_js/formatters.js',
            '../assets/js/task_js/excelExport.js',
            '../assets/js/task_js/buttonManager.js',
            '../assets/js/task_js/validators.js',
            '../assets/js/task_js/notification.js',
            '../assets/js/task_js/formManager.js',
            '../assets/js/task_js/audioRecorder.js',
            '../assets/js/task_js/fileUpload.js',
            '../assets/js/task_js/modalManager.js',
            '../assets/js/task_js/tableManager.js',
            '../assets/js/task_js/taskEditModul.js',
            '../assets/js/task_js/websocketManager.js',
            '../assets/js/task_js/task.js'
        ];

        let loadedCount = 0;
        const totalScripts = scripts.length;

        if (totalScripts === 0) {
            if (callback) callback();
            return;
        }

        scripts.forEach(src => {
            if (document.querySelector(`script[src="${src}"]`)) {
                loadedCount++;
                if (loadedCount === totalScripts) {
                    console.log('✅ TaskManagerLoader: Bütün script-lər artıq yüklənib');
                    if (callback) callback();
                }
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.async = false;

            script.onload = () => {
                loadedCount++;
                console.log(`✅ Script yükləndi (${loadedCount}/${totalScripts}): ${src.split('/').pop()}`);

                if (loadedCount === totalScripts) {
                    console.log('✅ TaskManagerLoader: Bütün script-lər yükləndi');
                    if (callback) callback();
                }
            };

            script.onerror = (error) => {
                console.error(`❌ Script yüklənmədi: ${src}`, error);
                loadedCount++;

                if (loadedCount === totalScripts) {
                    console.warn('⚠️ TaskManagerLoader: Bəzi script-lər yüklənmədi, amma davam edirik');
                    if (callback) callback();
                }
            };

            document.body.appendChild(script);
        });
    },

    // Task Manager-i initialize et
    initializeTaskManager: function(callback) {
        console.log('🚀 TaskManagerLoader: Task Manager initialize edilir...');

        try {
            if (!window.taskManager) {
                console.log('📦 TaskManagerLoader: Yeni TaskManager instance yaradılır...');

                if (typeof TaskManager === 'function') {
                    window.taskManager = new TaskManager();
                } else {
                    console.error('❌ TaskManagerLoader: TaskManager class-ı tapılmadı!');

                    // Alternativ: Manual olaraq load et
                    this.manualInitialize();
                    return;
                }
            }

            if (window.taskManager && typeof window.taskManager.initialize === 'function') {
                window.taskManager.initialize()
                    .then(() => {
                        console.log('✅ TaskManagerLoader: Task Manager uğurla başladıldı');

                        setTimeout(() => {
                            if (typeof window.initializeColumnResizers === 'function') {
                                window.initializeColumnResizers();
                            }
                        }, 500);

                        if (callback) callback(true);
                    })
                    .catch(error => {
                        console.error('❌ TaskManagerLoader: Task Manager başlatma xətası:', error);
                        this.manualInitialize();
                        if (callback) callback(false);
                    });
            } else {
                console.warn('⚠️ TaskManagerLoader: TaskManager.initialize metodu tapılmadı');
                this.manualInitialize();
                if (callback) callback(false);
            }

        } catch (error) {
            console.error('❌ TaskManagerLoader: İnitialization xətası:', error);
            this.manualInitialize();
            if (callback) callback(false);
        }
    },

    // Manual initialize
    manualInitialize: function() {
        console.log('🔧 Manual initialization başladı...');

        // Count elementlərini yenilə
        const countElements = {
            new: document.getElementById('countNew'),
            active: document.getElementById('countActive'),
            external: document.getElementById('countExternal'),
            partner: document.getElementById('countPartner'),
            report: document.getElementById('countReport'),
            archive: document.getElementById('countArchive')
        };

        if (countElements.new) countElements.new.textContent = '24';
        if (countElements.active) countElements.active.textContent = '12';
        if (countElements.external) countElements.external.textContent = '8';
        if (countElements.partner) countElements.partner.textContent = '6';
        if (countElements.report) countElements.report.textContent = '15';
        if (countElements.archive) countElements.archive.textContent = '42';

        console.log('✅ Manual initialization tamamlandı');
    },

    // CSS fayllarını yüklə
    loadTaskManagerStyles: function() {
        const version = '1.0.1';
        const taskStyles = [
            '../assets/css/task_css/task.css',
            '../assets/css/task_css/edit_module.css',
            '../assets/css/task_css/buttonManager.css',
            '../assets/css/task_css/modals.css',
            '../assets/css/task_css/main.css',
            '../assets/css/task_css/quickNav.css',
            '../assets/css/task_css/new_task_design.css',
            '../assets/css/task_css/raport.css',
            '../assets/css/task_css/partnerTaskEditModule.css',
            '../assets/css/task_css/load_buttons_task_list.css',
            '../assets/css/task_css/task_details_modal.css',
            '../assets/css/task_css/task_finance_redesign.css',
            '../assets/css/task_css/report/userReportModal.css',
            '../assets/css/task_css/report/enhancedModals.css'
        ];

        taskStyles.forEach(href => {
            const normalizedHref = `${href}?v=${version}`;
            const alreadyLoaded = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).some(link =>
                (link.getAttribute('href') || '').split('?')[0] === href
            );

            if (!alreadyLoaded) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = normalizedHref;
                document.head.appendChild(link);
                console.log(`✅ TaskManagerLoader: CSS yükləndi: ${normalizedHref}`);
            }
        });
    },

    // Xəta göstər
    showError: function(container, message) {
        if (!container) {
            container = document.getElementById('taskManagerSection');
        }

        if (!container) return;

        container.innerHTML = `
            <div class="flex items-center justify-center h-64">
                <div class="text-center text-error-red">
                    <i class="fa-solid fa-exclamation-circle text-5xl mb-4"></i>
                    <h3 class="text-xl font-semibold mb-2">Task Manager yüklənə bilmədi</h3>
                    <p class="text-gray-500">${message || 'Zəhmət olmasa səhifəni yeniləyin'}</p>
                    <button onclick="location.reload()" class="mt-4 px-6 py-2 bg-brand-blue text-white rounded-xl hover:bg-blue-600">
                        <i class="fa-solid fa-rotate-right mr-2"></i>Yenilə
                    </button>
                </div>
            </div>
        `;
    },

    // Fallback content
    loadFallbackContent: function(container, callback) {
        console.log('⚠️ Fallback content yüklənir...');

        container.innerHTML = `
            <div class="task-manager-fallback p-6">
                <div class="wave-nav-container" id="waveNav">
                    <div class="wave-nav-content">
                        <div class="wave-nav-items">
                            <div class="wave-item" data-target="new">
                                <div class="wave-item-content">
                                    <div class="wave-icon"><i class="fas fa-plus-circle"></i></div>
                                    <span class="wave-title">Yeni</span><span class="wave-description">Yeni tapşırıq yaradın</span>
                                    <span class="wave-count" id="countNew">24</span>
                                </div>
                            </div>
                            <div class="wave-item active-item" data-target="active">
                                <div class="wave-item-content">
                                    <div class="wave-icon"><i class="fas fa-tasks"></i></div>
                                    <span class="wave-title">Daxili</span><span class="wave-description">Daxili tapşırıqlar</span>
                                    <span class="wave-count" id="countActive">12</span>
                                </div>
                            </div>
                            <div class="wave-item" data-target="external">
                                <div class="wave-item-content">
                                    <div class="wave-icon"><i class="fas fa-building"></i></div>
                                    <span class="wave-title">Şirkət</span><span class="wave-description">Şirkət tapşırıqları</span>
                                    <span class="wave-count" id="countExternal">8</span>
                                </div>
                            </div>
                            <div class="wave-item" data-target="partner">
                                <div class="wave-item-content">
                                    <div class="wave-icon"><i class="fas fa-handshake"></i></div>
                                    <span class="wave-title">Partnyor</span><span class="wave-description">Partnyor tapşırıqları</span>
                                    <span class="wave-count" id="countPartner">6</span>
                                </div>
                            </div>
                            <div class="wave-item" data-target="report">
                                <div class="wave-item-content">
                                    <div class="wave-icon"><i class="fas fa-chart-bar"></i></div>
                                    <span class="wave-title">Hesabat</span><span class="wave-description">Hesabatlar və statistikalar</span>
                                    <span class="wave-count" id="countReport">15</span>
                                </div>
                            </div>
                            <div class="wave-item" data-target="archive">
                                <div class="wave-item-content">
                                    <div class="wave-icon"><i class="fas fa-archive"></i></div>
                                    <span class="wave-title">Arxiv</span><span class="wave-description">Arxivləşdirilmiş tapşırıqlar</span>
                                    <span class="wave-count" id="countArchive">42</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="p-8 text-center">
                    <h3 class="text-xl font-semibold text-gray-700">Task Manager Fallback Rejimdə İşləyir</h3>
                    <p class="text-gray-500 mt-2">Bəzi funksiyalar məhdud ola bilər</p>
                </div>
            </div>
        `;

        this.addNavigationStyles();
        this.enhanceNavigation();

        if (callback) callback(true);
    },

    // Task Manager bölməsini təmizlə
    cleanup: function() {
        const taskSection = document.getElementById('taskManagerSection');
        if (taskSection) {
            taskSection.innerHTML = '';
        }

        const navStyles = document.getElementById('task-manager-nav-styles');
        if (navStyles) navStyles.remove();
    }
};

// Global olaraq istifadə üçün
window.TaskManagerLoader = TaskManagerLoader;