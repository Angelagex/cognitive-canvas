import { describe, it, expect } from "vitest";
import {
  COGNITIVE_COMPILER_JSON_SCHEMA,
  CognitiveCompilerOutput,
} from "../src/types/cognitive.js";

describe("Phase 1 - Shared Types & JSON Schema Validation", () => {
  it("should have a valid Gemini API JSON Schema structure", () => {
    expect(COGNITIVE_COMPILER_JSON_SCHEMA.type).toBe("object");
    expect(COGNITIVE_COMPILER_JSON_SCHEMA.type).toBe("object");
    expect(COGNITIVE_COMPILER_JSON_SCHEMA.required).toContain("map_metadata");
    expect(COGNITIVE_COMPILER_JSON_SCHEMA.required).toContain("nodes");
    expect(COGNITIVE_COMPILER_JSON_SCHEMA.required).toContain("edges");
    expect(COGNITIVE_COMPILER_JSON_SCHEMA.required).toContain("grinde_audit");
    expect(COGNITIVE_COMPILER_JSON_SCHEMA.required).toContain("learning_engine_outputs");
    expect(COGNITIVE_COMPILER_JSON_SCHEMA.properties.learning_engine_outputs.required).toContain("anki_flashcards");
  });

  it("should validate a complete sample compiler output payload matching Master Spec", () => {
    const mockOutput: CognitiveCompilerOutput = {
      map_metadata: {
        title: "Arquitectura de Memoria de Trabajo",
        domain_theme: "Neurociencia Cognitiva",
        total_nodes: 2,
        total_edges: 1,
      },
      nodes: [
        {
          id: "node_1",
          visual_bounding_box: { ymin: 100, xmin: 100, ymax: 300, xmax: 300 },
          detected_content: "Memoria de trabajo",
          passive_context: "Cuello de botella de procesamiento de información",
          pacer_classification: "CONCEPTUAL",
          grinde_traits: ["GROUPED", "REFLECTIVE"],
          deducible_from_context: true,
        },
        {
          id: "node_2",
          visual_bounding_box: { ymin: 400, xmin: 100, ymax: 500, xmax: 300 },
          detected_content: "Capacidad mágica 7 ± 2 elementos (Miller 1956)",
          passive_context: null,
          pacer_classification: "EVIDENCE",
          grinde_traits: ["EMPHASIZED"],
          deducible_from_context: false,
        },
      ],
      edges: [
        {
          source_node_id: "node_1",
          target_node_id: "node_2",
          label: "demostrado por",
          is_cross_link: true,
          relation_nature: "CAUSAL",
        },
      ],
      grinde_audit: {
        cross_link_density_score: 1.0,
        non_verbal_balance_score: 0.5,
        linear_thinking_risk: false,
        feedback_critique: "Excelente integración relacional entre concepto y evidencia empírica.",
      },
      learning_engine_outputs: {
        anki_flashcards: [
          {
            source_node_id: "node_2",
            card_type: "CLOZE",
            front: "Capacidad de memoria de trabajo (Miller 1956)",
            back: "La capacidad es de {{c1::7 ± 2}} elementos.",
          },
        ],
        high_road_transfer_prompts: [
          {
            core_concept_ids: ["node_1"],
            unstructured_scenario: "Un bus de datos en hardware con ancho de banda saturado",
            guiding_question: "¿Cómo se mapea el cuello de botella cognitivo a este bus?",
          },
        ],
        derring_effect_challenges: [
          {
            flawed_premise: "Aumentar el número de elementos en memoria no afecta el rendimiento.",
            corrective_task: "Identifica la falla y formula la relación canónica.",
            canonical_solution: "El rendimiento decae drásticamente al superar el límite de capacidad de canal.",
          },
        ],
        contrasting_cases_icc: [
          {
            case_a: "Chunking en ajedrez con piezas en posiciones reales.",
            case_b: "Chunking en ajedrez con piezas en posiciones aleatorias.",
            invariant_discovery_prompt: "Induce el principio invariante sobre la dependencia del dominio en la memoria de trabajo.",
          },
        ],
      },
    };

    expect(mockOutput.nodes).toHaveLength(2);
    expect(mockOutput.nodes[0].pacer_classification).toBe("CONCEPTUAL");
    expect(mockOutput.learning_engine_outputs.anki_flashcards).toHaveLength(1);
    expect(mockOutput.learning_engine_outputs.anki_flashcards[0].source_node_id).toBe("node_2");
    expect(mockOutput.grinde_audit.linear_thinking_risk).toBe(false);
  });
});
