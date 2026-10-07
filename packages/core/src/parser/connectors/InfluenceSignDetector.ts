import { RawInkStroke } from "../../types/cognitive";
import { SkeletalDistance } from "../clustering/SkeletalDistance";
import { ClassifiedStrokeItem } from "../clustering/EntityClusterer";

export class InfluenceSignDetector {
  /**
   * Detects handwritten influence signs (+ or -) adjacent to a connector shaft
   */
  public static detectInfluenceSignNearShaft(
    shaftStroke: RawInkStroke,
    classifiedStrokes: ClassifiedStrokeItem[],
    usedConnectorStrokes: Set<string>,
    passiveContextMap: Record<string, string> = {},
    scaleHint: number = 35
  ): { polarity: "POSITIVE" | "NEGATIVE"; strokeIds: string[] } | null {
    const shaftPts = shaftStroke.points;
    if (!shaftPts || shaftPts.length < 2) return null;

    const pStart = shaftPts[0];
    const pEnd = shaftPts[shaftPts.length - 1];

    // Candidate strokes must be close to the shaft body but not attached to entity docking extremities
    const candidates = classifiedStrokes.filter((cs) => {
      if (cs.stroke.id === shaftStroke.id) return false;
      if (usedConnectorStrokes.has(cs.stroke.id)) return false;
      if (cs.classification.type === "BOX" || cs.classification.type === "SCRATCH_OUT") return false;

      // If explicitly labeled word (e.g. "inhibe"), ignore
      if (passiveContextMap[cs.stroke.id]) {
        const val = passiveContextMap[cs.stroke.id].trim();
        if (val !== "+" && val !== "-" && val !== "s" && val !== "o") {
          return false;
        }
      }

      const center = SkeletalDistance.computeCenter(cs.stroke.points);

      // Must NOT be an entity node sitting at shaft extremities (source or target docking terminals)
      const distToStart = Math.hypot(center.x - pStart.x, center.y - pStart.y);
      const distToEnd = Math.hypot(center.x - pEnd.x, center.y - pEnd.y);
      if (distToStart <= 35 || distToEnd <= 35) {
        return false;
      }

      // Must be near the shaft body (distance to segment <= max(45, scaleHint * 1.2))
      let minDistToShaft = Infinity;
      for (let i = 0; i < shaftPts.length - 1; i++) {
        const d = SkeletalDistance.distancePointToSegment(center, shaftPts[i], shaftPts[i + 1]);
        if (d < minDistToShaft) minDistToShaft = d;
      }
      if (minDistToShaft > Math.max(45, scaleHint * 1.2)) {
        return false;
      }

      // Must be small (length between 8px and max(55, scaleHint * 1.3))
      const pts = cs.stroke.points;
      if (pts.length < 2) return false;
      let len = 0;
      for (let i = 1; i < pts.length; i++) {
        len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      }
      if (len < 8 || len > Math.max(55, scaleHint * 1.3)) {
        return false;
      }

      return true;
    });

    // 1. First Pass: Check if any pair forms a '+' sign
    for (let i = 0; i < candidates.length; i++) {
      const c1 = candidates[i];
      const pts1 = c1.stroke.points;
      const bbox1 = c1.bbox;
      const w1 = bbox1.xmax - bbox1.xmin;
      const h1 = bbox1.ymax - bbox1.ymin;
      const center1 = SkeletalDistance.computeCenter(pts1);

      for (let j = i + 1; j < candidates.length; j++) {
        const c2 = candidates[j];
        const bbox2 = c2.bbox;
        const w2 = bbox2.xmax - bbox2.xmin;
        const h2 = bbox2.ymax - bbox2.ymin;
        const center2 = SkeletalDistance.computeCenter(c2.stroke.points);

        const distBetweenCenters = Math.hypot(center1.x - center2.x, center1.y - center2.y);
        if (distBetweenCenters <= 18) {
          const isHoriz1 = w1 > h1;
          const isVert2 = h2 > w2;
          const isVert1 = h1 > w1;
          const isHoriz2 = w2 > h2;

          if ((isHoriz1 && isVert2) || (isVert1 && isHoriz2)) {
            return {
              polarity: "POSITIVE",
              strokeIds: [c1.stroke.id, c2.stroke.id],
            };
          }
        }
      }
    }

    // 2. Second Pass: Check if any candidate is a standalone horizontal '-' sign
    for (const c of candidates) {
      const bbox = c.bbox;
      const w = bbox.xmax - bbox.xmin;
      const h = bbox.ymax - bbox.ymin;
      if (w >= 10 && h <= 14 && w >= h * 1.4) {
        return {
          polarity: "NEGATIVE",
          strokeIds: [c.stroke.id],
        };
      }
    }

    return null;
  }
}
