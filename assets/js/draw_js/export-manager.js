// export-manager.js - TAM DÜZƏLDİLMİŞ
(function() {
    class ExportManager {
        constructor(diagramTool) {
            this.diagramTool = diagramTool;
        }

        exportDiagram() {
            const format = document.querySelector('input[name="exportFormat"]:checked').value;

            switch(format) {
                case 'png':
                    this.exportAsPNG();
                    break;
                case 'svg':
                    this.exportAsSVG();
                    break;
                case 'json':
                    this.exportAsJSON();
                    break;
            }

            this.diagramTool.hideExportModal();
        }

        exportAsPNG() {
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');

            const bounds = this.diagramTool.getDiagramBounds();

            // Canvas ölçülərini hesabla
            const padding = 50;
            tempCanvas.width = Math.max(800, bounds.width + padding * 2);
            tempCanvas.height = Math.max(600, bounds.height + padding * 2);

            // Ağ arxa fon
            tempCtx.fillStyle = 'white';
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

            // Əvvəlcə bütün shape-ləri çək
            this.diagramTool.shapes.forEach(shape => {
                const drawX = shape.x - bounds.x + padding;
                const drawY = shape.y - bounds.y + padding;

                tempCtx.save();
                this.drawShapeOnCanvas(tempCtx, shape, drawX, drawY);
                tempCtx.restore();
            });

            // Sonra bütün connection-ları çək
            this.diagramTool.connections.forEach(conn => {
                const fromShape = this.diagramTool.shapes.find(s => s.id === conn.from);
                const toShape = this.diagramTool.shapes.find(s => s.id === conn.to);

                if (!fromShape || !toShape) return;

                let startX, startY, endX, endY;

                // Start point
                if (fromShape.connectionPoints && conn.fromPoint) {
                    const point = fromShape.connectionPoints[conn.fromPoint];
                    if (point) {
                        startX = point.x - bounds.x + padding;
                        startY = point.y - bounds.y + padding;
                    }
                }

                // End point
                if (toShape.connectionPoints && conn.toPoint) {
                    const point = toShape.connectionPoints[conn.toPoint];
                    if (point) {
                        endX = point.x - bounds.x + padding;
                        endY = point.y - bounds.y + padding;
                    }
                }

                // Fallback to shape centers
                if (!startX) {
                    startX = fromShape.x + fromShape.width/2 - bounds.x + padding;
                    startY = fromShape.y + fromShape.height/2 - bounds.y + padding;
                }

                if (!endX) {
                    endX = toShape.x + toShape.width/2 - bounds.x + padding;
                    endY = toShape.y + toShape.height/2 - bounds.y + padding;
                }

                tempCtx.save();
                tempCtx.strokeStyle = conn.stroke || '#495057';
                tempCtx.lineWidth = conn.strokeWidth || 2;
                tempCtx.lineCap = 'round';
                tempCtx.lineJoin = 'round';

                tempCtx.beginPath();
                tempCtx.moveTo(startX, startY);
                tempCtx.lineTo(endX, endY);
                tempCtx.stroke();

                // Arrow head
                tempCtx.fillStyle = conn.stroke || '#495057';
                const arrowAngle = Math.atan2(endY - startY, endX - startX);

                tempCtx.save();
                tempCtx.translate(endX, endY);
                tempCtx.rotate(arrowAngle);

                tempCtx.beginPath();
                tempCtx.moveTo(-10, -5);
                tempCtx.lineTo(0, 0);
                tempCtx.lineTo(-10, 5);
                tempCtx.closePath();
                tempCtx.fill();

                tempCtx.restore();
                tempCtx.restore();
            });

            // PNG olaraq yüklə
            const link = document.createElement('a');
            link.download = 'flowdraw-diagram.png';
            link.href = tempCanvas.toDataURL('image/png');
            link.click();
        }

        drawShapeOnCanvas(ctx, shape, x, y) {
            ctx.fillStyle = shape.fill || '#4dabf7';
            ctx.strokeStyle = shape.stroke || '#1a365d';
            ctx.lineWidth = shape.strokeWidth || 2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            switch(shape.type) {
                case 'rectangle':
                    ctx.fillRect(x, y, shape.width, shape.height);
                    ctx.strokeRect(x, y, shape.width, shape.height);
                    break;

                case 'rounded-rectangle':
                    const radius = Math.min(20, shape.width * 0.1, shape.height * 0.1);
                    this.drawRoundedRect(ctx, x, y, shape.width, shape.height, radius, true);
                    break;

                case 'circle':
                    ctx.beginPath();
                    ctx.arc(x + shape.width/2, y + shape.height/2, Math.min(shape.width, shape.height)/2, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                    break;

                case 'ellipse':
                    ctx.beginPath();
                    ctx.ellipse(x + shape.width/2, y + shape.height/2, shape.width/2, shape.height/2, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                    break;

                case 'triangle':
                    ctx.beginPath();
                    ctx.moveTo(x + shape.width/2, y);
                    ctx.lineTo(x + shape.width, y + shape.height);
                    ctx.lineTo(x, y + shape.height);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                    break;

                case 'diamond':
                    ctx.beginPath();
                    ctx.moveTo(x + shape.width/2, y);
                    ctx.lineTo(x + shape.width, y + shape.height/2);
                    ctx.lineTo(x + shape.width/2, y + shape.height);
                    ctx.lineTo(x, y + shape.height/2);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                    break;

                case 'cylinder':
                    this.drawCylinder(ctx, shape, x, y);
                    break;

                case 'parallelogram':
                    const skew = shape.width * 0.2;
                    ctx.beginPath();
                    ctx.moveTo(x + skew, y);
                    ctx.lineTo(x + shape.width, y);
                    ctx.lineTo(x + shape.width - skew, y + shape.height);
                    ctx.lineTo(x, y + shape.height);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                    break;

                case 'hexagon':
                    this.drawHexagon(ctx, shape, x, y);
                    break;

                case 'cloud':
                    this.drawCloud(ctx, shape, x, y);
                    break;

                case 'document':
                    this.drawDocument(ctx, shape, x, y);
                    break;

                case 'database':
                    this.drawDatabase(ctx, shape, x, y);
                    break;

                case 'text':
                    this.drawTextShape(ctx, shape, x, y);
                    break;

                case 'freehand':
                    this.drawFreehand(ctx, shape, x - shape.x, y - shape.y);
                    break;
            }

            // Text əlavə et (text shape olmayanlar üçün)
            if (shape.text && shape.type !== 'text') {
                this.drawText(ctx, shape, x, y);
            }
        }

        drawRoundedRect(ctx, x, y, width, height, radius, fill = true) {
            ctx.beginPath();
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + width - radius, y);
            ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
            ctx.lineTo(x + width, y + height - radius);
            ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
            ctx.lineTo(x + radius, y + height);
            ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
            ctx.closePath();

            if (fill) {
                ctx.fill();
            }
            ctx.stroke();
        }

        drawHexagon(ctx, shape, x, y) {
            const side = Math.min(shape.width, shape.height) / 2;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = Math.PI / 3 * i;
                const px = x + shape.width/2 + side * Math.cos(angle);
                const py = y + shape.height/2 + side * Math.sin(angle);
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }

        drawCloud(ctx, shape, x, y) {
            ctx.beginPath();
            ctx.arc(x + shape.width * 0.3, y + shape.height * 0.4, shape.height * 0.3, Math.PI * 0.5, Math.PI * 1.5);
            ctx.arc(x + shape.width * 0.5, y + shape.height * 0.2, shape.height * 0.35, Math.PI * 1.0, Math.PI * 2.0);
            ctx.arc(x + shape.width * 0.7, y + shape.height * 0.4, shape.height * 0.3, Math.PI * 1.5, Math.PI * 0.5);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }

        drawDocument(ctx, shape, x, y) {
            const cornerSize = Math.min(20, shape.width * 0.2, shape.height * 0.2);

            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + shape.width - cornerSize, y);
            ctx.lineTo(x + shape.width, y + cornerSize);
            ctx.lineTo(x + shape.width, y + shape.height);
            ctx.lineTo(x, y + shape.height);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Corner fold
            ctx.beginPath();
            ctx.moveTo(x + shape.width - cornerSize, y);
            ctx.lineTo(x + shape.width, y + cornerSize);
            ctx.lineTo(x + shape.width - cornerSize, y + cornerSize);
            ctx.closePath();
            ctx.fillStyle = 'rgba(0,0,0,0.1)';
            ctx.fill();
        }

        drawDatabase(ctx, shape, x, y) {
            const ellipseHeight = shape.height * 0.2;

            // Top ellipse
            ctx.beginPath();
            ctx.ellipse(x + shape.width/2, y + ellipseHeight, shape.width/2, ellipseHeight, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Rectangle body
            ctx.fillRect(x, y + ellipseHeight, shape.width, shape.height - ellipseHeight * 2);
            ctx.strokeRect(x, y + ellipseHeight, shape.width, shape.height - ellipseHeight * 2);

            // Bottom ellipse outline
            ctx.beginPath();
            ctx.ellipse(x + shape.width/2, y + shape.height - ellipseHeight, shape.width/2, ellipseHeight, 0, 0, Math.PI * 2);
            ctx.stroke();
        }

        drawCylinder(ctx, shape, x, y) {
            const ellipseHeight = shape.height * 0.15;

            // Top ellipse
            ctx.beginPath();
            ctx.ellipse(x + shape.width/2, y + ellipseHeight, shape.width/2, ellipseHeight, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Sides
            ctx.beginPath();
            ctx.moveTo(x, y + ellipseHeight);
            ctx.lineTo(x, y + shape.height);
            ctx.moveTo(x + shape.width, y + ellipseHeight);
            ctx.lineTo(x + shape.width, y + shape.height);
            ctx.stroke();

            // Bottom ellipse
            ctx.beginPath();
            ctx.ellipse(x + shape.width/2, y + shape.height, shape.width/2, ellipseHeight, 0, 0, Math.PI);
            ctx.stroke();
        }

        drawTextShape(ctx, shape, x, y) {
            // Background
            if (shape.fill && shape.fill !== 'transparent') {
                ctx.fillStyle = shape.fill;
                ctx.fillRect(x, y, shape.width, shape.height);
            }

            // Border
            if (shape.stroke && shape.stroke !== 'transparent' && shape.strokeWidth > 0) {
                ctx.strokeStyle = shape.stroke;
                ctx.lineWidth = shape.strokeWidth;
                ctx.strokeRect(x, y, shape.width, shape.height);
            }

            // Text
            if (shape.text) {
                this.drawText(ctx, shape, x, y);
            }
        }

        drawFreehand(ctx, shape, offsetX, offsetY) {
            if (!shape.points || shape.points.length < 2) return;

            ctx.strokeStyle = shape.stroke || '#000000';
            ctx.lineWidth = shape.strokeWidth || 2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            ctx.beginPath();
            ctx.moveTo(shape.points[0].x + offsetX, shape.points[0].y + offsetY);

            for (let i = 1; i < shape.points.length; i++) {
                ctx.lineTo(shape.points[i].x + offsetX, shape.points[i].y + offsetY);
            }

            ctx.stroke();
        }

        drawText(ctx, shape, x, y) {
            if (!shape.text) return;

            ctx.save();
            ctx.fillStyle = shape.textColor || '#000000';
            ctx.font = `${shape.fontSize}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const lines = shape.text.split('\n');
            const lineHeight = shape.fontSize * 1.2;
            const startY = y + shape.height/2 - ((lines.length - 1) * lineHeight) / 2;

            lines.forEach((line, index) => {
                if (line.trim() !== '') {
                    ctx.fillText(
                        line,
                        x + shape.width/2,
                        startY + index * lineHeight
                    );
                }
            });

            ctx.restore();
        }

        exportAsSVG() {
            const bounds = this.diagramTool.getDiagramBounds();
            const padding = 50;

            let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${bounds.width + padding * 2}" height="${bounds.height + padding * 2}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="white"/>
`;

            // Shapes
            this.diagramTool.shapes.forEach(shape => {
                const x = shape.x - bounds.x + padding;
                const y = shape.y - bounds.y + padding;

                svg += this.shapeToSVG(shape, x, y);
            });

            // Connections
            this.diagramTool.connections.forEach(conn => {
                const fromShape = this.diagramTool.shapes.find(s => s.id === conn.from);
                const toShape = this.diagramTool.shapes.find(s => s.id === conn.to);

                if (!fromShape || !toShape) return;

                let startX, startY, endX, endY;

                if (fromShape.connectionPoints && conn.fromPoint) {
                    const point = fromShape.connectionPoints[conn.fromPoint];
                    if (point) {
                        startX = point.x - bounds.x + padding;
                        startY = point.y - bounds.y + padding;
                    }
                }

                if (toShape.connectionPoints && conn.toPoint) {
                    const point = toShape.connectionPoints[conn.toPoint];
                    if (point) {
                        endX = point.x - bounds.x + padding;
                        endY = point.y - bounds.y + padding;
                    }
                }

                if (!startX) {
                    startX = fromShape.x + fromShape.width/2 - bounds.x + padding;
                    startY = fromShape.y + fromShape.height/2 - bounds.y + padding;
                }

                if (!endX) {
                    endX = toShape.x + toShape.width/2 - bounds.x + padding;
                    endY = toShape.y + toShape.height/2 - bounds.y + padding;
                }

                svg += `    <line x1="${startX}" y1="${startY}" x2="${endX}" y2="${endY}" stroke="${conn.stroke || '#495057'}" stroke-width="${conn.strokeWidth || 2}"/>\n`;

                // Arrow head
                const angle = Math.atan2(endY - startY, endX - startX);
                const arrowLength = 10;
                const arrowWidth = 5;

                const arrowX1 = endX - arrowLength * Math.cos(angle) + arrowWidth * Math.sin(angle);
                const arrowY1 = endY - arrowLength * Math.sin(angle) - arrowWidth * Math.cos(angle);
                const arrowX2 = endX - arrowLength * Math.cos(angle) - arrowWidth * Math.sin(angle);
                const arrowY2 = endY - arrowLength * Math.sin(angle) + arrowWidth * Math.cos(angle);

                svg += `    <polygon points="${endX},${endY} ${arrowX1},${arrowY1} ${arrowX2},${arrowY2}" fill="${conn.stroke || '#495057'}"/>\n`;
            });

            svg += '</svg>';

            const blob = new Blob([svg], { type: 'image/svg+xml' });
            const link = document.createElement('a');
            link.download = 'flowdraw-diagram.svg';
            link.href = URL.createObjectURL(blob);
            link.click();
        }

        shapeToSVG(shape, x, y) {
            let svg = '';

            switch(shape.type) {
                case 'rectangle':
                    svg = `    <rect x="${x}" y="${y}" width="${shape.width}" height="${shape.height}" fill="${shape.fill}" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}"/>\n`;
                    break;

                case 'rounded-rectangle':
                    const radius = Math.min(20, shape.width * 0.1, shape.height * 0.1);
                    svg = `    <rect x="${x}" y="${y}" width="${shape.width}" height="${shape.height}" rx="${radius}" ry="${radius}" fill="${shape.fill}" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}"/>\n`;
                    break;

                case 'circle':
                    svg = `    <circle cx="${x + shape.width/2}" cy="${y + shape.height/2}" r="${Math.min(shape.width, shape.height)/2}" fill="${shape.fill}" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}"/>\n`;
                    break;

                case 'ellipse':
                    svg = `    <ellipse cx="${x + shape.width/2}" cy="${y + shape.height/2}" rx="${shape.width/2}" ry="${shape.height/2}" fill="${shape.fill}" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}"/>\n`;
                    break;

                case 'triangle':
                    const trianglePoints = `${x + shape.width/2},${y} ${x + shape.width},${y + shape.height} ${x},${y + shape.height}`;
                    svg = `    <polygon points="${trianglePoints}" fill="${shape.fill}" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}"/>\n`;
                    break;

                case 'diamond':
                    const diamondPoints = `${x + shape.width/2},${y} ${x + shape.width},${y + shape.height/2} ${x + shape.width/2},${y + shape.height} ${x},${y + shape.height/2}`;
                    svg = `    <polygon points="${diamondPoints}" fill="${shape.fill}" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}"/>\n`;
                    break;

                case 'parallelogram':
                    const skew = shape.width * 0.2;
                    const parallelogramPoints = `${x + skew},${y} ${x + shape.width},${y} ${x + shape.width - skew},${y + shape.height} ${x},${y + shape.height}`;
                    svg = `    <polygon points="${parallelogramPoints}" fill="${shape.fill}" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}"/>\n`;
                    break;

                case 'hexagon':
                    const side = Math.min(shape.width, shape.height) / 2;
                    let hexagonPoints = '';
                    for (let i = 0; i < 6; i++) {
                        const angle = Math.PI / 3 * i;
                        const px = x + shape.width/2 + side * Math.cos(angle);
                        const py = y + shape.height/2 + side * Math.sin(angle);
                        hexagonPoints += `${px},${py} `;
                    }
                    svg = `    <polygon points="${hexagonPoints.trim()}" fill="${shape.fill}" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}"/>\n`;
                    break;

                case 'text':
                    if (shape.fill && shape.fill !== 'transparent') {
                        svg = `    <rect x="${x}" y="${y}" width="${shape.width}" height="${shape.height}" fill="${shape.fill}" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}"/>\n`;
                    }
                    break;
            }

            // Add text for all shapes
            if (shape.text) {
                const lines = shape.text.split('\n');
                const lineHeight = shape.fontSize * 1.2;
                const startY = y + shape.height/2 - ((lines.length - 1) * lineHeight) / 2;

                lines.forEach((line, index) => {
                    if (line.trim() !== '') {
                        svg += `    <text x="${x + shape.width/2}" y="${startY + index * lineHeight}" text-anchor="middle" dominant-baseline="middle" font-family="Arial" font-size="${shape.fontSize}" fill="${shape.textColor || '#000000'}">${this.escapeXML(line)}</text>\n`;
                    }
                });
            }

            return svg;
        }

        escapeXML(text) {
            return text.replace(/[<>&"']/g, function(c) {
                switch(c) {
                    case '<': return '&lt;';
                    case '>': return '&gt;';
                    case '&': return '&amp;';
                    case '"': return '&quot;';
                    case "'": return '&apos;';
                    default: return c;
                }
            });
        }

        exportAsJSON() {
            const diagramData = {
                shapes: this.diagramTool.shapes.map(shape => {
                    const { connectionPoints, ...shapeData } = shape;
                    return shapeData;
                }),
                connections: this.diagramTool.connections,
                metadata: {
                    version: '2.0',
                    exportedAt: new Date().toISOString(),
                    tool: 'FlowDraw',
                    totalShapes: this.diagramTool.shapes.length,
                    totalConnections: this.diagramTool.connections.length
                }
            };

            const dataStr = JSON.stringify(diagramData, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const link = document.createElement('a');
            link.download = 'flowdraw-diagram.json';
            link.href = URL.createObjectURL(blob);
            link.click();
        }
    }

    window.ExportManager = ExportManager;
})();