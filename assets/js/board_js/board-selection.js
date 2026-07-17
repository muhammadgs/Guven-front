// board-selection.js - Seçim, transformer, rubber-band, drag və clipboard
(function() {
    class BoardSelection {
        constructor(app) {
            this.app = app;
            this.clipboard = [];
            this.dragStartPositions = null;

            this.rubberBand = null;
            this.rubberStart = null;
            this.rubberMoved = false;

            this.transformer = new Konva.Transformer({
                rotateEnabled: true,
                rotationSnaps: [0, 45, 90, 135, 180, 225, 270, 315],
                rotationSnapTolerance: 6,
                anchorSize: 9,
                anchorCornerRadius: 5,
                anchorStroke: BoardConfig.SELECTION_COLOR,
                anchorFill: '#FFFFFF',
                borderStroke: BoardConfig.SELECTION_COLOR,
                ignoreStroke: true,
                keepRatio: false,
                boundBoxFunc: (oldBox, newBox) => {
                    const min = 16 * this.app.state.viewport.zoom;
                    if (Math.abs(newBox.width) < min || Math.abs(newBox.height) < min) {
                        return oldBox;
                    }
                    return newBox;
                }
            });
            this.app.overlayLayer.add(this.transformer);

            this.bindEvents();
        }

        // ==================== Seçim əməliyyatları ====================
        getNode(id) {
            return this.app.stage.findOne('#' + id);
        }

        select(ids) {
            this.app.state.setSelection(ids);
            this.refresh();
        }

        toggle(id) {
            const sel = new Set(this.app.state.selection);
            if (sel.has(id)) sel.delete(id);
            else sel.add(id);
            this.select([...sel]);
        }

        clear() {
            this.app.state.clearSelection();
            this.refresh();
        }

        // State-dəki seçimi transformer-ə tətbiq et
        refresh() {
            const nodes = this.app.state.selection
                .map(id => this.getNode(id))
                .filter(Boolean);

            // Yalnız text seçiləndə: künclər fontu böyüdür (nisbət saxlanır),
            // yan tutacaqlar isə eni dəyişir
            const els = this.app.state.selection
                .map(id => this.app.state.getElement(id))
                .filter(Boolean);
            const allText = els.length > 0 && els.every(el => el.type === 'text');

            this.transformer.keepRatio(allText);
            this.transformer.enabledAnchors(allText
                ? ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right']
                : ['top-left', 'top-center', 'top-right', 'middle-left', 'middle-right',
                   'bottom-left', 'bottom-center', 'bottom-right']);

            this.transformer.nodes(nodes);
            this.app.overlayLayer.batchDraw();
            this.app.updateSelectionUI();
        }

        // ==================== Hadisələr ====================
        bindEvents() {
            const app = this.app;
            const stage = app.stage;
            const layer = app.mainLayer;

            // Elementə klik -> seçim
            layer.on('click tap', (e) => {
                if (!app.tools.isSelectMode()) return;
                const group = e.target.findAncestor('.element', true);
                if (!group) return;

                if (e.evt.shiftKey) {
                    this.toggle(group.id());
                } else {
                    this.select([group.id()]);
                }
            });

            // Drag: seçilməmiş elementi dartanda əvvəl seç, çox seçimdə hamısını birgə apar
            layer.on('dragstart', (e) => {
                const group = e.target;
                if (!group.hasName('element')) return;

                if (!app.state.selection.includes(group.id())) {
                    this.select([group.id()]);
                }

                this.dragStartPositions = new Map();
                for (const id of app.state.selection) {
                    const node = this.getNode(id);
                    if (node) this.dragStartPositions.set(id, node.position());
                }

                if (app.contextToolbar) app.contextToolbar.hide();
            });

            layer.on('dragmove', (e) => {
                const group = e.target;
                if (!group.hasName('element') || !this.dragStartPositions) return;

                const start = this.dragStartPositions.get(group.id());
                if (!start) return;
                const dx = group.x() - start.x;
                const dy = group.y() - start.y;

                for (const [id, pos] of this.dragStartPositions) {
                    if (id === group.id()) continue;
                    const node = this.getNode(id);
                    if (node) node.position({ x: pos.x + dx, y: pos.y + dy });
                }
            });

            layer.on('dragend', (e) => {
                const group = e.target;
                if (!group.hasName('element')) return;

                for (const id of app.state.selection) {
                    const node = this.getNode(id);
                    if (node) {
                        app.state.updateElement(id, {
                            x: Math.round(node.x()),
                            y: Math.round(node.y())
                        });
                    }
                }
                this.dragStartPositions = null;
                app.commit();
                app.updateSelectionUI();
            });

            // Transform zamanı toolbar gizlənsin
            this.transformer.on('transformstart', () => {
                if (app.contextToolbar) app.contextToolbar.hide();
            });

            // Transform (resize/rotate) bitəndə scale-i ölçüyə çevir
            this.transformer.on('transformend', () => {
                for (const node of this.transformer.nodes()) {
                    const el = app.state.getElement(node.id());
                    if (!el) continue;

                    const sx = node.scaleX();
                    const sy = node.scaleY();
                    node.scale({ x: 1, y: 1 });

                    if (el.type === 'text') {
                        // Künc (nisbətli) drag fontu böyüdür, yan drag eni dəyişir
                        el.width = Math.max(BoardConfig.TEXT_MIN_WIDTH, Math.round(el.width * sx));
                        if (Math.abs(sy - 1) > 0.01) {
                            el.text.fontSize = Math.max(
                                BoardConfig.FONT_MIN,
                                Math.round(BoardElements.effectiveFontSize(el) * sy)
                            );
                        }
                        el.x = Math.round(node.x());
                        el.y = Math.round(node.y());
                        el.rotation = Math.round(node.rotation() * 100) / 100;
                    } else if (el.type === 'pen') {
                        el.points = el.points.map((v, i) => i % 2 === 0 ? v * sx : v * sy);
                        el.width = Math.max(4, Math.round(el.width * sx));
                        el.height = Math.max(4, Math.round(el.height * sy));
                        const scaleAvg = Math.sqrt(Math.abs(sx * sy));
                        el.strokeWidth = Math.max(1, Math.round(el.strokeWidth * scaleAvg * 10) / 10);
                        el.x = Math.round(node.x());
                        el.y = Math.round(node.y());
                        el.rotation = Math.round(node.rotation() * 100) / 100;
                    } else {
                        app.state.updateElement(node.id(), {
                            x: Math.round(node.x()),
                            y: Math.round(node.y()),
                            width: Math.round(Math.max(BoardConfig.STICKY_MIN_SIZE, el.width * sx)),
                            height: Math.round(Math.max(BoardConfig.STICKY_MIN_SIZE, el.height * sy)),
                            rotation: Math.round(node.rotation() * 100) / 100
                        });
                    }
                    BoardElements.updateNode(node, app.state.getElement(node.id()), app);
                }
                this.transformer.forceUpdate();
                app.commit();
                app.updateSelectionUI();
            });

            // Boş sahədə rubber-band seçim / klik ilə seçimi ləğv
            stage.on('mousedown', (e) => {
                if (e.target !== stage) return;
                if (!app.tools.isSelectMode()) return;
                if (e.evt.button !== 0) return;

                this.rubberStart = stage.getRelativePointerPosition();
                this.rubberMoved = false;
            });

            stage.on('mousemove', () => {
                if (!this.rubberStart) return;
                const pos = stage.getRelativePointerPosition();
                const dx = pos.x - this.rubberStart.x;
                const dy = pos.y - this.rubberStart.y;

                if (!this.rubberMoved) {
                    const screenDist = Math.hypot(dx, dy) * app.state.viewport.zoom;
                    if (screenDist < 4) return;
                    this.rubberMoved = true;
                    this.rubberBand = new Konva.Rect({
                        fill: 'rgba(66, 98, 255, 0.08)',
                        stroke: BoardConfig.SELECTION_COLOR,
                        strokeWidth: 1 / app.state.viewport.zoom,
                        listening: false
                    });
                    app.overlayLayer.add(this.rubberBand);
                }

                this.rubberBand.setAttrs({
                    x: Math.min(this.rubberStart.x, pos.x),
                    y: Math.min(this.rubberStart.y, pos.y),
                    width: Math.abs(dx),
                    height: Math.abs(dy)
                });
                app.overlayLayer.batchDraw();
            });

            stage.on('mouseup', () => {
                if (!this.rubberStart) return;

                if (this.rubberMoved && this.rubberBand) {
                    const band = this.rubberBand.getClientRect({ relativeTo: stage });
                    const hits = [];
                    for (const node of app.mainLayer.getChildren()) {
                        if (!node.hasName('element')) continue;
                        const box = node.getClientRect({ relativeTo: stage });
                        if (Konva.Util.haveIntersection(band, box)) {
                            hits.push(node.id());
                        }
                    }
                    this.select(hits);
                } else {
                    // Boş sahəyə sadə klik -> seçimi ləğv et
                    this.clear();
                }

                if (this.rubberBand) {
                    this.rubberBand.destroy();
                    this.rubberBand = null;
                }
                this.rubberStart = null;
                this.rubberMoved = false;
                app.overlayLayer.batchDraw();
            });
        }

        // ==================== Clipboard və digər əməliyyatlar ====================
        deleteSelected() {
            const ids = [...this.app.state.selection];
            if (!ids.length) return;

            for (const id of ids) {
                const node = this.getNode(id);
                if (node) node.destroy();
            }
            this.app.state.removeElements(ids);
            this.transformer.nodes([]);
            this.app.mainLayer.batchDraw();
            this.app.commit();
            this.app.updateSelectionUI();
        }

        copySelected() {
            const els = this.app.state.selection
                .map(id => this.app.state.getElement(id))
                .filter(Boolean);
            if (!els.length) return;
            this.clipboard = JSON.parse(JSON.stringify(els));
        }

        paste() {
            if (!this.clipboard.length) return;
            const newIds = [];

            for (const src of this.clipboard) {
                const el = JSON.parse(JSON.stringify(src));
                el.id = BoardState.generateId();
                el.x += 24;
                el.y += 24;
                this.app.state.addElement(el);

                const node = BoardElements.buildNode(el, this.app);
                if (node) this.app.mainLayer.add(node);
                newIds.push(el.id);
            }

            // Növbəti paste daha da sürüşsün
            this.clipboard.forEach(src => { src.x += 24; src.y += 24; });

            this.select(newIds);
            this.app.commit();
        }

        duplicateSelected() {
            this.copySelected();
            this.paste();
        }

        nudge(dx, dy) {
            const ids = this.app.state.selection;
            if (!ids.length) return;

            for (const id of ids) {
                const el = this.app.state.getElement(id);
                const node = this.getNode(id);
                if (el && node) {
                    el.x += dx;
                    el.y += dy;
                    node.position({ x: el.x, y: el.y });
                }
            }
            this.app.mainLayer.batchDraw();
            this.app.overlayLayer.batchDraw();
            this.app.commit();
        }
    }

    window.BoardSelection = BoardSelection;
})();
