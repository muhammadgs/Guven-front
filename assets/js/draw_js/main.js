// main.js - TAM DÜZƏLDİLMİŞ
class DiagrammingTool {
    constructor() {
        this.canvas = document.getElementById('drawingCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gridOverlay = document.getElementById('gridOverlay');
        this.sidebar = document.getElementById('sidebar');
        this.selectedTool = 'select';
        this.shapes = [];
        this.connections = [];
        this.selectedShapes = new Set();
        this.selectedConnections = new Set();
        this.dragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.dragOffset = { x: 0, y: 0 };
        this.zoom = 1;
        this.offset = { x: 0, y: 0 };
        this.panning = false;
        this.lastMouse = { x: 0, y: 0 };
        this.resizing = false;
        this.resizeHandle = null;
        this.currentDragShapeType = null;
        this.currentDiagramId = null; // YENİ: Cari diagram ID
        this.isModified = false;

        // Manager-ləri yarat
        this.canvasManager = new CanvasManager(this);
        this.eventHandler = new EventHandler(this);
        this.controlManager = new ControlManager(this);
        this.historyManager = new HistoryManager(this);
        this.exportManager = new ExportManager(this);
        this.shapeManager = new ShapeManager(this);
        this.clipboardManager = new ClipboardManager(this);
        this.deleteConnectionAt = this.deleteConnectionAt.bind(this);

        this.apiManager = new ApiManager(this);
        this.loadManager = new LoadManager(this);

        this.init();
    }

    init() {
        this.canvasManager.setupCanvas();
        this.eventHandler.setupEventListeners();
        this.eventHandler.setupKeyboardShortcuts();
        this.controlManager.setupControls();
        this.loadManager.setupLoadControls();
        this.shapeManager.setupDefaultShapes();
        this.historyManager.saveToHistory();
        this.updateLayersList();
        this.animate();

        this.setupAutoSave();
    }

    draw() { this.canvasManager.draw(); }
    getDiagramBounds() { return this.canvasManager.getDiagramBounds(); }
    getShapeAt(x, y) { return this.eventHandler.getShapeAt(x, y); }
    getResizeHandleAt(x, y) { return this.eventManager.getResizeHandleAt(x, y); }

    saveToHistory() {
        this.historyManager.saveToHistory();
        this.updateLayersList();
    }

    undo() {
        this.historyManager.undo();
        this.updateLayersList();
    }

    redo() {
        this.historyManager.redo();
        this.updateLayersList();
    }

    setTool(tool) {
        this.selectedTool = tool;
        this.updateUI();
        this.updateCursor();
    }

    updateCursor() {
        switch(this.selectedTool) {
            case 'select':
                this.canvas.style.cursor = 'default';
                break;
            case 'pan':
                this.canvas.style.cursor = this.panning ? 'grabbing' : 'grab';
                break;
            case 'text':
                this.canvas.style.cursor = 'text';
                break;
        }
    }

    showTextModal() { this.controlManager.showTextModal(); }
    hideTextModal() { this.controlManager.hideTextModal(); }
    showExportModal() { this.controlManager.showExportModal(); }
    hideExportModal() { this.controlManager.hideExportModal(); }
    showContextMenu(x, y) { this.controlManager.showContextMenu(x, y); }
    toggleSidebar() { this.controlManager.toggleSidebar(); }

    addText() {
        this.shapeManager.addText();
        this.updateLayersList();
    }

    startShapeDrag(e, shapeType) {
        this.shapeManager.startShapeDrag(e, shapeType);
    }

    deleteSelected() {
        this.shapeManager.deleteSelected();
        this.updateLayersList();
    }

    updateSelectedFill(color) { this.shapeManager.updateSelectedFill(color); }
    updateSelectedStroke(color) { this.shapeManager.updateSelectedStroke(color); }
    updateSelectedStrokeWidth(width) { this.shapeManager.updateSelectedStrokeWidth(width); }
    updateSelectedFontSize(size) { this.shapeManager.updateSelectedFontSize(size); }
    bringToFront() { this.shapeManager.bringToFront(); }
    sendToBack() { this.shapeManager.sendToBack(); }

    copySelected() { this.clipboardManager.copySelected(); }
    paste() {
        this.clipboardManager.paste();
        this.updateLayersList();
    }

    cutSelected() {
        this.clipboardManager.cutSelected();
        this.updateLayersList();
    }

    selectAll() { this.clipboardManager.selectAll(); }

    exportDiagram() { this.exportManager.exportDiagram(); }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.updateStatusBar();
    }

