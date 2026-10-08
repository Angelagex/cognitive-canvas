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
  try {
    const body: CanvasCompilerRequest = typeof event.body === "string" ? JSON.parse(event.body) : event.body || {};
    const { canvas_id, image_s3_key, image_base64, visual_ast_layer, passive_context_dictionary } = body;

    if (!canvas_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required 'canvas_id' parameter." }),
      };
    }

    let base64Image = image_base64;

    // Fetch from S3 if base64 not provided directly
    if (!base64Image) {
      const s3Key = image_s3_key || (await CanvasRepository.get(canvas_id).catch(() => null))?.s3Key;
      if (!s3Key) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "No image source provided (image_base64 or S3 key)." }),
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

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY environment variable is missing.");
    }

    const ai = new GoogleGenAI({ apiKey: apiKey || "" });

    // Update canvas status to COMPILING
    await CanvasRepository.update(canvas_id, { status: "COMPILING" }).catch(() => null);

    // Invoke Gemini 2.0 Flash with Structured Outputs & official system instruction
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: "image/png",
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
      },
    });

    const rawText = response.text || "{}";
    const output: CognitiveCompilerOutput = JSON.parse(rawText);

    const compilationId = `comp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Persist compilation record
    await CompilationRepository.create({
      id: compilationId,
      canvasId: canvas_id,
      feedbackCritique: output.grinde_audit.feedback_critique || "",
      linearThinkingRisk: output.grinde_audit.linear_thinking_risk || false,
      crossLinkDensityScore: output.grinde_audit.cross_link_density_score || 0,
      rawOutputJson: rawText,
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

    // Batch persist Anki flashcards (Strictly EVIDENCE / REFERENCE non-deducible nodes)
    if (output.anki_flashcards && output.anki_flashcards.length > 0) {
      const flashcardInputs = output.anki_flashcards.map((card, idx) => ({
        id: `card_${compilationId}_${idx}`,
        canvasId: canvas_id,
        compilationId: compilationId,
        targetNodeId: card.target_node_id || card.source_node_id || `node_${idx}`,
        cardType: card.card_type,
        front: card.front,
        back: card.back,
        clozeText: card.cloze_text,
        deckName: "CognitiveCanvas",
        syncedToAnki: false,
      }));
      await FlashcardRepository.batchCreate(flashcardInputs);
    }

    // Update canvas status to COMPILED
    await CanvasRepository.update(canvas_id, {
      status: "COMPILED",
      crossLinkDensity: output.grinde_audit.cross_link_density_score,
      linearThinkingRisk: output.grinde_audit.linear_thinking_risk,
    }).catch(() => null);

    const apiResponse: CanvasCompilerResponse = {
      compilation_id: compilationId,
      canvas_id: canvas_id,
      compiled_at: Date.now(),
      output,
    };

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(apiResponse),
    };
  } catch (error: any) {
    console.error("Compilation Handler Error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Compilation execution failed.",
        details: error?.message || String(error),
      }),
    };
  }
};
