import { Entity } from "electrodb";
import { Resource } from "sst";
import { client } from "../database";
import { baseAttributes } from "../entities/base";

export const FlashcardEntity = new Entity(
  {
    model: {
      entity: "flashcard",
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
      targetNodeId: {
        type: "string",
        required: true,
      },
      cardType: {
        type: ["BASIC", "CLOZE"] as const,
        required: true,
      },
      front: {
        type: "string",
        required: false,
      },
      back: {
        type: "string",
        required: false,
      },
      clozeText: {
        type: "string",
        required: false,
      },
      deckName: {
        type: "string",
        required: false,
      },
      syncedToAnki: {
        type: "boolean",
        default: false,
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
