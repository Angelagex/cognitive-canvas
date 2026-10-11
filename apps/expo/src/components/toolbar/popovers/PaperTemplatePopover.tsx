import React from "react";
import { StyleSheet, View, Text, TouchableOpacity, ViewStyle } from "react-native";
import { Check, FileText } from "@sketchyicons/react-native";
import { CanvasBackgroundType } from "../../../types/canvas";

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
  backgroundType: CanvasBackgroundType;
  onSelectBackgroundType: (type: CanvasBackgroundType) => void;
  onClose: () => void;
  positionStyle: ViewStyle;
}

export const PaperTemplatePopover: React.FC<PaperTemplatePopoverProps> = ({
  backgroundType,
  onSelectBackgroundType,
  onClose,
  positionStyle,
}) => {
  return (
    <View style={[styles.popoverCard, positionStyle, { top: 250, width: 170 }]}>
      <Text style={styles.popoverHeader}>TIPO DE PAPEL</Text>
      {PAPER_TEMPLATES.map((tmpl) => {
        const isSelected = backgroundType === tmpl.id;
        return (
          <TouchableOpacity
            key={tmpl.id}
            style={[styles.popoverItem, isSelected && styles.popoverItemActive]}
            onPress={() => {
              onSelectBackgroundType(tmpl.id);
              onClose();
            }}
            activeOpacity={0.7}
          >
            {tmpl.icon === "file" ? (
              <View style={styles.popoverIconWrapper}>
                <FileText size={15} color="#94A3B8" strokeWidth={1.8} />
              </View>
            ) : (
              <Text style={styles.popoverItemIcon}>{tmpl.icon}</Text>
            )}
            <Text style={[styles.popoverItemLabel, isSelected && styles.popoverItemLabelActive]}>
              {tmpl.label}
            </Text>
            {isSelected && <Check size={14} color="#38BDF8" strokeWidth={2.2} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  popoverCard: {
    position: "absolute",
    backgroundColor: "#0B1120",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1E293B",
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 16,
  },
  popoverHeader: {
    color: "#64748B",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 8,
  },
  popoverItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginVertical: 1,
  },
  popoverItemActive: {
    backgroundColor: "rgba(56, 189, 248, 0.12)",
  },
  popoverItemIcon: {
    fontSize: 16,
    marginRight: 10,
    color: "#94A3B8",
  },
  popoverIconWrapper: {
    width: 16,
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  popoverItemLabel: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  popoverItemLabelActive: {
    color: "#38BDF8",
    fontWeight: "700",
  },
  popoverCheck: {
    color: "#38BDF8",
    fontSize: 13,
    fontWeight: "700",
  },
});
