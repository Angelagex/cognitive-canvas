import { RawInkStroke, RawInkPoint } from "../../types/cognitive";
import { SkeletalDistance } from "../clustering/SkeletalDistance";
import {
  IStrokeClassifier,
  StrokeClassificationResult,
} from "./IStrokeClassifier";

export class StrokeClassifier implements IStrokeClassifier {
  /**
   * Classifies a single raw stroke into geometric/diagrammatic primitive
   * (Phase 1 Heuristic implementation of IStrokeClassifier)
   */
  public classify(
    stroke: RawInkStroke,
    scaleHint: number = 35,
    zoomFactor: number = 1.0
  ): StrokeClassificationResult {
    const pts = stroke.points;
    if (!pts || pts.length < 2) return { type: "TEXT" };

    const start = pts[0];
    const end = pts[pts.length - 1];
    const directDist = Math.hypot(end.x - start.x, end.y - start.y);

    let totalLength = 0;
    for (let i = 1; i < pts.length; i++) {
      totalLength += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    }

    const bbox = SkeletalDistance.computeBoundingBox(pts);
    const boxW = bbox.xmax - bbox.xmin;
    const boxH = bbox.ymax - bbox.ymin;

    // Feature 6: Scratch-out detection (rapid horizontal or vertical reversals)
    if (pts.length >= 6) {
      let xReversals = 0;
      let prevDx = 0;
      let yReversals = 0;
      let prevDy = 0;
      for (let i = 1; i < pts.length; i++) {
        const dx = pts[i].x - pts[i - 1].x;
        if (Math.abs(dx) > 4) {
          if (prevDx !== 0 && (dx > 0) !== (prevDx > 0)) {
            xReversals++;
          }
          prevDx = dx;
        }
        const dy = pts[i].y - pts[i - 1].y;
        if (Math.abs(dy) > 4) {
          if (prevDy !== 0 && (dy > 0) !== (prevDy > 0)) {
            yReversals++;
          }
          prevDy = dy;
        }
      }
      const minScratchLen = Math.max(45 * zoomFactor, scaleHint * 1.0);
      const minScratchDim = Math.max(20 * zoomFactor, scaleHint * 0.4);
      if (
        (xReversals >= 3 || yReversals >= 3) &&
        totalLength >= minScratchLen &&
        (boxW >= minScratchDim || boxH >= minScratchDim)
      ) {
        return { type: "SCRATCH_OUT" };
      }
    }

    // Check if closed single-stroke box / container (diagram containers are spacious >= 2.2x handwriting scale)
    const isClosed = directDist / (totalLength + 1e-4) < 0.28;
    const minBoxW = Math.max(90 * zoomFactor, Math.min(260 * zoomFactor, scaleHint * 2.2));
    const minBoxH = Math.max(60 * zoomFactor, Math.min(200 * zoomFactor, scaleHint * 1.6));
    const minBoxPerimeter = Math.max(260 * zoomFactor, scaleHint * 4.5);
    if (isClosed && boxW >= minBoxW && boxH >= minBoxH && totalLength >= minBoxPerimeter) {
      return { type: "BOX" };
    }

    // Check if small arrowhead hook (open V shape, small length with sharp bend)
    const maxArrowTipLen = Math.max(110 * zoomFactor, scaleHint * 1.8);
    if (!isClosed && directDist / (totalLength + 1e-4) >= 0.35 && totalLength < maxArrowTipLen && pts.length >= 3 && pts.length <= 40) {
      let minDot = 1.0;
      let apexFound = false;
      const step = Math.max(1, Math.floor(pts.length / 8));
      for (let i = step; i < pts.length - step; i++) {
        const v1x = pts[i].x - pts[0].x;
        const v1y = pts[i].y - pts[0].y;
        const v2x = pts[pts.length - 1].x - pts[i].x;
        const v2y = pts[pts.length - 1].y - pts[i].y;
        const len1 = Math.hypot(v1x, v1y);
        const len2 = Math.hypot(v2x, v2y);
        if (len1 > 3 && len2 > 3) {
          const dot = (v1x * v2x + v1y * v2y) / (len1 * len2);
          if (dot < minDot) {
            minDot = dot;
          }
          if (dot < 0.65) {
            apexFound = true;
          }
        }
      }
      if (apexFound && minDot < 0.65) {
        return { type: "ARROW_HEAD" };
      }
    }

    // Single-stroke arrow: stroke with long body and sharp acute hook/barb at the end
    // Must be diagram-scale (connecting across canvas), NEVER letter-scale (h, y, t)
    const minArrowTotalLen = Math.max(110 * zoomFactor, scaleHint * 2.5);
    const minArrowDirectDist = Math.max(75 * zoomFactor, scaleHint * 1.8);
    const minArrowShaftLen = Math.max(65 * zoomFactor, scaleHint * 1.6);

    if (totalLength >= minArrowTotalLen && directDist >= minArrowDirectDist && pts.length >= 6) {
      const pStart = pts[0];
      const pEnd = pts[pts.length - 1];
      const splitIdx = Math.floor(pts.length * 0.8);
      const pTurn = pts[splitIdx];
      const shaftDx = pTurn.x - pStart.x;
      const shaftDy = pTurn.y - pStart.y;
      const hookDx = pEnd.x - pTurn.x;
      const hookDy = pEnd.y - pTurn.y;
      const shaftLen = Math.hypot(shaftDx, shaftDy);
      const hookLen = Math.hypot(hookDx, hookDy);
      if (
        shaftLen >= minArrowShaftLen &&
        hookLen >= 10 &&
        hookLen <= Math.max(55 * zoomFactor, scaleHint * 1.2)
      ) {
        const dot = (shaftDx * hookDx + shaftDy * hookDy) / (shaftLen * hookLen);
        if (dot < -0.2) {
          return {
            type: "LINE",
            geometryType: "STRAIGHT",
            isArrowShape: true,
            isCurved: false,
          };
        }
      }
    }

    // Straight line (distinguishes diagram lines from letter stems like 'H', 'T', 'I', 'P')
    const linearity = directDist / (totalLength + 1e-4);
    const minLineLen = Math.max(55 * zoomFactor, Math.min(160 * zoomFactor, scaleHint * 1.5));
    if (linearity >= 0.82 && totalLength >= minLineLen) {
      return { type: "LINE", geometryType: "STRAIGHT", isCurved: false };
    }

    // Feature 2: Curved Bézier or Orthogonal Elbow Connector
    // A diagram connector arc has at most 1 inflection/reversal in y, whereas cursive letters oscillate (yReversals >= 2)
    let yReversals = 0;
    let prevDy = 0;
    for (let i = 1; i < pts.length; i++) {
      const dy = pts[i].y - pts[i - 1].y;
      if (Math.abs(dy) > 6) {
        if (prevDy !== 0 && (dy > 0) !== (prevDy > 0)) {
          yReversals++;
        }
        prevDy = dy;
      }
    }

    // Diagram curved connectors connect nodes across canvas (not tiny letter curves like h-arch or y-tail)
    const minCurvedLen = Math.max(75 * zoomFactor, Math.min(180 * zoomFactor, scaleHint * 1.8));
    const minCurvedDirectDist = Math.max(55 * zoomFactor, scaleHint * 1.3);
    if (
      linearity >= 0.35 &&
      totalLength >= minCurvedLen &&
      directDist >= minCurvedDirectDist &&
      !isClosed &&
      yReversals <= 1
    ) {
      const isElbow = this.detectElbowShape(pts);
      return {
        type: "LINE",
        geometryType: isElbow ? "ELBOW" : "CURVED",
        isCurved: true,
      };
    }

    // Default text vs icon
    const maxTextLen = Math.max(240, scaleHint * 4.5);
    const maxTextW = Math.max(140, scaleHint * 2.6);
    const maxTextH = Math.max(80, scaleHint * 1.9);
    if (totalLength < maxTextLen && boxW < maxTextW && boxH < maxTextH) {
      return { type: "TEXT" };
    }

    return { type: "ICON" };
  }

