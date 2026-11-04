import { useMemo } from "react";
import { TIER_CONFIG } from "../components/MatrixGraphView";

export interface LayoutNode {
  id: string;
  label: string;
  tier: "system" | "mechanism" | "primitive";
  domain?: string;
  field?: string;
  scheme?: string;
  macroDomain?: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  vx?: number;
  vy?: number;
  [key: string]: any;
}

export function applyTierLayoutForces(nodes: any[], alpha = 0.1) {
  nodes.forEach((node) => {
    // Si el nodo está siendo arrastrado manualmente por el usuario, respetar el pin 1:1
    if (node.fx !== undefined && node.fx !== null) {
      node.x = node.fx;
      node.y = node.fy;
      return;
    }

    const tierKey = (node.tier as "system" | "mechanism" | "primitive") || "mechanism";
    const config = TIER_CONFIG[tierKey] || TIER_CONFIG.mechanism;

    // Fuerza vertical hacia el centro del carril compacto
    if (node.y !== undefined) {
      const deltaY = config.centerY - node.y;
      node.vy = (node.vy || 0) + deltaY * 0.08 * alpha;

      // Clamping elástico dentro de su carril
      node.y = Math.max(config.yMin + 25, Math.min(config.yMax - 25, node.y));
    }

    // Fricción suave en X
    if (node.vx !== undefined) node.vx *= 0.85;
    if (node.vy !== undefined) node.vy *= 0.85;
  });
}

export function clampNodeToTier(node: any) {
  const tierKey = (node.tier as "system" | "mechanism" | "primitive") || "mechanism";
  const config = TIER_CONFIG[tierKey] || TIER_CONFIG.mechanism;

  if (node.y !== undefined) {
    node.y = Math.max(config.yMin + 28, Math.min(config.yMax - 28, node.y));
  }
  if (node.vy !== undefined && node.y !== undefined) {
    node.vy += (config.centerY - node.y) * 0.08;
  }
}

/**
 * Resolución iterativa de colisiones entre nodos (Fase 6)
 * Evita la superposición de tarjetas contiguas en la matriz.
 */
export function resolveNodeCollisions(nodes: LayoutNode[], iterations = 10) {
  const MIN_WIDTH = 196;
  const MIN_HEIGHT = 46;

  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];

        const ax = a.x ?? 0;
        const ay = a.y ?? 0;
        const bx = b.x ?? 0;
        const by = b.y ?? 0;

        const dx = bx - ax;
        const dy = by - ay;

        const overlapX = MIN_WIDTH - Math.abs(dx);
        const overlapY = MIN_HEIGHT - Math.abs(dy);

        if (overlapX > 0 && overlapY > 0) {
          // Si el nodo está fijado por arrastre (fx), no moverlo
          const isAFixed = a.fx !== undefined && a.fx !== null;
          const isBFixed = b.fx !== undefined && b.fx !== null;

          if (overlapX / MIN_WIDTH <= overlapY / MIN_HEIGHT) {
            const shift = (overlapX / 2) + 2;
            const sign = dx >= 0 ? 1 : -1;

            if (!isAFixed && !isBFixed) {
              a.x = ax - shift * sign;
              b.x = bx + shift * sign;
            } else if (!isAFixed) {
              a.x = ax - shift * 2 * sign;
            } else if (!isBFixed) {
              b.x = bx + shift * 2 * sign;
            }
          } else {
            const shift = (overlapY / 2) + 2;
            const sign = dy >= 0 ? 1 : -1;

            if (!isAFixed && !isBFixed) {
              a.y = ay - shift * sign;
              b.y = by + shift * sign;
            } else if (!isAFixed) {
              a.y = ay - shift * 2 * sign;
            } else if (!isBFixed) {
              b.y = by + shift * 2 * sign;
            }

            clampNodeToTier(a);
            clampNodeToTier(b);
          }
        }
      }
    }
  }
}

export function useMatrixLayout(nodes: LayoutNode[], worldWidth = 2600) {
  return useMemo(() => {
    // 1. Descartar cualquier nodo dummy o centroide físico artificial
    const cleanNodes = nodes.filter((n) => !n.isClusterCentroid && n.id !== "dummy" && n.domain !== "<3");

    // 2. Extraer campos/dominios únicos para distribución inicial abierta
    const domainList = Array.from(
      new Set(cleanNodes.map((n) => n.field || n.domain || "General"))
    );
    const domainCount = Math.max(1, domainList.length);
    const spacingX = Math.max(340, worldWidth / (domainCount + 1));

    // 3. Asignar posiciones iniciales orgánicas sin forzar columnas rígidas
    const tierCounters: Record<string, number> = {};

    const positionedNodes = cleanNodes.map((node) => {
      const dom = node.field || node.domain || "General";
      const domIdx = domainList.indexOf(dom);
      const tierKey = (node.tier as "system" | "mechanism" | "primitive") || "mechanism";
      const config = TIER_CONFIG[tierKey] || TIER_CONFIG.mechanism;

      const groupKey = `${dom}_${tierKey}`;
      const count = tierCounters[groupKey] || 0;
      tierCounters[groupKey] = count + 1;

      // Dispersión inicial suave en X y Y adaptada a los carriles compactos
      const baseX = 220 + domIdx * spacingX + ((count % 3) - 1) * 115;
      const baseY = config.centerY + ((count % 2 === 0 ? 1 : -1) * Math.min(30, count * 10));

      const nodeWithCoords = {
        ...node,
        x: node.x !== undefined ? node.x : baseX,
        y: node.y !== undefined ? node.y : baseY,
      };

      clampNodeToTier(nodeWithCoords);
      return nodeWithCoords;
    });

    applyTierLayoutForces(positionedNodes, 1.0);
    // Resolución de colisiones para evitar superposiciones (§6)
    resolveNodeCollisions(positionedNodes, 12);

    return positionedNodes;
  }, [nodes, worldWidth]);
}
