import {
  RawInkStroke,
  RawInkPoint,
  VisualASTEntity,
  VisualASTConnector,
  VisualASTLayer,
  CognitiveMapDocument,
  CognitiveCompilerOutput,
  VisualBoundingBoxRect,
} from "../types/cognitive";

/**
 * 5-Level Local Visual AST Engine (ARCHITECTURE_SPEC.md - Section 5.1 & 5.2)
 *
 * Implements the 5 parsing levels:
 * 1. Stroke Classification: Discriminate text strokes, linear connectors, closed containers, and sketch icons.
 * 2. Spatio-Temporal Clustering (600 ms): Merges strokes drawn within < 600 ms and bounding proximity into logical entities.
 * 3. Composite Shapes: Unifies shaft and arrowhead strokes into a single directed ARROW connector.
 * 4. Hierarchical Containment: Infers parent-child containment if an entity is inside a closed CONTAINER_BOX.
 * 5. Magnetic Docking & Relational Labels: Associates arrows to nearest source/target entities and binds adjacent text as labels.
 */
export class VisualASTEngine {
  /**
   * Parses raw ink strokes and passive context into a structured 3-layer Visual AST document (.cmn)
   */
  public parseToDocument(
    mapId: string,
    title: string,
    rawStrokes: RawInkStroke[],
    passiveContextMap: Record<string, string> = {},
    compiledLayer: CognitiveCompilerOutput | null = null
  ): CognitiveMapDocument {
    const visualAST = this.parseVisualAST(rawStrokes, passiveContextMap);

    return {
      map_id: mapId,
      version: "1.0.0",
      metadata: {
        title,
        created_at: rawStrokes.length > 0 && rawStrokes[0].timestamp ? rawStrokes[0].timestamp : Date.now(),
        updated_at: Date.now(),
      },
      raw_ink_layer: {
        strokes: rawStrokes,
      },
      visual_ast_layer: visualAST,
      compiled_cognitive_layer: compiledLayer,
    };
  }

