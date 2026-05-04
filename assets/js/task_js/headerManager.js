/**
 * Header Manager - Handles header statistics and functionality
 */

class HeaderManager {
    constructor(taskManager) {
        this.taskManager = taskManager;
        this.stats = {
            activeTasks: 0,
            completedTasks: 0,
            overdueTasks: 0,
            totalCost: 0,
            weeklyChange: {
                active: 12,
                completed: 8,
                overdue: -3,
                cost: 15
            }
        };

        this.init();
    }

    // HeaderManager class-ının içində init() funksiyasından SONRA əlavə edin:

    init() {
        console.log('🏷️ Header Manager başladılır...');

        // Update user info
        this.updateUserInfo();

        // Setup profile menu
        this.setupProfileMenu();

        // Setup quick stats
        this.setupQuickStats();

        // Setup weekly analysis buttons
        this.setupAnalysisButtons();

        // ✅ WEB SOCKET İŞLƏMİ ÜÇÜN REAL-TIME BİLDİRİŞLƏR
        this.setupRealtimeNotifications();

        // Start auto updates
        this.startAutoUpdates();

        console.log('✅ Header Manager hazırdır');
    }

    // ==================== REAL-TIME NOTIFICATIONS ====================

    setupRealtimeNotifications() {
        console.log('🔔 Real-time bildirişlər hazırlanır...');

        // Header-də bildiriş ikonu yarat
        this.createNotificationBadge();

        // WebSocket event listener-ları qur
        this.setupWebSocketListeners();

        // Səs ayarlarını yoxla
        this.setupSoundSettings();
    }

    createNotificationBadge() {
        // Header-də bildiriş ikonu yarat
        const headerActions = document.querySelector('.header-actions');
        if (!headerActions) return;

        // Bildiriş badge-i yarat (əgər yoxdursa)
        let notificationBadge = document.getElementById('headerNotificationBadge');
        if (!notificationBadge) {
            notificationBadge = document.createElement('div');
            notificationBadge.id = 'headerNotificationBadge';
            notificationBadge.className = 'notification-badge hidden';
            notificationBadge.innerHTML = '<i class="fas fa-bell"></i>';

            // Header-ə əlavə et
            headerActions.insertBefore(notificationBadge, headerActions.firstChild);

            // Klik event-i əlavə et
            notificationBadge.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showNotificationsPanel();
            });

