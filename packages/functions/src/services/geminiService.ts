import { Resource } from "sst";
import { GoogleGenAI } from "@google/genai";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { COMPILER_SYSTEM_PROMPT } from "../../prompts/compilerPrompt";
import { CanvasRepository } from "@cognitive-canvas/core/canvas";
import { CompilationRepository } from "@cognitive-canvas/core/compilation";

const s3 = new S3Client({});

async function streamToBase64(stream: any): Promise<string> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks).toString("base64");
}

function stripDataUrlPrefix(base64: string): string {
  const commaIdx = base64.indexOf(",");
  return base64.startsWith("data:") && commaIdx !== -1 ? base64.slice(commaIdx + 1) : base64;
}

export async function executeGeminiCompilation(payload: any, explicitApiKey?: string): Promise<any> {
  const apiKey = explicitApiKey || payload?.apiKey || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error("Missing Gemini API Key for multimodal compilation.");
  }

  const resolvedCanvasId = payload.canvasId || payload.canvas_id || "canvas_default";
  const resolvedCanvasTitle = payload.canvasTitle || payload.canvas_title || "Untitled";
  const rawImageBase64 = payload.imageBase64 || payload.image_base64;

  let base64Image = rawImageBase64 ? stripDataUrlPrefix(rawImageBase64) : undefined;
  if (!base64Image) {
    const s3Key = payload.image_s3_key || (await CanvasRepository.get(resolvedCanvasId).catch(() => null))?.s3Key;
    if (!s3Key) {
      throw new Error("No image source provided (imageBase64 or S3 key).");
    }
    const bucketName = (Resource as any)?.MyBucket?.name || "CognitiveCanvasBucket";
    const s3Response = await s3.send(new GetObjectCommand({ Bucket: bucketName, Key: s3Key }));
    if (!s3Response.Body) throw new Error("Failed to read canvas image from S3.");
    base64Image = await streamToBase64(s3Response.Body);
  }

  const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
  const modelName = process.env.GEMINI_MODEL || "gemini-3.8-flash";

  let imageMimeType = "image/png";
  if (base64Image.startsWith("/9j/")) imageMimeType = "image/jpeg";
  else if (base64Image.startsWith("UklGR")) imageMimeType = "image/webp";

  const contextPart = {
    text: JSON.stringify({
      canvasId: resolvedCanvasId,
      canvasTitle: resolvedCanvasTitle,
      verbalWalkthroughTranscript: payload.verbalWalkthroughTranscript || null,
      previousAnalysis: payload.previousAnalysis || null,
      thinkingMemos: payload.thinkingMemos || payload.thinking_memos || [],
      passiveAttributes: payload.passiveAttributes || payload.passive_context_dictionary || [],
    }),
  };

  const imagePart = {
    inlineData: { data: base64Image, mimeType: imageMimeType },
  };

  console.log(`[geminiService] 🤖 Invoking Gemini (${modelName}) for "${resolvedCanvasTitle}" (${resolvedCanvasId})`);
  const startTime = Date.now();

  const response = await ai.models.generateContent({
    model: modelName,
    contents: [{ role: "user", parts: [contextPart, imagePart] }],
    config: {
      systemInstruction: COMPILER_SYSTEM_PROMPT,
      responseMimeType: "application/json",
      temperature: 0.1,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  const elapsed = Date.now() - startTime;
  const rawText = response.text || "{}";
  console.log(`[geminiService] ⏱️ Response in ${elapsed}ms (${rawText.length} chars)`);

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

  return {
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
}

