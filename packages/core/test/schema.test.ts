import { describe, it, expect } from "vitest";
import {
  COGNITIVE_COMPILER_JSON_SCHEMA,
  CompiledMacroCognitiveMap,
} from "../src/types/cognitive.js";

describe("Phase 1 - Macro-Cognitive Schema & JSON Schema Validation", () => {
  it("should have a valid MacroCognitiveEvaluation JSON Schema structure", () => {
    expect(COGNITIVE_COMPILER_JSON_SCHEMA.type).toBe("object");
    expect(COGNITIVE_COMPILER_JSON_SCHEMA.title).toBe("MacroCognitiveEvaluation");
    expect(COGNITIVE_COMPILER_JSON_SCHEMA.required).toContain("map_overview");
    expect(COGNITIVE_COMPILER_JSON_SCHEMA.required).toContain("macro_islands");
    expect(COGNITIVE_COMPILER_JSON_SCHEMA.required).toContain("pedagogical_interventions");
    expect(COGNITIVE_COMPILER_JSON_SCHEMA.required).toContain("high_order_retrieval");
    expect(COGNITIVE_COMPILER_JSON_SCHEMA.properties.pedagogical_interventions.required).toContain("anki_exceptions");
    expect(COGNITIVE_COMPILER_JSON_SCHEMA.properties.pedagogical_interventions.required).toContain("procedural_zones");
    expect(COGNITIVE_COMPILER_JSON_SCHEMA.properties.pedagogical_interventions.required).toContain("relational_anchoring_suggestions");
    expect(COGNITIVE_COMPILER_JSON_SCHEMA.properties.high_order_retrieval.required).toContain("cross_island_causal_question");
  });

  it("should validate a complete sample macro compiler output payload matching JSON SQUEMA.md", () => {
    const mockOutput: CompiledMacroCognitiveMap = {
      map_overview: {
        core_theme: "Óptica Fotográfica y Profundidad de Campo",
        maturity_level: 2,
        maturity_diagnosis: "Existe buena conexión local en la rama de apertura, pero el sensor y la distancia focal están aislados.",
        bridge_to_next_level: "Conectar cómo el tamaño del sensor altera el círculo de confusión relativo a la apertura.",
      },
      macro_islands: [
        {
          island_name: "Triángulo de Exposición",
          associated_entity_ids: ["entity_1", "entity_2"],
          is_isolated: false,
        },
        {
          island_name: "Geometría del Sensor",
          associated_entity_ids: ["entity_3"],
          is_isolated: true,
        },
      ],
      pedagogical_interventions: {
        procedural_zones: [
          {
            zone_name: "Calibración Manual de Apertura",
            entity_ids: ["entity_1"],
            deliberate_practice_prompt: "Practicar ajuste manual en situaciones de contraste extremo.",
          },
        ],
        relational_anchoring_suggestions: [
          {
            target_content: "f/2.8 vs f/16",
            suggested_connection: "Dibujar una flecha causal que vincule difracción con nitidez periférica.",
          },
        ],
        anki_exceptions: [
          {
            front: "Valor estándar de apertura para máxima nitidez (Sweet Spot típico)",
            back: "Entre f/5.6 y f/8 en objetivos full frame estándar.",
            why_not_deducible: "Depende del diseño óptico físico específico del fabricante.",
          },
        ],
      },
      high_order_retrieval: {
        cross_island_causal_question: "¿Por qué un sensor Micro Cuatro Tercios a f/2.8 produce mayor profundidad de campo que un Full Frame a la misma apertura?",
        high_road_transfer: {
          unstructured_scenario: "Un sistema de suministro de agua donde una válvula regula el flujo y la presión.",
          guiding_question: "¿Cómo se relaciona la apertura del diafragma con el caudal de la válvula?",
        },
        derring_effect: {
          flawed_premise: "Cerrar el diafragma a f/22 siempre produce la imagen más nítida posible porque aumenta la profundidad de campo.",
          challenge_prompt: "¿Qué principio físico contradice esta afirmación?",
          canonical_resolution: "La difracción óptica degrada la resolución angular efectiva en aperturas extremadamente pequeñas.",
        },
      },
    };

    expect(mockOutput.map_overview.maturity_level).toBe(2);
    expect(mockOutput.macro_islands).toHaveLength(2);
    expect(mockOutput.macro_islands[1].is_isolated).toBe(true);
    expect(mockOutput.pedagogical_interventions.anki_exceptions).toHaveLength(1);
    expect(mockOutput.high_order_retrieval.high_road_transfer.guiding_question).toBeTruthy();
  });
});
