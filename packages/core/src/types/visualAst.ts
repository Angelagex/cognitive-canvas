/**
 * Visual AST TypeScript Contract
 * Based on MASTER_SPEC.md (Section 5.1 & 5.2) and DECISION_RATIONALE.md (Section 1.2 & 5.1)
 */

/**
 * Normalized Bounding Box [ymin, xmin, ymax, xmax]
 * In local canvas space or normalized 0-1000 scale
 */
export interface NormalizedBoundingBox {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

/**
 * Supported Semantic Anchor Types (ADR 5.1)
 * Guided heuristic anchors directing attention to non-verbal / cognitive structures
 */
export type SemanticAnchorType = "MECHANISM" | "ANALOGY" | "EVIDENCE";

/**
 * Semantic Anchor attached to a visual entity or point on canvas
 */
export interface SemanticAnchor {
  id?: string;
  type: SemanticAnchorType;
  label: string;
  transcription?: string | null; // Voice-to-text input (Android SpeechRecognizer / iOS Speech)
  user_note?: string | null;     // Manual text elaboration
  world_x?: number;
  world_y?: number;
  created_at?: number;
}

/**
 * ML Kit Digital Ink Recognition Payload (Visual AST V2)
 */
export interface MLKitPayload {
  transcription: string | null;
  confidence: number;
  language?: string;
  candidates?: string[];
}

/**
 * Visual AST Entity Types (Level 1: Stroke Classification)
 */
export type VisualEntityType = "TEXT_BLOCK" | "SKETCH_ICON" | "CONTAINER_BOX";

/**
 * Grouped Visual Entity (Level 2: Stroke Clustering + Containment)
 */
export interface VisualEntity {
  id: string;
  type: VisualEntityType;
  stroke_ids: string[];
  bbox: NormalizedBoundingBox;
  transcribed_text?: string;
  semantic_anchor?: SemanticAnchor | null;
  passive_context?: string | null;
  context_window?: string | null; // Feature: 1-hop semantic context window
  child_ids?: string[]; // Level 4: Hierarchical containment inside CONTAINER_BOX
  is_scratched_out?: boolean; // Feature 6: In-AST scratch-out flag
  ml_kit_payload?: MLKitPayload | null; // Visual AST V2: On-device recognition
}

/**
 * Connector Directionality (Level 3: Composite Shapes & Arrows)
 */
export type ConnectorDirectionality = "FORWARD" | "BIDIRECTIONAL" | "NONE";

/**
 * Connector Geometry Type (Feature 2)
 */
export type ConnectorGeometryType = "STRAIGHT" | "CURVED" | "ELBOW";

/**
 * Connector Edge between entities (Level 5: Magnetic Docking & Relational Labels)
 */
export interface ConnectorEdge {
  id: string;
  type: "ARROW" | "LINE" | "INHIBITION"; // Feature 5: Added INHIBITION
  stroke_ids: string[];
  source_entity_id?: string; // Magnetically docked source entity id
  target_entity_id?: string; // Magnetically docked target entity id
  directionality: ConnectorDirectionality;
  label?: string; // Adjacent handwritten relational label (e.g. "inhibe", "restringe a")
  inferred_label?: string | null; // Visual AST V2: Edge-snapped relational text
  is_curved?: boolean; // Feature 2: Curved Bézier or Elbow connector
  geometry_type?: ConnectorGeometryType; // Feature 2: Structural geometry
  polarity?: "POSITIVE" | "NEGATIVE" | "UNKNOWN"; // Feature: Influence signs ('+' | '-')
}

/**
 * Detected Causal Feedback Loop (Feature 4: System Dynamics / Novak Concept Maps)
 */
export interface CausalLoop {
  cycle_ids: string[]; // Ordered entity IDs forming the closed loop: [A, B, C, A]
  node_count: number;
  loop_type?: "REINFORCING" | "BALANCING" | "ASSOCIATIVE";
  is_directed?: boolean;
  polarity_sign?: "+" | "-" | null; // Reinforcing (+/R), Balancing (-/B)
}

/**
 * High-Level Topological Flow Metrics (Feature 4)
 */
export interface TopologyMetrics {
  root_entity_ids: string[]; // In-degree 0, Out-degree > 0 (Starting premises / central concepts)
  sink_entity_ids: string[]; // In-degree > 0, Out-degree 0 (Terminal conclusions / leaf outcomes)
  cross_link_count: number;  // Connectors bridging non-linear branches (Novakian meaningful learning indicator)
}

/**
 * Complete Visual AST Layer (Level 1 to 5 local topology)
 */
export interface VisualAST {
  entities: VisualEntity[];
  connectors: ConnectorEdge[];
  causal_loops?: CausalLoop[]; // Feature 4: Detected causal feedback cycles
  topology_metrics?: TopologyMetrics; // Feature 4: Flow and hierarchical metrics
}

