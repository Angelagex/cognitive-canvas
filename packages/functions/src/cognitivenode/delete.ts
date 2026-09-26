import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { CognitiveNodeRepository } from "@cognitive-canvas/core/cognitivenode";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const id = event.pathParameters?.id;
    if (!id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing id parameter" }),
      };
    }
    await CognitiveNodeRepository.delete(id);
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
