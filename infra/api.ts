import { bucket, database, compilationJobsTable } from "./storage";

export const compileWorker = new sst.aws.Function("CompileWorker", {
  handler: "packages/functions/src/workers/compileWorker.handler",
  link: [bucket, database, compilationJobsTable],
  timeout: "120 seconds",
  memory: "1024 MB",
  environment: {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
  },
});

export const compilerWorker = compileWorker;

export const myApi = new sst.aws.ApiGatewayV2("MyApi", {
  link: [bucket, database, compilationJobsTable, compileWorker],
});

myApi.route("GET /", "packages/functions/src/api.handler");

// Cognitive Compiler Asynchronous Pipeline
myApi.route("POST /compile", {
  handler: "packages/functions/src/api/startCompile.handler",
  timeout: "10 seconds",
  memory: "512 MB",
  link: [compilationJobsTable, compileWorker],
});

myApi.route("POST /canvases/{id}/compile", {
  handler: "packages/functions/src/api/startCompile.handler",
  timeout: "10 seconds",
  memory: "512 MB",
  link: [compilationJobsTable, compileWorker],
});

myApi.route("GET /compile/status/{jobId}", {
  handler: "packages/functions/src/api/getCompileStatus.handler",
  timeout: "10 seconds",
  memory: "512 MB",
  link: [compilationJobsTable],
});

// Canvas Compilation Status & Output Polling Endpoint
myApi.route("GET /canvases/{id}/compilation", "packages/functions/src/compilation/getByCanvas.handler");

// S3 Pre-Signed Upload URL Endpoint for Canvas PNG Captures
myApi.route("POST /canvases/{id}/upload-url", "packages/functions/src/uploadUrl.handler");
myApi.route("GET /canvases/{id}/upload-url", "packages/functions/src/uploadUrl.handler");

// Canvas Entity Routes
myApi.route("POST /canvases", "packages/functions/src/canvas/create.handler");
myApi.route("GET /canvases/{id}", "packages/functions/src/canvas/get.handler");
myApi.route("PUT /canvases/{id}", "packages/functions/src/canvas/update.handler");
myApi.route("DELETE /canvases/{id}", "packages/functions/src/canvas/delete.handler");
myApi.route("GET /canvases", "packages/functions/src/canvas/list.handler");

// Compilation Entity Routes
myApi.route("POST /compilations", "packages/functions/src/compilation/create.handler");
myApi.route("GET /compilations/{id}", "packages/functions/src/compilation/get.handler");
myApi.route("PUT /compilations/{id}", "packages/functions/src/compilation/update.handler");
myApi.route("DELETE /compilations/{id}", "packages/functions/src/compilation/delete.handler");
myApi.route("GET /compilations", "packages/functions/src/compilation/list.handler");

// CognitiveNode Entity Routes
myApi.route("POST /cognitivenodes", "packages/functions/src/cognitivenode/create.handler");
myApi.route("GET /cognitivenodes/{id}", "packages/functions/src/cognitivenode/get.handler");
myApi.route("PUT /cognitivenodes/{id}", "packages/functions/src/cognitivenode/update.handler");
myApi.route("DELETE /cognitivenodes/{id}", "packages/functions/src/cognitivenode/delete.handler");
myApi.route("GET /cognitivenodes", "packages/functions/src/cognitivenode/list.handler");

// CognitiveEdge Entity Routes
myApi.route("POST /cognitiveedges", "packages/functions/src/cognitiveedge/create.handler");
myApi.route("GET /cognitiveedges/{id}", "packages/functions/src/cognitiveedge/get.handler");
myApi.route("PUT /cognitiveedges/{id}", "packages/functions/src/cognitiveedge/update.handler");
myApi.route("DELETE /cognitiveedges/{id}", "packages/functions/src/cognitiveedge/delete.handler");
myApi.route("GET /cognitiveedges", "packages/functions/src/cognitiveedge/list.handler");

// Flashcard Entity Routes
myApi.route("POST /flashcards", "packages/functions/src/flashcard/create.handler");
myApi.route("GET /flashcards/{id}", "packages/functions/src/flashcard/get.handler");
myApi.route("PUT /flashcards/{id}", "packages/functions/src/flashcard/update.handler");
myApi.route("DELETE /flashcards/{id}", "packages/functions/src/flashcard/delete.handler");
myApi.route("GET /flashcards", "packages/functions/src/flashcard/list.handler");
