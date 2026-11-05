import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { Check, Settings, Mic, BrainCircuit, Trash2, Palette, ShieldCheck, Sparkles } from "@sketchyicons/react-native";
import { getUserPreferences, saveUserPreferences } from "../../../services/StorageService";
import { KeyStorageService } from "../../../services/KeyStorageService";
import { ToolbarDockEdge, CanvasThemePreset, CANVAS_THEMES, CANVAS_THEME_PRESETS, migrateCanvasTheme } from "../../../types/canvas";
import { useSkin, fonts, radius, border, SkinId, skins } from "../../../theme";

export interface SettingsTabProps {
  stylusOnly: boolean;
  onToggleStylusOnly: () => void;
  toolbarDockEdge: ToolbarDockEdge;
  onChangeDockEdge: (edge: ToolbarDockEdge) => void;
  canvasTheme: CanvasThemePreset;
  onSelectTheme: (theme: CanvasThemePreset) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  stylusOnly,
  onToggleStylusOnly,
  toolbarDockEdge,
  onChangeDockEdge,
  canvasTheme,
  onSelectTheme,
}) => {
  const { skin, skinActivo, setSkinActivo } = useSkin();
  const [apiKey, setApiKey] = useState("");
  const [isMasked, setIsMasked] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isStatusError, setIsStatusError] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);

  const [deepgramKey, setDeepgramKey] = useState("");
  const [learningGoal, setLearningGoal] = useState(
    "Dominar sistemas distribuidos, consenso Raft y control de congestión TCP"
  );
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    KeyStorageService.getApiKey().then((stored) => {
      if (stored) setApiKey(stored);
    });
    getUserPreferences().then((prefs) => {
      if (prefs.deepgram_api_key) setDeepgramKey(prefs.deepgram_api_key);
      if (prefs.target_learning_goal) setLearningGoal(prefs.target_learning_goal);
      if (prefs.default_theme) {
        onSelectTheme(migrateCanvasTheme(prefs.default_theme));
      }
    });
  }, [onSelectTheme]);

  const handleSaveGeminiKey = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const trimmed = apiKey.trim();
    if (trimmed.length > 0) {
      await KeyStorageService.setApiKey(trimmed);
      setStatusMessage("Clave Gemini guardada con seguridad.");
      setIsStatusError(false);
    } else {
      await KeyStorageService.clearApiKey();
      setStatusMessage("Clave Gemini eliminada.");
      setIsStatusError(false);
    }
  };

  const handleClearGeminiKey = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    await KeyStorageService.clearApiKey();
    setApiKey("");
    setStatusMessage("Clave Gemini borrada.");
    setIsStatusError(false);
  };

  const handleTestGeminiKey = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setIsTestingKey(true);
    setStatusMessage(null);
    try {
      const activeKey = apiKey.trim() || (await KeyStorageService.getApiKey());
      if (!activeKey) {
        setStatusMessage("Por favor ingresa una clave de API primero.");
        setIsStatusError(true);
        setIsTestingKey(false);
        return;
      }
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${activeKey}`
      );
      if (resp.ok) {
        setStatusMessage("Clave de Gemini válida.");
        setIsStatusError(false);
      } else {
        const data = await resp.json().catch(() => ({}));
        setStatusMessage(
          `Error en API (${resp.status}): ${data?.error?.message || "Clave no válida"}`
        );
        setIsStatusError(true);
      }
    } catch (err: any) {
      setStatusMessage(`Error de red: ${err?.message || "No se pudo conectar"}`);
      setIsStatusError(true);
    } finally {
      setIsTestingKey(false);
    }
  };

  const handleSaveSettings = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    await saveUserPreferences({
      deepgram_api_key: deepgramKey.trim(),
      target_learning_goal: learningGoal.trim(),
      toolbar_dock_edge: toolbarDockEdge,
      default_theme: canvasTheme,
      stylus_only_default: stylusOnly,
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2200);
  };

  const dockEdges: ToolbarDockEdge[] = ["left", "right", "top", "bottom"];
  const themes = CANVAS_THEME_PRESETS;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: skin.bg }]}
      contentContainerStyle={styles.content}
    >
      {/* ──────────────── Encabezado de Configuración ──────────────── */}
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Settings size={20} color={skin.primary} strokeWidth={2.0} />
          <Text
            style={[
              styles.heading,
              { color: skin.text, fontFamily: fonts.display },
            ]}
          >
            CONFIGURACIÓN DEL SISTEMA
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.saveBtn,
            { backgroundColor: skin.primary, borderRadius: radius.pill },
          ]}
          onPress={handleSaveSettings}
          activeOpacity={0.8}
        >
          <Check size={15} color={skin.onPrimary} strokeWidth={2.2} />
          <Text
            style={[
              styles.saveBtnText,
              { color: skin.onPrimary, fontFamily: fonts.uiBold },
            ]}
          >
            {savedNotice ? "Guardado" : "Guardar preferencias"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ──────────────── Skin del Tema de la App (Crema · Noche · Tinta) ──────────────── */}
      <View
        style={[
          styles.sectionCard,
          {
            backgroundColor: skin.surface,
            borderColor: skin.borderSoft,
            borderWidth: border.soft,
            borderRadius: radius.card,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <Palette size={16} color={skin.primary} strokeWidth={2.0} />
          <Text
            style={[
              styles.cardTitle,
              { color: skin.text, fontFamily: fonts.uiBold },
            ]}
          >
            Tema y Apariencia de la Interfaz
          </Text>
        </View>
        <Text
          style={[
            styles.cardDesc,
            { color: skin.textMuted, fontFamily: fonts.ui },
          ]}
        >
          Alterna entre las tres skins oficiales para evaluar la estética, legibilidad y contraste en vivo.
        </Text>

        <View style={styles.pillRow}>
          {(["crema", "noche", "tinta"] as SkinId[]).map((skId) => {
            const sk = skins[skId];
            const isSelected = skinActivo === skId;
            const labels: Record<SkinId, string> = {
              crema: "Crema",
              noche: "Noche",
              tinta: "Tinta",
            };
            const dotBg = skId === "tinta" ? "#2E3F7F" : sk.bg;
            const dotBorder = skId === "tinta" ? "#4C6FFF" : sk.border;
            return (
              <TouchableOpacity
                key={skId}
                style={[
                  styles.choicePill,
                  {
                    backgroundColor: isSelected ? skin.primary : skin.surfaceAlt,
                    borderColor: isSelected ? skin.primary : skin.borderSoft,
                    borderWidth: border.soft,
                    borderRadius: radius.pill,
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  setSkinActivo(skId);
                }}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: dotBg,
                      borderWidth: 1,
                      borderColor: dotBorder,
                    }}
                  />
                  <Text
                    style={[
                      styles.choicePillText,
                      {
                        color: isSelected ? skin.onPrimary : skin.text,
                        fontFamily: isSelected ? fonts.uiBold : fonts.ui,
                      },
                    ]}
                  >
                    {labels[skId]}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ──────────────── Gemini API Configuration (BYOK) ──────────────── */}
      <View
        style={[
          styles.sectionCard,
          {
            backgroundColor: skin.surface,
            borderColor: skin.borderSoft,
            borderWidth: border.soft,
            borderRadius: radius.card,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <BrainCircuit size={16} color={skin.primary} strokeWidth={2.0} />
          <Text
            style={[
              styles.cardTitle,
              { color: skin.text, fontFamily: fonts.uiBold },
            ]}
          >
            Configuración API de Gemini
          </Text>
        </View>
        <Text
          style={[
            styles.cardDesc,
            { color: skin.textMuted, fontFamily: fonts.ui },
          ]}
        >
          Almacenada con cifrado localmente en Android Keystore y enviada como x-gemini-api-key durante la compilación.
        </Text>

        <View style={styles.keyInputRow}>
          <TextInput
            style={[
              styles.input,
              {
                flex: 1,
                backgroundColor: skin.bg,
                borderColor: skin.borderSoft,
                color: skin.text,
                fontFamily: fonts.ui,
                borderWidth: border.soft,
                borderRadius: radius.card,
              },
            ]}
            value={apiKey}
            onChangeText={setApiKey}
            placeholder="AIzaSy..."
            placeholderTextColor={skin.textMuted}
            secureTextEntry={isMasked}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[
              styles.maskToggleBtn,
              {
                backgroundColor: skin.surfaceAlt,
                borderColor: skin.borderSoft,
                borderWidth: border.soft,
                borderRadius: radius.pill,
              },
            ]}
            onPress={() => setIsMasked((prev) => !prev)}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.maskToggleText,
                { color: skin.textMuted, fontFamily: fonts.uiBold },
              ]}
            >
              {isMasked ? "Mostrar" : "Ocultar"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.keyActionsRow}>
          <TouchableOpacity
            style={[
              styles.keyPrimaryBtn,
              { backgroundColor: skin.primary, borderRadius: radius.pill },
            ]}
            onPress={handleSaveGeminiKey}
            activeOpacity={0.8}
          >
            <Check size={14} color={skin.onPrimary} strokeWidth={2.2} />
            <Text style={[styles.keyBtnText, { color: skin.onPrimary, fontFamily: fonts.uiBold }]}>
              Guardar clave
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.keyTestBtn,
              {
                backgroundColor: skin.surfaceAlt,
                borderColor: skin.primary,
                borderWidth: border.soft,
                borderRadius: radius.pill,
              },
            ]}
            onPress={handleTestGeminiKey}
            disabled={isTestingKey}
            activeOpacity={0.8}
          >
            <Sparkles size={14} color={skin.primary} strokeWidth={2.0} />
            <Text style={[styles.keyBtnText, { color: skin.primary, fontFamily: fonts.uiBold }]}>
              {isTestingKey ? "Probando..." : "Probar clave"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.keyClearBtn,
              {
                backgroundColor: `${skin.alert}14`,
                borderColor: skin.alert,
                borderWidth: border.soft,
                borderRadius: radius.pill,
              },
            ]}
            onPress={handleClearGeminiKey}
            activeOpacity={0.8}
          >
            <Trash2 size={14} color={skin.alert} strokeWidth={2.0} />
            <Text style={[styles.keyBtnText, { color: skin.alert, fontFamily: fonts.uiBold }]}>
              Borrar
            </Text>
          </TouchableOpacity>
        </View>

        {statusMessage && (
          <View
            style={[
              styles.statusBanner,
              {
                backgroundColor: isStatusError ? `${skin.alert}18` : `${skin.success}18`,
                borderColor: isStatusError ? skin.alert : skin.success,
                borderWidth: border.soft,
                borderRadius: radius.card,
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color: isStatusError ? skin.alert : skin.success,
                  fontFamily: fonts.mono,
                },
              ]}
            >
              {statusMessage}
            </Text>
          </View>
        )}
      </View>

      {/* ──────────────── Deepgram Nova-3 Audio Thinking Stream ──────────────── */}
      <View
        style={[
          styles.sectionCard,
          {
            backgroundColor: skin.surface,
            borderColor: skin.borderSoft,
            borderWidth: border.soft,
            borderRadius: radius.card,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <Mic size={16} color={skin.primary} strokeWidth={2.0} />
          <Text
            style={[
              styles.cardTitle,
              { color: skin.text, fontFamily: fonts.uiBold },
            ]}
          >
            Deepgram Nova-3 (Audio y Explicaciones)
          </Text>
        </View>
        <Text
          style={[
            styles.cardDesc,
            { color: skin.textMuted, fontFamily: fonts.ui },
          ]}
        >
          Utilizada para transcribir hasta 45s de razonamiento verbal y Thinking Memos asociados al lazo.
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: skin.bg,
              borderColor: skin.borderSoft,
              color: skin.text,
              fontFamily: fonts.ui,
              borderWidth: border.soft,
              borderRadius: radius.card,
            },
          ]}
          value={deepgramKey}
          onChangeText={setDeepgramKey}
          placeholder="dg_api_key_... (o EXPO_PUBLIC_DEEPGRAM_API_KEY)"
          placeholderTextColor={skin.textMuted}
          secureTextEntry
        />
      </View>

      {/* ──────────────── Prerequisite Dependency Planner Goal ──────────────── */}
      <View
        style={[
          styles.sectionCard,
          {
            backgroundColor: skin.surface,
            borderColor: skin.borderSoft,
            borderWidth: border.soft,
            borderRadius: radius.card,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <ShieldCheck size={16} color={skin.warm} strokeWidth={2.0} />
          <Text
            style={[
              styles.cardTitle,
              { color: skin.text, fontFamily: fonts.uiBold },
            ]}
          >
            Objetivo de Aprendizaje (LearnHarness)
          </Text>
        </View>
        <Text
          style={[
            styles.cardDesc,
            { color: skin.textMuted, fontFamily: fonts.ui },
          ]}
        >
          Competencia evaluada en relación con los nodos y relaciones causales verificadas.
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: skin.bg,
              borderColor: skin.borderSoft,
              color: skin.text,
              fontFamily: fonts.ui,
              borderWidth: border.soft,
              borderRadius: radius.card,
            },
          ]}
          value={learningGoal}
          onChangeText={setLearningGoal}
          placeholder="Define tu objetivo técnico de estudio..."
          placeholderTextColor={skin.textMuted}
        />
      </View>

      {/* ──────────────── Hardware S-Pen & Dock Magnético ──────────────── */}
      <View
        style={[
          styles.sectionCard,
          {
            backgroundColor: skin.surface,
            borderColor: skin.borderSoft,
            borderWidth: border.soft,
            borderRadius: radius.card,
          },
        ]}
      >
        <Text
          style={[
            styles.cardTitle,
            { color: skin.text, fontFamily: fonts.uiBold },
          ]}
        >
          Hardware S-Pen & Barra Magnética
        </Text>
        <View style={styles.rowBetween}>
          <Text
            style={[
              styles.label,
              { color: skin.textMuted, fontFamily: fonts.uiBold },
            ]}
          >
            Rechazo de palma estricto (Solo S-Pen)
          </Text>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              {
                backgroundColor: stylusOnly ? skin.primary : skin.surfaceAlt,
                borderColor: stylusOnly ? skin.primary : skin.borderSoft,
                borderWidth: border.soft,
                borderRadius: radius.pill,
              },
            ]}
            onPress={onToggleStylusOnly}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.toggleText,
                {
                  color: stylusOnly ? skin.onPrimary : skin.textMuted,
                  fontFamily: fonts.monoBold,
                },
              ]}
            >
              {stylusOnly ? "ACTIVADO" : "DESACTIVADO"}
            </Text>
          </TouchableOpacity>
        </View>

        <Text
          style={[
            styles.label,
            { color: skin.textMuted, fontFamily: fonts.uiBold, marginTop: 14, marginBottom: 8 },
          ]}
        >
          Borde de acoplamiento magnético de la barra
        </Text>
        <View style={styles.pillRow}>
          {dockEdges.map((edge) => {
            const isSelected = toolbarDockEdge === edge;
            const labels: Record<ToolbarDockEdge, string> = {
              left: "IZQUIERDA",
              right: "DERECHA",
              top: "SUPERIOR",
              bottom: "INFERIOR",
            };
            return (
              <TouchableOpacity
                key={edge}
                style={[
                  styles.choicePill,
                  {
                    backgroundColor: isSelected ? skin.primary : skin.surfaceAlt,
                    borderColor: isSelected ? skin.primary : skin.borderSoft,
                    borderWidth: border.soft,
                    borderRadius: radius.pill,
                  },
                ]}
                onPress={() => onChangeDockEdge(edge)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.choicePillText,
                    {
                      color: isSelected ? skin.onPrimary : skin.textMuted,
                      fontFamily: isSelected ? fonts.uiBold : fonts.ui,
                    },
                  ]}
                >
                  {labels[edge]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text
          style={[
            styles.label,
            { color: skin.textMuted, fontFamily: fonts.uiBold, marginTop: 16, marginBottom: 4 },
          ]}
        >
          Preset de Papel por Defecto (5 presets)
        </Text>
        <Text
          style={[
            styles.cardDesc,
            { color: skin.textMuted, fontFamily: fonts.ui, marginBottom: 8 },
          ]}
        >
          Define el tema de papel inicial para los nuevos lienzos creados en el Hub.
        </Text>
        <View style={styles.pillRow}>
          {themes.map((t) => {
            const config = CANVAS_THEMES[t];
            const isSelected = canvasTheme === t;
            return (
              <TouchableOpacity
                key={t}
                style={[
                  styles.choicePill,
                  {
                    backgroundColor: isSelected ? skin.primary : skin.surfaceAlt,
                    borderColor: isSelected ? skin.primary : skin.borderSoft,
                    borderWidth: border.soft,
                    borderRadius: radius.pill,
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  onSelectTheme(t);
                }}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: config.backgroundColor,
                      borderWidth: 1,
                      borderColor: "rgba(255, 255, 255, 0.4)",
                    }}
                  />
                  <Text
                    style={[
                      styles.choicePillText,
                      {
                        color: isSelected ? skin.onPrimary : skin.textMuted,
                        fontFamily: isSelected ? fonts.uiBold : fonts.ui,
                      },
                    ]}
                  >
                    {config.label}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 48, gap: 16 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  heading: { fontSize: 20, letterSpacing: 0.6, includeFontPadding: false, textAlignVertical: "center" },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  saveBtnText: { fontSize: 12, includeFontPadding: false, textAlignVertical: "center" },
  sectionCard: {
    padding: 18,
    gap: 12,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { fontSize: 14, includeFontPadding: false, textAlignVertical: "center" },
  cardDesc: { fontSize: 12, lineHeight: 17, includeFontPadding: false },
  label: { fontSize: 12, includeFontPadding: false, textAlignVertical: "center" },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choicePill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    justifyContent: "center",
    alignItems: "center",
  },
  choicePillText: { fontSize: 11, includeFontPadding: false, textAlignVertical: "center" },
  keyInputRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  maskToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  maskToggleText: { fontSize: 11, includeFontPadding: false, textAlignVertical: "center" },
  keyActionsRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  keyPrimaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 6,
  },
  keyTestBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 6,
  },
  keyClearBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 6,
  },
  keyBtnText: { fontSize: 11, includeFontPadding: false, textAlignVertical: "center" },
  statusBanner: { padding: 10, marginTop: 4 },
  statusText: { fontSize: 11, includeFontPadding: false, textAlignVertical: "center" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  toggleText: { fontSize: 10, letterSpacing: 0.8, includeFontPadding: false, textAlignVertical: "center" },
});
