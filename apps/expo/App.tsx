import React from "react";
import { StyleSheet, View, SafeAreaView, StatusBar } from "react-native";
import { useCanvasState } from "./src/hooks/useCanvasState";
import { TopHeader } from "./src/components/header/TopHeader";
import { GoodnotesToolbar } from "./src/components/toolbar/GoodnotesToolbar";
import { JetpackInkCanvas } from "./src/components/JetpackInkCanvas";
import { DotGridBackground } from "./src/components/canvas/DotGridBackground";
import { FloatingFooter } from "./src/components/footer/FloatingFooter";
import { CompilerDrawer } from "./src/components/drawer/CompilerDrawer";

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

      {/* 2. Barra de Herramientas Estilo Goodnotes (56dp) */}
      <GoodnotesToolbar
        activeBrush={activeBrush}
        onSelectBrush={setActiveBrush}
        activeColor={activeColor}
        onSelectColor={setActiveColor}
        activeWidth={activeWidth}
        onSelectWidth={setActiveWidth}
        onTriggerPassiveAttribute={() => {
          // Trigger passive attribute prompt
          setIsDrawerOpen(true);
        }}
      />

      {/* 3. Lienzo Infinito con Dot Grid y Jetpack Ink Nativo */}
      <View style={styles.canvasWrapper}>
        <DotGridBackground backgroundColor="#090D16" />

        <JetpackInkCanvas
          style={StyleSheet.absoluteFill}
          strokeColor={activeColor}
          strokeWidth={activeWidth}
          brushType={activeBrush}
          stylusOnly={stylusOnly}
          zoomInTrigger={zoomInTrigger}
          zoomOutTrigger={zoomOutTrigger}
          resetZoomTrigger={resetZoomTrigger}
          clearTrigger={clearTrigger}
          undoTrigger={undoTrigger}
          redoTrigger={redoTrigger}
          onStrokeEnd={handleStrokeEnd}
          onTransform={handleTransform}
          onBarrelButton={handleBarrelButton}
        />

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
