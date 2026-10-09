import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { CanvasRepository } from "@cognitive-canvas/core/canvas";
import { CompilationRepository } from "@cognitive-canvas/core/compilation";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const canvasId = event.pathParameters?.id;
    if (!canvasId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing canvas id parameter" }),
      };
    }

    const canvas = await CanvasRepository.get(canvasId);
    if (!canvas) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Canvas not found" }),
      };
    }

    if (canvas.status === "COMPILING") {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "COMPILING",
          canvas_id: canvasId,
        }),
      };
    }

    if (canvas.status === "FAILED") {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "FAILED",
          canvas_id: canvasId,
          error: "Compilation failed on server",
        }),
      };
    }

    // Canvas is COMPILED: fetch latest compilation via direct PK (fast & doesn't require GSI)
    let latest = null;
    if ((canvas as any).lastCompilationId) {
      latest = await CompilationRepository.get((canvas as any).lastCompilationId);
    }

    if (!latest) {
      try {
        const compilations = await CompilationRepository.listByCanvas(canvasId);
        if (compilations && compilations.length > 0) {
          compilations.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
          latest = compilations[0];
        }
      } catch (err: any) {
        console.warn("[Lambda:compilation:getByCanvas] listByCanvas fallback bypassed:", err?.message || err);
      }
    }

    if (!latest) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: canvas.status,
          canvas_id: canvasId,
          output: null,
        }),
      };
    }
    let parsedOutput = null;
    try {
      parsedOutput = JSON.parse(latest.rawOutputJson);
    } catch {
      parsedOutput = null;
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "COMPILED",
        canvas_id: canvasId,
        compilation_id: latest.id,
        output: parsedOutput,
      }),
    };
  } catch (error: any) {
    console.error("[Lambda:compilation:getByCanvas] Error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error?.message || "Internal server error" }),
    };
  }
};
