import React from "react";
import { requireNativeComponent, ViewProps, NativeSyntheticEvent, StyleSheet, View } from "react-native";

export type StrokeEndEvent = {
  strokeCount: number;
};

export interface JetpackInkCanvasProps extends ViewProps {
  strokeColor?: string;
  strokeWidth?: number;
  onStrokeEnd?: (event: NativeSyntheticEvent<StrokeEndEvent>) => void;
}

const NativeJetpackInkView = requireNativeComponent<JetpackInkCanvasProps>("JetpackInkView");

export const JetpackInkCanvas: React.FC<JetpackInkCanvasProps> = ({
  strokeColor = "#38BDF8",
  strokeWidth = 6,
  onStrokeEnd,
  style,
  ...rest
}) => {
  return (
    <View style={[styles.container, style]}>
      <NativeJetpackInkView
        style={StyleSheet.absoluteFill}
        strokeColor={strokeColor}
        strokeWidth={strokeWidth}
        onStrokeEnd={onStrokeEnd}
        {...rest}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
    borderRadius: 8,
  },
});
