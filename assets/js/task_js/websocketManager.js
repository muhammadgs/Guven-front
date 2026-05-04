// websocketManager.js - TAM VERSİYA
class WebSocketManager {
    constructor() {
        this.socket = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 3000;
        this.isConnected = false;
        this.userId = null;
        this.companyId = null;
        this.listeners = {
            'task_notification': [],
            'system_message': [],
            'user_info': [],
            'connection': [],
            '*': [] // Bütün mesajlar üçün
        };

        this.pingInterval = null;
        this.lastPingTime = null;

        console.log('🔌 WebSocketManager yaradıldı');
    }

    // ==================== CONNECTION MANAGEMENT ====================
    connect(userId, companyId) {
        if (this.isConnected && this.socket) {
            console.log('⚠️ WebSocket artıq qoşulub');
            return;
        }

        this.userId = userId;
        this.companyId = companyId;

        // WebSocket URL qur
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const wsUrl = `${protocol}//${host}/ws/notifications/${userId}/${companyId}`;

        console.log(`🔌 WebSocket qoşulur: ${wsUrl}`);

        try {
            this.socket = new WebSocket(wsUrl);
            this.setupEventHandlers();
        } catch (error) {
            console.error('❌ WebSocket yaradıla bilmədi:', error);
            this.scheduleReconnect();
        }
    }

