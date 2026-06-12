(function() {
    class EventHandler {
        constructor(diagramTool) {
            this.diagramTool = diagramTool;
            this.canvas = diagramTool.canvas;
            this.isDraggingFromSidebar = false;
            this.dragShapeType = null;
            this.editingText = false;
            this.currentTextElement = null;
            this.mouseDown = false;
            this.selectionStart = null;
            this.isSelecting = false;
        }

        setupEventListeners() {
            this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
            this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
            this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
            this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));
            this.canvas.addEventListener('dblclick', (e) => this.handleDoubleClick(e));
            this.canvas.addEventListener('mouseleave', () => this.handleMouseLeave());
            this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
            this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
            this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));
            this.canvas.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.diagramTool.showContextMenu(e.clientX, e.clientY);
            });

            this.setupSidebarDragEvents();
            this.setupCanvasDropEvents();
            this.setupKeyboardShortcuts();

            document.addEventListener('click', (e) => {
                if (!e.target.closest('.context-menu')) {
                    document.getElementById('contextMenu').style.display = 'none';
                }
                if (this.editingText && !e.target.closest('#drawingCanvas')) {
                    this.finishTextEditing();
                }
            });
        }

        setupSidebarDragEvents() {
            const shapeItems = document.querySelectorAll('.shape-item[data-type]:not([data-type="line"]):not([data-type="elbow"]):not([data-type="curve"])');
            shapeItems.forEach(item => {
                item.setAttribute('draggable', 'true');

                item.addEventListener('dragstart', (e) => {
                    this.isDraggingFromSidebar = true;
                    this.dragShapeType = e.currentTarget.dataset.type;
                    e.dataTransfer.setData('text/plain', this.dragShapeType);
                    e.dataTransfer.effectAllowed = 'copy';

                    const icon = e.currentTarget.querySelector('.shape-icon').cloneNode(true);
                    icon.style.position = 'fixed';
                    icon.style.left = '-1000px';
                    document.body.appendChild(icon);
                    e.dataTransfer.setDragImage(icon, 20, 20);
                });

                item.addEventListener('click', (e) => {
                    if (['line', 'curve', 'elbow'].includes(item.dataset.type)) {
                        const connectorItems = document.querySelectorAll('.shape-item[data-type="line"], .shape-item[data-type="elbow"], .shape-item[data-type="curve"]');
                        connectorItems.forEach(i => i.classList.remove('selected'));
                        item.classList.add('selected');
                    }
                });
            });
        }

        setupCanvasDropEvents() {
            this.canvas.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                this.canvas.classList.add('drag-over');
            });

            this.canvas.addEventListener('dragleave', () => {
                this.canvas.classList.remove('drag-over');
            });

            this.canvas.addEventListener('drop', (e) => {
                e.preventDefault();
                this.canvas.classList.remove('drag-over');

                if (this.isDraggingFromSidebar && this.dragShapeType) {
                    const { x, y } = this.getCanvasCoordinates(e);
                    this.diagramTool.createShapeFromSidebar(this.dragShapeType, x, y);
                }

                this.isDraggingFromSidebar = false;
                this.dragShapeType = null;
            });
        }

        setupKeyboardShortcuts() {
            document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        }

        handleKeyDown(e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.diagramTool.undo();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                e.preventDefault();
                this.diagramTool.redo();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
                e.preventDefault();
                this.diagramTool.redo();
            }
            if ((e.key === 'Delete' || e.key === 'Backspace') && this.diagramTool.selectedShapes.size > 0) {
                e.preventDefault();
                this.diagramTool.deleteSelected();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
                e.preventDefault();
                this.diagramTool.copySelected();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
                e.preventDefault();
                this.diagramTool.paste();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
                e.preventDefault();
                this.diagramTool.cutSelected();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
                e.preventDefault();
                this.diagramTool.selectAll();
            }
            if (e.key === 'Escape') {
                this.diagramTool.shapeManager.resetConnection();
                this.diagramTool.draw();
            }
            if (this.diagramTool.selectedShapes.size > 0) {
                const moveAmount = e.shiftKey ? 10 : 1;
                switch(e.key) {
                    case 'ArrowUp':
                        e.preventDefault();
                        this.moveSelectedShapes(0, -moveAmount);
                        break;
                    case 'ArrowDown':
                        e.preventDefault();
                        this.moveSelectedShapes(0, moveAmount);
                        break;
                    case 'ArrowLeft':
                        e.preventDefault();
                        this.moveSelectedShapes(-moveAmount, 0);
                        break;
                    case 'ArrowRight':
                        e.preventDefault();
                        this.moveSelectedShapes(moveAmount, 0);
                        break;
                }
            }
        }

        moveSelectedShapes(dx, dy) {
            this.diagramTool.selectedShapes.forEach(shapeId => {
                const shape = this.diagramTool.shapes.find(s => s.id === shapeId);
                if (shape) {
                    if (shape.type === 'freehand') {
                        this.diagramTool.shapeManager.updateFreehandShapePosition(shape, dx, dy);
                    } else {
                        shape.x += dx;
                        shape.y += dy;
                        this.diagramTool.shapeManager.updateConnectionPoints(shape);
                    }
                }
            });
            this.diagramTool.saveToHistory();
            this.diagramTool.draw();
        }

        getCanvasCoordinates(e) {
            const rect = this.canvas.getBoundingClientRect();
            let clientX, clientY;

            if (e.type.includes('touch')) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            } else {
                clientX = e.clientX;
                clientY = e.clientY;
            }

            const x = (clientX - rect.left - this.diagramTool.offset.x) / this.diagramTool.zoom;
            const y = (clientY - rect.top - this.diagramTool.offset.y) / this.diagramTool.zoom;
            return { x, y };
        }

        handleMouseDown(e) {
            this.mouseDown = true;
            const { x, y } = this.getCanvasCoordinates(e);
            this.diagramTool.lastMouse = { x: e.clientX, y: e.clientY };



            if (this.editingText) {
                this.finishTextEditing();
                return;
            }

            if (this.diagramTool.controlManager.isDeleteConnectionActive) {
                const connection = this.diagramTool.selectConnectionAt(x, y);
                if (connection) {
                    this.diagramTool.connections.splice(connection.index, 1);
                    this.diagramTool.saveToHistory();
                    this.diagramTool.draw();
                }
                return;
            }

            const resizeHandle = this.getResizeHandleAt(x, y);
            if (resizeHandle) {
                console.log('Resize handle clicked:', resizeHandle);
                this.diagramTool.resizing = true;
                this.diagramTool.resizeHandle = resizeHandle;
                this.diagramTool.dragStart = { x, y };

                // Shape-i seç (əgər deyilsə)
                if (!this.diagramTool.selectedShapes.has(resizeHandle.shapeId)) {
                    this.diagramTool.selectedShapes.clear();
                    this.diagramTool.selectedShapes.add(resizeHandle.shapeId);
                }

                return;
            }

            const connectionPoint = this.diagramTool.shapeManager.getConnectionPointAt(x, y);
            if (connectionPoint) {
                this.diagramTool.shapeManager.startConnectionFromPoint(connectionPoint, e);
                return;
            }

            if (this.diagramTool.selectedTool === 'freehand') {
                this.diagramTool.shapeManager.startFreehandDrawing(x, y);
                return;
            }

            if (this.diagramTool.selectedTool === 'pan') {
                this.diagramTool.panning = true;
                this.canvas.style.cursor = 'grabbing';
                return;
            }

            if (this.diagramTool.selectedTool === 'select') {
                this.selectionStart = { x: e.clientX, y: e.clientY };
                this.isSelecting = true;
            }

            const clickedShape = this.getShapeAt(x, y);

            if (clickedShape) {
                if (e.ctrlKey || e.metaKey || e.shiftKey) {
                    if (this.diagramTool.selectedShapes.has(clickedShape.id)) {
                        this.diagramTool.selectedShapes.delete(clickedShape.id);
                    } else {
                        this.diagramTool.selectedShapes.add(clickedShape.id);
                    }
                } else {
                    if (!this.diagramTool.selectedShapes.has(clickedShape.id)) {
                        this.diagramTool.selectedShapes.clear();
                        this.diagramTool.selectedShapes.add(clickedShape.id);
                    }
                }

                this.diagramTool.dragging = true;
                this.diagramTool.dragStart = { x, y };
                this.diagramTool.dragOffset = {
                    x: clickedShape.x - x,
                    y: clickedShape.y - y
                };

                this.diagramTool.draw();
            } else {
                if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                    this.diagramTool.selectedShapes.clear();
                    this.diagramTool.shapeManager.resetConnection();
                    this.diagramTool.draw();
                }
            }
        }

        handleMouseMove(e) {
            const { x, y } = this.getCanvasCoordinates(e);

            const coordinates = document.getElementById('coordinates');
            if (coordinates) {
                coordinates.textContent = `X: ${Math.round(x)}, Y: ${Math.round(y)}`;
            }

            if (this.diagramTool.selectedTool === 'freehand' &&
                this.diagramTool.shapeManager.drawingFreehand) {
                this.diagramTool.shapeManager.updateFreehandDrawing(x, y);
                return;
            }

            if (this.diagramTool.controlManager.isDeleteConnectionActive) {
                const connection = this.diagramTool.selectConnectionAt(x, y);
                if (connection) {
                    this.canvas.style.cursor = 'pointer';
                } else {
                    this.canvas.style.cursor = 'not-allowed';
                }
                return;
            }

            this.updateCursor(x, y);
            this.diagramTool.shapeManager.updateConnectionPreview(x, y);

            if (this.diagramTool.panning) {
                const dx = e.clientX - this.diagramTool.lastMouse.x;
                const dy = e.clientY - this.diagramTool.lastMouse.y;
                this.diagramTool.offset.x += dx;
                this.diagramTool.offset.y += dy;
                this.diagramTool.lastMouse = { x: e.clientX, y: e.clientY };
                this.diagramTool.draw();
                return;
            }

            if (this.diagramTool.resizing) {
                this.handleResize(x, y);
                return;
            }

            if (this.diagramTool.dragging && this.diagramTool.selectedShapes.size > 0) {
                const dx = x - this.diagramTool.dragStart.x;
                const dy = y - this.diagramTool.dragStart.y;

                this.diagramTool.selectedShapes.forEach(shapeId => {
                    const shape = this.diagramTool.shapes.find(s => s.id === shapeId);
                    if (shape) {
                        if (shape.type === 'freehand') {
                            this.diagramTool.shapeManager.updateFreehandShapePosition(shape, dx, dy);
                        } else {
                            shape.x = this.diagramTool.dragOffset.x + x;
                            shape.y = this.diagramTool.dragOffset.y + y;
                        }
                        this.diagramTool.shapeManager.updateConnectionPoints(shape);
                    }
                });

                this.diagramTool.draw();
            }
        }

        handleResize(x, y) {
            const shape = this.diagramTool.shapes.find(s => s.id === this.diagramTool.resizeHandle.shapeId);
            if (!shape) return;

            const dx = x - this.diagramTool.dragStart.x;
            const dy = y - this.diagramTool.dragStart.y;
            const minSize = 20;

            switch(this.diagramTool.resizeHandle.handle) {
                case 'nw':
                    if (shape.width - dx >= minSize) shape.width -= dx;
                    if (shape.height - dy >= minSize) shape.height -= dy;
                    shape.x += dx;
                    shape.y += dy;
                    break;
                case 'ne':
                    if (shape.width + dx >= minSize) shape.width += dx;
                    if (shape.height - dy >= minSize) shape.height -= dy;
                    shape.y += dy;
                    break;
                case 'sw':
                    if (shape.width - dx >= minSize) shape.width -= dx;
                    if (shape.height + dy >= minSize) shape.height += dy;
                    shape.x += dx;
                    break;
                case 'se':
                    if (shape.width + dx >= minSize) shape.width += dx;
                    if (shape.height + dy >= minSize) shape.height += dy;
                    break;
                case 'n':
                    if (shape.height - dy >= minSize) {
                        shape.height -= dy;
                        shape.y += dy;
                    }
                    break;
                case 's':
                    if (shape.height + dy >= minSize) shape.height += dy;
                    break;
                case 'w':
                    if (shape.width - dx >= minSize) {
                        shape.width -= dx;
                        shape.x += dx;
                    }
                    break;
                case 'e':
                    if (shape.width + dx >= minSize) shape.width += dx;
                    break;
            }

            this.diagramTool.dragStart = { x, y };
            this.diagramTool.shapeManager.updateConnectionPoints(shape);
            this.diagramTool.draw();
        }

        handleMouseUp(e) {
            this.mouseDown = false;
            const { x, y } = this.getCanvasCoordinates(e);

            if (this.diagramTool.selectedTool === 'freehand') {
                this.diagramTool.shapeManager.finishFreehandDrawing();
            }

            if (this.diagramTool.shapeManager.connecting) {
                const connectionPoint = this.diagramTool.shapeManager.getConnectionPointAt(x, y);
                if (connectionPoint && connectionPoint.shapeId !== this.diagramTool.shapeManager.connectionStart.shapeId) {
                    this.diagramTool.shapeManager.completeConnection(connectionPoint);
                } else {
                    this.diagramTool.shapeManager.resetConnection();
                    this.diagramTool.draw();
                }
            }

            if (this.diagramTool.dragging || this.diagramTool.resizing) {
                this.diagramTool.saveToHistory();
            }

            this.diagramTool.dragging = false;
            this.diagramTool.panning = false;
            this.diagramTool.resizing = false;
            this.diagramTool.resizeHandle = null;
            this.isSelecting = false;
            this.selectionStart = null;

            this.updateCursor(x, y);
        }

        handleDoubleClick(e) {
            const { x, y } = this.getCanvasCoordinates(e);
            const shape = this.getShapeAt(x, y);

            if (shape) {
                this.startTextEditing(shape);
            }
        }

        startTextEditing(shape) {
            this.editingText = true;
            this.currentTextElement = shape;

            const input = document.createElement('textarea');
            input.id = 'canvas-text-input';
            input.style.position = 'absolute';
            input.style.left = (this.canvas.getBoundingClientRect().left + shape.x * this.diagramTool.zoom + this.diagramTool.offset.x) + 'px';
            input.style.top = (this.canvas.getBoundingClientRect().top + shape.y * this.diagramTool.zoom + this.diagramTool.offset.y) + 'px';
            input.style.width = (shape.width * this.diagramTool.zoom) + 'px';
            input.style.height = (shape.height * this.diagramTool.zoom) + 'px';
            input.style.fontSize = (shape.fontSize * this.diagramTool.zoom) + 'px';
            input.style.fontFamily = 'Arial';
            input.style.textAlign = 'center';
            input.style.border = '2px solid #4dabf7';
            input.style.borderRadius = '4px';
            input.style.padding = '4px';
            input.style.zIndex = '1000';
            input.style.resize = 'none';
            input.value = shape.text || '';

            document.body.appendChild(input);
            input.focus();
            input.select();

            input.addEventListener('input', () => {
                this.autoResizeTextArea(input, shape);
            });
        }

        finishTextEditing() {
            if (!this.editingText || !this.currentTextElement) return;

            const input = document.getElementById('canvas-text-input');
            if (input) {
                this.currentTextElement.text = input.value;
                input.remove();
                this.diagramTool.saveToHistory();
                this.diagramTool.draw();
            }

            this.editingText = false;
            this.currentTextElement = null;
        }

        cancelTextEditing() {
            if (!this.editingText) return;

            const input = document.getElementById('canvas-text-input');
            if (input) {
                input.remove();
            }

            this.editingText = false;
            this.currentTextElement = null;
            this.diagramTool.draw();
        }

        autoResizeTextArea(textarea, shape) {
            const lines = textarea.value.split('\n').length;
            const lineHeight = parseInt(textarea.style.fontSize) * 1.2;
            const newHeight = Math.max(shape.height, lines * lineHeight / this.diagramTool.zoom);

            textarea.style.height = (newHeight * this.diagramTool.zoom) + 'px';

            const measureDiv = document.createElement('div');
            measureDiv.style.position = 'absolute';
            measureDiv.style.visibility = 'hidden';
            measureDiv.style.fontSize = textarea.style.fontSize;
            measureDiv.style.fontFamily = textarea.style.fontFamily;
            measureDiv.innerHTML = textarea.value.replace(/\n/g, '<br>');
            document.body.appendChild(measureDiv);

            const newWidth = Math.max(shape.width, measureDiv.offsetWidth / this.diagramTool.zoom);
            measureDiv.remove();

            textarea.style.width = (newWidth * this.diagramTool.zoom) + 'px';
        }

        handleWheel(e) {
            e.preventDefault();

            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            const newZoom = Math.min(Math.max(0.1, this.diagramTool.zoom * zoomFactor), 5);

            this.diagramTool.offset.x = mouseX - (mouseX - this.diagramTool.offset.x) * (newZoom / this.diagramTool.zoom);
            this.diagramTool.offset.y = mouseY - (mouseY - this.diagramTool.offset.y) * (newZoom / this.diagramTool.zoom);

            this.diagramTool.zoom = newZoom;
            this.diagramTool.updateZoomDisplay();
            this.diagramTool.draw();
        }

        handleMouseLeave() {
            this.mouseDown = false;
            this.diagramTool.dragging = false;
            this.diagramTool.panning = false;
            this.diagramTool.resizing = false;
            this.diagramTool.shapeManager.resetConnection();
            this.canvas.style.cursor = 'default';
        }

        handleTouchStart(e) {
            e.preventDefault();
            if (e.touches.length === 1) {
                const touch = e.touches[0];
                const mouseEvent = new MouseEvent('mousedown', {
                    clientX: touch.clientX,
                    clientY: touch.clientY
                });
                this.canvas.dispatchEvent(mouseEvent);
            }
        }

        handleTouchMove(e) {
            e.preventDefault();
            if (e.touches.length === 1) {
                const touch = e.touches[0];
                const mouseEvent = new MouseEvent('mousemove', {
                    clientX: touch.clientX,
                    clientY: touch.clientY
                });
                this.canvas.dispatchEvent(mouseEvent);
            }
        }

        handleTouchEnd(e) {
            e.preventDefault();
            const mouseEvent = new MouseEvent('mouseup');
            this.canvas.dispatchEvent(mouseEvent);
        }

        getShapeAt(x, y) {
            for (let i = this.diagramTool.shapes.length - 1; i >= 0; i--) {
                const shape = this.diagramTool.shapes[i];
                if (this.isPointInShape(x, y, shape)) {
                    return shape;
                }
            }
            return null;
        }

        isPointInShape(x, y, shape) {
            switch(shape.type) {
                case 'rectangle':
                case 'rounded-rectangle':
                case 'document':
                case 'database':
                case 'parallelogram':
                case 'text':
                    return x >= shape.x && x <= shape.x + shape.width &&
                           y >= shape.y && y <= shape.y + shape.height;

                case 'circle':
                    const centerX = shape.x + shape.width/2;
                    const centerY = shape.y + shape.height/2;
                    const radius = Math.min(shape.width, shape.height)/2;
                    const dx = x - centerX;
                    const dy = y - centerY;
                    return (dx * dx + dy * dy) <= (radius * radius);

                case 'ellipse':
                    const cx = shape.x + shape.width/2;
                    const cy = shape.y + shape.height/2;
                    const rx = shape.width/2;
                    const ry = shape.height/2;
                    return ((x - cx) * (x - cx)) / (rx * rx) + ((y - cy) * (y - cy)) / (ry * ry) <= 1;

                case 'triangle':
                    return this.isPointInTriangle(x, y, shape);

                case 'diamond':
                    const points = [
                        { x: shape.x + shape.width/2, y: shape.y },
                        { x: shape.x + shape.width, y: shape.y + shape.height/2 },
                        { x: shape.x + shape.width/2, y: shape.y + shape.height },
                        { x: shape.x, y: shape.y + shape.height/2 }
                    ];
                    return this.isPointInPolygon(x, y, points);

                case 'freehand':
                    return this.isPointInFreehand(x, y, shape);

                default:
                    return x >= shape.x && x <= shape.x + shape.width &&
                           y >= shape.y && y <= shape.y + shape.height;
            }
        }

        isPointInFreehand(x, y, shape) {
            if (!shape.points || shape.points.length < 2) return false;

            const tolerance = 10 / this.diagramTool.zoom;

            if (x >= shape.x - tolerance && x <= shape.x + shape.width + tolerance &&
                y >= shape.y - tolerance && y <= shape.y + shape.height + tolerance) {

                for (let i = 0; i < shape.points.length - 1; i++) {
                    const p1 = shape.points[i];
                    const p2 = shape.points[i + 1];

                    const distance = this.pointToLineDistance(x, y, p1.x, p1.y, p2.x, p2.y);
                    if (distance <= tolerance) {
                        return true;
                    }
                }
            }

            return false;
        }

        pointToLineDistance(px, py, x1, y1, x2, y2) {
            const A = px - x1;
            const B = py - y1;
            const C = x2 - x1;
            const D = y2 - y1;

            const dot = A * C + B * D;
            const lenSq = C * C + D * D;
            let param = -1;

            if (lenSq !== 0) {
                param = dot / lenSq;
            }

            let xx, yy;

            if (param < 0) {
                xx = x1;
                yy = y1;
            } else if (param > 1) {
                xx = x2;
                yy = y2;
            } else {
                xx = x1 + param * C;
                yy = y1 + param * D;
            }

            const dx = px - xx;
            const dy = py - yy;

            return Math.sqrt(dx * dx + dy * dy);
        }

        isPointInTriangle(x, y, triangle) {
            const x1 = triangle.x + triangle.width/2;
            const y1 = triangle.y;
            const x2 = triangle.x + triangle.width;
            const y2 = triangle.y + triangle.height;
            const x3 = triangle.x;
            const y3 = triangle.y + triangle.height;

            const denominator = ((y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3));
            const a = ((y2 - y3) * (x - x3) + (x3 - x2) * (y - y3)) / denominator;
            const b = ((y3 - y1) * (x - x3) + (x1 - x3) * (y - y3)) / denominator;
            const c = 1 - a - b;

            return a >= 0 && a <= 1 && b >= 0 && b <= 1 && c >= 0 && c <= 1;
        }

        isPointInPolygon(x, y, vertices) {
            let inside = false;
            for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
                const xi = vertices[i].x, yi = vertices[i].y;
                const xj = vertices[j].x, yj = vertices[j].y;

                const intersect = ((yi > y) !== (yj > y)) &&
                    (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

                if (intersect) inside = !inside;
            }
            return inside;
        }

        getResizeHandleAt(x, y) {
            const tolerance = 8 / this.diagramTool.zoom;

            // Tək shape seçilibsə, onun resize handle-larını yoxla
            if (this.diagramTool.selectedShapes.size === 1) {
                const shapeId = Array.from(this.diagramTool.selectedShapes)[0];
                const shape = this.diagramTool.shapes.find(s => s.id === shapeId);

                if (shape) {
                    // Freehand shape-lər üçün resize handle yoxdur
                    if (shape.type === 'freehand') return null;

                    const handles = this.getResizeHandles(shape);

                    for (const [handle, position] of Object.entries(handles)) {
                        const dx = x - position.x;
                        const dy = y - position.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);

                        if (distance <= tolerance) {
                            return {
                                shapeId: shape.id,
                                handle: handle,
                                x: position.x,
                                y: position.y
                            };
                        }
                    }
                }
            }

            return null;
        }

        getResizeHandles(shape) {
            const handles = {};
            const size = 8 / this.diagramTool.zoom;

            // Künc handles
            handles.nw = { x: shape.x, y: shape.y };
            handles.ne = { x: shape.x + shape.width, y: shape.y };
            handles.sw = { x: shape.x, y: shape.y + shape.height };
            handles.se = { x: shape.x + shape.width, y: shape.y + shape.height };

            // Yan handles (yalnız rectangle shape-lər üçün)
            if (shape.type === 'rectangle' || shape.type === 'rounded-rectangle' ||
                shape.type === 'document' || shape.type === 'database') {
                handles.n = { x: shape.x + shape.width/2, y: shape.y };
                handles.s = { x: shape.x + shape.width/2, y: shape.y + shape.height };
                handles.w = { x: shape.x, y: shape.y + shape.height/2 };
                handles.e = { x: shape.x + shape.width, y: shape.y + shape.height/2 };
            }

            return handles;
        }

        updateCursor(x, y) {
            if (this.diagramTool.shapeManager.connecting) {
                this.canvas.style.cursor = 'crosshair';
                return;
            }

            if (this.diagramTool.selectedTool === 'pan') {
                this.canvas.style.cursor = this.diagramTool.panning ? 'grabbing' : 'grab';
                return;
            }

            const resizeHandle = this.getResizeHandleAt(x, y);
            if (resizeHandle) {
                const cursorMap = {
                    'nw': 'nw-resize', 'ne': 'ne-resize',
                    'sw': 'sw-resize', 'se': 'se-resize',
                    'n': 'n-resize', 's': 's-resize',
                    'w': 'w-resize', 'e': 'e-resize'
                };
                this.canvas.style.cursor = cursorMap[resizeHandle.handle] || 'default';
                return;
            }

            const connectionPoint = this.diagramTool.shapeManager.getConnectionPointAt(x, y);
            if (connectionPoint) {
                this.canvas.style.cursor = 'crosshair';
                return;
            }

            const shape = this.getShapeAt(x, y);
            if (shape) {
                this.canvas.style.cursor = 'move';
                return;
            }

            this.canvas.style.cursor = 'default';
        }
    }

    window.EventHandler = EventHandler;
})();