import React from "react";
import {
  requireNativeComponent,
  ViewProps,
  NativeSyntheticEvent,
  StyleSheet,
  View,
} from "react-native";
import {
  BrushType,
  StrokeEndEvent,
  TransformEvent,
  BarrelButtonEvent,
} from "../types/canvas";

export * from "../types/canvas";

export interface JetpackInkCanvasProps extends ViewProps {
  strokeColor?: string;
  strokeWidth?: number;
  brushType?: BrushType;
  stylusOnly?: boolean;
  scale?: number;
  panX?: number;
  panY?: number;
  zoomInTrigger?: number;
  zoomOutTrigger?: number;
  resetZoomTrigger?: number;
  clearTrigger?: number;
  undoTrigger?: number;
  redoTrigger?: number;
  onStrokeEnd?: (event: NativeSyntheticEvent<StrokeEndEvent>) => void;
  onTransform?: (event: NativeSyntheticEvent<TransformEvent>) => void;
  onBarrelButton?: (event: NativeSyntheticEvent<BarrelButtonEvent>) => void;
}

interface NativeJetpackInkViewProps extends ViewProps {
  strokeColor: string;
  strokeWidth: number;
  brushType: string;
  stylusOnly: boolean;
  canvasScale?: number;
  panX?: number;
  panY?: number;
  zoomInTrigger: number;
  zoomOutTrigger: number;
  resetZoomTrigger: number;
  clearTrigger: number;
  undoTrigger: number;
  redoTrigger: number;
  onStrokeEnd?: (event: NativeSyntheticEvent<StrokeEndEvent>) => void;
  onTransform?: (event: NativeSyntheticEvent<TransformEvent>) => void;
  onBarrelButton?: (event: NativeSyntheticEvent<BarrelButtonEvent>) => void;
}

const NativeJetpackInkView = requireNativeComponent<NativeJetpackInkViewProps>("JetpackInkView");

export const JetpackInkCanvas: React.FC<JetpackInkCanvasProps> = ({
  strokeColor = "#38BDF8",
  strokeWidth = 18,
  brushType = "pen",
  stylusOnly = true,
  scale = 1.0,
  panX = 0.0,
  panY = 0.0,
  zoomInTrigger = 0,
  zoomOutTrigger = 0,
  resetZoomTrigger = 0,
  clearTrigger = 0,
  undoTrigger = 0,
  redoTrigger = 0,
  onStrokeEnd,
  onTransform,
  onBarrelButton,
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
        stylusOnly={stylusOnly}
        canvasScale={scale}
        panX={panX}
        panY={panY}
        zoomInTrigger={zoomInTrigger}
        zoomOutTrigger={zoomOutTrigger}
        resetZoomTrigger={resetZoomTrigger}
        clearTrigger={clearTrigger}
        undoTrigger={undoTrigger}
        redoTrigger={redoTrigger}
        onStrokeEnd={onStrokeEnd}
        onTransform={onTransform}
        onBarrelButton={onBarrelButton}
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
