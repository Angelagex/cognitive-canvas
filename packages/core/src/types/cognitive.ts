/**
 * Cognitive Canvas Shared Types & Backwards Compatibility Layer
 * Re-exports canonical contracts and provides compatibility bridges.
 */

export * from "./visualAst";
export * from "./persistence";
export * from "./inkBridge";
export * from "./compiledGraph";

import {
  CompiledCognitiveMap,
  CompiledNode,
  CompiledEdge,
  RelationNature,
  AnkiFlashcard,
  COMPILER_JSON_SCHEMA,
} from "./compiledGraph";
import {
  VisualEntity,
  ConnectorEdge,
  NormalizedBoundingBox,
  VisualEntityType,
  VisualAST,
} from "./visualAst";

// Legacy Aliases for backwards compatibility with existing repositories & tests
export type VisualBoundingBoxRect = NormalizedBoundingBox;
export type VisualBoundingBox = [ymin: number, xmin: number, ymax: number, xmax: number] | NormalizedBoundingBox;
export type VisualASTEntityType = VisualEntityType;
export type VisualASTEntity = VisualEntity;
export type VisualASTConnector = ConnectorEdge;

export type CognitiveNode = Omit<CompiledNode, "visual_bounding_box"> & {
  visual_bounding_box: NormalizedBoundingBox | [number, number, number, number];
};

export type CognitiveEdge = Omit<CompiledEdge, "relation_nature"> & {
  relation_nature: RelationNature | string;
};

// Progressive Migration Bridge: Allows existing frontend components to read both legacy flat fields and new learning_engine_outputs
export type CognitiveCompilerOutput = CompiledCognitiveMap & {
  anki_flashcards?: (AnkiFlashcard & { target_node_id?: string; cloze_text?: string })[];
  high_road_transfer_prompts?: any[];
  derring_effect_challenges?: any[];
  contrasting_cases_icc?: any[];
};

export const COGNITIVE_COMPILER_JSON_SCHEMA = COMPILER_JSON_SCHEMA;

export interface ContrastingCaseItem {
  case_a: string;
  case_b: string;
  underlying_invariant_prompt: string;
}

export interface CanvasCompilerRequest {
  canvas_id: string;
  image_s3_key?: string;
  image_base64?: string;
  visual_ast_layer?: VisualAST;
  passive_context_dictionary?: Record<string, string>;
}

export interface CanvasCompilerResponse {
  compilation_id: string;
  canvas_id: string;
  compiled_at: number;
  output: CompiledCognitiveMap;
}