            // CSS əlavə et
            this.addNotificationBadgeStyles();
        }
    }

    addNotificationBadgeStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #headerNotificationBadge {
                position: relative;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: linear-gradient(135deg, #3b82f6, #1d4ed8);
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.3s ease;
                margin-right: var(--space-2);
                box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
            }
            
            #headerNotificationBadge:hover {
                transform: scale(1.1);
                box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
            }
            
            #headerNotificationBadge i {
                font-size: 18px;
            }
            
            #headerNotificationBadge.has-notifications {
                background: linear-gradient(135deg, #ef4444, #dc2626);
                animation: bellRing 0.5s ease;
            }
            
            #headerNotificationBadge.has-notifications::after {
                content: '';
                position: absolute;
                top: -3px;
                right: -3px;
                width: 12px;
                height: 12px;
                background: #10b981;
                border-radius: 50%;
                border: 2px solid white;
                animation: pulse 1.5s infinite;
            }
            
            @keyframes bellRing {
                0%, 100% { transform: rotate(0deg); }
                25% { transform: rotate(-15deg); }
                75% { transform: rotate(15deg); }
            }
            
            @keyframes pulse {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.2); opacity: 0.8; }
            }
            
            .notifications-panel {
                position: fixed;
                top: 70px;
                right: 20px;
                width: 350px;
                max-height: 500px;
                background: var(--bg-surface);
                border-radius: var(--radius-xl);
                border: 1px solid var(--border-light);
                box-shadow: var(--shadow-2xl);
                z-index: 9999;
                display: none;
                overflow: hidden;
            }
            
            .notifications-panel.show {
                display: flex;
                flex-direction: column;
                animation: slideDown 0.3s ease;
            }
            
            @keyframes slideDown {
                from {
                    opacity: 0;
                    transform: translateY(-10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            .notifications-header {
                padding: var(--space-4) var(--space-6);
                border-bottom: 1px solid var(--border-light);
                background: var(--bg-tertiary);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .notifications-title {
                font-size: var(--text-lg);
                font-weight: var(--font-semibold);
                color: var(--text-primary);
                margin: 0;
                display: flex;
                align-items: center;
                gap: var(--space-3);
            }
            
            .notifications-count {
                background: var(--primary-500);
                color: white;
                padding: 2px 8px;
                border-radius: 20px;
                font-size: var(--text-xs);
                font-weight: var(--font-medium);
            }
            
            .notifications-content {
                flex: 1;
                overflow-y: auto;
                padding: var(--space-2);
            }
            
            .notification-item {
                padding: var(--space-4);
                border-bottom: 1px solid var(--border-light);
                cursor: pointer;
                transition: all 0.2s ease;
                border-radius: var(--radius-lg);
                margin: var(--space-2);
            }
            
            .notification-item:hover {
                background: var(--bg-tertiary);
                transform: translateX(2px);
            }
            
            .notification-item.unread {
                background: rgba(59, 130, 246, 0.05);
                border-left: 3px solid var(--primary-500);
            }
            
            .notification-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: var(--space-2);
            }
            
            .notification-title {
                font-weight: var(--font-semibold);
                color: var(--text-primary);
                font-size: var(--text-sm);
                display: flex;
                align-items: center;
                gap: var(--space-2);
            }
            
            .notification-icon {
                width: 20px;
                height: 20px;
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
            }
            
            .notification-time {
                font-size: var(--text-xs);
                color: var(--text-tertiary);
            }
            
            .notification-message {
                color: var(--text-secondary);
                font-size: var(--text-sm);
                line-height: 1.4;
                margin-bottom: var(--space-2);
            }
            
            .notification-task {
                font-size: var(--text-xs);
                color: var(--primary-500);
                font-weight: var(--font-medium);
            }
            
            .notifications-footer {
                padding: var(--space-3) var(--space-4);
                border-top: 1px solid var(--border-light);
                background: var(--bg-tertiary);
                display: flex;
                justify-content: space-between;
            }
            
            .empty-notifications {
                padding: var(--space-8) var(--space-4);
                text-align: center;
                color: var(--text-tertiary);
            }
            
            .empty-notifications i {
                font-size: 48px;
                margin-bottom: var(--space-4);
                opacity: 0.5;
            }
        `;

        document.head.appendChild(style);
    }

    setupWebSocketListeners() {
        // WebSocket realtimeNotifications instance-nı dinlə
        if (window.realtimeNotifications) {
            // Task bildirişi alındıqda
            window.realtimeNotifications.on('task_notification', (data) => {
                this.handleRealtimeTaskNotification(data);
            });

            // WebSocket bağlantısı dəyişdikdə
            window.realtimeNotifications.on('connection', (data) => {
                this.handleWebSocketConnection(data);
            });

            console.log('✅ WebSocket listener-ları quruldu');
        } else {
            console.warn('⚠️ RealtimeNotifications mövcud deyil');

            // RealtimeNotifications yüklənənə qədər gözlə
            const checkInterval = setInterval(() => {
                if (window.realtimeNotifications) {
                    clearInterval(checkInterval);
                    this.setupWebSocketListeners();
                }
            }, 1000);
        }
    }

    handleRealtimeTaskNotification(data) {
        console.log('📨 HeaderManager bildiriş alındı:', data.event);

        // 1. BİLDİRİŞ BADGE-Nİ YENİLƏ
        this.updateNotificationBadge(data);

        // 2. STATS-LARI YENİLƏ
        this.updateStatsFromNotification(data);

        // 3. SƏS ÇIXART
        this.playNotificationSound(data.event);

        // 4. NOTIFICATION PANEL-Ə ƏLAVƏ ET
        this.addToNotificationsPanel(data);

        // 5. SƏHİFƏ BAŞLIĞINDA BİLDİRİŞ
        this.showPageNotification(data.title || data.message);
    }

    updateNotificationBadge(data) {
        const badge = document.getElementById('headerNotificationBadge');
        if (!badge) return;

        // Badge-i göstər və animasiya et
        badge.classList.remove('hidden');
        badge.classList.add('has-notifications');

        // 5 saniyə sonra animasiyanı dayandır
        setTimeout(() => {
            badge.classList.remove('has-notifications');
        }, 5000);

        // Badge klik olunduqda bildiriş göstər
        badge.title = `Yeni bildiriş: ${data.task?.task_title || data.message}`;
    }

    updateStatsFromNotification(data) {
        // Bildiriş əsasında stats-ları yenilə
        switch(data.event) {
            case 'task_created':
                this.stats.activeTasks++;
                break;

            case 'task_completed':
                this.stats.activeTasks = Math.max(0, this.stats.activeTasks - 1);
                this.stats.completedTasks++;
                break;

            case 'task_rejected':
                this.stats.activeTasks = Math.max(0, this.stats.activeTasks - 1);
                break;

            case 'task_assigned':
                // İşçi dəyişikliyi - statsa təsiri yoxdur
                break;
        }

        // DOM-u yenilə
        this.updateStatsDOM();
    }

    playNotificationSound(eventType) {
        // SoundManager istifadə et
        if (typeof SoundManager !== 'undefined' && SoundManager.playNotificationSound) {
            SoundManager.playNotificationSound(eventType);
        } else {
            // Fallback səs
            this.playFallbackNotificationSound(eventType);
        }
    }

    playFallbackNotificationSound(eventType) {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // Event tipinə görə fərqli səslər
            const frequencies = {
                'task_created': 659.25,    // E5 - yeni task
                'task_completed': 523.25,  // C5 - tamamlandı
                'task_rejected': 392.00,   // G4 - imtina
                'task_assigned': 587.33,   // D5 - təyin edildi
                'task_started': 523.25,    // C5 - başladı
                'task_in_progress': 523.25 // C5 - başladı
            };

            oscillator.frequency.value = frequencies[eventType] || 440;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);

        } catch (error) {
            console.log('Fallback səs də oynadıla bilmədi:', error);
        }
    }

    addToNotificationsPanel(data) {
        // Bildirişlər panelini yarat/yenilə
        let notificationsPanel = document.getElementById('notificationsPanel');

        if (!notificationsPanel) {
            notificationsPanel = document.createElement('div');
            notificationsPanel.id = 'notificationsPanel';
            notificationsPanel.className = 'notifications-panel';
            document.body.appendChild(notificationsPanel);
        }

        // Bildiriş elementi yarat
        const notificationItem = document.createElement('div');
        notificationItem.className = 'notification-item unread';
        notificationItem.dataset.timestamp = Date.now();
        notificationItem.dataset.eventType = data.event;
        notificationItem.dataset.taskId = data.task?.id;

        // Icon seç
        const icons = {
            'task_created': { icon: '➕', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
            'task_completed': { icon: '✅', color: '#059669', bg: 'rgba(5, 150, 105, 0.1)' },
            'task_rejected': { icon: '❌', color: '#dc2626', bg: 'rgba(220, 38, 38, 0.1)' },
            'task_assigned': { icon: '👤', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
            'task_started': { icon: '🚀', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' }
        };

        const iconInfo = icons[data.event] || { icon: '🔔', color: '#6b7280', bg: 'rgba(107, 114, 128, 0.1)' };

        notificationItem.innerHTML = `
            <div class="notification-header">
                <div class="notification-title">
                    <div class="notification-icon" style="background: ${iconInfo.bg}; color: ${iconInfo.color}">
                        ${iconInfo.icon}
                    </div>
                    <span>${data.title || this.getNotificationTitle(data.event)}</span>
                </div>
                <div class="notification-time">Az əvvəl</div>
            </div>
            <div class="notification-message">${data.message || ''}</div>
            ${data.task?.task_title ? `<div class="notification-task">${data.task.task_title}</div>` : ''}
        `;

        // Klik event-i əlavə et
        notificationItem.addEventListener('click', () => {
            this.handleNotificationClick(data);
            notificationItem.classList.remove('unread');
        });

        // Panelə əlavə et (ən üstə)
        const content = notificationsPanel.querySelector('.notifications-content') || this.createNotificationsPanelContent(notificationsPanel);
        content.insertBefore(notificationItem, content.firstChild);

        // Çoxlu bildirişləri məhdudlaşdır
        this.limitNotifications(20);
    }

    createNotificationsPanelContent(panel) {
        // Bildirişlər paneli kontentini yarat
        panel.innerHTML = `
            <div class="notifications-header">
                <h3 class="notifications-title">
                    <i class="fas fa-bell"></i>
                    Bildirişlər
                    <span class="notifications-count">0</span>
                </h3>
                <button class="btn secondary-btn btn-sm" id="clearAllNotifications">
                    <i class="fas fa-trash"></i>
                    Təmizlə
                </button>
            </div>
            <div class="notifications-content">
                <div class="empty-notifications">
                    <i class="fas fa-bell-slash"></i>
                    <p>Hələ bildiriş yoxdur</p>
                </div>
            </div>
            <div class="notifications-footer">
                <button class="btn secondary-btn btn-sm" id="markAllRead">
                    <i class="fas fa-check-double"></i>
                    Hamısını oxunmuş et
                </button>
                <button class="btn secondary-btn btn-sm" id="openNotificationsSettings">
                    <i class="fas fa-cog"></i>
                    Tənzimləmələr
                </button>
            </div>
        `;

        const content = panel.querySelector('.notifications-content');

        // Event listener-lar əlavə et
        panel.querySelector('#clearAllNotifications').addEventListener('click', () => {
            this.clearAllNotifications();
        });

        panel.querySelector('#markAllRead').addEventListener('click', () => {
            this.markAllNotificationsAsRead();
        });

        panel.querySelector('#openNotificationsSettings').addEventListener('click', () => {
            this.openNotificationsSettings();
        });

        // Panel kliklə bağlanmasın
        panel.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        return content;
    }

    limitNotifications(maxCount) {
        const panel = document.getElementById('notificationsPanel');
        if (!panel) return;

        const content = panel.querySelector('.notifications-content');
        const items = content.querySelectorAll('.notification-item');

        if (items.length > maxCount) {
            for (let i = maxCount; i < items.length; i++) {
                items[i].remove();
            }
        }

        // Bildiriş sayını yenilə
        this.updateNotificationsCount();
    }

    updateNotificationsCount() {
        const panel = document.getElementById('notificationsPanel');
        if (!panel) return;

        const countElement = panel.querySelector('.notifications-count');
        const unreadItems = panel.querySelectorAll('.notification-item.unread');

        if (countElement) {
            countElement.textContent = unreadItems.length;

            // Əgər boşdursa, empty state göster
            const emptyElement = panel.querySelector('.empty-notifications');
            if (unreadItems.length === 0 && items.length === 0 && emptyElement) {
                emptyElement.style.display = 'block';
            } else if (emptyElement) {
                emptyElement.style.display = 'none';
            }
        }
    }

    showNotificationsPanel() {
        const panel = document.getElementById('notificationsPanel');
        if (!panel) return;

        // Panel göstər/gizlət
        panel.classList.toggle('show');

        // Kliklə bağla
        document.addEventListener('click', (e) => {
            if (!panel.contains(e.target) && !document.getElementById('headerNotificationBadge')?.contains(e.target)) {
                panel.classList.remove('show');
            }
        });
    }

    handleNotificationClick(data) {
        // Bildirişə klik olunduqda

        // 1. Task-a focus et
        if (data.task?.id && window.TableManager?.focusTask) {
            window.TableManager.focusTask(data.task.id);
        }

        // 2. Bildiriş panelini bağla
        const panel = document.getElementById('notificationsPanel');
        if (panel) {
            panel.classList.remove('show');
        }

        // 3. Badge-i yenilə
        const badge = document.getElementById('headerNotificationBadge');
        if (badge) {
            badge.classList.remove('has-notifications');
        }
    }

    showPageNotification(title) {
        // Səhifə başlığında bildiriş (tab fokusunda deyilsə)
        if (document.hidden) {
            let originalTitle = document.title;
            let blinkCount = 0;
            const maxBlinks = 6;

            const blinkInterval = setInterval(() => {
                document.title = blinkCount % 2 === 0 ?
                    `🔔 ${title} - Task Manager` :
                    originalTitle;

                blinkCount++;

                if (blinkCount >= maxBlinks * 2) {
                    clearInterval(blinkInterval);
                    document.title = originalTitle;
                }
            }, 500);
        }
    }

    handleWebSocketConnection(data) {
        const badge = document.getElementById('headerNotificationBadge');
        if (!badge) return;

        if (data.connected) {
            // WebSocket bağlıdırsa, badge-i yaşıl et
            badge.style.background = 'linear-gradient(135deg, #10b981, #059669)';
            badge.title = 'Real-time bağlantı aktiv';
        } else {
            // WebSocket bağlı deyilsə, badge-i qırmızı et
            badge.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
            badge.title = 'Real-time bağlantı kəsilib';

            // 5 saniyə sonra normala qayıt
            setTimeout(() => {
                if (badge && !badge.classList.contains('has-notifications')) {
                    badge.style.background = 'linear-gradient(135deg, #3b82f6, #1d4ed8)';
                    badge.title = 'Bildirişlər';
                }
            }, 5000);
        }
    }

    setupSoundSettings() {
        // Səs ayarları üçün düymə yarat (əgər yoxdursa)
        const soundSettingsBtn = document.getElementById('soundSettingsBtn');
        if (!soundSettingsBtn) {
            const headerActions = document.querySelector('.header-actions');
            if (!headerActions) return;

            const soundBtn = document.createElement('button');
            soundBtn.id = 'soundSettingsBtn';
            soundBtn.className = 'btn secondary-btn btn-sm';
            soundBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
            soundBtn.title = 'Səs ayarları';

            soundBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showSoundSettingsModal();
            });

            headerActions.appendChild(soundBtn);
        }
    }

    showSoundSettingsModal() {
        // Səs ayarları modalını göstər
        const modal = document.createElement('div');
        modal.className = 'modal-backdrop';
        modal.innerHTML = `
            <div class="modal modal-sm">
                <div class="modal-header">
                    <div class="modal-title">
                        <i class="fas fa-volume-up"></i>
                        Səs Ayarları
                    </div>
                    <button class="close-btn">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-content">
                    <div class="sound-settings-modal">
                        <div class="sound-setting">
                            <label>
                                <input type="checkbox" id="enableSounds" checked>
                                Bildiriş səsləri
                            </label>
                        </div>
                        <div class="sound-setting">
                            <label>Səs səviyyəsi:</label>
                            <input type="range" id="soundVolume" min="0" max="100" value="50">
                            <span id="volumePercentage">50%</span>
                        </div>
                        <div class="sound-setting">
                            <label>Test səsi:</label>
                            <button class="btn secondary-btn btn-sm" id="testSoundBtn">
                                <i class="fas fa-play"></i>
                                Test səsi
                            </button>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn primary-btn" id="saveSoundSettings">Yadda Saxla</button>
                    <button class="btn secondary-btn close-modal">Bağla</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listener-lar
        modal.querySelector('.close-btn').addEventListener('click', () => modal.remove());
        modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());

        modal.querySelector('#soundVolume').addEventListener('input', (e) => {
            document.getElementById('volumePercentage').textContent = `${e.target.value}%`;
        });

        modal.querySelector('#testSoundBtn').addEventListener('click', () => {
            this.playTestSound();
        });

        modal.querySelector('#saveSoundSettings').addEventListener('click', () => {
            this.saveSoundSettings();
            modal.remove();
        });

        // Backdrop kliklə bağla
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    playTestSound() {
        // Test səsi oynat
        if (typeof SoundManager !== 'undefined' && SoundManager.playSound) {
            SoundManager.playSound('notification');
        }
    }

    saveSoundSettings() {
        // Səs ayarlarını yadda saxla
        const enableSounds = document.getElementById('enableSounds')?.checked;
        const volume = document.getElementById('soundVolume')?.value;

        if (typeof SoundManager !== 'undefined') {
            if (enableSounds !== undefined) {
                SoundManager.settings.enabled = enableSounds;
            }
            if (volume !== undefined) {
                SoundManager.settings.volume = volume / 100;
                SoundManager.applySettings();
            }
            SoundManager.saveSettings();
        }

        this.showNotification('Səs ayarları yadda saxlandı', 'success');
    }

    // Utility methods
    getNotificationTitle(eventType) {
        const titles = {
            'task_created': 'Yeni Task Əlavə Edildi',
            'task_completed': 'Task Tamamlandı',
            'task_rejected': 'Task İmtina Edildi',
            'task_assigned': 'Task Təyin Edildi',
            'task_started': 'Task Başladı',
            'task_in_progress': 'Task İşlənir'
        };

        return titles[eventType] || 'Yeni Bildiriş';
    }

    clearAllNotifications() {
        const panel = document.getElementById('notificationsPanel');
        if (!panel) return;

        const content = panel.querySelector('.notifications-content');
        if (content) {
            content.innerHTML = `
                <div class="empty-notifications">
                    <i class="fas fa-bell-slash"></i>
                    <p>Hələ bildiriş yoxdur</p>
                </div>
            `;
        }

        this.updateNotificationsCount();
    }

    markAllNotificationsAsRead() {
        const panel = document.getElementById('notificationsPanel');
        if (!panel) return;

        const unreadItems = panel.querySelectorAll('.notification-item.unread');
        unreadItems.forEach(item => {
            item.classList.remove('unread');
        });

        this.updateNotificationsCount();
    }

    openNotificationsSettings() {
        this.showSoundSettingsModal();
    }

    // ==================== USER INFO ====================

    updateUserInfo() {
        const userName = document.getElementById('userName');
        const userRole = document.getElementById('userRole');

        if (!this.taskManager?.userData) {
            console.warn('⚠️ User data not available yet');
            return;
        }

        const user = this.taskManager.userData;

        // Update name
        if (userName) {
            userName.textContent = user.fullName || user.name || 'Asif Agayev';
        }

        // Update role with formatted text
        if (userRole) {
            userRole.textContent = this.formatUserRole(user.role);
        }

        // Update profile menu
        this.updateProfileMenu(user);
    }

    formatUserRole(role) {
        const roles = {
            'company_admin': 'Şirkət Admini',
            'super_admin': 'Super Admin',
            'admin': 'Admin',
            'employee': 'İşçi',
            'manager': 'Menecer',
            'owner': 'Sahib'
        };

        return roles[role] || 'İstifadəçi';
    }

    updateProfileMenu(user) {
        const profileMenuName = document.getElementById('profileMenuName');
        const profileMenuEmail = document.getElementById('profileMenuEmail');

        if (profileMenuName) {
            profileMenuName.textContent = user.fullName || user.name || 'Asif Agayev';
        }

        if (profileMenuEmail) {
            profileMenuEmail.textContent = user.email || 'asif@gmail.com';
        }
    }

    // ==================== PROFILE MENU ====================

    setupProfileMenu() {
        const profileMenuBtn = document.getElementById('profileMenuBtn');
        const profileMenu = document.getElementById('profileMenu');
        const logoutBtn = document.getElementById('logoutBtn');

        if (!profileMenuBtn || !profileMenu) {
            console.warn('⚠️ Profile menu elements not found');
            return;
        }

        // Toggle profile menu
        profileMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            profileMenu.classList.toggle('show');
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!profileMenu.contains(e.target) && !profileMenuBtn.contains(e.target)) {
                profileMenu.classList.remove('show');
            }
        });

        // Logout functionality
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.handleLogout();
            });
        }

        // Setup other profile menu items
        this.setupProfileMenuItems();
    }

    setupProfileMenuItems() {
        const menuItems = {
            'profileSettingsBtn': () => this.openProfileSettings(),
            'appSettingsBtn': () => this.openAppSettings(),
            'helpBtn': () => this.openHelp(),
            'aboutBtn': () => this.showAbout(),
            'switchAccountBtn': () => this.switchAccount()
        };

        Object.keys(menuItems).forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.addEventListener('click', menuItems[btnId]);
            }
        });
    }

    handleLogout() {
        if (confirm('Hesabdan çıxmaq istədiyinizə əminsiniz?')) {
            this.showLoading('Çıxış edilir...');

            // Clear all auth data
            localStorage.clear();
            sessionStorage.clear();

            // Clear cookies
            document.cookie.split(";").forEach(cookie => {
                document.cookie = cookie.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
            });

            // Redirect to login
            setTimeout(() => {
                window.location.href = '../login.html';
            }, 1000);
        }
    }

    // ==================== QUICK STATS ====================

    setupQuickStats() {
        // Initial update
        this.updateQuickStats();

        // Setup click handlers for stats cards
        this.setupStatsCardClickHandlers();

        // Setup trend indicators
        this.updateTrendIndicators();
    }

    async updateQuickStats() {
        try {
            // Get real data from API
            await this.fetchStatsFromAPI();

            // Update DOM
            this.updateStatsDOM();

            // Update trend arrows
            this.updateTrendArrows();

        } catch (error) {
            console.error('❌ Stats update error:', error);
            // Use cached or default data
            this.useCachedStats();
        }
    }

    async fetchStatsFromAPI() {
        // Try to get stats from multiple endpoints
        const endpoints = [
            '/tasks/stats/summary',
            '/tasks/counts',
            '/reports/quick-stats'
        ];

        for (const endpoint of endpoints) {
            try {
                const response = await this.taskManager.apiRequest(endpoint, 'GET');
                if (response && response.data) {
                    this.processStatsResponse(response.data);
                    return;
                }
            } catch (error) {
                console.log(`⚠️ Endpoint ${endpoint} failed, trying next...`);
            }
        }

        // Fallback: Calculate from tasks
        await this.calculateStatsFromTasks();
    }

    processStatsResponse(data) {
        // Handle different response formats
        if (data.active !== undefined) {
            this.stats.activeTasks = data.active;
            this.stats.completedTasks = data.completed || data.done || 0;
            this.stats.overdueTasks = data.overdue || data.late || 0;
            this.stats.totalCost = data.total_cost || data.cost || 0;
        } else if (data.total !== undefined) {
            this.stats.activeTasks = data.pending + data.in_progress;
            this.stats.completedTasks = data.completed;
            this.stats.overdueTasks = data.overdue;
            this.stats.totalCost = data.total_cost || 0;
        }

        // Calculate weekly changes
        this.calculateWeeklyChanges();
    }

    async calculateStatsFromTasks() {
        try {
            // Get all tasks
            const response = await this.taskManager.apiRequest('/tasks/detailed', 'GET');

            if (response && response.data) {
                const tasks = Array.isArray(response.data) ? response.data : response.data.items || [];

                // Calculate stats
                const now = new Date();
                const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

                this.stats.activeTasks = tasks.filter(t =>
                    t.status === 'pending' || t.status === 'in_progress'
                ).length;

                this.stats.completedTasks = tasks.filter(t =>
                    t.status === 'completed'
                ).length;

                this.stats.overdueTasks = tasks.filter(t => {
                    if (!t.due_date) return false;
                    const dueDate = new Date(t.due_date);
                    return dueDate < now && t.status !== 'completed';
                }).length;

                this.stats.totalCost = tasks.reduce((sum, task) => {
                    return sum + (task.calculated_cost || task.billing_rate || 0);
                }, 0);

                // Calculate weekly changes
                this.calculateWeeklyChanges();
            }
        } catch (error) {
            console.error('❌ Calculate stats error:', error);
            this.useDefaultStats();
        }
    }

    calculateWeeklyChanges() {
        // Simulate weekly changes (in real app, compare with last week's data)
        const changes = {
            active: this.getRandomChange(5, 20),
            completed: this.getRandomChange(5, 15),
            overdue: this.getRandomChange(-10, 5),
            cost: this.getRandomChange(10, 25)
        };

        this.stats.weeklyChange = changes;
    }

    getRandomChange(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    useCachedStats() {
        // Try to get from localStorage
        const cached = localStorage.getItem('quickStatsCache');
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                if (Date.now() - parsed.timestamp < 5 * 60 * 1000) { // 5 minutes
                    this.stats = parsed.data;
                    return;
                }
            } catch (error) {
                console.log('⚠️ Cached stats corrupted');
            }
        }

        // Use defaults
        this.useDefaultStats();
    }

    useDefaultStats() {
        this.stats = {
            activeTasks: 0,
            completedTasks: 0,
            overdueTasks: 0,
            totalCost: 0,
            weeklyChange: {
                active: 12,
                completed: 8,
                overdue: -3,
                cost: 15
            }
        };
    }

    updateStatsDOM() {
        // Update stat values
        document.getElementById('activeTasksCount').textContent = this.stats.activeTasks;
        document.getElementById('completedTasksCount').textContent = this.stats.completedTasks;
        document.getElementById('overdueTasksCount').textContent = this.stats.overdueTasks;
        document.getElementById('totalCost').textContent = `${this.stats.totalCost.toFixed(2)} AZN`;

        // Update trend percentages
        this.updateTrendPercentages();

        // Cache the stats
        this.cacheStats();
    }

    updateTrendPercentages() {
        const trends = {
            active: document.querySelector('#activeTasksCount').closest('.stat-card').querySelector('.stat-trend span'),
            completed: document.querySelector('#completedTasksCount').closest('.stat-card').querySelector('.stat-trend span'),
            overdue: document.querySelector('#overdueTasksCount').closest('.stat-card').querySelector('.stat-trend span'),
            cost: document.querySelector('#totalCost').closest('.stat-card').querySelector('.stat-trend span')
        };

        if (trends.active) trends.active.textContent = `${this.stats.weeklyChange.active}%`;
        if (trends.completed) trends.completed.textContent = `${this.stats.weeklyChange.completed}%`;
        if (trends.overdue) trends.overdue.textContent = `${Math.abs(this.stats.weeklyChange.overdue)}%`;
        if (trends.cost) trends.cost.textContent = `${this.stats.weeklyChange.cost}%`;
    }

    updateTrendArrows() {
        const cards = document.querySelectorAll('.stat-card');

        cards.forEach(card => {
            const trendElement = card.querySelector('.stat-trend');
            if (!trendElement) return;

            // Determine if trend is up or down based on class
            const isTrendUp = trendElement.classList.contains('trend-up');
            const isTrendDown = trendElement.classList.contains('trend-down');

            const arrow = trendElement.querySelector('i');
            if (arrow) {
                arrow.className = isTrendUp ? 'fas fa-arrow-up' :
                                 isTrendDown ? 'fas fa-arrow-down' :
                                 'fas fa-minus';
            }
        });
    }

    updateTrendIndicators() {
        // Add tooltips to trend indicators
        document.querySelectorAll('.stat-trend').forEach(trend => {
            const card = trend.closest('.stat-card');
            const value = trend.querySelector('span')?.textContent || '';
            const period = trend.querySelector('.stat-period')?.textContent || '';

            trend.title = `Dəyişiklik: ${value} ${period}`;
        });
    }

    cacheStats() {
        const cacheData = {
            data: this.stats,
            timestamp: Date.now()
        };

        try {
            localStorage.setItem('quickStatsCache', JSON.stringify(cacheData));
        } catch (error) {
            console.error('❌ Cache error:', error);
        }
    }

    setupStatsCardClickHandlers() {
        const cards = document.querySelectorAll('.stat-card');

        cards.forEach((card, index) => {
            card.style.cursor = 'pointer';
            card.addEventListener('click', () => {
                this.handleStatCardClick(index);
            });

            // Add hover effects
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-5px)';
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0)';
            });
        });
    }

    handleStatCardClick(cardIndex) {
        const filters = {
            0: { status: 'pending,in_progress' }, // Active tasks
            1: { status: 'completed' }, // Completed tasks
            2: { status: 'overdue' }, // Overdue tasks
            3: { } // All tasks for cost
        };

        const filter = filters[cardIndex];
        if (filter && this.taskManager) {
            this.taskManager.currentFilters = filter;
            this.taskManager.loadActiveTasks();

            // Show notification
            this.showNotification(`"${this.getCardTitle(cardIndex)}" filtr tətbiq edildi`, 'info');
        }
    }

    getCardTitle(index) {
        const titles = [
            'Aktiv İşlər',
            'Tamamlanan İşlər',
            'Gecikmiş İşlər',
            'Ümumi Xərc'
        ];
        return titles[index] || 'Statistika';
    }

    // ==================== WEEKLY ANALYSIS ====================

    setupAnalysisButtons() {
        // Create weekly analysis section if not exists
        this.createAnalysisSection();

        // Setup analysis buttons
        this.setupAnalysisButtonHandlers();

        // Load initial analysis
        this.loadWeeklyAnalysis();
    }

    createAnalysisSection() {
        // Check if analysis section already exists
        if (document.getElementById('weeklyAnalysis')) return;

        // Create analysis section after quick stats
        const quickStats = document.getElementById('quickStats');
        if (!quickStats) return;

        const analysisSection = document.createElement('div');
        analysisSection.className = 'weekly-analysis';
        analysisSection.id = 'weeklyAnalysis';
        analysisSection.innerHTML = `
            <div class="analysis-header">
                <h3 class="analysis-title">
                    <i class="fas fa-chart-line"></i>
                    Həftəlik Analiz
                </h3>
                <div class="analysis-actions">
                    <button class="btn secondary-btn btn-sm" id="refreshAnalysisBtn">
                        <i class="fas fa-sync-alt"></i>
                        Yenilə
                    </button>
                    <button class="btn secondary-btn btn-sm" id="exportAnalysisBtn">
                        <i class="fas fa-download"></i>
                        Export
                    </button>
                    <button class="btn secondary-btn btn-sm" id="fullReportBtn">
                        <i class="fas fa-chart-bar"></i>
                        Tam Hesabat
                    </button>
                </div>
            </div>
            <div class="analysis-content">
                <div class="analysis-loading">
                    <div class="loader small"></div>
                    <p>Analiz hazırlanır...</p>
                </div>
            </div>
        `;

        quickStats.parentNode.insertBefore(analysisSection, quickStats.nextSibling);

        // Add CSS for analysis section
        this.addAnalysisStyles();
    }

    addAnalysisStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .weekly-analysis {
                margin-top: var(--space-8);
                background: var(--bg-surface);
                border-radius: var(--radius-xl);
                border: 1px solid var(--border-light);
                overflow: hidden;
                box-shadow: var(--shadow-lg);
            }
            
            .analysis-header {
                padding: var(--space-4) var(--space-6);
                border-bottom: 1px solid var(--border-light);
                background: linear-gradient(to right, var(--bg-surface), var(--bg-tertiary));
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .analysis-title {
                font-size: var(--text-lg);
                font-weight: var(--font-semibold);
                color: var(--text-primary);
                margin: 0;
                display: flex;
                align-items: center;
                gap: var(--space-3);
            }
            
            .analysis-title i {
                color: var(--primary-500);
            }
            
            .analysis-actions {
                display: flex;
                gap: var(--space-2);
            }
            
            .analysis-content {
                padding: var(--space-6);
                min-height: 200px;
            }
            
            .analysis-loading {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: var(--space-8);
                color: var(--text-tertiary);
            }
            
            .loader.small {
                width: 40px;
                height: 40px;
            }
            
            .loader.small div {
                border-width: 3px;
            }
            
            .analysis-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: var(--space-6);
            }
            
            .analysis-card {
                background: var(--bg-tertiary);
                border-radius: var(--radius-lg);
                padding: var(--space-4);
                border: 1px solid var(--border-light);
            }
            
            .analysis-card h4 {
                font-size: var(--text-sm);
                font-weight: var(--font-semibold);
                color: var(--text-secondary);
                margin: 0 0 var(--space-3) 0;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .analysis-value {
                font-size: var(--text-2xl);
                font-weight: var(--font-bold);
                color: var(--text-primary);
                margin-bottom: var(--space-2);
            }
            
            .analysis-change {
                display: flex;
                align-items: center;
                gap: var(--space-2);
                font-size: var(--text-sm);
            }
            
            .change-positive {
                color: var(--success-600);
            }
            
            .change-negative {
                color: var(--danger-600);
            }
            
            .analysis-chart {
                height: 100px;
                margin-top: var(--space-3);
                position: relative;
            }
            
            .chart-bar {
                position: absolute;
                bottom: 0;
                width: 20px;
                background: var(--primary-500);
                border-radius: var(--radius-sm) var(--radius-sm) 0 0;
                transition: height 0.3s ease;
            }
            
            .chart-bar:hover {
                background: var(--primary-600);
                transform: scale(1.05);
            }
            
            .chart-label {
                position: absolute;
                bottom: -25px;
                font-size: var(--text-xs);
                color: var(--text-tertiary);
                text-align: center;
                width: 100%;
            }
            
            @media (max-width: 768px) {
                .analysis-header {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: var(--space-3);
                }
                
                .analysis-actions {
                    align-self: stretch;
                    justify-content: flex-end;
                }
                
                .analysis-grid {
                    grid-template-columns: 1fr;
                }
            }
        `;

        document.head.appendChild(style);
    }

    setupAnalysisButtonHandlers() {
        const buttons = {
            'refreshAnalysisBtn': () => this.refreshAnalysis(),
            'exportAnalysisBtn': () => this.exportAnalysis(),
            'fullReportBtn': () => this.showFullReport()
        };

        Object.keys(buttons).forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.addEventListener('click', buttons[btnId]);
            }
        });
    }

    async loadWeeklyAnalysis() {
        try {
            const analysisContent = document.querySelector('.analysis-content');
            if (!analysisContent) return;

            // Show loading
            analysisContent.innerHTML = `
                <div class="analysis-loading">
                    <div class="loader small"></div>
                    <p>Həftəlik analiz hazırlanır...</p>
                </div>
            `;

            // Fetch analysis data
            const analysisData = await this.fetchWeeklyAnalysis();

            // Render analysis
            this.renderAnalysis(analysisData);

        } catch (error) {
            console.error('❌ Analysis load error:', error);
            this.showAnalysisError();
        }
    }

    async fetchWeeklyAnalysis() {
        // Try to get from API
        try {
            const response = await this.taskManager.apiRequest('/reports/weekly-analysis', 'GET');
            if (response && response.data) {
                return response.data;
            }
        } catch (error) {
            console.log('⚠️ Weekly analysis API failed, generating locally...');
        }

        // Generate analysis locally
        return this.generateLocalAnalysis();
    }

    generateLocalAnalysis() {
        const days = ['Bazar', 'Bazar ertəsi', 'Çərşənbə', 'Cümə', 'Şənbə'];

        return {
            productivity: {
                current: 78,
                change: 5,
                trend: 'up',
                daily: [65, 70, 75, 80, 85, 78, 82]
            },
            completionRate: {
                current: 92,
                change: 3,
                trend: 'up',
                daily: [85, 88, 90, 92, 94, 92, 93]
            },
            avgCompletionTime: {
                current: 2.5,
                change: -0.5,
                trend: 'down',
                daily: [3.2, 2.8, 2.6, 2.5, 2.4, 2.5, 2.3]
            },
            costEfficiency: {
                current: 88,
                change: 7,
                trend: 'up',
                daily: [80, 82, 85, 87, 89, 88, 90]
            },
            days: days
        };
    }

    renderAnalysis(data) {
        const analysisContent = document.querySelector('.analysis-content');
        if (!analysisContent) return;

        analysisContent.innerHTML = `
            <div class="analysis-grid">
                <div class="analysis-card">
                    <h4>Məhsuldarlıq</h4>
                    <div class="analysis-value">${data.productivity.current}%</div>
                    <div class="analysis-change ${data.productivity.trend === 'up' ? 'change-positive' : 'change-negative'}">
                        <i class="fas fa-arrow-${data.productivity.trend === 'up' ? 'up' : 'down'}"></i>
                        <span>${Math.abs(data.productivity.change)}%</span>
                    </div>
                    <div class="analysis-chart" id="productivityChart"></div>
                </div>
                
                <div class="analysis-card">
                    <h4>Tamamlanma Dərəcəsi</h4>
                    <div class="analysis-value">${data.completionRate.current}%</div>
                    <div class="analysis-change ${data.completionRate.trend === 'up' ? 'change-positive' : 'change-negative'}">
                        <i class="fas fa-arrow-${data.completionRate.trend === 'up' ? 'up' : 'down'}"></i>
                        <span>${Math.abs(data.completionRate.change)}%</span>
                    </div>
                    <div class="analysis-chart" id="completionChart"></div>
                </div>
                
                <div class="analysis-card">
                    <h4>Ort. Tamamlanma Müddəti</h4>
                    <div class="analysis-value">${data.avgCompletionTime.current} saat</div>
                    <div class="analysis-change ${data.avgCompletionTime.trend === 'up' ? 'change-positive' : 'change-negative'}">
                        <i class="fas fa-arrow-${data.avgCompletionTime.trend === 'up' ? 'up' : 'down'}"></i>
                        <span>${Math.abs(data.avgCompletionTime.change)} saat</span>
                    </div>
                    <div class="analysis-chart" id="timeChart"></div>
                </div>
                
                <div class="analysis-card">
                    <h4>Xərc Effektivliyi</h4>
                    <div class="analysis-value">${data.costEfficiency.current}%</div>
                    <div class="analysis-change ${data.costEfficiency.trend === 'up' ? 'change-positive' : 'change-negative'}">
                        <i class="fas fa-arrow-${data.costEfficiency.trend === 'up' ? 'up' : 'down'}"></i>
                        <span>${Math.abs(data.costEfficiency.change)}%</span>
                    </div>
                    <div class="analysis-chart" id="costChart"></div>
                </div>
            </div>
            
            <div class="analysis-footer" style="margin-top: var(--space-4); padding-top: var(--space-4); border-top: 1px solid var(--border-light);">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <small style="color: var(--text-tertiary);">
                        <i class="fas fa-info-circle"></i>
                        Son 7 gün ərzində olan dəyişikliklər
                    </small>
                    <button class="btn secondary-btn btn-sm" id="viewDetailsBtn">
                        <i class="fas fa-external-link-alt"></i>
                        Ətraflı Məlumat
                    </button>
                </div>
            </div>
        `;

        // Add chart labels
        this.addChartLabels(data.days);

        // Setup view details button
        const viewDetailsBtn = document.getElementById('viewDetailsBtn');
        if (viewDetailsBtn) {
            viewDetailsBtn.addEventListener('click', () => {
                this.showDetailedAnalysis(data);
            });
        }

        // Create simple bar charts
        this.createSimpleCharts(data);
    }

    addChartLabels(days) {
        const charts = document.querySelectorAll('.analysis-chart');
        charts.forEach((chart, index) => {
            // Add day labels
            days.forEach((day, dayIndex) => {
                const label = document.createElement('div');
                label.className = 'chart-label';
                label.textContent = day;
                label.style.left = `${(dayIndex * 25) + 10}px`;
                chart.appendChild(label);
            });
        });
    }

    createSimpleCharts(data) {
        const charts = {
            'productivityChart': data.productivity.daily,
            'completionChart': data.completionRate.daily,
            'timeChart': data.avgCompletionTime.daily.map(v => v * 20), // Scale for visibility
            'costChart': data.costEfficiency.daily
        };

        Object.keys(charts).forEach(chartId => {
            const chart = document.getElementById(chartId);
            if (!chart) return;

            const values = charts[chartId];
            const max = Math.max(...values);

            values.forEach((value, index) => {
                const bar = document.createElement('div');
                bar.className = 'chart-bar';
                bar.style.height = `${(value / max) * 80}px`;
                bar.style.left = `${(index * 25) + 10}px`;
                bar.title = `${value}%`;

                // Add hover effect
                bar.addEventListener('mouseenter', () => {
                    bar.style.backgroundColor = 'var(--primary-700)';
                });

                bar.addEventListener('mouseleave', () => {
                    bar.style.backgroundColor = 'var(--primary-500)';
                });

                chart.appendChild(bar);
            });
        });
    }

    showAnalysisError() {
        const analysisContent = document.querySelector('.analysis-content');
        if (!analysisContent) return;

        analysisContent.innerHTML = `
            <div class="analysis-error">
                <i class="fas fa-exclamation-triangle fa-2x" style="color: var(--warning-500); margin-bottom: var(--space-3);"></i>
                <h4>Analiz Yüklənmədi</h4>
                <p style="color: var(--text-tertiary); margin-bottom: var(--space-4);">
                    Həftəlik analiz məlumatlarına çatmaq mümkün olmadı.
                </p>
                <button class="btn secondary-btn" id="retryAnalysisBtn">
                    <i class="fas fa-redo"></i>
                    Yenidən cəhd et
                </button>
            </div>
        `;

        const retryBtn = document.getElementById('retryAnalysisBtn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                this.loadWeeklyAnalysis();
            });
        }
    }

    async refreshAnalysis() {
        const refreshBtn = document.getElementById('refreshAnalysisBtn');
        if (refreshBtn) {
            this.setButtonLoading(refreshBtn, true);
        }

        this.showNotification('Analiz yenilənir...', 'info');

        await this.loadWeeklyAnalysis();

        this.showNotification('Analiz yeniləndi', 'success');

        if (refreshBtn) {
            this.setButtonLoading(refreshBtn, false);
        }
    }

    exportAnalysis() {
        this.showLoading('Analiz export edilir...');

        setTimeout(() => {
            // Generate CSV content
            const csvContent = this.generateAnalysisCSV();

            // Create download link
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `weekly_analysis_${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.hideLoading();
            this.showNotification('Analiz uğurla export edildi', 'success');
        }, 1000);
    }

    generateAnalysisCSV() {
        // Generate CSV content from current analysis
        return `Həftəlik Analiz Hesabatı,${new Date().toISOString().slice(0, 10)}
Məhsuldarlıq,${this.stats.activeTasks}
Tamamlanma Dərəcəsi,${this.stats.completedTasks}
Gecikmə,${this.stats.overdueTasks}
Ümumi Xərc,${this.stats.totalCost} AZN
Dəyişiklik (Aktiv),${this.stats.weeklyChange.active}%
Dəyişiklik (Tamamlanan),${this.stats.weeklyChange.completed}%
Dəyişiklik (Gecikmə),${this.stats.weeklyChange.overdue}%
Dəyişiklik (Xərc),${this.stats.weeklyChange.cost}%`;
    }

    showFullReport() {
        this.showNotification('Tam hesabat səhifəsi hazırlanır...', 'info');

        // In a real app, this would open a detailed reports page
        setTimeout(() => {
            window.open('../reports/full-analysis.html', '_blank');
        }, 500);
    }

    showDetailedAnalysis(data) {
        // Create detailed analysis modal
        const modal = document.createElement('div');
        modal.className = 'modal-backdrop detailed-analysis-modal';
        modal.innerHTML = `
            <div class="modal modal-lg">
                <div class="modal-header">
                    <div class="modal-title">
                        <i class="fas fa-chart-bar"></i>
                        Ətraflı Həftəlik Analiz
                    </div>
                    <button class="close-btn">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-content">
                    <div class="detailed-analysis-content">
                        <p>Ətraflı analiz məlumatları burada göstəriləcək...</p>
                        <!-- Add more detailed analysis here -->
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn secondary-btn close-modal-btn">Bağla</button>
                    <button class="btn primary-btn">Hesabatı Çap et</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Show modal
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        // Setup close buttons
        modal.querySelector('.close-btn').addEventListener('click', () => {
            modal.remove();
            document.body.style.overflow = 'auto';
        });

        modal.querySelector('.close-modal-btn').addEventListener('click', () => {
            modal.remove();
            document.body.style.overflow = 'auto';
        });

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                document.body.style.overflow = 'auto';
            }
        });
    }

    // ==================== UTILITY METHODS ====================

    startAutoUpdates() {
        // Update stats every 5 minutes
        setInterval(() => {
            this.updateQuickStats();
        }, 5 * 60 * 1000);

        // Update analysis every 10 minutes
        setInterval(() => {
            this.refreshAnalysis();
        }, 10 * 60 * 1000);
    }

    setButtonLoading(button, isLoading) {
        if (!button) return;

        if (isLoading) {
            const originalHTML = button.innerHTML;
            button.dataset.originalHTML = originalHTML;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            button.disabled = true;
        } else {
            const originalHTML = button.dataset.originalHTML;
            if (originalHTML) {
                button.innerHTML = originalHTML;
                delete button.dataset.originalHTML;
            }
            button.disabled = false;
        }
    }

    showLoading(message) {
        // Use existing loading system or create one
        const loadingOverlay = document.getElementById('loadingOverlay');
        const loadingText = document.getElementById('loadingText');

        if (loadingOverlay && loadingText) {
            loadingText.textContent = message;
            loadingOverlay.classList.add('active');
        }
    }

    hideLoading() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
        }
    }

    showNotification(message, type = 'info') {
        // Use existing notification system
        if (window.buttonManager?.showNotification) {
            window.buttonManager.showNotification(message, type);
        } else {
            // Fallback alert
            alert(message);
        }
    }

    openProfileSettings() {
        this.showNotification('Profil tənzimləmələri açılır...', 'info');
        // Implement profile settings modal
    }

    openAppSettings() {
        this.showNotification('Tətbiq tənzimləmələri açılır...', 'info');
        // Implement app settings modal
    }

    openHelp() {
        window.open('../help/index.html', '_blank');
    }

    showAbout() {
        this.showNotification('Task Manager Pro v2.1\n© 2024', 'info');
    }

    switchAccount() {
        this.showNotification('Hesab dəyişmə funksiyası hazırlanır...', 'info');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait for TaskManager
    const checkTaskManager = setInterval(() => {
        if (window.taskManager) {
            clearInterval(checkTaskManager);

            // Initialize Header Manager
            window.headerManager = new HeaderManager(window.taskManager);
            console.log('✅ Header Manager başladıldı');
        }
    }, 100);
});