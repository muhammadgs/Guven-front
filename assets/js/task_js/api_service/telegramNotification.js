// telegramNotification.js - TAM VERSİYA (DÜZƏLDİLMİŞ)

/**
 * TELEGRAM BİLDİRİŞ MODULU - VERSİYA 2.1
 *
 * Bu modul bütün Telegram bildirişlərini idarə edir:
 * - Task yaradılanda (assigned_to olan şəxsə)
 * - Task statusu dəyişəndə (task yaradana)
 * - Task tamamlananda (task yaradana)
 * - Task təyin ediləndə (yeni icraçıya)
 * - Task silinəndə (task yaradana)
 * - Şərh əlavə ediləndə (həm icraçıya, həm yaradana)
 */

(function() {
    'use strict';

    // ==================== KONFİQURASİYA ====================
    const CONFIG = {
        DEBUG: true,
        CONFIRMATION_HOURS: 2,
        API_BASE: ''  // makeApiRequest özü idarə edir
    };

    // ==================== KÖMƏKÇİ FUNKSİYALAR ====================

    function log(...args) {
        if (CONFIG.DEBUG) {
            console.log('📱 [Telegram]:', ...args);
        }
    }

    function error(...args) {
        console.error('❌ [Telegram Error]:', ...args);
    }

    function getCurrentUser() {
        return window.taskManager?.userData ||
               JSON.parse(localStorage.getItem('userData') || '{}');
    }

    // ==================== UI KÖMƏKÇİLƏRİ ====================

    function showSuccess(msg) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: '✅ Uğurlu',
                text: msg,
                icon: 'success',
                timer: 2000,
                toast: true,
                position: 'top-end',
                showConfirmButton: false
            });
        } else {
            console.log('✅', msg);
        }
    }

    function showError(msg) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: '❌ Xəta',
                text: msg,
                icon: 'error',
                timer: 3000,
                toast: true,
                position: 'top-end',
                showConfirmButton: false
            });
        } else {
            console.error('❌', msg);
        }
    }

    function showInfo(msg) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'ℹ️ Məlumat',
                text: msg,
                icon: 'info',
                timer: 3000,
                toast: true,
                position: 'top-end',
                showConfirmButton: false
            });
        } else {
            console.log('ℹ️', msg);
        }
    }

    function showToast(msg, icon = 'info') {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: msg,
                icon: icon,
                timer: 2000,
                toast: true,
                position: 'top-end',
                showConfirmButton: false
            });
        }
    }

    // ==================== ƏSAS BİLDİRİŞ FUNKSİYALARI ====================

    /**
     * 1. YENİ TASK YARADILANDA - İcraçıya bildiriş
     */
    async function notifyTaskCreated(taskData, options = {}) {
        log('notifyTaskCreated çağırıldı', taskData);

        try {
            let targetUserId = null;

            if (taskData.assigned_to) {
                targetUserId = parseInt(taskData.assigned_to);
                log('assigned_to tapıldı:', targetUserId);
            } else if (taskData.assignedTo) {
                targetUserId = parseInt(taskData.assignedTo);
                log('assignedTo tapıldı:', targetUserId);
            } else if (taskData.user_id) {
                targetUserId = parseInt(taskData.user_id);
                log('user_id tapıldı:', targetUserId);
            }

            if (!targetUserId && typeof document !== 'undefined') {
                const executorSelect = document.getElementById('executorSelect');
                const selectedCompanyExecutor = document.getElementById('selectedCompanyExecutor');

                if (selectedCompanyExecutor?.value) {
                    targetUserId = parseInt(selectedCompanyExecutor.value);
                    log('selectedCompanyExecutor-dan tapıldı:', targetUserId);
                } else if (executorSelect?.value) {
                    targetUserId = parseInt(executorSelect.value);
                    log('executorSelect-dən tapıldı:', targetUserId);
                }
            }

            if (!targetUserId) {
                log('❌ İcraçı ID tapılmadı');
                if (!options.silent) showToast('İcraçı seçilməyib', 'warning');
                return { success: false, reason: 'no_assignee' };
            }

            log('🎯 Hədəf istifadəçi ID:', targetUserId);

            const currentUser = getCurrentUser();

            // ========== 🔥 GÖNDƏRƏN ADINI DÜZGÜN AL ==========
            let senderName = 'Sistem';
            let senderId = null;

            // 1. TaskData-dan creator_name
            if (taskData.creator_name && taskData.creator_name !== 'Sistem') {
                senderName = taskData.creator_name;
                log('creator_name-dan alındı:', senderName);
            }
            // 2. TaskData.created_by_name
            else if (taskData.created_by_name && taskData.created_by_name !== 'Sistem') {
                senderName = taskData.created_by_name;
                log('created_by_name-dan alındı:', senderName);
            }
            // 3. TaskData.assigned_by_name
            else if (taskData.assigned_by_name && taskData.assigned_by_name !== 'Sistem') {
                senderName = taskData.assigned_by_name;
                log('assigned_by_name-dan alındı:', senderName);
            }
            // 4. TaskData.creator_name (frontend-dən)
            else if (taskData.creator_name && taskData.creator_name !== 'Sistem') {
                senderName = taskData.creator_name;
                log('taskData.creator_name-dan alındı:', senderName);
            }
            // 5. Current user-dan
            else if (currentUser.fullName && currentUser.fullName !== 'Sistem') {
                senderName = currentUser.fullName;
                log('currentUser.fullName-dan alındı:', senderName);
                senderId = currentUser.userId;
            }
            // 6. Current user.name
            else if (currentUser.name && currentUser.name !== 'Sistem') {
                senderName = currentUser.name;
                log('currentUser.name-dan alındı:', senderName);
                senderId = currentUser.userId;
            }
            // 7. Current user.ceo_name
            else if (currentUser.ceo_name && currentUser.ceo_name !== 'Sistem') {
                senderName = currentUser.ceo_name;
                log('currentUser.ceo_name-dan alındı:', senderName);
                senderId = currentUser.userId;
            }

            // 🔥 ƏGƏR HƏLƏ DƏ "Sistem" DİR, API-DƏN İSTİFADƏÇİ MƏLUMATLARINI AL
            if (senderName === 'Sistem' && taskData.created_by) {
                try {
                    log('API-dən istifadəçi məlumatları alınır...');
                    const userResponse = await makeApiRequest(`/users/${taskData.created_by}`, 'GET');
                    if (userResponse && userResponse.data) {
                        const user = userResponse.data;
                        if (user.full_name) {
                            senderName = user.full_name;
                            log('API-dən full_name alındı:', senderName);
                        } else if (user.name) {
                            senderName = user.name;
                            log('API-dən name alındı:', senderName);
                        } else if (user.ceo_name) {
                            senderName = user.ceo_name;
                            log('API-dən ceo_name alındı:', senderName);
                        }
                    }
                } catch (apiErr) {
                    log('API-dən istifadəçi alınarkən xəta:', apiErr);
                }
            }

            // Bildiriş məlumatlarını hazırla
            const notificationData = {
                user_id: targetUserId,
                task_id: parseInt(taskData.task_id || taskData.id),
                task_title: taskData.task_title || taskData.title || 'Yeni Tapşırıq',
                task_description: taskData.task_description || taskData.description || '',
                priority: taskData.priority || 'medium',
                due_date: taskData.due_date || taskData.dueDate || '',
                action: 'created',
                assigned_by_name: senderName,  // 🔥 BURADA DÜZGÜN AD
                assigned_by_id: senderId || taskData.created_by || currentUser.userId,
                creator_company: taskData.creator_company || currentUser.companyName || '',
                creator_position: taskData.creator_position || currentUser.position || '',
                company_name: taskData.company_name || '',
                partner_name: taskData.partner_name || '',
                confirmation_timeout_hours: CONFIG.CONFIRMATION_HOURS,
                sent_at: new Date().toISOString()
            };

            log('📦 Bildiriş məlumatları:', notificationData);

            const expiryDate = new Date();
            expiryDate.setHours(expiryDate.getHours() + CONFIG.CONFIRMATION_HOURS);
            notificationData.expires_at = expiryDate.toISOString();

            log('📦 Bildiriş məlumatları:', notificationData);

            if (typeof makeApiRequest !== 'function') {
                error('❌ makeApiRequest funksiyası tapılmadı!');
                if (!options.silent) showError('API servis tapılmadı');
                return { success: false, reason: 'api_service_missing' };
            }

            const response = await makeApiRequest('/telegram/send-notification', 'POST', notificationData);

            if (response?.status === 400) {
                const errorMsg = response.detail || response.message || response.error || '';

                if (errorMsg.includes('telegram connection') ||
                    errorMsg.includes('Telegram bağlantısı') ||
                    errorMsg.includes('no telegram')) {

                    log(`ℹ️ User ${targetUserId} Telegram bağlantısı yoxdur`);

                    if (!options.silent) {
                        showInfo(`İstifadəçi #${targetUserId} Telegram-a bağlı deyil. Bildiriş göndərilmədi.`);
                    }

                    return {
                        success: false,
                        reason: 'no_telegram_connection',
                        userId: targetUserId,
                        warning: true
                    };
                }
            }

            if (response?.error) {
                error('❌ API xətası:', response.error);
                if (!options.silent) showError('Bildiriş göndərilmədi: ' + response.error);
                return { success: false, error: response.error };
            }

            log('✅ Bildiriş uğurla göndərildi:', response);

            if (!options.silent) {
                showSuccess(`Task #${taskData.task_id || taskData.id} üçün bildiriş göndərildi`);
            }

            return {
                success: true,
                userId: targetUserId,
                response
            };

        } catch (err) {
            error('❌ notifyTaskCreated xətası:', err);

            if (err?.message?.includes('400') || err?.status === 400) {
                if (!options.silent) {
                    showInfo('İstifadəçi Telegram-a bağlı deyil');
                }
                return { success: false, reason: 'no_telegram_connection', warning: true };
            }

            if (!options.silent) showError('Bildiriş xətası: ' + (err.message || ''));
            return { success: false, error: err };
        }
    }

    /**
     * 2. STATUS DƏYİŞİKLİYİ - Task yaradana bildiriş
     */
    async function notifyStatusChanged(task, oldStatus, newStatus, changedBy = {}) {
        log('notifyStatusChanged', { task, oldStatus, newStatus, changedBy });

        try {
            if (!task?.id) {
                error('Tapşırıq məlumatı yoxdur');
                return { success: false, reason: 'invalid_task' };
            }

            const creatorId = task.created_by || task.creator_id;
            if (!creatorId) {
                log('Tapşırıq yaradan ID tapılmadı');
                return { success: false, reason: 'no_creator' };
            }

            const currentUser = getCurrentUser();
            if (currentUser.userId == creatorId || changedBy.userId == creatorId) {
                log('Özü dəyişib, bildiriş göndərilmədi');
                return { success: false, reason: 'self_change' };
            }

            const statusNames = {
                'pending': '⏳ Gözləyir',
                'in_progress': '▶️ İşlənir',
                'completed': '✅ Tamamlandı',
                'rejected': '❌ İmtina edildi',
                'overdue': '⚠️ Gecikmiş',
                'cancelled': '🚫 Ləğv edildi'
            };

            const notificationData = {
                user_id: creatorId,
                task_id: task.id,
                task_title: task.task_title || task.title || `Task #${task.id}`,
                old_status: oldStatus,
                new_status: newStatus,
                old_status_text: statusNames[oldStatus] || oldStatus,
                new_status_text: statusNames[newStatus] || newStatus,
                changed_by_name: changedBy.name || changedBy.username || currentUser.fullName || 'Məlumat yoxdur',
                changed_by_id: changedBy.userId || currentUser.userId,
                task_description: task.task_description || task.description,
                due_date: task.due_date,
                rejection_reason: task.rejection_reason || null
            };

            log('Status bildirişi:', notificationData);

            const response = await makeApiRequest('/telegram/send-status-notification', 'POST', notificationData);

            if (response?.error) {
                error('❌ API xətası:', response.error);
                return { success: false, error: response.error };
            }

            log('✅ Status bildirişi göndərildi:', response);
            return { success: true, response };

        } catch (err) {
            error('notifyStatusChanged xətası:', err);
            return { success: false, error: err };
        }
    }

    /**
     * 3. TASK TAMAMLANANDA - Task yaradana bildiriş
     */
    async function notifyTaskCompleted(task, completedBy = {}) {
        log('notifyTaskCompleted çağırıldı', { task, completedBy });

        try {
            if (!task?.id) return { success: false, reason: 'invalid_task' };

            const creatorId = task.created_by;
            if (!creatorId) return { success: false, reason: 'no_creator' };

            const currentUser = getCurrentUser();

            const notificationData = {
                user_id: creatorId,
                task_id: task.id,
                task_title: task.task_title || task.title || `Task #${task.id}`,
                task_description: `✅ Tapşırıq tamamlandı! Tamamlayan: ${completedBy.name || completedBy.username || currentUser.fullName || 'İstifadəçi'}`,
                action: 'completed',
                completed_by: completedBy.name || completedBy.username || 'İstifadəçi',
                completed_date: new Date().toISOString().split('T')[0],
                message_type: 'task_completion'
            };

            log('📦 Tamamlanma bildiriş məlumatları:', notificationData);

            const response = await makeApiRequest('/telegram/send-notification', 'POST', notificationData);

            if (response?.error) {
                error('❌ API xətası:', response.error);
                return { success: false, error: response.error };
            }

            log('✅ Tamamlanma bildirişi göndərildi:', response);
            return { success: true, response };

        } catch (err) {
            error('notifyTaskCompleted xətası:', err);
            return { success: false, error: err };
        }
    }

    /**
     * 4. YENİ İCRAÇI TƏYİN EDİLDİKDƏ
     */
    async function notifyAssignee(task, assigneeId, assignedBy = {}) {
        log('notifyAssignee', { task, assigneeId, assignedBy });

        try {
            if (!task?.id || !assigneeId) {
                return { success: false, reason: 'invalid_data' };
            }

            return await notifyTaskCreated({
                task_id: task.id,
                assigned_to: assigneeId,
                task_title: task.task_title || task.title,
                task_description: task.task_description || task.description,
                due_date: task.due_date,
                priority: task.priority,
                creator_name: assignedBy.name || assignedBy.username || 'Sistem'
            }, { silent: true });

        } catch (err) {
            error('notifyAssignee xətası:', err);
            return { success: false, error: err };
        }
    }

    /**
     * 5. TASK SİLİNDİKDƏ
     */
    async function notifyTaskDeleted(task, deletedBy = {}) {
        log('notifyTaskDeleted', { task, deletedBy });

        try {
            if (!task?.id) return { success: false, reason: 'invalid_task' };

            const creatorId = task.created_by;
            if (!creatorId) return { success: false, reason: 'no_creator' };

            const currentUser = getCurrentUser();
            if (currentUser.userId == creatorId || deletedBy.userId == creatorId) {
                log('Özü silib, bildiriş göndərilmədi');
                return { success: false, reason: 'self_delete' };
            }

            const notificationData = {
                user_id: creatorId,
                task_id: task.id,
                task_title: task.task_title || task.title || `Task #${task.id}`,
                task_description: `🗑️ Task silindi. Silən: ${deletedBy.name || deletedBy.username || 'Məlumat yoxdur'}`,
                action: 'deleted',
                assigned_by_name: deletedBy.name || 'Sistem'
            };

            const response = await makeApiRequest('/telegram/send-notification', 'POST', notificationData);

            if (response?.error) {
                error('❌ API xətası:', response.error);
                return { success: false, error: response.error };
            }

            log('✅ Silinmə bildirişi göndərildi:', response);
            return { success: true, response };

        } catch (err) {
            error('notifyTaskDeleted xətası:', err);
            return { success: false, error: err };
        }
    }

    /**
     * 6. ŞƏRH ƏLAVƏ EDİLDİKDƏ
     */
    async function notifyCommentAdded(task, comment, commenter = {}) {
        log('notifyCommentAdded', { task, comment, commenter });

        try {
            if (!task?.id || !comment) {
                return { success: false, reason: 'invalid_data' };
            }

            const currentUser = getCurrentUser();
            const results = [];
            const commentText = comment.text || comment.content || comment.message || '';

            if (task.assigned_to && task.assigned_to != commenter.userId) {
                const assigneeResult = await notifyTaskCreated({
                    task_id: task.id,
                    assigned_to: task.assigned_to,
                    task_title: task.task_title || task.title,
                    task_description: `💬 Yeni şərh: ${commentText.substring(0, 100)}${commentText.length > 100 ? '...' : ''}`,
                    creator_name: commenter.name || commenter.username || currentUser.fullName || 'İstifadəçi'
                }, { silent: true });

                results.push({ user: 'assignee', result: assigneeResult });
            }

            if (task.created_by &&
                task.created_by != commenter.userId &&
                task.created_by != task.assigned_to) {

                const creatorResult = await notifyTaskCreated({
                    task_id: task.id,
                    assigned_to: task.created_by,
                    task_title: task.task_title || task.title,
                    task_description: `💬 Tapşırıqınıza şərh yazıldı: ${commentText.substring(0, 100)}${commentText.length > 100 ? '...' : ''}`,
                    creator_name: commenter.name || commenter.username || currentUser.fullName || 'İstifadəçi'
                }, { silent: true });

                results.push({ user: 'creator', result: creatorResult });
            }

            log('✅ Şərh bildirişləri göndərildi:', results);
            return { success: true, results };

        } catch (err) {
            error('notifyCommentAdded xətası:', err);
            return { success: false, error: err };
        }
    }

    /**
     * 7. BİLDİRİŞ TƏSDİQLƏMƏ
     */
    async function confirmNotification(taskId, userId, action = 'confirm') {
        log('confirmNotification', { taskId, userId, action });

        try {
            if (!taskId || !userId) {
                return { success: false, reason: 'missing_params' };
            }

            const response = await makeApiRequest('/telegram/confirm-task', 'POST', {
                task_id: taskId,
                user_id: userId,
                action: action,
                confirmed_at: new Date().toISOString()
            });

            if (response?.error) {
                error('❌ API xətası:', response.error);
                return { success: false, error: response.error };
            }

            log('✅ Təsdiqləmə uğurlu:', response);
            return { success: true, response };

        } catch (err) {
            error('confirmNotification xətası:', err);
            return { success: false, error: err };
        }
    }

    /**
     * 8. İSTİFADƏÇİNİN TELEGRAM MƏLUMATLARINI YOXLA
     */
    async function checkUserTelegram(userId) {
        log('checkUserTelegram', { userId });

        try {
            if (!userId) {
                return { success: false, reason: 'no_user_id' };
            }

            const response = await makeApiRequest(`/telegram/users/${userId}`, 'GET', null, { silent: true });

            if (response?.error) {
                error('❌ API xətası:', response.error);
                return { success: false, error: response.error };
            }

            const userData = response.data || response;

            const result = {
                success: true,
                userId: userId,
                hasTelegram: !!userData?.telegram_chat_id,
                chatId: userData?.telegram_chat_id,
                verified: userData?.is_telegram_verified || false,
                username: userData?.telegram_username,
                fullName: userData?.full_name || userData?.ceo_name,
                data: userData
            };

            log('✅ İstifadəçi məlumatları:', result);
            return result;

        } catch (err) {
            error('checkUserTelegram xətası:', err);
            return { success: false, error: err };
        }
    }

    /**
     * 9. TEST BİLDİRİŞİ GÖNDƏR (YENİ ƏLAVƏ EDİLDİ)
     * Bu funksiya əvvəlcə yox idi, xəta verirdi. İndi əlavə edildi.
     * @param {number} userId - İstifadəçi ID
     * @param {string} message - Test mesajı
     */
    async function sendTestNotification(userId, message = 'Test bildirişi') {
        log('sendTestNotification çağırıldı', { userId, message });

        try {
            if (!userId) {
                error('❌ İstifadəçi ID daxil edilməyib');
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        title: 'Xəta',
                        text: 'Zəhmət olmasa istifadəçi ID daxil edin',
                        icon: 'error',
                        toast: true,
                        timer: 3000
                    });
                }
                return { success: false, reason: 'no_user_id' };
            }

            const notificationData = {
                user_id: parseInt(userId),
                task_id: 0,
                task_title: 'Test Bildirişi',
                task_description: message,
                action: 'test',
                assigned_by_name: getCurrentUser().fullName || 'Test Sistemi',
                sent_at: new Date().toISOString(),
                is_test: true
            };

            log('📦 Test bildiriş məlumatları:', notificationData);

            if (typeof makeApiRequest !== 'function') {
                error('❌ makeApiRequest funksiyası tapılmadı!');
                return { success: false, reason: 'api_service_missing' };
            }

            const response = await makeApiRequest('/telegram/send-notification', 'POST', notificationData);

            if (response?.error) {
                error('❌ Test bildiriş xətası:', response.error);

                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        title: 'Xəta',
                        text: `Bildiriş göndərilmədi: ${response.error}`,
                        icon: 'error',
                        toast: true,
                        timer: 4000
                    });
                }

                return { success: false, error: response.error };
            }

            log('✅ Test bildirişi uğurla göndərildi:', response);

            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: '✅ Uğurlu',
                    text: `Test bildirişi istifadəçi #${userId}-ə göndərildi`,
                    icon: 'success',
                    toast: true,
                    timer: 3000
                });
            }

            return { success: true, response };

        } catch (err) {
            error('❌ sendTestNotification xətası:', err);

            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: 'Xəta',
                    text: err.message || 'Bildiriş göndərilərkən xəta baş verdi',
                    icon: 'error',
                    toast: true,
                    timer: 4000
                });
            }

            return { success: false, error: err };
        }
    }

    /**
     * 10. KONFİQURASİYANI YENİLƏ
     */
    function configure(options = {}) {
        Object.assign(CONFIG, options);
        log('Konfiqurasiya yeniləndi:', CONFIG);
        return CONFIG;
    }

    /**
     * 11. DEBUG REJİMİ DƏYİŞ
     */
    function setDebug(enabled) {
        CONFIG.DEBUG = enabled;
        log(`Debug rejimi: ${enabled ? 'ON' : 'OFF'}`);
    }

    /**
     * 12. VERSİYA
     */
    function getVersion() {
        return '2.1.0';
    }

    // ==================== GLOBAL ƏLAVƏ ETMƏ ====================

    // Bütün funksiyaları global olaraq əlavə et
    window.notifyTaskCreated = notifyTaskCreated;
    window.notifyStatusChanged = notifyStatusChanged;
    window.notifyTaskCompleted = notifyTaskCompleted;
    window.notifyAssignee = notifyAssignee;
    window.notifyTaskDeleted = notifyTaskDeleted;
    window.notifyCommentAdded = notifyCommentAdded;
    window.confirmNotification = confirmNotification;
    window.checkUserTelegram = checkUserTelegram;
    window.sendTestNotification = sendTestNotification;  // ✅ ƏLAVƏ EDİLDİ
    window.configureTelegram = configure;
    window.setTelegramDebug = setDebug;
    window.getTelegramVersion = getVersion;

    // Modul obyekti
    window.TelegramHelper = {
        notifyTaskCreated,
        notifyStatusChanged,
        notifyTaskCompleted,
        notifyAssignee,
        notifyTaskDeleted,
        notifyCommentAdded,
        confirmNotification,
        checkUserTelegram,
        sendTestNotification,
        configure,
        setDebug,
        getVersion
    };

    // Köhnə adla da əlavə et
    if (typeof window.TelegramNotification === 'undefined') {
        window.TelegramNotification = window.TelegramHelper;
    }

    console.log('✅ Telegram Bildiriş Modulu yükləndi! Versiya:', getVersion());
    console.log('📋 Mövcud funksiyalar:', Object.keys(window.TelegramHelper).join(', '));

    // Chrome Extension xətasını dayandırmaq üçün
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.lastError) {
        // Xətanı dayandır (əhəmiyyətli deyil)
        console.debug('Chrome runtime.lastError handled');
    }

})();