import React, { useState, useEffect } from "react";
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView } from "react-native";
import { Check, Settings, Mic, Sparkles } from "@sketchyicons/react-native";
import { getUserPreferences, saveUserPreferences } from "../../../services/StorageService";
import { ToolbarDockEdge, CanvasThemePreset, CANVAS_THEMES } from "../../../types/canvas";

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
  const [deepgramKey, setDeepgramKey] = useState("");
  const [learningGoal, setLearningGoal] = useState(
    "Dominar sistemas distribuidos, consenso Raft y control de congestión TCP"
  );
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    getUserPreferences().then((prefs) => {
      if (prefs.deepgram_api_key) setDeepgramKey(prefs.deepgram_api_key);
      if (prefs.target_learning_goal) setLearningGoal(prefs.target_learning_goal);
    });
  }, []);

  const handleSaveSettings = async () => {
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B1120" },
  content: { padding: 24, gap: 16, paddingBottom: 48 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  heading: { color: "#F8FAFC", fontSize: 19, fontWeight: "700" },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#10B981",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  saveBtnText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  sectionCard: {
    backgroundColor: "#0F172A",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1E293B",
    padding: 16,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  cardTitle: { color: "#F8FAFC", fontSize: 14, fontWeight: "700" },
  cardDesc: { color: "#94A3B8", fontSize: 12, marginBottom: 10 },
  input: {
    backgroundColor: "#1E293B",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 10,
    color: "#F8FAFC",
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  label: { color: "#CBD5E1", fontSize: 12, fontWeight: "600" },
  toggleBtn: {
    backgroundColor: "#1E293B",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#334155",
  },
  toggleBtnActive: { backgroundColor: "rgba(16, 185, 129, 0.18)", borderColor: "#10B981" },
  toggleText: { color: "#F8FAFC", fontSize: 11, fontWeight: "700" },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choicePill: {
    backgroundColor: "#1E293B",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#334155",
  },
  choicePillActive: { backgroundColor: "#0284C7", borderColor: "#38BDF8" },
  choicePillText: { color: "#94A3B8", fontSize: 11, fontWeight: "600" },
  choicePillTextActive: { color: "#FFFFFF", fontWeight: "700" },
});
