import React from "react";
import { View, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { useSkin, radius, border, hardShadow } from "../../theme";
import { HardShadow } from "./HardShadow";

export interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  withShadow?: boolean;
  shadowOffset?: keyof typeof hardShadow | number;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  padding?: number;
}

export const Card: React.FC<CardProps> = ({
  children,
  onPress,
  withShadow = true,
  shadowOffset = "md",
  style,
  contentStyle,
  padding = 16,
}) => {
  const { skin } = useSkin();

  const cardContent = (
    <View
      style={[
        styles.cardBase,
        {
          backgroundColor: skin.surface,
          borderColor: skin.border,
          borderWidth: border.strong,
          borderRadius: radius.card,
          padding,
        },
        contentStyle,
      ]}
    >
      {children}
    </View>
  );

  const wrapped = onPress ? (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88}>
      {cardContent}
    </TouchableOpacity>
  ) : (
    cardContent
  );

  if (withShadow) {
    return (
      <HardShadow
        offset={shadowOffset}
        radius={radius.card}
        shadowColor={skin.shadow}
        style={style}
      >
        {wrapped}
      </HardShadow>
    );
  }

  return <View style={style}>{wrapped}</View>;
};

const styles = StyleSheet.create({
  cardBase: {
    overflow: "hidden",
  },
});

