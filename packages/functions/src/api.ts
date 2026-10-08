import { Resource } from "sst";
import { Handler } from "aws-lambda";
import { Example } from "@cognitive-canvas/core/example";

export const handler: Handler = async (_event) => {
  return {
    statusCode: 200,
    body: `${Example.hello()} Linked to ${(Resource as any)?.MyBucket?.name || "Bucket"}.`,
  };
};
