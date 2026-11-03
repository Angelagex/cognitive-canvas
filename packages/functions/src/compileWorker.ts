import { Resource } from "sst";
import { Handler } from "aws-lambda";
import { GoogleGenAI } from "@google/genai";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { COMPILER_SYSTEM_PROMPT } from "../prompts/compilerPrompt";
import { CanvasCompilerRequest } from "@cognitive-canvas/core/types";
import { CanvasRepository } from "@cognitive-canvas/core/canvas";
import { CompilationRepository } from "@cognitive-canvas/core/compilation";

const s3 = new S3Client({});

async function streamToBase64(stream: any): Promise<string> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("base64");
}

function stripDataUrlPrefix(base64: string): string {
  const commaIdx = base64.indexOf(",");
  if (base64.startsWith("data:") && commaIdx !== -1) {
    return base64.slice(commaIdx + 1);
  }
  return base64;
}

export const handler: Handler = async (event) => {
  const headers = event?.headers || {};
  const apiKey: string | undefined =
    headers["x-gemini-api-key"] ||
    headers["X-Gemini-Api-Key"] ||
    headers["X-GEMINI-API-KEY"];

  if (!apiKey || apiKey.trim().length === 0) {
    return {
      statusCode: 401,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Unauthorized: Missing x-gemini-api-key header.",
      }),
    };
  }

  const payload: CanvasCompilerRequest =
    typeof event === "string"
      ? JSON.parse(event)
      : event?.body
      ? typeof event.body === "string"
        ? JSON.parse(event.body)
        : event.body
      : event || {};

  const resolvedCanvasId = payload.canvasId || payload.canvas_id || "";
  const resolvedCanvasTitle = payload.canvasTitle || payload.canvas_title || "Untitled";
  const rawImageBase64 = payload.imageBase64 || payload.image_base64;

  if (!resolvedCanvasId) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Missing required 'canvas_id' / 'canvasId' parameter." }),
    };
  }

  try {
    let base64Image = rawImageBase64 ? stripDataUrlPrefix(rawImageBase64) : undefined;

    if (!base64Image) {
      const s3Key =
        payload.image_s3_key ||
        (await CanvasRepository.get(resolvedCanvasId).catch(() => null))?.s3Key;
      if (!s3Key) {
        return {
          statusCode: 400,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "No image source provided (imageBase64 or S3 key)." }),
        };
      }

      const getObjCommand = new GetObjectCommand({
        Bucket: (Resource as any)?.MyBucket?.name || "CognitiveCanvasBucket",
        Key: s3Key,
      });
      const s3Response = await s3.send(getObjCommand);
      if (!s3Response.Body) {
        return {
          statusCode: 500,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Failed to read canvas image from S3." }),
        };
      }
      base64Image = await streamToBase64(s3Response.Body);
    }

    // Initialize GoogleGenAI dynamically per-request using the client's BYOK header key
    const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
    const modelName = process.env.GEMINI_MODEL || "gemini-3.8-flash";

    let imageMimeType = "image/png";
    if (base64Image.startsWith("/9j/")) {
      imageMimeType = "image/jpeg";
    } else if (base64Image.startsWith("UklGR")) {
      imageMimeType = "image/webp";
    }

    const contextPart = {
      text: JSON.stringify({
        canvasId: resolvedCanvasId,
        canvasTitle: resolvedCanvasTitle,
        verbalWalkthroughTranscript: payload.verbalWalkthroughTranscript || null,
        previousAnalysis: payload.previousAnalysis || null,
        thinkingMemos: payload.thinkingMemos || payload.thinking_memos || [],
        passiveAttributes:
          payload.passiveAttributes || payload.passive_context_dictionary || [],
      }),
    };

    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: imageMimeType,
      },
    };

    console.log(
      `[Worker:compile] 🤖 Vision-First BYOK Gemini (${modelName}) request for "${resolvedCanvasTitle}" (${resolvedCanvasId})`
    );
    const startTime = Date.now();

    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        {
          role: "user",
          parts: [contextPart, imagePart],
        },
      ],
      config: {
        systemInstruction: COMPILER_SYSTEM_PROMPT,
        responseMimeType: "application/json",
        temperature: 0.1,
        thinkingConfig: {
          thinkingBudget: 0,
        },
      },
    });

    const elapsed = Date.now() - startTime;
    const rawText = response.text || "{}";
    console.log(`[Worker:compile] ⏱️ Vision-First response in ${elapsed}ms (${rawText.length} chars)`);

    const parsedOutput: any = JSON.parse(rawText);
    const compilationId = `comp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    CompilationRepository.create({
      id: compilationId,
      canvasId: resolvedCanvasId,
      feedbackCritique: "Vision-First multimodal compilation completed.",
      linearThinkingRisk: false,
      crossLinkDensityScore: 1.0,
      rawOutputJson: rawText,
    }).catch(() => null);

    CanvasRepository.update(resolvedCanvasId, {
      status: "COMPILED",
      lastCompilationId: compilationId,
    }).catch(() => null);

    const cleanResponse = {
      canvasId: parsedOutput.canvasId || resolvedCanvasId,
      canvasTitle: parsedOutput.canvasTitle || resolvedCanvasTitle,
      compiledAt: Date.now(),
      nodes: parsedOutput.nodes || [],
      edges: parsedOutput.edges || [],
      reasoningDiagnosis: parsedOutput.reasoningDiagnosis || {
        misconceptions: [],
        omissions: [],
        ghostConnections: [],
        socraticChallenges: [],
      },
    };

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cleanResponse),
    };
  } catch (error: any) {
    console.error(`[Worker:compile] 💥 Vision-First compilation error:`, error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: error?.message || "Compilation failed with provided API key.",
      }),
    };
  }
};
