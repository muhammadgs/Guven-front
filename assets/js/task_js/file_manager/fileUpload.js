// fileUpload.js
// Fayl yükləmə və idarəetmə modulu - apiService.js ilə uyğunlaşdırılmış

const FileUploadManager = {
    // ==================== PROPERTIES ====================
    files: [],
    currentTaskId: null,
    currentTableType: null,
    maxFileSize: 100 * 1024 * 1024, // 100MB
    allowedTypes: [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'audio/webm', 'audio/mp3', 'audio/wav', 'audio/ogg',
        'video/mp4', 'video/webm',
        'application/zip', 'application/x-zip-compressed',
        'text/plain'
    ],

    // ==================== INITIALIZATION ====================
    initialize: function() {
        console.log('📁 FileUploadManager initialize edilir...');

        // Event listener-lər qur
        this.setupEventListeners();

        // Clipboard paste-i aktiv et
        this.initClipboardPaste();

        // PrtScn capture-i aktiv et
        this.initPrintScreenCapture();

        console.log('✅ FileUploadManager hazırdır');
        return this;
    },

    setupEventListeners: function() {
        // File drop zone
        const fileDropZone = document.getElementById('fileDropZone');
        if (fileDropZone) {
            // ===== ƏGƏR ARTIQ EVENT LİSTENER VARSA, TƏMİZLƏ =====
            const newDropZone = fileDropZone.cloneNode(true);
            fileDropZone.parentNode.replaceChild(newDropZone, fileDropZone);

            newDropZone.addEventListener('click', () => {
                document.getElementById('taskAttachment')?.click();
            });

            newDropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                newDropZone.classList.add('drag-over');
            });

            newDropZone.addEventListener('dragleave', () => {
                newDropZone.classList.remove('drag-over');
            });

            newDropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation(); // ===== YENİ =====
                newDropZone.classList.remove('drag-over');

                if (e.dataTransfer.files.length > 0) {
                    this.handleFiles(e.dataTransfer.files);
                }
            });
        }

        // File input
        const fileInput = document.getElementById('taskAttachment');
        if (fileInput) {
            // ===== ƏGƏR ARTIQ EVENT LİSTENER VARSA, TƏMİZLƏ =====
            const newFileInput = fileInput.cloneNode(true);
            fileInput.parentNode.replaceChild(newFileInput, fileInput);

            newFileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.handleFiles(e.target.files);
                }
                // ===== YENİ: Input-u təmizlə ki, eyni fayl seçilsə belə event işləsin =====
                e.target.value = '';
            });
        }

        console.log('🔌 FileUploadManager event listeners quruldu');
    },

    // ==================== SHOW TASK FILES (ÇOXLU FAYL ÜÇÜN MODAL) ====================
    /**
     * Task-ın bütün fayllarını modalda göstərir
     * @param {number} taskId - Task ID
     */
    showTaskFiles: async function(taskId) {
        try {
            console.log(`📁 FileUploadManager.showTaskFiles çağırıldı: ${taskId}`);

            // Task məlumatlarını al
            const response = await makeApiRequest(`/tasks/${taskId}`, 'GET', null, true);

            if (response.error) {
                console.error('❌ Task tapılmadı:', response.error);
                this.showError('Task tapılmadı');
                return;
            }

            const task = response.data || response;

            // Faylları topla
            let attachments = [];

            // 1. attachments arrayini yoxla
            if (task.attachments) {
                try {
                    attachments = Array.isArray(task.attachments)
                        ? task.attachments
                        : JSON.parse(task.attachments);
                    console.log(`📎 Attachments-dən ${attachments.length} fayl tapıldı`);
                } catch(e) {
                    console.warn('Attachments parse xətası:', e);
                }
            }

            // 2. file_uuids yoxla (əgər attachments boşdursa)
            if (attachments.length === 0 && task.file_uuids) {
                let uuids = [];

                if (typeof task.file_uuids === 'string') {
                    let cleanStr = task.file_uuids
                        .replace(/^\{/, '')
                        .replace(/\}$/, '')
                        .trim();

                    if (cleanStr) {
                        uuids = cleanStr.split(',').map(u =>
                            u.trim().replace(/^"(.*)"$/, '$1')
                        ).filter(u => u.length === 36 && u.includes('-'));
                    }
                } else if (Array.isArray(task.file_uuids)) {
                    uuids = task.file_uuids;
                }

                console.log(`📎 file_uuids-dən ${uuids.length} UUID tapıldı`);

                if (uuids.length > 0) {
                    attachments = uuids.map(uuid => ({
                        file_id: uuid,
                        uuid: uuid,
                        id: uuid,
                        filename: `fayl_${uuid.substring(0, 8)}`,
                        original_filename: `Fayl ${uuid.substring(0, 8)}`,
                        mime_type: ''
                    }));
                }
            }

            if (attachments.length === 0) {
                this.showInfo('Bu taskda heç bir fayl yoxdur');
                return;
            }

            // Modal yarat
            this.createTaskFilesModal(taskId, task.task_title || 'Task', attachments);

        } catch (error) {
            console.error('❌ Fayllar göstərilərkən xəta:', error);
            this.showError('Xəta: ' + error.message);
        }
    },

    /**
     * Task faylları üçün modal yaradır
     */
    createTaskFilesModal: function(taskId, taskTitle, files) {
        // Köhnə modalı sil
        const oldModal = document.getElementById('taskFilesModal');
        if (oldModal) oldModal.remove();

        let filesHtml = '';

        files.forEach((file, index) => {
            const fileId = file.file_id || file.uuid || file.id;
            const fileName = file.original_filename || file.filename || `Fayl ${index + 1}`;

            // Fayl ikonasını təyin et
            let icon = '<i class="fas fa-file" style="color:#64748b; font-size:20px;"></i>';
            const fileNameLower = fileName.toLowerCase();

            if (fileNameLower.includes('.mp3') || fileNameLower.includes('.wav') ||
                fileNameLower.includes('audio') || fileNameLower.includes('səs') ||
                file.is_audio_recording) {
                icon = '<i class="fas fa-microphone" style="color:#3b82f6; font-size:20px;"></i>';
            } else if (fileNameLower.includes('.xlsx') || fileNameLower.includes('.xls')) {
                icon = '<i class="fas fa-file-excel" style="color:#10b981; font-size:20px;"></i>';
            } else if (fileNameLower.includes('.pdf')) {
                icon = '<i class="fas fa-file-pdf" style="color:#ef4444; font-size:20px;"></i>';
            } else if (fileNameLower.includes('.jpg') || fileNameLower.includes('.jpeg') ||
                       fileNameLower.includes('.png') || fileNameLower.includes('.gif')) {
                icon = '<i class="fas fa-image" style="color:#3b82f6; font-size:20px;"></i>';
            } else if (fileNameLower.includes('.mp4') || fileNameLower.includes('.webm')) {
                icon = '<i class="fas fa-video" style="color:#ef4444; font-size:20px;"></i>';
            }

            const isAudio = file.is_audio_recording ||
                           (file.mime_type && file.mime_type.startsWith('audio/')) ||
                           fileNameLower.includes('.mp3') || fileNameLower.includes('.wav');

            filesHtml += `
                <div class="file-item" style="display:flex;align-items:center;justify-content:space-between;padding:12px;border-bottom:1px solid #e2e8f0;">
                    <div style="display:flex;align-items:center;gap:12px;">
                        ${icon}
                        <div>
                            <div style="font-weight:500;color:#1e293b;">${this.escapeHtml(fileName)}</div>
                            ${file.size ? `<div style="font-size:11px;color:#94a3b8;">${this.formatFileSize(file.size)}</div>` : ''}
                        </div>
                    </div>
                    <div style="display:flex;gap:8px;">
                        <button class="task-file-preview-btn" data-file-id="${fileId}" data-filename="${fileName}" data-mime="${file.mime_type || ''}" data-audio="${isAudio}" 
                            style="background:#3b82f6;border:none;color:white;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px;">
                            <i class="fas fa-eye"></i> Önizlə
                        </button>
                        <button class="task-file-download-btn" data-file-id="${fileId}" data-filename="${fileName}"
                            style="background:#10b981;border:none;color:white;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px;">
                            <i class="fas fa-download"></i> Yüklə
                        </button>
                    </div>
                </div>
            `;
        });

        const modalHTML = `
            <div id="taskFilesModal" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:100000;">
                <div style="background:white;border-radius:16px;width:90%;max-width:550px;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1);">
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid #e2e8f0;">
                        <h3 style="margin:0;font-size:18px;color:#0f172a;">
                            <i class="fas fa-paperclip"></i> Fayllar - ${this.escapeHtml(taskTitle)}
                        </h3>
                        <button onclick="FileUploadManager.closeModal('taskFilesModal')" style="background:none;border:none;font-size:24px;cursor:pointer;color:#94a3b8;">&times;</button>
                    </div>
                    <div style="flex:1;overflow-y:auto;padding:8px 0;">
                        ${filesHtml}
                    </div>
                    <div style="padding:12px 20px;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;">
                        <button onclick="FileUploadManager.closeModal('taskFilesModal')" style="background:#64748b;border:none;color:white;padding:8px 16px;border-radius:8px;cursor:pointer;">
                            Bağla
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Event listener əlavə et
        setTimeout(() => {
            document.querySelectorAll('.task-file-preview-btn').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    const fileId = btn.dataset.fileId;
                    const filename = btn.dataset.filename;
                    const mimeType = btn.dataset.mime;
                    const isAudio = btn.dataset.audio === 'true';
                    this.previewFile(fileId, filename, mimeType, isAudio);
                };
            });

            document.querySelectorAll('.task-file-download-btn').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    const fileId = btn.dataset.fileId;
                    const filename = btn.dataset.filename;
                    this.downloadFile(fileId, filename);
                };
            });
        }, 50);
    },

    handleFiles: function(fileList) {
        console.log(`📥 ${fileList.length} fayl seçildi`);

        Array.from(fileList).forEach(file => {
            // Fayl validasiyası
            const validation = this.validateFile(file);
            if (!validation.valid) {
                this.showError(`${file.name}: ${validation.message}`);
                return;
            }

            // ===== GÜCLÜ DUPLICATE YOXLAMASI =====
            const isDuplicate = this.files.some(existingFile =>
                existingFile.name === file.name &&
                existingFile.size === file.size &&
                existingFile.lastModified === file.lastModified
            );

            if (isDuplicate) {
                console.log(`⚠️ Fayl artıq mövcuddur: ${file.name}`);
                this.showInfo(`"${file.name}" artıq əlavə edilib`);
                return; // DUPLICATE - ƏLAVƏ ETMƏ
            }

            // Faylı siyahıya əlavə et
            this.files.push(file);
            console.log(`✅ Fayl əlavə edildi: ${file.name} (${this.formatFileSize(file.size)})`);
        });

        // File list-i yenilə
        this.updateFileList();
    },

    validateFile: function(file) {
        // Ölçü yoxlaması
        if (file.size > this.maxFileSize) {
            return {
                valid: false,
                message: `Fayl ölçüsü çox böyükdür (maks: ${this.formatFileSize(this.maxFileSize)})`
            };
        }

        // Tip yoxlaması
        if (!this.allowedTypes.includes(file.type) && !this.isAllowedExtension(file.name)) {
            return {
                valid: false,
                message: 'Bu fayl tipi dəstəklənmir'
            };
        }

        return { valid: true };
    },

    isAllowedExtension: function(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const allowedExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx',
                            'xls', 'xlsx', 'mp3', 'wav', 'ogg', 'mp4', 'webm', 'zip', 'txt'];
        return allowedExts.includes(ext);
    },

    removeFile: function(index) {
        if (index >= 0 && index < this.files.length) {
            const fileName = this.files[index].name;
            this.files.splice(index, 1);
            console.log(`🗑️ Fayl silindi: ${fileName}`);
            this.updateFileList();
        }
    },

    clearFiles: function() {
        this.files = [];
        this.currentTaskId = null;
        this.currentTableType = null;

        // File list-i təmizlə
        const fileList = document.getElementById('fileList');
        if (fileList) {
            fileList.innerHTML = '';
        }

        // File input-u təmizlə
        const fileInput = document.getElementById('taskAttachment');
        if (fileInput) {
            fileInput.value = '';
        }

        console.log('🧹 Bütün fayllar təmizləndi');
    },

    updateFileList: function() {
        const fileList = document.getElementById('fileList');
        if (!fileList) return;

        if (this.files.length === 0) {
            fileList.innerHTML = '';
            return;
        }

        let html = '<div class="file-list-header">Seçilmiş fayllar:</div>';

        this.files.forEach((file, index) => {
            const icon = this.getFileIcon(file);
            const size = this.formatFileSize(file.size);

            html += `
                <div class="file-item" data-index="${index}">
                    <div class="file-icon">
                        <i class="${icon.icon}" style="color: ${icon.color};"></i>
                    </div>
                    <div class="file-info">
                        <div class="file-name">${this.escapeHtml(file.name)}</div>
                        <div class="file-meta">
                            <span class="file-size">${size}</span>
                            <span class="file-type">${file.type || 'Bilinmir'}</span>
                        </div>
                    </div>
                    <button class="file-remove-btn" onclick="FileUploadManager.removeFile(${index})" title="Sil">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        });

        fileList.innerHTML = html;
    },

    getFileIcon: function(file) {
        if (file.type.startsWith('audio/') || file.name.includes('səs-qeydi') || file.name.includes('recording')) {
            return { icon: 'fas fa-microphone', color: '#3b82f6' };
        }
        if (file.type.startsWith('image/')) {
            return { icon: 'fas fa-image', color: '#3b82f6' };
        }
        if (file.type.startsWith('video/')) {
            return { icon: 'fas fa-video', color: '#ef4444' };
        }
        if (file.type.includes('pdf') || file.name.endsWith('.pdf')) {
            return { icon: 'fas fa-file-pdf', color: '#ef4444' };
        }
        if (file.type.includes('excel') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
            return { icon: 'fas fa-file-excel', color: '#10b981' };
        }
        if (file.type.includes('word') || file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
            return { icon: 'fas fa-file-word', color: '#3b82f6' };
        }
        if (file.type.includes('zip') || file.name.endsWith('.zip') || file.name.endsWith('.rar')) {
            return { icon: 'fas fa-file-archive', color: '#f59e0b' };
        }
        return { icon: 'fas fa-file', color: '#64748b' };
    },

    // ==================== UPLOAD FUNCTIONS ====================
    uploadFiles: async function(taskId, tableType = 'active') {
        if (this.files.length === 0) {
            this.showInfo('Yüklənəcək fayl yoxdur');
            return { success: false, count: 0 };
        }

        console.log(`📤 ${this.files.length} fayl yüklənir: task ${taskId}`);

        this.currentTaskId = taskId;
        this.currentTableType = tableType;

        // Upload status göstər
        this.showUploadStatus('Yüklənir...', 0);

        let uploadedCount = 0;
        let failedCount = 0;
        const results = [];

        for (let i = 0; i < this.files.length; i++) {
            const file = this.files[i];
            const progress = Math.round(((i + 1) / this.files.length) * 100);

            this.showUploadStatus(`${file.name} yüklənir...`, progress);

            try {
                const result = await this.uploadSingleFile(file, taskId);

                if (result.success) {
                    uploadedCount++;
                    results.push({ file: file.name, success: true, data: result.data });
                    console.log(`✅ ${file.name} yükləndi (${uploadedCount}/${this.files.length})`);
                } else {
                    failedCount++;
                    results.push({ file: file.name, success: false, error: result.error });
                    console.error(`❌ ${file.name} yüklənmədi:`, result.error);
                }
            } catch (error) {
                failedCount++;
                results.push({ file: file.name, success: false, error: error.message });
                console.error(`❌ ${file.name} yüklənmədi:`, error);
            }
        }

        // Upload status gizlət
        this.hideUploadStatus();

        // Nəticəni göstər
        if (uploadedCount > 0) {
            this.showSuccess(`${uploadedCount} fayl uğurla yükləndi${failedCount > 0 ? `, ${failedCount} fayl yüklənmədi` : ''}`);

            // Task siyahılarını yenilə
            setTimeout(() => {
                this.refreshTaskTable(tableType);
            }, 1000);
        } else {
            this.showError('Heç bir fayl yüklənmədi');
        }

        // Fayl siyahısını təmizlə
        this.clearFiles();

        return {
            success: uploadedCount > 0,
            count: uploadedCount,
            failed: failedCount,
            results: results
        };
    },

    uploadSingleFile: async function(file, taskId) {
        try {
            const formData = new FormData();
            formData.append('file', file);

            // Audio qeydi olub-olmadığını yoxla
            const isAudioRecording = file.name.includes('səs-qeydi') ||
                                     file.name.includes('recording') ||
                                     file.type.startsWith('audio/');

            // Kateqoriya təyin et
            let category = 'project_image';
            if (isAudioRecording) {
                category = 'audio_recording';
            } else if (file.type.startsWith('image/')) {
                category = 'project_image';
            } else if (file.type.includes('pdf')) {
                category = 'document';
            } else if (file.type.includes('video/')) {
                category = 'company_video';
            }

            formData.append('category', category);

            console.log(`📡 Fayl yüklənir: ${file.name}, tip: ${file.type}, ölçü: ${this.formatFileSize(file.size)}`);

            // 1. simple-upload endpoint-inə yüklə (apiService vasitəsilə)
            const response = await makeApiRequest('/files/simple-upload', 'POST', formData, true);

            if (response.error) {
                throw new Error(response.error || 'Fayl yüklənə bilmədi');
            }

            console.log('✅ simple-upload cavabı:', response);

            // 2. Fayl uğurla yükləndisə, task-a əlavə et
            // Response formatını yoxla (apiService formatları)
            let fileData = null;

            // Format 1: {success: true, data: {...}}
            if (response.success && response.data) {
                fileData = response.data;
            }
            // Format 2: {data: {...}}
            else if (response.data) {
                fileData = response.data;
            }
            // Format 3: Direct object
            else if (response.uuid || response.id) {
                fileData = response;
            }

            if (!fileData) {
                console.warn('⚠️ Fayl yükləndi, amma data formatı tanınmadı:', response);
                return { success: true, data: response };
            }

            const fileUuid = fileData.uuid || fileData.id;
            const fileUrl = fileData.url || fileData.storage_url || `/api/v1/files/${fileUuid}`;

            console.log(`📎 Fayl UUID: ${fileUuid}, Task ${taskId}-ə əlavə edilir...`);

            // Task-ın attachments sahəsini yenilə
            await this.attachFileToTask(taskId, {
                file_id: fileUuid,
                uuid: fileUuid,
                filename: file.name,
                original_filename: fileData.original_filename || file.name,
                mime_type: file.type,
                size: file.size,
                file_size: fileData.file_size || file.size,
                url: fileUrl,
                storage_url: fileUrl,
                is_audio_recording: isAudioRecording,
                uploaded_at: new Date().toISOString(),
                category: category
            });

            return { success: true, data: fileData };

        } catch (error) {
            console.error(`❌ ${file.name} yüklənərkən xəta:`, error);
            return {
                success: false,
                error: error.message || 'Unknown error',
                file: file.name
            };
        }
    },

    // ==================== SHOW ALL FILES FUNCTION ====================
    /**
     * Bütün faylları göstərən modal açır
     * @param {number} taskId - Task ID
     */
    showAllFiles: async function(taskId) {
        try {
            console.log(`📋 FileUploadManager: Task ${taskId} bütün faylları göstərilir...`);

            // Task məlumatlarını al
            const response = await makeApiRequest(`/tasks/${taskId}`, 'GET', null, true);

            if (response.error) {
                console.error('❌ Task tapılmadı:', response.error);
                this.showError('Task tapılmadı');
                return;
            }

            const task = response.data || response;

            // Attachments-i yoxla
            let attachments = [];
            if (task.attachments) {
                try {
                    attachments = typeof task.attachments === 'string'
                        ? JSON.parse(task.attachments)
                        : (Array.isArray(task.attachments) ? task.attachments : []);
                    console.log(`📎 Task ${taskId}: ${attachments.length} fayl tapıldı`);
                } catch (e) {
                    console.error('❌ Attachments parse xətası:', e);
                    attachments = [];
                }
            }

            if (attachments.length === 0) {
                this.showInfo('Bu taskda fayl yoxdur');
                return;
            }

            // Fayl siyahısını yarat
            let filesHTML = '';

            attachments.forEach((file, index) => {
                const fileId = file.file_id || file.uuid || file.id;
                const fileName = file.filename || file.original_filename || `Fayl ${index + 1}`;

                const isAudio = file.is_audio_recording ||
                               (file.mime_type && file.mime_type.startsWith('audio/')) ||
                               fileName.includes('səs-qeydi') ||
                               fileName.includes('recording');

                const fileIcon = isAudio ? 'fa-microphone' :
                                file.mime_type?.startsWith('image/') ? 'fa-image' :
                                file.mime_type?.startsWith('video/') ? 'fa-video' :
                                file.mime_type?.includes('pdf') ? 'fa-file-pdf' :
                                file.mime_type?.includes('excel') ? 'fa-file-excel' :
                                file.mime_type?.includes('word') ? 'fa-file-word' :
                                'fa-file';

                const iconColor = isAudio ? '#3b82f6' :
                                 file.mime_type?.startsWith('image/') ? '#3b82f6' :
                                 file.mime_type?.startsWith('video/') ? '#ef4444' :
                                 file.mime_type?.includes('pdf') ? '#ef4444' :
                                 file.mime_type?.includes('excel') ? '#10b981' :
                                 file.mime_type?.includes('word') ? '#3b82f6' :
                                 '#64748b';

                filesHTML += `
                    <div class="file-list-item" style="
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        padding: 12px;
                        border: 1px solid #e2e8f0;
                        border-radius: 8px;
                        margin-bottom: 8px;
                        cursor: pointer;
                        transition: all 0.2s;
                        background: white;
                    " onclick="TableManager.previewFile('${fileId}', '${fileName}', '${file.mime_type || ''}', ${isAudio})">
                        <div style="font-size: 24px; width: 40px; text-align: center;">
                            <i class="fas ${fileIcon}" style="color: ${iconColor};"></i>
                        </div>
                        <div style="flex: 1;">
                            <div style="font-weight: 500; color: #334155;">${this.escapeHtml(fileName)}</div>
                            <div style="display: flex; gap: 20px; font-size: 12px; color: #64748b;">
                                ${file.size ? `<span><i class="fas fa-weight-hanging"></i> ${this.formatFileSize(file.size)}</span>` : ''}
                                ${file.uploaded_at ? `<span><i class="fas fa-calendar"></i> ${this.formatDate(file.uploaded_at)}</span>` : ''}
                            </div>
                        </div>
                        <div>
                            <i class="fas fa-eye" style="color: #3b82f6;"></i>
                        </div>
                    </div>
                `;
            });

            // Modal HTML-i yarat
            const modalHTML = `
                <div class="modal-backdrop" id="filesListModal" style="display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; align-items: center; justify-content: center;">
                    <div class="modal" style="background: white; border-radius: 12px; max-width: 600px; width: 90%; max-height: 80vh; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);">
                        <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #e2e8f0;">
                            <div class="modal-title" style="font-size: 18px; font-weight: 600; color: #0f172a;">
                                <i class="fas fa-paperclip" style="color: #3b82f6; margin-right: 8px;"></i>
                                Fayllar (${attachments.length})
                            </div>
                            <button class="close-btn" onclick="FileUploadManager.closeModal('filesListModal')" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #64748b;">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="modal-content" style="padding: 20px; max-height: calc(80vh - 120px); overflow-y: auto;">
                            ${filesHTML}
                        </div>
                        <div class="modal-footer" style="display: flex; justify-content: flex-end; padding: 16px 20px; border-top: 1px solid #e2e8f0;">
                            <button class="secondary-btn" onclick="FileUploadManager.closeModal('filesListModal')" style="padding: 8px 16px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; cursor: pointer; color: #334155;">
                                <i class="fas fa-times"></i> Bağla
                            </button>
                        </div>
                    </div>
                </div>
            `;

            // Köhnə modalı sil
            const oldModal = document.getElementById('filesListModal');
            if (oldModal) oldModal.remove();

            // Yeni modalı əlavə et
            document.body.insertAdjacentHTML('beforeend', modalHTML);

        } catch (error) {
            console.error('❌ Fayllar göstərilərkən xəta:', error);
            this.showError('Fayllar göstərilə bilmədi: ' + error.message);
        }
    },

    /**
     * Faylı task-a əlavə edir (attachments sahəsini yeniləyir)
     * @param {number} taskId - Task ID
     * @param {Object} fileData - Fayl məlumatları
     */
    attachFileToTask: async function(taskId, fileData) {
        try {
            console.log(`📎 Task ${taskId} attachments yenilənir...`);

            // 1. Task-ın cari məlumatlarını al
            const taskResponse = await makeApiRequest(`/tasks/${taskId}`, 'GET', null, true);

            if (taskResponse.error) {
                console.error('❌ Task tapılmadı:', taskResponse.error);
                return false;
            }

            // Task məlumatlarını al (formatları yoxla)
            let task = null;
            if (taskResponse.data) {
                task = taskResponse.data;
            } else if (taskResponse.task) {
                task = taskResponse.task;
            } else {
                task = taskResponse;
            }

            if (!task) {
                console.error('❌ Task məlumatı tapılmadı');
                return false;
            }

            // 2. Cari attachments-i al (əgər varsa)
            let attachments = [];
            if (task.attachments) {
                try {
                    attachments = typeof task.attachments === 'string'
                        ? JSON.parse(task.attachments)
                        : (Array.isArray(task.attachments) ? task.attachments : []);
                } catch (e) {
                    console.error('❌ Attachments parse xətası:', e);
                    attachments = [];
                }
            }

            // 3. Yeni faylı əlavə et
            const newAttachment = {
                file_id: fileData.file_id || fileData.uuid,
                uuid: fileData.uuid || fileData.file_id,
                filename: fileData.filename || fileData.original_filename,
                original_filename: fileData.original_filename || fileData.filename,
                mime_type: fileData.mime_type || fileData.type,
                size: fileData.size || fileData.file_size,
                file_size: fileData.file_size || fileData.size,
                url: fileData.url || fileData.storage_url,
                storage_url: fileData.storage_url || fileData.url,
                is_audio_recording: fileData.is_audio_recording || false,
                uploaded_at: fileData.uploaded_at || new Date().toISOString(),
                category: fileData.category || 'project_image'
            };

            attachments.push(newAttachment);

            // 4. Task-ı yenilə (PATCH)
            const updateData = {
                attachments: JSON.stringify(attachments)
            };

            console.log(`📦 Task ${taskId} yenilənir:`, updateData);

            const updateResponse = await makeApiRequest(`/tasks/${taskId}`, 'PATCH', updateData, true);

            if (updateResponse.error) {
                console.error('❌ Task yenilənə bilmədi:', updateResponse.error);
                return false;
            }

            console.log(`✅ Fayl task-a əlavə edildi: ${taskId}`);

            // WebSocket vasitəsilə bildiriş göndər (əgər varsa)
            if (window.WebSocketManager && window.WebSocketManager.send) {
                try {
                    window.WebSocketManager.send({
                        type: 'task_updated',
                        task_id: taskId,
                        event: 'file_added',
                        file: newAttachment
                    });
                } catch (wsError) {
                    console.warn('⚠️ WebSocket bildirişi göndərilmədi:', wsError);
                }
            }

            return true;

        } catch (error) {
            console.error('❌ Fayl task-a əlavə edilərkən xəta:', error);
            return false;
        }
    },

    // ==================== UI FUNCTIONS ====================
    showUploadStatus: function(message, progress) {
        let statusDiv = document.getElementById('uploadStatus');

        if (!statusDiv) {
            statusDiv = document.createElement('div');
            statusDiv.id = 'uploadStatus';
            statusDiv.className = 'upload-status';
            document.body.appendChild(statusDiv);
        }

        statusDiv.innerHTML = `
            <div class="upload-status-content">
                <div class="upload-message">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>${message}</span>
                </div>
                <div class="upload-progress">
                    <div class="progress-bar" style="width: ${progress}%;"></div>
                </div>
            </div>
        `;

        statusDiv.style.display = 'block';
    },

    hideUploadStatus: function() {
        const statusDiv = document.getElementById('uploadStatus');
        if (statusDiv) {
            statusDiv.style.display = 'none';
        }
    },

    refreshTaskTable: function(tableType) {
        if (window.taskManager) {
            switch(tableType) {
                case 'active':
                    window.taskManager.loadActiveTasks();
                    break;
                case 'archive':
                    window.taskManager.loadArchiveTasks();
                    break;
                case 'external':
                    window.taskManager.loadExternalTasks();
                    break;
                case 'partner':
                    if (window.taskManager.loadPartnerTasks) {
                        window.taskManager.loadPartnerTasks();
                    }
                    break;
            }
        }
    },

    // ==================== CLIPBOARD FUNCTIONS ====================

    /**
     * Clipboard-dan şəkil yapışdırmağı aktiv edir
     */
    initClipboardPaste: function() {
        console.log('📋 Clipboard paste aktiv edilir...');

        // Qlobal paste event-i dinlə
        document.addEventListener('paste', (event) => {
            // Yalnız task form açıq olduqda işlə
            const taskModal = document.getElementById('taskModal');
            const newTaskSection = document.getElementById('newTaskCreateSection');

            const isFormOpen = (taskModal && taskModal.style.display !== 'none') ||
                              (newTaskSection && newTaskSection.style.display !== 'none');

            if (!isFormOpen) {
                return; // Form açıq deyilsə, paste-i bloklama
            }

            this.handlePaste(event);
        });

        console.log('✅ Clipboard paste hazırdır');
    },

    /**
     * Paste eventini emal edir
     * @param {ClipboardEvent} event - Paste event
     */
    handlePaste: function(event) {
        try {
            console.log('📋 Paste edildi');

            // Clipboard-dan məlumatları al
            const items = event.clipboardData?.items;

            if (!items) {
                console.log('ℹ️ Clipboard məlumatı yoxdur');
                return;
            }

            let imageFound = false;

            // Bütün items-ları yoxla
            for (let i = 0; i < items.length; i++) {
                const item = items[i];

                // Şəkil tipini yoxla
                if (item.type.indexOf('image') !== -1) {
                    imageFound = true;

                    // File obyekti yarat
                    const file = item.getAsFile();
                    if (file) {
                        // Unikal fayl adı yarat
                        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                        const fileName = `prtscrn-${timestamp}.png`;

                        // Yeni File obyekti yarat (adı dəyişdirilmiş)
                        const imageFile = new File([file], fileName, { type: 'image/png' });

                        console.log(`📸 PrtScn şəkli tapıldı: ${fileName}, ölçü: ${this.formatFileSize(imageFile.size)}`);

                        // Faylı siyahıya əlavə et
                        this.files.push(imageFile);

                        // File list-i yenilə
                        this.updateFileList();

                        // Bildiriş göstər
                        this.showSuccess(`📸 PrtScn şəkli əlavə edildi: ${fileName}`);

                        // Event-in default davranışını dayandır
                        event.preventDefault();
                    }
                    break;
                }
            }

            if (!imageFound) {
                console.log('ℹ️ Clipboard-da şəkil yoxdur');
            }

        } catch (error) {
            console.error('❌ Paste xətası:', error);
            this.showError('Şəkil yapışdırıla bilmədi: ' + error.message);
        }
    },

    /**
     * Xüsusi olaraq PrtScn düyməsini tutmaq üçün
     */
    initPrintScreenCapture: function() {
        console.log('📸 PrtScn capture aktiv edilir...');

        // Keydown event-i ilə PrtScn-i tutmaq (bəzi brauzerlərdə işləyir)
        document.addEventListener('keydown', (event) => {
            if (event.key === 'PrintScreen') {
                console.log('📸 PrtScn düyməsi basıldı');

                // Task form açıq deyilsə, ignore et
                const taskModal = document.getElementById('taskModal');
                const newTaskSection = document.getElementById('newTaskCreateSection');

                const isFormOpen = (taskModal && taskModal.style.display !== 'none') ||
                                  (newTaskSection && newTaskSection.style.display !== 'none');

                if (!isFormOpen) {
                    return;
                }

                // İstifadəçiyə bildiriş göstər
                this.showInfo('📸 Şəkli yapışdırmaq üçün Ctrl+V basın');
            }
        });

        console.log('✅ PrtScn capture hazırdır');
    },

    /**
     * Clipboard-dan şəkli birbaşa yükləyir (manual çağırış üçün)
     */
    captureFromClipboard: async function() {
        try {
            console.log('📋 Clipboard-dan şəkil oxunur...');

            // Clipboard API ilə oxu
            const clipboardItems = await navigator.clipboard.read();

            for (const item of clipboardItems) {
                for (const type of item.types) {
                    if (type.startsWith('image/')) {
                        const blob = await item.getType(type);

                        // Unikal fayl adı yarat
                        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                        const extension = type.split('/')[1] || 'png';
                        const fileName = `prtscrn-${timestamp}.${extension}`;

                        // File obyekti yarat
                        const file = new File([blob], fileName, { type: type });

                        console.log(`📸 Şəkil tapıldı: ${fileName}, ölçü: ${this.formatFileSize(file.size)}`);

                        // Faylı siyahıya əlavə et
                        this.files.push(file);

                        // File list-i yenilə
                        this.updateFileList();

                        // Bildiriş göstər
                        this.showSuccess(`📸 Şəkil əlavə edildi: ${fileName}`);

                        return true;
                    }
                }
            }

            this.showInfo('ℹ️ Clipboard-da şəkil yoxdur');
            return false;

        } catch (error) {
            console.error('❌ Clipboard oxuma xətası:', error);

            // Permission xətası ola bilər
            if (error.name === 'NotAllowedError') {
                this.showError('📋 Clipboard icazəsi tələb olunur. Zəhmət olmasa Ctrl+V basın.');
            } else {
                this.showError('Clipboard oxuna bilmədi: ' + error.message);
            }
            return false;
        }
    },

    // ==================== NOTIFICATION FUNCTIONS ====================
    showSuccess: function(message) {
        if (window.notificationService && window.notificationService.showSuccess) {
            window.notificationService.showSuccess(message);
        } else {
            alert('✅ ' + message);
        }
    },

    showError: function(message) {
        if (window.notificationService && window.notificationService.showError) {
            window.notificationService.showError(message);
        } else {
            alert('❌ ' + message);
        }
    },

    showInfo: function(message) {
        if (window.notificationService && window.notificationService.showInfo) {
            window.notificationService.showInfo(message);
        } else {
            alert('ℹ️ ' + message);
        }
    },

    // ==================== HELPER FUNCTIONS ====================
    formatFileSize: function(bytes) {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    formatDate: function(dateString) {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('az-AZ');
        } catch (e) {
            return dateString;
        }
    },

    escapeHtml: function(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// ==================== TABLEMANAGER ƏLAVƏLƏRİ ====================
// Bu funksiyalar tableManager.js-dən çağırılacaq

/**
 * TableManager üçün file upload modalını açır
 * @param {number} taskId - Task ID
 * @param {string} tableType - Cədvəl tipi
 */
if (typeof window.TableManager !== 'undefined') {
    TableManager.openFileUpload = function(taskId, tableType) {
        console.log(`📤 File upload modal açılır: task ${taskId}, table ${tableType}`);

        const modalHTML = `
            <div class="modal-backdrop" id="fileUploadModal" style="display: flex; z-index: 9999;">
                <div class="modal modal-lg" style="max-width: 600px;">
                    <div class="modal-header">
                        <div class="modal-title">
                            <i class="fas fa-cloud-upload-alt" style="color: #3b82f6;"></i>
                            Fayl Yüklə
                        </div>
                        <button class="close-btn" onclick="TableManager.closeFileUploadModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-content" style="padding: 20px;">
                        <!-- File Drop Zone -->
                        <div class="file-upload-zone" id="modalFileDropZone" style="
                            border: 2px dashed var(--border-color, #cbd5e1);
                            border-radius: 12px;
                            padding: 40px 20px;
                            text-align: center;
                            background: var(--bg-secondary, #f8fafc);
                            cursor: pointer;
                            transition: all 0.3s;
                            margin-bottom: 20px;
                        ">
                            <div style="font-size: 48px; color: #94a3b8; margin-bottom: 15px;">
                                <i class="fas fa-cloud-upload-alt"></i>
                            </div>
                            <div style="font-size: 16px; color: #334155; margin-bottom: 8px;">
                                Faylı buraya sürüşdürün və ya klikləyin
                            </div>
                            <div style="font-size: 14px; color: #64748b;">
                                Maksimum ölçü: 100MB
                            </div>
                            <input type="file" id="modalFileInput" multiple style="display: none;">
                        </div>

                        <!-- File List -->
                        <div id="modalFileList" class="file-list" style="max-height: 300px; overflow-y: auto;"></div>

                        <!-- Selected Files Info -->
                        <div id="selectedFilesInfo" style="margin-top: 10px; font-size: 13px; color: #64748b;">
                            <span id="fileCount">0</span> fayl seçildi
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="secondary-btn" onclick="TableManager.closeFileUploadModal()">
                            <i class="fas fa-times"></i> Ləğv et
                        </button>
                        <button class="primary-btn" onclick="TableManager.uploadFiles('${taskId}', '${tableType}')" id="uploadButton">
                            <i class="fas fa-cloud-upload-alt"></i> Yüklə
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Köhnə modalı sil
        const oldModal = document.getElementById('fileUploadModal');
        if (oldModal) oldModal.remove();

        // Yeni modalı əlavə et
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // FileUploadManager-i hazırla
        setTimeout(() => {
            FileUploadManager.setupModalFileUpload();
        }, 100);
    };

    /**
     * File upload modalını bağlayır
     */
    TableManager.closeFileUploadModal = function() {
        const modal = document.getElementById('fileUploadModal');
        if (modal) {
            modal.remove();
        }
        FileUploadManager.clearFiles();
    };

    /**
     * Faylları yükləyir (TableManager versiyası)
     * @param {number} taskId - Task ID
     * @param {string} tableType - Cədvəl tipi
     */
    TableManager.uploadFiles = async function(taskId, tableType) {
        await FileUploadManager.uploadFiles(taskId, tableType);
        TableManager.closeFileUploadModal();
    };

    /**
     * Fayl preview (TableManager-dən çağırılır)
     */
    TableManager.previewFile = function(fileId, filename, mimeType, isAudioRecording = false) {
        if (FileUploadManager.previewFile) {
            FileUploadManager.previewFile(fileId, filename, mimeType, isAudioRecording);
        } else {
            console.error('❌ FileUploadManager.previewFile tapılmadı');
            window.open(`/proxy.php/api/v1/files/${fileId}/download`, '_blank');
        }
    };

    /**
     * Fayl siyahısını göstər
     */
    TableManager.showTaskFiles = function(taskId) {
        if (FileUploadManager.showTaskFiles) {
            FileUploadManager.showTaskFiles(taskId);
        } else {
            console.error('❌ FileUploadManager.showTaskFiles tapılmadı');
            alert('Fayl göstərmə funksiyası hazır deyil');
        }
    };

    /**
     * Faylı yüklə
     */
    TableManager.downloadFile = function(fileId, filename) {
        if (FileUploadManager.downloadFile) {
            FileUploadManager.downloadFile(fileId, filename);
        } else {
            window.open(`/proxy.php/api/v1/files/${fileId}/download`, '_blank');
        }
    };
}

// ==================== FILEUPLOADMANAGER MODAL FUNCTIONS ====================
FileUploadManager.setupModalFileUpload = function() {
    const dropZone = document.getElementById('modalFileDropZone');
    const fileInput = document.getElementById('modalFileInput');

    if (!dropZone || !fileInput) return;

    // Click event
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    // Drag events
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#3b82f6';
        dropZone.style.backgroundColor = '#eff6ff';
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.style.borderColor = 'var(--border-color, #cbd5e1)';
        dropZone.style.backgroundColor = 'var(--bg-secondary, #f8fafc)';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--border-color, #cbd5e1)';
        dropZone.style.backgroundColor = 'var(--bg-secondary, #f8fafc)';

        if (e.dataTransfer.files.length > 0) {
            FileUploadManager.handleModalFiles(e.dataTransfer.files);
        }
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            FileUploadManager.handleModalFiles(e.target.files);
        }
    });

    console.log('✅ Modal file upload hazırdır');
};

FileUploadManager.handleModalFiles = function(fileList) {
    console.log(`📥 Modal: ${fileList.length} fayl seçildi`);

    Array.from(fileList).forEach(file => {
        const validation = this.validateFile(file);
        if (!validation.valid) {
            this.showError(`${file.name}: ${validation.message}`);
            return;
        }
        this.files.push(file);
    });

    this.updateModalFileList();
};

FileUploadManager.updateModalFileList = function() {
    const fileList = document.getElementById('modalFileList');
    const fileCount = document.getElementById('fileCount');

    if (!fileList) return;

    if (this.files.length === 0) {
        fileList.innerHTML = '';
        if (fileCount) fileCount.textContent = '0';
        return;
    }

    let html = '';

    this.files.forEach((file, index) => {
        const icon = this.getFileIcon(file);
        const size = this.formatFileSize(file.size);

        html += `
            <div class="file-item" style="
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 10px;
                border: 1px solid var(--border-color, #e2e8f0);
                border-radius: 8px;
                margin-bottom: 8px;
                background: white;
            ">
                <div style="font-size: 20px; width: 32px;">
                    <i class="${icon.icon}" style="color: ${icon.color};"></i>
                </div>
                <div style="flex: 1;">
                    <div style="font-weight: 500; color: #334155;">${this.escapeHtml(file.name)}</div>
                    <div style="font-size: 12px; color: #64748b;">${size}</div>
                </div>
                <button class="file-remove-btn" onclick="FileUploadManager.removeModalFile(${index})" 
                        style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 16px;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    });

    fileList.innerHTML = html;
    if (fileCount) fileCount.textContent = this.files.length;
};

FileUploadManager.removeModalFile = function(index) {
    if (index >= 0 && index < this.files.length) {
        this.files.splice(index, 1);
        this.updateModalFileList();
    }
};

// ==================== PREVIEW FUNCTIONS ====================
FileUploadManager.previewFile = async function(fileId, filename, mimeType, isAudioRecording = false) {
    try {
        console.log(`👁️ Fayl preview: ${fileId}, ${filename}, audio: ${isAudioRecording}`);

        if (isAudioRecording || (mimeType && mimeType.startsWith('audio/'))) {
            this.openAudioPreviewModal(fileId, filename);
        } else if (mimeType && mimeType.startsWith('image/')) {
            this.openImagePreviewModal(fileId, filename);
        } else if (mimeType && mimeType.startsWith('video/')) {
            this.openVideoPreviewModal(fileId, filename);
        } else if (mimeType && (mimeType.includes('pdf') || filename?.endsWith('.pdf'))) {
            this.openPdfPreviewModal(fileId, filename);
        } else {
            this.downloadFile(fileId, filename);
        }
    } catch (error) {
        console.error('❌ Fayl preview xətası:', error);
        this.showError('Fayl açıla bilmədi: ' + error.message);
    }
};

// ==================== IMAGE PREVIEW ====================
FileUploadManager.openImagePreviewModal = function(fileId, filename) {
    const oldModal = document.getElementById('imagePreviewModal');
    if (oldModal) oldModal.remove();

    const token = localStorage.getItem('guven_token') || '';
    const imageUrl = `/proxy.php/api/v1/files/${fileId}/download?token=${encodeURIComponent(token)}`;

    const modalHTML = `
        <div class="modal-backdrop" id="imagePreviewModal" style="display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; align-items: center; justify-content: center;">
            <div class="modal" style="background: white; border-radius: 12px; max-width: 800px; width: 90%; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);">
                <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #e2e8f0;">
                    <div class="modal-title" style="font-size: 18px; font-weight: 600; color: #0f172a;">
                        <i class="fas fa-image" style="color: #3b82f6; margin-right: 8px;"></i>
                        Şəkil
                    </div>
                    <button class="close-btn" onclick="FileUploadManager.closeModal('imagePreviewModal')" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #64748b;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-content" style="padding: 20px; text-align: center; max-height: 70vh; overflow-y: auto;">
                    <div style="margin-bottom: 15px; font-weight: 500; color: #334155;">
                        ${this.escapeHtml(filename || 'Şəkil')}
                    </div>
                    <img src="${imageUrl}" style="max-width: 100%; max-height: 500px; border-radius: 8px;" alt="${filename}">
                </div>
                <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 10px; padding: 16px 20px; border-top: 1px solid #e2e8f0;">
                    <button class="secondary-btn" onclick="FileUploadManager.closeModal('imagePreviewModal')" style="padding: 8px 16px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; cursor: pointer; color: #334155;">
                        <i class="fas fa-times"></i> Bağla
                    </button>
                    <button class="primary-btn" onclick="FileUploadManager.downloadFile('${fileId}', '${filename}')" style="padding: 8px 16px; background: #3b82f6; border: 1px solid #2563eb; border-radius: 6px; cursor: pointer; color: white;">
                        <i class="fas fa-download"></i> Yüklə
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
};

// ==================== VIDEO PREVIEW ====================
FileUploadManager.openVideoPreviewModal = function(fileId, filename) {
    const oldModal = document.getElementById('videoPreviewModal');
    if (oldModal) oldModal.remove();

    const token = localStorage.getItem('guven_token') || '';
    const videoUrl = `/proxy.php/api/v1/files/${fileId}/download?token=${encodeURIComponent(token)}`;

    const modalHTML = `
        <div class="modal-backdrop" id="videoPreviewModal" style="display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; align-items: center; justify-content: center;">
            <div class="modal" style="background: white; border-radius: 12px; max-width: 800px; width: 90%; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);">
                <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #e2e8f0;">
                    <div class="modal-title" style="font-size: 18px; font-weight: 600; color: #0f172a;">
                        <i class="fas fa-video" style="color: #ef4444; margin-right: 8px;"></i>
                        Video
                    </div>
                    <button class="close-btn" onclick="FileUploadManager.closeModal('videoPreviewModal')" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #64748b;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-content" style="padding: 20px; text-align: center; max-height: 70vh; overflow-y: auto;">
                    <div style="margin-bottom: 15px; font-weight: 500; color: #334155;">
                        ${this.escapeHtml(filename || 'Video')}
                    </div>
                    <video controls style="max-width: 100%; max-height: 500px; border-radius: 8px;">
                        <source src="${videoUrl}" type="video/mp4">
                        Brauzeriniz video elementini dəstəkləmir.
                    </video>
                </div>
                <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 10px; padding: 16px 20px; border-top: 1px solid #e2e8f0;">
                    <button class="secondary-btn" onclick="FileUploadManager.closeModal('videoPreviewModal')" style="padding: 8px 16px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; cursor: pointer; color: #334155;">
                        <i class="fas fa-times"></i> Bağla
                    </button>
                    <button class="primary-btn" onclick="FileUploadManager.downloadFile('${fileId}', '${filename}')" style="padding: 8px 16px; background: #3b82f6; border: 1px solid #2563eb; border-radius: 6px; cursor: pointer; color: white;">
                        <i class="fas fa-download"></i> Yüklə
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
};

// ==================== PDF PREVIEW ====================
FileUploadManager.openPdfPreviewModal = function(fileId, filename) {
    const oldModal = document.getElementById('pdfPreviewModal');
    if (oldModal) oldModal.remove();

    const token = localStorage.getItem('guven_token') || '';
    const pdfUrl = `/proxy.php/api/v1/files/${fileId}/download?token=${encodeURIComponent(token)}`;

    const modalHTML = `
        <div class="modal-backdrop" id="pdfPreviewModal" style="display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; align-items: center; justify-content: center;">
            <div class="modal" style="background: white; border-radius: 12px; max-width: 900px; width: 95%; height: 80vh; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);">
                <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #e2e8f0;">
                    <div class="modal-title" style="font-size: 18px; font-weight: 600; color: #0f172a;">
                        <i class="fas fa-file-pdf" style="color: #ef4444; margin-right: 8px;"></i>
                        PDF Sənəd
                    </div>
                    <button class="close-btn" onclick="FileUploadManager.closeModal('pdfPreviewModal')" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #64748b;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-content" style="padding: 0; height: calc(80vh - 120px);">
                    <iframe src="${pdfUrl}" style="width: 100%; height: 100%; border: none;"></iframe>
                </div>
                <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 10px; padding: 16px 20px; border-top: 1px solid #e2e8f0;">
                    <button class="secondary-btn" onclick="FileUploadManager.closeModal('pdfPreviewModal')" style="padding: 8px 16px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; cursor: pointer; color: #334155;">
                        <i class="fas fa-times"></i> Bağla
                    </button>
                    <button class="primary-btn" onclick="FileUploadManager.downloadFile('${fileId}', '${filename}')" style="padding: 8px 16px; background: #3b82f6; border: 1px solid #2563eb; border-radius: 6px; cursor: pointer; color: white;">
                        <i class="fas fa-download"></i> Yüklə
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
};

// ==================== AUDIO PREVIEW ====================
FileUploadManager.openAudioPreviewModal = function(fileId, filename) {
    const oldModal = document.getElementById('audioPreviewModal');
    if (oldModal) oldModal.remove();

    const modalHTML = `
        <div class="modal-backdrop" id="audioPreviewModal" style="display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; align-items: center; justify-content: center;">
            <div class="modal" style="background: white; border-radius: 12px; max-width: 500px; width: 90%; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);">
                <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #e2e8f0;">
                    <div class="modal-title" style="font-size: 18px; font-weight: 600; color: #0f172a;">
                        <i class="fas fa-microphone" style="color: #3b82f6; margin-right: 8px;"></i>
                        Səs Qeydi
                    </div>
                    <button class="close-btn" onclick="FileUploadManager.closeModal('audioPreviewModal')" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #64748b;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-content" style="padding: 20px;">
                    <div class="audio-player-container" style="text-align: center;">
                        <div style="margin-bottom: 20px;">
                            <i class="fas fa-microphone" style="font-size: 48px; color: #3b82f6;"></i>
                        </div>
                        <div style="margin-bottom: 15px; font-weight: 500; color: #334155;">
                            ${this.escapeHtml(filename || 'Səs qeydi')}
                        </div>
                        <audio id="audioPlayer" controls style="width: 100%; height: 40px; border-radius: 20px;">
                            <source src="" type="audio/wav">
                            Brauzeriniz audio elementini dəstəkləmir.
                        </audio>
                        <div class="audio-info" style="margin-top: 15px; color: #64748b; font-size: 14px; padding: 8px; background: #f8fafc; border-radius: 4px;" id="audioInfo">
                            <i class="fas fa-spinner fa-spin"></i> Yüklənir...
                        </div>
                    </div>
                </div>
                <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 10px; padding: 16px 20px; border-top: 1px solid #e2e8f0;">
                    <button class="secondary-btn" onclick="FileUploadManager.closeModal('audioPreviewModal')" style="padding: 8px 16px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; cursor: pointer; color: #334155;">
                        <i class="fas fa-times"></i> Bağla
                    </button>
                    <button class="primary-btn" onclick="FileUploadManager.downloadFile('${fileId}', '${filename}')" style="padding: 8px 16px; background: #3b82f6; border: 1px solid #2563eb; border-radius: 6px; cursor: pointer; color: white;">
                        <i class="fas fa-download"></i> Yüklə
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.loadAudioForPreview(fileId, filename);
};

FileUploadManager.loadAudioForPreview = async function(fileId, filename) {
    try {
        console.log(`🎵 Audio yüklənir: ${fileId}`);

        const audioInfo = document.getElementById('audioInfo');
        if (audioInfo) {
            audioInfo.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Yüklənir...';
        }

        // apiService vasitəsilə yüklə
        const response = await makeApiRequest(`/files/${fileId}/download`, 'GET', null, true);

        if (response.error) {
            throw new Error(response.error);
        }

        console.log('✅ Audio cavabı:', response);

        // Audio player-i tap
        const audioPlayer = document.getElementById('audioPlayer');
        if (!audioPlayer) {
            console.error('❌ Audio player tapılmadı');
            return;
        }

        // Əgər response.url varsa (əgər backend URL qaytarırsa)
        if (response.url) {
            console.log('🔗 Audio URL:', response.url);
            audioPlayer.src = response.url;
            audioPlayer.load();

            if (audioInfo) {
                audioInfo.innerHTML = '<span style="color: #10b981;">✅ Hazırdır (URL)</span>';
            }
            return;
        }

        // Əgər response Blob-dursa (birbaşa fayl məzmunu)
        if (response instanceof Blob) {
            console.log('📦 Audio blob:', response.type, response.size);
            const audioUrl = URL.createObjectURL(response);
            audioPlayer.src = audioUrl;
            audioPlayer.load();

            if (audioInfo) {
                audioInfo.innerHTML = '<span style="color: #10b981;">✅ Hazırdır (Blob)</span>';
            }

            // Yadda saxla ki, sonra təmizləyək
            setTimeout(() => {
                URL.revokeObjectURL(audioUrl);
            }, 60000); // 1 dəqiqə sonra təmizlə

            return;
        }

        // Əgər response ArrayBuffer və ya digər formatdadırsa
        if (response instanceof ArrayBuffer) {
            console.log('📦 Audio ArrayBuffer:', response.byteLength);
            const blob = new Blob([response], { type: 'audio/wav' });
            const audioUrl = URL.createObjectURL(blob);
            audioPlayer.src = audioUrl;
            audioPlayer.load();

            if (audioInfo) {
                audioInfo.innerHTML = '<span style="color: #10b981;">✅ Hazırdır (ArrayBuffer)</span>';
            }

            setTimeout(() => {
                URL.revokeObjectURL(audioUrl);
            }, 60000);

            return;
        }

        // Əgər response string-dirsə (base64 ola bilər)
        if (typeof response === 'string') {
            console.log('📦 Audio string:', response.substring(0, 50));

            // Base64 yoxla
            if (response.startsWith('data:audio')) {
                audioPlayer.src = response;
                audioPlayer.load();

                if (audioInfo) {
                    audioInfo.innerHTML = '<span style="color: #10b981;">✅ Hazırdır (Base64)</span>';
                }
                return;
            }
        }

        // Heç bir format tanınmadı
        throw new Error('Fayl formatı tanınmadı');

    } catch (error) {
        console.error('❌ Audio yükləmə xətası:', error);
        const audioInfo = document.getElementById('audioInfo');
        if (audioInfo) {
            audioInfo.innerHTML = `<span style="color: #ef4444;">❌ Xəta: ${error.message}</span>`;
        }

        // Fallback: birbaşa endpoint-ə keçid
        const audioPlayer = document.getElementById('audioPlayer');
        if (audioPlayer) {
            const token = localStorage.getItem('guven_token');
            const fallbackUrl = `/proxy.php/api/v1/files/${fileId}/download?token=${encodeURIComponent(token || '')}`;
            console.log('🔄 Fallback URL:', fallbackUrl);
            audioPlayer.src = fallbackUrl;
            audioPlayer.load();

            if (audioInfo) {
                audioInfo.innerHTML = '<span style="color: #f59e0b;">⚠️ Fallback istifadə olunur</span>';
            }
        }
    }
};

FileUploadManager.downloadFile = async function(fileId, filename) {
    try {
        console.log(`📥 Fayl yüklənir: ${fileId}, ${filename}`);

        // apiService vasitəsilə yüklə
        const response = await makeApiRequest(`/files/${fileId}/download`, 'GET', null, true);

        if (response.error) {
            throw new Error(response.error);
        }

        // URL varsa, birbaşa aç
        if (response.url) {
            window.open(response.url, '_blank');
            return;
        }

        // Əgər response blobdursa
        if (response instanceof Blob) {
            const downloadUrl = URL.createObjectURL(response);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = filename || 'fayl';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(downloadUrl);
        } else {
            // Fallback: birbaşa endpoint
            const token = localStorage.getItem('guven_token');
            window.open(`/proxy.php/api/v1/files/${fileId}/download?token=${encodeURIComponent(token || '')}`, '_blank');
        }

        this.showSuccess('Fayl yükləndi');

    } catch (error) {
        console.error('❌ Fayl yükləmə xətası:', error);
        this.showError('Fayl yüklənə bilmədi: ' + error.message);
    }
};

FileUploadManager.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.remove();
    }
};

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
    // FileUploadManager-i initialize et
    if (typeof window.FileUploadManager === 'undefined') {
        window.FileUploadManager = FileUploadManager;
        FileUploadManager.initialize();
        console.log('✅ FileUploadManager global olaraq əlavə edildi');
    }
});

// Node.js üçün export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FileUploadManager };
}