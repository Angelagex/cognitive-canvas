import React, { useState, useEffect } from "react";
import { StyleSheet, Modal, View, Text, TouchableOpacity, TextInput, Alert } from "react-native";
import * as Haptics from "expo-haptics";
import { Mic, X, Sparkles, Check, Trash2, Zap } from "@sketchyicons/react-native";
import { loadDocument, updateDocumentMetadata } from "../../services/StorageService";

export interface WalkthroughConfirmParams {
  transcript: string;
  isIncremental: boolean;
}

export interface VerbalWalkthroughModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirmCompile: (params: WalkthroughConfirmParams) => void;
  onStartRecording?: (currentDraft: string) => void;
  canvasId?: string;
  initialTranscript?: string;
}

export const VerbalWalkthroughModal: React.FC<VerbalWalkthroughModalProps> = ({
  visible,
  onClose,
  onConfirmCompile,
  onStartRecording,
  canvasId,
  initialTranscript = "",
}) => {
  const [transcript, setTranscript] = useState<string>(initialTranscript);
  const [isIncremental, setIsIncremental] = useState<boolean>(true);

  useEffect(() => {
    if (visible) {
      if (initialTranscript !== undefined && initialTranscript !== null && initialTranscript !== "") {
        setTranscript(initialTranscript);
      } else if (canvasId) {
        loadDocument(canvasId).then((doc) => {
          const saved = doc?.metadata?.verbalWalkthroughTranscript;
          if (saved) setTranscript(saved);
        });
      }
    }
  }, [visible, initialTranscript, canvasId]);

  const handleRecordOrAppend = () => {
    if (onStartRecording) {
      onStartRecording(transcript);
    }
  };

  const handleClearText = () => {
    Alert.alert("Limpiar Texto", "¿Deseas borrar toda la explicación de este mapa?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Borrar",
        style: "destructive",
        onPress: async () => {
          setTranscript("");
          if (canvasId) {
            await updateDocumentMetadata(canvasId, { verbalWalkthroughTranscript: "" });
          }
        },
      },
    ]);
  };

  const handleCancelAndSaveDraft = async () => {
    if (canvasId && transcript.trim()) {
      await updateDocumentMetadata(canvasId, { verbalWalkthroughTranscript: transcript.trim() });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    onClose();
  };

  const handleConfirmAndCompile = async () => {
    const cleanText = transcript.trim();
    if (canvasId) {
      await updateDocumentMetadata(canvasId, { verbalWalkthroughTranscript: cleanText });
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onConfirmCompile({ transcript: cleanText, isIncremental });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancelAndSaveDraft}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={styles.headerTitleGroup}>
              <Sparkles size={18} color="#38BDF8" strokeWidth={2.0} />
              <Text style={styles.headerTitle}>Explicación Razonada del Mapa</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={handleCancelAndSaveDraft}>
              <X size={16} color="#94A3B8" strokeWidth={2.0} />
            </TouchableOpacity>
          </View>

          <Text style={styles.promptSubtitle}>
            Edita tu explicación o pulsa grabar para recorrer e interactuar libremente con tu mapa mientras hablas.
          </Text>

          <TextInput
            style={styles.transcriptInput}
            value={transcript}
            onChangeText={setTranscript}
            placeholder="Escribe o graba aquí el recorrido causal de tu mapa (ej. cómo interactúa V8 con Libuv)..."
            placeholderTextColor="#64748B"
            multiline
          />

          <View style={styles.controlsRow}>
            <TouchableOpacity
              style={styles.recordBtn}
              onPress={handleRecordOrAppend}
              activeOpacity={0.8}
            >
              <Mic size={15} color="#38BDF8" strokeWidth={2.0} />
              <Text style={styles.recordBtnText}>
                {transcript.trim() ? "[ 🎙️ Grabar / Anexar ]" : "[ 🎙️ Grabar Explicación ]"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.clearBtn}
              onPress={handleClearText}
              disabled={!transcript.trim()}
            >
              <Trash2 size={14} color={transcript.trim() ? "#EF4444" : "#64748B"} strokeWidth={2.0} />
              <Text style={[styles.clearBtnText, !transcript.trim() && { color: "#64748B" }]}>Limpiar</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => setIsIncremental(!isIncremental)}
            activeOpacity={0.8}
          >
            <View style={[styles.checkbox, isIncremental && styles.checkboxActive]}>
              {isIncremental && <Check size={12} color="#FFFFFF" strokeWidth={2.5} />}
            </View>
            <Text style={styles.toggleText}>Actualización incremental (preservar nodos previos)</Text>
          </TouchableOpacity>

          <View style={styles.actionsFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelAndSaveDraft}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.compileBtn}
              onPress={handleConfirmAndCompile}
              activeOpacity={0.85}
            >
              <Zap size={15} color="#FFFFFF" strokeWidth={2.0} />
              <Text style={styles.compileBtnText}>🚀 Compilar con esta Explicación</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(9, 13, 22, 0.78)", justifyContent: "center", alignItems: "center", padding: 20 },
  card: { width: 540, maxWidth: "96%", backgroundColor: "#0F172A", borderRadius: 16, borderWidth: 1, borderColor: "#1E293B", padding: 20, gap: 12 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitleGroup: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { color: "#38BDF8", fontSize: 14, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  closeBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#1E293B", alignItems: "center", justifyContent: "center" },
  promptSubtitle: { color: "#94A3B8", fontSize: 13, lineHeight: 19 },
  transcriptInput: { backgroundColor: "#0B1120", borderColor: "#334155", borderWidth: 1, borderRadius: 10, color: "#F8FAFC", fontSize: 13, padding: 12, minHeight: 140, textAlignVertical: "top" },
  controlsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  recordBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "rgba(56, 189, 248, 0.12)", borderColor: "#38BDF8", borderWidth: 1, paddingVertical: 10, borderRadius: 8 },
  recordBtnText: { color: "#38BDF8", fontSize: 13, fontWeight: "800" },
  clearBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#1E293B", borderWidth: 1, borderColor: "#334155", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 },
  clearBtnText: { color: "#EF4444", fontSize: 12, fontWeight: "700" },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 2 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: "#64748B", alignItems: "center", justifyContent: "center" },
  checkboxActive: { backgroundColor: "#0284C7", borderColor: "#38BDF8" },
  toggleText: { color: "#E2E8F0", fontSize: 12, fontWeight: "600" },
  actionsFooter: { flexDirection: "row", justifyContent: "space-between", gap: 12, marginTop: 4 },
  cancelBtn: { flex: 1, backgroundColor: "#1E293B", borderColor: "#334155", borderWidth: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  cancelBtnText: { color: "#CBD5E1", fontSize: 12, fontWeight: "700" },
  compileBtn: { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#0284C7", paddingVertical: 12, borderRadius: 10 },
  compileBtnText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
});
