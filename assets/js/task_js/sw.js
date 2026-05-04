// sw.js - Service Worker
const CACHE_NAME = 'task-manager-v2';

// Statik fayllar - səhifə yükləndikdə dərhal lazım olanlar
const STATIC_ASSETS = [
    '/',  // kök səhifə
    '/task.html',  // HTML faylınızın adı (əgər fərqlidirsə dəyişin)

    // CSS faylları
    '/assets/css/task_css/task.css',
    '/assets/css/task_css/edit_module.css',
    '/assets/css/task_css/buttonManager.css',
    '/assets/css/task_css/main.css',
    '/assets/css/task_css/quickNav.css',
    '/assets/css/task_css/new_task_design.css',
    '/assets/css/task_css/raport.css',
    '/assets/css/task_css/partnerTaskEditModule.css',
    '/assets/css/task_css/load_buttons_task_list.css',
    '/assets/css/task_css/task_details_modal.css',

    // Core JS fayllar - ƏN ƏVVƏL YÜKLƏNƏN
    '/assets/js/task_js/dbManager.js',
    '/assets/js/task_js/api_service/apiService.js',
    '/assets/js/task_js/soundManager.js',
    '/assets/js/task_js/formManager.js',
    '/assets/js/task_js/tableManager.js',
    '/assets/js/task_js/company_task/taskEditModul.js',
    '/assets/js/task_js/company_task/activeRowCreator.js',
    '/assets/js/task_js/ui_ux/load_buttons.js',
    '/assets/js/task_js/external_company/externalRowCreator.js',
    '/assets/js/task_js/external_company/externalTableManager.js',
    '/assets/js/task_js/external_company/taskEditExternal.js',
    '/assets/js/task_js/partner_task/partnerRowCreator.js',
    '/assets/js/task_js/partner_task/partnerTableManager.js',
    '/assets/js/task_js/partner_task/partnerTaskEditModule.js',
    '/assets/js/task_js/task_creater/createTask.js',
    '/assets/js/task_js/raport/report.js',
    '/assets/js/task_js/dashboardRedirect.js',
    '/assets/js/task_js/ui_ux/column-filter.js',
    '/assets/js/task_js/ui_ux/new_task_design.js',
    '/assets/js/task_js/formatters.js',
    '/assets/js/task_js/excelExport.js',
    '/assets/js/task_js/buttonManager.js',
    '/assets/js/task_js/validators.js',
    '/assets/js/task_js/audio_recorder/audioRecorder.js',
    '/assets/js/task_js/file_manager/fileUpload.js',
    '/assets/js/task_js/circularNav.js',
    '/assets/js/task_js/archive/archiveTasks.js',
    '/assets/js/task_js/archive/archiveTableManager.js',
    '/assets/js/task_js/archive/external_task_archive.js',
    '/assets/js/task_js/archive/partner_task_archive.js',

    // Main task manager - ƏN SOND
    '/assets/js/task_js/task.js'
];
// Install event - xətalara dözümlü
self.addEventListener('install', event => {
    console.log('🔄 Service Worker install olunur...');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('📦 Statik fayllar cache-lənir...');
                // Hər bir faylı ayrı-ayrılıqda cache-lə, xəta olsa belə davam et
                return Promise.allSettled(
                    STATIC_ASSETS.map(asset =>
                        cache.add(asset).catch(err => {
                            console.warn(`⚠️ ${asset} cache-lənə bilmədi:`, err);
                        })
                    )
                );
            })
            .then(() => {
                console.log('✅ Service Worker install edildi');
                return self.skipWaiting();
            })
    );
});

// Activate event
self.addEventListener('activate', event => {
    console.log('⚡ Service Worker aktivləşir...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log(`🗑️ Köhnə cache silinir: ${cacheName}`);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('✅ Service Worker aktivləşdi');
            return self.clients.claim();
        })
    );
});

// Fetch event - Network First strategy
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // API çağırışlarını cache-ləmə
    if (url.pathname.includes('/api/') || url.pathname.includes('/proxy.php')) {
        event.respondWith(fetch(event.request));
        return;
    }

    // Statik fayllar üçün Cache-first strategy
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    console.log(`📦 Cache-dən: ${url.pathname}`);
                    return cachedResponse;
                }

                console.log(`🌐 Network-dan: ${url.pathname}`);
                return fetch(event.request)
                    .then(response => {
                        // Yalnız uğurlu response-ları cache-lə
                        if (response && response.status === 200 && response.type === 'basic') {
                            const responseToCache = response.clone();
                            caches.open(CACHE_NAME)
                                .then(cache => {
                                    cache.put(event.request, responseToCache).catch(err => {
                                        console.warn(`⚠️ ${url.pathname} cache-lənə bilmədi:`, err);
                                    });
                                });
                        }
                        return response;
                    });
            })
    );
});