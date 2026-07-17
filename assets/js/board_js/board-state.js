// board-state.js - Board sənədinin data modeli
(function() {
    function generateId() {
        return 'el_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    }

    class BoardState {
        constructor() {
            this.doc = BoardState.emptyDoc();
            this.selection = []; // element id-ləri
        }

        static emptyDoc() {
            return {
                format: BoardConfig.FORMAT,
                schema_version: BoardConfig.SCHEMA_VERSION,
                viewport: { x: 0, y: 0, zoom: 1 },
                elements: []
            };
        }

        static isBoardDoc(data) {
            return !!data && data.format === BoardConfig.FORMAT && Array.isArray(data.elements);
        }

        setDoc(doc) {
            const version = Number(doc && doc.schema_version) || 1;
            if (version < BoardConfig.SCHEMA_VERSION) {
                doc.schema_version = BoardConfig.SCHEMA_VERSION;
            }
            this.doc = doc;
            this.selection = [];
        }

        get elements() {
            return this.doc.elements;
        }

        get viewport() {
            return this.doc.viewport;
        }

        getElement(id) {
            return this.doc.elements.find(el => el.id === id) || null;
        }

        addElement(el) {
            if (!el.id) el.id = generateId();
            this.doc.elements.push(el);
            return el;
        }

        updateElement(id, patch) {
            const el = this.getElement(id);
            if (!el) return null;
            Object.assign(el, patch);
            return el;
        }

        updateElementText(id, patch) {
            const el = this.getElement(id);
            if (!el || !el.text) return null;
            Object.assign(el.text, patch);
            return el;
        }

        removeElements(ids) {
            const set = new Set(ids);
            this.doc.elements = this.doc.elements.filter(el => !set.has(el.id));
            this.selection = this.selection.filter(id => !set.has(id));
        }

        setSelection(ids) {
            this.selection = [...ids];
        }

        clearSelection() {
            this.selection = [];
        }
    }

    BoardState.generateId = generateId;
    window.BoardState = BoardState;
})();
