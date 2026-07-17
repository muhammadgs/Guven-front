// board-connectors.js - Fiqurlara bağlı connector-lar, route-lar və quick-create
(function() {
    const SIDES = ['top', 'right', 'bottom', 'left'];
    const OPPOSITE = { top: 'bottom', right: 'left', bottom: 'top', left: 'right' };
    const MARKER_TYPES = ['none', 'arrow', 'thin', 'open', 'triangle'];

    const clone = value => JSON.parse(JSON.stringify(value));
    const round = value => Math.round(value * 100) / 100;
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

    function distance(a, b) {
        return Math.hypot(b.x - a.x, b.y - a.y);
    }

    function normalize(v) {
        const length = Math.hypot(v.x, v.y) || 1;
        return { x: v.x / length, y: v.y / length };
    }

    function rotatePoint(point, degrees) {
        const angle = (degrees || 0) * Math.PI / 180;
        const cos = Math.cos(angle), sin = Math.sin(angle);
        return {
            x: point.x * cos - point.y * sin,
            y: point.x * sin + point.y * cos
        };
    }

    function centerToTopLeft(center, width, height, rotation) {
        const offset = rotatePoint({ x: width / 2, y: height / 2 }, rotation || 0);
        return { x: center.x - offset.x, y: center.y - offset.y };
    }

    function elementCenter(el) {
        const offset = rotatePoint({ x: el.width / 2, y: el.height / 2 }, el.rotation || 0);
        return { x: el.x + offset.x, y: el.y + offset.y };
    }

    function localSidePoint(el, side) {
        const w = Number(el.width) || 0;
        const h = Number(el.height) || 0;
        if (side === 'top') return { x: w / 2, y: 0 };
        if (side === 'right') return { x: w, y: h / 2 };
        if (side === 'bottom') return { x: w / 2, y: h };
        return { x: 0, y: h / 2 };
    }

    function modelSidePoint(el, side) {
        const local = rotatePoint(localSidePoint(el, side), el.rotation || 0);
        const center = elementCenter(el);
        const point = { x: el.x + local.x, y: el.y + local.y };
        return { point, normal: normalize({ x: point.x - center.x, y: point.y - center.y }) };
    }

    function cleanPolyline(points) {
        const result = [];
        for (const point of points) {
            const previous = result[result.length - 1];
            if (!previous || distance(previous, point) > 0.1) result.push(point);
        }
        return result;
    }

    function roundedPolylinePath(points, radius) {
        points = cleanPolyline(points);
        if (!points.length) return '';
        if (points.length === 1) return `M ${round(points[0].x)} ${round(points[0].y)}`;

        let path = `M ${round(points[0].x)} ${round(points[0].y)}`;
        for (let i = 1; i < points.length - 1; i++) {
            const previous = points[i - 1];
            const current = points[i];
            const next = points[i + 1];
            const inLength = distance(previous, current);
            const outLength = distance(current, next);
            const r = Math.min(radius, inLength / 2, outLength / 2);
            if (r < 0.5) {
                path += ` L ${round(current.x)} ${round(current.y)}`;
                continue;
            }
            const before = {
                x: current.x + (previous.x - current.x) * r / inLength,
                y: current.y + (previous.y - current.y) * r / inLength
            };
            const after = {
                x: current.x + (next.x - current.x) * r / outLength,
                y: current.y + (next.y - current.y) * r / outLength
            };
            path += ` L ${round(before.x)} ${round(before.y)}`;
            path += ` Q ${round(current.x)} ${round(current.y)} ${round(after.x)} ${round(after.y)}`;
        }
        const last = points[points.length - 1];
        path += ` L ${round(last.x)} ${round(last.y)}`;
        return path;
    }

    // Attachment-lər vizual olaraq yuvarlaq küncün üzərində qalsın deyə
    // eyni route-u kiçik polyline hissələrinə çevirib nümunələyirik.
    function roundedPolylineSampler(points, radius) {
        points = cleanPolyline(points);
        if (points.length < 3) return polylineSampler(points);
        const sampled = [points[0]];
        for (let i = 1; i < points.length - 1; i++) {
            const previous = points[i - 1];
            const current = points[i];
            const next = points[i + 1];
            const inLength = distance(previous, current);
            const outLength = distance(current, next);
            const r = Math.min(radius, inLength / 2, outLength / 2);
            if (r < 0.5) {
                sampled.push(current);
                continue;
            }
            const before = {
                x: current.x + (previous.x - current.x) * r / inLength,
                y: current.y + (previous.y - current.y) * r / inLength
            };
            const after = {
                x: current.x + (next.x - current.x) * r / outLength,
                y: current.y + (next.y - current.y) * r / outLength
            };
            sampled.push(before);
            for (let step = 1; step <= 6; step++) {
                const t = step / 6;
                const u = 1 - t;
                sampled.push({
                    x: u * u * before.x + 2 * u * t * current.x + t * t * after.x,
                    y: u * u * before.y + 2 * u * t * current.y + t * t * after.y
                });
            }
        }
        sampled.push(points[points.length - 1]);
        return polylineSampler(sampled);
    }

    function polylineSampler(points) {
        points = cleanPolyline(points);
        const segments = [];
        let total = 0;
        for (let i = 1; i < points.length; i++) {
            const length = distance(points[i - 1], points[i]);
            if (length < 0.01) continue;
            segments.push({ from: points[i - 1], to: points[i], start: total, length });
            total += length;
        }
        const fallback = points[0] || { x: 0, y: 0 };
        return {
            pointAt(t) {
                if (!segments.length) return { ...fallback };
                const wanted = clamp(t, 0, 1) * total;
                const segment = segments.find(s => wanted <= s.start + s.length) || segments[segments.length - 1];
                const local = clamp((wanted - segment.start) / segment.length, 0, 1);
                return {
                    x: segment.from.x + (segment.to.x - segment.from.x) * local,
                    y: segment.from.y + (segment.to.y - segment.from.y) * local
                };
            },
            tangentAt(t) {
                if (!segments.length) return { x: 1, y: 0 };
                const wanted = clamp(t, 0, 1) * total;
                const segment = segments.find(s => wanted <= s.start + s.length) || segments[segments.length - 1];
                return normalize({ x: segment.to.x - segment.from.x, y: segment.to.y - segment.from.y });
            }
        };
    }

    function cubicPoint(p0, p1, p2, p3, t) {
        const u = 1 - t;
        return {
            x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
            y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y
        };
    }

    function cubicTangent(p0, p1, p2, p3, t) {
        const u = 1 - t;
        return normalize({
            x: 3 * u * u * (p1.x - p0.x) + 6 * u * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x),
            y: 3 * u * u * (p1.y - p0.y) + 6 * u * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y)
        });
    }

    function markerNode(type, point, tangent, atStart, connector) {
        if (!type || type === 'none') return null;
        const direction = atStart ? { x: -tangent.x, y: -tangent.y } : tangent;
        const angle = Math.atan2(direction.y, direction.x) * 180 / Math.PI;
        const width = Number(connector.strokeWidth) || BoardConfig.DEFAULT_CONNECTOR_WIDTH;
        const length = 11 + Math.min(width, 6);
        const wing = 5 + Math.min(width * 0.5, 3);
        const filled = type === 'thin' || type === 'triangle';

        return new Konva.Shape({
            name: atStart ? 'connector-start-marker' : 'connector-end-marker',
            x: point.x,
            y: point.y,
            rotation: angle,
            listening: false,
            stroke: connector.stroke,
            fill: filled ? connector.stroke : undefined,
            strokeWidth: width,
            lineCap: 'round',
            lineJoin: 'round',
            sceneFunc(ctx, shape) {
                ctx.beginPath();
                if (type === 'thin') {
                    ctx.moveTo(0, 0);
                    ctx.lineTo(-length, -wing * 0.45);
                    ctx.lineTo(-length * 0.66, 0);
                    ctx.lineTo(-length, wing * 0.45);
                    ctx.closePath();
                } else if (type === 'triangle') {
                    ctx.moveTo(0, 0);
                    ctx.lineTo(-length, -wing);
                    ctx.lineTo(-length, wing);
                    ctx.closePath();
                } else if (type === 'open') {
                    ctx.moveTo(-length * 1.1, -wing);
                    ctx.lineTo(0, 0);
                    ctx.lineTo(-length * 1.1, wing);
                } else {
                    ctx.moveTo(-length, -wing);
                    ctx.lineTo(0, 0);
                    ctx.lineTo(-length, wing);
                }
                if (filled) ctx.fillStrokeShape(shape);
                else ctx.strokeShape(shape);
            }
        });
    }

    function aabbForElement(el) {
        const corners = [
            { x: 0, y: 0 }, { x: el.width, y: 0 },
            { x: el.width, y: el.height }, { x: 0, y: el.height }
        ].map(p => {
            const rotated = rotatePoint(p, el.rotation || 0);
            return { x: el.x + rotated.x, y: el.y + rotated.y };
        });
        const xs = corners.map(p => p.x), ys = corners.map(p => p.y);
        return {
            x: Math.min(...xs), y: Math.min(...ys),
            width: Math.max(...xs) - Math.min(...xs),
            height: Math.max(...ys) - Math.min(...ys)
        };
    }

    function boxesOverlap(a, b, padding) {
        return a.x < b.x + b.width + padding &&
            a.x + a.width + padding > b.x &&
            a.y < b.y + b.height + padding &&
            a.y + a.height + padding > b.y;
    }

    class BoardConnectors {
        constructor(app) {
            this.app = app;
            this.anchorGroup = null;
            this.selectionGroup = null;
            this.previewGroup = null;
            this.previewKey = null;
            this.quickDefaults = {
                routing: BoardConfig.DEFAULT_CONNECTOR_ROUTING,
                stroke: BoardConfig.DEFAULT_CONNECTOR_COLOR,
                strokeWidth: BoardConfig.DEFAULT_CONNECTOR_WIDTH,
                strokeStyle: 'solid',
                startMarker: 'none',
                endMarker: 'arrow'
            };
        }

        normalizeConnector(connector) {
            if (!connector || connector.type !== 'connector') return connector;
            connector.routing = ['straight', 'elbow', 'curve'].includes(connector.routing)
                ? connector.routing : BoardConfig.DEFAULT_CONNECTOR_ROUTING;
            connector.stroke = connector.stroke || BoardConfig.DEFAULT_CONNECTOR_COLOR;
            const width = Number(connector.strokeWidth);
            connector.strokeWidth = Number.isFinite(width)
                ? clamp(width, 1, 32)
                : BoardConfig.DEFAULT_CONNECTOR_WIDTH;
            connector.strokeStyle = ['solid', 'dashed', 'dotted'].includes(connector.strokeStyle)
                ? connector.strokeStyle : 'solid';
            connector.startMarker = MARKER_TYPES.includes(connector.startMarker)
                ? connector.startMarker : 'none';
            connector.endMarker = MARKER_TYPES.includes(connector.endMarker)
                ? connector.endMarker : 'none';
            if (connector.source && !SIDES.includes(connector.source.side)) connector.source.side = 'right';
            if (connector.target && !SIDES.includes(connector.target.side)) connector.target.side = 'left';
            connector.locked = !!connector.locked;
            return connector;
        }

        createConnector(sourceId, sourceSide, targetId, targetSide, patch) {
            return this.normalizeConnector(Object.assign({
                id: BoardState.generateId(),
                type: 'connector',
                source: { elementId: sourceId, side: sourceSide },
                target: { elementId: targetId, side: targetSide },
                routing: this.quickDefaults.routing,
                stroke: this.quickDefaults.stroke,
                strokeWidth: this.quickDefaults.strokeWidth,
                strokeStyle: this.quickDefaults.strokeStyle,
                startMarker: this.quickDefaults.startMarker,
                endMarker: this.quickDefaults.endMarker,
                locked: false
            }, patch || {}));
        }

        prepareDocument() {
            const elements = this.app.state.elements;
            const nodes = new Set(elements.filter(el => el.type !== 'connector').map(el => el.id));
            const removed = new Set();
            for (const el of elements) {
                if (el.type !== 'connector') continue;
                this.normalizeConnector(el);
                const sourceId = el.source && el.source.elementId;
                const targetId = el.target && el.target.elementId;
                if (!nodes.has(sourceId) || !nodes.has(targetId)) removed.add(el.id);
            }
            if (removed.size) {
                this.detachAttachments(removed);
                this.app.state.doc.elements = elements.filter(el => !removed.has(el.id));
            }
            this.syncAttachments(true);
        }

        endpoint(endpoint, overrides) {
            if (!endpoint) return null;
            const el = overrides && overrides.get(endpoint.elementId)
                ? overrides.get(endpoint.elementId)
                : this.app.state.getElement(endpoint.elementId);
            if (!el || el.type === 'connector') return null;

            if (!(overrides && overrides.has(endpoint.elementId))) {
                const node = this.app.stage.findOne('#' + endpoint.elementId);
                if (node && node.getAttr('elementType') !== 'connector') {
                    const transform = node.getTransform();
                    const point = transform.point(localSidePoint(el, endpoint.side));
                    const center = transform.point({ x: el.width / 2, y: el.height / 2 });
                    return {
                        point,
                        normal: normalize({ x: point.x - center.x, y: point.y - center.y })
                    };
                }
            }
            return modelSidePoint(el, endpoint.side);
        }

        geometry(connector, overrides) {
            this.normalizeConnector(connector);
            const source = this.endpoint(connector.source, overrides);
            const target = this.endpoint(connector.target, overrides);
            if (!source || !target) return null;

            const start = source.point;
            const end = target.point;
            const directDistance = distance(start, end);

            if (connector.routing === 'curve') {
                const handle = clamp(directDistance * 0.42, 55, 220);
                const c1 = {
                    x: start.x + source.normal.x * handle,
                    y: start.y + source.normal.y * handle
                };
                const c2 = {
                    x: end.x + target.normal.x * handle,
                    y: end.y + target.normal.y * handle
                };
                return {
                    start, end,
                    pathData: `M ${round(start.x)} ${round(start.y)} C ${round(c1.x)} ${round(c1.y)} ${round(c2.x)} ${round(c2.y)} ${round(end.x)} ${round(end.y)}`,
                    pointAt: t => cubicPoint(start, c1, c2, end, clamp(t, 0, 1)),
                    tangentAt: t => cubicTangent(start, c1, c2, end, clamp(t, 0, 1))
                };
            }

            if (connector.routing === 'straight') {
                const sampler = polylineSampler([start, end]);
                return {
                    start, end,
                    pathData: `M ${round(start.x)} ${round(start.y)} L ${round(end.x)} ${round(end.y)}`,
                    pointAt: sampler.pointAt,
                    tangentAt: sampler.tangentAt
                };
            }

            const stub = clamp(directDistance * 0.22, 34, 72);
            const afterStart = {
                x: start.x + source.normal.x * stub,
                y: start.y + source.normal.y * stub
            };
            const beforeEnd = {
                x: end.x + target.normal.x * stub,
                y: end.y + target.normal.y * stub
            };
            let points;
            if (Math.abs(source.normal.x) >= Math.abs(source.normal.y)) {
                points = [
                    start,
                    afterStart,
                    { x: afterStart.x, y: beforeEnd.y },
                    beforeEnd,
                    end
                ];
            } else {
                points = [
                    start,
                    afterStart,
                    { x: beforeEnd.x, y: afterStart.y },
                    beforeEnd,
                    end
                ];
            }
            points = cleanPolyline(points);
            const sampler = roundedPolylineSampler(points, BoardConfig.CONNECTOR_CORNER_RADIUS);
            return {
                start, end, points,
                pathData: roundedPolylinePath(points, BoardConfig.CONNECTOR_CORNER_RADIUS),
                pointAt: sampler.pointAt,
                tangentAt: sampler.tangentAt
            };
        }

        dashFor(connector) {
            if (connector.strokeStyle === 'dashed') return [12, 8];
            if (connector.strokeStyle === 'dotted') return [2, 7];
            return [];
        }

        buildNode(connector) {
            const group = new Konva.Group({
                id: connector.id,
                name: 'element connector-element',
                draggable: false
            });
            group.setAttr('elementType', 'connector');
            group.add(new Konva.Path({
                name: 'connector-line',
                fillEnabled: false,
                lineCap: 'round',
                lineJoin: 'round'
            }));
            this.updateNode(group, connector);
            return group;
        }

        updateNode(group, connector, overrides, preview) {
            const geometry = this.geometry(connector, overrides);
            if (!geometry) {
                group.visible(false);
                return;
            }
            group.visible(true);
            group.position({ x: 0, y: 0 });
            group.rotation(0);
            group.scale({ x: 1, y: 1 });
            group.draggable(false);

            let line = group.findOne('.connector-line');
            if (!line) {
                line = new Konva.Path({ name: 'connector-line', fillEnabled: false });
                group.add(line);
            }
            line.setAttrs({
                data: geometry.pathData,
                stroke: connector.stroke,
                strokeWidth: connector.strokeWidth,
                dash: this.dashFor(connector),
                lineCap: 'round',
                lineJoin: 'round',
                hitStrokeWidth: preview ? 0 : Math.max(
                    BoardConfig.CONNECTOR_HIT_WIDTH / (this.app.state.viewport.zoom || 1),
                    connector.strokeWidth + 16 / (this.app.state.viewport.zoom || 1)
                ),
                listening: !preview,
                opacity: preview ? 0.42 : 1
            });

            group.find('.connector-marker').forEach(node => node.destroy());
            const startMarker = markerNode(
                connector.startMarker,
                geometry.start,
                geometry.tangentAt(0.001),
                true,
                connector
            );
            const endMarker = markerNode(
                connector.endMarker,
                geometry.end,
                geometry.tangentAt(0.999),
                false,
                connector
            );
            for (const marker of [startMarker, endMarker]) {
                if (!marker) continue;
                marker.addName('connector-marker');
                marker.opacity(preview ? 0.42 : 1);
                group.add(marker);
            }
            group.setAttr('connectorGeometry', geometry);
        }

        refreshAll(updateAttachmentModel, skipAttachmentIds, refreshUi) {
            for (const connector of this.app.state.elements.filter(el => el.type === 'connector')) {
                const node = this.app.stage.findOne('#' + connector.id);
                if (node) this.updateNode(node, connector);
            }
            this.syncAttachments(!!updateAttachmentModel, skipAttachmentIds);
            this.app.mainLayer.batchDraw();
            if (refreshUi !== false) {
                this.refreshHandles();
                if (this.app.connectorToolbar) this.app.connectorToolbar.position();
            }
        }

        connectorForAttachment(el) {
            const data = el && el.connectorAttachment;
            if (!data) return null;
            const connector = this.app.state.getElement(data.connectorId);
            return connector && connector.type === 'connector' ? connector : null;
        }

        attachmentPlacement(el) {
            const attachment = el.connectorAttachment;
            const connector = this.connectorForAttachment(el);
            if (!attachment || !connector) return null;
            const geometry = this.geometry(connector);
            if (!geometry) return null;

            const t = clamp(Number(attachment.t), 0, 1);
            const point = geometry.pointAt(Number.isFinite(t) ? t : 0.5);
            const tangent = geometry.tangentAt(Number.isFinite(t) ? t : 0.5);
            const normal = { x: -tangent.y, y: tangent.x };
            const offset = Number(attachment.offset) || 0;
            const center = {
                x: point.x + normal.x * offset,
                y: point.y + normal.y * offset
            };
            let rotation = Number(el.rotation) || 0;
            if (el.type === 'text') {
                rotation = attachment.orientation === 'path'
                    ? Math.atan2(tangent.y, tangent.x) * 180 / Math.PI
                    : 0;
                if (rotation > 90) rotation -= 180;
                if (rotation < -90) rotation += 180;
            }
            const topLeft = centerToTopLeft(center, el.width, el.height, rotation);
            return { x: topLeft.x, y: topLeft.y, rotation };
        }

        syncAttachment(el, updateModel) {
            const placement = this.attachmentPlacement(el);
            if (!placement) return;
            if (updateModel) {
                el.x = round(placement.x);
                el.y = round(placement.y);
                el.rotation = round(placement.rotation);
            }
            const node = this.app.stage.findOne('#' + el.id);
            if (node) {
                node.position({ x: placement.x, y: placement.y });
                node.rotation(placement.rotation);
            }
        }

        syncAttachments(updateModel, skipIds) {
            for (const el of this.app.state.elements) {
                if (!el.connectorAttachment) continue;
                if (skipIds && skipIds.has(el.id)) continue;
                if (!this.connectorForAttachment(el)) {
                    if (updateModel) delete el.connectorAttachment;
                    continue;
                }
                this.syncAttachment(el, updateModel);
            }
        }

        captureAttachment(el) {
            if (!el || !el.connectorAttachment) return;
            const connector = this.connectorForAttachment(el);
            const geometry = connector && this.geometry(connector);
            if (!geometry) return;

            const node = this.app.stage.findOne('#' + el.id);
            let center;
            if (node) {
                center = node.getTransform().point({ x: el.width / 2, y: el.height / 2 });
            } else {
                center = elementCenter(el);
            }

            let best = { t: 0.5, distance: Infinity, point: null };
            for (let i = 0; i <= 120; i++) {
                const t = i / 120;
                const point = geometry.pointAt(t);
                const d = distance(point, center);
                if (d < best.distance) best = { t, distance: d, point };
            }
            const tangent = geometry.tangentAt(best.t);
            const normal = { x: -tangent.y, y: tangent.x };
            el.connectorAttachment.t = round(best.t);
            el.connectorAttachment.offset = round(
                (center.x - best.point.x) * normal.x + (center.y - best.point.y) * normal.y
            );
        }

        setAttachmentOrientation(el, orientation) {
            if (!el || !el.connectorAttachment || el.type !== 'text') return;
            el.connectorAttachment.orientation = orientation === 'path' ? 'path' : 'horizontal';
            this.syncAttachment(el, true);
            const node = this.app.stage.findOne('#' + el.id);
            if (node) BoardElements.updateNode(node, el, this.app);
            this.app.mainLayer.batchDraw();
        }

        placeNewAttachment(el, connector) {
            const existing = this.app.state.elements.filter(item =>
                item.connectorAttachment &&
                item.connectorAttachment.connectorId === connector.id &&
                item.id !== el.id
            );
            const tValues = [0.5, 0.33, 0.67, 0.16, 0.84, 0.06, 0.94];
            const offsetStep = Math.max(el.width || 0, el.height || 0, 72) + 24;
            const offsets = [0, -offsetStep, offsetStep, -offsetStep * 2, offsetStep * 2];

            for (const offset of offsets) {
                for (const t of tValues) {
                    el.connectorAttachment.t = t;
                    el.connectorAttachment.offset = offset;
                    const placement = this.attachmentPlacement(el);
                    if (!placement) continue;
                    const candidate = Object.assign({}, el, placement);
                    const overlaps = existing.some(item =>
                        boxesOverlap(aabbForElement(candidate), aabbForElement(item), 12)
                    );
                    if (!overlaps) {
                        el.x = round(placement.x);
                        el.y = round(placement.y);
                        el.rotation = round(placement.rotation);
                        return;
                    }
                }
            }
            this.syncAttachment(el, true);
        }

        addAttachment(connector, kind, shapeType) {
            if (!connector || connector.type !== 'connector') return;
            if (connector.locked) {
                this.app.showToast('Connector kilidlidir');
                return;
            }
            const geometry = this.geometry(connector);
            if (!geometry) return;
            const point = geometry.pointAt(0.5);
            let el;
            if (kind === 'text') {
                el = BoardElements.createText(point.x, point.y);
                el.width = 120;
                el.text.content = '';
                el.text.align = 'center';
            } else if (kind === 'sticky') {
                el = BoardElements.createStickyNote(point.x, point.y, BoardConfig.DEFAULT_STICKY_COLOR);
                el.width = 112;
                el.height = 112;
            } else {
                el = BoardElements.createShape(point.x, point.y, shapeType || 'rectangle');
            }
            el.connectorAttachment = {
                connectorId: connector.id,
                t: 0.5,
                offset: 0,
                orientation: 'horizontal'
            };
            this.app.state.addElement(el);
            this.placeNewAttachment(el, connector);
            const node = BoardElements.buildNode(el, this.app);
            if (node) this.app.mainLayer.add(node);
            this.app.mainLayer.batchDraw();
            this.app.selection.select([el.id]);
            this.app.commit();
            if (kind === 'text') setTimeout(() => this.app.textEditor.openFor(el.id), 0);
        }

        detachAttachments(connectorIds) {
            const ids = connectorIds instanceof Set ? connectorIds : new Set(connectorIds || []);
            for (const el of this.app.state.elements) {
                if (el.connectorAttachment && ids.has(el.connectorAttachment.connectorId)) {
                    delete el.connectorAttachment;
                }
            }
        }

        deletionIds(initialIds) {
            const ids = new Set(initialIds || []);
            for (const connector of this.app.state.elements.filter(el => el.type === 'connector')) {
                const sourceRemoved = connector.source && ids.has(connector.source.elementId);
                const targetRemoved = connector.target && ids.has(connector.target.elementId);
                if (sourceRemoved || targetRemoved) ids.add(connector.id);
            }
            this.detachAttachments(new Set(
                [...ids].filter(id => {
                    const el = this.app.state.getElement(id);
                    return el && el.type === 'connector';
                })
            ));
            return [...ids];
        }

        lockedDependency(initialIds) {
            const ids = new Set(initialIds || []);
            return this.app.state.elements.find(el =>
                el.type === 'connector' && el.locked &&
                ((el.source && ids.has(el.source.elementId)) ||
                 (el.target && ids.has(el.target.elementId)))
            ) || null;
        }

        quickSlotValue(index) {
            if (index === 0) return 0;
            const step = Math.ceil(index / 2);
            return index % 2 === 1 ? -step : step;
        }

        quickCandidate(source, side) {
            const sourceEndpoint = this.endpoint({ elementId: source.id, side });
            if (!sourceEndpoint) return null;
            const candidate = clone(source);
            candidate.id = BoardState.generateId();
            delete candidate.connectorAttachment;
            delete candidate.locked;

            const normal = sourceEndpoint.normal;
            // Screen sırası sabitdir: horizontal budaqlarda mərkəz→yuxarı→aşağı,
            // vertikal budaqlarda mərkəz→sol→sağ.
            const perpendicular = Math.abs(normal.x) >= Math.abs(normal.y)
                ? { x: 0, y: 1 }
                : { x: 1, y: 0 };
            const alongHalf = (side === 'left' || side === 'right')
                ? candidate.width / 2 : candidate.height / 2;
            const crossSize = (side === 'left' || side === 'right')
                ? candidate.height : candidate.width;
            const pitch = crossSize + BoardConfig.CONNECTOR_QUICK_SPACING;

            for (let index = 0; index < 60; index++) {
                const slot = this.quickSlotValue(index);
                const center = {
                    x: sourceEndpoint.point.x + normal.x * (BoardConfig.CONNECTOR_QUICK_GAP + alongHalf) + perpendicular.x * pitch * slot,
                    y: sourceEndpoint.point.y + normal.y * (BoardConfig.CONNECTOR_QUICK_GAP + alongHalf) + perpendicular.y * pitch * slot
                };
                const topLeft = centerToTopLeft(center, candidate.width, candidate.height, candidate.rotation || 0);
                candidate.x = round(topLeft.x);
                candidate.y = round(topLeft.y);
                const candidateBox = aabbForElement(candidate);
                const collides = this.app.state.elements.some(el => {
                    if (el.type === 'connector' || el.id === source.id) return false;
                    return boxesOverlap(candidateBox, aabbForElement(el), 28);
                });
                if (!collides) return candidate;
            }
            return candidate;
        }

        previewConnector(source, target, side) {
            return this.createConnector(source.id, side, target.id, OPPOSITE[side], {
                id: 'connector_preview',
                preview: true
            });
        }

        showPreview(source, side) {
            const key = source.id + ':' + side;
            if (this.previewKey === key && this.previewGroup) return;
            this.clearPreview();
            const candidate = this.quickCandidate(source, side);
            if (!candidate) return;
            const connector = this.previewConnector(source, candidate, side);
            const overrides = new Map([[candidate.id, candidate]]);

            const group = new Konva.Group({ name: 'connector-preview', listening: false });
            const lineGroup = this.buildNode(connector);
            lineGroup.id('');
            lineGroup.name('connector-preview-line');
            lineGroup.listening(false);
            this.updateNode(lineGroup, connector, overrides, true);
            group.add(lineGroup);

            const ghost = BoardElements.buildNode(candidate, this.app);
            if (ghost) {
                ghost.id('');
                ghost.name('connector-preview-shape');
                ghost.opacity(0.34);
                ghost.listening(false);
                ghost.draggable(false);
                group.add(ghost);
            }
            group.setAttr('candidate', candidate);
            group.setAttr('connector', connector);
            this.app.overlayLayer.add(group);
            group.moveToBottom();
            if (this.app.selection && this.app.selection.transformer) {
                this.app.selection.transformer.moveToTop();
            }
            if (this.anchorGroup) this.anchorGroup.moveToTop();
            this.previewGroup = group;
            this.previewKey = key;
            this.app.overlayLayer.batchDraw();
        }

        clearPreview() {
            if (this.previewGroup) this.previewGroup.destroy();
            this.previewGroup = null;
            this.previewKey = null;
            if (this.app.overlayLayer) this.app.overlayLayer.batchDraw();
        }

        quickCreate(source, side) {
            const target = this.quickCandidate(source, side);
            if (!target) return;
            const connector = this.previewConnector(source, target, side);
            connector.id = BoardState.generateId();
            delete connector.preview;
            this.clearPreview();

            this.app.state.addElement(connector);
            this.app.state.addElement(target);
            const connectorNode = this.buildNode(connector);
            const targetNode = BoardElements.buildNode(target, this.app);
            if (connectorNode) {
                this.app.mainLayer.add(connectorNode);
                connectorNode.moveToBottom();
            }
            if (targetNode) this.app.mainLayer.add(targetNode);
            this.app.mainLayer.batchDraw();

            // Miro kimi mənbə fiqur seçili qalır ki, növbəti budaq dərhal yaradılsın.
            this.app.selection.select([source.id]);
            this.app.commit();
        }

        setQuickPreset(kind) {
            const presets = {
                line: { routing: 'straight', endMarker: 'none' },
                arrow: { routing: 'straight', endMarker: 'arrow' },
                elbow: { routing: 'elbow', endMarker: 'arrow' },
                curve: { routing: 'curve', endMarker: 'arrow' }
            };
            Object.assign(this.quickDefaults, presets[kind] || presets.elbow);
            if (this.app.tools.current !== 'select') this.app.tools.setTool('select');
            this.app.showToast('Connector stili seçildi — fiqurun yan nöqtəsindən əlavə edin');
            this.refreshHandles();
        }

        destroyHandleGroups() {
            this.clearPreview();
            if (this.anchorGroup) this.anchorGroup.destroy();
            if (this.selectionGroup) this.selectionGroup.destroy();
            this.anchorGroup = null;
            this.selectionGroup = null;
        }

        buildQuickHandle(source, side, zoom) {
            const endpoint = this.endpoint({ elementId: source.id, side });
            if (!endpoint) return null;
            const offset = 24 / zoom;
            const display = {
                x: endpoint.point.x + endpoint.normal.x * offset,
                y: endpoint.point.y + endpoint.normal.y * offset
            };
            const group = new Konva.Group({
                x: display.x,
                y: display.y,
                rotation: Math.atan2(endpoint.normal.y, endpoint.normal.x) * 180 / Math.PI,
                name: 'connector-quick-handle'
            });
            const hit = new Konva.Circle({
                radius: 17 / zoom,
                fill: 'rgba(66,98,255,0.001)',
                hitStrokeWidth: 8 / zoom
            });
            const circle = new Konva.Circle({
                name: 'connector-handle-dot',
                radius: 4.5 / zoom,
                fill: BoardConfig.SELECTION_COLOR,
                stroke: '#FFFFFF',
                strokeWidth: 2 / zoom,
                listening: false
            });
            const arrow = new Konva.Arrow({
                name: 'connector-handle-arrow',
                points: [-6 / zoom, 0, 6 / zoom, 0],
                stroke: '#FFFFFF',
                fill: '#FFFFFF',
                strokeWidth: 2 / zoom,
                pointerLength: 4.5 / zoom,
                pointerWidth: 4.5 / zoom,
                visible: false,
                listening: false
            });
            group.add(hit, circle, arrow);

            const active = value => {
                circle.radius((value ? 17 : 4.5) / zoom);
                circle.strokeWidth((value ? 0 : 2) / zoom);
                arrow.visible(value);
                this.app.overlayLayer.batchDraw();
            };
            group.on('mouseenter', () => {
                active(true);
                this.app.container.style.cursor = 'pointer';
                this.showPreview(source, side);
            });
            group.on('mouseleave', () => {
                active(false);
                this.clearPreview();
                this.app.tools.updateCursor();
            });
            group.on('mousedown touchstart', e => {
                e.cancelBubble = true;
            });
            group.on('click tap', e => {
                e.cancelBubble = true;
                this.quickCreate(source, side);
            });
            return group;
        }

        buildConnectorSelection(connector, zoom) {
            const geometry = this.geometry(connector);
            if (!geometry) return null;
            const group = new Konva.Group({ name: 'connector-selection', listening: false });
            group.add(new Konva.Path({
                data: geometry.pathData,
                stroke: BoardConfig.SELECTION_COLOR,
                strokeWidth: 1.4 / zoom,
                fillEnabled: false,
                lineCap: 'round',
                lineJoin: 'round',
                listening: false
            }));
            const points = [geometry.start, geometry.pointAt(0.5), geometry.end];
            points.forEach((point, index) => group.add(new Konva.Circle({
                x: point.x,
                y: point.y,
                radius: (index === 1 ? 5 : 6) / zoom,
                fill: index === 1 ? BoardConfig.SELECTION_COLOR : '#FFFFFF',
                stroke: BoardConfig.SELECTION_COLOR,
                strokeWidth: 2 / zoom,
                listening: false
            })));
            return group;
        }

        refreshHandles() {
            this.destroyHandleGroups();
            if (!this.app.tools || !this.app.tools.isSelectMode()) return;
            if (this.app.state.selection.length !== 1) return;
            const selected = this.app.state.getElement(this.app.state.selection[0]);
            if (!selected) return;
            const zoom = this.app.state.viewport.zoom || 1;

            if (selected.type === 'shape') {
                const group = new Konva.Group({ name: 'connector-quick-handles' });
                SIDES.forEach(side => {
                    const handle = this.buildQuickHandle(selected, side, zoom);
                    if (handle) group.add(handle);
                });
                this.app.overlayLayer.add(group);
                group.moveToTop();
                this.anchorGroup = group;
            } else if (selected.type === 'connector') {
                const group = this.buildConnectorSelection(selected, zoom);
                if (group) {
                    this.app.overlayLayer.add(group);
                    group.moveToTop();
                    this.selectionGroup = group;
                }
            }
            this.app.overlayLayer.batchDraw();
        }
    }

    BoardConnectors.SIDES = SIDES;
    BoardConnectors.OPPOSITE = OPPOSITE;
    window.BoardConnectors = BoardConnectors;
})();
