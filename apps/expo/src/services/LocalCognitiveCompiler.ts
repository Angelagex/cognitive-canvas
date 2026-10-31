import {
  VisualAST,
  CognitiveCompilerOutput,
  CompiledNode,
  CompiledEdge,
  PacerClassification,
  RelationNature,
  AnkiFlashcard,
  HighRoadTransferPrompt,
  DerringEffectChallenge,
  CanvasCompiledPayload,
  KnowledgeNode,
  KnowledgeEdge,
  ConceptTier,
} from "@cognitive-canvas/core/types";
import { PlacedAttribute, ThinkingMemo } from "../types/canvas";
import { slugifyConcept, inferConceptDomain } from "./CompiledGraphStorage";

export interface LocalCompileInput {
  canvasId: string;
  title: string;
  visualAST: VisualAST | null;
  placedAttributes: PlacedAttribute[];
  thinkingMemos?: ThinkingMemo[];
}

export function buildPassiveContextDictionary(
  visualAST: VisualAST | null,
  placedAttributes: PlacedAttribute[]
): Record<string, string> {
  const dict: Record<string, string> = {};
  if (!placedAttributes?.length || !visualAST?.entities) return dict;

  for (const attr of placedAttributes) {
    const memoText = attr.thinkingMemo?.transcript
      ? `[Thinking Memo]: ${attr.thinkingMemo.transcript}`
      : "";
    const fullText = [attr.title, attr.note, memoText].filter(Boolean).join(" — ");
    let closestEntityId: string | null = null;
    let minDistance = 180;

    for (const entity of visualAST.entities) {
      const cx = (entity.bbox.xmin + entity.bbox.xmax) / 2;
      const cy = (entity.bbox.ymin + entity.bbox.ymax) / 2;
      const dist = Math.hypot(attr.worldX - cx, attr.worldY - cy);
      if (dist < minDistance) {
        minDistance = dist;
        closestEntityId = entity.id;
      }
    }
    if (closestEntityId && !dict[closestEntityId]) dict[closestEntityId] = fullText;
  }
  return dict;
}

function classifyPacer(entity: any, passiveText?: string | null): PacerClassification {
  const text = (passiveText || "").toLowerCase();
  const transcribed = (entity.transcribed_text || "").toLowerCase();
  if (text.includes("analog") || text.includes("metáfora") || entity.type === "SKETCH_ICON") return "ANALOGOUS";
  if (text.includes("fórmula") || text.includes("evidencia") || text.includes("experimento")) return "EVIDENCE";
  if (text.includes("definición") || text.includes("término") || text.includes("referencia")) return "REFERENCE";
  if (text.includes("paso") || text.includes("flujo") || transcribed.includes("paso")) return "PROCEDURAL";
  return "CONCEPTUAL";
}

export function buildLayeredGraphPayload(
  canvasId: string,
  canvasTitle: string,
  nodes: CompiledNode[],
  edges: CompiledEdge[],
  placedAttributes: PlacedAttribute[]
): CanvasCompiledPayload {
  const knowledgeNodes: KnowledgeNode[] = nodes.map((n, idx) => {
    const tier: ConceptTier =
      n.pacer_classification === "REFERENCE" || n.pacer_classification === "EVIDENCE"
        ? "primitive"
        : n.pacer_classification === "PROCEDURAL"
        ? "mechanism"
        : idx % 3 === 0
        ? "system"
        : idx % 2 === 0
        ? "mechanism"
        : "primitive";
    const matchingAttr = placedAttributes.find(
      (a) => a.title.toLowerCase() === n.detected_content.toLowerCase() || Boolean(a.thinkingMemo)
    );
    return {
      id: slugifyConcept(n.detected_content),
      label: n.detected_content,
      domain: inferConceptDomain(n.detected_content, canvasTitle),
      tier,
      verificationState: matchingAttr?.thinkingMemo ? "verified" : "unverified",
      provenance: [
        {
          canvasId,
          canvasTitle,
          boundingBox: {
            minX: n.visual_bounding_box.xmin,
            minY: n.visual_bounding_box.ymin,
            maxX: n.visual_bounding_box.xmax,
            maxY: n.visual_bounding_box.ymax,
          },
        },
      ],
      summary: matchingAttr?.thinkingMemo?.transcript || n.passive_context || `Concepto compilado en ${canvasTitle}.`,
      consolidatedRef: matchingAttr?.consolidatedRef,
    };
  });

  const knowledgeEdges: KnowledgeEdge[] = edges.map((e, idx) => {
    const src = nodes.find((n) => n.id === e.source_node_id);
    const tgt = nodes.find((n) => n.id === e.target_node_id);
    return {
      id: `kedge_${canvasId}_${idx}`,
      fromNodeId: slugifyConcept(src?.detected_content || e.source_node_id),
      toNodeId: slugifyConcept(tgt?.detected_content || e.target_node_id),
      type:
        e.relation_nature === "OPPOSITION_CONTRAST"
          ? "INHIBITS"
          : e.relation_nature === "CONDITIONAL"
          ? "PREREQUISITE_OF"
          : "TRIGGERS",
      reasoning: e.label || "Relación causal derivada del lienzo y Thinking Memos.",
      confidence: 0.88,
    };
  });

  return { canvasId, canvasTitle, compiledAt: Date.now(), nodes: knowledgeNodes, edges: knowledgeEdges };
}

