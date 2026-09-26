import { bucket, database } from "./storage";

export const myApi = new sst.aws.ApiGatewayV2("MyApi", {
  link: [bucket, database],
});

myApi.route("GET /", "packages/functions/src/api.handler");
myApi.route("POST /canvases", "packages/functions/src/canvas/create.handler");
myApi.route("GET /canvases/{id}", "packages/functions/src/canvas/get.handler");
myApi.route("PUT /canvases/{id}", "packages/functions/src/canvas/update.handler");
myApi.route("DELETE /canvases/{id}", "packages/functions/src/canvas/delete.handler");
myApi.route("GET /canvases", "packages/functions/src/canvas/list.handler");
