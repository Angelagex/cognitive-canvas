import { Resource } from "sst";
import { Handler } from "aws-lambda";
import { GoogleGenAI } from "@google/genai";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { SYSTEM_COMPILER_PROMPT } from "../prompts/compilerPrompt";
import {
  COGNITIVE_COMPILER_JSON_SCHEMA,
  CognitiveCompilerOutput,
  CanvasCompilerRequest,
  CanvasCompilerResponse,
} from "@cognitive-canvas/core/types";
import { CanvasRepository } from "@cognitive-canvas/core/canvas";
import { CompilationRepository } from "@cognitive-canvas/core/compilation";
import { CognitiveNodeRepository } from "@cognitive-canvas/core/cognitivenode";
import { CognitiveEdgeRepository } from "@cognitive-canvas/core/cognitiveedge";
import { FlashcardRepository } from "@cognitive-canvas/core/flashcard";

const s3 = new S3Client({});

async function streamToBase64(stream: any): Promise<string> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("base64");
}

export const handler: Handler = async (event) => {
  const payload: CanvasCompilerRequest = typeof event === "string" ? JSON.parse(event) : event.body ? (typeof event.body === "string" ? JSON.parse(event.body) : event.body) : event;
  const { canvas_id, image_s3_key, image_base64, visual_ast_layer, passive_context_dictionary } = payload;

  console.log(`[Worker:compile] 🚀 Worker iniciado para canvas_id: "${canvas_id}"`);
  console.log(`[Worker:compile] 📦 Payload en worker:`, {
    canvas_id,
    tieneImageBase64: Boolean(image_base64),
    longitudBase64: image_base64?.length || 0,
    image_s3_key: image_s3_key || null,
    numEntidadesAST: visual_ast_layer?.entities?.length || 0,
    numConectoresAST: visual_ast_layer?.connectors?.length || 0,
    numMetadatosPasivos: passive_context_dictionary ? Object.keys(passive_context_dictionary).length : 0,
  });

  if (!canvas_id) {
    console.error(`[Worker:compile] ❌ Error: Falta canvas_id en el payload del worker.`);
    return;
  }

  try {
    let base64Image = image_base64;

    // Fetch from S3 if base64 not provided directly
    if (!base64Image) {
      console.log(`[Worker:compile] 🔍 Buscando imagen en S3...`);
      const s3Key = image_s3_key || (await CanvasRepository.get(canvas_id).catch(() => null))?.s3Key;
      if (!s3Key) {
        return {
          statusCode: 400,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "No image source provided (image_base64 or S3 key)." }),
        };
      }

      console.log(`[Worker:compile] 📥 Descargando imagen de S3 (Key: ${s3Key})...`);
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

    // Format Visual AST topology and user passive context
    let visualAstText = "";
    if (visual_ast_layer && (visual_ast_layer.entities?.length > 0 || visual_ast_layer.connectors?.length > 0)) {
      visualAstText = `\nTOPOLOGÍA VISUAL (Visual AST Layer):\n${JSON.stringify(visual_ast_layer, null, 2)}`;
    }

    let passiveContextText = "";
    if (passive_context_dictionary && Object.keys(passive_context_dictionary).length > 0) {
      passiveContextText = `\nDICCIONARIO DE METADATOS PASIVOS DEL USUARIO:\n${JSON.stringify(passive_context_dictionary, null, 2)}`;
    }

    const userPromptContent =
      `${visualAstText}\n${passiveContextText}`.trim() ||
      "Analiza el mapa mental manuscrito en la imagen y compílalo según las directrices.";

    const apiKey =
      (Resource as any)?.GeminiApiKey?.value ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) {
      console.error("[Worker:compile] ❌ CRÍTICO: No se detectó GEMINI_API_KEY.");
    }

    const ai = new GoogleGenAI({ apiKey: apiKey || "" });

    // Update canvas status to COMPILING
    await CanvasRepository.update(canvas_id, { status: "COMPILING" }).catch(() => null);

    console.log(`[Worker:compile] 🤖 Enviando petición a Gemini 3.8 Flash (Imagen: ${base64Image?.length || 0} chars)...`);
    const startTime = Date.now();

    // Detect MIME type (support WebP, JPEG, PNG)
    let imageMimeType = "image/png";
    if (base64Image.startsWith("/9j/")) {
      imageMimeType = "image/jpeg";
    } else if (base64Image.startsWith("UklGR")) {
      imageMimeType = "image/webp";
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: imageMimeType,
                data: base64Image,
              },
            },
            {
              text: userPromptContent,
            },
          ],
        },
      ],
      config: {
        systemInstruction: SYSTEM_COMPILER_PROMPT,
        responseMimeType: "application/json",
        responseSchema: COGNITIVE_COMPILER_JSON_SCHEMA,
        temperature: 0.2,
        thinkingConfig: {
          thinkingBudget: 0,
        },
      },
    });

    const elapsed = Date.now() - startTime;
    const rawText = response.text || "{}";
    console.log(`[Worker:compile] ⏱️ Gemini 3.8 Flash respondió en ${elapsed}ms. (Longitud JSON: ${rawText.length} chars)`);

    const output: CognitiveCompilerOutput = JSON.parse(rawText);

    const compilationId = `comp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Métricas macro-cognitivas derivadas
    const feedbackCritique =
      output.map_overview?.maturity_diagnosis ||
      output.map_overview?.bridge_to_next_level ||
      "Evaluación macro-cognitiva completada.";
    const linearThinkingRisk = output.map_overview?.maturity_level === 1;
    const totalIslands = output.macro_islands?.length || 1;
    const connectedIslands = output.macro_islands?.filter((i) => !i.is_isolated)?.length || 0;
    const crossLinkDensityScore = totalIslands > 0 ? connectedIslands / totalIslands : 0;

    // Persist compilation record in DynamoDB
    await CompilationRepository.create({
      id: compilationId,
      canvasId: canvas_id,
      feedbackCritique,
      linearThinkingRisk,
      crossLinkDensityScore,
      rawOutputJson: JSON.stringify(output),
    });

    // Extract and persist flashcard exceptions (Anki)
    const ankiExceptions = output.pedagogical_interventions?.anki_exceptions || [];
    if (ankiExceptions.length > 0) {
      const flashcardInputs = ankiExceptions.map((card, idx) => ({
        id: `card_${compilationId}_${idx}`,
        canvasId: canvas_id,
        compilationId: compilationId,
        targetNodeId: `exception_${idx}`,
        cardType: "BASIC" as const,
        front: card.front,
        back: card.back,
        clozeText: card.why_not_deducible || card.front,
        deckName: "CognitiveCanvas",
        syncedToAnki: false,
      }));
      await FlashcardRepository.batchCreate(flashcardInputs).catch((err) =>
        console.warn("[Worker:compile] Aviso guardando flashcards:", err)
      );
    }

    // Populate fallback legacy fields for backwards compatibility
    if (!output.anki_flashcards && ankiExceptions.length > 0) {
      output.anki_flashcards = ankiExceptions.map((c) => ({
        source_node_id: "macro_exception",
        card_type: "BASIC",
        front: c.front,
        back: c.back,
      }));
    }

    // Update canvas status to COMPILED
    await CanvasRepository.update(canvas_id, {
      status: "COMPILED",
      lastCompilationId: compilationId,
      crossLinkDensity: crossLinkDensityScore,
      linearThinkingRisk,
    }).catch(() => null);

    console.log(`[Worker:compile] 🎉 Compilación ${compilationId} completada y persistida exitosamente para canvas: ${canvas_id}`);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        compilation_id: compilationId,
        canvas_id: canvas_id,
        compiled_at: Date.now(),
        output,
      }),
    };
  } catch (error: any) {
    console.error(`[Worker:compile] 💥 Error en worker de compilación:`, error);
    await CanvasRepository.update(canvas_id, {
      status: "FAILED",
    }).catch(() => null);
    throw error;
  }
};
