// clipboard-manager.js - TAM DÜZƏLDİLMİŞ VERSİYA
(function() {
    class ClipboardManager {
        constructor(diagramTool) {
            this.diagramTool = diagramTool;
            this.clipboard = {
                shapes: [],
                connections: [],
                originalShapeIds: []
            };
        }

        // ==================== COPY ====================
        copySelected() {
            if (this.diagramTool.selectedShapes.size === 0) {
                console.warn('⚠️ Seçilmiş shape yoxdur');
                return;
            }

            this.clipboard.originalShapeIds = Array.from(this.diagramTool.selectedShapes);

            // Seçilmiş shapes-ləri kopyala
            this.clipboard.shapes = this.clipboard.originalShapeIds.map(shapeId => {
                const shape = this.diagramTool.shapes.find(s => s.id === shapeId);
                if (!shape) return null;

                const cloned = JSON.parse(JSON.stringify(shape));
                delete cloned.connectionPoints; // ConnectionPoints-i sil
                return cloned;
            }).filter(Boolean);

            // Bu shapes-lərlə bağlı connections-ləri kopyala
            this.clipboard.connections = this.diagramTool.connections.filter(conn =>
                this.clipboard.originalShapeIds.includes(conn.from) &&
                this.clipboard.originalShapeIds.includes(conn.to)
            ).map(conn => JSON.parse(JSON.stringify(conn)));

            console.log(`📋 Kopyalandı: ${this.clipboard.shapes.length} shape, ${this.clipboard.connections.length} connection`);
        }

        // ==================== PASTE ====================
        paste() {
            if (this.clipboard.shapes.length === 0) {
                console.warn('⚠️ Clipboard boşdur');
                return;
            }

            const offset = 20; // Offset məsafə
            const idMap = {}; // Eski ID → Yeni ID
            const pastedShapeIds = [];

            // Yeni shape-ləri əlavə et
            this.clipboard.shapes.forEach((shapeData, index) => {
                const newShape = {
                    ...JSON.parse(JSON.stringify(shapeData)),
                    id: 'shape_' + Date.now() + '_' + index,
                    x: shapeData.x + offset,
                    y: shapeData.y + offset
                };

                idMap[shapeData.id] = newShape.id;
                pastedShapeIds.push(newShape.id);

                // ConnectionPoints-i yenidən hesabla
                if (newShape.type !== 'text' && newShape.type !== 'freehand') {
                    newShape.connectionPoints = this.diagramTool.shapeManager.calculateConnectionPoints(newShape);
                }

                this.diagramTool.shapes.push(newShape);
            });

            // Connections-ləri əlavə et (ID-ləri yenilə)
            this.clipboard.connections.forEach(connData => {
                const newConnection = {
                    ...JSON.parse(JSON.stringify(connData)),
                    id: 'conn_' + Date.now() + '_' + Math.random(),
                    from: idMap[connData.from],
                    to: idMap[connData.to]
                };

                this.diagramTool.connections.push(newConnection);
            });

            // Yeni shapes-ləri seç
            this.diagramTool.selectedShapes.clear();
            pastedShapeIds.forEach(id => this.diagramTool.selectedShapes.add(id));

            // State-i saxla
            this.diagramTool.saveToHistory();
            this.diagramTool.draw();
            this.diagramTool.updateLayersList();

            console.log(`📌 Yapışdırıldı: ${pastedShapeIds.length} shape`);
        }

        // ==================== CUT ====================
        cutSelected() {
            this.copySelected();
            this.diagramTool.deleteSelected();
            console.log('✂️ Kəsildi');
        }

        // ==================== SELECT ALL ====================
        selectAll() {
            this.diagramTool.selectedShapes.clear();
            this.diagramTool.shapes.forEach(shape => {
                this.diagramTool.selectedShapes.add(shape.id);
            });

            this.diagramTool.draw();
            this.diagramTool.updateLayersList();

            console.log(`🎯 Hamısı seçildi: ${this.diagramTool.shapes.length} shape`);
        }

        // ==================== UTILITIES ====================
        hasContent() {
            return this.clipboard.shapes.length > 0;
        }

        clear() {
            this.clipboard = {
                shapes: [],
                connections: [],
                originalShapeIds: []
            };
            console.log('🗑️ Clipboard temizləndi');
        }

        // ==================== DEBUG ====================
        logClipboard() {
            console.group('📋 Clipboard Debug');
            console.log('Shapes:', this.clipboard.shapes.length);
            console.log('Connections:', this.clipboard.connections.length);
            console.log('Content:', this.hasContent());
            console.groupEnd();
        }
    }

    window.ClipboardManager = ClipboardManager;
})();