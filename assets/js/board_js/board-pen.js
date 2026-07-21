// board-pen.js - Çəkim aləti: qələm, marker, silgilər, lasso + çəkim paneli
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

    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

    // ==================== Rəng çevrilmələri (hex <-> RGB <-> HSV) ====================
    // "#abc", "abc", "#aabbcc", "aabbcc" formatlarını qəbul edir
    function normalizeHex(input) {
        if (typeof input !== 'string') return null;
        let hex = input.trim().replace(/^#/, '');
        if (/^[0-9a-fA-F]{3}$/.test(hex)) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }
        if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
        return '#' + hex.toUpperCase();
    }

    function hexToRgb(hex) {
        const norm = normalizeHex(hex);
        if (!norm) return null;
        const int = parseInt(norm.slice(1), 16);
        return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
    }

    function rgbToHex(r, g, b) {
        const to = v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
        return ('#' + to(r) + to(g) + to(b)).toUpperCase();
    }

    function rgbToHsv(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        const d = max - min;
        let h = 0;
        if (d) {
            if (max === r) h = ((g - b) / d) % 6;
            else if (max === g) h = (b - r) / d + 2;
            else h = (r - g) / d + 4;
            h *= 60;
            if (h < 0) h += 360;
        }
        return { h, s: max ? d / max : 0, v: max };
    }

    function hsvToRgb(h, s, v) {
        h = ((h % 360) + 360) % 360;
        const c = v * s;
        const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        const m = v - c;
        const seg = Math.floor(h / 60) % 6;
        const table = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][seg];
        return { r: (table[0] + m) * 255, g: (table[1] + m) * 255, b: (table[2] + m) * 255 };
    }

    function hsvToHex(h, s, v) {
        const { r, g, b } = hsvToRgb(h, s, v);
        return rgbToHex(r, g, b);
    }

    // Nöqtəni elementin lokal koordinatına çevir (rotation nəzərə alınır)
    function toLocal(el, point) {
        const dx = point.x - el.x, dy = point.y - el.y;
        const angle = -(el.rotation || 0) * Math.PI / 180;
        const cos = Math.cos(angle), sin = Math.sin(angle);
        return { x: dx * cos - dy * sin, y: dx * sin + dy * cos };
    }

    function fromLocalDelta(el, dx, dy) {
        const angle = (el.rotation || 0) * Math.PI / 180;
        const cos = Math.cos(angle), sin = Math.sin(angle);
        return { x: dx * cos - dy * sin, y: dx * sin + dy * cos };
    }

    function segmentDistance(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1, dy = y2 - y1;
        const len2 = dx * dx + dy * dy;
        const t = len2 ? clamp(((px - x1) * dx + (py - y1) * dy) / len2, 0, 1) : 0;
        return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
    }

    function cross(ax, ay, bx, by) {
        return ax * by - ay * bx;
    }

    function samepoints(a, b) {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
        return true;
    }

    // İki parça kəsişirsə 0, əks halda 4 uc-parça məsafəsinin minimumu
    function segSegDistance(ax, ay, bx, by, cx, cy, dx, dy) {
        const d1 = cross(bx - ax, by - ay, cx - ax, cy - ay);
        const d2 = cross(bx - ax, by - ay, dx - ax, dy - ay);
        const d3 = cross(dx - cx, dy - cy, ax - cx, ay - cy);
        const d4 = cross(dx - cx, dy - cy, bx - cx, by - cy);
        if (((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0))) return 0;
        return Math.min(
            segmentDistance(ax, ay, cx, cy, dx, dy),
            segmentDistance(bx, by, cx, cy, dx, dy),
            segmentDistance(cx, cy, ax, ay, bx, by),
            segmentDistance(dx, dy, ax, ay, bx, by)
        );
    }

    // ==================== Qismən silgi: cizgini kapsuldan kənarda kəs ====================
    // Silgi bir kadrda A→B yolunu gedir, ona görə hədəf sahə "kapsul"dur (süpürülmüş dairə):
    // beləliklə sürətli hərəkətdə boşluq qalmır.
    //
    // Vacib: toxunulmamış təpələr OLDUĞU KİMİ saxlanılır — yalnız kəsik yerlərinə
    // yeni nöqtə əlavə olunur. Beləliklə silgi cizginin uzağındakı hissəsini pozmur.
    function carveStroke(pts, ax, ay, bx, by, radius, sampleStep, minLength) {
        const n = pts.length >> 1;
        if (!n) return [];

        const inside = (x, y) => segmentDistance(x, y, ax, ay, bx, by) <= radius;

        if (n === 1) return inside(pts[0], pts[1]) ? [] : [[pts[0], pts[1]]];

        const runs = [];
        let cur = [];
        const minLen = minLength || 0;
        // Kəsik nöqtəsi cizginin təpəsinə düşəndə gözlə görünməyən qırıntı qalır —
        // uzunluğu qələmin yarım qalınlığından az olan parçaları atırıq
        const flush = () => {
            if (cur.length >= 4) {
                let len = 0;
                for (let i = 2; i < cur.length; i += 2) {
                    len += Math.hypot(cur[i] - cur[i - 2], cur[i + 1] - cur[i - 1]);
                }
                if (len >= minLen) runs.push(cur);
            }
            cur = [];
        };
        const push = (x, y) => {
            const len = cur.length;
            if (len && Math.abs(cur[len - 2] - x) < 1e-4 && Math.abs(cur[len - 1] - y) < 1e-4) return;
            cur.push(x, y);
        };
        // (x1,y1) kənarda, (x2,y2) içəridə olmalıdır — sərhədin kənar tərəfini qaytarır
        const bisect = (x1, y1, x2, y2) => {
            let lo = 0, hi = 1;
            for (let k = 0; k < 14; k++) {
                const m = (lo + hi) / 2;
                if (inside(x1 + (x2 - x1) * m, y1 + (y2 - y1) * m)) hi = m;
                else lo = m;
            }
            return [x1 + (x2 - x1) * lo, y1 + (y2 - y1) * lo];
        };

        let prevIn = inside(pts[0], pts[1]);
        if (!prevIn) push(pts[0], pts[1]);
        // Yalnız bir nöqtə qalan parça atılmasın deyə minimum uzunluq 2 nöqtədir

        const step = Math.max(0.5, sampleStep);
        for (let i = 0; i + 3 < pts.length; i += 2) {
            const x1 = pts[i], y1 = pts[i + 1];
            const x2 = pts[i + 2], y2 = pts[i + 3];
            const steps = Math.max(1, Math.min(64, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / step)));

            let px = x1, py = y1, pIn = prevIn;
            for (let s = 1; s <= steps; s++) {
                const t = s / steps;
                const qx = x1 + (x2 - x1) * t, qy = y1 + (y2 - y1) * t;
                const qIn = inside(qx, qy);

                if (qIn !== pIn) {
                    const [ex, ey] = qIn ? bisect(px, py, qx, qy) : bisect(qx, qy, px, py);
                    push(ex, ey);
                    if (qIn) flush();       // silinən sahəyə giriş: cari parça bitir
                }
                if (!qIn && s === steps) push(x2, y2);   // orijinal təpəni saxla

                px = qx; py = qy; pIn = qIn;
            }
            prevIn = pIn;
        }
        flush();
        return runs;
    }

    function pointInPolygon(x, y, poly) {
        let inside = false;
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            const xi = poly[i].x, yi = poly[i].y;
            const xj = poly[j].x, yj = poly[j].y;
            if ((yi > y) !== (yj > y) &&
                x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
        }
        return inside;
    }

    // ==================== Çəkim aləti ====================
    class BoardPen {
        constructor(app) {
            this.app = app;
            this.mode = 'pen'; // pen | marker | eraser | partial | lasso
            this.drawing = false;
            this.raw = [];
            this.smooth = null;
            this.pointerId = null;
            this.previewLine = null;
            this.erasedIds = null;
            this.eraseChanged = false;
            this.eraseTouched = null;   // qismən silmədə dəyişən elementlərin id-ləri
            this.lastErase = null;      // silginin əvvəlki mövqeyi (dünya koordinatı)
            this.lassoPoints = null;
            this.eraserCursor = null;
            this.popupFor = null;
            this.customOpen = false;    // "öz rəngin" bölməsi açıqdır?
            this.hsv = null;            // custom picker-in cari çaları/doyması/parlaqlığı
            this.picking = false;       // damcı ilə lövhədən rəng seçilir?
            this.pickCleanup = null;

            this.loadStore();
            this.panel = document.getElementById('penPanel');
            this.popup = null;
            this.buildPanel();
            this.bindEvents();
        }

        // ==================== Swatch yaddaşı ====================
        loadStore() {
            let stored = null;
            try {
                stored = JSON.parse(localStorage.getItem(BoardConfig.DRAW_STORE_KEY));
            } catch (err) { /* noop */ }
            const cloneDefaults = list => list.map(s => ({ color: s.color, width: s.width }));
            const validSwatches = (list, range) => Array.isArray(list) && list.length
                ? list.slice(0, BoardConfig.MAX_DRAW_SWATCHES)
                    .filter(s => s && typeof s.color === 'string' && Number.isFinite(Number(s.width)))
                    .map(s => ({ color: s.color, width: clamp(Number(s.width), range[0], range[1]) }))
                : null;

            this.penSwatches = (stored && validSwatches(stored.pen, BoardConfig.PEN_WIDTH_RANGE))
                || cloneDefaults(BoardConfig.DRAW_PEN_DEFAULTS);
            this.markerSwatches = (stored && validSwatches(stored.marker, BoardConfig.MARKER_WIDTH_RANGE))
                || cloneDefaults(BoardConfig.DRAW_MARKER_DEFAULTS);
            this.penIndex = stored ? clamp(Number(stored.penIndex) || 0, 0, this.penSwatches.length - 1) : 0;
            this.markerIndex = stored ? clamp(Number(stored.markerIndex) || 0, 0, this.markerSwatches.length - 1) : 0;
            this.eraserSize = stored && Number.isFinite(Number(stored.eraserSize))
                ? clamp(Number(stored.eraserSize), BoardConfig.ERASER_SIZE_RANGE[0], BoardConfig.ERASER_SIZE_RANGE[1])
                : BoardConfig.DEFAULT_ERASER_SIZE;
        }

        saveStore() {
            try {
                localStorage.setItem(BoardConfig.DRAW_STORE_KEY, JSON.stringify({
                    pen: this.penSwatches,
                    marker: this.markerSwatches,
                    penIndex: this.penIndex,
                    markerIndex: this.markerIndex,
                    eraserSize: this.eraserSize
                }));
            } catch (err) { /* noop */ }
        }

        activeSwatch() {
            return this.mode === 'marker'
                ? this.markerSwatches[this.markerIndex]
                : this.penSwatches[this.penIndex];
        }

        widthRange() {
            if (this.mode === 'marker') return BoardConfig.MARKER_WIDTH_RANGE;
            if (this.mode === 'partial') return BoardConfig.ERASER_SIZE_RANGE;
            return BoardConfig.PEN_WIDTH_RANGE;
        }

        // ==================== Panel UI ====================
        buildPanel() {
            this.panel.className = 'draw-bar hidden';
            this.panel.innerHTML = `
                <button class="draw-tool" data-drawmode="pen" title="Qələm">
                    <i class="fas fa-pen"></i>
                </button>
                <button class="draw-tool" data-drawmode="marker" title="Marker">
                    <i class="fas fa-highlighter"></i>
                </button>
                <button class="draw-tool draw-tool-disabled" data-drawmode="shapeguess" title="Fiqur təxmini (tezliklə)">
                    <i class="fas fa-magic"></i>
                </button>
                <button class="draw-tool" data-drawmode="eraser" title="Silgi (obyekt)">
                    <i class="fas fa-eraser"></i>
                </button>
                <button class="draw-tool draw-tool-partial" data-drawmode="partial" title="Qismən silgi">
                    <i class="fas fa-eraser"></i><span class="partial-dot"></span>
                </button>
                <button class="draw-tool" data-drawmode="lasso" title="Seçim (lasso)">
                    <i class="fas fa-draw-polygon"></i>
                </button>
                <div class="draw-sep"></div>
                <div class="draw-swatches" id="drawSwatches"></div>
            `;

            this.panel.querySelectorAll('[data-drawmode]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const mode = btn.dataset.drawmode;
                    if (mode === 'shapeguess') {
                        this.app.showToast('Fiqur təxmini növbəti fazada əlavə olunacaq');
                        return;
                    }
                    this.setMode(mode);
                });
            });

            this.buildPopup();
            this.renderSwatches();
            this.syncPanelState();
        }

        setMode(mode) {
            this.mode = mode;
            this.hidePopup();
            this.renderSwatches();
            this.syncPanelState();
            this.app.tools.updateCursor();
            this.removeEraserCursor();
        }

        syncPanelState() {
            this.panel.querySelectorAll('[data-drawmode]').forEach(btn =>
                btn.classList.toggle('active', btn.dataset.drawmode === this.mode));
        }

        // Swatch dairəsi: içindəki nöqtənin ölçüsü qalınlığı göstərir
        swatchDotSize(width, range) {
            const t = (width - range[0]) / (range[1] - range[0]);
            return Math.round(5 + t * 23); // 5px-dən 28px-ə (dairə 30px)
        }

        renderSwatches() {
            const wrap = this.panel.querySelector('#drawSwatches');
            wrap.innerHTML = '';
            const mode = this.mode;

            if (mode === 'eraser' || mode === 'lasso') {
                wrap.classList.add('hidden');
                this.hidePopup();
                return;
            }
            wrap.classList.remove('hidden');

            if (mode === 'partial') {
                // Tək ölçü swatch-ı (rəngsiz, tünd nöqtə) — klik = slider popup
                const btn = document.createElement('button');
                btn.className = 'draw-swatch active';
                const dot = document.createElement('span');
                dot.className = 'draw-swatch-dot';
                const size = this.swatchDotSize(this.eraserSize, BoardConfig.ERASER_SIZE_RANGE);
                dot.style.width = dot.style.height = size + 'px';
                dot.style.background = '#1A1A1A';
                btn.appendChild(dot);
                btn.addEventListener('click', () => this.togglePopup('eraser', btn));
                wrap.appendChild(btn);
                return;
            }

            const swatches = mode === 'marker' ? this.markerSwatches : this.penSwatches;
            const activeIndex = mode === 'marker' ? this.markerIndex : this.penIndex;
            const range = this.widthRange();

            swatches.forEach((swatch, index) => {
                const btn = document.createElement('button');
                btn.className = 'draw-swatch' + (index === activeIndex ? ' active' : '');
                const dot = document.createElement('span');
                dot.className = 'draw-swatch-dot';
                const size = this.swatchDotSize(swatch.width, range);
                dot.style.width = dot.style.height = size + 'px';
                dot.style.background = swatch.color;
                if (mode === 'marker') dot.style.opacity = '0.75';
                btn.appendChild(dot);
                btn.addEventListener('click', () => {
                    if (index === activeIndex) {
                        // Aktiv swatch-a təkrar klik: redaktə popup-ı
                        this.togglePopup('swatch', btn);
                    } else {
                        if (mode === 'marker') this.markerIndex = index;
                        else this.penIndex = index;
                        this.saveStore();
                        this.hidePopup();
                        this.renderSwatches();
                    }
                });
                wrap.appendChild(btn);
            });

            // Plus: yeni swatch (maksimum 10)
            if (swatches.length < BoardConfig.MAX_DRAW_SWATCHES) {
                const plus = document.createElement('button');
                plus.className = 'draw-swatch draw-swatch-plus';
                plus.title = 'Yeni rəng əlavə et';
                plus.innerHTML = '<i class="fas fa-plus"></i>';
                plus.addEventListener('click', () => {
                    const source = swatches[activeIndex];
                    swatches.push({ color: source.color, width: source.width });
                    if (mode === 'marker') this.markerIndex = swatches.length - 1;
                    else this.penIndex = swatches.length - 1;
                    this.saveStore();
                    this.renderSwatches();
                    // Yeni swatch dərhal redaktəyə açılır
                    const buttons = wrap.querySelectorAll('.draw-swatch:not(.draw-swatch-plus)');
                    const btn = buttons[buttons.length - 1];
                    if (btn) this.togglePopup('swatch', btn);
                });
                wrap.appendChild(plus);
            }
        }

        // ==================== Popup (slider + palet) ====================
        buildPopup() {
            const pop = document.createElement('div');
            pop.id = 'drawPopup';
            pop.className = 'draw-popup hidden';
            pop.innerHTML = `
                <input type="range" class="draw-slider" id="drawSlider">
                <div class="draw-popup-palette" id="drawPalette">
                    <div class="draw-palette-title">Bütün rənglər</div>
                    <div class="draw-palette-grid" id="drawPaletteGrid"></div>
                    <div class="draw-custom hidden" id="drawCustom">
                        <div class="draw-sv" id="drawSV"><div class="draw-sv-knob" id="drawSVKnob"></div></div>
                        <div class="draw-hue" id="drawHue"><div class="draw-hue-knob" id="drawHueKnob"></div></div>
                        <div class="draw-hex-row">
                            <input class="draw-hex" id="drawHex" maxlength="7" spellcheck="false" aria-label="Rəng kodu">
                            <button class="draw-eyedropper" id="drawEyedropper" title="Lövhədən rəng götür">
                                <i class="fas fa-eye-dropper"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            this.app.container.parentElement.appendChild(pop);
            this.popup = pop;
            this.bindCustomPicker();

            pop.querySelector('#drawSlider').addEventListener('input', e => {
                const value = Number(e.target.value);
                if (this.popupFor === 'eraser') {
                    this.eraserSize = value;
                } else {
                    const swatch = this.activeSwatch();
                    if (swatch) swatch.width = value;
                }
                this.saveStore();
                this.syncSliderFill();
                this.renderSwatches();
            });

            document.addEventListener('mousedown', e => {
                if (this.popup.classList.contains('hidden')) return;
                if (this.popup.contains(e.target) || this.panel.contains(e.target)) return;
                this.hidePopup();
            });
        }

        togglePopup(kind, anchorBtn) {
            if (!this.popup.classList.contains('hidden') && this.popupFor === kind) {
                this.hidePopup();
                return;
            }
            this.popupFor = kind;
            const slider = this.popup.querySelector('#drawSlider');
            const paletteWrap = this.popup.querySelector('#drawPalette');
            // Popup həmişə palitra ilə açılır, "öz rəngin" bölməsi yığılı qalır
            this.closeCustom();

            if (kind === 'eraser') {
                const range = BoardConfig.ERASER_SIZE_RANGE;
                slider.min = range[0];
                slider.max = range[1];
                slider.value = this.eraserSize;
                paletteWrap.classList.add('hidden');
            } else {
                const range = this.widthRange();
                const swatch = this.activeSwatch();
                slider.min = range[0];
                slider.max = range[1];
                slider.value = swatch.width;
                paletteWrap.classList.remove('hidden');
                this.renderPalette();
            }

            this.syncSliderFill();
            this.popup.classList.remove('hidden');
            this.popupAnchor = anchorBtn;
            this.positionPopup();
        }

        // Panelin sağında, kliklənən swatch-ın hündürlüyündə — ekrandan daşmır
        positionPopup() {
            const anchor = this.popupAnchor;
            if (!anchor || !anchor.isConnected) return;
            const shellRect = this.app.container.parentElement.getBoundingClientRect();
            const panelRect = this.panel.getBoundingClientRect();
            const btnRect = anchor.getBoundingClientRect();
            this.popup.style.left = (panelRect.right - shellRect.left + 10) + 'px';
            const top = clamp(
                btnRect.top - shellRect.top - 20,
                8,
                Math.max(8, shellRect.height - this.popup.offsetHeight - 8)
            );
            this.popup.style.top = top + 'px';
        }

        hidePopup() {
            this.popupFor = null;
            this.closeCustom();
            if (this.popup) this.popup.classList.add('hidden');
        }

        syncSliderFill() {
            const slider = this.popup.querySelector('#drawSlider');
            const min = Number(slider.min), max = Number(slider.max);
            const pct = max > min ? ((Number(slider.value) - min) / (max - min)) * 100 : 0;
            slider.style.background =
                `linear-gradient(to right, #4262FF 0%, #4262FF ${pct}%, #c9cede ${pct}%, #c9cede 100%)`;
        }

        renderPalette() {
            const grid = this.popup.querySelector('#drawPaletteGrid');
            const palette = this.mode === 'marker' ? BoardConfig.MARKER_PALETTE : BoardConfig.PEN_PALETTE;
            grid.innerHTML = '';

            for (const color of palette) {
                const btn = document.createElement('button');
                btn.className = 'draw-palette-color';
                btn.dataset.color = color;
                btn.style.background = color;
                if (color === '#FFFFFF') btn.classList.add('is-white');
                btn.addEventListener('click', () => {
                    this.setSwatchColor(color);
                    this.closeCustom();
                });
                grid.appendChild(btn);
            }

            // Sonuncu xana: öz rəngini seç (palitra + hex + damcı)
            const custom = document.createElement('button');
            custom.className = 'draw-palette-color draw-palette-custom';
            custom.id = 'drawCustomToggle';
            custom.title = 'Öz rəngin';
            custom.innerHTML = '<i class="fas fa-plus"></i>';
            custom.addEventListener('click', () => this.toggleCustom());
            grid.appendChild(custom);

            this.syncPaletteActive();
        }

        // Yalnız seçim nişanını yeniləyir — sürüklərkən bütün şəbəkəni yenidən qurmuruq
        syncPaletteActive() {
            const swatch = this.activeSwatch();
            const current = swatch ? normalizeHex(swatch.color) : null;
            let inPalette = false;

            this.popup.querySelectorAll('.draw-palette-color[data-color]').forEach(btn => {
                const hit = current && normalizeHex(btn.dataset.color) === current;
                if (hit) inPalette = true;
                btn.classList.toggle('active', !!hit);
                btn.innerHTML = hit ? '<i class="fas fa-check"></i>' : '';
            });

            const custom = this.popup.querySelector('#drawCustomToggle');
            if (custom) {
                // Palitrada olmayan rəng seçilibsə, düymə həmin rəngi göstərir
                custom.classList.toggle('active', this.customOpen || (!inPalette && !!current));
                if (!inPalette && current) {
                    custom.style.background = current;
                    custom.innerHTML = '<i class="fas fa-check"></i>';
                } else {
                    custom.style.background = '';
                    custom.innerHTML = '<i class="fas fa-plus"></i>';
                }
            }
        }

        // Aktiv swatch-ın rəngini dəyişir (palitra, hex, damcı — hamısı buradan keçir)
        setSwatchColor(color, opts) {
            const hex = normalizeHex(color);
            if (!hex) return false;
            const swatch = this.activeSwatch();
            if (!swatch) return false;

            swatch.color = hex;
            this.saveStore();
            this.renderSwatches();
            this.syncPaletteActive();
            if (!opts || !opts.keepHexInput) this.syncCustomInputs(hex);
            return true;
        }

        // ==================== Öz rəngin: SV kvadratı + çalar + hex + damcı ====================
        toggleCustom() {
            if (this.customOpen) {
                this.closeCustom();
                return;
            }
            this.customOpen = true;
            this.popup.querySelector('#drawCustom').classList.remove('hidden');
            const swatch = this.activeSwatch();
            this.syncCustomInputs(swatch ? swatch.color : '#000000');
            this.syncPaletteActive();
            this.positionPopup();   // popup uzandı — yenidən yerləşdir
        }

        closeCustom() {
            if (!this.customOpen) return;
            this.customOpen = false;
            const wrap = this.popup.querySelector('#drawCustom');
            if (wrap) wrap.classList.add('hidden');
            this.cancelEyedropper();
            this.syncPaletteActive();
        }

        // Hex -> HSV -> kvadrat/çalar mövqeləri + mətn qutusu
        syncCustomInputs(hex, opts) {
            const norm = normalizeHex(hex);
            if (!norm) return;
            const rgb = hexToRgb(norm);
            const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
            // Ağ/qara üçün çalar müəyyən deyil — əvvəlkini saxlayırıq
            if (hsv.s === 0 && this.hsv) hsv.h = this.hsv.h;
            this.hsv = hsv;
            this.paintCustom(norm, opts);
        }

        paintCustom(hex, opts) {
            const sv = this.popup.querySelector('#drawSV');
            if (!sv) return;
            const svKnob = this.popup.querySelector('#drawSVKnob');
            const hueKnob = this.popup.querySelector('#drawHueKnob');
            const input = this.popup.querySelector('#drawHex');
            const { h, s, v } = this.hsv;

            sv.style.backgroundColor = hsvToHex(h, 1, 1);
            svKnob.style.left = (s * 100) + '%';
            svKnob.style.top = ((1 - v) * 100) + '%';
            svKnob.style.background = hex;
            hueKnob.style.left = (h / 360 * 100) + '%';
            hueKnob.style.background = hsvToHex(h, 1, 1);

            if (!opts || !opts.skipInput) {
                input.value = hex;
                input.classList.remove('is-invalid');
            }
        }

        bindCustomPicker() {
            const pop = this.popup;
            const sv = pop.querySelector('#drawSV');
            const hue = pop.querySelector('#drawHue');
            const input = pop.querySelector('#drawHex');
            const dropper = pop.querySelector('#drawEyedropper');

            // Sahə üzərində sürükləmə: pointer capture ilə kənara çıxsa da davam edir
            const drag = (el, onMove) => {
                const handle = e => {
                    const rect = el.getBoundingClientRect();
                    onMove(
                        clamp((e.clientX - rect.left) / rect.width, 0, 1),
                        clamp((e.clientY - rect.top) / rect.height, 0, 1)
                    );
                };
                el.addEventListener('pointerdown', e => {
                    e.preventDefault();
                    try { el.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
                    handle(e);
                });
                el.addEventListener('pointermove', e => {
                    if (e.buttons !== 1) return;
                    handle(e);
                });
            };

            drag(sv, (px, py) => {
                this.hsv.s = px;
                this.hsv.v = 1 - py;
                const hex = hsvToHex(this.hsv.h, this.hsv.s, this.hsv.v);
                this.paintCustom(hex);
                this.setSwatchColor(hex, { keepHexInput: true });
            });

            drag(hue, px => {
                this.hsv.h = px * 360;
                // Boz/qara rəngdə çalar görünmür — zolaq işə düşəndə rəngi canlandırırıq
                if (this.hsv.s === 0) { this.hsv.s = 1; this.hsv.v = 1; }
                const hex = hsvToHex(this.hsv.h, this.hsv.s, this.hsv.v);
                this.paintCustom(hex);
                this.setSwatchColor(hex, { keepHexInput: true });
            });

            // Hex kodunu əl ilə yazmaq
            input.addEventListener('input', () => {
                const hex = normalizeHex(input.value);
                if (!hex) {
                    input.classList.add('is-invalid');
                    return;
                }
                input.classList.remove('is-invalid');
                this.syncCustomInputs(hex, { skipInput: true });
                this.setSwatchColor(hex, { keepHexInput: true });
            });
            // Fokus itəndə yarımçıq mətni bərpa et
            input.addEventListener('blur', () => {
                const swatch = this.activeSwatch();
                if (swatch) this.syncCustomInputs(swatch.color);
            });
            input.addEventListener('keydown', e => {
                if (e.key === 'Enter') input.blur();
                e.stopPropagation();   // lövhənin qısayolları işə düşməsin
            });

            dropper.addEventListener('click', () => this.startEyedropper());
        }

        async startEyedropper() {
            const btn = this.popup.querySelector('#drawEyedropper');

            // 1) Brauzerin öz damcısı: ekranın istənilən nöqtəsindən rəng götürür
            if (window.EyeDropper) {
                btn.classList.add('active');
                try {
                    const res = await new window.EyeDropper().open();
                    if (res && res.sRGBHex) {
                        this.syncCustomInputs(res.sRGBHex);
                        this.setSwatchColor(res.sRGBHex);
                    }
                } catch (err) { /* istifadəçi imtina etdi */ }
                btn.classList.remove('active');
                return;
            }

            // 2) Ehtiyat yol: lövhə kətanından piksel oxumaq
            this.startStagePick();
        }

        startStagePick() {
            if (this.picking) return;
            const btn = this.popup.querySelector('#drawEyedropper');
            const container = this.app.container;
            this.picking = true;
            btn.classList.add('active');
            container.style.cursor = 'crosshair';
            this.app.showToast('Lövhədən rəng seçmək üçün klikləyin (Esc — imtina)');

            const onDown = e => {
                e.preventDefault();
                e.stopPropagation();
                const hex = this.samplePixel(e.clientX, e.clientY);
                this.cancelEyedropper();
                if (hex) {
                    this.syncCustomInputs(hex);
                    this.setSwatchColor(hex);
                }
            };
            const onKey = e => {
                if (e.key === 'Escape') this.cancelEyedropper();
            };

            this.pickCleanup = () => {
                window.removeEventListener('pointerdown', onDown, true);
                window.removeEventListener('keydown', onKey, true);
                btn.classList.remove('active');
                container.style.cursor = '';
                this.app.tools.updateCursor();
            };
            window.addEventListener('pointerdown', onDown, true);
            window.addEventListener('keydown', onKey, true);
        }

        cancelEyedropper() {
            if (!this.picking) return;
            this.picking = false;
            if (this.pickCleanup) this.pickCleanup();
            this.pickCleanup = null;
        }

        // Kətanın altındakı pikseli oxuyur; boş sahədə lövhənin fon rəngini qaytarır
        samplePixel(clientX, clientY) {
            const container = this.app.container;
            const rect = container.getBoundingClientRect();
            const x = clientX - rect.left, y = clientY - rect.top;
            if (x < 0 || y < 0 || x > rect.width || y > rect.height) return null;

            try {
                const kCanvas = this.app.mainLayer.getCanvas();
                const ratio = kCanvas.getPixelRatio ? kCanvas.getPixelRatio() : 1;
                const ctx = kCanvas._canvas.getContext('2d', { willReadFrequently: true });
                const d = ctx.getImageData(Math.round(x * ratio), Math.round(y * ratio), 1, 1).data;
                if (d[3] > 8) return rgbToHex(d[0], d[1], d[2]);
            } catch (err) { /* kətan oxunmadı — fona keçirik */ }

            // Boş sahə: lövhənin fon rəngi
            const bg = getComputedStyle(container).backgroundColor;
            const m = bg && bg.match(/(\d+),\s*(\d+),\s*(\d+)/);
            return m ? rgbToHex(+m[1], +m[2], +m[3]) : '#FFFFFF';
        }

        updatePanel() {
            const active = this.app.tools.current === 'pen';
            this.panel.classList.toggle('hidden', !active);
            if (!active) {
                this.hidePopup();
                this.removeEraserCursor();
            }
        }

        cursorFor() {
            if (this.mode === 'eraser' || this.mode === 'partial') return 'none';
            return 'crosshair';
        }

        // ==================== Koordinat çevrilməsi ====================
        getWorldPos(e) {
            const rect = this.app.container.getBoundingClientRect();
            const vp = this.app.state.viewport;
            const sx = e.clientX - rect.left;
            const sy = e.clientY - rect.top;
            return { x: (sx - vp.x) / vp.zoom, y: (sy - vp.y) / vp.zoom };
        }

        // Silginin dünya vahidindəki radiusu: ekranda həmişə eyni böyüklükdə görünür
        eraserRadius() {
            const zoom = this.app.state.viewport.zoom || 1;
            const size = this.mode === 'partial' ? this.eraserSize : BoardConfig.OBJECT_ERASER_SIZE;
            return size / 2 / zoom;
        }

        // ==================== Hadisə axını ====================
        bindEvents() {
            const app = this.app;
            const el = app.container;

            el.addEventListener('pointerdown', (e) => {
                if (app.tools.current !== 'pen' || app.tools.tempPan) return;
                if (e.button !== 0) return;
                e.preventDefault();

                if (this.picking) return;   // damcı rejimi: klik rəng seçmək üçündür

                this.pointerId = e.pointerId;
                try { el.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }

                const pos = this.getWorldPos(e);
                this.drawing = true;
                this.lastErase = pos;
                if (this.mode === 'eraser') {
                    this.erasedIds = [];
                    this.eraseObjectAt(pos, pos);
                } else if (this.mode === 'partial') {
                    this.eraseChanged = false;
                    this.eraseTouched = new Set();
                    this.partialEraseAt(pos, pos);
                } else if (this.mode === 'lasso') {
                    this.startLasso(pos);
                } else {
                    this.startStroke(pos);
                }
            });

            el.addEventListener('pointermove', (e) => {
                if (app.tools.current !== 'pen') return;
                const pos = this.getWorldPos(e);
                if (this.mode === 'eraser' || this.mode === 'partial') {
                    this.moveEraserCursor(pos);
                }
                if (!this.drawing || e.pointerId !== this.pointerId) return;

                if (this.mode === 'lasso') {
                    this.extendLasso(pos);
                    return;
                }

                // Yüksək tezlikli qurğularda brauzer bir neçə hərəkəti tək hadisədə
                // birləşdirir — hamısını açırıq ki, cizgi tam çözünürlükdə olsun
                const batch = [];
                if (typeof e.getCoalescedEvents === 'function') {
                    for (const ce of e.getCoalescedEvents()) batch.push(this.getWorldPos(ce));
                }
                if (!batch.length) batch.push(pos);

                for (const p of batch) {
                    if (this.mode === 'eraser') {
                        this.eraseObjectAt(this.lastErase || p, p);
                        this.lastErase = p;
                    } else if (this.mode === 'partial') {
                        this.partialEraseAt(this.lastErase || p, p);
                        this.lastErase = p;
                    } else {
                        this.extendStroke(p);
                    }
                }
            });

            el.addEventListener('pointerleave', () => this.removeEraserCursor());

            const finish = (e) => {
                if (!this.drawing) return;
                if (e && e.pointerId !== undefined && e.pointerId !== this.pointerId) return;
                this.finish();
            };
            el.addEventListener('pointerup', finish);
            el.addEventListener('pointercancel', finish);
            window.addEventListener('blur', () => finish());
        }

        finish() {
            this.drawing = false;
            this.lastErase = null;
            if (this.pointerId !== null) {
                try { this.app.container.releasePointerCapture(this.pointerId); } catch (err) { /* noop */ }
                this.pointerId = null;
            }
            if (this.mode === 'eraser') this.finishObjectErase();
            else if (this.mode === 'partial') this.finishPartialErase();
            else if (this.mode === 'lasso') this.finishLasso();
            else this.finishStroke();
        }

        // ==================== Qələm / marker cizgisi ====================
        startStroke(pos) {
            const swatch = this.activeSwatch();
            this.raw = [pos.x, pos.y];
            this.smooth = { x: pos.x, y: pos.y };
            this.previewLine = new Konva.Line({
                points: this.raw,
                // Önizləmə son nəticə ilə eyni funksiya ilə çəkilir — "sıçrayış" olmur
                sceneFunc: BoardElements.penSceneFunc,
                stroke: swatch.color,
                strokeWidth: swatch.width,
                lineCap: 'round',
                lineJoin: 'round',
                opacity: this.mode === 'marker' ? BoardConfig.MARKER_OPACITY : 1,
                listening: false,
                perfectDrawEnabled: false,
                shadowForStrokeEnabled: false
            });
            // Önizləmə overlay-də: hər nöqtədə bütün lövhə deyil, yalnız bu qat yenilənir
            this.app.overlayLayer.add(this.previewLine);
            this.app.overlayLayer.batchDraw();
        }

        extendStroke(pos) {
            if (!this.previewLine) return;
            const zoom = this.app.state.viewport.zoom || 1;

            // Eksponensial hamarlama: əl titrəməsi və sensor küyü süzülür
            const k = clamp(BoardConfig.PEN_SMOOTHING, 0, 0.95);
            this.smooth.x += (pos.x - this.smooth.x) * (1 - k);
            this.smooth.y += (pos.y - this.smooth.y) * (1 - k);

            const lx = this.raw[this.raw.length - 2];
            const ly = this.raw[this.raw.length - 1];
            // Minimum məsafə ekran pikselindədir: hər zoomda eyni sıxlıq
            if (Math.hypot(this.smooth.x - lx, this.smooth.y - ly) < BoardConfig.PEN_MIN_DIST / zoom) return;

            this.raw.push(this.smooth.x, this.smooth.y);
            this.previewLine.points(this.raw);
            this.app.overlayLayer.batchDraw();
        }

        finishStroke() {
            const swatch = this.activeSwatch();
            const zoom = this.app.state.viewport.zoom || 1;
            if (this.previewLine) {
                this.previewLine.destroy();
                this.previewLine = null;
                this.app.overlayLayer.batchDraw();
            }
            this.smooth = null;
            if (this.raw.length < 2) {
                this.raw = [];
                return;
            }
            // Tək nöqtəyə klik - kiçik nöqtə kimi saxla
            if (this.raw.length === 2) {
                this.raw.push(this.raw[0] + 0.1, this.raw[1] + 0.1);
            }

            // RDP yalnız BİR dəfə, gedişin sonunda tətbiq olunur
            const simplified = rdp(this.raw, BoardConfig.PEN_SIMPLIFY_TOLERANCE / zoom);
            this.raw = [];

            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (let i = 0; i < simplified.length; i += 2) {
                minX = Math.min(minX, simplified[i]);
                maxX = Math.max(maxX, simplified[i]);
                minY = Math.min(minY, simplified[i + 1]);
                maxY = Math.max(maxY, simplified[i + 1]);
            }

            const pad = swatch.width / 2 + 2;
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
                stroke: swatch.color,
                strokeWidth: swatch.width
            };
            if (this.mode === 'marker') el.variant = 'marker';

            this.app.state.addElement(el);
            const node = BoardElements.buildNode(el, this.app);
            this.app.mainLayer.add(node);
            this.app.mainLayer.batchDraw();
            this.app.commit();
        }

        // ==================== Silgi kursoru (dairə önizləmə) ====================
        moveEraserCursor(pos) {
            const radius = this.eraserRadius();
            if (!this.eraserCursor) {
                this.eraserCursor = new Konva.Circle({
                    name: 'eraser-cursor',
                    fill: 'rgba(255,255,255,0.6)',
                    stroke: '#8a8a96',
                    strokeWidth: 1.2 / (this.app.state.viewport.zoom || 1),
                    listening: false
                });
                this.app.overlayLayer.add(this.eraserCursor);
            }
            this.eraserCursor.setAttrs({ x: pos.x, y: pos.y, radius });
            this.app.overlayLayer.batchDraw();
        }

        removeEraserCursor() {
            if (this.eraserCursor) {
                this.eraserCursor.destroy();
                this.eraserCursor = null;
                this.app.overlayLayer.batchDraw();
            }
        }

        // ==================== Obyekt silgisi ====================
        // Silgi bir kadrda from→to yolunu gedir; kapsul kimi yoxlanır ki, sürətli
        // hərəkətdə aralıqdakı cizgilər atlanmasın
        strokeHit(el, from, to, extra) {
            const a = toLocal(el, from), b = toLocal(el, to);
            const threshold = (el.strokeWidth || 2) / 2 + extra;
            const pts = el.points;
            if (!pts || pts.length < 2) return false;

            // Ucuz sərhəd yoxlaması: elementin lokal çərçivəsindən uzaqdırsa keç
            const pad = threshold;
            if (Math.max(a.x, b.x) + pad < 0 || Math.min(a.x, b.x) - pad > (el.width || 0) ||
                Math.max(a.y, b.y) + pad < 0 || Math.min(a.y, b.y) - pad > (el.height || 0)) return false;

            if (pts.length < 4) {
                return segmentDistance(pts[0], pts[1], a.x, a.y, b.x, b.y) <= threshold;
            }
            for (let i = 0; i + 3 < pts.length; i += 2) {
                if (segSegDistance(a.x, a.y, b.x, b.y,
                    pts[i], pts[i + 1], pts[i + 2], pts[i + 3]) <= threshold) return true;
            }
            return false;
        }

        eraseObjectAt(from, to) {
            const extra = this.eraserRadius();   // kursorda görünən dairə ilə eyni
            const doomed = [];
            for (const el of this.app.state.elements) {
                if (el.type !== 'pen' || el.locked) continue;
                if (this.strokeHit(el, from, to, extra)) doomed.push(el.id);
            }
            if (!doomed.length) return;
            this.erasedIds.push(...doomed);
            this.app.state.doc.elements = this.app.state.elements.filter(el => !doomed.includes(el.id));
            for (const id of doomed) {
                const node = this.app.stage.findOne('#' + id);
                if (node) node.destroy();
            }
            this.app.mainLayer.batchDraw();
        }

        finishObjectErase() {
            if (this.erasedIds && this.erasedIds.length) this.app.commit();
            this.erasedIds = null;
        }

        // ==================== Qismən silgi ====================
        partialEraseAt(from, to) {
            const radius = this.eraserRadius();
            const state = this.app.state;
            // Snapshot: bu addımda yaranan yeni parçalar dərhal təkrar emal olunmasın
            const targets = state.elements.filter(el => el.type === 'pen' && !el.locked);
            let changed = false;

            for (const el of targets) {
                const half = (el.strokeWidth || 2) / 2;
                if (!this.strokeHit(el, from, to, radius)) continue;

                const a = toLocal(el, from), b = toLocal(el, to);
                // Mərkəz xəttini radius + yarım qalınlıqda kəsirik: mürəkkəb tam
                // silgi dairəsinin kənarında bitir, nə az, nə çox
                const cut = radius + half;
                const runs = carveStroke(el.points, a.x, a.y, b.x, b.y, cut,
                    radius * BoardConfig.ERASER_SAMPLE_RATIO, half);

                // Heç nə kəsilmədi (silgi yalnız yaxınlaşdı) — elementə toxunmuruq.
                // Diqqət: yalnız nöqtə sayını müqayisə etmək YANLIŞDIR — kəsik sonuncu
                // nöqtəni atıb yerinə sərhəd nöqtəsi qoyanda say dəyişmir, həndəsə isə
                // dəyişir. carveStroke toxunulmayan təpələri eynilə saxladığı üçün
                // dəyərləri bir-bir tutuşdururuq.
                if (runs.length === 1 && samepoints(runs[0], el.points)) continue;

                this.applyStrokeRuns(el, runs);
                changed = true;
            }

            if (changed) {
                this.eraseChanged = true;
                this.app.mainLayer.batchDraw();
            }
        }

        // Runs-ları elementlərə çevir: birincisi mövcud elementi yeniləyir, qalanları yeni element olur.
        // Diqqət: burada NƏ sadələşdirmə (RDP), NƏ də başlanğıc nöqtəsinin dəyişməsi var —
        // hər hərəkətdə təkrar sadələşdirmək cizgini addım-addım pozurdu.
        // Çərçivə (x/y/width/height) yalnız gedişin sonunda bir dəfə yenilənir.
        applyStrokeRuns(el, runs) {
            const state = this.app.state;

            if (!runs.length) {
                state.doc.elements = state.elements.filter(item => item.id !== el.id);
                const node = this.app.stage.findOne('#' + el.id);
                if (node) node.destroy();
                if (this.eraseTouched) this.eraseTouched.delete(el.id);
                return;
            }

            el.points = runs[0];
            if (this.eraseTouched) this.eraseTouched.add(el.id);
            const node = this.app.stage.findOne('#' + el.id);
            if (node) BoardElements.updateNode(node, el, this.app);

            // Qalan parçalar yeni elementlər olur — valideynin lokal çərçivəsini
            // eynilə miras alırlar, ona görə nöqtələri olduğu kimi köçürmək olar
            for (let i = 1; i < runs.length; i++) {
                const fresh = {
                    id: BoardState.generateId(),
                    type: 'pen',
                    x: el.x,
                    y: el.y,
                    width: el.width,
                    height: el.height,
                    rotation: el.rotation || 0,
                    points: runs[i],
                    stroke: el.stroke,
                    strokeWidth: el.strokeWidth
                };
                if (el.variant === 'marker') fresh.variant = 'marker';
                state.addElement(fresh);
                if (this.eraseTouched) this.eraseTouched.add(fresh.id);
                const freshNode = BoardElements.buildNode(fresh, this.app);
                if (freshNode) this.app.mainLayer.add(freshNode);
            }
        }

        // Cizginin başlanğıc nöqtəsini və çərçivəsini nöqtələrə uyğunlaşdırır
        normalizeStroke(el) {
            const pts = el.points;
            if (!pts || pts.length < 2) return;

            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (let i = 0; i < pts.length; i += 2) {
                minX = Math.min(minX, pts[i]);
                maxX = Math.max(maxX, pts[i]);
                minY = Math.min(minY, pts[i + 1]);
                maxY = Math.max(maxY, pts[i + 1]);
            }

            const pad = (el.strokeWidth || 2) / 2 + 2;
            const offX = minX - pad, offY = minY - pad;
            // Başlanğıc sürüşməsi rotation ilə dünya koordinatına çevrilir
            const worldDelta = fromLocalDelta(el, offX, offY);

            el.x = Math.round((el.x + worldDelta.x) * 10) / 10;
            el.y = Math.round((el.y + worldDelta.y) * 10) / 10;
            el.width = Math.max(1, Math.round(maxX - minX + pad * 2));
            el.height = Math.max(1, Math.round(maxY - minY + pad * 2));

            const next = [];
            for (let i = 0; i < pts.length; i += 2) {
                next.push(
                    Math.round((pts[i] - offX) * 10) / 10,
                    Math.round((pts[i + 1] - offY) * 10) / 10
                );
            }
            el.points = next;
        }

        finishPartialErase() {
            if (this.eraseChanged) {
                // Çərçivələr yalnız indi — bir dəfə — yenilənir
                for (const id of this.eraseTouched || []) {
                    const el = this.app.state.elements.find(item => item.id === id);
                    if (!el) continue;
                    this.normalizeStroke(el);
                    const node = this.app.stage.findOne('#' + id);
                    if (node) BoardElements.updateNode(node, el, this.app);
                }
                this.app.mainLayer.batchDraw();
                this.app.commit();
            }
            this.eraseChanged = false;
            this.eraseTouched = null;
        }

        // ==================== Lasso seçim ====================
        startLasso(pos) {
            this.lassoPoints = [pos];
            this.previewLine = new Konva.Line({
                points: [pos.x, pos.y],
                stroke: BoardConfig.SELECTION_COLOR,
                strokeWidth: 1.4 / (this.app.state.viewport.zoom || 1),
                dash: [6, 5],
                closed: true,
                fill: 'rgba(66, 98, 255, 0.06)',
                listening: false
            });
            this.app.overlayLayer.add(this.previewLine);
            this.app.overlayLayer.batchDraw();
        }

        extendLasso(pos) {
            const last = this.lassoPoints[this.lassoPoints.length - 1];
            if (Math.hypot(pos.x - last.x, pos.y - last.y) < 4) return;
            this.lassoPoints.push(pos);
            this.previewLine.points(this.lassoPoints.flatMap(p => [p.x, p.y]));
            this.app.overlayLayer.batchDraw();
        }

        finishLasso() {
            const poly = this.lassoPoints || [];
            this.lassoPoints = null;
            if (this.previewLine) {
                this.previewLine.destroy();
                this.previewLine = null;
                this.app.overlayLayer.batchDraw();
            }
            if (poly.length < 3) return;

            const ids = [];
            for (const el of this.app.state.elements) {
                if (el.type === 'connector') continue;
                if (el.type === 'pen') {
                    // Cizgi: nöqtələrin yarıdan çoxu lasso daxilindədirsə seçilir
                    let inside = 0, total = 0;
                    for (let i = 0; i + 1 < el.points.length; i += 2) {
                        const delta = fromLocalDelta(el, el.points[i], el.points[i + 1]);
                        total++;
                        if (pointInPolygon(el.x + delta.x, el.y + delta.y, poly)) inside++;
                    }
                    if (total && inside / total >= 0.5) ids.push(el.id);
                } else {
                    const delta = fromLocalDelta(el, el.width / 2, el.height / 2);
                    if (pointInPolygon(el.x + delta.x, el.y + delta.y, poly)) ids.push(el.id);
                }
            }
            if (ids.length) {
                this.app.tools.setTool('select');
                this.app.selection.select(ids);
            }
        }
    }

    window.BoardPen = BoardPen;
    // Test/diaqnostika üçün həndəsi köməkçilər
    BoardPen.geometry = { carveStroke, segSegDistance, segmentDistance, normalizeHex, rgbToHsv, hsvToHex };
})();
