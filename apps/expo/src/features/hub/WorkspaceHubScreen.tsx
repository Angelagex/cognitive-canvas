import React, { useState } from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import * as Haptics from "expo-haptics";
import {
  FolderOpen,
  Settings,
  Network,
} from "@sketchyicons/react-native";
import { VinkLogo } from "../../components/brand";
import { useSkin, fonts, radius, border } from "../../theme";
import { CanvasesLibraryTab } from "./tabs/CanvasesLibraryTab";
import { SettingsTab } from "./tabs/SettingsTab";
import { KnowledgeMatrixTab } from "../matrix/KnowledgeMatrixTab";
import { MapDocumentSummary } from "../../services/StorageService";
import { ToolbarDockEdge, CanvasThemePreset } from "../../types/canvas";

export type HubTabId = "library" | "matrix" | "settings";

export interface WorkspaceHubScreenProps {
  canvases: MapDocumentSummary[];
  currentMapId: string;
  currentMapTitle: string;
  currentStrokeCount: number;
  stylusOnly: boolean;
  onToggleStylusOnly: () => void;
  toolbarDockEdge: ToolbarDockEdge;
  onChangeDockEdge: (edge: ToolbarDockEdge) => void;
  canvasTheme: CanvasThemePreset;
  onSelectTheme: (theme: CanvasThemePreset) => void;
  onOpenCanvas: (
    mapId: string,
    boundingBox?: { minX: number; minY: number; maxX: number; maxY: number }
  ) => void;
  onCreateNewCanvas: () => void;
  onDeleteCanvas: (mapId: string) => void;
}

export const WorkspaceHubScreen: React.FC<WorkspaceHubScreenProps> = ({
  canvases,
  currentMapId,
  currentMapTitle,
  currentStrokeCount,
  stylusOnly,
  onToggleStylusOnly,
  toolbarDockEdge,
  onChangeDockEdge,
  canvasTheme,
  onSelectTheme,
  onOpenCanvas,
  onCreateNewCanvas,
  onDeleteCanvas,
}) => {
  // Boots into CanvasesLibraryTab by default
  const [activeTab, setActiveTab] = useState<HubTabId>("library");
  const { skin } = useSkin();

  const handleSelectTab = (tab: HubTabId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setActiveTab(tab);
  };

  return (
    <View style={[styles.container, { backgroundColor: skin.bg }]}>
      {/* Top Navigation Chrome */}
      <View
        style={[
          styles.hubHeader,
          {
            backgroundColor: skin.surface,
            borderBottomColor: skin.borderSoft,
            borderBottomWidth: border.soft,
          },
        ]}
      >
        <View style={styles.brandRow}>
          <VinkLogo
            showIcon={false}
            wordmarkHeight={22}
            wordmarkColor={skin.text}
          />
          <View style={[styles.brandDivider, { backgroundColor: skin.borderSoft }]} />
          <View>
            <Text
              style={[
                styles.brandSubtitle,
                { color: skin.textMuted, fontFamily: fonts.ui },
              ]}
            >
              Síntesis causal & matriz socrática
            </Text>
          </View>
        </View>

        {/* Segmented Hub Tab Switcher */}
        <View
          style={[
            styles.tabBar,
            {
              backgroundColor: skin.surfaceAlt,
              borderColor: skin.borderSoft,
              borderWidth: border.soft,
              borderRadius: radius.pill,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.tabBtn,
              {
                borderRadius: radius.pill,
                backgroundColor: activeTab === "library" ? skin.primary : "transparent",
              },
            ]}
            onPress={() => handleSelectTab("library")}
            activeOpacity={0.85}
          >
            <FolderOpen
              size={15}
              color={activeTab === "library" ? skin.onPrimary : skin.textMuted}
              strokeWidth={2.0}
            />
            <Text
              style={[
                styles.tabBtnText,
                {
                  color: activeTab === "library" ? skin.onPrimary : skin.textMuted,
                  fontFamily: activeTab === "library" ? fonts.uiBold : fonts.ui,
                },
              ]}
            >
              Biblioteca
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              {
                borderRadius: radius.pill,
                backgroundColor: activeTab === "matrix" ? skin.primary : "transparent",
              },
            ]}
            onPress={() => handleSelectTab("matrix")}
            activeOpacity={0.85}
          >
            <Network
              size={15}
              color={activeTab === "matrix" ? skin.onPrimary : skin.textMuted}
              strokeWidth={2.0}
            />
            <Text
              style={[
                styles.tabBtnText,
                {
                  color: activeTab === "matrix" ? skin.onPrimary : skin.textMuted,
                  fontFamily: activeTab === "matrix" ? fonts.uiBold : fonts.ui,
                },
              ]}
            >
              Matriz de conocimiento
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              {
                borderRadius: radius.pill,
                backgroundColor: activeTab === "settings" ? skin.primary : "transparent",
              },
            ]}
            onPress={() => handleSelectTab("settings")}
            activeOpacity={0.85}
          >
            <Settings
              size={15}
              color={activeTab === "settings" ? skin.onPrimary : skin.textMuted}
              strokeWidth={2.0}
            />
            <Text
              style={[
                styles.tabBtnText,
                {
                  color: activeTab === "settings" ? skin.onPrimary : skin.textMuted,
                  fontFamily: activeTab === "settings" ? fonts.uiBold : fonts.ui,
                },
              ]}
            >
              Configuración
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Active Tab Body */}
      <View style={styles.tabBody}>
        {activeTab === "library" && (
          <CanvasesLibraryTab
            canvases={canvases}
            currentMapId={currentMapId}
            currentMapTitle={currentMapTitle}
            currentStrokeCount={currentStrokeCount}
            onOpenCanvas={(mapId) => onOpenCanvas(mapId)}
            onCreateNewCanvas={onCreateNewCanvas}
            onDeleteCanvas={onDeleteCanvas}
          />
        )}

        {activeTab === "matrix" && (
          <KnowledgeMatrixTab
            onOpenCanvasAtBounds={(canvasId, bbox) => onOpenCanvas(canvasId, bbox)}
          />
        )}

        {activeTab === "settings" && (
          <SettingsTab
            stylusOnly={stylusOnly}
            onToggleStylusOnly={onToggleStylusOnly}
            toolbarDockEdge={toolbarDockEdge}
            onChangeDockEdge={onChangeDockEdge}
            canvasTheme={canvasTheme}
            onSelectTheme={onSelectTheme}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1120",
  },
  hubHeader: {
    height: 64,
    backgroundColor: "#0F172A",
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  brandDivider: {
    width: 1,
    height: 18,
    backgroundColor: "#334155",
  },
  brandBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "rgba(56, 189, 248, 0.14)",
    borderWidth: 1,
    borderColor: "#38BDF8",
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "700",
  },
  brandSubtitle: {
    color: "#64748B",
    fontSize: 11,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#1E293B",
    padding: 4,
    borderRadius: 12,
    gap: 4,
  },
  tabBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 9,
  },
  tabBtnActive: {
    backgroundColor: "#0284C7",
  },
  tabBtnText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
  },
  tabBtnTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  tabBody: {
    flex: 1,
  },
});

