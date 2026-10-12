import React, { useState } from "react";
import { StyleSheet, View, SafeAreaView, StatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useCanvasState } from "./src/hooks/useCanvasState";
import { TopHeader } from "./src/components/header/TopHeader";
import { GoodnotesToolbar } from "./src/components/toolbar/GoodnotesToolbar";
import { JetpackInkCanvas } from "./src/components/JetpackInkCanvas";
import { FloatingFooter } from "./src/components/footer/FloatingFooter";
import { CompilerDrawer } from "./src/components/drawer/CompilerDrawer";
import { PlacedAttributeBadges } from "./src/components/canvas/PlacedAttributeBadges";
import { SemanticAnchorTooltip } from "./src/components/canvas/SemanticAnchorTooltip";
import { PacerOverlayLayer } from "./src/components/canvas/PacerOverlayLayer";
import { ClearCanvasConfirmModal } from "./src/components/modals/ClearCanvasConfirmModal";
import { DocumentActionsModal } from "./src/components/modals/DocumentActionsModal";
import { GhostOverlay } from "./src/components/canvas/GhostOverlay";
import { ContextualSelectionPill } from "./src/components/toolbar/popovers/ContextualToolPill";
import { cognitiveLayerStore } from "./src/stores/useCognitiveLayerStore";
import { StickerPickerModal } from "./src/features/stickers/StickerPickerModal";
import { Sparkles } from "@sketchyicons/react-native";

