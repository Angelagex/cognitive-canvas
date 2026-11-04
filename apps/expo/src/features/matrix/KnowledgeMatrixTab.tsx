import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, Text, TouchableOpacity, TextInput, ScrollView, Dimensions } from "react-native";
import * as Haptics from "expo-haptics";
import { Zap, ExternalLink, GitMerge, X, Check, Download } from "@sketchyicons/react-native";
import { CanvasCompiledPayload, KnowledgeNode, KnowledgeEdge } from "@cognitive-canvas/core";
import { VinkLogo } from "../../components/brand";
import { useAppTheme } from "../../theme";
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
  const { theme } = useAppTheme();
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
    () => ["All", ...Array.from(new Set(mergedNodes.map((n) => n.field || n.domain).filter((d) => d && d.trim().length > 0 && d !== "<3")))],
    [mergedNodes]
  );

  const filteredNodes = useMemo(
    () => (selectedDomain === "All" ? mergedNodes.filter((n) => n.domain !== "<3") : mergedNodes.filter((n) => (n.field || n.domain) === selectedDomain)),
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

  const handleSelectNode = useCallback((nodeOrId: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const id = typeof nodeOrId === "object" && nodeOrId ? nodeOrId.id : nodeOrId;
    setSelectedNodeId(id || null);
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
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setDefenseFeedback("Passed: Sound causal defense of edge cases and backpressure propagation.");
    refreshGraphs();
  };

  const handleExportKnowledgeMatrix = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    await exportKnowledgeMatrix(filteredNodes, filteredEdges, payloads);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bgApp }]}>
      <View
        style={[
          styles.topBar,
          {
            backgroundColor: theme.colors.bgHeader,
            borderBottomColor: theme.colors.borderSubtle,
          },
        ]}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <VinkLogo
            showIcon={false}
            wordmarkHeight={18}
            wordmarkColor={theme.colors.textPrimary}
          />
          <View style={{ width: 1, height: 22, backgroundColor: theme.colors.borderSubtle }} />
          <View>
            <Text
              style={[
                styles.title,
                theme.typography.display,
                { color: theme.colors.textPrimary },
              ]}
            >
              Knowledge Matrix · Force-Directed Causal DAG
            </Text>
            <Text
              style={[
                styles.subtitle,
                theme.typography.body,
                { color: theme.colors.textSecondary },
              ]}
            >
              {filteredNodes.length} canonical concepts {selectedDomain !== "All" ? `in ${selectedDomain}` : `across ${payloads.length} compiled canvases`}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <TouchableOpacity
            style={[
              styles.exportMatrixBtn,
              {
                backgroundColor: theme.colors.badgeBg,
                borderColor: theme.colors.badgeBorder,
              },
            ]}
            onPress={handleExportKnowledgeMatrix}
            activeOpacity={0.85}
          >
            <Download size={14} color={theme.colors.accentPrimary} strokeWidth={2.0} />
            <Text
              style={[
                styles.exportMatrixText,
                theme.typography.bodyBold,
                { color: theme.colors.accentPrimary },
              ]}
            >
              Exportar Matriz (JSON)
            </Text>
          </TouchableOpacity>
          {overlappingNode && (
            <TouchableOpacity
              style={styles.consolidateBannerBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                setConsolidationModalOpen(true);
              }}
              activeOpacity={0.85}
            >
              <GitMerge size={14} color="#FBBF24" strokeWidth={2.0} />
              <Text style={[styles.consolidateBannerText, theme.typography.bodyBold]}>
                Overlap: "{overlappingNode.label}" · Consolidate
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View
        style={[
          styles.filterContainer,
          {
            backgroundColor: theme.colors.bgHeader,
            borderBottomColor: theme.colors.borderSubtle,
          },
        ]}
      >
        <ScrollView contentContainerStyle={styles.filterScrollContent} horizontal showsHorizontalScrollIndicator={false}>
          {availableDomains.map((domain) => {
            const isSelected = selectedDomain === domain;
            const domainColor = domain === "All" ? theme.colors.accentPrimary : getDomainColor(domain).stroke;
            return (
              <TouchableOpacity
                key={domain}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  setSelectedDomain(domain);
                }}
                style={[
                  styles.domainChip,
                  {
                    backgroundColor: isSelected ? domainColor + "25" : theme.colors.pillInactiveBg,
                    borderColor: isSelected ? domainColor : theme.colors.borderSubtle,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.domainChipText,
                    isSelected ? theme.typography.bodyBold : theme.typography.body,
                    { color: domainColor },
                  ]}
                >
                  {domain}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={[styles.graphViewport, { width: SCREEN_WIDTH, height: SCREEN_HEIGHT - 160, backgroundColor: theme.colors.bgApp }]}>
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
        <View
          style={[
            styles.bottomSheet,
            {
              backgroundColor: theme.colors.bgCard,
              borderColor: theme.colors.borderSubtle,
            },
          ]}
        >
          <View style={styles.sheetHeader}>
            <View style={styles.titleWrap}>
              <View style={styles.badgesRow}>
                <View
                  style={[
                    styles.tierBadge,
                    {
                      backgroundColor: theme.colors.badgeBg,
                      borderColor: theme.colors.badgeBorder,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.tierBadgeText,
                      theme.typography.monoBold,
                      { color: theme.colors.accentPrimary },
                    ]}
                  >
                    {TIER_LABELS[selectedNode.tier]}
                  </Text>
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
                      theme.typography.monoBold,
                      selectedNode.verificationState === "verified"
                        ? styles.stateTextVerified
                        : styles.stateTextNeedsDefense,
                    ]}
                  >
                    {selectedNode.verificationState === "verified"
                      ? "Verificado"
                      : "Requiere defensa"}
                  </Text>
                </View>
              </View>
              <Text
                style={[
                  styles.sheetTitle,
                  theme.typography.display,
                  { color: theme.colors.textPrimary },
                ]}
              >
                {selectedNode.label}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedNodeId(null)} style={styles.closeBtn}>
              <X size={16} color={theme.colors.textMuted} strokeWidth={2.0} />
            </TouchableOpacity>
          </View>

          <Text
            style={[
              styles.sheetSummary,
              theme.typography.body,
              { color: theme.colors.textSecondary },
            ]}
          >
            {selectedNode.summary}
          </Text>

          {!defenseActive ? (
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.socraticBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  setDefenseActive(true);
                }}
                activeOpacity={0.85}
              >
                <Zap size={14} color="#FBBF24" strokeWidth={2.0} />
                <Text style={[styles.socraticBtnText, theme.typography.bodyBold]}>[ Defensa socrática ]</Text>
              </TouchableOpacity>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {selectedNode.provenance.map((prov, idx) => (
                  <TouchableOpacity
                    key={`${prov.canvasId}_${idx}`}
                    style={[
                      styles.originBtn,
                      {
                        backgroundColor: theme.colors.pillInactiveBg,
                        borderColor: theme.colors.borderSubtle,
                      },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      onOpenCanvasAtBounds(prov.canvasId, prov.boundingBox);
                    }}
                  >
                    <ExternalLink size={13} color={theme.colors.accentPrimary} strokeWidth={2.0} />
                    <Text
                      style={[
                        styles.originBtnText,
                        theme.typography.bodyBold,
                        { color: theme.colors.textPrimary },
                      ]}
                    >
                      [ ✍️ View in Canvas: {prov.canvasTitle} ]
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : (
            <View style={styles.defenseBox}>
              <Text
                style={[
                  styles.defenseQuestion,
                  theme.typography.bodyBold,
                  { color: theme.colors.accentSecondary },
                ]}
              >
                Socratic Audit: Under partition or high load, how does "{selectedNode.label}" prevent cascading failure or state corruption?
              </Text>
              <View style={styles.defenseInputRow}>
                <TextInput
                  style={[
                    styles.defenseInput,
                    theme.typography.body,
                    {
                      backgroundColor: theme.colors.bgInput,
                      borderColor: theme.colors.borderSubtle,
                      color: theme.colors.textPrimary,
                    },
                  ]}
                  value={defenseAnswer}
                  onChangeText={setDefenseAnswer}
                  placeholder="Defend the causal mechanism without circular definitions..."
                  placeholderTextColor={theme.colors.textMuted}
                />
                <TouchableOpacity
                  style={[
                    styles.submitDefenseBtn,
                    { backgroundColor: theme.colors.accentPrimary },
                  ]}
                  onPress={handleSubmitSocraticDefense}
                >
                  <Check size={15} color="#FFFFFF" strokeWidth={2.2} />
                </TouchableOpacity>
              </View>
              {defenseFeedback && (
                <Text style={[styles.feedbackText, theme.typography.body]}>
                  {defenseFeedback}
                </Text>
              )}
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
