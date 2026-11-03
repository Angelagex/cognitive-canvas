import { Handler } from "aws-lambda";
import { CanvasCompilerRequest } from "@cognitive-canvas/core/types";
import { executeGeminiCompilation } from "./services/geminiService";

/**
 * Direct Synchronous Multimodal Compilation Endpoint
 */
export const handler: Handler = async (event) => {
  try {
    const apiKey =
      event?.headers?.["x-gemini-api-key"] ||
      event?.headers?.["X-Gemini-Api-Key"] ||
      event?.headers?.["X-GEMINI-API-KEY"] ||
      process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey.trim().length === 0) {
      return {
        statusCode: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Unauthorized: Missing x-gemini-api-key header." }),
      };
    }

    const body: CanvasCompilerRequest =
      typeof event.body === "string" ? JSON.parse(event.body) : event.body || {};

    const resolvedCanvasId =
      body.canvasId || body.canvas_id || event?.pathParameters?.id || "";

    if (!resolvedCanvasId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing required 'canvas_id' / 'canvasId' parameter." }),
      };
    }

    const result = await executeGeminiCompilation(
      { ...body, canvasId: resolvedCanvasId, canvas_id: resolvedCanvasId },
      apiKey.trim()
    );

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result),
    };
  } catch (error: any) {
    console.error("[Lambda:compile] 💥 Error in multimodal compilation endpoint:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: error?.message || "Compilation failed with provided API key.",
      }),
    };
  }
};
