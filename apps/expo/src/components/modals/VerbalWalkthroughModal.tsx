import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, Modal, View, Text, TouchableOpacity, TextInput, ActivityIndicator, Alert, NativeModules, PermissionsAndroid, Platform } from "react-native";
import * as FileSystem from "expo-file-system";
import { Mic, X, Sparkles } from "@sketchyicons/react-native";
import { TranscriptionService } from "../../services/TranscriptionService";

export interface VerbalWalkthroughModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirmCompile: (verbalWalkthroughTranscript: string | null) => void;
}

const MAX_RECORDING_DURATION_SEC = 180; // 3 minutes

export const VerbalWalkthroughModal: React.FC<VerbalWalkthroughModalProps> = ({
  visible,
  onClose,
  onConfirmCompile,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recordingRef = useRef<any | null>(null);
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

  const startRecording = async () => {
    try {
      console.log("[VerbalWalkthrough] Requesting microphone permissions...");
      let permissionStatus = "granted";
      if (Platform.OS === "android") {
        const res = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
        permissionStatus = res === PermissionsAndroid.RESULTS.GRANTED ? "granted" : res;
      }
      console.log("[VerbalWalkthrough] Permission status:", permissionStatus);

      if (permissionStatus !== "granted") {
        console.warn("[VerbalWalkthrough] Microphone permission denied");
        Alert.alert("Permiso requerido", "Debes permitir el acceso al micrófono para grabar tu explicación.");
        return;
      }

      console.log("[VerbalWalkthrough] Preparing audio recorder...");
      const dynamicRequire = typeof require !== "undefined" ? require : null;
      let expoAv: any = null;
      try {
        expoAv = dynamicRequire ? dynamicRequire("expo-av") : null;
      } catch {
        expoAv = null;
      }

      if (expoAv?.Audio) {
        const permission = await expoAv.Audio.requestPermissionsAsync();
        console.log("[VerbalWalkthrough] Expo Audio permission status:", permission.status);
        await expoAv.Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        const { recording } = await expoAv.Audio.Recording.createAsync(
          expoAv.Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        recordingRef.current = { type: "expo-av", instance: recording };
      } else if (NativeModules.JetpackInkModule?.startAudioRecording) {
        const uri = await NativeModules.JetpackInkModule.startAudioRecording();
        recordingRef.current = { type: "native-ink", uri };
      } else {
        throw new Error(
          "Módulo nativo de grabación no encontrado en este APK. Ejecuta 'npx expo run:android' o escribe/dicta con el teclado en el cuadro inferior."
        );
      }

      setAudioDuration(0);
      setIsRecording(true);
      console.log("[VerbalWalkthrough] Recording started successfully");
      timerRef.current = setInterval(() => {
        setAudioDuration((prev) => {
          if (prev + 1 >= MAX_RECORDING_DURATION_SEC) {
            stopRecording();
            return MAX_RECORDING_DURATION_SEC;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (error: any) {
      console.error("[VerbalWalkthrough] Error starting recording:", error);
      Alert.alert("Grabación de Voz", error?.message || "No se pudo iniciar la grabación de audio.");
    }
  };

  const stopRecording = async () => {
    try {
      console.log("[VerbalWalkthrough] Stopping recording...");
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (!recordingRef.current) {
        console.warn("[VerbalWalkthrough] No active recording found in ref");
        setIsRecording(false);
        return;
      }

      setIsRecording(false);
      let uri: string | null = null;
      if (recordingRef.current.type === "expo-av") {
        await recordingRef.current.instance.stopAndUnloadAsync();
        uri = recordingRef.current.instance.getURI();
      } else if (recordingRef.current.type === "native-ink") {
        uri = await NativeModules.JetpackInkModule.stopAudioRecording();
      }
      console.log("[VerbalWalkthrough] Recording stopped. File URI:", uri);

      if (!uri) {
        console.error("[VerbalWalkthrough] Recording URI is null or undefined");
        return;
      }

      const fileInfo = await FileSystem.getInfoAsync(uri);
      console.log("[VerbalWalkthrough] Audio File Info:", JSON.stringify(fileInfo));

      if (!fileInfo.exists || (fileInfo as any).size === 0) {
        console.error("[VerbalWalkthrough] Recorded audio file is empty or missing!");
        Alert.alert("Error de Audio", "El archivo de audio grabado está vacío o no se pudo guardar.");
        return;
      }

      setIsTranscribing(true);
      console.log("[VerbalWalkthrough] Dispatching audio to transcription service...");
      const transcribedText = await TranscriptionService.transcribeAudio(uri);
      console.log("[VerbalWalkthrough] Transcription received:", transcribedText);

      setTranscript((prev) => (prev ? `${prev} ${transcribedText}`.trim() : transcribedText));
    } catch (error: any) {
      console.error("[VerbalWalkthrough] Error stopping or transcribing audio:", error);
      Alert.alert("Error de Transcripción", error?.message || "No se pudo transcribir el audio.");
    } finally {
      setIsTranscribing(false);
      recordingRef.current = null;
    }
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
          <Text style={styles.promptTitle}>¿Deseas explicar tu mapa en voz alta antes de compilar? (Opcional)</Text>
          <Text style={styles.promptSubtitle}>
            Explica tu mapa en voz alta (hasta 3 minutos). La IA contrastará tu explicación verbal con tu dibujo para detectar vacíos conceptuales y falacias lógicas.
          </Text>
          <View style={styles.recorderSection}>
            <TouchableOpacity
              style={[styles.recordBtn, isRecording && styles.recordBtnActive]}
              onPress={() => (isRecording ? stopRecording() : startRecording())}
              disabled={isTranscribing}
            >
              <Mic size={16} color={isRecording ? "#FECACA" : "#38BDF8"} strokeWidth={2.0} />
              <Text style={[styles.recordBtnText, isRecording && styles.recordBtnTextActive]}>
                {isRecording ? `[ ⏹️ Detener (${formatTime(audioDuration)} / 3:00) ]` : "[ 🎙️ Grabar Explicación (hasta 3 min) ]"}
              </Text>
            </TouchableOpacity>
            {isTranscribing && (
              <View style={styles.transcribingBox}>
                <ActivityIndicator size="small" color="#38BDF8" />
                <Text style={styles.transcribingText}>Transcribiendo explicación con IA...</Text>
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
            <TouchableOpacity style={styles.skipBtn} onPress={() => onConfirmCompile(null)} disabled={isRecording || isTranscribing}>
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
