import {
  VisualAST,
  CognitiveCompilerOutput,
  RawInkStroke,
  ConceptTier,
  CausalEdgeType,
} from "@cognitive-canvas/core/types";
import { PlacedAttribute, ThinkingMemo } from "../types/canvas";
import { exportHighResPng, getCanvasStrokes } from "../components/JetpackInkCanvas";
import * as FileSystem from "expo-file-system";
import { compileMapLocally } from "./LocalCognitiveCompiler";
import { KeyStorageService } from "./KeyStorageService";
import { computeRenderWorldBounds, RenderWorldBounds } from "../utils/SpatialHashGrid";

export { compileMapLocally };
export type { RenderWorldBounds };

export interface VisionCompiledNode {
  id: string;
  label: string;
  domain: string;
  tier: ConceptTier;
  summary: string;
  box_2d: [number, number, number, number];
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
  renderWorldBounds: RenderWorldBounds;
  legacyOutput?: CognitiveCompilerOutput;
}

export interface CanvasDocumentInput {
  id: string;
  title: string;
  strokes?: RawInkStroke[];
  placedAttributes?: PlacedAttribute[];
  thinkingMemos?: Array<{ id: string; transcript: string; worldX: number; worldY: number }>;
  metadata?: {
    placed_attributes?: Array<{
      type?: string;
      category?: string;
      title?: string;
      label?: string;
      note?: string;
      worldX: number;
      worldY: number;
      thinkingMemo?: ThinkingMemo;
      id?: string;
    }>;
  };
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

/**
 * Vision-First Multimodal Compilation Request Builder & Dispatcher (BYOK).
 * Retrieves the user's Gemini API key via `KeyStorageService.getApiKey()` and passes it
 * in the `x-gemini-api-key` header along with the PNG snapshot and spatial metadata.
 */
export async function compileCanvas(
  document: CanvasDocumentInput
): Promise<VisionCompilerResponse> {
  const apiKey = await KeyStorageService.getApiKey();
  if (!apiKey) {
    throw new Error(
      "No Gemini API Key found. Please add your API Key in Settings to compile canvases."
    );
  }

  const apiUrl = document.apiUrl || process.env.EXPO_PUBLIC_API_URL;
  const strokes =
    document.strokes && document.strokes.length > 0
      ? document.strokes
      : await getCanvasStrokes().catch(() => []);

  const renderWorldBounds = computeRenderWorldBounds(strokes);
  const rawAttrs = document.placedAttributes || document.metadata?.placed_attributes || [];

  const extractedMemos: Array<{ id: string; transcript: string; worldX: number; worldY: number }> =
    document.thinkingMemos ? [...document.thinkingMemos] : [];

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

  const localizedThinkingMemos = extractedMemos.map((m) => ({
    id: m.id,
    transcript: m.transcript,
    relativePosition: {
      x: Number(((m.worldX - renderWorldBounds.minX) / renderWorldBounds.width).toFixed(4)),
      y: Number(((m.worldY - renderWorldBounds.minY) / renderWorldBounds.height).toFixed(4)),
    },
  }));

  const localizedAttributes = rawAttrs.map((a: any) => ({
    category: a.category || a.type || "CONCEPTUAL",
    label: a.label || [a.title, a.note].filter(Boolean).join(": ") || "Attribute",
    relativePosition: {
      x: Number(((a.worldX - renderWorldBounds.minX) / renderWorldBounds.width).toFixed(4)),
      y: Number(((a.worldY - renderWorldBounds.minY) / renderWorldBounds.height).toFixed(4)),
    },
  }));

  let pngBase64String = document.imageBase64 || "";
  if (!pngBase64String) {
    try {
      const capture = await exportHighResPng(1.0, true);
      if (capture?.uri) {
        pngBase64String = await FileSystem.readAsStringAsync(capture.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }
    } catch (captureErr) {
      console.warn("[CompilationService] Offscreen PNG capture skipped:", captureErr);
    }
  }

  const compilationRequest = {
    canvasId: document.id,
    canvasTitle: document.title || "Untitled",
    imageBase64: pngBase64String,
    renderWorldBounds,
    thinkingMemos: localizedThinkingMemos,
    passiveAttributes: localizedAttributes,
  };

  if (apiUrl && pngBase64String) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);
    const endpointUrl = `${apiUrl}/canvases/${document.id}/compile`;

    try {
      const response = await fetch(endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-gemini-api-key": apiKey,
        },
        signal: controller.signal,
        body: JSON.stringify(compilationRequest),
      });

      clearTimeout(timeoutId);

      if (response.status === 401) {
        throw new Error(
          "Invalid or missing Gemini API Key. Please verify your key in Settings."
        );
      }

      if (response.ok) {
        const data = await response.json();
        const resolved = data.output && Array.isArray(data.output.nodes) ? data.output : data;
        if (Array.isArray(resolved.nodes)) {
          return {
            canvasId: resolved.canvasId || document.id,
            canvasTitle: resolved.canvasTitle || document.title || "Untitled",
            nodes: resolved.nodes.map((n: any, idx: number) => ({
              id: n.id || `node-${idx + 1}`,
              label: n.label || n.detected_content || `Concept ${idx + 1}`,
              domain: n.domain || document.title || "General",
              tier: n.tier || "mechanism",
              summary: n.summary || n.passive_context || "",
              box_2d:
                Array.isArray(n.box_2d) && n.box_2d.length === 4
                  ? n.box_2d
                  : [150, 150, 350, 450],
            })),
            edges: (resolved.edges || []).map((e: any) => ({
              fromNodeId: e.fromNodeId || e.source_node_id,
              toNodeId: e.toNodeId || e.target_node_id,
              type: e.type || "TRIGGERS",
              reasoning: e.reasoning || e.label || "",
            })),
            renderWorldBounds,
          };
        }
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err?.message?.includes("Gemini API Key")) {
        throw err;
      }
      console.warn("[CompilationService] Cloud compilation fallback to local:", err);
    }
  }

  // Offline / fallback synthesis
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
    renderWorldBounds,
    legacyOutput: fallbackLocal,
  };
}

export async function compileCognitiveMap(
  params: CompileParams
): Promise<CognitiveCompilerOutput> {
  const visionResult = await compileCanvas({
    id: params.canvasId,
    title: params.title,
    strokes: params.strokes,
    placedAttributes: params.placedAttributes,
    visualAST: params.visualAST,
    imageBase64: params.imageBase64,
    apiUrl: params.apiUrl,
  });

  if (visionResult.legacyOutput) {
    return visionResult.legacyOutput;
  }

  return compileMapLocally({
    canvasId: params.canvasId,
    title: params.title,
    visualAST: params.visualAST || null,
    placedAttributes: params.placedAttributes,
  });
}
