import React from "react";
import { requireNativeComponent, ViewProps, NativeSyntheticEvent, StyleSheet, View } from "react-native";

export type BrushType = "pen" | "marker" | "highlighter" | "eraser" | "pan";

export type StrokeEndEvent = {
  strokeCount: number;
};

export type TransformEvent = {
  scale: number;
  translateX: number;
  translateY: number;
};

export interface JetpackInkCanvasProps extends ViewProps {
  strokeColor?: string;
  strokeWidth?: number;
  brushType?: BrushType;
  scale?: number;
  panX?: number;
  panY?: number;
  zoomInTrigger?: number;
  zoomOutTrigger?: number;
  resetZoomTrigger?: number;
  clearTrigger?: number;
  undoTrigger?: number;
  onStrokeEnd?: (event: NativeSyntheticEvent<StrokeEndEvent>) => void;
  onTransform?: (event: NativeSyntheticEvent<TransformEvent>) => void;
}

interface NativeJetpackInkViewProps extends ViewProps {
  strokeColor: string;
  strokeWidth: number;
  brushType: string;
  canvasScale: number;
  panX: number;
  panY: number;
  zoomInTrigger: number;
  zoomOutTrigger: number;
  resetZoomTrigger: number;
  clearTrigger: number;
  undoTrigger: number;
  onStrokeEnd?: (event: NativeSyntheticEvent<StrokeEndEvent>) => void;
  onTransform?: (event: NativeSyntheticEvent<TransformEvent>) => void;
}

const NativeJetpackInkView = requireNativeComponent<NativeJetpackInkViewProps>("JetpackInkView");

export const JetpackInkCanvas: React.FC<JetpackInkCanvasProps> = ({
  strokeColor = "#38BDF8",
  strokeWidth = 18,
  brushType = "pen",
  scale = 1.0,
  panX = 0.0,
  panY = 0.0,
  zoomInTrigger = 0,
  zoomOutTrigger = 0,
  resetZoomTrigger = 0,
  clearTrigger = 0,
  undoTrigger = 0,
  onStrokeEnd,
  onTransform,
  style,
  ...rest
}) => {
  return (
    <View style={[styles.container, style]}>
      <NativeJetpackInkView
        style={StyleSheet.absoluteFill}
        strokeColor={strokeColor}
        strokeWidth={strokeWidth}
        brushType={brushType}
        canvasScale={scale}
        panX={panX}
        panY={panY}
        zoomInTrigger={zoomInTrigger}
        zoomOutTrigger={zoomOutTrigger}
        resetZoomTrigger={resetZoomTrigger}
        clearTrigger={clearTrigger}
        undoTrigger={undoTrigger}
        onStrokeEnd={onStrokeEnd}
        onTransform={onTransform}
        {...rest}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
  },
});
