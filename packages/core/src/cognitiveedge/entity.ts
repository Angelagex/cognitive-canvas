import { Entity } from "electrodb";
import { Resource } from "sst";
import { client } from "../database";
import { baseAttributes } from "../entities/base";

export const CognitiveEdgeEntity = new Entity(
  {
    model: {
      entity: "cognitiveedge",
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
      sourceNodeId: {
        type: "string",
        required: true,
      },
      targetNodeId: {
        type: "string",
        required: true,
      },
      label: {
        type: "string",
        required: true,
      },
      isCrossLink: {
        type: "boolean",
        required: true,
      },
      relationNature: {
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
    },
  },
  { client, table: (Resource as any)?.Database?.name || "CognitiveCanvasTable" }
);
