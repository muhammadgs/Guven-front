// ==================== PROJECTS.JS ====================
// ProjectApiService ilə işləyir
// alembic/admin_js/projects.js

console.log('🚀 projects.js başladı');

let projectsData = [];
let currentProjectId = null;

// Helper funksiyalar
function showSuccess(msg) { console.log('✅', msg); alert('✅ ' + msg); }
function showError(msg) { console.error('❌', msg); alert('❌ ' + msg); }
function showWarning(msg) { console.warn('⚠️', msg); alert('⚠️ ' + msg); }

// ============ LAYİHƏLƏRİ YÜKLƏ ============
window.loadProjects = async function() {
    console.log('🔄 Layihələr yüklənir...');

    try {
        const result = await window.ProjectApiService.loadProjects(1, 50);

        console.log('📦 API cavabı:', result); // DEBUG ÜÇÜN

        // ✅ ƏSAS DÜZƏLİŞ: projects array deyilsə, boş array et
        let projects = [];

        if (result && result.data) {
            projects = Array.isArray(result.data) ? result.data : [];
        } else if (result && Array.isArray(result)) {
            projects = result;
        }

        console.log(`📊 ${projects.length} layihə tapıldı`);

        projectsData = projects.map(p => ({
            id: p.id,
            name: p.name || 'Adsız',
            mediaType: p.media_type || 'image',
            mediaUrl: p.media_url || '',
            description: p.description || '',
            fullDescription: p.full_description || '',
            category: p.category || '',
            client: p.client_name || p.client || '',
            startDate: p.start_date || '',
            endDate: p.expected_end_date || p.end_date || '',
            order: p.order || 1,
            active: p.status === 'active' || p.status === 'in_progress' || p.status === 'completed'
        }));

        renderProjectsTable();
        updateProjectPreview();

        localStorage.setItem('guvenfinans-projects', JSON.stringify(projectsData));
        console.log(`✅ ${projectsData.length} layihə yükləndi`);

    } catch (error) {
        console.error('❌ Yükləmə xətası:', error);
        showError('Layihələr yüklənmədi: ' + error.message);
        loadProjectsFromLocalStorage();
    }
};

// ============ LOKAL STORAGE ============
function loadProjectsFromLocalStorage() {
    const saved = localStorage.getItem('guvenfinans-projects');
    if (saved) {
        try {
            projectsData = JSON.parse(saved);
            renderProjectsTable();
            updateProjectPreview();
            showWarning('Lokal yaddaşdan yükləndi');
        } catch (e) {
            projectsData = [];
        }
    } else {
        projectsData = [];
        renderProjectsTable();
        updateProjectPreview();
    }
}

// ============ CƏDVƏL ============
function renderProjectsTable() {
    const tbody = document.getElementById('projectsListBody');
    if (!tbody) return;

    if (projectsData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Heç bir layihə tapılmadı</td></tr>';
        return;
    }

    let html = '';
    projectsData.sort((a, b) => (a.order || 999) - (b.order || 999)).forEach((p, i) => {
        html += `<tr data-project-id="${p.id}">
            <td>${i+1}</td>
            <td><strong>${p.name}</strong></td>
            <td>
                <span class="badge ${p.mediaType === 'image' ? 'badge-primary' : 'badge-danger'}">
                    ${p.mediaType}
                </span>
            </td>
            <td>${p.description?.substring(0, 50) || ''}...</td>
            <td>${p.order || 1}</td>
            <td>
                <span class="badge ${p.active ? 'badge-success' : 'badge-secondary'}">
                    ${p.active ? 'Aktiv' : 'Deaktiv'}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editProject(${p.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteProject(${p.id})">
                    <i class="fas fa-trash"></i>
                </button>
                <button class="btn btn-sm btn-warning" onclick="toggleProjectActive(${p.id})">
                    <i class="fas fa-power-off"></i>
                </button>
            </td>
        </tr>`;
    });

    tbody.innerHTML = html;
    console.log('✅ Cədvəl render edildi');
}

