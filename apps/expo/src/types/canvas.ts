import { RawInkStroke } from "@cognitive-canvas/core/types";

export type BrushType =
  | "pen"
  | "marker"
  | "highlighter"
  | "eraser"
  | "pan"
  | "lasso"
  | "laser";

export interface HighResPngExportResult {
  uri: string;
  path: string;
  base64?: string;
  width: number;
  height: number;
  sizeBytes: number;
  renderedRect?: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width?: number;
    height?: number;
  };
}

export type PassiveAttributeType = "ANALOGY" | "CAUSAL_MECHANISM" | "EVIDENCE";

export type ToolbarDockEdge = "left" | "right" | "top" | "bottom";

export type CanvasBackgroundType = "dot_grid" | "graph_grid" | "ruled" | "blank";

export type CanvasThemePreset =
  | "crema"
  | "noche"
  | "tinta"
  | "folio"
  // Legacy aliases for backward compatibility with existing databases
  | "dark_slate"
  | "charcoal_dark"
  | "warm_ivory"
  | "pure_white"
  | "cobalto_crema"
  | "tinta_papel";

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
  // 4 Presets canónicos Vink (§1 / canvasPapers)
  crema: {
    id: "crema",
    label: "Cobalto y Crema",
    backgroundColor: "#F3EDE0",
    defaultInkColor: "#0C0E14",
    gridColor: "rgba(12, 14, 20, 0.14)",
    isDark: false,
    favoriteColors: ["#0C0E14", "#2F3DFF", "#FFB320"],
  },
  noche: {
    id: "noche",
    label: "Noche Obsidiana",
    backgroundColor: "#0E1018",
    defaultInkColor: "#F3EDE0",
    gridColor: "rgba(243, 237, 224, 0.14)",
    isDark: true,
    favoriteColors: ["#F3EDE0", "#5A68FF", "#FFB320"],
  },
  tinta: {
    id: "tinta",
    label: "Tinta y Papel",
    backgroundColor: "#10142A",
    defaultInkColor: "#F3EEE3",
    gridColor: "rgba(243, 238, 227, 0.14)",
    isDark: true,
    favoriteColors: ["#F3EEE3", "#4C6FFF", "#FF5A3C"],
  },
  folio: {
    id: "folio",
    label: "Blanco Puro",
    backgroundColor: "#FFFFFF",
    defaultInkColor: "#111111",
    gridColor: "#E2E8F0",
    isDark: false,
    favoriteColors: ["#111111", "#2F3DFF", "#FF6B4A"],
  },

  // Aliases legacy
  cobalto_crema: {
    id: "cobalto_crema",
    label: "Cobalto y Crema",
    backgroundColor: "#0C0E14",
    defaultInkColor: "#F3EDE0",
    gridColor: "#1C1F2B",
    isDark: true,
    favoriteColors: ["#F3EDE0", "#2F3DFF", "#FFB320"],
  },
  tinta_papel: {
    id: "tinta_papel",
    label: "Tinta y Papel",
    backgroundColor: "#10142A",
    defaultInkColor: "#F3EEE3",
    gridColor: "#1A2040",
    isDark: true,
    favoriteColors: ["#F3EEE3", "#4C6FFF", "#FF5A3C"],
  },
  pure_white: {
    id: "pure_white",
    label: "Blanco Puro",
    backgroundColor: "#FFFFFF",
    defaultInkColor: "#0F172A",
    gridColor: "#E2E8F0",
    isDark: false,
    favoriteColors: ["#0F172A", "#0284C7", "#E11D48"],
  },
  charcoal_dark: {
    id: "charcoal_dark",
    label: "Grafito Carbón",
    backgroundColor: "#18181B",
    defaultInkColor: "#F4F4F5",
    gridColor: "#27272A",
    isDark: true,
    favoriteColors: ["#F4F4F5", "#34D399", "#FBBF24"],
  },
  dark_slate: {
    id: "dark_slate",
    label: "Pizarra Azulada",
    backgroundColor: "#0F172A",
    defaultInkColor: "#F8FAFC",
    gridColor: "#27354A",
    isDark: true,
    favoriteColors: ["#F8FAFC", "#38BDF8", "#F43F5E"],
  },
  warm_ivory: {
    id: "warm_ivory",
    label: "Marfil Cálido",
    backgroundColor: "#FBF9F5",
    defaultInkColor: "#1E293B",
    gridColor: "#E5DEC9",
    isDark: false,
    favoriteColors: ["#1E293B", "#1D4ED8", "#BE123C"],
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
  activeBrush?: BrushType;
  previousBrush?: BrushType;
}

export interface ThinkingMemo {
  transcript: string;
  recordedAt: number;
}

export interface ConsolidatedRef {
  targetCanvasId: string;
  targetCanvasTitle: string;
}

export interface SynthesisReferenceCard {
  id: string;
  nodeId: string;
  label: string;
  summary: string;
  sourceCanvasId: string;
  sourceCanvasTitle: string;
  side: "left" | "right";
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
  strokeIds?: string[];
  thinkingMemo?: ThinkingMemo;
  consolidatedRef?: ConsolidatedRef;
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

export interface UserPreferences {
  toolbar_dock_side?: "left" | "right";
  toolbar_dock_edge?: ToolbarDockEdge;
  tool_widths?: Record<BrushType, number>;
  theme_palettes?: Record<CanvasThemePreset, string[]>;
  deepgram_api_key?: string;
  gemini_api_key?: string;
  target_learning_goal?: string;
  default_theme?: CanvasThemePreset;
  app_skin?: "crema" | "noche" | "tinta";
  app_theme?: "cobalto_crema" | "tinta_papel";
  stylus_only_default?: boolean;
  has_seen_onboarding?: boolean;
}

export const DEFAULT_TOOL_WIDTHS: Record<BrushType, number> = {
  pen: 8,
  marker: 12,
  highlighter: 24,
  eraser: 24,
  lasso: 4,
  laser: 16,
  pan: 4,
};

export const DEFAULT_THEME_PALETTES: Record<CanvasThemePreset, string[]> = {
  crema: [...CANVAS_THEMES.crema.favoriteColors],
  noche: [...CANVAS_THEMES.noche.favoriteColors],
  tinta: [...CANVAS_THEMES.tinta.favoriteColors],
  folio: [...CANVAS_THEMES.folio.favoriteColors],
  dark_slate: [...CANVAS_THEMES.dark_slate.favoriteColors],
  charcoal_dark: [...CANVAS_THEMES.charcoal_dark.favoriteColors],
  warm_ivory: [...CANVAS_THEMES.warm_ivory.favoriteColors],
  pure_white: [...CANVAS_THEMES.pure_white.favoriteColors],
  cobalto_crema: [...CANVAS_THEMES.cobalto_crema.favoriteColors],
  tinta_papel: [...CANVAS_THEMES.tinta_papel.favoriteColors],
};


