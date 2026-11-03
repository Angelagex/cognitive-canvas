import {
  VisualAST, CognitiveCompilerOutput, RawInkStroke, ConceptTier,
  CausalEdgeType, PacerRole, CognitiveSynthesis, ReasoningDiagnosis,
} from "@cognitive-canvas/core/types";
import { PlacedAttribute, ThinkingMemo } from "../types/canvas";
import { exportHighResPng, getCanvasStrokes } from "../components/JetpackInkCanvas";
import * as FileSystem from "expo-file-system";
import { compileMapLocally } from "./LocalCognitiveCompiler";
import { KeyStorageService } from "./KeyStorageService";
import { computeRenderWorldBounds, RenderWorldBounds } from "../utils/SpatialHashGrid";

export { compileMapLocally };
export type { RenderWorldBounds };

export interface CompilationOptions {
  verbalWalkthroughTranscript?: string | null;
  previousAnalysis?: { nodes?: any[]; edges?: any[] } | null;
}

export interface VisionCompiledNode {
  id: string; label: string; domain: string; tier: ConceptTier;
  pacerRole: PacerRole; summary: string; box_2d: [number, number, number, number];
  invariant?: string; fragility?: string; tradeoff?: string;
}

export interface VisionCompiledEdge {
  fromNodeId: string; toNodeId: string; type: CausalEdgeType; reasoning: string;
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

export async function compileCanvas(
  document: CanvasDocumentInput,
  options?: CompilationOptions
): Promise<VisionCompilerResponse> {
  const apiKey = await KeyStorageService.getApiKey();
  if (!apiKey) {
    throw new Error("Debes configurar tu Gemini API Key en Ajustes antes de compilar.");
  }

  const apiUrl = document.apiUrl || process.env.EXPO_PUBLIC_API_URL;
  const strokes =
    document.strokes && document.strokes.length > 0
      ? document.strokes
      : await getCanvasStrokes().catch(() => []);

  let pngBase64String = document.imageBase64 || "";
  let capturedWidth: number | undefined;
  let capturedHeight: number | undefined;
  let capturedRect: { minX: number; minY: number; maxX: number; maxY: number } | undefined;

  if (!pngBase64String) {
    try {
      const capture = await exportHighResPng(1.0, true);
      if (capture) {
        capturedWidth = capture.width;
        capturedHeight = capture.height;
        capturedRect = capture.renderedRect;
        pngBase64String =
          capture.base64 ||
          (capture.uri
            ? await FileSystem.readAsStringAsync(capture.uri, { encoding: FileSystem.EncodingType.Base64 })
            : "");
      }
    } catch (captureErr) {
      console.warn("[CompilationService] Offscreen PNG capture skipped:", captureErr);
    }
  }

  const renderWorldBounds: RenderWorldBounds =
    capturedRect && capturedRect.maxX > capturedRect.minX && capturedRect.maxY > capturedRect.minY
      ? {
          minX: capturedRect.minX,
          minY: capturedRect.minY,
          width: capturedRect.maxX - capturedRect.minX,
          height: capturedRect.maxY - capturedRect.minY,
        }
      : computeRenderWorldBounds(strokes, capturedWidth, capturedHeight);

  const rawAttrs = document.placedAttributes || document.metadata?.placed_attributes || [];
  const extractedMemos = document.thinkingMemos ? [...document.thinkingMemos] : [];
  rawAttrs.forEach((attr: any, idx: number) => {
    if (attr.thinkingMemo?.transcript?.trim()) {
      extractedMemos.push({
        id: attr.id || `memo_${idx}`,
        transcript: attr.thinkingMemo.transcript.trim(),
        worldX: attr.worldX ?? renderWorldBounds.minX,
        worldY: attr.worldY ?? renderWorldBounds.minY,
      });
    }
  });

  const toRel = (wx: number, wy: number) => ({
    x: Number(((wx - renderWorldBounds.minX) / renderWorldBounds.width).toFixed(4)),
    y: Number(((wy - renderWorldBounds.minY) / renderWorldBounds.height).toFixed(4)),
  });

  const compilationRequest = {
    canvasId: document.id,
    canvasTitle: document.title || "Untitled",
    imageBase64: pngBase64String,
    renderWorldBounds,
    verbalWalkthroughTranscript: options?.verbalWalkthroughTranscript || null,
    previousAnalysis: options?.previousAnalysis || null,
    thinkingMemos: extractedMemos.map((m) => ({
      id: m.id,
      transcript: m.transcript,
      relativePosition: toRel(m.worldX, m.worldY),
    })),
    passiveAttributes: rawAttrs.map((a: any) => ({
      category: a.category || a.type || "CONCEPTUAL",
      label: a.label || [a.title, a.note].filter(Boolean).join(": ") || "Attribute",
      relativePosition: toRel(a.worldX ?? renderWorldBounds.minX, a.worldY ?? renderWorldBounds.minY),
    })),
  };

  if (apiUrl && pngBase64String) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);
    try {
      const response = await fetch(`${apiUrl}/canvases/${document.id}/compile`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-gemini-api-key": apiKey },
        signal: controller.signal,
        body: JSON.stringify(compilationRequest),
      });
      clearTimeout(timeoutId);

      if (response.status === 401) {
        throw new Error("Invalid or missing Gemini API Key. Please verify your key in Settings.");
      }