// ============ PREVIEW ============
function updateProjectPreview(project = null) {
    const preview = document.getElementById('projectPreview');
    if (!preview) return;

    if (!project) {
        preview.innerHTML = '<div style="padding:40px;text-align:center;">Layihə seçin</div>';
        return;
    }

    preview.innerHTML = `<h4>${project.name}</h4>
                        <p>${project.description || ''}</p>
                        <p>Status: ${project.active ? 'Aktiv' : 'Deaktiv'}</p>`;
}

// ============ MODAL AÇ ============
window.showAddProjectModal = function() {
    currentProjectId = null;

    document.getElementById('projectId').value = '';
    document.getElementById('projectName').value = '';
    document.getElementById('projectDescription').value = '';
    document.getElementById('projectFullDescription').value = '';
    document.getElementById('projectCategory').value = '';
    document.getElementById('projectClient').value = '';
    document.getElementById('projectMediaType').value = 'image';
    document.getElementById('projectImage').value = '';
    document.getElementById('projectVideo').value = '';
    document.getElementById('projectYoutube').value = '';
    document.getElementById('projectStartDate').value = '';
    document.getElementById('projectEndDate').value = '';
    document.getElementById('projectOrder').value = projectsData.length > 0 ?
        Math.max(...projectsData.map(p => p.order || 1)) + 1 : 1;
    document.getElementById('projectIsActive').checked = true;
    document.getElementById('mediaPreviewContainer').style.display = 'none';

    toggleMediaInput();

    const modal = document.getElementById('projectModal');
    if (modal) modal.classList.remove('hidden');
};

// ============ MEDIA INPUT ============
window.toggleMediaInput = function() {
    const type = document.getElementById('projectMediaType')?.value;
    if (!type) return;

    document.getElementById('imageInputGroup')?.classList.toggle('hidden', type !== 'image');
    document.getElementById('videoInputGroup')?.classList.toggle('hidden', type !== 'video');
    document.getElementById('youtubeInputGroup')?.classList.toggle('hidden', type !== 'youtube');
};

// ============ MEDIA PREVIEW ============

function updateMediaPreview() {
    const type = document.getElementById('projectMediaType')?.value;
    let url = '';

    if (type === 'image') url = document.getElementById('projectImage')?.value;
    else if (type === 'video') url = document.getElementById('projectVideo')?.value;
    else url = document.getElementById('projectYoutube')?.value;

    const container = document.getElementById('mediaPreviewContainer');
    const preview = document.getElementById('mediaPreview');

    if (!url || !container || !preview) return;

    let html = '';
    if (type === 'image') {
        html = `<img src="${url}" style="max-width:100%;max-height:200px;border-radius:8px;">`;
    } else if (type === 'video') {
        html = `<video controls style="max-width:100%;max-height:200px;border-radius:8px;">
                   <source src="${url}">
                </video>`;
    } else {
        html = `<iframe width="100%" height="200" src="https://www.youtube.com/embed/${url}" 
                        frameborder="0" style="border-radius:8px;"></iframe>`;
    }

    preview.innerHTML = html;
    container.style.display = 'block';
}

// ============ FAYL YÜKLƏ - SADƏCƏ LOKAL PREVIEW ============
window.showFileUploadModal = function(mediaType) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = mediaType === 'image' ? 'image/*' : 'video/*';

    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;

        // ✅ SADƏCƏ LOKAL PREVIEW
        const blobUrl = URL.createObjectURL(file);

        if (mediaType === 'image') {
            document.getElementById('projectImage').value = blobUrl;
        } else {
            document.getElementById('projectVideo').value = blobUrl;
        }

        updateMediaPreview();

        // ✅ Faylı yadda saxla
        window.pendingFile = {
            file: file,
            mediaType: mediaType,
            blobUrl: blobUrl
        };

        showSuccess('Fayl seçildi! "Yadda saxla" düyməsi ilə yükləyin.');
    };

    input.click();
};

