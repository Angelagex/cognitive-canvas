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
  ContrastingCasesICC,
} from "@cognitive-canvas/core/types";
import { PlacedAttribute } from "../types/canvas";
import { exportHighResPng } from "../components/JetpackInkCanvas";
import * as FileSystem from "expo-file-system";

export interface CompileParams {
  canvasId: string;
  title: string;
  visualAST: VisualAST | null;
  placedAttributes: PlacedAttribute[];
  imageBase64?: string;
  apiUrl?: string;
}

/**
 * Builds a dictionary of passive context notes mapped by entity ID or proximity
 */
function buildPassiveContextDictionary(
  visualAST: VisualAST | null,
  placedAttributes: PlacedAttribute[]
): Record<string, string> {
  const dict: Record<string, string> = {};

  if (!placedAttributes || placedAttributes.length === 0) return dict;

  // Proximity mapping to AST entities
  if (visualAST?.entities) {
    for (const attr of placedAttributes) {
      const fullText = [attr.title, attr.note].filter(Boolean).join(": ");
      let closestEntityId: string | null = null;
      let minDistance = 180; // px tolerance

      for (const entity of visualAST.entities) {
        const cx = (entity.bbox.xmin + entity.bbox.xmax) / 2;
        const cy = (entity.bbox.ymin + entity.bbox.ymax) / 2;
        const dist = Math.hypot(attr.worldX - cx, attr.worldY - cy);
        if (dist < minDistance) {
          minDistance = dist;
          closestEntityId = entity.id;
        }
      }

      if (closestEntityId && !dict[closestEntityId]) {
        dict[closestEntityId] = fullText;
      }
    }
  }

  return dict;
}

/**
 * Derives PACER category from entity characteristics and passive context annotations
 */
function classifyPacer(entity: any, passiveText?: string | null): PacerClassification {
  const text = (passiveText || "").toLowerCase();
  const transcribed = (entity.transcribed_text || "").toLowerCase();

  if (
    text.includes("analog") ||
    text.includes("metáfora") ||
    text.includes("metafora") ||
    entity.type === "SKETCH_ICON"
  ) {
    return "ANALOGOUS";
  }
  if (
    text.includes("fórmula") ||
    text.includes("formula") ||
    text.includes("evidencia") ||
    text.includes("estudio") ||
    text.includes("métrica") ||
    text.includes("experimento")
  ) {
    return "EVIDENCE";
  }
  if (
    text.includes("definición") ||
    text.includes("definicion") ||
    text.includes("termino") ||
    text.includes("término") ||
    text.includes("referencia") ||
    text.includes("nombre")
  ) {
    return "REFERENCE";
  }
  if (
    text.includes("paso") ||
    text.includes("flujo") ||
    text.includes("algoritmo") ||
    text.includes("procedimiento") ||
    transcribed.includes("paso") ||
    transcribed.includes("fase")
  ) {
    return "PROCEDURAL";
  }
  if (entity.type === "CONTAINER_BOX" || (entity.child_ids && entity.child_ids.length > 0)) {
    return "CONCEPTUAL";
  }
  return "CONCEPTUAL";
}

/**
 * Local Semantic Graph Evaluator (Edge-based grounding for offline tablet use)
 * Follows Master Spec Section 7 & 8, Justin Sung GRINDE Audit and ADR 5.2 Anki Rules.
 */
