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
  child_ids?: string[]; // Level 4: Hierarchical containment inside CONTAINER_BOX
}

/**
 * Connector Directionality (Level 3: Composite Shapes & Arrows)
 */
export type ConnectorDirectionality = "FORWARD" | "BIDIRECTIONAL" | "NONE";

/**
 * Connector Edge between entities (Level 5: Magnetic Docking & Relational Labels)
 */
export interface ConnectorEdge {
  id: string;
  type: "ARROW" | "LINE";
  stroke_ids: string[];
  source_entity_id?: string; // Magnetically docked source entity id
  target_entity_id?: string; // Magnetically docked target entity id
  directionality: ConnectorDirectionality;
  label?: string; // Adjacent handwritten relational label (e.g. "inhibe", "restringe a")
}

/**
 * Complete Visual AST Layer (Level 1 to 5 local topology)
 */
export interface VisualAST {
  entities: VisualEntity[];
  connectors: ConnectorEdge[];
}
