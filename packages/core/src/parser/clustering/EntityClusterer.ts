import {
  RawInkPoint,
  RawInkStroke,
  VisualASTEntity,
  VisualBoundingBoxRect,
} from "../../types/cognitive";
import { SkeletalDistance } from "./SkeletalDistance";
import { StrokeClassificationResult } from "../classification/IStrokeClassifier";

export interface ClassifiedStrokeItem {
  stroke: RawInkStroke;
  bbox: VisualBoundingBoxRect;
  classification: StrokeClassificationResult;
}

export class EntityClusterer {
  /**
   * Determines if two text/icon strokes belong to the same word or semantic entity
   * based on Adaptive Dynamic Height Scaling (H-tilde), Skeletal Point-to-Stroke proximity, and Baseline Alignment.
   */
  public static areStrokesInSameEntity(
    a: { stroke: RawInkStroke; bbox: VisualBoundingBoxRect },
    b: { stroke: RawInkStroke; bbox: VisualBoundingBoxRect },
    scaleHint: number = 35,
    zoomFactor: number = 1.0
  ): boolean {
    const boxA = a.bbox;
    const boxB = b.bbox;

    const dx = Math.max(0, Math.max(boxA.xmin - boxB.xmax, boxB.xmin - boxA.xmax));
    const dy = Math.max(0, Math.max(boxA.ymin - boxB.ymax, boxB.ymin - boxA.ymax));

    const widthA = boxA.xmax - boxA.xmin;
    const widthB = boxB.xmax - boxB.xmin;
    const heightA = boxA.ymax - boxA.ymin;
    const heightB = boxB.ymax - boxB.ymin;

    const maxDimA = Math.max(widthA, heightA);
    const maxDimB = Math.max(widthB, heightB);
    const localDim = Math.max(maxDimA, maxDimB);
    const hTilde = localDim >= 12 * zoomFactor ? localDim : Math.max(12 * zoomFactor, scaleHint);

    // Fast Bounding Box Pre-Rejection:
    // If bounding boxes are separated by more than maximum allowable word proximity,
    // they can never be in the same entity. Reject in O(1) without computing skeletal point distances.
    const maxPossibleDx = Math.max(35 * zoomFactor, hTilde * 2.0);
    const maxPossibleDy = Math.max(40 * zoomFactor, hTilde * 1.25);
    if (dx > maxPossibleDx || dy > maxPossibleDy) {
      return false;
    }

    // 1. Direct Physical Touch / Skeletal Point-to-Stroke Connection (MyScript point-to-segment)
    // T-crossing, P-loop touching stem, D-belly touching stem, N/R/Y branch touching stem, cursive ligature
    const skeletalDist = SkeletalDistance.minDistanceBetweenStrokes(a.stroke, b.stroke, zoomFactor);
    if (skeletalDist <= Math.max(14 * zoomFactor, hTilde * 0.4)) {
      return true;
    }

    // 2. Direct overlap in X and close in Y (e.g. crossing of 't', dot on 'i', diacritics, accents)
    if (dx === 0 && dy <= Math.max(28 * zoomFactor, hTilde * 0.95)) {
      return true;
    }

    // 3. Delayed stroke / Flat crossbar / Diacritic absorption
    const isFlatBarA = widthA / (heightA + 1e-4) >= 1.4 || heightA <= Math.max(18 * zoomFactor, hTilde * 0.35);
    const isFlatBarB = widthB / (heightB + 1e-4) >= 1.4 || heightB <= Math.max(18 * zoomFactor, hTilde * 0.35);
    if (isFlatBarA || isFlatBarB) {
      const isOverlappingOrNearInX =
        boxA.xmin <= boxB.xmax + hTilde * 0.5 && boxB.xmin <= boxA.xmax + hTilde * 0.5;
      if (isOverlappingOrNearInX && dy <= Math.max(40 * zoomFactor, hTilde * 1.1)) {
        return true;
      }
    }

    // 4. Baseline alignment for consecutive letters in a word (Scale-invariant thresholds)
    const maxAllowedDx = Math.max(20 * zoomFactor, hTilde * 1.45);
    const maxAllowedDy = Math.max(16 * zoomFactor, hTilde * 0.9);

    if (dy <= maxAllowedDy && dx <= maxAllowedDx) {
      return true;
    }

    // 5. Temporal expansion: If drawn rapidly (< 900ms), allow slightly wider horizontal distance
    const timeA = a.stroke.timestamp || 0;
    const timeB = b.stroke.timestamp || 0;
    const timeDiff = Math.abs(timeA - timeB);
    if (timeDiff > 0 && timeDiff <= 900 && dy <= maxAllowedDy && dx <= maxAllowedDx * 1.35) {
      return true;
    }

    return false;
  }

