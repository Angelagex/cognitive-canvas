import React, { useState, useEffect } from "react";
import { ClearCanvasConfirmModal } from "./ClearCanvasConfirmModal";
import { DocumentActionsModal } from "./DocumentActionsModal";
import { VerbalWalkthroughModal } from "./VerbalWalkthroughModal";
import { OnboardingGuideModal, checkHasSeenOnboarding } from "./OnboardingGuideModal";
import { VerifiedAchievementModal } from "./VerifiedAchievementModal";
import { StickerPickerModal } from "../../features/stickers/StickerPickerModal";
import { useCanvasState } from "../../hooks/useCanvasState";

export interface AppModalsProps {
  canvas: ReturnType<typeof useCanvasState>;
  showDocumentMenu: boolean;
  onCloseDocumentMenu: () => void;
  stickerPickerVisible: boolean;
  stickerTargetWorld: { x: number; y: number };
  onCloseStickerPicker: () => void;
}

export const AppModals: React.FC<AppModalsProps> = ({
  canvas,
  showDocumentMenu,
  onCloseDocumentMenu,
  stickerPickerVisible,
  stickerTargetWorld,
  onCloseStickerPicker,
}) => {
  const {
    showClearConfirmModal,
    handleConfirmClear,
    handleCancelClear,
    mapTitle,
    strokeCount,
    visualAST,
    lastSavedAt,
    savedMaps,
    currentMapId,
    compilation,
    handleLoadMap,
    handleNewMap,
    handleDeleteMap,
    handleRequestClear,
    setIsDrawerOpen,
  } = canvas;

  const [guideVisible, setGuideVisible] = useState(false);
  const [verifiedVisible, setVerifiedVisible] = useState(false);

  // Primera vez: mostrar guía automáticamente si no se ha visto (§8)
  useEffect(() => {
    checkHasSeenOnboarding().then((seen) => {
      if (!seen) setGuideVisible(true);
    });
  }, []);

  const nodeCount = compilation?.compiled_graph_payload?.nodes?.length || compilation?.nodes?.length || 0;
  const edgeCount = compilation?.compiled_graph_payload?.edges?.length || compilation?.edges?.length || 0;

  return (
    <>
      <ClearCanvasConfirmModal
        visible={showClearConfirmModal}
        onConfirm={handleConfirmClear}
        onCancel={handleCancelClear}
      />

      <DocumentActionsModal
        visible={showDocumentMenu}
        onClose={onCloseDocumentMenu}
        mapTitle={mapTitle}
        strokeCount={strokeCount}
        entityCount={visualAST.entities.length}
        lastSavedAt={lastSavedAt}
        savedMaps={savedMaps}
        currentMapId={currentMapId}
        compilation={compilation}
        onSelectMap={handleLoadMap}
        onNewMap={handleNewMap}
        onDeleteMap={handleDeleteMap}
        onRequestClear={handleRequestClear}
        onOpenCompiler={() => setIsDrawerOpen(true)}
        onOpenGuide={() => setGuideVisible(true)}
      />

      <StickerPickerModal
        visible={stickerPickerVisible}
        targetWorld={stickerTargetWorld}
        onClose={onCloseStickerPicker}
      />

      <VerbalWalkthroughModal
        visible={canvas.showWalkthroughModal}
        onClose={() => canvas.setShowWalkthroughModal(false)}
        canvasId={canvas.currentMapId}
        initialTranscript={canvas.walkthroughModalTranscript}
        onSaveExplanation={(transcript) => {
          canvas.handleSaveExplanation(transcript);
          canvas.setShowWalkthroughModal(false);
        }}
        onConfirmCompile={canvas.handleConfirmWalkthrough}
        onStartRecording={canvas.handleStartExplanationRecording}
      />

      <OnboardingGuideModal
        visible={guideVisible}
        onClose={() => setGuideVisible(false)}
      />

      <VerifiedAchievementModal
        visible={verifiedVisible}
        onClose={() => setVerifiedVisible(false)}
        canvasTitle={mapTitle}
        strokeCount={strokeCount}
        nodeCount={nodeCount}
        edgeCount={edgeCount}
      />
    </>
  );
};
