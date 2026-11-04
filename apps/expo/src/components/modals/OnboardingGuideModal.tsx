import React, { useState } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Modal } from "react-native";
import * as Haptics from "expo-haptics";
import { Network, Mic, Zap, ArrowRight, Check } from "@sketchyicons/react-native";
import { getUserPreferences, saveUserPreferences } from "../../services/StorageService";
import { useSkin, fonts, radius, border } from "../../theme";
import { Button, HardShadow } from "../ui";

export interface OnboardingGuideModalProps {
  visible: boolean;
  onClose: () => void;
}

export async function checkHasSeenOnboarding(): Promise<boolean> {
  try {
    const prefs = await getUserPreferences();
    return Boolean(prefs.has_seen_onboarding);
  } catch {
    return false;
  }
}

export async function markHasSeenOnboarding(): Promise<void> {
  try {
    await saveUserPreferences({ has_seen_onboarding: true });
  } catch {}
}

const STEPS = [
  {
    stepNum: "01",
    title: "DIBUJA EN RED",
    body: "Agrupa tus ideas en islas conceptuales y conéctalas con flechas direccionales o bucles de retroalimentación usando el S-Pen.",
    hint: "El sistema organiza tus conceptos en sustratos, mecanismos y sistemas macro automáticamente.",
    Icon: Network,
  },
  {
    stepNum: "02",
    title: "EXPLICA TU RAZONAMIENTO",
    body: "Opcional: toca 'Explicar' para resumir tu mapa en voz alta (hasta 45 s) o escribiendo tus supuestos clave.",
    hint: "La IA coteja tu explicación verbal con tus trazos para descubrir qué modelos mentales estás asumiendo.",
    Icon: Mic,
  },
  {
    stepNum: "03",
    title: "COMPILA Y REVISA",
    body: "Toca 'Compilar' para generar tu grafo causal. Revisa en el panel Análisis tus puntos ciegos, falacias y desafíos socráticos.",
    hint: "Defiende los invariantes respondiendo a los desafíos para alcanzar el estado de Verificado.",
    Icon: Zap,
  },
];

export const OnboardingGuideModal: React.FC<OnboardingGuideModalProps> = ({
  visible,
  onClose,
}) => {
  const { skin } = useSkin();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  if (!visible) return null;

  const currentStep = STEPS[currentStepIndex];
  const isLast = currentStepIndex === STEPS.length - 1;

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (isLast) {
      markHasSeenOnboarding();
      onClose();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    markHasSeenOnboarding();
    onClose();
  };

  const CurrentIcon = currentStep.Icon;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleSkip}
    >
      <View style={styles.backdrop}>
        <View style={styles.cardContainer}>
          <HardShadow offset="lg" radius={radius.card} shadowColor={skin.shadow}>
            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor: skin.surface,
                  borderColor: skin.border,
                  borderWidth: border.strong,
                  borderRadius: radius.card,
                },
              ]}
            >
              {/* Barra superior con Paso y Botón Omitir */}
              <View style={styles.topRow}>
                <View
                  style={[
                    styles.stepBadge,
                    {
                      backgroundColor: `${skin.primary}18`,
                      borderColor: skin.primary,
                      borderWidth: border.soft,
                      borderRadius: radius.pill,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.stepBadgeText,
                      { color: skin.primary, fontFamily: fonts.monoBold },
                    ]}
                  >
                    PASO {currentStep.stepNum} DE 03
                  </Text>
                </View>

                {/* Botón Omitir siempre visible (§8) */}
                <TouchableOpacity
                  onPress={handleSkip}
                  style={styles.skipBtn}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.skipBtnText,
                      { color: skin.textMuted, fontFamily: fonts.uiBold },
                    ]}
                  >
                    Omitir
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Icono central destacado */}
              <View
                style={[
                  styles.iconHalo,
                  {
                    backgroundColor: `${skin.primary}12`,
                    borderColor: `${skin.primary}33`,
                    borderWidth: border.strong,
                  },
                ]}
              >
                <CurrentIcon size={38} color={skin.primary} strokeWidth={2.0} />
              </View>

              {/* Título Display y Texto del Paso */}
              <Text
                style={[
                  styles.title,
                  { color: skin.text, fontFamily: fonts.display },
                ]}
              >
                {currentStep.title}
              </Text>

              <Text
                style={[
                  styles.bodyText,
                  { color: skin.text, fontFamily: fonts.ui },
                ]}
              >
                {currentStep.body}
              </Text>

              <View
                style={[
                  styles.hintBox,
                  {
                    backgroundColor: skin.surfaceAlt,
                    borderColor: skin.borderSoft,
                    borderWidth: border.soft,
                    borderRadius: radius.card,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.hintText,
                    { color: skin.textMuted, fontFamily: fonts.ui },
                  ]}
                >
                  {currentStep.hint}
                </Text>
              </View>

              {/* Indicadores de punto (Dots) */}
              <View style={styles.dotsRow}>
                {STEPS.map((_, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => setCurrentStepIndex(idx)}
                    style={[
                      styles.dot,
                      {
                        backgroundColor:
                          idx === currentStepIndex ? skin.primary : skin.borderSoft,
                        width: idx === currentStepIndex ? 20 : 7,
                      },
                    ]}
                  />
                ))}
              </View>

              {/* Botón de Acción Principal */}
              <View style={styles.actionRow}>
                <Button
                  label={isLast ? "Comenzar a estudiar" : "Siguiente"}
                  variant="primary"
                  size="md"
                  onPress={handleNext}
                  icon={
                    isLast ? (
                      <Check size={16} color={skin.onPrimary} strokeWidth={2.2} />
                    ) : (
                      <ArrowRight size={16} color={skin.onPrimary} strokeWidth={2.2} />
                    )
                  }
                  style={{ width: "100%" }}
                />
              </View>
            </View>
          </HardShadow>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  cardContainer: {
    width: "100%",
    maxWidth: 440,
  },
  modalCard: {
    padding: 24,
    gap: 16,
    alignItems: "center",
  },
  topRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  stepBadgeText: {
    fontSize: 10,
    letterSpacing: 0.8,
  },
  skipBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  skipBtnText: {
    fontSize: 12,
  },
  iconHalo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  title: {
    fontSize: 22,
    letterSpacing: 0.5,
    textAlign: "center",
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  hintBox: {
    width: "100%",
    padding: 12,
  },
  hintText: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginVertical: 4,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  actionRow: {
    width: "100%",
    marginTop: 8,
  },
});