  /**
   * Validates whether a stroke has the geometry of a handwriting stroke (vertical stem, crossbar, or compact loop).
   * Rejects long horizontal lines and diagonal lines which represent diagram connectors.
   */
  public static isLetterShape(
    stroke: RawInkStroke,
    scaleHint: number,
    zoomFactor: number
  ): boolean {
    const pts = stroke.points;
    if (!pts || pts.length < 2) return true;

    const bbox = SkeletalDistance.computeBoundingBox(pts);
    const w = bbox.xmax - bbox.xmin;
    const h = bbox.ymax - bbox.ymin;

    const maxStemW = Math.max(60 * zoomFactor, scaleHint * 1.6);
    const maxStemH = Math.max(280 * zoomFactor, scaleHint * 4.0);

    const maxBarH = Math.max(30 * zoomFactor, scaleHint * 0.9);
    const maxBarW = Math.max(65 * zoomFactor, scaleHint * 1.7);

    const maxBodyW = Math.max(65 * zoomFactor, scaleHint * 1.7);
    const maxBodyH = Math.max(130 * zoomFactor, scaleHint * 2.6);

    // Vertical stem (P, h, t, l, b, d, f, k, p, q, y, j, etc.)
    const isVerticalStem = w <= maxStemW && h <= maxStemH;

    // Horizontal bar (crossbars like 't', accents, hyphens)
    const isHorizontalBar = h <= maxBarH && w <= maxBarW;

    // Compact body / loop (o, a, e, c, s, u, v, w, etc.)
    const isCompactBody = w <= maxBodyW && h <= maxBodyH;

    return isVerticalStem || isHorizontalBar || isCompactBody;
  }

  /**
   * Checks if a candidate stroke has nearby letter/word neighbors on the same baseline.
   * Crucial: treats letter-scale closed loops (o, a, e, p, b, d) as valid text neighbors,
   * while ignoring arrowheads and long diagram lines.
   */
  public static hasTextNeighbor(
    target: ClassifiedStrokeItem,
    allStrokes: ClassifiedStrokeItem[],
    scaleHint: number,
    zoomFactor: number
  ): boolean {
    return allStrokes.some((other) => {
      if (other.stroke.id === target.stroke.id) return false;
      if (other.classification.type === "SCRATCH_OUT") return false;
      if (other.classification.type === "ARROW_HEAD") return false;

      // If other is a large container box (not letter scale), it's not a text neighbor
      if (other.classification.type === "BOX") {
        if (!this.isLetterShape(other.stroke, scaleHint, zoomFactor)) {
          return false;
        }
      }

      // If other is a long diagram line (wide horizontal or diagonal), it's not a text neighbor
      if (other.classification.type === "LINE") {
        if (!this.isLetterShape(other.stroke, scaleHint, zoomFactor)) {
          return false;
        }
      }

      return this.areStrokesInSameEntity(target, other, scaleHint, zoomFactor);
    });
  }

