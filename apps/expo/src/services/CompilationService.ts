import { VisualAST, CognitiveCompilerOutput } from "@cognitive-canvas/core/types";
import { PlacedAttribute, ThinkingMemo } from "../types/canvas";
import { exportHighResPng } from "../components/JetpackInkCanvas";
import * as FileSystem from "expo-file-system";
import {
  buildPassiveContextDictionary,
  buildLayeredGraphPayload,
  compileMapLocally,
} from "./LocalCognitiveCompiler";
import { saveCompiledGraph } from "./CompiledGraphStorage";

export { compileMapLocally };

export interface CompileParams {
  canvasId: string;
  title: string;
  visualAST: VisualAST | null;
  placedAttributes: PlacedAttribute[];
  thinkingMemos?: ThinkingMemo[];
  imageBase64?: string;
  apiUrl?: string;
}

/**
 * Extracts all Thinking Memo transcripts attached to Lasso selections / attributes
 */
export function collectThinkingMemos(
  placedAttributes: PlacedAttribute[],
  explicitMemos?: ThinkingMemo[]
): Array<{ id: string; transcript: string; recordedAt: number; bounds?: any }> {
  const memos: Array<{ id: string; transcript: string; recordedAt: number; bounds?: any }> = [];

  for (const attr of placedAttributes) {
    if (attr.thinkingMemo && attr.thinkingMemo.transcript.trim().length > 0) {
      memos.push({
        id: attr.id,
        transcript: attr.thinkingMemo.transcript.trim(),
        recordedAt: attr.thinkingMemo.recordedAt,
        bounds: attr.entityBounds,
      });
    }
  }

  if (explicitMemos) {
    explicitMemos.forEach((m, idx) => {
      if (m.transcript.trim().length > 0) {
        memos.push({
          id: `memo_${idx}_${m.recordedAt}`,
          transcript: m.transcript.trim(),
          recordedAt: m.recordedAt,
        });
      }
    });
  }

  return memos;
}

/**
 * Main Cognitive Compilation Function
 * Packages Visual AST, passive attributes, and Deepgram Thinking Memos.
 * Persists the resulting layered DAG in `compiled_graph.json` storage.
 */
export async function compileCognitiveMap(
  params: CompileParams
): Promise<CognitiveCompilerOutput> {
  const apiUrl = params.apiUrl || process.env.EXPO_PUBLIC_API_URL;
  const thinkingMemos = collectThinkingMemos(params.placedAttributes, params.thinkingMemos);

  if (apiUrl) {
    try {
      const passiveDict = buildPassiveContextDictionary(
        params.visualAST,
        params.placedAttributes
      );

      let imageBase64 = params.imageBase64;
      if (!imageBase64) {
        try {
          const capture = await exportHighResPng(1.0, true);
          if (capture?.uri) {
            imageBase64 = await FileSystem.readAsStringAsync(capture.uri, {
              encoding: FileSystem.EncodingType.Base64,
            });
          }
        } catch (captureErr) {
          console.warn("[CompilationService] PNG capture skipped:", captureErr);
        }
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);
      const endpointUrl = `${apiUrl}/canvases/${params.canvasId}/compile`;

      const response = await fetch(endpointUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          canvas_id: params.canvasId,
          visual_ast_layer: params.visualAST,
          passive_context_dictionary: passiveDict,
          thinking_memos: thinkingMemos,
          image_base64: imageBase64,
        }),
      });

      clearTimeout(timeoutId);

      if (response.ok || response.status === 202) {
        const data = await response.json().catch(() => ({}));
        if (data.output) {
          await persistGraphFromCompilerOutput(params, data.output);
          return data.output;
        }

        if (response.status === 202 || data.status === "COMPILING") {
          const pollUrl = `${apiUrl}/canvases/${params.canvasId}/compilation`;
          const pollStart = Date.now();
          while (Date.now() - pollStart < 90000) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            const pollRes = await fetch(pollUrl);
            if (pollRes.ok) {
              const pollData = await pollRes.json();
              if (pollData.status === "COMPILED" && pollData.output) {
                await persistGraphFromCompilerOutput(params, pollData.output);
                return pollData.output;
              }
              if (pollData.status === "FAILED") {
                throw new Error(pollData.error || "Compilation failed on backend.");
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn("[CompilationService] Cloud compilation fallback to local:", err);
    }
  }

  const localOutput = compileMapLocally(params);
  if (localOutput.compiled_graph_payload) {
    await saveCompiledGraph(localOutput.compiled_graph_payload);
  }
  return localOutput;
}

async function persistGraphFromCompilerOutput(
  params: CompileParams,
  output: CognitiveCompilerOutput
): Promise<void> {
  if (output.compiled_graph_payload) {
    await saveCompiledGraph(output.compiled_graph_payload);
    return;
  }
  const payload = buildLayeredGraphPayload(
    params.canvasId,
    params.title,
    output.nodes || [],
    output.edges || [],
    params.placedAttributes
  );
  await saveCompiledGraph(payload);
}
