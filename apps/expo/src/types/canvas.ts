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

export type CanonicalCanvasThemePreset =
  | "crema"
  | "niebla"
  | "obsidiana"
  | "tinta"
  | "pizarra";

export type CanvasThemePreset =
  | CanonicalCanvasThemePreset
  // Legacy aliases para migración transparente de lienzos existentes
  | "noche"
  | "folio"
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
  // ───────────────────────── 5 Presets Canónicos ─────────────────────────
  crema: {
    id: "crema",
    label: "Cobalto y Crema",
    backgroundColor: "#F3EDE0",
    defaultInkColor: "#0C0E14",
    gridColor: "#C9C5BB",
    isDark: false,
    favoriteColors: ["#0C0E14", "#2F3DFF", "#C92500"],
  },
  niebla: {
    id: "niebla",
    label: "Niebla",
    backgroundColor: "#E8ECF3",
    defaultInkColor: "#151B2B",
    gridColor: "#C0C4CD",
    isDark: false,
    favoriteColors: ["#151B2B", "#2F3DFF", "#267458"],
  },
  obsidiana: {
    id: "obsidiana",
    label: "Obsidiana",
    backgroundColor: "#0C0E14",
    defaultInkColor: "#F3EDE0",
    gridColor: "#363639",
    isDark: true,
    favoriteColors: ["#F3EDE0", "#6471FF", "#FFB320"],
  },
  tinta: {
    id: "tinta",
    label: "Tinta y Papel",
    backgroundColor: "#10142A",
    defaultInkColor: "#F3EEE3",
    gridColor: "#393B4B",
    isDark: true,
    favoriteColors: ["#F3EEE3", "#7C93FF", "#FF6B4A"],
  },
  pizarra: {
    id: "pizarra",
    label: "Pizarra",
    backgroundColor: "#15241F",
    defaultInkColor: "#EFEBDD",
    gridColor: "#3A463F",
    isDark: true,
    favoriteColors: ["#EFEBDD", "#7FD6B0", "#F2C75C"],
  },

  // ───────────────────────── Aliases Legacy Migrados ─────────────────────────
  warm_ivory: {
    id: "warm_ivory",
    label: "Cobalto y Crema",
    backgroundColor: "#F3EDE0",
    defaultInkColor: "#0C0E14",
    gridColor: "#C9C5BB",
    isDark: false,
    favoriteColors: ["#0C0E14", "#2F3DFF", "#C92500"],
  },
  folio: {
    id: "folio",
    label: "Niebla",
    backgroundColor: "#E8ECF3",
    defaultInkColor: "#151B2B",
    gridColor: "#C0C4CD",
    isDark: false,
    favoriteColors: ["#151B2B", "#2F3DFF", "#267458"],
  },
  pure_white: {
    id: "pure_white",
    label: "Niebla",
    backgroundColor: "#E8ECF3",
    defaultInkColor: "#151B2B",
    gridColor: "#C0C4CD",
    isDark: false,
    favoriteColors: ["#151B2B", "#2F3DFF", "#267458"],
  },
  cobalto_crema: {
    id: "cobalto_crema",
    label: "Obsidiana",
    backgroundColor: "#0C0E14",
    defaultInkColor: "#F3EDE0",
    gridColor: "#363639",
    isDark: true,
    favoriteColors: ["#F3EDE0", "#6471FF", "#FFB320"],
  },
  noche: {
    id: "noche",
    label: "Obsidiana",
    backgroundColor: "#0C0E14",
    defaultInkColor: "#F3EDE0",
    gridColor: "#363639",
    isDark: true,
    favoriteColors: ["#F3EDE0", "#6471FF", "#FFB320"],
  },
  charcoal_dark: {
    id: "charcoal_dark",
    label: "Obsidiana",
    backgroundColor: "#0C0E14",
    defaultInkColor: "#F3EDE0",
    gridColor: "#363639",
    isDark: true,
    favoriteColors: ["#F3EDE0", "#6471FF", "#FFB320"],
  },
  dark_slate: {
    id: "dark_slate",
    label: "Tinta y Papel",
    backgroundColor: "#10142A",
    defaultInkColor: "#F3EEE3",
    gridColor: "#393B4B",
    isDark: true,
    favoriteColors: ["#F3EEE3", "#7C93FF", "#FF6B4A"],
  },
  tinta_papel: {
    id: "tinta_papel",
    label: "Tinta y Papel",
    backgroundColor: "#10142A",
    defaultInkColor: "#F3EEE3",
    gridColor: "#393B4B",
    isDark: true,
    favoriteColors: ["#F3EEE3", "#7C93FF", "#FF6B4A"],
  },
};

export const CANVAS_THEME_PRESETS: CanonicalCanvasThemePreset[] = [
  "crema",
  "niebla",
  "obsidiana",
  "tinta",
  "pizarra",
];

export const CANVAS_THEME_MIGRATION: Record<string, CanonicalCanvasThemePreset> = {
  crema: "crema",
  warm_ivory: "crema",
  folio: "niebla",
  pure_white: "niebla",
  cobalto_crema: "obsidiana",
  noche: "obsidiana",
  charcoal_dark: "obsidiana",
  dark_slate: "tinta",
  tinta: "tinta",
  tinta_papel: "tinta",
  obsidiana: "obsidiana",
  niebla: "niebla",
  pizarra: "pizarra",
};

export function migrateCanvasTheme(themeId?: string | null): CanonicalCanvasThemePreset {
  if (!themeId) return "crema";
  return CANVAS_THEME_MIGRATION[themeId] || "crema";
}

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
  // 5 Presets canónicos
  crema: [...CANVAS_THEMES.crema.favoriteColors],
  niebla: [...CANVAS_THEMES.niebla.favoriteColors],
  obsidiana: [...CANVAS_THEMES.obsidiana.favoriteColors],
  tinta: [...CANVAS_THEMES.tinta.favoriteColors],
  pizarra: [...CANVAS_THEMES.pizarra.favoriteColors],

  // Aliases legacy
  noche: [...CANVAS_THEMES.obsidiana.favoriteColors],
  folio: [...CANVAS_THEMES.niebla.favoriteColors],
  dark_slate: [...CANVAS_THEMES.tinta.favoriteColors],
  charcoal_dark: [...CANVAS_THEMES.obsidiana.favoriteColors],
  warm_ivory: [...CANVAS_THEMES.crema.favoriteColors],
  pure_white: [...CANVAS_THEMES.niebla.favoriteColors],
  cobalto_crema: [...CANVAS_THEMES.obsidiana.favoriteColors],
  tinta_papel: [...CANVAS_THEMES.tinta.favoriteColors],
};