  /**
   * Reclassifies letter-sized closed loops (P, O, D, B, A, etc.) adjacent to text strokes as TEXT.
   */
  public static demoteLetterLoopsToText(
    contentStrokes: ClassifiedStrokeItem[],
    scaleHint: number,
    zoomFactor: number
  ): void {
    const maxLetterBoxW = Math.max(140 * zoomFactor, scaleHint * 2.6);
    const maxLetterBoxH = Math.max(90 * zoomFactor, scaleHint * 2.0);

    for (const item of contentStrokes) {
      if (item.classification.type === "BOX") {
        const itemW = item.bbox.xmax - item.bbox.xmin;
        const itemH = item.bbox.ymax - item.bbox.ymin;
        const isLetterScale = itemW < maxLetterBoxW && itemH < maxLetterBoxH;

        if (isLetterScale) {
          if (this.hasTextNeighbor(item, contentStrokes, scaleHint, zoomFactor)) {
            item.classification.type = "TEXT";
          }
        }
      }
    }
  }

  /**
   * Clusters content strokes into VisualASTEntity objects using Connected Components & Baseline Alignment.
   */
  public static clusterEntities(
    contentStrokes: ClassifiedStrokeItem[],
    multiStrokeBoxGroups: Array<{
      strokeIds: string[];
      points: RawInkPoint[];
      bbox: VisualBoundingBoxRect;
    }>,
    scratchStrokes: ClassifiedStrokeItem[],
    passiveContextMap: Record<string, string>,
    scaleHint: number,
    zoomFactor: number
  ): VisualASTEntity[] {
    // 1. Demote small loops next to text to TEXT
    this.demoteLetterLoopsToText(contentStrokes, scaleHint, zoomFactor);

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

          if (this.areStrokesInSameEntity(current, candidate, scaleHint, zoomFactor)) {
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
        clusterBbox = SkeletalDistance.mergeBBoxes(clusterBbox, clusterStrokes[k].bbox);
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

    // Feature 6: In-AST scratch-out pruning
    if (scratchStrokes.length > 0) {
      for (const scratch of scratchStrokes) {
        for (const ent of entities) {
          if (this.doesScratchCoverEntity(scratch.bbox, ent.bbox)) {
            ent.is_scratched_out = true;
          }
        }
      }
      entities = entities.filter((e) => !e.is_scratched_out);
    }

    return entities;
  }

  /**
   * Checks if a scratch-out gesture bounding box covers an entity
   */
  public static doesScratchCoverEntity(
    scratchBbox: VisualBoundingBoxRect,
    entBbox: VisualBoundingBoxRect
  ): boolean {
    const interXmin = Math.max(scratchBbox.xmin, entBbox.xmin);
    const interXmax = Math.min(scratchBbox.xmax, entBbox.xmax);
    const interYmin = Math.max(scratchBbox.ymin, entBbox.ymin);
    const interYmax = Math.min(scratchBbox.ymax, entBbox.ymax);

    if (interXmax <= interXmin || interYmax <= interYmin) {
      return false;
    }

    const entW = entBbox.xmax - entBbox.xmin;
    const entH = entBbox.ymax - entBbox.ymin;
    const interW = interXmax - interXmin;
    const interH = interYmax - interYmin;

    const entCenterX = (entBbox.xmin + entBbox.xmax) / 2;
    const crossesCenterX = scratchBbox.xmin <= entCenterX && scratchBbox.xmax >= entCenterX;
    const goodHorizontal = interW / (entW + 1e-4) >= 0.35 || (crossesCenterX && interW >= 25);

    const entCenterY = (entBbox.ymin + entBbox.ymax) / 2;
    const crossesCenterY = scratchBbox.ymin <= entCenterY && scratchBbox.ymax >= entCenterY;
    const goodVertical = interH / (entH + 1e-4) >= 0.15 || crossesCenterY;

    const interArea = interW * interH;
    const entArea = entW * entH;
    const directAreaRatio = interArea / (entArea + 1e-4);

    return (goodHorizontal && goodVertical) || directAreaRatio >= 0.25;
  }
}