    updateStatusBar() {
        this.controlManager.updateStatusBar();
    }

    updateUI() {
        this.controlManager.updateUI();
        this.updateCursor();
    }

    zoomIn() { this.zoom *= 1.2; this.updateZoomDisplay(); this.draw(); }
    zoomOut() { this.zoom /= 1.2; this.updateZoomDisplay(); this.draw(); }
    resetZoom() { this.zoom = 1; this.offset = { x: 0, y: 0 }; this.updateZoomDisplay(); this.draw(); }

    updateZoomDisplay() {
        const zoomLevel = document.getElementById('zoomLevel');
        if (zoomLevel) {
            zoomLevel.textContent = Math.round(this.zoom * 100) + '%';
        }
    }

    newDiagram() {
        if (this.shapes.length > 0 && this.isModified) {
            if (!confirm('Create new diagram? Unsaved changes will be lost.')) return;
        }

        this.shapes = [];
        this.connections = [];
        this.selectedShapes.clear();
        this.currentDiagramId = null;
        this.isModified = false;
        this.zoom = 1;
        this.offset = { x: 0, y: 0 };
        this.updateZoomDisplay();
        this.saveToHistory();
        this.updateLayersList();
        this.draw();
    }

    saveDiagram() {
        // SaveManager və ya ApiManager vasitəsilə save et
        if (this.apiManager && typeof this.apiManager.saveDiagram === 'function') {
            const name = prompt('Enter diagram name:', 'My Diagram');
            if (name) {
                const diagramData = this.getCurrentDiagramData(name);
                this.apiManager.saveDiagram(diagramData)
                    .then(result => {
                        alert('Diagram saved successfully!');
                        this.currentDiagramId = result.id;
                        this.isModified = false;
                    })
                    .catch(error => {
                        console.error('Save error:', error);
                        alert('Failed to save diagram. Please try again.');
                    });
            }
        } else {
            alert('Save functionality is not available.');
        }
    }

    // YENİ: Diagram yükləmə metodu
    loadDiagram(data) {
        try {
            console.log('📥 Loading diagram data:', data);

            // Köhnə məlumatları təmizlə
            this.shapes = [];
            this.connections = [];
            this.selectedShapes.clear();

            // Shapes yüklə
            if (data.shapes && Array.isArray(data.shapes)) {
                data.shapes.forEach(shapeData => {
                    // ConnectionPoints-i yenidən hesabla
                    const shape = this.shapeManager.createShape(shapeData);

                    // Freehand shape üçün xüsusi emal
                    if (shape.type === 'freehand' && shapeData.points) {
                        shape.points = shapeData.points;
                    }

                    this.shapes.push(shape);
                });
            }

            // Connections yüklə
            if (data.connections && Array.isArray(data.connections)) {
                this.connections = data.connections;
            }

            // Viewport ayarları
            if (data.viewport) {
                this.zoom = data.viewport.zoom || 1;
                this.offset = data.viewport.offset || { x: 0, y: 0 };
                this.updateZoomDisplay();
            }

            // History-ə əlavə et
            this.saveToHistory();

            // Yenidən çək
            this.draw();

            // Layers list yenilə
            this.updateLayersList();

            console.log('✅ Diagram loaded successfully!');
            console.log(`   Shapes: ${this.shapes.length}`);
            console.log(`   Connections: ${this.connections.length}`);

            return true;

        } catch (error) {
            console.error('❌ Failed to load diagram:', error);
            alert('Failed to load diagram: ' + error.message);
            return false;
        }
    }

     getCurrentDiagramData(name = '') {
        return {
            name: name || `Diagram_${new Date().toLocaleString()}`,
            diagram_data: {
                shapes: this.shapes.map(shape => {
                    const { connectionPoints, ...shapeData } = shape;
                    return shapeData;
                }),
                connections: this.connections,
                viewport: {
                    zoom: this.zoom,
                    offset: this.offset
                }
            },
            metadata: {
                created_at: new Date().toISOString(),
                shape_count: this.shapes.length,
                connection_count: this.connections.length,
                tool_version: '2.0'
            }
        };
    }

