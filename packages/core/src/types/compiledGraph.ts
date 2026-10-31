/**
 * Compiled Cognitive Map & Layered DAG Knowledge Matrix TypeScript Contracts
 */

import { NormalizedBoundingBox } from "./visualAst";
export { COMPILER_JSON_SCHEMA } from "./compilerJsonSchema";

// ============================================================================
// PART III: LAYERED DAG KNOWLEDGE MATRIX & CAUSAL SYNTHESIS SCHEMAS
// ============================================================================

export type ConceptTier = "primitive" | "mechanism" | "system";
export type NodeVerificationState = "verified" | "unverified" | "ghost";
export type CausalEdgeType = "TRIGGERS" | "INHIBITS" | "PREREQUISITE_OF" | "EQUIVALENT";

export interface ConsolidatedReference {
  targetCanvasId: string;
  targetCanvasTitle: string;
}

export interface ThinkingMemoMetadata {
  transcript: string;
  recordedAt: number;
}

export interface KnowledgeNode {
  id: string;                         // Canonical slug (e.g., "tcp-syn-packet")
  label: string;                      // Display name (e.g., "SYN Packet")
  domain?: string;                    // Thematic topic cluster (e.g., "Programming", "Photography")
  tier: ConceptTier;                  // Hierarchical layer (Y-axis placement)
  verificationState: NodeVerificationState;
  provenance: {
    canvasId: string;
    canvasTitle: string;
    boundingBox?: { minX: number; minY: number; maxX: number; maxY: number };
  }[];
  summary: string;
  consolidatedRef?: ConsolidatedReference;
}

export interface KnowledgeEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  type: CausalEdgeType;
  reasoning: string;                  // Causal explanation of why A affects B
  confidence: number;                 // 0.0 to 1.0
}

export interface CanvasCompiledPayload {
  canvasId: string;
  canvasTitle: string;
  compiledAt: number;
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
}

export interface SocraticAuditResult {
  status: "question" | "passed" | "challenged";
  edgeTested: { from: string; to: string };
  promptText: string;
  feedback: string;
}

export interface PrerequisiteGap {
  id: string;
  label: string;
  tier: ConceptTier;
  dependencyOf: string;
  researchQuestions: string[];
}

export interface RoadmapPlanOutput {
  targetGoal: string;
  prerequisiteGaps: PrerequisiteGap[];
}

// ============================================================================
// LEGACY & MACRO-COGNITIVE TYPES (PACER / GRINDE / MIRROR MAPPING)
// ============================================================================

export type PacerClassification =
  | "PROCEDURAL"
  | "ANALOGOUS"
  | "CONCEPTUAL"
  | "EVIDENCE"
  | "REFERENCE";

export type GrindeTrait =
  | "GROUPED"
  | "REFLECTIVE"
  | "INTERCONNECTED"
  | "NON_VERBAL"
  | "DIRECTIONAL"
  | "EMPHASIZED";

export type RelationNature =
  | "CAUSAL"
  | "CONDITIONAL"
  | "HIERARCHICAL"
  | "OPPOSITION_CONTRAST"
  | "ANALOGICAL_ISOMORPHISM"
  | "EVIDENTIAL_SUPPORT";

export type AnkiCardType = "BASIC" | "CLOZE";

export interface MapMetadata {
  title: string;
  domain_theme: string;
  total_nodes: number;
  total_edges: number;
}

export interface CompiledNode {
  id: string;
  visual_bounding_box: NormalizedBoundingBox;
  detected_content: string;
  passive_context?: string | null;
  pacer_classification: PacerClassification;
  grinde_traits?: GrindeTrait[];
  deducible_from_context: boolean;
}

export interface CompiledEdge {
  source_node_id: string;
  target_node_id: string;
  label: string;
  is_cross_link: boolean;
  relation_nature: RelationNature;
}

export interface GrindeAudit {
  cross_link_density_score: number;
  non_verbal_balance_score: number;
  linear_thinking_risk: boolean;
  feedback_critique: string;
}

export interface AnkiFlashcard {
  source_node_id: string;
  target_node_id?: string;
  card_type: AnkiCardType;
  front: string;
  back: string;
  cloze_text?: string;
}

export interface HighRoadTransferPrompt {
  core_concept_ids: string[];
  unstructured_scenario: string;
  guiding_question: string;
}

export interface LegacyDerringEffectChallenge {
  flawed_premise: string;
  corrective_task: string;
  canonical_solution: string;
}

export interface ContrastingCasesICC {
  case_a: string;
  case_b: string;
  invariant_discovery_prompt: string;
}

export interface LearningEngineOutputs {
  anki_flashcards: AnkiFlashcard[];
  high_road_transfer_prompts: HighRoadTransferPrompt[];
  derring_effect_challenges: DerringEffectChallenge[];
  contrasting_cases_icc: ContrastingCasesICC[];
}

export type MaturityLevel = 1 | 2 | 3 | 4;

export interface MapOverview {
  core_theme: string;
  maturity_level: MaturityLevel;
  maturity_diagnosis: string;
  bridge_to_next_level: string;
}

export interface MacroIsland {
  island_name: string;
  associated_entity_ids: string[];
  is_isolated: boolean;
}

export interface ProceduralZone {
  zone_name: string;
  entity_ids: string[];
  deliberate_practice_prompt: string;
}

export interface RelationalAnchoringSuggestion {
  target_content: string;
  suggested_connection: string;
}

export interface AnkiException {
  front: string;
  back: string;
  why_not_deducible: string;
}

export interface HighRoadTransfer {
  unstructured_scenario: string;
  guiding_question: string;
}

export interface DerringEffectChallenge {
  flawed_premise: string;
  challenge_prompt: string;
  canonical_resolution: string;
  corrective_task?: string;
  canonical_solution?: string;
}

export interface HighOrderRetrieval {
  cross_island_causal_question: string;
  high_road_transfer: HighRoadTransfer;
  derring_effect: DerringEffectChallenge;
}

export interface PedagogicalInterventions {
  procedural_zones: ProceduralZone[];
  relational_anchoring_suggestions: RelationalAnchoringSuggestion[];
  anki_exceptions: AnkiException[];
}

export interface CompiledMacroCognitiveMap {
  map_overview: MapOverview;
  macro_islands: MacroIsland[];
  pedagogical_interventions: PedagogicalInterventions;
  high_order_retrieval: HighOrderRetrieval;
}

export interface CompiledCognitiveMap {
  map_overview?: MapOverview;
  macro_islands?: MacroIsland[];
  pedagogical_interventions?: PedagogicalInterventions;
  high_order_retrieval?: HighOrderRetrieval;
  map_metadata?: MapMetadata;
  nodes?: CompiledNode[];
  edges?: CompiledEdge[];
  grinde_audit?: GrindeAudit;
  learning_engine_outputs?: LearningEngineOutputs;
  compiled_graph_payload?: CanvasCompiledPayload;
}
