(function () {
    class ShapeManager {
        constructor(diagramTool) {
            this.diagramTool = diagramTool;
            this.connectionStart = null;
            this.connectionType = 'elbow';
            this.connectionPreview = null;
            this.hoverPoint = null;
            this.connecting = false;
            this.drawingFreehand = false;
            this.freehandPoints = [];
            this.currentFreehandShape = null;
        }

        setupDefaultShapes() {
            if (this.diagramTool.shapes.length === 0) {
                const defaultShapes = [
                    this.createShape({
                        type: 'rectangle',
                        x: 100,
                        y: 100,
                        width: 120,
                        height: 80,
                        fill: '#4dabf7',
                        stroke: '#1a365d',
                        strokeWidth: 2,
                        fontSize: 14,
                        text: 'Start'
                    }),
                    this.createShape({
                        type: 'circle',
                        x: 300,
                        y: 150,
                        width: 100,
                        height: 100,
                        fill: '#ffa94d',
                        stroke: '#e8590c',
                        strokeWidth: 2,
                        fontSize: 14,
                        text: 'Process'
                    }),
                    this.createShape({
                        type: 'diamond',
                        x: 500,
                        y: 120,
                        width: 100,
                        height: 80,
                        fill: '#ff6b6b',
                        stroke: '#c92a2a',
                        strokeWidth: 2,
                        fontSize: 14,
                        text: 'Decision'
                    })
                ];

                this.diagramTool.shapes.push(...defaultShapes);
                this.diagramTool.draw();
            }
        }

        createShape(config) {
            const shape = {
                id: config.id || 'shape_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                type: config.type,
                x: config.x || 100,
                y: config.y || 100,
                width: config.width || 120,
                height: config.height || 80,
                fill: config.fill || '#4dabf7',
                stroke: config.stroke || '#1a365d',
                strokeWidth: config.strokeWidth || 2,
                fontSize: config.fontSize || 14,
                text: config.text || '',
                textColor: config.textColor || '#000000'
            };

            if (config.type === 'text') {
                shape.fill = shape.fill === '#4dabf7' ? 'transparent' : shape.fill;
                shape.stroke = shape.stroke === '#1a365d' ? 'transparent' : shape.stroke;
                shape.strokeWidth = 1;
                shape.connectionPoints = {};
            } else if (config.type !== 'freehand') {
                shape.connectionPoints = this.calculateConnectionPoints(shape);
            } else {
                shape.connectionPoints = {};
            }

            if (config.points) {
                shape.points = config.points;
            }

            return shape;
        }

        calculateConnectionPoints(shape) {
            const points = {
                'top': {x: shape.x + shape.width / 2, y: shape.y, shapeId: shape.id},
                'right': {x: shape.x + shape.width, y: shape.y + shape.height / 2, shapeId: shape.id},
                'bottom': {x: shape.x + shape.width / 2, y: shape.y + shape.height, shapeId: shape.id},
                'left': {x: shape.x, y: shape.y + shape.height / 2, shapeId: shape.id},
                'top-right': {x: shape.x + shape.width, y: shape.y, shapeId: shape.id},
                'bottom-right': {x: shape.x + shape.width, y: shape.y + shape.height, shapeId: shape.id},
                'bottom-left': {x: shape.x, y: shape.y + shape.height, shapeId: shape.id},
                'top-left': {x: shape.x, y: shape.y, shapeId: shape.id}
            };

            return points;
        }

        updateConnectionPoints(shape) {
            if (shape.type !== 'text' && shape.type !== 'freehand') {
                shape.connectionPoints = this.calculateConnectionPoints(shape);
            }
        }

        getConnectionPointAt(x, y) {
            const tolerance = 15 / this.diagramTool.zoom;

            for (const shape of this.diagramTool.shapes) {
                if (shape.connectionPoints) {
                    for (const [pointName, point] of Object.entries(shape.connectionPoints)) {
                        const dx = x - point.x;
                        const dy = y - point.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);

                        if (distance <= tolerance) {
                            return {
                                shapeId: shape.id,
                                pointName: pointName,
                                x: point.x,
                                y: point.y
                            };
                        }
                    }
                }
            }

            return null;
        }

        startShapeDrag(e, shapeType) {
            e.dataTransfer.setData('text/plain', shapeType);
            e.dataTransfer.effectAllowed = 'copy';
        }

        createShapeAtPosition(shapeType, x, y) {
            const defaultSizes = {
                'rectangle': {width: 120, height: 80},
                'rounded-rectangle': {width: 120, height: 80},
                'circle': {width: 100, height: 100},
                'ellipse': {width: 120, height: 80},
                'triangle': {width: 100, height: 100},
                'diamond': {width: 100, height: 80},
                'cylinder': {width: 120, height: 100},
                'parallelogram': {width: 120, height: 80},
                'hexagon': {width: 100, height: 100},
                'cloud': {width: 120, height: 80},
                'document': {width: 120, height: 100},
                'database': {width: 120, height: 100},
                'text': {width: 120, height: 40},
                'freehand': {width: 100, height: 100}
            };

            const size = defaultSizes[shapeType] || {width: 120, height: 80};

            const newShape = this.createShape({
                type: shapeType,
                x: x - size.width / 2,
                y: y - size.height / 2,
                width: size.width,
                height: size.height,
                fill: document.getElementById('fillColor').value,
                stroke: document.getElementById('strokeColor').value,
                strokeWidth: parseInt(document.getElementById('strokeWidth').value),
                fontSize: parseInt(document.getElementById('fontSize').value),
                text: this.getDefaultTextForShape(shapeType)
            });

            this.diagramTool.shapes.push(newShape);
            this.diagramTool.selectedShapes.clear();
            this.diagramTool.selectedShapes.add(newShape.id);
            this.diagramTool.saveToHistory();
            this.diagramTool.draw();

            return newShape;
        }

        getDefaultTextForShape(shapeType) {
            const defaultTexts = {
                'rectangle': 'Process',
                'rounded-rectangle': 'Step',
                'circle': 'Circle',
                'ellipse': 'Ellipse',
                'triangle': 'Decision',
                'diamond': 'Choice',
                'cylinder': 'Data Store',
                'parallelogram': 'Input/Output',
                'hexagon': 'Hexagon',
                'cloud': 'Cloud',
                'document': 'Document',
                'database': 'Database',
                'text': 'Text',
                'freehand': ''
            };

            return defaultTexts[shapeType] || shapeType.charAt(0).toUpperCase() + shapeType.slice(1);
        }

        addText() {
            const textInput = document.getElementById('textInput');
            const text = textInput.value.trim();

            if (!text) {
                alert('Please enter some text');
                return;
            }

            const {x, y} = this.getCenterOfViewport();

            const newShape = this.createShape({
                type: 'text',
                x: x - 60,
                y: y - 20,
                width: 120,
                height: 40,
                fill: 'transparent',
                stroke: 'transparent',
                strokeWidth: 1,
                text: text,
                fontSize: parseInt(document.getElementById('fontSize').value),
                textColor: '#000000'
            });

            this.diagramTool.shapes.push(newShape);
            this.diagramTool.selectedShapes.clear();
            this.diagramTool.selectedShapes.add(newShape.id);
            this.diagramTool.hideTextModal();
            this.diagramTool.saveToHistory();
            this.diagramTool.draw();
        }

        startFreehandDrawing(x, y) {
            this.drawingFreehand = true;
            this.freehandPoints = [{x, y}];

            this.currentFreehandShape = {
                id: 'freehand_' + Date.now(),
                type: 'freehand',
                points: [{x, y}],
                stroke: document.getElementById('strokeColor').value,
                strokeWidth: parseInt(document.getElementById('strokeWidth').value),
                fill: 'transparent',
                x: x,
                y: y,
                width: 0,
                height: 0
            };

            this.diagramTool.shapes.push(this.currentFreehandShape);
        }

        updateFreehandDrawing(x, y) {
            if (!this.drawingFreehand || !this.currentFreehandShape) return;

            this.freehandPoints.push({x, y});
            this.currentFreehandShape.points = [...this.freehandPoints];

            if (this.freehandPoints.length > 1) {
                const minX = Math.min(...this.freehandPoints.map(p => p.x));
                const maxX = Math.max(...this.freehandPoints.map(p => p.x));
                const minY = Math.min(...this.freehandPoints.map(p => p.y));
                const maxY = Math.max(...this.freehandPoints.map(p => p.y));

                this.currentFreehandShape.x = minX;
                this.currentFreehandShape.y = minY;
                this.currentFreehandShape.width = maxX - minX;
                this.currentFreehandShape.height = maxY - minY;
            }

            this.diagramTool.draw();
        }

        finishFreehandDrawing() {
            if (!this.drawingFreehand || !this.currentFreehandShape) return;

            this.drawingFreehand = false;
            this.freehandPoints = [];
            this.diagramTool.saveToHistory();
            this.diagramTool.draw();
        }

        updateFreehandShapePosition(shape, dx, dy) {
            if (shape.type !== 'freehand' || !shape.points) return;

            shape.x += dx;
            shape.y += dy;

            shape.points = shape.points.map(point => ({
                x: point.x + dx,
                y: point.y + dy
            }));
        }

        getCenterOfViewport() {
            const canvas = this.diagramTool.canvas;
            const centerX = (canvas.width / 2 - this.diagramTool.offset.x) / this.diagramTool.zoom;
            const centerY = (canvas.height / 2 - this.diagramTool.offset.y) / this.diagramTool.zoom;
            return {x: centerX, y: centerY};
        }

        deleteSelected() {
            if (this.diagramTool.selectedShapes.size === 0) return;

            this.diagramTool.shapes = this.diagramTool.shapes.filter(shape =>
                !this.diagramTool.selectedShapes.has(shape.id)
            );

            this.diagramTool.connections = this.diagramTool.connections.filter(conn =>
                !this.diagramTool.selectedShapes.has(conn.from) &&
                !this.diagramTool.selectedShapes.has(conn.to)
            );

            this.diagramTool.selectedShapes.clear();
            this.diagramTool.saveToHistory();
            this.diagramTool.draw();
        }

        updateSelectedFill(color) {
            this.diagramTool.selectedShapes.forEach(shapeId => {
                const shape = this.diagramTool.shapes.find(s => s.id === shapeId);
                if (shape) {
                    shape.fill = color;
                }
            });
            this.diagramTool.saveToHistory();
            this.diagramTool.draw();
        }

        updateSelectedStroke(color) {
            this.diagramTool.selectedShapes.forEach(shapeId => {
                const shape = this.diagramTool.shapes.find(s => s.id === shapeId);
                if (shape) {
                    shape.stroke = color;
                }
            });
            this.diagramTool.saveToHistory();
            this.diagramTool.draw();
        }

        updateSelectedStrokeWidth(width) {
            this.diagramTool.selectedShapes.forEach(shapeId => {
                const shape = this.diagramTool.shapes.find(s => s.id === shapeId);
                if (shape) {
                    shape.strokeWidth = parseInt(width);
                }
            });
            this.diagramTool.saveToHistory();
            this.diagramTool.draw();
        }

        updateSelectedFontSize(size) {
            this.diagramTool.selectedShapes.forEach(shapeId => {
                const shape = this.diagramTool.shapes.find(s => s.id === shapeId);
                if (shape) {
                    shape.fontSize = parseInt(size);
                }
            });
            this.diagramTool.saveToHistory();
            this.diagramTool.draw();
        }

        updateShapePosition(shape, dx, dy) {
            shape.x += dx;
            shape.y += dy;
            this.updateConnectionPoints(shape);
        }

        bringToFront() {
            if (this.diagramTool.selectedShapes.size === 0) return;

            const selectedIds = Array.from(this.diagramTool.selectedShapes);

            selectedIds.forEach(shapeId => {
                const index = this.diagramTool.shapes.findIndex(s => s.id === shapeId);
                if (index !== -1) {
                    const [shape] = this.diagramTool.shapes.splice(index, 1);
                    this.diagramTool.shapes.push(shape);
                }
            });

            this.diagramTool.saveToHistory();
            this.diagramTool.draw();
        }

        deleteSelectedConnections() {
            const connectionsToDelete = [];

            this.diagramTool.connections.forEach((conn, index) => {
                if (this.diagramTool.selectedShapes.has(conn.from) ||
                    this.diagramTool.selectedShapes.has(conn.to)) {
                    connectionsToDelete.push(index);
                }
            });

            connectionsToDelete.reverse().forEach(index => {
                this.diagramTool.connections.splice(index, 1);
            });

            this.diagramTool.saveToHistory();
            this.diagramTool.draw();
        }

        deleteSingleConnection(x, y) {
            const tolerance = 10 / this.diagramTool.zoom;

            for (let i = this.diagramTool.connections.length - 1; i >= 0; i--) {
                const conn = this.diagramTool.connections[i];
                const fromShape = this.diagramTool.shapes.find(s => s.id === conn.from);
                const toShape = this.diagramTool.shapes.find(s => s.id === conn.to);

                if (!fromShape || !toShape) continue;

                let startX, startY, endX, endY;

                if (fromShape.connectionPoints && conn.fromPoint) {
                    const point = fromShape.connectionPoints[conn.fromPoint];
                    if (point) {
                        startX = point.x;
                        startY = point.y;
                    }
                }

                if (toShape.connectionPoints && conn.toPoint) {
                    const point = toShape.connectionPoints[conn.toPoint];
                    if (point) {
                        endX = point.x;
                        endY = point.y;
                    }
                }

                if (!startX || !endX) continue;

                const distance = this.pointToLineDistance(x, y, startX, startY, endX, endY);

                if (distance <= tolerance) {
                    this.diagramTool.connections.splice(i, 1);
                    this.diagramTool.saveToHistory();
                    this.diagramTool.draw();
                    return true;
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

        sendToBack() {
            if (this.diagramTool.selectedShapes.size === 0) return;

            const selectedIds = Array.from(this.diagramTool.selectedShapes);

            selectedIds.reverse().forEach(shapeId => {
                const index = this.diagramTool.shapes.findIndex(s => s.id === shapeId);
                if (index !== -1) {
                    const [shape] = this.diagramTool.shapes.splice(index, 1);
                    this.diagramTool.shapes.unshift(shape);
                }
            });

            this.diagramTool.saveToHistory();
            this.diagramTool.draw();
        }

        startConnectionFromPoint(connectionPoint, event) {
            this.connecting = true;
            this.connectionStart = {
                shapeId: connectionPoint.shapeId,
                pointName: connectionPoint.pointName
            };

            this.connectionType = this.diagramTool.getSelectedConnectorType();
            this.connectionPreview = {
                from: connectionPoint.shapeId,
                fromPoint: connectionPoint.pointName,
                to: {x: event.clientX, y: event.clientY},
                type: this.connectionType
            };

            this.diagramTool.draw();
        }

        updateConnectionPreview(x, y) {
            const connectionPoint = this.getConnectionPointAt(x, y);
            this.hoverPoint = connectionPoint;

            if (this.connectionPreview) {
                this.connectionPreview.to = {x, y};
                this.diagramTool.draw();
            }
        }

        completeConnection(targetPoint) {
            if (!this.connectionStart || !targetPoint) return;

            const newConnection = {
                id: 'conn_' + Date.now(),
                from: this.connectionStart.shapeId,
                fromPoint: this.connectionStart.pointName,
                to: targetPoint.shapeId,
                toPoint: targetPoint.pointName,
                type: this.connectionType,
                stroke: document.getElementById('strokeColor').value,
                strokeWidth: parseInt(document.getElementById('strokeWidth').value)
            };

            const existingConnection = this.diagramTool.connections.find(conn =>
                conn.from === newConnection.from && conn.to === newConnection.to &&
                conn.fromPoint === newConnection.fromPoint && conn.toPoint === newConnection.toPoint
            );

            if (!existingConnection) {
                this.diagramTool.connections.push(newConnection);
                this.diagramTool.saveToHistory();
            }

            this.resetConnection();
            this.diagramTool.draw();
        }

        resetConnection() {
            this.connecting = false;
            this.connectionStart = null;
            this.connectionPreview = null;
            this.hoverPoint = null;
        }
    }

    window.ShapeManager = ShapeManager;
})();