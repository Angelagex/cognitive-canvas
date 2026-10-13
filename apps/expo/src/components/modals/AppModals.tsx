import React from "react";
import { ClearCanvasConfirmModal } from "./ClearCanvasConfirmModal";
import { DocumentActionsModal } from "./DocumentActionsModal";
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
    handleLoadMap,
    handleNewMap,
    handleDeleteMap,
    handleRequestClear,
    setIsDrawerOpen,
  } = canvas;

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
        onSelectMap={handleLoadMap}
        onNewMap={handleNewMap}
        onDeleteMap={handleDeleteMap}
        onRequestClear={handleRequestClear}
        onOpenCompiler={() => setIsDrawerOpen(true)}
      />

      <StickerPickerModal
        visible={stickerPickerVisible}
        targetWorld={stickerTargetWorld}
        onClose={onCloseStickerPicker}
      />
    </>
  );
};
