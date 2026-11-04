import React, { useState, useMemo, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import {
  Layers,
  GitBranch,
  HelpCircle,
  Eye,
  EyeOff,
  Mic,
  Crosshair,
  ChevronDown,
  ChevronRight,
  ArrowRight,
} from "@sketchyicons/react-native";
import {
  CognitiveCompilerOutput,
  PacerClassification,
  KnowledgeNode,
  KnowledgeEdge,
  ReasoningDiagnosis,
} from "@cognitive-canvas/core/types";
import { useCognitiveLayerStore } from "../stores/useCognitiveLayerStore";
import { ArchitectureTab } from "./drawer/tabs/ArchitectureTab";
import { useSkin, fonts, radius, border } from "../theme";
import { styles } from "./RetrievalPanel.styles";

export interface RetrievalPanelProps {
  compilation: CognitiveCompilerOutput;
  strokeCount?: number;
  pacerFilter?: PacerClassification | "ALL";
  onPacerFilterChange?: (filter: PacerClassification | "ALL") => void;
  showPacerOverlay?: boolean;
  onTogglePacerOverlay?: () => void;
  onFocusNode?: (box: { minX: number; minY: number; maxX: number; maxY: number }) => void;
  onCloseDrawer?: () => void;
  initialTab?: "STRUCTURE" | "DIAGNOSIS" | "SOCRATIC";
}

const PACER_FILTERS: Array<{ id: PacerClassification | "ALL"; label: string }> = [
  { id: "ALL", label: "TODOS" },
  { id: "PROCEDURAL", label: "PROC" },
  { id: "ANALOGOUS", label: "ANAL" },
  { id: "CONCEPTUAL", label: "CONC" },
  { id: "EVIDENCE", label: "EVID" },
  { id: "REFERENCE", label: "REFE" },
];

export const RetrievalPanel: React.FC<RetrievalPanelProps> = ({
  compilation,
  strokeCount = 0,
  pacerFilter = "ALL",
  onPacerFilterChange,
  onFocusNode,
  onCloseDrawer,
  initialTab,
}) => {
  const { skin } = useSkin();
  const [activeTab, setActiveTab] = useState<"STRUCTURE" | "DIAGNOSIS" | "SOCRATIC">(
    initialTab || "STRUCTURE"
  );
  const [expandedOmissions, setExpandedOmissions] = useState<Record<number, boolean>>({});
  const isCognitiveLayerVisible = useCognitiveLayerStore((s) => s.isCognitiveLayerVisible);
  const toggleCognitiveLayer = useCognitiveLayerStore((s) => s.toggleCognitiveLayer);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  const graphNodes: KnowledgeNode[] = useMemo(() => {
    if (compilation.compiled_graph_payload?.nodes?.length) {
      return compilation.compiled_graph_payload.nodes;
    }
    return (compilation.nodes || []).map((n) => ({
      id: n.id,
      label: n.detected_content,
      domain: compilation.map_metadata?.domain_theme || "General",
      tier:
        n.pacer_classification === "REFERENCE"
          ? "primitive"
          : n.pacer_classification === "PROCEDURAL"
          ? "mechanism"
          : "system",
      pacerRole:
        n.pacer_classification === "REFERENCE" ||
        n.pacer_classification === "PROCEDURAL" ||
        n.pacer_classification === "ANALOGOUS"
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
    if (compilation.compiled_graph_payload?.edges?.length) {
      return compilation.compiled_graph_payload.edges;
    }
    return (compilation.edges || []).map((e, idx) => ({
      id: `edge_${idx}`,
      fromNodeId: e.source_node_id,
      toNodeId: e.target_node_id,
      type:
        e.relation_nature === "OPPOSITION_CONTRAST"
          ? "INHIBITS"
          : e.relation_nature === "CONDITIONAL"
          ? "PREREQUISITE_OF"
          : "TRIGGERS",
      reasoning: e.label || "",
      confidence: 0.9,
    }));
  }, [compilation]);

  const diagnosis: ReasoningDiagnosis = useMemo(() => {
    const rawDiag =
      compilation.reasoningDiagnosis || compilation.compiled_graph_payload?.reasoningDiagnosis;
    const rawSyn = compilation.synthesis || compilation.compiled_graph_payload?.synthesis;
    const fallbackChallenges = graphEdges.map((e) => ({
      targetMechanism: `${e.fromNodeId} ➔ ${e.toNodeId}`,
      counterfactualQuestion: e.reasoning,
      expectedInvariant: "Preservación de estado y causalidad entre mecanismos.",
    }));
    return {
      misconceptions: rawDiag?.misconceptions || [],
      omissions: rawDiag?.omissions?.length
        ? rawDiag.omissions
        : rawSyn?.blindSpots || [],
      ghostConnections: rawDiag?.ghostConnections?.length
        ? rawDiag.ghostConnections
        : rawSyn?.ghostConnections || [],
      socraticChallenges: rawDiag?.socraticChallenges?.length
        ? rawDiag.socraticChallenges
        : rawSyn?.socraticChallenges?.length
        ? rawSyn.socraticChallenges.map((c) => ({
            targetMechanism: c.edgeTarget,
            counterfactualQuestion: c.counterfactualQuestion,
            expectedInvariant: "",
          }))
        : fallbackChallenges,
    };
  }, [compilation, graphEdges]);

  const mapTitle =
    compilation.compiled_graph_payload?.canvasTitle ||
    compilation.map_metadata?.title ||
    "Mapa Cognitivo";

  const totalBlindSpots =
    diagnosis.misconceptions.length +
    diagnosis.omissions.length +
    diagnosis.ghostConnections.length;

  const focusMechanismByName = (targetText: string) => {
    const t = targetText.toLowerCase();
    const matched = graphNodes.find(
      (n) => t.includes(n.label.toLowerCase()) || t.includes(n.id.toLowerCase())
    );
    const box =
      matched?.provenance?.[0]?.boundingBox || graphNodes[0]?.provenance?.[0]?.boundingBox;
    if (box && onFocusNode) onFocusNode(box);
    else onCloseDrawer?.();
  };

  return (
    <View style={[styles.container, { backgroundColor: skin.surface }]}>
      {/* ──────────────── Encabezado Compacto (§5) ──────────────── */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: skin.surfaceAlt,
            borderBottomColor: skin.borderSoft,
            borderBottomWidth: border.soft,
          },
        ]}
      >
        {/* Línea Mono: TRAZOS · NODOS · ENLACES · LEARNHARNESS */}
        <Text
          style={[
            styles.monoStatsLine,
            { color: skin.textMuted, fontFamily: fonts.monoBold },
          ]}
        >
          {strokeCount > 0 ? `${strokeCount} TRAZOS · ` : ""}
          {graphNodes.length} NODOS · {graphEdges.length} ENLACES · LEARNHARNESS
        </Text>

        {/* Título del Mapa (máx 2 líneas) */}
        <Text
          style={[
            styles.mapTitle,
            { color: skin.text, fontFamily: fonts.display },
          ]}
          numberOfLines={2}
        >
          {mapTitle.toUpperCase()}
        </Text>

        {/* Fila de Controles: Capa Activa (Ojo) + Filtros PACER */}
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={[
              styles.layerToggleBtn,
              {
                backgroundColor: isCognitiveLayerVisible ? `${skin.primary}18` : skin.surface,
                borderColor: isCognitiveLayerVisible ? skin.primary : skin.borderSoft,
                borderWidth: border.soft,
                borderRadius: radius.pill,
              },
            ]}
            onPress={toggleCognitiveLayer}
            activeOpacity={0.75}
          >
            {isCognitiveLayerVisible ? (
              <Eye size={13} color={skin.primary} strokeWidth={2.0} />
            ) : (
              <EyeOff size={13} color={skin.textMuted} strokeWidth={2.0} />
            )}
            <Text
              style={[
                styles.layerToggleText,
                {
                  color: isCognitiveLayerVisible ? skin.primary : skin.textMuted,
                  fontFamily: fonts.monoBold,
                },
              ]}
            >
              {isCognitiveLayerVisible ? "Capa activa" : "Capa oculta"}
            </Text>
          </TouchableOpacity>

          {/* Filtros PACER completos: TODOS, PROC, ANAL, CONC, EVID, REFE */}
          {onPacerFilterChange && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pacerScrollContent}
              style={styles.pacerScroll}
            >
              {PACER_FILTERS.map((item) => {
                const isSelected = pacerFilter === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.pacerChip,
                      {
                        backgroundColor: isSelected ? skin.primary : skin.surface,
                        borderColor: isSelected ? skin.primary : skin.borderSoft,
                        borderWidth: border.soft,
                        borderRadius: radius.pill,
                      },
                    ]}
                    onPress={() => onPacerFilterChange(item.id)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.pacerChipText,
                        {
                          color: isSelected ? skin.onPrimary : skin.textMuted,
                          fontFamily: fonts.monoBold,
                        },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>

      {/* ──────────────── Pestañas con Contador (§5) ──────────────── */}
      <View
        style={[
          styles.tabsRow,
          {
            backgroundColor: skin.surface,
            borderBottomColor: skin.borderSoft,
            borderBottomWidth: border.soft,
          },
        ]}
      >
        {[
          {
            id: "STRUCTURE" as const,
            label: "Nodos",
            count: graphNodes.length,
            Icon: Layers,
          },
          {
            id: "DIAGNOSIS" as const,
            label: "Puntos ciegos",
            count: totalBlindSpots,
            Icon: GitBranch,
          },
          {
            id: "SOCRATIC" as const,
            label: "Auditoría",
            count: diagnosis.socraticChallenges.length,
            Icon: HelpCircle,
          },
        ].map(({ id, label, count, Icon }) => {
          const isActive = activeTab === id;
          return (
            <TouchableOpacity
              key={id}
              style={[
                styles.tabItem,
                {
                  backgroundColor: isActive ? skin.surfaceAlt : "transparent",
                  borderBottomColor: isActive ? skin.primary : "transparent",
                  borderBottomWidth: isActive ? 2 : 0,
                },
              ]}
              onPress={() => setActiveTab(id)}
              activeOpacity={0.75}
            >
              <Icon
                size={13}
                color={isActive ? skin.primary : skin.textMuted}
                strokeWidth={2.0}
              />
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isActive ? skin.text : skin.textMuted,
                    fontFamily: isActive ? fonts.uiBold : fonts.ui,
                  },
                ]}
              >
                {label}
              </Text>
              <View
                style={[
                  styles.tabBadge,
                  {
                    backgroundColor: isActive ? `${skin.primary}22` : skin.surfaceAlt,
                    borderColor: isActive ? skin.primary : skin.borderSoft,
                    borderWidth: border.soft,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tabBadgeText,
                    {
                      color: isActive ? skin.primary : skin.textMuted,
                      fontFamily: fonts.monoBold,
                    },
                  ]}
                >
                  {count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ──────────────── Contenido de la Pestaña ──────────────── */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 1. NODOS / ARQUITECTURA */}
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

        {/* 2. PUNTOS CIEGOS (Tres secciones: Falacias, Omisiones, Ghost Links) */}
        {activeTab === "DIAGNOSIS" && (
          <View style={styles.sectionStack}>
            {/* Sección A: Falacias y Modelos Inválidos */}
            <View style={styles.subSection}>
              <View style={styles.subSectionHeader}>
                <Text
                  style={[
                    styles.subSectionTitle,
                    { color: skin.alert, fontFamily: fonts.monoBold },
                  ]}
                >
                  FALACIAS & MODELOS INVÁLIDOS ({diagnosis.misconceptions.length})
                </Text>
              </View>

              {diagnosis.misconceptions.length === 0 ? (
                <View
                  style={[
                    styles.emptyNotice,
                    { backgroundColor: skin.surfaceAlt, borderColor: skin.borderSoft },
                  ]}
                >
                  <Text style={[styles.emptyNoticeText, { color: skin.textMuted, fontFamily: fonts.ui }]}>
                    No se detectaron contradicciones causales ni rupturas de modelo.
                  </Text>
                </View>
              ) : (
                diagnosis.misconceptions.map((mc, idx) => (
                  <View
                    key={`mc_${idx}`}
                    style={[
                      styles.misconceptionCard,
                      {
                        backgroundColor: `${skin.alert}12`,
                        borderColor: skin.alert,
                        borderWidth: border.strong,
                        borderRadius: radius.card,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.cardCategoryLabel,
                        { color: skin.alert, fontFamily: fonts.monoBold },
                      ]}
                    >
                      RUPTURA DE MODELO
                    </Text>

                    {/* Bloque "Tú dijiste" */}
                    <View style={styles.quoteBlock}>
                      <Text
                        style={[
                          styles.quoteLabel,
                          { color: skin.textMuted, fontFamily: fonts.mono },
                        ]}
                      >
                        TÚ DIJISTE
                      </Text>
                      <Text
                        style={[
                          styles.studentClaimText,
                          { color: skin.text, fontFamily: fonts.uiSemi },
                        ]}
                      >
                        "{mc.studentClaim}"
                      </Text>
                    </View>

                    {/* Bloque "Lo correcto" */}
                    <View style={styles.flawBlock}>
                      <Text
                        style={[
                          styles.flawLabel,
                          { color: skin.alert, fontFamily: fonts.mono },
                        ]}
                      >
                        LO CORRECTO
                      </Text>
                      <Text
                        style={[
                          styles.flawExplanationText,
                          { color: skin.text, fontFamily: fonts.ui },
                        ]}
                      >
                        {mc.flawExplanation}
                      </Text>
                    </View>

                    {!!mc.remediationTarget && (
                      <View style={styles.remediationRow}>
                        <Text
                          style={[
                            styles.remediationTag,
                            { color: skin.warm, fontFamily: fonts.monoBold },
                          ]}
                        >
                          OBJETIVO:
                        </Text>
                        <Text
                          style={[
                            styles.remediationText,
                            { color: skin.text, fontFamily: fonts.uiBold },
                          ]}
                        >
                          {mc.remediationTarget}
                        </Text>
                      </View>
                    )}
                  </View>
                ))
              )}
            </View>

            {/* Sección B: Omisiones Estructurales (Tarjeta Ámbar Punteada) */}
            <View style={styles.subSection}>
              <View style={styles.subSectionHeader}>
                <Text
                  style={[
                    styles.subSectionTitle,
                    { color: skin.warm, fontFamily: fonts.monoBold },
                  ]}
                >
                  OMISIONES ESTRUCTURALES ({diagnosis.omissions.length})
                </Text>
              </View>

              {diagnosis.omissions.length === 0 ? (
                <View
                  style={[
                    styles.emptyNotice,
                    { backgroundColor: skin.surfaceAlt, borderColor: skin.borderSoft },
                  ]}
                >
                  <Text style={[styles.emptyNoticeText, { color: skin.textMuted, fontFamily: fonts.ui }]}>
                    No se detectaron omisiones críticas de conceptos clave.
                  </Text>
                </View>
              ) : (
                diagnosis.omissions.map((om, idx) => {
                  const isExp = expandedOmissions[idx] ?? true;
                  return (
                    <TouchableOpacity
                      key={`om_${idx}`}
                      style={[
                        styles.omissionCard,
                        {
                          backgroundColor: `${skin.warm}10`,
                          borderColor: skin.warm,
                          borderWidth: border.strong,
                          borderRadius: radius.card,
                          borderStyle: "dashed",
                        },
                      ]}
                      onPress={() =>
                        setExpandedOmissions((prev) => ({ ...prev, [idx]: !isExp }))
                      }
                      activeOpacity={0.8}
                    >
                      <View style={styles.omissionHeaderRow}>
                        <Text
                          style={[
                            styles.omissionConceptName,
                            { color: skin.warm, fontFamily: fonts.display },
                          ]}
                        >
                          {om.missingConcept.toUpperCase()}
                        </Text>
                        {isExp ? (
                          <ChevronDown size={14} color={skin.warm} strokeWidth={2.0} />
                        ) : (
                          <ChevronRight size={14} color={skin.warm} strokeWidth={2.0} />
                        )}
                      </View>
                      {isExp && (
                        <Text
                          style={[
                            styles.omissionSignificanceText,
                            { color: skin.text, fontFamily: fonts.ui },
                          ]}
                        >
                          {om.significance}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </View>

            {/* Sección C: Conexiones Cruzadas / Ghost Links */}
            <View style={styles.subSection}>
              <View style={styles.subSectionHeader}>
                <Text
                  style={[
                    styles.subSectionTitle,
                    { color: skin.primary, fontFamily: fonts.monoBold },
                  ]}
                >
                  CONEXIONES CRUZADAS · GHOST LINKS ({diagnosis.ghostConnections.length})
                </Text>
              </View>

              {diagnosis.ghostConnections.length === 0 ? (
                <View
                  style={[
                    styles.emptyNotice,
                    { backgroundColor: skin.surfaceAlt, borderColor: skin.borderSoft },
                  ]}
                >
                  <Text style={[styles.emptyNoticeText, { color: skin.textMuted, fontFamily: fonts.ui }]}>
                    No se detectaron tensiones dialécticas o enlaces cruzados pendientes.
                  </Text>
                </View>
              ) : (
                diagnosis.ghostConnections.map((gc, idx) => (
                  <View
                    key={`ghost_${idx}`}
                    style={[
                      styles.ghostCard,
                      {
                        backgroundColor: skin.surfaceAlt,
                        borderColor: skin.borderSoft,
                        borderWidth: border.soft,
                        borderRadius: radius.card,
                      },
                    ]}
                  >
                    <View style={styles.ghostClusterRow}>
                      <View
                        style={[
                          styles.clusterPill,
                          {
                            backgroundColor: skin.surface,
                            borderColor: skin.primary,
                            borderWidth: border.soft,
                            borderRadius: radius.pill,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.clusterPillText,
                            { color: skin.text, fontFamily: fonts.monoBold },
                          ]}
                        >
                          {gc.clusterA}
                        </Text>
                      </View>
                      <ArrowRight size={14} color={skin.primary} strokeWidth={2.0} />
                      <View
                        style={[
                          styles.clusterPill,
                          {
                            backgroundColor: skin.surface,
                            borderColor: skin.primary,
                            borderWidth: border.soft,
                            borderRadius: radius.pill,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.clusterPillText,
                            { color: skin.text, fontFamily: fonts.monoBold },
                          ]}
                        >
                          {gc.clusterB}
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={[
                        styles.ghostTensionText,
                        { color: skin.text, fontFamily: fonts.ui },
                      ]}
                    >
                      {gc.tensionQuestion}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {/* 3. AUDITORÍA SOCRÁTICA (Target + Pregunta como protagonistas) */}
        {activeTab === "SOCRATIC" && (
          <View style={styles.sectionStack}>
            {diagnosis.socraticChallenges.length === 0 ? (
              <View
                style={[
                  styles.emptyNotice,
                  { backgroundColor: skin.surfaceAlt, borderColor: skin.borderSoft },
                ]}
              >
                <Text style={[styles.emptyNoticeText, { color: skin.textMuted, fontFamily: fonts.ui }]}>
                  Conecta tus conceptos con flechas direccionales o graba tu explicación verbal para desbloquear la auditoría socrática.
                </Text>
              </View>
            ) : (
              diagnosis.socraticChallenges.map((ch, idx) => (
                <View
                  key={`soc_${idx}`}
                  style={[
                    styles.socraticCard,
                    {
                      backgroundColor: skin.surface,
                      borderColor: skin.borderSoft,
                      borderWidth: border.soft,
                      borderRadius: radius.card,
                    },
                  ]}
                >
                  {/* Target Protagonista */}
                  <View style={styles.socraticHeaderRow}>
                    <Text
                      style={[
                        styles.socraticTargetTag,
                        { color: skin.primary, fontFamily: fonts.monoBold },
                      ]}
                    >
                      MECANISMO OBJETIVO
                    </Text>
                    <Text
                      style={[
                        styles.socraticTargetName,
                        { color: skin.text, fontFamily: fonts.display },
                      ]}
                    >
                      {ch.targetMechanism.toUpperCase()}
                    </Text>
                  </View>

                  {/* Pregunta Desafío Protagonista (Grande) */}
                  <Text
                    style={[
                      styles.socraticQuestionText,
                      { color: skin.text, fontFamily: fonts.uiBold },
                    ]}
                  >
                    {ch.counterfactualQuestion}
                  </Text>

                  {/* Invariante como nota al pie sutil */}
                  {!!ch.expectedInvariant && (
                    <View
                      style={[
                        styles.socraticInvariantFooter,
                        { borderTopColor: skin.borderSoft, borderTopWidth: border.soft },
                      ]}
                    >
                      <Text
                        style={[
                          styles.socraticInvariantLabel,
                          { color: skin.textMuted, fontFamily: fonts.monoBold },
                        ]}
                      >
                        INVARIANTE ESPERADO
                      </Text>
                      <Text
                        style={[
                          styles.socraticInvariantBody,
                          { color: skin.textMuted, fontFamily: fonts.ui },
                        ]}
                      >
                        {ch.expectedInvariant}
                      </Text>
                    </View>
                  )}

                  {/* Acciones: Responder por Voz y Enfocar */}
                  <View style={styles.socraticActionsRow}>
                    <TouchableOpacity
                      style={[
                        styles.socraticActionBtn,
                        {
                          backgroundColor: `${skin.primary}14`,
                          borderColor: skin.primary,
                          borderWidth: border.soft,
                          borderRadius: radius.pill,
                        },
                      ]}
                      onPress={() => {
                        onCloseDrawer?.();
                        Alert.alert(
                          "Responder por voz",
                          `Selecciona "${ch.targetMechanism}" con el lazo en el lienzo y graba un Thinking Memo defendiendo este invariante.`
                        );
                      }}
                      activeOpacity={0.75}
                    >
                      <Mic size={13} color={skin.primary} strokeWidth={2.0} />
                      <Text
                        style={[
                          styles.socraticActionBtnText,
                          { color: skin.primary, fontFamily: fonts.uiBold },
                        ]}
                      >
                        Responder por voz
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.socraticActionBtn,
                        {
                          backgroundColor: skin.surfaceAlt,
                          borderColor: skin.borderSoft,
                          borderWidth: border.soft,
                          borderRadius: radius.pill,
                        },
                      ]}
                      onPress={() => focusMechanismByName(ch.targetMechanism)}
                      activeOpacity={0.75}
                    >
                      <Crosshair size={13} color={skin.text} strokeWidth={2.0} />
                      <Text
                        style={[
                          styles.socraticActionBtnText,
                          { color: skin.text, fontFamily: fonts.uiBold },
                        ]}
                      >
                        Enfocar en lienzo
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};
