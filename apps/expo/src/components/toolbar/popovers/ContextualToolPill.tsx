import React from "react";
import { StyleSheet, View, Text, TouchableOpacity, ViewStyle } from "react-native";
import { Eraser, Scissors, Lasso, Trash2, X, Sparkles } from "@sketchyicons/react-native";
import { BrushType, EraserMode } from "../../../types/canvas";

interface ContextualToolPillProps {
  activeBrush: BrushType;
  eraserMode: EraserMode;
  onSelectEraserMode: (mode: EraserMode) => void;
  hasSelection?: boolean;
  selectedCount?: number;
  onDeleteSelection?: () => void;
  onClearSelection?: () => void;
  positionStyle: ViewStyle;
}

export const ContextualToolPill: React.FC<ContextualToolPillProps> = ({
  activeBrush,
  eraserMode,
  onSelectEraserMode,
  hasSelection = false,
  selectedCount = 0,
  onDeleteSelection,
  onClearSelection,
  positionStyle,
}) => {
  if (activeBrush === "eraser") {
    return (
      <View style={[styles.contextualPill, positionStyle, { top: 115 }]}>
        <TouchableOpacity
          style={[
            styles.contextualOption,
            eraserMode === "stroke" && styles.contextualOptionActive,
          ]}
          onPress={() => onSelectEraserMode("stroke")}
          activeOpacity={0.8}
        >
          <Eraser
            size={13}
            color={eraserMode === "stroke" ? "#38BDF8" : "#94A3B8"}
            strokeWidth={1.8}
          />
          <Text
            style={[
              styles.contextualOptionText,
              eraserMode === "stroke" && styles.contextualOptionTextActive,
            ]}
          >
            Trazo
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.contextualOption,
            eraserMode === "precision" && styles.contextualOptionActive,
          ]}
          onPress={() => onSelectEraserMode("precision")}
          activeOpacity={0.8}
        >
          <Scissors
            size={13}
            color={eraserMode === "precision" ? "#38BDF8" : "#94A3B8"}
            strokeWidth={1.8}
          />
          <Text
            style={[
              styles.contextualOptionText,
              eraserMode === "precision" && styles.contextualOptionTextActive,
            ]}
          >
            Píxel
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (activeBrush === "lasso" && hasSelection) {
    return (
      <View style={[styles.contextualPill, positionStyle, { top: 195 }]}>
        <View style={styles.lassoBadge}>
          <Lasso size={13} color="#38BDF8" strokeWidth={1.8} />
          <Text style={styles.lassoBadgeText}>{selectedCount}</Text>
        </View>
        {onDeleteSelection && (
          <TouchableOpacity
            style={styles.lassoActionBtn}
            onPress={onDeleteSelection}
            activeOpacity={0.8}
          >
            <Trash2 size={12} color="#EF4444" strokeWidth={1.8} />
            <Text style={[styles.lassoActionBtnText, { color: "#FCA5A5" }]}>Borrar</Text>
          </TouchableOpacity>
        )}
        {onClearSelection && (
          <TouchableOpacity
            style={styles.lassoActionBtn}
            onPress={onClearSelection}
            activeOpacity={0.8}
          >
            <X size={12} color="#94A3B8" strokeWidth={2.0} />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (activeBrush === "laser") {
    return (
      <View style={[styles.contextualPill, positionStyle, { top: 235 }]}>
        <Sparkles size={13} color="#EF4444" strokeWidth={1.8} />
        <Text style={[styles.lassoBadgeText, { color: "#EF4444" }]}>Láser Efímero (1.5s)</Text>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  contextualPill: {
    position: "absolute",
    backgroundColor: "#0B1120",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1E293B",
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 12,
  },
  contextualOption: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  contextualOptionActive: {
    backgroundColor: "rgba(56, 189, 248, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.4)",
  },
  contextualOptionText: {
    color: "#E2E8F0",
    fontSize: 11,
    fontWeight: "700",
  },
  contextualOptionTextActive: {
    color: "#38BDF8",
  },
  lassoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  lassoBadgeText: {
    color: "#38BDF8",
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 2,
  },
  lassoActionBtn: {
    backgroundColor: "#1E293B",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  lassoActionBtnText: {
    color: "#E2E8F0",
    fontSize: 11,
    fontWeight: "700",
  },
});
