import React from "react";
import { StyleSheet, View, Text, TouchableOpacity, Pressable, ViewStyle, ScrollView } from "react-native";
import { Check, FileText } from "@sketchyicons/react-native";
import {
  CanvasBackgroundType,
  CanvasThemePreset,
  CANVAS_THEMES,
  CANVAS_THEME_PRESETS,
} from "../../../types/canvas";
import { useSkin, fonts, radius, border } from "../../../theme";

export interface PaperTemplateItem {
  id: CanvasBackgroundType;
  label: string;
  icon: string;
}

export const PAPER_TEMPLATES: PaperTemplateItem[] = [
  { id: "dot_grid", label: "Puntos", icon: "⠇" },
  { id: "graph_grid", label: "Cuadrícula", icon: "▦" },
  { id: "ruled", label: "Rayado", icon: "≡" },
  { id: "blank", label: "Liso", icon: "file" },
];

interface PaperTemplatePopoverProps {
  visible?: boolean;
  backgroundType: CanvasBackgroundType;
  onSelectBackgroundType: (type: CanvasBackgroundType) => void;
  canvasTheme?: CanvasThemePreset;
  onSelectCanvasTheme?: (theme: CanvasThemePreset) => void;
  onClose: () => void;
  positionStyle: ViewStyle;
}

export const PaperTemplatePopover: React.FC<PaperTemplatePopoverProps> = ({
  visible = true,
  backgroundType,
  onSelectBackgroundType,
  canvasTheme = "crema",
  onSelectCanvasTheme,
  onClose,
  positionStyle,
}) => {
  const { skin } = useSkin();

  if (!visible) return null;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {/* 1. Backdrop invisible que captura toques en el resto de la pantalla y cierra el popover */}
      <Pressable onPress={onClose} pointerEvents="auto" style={StyleSheet.absoluteFill} />

      {/* 2. Tarjeta del Popover (absorbe eventos para evitar clics pasantes al canvas) */}
      <View
        onStartShouldSetResponder={() => true}
        onTouchEnd={(e) => e.stopPropagation()}
        pointerEvents="auto"
        style={[
          styles.popoverCard,
          {
            backgroundColor: skin.surface,
            borderColor: skin.borderSoft,
            borderWidth: border.soft,
            borderRadius: radius.card,
          },
          positionStyle,
        ]}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text
            style={[
              styles.popoverHeader,
              { color: skin.textMuted, fontFamily: fonts.monoBold },
            ]}
          >
            TIPO DE PAPEL
          </Text>
          {PAPER_TEMPLATES.map((tmpl) => {
            const isSelected = backgroundType === tmpl.id;
            return (
              <TouchableOpacity
                key={tmpl.id}
                style={[
                  styles.popoverItem,
                  {
                    backgroundColor: isSelected ? `${skin.primary}1E` : "transparent",
                    borderRadius: radius.pill,
                  },
                ]}
                onPress={() => {
                  onSelectBackgroundType(tmpl.id);
                }}
                activeOpacity={0.7}
              >
                {tmpl.icon === "file" ? (
                  <View style={styles.popoverIconWrapper}>
                    <FileText size={15} color={isSelected ? skin.primary : skin.textMuted} strokeWidth={1.8} />
                  </View>
                ) : (
                  <Text
                    style={[
                      styles.popoverItemIcon,
                      { color: isSelected ? skin.primary : skin.textMuted },
                    ]}
                  >
                    {tmpl.icon}
                  </Text>
                )}
                <Text
                  style={[
                    styles.popoverItemLabel,
                    {
                      color: isSelected ? skin.primary : skin.text,
                      fontFamily: isSelected ? fonts.uiBold : fonts.ui,
                    },
                  ]}
                >
                  {tmpl.label}
                </Text>
                {isSelected && <Check size={14} color={skin.primary} strokeWidth={2.2} />}
              </TouchableOpacity>
            );
          })}

          {onSelectCanvasTheme && (
            <>
              <Text
                style={[
                  styles.popoverHeader,
                  { color: skin.textMuted, fontFamily: fonts.monoBold, marginTop: 14 },
                ]}
              >
                TEMA DE PAPEL
              </Text>
              {CANVAS_THEME_PRESETS.map((themeKey) => {
                const themeConfig = CANVAS_THEMES[themeKey];
                const isSelected = canvasTheme === themeKey;
                return (
                  <TouchableOpacity
                    key={themeKey}
                    style={[
                      styles.popoverItem,
                      {
                        backgroundColor: isSelected ? `${skin.primary}1E` : "transparent",
                        borderRadius: radius.pill,
                      },
                    ]}
                    onPress={() => {
                      onSelectCanvasTheme(themeKey);
                    }}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.themeColorSwatch,
                        {
                          backgroundColor: themeConfig.backgroundColor,
                          borderColor: themeConfig.isDark ? skin.borderSoft : "#CBD5E1",
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.popoverItemLabel,
                        {
                          color: isSelected ? skin.primary : skin.text,
                          fontFamily: isSelected ? fonts.uiBold : fonts.ui,
                        },
                      ]}
                    >
                      {themeConfig.label}
                    </Text>
                    {isSelected && <Check size={14} color={skin.primary} strokeWidth={2.2} />}
                  </TouchableOpacity>
                );
              })}
            </>
          )}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  popoverCard: {
    position: "absolute",
    width: 220,
    maxHeight: 440,
    padding: 12,
    paddingBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 16,
    zIndex: 9999,
  },
  popoverHeader: {
    fontSize: 9,
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: "uppercase",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  popoverItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingVertical: 7,
    paddingHorizontal: 8,
    marginVertical: 1,
  },
  popoverItemIcon: {
    fontSize: 16,
    marginRight: 10,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  popoverIconWrapper: {
    width: 16,
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  themeColorSwatch: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    marginRight: 10,
  },
  popoverItemLabel: {
    fontSize: 12,
    flex: 1,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  popoverCheck: {
    fontSize: 13,
    fontWeight: "700",
  },
});
