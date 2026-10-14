import React, { useState, useRef } from "react";
import { View, Text, TouchableOpacity, Animated, Dimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { FileText, GripVertical, GripHorizontal } from "@sketchyicons/react-native";
import { BrushType, ToolbarDockEdge } from "../../types/canvas";
import { StrokeWidthPopover } from "./popovers/StrokeWidthPopover";
import { PaperTemplatePopover } from "./popovers/PaperTemplatePopover";
import { ColorPickerPopover } from "./popovers/ColorPickerPopover";
import { EraserModePill } from "./popovers/EraserModePill";
import { ToolbarToolIcon } from "./ToolbarToolIcon";
import { StickerToolbarButton } from "../../features/stickers/StickerToolbarButton";
import { computePopoverPosition, POPOVER_SIZES, PopoverSize, STANDARD_GAP } from "./popovers/popoverPlacement";
import { saveUserPreferences } from "../../services/StorageService";
import { GoodnotesToolbarProps, TOOLBAR_TOOLS } from "./GoodnotesToolbar.types";
import { styles } from "./GoodnotesToolbar.styles";

export { GoodnotesToolbarProps };

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
  dockSide,
  dockEdge: dockEdgeProp,
  initialDockEdge = "left",
  onDockEdgeChange,
  canvasScale = 1,
  canvasTranslateX = 0,
  canvasTranslateY = 0,
  onOpenStickerPicker,
  onStickerDragChange,
  isZenMode = false,
}) => {
  const [internalDockEdge, setInternalDockEdge] = useState<ToolbarDockEdge>(
    dockEdgeProp || (dockSide as ToolbarDockEdge) || initialDockEdge
  );
  const dockEdge = dockEdgeProp || internalDockEdge;
  const isVertical = dockEdge === "left" || dockEdge === "right";

  const [toolbarHeight, setToolbarHeight] = useState(440);
  const { height: screenHeight } = Dimensions.get("window");

  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [showSizeMenu, setShowSizeMenu] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showEraserMenu, setShowEraserMenu] = useState(false);
  const [popoverPos, setPopoverPos] = useState({ left: 70, top: 120 });

  const eraserButtonRef = useRef<View>(null);
  const templateRef = useRef<View>(null);
  const colorRef = useRef<View>(null);
  const sizeRef = useRef<View>(null);
  const panAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const closeAllMenus = () => {
    setShowTemplateMenu(false);
    setShowSizeMenu(false);
    setShowColorMenu(false);
    setShowEraserMenu(false);
  };

  const openPopover = (
    ref: React.RefObject<View>,
    size: PopoverSize,
    setter: (v: boolean) => void,
    isEraser = false
  ) => {
    ref.current?.measureInWindow((x, y, width, height) => {
      const { width: sw, height: sh } = Dimensions.get("window");
      const pos = computePopoverPosition({ x, y, width, height }, size, dockEdge, sw, sh, STANDARD_GAP);
      if (isEraser && isVertical) {
        pos.top += 4;
      }
      setPopoverPos(pos);
      closeAllMenus();
      setter(true);
    });
  };

  const panGesture = Gesture.Pan()
    .runOnJS(true)
    .onUpdate((e) => panAnim.setValue({ x: e.translationX, y: e.translationY }))
    .onEnd((e) => {
      const { width: sw, height: sh } = Dimensions.get("window");
      const dL = e.absoluteX;
      const dR = sw - e.absoluteX;
      const dT = e.absoluteY;
      const dB = sh - e.absoluteY;
      const min = Math.min(dL, dR, dT, dB);
      const next: ToolbarDockEdge = min === dL ? "left" : min === dR ? "right" : min === dT ? "top" : "bottom";

      Animated.spring(panAnim, { toValue: { x: 0, y: 0 }, useNativeDriver: true, bounciness: 4 }).start();
      closeAllMenus();
      if (onDockEdgeChange) onDockEdgeChange(next);
      else setInternalDockEdge(next);
      saveUserPreferences({ toolbar_dock_edge: next, toolbar_dock_side: next === "right" ? "right" : "left" });
    });

  const verticalCenterTop = Math.max(isZenMode ? 16 : 60, (screenHeight - toolbarHeight) / 2);
  const topEdgeTop = isZenMode ? 14 : 56;

  const edgeKey = (dockEdge.charAt(0).toUpperCase() + dockEdge.slice(1)) as "Left" | "Right" | "Top" | "Bottom";
  const indicatorPosStyle = styles[`indicator${edgeKey}`];

  const dockEdgeStyle =
    dockEdge === "left" ? [styles.dockPillLeft, { top: verticalCenterTop }] :
    dockEdge === "right" ? [styles.dockPillRight, { top: verticalCenterTop }] :
    dockEdge === "top" ? [styles.dockPillTop, { top: topEdgeTop }] :
    [styles.dockPillBottom, { bottom: 18 }];

  return (
    <View pointerEvents="box-none" style={styles.dockWrapper}>
      <Animated.View
        pointerEvents="auto"
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          if (h > 0) setToolbarHeight(h);
        }}
        style={[
          styles.dockPill,
          isVertical ? styles.dockPillVertical : styles.dockPillHorizontal,
          dockEdgeStyle,
          { transform: panAnim.getTranslateTransform() },
        ]}
      >
        <GestureDetector gesture={panGesture}>
          <View style={[styles.dragHandle, !isVertical && styles.dragHandleHorizontal]}>
            {isVertical ? (
              <GripVertical size={16} color="#64748B" strokeWidth={2.0} />
            ) : (
              <GripHorizontal size={16} color="#64748B" strokeWidth={2.0} />
            )}
          </View>
        </GestureDetector>

        <View style={isVertical ? styles.dividerVertical : styles.dividerHorizontal} />

        {TOOLBAR_TOOLS.map((t) => {
          const isActive = activeBrush === t.id;
          const isEraser = t.id === "eraser";
          return (
            <View key={t.id} ref={isEraser ? eraserButtonRef : undefined} collapsable={false}>
              <TouchableOpacity
                style={[styles.toolButton, isActive && styles.toolButtonActive]}
                onPress={() => {
                  if (isEraser) {
                    onSelectBrush("eraser");
                    if (showEraserMenu) closeAllMenus();
                    else openPopover(eraserButtonRef, POPOVER_SIZES.eraser, setShowEraserMenu, true);
                  } else {
                    onSelectBrush(t.id);
                    closeAllMenus();
                  }
                }}
                activeOpacity={0.7}
                accessibilityLabel={t.label}
              >
                <ToolbarToolIcon id={t.id} isActive={isActive} />
                {isActive && <View style={[styles.toolActiveIndicator, indicatorPosStyle]} />}
              </TouchableOpacity>
            </View>
          );
        })}

        {onOpenStickerPicker && (
          <StickerToolbarButton
            canvasScale={canvasScale}
            canvasTranslateX={canvasTranslateX}
            canvasTranslateY={canvasTranslateY}
            dockSide={dockEdge === "right" ? "right" : "left"}
            onOpenPicker={(centerWorld, anchorScreen) => {
              closeAllMenus();
              onOpenStickerPicker(centerWorld, anchorScreen);
            }}
            onDragChange={onStickerDragChange}
          />
        )}

        <View style={isVertical ? styles.dividerVertical : styles.dividerHorizontal} />

        {/* Plantilla de papel */}
        <View ref={templateRef} collapsable={false}>
          <TouchableOpacity
            style={[styles.templateButton, showTemplateMenu && styles.templateButtonActive]}
            onPress={() => {
              if (showTemplateMenu) closeAllMenus();
              else openPopover(templateRef, POPOVER_SIZES.template, setShowTemplateMenu);
            }}
            activeOpacity={0.7}
            accessibilityLabel="Plantilla de papel"
          >
            <FileText size={18} color={showTemplateMenu ? "#38BDF8" : "#94A3B8"} strokeWidth={2.0} />
          </TouchableOpacity>
        </View>

        <View style={isVertical ? styles.dividerVertical : styles.dividerHorizontal} />

        {/* Selector de color */}
        <View ref={colorRef} collapsable={false}>
          <TouchableOpacity
            style={[styles.colorButton, showColorMenu && styles.colorButtonActive]}
            onPress={() => {
              if (showColorMenu) closeAllMenus();
              else openPopover(colorRef, POPOVER_SIZES.color, setShowColorMenu);
            }}
            activeOpacity={0.7}
            accessibilityLabel="Paleta de colores"
          >
            <View style={[styles.colorButtonCircle, { backgroundColor: activeColor }]} />
          </TouchableOpacity>
        </View>

        {/* Selector de grosor */}
        <View ref={sizeRef} collapsable={false}>
          <TouchableOpacity
            style={[styles.sizeButton, showSizeMenu && styles.sizeButtonActive]}
            onPress={() => {
              if (showSizeMenu) closeAllMenus();
              else openPopover(sizeRef, POPOVER_SIZES.stroke, setShowSizeMenu);
            }}
            activeOpacity={0.7}
            accessibilityLabel={`Grosor de trazo: ${activeWidth}px`}
          >
            <View
              style={[
                styles.sizeIndicatorDot,
                { width: Math.min(Math.max(activeWidth / 2, 4), 14), height: Math.min(Math.max(activeWidth / 2, 4), 14), borderRadius: 7, backgroundColor: activeColor },
              ]}
            />
            <Text style={styles.sizeLabel}>{activeWidth}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {showColorMenu && (
        <ColorPickerPopover
          visible={showColorMenu} activeColor={activeColor} onSelectColor={onSelectColor}
          favoriteColors={favoriteColors} onUpdateFavoriteColor={onUpdateFavoriteColor}
          onClose={() => setShowColorMenu(false)} positionStyle={popoverPos}
        />
      )}

      {showSizeMenu && (
        <StrokeWidthPopover
          visible={showSizeMenu} activeWidth={activeWidth} activeColor={activeColor}
          onSelectWidth={onSelectWidth} onClose={() => setShowSizeMenu(false)} positionStyle={popoverPos}
        />
      )}

      {showTemplateMenu && (
        <PaperTemplatePopover
          visible={showTemplateMenu} backgroundType={backgroundType} onSelectBackgroundType={onSelectBackgroundType}
          canvasTheme={canvasTheme} onSelectCanvasTheme={onSelectCanvasTheme}
          onClose={() => setShowTemplateMenu(false)} positionStyle={popoverPos}
        />
      )}

      {showEraserMenu && (
        <EraserModePill
          visible={showEraserMenu} eraserMode={eraserMode}
          onSelectEraserMode={(m) => { onSelectEraserMode(m); setShowEraserMenu(false); }}
          onClose={() => setShowEraserMenu(false)} positionStyle={popoverPos}
        />
      )}
    </View>
  );
};
