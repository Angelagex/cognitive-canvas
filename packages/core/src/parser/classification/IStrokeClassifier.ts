import { RawInkStroke, ConnectorGeometryType } from "../../types/cognitive";

export type StrokeClassificationType =
  | "LINE"
  | "ARROW_HEAD"
  | "BOX"
  | "TEXT"
  | "ICON"
  | "SCRATCH_OUT";

export interface StrokeClassificationResult {
  type: StrokeClassificationType;
  isArrowShape?: boolean;
  geometryType?: ConnectorGeometryType;
  isCurved?: boolean;
  confidence?: number;
}

/**
 * Pluggable Stroke Classifier Interface.
 * Allows Phase 1 heuristic classification and Phase 2 on-device neural attention models (Option B).
 */
export interface IStrokeClassifier {
  classify(
    stroke: RawInkStroke,
    scaleHint: number,
    zoomFactor: number
  ): StrokeClassificationResult;
}
