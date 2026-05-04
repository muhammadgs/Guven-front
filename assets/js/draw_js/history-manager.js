// history-manager.js - TAM DÜZƏLDİLMİŞ VERSİYA
(function() {
    class HistoryManager {
        constructor(diagramTool) {
            this.diagramTool = diagramTool;
            this.history = [];
            this.historyIndex = -1;
            this.maxHistory = 50;
            this.isRestoringFromHistory = false;
        }

        // ==================== SAVE TO HISTORY ====================
        saveToHistory() {
            // Əgər history indeksi sondan əvvəl olubsa, sonrakı əməliyyatları sil
            if (this.historyIndex < this.history.length - 1) {
                this.history = this.history.slice(0, this.historyIndex + 1);
            }

            // Cari state-i saxla
            const state = this.captureState();

            // Əgər eyni state-i saxlamışıqsa, yenidən saqlamayın
            if (this.isStateDuplicate(state)) {
                console.log('⏭️ State duplicate - skip save');
                return;
            }

            this.history.push(state);
            this.historyIndex++;

            // Maksimum tarixi həddini yoxla
            if (this.history.length > this.maxHistory) {
                this.history.shift();
                this.historyIndex--;
            }

            console.log(`💾 History saved | Index: ${this.historyIndex} | Total: ${this.history.length}`);
        }

        // ==================== CAPTURE STATE ====================
        captureState() {
            return {
                shapes: this.deepCloneShapes(),
                connections: this.deepCloneConnections(),
                selectedShapes: Array.from(this.diagramTool.selectedShapes),
                timestamp: Date.now()
            };
        }

        deepCloneShapes() {
            return this.diagramTool.shapes.map(shape => {
                const cloned = JSON.parse(JSON.stringify(shape));
                // ConnectionPoints-i sıfırlayın (yenidən hesablanacaq)
                delete cloned.connectionPoints;
                return cloned;
            });
        }

        deepCloneConnections() {
            return JSON.parse(JSON.stringify(this.diagramTool.connections));
        }

        // ==================== STATE COMPARISON ====================
        isStateDuplicate(newState) {
            if (this.history.length === 0) return false;

            const lastState = this.history[this.historyIndex];
            if (!lastState) return false;

            // Shape sayını yoxla
            if (newState.shapes.length !== lastState.shapes.length) return false;
            if (newState.connections.length !== lastState.connections.length) return false;

            // Şəkillər bərabərdir?
            for (let i = 0; i < newState.shapes.length; i++) {
                if (!this.areShapesEqual(newState.shapes[i], lastState.shapes[i])) {
                    return false;
                }
            }

            // Bağlantılar bərabərdir?
            for (let i = 0; i < newState.connections.length; i++) {
                if (!this.areConnectionsEqual(newState.connections[i], lastState.connections[i])) {
                    return false;
                }
            }

            return true;
        }

        areShapesEqual(shape1, shape2) {
            return shape1.id === shape2.id &&
                   shape1.x === shape2.x &&
                   shape1.y === shape2.y &&
                   shape1.width === shape2.width &&
                   shape1.height === shape2.height &&
                   shape1.text === shape2.text &&
                   shape1.fill === shape2.fill &&
                   shape1.stroke === shape2.stroke;
        }

        areConnectionsEqual(conn1, conn2) {
            return conn1.id === conn2.id &&
                   conn1.from === conn2.from &&
                   conn1.to === conn2.to &&
                   conn1.type === conn2.type;
        }

        // ==================== UNDO / REDO ====================
        undo() {
            if (!this.canUndo()) {
                console.warn('⚠️ Undo yoxdur - başında olunuz');
                return;
            }

            this.historyIndex--;
            this.restoreFromHistory();
            console.log(`↩️ Undo: Index ${this.historyIndex}`);
        }

        redo() {
            if (!this.canRedo()) {
                console.warn('⚠️ Redo yoxdur - sonunda olunuz');
                return;
            }

            this.historyIndex++;
            this.restoreFromHistory();
            console.log(`↪️ Redo: Index ${this.historyIndex}`);
        }

        // ==================== RESTORE STATE ====================
        restoreFromHistory() {
            if (this.historyIndex < 0 || this.historyIndex >= this.history.length) {
                console.error('❌ Səhv history indeksi:', this.historyIndex);
                return;
            }

            this.isRestoringFromHistory = true;

            try {
                const state = this.history[this.historyIndex];

                // Shapes restore
                this.diagramTool.shapes = state.shapes.map(shapeData => {
                    const shape = this.diagramTool.shapeManager.createShape(shapeData);
                    return shape;
                });

                // Connections restore
                this.diagramTool.connections = this.deepCloneConnections.call({
                    diagramTool: { connections: state.connections }
                });

                // Selected shapes restore
                this.diagramTool.selectedShapes = new Set(state.selectedShapes);

                // UI update
                this.diagramTool.draw();
                this.diagramTool.updateLayersList();
                this.diagramTool.updateStatusBar();

            } finally {
                this.isRestoringFromHistory = false;
            }
        }

        // ==================== STATE CHECKS ====================
        canUndo() {
            return this.historyIndex > 0;
        }

        canRedo() {
            return this.historyIndex < this.history.length - 1;
        }

        isEmpty() {
            return this.history.length === 0;
        }

        // ==================== CLEAR HISTORY ====================
        clearHistory() {
            this.history = [];
            this.historyIndex = -1;
            console.log('🗑️ History cleared');
        }

        // ==================== DEBUG ====================
        logHistory() {
            console.group('📋 History Debug');
            console.log('Current index:', this.historyIndex);
            console.log('Total states:', this.history.length);
            console.log('Can undo:', this.canUndo());
            console.log('Can redo:', this.canRedo());

            this.history.forEach((state, index) => {
                const marker = index === this.historyIndex ? '👉' : '  ';
                console.log(`${marker} [${index}] Shapes: ${state.shapes.length}, Connections: ${state.connections.length}`);
            });

            console.groupEnd();
        }

        // ==================== EXPORT/IMPORT ====================
        getHistorySnapshot() {
            return {
                history: this.history,
                index: this.historyIndex,
                timestamp: new Date().toISOString()
            };
        }

        restoreFromSnapshot(snapshot) {
            if (!snapshot || !snapshot.history) {
                console.error('❌ Səhv snapshot formatı');
                return false;
            }

            this.history = snapshot.history;
            this.historyIndex = snapshot.index;
            console.log('✅ History snapshot restored');
            return true;
        }
    }

    window.HistoryManager = HistoryManager;
})();