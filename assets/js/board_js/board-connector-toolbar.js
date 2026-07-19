// board-connector-toolbar.js - Connector üçün Miro-tipli üzən format paneli
(function() {
    const icon = (inner, size) =>
        `<svg viewBox="0 0 24 24" width="${size || 22}" height="${size || 22}" fill="none" ` +
        `stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

    const ROUTE_ICONS = {
        straight: icon('<path d="M4 18 L20 6"/>'),
        elbow: icon('<path d="M4 18 L10 18 L10 10 L20 10"/>'),
        curve: icon('<path d="M4 18 C4 8 13 8 20 6"/>')
    };

    const MARKERS = [
        { id: 'none', label: 'Yoxdur' },
        { id: 'arrow', label: 'Ox' },
        { id: 'thin', label: 'İncə ox' },
        { id: 'open', label: 'Açıq ox' },
        { id: 'triangle', label: 'Üçbucaq' }
    ];

    function markerSvg(type, atStart) {
        const flip = atStart ? 'transform="translate(24 0) scale(-1 1)"' : '';
        let marker = '';
        if (type === 'arrow') marker = '<path d="M14 7 L21 12 L14 17"/>';
        else if (type === 'thin') marker = '<path d="M13 9 L21 12 L13 15 Z" fill="currentColor"/>';
        else if (type === 'open') marker = '<path d="M12 5 L21 12 L12 19"/>';
        else if (type === 'triangle') marker = '<path d="M11 6 L21 12 L11 18 Z" fill="currentColor"/>';
        return `<svg viewBox="0 0 24 24" width="30" height="24" fill="none" stroke="currentColor" ` +
            `stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><g ${flip}>` +
            `<path d="M3 12 H20"/>${marker}</g></svg>`;
    }

    class BoardConnectorToolbar {
        constructor(app) {
            this.app = app;
            this.root = document.getElementById('connectorToolbar');
            this.buildDOM();
            this.bindOutsideClose();
        }

        selectedConnector() {
            if (this.app.state.selection.length !== 1) return null;
            const el = this.app.state.getElement(this.app.state.selection[0]);
            return el && el.type === 'connector' ? el : null;
        }

        update() {
            const connector = this.selectedConnector();
            if (!connector || !this.app.tools.isSelectMode()) {
                this.hide();
                return;
            }
            this.root.classList.remove('hidden');
            this.syncState(connector);
            this.position();
        }

        hide() {
            this.root.classList.add('hidden');
            this.closePops();
        }

        position() {
            if (this.root.classList.contains('hidden')) return;
            const connector = this.selectedConnector();
            const node = connector && this.app.stage.findOne('#' + connector.id);
            if (!node) {
                this.hide();
                return;
            }
            const bbox = node.getClientRect();
            const cw = this.app.container.clientWidth;
            const ch = this.app.container.clientHeight;
            const availableWidth = Math.max(1, cw - 16);
            this.root.style.maxWidth = availableWidth + 'px';
            const tw = Math.min(this.root.offsetWidth, availableWidth);
            const th = this.root.offsetHeight;
            let left = bbox.x + bbox.width / 2 - tw / 2;
            left = Math.max(8, Math.min(left, cw - tw - 8));
            let top = bbox.y - th - 14;
            const below = top < 8;
            if (below) top = Math.min(ch - th - 8, bbox.y + bbox.height + 14);
            top = Math.max(8, top);
            this.root.classList.toggle('below', below);
            this.root.style.left = left + 'px';
            this.root.style.top = top + 'px';
        }

        apply(patch) {
            const connector = this.selectedConnector();
            if (!connector) return;
            if (connector.locked) {
                this.app.showToast('Connector kilidlidir');
                return;
            }
            Object.assign(connector, patch);
            this.app.connectors.normalizeConnector(connector);
            this.app.connectors.refreshAll(true);
            this.app.commit();
            this.syncState(connector);
            this.position();
        }

        toggleLock() {
            const connector = this.selectedConnector();
            if (!connector) return;
            connector.locked = !connector.locked;
            this.app.commit();
            this.syncState(connector);
            this.closePops();
        }

        swapMarkers() {
            const connector = this.selectedConnector();
            if (!connector || connector.locked) {
                if (connector && connector.locked) this.app.showToast('Connector kilidlidir');
                return;
            }
            const start = connector.startMarker;
            connector.startMarker = connector.endMarker;
            connector.endMarker = start;
            this.app.connectors.refreshAll(true);
            this.app.commit();
            this.syncState(connector);
        }

        syncState(connector) {
            const start = MARKERS.find(m => m.id === connector.startMarker) || MARKERS[0];
            const end = MARKERS.find(m => m.id === connector.endMarker) || MARKERS[0];
            this.root.querySelector('[data-role="startmarker"]').innerHTML =
                markerSvg(start.id, true) + `<span>${start.label}</span>`;
            this.root.querySelector('[data-role="endmarker"]').innerHTML =
                markerSvg(end.id, false) + `<span>${end.label}</span>`;
            this.root.querySelector('#connectorRouteIcon').innerHTML =
                ROUTE_ICONS[connector.routing] || ROUTE_ICONS.elbow;
            this.root.querySelector('#connectorColorDot').style.background = connector.stroke;

            const lockButton = this.root.querySelector('[data-role="lock"]');
            lockButton.classList.toggle('active', connector.locked);
            lockButton.innerHTML = connector.locked
                ? '<i class="fas fa-lock"></i>'
                : '<i class="fas fa-lock-open"></i>';
            lockButton.title = connector.locked ? 'Kilidi aç' : 'Kilidlə';

            this.root.querySelectorAll('[data-lock-sensitive]').forEach(button => {
                button.disabled = connector.locked;
            });
            const deleteButton = this.root.querySelector('[data-action="delete"]');
            deleteButton.disabled = connector.locked;
            deleteButton.title = connector.locked ? 'Silmək üçün əvvəl kilidi açın' : '';
        }

        openPop(name) {
            const connector = this.selectedConnector();
            if (!connector) return;
            const trigger = this.root.querySelector(`[data-role="${name}"]`);
            if (connector.locked && trigger && trigger.hasAttribute('data-lock-sensitive')) {
                this.app.showToast('Connector kilidlidir');
                return;
            }
            const pop = this.root.querySelector(`[data-pop="${name}"]`);
            const wasOpen = pop && !pop.classList.contains('hidden');
            this.closePops();
            if (!pop || wasOpen) return;
            this.syncPop(name, connector);
            pop.classList.remove('hidden');
            if (trigger) {
                const maxLeft = Math.max(0, this.root.offsetWidth - pop.offsetWidth);
                pop.style.left = Math.min(trigger.offsetLeft, maxLeft) + 'px';
                trigger.setAttribute('aria-expanded', 'true');
            }
            const containerRect = this.app.container.getBoundingClientRect();
            const toolbarRect = this.root.getBoundingClientRect();
            const above = toolbarRect.top - containerRect.top - 8;
            const below = containerRect.bottom - toolbarRect.bottom - 8;
            pop.classList.toggle('pop-above', above > below);
            pop.style.maxHeight = Math.max(110, Math.max(above, below) - 4) + 'px';
        }

        closePops() {
            this.root.querySelectorAll('.ct-pop').forEach(pop => {
                pop.classList.add('hidden');
                pop.classList.remove('pop-above');
                pop.style.maxHeight = '';
            });
            this.root.querySelectorAll('[aria-expanded]').forEach(button =>
                button.setAttribute('aria-expanded', 'false'));
        }

        closeOpenPops() {
            const any = [...this.root.querySelectorAll('.ct-pop')]
                .some(pop => !pop.classList.contains('hidden'));
            if (any) this.closePops();
            return any;
        }

        syncPop(name, connector) {
            const pop = this.root.querySelector(`[data-pop="${name}"]`);
            if (!pop) return;
            if (name === 'startmarker' || name === 'endmarker') {
                const current = name === 'startmarker' ? connector.startMarker : connector.endMarker;
                pop.querySelectorAll('[data-marker]').forEach(button =>
                    button.classList.toggle('active', button.dataset.marker === current));
            } else if (name === 'line') {
                pop.querySelectorAll('[data-routing]').forEach(button =>
                    button.classList.toggle('active', button.dataset.routing === connector.routing));
                pop.querySelectorAll('[data-width]').forEach(button =>
                    button.classList.toggle('active', Number(button.dataset.width) === connector.strokeWidth));
                pop.querySelectorAll('[data-strokestyle]').forEach(button =>
                    button.classList.toggle('active', button.dataset.strokestyle === connector.strokeStyle));
            } else if (name === 'linecolor') {
                pop.querySelectorAll('[data-linecolor]').forEach(button =>
                    button.classList.toggle('active', button.dataset.linecolor === connector.stroke));
            }
        }

        buildDOM() {
            const markerItems = atStart => MARKERS.map(marker =>
                `<button class="conn-marker-item" data-marker="${marker.id}">` +
                `${markerSvg(marker.id, atStart)}<span>${marker.label}</span></button>`
            ).join('');
            const routeItems = [
                ['straight', 'Düz'], ['elbow', '90° qırılmalı'], ['curve', 'Əyri']
            ].map(([id, label]) =>
                `<button data-routing="${id}" title="${label}">${ROUTE_ICONS[id]}<span>${label}</span></button>`
            ).join('');
            const widthItems = BoardConfig.CONNECTOR_WIDTHS.map(width =>
                `<button class="ct-strokew" data-width="${width}" title="${width}px">` +
                `<span style="height:${Math.min(width, 8)}px"></span></button>`
            ).join('');
            const colorItems = BoardConfig.PEN_COLORS.map(color =>
                `<button class="ct-color-swatch round" data-linecolor="${color}" ` +
                `style="background:${color}" title="${color}"></button>`
            ).join('');

            this.root.innerHTML = `
                <div class="ct-main connector-ct-main">
                    <button class="ct-btn conn-end-btn" data-role="startmarker" data-lock-sensitive title="Başlanğıc ucu"></button>
                    <button class="ct-btn conn-swap-btn" data-role="swap" data-lock-sensitive title="Ucları dəyiş">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                    <button class="ct-btn conn-end-btn" data-role="endmarker" data-lock-sensitive title="Son ucu"></button>
                    <span class="ct-divider"></span>
                    <button class="ct-btn conn-route-btn" data-role="line" data-lock-sensitive title="Xətt tipi">
                        <span id="connectorRouteIcon"></span><small>Tip</small>
                    </button>
                    <button class="ct-btn" data-role="linecolor" data-lock-sensitive title="Xətt rəngi">
                        <span class="conn-color-dot" id="connectorColorDot"></span>
                    </button>
                    <span class="ct-divider"></span>
                    <button class="ct-btn" data-role="attach" data-lock-sensitive title="Xəttə element əlavə et">
                        ${icon('<rect x="4" y="5" width="13" height="10" rx="1"/><path d="M18 13 v7 M14.5 16.5 h7"/>')}
                    </button>
                    <span class="ct-divider"></span>
                    <button class="ct-btn" data-role="lock" title="Kilidlə"><i class="fas fa-lock-open"></i></button>
                    <button class="ct-btn" data-role="menu" title="Digər əməliyyatlar"><i class="fas fa-ellipsis-v"></i></button>
                </div>

                <div class="ct-pop conn-marker-pop hidden" data-pop="startmarker">${markerItems(true)}</div>
                <div class="ct-pop conn-marker-pop hidden" data-pop="endmarker">${markerItems(false)}</div>
                <div class="ct-pop conn-line-pop hidden" data-pop="line">
                    <div class="conn-pop-label">Qalınlıq</div>
                    <div class="ct-strokew-row">${widthItems}</div>
                    <div class="ct-pop-sep"></div>
                    <div class="conn-pop-label">Xətt tipi</div>
                    <div class="conn-route-grid">${routeItems}</div>
                    <div class="ct-pop-sep"></div>
                    <div class="conn-pop-label">Xətt stili</div>
                    <div class="conn-stroke-grid">
                        <button data-strokestyle="solid" title="Düz xətt"><span class="conn-stroke solid"></span></button>
                        <button data-strokestyle="dashed" title="Kəsik xətt"><span class="conn-stroke dashed"></span></button>
                        <button data-strokestyle="dotted" title="Nöqtəli xətt"><span class="conn-stroke dotted"></span></button>
                    </div>
                </div>
                <div class="ct-pop ct-pop-colors hidden" data-pop="linecolor">${colorItems}</div>
                <div class="ct-pop conn-attach-pop hidden" data-pop="attach">
                    <div class="sm-grid sm-grid-6">
                        <button class="sm-item" data-attach-kind="text" title="Mətn"><i class="fas fa-font"></i></button>
                        <button class="sm-item" data-attach-kind="sticky" title="Stiker / sticky note"><i class="far fa-sticky-note"></i></button>
                    </div>
                    <div class="sm-sep"></div>
                    <div class="sm-sections">${BoardShapes.sectionsHtml('attachshape')}</div>
                </div>
                <div class="ct-pop ct-pop-menu hidden" data-pop="menu">
                    <button data-action="copy"><i class="fas fa-copy"></i> Kopyala <span class="ct-kbd">Ctrl+C</span></button>
                    <button data-action="duplicate"><i class="fas fa-clone"></i> Dublikat <span class="ct-kbd">Ctrl+D</span></button>
                    <button data-action="delete" class="danger"><i class="fas fa-trash"></i> Sil <span class="ct-kbd">Del</span></button>
                </div>
            `;
            this.bindDOM();
        }

        bindDOM() {
            for (const name of ['startmarker', 'endmarker', 'line', 'linecolor', 'attach', 'menu']) {
                const trigger = this.root.querySelector(`[data-role="${name}"]`);
                trigger.setAttribute('aria-haspopup', 'menu');
                trigger.setAttribute('aria-expanded', 'false');
                trigger.addEventListener('click', () => this.openPop(name));
            }
            this.root.querySelector('[data-role="swap"]').addEventListener('click', () => this.swapMarkers());
            this.root.querySelector('[data-role="lock"]').addEventListener('click', () => this.toggleLock());

            this.root.querySelector('[data-pop="startmarker"]').querySelectorAll('[data-marker]')
                .forEach(button => button.addEventListener('click', () => {
                    this.apply({ startMarker: button.dataset.marker });
                    this.syncPop('startmarker', this.selectedConnector());
                }));
            this.root.querySelector('[data-pop="endmarker"]').querySelectorAll('[data-marker]')
                .forEach(button => button.addEventListener('click', () => {
                    this.apply({ endMarker: button.dataset.marker });
                    this.syncPop('endmarker', this.selectedConnector());
                }));
            this.root.querySelectorAll('[data-routing]').forEach(button =>
                button.addEventListener('click', () => {
                    this.apply({ routing: button.dataset.routing });
                    this.syncPop('line', this.selectedConnector());
                }));
            this.root.querySelectorAll('[data-width]').forEach(button =>
                button.addEventListener('click', () => {
                    this.apply({ strokeWidth: Number(button.dataset.width) });
                    this.syncPop('line', this.selectedConnector());
                }));
            this.root.querySelectorAll('[data-strokestyle]').forEach(button =>
                button.addEventListener('click', () => {
                    this.apply({ strokeStyle: button.dataset.strokestyle });
                    this.syncPop('line', this.selectedConnector());
                }));
            this.root.querySelectorAll('[data-linecolor]').forEach(button =>
                button.addEventListener('click', () => {
                    this.apply({ stroke: button.dataset.linecolor });
                    this.syncPop('linecolor', this.selectedConnector());
                }));

            this.root.querySelectorAll('[data-attach-kind]').forEach(button =>
                button.addEventListener('click', () => {
                    const connector = this.selectedConnector();
                    this.closePops();
                    this.app.connectors.addAttachment(connector, button.dataset.attachKind);
                }));
            this.root.querySelectorAll('[data-attachshape]').forEach(button =>
                button.addEventListener('click', () => {
                    const connector = this.selectedConnector();
                    this.closePops();
                    this.app.connectors.addAttachment(connector, 'shape', button.dataset.attachshape);
                }));

            this.root.querySelector('[data-action="copy"]').addEventListener('click', () => {
                this.closePops();
                this.app.selection.copySelected();
                this.app.showToast('Connector kopyalandı');
            });
            this.root.querySelector('[data-action="duplicate"]').addEventListener('click', () => {
                this.closePops();
                this.app.selection.duplicateSelected();
            });
            this.root.querySelector('[data-action="delete"]').addEventListener('click', () => {
                this.closePops();
                this.app.selection.deleteSelected();
            });
        }

        bindOutsideClose() {
            document.addEventListener('mousedown', event => {
                if (!this.root.contains(event.target)) this.closePops();
            });
        }
    }

    window.BoardConnectorToolbar = BoardConnectorToolbar;
})();
