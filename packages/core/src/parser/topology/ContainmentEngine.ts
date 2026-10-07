import {
  RawInkPoint,
  RawInkStroke,
  VisualASTEntity,
  VisualBoundingBoxRect,
} from "../../types/cognitive";
import { SkeletalDistance } from "../clustering/SkeletalDistance";
import { ClassifiedStrokeItem } from "../clustering/EntityClusterer";

export interface MultiStrokeContainerGroup {
  strokeIds: string[];
  points: RawInkPoint[];
  bbox: VisualBoundingBoxRect;
}

export class ContainmentEngine {
  /**
   * Finds sets of 3 to 6 straight line strokes whose endpoints connect to form a closed polygon
   */
  public static detectMultiStrokeContainers(
    candidateLines: ClassifiedStrokeItem[],
    contentStrokes: ClassifiedStrokeItem[] = []
  ): MultiStrokeContainerGroup[] {
    if (candidateLines.length < 3) return [];

    const containers: MultiStrokeContainerGroup[] = [];
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
          unionBbox = SkeletalDistance.mergeBBoxes(unionBbox, loopLines[k].bbox);
        }

        const boxW = unionBbox.xmax - unionBbox.xmin;
        const boxH = unionBbox.ymax - unionBbox.ymin;

        if (boxW >= 50 && boxH >= 35) {
          let verticesNearExternalContent = 0;
          const loopVertices = loopLines.flatMap((l) => [l.start, l.end]);
          for (const vertex of loopVertices) {
            const hasNearbyExternal = contentStrokes.some((cs) => {
              const isInside =
                cs.bbox.xmin >= unionBbox.xmin &&
                cs.bbox.xmax <= unionBbox.xmax &&
                cs.bbox.ymin >= unionBbox.ymin &&
                cs.bbox.ymax <= unionBbox.ymax;
              if (isInside) return false;
              return SkeletalDistance.distancePointToBBox(vertex, cs.bbox) <= 75;
            });
            if (hasNearbyExternal) {
              verticesNearExternalContent++;
            }
          }

          if (verticesNearExternalContent >= 2) {
            continue;
          }

          if (path.length === 3) {
            const hasChildInside = contentStrokes.some((cs) => {
              return (
                cs.bbox.xmin >= unionBbox.xmin - 5 &&
                cs.bbox.xmax <= unionBbox.xmax + 5 &&
                cs.bbox.ymin >= unionBbox.ymin - 5 &&
                cs.bbox.ymax <= unionBbox.ymax + 5
              );
            });
            if (!hasChildInside) {
              continue;
            }
          }

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

  /**
   * Infers parent-child containment (Level 4) if an entity is inside a CONTAINER_BOX
   */
  public static inferContainment(entities: VisualASTEntity[]): void {
    const containerBoxes = entities.filter((e) => e.type === "CONTAINER_BOX");
    for (const box of containerBoxes) {
      box.child_ids = [];
      for (const candidate of entities) {
        if (candidate.id === box.id) continue;
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
  }
}
