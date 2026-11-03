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
  vx?: number;
  vy?: number;
  [key: string]: any;
}

export interface DomainClusterBounds {
  domain: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  centerX: number;
  centerY: number;
}

export function clampNodeToTier(node: any) {
  const tierKey = (node.tier as "system" | "mechanism" | "primitive") || "mechanism";
  const config = TIER_CONFIG[tierKey] || TIER_CONFIG.mechanism;

  // Clamping rígido vertical dentro del carril con margen de seguridad
  if (node.y !== undefined) {
    node.y = Math.max(config.yMin + 40, Math.min(config.yMax - 40, node.y));
  }

  // Fuerza de gravedad suave hacia el centro del carril
  if (node.vy !== undefined && node.y !== undefined) {
    const delta = config.centerY - node.y;
    node.vy += delta * 0.08;
  }
}

export function useMatrixLayout(nodes: LayoutNode[], worldWidth = 2400) {
  return useMemo(() => {
    // 1. Filtrar cualquier nodo dummy o centroide físico artificial
    const cleanNodes = nodes.filter((n) => !n.isClusterCentroid && n.id !== "dummy");

    // 2. Extraer campos/dominios únicos para distribuir horizontalmente
    const domainList = Array.from(
      new Set(cleanNodes.map((n) => n.field || n.domain || "General"))
    );
    const domainCount = Math.max(1, domainList.length);
    const spacingX = Math.max(380, worldWidth / (domainCount + 1));

    // 3. Asignar posiciones canónicas dentro de los carriles
    const tierCounters: Record<string, number> = {};

    const positionedNodes = cleanNodes.map((node) => {
      const dom = node.field || node.domain || "General";
      const domIdx = domainList.indexOf(dom);
      const tierKey = (node.tier as "system" | "mechanism" | "primitive") || "mechanism";
      const config = TIER_CONFIG[tierKey] || TIER_CONFIG.mechanism;

      const groupKey = `${dom}_${tierKey}`;
      const count = tierCounters[groupKey] || 0;
      tierCounters[groupKey] = count + 1;

      const baseX = 180 + domIdx * spacingX + ((count % 3) - 1) * 110;
      const baseY = config.centerY + ((count % 2 === 0 ? 1 : -1) * Math.min(45, count * 15));

      const nodeWithCoords = {
        ...node,
        x: node.x !== undefined ? node.x : baseX,
        y: node.y !== undefined ? node.y : baseY,
      };

      clampNodeToTier(nodeWithCoords);
      return nodeWithCoords;
    });

    // 4. Calcular áreas envolventes por dominio (auras de fondo sin colisión)
    const clusterBounds: DomainClusterBounds[] = domainList.map((dom) => {
      const domNodes = positionedNodes.filter(
        (n) => (n.field || n.domain || "General") === dom
      );
      if (domNodes.length === 0) {
        return { domain: dom, minX: 0, maxX: 0, minY: 0, maxY: 0, centerX: 0, centerY: 0 };
      }
      const xs = domNodes.map((n) => n.x ?? 0);
      const ys = domNodes.map((n) => n.y ?? 0);
      const minX = Math.min(...xs) - 120;
      const maxX = Math.max(...xs) + 120;
      const minY = 20;
      const maxY = 1140;
      return {
        domain: dom,
        minX,
        maxX,
        minY,
        maxY,
        centerX: (minX + maxX) / 2,
        centerY: 100,
      };
    });

    return { positionedNodes, clusterBounds };
  }, [nodes, worldWidth]);
}

