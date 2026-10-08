import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  TouchableWithoutFeedback,
  ScrollView,
} from "react-native";
import { BrushType, CanvasBackgroundType, EraserMode, PassiveAttributeType } from "../../types/canvas";

interface GoodnotesToolbarProps {
  activeBrush: BrushType;
  onSelectBrush: (brush: BrushType) => void;
  activeColor: string;
  onSelectColor: (color: string) => void;
  activeWidth: number;
  onSelectWidth: (width: number) => void;
  eraserMode: EraserMode;
  onSelectEraserMode: (mode: EraserMode) => void;
  backgroundType: CanvasBackgroundType;
  onSelectBackgroundType: (type: CanvasBackgroundType) => void;
  favoriteColors: string[];
  onUpdateFavoriteColor: (slotIndex: number, newColor: string) => void;
  onTriggerPassiveAttribute?: () => void;
  hasSelection?: boolean;
  selectedCount?: number;
  onDeleteSelection?: () => void;
  onClearSelection?: () => void;
  onAddAttribute?: (type: PassiveAttributeType, title: string, note: string) => void;
  dockSide?: "left" | "right";
  initialDockSide?: "left" | "right";
  onToggleDockSide?: () => void;
  onDockSideChange?: (side: "left" | "right") => void;
}

const GOODNOTES_PRESETS = [
  // Vibrant
  "#38BDF8", "#F43F5E", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899",
  // Pastel
  "#BAE6FD", "#FECDD3", "#A7F3D0", "#FDE68A", "#DDD6FE", "#FBCFE8",
  // Classic / Dark
  "#FFFFFF", "#94A3B8", "#475569", "#1E293B", "#0F172A", "#E2E8F0",
];

const TIP_SIZES = [
  { label: "Ultra Fino", value: 4, dot: 3, desc: "0.4 mm" },
  { label: "Fino", value: 8, dot: 5, desc: "0.8 mm" },
  { label: "Medio", value: 16, dot: 8, desc: "1.6 mm" },
  { label: "Grueso", value: 24, dot: 12, desc: "2.4 mm" },
  { label: "Marcador", value: 36, dot: 16, desc: "3.6 mm" },
  { label: "Pincel", value: 50, dot: 22, desc: "5.0 mm" },
];

const PAPER_TEMPLATES: { id: CanvasBackgroundType; label: string; icon: string }[] = [
  { id: "dot_grid", label: "Puntos", icon: "⠇" },
  { id: "graph_grid", label: "Cuadrícula", icon: "▦" },
  { id: "ruled", label: "Rayado", icon: "≡" },
  { id: "blank", label: "Liso", icon: "📄" },
];

