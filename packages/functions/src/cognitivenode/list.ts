import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { CognitiveNodeRepository } from "@cognitive-canvas/core/cognitivenode";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const compilationId = event.queryStringParameters?.compilationId;
    const canvasId = event.queryStringParameters?.canvasId;
    const result = compilationId
      ? await CognitiveNodeRepository.listByCompilation(compilationId)
      : await CognitiveNodeRepository.listByCanvas(canvasId || "");
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
