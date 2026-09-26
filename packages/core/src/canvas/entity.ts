import { Entity } from "electrodb";
import { Resource } from "sst";
import { client } from "../database";
import { baseAttributes } from "../entities/base";

export const CanvasEntity = new Entity(
  {
    model: {
      entity: "canvas",
      version: "1",
      service: "app",
    },
    attributes: {
      id: {
        type: "string",
        required: true,
      },
      name: {
        type: "string",
        required: true,
      },
      s3Key: {
        type: "string",
        required: false,
      },
      status: {
        type: ["DRAFT", "COMPILING", "COMPILED", "FAILED"] as const,
        default: "DRAFT",
      },
      crossLinkDensity: {
        type: "number",
        required: false,
      },
      linearThinkingRisk: {
        type: "boolean",
        required: false,
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
    },
  },
  { client, table: (Resource as any)?.Database?.name || "CognitiveCanvasTable" }
);

