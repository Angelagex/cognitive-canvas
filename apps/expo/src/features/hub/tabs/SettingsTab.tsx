import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView } from "react-native";
import { Check, Settings, Mic, Sparkles, BrainCircuit, Trash2 } from "@sketchyicons/react-native";
import { getUserPreferences, saveUserPreferences } from "../../../services/StorageService";
import { KeyStorageService } from "../../../services/KeyStorageService";
import { ToolbarDockEdge, CanvasThemePreset, CANVAS_THEMES } from "../../../types/canvas";
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
  const themes: CanvasThemePreset[] = ["dark_slate", "charcoal_dark", "warm_ivory", "pure_white"];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Settings size={18} color="#38BDF8" strokeWidth={2.0} />
          <Text style={styles.heading}>Engine & Pipeline Configuration</Text>
        </View>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSaveSettings}>
          <Check size={15} color="#FFFFFF" strokeWidth={2.2} />
          <Text style={styles.saveBtnText}>{savedNotice ? "Saved!" : "Save Preferences"}</Text>
        </TouchableOpacity>
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
          Canvas Paper Theme Preset
        </Text>
        <View style={styles.pillRow}>
          {themes.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.choicePill, canvasTheme === t && styles.choicePillActive]}
              onPress={() => onSelectTheme(t)}
            >
              <Text
                style={[styles.choicePillText, canvasTheme === t && styles.choicePillTextActive]}
              >
                {CANVAS_THEMES[t].label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
};
