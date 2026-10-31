import * as FileSystem from "expo-file-system";
import {
  CanvasCompiledPayload,
  KnowledgeNode,
  KnowledgeEdge,
  ConceptTier,
  NodeVerificationState,
  ConsolidatedReference,
} from "@cognitive-canvas/core";
import { listDocuments, loadDocument, saveDocument } from "./StorageService";
import { SynthesisReferenceCard } from "../types/canvas";

const GRAPHS_DIRECTORY = `${FileSystem.documentDirectory}compiled_graphs/`;

async function ensureGraphsDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(GRAPHS_DIRECTORY);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(GRAPHS_DIRECTORY, { intermediates: true });
  }
}

export function slugifyConcept(label: string): string {
  return (
    label
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "concept-node"
  );
}

export function inferConceptDomain(
  label: string,
  canvasTitle: string,
  explicitDomain?: string
): string {
  if (explicitDomain?.trim()) return explicitDomain.trim();
  const combined = `${label} ${canvasTitle}`.toLowerCase();
  if (/(photo|camera|iso|shutter|aperture|f-stop|lens|exposi|luz|sensor|optica)/.test(combined)) {
    return "Photography";
  }
  if (/(tcp|syn|ack|packet|raft|consensus|network|socket|http|dns|latency|window)/.test(combined)) {
    return "Networking & Systems";
  }
  if (/(code|react|typescript|function|class|compiler|ast|algorithm|memory|thread)/.test(combined)) {
    return "Programming";
  }
  return canvasTitle.replace(/^(synthesis:\s*|mapa\s*)/i, "").trim().slice(0, 24) || "General";
}

export async function saveCompiledGraph(payload: CanvasCompiledPayload): Promise<void> {
  try {
    await ensureGraphsDir();
    const filePath = `${GRAPHS_DIRECTORY}${payload.canvasId}_compiled_graph.json`;
    await FileSystem.writeAsStringAsync(filePath, JSON.stringify(payload, null, 2), {
      encoding: FileSystem.EncodingType.UTF8,
    });
  } catch (err) {
    console.warn("[CompiledGraphStorage] Failed to save compiled_graph.json:", err);
  }
}

