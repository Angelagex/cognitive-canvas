import { useState, useCallback } from "react";
import { NativeSyntheticEvent } from "react-native";
import {
  BrushType,
  StrokeEndEvent,
  TransformEvent,
  BarrelButtonEvent,
  SelectionChangedEvent,
  PlacedAttribute,
  PassiveAttributeType,
  CanvasBackgroundType,
  EraserMode,
  HoverEvent,
  HoverTimeoutEvent,
} from "../types/canvas";
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

  // Selection state (Lasso)
  const [hasSelection, setHasSelection] = useState<boolean>(false);
  const [selectedCount, setSelectedCount] = useState<number>(0);
  const [deleteSelectionTrigger, setDeleteSelectionTrigger] = useState<number>(0);
  const [clearSelectionTrigger, setClearSelectionTrigger] = useState<number>(0);

  // Placed Cognitive Attributes (GRINDE / PACER metadata badges)
  const [placedAttributes, setPlacedAttributes] = useState<PlacedAttribute[]>([
    {
      id: "attr-1",
      type: "CAUSAL_MECHANISM",
      title: "Mecanismo Causal",
      note: "La retropropagación calcula derivadas parciales mediante la regla de la cadena",
      worldX: 350,
      worldY: 280,
    },
  ]);

  // History & Undo / Redo
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);
  const [strokeCount, setStrokeCount] = useState<number>(0);

  // Viewport & Zoom
  const [displayZoom, setDisplayZoom] = useState<number>(100);
  const [canvasScale, setCanvasScale] = useState<number>(1.0);
  const [canvasTranslateX, setCanvasTranslateX] = useState<number>(0.0);
  const [canvasTranslateY, setCanvasTranslateY] = useState<number>(0.0);

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
    const { scale, translateX, translateY } = event.nativeEvent;
    setCanvasScale(scale);
    setCanvasTranslateX(translateX);
    setCanvasTranslateY(translateY);
    setDisplayZoom(Math.round(scale * 100));
  }, []);

  const handleSelectionChanged = useCallback((event: NativeSyntheticEvent<SelectionChangedEvent>) => {
    const { hasSelection: isSelected, selectedCount: count } = event.nativeEvent;
    setHasSelection(isSelected);
    setSelectedCount(count);
  }, []);

  const handleDeleteSelection = useCallback(() => {
    setDeleteSelectionTrigger((prev) => prev + 1);
    setHasSelection(false);
    setSelectedCount(0);
  }, []);

  const handleClearSelection = useCallback(() => {
    setClearSelectionTrigger((prev) => prev + 1);
    setHasSelection(false);
    setSelectedCount(0);
  }, []);

  const handleAddAttribute = useCallback((type: PassiveAttributeType, title: string, note: string) => {
    const newAttr: PlacedAttribute = {
      id: `attr-${Date.now()}`,
      type,
      title,
      note,
      worldX: (-canvasTranslateX + 400) / canvasScale,
      worldY: (-canvasTranslateY + 300) / canvasScale,
    };
    setPlacedAttributes((prev) => [...prev, newAttr]);
  }, [canvasScale, canvasTranslateX, canvasTranslateY]);

  const handleDeleteAttribute = useCallback((id: string) => {
    setPlacedAttributes((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // S-Pen Air View / Hover State (Affordance a 1-2 cm)
  const [hoveredAttribute, setHoveredAttribute] = useState<PlacedAttribute | null>(null);
  const [hoverScreenX, setHoverScreenX] = useState<number>(0);
  const [hoverScreenY, setHoverScreenY] = useState<number>(0);

  const handleHover = useCallback((event: NativeSyntheticEvent<HoverEvent>) => {
    const { worldX, worldY, screenX, screenY, isHovering } = event.nativeEvent;
    console.log("[AirView JS] Hover:", { worldX, worldY, screenX, screenY, isHovering, attrCount: placedAttributes.length });

    if (!isHovering) {
      setHoveredAttribute(null);
      return;
    }
    // Check if hovering near or directly over any placed attribute using a uniform 14dp pill halo
    const match = placedAttributes.find((attr) => {
      const attrScreenX = attr.worldX * canvasScale + canvasTranslateX;
      const attrScreenY = attr.worldY * canvasScale + canvasTranslateY;
      const badgeScale = Math.min(1.2, Math.max(0.7, canvasScale));

      // Approximate badge dimensions matching PlacedAttributeBadges typography and padding
      const baseWidth = Math.max(120, attr.title.length * 8 + 36);
      const baseHeight = 34;

      const centerX = attrScreenX + baseWidth / 2;
      const centerY = attrScreenY + baseHeight / 2;
      const scaledWidth = baseWidth * badgeScale;
      const scaledHeight = baseHeight * badgeScale;

      const boxLeft = centerX - scaledWidth / 2;
      const boxRight = centerX + scaledWidth / 2;
      const boxTop = centerY - scaledHeight / 2;
      const boxBottom = centerY + scaledHeight / 2;

      // Distance from hover point (screenX, screenY) to the nearest edge of the badge
      const dx = Math.max(0, boxLeft - screenX, screenX - boxRight);
      const dy = Math.max(0, boxTop - screenY, screenY - boxBottom);
      const distToEdge = Math.sqrt(dx * dx + dy * dy);

      // Uniform 14dp halo conforming directly to the pill silhouette
      const HALO_MARGIN = 14;
      return distToEdge <= HALO_MARGIN;
    });
    if (match) {
      console.log("[AirView JS] >>> HOVER MATCH FOUND:", match.title);
      setHoveredAttribute(match);
      setHoverScreenX(screenX);
      setHoverScreenY(screenY);
    } else {
      setHoveredAttribute(null);
    }
  }, [placedAttributes, canvasScale, canvasTranslateX, canvasTranslateY]);

  const handleBadgeHover = useCallback((attr: PlacedAttribute | null, screenX?: number, screenY?: number) => {
    console.log("[AirView Badge JS] Direct badge hover:", attr?.title);
    setHoveredAttribute(attr);
    if (attr && screenX !== undefined && screenY !== undefined) {
      setHoverScreenX(screenX + 80);
      setHoverScreenY(screenY);
    }
  }, []);

  // Semantic Anchor Tooltip (Air View Hover Dwell 800ms / Barrel Button)
  const [anchorTooltip, setAnchorTooltip] = useState<{
    visible: boolean;
    screenX: number;
    screenY: number;
    worldX: number;
    worldY: number;
  } | null>(null);

  const handleHoverTimeout = useCallback(
    (event: NativeSyntheticEvent<HoverTimeoutEvent>) => {
      const { worldX, worldY, screenX, screenY, dwellDurationMs } = event.nativeEvent;
      console.log("[SemanticAnchor] Hover timeout dwell (800ms) triggered:", {
        worldX,
        worldY,
        screenX,
        screenY,
        dwellDurationMs,
      });
      setAnchorTooltip({
        visible: true,
        screenX,
        screenY,
        worldX,
        worldY,
      });
    },
    []
  );

  const handleBarrelButton = useCallback(
    (event: NativeSyntheticEvent<BarrelButtonEvent>) => {
      const { x, y, worldX, worldY } = event.nativeEvent;
      console.log("[SemanticAnchor] S-Pen Barrel button pressed:", { x, y, worldX, worldY });
      const screenX = x;
      const screenY = y;
      const calcWorldX = worldX !== undefined ? worldX : (screenX - canvasTranslateX) / canvasScale;
      const calcWorldY = worldY !== undefined ? worldY : (screenY - canvasTranslateY) / canvasScale;
      setAnchorTooltip({
        visible: true,
        screenX,
        screenY,
        worldX: calcWorldX,
        worldY: calcWorldY,
      });
    },
    [canvasScale, canvasTranslateX, canvasTranslateY]
  );

  const handleCloseAnchorTooltip = useCallback(() => {
    setAnchorTooltip(null);
  }, []);

  const handleSaveAnchorTooltip = useCallback(
    (type: PassiveAttributeType, title: string, note: string, worldX: number, worldY: number) => {
      const newAttr: PlacedAttribute = {
        id: `attr-${Date.now()}`,
        type,
        title,
        note,
        worldX,
        worldY,
      };
      setPlacedAttributes((prev) => [...prev, newAttr]);
      setAnchorTooltip(null);
    },
    []
  );

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
        map_metadata: {
          title: "Mapa Mental - Redes Neuronales",
          domain_theme: "Machine Learning / Deep Learning",
          total_nodes: 2,
          total_edges: 1,
        },
        nodes: [
          {
            id: "node_1",
            visual_bounding_box: { ymin: 100, xmin: 100, ymax: 200, xmax: 300 },
            detected_content: "Concepto Principal: Redes Neuronales",
            passive_context: null,
            pacer_classification: "CONCEPTUAL",
            deducible_from_context: true,
          },
          {
            id: "node_2",
            visual_bounding_box: { ymin: 300, xmin: 100, ymax: 400, xmax: 300 },
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
            relation_nature: "CAUSAL",
          },
        ],
        grinde_audit: {
          cross_link_density_score: 0.35,
          non_verbal_balance_score: 0.85,
          linear_thinking_risk: false,
          feedback_critique: "Excelente densidad de relaciones causales y cross-links no lineales.",
        },
        learning_engine_outputs: {
          anki_flashcards: [
            {
              source_node_id: "node_1",
              card_type: "CLOZE",
              front: "Backpropagation",
              back: "Calcula gradientes",
            },
          ],
          high_road_transfer_prompts: [
            {
              core_concept_ids: ["node_2"],
              unstructured_scenario: "Optimización de flujo en un sistema termodinámico cerrado.",
              guiding_question: "¿Cómo aplicarías la regla de la cadena de Backpropagation en la minimización de entropía?",
            },
          ],
          derring_effect_challenges: [
            {
              flawed_premise: "Aumentar la tasa de aprendizaje a 100 acelerará siempre la convergencia óptima.",
              corrective_task: "Explica cómo la divergencia de gradientes desestabiliza la superficie de pérdida.",
              canonical_solution: "Tasas excesivas provocan explosión de gradientes y oscilaciones fuera del mínimo local.",
            },
          ],
          contrasting_cases_icc: [
            {
              case_a: "Descenso de gradiente estocástico (SGD)",
              case_b: "Descenso de gradiente por lotes (Batch GD)",
              invariant_discovery_prompt: "Identifica el compromiso entre velocidad de convergencia y estabilidad en la superficie de pérdida.",
            },
          ],
        },
        anki_flashcards: [
          {
            source_node_id: "node_1",
            target_node_id: "node_2",
            card_type: "CLOZE",
            front: "Backpropagation",
            back: "Calcula gradientes",
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
  };
};