export function compileMapLocally(params: LocalCompileInput): CognitiveCompilerOutput {
  const { canvasId, title, visualAST, placedAttributes } = params;
  const passiveDict = buildPassiveContextDictionary(visualAST, placedAttributes);
  const rawEntities = visualAST?.entities || [];
  const rawConnectors = visualAST?.connectors || [];

  const nodes: CompiledNode[] = rawEntities.map((entity, index) => {
    const passiveText = passiveDict[entity.id] || entity.passive_context || null;
    const pacer = classifyPacer(entity, passiveText);
    return {
      id: entity.id,
      visual_bounding_box: { ...entity.bbox },
      detected_content: entity.transcribed_text?.trim() || `Concepto ${index + 1}`,
      passive_context: passiveText,
      pacer_classification: pacer,
      grinde_traits: ["INTERCONNECTED"],
      deducible_from_context: pacer === "CONCEPTUAL" || pacer === "PROCEDURAL" || pacer === "ANALOGOUS",
    };
  });

  if (nodes.length === 0) {
    const firstAttr = placedAttributes[0];
    nodes.push({
      id: "node_root",
      visual_bounding_box: { ymin: 100, xmin: 100, ymax: 300, xmax: 500 },
      detected_content: title || "Tema Central",
      passive_context: firstAttr
        ? [firstAttr.title, firstAttr.note, firstAttr.thinkingMemo?.transcript].filter(Boolean).join(": ")
        : null,
      pacer_classification: "CONCEPTUAL",
      grinde_traits: ["GROUPED", "REFLECTIVE"],
      deducible_from_context: true,
    });
  }

  const edges: CompiledEdge[] = rawConnectors
    .filter((conn) => Boolean(conn.source_entity_id && conn.target_entity_id))
    .map((conn) => ({
      source_node_id: conn.source_entity_id as string,
      target_node_id: conn.target_entity_id as string,
      label: conn.label || "impulsa causalmente",
      is_cross_link: false,
      relation_nature: (conn.type === "INHIBITION" ? "OPPOSITION_CONTRAST" : "CAUSAL") as RelationNature,
    }));

  const totalEdges = edges.length;
  const crossLinks = visualAST?.topology_metrics?.cross_link_count ?? 0;
  const crossLinkDensity = totalEdges > 0 ? Number((crossLinks / totalEdges).toFixed(2)) : 0;
  const linearThinkingRisk = nodes.length >= 3 && crossLinkDensity < 0.2;
  const feedbackCritique = linearThinkingRisk
    ? "Riesgo de pensamiento lineal detectado. Agrega enlaces cruzados entre ramas distantes."
    : "Integración relacional sólida con mecanismos causales explícitos.";

  const ankiFlashcards: AnkiFlashcard[] = nodes
    .filter((n) => !n.deducible_from_context)
    .map((n) => ({
      source_node_id: n.id,
      target_node_id: n.id,
      card_type: "CLOZE",
      front: `Dato en ${title}`,
      back: n.detected_content,
      cloze_text: `En ${title}, el dato clave es {{c1::${n.detected_content}}}.`,
    }));

  const highRoadPrompts: HighRoadTransferPrompt[] = [
    {
      core_concept_ids: [nodes[0].id],
      unstructured_scenario: "Un sistema distribuido sometido a particiones y alta latencia.",
      guiding_question: `¿Cómo opera el mecanismo de "${nodes[0].detected_content}" bajo contrapresión extrema?`,
    },
  ];

  const derringChallenges: DerringEffectChallenge[] = [
    {
      flawed_premise: `Anular "${nodes[0].detected_content}" mantiene intacto el estado aguas abajo.`,
      challenge_prompt: "Identifica la tensión causal que contradice esta premisa.",
      canonical_resolution: "El acoplamiento causal exige que la precondición se cumpla.",
    },
  ];

  return {
    map_overview: {
      core_theme: title || "Esquema Cognitivo",
      maturity_level: linearThinkingRisk ? 1 : 3,
      maturity_diagnosis: feedbackCritique,
      bridge_to_next_level: "Conecta cúmulos distantes mediante aristas causales verificadas.",
    },
    macro_islands: [{ island_name: "Cúmulo Conceptual", associated_entity_ids: nodes.map((n) => n.id), is_isolated: false }],
    pedagogical_interventions: { procedural_zones: [], relational_anchoring_suggestions: [], anki_exceptions: [] },
    high_order_retrieval: {
      cross_island_causal_question: "¿Qué ocurre en el sistema si el nodo intermedio sufre inanición o bloqueo?",
      high_road_transfer: highRoadPrompts[0],
      derring_effect: derringChallenges[0],
    },
    map_metadata: { title: title || "Mapa Mental", domain_theme: "Cognitive Knowledge Map", total_nodes: nodes.length, total_edges: edges.length },
    nodes,
    edges,
    grinde_audit: {
      cross_link_density_score: crossLinkDensity,
      non_verbal_balance_score: 0.65,
      linear_thinking_risk: linearThinkingRisk,
      feedback_critique: feedbackCritique,
    },
    learning_engine_outputs: {
      anki_flashcards: ankiFlashcards,
      high_road_transfer_prompts: highRoadPrompts,
      derring_effect_challenges: derringChallenges,
      contrasting_cases_icc: [],
    },
    anki_flashcards: ankiFlashcards,
    high_road_transfer_prompts: highRoadPrompts,
    derring_effect_challenges: derringChallenges,
    contrasting_cases_icc: [],
    compiled_graph_payload: buildLayeredGraphPayload(canvasId, title, nodes, edges, placedAttributes),
  };
}
