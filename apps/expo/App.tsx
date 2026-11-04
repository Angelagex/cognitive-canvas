import React, { useState, useRef, useEffect, useCallback } from "react";
import { View, StatusBar, Animated, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useFonts } from "expo-font";
import { Syne_700Bold, Syne_800ExtraBold } from "@expo-google-fonts/syne";
import { BarlowCondensed_700Bold, BarlowCondensed_800ExtraBold } from "@expo-google-fonts/barlow-condensed";
import { InstrumentSerif_400Regular, InstrumentSerif_400Regular_Italic } from "@expo-google-fonts/instrument-serif";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { SpaceMono_400Regular, SpaceMono_700Bold } from "@expo-google-fonts/space-mono";
import { Sparkles, Minimize2 } from "@sketchyicons/react-native";
import { useCanvasState } from "./src/hooks/useCanvasState";
import { TopHeader } from "./src/components/header/TopHeader";
import { GoodnotesToolbar } from "./src/components/toolbar/GoodnotesToolbar";
import { JetpackInkCanvas } from "./src/components/JetpackInkCanvas";
import { FloatingFooter } from "./src/components/footer/FloatingFooter";
import { ZenZoomToast } from "./src/components/footer/ZenZoomToast";
import { CompilerDrawer } from "./src/components/drawer/CompilerDrawer";
import { CanvasOverlays } from "./src/components/canvas/CanvasOverlays";
import { FloatingRecordingPill } from "./src/components/canvas/FloatingRecordingPill";
import { AppModals } from "./src/components/modals/AppModals";
import { WorkspaceHubScreen } from "./src/features/hub/WorkspaceHubScreen";
import { cognitiveLayerStore } from "./src/stores/useCognitiveLayerStore";
import { AppThemeProvider, useAppTheme, SkinProvider } from "./src/theme";
import { styles } from "./src/styles/App.styles";

export type RootScreen = "hub" | "canvas";

