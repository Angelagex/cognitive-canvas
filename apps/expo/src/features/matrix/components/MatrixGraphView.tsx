import React, { useMemo, useState, useRef } from "react";
import { View, StyleSheet, Dimensions, TouchableOpacity, Text } from "react-native";
import Svg, { Rect, Line, Text as SvgText, G } from "react-native-svg";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import { getDomainColor } from "../utils/domainColors";
import { useMatrixLayout, LayoutNode } from "../hooks/useMatrixLayout";
import { useSkin, fonts, radius } from "../../../theme";

export const TIER_CONFIG = {
  system: { yMin: 0, yMax: 260, centerY: 130, label: "TIER 2 · SISTEMAS Y TOPOLOGÍAS MACRO" },
  mechanism: { yMin: 260, yMax: 550, centerY: 405, label: "TIER 1 · MECANISMOS CAUSALES Y BUCLES" },
  primitive: { yMin: 550, yMax: 850, centerY: 700, label: "TIER 0 · SUSTRATOS Y DEFINICIONES ATÓMICAS" },
};

export const DOMAIN_THEMES = new Proxy({} as Record<string, { stroke: string; glow: string; text: string; symbol: string }>, {
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
  nodes, edges, selectedNodeId, onSelectNode, width: propWidth,
}) => {
  const { skin } = useSkin();
  const windowDims = Dimensions.get("window");
  const viewportWidth = propWidth || windowDims.width;
  const canvasWorldWidth = Math.max(viewportWidth * 2.2, 2200);

  const rawNodes = useMemo(() => (nodes || []).filter((n: any) => !n.isClusterCentroid && n.id !== "dummy" && n.domain !== "<3"), [nodes]);
  const layoutNodes = useMatrixLayout(rawNodes as LayoutNode[], canvasWorldWidth);

  const [pan, setPan] = useState({ x: 24, y: 20 });
  const [scale, setScale] = useState(0.85);
  const startPan = useRef({ x: 24, y: 20 });
  const startScale = useRef(0.85);

  const panGesture = Gesture.Pan()
    .onStart(() => { startPan.current = { x: pan.x, y: pan.y }; })
    .onUpdate((e) => setPan({ x: startPan.current.x + e.translationX, y: startPan.current.y + e.translationY }))
    .runOnJS(true);

  const pinchGesture = Gesture.Pinch()
    .onStart(() => { startScale.current = scale; })
    .onUpdate((e) => setScale(Math.min(1.8, Math.max(0.45, startScale.current * e.scale))))
    .runOnJS(true);

  const combinedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  // Islas planas con borde punteado y relleno ~9% (§6)
  const flatIslands = useMemo(() => {
    const domainBuckets = new Map<string, { xs: number[]; ys: number[] }>();
    layoutNodes.forEach((n: any) => {
      const d = n.field || n.domain || "General";
      if (!domainBuckets.has(d)) domainBuckets.set(d, { xs: [], ys: [] });
      domainBuckets.get(d)!.xs.push(n.x || 300);
      domainBuckets.get(d)!.ys.push(n.y || 300);
    });
    return Array.from(domainBuckets.entries()).map(([domain, coords]) => {
      const minX = Math.min(...coords.xs) - 120, maxX = Math.max(...coords.xs) + 120;
      const minY = Math.min(...coords.ys) - 50, maxY = Math.max(...coords.ys) + 50;
      return { domain, minX, minY, width: Math.max(280, maxX - minX), height: Math.max(140, maxY - minY), theme: getDomainColor(domain) };
    });
  }, [layoutNodes]);

  const tierEntries = Object.entries(TIER_CONFIG);

  return (
    <GestureDetector gesture={combinedGesture}>
      <View style={[styles.container, { backgroundColor: skin.bg }]}>
        <Svg width="100%" height="100%">
          <G transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`}>
            {/* Bandas planas alternas por nivel (§6) */}
            {tierEntries.map(([tierKey, config], idx) => (
              <G key={`tier_${tierKey}`}>
                <Rect x={-1000} y={config.yMin} width={canvasWorldWidth + 2000} height={config.yMax - config.yMin} fill={idx % 2 === 0 ? skin.surface : skin.surfaceAlt} />
                <Line x1={-1000} y1={config.yMax} x2={canvasWorldWidth + 1000} y2={config.yMax} stroke={skin.borderSoft} strokeDasharray="6, 6" strokeWidth={1} />
                <SvgText x={40} y={config.yMin + 28} fill={skin.textMuted} fontSize={11} fontFamily={fonts.monoBold} letterSpacing={1.2}>
                  {config.label}
                </SvgText>
              </G>
            ))}

            {/* Islas planas (§6) */}
            {flatIslands.map((island) => (
              <G key={`island_${island.domain}`}>
                <Rect x={island.minX} y={island.minY} width={island.width} height={island.height} rx={26} fill={island.theme.tint || `${island.theme.stroke}16`} stroke={island.theme.stroke} strokeWidth={1.5} strokeDasharray="6, 6" />
                <SvgText x={island.minX + 16} y={island.minY + 22} fill={island.theme.stroke} fontSize={10} fontFamily={fonts.monoBold} letterSpacing={0.8}>
                  {island.theme.symbol} {island.domain.toUpperCase()}
                </SvgText>
              </G>
            ))}

            {/* Aristas causales */}
            {(edges || []).map((edge: any) => {
              const s = layoutNodes.find((n: any) => n.id === (edge.fromNodeId || edge.source));
              const t = layoutNodes.find((n: any) => n.id === (edge.toNodeId || edge.target));
              if (!s || !t) return null;
              const isSel = selectedNodeId && (s.id === selectedNodeId || t.id === selectedNodeId);
              return <Line key={`edge_${s.id}_${t.id}`} x1={s.x || 100} y1={s.y || 300} x2={t.x || 100} y2={t.y || 300} stroke={isSel ? skin.warm : skin.border} strokeWidth={isSel ? 2.4 : 1.6} />;
            })}

            {/* Nodos con símbolo de dominio y sombra dura */}
            {layoutNodes.map((node: any) => {
              const theme = getDomainColor(node.field || node.domain);
              const isGhost = node.verificationState === "ghost";
              const isSel = selectedNodeId === node.id;
              const borderColor = isSel ? skin.warm : theme.stroke;

              return (
                <G key={node.id} transform={`translate(${node.x || 200}, ${node.y || 200})`} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); onSelectNode?.(node); }}>
                  <Rect x={-88} y={-16} width={180} height={36} rx={radius.pill} fill={skin.shadow} />
                  <Rect x={-90} y={-18} width={180} height={36} rx={radius.pill} fill={isSel ? skin.surfaceAlt : skin.surface} stroke={borderColor} strokeWidth={isSel ? 2.2 : isGhost ? 1.2 : 1.5} strokeDasharray={isGhost ? "4, 4" : undefined} />
                  <SvgText x={-76} y={4} fill={borderColor} fontSize={11} fontFamily={fonts.monoBold} textAnchor="middle">{theme.symbol}</SvgText>
                  <SvgText x={-64} y={4} fill={skin.text} fontSize={11} fontFamily={fonts.uiBold} textAnchor="start">
                    {node.label.length > 18 ? `${node.label.substring(0, 16)}…` : node.label}
                  </SvgText>
                </G>
              );
            })}
          </G>
        </Svg>

        {/* Controles de zoom */}
        <View style={styles.zoomControls}>
          <TouchableOpacity style={[styles.zoomBtn, { backgroundColor: skin.surface, borderColor: skin.borderSoft }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); setScale((s) => Math.min(1.8, s + 0.15)); }}>
            <Text style={[styles.zoomBtnText, { color: skin.text }]}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.zoomBtn, { backgroundColor: skin.surface, borderColor: skin.borderSoft }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); setScale((s) => Math.max(0.45, s - 0.15)); }}>
            <Text style={[styles.zoomBtnText, { color: skin.text }]}>−</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.zoomBtn, { backgroundColor: skin.surface, borderColor: skin.borderSoft }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); setPan({ x: 24, y: 20 }); setScale(0.85); }}>
            <Text style={[styles.zoomBtnText, { color: skin.text }]}>⟲</Text>
          </TouchableOpacity>
        </View>
      </View>
    </GestureDetector>
  );
};

export const DagGraphRenderer = MatrixGraphView;

const styles = StyleSheet.create({
  container: { flex: 1, overflow: "hidden" },
  zoomControls: { position: "absolute", bottom: 20, right: 20, gap: 8 },
  zoomBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  zoomBtnText: { fontSize: 16, fontWeight: "700" },
});
