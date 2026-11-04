import React from "react";
import { View, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { useSkin, hardShadow } from "../../theme";

export interface HardShadowProps {
  children: React.ReactNode;
  offset?: number | keyof typeof hardShadow;
  shadowColor?: string;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  shadowStyle?: StyleProp<ViewStyle>;
}

/**
 * HardShadow: Resuelve la sombra dura ("sticker") desplazada y sólida en Android e iOS.
 * En Android, elevation NO admite sombra sólida sin blur ni offset directional;
 * este componente renderiza una vista hermana física detrás del contenido.
 */
export const HardShadow: React.FC<HardShadowProps> = ({
  children,
  offset = "md",
  shadowColor,
  radius = 16,
  style,
  shadowStyle,
}) => {
  const { skin } = useSkin();
  const numOffset = typeof offset === "number" ? offset : hardShadow[offset] || 3;
  const color = shadowColor || skin.shadow;

  return (
    <View style={[styles.container, style]}>
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          {
            top: numOffset,
            left: numOffset,
            backgroundColor: color,
            borderRadius: radius,
          },
          shadowStyle,
        ]}
      />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
});

