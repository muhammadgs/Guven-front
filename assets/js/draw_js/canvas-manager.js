// canvas-manager.js - Canvas əməliyyatları (DÜZƏLDİLMİŞ)
(function() {
    class CanvasManager {
        constructor(diagramTool) {
            this.diagramTool = diagramTool;
            this.canvas = diagramTool.canvas;
            this.ctx = diagramTool.ctx;
            this.connectionPointRadius = 8;
            this.resizeHandleSize = 8;
        }

        setupCanvas() {
            this.resizeCanvas();
            window.addEventListener('resize', () => this.resizeCanvas());

            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            this.ctx.textBaseline = 'middle';
            this.ctx.textAlign = 'center';
        }

        resizeCanvas() {
            const container = this.canvas.parentElement;
            this.canvas.width = container.clientWidth;
            this.canvas.height = container.clientHeight;
            this.diagramTool.gridOverlay.style.width = container.clientWidth + 'px';
            this.diagramTool.gridOverlay.style.height = container.clientHeight + 'px';
            this.diagramTool.draw();
        }

        draw() {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.save();

            this.ctx.translate(this.diagramTool.offset.x, this.diagramTool.offset.y);
            this.ctx.scale(this.diagramTool.zoom, this.diagramTool.zoom);

            this.drawConnections();
            this.drawShapes();
            this.drawConnectionPoints();
            this.drawPreviewConnection();

            this.ctx.restore();
            this.diagramTool.updateStatusBar();
        }

        drawShapes() {
    // Əvvəlcə bütün shape-ləri çək
            this.diagramTool.shapes.forEach(shape => {
                this.drawShape(shape);
            });

            // Sonra seçilmiş shape-lərin selection border-lərini çək
            this.diagramTool.selectedShapes.forEach(shapeId => {
                const shape = this.diagramTool.shapes.find(s => s.id === shapeId);
                if (shape) {
                    this.drawSelection(shape);
                }
            });
        }

        drawShape(shape) {
            this.ctx.save();

            // Əgər shape görünmürsə, gizlət
            if (shape.visible === false) return;

            // Fill color təyin et
            if (shape.fill && shape.fill !== 'transparent') {
                this.ctx.fillStyle = shape.fill;
            }

            // Stroke color təyin et
            if (shape.stroke && shape.stroke !== 'transparent') {
                this.ctx.strokeStyle = shape.stroke;
            }

            this.ctx.lineWidth = shape.strokeWidth || 2;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';

            // Fontu təyin et (text shape üçün)
            if (shape.fontSize) {
                this.ctx.font = `${shape.fontSize}px Arial`;
            }

            switch(shape.type) {
                case 'rectangle':
                    // Doldur
                    if (shape.fill && shape.fill !== 'transparent') {
                        this.ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
                    }
                    // Kontur
                    if (shape.stroke && shape.stroke !== 'transparent' && shape.strokeWidth > 0) {
                        this.ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
                    }
                    break;

                case 'rounded-rectangle':
                    const radius = Math.min(20, shape.width * 0.1, shape.height * 0.1);
                    this.roundRect(shape.x, shape.y, shape.width, shape.height, radius, true);
                    break;

                case 'circle':
                    this.ctx.beginPath();
                    this.ctx.arc(
                        shape.x + shape.width/2,
                        shape.y + shape.height/2,
                        shape.width/2,
                        0,
                        Math.PI * 2
                    );

                    if (shape.fill && shape.fill !== 'transparent') {
                        this.ctx.fill();
                    }
                    if (shape.stroke && shape.stroke !== 'transparent' && shape.strokeWidth > 0) {
                        this.ctx.stroke();
                    }
                    break;

                case 'ellipse':
                    this.ctx.beginPath();
                    this.ctx.ellipse(
                        shape.x + shape.width/2,
                        shape.y + shape.height/2,
                        shape.width/2,
                        shape.height/2,
                        0, 0, Math.PI * 2
                    );

                    if (shape.fill && shape.fill !== 'transparent') {
                        this.ctx.fill();
                    }
                    if (shape.stroke && shape.stroke !== 'transparent' && shape.strokeWidth > 0) {
                        this.ctx.stroke();
                    }
                    break;

                case 'triangle':
                    this.drawTriangle(shape);
                    break;

                case 'diamond':
                    this.drawDiamond(shape);
                    break;

                case 'cylinder':
                    this.drawCylinder(shape);
                    break;

                case 'parallelogram':
                    this.drawParallelogram(shape);
                    break;

                case 'hexagon':
                    this.drawHexagon(shape);
                    break;

                case 'cloud':
                    this.drawCloud(shape);
                    break;

                case 'document':
                    this.drawDocument(shape);
                    break;

                case 'database':
                    this.drawDatabase(shape);
                    break;

                case 'text':
                    this.drawTextShape(shape);
                    break;

                case 'freehand':
                    this.drawFreehand(shape);
                    break;
            }

            // Əgər shape text shape deyilsə və mətni varsa, mətni çək
            if (shape.text && shape.type !== 'text') {
                this.drawText(shape);
            }

            this.ctx.restore();
        }


        // YENİ: drawText metodu əlavə edildi
        drawText(shape) {
            this.ctx.save();

            // Mətni çəkməzdən əvvəl bütün şərtləri yoxla
            if (!shape.text || shape.text.trim() === '') {
                this.ctx.restore();
                return;
            }

            // Text color təyin et - default qara
            this.ctx.fillStyle = shape.textColor || '#000000';

            // Font təyin et
            this.ctx.font = `${shape.fontSize}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';

            // Mətni sətirlərə böl
            const lines = shape.text.split('\n');
            const lineHeight = shape.fontSize * 1.2;

            // Mətnin başlanğıc Y koordinatını hesabla
            const startY = shape.y + shape.height/2 - ((lines.length - 1) * lineHeight) / 2;

            // Hər sətri çək
            lines.forEach((line, index) => {
                if (line.trim() !== '') {
                    this.ctx.fillText(
                        line,
                        shape.x + shape.width/2,
                        startY + index * lineHeight
                    );
                }
            });

            this.ctx.restore();
        }

        // YENİ: Text shape üçün çəkmə metodu
        drawTextShape(shape) {
            this.ctx.save();

            // Arxa fon rəngi
            if (shape.fill && shape.fill !== 'transparent') {
                this.ctx.fillStyle = shape.fill;
                this.ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
            }

            // Ətraf xətti
            if (shape.stroke && shape.stroke !== 'transparent' && shape.strokeWidth > 0) {
                this.ctx.strokeStyle = shape.stroke;
                this.ctx.lineWidth = shape.strokeWidth;
                this.ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
            }

            // Mətni çək
            if (shape.text && shape.text.trim() !== '') {
                this.ctx.fillStyle = shape.textColor || '#000000';
                this.ctx.font = `${shape.fontSize}px Arial`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';

                const lines = shape.text.split('\n');
                const lineHeight = shape.fontSize * 1.2;
                const startY = shape.y + shape.height/2 - ((lines.length - 1) * lineHeight) / 2;

                lines.forEach((line, index) => {
                    if (line.trim() !== '') {
                        this.ctx.fillText(
                            line,
                            shape.x + shape.width/2,
                            startY + index * lineHeight
                        );
                    }
                });
            }

            this.ctx.restore();
        }

        // Köməkçi metodlar
        roundRect(x, y, width, height, radius, fill = true) {
            this.ctx.beginPath();
            this.ctx.moveTo(x + radius, y);
            this.ctx.lineTo(x + width - radius, y);
            this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
            this.ctx.lineTo(x + width, y + height - radius);
            this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
            this.ctx.lineTo(x + radius, y + height);
            this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
            this.ctx.lineTo(x, y + radius);
            this.ctx.quadraticCurveTo(x, y, x + radius, y);
            this.ctx.closePath();

            if (fill) {
                this.ctx.fill();
            }
            this.ctx.stroke();
        }

        drawTriangle(shape) {
            this.ctx.beginPath();
            this.ctx.moveTo(shape.x + shape.width/2, shape.y);
            this.ctx.lineTo(shape.x + shape.width, shape.y + shape.height);
            this.ctx.lineTo(shape.x, shape.y + shape.height);
            this.ctx.closePath();

            if (shape.fill && shape.fill !== 'transparent') {
                this.ctx.fill();
            }
            if (shape.stroke && shape.stroke !== 'transparent' && shape.strokeWidth > 0) {
                this.ctx.stroke();
            }
        }

        drawCloud(shape) {
            const { x, y, width, height } = shape;
            this.ctx.beginPath();

            this.ctx.arc(x + width * 0.3, y + height * 0.4, height * 0.3, Math.PI * 0.5, Math.PI * 1.5);
            this.ctx.arc(x + width * 0.5, y + height * 0.2, height * 0.35, Math.PI * 1.0, Math.PI * 2.0);
            this.ctx.arc(x + width * 0.7, y + height * 0.4, height * 0.3, Math.PI * 1.5, Math.PI * 0.5);

            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
        }

        drawDocument(shape) {
            const { x, y, width, height } = shape;
            const cornerSize = Math.min(20, width * 0.2, height * 0.2);

            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(x + width - cornerSize, y);
            this.ctx.lineTo(x + width, y + cornerSize);
            this.ctx.lineTo(x + width, y + height);
            this.ctx.lineTo(x, y + height);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();

            // Sağ üst qatlanma
            this.ctx.beginPath();
            this.ctx.moveTo(x + width - cornerSize, y);
            this.ctx.lineTo(x + width, y + cornerSize);
            this.ctx.lineTo(x + width - cornerSize, y + cornerSize);
            this.ctx.closePath();
            this.ctx.fillStyle = 'rgba(0,0,0,0.1)';
            this.ctx.fill();
        }

        drawParallelogram(shape) {
            const skew = shape.width * 0.2;

            this.ctx.beginPath();
            this.ctx.moveTo(shape.x + skew, shape.y);
            this.ctx.lineTo(shape.x + shape.width, shape.y);
            this.ctx.lineTo(shape.x + shape.width - skew, shape.y + shape.height);
            this.ctx.lineTo(shape.x, shape.y + shape.height);
            this.ctx.closePath();

            if (shape.fill && shape.fill !== 'transparent') {
                this.ctx.fill();
            }
            if (shape.stroke && shape.stroke !== 'transparent' && shape.strokeWidth > 0) {
                this.ctx.stroke();
            }
        }

        drawDiamond(shape) {
            this.ctx.beginPath();
            this.ctx.moveTo(shape.x + shape.width/2, shape.y);
            this.ctx.lineTo(shape.x + shape.width, shape.y + shape.height/2);
            this.ctx.lineTo(shape.x + shape.width/2, shape.y + shape.height);
            this.ctx.lineTo(shape.x, shape.y + shape.height/2);
            this.ctx.closePath();

            if (shape.fill && shape.fill !== 'transparent') {
                this.ctx.fill();
            }
            if (shape.stroke && shape.stroke !== 'transparent' && shape.strokeWidth > 0) {
                this.ctx.stroke();
            }
        }

        drawDatabase(shape) {
            const { x, y, width, height } = shape;
            const ellipseHeight = height * 0.2;

            // Üst ellips
            this.ctx.beginPath();
            this.ctx.ellipse(x + width/2, y + ellipseHeight, width/2, ellipseHeight, 0, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();

            // Düzbucaqlı gövdə
            this.ctx.fillRect(x, y + ellipseHeight, width, height - ellipseHeight * 2);
            this.ctx.strokeRect(x, y + ellipseHeight, width, height - ellipseHeight * 2);

            // Alt ellips (kontur)
            this.ctx.beginPath();
            this.ctx.ellipse(x + width/2, y + height - ellipseHeight, width/2, ellipseHeight, 0, 0, Math.PI * 2);
            this.ctx.stroke();
        }

        drawCylinder(shape) {
            const { x, y, width, height } = shape;
            const ellipseHeight = height * 0.15;

            // Üst ellips
            this.ctx.beginPath();
            this.ctx.ellipse(x + width/2, y + ellipseHeight, width/2, ellipseHeight, 0, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();

            // Yan tərəflər
            this.ctx.beginPath();
            this.ctx.moveTo(x, y + ellipseHeight);
            this.ctx.lineTo(x, y + height);
            this.ctx.moveTo(x + width, y + ellipseHeight);
            this.ctx.lineTo(x + width, y + height);
            this.ctx.stroke();

            // Alt ellips
            this.ctx.beginPath();
            this.ctx.ellipse(x + width/2, y + height, width/2, ellipseHeight, 0, 0, Math.PI);
            this.ctx.stroke();
        }

        // drawSelection metodunu yeniləyin:
        drawSelection(shape) {
            this.ctx.save();
            this.ctx.strokeStyle = '#4dabf7';
            this.ctx.lineWidth = 1 / this.diagramTool.zoom;
            this.ctx.setLineDash([5, 3]);
            this.ctx.strokeRect(shape.x - 5, shape.y - 5, shape.width + 10, shape.height + 10);
            this.ctx.setLineDash([]);

            // Resize handles göstər
            this.drawResizeHandles(shape);

            this.ctx.restore();
        }

        drawHexagon(shape) {
            const { x, y, width, height } = shape;
            const side = Math.min(width, height) / 2;

            this.ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = Math.PI / 3 * i;
                const px = x + width/2 + side * Math.cos(angle);
                const py = y + height/2 + side * Math.sin(angle);
                if (i === 0) this.ctx.moveTo(px, py);
                else this.ctx.lineTo(px, py);
            }
            this.ctx.closePath();

            if (shape.fill && shape.fill !== 'transparent') {
                this.ctx.fill();
            }
            if (shape.stroke && shape.stroke !== 'transparent' && shape.strokeWidth > 0) {
                this.ctx.stroke();
            }
        }

        drawFreehand(shape) {
            if (!shape.points || shape.points.length < 2) return;

            this.ctx.save();
            this.ctx.strokeStyle = shape.stroke || '#000000';
            this.ctx.lineWidth = shape.strokeWidth || 2;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';

            this.ctx.beginPath();
            this.ctx.moveTo(shape.points[0].x, shape.points[0].y);

            for (let i = 1; i < shape.points.length; i++) {
                this.ctx.lineTo(shape.points[i].x, shape.points[i].y);
            }

            this.ctx.stroke();
            this.ctx.restore();
        }


        drawConnectionPoints() {
            this.ctx.save();

            this.diagramTool.selectedShapes.forEach(shapeId => {
                const shape = this.diagramTool.shapes.find(s => s.id === shapeId);
                if (shape && shape.connectionPoints) {
                    this.drawShapeConnectionPoints(shape);
                }
            });

            this.ctx.restore();
        }

        drawShapeConnectionPoints(shape) {
            if (!shape.connectionPoints) return;

            Object.entries(shape.connectionPoints).forEach(([pointName, point]) => {
                this.drawSingleConnectionPoint(point.x, point.y, pointName);
            });
        }

        drawSingleConnectionPoint(x, y, pointName) {
            const radius = this.connectionPointRadius / this.diagramTool.zoom;

            this.ctx.fillStyle = '#ffffff';
            this.ctx.beginPath();
            this.ctx.arc(x, y, radius, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.strokeStyle = '#4dabf7';
            this.ctx.lineWidth = 2 / this.diagramTool.zoom;
            this.ctx.beginPath();
            this.ctx.arc(x, y, radius, 0, Math.PI * 2);
            this.ctx.stroke();

            this.ctx.fillStyle = '#4dabf7';
            this.ctx.beginPath();
            this.ctx.arc(x, y, radius/2, 0, Math.PI * 2);
            this.ctx.fill();
        }

        drawHoverPoint() {
            const shapeManager = this.diagramTool.shapeManager;
            if (shapeManager.hoverPoint) {
                const point = shapeManager.hoverPoint;
                const radius = this.connectionPointRadius * 1.5 / this.diagramTool.zoom;

                this.ctx.save();
                this.ctx.fillStyle = 'rgba(255, 107, 107, 0.7)';
                this.ctx.strokeStyle = '#c92a2a';
                this.ctx.lineWidth = 3 / this.diagramTool.zoom;

                this.ctx.beginPath();
                this.ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.stroke();
                this.ctx.restore();
            }
        }

        drawConnections() {
            this.diagramTool.connections.forEach((conn, index) => {
                const fromShape = this.diagramTool.shapes.find(s => s.id === conn.from);
                const toShape = this.diagramTool.shapes.find(s => s.id === conn.to);

                if (!fromShape || !toShape) return;

                let startX, startY, endX, endY;

                // Başlanğıc nöqtə
                if (fromShape.connectionPoints && conn.fromPoint) {
                    const point = fromShape.connectionPoints[conn.fromPoint];
                    if (point) {
                        startX = point.x;
                        startY = point.y;
                    }
                }

                // Son nöqtə
                if (toShape.connectionPoints && conn.toPoint) {
                    const point = toShape.connectionPoints[conn.toPoint];
                    if (point) {
                        endX = point.x;
                        endY = point.y;
                    }
                }

                // Əgər connection points tapılmadısa
                if (!startX) {
                    startX = fromShape.x + fromShape.width/2;
                    startY = fromShape.y + fromShape.height/2;
                }

                if (!endX) {
                    endX = toShape.x + toShape.width/2;
                    endY = toShape.y + toShape.height/2;
                }

                this.ctx.save();

                // Hover effekti üçün - əgər connection silmə rejimindədirsə və hover olunubsa
                const isHovered = this.diagramTool.selectConnectionAt(
                    (startX + endX) / 2,
                    (startY + endY) / 2
                )?.index === index;

                if (isHovered && this.diagramTool.selectedTool === 'delete-connection') {
                    this.ctx.strokeStyle = '#ff0000'; // Qırmızı
                    this.ctx.lineWidth = (conn.strokeWidth || 2) + 2; // Qalın
                    this.ctx.setLineDash([5, 3]); // Kesikli xətt
                } else {
                    this.ctx.strokeStyle = conn.stroke || '#495057';
                    this.ctx.lineWidth = conn.strokeWidth || 2;
                    this.ctx.setLineDash([]);
                }

                this.ctx.lineCap = 'round';
                this.ctx.lineJoin = 'round';

                this.ctx.beginPath();

                switch(conn.type) {
                    case 'line':
                        this.ctx.moveTo(startX, startY);
                        this.ctx.lineTo(endX, endY);
                        break;

                    case 'elbow':
                        const elbowPath = this.calculateElbowPathAvoidingShapes(
                            startX, startY, endX, endY,
                            fromShape, toShape
                        );

                        this.ctx.moveTo(elbowPath[0].x, elbowPath[0].y);
                        for (let i = 1; i < elbowPath.length; i++) {
                            this.ctx.lineTo(elbowPath[i].x, elbowPath[i].y);
                        }
                        break;

                    case 'curve':
                        const cp1x = startX + (endX - startX) * 0.25;
                        const cp1y = startY;
                        const cp2x = startX + (endX - startX) * 0.75;
                        const cp2y = endY;

                        this.ctx.moveTo(startX, startY);
                        this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
                        break;
                }

                this.ctx.stroke();

                // Ox başı (hər zaman çəkilir)
                this.ctx.fillStyle = isHovered ? '#ff0000' : (conn.stroke || '#495057');

                let arrowAngle;
                let lastSegment;

                if (conn.type === 'elbow') {
                    const path = this.calculateElbowPathAvoidingShapes(
                        startX, startY, endX, endY,
                        fromShape, toShape
                    );
                    lastSegment = {
                        x1: path[path.length - 2].x,
                        y1: path[path.length - 2].y,
                        x2: path[path.length - 1].x,
                        y2: path[path.length - 1].y
                    };
                } else {
                    lastSegment = { x1: startX, y1: startY, x2: endX, y2: endY };
                }

                arrowAngle = Math.atan2(lastSegment.y2 - lastSegment.y1, lastSegment.x2 - lastSegment.x1);

                this.ctx.save();
                this.ctx.translate(endX, endY);
                this.ctx.rotate(arrowAngle);

                this.ctx.beginPath();
                this.ctx.moveTo(-10, -5);
                this.ctx.lineTo(0, 0);
                this.ctx.lineTo(-10, 5);
                this.ctx.closePath();
                this.ctx.fill();

                this.ctx.restore();
                this.ctx.restore();
            });
        }

        // canvas-manager.js faylına bu metodu əlavə edin:
        drawResizeHandles(shape) {
            if (shape.type === 'freehand' || shape.type === 'text') return;

            const handles = this.diagramTool.eventHandler.getResizeHandles(shape);
            const size = 8 / this.diagramTool.zoom;

            this.ctx.save();
            this.ctx.fillStyle = '#4dabf7';
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 1 / this.diagramTool.zoom;

            // Künc handles
            ['nw', 'ne', 'sw', 'se'].forEach(handle => {
                if (handles[handle]) {
                    const h = handles[handle];
                    this.ctx.beginPath();
                    this.ctx.rect(h.x - size/2, h.y - size/2, size, size);
                    this.ctx.fill();
                    this.ctx.stroke();
                }
            });

            // Yan handles (müəyyən shape-lər üçün)
            if (shape.type === 'rectangle' || shape.type === 'rounded-rectangle' ||
                shape.type === 'document' || shape.type === 'database') {
                ['n', 's', 'w', 'e'].forEach(handle => {
                    if (handles[handle]) {
                        const h = handles[handle];
                        this.ctx.beginPath();
                        this.ctx.rect(h.x - size/2, h.y - size/2, size, size);
                        this.ctx.fill();
                        this.ctx.stroke();
                    }
                });
            }

            this.ctx.restore();
        }



        calculateElbowPathAvoidingShapes(startX, startY, endX, endY, fromShape, toShape) {
            const path = [];
            path.push({ x: startX, y: startY });

            const obstacles = this.diagramTool.shapes.filter(shape =>
                shape.id !== fromShape.id && shape.id !== toShape.id
            ).map(shape => this.getShapeBounds(shape));

            const path1 = this.calculateHHorizontalPath(startX, startY, endX, endY, obstacles);
            const path2 = this.calculateVVerticalPath(startX, startY, endX, endY, obstacles);

            const distance1 = this.calculatePathDistance(path1);
            const distance2 = this.calculatePathDistance(path2);

            const finalPath = distance1 < distance2 ? path1 : path2;
            finalPath.forEach(point => path.push(point));
            path.push({ x: endX, y: endY });

            return path;
        }

        calculateHHorizontalPath(startX, startY, endX, endY, obstacles) {
            const path = [];
            const clearance = 20;
            const midY = (startY + endY) / 2;

            path.push({ x: startX + clearance, y: startY });
            path.push({ x: startX + clearance, y: midY });
            path.push({ x: endX - clearance, y: midY });
            path.push({ x: endX - clearance, y: endY });

            return this.avoidObstacles(path, obstacles, clearance);
        }

        calculateVVerticalPath(startX, startY, endX, endY, obstacles) {
            const path = [];
            const clearance = 20;
            const midX = (startX + endX) / 2;

            path.push({ x: startX, y: startY + clearance });
            path.push({ x: midX, y: startY + clearance });
            path.push({ x: midX, y: endY - clearance });
            path.push({ x: endX, y: endY - clearance });

            return this.avoidObstacles(path, obstacles, clearance);
        }

        avoidObstacles(path, obstacles, clearance) {
            const adjustedPath = [...path];

            for (let i = 0; i < adjustedPath.length - 1; i++) {
                const segmentStart = adjustedPath[i];
                const segmentEnd = adjustedPath[i + 1];

                obstacles.forEach(obstacle => {
                    if (this.segmentIntersectsObstacle(segmentStart, segmentEnd, obstacle)) {
                        if (segmentStart.x === segmentEnd.x) {
                            const newX = obstacle.x + obstacle.width + clearance;
                            adjustedPath[i].x = newX;
                            adjustedPath[i + 1].x = newX;
                        } else {
                            const newY = obstacle.y + obstacle.height + clearance;
                            adjustedPath[i].y = newY;
                            adjustedPath[i + 1].y = newY;
                        }
                    }
                });
            }

            return adjustedPath;
        }

        segmentIntersectsObstacle(start, end, obstacle) {
            const segmentBounds = {
                x: Math.min(start.x, end.x),
                y: Math.min(start.y, end.y),
                width: Math.abs(end.x - start.x),
                height: Math.abs(end.y - start.y)
            };

            return this.rectanglesIntersect(segmentBounds, obstacle);
        }

        rectanglesIntersect(rect1, rect2) {
            return rect1.x < rect2.x + rect2.width &&
                   rect1.x + rect1.width > rect2.x &&
                   rect1.y < rect2.y + rect2.height &&
                   rect1.y + rect1.height > rect2.y;
        }

        getShapeBounds(shape) {
            return {
                x: shape.x - 5,
                y: shape.y - 5,
                width: shape.width + 10,
                height: shape.height + 10,
                shapeId: shape.id
            };
        }

        calculatePathDistance(path) {
            let distance = 0;
            for (let i = 0; i < path.length - 1; i++) {
                const dx = path[i + 1].x - path[i].x;
                const dy = path[i + 1].y - path[i].y;
                distance += Math.sqrt(dx * dx + dy * dy);
            }
            return distance;
        }

        drawPreviewConnection() {
            const shapeManager = this.diagramTool.shapeManager;
            if (shapeManager.connectionPreview) {
                const conn = shapeManager.connectionPreview;
                const fromShape = this.diagramTool.shapes.find(s => s.id === conn.from);

                if (!fromShape || !fromShape.connectionPoints) return;

                const fromPoint = fromShape.connectionPoints[conn.fromPoint];
                if (!fromPoint) return;

                this.ctx.save();
                this.ctx.strokeStyle = '#ff6b6b';
                this.ctx.lineWidth = 2 / this.diagramTool.zoom;
                this.ctx.setLineDash([5, 3]);
                this.ctx.lineCap = 'round';

                const toX = conn.to.x;
                const toY = conn.to.y;

                if (conn.type === 'elbow') {
                    const previewPath = this.calculatePreviewElbowPath(
                        fromPoint.x, fromPoint.y, toX, toY, fromShape
                    );

                    this.ctx.beginPath();
                    this.ctx.moveTo(previewPath[0].x, previewPath[0].y);
                    for (let i = 1; i < previewPath.length; i++) {
                        this.ctx.lineTo(previewPath[i].x, previewPath[i].y);
                    }
                } else {
                    this.ctx.beginPath();

                    switch(conn.type) {
                        case 'line':
                            this.ctx.moveTo(fromPoint.x, fromPoint.y);
                            this.ctx.lineTo(toX, toY);
                            break;
                        case 'curve':
                            const cp1x = fromPoint.x + (toX - fromPoint.x) * 0.25;
                            const cp1y = fromPoint.y;
                            const cp2x = fromPoint.x + (toX - fromPoint.x) * 0.75;
                            const cp2y = toY;

                            this.ctx.moveTo(fromPoint.x, fromPoint.y);
                            this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, toX, toY);
                            break;
                    }
                }

                this.ctx.stroke();
                this.ctx.restore();

                this.drawHoverPoint();
            }
        }

        calculatePreviewElbowPath(startX, startY, endX, endY, fromShape) {
            const path = [{ x: startX, y: startY }];
            const midX = startX + (endX - startX) / 2;
            const midY = startY + (endY - startY) / 2;

            if (Math.abs(endY - startY) < Math.abs(endX - startX)) {
                path.push({ x: startX, y: midY });
                path.push({ x: endX, y: midY });
            } else {
                path.push({ x: midX, y: startY });
                path.push({ x: midX, y: endY });
            }

            path.push({ x: endX, y: endY });
            return path;
        }

        getDiagramBounds() {
            if (this.diagramTool.shapes.length === 0) {
                return { x: 0, y: 0, width: 800, height: 600 };
            }

            let minX = Infinity, minY = Infinity;
            let maxX = -Infinity, maxY = -Infinity;

            this.diagramTool.shapes.forEach(shape => {
                minX = Math.min(minX, shape.x);
                minY = Math.min(minY, shape.y);
                maxX = Math.max(maxX, shape.x + shape.width);
                maxY = Math.max(maxY, shape.y + shape.height);
            });

            return {
                x: minX,
                y: minY,
                width: maxX - minX,
                height: maxY - minY
            };
        }
    }

    window.CanvasManager = CanvasManager;
})();