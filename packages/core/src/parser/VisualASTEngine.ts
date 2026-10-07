import {
  RawInkStroke,
  VisualASTLayer,
  CognitiveMapDocument,
  CognitiveCompilerOutput,
} from "../types/cognitive";
import { SkeletalDistance } from "./clustering/SkeletalDistance";
import { ScaleEstimator } from "./classification/ScaleEstimator";
import { StrokeClassifier } from "./classification/StrokeClassifier";
import { IStrokeClassifier } from "./classification/IStrokeClassifier";
import { EntityClusterer, ClassifiedStrokeItem } from "./clustering/EntityClusterer";
import { ConnectorEngine } from "./connectors/ConnectorEngine";
import { ContainmentEngine } from "./topology/ContainmentEngine";
import { EntityDocker } from "./topology/EntityDocker";
import { CausalLoopDetector } from "./topology/CausalLoopDetector";

/**
 * 5-Level Visual AST Engine (ARCHITECTURE_SPEC.md - Section 5.1 & 5.2)
 *
 * Clean Orchestrator coordinating modularized parsing levels:
 * - Level 1: Stroke Classification (IStrokeClassifier / StrokeClassifier)
 * - Level 2: Adaptive Spatio-Temporal Clustering & Baseline Alignment (EntityClusterer)
 * - Level 3: Composite Connectors, Arrows, T-Bars & Polarity (ConnectorEngine)
 * - Level 4: Multi-Stroke Containers & Hierarchical Containment (ContainmentEngine)
 * - Level 5: Magnetic Docking, Label Binding, Context Windows & Causal Loops (EntityDocker & CausalLoopDetector)
 *
 * Prepared for Phase 2: Neural Attention Model / On-Device Classifier (Option B) via pluggable classifier.
 */
export class VisualASTEngine {
  private strokeClassifier: IStrokeClassifier;
  private defaultClassifier: StrokeClassifier;

  constructor(classifier?: IStrokeClassifier) {
    this.defaultClassifier = new StrokeClassifier();
    this.strokeClassifier = classifier || this.defaultClassifier;
  }

  /**
   * Allows injecting or swapping the stroke classifier (e.g. for Phase 2 On-Device Neural Model)
   */
  public setStrokeClassifier(classifier: IStrokeClassifier): void {
    this.strokeClassifier = classifier;
  }

  /**
   * Estimates the intrinsic handwriting scale H-tilde (in coordinate space).
   * Maintained for backwards compatibility.
   */
  public estimateHandwritingScale(strokes: RawInkStroke[], zoomFactor: number = 1.0): number {
    return ScaleEstimator.estimateHandwritingScale(strokes, zoomFactor);
  }

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
    passiveContextMap: Record<string, string> = {},
    canvasScale: number = 1.0
  ): VisualASTLayer {
    if (strokes.length === 0) {
      return {
        entities: [],
        connectors: [],
        causal_loops: [],
        topology_metrics: { root_entity_ids: [], sink_entity_ids: [], cross_link_count: 0 },
      };
    }

    const scale = canvasScale && canvasScale > 0 && isFinite(canvasScale) ? canvasScale : 1.0;
    const zoomFactor = 1.0 / scale;

    // STEP 0: ESTIMATE INTRINSIC HANDWRITING SCALE (H-tilde)
    const globalScale = ScaleEstimator.estimateHandwritingScale(strokes, zoomFactor);

    // LEVEL 1: STROKE CLASSIFICATION
    const classifiedStrokes: ClassifiedStrokeItem[] = strokes.map((strk) => ({
      stroke: strk,
      bbox: SkeletalDistance.computeBoundingBox(strk.points),
      classification: this.strokeClassifier.classify(strk, globalScale, zoomFactor),
    }));

    // Detect scratch-out strokes
    const scratchStrokes = classifiedStrokes.filter((s) => s.classification.type === "SCRATCH_OUT");

    // LEVEL 2 & 3 PRE-STEP: MULTI-STROKE CONTAINER LOOP DETECTION
    const arrowHeadStrokes = classifiedStrokes.filter((s) => s.classification.type === "ARROW_HEAD");
    const candidateLinesForBox = classifiedStrokes.filter((s) => {
      if (s.classification.type !== "LINE" || s.classification.geometryType !== "STRAIGHT") return false;
      const start = s.stroke.points[0];
      const end = s.stroke.points[s.stroke.points.length - 1];
      const hasArrowHead = arrowHeadStrokes.some((tip) => {
        const center = SkeletalDistance.computeCenter(tip.stroke.points);
        return (
          Math.hypot(center.x - start.x, center.y - start.y) <= 45 ||
          Math.hypot(center.x - end.x, center.y - end.y) <= 45
        );
      });
      return !hasArrowHead;
    });

    const nonLineStrokes = classifiedStrokes.filter(
      (s) => s.classification.type !== "LINE" && s.classification.type !== "ARROW_HEAD"
    );
    const multiStrokeBoxGroups = ContainmentEngine.detectMultiStrokeContainers(
      candidateLinesForBox,
      nonLineStrokes
    );
    const multiStrokeBoxStrokeIds = new Set<string>(multiStrokeBoxGroups.flatMap((g) => g.strokeIds));

    // LEVEL 3: COMPOSITE ARROWS, CURVED CONNECTORS, INHIBITION & POLARITY
    const { connectors, usedConnectorStrokes } = ConnectorEngine.processConnectors(
      classifiedStrokes,
      multiStrokeBoxStrokeIds,
      passiveContextMap,
      globalScale,
      zoomFactor,
      this.defaultClassifier
    );

    // LEVEL 2: ADAPTIVE BASELINE ALIGNMENT & SPATIAL CONNECTED COMPONENTS
    const contentStrokes = classifiedStrokes.filter(
      (s) =>
        s.classification.type !== "SCRATCH_OUT" &&
        !multiStrokeBoxStrokeIds.has(s.stroke.id) &&
        !usedConnectorStrokes.has(s.stroke.id)
    );

    const entities = EntityClusterer.clusterEntities(
      contentStrokes,
      multiStrokeBoxGroups,
      scratchStrokes,
      passiveContextMap,
      globalScale,
      zoomFactor
    );

    // LEVEL 4: HIERARCHICAL CONTAINMENT
    ContainmentEngine.inferContainment(entities);

    // LEVEL 5: MAGNETIC DOCKING & RELATIONAL LABELS
    EntityDocker.dockAndBindLabels(connectors, entities, strokes);

    // 1-HOP SEMANTIC CONTEXT WINDOW GENERATION
    EntityDocker.generateContextWindows(entities, connectors);

    // TOPOLOGICAL FLOW ANALYSIS & CAUSAL FEEDBACK LOOPS
    const causalLoops = CausalLoopDetector.detectCausalLoops(entities, connectors);
    const topologyMetrics = CausalLoopDetector.computeTopologyMetrics(entities, connectors);

    return {
      entities,
      connectors,
      causal_loops: causalLoops,
      topology_metrics: topologyMetrics,
    };
  }
}
