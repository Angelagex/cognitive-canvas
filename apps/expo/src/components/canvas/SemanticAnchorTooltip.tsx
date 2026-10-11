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
import { PassiveAttributeType, EntityBoundingBox } from "../../types/canvas";

export interface SemanticAnchorTooltipProps {
  visible: boolean;
  screenX: number;
  screenY: number;
  worldX: number;
  worldY: number;
  entityBounds?: EntityBoundingBox | null;
  canvasScale?: number;
  canvasTranslateX?: number;
  canvasTranslateY?: number;
  onModalOpen?: () => void;
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
  entityBounds,
  canvasScale,
  canvasTranslateX,
  canvasTranslateY,
  onModalOpen,
  onSave,
  onClose,
}) => {
  const [stage, setStage] = useState<"icon" | "modal">("icon");
  const [selectedType, setSelectedType] = useState<PassiveAttributeType>("CAUSAL_MECHANISM");
  const [note, setNote] = useState("");
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [hasAudioRecorded, setHasAudioRecorded] = useState(false);

  useEffect(() => {
    if (visible) {
      setStage("icon");
      setNote("");
      setIsRecordingAudio(false);
      setHasAudioRecorded(false);
    }
  }, [visible]);

  if (!visible) return null;

  const { width: windowWidth, height: windowHeight } = Dimensions.get("window");
  const activeConfig = TYPE_CONFIG[selectedType];

  const handleSave = () => {
    const finalTitle = activeConfig.defaultTitle;
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

  const handleOpenModal = () => {
    setStage("modal");
    onModalOpen?.();
  };

  // 1. Stage "icon": 3 Semantic Pills Micro-Menu (ADR V5 & Finger Tap)
  if (stage === "icon") {
    const MENU_WIDTH = 290;
    const MENU_HEIGHT = 44;
    let menuLeft = screenX - MENU_WIDTH / 2;
    let menuTop = screenY - MENU_HEIGHT - 14;

    // Position adjacent to entity if bounds exist
    if (entityBounds && canvasScale !== undefined && canvasTranslateX !== undefined && canvasTranslateY !== undefined) {
      const entityCenterX = ((entityBounds.xmin + entityBounds.xmax) / 2) * canvasScale + canvasTranslateX;
      const entityTop = entityBounds.ymin * canvasScale + canvasTranslateY;
      menuLeft = entityCenterX - MENU_WIDTH / 2;
      menuTop = entityTop - MENU_HEIGHT - 12;
    }

    menuLeft = Math.max(16, Math.min(windowWidth - MENU_WIDTH - 16, menuLeft));
    menuTop = Math.max(65, Math.min(windowHeight - MENU_HEIGHT - 20, menuTop));

    return (
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
          {/* Subtle Focus Glow over recognized entity */}
          {entityBounds && canvasScale !== undefined && canvasTranslateX !== undefined && canvasTranslateY !== undefined && (
            <View
              pointerEvents="none"
              style={[
                styles.focusGlow,
                {
                  left: entityBounds.xmin * canvasScale + canvasTranslateX - 4,
                  top: entityBounds.ymin * canvasScale + canvasTranslateY - 4,
                  width: (entityBounds.xmax - entityBounds.xmin) * canvasScale + 8,
                  height: (entityBounds.ymax - entityBounds.ymin) * canvasScale + 8,
                },
              ]}
            />
          )}

          {/* Micro-Menu with 3 Semantic Pills */}
          <View
            style={[
              styles.microMenuContainer,
              { left: menuLeft, top: menuTop },
            ]}
          >
            {(Object.keys(TYPE_CONFIG) as PassiveAttributeType[]).map((t) => {
              const conf = TYPE_CONFIG[t];
              return (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.semanticPill,
                    {
                      backgroundColor: conf.bgActive,
                      borderColor: conf.borderActive,
                    },
                  ]}
                  onPress={() => {
                    setSelectedType(t);
                    setStage("modal");
                    onModalOpen?.();
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.semanticPillIcon}>{conf.icon}</Text>
                  <Text style={[styles.semanticPillText, { color: conf.color }]}>
                    {conf.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </TouchableWithoutFeedback>
    );
  }

  // 2. Stage "modal": Full attribute anchoring modal with title input removed
  const CARD_WIDTH = 320;
  const CARD_HEIGHT = 270;

  // Smart floating positioning avoiding toolbar, screen edges and entity overlap
  let left = screenX + 16;
  let top = screenY - 50;

  if (entityBounds && canvasScale !== undefined && canvasTranslateX !== undefined && canvasTranslateY !== undefined) {
    const entityRight = entityBounds.xmax * canvasScale + canvasTranslateX;
    const entityTop = entityBounds.ymin * canvasScale + canvasTranslateY;
    left = entityRight + 12;
    top = entityTop - 20;
  }

  if (left + CARD_WIDTH > windowWidth - 20) {
    left = Math.max(16, screenX - CARD_WIDTH - 16);
  }

  if (top + CARD_HEIGHT > windowHeight - 70) {
    top = windowHeight - CARD_HEIGHT - 70;
  }
  top = Math.max(70, top); // Keep clear of top toolbar (56dp + margin)

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

            {/* Note input (only input maintained) */}
            <TextInput
              style={styles.noteInput}
              placeholder={activeConfig.hint}
              placeholderTextColor="#64748B"
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={2}
              autoFocus
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
  focusGlow: {
    position: "absolute",
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "rgba(56, 189, 248, 0.45)",
    backgroundColor: "rgba(56, 189, 248, 0.08)",
  },
  microMenuContainer: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.92)",
    borderRadius: 22,
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
    gap: 6,
  },
  semanticPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  semanticPillIcon: {
    fontSize: 13,
  },
  semanticPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  floatingAnchorBtn: {
    position: "absolute",
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(15, 23, 42, 0.92)",
    borderWidth: 2,
    borderColor: "#38BDF8",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#38BDF8",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 12,
    elevation: 16,
    zIndex: 999,
  },
  floatingAnchorInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  floatingPlus: {
    fontSize: 20,
    fontWeight: "800",
    color: "#38BDF8",
    lineHeight: 24,
  },
  floatingPin: {
    fontSize: 13,
    marginLeft: 1,
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
