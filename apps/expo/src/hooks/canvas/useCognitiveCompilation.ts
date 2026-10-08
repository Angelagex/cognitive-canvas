import { useState, useCallback } from "react";
import { CognitiveCompilerOutput, VisualAST, PacerClassification } from "@cognitive-canvas/core/types";
import { PlacedAttribute } from "../../types/canvas";
import { compileCognitiveMap } from "../../services/CompilationService";

export interface UseCognitiveCompilationProps {
  getVisualAST?: () => VisualAST | null;
  getMapTitle?: () => string;
  getCurrentMapId?: () => string;
  getPlacedAttributes?: () => PlacedAttribute[];
  onCompilationComplete?: (output: CognitiveCompilerOutput) => void;
}

export const useCognitiveCompilation = (props?: UseCognitiveCompilationProps) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [compilation, setCompilation] = useState<CognitiveCompilerOutput | null>(null);
  const [pacerFilter, setPacerFilter] = useState<PacerClassification | "ALL">("ALL");
  const [showPacerOverlay, setShowPacerOverlay] = useState<boolean>(true);

  const handleTogglePacerOverlay = useCallback(() => {
    setShowPacerOverlay((prev) => !prev);
  }, []);

  const handleCompile = useCallback(async () => {
    setIsCompiling(true);
    try {
      const visualAST = props?.getVisualAST ? props.getVisualAST() : null;
      const title = props?.getMapTitle ? props.getMapTitle() : "Mapa Mental";
      const canvasId = props?.getCurrentMapId ? props.getCurrentMapId() : "canvas_default";
      const placedAttributes = props?.getPlacedAttributes ? props.getPlacedAttributes() : [];

      console.log(`[useCognitiveCompilation] 🧠 Starting cognitive compilation for: "${title}" (${canvasId})`);

      const output = await compileCognitiveMap({
        canvasId,
        title,
        visualAST,
        placedAttributes,
      });

      setCompilation(output);
      setShowPacerOverlay(true);
      props?.onCompilationComplete?.(output);
      setIsDrawerOpen(true);
    } catch (err) {
      console.error("[useCognitiveCompilation] Compilation error:", err);
    } finally {
      setIsCompiling(false);
    }
  }, [props]);

  return {
    isDrawerOpen,
    setIsDrawerOpen,
    isCompiling,
    setIsCompiling,
    compilation,
    setCompilation,
    handleCompile,
    pacerFilter,
    setPacerFilter,
    showPacerOverlay,
    setShowPacerOverlay,
    handleTogglePacerOverlay,
  };
};
