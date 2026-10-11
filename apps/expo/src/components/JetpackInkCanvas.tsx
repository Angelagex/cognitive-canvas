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
export async function exportHighResPng(
  scaleMultiplier = 2.0,
  fullDocument = false
): Promise<HighResPngExportResult> {
  const { JetpackInkModule } = NativeModules;
  if (!JetpackInkModule?.exportHighResPng) {
    throw new Error("JetpackInkModule is not available on this platform.");
  }
  return await JetpackInkModule.exportHighResPng({ scaleMultiplier, fullDocument });
}

/**
 * Unpacks flat points array [x0, y0, p0, t0, x1, y1, p1, t1, ...] into point objects.
 */
export function unpackStrokePoints(stroke: any): { x: number; y: number; p: number; t: number }[] {
  if (stroke.points && Array.isArray(stroke.points) && stroke.points.length > 0) {
    return stroke.points;
  }
  if (!stroke.flatPoints || !Array.isArray(stroke.flatPoints)) {
    return [];
  }
  const fp = stroke.flatPoints;
  const pts: { x: number; y: number; p: number; t: number }[] = [];
  for (let i = 0; i < fp.length; i += 4) {
    pts.push({
      x: fp[i],
      y: fp[i + 1],
      p: fp[i + 2] ?? 0.5,
      t: fp[i + 3] ?? 0,
    });
  }
  return pts;
}

/**
 * Pulls current serialized strokes directly from native memory on-demand.
 * Follows industry-standard pull architecture (Goodnotes, Nebo), eliminating bridge bottlenecks during writing.
 * Automatically unpacks flat points for downstream consumers while preserving flatPoints for fast transfer.
 */
export async function getCanvasStrokes(): Promise<any[]> {
  const { JetpackInkModule } = NativeModules;
  if (!JetpackInkModule?.getCanvasStrokes) {
    return [];
  }
  const raw = await JetpackInkModule.getCanvasStrokes();
  if (!Array.isArray(raw)) return [];
  return raw.map((stroke) => {
    if ((!stroke.points || stroke.points.length === 0) && stroke.flatPoints) {
      return {
        ...stroke,
        points: unpackStrokePoints(stroke),
      };
    }
    return stroke;
  });
}

export interface ScratchOutEvent {
  deletedCount: number;
  remainingCount: number;
}

export interface JetpackInkCanvasProps extends ViewProps {
  strokeColor?: string;
  strokeWidth?: number;
  brushType?: BrushType;
  eraserMode?: string;
  backgroundType?: string;
  canvasBackgroundColor?: string;
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
  onScratchOut?: (event: NativeSyntheticEvent<ScratchOutEvent>) => void;
}

interface NativeJetpackInkViewProps extends ViewProps {
  strokeColor: string;
  strokeWidth: number;
  brushType: string;
  eraserMode?: string;
  backgroundType?: string;
  canvasBackgroundColor?: string;
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
  onScratchOut?: (event: NativeSyntheticEvent<ScratchOutEvent>) => void;
}

const NativeJetpackInkView = requireNativeComponent<NativeJetpackInkViewProps>("JetpackInkView");

export const JetpackInkCanvas: React.FC<JetpackInkCanvasProps> = React.memo(({
  strokeColor = "#38BDF8",
  strokeWidth = 18,
  brushType = "pen",
  eraserMode = "stroke",
  backgroundType = "dot_grid",
  canvasBackgroundColor = "#0F172A",
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
  onScratchOut,
  style,
  ...rest
}) => {
  const handleScratchOutInternal = React.useCallback(
    (event: NativeSyntheticEvent<ScratchOutEvent>) => {
      const { deletedCount, remainingCount } = event.nativeEvent;
      console.log(
        `🧹 [BORRADO CON SWAP] Se ejecutó el borrado: ${deletedCount} trazos eliminados (restantes: ${remainingCount})`
      );
      onScratchOut?.(event);
    },
    [onScratchOut]
  );

  return (
    <View style={[styles.container, style]}>
      <NativeJetpackInkView
        style={StyleSheet.absoluteFill}
        strokeColor={strokeColor}
        strokeWidth={strokeWidth}
        brushType={brushType}
        eraserMode={eraserMode}
        backgroundType={backgroundType}
        canvasBackgroundColor={canvasBackgroundColor}
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
        onScratchOut={handleScratchOutInternal}
        {...rest}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
  },
});
