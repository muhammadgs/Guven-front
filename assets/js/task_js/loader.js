// loader.js - Bütün JavaScript fayllarını yükləyən əsas loader
(function() {
    // Cədvəl yüklənməsinin qarşısını almaq üçün
    if (window.taskLoaderLoaded) return;
    window.taskLoaderLoaded = true;

    console.log('📦 Loader başladıldı...');

    const v = Date.now();

    // Core services - əvvəlcə bunlar yüklənməlidir
    const scripts = [
        '../assets/js/task_js/api_service/apiService.js',
        '../assets/js/task_js/api_service/authService.js',
        '../assets/js/task_js/notification.js',

        // Managers
        '../assets/js/task_js/soundManager.js',
        '../assets/js/task_js/formManager.js',
        '../assets/js/task_js/modalManager.js',
        '../assets/js/task_js/tableManager.js',
        '../assets/js/task_js/company_task/taskEditModul.js',

        // Row creators
        '../assets/js/task_js/company_task/activeRowCreator.js',
        '../assets/js/task_js/external_company/externalRowCreator.js',

        // PARTNER FAYLLARI
        '../assets/js/task_js/partner_task/partnerRowCreator.js',
        '../assets/js/task_js/partner_task/partnerTableManager.js',
        '../assets/js/task_js/partner_task/partnerTaskEditModule.js',

        // Digər fayllar
        '../assets/js/task_js/task_creater/createTask.js',
        '../assets/js/task_js/raport/report.js',

        // Utilities
        '../assets/js/task_js/dashboardRedirect.js',
        '../assets/js/task_js/ui_ux/columnResizer.js',
        '../assets/js/task_js/formatters.js',
        '../assets/js/task_js/excelExport.js',
        '../assets/js/task_js/buttonManager.js',
        '../assets/js/task_js/validators.js',
        '../assets/js/task_js/audio_recorder/audioRecorder.js',
        '../assets/js/task_js/file_manager/fileUpload.js',
        '../assets/js/task_js/circularNav.js',

        // Main task manager - ƏN SONDA!
        '../assets/js/task_js/task.js'
    ];

    // Scriptləri ardıcıl yükləmə funksiyası
    function loadScriptsSequentially(scripts, index = 0) {
        if (index >= scripts.length) {
            console.log('✅ Bütün scriptlər uğurla yükləndi!');

            // Yüklənmə tamamlandı event-i
            document.dispatchEvent(new CustomEvent('allScriptsLoaded'));
            return;
        }

        const script = document.createElement('script');
        script.src = scripts[index] + '?v=' + v;
        script.async = false; // Ardıcıl yükləmə üçün

        script.onload = function() {
            console.log(`✅ Yükləndi (${index + 1}/${scripts.length}): ${scripts[index]}`);
            loadScriptsSequentially(scripts, index + 1);
        };

        script.onerror = function() {
            console.error(`❌ Yüklənmədi: ${scripts[index]}`);
            // Xəta olsa belə davam et
            loadScriptsSequentially(scripts, index + 1);
        };

        document.head.appendChild(script);
    }

    // Yüklənməyə başla
    loadScriptsSequentially(scripts);

    // CSS fayllarını da yükləyək
    function loadStyles() {
        const styles = [
            'task.css',
            'edit_module.css',
            'buttonManager.css',
            'main.css',
            'quickNav.css',
            'raport.css',
            'partnerTaskEditModule.css',
            'task_details_modal.css'
        ];

        styles.forEach(style => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = `../assets/css/task_css/${style}?v=${v}`;
            document.head.appendChild(link);
        });

        console.log('📁 CSS faylları yükləndi!');
    }

    // CSS-ləri yüklə
    loadStyles();
})();