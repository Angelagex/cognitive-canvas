/**
 * Compiled Cognitive Map TypeScript Contract & Gemini 2.0 Flash JSON Schema
 * Based on MASTER_SPEC.md (Section 1.2, 7, 8) and DECISION_RATIONALE.md (Section 5.1, 5.2, 5.3)
 */

import { NormalizedBoundingBox } from "./visualAst.js";

/**
 * PACER Framework Categories (Dr. Justin Sung / iCanStudy)
 */
export type PacerClassification =
  | "PROCEDURAL"
  | "ANALOGOUS"
  | "CONCEPTUAL"
  | "EVIDENCE"
  | "REFERENCE";

/**
 * GRINDE Framework Methodological Traits
 */
export type GrindeTrait =
  | "GROUPED"
  | "REFLECTIVE"
  | "INTERCONNECTED"
  | "NON_VERBAL"
  | "DIRECTIONAL"
  | "EMPHASIZED";

/**
 * Semantic Nature of Relations between Conceptual Nodes
 */
export type RelationNature =
  | "CAUSAL"
  | "CONDITIONAL"
  | "HIERARCHICAL"
  | "OPPOSITION_CONTRAST"
  | "ANALOGICAL_ISOMORPHISM"
  | "EVIDENTIAL_SUPPORT";

/**
 * Anki Flashcard Format
 */
export type AnkiCardType = "BASIC" | "CLOZE";

/**
 * Global Map Metadata
 */
export interface MapMetadata {
  title: string;
  domain_theme: string;
  total_nodes: number;
  total_edges: number;
}

/**
 * Semantic Node compiled from Visual AST and Multimodal Vision
 */
export interface CompiledNode {
  id: string;
  visual_bounding_box: NormalizedBoundingBox;
  detected_content: string;
  passive_context?: string | null;
  pacer_classification: PacerClassification;
  grinde_traits?: GrindeTrait[];
  deducible_from_context: boolean;
}

/**
 * Directed Semantic Edge
 */
export interface CompiledEdge {
  source_node_id: string;
  target_node_id: string;
  label: string;
  is_cross_link: boolean;
  relation_nature: RelationNature;
}

/**
 * GRINDE Relational Audit
 * Assesses mental model integration vs rote linear thinking
 */
export interface GrindeAudit {
  cross_link_density_score: number;
  non_verbal_balance_score: number;
  linear_thinking_risk: boolean;
  feedback_critique: string;
}

/**
 * Strict Anti-Rote Anki Flashcard
 * Produced ONLY for non-deducible EVIDENCE and REFERENCE nodes (ADR 5.2)
 */
export interface AnkiFlashcard {
  source_node_id: string;
  target_node_id?: string;
  card_type: AnkiCardType;
  front: string;
  back: string;
  cloze_text?: string;
}

/**
 * High-Road Cognitive Transfer Prompt (Perkins & Salomon)
 * Deep structure invariant applied to an unstructured dissimilar domain
 */
export interface HighRoadTransferPrompt {
  core_concept_ids: string[];
  unstructured_scenario: string;
  guiding_question: string;
}

/**
 * Derring Effect Challenge (Wong & Lim)
 * Intentional plausible misconception to be identified and rectified
 */
export interface LegacyDerringEffectChallenge {
  flawed_premise: string;
  corrective_task: string;
  canonical_solution: string;
}

/**
 * Inventing with Contrasting Cases (Schwartz & Chase)
 * Dual-case matrix sharing invariant deep causal rule under different surface traits
 */
export interface ContrastingCasesICC {
  case_a: string;
  case_b: string;
  invariant_discovery_prompt: string;
}

/**
 * High-Order Cognitive Learning Interventions
 */
export interface LearningEngineOutputs {
  anki_flashcards: AnkiFlashcard[];
  high_road_transfer_prompts: HighRoadTransferPrompt[];
  derring_effect_challenges: DerringEffectChallenge[];
  contrasting_cases_icc: ContrastingCasesICC[];
}

/**
 * Complete Compiled Cognitive Map Structure
 * 1:1 Match with MASTER_SPEC.md Section 8 JSON Schema
 */
