import React from "react";
import { StyleSheet, View, Text, TouchableOpacity, Pressable, ViewStyle } from "react-native";
import { Eraser, Scissors } from "@sketchyicons/react-native";
import { EraserMode } from "../../../types/canvas";

interface EraserModePillProps {
  visible?: boolean;
  eraserMode: EraserMode;
  onSelectEraserMode: (mode: EraserMode) => void;
  onClose?: () => void;
  positionStyle: ViewStyle;
}

export const EraserModePill: React.FC<EraserModePillProps> = ({
  visible = true,
  eraserMode,
  onSelectEraserMode,
  onClose,
  positionStyle,
}) => {
  if (!visible) return null;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {/* 1. Backdrop invisible que captura toques en el resto de la pantalla y cierra el popover */}
      <Pressable onPress={onClose} pointerEvents="auto" style={StyleSheet.absoluteFill} />

      {/* 2. Tarjeta del Popover (absorbe eventos para evitar clics pasantes al canvas) */}
      <View
        onStartShouldSetResponder={() => true}
        onTouchEnd={(e) => e.stopPropagation()}
        pointerEvents="auto"
        style={[styles.contextualPill, styles.eraserPill, positionStyle]}
      >
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
    </View>
  );
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
    justifyContent: "center",
    flexWrap: "nowrap",
    flexShrink: 0,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 20,
    zIndex: 9999,
  },
  eraserPill: {
    width: 170,
    height: 42,
  },
  contextualOption: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "transparent",
  },
  contextualOptionActive: {
    backgroundColor: "#1E293B",
  },
  contextualOptionText: {
    color: "#E2E8F0",
    fontSize: 11,
    fontWeight: "700",
  },
  contextualOptionTextActive: {
    color: "#38BDF8",
  },
});
