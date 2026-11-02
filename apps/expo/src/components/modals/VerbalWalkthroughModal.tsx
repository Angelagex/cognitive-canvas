import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, Modal, View, Text, TouchableOpacity, TextInput, ActivityIndicator } from "react-native";
import { Mic, X, Sparkles } from "@sketchyicons/react-native";
import { startThinkingAudioRecording, stopAndTranscribeThinkingAudio } from "../../services/DeepgramService";

export interface VerbalWalkthroughModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirmCompile: (verbalWalkthroughTranscript: string | null) => void;
}

const MAX_WALKTHROUGH_SECONDS = 60;

export const VerbalWalkthroughModal: React.FC<VerbalWalkthroughModalProps> = ({
  visible,
  onClose,
  onConfirmCompile,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!visible) {
      if (timerRef.current) clearInterval(timerRef.current);
      setIsRecording(false);
      setAudioDuration(0);
      setIsTranscribing(false);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [visible]);

  const stopRecordingFlow = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    setIsTranscribing(true);
    try {
      const memo = await stopAndTranscribeThinkingAudio();
      if (memo?.transcript) {
        setTranscript((prev) => (prev ? `${prev} ${memo.transcript}`.trim() : memo.transcript));
      }
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleToggleRecording = async () => {
    if (isRecording) {
      await stopRecordingFlow();
      return;
    }
    setAudioDuration(0);
    setIsRecording(true);
    await startThinkingAudioRecording(() => stopRecordingFlow());
    timerRef.current = setInterval(() => {
      setAudioDuration((prev) => {
        if (prev + 1 >= MAX_WALKTHROUGH_SECONDS) {
          stopRecordingFlow();
          return MAX_WALKTHROUGH_SECONDS;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const formatTime = (sec: number) => `${Math.floor(sec / 60)}:${sec % 60 < 10 ? "0" : ""}${sec % 60}`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={styles.headerTitleGroup}>
              <Sparkles size={18} color="#38BDF8" strokeWidth={2.0} />
              <Text style={styles.headerTitle}>Pre-Compilación Cognitiva</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={16} color="#94A3B8" strokeWidth={2.0} />
            </TouchableOpacity>
          </View>

          <Text style={styles.promptTitle}>
            ¿Deseas explicar tu mapa en voz alta antes de compilar? (Opcional)
          </Text>
          <Text style={styles.promptSubtitle}>
            La IA contrastará tu explicación verbal con tu dibujo para detectar vacíos conceptuales y falacias lógicas.
          </Text>

          <View style={styles.recorderSection}>
            <TouchableOpacity
              style={[styles.recordBtn, isRecording && styles.recordBtnActive]}
              onPress={handleToggleRecording}
              disabled={isTranscribing}
            >
              <Mic size={16} color={isRecording ? "#FECACA" : "#38BDF8"} strokeWidth={2.0} />
              <Text style={[styles.recordBtnText, isRecording && styles.recordBtnTextActive]}>
                {isRecording
                  ? `[ ⏹️ Detener (${formatTime(audioDuration)} / 1:00) ]`
                  : "[ 🎙️ Grabar Explicación (30-60s) ]"}
              </Text>
            </TouchableOpacity>

            {isRecording && (
              <View style={styles.waveRow}>
                {[0.4, 0.8, 1.0, 0.6, 0.9, 0.5, 0.75, 0.95, 0.45].map((h, idx) => (
                  <View
                    key={idx}
                    style={[styles.waveBar, { height: 8 + Math.round(((audioDuration + idx) % 4) * 6 * h) }]}
                  />
                ))}
                <Text style={styles.waveStatusText}>Escuchando razonamiento causal...</Text>
              </View>
            )}

            {isTranscribing && (
              <View style={styles.transcribingBox}>
                <ActivityIndicator size="small" color="#38BDF8" />
                <Text style={styles.transcribingText}>Transcribiendo explicación...</Text>
              </View>
            )}
          </View>

          <TextInput
            style={styles.transcriptInput}
            value={transcript}
            onChangeText={setTranscript}
            placeholder="Tu transcripción aparecerá aquí (también puedes escribir o dictar tu recorrido causal)..."
            placeholderTextColor="#64748B"
            multiline
          />

          <View style={styles.actionsFooter}>
            <TouchableOpacity
              style={styles.skipBtn}
              onPress={() => onConfirmCompile(null)}
              disabled={isRecording || isTranscribing}
            >
              <Text style={styles.skipBtnText}>[ Omitir y Compilar solo Imagen ]</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmBtn, (!transcript.trim() || isRecording || isTranscribing) && styles.btnDisabled]}
              onPress={() => onConfirmCompile(transcript.trim())}
              disabled={!transcript.trim() || isRecording || isTranscribing}
            >
              <Text style={styles.confirmBtnText}>[ Compilar con mi Razonamiento ]</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(9, 13, 22, 0.78)", justifyContent: "center", alignItems: "center", padding: 20 },
  card: { width: 520, maxWidth: "95%", backgroundColor: "#0F172A", borderRadius: 16, borderWidth: 1, borderColor: "#1E293B", padding: 20, gap: 12 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitleGroup: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { color: "#38BDF8", fontSize: 13, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  closeBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#1E293B", alignItems: "center", justifyContent: "center" },
  promptTitle: { color: "#F8FAFC", fontSize: 16, fontWeight: "800", lineHeight: 22 },
  promptSubtitle: { color: "#94A3B8", fontSize: 13, lineHeight: 19 },
  recorderSection: { gap: 10, marginVertical: 4 },
  recordBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "rgba(56, 189, 248, 0.12)", borderColor: "#38BDF8", borderWidth: 1, paddingVertical: 12, borderRadius: 10 },
  recordBtnActive: { backgroundColor: "rgba(239, 68, 68, 0.2)", borderColor: "#EF4444" },
  recordBtnText: { color: "#38BDF8", fontSize: 13, fontWeight: "800" },
  recordBtnTextActive: { color: "#FECACA" },
  waveRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, height: 32, backgroundColor: "#0B1120", borderRadius: 8, paddingHorizontal: 12 },
  waveBar: { width: 4, borderRadius: 2, backgroundColor: "#EF4444" },
  waveStatusText: { color: "#FCA5A5", fontSize: 11, fontWeight: "700", marginLeft: 8 },
  transcribingBox: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 6 },
  transcribingText: { color: "#38BDF8", fontSize: 12, fontWeight: "700" },
  transcriptInput: { backgroundColor: "#0B1120", borderColor: "#334155", borderWidth: 1, borderRadius: 10, color: "#F8FAFC", fontSize: 13, padding: 12, minHeight: 84, textAlignVertical: "top" },
  actionsFooter: { flexDirection: "row", justifyContent: "space-between", gap: 10, marginTop: 4 },
  skipBtn: { flex: 1, backgroundColor: "#1E293B", borderColor: "#334155", borderWidth: 1, paddingVertical: 11, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  skipBtnText: { color: "#CBD5E1", fontSize: 11, fontWeight: "700" },
  confirmBtn: { flex: 1, backgroundColor: "#0284C7", paddingVertical: 11, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  confirmBtnText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  btnDisabled: { opacity: 0.45 },
});
