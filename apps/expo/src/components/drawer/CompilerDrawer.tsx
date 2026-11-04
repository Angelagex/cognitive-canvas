import React from "react";
import { StyleSheet, View, Text, TouchableOpacity, Modal } from "react-native";
import { BrainCircuit, X, RefreshCw, Layers } from "@sketchyicons/react-native";
import { CognitiveCompilerOutput, PacerClassification } from "@cognitive-canvas/core/types";
import { RetrievalPanel } from "../RetrievalPanel";
import { useSkin, fonts } from "../../theme";
import { Button } from "../ui";

export interface CompilerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  compilation: CognitiveCompilerOutput | null;
  onCompile: () => void;
  isCompiling: boolean;
  strokeCount: number;
  lastCompiledStrokeCount?: number;
  pacerFilter?: PacerClassification | "ALL";
  onPacerFilterChange?: (filter: PacerClassification | "ALL") => void;
  showPacerOverlay?: boolean;
  onTogglePacerOverlay?: () => void;
  onFocusNode?: (box: { minX: number; minY: number; maxX: number; maxY: number }) => void;
  activeTab?: "STRUCTURE" | "DIAGNOSIS" | "SOCRATIC";
}

export const CompilerDrawer: React.FC<CompilerDrawerProps> = ({
  isOpen,
  onClose,
  compilation,
  onCompile,
  isCompiling,
  strokeCount,
  lastCompiledStrokeCount = 0,
  pacerFilter,
  onPacerFilterChange,
  showPacerOverlay,
  onTogglePacerOverlay,
  onFocusNode,
  activeTab,
}) => {
  const { skin } = useSkin();

  const handleFocusNode = (box: { minX: number; minY: number; maxX: number; maxY: number }) => {
    onFocusNode?.(box);
    onClose();
  };

  const hasNewStrokes = Boolean(compilation && strokeCount > lastCompiledStrokeCount);

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent={true}
      statusBarTranslucent={true}
      navigationBarTranslucent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.backdropTouch} onPress={onClose} activeOpacity={1} />

        <View style={[styles.drawerCard, { backgroundColor: skin.surface, borderColor: skin.borderSoft }]}>
          {/* Header Compacto (solo de resultados) */}
          <View style={[styles.drawerHeader, { borderBottomColor: skin.borderSoft }]}>
            <View style={styles.headerTitleRow}>
              <BrainCircuit size={18} color={skin.primary} strokeWidth={2.0} />
              <View>
                <Text style={[styles.drawerTitle, { color: skin.text, fontFamily: fonts.display, fontWeight: "normal" }]}>
                  ANÁLISIS COGNITIVO
                </Text>
                <Text style={[styles.drawerSubtitle, { color: skin.textMuted, fontFamily: fonts.mono, fontWeight: "normal" }]}>
                  {compilation ? "RESULTADOS & AUDITORÍA SOCRÁTICA" : "ESPERANDO COMPILACIÓN"}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: skin.surfaceAlt, borderColor: skin.borderSoft }]}
              onPress={onClose}
            >
              <X size={16} color={skin.textMuted} strokeWidth={2.0} />
            </TouchableOpacity>
          </View>

          {/* Aviso contextual si hay trazos nuevos desde la última compilación (§4 regla 2) */}
          {hasNewStrokes && (
            <View style={[styles.newStrokesNotice, { backgroundColor: `${skin.warm}1A`, borderColor: skin.warm }]}>
              <View style={styles.newStrokesTextCol}>
                <Text style={[styles.newStrokesTitle, { color: skin.warm, fontFamily: fonts.monoBold, fontWeight: "normal" }]}>
                  HAY TRAZOS NUEVOS
                </Text>
                <Text style={[styles.newStrokesDesc, { color: skin.text, fontFamily: fonts.ui, fontWeight: "normal" }]}>
                  +{strokeCount - lastCompiledStrokeCount} trazos añadidos desde la última compilación.
                </Text>
              </View>
              <Button
                label={isCompiling ? "Compilando..." : "Recompilar"}
                variant="primary"
                size="sm"
                icon={<RefreshCw size={12} color={skin.onPrimary} strokeWidth={2.2} />}
                onPress={onCompile}
                loading={isCompiling}
              />
            </View>
          )}

          {/* Scrollable Retrieval Panel with Real Extracted Graph */}
          <View style={styles.panelContent}>
            {compilation ? (
              <RetrievalPanel
                compilation={compilation}
                strokeCount={strokeCount}
                pacerFilter={pacerFilter}
                onPacerFilterChange={onPacerFilterChange}
                showPacerOverlay={showPacerOverlay}
                onTogglePacerOverlay={onTogglePacerOverlay}
                onFocusNode={handleFocusNode}
                onCloseDrawer={onClose}
                initialTab={activeTab}
              />
            ) : (
              <View style={styles.emptyStateContainer}>
                <View style={[styles.emptyStateIconWrapper, { backgroundColor: skin.surfaceAlt, borderColor: skin.borderSoft }]}>
                  <Layers size={36} color={skin.primary} strokeWidth={1.8} />
                </View>
                <Text style={[styles.emptyStateTitle, { color: skin.text, fontFamily: fonts.display, fontWeight: "normal" }]}>
                  LIENZO LISTO PARA COMPILAR
                </Text>
                <Text style={[styles.emptyStateDescription, { color: skin.textMuted, fontFamily: fonts.ui, fontWeight: "normal" }]}>
                  Dibuja tus conceptos y relaciones causales con el S-Pen. Al compilar se extraerá tu grafo jerárquico, dinámicas causales y desafíos socráticos.
                </Text>
                <Button
                  label={isCompiling ? "Compilando..." : "Compilar Lienzo"}
                  variant="primary"
                  size="md"
                  onPress={onCompile}
                  loading={isCompiling}
                  style={{ marginTop: 16 }}
                />
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "flex-end",
  },
  backdropTouch: {
    flex: 1,
  },
  drawerCard: {
    width: 440,
    maxWidth: "90%",
    height: "100%",
    backgroundColor: "#0B1120",
    borderLeftWidth: 1,
    borderLeftColor: "#1E293B",
    display: "flex",
    flexDirection: "column",
  },
  drawerHeader: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
    backgroundColor: "#0F172A",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  drawerTitle: {
    fontSize: 16,
    letterSpacing: -0.2,
  },
  drawerSubtitle: {
    fontSize: 9,
    letterSpacing: 0.8,
    marginTop: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  newStrokesNotice: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 12,
  },
  newStrokesTextCol: {
    flex: 1,
  },
  newStrokesTitle: {
    fontSize: 10,
    letterSpacing: 0.6,
  },
  newStrokesDesc: {
    fontSize: 11,
    marginTop: 1,
  },
  panelContent: {
    flex: 1,
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyStateIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 320,
  },
});
