import {
  CausalLoop,
  TopologyMetrics,
  VisualASTConnector,
  VisualASTEntity,
} from "../../types/cognitive";

interface AdjacencyEdge {
  targetId: string;
  conn: VisualASTConnector;
  isForwardTraversal: boolean;
}

interface FoundCycle {
  path: string[];
  edges: AdjacencyEdge[];
}

export class CausalLoopDetector {
  /**
   * Detects simple directed cycles and associative feedback loops in the docked connector graph
   */
  public static detectCausalLoops(
    entities: VisualASTEntity[],
    connectors: VisualASTConnector[]
  ): CausalLoop[] {
    const adj = new Map<string, AdjacencyEdge[]>();
    for (const ent of entities) {
      adj.set(ent.id, []);
    }

    for (const conn of connectors) {
      if (!conn.source_entity_id || !conn.target_entity_id) continue;
      const s = conn.source_entity_id;
      const t = conn.target_entity_id;

      // Forward directed edge
      adj.get(s)?.push({ targetId: t, conn, isForwardTraversal: true });

      // Bidirectional or plain associative line (directionality === "NONE" or "BIDIRECTIONAL")
      if (conn.directionality === "BIDIRECTIONAL" || conn.directionality === "NONE") {
        adj.get(t)?.push({ targetId: s, conn, isForwardTraversal: false });
      }
    }

    const foundCycles: FoundCycle[] = [];
    const visitedSignatures = new Set<string>();

    const dfs = (
      startNode: string,
      current: string,
      path: string[],
      edgePath: AdjacencyEdge[],
      lastConnId: string | null
    ) => {
      path.push(current);
      const neighbors = adj.get(current) || [];

      for (const edge of neighbors) {
        // Prevent immediately backtracking across the exact same connector
        if (edge.conn.id === lastConnId) continue;

        if (edge.targetId === startNode && path.length >= 3) {
          // Closed loop detected
          const cyclePath = [...path, startNode];
          const fullEdges = [...edgePath, edge];
          const canonical = this.canonicalizeCycle(cyclePath);
          const key = canonical.join("->");
          if (!visitedSignatures.has(key)) {
            visitedSignatures.add(key);
            const reverseCanonical = this.canonicalizeCycle([...cyclePath].reverse());
            visitedSignatures.add(reverseCanonical.join("->"));
            foundCycles.push({ path: canonical, edges: fullEdges });
          }
        } else if (!path.includes(edge.targetId) && path.length < 12) {
          edgePath.push(edge);
          dfs(startNode, edge.targetId, path, edgePath, edge.conn.id);
          edgePath.pop();
        }
      }
      path.pop();
    };

    for (const ent of entities) {
      dfs(ent.id, ent.id, [], [], null);
    }

    return foundCycles.map((fc) => {
      let isStrictlyDirected = true;
      let negativeCount = 0;
      let positiveCount = 0;

      for (const edge of fc.edges) {
        if (edge.conn.directionality !== "FORWARD" && edge.conn.directionality !== "BIDIRECTIONAL") {
          isStrictlyDirected = false;
        }
        if (edge.conn.type === "INHIBITION" || edge.conn.polarity === "NEGATIVE") {
          negativeCount++;
        }
        if (edge.conn.polarity === "POSITIVE") {
          positiveCount++;
        }
      }

      let loopType: "REINFORCING" | "BALANCING" | "ASSOCIATIVE" = "ASSOCIATIVE";
      let polaritySign: "+" | "-" | null = null;

      if (isStrictlyDirected) {
        if (negativeCount % 2 === 1) {
          loopType = "BALANCING";
          polaritySign = "-";
        } else {
          loopType = "REINFORCING";
          polaritySign = "+";
        }
      } else {
        if (negativeCount % 2 === 1) {
          loopType = "BALANCING";
          polaritySign = "-";
        } else if (positiveCount > 0) {
          loopType = "REINFORCING";
          polaritySign = "+";
        } else {
          loopType = "ASSOCIATIVE";
          polaritySign = null;
        }
      }

      return {
        cycle_ids: fc.path,
        node_count: fc.path.length - 1,
        loop_type: loopType,
        is_directed: isStrictlyDirected,
        polarity_sign: polaritySign,
      };
    });
  }

  /**
   * Normalizes a cycle array [A, B, C, A] to its lexicographically minimal rotation
   */
  public static canonicalizeCycle(cycle: string[]): string[] {
    const nodes = cycle.slice(0, cycle.length - 1);
    let minIdx = 0;
    for (let i = 1; i < nodes.length; i++) {
      if (nodes[i] < nodes[minIdx]) {
        minIdx = i;
      }
    }
    const rotated = [...nodes.slice(minIdx), ...nodes.slice(0, minIdx)];
    return [...rotated, rotated[0]];
  }

  /**
   * Computes high-level flow metrics: root premises, sink conclusions, and cross-links
   */
  public static computeTopologyMetrics(
    entities: VisualASTEntity[],
    connectors: VisualASTConnector[]
  ): TopologyMetrics {
    const inDegree = new Map<string, number>();
    const outDegree = new Map<string, number>();

    for (const ent of entities) {
      inDegree.set(ent.id, 0);
      outDegree.set(ent.id, 0);
    }

    for (const conn of connectors) {
      if (conn.source_entity_id && conn.target_entity_id) {
        outDegree.set(conn.source_entity_id, (outDegree.get(conn.source_entity_id) || 0) + 1);
        inDegree.set(conn.target_entity_id, (inDegree.get(conn.target_entity_id) || 0) + 1);

        if (conn.directionality === "BIDIRECTIONAL") {
          outDegree.set(conn.target_entity_id, (outDegree.get(conn.target_entity_id) || 0) + 1);
          inDegree.set(conn.source_entity_id, (inDegree.get(conn.source_entity_id) || 0) + 1);
        }
      }
    }

    const rootEntityIds: string[] = [];
    const sinkEntityIds: string[] = [];
    let crossLinkCount = 0;

    for (const ent of entities) {
      const inD = inDegree.get(ent.id) || 0;
      const outD = outDegree.get(ent.id) || 0;

      if (inD === 0 && outD > 0) {
        rootEntityIds.push(ent.id);
      }
      if (inD > 0 && outD === 0) {
        sinkEntityIds.push(ent.id);
      }
      if (inD > 1) {
        crossLinkCount += inD - 1; // Nodes with multiple inputs indicate converging cross-links
      }
    }

    return {
      root_entity_ids: rootEntityIds,
      sink_entity_ids: sinkEntityIds,
      cross_link_count: crossLinkCount,
    };
  }
}