    setupEventHandlers() {
        this.socket.onopen = () => {
            console.log('✅ WebSocket qoşuldu');
            this.isConnected = true;
            this.reconnectAttempts = 0;

            // Ping interval başlat
            this.startPingInterval();

            // Qoşulduqdan sonra məlumatları tələb et
            this.send({
                type: 'get_info'
            });

            // Connection listener-larını çağır
            this.trigger('connection', {
                type: 'connection',
                message: 'Real-time bildirişlər aktivdir',
                timestamp: new Date().toISOString()
            });
        };

        this.socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('📨 WebSocket mesajı alındı:', data);
                this.handleMessage(data);
            } catch (error) {
                console.error('WebSocket mesaj parse xətası:', error);
            }
        };

        this.socket.onclose = (event) => {
            console.log('❌ WebSocket bağlandı:', event.code, event.reason);
            this.isConnected = false;
            this.stopPingInterval();
            this.handleDisconnect(event);
        };

        this.socket.onerror = (error) => {
            console.error('WebSocket xətası:', error);
        };
    }

    handleMessage(data) {
        const { type } = data;

        // Ping cavabı
        if (type === 'pong') {
            this.lastPingTime = Date.now();
            console.log('🏓 Pong alındı');
            return;
        }

        // Dinləyiciləri çağır
        if (this.listeners[type]) {
            this.listeners[type].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Listener xətası:', error);
                }
            });
        }

        // Ümumi dinləyicilər
        this.listeners['*']?.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error('General listener error:', error);
            }
        });
    }

    handleDisconnect(event) {
        // Clean shutdown deyilsə, yenidən qoşulmağı cəhd et
        if (event.code !== 1000 && event.code !== 1001) {
            this.scheduleReconnect();
        }
    }

    scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('❌ Maksimum yenidən qoşulma cəhdi çatdı');
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * this.reconnectAttempts;

        console.log(`🔄 ${delay}ms sonra yenidən qoşulma cəhdi ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

        setTimeout(() => {
            if (!this.isConnected) {
                this.connect(this.userId, this.companyId);
            }
        }, delay);
    }

    // ==================== PING/PONG MANAGEMENT ====================
    startPingInterval() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
        }

        this.pingInterval = setInterval(() => {
            if (this.isConnected && this.socket.readyState === WebSocket.OPEN) {
                this.send({
                    type: 'ping',
                    timestamp: Date.now()
                });
                this.lastPingTime = Date.now();
                console.log('🏓 Ping göndərildi');
            }
        }, 30000); // 30 saniyədə bir

        // Connection health check
        setInterval(() => {
            if (this.lastPingTime && Date.now() - this.lastPingTime > 60000) {
                console.warn('⚠️ Ping cavabı alınmadı, connection problemi');
            }
        }, 60000);
    }

    stopPingInterval() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    // ==================== MESSAGE SENDING ====================
    send(data) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            try {
                this.socket.send(JSON.stringify(data));
                console.log('📤 WebSocket mesajı göndərildi:', data);
                return true;
            } catch (error) {
                console.error('❌ Mesaj göndərilərkən xəta:', error);
                return false;
            }
        } else {
            console.warn('⚠️ WebSocket bağlıdır, mesaj göndərilə bilməz');
            return false;
        }
    }

    sendPing() {
        return this.send({ type: 'ping' });
    }

    // ==================== EVENT LISTENERS ====================
    on(eventType, callback) {
        if (!this.listeners[eventType]) {
            this.listeners[eventType] = [];
        }
        this.listeners[eventType].push(callback);
        console.log(`🎯 Listener əlavə edildi: ${eventType}`);
    }

    off(eventType, callback) {
        if (this.listeners[eventType]) {
            const index = this.listeners[eventType].indexOf(callback);
            if (index > -1) {
                this.listeners[eventType].splice(index, 1);
                console.log(`🗑️ Listener silindi: ${eventType}`);
            }
        }
    }

    trigger(eventType, data) {
        if (this.listeners[eventType]) {
            this.listeners[eventType].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Trigger xətası:', error);
                }
            });
        }
    }

    // ==================== CONNECTION CONTROL ====================
    disconnect() {
        console.log('🔌 WebSocket bağlanır...');

        this.stopPingInterval();

        if (this.socket) {
            this.socket.close(1000, 'Normal shutdown');
            this.socket = null;
        }

        this.isConnected = false;
        this.listeners = {
            'task_notification': [],
            'system_message': [],
            'user_info': [],
            'connection': [],
            '*': []
        };
    }

    reconnect() {
        console.log('🔄 WebSocket yenidən qoşulur...');
        this.disconnect();

        if (this.userId && this.companyId) {
            setTimeout(() => {
                this.connect(this.userId, this.companyId);
            }, 1000);
        }
    }

    // ==================== STATUS & INFO ====================
    getStatus() {
        return {
            isConnected: this.isConnected,
            reconnectAttempts: this.reconnectAttempts,
            userId: this.userId,
            companyId: this.companyId,
            readyState: this.socket ? this.socket.readyState : null,
            lastPingTime: this.lastPingTime
        };
    }

    isReady() {
        return this.isConnected && this.socket && this.socket.readyState === WebSocket.OPEN;
    }

    // ==================== TASK NOTIFICATION HELPERS ====================
    sendTaskNotification(taskData, eventType, currentUser = null) {
        if (!this.isReady()) {
            console.warn('⚠️ WebSocket bağlıdır, bildiriş göndərilə bilməz');
            return false;
        }

        const notification = {
            type: 'task_notification',
            event: eventType,
            task: taskData,
            from_user: currentUser ? {
                id: currentUser.id,
                name: currentUser.name || currentUser.fullName || 'Anonim'
            } : null,
            timestamp: new Date().toISOString()
        };

        return this.send(notification);
    }

    sendSystemMessage(companyId, message, messageType = 'info') {
        if (!this.isReady()) {
            console.warn('⚠️ WebSocket bağlıdır, sistem mesajı göndərilə bilməz');
            return false;
        }

        const systemMessage = {
            type: 'system_message',
            message: message,
            message_type: messageType,
            timestamp: new Date().toISOString(),
            company_id: companyId
        };

        return this.send(systemMessage);
    }
}

// ==================== SIMPLE WEB SOCKET MANAGER (Fallback) ====================
class SimpleWebSocketManager {
    constructor() {
        this.socket = null;
        this.listeners = {};
        this.isConnected = false;
        console.log('🔌 SimpleWebSocketManager yaradıldı');
    }

    connect(userId, companyId) {
        try {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.host;
            const wsUrl = `${protocol}//${host}/ws/notifications/${userId}/${companyId}`;

            console.log(`🔌 SimpleWebSocket qoşulur: ${wsUrl}`);

            this.socket = new WebSocket(wsUrl);

            this.socket.onopen = () => {
                console.log('✅ SimpleWebSocket qoşuldu');
                this.isConnected = true;
                this.trigger('connection', { type: 'connection', message: 'Connected' });
            };

            this.socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.trigger(data.type || '*', data);
                } catch (error) {
                    console.error('SimpleWebSocket parse error:', error);
                }
            };

            this.socket.onclose = () => {
                console.log('❌ SimpleWebSocket bağlandı');
                this.isConnected = false;
            };

            this.socket.onerror = (error) => {
                console.error('SimpleWebSocket error:', error);
            };

        } catch (error) {
            console.error('SimpleWebSocket connection error:', error);
        }
    }

    on(eventType, callback) {
        if (!this.listeners[eventType]) {
            this.listeners[eventType] = [];
        }
        this.listeners[eventType].push(callback);
    }

    trigger(eventType, data) {
        if (this.listeners[eventType]) {
            this.listeners[eventType].forEach(callback => callback(data));
        }
        if (this.listeners['*']) {
            this.listeners['*'].forEach(callback => callback(data));
        }
    }

    send(data) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(data));
            return true;
        }
        return false;
    }

    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        this.isConnected = false;
    }
}

