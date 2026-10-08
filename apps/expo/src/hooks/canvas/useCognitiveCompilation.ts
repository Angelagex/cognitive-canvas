import { useState, useCallback } from "react";
import { CognitiveCompilerOutput } from "@cognitive-canvas/core/types";

export const useCognitiveCompilation = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [compilation, setCompilation] = useState<CognitiveCompilerOutput | null>(null);

  const handleCompile = useCallback(() => {
    setIsCompiling(true);
    // Mock compilation grounding with Justin Sung GRINDE + PACER
    setTimeout(() => {
      setCompilation({
        map_metadata: {
          title: "Mapa Mental - Redes Neuronales",
          domain_theme: "Machine Learning / Deep Learning",
          total_nodes: 2,
          total_edges: 1,
        },
        nodes: [
          {
            id: "node_1",
            visual_bounding_box: { ymin: 100, xmin: 100, ymax: 200, xmax: 300 },
            detected_content: "Concepto Principal: Redes Neuronales",
            passive_context: null,
            pacer_classification: "CONCEPTUAL",
            deducible_from_context: true,
          },
          {
            id: "node_2",
            visual_bounding_box: { ymin: 300, xmin: 100, ymax: 400, xmax: 300 },
            detected_content: "Backpropagation algorithm v1.0",
            passive_context: "Fórmula de derivación en cadena",
            pacer_classification: "EVIDENCE",
            deducible_from_context: false,
          },
        ],
        edges: [
          {
            source_node_id: "node_1",
            target_node_id: "node_2",
            label: "calcula gradientes en",
            is_cross_link: true,
            relation_nature: "CAUSAL",
          },
        ],
        grinde_audit: {
          cross_link_density_score: 0.35,
          non_verbal_balance_score: 0.85,
          linear_thinking_risk: false,
          feedback_critique: "Excelente densidad de relaciones causales y cross-links no lineales.",
        },
        learning_engine_outputs: {
          anki_flashcards: [
            {
              source_node_id: "node_1",
              card_type: "CLOZE",
              front: "Backpropagation",
              back: "Calcula gradientes",
            },
          ],
          high_road_transfer_prompts: [
            {
              core_concept_ids: ["node_2"],
              unstructured_scenario: "Optimización de flujo en un sistema termodinámico cerrado.",
              guiding_question: "¿Cómo aplicarías la regla de la cadena de Backpropagation en la minimización de entropía?",
            },
          ],
          derring_effect_challenges: [
            {
              flawed_premise: "Aumentar la tasa de aprendizaje a 100 acelerará siempre la convergencia óptima.",
              corrective_task: "Explica cómo la divergencia de gradientes desestabiliza la superficie de pérdida.",
              canonical_solution: "Tasas excesivas provocan explosión de gradientes y oscilaciones fuera del mínimo local.",
            },
          ],
          contrasting_cases_icc: [
            {
              case_a: "Descenso de gradiente estocástico (SGD)",
              case_b: "Descenso de gradiente por lotes (Batch GD)",
              invariant_discovery_prompt: "Identifica el compromiso entre velocidad de convergencia y estabilidad en la superficie de pérdida.",
            },
          ],
        },
        anki_flashcards: [
          {
            source_node_id: "node_1",
            target_node_id: "node_2",
            card_type: "CLOZE",
            front: "Backpropagation",
            back: "Calcula gradientes",
            cloze_text: "Backpropagation calcula el {{c1::gradiente de la función de pérdida}} mediante la regla de la cadena.",
          },
        ],
        high_road_transfer_prompts: [
          "¿Cómo aplicarías la regla de la cadena de Backpropagation en la optimización de un sistema termodinámico?",
        ],
        derring_effect_challenges: [
          "Desafío: ¿Qué ocurre si la tasa de aprendizaje se establece en 100?",
        ],
        contrasting_cases_icc: [
          {
            case_a: "Descenso de gradiente estocástico (SGD)",
            case_b: "Descenso de gradiente por lotes (Batch GD)",
            underlying_invariant_prompt: "Identifica el compromiso entre velocidad de convergencia y estabilidad en la superficie de pérdida.",
          },
        ],
      });
      setIsCompiling(false);
      setIsDrawerOpen(true);
    }, 600);
  }, []);

  return {
    isDrawerOpen,
    setIsDrawerOpen,
    isCompiling,
    setIsCompiling,
    compilation,
    setCompilation,
    handleCompile,
  };
};