    // YENİ: Auto-save setup
    setupAutoSave() {
        // Hər dəyişiklikdə modified flag-i işə sal
        const originalSave = this.saveToHistory.bind(this);
        this.saveToHistory = () => {
            originalSave();
            this.isModified = true;
        };

        // Hər 30 saniyədən bir auto-save
        setInterval(() => {
            if (this.isModified && this.shapes.length > 0) {
                this.autoSave();
            }
        }, 30000); // 30 saniyə
    }

    // YENİ: Auto-save funksiyası
    async autoSave() {
        if (!this.isModified || this.shapes.length === 0) return;

        try {
            const diagramData = this.getCurrentDiagramData('Auto-saved diagram');

            // Local storage-a save et
            const saveId = `autosave_${Date.now()}`;
            localStorage.setItem(saveId, JSON.stringify({
                ...diagramData,
                auto_saved: true,
                saved_at: new Date().toISOString()
            }));

            // Yalnız son 5 auto-save-i saxla
            const autoSaves = JSON.parse(localStorage.getItem('autosaves') || '[]');
            autoSaves.push(saveId);
            if (autoSaves.length > 5) {
                const oldId = autoSaves.shift();
                localStorage.removeItem(oldId);
            }
            localStorage.setItem('autosaves', JSON.stringify(autoSaves));

            this.isModified = false;
            console.log('💾 Auto-save completed:', saveId);

        } catch (error) {
            console.error('❌ Auto-save failed:', error);
        }
    }

