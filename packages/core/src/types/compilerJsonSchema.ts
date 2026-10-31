/**
 * Formal JSON Schema for Gemini Structured Outputs
 */
export const COMPILER_JSON_SCHEMA = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "MacroCognitiveEvaluation",
  type: "object",
  properties: {
    map_overview: {
      type: "object",
      properties: {
        core_theme: { type: "string" },
        maturity_level: { type: "integer", enum: [1, 2, 3, 4] },
        maturity_diagnosis: {
          type: "string",
          description: "Diagnóstico de por qué está en este nivel (máximo 2 oraciones).",
        },
        bridge_to_next_level: {
          type: "string",
          description: "Acción relacional concreta para subir de nivel.",
        },
      },
      required: ["core_theme", "maturity_level", "maturity_diagnosis", "bridge_to_next_level"],
    },
    macro_islands: {
      type: "array",
      description: "Lista de las principales regiones conceptuales identificadas.",
      items: {
        type: "object",
        properties: {
          island_name: { type: "string" },
          associated_entity_ids: { type: "array", items: { type: "string" } },
          is_isolated: {
            type: "boolean",
            description: "True si carece de enlaces cruzados con otras islas.",
          },
        },
        required: ["island_name", "associated_entity_ids", "is_isolated"],
      },
    },
    pedagogical_interventions: {
      type: "object",
      properties: {
        procedural_zones: {
          type: "array",
          items: {
            type: "object",
            properties: {
              zone_name: { type: "string" },
              entity_ids: { type: "array", items: { type: "string" } },
              deliberate_practice_prompt: { type: "string" },
            },
            required: ["zone_name", "entity_ids", "deliberate_practice_prompt"],
          },
        },
        relational_anchoring_suggestions: {
          type: "array",
          description:
            "Datos de referencia o evidencia que el usuario debería conectar mejor en el mapa en lugar de memorizarlos.",
          items: {
            type: "object",
            properties: {
              target_content: { type: "string" },
              suggested_connection: { type: "string" },
            },
            required: ["target_content", "suggested_connection"],
          },
        },
        anki_exceptions: {
          type: "array",
          description:
            "Únicamente datos no deducibles que no pueden integrarse al mapa (máximo 2).",
          items: {
            type: "object",
            properties: {
              front: { type: "string" },
              back: { type: "string" },
              why_not_deducible: { type: "string" },
            },
            required: ["front", "back", "why_not_deducible"],
          },
        },
      },
      required: ["procedural_zones", "relational_anchoring_suggestions", "anki_exceptions"],
    },
    high_order_retrieval: {
      type: "object",
      properties: {
        cross_island_causal_question: { type: "string" },
        high_road_transfer: {
          type: "object",
          properties: {
            unstructured_scenario: { type: "string" },
            guiding_question: { type: "string" },
          },
          required: ["unstructured_scenario", "guiding_question"],
        },
        derring_effect: {
          type: "object",
          properties: {
            flawed_premise: { type: "string" },
            challenge_prompt: { type: "string" },
            canonical_resolution: { type: "string" },
          },
          required: ["flawed_premise", "challenge_prompt", "canonical_resolution"],
        },
      },
      required: ["cross_island_causal_question", "high_road_transfer", "derring_effect"],
    },
  },
  required: [
    "map_overview",
    "macro_islands",
    "pedagogical_interventions",
    "high_order_retrieval",
  ],
} as const;

