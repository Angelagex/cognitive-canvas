import React, { useState, useRef } from "react";
import {
  StyleSheet,
  View,
  Dimensions,
  Animated,
  Text,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Sparkles } from "@sketchyicons/react-native";

export interface StickerToolbarButtonProps {
  canvasScale: number;
  canvasTranslateX: number;
  canvasTranslateY: number;
  dockSide?: "left" | "right";
  onOpenPicker: (
    targetWorld: { x: number; y: number },
    anchorScreen?: { x: number; y: number }
  ) => void;
  onDragChange?: (
    dragState: { isDragging: boolean; screenX: number; screenY: number } | null
  ) => void;
}

export const StickerToolbarButton: React.FC<StickerToolbarButtonProps> = ({
  canvasScale,
  canvasTranslateX,
  canvasTranslateY,
  dockSide = "left",
  onOpenPicker,
  onDragChange,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  // 1. Gesto de Arrastre hacia el lienzo (Drag-to-Drop)
  const panGesture = Gesture.Pan()
    .runOnJS(true)
    .minDistance(8)
    .onStart((event) => {
      setIsDragging(true);
      dragAnim.setValue({
        x: event.absoluteX - 32,
        y: event.absoluteY - 32,
      });
      onDragChange?.({
        isDragging: true,
        screenX: event.absoluteX,
        screenY: event.absoluteY,
      });
    })
    .onUpdate((event) => {
      dragAnim.setValue({
        x: event.absoluteX - 32,
        y: event.absoluteY - 32,
      });
      onDragChange?.({
        isDragging: true,
        screenX: event.absoluteX,
        screenY: event.absoluteY,
      });
    })
    .onEnd((event) => {
      setIsDragging(false);
      onDragChange?.(null);
      const dropX = event.absoluteX;
      const dropY = event.absoluteY;

      // Invariante canónico: Proyección directa a World DP
      const targetWorld = {
        x: (dropX - canvasTranslateX) / canvasScale,
        y: (dropY - canvasTranslateY) / canvasScale,
      };

      onOpenPicker(targetWorld, { x: dropX, y: dropY });
    })
    .onFinalize(() => {
      setIsDragging(false);
      onDragChange?.(null);
    });

  // 2. Gesto de Toque Rápido (Tap)
  const tapGesture = Gesture.Tap()
    .runOnJS(true)
    .onEnd(() => {
      const { width: vw, height: vh } = Dimensions.get("window");
      const centerX = vw / 2;
      const centerY = vh / 2;

      // Invariante canónico: Centrado exacto en el viewport visible
      const targetWorld = {
        x: (centerX - canvasTranslateX) / canvasScale,
        y: (centerY - canvasTranslateY) / canvasScale,
      };

      onOpenPicker(targetWorld, { x: centerX, y: centerY });
    });

  // Exclusividad de gestos: Arrastre tiene precedencia sobre Tap simple
  const combinedGesture = Gesture.Exclusive(panGesture, tapGesture);

  return (
    <>
      <GestureDetector gesture={combinedGesture}>
        <View
          style={[styles.buttonContainer, isDragging && styles.buttonActive]}
          accessibilityLabel="Stickers cognitivos (Tap para centrar, arrastra para soltar)"
        >
          <Sparkles size={20} color={isDragging ? "#38BDF8" : "#94A3B8"} strokeWidth={2.0} />
          <Text style={styles.badgeLabel}>Sticker</Text>
        </View>
      </GestureDetector>

      {/* Indicador fantasma flotante durante el arrastre (si no hay listener externo) */}
      {isDragging && !onDragChange && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.dragGhostHalo,
            {
              transform: dragAnim.getTranslateTransform(),
            },
          ]}
        >
          <View style={styles.haloInner}>
            <Sparkles size={24} color="#38BDF8" strokeWidth={2.2} />
          </View>
        </Animated.View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    width: 44,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 2,
    backgroundColor: "transparent",
  },
  buttonActive: {
    backgroundColor: "rgba(56, 189, 248, 0.15)",
  },
  badgeLabel: {
    fontSize: 8,
    fontWeight: "700",
    color: "#94A3B8",
    marginTop: 1,
    letterSpacing: 0.3,
  },
  dragGhostHalo: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 64,
    height: 64,
    borderRadius: 32,
    zIndex: 9999,
    elevation: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  haloInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    borderWidth: 2,
    borderColor: "#38BDF8",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#38BDF8",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
});
