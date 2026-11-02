import React, { useState, useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { Layers, GitBranch, HelpCircle, Eye, EyeOff, Sparkles } from "@sketchyicons/react-native";
import { CognitiveCompilerOutput, PacerClassification, KnowledgeNode, KnowledgeEdge, ConceptTier, PacerRole, CognitiveSynthesis } from "@cognitive-canvas/core/types";
import { useCognitiveLayerStore } from "../stores/useCognitiveLayerStore";
import { styles } from "./RetrievalPanel.styles";

export interface RetrievalPanelProps {
  compilation: CognitiveCompilerOutput;
  pacerFilter?: PacerClassification | "ALL";
  onPacerFilterChange?: (filter: PacerClassification | "ALL") => void;
  showPacerOverlay?: boolean;
  onTogglePacerOverlay?: () => void;
  onFocusNode?: (box: { minX: number; minY: number; maxX: number; maxY: number }) => void;
  onCloseDrawer?: () => void;
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
  compilation,
  pacerFilter = "ALL",
  onPacerFilterChange,
  onFocusNode,
  onCloseDrawer,
}) => {
  const [activeTab, setActiveTab] = useState<"STRUCTURE" | "SYNTHESIS" | "SOCRATIC">("STRUCTURE");
  const isCognitiveLayerVisible = useCognitiveLayerStore((s) => s.isCognitiveLayerVisible);
  const toggleCognitiveLayer = useCognitiveLayerStore((s) => s.toggleCognitiveLayer);

  const graphNodes: KnowledgeNode[] = useMemo(() => {
    if (compilation.compiled_graph_payload?.nodes?.length) {
      return compilation.compiled_graph_payload.nodes;
    }
    return (compilation.nodes || []).map((n) => ({
      id: n.id,
      label: n.detected_content,
      domain: compilation.map_metadata?.domain_theme || "General",
      tier: n.pacer_classification === "REFERENCE" ? "primitive" : n.pacer_classification === "PROCEDURAL" ? "mechanism" : "system",
      pacerRole:
        n.pacer_classification === "REFERENCE" || n.pacer_classification === "PROCEDURAL" || n.pacer_classification === "ANALOGOUS"
          ? n.pacer_classification
          : "NONE",
      summary: n.passive_context || "",
      verificationState: "unverified" as const,
      provenance: [
        {
          canvasId: "active",
          canvasTitle: compilation.map_metadata?.title || "Lienzo",
          boundingBox: {
            minX: n.visual_bounding_box.xmin,
            minY: n.visual_bounding_box.ymin,
            maxX: n.visual_bounding_box.xmax,
            maxY: n.visual_bounding_box.ymax,
          },
        },
      ],
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

  const synthesis: CognitiveSynthesis = useMemo(() => {
    const raw = compilation.synthesis || compilation.compiled_graph_payload?.synthesis;
    const fallbackChallenges = graphEdges.map((e) => ({
      edgeTarget: `${e.fromNodeId} ➔ ${e.toNodeId}`,
      counterfactualQuestion: e.reasoning,
    }));
    return {
      systemSummary: raw?.systemSummary || compilation.map_overview?.maturity_diagnosis || "",
      ghostConnections: raw?.ghostConnections || [],
      blindSpots: raw?.blindSpots || [],
      socraticChallenges: raw?.socraticChallenges?.length ? raw.socraticChallenges : fallbackChallenges,
    };
  }, [compilation, graphEdges]);

  const mapTitle = compilation.compiled_graph_payload?.canvasTitle || compilation.map_metadata?.title || "Mapa Cognitivo";

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={styles.brandPill}>
            <Sparkles size={12} color="#38BDF8" strokeWidth={2.0} />
            <Text style={styles.brandPillText}>COGNITIVE CANVAS • ARCHITECT</Text>
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
          { id: "SYNTHESIS", label: "Síntesis y Puntos Ciegos", Icon: GitBranch },
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
        {activeTab === "STRUCTURE" &&
          (["system", "mechanism", "primitive"] as ConceptTier[]).map((tierKey) => {
            const tierNodes = graphNodes.filter((n) => n.tier === tierKey);
            if (tierNodes.length === 0) return null;
            const cfg = TIER_CONFIG[tierKey];
            return (
              <View key={tierKey} style={{ gap: 10 }}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{cfg.title} ({tierNodes.length})</Text>
                </View>
                {tierNodes.map((node) => {
                  const bbox = node.provenance?.[0]?.boundingBox;
                  const pacerRole = node.pacerRole && node.pacerRole !== "NONE" ? PACER_ROLE_BADGE[node.pacerRole] : null;
                  return (
                    <View key={node.id} style={styles.card}>
                      <View style={styles.nodeHeaderRow}>
                        <Text style={styles.nodeLabel}>{node.label}</Text>
                        {bbox && onFocusNode && (
                          <TouchableOpacity style={styles.focusButton} onPress={() => onFocusNode(bbox)}>
                            <Text style={styles.focusButtonText}>[ 🎯 Enfocar ]</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      <View style={styles.badgeRow}>
                        <View style={[styles.tierBadge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
                          <Text style={[styles.tierBadgeText, { color: cfg.color }]}>{cfg.badge}</Text>
                        </View>
                        {!!node.domain && (
                          <View style={styles.domainBadge}>
                            <Text style={styles.domainBadgeText}>{node.domain}</Text>
                          </View>
                        )}
                        {pacerRole && (
                          <View style={[styles.tierBadge, { backgroundColor: pacerRole.bg, borderColor: pacerRole.border }]}>
                            <Text style={[styles.tierBadgeText, { color: pacerRole.color }]}>{pacerRole.label}</Text>
                          </View>
                        )}
                      </View>
                      {!!node.summary && <Text style={styles.summaryText}>{node.summary}</Text>}
                    </View>
                  );
                })}
              </View>
            );
          })}

        {activeTab === "SYNTHESIS" && (
          <View style={{ gap: 14 }}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Resumen Global del Sistema</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.summaryText}>
                {synthesis.systemSummary || "Compila tu mapa con IA para generar el diagnóstico arquitectónico global del sistema."}
              </Text>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Conexiones Ocultas (Ghost Links)</Text>
            </View>
            {synthesis.ghostConnections.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyBoxText}>No se detectaron enlaces fantasma pendientes entre islas.</Text>
              </View>
            ) : (
              synthesis.ghostConnections.map((gc, idx) => (
                <View key={`ghost_${idx}`} style={styles.ghostCard}>
                  <View style={styles.edgeRouteRow}>
                    <Text style={styles.edgeEndpoint}>{gc.clusterA}</Text>
                    <Text style={styles.edgeArrow}>⟷</Text>
                    <Text style={styles.edgeEndpoint}>{gc.clusterB}</Text>
                  </View>
                  <Text style={styles.summaryText}>{gc.tensionQuestion}</Text>
                </View>
              ))
            )}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Puntos Ciegos Detectados</Text>
            </View>
            {synthesis.blindSpots.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyBoxText}>No se detectaron omisiones estructurales críticas.</Text>
              </View>
            ) : (
              synthesis.blindSpots.map((bs, idx) => (
                <View key={`blind_${idx}`} style={styles.blindSpotCard}>
                  <Text style={styles.nodeLabel}>⚠️ {bs.missingConcept}</Text>
                  <Text style={styles.summaryText}>{bs.significance}</Text>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === "SOCRATIC" &&
          (synthesis.socraticChallenges.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyBoxText}>
                Tu mapa aún no tiene flechas causales explícitas. Conecta tus conceptos con flechas direccionales para desbloquear la auditoría socrática.
              </Text>
            </View>
          ) : (
            synthesis.socraticChallenges.map((ch, idx) => (
              <View key={`soc_${idx}`} style={styles.card}>
                <Text style={styles.socraticTargetText}>🎯 Objetivo: {ch.edgeTarget}</Text>
                <Text style={styles.socraticPromptText}>{ch.counterfactualQuestion}</Text>
                <View style={styles.actionButtonsRow}>
                  <TouchableOpacity
                    style={styles.voiceActionBtn}
                    onPress={() => {
                      onCloseDrawer?.();
                      Alert.alert(
                        "🎙️ Responder con Voz",
                        `Selecciona el mecanismo "${ch.edgeTarget}" con el lazo en el lienzo y graba un Thinking Memo explicando tu defensa causal.`
                      );
                    }}
                  >
                    <Text style={styles.voiceActionText}>[ 🎙️ Responder con Voz ]</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.canvasActionBtn}
                    onPress={() => {
                      const matched = graphNodes.find(
                        (n) => ch.edgeTarget.toLowerCase().includes(n.label.toLowerCase()) || ch.edgeTarget.toLowerCase().includes(n.id.toLowerCase())
                      );
                      const box = matched?.provenance?.[0]?.boundingBox || graphNodes[0]?.provenance?.[0]?.boundingBox;
                      if (box && onFocusNode) {
                        onFocusNode(box);
                      } else {
                        onCloseDrawer?.();
                      }
                    }}
                  >
                    <Text style={styles.canvasActionText}>[ ✍️ Defender en Canvas ]</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ))}
      </ScrollView>
    </View>
  );
};
