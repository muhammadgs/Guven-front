// board-tools.js - Alət meneceri (select / hand / sticky) və rəng paleti
(function() {
    function stickyCursorSvg(color) {
        const svg =
            `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">` +
            `<path d="M3 5a2 2 0 0 1 2-2h18a2 2 0 0 1 2 2v12l-8 8H5a2 2 0 0 1-2-2V5z" ` +
            `fill="${color}" stroke="#7a7a7a" stroke-width="1.5"/>` +
            `<path d="M25 17l-8 8v-6a2 2 0 0 1 2-2h6z" fill="rgba(0,0,0,0.15)"/>` +
            `</svg>`;
        return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 14 14, crosshair`;
    }

    function plusCursorSvg() {
        const svg =
            `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">` +
            `<path d="M12 4v16M4 12h16" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round"/>` +
            `<path d="M12 4v16M4 12h16" stroke="#1A1A2E" stroke-width="2.4" stroke-linecap="round"/>` +
            `</svg>`;
        return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 12 12, crosshair`;
    }

    class BoardTools {
        constructor(app) {
            this.app = app;
            this.current = 'select';
            this.tempPan = false;
            this.prevTool = null;
            this.stickyColor = localStorage.getItem(BoardConfig.STICKY_COLOR_KEY)
                || BoardConfig.DEFAULT_STICKY_COLOR;
            this.shapeType = 'rectangle';
            this.shapeMenu = new BoardShapeMenu(app, this);

            this.buildPalette();
            this.bindSidebar();
            this.bindPlacement();
        }

        isSelectMode() {
            return this.current === 'select' && !this.tempPan;
        }

        isPanMode() {
            return this.current === 'hand' || this.tempPan;
        }

        setTool(name) {
            if (this.app.textEditor && this.app.textEditor.isEditing()) {
                this.app.textEditor.commit();
            }

            this.current = name;
            if (name !== 'select' && this.app.selection) {
                this.app.selection.clear();
            }
            if (name !== 'connector' && this.app.connectors) {
                this.app.connectors.cancelDraw();
            }

            this.applyMode();
            this.updateSidebarUI();
            this.updatePalette();
            if (this.shapeMenu) {
                if (name !== 'shape') this.shapeMenu.close();
                this.shapeMenu.update();
            }
            if (this.app.pen) this.app.pen.updatePanel();
            if (this.app.updateSelectionUI) this.app.updateSelectionUI();
        }

        applyMode() {
            const app = this.app;
            const interactive = this.isSelectMode();

            app.mainLayer.listening(interactive);
            app.overlayLayer.listening(interactive);
            for (const node of app.mainLayer.getChildren()) {
                const el = app.state.getElement(node.id());
                let draggable = interactive && !!el && !el.locked;
                if (el && el.type === 'connector') {
                    draggable = draggable && app.connectors && app.connectors.isFreeConnector(el);
                }
                node.draggable(draggable);
            }
            this.updateCursor();
        }

        updateCursor() {
            const container = this.app.container;
            container.classList.toggle('mode-hand', this.isPanMode());

            if (this.current === 'sticky' && !this.tempPan) {
                container.style.cursor = stickyCursorSvg(this.stickyColor);
            } else if (this.current === 'text' && !this.tempPan) {
                container.style.cursor = 'text';
            } else if (this.current === 'pen' && !this.tempPan) {
                container.style.cursor = this.app.pen ? this.app.pen.cursorFor() : 'crosshair';
            } else if (this.current === 'connector' && !this.tempPan) {
                container.style.cursor = 'crosshair';
            } else if (this.current === 'shape' && !this.tempPan) {
                container.style.cursor = plusCursorSvg();
            } else {
                container.style.cursor = '';
            }
        }

        updateSidebarUI() {
            document.querySelectorAll('#toolSidebar .tool-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.tool === this.current);
            });
            const shapesBtn = document.querySelector('#toolSidebar [data-tool="shapes"]');
            if (shapesBtn) {
                shapesBtn.classList.toggle('active',
                    this.current === 'shape' || this.current === 'connector' ||
                    (this.shapeMenu && this.shapeMenu.isOpen()));
            }
        }

        // Space basılı olanda müvəqqəti pan rejimi
        beginTempPan() {
            if (this.tempPan) return;
            this.tempPan = true;
            this.applyMode();
        }

        endTempPan() {
            if (!this.tempPan) return;
            this.tempPan = false;
            this.applyMode();
        }

        // ==================== Sidebar ====================
        bindSidebar() {
            document.querySelectorAll('#toolSidebar .tool-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const tool = btn.dataset.tool;

                    if (btn.classList.contains('disabled')) {
                        this.app.showToast('Bu alət növbəti fazada əlavə olunacaq');
                        return;
                    }

                    if (tool === 'select') {
                        // Toggle: select aktivdirsə hand rejiminə keç
                        this.setTool(this.current === 'select' ? 'hand' : 'select');
                    } else if (tool === 'sticky') {
                        this.setTool(this.current === 'sticky' ? 'select' : 'sticky');
                    } else if (tool === 'text') {
                        this.setTool(this.current === 'text' ? 'select' : 'text');
                    } else if (tool === 'pen') {
                        this.setTool(this.current === 'pen' ? 'select' : 'pen');
                    } else if (tool === 'shapes') {
                        // Menyu açılır; fiqur seçiləndə alət aktivləşir
                        if (this.current === 'shape') {
                            this.setTool('select');
                        } else {
                            this.shapeMenu.toggle();
                        }
                    }
                });
            });
        }

        // ==================== Rəng paleti ====================
        buildPalette() {
            const palette = document.getElementById('stickyPalette');
            palette.innerHTML = '';

            for (const color of BoardConfig.STICKY_COLORS) {
                const swatch = document.createElement('button');
                swatch.className = 'palette-swatch';
                swatch.style.background = color;
                swatch.dataset.color = color;
                swatch.title = color;
                swatch.addEventListener('click', () => {
                    this.stickyColor = color;
                    localStorage.setItem(BoardConfig.STICKY_COLOR_KEY, color);
                    if (this.current !== 'sticky') this.setTool('sticky');
                    this.updatePalette();
                    this.updateCursor();
                });
                palette.appendChild(swatch);
            }
        }

        updatePalette() {
            const palette = document.getElementById('stickyPalette');
            palette.classList.toggle('hidden', this.current !== 'sticky');
            palette.querySelectorAll('.palette-swatch').forEach(sw => {
                sw.classList.toggle('active', sw.dataset.color === this.stickyColor);
            });
        }

        // ==================== Element yerləşdirmə (sticky / text) ====================
        bindPlacement() {
            const app = this.app;

            app.stage.on('mousedown.placement', (e) => {
                if (this.tempPan || e.evt.button !== 0) return;
                if (this.current !== 'sticky' && this.current !== 'text' && this.current !== 'shape') return;

                const pos = app.stage.getRelativePointerPosition();
                let el;
                if (this.current === 'sticky') {
                    el = BoardElements.createStickyNote(pos.x, pos.y, this.stickyColor);
                } else if (this.current === 'shape') {
                    el = BoardElements.createShape(pos.x, pos.y, this.shapeType);
                } else {
                    el = BoardElements.createText(pos.x, pos.y);
                }
                app.state.addElement(el);

                const node = BoardElements.buildNode(el, app);
                app.mainLayer.add(node);
                app.mainLayer.batchDraw();

                this.setTool('select');
                app.selection.select([el.id]);
                app.commit();

                // Yerləşdirən kimi mətn redaktəsini aç
                setTimeout(() => app.textEditor.openFor(el.id), 0);
            });
        }
    }

    window.BoardTools = BoardTools;
})();
