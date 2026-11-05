import React from "react";
import { View, Text, StyleSheet, StyleProp, ViewStyle, TextStyle } from "react-native";
import { Check, AlertCircle } from "@sketchyicons/react-native";
import { useSkin, radius, border, fonts } from "../../theme";

export type BadgeVariant = "verified" | "unverified" | "neutral";

export interface BadgeProps {
  variant?: BadgeVariant;
  label?: string;
  showIcon?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = "verified",
  label,
  showIcon = true,
  style,
  textStyle,
}) => {
  const { skin } = useSkin();

  let defaultLabel = "VERIFICADO";
  let color = skin.success;
  let IconComponent: React.ComponentType<any> | null = Check;

  if (variant === "unverified") {
    defaultLabel = "SIN VERIFICAR";
    color = skin.warm;
    IconComponent = AlertCircle;
  } else if (variant === "neutral") {
    defaultLabel = "BORRADOR";
    color = skin.textMuted;
    IconComponent = null;
  }

  const finalLabel = label || defaultLabel;

  return (
    <View
      style={[
        styles.badgeBase,
        {
          backgroundColor: `${color}1E`,
          borderColor: color,
          borderRadius: radius.pill,
          borderWidth: border.soft,
        },
        style,
      ]}
    >
      {showIcon && IconComponent && (
        <View style={styles.iconWrapper}>
          <IconComponent size={11} color={color} strokeWidth={2.4} />
        </View>
      )}
      <Text
        style={[
          styles.text,
          {
            color,
            fontFamily: fonts.monoBold,
            fontWeight: "normal",
          },
          textStyle,
        ]}
      >
        {finalLabel}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badgeBase: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  iconWrapper: {
    marginRight: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
});

