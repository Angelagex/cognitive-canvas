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
        temperature: 0.1,
        thinkingConfig: {
          thinkingBudget: 0,
        },
      },
    });

    const elapsed = Date.now() - startTime;
    const rawText = response.text || "{}";
    console.log(`[Worker:compile] ⏱️ Gemini 3.8 Flash respondió en ${elapsed}ms. (Longitud JSON: ${rawText.length} chars)`);

    const output: CognitiveCompilerOutput = JSON.parse(rawText);

    // Reconciliación con el Visual AST: asegurar coordenadas de mundo reales del lienzo
    if (visual_ast_layer?.entities && visual_ast_layer.entities.length > 0 && output.nodes) {
      console.log(`[Worker:compile] 🔗 Reconciliando ${output.nodes.length} nodos con ${visual_ast_layer.entities.length} entidades del Visual AST...`);
      for (const node of output.nodes) {
        const matchingEntity =
          visual_ast_layer.entities.find((e) => e.id === node.id) ||
          visual_ast_layer.entities.find((e) => {
            const entText = (e.transcribed_text || "").toLowerCase().trim();
            const nodeContent = (node.detected_content || "").toLowerCase().trim();
            return entText && nodeContent && (entText.includes(nodeContent) || nodeContent.includes(entText));
          });

        if (matchingEntity && matchingEntity.bbox) {
          node.visual_bounding_box = {
            xmin: matchingEntity.bbox.xmin,
            ymin: matchingEntity.bbox.ymin,
            xmax: matchingEntity.bbox.xmax,
            ymax: matchingEntity.bbox.ymax,
          };
          console.log(`[Worker:compile] 🎯 Nodo "${node.detected_content}" vinculado con ${matchingEntity.id} (bbox: [${matchingEntity.bbox.xmin}, ${matchingEntity.bbox.ymin}, ${matchingEntity.bbox.xmax}, ${matchingEntity.bbox.ymax}])`);
        }
      }
    }

    const compilationId = `comp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Persist compilation record
    await CompilationRepository.create({
      id: compilationId,
      canvasId: canvas_id,
      feedbackCritique: output.grinde_audit.feedback_critique || "",
      linearThinkingRisk: output.grinde_audit.linear_thinking_risk || false,
      crossLinkDensityScore: output.grinde_audit.cross_link_density_score || 0,
      rawOutputJson: JSON.stringify(output),
    });

    // Batch persist nodes
    if (output.nodes && output.nodes.length > 0) {
      const nodeInputs = output.nodes.map((node) => ({
        id: node.id || `node_${Math.random().toString(36).substring(2, 7)}`,
        canvasId: canvas_id,
        compilationId: compilationId,
        pacerClassification: node.pacer_classification,
        detectedContent: node.detected_content || "",
        passiveContext: node.passive_context || undefined,
        boundingBoxJson: JSON.stringify(node.visual_bounding_box),
        deducibleFromContext: Boolean(node.deducible_from_context),
      }));
      await CognitiveNodeRepository.batchCreate(nodeInputs);
    }

    // Batch persist edges
    if (output.edges && output.edges.length > 0) {
      const edgeInputs = output.edges.map((edge, idx) => ({
        id: `edge_${compilationId}_${idx}`,
        canvasId: canvas_id,
        compilationId: compilationId,
        sourceNodeId: edge.source_node_id,
        targetNodeId: edge.target_node_id,
        label: edge.label || "",
        isCrossLink: Boolean(edge.is_cross_link),
        relationNature: edge.relation_nature || "associative",
      }));
      await CognitiveEdgeRepository.batchCreate(edgeInputs);
    }

    // Extract and persist flashcards
    const flashcards = output.learning_engine_outputs?.anki_flashcards || output.anki_flashcards || [];
    if (flashcards.length > 0) {
      const flashcardInputs = flashcards.map((card: any, idx: number) => ({
        id: `card_${compilationId}_${idx}`,
        canvasId: canvas_id,
        compilationId: compilationId,
        targetNodeId: card.target_node_id || card.source_node_id || `node_${idx}`,
        cardType: card.card_type,
        front: card.front,
        back: card.back,
        clozeText: card.cloze_text || card.front,
        deckName: "CognitiveCanvas",
        syncedToAnki: false,
      }));
      await FlashcardRepository.batchCreate(flashcardInputs);
    }

    // Populate fallback flat fields
    if (output.learning_engine_outputs && !output.anki_flashcards) {
      output.anki_flashcards = output.learning_engine_outputs.anki_flashcards;
      output.high_road_transfer_prompts = output.learning_engine_outputs.high_road_transfer_prompts as any;
      output.derring_effect_challenges = output.learning_engine_outputs.derring_effect_challenges as any;
      output.contrasting_cases_icc = output.learning_engine_outputs.contrasting_cases_icc as any;
    }

    // Update canvas status to COMPILED
    await CanvasRepository.update(canvas_id, {
      status: "COMPILED",
      lastCompilationId: compilationId,
      crossLinkDensity: output.grinde_audit.cross_link_density_score,
      linearThinkingRisk: output.grinde_audit.linear_thinking_risk,
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
