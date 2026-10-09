import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { NativeSyntheticEvent } from "react-native";
import {
  StrokeEndEvent,
  SelectionChangedEvent,
  PlacedAttribute,
  EntityBoundingBox,
} from "../../types/canvas";
import {
  VisualASTEngine,
  VisualASTLayer,
  RawInkStroke,
} from "@cognitive-canvas/core";
import { recognizeInkStrokes, initializeDigitalInk } from "../../components/JetpackInkCanvas";

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
  const [deleteSelectionTrigger, setDeleteSelectionTrigger] = useState<number>(0);
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

  const handleStrokeEnd = useCallback(
    (event: NativeSyntheticEvent<StrokeEndEvent>) => {
      const { strokeCount: count, canUndo: undoPossible, canRedo: redoPossible, strokes } = event.nativeEvent;
      setStrokeCount(count);
      if (undoPossible !== undefined) setCanUndo(undoPossible);
      else setCanUndo(count > 0);
      if (redoPossible !== undefined) setCanRedo(redoPossible);

      if (strokes) {
        strokesRef.current = strokes;
        markDirty();

        const bboxes = strokeBBoxesRef.current;
        for (const strk of strokes) {
          if (!bboxes.has(strk.id) && strk.points && strk.points.length > 0) {
            let sMinX = strk.points[0].x;
            let sMaxX = strk.points[0].x;
            let sMinY = strk.points[0].y;
            let sMaxY = strk.points[0].y;
            for (let i = 1; i < strk.points.length; i++) {
              const pt = strk.points[i];
              if (pt.x < sMinX) sMinX = pt.x;
              if (pt.x > sMaxX) sMaxX = pt.x;
              if (pt.y < sMinY) sMinY = pt.y;
              if (pt.y > sMaxY) sMaxY = pt.y;
            }
            bboxes.set(strk.id, { xmin: sMinX, ymin: sMinY, xmax: sMaxX, ymax: sMaxY });
          }
        }

        if (parseAstDebounceRef.current) {
          clearTimeout(parseAstDebounceRef.current);
        }

        parseAstDebounceRef.current = setTimeout(() => {
          setRawStrokes(strokes);
          try {
            const passiveMap: Record<string, string> = {};
            const currentAttrs = getPlacedAttributes ? getPlacedAttributes() : placedAttributes;
            currentAttrs.forEach((attr) => {
              passiveMap[attr.id] = `${attr.type}: ${attr.title} - ${attr.note}`;
            });

            const ast = visualASTEngine.parseVisualAST(strokes, passiveMap, canvasScale);
            setVisualAST(ast);
            console.log(`[VisualASTEngine] Live AST updated: ${ast.entities.length} entities, ${ast.connectors.length} connectors`);

            // Enriquecimiento asíncrono en segundo plano con ML Kit Digital Ink (Visual AST V2)
            if (ast.entities && ast.entities.length > 0) {
              const pendingTextEntities = ast.entities.filter(
                (e) => e.type === "TEXT_BLOCK" && !e.transcribed_text
              );
              if (pendingTextEntities.length > 0) {
                Promise.all(
                  pendingTextEntities.map(async (ent) => {
                    const entStrokes = strokes.filter((s) => ent.stroke_ids.includes(s.id));
                    if (entStrokes.length > 0) {
                      const res = await recognizeInkStrokes(entStrokes);
                      if (res.transcription && res.isTextBlock) {
                        ent.transcribed_text = res.transcription;
                        ent.ml_kit_payload = {
                          transcription: res.transcription,
                          confidence: res.confidence,
                          candidates: res.candidates,
                        };
                      }
                    }
                  })
                )
                  .then(() => {
                    setVisualAST({ ...ast });
                  })
                  .catch(() => null);
              }
            }
          } catch (err) {
            console.warn("[VisualASTEngine] Error parsing live strokes:", err);
          }
        }, 280);
      }
    },
    [visualASTEngine, placedAttributes, canvasScale, markDirty]
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
    const { hasSelection: isSelected, selectedCount: count } = event.nativeEvent;
    setHasSelection(isSelected);
    setSelectedCount(count);
  }, []);

  const handleDeleteSelection = useCallback(() => {
    setDeleteSelectionTrigger((prev) => prev + 1);
    setHasSelection(false);
    setSelectedCount(0);
    markDirty();
  }, [markDirty]);

  const handleClearSelection = useCallback(() => {
    setClearSelectionTrigger((prev) => prev + 1);
    setHasSelection(false);
    setSelectedCount(0);
  }, []);

  return {
    visualAST,
    setVisualAST,
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
    deleteSelectionTrigger,
    clearSelectionTrigger,
    handleStrokeEnd,
    handleUndo,
    handleRedo,
    handleClear,
    handleSelectionChanged,
    handleDeleteSelection,
    handleClearSelection,
  };
};
