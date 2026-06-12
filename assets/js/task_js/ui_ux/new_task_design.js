(function() {
    'use strict';

    let currentTaskType = null;
    let mediaRecorder = null;
    let audioChunks = [];
    let isRecording = false;
    let audioStream = null;
    let animationId = null;

    let modalOverlay = null;
    let modalTitleIcon = null;
    let modalTitleText = null;

    let companyGroup, parentGroup, partnerGroup, executorGroup, otherExecutorGroup;
    let startBtn, stopBtn, saveBtn, cancelBtn, audioStatus, audioPreview, recordedAudio, audioData, audioFilename, visualizer;
    let fileZone, fileInput, fileList;

    let myCompany = null;
    let subsidiaryCompanies = [];
    let departments = [];
    let employees = [];
    let workTypes = [];
    let parentCompanies = [];
    let partners = [];

    async function init() {
        console.log('🚀 new_task_modal.js init başladı...');
        createModal();
        attachCardEvents    ();

        await waitForTaskManager();
        console.log('✅ TaskManager hazırdır');

        await loadDataFromTaskManager();

        console.log('📊 employees sayı init-də:', employees.length);

        await loadWorkTypes();
        await loadParentCompanies();
        await loadPartnerCompanies();

        // ✅ FIX: employees hələ boşdursa, birbaşa API-dan yüklə
        if (!employees || employees.length === 0) {
            console.warn('⚠️ employees boşdur, birbaşa API-dan yüklənir...');
            await loadMyCompanyEmployees();
        }

        populateSelects();
        setupPrintScreenCapture();
        attachModalEvents();
        setupAudioRecorder();
        setupFileUpload();
        console.log('✅ new_task_modal.js hazırdır, employees:', employees.length);
    }

    async function loadMyCompanyEmployees() {
        try {
            const companyCode = myCompany?.company_code
                || window.taskManager?.userData?.companyCode;

            if (!companyCode) return;

            console.log(`🔄 İşçilər yüklənir: ${companyCode}`);

            let list = [];

            // ✅ 1. Birinci cəhd: requestOneC ilə (baza_id ilə - əsas endpoint)
            try {
                    const r1 = await makeApiRequest(`/users/company/${companyCode}`, 'GET');
                    console.log('🔍 RAW cavab:', r1);  // ← ƏLAVƏ EDİN
                    const arr = Array.isArray(r1) ? r1 : (r1?.data || r1?.items || []);
                    console.log('🔍 Array:', arr);     // ← ƏLAVƏ EDİN
                    if (arr.length > 0) {
                        list = arr;
                        console.log(`✅ makeApiRequest: ${list.length} işçi`);
                    }
                } catch(e) {
                    console.warn('makeApiRequest failed:', e.message);  // ← bu artıq var
                }

            // ✅ 2. İkinci cəhd: window._apiGet ilə (baza_id-siz)
            if (list.length === 0 && window._apiGet) {
                try {
                    const r2 = await window._apiGet(`/users/company/${companyCode}`);
                    const arr = Array.isArray(r2) ? r2 : (r2?.data || r2?.items || []);
                    if (arr.length > 0) { list = arr; console.log(`✅ _apiGet: ${list.length} işçi`); }
                } catch(e) { console.warn('_apiGet failed:', e.message); }
            }

            // ✅ 3. Üçüncü cəhd: getEmployeesWithCache (api.service.js-dən)
            if (list.length === 0) {
                try {
                    const r3 = await window.getEmployeesWithCache(companyCode);
                    const arr = Array.isArray(r3) ? r3 : (r3?.data || []);
                    if (arr.length > 0) { list = arr; console.log(`✅ getEmployeesWithCache: ${list.length} işçi`); }
                } catch(e) { console.warn('getEmployeesWithCache failed:', e.message); }
            }

            // ✅ 4. Son fallback: taskManager.employees (report.js yükləyib)
            if (list.length === 0 && window.taskManager?.employees?.length > 0) {
                list = window.taskManager.employees;
                console.log(`✅ taskManager.employees fallback: ${list.length} işçi`);
            }

            if (list.length > 0) {
                employees = list;
                console.log(`✅ ${employees.length} işçi yükləndi`);
                populateSelects();
            } else {
                console.warn('⚠️ Heç bir mənbədən işçi tapılmadı');
            }
        } catch (err) {
            console.error('❌ loadMyCompanyEmployees xətası:', err);
            if (window.taskManager?.employees?.length > 0) {
                employees = window.taskManager.employees;
                populateSelects();
            }
        }
    }

    function waitForTaskManager() {
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 50;
            console.log('⏳ TaskManager hazır olana qədər gözlənilir...');
            const checkInterval = setInterval(() => {
                attempts++;
                const hasData = window.taskManager &&
                               window.taskManager.myCompany &&
                               window.taskManager.subsidiaryCompanies &&
                               window.taskManager.departments &&
                               window.taskManager.employees;
                if (hasData) {
                    clearInterval(checkInterval);
                    resolve();
                } else if (attempts >= maxAttempts) {
                    console.warn('⚠️ TaskManager hazır olmadı, davam edilir...');
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
        });
    }

    async function loadDataFromTaskManager() {
        try {
            if (!window.taskManager) {
                console.warn('⚠️ window.taskManager mövcud deyil');
                return;
            }

            // 1. Token-dan company məlumatlarını al
            const token = getAuthToken();
            let companyId = null;
            let companyCode = null;
            let companyName = null;

            if (token) {
                const payload = parseTokenPayload(token);
                if (payload) {
                    companyId = payload.company_id;
                    companyCode = payload.company_code;
                    companyName = payload.company_name;
                    console.log('🔑 Token-dan company:', { companyId, companyCode, companyName });
                }
            }

            // 2. Token-da company_name yoxdursa, API-dən al
            if ((!companyName || !companyId) && companyCode) {
                try {
                    const response = await makeApiRequest(`/companies/code/${companyCode}`, 'GET');
                    if (response && response.data) {
                        companyName = response.data.company_name;
                        companyId = response.data.id;
                    }
                } catch (err) {
                    console.error('Company API xətası:', err);
                }
            }

            // 3. TaskManager-dan gələn məlumatları da yoxla
            if (window.taskManager.myCompany) {
                const tmCompany = window.taskManager.myCompany;
                console.log('📦 TaskManager-dan company:', tmCompany);

                // Token-dakı məlumatlar üstünlük təşkil edir
                if (!companyId && tmCompany.id) companyId = tmCompany.id;
                if (!companyCode && tmCompany.company_code) companyCode = tmCompany.company_code;
                if (!companyName && (tmCompany.company_name || tmCompany.name)) {
                    companyName = tmCompany.company_name || tmCompany.name;
                }
            }

            // 4. UserData-dan da yoxla
            if (window.taskManager.userData) {
                const userData = window.taskManager.userData;
                console.log('👤 UserData:', userData);
                if (!companyId && userData.companyId) companyId = userData.companyId;
                if (!companyCode && userData.companyCode) companyCode = userData.companyCode;
                if (!companyName && userData.companyName) companyName = userData.companyName;
            }

            // 5. LocalStorage-dan yoxla
            if (!companyName) {
                const storedUserData = localStorage.getItem('guven_user_data');
                if (storedUserData) {
                    try {
                        const parsed = JSON.parse(storedUserData);
                        if (parsed.company_name) companyName = parsed.company_name;
                        if (parsed.company_id) companyId = parsed.company_id;
                        if (parsed.company_code) companyCode = parsed.company_code;
                    } catch(e) {}
                }
            }

            // 6. myCompany obyektini yarat
            if (companyId && companyCode) {
                // ✅ FIX: şirkət adını düzgün mənbədən al
                // userData.name = şəxsin adı, companyName = şirkət adı - bunları qarışdırma!
                let finalName = null;

                // 1. Birbaşa API-dan al (ən etibarlı)
                try {
                    const companyResp = await makeApiRequest(`/companies/code/${companyCode}`, 'GET');
                    if (companyResp?.company_name) {
                        finalName = companyResp.company_name;
                        console.log('✅ Şirkət adı API-dan alındı:', finalName);
                    } else if (companyResp?.data?.company_name) {
                        finalName = companyResp.data.company_name;
                    }
                } catch(e) {
                    console.warn('⚠️ Company API xətası:', e);
                }

                // 2. Fallback: localStorage-dan al
                if (!finalName) {
                    try {
                        const stored = localStorage.getItem('guven_user_data')
                            || localStorage.getItem('profileData');
                        if (stored) {
                            const parsed = JSON.parse(stored);
                            finalName = parsed?.company_name
                                || parsed?.companyName
                                || parsed?.user?.company_name;
                        }
                    } catch(e) {}
                }

                // 3. Fallback: taskManager myCompany-dən (əgər artıq yüklənibsə)
                if (!finalName && window.taskManager?.myCompany?.company_name) {
                    finalName = window.taskManager.myCompany.company_name;
                }

                // 4. Son fallback: kompanyCode (addan daha yaxşıdır)
                if (!finalName) finalName = companyCode;

                myCompany = {
                    id: companyId,
                    company_name: finalName,
                    company_code: companyCode,
                    name: finalName
                };
                console.log('✅ myCompany yaradıldı:', myCompany);
            }

            // Alt məlumatları yüklə
            subsidiaryCompanies = window.taskManager.subsidiaryCompanies || [];
            departments = window.taskManager.departments || [];
            employees = window.taskManager.employees || [];

            console.log('📊 Yüklənən məlumatlar:', {
                myCompany: myCompany,
                myCompanyName: myCompany?.company_name,
                myCompanyId: myCompany?.id,
                myCompanyCode: myCompany?.company_code,
                subsidiaryCount: subsidiaryCompanies.length,
                departmentsCount: departments.length,
                employeesCount: employees.length
            });

        } catch (error) {
            console.error('❌ TaskManager məlumat alma xətası:', error);
            myCompany = null;
        }
    }

    function createModal() {
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

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function formatFileSize(bytes) {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
    }

    function updateModalFileList() {
        const fileListEl = document.getElementById('newtaskFileList');
        if (!fileListEl) return;

        if (!window.modalSelectedFiles || window.modalSelectedFiles.length === 0) {
            fileListEl.innerHTML = '<div class="newtask-file-list-empty"><i class="fas fa-inbox"></i><span>Heç bir fayl seçilməyib</span></div>';
            return;
        }

        let html = '<div class="newtask-file-list-header"><i class="fas fa-paperclip"></i><span>Seçilmiş fayllar</span></div>';
        window.modalSelectedFiles.forEach((file, index) => {
            const isAudio = file.type.startsWith('audio/') || file.name.includes('recording') || file.name.includes('webm');
            const isImage = file.type.startsWith('image/');
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

    function removeModalFile(index) {
        if (!window.modalSelectedFiles) return;
        window.modalSelectedFiles.splice(index, 1);
        updateModalFileList();
    }

    window.removeModalFile = removeModalFile;

    function attachCardEvents() {
        const cards = document.querySelectorAll('.task-type-card');
        cards.forEach(card => {
            card.addEventListener('click', () => {
                openModal(card.getAttribute('data-task-type'));
            });
        });
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

            const parentSelect = document.getElementById('newtaskParentSelect');
            if (parentSelect) {
                const newSelect = parentSelect.cloneNode(true);
                parentSelect.parentNode.replaceChild(newSelect, parentSelect);
                newSelect.id = 'newtaskParentSelect';
                newSelect.addEventListener('change', async (e) => {
                    if (e.target.value) await loadCompanyEmployees(parseInt(e.target.value));
                });
            }
        } else if (taskType === 'partner') {
            if (partnerGroup) partnerGroup.style.display = 'block';
            if (otherExecutorGroup) otherExecutorGroup.style.display = 'block';
            if (modalTitleIcon) modalTitleIcon.className = 'fas fa-handshake';
            if (modalTitleText) modalTitleText.textContent = 'Partnyor Tapşırığı';
        }

        setRequiredFields(taskType);
        if (modalOverlay) modalOverlay.classList.add('active');
        resetForm();
    }

    function setRequiredFields(taskType) {
        const companySelect = document.getElementById('newtaskCompanySelect');
        const parentSelect = document.getElementById('newtaskParentSelect');
        const partnerSelect = document.getElementById('newtaskPartnerSelect');
        if (companySelect) companySelect.required = false;
        if (parentSelect) parentSelect.required = false;
        if (partnerSelect) partnerSelect.required = false;
        if (taskType === 'internal' && companySelect) companySelect.required = true;
        else if (taskType === 'parent' && parentSelect) parentSelect.required = true;
        else if (taskType === 'partner' && partnerSelect) partnerSelect.required = true;
    }

    function closeModal() {
        if (modalOverlay) modalOverlay.classList.remove('active');
        resetForm();
        if (mediaRecorder && isRecording) stopRecording();
    }

    function resetForm() {
        const form = document.getElementById('newtaskForm');
        if (form) form.reset();

        if (window.modalSelectedFiles) {
            window.modalSelectedFiles = [];
        }
        updateModalFileList();

        const audioDataInput = document.getElementById('newtaskAudioData');
        const audioFilenameInput = document.getElementById('newtaskAudioFilename');
        const audioPreviewEl = document.getElementById('newtaskAudioPreview');
        const recordedAudioEl = document.getElementById('newtaskRecordedAudio');
        const audioStatusEl = document.getElementById('newtaskAudioStatus');
        const visualizerEl = document.getElementById('newtaskAudioVisualizer');
        const startBtnEl = document.getElementById('newtaskStartRecord');
        const stopBtnEl = document.getElementById('newtaskStopRecord');
        const saveBtnEl = document.getElementById('newtaskSaveRecord');
        const cancelBtnEl = document.getElementById('newtaskCancelRecord');

        if (audioDataInput) audioDataInput.value = '';
        if (audioFilenameInput) audioFilenameInput.value = '';
        if (audioPreviewEl) audioPreviewEl.style.display = 'none';
        if (recordedAudioEl) recordedAudioEl.src = '';
        if (audioStatusEl) audioStatusEl.innerHTML = '<i class="fas fa-circle"></i><span>Səs qeydi hazırdır</span>';
        if (startBtnEl) startBtnEl.disabled = false;
        if (stopBtnEl) stopBtnEl.disabled = true;
        if (saveBtnEl) saveBtnEl.disabled = true;
        if (cancelBtnEl) cancelBtnEl.disabled = true;

        if (visualizerEl) {
            const ctx = visualizerEl.getContext('2d');
            ctx.fillStyle = '#e9ecef';
            ctx.fillRect(0, 0, visualizerEl.width, visualizerEl.height);
        }

        const dueDateInput = document.getElementById('newtaskDueDate');
        if (dueDateInput) {
            const d = new Date();
            d.setDate(d.getDate() + 1);
            dueDateInput.value = d.toISOString().split('T')[0];
        }

        console.log('✅ Form təmizləndi');
    }

    function stopRecording() {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            if (audioStream) audioStream.getTracks().forEach(track => track.stop());
            if (animationId) cancelAnimationFrame(animationId);
            isRecording = false;
        }
    }

    function attachModalEvents() {
        const closeBtn = document.getElementById('newtaskModalClose');
        const cancelBtnModal = document.getElementById('newtaskCancelBtn');
        const saveBtnModal = document.getElementById('newtaskSaveBtn');

        if (closeBtn) closeBtn.onclick = closeModal;
        if (cancelBtnModal) cancelBtnModal.onclick = closeModal;
        if (saveBtnModal) saveBtnModal.onclick = handleSubmit;

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modalOverlay.classList.contains('active')) closeModal();
        });
        modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });

        const companySelect = document.getElementById('newtaskCompanySelect');
        if (companySelect) {
            companySelect.addEventListener('change', async (e) => {
                const companyId = e.target.value;
                if (companyId && companyId != myCompany?.id) {
                    await loadCompanyEmployees(companyId);
                } else {
                    const otherEl = document.getElementById('newtaskOtherExecutorSelect');
                    if (otherEl) otherEl.innerHTML = '<option value="">İşçi seçin (boş qoymaq olar)</option>';
                }
            });
        }

        const executorSelect = document.getElementById('newtaskExecutorSelect');
        if (executorSelect) {
            executorSelect.addEventListener('change', async (e) => {
                if (e.target.value) await autoSelectDepartmentByEmployee(e.target.value);
            });
        }

        const otherExecutorSelect = document.getElementById('newtaskOtherExecutorSelect');
        if (otherExecutorSelect) {
            otherExecutorSelect.addEventListener('change', async (e) => {
                if (e.target.value) await autoSelectDepartmentByEmployee(e.target.value);
            });
        }
    }

    async function loadCompanyEmployees(companyId) {
        try {
            const otherExecutorSelect = document.getElementById('newtaskOtherExecutorSelect');
            if (!otherExecutorSelect) return;

            otherExecutorSelect.innerHTML = '<option value="">Yüklənir...</option>';
            otherExecutorSelect.disabled = true;

            // ✅ FIX: Əgər öz şirkəti seçilibsə, artıq yüklənmiş employees-i istifadə et
            if (myCompany?.id && parseInt(companyId) === parseInt(myCompany.id)) {
                console.log('🏢 Öz şirkəti seçildi, mövcud employees istifadə edilir');
                if (employees && employees.length > 0) {
                    let html = '<option value="">İşçi seçin (boş qoymaq olar)</option>';
                    employees.forEach(emp => {
                        const name = emp.full_name || emp.name || emp.ceo_name || emp.email;
                        if (name) {
                            html += `<option value="${emp.id}">👤 ${name}</option>`;
                        }
                    });
                    otherExecutorSelect.innerHTML = html;
                    otherExecutorSelect.disabled = false;
                    return;
                }
            }

            // ✅ FIX: Əgər öz şirkəti seçilibsə, artıq yüklənmiş employees-i istifadə et
            if (myCompany?.id && parseInt(companyId) === parseInt(myCompany.id)) {
                console.log('🏢 Öz şirkəti seçildi, mövcud employees istifadə edilir');
                if (employees && employees.length > 0) {
                    let html = '<option value="">İşçi seçin (boş qoymaq olar)</option>';
                    employees.forEach(emp => {
                        const name = emp.full_name || emp.name || emp.ceo_name || emp.email;
                        if (name) {
                            html += `<option value="${emp.id}">👤 ${name}</option>`;
                        }
                    });
                    otherExecutorSelect.innerHTML = html;
                    otherExecutorSelect.disabled = false;
                    return;
                }
            }

            let companyCode = null, companyName = '';

            if (myCompany?.id == companyId) {
                companyCode = myCompany.company_code; companyName = myCompany.company_name;
            } else {
                const subsidiary = subsidiaryCompanies.find(s => s.id == companyId);
                if (subsidiary) { companyCode = subsidiary.company_code; companyName = subsidiary.company_name; }
            }

            if (!companyCode) {
                for (const parent of parentCompanies) {
                    if ((parent.company_id || parent.id) == companyId) {
                        companyCode = parent.company_code; companyName = parent.company_name; break;
                    }
                }
            }

            if (!companyCode) {
                const parentSelect = document.getElementById('newtaskParentSelect');
                if (parentSelect?.selectedIndex > 0) {
                    const opt = parentSelect.options[parentSelect.selectedIndex];
                    const code = opt.getAttribute('data-company-code');
                    if (code && code !== 'undefined' && code !== '') {
                        companyCode = code;
                        companyName = opt.getAttribute('data-company-name') || opt.text.replace('⬆️','').trim();
                    }
                }
            }

            if (!companyCode && partners.length > 0) {
                const myCompanyCode = window.taskManager?.userData?.companyCode;
                for (const partner of partners) {
                    const pid = partner.partner_company_id || partner.company_id || partner.target_company_id;
                    if (pid == companyId) {
                        companyCode = partner.requester_company_code === myCompanyCode
                            ? partner.target_company_code
                            : partner.requester_company_code;
                        companyName = partner.partner_company_name || partner.target_company_name;
                        break;
                    }
                }
            }

            if (!companyCode) {
                otherExecutorSelect.innerHTML = `<option value="">İşçi tapılmadı (${companyName || companyId} üçün kod tapılmadı)</option>`;
                otherExecutorSelect.disabled = false;
                return;
            }

            const response = await makeApiRequest(`/users/company/${companyCode}`, 'GET');
            const employeesList = response?.data || (Array.isArray(response) ? response : []);

            if (employeesList.length > 0) {
                let html = '<option value="">İşçi seçin (boş qoymaq olar)</option>';
                let ceoId = null, ceoName = '';
                employeesList.forEach(emp => {
                    const name = emp.full_name || emp.name || emp.ceo_name || emp.email || 'Ad yoxdur';
                    const role = (emp.role || emp.user_role || emp.position || emp.employment_type || '').toLowerCase();
                    const isCeo = role.includes('ceo') || role.includes('rəhbər') || role.includes('director') || role.includes('baş') || emp.is_admin === true || emp.user_type === 'ceo';
                    html += `<option value="${emp.id}" ${isCeo ? 'data-is-ceo="true"' : ''}>👤 ${name}${isCeo ? ' (Rəhbər)' : ''}</option>`;
                    if (isCeo && !ceoId) { ceoId = emp.id; ceoName = name; }
                });
                otherExecutorSelect.innerHTML = html;
                if (ceoId) {
                    otherExecutorSelect.value = ceoId;
                    showAutoSelectNotification('rəhbər', ceoName);
                } else if (employeesList.length > 0) {
                    otherExecutorSelect.value = employeesList[0].id;
                }
            } else {
                otherExecutorSelect.innerHTML = '<option value="">İşçi tapılmadı</option>';
            }
            otherExecutorSelect.disabled = false;
        } catch (error) {
            console.error('❌ Şirkət işçiləri xətası:', error);
            const el = document.getElementById('newtaskOtherExecutorSelect');
            if (el) {
                // 403 = icazə yoxdur, digər xəta = texniki problem
                const msg = error.message?.includes('403')
                    ? 'Bu şirkətin işçilərinə baxmaq icazəniz yoxdur'
                    : 'İşçilər yüklənə bilmədi';
                el.innerHTML = `<option value="">${msg}</option>`;
                el.disabled = false;
            }
        }
    }

    async function handleSubmit() {
        try {
            // ========== 1. VALİDASİYALAR ==========
            const form = document.getElementById('newtaskForm');
            if (!form.checkValidity()) { form.reportValidity(); return; }

            if (currentTaskType === 'internal') {
                if (!document.getElementById('newtaskCompanySelect').value) {
                    showNotification('Şirkət seçin', 'error');
                    return;
                }
            } else if (currentTaskType === 'parent') {
                if (!document.getElementById('newtaskParentSelect').value) {
                    showNotification('Şirkət seçin', 'error');
                    return;
                }
            } else if (currentTaskType === 'partner') {
                if (!document.getElementById('newtaskPartnerSelect').value) {
                    showNotification('Partnyor seçin', 'error');
                    return;
                }
            }

            const departmentId = document.getElementById('newtaskDepartmentSelect').value;
            if (!departmentId) { showNotification('Şöbə seçin', 'error'); return; }

            const taskTypeId = document.getElementById('newtaskTaskTypeSelect').value;
            if (!taskTypeId) { showNotification('İş növü seçin', 'error'); return; }

            const dueDate = document.getElementById('newtaskDueDate').value;
            if (!dueDate) { showNotification('Son müddət seçin', 'error'); return; }

            const description = document.getElementById('newtaskDescription').value;
            if (!description) { showNotification('Tapşırıq açıqlamasını daxil edin', 'error'); return; }

            const executorId = document.getElementById('newtaskExecutorSelect').value;
            let assignedTo = executorId ? parseInt(executorId) : null;

            const otherExecutor = document.getElementById('newtaskOtherExecutorSelect').value;
            let otherExecutorId = otherExecutor ? parseInt(otherExecutor) : null;

            const isVisible = document.getElementById('newtaskIsVisible').checked;

            // ========== 2. BÜTÜN FAYLLARI TOPLA ==========
            const allFiles = [];

            // File input-dan fayllar
            const fileInput = document.getElementById('newtaskFileInput');
            if (fileInput && fileInput.files && fileInput.files.length > 0) {
                Array.from(fileInput.files).forEach(f => allFiles.push(f));
            }

            // modalSelectedFiles (drag-drop, PrtScn)
            if (window.modalSelectedFiles && window.modalSelectedFiles.length > 0) {
                window.modalSelectedFiles.forEach(f => {
                    const isDuplicate = allFiles.some(af => af.name === f.name && af.size === f.size);
                    if (!isDuplicate) allFiles.push(f);
                });
            }

            // Audio data (əgər varsa)
            const audioDataInput = document.getElementById('newtaskAudioData');
            const audioFilenameInput = document.getElementById('newtaskAudioFilename');

            if (audioDataInput?.value && audioFilenameInput?.value) {
                const alreadyAdded = allFiles.some(f => f.name === audioFilenameInput.value);
                if (!alreadyAdded) {
                    try {
                        let base64Data = audioDataInput.value;
                        if (base64Data.includes(',')) base64Data = base64Data.split(',')[1];
                        const byteCharacters = atob(base64Data);
                        const byteArray = new Uint8Array(byteCharacters.length);
                        for (let i = 0; i < byteCharacters.length; i++) {
                            byteArray[i] = byteCharacters.charCodeAt(i);
                        }
                        const audioBlob = new Blob([byteArray], { type: 'audio/webm' });
                        const audioFile = new File([audioBlob], audioFilenameInput.value, { type: 'audio/webm' });
                        allFiles.push(audioFile);
                    } catch (err) {
                        console.error('Audio xətası:', err);
                    }
                }
            }

            console.log(`📎 ${allFiles.length} fayl yüklənəcək`);

            // ========== 3. BÜTÜN FAYLLARI YÜKLƏ (SIRAYLA) ==========
            if (allFiles.length > 0) {
                showNotification(`${allFiles.length} fayl yüklənir...`, 'info');
            }

            const uploadedUuids = [];

            for (let i = 0; i < allFiles.length; i++) {
                const file = allFiles[i];
                try {
                    const formData = new FormData();
                    formData.append('file', file);

                    const isAudio = file.type.startsWith('audio/') ||
                                   file.name.includes('recording') ||
                                   file.name.includes('.webm');

                    formData.append('category', isAudio ? 'audio_recording' : 'company_file');
                    if (isAudio) formData.append('is_audio_recording', 'true');

                    console.log(`📤 Fayl yüklənir (${i+1}/${allFiles.length}): ${file.name}`);

                    const uploadResponse = await makeApiRequest('/files/simple-upload', 'POST', formData, true);

                    const fileUuid = uploadResponse?.data?.uuid || uploadResponse?.uuid || uploadResponse?.file_id;
                    if (fileUuid) {
                        uploadedUuids.push(fileUuid);
                        console.log(`✅ ${file.name} -> ${fileUuid}`);
                    } else {
                        console.error(`❌ ${file.name} UUID alınmadı!`);
                    }
                } catch (fileErr) {
                    console.error(`❌ ${file.name} xətası:`, fileErr);
                }
            }

            console.log(`📦 Yüklənmiş UUID-lər: ${uploadedUuids.length} ədəd`, uploadedUuids);

            // ========== 4. TASK MƏLUMATLARINI HAZIRLA ==========
            let targetCompanyId = null;
            let selectedCompanyName = '';

            if (currentTaskType === 'internal') {
                const companySelect = document.getElementById('newtaskCompanySelect');
                if (companySelect && companySelect.selectedIndex > 0) {
                    const opt = companySelect.options[companySelect.selectedIndex];
                    // "🏢 Güvən Finans MMC (Mənim şirkətim)" → "Güvən Finans MMC"
                    selectedCompanyName = opt.text
                        .replace('🏢', '')
                        .replace('(Mənim şirkətim)', '')
                        .trim();
                }
            } else if (currentTaskType === 'parent') {
                const parentSelect = document.getElementById('newtaskParentSelect');
                if (parentSelect && parentSelect.selectedIndex > 0) {
                    selectedCompanyName = parentSelect.options[parentSelect.selectedIndex]
                        .getAttribute('data-company-name')
                        || parentSelect.options[parentSelect.selectedIndex].text
                            .replace(/⬆️/g, '').trim();
                }
            } else if (currentTaskType === 'partner') {
                const partnerSelect = document.getElementById('newtaskPartnerSelect');
                if (partnerSelect && partnerSelect.selectedIndex > 0) {
                    selectedCompanyName = partnerSelect.options[partnerSelect.selectedIndex].text
                        .replace(/🤝/g, '').trim();
                }
            }

            // ========== 5. TASK YARAT (YÜKLƏNMİŞ UUID-LƏR İLƏ) ==========
            showNotification('Tapşırıq yaradılır...', 'info');

            let endpoint = '';
            let apiData = {};

            const metadata = {
                display_company_name: selectedCompanyName,
                target_company_name: selectedCompanyName,
                original_company_name: selectedCompanyName,
                company_name: selectedCompanyName,
                company_id: targetCompanyId,
                created_by_company: window.taskManager?.userData?.companyName || window.taskManager?.userData?.companyCode,
                created_by_company_id: window.taskManager?.userData?.companyId,
                target_company_id: targetCompanyId,
                created_by_user_id: window.taskManager?.userData?.userId,
                created_by_name: window.taskManager?.userData?.fullName || window.taskManager?.userData?.name,
                created_at: new Date().toISOString(),
                task_type: currentTaskType,
                due_date: dueDate
            };

            const baseData = {
                task_title: `  [${selectedCompanyName}]`,  // ← Arxiv ilə eyni format
                task_description: description,
                assigned_to: assignedTo || otherExecutorId,
                priority: "medium",
                status: "pending_approval",
                due_date: dueDate,
                progress_percentage: 0,
                is_billable: false,
                department_id: parseInt(departmentId),
                work_type_id: parseInt(taskTypeId),
                created_by: window.taskManager?.userData?.userId,
                creator_name: window.taskManager?.userData?.fullName || window.taskManager?.userData?.name || 'Sistem',
                metadata: JSON.stringify(metadata),
                file_uuids: uploadedUuids
            };

            if (currentTaskType === 'internal') {
                    endpoint = '/tasks/';
                    apiData = {
                        ...baseData,
                        company_id: targetCompanyId,  // Bu əsl sahib şirkət (Güvən Finans)
                        company_name: selectedCompanyName,
                        is_company_viewable: true,     // ✅ Dəyişdirildi: false → true
                        viewable_company_id: targetCompanyId  // ✅ Bu göstəriləcək şirkət (DRM MMC)
                    };
                } else if (currentTaskType === 'parent') {
                endpoint = '/tasks-external/';
                apiData = {
                    ...baseData,
                    company_id: window.taskManager?.userData?.companyId,
                    target_company_id: targetCompanyId,
                    target_company_name: selectedCompanyName,
                    viewable_company_id: targetCompanyId,
                    is_for_subsidiary: false
                };
            } else if (currentTaskType === 'partner') {
                endpoint = '/partner-tasks/';
                apiData = {
                    ...baseData,
                    company_id: window.taskManager?.userData?.companyId,
                    partner_id: targetCompanyId,
                    partner_name: selectedCompanyName,
                    product_serial: `SN-${Date.now()}`,
                    product_model: "Default Model",
                    product_category: "General",
                    contract_number: `CT-${Date.now()}`,
                    purchase_order_number: `PO-${Date.now()}`
                };
            }

            // NULL field-ları sil
            Object.keys(apiData).forEach(key => {
                if (apiData[key] === null || apiData[key] === undefined || apiData[key] === '') {
                    delete apiData[key];
                }
            });

            console.log(`📤 ${currentTaskType.toUpperCase()} TASK:`, JSON.stringify(apiData, null, 2));

            const response = await makeApiRequest(endpoint, 'POST', apiData);
            console.log('📥 API cavabı:', response);

            const taskId = response?.task?.id || response?.id || response?.data?.id;

            if (!taskId) {
                throw new Error(response?.detail || response?.message || 'Task ID alınmadı');
            }

            console.log(`✅ Task yaradıldı (ID: ${taskId}) ${uploadedUuids.length} fayl ilə`);

            // ========== 6. UĞUR BİLDİRİŞİ ==========
            showNotification(`✅ Tapşırıq uğurla yaradıldı! ${uploadedUuids.length} fayl əlavə edildi.`, 'success');

            // ========== 7. SİYAHILARI YENİLƏ ==========
            if (window.taskManager?.loadActiveTasks) {
                setTimeout(() => window.taskManager.loadActiveTasks(1, true), 1000);
            }

            // ========== 8. MODALI BAĞLA ==========
            closeModal();

            // ========== 9. SEÇİLMİŞ FAYLLARI TƏMİZLƏ ==========
            window.modalSelectedFiles = [];
            updateModalFileList();

        } catch (error) {
            console.error('❌ Xəta:', error);
            showNotification('❌ ' + (error.message || 'Tapşırıq yaradılarkən xəta baş verdi'), 'error');
        }
    }

    async function addUuidToTask(taskId, uuid) {
        try {
            console.log(`📝 Task ${taskId}-ə UUID əlavə edilir: ${uuid}`);

            // 🔥 1. Əvvəlcə mövcud file_uuids-ləri al
            let currentFileUuids = [];
            try {
                const taskResponse = await makeApiRequest(`/tasks/${taskId}`, 'GET', null, true);
                if (!taskResponse.error && taskResponse.data) {
                    const task = taskResponse.data;
                    if (task.file_uuids && Array.isArray(task.file_uuids)) {
                        currentFileUuids = task.file_uuids;
                        console.log(`📋 Mövcud file_uuids:`, currentFileUuids);
                    }
                }
            } catch (err) {
                console.warn('⚠️ Task məlumatları alınarkən xəta:', err);
            }

            // 🔥 2. Yeni UUID-ni əlavə et (təkrarlanmasın)
            if (!currentFileUuids.includes(uuid)) {
                currentFileUuids.push(uuid);
            }

            // 🔥 3. Birbaşa file_uuids sahəsini yenilə
            const updateResponse = await makeApiRequest(`/tasks/${taskId}/add-file-uuid`, 'POST', {
                file_uuid: uuid
            }, true);

            if (updateResponse.error) {
                console.error('❌ UUID əlavə edilə bilmədi:', updateResponse.error);
                return false;
            }

            console.log(`✅ UUID ${uuid} task ${taskId}-yə əlavə edildi (file_uuids)`);
            return true;

        } catch (error) {
            console.error('❌ UUID əlavə etmə xətası:', error);
            return false;
        }
    }


    function showNotification(message, type = 'success') {
        document.querySelectorAll('.task-notification').forEach(n => n.remove());
        const notification = document.createElement('div');
        notification.className = `task-notification task-notification-${type}`;
        const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
        notification.innerHTML = `<i class="fas ${icons[type] || icons.success}"></i><span>${message}</span><button class="task-notification-close"><i class="fas fa-times"></i></button>`;
        notification.style.cssText = `
            position:fixed; bottom:20px; right:20px;
            background:${type==='success'?'#28a745':type==='error'?'#dc3545':'#17a2b8'};
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

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();