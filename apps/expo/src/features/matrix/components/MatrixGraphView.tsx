import React, { useMemo, useState, useRef } from "react";
import { View, StyleSheet, Dimensions, TouchableOpacity, Text } from "react-native";
import Svg, { Defs, RadialGradient, Stop, Rect, Circle, Line, Text as SvgText, G } from "react-native-svg";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import { getDomainColor } from "../utils/domainColors";
import { useMatrixLayout, LayoutNode } from "../hooks/useMatrixLayout";

export const TIER_CONFIG = {
  system: { yMin: 0, yMax: 240, centerY: 120, label: "TIER 2 · SISTEMAS Y TOPOLOGÍAS" },
  mechanism: { yMin: 270, yMax: 530, centerY: 400, label: "TIER 1 · MECANISMOS CAUSALES Y BUCLES" },
  primitive: { yMin: 560, yMax: 820, centerY: 690, label: "TIER 0 · SUSTRATOS Y DEFINICIONES ATÓMICAS" },
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
  width: propWidth,
}) => {
  const windowDims = Dimensions.get("window");
  const viewportWidth = propWidth || windowDims.width;
  const canvasWorldWidth = Math.max(viewportWidth * 2.2, 2200);

  const rawNodes = useMemo(
    () => (nodes || []).filter((n: any) => !n.isClusterCentroid && n.id !== "dummy" && n.domain !== "<3"),
    [nodes]
  );
  const layoutNodes = useMatrixLayout(rawNodes as LayoutNode[], canvasWorldWidth);

  // Estados de transformación
  const [pan, setPan] = useState({ x: 24, y: 20 });
  const [scale, setScale] = useState(0.85);

  const startPan = useRef({ x: 24, y: 20 });
  const startScale = useRef(0.85);

  // Gestos nativos con Gesture.Simultaneous (resuelve la intercepción en Android)
  const panGesture = Gesture.Pan()
    .onStart(() => {
      startPan.current = { x: pan.x, y: pan.y };
    })
    .onUpdate((e) => {
      setPan({
        x: startPan.current.x + e.translationX,
        y: startPan.current.y + e.translationY,
      });
    })
    .runOnJS(true);

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      startScale.current = scale;
    })
    .onUpdate((e) => {
      const nextScale = Math.min(1.8, Math.max(0.45, startScale.current * e.scale));
      setScale(nextScale);
    })
    .runOnJS(true);

  const combinedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  const clusterHalos = useMemo(() => {
    const domainBuckets = new Map<string, { xs: number[]; ys: number[] }>();
    layoutNodes.forEach((n: any) => {
      const d = n.field || n.domain || "General";
      if (!domainBuckets.has(d)) domainBuckets.set(d, { xs: [], ys: [] });
      domainBuckets.get(d)!.xs.push(n.x || 300);
      domainBuckets.get(d)!.ys.push(n.y || 300);
    });
    const halos: Array<{ domain: string; cx: number; cy: number; radius: number; theme: any }> = [];
    domainBuckets.forEach((coords, domain) => {
      if (coords.xs.length === 0) return;
      const cx = coords.xs.reduce((a, b) => a + b, 0) / coords.xs.length;
      const cy = coords.ys.reduce((a, b) => a + b, 0) / coords.ys.length;
      const maxDist = Math.max(...coords.xs.map((x, i) => Math.hypot(x - cx, coords.ys[i] - cy)), 140);
      halos.push({ domain, cx, cy, radius: maxDist + 95, theme: getDomainColor(domain) });
    });
    return halos;
  }, [layoutNodes]);

  return (
    <GestureDetector gesture={combinedGesture}>
      <View style={styles.container}>
        <Svg width="100%" height="100%">
          <Defs>
            {clusterHalos.map((h, i) => (
              <RadialGradient key={`grad_${h.domain}_${i}`} id={`halo_grad_${i}`} cx="50%" cy="50%" rx="50%" ry="50%">
                <Stop offset="0%" stopColor={h.theme.stroke} stopOpacity="0.20" />
                <Stop offset="70%" stopColor={h.theme.stroke} stopOpacity="0.05" />
                <Stop offset="100%" stopColor={h.theme.stroke} stopOpacity="0" />
              </RadialGradient>
            ))}
          </Defs>

          <G transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`}>
            {Object.entries(TIER_CONFIG).map(([tierKey, config]) => (
              <G key={tierKey}>
                <Line x1={-500} y1={config.yMax} x2={canvasWorldWidth + 500} y2={config.yMax} stroke="rgba(51, 65, 85, 0.45)" strokeDasharray="6, 6" strokeWidth={1} />
                <SvgText x={40} y={config.yMin + 26} fill="#475569" fontSize={12} fontWeight="700" letterSpacing={1.5}>
                  {config.label}
                </SvgText>
              </G>
            ))}

            {clusterHalos.map((halo, i) => (
              <Circle key={`halo_${halo.domain}_${i}`} cx={halo.cx} cy={halo.cy} r={halo.radius} fill={`url(#halo_grad_${i})`} />
            ))}

            {(edges || []).map((edge: any) => {
              const s = layoutNodes.find((n: any) => n.id === (edge.fromNodeId || edge.source));
              const t = layoutNodes.find((n: any) => n.id === (edge.toNodeId || edge.target));
              if (!s || !t) return null;
              const isSel = selectedNodeId && (s.id === selectedNodeId || t.id === selectedNodeId);
              return (
                <Line
                  key={`edge_${s.id}_${t.id}`}
                  x1={s.x || 100} y1={s.y || 300}
                  x2={t.x || 100} y2={t.y || 300}
                  stroke={isSel ? "#FBBF24" : "rgba(56, 189, 248, 0.35)"}
                  strokeWidth={isSel ? 2.6 : 1.8}
                />
              );
            })}

            {layoutNodes.map((node: any) => {
              const theme = getDomainColor(node.field || node.domain);
              const posX = node.x || 200, posY = node.y || 200;
              const isGhost = node.verificationState === "ghost";
              const isSel = selectedNodeId === node.id;
              return (
                <G key={node.id} transform={`translate(${posX}, ${posY})`} onPress={() => onSelectNode?.(node)}>
                  <Rect x={-92} y={-20} width={184} height={40} rx={20} fill="#000000" opacity={0.4} />
                  <Rect
                    x={-90} y={-18}
                    width={180} height={36}
                    rx={18}
                    fill="rgba(15, 23, 42, 0.94)"
                    stroke={isSel ? "#FBBF24" : theme.stroke}
                    strokeWidth={isSel ? 2.2 : isGhost ? 1.2 : 1.4}
                    strokeDasharray={isGhost ? "4, 4" : undefined}
                  />
                  <Circle cx={-74} cy={0} r={4} fill={isSel ? "#FBBF24" : theme.stroke} />
                  <SvgText
                    x={-62} y={4}
                    fill={isSel ? "#FEF08A" : isGhost ? "#FDE68A" : theme.text}
                    fontSize={11} fontWeight="600" textAnchor="start"
                  >
                    {node.label.length > 20 ? `${node.label.substring(0, 18)}…` : node.label}
                  </SvgText>
                </G>
              );
            })}
          </G>
        </Svg>

        <View style={styles.zoomControls}>
          <TouchableOpacity style={styles.zoomBtn} onPress={() => setScale((s) => Math.min(1.8, s + 0.15))}>
            <Text style={styles.zoomBtnText}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.zoomBtn} onPress={() => setScale((s) => Math.max(0.45, s - 0.15))}>
            <Text style={styles.zoomBtnText}>−</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.zoomBtn} onPress={() => { setPan({ x: 24, y: 20 }); setScale(0.85); }}>
            <Text style={styles.zoomBtnText}>⟲</Text>
          </TouchableOpacity>
        </View>
      </View>
    </GestureDetector>
  );
};

export const DagGraphRenderer = MatrixGraphView;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#070C16", overflow: "hidden" },
  zoomControls: { position: "absolute", bottom: 20, right: 20, flexDirection: "column", gap: 8 },
  zoomBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(30, 41, 59, 0.85)",
    borderWidth: 1,
    borderColor: "#334155",
    alignItems: "center",
    justifyContent: "center",
  },
  zoomBtnText: { color: "#F8FAFC", fontSize: 16, fontWeight: "700" },
});
