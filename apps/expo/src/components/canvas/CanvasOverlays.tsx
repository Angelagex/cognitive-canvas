import React from "react";
import { GhostOverlay } from "./GhostOverlay";
import { PacerOverlayLayer } from "./PacerOverlayLayer";
import { PlacedAttributeBadges } from "./PlacedAttributeBadges";
import { SemanticAnchorTooltip } from "./SemanticAnchorTooltip";
import { ContextualSelectionPill } from "../toolbar/popovers/ContextualToolPill";
import { useCanvasState } from "../../hooks/useCanvasState";

export interface CanvasOverlaysProps {
  canvas: ReturnType<typeof useCanvasState>;
}

export const CanvasOverlays: React.FC<CanvasOverlaysProps> = ({ canvas }) => {
  const {
    visualAST,
    canvasScale,
    canvasTranslateX,
    canvasTranslateY,
    compilation,
    pacerFilter,
    showPacerOverlay,
    placedAttributes,
    hoveredAttribute,
    activeAnchorEntity,
    hoveredEntityBounds,
    activeEntityBounds,
    hoveredEntity,
    unclusteredStrokesInEntity,
    anchorTooltip,
    hoverScreenX,
    hoverScreenY,
    handleDeleteAttribute,
    setIsDrawerOpen,
    handleBadgeHover,
    handleAnchorModalOpen,
    handleSaveAnchorTooltip,
    handleCloseAnchorTooltip,
    hasSelection,
    selectedCount,
    selectionBounds,
    handleOpenAttributeModalFromLasso,
    handleDuplicateSelection,
    handleDeleteSelection,
    handleClearSelection,
  } = canvas;

  return (
    <>
      <GhostOverlay
        visualAST={visualAST}
        canvasScale={canvasScale}
        canvasTranslateX={canvasTranslateX}
        canvasTranslateY={canvasTranslateY}
      />

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

      <PlacedAttributeBadges
        attributes={placedAttributes}
        synthesisCards={canvas.synthesisCards}
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
        onOpenConsolidatedCanvas={(targetId) => canvas.handleLoadMap(targetId)}
      />

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

      <ContextualSelectionPill
        hasSelection={hasSelection}
        selectedCount={selectedCount}
        selectionBounds={selectionBounds}
        canvasScale={canvasScale}
        canvasTranslateX={canvasTranslateX}
        canvasTranslateY={canvasTranslateY}
        activeThinkingMemo={canvas.activeThinkingMemo}
        onSaveThinkingMemo={canvas.handleSaveThinkingMemo}
        onOpenAttributeModal={handleOpenAttributeModalFromLasso}
        onDuplicateSelection={handleDuplicateSelection}
        onDeleteSelection={handleDeleteSelection}
        onClearSelection={handleClearSelection}
      />
    </>
  );
};
