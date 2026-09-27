import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  NativeSyntheticEvent,
  Modal,
  ScrollView,
} from "react-native";
import { CognitiveCompilerOutput } from "@cognitive-canvas/core/types";
import {
  JetpackInkCanvas,
  StrokeEndEvent,
  TransformEvent,
  BrushType,
} from "./src/components/JetpackInkCanvas";
import { RetrievalPanel } from "./src/components/RetrievalPanel";

const COLORS = ["#38BDF8", "#F43F5E", "#10B981", "#F59E0B", "#A855F7", "#FFFFFF"];
const SIZES = [
  { label: "Fino", value: 8 },
  { label: "Medio", value: 18 },
  { label: "Grueso", value: 32 },
];

export default function App() {
  const [compilation, setCompilation] = useState<CognitiveCompilerOutput | null>(null);
  const [status, setStatus] = useState<string>("Lienzo infinito fluido listo");
  const [strokeCount, setStrokeCount] = useState<number>(0);
  const [displayZoom, setDisplayZoom] = useState<number>(100);

  // Tools & Styling State
  const [activeColor, setActiveColor] = useState<string>("#38BDF8");
  const [activeWidth, setActiveWidth] = useState<number>(18);
  const [activeBrush, setActiveBrush] = useState<BrushType>("pen");

  // Triggers for native actions (zero bridge latency, zero jitter)
  const [zoomInTrigger, setZoomInTrigger] = useState<number>(0);
  const [zoomOutTrigger, setZoomOutTrigger] = useState<number>(0);
  const [resetZoomTrigger, setResetZoomTrigger] = useState<number>(0);
  const [clearTrigger, setClearTrigger] = useState<number>(0);
  const [undoTrigger, setUndoTrigger] = useState<number>(0);

  // Drawer / Modal State
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  const handleStrokeEnd = (event: NativeSyntheticEvent<StrokeEndEvent>) => {
    const count = event.nativeEvent.strokeCount;
    setStrokeCount(count);
    if (activeBrush === "eraser") {
      setStatus(`Trazos restantes: ${count}`);
    } else {
      setStatus(`Trazos: ${count}`);
    }
  };

  const handleTransform = (event: NativeSyntheticEvent<TransformEvent>) => {
    const { scale } = event.nativeEvent;
    const roundedZoom = Math.round(scale * 100);
    setDisplayZoom(roundedZoom);
    setStatus(`Zoom: ${roundedZoom}%`);
  };

  const handleZoomIn = () => {
    setZoomInTrigger((prev) => prev + 1);
  };

  const handleZoomOut = () => {
    setZoomOutTrigger((prev) => prev + 1);
  };

  const handleResetZoom = () => {
    setResetZoomTrigger((prev) => prev + 1);
    setDisplayZoom(100);
    setStatus("Vista centrada (100%)");
  };

  const handleClear = () => {
    setClearTrigger((prev) => prev + 1);
    setStrokeCount(0);
    setStatus("Lienzo despejado");
  };

  const handleUndo = () => {
    setUndoTrigger((prev) => prev + 1);
    setStatus("Último trazo deshecho");
  };

  const handleCompile = () => {
    if (!compilation) {
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
          },
        ],
        edges: [
          {
            source_node_id: "node_1",
            target_node_id: "node_2",
            label: "calcula gradientes en",
            is_cross_link: true,
            relation_nature: "causal",
          },
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
          },
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
          },
        ],
      });
      setStatus("Canvas Compilado exitosamente");
    } else {
      setCompilation(null);
      setStatus("Canvas reiniciado");
    }
  };

  const getBrushLabel = () => {
    switch (activeBrush) {
      case "pen":
        return "🖊️ Pluma";
      case "marker":
        return "🖍️ Marcador";
      case "highlighter":
        return "✨ Resaltador";
      case "eraser":
        return "🧹 Borrador activo";
      case "pan":
        return "🖐️ Mover lienzo";
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#020617" />

      {/* 1. FULLSCREEN NATIVE CANVAS (androidx.ink) */}
      <View style={StyleSheet.absoluteFill}>
        <JetpackInkCanvas
          style={StyleSheet.absoluteFill}
          strokeColor={activeColor}
          strokeWidth={activeWidth}
          brushType={activeBrush}
          zoomInTrigger={zoomInTrigger}
          zoomOutTrigger={zoomOutTrigger}
          resetZoomTrigger={resetZoomTrigger}
          clearTrigger={clearTrigger}
          undoTrigger={undoTrigger}
          onStrokeEnd={handleStrokeEnd}
          onTransform={handleTransform}
        />
      </View>

      {/* 2. FLOATING TOP HEADER */}
      <View style={styles.floatingHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.brandTitle}>Cognitive Canvas</Text>
          <View
            style={[
              styles.statusPill,
              activeBrush === "eraser" && styles.statusPillEraser,
              activeBrush === "pan" && styles.statusPillPan,
            ]}
          >
            <Text
              style={[
                styles.statusPillText,
                activeBrush === "eraser" && { color: "#F43F5E" },
                activeBrush === "pan" && { color: "#10B981" },
              ]}
            >
              {getBrushLabel()}
            </Text>
          </View>
        </View>

        <View style={styles.headerCenter}>
          <Text style={styles.statusText}>{status}</Text>
        </View>

        <TouchableOpacity
          style={styles.drawerToggleButton}
          onPress={() => setIsDrawerOpen(true)}
        >
          <Text style={styles.drawerButtonIcon}>🧠</Text>
          <Text style={styles.drawerButtonText}>Compilador & Panel</Text>
        </TouchableOpacity>
      </View>

      {/* 3. SCROLLABLE FLOATING TOOLBAR DOCK (Non-cut-off) */}
      <View style={styles.dockWrapper}>
        <ScrollView
          style={styles.dockScrollView}
          contentContainerStyle={styles.dockInner}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {/* Herramientas */}
          <Text style={styles.dockSectionTitle}>Lápiz</Text>
          <TouchableOpacity
            style={[styles.dockToolButton, activeBrush === "pen" && styles.dockToolButtonActive]}
            onPress={() => setActiveBrush("pen")}
          >
            <Text style={styles.toolIcon}>🖊️</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.dockToolButton, activeBrush === "marker" && styles.dockToolButtonActive]}
            onPress={() => setActiveBrush("marker")}
          >
            <Text style={styles.toolIcon}>🖍️</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.dockToolButton, activeBrush === "highlighter" && styles.dockToolButtonActive]}
            onPress={() => setActiveBrush("highlighter")}
          >
            <Text style={styles.toolIcon}>✨</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.dockToolButton,
              activeBrush === "eraser" && [styles.dockToolButtonActive, { borderColor: "#F43F5E", backgroundColor: "#881337" }],
            ]}
            onPress={() => setActiveBrush("eraser")}
          >
            <Text style={styles.toolIcon}>🧹</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.dockToolButton,
              activeBrush === "pan" && [styles.dockToolButtonActive, { borderColor: "#10B981", backgroundColor: "#064E3B" }],
            ]}
            onPress={() => setActiveBrush("pan")}
          >
            <Text style={styles.toolIcon}>🖐️</Text>
          </TouchableOpacity>

          <View style={styles.dockDivider} />

          {/* Grosor */}
          <Text style={styles.dockSectionTitle}>Grosor</Text>
          <View style={styles.sizeGroup}>
            {SIZES.map((s) => (
              <TouchableOpacity
                key={s.label}
                style={[styles.sizeButton, activeWidth === s.value && styles.sizeButtonActive]}
                onPress={() => setActiveWidth(s.value)}
              >
                <View
                  style={[
                    styles.sizeDot,
                    {
                      width: s.value / 2.2,
                      height: s.value / 2.2,
                      borderRadius: s.value / 4.4,
                      backgroundColor: activeWidth === s.value ? "#38BDF8" : "#94A3B8",
                    },
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.dockDivider} />

          {/* Color Palette */}
          <Text style={styles.dockSectionTitle}>Color</Text>
          <View style={styles.paletteContainer}>
            {COLORS.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.paletteChip,
                  { backgroundColor: color },
                  activeColor === color && styles.paletteChipSelected,
                ]}
                onPress={() => {
                  setActiveColor(color);
                  if (activeBrush === "eraser" || activeBrush === "pan") setActiveBrush("pen");
                }}
              />
            ))}
          </View>

          <View style={styles.dockDivider} />

          {/* Zoom Controls */}
          <Text style={styles.dockSectionTitle}>Zoom</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionIconButton} onPress={handleZoomIn}>
              <Text style={styles.actionIconText}>➕</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionIconButton} onPress={handleZoomOut}>
              <Text style={styles.actionIconText}>➖</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.resetZoomButton} onPress={handleResetZoom}>
            <Text style={styles.resetZoomText}>{displayZoom}%</Text>
          </TouchableOpacity>

          <View style={styles.dockDivider} />

          {/* Deshacer y Limpiar */}
          <Text style={styles.dockSectionTitle}>Editar</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionIconButton} onPress={handleUndo}>
              <Text style={styles.actionIconText}>↩️</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionIconButton} onPress={handleClear}>
              <Text style={styles.actionIconText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {/* 4. FLOATING HINT PILL */}
      <View style={styles.floatingHintPill}>
        <Text style={styles.floatingHintText}>
          💡 Pellizca o arrastra con 2 dedos para zoom y desplazamiento infinito
        </Text>
      </View>

      {/* 5. MENÚ DESPLEGABLE / MODAL DRAWER */}
      <Modal
        visible={isDrawerOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsDrawerOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.drawerContainer}>
            <View style={styles.drawerHeader}>
              <View>
                <Text style={styles.drawerTitle}>Compilador Cognitivo</Text>
                <Text style={styles.drawerSubtitle}>GRINDE + PACER • Retención Activa & Anki</Text>
              </View>
              <TouchableOpacity
                style={styles.closeDrawerButton}
                onPress={() => setIsDrawerOpen(false)}
              >
                <Text style={styles.closeDrawerText}>✕</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.compileMainButton} onPress={handleCompile}>
              <Text style={styles.compileMainButtonText}>
                {compilation ? "🔄 Reiniciar Canvas" : "🚀 Compilar Canvas (Gemini 2.0 Flash)"}
              </Text>
            </TouchableOpacity>

            <View style={styles.panelContentWrapper}>
              <RetrievalPanel compilation={compilation} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
  },
  floatingHeader: {
    position: "absolute",
    top: 14,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.90)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1E293B",
    elevation: 8,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brandTitle: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "800",
  },
  statusPill: {
    backgroundColor: "#1E293B",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  statusPillEraser: {
    borderColor: "#F43F5E",
    backgroundColor: "#4C0519",
  },
  statusPillPan: {
    borderColor: "#10B981",
    backgroundColor: "#064E3B",
  },
  statusPillText: {
    color: "#38BDF8",
    fontSize: 11,
    fontWeight: "700",
  },
  headerCenter: {
    alignItems: "center",
  },
  statusText: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "600",
  },
  drawerToggleButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0284C7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 5,
  },
  drawerButtonIcon: {
    fontSize: 13,
  },
  drawerButtonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  dockWrapper: {
    position: "absolute",
    left: 16,
    top: 68,
    maxHeight: "82%",
    backgroundColor: "rgba(15, 23, 42, 0.94)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1E293B",
    width: 66,
    elevation: 10,
    overflow: "hidden",
  },
  dockScrollView: {
    flex: 1,
  },
  dockInner: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  dockSectionTitle: {
    color: "#64748B",
    fontSize: 8,
    fontWeight: "800",
    textTransform: "uppercase",
    marginBottom: 3,
    textAlign: "center",
  },
  dockToolButton: {
    width: 42,
    height: 38,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 2,
    backgroundColor: "#1E293B",
  },
  dockToolButtonActive: {
    backgroundColor: "#0284C7",
    borderWidth: 2,
    borderColor: "#38BDF8",
  },
  toolIcon: {
    fontSize: 18,
  },
  dockDivider: {
    width: 36,
    height: 1,
    backgroundColor: "#334155",
    marginVertical: 6,
  },
  sizeGroup: {
    flexDirection: "column",
    gap: 3,
    alignItems: "center",
  },
  sizeButton: {
    width: 36,
    height: 22,
    borderRadius: 6,
    backgroundColor: "#1E293B",
    justifyContent: "center",
    alignItems: "center",
  },
  sizeButtonActive: {
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#38BDF8",
  },
  sizeDot: {
    backgroundColor: "#94A3B8",
  },
  paletteContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: 44,
    gap: 4,
    justifyContent: "center",
  },
  paletteChip: {
    width: 17,
    height: 17,
    borderRadius: 8.5,
    borderWidth: 1,
    borderColor: "#334155",
  },
  paletteChipSelected: {
    borderWidth: 2,
    borderColor: "#FFFFFF",
    transform: [{ scale: 1.15 }],
  },
  actionsRow: {
    flexDirection: "row",
    gap: 4,
    marginVertical: 1,
  },
  actionIconButton: {
    width: 22,
    height: 26,
    borderRadius: 6,
    backgroundColor: "#1E293B",
    justifyContent: "center",
    alignItems: "center",
  },
  actionIconText: {
    fontSize: 10,
  },
  resetZoomButton: {
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 4,
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#334155",
    marginVertical: 3,
  },
  resetZoomText: {
    color: "#38BDF8",
    fontSize: 9,
    fontWeight: "700",
  },
  floatingHintPill: {
    position: "absolute",
    bottom: 12,
    right: 16,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  floatingHintText: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "flex-end",
    alignItems: "flex-end",
  },
  drawerContainer: {
    width: "70%",
    maxWidth: 480,
    height: "100%",
    backgroundColor: "#0F172A",
    borderLeftWidth: 1,
    borderLeftColor: "#1E293B",
    padding: 20,
    elevation: 20,
  },
  drawerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  drawerTitle: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "800",
  },
  drawerSubtitle: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 2,
  },
  closeDrawerButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1E293B",
    justifyContent: "center",
    alignItems: "center",
  },
  closeDrawerText: {
    color: "#94A3B8",
    fontSize: 16,
    fontWeight: "700",
  },
  compileMainButton: {
    backgroundColor: "#0284C7",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 16,
    elevation: 4,
  },
  compileMainButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  panelContentWrapper: {
    flex: 1,
  },
});
