import React from "react";
import { StyleSheet, View } from "react-native";

interface DotGridBackgroundProps {
  dotColor?: string;
  backgroundColor?: string;
}

export const DotGridBackground: React.FC<DotGridBackgroundProps> = ({
  backgroundColor = "#090D16",
}) => {
  return (
    <View style={[styles.container, { backgroundColor }]} pointerEvents="none">
      {/* Background layer */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
});
