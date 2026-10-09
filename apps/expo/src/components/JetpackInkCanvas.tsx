import React from "react";
import {
  requireNativeComponent,
  ViewProps,
  NativeSyntheticEvent,
  StyleSheet,
  View,
  NativeModules,
} from "react-native";
import {
  BrushType,
  StrokeEndEvent,
  TransformEvent,
  BarrelButtonEvent,
  SelectionChangedEvent,
  HoverEvent,
  HoverTimeoutEvent,
  FingerTapEvent,
  HighResPngExportResult,
} from "../types/canvas";

export * from "../types/canvas";

export interface DigitalInkRecognitionResult {
  transcription: string | null;
  confidence: number;
  isTextBlock: boolean;
  candidates: string[];
}

/**
 * Recognizes text and characters from a set of strokes using on-device ML Kit Digital Ink Recognition
 */
export async function recognizeInkStrokes(
  strokes: Array<{ id: string; points: Array<{ x: number; y: number; t?: number }> }>
): Promise<DigitalInkRecognitionResult> {
  const { JetpackInkModule } = NativeModules;
  if (!JetpackInkModule?.recognizeInkStrokes) {
    return { transcription: null, confidence: 0, isTextBlock: false, candidates: [] };
  }
  return await JetpackInkModule.recognizeInkStrokes(strokes);
}

/**
 * Initializes and downloads the on-device ML Kit Digital Ink Recognition language model
 */
export async function initializeDigitalInk(language = "es"): Promise<boolean> {
  const { JetpackInkModule } = NativeModules;
  if (!JetpackInkModule?.initializeDigitalInk) {
    return false;
  }
  return await JetpackInkModule.initializeDigitalInk({ language });
}

/**
 * Captures high-resolution offscreen PNG bitmap from native Jetpack Ink view
 * @param scaleMultiplier Scaling factor (default 2.0x for crisp Retina/DPI output)
 */
export async function exportHighResPng(scaleMultiplier = 2.0): Promise<HighResPngExportResult> {
  const { JetpackInkModule } = NativeModules;
  if (!JetpackInkModule?.exportHighResPng) {
    throw new Error("JetpackInkModule is not available on this platform.");
  }
  return await JetpackInkModule.exportHighResPng({ scaleMultiplier });
}

export interface JetpackInkCanvasProps extends ViewProps {
  strokeColor?: string;
  strokeWidth?: number;
  brushType?: BrushType;
  eraserMode?: string;
  backgroundType?: string;
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
  deleteSelectionTrigger?: number;
  clearSelectionTrigger?: number;
  loadedStrokesJson?: string;
  loadStrokesTrigger?: number;
  onStrokeEnd?: (event: NativeSyntheticEvent<StrokeEndEvent>) => void;
  onTransform?: (event: NativeSyntheticEvent<TransformEvent>) => void;
  onBarrelButton?: (event: NativeSyntheticEvent<BarrelButtonEvent>) => void;
  onSelectionChanged?: (event: NativeSyntheticEvent<SelectionChangedEvent>) => void;
  onHover?: (event: NativeSyntheticEvent<HoverEvent>) => void;
  onHoverTimeout?: (event: NativeSyntheticEvent<HoverTimeoutEvent>) => void;
  onFingerTap?: (event: NativeSyntheticEvent<FingerTapEvent>) => void;
}

interface NativeJetpackInkViewProps extends ViewProps {
  strokeColor: string;
  strokeWidth: number;
  brushType: string;
  eraserMode?: string;
  backgroundType?: string;
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
  deleteSelectionTrigger?: number;
  clearSelectionTrigger?: number;
  loadedStrokesJson?: string;
  loadStrokesTrigger?: number;
  onStrokeEnd?: (event: NativeSyntheticEvent<StrokeEndEvent>) => void;
  onTransform?: (event: NativeSyntheticEvent<TransformEvent>) => void;
  onBarrelButton?: (event: NativeSyntheticEvent<BarrelButtonEvent>) => void;
  onSelectionChanged?: (event: NativeSyntheticEvent<SelectionChangedEvent>) => void;
  onHover?: (event: NativeSyntheticEvent<HoverEvent>) => void;
  onHoverTimeout?: (event: NativeSyntheticEvent<HoverTimeoutEvent>) => void;
  onFingerTap?: (event: NativeSyntheticEvent<FingerTapEvent>) => void;
}

const NativeJetpackInkView = requireNativeComponent<NativeJetpackInkViewProps>("JetpackInkView");

export const JetpackInkCanvas: React.FC<JetpackInkCanvasProps> = ({
  strokeColor = "#38BDF8",
  strokeWidth = 18,
  brushType = "pen",
  eraserMode = "stroke",
  backgroundType = "dot_grid",
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
  deleteSelectionTrigger = 0,
  clearSelectionTrigger = 0,
  loadedStrokesJson,
  loadStrokesTrigger = 0,
  onStrokeEnd,
  onTransform,
  onBarrelButton,
  onSelectionChanged,
  onHover,
  onHoverTimeout,
  onFingerTap,
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
        eraserMode={eraserMode}
        backgroundType={backgroundType}
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
        deleteSelectionTrigger={deleteSelectionTrigger}
        clearSelectionTrigger={clearSelectionTrigger}
        loadedStrokesJson={loadedStrokesJson}
        loadStrokesTrigger={loadStrokesTrigger}
        onStrokeEnd={onStrokeEnd}
        onTransform={onTransform}
        onBarrelButton={onBarrelButton}
        onSelectionChanged={onSelectionChanged}
        onHover={onHover}
        onHoverTimeout={onHoverTimeout}
        onFingerTap={onFingerTap}
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
