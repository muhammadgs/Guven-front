// board-viewport.js - Sonsuz kətan: pan, zoom, grid
(function() {
    class BoardViewport {
        constructor(app) {
            this.app = app;
            this.panning = false;
            this.lastPointer = null;

            this.bindStageEvents();
            this.bindWindowEvents();
        }

        get vp() {
            return this.app.state.viewport;
        }

        // Sənəddəki viewport-u səhnəyə tətbiq et
        apply() {
            const stage = this.app.stage;
            stage.position({ x: this.vp.x, y: this.vp.y });
            stage.scale({ x: this.vp.zoom, y: this.vp.zoom });
            stage.batchDraw();
            this.updateGrid();
            this.updateZoomLabel();
            if (this.app.contextToolbar) this.app.contextToolbar.position();
        }

        updateGrid() {
            const container = this.app.container;
            let spacing = BoardConfig.GRID_SIZE * this.vp.zoom;
            // Kiçik zoomda nöqtələr sıxlaşmasın deyə addımı böyüt
            while (spacing < 14) spacing *= 2;
            while (spacing > 90) spacing /= 2;

            container.style.backgroundSize = `${spacing}px ${spacing}px`;
            container.style.backgroundPosition = `${this.vp.x}px ${this.vp.y}px`;
        }

        updateZoomLabel() {
            const label = document.getElementById('zoomLabel');
            if (label) label.textContent = Math.round(this.vp.zoom * 100) + '%';
        }

        panBy(dx, dy) {
            this.vp.x += dx;
            this.vp.y += dy;
            this.apply();
        }

        // Verilmiş ekran nöqtəsi sabit qalmaqla zoom
        zoomAt(screenPoint, newZoom) {
            newZoom = Math.max(BoardConfig.ZOOM_MIN, Math.min(BoardConfig.ZOOM_MAX, newZoom));
            const worldX = (screenPoint.x - this.vp.x) / this.vp.zoom;
            const worldY = (screenPoint.y - this.vp.y) / this.vp.zoom;

            this.vp.zoom = newZoom;
            this.vp.x = screenPoint.x - worldX * newZoom;
            this.vp.y = screenPoint.y - worldY * newZoom;
            this.apply();
        }

        zoomByFactor(factor) {
            const stage = this.app.stage;
            const center = { x: stage.width() / 2, y: stage.height() / 2 };
            this.zoomAt(center, this.vp.zoom * factor);
        }

        resetZoom() {
            const stage = this.app.stage;
            this.zoomAt({ x: stage.width() / 2, y: stage.height() / 2 }, 1);
        }

        fitToContent() {
            const stage = this.app.stage;
            const layer = this.app.mainLayer;

            if (layer.getChildren().length === 0) {
                this.vp.x = 0;
                this.vp.y = 0;
                this.vp.zoom = 1;
                this.apply();
                return;
            }

            const box = layer.getClientRect({ relativeTo: stage });
            const padding = 80;
            const vw = stage.width() - padding * 2;
            const vh = stage.height() - padding * 2;

            let zoom = Math.min(vw / box.width, vh / box.height, 1.5);
            zoom = Math.max(BoardConfig.ZOOM_MIN, Math.min(BoardConfig.ZOOM_MAX, zoom));

            this.vp.zoom = zoom;
            this.vp.x = (stage.width() - box.width * zoom) / 2 - box.x * zoom;
            this.vp.y = (stage.height() - box.height * zoom) / 2 - box.y * zoom;
            this.apply();
        }

        // ==================== Hadisələr ====================
        bindStageEvents() {
            const stage = this.app.stage;

            stage.on('wheel', (e) => {
                e.evt.preventDefault();

                if (e.evt.ctrlKey || e.evt.metaKey) {
                    const pointer = stage.getPointerPosition();
                    const factor = e.evt.deltaY > 0
                        ? 1 / BoardConfig.ZOOM_WHEEL_FACTOR
                        : BoardConfig.ZOOM_WHEEL_FACTOR;
                    this.zoomAt(pointer, this.vp.zoom * factor);
                } else if (e.evt.shiftKey) {
                    this.panBy(-(e.evt.deltaY || e.evt.deltaX), 0);
                } else {
                    this.panBy(-e.evt.deltaX, -e.evt.deltaY);
                }
                this.app.markDirty({ skipHistory: true });
            });

            stage.on('mousedown touchstart', (e) => {
                const isMiddle = e.evt.button === 1;
                const handMode = this.app.tools && this.app.tools.isPanMode();

                if (handMode || isMiddle) {
                    if (isMiddle) e.evt.preventDefault();
                    this.startPan();
                }
            });
        }

        bindWindowEvents() {
            window.addEventListener('mousemove', (e) => {
                if (!this.panning) return;
                const dx = e.clientX - this.lastPointer.x;
                const dy = e.clientY - this.lastPointer.y;
                this.lastPointer = { x: e.clientX, y: e.clientY };
                this.panBy(dx, dy);
            });

            window.addEventListener('mouseup', () => {
                if (this.panning) this.endPan();
            });
        }

        startPan() {
            this.panning = true;
            const pos = this.app.stage.getPointerPosition() || { x: 0, y: 0 };
            // window mousemove ilə işləmək üçün ekran koordinatlarını saxla
            const containerRect = this.app.container.getBoundingClientRect();
            this.lastPointer = {
                x: pos.x + containerRect.left,
                y: pos.y + containerRect.top
            };
            this.app.container.classList.add('is-panning');
        }

        endPan() {
            this.panning = false;
            this.app.container.classList.remove('is-panning');
            this.app.markDirty({ skipHistory: true });
        }
    }

    window.BoardViewport = BoardViewport;
})();
