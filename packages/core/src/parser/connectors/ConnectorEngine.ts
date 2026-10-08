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

    const maxTipAttachDist = Math.max(55 * zoomFactor, scaleHint * 1.5);

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

        // Guard: If both endpoints of the candidate tip stroke touch the shaft spine directly (<= 5px)
        // and are separated along the shaft by > 25px, it is a closed loop or arch around the stem
        // (letter P loop, D belly, B loop), NOT an arrowhead!
        const pFirst = tip.stroke.points[0];
        const pLast = tip.stroke.points[tip.stroke.points.length - 1];
        const dFirst = SkeletalDistance.distancePointToStroke(pFirst, shaft.item.stroke);
        const dLast = SkeletalDistance.distancePointToStroke(pLast, shaft.item.stroke);
        if (dFirst <= 5 * zoomFactor && dLast <= 5 * zoomFactor) {
          const sDx = pEnd.x - pStart.x;
          const sDy = pEnd.y - pStart.y;
          const sLen2 = sDx * sDx + sDy * sDy;
          if (sLen2 > 0) {
            const tFirst = ((pFirst.x - pStart.x) * sDx + (pFirst.y - pStart.y) * sDy) / sLen2;
            const tLast = ((pLast.x - pStart.x) * sDx + (pLast.y - pStart.y) * sDy) / sLen2;
            const sepAlongShaft = Math.abs(tFirst - tLast) * Math.sqrt(sLen2);
            if (sepAlongShaft > 25 * zoomFactor) {
              continue;
            }
          }
        }

        // If candidate tip and shaft are BOTH contained inside the same word cluster,
        // they are letters of that word (e.g. P loop on stem, h arch on stem), NOT an arrow connector!
        if (
          ConnectorEngine.isStrokeContainedInWordCluster(tip, classifiedStrokes, scaleHint, zoomFactor) &&
          ConnectorEngine.isStrokeContainedInWordCluster(shaft.item, classifiedStrokes, scaleHint, zoomFactor)
        ) {
          continue;
        }

        let dEnd = Math.hypot(tipCenter.x - pEnd.x, tipCenter.y - pEnd.y);
        let dStart = Math.hypot(tipCenter.x - pStart.x, tipCenter.y - pStart.y);

        for (const tp of tip.stroke.points) {
          const de = Math.hypot(tp.x - pEnd.x, tp.y - pEnd.y);
          if (de < dEnd) dEnd = de;
          const ds = Math.hypot(tp.x - pStart.x, tp.y - pStart.y);
          if (ds < dStart) dStart = ds;
        }

        if (dEnd < bestDist && dEnd <= maxTipAttachDist) {
          bestDist = dEnd;
          bestShaft = shaft;
          isEnd = true;
        }
        if (dStart < bestDist && dStart <= maxTipAttachDist) {
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

    // Step 3B: For shafts without an arrowhead, check for candidate short barb strokes
    // (e.g. arrows drawn with separate wings or a backwards barb across the canvas)
    for (const shaft of shaftInfos) {
      if (shaft.headAtEnd || shaft.item.classification.isArrowShape) continue;

      // Arrows with separate barbs connect concepts across the canvas, not letter stems inside words
      if (ConnectorEngine.isStrokeContainedInWordCluster(shaft.item, classifiedStrokes, scaleHint, zoomFactor)) {
        continue;
      }

      const shaftPts = shaft.item.stroke.points;
      const sLen = shaftPts.length;
      if (sLen < 2) continue;
      const pStart = shaftPts[0];
      const pEnd = shaftPts[sLen - 1];
      const shaftVec = { x: pEnd.x - pStart.x, y: pEnd.y - pStart.y };
      const shaftMag = Math.hypot(shaftVec.x, shaftVec.y);
      if (shaftMag < Math.max(55 * zoomFactor, scaleHint * 1.6)) continue;

      for (const candidate of classifiedStrokes) {
        if (candidate.stroke.id === shaft.item.stroke.id || usedConnectorStrokes.has(candidate.stroke.id)) {
          continue;
        }

        const excludeForCandidate = new Set([shaft.item.stroke.id, ...shaft.attachedStrokeIds]);
        for (const s of classifiedStrokes) {
          const sPts = s.stroke.points;
          if (sPts && sPts.length > 0) {
            const d1 = Math.hypot(sPts[0].x - pEnd.x, sPts[0].y - pEnd.y);
            const d2 = Math.hypot(sPts[sPts.length - 1].x - pEnd.x, sPts[sPts.length - 1].y - pEnd.y);
            if (Math.min(d1, d2) <= 35 * zoomFactor) {
              excludeForCandidate.add(s.stroke.id);
            }
          }
        }
        if (
          ConnectorEngine.isStrokeContainedInWordCluster(
            candidate,
            classifiedStrokes,
            scaleHint,
            zoomFactor,
            excludeForCandidate
          )
        ) {
          continue;
        }

        const cPts = candidate.stroke.points;
        if (!cPts || cPts.length < 2) continue;

        let barbLen = 0;
        for (let i = 1; i < cPts.length; i++) {
          barbLen += Math.hypot(cPts[i].x - cPts[i - 1].x, cPts[i].y - cPts[i - 1].y);
        }
        if (barbLen < 8 * zoomFactor || barbLen > Math.max(65 * zoomFactor, shaftMag * 0.55)) {
          continue;
        }

        const cStart = cPts[0];
        const cEnd = cPts[cPts.length - 1];
        const dStartToEnd = Math.hypot(cStart.x - pEnd.x, cStart.y - pEnd.y);
        const dEndToEnd = Math.hypot(cEnd.x - pEnd.x, cEnd.y - pEnd.y);
        const attachDist = Math.min(dStartToEnd, dEndToEnd);

        if (attachDist <= 28 * zoomFactor) {
          const barbVec = dStartToEnd <= dEndToEnd
            ? { x: cEnd.x - cStart.x, y: cEnd.y - cStart.y }
            : { x: cStart.x - cEnd.x, y: cStart.y - cEnd.y };
          const barbMag = Math.hypot(barbVec.x, barbVec.y);
          if (barbMag > 0) {
            const dot = (shaftVec.x * barbVec.x + shaftVec.y * barbVec.y) / (shaftMag * barbMag);
            if (dot < -0.45) {
              shaft.headAtEnd = true;
              shaft.attachedStrokeIds.push(candidate.stroke.id);
              usedConnectorStrokes.add(candidate.stroke.id);
              // Do not break: allow attaching both wings of a dual-barb arrow
            }
          }
        }
      }
    }

    // Step 3C: For shafts without an arrowhead at end, check for a perpendicular T-bar cap (Inhibition)
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

    // Step 3D: Build connector objects & guard letter strokes
    for (const shaft of shaftInfos) {
      let connType: "ARROW" | "LINE" | "INHIBITION" = "LINE";
      let directionality: "FORWARD" | "BIDIRECTIONAL" | "NONE" = "NONE";

      let shaftLen = 0;
      const pts = shaft.item.stroke.points;
      for (let i = 1; i < pts.length; i++) {
        shaftLen += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      }
      const maxLetterStrokeLen = Math.max(90 * zoomFactor, scaleHint * 2.2);

      // Golden Rule 1: If this stroke is contained inside a word cluster,
      // it is ALWAYS a handwriting stroke (e.g. 'P', 'h', 'g', 'y', 't', 'd'),
      // NEVER a diagram connector!
      const isWordStroke = ConnectorEngine.isStrokeContainedInWordCluster(
        shaft.item,
        classifiedStrokes,
        scaleHint,
        zoomFactor
      );

      if (isWordStroke) {
        shaft.item.classification.type = "TEXT";
        // Free any incidental strokes that were attached to this letter
        for (const attId of shaft.attachedStrokeIds) {
          if (attId !== shaft.item.stroke.id) {
            usedConnectorStrokes.delete(attId);
            const attItem = classifiedStrokes.find((s) => s.stroke.id === attId);
            if (attItem) {
              attItem.classification.type = "TEXT";
            }
          }
        }
        continue;
      }

      // Context Check: Is this stroke part of a word?
      const hasTextNeighbor = EntityClusterer.hasTextNeighbor(
        shaft.item,
        classifiedStrokes,
        scaleHint,
        zoomFactor
      );

      const isPlainLine =
        !shaft.headAtEnd &&
        !shaft.headAtStart &&
        !shaft.item.classification.isArrowShape &&
        !shaft.tBarAtEnd;

      // Golden Rule 2: An undecorated line that has text neighbors
      // AND has letter-scale length is ALWAYS a handwriting stroke.
      if (isPlainLine && hasTextNeighbor && shaftLen <= maxLetterStrokeLen) {
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

  /**
   * Determines if a candidate stroke is spatially contained inside a word cluster.
   * A stroke is contained in a word if:
   * 1. It has neighboring text strokes on the baseline (hasTextNeighbor).
   * 2. Its dimensions fit handwriting scale (width, height, and length).
   * 3. BOTH endpoints (start and end) are within letter-scale distance of neighboring text strokes
   *    in the same entity, meaning neither extremity reaches out into open canvas or towards another entity.
   */
  public static isStrokeContainedInWordCluster(
    target: ClassifiedStrokeItem,
    allStrokes: ClassifiedStrokeItem[],
    scaleHint: number,
    zoomFactor: number,
    excludeStrokeIds: Set<string> = new Set()
  ): boolean {
    if (!EntityClusterer.isLetterShape(target.stroke, scaleHint, zoomFactor)) {
      return false;
    }

    const candidateNeighbors = allStrokes.filter((s) => !excludeStrokeIds.has(s.stroke.id));
    const hasNeighbor = EntityClusterer.hasTextNeighbor(target, candidateNeighbors, scaleHint, zoomFactor);
    if (!hasNeighbor) return false;

    const pts = target.stroke.points;
    if (!pts || pts.length < 2) return true;

    const pStart = pts[0];
    const pEnd = pts[pts.length - 1];

    const maxLocalDist = Math.max(70 * zoomFactor, scaleHint * 1.8);

    let nearestStartStroke: ClassifiedStrokeItem | null = null;
    let dStartMin = Infinity;
    let nearestEndStroke: ClassifiedStrokeItem | null = null;
    let dEndMin = Infinity;
    let minSkeletalDist = Infinity;

    for (const other of candidateNeighbors) {
      if (other.stroke.id === target.stroke.id) continue;
      if (other.classification.type === "SCRATCH_OUT") continue;
      if (other.classification.type === "ARROW_HEAD") continue;

      if (other.classification.type === "BOX" || other.classification.type === "LINE") {
        if (!EntityClusterer.isLetterShape(other.stroke, scaleHint, zoomFactor)) {
          continue;
        }
      }

      // Fast Bounding Box Pre-Filter: skip distant strokes across the canvas
      const dBoxStart = SkeletalDistance.distancePointToBBox(pStart, other.bbox);
      const dBoxEnd = SkeletalDistance.distancePointToBBox(pEnd, other.bbox);
      if (dBoxStart > maxLocalDist * 1.5 && dBoxEnd > maxLocalDist * 1.5) {
        continue;
      }

      const dS = SkeletalDistance.distancePointToStroke(pStart, other.stroke);
      if (dS < dStartMin) {
        dStartMin = dS;
        nearestStartStroke = other;
      }

      const dE = SkeletalDistance.distancePointToStroke(pEnd, other.stroke);
      if (dE < dEndMin) {
        dEndMin = dE;
        nearestEndStroke = other;
      }

      const skDist = SkeletalDistance.minDistanceBetweenStrokes(target.stroke, other.stroke, zoomFactor);
      if (skDist < minSkeletalDist) {
        minSkeletalDist = skDist;
      }
    }

    // A letter inside a word has either:
    // 1. Both extremities within letter distance of neighbor text strokes, OR
    // 2. An ascender/descender where one extremity touches the baseline and the body is adjacent to the word
    const isBothEndsLocal = dStartMin <= maxLocalDist && dEndMin <= maxLocalDist;
    const isAscenderDescender =
      (dStartMin <= maxLocalDist || dEndMin <= maxLocalDist) &&
      minSkeletalDist <= Math.max(25 * zoomFactor, scaleHint * 0.75);

    if (!isBothEndsLocal && !isAscenderDescender) {
      return false;
    }

    // The text strokes near start and end must belong to the same word entity (or be the same stroke)
    if (nearestStartStroke && nearestEndStroke && nearestStartStroke.stroke.id !== nearestEndStroke.stroke.id) {
      const inSameEntity = EntityClusterer.areStrokesInSameEntity(
        nearestStartStroke,
        nearestEndStroke,
        scaleHint,
        zoomFactor
      );
      if (!inSameEntity && isBothEndsLocal) {
        return false;
      }
    }

    return true;
  }
}
