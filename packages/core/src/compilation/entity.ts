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
      name: {
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
    },
  },
  { client, table: Resource.Database.name }
);
