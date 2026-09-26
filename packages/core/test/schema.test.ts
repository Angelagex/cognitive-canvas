import { describe, it, expect } from "vitest";
import {
  COGNITIVE_COMPILER_JSON_SCHEMA,
  CognitiveCompilerOutput,
} from "../src/types/cognitive.js";

describe("Phase 1 - Shared Types & JSON Schema Validation", () => {
  it("should have a valid Gemini API JSON Schema structure", () => {
    expect(COGNITIVE_COMPILER_JSON_SCHEMA.type).toBe("object");
    expect(COGNITIVE_COMPILER_JSON_SCHEMA.required).toContain("nodes");
    expect(COGNITIVE_COMPILER_JSON_SCHEMA.required).toContain("edges");
    expect(COGNITIVE_COMPILER_JSON_SCHEMA.required).toContain("grinde_audit");
    expect(COGNITIVE_COMPILER_JSON_SCHEMA.required).toContain("anki_flashcards");
  });

  it("should validate a complete sample compiler output payload", () => {
    const mockOutput: CognitiveCompilerOutput = {
      nodes: [
        {
          id: "node_1",
          visual_bounding_box: [100, 100, 300, 300],
          detected_content: "Memoria de trabajo",
          passive_context: "Cuello de botella de procesamiento de información",
          pacer_classification: "CONCEPTUAL",
          deducible_from_context: true,
        },
        {
          id: "node_2",
          visual_bounding_box: [400, 100, 500, 300],
          detected_content: "Capacidad mágica 7 ± 2 elementos (Miller 1956)",
          passive_context: null,
          pacer_classification: "EVIDENCE",
          deducible_from_context: false,
        },
      ],
      edges: [
        {
          source_node_id: "node_1",
          target_node_id: "node_2",
          label: "demostrado por",
          is_cross_link: true,
          relation_nature: "causal",
        },
      ],
      grinde_audit: {
        cross_link_density_score: 1.0,
        linear_thinking_risk: false,
        feedback_critique: "Excelente integración relacional entre concepto y evidencia empírica.",
      },
      anki_flashcards: [
        {
          target_node_id: "node_2",
          card_type: "CLOZE",
          cloze_text: "La capacidad de la memoria de trabajo según Miller (1956) es de {{c1::7 ± 2}} elementos.",
          deck_name: "CognitiveCanvas::PsicologiaCognitiva",
        },
      ],
      high_road_transfer_prompts: [
        "¿Cómo se manifiesta la restricción de memoria de trabajo en la arquitectura de un bus de datos en computación?",
      ],
      derring_effect_challenges: [
        "Un estudiante afirma que aumentar el número de elementos en la memoria de trabajo no afecta el rendimiento. Identifica el error conceptual.",
      ],
      contrasting_cases_icc: [
        {
          case_a: "Caso A: Chunking en ajedrez con piezas en posiciones reales.",
          case_b: "Caso B: Chunking en ajedrez con piezas en posiciones aleatorias.",
          underlying_invariant_prompt: "Induce el principio invariante sobre la dependencia del dominio en la memoria de trabajo.",
        },
      ],
    };

    expect(mockOutput.nodes).toHaveLength(2);
    expect(mockOutput.nodes[0].pacer_classification).toBe("CONCEPTUAL");
    expect(mockOutput.anki_flashcards).toHaveLength(1);
    expect(mockOutput.anki_flashcards[0].target_node_id).toBe("node_2");
    expect(mockOutput.grinde_audit.linear_thinking_risk).toBe(false);
  });
});
