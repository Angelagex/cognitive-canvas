import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView } from "react-native";
import * as Haptics from "expo-haptics";
import { Check, Settings, Mic, Sparkles, BrainCircuit, Trash2, Palette } from "@sketchyicons/react-native";
import { getUserPreferences, saveUserPreferences } from "../../../services/StorageService";
import { KeyStorageService } from "../../../services/KeyStorageService";
import { ToolbarDockEdge, CanvasThemePreset, CANVAS_THEMES } from "../../../types/canvas";
import { useAppTheme, APP_THEMES, AppThemeId } from "../../../theme";
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
    "dark_slate",
    "charcoal_dark",
    "warm_ivory",
    "pure_white",
    "cobalto_crema",
    "tinta_papel",
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
          <Text style={[styles.heading, { color: appTheme.colors.textPrimary }]}>
            Engine & Pipeline Configuration
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: appTheme.colors.accentPrimary }]}
          onPress={handleSaveSettings}
        >
          <Check size={15} color="#FFFFFF" strokeWidth={2.2} />
          <Text style={styles.saveBtnText}>{savedNotice ? "Saved!" : "Save Preferences"}</Text>
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
          <Text style={[styles.cardTitle, { color: appTheme.colors.textPrimary }]}>
            Vink Visual Identity & App Theme
          </Text>
        </View>
        <Text style={[styles.cardDesc, { color: appTheme.colors.textSecondary }]}>
          Alterna entre las dos paletas oficiales para evaluar la estética, legibilidad y contraste en vivo.
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
                    <Text style={[styles.themeName, { color: config.colors.textPrimary }]}>
                      {config.name}
                    </Text>
                    <View style={styles.themeDirectionBadge}>
                      <Text style={styles.themeDirectionBadgeText}>
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
                          { color: config.colors.accentPrimary },
                        ]}
                      >
                        ACTIVO
                      </Text>
                    </View>
                  )}
                </View>

                <Text style={styles.themeTagline}>{config.tagline}</Text>
                <Text style={styles.themeConcept}>{config.concept}</Text>

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

      <View style={styles.sectionCard}>
        <View style={styles.cardHeader}>
          <BrainCircuit size={15} color="#10B981" strokeWidth={2.0} />
          <Text style={styles.cardTitle}>Gemini API Configuration (BYOK)</Text>
        </View>
        <Text style={styles.cardDesc}>
          Stored locally in Android hardware Keystore (`expo-secure-store`) and sent via `x-gemini-api-key` during compilation.
        </Text>

        <View style={styles.keyInputRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={apiKey}
            onChangeText={setApiKey}
            placeholder="AIzaSy..."
            placeholderTextColor="#64748B"
            secureTextEntry={isMasked}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={styles.maskToggleBtn}
            onPress={() => setIsMasked((prev) => !prev)}
          >
            <Text style={styles.maskToggleText}>{isMasked ? "Show" : "Hide"}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.keyActionsRow}>
          <TouchableOpacity style={styles.keyPrimaryBtn} onPress={handleSaveGeminiKey}>
            <Check size={14} color="#FFFFFF" strokeWidth={2.2} />
            <Text style={styles.keyBtnText}>Save Key</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.keyTestBtn}
            onPress={handleTestGeminiKey}
            disabled={isTestingKey}
          >
            <Sparkles size={14} color="#38BDF8" strokeWidth={2.0} />
            <Text style={[styles.keyBtnText, { color: "#38BDF8" }]}>
              {isTestingKey ? "Testing..." : "Test Key"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.keyClearBtn} onPress={handleClearGeminiKey}>
            <Trash2 size={14} color="#EF4444" strokeWidth={2.0} />
            <Text style={[styles.keyBtnText, { color: "#EF4444" }]}>Clear Key</Text>
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
                isStatusError ? { color: "#FCA5A5" } : { color: "#6EE7B7" },
              ]}
            >
              {statusMessage}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.cardHeader}>
          <Mic size={15} color="#38BDF8" strokeWidth={2.0} />
          <Text style={styles.cardTitle}>Deepgram Nova-2 Audio Thinking Stream</Text>
        </View>
        <Text style={styles.cardDesc}>
          Used by the Lasso contextual pill (🎙️) to transcribe up to 45s of verbal causal reasoning.
        </Text>
        <TextInput
          style={styles.input}
          value={deepgramKey}
          onChangeText={setDeepgramKey}
          placeholder="dg_api_key_... (or EXPO_PUBLIC_DEEPGRAM_API_KEY)"
          placeholderTextColor="#64748B"
          secureTextEntry
        />
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.cardHeader}>
          <Sparkles size={15} color="#F59E0B" strokeWidth={2.0} />
          <Text style={styles.cardTitle}>Prerequisite Dependency Planner Goal</Text>
        </View>
        <Text style={styles.cardDesc}>
          Target competency evaluated against your verified Knowledge Matrix nodes.
        </Text>
        <TextInput
          style={styles.input}
          value={learningGoal}
          onChangeText={setLearningGoal}
          placeholder="Define your target technical competency..."
          placeholderTextColor="#64748B"
        />
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>S-Pen Hardware & Magnetic Dock</Text>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>Strict S-Pen Palm Rejection (Stylus Only)</Text>
          <TouchableOpacity
            style={[styles.toggleBtn, stylusOnly && styles.toggleBtnActive]}
            onPress={onToggleStylusOnly}
          >
            <Text style={styles.toggleText}>{stylusOnly ? "ENABLED" : "DISABLED"}</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.label, { marginTop: 12, marginBottom: 6 }]}>
          Magnetic Toolbar Dock Edge
        </Text>
        <View style={styles.pillRow}>
          {dockEdges.map((edge) => (
            <TouchableOpacity
              key={edge}
              style={[styles.choicePill, toolbarDockEdge === edge && styles.choicePillActive]}
              onPress={() => onChangeDockEdge(edge)}
            >
              <Text
                style={[
                  styles.choicePillText,
                  toolbarDockEdge === edge && styles.choicePillTextActive,
                ]}
              >
                {edge.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { marginTop: 14, marginBottom: 6 }]}>
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
                  isSelected && {
                    backgroundColor: appTheme.colors.accentPrimary,
                    borderColor: appTheme.colors.accentPrimary,
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
                      isSelected && styles.choicePillTextActive,
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
