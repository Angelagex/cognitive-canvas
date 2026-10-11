import React from "react";
import { StyleSheet, View, Text, TouchableOpacity, ViewStyle } from "react-native";
import { Check } from "@sketchyicons/react-native";

export interface TipSizeItem {
  label: string;
  value: number;
  dot: number;
  desc: string;
}

export const TIP_SIZES: TipSizeItem[] = [
  { label: "Ultra Fino", value: 4, dot: 3, desc: "0.4 mm" },
  { label: "Fino", value: 8, dot: 5, desc: "0.8 mm" },
  { label: "Medio", value: 16, dot: 8, desc: "1.6 mm" },
  { label: "Grueso", value: 24, dot: 12, desc: "2.4 mm" },
  { label: "Marcador", value: 36, dot: 16, desc: "3.6 mm" },
  { label: "Pincel", value: 50, dot: 22, desc: "5.0 mm" },
];

interface StrokeWidthPopoverProps {
  activeWidth: number;
  activeColor: string;
  onSelectWidth: (width: number) => void;
  onClose: () => void;
  positionStyle: ViewStyle;
}

export const StrokeWidthPopover: React.FC<StrokeWidthPopoverProps> = ({
  activeWidth,
  activeColor,
  onSelectWidth,
  onClose,
  positionStyle,
}) => {
  return (
    <View style={[styles.popoverCard, positionStyle, { top: 370, width: 200 }]}>
      <Text style={styles.popoverHeader}>GROSOR DE TRAZO</Text>
      {TIP_SIZES.map((s) => {
        const isSelected = activeWidth === s.value;
        return (
          <TouchableOpacity
            key={s.label}
            style={[styles.popoverItem, isSelected && styles.popoverItemActive]}
            onPress={() => {
              onSelectWidth(s.value);
              onClose();
            }}
            activeOpacity={0.7}
          >
            <View style={styles.sizePreviewContainer}>
              <View
                style={[
                  styles.sizePreviewBar,
                  {
                    height: Math.min(Math.max(s.dot, 2), 16),
                    borderRadius: Math.min(Math.max(s.dot, 2), 16) / 2,
                    backgroundColor: isSelected ? "#38BDF8" : activeColor,
                  },
                ]}
              />
            </View>
            <View style={styles.popoverItemCol}>
              <Text style={[styles.popoverItemLabel, isSelected && styles.popoverItemLabelActive]}>
                {s.label}
              </Text>
              <Text style={styles.popoverItemDesc}>{s.desc} • {s.value}px</Text>
            </View>
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
  sizePreviewContainer: {
    width: 24,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  sizePreviewBar: {
    width: 22,
  },
  popoverItemCol: {
    flex: 1,
  },
  popoverItemLabel: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "600",
  },
  popoverItemLabelActive: {
    color: "#38BDF8",
    fontWeight: "700",
  },
  popoverItemDesc: {
    color: "#64748B",
    fontSize: 10,
  },
  popoverCheck: {
    color: "#38BDF8",
    fontSize: 13,
    fontWeight: "700",
  },
});
