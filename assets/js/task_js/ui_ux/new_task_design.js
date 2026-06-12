(function() {
    'use strict';

    let currentTaskType = null;
    let modalInitialized = false;
    let eventsAttached = false;

    let mediaRecorder = null;
    let audioChunks = [];
    let audioStream = null;
    let recordedAudioBlob = null;
    let recordedAudioUrl = '';
    let animationId = null;
    let isRecording = false;
    let pendingAudioFile = null;
    let discardAudioOnStop = false;
    let audioRecorderSupported = typeof navigator !== 'undefined' && !!navigator.mediaDevices;

    let modalOverlay = null;
    let modalTitleIcon = null;
    let modalTitleText = null;

    let companyGroup;
    let parentGroup;
    let partnerGroup;
    let executorGroup;
    let otherExecutorGroup;
    let startBtn;
    let stopBtn;
    let saveBtn;
    let cancelBtn;
    let audioStatus;
    let audioPreview;
    let recordedAudio;
    let audioData;
    let audioFilename;
    let visualizer;
    let fileZone;
    let fileInput;
    let fileList;

    let myCompany = null;
    let userData = null;
    let subsidiaryCompanies = [];
    let departments = [];
    let employees = [];
    let workTypes = [];
    let parentCompanies = [];
    let partners = [];
    let otherExecutorEmployees = [];

    const loadFailures = {
        companies: false,
        departments: false,
        employees: false,
        workTypes: false,
        parents: false,
        partners: false
    };

    function getSelect(id) {
        return document.getElementById(id);
    }

    function ensureArray(input) {
        if (Array.isArray(input)) return input;
        if (!input) return [];
        if (Array.isArray(input.data)) return input.data;
        if (Array.isArray(input.items)) return input.items;
        if (Array.isArray(input.sub_companies)) return input.sub_companies;
        if (Array.isArray(input.parent_companies)) return input.parent_companies;
        return [];
    }

    function toIntOrNull(value) {
        if (value === null || value === undefined) return null;
        if (typeof value === 'number') {
            return Number.isFinite(value) ? Math.trunc(value) : null;
        }

        const normalized = String(value).trim();
        if (!normalized || normalized === 'null' || normalized === 'undefined' || normalized === 'NaN') {
            return null;
        }

        const parsed = parseInt(normalized, 10);
        return Number.isNaN(parsed) ? null : parsed;
    }

    function getTokenContext() {
        try {
            const token = typeof getAuthToken === 'function' ? getAuthToken() : window.getAuthToken?.();
            if (!token) return {};
            const payload = typeof parseTokenPayload === 'function' ? parseTokenPayload(token) : window.parseTokenPayload?.(token);
            return payload || {};
        } catch (error) {
            console.warn('⚠️ Token payload oxuna bilmədi:', error);
            return {};
        }
    }

    function normalizeCompanyContext() {
        const tmUser = window.taskManager?.userData || {};
        const tmCompany = window.taskManager?.myCompany || {};
        const token = getTokenContext();

        const resolvedUser = {
            userId: tmUser.userId || tmUser.user_id || token.user_id || token.sub || null,
            companyId: tmUser.companyId || tmUser.company_id || tmCompany.id || token.company_id || null,
            companyCode: tmUser.companyCode || tmUser.company_code || tmCompany.company_code || token.company_code || null,
            companyName: tmUser.companyName || tmUser.company_name || tmCompany.company_name || token.company_name || null,
            fullName: tmUser.fullName || tmUser.name || token.ceo_name || token.name || null,
            role: tmUser.role || token.role || null
        };

        const resolvedCompany = {
            id: tmCompany.id || resolvedUser.companyId,
            company_code: tmCompany.company_code || resolvedUser.companyCode,
            company_name: tmCompany.company_name || resolvedUser.companyName || resolvedUser.companyCode
        };

        if (!resolvedCompany.id && token.company_id) resolvedCompany.id = token.company_id;
        if (!resolvedCompany.company_code && token.company_code) resolvedCompany.company_code = token.company_code;
        if (!resolvedCompany.company_name && token.company_name) resolvedCompany.company_name = token.company_name;

        return { user: resolvedUser, company: resolvedCompany };
    }

    function formatCompanyName(company) {
        return company?.company_name || company?.name || company?.title || company?.companyCode || company?.company_code || '';
    }

    function formatEmployeeName(emp) {
        return [emp?.ceo_name, emp?.ceo_lastname].filter(Boolean).join(' ')
            || emp?.full_name
            || emp?.name
            || emp?.username
            || emp?.email
            || emp?.ceo_email
            || `İşçi ${emp?.id || ''}`.trim();
    }

    function formatDepartmentName(dep) {
        return dep?.department_name || dep?.name || dep?.title || `Şöbə ${dep?.id || ''}`;
    }

    function formatWorkTypeName(item) {
        return item?.work_type_name || item?.name || item?.title || `İş növü ${item?.id || ''}`;
    }

    function formatFileSize(bytes) {
        if (!bytes && bytes !== 0) return '0 B';
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.max(0, Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k))));
        return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function showNotification(message, type = 'success') {
        document.querySelectorAll('.task-notification').forEach(n => n.remove());
        const notification = document.createElement('div');
        notification.className = `task-notification task-notification-${type}`;
        const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
        notification.innerHTML = `<i class="fas ${icons[type] || icons.success}"></i><span>${message}</span><button class="task-notification-close"><i class="fas fa-times"></i></button>`;
        notification.style.cssText = `
            position:fixed; bottom:20px; right:20px;
            background:${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
            color:white; padding:12px 20px; border-radius:8px;
            display:flex; align-items:center; gap:12px; z-index:10001;
            box-shadow:0 4px 12px rgba(0,0,0,0.15); animation:slideIn 0.3s ease; font-size:14px;
        `;
        if (!document.querySelector('#ntm-anim')) {
            const s = document.createElement('style');
            s.id = 'ntm-anim';
            s.textContent = '@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}@keyframes slideOut{from{transform:translateX(0);opacity:1}to{transform:translateX(100%);opacity:0}}';
            document.head.appendChild(s);
        }
        document.body.appendChild(notification);
        const closeBtn = notification.querySelector('.task-notification-close');
        if (closeBtn) closeBtn.onclick = () => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        };
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }
        }, 4000);
    }

    function showAutoSelectNotification(type, name) {
        const toast = document.createElement('div');
        toast.className = 'newtask-toast';
        toast.innerHTML = `<i class="fas fa-wand-magic-sparkles" aria-hidden="true"></i><span>${escapeHtml(name)} üçün ${type === 'departament' ? 'şöbə' : 'şirkət'} avtomatik seçildi</span>`;
        document.body.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('is-visible'));
        setTimeout(() => {
            toast.classList.remove('is-visible');
            setTimeout(() => toast.remove(), 240);
        }, 2000);
    }

    function waitForTaskManager() {
        return new Promise((resolve) => {
            let attempts = 0;
            const timer = setInterval(() => {
                attempts++;
                const ready = window.taskManager && (window.taskManager.myCompany || window.taskManager.userData);
                if (ready || attempts >= 50) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    }

    async function safeRun(loader, errorKey, label) {
        try {
            await loader();
            loadFailures[errorKey] = false;
        } catch (error) {
            loadFailures[errorKey] = true;
            console.error(`❌ ${label} xətası:`, error);
        }
    }

    async function init() {
        if (modalInitialized) return;
        modalInitialized = true;

        console.log('🚀 new_task_design.js init başladı...');
        createModal();
        attachCardEvents();
        await waitForTaskManager();
        console.log('✅ TaskManager hazırdır');

        await safeRun(loadDataFromTaskManager, 'companies', 'loadDataFromTaskManager');
        await safeRun(loadWorkTypes, 'workTypes', 'loadWorkTypes');
        await safeRun(loadParentCompanies, 'parents', 'loadParentCompanies');
        await safeRun(loadPartnerCompanies, 'partners', 'loadPartnerCompanies');

        await safeRun(async () => populateSelects(), 'companies', 'populateSelects');
        await safeRun(setupPrintScreenCapture, 'companies', 'setupPrintScreenCapture');
        await safeRun(attachModalEvents, 'companies', 'attachModalEvents');
        await safeRun(setupAudioRecorder, 'companies', 'setupAudioRecorder');
        await safeRun(setupFileUpload, 'companies', 'setupFileUpload');

        console.log('✅ new_task_design.js hazırdır');
    }

    function createModal() {
        if (document.getElementById('newtaskModalOverlay')) {
            bindModalRefs();
            return;
        }

        const modalHTML = `
            <div class="newtask-modal-overlay liquid-task-modal-overlay" id="newtaskModalOverlay">
                <div class="newtask-modal liquid-task-modal" role="dialog" aria-modal="true" aria-labelledby="newtaskModalTitle">
                    <div class="newtask-modal-surface">
                        <div class="newtask-modal-header">
                            <div class="newtask-modal-title">
                                <span class="newtask-title-icon"><i class="fas fa-sparkles" id="newtaskModalIcon" aria-hidden="true"></i></span>
                                <div class="newtask-title-copy">
                                    <span class="newtask-modal-eyebrow">Yeni tapşırıq</span>
                                    <h3 id="newtaskModalTitle">Daxili Tapşırıq</h3>
                                </div>
                            </div>
                            <button type="button" class="newtask-modal-close" id="newtaskModalClose" aria-label="Modalı bağla">
                                <i class="fas fa-circle-xmark" aria-hidden="true"></i>
                            </button>
                        </div>
                        <div class="newtask-modal-body">
                            <form id="newtaskForm" class="glass-task-form">
                                <div class="newtask-form-grid glass-form-grid">
                                    <div class="newtask-form-group" id="newtaskCompanyGroup">
                                        <label class="newtask-form-label" for="newtaskCompanySelect"><i class="fas fa-building"></i> Şirkət</label>
                                        <div class="glass-field">
                                            <select id="newtaskCompanySelect" class="newtask-select" required>
                                                <option value="">Şirkət seçin</option>
                                            </select>
                                            <i class="fas fa-chevron-down glass-field-chevron" aria-hidden="true"></i>
                                        </div>
                                    </div>

                                    <div class="newtask-form-group" id="newtaskExecutorGroup">
                                        <label class="newtask-form-label" for="newtaskExecutorSelect"><i class="fas fa-user-tie"></i> İcra edən</label>
                                        <div class="glass-field">
                                            <select id="newtaskExecutorSelect" class="newtask-select">
                                                <option value="">İşçi seçin (boş qoymaq olar)</option>
                                            </select>
                                            <i class="fas fa-chevron-down glass-field-chevron" aria-hidden="true"></i>
                                        </div>
                                    </div>

                                    <div class="newtask-form-group" id="newtaskParentGroup" style="display:none;">
                                        <label class="newtask-form-label" for="newtaskParentSelect"><i class="fas fa-sitemap"></i> Şirkət</label>
                                        <div class="glass-field">
                                            <select id="newtaskParentSelect" class="newtask-select" required>
                                                <option value="">Şirkət seçin</option>
                                            </select>
                                            <i class="fas fa-chevron-down glass-field-chevron" aria-hidden="true"></i>
                                        </div>
                                        <div class="newtask-form-text">Şirkətlərinizə task göndərin</div>
                                    </div>

                                    <div class="newtask-form-group" id="newtaskPartnerGroup" style="display:none;">
                                        <label class="newtask-form-label" for="newtaskPartnerSelect"><i class="fas fa-handshake"></i> Partnyor</label>
                                        <div class="glass-field">
                                            <select id="newtaskPartnerSelect" class="newtask-select" required>
                                                <option value="">Partnyor seçin</option>
                                            </select>
                                            <i class="fas fa-chevron-down glass-field-chevron" aria-hidden="true"></i>
                                        </div>
                                    </div>

                                    <div class="newtask-form-group" id="newtaskOtherExecutorGroup">
                                        <label class="newtask-form-label" for="newtaskOtherExecutorSelect"><i class="fas fa-users"></i> Digər şirkətin işçisi</label>
                                        <div class="glass-field">
                                            <select id="newtaskOtherExecutorSelect" class="newtask-select">
                                                <option value="">İşçi seçin (boş qoymaq olar)</option>
                                            </select>
                                            <i class="fas fa-chevron-down glass-field-chevron" aria-hidden="true"></i>
                                        </div>
                                    </div>

                                    <div class="newtask-form-group">
                                        <label class="newtask-form-label" for="newtaskDepartmentSelect"><i class="fas fa-sitemap"></i> Şöbə</label>
                                        <div class="glass-field">
                                            <select id="newtaskDepartmentSelect" class="newtask-select" required>
                                                <option value="">Şöbə seçin</option>
                                            </select>
                                            <i class="fas fa-chevron-down glass-field-chevron" aria-hidden="true"></i>
                                        </div>
                                    </div>

                                    <div class="newtask-form-group">
                                        <label class="newtask-form-label" for="newtaskTaskTypeSelect"><i class="fas fa-list-check"></i> İşin növü</label>
                                        <div class="glass-field">
                                            <select id="newtaskTaskTypeSelect" class="newtask-select" required>
                                                <option value="">İş növü seçin</option>
                                            </select>
                                            <i class="fas fa-chevron-down glass-field-chevron" aria-hidden="true"></i>
                                        </div>
                                    </div>

                                    <div class="newtask-form-group">
                                        <label class="newtask-form-label" for="newtaskDueDate"><i class="fas fa-calendar-days"></i> Son müddət</label>
                                        <div class="glass-field">
                                            <input type="date" id="newtaskDueDate" class="newtask-input" required />
                                        </div>
                                    </div>

                                    <div class="newtask-form-group newtask-visibility-group">
                                        <div class="newtask-checkbox-group">
                                            <input type="checkbox" id="newtaskIsVisible" class="newtask-checkbox">
                                            <label for="newtaskIsVisible" class="newtask-checkbox-label">
                                                <i class="fas fa-eye"></i> Seçilmiş şirkətə göstər
                                            </label>
                                        </div>
                                    </div>

                                    <div class="newtask-form-group full-width">
                                        <label class="newtask-form-label" for="newtaskDescription"><i class="fas fa-align-left"></i> Tapşırıq açıqlaması</label>
                                        <div class="glass-field glass-textarea-field">
                                            <textarea id="newtaskDescription" rows="4" class="newtask-textarea" placeholder="Tapşırığın detallı təsvirini yazın..." required></textarea>
                                        </div>
                                    </div>

                                    <div class="newtask-form-group full-width">
                                        <div class="newtask-media-grid">
                                            <div class="newtask-media-column">
                                                <label class="newtask-form-label" for="newtaskFileInput"><i class="fas fa-paperclip"></i> Fayl yükləmə</label>
                                                <div class="newtask-file-zone glass-upload-zone" id="newtaskFileZone">
                                                    <input type="file" id="newtaskFileInput" multiple hidden accept=".xlsx,.xls,.pdf,.jpg,.png,.jpeg,.doc,.docx,.webm,.mp3" />
                                                    <div class="glass-upload-icon"><i class="fas fa-file-arrow-up" aria-hidden="true"></i></div>
                                                    <div class="glass-upload-copy">
                                                        <strong>Faylı buraya sürüşdürün və ya klikləyin</strong>
                                                        <span>Dokument, şəkil, arxiv, səs və ekran görüntüsü əlavə edin</span>
                                                    </div>
                                                </div>
                                                <div class="newtask-file-list" id="newtaskFileList"></div>
                                            </div>

                                            <div class="newtask-media-column">
                                                <label class="newtask-form-label" for="newtaskStartRecord"><i class="fas fa-waveform-lines"></i> Səs qeydi</label>
                                                <div class="newtask-audio-container glass-audio-zone">
                                                    <div class="newtask-audio-status" id="newtaskAudioStatus">
                                                        <i class="fas fa-circle"></i><span>Səs qeydi hazırdır</span>
                                                    </div>
                                                    <div class="newtask-audio-buttons">
                                                        <button type="button" id="newtaskStartRecord" class="newtask-audio-btn record" aria-label="Səs qeydinə başla"><i class="fas fa-microphone" aria-hidden="true"></i></button>
                                                        <button type="button" id="newtaskStopRecord" class="newtask-audio-btn secondary" disabled><i class="fas fa-stop" aria-hidden="true"></i> Dayandır</button>
                                                        <button type="button" id="newtaskSaveRecord" class="newtask-audio-btn primary" disabled><i class="fas fa-save" aria-hidden="true"></i> Saxla</button>
                                                        <button type="button" id="newtaskCancelRecord" class="newtask-audio-btn secondary" disabled><i class="fas fa-times" aria-hidden="true"></i> Ləğv et</button>
                                                    </div>
                                                    <div class="newtask-audio-preview" id="newtaskAudioPreview" style="display:none;">
                                                        <audio id="newtaskRecordedAudio" controls></audio>
                                                    </div>
                                                    <canvas id="newtaskAudioVisualizer" width="600" height="40"></canvas>
                                                    <input type="hidden" id="newtaskAudioData" />
                                                    <input type="hidden" id="newtaskAudioFilename" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div class="newtask-modal-footer">
                            <button type="button" class="newtask-btn secondary" id="newtaskCancelBtn">
                                <i class="fas fa-circle-xmark"></i> Ləğv et
                            </button>
                            <button type="button" class="newtask-btn primary" id="newtaskSaveBtn">
                                <i class="fas fa-floppy-disk"></i> Tapşırıq Yarat
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        bindModalRefs();
    }

    function bindModalRefs() {
        modalOverlay = document.getElementById('newtaskModalOverlay');
        modalTitleIcon = document.getElementById('newtaskModalIcon');
        modalTitleText = document.getElementById('newtaskModalTitle');
        companyGroup = document.getElementById('newtaskCompanyGroup');
        parentGroup = document.getElementById('newtaskParentGroup');
        partnerGroup = document.getElementById('newtaskPartnerGroup');
        executorGroup = document.getElementById('newtaskExecutorGroup');
        otherExecutorGroup = document.getElementById('newtaskOtherExecutorGroup');
        startBtn = document.getElementById('newtaskStartRecord');
        stopBtn = document.getElementById('newtaskStopRecord');
        saveBtn = document.getElementById('newtaskSaveRecord');
        cancelBtn = document.getElementById('newtaskCancelRecord');
        audioStatus = document.getElementById('newtaskAudioStatus');
        audioPreview = document.getElementById('newtaskAudioPreview');
        recordedAudio = document.getElementById('newtaskRecordedAudio');
        audioData = document.getElementById('newtaskAudioData');
        audioFilename = document.getElementById('newtaskAudioFilename');
        visualizer = document.getElementById('newtaskAudioVisualizer');
        fileZone = document.getElementById('newtaskFileZone');
        fileInput = document.getElementById('newtaskFileInput');
        fileList = document.getElementById('newtaskFileList');
    }

    function attachCardEvents() {
        const cards = document.querySelectorAll('.task-type-card');
        cards.forEach(card => {
            card.addEventListener('click', () => {
                openModal(card.getAttribute('data-task-type'));
            });
        });
    }

    function setRequiredFields(taskType) {
        const companySelect = getSelect('newtaskCompanySelect');
        const parentSelect = getSelect('newtaskParentSelect');
        const partnerSelect = getSelect('newtaskPartnerSelect');
        if (companySelect) companySelect.required = false;
        if (parentSelect) parentSelect.required = false;
        if (partnerSelect) partnerSelect.required = false;
        if (taskType === 'internal' && companySelect) companySelect.required = true;
        else if (taskType === 'parent' && parentSelect) parentSelect.required = true;
        else if (taskType === 'partner' && partnerSelect) partnerSelect.required = true;
    }

    function openModal(taskType) {
        currentTaskType = taskType;
        if (companyGroup) companyGroup.style.display = 'none';
        if (parentGroup) parentGroup.style.display = 'none';
        if (partnerGroup) partnerGroup.style.display = 'none';
        if (executorGroup) executorGroup.style.display = 'none';
        if (otherExecutorGroup) otherExecutorGroup.style.display = 'none';

        if (taskType === 'internal') {
            if (companyGroup) companyGroup.style.display = 'block';
            if (executorGroup) executorGroup.style.display = 'block';
            if (otherExecutorGroup) otherExecutorGroup.style.display = 'block';
            if (modalTitleIcon) modalTitleIcon.className = 'fas fa-building';
            if (modalTitleText) modalTitleText.textContent = 'Daxili Tapşırıq';
        } else if (taskType === 'parent') {
            if (parentGroup) parentGroup.style.display = 'block';
            if (otherExecutorGroup) otherExecutorGroup.style.display = 'block';
            if (modalTitleIcon) modalTitleIcon.className = 'fas fa-sitemap';
            if (modalTitleText) modalTitleText.textContent = 'Şirkət Tapşırığı';
        } else if (taskType === 'partner') {
            if (partnerGroup) partnerGroup.style.display = 'block';
            if (otherExecutorGroup) otherExecutorGroup.style.display = 'block';
            if (modalTitleIcon) modalTitleIcon.className = 'fas fa-handshake';
            if (modalTitleText) modalTitleText.textContent = 'Partnyor Tapşırığı';
        }

        if (modalOverlay) modalOverlay.classList.add('active');
        setRequiredFields(taskType);
        resetForm();
    }

    function closeModal() {
        if (isRecording) stopRecording(true);
        if (modalOverlay) modalOverlay.classList.remove('active');
        resetForm();
    }

    function resetForm() {
        const form = getSelect('newtaskForm');
        if (form) form.reset();

        if (fileInput) fileInput.value = '';
        window.modalSelectedFiles = [];
        updateModalFileList();

        clearAudioState(true);

        const dueDateInput = getSelect('newtaskDueDate');
        if (dueDateInput) {
            const d = new Date();
            d.setDate(d.getDate() + 1);
            dueDateInput.value = d.toISOString().split('T')[0];
        }

        const otherExecutorSelect = getSelect('newtaskOtherExecutorSelect');
        if (otherExecutorSelect) {
            otherExecutorSelect.innerHTML = '<option value="">İşçi seçin (boş qoymaq olar)</option>';
            otherExecutorSelect.disabled = false;
        }

        const audioStatusEl = getSelect('newtaskAudioStatus');
        if (audioStatusEl) audioStatusEl.innerHTML = '<i class="fas fa-circle"></i><span>Səs qeydi hazırdır</span>';

        const audioPreviewEl = getSelect('newtaskAudioPreview');
        if (audioPreviewEl) audioPreviewEl.style.display = 'none';

        const recordedAudioEl = getSelect('newtaskRecordedAudio');
        if (recordedAudioEl) recordedAudioEl.src = '';

        const startBtnEl = getSelect('newtaskStartRecord');
        const stopBtnEl = getSelect('newtaskStopRecord');
        const saveBtnEl = getSelect('newtaskSaveRecord');
        const cancelBtnEl = getSelect('newtaskCancelRecord');
        if (startBtnEl) startBtnEl.disabled = false;
        if (stopBtnEl) stopBtnEl.disabled = true;
        if (saveBtnEl) saveBtnEl.disabled = true;
        if (cancelBtnEl) cancelBtnEl.disabled = true;

        if (visualizer) {
            const ctx = visualizer.getContext('2d');
            ctx.clearRect(0, 0, visualizer.width, visualizer.height);
            ctx.fillStyle = '#e9ecef';
            ctx.fillRect(0, 0, visualizer.width, visualizer.height);
        }
    }

    function stopRecording(discard = false) {
        if (discard) discardAudioOnStop = true;
        if (mediaRecorder && isRecording) {
            try {
                mediaRecorder.stop();
            } catch (error) {
                console.warn('⚠️ MediaRecorder stop xətası:', error);
            }
            if (audioStream) audioStream.getTracks().forEach(track => track.stop());
            if (animationId) cancelAnimationFrame(animationId);
            isRecording = false;
        }
    }

    function normalizeListResponse(response) {
        if (Array.isArray(response)) return response;
        return response?.data || response?.items || response?.sub_companies || response?.parent_companies || [];
    }

    async function loadDataFromTaskManager() {
        try {
            const ctx = normalizeCompanyContext();
            userData = ctx.user;
            myCompany = ctx.company;

            if (!myCompany?.id || !myCompany?.company_code) {
                console.warn('⚠️ Company məlumatı tam deyil');
            }

            const tm = window.taskManager || {};

            // Şirkət / alt şirkətlər
            try {
                const tmSubs = ensureArray(tm.subsidiaryCompanies);
                if (tmSubs.length) {
                    subsidiaryCompanies = tmSubs.map(item => ({
                        id: item.id || item.company_id,
                        company_code: item.company_code || item.code,
                        company_name: item.company_name || item.name,
                        is_my_company: false,
                        relationship_status: item.relationship_status || item.status || 'active'
                    })).filter(item => item.id || item.company_code || item.company_name);
                } else if (myCompany?.company_code && typeof window.getSubCompaniesWithCache === 'function') {
                    const subResp = await window.getSubCompaniesWithCache(myCompany.company_code);
                    const arr = normalizeListResponse(subResp);
                    subsidiaryCompanies = arr.map(item => ({
                        id: item.id || item.company_id,
                        company_code: item.company_code || item.code,
                        company_name: item.company_name || item.name,
                        is_my_company: false,
                        relationship_status: item.relationship_status || item.status || 'active'
                    })).filter(item => item.id || item.company_code || item.company_name);
                }
            } catch (error) {
                subsidiaryCompanies = [];
                console.error('⚠️ Alt şirkətlər yüklənmədi:', error);
            }

            // Şöbələr
            try {
                const tmDepartments = ensureArray(tm.departments);
                if (tmDepartments.length) {
                    departments = tmDepartments;
                } else if (myCompany?.company_code && typeof window.getDepartmentsWithCache === 'function') {
                    const depResp = await window.getDepartmentsWithCache(myCompany.company_code);
                    departments = normalizeListResponse(depResp);
                }
            } catch (error) {
                departments = [];
                console.error('⚠️ Şöbələr yüklənmədi:', error);
            }

            // İşçilər
            try {
                const tmEmployees = ensureArray(tm.employees);
                if (tmEmployees.length) {
                    employees = tmEmployees;
                } else if (myCompany?.company_code && typeof window.getEmployeesWithCache === 'function') {
                    const empResp = await window.getEmployeesWithCache(myCompany.company_code);
                    employees = normalizeListResponse(empResp);
                }
            } catch (error) {
                employees = [];
                console.error('⚠️ İşçilər yüklənmədi:', error);
            }

            if (!myCompany?.company_name && tm.myCompany) {
                myCompany.company_name = formatCompanyName(tm.myCompany) || myCompany.company_code;
            }

            if (!myCompany?.id && userData?.companyId) myCompany.id = userData.companyId;
            if (!myCompany?.company_code && userData?.companyCode) myCompany.company_code = userData.companyCode;
            if (!myCompany?.company_name && userData?.companyName) myCompany.company_name = userData.companyName;

            const totalCompanies = (myCompany?.id ? 1 : 0) + subsidiaryCompanies.length;
            console.log('companies count', totalCompanies);
            console.log('departments count', ensureArray(departments).length);
            console.log('employees count', ensureArray(employees).length);

            window.taskManager = window.taskManager || {};
            window.taskManager.userData = {
                ...window.taskManager.userData,
                userId: userData.userId,
                companyId: myCompany?.id || userData.companyId,
                companyCode: myCompany?.company_code || userData.companyCode,
                companyName: myCompany?.company_name || userData.companyName,
                fullName: userData.fullName,
                name: userData.fullName,
                role: userData.role
            };
            window.taskManager.myCompany = {
                ...window.taskManager.myCompany,
                id: myCompany?.id,
                company_code: myCompany?.company_code,
                company_name: myCompany?.company_name
            };
            window.taskManager.subsidiaryCompanies = subsidiaryCompanies;
            window.taskManager.departments = departments;
            window.taskManager.employees = employees;

            console.log('✅ Yüklənən məlumatlar:', {
                myCompany,
                subsidiaryCount: subsidiaryCompanies.length,
                departmentsCount: departments.length,
                employeesCount: employees.length
            });
        } catch (error) {
            loadFailures.companies = true;
            console.error('❌ TaskManager məlumat alma xətası:', error);
        }
    }

    async function loadWorkTypes() {
        try {
            const companyId = myCompany?.id || window.taskManager?.myCompany?.id || userData?.companyId || window.taskManager?.userData?.companyId;
            const tmWorkTypes = ensureArray(window.taskManager?.workTypes);
            if (tmWorkTypes.length) {
                workTypes = tmWorkTypes;
            } else if (companyId && typeof window.getWorkTypesWithCache === 'function') {
                const response = await window.getWorkTypesWithCache(companyId);
                workTypes = normalizeListResponse(response);
            } else {
                workTypes = [];
            }
            loadFailures.workTypes = false;
            console.log('workTypes count', workTypes.length);
            populateSelects();
        } catch (error) {
            loadFailures.workTypes = true;
            workTypes = [];
            console.error('❌ loadWorkTypes xətası:', error);
            populateSelects();
        }
    }

    async function loadParentCompanies() {
        try {
            const companyCode = myCompany?.company_code || window.taskManager?.myCompany?.company_code || userData?.companyCode || window.taskManager?.userData?.companyCode;
            const tmParents = ensureArray(window.taskManager?.parentCompanies);
            if (tmParents.length) {
                parentCompanies = tmParents;
            } else if (companyCode && typeof window.getParentCompaniesWithCache === 'function') {
                const response = await window.getParentCompaniesWithCache(companyCode);
                parentCompanies = normalizeListResponse(response);
            } else {
                parentCompanies = [];
            }
            loadFailures.parents = false;
            console.log('parents count', parentCompanies.length);
            populateSelects();
        } catch (error) {
            loadFailures.parents = true;
            parentCompanies = [];
            console.error('❌ loadParentCompanies xətası:', error);
            populateSelects();
        }
    }

    async function loadPartnerCompanies() {
        try {
            const companyCode = myCompany?.company_code || window.taskManager?.myCompany?.company_code || userData?.companyCode || window.taskManager?.userData?.companyCode;
            const tmPartners = ensureArray(window.taskManager?.partners);
            if (tmPartners.length) {
                partners = tmPartners;
            } else if (companyCode && typeof window.getPartnersWithCache === 'function') {
                const response = await window.getPartnersWithCache(companyCode);
                partners = normalizeListResponse(response);
            } else {
                partners = [];
            }
            loadFailures.partners = false;
            console.log('partners count', partners.length);
            populateSelects();
        } catch (error) {
            loadFailures.partners = true;
            partners = [];
            console.error('❌ loadPartnerCompanies xətası:', error);
            populateSelects();
        }
    }

    function buildCompanyOptions() {
        const currentCompany = myCompany || window.taskManager?.myCompany || null;
        let html = '<option value="">Şirkət seçin</option>';

        if (currentCompany?.id) {
            html += `<option value="${currentCompany.id}" data-company-code="${escapeHtml(currentCompany.company_code || '')}" data-company-name="${escapeHtml(currentCompany.company_name || '')}" data-is-my-company="true">🏢 ${escapeHtml(currentCompany.company_name || currentCompany.company_code || 'Mənim şirkətim')}</option>`;
        }

        const seen = new Set([String(currentCompany?.id || '')]);
        subsidiaryCompanies.forEach((company) => {
            const id = company.id || company.company_id;
            const code = company.company_code || company.code || '';
            const name = company.company_name || company.name || code || `Şirkət ${id || ''}`;
            if (!id && !code && !name) return;
            const key = String(id || code || name);
            if (seen.has(key)) return;
            seen.add(key);
            html += `<option value="${escapeHtml(id || '')}" data-company-code="${escapeHtml(code)}" data-company-name="${escapeHtml(name)}" data-is-my-company="false">🏢 ${escapeHtml(name)}</option>`;
        });

        return html;
    }

    function buildDepartmentOptions() {
        const failed = loadFailures.departments;
        if (failed) return '<option value="">Xəta baş verdi</option>';

        const arr = ensureArray(departments).filter(d => d.is_active !== false);
        let html = '<option value="">Şöbə seçin</option>';
        arr.forEach(dep => {
            const id = dep.id || dep.department_id;
            const name = formatDepartmentName(dep);
            html += `<option value="${escapeHtml(id || '')}">${escapeHtml(name)}</option>`;
        });
        if (arr.length === 0) html = '<option value="">Şöbə tapılmadı</option>';
        return html;
    }

    function buildEmployeeOptions(list, emptyLabel = 'İşçi seçin (boş qoymaq olar)') {
        const arr = ensureArray(list).filter(emp => emp && emp.id !== undefined && emp.id !== null);
        if (!arr.length) return '<option value="">İşçi tapılmadı</option>';
        let html = `<option value="">${escapeHtml(emptyLabel)}</option>`;
        arr.forEach(emp => {
            const id = emp.id;
            const name = formatEmployeeName(emp);
            const departmentId = emp.department_id || emp.departmentId || emp.department?.id || '';
            html += `<option value="${escapeHtml(id)}" data-department-id="${escapeHtml(departmentId)}" data-employee-name="${escapeHtml(name)}">👤 ${escapeHtml(name)}</option>`;
        });
        return html;
    }

    function buildWorkTypeOptions() {
        if (loadFailures.workTypes) return '<option value="">Xəta baş verdi</option>';
        const arr = ensureArray(workTypes).filter(w => w.is_active !== false);
        let html = '<option value="">İş növü seçin</option>';
        arr.forEach(item => {
            const id = item.id || item.work_type_id;
            const name = formatWorkTypeName(item);
            html += `<option value="${escapeHtml(id || '')}">${escapeHtml(name)}</option>`;
        });
        if (!arr.length) html = '<option value="">İş növü tapılmadı</option>';
        return html;
    }

    function buildParentOptions() {
        if (loadFailures.parents) return '<option value="">Xəta baş verdi</option>';
        const arr = ensureArray(parentCompanies);
        let html = '<option value="">Şirkət seçin</option>';
        arr.forEach(item => {
            const targetCompanyId = item.company_id || item.id || item.target_company_id || item.parent_company_id;
            const companyCode = item.company_code || item.parent_company_code || item.code || item.target_company_code || '';
            const companyName = item.company_name || item.name || item.target_company_name || item.parent_company_name || companyCode || `Şirkət ${targetCompanyId || ''}`;
            if (!targetCompanyId && !companyCode && !companyName) return;
            html += `<option value="${escapeHtml(targetCompanyId || '')}" data-company-code="${escapeHtml(companyCode)}" data-company-name="${escapeHtml(companyName)}">⬆️ ${escapeHtml(companyName)}</option>`;
        });
        if (!arr.length) html = '<option value="">Şirkət tapılmadı</option>';
        return html;
    }

    function getPartnerCounterparty(partner) {
        const currentCode = myCompany?.company_code || userData?.companyCode || window.taskManager?.userData?.companyCode || '';
        const requesterCode = partner.requester_company_code || partner.company_code || partner.requester?.company_code || '';
        const targetCode = partner.target_company_code || partner.partner_company_code || partner.partner_code || '';

        if (requesterCode && requesterCode === currentCode) {
            return {
                companyId: partner.target_company_id || partner.partner_company_id || partner.company_id || partner.id,
                companyCode: targetCode || partner.target_company_code || partner.partner_code || '',
                companyName: partner.partner_company_name || partner.target_company_name || partner.partner_name || partner.company_name || ''
            };
        }

        if (targetCode && targetCode === currentCode) {
            return {
                companyId: partner.requester_company_id || partner.partner_company_id || partner.company_id || partner.id,
                companyCode: requesterCode || partner.requester_company_code || '',
                companyName: partner.requester_company_name || partner.partner_company_name || partner.requester_name || partner.company_name || ''
            };
        }

        return {
            companyId: partner.partner_company_id || partner.target_company_id || partner.requester_company_id || partner.company_id || partner.id,
            companyCode: partner.partner_company_code || partner.target_company_code || partner.requester_company_code || partner.company_code || '',
            companyName: partner.partner_company_name || partner.target_company_name || partner.requester_company_name || partner.company_name || ''
        };
    }

    function buildPartnerOptions() {
        if (loadFailures.partners) return '<option value="">Xəta baş verdi</option>';
        const arr = ensureArray(partners);
        let html = '<option value="">Partnyor seçin</option>';
        arr.forEach(item => {
            const relationId = item.id || item.partner_id || item.relation_id || item.partner_relation_id;
            const counterparty = getPartnerCounterparty(item);
            const name = counterparty.companyName || item.partner_company_name || item.target_company_name || item.requester_company_name || item.company_name || `Partnyor ${relationId || ''}`;
            const code = counterparty.companyCode || item.partner_company_code || item.target_company_code || item.requester_company_code || item.company_code || '';
            const companyId = counterparty.companyId || item.partner_company_id || item.target_company_id || item.requester_company_id || item.company_id || relationId || '';
            html += `<option value="${escapeHtml(relationId || '')}" data-partner-company-id="${escapeHtml(companyId || '')}" data-company-code="${escapeHtml(code)}" data-company-name="${escapeHtml(name)}">🤝 ${escapeHtml(name)}</option>`;
        });
        if (!arr.length) html = '<option value="">Partnyor tapılmadı</option>';
        return html;
    }

    function populateSelects() {
        const companySelect = getSelect('newtaskCompanySelect');
        const parentSelect = getSelect('newtaskParentSelect');
        const partnerSelect = getSelect('newtaskPartnerSelect');
        const executorSelect = getSelect('newtaskExecutorSelect');
        const departmentSelect = getSelect('newtaskDepartmentSelect');
        const taskTypeSelect = getSelect('newtaskTaskTypeSelect');
        const otherExecutorSelect = getSelect('newtaskOtherExecutorSelect');

        const currentCompanyValue = companySelect?.value || '';
        const currentParentValue = parentSelect?.value || '';
        const currentPartnerValue = partnerSelect?.value || '';
        const currentExecutorValue = executorSelect?.value || '';
        const currentDepartmentValue = departmentSelect?.value || '';
        const currentWorkTypeValue = taskTypeSelect?.value || '';
        const currentOtherExecutorValue = otherExecutorSelect?.value || '';

        if (companySelect) {
            companySelect.innerHTML = buildCompanyOptions();
            companySelect.value = currentCompanyValue || companySelect.value;
        }
        if (parentSelect) {
            parentSelect.innerHTML = buildParentOptions();
            parentSelect.value = currentParentValue || parentSelect.value;
        }
        if (partnerSelect) {
            partnerSelect.innerHTML = buildPartnerOptions();
            partnerSelect.value = currentPartnerValue || partnerSelect.value;
        }
        if (executorSelect) {
            executorSelect.innerHTML = buildEmployeeOptions(employees, 'İşçi seçin (boş qoymaq olar)');
            executorSelect.value = currentExecutorValue || executorSelect.value;
        }
        if (departmentSelect) {
            departmentSelect.innerHTML = buildDepartmentOptions();
            departmentSelect.value = currentDepartmentValue || departmentSelect.value;
        }
        if (taskTypeSelect) {
            taskTypeSelect.innerHTML = buildWorkTypeOptions();
            taskTypeSelect.value = currentWorkTypeValue || taskTypeSelect.value;
        }
        if (otherExecutorSelect) {
            const list = otherExecutorEmployees.length ? otherExecutorEmployees : [];
            otherExecutorSelect.innerHTML = list.length
                ? buildEmployeeOptions(list, 'İşçi seçin (boş qoymaq olar)')
                : '<option value="">İşçi seçin (boş qoymaq olar)</option>';
            otherExecutorSelect.value = currentOtherExecutorValue || '';
            otherExecutorSelect.disabled = false;
        }

        console.log('companies count', (myCompany?.id ? 1 : 0) + subsidiaryCompanies.length);
        console.log('departments count', ensureArray(departments).length);
        console.log('employees count', ensureArray(employees).length);
        console.log('workTypes count', ensureArray(workTypes).length);
        console.log('parents count', ensureArray(parentCompanies).length);
        console.log('partners count', ensureArray(partners).length);
    }

    function updateModalFileList() {
        const fileListEl = getSelect('newtaskFileList');
        if (!fileListEl) return;

        if (!window.modalSelectedFiles || window.modalSelectedFiles.length === 0) {
            fileListEl.innerHTML = '<div class="newtask-file-list-empty"><i class="fas fa-inbox"></i><span>Heç bir fayl seçilməyib</span></div>';
            return;
        }

        let html = '<div class="newtask-file-list-header"><i class="fas fa-paperclip"></i><span>Seçilmiş fayllar</span></div>';
        window.modalSelectedFiles.forEach((file, index) => {
            const isAudio = file.type?.startsWith('audio/') || file.name?.includes('recording') || file.name?.includes('webm');
            const isImage = file.type?.startsWith('image/');
            const icon = isAudio ? 'fas fa-microphone' : (isImage ? 'fas fa-image' : 'fas fa-file-lines');
            const iconClass = isAudio ? 'audio' : (isImage ? 'image' : 'file');
            const size = formatFileSize(file.size);
            html += `
                <div class="newtask-file-item ${iconClass}" data-index="${index}">
                    <div class="newtask-file-item-icon"><i class="${icon}" aria-hidden="true"></i></div>
                    <div class="newtask-file-item-meta">
                        <div class="newtask-file-item-name">${escapeHtml(file.name)}</div>
                        <div class="newtask-file-item-size">${size}</div>
                    </div>
                    <button type="button" class="newtask-file-remove" onclick="removeModalFile(${index})" aria-label="Faylı sil">
                        <i class="fas fa-circle-xmark" aria-hidden="true"></i>
                    </button>
                </div>
            `;
        });

        fileListEl.innerHTML = html;
    }

    function fileSignature(file) {
        return [file.name, file.size, file.type, file.lastModified || ''].join('|');
    }

    function addFilesToModal(files) {
        if (!files || !files.length) return;
        window.modalSelectedFiles = window.modalSelectedFiles || [];
        const existing = new Set(window.modalSelectedFiles.map(fileSignature));
        files.forEach(file => {
            const sig = fileSignature(file);
            if (!existing.has(sig)) {
                existing.add(sig);
                window.modalSelectedFiles.push(file);
            }
        });
        updateModalFileList();
    }

    function removeModalFile(index) {
        if (!window.modalSelectedFiles) return;
        window.modalSelectedFiles.splice(index, 1);
        updateModalFileList();
    }

    window.removeModalFile = removeModalFile;

    function clearAudioState(removeSavedAudio = false) {
        if (recordedAudioUrl) {
            URL.revokeObjectURL(recordedAudioUrl);
            recordedAudioUrl = '';
        }
        recordedAudioBlob = null;
        pendingAudioFile = null;
        audioChunks = [];

        if (audioData) audioData.value = '';
        if (audioFilename) audioFilename.value = '';

        if (removeSavedAudio && window.modalSelectedFiles?.length) {
            window.modalSelectedFiles = window.modalSelectedFiles.filter(file => !(file.type?.startsWith('audio/') || file.name?.includes('recording') || file.name?.includes('webm')));
            updateModalFileList();
        }

        if (audioPreview) audioPreview.style.display = 'none';
        if (recordedAudio) recordedAudio.src = '';
        if (audioStatus) audioStatus.innerHTML = '<i class="fas fa-circle"></i><span>Səs qeydi hazırdır</span>';

        const startBtnEl = getSelect('newtaskStartRecord');
        const stopBtnEl = getSelect('newtaskStopRecord');
        const saveBtnEl = getSelect('newtaskSaveRecord');
        const cancelBtnEl = getSelect('newtaskCancelRecord');
        if (startBtnEl) startBtnEl.disabled = false;
        if (stopBtnEl) stopBtnEl.disabled = true;
        if (saveBtnEl) saveBtnEl.disabled = true;
        if (cancelBtnEl) cancelBtnEl.disabled = true;
    }

    async function blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    async function saveRecordedAudio() {
        if (!recordedAudioBlob) {
            showNotification('Səs qeydi tapılmadı', 'error');
            return;
        }

        const timestamp = new Date();
        const filename = `recording-${timestamp.getFullYear()}${String(timestamp.getMonth() + 1).padStart(2, '0')}${String(timestamp.getDate()).padStart(2, '0')}-${String(timestamp.getHours()).padStart(2, '0')}${String(timestamp.getMinutes()).padStart(2, '0')}${String(timestamp.getSeconds()).padStart(2, '0')}.webm`;
        const file = new File([recordedAudioBlob], filename, { type: 'audio/webm' });
        const base64 = await blobToBase64(recordedAudioBlob);

        if (audioData) audioData.value = base64;
        if (audioFilename) audioFilename.value = filename;

        pendingAudioFile = file;
        addFilesToModal([file]);
        showNotification('Səs qeydi saxlandı', 'success');
    }

    async function startAudioRecording() {
        try {
            if (!navigator.mediaDevices?.getUserMedia) {
                throw new Error('Brauzer səs yazmanı dəstəkləmir');
            }

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioStream = stream;
            audioChunks = [];
            recordedAudioBlob = null;
            pendingAudioFile = null;
            discardAudioOnStop = false;
            if (audioData) audioData.value = '';
            if (audioFilename) audioFilename.value = '';

            const preferredMimeType = (typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported('audio/webm')) ? 'audio/webm' : '';
            mediaRecorder = preferredMimeType ? new MediaRecorder(stream, { mimeType: preferredMimeType }) : new MediaRecorder(stream);

            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) audioChunks.push(event.data);
            };

            mediaRecorder.onstop = () => {
                if (discardAudioOnStop) {
                    discardAudioOnStop = false;
                    audioChunks = [];
                    recordedAudioBlob = null;
                    pendingAudioFile = null;
                    if (audioData) audioData.value = '';
                    if (audioFilename) audioFilename.value = '';
                    if (audioPreview) audioPreview.style.display = 'none';
                    if (recordedAudio) recordedAudio.src = '';
                    return;
                }
                recordedAudioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
                if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
                recordedAudioUrl = URL.createObjectURL(recordedAudioBlob);
                if (recordedAudio) recordedAudio.src = recordedAudioUrl;
                if (audioPreview) audioPreview.style.display = 'block';
                if (audioStatus) audioStatus.innerHTML = '<i class="fas fa-circle"></i><span>Qeyd dayandırıldı</span>';
                if (saveBtn) saveBtn.disabled = false;
                if (cancelBtn) cancelBtn.disabled = false;
            };

            mediaRecorder.start();
            isRecording = true;
            if (audioStatus) audioStatus.innerHTML = '<i class="fas fa-circle"></i><span>Yazılır...</span>';
            if (startBtn) startBtn.disabled = true;
            if (stopBtn) stopBtn.disabled = false;
            if (saveBtn) saveBtn.disabled = true;
            if (cancelBtn) cancelBtn.disabled = false;
        } catch (error) {
            console.error('❌ Səs yazma xətası:', error);
            showNotification('Mikrofon icazəsi alınmadı və ya brauzer səs yazmanı dəstəkləmir', 'error');
            clearAudioState(false);
            if (audioStream) {
                audioStream.getTracks().forEach(track => track.stop());
                audioStream = null;
            }
        }
    }

    function stopAudioRecording(discard = false) {
        stopRecording(discard);
        if (audioStream) {
            audioStream.getTracks().forEach(track => track.stop());
            audioStream = null;
        }
        if (animationId) cancelAnimationFrame(animationId);
        isRecording = false;
    }

    function setupAudioRecorder() {
        if (!audioRecorderSupported) return;
        if (!startBtn || !stopBtn || !saveBtn || !cancelBtn) bindModalRefs();

        if (!startBtn || !stopBtn || !saveBtn || !cancelBtn) return;

        startBtn.addEventListener('click', startAudioRecording);
        stopBtn.addEventListener('click', () => stopAudioRecording(false));
        saveBtn.addEventListener('click', saveRecordedAudio);
        cancelBtn.addEventListener('click', () => {
            stopAudioRecording(true);
            clearAudioState(true);
        });

        window.audioRecorder = {
            reset: () => clearAudioState(true)
        };
    }

    function setupFileUpload() {
        window.modalSelectedFiles = window.modalSelectedFiles || [];
        if (!fileZone || !fileInput || !fileList) bindModalRefs();
        if (!fileZone || !fileInput || !fileList) return;

        const openPicker = (event) => {
            event.preventDefault();
            fileInput.click();
        };

        const onInputChange = (event) => {
            const files = Array.from(event.target.files || []);
            addFilesToModal(files);
            fileInput.value = '';
        };

        const onDragOver = (event) => {
            event.preventDefault();
            fileZone.classList.add('is-dragover');
        };

        const onDragLeave = () => {
            fileZone.classList.remove('is-dragover');
        };

        const onDrop = (event) => {
            event.preventDefault();
            fileZone.classList.remove('is-dragover');
            const files = Array.from(event.dataTransfer?.files || []);
            addFilesToModal(files);
        };

        fileZone.addEventListener('click', openPicker);
        fileInput.addEventListener('change', onInputChange);
        fileZone.addEventListener('dragover', onDragOver);
        fileZone.addEventListener('dragleave', onDragLeave);
        fileZone.addEventListener('drop', onDrop);

        updateModalFileList();
    }

    function setupPrintScreenCapture() {
        if (window.__newTaskPasteHandlerAttached) return;
        window.__newTaskPasteHandlerAttached = true;

        document.addEventListener('paste', async (event) => {
            if (!modalOverlay?.classList.contains('active')) return;
            const clipboardItems = Array.from(event.clipboardData?.items || []);
            const imageItem = clipboardItems.find(item => item.kind === 'file' && item.type.startsWith('image/'));
            if (!imageItem) return;

            const blob = imageItem.getAsFile();
            if (!blob) return;

            const now = new Date();
            const filename = `screenshot-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}.png`;
            const file = new File([blob], filename, { type: blob.type || 'image/png' });
            addFilesToModal([file]);
        });
    }

    async function loadTargetCompanyEmployeesByCompanyCode(companyCode, options = {}) {
        const otherSelect = getSelect('newtaskOtherExecutorSelect');
        if (!otherSelect) return;

        otherSelect.innerHTML = '<option value="">Yüklənir...</option>';
        otherSelect.disabled = true;

        try {
            if (!companyCode) {
                otherExecutorEmployees = [];
                otherSelect.innerHTML = '<option value="">İşçi seçin (boş qoymaq olar)</option>';
                otherSelect.disabled = false;
                return;
            }

            const ownCode = myCompany?.company_code || userData?.companyCode || window.taskManager?.userData?.companyCode;
            if (options.excludeOwnCompany && ownCode && String(companyCode) === String(ownCode)) {
                otherExecutorEmployees = ensureArray(employees);
            } else {
                let response = [];
                if (typeof window.getEmployeesWithCache === 'function') {
                    response = await window.getEmployeesWithCache(companyCode);
                }
                response = normalizeListResponse(response);

                if (!response.length && typeof window._apiGet === 'function') {
                    const fallback = await window._apiGet(`/users/company/${companyCode}`);
                    response = normalizeListResponse(fallback);
                }

                otherExecutorEmployees = response.filter(emp => emp && emp.id !== undefined && emp.id !== null);
            }

            const html = buildEmployeeOptions(otherExecutorEmployees, 'İşçi seçin (boş qoymaq olar)');
            otherSelect.innerHTML = otherExecutorEmployees.length ? html : '<option value="">İşçi tapılmadı</option>';
            otherSelect.disabled = false;
            console.log('employees count', otherExecutorEmployees.length);
        } catch (error) {
            console.error('❌ target company employees xətası:', error);
            otherExecutorEmployees = [];
            otherSelect.innerHTML = '<option value="">Xəta baş verdi</option>';
            otherSelect.disabled = false;
        }
    }

    function getCompanyCodeFromSelect(selectEl) {
        if (!selectEl) return '';
        const option = selectEl.options?.[selectEl.selectedIndex];
        return option?.dataset?.companyCode || option?.dataset?.code || '';
    }

    function getCompanyNameFromSelect(selectEl) {
        if (!selectEl) return '';
        const option = selectEl.options?.[selectEl.selectedIndex];
        return option?.dataset?.companyName || option?.dataset?.name || option?.textContent?.replace(/^[🏢⬆️🤝]\s*/g, '').trim() || '';
    }

    function autoSelectDepartmentByEmployee(employeeId) {
        const departmentSelect = getSelect('newtaskDepartmentSelect');
        if (!departmentSelect || !employeeId) return;

        const allEmployees = [...ensureArray(employees), ...ensureArray(otherExecutorEmployees)];
        const emp = allEmployees.find(item => String(item.id) === String(employeeId));
        if (!emp?.department_id) return;

        const targetDepartmentId = String(emp.department_id);
        const hasOption = Array.from(departmentSelect.options || []).some(opt => String(opt.value) === targetDepartmentId);
        if (!hasOption) return;

        departmentSelect.value = targetDepartmentId;
        departmentSelect.dispatchEvent(new Event('change', { bubbles: true }));
        showAutoSelectNotification('departament', formatEmployeeName(emp));
    }

    function attachModalEvents() {
        if (eventsAttached) return;
        eventsAttached = true;

        const closeBtn = getSelect('newtaskModalClose');
        const cancelBtnModal = getSelect('newtaskCancelBtn');
        const saveBtnModal = getSelect('newtaskSaveBtn');
        const companySelect = getSelect('newtaskCompanySelect');
        const parentSelect = getSelect('newtaskParentSelect');
        const partnerSelect = getSelect('newtaskPartnerSelect');
        const executorSelect = getSelect('newtaskExecutorSelect');
        const otherExecutorSelect = getSelect('newtaskOtherExecutorSelect');

        closeBtn?.addEventListener('click', closeModal);
        cancelBtnModal?.addEventListener('click', closeModal);
        saveBtnModal?.addEventListener('click', handleSubmit);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modalOverlay?.classList.contains('active')) closeModal();
        });

        modalOverlay?.addEventListener('click', (e) => {
            if (e.target === modalOverlay) closeModal();
        });

        companySelect?.addEventListener('change', async (e) => {
            const selectedOption = e.target.options?.[e.target.selectedIndex];
            const companyCode = selectedOption?.dataset?.companyCode || selectedOption?.dataset?.code || '';
            if (!companyCode) {
                otherExecutorEmployees = [];
                if (otherExecutorSelect) otherExecutorSelect.innerHTML = '<option value="">İşçi seçin (boş qoymaq olar)</option>';
                return;
            }
            await loadTargetCompanyEmployeesByCompanyCode(companyCode, { excludeOwnCompany: false });
        });

        parentSelect?.addEventListener('change', async (e) => {
            const selectedOption = e.target.options?.[e.target.selectedIndex];
            const companyCode = selectedOption?.dataset?.companyCode || '';
            if (!companyCode) {
                otherExecutorEmployees = [];
                if (otherExecutorSelect) otherExecutorSelect.innerHTML = '<option value="">İşçi seçin (boş qoymaq olar)</option>';
                return;
            }
            await loadTargetCompanyEmployeesByCompanyCode(companyCode, { excludeOwnCompany: true });
        });

        partnerSelect?.addEventListener('change', async (e) => {
            const selectedOption = e.target.options?.[e.target.selectedIndex];
            const companyCode = selectedOption?.dataset?.companyCode || '';
            if (!companyCode) {
                otherExecutorEmployees = [];
                if (otherExecutorSelect) otherExecutorSelect.innerHTML = '<option value="">İşçi seçin (boş qoymaq olar)</option>';
                return;
            }
            await loadTargetCompanyEmployeesByCompanyCode(companyCode, { excludeOwnCompany: true });
        });

        executorSelect?.addEventListener('change', async (e) => {
            if (e.target.value) autoSelectDepartmentByEmployee(e.target.value);
        });

        otherExecutorSelect?.addEventListener('change', async (e) => {
            if (e.target.value) autoSelectDepartmentByEmployee(e.target.value);
        });
    }

    function collectFilesForUpload() {
        const files = [];
        const seen = new Set();

        const pushFile = (file) => {
            if (!file) return;
            const sig = fileSignature(file);
            if (seen.has(sig)) return;
            seen.add(sig);
            files.push(file);
        };

        if (fileInput?.files?.length) {
            Array.from(fileInput.files).forEach(pushFile);
        }
        if (window.modalSelectedFiles?.length) {
            window.modalSelectedFiles.forEach(pushFile);
        }

        if (audioData?.value && audioFilename?.value && !files.some(file => file.name === audioFilename.value)) {
            try {
                const base64 = audioData.value.includes(',') ? audioData.value.split(',')[1] : audioData.value;
                const byteCharacters = atob(base64);
                const byteArray = new Uint8Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteArray[i] = byteCharacters.charCodeAt(i);
                }
                const audioBlob = new Blob([byteArray], { type: 'audio/webm' });
                pushFile(new File([audioBlob], audioFilename.value, { type: 'audio/webm' }));
            } catch (error) {
                console.error('❌ Audio file bərpası xətası:', error);
            }
        }

        return files;
    }

    function resolveSelectedTargetForSubmit() {
        const companySelect = getSelect('newtaskCompanySelect');
        const parentSelect = getSelect('newtaskParentSelect');
        const partnerSelect = getSelect('newtaskPartnerSelect');

        if (currentTaskType === 'internal') {
            const targetCompanyId = toIntOrNull(companySelect?.value);
            const selectedOption = companySelect?.options?.[companySelect.selectedIndex];
            return {
                targetCompanyId: targetCompanyId,
                targetCompanyCode: selectedOption?.dataset?.companyCode || '',
                selectedCompanyName: selectedOption?.dataset?.companyName || selectedOption?.textContent?.replace(/^[🏢]\s*/g, '').replace('(Mənim şirkətim)', '').trim() || selectedOption?.textContent?.trim() || ''
            };
        }

        if (currentTaskType === 'parent') {
            const targetCompanyId = toIntOrNull(parentSelect?.value);
            const selectedOption = parentSelect?.options?.[parentSelect.selectedIndex];
            return {
                targetCompanyId: targetCompanyId,
                targetCompanyCode: selectedOption?.dataset?.companyCode || '',
                selectedCompanyName: selectedOption?.dataset?.companyName || selectedOption?.textContent?.replace(/^[⬆️]\s*/g, '').trim() || selectedOption?.textContent?.trim() || ''
            };
        }

        const partnerRelationId = toIntOrNull(partnerSelect?.value);
        const selectedOption = partnerSelect?.options?.[partnerSelect.selectedIndex];
        const partnerCompanyId = selectedOption?.dataset?.partnerCompanyId || selectedOption?.dataset?.companyId || selectedOption?.dataset?.companyCode || '';
        return {
            partnerRelationId: partnerRelationId,
            targetCompanyId: partnerCompanyId || partnerRelationId,
            targetCompanyCode: selectedOption?.dataset?.companyCode || '',
            selectedCompanyName: selectedOption?.dataset?.companyName || selectedOption?.textContent?.replace(/^[🤝]\s*/g, '').trim() || selectedOption?.textContent?.trim() || ''
        };
    }

    function getAssignedToValue() {
        const executorSelect = getSelect('newtaskExecutorSelect');
        const otherExecutorSelect = getSelect('newtaskOtherExecutorSelect');
        const executorId = toIntOrNull(executorSelect?.value);
        const otherExecutorId = toIntOrNull(otherExecutorSelect?.value);
        if (executorId) return executorId;
        if (otherExecutorId) return otherExecutorId;
        return null;
    }

    async function uploadFilesAndCollectUuids(files) {
        const uploadedUuids = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                const formData = new FormData();
                formData.append('file', file);
                const isAudio = file.type?.startsWith('audio/') || file.name?.includes('recording') || file.name?.includes('.webm');
                formData.append('category', isAudio ? 'audio_recording' : 'company_file');
                if (isAudio) formData.append('is_audio_recording', 'true');

                const uploadResponse = await window.makeApiRequest('/files/simple-upload', 'POST', formData, true);
                if (uploadResponse?.success === false || uploadResponse?.error || uploadResponse?.detail) {
                    throw new Error(uploadResponse?.error || uploadResponse?.detail || uploadResponse?.message || `${file.name} yüklənə bilmədi`);
                }

                const fileUuid = uploadResponse?.data?.uuid || uploadResponse?.uuid || uploadResponse?.file_id || uploadResponse?.data?.file_id || uploadResponse?.data?.id || uploadResponse?.id;
                if (fileUuid) {
                    uploadedUuids.push(fileUuid);
                } else {
                    console.error(`❌ ${file.name} üçün UUID tapılmadı`, uploadResponse);
                }
            } catch (error) {
                console.error(`❌ Fayl yükləmə xətası (${file.name}):`, error);
            }
        }
        return uploadedUuids;
    }


    function getTaskEndpoint(taskType, taskId) {
        if (taskType === 'parent') return `/tasks-external/${taskId}`;
        if (taskType === 'partner') return `/partner-tasks/${taskId}`;
        return `/tasks/${taskId}`;
    }

    function parsePgArrayValues(value) {
        if (!value) return [];
        if (Array.isArray(value)) return value.filter(Boolean);
        if (typeof value !== 'string') return [];

        const cleaned = value.trim();
        if (!cleaned) return [];

        const normalized = cleaned.replace(/^\{/, '').replace(/\}$/, '').trim();
        if (!normalized) return [];

        return normalized.split(',').map(item => item.trim().replace(/^"(.*)"$/, '$1')).filter(Boolean);
    }

    function sanitizePayload(payload, requiredKeys = []) {
        const cleaned = { ...payload };
        Object.keys(cleaned).forEach((key) => {
            if (requiredKeys.includes(key)) return;
            const value = cleaned[key];
            if (value === undefined || value === null || value === '' || Number.isNaN(value)) {
                delete cleaned[key];
            }
        });
        return cleaned;
    }

    function parseTaskIdFromResponse(response) {
        return response?.task?.id || response?.id || response?.data?.id || response?.task_id || response?.data?.task_id || response?.data?.task?.id || null;
    }

    function getApiErrorMessage(response, fallback = 'Task yaradıla bilmədi') {
        const errorValue = response?.error || response?.detail || response?.message || response?.data?.error || response?.data?.detail || response?.data?.message;
        return errorValue ? String(errorValue) : fallback;
    }

    function buildInternalTaskPayload(context) {
        const { taskTitle, taskDescription, assignedTo, taskStatus, dueDateValue, departmentSelect, taskTypeSelect, metadata, creatorName } = context;
        return sanitizePayload({
            task_title: taskTitle,
            task_description: taskDescription || '',
            assigned_to: assignedTo,
            priority: 'medium',
            status: taskStatus,
            due_date: dueDateValue,
            progress_percentage: 0,
            department_id: parseInt(departmentSelect.value, 10),
            work_type_id: parseInt(taskTypeSelect.value, 10),
            is_billable: false,
            metadata: JSON.stringify(metadata),
            company_id: window.taskManager.userData.companyId,
            created_by: window.taskManager.userData.userId,
            creator_name: creatorName
        }, ['task_description', 'metadata']);
    }

    function buildParentTaskPayload(context) {
        const { taskTitle, taskDescription, assignedTo, taskStatus, dueDateValue, departmentSelect, taskTypeSelect, targetCompanyId, targetCompanyName, creatorName } = context;
        return sanitizePayload({
            company_id: window.taskManager.userData.companyId,
            task_title: taskTitle,
            task_description: taskDescription || '',
            assigned_to: assignedTo,
            department_id: parseInt(departmentSelect.value, 10),
            priority: 'medium',
            status: taskStatus,
            due_date: dueDateValue,
            work_type_id: parseInt(taskTypeSelect.value, 10),
            progress_percentage: 0,
            is_billable: false,
            target_company_id: targetCompanyId,
            target_company_name: targetCompanyName,
            viewable_company_id: targetCompanyId,
            created_by: window.taskManager.userData.userId,
            creator_name: creatorName,
            is_for_subsidiary: false
        }, ['task_description']);
    }

    function buildPartnerTaskPayload(context) {
        const { taskTitle, taskDescription, assignedTo, taskStatus, dueDateValue, departmentSelect, taskTypeSelect, partnerRelationId, partnerCompanyName, partnerCompanyId, partnerCompanyCode, creatorName, executorSource, forwardedByValue } = context;
        const taskCode = `PT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const metadata = {
            my_company_id: window.taskManager.userData.companyId,
            my_company_name: window.taskManager.userData.companyName,
            partner_relation_id: partnerRelationId,
            partner_company_id: partnerCompanyId,
            partner_company_name: partnerCompanyName,
            partner_company_code: partnerCompanyCode,
            created_by_company: window.taskManager.userData.companyName,
            created_by_company_id: window.taskManager.userData.companyId,
            created_by_user_id: window.taskManager.userData.userId,
            created_by_name: creatorName,
            created_at: new Date().toISOString(),
            task_type: 'partner',
            executor_source: executorSource,
            deadline_status: taskStatus,
            deadline_date: dueDateValue
        };

        return sanitizePayload({
            task_code: taskCode,
            task_title: taskTitle,
            partner_id: partnerRelationId,
            product_serial: `SN-${Date.now()}`,
            company_name: window.taskManager.userData.companyName,
            company_id: window.taskManager.userData.companyId,
            partner_company_name: partnerCompanyName,
            task_description: taskDescription || '',
            assigned_to: assignedTo,
            department_id: parseInt(departmentSelect.value, 10),
            priority: 'medium',
            status: taskStatus,
            due_date: dueDateValue,
            work_type_id: parseInt(taskTypeSelect.value, 10),
            progress_percentage: 0,
            is_billable: false,
            metadata: JSON.stringify(metadata),
            created_by: window.taskManager.userData.userId,
            creator_name: creatorName,
            forwarded_by: forwardedByValue,
            product_model: 'Default Model',
            product_category: 'General',
            product_condition: 'new',
            delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            estimated_completion_days: 5,
            partner_priority: 'medium',
            service_type: 'other',
            warranty_status: 'active',
            payment_status: 'pending',
            contract_number: `CT-${Date.now()}`,
            purchase_order_number: `PO-${Date.now()}`
        }, ['task_description', 'metadata']);
    }

    async function addUuidsToTask(taskId, uuids, taskType = 'internal') {
        if (!taskId || !uuids || uuids.length === 0) {
            console.log('ℹ️ Əlavə ediləcək UUID yoxdur');
            return false;
        }

        const endpoint = getTaskEndpoint(taskType, taskId);

        try {
            const taskResponse = await window.makeApiRequest(endpoint, 'GET', null, true);
            if (taskResponse?.success === false || taskResponse?.error || taskResponse?.detail) {
                throw new Error(taskResponse?.error || taskResponse?.detail || taskResponse?.message || 'Mövcud file_uuids alınmadı');
            }

            const task = taskResponse?.data || taskResponse?.task || taskResponse || {};
            const existingUuids = parsePgArrayValues(task.file_uuids);
            const allUuids = [...existingUuids];

            uuids.forEach((uuid) => {
                if (uuid && !allUuids.includes(uuid)) {
                    allUuids.push(uuid);
                }
            });

            const fileUuidsString = '{' + allUuids.join(',') + '}';
            const updateResponse = await window.makeApiRequest(endpoint, 'PATCH', { file_uuids: fileUuidsString }, true);
            if (updateResponse?.success === false || updateResponse?.error || updateResponse?.detail) {
                throw new Error(updateResponse?.error || updateResponse?.detail || updateResponse?.message || 'file_uuids yenilənmədi');
            }

            console.log(`✅ Task ${taskId}-ə ${uuids.length} fayl əlavə edildi. Ümumi: ${allUuids.length}`);
            return true;
        } catch (error) {
            if (taskType !== 'internal') {
                console.warn(`⚠️ ${taskType} task üçün file_uuids PATCH uğursuz oldu:`, error);
            } else {
                console.error('❌ UUID əlavə etmə xətası:', error);
            }
            return false;
        }
    }

    async function refreshAfterTaskCreation(taskType = 'internal') {
        console.log(`🔄 Task yaradıldı (${taskType}), məlumatlar yenilənir...`);

        await new Promise(resolve => setTimeout(resolve, 500));

        if (window.dbManager) {
            await window.dbManager.clearCache('tasks');
            await window.dbManager.clearCache('externalTasks');
            await window.dbManager.clearCache('partnerTasks');
            console.log('✅ IndexedDB cache təmizləndi');
        }

        if (window.TaskCache?.clear) {
            window.TaskCache.clear();
        }

        if (window.taskManager?.loadActiveTasks) {
            await window.taskManager.loadActiveTasks(1, true);
        }
        if (window.taskManager?.loadExternalTasks) {
            await window.taskManager.loadExternalTasks(1, false);
        }
        if (window.taskManager?.loadPartnerTasks) {
            await window.taskManager.loadPartnerTasks(1);
        }
        if (window.ExternalTableManager?.loadTasks && taskType === 'parent') {
            await window.ExternalTableManager.loadTasks(true);
        }
        if (window.PartnerTableManager?.loadTasks && taskType === 'partner') {
            await window.PartnerTableManager.loadTasks(1, true);
        }
    }

    async function handleSubmit() {
        let createdTaskId = null;
        try {
            const companySelect = getSelect('newtaskCompanySelect');
            const parentSelect = getSelect('newtaskParentSelect');
            const partnerSelect = getSelect('newtaskPartnerSelect');
            const departmentSelect = getSelect('newtaskDepartmentSelect');
            const taskTypeSelect = getSelect('newtaskTaskTypeSelect');
            const dueDateInput = getSelect('newtaskDueDate');
            const descriptionInput = getSelect('newtaskDescription');
            const isVisibleInput = getSelect('newtaskIsVisible');

            if (!departmentSelect?.value) {
                showNotification('Şöbə seçin', 'error');
                return;
            }
            if (!taskTypeSelect?.value) {
                showNotification('İş növü seçin', 'error');
                return;
            }
            if (!dueDateInput?.value) {
                showNotification('Son müddət seçin', 'error');
                return;
            }
            if (!descriptionInput?.value) {
                showNotification('Tapşırıq açıqlamasını daxil edin', 'error');
                return;
            }

            if (currentTaskType === 'internal' && !companySelect?.value) {
                showNotification('Şirkət seçin', 'error');
                return;
            }
            if (currentTaskType === 'parent' && !parentSelect?.value) {
                showNotification('Şirkət seçin', 'error');
                return;
            }
            if (currentTaskType === 'partner' && !partnerSelect?.value) {
                showNotification('Partnyor seçin', 'error');
                return;
            }

            const selectedTarget = resolveSelectedTargetForSubmit();
            if ((currentTaskType === 'internal' || currentTaskType === 'parent') && !selectedTarget.targetCompanyId) {
                showNotification('Şirkət seçin', 'error');
                return;
            }
            if (currentTaskType === 'partner' && !selectedTarget.partnerRelationId) {
                showNotification('Partnyor seçin', 'error');
                return;
            }
            const assignedTo = getAssignedToValue();
            if (assignedTo === null) {
                showNotification('İcra edən şəxs seçin', 'error');
                return;
            }

            const selectedCompanyName = selectedTarget.selectedCompanyName || '';
            const taskTitle = 'Yeni Task';
            const taskDescription = descriptionInput.value || '';
            const currentCompanyId = toIntOrNull(myCompany?.id || window.taskManager?.userData?.companyId || userData?.companyId || null);
            const currentCompanyCode = myCompany?.company_code || window.taskManager?.userData?.companyCode || userData?.companyCode || null;
            const creatorName = window.taskManager?.userData?.fullName || window.taskManager?.userData?.name || userData?.fullName || 'Sistem';
            const dueDateValue = dueDateInput.value;
            const dueDate = new Date(dueDateValue);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            dueDate.setHours(0, 0, 0, 0);
            const taskStatus = dueDate.getTime() < today.getTime() ? 'overdue' : 'pending';
            const isVisible = !!isVisibleInput?.checked;
            const executorSource = selectedTarget.partnerRelationId ? 'partnerSelect' : (companySelect?.value ? 'companySelect' : 'executorSelect');

            const metadata = {
                display_company_name: selectedCompanyName,
                target_company_name: selectedCompanyName,
                original_company_name: selectedCompanyName,
                created_by_company: window.taskManager?.userData?.companyName || currentCompanyCode,
                created_by_company_id: currentCompanyId,
                target_company_id: selectedTarget.targetCompanyId,
                target_company_code: selectedTarget.targetCompanyCode || null,
                is_visible_to_company: isVisible,
                viewable_company_id: selectedTarget.targetCompanyId,
                viewable_company_name: selectedCompanyName,
                deadline_status: taskStatus,
                deadline_date: dueDateValue,
                created_by_user_id: window.taskManager?.userData?.userId || userData?.userId || null,
                created_by_name: creatorName,
                created_at: new Date().toISOString(),
                task_type: currentTaskType === 'partner' ? 'partner' : (currentTaskType === 'parent' ? 'external' : 'personal'),
                executor_source: executorSource
            };

            let endpoint = '';
            let apiData = {};

            if (currentTaskType === 'internal') {
                endpoint = '/tasks/';
                apiData = buildInternalTaskPayload({
                    taskTitle,
                    taskDescription,
                    assignedTo,
                    taskStatus,
                    dueDateValue,
                    departmentSelect,
                    taskTypeSelect,
                    metadata,
                    creatorName
                });
            } else if (currentTaskType === 'parent') {
                endpoint = '/tasks-external/';
                apiData = buildParentTaskPayload({
                    taskTitle,
                    taskDescription,
                    assignedTo,
                    taskStatus,
                    dueDateValue,
                    departmentSelect,
                    taskTypeSelect,
                    targetCompanyId: selectedTarget.targetCompanyId,
                    targetCompanyName: selectedCompanyName,
                    creatorName
                });
            } else if (currentTaskType === 'partner') {
                endpoint = '/partner-tasks/';
                const partnerRelationId = selectedTarget.partnerRelationId;
                const forwardedByValue = window.taskManager?.userData?.employee_id || assignedTo;
                apiData = buildPartnerTaskPayload({
                    taskTitle,
                    taskDescription,
                    assignedTo,
                    taskStatus,
                    dueDateValue,
                    departmentSelect,
                    taskTypeSelect,
                    partnerRelationId,
                    partnerCompanyName: selectedCompanyName,
                    partnerCompanyId: selectedTarget.targetCompanyId,
                    partnerCompanyCode: selectedTarget.targetCompanyCode || null,
                    creatorName,
                    executorSource,
                    forwardedByValue
                });
            }

            apiData = sanitizePayload(apiData, ['task_description', 'metadata']);

            if (!apiData.assigned_to) {
                showNotification('İcra edən şəxs seçin', 'error');
                return;
            }
            if (!apiData.task_description && currentTaskType !== 'partner') {
                showNotification('Tapşırıq açıqlamasını daxil edin', 'error');
                return;
            }
            if (!apiData.department_id || !apiData.work_type_id || !apiData.company_id) {
                throw new Error('Task payloadunda vacib sahələr əskikdir');
            }
            if (currentTaskType === 'internal' && !apiData.created_by) {
                throw new Error('Task payloadunda created_by yoxdur');
            }

            console.log('📦 CLEAN TASK PAYLOAD:', JSON.stringify(apiData, null, 2));
            console.log('🎯 endpoint:', endpoint);

            showNotification('Tapşırıq yaradılır...', 'info');
            if (window.taskManager?.showLoading) {
                window.taskManager.showLoading();
            }

            const response = await window.makeApiRequest(endpoint, 'POST', apiData);
            console.log('📥 API cavabı:', response);

            if (response?.success === false || response?.error || response?.detail) {
                throw new Error(getApiErrorMessage(response));
            }

            const taskId = parseTaskIdFromResponse(response);
            if (!taskId) {
                throw new Error('Task ID alınmadı');
            }
            createdTaskId = taskId;

            const filesToUpload = collectFilesForUpload();
            const uploadedUuids = filesToUpload.length ? await uploadFilesAndCollectUuids(filesToUpload) : [];
            const uploadFailed = filesToUpload.length > 0 && uploadedUuids.length < filesToUpload.length;

            if (uploadedUuids.length > 0) {
                const uuidUpdateOk = await addUuidsToTask(taskId, uploadedUuids, currentTaskType === 'parent' ? 'parent' : currentTaskType === 'partner' ? 'partner' : 'internal');
                if (!uuidUpdateOk) {
                    console.warn('⚠️ UUID-lər task-a əlavə edilə bilmədi');
                }
            }

            if (uploadFailed) {
                showNotification('Task yaradıldı, amma bəzi fayllar yüklənmədi', 'warning');
            } else if (uploadedUuids.length > 0) {
                showNotification(`✅ Tapşırıq uğurla yaradıldı! ${uploadedUuids.length} fayl əlavə edildi.`, 'success');
            } else {
                showNotification('✅ Tapşırıq uğurla yaradıldı!', 'success');
            }

            await refreshAfterTaskCreation(currentTaskType);
            closeModal();
        } catch (error) {
            console.error('❌ Xəta:', error);
            showNotification(error?.message || 'Tapşırıq yaradılarkən xəta baş verdi', 'error');
            return null;
        } finally {
            if (window.taskManager?.hideLoading) {
                window.taskManager.hideLoading();
            }
        }
    }

    window.loadDataFromTaskManager = loadDataFromTaskManager;
    window.loadWorkTypes = loadWorkTypes;
    window.loadParentCompanies = loadParentCompanies;
    window.loadPartnerCompanies = loadPartnerCompanies;
    window.populateSelects = populateSelects;
    window.setupPrintScreenCapture = setupPrintScreenCapture;
    window.attachModalEvents = attachModalEvents;
    window.setupAudioRecorder = setupAudioRecorder;
    window.setupFileUpload = setupFileUpload;
    window.autoSelectDepartmentByEmployee = autoSelectDepartmentByEmployee;
    window.openNewTaskModal = openModal;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