/**
 * Macro-Cognitive Architecture Types (Dr. Justin Sung / iCanStudy & Mirror Mapping)
 * Based on GHOST_OVERLAY_AND_MACRO_PIPELINE_SPEC.md & COGNITIVE_ARCHITECTURE_DECISION_RECORD.md
 */

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
  // Optional backward compat
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

/**
 * Complete Compiled Cognitive Map Structure (Maintained for backward-compatibility)
 */
export interface CompiledCognitiveMap {
  map_overview?: MapOverview;
  macro_islands?: MacroIsland[];
  pedagogical_interventions?: PedagogicalInterventions;
  high_order_retrieval?: HighOrderRetrieval;
  // Legacy fields
  map_metadata?: MapMetadata;
  nodes?: CompiledNode[];
  edges?: CompiledEdge[];
  grinde_audit?: GrindeAudit;
  learning_engine_outputs?: LearningEngineOutputs;
}

/**
 * Formal JSON Schema for Gemini 2.0 / 3.8 Flash Structured Outputs
 * 1:1 match with JSON SQUEMA.md
 */
export const COMPILER_JSON_SCHEMA = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "MacroCognitiveEvaluation",
  type: "object",
  properties: {
    map_overview: {
      type: "object",
      properties: {
        core_theme: { type: "string" },
        maturity_level: { type: "integer", enum: [1, 2, 3, 4] },
        maturity_diagnosis: {
          type: "string",
          description: "Diagnóstico de por qué está en este nivel (máximo 2 oraciones).",
        },
        bridge_to_next_level: {
          type: "string",
          description: "Acción relacional concreta para subir de nivel.",
        },
      },
      required: ["core_theme", "maturity_level", "maturity_diagnosis", "bridge_to_next_level"],
    },
    macro_islands: {
      type: "array",
      description: "Lista de las principales regiones conceptuales identificadas.",
      items: {
        type: "object",
        properties: {
          island_name: { type: "string" },
          associated_entity_ids: { type: "array", items: { type: "string" } },
          is_isolated: {
            type: "boolean",
            description: "True si carece de enlaces cruzados con otras islas.",
          },
        },
        required: ["island_name", "associated_entity_ids", "is_isolated"],
      },
    },
    pedagogical_interventions: {
      type: "object",
      properties: {
        procedural_zones: {
          type: "array",
          items: {
            type: "object",
            properties: {
              zone_name: { type: "string" },
              entity_ids: { type: "array", items: { type: "string" } },
              deliberate_practice_prompt: { type: "string" },
            },
            required: ["zone_name", "entity_ids", "deliberate_practice_prompt"],
          },
        },
        relational_anchoring_suggestions: {
          type: "array",
          description:
            "Datos de referencia o evidencia que el usuario debería conectar mejor en el mapa en lugar de memorizarlos.",
          items: {
            type: "object",
            properties: {
              target_content: { type: "string" },
              suggested_connection: { type: "string" },
            },
            required: ["target_content", "suggested_connection"],
          },
        },
        anki_exceptions: {
          type: "array",
          description:
            "Únicamente datos no deducibles que no pueden integrarse al mapa (máximo 2).",
          items: {
            type: "object",
            properties: {
              front: { type: "string" },
              back: { type: "string" },
              why_not_deducible: { type: "string" },
            },
            required: ["front", "back", "why_not_deducible"],
          },
        },
      },
      required: ["procedural_zones", "relational_anchoring_suggestions", "anki_exceptions"],
    },
    high_order_retrieval: {
      type: "object",
      properties: {
        cross_island_causal_question: { type: "string" },
        high_road_transfer: {
          type: "object",
          properties: {
            unstructured_scenario: { type: "string" },
            guiding_question: { type: "string" },
          },
          required: ["unstructured_scenario", "guiding_question"],
        },
        derring_effect: {
          type: "object",
          properties: {
            flawed_premise: { type: "string" },
            challenge_prompt: { type: "string" },
            canonical_resolution: { type: "string" },
          },
          required: ["flawed_premise", "challenge_prompt", "canonical_resolution"],
        },
      },
      required: ["cross_island_causal_question", "high_road_transfer", "derring_effect"],
    },
  },
  required: [
    "map_overview",
    "macro_islands",
    "pedagogical_interventions",
    "high_order_retrieval",
  ],
} as const;
