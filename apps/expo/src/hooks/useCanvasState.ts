import { useState, useCallback } from "react";
import { useCanvasTools } from "./canvas/useCanvasTools";
import { useCanvasViewport } from "./canvas/useCanvasViewport";
import { useCanvasAst } from "./canvas/useCanvasAst";
import { useCanvasDocument } from "./canvas/useCanvasDocument";
import { useCanvasHover } from "./canvas/useCanvasHover";
import { useCognitiveCompilation } from "./canvas/useCognitiveCompilation";

export const useCanvasState = () => {
  // 1. Tools, Colors & Dock Side State
  const tools = useCanvasTools();

  // 2. Viewport & Pan / Zoom State
  const viewport = useCanvasViewport();

  // 3. Modals State
  const [showVaultModal, setShowVaultModal] = useState<boolean>(false);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState<boolean>(false);

  // 4. Compilation Drawer & Justin Sung Learning Engine
  const compiler = useCognitiveCompilation();

  // Dirty State Tracker (will be passed from document)
  let markDirtyFn: () => void = () => {};

  // 5. AST & Native Ink Layer (Strokes, AST Engine, Undo/Redo)
  const ast = useCanvasAst({
    canvasScale: viewport.canvasScale,
    getPlacedAttributes: () => doc.placedAttributesRef.current,
    markDirty: () => markDirtyFn(),
  });

  // 6. Document & Persistence Layer (.cmn format, Vault, Auto-Save)
  const doc = useCanvasDocument({
    canvasScale: viewport.canvasScale,
    canvasTranslateX: viewport.canvasTranslateX,
    canvasTranslateY: viewport.canvasTranslateY,
    setCanvasScale: viewport.setCanvasScale,
    setCanvasTranslateX: viewport.setCanvasTranslateX,
    setCanvasTranslateY: viewport.setCanvasTranslateY,
    strokesRef: ast.strokesRef,
    strokeBBoxesRef: ast.strokeBBoxesRef,
    setRawStrokes: ast.setRawStrokes,
    setStrokeCount: ast.setStrokeCount,
    setCanUndo: ast.setCanUndo,
    setCanRedo: ast.setCanRedo,
    setLoadedStrokesJson: ast.setLoadedStrokesJson,
    setLoadStrokesTrigger: ast.setLoadStrokesTrigger,
    setClearTrigger: ast.setClearTrigger,
    visualAST: ast.visualAST,
    setVisualAST: ast.setVisualAST,
    compilation: compiler.compilation,
    setCompilation: compiler.setCompilation,
    setToolbarDockSide: tools.setToolbarDockSide,
  });

  markDirtyFn = doc.markDirty;

  // 7. S-Pen Air View Hover & Semantic Anchoring
  const hover = useCanvasHover({
    placedAttributes: doc.placedAttributes,
    setPlacedAttributes: doc.setPlacedAttributes,
    canvasScale: viewport.canvasScale,
    canvasTranslateX: viewport.canvasTranslateX,
    canvasTranslateY: viewport.canvasTranslateY,
    visualAST: ast.visualAST,
    strokesRef: ast.strokesRef,
    strokeBBoxesRef: ast.strokeBBoxesRef,
    markDirty: doc.markDirty,
  });

  const handleRequestClear = useCallback(() => {
    setShowClearConfirmModal(true);
  }, []);

  const handleConfirmClear = useCallback(() => {
    ast.handleClear();
    doc.setPlacedAttributes([]);
    compiler.setCompilation(null);
    setShowClearConfirmModal(false);
  }, [ast.handleClear, doc.setPlacedAttributes, compiler.setCompilation]);

  const handleCancelClear = useCallback(() => {
    setShowClearConfirmModal(false);
  }, []);

  return {
    // Document
    currentMapId: doc.currentMapId,
    mapTitle: doc.mapTitle,
    setMapTitle: doc.setMapTitle,
    handleTitleChange: doc.handleTitleChange,
    isSaving: doc.isSaving,
    lastSavedAt: doc.lastSavedAt,
    savedMaps: doc.savedMaps,
    handleSaveMap: doc.handleSaveMap,
    handleLoadMap: doc.handleLoadMap,
    handleNewMap: doc.handleNewMap,
    handleDeleteMap: doc.handleDeleteMap,
    placedAttributes: doc.placedAttributes,
    handleAddAttribute: doc.handleAddAttribute,
    handleDeleteAttribute: doc.handleDeleteAttribute,

    // Tools
    activeBrush: tools.activeBrush,
    setActiveBrush: tools.setActiveBrush,
    activeColor: tools.activeColor,
    setActiveColor: tools.setActiveColor,
    activeWidth: tools.activeWidth,
    setActiveWidth: tools.setActiveWidth,
    eraserMode: tools.eraserMode,
    setEraserMode: tools.setEraserMode,
    backgroundType: tools.backgroundType,
    setBackgroundType: tools.setBackgroundType,
    favoriteColors: tools.favoriteColors,
    setFavoriteColors: tools.setFavoriteColors,
    updateFavoriteColor: tools.updateFavoriteColor,
    stylusOnly: tools.stylusOnly,
    handleToggleStylusOnly: tools.handleToggleStylusOnly,
    toolbarDockSide: tools.toolbarDockSide,
    handleToggleDockSide: tools.handleToggleDockSide,
    handleChangeDockSide: tools.handleChangeDockSide,

    // Viewport
    displayZoom: viewport.displayZoom,
    zoomInTrigger: viewport.zoomInTrigger,
    zoomOutTrigger: viewport.zoomOutTrigger,
    resetZoomTrigger: viewport.resetZoomTrigger,
    canvasScale: viewport.canvasScale,
    canvasTranslateX: viewport.canvasTranslateX,
    canvasTranslateY: viewport.canvasTranslateY,
    handleZoomIn: viewport.handleZoomIn,
    handleZoomOut: viewport.handleZoomOut,
    handleResetZoom: viewport.handleResetZoom,
    handleTransform: viewport.handleTransform,

    // AST & Ink Bridge
    visualAST: ast.visualAST,
    rawStrokes: ast.rawStrokes,
    strokeCount: ast.strokeCount,
    canUndo: ast.canUndo,
    canRedo: ast.canRedo,
    undoTrigger: ast.undoTrigger,
    redoTrigger: ast.redoTrigger,
    clearTrigger: ast.clearTrigger,
    loadedStrokesJson: ast.loadedStrokesJson,
    loadStrokesTrigger: ast.loadStrokesTrigger,
    hasSelection: ast.hasSelection,
    selectedCount: ast.selectedCount,
    deleteSelectionTrigger: ast.deleteSelectionTrigger,
    clearSelectionTrigger: ast.clearSelectionTrigger,
    handleStrokeEnd: ast.handleStrokeEnd,
    handleUndo: ast.handleUndo,
    handleRedo: ast.handleRedo,
    handleClear: ast.handleClear,
    handleSelectionChanged: ast.handleSelectionChanged,
    handleDeleteSelection: ast.handleDeleteSelection,
    handleClearSelection: ast.handleClearSelection,

    // Compilation
    isDrawerOpen: compiler.isDrawerOpen,
    setIsDrawerOpen: compiler.setIsDrawerOpen,
    isCompiling: compiler.isCompiling,
    compilation: compiler.compilation,
    handleCompile: compiler.handleCompile,

    // Air View Hover & Semantic Anchoring
    hoveredAttribute: hover.hoveredAttribute,
    activeAnchorEntity: hover.activeAnchorEntity,
    hoveredEntityBounds: hover.hoveredEntityBounds,
    hoveredEntity: hover.hoveredEntity,
    unclusteredStrokesInEntity: hover.unclusteredStrokesInEntity,
    activeEntityBounds: hover.activeEntityBounds,
    isAnchorModalOpen: hover.isAnchorModalOpen,
    handleAnchorModalOpen: hover.handleAnchorModalOpen,
    hoverScreenX: hover.hoverScreenX,
    hoverScreenY: hover.hoverScreenY,
    handleHover: hover.handleHover,
    handleBadgeHover: hover.handleBadgeHover,
    anchorTooltip: hover.anchorTooltip,
    handleHoverTimeout: hover.handleHoverTimeout,
    handleFingerTap: hover.handleFingerTap,
    handleBarrelButton: hover.handleBarrelButton,
    handleCloseAnchorTooltip: hover.handleCloseAnchorTooltip,
    handleSaveAnchorTooltip: hover.handleSaveAnchorTooltip,

    // Modals
    showVaultModal,
    setShowVaultModal,
    showClearConfirmModal,
    setShowClearConfirmModal,
    handleRequestClear,
    handleConfirmClear,
    handleCancelClear,
  };
};
