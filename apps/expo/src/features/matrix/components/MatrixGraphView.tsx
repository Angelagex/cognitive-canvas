import React, { useMemo, useState, useRef } from "react";
import { View, StyleSheet, Dimensions, PanResponder, GestureResponderEvent } from "react-native";
import Svg, {
  Defs,
  RadialGradient,
  Stop,
  Rect,
  Circle,
  Line,
  Text as SvgText,
  G,
} from "react-native-svg";
import { getDomainColor } from "../utils/domainColors";
import { useMatrixLayout, LayoutNode } from "../hooks/useMatrixLayout";

export const TIER_CONFIG = {
  system: { yMin: 0, yMax: 360, centerY: 180, label: "TIER 2 · SISTEMAS Y TOPOLOGÍAS" },
  mechanism: { yMin: 400, yMax: 760, centerY: 580, label: "TIER 1 · MECANISMOS CAUSALES Y BUCLES" },
  primitive: { yMin: 800, yMax: 1160, centerY: 980, label: "TIER 0 · SUSTRATOS Y DEFINICIONES ATÓMICAS" },
};

export const DOMAIN_THEMES = new Proxy({} as Record<string, { stroke: string; glow: string; text: string }>, {
  get: (_target, prop: string) => getDomainColor(typeof prop === "string" ? prop : undefined),
});

export interface MatrixGraphViewProps {
  nodes: any[];
  edges: any[];
  selectedNodeId?: string | null;
  onSelectNode?: (nodeOrId: any) => void;
  onNodeDragStart?: (nodeId: string) => void;
  onNodeDragMove?: (nodeId: string, currentWorldX: number, currentWorldY: number) => void;
  onNodeDragEnd?: (nodeId: string) => void;
  width?: number;
  height?: number;
}

