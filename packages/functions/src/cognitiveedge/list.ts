import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { CognitiveEdgeRepository } from "@cognitive-canvas/core/cognitiveedge";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const compilationId = event.queryStringParameters?.compilationId || "";
    const result = await CognitiveEdgeRepository.listByCompilation(compilationId);
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
