export type BrushType =
  | "pen"
  | "marker"
  | "highlighter"
  | "eraser"
  | "pan"
  | "lasso"
  | "shapes";

export type PassiveAttributeType = "ANALOGY" | "CAUSAL_MECHANISM" | "EVIDENCE";

export type CanvasBackgroundType = "dot_grid" | "graph_grid" | "ruled" | "blank";

export type EraserMode = "stroke" | "precision";

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

export interface SelectionChangedEvent {
  hasSelection: boolean;
  selectedCount: number;
}

export interface PlacedAttribute {
  id: string;
  type: PassiveAttributeType;
  title: string;
  note: string;
  worldX: number;
  worldY: number;
}

export interface HoverEvent {
  worldX: number;
  worldY: number;
  screenX: number;
  screenY: number;
  isHovering: boolean;
}
