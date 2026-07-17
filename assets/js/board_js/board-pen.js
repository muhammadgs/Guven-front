// board-pen.js - Sərbəst qələm aləti: çəkmə axını, hamarlama, nöqtə sadələşdirmə
(function() {
    // ==================== Ramer-Douglas-Peucker sadələşdirmə ====================
    function perpendicularDistance(x, y, x1, y1, x2, y2) {
        const dx = x2 - x1, dy = y2 - y1;
        const len = Math.hypot(dx, dy);
        if (len === 0) return Math.hypot(x - x1, y - y1);
        const t = ((x - x1) * dx + (y - y1) * dy) / (len * len);
        const px = x1 + t * dx, py = y1 + t * dy;
        return Math.hypot(x - px, y - py);
    }

    function rdp(points, tolerance) {
        const n = points.length / 2;
        if (n < 3) return points;

        const x1 = points[0], y1 = points[1];
        const x2 = points[points.length - 2], y2 = points[points.length - 1];

        let maxDist = 0, index = 0;
        for (let i = 1; i < n - 1; i++) {
            const d = perpendicularDistance(points[i * 2], points[i * 2 + 1], x1, y1, x2, y2);
            if (d > maxDist) {
                maxDist = d;
                index = i;
            }
        }

        if (maxDist > tolerance) {
            const left = rdp(points.slice(0, (index + 1) * 2), tolerance);
            const right = rdp(points.slice(index * 2), tolerance);
            return left.slice(0, -2).concat(right);
        }
        return [x1, y1, x2, y2];
    }

    // ==================== Qələm aləti ====================
    class BoardPen {
        constructor(app) {
            this.app = app;
            this.drawing = false;
            this.raw = [];
            this.pointerId = null;
            this.previewLine = null;

            this.color = localStorage.getItem(BoardConfig.PEN_COLOR_KEY) || BoardConfig.DEFAULT_PEN_COLOR;
            this.width = Number(localStorage.getItem(BoardConfig.PEN_WIDTH_KEY)) || BoardConfig.DEFAULT_PEN_WIDTH;

            this.panel = document.getElementById('penPanel');
            this.buildPanel();
            this.bindEvents();
        }

        // ==================== Rəng / qalınlıq paneli ====================
        buildPanel() {
            const colorsHtml = BoardConfig.PEN_COLORS.map(c =>
                `<button class="pen-swatch" data-color="${c}" style="background:${c}" title="${c}"></button>`
            ).join('');

            const widthsHtml = BoardConfig.PEN_WIDTHS.map(w =>
                `<button class="pen-width-btn" data-width="${w}" title="${w}px">` +
                `<span class="pen-width-dot" style="width:${Math.min(w, 16)}px;height:${Math.min(w, 16)}px"></span>` +
                `</button>`
            ).join('');

            this.panel.innerHTML =
                `<div class="pen-colors">${colorsHtml}</div>` +
                `<div class="pen-divider"></div>` +
                `<div class="pen-widths">${widthsHtml}</div>`;

            this.panel.querySelectorAll('[data-color]').forEach(b =>
                b.addEventListener('click', () => {
                    this.color = b.dataset.color;
                    localStorage.setItem(BoardConfig.PEN_COLOR_KEY, this.color);
                    this.syncPanelState();
                }));

            this.panel.querySelectorAll('[data-width]').forEach(b =>
                b.addEventListener('click', () => {
                    this.width = Number(b.dataset.width);
                    localStorage.setItem(BoardConfig.PEN_WIDTH_KEY, String(this.width));
                    this.syncPanelState();
                }));

            this.syncPanelState();
        }

        syncPanelState() {
            this.panel.querySelectorAll('[data-color]').forEach(b =>
                b.classList.toggle('active', b.dataset.color === this.color));
            this.panel.querySelectorAll('[data-width]').forEach(b =>
                b.classList.toggle('active', Number(b.dataset.width) === this.width));
        }

        updatePanel() {
            this.panel.classList.toggle('hidden', this.app.tools.current !== 'pen');
        }

        // ==================== Koordinat çevrilməsi ====================
        getWorldPos(e) {
            const rect = this.app.container.getBoundingClientRect();
            const vp = this.app.state.viewport;
            const sx = e.clientX - rect.left;
            const sy = e.clientY - rect.top;
            return { x: (sx - vp.x) / vp.zoom, y: (sy - vp.y) / vp.zoom };
        }

        // ==================== Çəkmə axını ====================
        bindEvents() {
            const app = this.app;
            const el = app.container;

            el.addEventListener('pointerdown', (e) => {
                if (app.tools.current !== 'pen' || app.tools.tempPan) return;
                if (e.button !== 0) return;
                e.preventDefault();

                this.pointerId = e.pointerId;
                try { el.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
                this.start(e);
            });

            el.addEventListener('pointermove', (e) => {
                if (!this.drawing || e.pointerId !== this.pointerId) return;
                this.extend(e);
            });

            const finish = (e) => {
                if (!this.drawing) return;
                if (e && e.pointerId !== undefined && e.pointerId !== this.pointerId) return;
                this.finish();
            };
            el.addEventListener('pointerup', finish);
            el.addEventListener('pointercancel', finish);
            window.addEventListener('blur', () => finish());
        }

        start(e) {
            const pos = this.getWorldPos(e);
            this.drawing = true;
            this.raw = [pos.x, pos.y];

            this.previewLine = new Konva.Line({
                points: this.raw,
                stroke: this.color,
                strokeWidth: this.width,
                lineCap: 'round',
                lineJoin: 'round',
                tension: 0.35,
                listening: false
            });
            this.app.mainLayer.add(this.previewLine);
            this.app.mainLayer.batchDraw();
        }

        extend(e) {
            const pos = this.getWorldPos(e);
            const lx = this.raw[this.raw.length - 2];
            const ly = this.raw[this.raw.length - 1];
            if (Math.hypot(pos.x - lx, pos.y - ly) < BoardConfig.PEN_MIN_DIST) return;

            this.raw.push(pos.x, pos.y);
            this.previewLine.points(this.raw);
            this.app.mainLayer.batchDraw();
        }

        finish() {
            this.drawing = false;
            if (this.pointerId !== null) {
                try { this.app.container.releasePointerCapture(this.pointerId); } catch (err) { /* noop */ }
                this.pointerId = null;
            }
            if (this.previewLine) {
                this.previewLine.destroy();
                this.previewLine = null;
                this.app.mainLayer.batchDraw();
            }

            if (this.raw.length < 2) {
                this.raw = [];
                return;
            }

            // Tək nöqtəyə klik - kiçik nöqtə kimi saxla
            if (this.raw.length === 2) {
                this.raw.push(this.raw[0] + 0.1, this.raw[1] + 0.1);
            }

            const simplified = rdp(this.raw, BoardConfig.PEN_SIMPLIFY_TOLERANCE);
            this.raw = [];

            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (let i = 0; i < simplified.length; i += 2) {
                minX = Math.min(minX, simplified[i]);
                maxX = Math.max(maxX, simplified[i]);
                minY = Math.min(minY, simplified[i + 1]);
                maxY = Math.max(maxY, simplified[i + 1]);
            }

            const pad = this.width / 2 + 2;
            const x = Math.round(minX - pad);
            const y = Math.round(minY - pad);
            const width = Math.max(1, Math.round(maxX - minX + pad * 2));
            const height = Math.max(1, Math.round(maxY - minY + pad * 2));

            const points = [];
            for (let i = 0; i < simplified.length; i += 2) {
                points.push(
                    Math.round((simplified[i] - x) * 10) / 10,
                    Math.round((simplified[i + 1] - y) * 10) / 10
                );
            }

            const el = {
                id: BoardState.generateId(),
                type: 'pen',
                x, y, width, height,
                rotation: 0,
                points,
                stroke: this.color,
                strokeWidth: this.width
            };

            this.app.state.addElement(el);
            const node = BoardElements.buildNode(el, this.app);
            this.app.mainLayer.add(node);
            this.app.mainLayer.batchDraw();
            this.app.commit();
        }
    }

    window.BoardPen = BoardPen;
})();
