import React, { useState } from "react";
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Alert } from "react-native";
import * as FileSystem from "expo-file-system";
import { CognitiveCompilerOutput, PacerClassification } from "@cognitive-canvas/core/types";
import { ankiClient } from "../services/AnkiConnectClient";
import { PACER_COLORS } from "./canvas/PacerOverlayLayer";

interface RetrievalPanelProps {
  compilation: CognitiveCompilerOutput | null;
  onRefresh?: () => void;
  pacerFilter?: PacerClassification | "ALL";
  onPacerFilterChange?: (filter: PacerClassification | "ALL") => void;
  showPacerOverlay?: boolean;
  onTogglePacerOverlay?: () => void;
}

export const RetrievalPanel: React.FC<RetrievalPanelProps> = ({
  compilation,
  pacerFilter = "ALL",
  onPacerFilterChange,
  showPacerOverlay = true,
  onTogglePacerOverlay,
}) => {
  const [hostIp, setHostIp] = useState<string>("192.168.1.100");
  const [syncStatus, setSyncStatus] = useState<string>("Sin sincronizar");
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"audit" | "pacer" | "anki" | "transfer" | "cases">("audit");
  const [internalFilter, setInternalFilter] = useState<PacerClassification | "ALL">(pacerFilter);

  const currentFilter = onPacerFilterChange ? pacerFilter : internalFilter;
  const setFilter = (f: PacerClassification | "ALL") => {
    if (onPacerFilterChange) {
      onPacerFilterChange(f);
    } else {
      setInternalFilter(f);
    }
  };

  const cards = compilation?.anki_flashcards || compilation?.learning_engine_outputs?.anki_flashcards || [];

  const handleExportTsv = async () => {
    if (!compilation || cards.length === 0) {
      Alert.alert("Sin tarjetas", "No hay tarjetas de memoria para exportar.");
      return;
    }
    try {
      const title = compilation.map_metadata?.title || "Mapa Mental";
      const tsvContent = ankiClient.exportToTsv(cards, title);
      const fileName = `anki_${Date.now()}.txt`;
      const filePath = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(filePath, tsvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      Alert.alert(
        "Exportación AnkiDroid Exitosa",
        `Se guardaron ${cards.length} tarjetas en:\n${filePath}\n\nPuedes importarlo desde AnkiDroid (Menú → Importar → Archivo de texto).`
      );
    } catch (err: any) {
      Alert.alert("Error de exportación", err?.message || String(err));
    }
  };

  const handleSyncAnki = async () => {
    if (!compilation || cards.length === 0) {
      Alert.alert("Sin tarjetas", "No hay tarjetas de memoria de alta fidelidad para sincronizar.");
      return;
    }

    setIsSyncing(true);
    setSyncStatus("Conectando con AnkiConnect...");

    try {
      ankiClient.setHostIp(hostIp);
      const isConnected = await ankiClient.checkConnection();

      if (!isConnected) {
        setSyncStatus("Error: No se pudo conectar a AnkiConnect en " + hostIp + ":8765");
        Alert.alert(
          "Error de Conexión",
          `Asegúrate de que Anki esté abierto en la PC (${hostIp}:8765) y AnkiConnect esté activo.`
        );
        setIsSyncing(false);
        return;
      }

      setSyncStatus("Sincronizando tarjetas...");
      const result = await ankiClient.syncFlashcards(cards);
      setSyncStatus(`Sincronizadas: ${result.synced} | Fallidas: ${result.failed}`);
      Alert.alert("Éxito Anki", `Se inyectaron ${result.synced} tarjetas en Anki Desktop.`);
    } catch (error: any) {
      setSyncStatus(`Error: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  if (!compilation) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Auditoría Cognitiva & Retención</Text>
        <Text style={styles.emptyText}>
          Dibuja tu mapa mental en el lienzo nativo Jetpack Ink y presiona "Compilar Canvas" para generar la estructura semántica.
        </Text>
      </View>
    );
  }

  const { grinde_audit, nodes = [] } = compilation;
  const anki_flashcards = compilation.anki_flashcards || compilation.learning_engine_outputs?.anki_flashcards || [];
  const high_road_transfer_prompts = compilation.high_road_transfer_prompts || compilation.learning_engine_outputs?.high_road_transfer_prompts || [];
  const derring_effect_challenges = compilation.derring_effect_challenges || compilation.learning_engine_outputs?.derring_effect_challenges || [];
  const contrasting_cases_icc = compilation.contrasting_cases_icc || compilation.learning_engine_outputs?.contrasting_cases_icc || [];

  const filteredNodes = currentFilter === "ALL"
    ? nodes
    : nodes.filter((n) => n.pacer_classification === currentFilter);

  return (
    <View style={styles.container}>
      {/* Tab Selector */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "audit" && styles.activeTab]}
          onPress={() => setActiveTab("audit")}
        >
          <Text style={[styles.tabText, activeTab === "audit" && styles.activeTabText]}>GRINDE</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "pacer" && styles.activeTab]}
          onPress={() => setActiveTab("pacer")}
        >
          <Text style={[styles.tabText, activeTab === "pacer" && styles.activeTabText]}>PACER ({nodes.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "anki" && styles.activeTab]}
          onPress={() => setActiveTab("anki")}
        >
          <Text style={[styles.tabText, activeTab === "anki" && styles.activeTabText]}>Anki ({anki_flashcards.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "transfer" && styles.activeTab]}
          onPress={() => setActiveTab("transfer")}
        >
          <Text style={[styles.tabText, activeTab === "transfer" && styles.activeTabText]}>Transferencia</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "cases" && styles.activeTab]}
          onPress={() => setActiveTab("cases")}
        >
          <Text style={[styles.tabText, activeTab === "cases" && styles.activeTabText]}>Casos (ICC)</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.contentScroll} contentContainerStyle={styles.scrollInner}>
        {/* TAB 1: GRINDE AUDIT */}
        {activeTab === "audit" && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Auditoría Pedagogía GRINDE</Text>
            <View style={styles.scoreRow}>
              <View style={styles.scoreMetric}>
                <Text style={styles.metricValue}>{(grinde_audit.cross_link_density_score * 100).toFixed(0)}%</Text>
                <Text style={styles.metricLabel}>Densidad Cross-Links</Text>
              </View>
              <View style={styles.scoreMetric}>
                <Text style={[styles.metricValue, { color: grinde_audit.linear_thinking_risk ? "#F43F5E" : "#10B981" }]}>
                  {grinde_audit.linear_thinking_risk ? "RIESGO ALTO" : "ÓPTIMO"}
                </Text>
                <Text style={styles.metricLabel}>Riesgo Lineal</Text>
              </View>
            </View>
            <Text style={styles.critiqueText}>{grinde_audit.feedback_critique}</Text>
          </View>
        )}

        {/* TAB 2: PACER TAXONOMY & INTERACTIVE FILTERS */}
        {activeTab === "pacer" && (
          <View style={styles.card}>
            <View style={styles.pacerHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Taxonomía PACER (Justin Sung)</Text>
                <Text style={styles.sectionSubtitle}>
                  Clasificación epistemológica de conceptos según su rol causal y deducibilidad.
                </Text>
              </View>
              {onTogglePacerOverlay && (
                <TouchableOpacity
                  style={[
                    styles.overlayToggleButton,
                    showPacerOverlay ? styles.overlayToggleActive : styles.overlayToggleInactive,
                  ]}
                  onPress={onTogglePacerOverlay}
                >
                  <Text style={styles.overlayToggleText}>
                    {showPacerOverlay ? "👁️ Lienzo ON" : "👁️ Lienzo OFF"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Filter Chips */}
            <View style={styles.pacerChipsRow}>
              <TouchableOpacity
                style={[
                  styles.pacerChip,
                  currentFilter === "ALL" && styles.pacerChipActive,
                ]}
                onPress={() => setFilter("ALL")}
              >
                <Text
                  style={[
                    styles.pacerChipText,
                    currentFilter === "ALL" && styles.pacerChipTextActive,
                  ]}
                >
                  Todos ({nodes.length})
                </Text>
              </TouchableOpacity>

              {(["CONCEPTUAL", "PROCEDURAL", "ANALOGOUS", "EVIDENCE", "REFERENCE"] as PacerClassification[]).map(
                (type) => {
                  const count = nodes.filter((n) => n.pacer_classification === type).length;
                  const info = PACER_COLORS[type];
                  const isSelected = currentFilter === type;

                  return (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.pacerChip,
                        { borderColor: info.borderColor },
                        isSelected && { backgroundColor: info.borderColor },
                      ]}
                      onPress={() => setFilter(type)}
                    >
                      <Text
                        style={[
                          styles.pacerChipText,
                          { color: isSelected ? "#FFFFFF" : info.color },
                        ]}
                      >
                        {info.letter} · {info.label} ({count})
                      </Text>
                    </TouchableOpacity>
                  );
                }
              )}
            </View>

            {/* Filtered Nodes List */}
            {filteredNodes.length === 0 ? (
              <Text style={styles.emptyFilterText}>No hay nodos en esta categoría.</Text>
            ) : (
              filteredNodes.map((node) => {
                const info = PACER_COLORS[node.pacer_classification];
                return (
                  <View key={node.id} style={styles.pacerNodeItem}>
                    <View style={styles.pacerNodeTopRow}>
                      <View style={[styles.pacerNodeBadge, { backgroundColor: info.borderColor }]}>
                        <Text style={styles.pacerNodeBadgeLetter}>{info.letter}</Text>
                      </View>
                      <Text style={styles.pacerNodeTitle}>{node.detected_content}</Text>
                      <View
                        style={[
                          styles.deducibleBadge,
                          {
                            backgroundColor: node.deducible_from_context
                              ? "rgba(16, 185, 129, 0.2)"
                              : "rgba(245, 158, 11, 0.2)",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.deducibleBadgeText,
                            {
                              color: node.deducible_from_context ? "#10B981" : "#F59E0B",
                            },
                          ]}
                        >
                          {node.deducible_from_context ? "Deducible en red" : "Memorizar en Anki"}
                        </Text>
                      </View>
                    </View>

                    {node.passive_context && (
                      <Text style={styles.pacerNodeContext}>
                        📝 Contexto: {node.passive_context}
                      </Text>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* TAB 2: ANKI SYNC */}
        {activeTab === "anki" && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sincronización AnkiConnect (Wi-Fi)</Text>
            <Text style={styles.sectionSubtitle}>
              Se filtraron únicamente los datos de evidencia/referencia no deducibles para evitar sobrecarga.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>IP Host Anki Desktop:</Text>
              <TextInput
                style={styles.textInput}
                value={hostIp}
                onChangeText={setHostIp}
                placeholder="192.168.1.100"
                placeholderTextColor="#64748B"
              />
            </View>

            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity
                style={[styles.syncButton, { flex: 1 }, isSyncing && styles.syncButtonDisabled]}
                onPress={handleSyncAnki}
                disabled={isSyncing}
              >
                <Text style={styles.syncButtonText}>
                  {isSyncing ? "Sincronizando..." : `Wi-Fi AnkiConnect (${anki_flashcards.length})`}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.syncButton, { flex: 1, backgroundColor: "#0284C7" }]}
                onPress={handleExportTsv}
              >
                <Text style={styles.syncButtonText}>
                  💾 Exportar AnkiDroid (.txt)
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.statusText}>{syncStatus}</Text>

            {anki_flashcards.map((card, idx) => (
              <View key={idx} style={styles.flashcardItem}>
                <Text style={styles.flashcardBadge}>{card.card_type}</Text>
                {card.card_type === "CLOZE" ? (
                  <Text style={styles.flashcardContent}>{card.cloze_text}</Text>
                ) : (
                  <View>
                    <Text style={styles.flashcardFront}>F: {card.front}</Text>
                    <Text style={styles.flashcardBack}>R: {card.back}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* TAB 3: HIGH-ROAD TRANSFER & DERRING EFFECT */}
        {activeTab === "transfer" && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Prompts de Transferencia (High-Road)</Text>
            {high_road_transfer_prompts.map((prompt: any, idx) => (
              <View key={idx} style={styles.promptItem}>
                <Text style={styles.promptNumber}>#{idx + 1}</Text>
                <Text style={styles.promptText}>
                  {typeof prompt === "string"
                    ? prompt
                    : `${prompt.unstructured_scenario || ""}${prompt.guiding_question ? `\n\n❓ ${prompt.guiding_question}` : ""}`}
                </Text>
              </View>
            ))}

            <Text style={[styles.cardTitle, { marginTop: 16 }]}>Desafíos Derring Effect</Text>
            {derring_effect_challenges.map((challenge: any, idx) => (
              <View key={idx} style={styles.challengeItem}>
                <Text style={styles.challengeText}>
                  {typeof challenge === "string"
                    ? `⚠️ ${challenge}`
                    : `⚠️ ${challenge.flawed_premise || ""}${challenge.corrective_task ? `\n\n🛠️ Tarea: ${challenge.corrective_task}` : ""}${challenge.canonical_solution ? `\n\n✅ Solución canónica: ${challenge.canonical_solution}` : ""}`}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* TAB 4: CONTRASTING CASES (ICC) */}
        {activeTab === "cases" && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Casos Contrastantes (ICC Matrix)</Text>
            {contrasting_cases_icc.map((item: any, idx) => (
              <View key={idx} style={styles.caseItem}>
                <View style={styles.caseBoxRow}>
                  <View style={styles.caseBox}>
                    <Text style={styles.caseBoxTitle}>Caso A</Text>
                    <Text style={styles.caseBoxText}>{item.case_a}</Text>
                  </View>
                  <View style={styles.caseBox}>
                    <Text style={styles.caseBoxTitle}>Caso B</Text>
                    <Text style={styles.caseBoxText}>{item.case_b}</Text>
                  </View>
                </View>
                <Text style={styles.invariantTitle}>Regla Invariante:</Text>
                <Text style={styles.invariantText}>
                  {item.invariant_discovery_prompt || item.underlying_invariant_prompt}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  emptyContainer: {
    padding: 16,
    justifyContent: "center",
  },
  emptyTitle: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  emptyText: {
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 18,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#1E293B",
    borderRadius: 8,
    margin: 8,
    padding: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: "#0EA5E9",
  },
  tabText: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "600",
  },
  activeTabText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  contentScroll: {
    flex: 1,
  },
  scrollInner: {
    padding: 8,
  },
  card: {
    backgroundColor: "#1E293B",
    borderRadius: 8,
    padding: 12,
  },
  cardTitle: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
  },
  sectionSubtitle: {
    color: "#94A3B8",
    fontSize: 12,
    marginBottom: 12,
  },
  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 12,
    backgroundColor: "#0F172A",
    padding: 12,
    borderRadius: 8,
  },
  scoreMetric: {
    alignItems: "center",
  },
  metricValue: {
    color: "#38BDF8",
    fontSize: 20,
    fontWeight: "800",
  },
  metricLabel: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 2,
  },
  critiqueText: {
    color: "#CBD5E1",
    fontSize: 13,
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    color: "#94A3B8",
    fontSize: 12,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: "#0F172A",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 6,
    color: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  syncButton: {
    backgroundColor: "#10B981",
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: "center",
  },
  syncButtonDisabled: {
    opacity: 0.5,
  },
  syncButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  statusText: {
    color: "#38BDF8",
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
  },
  flashcardItem: {
    backgroundColor: "#0F172A",
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  flashcardBadge: {
    color: "#F59E0B",
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 4,
  },
  flashcardContent: {
    color: "#F8FAFC",
    fontSize: 12,
  },
  flashcardFront: {
    color: "#F8FAFC",
    fontSize: 12,
    fontWeight: "600",
  },
  flashcardBack: {
    color: "#10B981",
    fontSize: 12,
    marginTop: 2,
  },
  promptItem: {
    flexDirection: "row",
    backgroundColor: "#0F172A",
    padding: 10,
    borderRadius: 6,
    marginBottom: 8,
  },
  promptNumber: {
    color: "#38BDF8",
    fontWeight: "700",
    marginRight: 8,
  },
  promptText: {
    color: "#F8FAFC",
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  challengeItem: {
    backgroundColor: "#0F172A",
    padding: 10,
    borderRadius: 6,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#F59E0B",
  },
  challengeText: {
    color: "#F8FAFC",
    fontSize: 12,
    lineHeight: 16,
  },
  caseItem: {
    backgroundColor: "#0F172A",
    padding: 10,
    borderRadius: 6,
    marginBottom: 12,
  },
  caseBoxRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  caseBox: {
    flex: 1,
    backgroundColor: "#1E293B",
    padding: 8,
    borderRadius: 6,
  },
  caseBoxTitle: {
    color: "#38BDF8",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 4,
  },
  caseBoxText: {
    color: "#CBD5E1",
    fontSize: 11,
  },
  invariantTitle: {
    color: "#10B981",
    fontSize: 11,
    fontWeight: "700",
  },
  invariantText: {
    color: "#F8FAFC",
    fontSize: 12,
    marginTop: 2,
  },
  pacerHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  overlayToggleButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  overlayToggleActive: {
    backgroundColor: "rgba(14, 165, 233, 0.2)",
    borderColor: "#0EA5E9",
  },
  overlayToggleInactive: {
    backgroundColor: "rgba(100, 116, 139, 0.2)",
    borderColor: "#475569",
  },
  overlayToggleText: {
    color: "#F8FAFC",
    fontSize: 11,
    fontWeight: "700",
  },
  pacerChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  pacerChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#0F172A",
  },
  pacerChipActive: {
    backgroundColor: "#0EA5E9",
    borderColor: "#38BDF8",
  },
  pacerChipText: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "700",
  },
  pacerChipTextActive: {
    color: "#FFFFFF",
  },
  emptyFilterText: {
    color: "#64748B",
    fontSize: 12,
    textAlign: "center",
    paddingVertical: 16,
  },
  pacerNodeItem: {
    backgroundColor: "#0F172A",
    borderRadius: 6,
    padding: 8,
    marginBottom: 6,
    borderLeftWidth: 3,
    borderLeftColor: "#334155",
  },
  pacerNodeTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  pacerNodeBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  pacerNodeBadgeLetter: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },
  pacerNodeTitle: {
    color: "#F8FAFC",
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  deducibleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  deducibleBadgeText: {
    fontSize: 9,
    fontWeight: "700",
  },
  pacerNodeContext: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 4,
    marginLeft: 28,
  },
});
