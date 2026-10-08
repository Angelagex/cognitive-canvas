import { RawInkStroke } from "../../types/cognitive";
import { SkeletalDistance } from "../clustering/SkeletalDistance";

export class ScaleEstimator {
  /**
   * Estimates the intrinsic handwriting scale H-tilde (in coordinate space)
   * using the median stroke dimension across all candidate strokes.
   * This provides full mathematical zoom/scale invariance (MyScript approach).
   */
  public static estimateHandwritingScale(strokes: RawInkStroke[], zoomFactor: number = 1.0): number {
    if (strokes.length === 0) return 35 * zoomFactor;

    const textCandidateDimensions: number[] = [];
    for (const s of strokes) {
      if (!s.points || s.points.length < 2) continue;
      const pts = s.points;
      const bbox = SkeletalDistance.computeBoundingBox(pts);
      const w = bbox.xmax - bbox.xmin;
      const h = bbox.ymax - bbox.ymin;
      const maxDim = Math.max(w, h);
      if (maxDim < 4 * zoomFactor || maxDim > 3000 * zoomFactor) continue;

      let totalLength = 0;
      for (let i = 1; i < pts.length; i++) {
        totalLength += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      }

      const start = pts[0];
      const end = pts[pts.length - 1];
      const directDist = Math.hypot(end.x - start.x, end.y - start.y);
      const linearity = directDist / (totalLength + 1e-4);
      const isClosed = directDist / (totalLength + 1e-4) < 0.28;

      // Filter out obvious diagram structures from handwriting scale estimation:
      const isLongLine =
        (linearity >= 0.65 || totalLength >= 80 * zoomFactor) &&
        totalLength >= 60 * zoomFactor &&
        (w >= 50 * zoomFactor || h >= 50 * zoomFactor);
      const isLargeContainer =
        isClosed &&
        totalLength >= 260 * zoomFactor &&
        w >= 80 * zoomFactor &&
        h >= 60 * zoomFactor;

      if (!isLongLine && !isLargeContainer) {
        textCandidateDimensions.push(maxDim);
      }
    }

    if (textCandidateDimensions.length === 0) return 35 * zoomFactor;
    textCandidateDimensions.sort((a, b) => a - b);
    const targetIdx = Math.floor(textCandidateDimensions.length * 0.4);
    const scale = textCandidateDimensions[targetIdx];

    return Math.max(16 * zoomFactor, Math.min(350 * zoomFactor, scale));
  }
}
