import {
  RawInkStroke,
  RawInkPoint,
  VisualASTEntity,
  VisualASTConnector,
  VisualASTLayer,
  CognitiveMapDocument,
  CognitiveCompilerOutput,
  VisualBoundingBoxRect,
  CausalLoop,
  TopologyMetrics,
  ConnectorGeometryType,
} from "../types/cognitive";

/**
 * 5-Level Local Visual AST Engine (ARCHITECTURE_SPEC.md - Section 5.1 & 5.2)
 *
 * Implements the 5 parsing levels enhanced with cognitive/diagrammatic topology:
 * 1. Stroke Classification: Discriminate text strokes, linear/curved connectors, arrowheads, closed containers, and scratch-out gestures.
 * 2. Adaptive Spatio-Temporal Clustering: Dynamic handwriting scale (H-tilde) baseline clustering with delayed stroke absorption.
 * 3. Composite Shapes & Connectors: Unifies shafts (straight, curved, elbow) with arrowheads (forward, bidirectional) or T-bars (inhibitory). Detects multi-stroke container loops (3-6 strokes).
 * 4. Hierarchical Containment: Infers parent-child containment if an entity is inside a closed CONTAINER_BOX.
 * 5. Magnetic Docking, Relational Labels, & Causal Topology: Docks connectors to nearest entities, binds relational text labels, detects causal feedback loops (cycles), and computes flow metrics.
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
      return {
        entities: [],
        connectors: [],
        causal_loops: [],
        topology_metrics: { root_entity_ids: [], sink_entity_ids: [], cross_link_count: 0 },
      };
    }

    // -------------------------------------------------------------
    // LEVEL 1: STROKE CLASSIFICATION
    // -------------------------------------------------------------
    const classifiedStrokes = strokes.map((strk) => ({
      stroke: strk,
      bbox: this.computeBoundingBox(strk.points),
      classification: this.classifySingleStroke(strk),
    }));

    // Detect scratch-out strokes for in-AST pruning (Feature 6)
    const scratchStrokes = classifiedStrokes.filter((s) => s.classification.type === "SCRATCH_OUT");

    // -------------------------------------------------------------
    // LEVEL 2 & 3 PRE-STEP: MULTI-STROKE CONTAINER LOOP DETECTION (Feature 3)
    // -------------------------------------------------------------
    const arrowHeadStrokes = classifiedStrokes.filter((s) => s.classification.type === "ARROW_HEAD");
    const candidateLinesForBox = classifiedStrokes.filter((s) => {
      if (s.classification.type !== "LINE" || s.classification.geometryType !== "STRAIGHT") return false;
      const start = s.stroke.points[0];
      const end = s.stroke.points[s.stroke.points.length - 1];
      const hasArrowHead = arrowHeadStrokes.some((tip) => {
        const center = this.computeCenter(tip.stroke.points);
        return (
          Math.hypot(center.x - start.x, center.y - start.y) <= 45 ||
          Math.hypot(center.x - end.x, center.y - end.y) <= 45
        );
      });
      return !hasArrowHead;
    });
    const multiStrokeBoxGroups = this.detectMultiStrokeContainers(candidateLinesForBox);
    const multiStrokeBoxStrokeIds = new Set<string>(multiStrokeBoxGroups.flatMap((g) => g.strokeIds));

    // -------------------------------------------------------------
    // LEVEL 3: COMPOSITE ARROWS, CURVED CONNECTORS & INHIBITION (Features 2 & 5)
    // -------------------------------------------------------------
    const lineStrokes = classifiedStrokes.filter(
      (s) =>
        !multiStrokeBoxStrokeIds.has(s.stroke.id) &&
        s.classification.type === "LINE"
    );

    const arrowHeadStrokesList = classifiedStrokes.filter(
      (s) => s.classification.type === "ARROW_HEAD"
    );

    const connectors: VisualASTConnector[] = [];
    const usedConnectorStrokes = new Set<string>();

    interface ShaftInfo {
      item: (typeof lineStrokes)[0];
      headAtEnd: boolean;
      headAtStart: boolean;
      tBarAtEnd: boolean;
      attachedStrokeIds: string[];
    }

    const shaftInfos: ShaftInfo[] = lineStrokes.map((ls) => ({
      item: ls,
      headAtEnd: false,
      headAtStart: false,
      tBarAtEnd: false,
      attachedStrokeIds: [ls.stroke.id],
    }));

    // Step 3A: Assign each arrowhead to its closest shaft extremity
    for (const tip of arrowHeadStrokesList) {
      const tipCenter = this.computeCenter(tip.stroke.points);
      let bestShaft: ShaftInfo | null = null;
      let bestDist = Infinity;
      let isEnd = true;

      for (const shaft of shaftInfos) {
        const shaftPts = shaft.item.stroke.points;
        const pStart = shaftPts[0];
        const pEnd = shaftPts[shaftPts.length - 1];

        const dEnd = Math.hypot(tipCenter.x - pEnd.x, tipCenter.y - pEnd.y);
        const dStart = Math.hypot(tipCenter.x - pStart.x, tipCenter.y - pStart.y);

        if (dEnd < bestDist && dEnd <= 40) {
          bestDist = dEnd;
          bestShaft = shaft;
          isEnd = true;
        }
        if (dStart < bestDist && dStart <= 40) {
          bestDist = dStart;
          bestShaft = shaft;
          isEnd = false;
        }
      }

      if (bestShaft) {
        usedConnectorStrokes.add(tip.stroke.id);
        bestShaft.attachedStrokeIds.push(tip.stroke.id);
        if (isEnd) {
          bestShaft.headAtEnd = true;
        } else {
          bestShaft.headAtStart = true;
        }
      }
    }

    // Step 3B: For shafts without an arrowhead at end, check for a perpendicular T-bar cap (Inhibition)
    for (const shaft of shaftInfos) {
      if (shaft.headAtEnd) continue;

      const shaftPts = shaft.item.stroke.points;
      const pEnd = shaftPts[shaftPts.length - 1];

      for (const candidate of classifiedStrokes) {
        if (
          candidate.stroke.id === shaft.item.stroke.id ||
          usedConnectorStrokes.has(candidate.stroke.id)
        ) {
          continue;
        }

        const capCenter = this.computeCenter(candidate.stroke.points);
        const distToEnd = Math.hypot(capCenter.x - pEnd.x, capCenter.y - pEnd.y);

        if (
          distToEnd <= 40 &&
          this.isCandidateTBarStroke(candidate.stroke) &&
          this.isPerpendicularCap(shaft.item.stroke, candidate.stroke)
        ) {
          shaft.tBarAtEnd = true;
          shaft.attachedStrokeIds.push(candidate.stroke.id);
          usedConnectorStrokes.add(candidate.stroke.id);
          break;
        }
      }
    }

    // Step 3C: Build connector objects
    for (const shaft of shaftInfos) {
      let connType: "ARROW" | "LINE" | "INHIBITION" = "LINE";
      let directionality: "FORWARD" | "BIDIRECTIONAL" | "NONE" = "NONE";

      if (shaft.tBarAtEnd) {
        connType = "INHIBITION";
        directionality = "FORWARD";
      } else if (shaft.headAtStart && shaft.headAtEnd) {
        connType = "ARROW";
        directionality = "BIDIRECTIONAL";
      } else if (shaft.headAtEnd || shaft.headAtStart || shaft.item.classification.isArrowShape) {
        connType = "ARROW";
        directionality = "FORWARD";
      } else {
        // Plain line without arrowhead or T-bar cap.
        // Check if this stroke is a letter stem or character component inside a word:
        // If it is adjacent to other content strokes along a baseline, it belongs to the word, NOT a connector!
        const hasTextNeighbor = classifiedStrokes.some((other) => {
          if (other.stroke.id === shaft.item.stroke.id) return false;
          if (other.classification.type === "BOX" || other.classification.type === "SCRATCH_OUT") return false;
          return this.areStrokesInSameEntity(shaft.item, other);
        });

        if (hasTextNeighbor) {
          // This line is part of a word or character (e.g. stem of P, h, t, p, l, etc.)
          continue;
        }
      }

      usedConnectorStrokes.add(shaft.item.stroke.id);

      connectors.push({
        id: `conn_${connectors.length + 1}`,
        type: connType,
        stroke_ids: shaft.attachedStrokeIds,
        directionality,
        is_curved: shaft.item.classification.isCurved || false,
        geometry_type: shaft.item.classification.geometryType || "STRAIGHT",
      });
    }

    // -------------------------------------------------------------
    // LEVEL 2: ADAPTIVE BASELINE ALIGNMENT & SPATIAL CONNECTED COMPONENTS (Feature 1)
    // -------------------------------------------------------------
    const contentStrokes = classifiedStrokes.filter(
      (s) =>
        s.classification.type !== "SCRATCH_OUT" &&
        !multiStrokeBoxStrokeIds.has(s.stroke.id) &&
        !usedConnectorStrokes.has(s.stroke.id)
    );

    const rawClusters: Array<{
      strokeIds: string[];
      points: RawInkPoint[];
      bbox: VisualBoundingBoxRect;
      isBox: boolean;
      passiveKey?: string;
    }> = [];

    // Add multi-stroke polygon containers as CONTAINER_BOX entities
    for (const multiBox of multiStrokeBoxGroups) {
      rawClusters.push({
        strokeIds: multiBox.strokeIds,
        points: multiBox.points,
        bbox: multiBox.bbox,
        isBox: true,
      });
    }

    // Add single-stroke closed boxes
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

    // Cluster text and icon strokes via Graph Connected Components with Adaptive Scaling
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
    let entities: VisualASTEntity[] = rawClusters.map((cluster, idx) => {
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
    // FEATURE 6: IN-AST SCRATCH-OUT PRUNING
    // -------------------------------------------------------------
    if (scratchStrokes.length > 0) {
      for (const scratch of scratchStrokes) {
        for (const ent of entities) {
          if (this.doesScratchCoverEntity(scratch.bbox, ent.bbox)) {
            ent.is_scratched_out = true;
          }
        }
      }
      // Prune scratched-out entities from active AST layer
      entities = entities.filter((e) => !e.is_scratched_out);
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

      // Docking Source & Target: Find closest entities (distance < 100 px)
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

    // -------------------------------------------------------------
    // FEATURE 4: TOPOLOGICAL FLOW ANALYSIS & CAUSAL FEEDBACK LOOPS
    // -------------------------------------------------------------
    const causalLoops = this.detectCausalLoops(entities, connectors);
    const topologyMetrics = this.computeTopologyMetrics(entities, connectors);

    return {
      entities,
      connectors,
      causal_loops: causalLoops,
      topology_metrics: topologyMetrics,
    };
  }

  // -------------------------------------------------------------
  // FEATURE 4: TOPOLOGICAL ANALYSIS UTILITIES
  // -------------------------------------------------------------

  /**
   * Detects simple directed cycles (causal feedback loops) in the docked connector graph
   */
  private detectCausalLoops(
    entities: VisualASTEntity[],
    connectors: VisualASTConnector[]
  ): CausalLoop[] {
    const adj = new Map<string, string[]>();
    for (const ent of entities) {
      adj.set(ent.id, []);
    }

    for (const conn of connectors) {
      if (!conn.source_entity_id || !conn.target_entity_id) continue;
      adj.get(conn.source_entity_id)?.push(conn.target_entity_id);
      if (conn.directionality === "BIDIRECTIONAL") {
        adj.get(conn.target_entity_id)?.push(conn.source_entity_id);
      }
    }

    const cycles: string[][] = [];
    const visitedInCycle = new Set<string>();

    const dfs = (startNode: string, current: string, path: string[]) => {
      path.push(current);
      const neighbors = adj.get(current) || [];

      for (const next of neighbors) {
        if (next === startNode && path.length >= 3) {
          // Closed loop detected
          const cyclePath = [...path, startNode];
          const canonical = this.canonicalizeCycle(cyclePath);
          const key = canonical.join("->");
          if (!visitedInCycle.has(key)) {
            visitedInCycle.add(key);
            cycles.push(canonical);
          }
        } else if (!path.includes(next) && path.length < 12) {
          dfs(startNode, next, path);
        }
      }
      path.pop();
    };

    for (const ent of entities) {
      dfs(ent.id, ent.id, []);
    }

    return cycles.map((c) => ({
      cycle_ids: c,
      node_count: c.length - 1,
    }));
  }

  /**
   * Normalizes a cycle array [A, B, C, A] to its lexicographically minimal rotation
   */
  private canonicalizeCycle(cycle: string[]): string[] {
    const nodes = cycle.slice(0, cycle.length - 1);
    let minIdx = 0;
    for (let i = 1; i < nodes.length; i++) {
      if (nodes[i] < nodes[minIdx]) {
        minIdx = i;
      }
    }
    const rotated = [...nodes.slice(minIdx), ...nodes.slice(0, minIdx)];
    return [...rotated, rotated[0]];
  }

  /**
   * Computes high-level flow metrics: root premises, sink conclusions, and cross-links
   */
  private computeTopologyMetrics(
    entities: VisualASTEntity[],
    connectors: VisualASTConnector[]
  ): TopologyMetrics {
    const inDegree = new Map<string, number>();
    const outDegree = new Map<string, number>();

    for (const ent of entities) {
      inDegree.set(ent.id, 0);
      outDegree.set(ent.id, 0);
    }

    for (const conn of connectors) {
      if (conn.source_entity_id && conn.target_entity_id) {
        outDegree.set(conn.source_entity_id, (outDegree.get(conn.source_entity_id) || 0) + 1);
        inDegree.set(conn.target_entity_id, (inDegree.get(conn.target_entity_id) || 0) + 1);

        if (conn.directionality === "BIDIRECTIONAL") {
          outDegree.set(conn.target_entity_id, (outDegree.get(conn.target_entity_id) || 0) + 1);
          inDegree.set(conn.source_entity_id, (inDegree.get(conn.source_entity_id) || 0) + 1);
        }
      }
    }

    const rootEntityIds: string[] = [];
    const sinkEntityIds: string[] = [];
    let crossLinkCount = 0;

    for (const ent of entities) {
      const inD = inDegree.get(ent.id) || 0;
      const outD = outDegree.get(ent.id) || 0;

      if (inD === 0 && outD > 0) {
        rootEntityIds.push(ent.id);
      }
      if (inD > 0 && outD === 0) {
        sinkEntityIds.push(ent.id);
      }
      if (inD > 1) {
        crossLinkCount += inD - 1; // Nodes with multiple inputs indicate converging cross-links
      }
    }

    return {
      root_entity_ids: rootEntityIds,
      sink_entity_ids: sinkEntityIds,
      cross_link_count: crossLinkCount,
    };
  }

  // -------------------------------------------------------------
  // FEATURE 3: MULTI-STROKE CONTAINER LOOP DETECTION
  // -------------------------------------------------------------

  /**
   * Finds sets of 3 to 6 straight line strokes whose endpoints connect to form a closed polygon
   */
  private detectMultiStrokeContainers(
    candidateLines: Array<{ stroke: RawInkStroke; bbox: VisualBoundingBoxRect }>
  ): Array<{
    strokeIds: string[];
    points: RawInkPoint[];
    bbox: VisualBoundingBoxRect;
  }> {
    if (candidateLines.length < 3) return [];

    const containers: Array<{ strokeIds: string[]; points: RawInkPoint[]; bbox: VisualBoundingBoxRect }> = [];
    const usedStrokes = new Set<string>();

    const lines = candidateLines.map((l) => ({
      id: l.stroke.id,
      stroke: l.stroke,
      bbox: l.bbox,
      start: l.stroke.points[0],
      end: l.stroke.points[l.stroke.points.length - 1],
    }));

    // Find cycles of length 3 to 6 among line endpoints
    for (let i = 0; i < lines.length; i++) {
      if (usedStrokes.has(lines[i].id)) continue;

      const path: number[] = [i];
      const visitedInPath = new Set<number>([i]);

      const searchLoop = (currIdx: number, currentPt: RawInkPoint, depth: number): boolean => {
        if (depth >= 3) {
          // Check if current endpoint connects back to start of path
          const firstLine = lines[path[0]];
          const distToFirstStart = Math.hypot(currentPt.x - firstLine.start.x, currentPt.y - firstLine.start.y);
          const distToFirstEnd = Math.hypot(currentPt.x - firstLine.end.x, currentPt.y - firstLine.end.y);

          if (distToFirstStart <= 35 || distToFirstEnd <= 35) {
            return true;
          }
        }

        if (depth >= 6) return false;

        for (let nextIdx = 0; nextIdx < lines.length; nextIdx++) {
          if (visitedInPath.has(nextIdx) || usedStrokes.has(lines[nextIdx].id)) continue;

          const nextLine = lines[nextIdx];
          const distToNextStart = Math.hypot(currentPt.x - nextLine.start.x, currentPt.y - nextLine.start.y);
          const distToNextEnd = Math.hypot(currentPt.x - nextLine.end.x, currentPt.y - nextLine.end.y);

          if (distToNextStart <= 35) {
            visitedInPath.add(nextIdx);
            path.push(nextIdx);
            if (searchLoop(nextIdx, nextLine.end, depth + 1)) return true;
            path.pop();
            visitedInPath.delete(nextIdx);
          } else if (distToNextEnd <= 35) {
            visitedInPath.add(nextIdx);
            path.push(nextIdx);
            if (searchLoop(nextIdx, nextLine.start, depth + 1)) return true;
            path.pop();
            visitedInPath.delete(nextIdx);
          }
        }

        return false;
      };

      // Try extending from lines[i].end
      if (searchLoop(i, lines[i].end, 1)) {
        const loopLines = path.map((idx) => lines[idx]);
        const allPoints = loopLines.flatMap((l) => l.stroke.points);
        let unionBbox = { ...loopLines[0].bbox };
        for (let k = 1; k < loopLines.length; k++) {
          unionBbox = this.mergeBBoxes(unionBbox, loopLines[k].bbox);
        }

        const boxW = unionBbox.xmax - unionBbox.xmin;
        const boxH = unionBbox.ymax - unionBbox.ymin;

        if (boxW >= 50 && boxH >= 35) {
          const strokeIds = loopLines.map((l) => l.id);
          strokeIds.forEach((id) => usedStrokes.add(id));
          containers.push({
            strokeIds,
            points: allPoints,
            bbox: unionBbox,
          });
        }
      }
    }

    return containers;
  }

  // -------------------------------------------------------------
  // FEATURE 1: ADAPTIVE HANDWRITING SCALING THRESHOLDS
  // -------------------------------------------------------------

  /**
   * Determines if two text/icon strokes belong to the same word or semantic entity
   * based on Adaptive Dynamic Height Scaling (H-tilde), Baseline Alignment, and Proximity.
   */
  private areStrokesInSameEntity(
    a: { stroke: RawInkStroke; bbox: VisualBoundingBoxRect },
    b: { stroke: RawInkStroke; bbox: VisualBoundingBoxRect }
  ): boolean {
    const boxA = a.bbox;
    const boxB = b.bbox;

    const dx = Math.max(0, Math.max(boxA.xmin - boxB.xmax, boxB.xmin - boxA.xmax));
    const dy = Math.max(0, Math.max(boxA.ymin - boxB.ymax, boxB.ymin - boxA.ymax));

    // Dynamic scale factor H-tilde based on local stroke heights
    const heightA = boxA.ymax - boxA.ymin;
    const heightB = boxB.ymax - boxB.ymin;
    const hTilde = Math.max(14, Math.min(heightA, heightB));

    const maxAllowedDx = Math.max(24, Math.min(65, hTilde * 1.25));
    const maxAllowedDy = Math.max(16, hTilde * 0.85);

    // 1. Direct overlap or collision (e.g. crossing of 't', dot on 'i', diacritics, cursive ligature)
    if (dx === 0 && dy <= Math.max(28, hTilde * 0.95)) {
      return true;
    }
    if (dy === 0 && dx <= maxAllowedDx) {
      return true;
    }

    // 2. Delayed stroke / Accent / Diacritic absorption:
    // One stroke is horizontally within the other's span, or close vertically
    const isHorizontallyAligned =
      (boxA.xmin >= boxB.xmin - Math.max(15, hTilde * 0.35) && boxA.xmin <= boxB.xmax + Math.max(15, hTilde * 0.35)) ||
      (boxB.xmin >= boxA.xmin - Math.max(15, hTilde * 0.35) && boxB.xmin <= boxA.xmax + Math.max(15, hTilde * 0.35));
    if (isHorizontallyAligned && dy <= Math.max(25, hTilde * 0.9)) {
      return true;
    }

    // 3. Baseline alignment: share the same line of text scaled dynamically by H-tilde
    if (dy <= maxAllowedDy && dx <= maxAllowedDx) {
      return true;
    }

    // 4. Temporal expansion: If drawn rapidly (< 650ms), allow slightly wider horizontal distance
    const timeA = a.stroke.timestamp || 0;
    const timeB = b.stroke.timestamp || 0;
    const timeDiff = Math.abs(timeA - timeB);
    if (timeDiff > 0 && timeDiff <= 650 && dy <= maxAllowedDy && dx <= maxAllowedDx * 1.35) {
      return true;
    }

    return false;
  }

  // -------------------------------------------------------------
  // STROKE CLASSIFICATION & REGULARIZATION
  // -------------------------------------------------------------

  private classifySingleStroke(stroke: RawInkStroke): {
    type: "LINE" | "ARROW_HEAD" | "BOX" | "TEXT" | "ICON" | "SCRATCH_OUT";
    isArrowShape?: boolean;
    geometryType?: ConnectorGeometryType;
    isCurved?: boolean;
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

    // Feature 6: Scratch-out detection (rapid horizontal reversals)
    if (pts.length >= 8) {
      let reversals = 0;
      let prevDx = 0;
      for (let i = 1; i < pts.length; i++) {
        const dx = pts[i].x - pts[i - 1].x;
        if (Math.abs(dx) > 3) {
          if (prevDx !== 0 && (dx > 0) !== (prevDx > 0)) {
            reversals++;
          }
          prevDx = dx;
        }
      }
      if (reversals >= 4 && totalLength >= 70 && boxW >= 30) {
        return { type: "SCRATCH_OUT" };
      }
    }

    // Check if closed single-stroke box / container
    const isClosed = directDist / (totalLength + 1e-4) < 0.28;
    if (isClosed && boxW > 50 && boxH > 35) {
      return { type: "BOX" };
    }

    // Check if small arrowhead hook (V shape, small length with sharp bend)
    if (totalLength < 60 && pts.length >= 3 && pts.length <= 14) {
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
        if (dot < 0.5) {
          return { type: "ARROW_HEAD" };
        }
      }
    }

    // Straight line (requires length >= 65 to distinguish from letter stems like 'H', 'T', 'I')
    const linearity = directDist / (totalLength + 1e-4);
    if (linearity >= 0.82 && totalLength >= 65) {
      return { type: "LINE", geometryType: "STRAIGHT", isCurved: false };
    }

    // Feature 2: Curved Bézier or Orthogonal Elbow Connector
    // A diagram connector arc has at most 1 inflection/reversal in y, whereas cursive letters oscillate (yReversals >= 2)
    let yReversals = 0;
    let prevDy = 0;
    for (let i = 1; i < pts.length; i++) {
      const dy = pts[i].y - pts[i - 1].y;
      if (Math.abs(dy) > 4) {
        if (prevDy !== 0 && (dy > 0) !== (prevDy > 0)) {
          yReversals++;
        }
        prevDy = dy;
      }
    }

    if (linearity >= 0.38 && totalLength >= 75 && directDist >= 50 && !isClosed && yReversals <= 1) {
      const isElbow = this.detectElbowShape(pts);
      return {
        type: "LINE",
        geometryType: isElbow ? "ELBOW" : "CURVED",
        isCurved: true,
      };
    }

    // Default text vs icon
    if (totalLength < 240 && boxW < 140 && boxH < 80) {
      return { type: "TEXT" };
    }

    return { type: "ICON" };
  }

  /**
   * Identifies candidate short strokes for T-bar cap (10px - 55px, straight)
   */
  private isCandidateTBarStroke(stroke: RawInkStroke): boolean {
    const pts = stroke.points;
    if (pts.length < 2) return false;
    let totalLength = 0;
    for (let i = 1; i < pts.length; i++) {
      totalLength += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    }
    const directDist = Math.hypot(pts[pts.length - 1].x - pts[0].x, pts[pts.length - 1].y - pts[0].y);
    return totalLength >= 10 && totalLength <= 55 && directDist / (totalLength + 1e-4) >= 0.80;
  }

  /**
   * Detects if an open stroke has ~90 degree elbow bend(s)
   */
  private detectElbowShape(pts: RawInkPoint[]): boolean {
    if (pts.length < 4) return false;
    for (let i = 1; i < pts.length - 1; i++) {
      const v1x = pts[i].x - pts[i - 1].x;
      const v1y = pts[i].y - pts[i - 1].y;
      const v2x = pts[i + 1].x - pts[i].x;
      const v2y = pts[i + 1].y - pts[i].y;
      const len1 = Math.hypot(v1x, v1y);
      const len2 = Math.hypot(v2x, v2y);
      if (len1 < 10 || len2 < 10) continue;
      const dot = (v1x * v2x + v1y * v2y) / (len1 * len2);
      // Sharp orthogonal turn: |cos theta| <= 0.35 (between 70 and 110 degrees)
      if (Math.abs(dot) <= 0.35) {
        return true;
      }
    }
    return false;
  }

  /**
   * Verifies if a candidate T-bar stroke is perpendicular (60 to 120 deg) to the shaft vector
   */
  private isPerpendicularCap(shaft: RawInkStroke, cap: RawInkStroke): boolean {
    const sPts = shaft.points;
    const cPts = cap.points;
    const sLen = sPts.length;
    const cLen = cPts.length;
    if (sLen < 2 || cLen < 2) return false;

    const shaftV = {
      x: sPts[sLen - 1].x - sPts[Math.max(0, sLen - 4)].x,
      y: sPts[sLen - 1].y - sPts[Math.max(0, sLen - 4)].y,
    };
    const capV = {
      x: cPts[cLen - 1].x - cPts[0].x,
      y: cPts[cLen - 1].y - cPts[0].y,
    };

    const sMag = Math.hypot(shaftV.x, shaftV.y);
    const cMag = Math.hypot(capV.x, capV.y);
    if (sMag === 0 || cMag === 0) return false;

    const cosTheta = Math.abs((shaftV.x * capV.x + shaftV.y * capV.y) / (sMag * cMag));
    // Perpendicular angle: |cos theta| <= 0.5 (between 60 and 120 degrees)
    return cosTheta <= 0.5;
  }

  /**
   * Checks if a scratch-out gesture bounding box covers an entity
   */
  private doesScratchCoverEntity(scratchBbox: VisualBoundingBoxRect, entBbox: VisualBoundingBoxRect): boolean {
    const interXmin = Math.max(scratchBbox.xmin, entBbox.xmin);
    const interXmax = Math.min(scratchBbox.xmax, entBbox.xmax);
    const interYmin = Math.max(scratchBbox.ymin, entBbox.ymin);
    const interYmax = Math.min(scratchBbox.ymax, entBbox.ymax);

    if (interXmax <= interXmin || interYmax <= interYmin) {
      return false;
    }

    const interArea = (interXmax - interXmin) * (interYmax - interYmin);
    const entArea = (entBbox.xmax - entBbox.xmin) * (entBbox.ymax - entBbox.ymin);

    return interArea / (entArea + 1e-4) >= 0.35;
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
