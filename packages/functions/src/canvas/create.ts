import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { CanvasRepository } from "@cognitive-canvas/core/canvas";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    if (!body.id || !body.name) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required fields: id, name" }),
      };
    }
    const result = await CanvasRepository.create(body);
    return {
      statusCode: 201,
      body: JSON.stringify(result.data),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
