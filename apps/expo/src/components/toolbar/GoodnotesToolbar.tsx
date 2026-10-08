import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  TouchableWithoutFeedback,
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
  { label: "Fino", value: 8, dot: 4 },
  { label: "Medio", value: 18, dot: 8 },
  { label: "Grueso", value: 32, dot: 13 },
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
  onTriggerPassiveAttribute,
  hasSelection = false,
  selectedCount = 0,
  onDeleteSelection,
  onClearSelection,
  onAddAttribute,
}) => {
  // Modal states
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
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
    <View style={styles.wrapper}>
      {/* 1. Main 56dp Goodnotes Toolbar */}
      <View style={styles.toolbarContainer}>
        <View style={styles.toolbarInner}>
          {/* Left: Tools List */}
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
                  accessibilityLabel={t.label}
                >
                  <Text style={styles.toolIcon}>{t.icon}</Text>
                  {isActive && <View style={styles.toolActiveIndicator} />}
                </TouchableOpacity>
              );
            })}

            {/* Selector de Plantilla de Papel */}
            <TouchableOpacity
              style={[styles.toolButton, showTemplateMenu && styles.toolButtonActive]}
              onPress={() => setShowTemplateMenu(!showTemplateMenu)}
              activeOpacity={0.7}
              accessibilityLabel="Plantilla de papel"
            >
              <Text style={styles.templateIcon}>
                {PAPER_TEMPLATES.find((p) => p.id === backgroundType)?.icon || "⠇"}
              </Text>
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.verticalDivider} />

          {/* Right: Quick Controls (3 Favorite Colors + 3 Tip Sizes) */}
          <View style={styles.quickControls}>
            {/* 3 Customizable Color Slots */}
            <View style={styles.colorRow}>
              {favoriteColors.map((c, index) => {
                const isSelected = activeColor.toUpperCase() === c.toUpperCase();
                return (
                  <TouchableOpacity
                    key={`slot-${index}`}
                    style={[
                      styles.colorChip,
                      { backgroundColor: c },
                      isSelected && styles.colorChipSelected,
                    ]}
                    onPress={() => onSelectColor(c)}
                    onLongPress={() => handleOpenColorSlotCustomizer(index)}
                    activeOpacity={0.8}
                  >
                    {isSelected && <View style={styles.colorChipInnerDot} />}
                  </TouchableOpacity>
                );
              })}

              {/* Color Customizer Button */}
              <TouchableOpacity
                style={styles.paletteTriggerButton}
                onPress={() => handleOpenColorSlotCustomizer(0)}
                activeOpacity={0.7}
              >
                <Text style={styles.paletteTriggerText}>🎨</Text>
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
      </View>

      {/* 2. Contextual Sub-bar for Specific Tools */}
      {activeBrush === "eraser" && (
        <View style={styles.subBar}>
          <Text style={styles.subBarTitle}>MODO DE BORRADOR:</Text>
          <View style={styles.eraserToggleGroup}>
            <TouchableOpacity
              style={[
                styles.eraserOption,
                eraserMode === "stroke" && styles.eraserOptionActive,
              ]}
              onPress={() => onSelectEraserMode("stroke")}
              activeOpacity={0.8}
            >
              <Text style={styles.eraserOptionIcon}>🧹</Text>
              <Text
                style={[
                  styles.eraserOptionText,
                  eraserMode === "stroke" && styles.eraserOptionTextActive,
                ]}
              >
                Trazo Completo
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.eraserOption,
                eraserMode === "precision" && styles.eraserOptionActive,
              ]}
              onPress={() => onSelectEraserMode("precision")}
              activeOpacity={0.8}
            >
              <Text style={styles.eraserOptionIcon}>✂️</Text>
              <Text
                style={[
                  styles.eraserOptionText,
                  eraserMode === "precision" && styles.eraserOptionTextActive,
                ]}
              >
                Precisión / Píxel
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.subBarHint}>
            {eraserMode === "stroke"
              ? "Toca cualquier trazo para eliminarlo por completo."
              : "Borra únicamente el fragmento donde pasa la punta del S-Pen."}
          </Text>
        </View>
      )}

      {/* Shapes Mode Sub-bar */}
      {activeBrush === "shapes" && (
        <View style={styles.subBarInfo}>
          <Text style={styles.subBarInfoIcon}>📐</Text>
          <View style={styles.subBarPillActive}>
            <Text style={styles.subBarPillActiveText}>Corrección Automática Activa</Text>
          </View>
          <Text style={styles.subBarInfoText}>
            Dibuja rectas, círculos, elipses o rectángulos y se convertirán en vectores perfectos.
          </Text>
        </View>
      )}

      {/* Lasso Mode Sub-bar */}
      {activeBrush === "lasso" && (
        <View style={styles.subBarLasso}>
          {hasSelection ? (
            <View style={styles.lassoSelectedRow}>
              <View style={styles.lassoCountBadge}>
                <Text style={styles.lassoCountText}>🪢 {selectedCount} trazos seleccionados</Text>
              </View>
              <Text style={styles.lassoMoveHint}>Arrastra el recuadro para mover</Text>
              <TouchableOpacity
                style={styles.lassoColorBtn}
                onPress={() => onSelectColor(activeColor)}
                activeOpacity={0.8}
              >
                <View style={[styles.lassoColorDot, { backgroundColor: activeColor }]} />
                <Text style={styles.lassoColorBtnText}>Colorear</Text>
              </TouchableOpacity>
              {onDeleteSelection && (
                <TouchableOpacity
                  style={styles.lassoDeleteBtn}
                  onPress={onDeleteSelection}
                  activeOpacity={0.8}
                >
                  <Text style={styles.lassoDeleteBtnText}>🗑️ Borrar</Text>
                </TouchableOpacity>
              )}
              {onClearSelection && (
                <TouchableOpacity
                  style={styles.lassoClearBtn}
                  onPress={onClearSelection}
                  activeOpacity={0.8}
                >
                  <Text style={styles.lassoClearBtnText}>✕ Deseleccionar</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.lassoDefaultRow}>
              <Text style={styles.subBarInfoIcon}>🪢</Text>
              <Text style={styles.subBarInfoText}>
                <Text style={{ fontWeight: "700", color: "#38BDF8" }}>Herramienta Lazo: </Text>
                Rodea trazos para seleccionarlos. Luego arrástralos para moverlos por el lienzo.
              </Text>
            </View>
          )}
        </View>
      )}

      {/* 3. Paper Template Menu Popover */}
      {showTemplateMenu && (
        <View style={styles.templateDropdown}>
          <Text style={styles.dropdownHeader}>TIPO DE PAPEL</Text>
          {PAPER_TEMPLATES.map((tmpl) => {
            const isSelected = backgroundType === tmpl.id;
            return (
              <TouchableOpacity
                key={tmpl.id}
                style={[styles.dropdownItem, isSelected && styles.dropdownItemActive]}
                onPress={() => {
                  onSelectBackgroundType(tmpl.id);
                  setShowTemplateMenu(false);
                }}
              >
                <Text style={styles.dropdownItemIcon}>{tmpl.icon}</Text>
                <Text
                  style={[
                    styles.dropdownItemText,
                    isSelected && styles.dropdownItemTextActive,
                  ]}
                >
                  {tmpl.label}
                </Text>
                {isSelected && <Text style={styles.dropdownCheck}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* 4. Color Customizer Modal */}
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
                    Personalizar Espacio de Color {editingSlot + 1}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowColorCustomizer(false)}
                    style={styles.closeBtn}
                  >
                    <Text style={styles.closeBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Slot Selector */}
                <View style={styles.slotPickerRow}>
                  <Text style={styles.slotPickerLabel}>Asignar a:</Text>
                  {favoriteColors.map((c, i) => (
                    <TouchableOpacity
                      key={`slot-btn-${i}`}
                      style={[
                        styles.slotBadge,
                        editingSlot === i && styles.slotBadgeActive,
                      ]}
                      onPress={() => setEditingSlot(i)}
                    >
                      <View style={[styles.slotBadgeDot, { backgroundColor: c }]} />
                      <Text
                        style={[
                          styles.slotBadgeText,
                          editingSlot === i && styles.slotBadgeTextActive,
                        ]}
                      >
                        Slot {i + 1}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Preset Palette */}
                <Text style={styles.paletteSectionTitle}>Paleta Goodnotes</Text>
                <View style={styles.presetPaletteGrid}>
                  {GOODNOTES_PRESETS.map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.presetChip,
                        { backgroundColor: color },
                        customHexInput.toUpperCase() === color.toUpperCase() &&
                          styles.presetChipSelected,
                      ]}
                      onPress={() => {
                        setCustomHexInput(color);
                        handleApplyColor(color);
                      }}
                      activeOpacity={0.8}
                    />
                  ))}
                </View>

                {/* Hex input */}
                <View style={styles.hexInputRow}>
                  <Text style={styles.hexLabel}>Código HEX:</Text>
                  <TextInput
                    style={styles.hexInput}
                    value={customHexInput}
                    onChangeText={setCustomHexInput}
                    placeholder="#38BDF8"
                    placeholderTextColor="#64748B"
                    autoCapitalize="characters"
                  />
                  <View style={[styles.hexPreview, { backgroundColor: customHexInput }]} />
                  <TouchableOpacity
                    style={styles.hexApplyBtn}
                    onPress={() => handleApplyColor(customHexInput)}
                  >
                    <Text style={styles.hexApplyBtnText}>Guardar</Text>
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
  wrapper: {
    position: "relative",
    zIndex: 20,
  },
  toolbarContainer: {
    height: 56,
    backgroundColor: "#0F172A",
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
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
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#1E293B",
    borderWidth: 1,
    borderColor: "transparent",
    position: "relative",
  },
  toolButtonActive: {
    backgroundColor: "#1E3A8A",
    borderColor: "#38BDF8",
    shadowColor: "#38BDF8",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
  },
  toolActiveIndicator: {
    position: "absolute",
    bottom: 3,
    width: 14,
    height: 2.5,
    borderRadius: 1.5,
    backgroundColor: "#38BDF8",
  },
  toolIcon: {
    fontSize: 18,
  },
  toolLabel: {
    display: "none",
  },
  toolLabelActive: {
    display: "none",
  },
  passiveAttrButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
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
  templateButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#1E293B",
    borderWidth: 1,
    borderColor: "#334155",
  },
  templateButtonActive: {
    backgroundColor: "#0284C7",
    borderColor: "#38BDF8",
  },
  templateIcon: {
    fontSize: 15,
    marginRight: 5,
    color: "#38BDF8",
  },
  templateLabel: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "600",
  },
  verticalDivider: {
    width: 1,
    height: 28,
    backgroundColor: "#334155",
    marginHorizontal: 12,
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
    alignItems: "center",
    justifyContent: "center",
  },
  colorChipInnerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
  },
  colorChipSelected: {
    borderColor: "#FFFFFF",
    transform: [{ scale: 1.15 }],
  },
  paletteTriggerButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#1E293B",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  paletteTriggerText: {
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

  // Sub-bars
  subBar: {
    backgroundColor: "#111C30",
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
    paddingHorizontal: 16,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  subBarTitle: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  eraserToggleGroup: {
    flexDirection: "row",
    backgroundColor: "#0B1120",
    borderRadius: 6,
    padding: 2,
  },
  eraserOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  eraserOptionActive: {
    backgroundColor: "#1E3A8A",
  },
  eraserOptionIcon: {
    fontSize: 13,
  },
  eraserOptionText: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "600",
  },
  eraserOptionTextActive: {
    color: "#38BDF8",
    fontWeight: "700",
  },
  subBarHint: {
    color: "#64748B",
    fontSize: 11,
    fontStyle: "italic",
    flex: 1,
  },
  subBarInfo: {
    backgroundColor: "#0F2038",
    borderBottomWidth: 1,
    borderBottomColor: "#1E3A8A",
    paddingHorizontal: 16,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  subBarPillActive: {
    backgroundColor: "#0369A1",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  subBarPillActiveText: {
    color: "#E0F2FE",
    fontSize: 11,
    fontWeight: "700",
  },
  subBarInfoIcon: {
    fontSize: 14,
  },
  subBarInfoText: {
    color: "#94A3B8",
    fontSize: 12,
  },

  // Lasso Sub-bar
  subBarLasso: {
    backgroundColor: "#0C1F38",
    borderBottomWidth: 1,
    borderBottomColor: "#0284C7",
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  lassoDefaultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  lassoSelectedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  lassoCountBadge: {
    backgroundColor: "#0369A1",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  lassoCountText: {
    color: "#F0F9FF",
    fontSize: 11,
    fontWeight: "700",
  },
  lassoMoveHint: {
    color: "#94A3B8",
    fontSize: 11,
    fontStyle: "italic",
    flex: 1,
  },
  lassoColorBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#1E293B",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  lassoColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  lassoColorBtnText: {
    color: "#E2E8F0",
    fontSize: 11,
    fontWeight: "600",
  },
  lassoDeleteBtn: {
    backgroundColor: "#7F1D1D",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  lassoDeleteBtnText: {
    color: "#FECACA",
    fontSize: 11,
    fontWeight: "700",
  },
  lassoClearBtn: {
    backgroundColor: "#1E293B",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  lassoClearBtnText: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "600",
  },

  // Template dropdown
  templateDropdown: {
    position: "absolute",
    top: 58,
    left: 280,
    backgroundColor: "#1E293B",
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: "#334155",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 10,
    width: 170,
    zIndex: 100,
  },
  dropdownHeader: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
  },
  dropdownItemActive: {
    backgroundColor: "#0F172A",
  },
  dropdownItemIcon: {
    fontSize: 15,
    marginRight: 8,
    color: "#38BDF8",
  },
  dropdownItemText: {
    color: "#CBD5E1",
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  dropdownItemTextActive: {
    color: "#38BDF8",
    fontWeight: "700",
  },
  dropdownCheck: {
    color: "#38BDF8",
    fontWeight: "800",
  },

  // Modal Overlay
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
    marginBottom: 14,
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
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "700",
  },
  slotPickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  slotPickerLabel: {
    color: "#94A3B8",
    fontSize: 12,
  },
  slotBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: "#1E293B",
    borderWidth: 1,
    borderColor: "transparent",
  },
  slotBadgeActive: {
    borderColor: "#38BDF8",
    backgroundColor: "#0C4A6E",
  },
  slotBadgeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  slotBadgeText: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "600",
  },
  slotBadgeTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  paletteSectionTitle: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  presetPaletteGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 18,
  },
  presetChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "transparent",
  },
  presetChipSelected: {
    borderColor: "#FFFFFF",
    transform: [{ scale: 1.15 }],
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

  // Attribute Modal
  attrCard: {
    width: 440,
    backgroundColor: "#0F172A",
    borderRadius: 14,
    padding: 22,
    borderWidth: 1,
    borderColor: "#334155",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 12,
  },
  attrModalTitle: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "700",
  },
  attrIntro: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  attrTypeSelector: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  attrTypeChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#1E293B",
    borderWidth: 1,
    borderColor: "#334155",
    gap: 6,
  },
  attrTypeChipActive: {
    backgroundColor: "#1E3A8A",
    borderColor: "#38BDF8",
  },
  attrTypeChipIcon: {
    fontSize: 14,
  },
  attrTypeChipText: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "600",
  },
  attrForm: {
    gap: 8,
    marginBottom: 14,
  },
  attrInput: {
    backgroundColor: "#1E293B",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: "#F8FAFC",
    fontSize: 13,
    borderWidth: 1,
    borderColor: "#334155",
  },
  attrInputMulti: {
    height: 60,
    textAlignVertical: "top",
  },
  attrActionButtons: {
    flexDirection: "row",
    gap: 10,
  },
  pinBtn: {
    flex: 1,
    backgroundColor: "#0284C7",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  pinBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  attrCompileAction: {
    backgroundColor: "#312E81",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  attrCompileActionText: {
    color: "#C7D2FE",
    fontSize: 12,
    fontWeight: "700",
  },
});
