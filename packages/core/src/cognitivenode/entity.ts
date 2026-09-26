import { Entity } from "electrodb";
import { Resource } from "sst";
import { client } from "../database";
import { baseAttributes } from "../entities/base";

export const CognitiveNodeEntity = new Entity(
  {
    model: {
      entity: "cognitivenode",
      version: "1",
      service: "app",
    },
    attributes: {
      id: {
        type: "string",
        required: true,
      },
      canvasId: {
        type: "string",
        required: true,
      },
      compilationId: {
        type: "string",
        required: true,
      },
      pacerClassification: {
        type: ["PROCEDURAL", "ANALOGOUS", "CONCEPTUAL", "EVIDENCE", "REFERENCE"] as const,
        required: true,
      },
      detectedContent: {
        type: "string",
        required: true,
      },
      passiveContext: {
        type: "string",
        required: false,
      },
      boundingBoxJson: {
        type: "string",
        required: true,
      },
      deducibleFromContext: {
        type: "boolean",
        required: true,
      },
      ...baseAttributes,
    },
    indexes: {
      primary: {
        pk: {
          field: "pk",
          composite: ["id"],
        },
        sk: {
          field: "sk",
          composite: [],
        },
      },
      byCompilation: {
        index: "gsi1",
        pk: {
          field: "gsi1pk",
          composite: ["compilationId"],
        },
        sk: {
          field: "gsi1sk",
          composite: ["id"],
        },
      },
      byCanvas: {
        index: "gsi2",
        pk: {
          field: "gsi2pk",
          composite: ["canvasId"],
        },
        sk: {
          field: "gsi2sk",
          composite: ["id"],
        },
      },
    },
  },
  { client, table: (Resource as any)?.Database?.name || "CognitiveCanvasTable" }
);
