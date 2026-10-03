/**
 * Cognitive Canvas Shared TypeScript Types & JSON Schemas
 * Based on Architecture Spec & Dr. Justin Sung's GRINDE + PACER Methodology
 */

/**
 * 1. PACER Framework Categories
 * - PROCEDURAL: Action steps, algorithms, methodologies, operational flows.
 * - ANALOGOUS: Metaphors, allegories, structural isomorphisms.
 * - CONCEPTUAL: Guiding principles, abstract models, causal mechanisms ("why it works").
 * - EVIDENCE: Empirical data, scientific studies, experiments, numeric metrics, mathematical formulas.
 * - REFERENCE: Specific terminology, proper names, unique definitions, dates, raw syntax.
 */
export type PacerClassification =
  | "PROCEDURAL"
  | "ANALOGOUS"
  | "CONCEPTUAL"
  | "EVIDENCE"
  | "REFERENCE";

/**
 * Normalized visual bounding box [ymin, xmin, ymax, xmax] in 0-1000 scale
 */
export type VisualBoundingBox = [
  ymin: number,
  xmin: number,
  ymax: number,
  xmax: number,
];

/**
 * Individual Semantic Node extracted from freehand canvas
 */
export type CognitiveNode = {
  id: string;
  visual_bounding_box: VisualBoundingBox;
  detected_content: string;
  passive_context: string | null;
  pacer_classification: PacerClassification;
  deducible_from_context: boolean;
};

/**
 * Nature of relation between connected nodes
 */
export type RelationNature =
  | "causal"
  | "hierarchical"
  | "analogous"
  | "sequential"
  | "associative";

/**
 * Directed Edge / Connection between nodes
 */
export type CognitiveEdge = {
  source_node_id: string;
  target_node_id: string;
  label: string;
  is_cross_link: boolean;
  relation_nature: RelationNature | string;
};

/**
 * GRINDE Pedagogical Audit
 * Evaluates cognitive encoding quality and linear thinking risks.
 */
export type GrindeAudit = {
  cross_link_density_score: number;
  linear_thinking_risk: boolean;
  feedback_critique: string;
};

/**
 * Anki Flashcard Type
 */
export type AnkiCardType = "BASIC" | "CLOZE";

/**
 * Flashcard item generated ONLY for EVIDENCE / REFERENCE nodes with deducible_from_context = false
 */
export type AnkiFlashcard = {
  target_node_id: string;
  card_type: AnkiCardType;
  front?: string;
  back?: string;
  cloze_text?: string;
  deck_name?: string;
};

/**
 * Contrasting Cases Item (Schwartz / Bjork High-Order Cognitive Transfer)
 */
export type ContrastingCaseItem = {
  case_a: string;
  case_b: string;
  underlying_invariant_prompt: string;
};

/**
 * Complete Cognitive Compiler Structured Output
 */
export type CognitiveCompilerOutput = {
  nodes: CognitiveNode[];
  edges: CognitiveEdge[];
  grinde_audit: GrindeAudit;
  anki_flashcards: AnkiFlashcard[];
  high_road_transfer_prompts: string[];
  derring_effect_challenges: string[];
  contrasting_cases_icc: ContrastingCaseItem[];
};

/**
 * Canvas Compilation Request Payload sent from Expo Frontend to SST Backend
 */
export type CanvasCompilerRequest = {
  canvas_id: string;
  image_s3_key?: string;
  image_base64?: string;
  passive_context_dictionary?: Record<string, string>;
};

/**
 * Canvas Compilation API Response Payload
 */
export type CanvasCompilerResponse = {
  compilation_id: string;
  canvas_id: string;
  compiled_at: number;
  output: CognitiveCompilerOutput;
};

/**
 * Standard Gemini API JSON Schema constraint for Structured Outputs
 */
