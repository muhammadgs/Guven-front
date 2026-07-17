// board-history.js - Undo/Redo (snapshot əsaslı)
(function() {
    class BoardHistory {
        constructor(limit) {
            this.limit = limit || BoardConfig.HISTORY_LIMIT;
            this.stack = [];
            this.index = -1;
        }

        reset(doc) {
            this.stack = [JSON.stringify(doc)];
            this.index = 0;
        }

        push(doc) {
            const snapshot = JSON.stringify(doc);
            // Eyni vəziyyəti təkrar yazma
            if (this.stack[this.index] === snapshot) return;

            this.stack = this.stack.slice(0, this.index + 1);
            this.stack.push(snapshot);

            if (this.stack.length > this.limit) {
                this.stack.shift();
            }
            this.index = this.stack.length - 1;
        }

        canUndo() {
            return this.index > 0;
        }

        canRedo() {
            return this.index < this.stack.length - 1;
        }

        undo() {
            if (!this.canUndo()) return null;
            this.index--;
            return JSON.parse(this.stack[this.index]);
        }

        redo() {
            if (!this.canRedo()) return null;
            this.index++;
            return JSON.parse(this.stack[this.index]);
        }
    }

    window.BoardHistory = BoardHistory;
})();
