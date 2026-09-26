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
    const body = JSON.parse(event.body || "{}");
    const result = await CompilationRepository.update(id, body);
    return {
      statusCode: 200,
      body: JSON.stringify(result.data),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
