import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { Resource } from "sst";
import { executeGeminiCompilation } from "../services/geminiService";

const ddb = new DynamoDBClient({});

export const handler = async (event: { jobId: string; payload: any; apiKey?: string }) => {
  const { jobId, payload, apiKey } = event;
  console.log(`[CompileWorker] Iniciando procesamiento para job: ${jobId}`);

  try {
    // 1. Ejecutar la llamada analítica a Gemini 3.8 Flash
    const compilationResult = await executeGeminiCompilation(payload, apiKey);

    // 2. Actualizar registro a completado con el payload estructurado
    await ddb.send(
      new UpdateItemCommand({
        TableName: Resource.CompilationJobs.name,
        Key: { jobId: { S: jobId } },
        UpdateExpression: "SET #st = :status, #res = :result, #compAt = :completedAt",
        ExpressionAttributeNames: {
          "#st": "status",
          "#res": "result",
          "#compAt": "completedAt",
        },
        ExpressionAttributeValues: {
          ":status": { S: "completed" },
          ":result": { S: JSON.stringify(compilationResult) },
          ":completedAt": { N: Math.floor(Date.now() / 1000).toString() },
        },
      })
    );
    console.log(`[CompileWorker] Job ${jobId} completado exitosamente.`);
    return { statusCode: 200, body: JSON.stringify({ jobId, status: "completed" }) };
  } catch (error: any) {
    console.error(`[CompileWorker] Error en job ${jobId}:`, error);
    await ddb.send(
      new UpdateItemCommand({
        TableName: Resource.CompilationJobs.name,
        Key: { jobId: { S: jobId } },
        UpdateExpression: "SET #st = :status, #err = :error",
        ExpressionAttributeNames: {
          "#st": "status",
          "#err": "error",
        },
        ExpressionAttributeValues: {
          ":status": { S: "failed" },
          ":error": { S: error.message || "Unknown error during compilation" },
        },
      })
    );
    return { statusCode: 500, body: JSON.stringify({ jobId, status: "failed", error: error.message }) };
  }
};

