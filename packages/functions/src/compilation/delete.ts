import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { CompilationRepository } from "@cognitive-canvas/core/compilation";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const id = event.pathParameters?.id;
    if (!id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing id parameter" }),
      };
    }
    await CompilationRepository.delete(id);
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
