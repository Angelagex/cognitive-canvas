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
export interface DerringEffectChallenge {
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
export interface CompiledCognitiveMap {
  map_metadata: MapMetadata;
  nodes: CompiledNode[];
  edges: CompiledEdge[];
  grinde_audit: GrindeAudit;
  learning_engine_outputs: LearningEngineOutputs;
}

/**
 * Formal JSON Schema for Gemini 2.0 Flash Structured Outputs
 */
export const COMPILER_JSON_SCHEMA = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "CompiledCognitiveMap",
  type: "object",
  properties: {
    map_metadata: {
      type: "object",
      properties: {
        title: { type: "string" },
        domain_theme: { type: "string" },
        total_nodes: { type: "integer" },
        total_edges: { type: "integer" },
      },
      required: ["title", "domain_theme", "total_nodes", "total_edges"],
    },
    nodes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          visual_bounding_box: {
            type: "object",
            properties: {
              ymin: { type: "number" },
              xmin: { type: "number" },
              ymax: { type: "number" },
              xmax: { type: "number" },
            },
            required: ["ymin", "xmin", "ymax", "xmax"],
          },
          detected_content: { type: "string" },
          passive_context: { type: "string" },
          pacer_classification: {
            type: "string",
            enum: ["PROCEDURAL", "ANALOGOUS", "CONCEPTUAL", "EVIDENCE", "REFERENCE"],
          },
          grinde_traits: {
            type: "array",
            items: {
              type: "string",
              enum: [
                "GROUPED",
                "REFLECTIVE",
                "INTERCONNECTED",
                "NON_VERBAL",
                "DIRECTIONAL",
                "EMPHASIZED",
              ],
            },
          },
          deducible_from_context: { type: "boolean" },
        },
        required: [
          "id",
          "visual_bounding_box",
          "detected_content",
          "pacer_classification",
          "deducible_from_context",
        ],
      },
    },
    edges: {
      type: "array",
      items: {
        type: "object",
        properties: {
          source_node_id: { type: "string" },
          target_node_id: { type: "string" },
          label: { type: "string" },
          is_cross_link: { type: "boolean" },
          relation_nature: {
            type: "string",
            enum: [
              "CAUSAL",
              "CONDITIONAL",
              "HIERARCHICAL",
              "OPPOSITION_CONTRAST",
              "ANALOGICAL_ISOMORPHISM",
              "EVIDENTIAL_SUPPORT",
            ],
          },
        },
        required: [
          "source_node_id",
          "target_node_id",
          "label",
          "is_cross_link",
          "relation_nature",
        ],
      },
    },
    grinde_audit: {
      type: "object",
      properties: {
        cross_link_density_score: { type: "number" },
        non_verbal_balance_score: { type: "number" },
        linear_thinking_risk: { type: "boolean" },
        feedback_critique: { type: "string" },
      },
      required: [
        "cross_link_density_score",
        "non_verbal_balance_score",
        "linear_thinking_risk",
        "feedback_critique",
      ],
    },
    learning_engine_outputs: {
      type: "object",
      properties: {
        anki_flashcards: {
          type: "array",
          items: {
            type: "object",
            properties: {
              source_node_id: { type: "string" },
              card_type: { type: "string", enum: ["BASIC", "CLOZE"] },
              front: { type: "string" },
              back: { type: "string" },
            },
            required: ["source_node_id", "card_type", "front", "back"],
          },
        },
        high_road_transfer_prompts: {
          type: "array",
          items: {
            type: "object",
            properties: {
              core_concept_ids: { type: "array", items: { type: "string" } },
              unstructured_scenario: { type: "string" },
              guiding_question: { type: "string" },
            },
            required: ["core_concept_ids", "unstructured_scenario", "guiding_question"],
          },
        },
        derring_effect_challenges: {
          type: "array",
          items: {
            type: "object",
            properties: {
              flawed_premise: { type: "string" },
              corrective_task: { type: "string" },
              canonical_solution: { type: "string" },
            },
            required: ["flawed_premise", "corrective_task", "canonical_solution"],
          },
        },
        contrasting_cases_icc: {
          type: "array",
          items: {
            type: "object",
            properties: {
              case_a: { type: "string" },
              case_b: { type: "string" },
              invariant_discovery_prompt: { type: "string" },
            },
            required: ["case_a", "case_b", "invariant_discovery_prompt"],
          },
        },
      },
      required: [
        "anki_flashcards",
        "high_road_transfer_prompts",
        "derring_effect_challenges",
        "contrasting_cases_icc",
      ],
    },
  },
  required: [
    "map_metadata",
    "nodes",
    "edges",
    "grinde_audit",
    "learning_engine_outputs",
  ],
} as const;
