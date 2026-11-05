import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
  TextStyle,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useSkin, radius, border, fonts } from "../../theme";
import { HardShadow } from "./HardShadow";

export type ButtonVariant = "primary" | "outline" | "ghost";
export type ButtonSize = "sm" | "md";

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  haptic?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = "primary",
  size = "md",
  icon,
  iconPosition = "left",
  disabled = false,
  loading = false,
  style,
  textStyle,
  accessibilityLabel,
  haptic = true,
}) => {
  const { skin } = useSkin();

  const handlePress = () => {
    if (disabled || loading) return;
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onPress();
  };

  const isSm = size === "sm";
  const height = isSm ? 32 : 38;
  const paddingHorizontal = isSm ? 12 : 16;
  const fontSize = isSm ? 12 : 13;

  let backgroundColor = skin.surface;
  let borderColor = skin.border;
  let textColor = skin.text;
  let borderWidth: number = border.strong;

  if (variant === "primary") {
    backgroundColor = skin.primary;
    borderColor = skin.primary;
    textColor = skin.onPrimary;
    borderWidth = 0;
  } else if (variant === "outline") {
    backgroundColor = skin.surface;
    borderColor = skin.border;
    textColor = skin.text;
    borderWidth = border.strong;
  } else if (variant === "ghost") {
    backgroundColor = "transparent";
    borderColor = skin.borderSoft;
    textColor = skin.textMuted;
    borderWidth = border.soft;
  }

  const content = (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.82}
      accessibilityLabel={accessibilityLabel || label}
      style={[
        styles.buttonBase,
        {
          height,
          paddingHorizontal,
          backgroundColor,
          borderColor,
          borderWidth,
          borderRadius: radius.pill,
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <View style={styles.innerRow}>
          {icon && iconPosition === "left" && <View style={styles.iconLeft}>{icon}</View>}
          <Text
            style={[
              styles.textBase,
              {
                color: textColor,
                fontSize,
                fontFamily: fonts.uiBold,
                fontWeight: "normal",
              },
              textStyle,
            ]}
          >
            {label}
          </Text>
          {icon && iconPosition === "right" && <View style={styles.iconRight}>{icon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );

  // Sombra dura solo para variante primary
  if (variant === "primary" && !disabled) {
    return (
      <HardShadow offset={isSm ? "sm" : "md"} radius={radius.pill} shadowColor={skin.shadow}>
        {content}
      </HardShadow>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  buttonBase: {
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  innerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  textBase: {
    letterSpacing: 0.2,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  iconLeft: {
    marginRight: 6,
  },
  iconRight: {
    marginLeft: 6,
  },
});