    // YENİ: Əgər auto-save varsa, yüklə
    checkAutoSave() {
        try {
            const autoSaves = JSON.parse(localStorage.getItem('autosaves') || '[]');
            if (autoSaves.length > 0) {
                const lastSaveId = autoSaves[autoSaves.length - 1];
                const savedData = localStorage.getItem(lastSaveId);

                if (savedData) {
                    const parsed = JSON.parse(savedData);
                    if (parsed.diagram_data) {
                        // İstifadəçiyə soruş
                        if (confirm('Found auto-saved diagram. Do you want to load it?')) {
                            this.loadDiagram(parsed.diagram_data);
                            return true;
                        }
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error checking auto-save:', error);
        }
        return false;
    }

    shareDiagram() {
        const diagramData = {
            shapes: this.shapes.map(shape => {
                const { connectionPoints, ...shapeData } = shape;
                return shapeData;
            }),
            connections: this.connections
        };
        const dataStr = JSON.stringify(diagramData);
        const compressed = btoa(encodeURIComponent(dataStr));
        const shareUrl = `${window.location.origin}${window.location.pathname}?diagram=${compressed}`;

        if (navigator.clipboard) {
            navigator.clipboard.writeText(shareUrl).then(() => {
                alert('Link copied to clipboard!');
            });
        } else {
            alert(`Share this link:\n\n${shareUrl}`);
        }
    }

    getSelectedConnectorType() {
        const selectedConnector = document.querySelector('.shape-item.selected[data-type="line"], .shape-item.selected[data-type="elbow"], .shape-item.selected[data-type="curve"]');
        if (selectedConnector) {
            return selectedConnector.dataset.type;
        }
        return 'elbow';
    }

    handleContextAction(action) {
        switch(action) {
            case 'copy': this.copySelected(); break;
            case 'paste': this.paste(); break;
            case 'delete':
                this.deleteSelected();
                break;
            case 'deleteConnection':
                // Context menu-dan connection silmə
                this.setTool('delete-connection');
                break;
            case 'bringToFront': this.saveToHistory(); this.bringToFront(); break;
            case 'sendToBack': this.saveToHistory(); this.sendToBack(); break;
            case 'deleteConnections':
                this.shapeManager.deleteSelectedConnections();
                break;
        }
        document.getElementById('contextMenu').style.display = 'none';
    }

    updateLayersList() {
        const layersList = document.getElementById('layersList');
        if (!layersList) return;

        layersList.innerHTML = '';

        // Tərs sırayla (ən üst shape birinci)
        const reversedShapes = [...this.shapes].reverse();

        reversedShapes.forEach(shape => {
            const layerItem = document.createElement('div');
            layerItem.className = 'layer-item';
            if (this.selectedShapes.has(shape.id)) {
                layerItem.classList.add('selected');
            }

            layerItem.innerHTML = `
                <div class="layer-icon">
                    ${this.getLayerIcon(shape.type)}
                </div>
                <div class="layer-info">
                    <span class="layer-name">${shape.type.charAt(0).toUpperCase() + shape.type.slice(1)} ${shape.text ? '- ' + shape.text.substring(0, 20) : ''}</span>
                    <span class="layer-dimensions">${Math.round(shape.width)}×${Math.round(shape.height)}</span>
                </div>
                <div class="layer-visibility">
                    <i class="fas fa-eye"></i>
                </div>
            `;

            layerItem.addEventListener('click', (e) => {
                if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                    this.selectedShapes.clear();
                }
                this.selectedShapes.add(shape.id);
                this.draw();
                this.updateLayersList();
            });

            layersList.appendChild(layerItem);
        });
    }

    // Yeni metod: Connection seçimi
    selectConnectionAt(x, y) {
        const tolerance = 10 / this.zoom;

        // Bütün connection-ları yoxla
        for (let i = 0; i < this.connections.length; i++) {
            const conn = this.connections[i];

            // Connection-in başlanğıc və son nöqtələrini tap
            const fromShape = this.shapes.find(s => s.id === conn.from);
            const toShape = this.shapes.find(s => s.id === conn.to);

            if (!fromShape || !toShape) continue;

            let startX, startY, endX, endY;

            // Başlanğıc nöqtə
            if (fromShape.connectionPoints && conn.fromPoint) {
                const point = fromShape.connectionPoints[conn.fromPoint];
                if (point) {
                    startX = point.x;
                    startY = point.y;
                }
            }

            // Son nöqtə
            if (toShape.connectionPoints && conn.toPoint) {
                const point = toShape.connectionPoints[conn.toPoint];
                if (point) {
                    endX = point.x;
                    endY = point.y;
                }
            }

            // Əgər connection points tapılmadısa, shape mərkəzlərindən istifadə et
            if (!startX) {
                startX = fromShape.x + fromShape.width/2;
                startY = fromShape.y + fromShape.height/2;
            }

            if (!endX) {
                endX = toShape.x + toShape.width/2;
                endY = toShape.y + toShape.height/2;
            }

            // Nöqtənin xətt üzərində olub-olmadığını yoxla
            const distance = this.pointToLineDistance(x, y, startX, startY, endX, endY);

            if (distance <= tolerance) {
                return { index: i, connection: conn };
            }
        }

        return null;
    }
    // Nöqtənin xəttə olan məsafəsini hesablama
    pointToLineDistance(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;

        if (lenSq !== 0) {
            param = dot / lenSq;
        }

        let xx, yy;

        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        const dx = px - xx;
        const dy = py - yy;

        return Math.sqrt(dx * dx + dy * dy);
    }

    // Connection silmə metodu
    deleteConnectionAt(x, y) {
        const connection = this.selectConnectionAt(x, y);
        if (connection) {
            this.connections.splice(connection.index, 1);
            this.saveToHistory();
            this.draw();
            return true;
        }
        return false;
    }

    // setTool metodunu yeniləyin
    setTool(tool) {
        this.selectedTool = tool;

        // Cursor-u yenilə
        if (tool === 'delete-connection') {
            this.canvas.style.cursor = 'not-allowed';
        } else {
            this.updateCursor();
        }

        this.updateUI();
    }

    getLayerIcon(shapeType) {
        const icons = {
            'rectangle': 'fa-square',
            'circle': 'fa-circle',
            'triangle': 'fa-play',
            'diamond': 'fa-gem',
            'text': 'fa-font',
            'database': 'fa-database',
            'document': 'fa-file',
            'cloud': 'fa-cloud',
            'cylinder': 'fa-oil-can',
            'ellipse': 'fa-circle-o',
            'hexagon': 'fa-cube',
            'parallelogram': 'fa-square-o'
        };

        return `<i class="fas ${icons[shapeType] || 'fa-square'}"></i>`;
    }

    createShapeFromSidebar(shapeType, x, y) {
        this.shapeManager.createShapeAtPosition(shapeType, x, y);
        this.updateLayersList();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const tool = new DiagrammingTool();
    window.diagramTool = tool;

    // YENİ: Auto-save yoxla
    setTimeout(() => {
        tool.checkAutoSave();
    }, 1000);
});