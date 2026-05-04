// event-implementation-example.js - PRAKTIK EVENT İMPLEMENTASYON NÜMUNƏLƏRİ

/**
 * Bu faylda UserEventManager-ın real-world implementasyon nümunələri var.
 * Bunu template olaraq istifadə edə bilərsən və öz proyektinə uyarlaya bilərsən.
 */

// ==================== 1. BASIC SETUP ====================

class EventImplementationExample {
    constructor(diagramTool) {
        this.diagramTool = diagramTool;
        this.eventManager = diagramTool.eventManager;

        // Event listeners qur
        this.setupEventListeners();

        // Analytics qur
        this.setupAnalytics();
    }

    // ==================== 2. EVENT LISTENERS SETUP ====================

    setupEventListeners() {
        console.log('🎯 Setting up event listeners...');

        // Tüm events global listener
        this.eventManager.addEventListener('*', (event) => {
            this.onAnyEvent(event);
        });

        // Shape events
        this.eventManager.addEventListener(
            UserEventManager.EVENTS.SHAPE_CREATED,
            (event) => this.onShapeCreated(event)
        );

        this.eventManager.addEventListener(
            UserEventManager.EVENTS.SHAPE_DELETED,
            (event) => this.onShapeDeleted(event)
        );

        this.eventManager.addEventListener(
            UserEventManager.EVENTS.SHAPE_MODIFIED,
            (event) => this.onShapeModified(event)
        );

        this.eventManager.addEventListener(
            UserEventManager.EVENTS.SHAPE_SELECTED,
            (event) => this.onShapeSelected(event)
        );

        // Connection events
        this.eventManager.addEventListener(
            UserEventManager.EVENTS.CONNECTION_CREATED,
            (event) => this.onConnectionCreated(event)
        );

        // Clipboard events
        this.eventManager.addEventListener(
            UserEventManager.EVENTS.COPY,
            (event) => this.onCopy(event)
        );

        this.eventManager.addEventListener(
            UserEventManager.EVENTS.PASTE,
            (event) => this.onPaste(event)
        );

        // File events
        this.eventManager.addEventListener(
            UserEventManager.EVENTS.DIAGRAM_SAVED,
            (event) => this.onDiagramSaved(event)
        );

        // Error events
        this.eventManager.addEventListener(
            UserEventManager.EVENTS.ERROR_OCCURRED,
            (event) => this.onError(event)
        );

        console.log('✅ Event listeners setup complete');
    }

    // ==================== 3. EVENT HANDLERS ====================

    onAnyEvent(event) {
        // Global event handling
        // Örn: Analytics, logging, etc.
    }

    onShapeCreated(event) {
        console.log('✨ Shape created:', event.data.shapeType);

        // Örnek: Toast notification
        this.showNotification(`${event.data.shapeType} created`, 'success');

        // Örnek: Update stats
        this.updateCreationStats(event.data.shapeType);

        // Örnek: Send to analytics
        this.sendToAnalytics('shape_created', {
            type: event.data.shapeType,
            sessionTime: event.sessionTime
        });
    }

    onShapeDeleted(event) {
        console.log('🗑️ Shapes deleted:', event.data.count);

        // Undo possibility göster
        this.showNotification(
            `${event.data.count} shape(s) deleted. Press Ctrl+Z to undo`,
            'info'
        );
    }

    onShapeModified(event) {
        console.log('✏️ Shape modified:', event.data.changes);

        // Quick info
        const changes = Object.keys(event.data.changes).join(', ');
        this.logActivity(`Modified: ${changes}`);
    }

    onShapeSelected(event) {
        console.log('👆 Selected shapes:', event.data.count);

        // Status bar update
        this.updateStatusBar(`${event.data.count} shape(s) selected`);
    }

    onConnectionCreated(event) {
        console.log('🔗 Connection created:', event.data.connectionType);

        this.showNotification('Connection created', 'success');
    }

    onCopy(event) {
        console.log('📋 Copy:', event.data.totalItems, 'items');

        this.showNotification(
            `Copied ${event.data.shapeCount} shapes and ${event.data.connectionCount} connections`,
            'info'
        );
    }

    onPaste(event) {
        console.log('📌 Paste:', event.data.totalItems, 'items');

        this.showNotification(
            `Pasted ${event.data.totalItems} items`,
            'success'
        );
    }

    onDiagramSaved(event) {
        console.log('💾 Diagram saved:', event.data.diagramName);

        this.showNotification('Diagram saved successfully', 'success');
        this.clearUnsavedIndicator();
    }