// ============ YADDA SAXLA + FAYL YÜKLƏ + PROJECT YARAT ============
// ============ YADDA SAXLA + FAYL YÜKLƏ + PROJECT YARAT ============
window.saveProject = async function() {
    const id = document.getElementById('projectId').value;
    const name = document.getElementById('projectName').value.trim();
    const mediaType = document.getElementById('projectMediaType').value;
    const description = document.getElementById('projectDescription').value.trim();
    const fullDescription = document.getElementById('projectFullDescription').value.trim();
    const category = document.getElementById('projectCategory').value.trim();
    const client = document.getElementById('projectClient').value.trim();
    const startDate = document.getElementById('projectStartDate').value;
    const endDate = document.getElementById('projectEndDate').value;
    const active = document.getElementById('projectIsActive').checked;

    // Validation
    if (!name) { showError('Ad daxil edin!'); return; }
    if (!description) { showError('Açıqlama daxil edin!'); return; }

    try {
        showSuccess('🚀 Əməliyyat başladı...');

        let finalMediaUrl = null;
        let uploadedFileUuid = null;

        // ✅ 1. ƏGƏR FAYL SEÇİLİBƏ - ƏVVƏLCƏ SERVERƏ YÜKLƏ!
        if (window.pendingFile && window.pendingFile.file) {
            console.log('📤 Fayl serverə yüklənir:', window.pendingFile.file.name);

            const file = window.pendingFile.file;
            const fileMediaType = window.pendingFile.mediaType;
            const category = fileMediaType === 'image' ? 'project_image' : 'company_video';

            // FormData yarat
            const formData = new FormData();
            formData.append('file', file);
            formData.append('category', category);

            // ✅ Birbaşa /simple-upload endpoint-ə yüklə
            const uploadResponse = await fetch('/proxy.php/api/v1/files/simple-upload', {
                method: 'POST',
                body: formData,
                credentials: 'include',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
            });

            if (!uploadResponse.ok) {
                throw new Error(`Upload failed: ${uploadResponse.status}`);
            }

            const uploadResult = await uploadResponse.json();
            console.log('✅ Server cavabı:', uploadResult);

            if (uploadResult && uploadResult.url) {
                finalMediaUrl = uploadResult.url;

                // URL-dən UUID-ni çıxart
                const match = finalMediaUrl.match(/\/files\/([a-f0-9-]+)\/download/);
                if (match) uploadedFileUuid = match[1];

                console.log('✅ Fayl serverə yükləndi:', finalMediaUrl);

                // Blob URL-i təmizlə
                if (window.pendingFile.blobUrl) {
                    URL.revokeObjectURL(window.pendingFile.blobUrl);
                }

                window.pendingFile = null;
            } else {
                throw new Error('Upload cavabında URL yoxdur');
            }
        } else {
            // ✅ Əgər fayl seçilməyibsə, input-dan URL-i götür
            if (mediaType === 'image') {
                finalMediaUrl = document.getElementById('projectImage').value.trim();
            } else if (mediaType === 'video') {
                finalMediaUrl = document.getElementById('projectVideo').value.trim();
            } else {
                finalMediaUrl = document.getElementById('projectYoutube').value.trim();
            }
        }

        // Media yoxlaması
        if (!finalMediaUrl && mediaType !== 'youtube') {
            showError('Media faylı yüklənmədi!');
            return;
        }

        // ✅ 2. PROJECT DATA - DÜZGÜN FORMAT
        const projectData = {
            name: name,
            description: description,
            full_description: fullDescription || null,
            media_type: mediaType,
            media_url: finalMediaUrl || null,
            cover_image_url: mediaType === 'image' ? finalMediaUrl : null,
            category: category || null,
            tags: [],
            technologies: [],
            status: active ? 'active' : 'inactive',  // ✅ status active/inactive
            priority: 'medium',
            progress: 0,
            is_active: active,  // ✅ boolean true/false, string deyil!
            start_date: startDate || null,
            expected_end_date: endDate || null,
            client_name: client || null
        };

        console.log('📦 Göndərilən məlumat:', projectData);

        // ✅ 3. PROJECT YARAT VƏ YA YENİLƏ
        if (id) {
            await window.ProjectApiService.updateProject(parseInt(id), projectData);
            showSuccess('✅ Layihə yeniləndi!');
        } else {
            await window.ProjectApiService.createProject(projectData);
            showSuccess('✅ Layihə yaradıldı!');
        }

        // ✅ 4. SƏHİFƏNİ YENİLƏ
        await window.loadProjects();

        // ✅ 5. MODALI BAĞLA
        const modal = document.getElementById('projectModal');
        if (modal) modal.classList.add('hidden');

    } catch (error) {
        console.error('❌ Xəta:', error);

        // ❌ XƏTA OLDU - ƏGƏR FAYL YÜKLƏNMİŞDİSƏ, SİL!
        if (uploadedFileUuid && window.ProjectApiService?.deleteFile) {
            try {
                await window.ProjectApiService.deleteFile(uploadedFileUuid);
                console.log('✅ Yarımçıq fayl silindi:', uploadedFileUuid);
            } catch (deleteError) {
                console.error('❌ Fayl silinə bilmədi:', deleteError);
            }
        }

        showError('Xəta: ' + (error.message || 'Bilinməyən xəta'));
    }
};
// ============ LAYİHƏ REDAKTƏ ============
window.editProject = function(id) {
    console.log('✏️ Layihə redaktə edilir:', id);

    const project = projectsData.find(p => p.id == id);
    if (!project) {
        showError('Layihə tapılmadı!');
        return;
    }

    currentProjectId = id;

    // Formu doldur
    document.getElementById('projectId').value = project.id || '';
    document.getElementById('projectName').value = project.name || '';
    document.getElementById('projectDescription').value = project.description || '';
    document.getElementById('projectFullDescription').value = project.fullDescription || '';
    document.getElementById('projectCategory').value = project.category || '';
    document.getElementById('projectClient').value = project.client || '';
    document.getElementById('projectMediaType').value = project.mediaType || 'image';
    document.getElementById('projectStartDate').value = project.startDate || '';
    document.getElementById('projectEndDate').value = project.endDate || '';
    document.getElementById('projectOrder').value = project.order || 1;
    document.getElementById('projectIsActive').checked = project.active === true;

    // ✅ URL-LƏRİ DÜZGÜN FORMATLA
    let displayUrl = project.mediaUrl || '';

    // UUID-dirsə, proxy URL yarat
    if (displayUrl && displayUrl.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        displayUrl = `/proxy.php/api/v1/files/${displayUrl}/download`;
    }
    // /api/ ilə başlayırsa, proxy əlavə et
    else if (displayUrl && displayUrl.startsWith('/api/')) {
        displayUrl = '/proxy.php' + displayUrl;
    }
    // artıq proxy varsa, olduğu kimi saxla
    else if (displayUrl && displayUrl.startsWith('/proxy.php')) {
        // olduğu kimi saxla
    }

    // Media URL-ləri doldur
    if (project.mediaType === 'image') {
        document.getElementById('projectImage').value = displayUrl;
        document.getElementById('projectVideo').value = '';
        document.getElementById('projectYoutube').value = '';
    } else if (project.mediaType === 'video') {
        document.getElementById('projectImage').value = '';
        document.getElementById('projectVideo').value = displayUrl;
        document.getElementById('projectYoutube').value = '';
    } else if (project.mediaType === 'youtube') {
        document.getElementById('projectImage').value = '';
        document.getElementById('projectVideo').value = '';

        // YouTube ID-ni çıxart
        let youtubeId = project.mediaUrl || '';
        if (youtubeId.includes('youtube.com') || youtubeId.includes('youtu.be')) {
            const match = youtubeId.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
            if (match) youtubeId = match[1];
        }
        document.getElementById('projectYoutube').value = youtubeId;
        displayUrl = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
    }

    // Media inputlarını tənzimlə
    toggleMediaInput();

    // ✅ PREVIEW-I GÖSTER - BURASI ƏHƏMİYYƏTLİ!
    setTimeout(() => {
        updateMediaPreview();

        // Şəkil varsa, preview container-i göstər
        if (displayUrl && project.mediaType !== 'youtube') {
            const container = document.getElementById('mediaPreviewContainer');
            const preview = document.getElementById('mediaPreview');

            if (container && preview) {
                let html = '';
                if (project.mediaType === 'image') {
                    html = `<img src="${displayUrl}" style="max-width:100%;max-height:200px;border-radius:8px;"
                            onerror="this.onerror=null; this.src='https://via.placeholder.com/300x200?text=Şəkil+yüklənmədi';">`;
                } else if (project.mediaType === 'video') {
                    html = `<video controls style="max-width:100%;max-height:200px;border-radius:8px;">
                               <source src="${displayUrl}">
                            </video>`;
                }
                preview.innerHTML = html;
                container.style.display = 'block';
            }
        }
    }, 200);

    // Modalı aç
    const modal = document.getElementById('projectModal');
    if (modal) modal.classList.remove('hidden');
};

