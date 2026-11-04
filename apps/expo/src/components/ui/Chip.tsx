import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, StyleProp, ViewStyle, TextStyle } from "react-native";
import { useSkin, nodeKind, radius, fonts } from "../../theme";

export type NodeKind = keyof typeof nodeKind;

export interface ChipProps {
  label: string;
  kind?: NodeKind;
  color?: string;
  dashed?: boolean; // nodo sin verificar
  selected?: boolean;
  onPress?: () => void;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  kind,
  color: customColor,
  dashed = false,
  selected = false,
  onPress,
  icon,
  style,
  textStyle,
}) => {
  const { skin } = useSkin();
  const baseColor = customColor || (kind ? nodeKind[kind] : skin.primary);

  // Relleno al 14% (12-18% según especificación)
  const bgOpacity = selected ? "38" : "20";
  const backgroundColor = `${baseColor}${bgOpacity}`;
  const borderColor = baseColor;

  const content = (
    <View
      style={[
        styles.chipBase,
        {
          backgroundColor,
          borderColor,
          borderStyle: dashed ? "dashed" : "solid",
          borderRadius: radius.chip,
        },
        style,
      ]}
    >
      {icon && <View style={styles.iconWrapper}>{icon}</View>}
      <Text
        style={[
          styles.labelText,
          {
            color: baseColor,
            fontFamily: fonts.monoBold,
            fontWeight: "normal",
          },
          textStyle,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.78}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  chipBase: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1.2,
    alignSelf: "flex-start",
  },
  iconWrapper: {
    marginRight: 6,
  },
  labelText: {
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
});

