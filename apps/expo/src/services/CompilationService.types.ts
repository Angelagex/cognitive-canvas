import {
  VisualAST,
  CognitiveCompilerOutput,
  RawInkStroke,
  ConceptTier,
  CausalEdgeType,
  PacerRole,
  CognitiveSynthesis,
  ReasoningDiagnosis,
} from "@cognitive-canvas/core/types";
import { PlacedAttribute, ThinkingMemo } from "../types/canvas";
import { RenderWorldBounds } from "../utils/SpatialHashGrid";

export type { RenderWorldBounds, ReasoningDiagnosis };

export interface CompilationOptions {
  verbalWalkthroughTranscript?: string | null;
  previousAnalysis?: { nodes?: any[]; edges?: any[] } | null;
}

export interface VisionCompiledNode {
  id: string;
  label: string;
  domain: string;
  macroDomain?: string;
  field?: string;
  scheme?: string;
  tier: ConceptTier;
  pacerRole: PacerRole;
  summary: string;
  box_2d: [number, number, number, number];
  invariant?: string;
  fragility?: string;
  tradeoff?: string;
}

export interface VisionCompiledEdge {
  fromNodeId: string;
  toNodeId: string;
  type: CausalEdgeType;
  reasoning: string;
}

export interface VisionCompilerResponse {
  canvasId: string;
  canvasTitle: string;
  nodes: VisionCompiledNode[];
  edges: VisionCompiledEdge[];
  synthesis: CognitiveSynthesis;
  reasoningDiagnosis: ReasoningDiagnosis;
  renderWorldBounds: RenderWorldBounds;
  legacyOutput?: CognitiveCompilerOutput;
}

export interface CanvasDocumentInput {
  id: string;
  title: string;
  strokes?: RawInkStroke[];
  placedAttributes?: PlacedAttribute[];
  thinkingMemos?: Array<{ id: string; transcript: string; worldX: number; worldY: number }>;
  metadata?: { placed_attributes?: any[] };
  visualAST?: VisualAST | null;
  imageBase64?: string;
  apiUrl?: string;
}

export interface CompileParams {
  canvasId: string;
  title: string;
  strokes?: RawInkStroke[];
  visualAST?: VisualAST | null;
  placedAttributes: PlacedAttribute[];
  thinkingMemos?: ThinkingMemo[];
  imageBase64?: string;
  apiUrl?: string;
}

