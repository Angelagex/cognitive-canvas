import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Pressable,
  ViewStyle,
} from "react-native";
import { Palette, X } from "@sketchyicons/react-native";
import { styles } from "./ColorPickerPopover.styles";

export const GOODNOTES_PRESETS = [
  // Vibrant
  "#38BDF8", "#F43F5E", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899",
  // Pastel
  "#BAE6FD", "#FECDD3", "#A7F3D0", "#FDE68A", "#DDD6FE", "#FBCFE8",
  // Classic / Dark
  "#FFFFFF", "#94A3B8", "#475569", "#1E293B", "#0F172A", "#E2E8F0",
];

interface ColorPickerPopoverProps {
  visible?: boolean;
  activeColor: string;
  onSelectColor: (color: string) => void;
  favoriteColors: string[];
  onUpdateFavoriteColor: (slotIndex: number, newColor: string) => void;
  onClose: () => void;
  positionStyle: ViewStyle;
}

export const ColorPickerPopover: React.FC<ColorPickerPopoverProps> = ({
  visible = true,
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

  if (!visible) return null;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {/* 1. Backdrop invisible que captura toques en el resto de la pantalla y cierra el popover */}
      <Pressable onPress={onClose} pointerEvents="auto" style={StyleSheet.absoluteFill} />

      {/* 2. Tarjeta del Popover (absorbe eventos para evitar clics pasantes al canvas) */}
      <View
        style={[styles.popoverCard, positionStyle]}
        onStartShouldSetResponder={() => true}
        onTouchEnd={(e) => e.stopPropagation()}
        pointerEvents="auto"
      >
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
            <Palette size={14} color="#94A3B8" strokeWidth={1.8} />
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

      {/* Color Customizer Modal - Overlay sin Modal nativo */}
      {showColorCustomizer && (
        <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { zIndex: 10000 }]}>
          <Pressable
            style={styles.modalOverlay}
            pointerEvents="auto"
            onPress={() => setShowColorCustomizer(false)}
          >
            <View
              style={styles.customizerCard}
              onStartShouldSetResponder={() => true}
              onTouchEnd={(e) => e.stopPropagation()}
              pointerEvents="auto"
            >
              <View style={styles.customizerHeader}>
                <Text style={styles.customizerTitle}>
                  Personalizar Color {editingSlot + 1}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowColorCustomizer(false)}
                  style={styles.closeBtn}
                >
                  <X size={15} color="#94A3B8" strokeWidth={2.0} />
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
          </Pressable>
        </View>
      )}
    </View>
  );
};

