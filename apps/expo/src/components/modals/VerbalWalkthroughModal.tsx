import React, { useState, useEffect } from "react";
import { StyleSheet, Modal, View, Text, TouchableOpacity, TextInput, Alert, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import { Mic, X, Check, Trash2, ArrowRight } from "@sketchyicons/react-native";
import { loadDocument, updateDocumentMetadata } from "../../services/StorageService";
import { useSkin, fonts, radius, border } from "../../theme";
import { Button } from "../ui";

export interface WalkthroughConfirmParams {
  transcript: string;
  isIncremental: boolean;
}

export interface VerbalWalkthroughModalProps {
  visible: boolean;
  onClose: () => void;
  onSaveExplanation?: (transcript: string) => void;
  onConfirmCompile?: (params: WalkthroughConfirmParams) => void;
  onStartRecording?: (currentDraft: string) => void;
  canvasId?: string;
  initialTranscript?: string;
}

export const VerbalWalkthroughModal: React.FC<VerbalWalkthroughModalProps> = ({
  visible,
  onClose,
  onSaveExplanation,
  onConfirmCompile,
  onStartRecording,
  canvasId,
  initialTranscript = "",
}) => {
  const { skin } = useSkin();
  const [transcript, setTranscript] = useState<string>(initialTranscript);

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
    Alert.alert("Limpiar explicación", "¿Deseas borrar la explicación adjunta a este mapa?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Borrar",
        style: "destructive",
        onPress: async () => {
          setTranscript("");
          if (canvasId) {
            await updateDocumentMetadata(canvasId, { verbalWalkthroughTranscript: "" });
          }
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        },
      },
    ]);
  };

  const handleSaveOnly = async () => {
    const cleanText = transcript.trim();
    if (canvasId) {
      await updateDocumentMetadata(canvasId, { verbalWalkthroughTranscript: cleanText });
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    if (onSaveExplanation) {
      onSaveExplanation(cleanText);
    }
    onClose();
  };

  const handleSaveAndCompile = async () => {
    const cleanText = transcript.trim();
    if (canvasId) {
      await updateDocumentMetadata(canvasId, { verbalWalkthroughTranscript: cleanText });
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    if (onSaveExplanation) {
      onSaveExplanation(cleanText);
    }
    if (onConfirmCompile) {
      onConfirmCompile({ transcript: cleanText, isIncremental: true });
    }
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.card,
            {
              backgroundColor: skin.surface,
              borderColor: skin.border,
              borderWidth: border.strong,
              borderRadius: radius.card,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleGroup}>
              <Mic size={18} color={skin.primary} strokeWidth={2.0} />
              <Text
                style={[
                  styles.headerTitle,
                  {
                    color: skin.text,
                    fontFamily: fonts.display,
                    fontWeight: "normal",
                  },
                ]}
              >
                EXPLICA TU MAPA
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.closeBtn,
                {
                  backgroundColor: skin.surfaceAlt,
                  borderColor: skin.borderSoft,
                  borderWidth: border.soft,
                },
              ]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <X size={16} color={skin.textMuted} strokeWidth={2.0} />
            </TouchableOpacity>
          </View>

          {/* Texto de ayuda (§4 regla 5) */}
          <Text
            style={[
              styles.promptSubtitle,
              {
                color: skin.textMuted,
                fontFamily: fonts.ui,
                fontWeight: "normal",
              },
            ]}
          >
            Describe el recorrido causal de tu mapa en voz alta o por escrito para que el compilador detecte omisiones y modelos mentales inválidos.
          </Text>

          {/* Textarea */}
          <TextInput
            style={[
              styles.transcriptInput,
              {
                backgroundColor: skin.bg,
                borderColor: skin.borderSoft,
                borderWidth: border.soft,
                borderRadius: radius.tool,
                color: skin.text,
                fontFamily: fonts.ui,
                fontWeight: "normal",
              },
            ]}
            value={transcript}
            onChangeText={setTranscript}
            placeholder="Escribe o graba aquí el recorrido causal (ej. cómo interactúa V8 con Libuv, backpressure, modos de fallo)..."
            placeholderTextColor={skin.textMuted}
            multiline
          />

          {/* Controles de grabación y limpieza */}
          <View style={styles.controlsRow}>
            <TouchableOpacity
              style={[
                styles.recordBtn,
                {
                  backgroundColor: `${skin.primary}18`,
                  borderColor: skin.primary,
                  borderWidth: border.soft,
                  borderRadius: radius.pill,
                },
              ]}
              onPress={handleRecordOrAppend}
              activeOpacity={0.8}
            >
              <Mic size={14} color={skin.primary} strokeWidth={2.0} />
              <Text
                style={[
                  styles.recordBtnText,
                  {
                    color: skin.primary,
                    fontFamily: fonts.uiBold,
                    fontWeight: "normal",
                  },
                ]}
              >
                {transcript.trim() ? "Grabar / Anexar · hasta 45 s" : "Grabar · hasta 45 s"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.clearBtn,
                {
                  backgroundColor: skin.surfaceAlt,
                  borderColor: skin.borderSoft,
                  borderWidth: border.soft,
                  borderRadius: radius.pill,
                  opacity: transcript.trim() ? 1 : 0.45,
                },
              ]}
              onPress={handleClearText}
              disabled={!transcript.trim()}
              activeOpacity={0.75}
            >
              <Trash2 size={13} color={transcript.trim() ? skin.alert : skin.textMuted} strokeWidth={2.0} />
              <Text
                style={[
                  styles.clearBtnText,
                  {
                    color: transcript.trim() ? skin.alert : skin.textMuted,
                    fontFamily: fonts.uiSemi,
                    fontWeight: "normal",
                  },
                ]}
              >
                Limpiar
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer de Acciones: Cancelar + Guardar explicación + Enlace secundario */}
          <View style={styles.actionsFooter}>
            <Button
              label="Cancelar"
              variant="outline"
              size="md"
              onPress={onClose}
              style={{ flex: 1 }}
            />
            <Button
              label="Guardar explicación"
              variant="primary"
              size="md"
              icon={<Check size={14} color={skin.onPrimary} strokeWidth={2.4} />}
              onPress={handleSaveOnly}
              style={{ flex: 2 }}
            />
          </View>

          {/* Enlace secundario opcional: Guardar y compilar */}
          {Boolean(transcript.trim()) && (
            <TouchableOpacity
              style={styles.saveAndCompileLink}
              onPress={handleSaveAndCompile}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.saveAndCompileText,
                  {
                    color: skin.primary,
                    fontFamily: fonts.monoBold,
                    fontWeight: "normal",
                  },
                ]}
              >
                Guardar y compilar ahora
              </Text>
              <ArrowRight size={12} color={skin.primary} strokeWidth={2.2} />
            </TouchableOpacity>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(12, 14, 20, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: 520,
    maxWidth: "96%",
    padding: 20,
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    letterSpacing: -0.2,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  promptSubtitle: {
    fontSize: 12,
    lineHeight: 18,
  },
  transcriptInput: {
    fontSize: 13,
    padding: 12,
    minHeight: 130,
    textAlignVertical: "top",
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  recordBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  recordBtnText: {
    fontSize: 12,
  },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  clearBtnText: {
    fontSize: 12,
  },
  actionsFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  saveAndCompileLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 6,
  },
  saveAndCompileText: {
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
});
