import React from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";

interface FloatingFooterProps {
  stylusOnly: boolean;
  onToggleStylusOnly: () => void;
  displayZoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
}

export const FloatingFooter: React.FC<FloatingFooterProps> = ({
  stylusOnly,
  onToggleStylusOnly,
  displayZoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
}) => {
  return (
    <View style={styles.footerContainer} pointerEvents="box-none">
      {/* Left: Solo Stylus Toggle */}
      <TouchableOpacity
        style={[styles.pillButton, stylusOnly ? styles.stylusActive : styles.stylusInactive]}
        onPress={onToggleStylusOnly}
        activeOpacity={0.8}
      >
        <Text style={styles.pillIcon}>{stylusOnly ? "✍️" : "🖐️"}</Text>
        <Text style={[styles.pillText, stylusOnly ? styles.textActive : styles.textInactive]}>
          {stylusOnly ? "Solo S-Pen (Rechazo Palma)" : "Stylus + Dedo"}
        </Text>
      </TouchableOpacity>

      {/* Right: Zoom controls & Reset to 100% */}
      <View style={styles.zoomControlGroup}>
        <TouchableOpacity style={styles.zoomStepButton} onPress={onZoomOut}>
          <Text style={styles.zoomStepText}>−</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.zoomBadge} onPress={onResetZoom}>
          <Text style={styles.zoomBadgeText}>{displayZoom}%</Text>
          <Text style={styles.resetHint}>🎯</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.zoomStepButton} onPress={onZoomIn}>
          <Text style={styles.zoomStepText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  footerContainer: {
    position: "absolute",
    bottom: 18,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 10,
  },
  pillButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
  },
  stylusActive: {
    backgroundColor: "#064E3B",
    borderColor: "#10B981",
  },
  stylusInactive: {
    backgroundColor: "#1E293B",
    borderColor: "#475569",
  },
  pillIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  textActive: {
    color: "#6EE7B7",
  },
  textInactive: {
    color: "#94A3B8",
  },
  zoomControlGroup: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F172A",
    borderRadius: 20,
    paddingHorizontal: 4,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#1E293B",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  zoomStepButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#1E293B",
    alignItems: "center",
    justifyContent: "center",
  },
  zoomStepText: {
    color: "#38BDF8",
    fontSize: 16,
    fontWeight: "800",
  },
  zoomBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  zoomBadgeText: {
    color: "#F8FAFC",
    fontSize: 12,
    fontWeight: "700",
    marginRight: 4,
  },
  resetHint: {
    fontSize: 12,
  },
});