// ============ YADDA SAXLA + FAYL YÜKLƏ + PROJECT YARAT ============
window.saveProject = async function() {
    const id = document.getElementById('projectId').value;
    const name = document.getElementById('projectName').value.trim();
    const mediaType = document.getElementById('projectMediaType').value;
    const description = document.getElementById('projectDescription').value.trim();
    const fullDescription = document.getElementById('projectFullDescription').value.trim();
    const category = document.getElementById('projectCategory').value.trim();
    const client = document.getElementById('projectClient').value.trim();
    const startDate = document.getElementById('projectStartDate').value;
    const endDate = document.getElementById('projectEndDate').value;
    const active = document.getElementById('projectIsActive').checked;

    // Validation
    if (!name) { showError('Ad daxil edin!'); return; }
    if (!description) { showError('Açıqlama daxil edin!'); return; }

    try {
        showSuccess('🚀 Əməliyyat başladı...');

        let finalMediaUrl = null;
        let uploadedFileUuid = null;

        // ✅ 1. ƏGƏR FAYL SEÇİLİBƏ - ƏVVƏLCƏ SERVERƏ YÜKLƏ!
        if (window.pendingFile && window.pendingFile.file) {
            console.log('📤 Fayl serverə yüklənir:', window.pendingFile.file.name);

            const file = window.pendingFile.file;
            const fileMediaType = window.pendingFile.mediaType;
            const category = fileMediaType === 'image' ? 'project_image' : 'company_video';

            // ✅ BURADA - ProjectApiService.uploadProjectFile ÇAĞIR!
            const uploadResult = await window.ProjectApiService.uploadProjectFile(file, category);

            console.log('✅ Server cavabı:', uploadResult);

            // Cavab strukturunu yoxla
            if (uploadResult && uploadResult.url) {
                finalMediaUrl = uploadResult.url;
                const match = finalMediaUrl.match(/\/files\/([a-f0-9-]+)\/download/);
                if (match) uploadedFileUuid = match[1];
            }
            else if (uploadResult && uploadResult.data && uploadResult.data.url) {
                finalMediaUrl = uploadResult.data.url;
                const match = finalMediaUrl.match(/\/files\/([a-f0-9-]+)\/download/);
                if (match) uploadedFileUuid = match[1];
            }
            else {
                console.error('❌ Gözlənilməz cavab formatı:', uploadResult);
                throw new Error('Upload cavabında URL yoxdur');
            }

            console.log('✅ Fayl serverə yükləndi, URL:', finalMediaUrl);

            // Input-u yenilə
            if (fileMediaType === 'image') {
                document.getElementById('projectImage').value = finalMediaUrl;
            } else {
                document.getElementById('projectVideo').value = finalMediaUrl;
            }

            // Preview-i yenilə
            updateMediaPreview();

            // Blob URL-i təmizlə
            if (window.pendingFile.blobUrl) {
                URL.revokeObjectURL(window.pendingFile.blobUrl);
            }

            window.pendingFile = null;
        } else {
            // ✅ Əgər fayl seçilməyibsə, input-dan URL-i götür
            if (mediaType === 'image') {
                finalMediaUrl = document.getElementById('projectImage').value.trim();
            } else if (mediaType === 'video') {
                finalMediaUrl = document.getElementById('projectVideo').value.trim();
            } else {
                finalMediaUrl = document.getElementById('projectYoutube').value.trim();
            }

            // BLOB URL yoxla
            if (finalMediaUrl && finalMediaUrl.startsWith('blob:')) {
                showError('Fayl serverə yüklənməyib! Əvvəlcə fayl seçin, sonra "Yadda saxla" düyməsini basın.');
                return;
            }
        }

        // Media yoxlaması
        if (!finalMediaUrl && mediaType !== 'youtube') {
            showError('Media faylı yüklənmədi!');
            return;
        }

        // ✅ 2. PROJECT DATA
        const projectData = {
            name: name,
            description: description,
            full_description: fullDescription || null,
            media_type: mediaType,
            media_url: finalMediaUrl || null,
            cover_image_url: mediaType === 'image' ? finalMediaUrl : null,
            category: category || null,
            tags: [],
            technologies: [],
            status: active ? 'active' : 'inactive',
            priority: 'medium',  // 'normal' DEYİL!
            progress: 0,
            start_date: startDate || null,
            expected_end_date: endDate || null,
            client_name: client || null
        };

        console.log('📦 Göndərilən məlumat:', projectData);

        // ✅ 3. PROJECT YARAT
        if (id) {
            await window.ProjectApiService.updateProject(parseInt(id), projectData);
            showSuccess('✅ Layihə yeniləndi!');
        } else {
            await window.ProjectApiService.createProject(projectData);
            showSuccess('✅ Layihə yaradıldı!');
        }

        // ✅ 4. SƏHİFƏNİ YENİLƏ
        await window.loadProjects();

        // ✅ 5. MODALI BAĞLA
        const modal = document.getElementById('projectModal');
        if (modal) modal.classList.add('hidden');

    } catch (error) {
        console.error('❌ Xəta:', error);

        // ❌ XƏTA OLDU - ƏGƏR FAYL YÜKLƏNMİŞDİSƏ, SİL!
        if (uploadedFileUuid && window.ProjectApiService?.deleteFile) {
            try {
                await window.ProjectApiService.deleteFile(uploadedFileUuid);
                console.log('✅ Yarımçıq fayl silindi:', uploadedFileUuid);
            } catch (deleteError) {
                console.error('❌ Fayl silinə bilmədi:', deleteError);
            }
        }

        showError('Xəta: ' + (error.message || 'Bilinməyən xəta'));
    }
};