  /**
   * Generates the Visual AST Layer executing all 5 parsing levels
   */
  public parseVisualAST(
    strokes: RawInkStroke[],
    passiveContextMap: Record<string, string> = {}
  ): VisualASTLayer {
    if (strokes.length === 0) {
      return { entities: [], connectors: [] };
    }

    // -------------------------------------------------------------
    // LEVEL 1: STROKE CLASSIFICATION
    // -------------------------------------------------------------
    const classifiedStrokes = strokes.map((strk) => ({
      stroke: strk,
      bbox: this.computeBoundingBox(strk.points),
      classification: this.classifySingleStroke(strk),
    }));

    // -------------------------------------------------------------
    // LEVEL 2: BASELINE ALIGNMENT & SPATIAL CONNECTED COMPONENTS
    // -------------------------------------------------------------
    const contentStrokes = classifiedStrokes.filter(
      (s) => s.classification.type === "TEXT" || s.classification.type === "ICON" || s.classification.type === "BOX"
    );

    const rawClusters: Array<{
      strokeIds: string[];
      points: RawInkPoint[];
      bbox: VisualBoundingBoxRect;
      isBox: boolean;
      passiveKey?: string;
    }> = [];

    // Separate boxes first (containers are distinct logical blocks)
    for (const item of contentStrokes) {
      if (item.classification.type === "BOX") {
        rawClusters.push({
          strokeIds: [item.stroke.id],
          points: item.stroke.points,
          bbox: item.bbox,
          isBox: true,
        });
      }
    }

    // Cluster text and icon strokes via Graph Connected Components (Transitive Closure)
    const nonBoxStrokes = contentStrokes.filter((s) => s.classification.type !== "BOX");
    const visited = new Set<string>();

    for (let i = 0; i < nonBoxStrokes.length; i++) {
      const startStroke = nonBoxStrokes[i];
      if (visited.has(startStroke.stroke.id)) continue;

      const clusterStrokes = [startStroke];
      visited.add(startStroke.stroke.id);

      // BFS to find all transitively connected strokes in the same word/entity
      const queue = [startStroke];
      while (queue.length > 0) {
        const current = queue.shift()!;

        for (let j = 0; j < nonBoxStrokes.length; j++) {
          const candidate = nonBoxStrokes[j];
          if (visited.has(candidate.stroke.id)) continue;

          if (this.areStrokesInSameEntity(current, candidate)) {
            visited.add(candidate.stroke.id);
            clusterStrokes.push(candidate);
            queue.push(candidate);
          }
        }
      }

      // Merge points and compute unified cluster bounding box
      const clusterIds = clusterStrokes.map((s) => s.stroke.id);
      const clusterPoints = clusterStrokes.flatMap((s) => s.stroke.points);
      let clusterBbox = { ...clusterStrokes[0].bbox };
      for (let k = 1; k < clusterStrokes.length; k++) {
        clusterBbox = this.mergeBBoxes(clusterBbox, clusterStrokes[k].bbox);
      }

      rawClusters.push({
        strokeIds: clusterIds,
        points: clusterPoints,
        bbox: clusterBbox,
        isBox: false,
      });
    }

    // Convert raw clusters to VisualASTEntity
    const entities: VisualASTEntity[] = rawClusters.map((cluster, idx) => {
      const entityId = `entity_${idx + 1}`;
      const boxW = cluster.bbox.xmax - cluster.bbox.xmin;
      const boxH = cluster.bbox.ymax - cluster.bbox.ymin;
      // Text words naturally flow horizontally (width >= height * 1.1).
      // Compact, multi-stroke non-horizontal drawings are sketch icons.
      const isIcon = !cluster.isBox && boxW < boxH * 1.1 && cluster.strokeIds.length >= 4;

      const type = cluster.isBox
        ? "CONTAINER_BOX"
        : isIcon
        ? "SKETCH_ICON"
        : "TEXT_BLOCK";

      // Match passive context by stroke ID or entity ID
      const matchedPassive =
        passiveContextMap[entityId] ||
        cluster.strokeIds.map((id) => passiveContextMap[id]).find(Boolean) ||
        null;

      return {
        id: entityId,
        type,
        transcribed_text: matchedPassive || undefined,
        stroke_ids: cluster.strokeIds,
        bbox: cluster.bbox,
        passive_context: matchedPassive,
        child_ids: [],
      };
    });

    // -------------------------------------------------------------
    // LEVEL 3: COMPOSITE ARROWS & CONNECTORS
    // -------------------------------------------------------------
    const lineStrokes = classifiedStrokes.filter(
      (s) => s.classification.type === "LINE" || s.classification.type === "ARROW_HEAD"
    );

    const connectors: VisualASTConnector[] = [];
    const usedConnectorStrokes = new Set<string>();

    for (let i = 0; i < lineStrokes.length; i++) {
      const item = lineStrokes[i];
      if (usedConnectorStrokes.has(item.stroke.id)) continue;

      if (item.classification.type === "LINE") {
        usedConnectorStrokes.add(item.stroke.id);
        const shaftStart = item.stroke.points[0];
        const shaftEnd = item.stroke.points[item.stroke.points.length - 1];

        // Check if there is an arrowhead stroke near the start or end of this line
        let compositeTipStroke: RawInkStroke | null = null;
        let directionality: "FORWARD" | "BIDIRECTIONAL" | "NONE" = "NONE";

        for (let j = 0; j < lineStrokes.length; j++) {
          if (i === j) continue;
          const candidate = lineStrokes[j];
          if (candidate.classification.type === "ARROW_HEAD" && !usedConnectorStrokes.has(candidate.stroke.id)) {
            const tipCenter = this.computeCenter(candidate.stroke.points);
            const distToEnd = Math.hypot(tipCenter.x - shaftEnd.x, tipCenter.y - shaftEnd.y);
            const distToStart = Math.hypot(tipCenter.x - shaftStart.x, tipCenter.y - shaftStart.y);

            if (distToEnd <= 35) {
              compositeTipStroke = candidate.stroke;
              directionality = "FORWARD";
              usedConnectorStrokes.add(candidate.stroke.id);
              break;
            } else if (distToStart <= 35) {
              compositeTipStroke = candidate.stroke;
              directionality = "FORWARD"; // Arrow points backward
              usedConnectorStrokes.add(candidate.stroke.id);
              break;
            }
          }
        }

        // If stroke itself was recognized as an arrow by shape regularizer
        if (item.classification.isArrowShape) {
          directionality = "FORWARD";
        }

        const strokeIds = [item.stroke.id];
        if (compositeTipStroke) {
          strokeIds.push(compositeTipStroke.id);
        }

        connectors.push({
          id: `conn_${connectors.length + 1}`,
          type: directionality === "FORWARD" ? "ARROW" : "LINE",
          stroke_ids: strokeIds,
          directionality,
        });
      }
    }

    // -------------------------------------------------------------
    // LEVEL 4: HIERARCHICAL CONTAINMENT
    // -------------------------------------------------------------
    const containerBoxes = entities.filter((e) => e.type === "CONTAINER_BOX");
    for (const box of containerBoxes) {
      box.child_ids = [];
      for (const candidate of entities) {
        if (candidate.id === box.id) continue;
        // Check if candidate bounding box is completely inside the container
        if (
          candidate.bbox.xmin >= box.bbox.xmin - 5 &&
          candidate.bbox.xmax <= box.bbox.xmax + 5 &&
          candidate.bbox.ymin >= box.bbox.ymin - 5 &&
          candidate.bbox.ymax <= box.bbox.ymax + 5
        ) {
          box.child_ids.push(candidate.id);
        }
      }
    }

    // -------------------------------------------------------------
    // LEVEL 5: MAGNETIC DOCKING & RELATIONAL LABELS
    // -------------------------------------------------------------
    for (const conn of connectors) {
      const connStrokes = strokes.filter((s) => conn.stroke_ids.includes(s.id));
      if (connStrokes.length === 0) continue;

      const mainShaft = connStrokes[0];
      const pStart = mainShaft.points[0];
      const pEnd = mainShaft.points[mainShaft.points.length - 1];

      // Docking Source & Target: Find closest entities (distance < 120 px)
      let nearestSource: { entity: VisualASTEntity; dist: number } | null = null;
      let nearestTarget: { entity: VisualASTEntity; dist: number } | null = null;

      for (const ent of entities) {
        const dStart = this.distancePointToBBox(pStart, ent.bbox);
        const dEnd = this.distancePointToBBox(pEnd, ent.bbox);

        if (!nearestSource || dStart < nearestSource.dist) {
          nearestSource = { entity: ent, dist: dStart };
        }
        if (!nearestTarget || dEnd < nearestTarget.dist) {
          nearestTarget = { entity: ent, dist: dEnd };
        }
      }

      if (nearestSource && nearestSource.dist < 100) {
        conn.source_entity_id = nearestSource.entity.id;
      }
      if (nearestTarget && nearestTarget.dist < 100 && nearestTarget.entity.id !== conn.source_entity_id) {
        conn.target_entity_id = nearestTarget.entity.id;
      }

      // Adjacent Label Binding: Find text block close to the shaft midpoint
      const shaftMid = {
        x: (pStart.x + pEnd.x) / 2,
        y: (pStart.y + pEnd.y) / 2,
      };

      for (const ent of entities) {
        if (ent.id === conn.source_entity_id || ent.id === conn.target_entity_id) continue;
        if (ent.type === "TEXT_BLOCK") {
          const dMid = this.distancePointToBBox(shaftMid, ent.bbox);
          if (dMid <= 40) {
            conn.label = ent.transcribed_text || "relacionado con";
            break;
          }
        }
      }
    }

    return { entities, connectors };
  }

