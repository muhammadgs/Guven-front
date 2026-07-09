// =============================================
// PROJECT MODAL JS - Layihə modal funksionallığı
// Tarix: 13 Fevral 2026 - DÜZƏLDİLMİŞ VERSİYA
// =============================================
// alembic/main.page/project-modal.js
(function() {
    'use strict';

    console.log('🎯 Project Modal JS yükləndi');

    // ==================== MODAL YARAT ====================
    function createProjectModal() {
        if (document.getElementById('projectDetailModal')) return;

        const modalHTML = `
            <!-- Layihə Detail Modalı -->
            <div id="projectDetailModal" class="gti-modal hidden">
                <div class="gti-modal-overlay"></div>
                <div class="gti-modal-container gti-modal-lg">
                    <div class="gti-modal-header">
                        <h3 class="gti-modal-title" id="modalProjectTitle">Layihə detalları</h3>
                        <button class="gti-modal-close" onclick="window.closeProjectDetailModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="gti-modal-body" id="modalProjectBody">
                        <div class="gti-modal-loading">
                            <div class="gti-spinner"></div>
                            <p>Yüklənir...</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Video Modalı -->
            <div id="videoModal" class="gti-modal hidden">
                <div class="gti-modal-overlay"></div>
                <div class="gti-modal-container gti-modal-video">
                    <div class="gti-modal-header">
                        <h3 class="gti-modal-title" id="videoModalTitle">Video</h3>
                        <button class="gti-modal-close" onclick="window.closeVideoModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="gti-modal-body" id="videoModalBody">
                        <div class="gti-video-wrapper">
                            <video id="gtiModalVideoPlayer" controls>
                                <source src="" type="video/mp4">
                            </video>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = modalHTML;

        while (tempDiv.firstChild) {
            document.body.appendChild(tempDiv.firstChild);
        }

        console.log('✅ Modal HTML yaradıldı');
    }

    // ==================== EVENT HANDLERLAR ====================
    window.setupProjectClickEvents = function() {
        console.log('🖱️ Layihə click event-ləri quraşdırılır...');

        const projectItems = document.querySelectorAll('.project-item');
        console.log(`📊 Tapılan layihə sayı: ${projectItems.length}`);

        if (projectItems.length === 0) {
            console.log('⏳ Layihələr hələ yüklənməyib, 2 saniyə sonra təkrar yoxlanacaq');

            // ✅ Sonsuz döngünü önləmək üçün maksimum 5 dəfə yoxla
            if (!window._retryCount) window._retryCount = 0;
            window._retryCount++;

            if (window._retryCount < 5) {
                setTimeout(window.setupProjectClickEvents, 2000);
            } else {
                console.log('⚠️ Maksimum yoxlama sayına çatıldı, daha yoxlanmır');
                window._retryCount = 0;
            }
            return;
        }

        // ✅ Layihələr tapıldı, retry count-ı sıfırla
        window._retryCount = 0;

        projectItems.forEach(item => {
            // Köhnə event listener-i təmizlə
            item.removeEventListener('click', handleProjectClick);
            // Yeni event listener əlavə et
            item.addEventListener('click', handleProjectClick);

            // Video play düyməsi
            const videoBtn = item.querySelector('.video-play-btn, .video-play-btn-overlay, .gti-play-btn');
            if (videoBtn) {
                videoBtn.removeEventListener('click', handleVideoClick);
                videoBtn.addEventListener('click', handleVideoClick);
            }

            // YouTube play düyməsi
            const youtubeBtn = item.querySelector('.youtube-play-btn, .youtube-play-btn-overlay, .gti-youtube-btn');
            if (youtubeBtn) {
                youtubeBtn.removeEventListener('click', handleYouTubeClick);
                youtubeBtn.addEventListener('click', handleYouTubeClick);
            }
        });

        console.log(`✅ ${projectItems.length} layihəyə event əlavə edildi`);
    };

    function handleProjectClick(e) {
        if (e.target.closest('.video-play-btn') ||
            e.target.closest('.video-play-btn-overlay') ||
            e.target.closest('.gti-play-btn') ||
            e.target.closest('.youtube-play-btn') ||
            e.target.closest('.youtube-play-btn-overlay') ||
            e.target.closest('.gti-youtube-btn')) {
            return;
        }

        const projectItem = e.currentTarget;
        const projectId = projectItem.dataset.projectId;

        if (projectId) {
            openProjectDetailModal(projectId);
        }
    }

    function handleVideoClick(e) {
        e.stopPropagation();
        e.preventDefault();

        const btn = e.currentTarget;
        const projectItem = btn.closest('.project-item');

        if (!projectItem) return;

        let videoUrl = '';
        const videoContainer = projectItem.querySelector('.project-video-container');

        if (videoContainer && videoContainer.dataset.videoUrl) {
            videoUrl = videoContainer.dataset.videoUrl;
        } else {
            const projectId = projectItem.dataset.projectId;
            if (projectId) {
                const projects = JSON.parse(localStorage.getItem('guvenfinans-projects') || '[]');
                const project = projects.find(p => p.id == projectId);
                if (project && project.mediaUrl) {
                    videoUrl = project.mediaUrl;
                }
            }
        }

        const projectTitle = projectItem.querySelector('.project-title')?.textContent || 'Video';

        if (videoUrl) {
            openVideoModal(videoUrl, projectTitle);
        }
    }

    function handleYouTubeClick(e) {
        e.stopPropagation();
        e.preventDefault();

        const btn = e.currentTarget;
        const projectItem = btn.closest('.project-item');

        if (!projectItem) return;

        let youtubeId = '';
        const youtubeContainer = projectItem.querySelector('.project-youtube-container');

        if (youtubeContainer && youtubeContainer.dataset.youtubeId) {
            youtubeId = youtubeContainer.dataset.youtubeId;
        } else {
            const projectId = projectItem.dataset.projectId;
            if (projectId) {
                const projects = JSON.parse(localStorage.getItem('guvenfinans-projects') || '[]');
                const project = projects.find(p => p.id == projectId);
                if (project && project.mediaUrl) {
                    youtubeId = project.mediaUrl;

                    if (youtubeId.includes('youtube.com') || youtubeId.includes('youtu.be')) {
                        const match = youtubeId.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
                        if (match) youtubeId = match[1];
                    }
                }
            }
        }

        const projectTitle = projectItem.querySelector('.project-title')?.textContent || 'Video';

        if (youtubeId) {
            openYouTubeModal(youtubeId, projectTitle);
        }
    }

    // ==================== MODAL AÇMA ====================
    window.openProjectDetailModal = function(projectId) {
        console.log(`📂 Layihə açılır: ${projectId}`);

        const projects = JSON.parse(localStorage.getItem('guvenfinans-projects') || '[]');
        const project = projects.find(p => p.id == projectId);

        if (!project) {
            console.error('❌ Layihə tapılmadı:', projectId);
            alert('Layihə tapılmadı!');
            return;
        }

        if (!document.getElementById('projectDetailModal')) {
            createProjectModal();
        }

        const modal = document.getElementById('projectDetailModal');
        const titleEl = document.getElementById('modalProjectTitle');
        const bodyEl = document.getElementById('modalProjectBody');

        if (!modal || !titleEl || !bodyEl) return;

        titleEl.textContent = project.name;

        bodyEl.innerHTML = `
            <div class="gti-modal-loading">
                <div class="gti-spinner"></div>
                <p>Layihə məlumatları yüklənir...</p>
            </div>
        `;

        modal.classList.remove('hidden');

        setTimeout(() => {
            const detailHTML = generateProjectDetailHTML(project);
            bodyEl.innerHTML = detailHTML;
        }, 500);
    };

    function generateProjectDetailHTML(project) {
        let mediaUrl = project.mediaUrl || '';

        // ✅ DÜZGÜN URL YARATMA - ƏSAS DÜZƏLİŞ BURADA!
        let finalMediaUrl = mediaUrl;

        // UUID formatında id (əgər birbaşa UUID gəlibsə)
        if (mediaUrl && mediaUrl.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            finalMediaUrl = `/proxy.php/api/v1/files/${mediaUrl}/download`;
        }
        // /api/ ilə başlayan (ən düzgün format budur - databazada belə saxlanılır)
        else if (mediaUrl && mediaUrl.startsWith('/api/')) {
            finalMediaUrl = '/proxy.php' + mediaUrl;
        }
        // artıq proxy var və düzgün formatdadır
        else if (mediaUrl && mediaUrl.startsWith('/proxy.php/api/')) {
            finalMediaUrl = mediaUrl; // olduğu kimi saxla
        }
        // proxy var amma səhv formatda (təkrarlanan və ya ?url= ilə)
        else if (mediaUrl && mediaUrl.includes('/proxy.php') && mediaUrl.includes('?url=')) {
            // İçindən əsl URL-i çıxart
            const urlMatch = mediaUrl.match(/url=([^&]+)/);
            if (urlMatch && urlMatch[1]) {
                const decodedUrl = decodeURIComponent(urlMatch[1]);
                if (decodedUrl.startsWith('/api/')) {
                    finalMediaUrl = '/proxy.php' + decodedUrl;
                } else {
                    finalMediaUrl = decodedUrl;
                }
            } else {
                finalMediaUrl = '/proxy.php/api/v1/files/' + (project.id || '') + '/download';
            }
        }
        // http ilə başlayan (xarici URL)
        else if (mediaUrl && mediaUrl.startsWith('http')) {
            finalMediaUrl = mediaUrl; // olduğu kimi saxla
        }
        // heç bir şey uyğun gəlmədisə, default yarat
        else if (project.id) {
            finalMediaUrl = `/proxy.php/api/v1/files/${project.id}/download`;
        }

        // Media HTML yarat
        let mediaHtml = '';

        if (project.mediaType === 'image') {
            mediaHtml = `
                <div style="position:relative; width:100%; min-height:300px; background:#f8f9fa; display:flex; align-items:center; justify-content:center; border-radius:12px; overflow:hidden;">
                    <img src="${finalMediaUrl}" 
                         alt="${project.name}" 
                         loading="lazy" 
                         style="width:100%; max-height:500px; object-fit:cover; border-radius:12px;"
                         onerror="this.onerror=null; this.style.display='none'; this.parentNode.innerHTML='<div style=\'padding:40px; text-align:center; color:#666;\'><i class=\'fas fa-image\' style=\'font-size:48px; margin-bottom:15px; opacity:0.5;\'></i><br>Şəkil yüklənmədi<br><small style=\'color:#999;\'>${finalMediaUrl.substring(0,50)}...</small></div>';">
                </div>
            `;
        }
        else if (project.mediaType === 'video') {
            mediaHtml = `
                <div style="position:relative; width:100%; background:#000; border-radius:12px; overflow:hidden;">
                    <video controls style="width:100%; max-height:500px; border-radius:12px;" 
                           onerror="this.style.display='none'; this.parentNode.innerHTML='<div style=\'padding:40px; text-align:center; color:#666; background:#f8f9fa; border-radius:12px;\'><i class=\'fas fa-video\' style=\'font-size:48px; margin-bottom:15px; opacity:0.5;\'></i><br>Video yüklənmədi</div>';">
                        <source src="${finalMediaUrl}" type="video/mp4">
                    </video>
                </div>
            `;
        }
        else if (project.mediaType === 'youtube' && project.mediaUrl) {
            let youtubeId = project.mediaUrl;
            // YouTube ID-ni çıxart
            if (youtubeId.includes('youtube.com') || youtubeId.includes('youtu.be')) {
                const match = youtubeId.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
                if (match) youtubeId = match[1];
            }
            mediaHtml = `
                <div style="position:relative; width:100%; background:#000; border-radius:12px; overflow:hidden;">
                    <iframe width="100%" height="400" src="https://www.youtube.com/embed/${youtubeId}?autoplay=0" 
                            frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; 
                            gyroscope; picture-in-picture" allowfullscreen style="border-radius:12px;"></iframe>
                </div>
            `;
        } else {
            mediaHtml = `
                <div style="height:300px; background:linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%); 
                            display:flex; flex-direction:column; align-items:center; justify-content:center; 
                            border-radius:12px; color:#6c757d;">
                    <i class="fas fa-image" style="font-size:48px; margin-bottom:15px; opacity:0.5;"></i>
                    <p>Şəkil yoxdur</p>
                    <small style="color:#adb5bd;">${project.name}</small>
                </div>
            `;
        }

        // Meta məlumatlar
        const metaItems = [];
        if (project.category) {
            metaItems.push(`
                <div style="background:#f8f9fa; padding:12px; border-radius:8px;">
                    <strong>Kateqoriya:</strong> ${project.category}
                </div>
            `);
        }
        if (project.client) {
            metaItems.push(`
                <div style="background:#f8f9fa; padding:12px; border-radius:8px;">
                    <strong>Müştəri:</strong> ${project.client}
                </div>
            `);
        }
        if (project.startDate) {
            metaItems.push(`
                <div style="background:#f8f9fa; padding:12px; border-radius:8px;">
                    <strong>Başlama:</strong> ${new Date(project.startDate).toLocaleDateString('az-AZ')}
                </div>
            `);
        }
        if (project.endDate) {
            metaItems.push(`
                <div style="background:#f8f9fa; padding:12px; border-radius:8px;">
                    <strong>Bitmə:</strong> ${new Date(project.endDate).toLocaleDateString('az-AZ')}
                </div>
            `);
        }
        if (project.status) {
            const statusMap = {
                'active': '<span style="color:#28a745;">● Aktiv</span>',
                'completed': '<span style="color:#17a2b8;">● Tamamlandı</span>',
                'inactive': '<span style="color:#dc3545;">● Deaktiv</span>'
            };
            metaItems.push(`
                <div style="background:#f8f9fa; padding:12px; border-radius:8px;">
                    <strong>Status:</strong> ${statusMap[project.status] || project.status}
                </div>
            `);
        }

        return `
            <div style="display:flex; flex-direction:column; gap:24px;">
                <!-- MEDIA -->
                <div style="border-radius:12px; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,0.1);">
                    ${mediaHtml}
                </div>
                
                <!-- MƏLUMAT -->
                <div style="background:white; padding:30px; border-radius:12px; box-shadow:0 5px 20px rgba(0,0,0,0.05);">
                    <h3 style="margin-top:0; margin-bottom:15px; color:#2c3e50; font-size:24px;">${project.name}</h3>
                    
                    <!-- AÇIQLAMA -->
                    <div style="margin-bottom:25px;">
                        <p style="line-height:1.8; color:#34495e; margin-bottom:10px;">${project.fullDescription || project.description || 'Ətraflı məlumat yoxdur'}</p>
                    </div>
                    
                    <!-- META -->
                    ${metaItems.length > 0 ? `
                        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px,1fr)); gap:15px; margin-top:20px; border-top:1px solid #e9ecef; padding-top:25px;">
                            ${metaItems.join('')}
                        </div>
                    ` : ''}
                    
                    <!-- DEBUG (silə bilərsiniz) -->
                    <div style="margin-top:20px; font-size:11px; color:#999; border-top:1px dashed #dee2e6; padding-top:10px;">
                        <small>Media URL: ${finalMediaUrl.substring(0,100)}${finalMediaUrl.length > 100 ? '...' : ''}</small>
                    </div>
                </div>
            </div>
        `;
    }

    window.openVideoModal = function(videoUrl, title) {
        if (!document.getElementById('videoModal')) {
            createProjectModal();
        }

        const modal = document.getElementById('videoModal');
        const titleEl = document.getElementById('videoModalTitle');
        const bodyEl = document.getElementById('videoModalBody');

        if (!modal || !titleEl || !bodyEl) return;

        titleEl.textContent = title || 'Video';

        let finalUrl = videoUrl;
        if (videoUrl.includes('/files/') || videoUrl.includes('/download')) {
            if (!videoUrl.startsWith('http')) {
                videoUrl = 'https://vps.guvenfinans.az' + videoUrl;
            }
            finalUrl = '/proxy.php?url=' + encodeURIComponent(videoUrl);
        }

        bodyEl.innerHTML = `
            <div class="gti-video-wrapper">
                <video id="gtiModalVideoPlayer" controls autoplay style="width:100%; border-radius:12px;">
                    <source src="${finalUrl}" type="video/mp4">
                </video>
            </div>
        `;

        modal.classList.remove('hidden');
    };

    window.openYouTubeModal = function(youtubeId, title) {
        if (!document.getElementById('videoModal')) {
            createProjectModal();
        }

        const modal = document.getElementById('videoModal');
        const titleEl = document.getElementById('videoModalTitle');
        const bodyEl = document.getElementById('videoModalBody');

        if (!modal || !titleEl || !bodyEl) return;

        titleEl.textContent = title || 'Video';

        bodyEl.innerHTML = `
            <div class="gti-video-wrapper">
                <iframe width="100%" height="100%" src="https://www.youtube.com/embed/${youtubeId}?autoplay=1" 
                        frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; 
                        gyroscope; picture-in-picture" allowfullscreen></iframe>
            </div>
        `;

        modal.classList.remove('hidden');
    };

    // ==================== MODAL BAĞLAMA ====================
    window.closeProjectDetailModal = function() {
        const modal = document.getElementById('projectDetailModal');
        if (modal) modal.classList.add('hidden');
    };

    window.closeVideoModal = function() {
        const modal = document.getElementById('videoModal');
        if (modal) {
            modal.classList.add('hidden');

            const video = document.getElementById('gtiModalVideoPlayer');
            if (video) {
                video.pause();
                video.currentTime = 0;
            }
        }
    };

    // ==================== GLOBAL EVENT LİSTENERLAR ====================
    function setupGlobalEvents() {
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('gti-modal-overlay')) {
                window.closeProjectDetailModal();
                window.closeVideoModal();
            }
        });

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                window.closeProjectDetailModal();
                window.closeVideoModal();
            }
        });
    }

    // ==================== İNİT ====================
    function init() {
        console.log('🚀 Project Modal init başladı...');
        createProjectModal();
        setupGlobalEvents();

        // 1 saniyə gözlə və event-ləri quraşdır
        setTimeout(() => {
            window.setupProjectClickEvents();
        }, 1000);

        // Hər 2 saniyədə yoxla (dinamik məzmun üçün)
        setInterval(() => {
            window.setupProjectClickEvents();
        }, 2000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

console.log('✅ project-modal.js tam yükləndi');