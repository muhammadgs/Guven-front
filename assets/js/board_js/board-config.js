// board-config.js - Board modulunun sabitləri
(function() {
    window.BoardConfig = {
        API_URL: 'http://vps.guvenfinans.az:8008',

        FORMAT: 'guven-board',
        SCHEMA_VERSION: 2,

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

        // Mətn highlight rəngləri (shape toolbar)
        HIGHLIGHT_COLORS: [
            '#FFF176', '#FFE082', '#FFAB91', '#F8BBD0',
            '#CE93D8', '#90CAF9', '#A5D6A7', '#E6EE9C'
        ],

        // Qələm aləti
        PEN_COLORS: [
            '#1A1A1A', '#F03E3E', '#F76707',
            '#F5B800', '#2F9E44', '#1971C2',
            '#7048E8', '#E64980', '#FFFFFF'
        ],
        DEFAULT_PEN_COLOR: '#1A1A1A',
        PEN_WIDTHS: [2, 4, 8, 16],
        DEFAULT_PEN_WIDTH: 4,
        PEN_MIN_DIST: 3,
        PEN_SIMPLIFY_TOLERANCE: 1.2,
        PEN_COLOR_KEY: 'guven_board_pen_color',
        PEN_WIDTH_KEY: 'guven_board_pen_width',

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