function MainAppContent() {
  const [currentScreen, setCurrentScreen] = useState<RootScreen>("hub");
  const { theme } = useAppTheme();
  const [showDocumentMenu, setShowDocumentMenu] = useState(false);
  const [stickerPickerVisible, setStickerPickerVisible] = useState(false);
  const [stickerTargetWorld, setStickerTargetWorld] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragGhost, setDragGhost] = useState<{ screenX: number; screenY: number } | null>(null);
  const [isZenMode, setIsZenMode] = useState(false);
  const [zoomToastVisible, setZoomToastVisible] = useState(false);
  const zoomToastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const zenAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(zenAnim, {
      toValue: isZenMode ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isZenMode]);

  const canvas = useCanvasState();
  const prevDisplayZoomRef = useRef(canvas.displayZoom);

  useEffect(() => {
    if (prevDisplayZoomRef.current !== canvas.displayZoom) {
      prevDisplayZoomRef.current = canvas.displayZoom;
      if (isZenMode) {
        setZoomToastVisible(true);
        if (zoomToastTimerRef.current) clearTimeout(zoomToastTimerRef.current);
        zoomToastTimerRef.current = setTimeout(() => setZoomToastVisible(false), 1800);
      }
    }
  }, [canvas.displayZoom, isZenMode]);

  useEffect(() => {
    return () => {
      if (zoomToastTimerRef.current) clearTimeout(zoomToastTimerRef.current);
    };
  }, []);

  const handleOpenCanvasFromHub = useCallback(
    async (
      mapId: string,
      boundingBox?: { minX: number; minY: number; maxX: number; maxY: number }
    ) => {
      if (mapId !== canvas.currentMapId) {
        await canvas.handleLoadMap(mapId);
      }
      if (boundingBox) {
        const { width, height } = Dimensions.get("window");
        const centerX = (boundingBox.minX + boundingBox.maxX) / 2;
        const centerY = (boundingBox.minY + boundingBox.maxY) / 2;
        canvas.setCanvasScale(1.0);
        canvas.setCanvasTranslateX(width / 2 - centerX);
        canvas.setCanvasTranslateY(height / 2 - centerY);
      }
      setCurrentScreen("canvas");
    },
    [canvas]
  );

  const handleCreateNewCanvasFromHub = useCallback(async () => {
    await canvas.handleNewMap();
    setCurrentScreen("canvas");
  }, [canvas]);

  const handleReturnToHub = useCallback(async () => {
    await canvas.handleSaveMap();
    setCurrentScreen("hub");
  }, [canvas]);

  const headerAnimStyle = {
    opacity: zenAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
    transform: [{ translateY: zenAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -50] }) }],
  };
  const footerAnimStyle = {
    opacity: zenAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
    transform: [{ translateY: zenAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 60] }) }],
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.rootContainer, { backgroundColor: theme.colors.bgApp }]}>
        <StatusBar barStyle="light-content" backgroundColor={theme.colors.bgHeader} />

        {currentScreen === "hub" ? (
          <WorkspaceHubScreen
            canvases={canvas.savedMaps}
            currentMapId={canvas.currentMapId}
            currentMapTitle={canvas.mapTitle}
            currentStrokeCount={canvas.strokeCount}
            stylusOnly={canvas.stylusOnly}
            onToggleStylusOnly={canvas.handleToggleStylusOnly}
            toolbarDockEdge={canvas.toolbarDockEdge}
            onChangeDockEdge={canvas.handleChangeDockEdge}
            canvasTheme={canvas.canvasTheme}
            onSelectTheme={canvas.setCanvasTheme}
            onOpenCanvas={handleOpenCanvasFromHub}
            onCreateNewCanvas={handleCreateNewCanvasFromHub}
            onDeleteCanvas={canvas.handleDeleteMap}
          />
        ) : (
          <>
            <View style={styles.canvasWrapper}>
              <JetpackInkCanvas
                style={StyleSheet.absoluteFill}
                strokeColor={canvas.activeColor}
                strokeWidth={canvas.activeWidth}
                brushType={canvas.activeBrush}
                eraserMode={canvas.eraserMode}
                backgroundType={canvas.backgroundType}
                canvasBackgroundColor={canvas.canvasBackgroundColor}
                gridColor={canvas.canvasGridColor}
                stylusOnly={canvas.stylusOnly}
                zoomInTrigger={canvas.zoomInTrigger}
                zoomOutTrigger={canvas.zoomOutTrigger}
                resetZoomTrigger={canvas.resetZoomTrigger}
                clearTrigger={canvas.clearTrigger}
                undoTrigger={canvas.undoTrigger}
                redoTrigger={canvas.redoTrigger}
                deleteSelectionTrigger={canvas.deleteSelectionTrigger}
                duplicateSelectionTrigger={canvas.duplicateSelectionTrigger}
                clearSelectionTrigger={canvas.clearSelectionTrigger}
                loadedStrokesJson={canvas.loadedStrokesJson}
                loadStrokesTrigger={canvas.loadStrokesTrigger}
                onStrokeEnd={(e) => {
                  canvas.handleStrokeEnd(e);
                  cognitiveLayerStore.markAsDirty();
                }}
                onTransform={canvas.handleTransform}
                onBarrelButton={canvas.handleBarrelButton}
                onSelectionChanged={canvas.handleSelectionChanged}
                onHover={canvas.handleHover}
                onHoverTimeout={canvas.handleHoverTimeout}
                onFingerTap={canvas.handleFingerTap}
                onStrokesTransformed={canvas.handleStrokesTransformed}
              />

              <CanvasOverlays canvas={canvas} />

              <GoodnotesToolbar
                activeBrush={canvas.activeBrush}
                onSelectBrush={canvas.setActiveBrush}
                activeColor={canvas.activeColor}
                onSelectColor={canvas.setActiveColor}
                activeWidth={canvas.activeWidth}
                onSelectWidth={canvas.setActiveWidth}
                eraserMode={canvas.eraserMode}
                onSelectEraserMode={canvas.setEraserMode}
                backgroundType={canvas.backgroundType}
                onSelectBackgroundType={canvas.setBackgroundType}
                canvasTheme={canvas.canvasTheme}
                onSelectCanvasTheme={canvas.setCanvasTheme}
                favoriteColors={canvas.favoriteColors}
                onUpdateFavoriteColor={canvas.updateFavoriteColor}
                dockEdge={canvas.toolbarDockEdge}
                onDockEdgeChange={canvas.handleChangeDockEdge}
                canvasScale={canvas.canvasScale}
                canvasTranslateX={canvas.canvasTranslateX}
                canvasTranslateY={canvas.canvasTranslateY}
                onOpenStickerPicker={(targetWorld) => {
                  setStickerTargetWorld(targetWorld);
                  setStickerPickerVisible(true);
                }}
                onStickerDragChange={(drag) => {
                  setDragGhost(drag ? { screenX: drag.screenX, screenY: drag.screenY } : null);
                }}
                isZenMode={isZenMode}
              />

              {dragGhost && (
                <View
                  pointerEvents="none"
                  style={[
                    styles.dragGhostHalo,
                    { left: dragGhost.screenX - 32, top: dragGhost.screenY - 32 },
                  ]}
                >
                  <View style={styles.haloInner}>
                    <Sparkles size={24} color="#38BDF8" strokeWidth={2.2} />
                  </View>
                </View>
              )}

              {!isZenMode && (
                <Animated.View style={[styles.topHeaderContainer, headerAnimStyle]} pointerEvents="box-none">
                  <TopHeader
                    mapTitle={canvas.mapTitle}
                    onTitleChange={canvas.handleTitleChange}
                    canUndo={canvas.canUndo}
                    canRedo={canvas.canRedo}
                    onUndo={canvas.handleUndo}
                    onRedo={canvas.handleRedo}
                    isDrawerOpen={canvas.isDrawerOpen}
                    onToggleDrawer={() => canvas.setIsDrawerOpen(!canvas.isDrawerOpen)}
                    onFastCompile={canvas.handleFastCompile}
                    onCompileFromScratch={canvas.handleCompileFromScratch}
                    onStartExplanation={canvas.handleStartExplanation}
                    explanationTranscript={canvas.walkthroughModalTranscript}
                    onClearExplanation={canvas.handleClearExplanation}
                    isIncremental={canvas.isIncremental}
                    onToggleIncremental={() => canvas.setIsIncremental(!canvas.isIncremental)}
                    isCompiling={canvas.isCompiling}
                    blindSpotsCount={canvas.blindSpotsCount}
                    onOpenDocumentMenu={() => setShowDocumentMenu(true)}
                    onReturnToHub={handleReturnToHub}
                    isSaving={canvas.isSaving}
                    lastSavedAt={canvas.lastSavedAt}
                    isZenMode={isZenMode}
                    onToggleZenMode={() => setIsZenMode((prev) => !prev)}
                  />
                </Animated.View>
              )}

              {canvas.isRecordingWalkthrough && (
                <FloatingRecordingPill
                  elapsedSeconds={canvas.walkthroughSeconds}
                  maxSeconds={180}
                  onStop={canvas.handleStopAndCompileExplanation}
                  statusMessage={canvas.compilationStatusMessage}
                />
              )}

              {!isZenMode && (
                <Animated.View style={[styles.floatingFooterContainer, footerAnimStyle]} pointerEvents="box-none">
                  <FloatingFooter
                    stylusOnly={canvas.stylusOnly}
                    onToggleStylusOnly={canvas.handleToggleStylusOnly}
                    displayZoom={canvas.displayZoom}
                    onZoomIn={canvas.handleZoomIn}
                    onZoomOut={canvas.handleZoomOut}
                    onResetZoom={canvas.handleResetZoom}
                  />
                </Animated.View>
              )}

              {isZenMode && (
                <Animated.View style={[styles.exitZenButtonWrapper, { opacity: zenAnim }]}>
                  <TouchableOpacity style={styles.exitZenButton} onPress={() => setIsZenMode(false)} activeOpacity={0.7}>
                    <Minimize2 size={18} color="#38BDF8" strokeWidth={2.0} />
                  </TouchableOpacity>
                </Animated.View>
              )}

              {isZenMode && <ZenZoomToast displayZoom={canvas.displayZoom} visible={zoomToastVisible} />}
            </View>

            <CompilerDrawer
              isOpen={canvas.isDrawerOpen}
              onClose={() => canvas.setIsDrawerOpen(false)}
              compilation={canvas.compilation}
              onCompile={canvas.handleFastCompile}
              isCompiling={canvas.isCompiling}
              strokeCount={canvas.strokeCount}
              lastCompiledStrokeCount={canvas.lastCompiledStrokeCount}
              pacerFilter={canvas.pacerFilter}
              onPacerFilterChange={canvas.setPacerFilter}
              showPacerOverlay={canvas.showPacerOverlay}
              onTogglePacerOverlay={canvas.handleTogglePacerOverlay}
              onFocusNode={canvas.focusOnBoundingBox}
              activeTab={canvas.activeDrawerTab}
            />

            <AppModals
              canvas={canvas}
              showDocumentMenu={showDocumentMenu}
              onCloseDocumentMenu={() => setShowDocumentMenu(false)}
              stickerPickerVisible={stickerPickerVisible}
              stickerTargetWorld={stickerTargetWorld}
              onCloseStickerPicker={() => setStickerPickerVisible(false)}
            />
          </>
        )}
      </View>
    </GestureHandlerRootView>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Syne_700Bold,
    Syne_800ExtraBold,
    BarlowCondensed_700Bold,
    BarlowCondensed_800ExtraBold,
    InstrumentSerif_400Regular,
    InstrumentSerif_400Regular_Italic,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    SpaceMono_400Regular,
    SpaceMono_700Bold,
  });

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: "#0C0E14" }} />;
  }

  return (
    <SkinProvider>
      <AppThemeProvider>
        <MainAppContent />
      </AppThemeProvider>
    </SkinProvider>
  );
}
