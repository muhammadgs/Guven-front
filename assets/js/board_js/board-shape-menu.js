// board-shape-menu.js - Fiqur seçim menyusu (sidebar popup + "Daha çox fiqur" paneli)
(function() {
    const cicon = (inner) =>
        `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" ` +
        `stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

    // Connector növləri - Faza 5.2-də aktivləşəcək
    const CONNECTOR_ICONS = {
        line: cicon('<path d="M4 20 L20 4"/>'),
        arrow: cicon('<path d="M4 20 L19 5 M12 5 L19 5 L19 12"/>'),
        elbow: cicon('<path d="M4 20 L4 10 L17 10 M13 6 L17 10 L13 14"/>'),
        curve: cicon('<path d="M4 20 C4 9 11 6 17 6 M13 2 L17 6 L13 10"/>')
    };

    class BoardShapeMenu {
        constructor(app, tools) {
            this.app = app;
            this.tools = tools;
            this.openFlag = false;
            this.rootEl = document.getElementById('shapesMenu');
            this.build();
            this.bindOutsideClose();
        }

        isOpen() {
            return this.openFlag;
        }

        build() {
            const connectors = ['line', 'arrow', 'elbow', 'curve'].map(k =>
                `<button class="sm-item sm-conn" data-conn="${k}" title="Connector — növbəti hissədə">${CONNECTOR_ICONS[k]}</button>`
            ).join('');

            const mainGrid = BoardShapes.MAIN.map(t =>
                `<button class="sm-item" data-shapetype="${t}" title="${BoardShapes.label(t)}">${BoardShapes.icon(t, 24)}</button>`
            ).join('');

            this.rootEl.innerHTML = `
                <div class="sm-view" data-view="main">
                    <div class="sm-row">${connectors}</div>
                    <div class="sm-sep"></div>
                    <div class="sm-grid">${mainGrid}</div>
                    <button class="sm-more" id="smMoreBtn">Daha çox fiqur</button>
                </div>
                <div class="sm-view hidden" data-view="more">
                    <div class="sm-head">
                        <button class="sm-back" id="smBackBtn" title="Geri">
                            <i class="fas fa-arrow-left"></i>
                        </button>
                        <span>Daha çox fiqur</span>
                    </div>
                    <div class="sm-sections">${BoardShapes.sectionsHtml('shapetype')}</div>
                </div>
            `;

            this.rootEl.querySelectorAll('[data-shapetype]').forEach(b =>
                b.addEventListener('click', () => this.pick(b.dataset.shapetype)));

            this.rootEl.querySelectorAll('[data-conn]').forEach(b =>
                b.addEventListener('click', () =>
                    this.app.showToast('Connector-lar bu fazanın növbəti hissəsində əlavə olunacaq')));

            this.rootEl.querySelector('#smMoreBtn')
                .addEventListener('click', () => this.showView('more'));
            this.rootEl.querySelector('#smBackBtn')
                .addEventListener('click', () => this.showView('main'));
        }

        showView(name) {
            this.rootEl.querySelectorAll('.sm-view').forEach(v =>
                v.classList.toggle('hidden', v.dataset.view !== name));
        }

        pick(type) {
            this.tools.shapeType = type;
            this.tools.setTool('shape');
            this.update();
        }

        open() {
            this.openFlag = true;
            this.update();
            this.tools.updateSidebarUI();
        }

        close() {
            if (!this.openFlag) return;
            this.openFlag = false;
            this.showView('main');
            this.update();
            this.tools.updateSidebarUI();
        }

        toggle() {
            if (this.openFlag) this.close();
            else this.open();
        }

        update() {
            this.rootEl.classList.toggle('hidden', !this.openFlag);
            const active = this.tools.current === 'shape' ? this.tools.shapeType : null;
            this.rootEl.querySelectorAll('[data-shapetype]').forEach(b =>
                b.classList.toggle('active', b.dataset.shapetype === active));
        }

        bindOutsideClose() {
            document.addEventListener('mousedown', (e) => {
                if (!this.openFlag) return;
                if (this.rootEl.contains(e.target)) return;
                if (e.target.closest && e.target.closest('[data-tool="shapes"]')) return;
                this.close();
            });
        }
    }

    window.BoardShapeMenu = BoardShapeMenu;
})();
