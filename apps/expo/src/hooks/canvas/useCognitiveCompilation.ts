import { useState, useCallback, useRef } from "react";
import { Alert } from "react-native";
import {
  CognitiveCompilerOutput,
  VisualAST,
  PacerClassification,
  RawInkStroke,
  KnowledgeNode,
  KnowledgeEdge,
  CanvasCompiledPayload,
  CompiledNode,
  CompiledEdge,
} from "@cognitive-canvas/core/types";
import { PlacedAttribute } from "../../types/canvas";
import { compileCanvas } from "../../services/CompilationService";
import { saveCompiledGraph } from "../../services/CompiledGraphStorage";
import { loadDocument, saveDocument } from "../../services/StorageService";
import { getCanvasStrokes } from "../../components/JetpackInkCanvas";
import { SpatialHashGrid } from "../../utils/SpatialHashGrid";
import { cognitiveLayerStore } from "../../stores/useCognitiveLayerStore";

export interface UseCognitiveCompilationProps {
  getVisualAST?: () => VisualAST | null | Promise<VisualAST | null>;
  getStrokes?: () => RawInkStroke[];
  getMapTitle?: () => string;
  getCurrentMapId?: () => string;
  getPlacedAttributes?: () => PlacedAttribute[];
  onCompilationComplete?: (output: CognitiveCompilerOutput) => void;
}

export const useCognitiveCompilation = (props?: UseCognitiveCompilationProps) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const isCompilingRef = useRef<boolean>(false);
  const [compilation, setCompilation] = useState<CognitiveCompilerOutput | null>(null);
  const [pacerFilter, setPacerFilter] = useState<PacerClassification | "ALL">("ALL");
  const [showPacerOverlay, setShowPacerOverlay] = useState<boolean>(true);

  const handleTogglePacerOverlay = useCallback(() => {
    setShowPacerOverlay((prev) => !prev);
  }, []);

  const handleCompile = useCallback(async () => {
    if (isCompilingRef.current) {
      console.warn("[useCognitiveCompilation] ⚠️ Compilation already in progress.");
      return;
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

      console.log(
        `[useCognitiveCompilation] 🧠 Vision-First compilation for: "${title}" (${canvasId})`
      );

      // 1. Execute Vision-First Multimodal Compilation (PNG + lightweight context, ZERO flatPoints)
      const response = await compileCanvas({
        id: canvasId,
        title,
        strokes: localStrokes,
        placedAttributes,
        visualAST,
      });

      const { renderWorldBounds } = response;

      // 2. Build local SpatialHashGrid from device strokes for bidirectional anchoring
      const spatialGrid = new SpatialHashGrid(64);
      for (const stroke of localStrokes) {
        spatialGrid.insert(stroke);
      }

      // 3. Mathematical coordinate remapping (box_2d [0..1000] -> universal worldBounds)
      //    and local stroke indexing (`associatedNodeId`)
      const enrichedNodes: KnowledgeNode[] = response.nodes.map((node) => {
        const [ymin, xmin, ymax, xmax] = node.box_2d;
        const worldBounds = {
          minX: renderWorldBounds.minX + (xmin / 1000) * renderWorldBounds.width,
          minY: renderWorldBounds.minY + (ymin / 1000) * renderWorldBounds.height,
          maxX: renderWorldBounds.minX + (xmax / 1000) * renderWorldBounds.width,
          maxY: renderWorldBounds.minY + (ymax / 1000) * renderWorldBounds.height,
        };

        const matchingStrokes = spatialGrid.query(worldBounds);
        for (const stroke of matchingStrokes) {
          stroke.associatedNodeId = node.id;
        }

        return {
          ...node,
          pacerRole: node.pacerRole || "NONE",
          verificationState: "unverified",
          provenance: [
            {
              canvasId: response.canvasId,
              canvasTitle: response.canvasTitle,
              boundingBox: worldBounds,
            },
          ],
        };
      });

      const enrichedEdges: KnowledgeEdge[] = response.edges.map((edge, idx) => ({
        id: `edge_${response.canvasId}_${idx}`,
        fromNodeId: edge.fromNodeId,
        toNodeId: edge.toNodeId,
        type: edge.type,
        reasoning: edge.reasoning,
        confidence: 0.9,
      }));

      const compiledGraphPayload: CanvasCompiledPayload = {
        canvasId: response.canvasId,
        canvasTitle: response.canvasTitle,
        compiledAt: Date.now(),
        nodes: enrichedNodes,
        edges: enrichedEdges,
        synthesis: response.synthesis,
      };

      // 4. Construct CognitiveCompilerOutput for Canvas overlays & drawer
      const overlayNodes: CompiledNode[] = enrichedNodes.map((n) => {
        const b = n.provenance[0]?.boundingBox || {
          minX: 100,
          minY: 100,
          maxX: 300,
          maxY: 220,
        };
        const pacer: PacerClassification =
          n.pacerRole === "REFERENCE" || n.pacerRole === "PROCEDURAL" || n.pacerRole === "ANALOGOUS"
            ? n.pacerRole
            : "NONE";
        return {
          id: n.id,
          visual_bounding_box: {
            xmin: b.minX,
            ymin: b.minY,
            xmax: b.maxX,
            ymax: b.maxY,
          },
          detected_content: n.label,
          passive_context: n.summary,
          pacer_classification: pacer,
          deducible_from_context: n.pacerRole !== "REFERENCE",
        };
      });

      const overlayEdges: CompiledEdge[] = enrichedEdges.map((e) => ({
        source_node_id: e.fromNodeId,
        target_node_id: e.toNodeId,
        label: e.reasoning,
        is_cross_link: false,
        relation_nature:
          e.type === "INHIBITS"
            ? "OPPOSITION_CONTRAST"
            : e.type === "PREREQUISITE_OF"
            ? "CONDITIONAL"
            : "CAUSAL",
      }));

      const output: CognitiveCompilerOutput = {
        ...(response.legacyOutput || {}),
        map_metadata: {
          title: response.canvasTitle,
          domain_theme: enrichedNodes[0]?.domain || response.canvasTitle,
          total_nodes: enrichedNodes.length,
          total_edges: enrichedEdges.length,
        },
        nodes: overlayNodes,
        edges: overlayEdges,
        synthesis: response.synthesis,
        compiled_graph_payload: compiledGraphPayload,
      };

      // 5. Dual Persistence:
      //    (a) Save compiled_graph.json for Knowledge Matrix
      await saveCompiledGraph(compiledGraphPayload);

      //    (b) Enrich activeDocument.cmn metadata & stroke associatedNodeIds without altering coordinates
      const existingDoc = await loadDocument(canvasId);
      if (existingDoc) {
        const nodeStrokeMap = new Map<string, string>();
        for (const s of localStrokes) {
          if (s.associatedNodeId) {
            nodeStrokeMap.set(s.id, s.associatedNodeId);
          }
        }
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
      setIsDrawerOpen(true);
    } catch (err: any) {
      console.error("[useCognitiveCompilation] Compilation error:", err);
      Alert.alert(
        "Compilation Error",
        err?.message || "Failed to compile canvas. Please check your Gemini API Key in Settings."
      );
    } finally {
      isCompilingRef.current = false;
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
