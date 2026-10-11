import { RawInkStroke } from "@cognitive-canvas/core/types";

export type BrushType =
  | "pen"
  | "marker"
  | "highlighter"
  | "eraser"
  | "pan"
  | "lasso"
  | "shapes"
  | "laser";

export interface HighResPngExportResult {
  uri: string;
  path: string;
  width: number;
  height: number;
  sizeBytes: number;
}

export type PassiveAttributeType = "ANALOGY" | "CAUSAL_MECHANISM" | "EVIDENCE";

export type CanvasBackgroundType = "dot_grid" | "graph_grid" | "ruled" | "blank";

export type CanvasThemePreset = "dark_slate" | "charcoal_dark" | "warm_ivory" | "pure_white";

export interface CanvasThemeConfig {
  id: CanvasThemePreset;
  label: string;
  backgroundColor: string;
  defaultInkColor: string;
  gridColor: string;
  isDark: boolean;
  favoriteColors: [string, string, string]; // [Principal, Secundario/Relación, Acento/Resaltado]
}

export const CANVAS_THEMES: Record<CanvasThemePreset, CanvasThemeConfig> = {
  dark_slate: {
    id: "dark_slate",
    label: "Pizarra Azulada",
    backgroundColor: "#0F172A",
    defaultInkColor: "#F8FAFC",
    gridColor: "#27354A",
    isDark: true,
    favoriteColors: ["#F8FAFC", "#38BDF8", "#F43F5E"], // Blanco hueso, Azul eléctrico, Rosa carmín
  },
  charcoal_dark: {
    id: "charcoal_dark",
    label: "Grafito Carbón",
    backgroundColor: "#18181B",
    defaultInkColor: "#F4F4F5",
    gridColor: "#27272A",
    isDark: true,
    favoriteColors: ["#F4F4F5", "#34D399", "#FBBF24"], // Tiza suave, Verde esmeralda, Ámbar dorado
  },
  warm_ivory: {
    id: "warm_ivory",
    label: "Marfil Cálido",
    backgroundColor: "#FBF9F5",
    defaultInkColor: "#1E293B",
    gridColor: "#E5DEC9",
    isDark: false,
    favoriteColors: ["#1E293B", "#1D4ED8", "#BE123C"], // Carbón pizarra, Azul zafiro, Borgoña vino
  },
  pure_white: {
    id: "pure_white",
    label: "Blanco Puro",
    backgroundColor: "#FFFFFF",
    defaultInkColor: "#0F172A",
    gridColor: "#E2E8F0",
    isDark: false,
    favoriteColors: ["#0F172A", "#0284C7", "#E11D48"], // Negro pizarra, Azul cian, Carmesí
  },
};

export type EraserMode = "stroke" | "precision";

export interface StrokeEndEvent {
  strokeCount: number;
  canUndo?: boolean;
  canRedo?: boolean;
  strokes?: RawInkStroke[];
}

export interface TransformEvent {
  scale: number;
  translateX: number;
  translateY: number;
}

export interface BarrelButtonEvent {
  x: number;
  y: number;
  worldX?: number;
  worldY?: number;
}

export interface SelectionBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  centerX: number;
  centerY: number;
}

export interface SelectionChangedEvent {
  hasSelection: boolean;
  selectedCount: number;
  bounds?: SelectionBounds;
}

export interface StrokesTransformedEvent {
  dx: number;
  dy: number;
  affectedStrokeCount: number;
}

export interface PlacedAttribute {
  id: string;
  type: PassiveAttributeType;
  title: string;
  note: string;
  worldX: number;
  worldY: number;
  entityBounds?: EntityBoundingBox;
}

export interface EntityBoundingBox {
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
}

export interface HoverEvent {
  worldX: number;
  worldY: number;
  screenX: number;
  screenY: number;
  isHovering: boolean;
  entityBounds?: EntityBoundingBox | null;
}

export interface HoverTimeoutEvent {
  worldX: number;
  worldY: number;
  screenX: number;
  screenY: number;
  dwellDurationMs: number;
  targetEntityId?: string;
  entityBounds?: EntityBoundingBox | null;
}

export interface FingerTapEvent {
  worldX: number;
  worldY: number;
  screenX: number;
  screenY: number;
  entityBounds?: EntityBoundingBox | null;
}