  /**
   * Identifies candidate short strokes for T-bar cap (10px - 55px, straight)
   */
  public isCandidateTBarStroke(stroke: RawInkStroke): boolean {
    const pts = stroke.points;
    if (pts.length < 2) return false;
    let totalLength = 0;
    for (let i = 1; i < pts.length; i++) {
      totalLength += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    }
    const directDist = Math.hypot(pts[pts.length - 1].x - pts[0].x, pts[pts.length - 1].y - pts[0].y);
    return totalLength >= 10 && totalLength <= 55 && directDist / (totalLength + 1e-4) >= 0.8;
  }

  /**
   * Detects if an open stroke has ~90 degree elbow bend(s)
   */
  public detectElbowShape(pts: RawInkPoint[]): boolean {
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
  public isPerpendicularCap(shaft: RawInkStroke, cap: RawInkStroke): boolean {
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
    if (cosTheta > 0.5) return false;

    // In a true T-bar cap (⊥), the shaft endpoint must meet near the midpoint of the cap
    const pEnd = sPts[sLen - 1];
    const capMid = {
      x: (cPts[0].x + cPts[cLen - 1].x) / 2,
      y: (cPts[0].y + cPts[cLen - 1].y) / 2,
    };
    const distToMid = Math.hypot(pEnd.x - capMid.x, pEnd.y - capMid.y);
    const capLen = Math.hypot(cPts[cLen - 1].x - cPts[0].x, cPts[cLen - 1].y - cPts[0].y);
    return distToMid <= Math.min(15, capLen * 0.45);
  }
}
