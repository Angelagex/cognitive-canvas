import { bucket, database } from "./storage";

export const myApi = new sst.aws.ApiGatewayV2("MyApi", {
  link: [bucket, database],
});

myApi.route("GET /", "packages/functions/src/api.handler");