    onError(event) {
        console.error('❌ Error:', event.data.errorMessage);

        this.showNotification(
            `Error: ${event.data.errorMessage}`,
            'error'
        );

        // Send error to logging service
        this.logErrorToService(event);
    }

    // ==================== 4. ANALYTICS SETUP ====================

    setupAnalytics() {
        console.log('📊 Setting up analytics...');

        // Session start event
        this.eventManager.addEventListener(
            UserEventManager.EVENTS.SESSION_START,
            (event) => this.onSessionStart(event)
        );

        // Session end event (page unload)
        window.addEventListener('beforeunload', () => {
            this.eventManager.fireSessionEnd();
        });
    }

    onSessionStart(event) {
        console.log('🟢 Session started');

        // Session data cache
        this.sessionData = {
            startTime: event.timestamp,
            userId: event.userId,
            diagramId: event.diagramId
        };
    }

    // ==================== 5. UTILITY METHODS ====================

    // Toast notification göster
    showNotification(message, type = 'info') {
        // Örnek: Simple toast
        console.log(`[${type.toUpperCase()}] ${message}`);

        // Gerçek implementasyon:
        // const toast = document.createElement('div');
        // toast.className = `toast toast-${type}`;
        // toast.textContent = message;
        // document.body.appendChild(toast);
        // setTimeout(() => toast.remove(), 3000);
    }

    // Activity log
    logActivity(message) {
        console.log(`📝 Activity: ${message}`);

        // Activity list-e ekle
        // const activityList = document.getElementById('activityLog');
        // activityList.innerHTML += `<div>${message}</div>`;
    }

    // Status bar update
    updateStatusBar(message) {
        const statusBar = document.getElementById('selectionInfo');
        if (statusBar) {
            statusBar.textContent = message;
        }
    }

    // Creation stats update
    updateCreationStats(shapeType) {
        // Analytics'te track
        console.log(`Shape created: ${shapeType}`);
    }

    // Analytics-e veri gönder
    sendToAnalytics(eventName, eventData) {
        // Örnek: Google Analytics, Mixpanel, vb.
        if (window.gtag) {
            gtag('event', eventName, eventData);
        }
    }

    // Error logging service-e gönder
    logErrorToService(event) {
        // Örnek: Sentry, LogRocket, vb.
        console.error('Logging error to service:', event);

        // const errorPayload = {
        //     message: event.data.errorMessage,
        //     stack: event.data.errorStack,
        //     timestamp: event.timestamp,
        //     userId: event.userId
        // };
        // fetch('/api/errors', { method: 'POST', body: JSON.stringify(errorPayload) });
    }

