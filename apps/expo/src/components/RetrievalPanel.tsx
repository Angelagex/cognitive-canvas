import React, { useState } from "react";
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Alert } from "react-native";
import * as FileSystem from "expo-file-system";
import {
  BrainCircuit,
  Map,
  AlertTriangle,
  HelpCircle,
  Rocket,
  Crosshair,
  Zap,
  Pin,
  Lock,
  RotateCcw,
  Download,
  Check,
} from "@sketchyicons/react-native";
import {
  CognitiveCompilerOutput,
  PacerClassification,
  AnkiFlashcard,
} from "@cognitive-canvas/core/types";
import { ankiClient } from "../services/AnkiConnectClient";
import { PACER_COLORS } from "./canvas/PacerOverlayLayer";
import { useCognitiveLayerStore } from "../stores/useCognitiveLayerStore";

interface RetrievalPanelProps {
  compilation: CognitiveCompilerOutput | null;
  onRefresh?: () => void;
  pacerFilter?: PacerClassification | "ALL";
  onPacerFilterChange?: (filter: PacerClassification | "ALL") => void;
  showPacerOverlay?: boolean;
  onTogglePacerOverlay?: () => void;
}

const MATURITY_LABELS: Record<number, { title: string; color: string; desc: string }> = {
  1: {
    title: "Nivel 1: Jerárquico Lineal (Buzan)",
    color: "#EF4444",
    desc: "Ramas radiales rígidas sin enlaces cruzados. Pensamiento compartimentado.",
  },
  2: {
    title: "Nivel 2: Conectividad Local",
    color: "#F59E0B",
    desc: "Conexiones entre ramas vecinas, pero persisten silos conceptuales aislados.",
  },
  3: {
    title: "Nivel 3: Red Integrada (Ausubel)",
    color: "#10B981",
    desc: "Múltiples enlaces cruzados entre ramas lejanas. Reconciliación integrativa.",
  },
  4: {
    title: "Nivel 4: Esquema Dinámico Complejo",
    color: "#8B5CF6",
    desc: "Alta síntesis no verbal, bucles causales y maestría intuitiva experta.",
  },
};

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
  const [activeTab, setActiveTab] = useState<"overview" | "retrieval" | "interventions" | "anki" | "pacer">(
    "overview"
  );

  const { focusInspectionTarget } = useCognitiveLayerStore();

  if (!compilation) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Evaluación Macro-Cognitiva</Text>
        <Text style={styles.emptyText}>
          Dibuja tu mapa mental en el lienzo y presiona "⚡ Ejecutar IA" para auditar su arquitectura relacional y nivel de madurez.
        </Text>
      </View>
    );
  }

  const mapOverview = compilation.map_overview;
  const macroIslands = compilation.macro_islands || [];
  const interventions = compilation.pedagogical_interventions;
  const retrieval = compilation.high_order_retrieval;
  const ankiExceptions = interventions?.anki_exceptions || [];

  // Tarjetas Anki (compatibilidad con ankiClient)
  const cards: AnkiFlashcard[] = ankiExceptions.map((ex, i) => ({
    source_node_id: `exception_${i}`,
    card_type: "BASIC",
    front: ex.front,
    back: `${ex.back}\n\n(No deducible: ${ex.why_not_deducible})`,
  }));

  const handleExportTsv = async () => {
    if (cards.length === 0) {
      Alert.alert("Sin tarjetas", "No hay excepciones indispensables de Anki para exportar.");
      return;
    }
    try {
      const title = mapOverview?.core_theme || compilation.map_metadata?.title || "Mapa Mental";
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
    if (cards.length === 0) {
      Alert.alert("Sin tarjetas", "No hay excepciones de memoria para sincronizar.");
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

  const maturityInfo =
    MATURITY_LABELS[mapOverview?.maturity_level || 2] || MATURITY_LABELS[2];

  return (
    <View style={styles.container}>
      {/* Selector de Pestañas Superior */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "overview" && styles.activeTab]}
          onPress={() => setActiveTab("overview")}
        >
          <Text style={[styles.tabText, activeTab === "overview" && styles.activeTabText]}>
            Madurez & Islas
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "retrieval" && styles.activeTab]}
          onPress={() => setActiveTab("retrieval")}
        >
          <Text style={[styles.tabText, activeTab === "retrieval" && styles.activeTabText]}>
            Retos Mentales
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "interventions" && styles.activeTab]}
          onPress={() => setActiveTab("interventions")}
        >
          <Text style={[styles.tabText, activeTab === "interventions" && styles.activeTabText]}>
            Intervenciones
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "anki" && styles.activeTab]}
          onPress={() => setActiveTab("anki")}
        >
          <Text style={[styles.tabText, activeTab === "anki" && styles.activeTabText]}>
            Anki ({ankiExceptions.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.contentScroll} contentContainerStyle={styles.scrollInner}>
        {/* PESTAÑA 1: MADUREZ RELACIONAL & MACRO-ISLAS */}
        {activeTab === "overview" && (
          <View style={styles.tabSection}>
            {/* Tarjeta de Nivel de Madurez */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardSectionTag}>DIAGNÓSTICO ICANSTUDY</Text>
                <View
                  style={[styles.maturityBadge, { backgroundColor: maturityInfo.color }]}
                >
                  <Text style={styles.maturityBadgeText}>
                    Nivel {mapOverview?.maturity_level || 1}
                  </Text>
                </View>
              </View>

              <Text style={[styles.maturityTitle, { color: maturityInfo.color }]}>
                {maturityInfo.title}
              </Text>
              <Text style={styles.maturitySubtitle}>{maturityInfo.desc}</Text>

              {/* Diagnóstico Pedagógico */}
              <View style={styles.diagnosisBox}>
                <Text style={styles.boxTitle}>Evaluación del Esquema:</Text>
                <Text style={styles.diagnosisText}>
                  {mapOverview?.maturity_diagnosis ||
                    "El mapa muestra conexiones básicas, pero requiere mayor integración entre islas conceptuales."}
                </Text>
              </View>

              {/* Puente al Siguiente Nivel */}
              {mapOverview?.bridge_to_next_level && (
                <View style={styles.bridgeBox}>
                  <View style={styles.bridgeHeader}>
                    <BrainCircuit size={16} color="#38BDF8" strokeWidth={1.8} />
                    <Text style={styles.bridgeTitle}>Puente al Siguiente Nivel:</Text>
                  </View>
                  <Text style={styles.bridgeText}>
                    {mapOverview.bridge_to_next_level}
                  </Text>
                </View>
              )}
            </View>

            {/* Lista de Macro-Islas Identificadas */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                Macro-Islas Semánticas ({macroIslands.length})
              </Text>
              <Text style={styles.sectionSubtitle}>
                Cúmulos conceptuales proyectados en el Ghost Overlay. Pulsa una isla para enfocarla en el HUD.
              </Text>

              {macroIslands.map((island, idx) => (
                <TouchableOpacity
                  key={`island_list_${idx}`}
                  style={[
                    styles.islandItem,
                    island.is_isolated ? styles.islandIsolatedBorder : styles.islandConnectedBorder,
                  ]}
                  onPress={() => focusInspectionTarget(island.island_name)}
                  activeOpacity={0.75}
                >
                  <View style={styles.islandInfoRow}>
                    <View style={styles.islandIcon}>
                      {island.is_isolated ? (
                        <AlertTriangle size={15} color="#EF4444" strokeWidth={2.0} />
                      ) : (
                        <Map size={15} color="#38BDF8" strokeWidth={1.8} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.islandName}>{island.island_name}</Text>
                      <Text style={styles.islandEntCount}>
                        {island.associated_entity_ids?.length || 0} entidades en el lienzo
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: island.is_isolated
                            ? "rgba(245, 158, 11, 0.2)"
                            : "rgba(16, 185, 129, 0.2)",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          { color: island.is_isolated ? "#F59E0B" : "#10B981" },
                        ]}
                      >
                        {island.is_isolated ? "Aislada" : "Integrada"}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* PESTAÑA 2: RETOS DE ALTO ORDEN (RETRIEVAL GUIADO) */}
        {activeTab === "retrieval" && (
          <View style={styles.tabSection}>
            {/* 1. Pregunta de Puente Causal */}
            <View style={styles.card}>
              <View style={styles.challengeHeader}>
                <HelpCircle size={16} color="#38BDF8" strokeWidth={2.0} />
                <Text style={styles.cardTitle}>Pregunta de Puente Causal</Text>
              </View>
              <Text style={styles.sectionSubtitle}>
                Desafío de frontera para forzar la sinaptogénesis entre islas desconectadas.
              </Text>
              <View style={styles.socraticBox}>
                <Text style={styles.socraticQuestion}>
                  "{retrieval?.cross_island_causal_question ||
                    "¿Cómo afectaría una variación en la variable de la isla 1 a la estabilidad de la isla 2?"}"
                </Text>
              </View>
            </View>

            {/* 2. Transferencia Lejana (High-Road Transfer) */}
            <View style={styles.card}>
              <View style={styles.challengeHeader}>
                <Rocket size={16} color="#818CF8" strokeWidth={2.0} />
                <Text style={styles.cardTitle}>Transferencia Lejana (High-Road)</Text>
              </View>
              <Text style={styles.sectionSubtitle}>
                Aplicación de la regla invariante a un dominio ajeno no estructurado.
              </Text>
              <View style={styles.transferScenarioBox}>
                <Text style={styles.boxTitle}>Escenario No Estructurado:</Text>
                <Text style={styles.transferScenarioText}>
                  {retrieval?.high_road_transfer?.unstructured_scenario ||
                    "Imagina un sistema económico donde la liquidez actúa como el flujo de energía."}
                </Text>
                <Text style={[styles.boxTitle, { marginTop: 10 }]}>Pregunta Guía:</Text>
                <Text style={styles.transferGuidingQuestion}>
                  {retrieval?.high_road_transfer?.guiding_question ||
                    "¿Qué principio invariante de tu mapa predice el desenlace de esta situación?"}
                </Text>
              </View>
            </View>

            {/* 3. Detección de Falla Intencionada (Derring Effect) */}
            <View style={styles.card}>
              <View style={styles.challengeHeader}>
                <Crosshair size={16} color="#F59E0B" strokeWidth={2.0} />
                <Text style={styles.cardTitle}>Detección de Falla (Derring Effect)</Text>
              </View>
              <Text style={styles.sectionSubtitle}>
                Identifica el error conceptual sutil y restaura la regla canónica real.
              </Text>
              <View style={styles.derringBox}>
                <Text style={styles.derringPremiseLabel}>Premisa con Trampa:</Text>
                <Text style={styles.derringPremiseText}>
                  "{retrieval?.derring_effect?.flawed_premise ||
                    "Incrementar la variable X produce automáticamente el doble de Y sin coste alguno."}"
                </Text>

                <Text style={[styles.derringPremiseLabel, { marginTop: 10 }]}>Tu Reto:</Text>
                <Text style={styles.derringChallengeText}>
                  {retrieval?.derring_effect?.challenge_prompt ||
                    retrieval?.derring_effect?.corrective_task ||
                    "Explica por qué esta afirmación viola el principio causal del mapa."}
                </Text>

                <View style={styles.resolutionCollapsible}>
                  <Text style={styles.resolutionTitle}>Resolución Canónica:</Text>
                  <Text style={styles.resolutionText}>
                    {retrieval?.derring_effect?.canonical_resolution ||
                      retrieval?.derring_effect?.canonical_solution ||
                      "Existe un mecanismo de regulación que limita el crecimiento lineal."}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* PESTAÑA 3: INTERVENCIONES PEDAGÓGICAS */}
        {activeTab === "interventions" && (
          <View style={styles.tabSection}>
            {/* Zonas Procedimentales */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                Zonas Procedimentales ({interventions?.procedural_zones?.length || 0})
              </Text>
              <Text style={styles.sectionSubtitle}>
                Flujos de acción o algoritmos identificados. Prescripción: Práctica Deliberada, NO estudio pasivo.
              </Text>

              {(!interventions?.procedural_zones || interventions.procedural_zones.length === 0) ? (
                <Text style={styles.emptyNotice}>
                  No se detectaron zonas procedimentales en esta versión del mapa.
                </Text>
              ) : (
                interventions.procedural_zones.map((zone, zIdx) => (
                  <View key={`proc_zone_${zIdx}`} style={styles.zoneCard}>
                    <View style={styles.zoneNameRow}>
                      <Zap size={13} color="#F59E0B" strokeWidth={2.0} />
                      <Text style={styles.zoneName}>{zone.zone_name}</Text>
                    </View>
                    <Text style={styles.zonePrompt}>
                      {zone.deliberate_practice_prompt}
                    </Text>
                  </View>
                ))
              )}
            </View>

            {/* Anclajes Relacionales Sugeridos */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                Anclajes Relacionales Sugeridos ({interventions?.relational_anchoring_suggestions?.length || 0})
              </Text>
              <Text style={styles.sectionSubtitle}>
                Datos que debes conectar en tu mapa mental en lugar de memorizarlos en tarjetas de Anki.
              </Text>

              {(!interventions?.relational_anchoring_suggestions ||
                interventions.relational_anchoring_suggestions.length === 0) ? (
                <Text style={styles.emptyNotice}>
                  Todos los datos están bien anclados o integrados.
                </Text>
              ) : (
                interventions.relational_anchoring_suggestions.map((anc, aIdx) => (
                  <View key={`anchoring_${aIdx}`} style={styles.anchoringCard}>
                    <View style={styles.zoneNameRow}>
                      <Pin size={13} color="#38BDF8" strokeWidth={1.8} />
                      <Text style={styles.anchoringTarget}>Dato: "{anc.target_content}"</Text>
                    </View>
                    <Text style={styles.anchoringSuggestion}>
                      Sugerencia: {anc.suggested_connection}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {/* PESTAÑA 4: ANKI EXCEPTIONS (MÁXIMO 2) */}
        {activeTab === "anki" && (
          <View style={styles.tabSection}>
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle}>
                  Excepciones de Anki ({ankiExceptions.length} de máx 2)
                </Text>
                <View style={styles.sungRuleBadge}>
                  <Text style={styles.sungRuleText}>Anti-Sobrecarga Justin Sung</Text>
                </View>
              </View>
              <Text style={styles.sectionSubtitle}>
                Únicamente datos no deducibles que no pueden integrarse al mapa mental.
              </Text>

              {ankiExceptions.length === 0 ? (
                <View style={styles.emptyAnkiNotice}>
                  <View style={{ marginBottom: 10 }}>
                    <Check size={32} color="#10B981" strokeWidth={2.0} />
                  </View>
                  <Text style={styles.emptyAnkiTitle}>Cero Conocimiento Inerte</Text>
                  <Text style={styles.emptyAnkiText}>
                    Todo el contenido del mapa puede deducirse pensando a partir del modelo causal. No se requieren tarjetas de memoria.
                  </Text>
                </View>
              ) : (
                ankiExceptions.map((ex, eIdx) => (
                  <View key={`exception_${eIdx}`} style={styles.ankiCardBox}>
                    <Text style={styles.ankiFrontLabel}>Pregunta / Front:</Text>
                    <Text style={styles.ankiFrontText}>{ex.front}</Text>
                    <Text style={[styles.ankiFrontLabel, { marginTop: 8 }]}>Respuesta / Back:</Text>
                    <Text style={styles.ankiBackText}>{ex.back}</Text>
                    <View style={styles.whyNotDeducibleBox}>
                      <View style={styles.zoneNameRow}>
                        <Lock size={12} color="#94A3B8" strokeWidth={1.8} />
                        <Text style={styles.whyNotDeducibleText}>
                          Razón: {ex.why_not_deducible}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
              )}

              {/* Botones de Sincronización */}
              {cards.length > 0 && (
                <View style={styles.syncContainer}>
                  <TextInput
                    style={styles.ipInput}
                    value={hostIp}
                    onChangeText={setHostIp}
                    placeholder="IP AnkiConnect (ej. 192.168.1.100)"
                    placeholderTextColor="#64748B"
                  />
                  <View style={styles.syncButtonsRow}>
                    <TouchableOpacity
                      style={[styles.syncBtn, isSyncing && styles.btnDisabled]}
                      onPress={handleSyncAnki}
                      disabled={isSyncing}
                    >
                      <RotateCcw size={13} color="#FFFFFF" strokeWidth={2.0} />
                      <Text style={styles.syncBtnText}>
                        {isSyncing ? "Sincronizando..." : "Inyectar a Anki Desktop"}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.tsvBtn} onPress={handleExportTsv}>
                      <Download size={13} color="#FFFFFF" strokeWidth={2.0} />
                      <Text style={styles.tsvBtnText}>Exportar TSV AnkiDroid</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.syncStatusText}>{syncStatus}</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1120",
  },
  emptyContainer: {
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    color: "#E2E8F0",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  emptyText: {
    color: "#94A3B8",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#0F172A",
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: "#6366F1",
  },
  tabText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
  },
  activeTabText: {
    color: "#818CF8",
  },
  contentScroll: {
    flex: 1,
  },
  scrollInner: {
    padding: 16,
    gap: 16,
  },
  tabSection: {
    gap: 16,
  },
  card: {
    backgroundColor: "#131C31",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1E293B",
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardSectionTag: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  cardTitle: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 14,
  },
  maturityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  maturityBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },
  maturityTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
  },
  maturitySubtitle: {
    color: "#CBD5E1",
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 14,
  },
  diagnosisBox: {
    backgroundColor: "#0F172A",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#6366F1",
  },
  boxTitle: {
    color: "#A5B4FC",
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 4,
  },
  diagnosisText: {
    color: "#F1F5F9",
    fontSize: 13,
    lineHeight: 18,
  },
  bridgeBox: {
    backgroundColor: "#1E1B4B",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.4)",
  },
  bridgeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  bridgeIcon: {
    fontSize: 14,
  },
  bridgeTitle: {
    color: "#C7D2FE",
    fontSize: 12,
    fontWeight: "800",
  },
  bridgeText: {
    color: "#EEF2FF",
    fontSize: 13,
    lineHeight: 18,
  },
  islandItem: {
    backgroundColor: "#0F172A",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1.5,
  },
  islandConnectedBorder: {
    borderColor: "rgba(99, 102, 241, 0.3)",
  },
  islandIsolatedBorder: {
    borderColor: "rgba(245, 158, 11, 0.45)",
  },
  islandInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  islandIcon: {
    width: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  zoneNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  islandName: {
    color: "#F8FAFC",
    fontSize: 13,
    fontWeight: "800",
  },
  islandEntCount: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  challengeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  challengeIcon: {
    fontSize: 16,
  },
  socraticBox: {
    backgroundColor: "#0F172A",
    borderRadius: 10,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: "#F59E0B",
  },
  socraticQuestion: {
    color: "#FEF3C7",
    fontSize: 13,
    lineHeight: 19,
    fontStyle: "italic",
  },
  transferScenarioBox: {
    backgroundColor: "#0F172A",
    borderRadius: 10,
    padding: 12,
  },
  transferScenarioText: {
    color: "#E2E8F0",
    fontSize: 12,
    lineHeight: 17,
  },
  transferGuidingQuestion: {
    color: "#67E8F9",
    fontSize: 12,
    lineHeight: 17,
    fontStyle: "italic",
  },
  derringBox: {
    backgroundColor: "#0F172A",
    borderRadius: 10,
    padding: 12,
  },
  derringPremiseLabel: {
    color: "#F43F5E",
    fontSize: 11,
    fontWeight: "800",
  },
  derringPremiseText: {
    color: "#FECDD3",
    fontSize: 12,
    lineHeight: 17,
    fontStyle: "italic",
    marginTop: 2,
  },
  derringChallengeText: {
    color: "#F8FAFC",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  resolutionCollapsible: {
    backgroundColor: "#1E293B",
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  resolutionTitle: {
    color: "#10B981",
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 2,
  },
  resolutionText: {
    color: "#D1FAE5",
    fontSize: 12,
    lineHeight: 17,
  },
  zoneCard: {
    backgroundColor: "#064E3B",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#10B981",
  },
  zoneName: {
    color: "#A7F3D0",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 4,
  },
  zonePrompt: {
    color: "#ECFDF5",
    fontSize: 12,
    lineHeight: 17,
  },
  anchoringCard: {
    backgroundColor: "#0F172A",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#38BDF8",
  },
  anchoringTarget: {
    color: "#BAE6FD",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 2,
  },
  anchoringSuggestion: {
    color: "#E2E8F0",
    fontSize: 12,
    lineHeight: 17,
  },
  emptyNotice: {
    color: "#64748B",
    fontSize: 12,
    fontStyle: "italic",
  },
  sungRuleBadge: {
    backgroundColor: "rgba(99, 102, 241, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  sungRuleText: {
    color: "#A5B4FC",
    fontSize: 10,
    fontWeight: "800",
  },
  emptyAnkiNotice: {
    alignItems: "center",
    padding: 20,
    backgroundColor: "#0F172A",
    borderRadius: 10,
  },
  emptyAnkiIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  emptyAnkiTitle: {
    color: "#10B981",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 4,
  },
  emptyAnkiText: {
    color: "#94A3B8",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 16,
  },
  ankiCardBox: {
    backgroundColor: "#0F172A",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  ankiFrontLabel: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "800",
  },
  ankiFrontText: {
    color: "#F8FAFC",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  ankiBackText: {
    color: "#E2E8F0",
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  whyNotDeducibleBox: {
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderRadius: 6,
    padding: 6,
    marginTop: 8,
  },
  whyNotDeducibleText: {
    color: "#FCD34D",
    fontSize: 11,
  },
  syncContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#1E293B",
  },
  ipInput: {
    backgroundColor: "#0F172A",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#334155",
    color: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    marginBottom: 8,
  },
  syncButtonsRow: {
    flexDirection: "row",
    gap: 8,
  },
  syncBtn: {
    flex: 1,
    backgroundColor: "#2563EB",
    borderRadius: 8,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  syncBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  tsvBtn: {
    flex: 1,
    backgroundColor: "#334155",
    borderRadius: 8,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  tsvBtnText: {
    color: "#E2E8F0",
    fontSize: 11,
    fontWeight: "800",
  },
  syncStatusText: {
    color: "#94A3B8",
    fontSize: 10,
    textAlign: "center",
    marginTop: 6,
  },
});
