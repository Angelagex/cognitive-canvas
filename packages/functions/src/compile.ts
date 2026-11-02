import { Handler } from "aws-lambda";
import { CanvasCompilerRequest } from "@cognitive-canvas/core/types";
import { handler as compileWorkerHandler } from "./compileWorker";

/**
 * Vision-First Multimodal Compilation Endpoint (`POST /canvases/{id}/compile`)
 * Validates the BYOK `x-gemini-api-key` header and executes single-pass Gemini multimodal compilation.
 */
export const handler: Handler = async (event, context, callback) => {
  try {
    const apiKey =
      event?.headers?.["x-gemini-api-key"] ||
      event?.headers?.["X-Gemini-Api-Key"] ||
      event?.headers?.["X-GEMINI-API-KEY"];

    if (!apiKey || apiKey.trim().length === 0) {
      return {
        statusCode: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Unauthorized: Missing x-gemini-api-key header.",
        }),
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

    const enrichedEvent = {
      ...event,
      headers: {
        ...(event?.headers || {}),
        "x-gemini-api-key": apiKey.trim(),
      },
      body: JSON.stringify({
        ...body,
        canvasId: resolvedCanvasId,
        canvas_id: resolvedCanvasId,
      }),
    };

    const result: any = await compileWorkerHandler(enrichedEvent, context, callback);
    if (result && typeof result === "object" && "statusCode" in result) {
      return result;
    }

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
