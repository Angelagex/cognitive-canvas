import React, { useState } from "react";
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, StatusBar, NativeSyntheticEvent } from "react-native";
import { CognitiveCompilerOutput } from "@cognitive-canvas/core/types";
import { JetpackInkCanvas, StrokeEndEvent } from "./src/components/JetpackInkCanvas";
import { RetrievalPanel } from "./src/components/RetrievalPanel";

export default function App() {
  const [compilation, setCompilation] = useState<CognitiveCompilerOutput | null>(null);
  const [status, setStatus] = useState<string>("Listo para trazar con Jetpack Ink API");
  const [strokeCount, setStrokeCount] = useState<number>(0);
  const [activeColor, setActiveColor] = useState<string>("#38BDF8");

  const handleStrokeEnd = (event: NativeSyntheticEvent<StrokeEndEvent>) => {
    const count = event.nativeEvent.strokeCount;
    setStrokeCount(count);
    setStatus(`Trazo registrado (Total: ${count})`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Cognitive Canvas</Text>
          <Text style={styles.subtitle}>Compilador Cognitivo de Mapas Mentales (GRINDE + PACER)</Text>
        </View>
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>{status}</Text>
        </View>
      </View>

      <View style={styles.workspace}>
        {/* Native Drawing View Container for Android Jetpack Ink API */}
        <View style={styles.canvasWrapper}>
          <View style={styles.toolbar}>
            <Text style={styles.toolbarTitle}>Lienzo Nativo Android (androidx.ink)</Text>
            <View style={styles.colorPalette}>
              {["#38BDF8", "#F43F5E", "#10B981", "#F59E0B", "#F8FAFC"].map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorChip,
                    { backgroundColor: color },
                    activeColor === color && styles.colorChipSelected,
                  ]}
                  onPress={() => setActiveColor(color)}
                />
              ))}
            </View>
          </View>

          <JetpackInkCanvas
            style={styles.inkCanvas}
            strokeColor={activeColor}
            strokeWidth={6}
            onStrokeEnd={handleStrokeEnd}
          />
        </View>

        {/* Cognitive Side Panel (Audit, Retrieval, Anki Sync) */}
        <View style={styles.sidePanel}>
          <RetrievalPanel compilation={compilation} />

          <TouchableOpacity
            style={styles.compileButton}
            onPress={() => {
              if (!compilation) {
                // Mock compiled result for demo / testing until Lambda API is invoked
                setCompilation({
                  nodes: [
                    {
                      id: "node_1",
                      visual_bounding_box: [100, 100, 200, 300],
                      detected_content: "Concepto Principal: Redes Neuronales",
                      passive_context: null,
                      pacer_classification: "CONCEPTUAL",
                      deducible_from_context: true,
                    },
                    {
                      id: "node_2",
                      visual_bounding_box: [300, 100, 400, 300],
                      detected_content: "Backpropagation algorithm v1.0",
                      passive_context: "Fórmula de derivación en cadena",
                      pacer_classification: "EVIDENCE",
                      deducible_from_context: false,
                    }
                  ],
                  edges: [
                    {
                      source_node_id: "node_1",
                      target_node_id: "node_2",
                      label: "calcula gradientes en",
                      is_cross_link: true,
                      relation_nature: "causal",
                    }
                  ],
                  grinde_audit: {
                    cross_link_density_score: 0.35,
                    linear_thinking_risk: false,
                    feedback_critique: "Excelente densidad de relaciones causales y cross-links no lineales.",
                  },
                  anki_flashcards: [
                    {
                      target_node_id: "node_2",
                      card_type: "CLOZE",
                      cloze_text: "Backpropagation calcula el {{c1::gradiente de la función de pérdida}} mediante la regla de la cadena.",
                    }
                  ],
                  high_road_transfer_prompts: [
                    "¿Cómo aplicarías la regla de la cadena de Backpropagation en la optimización de un sistema termodinámico?",
                  ],
                  derring_effect_challenges: [
                    "Desafío: ¿Qué ocurre si la tasa de aprendizaje se establece en 100?",
                  ],
                  contrasting_cases_icc: [
                    {
                      case_a: "Descenso de gradiente estocástico (SGD)",
                      case_b: "Descenso de gradiente por lotes (Batch GD)",
                      underlying_invariant_prompt: "Identifica el compromiso entre velocidad de convergencia y estabilidad en la superficie de pérdida.",
                    }
                  ]
                });
                setStatus("Canvas Compilado exitosamente");
              } else {
                setStatus("Listo para nuevos trazos");
              }
            }}
          >
            <Text style={styles.compileButtonText}>
              {compilation ? "Reiniciar Canvas" : "Compilar Canvas (Gemini 2.0)"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  title: {
    color: "#F8FAFC",
    fontSize: 20,
    fontWeight: "700",
  },
  subtitle: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 2,
  },
  badgeContainer: {
    backgroundColor: "#1E293B",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#334155",
  },
  badgeText: {
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: "600",
  },
  workspace: {
    flex: 1,
    flexDirection: "row",
  },
  canvasWrapper: {
    flex: 3,
    backgroundColor: "#020617",
    margin: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1E293B",
    overflow: "hidden",
  },
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#0F172A",
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  toolbarTitle: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "600",
  },
  colorPalette: {
    flexDirection: "row",
    gap: 8,
  },
  colorChip: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  colorChipSelected: {
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  inkCanvas: {
    flex: 1,
  },
  sidePanel: {
    flex: 1.2,
    backgroundColor: "#0F172A",
    marginVertical: 12,
    marginRight: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1E293B",
    padding: 16,
    justifyContent: "space-between",
  },
  panelTitle: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  auditCard: {
    backgroundColor: "#1E293B",
    padding: 12,
    borderRadius: 8,
  },
  auditScore: {
    color: "#38BDF8",
    fontWeight: "700",
    fontSize: 14,
    marginBottom: 6,
  },
  auditCritique: {
    color: "#CBD5E1",
    fontSize: 13,
  },
  emptyState: {
    color: "#64748B",
    fontSize: 13,
    fontStyle: "italic",
    lineHeight: 18,
  },
  compileButton: {
    backgroundColor: "#0EA5E9",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  compileButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
});
