import { CognitiveCompilerOutput, RawInkStroke } from "@cognitive-canvas/core/types";
import { PlacedAttribute } from "../types/canvas";
import { exportHighResPng, getCanvasStrokes } from "../components/JetpackInkCanvas";
import * as FileSystem from "expo-file-system";
import { compileMapLocally } from "./LocalCognitiveCompiler";
import { KeyStorageService } from "./KeyStorageService";
import { computeRenderWorldBounds, RenderWorldBounds } from "../utils/SpatialHashGrid";
import { formatCompilerResponse } from "./compilationResponseMapper";
import {
  CompilationOptions,
  VisionCompilerResponse,
  CanvasDocumentInput,
  CompileParams,
  VisionCompiledNode,
  VisionCompiledEdge,
} from "./CompilationService.types";

export { compileMapLocally };
export type {
  RenderWorldBounds,
  CompilationOptions,
  VisionCompilerResponse,
  CanvasDocumentInput,
  CompileParams,
  VisionCompiledNode,
  VisionCompiledEdge,
};

async function pollJobStatus(
  apiUrl: string,
  jobId: string,
  maxTimeoutMs = 120000,
  pollIntervalMs = 2000
): Promise<any> {
  const startTime = Date.now();
  console.log(`[CompilationService] Job iniciado: ${jobId}. Iniciando polling cada ${pollIntervalMs}ms...`);

  while (Date.now() - startTime < maxTimeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

    try {
      const pollRes = await fetch(`${apiUrl}/compile/status/${jobId}`);
      if (!pollRes.ok) continue;

      const data = await pollRes.json();
      if (data.status === "completed") {
        console.log(`[CompilationService] Job ${jobId} finalizado exitosamente.`);
        return data.result;
      }
      if (data.status === "failed") {
        throw new Error(data.error || "La compilación falló en el servidor.");
      }
    } catch (e: any) {
      if (e?.message?.includes("falló en el servidor")) throw e;
      console.warn(`[CompilationService] Polling warning for ${jobId}:`, e?.message);
    }
  }

  throw new Error("Tiempo de espera agotado (120s) mientras se procesaba la síntesis del mapa.");
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
  const strokes: RawInkStroke[] =
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
    x: Number(((wx - renderWorldBounds.minX) / (renderWorldBounds.width || 1)).toFixed(4)),
    y: Number(((wy - renderWorldBounds.minY) / (renderWorldBounds.height || 1)).toFixed(4)),
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
    try {
      const response = await fetch(`${apiUrl}/compile`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-gemini-api-key": apiKey },
        body: JSON.stringify(compilationRequest),
      });

      if (response.status === 401) {
        throw new Error("Invalid or missing Gemini API Key. Please verify your key in Settings.");
      }

      if (response.ok || response.status === 202) {
        const initialData = await response.json();
        let finalResult = initialData;

        // If asynchronous job dispatched, poll status
        if (initialData.jobId) {
          finalResult = await pollJobStatus(apiUrl, initialData.jobId);
        }

        const resolved = finalResult?.result || finalResult?.output || finalResult;
        if (Array.isArray(resolved?.nodes)) {
          return formatCompilerResponse(resolved, document, renderWorldBounds);
        }
      }
    } catch (err: any) {
      if (err?.message?.includes("Gemini API Key")) throw err;
      if (err?.message?.includes("falló en el servidor")) throw err;
      console.warn("[CompilationService] Cloud compilation fallback to local:", err);
    }
  }

  // Local deterministic fallback
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
    nodes: (payload?.nodes || []).map((n) => ({
      id: n.id,
      label: n.label,
      domain: n.domain || document.title || "General",
      tier: n.tier,
      pacerRole: n.pacerRole || "NONE",
      summary: n.summary,
      box_2d: [200, 200, 400, 500],
    })),
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

export class CompilationService {
  static compileCanvas = compileCanvas;
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
