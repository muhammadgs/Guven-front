// board-context-toolbar.js - Seçilmiş sticky note üzərində üzən kontekst toolbar
(function() {
    const svg = (inner) =>
        `<svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" ` +
        `stroke-width="1.6" stroke-linejoin="round">${inner}</svg>`;

    const SHAPE_ICONS = {
        square: svg('<rect x="3" y="3" width="14" height="14" rx="2"/>'),
        rounded: svg('<rect x="3" y="3" width="14" height="14" rx="5.5"/>'),
        circle: svg('<circle cx="10" cy="10" r="7.5"/>'),
        triangle: svg('<polygon points="10,3 17.5,17 2.5,17"/>'),
        diamond: svg('<polygon points="10,2 18,10 10,18 2,10"/>'),
        parallelogram: svg('<polygon points="6,4 18,4 14,16 2,16"/>'),
        star: svg('<path d="M10 2 L12.4 7.2 L18 7.6 L13.8 11.4 L15.1 17 L10 14 L4.9 17 L6.2 11.4 L2 7.6 L7.6 7.2 Z"/>'),
        bubble: svg('<path d="M3 4 h14 v9 h-8 l-4 4 v-4 h-2 z"/>')
    };

    const SHAPE_LABELS = {
        square: 'Kvadrat',
        rounded: 'Yumru künc',
        circle: 'Dairə',
        triangle: 'Üçbucaq',
        diamond: 'Romb',
        parallelogram: 'Paraleloqram',
        star: 'Ulduz',
        bubble: 'Danışıq balonu'
    };

    class BoardContextToolbar {
        constructor(app) {
            this.app = app;
            this.root = document.getElementById('contextToolbar');
            this.buildDOM();
            this.bindOutsideClose();
        }

        // ==================== Seçim köməkçiləri ====================
        // Toolbar-ın idarə etdiyi elementlər (sticky + text + shape)
        selectedEditables() {
            return this.app.state.selection
                .map(id => this.app.state.getElement(id))
                .filter(el => el && (el.type === 'sticky_note' || el.type === 'text' || el.type === 'shape'));
        }

        selectedStickies() {
            return this.selectedEditables().filter(el => el.type === 'sticky_note');
        }

        selectedShapes() {
            return this.selectedEditables().filter(el => el.type === 'shape');
        }

        selectedAttachedText() {
            const els = this.selectedEditables();
            return els.length === 1 && els[0].type === 'text' && els[0].connectorAttachment
                ? els[0] : null;
        }

        resync(el) {
            const node = this.app.stage.findOne('#' + el.id);
            if (node) BoardElements.updateNode(node, el, this.app);
        }

        resyncAll() {
            for (const el of this.selectedEditables()) this.resync(el);
            if (this.app.connectors) this.app.connectors.syncAttachments(true);
            this.app.mainLayer.batchDraw();
            this.app.selection.transformer.forceUpdate();
            if (this.app.textEditor.isEditing()) this.app.textEditor.layout();
        }

        applyText(patch) {
            const els = this.selectedEditables();
            if (!els.length) return;
            for (const el of els) Object.assign(el.text, patch);
            this.resyncAll();
            this.app.commit();
            this.syncState(els[0]);
        }

        applyEl(patch) {
            const els = this.selectedEditables();
            if (!els.length) return;
            for (const el of els) Object.assign(el, patch);
            this.resyncAll();
            this.app.commit();
            this.syncState(els[0]);
            this.position();
        }

        // Shape elementlərinə aid xüsusiyyətlər (shapeType, stroke, fill və s.)
        applyShapeProps(patch) {
            const shapes = this.selectedShapes();
            if (!shapes.length) return;
            for (const el of shapes) Object.assign(el, patch);
            this.resyncAll();
            this.app.commit();
            this.syncState(this.selectedEditables()[0]);
            this.position();
        }

        // Shape elementlərinin mətn xüsusiyyətləri (color, highlight)
        applyShapeTextProps(patch) {
            const shapes = this.selectedShapes();
            if (!shapes.length) return;
            for (const el of shapes) Object.assign(el.text, patch);
            this.resyncAll();
            this.app.commit();
            this.syncState(this.selectedEditables()[0]);
        }

        // Forma yalnız sticky note-lara aiddir
        applyShape(shape) {
            const stickies = this.selectedStickies();
            if (!stickies.length) return;
            for (const el of stickies) el.shape = shape;
            this.resyncAll();
            this.app.commit();
            this.syncState(this.selectedEditables()[0]);
            this.position();
        }

        toggleTextFlag(flag) {
            const els = this.selectedEditables();
            if (!els.length) return;
            this.applyText({ [flag]: !els[0].text[flag] });
            this.syncPop('style');
        }

        applyFont(family) {
            this.applyText({ fontFamily: family });
            // Font hələ yüklənməyibsə, yüklənəndən sonra ölçünü yenidən hesabla
            if (document.fonts && document.fonts.load) {
                Promise.all([
                    document.fonts.load(`16px ${family}`),
                    document.fonts.load(`bold 16px ${family}`)
                ]).then(() => this.resyncAll()).catch(() => {});
            }
        }

        setSize(value) {
            this.applyText({ fontSize: value });
        }

        stepSize(dir) {
            const els = this.selectedEditables();
            if (!els.length) return;
            const current = BoardElements.effectiveFontSize(els[0]);
            const sizes = BoardConfig.FONT_SIZES;

            let target;
            if (dir > 0) {
                target = sizes.find(s => s > current) || sizes[sizes.length - 1];
            } else {
                target = [...sizes].reverse().find(s => s < current) || sizes[0];
            }
            this.setSize(target);
        }

        setTextPosition(orientation) {
            const el = this.selectedAttachedText();
            if (!el || !this.app.connectors) return;
            this.app.connectors.setAttachmentOrientation(el, orientation);
            this.app.commit();
            this.syncState(el);
            this.syncPop('textposition');
            this.position();
        }

        // ==================== Görünüş / mövqe ====================
        update() {
            const els = this.selectedEditables();
            const visible = this.app.tools.isSelectMode() &&
                els.length > 0 &&
                els.length === this.app.state.selection.length;

            if (!visible) {
                this.hide();
                return;
            }
            this.root.classList.remove('hidden');
            this.syncState(els[0]);
            this.position();
        }

        hide() {
            this.root.classList.add('hidden');
            this.closePops();
        }

        position() {
            if (this.root.classList.contains('hidden')) return;

            let bbox = null;
            for (const id of this.app.state.selection) {
                const node = this.app.stage.findOne('#' + id);
                if (!node) continue;
                const b = node.getClientRect();
                if (!bbox) {
                    bbox = { ...b };
                } else {
                    const x2 = Math.max(bbox.x + bbox.width, b.x + b.width);
                    const y2 = Math.max(bbox.y + bbox.height, b.y + b.height);
                    bbox.x = Math.min(bbox.x, b.x);
                    bbox.y = Math.min(bbox.y, b.y);
                    bbox.width = x2 - bbox.x;
                    bbox.height = y2 - bbox.y;
                }
            }
            if (!bbox) {
                this.hide();
                return;
            }

            const cw = this.app.container.clientWidth;
            const tw = this.root.offsetWidth;
            const th = this.root.offsetHeight;

            let left = bbox.x + bbox.width / 2 - tw / 2;
            left = Math.max(8, Math.min(left, cw - tw - 8));

            let top = bbox.y - th - 14;
            const below = top < 8;
            if (below) top = bbox.y + bbox.height + 14;
            this.root.classList.toggle('below', below);

            this.root.style.left = left + 'px';
            this.root.style.top = top + 'px';
        }

        syncState(el) {
            // Forma düyməsi yalnız sticky seçiləndə görünür
            const hasSticky = this.selectedStickies().length > 0;
            const shapeBtn = this.root.querySelector('[data-role="shape"]');
            const shapeDivider = this.root.querySelector('.ct-divider-shape');
            shapeBtn.style.display = hasSticky ? '' : 'none';
            if (shapeDivider) shapeDivider.style.display = hasSticky ? '' : 'none';

            const shapeSource = el.type === 'sticky_note'
                ? el
                : this.selectedStickies()[0];
            shapeBtn.innerHTML =
                SHAPE_ICONS[(shapeSource && shapeSource.shape) || 'square'] || SHAPE_ICONS.square;

            const font = BoardConfig.FONTS.find(f => f.family === el.text.fontFamily);
            const fontLabel = this.root.querySelector('#ctFontLabel');
            fontLabel.textContent = font ? font.label : 'Font';
            fontLabel.style.fontFamily = el.text.fontFamily;

            this.root.querySelector('#ctSizeLabel').textContent =
                BoardElements.effectiveFontSize(el);

            const styleBtn = this.root.querySelector('[data-role="style"]');
            styleBtn.classList.toggle('active',
                !!(el.text.bold || el.text.italic || el.text.underline || el.text.strike));

            const alignIcon = this.root.querySelector('#ctAlignIcon');
            alignIcon.className = 'fas fa-align-' + (el.text.align || 'center');

            this.root.querySelector('[data-role="link"]')
                .classList.toggle('active', !!el.text.link);

            const attachedText = this.selectedAttachedText();
            const textPositionBtn = this.root.querySelector('[data-role="textposition"]');
            const textPositionDivider = this.root.querySelector('.ct-divider-textposition');
            textPositionBtn.style.display = attachedText ? '' : 'none';
            textPositionDivider.style.display = attachedText ? '' : 'none';
            textPositionBtn.classList.toggle('active',
                !!attachedText && attachedText.connectorAttachment.orientation === 'path');
            textPositionBtn.title = attachedText && attachedText.connectorAttachment.orientation === 'path'
                ? 'Mətn xətt üzrə hizalanır' : 'Mətn düz saxlanılır';

            // Rəng düyməsi sticky/text üçündür; shape-in ayrıca düymələri var
            const shapes = this.selectedShapes();
            const hasShape = shapes.length > 0;
            const colorSource = this.selectedEditables().find(e => e.type !== 'shape');

            const colorBtn = this.root.querySelector('[data-role="color"]');
            const colorDivider = this.root.querySelector('.ct-divider-color');
            colorBtn.style.display = colorSource ? '' : 'none';
            if (colorDivider) colorDivider.style.display = colorSource ? '' : 'none';
            if (colorSource) {
                this.root.querySelector('#ctColorDot').style.background = colorSource.color;
            }

            const swapBtn = this.root.querySelector('[data-role="shapeswap"]');
            const swapDivider = this.root.querySelector('.ct-divider-swap');
            swapBtn.style.display = hasShape ? '' : 'none';
            if (swapDivider) swapDivider.style.display = hasShape ? '' : 'none';

            this.root.querySelector('#ctShapeTools').style.display = hasShape ? '' : 'none';

            if (hasShape) {
                const s = shapes[0];
                swapBtn.innerHTML = BoardShapes.icon(s.shapeType, 18);

                this.root.querySelector('#ctTextColorBar').style.background =
                    s.text.color || BoardConfig.DEFAULT_SHAPE_TEXT_COLOR;

                const hlBar = this.root.querySelector('#ctHighlightBar');
                hlBar.classList.toggle('none', !s.text.highlight);
                hlBar.style.background = s.text.highlight || '';

                const ring = this.root.querySelector('#ctBorderRing');
                ring.style.borderColor =
                    (s.stroke && s.stroke !== 'transparent') ? s.stroke : '#c9c9d4';

                const fillDot = this.root.querySelector('#ctFillDot');
                const noFill = !s.fill || s.fill === 'transparent';
                fillDot.classList.toggle('none', noFill);
                fillDot.style.background = noFill ? '' : s.fill;
            }
        }

        // ==================== Popover-lər ====================
        openPop(name) {
            const pop = this.root.querySelector(`[data-pop="${name}"]`);
            const wasOpen = pop && !pop.classList.contains('hidden');
            this.closePops();
            if (!pop || wasOpen) return;

            this.syncPop(name);
            pop.classList.remove('hidden');

            // Trigger düyməsinin altına yerləşdir
            const trigger = this.root.querySelector(`[data-role="${name}"]`);
            if (trigger) {
                const maxLeft = Math.max(0, this.root.offsetWidth - pop.offsetWidth);
                pop.style.left = Math.min(trigger.offsetLeft, maxLeft) + 'px';
            }
        }

        closePops() {
            this.root.querySelectorAll('.ct-pop').forEach(p => p.classList.add('hidden'));
        }

        closeOpenPops() {
            const any = [...this.root.querySelectorAll('.ct-pop')]
                .some(p => !p.classList.contains('hidden'));
            if (any) this.closePops();
            return any;
        }

        syncPop(name) {
            const els = this.selectedEditables();
            if (!els.length) return;
            const el = els[0];
            const pop = this.root.querySelector(`[data-pop="${name}"]`);

            if (name === 'shape') {
                const sticky = this.selectedStickies()[0];
                pop.querySelectorAll('[data-shape]').forEach(b =>
                    b.classList.toggle('active', !!sticky && b.dataset.shape === sticky.shape));
            } else if (name === 'size') {
                // Text elementində "Auto" mənasızdır - hündürlük onsuz da avtomatikdir
                const allText = els.every(e => e.type === 'text');
                const autoBtn = pop.querySelector('[data-size="auto"]');
                if (autoBtn) autoBtn.style.display = allText ? 'none' : '';
                pop.querySelectorAll('[data-size]').forEach(b => {
                    const val = b.dataset.size;
                    b.classList.toggle('active',
                        val === 'auto' ? el.text.fontSize === 'auto' : Number(val) === el.text.fontSize);
                });
            } else if (name === 'font') {
                pop.querySelectorAll('[data-font]').forEach(b =>
                    b.classList.toggle('active', b.dataset.font === el.text.fontFamily));
            } else if (name === 'style') {
                pop.querySelectorAll('[data-flag]').forEach(b =>
                    b.classList.toggle('active', !!el.text[b.dataset.flag]));
            } else if (name === 'align') {
                pop.querySelectorAll('[data-align]').forEach(b =>
                    b.classList.toggle('active', b.dataset.align === (el.text.align || 'center')));
                pop.querySelectorAll('[data-valign]').forEach(b =>
                    b.classList.toggle('active', b.dataset.valign === (el.text.valign || 'middle')));
            } else if (name === 'link') {
                pop.querySelector('#ctLinkInput').value = el.text.link || '';
            } else if (name === 'color') {
                const src = els.find(e => e.type !== 'shape') || el;
                pop.querySelectorAll('[data-color]').forEach(b =>
                    b.classList.toggle('active', b.dataset.color === src.color));
            } else if (name === 'shapeswap') {
                const s = this.selectedShapes()[0];
                pop.querySelectorAll('[data-swap]').forEach(b =>
                    b.classList.toggle('active', !!s && b.dataset.swap === s.shapeType));
            } else if (name === 'textcolor') {
                const s = this.selectedShapes()[0];
                pop.querySelectorAll('[data-textcolor]').forEach(b =>
                    b.classList.toggle('active', !!s && b.dataset.textcolor === s.text.color));
            } else if (name === 'highlight') {
                const s = this.selectedShapes()[0];
                const cur = (s && s.text.highlight) || 'none';
                pop.querySelectorAll('[data-highlight]').forEach(b =>
                    b.classList.toggle('active', b.dataset.highlight === cur));
            } else if (name === 'border') {
                const s = this.selectedShapes()[0];
                const curColor = (!s || !s.stroke || s.stroke === 'transparent') ? 'none' : s.stroke;
                pop.querySelectorAll('[data-strokecolor]').forEach(b =>
                    b.classList.toggle('active', b.dataset.strokecolor === curColor));
                pop.querySelectorAll('[data-strokew]').forEach(b =>
                    b.classList.toggle('active', !!s && Number(b.dataset.strokew) === s.strokeWidth));
            } else if (name === 'fill') {
                const s = this.selectedShapes()[0];
                pop.querySelectorAll('[data-fill]').forEach(b =>
                    b.classList.toggle('active', !!s && b.dataset.fill === (s.fill || 'transparent')));
            } else if (name === 'textposition') {
                const text = this.selectedAttachedText();
                const current = text && text.connectorAttachment.orientation === 'path'
                    ? 'path' : 'horizontal';
                pop.querySelectorAll('[data-textposition]').forEach(b =>
                    b.classList.toggle('active', b.dataset.textposition === current));
            }
        }

        // ==================== DOM qurulması ====================
        buildDOM() {
            const shapesHtml = BoardConfig.STICKY_SHAPES.map(s =>
                `<button class="ct-shape-item" data-shape="${s}" title="${SHAPE_LABELS[s]}">${SHAPE_ICONS[s]}</button>`
            ).join('');

            const fontsHtml = BoardConfig.FONTS.map(f =>
                `<button class="ct-list-item" data-font="${f.family.replace(/"/g, '&quot;')}" ` +
                `style="font-family:${f.family.replace(/"/g, '&quot;')}">${f.label}</button>`
            ).join('');

            const sizesHtml =
                `<button class="ct-list-item" data-size="auto">Auto</button>` +
                BoardConfig.FONT_SIZES.map(s =>
                    `<button class="ct-list-item" data-size="${s}">${s}</button>`
                ).join('');

            const colorsHtml = BoardConfig.STICKY_COLORS.map(c =>
                `<button class="ct-color-swatch" data-color="${c}" style="background:${c}"></button>`
            ).join('');

            const textColorsHtml = BoardConfig.PEN_COLORS.map(c =>
                `<button class="ct-color-swatch round" data-textcolor="${c}" style="background:${c}"></button>`
            ).join('');

            const highlightHtml =
                `<button class="ct-color-swatch none" data-highlight="none" title="Yoxdur"><i class="fas fa-ban"></i></button>` +
                BoardConfig.HIGHLIGHT_COLORS.map(c =>
                    `<button class="ct-color-swatch" data-highlight="${c}" style="background:${c}"></button>`
                ).join('');

            const strokeColorsHtml =
                `<button class="ct-color-swatch none" data-strokecolor="none" title="Çərçivəsiz"><i class="fas fa-ban"></i></button>` +
                BoardConfig.PEN_COLORS.map(c =>
                    `<button class="ct-color-swatch round" data-strokecolor="${c}" style="background:${c}"></button>`
                ).join('');

            const strokeWidthsHtml = BoardConfig.SHAPE_STROKE_WIDTHS.map(w =>
                `<button class="ct-strokew" data-strokew="${w}" title="${w}px">` +
                `<span style="height:${Math.min(w, 10)}px"></span></button>`
            ).join('');

            const fillsHtml =
                `<button class="ct-color-swatch checker" data-fill="transparent" title="Boş"></button>` +
                BoardConfig.STICKY_COLORS.map(c =>
                    `<button class="ct-color-swatch" data-fill="${c}" style="background:${c}"></button>`
                ).join('');

            this.root.innerHTML = `
                <div class="ct-main">
                    <button class="ct-btn" data-role="shapeswap" title="Fiquru dəyiş"></button>
                    <span class="ct-divider ct-divider-swap"></span>
                    <button class="ct-btn" data-role="shape" title="Forma"></button>
                    <span class="ct-divider ct-divider-shape"></span>
                    <button class="ct-btn ct-font-btn" data-role="font" title="Font">
                        <span id="ctFontLabel">Font</span>
                        <i class="fas fa-chevron-down ct-caret"></i>
                    </button>
                    <span class="ct-divider"></span>
                    <div class="ct-sizebox">
                        <button class="ct-btn" data-role="size" title="Yazı ölçüsü">
                            <span id="ctSizeLabel">Auto</span>
                        </button>
                        <span class="ct-size-arrows">
                            <button data-role="size-up" title="Böyüt"><i class="fas fa-chevron-up"></i></button>
                            <button data-role="size-down" title="Kiçilt"><i class="fas fa-chevron-down"></i></button>
                        </span>
                    </div>
                    <span class="ct-divider"></span>
                    <button class="ct-btn ct-b" data-role="style" title="Mətn stili (B/I/U/S)"><u>B</u></button>
                    <button class="ct-btn" data-role="align" title="Düzləndirmə">
                        <i class="fas fa-align-center" id="ctAlignIcon"></i>
                    </button>
                    <button class="ct-btn" data-role="link" title="Link əlavə et">
                        <i class="fas fa-link"></i>
                    </button>
                    <span class="ct-divider ct-divider-textposition"></span>
                    <button class="ct-btn ct-text-position-btn" data-role="textposition" title="Mətn mövqeyi">
                        <span>ABC</span><svg viewBox="0 0 26 12" aria-hidden="true"><path d="M2 10 C8 1 17 1 24 8"/></svg>
                    </button>
                    <span class="ct-divider ct-divider-color"></span>
                    <button class="ct-btn" data-role="color" title="Rəng">
                        <span class="ct-color-dot" id="ctColorDot"></span>
                    </button>
                    <span id="ctShapeTools" class="ct-shape-tools">
                        <span class="ct-divider"></span>
                        <button class="ct-btn ct-colbtn" data-role="textcolor" title="Mətn rəngi">
                            <span class="ct-A">A</span>
                            <span class="ct-underbar" id="ctTextColorBar"></span>
                        </button>
                        <button class="ct-btn ct-colbtn" data-role="highlight" title="Highlight rəngi">
                            <i class="fas fa-highlighter"></i>
                            <span class="ct-underbar" id="ctHighlightBar"></span>
                        </button>
                        <span class="ct-divider"></span>
                        <button class="ct-btn" data-role="border" title="Çərçivə rəngi və qalınlığı">
                            <span class="ct-ring" id="ctBorderRing"></span>
                        </button>
                        <button class="ct-btn" data-role="fill" title="Fill (arxa plan) rəngi">
                            <span class="ct-fill-dot" id="ctFillDot"></span>
                        </button>
                    </span>
                    <span class="ct-divider"></span>
                    <button class="ct-btn" data-role="menu" title="Digər əməliyyatlar">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                </div>
                <div class="ct-pop ct-pop-shapes hidden" data-pop="shape">${shapesHtml}</div>
                <div class="ct-pop ct-pop-list hidden" data-pop="font">${fontsHtml}</div>
                <div class="ct-pop ct-pop-list ct-pop-sizes hidden" data-pop="size">${sizesHtml}</div>
                <div class="ct-pop ct-pop-row hidden" data-pop="style">
                    <button data-flag="bold" title="Qalın (Ctrl+B)"><i class="fas fa-bold"></i></button>
                    <button data-flag="italic" title="Kursiv (Ctrl+I)"><i class="fas fa-italic"></i></button>
                    <button data-flag="underline" title="Altıxətli (Ctrl+U)"><i class="fas fa-underline"></i></button>
                    <button data-flag="strike" title="Üstüxətli"><i class="fas fa-strikethrough"></i></button>
                </div>
                <div class="ct-pop ct-pop-align hidden" data-pop="align">
                    <div class="ct-pop-row-inner">
                        <button data-align="left" title="Sola"><i class="fas fa-align-left"></i></button>
                        <button data-align="center" title="Mərkəzə"><i class="fas fa-align-center"></i></button>
                        <button data-align="right" title="Sağa"><i class="fas fa-align-right"></i></button>
                    </div>
                    <div class="ct-pop-row-inner">
                        <button data-valign="top" title="Yuxarı"><i class="fas fa-arrow-up"></i></button>
                        <button data-valign="middle" title="Ortaya"><i class="fas fa-minus"></i></button>
                        <button data-valign="bottom" title="Aşağı"><i class="fas fa-arrow-down"></i></button>
                    </div>
                </div>
                <div class="ct-pop ct-pop-link hidden" data-pop="link">
                    <input type="text" id="ctLinkInput" placeholder="https://...">
                    <button id="ctLinkSave" class="ct-link-save">Saxla</button>
                    <button id="ctLinkRemove" class="ct-link-remove" title="Linki sil">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="ct-pop ct-pop-row ct-text-position-pop hidden" data-pop="textposition">
                    <button data-textposition="horizontal" title="Həmişə düz"><span class="ct-tp-flat">ABC</span></button>
                    <button data-textposition="path" title="Xətt üzrə"><span class="ct-tp-path">ABC⌁</span></button>
                </div>
                <div class="ct-pop ct-pop-colors hidden" data-pop="color">${colorsHtml}</div>
                <div class="ct-pop ct-pop-swap hidden" data-pop="shapeswap">${BoardShapes.sectionsHtml('swap')}</div>
                <div class="ct-pop ct-pop-colors hidden" data-pop="textcolor">${textColorsHtml}</div>
                <div class="ct-pop ct-pop-colors hidden" data-pop="highlight">${highlightHtml}</div>
                <div class="ct-pop ct-pop-border hidden" data-pop="border">
                    <div class="ct-strokew-row">${strokeWidthsHtml}</div>
                    <div class="ct-pop-sep"></div>
                    <div class="ct-border-colors">${strokeColorsHtml}</div>
                </div>
                <div class="ct-pop ct-pop-colors hidden" data-pop="fill">${fillsHtml}</div>
                <div class="ct-pop ct-pop-menu hidden" data-pop="menu">
                    <button data-action="duplicate"><i class="fas fa-clone"></i> Kopyala <span class="ct-kbd">Ctrl+D</span></button>
                    <button data-action="front"><i class="fas fa-arrow-up"></i> Önə gətir</button>
                    <button data-action="back"><i class="fas fa-arrow-down"></i> Arxaya göndər</button>
                    <button data-action="delete" class="danger"><i class="fas fa-trash"></i> Sil <span class="ct-kbd">Del</span></button>
                </div>
            `;

            this.bindDOM();
        }

        bindDOM() {
            const root = this.root;

            // Əsas düymələr -> popover aç
            for (const name of ['shape', 'font', 'size', 'style', 'align', 'link', 'color',
                                'textposition', 'shapeswap', 'textcolor', 'highlight', 'border', 'fill', 'menu']) {
                root.querySelector(`[data-role="${name}"]`)
                    .addEventListener('click', () => this.openPop(name));
            }

            root.querySelector('[data-role="size-up"]')
                .addEventListener('click', () => this.stepSize(1));
            root.querySelector('[data-role="size-down"]')
                .addEventListener('click', () => this.stepSize(-1));

            // Shape seçimi
            root.querySelectorAll('[data-shape]').forEach(b =>
                b.addEventListener('click', () => {
                    this.applyShape(b.dataset.shape);
                    this.syncPop('shape');
                }));

            // Font seçimi
            root.querySelectorAll('[data-font]').forEach(b =>
                b.addEventListener('click', () => {
                    this.applyFont(b.dataset.font);
                    this.syncPop('font');
                }));

            // Ölçü seçimi
            root.querySelectorAll('[data-size]').forEach(b =>
                b.addEventListener('click', () => {
                    this.setSize(b.dataset.size === 'auto' ? 'auto' : Number(b.dataset.size));
                    this.syncPop('size');
                }));

            // Mətn stili
            root.querySelectorAll('[data-flag]').forEach(b =>
                b.addEventListener('click', () => this.toggleTextFlag(b.dataset.flag)));

            // Düzləndirmə
            root.querySelectorAll('[data-align]').forEach(b =>
                b.addEventListener('click', () => {
                    this.applyText({ align: b.dataset.align });
                    this.syncPop('align');
                }));
            root.querySelectorAll('[data-valign]').forEach(b =>
                b.addEventListener('click', () => {
                    this.applyText({ valign: b.dataset.valign });
                    this.syncPop('align');
                }));

            root.querySelectorAll('[data-textposition]').forEach(b =>
                b.addEventListener('click', () => this.setTextPosition(b.dataset.textposition)));

            // Link
            const linkInput = root.querySelector('#ctLinkInput');
            const saveLink = () => {
                let url = linkInput.value.trim();
                if (url && !/^https?:\/\//i.test(url)) url = 'https://' + url;
                this.applyText({ link: url || null });
                this.closePops();
            };
            root.querySelector('#ctLinkSave').addEventListener('click', saveLink);
            linkInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') saveLink();
                e.stopPropagation();
            });
            root.querySelector('#ctLinkRemove').addEventListener('click', () => {
                this.applyText({ link: null });
                this.closePops();
            });

            // Rəng
            root.querySelectorAll('[data-color]').forEach(b =>
                b.addEventListener('click', () => {
                    this.applyEl({ color: b.dataset.color });
                    this.syncPop('color');
                }));

            // Fiquru dəyiş
            root.querySelectorAll('[data-swap]').forEach(b =>
                b.addEventListener('click', () => {
                    this.applyShapeProps({ shapeType: b.dataset.swap });
                    this.syncPop('shapeswap');
                }));

            // Shape mətn rəngi
            root.querySelectorAll('[data-textcolor]').forEach(b =>
                b.addEventListener('click', () => {
                    this.applyShapeTextProps({ color: b.dataset.textcolor });
                    this.syncPop('textcolor');
                }));

            // Highlight
            root.querySelectorAll('[data-highlight]').forEach(b =>
                b.addEventListener('click', () => {
                    const val = b.dataset.highlight;
                    this.applyShapeTextProps({ highlight: val === 'none' ? null : val });
                    this.syncPop('highlight');
                }));

            // Çərçivə rəngi / qalınlığı
            root.querySelectorAll('[data-strokecolor]').forEach(b =>
                b.addEventListener('click', () => {
                    const val = b.dataset.strokecolor;
                    this.applyShapeProps({ stroke: val === 'none' ? 'transparent' : val });
                    this.syncPop('border');
                }));
            root.querySelectorAll('[data-strokew]').forEach(b =>
                b.addEventListener('click', () => {
                    this.applyShapeProps({ strokeWidth: Number(b.dataset.strokew) });
                    this.syncPop('border');
                }));

            // Fill
            root.querySelectorAll('[data-fill]').forEach(b =>
                b.addEventListener('click', () => {
                    this.applyShapeProps({ fill: b.dataset.fill });
                    this.syncPop('fill');
                }));

            // Menyu
            root.querySelector('[data-action="duplicate"]').addEventListener('click', () => {
                this.closePops();
                this.app.selection.duplicateSelected();
            });
            root.querySelector('[data-action="front"]').addEventListener('click', () => {
                this.closePops();
                this.reorderSelection('front');
            });
            root.querySelector('[data-action="back"]').addEventListener('click', () => {
                this.closePops();
                this.reorderSelection('back');
            });
            root.querySelector('[data-action="delete"]').addEventListener('click', () => {
                this.closePops();
                this.app.selection.deleteSelected();
            });
        }

        reorderSelection(where) {
            const app = this.app;
            const sel = new Set(app.state.selection);
            const selected = app.state.doc.elements.filter(e => sel.has(e.id));
            const others = app.state.doc.elements.filter(e => !sel.has(e.id));

            app.state.doc.elements = where === 'front'
                ? others.concat(selected)
                : selected.concat(others);

            app.render();
            app.commit();
        }

        bindOutsideClose() {
            document.addEventListener('mousedown', (e) => {
                if (!this.root.contains(e.target)) this.closePops();
            });
        }
    }

    window.BoardContextToolbar = BoardContextToolbar;
})();
