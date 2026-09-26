import { Entity } from "electrodb";
import { Resource } from "sst";
import { client } from "../database";
import { baseAttributes } from "../entities/base";

export const CompilationEntity = new Entity(
  {
    model: {
      entity: "compilation",
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
      feedbackCritique: {
        type: "string",
        required: true,
      },
      linearThinkingRisk: {
        type: "boolean",
        required: true,
      },
      crossLinkDensityScore: {
        type: "number",
        required: true,
      },
      rawOutputJson: {
        type: "string",
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
      byCanvas: {
        index: "gsi1",
        pk: {
          field: "gsi1pk",
          composite: ["canvasId"],
        },
        sk: {
          field: "gsi1sk",
          composite: ["id"],
        },
      },
    },
  },
  { client, table: (Resource as any)?.Database?.name || "CognitiveCanvasTable" }
);
