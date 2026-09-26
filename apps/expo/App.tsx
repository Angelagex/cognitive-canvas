import React, { useState } from "react";
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, StatusBar, NativeSyntheticEvent } from "react-native";
import { CognitiveCompilerOutput } from "@cognitive-canvas/core/types";
import { JetpackInkCanvas, StrokeEndEvent } from "./src/components/JetpackInkCanvas";

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
          <Text style={styles.panelTitle}>Auditoría Cognitiva & Retención</Text>
          {compilation ? (
            <View style={styles.auditCard}>
              <Text style={styles.auditScore}>
                Densidad Cross-Links: {(compilation.grinde_audit.cross_link_density_score * 100).toFixed(0)}%
              </Text>
              <Text style={styles.auditCritique}>{compilation.grinde_audit.feedback_critique}</Text>
            </View>
          ) : (
            <View>
              <Text style={styles.emptyState}>
                Dibuja tu mapa mental manuscrito en el lienzo nativo y presiona "Compilar Canvas".
              </Text>
              <Text style={[styles.emptyState, { marginTop: 8 }]}>
                Trazos dibujados: <Text style={{ color: "#38BDF8", fontWeight: "bold" }}>{strokeCount}</Text>
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.compileButton}
            onPress={() => setStatus("Compilando con Gemini 2.0 Flash...")}
          >
            <Text style={styles.compileButtonText}>Compilar Canvas</Text>
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
