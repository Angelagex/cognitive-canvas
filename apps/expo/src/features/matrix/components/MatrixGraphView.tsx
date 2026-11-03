import React, { useMemo, useState, useRef, useCallback } from "react";
import { View, StyleSheet, Dimensions, PanResponder, GestureResponderEvent } from "react-native";
import Svg, { Rect, Line, Text as SvgText, G } from "react-native-svg";
import { getDomainColor } from "../utils/domainColors";
import { useMatrixLayout, clampNodeToTier, LayoutNode } from "../hooks/useMatrixLayout";

export const TIER_CONFIG = {
  system: { yMin: 0, yMax: 360, centerY: 180, label: "TIER 2 · SISTEMAS Y TOPOLOGÍAS", bg: "rgba(15, 23, 42, 0.45)" },
  mechanism: { yMin: 400, yMax: 760, centerY: 580, label: "TIER 1 · MECANISMOS CAUSALES Y BUCLES", bg: "rgba(30, 41, 59, 0.3)" },
  primitive: { yMin: 800, yMax: 1160, centerY: 980, label: "TIER 0 · SUSTRATOS Y DEFINICIONES ATÓMICAS", bg: "rgba(15, 23, 42, 0.55)" },
};

export const DOMAIN_THEMES = new Proxy({} as Record<string, { stroke: string; glow: string; text: string }>, {
  get: (_target, prop: string) => getDomainColor(typeof prop === "string" ? prop : undefined),
});

export interface MatrixGraphViewProps {
  nodes: any[];
  edges: any[];
  selectedNodeId?: string | null;
  onSelectNode?: (nodeOrId: any) => void;
  width?: number;
  height?: number;
}

