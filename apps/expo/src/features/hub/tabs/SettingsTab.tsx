import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView } from "react-native";
import * as Haptics from "expo-haptics";
import { Check, Settings, Mic, Sparkles, BrainCircuit, Trash2, Palette } from "@sketchyicons/react-native";
import { getUserPreferences, saveUserPreferences } from "../../../services/StorageService";
import { KeyStorageService } from "../../../services/KeyStorageService";
import { ToolbarDockEdge, CanvasThemePreset, CANVAS_THEMES } from "../../../types/canvas";
import { useAppTheme, APP_THEMES, AppThemeId, useSkin, SkinId, skins } from "../../../theme";
import { styles } from "./SettingsTab.styles";

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
  const { themeId: currentAppThemeId, theme: appTheme, setAppTheme } = useAppTheme();
  const { skinActivo, setSkinActivo } = useSkin();

  useEffect(() => {
    KeyStorageService.getApiKey().then((stored) => {
      if (stored) setApiKey(stored);
    });
    getUserPreferences().then((prefs) => {
      if (prefs.deepgram_api_key) setDeepgramKey(prefs.deepgram_api_key);
      if (prefs.target_learning_goal) setLearningGoal(prefs.target_learning_goal);
    });
  }, []);

  const handleSaveGeminiKey = async () => {
    if (!apiKey.trim()) {
      setIsStatusError(true);
      setStatusMessage("Please enter a valid Gemini API key before saving.");
      return;
    }
    await KeyStorageService.setApiKey(apiKey);
    setIsStatusError(false);
    setStatusMessage("Gemini API key saved securely on device.");
  };

  const handleClearGeminiKey = async () => {
    await KeyStorageService.clearApiKey();
    setApiKey("");
    setIsStatusError(false);
    setStatusMessage("Gemini API key cleared from device.");
  };

  const handleTestGeminiKey = async () => {
    setIsTestingKey(true);
    setStatusMessage("Testing Gemini API key...");
    setIsStatusError(false);
    try {
      const result = await KeyStorageService.testApiKey(apiKey);
      setIsStatusError(!result.valid);
      setStatusMessage(result.message);
    } finally {
      setIsTestingKey(false);
    }
  };

  const handleSaveSettings = async () => {
    if (apiKey.trim()) {
      await KeyStorageService.setApiKey(apiKey);
    }
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
  const themes: CanvasThemePreset[] = [
    "crema",
    "noche",
    "tinta",
    "folio",
  ];
  const appThemeKeys: AppThemeId[] = ["cobalto_crema", "tinta_papel"];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: appTheme.colors.bgApp }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Settings size={18} color={appTheme.colors.accentPrimary} strokeWidth={2.0} />
          <Text style={[styles.heading, appTheme.typography.display, { color: appTheme.colors.textPrimary }]}>
            Engine & Pipeline Configuration
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: appTheme.colors.accentPrimary }]}
          onPress={handleSaveSettings}
        >
          <Check size={15} color="#FFFFFF" strokeWidth={2.2} />
          <Text style={[styles.saveBtnText, appTheme.typography.bodyBold]}>{savedNotice ? "Saved!" : "Save Preferences"}</Text>
        </TouchableOpacity>
      </View>

      {/* Vink Visual Identity & App Theme Switcher */}
      <View
        style={[
          styles.sectionCard,
          {
            backgroundColor: appTheme.colors.bgCard,
            borderColor: appTheme.colors.borderSubtle,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <Palette size={16} color={appTheme.colors.accentSecondary} strokeWidth={2.0} />
          <Text style={[styles.cardTitle, appTheme.typography.bodyBold, { color: appTheme.colors.textPrimary }]}>
            Vink Visual Identity & App Theme
          </Text>
        </View>
        <Text style={[styles.cardDesc, appTheme.typography.body, { color: appTheme.colors.textSecondary }]}>
          Alterna entre las tres skins oficiales y paletas de la aplicación para evaluar la estética, legibilidad y contraste en vivo.
        </Text>

        <Text style={[styles.label, appTheme.typography.bodyBold, { color: appTheme.colors.textSecondary, marginTop: 4, marginBottom: 8 }]}>
          Skin de la Interfaz (Tokens del Sistema)
        </Text>
        <View style={[styles.pillRow, { marginBottom: 16 }]}>
          {(["crema", "noche", "tinta"] as SkinId[]).map((skId) => {
            const sk = skins[skId];
            const isSelected = skinActivo === skId;
            const labels: Record<SkinId, string> = {
              crema: "Crema (Claro)",
              noche: "Noche (Oscuro)",
              tinta: "Tinta (Editorial)",
            };
            return (
              <TouchableOpacity
                key={skId}
                style={[
                  styles.choicePill,
                  {
                    backgroundColor: isSelected ? sk.primary : appTheme.colors.pillInactiveBg,
                    borderColor: isSelected ? sk.primary : appTheme.colors.borderSubtle,
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  setSkinActivo(skId);
                }}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: sk.bg,
                      borderWidth: 1,
                      borderColor: sk.border,
                    }}
                  />
                  <Text
                    style={[
                      styles.choicePillText,
                      isSelected ? appTheme.typography.bodyBold : appTheme.typography.body,
                      { color: isSelected ? sk.onPrimary : appTheme.colors.textSecondary },
                    ]}
                  >
                    {labels[skId]}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.label, appTheme.typography.bodyBold, { color: appTheme.colors.textSecondary, marginBottom: 8 }]}>
          Dirección de Identidad Visual
        </Text>

        <View style={styles.themeCardsContainer}>
          {appThemeKeys.map((key) => {
            const config = APP_THEMES[key];
            const isSelected = currentAppThemeId === key;
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.appThemeCard,
                  {
                    backgroundColor: isSelected ? config.colors.bgCardHover : config.colors.bgCard,
                    borderColor: isSelected ? config.colors.borderActive : config.colors.borderSubtle,
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  setAppTheme(key);
                }}
                activeOpacity={0.85}
              >
                <View style={styles.themeCardTop}>
                  <View style={styles.themeTitleRow}>
                    <Text
                      style={[
                        styles.themeName,
                        config.typography.display,
                        { color: config.colors.textPrimary },
                      ]}
                    >
                      {config.name}
                    </Text>
                    <View style={styles.themeDirectionBadge}>
                      <Text
                        style={[
                          styles.themeDirectionBadgeText,
                          config.typography.monoBold,
                        ]}
                      >
                        DIRECCIÓN {config.direction}
                      </Text>
                    </View>
                  </View>
                  {isSelected && (
                    <View
                      style={[
                        styles.activeIndicatorBadge,
                        { borderColor: config.colors.borderActive },
                      ]}
                    >
                      <Check size={12} color={config.colors.accentPrimary} strokeWidth={2.4} />
                      <Text
                        style={[
                          styles.activeIndicatorText,
                          config.typography.monoBold,
                          { color: config.colors.accentPrimary },
                        ]}
                      >
                        ACTIVO
                      </Text>
                    </View>
                  )}
                </View>

                <Text
                  style={[
                    styles.themeTagline,
                    config.typography.displayItalic,
                  ]}
                >
                  {config.tagline}
                </Text>
                <Text style={[styles.themeConcept, config.typography.body]}>
                  {config.concept}
                </Text>

                <View style={styles.swatchesRow}>
                  {config.colors.swatches.map((swatch, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.swatchCircle,
                        { backgroundColor: swatch },
                        swatch === config.colors.bgApp && {
                          borderColor: "rgba(255, 255, 255, 0.4)",
                        },
                      ]}
                    />
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View
        style={[
          styles.sectionCard,
          {
            backgroundColor: appTheme.colors.bgCard,
            borderColor: appTheme.colors.borderSubtle,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <BrainCircuit size={15} color="#10B981" strokeWidth={2.0} />
          <Text style={[styles.cardTitle, appTheme.typography.bodyBold, { color: appTheme.colors.textPrimary }]}>
            Gemini API Configuration (BYOK)
          </Text>
        </View>
        <Text style={[styles.cardDesc, appTheme.typography.body, { color: appTheme.colors.textSecondary }]}>
          Stored locally in Android hardware Keystore (`expo-secure-store`) and sent via `x-gemini-api-key` during compilation.
        </Text>

        <View style={styles.keyInputRow}>
          <TextInput
            style={[
              styles.input,
              appTheme.typography.body,
              {
                flex: 1,
                backgroundColor: appTheme.colors.bgInput,
                borderColor: appTheme.colors.borderSubtle,
                color: appTheme.colors.textPrimary,
              },
            ]}
            value={apiKey}
            onChangeText={setApiKey}
            placeholder="AIzaSy..."
            placeholderTextColor="#64748B"
            secureTextEntry={isMasked}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[
              styles.maskToggleBtn,
              {
                backgroundColor: appTheme.colors.pillInactiveBg,
                borderColor: appTheme.colors.borderSubtle,
              },
            ]}
            onPress={() => setIsMasked((prev) => !prev)}
          >
            <Text style={[styles.maskToggleText, appTheme.typography.bodyBold, { color: appTheme.colors.textSecondary }]}>
              {isMasked ? "Show" : "Hide"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.keyActionsRow}>
          <TouchableOpacity style={styles.keyPrimaryBtn} onPress={handleSaveGeminiKey}>
            <Check size={14} color="#FFFFFF" strokeWidth={2.2} />
            <Text style={[styles.keyBtnText, appTheme.typography.bodyBold]}>Save Key</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.keyTestBtn}
            onPress={handleTestGeminiKey}
            disabled={isTestingKey}
          >
            <Sparkles size={14} color="#38BDF8" strokeWidth={2.0} />
            <Text style={[styles.keyBtnText, appTheme.typography.bodyBold, { color: "#38BDF8" }]}>
              {isTestingKey ? "Testing..." : "Test Key"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.keyClearBtn} onPress={handleClearGeminiKey}>
            <Trash2 size={14} color="#EF4444" strokeWidth={2.0} />
            <Text style={[styles.keyBtnText, appTheme.typography.bodyBold, { color: "#EF4444" }]}>Clear Key</Text>
          </TouchableOpacity>
        </View>

        {statusMessage && (
          <View
            style={[
              styles.statusBanner,
              isStatusError ? styles.statusBannerError : styles.statusBannerOk,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                appTheme.typography.mono,
                isStatusError ? { color: "#FCA5A5" } : { color: "#6EE7B7" },
              ]}
            >
              {statusMessage}
            </Text>
          </View>
        )}
      </View>

      <View
        style={[
          styles.sectionCard,
          {
            backgroundColor: appTheme.colors.bgCard,
            borderColor: appTheme.colors.borderSubtle,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <Mic size={15} color="#38BDF8" strokeWidth={2.0} />
          <Text style={[styles.cardTitle, appTheme.typography.bodyBold, { color: appTheme.colors.textPrimary }]}>
            Deepgram Nova-3 Audio Thinking Stream
          </Text>
        </View>
        <Text style={[styles.cardDesc, appTheme.typography.body, { color: appTheme.colors.textSecondary }]}>
          Utilizada por la píldora contextual del lazo (Mic) para transcribir hasta 45s de razonamiento causal verbal.
        </Text>
        <TextInput
          style={[
            styles.input,
            appTheme.typography.body,
            {
              backgroundColor: appTheme.colors.bgInput,
              borderColor: appTheme.colors.borderSubtle,
              color: appTheme.colors.textPrimary,
            },
          ]}
          value={deepgramKey}
          onChangeText={setDeepgramKey}
          placeholder="dg_api_key_... (or EXPO_PUBLIC_DEEPGRAM_API_KEY)"
          placeholderTextColor="#64748B"
          secureTextEntry
        />
      </View>

      <View
        style={[
          styles.sectionCard,
          {
            backgroundColor: appTheme.colors.bgCard,
            borderColor: appTheme.colors.borderSubtle,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <Sparkles size={15} color="#F59E0B" strokeWidth={2.0} />
          <Text style={[styles.cardTitle, appTheme.typography.bodyBold, { color: appTheme.colors.textPrimary }]}>
            Prerequisite Dependency Planner Goal
          </Text>
        </View>
        <Text style={[styles.cardDesc, appTheme.typography.body, { color: appTheme.colors.textSecondary }]}>
          Target competency evaluated against your verified Knowledge Matrix nodes.
        </Text>
        <TextInput
          style={[
            styles.input,
            appTheme.typography.body,
            {
              backgroundColor: appTheme.colors.bgInput,
              borderColor: appTheme.colors.borderSubtle,
              color: appTheme.colors.textPrimary,
            },
          ]}
          value={learningGoal}
          onChangeText={setLearningGoal}
          placeholder="Define your target technical competency..."
          placeholderTextColor="#64748B"
        />
      </View>

      <View
        style={[
          styles.sectionCard,
          {
            backgroundColor: appTheme.colors.bgCard,
            borderColor: appTheme.colors.borderSubtle,
          },
        ]}
      >
        <Text style={[styles.cardTitle, appTheme.typography.bodyBold, { color: appTheme.colors.textPrimary }]}>
          S-Pen Hardware & Magnetic Dock
        </Text>
        <View style={styles.rowBetween}>
          <Text style={[styles.label, appTheme.typography.bodyBold, { color: appTheme.colors.textSecondary }]}>
            Strict S-Pen Palm Rejection (Stylus Only)
          </Text>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              {
                backgroundColor: appTheme.colors.pillInactiveBg,
                borderColor: appTheme.colors.borderSubtle,
              },
              stylusOnly && styles.toggleBtnActive,
            ]}
            onPress={onToggleStylusOnly}
          >
            <Text style={[styles.toggleText, appTheme.typography.monoBold]}>
              {stylusOnly ? "ENABLED" : "DISABLED"}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.label, appTheme.typography.bodyBold, { color: appTheme.colors.textSecondary, marginTop: 12, marginBottom: 6 }]}>
          Magnetic Toolbar Dock Edge
        </Text>
        <View style={styles.pillRow}>
          {dockEdges.map((edge) => {
            const isSelected = toolbarDockEdge === edge;
            return (
              <TouchableOpacity
                key={edge}
                style={[
                  styles.choicePill,
                  {
                    backgroundColor: isSelected ? appTheme.colors.accentPrimary : appTheme.colors.pillInactiveBg,
                    borderColor: isSelected ? appTheme.colors.accentPrimary : appTheme.colors.borderSubtle,
                  },
                ]}
                onPress={() => onChangeDockEdge(edge)}
              >
                <Text
                  style={[
                    styles.choicePillText,
                    isSelected ? appTheme.typography.bodyBold : appTheme.typography.body,
                    { color: isSelected ? "#FFFFFF" : appTheme.colors.textSecondary },
                  ]}
                >
                  {edge.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.label, appTheme.typography.bodyBold, { color: appTheme.colors.textSecondary, marginTop: 14, marginBottom: 6 }]}>
          Canvas Paper Theme Preset ({themes.length} Presets)
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
                    backgroundColor: isSelected ? appTheme.colors.accentPrimary : appTheme.colors.pillInactiveBg,
                    borderColor: isSelected ? appTheme.colors.accentPrimary : appTheme.colors.borderSubtle,
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  onSelectTheme(t);
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
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
                      isSelected ? appTheme.typography.bodyBold : appTheme.typography.body,
                      { color: isSelected ? "#FFFFFF" : appTheme.colors.textSecondary },
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