      if (response.ok) {
        const data = await response.json();
        const resolved = data.output && Array.isArray(data.output.nodes) ? data.output : data;
        if (Array.isArray(resolved.nodes)) {
          const rawDiag = resolved.reasoningDiagnosis || {};
          const rawSyn = resolved.synthesis || {};
          const reasoningDiagnosis: ReasoningDiagnosis = {
            misconceptions: Array.isArray(rawDiag.misconceptions) ? rawDiag.misconceptions : [],
            omissions: Array.isArray(rawDiag.omissions)
              ? rawDiag.omissions
              : Array.isArray(rawSyn.blindSpots)
              ? rawSyn.blindSpots
              : [],
            ghostConnections: Array.isArray(rawDiag.ghostConnections)
              ? rawDiag.ghostConnections
              : Array.isArray(rawSyn.ghostConnections)
              ? rawSyn.ghostConnections
              : [],
            socraticChallenges: Array.isArray(rawDiag.socraticChallenges)
              ? rawDiag.socraticChallenges
              : (Array.isArray(rawSyn.socraticChallenges) ? rawSyn.socraticChallenges : []).map((c: any) => ({
                  targetMechanism: c.targetMechanism || c.edgeTarget || "Mecanismo",
                  counterfactualQuestion: c.counterfactualQuestion || "",
                  expectedInvariant: c.expectedInvariant || "",
                })),
          };
          return {
            canvasId: resolved.canvasId || document.id,
            canvasTitle: resolved.canvasTitle || document.title || "Untitled",
            nodes: resolved.nodes.map((n: any, idx: number) => ({
              id: n.id || `node-${idx + 1}`,
              label: n.label || n.detected_content || `Concept ${idx + 1}`,
              domain: n.domain || document.title || "General",
              tier: n.tier || "mechanism",
              pacerRole:
                n.pacerRole === "REFERENCE" || n.pacerRole === "PROCEDURAL" || n.pacerRole === "ANALOGOUS"
                  ? n.pacerRole
                  : "NONE",
              summary: n.summary || n.passive_context || "",
              box_2d: Array.isArray(n.box_2d) && n.box_2d.length === 4 ? n.box_2d : [150, 150, 350, 450],
            })),
            edges: (resolved.edges || []).map((e: any) => ({
              fromNodeId: e.fromNodeId || e.source_node_id,
              toNodeId: e.toNodeId || e.target_node_id,
              type: e.type || "TRIGGERS",
              reasoning: e.reasoning || e.label || "",
            })),
            synthesis: {
              systemSummary: rawSyn.systemSummary || "",
              ghostConnections: reasoningDiagnosis.ghostConnections,
              blindSpots: reasoningDiagnosis.omissions,
              socraticChallenges: reasoningDiagnosis.socraticChallenges.map((sc) => ({
                edgeTarget: sc.targetMechanism,
                counterfactualQuestion: sc.counterfactualQuestion,
              })),
            },
            reasoningDiagnosis,
            renderWorldBounds,
          };
        }
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err?.message?.includes("Gemini API Key")) throw err;
      console.warn("[CompilationService] Cloud compilation fallback to local:", err);
    }
  }

  const fallbackLocal = compileMapLocally({
    canvasId: document.id,
    title: document.title || "Untitled",
    visualAST: document.visualAST || null,
    placedAttributes: (document.placedAttributes || []) as PlacedAttribute[],
  });
  const payload = fallbackLocal.compiled_graph_payload;

  return {
    canvasId: document.id,
    canvasTitle: document.title || "Untitled",
    nodes: (payload?.nodes || []).map((n) => {
      const b = n.provenance?.[0]?.boundingBox;
      const box2d: [number, number, number, number] = b
        ? [
            Math.round(((b.minY - renderWorldBounds.minY) / renderWorldBounds.height) * 1000),
            Math.round(((b.minX - renderWorldBounds.minX) / renderWorldBounds.width) * 1000),
            Math.round(((b.maxY - renderWorldBounds.minY) / renderWorldBounds.height) * 1000),
            Math.round(((b.maxX - renderWorldBounds.minX) / renderWorldBounds.width) * 1000),
          ]
        : [200, 200, 400, 500];
      return {
        id: n.id,
        label: n.label,
        domain: n.domain || document.title || "General",
        tier: n.tier,
        pacerRole: n.pacerRole || "NONE",
        summary: n.summary,
        box_2d: box2d,
      };
    }),
    edges: (payload?.edges || []).map((e) => ({
      fromNodeId: e.fromNodeId,
      toNodeId: e.toNodeId,
      type: e.type,
      reasoning: e.reasoning,
    })),
    synthesis: payload?.synthesis || { systemSummary: "", ghostConnections: [], blindSpots: [], socraticChallenges: [] },
    reasoningDiagnosis: { misconceptions: [], omissions: [], ghostConnections: [], socraticChallenges: [] },
    renderWorldBounds,
    legacyOutput: fallbackLocal,
  };
}

export async function compileCognitiveMap(params: CompileParams): Promise<CognitiveCompilerOutput> {
  const res = await compileCanvas({
    id: params.canvasId,
    title: params.title,
    strokes: params.strokes,
    placedAttributes: params.placedAttributes,
    visualAST: params.visualAST,
    imageBase64: params.imageBase64,
    apiUrl: params.apiUrl,
  });
  return res.legacyOutput || compileMapLocally({
    canvasId: params.canvasId,
    title: params.title,
    visualAST: params.visualAST || null,
    placedAttributes: params.placedAttributes,
  });
}
