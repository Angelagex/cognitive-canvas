import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { Resource } from "sst";

const ddb = new DynamoDBClient({});

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const jobId = event.pathParameters?.jobId;
  if (!jobId) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Missing jobId parameter" }),
    };
  }

  try {
    const res = await ddb.send(
      new GetItemCommand({
        TableName: Resource.CompilationJobs.name,
        Key: { jobId: { S: jobId } },
      })
    );

    if (!res.Item) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Job not found" }),
      };
    }

    const status = res.Item.status?.S || "unknown";

    if (status === "completed") {
      const result = JSON.parse(res.Item.result?.S || "{}");
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed", result }),
      };
    }

    if (status === "failed") {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "failed", error: res.Item.error?.S || "Job failed" }),
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "processing" }),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.message }),
    };
  }
};

