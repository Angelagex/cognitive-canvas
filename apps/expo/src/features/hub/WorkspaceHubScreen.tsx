import React, { useState } from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import * as Haptics from "expo-haptics";
import {
  FolderOpen,
  Settings,
  Network,
} from "@sketchyicons/react-native";
import { VinkLogo } from "../../components/brand";
import { useAppTheme } from "../../theme";
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
  const { theme } = useAppTheme();

  const handleSelectTab = (tab: HubTabId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setActiveTab(tab);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bgApp }]}>
      {/* Top Navigation Chrome */}
      <View
        style={[
          styles.hubHeader,
          {
            backgroundColor: theme.colors.bgHeader,
            borderBottomColor: theme.colors.borderSubtle,
          },
        ]}
      >
        <View style={styles.brandRow}>
          <VinkLogo
            showIcon={false}
            wordmarkHeight={22}
            wordmarkColor={theme.colors.textPrimary}
          />
          <View style={[styles.brandDivider, { backgroundColor: theme.colors.borderSubtle }]} />
          <View>
            <Text style={[styles.brandSubtitle, { color: theme.colors.textSecondary }]}>
              Non-Linear Synthesis & Socratic Knowledge Matrix
            </Text>
          </View>
        </View>

        {/* Segmented Hub Tab Switcher */}
        <View
          style={[
            styles.tabBar,
            {
              backgroundColor: theme.colors.pillInactiveBg,
              borderColor: theme.colors.borderSubtle,
              borderWidth: 1,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === "library" && { backgroundColor: theme.colors.pillActiveBg },
            ]}
            onPress={() => handleSelectTab("library")}
            activeOpacity={0.85}
          >
            <FolderOpen
              size={15}
              color={activeTab === "library" ? theme.colors.pillActiveText : theme.colors.textMuted}
              strokeWidth={2.0}
            />
            <Text
              style={[
                styles.tabBtnText,
                {
                  color:
                    activeTab === "library"
                      ? theme.colors.pillActiveText
                      : theme.colors.textMuted,
                  fontWeight: activeTab === "library" ? "700" : "500",
                },
              ]}
            >
              Canvases Library
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === "matrix" && { backgroundColor: theme.colors.pillActiveBg },
            ]}
            onPress={() => handleSelectTab("matrix")}
            activeOpacity={0.85}
          >
            <Network
              size={15}
              color={activeTab === "matrix" ? theme.colors.pillActiveText : theme.colors.textMuted}
              strokeWidth={2.0}
            />
            <Text
              style={[
                styles.tabBtnText,
                {
                  color:
                    activeTab === "matrix"
                      ? theme.colors.pillActiveText
                      : theme.colors.textMuted,
                  fontWeight: activeTab === "matrix" ? "700" : "500",
                },
              ]}
            >
              Knowledge Matrix
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === "settings" && { backgroundColor: theme.colors.pillActiveBg },
            ]}
            onPress={() => handleSelectTab("settings")}
            activeOpacity={0.85}
          >
            <Settings
              size={15}
              color={activeTab === "settings" ? theme.colors.pillActiveText : theme.colors.textMuted}
              strokeWidth={2.0}
            />
            <Text
              style={[
                styles.tabBtnText,
                {
                  color:
                    activeTab === "settings"
                      ? theme.colors.pillActiveText
                      : theme.colors.textMuted,
                  fontWeight: activeTab === "settings" ? "700" : "500",
                },
              ]}
            >
              Settings
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

