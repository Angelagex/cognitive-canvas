import React from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { useCognitiveLayerStore } from "../../stores/useCognitiveLayerStore";

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
  const { hasCompiledData, isOverlayVisible, toggleOverlay, isDirty, compiledData } =
    useCognitiveLayerStore();

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

      {/* Center: Toggle Capa Cognitiva (Ghost Overlay HUD) */}
      {hasCompiledData && (
        <TouchableOpacity
          style={[
            styles.pillButton,
            isOverlayVisible ? styles.overlayActive : styles.overlayInactive,
            isDirty && styles.overlayDirtyBorder,
          ]}
          onPress={toggleOverlay}
          activeOpacity={0.8}
        >
          <Text style={styles.pillIcon}>{isOverlayVisible ? "👁️" : "🙈"}</Text>
          <Text
            style={[
              styles.pillText,
              isOverlayVisible ? styles.textOverlayActive : styles.textInactive,
            ]}
          >
            {isOverlayVisible ? "Capa Cognitiva" : "Capa Oculta"}
          </Text>
          {compiledData?.map_overview?.maturity_level && (
            <View style={styles.maturityBadge}>
              <Text style={styles.maturityText}>
                N{compiledData.map_overview.maturity_level}
              </Text>
            </View>
          )}
          {isDirty && <View style={styles.dirtyDot} />}
        </TouchableOpacity>
      )}

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
  overlayActive: {
    backgroundColor: "#1E1B4B",
    borderColor: "#6366F1",
  },
  overlayInactive: {
    backgroundColor: "#1E293B",
    borderColor: "#475569",
  },
  overlayDirtyBorder: {
    borderColor: "#F59E0B",
  },
  textOverlayActive: {
    color: "#A5B4FC",
  },
  maturityBadge: {
    backgroundColor: "#4338CA",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    marginLeft: 6,
  },
  maturityText: {
    color: "#EEF2FF",
    fontSize: 10,
    fontWeight: "900",
  },
  dirtyDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#F59E0B",
    marginLeft: 6,
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
