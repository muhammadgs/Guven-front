
/**
 * Token alma funksiyası
 */
function getAuthToken() {
    // 1. Cookie-dən yoxla
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'access_token' || name === 'guven_token') {
            console.log('🔑 Token cookie-dən tapıldı');
            return value;
        }
    }

    // 2. localStorage-dan yoxla
    const token = localStorage.getItem('access_token') || localStorage.getItem('guven_token');
    if (token) {
        console.log('🔑 Token localStorage-dan tapıldı');
        return token;
    }

    // 3. sessionStorage-dan yoxla
    const sessionToken = sessionStorage.getItem('access_token') || sessionStorage.getItem('guven_token');
    if (sessionToken) {
        console.log('🔑 Token sessionStorage-dan tapıldı');
        return sessionToken;
    }

    console.log('🔑 Token tapılmadı');
    return null;
}

// ==================== TASK YARATMA FUNKSİYALARI ====================


async function createRegularTaskOnly(form) {
    console.log('🔧 createRegularTaskOnly çağırıldı');

    // Elementləri əldə et
    const companySelect = document.getElementById('companySelect');
    const dueDateInput = document.getElementById('dueAtInput');
    const executorSelect = document.getElementById('executorSelect');
    const selectedCompanyExecutor = document.getElementById('selectedCompanyExecutor');
    const departmentSelect = document.getElementById('departmentSelect');
    const taskTypeSelect = document.getElementById('taskTypeSelect');
    const descriptionInput = document.getElementById('descriptionInput');
    const taskTitleInput = document.getElementById('taskTitle');
    const hourlyRateInput = document.getElementById('hourlyRateInput');
    const durationInput = document.getElementById('durationInput');

    // ===== YOXLAMA: Bütün elementlər varmı? =====
    if (!dueDateInput) {
        throw new Error('❌ dueDateInput elementi tapılmadı');
    }

    // Son müddət yoxlaması
    if (!dueDateInput.value) {
        throw new Error('❌ Son müddət seçilməyib');
    }

    // İcra edən şəxsin müəyyən edilməsi
    let assignedTo = null;
    let executorSource = '';

    if (selectedCompanyExecutor && selectedCompanyExecutor.value) {
        assignedTo = parseInt(selectedCompanyExecutor.value);
        executorSource = 'selectedCompanyExecutor';
        console.log('📌 Partnyor işçisi seçilib:', assignedTo);
    }
    else if (executorSelect && executorSelect.value) {
        assignedTo = parseInt(executorSelect.value);
        executorSource = 'executorSelect';
        console.log('📌 Adi işçi seçilib:', assignedTo);
    }
    else {
        throw new Error('❌ İcra edən şəxs seçilməyib');
    }

    // Task başlığı - ƏGƏR BOŞDURSA DEFAULT DƏYƏR VER
    let taskTitle = "Yeni Task";
    if (taskTitleInput && taskTitleInput.value.trim()) {
        taskTitle = taskTitleInput.value.trim();
    }

    // Task təsviri
    let taskDescription = '';
    if (descriptionInput) {
        taskDescription = descriptionInput.value || '';
    }

    // Şirkət məlumatları
    let selectedCompanyId = window.taskManager.userData.companyId;
    let selectedCompanyName = window.taskManager.userData.companyName;
    let isMyCompany = true;

    if (companySelect && companySelect.value) {
        selectedCompanyId = companySelect.value;
        const selectedOption = companySelect.options[companySelect.selectedIndex];
        if (selectedOption) {
            selectedCompanyName = selectedOption.text.replace('(Mənim şirkətim)', '').trim();
            isMyCompany = selectedOption.dataset.isMyCompany === 'true';
        }
    }

    // Son müddət və status
    const dueDateValue = dueDateInput.value;
    const dueDate = new Date(dueDateValue);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);

    let taskStatus = 'pending';
    let startedDate = null;

    if (dueDate.getTime() < today.getTime()) {
        taskStatus = 'overdue';
        startedDate = new Date().toISOString().split('T')[0];
    }

    window.taskManager.showLoading();

    // ===== İSTİFADƏÇİ ADINI TƏYİN ET =====
    const creatorName = window.taskManager.userData.fullName ||
                       window.taskManager.userData.name ||
                       window.taskManager.userData.ceo_name ||
                       'Sistem İstifadəçisi';

    // Metadata hazırlanması
    const metadata = {
        display_company_name: selectedCompanyName,
        target_company_name: selectedCompanyName,
        original_company_name: selectedCompanyName,
        created_by_company: window.taskManager.userData.companyName || window.taskManager.userData.companyCode,
        created_by_company_id: window.taskManager.userData.companyId,
        target_company_id: selectedCompanyId,
        is_visible_to_company: !isMyCompany,
        viewable_company_id: isMyCompany ? null : selectedCompanyId,
        viewable_company_name: isMyCompany ? null : selectedCompanyName,
        deadline_status: taskStatus,
        deadline_date: dueDateValue,
        created_by_user_id: window.taskManager.userData.userId,
        created_by_name: creatorName,
        created_at: new Date().toISOString(),
        task_type: 'personal',
        executor_source: executorSource
    };

    // ===== FIX: Ensure all required fields are present =====
    const baseTaskData = {
        // Required fields (make sure these are never null/undefined)
        task_title: taskTitle,
        task_description: taskDescription || '', // Ensure string even if empty
        assigned_to: assignedTo,
        priority: 'medium',
        status: taskStatus,
        due_date: dueDateValue,
        progress_percentage: 0,

        // Optional fields - only include if they have values
        ...(departmentSelect && departmentSelect.value && {
            department_id: parseInt(departmentSelect.value)
        }),
        ...(taskTypeSelect && taskTypeSelect.value && {
            work_type_id: parseInt(taskTypeSelect.value)
        }),
        ...(durationInput && durationInput.value && {
            estimated_hours: (parseFloat(durationInput.value) / 60).toFixed(2)
        }),
        ...(hourlyRateInput && hourlyRateInput.value && {
            billing_rate: parseFloat(hourlyRateInput.value)
        }),

        // These should always be included
        is_billable: false,
        metadata: JSON.stringify(metadata),
        company_id: window.taskManager.userData.companyId,
        created_by: window.taskManager.userData.userId,
        creator_name: creatorName
    };

    // Add started_date only if it exists
    if (taskStatus === 'overdue' && startedDate) {
        baseTaskData.started_date = startedDate;
    }

    // Remove any undefined or null values
    Object.keys(baseTaskData).forEach(key => {
        if (baseTaskData[key] === undefined || baseTaskData[key] === null) {
            delete baseTaskData[key];
        }
    });

    console.log('📦 YALNIZ ADI TASK DATA:', JSON.stringify(baseTaskData, null, 2));

    try {
        // API sorğusu
        const response = await window.taskManager.apiRequest('/tasks/', 'POST', baseTaskData);

        console.log('📥 API cavabı:', response);

        // Uğur yoxlaması
        const taskId = await handleTaskResponse(response, false, {
            selectedCompanyName
        });


        // ===== UĞUR BİLDİRİŞİ =====
        if (taskId) {
            // ✅ YENİ: Uğur bildirişi göstər
            if (typeof showNotification === 'function') {
                showNotification(
                    `✅ Task uğurla yaradıldı!\n📌 Başlıq: ${taskTitle}\n📅 Son tarix: ${dueDateValue}`,
                    'success'
                );
            } else {
                console.log('ℹ️ showNotification funksiyası tapılmadı, fallback istifadə olunur');

                // Fallback bildiriş
                const toast = document.createElement('div');
                toast.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: #4CAF50;
                    color: white;
                    padding: 15px 20px;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    z-index: 10000;
                    animation: slideIn 0.3s ease;
                `;
                toast.innerHTML = `
                    <strong>✅ Uğurlu!</strong><br>
                    Task uğurla yaradıldı<br>
                    <small>ID: ${taskId}</small>
                `;
                document.body.appendChild(toast);

                setTimeout(() => {
                    toast.style.animation = 'slideOut 0.3s ease';
                    setTimeout(() => toast.remove(), 300);
                }, 3000);
            }
        }

        // ===== TELEGRAM BİLDİRİŞİ =====
        if (taskId && window.TelegramHelper?.notifyTaskCreated) {
            console.log('📱 Telegram bildirişi göndərilir, assigned_to:', assignedTo);

            setTimeout(async () => {
                try {
                    const notificationData = {
                        task_id: taskId,
                        assigned_to: assignedTo,
                        task_title: taskTitle,
                        task_description: taskDescription,
                        priority: 'medium',
                        due_date: dueDateValue,
                        creator_name: creatorName
                    };

                    console.log('📦 Telegram notification data:', notificationData);
                    const result = await window.TelegramHelper.notifyTaskCreated(notificationData, { silent: true });
                    console.log('📬 Telegram notification result:', result);
                } catch (error) {
                    console.error('❌ Telegram bildiriş xətası:', error);
                }
            }, 1500);
        }

        // Fayl yükləmə
        if (taskId && window.FileUploadManager?.files?.length > 0) {
            await uploadFilesAndUpdateTask(taskId, 'active', window.FileUploadManager.files);
        }

        // Audio yükləmə
        if (taskId && window.audioRecorder?.hasAudioData) {
            try {
                const audioData = await window.audioRecorder.getAudioData();
                if (audioData?.base64) {
                    await uploadAudioAndUpdateTask(
                        taskId,
                        audioData.base64,
                        audioData.filename,
                        'Səs qeydi',
                        'active'
                    );
                }
            } catch (audioError) {
                console.error('❌ Audio yükləmə xətası:', audioError);
            }
        }

        await refreshAfterTaskCreation('regular');

        return taskId;
    } catch (error) {
        console.error('❌ API xətası:', error);
        window.taskManager.showError(error.message || 'Task yaradılarkən xəta baş verdi');
        throw error;
    }
}

async function createPartnerTaskOnly(form, selectedPartnerId, selectedPartnerName) {
    console.log('🔧 createPartnerTaskOnly çağırıldı');
    console.log('🤝 Seçilmiş partnyor (əlaqə ID):', {
        relationId: selectedPartnerId,  // 17
        name: selectedPartnerName       // "✅ Lukoil"
    });

    // Elementləri əldə et
    const dueDateInput = document.getElementById('dueAtInput');
    const selectedCompanyExecutor = document.getElementById('selectedCompanyExecutor');
    const executorSelect = document.getElementById('executorSelect');
    const departmentSelect = document.getElementById('departmentSelect');
    const taskTypeSelect = document.getElementById('taskTypeSelect');
    const descriptionInput = document.getElementById('descriptionInput');
    const taskTitleInput = document.getElementById('taskTitle');
    const hourlyRateInput = document.getElementById('hourlyRateInput');
    const durationInput = document.getElementById('durationInput');

    // ===== VACİB: partner_id = selectedPartnerId (partners.id) =====
    const partnerRelationId = selectedPartnerId;  // 17 (partners.id)
    const partnerDisplayName = selectedPartnerName;  // "✅ Lukoil"

    // Partnyor şirkətin məlumatlarını metadata üçün alaq
    let partnerCompanyId = null;
    let partnerCompanyCode = null;

    try {
        const partniyorSelect = document.getElementById('partniyorSelect');
        if (partniyorSelect && partniyorSelect.selectedIndex > 0) {
            const selectedOption = partniyorSelect.options[partniyorSelect.selectedIndex];

            // Dataset-dən məlumatları oxu (əgər varsa)
            if (selectedOption.dataset.companyId) {
                partnerCompanyId = parseInt(selectedOption.dataset.companyId);  // 26
                partnerCompanyCode = selectedOption.dataset.companyCode;  // 'LUK25001'
                console.log(`✅ Dataset-dən partnyor şirkət ID tapıldı: ${partnerCompanyId}`);
            }
        }

    } catch (error) {
        console.warn('⚠️ Partnyor məlumatları alınarkən xəta:', error);
    }

    console.log('🎯 İstifadə olunacaq məlumatlar:', {
        partnerRelationId: partnerRelationId,  // 17 (partners.id)
        partnerCompanyId: partnerCompanyId,    // 26 (companies.id)
        partnerDisplayName: partnerDisplayName // "✅ Lukoil"
    });

    // Son müddət yoxlaması
    if (!dueDateInput || !dueDateInput.value) {
        throw new Error('❌ Son müddət seçilməyib');
    }

    // İcra edən şəxsin müəyyən edilməsi
    let assignedTo = null;
    let executorSource = '';

    if (selectedCompanyExecutor && selectedCompanyExecutor.value) {
        assignedTo = parseInt(selectedCompanyExecutor.value);
        executorSource = 'selectedCompanyExecutor';
        console.log('📌 Partnyor işçisi seçilib:', assignedTo);
    }
    else if (executorSelect && executorSelect.value) {
        assignedTo = parseInt(executorSelect.value);
        executorSource = 'executorSelect';
        console.log('📌 Adi işçi seçilib:', assignedTo);
    }
    else {
        throw new Error('❌ İcra edən şəxs seçilməyib');
    }

    // Task başlığı
    let taskTitle = "Yeni Task";
    if (taskTitleInput && taskTitleInput.value.trim()) {
        taskTitle = taskTitleInput.value.trim();
    }

    // Şirkət məlumatları (həmişə öz şirkətimiz)
    const myCompanyId = window.taskManager.userData.companyId;  // 55 (Socarrr)
    const myCompanyName = window.taskManager.userData.companyName;

    // Son müddət və status
    const dueDateValue = dueDateInput.value;
    const dueDate = new Date(dueDateValue);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);

    let taskStatus = 'pending';
    let startedDate = null;

    if (dueDate.getTime() < today.getTime()) {
        taskStatus = 'overdue';
        startedDate = new Date().toISOString().split('T')[0];
    }

    window.taskManager.showLoading();

    // Metadata hazırlanması
    const metadata = {
        my_company_id: myCompanyId,                    // 55
        my_company_name: myCompanyName,                // "Guven Finans"
        partner_relation_id: partnerRelationId,        // 17 (partners.id)
        partner_company_id: partnerCompanyId,          // 26 (companies.id)
        partner_company_name: partnerDisplayName,
        partner_company_code: partnerCompanyCode,
        created_by_company: myCompanyName,
        created_by_company_id: myCompanyId,
        created_by_user_id: window.taskManager.userData.userId,
        created_by_name: window.taskManager.userData.fullName || window.taskManager.userData.name,
        created_at: new Date().toISOString(),
        task_type: 'partner',
        executor_source: executorSource,
        deadline_status: taskStatus,
        deadline_date: dueDateValue
    };

    const taskCode = `PT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Employee ID tap
    let currentUserEmployeeId = null;
    if (window.taskManager?.userData?.employee_id) {
        currentUserEmployeeId = window.taskManager.userData.employee_id;
    } else {
        try {
            const userResponse = await window.taskManager.apiRequest(
                `/users/${window.taskManager.userData.userId}`,
                'GET'
            );
            if (userResponse?.data?.employee_id) {
                currentUserEmployeeId = userResponse.data.employee_id;
            }
        } catch (error) {
            console.error('❌ Employee ID tapılarkən xəta:', error);
        }
    }

    // forwarded_by üçün dəyər
    let forwardedByValue = currentUserEmployeeId || assignedTo;


    const partnerTaskData = {
        // Mütləq tələb olunanlar
        task_code: taskCode,
        task_title: taskTitle,
        partner_id: partnerRelationId,
        product_serial: `SN-${Date.now()}`,

        // Mənim şirkətimin adı
        company_name: myCompanyName,
        company_id: myCompanyId,

        // Partnyor şirkətin adı (göstərmək üçün)
        partner_company_name: partnerDisplayName,

        // Opsional fieldlar
        task_description: descriptionInput ? descriptionInput.value : '',
        assigned_to: assignedTo,
        department_id: departmentSelect && departmentSelect.value ? parseInt(departmentSelect.value) : null,
        priority: 'medium',
        status: taskStatus,
        due_date: dueDateValue,
        estimated_hours: durationInput && durationInput.value ? (parseFloat(durationInput.value) / 60).toFixed(2) : 0,
        work_type_id: taskTypeSelect && taskTypeSelect.value ? parseInt(taskTypeSelect.value) : null,
        progress_percentage: 0,
        is_billable: false,
        billing_rate: hourlyRateInput && hourlyRateInput.value ? parseFloat(hourlyRateInput.value) : 0,
        metadata: JSON.stringify(metadata),                 // Metadata-da hər şey var
        created_by: window.taskManager.userData.userId,
        creator_name: window.taskManager.userData.fullName || window.taskManager.userData.name,

        // Partner üçün əlavə fieldlar
        forwarded_by: forwardedByValue,

        // Məhsul məlumatları
        product_model: "Default Model",
        product_category: "General",
        product_condition: "new",
        delivery_date: new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0],
        estimated_completion_days: 5,
        partner_notes: "",
        partner_priority: "medium",
        service_type: "other",
        warranty_status: "active",
        estimated_cost: 0,
        actual_cost: 0,
        is_cost_approved: false,
        contract_number: `CT-${Date.now()}`,
        purchase_order_number: `PO-${Date.now()}`,
        invoice_number: "",
        payment_status: "pending"
    };

    if (taskStatus === 'overdue' && startedDate) {
        partnerTaskData.started_date = startedDate;
    }

    // NULL fieldları təmizlə
    Object.keys(partnerTaskData).forEach(key => {
        if (partnerTaskData[key] === null || partnerTaskData[key] === undefined) {
            delete partnerTaskData[key];
        }
    });

    // Yoxlama: product_serial mütləq var
    if (!partnerTaskData.product_serial) {
        partnerTaskData.product_serial = `SN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }

    console.log('📦 YALNIZ PARTNER TASK DATA:', JSON.stringify(partnerTaskData, null, 2));
    console.log('🎯 PARTNER ID (partners.id):', partnerRelationId);  // 17
    console.log('🎯 COMPANY ID (companies.id):', myCompanyId);       // 55
    console.log('🎯 PARTNER COMPANY ID (metadata):', partnerCompanyId); // 26

    // 🔴 YALNIZ BİR DƏFƏ - PARTNER-TASKS ENDPOINT-İNƏ POST
    const response = await window.taskManager.apiRequest('/partner-tasks/', 'POST', partnerTaskData);

    // Uğur yoxlaması
    const taskId = await handleTaskResponse(response, true, {
        myCompanyName,
        selectedPartnerName: partnerDisplayName,
        partnerRelationId,
        partnerCompanyId
    });



    // ✅ YENİ: TELEGRAM BİLDİRİŞİ GÖNDƏR - TASK KİMƏ YARANIBSA ONA
    if (taskId) {
        console.log('📱 Telegram bildirişi göndərilir (partner), assigned_to:', assignedTo);

        setTimeout(async () => {
            const notificationData = {
                task_id: taskId,
                assigned_to: assignedTo,  // <-- VACİB: assigned_to user ID-si
                task_title: taskTitle,
                task_description: descriptionInput ? descriptionInput.value : '',
                priority: 'medium',
                due_date: dueDateValue,
                creator_name: window.taskManager.userData.fullName || window.taskManager.userData.name
            };

            console.log('📦 Partner Telegram notification data:', notificationData);

            const result = await window.TelegramHelper.notifyTaskCreated(notificationData, { silent: true });
            console.log('📬 Partner Telegram notification result:', result);
        }, 1000); // 1 saniyə gecikmə (taskın database-də tam yaranması üçün)
    }

    // ✅ YENİ: Faylları yüklə və UUID-ləri tasks cədvəlinə əlavə et
    if (taskId && window.FileUploadManager?.files?.length > 0) {
        await uploadFilesAndUpdateTask(taskId, 'partner', window.FileUploadManager.files);
    }

    // Audio yükləmə
    if (taskId && window.audioRecorder?.hasAudioData) {
        try {
            const audioData = await window.audioRecorder.getAudioData();
            if (audioData?.base64) {
                await uploadAudioAndUpdateTask(
                    taskId,
                    audioData.base64,
                    audioData.filename,
                    'Səs qeydi',
                    'partner'
                );
            }
        } catch (audioError) {
            console.error('❌ Audio yükləmə xətası:', audioError);
        }
    }
    // ===== 🆕 CACHE TƏMİZLƏ =====
    await refreshAfterTaskCreation('partner');
    return taskId;
}

/**
 * Audio qeydini yüklə (base64 formatından)
 */
async function uploadAudioAndUpdateTask(taskId, audioBase64, filename, description, taskType) {
    if (!audioBase64 || !filename) {
        console.log('ℹ️ Audio məlumatı yoxdur');
        return null;
    }

    try {
        console.log(`🎤 Audio yüklənir: ${filename}`);

        // Base64-dən Blob yarat
        let base64Data = audioBase64;
        if (audioBase64.includes(',')) {
            base64Data = audioBase64.split(',')[1];
        }

        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const audioBlob = new Blob([byteArray], { type: 'audio/webm' });
        const audioFile = new File([audioBlob], filename, { type: 'audio/webm' });

        // FormData hazırla
        const formData = new FormData();
        formData.append('file', audioFile);
        formData.append('category', 'audio_recording');
        formData.append('is_audio_recording', 'true');

        // Simple-upload ilə yüklə
        const response = await makeApiRequest('/files/simple-upload', 'POST', formData, true);

        console.log('📥 Audio yükləmə cavabı:', response);

        let fileUuid = null;
        if (response?.data?.uuid) fileUuid = response.data.uuid;
        else if (response?.uuid) fileUuid = response.uuid;
        else if (response?.file_id) fileUuid = response.file_id;

        if (fileUuid) {
            console.log(`✅ Audio yükləndi: ${filename} -> ${fileUuid}`);
            await addUuidsToTask(taskId, [fileUuid]);
            return fileUuid;
        } else {
            console.warn('⚠️ Audio yükləndi amma UUID alınmadı');
            return null;
        }

    } catch (error) {
        console.error('❌ Audio yükləmə xətası:', error);
        return null;
    }
}

/**
 * Faylları yüklə və UUID-ləri task-a əlavə et
 */
async function uploadFilesAndUpdateTask(taskId, taskType, files) {
    if (!files || files.length === 0) {
        console.log('ℹ️ Yüklənəcək fayl yoxdur');
        return;
    }

    console.log(`📎 ${files.length} fayl yüklənir task ${taskId}-ə...`);

    const uploadedUuids = [];

    for (const file of files) {
        try {
            const formData = new FormData();
            formData.append('file', file);

            // Audio faylını yoxla
            const isAudio = file.type.startsWith('audio/') ||
                           file.name.toLowerCase().includes('recording') ||
                           file.name.toLowerCase().includes('səs');

            if (isAudio) {
                formData.append('category', 'audio_recording');
                formData.append('is_audio_recording', 'true');
                console.log(`🎤 Audio fayl yüklənir: ${file.name}`);
            } else {
                formData.append('category', 'company_file');
            }

            // Simple-upload endpoint-inə yüklə
            const response = await makeApiRequest('/files/simple-upload', 'POST', formData, true);

            console.log(`📥 ${file.name} yükləmə cavabı:`, response);

            let fileUuid = null;
            if (response?.data?.uuid) fileUuid = response.data.uuid;
            else if (response?.uuid) fileUuid = response.uuid;
            else if (response?.file_id) fileUuid = response.file_id;
            else if (response?.id) fileUuid = response.id;

            if (fileUuid) {
                uploadedUuids.push(fileUuid);
                console.log(`✅ Fayl yükləndi: ${file.name} -> ${fileUuid}`);
            } else {
                console.warn(`⚠️ Fayl yükləndi amma UUID alınmadı:`, response);
            }
        } catch (error) {
            console.error(`❌ ${file.name} yüklənərkən xəta:`, error);
        }
    }

    // UUID-ləri task-a əlavə et
    if (uploadedUuids.length > 0) {
        await addUuidsToTask(taskId, uploadedUuids);
    }

    return uploadedUuids;
}

/**
 * Simple-upload endpoint-i ilə fayl yüklə
 */
async function uploadFilesViaSimpleUpload(taskId, files, category) {
    const uploadedUuids = [];

    for (const file of files) {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('category', category);

            console.log(`📤 Simple-upload ilə fayl göndərilir: ${file.name}`);

            const response = await window.taskManager.apiRequest('/files/simple-upload', 'POST', formData, {
                'Content-Type': 'multipart/form-data'
            });

            const fileData = response.data || response;

            if (fileData && fileData.file_id) {
                uploadedUuids.push(fileData.file_id);
                console.log(`✅ Simple-upload ilə fayl yükləndi: ${file.name} -> UUID: ${fileData.file_id}`);
            } else if (fileData && fileData.uuid) {
                uploadedUuids.push(fileData.uuid);
                console.log(`✅ Simple-upload ilə fayl yükləndi: ${file.name} -> UUID: ${fileData.uuid}`);
            }
        } catch (error) {
            console.error(`❌ Simple-upload xətası: ${file.name}`, error);
        }
    }

    return uploadedUuids;
}

/**
 * UUID-ləri task-a əlavə et (file_uuids sahəsini yenilə)
 */
async function addUuidsToTask(taskId, uuids) {
    if (!uuids || uuids.length === 0) {
        console.log('ℹ️ Əlavə ediləcək UUID yoxdur');
        return false;
    }

    try {
        console.log(`📝 Task ${taskId}-ə ${uuids.length} UUID əlavə edilir:`, uuids);

        // Əvvəlki file_uuids-i al
        const taskResponse = await makeApiRequest(`/tasks/${taskId}`, 'GET', null, true);
        let existingUuids = [];

        if (!taskResponse.error && taskResponse.data) {
            const task = taskResponse.data;
            if (task.file_uuids) {
                if (typeof task.file_uuids === 'string') {
                    // PostgreSQL array formatını parse et: {uuid1,uuid2}
                    let cleanStr = task.file_uuids
                        .replace(/^\{/, '')
                        .replace(/\}$/, '')
                        .trim();
                    if (cleanStr) {
                        existingUuids = cleanStr.split(',').map(u =>
                            u.trim().replace(/^"(.*)"$/, '$1')
                        ).filter(u => u.length === 36 && u.includes('-'));
                    }
                } else if (Array.isArray(task.file_uuids)) {
                    existingUuids = task.file_uuids;
                }
            }
        }

        // Yeni UUID-ləri əlavə et (təkrar yoxlanışı)
        const allUuids = [...existingUuids];
        for (const uuid of uuids) {
            if (!allUuids.includes(uuid)) {
                allUuids.push(uuid);
            }
        }

        // PostgreSQL array formatına çevir
        const fileUuidsString = '{' + allUuids.join(',') + '}';

        // Task-ı yenilə
        const updateResponse = await makeApiRequest(`/tasks/${taskId}`, 'PATCH', {
            file_uuids: fileUuidsString
        }, true);

        if (updateResponse.error) {
            console.error('❌ Task yenilənə bilmədi:', updateResponse.error);
            return false;
        }

        console.log(`✅ Task ${taskId}-ə ${uuids.length} fayl əlavə edildi. Ümumi: ${allUuids.length}`);
        return true;

    } catch (error) {
        console.error('❌ UUID əlavə etmə xətası:', error);
        return false;
    }
}

/**
 * Task yaradıldıqdan sonra cache-i təmizlə və yenilə
 * @param {string} taskType - 'regular', 'partner', 'parent' (external)
 */
async function clearCacheAfterTaskCreation(taskType = 'regular') {
    console.log(`🗑️ Task yaradıldı (${taskType}), cache təmizlənir...`);

    try {
        // 1. IndexedDB cache-lərini təmizlə
        if (window.dbManager) {
            // Task cache-lərini təmizlə
            await window.dbManager.clearCache('tasks');
            await window.dbManager.clearCache('externalTasks');
            await window.dbManager.clearCache('partnerTasks');

            // Partnyor cache-lərini də təmizlə (çünki partnyor taskı yarandı)
            if (taskType === 'partner') {
                await window.dbManager.clearCache('partners');
            }

            console.log('✅ IndexedDB cache təmizləndi');
        } else {
            console.warn('⚠️ dbManager mövcud deyil');
        }

        // 2. localStorage-dan task cache-lərini təmizlə
        localStorage.removeItem('taskData');
        localStorage.removeItem('taskDataTimestamp');
        localStorage.removeItem('tasks_cache');
        localStorage.removeItem('tasks_cache_timestamp');
        localStorage.removeItem('externalTasks_cache');
        localStorage.removeItem('externalTasks_cache_timestamp');

        // 3. SessionStorage-dan təmizlə
        sessionStorage.removeItem('taskData');
        sessionStorage.removeItem('tasks_cache');

        console.log('✅ localStorage/sessionStorage cache təmizləndi');

        // 4. Cədvəlləri yenilə (cache olmadan təzə məlumatları yüklə)
        console.log('🔄 Cədvəllər yenilənir...');

        // Daxili task cədvəlini yenilə
        if (window.taskManager && typeof window.taskManager.loadActiveTasks === 'function') {
            await window.taskManager.loadActiveTasks(1, false);
            console.log('✅ Daxili task cədvəli yeniləndi');
        }

        // External task cədvəlini yenilə
        if (window.ExternalTableManager && typeof window.ExternalTableManager.loadTasks === 'function') {
            await window.ExternalTableManager.loadTasks();
            console.log('✅ External task cədvəli yeniləndi');
        }

        // Partnyor task cədvəlini yenilə
        if (window.PartnerTableManager && typeof window.PartnerTableManager.loadTasks === 'function') {
            await window.PartnerTableManager.loadTasks();
            console.log('✅ Partnyor task cədvəli yeniləndi');
        }

        // Arxiv cədvəlini yenilə
        if (window.ArchiveTableManager && typeof window.ArchiveTableManager.loadArchiveTasks === 'function') {
            await window.ArchiveTableManager.loadArchiveTasks(1);
            console.log('✅ Arxiv cədvəli yeniləndi');
        }

        // Count göstəricilərini yenilə
        if (window.TableManager && typeof window.TableManager.updateAllCounts === 'function') {
            await window.TableManager.updateAllCounts();
        }

        console.log('🎉 Bütün cədvəllər yeniləndi, cache təmizləndi!');

    } catch (error) {
        console.error('❌ Cache təmizləmə xətası:', error);
    }
}

// createTask.js
async function refreshAfterTaskCreation(taskType = 'regular') {
    console.log(`🔄 Task yaradıldı (${taskType}), məlumatlar yenilənir...`);

    await new Promise(resolve => setTimeout(resolve, 500));

    // ✅ Yalnız cari user-in cache-i təmizlənir
    if (window.dbManager) {
        await window.dbManager.clearCache('tasks');
        await window.dbManager.clearCache('externalTasks');
        await window.dbManager.clearCache('partnerTasks');
        console.log('✅ Cari user-in IndexedDB cache-i təmizləndi');
    }

    // ✅ TaskCache-i təmizlə (avtomatik cari user-in cache-lərini təmizləyəcək)
    if (window.TaskCache && window.TaskCache.clear) {
        window.TaskCache.clear();
        console.log('✅ Cari user-in TaskCache-i təmizləndi');
    }

    // Cədvəlləri yenilə (force refresh ilə)
    if (window.taskManager && typeof window.taskManager.loadActiveTasks === 'function') {
        await window.taskManager.loadActiveTasks(1, true);
        console.log('✅ Daxili task cədvəli yeniləndi');
    }

    if (window.ExternalTableManager && typeof window.ExternalTableManager.loadTasks === 'function') {
        await window.ExternalTableManager.loadTasks(true);
        console.log('✅ External task cədvəli yeniləndi');
    }

    if (window.PartnerTableManager && typeof window.PartnerTableManager.loadTasks === 'function') {
        await window.PartnerTableManager.loadTasks(1, true);
        console.log('✅ Partnyor task cədvəli yeniləndi');
    }
}

async function createParentCompanyTask(form, parentCompanyData) {
    console.log('🔧 createParentCompanyTask çağırıldı');
    console.log('🏢 Üst şirkət məlumatları:', parentCompanyData);

    // Elementləri əldə et
    const dueDateInput = document.getElementById('dueAtInput');
    const executorSelect = document.getElementById('executorSelect');
    const selectedCompanyExecutor = document.getElementById('selectedCompanyExecutor');
    const departmentSelect = document.getElementById('departmentSelect');
    const taskTypeSelect = document.getElementById('taskTypeSelect');
    const descriptionInput = document.getElementById('descriptionInput');
    const taskTitleInput = document.getElementById('taskTitle');
    const hourlyRateInput = document.getElementById('hourlyRateInput');
    const durationInput = document.getElementById('durationInput');

    // Yoxlama
    if (!dueDateInput || !dueDateInput.value) {
        throw new Error('❌ Son müddət seçilməyib');
    }

    // İcra edən şəxs
    let assignedTo = null;
    if (selectedCompanyExecutor && selectedCompanyExecutor.value) {
        assignedTo = parseInt(selectedCompanyExecutor.value);
    } else if (executorSelect && executorSelect.value) {
        assignedTo = parseInt(executorSelect.value);
    } else {
        throw new Error('❌ İcra edən şəxs seçilməyib');
    }

    // Task başlığı
    let taskTitle = "Yeni Task";
    if (taskTitleInput && taskTitleInput.value.trim()) {
        taskTitle = taskTitleInput.value.trim();
    }

    // Task təsviri
    let taskDescription = descriptionInput ? descriptionInput.value || '' : '';

    // Yaradan adı
    const creatorName = window.taskManager.userData.fullName ||
                       window.taskManager.userData.name ||
                       window.taskManager.userData.ceo_name ||
                       'Sistem';

    // Son müddət
    const dueDateValue = dueDateInput.value;
    const dueDate = new Date(dueDateValue);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);

    let taskStatus = 'pending';
    if (dueDate.getTime() < today.getTime()) {
        taskStatus = 'overdue';
    }

    window.taskManager.showLoading();

    // ===== EXTERNAL TASK DATA - METADATA YOXDUR! =====
    const externalTaskData = {
        // Əsas məlumatlar
        company_id: window.taskManager.userData.companyId,
        task_title: taskTitle,
        task_description: taskDescription,
        assigned_to: assignedTo,
        department_id: departmentSelect?.value ? parseInt(departmentSelect.value) : null,
        priority: 'medium',
        status: taskStatus,
        due_date: dueDateValue,
        estimated_hours: durationInput?.value ? (parseFloat(durationInput.value) / 60).toFixed(2) : null,
        work_type_id: taskTypeSelect?.value ? parseInt(taskTypeSelect.value) : null,
        progress_percentage: 0,
        is_billable: false,
        billing_rate: hourlyRateInput?.value ? parseFloat(hourlyRateInput.value) : null,

        // Target şirkət
        target_company_id: parentCompanyData.companyId,
        target_company_name: parentCompanyData.companyName,

        // Viewable
        viewable_company_id: parentCompanyData.companyId,

        // Yaradan
        created_by: window.taskManager.userData.userId,
        creator_name: creatorName,

        // Subsidiary flag (modeldə var)
        is_for_subsidiary: false
    };

    // NULL fieldları təmizlə
    Object.keys(externalTaskData).forEach(key => {
        if (externalTaskData[key] === null || externalTaskData[key] === undefined) {
            delete externalTaskData[key];
        }
    });

    console.log('📦 EXTERNAL TASK DATA:', JSON.stringify(externalTaskData, null, 2));

    try {
        const response = await window.taskManager.apiRequest('/tasks-external/', 'POST', externalTaskData);
        console.log('📥 EXTERNAL API CAVABI:', response);

        const taskId = response?.id || response?.data?.id;

        if (!taskId) {
            throw new Error('Xarici task ID alınmadı');
        }

        console.log('🎉 XARİCİ TASK UĞURLA YARADILDI! ID:', taskId);

        // Uğur mesajı
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'Uğurlu!',
                html: `<p><strong>🏢 Üst şirkətə xarici task göndərildi!</strong></p>
                       <p>📌 Şirkət: ${parentCompanyData.companyName}</p>`,
                icon: 'success',
                timer: 3000
            });
        }

        // ===== UĞUR BİLDİRİŞİ =====
        if (taskId && typeof showNotification === 'function') {
            showNotification(
                `🏢 Üst şirkətə task göndərildi!\n📌 Şirkət: ${parentCompanyData.companyName}`,
                'success'
            );
        }

        // Telegram bildirişi
        setTimeout(async () => {
            try {
                await window.TelegramHelper.notifyTaskCreated({
                    task_id: taskId,
                    assigned_to: assignedTo,
                    task_title: taskTitle,
                    task_description: taskDescription,
                    due_date: dueDateValue,
                    creator_name: creatorName
                });
            } catch (e) {
                console.error('Telegram xətası:', e);
            }
        }, 1500);

        // Fayl yükləmə
        if (taskId && window.FileUploadManager?.files?.length > 0) {
            await uploadFilesAndUpdateTask(taskId, 'external', window.FileUploadManager.files);
        }

        // ===== 🆕 CACHE TƏMİZLƏ =====
        await refreshAfterTaskCreation('parent');

        return taskId;



    } catch (error) {
        console.error('❌ Xarici task xətası:', error);

        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'Xəta!',
                text: error.message || 'Xarici task yaradıla bilmədi',
                icon: 'error'
            });
        }
        throw error;
    }
}
/**
 * Task yaratma cavabını emal edir
 * @param {Object} response - API cavabı
 * @param {boolean} isPartner - Partnyor taskıdırmı?
 * @param {Object} context - Əlavə kontekst məlumatları
 * @returns {number} - Task ID
 */
async function handleTaskResponse(response, isPartner, context) {
    console.log('📥 handleTaskResponse çağırıldı, response:', response);

    // Xəta yoxlaması
    if (response?.error || response?.detail) {
        let errorMessage = 'Task yaradıla bilmədi';

        if (response.detail) {
            if (typeof response.detail === 'string') {
                errorMessage = response.detail;
            } else if (Array.isArray(response.detail)) {
                errorMessage = response.detail.map(err =>
                    `${err.loc?.join('.')}: ${err.msg}`
                ).join('\n');
            }
        } else if (response.message) {
            errorMessage = response.message;
        } else if (response.error) {
            errorMessage = response.error;
        }

        console.error('❌ Server xətası:', errorMessage);

        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'Xəta!',
                text: errorMessage,
                icon: 'error',
                confirmButtonText: 'Bağla'
            });
        }

        throw new Error(errorMessage);
    }

    // Task ID-ni müxtəlif formatlardan çıxart
    let taskId = null;

    if (response) {
        if (response.id) {
            taskId = response.id;
        } else if (response.data?.id) {
            taskId = response.data.id;
        } else if (response.task?.id) {
            taskId = response.task.id;
        } else if (response.task_id) {
            taskId = response.task_id;
        } else if (response.data?.task_id) {
            taskId = response.data.task_id;
        } else if (typeof response === 'number') {
            taskId = response;
        } else if (response.success === true && response.taskId) {
            taskId = response.taskId;
        }
    }


    if (taskId) {
        console.log('🎉 TASK UĞURLA YARADILDI! ID:', taskId);

        // Uğur mesajı
        if (isPartner) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: 'Uğurlu!',
                    html: `
                        <div style="text-align: left;">
                            <p><strong>🤝 Partnyor taskı uğurla yaradıldı!</strong></p>
                            <p>📌 Partnyor: ${context?.selectedPartnerName || 'Seçilmiş partnyor'}</p>
                            <p class="text-muted small">Task ID: ${taskId}</p>
                        </div>
                    `,
                    icon: 'success',
                    timer: 3000,
                    showConfirmButton: false
                });
            }
        } else {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: 'Uğurlu!',
                    text: '✅ Task uğurla yaradıldı!',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
            }
        }

        return taskId;
    } else {
        console.error('❌ Task ID tapılmadı, response:', response);
        throw new Error('Task yaradıldı amma ID alınmadı');
    }
}
async function handleTaskFormSubmit(e) {
    if (window.taskManager.isSubmitting) {
        console.log('⚠️ Form artıq submit olunur, gözləyin...');
        return;
    }

    window.taskManager.isSubmitting = true;
    e.preventDefault();
    e.stopPropagation();

    // ===== BU DƏYİŞƏNLƏRİ ƏVVƏLCƏDƏN TƏYİN EDİN =====
    let taskId = null;
    let partnerDisplayName = '';

    try {
        console.log('🚀 ===== TASK YARATMA BAŞLAYIR =====');

        const form = e.target;
        const partniyorSelect = document.getElementById('partniyorSelect');
        const parentCompanySelect = document.getElementById('parentCompanySelect');

        // ✅ PARTNYOR MƏLUMATLARI
        let hasPartner = false;
        let selectedPartnerId = null;
        let selectedPartnerName = '';

        if (partniyorSelect && partniyorSelect.value && partniyorSelect.value !== '') {
            hasPartner = true;
            selectedPartnerId = parseInt(partniyorSelect.value);
            const selectedOption = partniyorSelect.options[partniyorSelect.selectedIndex];
            if (selectedOption) {
                selectedPartnerName = selectedOption.text.replace(/📍/g, '').trim();
                partnerDisplayName = selectedPartnerName;  // <-- BURADA TƏYİN EDİN
            }
        }

        // ✅ ÜST ŞİRKƏT MƏLUMATLARI
        let hasParentCompany = false;
        let selectedParentCompanyId = null;
        let selectedParentCompanyName = '';
        let selectedParentCompanyCode = '';

        if (parentCompanySelect && parentCompanySelect.value && parentCompanySelect.value !== '') {
            hasParentCompany = true;
            selectedParentCompanyId = parseInt(parentCompanySelect.value);
            const selectedOption = parentCompanySelect.options[parentCompanySelect.selectedIndex];
            if (selectedOption) {
                selectedParentCompanyName = selectedOption.text.replace(/⬆️/g, '').trim();
                selectedParentCompanyCode = selectedOption.dataset.companyCode;
            }
        }

        // 🔴 QƏRAR VERİLİR
        let result;
        if (hasPartner) {
            console.log('🤝 PARTNYOR TASK - /partner-tasks/');
            result = await createPartnerTaskOnly(form, selectedPartnerId, selectedPartnerName);
            taskId = result;  // <-- taskId-ni alın
        }
        else if (hasParentCompany) {
            console.log('🏢 ÜST ŞİRKƏT TASK - /tasks-external/');
            result = await createParentCompanyTask(form, {
                companyId: selectedParentCompanyId,
                companyName: selectedParentCompanyName,
                companyCode: selectedParentCompanyCode
            });
            taskId = result;  // <-- taskId-ni alın
        }
        else {
            console.log('📝 ADİ TASK - /tasks/');
            result = await createRegularTaskOnly(form);
            taskId = result;  // <-- taskId-ni alın
        }

        console.log('✅ Task yaradıldı, ID:', taskId);

    } catch (error) {
        console.error('❌ TASK FORM XƏTASI:', error);
        window.taskManager.showError(error.message || 'Task yaradılarkən xəta baş verdi');
    } finally {
        window.taskManager.hideLoading();
        window.taskManager.isSubmitting = false;
        window.taskManager.resetFormAndCloseModal?.();
        if (window.FileUploadManager) {
            window.FileUploadManager.clearFiles?.();
        }
    }
}

// Global export
window.TaskCreationModule = {
    handleTaskFormSubmit,
    createPartnerTaskOnly,
    createRegularTaskOnly,
    uploadFilesAndUpdateTask,
    uploadAudioAndUpdateTask,
    uploadFilesViaSimpleUpload,
    addUuidsToTask,

};

console.log('✅ TaskCreationModule yükləndi - UUID dəstəyi aktivdir! Telegram bildirişləri aktivdir!');

// ========== FORM INITIALIZATION - BİR DƏFƏ ÇAĞRILIR ==========
(function initializeTaskForm() {
    console.log('🔧 Task form initialization başlayır...');

    // DOM-un hazır olmasını gözlə
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupFormHandler);
    } else {
        setupFormHandler();
    }

    function setupFormHandler() {
        const form = document.getElementById('taskForm');
        if (!form) {
            console.error('❌ Task form tapılmadı!');
            return;
        }

        // Köhnə event listener-ları təmizlə (əgər varsa)
        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);

        // Yeni event listener əlavə et
        newForm.addEventListener('submit', function(e) {
            console.log('📝 Form submit event caught!', new Date().toISOString());
            window.TaskCreationModule.handleTaskFormSubmit(e);
        });

        console.log('✅ Task form handler uğurla quruldu!');

        // Debug: form-a xüsusi işarə əlavə et
        newForm.setAttribute('data-handler-initialized', 'true');
        newForm.setAttribute('data-init-time', new Date().toISOString());
    }
})();

// ========== SELECT DOLDURMA FUNKSİYALARI - create_task_view.js ÜÇÜN ==========
window.fillInternalSelects = function() {
    console.log('🔄 Internal select-lər doldurulur...');
    // Mövcud məlumatlarla select-ləri doldur
    if (window.taskManager && window.taskManager.userData) {
        const deptSelect = document.getElementById('internalDepartmentSelect');
        const userSelect = document.getElementById('internalExecutorSelect');
        const typeSelect = document.getElementById('internalTaskTypeSelect');

        // Departamentləri doldur
        if (deptSelect && window.departments) {
            deptSelect.innerHTML = '<option value="">Şöbə seçin</option>';
            window.departments.forEach(dept => {
                deptSelect.innerHTML += `<option value="${dept.id}">${dept.name}</option>`;
            });
        }

        // İşçiləri doldur
        if (userSelect && window.users) {
            userSelect.innerHTML = '<option value="">İşçi seçin</option>';
            window.users.forEach(user => {
                userSelect.innerHTML += `<option value="${user.id}">${user.full_name || user.name}</option>`;
            });
        }

        // İş növlərini doldur
        if (typeSelect && window.taskTypes) {
            typeSelect.innerHTML = '<option value="">İş növü seçin</option>';
            window.taskTypes.forEach(type => {
                typeSelect.innerHTML += `<option value="${type.id}">${type.name}</option>`;
            });
        }
    }
};

window.fillExternalSelects = function() {
    console.log('🔄 External select-lər doldurulur...');
    const parentSelect = document.getElementById('externalParentCompanySelect');
    const userSelect = document.getElementById('externalExecutorSelect');

    if (parentSelect && window.parentCompanies) {
        parentSelect.innerHTML = '<option value="">Üst şirkət seçin</option>';
        window.parentCompanies.forEach(company => {
            parentSelect.innerHTML += `<option value="${company.id}" data-company-code="${company.code}">⬆️ ${company.name}</option>`;
        });
    }

    if (userSelect && window.externalUsers) {
        userSelect.innerHTML = '<option value="">İşçi seçin</option>';
        window.externalUsers.forEach(user => {
            userSelect.innerHTML += `<option value="${user.id}">${user.full_name || user.name}</option>`;
        });
    }
};

window.fillPartnerSelects = function() {
    console.log('🔄 Partner select-lər doldurulur...');
    const partnerSelect = document.getElementById('partnerCompanySelect');
    const userSelect = document.getElementById('partnerExecutorSelect');

    if (partnerSelect && window.partners) {
        partnerSelect.innerHTML = '<option value="">Partnyor seçin</option>';
        window.partners.forEach(partner => {
            partnerSelect.innerHTML += `<option value="${partner.id}" data-company-id="${partner.company_id}" data-company-code="${partner.code}">📍 ${partner.name}</option>`;
        });
    }

    if (userSelect && window.partnerUsers) {
        userSelect.innerHTML = '<option value="">İşçi seçin</option>';
        window.partnerUsers.forEach(user => {
            userSelect.innerHTML += `<option value="${user.id}">${user.full_name || user.name}</option>`;
        });
    }
};

console.log('✅ Select fill functions registered');