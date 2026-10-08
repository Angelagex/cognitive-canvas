import React from "react";
import { StyleSheet, View, Text, TouchableOpacity, ViewStyle } from "react-native";
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
          <Text style={styles.contextualOptionText}>🧹 Trazo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.contextualOption,
            eraserMode === "precision" && styles.contextualOptionActive,
          ]}
          onPress={() => onSelectEraserMode("precision")}
          activeOpacity={0.8}
        >
          <Text style={styles.contextualOptionText}>✂️ Píxel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (activeBrush === "lasso" && hasSelection) {
    return (
      <View style={[styles.contextualPill, positionStyle, { top: 195 }]}>
        <Text style={styles.lassoBadgeText}>🪢 {selectedCount}</Text>
        {onDeleteSelection && (
          <TouchableOpacity
            style={styles.lassoActionBtn}
            onPress={onDeleteSelection}
            activeOpacity={0.8}
          >
            <Text style={styles.lassoActionBtnText}>🗑️ Borrar</Text>
          </TouchableOpacity>
        )}
        {onClearSelection && (
          <TouchableOpacity
            style={styles.lassoActionBtn}
            onPress={onClearSelection}
            activeOpacity={0.8}
          >
            <Text style={styles.lassoActionBtnText}>✕</Text>
          </TouchableOpacity>
        )}
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
  lassoBadgeText: {
    color: "#38BDF8",
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 4,
  },
  lassoActionBtn: {
    backgroundColor: "#1E293B",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  lassoActionBtnText: {
    color: "#E2E8F0",
    fontSize: 11,
    fontWeight: "700",
  },
});