  // -------------------------------------------------------------
  // HELPER GEOMETRY UTILITIES
  // -------------------------------------------------------------

  /**
   * Determines if two text/icon strokes belong to the same word or semantic entity
   * based on Baseline Alignment, Horizontal Proximity, and Delayed Stroke Absorption.
   */
  private areStrokesInSameEntity(
    a: { stroke: RawInkStroke; bbox: VisualBoundingBoxRect },
    b: { stroke: RawInkStroke; bbox: VisualBoundingBoxRect }
  ): boolean {
    const boxA = a.bbox;
    const boxB = b.bbox;

    // Horizontal & Vertical gap between the two bounding boxes
    const dx = Math.max(0, Math.max(boxA.xmin - boxB.xmax, boxB.xmin - boxA.xmax));
    const dy = Math.max(0, Math.max(boxA.ymin - boxB.ymax, boxB.ymin - boxA.ymax));

    // 1. Direct overlap or collision (e.g. crossing of 't', dot on 'i', diacritics, cursive ligature)
    if (dx === 0 && dy <= 28) {
      return true;
    }
    if (dy === 0 && dx <= 38) {
      return true;
    }

    // 2. Delayed stroke / Accent / Diacritic absorption:
    // One stroke is horizontally within the other's span, or close vertically
    const isHorizontallyAligned =
      (boxA.xmin >= boxB.xmin - 15 && boxA.xmin <= boxB.xmax + 15) ||
      (boxB.xmin >= boxA.xmin - 15 && boxB.xmin <= boxA.xmax + 15);
    if (isHorizontallyAligned && dy <= 25) {
      return true;
    }

    // 3. Baseline alignment: share the same line of text
    // The vertical overlap or vertical offset must be within normal character height
    const heightA = boxA.ymax - boxA.ymin;
    const heightB = boxB.ymax - boxB.ymin;
    const maxAllowedDy = Math.max(16, Math.min(heightA, heightB) * 0.75);

    // Characters in the same word typically have an inter-letter horizontal gap <= 42px
    if (dy <= maxAllowedDy && dx <= 42) {
      return true;
    }

    // 4. Temporal expansion: If drawn rapidly (< 650ms), allow slightly wider spatial distance (up to 55px)
    const timeA = a.stroke.timestamp || 0;
    const timeB = b.stroke.timestamp || 0;
    const timeDiff = Math.abs(timeA - timeB);
    if (timeDiff > 0 && timeDiff <= 650 && dy <= maxAllowedDy && dx <= 55) {
      return true;
    }

    return false;
  }