export function compileMapLocally(params: CompileParams): CognitiveCompilerOutput {
  const { title, visualAST, placedAttributes } = params;
  const passiveDict = buildPassiveContextDictionary(visualAST, placedAttributes);

  const rawEntities = visualAST?.entities || [];
  const rawConnectors = visualAST?.connectors || [];

  // 1. Build Compiled Nodes from real AST entities
  const nodes: CompiledNode[] = rawEntities.map((entity, index) => {
    const passiveText = passiveDict[entity.id] || entity.passive_context || null;
    const pacer = classifyPacer(entity, passiveText);
    const isDeducible = pacer === "CONCEPTUAL" || pacer === "PROCEDURAL" || pacer === "ANALOGOUS";

    const labelContent = entity.transcribed_text?.trim()
      ? entity.transcribed_text.trim()
      : `Concepto ${index + 1} (${entity.type === "CONTAINER_BOX" ? "Contenedor" : entity.type === "SKETCH_ICON" ? "Metáfora Visual" : "Bloque de Tinta"})`;

    return {
      id: entity.id,
      visual_bounding_box: {
        ymin: entity.bbox.ymin,
        xmin: entity.bbox.xmin,
        ymax: entity.bbox.ymax,
        xmax: entity.bbox.xmax,
      },
      detected_content: labelContent,
      passive_context: passiveText,
      pacer_classification: pacer,
      grinde_traits:
        entity.type === "SKETCH_ICON"
          ? ["NON_VERBAL", "REFLECTIVE"]
          : entity.type === "CONTAINER_BOX"
          ? ["GROUPED", "EMPHASIZED"]
          : ["INTERCONNECTED"],
      deducible_from_context: isDeducible,
    };
  });

  // Fallback node if canvas has strokes but AST didn't isolate entities yet
  if (nodes.length === 0) {
    const firstAttrText = placedAttributes[0]
      ? [placedAttributes[0].title, placedAttributes[0].note].filter(Boolean).join(": ")
      : null;

    nodes.push({
      id: "node_root",
      visual_bounding_box: { ymin: 100, xmin: 100, ymax: 300, xmax: 500 },
      detected_content: title || "Tema Central",
      passive_context: firstAttrText,
      pacer_classification: "CONCEPTUAL",
      grinde_traits: ["GROUPED", "REFLECTIVE"],
      deducible_from_context: true,
    });
  }

  // 2. Build Compiled Edges from real AST connectors (filtering valid source & target)
  const edges: CompiledEdge[] = rawConnectors
    .filter((conn) => Boolean(conn.source_entity_id && conn.target_entity_id))
    .map((conn) => {
      let relationNature: RelationNature = "CAUSAL";
      if (conn.type === "INHIBITION") {
        relationNature = "OPPOSITION_CONTRAST";
      } else if (conn.geometry_type === "ELBOW") {
        relationNature = "CONDITIONAL";
      } else if (conn.geometry_type === "CURVED" || conn.is_curved) {
        relationNature = "CAUSAL";
      }

      return {
        source_node_id: conn.source_entity_id as string,
        target_node_id: conn.target_entity_id as string,
        label: conn.label || "se relaciona con",
        is_cross_link: false, // Calculated via topology metrics below
        relation_nature: relationNature,
      };
    });

  // 3. Compute GRINDE Audit metrics from real Visual AST topology
  const totalEdges = edges.length;
  const crossLinks = visualAST?.topology_metrics?.cross_link_count ?? 0;
  // Mark is_cross_link on edges if crossLinks exist
  for (let i = 0; i < Math.min(crossLinks, edges.length); i++) {
    edges[i].is_cross_link = true;
  }

  const crossLinkDensity = totalEdges > 0 ? Number((crossLinks / totalEdges).toFixed(2)) : 0;
  const hasMultipleNodes = nodes.length >= 3;
  const linearThinkingRisk =
    hasMultipleNodes && (crossLinkDensity < 0.2 || totalEdges < nodes.length - 1);

  let feedbackCritique = "";
  if (nodes.length <= 1) {
    feedbackCritique =
      "El mapa aún no tiene suficientes conceptos interconectados. Agrega más nodos y flechas que expliquen relaciones causales.";
  } else if (linearThinkingRisk) {
    feedbackCritique = `Riesgo de pensamiento lineal detectado (Densidad: ${(crossLinkDensity * 100).toFixed(0)}%). El mapa se organiza como un árbol rígido o lista jerárquica. Agrega enlaces cruzados (cross-links) entre ramas distantes para lograr reconciliación integrativa.`;
  } else {
    feedbackCritique = `Excelente integración no lineal (Densidad: ${(crossLinkDensity * 100).toFixed(0)}%). Tu mapa evidencia un modelo mental de red con relaciones de causa-efecto y conexiones transversales óptimas.`;
  }

  // 4. Learning Engine Outputs (Strictly adhering to ADR 5.2: Anki ONLY for non-deducible EVIDENCE / REFERENCE)
  const nonDeducibleNodes = nodes.filter((n) => !n.deducible_from_context);
  const conceptualNodes = nodes.filter((n) => n.pacer_classification === "CONCEPTUAL");

  const ankiFlashcards: AnkiFlashcard[] = nonDeducibleNodes.map((n) => ({
    source_node_id: n.id,
    target_node_id: n.id,
    card_type: "CLOZE",
    front: `Dato / Evidencia en ${title}`,
    back: n.detected_content,
    cloze_text: `En el contexto de ${title}, el dato/evidencia clave es {{c1::${n.detected_content}}}.`,
  }));

  const highRoadPrompts: HighRoadTransferPrompt[] = [];
  if (conceptualNodes.length > 0) {
    const mainConcept = conceptualNodes[0].detected_content;
    highRoadPrompts.push({
      core_concept_ids: [conceptualNodes[0].id],
      unstructured_scenario: `Imagina un ecosistema biológico o una organización compleja sujeta a presiones competitivas dinámicas.`,
      guiding_question: `¿Cómo se manifestaría el principio de "${mainConcept}" en ese entorno completamente distinto?`,
    });
  }

  const derringChallenges: DerringEffectChallenge[] = [];
  if (edges.length > 0) {
    const mainEdge = edges[0];
    const src = nodes.find((n) => n.id === mainEdge.source_node_id)?.detected_content || "Causa";
    const tgt = nodes.find((n) => n.id === mainEdge.target_node_id)?.detected_content || "Efecto";
    derringChallenges.push({
      flawed_premise: `Si se elimina por completo "${src}", "${tgt}" se incrementará automáticamente sin efectos colaterales.`,
      challenge_prompt: `Explica por qué esta afirmación es falsa analizando el mecanismo de "${mainEdge.label}".`,
      canonical_resolution: `Existe una relación de dependencia donde ${src} influye en ${tgt}; anularlo rompe el balance del sistema causal.`,
      corrective_task: `Explica por qué esta afirmación es falsa analizando el mecanismo de "${mainEdge.label}".`,
      canonical_solution: `Existe una relación de dependencia donde ${src} influye en ${tgt}; anularlo rompe el balance del sistema causal.`,
    });
  }

  const contrastingCases: ContrastingCasesICC[] = [];
  if (nodes.length >= 2) {
    contrastingCases.push({
      case_a: `Implementación directa del concepto "${nodes[0].detected_content}" en condiciones estables.`,
      case_b: `Implementación bajo perturbaciones extremas de "${nodes[1]?.detected_content || nodes[0].detected_content}".`,
      invariant_discovery_prompt: `Identifica la regla causal invariante que gobierna ambos escenarios a pesar de sus diferencias superficiales.`,
    });
  }

  const output: CognitiveCompilerOutput = {
    map_overview: {
      core_theme: title || "Esquema Cognitivo",
      maturity_level: linearThinkingRisk ? 1 : crossLinkDensity >= 0.4 ? 3 : 2,
      maturity_diagnosis: feedbackCritique,
      bridge_to_next_level:
        "Formular conexiones causales explícitas entre los cúmulos más distantes para alcanzar reconciliación integrativa.",
    },
    macro_islands:
      nodes.length > 0
        ? [
            {
              island_name: "Cúmulo Conceptual",
              associated_entity_ids: nodes.map((n) => n.id),
              is_isolated: false,
            },
          ]
        : [],
    pedagogical_interventions: {
      procedural_zones: [],
      relational_anchoring_suggestions: [],
      anki_exceptions: ankiFlashcards.slice(0, 2).map((c) => ({
        front: c.front,
        back: c.back,
        why_not_deducible: "Dato no deducible de referencia",
      })),
    },
    high_order_retrieval: {
      cross_island_causal_question:
        "¿De qué manera una perturbación en este esquema alteraría los resultados en condiciones límite?",
      high_road_transfer: {
        unstructured_scenario:
          highRoadPrompts[0]?.unstructured_scenario ||
          "Un sistema disímil gobernado por la misma dinámica causal.",
        guiding_question:
          highRoadPrompts[0]?.guiding_question ||
          "¿Cómo se proyecta la regla invariable a ese nuevo contexto?",
      },
      derring_effect: {
        flawed_premise:
          derringChallenges[0]?.flawed_premise ||
          "Eliminar la variable principal no tiene impacto en la estabilidad de la red.",
        challenge_prompt:
          derringChallenges[0]?.corrective_task ||
          "Identifica la contradicción con el principio causal.",
        canonical_resolution:
          derringChallenges[0]?.canonical_solution ||
          "Existe acoplamiento causal; alterar una variable repercute en todo el sistema.",
      },
    },
    map_metadata: {
      title: title || "Mapa Mental",
      domain_theme: "Cognitive Knowledge Map",
      total_nodes: nodes.length,
      total_edges: edges.length,
    },
    nodes,
    edges,
    grinde_audit: {
      cross_link_density_score: crossLinkDensity,
      non_verbal_balance_score: nodes.some((n) => n.pacer_classification === "ANALOGOUS")
        ? 0.75
        : 0.35,
      linear_thinking_risk: linearThinkingRisk,
      feedback_critique: feedbackCritique,
    },
    learning_engine_outputs: {
      anki_flashcards: ankiFlashcards,
      high_road_transfer_prompts: highRoadPrompts,
      derring_effect_challenges: derringChallenges,
      contrasting_cases_icc: contrastingCases,
    },
    // Backward compatibility flat fields
    anki_flashcards: ankiFlashcards,
    high_road_transfer_prompts: highRoadPrompts,
    derring_effect_challenges: derringChallenges,
    contrasting_cases_icc: contrastingCases,
  };

  return output;
}

