import { useState, useCallback } from "react";
import { NativeSyntheticEvent } from "react-native";
import { BrushType, StrokeEndEvent, TransformEvent, BarrelButtonEvent, CanvasBackgroundType, EraserMode } from "../types/canvas";
import { CognitiveCompilerOutput } from "@cognitive-canvas/core/types";

export const useCanvasState = () => {
  // Document metadata
  const [mapTitle, setMapTitle] = useState<string>("Mapa Mental - Redes Neuronales");

  // Tools & Styling
  const [activeBrush, setActiveBrush] = useState<BrushType>("pen");
  const [activeColor, setActiveColor] = useState<string>("#38BDF8");
  const [activeWidth, setActiveWidth] = useState<number>(18);
  const [eraserMode, setEraserMode] = useState<EraserMode>("stroke");
  const [backgroundType, setBackgroundType] = useState<CanvasBackgroundType>("dot_grid");
  const [favoriteColors, setFavoriteColors] = useState<string[]>([
    "#38BDF8", // Electric Blue
    "#F43F5E", // Rose Carmine
    "#10B981", // Emerald Green
  ]);
  const [stylusOnly, setStylusOnly] = useState<boolean>(true); // S-Pen palm rejection by default

  const updateFavoriteColor = useCallback((index: number, newColor: string) => {
    setFavoriteColors((prev) => {
      const next = [...prev];
      if (index >= 0 && index < next.length) {
        next[index] = newColor;
      }
      return next;
    });
    setActiveColor(newColor);
  }, []);

  // History & Undo / Redo
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);
  const [strokeCount, setStrokeCount] = useState<number>(0);

  // Viewport & Zoom
  const [displayZoom, setDisplayZoom] = useState<number>(100);

  // Native Triggers (one-way command pulses, zero bridge ping-pong)
  const [zoomInTrigger, setZoomInTrigger] = useState<number>(0);
  const [zoomOutTrigger, setZoomOutTrigger] = useState<number>(0);
  const [resetZoomTrigger, setResetZoomTrigger] = useState<number>(0);
  const [undoTrigger, setUndoTrigger] = useState<number>(0);
  const [redoTrigger, setRedoTrigger] = useState<number>(0);
  const [clearTrigger, setClearTrigger] = useState<number>(0);

  // Compilation & Drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [compilation, setCompilation] = useState<CognitiveCompilerOutput | null>(null);

  // Event Callbacks
  const handleStrokeEnd = useCallback((event: NativeSyntheticEvent<StrokeEndEvent>) => {
    const { strokeCount: count, canUndo: undoPossible, canRedo: redoPossible } = event.nativeEvent;
    setStrokeCount(count);
    if (undoPossible !== undefined) setCanUndo(undoPossible);
    else setCanUndo(count > 0);
    if (redoPossible !== undefined) setCanRedo(redoPossible);
  }, []);

  const handleTransform = useCallback((event: NativeSyntheticEvent<TransformEvent>) => {
    const { scale } = event.nativeEvent;
    setDisplayZoom(Math.round(scale * 100));
  }, []);

  const handleBarrelButton = useCallback((event: NativeSyntheticEvent<BarrelButtonEvent>) => {
    // S-Pen hardware barrel button pressed
    console.log("S-Pen Barrel Button pressed at:", event.nativeEvent.x, event.nativeEvent.y);
  }, []);

  // Action Triggers
  const handleUndo = useCallback(() => {
    setUndoTrigger((prev) => prev + 1);
  }, []);

  const handleRedo = useCallback(() => {
    setRedoTrigger((prev) => prev + 1);
  }, []);

  const handleClear = useCallback(() => {
    setClearTrigger((prev) => prev + 1);
    setStrokeCount(0);
    setCanUndo(false);
    setCanRedo(false);
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoomInTrigger((prev) => prev + 1);
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomOutTrigger((prev) => prev + 1);
  }, []);

  const handleResetZoom = useCallback(() => {
    setResetZoomTrigger((prev) => prev + 1);
    setDisplayZoom(100);
  }, []);

  const handleToggleStylusOnly = useCallback(() => {
    setStylusOnly((prev) => !prev);
  }, []);

  const handleCompile = useCallback(() => {
    setIsCompiling(true);
    // Mock compilation grounding with Justin Sung GRINDE + PACER
    setTimeout(() => {
      setCompilation({
        nodes: [
          {
            id: "node_1",
            visual_bounding_box: [100, 100, 200, 300],
            detected_content: "Concepto Principal: Redes Neuronales",
            passive_context: null,
            pacer_classification: "CONCEPTUAL",
            deducible_from_context: true,
          },
          {
            id: "node_2",
            visual_bounding_box: [300, 100, 400, 300],
            detected_content: "Backpropagation algorithm v1.0",
            passive_context: "Fórmula de derivación en cadena",
            pacer_classification: "EVIDENCE",
            deducible_from_context: false,
          },
        ],
        edges: [
          {
            source_node_id: "node_1",
            target_node_id: "node_2",
            label: "calcula gradientes en",
            is_cross_link: true,
            relation_nature: "causal",
          },
        ],
        grinde_audit: {
          cross_link_density_score: 0.35,
          linear_thinking_risk: false,
          feedback_critique: "Excelente densidad de relaciones causales y cross-links no lineales.",
        },
        anki_flashcards: [
          {
            target_node_id: "node_2",
            card_type: "CLOZE",
            cloze_text: "Backpropagation calcula el {{c1::gradiente de la función de pérdida}} mediante la regla de la cadena.",
          },
        ],
        high_road_transfer_prompts: [
          "¿Cómo aplicarías la regla de la cadena de Backpropagation en la optimización de un sistema termodinámico?",
        ],
        derring_effect_challenges: [
          "Desafío: ¿Qué ocurre si la tasa de aprendizaje se establece en 100?",
        ],
        contrasting_cases_icc: [
          {
            case_a: "Descenso de gradiente estocástico (SGD)",
            case_b: "Descenso de gradiente por lotes (Batch GD)",
            underlying_invariant_prompt: "Identifica el compromiso entre velocidad de convergencia y estabilidad en la superficie de pérdida.",
          },
        ],
      });
      setIsCompiling(false);
      setIsDrawerOpen(true);
    }, 600);
  }, []);

  return {
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
    setFavoriteColors,
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
  };
};
