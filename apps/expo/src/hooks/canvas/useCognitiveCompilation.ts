import { useState, useCallback, useRef, useEffect } from "react";
import { Alert } from "react-native";
import { CognitiveCompilerOutput, VisualAST, PacerClassification, RawInkStroke } from "@cognitive-canvas/core/types";
import { PlacedAttribute } from "../../types/canvas";
import { compileCanvas } from "../../services/CompilationService";
import { saveCompiledGraph } from "../../services/CompiledGraphStorage";
import { loadDocument, saveDocument, getCompilationForCanvas } from "../../services/StorageService";
import { getCanvasStrokes } from "../../components/JetpackInkCanvas";
import { cognitiveLayerStore } from "../../stores/useCognitiveLayerStore";
import { WalkthroughAudioService } from "../../services/WalkthroughAudioService";
import { TranscriptionService } from "../../services/TranscriptionService";
import { WalkthroughConfirmParams } from "../../components/modals/VerbalWalkthroughModal";
import { mapVisionResponseToOutput } from "./compilationMapper";

export interface UseCognitiveCompilationProps {
  getVisualAST?: () => VisualAST | null | Promise<VisualAST | null>;
  getStrokes?: () => RawInkStroke[];
  getMapTitle?: () => string;
  getCurrentMapId?: () => string;
  getPlacedAttributes?: () => PlacedAttribute[];
  onCompilationComplete?: (output: CognitiveCompilerOutput) => void;
}

export interface ExecuteCompilationParams {
  verbalWalkthroughTranscript?: string | null;
  isIncremental?: boolean;
}

