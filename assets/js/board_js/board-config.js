// board-config.js - Board modulunun sabitləri
(function() {
    window.BoardConfig = {
        API_URL: 'http://vps.guvenfinans.az:8008',

        FORMAT: 'guven-board',
        SCHEMA_VERSION: 3,

        // Sticky note rəng paleti (2 sütun x 8 sıra)
        STICKY_COLORS: [
            '#FFF9B1', '#F5D128',
            '#FFA65D', '#F58E8E',
            '#FFC7E0', '#F78FD3',
            '#A6CCF5', '#B79CED',
            '#9BE1F5', '#78A6F0',
            '#63D9C6', '#61D975',
            '#CDF078', '#F0F0F2',
            '#FFFFFF', '#1A1A1A'
        ],
        DEFAULT_STICKY_COLOR: '#FFF9B1',

        DEFAULT_STICKY_SIZE: { width: 200, height: 200 },
        STICKY_MIN_SIZE: 40,
        DEFAULT_TEXT_WIDTH: 280,
        DEFAULT_TEXT_FONT_SIZE: 18,
        DEFAULT_TEXT_COLOR: '#1A1A1A',
        TEXT_MIN_WIDTH: 40,
        TEXT_PADDING: 14,
        LINE_HEIGHT: 1.2,
        FONT_MIN: 10,
        DEFAULT_FONT_FAMILY: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",

        // Kontekst toolbar üçün fontlar (Google Fonts board.html-də yüklənir)
        FONTS: [
            { label: 'Klassik', family: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif" },
            { label: 'Inter', family: "'Inter', sans-serif" },
            { label: 'Roboto', family: "'Roboto', sans-serif" },
            { label: 'Montserrat', family: "'Montserrat', sans-serif" },
            { label: 'Lora', family: "'Lora', serif" },
            { label: 'Caveat', family: "'Caveat', cursive" },
            { label: 'Marker', family: "'Permanent Marker', cursive" }
        ],

        FONT_SIZES: [10, 12, 14, 18, 24, 32, 48, 64, 96, 144],

        // Sticky note formaları
        STICKY_SHAPES: ['square', 'rounded', 'circle', 'triangle', 'diamond', 'parallelogram', 'star', 'bubble'],

        // Shape aləti
        DEFAULT_SHAPE_STROKE: '#1A1A2E',
        DEFAULT_SHAPE_STROKE_WIDTH: 2,
        DEFAULT_SHAPE_FILL: 'transparent',
        DEFAULT_SHAPE_TEXT_COLOR: '#1A1A2E',
        SHAPE_STROKE_WIDTHS: [1, 2, 4, 8],

        // Fiqurlar arasında bağlı connector-lar
        DEFAULT_CONNECTOR_COLOR: '#1A1A2E',
        DEFAULT_CONNECTOR_WIDTH: 2,
        DEFAULT_CONNECTOR_ROUTING: 'elbow',
        CONNECTOR_WIDTHS: [1, 2, 4, 8],
        CONNECTOR_QUICK_GAP: 220,
        CONNECTOR_QUICK_SPACING: 76,
        CONNECTOR_CORNER_RADIUS: 14,
        CONNECTOR_HIT_WIDTH: 22,

        // Mətn highlight rəngləri (shape toolbar)
        HIGHLIGHT_COLORS: [
            '#FFF176', '#FFE082', '#FFAB91', '#F8BBD0',
            '#CE93D8', '#90CAF9', '#A5D6A7', '#E6EE9C'
        ],

        // Ümumi 9-luq rəng siyahısı (connector toolbar + mətn rəngi seçimləri bunu işlədir)
        PEN_COLORS: [
            '#1A1A1A', '#F03E3E', '#F76707',
            '#F5B800', '#2F9E44', '#1971C2',
            '#7048E8', '#E64980', '#FFFFFF'
        ],

        // Qələm aləti — bütün ölçülər EKRAN pikselidir, zoom-a görə düzəlir
        PEN_MIN_DIST: 1.6,             // iki nöqtə arasındakı minimum məsafə
        PEN_SIMPLIFY_TOLERANCE: 0.9,   // gedişin sonunda bir dəfə tətbiq olunan RDP dözümü
        PEN_SMOOTHING: 0.45,           // 0 = xam giriş, 1 = tam gecikmə (əl titrəməsi süzgəci)
        PEN_CORNER_RATIO: 2,           // künc yumşaltma radiusu = qalınlıq * bu
        PEN_CORNER_MIN: 3,             // minimum künc radiusu (dünya vahidi)
        OBJECT_ERASER_SIZE: 28,        // obyekt silgisi dairəsinin diametri
        ERASER_SAMPLE_RATIO: 0.35,     // kəsik axtarışı addımı = radius * bu

        // Çəkim paneli (qələm / marker / silgilər / lasso)
        // Hər swatch = {color, width}; qalınlıq swatch-ın içindəki dairənin ölçüsündə görünür
        DRAW_PEN_DEFAULTS: [
            { color: '#1A1A1A', width: 4 },
            { color: '#1971C2', width: 4 },
            { color: '#C92A2A', width: 4 }
        ],
        DRAW_MARKER_DEFAULTS: [
            { color: '#FFF9B1', width: 14 },
            { color: '#FF9E9E', width: 14 },
            { color: '#8CE8A8', width: 14 }
        ],
        MAX_DRAW_SWATCHES: 10,
        MARKER_OPACITY: 0.42,
        PEN_WIDTH_RANGE: [1, 20],
        MARKER_WIDTH_RANGE: [4, 40],
        ERASER_SIZE_RANGE: [8, 80],
        DEFAULT_ERASER_SIZE: 28,
        DRAW_STORE_KEY: 'guven_board_draw_v1',

        // Qələm paleti (4 sütun x 7 sıra, doymuş rənglər)
        PEN_PALETTE: [
            '#FFF176', '#FFD43B', '#F59F00', '#FFFFFF',
            '#FFA94D', '#FF922B', '#E8590C', '#E9ECEF',
            '#FF8787', '#FA5252', '#C92A2A', '#ADB5BD',
            '#69DB7C', '#40C057', '#2B8A3E', '#495057',
            '#74C0FC', '#339AF0', '#1864AB', '#212529',
            '#B197FC', '#845EF7', '#6741D9', '#A87C7C',
            '#000000', '#1971C2', '#E03131', '#7F1D1D'
        ],
        // Marker paleti (daha soft / pastel tonlar)
        MARKER_PALETTE: [
            '#FFF9B1', '#FFE066', '#D9A600', '#FFFFFF',
            '#FFD8A8', '#FFB366', '#C77729', '#F1F3F5',
            '#FFC9C9', '#FF9E9E', '#E05252', '#CED4DA',
            '#C3F5D0', '#8CE8A8', '#4CAF6E', '#868E96',
            '#C5DFFF', '#8FBFFF', '#4D82D9', '#343A40',
            '#E5DBFF', '#C0A9FF', '#9775FA', '#BE9B9B',
            '#212529', '#3B5BDB', '#FF6B6B', '#A61E1E'
        ],

        ZOOM_MIN: 0.05,
        ZOOM_MAX: 4,
        ZOOM_WHEEL_FACTOR: 1.08,
        ZOOM_BTN_FACTOR: 1.25,

        GRID_SIZE: 24,

        AUTOSAVE_DELAY: 2500,
        HISTORY_LIMIT: 100,

        SELECTION_COLOR: '#4262FF',

        LOCAL_DRAFT_KEY: 'guven_board_draft',
        STICKY_COLOR_KEY: 'guven_board_sticky_color'
    };
})();
