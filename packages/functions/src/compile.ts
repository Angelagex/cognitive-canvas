import { Resource } from "sst";
import { Handler } from "aws-lambda";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { CanvasRepository } from "@cognitive-canvas/core/canvas";
import { CanvasCompilerRequest } from "@cognitive-canvas/core/types";
import { handler as compileWorkerHandler } from "./compileWorker";

const lambdaClient = new LambdaClient({});

export const handler: Handler = async (event, context, callback) => {
  try {
    const body: CanvasCompilerRequest = typeof event.body === "string" ? JSON.parse(event.body) : event.body || {};
    const { canvas_id, image_s3_key, image_base64, visual_ast_layer, passive_context_dictionary } = body;

    console.log(`[Lambda:compile:dispatcher] 📥 Solicitud recibida para canvas_id: "${canvas_id}"`);
    console.log(`[Lambda:compile:dispatcher] 📦 Resumen:`, {
      canvas_id,
      tieneImageBase64: Boolean(image_base64),
      longitudBase64: image_base64?.length || 0,
      image_s3_key: image_s3_key || null,
      numEntidadesAST: visual_ast_layer?.entities?.length || 0,
      numConectoresAST: visual_ast_layer?.connectors?.length || 0,
      numMetadatosPasivos: passive_context_dictionary ? Object.keys(passive_context_dictionary).length : 0,
    });

    if (!canvas_id) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing required 'canvas_id' parameter." }),
      };
    }

    const workerFunctionName = (Resource as any)?.CompilerWorker?.name;

    if (workerFunctionName) {
      // Async background dispatch pattern (Industry Standard for Long-Running VLMs)
      console.log(`[Lambda:compile:dispatcher] 🚀 Despachando a CompilerWorker (${workerFunctionName}) asíncronamente (InvocationType: Event)...`);
      
      await CanvasRepository.update(canvas_id, { status: "COMPILING" }).catch(() => null);

      await lambdaClient.send(
        new InvokeCommand({
          FunctionName: workerFunctionName,
          InvocationType: "Event", // Asynchronous background invocation
          Payload: Buffer.from(JSON.stringify(body)),
        })
      );

      console.log(`[Lambda:compile:dispatcher] ⚡ Despacho completado. Retornando HTTP 202 Accepted en <100ms.`);
      return {
        statusCode: 202,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          statusCode: 202,
          status: "COMPILING",
          canvas_id: canvas_id,
          message: "Compilation task enqueued successfully.",
        }),
      };
    }

    // Direct synchronous fallback (for local unit tests or unlinked worker)
    console.log(`[Lambda:compile:dispatcher] ⚠️ CompilerWorker no vinculado como recurso SST. Ejecutando síncronamente como fallback...`);
    const workerResult: any = await compileWorkerHandler(event, context, callback);
    if (workerResult && typeof workerResult === "object" && "statusCode" in workerResult) {
      return workerResult;
    }
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(workerResult),
    };
  } catch (error: any) {
    console.error("[Lambda:compile:dispatcher] 💥 Error en el dispatcher de compilación:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Failed to dispatch compilation task.",
        details: error?.message || String(error),
      }),
    };
  }
};
