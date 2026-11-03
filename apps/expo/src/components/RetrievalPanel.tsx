import React, { useState, useMemo, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { Layers, GitBranch, HelpCircle, Eye, EyeOff, Sparkles } from "@sketchyicons/react-native";
import { CognitiveCompilerOutput, PacerClassification, KnowledgeNode, KnowledgeEdge, ConceptTier, PacerRole, ReasoningDiagnosis } from "@cognitive-canvas/core/types";
import { useCognitiveLayerStore } from "../stores/useCognitiveLayerStore";
import { ArchitectureTab } from "./drawer/tabs/ArchitectureTab";
import { styles } from "./RetrievalPanel.styles";

export interface RetrievalPanelProps {
  compilation: CognitiveCompilerOutput;
  pacerFilter?: PacerClassification | "ALL";
  onPacerFilterChange?: (filter: PacerClassification | "ALL") => void;
  showPacerOverlay?: boolean;
  onTogglePacerOverlay?: () => void;
  onFocusNode?: (box: { minX: number; minY: number; maxX: number; maxY: number }) => void;
  onCloseDrawer?: () => void;
  initialTab?: "STRUCTURE" | "DIAGNOSIS" | "SOCRATIC";
}

const TIER_CONFIG: Record<ConceptTier, { title: string; badge: string; bg: string; border: string; color: string }> = {
  system: { title: "Sistema (Tier 2)", badge: "TIER 2 • SISTEMA", bg: "rgba(168, 85, 247, 0.16)", border: "#A855F7", color: "#E9D5FF" },
  mechanism: { title: "Mecanismo (Tier 1)", badge: "TIER 1 • MECANISMO", bg: "rgba(56, 189, 248, 0.16)", border: "#38BDF8", color: "#BAE6FD" },
  primitive: { title: "Fundamento (Tier 0)", badge: "TIER 0 • FUNDAMENTO", bg: "rgba(52, 211, 153, 0.16)", border: "#34D399", color: "#A7F3D0" },
};

const PACER_ROLE_BADGE: Record<Exclude<PacerRole, "NONE">, { label: string; bg: string; border: string; color: string }> = {
  REFERENCE: { label: "PACER • REFERENCE (Anki)", bg: "rgba(245, 158, 11, 0.18)", border: "#F59E0B", color: "#FDE68A" },
  PROCEDURAL: { label: "PACER • PROCEDURAL (Práctica)", bg: "rgba(16, 185, 129, 0.18)", border: "#10B981", color: "#A7F3D0" },
  ANALOGOUS: { label: "PACER • ANALOGOUS (Metáfora)", bg: "rgba(192, 132, 252, 0.18)", border: "#C084FC", color: "#E9D5FF" },
};

export const RetrievalPanel: React.FC<RetrievalPanelProps> = ({
  compilation, pacerFilter = "ALL", onPacerFilterChange, onFocusNode, onCloseDrawer, initialTab,
}) => {
  const [activeTab, setActiveTab] = useState<"STRUCTURE" | "DIAGNOSIS" | "SOCRATIC">(initialTab || "STRUCTURE");
  const [expandedOmissions, setExpandedOmissions] = useState<Record<number, boolean>>({});
  const isCognitiveLayerVisible = useCognitiveLayerStore((s) => s.isCognitiveLayerVisible);
  const toggleCognitiveLayer = useCognitiveLayerStore((s) => s.toggleCognitiveLayer);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  const graphNodes: KnowledgeNode[] = useMemo(() => {
    if (compilation.compiled_graph_payload?.nodes?.length) return compilation.compiled_graph_payload.nodes;
    return (compilation.nodes || []).map((n) => ({
      id: n.id,
      label: n.detected_content,
      domain: compilation.map_metadata?.domain_theme || "General",
      tier: n.pacer_classification === "REFERENCE" ? "primitive" : n.pacer_classification === "PROCEDURAL" ? "mechanism" : "system",
      pacerRole: (n.pacer_classification === "REFERENCE" || n.pacer_classification === "PROCEDURAL" || n.pacer_classification === "ANALOGOUS") ? n.pacer_classification : "NONE",
      summary: n.passive_context || "",
      verificationState: "unverified" as const,
      provenance: [{
        canvasId: "active",
        canvasTitle: compilation.map_metadata?.title || "Lienzo",
        boundingBox: { minX: n.visual_bounding_box.xmin, minY: n.visual_bounding_box.ymin, maxX: n.visual_bounding_box.xmax, maxY: n.visual_bounding_box.ymax },
      }],
    }));
  }, [compilation]);

  const graphEdges: KnowledgeEdge[] = useMemo(() => {
    if (compilation.compiled_graph_payload?.edges?.length) return compilation.compiled_graph_payload.edges;
    return (compilation.edges || []).map((e, idx) => ({
      id: `edge_${idx}`,
      fromNodeId: e.source_node_id,
      toNodeId: e.target_node_id,
      type: e.relation_nature === "OPPOSITION_CONTRAST" ? "INHIBITS" : e.relation_nature === "CONDITIONAL" ? "PREREQUISITE_OF" : "TRIGGERS",
      reasoning: e.label || "",
      confidence: 0.9,
    }));
  }, [compilation]);

  const diagnosis: ReasoningDiagnosis = useMemo(() => {
    const rawDiag = compilation.reasoningDiagnosis || compilation.compiled_graph_payload?.reasoningDiagnosis;
    const rawSyn = compilation.synthesis || compilation.compiled_graph_payload?.synthesis;
    const fallbackChallenges = graphEdges.map((e) => ({
      targetMechanism: `${e.fromNodeId} ➔ ${e.toNodeId}`,
      counterfactualQuestion: e.reasoning,
      expectedInvariant: "Preservación de estado y causalidad entre mecanismos.",
    }));
    return {
      misconceptions: rawDiag?.misconceptions || [],
      omissions: rawDiag?.omissions?.length ? rawDiag.omissions : rawSyn?.blindSpots || [],
      ghostConnections: rawDiag?.ghostConnections?.length ? rawDiag.ghostConnections : rawSyn?.ghostConnections || [],
      socraticChallenges: rawDiag?.socraticChallenges?.length
        ? rawDiag.socraticChallenges
        : rawSyn?.socraticChallenges?.length
        ? rawSyn.socraticChallenges.map((c) => ({ targetMechanism: c.edgeTarget, counterfactualQuestion: c.counterfactualQuestion, expectedInvariant: "" }))
        : fallbackChallenges,
    };
  }, [compilation, graphEdges]);

  const mapTitle = compilation.compiled_graph_payload?.canvasTitle || compilation.map_metadata?.title || "Mapa Cognitivo";

  const focusMechanismByName = (targetText: string) => {
    const t = targetText.toLowerCase();
    const matched = graphNodes.find((n) => t.includes(n.label.toLowerCase()) || t.includes(n.id.toLowerCase()));
    const box = matched?.provenance?.[0]?.boundingBox || graphNodes[0]?.provenance?.[0]?.boundingBox;
    if (box && onFocusNode) onFocusNode(box); else onCloseDrawer?.();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={styles.brandPill}>
            <Sparkles size={12} color="#38BDF8" strokeWidth={2.0} />
            <Text style={styles.brandPillText}>COGNITIVE CANVAS • LEARNHARNESS</Text>
          </View>
          <View style={styles.statsBadge}>
            <Text style={styles.statsBadgeText}>{graphNodes.length} nodos • {graphEdges.length} enlaces</Text>
          </View>
        </View>
        <Text style={styles.mapTitle} numberOfLines={1}>{mapTitle}</Text>
        <View style={styles.visibilityRow}>
          <TouchableOpacity
            style={[styles.visibilityBtn, isCognitiveLayerVisible ? styles.visibilityBtnOn : styles.visibilityBtnOff]}
            onPress={toggleCognitiveLayer}
          >
            {isCognitiveLayerVisible ? <Eye size={14} color="#38BDF8" strokeWidth={2.0} /> : <EyeOff size={14} color="#94A3B8" strokeWidth={2.0} />}
            <Text style={styles.visibilityBtnText}>{isCognitiveLayerVisible ? "Capa Cognitiva Activa" : "Capa Oculta"}</Text>
          </TouchableOpacity>
          {onPacerFilterChange && (
            <View style={styles.filterRow}>
              {(["ALL", "PROCEDURAL", "REFERENCE", "ANALOGOUS"] as const).map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterChip, pacerFilter === f && styles.filterChipActive]}
                  onPress={() => onPacerFilterChange(f)}
                >
                  <Text style={[styles.filterChipText, pacerFilter === f && styles.filterChipTextActive]}>
                    {f === "ALL" ? "Todos" : f.slice(0, 4)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      <View style={styles.tabsBar}>
        {([
          { id: "STRUCTURE", label: "Arquitectura y Nodos", Icon: Layers },
          { id: "DIAGNOSIS", label: "Puntos Ciegos y Falacias", Icon: GitBranch },
          { id: "SOCRATIC", label: "Auditoría Socrática", Icon: HelpCircle },
        ] as const).map(({ id, label, Icon }) => (
          <TouchableOpacity
            key={id}
            style={[styles.tabButton, activeTab === id && styles.tabButtonActive]}
            onPress={() => setActiveTab(id)}
          >
            <Icon size={13} color={activeTab === id ? "#FFF" : "#94A3B8"} />
            <Text style={[styles.tabText, activeTab === id && styles.tabTextActive]} numberOfLines={1}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activeTab === "STRUCTURE" && (
          <ArchitectureTab
            nodes={graphNodes}
            onFocus={(node) => {
              const bbox = node.provenance?.[0]?.boundingBox;
              if (bbox && onFocusNode) onFocusNode(bbox);
              else if (onCloseDrawer) onCloseDrawer();
            }}
          />
        )}

        {activeTab === "DIAGNOSIS" && (
          <View style={{ gap: 12 }}>
            <Text style={styles.sectionTitle}>Falacias y Modelos Inválidos ({diagnosis.misconceptions.length})</Text>
            {diagnosis.misconceptions.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyBoxText}>No se detectaron contradicciones causales en tu explicación.</Text>
              </View>
            ) : (
              diagnosis.misconceptions.map((mc, idx) => (
                <View key={`mc_${idx}`} style={styles.misconceptionCard}>
                  <Text style={styles.misconceptionTitle}>🚨 RUPTURA DE MODELO DETECTADA</Text>
                  <Text style={styles.misconceptionClaim}>{`Aseveración del Estudiante: "${mc.studentClaim}"`}</Text>
                  <Text style={styles.misconceptionFlaw}>{`Ruptura de Modelo: "${mc.flawExplanation}"`}</Text>
                  {!!mc.remediationTarget && <Text style={styles.misconceptionTarget}>Objetivo: {mc.remediationTarget}</Text>}
                </View>
              ))
            )}

            <Text style={styles.sectionTitle}>Omisiones Estructurales ({diagnosis.omissions.length})</Text>
            {diagnosis.omissions.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyBoxText}>No se detectaron omisiones estructurales críticas.</Text>
              </View>
            ) : (
              diagnosis.omissions.map((om, idx) => {
                const isExp = expandedOmissions[idx] ?? true;
                return (
                  <TouchableOpacity
                    key={`om_${idx}`}
                    style={styles.blindSpotCard}
                    onPress={() => setExpandedOmissions((prev) => ({ ...prev, [idx]: !isExp }))}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.nodeLabel}>⚠️ {om.missingConcept} {isExp ? "▾" : "▸"}</Text>
                    {isExp && <Text style={styles.summaryText}>{om.significance}</Text>}
                  </TouchableOpacity>
                );
              })
            )}

            <Text style={styles.sectionTitle}>Conexiones Cruzadas (Ghost Links)</Text>
            {diagnosis.ghostConnections.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyBoxText}>No se detectaron enlaces fantasma pendientes entre islas.</Text>
              </View>
            ) : (
              diagnosis.ghostConnections.map((gc, idx) => (
                <View key={`ghost_${idx}`} style={styles.ghostCard}>
                  <View style={styles.edgeRouteRow}>
                    <Text style={styles.edgeEndpoint}>{gc.clusterA}</Text>
                    <Text style={styles.edgeArrow}>⇄</Text>
                    <Text style={styles.edgeEndpoint}>{gc.clusterB}</Text>
                  </View>
                  <Text style={styles.summaryText}>{gc.tensionQuestion}</Text>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === "SOCRATIC" &&
          (diagnosis.socraticChallenges.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyBoxText}>
                Conecta tus conceptos con flechas direccionales o graba tu explicación verbal para desbloquear la auditoría socrática.
              </Text>
            </View>
          ) : (
            diagnosis.socraticChallenges.map((ch, idx) => (
              <View key={`soc_${idx}`} style={styles.card}>
                <Text style={styles.socraticTargetText}>Target: {ch.targetMechanism}</Text>
                <Text style={styles.socraticPromptText}>{ch.counterfactualQuestion}</Text>
                {!!ch.expectedInvariant && <Text style={styles.invariantText}>Invariante: {ch.expectedInvariant}</Text>}
                <View style={styles.actionButtonsRow}>
                  <TouchableOpacity
                    style={styles.voiceActionBtn}
                    onPress={() => {
                      onCloseDrawer?.();
                      Alert.alert("🎙️ Responder por Voz", `Selecciona "${ch.targetMechanism}" con el lazo en el lienzo y graba un Thinking Memo defendiendo este invariante.`);
                    }}
                  >
                    <Text style={styles.voiceActionText}>[ 🎙️ Responder por Voz ]</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.canvasActionBtn} onPress={() => focusMechanismByName(ch.targetMechanism)}>
                    <Text style={styles.canvasActionText}>[ 🎯 Enfocar en Canvas ]</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ))}
      </ScrollView>
    </View>
  );
};
