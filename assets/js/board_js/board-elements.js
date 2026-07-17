// board-elements.js - Elementlərin yaradılması və Konva node-larına çevrilməsi
(function() {
    const SHADOW = {
        shadowColor: 'rgba(0,0,0,1)',
        shadowBlur: 10,
        shadowOffset: { x: 0, y: 5 },
        shadowOpacity: 0.18
    };

    // Mətn ölçüsünü hesablamaq üçün gizli ölçü node-u
    let measurer = null;
    function getMeasurer() {
        if (!measurer) {
            measurer = new Konva.Text({
                lineHeight: BoardConfig.LINE_HEIGHT,
                wrap: 'word',
                listening: false
            });
        }
        return measurer;
    }

    // Mətnin verilmiş en və fontda tutacağı hündürlük
    function measureTextHeight(content, innerWidth, fontFamily, fontSize, fontStyle) {
        if (!content) return fontSize * BoardConfig.LINE_HEIGHT;
        const m = getMeasurer();
        m.setAttrs({
            text: content,
            width: Math.max(10, innerWidth),
            fontFamily: fontFamily || BoardConfig.DEFAULT_FONT_FAMILY,
            fontStyle: fontStyle || 'normal',
            fontSize: fontSize
        });
        return m.height();
    }

    // Verilmiş qutuya sığan maksimum font ölçüsü (binary search)
    function fitFontSize(content, boxWidth, boxHeight, fontFamily, fontStyle) {
        const innerW = Math.max(10, boxWidth);
        const innerH = Math.max(10, boxHeight);

        const min = BoardConfig.FONT_MIN;
        // Maksimum font qutunun hündürlüyündən asılıdır (Miro məntiqi)
        const max = Math.max(min, Math.floor(innerH * 0.6));

        if (!content) return Math.min(28, max);

        const m = getMeasurer();
        m.setAttrs({
            text: content,
            width: innerW,
            fontFamily: fontFamily || BoardConfig.DEFAULT_FONT_FAMILY,
            fontStyle: fontStyle || 'normal'
        });

        const fits = (size) => {
            m.fontSize(size);
            return m.height() <= innerH;
        };

        if (fits(max)) return max;

        let lo = min, hi = max;
        while (lo < hi) {
            const mid = Math.ceil((lo + hi) / 2);
            if (fits(mid)) {
                lo = mid;
            } else {
                hi = mid - 1;
            }
        }
        return lo;
    }

    // Formadan asılı olaraq mətnin yerləşdiyi daxili qutu (element-lokal koordinatlar)
    function textBox(el) {
        const w = el.width, h = el.height;
        const pad = BoardConfig.TEXT_PADDING;

        // Text elementində fon yoxdur - bütün qutu mətnindir
        if (el.type === 'text') {
            return { x: 0, y: 0, w: w, h: h };
        }

        // Shape elementində qutu fiqurun geometriyasından asılıdır
        if (el.type === 'shape') {
            return BoardShapes.textBox(el.shapeType, w, h);
        }

        switch (el.shape) {
            case 'circle':
                return { x: w * 0.15, y: h * 0.15, w: w * 0.7, h: h * 0.7 };
            case 'triangle':
                return { x: w * 0.25, y: h * 0.45, w: w * 0.5, h: h * 0.5 - pad };
            case 'diamond':
                return { x: w * 0.25, y: h * 0.25, w: w * 0.5, h: h * 0.5 };
            case 'parallelogram':
                return { x: w * 0.22, y: pad, w: w * 0.56, h: h - pad * 2 };
            case 'star': {
                const r = Math.min(w, h) / 2;
                const side = r * 0.52 * 1.2;
                return { x: w / 2 - side / 2, y: h / 2 - side / 2, w: side, h: side };
            }
            case 'bubble': {
                const tail = h * 0.18;
                return { x: pad, y: pad, w: w - pad * 2, h: h - tail - pad * 2 };
            }
            default: // square, rounded
                return { x: pad, y: pad, w: w - pad * 2, h: h - pad * 2 };
        }
    }

    // Faktiki font ölçüsü: auto -> sığan maksimum; rəqəm -> sığmırsa avtomatik kiçilir
    function effectiveFontSize(el, contentOverride) {
        // Text elementində hündürlük avtomatik böyüyür - font sabit qalır
        if (el.type === 'text') {
            return el.text.fontSize === 'auto'
                ? BoardConfig.DEFAULT_TEXT_FONT_SIZE
                : el.text.fontSize;
        }

        const content = contentOverride !== undefined ? contentOverride : el.text.content;
        const box = textBox(el);
        const style = konvaFontStyle(el.text);
        const fitted = fitFontSize(content, box.w, box.h, el.text.fontFamily, style);

        if (el.text.fontSize === 'auto') return fitted;
        return Math.min(el.text.fontSize, fitted);
    }

    // Fonun rənginə görə oxunaqlı mətn rəngi
    function contrastColor(hex) {
        if (!hex || hex[0] !== '#') return '#1A1A1A';
        const h = hex.length === 4
            ? hex.slice(1).split('').map(c => c + c).join('')
            : hex.slice(1);
        const r = parseInt(h.substr(0, 2), 16);
        const g = parseInt(h.substr(2, 2), 16);
        const b = parseInt(h.substr(4, 2), 16);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.55 ? '#1A1A1A' : '#FFFFFF';
    }

    function konvaFontStyle(textProps) {
        const parts = [];
        if (textProps.italic) parts.push('italic');
        if (textProps.bold) parts.push('bold');
        return parts.length ? parts.join(' ') : 'normal';
    }

    function konvaTextDecoration(textProps) {
        const parts = [];
        if (textProps.underline) parts.push('underline');
        if (textProps.strike) parts.push('line-through');
        return parts.join(' ');
    }

    // ==================== Element fabrikləri ====================
    function createStickyNote(centerX, centerY, color) {
        const size = BoardConfig.DEFAULT_STICKY_SIZE;
        return {
            id: BoardState.generateId(),
            type: 'sticky_note',
            x: Math.round(centerX - size.width / 2),
            y: Math.round(centerY - size.height / 2),
            width: size.width,
            height: size.height,
            rotation: 0,
            shape: 'square',
            color: color || BoardConfig.DEFAULT_STICKY_COLOR,
            text: {
                content: '',
                fontFamily: BoardConfig.DEFAULT_FONT_FAMILY,
                fontSize: 'auto',
                bold: false,
                italic: false,
                underline: false,
                strike: false,
                align: 'center',
                valign: 'middle',
                link: null
            }
        };
    }

    function createShape(centerX, centerY, shapeType) {
        const size = BoardShapes.defaultSize(shapeType);
        return {
            id: BoardState.generateId(),
            type: 'shape',
            x: Math.round(centerX - size.width / 2),
            y: Math.round(centerY - size.height / 2),
            width: size.width,
            height: size.height,
            rotation: 0,
            shapeType: shapeType,
            stroke: BoardConfig.DEFAULT_SHAPE_STROKE,
            strokeWidth: BoardConfig.DEFAULT_SHAPE_STROKE_WIDTH,
            fill: BoardConfig.DEFAULT_SHAPE_FILL,
            text: {
                content: '',
                fontFamily: BoardConfig.DEFAULT_FONT_FAMILY,
                fontSize: 'auto',
                bold: false,
                italic: false,
                underline: false,
                strike: false,
                align: 'center',
                valign: 'middle',
                link: null,
                color: BoardConfig.DEFAULT_SHAPE_TEXT_COLOR,
                highlight: null
            }
        };
    }

    function createText(x, y) {
        const fontSize = BoardConfig.DEFAULT_TEXT_FONT_SIZE;
        return {
            id: BoardState.generateId(),
            type: 'text',
            x: Math.round(x),
            y: Math.round(y - fontSize * BoardConfig.LINE_HEIGHT / 2),
            width: BoardConfig.DEFAULT_TEXT_WIDTH,
            height: Math.ceil(fontSize * BoardConfig.LINE_HEIGHT),
            rotation: 0,
            color: BoardConfig.DEFAULT_TEXT_COLOR,
            text: {
                content: '',
                fontFamily: BoardConfig.DEFAULT_FONT_FAMILY,
                fontSize: fontSize,
                bold: false,
                italic: false,
                underline: false,
                strike: false,
                align: 'left',
                valign: 'top',
                link: null
            }
        };
    }

    // ==================== Fon formaları ====================
    function buildBg(el) {
        const w = el.width, h = el.height;
        const base = { name: 'bg', fill: el.color, ...SHADOW };

        switch (el.shape) {
            case 'rounded':
                return new Konva.Rect({ ...base, width: w, height: h, cornerRadius: Math.min(w, h) * 0.16 });
            case 'circle':
                return new Konva.Ellipse({ ...base, x: w / 2, y: h / 2, radiusX: w / 2, radiusY: h / 2 });
            case 'triangle':
                return new Konva.Line({ ...base, points: [w / 2, 0, w, h, 0, h], closed: true });
            case 'diamond':
                return new Konva.Line({ ...base, points: [w / 2, 0, w, h / 2, w / 2, h, 0, h / 2], closed: true });
            case 'parallelogram':
                return new Konva.Line({ ...base, points: [w * 0.2, 0, w, 0, w * 0.8, h, 0, h], closed: true });
            case 'star': {
                const r = Math.min(w, h) / 2;
                return new Konva.Star({
                    ...base, x: w / 2, y: h / 2,
                    numPoints: 5, innerRadius: r * 0.52, outerRadius: r
                });
            }
            case 'bubble':
                return new Konva.Shape({
                    ...base,
                    width: w,
                    height: h,
                    sceneFunc: function(ctx, shape) {
                        const sw = shape.width(), sh = shape.height();
                        const r = Math.min(14, sw * 0.08, sh * 0.08);
                        const bodyH = sh * 0.82;
                        ctx.beginPath();
                        ctx.moveTo(r, 0);
                        ctx.lineTo(sw - r, 0);
                        ctx.quadraticCurveTo(sw, 0, sw, r);
                        ctx.lineTo(sw, bodyH - r);
                        ctx.quadraticCurveTo(sw, bodyH, sw - r, bodyH);
                        ctx.lineTo(sw * 0.32, bodyH);
                        ctx.lineTo(sw * 0.14, sh);
                        ctx.lineTo(sw * 0.18, bodyH);
                        ctx.lineTo(r, bodyH);
                        ctx.quadraticCurveTo(0, bodyH, 0, bodyH - r);
                        ctx.lineTo(0, r);
                        ctx.quadraticCurveTo(0, 0, r, 0);
                        ctx.closePath();
                        ctx.fillStrokeShape(shape);
                    }
                });
            default: // square
                return new Konva.Rect({ ...base, width: w, height: h, cornerRadius: 4 });
        }
    }

    // ==================== Konva node-ları ====================
    function buildNode(el, app) {
        switch (el.type) {
            case 'sticky_note':
                return buildStickyNode(el, app);
            case 'text':
                return buildTextNode(el, app);
            case 'pen':
                return buildPenNode(el, app);
            case 'shape':
                return buildShapeNode(el, app);
            case 'connector':
                return app.connectors ? app.connectors.buildNode(el) : null;
            default:
                console.warn('Naməlum element tipi:', el.type);
                return null;
        }
    }

    // ==================== Shape elementi ====================
    function buildShapeNode(el, app) {
        const group = new Konva.Group({
            id: el.id,
            x: el.x,
            y: el.y,
            rotation: el.rotation || 0,
            draggable: app.tools ? app.tools.isSelectMode() : true,
            name: 'element'
        });
        group.setAttr('elementType', el.type);

        const path = new Konva.Path({
            name: 'bg',
            lineCap: 'round',
            lineJoin: 'round'
        });
        group.add(path);

        const text = new Konva.Text({
            name: 'text',
            lineHeight: BoardConfig.LINE_HEIGHT,
            wrap: 'word',
            listening: false
        });
        group.add(text);

        syncShape(group, el, app);

        group.on('dblclick dbltap', () => {
            if (app.tools && !app.tools.isSelectMode()) return;
            app.textEditor.openFor(el.id);
        });

        return group;
    }

    function syncShape(group, el, app) {
        group.setAttrs({ x: el.x, y: el.y, rotation: el.rotation || 0 });

        const def = BoardShapes.get(el.shapeType);
        const path = group.findOne('.bg');
        path.setAttrs({
            data: def.path(el.width, el.height),
            stroke: el.stroke || BoardConfig.DEFAULT_SHAPE_STROKE,
            strokeWidth: el.strokeWidth || BoardConfig.DEFAULT_SHAPE_STROKE_WIDTH,
            fill: def.noFill ? undefined : (el.fill || 'transparent'),
            fillEnabled: !def.noFill,
            hitStrokeWidth: Math.max((el.strokeWidth || 2) + 12, 20)
        });

        syncShapeText(group, el);
        syncLinkBadge(group, el, app);
    }

    function syncShapeText(group, el) {
        const textNode = group.findOne('.text');
        const box = textBox(el);
        const fontSize = effectiveFontSize(el);

        textNode.setAttrs({
            x: box.x,
            y: box.y,
            width: box.w,
            height: box.h,
            padding: 0,
            text: el.text.content || '',
            fontFamily: el.text.fontFamily || BoardConfig.DEFAULT_FONT_FAMILY,
            fontSize: fontSize,
            fontStyle: konvaFontStyle(el.text),
            textDecoration: konvaTextDecoration(el.text),
            align: el.text.align || 'center',
            verticalAlign: el.text.valign || 'middle',
            fill: el.text.color || BoardConfig.DEFAULT_SHAPE_TEXT_COLOR
        });

        // Highlight - mətn blokunun arxasında rəngli düzbucaqlı
        const oldHl = group.findOne('.highlightRect');
        if (oldHl) oldHl.destroy();

        if (el.text.highlight && el.text.content) {
            const lines = textNode.textArr ? textNode.textArr.length : 1;
            const th = lines * fontSize * BoardConfig.LINE_HEIGHT;
            let tw = 0;
            if (textNode.textArr) {
                for (const line of textNode.textArr) tw = Math.max(tw, line.width);
            }
            tw = Math.min(tw, box.w);

            const align = el.text.align || 'center';
            const valign = el.text.valign || 'middle';
            let hx = box.x;
            if (align === 'center') hx = box.x + (box.w - tw) / 2;
            else if (align === 'right') hx = box.x + box.w - tw;
            let hy = box.y;
            if (valign === 'middle') hy = box.y + (box.h - th) / 2;
            else if (valign === 'bottom') hy = box.y + box.h - th;

            const hl = new Konva.Rect({
                name: 'highlightRect',
                x: hx - 4,
                y: hy - 2,
                width: tw + 8,
                height: th + 4,
                fill: el.text.highlight,
                cornerRadius: 3,
                listening: false
            });
            group.add(hl);
            hl.moveToTop();
        }

        textNode.moveToTop();
        return fontSize;
    }

    function buildPenNode(el, app) {
        const group = new Konva.Group({
            id: el.id,
            x: el.x,
            y: el.y,
            rotation: el.rotation || 0,
            draggable: app.tools ? app.tools.isSelectMode() : true,
            name: 'element'
        });
        group.setAttr('elementType', el.type);

        const line = new Konva.Line({
            name: 'stroke',
            lineCap: 'round',
            lineJoin: 'round',
            tension: 0.35
        });
        group.add(line);
        syncPen(group, el);

        return group;
    }

    function syncPen(group, el) {
        group.setAttrs({ x: el.x, y: el.y, rotation: el.rotation || 0 });

        const line = group.findOne('.stroke');
        line.setAttrs({
            points: el.points,
            stroke: el.stroke,
            strokeWidth: el.strokeWidth,
            hitStrokeWidth: Math.max(el.strokeWidth + 14, 20)
        });
    }

    function buildTextNode(el, app) {
        const group = new Konva.Group({
            id: el.id,
            x: el.x,
            y: el.y,
            rotation: el.rotation || 0,
            draggable: app.tools ? app.tools.isSelectMode() : true,
            name: 'element'
        });
        group.setAttr('elementType', el.type);

        const text = new Konva.Text({
            name: 'text',
            lineHeight: BoardConfig.LINE_HEIGHT,
            wrap: 'word'
        });
        group.add(text);

        syncTextElement(group, el, app);

        group.on('dblclick dbltap', () => {
            if (app.tools && !app.tools.isSelectMode()) return;
            app.textEditor.openFor(el.id);
        });

        return group;
    }

    // Text elementinin sinxronizasiyası: hündürlük məzmuna görə avtomatik hesablanır
    function syncTextElement(group, el, app) {
        group.setAttrs({ x: el.x, y: el.y, rotation: el.rotation || 0 });

        // Text elementində fon olmur - varsa təmizlə
        const strayBg = group.findOne('.bg');
        if (strayBg) strayBg.destroy();

        const textNode = group.findOne('.text');
        const style = konvaFontStyle(el.text);
        const fontSize = effectiveFontSize(el);

        const minH = fontSize * BoardConfig.LINE_HEIGHT;
        const contentH = measureTextHeight(
            el.text.content || ' ', el.width, el.text.fontFamily, fontSize, style
        );
        el.height = Math.ceil(Math.max(minH, contentH));

        textNode.setAttrs({
            x: 0,
            y: 0,
            width: el.width,
            height: el.height,
            padding: 0,
            text: el.text.content || '',
            fontFamily: el.text.fontFamily || BoardConfig.DEFAULT_FONT_FAMILY,
            fontSize: fontSize,
            fontStyle: style,
            textDecoration: konvaTextDecoration(el.text),
            align: el.text.align || 'left',
            verticalAlign: 'top',
            fill: el.color || BoardConfig.DEFAULT_TEXT_COLOR
        });

        syncLinkBadge(group, el, app);
    }

    function buildStickyNode(el, app) {
        const group = new Konva.Group({
            id: el.id,
            x: el.x,
            y: el.y,
            rotation: el.rotation || 0,
            draggable: app.tools ? app.tools.isSelectMode() : true,
            name: 'element'
        });
        group.setAttr('elementType', el.type);

        const text = new Konva.Text({
            name: 'text',
            lineHeight: BoardConfig.LINE_HEIGHT,
            wrap: 'word',
            listening: false
        });
        group.add(text);

        syncSticky(group, el, app);

        group.on('dblclick dbltap', () => {
            if (app.tools && !app.tools.isSelectMode()) return;
            app.textEditor.openFor(el.id);
        });

        return group;
    }

    // Model -> node tam sinxronizasiya (forma, ölçü, rəng, mətn, link)
    function syncSticky(group, el, app) {
        group.setAttrs({ x: el.x, y: el.y, rotation: el.rotation || 0 });

        // Fon formasını yenidən qur (forma/ölçü/rəng dəyişə bilər)
        const oldBg = group.findOne('.bg');
        if (oldBg) oldBg.destroy();
        const bg = buildBg(el);
        group.add(bg);
        bg.moveToBottom();

        syncStickyText(group, el);
        syncLinkBadge(group, el, app);
    }

    function syncStickyText(group, el) {
        const textNode = group.findOne('.text');
        const box = textBox(el);
        const fontSize = effectiveFontSize(el);

        textNode.setAttrs({
            x: box.x,
            y: box.y,
            width: box.w,
            height: box.h,
            padding: 0,
            text: el.text.content || '',
            fontFamily: el.text.fontFamily || BoardConfig.DEFAULT_FONT_FAMILY,
            fontSize: fontSize,
            fontStyle: konvaFontStyle(el.text),
            textDecoration: konvaTextDecoration(el.text),
            align: el.text.align || 'center',
            verticalAlign: el.text.valign || 'middle',
            fill: contrastColor(el.color)
        });
        textNode.moveToTop();

        return fontSize;
    }

    function syncLinkBadge(group, el, app) {
        const old = group.findOne('.linkBadge');
        if (old) old.destroy();
        if (!el.text.link) return;

        const badge = new Konva.Group({
            name: 'linkBadge',
            x: el.width - 26,
            y: el.height - 26
        });
        badge.add(new Konva.Circle({
            x: 10, y: 10, radius: 11,
            fill: '#FFFFFF',
            opacity: 0.92,
            shadowColor: 'rgba(0,0,0,1)',
            shadowBlur: 4,
            shadowOpacity: 0.25
        }));
        badge.add(new Konva.Text({
            x: 3.5, y: 4, text: '🔗', fontSize: 12, listening: false
        }));

        badge.on('click tap', (e) => {
            e.cancelBubble = true;
            let url = el.text.link;
            if (url && !/^https?:\/\//i.test(url)) url = 'https://' + url;
            if (url) window.open(url, '_blank', 'noopener');
        });
        badge.on('mouseenter', () => {
            if (app) app.container.style.cursor = 'pointer';
        });
        badge.on('mouseleave', () => {
            if (app) app.tools.updateCursor();
        });

        group.add(badge);
        badge.moveToTop();
    }

    // Model -> node sinxronizasiyası (ölçü/rəng/mətn dəyişəndə çağırılır)
    function updateNode(group, el, app) {
        if (el.type === 'sticky_note') {
            syncSticky(group, el, app);
        } else if (el.type === 'text') {
            syncTextElement(group, el, app);
        } else if (el.type === 'pen') {
            syncPen(group, el);
        } else if (el.type === 'shape') {
            syncShape(group, el, app);
        } else if (el.type === 'connector' && app.connectors) {
            app.connectors.updateNode(group, el);
        } else {
            group.setAttrs({ x: el.x, y: el.y, rotation: el.rotation || 0 });
        }
    }

    window.BoardElements = {
        createStickyNote,
        createText,
        createShape,
        syncShape,
        syncTextElement,
        syncPen,
        buildNode,
        updateNode,
        syncSticky,
        syncStickyText,
        textBox,
        effectiveFontSize,
        fitFontSize,
        measureTextHeight,
        contrastColor,
        konvaFontStyle
    };
})();
