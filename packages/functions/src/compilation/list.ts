import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { CompilationRepository } from "@cognitive-canvas/core/compilation";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const canvasId = event.queryStringParameters?.canvasId || "";
    const result = await CompilationRepository.listByCanvas(canvasId);
    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