export const COGNITIVE_COMPILER_JSON_SCHEMA = {
  type: "object",
  properties: {
    nodes: {
      type: "array",
      description: "List of detected semantic clusters and handwritten nodes.",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          visual_bounding_box: {
            type: "array",
            description: "Normalized coordinates [ymin, xmin, ymax, xmax] in 0-1000 scale.",
            items: { type: "number" },
            minItems: 4,
            maxItems: 4,
          },
          detected_content: { type: "string" },
          passive_context: { type: ["string", "null"] },
          pacer_classification: {
            type: "string",
            enum: ["PROCEDURAL", "ANALOGOUS", "CONCEPTUAL", "EVIDENCE", "REFERENCE"],
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
      description: "Directed links and arrows connecting nodes.",
      items: {
        type: "object",
        properties: {
          source_node_id: { type: "string" },
          target_node_id: { type: "string" },
          label: { type: "string" },
          is_cross_link: {
            type: "boolean",
            description: "True ONLY if connecting two distant branches (Integrative Reconciliation).",
          },
          relation_nature: { type: "string" },
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
      description: "Pedagogical audit of relational density and linear thinking risk.",
      properties: {
        cross_link_density_score: { type: "number" },
        linear_thinking_risk: { type: "boolean" },
        feedback_critique: { type: "string" },
      },
      required: [
        "cross_link_density_score",
        "linear_thinking_risk",
        "feedback_critique",
      ],
    },
    anki_flashcards: {
      type: "array",
      description: "Flashcards generated ONLY for non-deducible EVIDENCE or REFERENCE nodes.",
      items: {
        type: "object",
        properties: {
          target_node_id: { type: "string" },
          card_type: { type: "string", enum: ["BASIC", "CLOZE"] },
          front: { type: "string" },
          back: { type: "string" },
          cloze_text: { type: "string" },
          deck_name: { type: "string" },
        },
        required: ["target_node_id", "card_type"],
      },
    },
    high_road_transfer_prompts: {
      type: "array",
      description: "Prompts forcing transfer of conceptual/analogous rules to dis-similar domains.",
      items: { type: "string" },
    },
    derring_effect_challenges: {
      type: "array",
      description: "Challenges introducing a subtle intentional conceptual error for learner correction.",
      items: { type: "string" },
    },
    contrasting_cases_icc: {
      type: "array",
      description: "Pairs of contrasting cases sharing underlying causal rule but differing in surface features.",
      items: {
        type: "object",
        properties: {
          case_a: { type: "string" },
          case_b: { type: "string" },
          underlying_invariant_prompt: { type: "string" },
        },
        required: ["case_a", "case_b", "underlying_invariant_prompt"],
      },
    },
  },
  required: [
    "nodes",
    "edges",
    "grinde_audit",
    "anki_flashcards",
    "high_road_transfer_prompts",
    "derring_effect_challenges",
    "contrasting_cases_icc",
  ],
} as const;

// ============================================================================
// 3-LAYER PERSISTENCE & LOCAL VISUAL AST TYPES (.cmn / JSON - Spec Section 5)
// ============================================================================

export type RawInkPoint = {
  x: number;
  y: number;
  p?: number; // Pressure [0.0 - 1.0]
  t?: number; // Timestamp relative to stroke start (ms)
};

export type RawInkStroke = {
  id: string;
  points: RawInkPoint[];
  color: string;
  width: number;
  timestamp?: number;
};

export type RawInkLayer = {
  strokes: RawInkStroke[];
};

export type VisualASTEntityType = "TEXT_BLOCK" | "SKETCH_ICON" | "CONTAINER_BOX";

export type VisualBoundingBoxRect = {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
};

export type VisualASTEntity = {
  id: string;
  type: VisualASTEntityType;
  transcribed_text?: string;
  stroke_ids: string[];
  bbox: VisualBoundingBoxRect;
  passive_context?: string | null;
  child_ids?: string[]; // Level 4: Hierarchical containment
};

export type VisualASTConnector = {
  id: string;
  type: "ARROW" | "LINE";
  stroke_ids: string[];
  source_entity_id?: string; // Level 5: Magnetic docking source
  target_entity_id?: string; // Level 5: Magnetic docking target
  directionality: "FORWARD" | "BIDIRECTIONAL" | "NONE";
  label?: string; // Level 5: Adjacent relational label
};

export type VisualASTLayer = {
  entities: VisualASTEntity[];
  connectors: VisualASTConnector[];
};

export type CognitiveMapDocument = {
  map_id: string;
  version: string;
  metadata: {
    title: string;
    created_at: number;
    updated_at: number;
  };
  raw_ink_layer: RawInkLayer;
  visual_ast_layer: VisualASTLayer;
  compiled_cognitive_layer: CognitiveCompilerOutput | null;
};
