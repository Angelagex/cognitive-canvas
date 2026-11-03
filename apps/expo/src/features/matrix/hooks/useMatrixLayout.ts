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

    // 1. Fuerza vertical suave hacia el centro del carril de su tier
    if (node.y !== undefined) {
      const targetY = config.centerY;
      const dy = targetY - node.y;
      node.vy = (node.vy || 0) + dy * 0.05 * alpha;

      // Clamping elástico dentro del carril (evita que invada otros tiers)
      node.y = Math.max(config.yMin + 35, Math.min(config.yMax - 35, node.y));
    }

    // 2. Eje X totalmente libre (sin columnas rígidas ni snap-backs violentos)
    if (node.vx !== undefined) {
      node.vx *= 0.88;
    }
    if (node.vy !== undefined) {
      node.vy *= 0.88;
    }
  });
}

export function clampNodeToTier(node: any) {
  const tierKey = (node.tier as "system" | "mechanism" | "primitive") || "mechanism";
  const config = TIER_CONFIG[tierKey] || TIER_CONFIG.mechanism;

  if (node.y !== undefined) {
    node.y = Math.max(config.yMin + 35, Math.min(config.yMax - 35, node.y));
  }
  if (node.vy !== undefined && node.y !== undefined) {
    node.vy += (config.centerY - node.y) * 0.08;
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

      // Dispersión inicial suave en X y Y
      const baseX = 220 + domIdx * spacingX + ((count % 3) - 1) * 115;
      const baseY = config.centerY + ((count % 2 === 0 ? 1 : -1) * Math.min(40, count * 14));

      const nodeWithCoords = {
        ...node,
        x: node.x !== undefined ? node.x : baseX,
        y: node.y !== undefined ? node.y : baseY,
      };

      clampNodeToTier(nodeWithCoords);
      return nodeWithCoords;
    });

    applyTierLayoutForces(positionedNodes, 1.0);
    return positionedNodes;
  }, [nodes, worldWidth]);
}
