import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Dimensions,
  TouchableWithoutFeedback,
} from "react-native";
import { PassiveAttributeType } from "../../types/canvas";

export interface SemanticAnchorTooltipProps {
  visible: boolean;
  screenX: number;
  screenY: number;
  worldX: number;
  worldY: number;
  onSave: (
    type: PassiveAttributeType,
    title: string,
    note: string,
    worldX: number,
    worldY: number
  ) => void;
  onClose: () => void;
}

const TYPE_CONFIG = {
  CAUSAL_MECHANISM: {
    icon: "⚙️",
    label: "Mecanismo",
    color: "#38BDF8",
    bgActive: "#0C4A6E",
    borderActive: "#38BDF8",
    defaultTitle: "Mecanismo Causal",
    hint: "¿Cómo funciona este proceso causa-efecto?",
  },
  ANALOGY: {
    icon: "💡",
    label: "Analogía",
    color: "#818CF8",
    bgActive: "#312E81",
    borderActive: "#818CF8",
    defaultTitle: "Analogía Cognitiva",
    hint: "¿A qué se parece o con qué modelo mental conecta?",
  },
  EVIDENCE: {
    icon: "🔬",
    label: "Evidencia",
    color: "#34D399",
    bgActive: "#064E3B",
    borderActive: "#34D399",
    defaultTitle: "Evidencia Empírica",
    hint: "¿Qué datos, experimentos o fuentes lo respaldan?",
  },
};

export const SemanticAnchorTooltip: React.FC<SemanticAnchorTooltipProps> = ({
  visible,
  screenX,
  screenY,
  worldX,
  worldY,
  onSave,
  onClose,
}) => {
  const [selectedType, setSelectedType] = useState<PassiveAttributeType>("CAUSAL_MECHANISM");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [hasAudioRecorded, setHasAudioRecorded] = useState(false);

  useEffect(() => {
    if (visible) {
      setTitle("");
      setNote("");
      setIsRecordingAudio(false);
      setHasAudioRecorded(false);
    }
  }, [visible]);

  if (!visible) return null;

  const { width: windowWidth, height: windowHeight } = Dimensions.get("window");
  const CARD_WIDTH = 320;
  const CARD_HEIGHT = 330;

  // Smart floating positioning avoiding toolbar and screen edges
  let left = screenX + 16;
  if (left + CARD_WIDTH > windowWidth - 20) {
    left = Math.max(16, screenX - CARD_WIDTH - 16);
  }

  let top = screenY - 50;
  if (top + CARD_HEIGHT > windowHeight - 70) {
    top = windowHeight - CARD_HEIGHT - 70;
  }
  top = Math.max(70, top); // Keep clear of top toolbar (56dp + margin)

  const activeConfig = TYPE_CONFIG[selectedType];

  const handleSave = () => {
    const finalTitle = title.trim() || activeConfig.defaultTitle;
    const finalNote = note.trim() || (hasAudioRecorded ? "🎙️ [Nota de voz grabada para auditoría GRINDE]" : "Anotación conceptual");
    onSave(selectedType, finalTitle, finalNote, worldX, worldY);
    onClose();
  };

  const handleToggleVoice = () => {
    if (!isRecordingAudio) {
      setIsRecordingAudio(true);
      setTimeout(() => {
        setIsRecordingAudio(false);
        setHasAudioRecorded(true);
      }, 1500);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={onClose}>
      <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
        <TouchableWithoutFeedback>
          <View
            style={[
              styles.card,
              {
                left,
                top,
                width: CARD_WIDTH,
                borderColor: activeConfig.borderActive,
              },
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.titleRow}>
                <Text style={styles.headerIcon}>📌</Text>
                <Text style={styles.headerTitle}>Anclar Atributo</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Type selector chips */}
            <View style={styles.typeSelector}>
              {(Object.keys(TYPE_CONFIG) as PassiveAttributeType[]).map((t) => {
                const conf = TYPE_CONFIG[t];
                const isActive = selectedType === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.typeChip,
                      isActive && {
                        backgroundColor: conf.bgActive,
                        borderColor: conf.borderActive,
                      },
                    ]}
                    onPress={() => setSelectedType(t)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.chipIcon}>{conf.icon}</Text>
                    <Text
                      style={[
                        styles.chipText,
                        isActive && { color: conf.color, fontWeight: "700" },
                      ]}
                    >
                      {conf.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Title input */}
            <TextInput
              style={styles.titleInput}
              placeholder={activeConfig.defaultTitle}
              placeholderTextColor="#64748B"
              value={title}
              onChangeText={setTitle}
              autoFocus
            />

            {/* Note input */}
            <TextInput
              style={styles.noteInput}
              placeholder={activeConfig.hint}
              placeholderTextColor="#64748B"
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={2}
            />

            {/* Voice Dictation (Justin Sung Verbal Retrieval) */}
            <TouchableOpacity
              style={[
                styles.voiceBtn,
                isRecordingAudio && styles.voiceBtnRecording,
                hasAudioRecorded && styles.voiceBtnActive,
              ]}
              onPress={handleToggleVoice}
              activeOpacity={0.7}
            >
              <Text style={styles.voiceIcon}>
                {isRecordingAudio ? "🔴" : hasAudioRecorded ? "✅" : "🎙️"}
              </Text>
              <Text style={styles.voiceText}>
                {isRecordingAudio
                  ? "Grabando audio..."
                  : hasAudioRecorded
                  ? "Audio grabado (Verbal Retrieval)"
                  : "Grabar audio rápido"}
              </Text>
            </TouchableOpacity>

            {/* Action buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: activeConfig.borderActive }]}
                onPress={handleSave}
                activeOpacity={0.8}
              >
                <Text style={styles.saveBtnText}>Anclar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  card: {
    position: "absolute",
    backgroundColor: "#0F172A",
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 20,
    zIndex: 999,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerIcon: {
    fontSize: 14,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#E2E8F0",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    fontSize: 14,
    color: "#94A3B8",
    fontWeight: "600",
  },
  typeSelector: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 10,
  },
  typeChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#1E293B",
  },
  chipIcon: {
    fontSize: 12,
  },
  chipText: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "500",
  },
  titleInput: {
    backgroundColor: "#1E293B",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#334155",
    color: "#F8FAFC",
    fontSize: 13,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 8,
  },
  noteInput: {
    backgroundColor: "#1E293B",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#334155",
    color: "#F8FAFC",
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    height: 54,
    textAlignVertical: "top",
    marginBottom: 8,
  },
  voiceBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#1E293B",
    marginBottom: 12,
  },
  voiceBtnRecording: {
    borderColor: "#EF4444",
    backgroundColor: "#450A0A",
  },
  voiceBtnActive: {
    borderColor: "#10B981",
    backgroundColor: "#064E3B",
  },
  voiceIcon: {
    fontSize: 13,
  },
  voiceText: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "500",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  cancelBtn: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 7,
    backgroundColor: "#1E293B",
  },
  cancelBtnText: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "600",
  },
  saveBtn: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 7,
  },
  saveBtnText: {
    fontSize: 12,
    color: "#0F172A",
    fontWeight: "700",
  },
});
