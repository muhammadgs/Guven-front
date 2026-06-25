class ControlManager {
    constructor(diagramTool) {
        this.diagramTool = diagramTool;
        this.deleteMode = 'shapes';
        this.isDeleteConnectionActive = false;
    }

    setupControls() {
        this.setupToolButtons();
        this.setupFormatControls();
        this.setupSidebarControls();
        this.setupModalControls();
        this.setupShapeControls();
        this.setupExportControls();
        this.setupContextMenu();
        this.setupEditTextButton();
    }

    setupToolButtons() {
        document.getElementById('selectBtn').addEventListener('click', () => {
            this.isDeleteConnectionActive = false;
            this.diagramTool.setTool('select');
            this.updateToolButtons('selectBtn');
            this.updateDeleteButton();
        });

        document.getElementById('panBtn').addEventListener('click', () => {
            this.isDeleteConnectionActive = false;
            this.diagramTool.setTool('pan');
            this.updateToolButtons('panBtn');
            this.updateDeleteButton();
        });

        document.getElementById('freehandBtn').addEventListener('click', () => {
            this.isDeleteConnectionActive = false;
            this.diagramTool.setTool('freehand');
            this.updateToolButtons('freehandBtn');
            this.updateDeleteButton();
        });

        document.getElementById('textBtn').addEventListener('click', () => {
            this.isDeleteConnectionActive = false;
            this.diagramTool.showTextModal();
            this.updateDeleteButton();
        });

        document.getElementById('deleteBtn').addEventListener('click', () => {
            if (this.isDeleteConnectionActive) {
                this.isDeleteConnectionActive = false;
                this.diagramTool.setTool('select');
                this.updateToolButtons('selectBtn');
            } else {
                this.isDeleteConnectionActive = true;
                this.diagramTool.setTool('delete-connection');
                this.updateToolButtons('deleteBtn');
            }
            this.updateDeleteButton();
        });

        document.getElementById('zoomInBtn').addEventListener('click', () => {
            this.diagramTool.zoomIn();
        });

        document.getElementById('zoomOutBtn').addEventListener('click', () => {
            this.diagramTool.zoomOut();
        });

        document.getElementById('resetZoomBtn').addEventListener('click', () => {
            this.diagramTool.resetZoom();
        });

        document.getElementById('newBtn').addEventListener('click', () => {
            this.diagramTool.newDiagram();
        });

        document.getElementById('saveBtn').addEventListener('click', () => {
            this.diagramTool.saveDiagram();
        });

        document.getElementById('exportBtn').addEventListener('click', () => {
            this.diagramTool.showExportModal();
        });

        document.getElementById('shareBtn').addEventListener('click', () => {
            this.diagramTool.shareDiagram();
        });

        document.getElementById('undoBtn').addEventListener('click', () => {
            this.diagramTool.undo();
        });

        document.getElementById('redoBtn').addEventListener('click', () => {
            this.diagramTool.redo();
        });

        document.getElementById('collapseBtn').addEventListener('click', () => {
            this.diagramTool.toggleSidebar();
        });
    }

    updateDeleteButton() {
        const deleteBtn = document.getElementById('deleteBtn');
        if (!deleteBtn) return;

        if (this.isDeleteConnectionActive) {
            deleteBtn.innerHTML = '<i class="fas fa-unlink"></i>';
            deleteBtn.title = 'Delete Connections (Click on connections to delete)';
            deleteBtn.classList.add('delete-mode');
        } else {
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            deleteBtn.title = 'Delete Selected Shapes';
            deleteBtn.classList.remove('delete-mode');
        }
    }

    updateToolButtons(activeBtnId) {
        document.querySelectorAll('.canvas-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        const activeBtn = document.getElementById(activeBtnId);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
    }

    setupFormatControls() {
        document.getElementById('fillColor').addEventListener('input', (e) => {
            this.diagramTool.updateSelectedFill(e.target.value);
        });

        document.getElementById('strokeColor').addEventListener('input', (e) => {
            this.diagramTool.updateSelectedStroke(e.target.value);
        });

        const strokeWidth = document.getElementById('strokeWidth');
        const strokeWidthValue = document.getElementById('strokeWidthValue');

        strokeWidth.addEventListener('input', (e) => {
            const value = e.target.value;
            strokeWidthValue.textContent = value + 'px';
            this.diagramTool.updateSelectedStrokeWidth(value);
        });

        const fontSize = document.getElementById('fontSize');
        const fontSizeValue = document.getElementById('fontSizeValue');

        fontSize.addEventListener('input', (e) => {
            const value = e.target.value;
            fontSizeValue.textContent = value + 'px';
            this.diagramTool.updateSelectedFontSize(value);
        });
    }

    setupSidebarControls() {
        document.querySelectorAll('.shape-item[data-type]').forEach(item => {
            if (!['line', 'elbow', 'curve'].includes(item.dataset.type)) {
                item.setAttribute('draggable', 'true');

                item.addEventListener('dragstart', (e) => {
                    this.diagramTool.currentDragShapeType = item.dataset.type;
                    e.dataTransfer.setData('text/plain', item.dataset.type);
                    e.dataTransfer.effectAllowed = 'copy';

                    const icon = item.querySelector('.shape-icon').cloneNode(true);
                    icon.style.position = 'fixed';
                    icon.style.left = '-1000px';
                    document.body.appendChild(icon);
                    e.dataTransfer.setDragImage(icon, 20, 20);
                });
            }

            item.addEventListener('click', () => {
                if (['line', 'elbow', 'curve'].includes(item.dataset.type)) {
                    document.querySelectorAll('.shape-item.selected').forEach(i => {
                        i.classList.remove('selected');
                    });
                    item.classList.add('selected');
                }
            });
        });
    }

    setupModalControls() {
        document.getElementById('addTextBtn').addEventListener('click', () => {
            this.diagramTool.addText();
        });

        document.getElementById('cancelTextBtn').addEventListener('click', () => {
            this.diagramTool.hideTextModal();
        });

        document.getElementById('textInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.diagramTool.addText();
            }
        });

        document.getElementById('confirmExportBtn').addEventListener('click', () => {
            this.diagramTool.exportDiagram();
        });

        document.getElementById('cancelExportBtn').addEventListener('click', () => {
            this.diagramTool.hideExportModal();
        });
    }

    setupShapeControls() {
        document.querySelectorAll('.context-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.diagramTool.handleContextAction(action);
            });
        });
    }

    setupExportControls() {
        document.querySelectorAll('.export-option input').forEach(input => {
            input.addEventListener('change', (e) => {});
        });
    }

    setupContextMenu() {
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.context-menu') && !e.target.closest('#drawingCanvas')) {
                this.hideContextMenu();
            }
        });
    }

    setupEditTextButton() {
        const editTextBtn = document.getElementById('editTextBtn');
        if (!editTextBtn) return;

        editTextBtn.addEventListener('click', () => {
            if (this.diagramTool.selectedShapes.size === 1) {
                const shapeId = Array.from(this.diagramTool.selectedShapes)[0];
                const shape = this.diagramTool.shapes.find(s => s.id === shapeId);

                if (shape) {
                    document.getElementById('textInput').value = shape.text || '';
                    this.diagramTool.showTextModal();
                }
            } else {
                alert('Please select exactly one shape to edit its text');
            }
        });
    }

    updateUI() {
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');

        undoBtn.disabled = !this.diagramTool.historyManager.canUndo();
        redoBtn.disabled = !this.diagramTool.historyManager.canRedo();

        const hasSelection = this.diagramTool.selectedShapes.size > 0;
        document.getElementById('deleteBtn').disabled = !this.isDeleteConnectionActive && !hasSelection;
    }

    updateStatusBar() {
        const coordinates = document.getElementById('coordinates');
        const selectionInfo = document.getElementById('selectionInfo');
        const canvasSize = document.getElementById('canvasSize');

        if (coordinates) {
            coordinates.textContent = `X: ${Math.round(this.diagramTool.lastMouse.x)}, Y: ${Math.round(this.diagramTool.lastMouse.y)}`;
        }

        if (selectionInfo) {
            const count = this.diagramTool.selectedShapes.size;
            selectionInfo.textContent = count === 0 ? 'No selection' :
                                       count === 1 ? '1 shape selected' :
                                       `${count} shapes selected`;
        }

        if (canvasSize) {
            const bounds = this.diagramTool.getDiagramBounds();
            canvasSize.textContent = `Canvas: ${Math.round(bounds.width)} × ${Math.round(bounds.height)}`;
        }
    }

    showTextModal() {
        document.getElementById('textModal').style.display = 'flex';
        document.getElementById('textInput').focus();
        document.getElementById('textInput').select();
    }

    hideTextModal() {
        document.getElementById('textModal').style.display = 'none';
        document.getElementById('textInput').value = '';
    }

    showExportModal() {
        document.getElementById('exportModal').style.display = 'flex';
    }

    hideExportModal() {
        document.getElementById('exportModal').style.display = 'none';
    }

    showContextMenu(x, y) {
        const menu = document.getElementById('contextMenu');
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        menu.style.display = 'block';

        const hasSelection = this.diagramTool.selectedShapes.size > 0;
        document.querySelectorAll('.context-item').forEach(item => {
            item.style.display = 'flex';

            if (['copy', 'delete', 'editText', 'bringToFront', 'sendToBack'].includes(item.dataset.action)) {
                item.style.display = hasSelection ? 'flex' : 'none';
            }
        });
    }

    hideContextMenu() {
        document.getElementById('contextMenu').style.display = 'none';
    }

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const collapseBtn = document.getElementById('collapseBtn');

        sidebar.classList.toggle('collapsed');

        if (sidebar.classList.contains('collapsed')) {
            collapseBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
        } else {
            collapseBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
        }
    }
}