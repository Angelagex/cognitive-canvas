import React, { useState } from "react";
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from "react-native";
import { BrushType } from "../../types/canvas";

interface GoodnotesToolbarProps {
  activeBrush: BrushType;
  onSelectBrush: (brush: BrushType) => void;
  activeColor: string;
  onSelectColor: (color: string) => void;
  activeWidth: number;
  onSelectWidth: (width: number) => void;
  onTriggerPassiveAttribute: () => void;
}

const FAVORITE_COLORS = ["#38BDF8", "#F43F5E", "#10B981"];
const EXTENDED_COLORS = ["#F59E0B", "#A855F7", "#FFFFFF", "#FACC15", "#EC4899", "#64748B"];

const TIP_SIZES = [
  { label: "Fino", value: 8, dot: 4 },
  { label: "Medio", value: 18, dot: 8 },
  { label: "Grueso", value: 32, dot: 13 },
];

export const GoodnotesToolbar: React.FC<GoodnotesToolbarProps> = ({
  activeBrush,
  onSelectBrush,
  activeColor,
  onSelectColor,
  activeWidth,
  onSelectWidth,
  onTriggerPassiveAttribute,
}) => {
  const [showExtendedColors, setShowExtendedColors] = useState(false);

  const tools: { id: BrushType; label: string; icon: string }[] = [
    { id: "pen", label: "Pluma", icon: "🖊️" },
    { id: "highlighter", label: "Resaltador", icon: "✨" },
    { id: "eraser", label: "Borrador", icon: "🧹" },
    { id: "pan", label: "Mover", icon: "🖐️" },
    { id: "lasso", label: "Lazo", icon: "🪢" },
    { id: "shapes", label: "Formas", icon: "📐" },
  ];

  return (
    <View style={styles.toolbarContainer}>
      <View style={styles.toolbarInner}>
        {/* Left: Tool Selectors */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.toolsScroll}
        >
          {tools.map((t) => {
            const isActive = activeBrush === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                style={[styles.toolButton, isActive && styles.toolButtonActive]}
                onPress={() => onSelectBrush(t.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.toolIcon}>{t.icon}</Text>
                <Text style={[styles.toolLabel, isActive && styles.toolLabelActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Atributo Pasivo Button */}
          <TouchableOpacity
            style={styles.passiveAttrButton}
            onPress={onTriggerPassiveAttribute}
            activeOpacity={0.7}
          >
            <Text style={styles.toolIcon}>🏷️</Text>
            <Text style={styles.passiveAttrLabel}>Atributo</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.verticalDivider} />

        {/* Right: Quick Controls (3 Favorite Colors + 3 Tip Sizes) */}
        <View style={styles.quickControls}>
          {/* Colors */}
          <View style={styles.colorRow}>
            {FAVORITE_COLORS.map((c) => {
              const isSelected = activeColor === c;
              return (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorChip,
                    { backgroundColor: c },
                    isSelected && styles.colorChipSelected,
                  ]}
                  onPress={() => onSelectColor(c)}
                  activeOpacity={0.8}
                />
              );
            })}

            {/* Expand more colors */}
            <TouchableOpacity
              style={styles.moreColorsButton}
              onPress={() => setShowExtendedColors(!showExtendedColors)}
            >
              <Text style={styles.moreColorsText}>🎨</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.smallDivider} />

          {/* Stroke Widths */}
          <View style={styles.sizeRow}>
            {TIP_SIZES.map((s) => {
              const isSelected = activeWidth === s.value;
              return (
                <TouchableOpacity
                  key={s.label}
                  style={[styles.sizeButton, isSelected && styles.sizeButtonActive]}
                  onPress={() => onSelectWidth(s.value)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.sizeDot,
                      {
                        width: s.dot,
                        height: s.dot,
                        borderRadius: s.dot / 2,
                        backgroundColor: isSelected ? "#38BDF8" : "#94A3B8",
                      },
                    ]}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      {/* Extended color palette dropdown if expanded */}
      {showExtendedColors && (
        <View style={styles.extendedColorPalette}>
          {EXTENDED_COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[
                styles.colorChipSmall,
                { backgroundColor: c },
                activeColor === c && styles.colorChipSelected,
              ]}
              onPress={() => {
                onSelectColor(c);
                setShowExtendedColors(false);
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  toolbarContainer: {
    height: 56,
    backgroundColor: "#0F172A",
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
    zIndex: 15,
  },
  toolbarInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  toolsScroll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  toolButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#1E293B",
    borderWidth: 1,
    borderColor: "transparent",
  },
  toolButtonActive: {
    backgroundColor: "#1E3A8A",
    borderColor: "#38BDF8",
    shadowColor: "#38BDF8",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  toolIcon: {
    fontSize: 16,
    marginRight: 5,
  },
  toolLabel: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
  },
  toolLabelActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  passiveAttrButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#312E81",
    borderWidth: 1,
    borderColor: "#6366F1",
  },
  passiveAttrLabel: {
    color: "#C7D2FE",
    fontSize: 12,
    fontWeight: "700",
  },
  verticalDivider: {
    width: 1,
    height: 28,
    backgroundColor: "#334155",
    marginHorizontal: 14,
  },
  quickControls: {
    flexDirection: "row",
    alignItems: "center",
  },
  colorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  colorChip: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorChipSmall: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorChipSelected: {
    borderColor: "#FFFFFF",
    transform: [{ scale: 1.15 }],
  },
  moreColorsButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#1E293B",
    alignItems: "center",
    justifyContent: "center",
  },
  moreColorsText: {
    fontSize: 13,
  },
  smallDivider: {
    width: 1,
    height: 20,
    backgroundColor: "#334155",
    marginHorizontal: 12,
  },
  sizeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sizeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#1E293B",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  sizeButtonActive: {
    backgroundColor: "#0F172A",
    borderColor: "#38BDF8",
  },
  sizeDot: {
    backgroundColor: "#94A3B8",
  },
  extendedColorPalette: {
    position: "absolute",
    top: 56,
    right: 70,
    backgroundColor: "#1E293B",
    padding: 10,
    borderRadius: 10,
    flexDirection: "row",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#334155",
  },
});
