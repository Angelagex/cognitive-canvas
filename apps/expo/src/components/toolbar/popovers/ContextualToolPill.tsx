import React from "react";
import { StyleSheet, View, Text, TouchableOpacity, Dimensions } from "react-native";
import { Lasso, Trash2, X, BookmarkPlus, Copy } from "@sketchyicons/react-native";
import { SelectionBounds } from "../../../types/canvas";

export interface ContextualSelectionPillProps {
  hasSelection: boolean;
  selectedCount: number;
  selectionBounds: SelectionBounds | null;
  canvasScale: number;
  canvasTranslateX: number;
  canvasTranslateY: number;
  onOpenAttributeModal: () => void;
  onDuplicateSelection?: () => void;
  onDeleteSelection?: () => void;
  onClearSelection?: () => void;
}

export const ContextualSelectionPill: React.FC<ContextualSelectionPillProps> = ({
  hasSelection,
  selectedCount,
  selectionBounds,
  canvasScale,
  canvasTranslateX,
  canvasTranslateY,
  onOpenAttributeModal,
  onDuplicateSelection,
  onDeleteSelection,
  onClearSelection,
}) => {
  if (!hasSelection || !selectionBounds) return null;

  const { width: screenW, height: screenH } = Dimensions.get("window");

  // Proyección de mundo a pantalla
  const screenX = selectionBounds.centerX * canvasScale + canvasTranslateX;
  const screenY = selectionBounds.minY * canvasScale + canvasTranslateY;

  const PILL_WIDTH = 250;
  const PILL_HEIGHT = 44;

  const left = Math.max(16, Math.min(screenW - PILL_WIDTH - 16, screenX - PILL_WIDTH / 2));
  const top = Math.max(70, Math.min(screenH - PILL_HEIGHT - 20, screenY - PILL_HEIGHT - 12));

  return (
    <View style={[styles.floatingWrapper, { left, top }]} pointerEvents="box-none">
      <View style={styles.pillContainer}>
        <View style={styles.badge}>
          <Lasso size={13} color="#38BDF8" strokeWidth={1.8} />
          <Text style={styles.badgeText}>{selectedCount}</Text>
        </View>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.attributeChip}
          onPress={onOpenAttributeModal}
          activeOpacity={0.8}
        >
          <BookmarkPlus size={13} color="#38BDF8" strokeWidth={1.8} />
          <Text style={styles.attributeChipText}>Atributo</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        {onDuplicateSelection && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={onDuplicateSelection}
            activeOpacity={0.8}
            accessibilityLabel="Duplicar selección"
          >
            <Copy size={13} color="#38BDF8" strokeWidth={1.8} />
          </TouchableOpacity>
        )}

        {onDeleteSelection && (
          <TouchableOpacity style={styles.actionBtn} onPress={onDeleteSelection} activeOpacity={0.8}>
            <Trash2 size={13} color="#EF4444" strokeWidth={1.8} />
          </TouchableOpacity>
        )}

        {onClearSelection && (
          <TouchableOpacity style={styles.actionBtn} onPress={onClearSelection} activeOpacity={0.8}>
            <X size={13} color="#94A3B8" strokeWidth={2.0} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export const ContextualToolPill = ContextualSelectionPill;

const styles = StyleSheet.create({
  floatingWrapper: {
    position: "absolute",
    zIndex: 999,
  },
  pillContainer: {
    backgroundColor: "#0B1120",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1E293B",
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  badgeText: {
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: "700",
  },
  divider: {
    width: 1,
    height: 16,
    backgroundColor: "#1E293B",
  },
  attributeChip: {
    backgroundColor: "#0C4A6E",
    borderColor: "#38BDF8",
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
  },
  attributeChipText: {
    color: "#BAE6FD",
    fontSize: 12,
    fontWeight: "700",
  },
  actionBtn: {
    backgroundColor: "#1E293B",
    padding: 6,
    borderRadius: 8,
  },
});
