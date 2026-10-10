import { useSyncExternalStore } from "react";
import { CompiledMacroCognitiveMap } from "@cognitive-canvas/core/types";

export interface CognitiveSubLayers {
  showIslands: boolean;
  showProceduralZones: boolean;
  showAnchoringGlow: boolean;
}

export interface CognitiveLayerState {
  hasCompiledData: boolean;
  isOverlayVisible: boolean;
  isDirty: boolean; // True si el usuario modificó el mapa post-compilación
  compiledData: CompiledMacroCognitiveMap | null;
  subLayers: CognitiveSubLayers;
  activeInspectTarget: string | null; // ID de isla o entidad enfocada

  // Acciones
  setCompiledData: (data: CompiledMacroCognitiveMap) => void;
  toggleOverlay: () => void;
  setOverlayVisibility: (visible: boolean) => void;
  toggleSubLayer: (subLayer: keyof CognitiveSubLayers) => void;
  markAsDirty: () => void;
  focusInspectionTarget: (targetId: string | null) => void;
  clearCompilation: () => void;
}

interface InternalState {
  hasCompiledData: boolean;
  isOverlayVisible: boolean;
  isDirty: boolean;
  compiledData: CompiledMacroCognitiveMap | null;
  subLayers: CognitiveSubLayers;
  activeInspectTarget: string | null;
}

let state: InternalState = {
  hasCompiledData: false,
  isOverlayVisible: true,
  isDirty: false,
  compiledData: null,
  subLayers: {
    showIslands: true,
    showProceduralZones: true,
    showAnchoringGlow: true,
  },
  activeInspectTarget: null,
};

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function updateState(partial: Partial<InternalState>) {
  state = { ...state, ...partial };
  notify();
}

export const cognitiveLayerStore = {
  getState: (): InternalState => state,

  setCompiledData: (data: CompiledMacroCognitiveMap) => {
    updateState({
      compiledData: data,
      hasCompiledData: true,
      isOverlayVisible: true,
      isDirty: false,
    });
  },

  toggleOverlay: () => {
    updateState({
      isOverlayVisible: !state.isOverlayVisible,
    });
  },

  setOverlayVisibility: (visible: boolean) => {
    updateState({
      isOverlayVisible: visible,
    });
  },

  toggleSubLayer: (subLayer: keyof CognitiveSubLayers) => {
    updateState({
      subLayers: {
        ...state.subLayers,
        [subLayer]: !state.subLayers[subLayer],
      },
    });
  },

  markAsDirty: () => {
    if (!state.isDirty && state.hasCompiledData) {
      updateState({ isDirty: true });
    }
  },

  focusInspectionTarget: (targetId: string | null) => {
    updateState({ activeInspectTarget: targetId });
  },

  clearCompilation: () => {
    updateState({
      hasCompiledData: false,
      isDirty: false,
      compiledData: null,
      activeInspectTarget: null,
    });
  },

  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

/**
 * Hook reactivo para consumir y mutar el estado de la Capa Cognitiva HUD (Ghost Overlay)
 */
export function useCognitiveLayerStore(): CognitiveLayerState {
  const current = useSyncExternalStore(
    cognitiveLayerStore.subscribe,
    cognitiveLayerStore.getState,
    cognitiveLayerStore.getState
  );

  return {
    ...current,
    setCompiledData: cognitiveLayerStore.setCompiledData,
    toggleOverlay: cognitiveLayerStore.toggleOverlay,
    setOverlayVisibility: cognitiveLayerStore.setOverlayVisibility,
    toggleSubLayer: cognitiveLayerStore.toggleSubLayer,
    markAsDirty: cognitiveLayerStore.markAsDirty,
    focusInspectionTarget: cognitiveLayerStore.focusInspectionTarget,
    clearCompilation: cognitiveLayerStore.clearCompilation,
  };
}