export const MatrixGraphView: React.FC<MatrixGraphViewProps> = ({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
  onNodeDragStart,
  onNodeDragMove,
  onNodeDragEnd,
  width: propWidth,
  height: propHeight,
}) => {
  const windowDims = Dimensions.get("window");
  const viewportWidth = propWidth || windowDims.width;
  const viewportHeight = propHeight || windowDims.height - 160;
  const canvasWorldWidth = Math.max(viewportWidth * 2.5, 2600);

  // 1. Filtrar nodos inválidos y calcular posiciones iniciales orgánicas
  const rawNodes = useMemo(
    () => (nodes || []).filter((n: any) => !n.isClusterCentroid && n.id !== "dummy" && n.domain !== "<3"),
    [nodes]
  );
  const layoutNodes = useMatrixLayout(rawNodes as LayoutNode[], canvasWorldWidth);

  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const [pan, setPan] = useState({ x: 0, y: 0, scale: 0.95 });

  const activeNodes = useMemo(() => {
    return layoutNodes.map((n) => {
      const override = nodePositions[n.id];
      return override ? { ...n, x: override.x, y: override.y } : n;
    });
  }, [layoutNodes, nodePositions]);

  // 2. Calcular centroides de racimos para auras radiales orgánicas (sin barras rectangulares)
  const clusterHalos = useMemo(() => {
    const domainBuckets = new Map<string, { xs: number[]; ys: number[] }>();

    activeNodes.forEach((n: any) => {
      const d = n.field || n.domain || "General";
      if (!domainBuckets.has(d)) domainBuckets.set(d, { xs: [], ys: [] });
      domainBuckets.get(d)!.xs.push(n.x || 300);
      domainBuckets.get(d)!.ys.push(n.y || 300);
    });

    const halos: Array<{ domain: string; cx: number; cy: number; radius: number; theme: any }> = [];
    domainBuckets.forEach((coords, domain) => {
      if (coords.xs.length === 0) return;
      const avgX = coords.xs.reduce((a, b) => a + b, 0) / coords.xs.length;
      const avgY = coords.ys.reduce((a, b) => a + b, 0) / coords.ys.length;
      const maxDist = Math.max(
        ...coords.xs.map((x, i) => Math.hypot(x - avgX, coords.ys[i] - avgY)),
        160
      );
      halos.push({
        domain,
        cx: avgX,
        cy: avgY,
        radius: maxDist + 130,
        theme: getDomainColor(domain),
      });
    });

    return halos;
  }, [activeNodes]);

  // Gestos táctiles de arrastre y paneo fluido
  const dragRef = useRef({
    startPanX: 0, startPanY: 0, startX: 0, startY: 0,
    draggedNodeId: null as string | null, hasMoved: false,
  });

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gesture) => Math.hypot(gesture.dx, gesture.dy) > 4,
        onPanResponderGrant: (evt: GestureResponderEvent) => {
          const { locationX, locationY } = evt.nativeEvent;
          const worldTouchX = (locationX - pan.x) / pan.scale;
          const worldTouchY = (locationY - pan.y) / pan.scale;

          const hit = activeNodes.find(
            (n) => Math.abs(worldTouchX - (n.x ?? 0)) < 95 && Math.abs(worldTouchY - (n.y ?? 0)) < 25
          );

          dragRef.current = {
            startPanX: pan.x, startPanY: pan.y,
            startX: locationX, startY: locationY,
            draggedNodeId: hit ? hit.id : null,
            hasMoved: false,
          };

          if (hit) onNodeDragStart?.(hit.id);
        },
        onPanResponderMove: (evt, gesture) => {
          dragRef.current.hasMoved = true;
          const { draggedNodeId, startPanX, startPanY } = dragRef.current;

          if (draggedNodeId) {
            const worldX = (evt.nativeEvent.locationX - pan.x) / pan.scale;
            const worldY = (evt.nativeEvent.locationY - pan.y) / pan.scale;
            setNodePositions((prev) => ({
              ...prev,
              [draggedNodeId]: { x: worldX, y: worldY },
            }));
            onNodeDragMove?.(draggedNodeId, worldX, worldY);
          } else {
            setPan((prev) => ({
              ...prev,
              x: startPanX + gesture.dx,
              y: startPanY + gesture.dy,
            }));
          }
        },
        onPanResponderRelease: () => {
          const { draggedNodeId, hasMoved } = dragRef.current;
          if (draggedNodeId) {
            onNodeDragEnd?.(draggedNodeId);
            if (!hasMoved) {
              const hit = activeNodes.find((n) => n.id === draggedNodeId);
              if (hit) onSelectNode?.(hit);
            }
          }
          dragRef.current.draggedNodeId = null;
        },
      }),
    [activeNodes, pan, onSelectNode, onNodeDragStart, onNodeDragMove, onNodeDragEnd]
  );

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${viewportWidth} ${viewportHeight}`}>
        <Defs>
          {clusterHalos.map((h, i) => (
            <RadialGradient key={`grad_${h.domain}_${i}`} id={`halo_grad_${i}`} cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor={h.theme.stroke} stopOpacity="0.18" />
              <Stop offset="70%" stopColor={h.theme.stroke} stopOpacity="0.05" />
              <Stop offset="100%" stopColor={h.theme.stroke} stopOpacity="0" />
            </RadialGradient>
          ))}
        </Defs>

        <G transform={`translate(${pan.x}, ${pan.y}) scale(${pan.scale})`}>
          {/* 1. Carriles de fondo sutiles con divisores punteados */}
          {Object.entries(TIER_CONFIG).map(([tierKey, config]) => (
            <G key={tierKey}>
              <Line x1={0} y1={config.yMax} x2={canvasWorldWidth} y2={config.yMax} stroke="rgba(51, 65, 85, 0.4)" strokeDasharray="6, 6" strokeWidth={1} />
              <SvgText x={40} y={config.yMin + 32} fill="#334155" fontSize={13} fontWeight="700" letterSpacing={1.5}>
                {config.label}
              </SvgText>
            </G>
          ))}

          {/* 2. Halos radiales orgánicos (sin barras rectangulares rígidas) */}
          {clusterHalos.map((halo, i) => (
            <Circle key={`halo_${halo.domain}_${i}`} cx={halo.cx} cy={halo.cy} r={halo.radius} fill={`url(#halo_grad_${i})`} />
          ))}

          {/* 3. Aristas de conexión causal */}
          {(edges || []).map((edge: any) => {
            const source = activeNodes.find((n: any) => n.id === (edge.fromNodeId || edge.source));
            const target = activeNodes.find((n: any) => n.id === (edge.toNodeId || edge.target));
            if (!source || !target) return null;

            const isSelected = selectedNodeId && (source.id === selectedNodeId || target.id === selectedNodeId);
            return (
              <Line
                key={`edge_${edge.fromNodeId || edge.source}_${edge.toNodeId || edge.target}`}
                x1={source.x || 100} y1={source.y || 300}
                x2={target.x || 100} y2={target.y || 300}
                stroke={isSelected ? "#FBBF24" : "rgba(56, 189, 248, 0.35)"}
                strokeWidth={isSelected ? 2.8 : 1.8}
              />
            );
          })}

          {/* 4. Tarjetas conceptuales estilo cristal oscuro (Glassmorphic) */}
          {activeNodes.map((node: any) => {
            const theme = getDomainColor(node.field || node.domain);
            const posX = node.x || 200;
            const posY = node.y || 200;
            const isGhost = node.verificationState === "ghost";
            const isSelected = selectedNodeId === node.id;

            return (
              <G key={node.id} transform={`translate(${posX}, ${posY})`}>
                {/* Sombra de apoyo */}
                <Rect x={-95} y={-22} width={190} height={44} rx={22} fill="#000000" opacity={0.4} />
                {/* Tarjeta principal con borde del dominio */}
                <Rect
                  x={-93} y={-20}
                  width={186} height={40}
                  rx={20}
                  fill="rgba(15, 23, 42, 0.92)"
                  stroke={isSelected ? "#FBBF24" : theme.stroke}
                  strokeWidth={isSelected ? 2.2 : isGhost ? 1.2 : 1.5}
                  strokeDasharray={isGhost ? "4, 4" : undefined}
                  opacity={isGhost ? 0.85 : 1}
                />
                {/* Punto indicador de color del dominio */}
                <Circle cx={-76} cy={0} r={4.5} fill={isSelected ? "#FBBF24" : theme.stroke} />
                {/* Etiqueta tipográfica nítida */}
                <SvgText
                  x={-64} y={4}
                  fill={isSelected ? "#FEF08A" : isGhost ? "#FDE68A" : theme.text}
                  fontSize={11.5} fontWeight="600" textAnchor="start"
                >
                  {node.label.length > 21 ? `${node.label.substring(0, 19)}…` : node.label}
                </SvgText>
              </G>
            );
          })}
        </G>
      </Svg>
    </View>
  );
};

export const DagGraphRenderer = MatrixGraphView;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#070C16",
    overflow: "hidden",
  },
});
