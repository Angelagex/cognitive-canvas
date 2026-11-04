import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import { useSkin, radius, border, fonts } from "../../theme";

export interface SegmentedTabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface SegmentedTabsProps {
  tabs: SegmentedTabItem[];
  activeTab: string;
  onChangeTab: (tabId: string) => void;
  style?: StyleProp<ViewStyle>;
}

export const SegmentedTabs: React.FC<SegmentedTabsProps> = ({
  tabs,
  activeTab,
  onChangeTab,
  style,
}) => {
  const { skin } = useSkin();

  const handleSelect = (id: string) => {
    if (id === activeTab) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onChangeTab(id);
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: skin.surfaceAlt,
          borderColor: skin.borderSoft,
          borderWidth: border.soft,
          borderRadius: radius.tool,
        },
        style,
      ]}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <TouchableOpacity
            key={tab.id}
            onPress={() => handleSelect(tab.id)}
            style={[
              styles.tabButton,
              {
                borderRadius: radius.tool - 3,
                backgroundColor: isActive ? skin.primary : "transparent",
              },
            ]}
            activeOpacity={0.8}
          >
            {tab.icon && (
              <View style={[styles.iconWrapper, { opacity: isActive ? 1 : 0.7 }]}>
                {tab.icon}
              </View>
            )}
            <Text
              style={[
                styles.tabLabel,
                {
                  color: isActive ? skin.onPrimary : skin.textMuted,
                  fontFamily: isActive ? fonts.uiBold : fonts.uiSemi,
                  fontWeight: "normal",
                },
              ]}
            >
              {tab.label}
            </Text>
            {typeof tab.count === "number" && (
              <View
                style={[
                  styles.countBadge,
                  {
                    backgroundColor: isActive
                      ? "rgba(255, 255, 255, 0.25)"
                      : skin.surface,
                    borderColor: isActive ? "rgba(255, 255, 255, 0.4)" : skin.borderSoft,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.countText,
                    {
                      color: isActive ? skin.onPrimary : skin.textMuted,
                      fontFamily: fonts.monoBold,
                      fontWeight: "normal",
                    },
                  ]}
                >
                  {tab.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    padding: 3,
    alignItems: "center",
    gap: 3,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 7,
    paddingHorizontal: 10,
    gap: 6,
  },
  iconWrapper: {
    justifyContent: "center",
    alignItems: "center",
  },
  tabLabel: {
    fontSize: 12,
    letterSpacing: 0.1,
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: {
    fontSize: 10,
  },
});

