// board-text-editor.js - Sticky note mətninin yerində redaktəsi (HTML overlay)
(function() {
    class BoardTextEditor {
        constructor(app) {
            this.app = app;
            this.overlay = document.getElementById('textEditOverlay');
            this.textarea = null;
            this.editingId = null;
        }

        isEditing() {
            return !!this.editingId;
        }

        openFor(elementId) {
            if (this.editingId) this.commit();

            const el = this.app.state.getElement(elementId);
            const node = this.app.stage.findOne('#' + elementId);
            if (!el || !node) return;

            this.editingId = elementId;

            const textNode = node.findOne('.text');
            if (textNode) textNode.hide();
            const hlNode = node.findOne('.highlightRect');
            if (hlNode) hlNode.hide();
            this.app.mainLayer.batchDraw();

            const textarea = document.createElement('textarea');
            textarea.className = 'board-text-edit';
            textarea.value = el.text.content || '';
            textarea.placeholder = '';
            textarea.spellcheck = false;
            this.overlay.appendChild(textarea);
            this.textarea = textarea;

            this.layout();

            textarea.focus();
            textarea.setSelectionRange(textarea.value.length, textarea.value.length);

            textarea.addEventListener('input', () => this.layout());
            textarea.addEventListener('blur', () => this.commit());
            textarea.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    this.commit();
                }
                e.stopPropagation();
            });
        }

        // Textarea-nın mövqeyini, fontunu və şaquli mərkəzləməsini hesabla
        layout() {
            if (!this.editingId || !this.textarea) return;

            const el = this.app.state.getElement(this.editingId);
            const node = this.app.stage.findOne('#' + this.editingId);
            if (!el || !node) return;

            const zoom = this.app.state.viewport.zoom;
            const style = BoardElements.konvaFontStyle(el.text);
            const content = this.textarea.value;

            const box = BoardElements.textBox(el);
            const fontSize = BoardElements.effectiveFontSize(el, content);

            // Text elementində hündürlük yazdıqca canlı böyüyür
            if (el.type === 'text') {
                box.h = Math.max(
                    fontSize * BoardConfig.LINE_HEIGHT,
                    BoardElements.measureTextHeight(content || ' ', box.w, el.text.fontFamily, fontSize, style)
                );
            }

            // Mətn qutusunun künc nöqtəsi (fırlanma daxil) ekran koordinatlarında
            const corner = node.getAbsoluteTransform().point({ x: box.x, y: box.y });

            const textH = Math.min(
                box.h,
                BoardElements.measureTextHeight(content, box.w, el.text.fontFamily, fontSize, style)
            );

            // verticalAlign effekti üçün üst boşluq
            const valign = el.text.valign || 'middle';
            let padTop = 0;
            if (valign === 'middle') {
                padTop = Math.max(0, (box.h - textH) / 2);
            } else if (valign === 'bottom') {
                padTop = Math.max(0, box.h - textH);
            }

            const ta = this.textarea;
            ta.style.left = corner.x + 'px';
            ta.style.top = corner.y + 'px';
            ta.style.width = box.w * zoom + 'px';
            ta.style.height = box.h * zoom + 'px';
            ta.style.transform = `rotate(${el.rotation || 0}deg)`;
            ta.style.fontFamily = el.text.fontFamily || BoardConfig.DEFAULT_FONT_FAMILY;
            ta.style.fontSize = fontSize * zoom + 'px';
            ta.style.lineHeight = BoardConfig.LINE_HEIGHT;
            ta.style.fontWeight = el.text.bold ? 'bold' : 'normal';
            ta.style.fontStyle = el.text.italic ? 'italic' : 'normal';
            ta.style.textDecoration =
                (el.text.underline ? 'underline ' : '') + (el.text.strike ? 'line-through' : '');
            ta.style.textAlign = el.text.align || 'center';
            let textColor;
            if (el.type === 'text') {
                textColor = el.color || BoardConfig.DEFAULT_TEXT_COLOR;
            } else if (el.type === 'shape') {
                textColor = el.text.color || BoardConfig.DEFAULT_SHAPE_TEXT_COLOR;
            } else {
                textColor = BoardElements.contrastColor(el.color);
            }
            ta.style.color = textColor;
            ta.style.caretColor = textColor;
            ta.style.padding = `${padTop * zoom}px 0 0`;
        }

        commit() {
            if (!this.editingId || !this.textarea) return;

            const id = this.editingId;
            const value = this.textarea.value.replace(/\s+$/, '');

            this.editingId = null;
            this.textarea.remove();
            this.textarea = null;

            const el = this.app.state.getElement(id);
            const node = this.app.stage.findOne('#' + id);
            if (!el || !node) return;

            // Boş text elementi silinir (Miro davranışı)
            if (el.type === 'text' && !value.trim()) {
                this.app.state.removeElements([id]);
                node.destroy();
                this.app.selection.refresh();
                this.app.mainLayer.batchDraw();
                this.app.commit();
                return;
            }

            const changed = (el.text.content || '') !== value;
            el.text.content = value;

            const textNode = node.findOne('.text');
            if (textNode) textNode.show();
            BoardElements.updateNode(node, el, this.app);
            this.app.mainLayer.batchDraw();
            this.app.selection.transformer.forceUpdate();

            if (changed) this.app.commit();
            this.app.updateSelectionUI();
        }
    }

    window.BoardTextEditor = BoardTextEditor;
})();
