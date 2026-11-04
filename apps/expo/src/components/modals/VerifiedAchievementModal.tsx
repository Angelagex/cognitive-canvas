import React, { useEffect } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Modal } from "react-native";
import * as Haptics from "expo-haptics";
import { Check, ShieldCheck } from "@sketchyicons/react-native";
import { useSkin, fonts, radius, border } from "../../theme";
import { HardShadow } from "../ui";

export interface VerifiedAchievementModalProps {
  visible: boolean;
  onClose: () => void;
  canvasTitle: string;
  strokeCount: number;
  nodeCount: number;
  edgeCount: number;
}

export const VerifiedAchievementModal: React.FC<VerifiedAchievementModalProps> = ({
  visible,
  onClose,
  canvasTitle,
  strokeCount,
  nodeCount,
  edgeCount,
}) => {
  const { skin } = useSkin();

  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.backdrop}
        onPress={onClose}
        activeOpacity={1}
      >
        <View style={styles.contentContainer}>
          {/* Cinta Ámbar "VERIFICADO" (§9) */}
          <View
            style={[
              styles.amberRibbon,
              {
                backgroundColor: skin.warm,
                borderRadius: radius.pill,
              },
            ]}
          >
            <ShieldCheck size={14} color="#0C0E14" strokeWidth={2.4} />
            <Text
              style={[
                styles.amberRibbonText,
                { fontFamily: fonts.monoBold },
              ]}
            >
              VERIFICADO
            </Text>
          </View>

          {/* Título en Display Enorme */}
          <Text
            style={[
              styles.displayTitle,
              { color: "#F8FAFC", fontFamily: fonts.display },
            ]}
            numberOfLines={2}
          >
            {canvasTitle.toUpperCase()}
          </Text>

          {/* Losa de Presentación del Mapa */}
          <View style={styles.slabWrapper}>
            <HardShadow offset="lg" radius={radius.card} shadowColor="rgba(0,0,0,0.6)">
              <View
                style={[
                  styles.slabCard,
                  {
                    backgroundColor: "#161B26",
                    borderColor: skin.warm,
                    borderWidth: border.strong,
                    borderRadius: radius.card,
                  },
                ]}
              >
                <View style={styles.slabInnerGlow}>
                  <Check size={36} color={skin.warm} strokeWidth={2.6} />
                  <Text
                    style={[
                      styles.slabSubtext,
                      { color: "#E2E8F0", fontFamily: fonts.uiBold },
                    ]}
                  >
                    Modelo Causal Verificado
                  </Text>
                  <Text
                    style={[
                      styles.slabDescription,
                      { color: "#94A3B8", fontFamily: fonts.ui },
                    ]}
                  >
                    Todos los invariantes y rupturas de modelo han sido defendidos satisfactoriamente.
                  </Text>
                </View>
              </View>
            </HardShadow>
          </View>

          {/* Tres Números Clave (§9): Trazos · Nodos · Enlaces */}
          <View style={styles.statsRow}>
            <View
              style={[
                styles.statBox,
                {
                  backgroundColor: "#161B26",
                  borderColor: skin.borderSoft,
                  borderWidth: border.soft,
                  borderRadius: radius.card,
                },
              ]}
            >
              <Text
                style={[
                  styles.statValue,
                  { color: skin.warm, fontFamily: fonts.display },
                ]}
              >
                {strokeCount}
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  { color: "#94A3B8", fontFamily: fonts.monoBold },
                ]}
              >
                TRAZOS
              </Text>
            </View>

            <View
              style={[
                styles.statBox,
                {
                  backgroundColor: "#161B26",
                  borderColor: skin.borderSoft,
                  borderWidth: border.soft,
                  borderRadius: radius.card,
                },
              ]}
            >
              <Text
                style={[
                  styles.statValue,
                  { color: skin.primary, fontFamily: fonts.display },
                ]}
              >
                {nodeCount}
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  { color: "#94A3B8", fontFamily: fonts.monoBold },
                ]}
              >
                NODOS
              </Text>
            </View>

            <View
              style={[
                styles.statBox,
                {
                  backgroundColor: "#161B26",
                  borderColor: skin.borderSoft,
                  borderWidth: border.soft,
                  borderRadius: radius.card,
                },
              ]}
            >
              <Text
                style={[
                  styles.statValue,
                  { color: "#10B981", fontFamily: fonts.display },
                ]}
              >
                {edgeCount}
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  { color: "#94A3B8", fontFamily: fonts.monoBold },
                ]}
              >
                ENLACES
              </Text>
            </View>
          </View>

          {/* Prompt "Toca para continuar" */}
          <Text
            style={[
              styles.continuePrompt,
              { color: "#64748B", fontFamily: fonts.mono },
            ]}
          >
            TOCA EN CUALQUIER LUGAR PARA CONTINUAR
          </Text>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(10, 12, 18, 0.94)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  contentContainer: {
    width: "100%",
    maxWidth: 480,
    alignItems: "center",
    gap: 18,
  },
  amberRibbon: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 6,
  },
  amberRibbonText: {
    color: "#0C0E14",
    fontSize: 11,
    letterSpacing: 1.4,
  },
  displayTitle: {
    fontSize: 28,
    letterSpacing: 0.8,
    textAlign: "center",
    lineHeight: 34,
  },
  slabWrapper: {
    width: "100%",
    marginVertical: 6,
  },
  slabCard: {
    width: "100%",
    padding: 24,
    alignItems: "center",
  },
  slabInnerGlow: {
    alignItems: "center",
    gap: 8,
  },
  slabSubtext: {
    fontSize: 16,
    letterSpacing: 0.3,
  },
  slabDescription: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    maxWidth: 320,
  },
  statsRow: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
  },
  statBox: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 24,
    letterSpacing: 0.5,
  },
  statLabel: {
    fontSize: 9,
    letterSpacing: 1.0,
  },
  continuePrompt: {
    fontSize: 11,
    letterSpacing: 1.0,
    marginTop: 8,
  },
});
