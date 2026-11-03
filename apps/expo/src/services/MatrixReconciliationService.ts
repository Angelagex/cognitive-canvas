import { StorageService } from "./StorageService";

export class MatrixReconciliationService {
  /**
   * Reconcilia los nodos recién compilados en la Matriz Canónica Global.
   * Ejecutado inmediatamente tras la compilación local de un mapa.
   */
  static async mergeCanvasIntoGlobalMatrix(canvasId: string, localCompilation: any): Promise<void> {
    if (!localCompilation || !localCompilation.nodes) return;

    const existingMatrix = (await StorageService.getGlobalKnowledgeMatrix()) || {
      nodes: [],
      edges: [],
      canvasesCount: 0,
    };

    const nodeMap = new Map<string, any>();
    existingMatrix.nodes.forEach((n: any) => nodeMap.set(n.id, n));

    // 1. Desduplicación e Ingesta de Procedencia
    for (const localNode of localCompilation.nodes) {
      if (nodeMap.has(localNode.id)) {
        // Concepto existente: fusionar procedencia sin duplicar nodo
        const canonical = nodeMap.get(localNode.id);
        const provList = canonical.provenance || [];
        const exists = provList.some((p: any) => p.canvasId === canvasId);
        if (!exists) {
          if (localNode.provenance && localNode.provenance[0]) {
            canonical.provenance.push(localNode.provenance[0]);
          } else {
            canonical.provenance.push({
              canvasId,
              canvasTitle: localCompilation.canvasTitle || "Canvas",
              boundingBox: localNode.box_2d,
            });
          }
        }
        // Actualizar resumen e invariantes si el nuevo es más completo
        canonical.invariant = localNode.invariant || canonical.invariant;
        canonical.fragility = localNode.fragility || canonical.fragility;
        canonical.tradeoff = localNode.tradeoff || canonical.tradeoff;
      } else {
        // Nuevo concepto canónico
        nodeMap.set(localNode.id, {
          ...localNode,
          provenance: localNode.provenance || [
            {
              canvasId,
              canvasTitle: localCompilation.canvasTitle || "Canvas",
              boundingBox: localNode.box_2d,
            },
          ],
        });
      }
    }

    // 2. Fusión de Aristas
    const edgeMap = new Map<string, any>();
    existingMatrix.edges.forEach((e: any) => edgeMap.set(`${e.fromNodeId}->${e.toNodeId}`, e));

    (localCompilation.edges || []).forEach((e: any) => {
      const key = `${e.fromNodeId}->${e.toNodeId}`;
      if (!edgeMap.has(key)) {
        edgeMap.set(key, e);
      }
    });

    const updatedMatrix = {
      exportedAt: Date.now(),
      totalNodes: nodeMap.size,
      totalEdges: edgeMap.size,
      canvasesCount: new Set([
        ...existingMatrix.nodes.flatMap((n: any) => (n.provenance || []).map((p: any) => p.canvasId)),
        canvasId,
      ]).size,
      nodes: Array.from(nodeMap.values()),
      edges: Array.from(edgeMap.values()),
    };

    await StorageService.saveGlobalKnowledgeMatrix(updatedMatrix);
  }
}

