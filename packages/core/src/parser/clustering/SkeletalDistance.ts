import { RawInkPoint, RawInkStroke, VisualBoundingBoxRect } from "../../types/cognitive";

export class SkeletalDistance {
  public static computeBoundingBox(points: RawInkPoint[]): VisualBoundingBoxRect {
    if (!points || points.length === 0) {
      return { ymin: 0, xmin: 0, ymax: 0, xmax: 0 };
    }
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

  public static computeCenter(points: RawInkPoint[]): { x: number; y: number } {
    if (!points || points.length === 0) return { x: 0, y: 0 };
    let sumX = 0;
    let sumY = 0;
    for (const p of points) {
      sumX += p.x;
      sumY += p.y;
    }
    return { x: sumX / points.length, y: sumY / points.length };
  }

  public static mergeBBoxes(a: VisualBoundingBoxRect, b: VisualBoundingBoxRect): VisualBoundingBoxRect {
    return {
      xmin: Math.min(a.xmin, b.xmin),
      ymin: Math.min(a.ymin, b.ymin),
      xmax: Math.max(a.xmax, b.xmax),
      ymax: Math.max(a.ymax, b.ymax),
    };
  }

  public static distancePointToSegment(
    p: { x: number; y: number },
    a: RawInkPoint,
    b: RawInkPoint
  ): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l2 = dx * dx + dy * dy;
    if (l2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
    const projX = a.x + t * dx;
    const projY = a.y + t * dy;
    return Math.hypot(p.x - projX, p.y - projY);
  }

  public static distancePointToBBox(p: { x: number; y: number }, b: VisualBoundingBoxRect): number {
    const dx = Math.max(0, Math.max(b.xmin - p.x, p.x - b.xmax));
    const dy = Math.max(0, Math.max(b.ymin - p.y, p.y - b.ymax));
    return Math.hypot(dx, dy);
  }

  /**
   * Computes the minimum Euclidean distance from a point to any segment of a stroke.
   */
  public static distancePointToStroke(p: { x: number; y: number }, stroke: RawInkStroke): number {
    const pts = stroke.points;
    if (!pts || pts.length === 0) return Infinity;
    if (pts.length === 1) return Math.hypot(p.x - pts[0].x, p.y - pts[0].y);
    let minDist = Infinity;
    for (let i = 0; i < pts.length - 1; i++) {
      const d = this.distancePointToSegment(p, pts[i], pts[i + 1]);
      if (d < minDist) {
        minDist = d;
      }
    }
    return minDist;
  }

  /**
   * Computes the minimum skeletal Euclidean distance between two ink strokes
   * by sampling points and evaluating point-to-segment distances.
   */
  public static minDistanceBetweenStrokes(
    strokeA: RawInkStroke,
    strokeB: RawInkStroke,
    zoomFactor: number = 1.0
  ): number {
    const ptsA = strokeA.points;
    const ptsB = strokeB.points;
    if (!ptsA || !ptsB || ptsA.length === 0 || ptsB.length === 0) return Infinity;

    const bboxA = this.computeBoundingBox(ptsA);
    const bboxB = this.computeBoundingBox(ptsB);
    const dx = Math.max(0, Math.max(bboxA.xmin - bboxB.xmax, bboxB.xmin - bboxA.xmax));
    const dy = Math.max(0, Math.max(bboxA.ymin - bboxB.ymax, bboxB.ymin - bboxA.ymax));
    const boxDist = Math.hypot(dx, dy);

    // Fast reject if bounding boxes are separated by more than 90px * zoomFactor
    if (boxDist > 90 * zoomFactor) return boxDist;

    let minDist = Infinity;
    const stepA = Math.max(1, Math.floor(ptsA.length / 12));
    const stepB = Math.max(1, Math.floor(ptsB.length / 12));

    // Sample points from A against segments of B
    for (let i = 0; i < ptsA.length; i += stepA) {
      const p = ptsA[i];
      for (let j = 0; j < ptsB.length - 1; j += stepB) {
        const nextJ = Math.min(ptsB.length - 1, j + stepB);
        const d = this.distancePointToSegment(p, ptsB[j], ptsB[nextJ]);
        if (d < minDist) {
          minDist = d;
          if (minDist <= 2 * zoomFactor) return minDist; // Direct physical touch
        }
      }
    }

    // Sample points from B against segments of A
    for (let j = 0; j < ptsB.length; j += stepB) {
      const p = ptsB[j];
      for (let i = 0; i < ptsA.length - 1; i += stepA) {
        const nextI = Math.min(ptsA.length - 1, i + stepA);
        const d = this.distancePointToSegment(p, ptsA[i], ptsA[nextI]);
        if (d < minDist) {
          minDist = d;
          if (minDist <= 2 * zoomFactor) return minDist;
        }
      }
    }

    return minDist;
  }
}
