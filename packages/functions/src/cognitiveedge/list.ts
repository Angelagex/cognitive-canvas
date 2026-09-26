import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { CognitiveEdgeRepository } from "@cognitive-canvas/core/cognitiveedge";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const limit = event.queryStringParameters?.limit
      ? parseInt(event.queryStringParameters.limit)
      : 10;
    const cursor = event.queryStringParameters?.cursor;
    const result = await CognitiveEdgeRepository.list(limit, cursor);
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
