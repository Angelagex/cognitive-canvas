import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  TouchableWithoutFeedback,
  ViewStyle,
} from "react-native";

export const GOODNOTES_PRESETS = [
  // Vibrant
  "#38BDF8", "#F43F5E", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899",
  // Pastel
  "#BAE6FD", "#FECDD3", "#A7F3D0", "#FDE68A", "#DDD6FE", "#FBCFE8",
  // Classic / Dark
  "#FFFFFF", "#94A3B8", "#475569", "#1E293B", "#0F172A", "#E2E8F0",
];

interface ColorPickerPopoverProps {
  activeColor: string;
  onSelectColor: (color: string) => void;
  favoriteColors: string[];
  onUpdateFavoriteColor: (slotIndex: number, newColor: string) => void;
  onClose: () => void;
  positionStyle: ViewStyle;
}

export const ColorPickerPopover: React.FC<ColorPickerPopoverProps> = ({
  activeColor,
  onSelectColor,
  favoriteColors,
  onUpdateFavoriteColor,
  onClose,
  positionStyle,
}) => {
  const [showColorCustomizer, setShowColorCustomizer] = useState(false);
  const [editingSlot, setEditingSlot] = useState<number>(0);
  const [customHexInput, setCustomHexInput] = useState<string>("#38BDF8");

  const handleOpenColorSlotCustomizer = (slotIndex: number) => {
    setEditingSlot(slotIndex);
    setCustomHexInput(favoriteColors[slotIndex] || "#38BDF8");
    setShowColorCustomizer(true);
  };

  const handleApplyColor = (color: string) => {
    onUpdateFavoriteColor(editingSlot, color);
    setShowColorCustomizer(false);
  };

  return (
    <>
      <View style={[styles.popoverCard, positionStyle, { top: 320 }]}>
        <Text style={styles.popoverHeader}>FAVORITOS</Text>
        <View style={styles.favoriteRow}>
          {favoriteColors.map((c, index) => {
            const isSelected = activeColor.toUpperCase() === c.toUpperCase();
            return (
              <TouchableOpacity
                key={`fav-${index}`}
                style={[
                  styles.favColorChip,
                  { backgroundColor: c },
                  isSelected && styles.favColorChipSelected,
                ]}
                onPress={() => {
                  onSelectColor(c);
                  onClose();
                }}
                onLongPress={() => handleOpenColorSlotCustomizer(index)}
                activeOpacity={0.8}
              >
                {isSelected && <View style={styles.favColorDot} />}
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            style={styles.customColorTrigger}
            onPress={() => handleOpenColorSlotCustomizer(0)}
            activeOpacity={0.7}
          >
            <Text style={styles.customColorTriggerText}>🎨</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.popoverHeader, { marginTop: 10 }]}>PRESETS</Text>
        <View style={styles.presetGrid}>
          {GOODNOTES_PRESETS.map((hex) => {
            const isSelected = activeColor.toUpperCase() === hex.toUpperCase();
            return (
              <TouchableOpacity
                key={hex}
                style={[
                  styles.presetDot,
                  { backgroundColor: hex },
                  isSelected && styles.presetDotSelected,
                ]}
                onPress={() => {
                  onSelectColor(hex);
                  onClose();
                }}
                activeOpacity={0.8}
              >
                {isSelected && <View style={styles.favColorDot} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Color Customizer Modal */}
      <Modal
        visible={showColorCustomizer}
        transparent
        animationType="fade"
        onRequestClose={() => setShowColorCustomizer(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowColorCustomizer(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.customizerCard}>
                <View style={styles.customizerHeader}>
                  <Text style={styles.customizerTitle}>
                    Personalizar Color {editingSlot + 1}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowColorCustomizer(false)}
                    style={styles.closeBtn}
                  >
                    <Text style={styles.closeBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Palette Grid */}
                <Text style={styles.customizerSectionTitle}>PALETA DE COLORES</Text>
                <View style={styles.customizerGrid}>
                  {GOODNOTES_PRESETS.map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[styles.paletteColorTile, { backgroundColor: color }]}
                      onPress={() => handleApplyColor(color)}
                      activeOpacity={0.8}
                    />
                  ))}
                </View>

                {/* Custom HEX Code */}
                <View style={styles.hexInputRow}>
                  <Text style={styles.hexLabel}>HEX:</Text>
                  <TextInput
                    style={styles.hexInput}
                    value={customHexInput}
                    onChangeText={setCustomHexInput}
                    placeholder="#38BDF8"
                    placeholderTextColor="#64748B"
                    maxLength={7}
                    autoCapitalize="characters"
                  />
                  <View style={[styles.hexPreview, { backgroundColor: customHexInput }]} />
                  <TouchableOpacity
                    style={styles.hexApplyBtn}
                    onPress={() => handleApplyColor(customHexInput)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.hexApplyBtnText}>Usar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  popoverCard: {
    position: "absolute",
    backgroundColor: "#0B1120",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1E293B",
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 16,
  },
  popoverHeader: {
    color: "#64748B",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 8,
  },
  favoriteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  favColorChip: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  favColorChipSelected: {
    borderWidth: 2,
    borderColor: "#FFFFFF",
    transform: [{ scale: 1.1 }],
  },
  favColorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
  },
  customColorTrigger: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#1E293B",
    justifyContent: "center",
    alignItems: "center",
  },
  customColorTriggerText: {
    fontSize: 14,
  },
  presetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: 168,
    gap: 6,
  },
  presetDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  presetDotSelected: {
    borderWidth: 2,
    borderColor: "#FFFFFF",
    transform: [{ scale: 1.15 }],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
  },
  customizerCard: {
    width: 320,
    backgroundColor: "#0B1120",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1E293B",
    padding: 20,
  },
  customizerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  customizerTitle: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "700",
  },
  closeBtn: {
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 14,
    backgroundColor: "#1E293B",
  },
  closeBtnText: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "700",
  },
  customizerSectionTitle: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 10,
  },
  customizerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 18,
  },
  paletteColorTile: {
    width: 38,
    height: 38,
    borderRadius: 10,
  },
  hexInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  hexLabel: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
  },
  hexInput: {
    flex: 1,
    height: 38,
    backgroundColor: "#1E293B",
    borderRadius: 10,
    paddingHorizontal: 12,
    color: "#F8FAFC",
    fontSize: 13,
    fontWeight: "600",
    borderWidth: 1,
    borderColor: "#334155",
  },
  hexPreview: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#475569",
  },
  hexApplyBtn: {
    backgroundColor: "#38BDF8",
    paddingHorizontal: 14,
    height: 38,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  hexApplyBtnText: {
    color: "#0F172A",
    fontWeight: "700",
    fontSize: 12,
  },
});
