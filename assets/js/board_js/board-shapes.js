// board-shapes.js - Fiqur kataloqu: geometriya (SVG path), mətn qutuları, ikonlar
(function() {
    const n = v => Math.round(v * 100) / 100;

    function poly(pts) {
        return 'M ' + pts.map(p => `${n(p[0])} ${n(p[1])}`).join(' L ') + ' Z';
    }

    function rectPath(w, h) {
        return poly([[0, 0], [w, 0], [w, h], [0, h]]);
    }

    function roundedRectPath(w, h) {
        let r = Math.min(w, h) * 0.16;
        r = Math.min(r, w / 2, h / 2);
        return `M ${n(r)} 0 L ${n(w - r)} 0 Q ${n(w)} 0 ${n(w)} ${n(r)} ` +
               `L ${n(w)} ${n(h - r)} Q ${n(w)} ${n(h)} ${n(w - r)} ${n(h)} ` +
               `L ${n(r)} ${n(h)} Q 0 ${n(h)} 0 ${n(h - r)} ` +
               `L 0 ${n(r)} Q 0 0 ${n(r)} 0 Z`;
    }

    function ellipsePath(w, h) {
        const rx = n(w / 2), ry = n(h / 2);
        return `M 0 ${ry} A ${rx} ${ry} 0 1 0 ${n(w)} ${ry} A ${rx} ${ry} 0 1 0 0 ${ry} Z`;
    }

    function starPath(w, h) {
        const cx = w / 2, cy = h / 2, inner = 0.5;
        const pts = [];
        for (let i = 0; i < 10; i++) {
            const a = -Math.PI / 2 + i * Math.PI / 5;
            const f = i % 2 === 0 ? 1 : inner;
            pts.push([cx + (w / 2) * f * Math.cos(a), cy + (h / 2) * f * Math.sin(a)]);
        }
        return poly(pts);
    }

    function bubblePath(w, h) {
        let r = Math.min(14, w * 0.08, h * 0.08);
        const b = h * 0.82; // gövdənin alt xətti
        return `M ${n(r)} 0 L ${n(w - r)} 0 Q ${n(w)} 0 ${n(w)} ${n(r)} ` +
               `L ${n(w)} ${n(b - r)} Q ${n(w)} ${n(b)} ${n(w - r)} ${n(b)} ` +
               `L ${n(w * 0.32)} ${n(b)} L ${n(w * 0.14)} ${n(h)} L ${n(w * 0.18)} ${n(b)} ` +
               `L ${n(r)} ${n(b)} Q 0 ${n(b)} 0 ${n(b - r)} ` +
               `L 0 ${n(r)} Q 0 0 ${n(r)} 0 Z`;
    }

    function cloudPath(w, h) {
        return `M ${n(w * 0.22)} ${n(h * 0.85)} ` +
               `C ${n(w * 0.06)} ${n(h * 0.85)} 0 ${n(h * 0.68)} ${n(w * 0.08)} ${n(h * 0.56)} ` +
               `C 0 ${n(h * 0.38)} ${n(w * 0.16)} ${n(h * 0.26)} ${n(w * 0.30)} ${n(h * 0.32)} ` +
               `C ${n(w * 0.36)} ${n(h * 0.12)} ${n(w * 0.60)} ${n(h * 0.10)} ${n(w * 0.68)} ${n(h * 0.24)} ` +
               `C ${n(w * 0.84)} ${n(h * 0.18)} ${n(w * 0.98)} ${n(h * 0.32)} ${n(w * 0.92)} ${n(h * 0.50)} ` +
               `C ${n(w)} ${n(h * 0.62)} ${n(w * 0.94)} ${n(h * 0.85)} ${n(w * 0.78)} ${n(h * 0.85)} Z`;
    }

    function cylinderPath(w, h) {
        const ry = h * 0.14, rx = w / 2;
        return `M 0 ${n(ry)} A ${n(rx)} ${n(ry)} 0 0 1 ${n(w)} ${n(ry)} ` +
               `L ${n(w)} ${n(h - ry)} A ${n(rx)} ${n(ry)} 0 0 1 0 ${n(h - ry)} Z ` +
               `M 0 ${n(ry)} A ${n(rx)} ${n(ry)} 0 0 0 ${n(w)} ${n(ry)}`;
    }

    function directStoragePath(w, h) {
        const rx = w * 0.12, ry = h / 2;
        return `M ${n(rx)} 0 L ${n(w - rx)} 0 A ${n(rx)} ${n(ry)} 0 0 1 ${n(w - rx)} ${n(h)} ` +
               `L ${n(rx)} ${n(h)} A ${n(rx)} ${n(ry)} 0 0 1 ${n(rx)} 0 Z ` +
               `M ${n(w - rx)} 0 A ${n(rx)} ${n(ry)} 0 0 0 ${n(w - rx)} ${n(h)}`;
    }

    function terminatorPath(w, h) {
        const r = Math.min(h / 2, w / 2);
        return `M ${n(r)} 0 L ${n(w - r)} 0 A ${n(r)} ${n(h / 2)} 0 0 1 ${n(w - r)} ${n(h)} ` +
               `L ${n(r)} ${n(h)} A ${n(r)} ${n(h / 2)} 0 0 1 ${n(r)} 0 Z`;
    }

    function documentPath(w, h) {
        return `M 0 0 L ${n(w)} 0 L ${n(w)} ${n(h * 0.86)} ` +
               `C ${n(w * 0.72)} ${n(h * 0.70)} ${n(w * 0.61)} ${n(h * 1.02)} ${n(w * 0.42)} ${n(h * 0.94)} ` +
               `C ${n(w * 0.28)} ${n(h * 0.88)} ${n(w * 0.12)} ${n(h * 0.90)} 0 ${n(h * 0.84)} Z`;
    }

    // Üst-üstə qoyulmuş sənədlərin birləşmiş silueti
    function multiDocumentPath(w, h) {
        return `M 0 ${n(h * 0.18)} L ${n(w * 0.07)} ${n(h * 0.18)} L ${n(w * 0.07)} ${n(h * 0.09)} ` +
               `L ${n(w * 0.14)} ${n(h * 0.09)} L ${n(w * 0.14)} 0 L ${n(w)} 0 L ${n(w)} ${n(h * 0.52)} ` +
               `L ${n(w * 0.93)} ${n(h * 0.52)} L ${n(w * 0.93)} ${n(h * 0.60)} ` +
               `L ${n(w * 0.86)} ${n(h * 0.60)} L ${n(w * 0.86)} ${n(h * 0.88)} ` +
               `C ${n(w * 0.68)} ${n(h * 0.76)} ${n(w * 0.56)} ${n(h * 1.02)} ${n(w * 0.40)} ${n(h * 0.94)} ` +
               `C ${n(w * 0.26)} ${n(h * 0.87)} ${n(w * 0.12)} ${n(h * 0.90)} 0 ${n(h * 0.86)} Z`;
    }

    function delayPath(w, h) {
        return `M 0 0 L ${n(w * 0.5)} 0 A ${n(w * 0.5)} ${n(h / 2)} 0 0 1 ${n(w * 0.5)} ${n(h)} L 0 ${n(h)} Z`;
    }

    function displayPath(w, h) {
        return `M 0 ${n(h / 2)} L ${n(w * 0.2)} 0 L ${n(w * 0.78)} 0 ` +
               `A ${n(w * 0.22)} ${n(h / 2)} 0 0 1 ${n(w * 0.78)} ${n(h)} L ${n(w * 0.2)} ${n(h)} Z`;
    }

    function storedDataPath(w, h) {
        return `M ${n(w * 0.2)} 0 L ${n(w)} 0 A ${n(w * 0.18)} ${n(h / 2)} 0 0 0 ${n(w)} ${n(h)} ` +
               `L ${n(w * 0.2)} ${n(h)} A ${n(w * 0.2)} ${n(h / 2)} 0 0 1 ${n(w * 0.2)} 0 Z`;
    }

    function bracePath(w, h, right) {
        const x = v => n(right ? w - v : v);
        return `M ${x(w * 0.8)} 0 Q ${x(w * 0.45)} 0 ${x(w * 0.45)} ${n(h * 0.15)} ` +
               `L ${x(w * 0.45)} ${n(h * 0.38)} Q ${x(w * 0.45)} ${n(h * 0.5)} ${x(w * 0.15)} ${n(h * 0.5)} ` +
               `Q ${x(w * 0.45)} ${n(h * 0.5)} ${x(w * 0.45)} ${n(h * 0.62)} ` +
               `L ${x(w * 0.45)} ${n(h * 0.85)} Q ${x(w * 0.45)} ${n(h)} ${x(w * 0.8)} ${n(h)}`;
    }

    // ==================== Kataloq ====================
    // inset: [x0, y0, x1, y1] - mətn qutusu (en/hündürlüyün hissələri)
    // sq: default yerləşdirmə ölçüsü kvadratdır; noFill: yalnız xətt (fill olmur)
    const CATALOG = {
        rectangle:        { label: 'Düzbucaqlı', path: rectPath, inset: [0.07, 0.07, 0.93, 0.93] },
        rounded_rectangle:{ label: 'Yumru künclü', path: roundedRectPath, inset: [0.08, 0.08, 0.92, 0.92] },
        ellipse:          { label: 'Ellips / Dairə', path: ellipsePath, inset: [0.16, 0.16, 0.84, 0.84], sq: true },
        triangle:         { label: 'Üçbucaq', path: (w, h) => poly([[w / 2, 0], [w, h], [0, h]]), inset: [0.26, 0.45, 0.74, 0.94], sq: true },
        diamond:          { label: 'Romb', path: (w, h) => poly([[w / 2, 0], [w, h / 2], [w / 2, h], [0, h / 2]]), inset: [0.24, 0.24, 0.76, 0.76], sq: true },
        speech_bubble:    { label: 'Danışıq balonu', path: bubblePath, inset: [0.08, 0.08, 0.92, 0.72] },
        parallelogram:    { label: 'Paraleloqram', path: (w, h) => poly([[w * 0.2, 0], [w, 0], [w * 0.8, h], [0, h]]), inset: [0.24, 0.1, 0.76, 0.9] },
        star:             { label: 'Ulduz', path: starPath, inset: [0.32, 0.36, 0.68, 0.74], sq: true },
        arrow_right:      { label: 'Sağ ox', path: (w, h) => poly([[0, h * 0.28], [w * 0.62, h * 0.28], [w * 0.62, 0], [w, h / 2], [w * 0.62, h], [w * 0.62, h * 0.72], [0, h * 0.72]]), inset: [0.06, 0.3, 0.6, 0.7] },
        arrow_left:       { label: 'Sol ox', path: (w, h) => poly([[w, h * 0.28], [w * 0.38, h * 0.28], [w * 0.38, 0], [0, h / 2], [w * 0.38, h], [w * 0.38, h * 0.72], [w, h * 0.72]]), inset: [0.4, 0.3, 0.94, 0.7] },
        arrow_double:     { label: 'İkitərəfli ox', path: (w, h) => poly([[0, h / 2], [w * 0.25, 0], [w * 0.25, h * 0.28], [w * 0.75, h * 0.28], [w * 0.75, 0], [w, h / 2], [w * 0.75, h], [w * 0.75, h * 0.72], [w * 0.25, h * 0.72], [w * 0.25, h]]), inset: [0.28, 0.3, 0.72, 0.7] },
        pentagon:         { label: 'Beşbucaq', path: (w, h) => poly([[w / 2, 0], [w, h * 0.38], [w * 0.82, h], [w * 0.18, h], [0, h * 0.38]]), inset: [0.2, 0.28, 0.8, 0.9], sq: true },
        octagon:          { label: 'Səkkizbucaq', path: (w, h) => poly([[w * 0.29, 0], [w * 0.71, 0], [w, h * 0.29], [w, h * 0.71], [w * 0.71, h], [w * 0.29, h], [0, h * 0.71], [0, h * 0.29]]), inset: [0.14, 0.14, 0.86, 0.86], sq: true },
        hexagon:          { label: 'Altıbucaq', path: (w, h) => poly([[w * 0.25, 0], [w * 0.75, 0], [w, h / 2], [w * 0.75, h], [w * 0.25, h], [0, h / 2]]), inset: [0.18, 0.12, 0.82, 0.88] },
        predefined_process:{ label: 'Hazır proses', path: (w, h) => rectPath(w, h) + ` M ${n(w * 0.1)} 0 L ${n(w * 0.1)} ${n(h)} M ${n(w * 0.9)} 0 L ${n(w * 0.9)} ${n(h)}`, inset: [0.13, 0.1, 0.87, 0.9] },
        trapezoid:        { label: 'Trapesiya', path: (w, h) => poly([[w * 0.22, 0], [w * 0.78, 0], [w, h], [0, h]]), inset: [0.2, 0.14, 0.8, 0.9] },
        cloud:            { label: 'Bulud', path: cloudPath, inset: [0.2, 0.3, 0.8, 0.75] },
        cross:            { label: 'Xaç', path: (w, h) => poly([[w * 0.34, 0], [w * 0.66, 0], [w * 0.66, h * 0.34], [w, h * 0.34], [w, h * 0.66], [w * 0.66, h * 0.66], [w * 0.66, h], [w * 0.34, h], [w * 0.34, h * 0.66], [0, h * 0.66], [0, h * 0.34], [w * 0.34, h * 0.34]]), inset: [0.36, 0.36, 0.64, 0.64], sq: true },
        cylinder:         { label: 'Silindr (DB)', path: cylinderPath, inset: [0.1, 0.3, 0.9, 0.9] },
        brace_left:       { label: 'Sol mötərizə', path: (w, h) => bracePath(w, h, false), noFill: true, defaultSize: { width: 70, height: 190 }, inset: [0.1, 0.3, 0.9, 0.7] },
        brace_right:      { label: 'Sağ mötərizə', path: (w, h) => bracePath(w, h, true), noFill: true, defaultSize: { width: 70, height: 190 }, inset: [0.1, 0.3, 0.9, 0.7] },
        chevron:          { label: 'Şevron', path: (w, h) => poly([[0, 0], [w * 0.75, 0], [w, h / 2], [w * 0.75, h], [0, h], [w * 0.25, h / 2]]), inset: [0.3, 0.2, 0.72, 0.8] },
        pennant:          { label: 'Bayraq', path: (w, h) => poly([[0, 0], [w * 0.75, 0], [w, h / 2], [w * 0.75, h], [0, h]]), inset: [0.07, 0.16, 0.72, 0.84] },
        // ---- Flowchart-a xas ----
        terminator:       { label: 'Başlanğıc / Son', path: terminatorPath, inset: [0.16, 0.12, 0.84, 0.88] },
        document:         { label: 'Sənəd', path: documentPath, inset: [0.08, 0.08, 0.92, 0.74] },
        multi_document:   { label: 'Çoxlu sənəd', path: multiDocumentPath, inset: [0.1, 0.24, 0.82, 0.8] },
        manual_operation: { label: 'Əl əməliyyatı', path: (w, h) => poly([[0, 0], [w, 0], [w * 0.78, h], [w * 0.22, h]]), inset: [0.22, 0.1, 0.78, 0.86] },
        manual_input:     { label: 'Əl ilə giriş', path: (w, h) => poly([[0, h * 0.25], [w, 0], [w, h], [0, h]]), inset: [0.08, 0.3, 0.92, 0.94] },
        delay:            { label: 'Gecikmə', path: delayPath, inset: [0.08, 0.15, 0.72, 0.85] },
        display:          { label: 'Ekran', path: displayPath, inset: [0.22, 0.15, 0.78, 0.85] },
        merge:            { label: 'Birləşmə', path: (w, h) => poly([[0, 0], [w, 0], [w / 2, h]]), inset: [0.26, 0.06, 0.74, 0.52], sq: true },
        or_circle:        { label: 'VƏ YA', path: (w, h) => ellipsePath(w, h) + ` M ${n(w / 2)} 0 L ${n(w / 2)} ${n(h)} M 0 ${n(h / 2)} L ${n(w)} ${n(h / 2)}`, inset: [0.2, 0.2, 0.8, 0.8], sq: true },
        summing:          { label: 'Cəmləmə', path: (w, h) => ellipsePath(w, h) + ` M ${n(w * 0.146)} ${n(h * 0.146)} L ${n(w * 0.854)} ${n(h * 0.854)} M ${n(w * 0.854)} ${n(h * 0.146)} L ${n(w * 0.146)} ${n(h * 0.854)}`, inset: [0.24, 0.24, 0.76, 0.76], sq: true },
        stored_data:      { label: 'Saxlanan data', path: storedDataPath, inset: [0.26, 0.12, 0.86, 0.88] },
        off_page:         { label: 'Səhifədən kənar', path: (w, h) => poly([[0, 0], [w, 0], [w, h * 0.62], [w / 2, h], [0, h * 0.62]]), inset: [0.1, 0.08, 0.9, 0.56] },
        card:             { label: 'Kart', path: (w, h) => poly([[w * 0.2, 0], [w, 0], [w, h], [0, h], [0, h * 0.2]]), inset: [0.08, 0.14, 0.92, 0.92] },
        loop_limit:       { label: 'Dövr limiti', path: (w, h) => poly([[w * 0.18, 0], [w * 0.82, 0], [w, h * 0.3], [w, h], [0, h], [0, h * 0.3]]), inset: [0.08, 0.3, 0.92, 0.92] },
        internal_storage: { label: 'Daxili yaddaş', path: (w, h) => rectPath(w, h) + ` M ${n(w * 0.18)} 0 L ${n(w * 0.18)} ${n(h)} M 0 ${n(h * 0.22)} L ${n(w)} ${n(h * 0.22)}`, inset: [0.22, 0.26, 0.94, 0.94] },
        direct_storage:   { label: 'Birbaşa yaddaş', path: directStoragePath, inset: [0.15, 0.15, 0.72, 0.85] },
        collate:          { label: 'Çeşidləmə', path: (w, h) => poly([[0, 0], [w, 0], [w / 2, h / 2]]) + ' ' + poly([[0, h], [w, h], [w / 2, h / 2]]), inset: [0.3, 0.3, 0.7, 0.7], sq: true }
    };

    // Kiçik popup-dakı 8 əsas fiqur (Miro sırası ilə)
    const MAIN = ['rectangle', 'rounded_rectangle', 'ellipse', 'diamond',
                  'star', 'triangle', 'speech_bubble', 'arrow_right'];

    // "Daha çox fiqur" paneli - Əsas fiqurlar bölməsi
    const BASIC = ['rectangle', 'rounded_rectangle', 'ellipse', 'triangle', 'diamond', 'speech_bubble',
                   'parallelogram', 'star', 'arrow_right', 'arrow_left', 'arrow_double', 'pentagon',
                   'octagon', 'hexagon', 'predefined_process', 'trapezoid', 'cloud', 'cross',
                   'cylinder', 'brace_left', 'brace_right', 'chevron', 'pennant'];

    // "Daha çox fiqur" paneli - Flowchart bölməsi
    const FLOWCHART = ['rectangle', 'diamond', 'terminator', 'predefined_process', 'document', 'multi_document',
                       'manual_operation', 'hexagon', 'parallelogram', 'cylinder', 'direct_storage', 'internal_storage',
                       'manual_input', 'delay', 'display', 'merge', 'ellipse', 'or_circle',
                       'summing', 'stored_data', 'off_page', 'card', 'loop_limit', 'collate'];

    function get(type) {
        return CATALOG[type] || CATALOG.rectangle;
    }

    function label(type) {
        return get(type).label;
    }

    function textBox(type, w, h) {
        const ins = get(type).inset || [0.08, 0.08, 0.92, 0.92];
        return {
            x: w * ins[0],
            y: h * ins[1],
            w: w * (ins[2] - ins[0]),
            h: h * (ins[3] - ins[1])
        };
    }

    function defaultSize(type) {
        const def = get(type);
        if (def.defaultSize) return def.defaultSize;
        return def.sq ? { width: 150, height: 150 } : { width: 180, height: 120 };
    }

    function icon(type, size) {
        const s = size || 22;
        const d = get(type).path(s, s);
        return `<svg viewBox="-2 -2 ${s + 4} ${s + 4}" width="${s}" height="${s}" ` +
               `fill="none" stroke="currentColor" stroke-width="1.5" ` +
               `stroke-linejoin="round" stroke-linecap="round"><path d="${d}"/></svg>`;
    }

    // Fiqur seçim grid-ləri (həm menyu, həm toolbar üçün; dataAttr: 'shapetype' / 'swap')
    function sectionsHtml(dataAttr) {
        const sec = (title, list) =>
            `<div class="sm-sec-title">${title}</div>` +
            `<div class="sm-grid sm-grid-6">` +
            list.map(t =>
                `<button class="sm-item" data-${dataAttr}="${t}" title="${label(t)}">${icon(t, 24)}</button>`
            ).join('') +
            `</div>`;
        return sec('Əsas fiqurlar', BASIC) + sec('Flowchart', FLOWCHART);
    }

    window.BoardShapes = {
        CATALOG,
        MAIN,
        BASIC,
        FLOWCHART,
        get,
        label,
        textBox,
        defaultSize,
        icon,
        sectionsHtml
    };
})();
