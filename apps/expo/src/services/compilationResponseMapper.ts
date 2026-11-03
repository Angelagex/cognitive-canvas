import {
  VisionCompilerResponse,
  VisionCompiledNode,
  VisionCompiledEdge,
  CanvasDocumentInput,
} from "./CompilationService.types";
import { ReasoningDiagnosis, RenderWorldBounds } from "./CompilationService.types";

export function formatCompilerResponse(
  resolved: any,
  document: CanvasDocumentInput,
  renderWorldBounds: RenderWorldBounds
): VisionCompilerResponse {
  const rawDiag = resolved.reasoningDiagnosis || {};
  const rawSyn = resolved.synthesis || {};

  const reasoningDiagnosis: ReasoningDiagnosis = {
    misconceptions: Array.isArray(rawDiag.misconceptions) ? rawDiag.misconceptions : [],
    omissions: Array.isArray(rawDiag.omissions)
      ? rawDiag.omissions
      : Array.isArray(rawSyn.blindSpots)
      ? rawSyn.blindSpots
      : [],
    ghostConnections: Array.isArray(rawDiag.ghostConnections)
      ? rawDiag.ghostConnections
      : Array.isArray(rawSyn.ghostConnections)
      ? rawSyn.ghostConnections
      : [],
    socraticChallenges: Array.isArray(rawDiag.socraticChallenges)
      ? rawDiag.socraticChallenges
      : (Array.isArray(rawSyn.socraticChallenges) ? rawSyn.socraticChallenges : []).map((c: any) => ({
          targetMechanism: c.targetMechanism || c.edgeTarget || "Mecanismo",
          counterfactualQuestion: c.counterfactualQuestion || "",
          expectedInvariant: c.expectedInvariant || "",
        })),
  };

  const nodes: VisionCompiledNode[] = (resolved.nodes || []).map((n: any, idx: number) => ({
    id: n.id || `node-${idx + 1}`,
    label: n.label || n.detected_content || `Concept ${idx + 1}`,
    domain: n.domain || document.title || "General",
    tier: n.tier || "mechanism",
    pacerRole:
      n.pacerRole === "REFERENCE" || n.pacerRole === "PROCEDURAL" || n.pacerRole === "ANALOGOUS"
        ? n.pacerRole
        : "NONE",
    summary: n.summary || n.passive_context || "",
    box_2d: Array.isArray(n.box_2d) && n.box_2d.length === 4 ? n.box_2d : [150, 150, 350, 450],
    invariant: n.invariant,
    fragility: n.fragility,
    tradeoff: n.tradeoff,
  }));

  const edges: VisionCompiledEdge[] = (resolved.edges || []).map((e: any) => ({
    fromNodeId: e.fromNodeId || e.source_node_id,
    toNodeId: e.toNodeId || e.target_node_id,
    type: e.type || "TRIGGERS",
    reasoning: e.reasoning || e.label || "",
  }));

  return {
    canvasId: resolved.canvasId || document.id,
    canvasTitle: resolved.canvasTitle || document.title || "Untitled",
    nodes,
    edges,
    synthesis: {
      systemSummary: rawSyn.systemSummary || "",
      ghostConnections: reasoningDiagnosis.ghostConnections,
      blindSpots: reasoningDiagnosis.omissions,
      socraticChallenges: reasoningDiagnosis.socraticChallenges.map((sc) => ({
        edgeTarget: sc.targetMechanism,
        counterfactualQuestion: sc.counterfactualQuestion,
      })),
    },
    reasoningDiagnosis,
    renderWorldBounds,
  };
}

