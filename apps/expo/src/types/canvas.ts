export type BrushType =
  | "pen"
  | "marker"
  | "highlighter"
  | "eraser"
  | "pan"
  | "lasso"
  | "shapes";

export type PassiveAttributeType = "ANALOGY" | "CAUSAL_MECHANISM" | "EVIDENCE";

export type CanvasBackgroundType = "blank" | "dot_grid" | "millimeter";

export interface StrokeEndEvent {
  strokeCount: number;
  canUndo?: boolean;
  canRedo?: boolean;
}

export interface TransformEvent {
  scale: number;
  translateX: number;
  translateY: number;
}

export interface BarrelButtonEvent {
  x: number;
  y: number;
}
