import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { FileText, ArrowLeftRight } from "@sketchyicons/react-native";
import {
  BrushType,
  CanvasBackgroundType,
  CanvasThemePreset,
  EraserMode,
  PassiveAttributeType,
} from "../../types/canvas";
import { StrokeWidthPopover } from "./popovers/StrokeWidthPopover";
import { PaperTemplatePopover } from "./popovers/PaperTemplatePopover";
import { ColorPickerPopover } from "./popovers/ColorPickerPopover";
import { EraserModePill } from "./popovers/EraserModePill";
import { ToolbarToolIcon } from "./ToolbarToolIcon";
import { StickerToolbarButton } from "../../features/stickers/StickerToolbarButton";
import { styles } from "./GoodnotesToolbar.styles";

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
  canvasTheme?: CanvasThemePreset;
  onSelectCanvasTheme?: (theme: CanvasThemePreset) => void;
  favoriteColors: string[];
  onUpdateFavoriteColor: (slotIndex: number, newColor: string) => void;
  onTriggerPassiveAttribute?: () => void;
  hasSelection?: boolean;
  selectedCount?: number;
  onDeleteSelection?: () => void;
  onClearSelection?: () => void;
  onAssignAttribute?: (type: PassiveAttributeType) => void;
  onAddAttribute?: (type: PassiveAttributeType, title: string, note: string) => void;
  dockSide?: "left" | "right";
  initialDockSide?: "left" | "right";
  onToggleDockSide?: () => void;
  onDockSideChange?: (side: "left" | "right") => void;
  canvasScale?: number;
  canvasTranslateX?: number;
  canvasTranslateY?: number;
  onOpenStickerPicker?: (
    targetWorld: { x: number; y: number },
    anchorScreen?: { x: number; y: number }
  ) => void;
  onStickerDragChange?: (
    dragState: { isDragging: boolean; screenX: number; screenY: number } | null
  ) => void;
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
  canvasTheme,
  onSelectCanvasTheme,
  favoriteColors,
  onUpdateFavoriteColor,
  dockSide: dockSideProp,
  initialDockSide = "left",
  onToggleDockSide,
  onDockSideChange,
  canvasScale = 1,
  canvasTranslateX = 0,
  canvasTranslateY = 0,
  onOpenStickerPicker,
  onStickerDragChange,
}) => {
  const [internalDockSide, setInternalDockSide] = useState<"left" | "right">(initialDockSide);
  const dockSide = dockSideProp !== undefined ? dockSideProp : internalDockSide;

  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [showSizeMenu, setShowSizeMenu] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);

  const tools: { id: BrushType; label: string }[] = [
    { id: "pen", label: "Bolígrafo" },
    { id: "highlighter", label: "Resaltador" },
    { id: "eraser", label: "Borrador" },
    { id: "lasso", label: "Lazo" },
    { id: "laser", label: "Láser" },
    { id: "pan", label: "Mover" },
  ];

  const handleToggleSide = () => {
    const nextSide = dockSide === "left" ? "right" : "left";
    if (onToggleDockSide) {
      onToggleDockSide();
    } else {
      setInternalDockSide(nextSide);
      onDockSideChange?.(nextSide);
    }
  };

  const popoverPositionStyle = dockSide === "left" ? { left: 70 } : { right: 70 };

  return (
    <View
      style={[
        styles.dockWrapper,
        dockSide === "left" ? styles.dockWrapperLeft : styles.dockWrapperRight,
      ]}
    >
      <View style={styles.dockPill}>
        <TouchableOpacity
          style={styles.switchSideButton}
          onPress={handleToggleSide}
          activeOpacity={0.7}
          accessibilityLabel={`Mover barra al lateral ${dockSide === "left" ? "derecho" : "izquierdo"}`}
        >
          <ArrowLeftRight size={18} color="#94A3B8" strokeWidth={2.0} />
        </TouchableOpacity>

        <View style={styles.horizontalDivider} />

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
              <ToolbarToolIcon id={t.id} isActive={isActive} />
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

        {/* Sticker Feature: Botón Híbrido (Tap / Drag-to-Drop) */}
        {onOpenStickerPicker && (
          <StickerToolbarButton
            canvasScale={canvasScale}
            canvasTranslateX={canvasTranslateX}
            canvasTranslateY={canvasTranslateY}
            dockSide={dockSide}
            onOpenPicker={onOpenStickerPicker}
            onDragChange={onStickerDragChange}
          />
        )}

        <View style={styles.horizontalDivider} />

        {/* Plantilla de papel */}
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
          <FileText size={20} color={showTemplateMenu ? "#38BDF8" : "#94A3B8"} strokeWidth={2.0} />
        </TouchableOpacity>

        <View style={styles.horizontalDivider} />

        {/* Selector de color */}
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

        {/* Selector de grosor */}
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

      {showSizeMenu && (
        <StrokeWidthPopover
          activeWidth={activeWidth}
          activeColor={activeColor}
          onSelectWidth={onSelectWidth}
          onClose={() => setShowSizeMenu(false)}
          positionStyle={popoverPositionStyle}
        />
      )}

      {showTemplateMenu && (
        <PaperTemplatePopover
          backgroundType={backgroundType}
          onSelectBackgroundType={onSelectBackgroundType}
          canvasTheme={canvasTheme}
          onSelectCanvasTheme={onSelectCanvasTheme}
          onClose={() => setShowTemplateMenu(false)}
          positionStyle={popoverPositionStyle}
        />
      )}

      {activeBrush === "eraser" && (
        <EraserModePill
          eraserMode={eraserMode}
          onSelectEraserMode={onSelectEraserMode}
          positionStyle={popoverPositionStyle}
        />
      )}
    </View>
  );
};
