import {
  CognitiveCompilerOutput,
  PacerClassification,
  RawInkStroke,
  KnowledgeNode,
  KnowledgeEdge,
  CanvasCompiledPayload,
  CompiledNode,
  CompiledEdge,
} from "@cognitive-canvas/core/types";
import { VisionCompilerResponse } from "../../services/CompilationService";
import { SpatialHashGrid } from "../../utils/SpatialHashGrid";

export function mapVisionResponseToOutput(
  response: VisionCompilerResponse,
  localStrokes: RawInkStroke[]
): { output: CognitiveCompilerOutput; compiledGraphPayload: CanvasCompiledPayload } {
  const { renderWorldBounds } = response;
  const spatialGrid = new SpatialHashGrid(64);
  for (const stroke of localStrokes) spatialGrid.insert(stroke);

  const enrichedNodes: KnowledgeNode[] = response.nodes.map((node) => {
    const [ymin, xmin, ymax, xmax] = node.box_2d;
    const worldBounds = {
      minX: renderWorldBounds.minX + (xmin / 1000) * renderWorldBounds.width,
      minY: renderWorldBounds.minY + (ymin / 1000) * renderWorldBounds.height,
      maxX: renderWorldBounds.minX + (xmax / 1000) * renderWorldBounds.width,
      maxY: renderWorldBounds.minY + (ymax / 1000) * renderWorldBounds.height,
    };
    for (const s of spatialGrid.query(worldBounds)) s.associatedNodeId = node.id;
    return {
      ...node,
      pacerRole: node.pacerRole || "NONE",
      verificationState: "unverified" as const,
      provenance: [{ canvasId: response.canvasId, canvasTitle: response.canvasTitle, boundingBox: worldBounds }],
    };
  });

  const enrichedEdges: KnowledgeEdge[] = response.edges.map((edge, idx) => ({
    id: `edge_${response.canvasId}_${idx}`,
    fromNodeId: edge.fromNodeId,
    toNodeId: edge.toNodeId,
    type: edge.type,
    reasoning: edge.reasoning,
    confidence: 0.9,
  }));

  const compiledGraphPayload: CanvasCompiledPayload = {
    canvasId: response.canvasId,
    canvasTitle: response.canvasTitle,
    compiledAt: Date.now(),
    nodes: enrichedNodes,
    edges: enrichedEdges,
    synthesis: response.synthesis,
    reasoningDiagnosis: response.reasoningDiagnosis,
  };

  const overlayNodes: CompiledNode[] = enrichedNodes.map((n) => {
    const b = n.provenance[0]?.boundingBox || { minX: 100, minY: 100, maxX: 300, maxY: 220 };
    const pacer: PacerClassification =
      n.pacerRole === "REFERENCE" || n.pacerRole === "PROCEDURAL" || n.pacerRole === "ANALOGOUS" ? n.pacerRole : "NONE";
    return {
      id: n.id,
      visual_bounding_box: { xmin: b.minX, ymin: b.minY, xmax: b.maxX, ymax: b.maxY },
      detected_content: n.label,
      passive_context: n.summary,
      pacer_classification: pacer,
      deducible_from_context: n.pacerRole !== "REFERENCE",
    };
  });

  const overlayEdges: CompiledEdge[] = enrichedEdges.map((e) => ({
    source_node_id: e.fromNodeId,
    target_node_id: e.toNodeId,
    label: e.reasoning,
    is_cross_link: false,
    relation_nature: e.type === "INHIBITS" ? "OPPOSITION_CONTRAST" : e.type === "PREREQUISITE_OF" ? "CONDITIONAL" : "CAUSAL",
  }));

  const output: CognitiveCompilerOutput = {
    ...(response.legacyOutput || {}),
    map_metadata: {
      title: response.canvasTitle,
      domain_theme: enrichedNodes[0]?.domain || response.canvasTitle,
      total_nodes: enrichedNodes.length,
      total_edges: enrichedEdges.length,
    },
    nodes: overlayNodes,
    edges: overlayEdges,
    synthesis: response.synthesis,
    reasoningDiagnosis: response.reasoningDiagnosis,
    compiled_graph_payload: compiledGraphPayload,
  };

  return { output, compiledGraphPayload };
}