// ==================== GLOBAL INSTANCE & HELPER FUNCTIONS ====================

// Global instance yarat
let webSocketManager = null;

function getWebSocketManager() {
    if (!webSocketManager) {
        // Full featured WebSocketManager istifadə et
        webSocketManager = new WebSocketManager();
        console.log('🔌 WebSocketManager instance yaradıldı');
    }
    return webSocketManager;
}

function initWebSocket(userId, companyId) {
    try {
        const manager = getWebSocketManager();
        manager.connect(userId, companyId);
        return manager;
    } catch (error) {
        console.error('WebSocket init xətası:', error);
        return null;
    }
}

// TableManager üçün helper funksiyalar
function setupWebSocketForTableManager() {
    if (!window.taskManager || !window.taskManager.userData) {
        console.warn('⚠️ taskManager və ya userData yoxdur');
        return;
    }

    const userData = window.taskManager.userData;
    const userId = userData.userId || userData.id;
    const companyId = userData.companyId || userData.company_id;

    if (!userId || !companyId) {
        console.warn('⚠️ userId və ya companyId yoxdur');
        return;
    }

    console.log(`👤 WebSocket üçün user: ${userId}, company: ${companyId}`);

    const wsManager = initWebSocket(userId, companyId);

    if (wsManager) {
        // Task bildirişləri üçün listener
        wsManager.on('task_notification', (data) => {
            console.log('🔔 WebSocket task bildirişi:', data);

            // TableManager-ə göndər
            if (window.TableManager && window.TableManager.handleWebSocketNotification) {
                window.TableManager.handleWebSocketNotification(data);
            }

            // SoundManager-ə göndər
            if (window.SoundManager && window.SoundManager.playForWebSocketEvent) {
                window.SoundManager.playForWebSocketEvent(data.event);
            }
        });

        // System mesajları üçün listener
        wsManager.on('system_message', (data) => {
            console.log('🔔 WebSocket system mesajı:', data);

            if (window.TableManager && window.TableManager.handleSystemMessage) {
                window.TableManager.handleSystemMessage(data);
            }
        });

        // Connection status listener
        wsManager.on('connection', (data) => {
            console.log('🔌 WebSocket connection status:', data);
        });

        console.log('✅ WebSocket TableManager üçün quruldu');
    }
}

// ==================== GLOBAL EXPORT ====================

if (typeof window !== 'undefined') {
    // Full featured manager
    window.WebSocketManager = WebSocketManager;

    // Simple manager (fallback)
    window.SimpleWebSocketManager = SimpleWebSocketManager;

    // Global instance
    window.webSocketManager = getWebSocketManager();
    window.wsManager = window.webSocketManager; // Alias

    // Helper functions
    window.initWebSocket = initWebSocket;
    window.getWebSocketManager = getWebSocketManager;
    window.setupWebSocketForTableManager = setupWebSocketForTableManager;

    console.log('🔌 WebSocketManager global olaraq export edildi');
}

// Auto setup when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // 3 saniyə gözlə ki, taskManager yüklənsin
    setTimeout(() => {
        setupWebSocketForTableManager();
    }, 3000);
});

console.log('🔌 WebSocketManager script loaded');