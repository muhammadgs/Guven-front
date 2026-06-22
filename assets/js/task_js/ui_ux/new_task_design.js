(function() {
    'use strict';

    let currentTaskType = null;
    let mediaRecorder = null;
    let audioChunks = [];
    let isRecording = false;
    let isPaused = false;
    let audioStream = null;
    let audioContext = null;
    let audioAnalyser = null;
    let animationId = null;
    let audioBlob = null;
    let previewAudioUrl = null;
    let recorderStopPromise = null;
    let recorderStopResolve = null;

    let recordingStartedAt = 0;
    let elapsedBeforePause = 0;
    let timerInterval = null;
    let waveformLevels = new Array(28).fill(0.22);
    let lastWaveformLevels = new Array(28).fill(0.22);
    let recorderEventsBound = false;

    let modalOverlay = null;
    let modalTitleIcon = null;
    let modalTitleText = null;

    let companyGroup, parentGroup, partnerGroup, executorGroup, otherExecutorGroup;
    let voiceShell;
    let voiceRecordingUi;
    let startBtn;
    let stopBtn;
    let pauseBtn;
    let saveBtn;
    let previewBtn;
    let visualizer;
    let recordedAudio;
    let audioData;
    let audioFilename;
    let audioStatus;
    let recordingTimer;
    let timerDisplay;
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
        initCustomSelects();
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
        refreshCustomSelects();
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
            <div class="newtask-modal-overlay" id="newtaskModalOverlay">
                <div class="newtask-modal liquid-task-modal" role="dialog" aria-modal="true" aria-labelledby="newtaskModalTitle">
                    <div class="newtask-modal-header">
                        <div class="newtask-modal-title">
                            <span class="newtask-modal-title-icon"><i class="fas fa-edit" id="newtaskModalIcon"></i></span>
                            <h3 id="newtaskModalTitle">Daxili Tapşırıq</h3>
                        </div>
                        <button type="button" class="newtask-modal-close" id="newtaskModalClose" aria-label="Modalı bağla">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="newtask-modal-body">
                        <form id="newtaskForm" class="newtask-form glass-task-form">
                            <div class="newtask-form-grid glass-form-grid">
                                <div class="newtask-form-group glass-field" id="newtaskCompanyGroup">
                                    <label class="newtask-form-label" for="newtaskCompanySelect"><i class="fas fa-building"></i> Şirkət</label>
                                    <select id="newtaskCompanySelect" class="newtask-select" required>
                                        <option value="">Şirkət seçin</option>
                                    </select>
                                </div>

                                <div class="newtask-form-group glass-field" id="newtaskParentGroup" style="display:none;">
                                    <label class="newtask-form-label" for="newtaskParentSelect"><i class="fas fa-building"></i> Şirkət</label>
                                    <select id="newtaskParentSelect" class="newtask-select" required>
                                        <option value="">Şirkət seçin</option>
                                    </select>
                                    <div class="newtask-form-text">Şirkətlərinizə task göndərin</div>
                                </div>

                                <div class="newtask-form-group glass-field" id="newtaskPartnerGroup" style="display:none;">
                                    <label class="newtask-form-label" for="newtaskPartnerSelect"><i class="fas fa-building"></i> Partnyor</label>
                                    <select id="newtaskPartnerSelect" class="newtask-select" required>
                                        <option value="">Partnyor seçin</option>
                                    </select>
                                </div>

                                <div class="newtask-form-group glass-field" id="newtaskExecutorGroup">
                                    <label class="newtask-form-label" for="newtaskExecutorSelect"><i class="fas fa-user-tie"></i> İcra edən</label>
                                    <select id="newtaskExecutorSelect" class="newtask-select">
                                        <option value="">İşçi seçin (boş qoymaq olar)</option>
                                    </select>
                                </div>

                                <div class="newtask-form-group glass-field" id="newtaskOtherExecutorGroup">
                                    <label class="newtask-form-label" for="newtaskOtherExecutorSelect"><i class="fas fa-users"></i> Digər şirkətin işçisi</label>
                                    <select id="newtaskOtherExecutorSelect" class="newtask-select">
                                        <option value="">İşçi seçin (boş qoymaq olar)</option>
                                    </select>
                                </div>

                                <div class="newtask-form-group glass-field">
                                    <label class="newtask-form-label" for="newtaskDepartmentSelect"><i class="fas fa-sitemap"></i> Şöbə</label>
                                    <select id="newtaskDepartmentSelect" class="newtask-select" required>
                                        <option value="">Şöbə seçin</option>
                                    </select>
                                </div>

                                <div class="newtask-form-group glass-field">
                                    <label class="newtask-form-label" for="newtaskTaskTypeSelect"><i class="fas fa-list-check"></i> İşin növü</label>
                                    <select id="newtaskTaskTypeSelect" class="newtask-select" required>
                                        <option value="">İş növü seçin</option>
                                    </select>
                                </div>

                                <div class="newtask-form-group glass-field">
                                    <label class="newtask-form-label" for="newtaskDueDate"><i class="fas fa-calendar-days"></i> Son müddət</label>
                                    <input type="date" id="newtaskDueDate" class="newtask-input" required />
                                </div>

                                <div class="newtask-form-group glass-field newtask-visibility-field">
                                    <div class="newtask-checkbox-group">
                                        <input type="checkbox" id="newtaskIsVisible" class="newtask-checkbox">
                                        <label for="newtaskIsVisible" class="newtask-checkbox-label">
                                            <i class="fas fa-eye"></i> Seçilmiş şirkətə göstər
                                        </label>
                                    </div>
                                </div>

                                <div class="newtask-form-group full-width glass-field glass-description-field">
                                    <label class="newtask-form-label" for="newtaskDescription"><i class="fas fa-align-left"></i> Tapşırıq açıqlaması</label>
                                    <textarea id="newtaskDescription" rows="4" class="newtask-textarea" placeholder="Tapşırığın detallı təsvirini yazın..." required></textarea>
                                </div>

                                <div class="newtask-form-group glass-field glass-media-field">
                                    <label class="newtask-form-label" for="newtaskFileInput"><i class="fas fa-paperclip"></i> Fayl yükləmə</label>
                                    <div class="newtask-file-zone glass-upload-zone" id="newtaskFileZone">
                                        <div class="newtask-file-icon"><i class="fas fa-file-arrow-up"></i></div>
                                        <div class="newtask-file-text">Faylı sürüşdürün və ya klikləyin</div>
                                        <input type="file" id="newtaskFileInput" multiple hidden accept=".xlsx,.xls,.pdf,.jpg,.png,.jpeg,.doc,.docx,.webm,.mp3" />
                                    </div>
                                    <div class="newtask-file-list" id="newtaskFileList"></div>
                                </div>

                                <div class="newtask-form-group glass-field glass-media-field">
                                    <label class="newtask-form-label"><i class="fas fa-wave-square"></i> Səs qeydi</label>
                                    <div class="newtask-audio-container nt-voice-recorder" id="newtaskVoiceRecorder">
                                        <div class="nt-voice-shell" id="newtaskVoiceShell" data-state="idle">
                                            <button type="button" id="newtaskStartRecord" class="nt-voice-main-btn" aria-label="Səs qeydinə başla">
                                                <i class="fas fa-microphone"></i>
                                            </button>

                                            <div class="nt-voice-recording-ui" id="newtaskVoiceRecordingUi" hidden>
                                                <button type="button" id="newtaskPreviewPlay" class="nt-voice-preview-btn" hidden aria-label="Yazını dinlə">
                                                    <i class="fas fa-play"></i>
                                                </button>

                                                <canvas id="newtaskAudioVisualizer" class="nt-voice-waveform" width="360" height="86"></canvas>

                                                <div class="nt-voice-actions">
                                                    <button type="button" id="newtaskStopRecord" class="nt-voice-action nt-voice-stop" disabled aria-label="Dayandır">
                                                        <i class="fas fa-square"></i>
                                                    </button>

                                                    <button type="button" id="newtaskPauseRecord" class="nt-voice-action nt-voice-pause" disabled aria-label="Pauza">
                                                        <i class="fas fa-pause"></i>
                                                    </button>

                                                    <button type="button" id="newtaskSaveRecord" class="nt-voice-action nt-voice-send" disabled aria-label="Səs qeydini əlavə et">
                                                        <i class="fas fa-play"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div class="nt-voice-meta-row" aria-live="polite">
                                            <div class="newtask-audio-status" id="newtaskAudioStatus">
                                                <span>Səs qeydi hazırdır</span>
                                            </div>
                                            <div class="recording-timer" id="newtaskRecordingTimer" hidden>
                                                <span id="newtaskTimerDisplay">00:00</span>
                                            </div>
                                        </div>

                                        <audio id="newtaskRecordedAudio" preload="metadata" hidden></audio>

                                        <input type="hidden" id="newtaskAudioData" />
                                        <input type="hidden" id="newtaskAudioFilename" />
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="newtask-modal-footer">
                        <button type="button" class="newtask-btn secondary" id="newtaskCancelBtn">
                            <i class="fas fa-circle-xmark"></i> Ləğv edin
                        </button>
                        <button type="button" class="newtask-btn primary" id="newtaskSaveBtn">
                            <i class="fas fa-floppy-disk"></i> Əlavə edin
                        </button>
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
        cacheAudioRecorderElements();
        fileZone = document.getElementById('newtaskFileZone');
        fileInput = document.getElementById('newtaskFileInput');
        fileList = document.getElementById('newtaskFileList');


        // Uğurlu task yaradıldıqdan sonra (təxminən 450-470-ci sətirlər)

        if (window.taskManager) {
            // 🔥 TaskManager-in refreshAllTaskLists metodunu çağır
            if (typeof window.taskManager.refreshAllTaskLists === 'function') {
                 window.taskManager.refreshAllTaskLists();

            } else {
                // Fallback: əgər refreshAllTaskLists yoxdursa, birbaşa load et
                console.log('⚠️ refreshAllTaskLists tapılmadı, fallback yükləmə...');

                // Cache təmizlə
                if (window.TaskCache && window.TaskCache.clear) {
                    window.TaskCache.clear();
                }

                // Force refresh ilə yüklə
                 window.taskManager.loadActiveTasks(1, true);

                if (window.ExternalTableManager && window.ExternalTableManager.loadTasks) {
                     window.ExternalTableManager.loadTasks(true);
                }

                if (window.PartnerTableManager && window.PartnerTableManager.loadTasks) {
                     window.PartnerTableManager.loadTasks(1, true);
                }
            }
        }
    }

    async function loadWorkTypes() {
        try {
            const companyId = myCompany?.id || 51;
            const response = await makeApiRequest(`/worktypes/company/${companyId}`, 'GET');
            const taskTypeSelect = document.getElementById('newtaskTaskTypeSelect');
            if (taskTypeSelect && response) {
                let list = Array.isArray(response) ? response : (response.data || response.items || []);
                if (list.length > 0) {
                    let html = '<option value="">İş növü seçin</option>';
                    list.forEach(wt => {
                        if (wt.is_active !== false) {
                            html += `<option value="${wt.id}">${wt.work_type_name || wt.name || `İş növü ${wt.id}`}</option>`;
                        }
                    });
                    taskTypeSelect.innerHTML = html;
                    workTypes = list;
                } else {
                    taskTypeSelect.innerHTML = '<option value="">İş növü tapılmadı</option>';
                }
            }
        } catch (error) {
            console.error('❌ İş növləri xətası:', error);
            const el = document.getElementById('newtaskTaskTypeSelect');
            if (el) el.innerHTML = '<option value="">Xəta baş verdi</option>';
        }
    }

    async function loadParentCompanies() {
        try {
            const companyCode = window.taskManager?.userData?.companyCode;
            const response = await makeApiRequest(`/companies/${companyCode}/parent-companies`, 'GET');
            const parentSelect = document.getElementById('newtaskParentSelect');
            if (parentSelect) {
                let list = response?.data?.parent_companies || response?.data || (Array.isArray(response) ? response : []);
                if (list.length > 0) {
                    let html = '<option value="">Şirkət seçin</option>';
                    list.forEach(company => {
                        const id = company.company_id || company.id;
                        const name = company.company_name || company.name;
                        const code = company.company_code || company.code || company.parent_company_code || '';
                        html += `<option value="${id}" data-company-code="${code}" data-company-name="${name}">${name} ⬆️</option>`;
                    });
                    parentSelect.innerHTML = html;
                    parentCompanies = list;
                } else {
                    parentSelect.innerHTML = '<option value="">Şirkət tapılmadı</option>';
                }
            }
        } catch (error) {
            console.error('❌ şirkətlər xətası:', error);
        }
    }

    async function loadPartnerCompanies() {
        try {
            const companyCode = window.taskManager?.userData?.companyCode;
            const response = await makeApiRequest(`/partners/?company_code=${companyCode}`, 'GET');
            const partnerSelect = document.getElementById('newtaskPartnerSelect');
            if (partnerSelect) {
                let list = response?.items || (Array.isArray(response) ? response : response?.data || []);
                if (list.length > 0) {
                    let html = '<option value="">Partnyor seçin</option>';
                    list.forEach(partner => {
                        let name = partner.requester_company_code === companyCode
                            ? (partner.partner_company_name || partner.target_company_name || `Şirkət ${partner.target_company_code}`)
                            : (partner.partner_company_name || partner.requester_company_name || `Şirkət ${partner.requester_company_code}`);
                        html += `<option value="${partner.id}">${name}🤝</option>`;
                    });
                    partnerSelect.innerHTML = html;
                    partners = list;
                } else {
                    partnerSelect.innerHTML = '<option value="">Partnyor tapılmadı</option>';
                }
            }
        } catch (error) {
            console.error('❌ Partnyorlar xətası:', error);
        }
    }

    function populateSelects() {
        // Şirkət select
        const companySelect = document.getElementById('newtaskCompanySelect');
        if (companySelect) {
            let html = '<option value="">Şirkət seçin</option>';

            // myCompany məlumatını yoxla
            if (myCompany && myCompany.id) {
                // Şirkət adını tap
                let companyName = myCompany.company_name || myCompany.name;

                // Hələ də yoxdursa, token-dan və ya API-dan al
                if (!companyName || companyName === 'undefined') {
                    companyName = window.taskManager?.userData?.companyName
                        || window.taskManager?.userData?.companyCode
                        || myCompany.company_code;
                    // myCompany-ni də yenilə ki növbəti dəfə düzgün olsun
                    myCompany.company_name = companyName;
                    myCompany.name = companyName;
                }

                // Əgər hələ də yoxdursa, default
                if (!companyName || companyName === 'undefined') {
                }

                console.log('🏢 Göstəriləcək şirkət:', {
                    id: myCompany.id,
                    name: companyName,
                    code: myCompany.company_code
                });

                html += `<option value="${myCompany.id}" data-is-my="true" selected>🏢 ${companyName} (Mənim şirkətim)</option>`;
            } else {
                console.error('❌ myCompany məlumatları tam deyil:', myCompany);
                // Token-dan company məlumatını almağa çalış
                const token = getAuthToken();
                if (token) {
                    const payload = parseTokenPayload(token);
                    if (payload && payload.company_id) {
                        const companyName = payload.company_name || payload.company_code;
                        html += `<option value="${payload.company_id}" data-is-my="true" selected>🏢 ${companyName} (Mənim şirkətim)</option>`;
                        // myCompany-ni yenilə
                        myCompany = {
                            id: payload.company_id,
                            company_name: payload.company_name || payload.company_code,
                            company_code: payload.company_code,
                            name: payload.company_name || payload.company_code
                        };
                    } else {
                        html += `<option value="51" data-is-my="true" selected>🏢 Güvən Finans MMC (Mənim şirkətim)</option>`;
                        myCompany = { id: 51, company_name: 'Güvən Finans MMC', company_code: 'GUV26001' };
                    }
                } else {
                    html += `<option value="51" data-is-my="true" selected>🏢 Güvən Finans MMC (Mənim şirkətim)</option>`;
                    myCompany = { id: 51, company_name: 'Güvən Finans MMC', company_code: 'GUV26001' };
                }
            }

            // Alt şirkətləri əlavə et
            if (subsidiaryCompanies && subsidiaryCompanies.length > 0) {
                subsidiaryCompanies.forEach(s => {
                    const name = s.company_name || s.name;
                    const id = s.id;
                    if (id && name) {
                        html += `<option value="${id}" data-is-my="false">${name}</option>`;
                    }
                });
            }

            companySelect.innerHTML = html;
            console.log('📋 Company select dolduruldu, seçim sayı:', companySelect.options.length);
            console.log('📋 Seçilən option:', companySelect.options[companySelect.selectedIndex]?.text);
        }

        // İşçi select
        const parentSelect = document.getElementById('newtaskParentSelect');
        if (parentSelect && !parentSelect.dataset.parentEmployeeListener) {
            parentSelect.dataset.parentEmployeeListener = 'true';
            parentSelect.addEventListener('change', async (e) => {
                if (e.target.value) await loadCompanyEmployees(parseInt(e.target.value));
            });
        }

        const partnerSelect = document.getElementById('newtaskPartnerSelect');
        if (partnerSelect && !partnerSelect.dataset.partnerEmployeeListener) {
            partnerSelect.dataset.partnerEmployeeListener = 'true';
            partnerSelect.addEventListener('change', async (e) => {
                if (e.target.value) await loadCompanyEmployees(parseInt(e.target.value));
            });
        }

        const executorSelect = document.getElementById('newtaskExecutorSelect');
        if (executorSelect) {
            let html = '<option value="">İşçi seçin (boş qoymaq olar)</option>';
            if (employees && employees.length > 0) {
                employees.forEach(emp => {
                    const name = emp.full_name || emp.name || emp.ceo_name || emp.email;
                    if (name) {
                        html += `<option value="${emp.id}">${name} 👤</option>`;
                    }
                });
            }
            executorSelect.innerHTML = html;
        }

        // Şöbə select
        const departmentSelect = document.getElementById('newtaskDepartmentSelect');
        if (departmentSelect) {
            let html = '<option value="">Şöbə seçin</option>';
            if (departments && departments.length > 0) {
                departments.forEach(dept => {
                    const name = dept.department_name || dept.name;
                    if (name) {
                        html += `<option value="${dept.id}">${name}</option>`;
                    }
                });
            }
            departmentSelect.innerHTML = html;
        }

        // Digər şirkət işçisi
        const otherExecutorSelect = document.getElementById('newtaskOtherExecutorSelect');
        if (otherExecutorSelect) {
            otherExecutorSelect.innerHTML = '<option value="">İşçi seçin (boş qoymaq olar)</option>';
        }

        refreshCustomSelects();
    }


    // ================= CUSTOM LIQUID SELECTS =================
    const customSelectState = {
        initialized: false,
        observer: null,
        closingTimers: new WeakMap()
    };

    function getCustomSelects() {
        return Array.from(document.querySelectorAll('.newtask-field select, .glass-field select, .newtask-form-group select'));
    }

    function initCustomSelects() {
        getCustomSelects().forEach(buildCustomSelect);

        if (!customSelectState.initialized) {
            document.addEventListener('click', handleCustomSelectDocumentClick);
            document.addEventListener('keydown', handleCustomSelectDocumentKeydown);
            customSelectState.initialized = true;
        }

        if (!customSelectState.observer && modalOverlay) {
            customSelectState.observer = new MutationObserver((mutations) => {
                const changedSelects = new Set();
                mutations.forEach((mutation) => {
                    const targetSelect = mutation.target?.tagName === 'SELECT'
                        ? mutation.target
                        : mutation.target?.closest?.('select');
                    if (targetSelect && targetSelect.classList.contains('newtask-select')) {
                        changedSelects.add(targetSelect);
                    }
                });
                changedSelects.forEach((select) => refreshCustomSelectById(select.id));
            });
            customSelectState.observer.observe(modalOverlay, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'selected'] });
        }
    }

    function buildCustomSelect(select) {
        if (!select || !select.id) return null;

        const existing = select.parentNode?.querySelector(`.nt-custom-select[data-select-id="${select.id}"]`);
        if (existing) {
            existing.__nativeSelect = select;
            rebuildCustomOptions(select, existing);
            syncCustomSelectValue(select);
            return existing;
        }

        select.classList.add('nt-native-select-hidden');
        select.dataset.customSelectReady = 'true';

        const wrapper = document.createElement('div');
        wrapper.className = 'nt-custom-select';
        wrapper.dataset.selectId = select.id;
        wrapper.__nativeSelect = select;

        wrapper.innerHTML = `
            <button type="button" class="nt-select-trigger" aria-haspopup="listbox" aria-expanded="false">
                <span class="nt-select-value"></span>
                <i class="fas fa-chevron-down nt-select-arrow" aria-hidden="true"></i>
            </button>
            <div class="nt-select-menu" role="listbox" aria-hidden="true">
                <div class="nt-select-options">
                    <div class="nt-select-highlight"></div>
                </div>
            </div>
        `;

        select.insertAdjacentElement('afterend', wrapper);
        rebuildCustomOptions(select, wrapper);
        syncCustomSelectValue(select);

        wrapper.querySelector('.nt-select-trigger')?.addEventListener('click', handleCustomSelectTriggerClick);
        wrapper.querySelector('.nt-select-trigger')?.addEventListener('keydown', handleCustomSelectTriggerKeydown);
        wrapper.querySelector('.nt-select-options')?.addEventListener('click', handleCustomSelectOptionsClick);
        wrapper.querySelector('.nt-select-options')?.addEventListener('mousemove', handleCustomSelectOptionsMousemove);
        wrapper.querySelector('.nt-select-options')?.addEventListener('mouseleave', () => moveHighlightToActive(wrapper, true));
        select.addEventListener('change', () => syncCustomSelectValue(select));

        return wrapper;
    }

    function rebuildCustomOptions(select, wrapper) {
        const optionsBox = wrapper.querySelector('.nt-select-options');
        if (!optionsBox) return;
        wrapper.querySelectorAll('.nt-select-menu > .nt-select-highlight').forEach((highlight) => highlight.remove());
        optionsBox.innerHTML = '';
        const highlight = document.createElement('div');
        highlight.className = 'nt-select-highlight';
        optionsBox.appendChild(highlight);
        Array.from(select.options).forEach((option, index) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'nt-select-option';
            button.dataset.value = option.value;
            button.dataset.index = String(index);
            button.textContent = option.textContent;
            button.disabled = option.disabled;
            button.setAttribute('role', 'option');
            Array.from(option.attributes).forEach((attr) => {
                if (attr.name.startsWith('data-')) button.setAttribute(attr.name, attr.value);
            });
            optionsBox.appendChild(button);
        });
        syncCustomSelectValue(select);
    }

    function refreshCustomSelects() { getCustomSelects().forEach((select) => refreshCustomSelectById(select.id)); }

    function refreshCustomSelectById(selectId) {
        const select = document.getElementById(selectId);
        if (!select) return;
        const wrapper = select.parentNode?.querySelector(`.nt-custom-select[data-select-id="${selectId}"]`) || buildCustomSelect(select);
        if (!wrapper) return;
        select.classList.add('nt-native-select-hidden');
        wrapper.__nativeSelect = select;
        rebuildCustomOptions(select, wrapper);
        syncCustomSelectValue(select);
    }

    function openCustomSelect(wrapper) {
        if (!wrapper) return;
        closeAllCustomSelects(wrapper);
        const select = wrapper.__nativeSelect || document.getElementById(wrapper.dataset.selectId);
        if (select?.disabled) return;
        const timer = customSelectState.closingTimers.get(wrapper);
        if (timer) clearTimeout(timer);
        wrapper.classList.remove('is-closing', 'open-up');
        const menu = wrapper.querySelector('.nt-select-menu');
        const rect = wrapper.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        if (spaceBelow < 330 && rect.top > spaceBelow) wrapper.classList.add('open-up');
        wrapper.classList.add('is-open');
        wrapper.querySelector('.nt-select-trigger')?.setAttribute('aria-expanded', 'true');
        menu?.setAttribute('aria-hidden', 'false');
        requestAnimationFrame(() => moveHighlightToActive(wrapper, false));
    }

    function closeCustomSelect(wrapper) {
        if (!wrapper || !wrapper.classList.contains('is-open')) return;
        wrapper.classList.remove('is-open');
        wrapper.classList.add('is-closing');
        wrapper.querySelector('.nt-select-trigger')?.setAttribute('aria-expanded', 'false');
        wrapper.querySelector('.nt-select-menu')?.setAttribute('aria-hidden', 'true');
        wrapper.querySelector('.nt-select-highlight')?.style.setProperty('opacity', '0');
        const timer = setTimeout(() => wrapper.classList.remove('is-closing', 'open-up'), 260);
        customSelectState.closingTimers.set(wrapper, timer);
    }

    function closeAllCustomSelects(exceptWrapper) {
        document.querySelectorAll('.nt-custom-select.is-open').forEach((wrapper) => {
            if (wrapper !== exceptWrapper) closeCustomSelect(wrapper);
        });
    }

    function syncCustomSelectValue(select) {
        const wrapper = select?.parentNode?.querySelector(`.nt-custom-select[data-select-id="${select.id}"]`);
        if (!wrapper) return;
        const selectedOption = select.options[select.selectedIndex] || select.options[0];
        wrapper.querySelector('.nt-select-value').textContent = selectedOption?.textContent || '';
        wrapper.classList.toggle('is-disabled', select.disabled);
        wrapper.querySelectorAll('.nt-select-option').forEach((option) => {
            const isActive = option.dataset.index === String(select.selectedIndex);
            option.classList.toggle('is-selected', isActive);
            option.setAttribute('aria-selected', String(isActive));
        });
        moveHighlightToActive(wrapper, true);
    }

    function handleCustomOptionSelect(select, optionValue, optionIndex = null) {
        if (!select) return;
        select.value = optionValue;
        if (select.value !== optionValue && optionIndex !== null) select.selectedIndex = Number(optionIndex);
        select.dispatchEvent(new Event('change', { bubbles: true }));
        syncCustomSelectValue(select);
    }

    function handleCustomSelectTriggerClick(e) {
        const wrapper = e.currentTarget.closest('.nt-custom-select');
        wrapper.classList.contains('is-open') ? closeCustomSelect(wrapper) : openCustomSelect(wrapper);
    }

    function handleCustomSelectTriggerKeydown(e) {
        if (!['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) return;
        e.preventDefault();
        const wrapper = e.currentTarget.closest('.nt-custom-select');
        openCustomSelect(wrapper);
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') focusAdjacentCustomOption(wrapper, e.key === 'ArrowDown' ? 1 : -1);
    }

    function handleCustomSelectOptionsClick(e) {
        const option = e.target.closest('.nt-select-option');
        if (!option || option.disabled) return;
        const wrapper = option.closest('.nt-custom-select');
        handleCustomOptionSelect(wrapper.__nativeSelect || document.getElementById(wrapper.dataset.selectId), option.dataset.value, option.dataset.index);
        closeCustomSelect(wrapper);
        wrapper.querySelector('.nt-select-trigger')?.focus();
    }

    function handleCustomSelectOptionsMousemove(e) {
        const option = e.target.closest('.nt-select-option');
        if (option) moveHighlightToOption(option.closest('.nt-custom-select'), option, true);
    }

    function handleCustomSelectDocumentClick(e) {
        if (!e.target.closest('.nt-custom-select')) closeAllCustomSelects();
    }

    function handleCustomSelectDocumentKeydown(e) {
        const wrapper = document.querySelector('.nt-custom-select.is-open');
        if (!wrapper) return;
        if (e.key === 'Escape') { e.preventDefault(); closeCustomSelect(wrapper); wrapper.querySelector('.nt-select-trigger')?.focus(); }
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); focusAdjacentCustomOption(wrapper, e.key === 'ArrowDown' ? 1 : -1); }
        if (e.key === 'Enter' || e.key === ' ') {
            const focused = wrapper.querySelector('.nt-select-option.is-key-focused') || wrapper.querySelector('.nt-select-option.is-selected:not(:disabled)');
            if (focused && !focused.disabled) { e.preventDefault(); handleCustomOptionSelect(wrapper.__nativeSelect, focused.dataset.value, focused.dataset.index); closeCustomSelect(wrapper); }
        }
    }

    function focusAdjacentCustomOption(wrapper, direction) {
        const options = Array.from(wrapper.querySelectorAll('.nt-select-option:not(:disabled)'));
        if (!options.length) return;
        const current = wrapper.querySelector('.nt-select-option.is-key-focused') || wrapper.querySelector('.nt-select-option.is-selected:not(:disabled)');
        let index = options.indexOf(current);
        index = index < 0 ? 0 : (index + direction + options.length) % options.length;
        wrapper.querySelectorAll('.nt-select-option.is-key-focused').forEach((el) => el.classList.remove('is-key-focused'));
        options[index].classList.add('is-key-focused');
        options[index].scrollIntoView({ block: 'nearest' });
        moveHighlightToOption(wrapper, options[index], true);
    }

    function moveHighlightToActive(wrapper, fadeIfMissing) {
        const active = wrapper?.querySelector('.nt-select-option.is-selected:not(:disabled)');
        if (active) moveHighlightToOption(wrapper, active, true);
        else if (fadeIfMissing) wrapper?.querySelector('.nt-select-highlight')?.style.setProperty('opacity', '0');
    }

    function moveHighlightToOption(wrapper, option, visible) {
        const menu = wrapper?.querySelector('.nt-select-menu');
        const optionsBox = wrapper?.querySelector('.nt-select-options');
        const highlight = optionsBox?.querySelector('.nt-select-highlight');
        if (!wrapper || !menu || !optionsBox || !highlight || !option) return;
        if (!wrapper.classList.contains('is-open')) {
            highlight.style.opacity = '0';
            return;
        }
        if (!optionsBox.contains(option) || option.classList.contains('nt-select-highlight')) {
            highlight.style.opacity = '0';
            return;
        }
        highlight.style.opacity = visible ? '1' : '0';
        highlight.style.height = `${option.offsetHeight}px`;
        highlight.style.transform = `translate3d(0, ${option.offsetTop}px, 0)`;
    }


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
            if (modalTitleIcon) modalTitleIcon.className = 'fas fa-arrow-up';
            if (modalTitleText) modalTitleText.textContent = 'Şirkət Tapşırığı';

            const parentSelect = document.getElementById('newtaskParentSelect');
            if (parentSelect && !parentSelect.dataset.parentEmployeeListener) {
                parentSelect.dataset.parentEmployeeListener = 'true';
                parentSelect.addEventListener('change', async (e) => {
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
        modalOverlay.classList.add('active');
        resetForm();
        refreshCustomSelects();
    }

    async function selectCompanyCEO(companyId) {
        try {
            const otherExecutorSelect = document.getElementById('newtaskOtherExecutorSelect');
            if (!otherExecutorSelect) return;
            let ceoOption = null, ceoId = null;
            for (let i = 0; i < otherExecutorSelect.options.length; i++) {
                const opt = otherExecutorSelect.options[i];
                const text = opt.text.toLowerCase();
                if (text.includes('ceo') || text.includes('rəhbər') || text.includes('director') || text.includes('baş')) {
                    ceoOption = opt; ceoId = opt.value; break;
                }
            }
            if (!ceoOption && otherExecutorSelect.options.length > 1) {
                ceoOption = otherExecutorSelect.options[1];
                ceoId = ceoOption?.value;
            }
            if (ceoId && ceoOption) {
                otherExecutorSelect.value = ceoId;
                otherExecutorSelect.dispatchEvent(new Event('change', { bubbles: true }));
                showAutoSelectNotification('rəhbər', ceoOption.text.replace('👤', '').trim());
            }
        } catch (error) {
            console.error('❌ Rəhbər seçmə xətası:', error);
        }
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
        closeAllCustomSelects();
        modalOverlay.classList.remove('active');
        resetForm();
    }

    function resetForm() {
        const form = document.getElementById('newtaskForm');
        if (form) form.reset();

        // Fayl siyahısını təmizlə
        if (window.modalSelectedFiles) {
            window.modalSelectedFiles = [];
        }
        const fileList = document.getElementById('newtaskFileList');
        if (fileList) {
            updateModalFileList(); // Bu artıq boş siyahını göstərəcək
        }
        if (fileList) fileList.innerHTML = '<div class="newtask-file-list-empty">Heç bir fayl seçilməyib</div>';

        // 🔥 AUDIO MƏLUMATLARINI TƏMİZLƏ
        resetVoiceRecorderToIdle({ keepSavedFiles: false, clearCurrentAudio: true });

        // Default due date (sabah)
        const dueDateInput = document.getElementById('newtaskDueDate');
        if (dueDateInput) {
            const d = new Date();
            d.setDate(d.getDate() + 1);
            dueDateInput.value = d.toISOString().split('T')[0];
        }

        refreshCustomSelects();
        console.log('✅ Form təmizləndi');
    }

    function stopRecording() {
        if (mediaRecorder && isRecording) {
            stopTimer();
            if (animationId) cancelAnimationFrame(animationId);
            isRecording = false;
            isPaused = false;
            if (mediaRecorder.state !== 'inactive') mediaRecorder.stop();
            stopAudioStream();
        }
    }


    // ========== PRTSCN (EKRAIN ŞƏKİLİ) CAPTURE ==========
    function setupPrintScreenCapture() {
        console.log('📸 PrtScn capture modal üçün aktiv edilir...');

        // Qlobal paste eventini dinlə
        document.addEventListener('paste', (event) => {
            // Yalnız modal açıq olduqda işlə
            const modal = document.getElementById('newtaskModalOverlay');
            if (!modal || !modal.classList.contains('active')) {
                return; // Modal açıq deyil, ignore et
            }

            console.log('📋 Modalda paste edildi');

            const items = event.clipboardData?.items;
            if (!items) return;

            let imageFound = false;

            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item.type.indexOf('image') !== -1) {
                    imageFound = true;
                    const file = item.getAsFile();
                    if (file) {
                        // Unikal fayl adı yarat
                        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                        const fileName = `prtscrn-${timestamp}.png`;
                        const imageFile = new File([file], fileName, { type: 'image/png' });

                        console.log(`📸 PrtScn şəkli tapıldı: ${fileName}, ölçü: ${formatFileSize(imageFile.size)}`);

                        // Faylı modal siyahısına əlavə et
                        if (!window.modalSelectedFiles) {
                            window.modalSelectedFiles = [];
                        }

                        // Dublikat yoxla
                        const isDuplicate = window.modalSelectedFiles.some(f => f.name === fileName);
                        if (!isDuplicate) {
                            window.modalSelectedFiles.push(imageFile);
                            console.log(`✅ PrtScn şəkli modal siyahısına əlavə edildi: ${fileName}`);
                            updateModalFileList(); // Fayl siyahısını yenilə
                        }

                        // Event-in default davranışını dayandır
                        event.preventDefault();
                    }
                    break;
                }
            }

            if (!imageFound) {
                console.log('ℹ️ Clipboard-da şəkil yoxdur');
            }
        });

        console.log('✅ PrtScn capture modal üçün hazırdır');
    }

    function cacheAudioRecorderElements() {
        voiceShell = document.getElementById('newtaskVoiceShell');
        voiceRecordingUi = document.getElementById('newtaskVoiceRecordingUi');
        startBtn = document.getElementById('newtaskStartRecord');
        stopBtn = document.getElementById('newtaskStopRecord');
        pauseBtn = document.getElementById('newtaskPauseRecord');
        saveBtn = document.getElementById('newtaskSaveRecord');
        previewBtn = document.getElementById('newtaskPreviewPlay');
        visualizer = document.getElementById('newtaskAudioVisualizer');
        recordedAudio = document.getElementById('newtaskRecordedAudio');
        audioData = document.getElementById('newtaskAudioData');
        audioFilename = document.getElementById('newtaskAudioFilename');
        audioStatus = document.getElementById('newtaskAudioStatus');
        recordingTimer = document.getElementById('newtaskRecordingTimer');
        timerDisplay = document.getElementById('newtaskTimerDisplay');
    }

    function bindAudioRecorderEvents() {
        if (recorderEventsBound || !startBtn) return;
        recorderEventsBound = true;
        startBtn.addEventListener('click', startRecording);
        stopBtn?.addEventListener('click', cancelCurrentVoiceRecording);
        pauseBtn?.addEventListener('click', togglePauseResume);
        saveBtn?.addEventListener('click', saveRecordedAudioToTask);
        previewBtn?.addEventListener('click', togglePreviewPlayback);
        recordedAudio?.addEventListener('ended', () => setPreviewIcon(false));
        recordedAudio?.addEventListener('pause', () => setPreviewIcon(false));
        recordedAudio?.addEventListener('play', () => setPreviewIcon(true));
    }

    function setVoiceState(state) {
        if (voiceShell) voiceShell.dataset.state = state;
        if (startBtn) {
            startBtn.hidden = state !== 'idle';
            startBtn.disabled = state !== 'idle';
        }
        if (voiceRecordingUi) voiceRecordingUi.hidden = state === 'idle';
        if (previewBtn) previewBtn.hidden = !['paused', 'stopped', 'saved'].includes(state);
        if (stopBtn) stopBtn.disabled = !['recording', 'paused'].includes(state);
        if (pauseBtn) {
            pauseBtn.hidden = ['idle', 'stopped', 'saved'].includes(state);
            pauseBtn.disabled = !['recording', 'paused'].includes(state);
            const pauseIcon = pauseBtn.querySelector('i');
            if (pauseIcon) pauseIcon.className = state === 'paused' ? 'fas fa-microphone' : 'fas fa-pause';
            pauseBtn.setAttribute('aria-label', state === 'paused' ? 'Davam et' : 'Pauza');
        }
        if (saveBtn) saveBtn.disabled = !['recording', 'paused', 'stopped'].includes(state);
        if (recordingTimer) recordingTimer.hidden = !['recording', 'paused', 'stopped', 'saved'].includes(state);
        const statusText = { idle: 'Səs qeydi hazırdır', recording: 'Qeyd edilir...', paused: 'Pauzada', stopped: 'Qeyd dayandırıldı', saved: 'Səs qeydi əlavə edildi' }[state] || 'Səs qeydi hazırdır';
        if (audioStatus) audioStatus.innerHTML = `<span>${statusText}</span>`;
    }

    function formatRecordingTime(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        return `${String(Math.floor(totalSeconds / 60)).padStart(2, '0')}:${String(totalSeconds % 60).padStart(2, '0')}`;
    }

    function updateTimerDisplay() {
        const elapsed = isRecording && !isPaused ? elapsedBeforePause + (Date.now() - recordingStartedAt) : elapsedBeforePause;
        if (timerDisplay) timerDisplay.textContent = formatRecordingTime(elapsed);
    }

    function startTimer() { clearInterval(timerInterval); recordingStartedAt = Date.now(); timerInterval = setInterval(updateTimerDisplay, 250); updateTimerDisplay(); }
    function pauseTimer() { if (isRecording && !isPaused) elapsedBeforePause += Date.now() - recordingStartedAt; clearInterval(timerInterval); updateTimerDisplay(); }
    function stopTimer() { if (isRecording && !isPaused) elapsedBeforePause += Date.now() - recordingStartedAt; clearInterval(timerInterval); updateTimerDisplay(); }

    function preventRecorderButtonEvent(event) { event?.preventDefault(); event?.stopPropagation(); }

    async function startRecording(event) {
        preventRecorderButtonEvent(event);
        if (isRecording || (mediaRecorder && mediaRecorder.state !== 'inactive')) return;
        try {
            resetVoiceRecorderToIdle({ keepSavedFiles: true, clearCurrentAudio: true, keepState: true });
            audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createMediaStreamSource(audioStream);
            audioAnalyser = audioContext.createAnalyser();
            audioAnalyser.fftSize = 256;
            audioAnalyser.smoothingTimeConstant = 0.72;
            source.connect(audioAnalyser);
            mediaRecorder = new MediaRecorder(audioStream);
            audioChunks = [];
            audioBlob = null;
            recorderStopPromise = new Promise(resolve => { recorderStopResolve = resolve; });
            mediaRecorder.ondataavailable = e => { if (e.data && e.data.size) audioChunks.push(e.data); };
            mediaRecorder.onstop = () => {
                audioBlob = buildCurrentAudioBlob();
                updatePreviewAudioFromChunks();
                stopAudioStream();
                stopTimer();
                stopWaveform();
                isRecording = false;
                isPaused = false;
                setVoiceState('stopped');
                recorderStopResolve?.(audioBlob);
                recorderStopResolve = null;
            };
            if (audioData) audioData.value = '';
            if (audioFilename) audioFilename.value = '';
            if (timerDisplay) timerDisplay.textContent = '00:00';
            waveformLevels = new Array(28).fill(0.22);
            lastWaveformLevels = new Array(28).fill(0.22);
            mediaRecorder.start(250);
            isRecording = true;
            isPaused = false;
            elapsedBeforePause = 0;
            setVoiceState('recording');
            startTimer();
            startWaveform();
        } catch (err) {
            console.error('Mikrofon xətası:', err);
            alert('Mikrofon icazəsi tələb olunur!');
            resetVoiceRecorderToIdle({ keepSavedFiles: true, clearCurrentAudio: true });
        }
    }

    function togglePauseResume(event) { preventRecorderButtonEvent(event); if (isPaused) resumeRecording(); else pauseRecording(); }

    function pauseRecording() {
        if (!mediaRecorder || mediaRecorder.state !== 'recording') return;
        try { mediaRecorder.requestData?.(); mediaRecorder.pause?.(); } catch (err) { console.warn('Pauza xətası:', err); }
        isPaused = true;
        pauseTimer();
        stopWaveform();
        setVoiceState('paused');
        setTimeout(() => { updatePreviewAudioFromChunks(); drawWaveform({ live: false }); }, 120);
    }

    function resumeRecording() {
        if (!mediaRecorder || mediaRecorder.state !== 'paused') return;
        try { mediaRecorder.resume?.(); } catch (err) { console.warn('Davam etdirmə xətası:', err); }
        if (recordedAudio) recordedAudio.pause();
        isPaused = false;
        setVoiceState('recording');
        startTimer();
        startWaveform();
    }

    function stopRecordingFinal(event) {
        preventRecorderButtonEvent(event);
        if (!mediaRecorder || mediaRecorder.state === 'inactive') return recorderStopPromise || Promise.resolve(audioBlob);
        try { mediaRecorder.requestData?.(); } catch (err) { console.warn('requestData xətası:', err); }
        stopTimer();
        stopWaveform();
        try { mediaRecorder.stop(); } catch (err) { console.warn('Stop xətası:', err); }
        return recorderStopPromise || Promise.resolve(audioBlob);
    }

    function buildCurrentAudioBlob() {
        if (!audioChunks.length) return audioBlob;
        return new Blob(audioChunks, { type: mediaRecorder?.mimeType || audioBlob?.type || 'audio/webm' });
    }

    function updatePreviewAudioFromChunks() {
        const blob = buildCurrentAudioBlob();
        if (!blob || !recordedAudio) return null;
        audioBlob = blob;
        if (previewAudioUrl) URL.revokeObjectURL(previewAudioUrl);
        previewAudioUrl = URL.createObjectURL(blob);
        recordedAudio.src = previewAudioUrl;
        return blob;
    }

    function setPreviewIcon(playing) { const icon = previewBtn?.querySelector('i'); if (icon) icon.className = playing ? 'fas fa-pause' : 'fas fa-play'; }

    function togglePreviewPlayback(event) {
        preventRecorderButtonEvent(event);
        if (!recordedAudio) return;
        if (isPaused) updatePreviewAudioFromChunks();
        if (!recordedAudio.src && !updatePreviewAudioFromChunks()) return;
        if (recordedAudio.paused) recordedAudio.play().catch(err => console.warn('Preview play xətası:', err));
        else recordedAudio.pause();
    }

    async function ensureCurrentRecordingFinalized() {
        if (mediaRecorder && ['recording', 'paused'].includes(mediaRecorder.state)) {
            await stopRecordingFinal();
        }
        if (!audioBlob) audioBlob = buildCurrentAudioBlob();
        return audioBlob;
    }

    async function saveRecordedAudioToTask(event) {
        preventRecorderButtonEvent(event);
        if (saveBtn) saveBtn.disabled = true;

        const finalBlob = await ensureCurrentRecordingFinalized();
        if (!finalBlob) {
            resetVoiceRecorderToIdle({ keepSavedFiles: true, clearCurrentAudio: true });
            return;
        }

        const filename = `recording_${Date.now()}.webm`;
        const audioFile = new File([finalBlob], filename, { type: finalBlob.type || 'audio/webm' });
        window.modalSelectedFiles = window.modalSelectedFiles || [];
        window.modalSelectedFiles.push(audioFile);

        if (typeof updateModalFileList === 'function') {
            updateModalFileList();
        }

        resetVoiceRecorderToIdle({ keepSavedFiles: true, clearCurrentAudio: true });
    }

    function cancelCurrentVoiceRecording(event) {
        preventRecorderButtonEvent(event);
        resetVoiceRecorderToIdle({ keepSavedFiles: true, clearCurrentAudio: true });
    }

    function resetVoiceRecorderToIdle(options = {}) {
        const {
            keepSavedFiles = true,
            clearCurrentAudio = true,
            keepState = false
        } = options;

        if (!keepSavedFiles) {
            window.modalSelectedFiles = [];
        }

        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.onstop = null;
            try { mediaRecorder.requestData?.(); } catch (err) { console.warn('Recorder reset requestData xətası:', err); }
            try { mediaRecorder.stop(); } catch (err) { console.warn('Recorder reset stop xətası:', err); }
        }

        stopWaveform();
        stopTimer();
        stopAudioStream();

        if (recordedAudio) {
            recordedAudio.pause();
            recordedAudio.removeAttribute('src');
            recordedAudio.load?.();
        }
        if (previewAudioUrl) URL.revokeObjectURL(previewAudioUrl);
        previewAudioUrl = null;

        mediaRecorder = null;
        recorderStopPromise = null;
        recorderStopResolve = null;
        if (clearCurrentAudio) {
            audioChunks = [];
            audioBlob = null;
            if (audioData) audioData.value = '';
            if (audioFilename) audioFilename.value = '';
        }
        isRecording = false;
        isPaused = false;
        elapsedBeforePause = 0;
        recordingStartedAt = 0;
        waveformLevels = new Array(28).fill(0.22);
        lastWaveformLevels = new Array(28).fill(0.22);
        if (timerDisplay) timerDisplay.textContent = '00:00';
        setPreviewIcon(false);
        if (visualizer) {
            const ctx = visualizer.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, visualizer.width || visualizer.clientWidth, visualizer.height || visualizer.clientHeight);
        }
        if (!keepState) setVoiceState('idle');
    }

    function resetAudioRecorder(options = {}) {
        resetVoiceRecorderToIdle({
            keepSavedFiles: options.keepSavedFiles ?? true,
            clearCurrentAudio: options.clearCurrentAudio ?? true,
            keepState: options.keepState ?? false
        });
    }

    function drawRoundedBar(ctx, x, centerY, width, height, radius) {
        const y = centerY - height / 2;
        if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, width, height, radius); ctx.fill(); return; }
        const r = Math.min(radius, width / 2, height / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y); ctx.lineTo(x + width - r, y); ctx.quadraticCurveTo(x + width, y, x + width, y + r);
        ctx.lineTo(x + width, y + height - r); ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
        ctx.lineTo(x + r, y + height); ctx.quadraticCurveTo(x, y + height, x, y + height - r);
        ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.fill();
    }

    function drawWaveform({ live = false } = {}) {
        if (!visualizer) return;
        const dpr = window.devicePixelRatio || 1;
        const rect = visualizer.getBoundingClientRect();
        const width = rect.width || 360;
        const height = rect.height || 86;
        if (rect.width && rect.height) { visualizer.width = Math.round(rect.width * dpr); visualizer.height = Math.round(rect.height * dpr); }
        const ctx = visualizer.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const centerY = height / 2;
        const bars = waveformLevels.length;
        const gap = 5;
        const barWidth = Math.max(5, (width - gap * (bars - 1)) / bars);
        let dataArray = null;
        if (live && audioAnalyser && !isPaused) { dataArray = new Uint8Array(audioAnalyser.frequencyBinCount); audioAnalyser.getByteFrequencyData(dataArray); }
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#08aeea';
        for (let i = 0; i < bars; i++) {
            const raw = dataArray ? dataArray[Math.floor((i / bars) * dataArray.length)] / 255 : lastWaveformLevels[i];
            const target = Math.max(0.16, Math.min(1, raw));
            waveformLevels[i] += (target - waveformLevels[i]) * 0.22;
            lastWaveformLevels[i] = waveformLevels[i];
            const barHeight = Math.max(10, waveformLevels[i] * (height - 14));
            drawRoundedBar(ctx, i * (barWidth + gap), centerY, barWidth, barHeight, barWidth / 2);
        }
    }

    function startWaveform() { stopWaveform(); const animate = () => { drawWaveform({ live: true }); if (isRecording && !isPaused) animationId = requestAnimationFrame(animate); }; animate(); }
    function stopWaveform() { if (animationId) cancelAnimationFrame(animationId); animationId = null; }

    function stopAudioStream() {
        if (audioStream) audioStream.getTracks().forEach(track => track.stop());
        audioStream = null;
        if (audioContext) audioContext.close().catch(() => {});
        audioContext = null;
        audioAnalyser = null;
    }

    function stopRecording() { stopRecordingFinal(); }

    function setupAudioRecorder() {
        cacheAudioRecorderElements();
        bindAudioRecorderEvents();
        resetVoiceRecorderToIdle({ keepSavedFiles: false, clearCurrentAudio: true });
    }

    // ========== UPDATE MODAL FILE LIST ==========
    function updateModalFileList() {
        const fileList = document.getElementById('newtaskFileList');
        if (!fileList) return;

        if (!window.modalSelectedFiles || window.modalSelectedFiles.length === 0) {
            fileList.innerHTML = '<div class="newtask-file-list-empty">Heç bir fayl seçilməyib</div>';
            return;
        }

        let html = '<div class="newtask-file-list-header">📎 Seçilmiş fayllar:</div>';

        window.modalSelectedFiles.forEach((file, index) => {
            const isAudio = file.type.startsWith('audio/') || file.name.includes('recording') || file.name.includes('webm');
            const isImage = file.type.startsWith('image/');
            const icon = isAudio ? 'fas fa-microphone' : (isImage ? 'fas fa-image' : 'fas fa-file');
            const iconColor = isAudio ? '#3b82f6' : (isImage ? '#10b981' : '#64748b');
            const size = formatFileSize(file.size);

            html += `
                <div class="newtask-file-item" data-index="${index}">
                    <div class="newtask-file-item-icon">
                        <i class="${icon}" style="color: ${iconColor};"></i>
                    </div>
                    <div class="newtask-file-item-meta">
                        <div class="newtask-file-item-name">${escapeHtml(file.name)}</div>
                        <div class="newtask-file-item-size">${size}</div>
                    </div>
                    <button class="newtask-file-remove" onclick="removeModalFile(${index})" aria-label="Faylı sil">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        });

        fileList.innerHTML = html;
        console.log(`📊 File list yeniləndi: ${window.modalSelectedFiles.length} fayl`);
    }

    function formatFileSize(bytes) {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Global silmə funksiyası
    window.removeModalFile = function(index) {
        if (index >= 0 && window.modalSelectedFiles && index < window.modalSelectedFiles.length) {
            const removed = window.modalSelectedFiles.splice(index, 1);
            console.log(`🗑️ Fayl silindi: ${removed[0]?.name}`);
            updateModalFileList();
        }
    };

    async function autoSelectDepartmentByEmployee(employeeId) {
        try {
            let employee = employees.find(emp => emp.id == employeeId);
            if (employee) {
                const departmentId = employee.department_id || employee.departmentId || employee.department?.id;
                if (departmentId) {
                    const departmentSelect = document.getElementById('newtaskDepartmentSelect');
                    if (departmentSelect) {
                        departmentSelect.value = departmentId;
                        departmentSelect.dispatchEvent(new Event('change', { bubbles: true }));
                        showAutoSelectNotification('departament', employee.full_name || employee.name);
                    }
                }
            } else {
                const response = await makeApiRequest(`/users/${employeeId}`, 'GET');
                const userData = response.data || response;
                const departmentId = userData.department_id || userData.departmentId || userData.department?.id;
                if (departmentId) {
                    const departmentSelect = document.getElementById('newtaskDepartmentSelect');
                    if (departmentSelect) {
                        departmentSelect.value = departmentId;
                        departmentSelect.dispatchEvent(new Event('change', { bubbles: true }));
                        showAutoSelectNotification('departament', userData.full_name || userData.name);
                    }
                }
            }
        } catch (error) {
            console.error('❌ Departament seçmə xətası:', error);
        }
    }

    function showAutoSelectNotification(type, name) {
        const n = document.createElement('div');
        n.innerHTML = `<i class="fas fa-magic"></i> <span>${name} üçün ${type === 'departament' ? 'şöbə' : 'şirkət'} avtomatik seçildi</span>`;
        n.style.cssText = 'position:fixed;bottom:20px;left:20px;background:#28a745;color:white;padding:8px 16px;border-radius:20px;font-size:12px;z-index:10002;display:flex;align-items:center;gap:8px;box-shadow:0 2px 8px rgba(0,0,0,0.15);';
        document.body.appendChild(n);
        setTimeout(() => n.remove(), 2000);
    }

    function setupFileUpload() {
        console.log('📁 File upload setup başlayır...');

        const fileZone = document.getElementById('newtaskFileZone');
        const fileInput = document.getElementById('newtaskFileInput');

        if (!fileZone || !fileInput) {
            console.error('❌ File upload elementləri tapılmadı!');
            return;
        }

        // Faylları saxlamaq üçün array
        window.modalSelectedFiles = window.modalSelectedFiles || [];

        // File zone-a klik
        fileZone.onclick = () => {
            fileInput.click();
        };

        // Drag over
        fileZone.ondragover = (e) => {
            e.preventDefault();
            fileZone.classList.add('drag-over');
        };

        fileZone.ondragleave = () => {
            fileZone.classList.remove('drag-over');
        };

        fileZone.ondrop = (e) => {
            e.preventDefault();
            fileZone.classList.remove('drag-over');
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                addFilesToModal(Array.from(e.dataTransfer.files));
            }
        };

        // File input change
        fileInput.onchange = (e) => {
            if (e.target.files && e.target.files.length > 0) {
                addFilesToModal(Array.from(e.target.files));
                fileInput.value = '';
            }
        };

        function addFilesToModal(newFiles) {
            if (!newFiles || newFiles.length === 0) return;

            for (const file of newFiles) {
                const isDuplicate = window.modalSelectedFiles.some(f => f.name === file.name && f.size === file.size);
                if (!isDuplicate) {
                    window.modalSelectedFiles.push(file);
                    console.log(`✅ Fayl əlavə edildi: ${file.name}`);
                }
            }
            updateModalFileList();
        }

        // İlk dəfə listi yenilə
        updateModalFileList();

        console.log('✅ File upload setup tamamlandı!');
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
                    if (otherEl) {
                        otherEl.innerHTML = '<option value="">İşçi seçin (boş qoymaq olar)</option>';
                        refreshCustomSelectById('newtaskOtherExecutorSelect');
                    }
                }
            });
        }

        const parentSelect = document.getElementById('newtaskParentSelect');
        if (parentSelect && !parentSelect.dataset.parentEmployeeListener) {
            parentSelect.dataset.parentEmployeeListener = 'true';
            parentSelect.addEventListener('change', async (e) => {
                if (e.target.value) await loadCompanyEmployees(parseInt(e.target.value));
            });
        }

        const partnerSelect = document.getElementById('newtaskPartnerSelect');
        if (partnerSelect && !partnerSelect.dataset.partnerEmployeeListener) {
            partnerSelect.dataset.partnerEmployeeListener = 'true';
            partnerSelect.addEventListener('change', async (e) => {
                if (e.target.value) await loadCompanyEmployees(parseInt(e.target.value));
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
            refreshCustomSelectById('newtaskOtherExecutorSelect');

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
                    refreshCustomSelectById('newtaskOtherExecutorSelect');
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
                    refreshCustomSelectById('newtaskOtherExecutorSelect');
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
                    const pid = partner.partner_company_id || partner.company_id || partner.target_company_id || partner.id;
                    if (pid == companyId || partner.id == companyId) {
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
                refreshCustomSelectById('newtaskOtherExecutorSelect');
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
                    otherExecutorSelect.dispatchEvent(new Event('change', { bubbles: true }));
                    showAutoSelectNotification('rəhbər', ceoName);
                } else if (employeesList.length > 0) {
                    otherExecutorSelect.value = employeesList[0].id;
                    otherExecutorSelect.dispatchEvent(new Event('change', { bubbles: true }));
                }
            } else {
                otherExecutorSelect.innerHTML = '<option value="">İşçi tapılmadı</option>';
            }
            otherExecutorSelect.disabled = false;
            refreshCustomSelectById('newtaskOtherExecutorSelect');
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
                refreshCustomSelectById('newtaskOtherExecutorSelect');
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

            const fileInput = document.getElementById('newtaskFileInput');
            if (fileInput && fileInput.files && fileInput.files.length > 0) {
                Array.from(fileInput.files).forEach(f => allFiles.push(f));
            }

            if (window.modalSelectedFiles && window.modalSelectedFiles.length > 0) {
                window.modalSelectedFiles.forEach(f => {
                    const isDuplicate = allFiles.some(af => af.name === f.name && af.size === f.size);
                    if (!isDuplicate) allFiles.push(f);
                });
            }

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

            // ========== 3. BÜTÜN FAYLLARI YÜKLƏ ==========
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
                if (companySelect && companySelect.value) {
                    targetCompanyId = parseInt(companySelect.value);
                    const opt = companySelect.options[companySelect.selectedIndex];
                    selectedCompanyName = opt.text
                        .replace('🏢', '')
                        .replace('(Mənim şirkətim)', '')
                        .trim();
                }
            } else if (currentTaskType === 'parent') {
                const parentSelect = document.getElementById('newtaskParentSelect');
                if (parentSelect && parentSelect.value) {
                    targetCompanyId = parseInt(parentSelect.value);
                    const opt = parentSelect.options[parentSelect.selectedIndex];
                    selectedCompanyName = opt.getAttribute('data-company-name')
                        || opt.text.replace(/⬆️/g, '').trim();
                }
            } else if (currentTaskType === 'partner') {
                const partnerSelect = document.getElementById('newtaskPartnerSelect');
                if (partnerSelect && partnerSelect.value) {
                    targetCompanyId = parseInt(partnerSelect.value);
                    const opt = partnerSelect.options[partnerSelect.selectedIndex];
                    selectedCompanyName = opt.text.replace(/🤝/g, '').trim();
                }
            }

            console.log('🎯 targetCompanyId:', targetCompanyId);
            console.log('🎯 selectedCompanyName:', selectedCompanyName);

            // ========== 5. METADATA HAZIRLA ==========
            const metadata = {
                display_company_name: selectedCompanyName,
                target_company_name: selectedCompanyName,
                original_company_name: selectedCompanyName,
                company_name: selectedCompanyName,
                company_id: targetCompanyId,
                viewable_company_id: targetCompanyId,
                target_company_id: targetCompanyId,
                created_by_company: window.taskManager?.userData?.companyName || window.taskManager?.userData?.companyCode,
                created_by_company_id: window.taskManager?.userData?.companyId,
                created_by_user_id: window.taskManager?.userData?.userId,
                created_by_name: window.taskManager?.userData?.fullName || window.taskManager?.userData?.name,
                created_at: new Date().toISOString(),
                task_type: currentTaskType,
                due_date: dueDate
            };

            const baseData = {
                task_title: selectedCompanyName,
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

            // ========== 6. ENDPOINT VE API DATA ==========
            let endpoint = '';
            let apiData = {};

            if (currentTaskType === 'internal') {
                endpoint = '/tasks/';
                apiData = {
                    ...baseData,
                    company_id: targetCompanyId,
                    company_name: selectedCompanyName,
                    viewable_company_id: targetCompanyId,
                    target_company_id: targetCompanyId,
                    target_company_name: selectedCompanyName,
                    is_company_viewable: true
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
                    viewable_company_id: targetCompanyId,
                    target_company_id: targetCompanyId,
                    target_company_name: selectedCompanyName,
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

            // ========== 7. TASK YARAT ==========
            showNotification('Tapşırıq yaradılır...', 'info');

            const response = await makeApiRequest(endpoint, 'POST', apiData);
            console.log('📥 API cavabı:', response);

            const taskId = response?.task?.id || response?.id || response?.data?.id;

            if (!taskId) {
                throw new Error(response?.detail || response?.message || 'Task ID alınmadı');
            }

            console.log(`✅ Task yaradıldı (ID: ${taskId}) ${uploadedUuids.length} fayl ilə`);

            // ========== 8. UĞUR BİLDİRİŞİ ==========
            showNotification(`✅ Tapşırıq uğurla yaradıldı! ${uploadedUuids.length} fayl əlavə edildi.`, 'success');

            // ========== 9. SİYAHILARI YENİLƏ ==========
            if (window.taskManager) {
                if (typeof window.taskManager.refreshAllTaskLists === 'function') {
                    setTimeout(() => window.taskManager.refreshAllTaskLists(), 1000);
                } else if (typeof window.taskManager.loadActiveTasks === 'function') {
                    setTimeout(() => window.taskManager.loadActiveTasks(1, true), 1000);
                }

                if (window.TaskCache && window.TaskCache.clear) {
                    window.TaskCache.clear();
                }

                if (window.ExternalTableManager && window.ExternalTableManager.loadTasks) {
                    setTimeout(() => window.ExternalTableManager.loadTasks(true), 1200);
                }

                if (window.PartnerTableManager && window.PartnerTableManager.loadTasks) {
                    setTimeout(() => window.PartnerTableManager.loadTasks(1, true), 1200);
                }
            }

            // ========== 10. MODALI BAĞLA VƏ TƏMİZLƏ ==========
            closeModal();

            window.modalSelectedFiles = [];
            const fileListEl = document.getElementById('newtaskFileList');
            if (fileListEl) fileListEl.innerHTML = '<div class="newtask-file-list-empty">Heç bir fayl seçilməyib</div>';

            // Audio field-ları təmizlə
            const audioDataField = document.getElementById('newtaskAudioData');
            const audioFilenameField = document.getElementById('newtaskAudioFilename');
            const audioPlayer = document.getElementById('newtaskRecordedAudio');

            if (audioDataField) audioDataField.value = '';
            if (audioFilenameField) audioFilenameField.value = '';
            if (audioPlayer) audioPlayer.src = '';

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