// ============ SİL ============
window.deleteProject = async function(id) {
    if (!confirm('Əminsiniz?')) return;

    try {
        await window.ProjectApiService.deleteProject(id);
        await window.loadProjects();
        showSuccess('Silindi!');
    } catch (error) {
        showError('Silinmədi: ' + error.message);
    }
};

// ============ STATUS DƏYİŞ ============
window.toggleProjectActive = async function(id) {
    try {
        await window.ProjectApiService.toggleProjectActive(id);
        await window.loadProjects();
        showSuccess('Status dəyişdirildi!');
    } catch (error) {
        showError('Xəta: ' + error.message);
    }
};

// ============ MODAL BAĞLA ============
window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('hidden');

    // Modal bağlananda pending faylı təmizlə
    if (modalId === 'projectModal') {
        if (window.pendingFile && window.pendingFile.blobUrl) {
            URL.revokeObjectURL(window.pendingFile.blobUrl);
        }
        window.pendingFile = null;
    }
};


// ============ INIT ============
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM yükləndi - projects.js');

    document.getElementById('projectMediaType')?.addEventListener('change', toggleMediaInput);
    ['projectImage', 'projectVideo', 'projectYoutube'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', updateMediaPreview);
    });

    // ✅ YENİ VERSİYA - ProjectApiService-i gözlə
    async function initializeProjects() {
        console.log('⏳ ProjectApiService gözlənilir...');

        // 5 saniyə ərzində hər 100ms-də yoxla
        for (let i = 0; i < 50; i++) {
            if (window.ProjectApiService) {
                console.log('✅ ProjectApiService tapıldı!');
                try {
                    await window.loadProjects();
                } catch (error) {
                    console.error('❌ Layihələr yüklənərkən xəta:', error);
                    loadProjectsFromLocalStorage();
                }
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Hələ də tapılmadısa
        console.error('❌ ProjectApiService tapılmadı!');
        showError('API xidməti yüklənməyib!');
        loadProjectsFromLocalStorage();
    }

    // Başlat
    initializeProjects();
});

console.log('✅ projects.js hazırdır');