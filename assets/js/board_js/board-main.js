// board-main.js - Board tətbiqinin giriş nöqtəsi
(function() {
    class BoardApp {
        constructor() {
            this.container = document.getElementById('boardStage');
            this.currentUuid = null;
            this.dirty = false;
            this.saving = false;
            this.pendingSave = false;
            this.autoSaveTimer = null;
            this.toastTimer = null;

            // Konva səhnəsi
            this.stage = new Konva.Stage({
                container: 'boardStage',
                width: this.container.clientWidth,
                height: this.container.clientHeight
            });
            this.mainLayer = new Konva.Layer();
            this.overlayLayer = new Konva.Layer();
            this.stage.add(this.mainLayer, this.overlayLayer);

            // Modullar
            this.state = new BoardState();
            this.history = new BoardHistory();
            this.api = new BoardApi();
            this.textEditor = new BoardTextEditor(this);
            this.selection = new BoardSelection(this);
            this.tools = new BoardTools(this);
            this.connectors = new BoardConnectors(this);
            this.viewport = new BoardViewport(this);
            this.contextToolbar = new BoardContextToolbar(this);
            this.connectorToolbar = new BoardConnectorToolbar(this);
            this.pen = new BoardPen(this);
        }

        async init() {
            this.bindHeaderUI();
            this.bindZoomUI();
            this.bindHistoryUI();
            this.bindKeyboard();
            this.bindResize();
            this.bindBoardsModal();

            const params = new URLSearchParams(window.location.search);
            const boardId = params.get('id');

            if (boardId) {
                await this.loadBoard(boardId);
            } else {
                this.startNewOrDraft();
            }

            this.tools.setTool('select');
            this.viewport.apply();
            this.history.reset(this.state.doc);
            this.updateHistoryUI();

            if (!this.api.isAuthenticated()) {
                this.setSaveStatus('offline');
                this.showToast('Giriş edilməyib — dəyişikliklər yalnız bu brauzerdə saxlanılacaq');
            }

            // Web fontlar yüklənəndə mətn ölçülərini yenidən hesabla
            if (document.fonts && document.fonts.ready) {
                document.fonts.ready.then(() => this.render());
            }
        }

        startNewOrDraft() {
            if (!this.api.isAuthenticated()) {
                const draft = this.api.loadDraft();
                if (draft) {
                    this.state.setDoc(draft.doc);
                    document.getElementById('boardName').value = draft.name || 'Adsız board';
                    this.render();
                    return;
                }
            }
            this.state.setDoc(BoardState.emptyDoc());
            this.render();
        }

        async loadBoard(uuid) {
            try {
                this.setSaveStatus('loading');
                const data = await this.api.getBoard(uuid);

                if (BoardState.isBoardDoc(data.diagram_data)) {
                    const doc = data.diagram_data;
                    if (!doc.viewport) doc.viewport = { x: 0, y: 0, zoom: 1 };
                    this.state.setDoc(doc);
                    this.currentUuid = data.uuid || data.id || uuid;
                    document.getElementById('boardName').value = data.name || 'Adsız board';
                    this.setSaveStatus('saved');
                } else {
                    // Köhnə diaqram formatı — üstünə yazmamaq üçün yeni board kimi aç
                    this.state.setDoc(BoardState.emptyDoc());
                    this.currentUuid = null;
                    this.showToast('Bu sənəd köhnə diaqram formatındadır — boş board açıldı');
                    this.setSaveStatus('');
                }
            } catch (error) {
                console.error('Board yüklənmədi:', error);
                this.state.setDoc(BoardState.emptyDoc());
                this.currentUuid = null;
                this.showToast('Board yüklənə bilmədi: ' + error.message);
                this.setSaveStatus('error');
            }
            this.render();
        }

        // ==================== Render ====================
        render() {
            if (this.textEditor.isEditing()) this.textEditor.commit();

            this.mainLayer.destroyChildren();
            if (this.connectors) this.connectors.prepareDocument();
            const ordered = this.state.elements
                .filter(el => el.type === 'connector')
                .concat(this.state.elements.filter(el => el.type !== 'connector'));
            for (const el of ordered) {
                const node = BoardElements.buildNode(el, this);
                if (node) this.mainLayer.add(node);
            }
            this.mainLayer.batchDraw();
            if (this.connectors) this.connectors.refreshAll(true);
            this.selection.refresh();
        }

        // ==================== Dəyişiklik / tarixçə ====================
        commit() {
            this.history.push(this.state.doc);
            this.updateHistoryUI();
            this.markDirty();
        }

        markDirty() {
            this.dirty = true;
            if (this.saving) {
                this.pendingSave = true;
                return;
            }
            this.setSaveStatus('pending');
            clearTimeout(this.autoSaveTimer);
            this.autoSaveTimer = setTimeout(() => this.saveNow(), BoardConfig.AUTOSAVE_DELAY);
        }

        undo() {
            const doc = this.history.undo();
            if (!doc) return;
            doc.viewport = this.state.viewport; // undo görünüşü dəyişməsin
            this.state.setDoc(doc);
            this.render();
            this.updateHistoryUI();
            this.markDirty();
        }

        redo() {
            const doc = this.history.redo();
            if (!doc) return;
            doc.viewport = this.state.viewport;
            this.state.setDoc(doc);
            this.render();
            this.updateHistoryUI();
            this.markDirty();
        }

        // ==================== Saxlama ====================
        buildPayload() {
            const doc = JSON.parse(JSON.stringify(this.state.doc));
            doc.meta = {
                thumbnail: this.makeThumbnail(),
                saved_at: new Date().toISOString(),
                element_count: doc.elements.length,
                tool_version: 'guven-board/0.1'
            };

            return {
                name: document.getElementById('boardName').value.trim() || 'Adsız board',
                description: '',
                category: 'whiteboard',
                tags: ['board'],
                is_public: false,
                diagram_data: doc
            };
        }

        makeThumbnail() {
            if (!this.state.elements.length) return null;
            try {
                this.overlayLayer.visible(false);
                const scale = Math.min(1, 320 / this.stage.width());
                const dataUrl = this.stage.toDataURL({ pixelRatio: scale });
                return dataUrl;
            } catch (error) {
                console.warn('Thumbnail yaradıla bilmədi:', error);
                return null;
            } finally {
                this.overlayLayer.visible(true);
            }
        }

        async saveNow() {
            clearTimeout(this.autoSaveTimer);
            if (this.saving) {
                this.pendingSave = true;
                return;
            }

            const name = document.getElementById('boardName').value.trim() || 'Adsız board';

            if (!this.api.isAuthenticated()) {
                this.api.saveDraft(this.state.doc, name);
                this.dirty = false;
                this.setSaveStatus('offline');
                return;
            }

            this.saving = true;
            this.setSaveStatus('saving');

            try {
                const payload = this.buildPayload();

                if (this.currentUuid) {
                    await this.api.updateBoard(this.currentUuid, payload);
                } else {
                    const result = await this.api.createBoard(payload);
                    this.currentUuid = result.uuid || result.id || null;
                    if (this.currentUuid) {
                        const url = new URL(window.location.href);
                        url.searchParams.set('id', this.currentUuid);
                        window.history.replaceState(null, '', url.toString());
                    }
                }

                this.dirty = false;
                this.setSaveStatus('saved');
            } catch (error) {
                console.error('Saxlama xətası:', error);
                if (error.code === 401) {
                    this.setSaveStatus('offline');
                    this.showToast('Sessiya bitib — yenidən giriş edin. Dəyişikliklər lokal saxlanılır.');
                    this.api.saveDraft(this.state.doc, name);
                } else {
                    this.setSaveStatus('error');
                }
            } finally {
                this.saving = false;
                if (this.pendingSave) {
                    this.pendingSave = false;
                    this.markDirty();
                }
            }
        }

        setSaveStatus(status) {
            const elStatus = document.getElementById('saveStatus');
            const map = {
                '': '',
                loading: 'Yüklənir…',
                pending: 'Dəyişikliklər var…',
                saving: 'Yadda saxlanılır…',
                saved: 'Saxlanıldı',
                offline: 'Lokal rejim',
                error: 'Saxlanıla bilmədi!'
            };
            elStatus.textContent = map[status] || '';
            elStatus.className = 'save-status ' + status;
        }

        // ==================== UI ====================
        updateSelectionUI() {
            if (this.contextToolbar) this.contextToolbar.update();
            if (this.connectorToolbar) this.connectorToolbar.update();
            if (this.connectors) this.connectors.refreshHandles();
        }

        updateHistoryUI() {
            document.getElementById('undoBtn').disabled = !this.history.canUndo();
            document.getElementById('redoBtn').disabled = !this.history.canRedo();
        }

        bindHeaderUI() {
            document.getElementById('boardName').addEventListener('change', () => this.markDirty());
            document.getElementById('saveBtn').addEventListener('click', () => this.saveNow());
            document.getElementById('newBoardBtn').addEventListener('click', () => {
                window.location.href = 'board.html';
            });

            window.addEventListener('beforeunload', (e) => {
                if (this.dirty && this.api.isAuthenticated()) {
                    e.preventDefault();
                    e.returnValue = '';
                }
            });
        }

        bindZoomUI() {
            document.getElementById('zoomIn').addEventListener('click', () =>
                this.viewport.zoomByFactor(BoardConfig.ZOOM_BTN_FACTOR));
            document.getElementById('zoomOut').addEventListener('click', () =>
                this.viewport.zoomByFactor(1 / BoardConfig.ZOOM_BTN_FACTOR));
            document.getElementById('zoomLabel').addEventListener('click', () =>
                this.viewport.resetZoom());
            document.getElementById('zoomFit').addEventListener('click', () =>
                this.viewport.fitToContent());
        }

        bindHistoryUI() {
            document.getElementById('undoBtn').addEventListener('click', () => this.undo());
            document.getElementById('redoBtn').addEventListener('click', () => this.redo());
        }

        bindResize() {
            const sync = () => {
                this.stage.width(this.container.clientWidth);
                this.stage.height(this.container.clientHeight);
                this.viewport.apply();
            };
            sync();

            // CSS gec yüklənəndə və panel ölçüsü dəyişəndə də işləsin
            if (window.ResizeObserver) {
                new ResizeObserver(sync).observe(this.container);
            } else {
                window.addEventListener('resize', sync);
            }
        }

        bindKeyboard() {
            document.addEventListener('keydown', (e) => {
                const target = e.target;
                if (target.closest && target.closest('input, textarea, select, [contenteditable]')) {
                    return;
                }

                const ctrl = e.ctrlKey || e.metaKey;

                if (e.code === 'Space' && !e.repeat) {
                    e.preventDefault();
                    this.tools.beginTempPan();
                    return;
                }

                if (ctrl && e.key.toLowerCase() === 'z') {
                    e.preventDefault();
                    if (e.shiftKey) this.redo();
                    else this.undo();
                } else if (ctrl && e.key.toLowerCase() === 'y') {
                    e.preventDefault();
                    this.redo();
                } else if (ctrl && e.key.toLowerCase() === 's') {
                    e.preventDefault();
                    this.saveNow();
                } else if (ctrl && e.key.toLowerCase() === 'c') {
                    e.preventDefault();
                    this.selection.copySelected();
                } else if (ctrl && e.key.toLowerCase() === 'v') {
                    e.preventDefault();
                    this.selection.paste();
                } else if (ctrl && e.key.toLowerCase() === 'd') {
                    e.preventDefault();
                    this.selection.duplicateSelected();
                } else if (ctrl && e.key.toLowerCase() === 'a') {
                    e.preventDefault();
                    this.selection.select(this.state.elements.map(el => el.id));
                } else if (ctrl && e.key.toLowerCase() === 'b') {
                    e.preventDefault();
                    this.contextToolbar.toggleTextFlag('bold');
                } else if (ctrl && e.key.toLowerCase() === 'i') {
                    e.preventDefault();
                    this.contextToolbar.toggleTextFlag('italic');
                } else if (ctrl && e.key.toLowerCase() === 'u') {
                    e.preventDefault();
                    this.contextToolbar.toggleTextFlag('underline');
                } else if (e.key === 'Delete' || e.key === 'Backspace') {
                    this.selection.deleteSelected();
                } else if (e.key === 'Escape') {
                    if (this.connectors && this.connectors.hideEndpointMenu()) return;
                    if (this.connectorToolbar && this.connectorToolbar.closeOpenPops()) return;
                    if (this.contextToolbar.closeOpenPops()) return;
                    if (this.tools.shapeMenu.isOpen() && this.tools.current !== 'shape') {
                        this.tools.shapeMenu.close();
                        return;
                    }
                    if (this.tools.current !== 'select') this.tools.setTool('select');
                    else this.selection.clear();
                } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    this.selection.nudge(e.shiftKey ? -10 : -1, 0);
                } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    this.selection.nudge(e.shiftKey ? 10 : 1, 0);
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    this.selection.nudge(0, e.shiftKey ? -10 : -1);
                } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    this.selection.nudge(0, e.shiftKey ? 10 : 1);
                } else if (e.key.toLowerCase() === 'v') {
                    this.tools.setTool('select');
                } else if (e.key.toLowerCase() === 'h') {
                    this.tools.setTool('hand');
                } else if (e.key.toLowerCase() === 'n') {
                    this.tools.setTool('sticky');
                } else if (e.key.toLowerCase() === 't') {
                    this.tools.setTool('text');
                } else if (!ctrl && e.key.toLowerCase() === 'p') {
                    this.tools.setTool('pen');
                } else if (!ctrl && e.key.toLowerCase() === 's') {
                    this.tools.shapeMenu.toggle();
                }
            });

            document.addEventListener('keyup', (e) => {
                if (e.code === 'Space') {
                    this.tools.endTempPan();
                }
            });
        }

        // ==================== Boardlarım modalı ====================
        bindBoardsModal() {
            const modal = document.getElementById('boardsModal');

            document.getElementById('myBoardsBtn').addEventListener('click', () => {
                modal.classList.remove('hidden');
                this.loadBoardsList();
            });
            document.getElementById('closeBoardsModal').addEventListener('click', () => {
                modal.classList.add('hidden');
            });
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.add('hidden');
            });
        }

        async loadBoardsList() {
            const list = document.getElementById('boardsList');
            list.innerHTML = '<div class="boards-empty">Yüklənir…</div>';

            if (!this.api.isAuthenticated()) {
                list.innerHTML = '<div class="boards-empty">Boardlarınızı görmək üçün giriş edin</div>';
                return;
            }

            try {
                const result = await this.api.listMyDiagrams(1, 50);
                const items = (result.diagrams || []).filter(d => {
                    let tags = d.tags;
                    if (typeof tags === 'string') {
                        try { tags = JSON.parse(tags); } catch (e) { tags = [tags]; }
                    }
                    return (Array.isArray(tags) && tags.includes('board'))
                        || d.category === 'whiteboard';
                });

                if (!items.length) {
                    list.innerHTML = '<div class="boards-empty">Hələ heç bir board yoxdur</div>';
                    return;
                }

                list.innerHTML = '';
                for (const item of items) {
                    const row = document.createElement('div');
                    row.className = 'boards-item';
                    const date = item.updated_at || item.created_at || '';
                    row.innerHTML =
                        `<i class="fas fa-chalkboard"></i>` +
                        `<span class="boards-item-name"></span>` +
                        `<span class="boards-item-date">${date ? new Date(date).toLocaleString() : ''}</span>`;
                    row.querySelector('.boards-item-name').textContent = item.name || 'Adsız board';
                    row.addEventListener('click', () => {
                        window.location.href = 'board.html?id=' + (item.uuid || item.id);
                    });
                    list.appendChild(row);
                }
            } catch (error) {
                list.innerHTML = '<div class="boards-empty">Siyahı yüklənə bilmədi</div>';
            }
        }

        // ==================== Toast ====================
        showToast(message) {
            const toast = document.getElementById('toast');
            toast.textContent = message;
            toast.classList.remove('hidden');
            clearTimeout(this.toastTimer);
            this.toastTimer = setTimeout(() => toast.classList.add('hidden'), 3000);
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        if (!window.Konva) {
            document.body.innerHTML =
                '<div style="padding:40px;font-family:sans-serif;text-align:center">' +
                'Konva kitabxanası yüklənə bilmədi. İnternet bağlantısını yoxlayın.</div>';
            return;
        }
        try {
            window.boardApp = new BoardApp();
            window.boardApp.init();
        } catch (error) {
            console.error('Board başladıla bilmədi:', error);
            document.body.innerHTML =
                '<div style="padding:40px;font-family:sans-serif;text-align:center">' +
                'Board yüklənərkən xəta baş verdi. Səhifəni yeniləyin (Ctrl+F5).<br>' +
                '<code style="color:#c0392b">' + error.message + '</code></div>';
        }
    });
})();
