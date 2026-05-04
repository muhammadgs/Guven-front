// user-event-manager.js - PROFESSIONEL USER EVENT SİSTEMİ
(function() {
    class UserEventManager {
        constructor(diagramTool) {
            this.diagramTool = diagramTool;
            this.eventLog = [];
            this.maxEvents = 500;
            this.listeners = new Map();
            this.eventStats = {
                total: 0,
                byType: {},
                errors: 0
            };
            this.sessionStartTime = Date.now();
            this.isEnabled = true;

            console.log('🎯 UserEventManager initialized');
        }

        // ==================== EVENT TYPES ====================
        static EVENTS = {
            // Shape operations
            SHAPE_CREATED: 'shape:created',
            SHAPE_DELETED: 'shape:deleted',
            SHAPE_MODIFIED: 'shape:modified',
            SHAPE_MOVED: 'shape:moved',
            SHAPE_RESIZED: 'shape:resized',
            SHAPE_SELECTED: 'shape:selected',
            SHAPE_DESELECTED: 'shape:deselected',
            SHAPE_TEXT_CHANGED: 'shape:text_changed',

            // Connection operations
            CONNECTION_CREATED: 'connection:created',
            CONNECTION_DELETED: 'connection:deleted',
            CONNECTION_MODIFIED: 'connection:modified',

            // Clipboard operations
            COPY: 'clipboard:copy',
            PASTE: 'clipboard:paste',
            CUT: 'clipboard:cut',

            // History operations
            UNDO: 'history:undo',
            REDO: 'history:redo',
            SAVE_CHECKPOINT: 'history:save_checkpoint',

            // File operations
            DIAGRAM_CREATED: 'diagram:created',
            DIAGRAM_LOADED: 'diagram:loaded',
            DIAGRAM_SAVED: 'diagram:saved',
            DIAGRAM_EXPORTED: 'diagram:exported',

            // Tool operations
            TOOL_CHANGED: 'tool:changed',
            ZOOM_CHANGED: 'zoom:changed',
            PAN: 'view:pan',

            // UI operations
            SIDEBAR_TOGGLED: 'ui:sidebar_toggled',
            MODAL_OPENED: 'ui:modal_opened',
            MODAL_CLOSED: 'ui:modal_closed',

            // Session events
            SESSION_START: 'session:start',
            SESSION_END: 'session:end',
            ERROR_OCCURRED: 'error:occurred'
        };

        // ==================== EVENT FIRING ====================
        fireEvent(eventType, eventData = {}) {
            if (!this.isEnabled) return;

            try {
                const event = {
                    type: eventType,
                    timestamp: Date.now(),
                    sessionTime: Date.now() - this.sessionStartTime,
                    data: eventData,
                    userId: this.getUserId(),
                    diagramId: this.diagramTool.currentDiagramId || 'new'
                };

                // Event log-a əlavə et
                this.addToEventLog(event);

                // Statistika güncəllə
                this.updateStats(eventType);

                // Listeners-ə gönder
                this.notifyListeners(event);

                // Console-a çap et (debug mode)
                this.logEvent(event);

                return event;

            } catch (error) {
                console.error('❌ Event firing error:', error);
                this.fireEvent(UserEventManager.EVENTS.ERROR_OCCURRED, {
                    error: error.message,
                    originalEvent: eventType
                });
            }
        }

        // ==================== EVENT LOG ====================
        addToEventLog(event) {
            this.eventLog.push(event);

            // Max log size kontrolu
            if (this.eventLog.length > this.maxEvents) {
                const removed = this.eventLog.shift();
                console.log(`📊 Event log trimmed (removed oldest: ${removed.type})`);
            }
        }

        // ==================== LISTENERS ====================
        addEventListener(eventType, callback) {
            if (!this.listeners.has(eventType)) {
                this.listeners.set(eventType, []);
            }

            this.listeners.get(eventType).push({
                callback,
                id: Math.random()
            });

            console.log(`👂 Listener added for: ${eventType}`);

            // Listener ID döndür (silmek üçün)
            return this.listeners.get(eventType)[this.listeners.get(eventType).length - 1].id;
        }

        removeEventListener(eventType, listenerId) {
            if (!this.listeners.has(eventType)) return false;

            const listeners = this.listeners.get(eventType);
            const index = listeners.findIndex(l => l.id === listenerId);

            if (index > -1) {
                listeners.splice(index, 1);
                console.log(`🔕 Listener removed for: ${eventType}`);
                return true;
            }

            return false;
        }

        notifyListeners(event) {
            // Specific event listeners
            if (this.listeners.has(event.type)) {
                this.listeners.get(event.type).forEach(listener => {
                    try {
                        listener.callback(event);
                    } catch (error) {
                        console.error(`❌ Listener error for ${event.type}:`, error);
                    }
                });
            }

            // Wildcard listeners (all events)
            if (this.listeners.has('*')) {
                this.listeners.get('*').forEach(listener => {
                    try {
                        listener.callback(event);
                    } catch (error) {
                        console.error('❌ Wildcard listener error:', error);
                    }
                });
            }
        }

        // ==================== SHAPE EVENTS ====================
        fireShapeCreated(shape) {
            this.fireEvent(UserEventManager.EVENTS.SHAPE_CREATED, {
                shapeId: shape.id,
                shapeType: shape.type,
                position: { x: shape.x, y: shape.y },
                size: { width: shape.width, height: shape.height }
            });
        }

        fireShapeDeleted(shapes) {
            const shapeIds = Array.isArray(shapes) ? shapes.map(s => s.id) : [shapes.id];
            this.fireEvent(UserEventManager.EVENTS.SHAPE_DELETED, {
                shapeIds,
                count: shapeIds.length
            });
        }

        fireShapeModified(shape, changes) {
            this.fireEvent(UserEventManager.EVENTS.SHAPE_MODIFIED, {
                shapeId: shape.id,
                shapeType: shape.type,
                changes: changes // {field: oldValue → newValue}
            });
        }

        fireShapeMoved(shape, oldPos, newPos) {
            this.fireEvent(UserEventManager.EVENTS.SHAPE_MOVED, {
                shapeId: shape.id,
                oldPosition: oldPos,
                newPosition: newPos,
                distance: {
                    x: newPos.x - oldPos.x,
                    y: newPos.y - oldPos.y
                }
            });
        }

        fireShapeResized(shape, oldSize, newSize) {
            this.fireEvent(UserEventManager.EVENTS.SHAPE_RESIZED, {
                shapeId: shape.id,
                oldSize,
                newSize,
                percentChange: {
                    width: ((newSize.width - oldSize.width) / oldSize.width * 100).toFixed(2),
                    height: ((newSize.height - oldSize.height) / oldSize.height * 100).toFixed(2)
                }
            });
        }

        fireShapeSelected(shapeIds) {
            this.fireEvent(UserEventManager.EVENTS.SHAPE_SELECTED, {
                shapeIds: Array.isArray(shapeIds) ? shapeIds : [shapeIds],
                count: Array.isArray(shapeIds) ? shapeIds.length : 1
            });
        }

        fireShapeDeselected(shapeIds) {
            this.fireEvent(UserEventManager.EVENTS.SHAPE_DESELECTED, {
                shapeIds: Array.isArray(shapeIds) ? shapeIds : [shapeIds],
                count: Array.isArray(shapeIds) ? shapeIds.length : 1
            });
        }

        fireShapeTextChanged(shape, oldText, newText) {
            this.fireEvent(UserEventManager.EVENTS.SHAPE_TEXT_CHANGED, {
                shapeId: shape.id,
                oldText: oldText || '',
                newText: newText || '',
                charCount: (newText || '').length,
                added: newText.length - (oldText || '').length
            });
        }

        // ==================== CONNECTION EVENTS ====================
        fireConnectionCreated(connection) {
            this.fireEvent(UserEventManager.EVENTS.CONNECTION_CREATED, {
                connectionId: connection.id,
                from: connection.from,
                to: connection.to,
                type: connection.type,
                connectionType: connection.type // line, curve, elbow
            });
        }

        fireConnectionDeleted(connections) {
            const connIds = Array.isArray(connections) ? connections.map(c => c.id) : [connections.id];
            this.fireEvent(UserEventManager.EVENTS.CONNECTION_DELETED, {
                connectionIds: connIds,
                count: connIds.length
            });
        }

        fireConnectionModified(connection, changes) {
            this.fireEvent(UserEventManager.EVENTS.CONNECTION_MODIFIED, {
                connectionId: connection.id,
                changes: changes
            });
        }

        // ==================== CLIPBOARD EVENTS ====================
        fireClipboardCopy(shapeCount, connectionCount) {
            this.fireEvent(UserEventManager.EVENTS.COPY, {
                shapeCount,
                connectionCount,
                totalItems: shapeCount + connectionCount
            });
        }

        fireClipboardPaste(shapeCount, connectionCount) {
            this.fireEvent(UserEventManager.EVENTS.PASTE, {
                shapeCount,
                connectionCount,
                totalItems: shapeCount + connectionCount
            });
        }

        fireClipboardCut(shapeCount, connectionCount) {
            this.fireEvent(UserEventManager.EVENTS.CUT, {
                shapeCount,
                connectionCount,
                totalItems: shapeCount + connectionCount
            });
        }

        // ==================== HISTORY EVENTS ====================
        fireUndo(itemsRestored) {
            this.fireEvent(UserEventManager.EVENTS.UNDO, {
                itemsRestored: itemsRestored || 0
            });
        }

        fireRedo(itemsRestored) {
            this.fireEvent(UserEventManager.EVENTS.REDO, {
                itemsRestored: itemsRestored || 0
            });
        }

        saveCheckpoint(name) {
            this.fireEvent(UserEventManager.EVENTS.SAVE_CHECKPOINT, {
                checkpointName: name,
                shapeCount: this.diagramTool.shapes.length,
                connectionCount: this.diagramTool.connections.length
            });
        }

        // ==================== FILE EVENTS ====================
        fireDiagramCreated(name) {
            this.fireEvent(UserEventManager.EVENTS.DIAGRAM_CREATED, {
                diagramName: name,
                timestamp: new Date().toISOString()
            });
        }

        fireDiagramLoaded(id, name, shapeCount) {
            this.fireEvent(UserEventManager.EVENTS.DIAGRAM_LOADED, {
                diagramId: id,
                diagramName: name,
                shapeCount: shapeCount,
                connectionCount: this.diagramTool.connections.length
            });
        }

        fireDiagramSaved(id, name) {
            this.fireEvent(UserEventManager.EVENTS.DIAGRAM_SAVED, {
                diagramId: id,
                diagramName: name,
                shapeCount: this.diagramTool.shapes.length,
                connectionCount: this.diagramTool.connections.length,
                timestamp: new Date().toISOString()
            });
        }

        fireDiagramExported(format, shapeCount) {
            this.fireEvent(UserEventManager.EVENTS.DIAGRAM_EXPORTED, {
                format: format, // png, svg, json
                shapeCount: shapeCount,
                timestamp: new Date().toISOString()
            });
        }

        // ==================== TOOL EVENTS ====================
        fireToolChanged(oldTool, newTool) {
            this.fireEvent(UserEventManager.EVENTS.TOOL_CHANGED, {
                oldTool,
                newTool,
                timestamp: new Date().toISOString()
            });
        }

        fireZoomChanged(oldZoom, newZoom) {
            this.fireEvent(UserEventManager.EVENTS.ZOOM_CHANGED, {
                oldZoom: Math.round(oldZoom * 100) + '%',
                newZoom: Math.round(newZoom * 100) + '%',
                zoomLevel: newZoom,
                change: ((newZoom - oldZoom) * 100).toFixed(2) + '%'
            });
        }

        firePan(offset) {
            this.fireEvent(UserEventManager.EVENTS.PAN, {
                offset: offset,
                distance: Math.sqrt(offset.x ** 2 + offset.y ** 2).toFixed(2)
            });
        }

        // ==================== UI EVENTS ====================
        fireSidebarToggled(isOpen) {
            this.fireEvent(UserEventManager.EVENTS.SIDEBAR_TOGGLED, {
                isOpen,
                state: isOpen ? 'opened' : 'closed'
            });
        }

        fireModalOpened(modalType) {
            this.fireEvent(UserEventManager.EVENTS.MODAL_OPENED, {
                modalType: modalType, // text, export, load, etc
                timestamp: new Date().toISOString()
            });
        }

        fireModalClosed(modalType) {
            this.fireEvent(UserEventManager.EVENTS.MODAL_CLOSED, {
                modalType: modalType,
                timestamp: new Date().toISOString()
            });
        }

        // ==================== SESSION EVENTS ====================
        fireSessionStart() {
            this.fireEvent(UserEventManager.EVENTS.SESSION_START, {
                sessionStartTime: new Date().toISOString(),
                userAgent: navigator.userAgent,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            });
        }

        fireSessionEnd() {
            const sessionDuration = Date.now() - this.sessionStartTime;
            this.fireEvent(UserEventManager.EVENTS.SESSION_END, {
                sessionDuration: sessionDuration,
                durationFormatted: this.formatDuration(sessionDuration),
                totalEvents: this.eventLog.length,
                eventStats: this.eventStats
            });
        }

        // ==================== ERROR HANDLING ====================
        fireError(error, context = {}) {
            this.eventStats.errors++;
            this.fireEvent(UserEventManager.EVENTS.ERROR_OCCURRED, {
                errorMessage: error.message || String(error),
                errorStack: error.stack,
                context: context,
                timestamp: new Date().toISOString()
            });
        }

        // ==================== STATISTICS ====================
        updateStats(eventType) {
            this.eventStats.total++;

            if (!this.eventStats.byType[eventType]) {
                this.eventStats.byType[eventType] = 0;
            }

            this.eventStats.byType[eventType]++;
        }

        getStats() {
            return {
                total: this.eventStats.total,
                byType: this.eventStats.byType,
                errors: this.eventStats.errors,
                topEvents: this.getTopEvents(5),
                sessionDuration: this.getSessionDuration(),
                averageEventFrequency: this.getEventFrequency()
            };
        }

        getTopEvents(limit = 5) {
            return Object.entries(this.eventStats.byType)
                .sort((a, b) => b[1] - a[1])
                .slice(0, limit)
                .reduce((acc, [event, count]) => {
                    acc[event] = count;
                    return acc;
                }, {});
        }

        getSessionDuration() {
            const duration = Date.now() - this.sessionStartTime;
            return this.formatDuration(duration);
        }

        getEventFrequency() {
            const duration = Date.now() - this.sessionStartTime;
            const frequencyPerMinute = (this.eventStats.total / (duration / 60000)).toFixed(2);
            return {
                eventsPerMinute: frequencyPerMinute,
                eventsPerSecond: (frequencyPerMinute / 60).toFixed(2)
            };
        }

        // ==================== QUERYING ====================
        getEventsByType(eventType) {
            return this.eventLog.filter(e => e.type === eventType);
        }

        getEventsByTimeRange(startTime, endTime) {
            return this.eventLog.filter(e =>
                e.timestamp >= startTime && e.timestamp <= endTime
            );
        }

        getEventsByShape(shapeId) {
            return this.eventLog.filter(e =>
                e.data.shapeId === shapeId || e.data.shapeIds?.includes(shapeId)
            );
        }

        getRecentEvents(count = 10) {
            return this.eventLog.slice(-count).reverse();
        }

        // ==================== LOGGING ====================
        logEvent(event) {
            if (process.env.DEBUG_EVENTS || false) {
                const icon = this.getEventIcon(event.type);
                console.log(`${icon} [${event.timestamp}] ${event.type}`, event.data);
            }
        }

        getEventIcon(eventType) {
            const icons = {
                'shape:created': '✨',
                'shape:deleted': '🗑️',
                'shape:modified': '✏️',
                'shape:moved': '📍',
                'shape:resized': '📐',
                'shape:selected': '👆',
                'connection:created': '🔗',
                'clipboard:copy': '📋',
                'clipboard:paste': '📌',
                'history:undo': '↩️',
                'history:redo': '↪️',
                'diagram:saved': '💾',
                'diagram:loaded': '📂',
                'tool:changed': '🔧',
                'zoom:changed': '🔍',
                'error:occurred': '❌'
            };

            return icons[eventType] || '📌';
        }

        // ==================== EXPORT ====================
        exportEventLog(format = 'json') {
            if (format === 'json') {
                return JSON.stringify(this.eventLog, null, 2);
            }

            if (format === 'csv') {
                let csv = 'Timestamp,Type,User,DiagramID,Data\n';
                this.eventLog.forEach(event => {
                    csv += `"${event.timestamp}","${event.type}","${event.userId}","${event.diagramId}","${JSON.stringify(event.data)}"\n`;
                });
                return csv;
            }

            return this.eventLog;
        }

        downloadEventLog(filename = 'event-log.json') {
            const content = this.exportEventLog('json');
            const blob = new Blob([content], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            console.log(`📥 Event log downloaded: ${filename}`);
        }

        // ==================== UTILITIES ====================
        getUserId() {
            // Əgər user ID local storage-da varsa, onu istifadə et
            return localStorage.getItem('userId') || 'anonymous_' + Date.now();
        }

        formatDuration(ms) {
            const seconds = Math.floor((ms / 1000) % 60);
            const minutes = Math.floor((ms / (1000 * 60)) % 60);
            const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);

            if (hours > 0) {
                return `${hours}h ${minutes}m ${seconds}s`;
            }
            if (minutes > 0) {
                return `${minutes}m ${seconds}s`;
            }
            return `${seconds}s`;
        }

        clearEventLog() {
            const count = this.eventLog.length;
            this.eventLog = [];
            console.log(`🗑️ Event log cleared (${count} events removed)`);
        }

        // ==================== ENABLE/DISABLE ====================
        enable() {
            this.isEnabled = true;
            console.log('✅ Event tracking enabled');
        }

        disable() {
            this.isEnabled = false;
            console.log('❌ Event tracking disabled');
        }

        // ==================== DEBUG ====================
        printStats() {
            console.group('📊 Event Statistics');
            console.log('Total Events:', this.eventStats.total);
            console.log('Errors:', this.eventStats.errors);
            console.log('Session Duration:', this.getSessionDuration());
            console.log('Frequency:', this.getEventFrequency());
            console.log('Top Events:', this.getTopEvents());
            console.groupEnd();
        }

        printRecentEvents() {
            console.group('📋 Recent Events');
            this.getRecentEvents(10).forEach(event => {
                console.log(`${event.type} (${event.timestamp}):`, event.data);
            });
            console.groupEnd();
        }

        printFullLog() {
            console.group('📝 Full Event Log');
            console.table(this.eventLog.map(e => ({
                Type: e.type,
                Time: new Date(e.timestamp).toLocaleTimeString(),
                Data: JSON.stringify(e.data)
            })));
            console.groupEnd();
        }

        // ==================== UI COMPONENTS ====================

        // Toast Notification göstər
        showNotification(message, type = 'info', duration = 3000) {
            const toast = document.createElement('div');
            const toastId = 'toast_' + Date.now();
            toast.id = toastId;
            toast.className = `flowdraw-toast toast-${type}`;

            const icon = this.getNotificationIcon(type);

            toast.innerHTML = `
                <div class="toast-content">
                    <span class="toast-icon">${icon}</span>
                    <span class="toast-message">${message}</span>
                    <button class="toast-close" onclick="document.getElementById('${toastId}').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;

            // CSS əlavə et
            this.ensureToastStyles();

            document.body.appendChild(toast);

            // Auto remove
            setTimeout(() => {
                if (document.getElementById(toastId)) {
                    toast.classList.add('toast-exit');
                    setTimeout(() => toast.remove(), 300);
                }
            }, duration);

            console.log(`🔔 Notification: ${message}`);
        }

        getNotificationIcon(type) {
            const icons = {
                'success': '✅',
                'error': '❌',
                'warning': '⚠️',
                'info': 'ℹ️'
            };
            return icons[type] || 'ℹ️';
        }

        // Event Log Panel yaratır
        createEventLogPanel() {
            const panel = document.createElement('div');
            panel.className = 'flowdraw-event-panel';
            panel.id = 'eventLogPanel';

            panel.innerHTML = `
                <div class="event-panel-header">
                    <h3>📋 Event Log</h3>
                    <div class="event-panel-controls">
                        <button class="event-btn" id="refreshEventBtn" title="Refresh">
                            <i class="fas fa-sync-alt"></i>
                        </button>
                        <button class="event-btn" id="clearEventBtn" title="Clear">
                            <i class="fas fa-trash"></i>
                        </button>
                        <button class="event-btn" id="downloadEventBtn" title="Download">
                            <i class="fas fa-download"></i>
                        </button>
                        <button class="event-btn" id="toggleEventBtn" title="Toggle">
                            <i class="fas fa-chevron-down"></i>
                        </button>
                    </div>
                </div>
                <div class="event-panel-content" id="eventPanelContent">
                    <div class="event-loading">Loading events...</div>
                </div>
            `;

            // Button event listeners
            setTimeout(() => {
                document.getElementById('refreshEventBtn')?.addEventListener('click',
                    () => this.refreshEventLog());
                document.getElementById('clearEventBtn')?.addEventListener('click',
                    () => this.clearEventLog());
                document.getElementById('downloadEventBtn')?.addEventListener('click',
                    () => this.downloadEventLog());
                document.getElementById('toggleEventBtn')?.addEventListener('click',
                    (e) => this.toggleEventPanel(e));
            }, 100);

            this.ensureEventPanelStyles();
            return panel;
        }

        refreshEventLog() {
            const content = document.getElementById('eventPanelContent');
            if (!content) return;

            const recent = this.getRecentEvents(20);
            let html = '<div class="event-list">';

            recent.forEach(event => {
                const time = new Date(event.timestamp).toLocaleTimeString();
                const icon = this.getEventIcon(event.type);
                const summary = this.getEventSummary(event);

                html += `
                    <div class="event-item">
                        <span class="event-time">${time}</span>
                        <span class="event-icon">${icon}</span>
                        <span class="event-type">${event.type}</span>
                        <span class="event-summary">${summary}</span>
                    </div>
                `;
            });

            html += '</div>';
            content.innerHTML = html;
        }

        toggleEventPanel(e) {
            const content = document.getElementById('eventPanelContent');
            const btn = e.target.closest('.event-btn');

            if (content) {
                content.classList.toggle('hidden');
                btn.classList.toggle('rotated');
            }
        }

        getEventSummary(event) {
            switch(event.type) {
                case 'shape:created': return `Created ${event.data.shapeType}`;
                case 'shape:deleted': return `Deleted ${event.data.count} shape(s)`;
                case 'shape:moved': return `Moved shape`;
                case 'shape:resized': return `Resized ${event.data.percentChange.width}%`;
                case 'clipboard:copy': return `Copied ${event.data.totalItems} items`;
                case 'clipboard:paste': return `Pasted ${event.data.totalItems} items`;
                case 'diagram:saved': return `Saved "${event.data.diagramName}"`;
                case 'zoom:changed': return `Zoom ${event.data.newZoom}`;
                default: return event.type;
            }
        }

        // Activity Feed göstər
        createActivityFeed() {
            const feed = document.createElement('div');
            feed.className = 'flowdraw-activity-feed';
            feed.id = 'activityFeed';

            feed.innerHTML = `
                <div class="activity-header">
                    <h3>⚡ Activity Feed</h3>
                </div>
                <div class="activity-content" id="activityContent">
                    <div class="activity-empty">No activity yet</div>
                </div>
            `;

            this.ensureActivityFeedStyles();
            return feed;
        }

        addActivityItem(message, type = 'default') {
            const content = document.getElementById('activityContent');
            if (!content) return;

            // Empty message varsa sil
            const empty = content.querySelector('.activity-empty');
            if (empty) empty.remove();

            const item = document.createElement('div');
            item.className = `activity-item activity-${type}`;
            item.innerHTML = `
                <span class="activity-time">${new Date().toLocaleTimeString()}</span>
                <span class="activity-message">${message}</span>
            `;

            content.insertBefore(item, content.firstChild);

            // Max 50 item
            while (content.children.length > 50) {
                content.removeChild(content.lastChild);
            }
        }

        // Statistics Dashboard göstər
        createStatsDashboard() {
            const dashboard = document.createElement('div');
            dashboard.className = 'flowdraw-stats-dashboard';
            dashboard.id = 'statsDashboard';

            const stats = this.getStats();

            dashboard.innerHTML = `
                <div class="stats-header">
                    <h3>📊 Statistics</h3>
                </div>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-number">${stats.total}</div>
                        <div class="stat-label">Total Events</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${stats.errors}</div>
                        <div class="stat-label">Errors</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${this.getSessionDuration()}</div>
                        <div class="stat-label">Session Time</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${stats.averageEventFrequency.eventsPerMinute}</div>
                        <div class="stat-label">Events/Min</div>
                    </div>
                </div>
                <div class="stats-top-events">
                    <h4>Top Events</h4>
                    <ul>
                        ${Object.entries(stats.topEvents).map(([event, count]) => 
                            `<li>${event}: <strong>${count}</strong></li>`
                        ).join('')}
                    </ul>
                </div>
            `;

            this.ensureStatsDashboardStyles();
            return dashboard;
        }

        // Styles əlavə et
        ensureToastStyles() {
            if (document.getElementById('flowdraw-toast-styles')) return;

            const style = document.createElement('style');
            style.id = 'flowdraw-toast-styles';
            style.textContent = `
                .flowdraw-toast {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    background: white;
                    border-radius: 8px;
                    padding: 16px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    z-index: 10000;
                    animation: slideIn 0.3s ease;
                    border-left: 4px solid #4dabf7;
                }

                .flowdraw-toast.toast-success {
                    border-left-color: #51cf66;
                }

                .flowdraw-toast.toast-error {
                    border-left-color: #ff6b6b;
                }

                .flowdraw-toast.toast-warning {
                    border-left-color: #ffd43b;
                }

                .flowdraw-toast.toast-exit {
                    animation: slideOut 0.3s ease;
                }

                .toast-content {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .toast-icon {
                    font-size: 20px;
                }

                .toast-message {
                    color: #333;
                    font-size: 14px;
                }

                .toast-close {
                    background: none;
                    border: none;
                    cursor: pointer;
                    color: #999;
                    font-size: 16px;
                    padding: 0;
                    margin-left: 8px;
                }

                .toast-close:hover {
                    color: #333;
                }

                @keyframes slideIn {
                    from { transform: translateX(400px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }

                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(400px); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }

        ensureEventPanelStyles() {
            if (document.getElementById('flowdraw-event-panel-styles')) return;

            const style = document.createElement('style');
            style.id = 'flowdraw-event-panel-styles';
            style.textContent = `
                .flowdraw-event-panel {
                    position: fixed;
                    bottom: 0;
                    right: 0;
                    width: 400px;
                    height: 300px;
                    background: white;
                    border-left: 1px solid #e0e0e0;
                    border-top: 1px solid #e0e0e0;
                    border-radius: 8px 8px 0 0;
                    box-shadow: 0 -2px 8px rgba(0,0,0,0.1);
                    z-index: 9999;
                    display: flex;
                    flex-direction: column;
                }

                .event-panel-header {
                    padding: 16px;
                    border-bottom: 1px solid #e0e0e0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .event-panel-header h3 {
                    margin: 0;
                    font-size: 16px;
                }

                .event-panel-controls {
                    display: flex;
                    gap: 8px;
                }

                .event-btn {
                    background: #f5f5f5;
                    border: 1px solid #e0e0e0;
                    border-radius: 4px;
                    padding: 6px 10px;
                    cursor: pointer;
                    color: #666;
                    font-size: 12px;
                    transition: all 0.2s;
                }

                .event-btn:hover {
                    background: #4dabf7;
                    color: white;
                    border-color: #4dabf7;
                }

                .event-btn.rotated {
                    transform: rotate(180deg);
                }

                .event-panel-content {
                    flex: 1;
                    overflow-y: auto;
                    padding: 12px;
                }

                .event-panel-content.hidden {
                    display: none;
                }

                .event-list {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .event-item {
                    display: flex;
                    gap: 8px;
                    padding: 8px;
                    background: #f8f9fa;
                    border-radius: 4px;
                    font-size: 12px;
                    align-items: center;
                }

                .event-time {
                    color: #999;
                    min-width: 55px;
                }

                .event-icon {
                    font-size: 14px;
                }

                .event-type {
                    color: #666;
                    font-weight: 500;
                    min-width: 100px;
                }

                .event-summary {
                    color: #999;
                    flex: 1;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
            `;
            document.head.appendChild(style);
        }

        ensureActivityFeedStyles() {
            if (document.getElementById('flowdraw-activity-feed-styles')) return;

            const style = document.createElement('style');
            style.id = 'flowdraw-activity-feed-styles';
            style.textContent = `
                .flowdraw-activity-feed {
                    position: fixed;
                    top: 80px;
                    right: 20px;
                    width: 320px;
                    max-height: 400px;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    z-index: 9998;
                    display: flex;
                    flex-direction: column;
                }

                .activity-header {
                    padding: 12px;
                    border-bottom: 1px solid #e0e0e0;
                }

                .activity-header h3 {
                    margin: 0;
                    font-size: 14px;
                }

                .activity-content {
                    flex: 1;
                    overflow-y: auto;
                    max-height: 340px;
                }

                .activity-item {
                    padding: 10px 12px;
                    border-bottom: 1px solid #f0f0f0;
                    font-size: 12px;
                    display: flex;
                    gap: 8px;
                    align-items: flex-start;
                }

                .activity-time {
                    color: #999;
                    min-width: 45px;
                    font-weight: 500;
                }

                .activity-message {
                    color: #333;
                    flex: 1;
                }

                .activity-empty {
                    padding: 20px;
                    text-align: center;
                    color: #999;
                    font-size: 12px;
                }

                .activity-item.activity-success {
                    background: #f1f9ff;
                    border-left: 3px solid #51cf66;
                }

                .activity-item.activity-error {
                    background: #fff5f5;
                    border-left: 3px solid #ff6b6b;
                }

                .activity-item.activity-warning {
                    background: #fffbf0;
                    border-left: 3px solid #ffd43b;
                }
            `;
            document.head.appendChild(style);
        }

        ensureStatsDashboardStyles() {
            if (document.getElementById('flowdraw-stats-styles')) return;

            const style = document.createElement('style');
            style.id = 'flowdraw-stats-styles';
            style.textContent = `
                .flowdraw-stats-dashboard {
                    position: fixed;
                    top: 80px;
                    left: 20px;
                    width: 360px;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    z-index: 9998;
                    padding: 16px;
                }

                .stats-header h3 {
                    margin: 0 0 16px 0;
                    font-size: 16px;
                }

                .stats-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                    margin-bottom: 16px;
                }

                .stat-card {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 16px;
                    border-radius: 8px;
                    text-align: center;
                }

                .stat-card:nth-child(2) {
                    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                }

                .stat-card:nth-child(3) {
                    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
                }

                .stat-card:nth-child(4) {
                    background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
                }

                .stat-number {
                    font-size: 28px;
                    font-weight: bold;
                    margin-bottom: 4px;
                }

                .stat-label {
                    font-size: 12px;
                    opacity: 0.9;
                }

                .stats-top-events {
                    padding-top: 12px;
                    border-top: 1px solid #e0e0e0;
                }

                .stats-top-events h4 {
                    margin: 0 0 8px 0;
                    font-size: 12px;
                    color: #666;
                }

                .stats-top-events ul {
                    margin: 0;
                    padding: 0;
                    list-style: none;
                }

                .stats-top-events li {
                    padding: 6px 0;
                    font-size: 12px;
                    color: #555;
                    display: flex;
                    justify-content: space-between;
                    border-bottom: 1px solid #f0f0f0;
                }

                .stats-top-events li strong {
                    color: #4dabf7;
                }
            `;
            document.head.appendChild(style);
        }
    }

    window.UserEventManager = UserEventManager;
})();