/**
 * Main Cognitive Compilation Function
 * Attempts AWS SST Serverless backend invocation first (Gemini 2.0 Flash multimodal reasoning),
 * and falls back gracefully to Edge Local compilation if offline or unconfigured.
 */
export async function compileCognitiveMap(params: CompileParams): Promise<CognitiveCompilerOutput> {
  const apiUrl = params.apiUrl || process.env.EXPO_PUBLIC_API_URL;

  console.log(`[CompilationService] 🌐 Iniciando compilación cognitiva para mapa: "${params.title}" (ID: ${params.canvasId})`);
  console.log(`[CompilationService] 🌐 URL del Backend: ${apiUrl || "⚠️ NO CONFIGURADA (se usará evaluador local)"}`);

  if (apiUrl) {
    try {
      console.log(`[CompilationService] 🔄 Preparando datos para el backend SST...`);
      const passiveDict = buildPassiveContextDictionary(params.visualAST, params.placedAttributes);

      // Attempt high-res offscreen canvas capture if imageBase64 was not explicitly provided
      let imageBase64 = params.imageBase64;
      if (!imageBase64) {
        console.log(`[CompilationService] 📸 Capturando imagen PNG en alta resolución del lienzo...`);
        try {
          const capture = await exportHighResPng(1.0, true);
          console.log(`[CompilationService] 📸 Resultado exportHighResPng (fullDocument):`, capture);

          if (capture?.uri) {
            imageBase64 = await FileSystem.readAsStringAsync(capture.uri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            console.log(
              `[CompilationService] 📸 Imagen Base64 generada con éxito (${imageBase64.length} chars, resolución ${capture.width}x${capture.height})`
            );
          } else {
            console.warn(
              `[CompilationService] ⚠️ exportHighResPng devolvió un objeto sin URI:`,
              capture
            );
          }
        } catch (captureErr: any) {
          console.error(
            `[CompilationService] ❌ Falló la captura de imagen PNG en el lienzo:`,
            captureErr?.message || captureErr
          );
        }
      } else {
        console.log(`[CompilationService] 📸 Imagen Base64 ya provista en params (${imageBase64.length} chars).`);
      }

      const controller = new AbortController();
      const timeoutMs = 45000; // 45s timeout para permitir inferencia multimodal de Gemini
      const timeoutId = setTimeout(() => {
        console.warn(`[CompilationService] ⏰ Timeout de ${timeoutMs / 1000}s alcanzado esperando al Backend SST.`);
        controller.abort();
      }, timeoutMs);

      const endpointUrl = `${apiUrl}/canvases/${params.canvasId}/compile`;
      console.log(`[CompilationService] 🚀 Enviando POST a: ${endpointUrl}`);
      console.log(`[CompilationService] 📦 Datos enviados:`, {
        canvas_id: params.canvasId,
        tieneImagen: Boolean(imageBase64),
        longitudBase64: imageBase64?.length || 0,
        nodosAST: params.visualAST?.entities?.length || 0,
        conectoresAST: params.visualAST?.connectors?.length || 0,
        metadatosPasivos: Object.keys(passiveDict).length,
      });

      const startTime = Date.now();
      const response = await fetch(endpointUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          canvas_id: params.canvasId,
          visual_ast_layer: params.visualAST,
          passive_context_dictionary: passiveDict,
          image_base64: imageBase64,
        }),
      });

      clearTimeout(timeoutId);
      const latency = Date.now() - startTime;
      console.log(`[CompilationService] 📡 Backend respondió en ${latency}ms con HTTP ${response.status} (${response.statusText})`);

      if (response.status === 202 || (response.ok && !response.headers.get("content-type")?.includes("json"))) {
        console.log(`[CompilationService] ⏳ Tarea asíncrona aceptada (HTTP ${response.status}). Iniciando sondeo (polling)...`);
      }

      if (response.ok || response.status === 202) {
        const data = await response.json().catch(() => ({}));
        if (data.output) {
          console.log(`[CompilationService] ✅ Compilación síncrona exitosa recibida.`);
          console.log(`[CompilationService] 📊 Nodos recibidos: ${data.output.nodes?.length || 0}, Enlaces: ${data.output.edges?.length || 0}`);
          return data.output;
        }

        // Si es 202 o el status es COMPILING, entramos en polling
        if (response.status === 202 || data.status === "COMPILING") {
          console.log(`[CompilationService] ⏳ Tarea en segundo plano. Sondeando resultado en ${apiUrl}/canvases/${params.canvasId}/compilation...`);
          const pollUrl = `${apiUrl}/canvases/${params.canvasId}/compilation`;
          const pollStart = Date.now();
          const maxPollMs = 90000; // 90s máximo
          const pollIntervalMs = 2000; // cada 2s

          while (Date.now() - pollStart < maxPollMs) {
            await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
            try {
              const pollRes = await fetch(pollUrl);
              if (pollRes.ok) {
                const pollData = await pollRes.json();
                const elapsedSec = ((Date.now() - pollStart) / 1000).toFixed(1);
                console.log(`[CompilationService] 🔄 Sondeo [${elapsedSec}s]: status = ${pollData.status}`);

                if (pollData.status === "COMPILED" && pollData.output) {
                  console.log(`[CompilationService] 🎉 Compilación asíncrona completada exitosamente en ${elapsedSec}s.`);
                  console.log(`[CompilationService] 📊 Nodos: ${pollData.output.nodes?.length || 0}, Enlaces: ${pollData.output.edges?.length || 0}`);
                  return pollData.output;
                }

                if (pollData.status === "FAILED") {
                  throw new Error(pollData.error || "El backend reportó fallo en la compilación.");
                }
              } else {
                console.warn(`[CompilationService] ⚠️ Sondeo devolvió HTTP ${pollRes.status}`);
              }
            } catch (pollErr: any) {
              if (pollErr?.message?.includes("fallo en la compilación")) {
                throw pollErr;
              }
              console.warn(`[CompilationService] ⚠️ Reintentando sondeo tras aviso:`, pollErr?.message || pollErr);
            }
          }
          throw new Error("Tiempo de espera agotado (90s) esperando la compilación del backend.");
        }
      } else {
        const errorText = await response.text().catch(() => "");
        console.error(
          `[CompilationService] ❌ Backend retornó error HTTP ${response.status}: ${errorText}`
        );
      }
    } catch (err: any) {
      console.error(
        `[CompilationService] ❌ Error en invocación de Backend (${err?.name || "Error"}: ${err?.message}):`,
        err
      );
    }
  }

  // Local compilation fallback
  console.log(`[CompilationService] ⚡ Ejecutando evaluador cognitivo local offline de contingencia...`);
  return compileMapLocally(params);
}
