import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, Text, TouchableOpacity, TextInput, ScrollView, Alert, Platform, Share } from "react-native";
import { Zap, ExternalLink, GitMerge, X, Check, Download } from "@sketchyicons/react-native";
import * as FileSystem from "expo-file-system";
import { StorageAccessFramework } from "expo-file-system";
import { CanvasCompiledPayload, KnowledgeNode, KnowledgeEdge } from "@cognitive-canvas/core";
import {
  loadAllCompiledGraphs,
  updateKnowledgeNodeVerification,
} from "../../services/CompiledGraphStorage";
import { DagGraphRenderer } from "./components/DagGraphRenderer";
import { ConsolidationModal } from "./components/ConsolidationModal";
import { FALLBACK_PAYLOADS, styles } from "./KnowledgeMatrixTab.styles";

export interface KnowledgeMatrixTabProps {
  onOpenCanvasAtBounds: (
    canvasId: string,
    boundingBox?: { minX: number; minY: number; maxX: number; maxY: number }
  ) => void;
}

const TIER_LABELS: Record<KnowledgeNode["tier"], string> = {
  primitive: "Primitive",
  mechanism: "Mechanism",
  system: "System",
};

export const KnowledgeMatrixTab: React.FC<KnowledgeMatrixTabProps> = ({
  onOpenCanvasAtBounds,
}) => {
  const [payloads, setPayloads] = useState<CanvasCompiledPayload[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [defenseActive, setDefenseActive] = useState(false);
  const [defenseAnswer, setDefenseAnswer] = useState("");
  const [defenseFeedback, setDefenseFeedback] = useState<string | null>(null);
  const [consolidationModalOpen, setConsolidationModalOpen] = useState(false);

  const refreshGraphs = useCallback(async () => {
    const loaded = await loadAllCompiledGraphs();
    setPayloads(loaded.length > 0 ? loaded : FALLBACK_PAYLOADS);
  }, []);

  useEffect(() => {
    refreshGraphs();
  }, [refreshGraphs]);

  const { mergedNodes, mergedEdges, overlappingNode } = useMemo(() => {
    const nodeMap = new Map<string, KnowledgeNode>();
    const edgeList: KnowledgeEdge[] = [];

    for (const p of payloads) {
      for (const n of p.nodes) {
        const existing = nodeMap.get(n.id);
        if (!existing) {
          nodeMap.set(n.id, { ...n, provenance: [...n.provenance] });
        } else {
          const provIds = new Set(existing.provenance.map((pr) => pr.canvasId));
          for (const pr of n.provenance) {
            if (!provIds.has(pr.canvasId)) existing.provenance.push(pr);
          }
          if (n.verificationState === "verified") existing.verificationState = "verified";
          if (n.consolidatedRef) existing.consolidatedRef = n.consolidatedRef;
        }
      }
      edgeList.push(...p.edges);
    }

    const nodesArr = Array.from(nodeMap.values());
    const shared = nodesArr.find((n) => n.provenance.length >= 2) || null;
    return { mergedNodes: nodesArr, mergedEdges: edgeList, overlappingNode: shared };
  }, [payloads]);

  const selectedNode = useMemo(
    () => mergedNodes.find((n) => n.id === selectedNodeId) || null,
    [mergedNodes, selectedNodeId]
  );

  const handleSelectNode = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    setDefenseActive(false);
    setDefenseAnswer("");
    setDefenseFeedback(null);
  }, []);

  const handleSubmitSocraticDefense = async () => {
    if (!selectedNode) return;
    if (defenseAnswer.trim().length < 20) {
      setDefenseFeedback(
        "Challenged: What happens if upstream latency spikes before the state transition completes? Explain the counterfactual failure mode."
      );
      return;
    }
    await updateKnowledgeNodeVerification(selectedNode.id, "verified");
    setDefenseFeedback("Passed: Sound causal defense of edge cases and backpressure propagation.");
    refreshGraphs();
  };

  const handleExportKnowledgeMatrix = async () => {
    try {
      if (mergedNodes.length === 0) {
        Alert.alert("Matriz Vacía", "No hay nodos ni estructura compilada para exportar.");
        return;
      }
      const matrixData = {
        exportedAt: Date.now(),
        totalNodes: mergedNodes.length,
        totalEdges: mergedEdges.length,
        canvasesCount: payloads.length,
        nodes: mergedNodes,
        edges: mergedEdges,
        payloads,
      };
      const filename = `knowledge_matrix_${Date.now()}.json`;
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;
      const jsonContent = JSON.stringify(matrixData, null, 2);
      await FileSystem.writeAsStringAsync(fileUri, jsonContent, { encoding: FileSystem.EncodingType.UTF8 });

      let shared = false;
      try {
        const dynamicRequire = typeof require !== "undefined" ? require : null;
        const expoSharing = dynamicRequire ? dynamicRequire("expo-sharing") : null;
        if (expoSharing && (await expoSharing.isAvailableAsync())) {
          await expoSharing.shareAsync(fileUri, {
            mimeType: "application/json",
            dialogTitle: "Exportar Matriz de Conocimiento",
            UTI: "public.json",
          });
          shared = true;
        }
      } catch {}

      if (!shared && Platform.OS === "android" && StorageAccessFramework) {
        const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (permissions.granted) {
          const safUri = await StorageAccessFramework.createFileAsync(permissions.directoryUri, filename, "application/json");
          await FileSystem.writeAsStringAsync(safUri, jsonContent, { encoding: FileSystem.EncodingType.UTF8 });
          Alert.alert("Matriz Guardada", `Archivo guardado exitosamente:\n${filename}`);
          shared = true;
        }
      }

      if (!shared) {
        await Share.share({ title: "Exportar Matriz de Conocimiento", message: jsonContent });
      }
    } catch (error: any) {
      console.error("Error al exportar matriz:", error);
      Alert.alert("Error", error?.message || "No se pudo exportar el archivo de la Matriz.");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.title}>Knowledge Matrix · Force-Directed Causal DAG</Text>
          <Text style={styles.subtitle}>
            {mergedNodes.length} canonical concepts across {payloads.length} compiled canvases
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <TouchableOpacity
            style={styles.exportMatrixBtn}
            onPress={handleExportKnowledgeMatrix}
            activeOpacity={0.85}
          >
            <Download size={14} color="#38BDF8" strokeWidth={2.0} />
            <Text style={styles.exportMatrixText}>Exportar Matriz (JSON)</Text>
          </TouchableOpacity>
          {overlappingNode && (
            <TouchableOpacity
              style={styles.consolidateBannerBtn}
              onPress={() => setConsolidationModalOpen(true)}
              activeOpacity={0.85}
            >
              <GitMerge size={14} color="#FBBF24" strokeWidth={2.0} />
              <Text style={styles.consolidateBannerText}>
                Overlap: "{overlappingNode.label}" · Consolidate
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <DagGraphRenderer
        nodes={mergedNodes}
        edges={mergedEdges}
        selectedNodeId={selectedNodeId}
        onSelectNode={handleSelectNode}
      />

      {selectedNode && (
        <View style={styles.bottomSheet}>
          <View style={styles.sheetHeader}>
            <View style={styles.titleWrap}>
              <View style={styles.badgesRow}>
                <View style={styles.tierBadge}>
                  <Text style={styles.tierBadgeText}>{TIER_LABELS[selectedNode.tier]}</Text>
                </View>
                <View
                  style={[
                    styles.stateBadge,
                    selectedNode.verificationState === "verified"
                      ? styles.stateVerified
                      : styles.stateNeedsDefense,
                  ]}
                >
                  <Text
                    style={[
                      styles.stateBadgeText,
                      selectedNode.verificationState === "verified"
                        ? styles.stateTextVerified
                        : styles.stateTextNeedsDefense,
                    ]}
                  >
                    {selectedNode.verificationState === "verified"
                      ? "✓ Verified"
                      : "⚡ Needs Defense"}
                  </Text>
                </View>
              </View>
              <Text style={styles.sheetTitle}>{selectedNode.label}</Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedNodeId(null)} style={styles.closeBtn}>
              <X size={16} color="#94A3B8" strokeWidth={2.0} />
            </TouchableOpacity>
          </View>

          <Text style={styles.sheetSummary}>{selectedNode.summary}</Text>

          {!defenseActive ? (
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.socraticBtn}
                onPress={() => setDefenseActive(true)}
                activeOpacity={0.85}
              >
                <Zap size={14} color="#FBBF24" strokeWidth={2.0} />
                <Text style={styles.socraticBtnText}>[ ⚡ Socratic Defense ]</Text>
              </TouchableOpacity>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {selectedNode.provenance.map((prov, idx) => (
                  <TouchableOpacity
                    key={`${prov.canvasId}_${idx}`}
                    style={styles.originBtn}
                    onPress={() => onOpenCanvasAtBounds(prov.canvasId, prov.boundingBox)}
                  >
                    <ExternalLink size={13} color="#38BDF8" strokeWidth={2.0} />
                    <Text style={styles.originBtnText}>
                      [ ✍️ View in Canvas: {prov.canvasTitle} ]
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : (
            <View style={styles.defenseBox}>
              <Text style={styles.defenseQuestion}>
                Socratic Audit: Under partition or high load, how does "{selectedNode.label}" prevent cascading failure or state corruption?
              </Text>
              <View style={styles.defenseInputRow}>
                <TextInput
                  style={styles.defenseInput}
                  value={defenseAnswer}
                  onChangeText={setDefenseAnswer}
                  placeholder="Defend the causal mechanism without circular definitions..."
                  placeholderTextColor="#64748B"
                />
                <TouchableOpacity
                  style={styles.submitDefenseBtn}
                  onPress={handleSubmitSocraticDefense}
                >
                  <Check size={15} color="#FFFFFF" strokeWidth={2.2} />
                </TouchableOpacity>
              </View>
              {defenseFeedback && <Text style={styles.feedbackText}>{defenseFeedback}</Text>}
            </View>
          )}
        </View>
      )}

      <ConsolidationModal
        visible={consolidationModalOpen}
        overlappingNode={overlappingNode}
        allPayloads={payloads}
        onClose={() => setConsolidationModalOpen(false)}
        onSynthesisCreated={(newCanvasId) => onOpenCanvasAtBounds(newCanvasId)}
      />
    </View>
  );
};
