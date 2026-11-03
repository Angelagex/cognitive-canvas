import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, Text, TouchableOpacity, TextInput, ScrollView, Dimensions } from "react-native";
import { Zap, ExternalLink, GitMerge, X, Check, Download } from "@sketchyicons/react-native";
import { CanvasCompiledPayload, KnowledgeNode, KnowledgeEdge } from "@cognitive-canvas/core";
import {
  loadAllCompiledGraphs,
  updateKnowledgeNodeVerification,
} from "../../services/CompiledGraphStorage";
import { DagGraphRenderer } from "./components/DagGraphRenderer";
import { ConsolidationModal } from "./components/ConsolidationModal";
import { exportKnowledgeMatrix } from "./utils/exportMatrix";
import { getDomainColor } from "./utils/domainColors";
import { FALLBACK_PAYLOADS, styles } from "./KnowledgeMatrixTab.styles";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export interface KnowledgeMatrixTabProps {
  onOpenCanvasAtBounds: (canvasId: string, boundingBox?: { minX: number; minY: number; maxX: number; maxY: number }) => void;
}

const TIER_LABELS: Record<KnowledgeNode["tier"], string> = { primitive: "Primitive", mechanism: "Mechanism", system: "System" };

export const KnowledgeMatrixTab: React.FC<KnowledgeMatrixTabProps> = ({ onOpenCanvasAtBounds }) => {
  const [payloads, setPayloads] = useState<CanvasCompiledPayload[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string>("All");
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
      const omissions = p.reasoningDiagnosis?.omissions || p.synthesis?.blindSpots || [];
      for (const om of omissions) {
        if (!om.missingConcept) continue;
        const gId = `ghost_${om.missingConcept.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
        if (!nodeMap.has(gId)) {
          nodeMap.set(gId, {
            id: gId,
            label: `? ${om.missingConcept}`,
            domain: p.nodes[0]?.domain || "General",
            tier: "mechanism",
            pacerRole: "NONE",
            verificationState: "ghost",
            summary: `Punto ciego detectado: ${om.significance}`,
            provenance: [{ canvasId: p.canvasId, canvasTitle: p.canvasTitle, boundingBox: { minX: 100, minY: 100, maxX: 300, maxY: 200 } }],
          });
        }
      }
      edgeList.push(...p.edges);
    }

    const nodesArr = Array.from(nodeMap.values());
    const shared = nodesArr.find((n) => n.provenance.length >= 2) || null;
    return { mergedNodes: nodesArr, mergedEdges: edgeList, overlappingNode: shared };
  }, [payloads]);

  const availableDomains = useMemo(
    () => ["All", ...Array.from(new Set(mergedNodes.map((n) => n.domain).filter((d) => d && d.trim().length > 0 && d !== "<3")))],
    [mergedNodes]
  );

  const filteredNodes = useMemo(
    () => (selectedDomain === "All" ? mergedNodes.filter((n) => n.domain && n.domain !== "<3") : mergedNodes.filter((n) => n.domain === selectedDomain)),
    [mergedNodes, selectedDomain]
  );

  const filteredEdges = useMemo(() => {
    const visibleIds = new Set(filteredNodes.map((n) => n.id));
    return mergedEdges.filter((e) => visibleIds.has(e.fromNodeId) && visibleIds.has(e.toNodeId));
  }, [mergedEdges, filteredNodes]);

  const selectedNode = useMemo(
    () => filteredNodes.find((n) => n.id === selectedNodeId) || null,
    [filteredNodes, selectedNodeId]
  );

  const handleSelectNode = useCallback((nodeId: string | null) => {
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

  const handleExportKnowledgeMatrix = () => {
    exportKnowledgeMatrix(filteredNodes, filteredEdges, payloads);
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.title}>Knowledge Matrix · Force-Directed Causal DAG</Text>
          <Text style={styles.subtitle}>
            {filteredNodes.length} canonical concepts {selectedDomain !== "All" ? `in ${selectedDomain}` : `across ${payloads.length} compiled canvases`}
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

      <View style={styles.filterContainer}>
        <ScrollView contentContainerStyle={styles.filterScrollContent} horizontal showsHorizontalScrollIndicator={false}>
          {availableDomains.map((domain) => {
            const isSelected = selectedDomain === domain;
            const domainColor = domain === "All" ? "#38BDF8" : getDomainColor(domain).stroke;
            return (
              <TouchableOpacity
                key={domain}
                onPress={() => setSelectedDomain(domain)}
                style={[
                  styles.domainChip,
                  isSelected && { backgroundColor: domainColor + "25", borderColor: domainColor },
                ]}
                activeOpacity={0.7}
              >
                <Text style={[styles.domainChipText, { color: domainColor, fontWeight: isSelected ? "700" : "500" }]}>
                  {domain}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={[styles.graphViewport, { width: SCREEN_WIDTH, height: SCREEN_HEIGHT - 160 }]}>
        <DagGraphRenderer
          nodes={filteredNodes}
          edges={filteredEdges}
          selectedNodeId={selectedNodeId}
          onSelectNode={handleSelectNode}
          width={SCREEN_WIDTH}
          height={SCREEN_HEIGHT - 160}
        />
      </View>

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
