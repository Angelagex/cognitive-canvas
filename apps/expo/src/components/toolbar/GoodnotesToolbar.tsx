import React, { useState } from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { BrushType, CanvasBackgroundType, EraserMode, PassiveAttributeType } from "../../types/canvas";
import { StrokeWidthPopover } from "./popovers/StrokeWidthPopover";
import { PaperTemplatePopover } from "./popovers/PaperTemplatePopover";
import { ColorPickerPopover } from "./popovers/ColorPickerPopover";
import { ContextualToolPill } from "./popovers/ContextualToolPill";

export interface GoodnotesToolbarProps {
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

  const tools: { id: BrushType; label: string; icon: string }[] = [
    { id: "pen", label: "Pluma", icon: "🖊️" },
    { id: "highlighter", label: "Resaltador", icon: "✨" },
    { id: "eraser", label: "Borrador", icon: "🧹" },
    { id: "shapes", label: "Formas", icon: "📐" },
    { id: "lasso", label: "Lazo", icon: "🪢" },
    { id: "laser", label: "Láser", icon: "🔴" },
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

        <View style={styles.horizontalDivider} />

        {/* Paper Template Selector */}
        <TouchableOpacity
          style={[styles.templateButton, showTemplateMenu && styles.templateButtonActive]}
          onPress={() => {
            setShowTemplateMenu(!showTemplateMenu);
            setShowSizeMenu(false);
            setShowColorMenu(false);
          }}
          activeOpacity={0.7}
          accessibilityLabel="Plantilla de papel"
        >
          <Text style={styles.templateIcon}>
            {backgroundType === "dot_grid"
              ? "⠇"
              : backgroundType === "graph_grid"
              ? "▦"
              : backgroundType === "ruled"
              ? "≡"
              : "📄"}
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
        <ColorPickerPopover
          activeColor={activeColor}
          onSelectColor={onSelectColor}
          favoriteColors={favoriteColors}
          onUpdateFavoriteColor={onUpdateFavoriteColor}
          onClose={() => setShowColorMenu(false)}
          positionStyle={popoverPositionStyle}
        />
      )}

      {/* 3. Contextual Popover: Stroke Width Selector */}
      {showSizeMenu && (
        <StrokeWidthPopover
          activeWidth={activeWidth}
          activeColor={activeColor}
          onSelectWidth={onSelectWidth}
          onClose={() => setShowSizeMenu(false)}
          positionStyle={popoverPositionStyle}
        />
      )}

      {/* 4. Contextual Popover: Paper Template */}
      {showTemplateMenu && (
        <PaperTemplatePopover
          backgroundType={backgroundType}
          onSelectBackgroundType={onSelectBackgroundType}
          onClose={() => setShowTemplateMenu(false)}
          positionStyle={popoverPositionStyle}
        />
      )}

      {/* 5. Sub-Dock Contextual: Borrador o Lazo */}
      <ContextualToolPill
        activeBrush={activeBrush}
        eraserMode={eraserMode}
        onSelectEraserMode={onSelectEraserMode}
        hasSelection={hasSelection}
        selectedCount={selectedCount}
        onDeleteSelection={onDeleteSelection}
        onClearSelection={onClearSelection}
        positionStyle={popoverPositionStyle}
      />
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
    borderRadius: 12,
    marginVertical: 2,
    position: "relative",
  },
  toolButtonActive: {
    backgroundColor: "rgba(56, 189, 248, 0.16)",
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
    left: 0,
  },
  indicatorRight: {
    right: 0,
  },
  templateButton: {
    width: 38,
    height: 38,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#1E293B",
  },
  templateButtonActive: {
    backgroundColor: "rgba(56, 189, 248, 0.2)",
    borderWidth: 1,
    borderColor: "#38BDF8",
  },
  templateIcon: {
    color: "#94A3B8",
    fontSize: 16,
    fontWeight: "700",
  },
  colorButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorButtonActive: {
    borderColor: "#FFFFFF",
  },
  colorButtonCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  sizeButton: {
    width: 38,
    height: 38,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    marginVertical: 4,
    backgroundColor: "#1E293B",
  },
  sizeButtonActive: {
    backgroundColor: "rgba(56, 189, 248, 0.2)",
    borderWidth: 1,
    borderColor: "#38BDF8",
  },
  sizeIndicatorDot: {
    marginBottom: 2,
  },
  sizeLabel: {
    color: "#94A3B8",
    fontSize: 9,
    fontWeight: "700",
  },
});