    // Unsaved indicator temizle
    clearUnsavedIndicator() {
        const indicator = document.querySelector('.unsaved-indicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }

    // ==================== 6. ADVANCED EXAMPLES ====================

    // Örnek: Activity Timeline
    getActivityTimeline() {
        const events = this.eventManager.getRecentEvents(20);
        const timeline = events.map(event => ({
            time: new Date(event.timestamp).toLocaleTimeString(),
            type: event.type,
            summary: this.getEventSummary(event)
        }));

        return timeline;
    }

    getEventSummary(event) {
        switch(event.type) {
            case 'shape:created':
                return `Created ${event.data.shapeType}`;
            case 'shape:deleted':
                return `Deleted ${event.data.count} shape(s)`;
            case 'shape:moved':
                return `Moved ${event.data.shapeId}`;
            case 'clipboard:copy':
                return `Copied ${event.data.totalItems} items`;
            case 'diagram:saved':
                return `Saved "${event.data.diagramName}"`;
            default:
                return event.type;
        }
    }

    // Örnek: User Statistics Dashboard
    getUserStatistics() {
        const stats = this.eventManager.getStats();

        return {
            totalActions: stats.total,
            sessionDuration: this.eventManager.getSessionDuration(),
            mostUsedTool: this.getMostUsedTool(stats),
            shapesCreated: stats.byType['shape:created'] || 0,
            connectionsCreated: stats.byType['connection:created'] || 0,
            errors: stats.errors,
            frequency: this.eventManager.getEventFrequency()
        };
    }

    getMostUsedTool(stats) {
        let maxCount = 0;
        let maxTool = null;

        Object.entries(stats.byType).forEach(([event, count]) => {
            if (event.includes('shape:') && count > maxCount) {
                maxCount = count;
                maxTool = event;
            }
        });

        return maxTool;
    }

    // Örnek: Export Session Report
    exportSessionReport() {
        const stats = this.getUserStatistics();
        const timeline = this.getActivityTimeline();

        const report = {
            sessionData: this.sessionData,
            statistics: stats,
            timeline: timeline,
            eventLog: this.eventManager.exportEventLog('json'),
            generatedAt: new Date().toISOString()
        };

        return report;
    }

    // Örnek: Download Session Report
    downloadSessionReport(filename = 'session-report.json') {
        const report = this.exportSessionReport();

        const blob = new Blob([JSON.stringify(report, null, 2)], {
            type: 'application/json'
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log(`📥 Session report downloaded: ${filename}`);
    }

    // ==================== 7. DEBUGGING HELPERS ====================

    // Event log'u ekrana yazdır
    displayEventLog() {
        const events = this.eventManager.getRecentEvents(50);
        const html = events.map(e => `
            <div class="event-log-item">
                <span class="event-time">${new Date(e.timestamp).toLocaleTimeString()}</span>
                <span class="event-type">${e.type}</span>
                <span class="event-data">${JSON.stringify(e.data)}</span>
            </div>
        `).join('');

        return html;
    }

    // Live statistics göster
    displayLiveStats() {
        const stats = this.eventManager.getStats();
        const html = `
            <div class="stats-panel">
                <h3>Live Statistics</h3>
                <p>Total Events: ${stats.total}</p>
                <p>Errors: ${stats.errors}</p>
                <p>Session Duration: ${this.eventManager.getSessionDuration()}</p>
                <p>Event Frequency: ${stats.averageEventFrequency.eventsPerMinute} events/min</p>
                <h4>Top Events</h4>
                <ul>
                    ${Object.entries(stats.topEvents).map(([event, count]) => 
                        `<li>${event}: ${count}</li>`
                    ).join('')}
                </ul>
            </div>
        `;

        return html;
    }

    // ==================== 8. INTEGRATION WITH MAIN ====================

    /**
     * main.js üzərində bu setup'ı çağır:
     *
     * this.eventImpl = new EventImplementationExample(this);
     *
     * Bundan sonra bütün events otomatik olarak handle edilecek.
     */
}

// ==================== 9. USAGE IN DIFFERENT MODULES ====================

/**
 * Shape Manager üzərində event firing:
 *
 * deleteSelected() {
 *     const deletedShapes = [];
 *     this.diagramTool.selectedShapes.forEach(id => {
 *         const shape = this.diagramTool.shapes.find(s => s.id === id);
 *         deletedShapes.push(shape);
 *     });
 *
 *     // ... deletion logic ...
 *
 *     // 📌 Fire event
 *     this.diagramTool.eventManager.fireShapeDeleted(deletedShapes);
 * }
 */

/**
 * Clipboard Manager üzərində event firing:
 *
 * copySelected() {
 *     // ... copy logic ...
 *
 *     // 📌 Fire event
 *     this.diagramTool.eventManager.fireClipboardCopy(
 *         this.clipboard.shapes.length,
 *         this.clipboard.connections.length
 *     );
 * }
 */

/**
 * API Manager üzərində event firing:
 *
 * async saveDiagram(diagramData) {
 *     try {
 *         const result = await this.makeRequest(...);
 *
 *         // 📌 Fire event
 *         this.diagramTool.eventManager.fireDiagramSaved(result.id, diagramData.name);
 *
 *         return result;
 *     } catch (error) {
 *         // 📌 Fire error event
 *         this.diagramTool.eventManager.fireError(error, {
 *             context: 'saveDiagram',
 *             diagramName: diagramData.name
 *         });
 *     }
 * }
 */

// ==================== 10. KEYBOARD SHORTCUT FOR DEBUGGING ====================

/**
 * HTML body-na bu debug'ı əlavə et:
 *
 * <script>
 *   // Ctrl+Shift+E - Event statistics göstər
 *   document.addEventListener('keydown', (e) => {
 *       if (e.ctrlKey && e.shiftKey && e.key === 'E') {
 *           e.preventDefault();
 *           window.diagramTool.eventManager.printStats();
 *       }
 *   });
 *
 *   // Ctrl+Shift+L - Event log göstər
 *   document.addEventListener('keydown', (e) => {
 *       if (e.ctrlKey && e.shiftKey && e.key === 'L') {
 *           e.preventDefault();
 *           window.diagramTool.eventManager.printFullLog();
 *       }
 *   });
 *
 *   // Ctrl+Shift+D - Event log indir
 *   document.addEventListener('keydown', (e) => {
 *       if (e.ctrlKey && e.shiftKey && e.key === 'D') {
 *           e.preventDefault();
 *           window.diagramTool.eventManager.downloadEventLog();
 *       }
 *   });
 * </script>
 */

window.EventImplementationExample = EventImplementationExample;