  private classifySingleStroke(stroke: RawInkStroke): {
    type: "LINE" | "ARROW_HEAD" | "BOX" | "TEXT" | "ICON";
    isArrowShape?: boolean;
  } {
    const pts = stroke.points;
    if (pts.length < 2) return { type: "TEXT" };

    const start = pts[0];
    const end = pts[pts.length - 1];
    const directDist = Math.hypot(end.x - start.x, end.y - start.y);

    let totalLength = 0;
    for (let i = 1; i < pts.length; i++) {
      totalLength += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    }

    const bbox = this.computeBoundingBox(pts);
    const boxW = bbox.xmax - bbox.xmin;
    const boxH = bbox.ymax - bbox.ymin;

    // Check if closed box / container
    const isClosed = directDist / (totalLength + 1e-4) < 0.25;
    if (isClosed && boxW > 60 && boxH > 40) {
      return { type: "BOX" };
    }

    // Check if straight line
    if (directDist / (totalLength + 1e-4) >= 0.82 && totalLength > 40) {
      return { type: "LINE" };
    }

    // Check if small arrowhead hook (V shape, small length with sharp bend)
    if (totalLength < 55 && pts.length >= 3 && pts.length <= 12) {
      const p1 = pts[0];
      const pMid = pts[Math.floor(pts.length / 2)];
      const p2 = pts[pts.length - 1];
      const v1x = pMid.x - p1.x;
      const v1y = pMid.y - p1.y;
      const v2x = p2.x - pMid.x;
      const v2y = p2.y - pMid.y;
      const len1 = Math.hypot(v1x, v1y);
      const len2 = Math.hypot(v2x, v2y);
      if (len1 > 3 && len2 > 3) {
        const dot = (v1x * v2x + v1y * v2y) / (len1 * len2);
        // Arrowhead has an acute turn (dot < 0.5, angle > 60 deg)
        if (dot < 0.5) {
          return { type: "ARROW_HEAD" };
        }
      }
    }

    // Default text vs icon
    if (totalLength < 240 && boxW < 140 && boxH < 80) {
      return { type: "TEXT" };
    }

    return { type: "ICON" };
  }

  private computeBoundingBox(points: RawInkPoint[]): VisualBoundingBoxRect {
    let xmin = points[0].x;
    let xmax = points[0].x;
    let ymin = points[0].y;
    let ymax = points[0].y;

    for (let i = 1; i < points.length; i++) {
      const p = points[i];
      if (p.x < xmin) xmin = p.x;
      if (p.x > xmax) xmax = p.x;
      if (p.y < ymin) ymin = p.y;
      if (p.y > ymax) ymax = p.y;
    }

    return { ymin, xmin, ymax, xmax };
  }

  private computeCenter(points: RawInkPoint[]): { x: number; y: number } {
    let sumX = 0;
    let sumY = 0;
    for (const p of points) {
      sumX += p.x;
      sumY += p.y;
    }
    return { x: sumX / points.length, y: sumY / points.length };
  }

  private distanceBetweenBBoxes(a: VisualBoundingBoxRect, b: VisualBoundingBoxRect): number {
    const dx = Math.max(0, Math.max(a.xmin - b.xmax, b.xmin - a.xmax));
    const dy = Math.max(0, Math.max(a.ymin - b.ymax, b.ymin - a.ymax));
    return Math.hypot(dx, dy);
  }

  private distancePointToBBox(p: { x: number; y: number }, b: VisualBoundingBoxRect): number {
    const dx = Math.max(0, Math.max(b.xmin - p.x, p.x - b.xmax));
    const dy = Math.max(0, Math.max(b.ymin - p.y, p.y - b.ymax));
    return Math.hypot(dx, dy);
  }

  private mergeBBoxes(a: VisualBoundingBoxRect, b: VisualBoundingBoxRect): VisualBoundingBoxRect {
    return {
      xmin: Math.min(a.xmin, b.xmin),
      ymin: Math.min(a.ymin, b.ymin),
      xmax: Math.max(a.xmax, b.xmax),
      ymax: Math.max(a.ymax, b.ymax),
    };
  }
}