export async function loadAllCompiledGraphs(): Promise<CanvasCompiledPayload[]> {
  try {
    await ensureGraphsDir();
    const files = await FileSystem.readDirectoryAsync(GRAPHS_DIRECTORY);
    const jsonFiles = files.filter((f) => f.endsWith("compiled_graph.json"));
    const payloads: CanvasCompiledPayload[] = [];
    const seenCanvasIds = new Set<string>();

    for (const file of jsonFiles) {
      try {
        const content = await FileSystem.readAsStringAsync(`${GRAPHS_DIRECTORY}${file}`, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        const parsed = JSON.parse(content) as CanvasCompiledPayload;
        if (parsed?.canvasId && Array.isArray(parsed.nodes)) {
          payloads.push(parsed);
          seenCanvasIds.add(parsed.canvasId);
        }
      } catch (e) {
        console.warn(`[CompiledGraphStorage] Skipped invalid graph file ${file}:`, e);
      }
    }

    const docs = await listDocuments();
    for (const summary of docs) {
      if (seenCanvasIds.has(summary.map_id)) continue;
      const doc = await loadDocument(summary.map_id);
      if (!doc) continue;
      const derived = deriveCompiledPayloadFromDocument(doc);
      if (derived.nodes.length > 0) {
        payloads.push(derived);
        seenCanvasIds.add(doc.map_id);
      }
    }
    return payloads;
  } catch (err) {
    console.warn("[CompiledGraphStorage] Failed to load compiled graphs:", err);
    return [];
  }
}

export function deriveCompiledPayloadFromDocument(doc: any): CanvasCompiledPayload {
  const canvasId = doc.map_id;
  const canvasTitle = doc.metadata?.title || "Canvas";
  const attrs = doc.metadata?.placed_attributes || [];
  const rawNodes = doc.compiled_cognitive_layer?.nodes || [];
  const rawEdges = doc.compiled_cognitive_layer?.edges || [];
  const nodes: KnowledgeNode[] = [];

  if (rawNodes.length > 0) {
    rawNodes.forEach((n: any, idx: number) => {
      const label = n.detected_content || `Concept ${idx + 1}`;
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
      const matchingAttr = attrs.find(
        (a: any) => a.title?.toLowerCase() === label.toLowerCase() || a.consolidatedRef !== undefined
      );
      const b = n.visual_bounding_box;
      nodes.push({
        id: slugifyConcept(label),
        label,
        domain: inferConceptDomain(label, canvasTitle, n.domain),
        tier,
        verificationState: n.deducible_from_context ? "unverified" : "ghost",
        provenance: [
          {
            canvasId,
            canvasTitle,
            boundingBox: b
              ? { minX: b.xmin ?? 100, minY: b.ymin ?? 100, maxX: b.xmax ?? 320, maxY: b.ymax ?? 240 }
              : undefined,
          },
        ],
        summary:
          n.passive_context ||
          matchingAttr?.thinkingMemo?.transcript ||
          matchingAttr?.note ||
          `Nodo conceptual extraído de ${canvasTitle}.`,
        consolidatedRef: matchingAttr?.consolidatedRef,
      });
    });
  } else if (attrs.length > 0) {
    attrs.forEach((attr: any, idx: number) => {
      const label = attr.title || `Concepto ${idx + 1}`;
      const tier: ConceptTier =
        attr.type === "EVIDENCE"
          ? "primitive"
          : attr.type === "CAUSAL_MECHANISM"
          ? "mechanism"
          : "system";
      const eb = attr.entityBounds;
      nodes.push({
        id: slugifyConcept(label),
        label,
        domain: inferConceptDomain(label, canvasTitle, attr.domain),
        tier,
        verificationState: attr.thinkingMemo ? "verified" : "unverified",
        provenance: [
          {
            canvasId,
            canvasTitle,
            boundingBox: eb
              ? { minX: eb.xmin, minY: eb.ymin, maxX: eb.xmax, maxY: eb.ymax }
              : { minX: attr.worldX - 80, minY: attr.worldY - 40, maxX: attr.worldX + 80, maxY: attr.worldY + 40 },
          },
        ],
        summary: attr.thinkingMemo?.transcript || attr.note || `Atributo cognitivo en ${canvasTitle}.`,
        consolidatedRef: attr.consolidatedRef,
      });
    });
  }

  const edges: KnowledgeEdge[] = rawEdges
    .map((e: any, idx: number) => {
      const srcNode = rawNodes.find((n: any) => n.id === e.source_node_id);
      const tgtNode = rawNodes.find((n: any) => n.id === e.target_node_id);
      const fromId = srcNode ? slugifyConcept(srcNode.detected_content) : nodes[0]?.id;
      const toId = tgtNode ? slugifyConcept(tgtNode.detected_content) : nodes[1]?.id;
      if (!fromId || !toId || fromId === toId) return null;
      return {
        id: `edge_${canvasId}_${idx}`,
        fromNodeId: fromId,
        toNodeId: toId,
        type: e.relation_nature === "OPPOSITION_CONTRAST" ? "INHIBITS" : "TRIGGERS",
        reasoning: e.label || "Relación causal identificada en el lienzo.",
        confidence: 0.85,
      } as KnowledgeEdge;
    })
    .filter(Boolean) as KnowledgeEdge[];

  return { canvasId, canvasTitle, compiledAt: doc.metadata?.updated_at || Date.now(), nodes, edges };
}

export async function updateKnowledgeNodeVerification(
  nodeId: string,
  newState: NodeVerificationState
): Promise<void> {
  const graphs = await loadAllCompiledGraphs();
  for (const g of graphs) {
    let changed = false;
    for (const n of g.nodes) {
      if (n.id === nodeId) {
        n.verificationState = newState;
        changed = true;
      }
    }
    if (changed) await saveCompiledGraph(g);
  }
}

export async function createNonDestructiveSynthesisCanvas(params: {
  topic: string;
  sharedNodeLabel: string;
  leftCards: SynthesisReferenceCard[];
  rightCards: SynthesisReferenceCard[];
  sourceCanvasIds: string[];
}): Promise<string> {
  const newCanvasId = `map_synthesis_${Date.now()}`;
  const synthesisTitle = `Synthesis: ${params.topic}`;
  const now = Date.now();
  const ref: ConsolidatedReference = { targetCanvasId: newCanvasId, targetCanvasTitle: synthesisTitle };

  await saveDocument({
    map_id: newCanvasId,
    version: "1.0.0",
    metadata: {
      title: synthesisTitle,
      created_at: now,
      updated_at: now,
      canvas_scale: 1.0,
      canvas_translate_x: 0,
      canvas_translate_y: 0,
      placed_attributes: [],
      synthesis_cards: [...params.leftCards, ...params.rightCards],
    },
    raw_ink_layer: { strokes: [] },
    visual_ast_layer: { entities: [], connectors: [] },
    compiled_cognitive_layer: null,
  });

  for (const srcId of params.sourceCanvasIds) {
    const srcDoc = await loadDocument(srcId);
    if (!srcDoc) continue;
    const attrs = srcDoc.metadata.placed_attributes || [];
    srcDoc.metadata.placed_attributes =
      attrs.length > 0
        ? attrs.map((a) => ({ ...a, consolidatedRef: ref }))
        : [
            {
              id: `attr_cons_${now}`,
              type: "CAUSAL_MECHANISM" as const,
              title: params.sharedNodeLabel,
              note: `Consolidado en ${synthesisTitle}`,
              worldX: 320,
              worldY: 220,
              consolidatedRef: ref,
            },
          ];
    await saveDocument(srcDoc);
  }

  const graphs = await loadAllCompiledGraphs();
  for (const g of graphs) {
    if (params.sourceCanvasIds.includes(g.canvasId)) {
      g.nodes = g.nodes.map((n) => ({ ...n, consolidatedRef: ref }));
      await saveCompiledGraph(g);
    }
  }
  return newCanvasId;
}