export const GoodnotesToolbar: React.FC<GoodnotesToolbarProps> = ({
  activeBrush,
  onSelectBrush,
  activeColor,
  onSelectColor,
  activeWidth,
  onSelectWidth,
  eraserMode,
  onSelectEraserMode,
  backgroundType,
  onSelectBackgroundType,
  favoriteColors,
  onUpdateFavoriteColor,
  hasSelection = false,
  selectedCount = 0,
  onDeleteSelection,
  onClearSelection,
  dockSide: dockSideProp,
  initialDockSide = "left",
  onToggleDockSide,
  onDockSideChange,
}) => {
  // Dock placement state (Left or Right side of canvas)
  const [internalDockSide, setInternalDockSide] = useState<"left" | "right">(initialDockSide);
  const dockSide = dockSideProp !== undefined ? dockSideProp : internalDockSide;

  // Popover menus state
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [showSizeMenu, setShowSizeMenu] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showColorCustomizer, setShowColorCustomizer] = useState(false);
  const [editingSlot, setEditingSlot] = useState<number>(0);
  const [customHexInput, setCustomHexInput] = useState<string>("#38BDF8");

  const tools: { id: BrushType; label: string; icon: string }[] = [
    { id: "pen", label: "Pluma", icon: "🖊️" },
    { id: "highlighter", label: "Resaltador", icon: "✨" },
    { id: "eraser", label: "Borrador", icon: "🧹" },
    { id: "shapes", label: "Formas", icon: "📐" },
    { id: "lasso", label: "Lazo", icon: "🪢" },
    { id: "pan", label: "Mover", icon: "🖐️" },
  ];

  const toggleDockSide = () => {
    if (onToggleDockSide) {
      onToggleDockSide();
    } else {
      const nextSide = dockSide === "left" ? "right" : "left";
      setInternalDockSide(nextSide);
      if (onDockSideChange) onDockSideChange(nextSide);
    }
    // Close open popovers when flipping sides
    setShowTemplateMenu(false);
    setShowSizeMenu(false);
    setShowColorMenu(false);
  };

  const handleOpenColorSlotCustomizer = (slotIndex: number) => {
    setEditingSlot(slotIndex);
    setCustomHexInput(favoriteColors[slotIndex] || "#38BDF8");
    setShowColorCustomizer(true);
  };

  const handleApplyColor = (color: string) => {
    onUpdateFavoriteColor(editingSlot, color);
    setShowColorCustomizer(false);
  };

  const popoverPositionStyle = dockSide === "left" ? { left: 62 } : { right: 62 };

  return (
    <View
      style={[
        styles.dockWrapper,
        dockSide === "left" ? styles.dockWrapperLeft : styles.dockWrapperRight,
      ]}
      pointerEvents="box-none"
    >
      {/* 1. Main Vertical Floating Dock Pill */}
      <View style={styles.dockPill}>
        {/* Toggle Left/Right Position Button */}
        <TouchableOpacity
          style={styles.switchSideButton}
          onPress={toggleDockSide}
          activeOpacity={0.7}
          accessibilityLabel={`Mover barra al lateral ${dockSide === "left" ? "derecho" : "izquierdo"}`}
        >
          <Text style={styles.switchSideIcon}>⇄</Text>
        </TouchableOpacity>

        <View style={styles.horizontalDivider} />

        {/* Tools Section */}
        {tools.map((t) => {
          const isActive = activeBrush === t.id;
          return (
            <TouchableOpacity
              key={t.id}
              style={[styles.toolButton, isActive && styles.toolButtonActive]}
              onPress={() => {
                onSelectBrush(t.id);
                setShowTemplateMenu(false);
                setShowSizeMenu(false);
                setShowColorMenu(false);
              }}
              activeOpacity={0.7}
              accessibilityLabel={t.label}
            >
              <Text style={styles.toolIcon}>{t.icon}</Text>
              {isActive && (
                <View
                  style={[
                    styles.toolActiveIndicator,
                    dockSide === "left" ? styles.indicatorLeft : styles.indicatorRight,
                  ]}
                />
              )}
            </TouchableOpacity>
          );
        })}

        {/* Selector de Plantilla de Papel */}
        <TouchableOpacity
          style={[styles.toolButton, showTemplateMenu && styles.toolButtonActive]}
          onPress={() => {
            setShowTemplateMenu(!showTemplateMenu);
            setShowSizeMenu(false);
            setShowColorMenu(false);
          }}
          activeOpacity={0.7}
          accessibilityLabel="Plantilla de papel"
        >
          <Text style={styles.templateIcon}>
            {PAPER_TEMPLATES.find((p) => p.id === backgroundType)?.icon || "⠇"}
          </Text>
        </TouchableOpacity>

        <View style={styles.horizontalDivider} />

        {/* Quick Color Selector Button */}
        <TouchableOpacity
          style={[styles.colorButton, showColorMenu && styles.colorButtonActive]}
          onPress={() => {
            setShowColorMenu(!showColorMenu);
            setShowSizeMenu(false);
            setShowTemplateMenu(false);
          }}
          activeOpacity={0.7}
          accessibilityLabel="Paleta de colores"
        >
          <View style={[styles.colorButtonCircle, { backgroundColor: activeColor }]} />
        </TouchableOpacity>

        {/* Quick Stroke Width Selector Button */}
        <TouchableOpacity
          style={[styles.sizeButton, showSizeMenu && styles.sizeButtonActive]}
          onPress={() => {
            setShowSizeMenu(!showSizeMenu);
            setShowColorMenu(false);
            setShowTemplateMenu(false);
          }}
          activeOpacity={0.7}
          accessibilityLabel={`Grosor de trazo actual: ${activeWidth}px`}
        >
          <View
            style={[
              styles.sizeIndicatorDot,
              {
                width: Math.min(Math.max(activeWidth / 2, 4), 16),
                height: Math.min(Math.max(activeWidth / 2, 4), 16),
                borderRadius: Math.min(Math.max(activeWidth / 2, 4), 16) / 2,
                backgroundColor: activeColor,
              },
            ]}
          />
          <Text style={styles.sizeLabel}>{activeWidth}</Text>
        </TouchableOpacity>
      </View>

      {/* 2. Contextual Popover: Color Palette */}
      {showColorMenu && (
        <View style={[styles.popoverCard, popoverPositionStyle, { top: 320 }]}>
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
                    setShowColorMenu(false);
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
                    setShowColorMenu(false);
                  }}
                  activeOpacity={0.8}
                >
                  {isSelected && <View style={styles.favColorDot} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* 3. Contextual Popover: Stroke Width Selector */}
      {showSizeMenu && (
        <View style={[styles.popoverCard, popoverPositionStyle, { top: 370, width: 200 }]}>
          <Text style={styles.popoverHeader}>GROSOR DE TRAZO</Text>
          {TIP_SIZES.map((s) => {
            const isSelected = activeWidth === s.value;
            return (
              <TouchableOpacity
                key={s.label}
                style={[styles.popoverItem, isSelected && styles.popoverItemActive]}
                onPress={() => {
                  onSelectWidth(s.value);
                  setShowSizeMenu(false);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.sizePreviewContainer}>
                  <View
                    style={[
                      styles.sizePreviewBar,
                      {
                        height: Math.min(Math.max(s.dot, 2), 16),
                        borderRadius: Math.min(Math.max(s.dot, 2), 16) / 2,
                        backgroundColor: isSelected ? "#38BDF8" : activeColor,
                      },
                    ]}
                  />
                </View>
                <View style={styles.popoverItemCol}>
                  <Text style={[styles.popoverItemLabel, isSelected && styles.popoverItemLabelActive]}>
                    {s.label}
                  </Text>
                  <Text style={styles.popoverItemDesc}>{s.desc} • {s.value}px</Text>
                </View>
                {isSelected && <Text style={styles.popoverCheck}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* 4. Contextual Popover: Paper Template */}
      {showTemplateMenu && (
        <View style={[styles.popoverCard, popoverPositionStyle, { top: 250, width: 170 }]}>
          <Text style={styles.popoverHeader}>TIPO DE PAPEL</Text>
          {PAPER_TEMPLATES.map((tmpl) => {
            const isSelected = backgroundType === tmpl.id;
            return (
              <TouchableOpacity
                key={tmpl.id}
                style={[styles.popoverItem, isSelected && styles.popoverItemActive]}
                onPress={() => {
                  onSelectBackgroundType(tmpl.id);
                  setShowTemplateMenu(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.popoverItemIcon}>{tmpl.icon}</Text>
                <Text style={[styles.popoverItemLabel, isSelected && styles.popoverItemLabelActive]}>
                  {tmpl.label}
                </Text>
                {isSelected && <Text style={styles.popoverCheck}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* 5. Sub-Dock Contextual: Borrador o Lazo */}
      {activeBrush === "eraser" && (
        <View
          style={[
            styles.contextualPill,
            dockSide === "left" ? { left: 62 } : { right: 62 },
            { top: 115 },
          ]}
        >
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
      )}

      {/* 6. Sub-Dock Contextual: Lazo Selección */}
      {activeBrush === "lasso" && hasSelection && (
        <View
          style={[
            styles.contextualPill,
            dockSide === "left" ? { left: 62 } : { right: 62 },
            { top: 195 },
          ]}
        >
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
      )}

      {/* 7. Color Customizer Modal */}
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
    </View>
  );
};

const styles = StyleSheet.create({
  dockWrapper: {
    position: "absolute",
    top: 16,
    zIndex: 90,
  },
  dockWrapperLeft: {
    left: 14,
  },
  dockWrapperRight: {
    right: 14,
  },
  dockPill: {
    width: 48,
    backgroundColor: "#0B1120",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#1E293B",
    paddingVertical: 8,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 12,
  },
  switchSideButton: {
    width: 34,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "#1E293B",
  },
  switchSideIcon: {
    color: "#94A3B8",
    fontSize: 16,
    fontWeight: "700",
  },
  horizontalDivider: {
    width: 28,
    height: 1,
    backgroundColor: "#1E293B",
    marginVertical: 6,
  },
  toolButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    marginVertical: 2,
    position: "relative",
  },
  toolButtonActive: {
    backgroundColor: "#1E293B",
  },
  toolIcon: {
    fontSize: 18,
  },
  toolActiveIndicator: {
    position: "absolute",
    width: 3,
    height: 18,
    borderRadius: 2,
    backgroundColor: "#38BDF8",
  },
  indicatorLeft: {
    left: 2,
  },
  indicatorRight: {
    right: 2,
  },
  templateIcon: {
    fontSize: 18,
    color: "#94A3B8",
    fontWeight: "800",
  },
  colorButton: {
    width: 38,
    height: 38,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 19,
    marginVertical: 3,
    borderWidth: 1,
    borderColor: "transparent",
  },
  colorButtonActive: {
    borderColor: "#38BDF8",
    backgroundColor: "#1E293B",
  },
  colorButtonCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  sizeButton: {
    width: 38,
    height: 38,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    marginVertical: 3,
    backgroundColor: "#1E293B",
  },
  sizeButtonActive: {
    borderColor: "#38BDF8",
    borderWidth: 1,
  },
  sizeIndicatorDot: {
    minWidth: 4,
    minHeight: 4,
    marginBottom: 2,
  },
  sizeLabel: {
    color: "#CBD5E1",
    fontSize: 9,
    fontWeight: "800",
  },

  // Popover Card (Spans to the inner canvas)
  popoverCard: {
    position: "absolute",
    backgroundColor: "#0F172A",
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: "#334155",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 16,
    zIndex: 100,
  },
  popoverHeader: {
    color: "#64748B",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  favoriteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  favColorChip: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },
  favColorChipSelected: {
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  favColorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
  },
  customColorTrigger: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#1E293B",
    justifyContent: "center",
    alignItems: "center",
  },
  customColorTriggerText: {
    fontSize: 13,
  },
  presetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: 170,
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
  },
  popoverItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 8,
  },
  popoverItemActive: {
    backgroundColor: "#1E293B",
  },
  popoverItemIcon: {
    fontSize: 14,
    color: "#38BDF8",
    marginRight: 4,
  },
  popoverItemCol: {
    flex: 1,
  },
  popoverItemLabel: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "600",
  },
  popoverItemLabelActive: {
    color: "#38BDF8",
    fontWeight: "700",
  },
  popoverItemDesc: {
    color: "#64748B",
    fontSize: 9,
  },
  popoverCheck: {
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: "800",
  },
  sizePreviewContainer: {
    width: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  sizePreviewBar: {
    width: "100%",
  },

  // Contextual Sub-dock (Eraser / Lasso)
  contextualPill: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0B1120",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#334155",
    padding: 4,
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 12,
    zIndex: 95,
  },
  contextualOption: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  contextualOptionActive: {
    backgroundColor: "#0284C7",
  },
  contextualOptionText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  lassoBadgeText: {
    color: "#38BDF8",
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 6,
  },
  lassoActionBtn: {
    backgroundColor: "#1E293B",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  lassoActionBtnText: {
    color: "#F1F5F9",
    fontSize: 11,
    fontWeight: "600",
  },

  // Color Customizer Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  customizerCard: {
    width: 380,
    backgroundColor: "#0F172A",
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: "#334155",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 12,
  },
  customizerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  customizerTitle: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "700",
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#1E293B",
    justifyContent: "center",
    alignItems: "center",
  },
  closeBtnText: {
    color: "#94A3B8",
    fontSize: 13,
  },
  customizerSectionTitle: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  customizerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  paletteColorTile: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  hexInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#1E293B",
    paddingTop: 14,
  },
  hexLabel: {
    color: "#94A3B8",
    fontSize: 12,
  },
  hexInput: {
    flex: 1,
    backgroundColor: "#1E293B",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: "#F8FAFC",
    fontSize: 12,
    fontWeight: "600",
    borderWidth: 1,
    borderColor: "#334155",
  },
  hexPreview: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#475569",
  },
  hexApplyBtn: {
    backgroundColor: "#0284C7",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
  },
  hexApplyBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
});