export default function App() {
  const [showDocumentMenu, setShowDocumentMenu] = useState(false);
  const [stickerPickerVisible, setStickerPickerVisible] = useState(false);
  const [stickerTargetWorld, setStickerTargetWorld] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragGhost, setDragGhost] = useState<{ screenX: number; screenY: number } | null>(null);
  const {
    mapTitle,
    setMapTitle,
    activeBrush,
    setActiveBrush,
    activeColor,
    setActiveColor,
    activeWidth,
    setActiveWidth,
    eraserMode,
    setEraserMode,
    backgroundType,
    setBackgroundType,
    canvasTheme,
    setCanvasTheme,
    canvasBackgroundColor,
    canvasGridColor,
    favoriteColors,
    updateFavoriteColor,
    stylusOnly,
    canUndo,
    canRedo,
    strokeCount,
    displayZoom,
    zoomInTrigger,
    zoomOutTrigger,
    resetZoomTrigger,
    undoTrigger,
    redoTrigger,
    clearTrigger,
    loadedStrokesJson,
    loadStrokesTrigger,
    isDrawerOpen,
    setIsDrawerOpen,
    isCompiling,
    compilation,
    hasSelection,
    selectedCount,
    selectionBounds,
    deleteSelectionTrigger,
    duplicateSelectionTrigger,
    clearSelectionTrigger,
    handleSelectionChanged,
    handleDeleteSelection,
    handleDuplicateSelection,
    handleClearSelection,
    handleAssignAttributeToLasso,
    handleOpenAttributeModalFromLasso,
    handleStrokesTransformed,
    placedAttributes,
    handleAddAttribute,
    handleDeleteAttribute,
    hoveredAttribute,
    activeAnchorEntity,
    hoveredEntityBounds,
    hoveredEntity,
    unclusteredStrokesInEntity,
    activeEntityBounds,
    handleAnchorModalOpen,
    hoverScreenX,
    hoverScreenY,
    handleHover,
    handleBadgeHover,
    anchorTooltip,
    handleHoverTimeout,
    handleFingerTap,
    handleCloseAnchorTooltip,
    handleSaveAnchorTooltip,
    canvasScale,
    canvasTranslateX,
    canvasTranslateY,
    handleStrokeEnd,
    handleTransform,
    handleBarrelButton,
    handleUndo,
    handleRedo,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    handleToggleStylusOnly,
    handleCompile,
    isSaving,
    lastSavedAt,
    handleTitleChange,
    handleNewMap,
    handleSaveMap,
    currentMapId,
    savedMaps,
    handleLoadMap,
    showClearConfirmModal,
    handleRequestClear,
    handleConfirmClear,
    handleCancelClear,
    handleDeleteMap,
    visualAST,
    toolbarDockSide,
    handleToggleDockSide,
    pacerFilter,
    setPacerFilter,
    showPacerOverlay,
    handleTogglePacerOverlay,
  } = useCanvasState();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.rootContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#0B1120" />

      {/* 1. Header Superior Minimalista (48dp) - Título editable, Auto-Save .cmn, Undo/Redo, Compilar */}
      <TopHeader
        mapTitle={mapTitle}
        onTitleChange={handleTitleChange}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onRequestClear={handleRequestClear}
        onOpenCompiler={() => setIsDrawerOpen(true)}
        onOpenDocumentMenu={() => setShowDocumentMenu(true)}
        isSaving={isSaving}
        lastSavedAt={lastSavedAt}
      />

      {/* 2. Lienzo Infinito 100% Despejado con Dock Lateral Flotante */}
      <View style={styles.canvasWrapper}>
        {/* Dock Vertical Flotante (Pill) - Cambiable entre lateral Izquierdo y Derecho con persistencia */}
        <GoodnotesToolbar
          activeBrush={activeBrush}
          onSelectBrush={setActiveBrush}
          activeColor={activeColor}
          onSelectColor={setActiveColor}
          activeWidth={activeWidth}
          onSelectWidth={setActiveWidth}
          eraserMode={eraserMode}
          onSelectEraserMode={setEraserMode}
          backgroundType={backgroundType}
          onSelectBackgroundType={setBackgroundType}
          canvasTheme={canvasTheme}
          onSelectCanvasTheme={setCanvasTheme}
          favoriteColors={favoriteColors}
          onUpdateFavoriteColor={updateFavoriteColor}
          dockSide={toolbarDockSide}
          onToggleDockSide={handleToggleDockSide}
          canvasScale={canvasScale}
          canvasTranslateX={canvasTranslateX}
          canvasTranslateY={canvasTranslateY}
          onOpenStickerPicker={(targetWorld) => {
            setStickerTargetWorld(targetWorld);
            setStickerPickerVisible(true);
          }}
          onStickerDragChange={(drag) => {
            setDragGhost(drag ? { screenX: drag.screenX, screenY: drag.screenY } : null);
          }}
        />

        {/* Indicador fantasma flotante durante el arrastre de sticker */}
        {dragGhost && (
          <View
            pointerEvents="none"
            style={[
              styles.dragGhostHalo,
              {
                left: dragGhost.screenX - 32,
                top: dragGhost.screenY - 32,
              },
            ]}
          >
            <View style={styles.haloInner}>
              <Sparkles size={24} color="#38BDF8" strokeWidth={2.2} />
            </View>
          </View>
        )}

        {/* Pastilla Contextual Flotante de Selección por Lazo */}
        <ContextualSelectionPill
          hasSelection={hasSelection}
          selectedCount={selectedCount}
          selectionBounds={selectionBounds}
          canvasScale={canvasScale}
          canvasTranslateX={canvasTranslateX}
          canvasTranslateY={canvasTranslateY}
          onOpenAttributeModal={handleOpenAttributeModalFromLasso}
          onDuplicateSelection={handleDuplicateSelection}
          onDeleteSelection={handleDeleteSelection}
          onClearSelection={handleClearSelection}
        />

        <JetpackInkCanvas
          style={StyleSheet.absoluteFill}
          strokeColor={activeColor}
          strokeWidth={activeWidth}
          brushType={activeBrush}
          eraserMode={eraserMode}
          backgroundType={backgroundType}
          canvasBackgroundColor={canvasBackgroundColor}
          gridColor={canvasGridColor}
          stylusOnly={stylusOnly}
          zoomInTrigger={zoomInTrigger}
          zoomOutTrigger={zoomOutTrigger}
          resetZoomTrigger={resetZoomTrigger}
          clearTrigger={clearTrigger}
          undoTrigger={undoTrigger}
          redoTrigger={redoTrigger}
          deleteSelectionTrigger={deleteSelectionTrigger}
          duplicateSelectionTrigger={duplicateSelectionTrigger}
          clearSelectionTrigger={clearSelectionTrigger}
          loadedStrokesJson={loadedStrokesJson}
          loadStrokesTrigger={loadStrokesTrigger}
          onStrokeEnd={(e) => {
            handleStrokeEnd(e);
            cognitiveLayerStore.markAsDirty();
          }}
          onTransform={handleTransform}
          onBarrelButton={handleBarrelButton}
          onSelectionChanged={handleSelectionChanged}
          onHover={handleHover}
          onHoverTimeout={handleHoverTimeout}
          onFingerTap={handleFingerTap}
          onStrokesTransformed={handleStrokesTransformed}
        />

        {/* Capa Fantasma Semántica HUD (Ghost Overlay - Macro-Islas y Puentes) */}
        <GhostOverlay
          visualAST={visualAST}
          canvasScale={canvasScale}
          canvasTranslateX={canvasTranslateX}
          canvasTranslateY={canvasTranslateY}
        />

        {/* Capa de Superposición PACER (Retrocompatibilidad) */}
        {compilation?.nodes && (
          <PacerOverlayLayer
            nodes={compilation.nodes}
            visualAST={visualAST}
            canvasScale={canvasScale}
            canvasTranslateX={canvasTranslateX}
            canvasTranslateY={canvasTranslateY}
            activeFilter={pacerFilter}
            visible={showPacerOverlay}
          />
        )}

        {/* Badges de Atributos Cognitivos anclados al lienzo con soporte Air View y Halo Perimetral */}
        <PlacedAttributeBadges
          attributes={placedAttributes}
          canvasScale={canvasScale}
          canvasTranslateX={canvasTranslateX}
          canvasTranslateY={canvasTranslateY}
          hoveredAttribute={hoveredAttribute}
          activeAnchorEntityId={activeAnchorEntity?.id}
          hoveredEntityBounds={hoveredEntityBounds}
          activeEntityBounds={activeEntityBounds}
          hoveredEntity={hoveredEntity}
          unclusteredStrokesInEntity={unclusteredStrokesInEntity}
          anchorTooltip={anchorTooltip}
          hoverScreenX={hoverScreenX}
          hoverScreenY={hoverScreenY}
          onDeleteAttribute={handleDeleteAttribute}
          onOpenCompiler={() => setIsDrawerOpen(true)}
          onBadgeHover={handleBadgeHover}
        />

        {/* Tooltip flotante contextual de Anclaje Semántico */}
        {anchorTooltip?.visible && (
          <SemanticAnchorTooltip
            visible={anchorTooltip.visible}
            screenX={anchorTooltip.screenX}
            screenY={anchorTooltip.screenY}
            worldX={anchorTooltip.worldX}
            worldY={anchorTooltip.worldY}
            initialStage={anchorTooltip.initialStage}
            entityBounds={activeEntityBounds}
            strokeIds={anchorTooltip.strokeIds}
            canvasScale={canvasScale}
            canvasTranslateX={canvasTranslateX}
            canvasTranslateY={canvasTranslateY}
            onModalOpen={handleAnchorModalOpen}
            onSave={handleSaveAnchorTooltip}
            onClose={handleCloseAnchorTooltip}
          />
        )}

        {/* 4. Barra Inferior Flotante (Solo Stylus & Zoom 100%) */}
        <FloatingFooter
          stylusOnly={stylusOnly}
          onToggleStylusOnly={handleToggleStylusOnly}
          displayZoom={displayZoom}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onResetZoom={handleResetZoom}
        />
      </View>

      {/* 5. Panel Lateral de Compilación (380dp) con Auditoría GRINDE, PACER y Práctica Deliberada */}
      <CompilerDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        compilation={compilation}
        onCompile={handleCompile}
        isCompiling={isCompiling}
        strokeCount={strokeCount}
        pacerFilter={pacerFilter}
        onPacerFilterChange={setPacerFilter}
        showPacerOverlay={showPacerOverlay}
        onTogglePacerOverlay={handleTogglePacerOverlay}
      />

      {/* 6. Modal de Confirmación de Borrado Seguro de Lienzo */}
      <ClearCanvasConfirmModal
        visible={showClearConfirmModal}
        onConfirm={handleConfirmClear}
        onCancel={handleCancelClear}
      />

      {/* 7. Modal Unificado de Documento (Bóveda Integrada, Exportación, Acciones) */}
      <DocumentActionsModal
        visible={showDocumentMenu}
        onClose={() => setShowDocumentMenu(false)}
        mapTitle={mapTitle}
        strokeCount={strokeCount}
        entityCount={visualAST.entities.length}
        lastSavedAt={lastSavedAt}
        savedMaps={savedMaps}
        currentMapId={currentMapId}
        onSelectMap={handleLoadMap}
        onNewMap={handleNewMap}
        onDeleteMap={handleDeleteMap}
        onRequestClear={handleRequestClear}
        onOpenCompiler={() => setIsDrawerOpen(true)}
      />

      {/* 8. Selector de Stickers Cognitivos (Modal / Popover) */}
      <StickerPickerModal
        visible={stickerPickerVisible}
        targetWorld={stickerTargetWorld}
        onClose={() => setStickerPickerVisible(false)}
      />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: "#090D16",
  },
  canvasWrapper: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
  },
  dragGhostHalo: {
    position: "absolute",
    width: 64,
    height: 64,
    borderRadius: 32,
    zIndex: 9999,
    elevation: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  haloInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    borderWidth: 2,
    borderColor: "#38BDF8",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#38BDF8",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
});
