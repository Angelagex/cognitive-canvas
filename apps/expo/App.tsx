import React from "react";
import { StyleSheet, View, SafeAreaView, StatusBar } from "react-native";
import { useCanvasState } from "./src/hooks/useCanvasState";
import { TopHeader } from "./src/components/header/TopHeader";
import { GoodnotesToolbar } from "./src/components/toolbar/GoodnotesToolbar";
import { JetpackInkCanvas } from "./src/components/JetpackInkCanvas";
import { FloatingFooter } from "./src/components/footer/FloatingFooter";
import { CompilerDrawer } from "./src/components/drawer/CompilerDrawer";
import { PlacedAttributeBadges } from "./src/components/canvas/PlacedAttributeBadges";
import { SemanticAnchorTooltip } from "./src/components/canvas/SemanticAnchorTooltip";

export default function App() {
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
    isDrawerOpen,
    setIsDrawerOpen,
    isCompiling,
    compilation,
    hasSelection,
    selectedCount,
    deleteSelectionTrigger,
    clearSelectionTrigger,
    handleSelectionChanged,
    handleDeleteSelection,
    handleClearSelection,
    placedAttributes,
    handleAddAttribute,
    handleDeleteAttribute,
    hoveredAttribute,
    hoverScreenX,
    hoverScreenY,
    handleHover,
    handleBadgeHover,
    anchorTooltip,
    handleHoverTimeout,
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
    handleClear,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    handleToggleStylusOnly,
    handleCompile,
  } = useCanvasState();

  return (
    <SafeAreaView style={styles.rootContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1120" />

      {/* 1. Header Superior (48dp) - Bóvedas, Título editable, Undo/Redo, Compilar */}
      <TopHeader
        mapTitle={mapTitle}
        onTitleChange={setMapTitle}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClear}
        onOpenCompiler={() => setIsDrawerOpen(true)}
      />

      {/* 2. Barra de Herramientas Estilo Goodnotes (56dp + sub-barra contextual) */}
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
        favoriteColors={favoriteColors}
        onUpdateFavoriteColor={updateFavoriteColor}
        hasSelection={hasSelection}
        selectedCount={selectedCount}
        onDeleteSelection={handleDeleteSelection}
        onClearSelection={handleClearSelection}
      />

      {/* 3. Lienzo Infinito con Jetpack Ink Nativo y Badges de Atributos */}
      <View style={styles.canvasWrapper}>
        <JetpackInkCanvas
          style={StyleSheet.absoluteFill}
          strokeColor={activeColor}
          strokeWidth={activeWidth}
          brushType={activeBrush}
          eraserMode={eraserMode}
          backgroundType={backgroundType}
          stylusOnly={stylusOnly}
          zoomInTrigger={zoomInTrigger}
          zoomOutTrigger={zoomOutTrigger}
          resetZoomTrigger={resetZoomTrigger}
          clearTrigger={clearTrigger}
          undoTrigger={undoTrigger}
          redoTrigger={redoTrigger}
          deleteSelectionTrigger={deleteSelectionTrigger}
          clearSelectionTrigger={clearSelectionTrigger}
          onStrokeEnd={handleStrokeEnd}
          onTransform={handleTransform}
          onBarrelButton={handleBarrelButton}
          onSelectionChanged={handleSelectionChanged}
          onHover={handleHover}
          onHoverTimeout={handleHoverTimeout}
        />

        {/* Badges de Atributos Cognitivos anclados al lienzo con soporte Air View */}
        <PlacedAttributeBadges
          attributes={placedAttributes}
          canvasScale={canvasScale}
          canvasTranslateX={canvasTranslateX}
          canvasTranslateY={canvasTranslateY}
          hoveredAttribute={hoveredAttribute}
          hoverScreenX={hoverScreenX}
          hoverScreenY={hoverScreenY}
          onDeleteAttribute={handleDeleteAttribute}
          onOpenCompiler={() => setIsDrawerOpen(true)}
          onBadgeHover={handleBadgeHover}
        />

        {/* Tooltip flotante contextual de Anclaje Semántico (Hover Dwell 800ms / Botón S-Pen) */}
        {anchorTooltip?.visible && (
          <SemanticAnchorTooltip
            visible={anchorTooltip.visible}
            screenX={anchorTooltip.screenX}
            screenY={anchorTooltip.screenY}
            worldX={anchorTooltip.worldX}
            worldY={anchorTooltip.worldY}
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

      {/* 5. Panel Lateral de Compilación (380dp) */}
      <CompilerDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        compilation={compilation}
        onCompile={handleCompile}
        isCompiling={isCompiling}
        strokeCount={strokeCount}
      />
    </SafeAreaView>
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
});
