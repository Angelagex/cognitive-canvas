import React from "react";
import { StyleSheet, View, Text } from "react-native";
import { CompiledNode, PacerClassification } from "@cognitive-canvas/core/types";

export interface PacerOverlayLayerProps {
  nodes: CompiledNode[] | null | undefined;
  canvasScale: number;
  canvasTranslateX: number;
  canvasTranslateY: number;
  activeFilter?: PacerClassification | "ALL" | null;
  visible?: boolean;
}

export const PACER_COLORS: Record<
  PacerClassification,
  { label: string; letter: string; color: string; bgColor: string; borderColor: string }
> = {
  CONCEPTUAL: {
    label: "Conceptual",
    letter: "C",
    color: "#60A5FA",
    bgColor: "rgba(30, 58, 138, 0.25)",
    borderColor: "#3B82F6",
  },
  PROCEDURAL: {
    label: "Procedimental",
    letter: "P",
    color: "#34D399",
    bgColor: "rgba(6, 78, 59, 0.25)",
    borderColor: "#10B981",
  },
  ANALOGOUS: {
    label: "Analógico",
    letter: "A",
    color: "#C084FC",
    bgColor: "rgba(88, 28, 135, 0.25)",
    borderColor: "#8B5CF6",
  },
  EVIDENCE: {
    label: "Evidencia",
    letter: "E",
    color: "#FBBF24",
    bgColor: "rgba(120, 53, 15, 0.25)",
    borderColor: "#F59E0B",
  },
  REFERENCE: {
    label: "Referencial",
    letter: "R",
    color: "#9CA3AF",
    bgColor: "rgba(55, 65, 81, 0.25)",
    borderColor: "#6B7280",
  },
};

export const PacerOverlayLayer: React.FC<PacerOverlayLayerProps> = ({
  nodes,
  canvasScale,
  canvasTranslateX,
  canvasTranslateY,
  activeFilter = "ALL",
  visible = true,
}) => {
  if (!visible || !nodes || nodes.length === 0) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {nodes.map((node) => {
        const pacerInfo = PACER_COLORS[node.pacer_classification] || PACER_COLORS.CONCEPTUAL;
        const matchesFilter =
          activeFilter === "ALL" || !activeFilter || activeFilter === node.pacer_classification;

        const left = node.visual_bounding_box.xmin * canvasScale + canvasTranslateX;
        const top = node.visual_bounding_box.ymin * canvasScale + canvasTranslateY;
        const width =
          Math.max(30, (node.visual_bounding_box.xmax - node.visual_bounding_box.xmin)) *
          canvasScale;
        const height =
          Math.max(20, (node.visual_bounding_box.ymax - node.visual_bounding_box.ymin)) *
          canvasScale;

        // Skip rendering if completely off screen or too small
        if (width <= 0 || height <= 0) return null;

        const opacity = matchesFilter ? 1 : 0.2;

        return (
          <View
            key={node.id}
            style={[
              styles.nodeBox,
              {
                left,
                top,
                width,
                height,
                backgroundColor: pacerInfo.bgColor,
                borderColor: pacerInfo.borderColor,
                opacity,
              },
            ]}
          >
            {/* Top-Left Category Badge */}
            <View style={[styles.pacerBadge, { backgroundColor: pacerInfo.borderColor }]}>
              <Text style={styles.pacerBadgeLetter}>{pacerInfo.letter}</Text>
            </View>

            {/* Label caption on larger nodes */}
            {width > 60 && height > 35 && (
              <View style={styles.labelContainer}>
                <Text
                  style={[styles.nodeContentText, { color: pacerInfo.color }]}
                  numberOfLines={1}
                >
                  {node.detected_content}
                </Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  nodeBox: {
    position: "absolute",
    borderWidth: 1.5,
    borderRadius: 8,
    borderStyle: "dashed",
    justifyContent: "space-between",
    padding: 2,
  },
  pacerBadge: {
    position: "absolute",
    top: -10,
    left: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  pacerBadgeLetter: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },
  labelContainer: {
    position: "absolute",
    bottom: -16,
    left: 4,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  nodeContentText: {
    fontSize: 10,
    fontWeight: "700",
  },
});