export const MatrixGraphView: React.FC<MatrixGraphViewProps> = ({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
  width: propWidth,
  height: propHeight,
}) => {
  const windowDims = Dimensions.get("window");
  const viewportWidth = propWidth || windowDims.width;
  const viewportHeight = propHeight || windowDims.height - 160;
  const canvasWorldWidth = Math.max(viewportWidth * 2.8, 2600);

  // 1. Descartar cualquier nodo dummy o centroide físico artificial
  const rawCleanNodes = useMemo(() => {
    return (nodes || []).filter((n: any) => !n.isClusterCentroid && n.id !== "dummy" && n.domain !== "<3");
  }, [nodes]);

  // 2. Calcular posiciones de nodos y halos de dominio
  const { positionedNodes: initialNodes, clusterBounds } = useMatrixLayout(
    rawCleanNodes as LayoutNode[],
    canvasWorldWidth
  );

  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const [pan, setPan] = useState({ x: 0, y: 0, scale: 0.95 });

  const activeNodes = useMemo(() => {
    return initialNodes.map((n) => {
      const override = nodePositions[n.id];
      return override ? { ...n, x: override.x, y: override.y } : n;
    });
  }, [initialNodes, nodePositions]);

  const dragRef = useRef({
    startPanX: 0, startPanY: 0, startX: 0, startY: 0, draggedNodeId: null as string | null, hasMoved: false,
  });

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gesture) => Math.hypot(gesture.dx, gesture.dy) > 4,
        onPanResponderGrant: (evt: GestureResponderEvent) => {
          const { locationX, locationY } = evt.nativeEvent;
          // Comprobar si se tocó un nodo específico en coordenadas de mundo
          const worldTouchX = (locationX - pan.x) / pan.scale;
          const worldTouchY = (locationY - pan.y) / pan.scale;

          const hit = activeNodes.find(
            (n) => Math.abs(worldTouchX - (n.x ?? 0)) < 90 && Math.abs(worldTouchY - (n.y ?? 0)) < 30
          );

          dragRef.current = {
            startPanX: pan.x,
            startPanY: pan.y,
            startX: locationX,
            startY: locationY,
            draggedNodeId: hit ? hit.id : null,
            hasMoved: false,
          };
        },
        onPanResponderMove: (_evt, gesture) => {
          dragRef.current.hasMoved = true;
          const { draggedNodeId, startPanX, startPanY } = dragRef.current;

          if (draggedNodeId) {
            // Arrastre horizontal libre, vertical clamped a su tier
            const target = activeNodes.find((n) => n.id === draggedNodeId);
            if (target) {
              const newX = (target.x ?? 0) + gesture.dx / pan.scale;
              const newY = (target.y ?? 0) + gesture.dy / pan.scale;
              const clamped = { ...target, x: newX, y: newY };
              clampNodeToTier(clamped);
              setNodePositions((prev) => ({
                ...prev,
                [draggedNodeId]: { x: clamped.x, y: clamped.y },
              }));
            }
          } else {
            // Paneo sincronizado del lienzo completo
            setPan((prev) => ({
              ...prev,
              x: startPanX + gesture.dx,
              y: startPanY + gesture.dy,
            }));
          }
        },
        onPanResponderRelease: () => {
          const { draggedNodeId, hasMoved } = dragRef.current;
          if (!hasMoved && draggedNodeId) {
            const hit = activeNodes.find((n) => n.id === draggedNodeId);
            if (hit && onSelectNode) {
              onSelectNode(hit);
            }
          }
          dragRef.current.draggedNodeId = null;
        },
      }),
    [activeNodes, pan, onSelectNode]
  );

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${viewportWidth} ${viewportHeight}`}>
        <G transform={`translate(${pan.x}, ${pan.y}) scale(${pan.scale})`}>
          {/* 1. Carriles de Tiers sincronizados al espacio de mundo */}
          {Object.entries(TIER_CONFIG).map(([tierKey, config]) => (
            <G key={tierKey}>
              <Rect x={0} y={config.yMin} width={canvasWorldWidth} height={config.yMax - config.yMin} fill={config.bg} />
              <Line x1={0} y1={config.yMax} x2={canvasWorldWidth} y2={config.yMax} stroke="rgba(51, 65, 85, 0.45)" strokeDasharray="6, 6" strokeWidth={1} />
              <SvgText x={40} y={config.yMin + 28} fill="#475569" fontSize={13} fontWeight="700" letterSpacing={1.4}>
                {config.label}
              </SvgText>
            </G>
          ))}

          {/* 2. Halos / Auras de Dominio suaves sin colisión */}
          {clusterBounds.map((cluster) => {
            const theme = getDomainColor(cluster.domain);
            const clusterWidth = Math.max(260, cluster.maxX - cluster.minX);
            return (
              <G key={`halo_${cluster.domain}`}>
                <Rect x={cluster.minX} y={cluster.minY} width={clusterWidth} height={1120} rx={24} fill={theme.glow} />
                <SvgText x={cluster.centerX} y={46} fill={theme.stroke} fontSize={12} fontWeight="700" letterSpacing={1.2} textAnchor="middle">
                  ◆ {cluster.domain.toUpperCase()}
                </SvgText>
              </G>
            );
          })}

          {/* 3. Aristas de conexión causal */}
          {(edges || []).map((edge: any) => {
            const source = activeNodes.find((n: any) => n.id === (edge.fromNodeId || edge.source));
            const target = activeNodes.find((n: any) => n.id === (edge.toNodeId || edge.target));
            if (!source || !target) return null;

            const isSelected = selectedNodeId && (source.id === selectedNodeId || target.id === selectedNodeId);
            const strokeColor =
              edge.type === "INHIBITS"
                ? "#EF4444"
                : edge.type === "PREREQUISITE_OF"
                ? "#38BDF8"
                : "rgba(148, 163, 184, 0.45)";

            return (
              <Line
                key={`edge_${edge.fromNodeId || edge.source}_${edge.toNodeId || edge.target}`}
                x1={source.x || 100}
                y1={source.y || 300}
                x2={target.x || 100}
                y2={target.y || 300}
                stroke={isSelected ? "#FBBF24" : strokeColor}
                strokeWidth={isSelected ? 3 : 1.6}
              />
            );
          })}

          {/* 4. Nodos conceptuales canónicos */}
          {activeNodes.map((node: any) => {
            const theme = getDomainColor(node.field || node.domain);
            const posX = node.x || 200;
            const posY = node.y || 200;
            const isSelected = selectedNodeId === node.id;

            return (
              <G
                key={node.id}
                transform={`translate(${posX}, ${posY})`}
                onPress={() => onSelectNode?.(node)}
              >
                {/* Halo del nodo */}
                <Rect
                  x={-90}
                  y={-25}
                  width={180}
                  height={50}
                  rx={25}
                  fill={isSelected ? "rgba(251, 191, 36, 0.35)" : theme.glow}
                />
                {/* Contorno y cuerpo */}
                <Rect
                  x={-87}
                  y={-22}
                  width={174}
                  height={44}
                  rx={22}
                  fill="#0F172A"
                  stroke={isSelected ? "#FBBF24" : theme.stroke}
                  strokeWidth={isSelected ? 2.4 : 1.5}
                />
                <SvgText
                  y={4}
                  fill={isSelected ? "#FEF08A" : theme.text}
                  fontSize={12}
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {node.label.length > 21 ? `${node.label.substring(0, 19)}...` : node.label}
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
    width: "100%",
    height: "100%",
    backgroundColor: "#070C16",
    overflow: "hidden",
  },
});
