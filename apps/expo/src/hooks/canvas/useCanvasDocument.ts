import { useState, useRef, useEffect, useCallback } from "react";
import { AppState } from "react-native";
import {
  saveDocument,
  loadDocument,
  deleteDocument,
  getLastActiveMapId,
  setLastActiveMapId,
  listDocuments,
  ExtendedCognitiveMapDocument,
  MapDocumentSummary,
  getUserPreferences,
} from "../../services/StorageService";
import {
  PlacedAttribute,
  EntityBoundingBox,
  PassiveAttributeType,
  SelectionBounds,
  ToolbarDockEdge,
  ThinkingMemo,
  SynthesisReferenceCard,
} from "../../types/canvas";
import { VisualASTLayer, RawInkStroke } from "@cognitive-canvas/core";
import { getCanvasStrokes } from "../../components/JetpackInkCanvas";

interface UseCanvasDocumentProps {
  canvasScale: number;
  canvasTranslateX: number;
  canvasTranslateY: number;
  setCanvasScale: (scale: number) => void;
  setCanvasTranslateX: (tx: number) => void;
  setCanvasTranslateY: (ty: number) => void;
  handleResetZoom?: () => void;
  strokesRef: React.MutableRefObject<RawInkStroke[]>;
  strokeBBoxesRef: React.MutableRefObject<Map<string, EntityBoundingBox>>;
  setRawStrokes: (strokes: RawInkStroke[]) => void;
  setStrokeCount: (count: number) => void;
  setCanUndo: (can: boolean) => void;
  setCanRedo: (can: boolean) => void;
  setLoadedStrokesJson: (json: string) => void;
  setLoadStrokesTrigger: React.Dispatch<React.SetStateAction<number>>;
  setClearTrigger: React.Dispatch<React.SetStateAction<number>>;
  visualAST: VisualASTLayer;
  setVisualAST: (ast: VisualASTLayer) => void;
  compilation: any;
  setCompilation: (comp: any) => void;
  setToolbarDockSide: (side: "left" | "right") => void;
  setToolbarDockEdge?: (edge: ToolbarDockEdge) => void;
}

