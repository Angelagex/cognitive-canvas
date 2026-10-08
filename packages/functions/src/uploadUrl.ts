import { Resource } from "sst";
import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({});

/**
 * Generates an S3 Pre-Signed PUT URL for uploading high-res canvas PNG captures
 * directly from client devices (Galaxy Tab S10 Lite), bypassing Lambda payload size limits.
 */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const canvasId = event.pathParameters?.id || event.queryStringParameters?.canvasId;

    if (!canvasId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing required 'id' path parameter (canvas ID)." }),
      };
    }

    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    const s3Key = `canvases/${canvasId}/canvas_${timestamp}_${randomSuffix}.png`;
    const bucketName = (Resource as any)?.MyBucket?.name || "CognitiveCanvasBucket";

    const putCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      ContentType: "image/png",
    });

    const expiresInSeconds = 300; // 5 minutes
    const uploadUrl = await getSignedUrl(s3, putCommand, { expiresIn: expiresInSeconds });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        upload_url: uploadUrl,
        s3_key: s3Key,
        expires_in_seconds: expiresInSeconds,
        bucket: bucketName,
      }),
    };
  } catch (error: any) {
    console.error("Presigned URL Generation Error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Failed to generate pre-signed upload URL.",
        details: error?.message || String(error),
      }),
    };
  }
};