export const useCognitiveCompilation = (props?: UseCognitiveCompilationProps) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const isCompilingRef = useRef<boolean>(false);
  const isStoppingRef = useRef<boolean>(false);
  const [compilation, setCompilation] = useState<CognitiveCompilerOutput | null>(null);
  const [pacerFilter, setPacerFilter] = useState<PacerClassification | "ALL">("ALL");
  const [showPacerOverlay, setShowPacerOverlay] = useState<boolean>(true);
  const [showWalkthroughModal, setShowWalkthroughModal] = useState<boolean>(false);
  const [walkthroughModalTranscript, setWalkthroughModalTranscript] = useState<string>("");
  const [walkthroughModalPhase, setWalkthroughModalPhase] = useState<"idle" | "recording" | "transcribing" | "review">("idle");

  const [isRecordingWalkthrough, setIsRecordingWalkthrough] = useState(false);
  const [walkthroughSeconds, setWalkthroughSeconds] = useState(0);
  const [compilationStatusMessage, setCompilationStatusMessage] = useState<string | null>(null);
  const [activeDrawerTab, setActiveDrawerTab] = useState<"STRUCTURE" | "DIAGNOSIS" | "SOCRATIC">("STRUCTURE");

  const handleTogglePacerOverlay = useCallback(() => setShowPacerOverlay((prev) => !prev), []);
  const handleRequestCompile = useCallback(() => {
    setWalkthroughModalPhase("idle");
    setWalkthroughModalTranscript("");
    setShowWalkthroughModal(true);
  }, []);

  const executeCompilation = useCallback(
    async ({ verbalWalkthroughTranscript = null, isIncremental = false }: ExecuteCompilationParams = {}) => {
      if (isCompilingRef.current) {
        console.warn("[Compilation] Blocked: compilation already in progress.");
        return null;
      }
      isCompilingRef.current = true;
      setIsCompiling(true);
      try {
        const title = props?.getMapTitle ? props.getMapTitle() : "Mapa Mental";
        const canvasId = props?.getCurrentMapId ? props.getCurrentMapId() : "canvas_default";
        const placedAttributes = props?.getPlacedAttributes ? props.getPlacedAttributes() : [];
        const visualAST = props?.getVisualAST ? await props.getVisualAST() : null;

        let localStrokes = props?.getStrokes ? props.getStrokes() : [];
        if (!localStrokes || localStrokes.length === 0) {
          localStrokes = await getCanvasStrokes().catch(() => []);
        }

        let previousAnalysis: { nodes?: any[]; edges?: any[] } | null = null;
        if (isIncremental) {
          const stored = await getCompilationForCanvas(canvasId);
          if (stored?.nodes || stored?.edges) {
            previousAnalysis = { nodes: stored.nodes || [], edges: stored.edges || [] };
          }
        }

        const response = await compileCanvas(
          { id: canvasId, title, strokes: localStrokes, placedAttributes, visualAST },
          { verbalWalkthroughTranscript, previousAnalysis }
        );

        const { output, compiledGraphPayload } = mapVisionResponseToOutput(response, localStrokes);
        await saveCompiledGraph(compiledGraphPayload);

        const existingDoc = await loadDocument(canvasId);
        if (existingDoc) {
          const nodeStrokeMap = new Map<string, string>();
          for (const s of localStrokes) if (s.associatedNodeId) nodeStrokeMap.set(s.id, s.associatedNodeId);
          if (existingDoc.raw_ink_layer?.strokes) {
            existingDoc.raw_ink_layer.strokes = existingDoc.raw_ink_layer.strokes.map((s) => ({
              ...s,
              associatedNodeId: nodeStrokeMap.get(s.id) ?? s.associatedNodeId,
            }));
          }
          existingDoc.compiled_cognitive_layer = output;
          existingDoc.metadata.updated_at = Date.now();
          await saveDocument(existingDoc);
        }

        setCompilation(output);
        setShowPacerOverlay(true);
        cognitiveLayerStore.setCompiledData(output as any);
        props?.onCompilationComplete?.(output);
        return output;
      } catch (err: any) {
        console.error("[Compilation] Execution error:", err);
        Alert.alert("Error de Compilación", err?.message || "Failed to compile canvas.");
        throw err;
      } finally {
        isCompilingRef.current = false;
        setIsCompiling(false);
        setCompilationStatusMessage(null);
      }
    },
    [props]
  );

  const handleFastCompile = useCallback(async () => {
    try {
      await executeCompilation({ verbalWalkthroughTranscript: null, isIncremental: false });
      setActiveDrawerTab("STRUCTURE");
      setIsDrawerOpen(true);
    } catch {}
  }, [executeCompilation]);

  const handleLongPressFastCompile = useCallback(() => {
    Alert.alert(
      "Opciones de Compilación",
      "Selecciona cómo evaluar el lienzo con la IA:",
      [
        {
          text: "Actualización Incremental (Preservar nodos)",
          onPress: async () => {
            await executeCompilation({ verbalWalkthroughTranscript: null, isIncremental: true });
            setActiveDrawerTab("STRUCTURE");
            setIsDrawerOpen(true);
          },
        },
        {
          text: "Evaluación Completa (Desde cero)",
          onPress: async () => {
            await executeCompilation({ verbalWalkthroughTranscript: null, isIncremental: false });
            setActiveDrawerTab("STRUCTURE");
            setIsDrawerOpen(true);
          },
        },
        { text: "Cancelar", style: "cancel" },
      ]
    );
  }, [executeCompilation]);

  const handleStartExplanation = useCallback(() => {
    setIsDrawerOpen(false);
    setShowWalkthroughModal(true);
  }, []);

  const handleStopAndReviewExplanation = useCallback(async () => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;
    try {
      const audioUri = await WalkthroughAudioService.stopRecording();
      setIsRecordingWalkthrough(false);
      if (audioUri) {
        setCompilationStatusMessage("Transcribiendo razonamiento...");
        const transcript = await TranscriptionService.transcribeAudio(audioUri);
        setWalkthroughModalTranscript(transcript);
        setWalkthroughModalPhase("review");
        setShowWalkthroughModal(true);
      }
    } catch (error: any) {
      console.error("[Compilation] Transcribe error:", error);
      Alert.alert("Audio", error?.message || "No se pudo transcribir la explicación.");
    } finally {
      setCompilationStatusMessage(null);
      setIsRecordingWalkthrough(false);
      isStoppingRef.current = false;
    }
  }, []);

  const handleConfirmWalkthrough = useCallback(
    async (result: WalkthroughConfirmParams | string | null) => {
      setShowWalkthroughModal(false);
      const transcript = typeof result === "string" ? result : result?.transcript ?? null;
      const isIncremental = typeof result === "object" && result !== null ? Boolean(result.isIncremental) : true;
      try {
        await executeCompilation({ verbalWalkthroughTranscript: transcript, isIncremental });
        setActiveDrawerTab("DIAGNOSIS");
        setIsDrawerOpen(true);
      } catch {}
    },
    [executeCompilation]
  );

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isRecordingWalkthrough) {
      interval = setInterval(() => {
        setWalkthroughSeconds((prev) => {
          if (prev + 1 >= 180) {
            handleStopAndReviewExplanation();
            return 180;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isRecordingWalkthrough, handleStopAndReviewExplanation]);

  return {
    isDrawerOpen,
    setIsDrawerOpen,
    isCompiling,
    setIsCompiling,
    compilation,
    setCompilation,
    handleCompile: handleConfirmWalkthrough,
    handleFastCompile,
    handleLongPressFastCompile,
    handleStartExplanation,
    handleStopAndCompileExplanation: handleStopAndReviewExplanation,
    handleConfirmWalkthrough,
    isRecordingWalkthrough,
    walkthroughSeconds,
    compilationStatusMessage,
    activeDrawerTab,
    setActiveDrawerTab,
    handleRequestCompile,
    showWalkthroughModal,
    setShowWalkthroughModal,
    walkthroughModalTranscript,
    walkthroughModalPhase,
    pacerFilter,
    setPacerFilter,
    showPacerOverlay,
    setShowPacerOverlay,
    handleTogglePacerOverlay,
  };
};