export const useCanvasDocument = ({
  canvasScale,
  canvasTranslateX,
  canvasTranslateY,
  setCanvasScale,
  setCanvasTranslateX,
  setCanvasTranslateY,
  handleResetZoom,
  strokesRef,
  strokeBBoxesRef,
  setRawStrokes,
  setStrokeCount,
  setCanUndo,
  setCanRedo,
  setLoadedStrokesJson,
  setLoadStrokesTrigger,
  setClearTrigger,
  visualAST,
  setVisualAST,
  compilation,
  setCompilation,
  setToolbarDockSide,
  setToolbarDockEdge,
}: UseCanvasDocumentProps) => {
  const [currentMapId, setCurrentMapId] = useState<string>(() => `map_${Date.now()}`);
  const [mapTitle, setMapTitle] = useState<string>("Mapa Mental - Redes Neuronales");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [savedMaps, setSavedMaps] = useState<MapDocumentSummary[]>([]);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadDoneRef = useRef<boolean>(false);

  // Placed Cognitive Attributes
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
  const [synthesisCards, setSynthesisCards] = useState<SynthesisReferenceCard[]>([]);
  const [activeThinkingMemo, setActiveThinkingMemo] = useState<ThinkingMemo | null>(null);
  const placedAttributesRef = useRef<PlacedAttribute[]>(placedAttributes);
  placedAttributesRef.current = placedAttributes;
  const synthesisCardsRef = useRef<SynthesisReferenceCard[]>(synthesisCards);
  synthesisCardsRef.current = synthesisCards;

  // Dirty State Tracker
  const isDirtyRef = useRef<boolean>(false);
  const currentMapIdRef = useRef<string>(currentMapId);
  currentMapIdRef.current = currentMapId;
  const mapTitleRef = useRef<string>(mapTitle);
  mapTitleRef.current = mapTitle;
  const lastSavedAtRef = useRef<number | null>(lastSavedAt);
  lastSavedAtRef.current = lastSavedAt;
  const canvasScaleRef = useRef<number>(canvasScale);
  canvasScaleRef.current = canvasScale;
  const canvasTranslateXRef = useRef<number>(canvasTranslateX);
  canvasTranslateXRef.current = canvasTranslateX;
  const canvasTranslateYRef = useRef<number>(canvasTranslateY);
  canvasTranslateYRef.current = canvasTranslateY;
  const visualASTRef = useRef<VisualASTLayer>(visualAST);
  visualASTRef.current = visualAST;
  const compilationRef = useRef<any>(compilation);
  compilationRef.current = compilation;

  const saveCurrentMapSilently = useCallback(async () => {
    if (!isDirtyRef.current) return;
    try {
      setIsSaving(true);
      // Pull-based: get the exact latest strokes directly from native memory
      const latestStrokes = await getCanvasStrokes();
      if (latestStrokes && latestStrokes.length > 0) {
        strokesRef.current = latestStrokes;
      }
      const now = Date.now();
      const doc: ExtendedCognitiveMapDocument = {
        map_id: currentMapIdRef.current,
        version: "1.0.0",
        metadata: {
          title: mapTitleRef.current,
          created_at: lastSavedAtRef.current || now,
          updated_at: now,
          canvas_scale: canvasScaleRef.current,
          canvas_translate_x: canvasTranslateXRef.current,
          canvas_translate_y: canvasTranslateYRef.current,
          placed_attributes: placedAttributesRef.current,
          synthesis_cards: synthesisCardsRef.current,
        },
        raw_ink_layer: {
          strokes: strokesRef.current,
        },
        visual_ast_layer: visualASTRef.current,
        compiled_cognitive_layer: compilationRef.current,
      };

      await saveDocument(doc);
      isDirtyRef.current = false;
      setLastSavedAt(now);
      const list = await listDocuments();
      setSavedMaps(list);
    } catch (err) {
      console.error("[useCanvasDocument] Silent save error:", err);
    } finally {
      setIsSaving(false);
    }
  }, [strokesRef]);

  const markDirty = useCallback(() => {
    isDirtyRef.current = true;
    if (!isInitialLoadDoneRef.current) return;
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    // 5000ms idle debounce: while actively handwriting, this resets on every stroke.
    // Zero lag and zero "Guardando..." interruptions while writing!
    autoSaveTimerRef.current = setTimeout(() => {
      saveCurrentMapSilently();
    }, 5000);
  }, [saveCurrentMapSilently]);

  // Persist silently when user switches apps or puts tablet to sleep
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "background" || nextState === "inactive") {
        if (isDirtyRef.current) {
          saveCurrentMapSilently();
        }
      }
    });
    return () => {
      subscription.remove();
    };
  }, [saveCurrentMapSilently]);

  const handleTitleChange = useCallback(
    (newTitle: string) => {
      setMapTitle(newTitle);
      markDirty();
    },
    [markDirty]
  );

  const handleAddAttribute = useCallback(
    (type: PassiveAttributeType, title: string, note: string) => {
      const newAttr: PlacedAttribute = {
        id: `attr-${Date.now()}`,
        type,
        title,
        note,
        worldX: (-canvasTranslateX + 400) / canvasScale,
        worldY: (-canvasTranslateY + 300) / canvasScale,
      };
      setPlacedAttributes((prev) => [...prev, newAttr]);
      markDirty();
    },
    [canvasScale, canvasTranslateX, canvasTranslateY, markDirty]
  );

  const handleDeleteAttribute = useCallback(
    (id: string) => {
      setPlacedAttributes((prev) => prev.filter((a) => a.id !== id));
      markDirty();
    },
    [markDirty]
  );

  const handleTransformAttributes = useCallback(
    (dx: number, dy: number, bounds?: SelectionBounds | null) => {
      setPlacedAttributes((prev) =>
        prev.map((attr) => {
          if (bounds) {
            const pad = 35;
            const isInside =
              attr.worldX >= bounds.minX - pad &&
              attr.worldX <= bounds.maxX + pad &&
              attr.worldY >= bounds.minY - pad &&
              attr.worldY <= bounds.maxY + pad;
            if (!isInside) return attr;
          }
          return {
            ...attr,
            worldX: attr.worldX + dx,
            worldY: attr.worldY + dy,
            entityBounds: attr.entityBounds
              ? {
                  xmin: attr.entityBounds.xmin + dx,
                  xmax: attr.entityBounds.xmax + dx,
                  ymin: attr.entityBounds.ymin + dy,
                  ymax: attr.entityBounds.ymax + dy,
                }
              : undefined,
          };
        })
      );
      markDirty();
    },
    [markDirty]
  );

  const handleAssignAttributeToSelection = useCallback(
    (type: PassiveAttributeType, bounds: SelectionBounds, title?: string, note?: string) => {
      const defaultTitle =
        type === "CAUSAL_MECHANISM"
          ? "Mecanismo Causal"
          : type === "ANALOGY"
          ? "Analogía Cognitiva"
          : "Evidencia Empírica";

      const newAttr: PlacedAttribute = {
        id: `attr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type,
        title: title || defaultTitle,
        note: note || "",
        worldX: bounds.centerX,
        worldY: bounds.centerY,
        entityBounds: {
          xmin: bounds.minX,
          ymin: bounds.minY,
          xmax: bounds.maxX,
          ymax: bounds.maxY,
        },
      };

      setPlacedAttributes((prev) => [...prev, newAttr]);
      markDirty();
      return newAttr;
    },
    [markDirty]
  );

  const handleSaveThinkingMemo = useCallback(
    (memo: ThinkingMemo, bounds: SelectionBounds) => {
      setActiveThinkingMemo(memo);
      setPlacedAttributes((prev) => {
        const existingIdx = prev.findIndex(
          (a) =>
            Math.hypot(a.worldX - bounds.centerX, a.worldY - bounds.centerY) < 90
        );
        if (existingIdx !== -1) {
          const next = [...prev];
          next[existingIdx] = {
            ...next[existingIdx],
            note: memo.transcript,
            thinkingMemo: memo,
          };
          return next;
        }
        return [
          ...prev,
          {
            id: `attr_memo_${Date.now()}`,
            type: "CAUSAL_MECHANISM",
            title: "Thinking Memo",
            note: memo.transcript,
            worldX: bounds.centerX,
            worldY: bounds.centerY,
            entityBounds: {
              xmin: bounds.minX,
              ymin: bounds.minY,
              xmax: bounds.maxX,
              ymax: bounds.maxY,
            },
            thinkingMemo: memo,
          },
        ];
      });
      markDirty();
    },
    [markDirty]
  );

  // Restore last active .cmn map document on startup
  useEffect(() => {
    let isMounted = true;
    const restoreLastActiveMap = async () => {
      try {
        let lastId = await getLastActiveMapId();
        const list = await listDocuments();
        if (!lastId && list.length > 0) {
          lastId = list[0].map_id;
        }
        if (lastId && isMounted) {
          const doc = await loadDocument(lastId);
          if (doc && isMounted) {
            setCurrentMapId(doc.map_id);
            if (doc.metadata?.title) setMapTitle(doc.metadata.title);
            if (doc.metadata?.canvas_scale !== undefined) setCanvasScale(doc.metadata.canvas_scale);
            if (doc.metadata?.canvas_translate_x !== undefined) setCanvasTranslateX(doc.metadata.canvas_translate_x);
            if (doc.metadata?.canvas_translate_y !== undefined) setCanvasTranslateY(doc.metadata.canvas_translate_y);
            if (doc.metadata?.placed_attributes) setPlacedAttributes(doc.metadata.placed_attributes);
            if (doc.visual_ast_layer) setVisualAST(doc.visual_ast_layer);
            const strokes = doc.raw_ink_layer?.strokes || [];
            strokesRef.current = strokes;
            setRawStrokes(strokes);
            setStrokeCount(strokes.length);
            setCanUndo(strokes.length > 0);
            setCanRedo(false);
            setLoadedStrokesJson(JSON.stringify(strokes));
            setLoadStrokesTrigger((prev) => prev + 1);

            if (doc.compiled_cognitive_layer) {
              setCompilation(doc.compiled_cognitive_layer);
            }
            setLastSavedAt(doc.metadata.updated_at);
            isDirtyRef.current = false;
            console.log(`[useCanvasDocument] Restored .cmn document: ${doc.metadata.title} (${strokes.length} strokes)`);
          }
        }
        if (isMounted) setSavedMaps(list);

        const prefs = await getUserPreferences();
        if (isMounted) {
          if (prefs?.toolbar_dock_edge) {
            setToolbarDockEdge?.(prefs.toolbar_dock_edge);
            setToolbarDockSide(prefs.toolbar_dock_edge === "right" ? "right" : "left");
          } else if (prefs?.toolbar_dock_side) {
            setToolbarDockSide(prefs.toolbar_dock_side);
            setToolbarDockEdge?.(prefs.toolbar_dock_side);
          }
        }
      } catch (e) {
        console.warn("[useCanvasDocument] Could not restore previous document:", e);
      } finally {
        isInitialLoadDoneRef.current = true;
      }
    };

    restoreLastActiveMap();

    return () => {
      isMounted = false;
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, []);

  const handleSaveMap = useCallback(async () => {
    try {
      setIsSaving(true);
      const latestStrokes = await getCanvasStrokes();
      if (latestStrokes && latestStrokes.length > 0) {
        strokesRef.current = latestStrokes;
      }
      const now = Date.now();
      const doc: ExtendedCognitiveMapDocument = {
        map_id: currentMapId,
        version: "1.0.0",
        metadata: {
          title: mapTitle,
          created_at: lastSavedAt || now,
          updated_at: now,
          canvas_scale: canvasScale,
          canvas_translate_x: canvasTranslateX,
          canvas_translate_y: canvasTranslateY,
          placed_attributes: placedAttributes,
        },
        raw_ink_layer: {
          strokes: strokesRef.current,
        },
        visual_ast_layer: visualAST,
        compiled_cognitive_layer: compilation,
      };

      await saveDocument(doc);
      isDirtyRef.current = false;
      setLastSavedAt(now);
      const list = await listDocuments();
      setSavedMaps(list);
    } catch (e) {
      console.error("[useCanvasDocument] Manual save error:", e);
    } finally {
      setIsSaving(false);
    }
  }, [
    currentMapId,
    mapTitle,
    lastSavedAt,
    canvasScale,
    canvasTranslateX,
    canvasTranslateY,
    placedAttributes,
    visualAST,
    compilation,
  ]);

  const handleLoadMap = useCallback(
    async (mapId: string) => {
      try {
        if (isDirtyRef.current && currentMapId) {
          if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current);
          }
          const now = Date.now();
          const currentDoc: ExtendedCognitiveMapDocument = {
            map_id: currentMapId,
            version: "1.0.0",
            metadata: {
              title: mapTitle,
              created_at: lastSavedAt || now,
              updated_at: now,
              canvas_scale: canvasScale,
              canvas_translate_x: canvasTranslateX,
              canvas_translate_y: canvasTranslateY,
              placed_attributes: placedAttributes,
            },
            raw_ink_layer: {
              strokes: strokesRef.current,
            },
            visual_ast_layer: visualAST,
            compiled_cognitive_layer: compilation,
          };
          await saveDocument(currentDoc);
          isDirtyRef.current = false;
        }

        const doc = await loadDocument(mapId);
        if (doc) {
          setCurrentMapId(doc.map_id);
          await setLastActiveMapId(doc.map_id);
          if (doc.metadata?.title) setMapTitle(doc.metadata.title);
          if (doc.metadata?.canvas_scale !== undefined) setCanvasScale(doc.metadata.canvas_scale);
          if (doc.metadata?.canvas_translate_x !== undefined) setCanvasTranslateX(doc.metadata.canvas_translate_x);
          if (doc.metadata?.canvas_translate_y !== undefined) setCanvasTranslateY(doc.metadata.canvas_translate_y);
          if (doc.metadata?.placed_attributes) setPlacedAttributes(doc.metadata.placed_attributes);
          setSynthesisCards(doc.metadata?.synthesis_cards || []);
          setActiveThinkingMemo(null);
          if (doc.visual_ast_layer) setVisualAST(doc.visual_ast_layer);

          const strokes = doc.raw_ink_layer?.strokes || [];
          strokesRef.current = strokes;
          strokeBBoxesRef.current.clear();
          setRawStrokes(strokes);
          setStrokeCount(strokes.length);
          setCanUndo(strokes.length > 0);
          setCanRedo(false);
          setLoadedStrokesJson(JSON.stringify(strokes));
          setLoadStrokesTrigger((prev) => prev + 1);

          if (doc.compiled_cognitive_layer) {
            setCompilation(doc.compiled_cognitive_layer);
          } else {
            setCompilation(null);
          }
          setLastSavedAt(doc.metadata.updated_at);
          isDirtyRef.current = false;
          console.log(`[useCanvasDocument] Switched to .cmn map: ${doc.metadata.title} (${strokes.length} strokes)`);
        }
      } catch (e) {
        console.error("[useCanvasDocument] Load map error:", e);
      }
    },
    [
      currentMapId,
      mapTitle,
      lastSavedAt,
      canvasScale,
      canvasTranslateX,
      canvasTranslateY,
      placedAttributes,
      visualAST,
      compilation,
    ]
  );

  const handleNewMap = useCallback(async () => {
    if (isDirtyRef.current && currentMapId) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      const now = Date.now();
      const currentDoc: ExtendedCognitiveMapDocument = {
        map_id: currentMapId,
        version: "1.0.0",
        metadata: {
          title: mapTitle,
          created_at: lastSavedAt || now,
          updated_at: now,
          canvas_scale: canvasScale,
          canvas_translate_x: canvasTranslateX,
          canvas_translate_y: canvasTranslateY,
          placed_attributes: placedAttributes,
        },
        raw_ink_layer: {
          strokes: strokesRef.current,
        },
        visual_ast_layer: visualAST,
        compiled_cognitive_layer: compilation,
      };
      await saveDocument(currentDoc);
      isDirtyRef.current = false;
    }

    setClearTrigger((prev) => prev + 1);
    setLoadedStrokesJson("[]");
    setLoadStrokesTrigger((prev) => prev + 1);
    setPlacedAttributes([]);
    setVisualAST({ entities: [], connectors: [] });
    setCompilation(null);
    strokesRef.current = [];
    strokeBBoxesRef.current.clear();
    setRawStrokes([]);
    setStrokeCount(0);
    setCanUndo(false);
    setCanRedo(false);

    // Restablecer zoom al 100% y desplazamiento a origen
    setCanvasScale(1.0);
    setCanvasTranslateX(0.0);
    setCanvasTranslateY(0.0);
    handleResetZoom?.();

    const newId = `map_${Date.now()}`;
    setCurrentMapId(newId);
    await setLastActiveMapId(newId);
    setMapTitle("Nuevo Mapa Mental");
    setLastSavedAt(null);
    isDirtyRef.current = false;
  }, [
    currentMapId,
    mapTitle,
    lastSavedAt,
    canvasScale,
    canvasTranslateX,
    canvasTranslateY,
    placedAttributes,
    visualAST,
    compilation,
    handleResetZoom,
    setCanvasScale,
    setCanvasTranslateX,
    setCanvasTranslateY,
    setClearTrigger,
    setLoadedStrokesJson,
    setLoadStrokesTrigger,
    setPlacedAttributes,
    setVisualAST,
    setCompilation,
    strokesRef,
    strokeBBoxesRef,
    setRawStrokes,
    setStrokeCount,
    setCanUndo,
    setCanRedo,
    setCurrentMapId,
    setMapTitle,
    setLastSavedAt,
  ]);

  const handleDeleteMap = useCallback(
    async (mapId: string) => {
      try {
        await deleteDocument(mapId);
        const list = await listDocuments();
        setSavedMaps(list);
        if (mapId === currentMapId) {
          handleNewMap();
        }
      } catch (e) {
        console.error("[useCanvasDocument] Delete map error:", e);
      }
    },
    [currentMapId, handleNewMap]
  );

  return {
    currentMapId,
    mapTitle,
    setMapTitle,
    handleTitleChange,
    isSaving,
    lastSavedAt,
    savedMaps,
    handleSaveMap,
    handleLoadMap,
    handleNewMap,
    handleDeleteMap,
    placedAttributes,
    setPlacedAttributes,
    synthesisCards,
    activeThinkingMemo,
    handleSaveThinkingMemo,
    handleAddAttribute,
    handleDeleteAttribute,
    handleTransformAttributes,
    handleAssignAttributeToSelection,
    markDirty,
    isDirtyRef,
    placedAttributesRef,
  };
};
