import React from "react";
import { StyleSheet, View, Text, TouchableOpacity, Modal, ScrollView } from "react-native";
import { CognitiveCompilerOutput } from "@cognitive-canvas/core/types";
import { RetrievalPanel } from "../RetrievalPanel";

interface CompilerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  compilation: CognitiveCompilerOutput | null;
  onCompile: () => void;
  isCompiling: boolean;
  strokeCount: number;
}

export const CompilerDrawer: React.FC<CompilerDrawerProps> = ({
  isOpen,
  onClose,
  compilation,
  onCompile,
  isCompiling,
  strokeCount,
}) => {
  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.backdropTouch} onPress={onClose} activeOpacity={1} />

        <View style={styles.drawerCard}>
          {/* Header */}
          <View style={styles.drawerHeader}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.brainIcon}>🧠</Text>
              <Text style={styles.drawerTitle}>Compilador Cognitivo</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Action Trigger Banner */}
          <View style={styles.actionBanner}>
            <View style={styles.bannerInfo}>
              <Text style={styles.bannerTitle}>Auditoría GRINDE & Tarjetas Anki</Text>
              <Text style={styles.bannerSubtitle}>
                {strokeCount > 0 ? `${strokeCount} trazos listos en lienzo` : "Dibuja tu mapa para compilar"}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.runCompileButton, isCompiling && styles.buttonDisabled]}
              onPress={onCompile}
              disabled={isCompiling}
            >
              <Text style={styles.runCompileText}>
                {isCompiling ? "Compilando..." : "⚡ Ejecutar IA"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Scrollable Retrieval Panel with GRINDE, PACER and Anki tabs */}
          <View style={styles.panelContent}>
            {compilation ? (
              <RetrievalPanel compilation={compilation} />
            ) : (
              <View style={styles.emptyStateContainer}>
                <Text style={styles.emptyStateIcon}>📐</Text>
                <Text style={styles.emptyStateTitle}>Lienzo listo para auditar</Text>
                <Text style={styles.emptyStateDescription}>
                  Dibuja tus conceptos, relaciones causales y cross-links con el S-Pen.
                  Presiona "Ejecutar IA" para auditar con Gemini 2.0 Flash y generar tarjetas cloze.
                </Text>
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
  },
  brainIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  drawerTitle: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "700",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1E293B",
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonText: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "800",
  },
  actionBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#1E293B",
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  bannerInfo: {
    flex: 1,
  },
  bannerTitle: {
    color: "#F8FAFC",
    fontSize: 13,
    fontWeight: "700",
  },
  bannerSubtitle: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 2,
  },
  runCompileButton: {
    backgroundColor: "#D97706",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#F59E0B",
  },
  runCompileText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  buttonDisabled: {
    opacity: 0.5,
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
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  emptyStateDescription: {
    color: "#94A3B8",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
});
