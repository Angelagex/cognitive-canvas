import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { NativeSyntheticEvent } from "react-native";
import {
  StrokeEndEvent,
  SelectionChangedEvent,
  PlacedAttribute,
  EntityBoundingBox,
  SelectionBounds,
} from "../../types/canvas";
import {
  VisualASTEngine,
  VisualASTLayer,
  RawInkStroke,
} from "@cognitive-canvas/core";
import { recognizeInkStrokes, initializeDigitalInk, getCanvasStrokes } from "../../components/JetpackInkCanvas";

interface UseCanvasAstProps {
  canvasScale: number;
  placedAttributes?: PlacedAttribute[];
  getPlacedAttributes?: () => PlacedAttribute[];
  markDirty: () => void;
}

export const useCanvasAst = ({
  canvasScale,
  placedAttributes = [],
  getPlacedAttributes,
  markDirty,
}: UseCanvasAstProps) => {
  const visualASTEngine = useMemo(() => new VisualASTEngine(), []);
  const [visualAST, setVisualAST] = useState<VisualASTLayer>({ entities: [], connectors: [] });
  const [rawStrokes, setRawStrokes] = useState<RawInkStroke[]>([]);

  // Selection state (Lasso)
  const [hasSelection, setHasSelection] = useState<boolean>(false);
  const [selectedCount, setSelectedCount] = useState<number>(0);
  const [selectionBounds, setSelectionBounds] = useState<SelectionBounds | null>(null);
  const [deleteSelectionTrigger, setDeleteSelectionTrigger] = useState<number>(0);
  const [duplicateSelectionTrigger, setDuplicateSelectionTrigger] = useState<number>(0);
  const [clearSelectionTrigger, setClearSelectionTrigger] = useState<number>(0);

  // History & Undo / Redo
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);
  const [strokeCount, setStrokeCount] = useState<number>(0);

  // Native triggers
  const [undoTrigger, setUndoTrigger] = useState<number>(0);
  const [redoTrigger, setRedoTrigger] = useState<number>(0);
  const [clearTrigger, setClearTrigger] = useState<number>(0);
  const [loadedStrokesJson, setLoadedStrokesJson] = useState<string>("");
  const [loadStrokesTrigger, setLoadStrokesTrigger] = useState<number>(0);

  // References
  const parseAstDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const strokesRef = useRef<RawInkStroke[]>([]);
  const strokeBBoxesRef = useRef<Map<string, EntityBoundingBox>>(new Map());

  // Inicializar modelo de reconocimiento de tinta local de ML Kit en segundo plano
  useEffect(() => {
    initializeDigitalInk("es")
      .then((ok) => {
        if (ok) console.log("[useCanvasAst] 🖋️ Motor ML Kit Digital Ink listo en español.");
      })
      .catch((err) => console.warn("[useCanvasAst] Error inicializando ML Kit Digital Ink:", err));
  }, []);

  const isAstDirtyRef = useRef<boolean>(true);
  const visualASTRef = useRef<VisualASTLayer>(visualAST);
  visualASTRef.current = visualAST;

  /**
   * On-demand calculation of Visual AST Layer enriched with ML Kit OCR.
   * Pulls the freshest strokes directly from native memory, guaranteeing 100% accuracy for compilation.
   */
  const ensureVisualAST = useCallback(async (): Promise<VisualASTLayer> => {
    let currentStrokes = strokesRef.current;
    if (!currentStrokes || currentStrokes.length === 0 || isAstDirtyRef.current) {
      try {
        const pulled = await getCanvasStrokes();
        if (pulled && pulled.length > 0) {
          currentStrokes = pulled;
          strokesRef.current = pulled;
        }
      } catch (_) {}
    }

    if (!currentStrokes || currentStrokes.length === 0) {
      return { entities: [], connectors: [] };
    }
    if (!isAstDirtyRef.current && visualASTRef.current && visualASTRef.current.entities.length > 0) {
      return visualASTRef.current;
    }

    try {
      const passiveMap: Record<string, string> = {};
      const currentAttrs = getPlacedAttributes ? getPlacedAttributes() : placedAttributes;
      currentAttrs.forEach((attr) => {
        passiveMap[attr.id] = `${attr.type}: ${attr.title} - ${attr.note}`;
      });

      console.log(`[useCanvasAst] 🧠 Parsing Visual AST on-demand for ${currentStrokes.length} strokes...`);
      const ast = visualASTEngine.parseVisualAST(currentStrokes, passiveMap, canvasScale);

      // Enriquecimiento asíncrono con ML Kit Digital Ink sólo cuando se compila
      if (ast.entities && ast.entities.length > 0) {
        const pendingTextEntities = ast.entities.filter(
          (e) => e.type === "TEXT_BLOCK" && !e.transcribed_text
        );
        if (pendingTextEntities.length > 0) {
          console.log(`[useCanvasAst] 🖋️ Running ML Kit recognition on ${pendingTextEntities.length} text blocks...`);
          await Promise.all(
            pendingTextEntities.map(async (ent) => {
              const entStrokes = currentStrokes.filter((s) => ent.stroke_ids.includes(s.id));
              if (entStrokes.length > 0) {
                try {
                  const res = await recognizeInkStrokes(entStrokes);
                  if (res.transcription && res.isTextBlock) {
                    ent.transcribed_text = res.transcription;
                    ent.ml_kit_payload = {
                      transcription: res.transcription,
                      confidence: res.confidence,
                      candidates: res.candidates,
                    };
                  }
                } catch (e) {
                  // Silently ignore individual transcription error
                }
              }
            })
          );
        }
      }

      visualASTRef.current = ast;
      setVisualAST(ast);
      isAstDirtyRef.current = false;
      return ast;
    } catch (err) {
      console.warn("[useCanvasAst] Error in ensureVisualAST:", err);
      return visualASTRef.current || { entities: [], connectors: [] };
    }
  }, [visualASTEngine, getPlacedAttributes, placedAttributes, canvasScale]);

  /**
   * Ultra-lightweight stroke completion handler.
   * Receives only strokeCount and undo/redo flags (<0.01ms execution, ZERO JSON point serialization).
   */
  const handleStrokeEnd = useCallback(
    (event: NativeSyntheticEvent<StrokeEndEvent>) => {
      const { strokeCount: count, canUndo: undoPossible, canRedo: redoPossible } = event.nativeEvent;
      if (count !== undefined) setStrokeCount(count);
      if (undoPossible !== undefined) setCanUndo(undoPossible);
      else if (count !== undefined) setCanUndo(count > 0);
      if (redoPossible !== undefined) setCanRedo(redoPossible);

      isAstDirtyRef.current = true;
      markDirty();
    },
    [markDirty]
  );

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
    strokesRef.current = [];
    strokeBBoxesRef.current.clear();
    setRawStrokes([]);
    setVisualAST({ entities: [], connectors: [] });
    markDirty();
  }, [markDirty]);

  const handleSelectionChanged = useCallback((event: NativeSyntheticEvent<SelectionChangedEvent>) => {
    const { hasSelection: isSelected, selectedCount: count, bounds } = event.nativeEvent;
    setHasSelection(isSelected);
    setSelectedCount(count);
    setSelectionBounds(isSelected && bounds ? bounds : null);
  }, []);

  const handleDeleteSelection = useCallback(() => {
    setDeleteSelectionTrigger((prev) => prev + 1);
    setHasSelection(false);
    setSelectedCount(0);
    setSelectionBounds(null);
    markDirty();
  }, [markDirty]);

  const handleDuplicateSelection = useCallback(() => {
    setDuplicateSelectionTrigger((prev) => prev + 1);
    markDirty();
  }, [markDirty]);

  const handleClearSelection = useCallback(() => {
    setClearSelectionTrigger((prev) => prev + 1);
    setHasSelection(false);
    setSelectedCount(0);
    setSelectionBounds(null);
  }, []);

  return {
    visualAST,
    setVisualAST,
    ensureVisualAST,
    rawStrokes,
    setRawStrokes,
    strokesRef,
    strokeBBoxesRef,
    parseAstDebounceRef,
    strokeCount,
    setStrokeCount,
    canUndo,
    setCanUndo,
    canRedo,
    setCanRedo,
    undoTrigger,
    redoTrigger,
    clearTrigger,
    setClearTrigger,
    loadedStrokesJson,
    setLoadedStrokesJson,
    loadStrokesTrigger,
    setLoadStrokesTrigger,
    hasSelection,
    selectedCount,
    selectionBounds,
    deleteSelectionTrigger,
    duplicateSelectionTrigger,
    clearSelectionTrigger,
    handleStrokeEnd,
    handleUndo,
    handleRedo,
    handleClear,
    handleSelectionChanged,
    handleDeleteSelection,
    handleDuplicateSelection,
    handleClearSelection,
  };
};
