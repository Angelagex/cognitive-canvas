import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { Resource } from "sst";

const ddb = new DynamoDBClient({});
const lambda = new LambdaClient({});

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    if (!event.body) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing payload body" }),
      };
    }

    const payload = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    const apiKey =
      event.headers?.["x-gemini-api-key"] ||
      event.headers?.["X-Gemini-Api-Key"] ||
      event.headers?.["X-GEMINI-API-KEY"] ||
      payload.apiKey ||
      process.env.GEMINI_API_KEY ||
      "";

    if (!apiKey) {
      return {
        statusCode: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Unauthorized: Missing x-gemini-api-key header." }),
      };
    }

    const canvasId = payload.canvasId || payload.canvas_id || event.pathParameters?.id || "";
    payload.canvasId = canvasId;
    payload.canvas_id = canvasId;

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + 86400; // 24 horas

    // 1. Guardar estado inicial en DynamoDB
    await ddb.send(
      new PutItemCommand({
        TableName: Resource.CompilationJobs.name,
        Item: {
          jobId: { S: jobId },
          status: { S: "processing" },
          canvasId: { S: canvasId },
          createdAt: { N: now.toString() },
          expiresAt: { N: expiresAt.toString() },
        },
      })
    );

    // 2. Invocar worker en segundo plano de forma asíncrona (Event)
    await lambda.send(
      new InvokeCommand({
        FunctionName: Resource.CompileWorker.name,
        InvocationType: "Event",
        Payload: Buffer.from(JSON.stringify({ jobId, payload, apiKey })),
      })
    );

    // 3. Responder de inmediato al cliente con 202 Accepted
    return {
      statusCode: 202,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, status: "processing", canvasId }),
    };
  } catch (error: any) {
    console.error("[startCompile] Error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.message || "Failed to start compilation job" }),
    };
  }
};

