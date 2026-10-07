import {
  RawInkStroke,
  VisualASTConnector,
} from "../../types/cognitive";
import { SkeletalDistance } from "../clustering/SkeletalDistance";
import { EntityClusterer, ClassifiedStrokeItem } from "../clustering/EntityClusterer";
import { StrokeClassifier } from "../classification/StrokeClassifier";
import { InfluenceSignDetector } from "./InfluenceSignDetector";

export interface ShaftInfo {
  item: ClassifiedStrokeItem;
  headAtEnd: boolean;
  headAtStart: boolean;
  tBarAtEnd: boolean;
  attachedStrokeIds: string[];
}

export class ConnectorEngine {
  /**
   * Processes Level 3 composite arrows, curved connectors, inhibition caps, and influence signs.
   */
  public static processConnectors(
    classifiedStrokes: ClassifiedStrokeItem[],
    multiStrokeBoxStrokeIds: Set<string>,
    passiveContextMap: Record<string, string>,
    scaleHint: number,
    zoomFactor: number,
    strokeClassifier: StrokeClassifier
  ): {
    connectors: VisualASTConnector[];
    usedConnectorStrokes: Set<string>;
  } {
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

    const shaftInfos: ShaftInfo[] = lineStrokes.map((ls) => ({
      item: ls,
      headAtEnd: false,
      headAtStart: false,
      tBarAtEnd: false,
      attachedStrokeIds: [ls.stroke.id],
    }));

    // Step 3A: Assign each arrowhead to its closest shaft extremity
    for (const tip of arrowHeadStrokesList) {
      const tipCenter = SkeletalDistance.computeCenter(tip.stroke.points);
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

      // An inhibition connector shaft connects concepts across the canvas (length >= 80px).
      let shaftLen = 0;
      for (let k = 1; k < shaftPts.length; k++) {
        shaftLen += Math.hypot(shaftPts[k].x - shaftPts[k - 1].x, shaftPts[k].y - shaftPts[k - 1].y);
      }
      if (shaftLen < 80) {
        continue;
      }

      for (const candidate of classifiedStrokes) {
        if (
          candidate.stroke.id === shaft.item.stroke.id ||
          usedConnectorStrokes.has(candidate.stroke.id)
        ) {
          continue;
        }

        const capCenter = SkeletalDistance.computeCenter(candidate.stroke.points);
        const distToEnd = Math.hypot(capCenter.x - pEnd.x, capCenter.y - pEnd.y);

        if (
          distToEnd <= 40 &&
          strokeClassifier.isCandidateTBarStroke(candidate.stroke) &&
          strokeClassifier.isPerpendicularCap(shaft.item.stroke, candidate.stroke)
        ) {
          const touchesOtherShaftDirectly = shaftInfos.some((other) => {
            if (other.item.stroke.id === shaft.item.stroke.id) return false;
            const otherStart = other.item.stroke.points[0];
            const otherEnd = other.item.stroke.points[other.item.stroke.points.length - 1];
            const d1 = SkeletalDistance.distancePointToBBox(otherStart, candidate.bbox);
            const d2 = SkeletalDistance.distancePointToBBox(otherEnd, candidate.bbox);
            return Math.min(d1, d2) <= 12;
          });

          if (touchesOtherShaftDirectly) {
            continue;
          }

          shaft.tBarAtEnd = true;
          shaft.attachedStrokeIds.push(candidate.stroke.id);
          usedConnectorStrokes.add(candidate.stroke.id);
          break;
        }
      }
    }

    // Step 3C: Build connector objects & guard letter strokes
    for (const shaft of shaftInfos) {
      let connType: "ARROW" | "LINE" | "INHIBITION" = "LINE";
      let directionality: "FORWARD" | "BIDIRECTIONAL" | "NONE" = "NONE";

      let shaftLen = 0;
      const pts = shaft.item.stroke.points;
      for (let i = 1; i < pts.length; i++) {
        shaftLen += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      }
      const maxLetterStrokeLen = Math.max(180 * zoomFactor, scaleHint * 3.0);

      // Context Check: Is this stroke part of a word?
      // A stroke that sits adjacent to text strokes is a letter (like 'h', 'y', 't', 'P', 'D', 'N'),
      // NOT a diagram connector, even if it has an inflection/hook!
      const hasTextNeighbor = EntityClusterer.hasTextNeighbor(
        shaft.item,
        classifiedStrokes,
        scaleHint,
        zoomFactor
      );

      if (hasTextNeighbor && !shaft.tBarAtEnd && !shaft.headAtEnd && !shaft.headAtStart && shaftLen <= maxLetterStrokeLen) {
        shaft.item.classification.type = "TEXT";
        continue;
      }

      if (shaft.tBarAtEnd) {
        connType = "INHIBITION";
        directionality = "FORWARD";
      } else if (shaft.headAtStart && shaft.headAtEnd) {
        connType = "ARROW";
        directionality = "BIDIRECTIONAL";
      } else if (shaft.headAtEnd || shaft.headAtStart || shaft.item.classification.isArrowShape) {
        connType = "ARROW";
        directionality = "FORWARD";
      }

      // Influence Sign Detection: Look for '+' or '-' strokes adjacent to the connector
      let polarity: "POSITIVE" | "NEGATIVE" | "UNKNOWN" = "UNKNOWN";
      if (connType === "INHIBITION") {
        polarity = "NEGATIVE";
      } else {
        const signInfo = InfluenceSignDetector.detectInfluenceSignNearShaft(
          shaft.item.stroke,
          classifiedStrokes,
          usedConnectorStrokes,
          passiveContextMap,
          scaleHint
        );
        if (signInfo) {
          polarity = signInfo.polarity;
          signInfo.strokeIds.forEach((id) => {
            usedConnectorStrokes.add(id);
            shaft.attachedStrokeIds.push(id);
          });
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
        polarity,
      });
    }

    return { connectors, usedConnectorStrokes };
  }
}
