/**
 * Native Digital Ink Bridge & Canvas Contract
 * Defines imperative commands and native events for the TurboModule / Native UI Component
 * Based on MASTER_SPEC.md (Section 2.2, 3.1, 4.3, 5.2) and DECISION_RATIONALE.md (Section 1.1, 3.1)
 */

import { RawInkLayer } from "./persistence";

/**
 * Supported Canvas Inking Tools
 */
export type BrushType =
  | "pen"
  | "marker"
  | "highlighter"
  | "eraser"
  | "pan"
  | "lasso"
  | "shapes"
  | "laser";

/**
 * Eraser Operating Modes
 */
export type EraserMode = "stroke" | "precision";

/**
 * Canvas Background Grid Patterns
 */
export type CanvasBackgroundType = "dot_grid" | "graph_grid" | "ruled" | "blank";

/**
 * Native Ink Canvas Commands (Methods accessible via React ref / NativeMethods)
 */
export interface InkCanvasRef {
  /** Switches active drawing or manipulation tool */
  setTool(tool: BrushType, options?: { color?: string; width?: number; eraserMode?: EraserMode }): void;
  
  /** Updates stroke color for pen/marker/highlighter */
  setBrushColor(color: string): void;
  
  /** Updates stroke width in dp */
  setBrushWidth(width: number): void;
  
  /** Sets eraser behavior: whole stroke vs pixel-precision segment */
  setEraserMode(mode: EraserMode): void;
  
  /** Sets canvas background grid pattern */
  setBackground(background: CanvasBackgroundType): void;
  
  /** Toggles stylus-only hardware palm rejection mode */
  setStylusOnly(enabled: boolean): void;
  
  /** Generates high-DPI full canvas PNG render (returns base64 data or local file URI for S3 upload) */
  exportHighResPng(): Promise<string>;
  
  /** Exports the current atomic vector stroke database (Layer 1) */
  exportRawInk(): Promise<RawInkLayer>;
  
  /** Hydrates the canvas with an existing vector stroke layer */
  loadRawInk(layer: RawInkLayer): Promise<void>;
  
  /** Clears all strokes on the canvas */
  clear(): void;
  
  /** Undo last stroke or stroke transformation */
  undo(): void;
  
  /** Redo last undone stroke */
  redo(): void;
  
  /** Deletes strokes currently selected by the lasso */
  deleteSelection(): void;
  
  /** Clears active lasso selection marquee */
  clearSelection(): void;
  
  /** Triggers animated 1.25x zoom-in centered on screen */
  zoomIn(): void;
  
  /** Triggers animated 0.8x zoom-out centered on screen */
  zoomOut(): void;
  
  /** Resets camera transform to 100% scale and (0,0) translation */
  resetZoom(): void;
}

/**
 * Event emitted when a stroke gesture finishes
 */
export interface StrokeEndEvent {
  strokeCount: number;
  canUndo: boolean;
  canRedo: boolean;
  lastStrokeId?: string;
}

/**
 * Event emitted during 2-finger pinch-to-zoom or pan transformations
 */
export interface TransformEvent {
  scale: number;
  translateX: number;
  translateY: number;
}

/**
 * Event emitted when the physical S-Pen barrel button is pressed
 */
export interface BarrelButtonEvent {
  x: number;
  y: number;
  worldX?: number;
  worldY?: number;
}

/**
 * Event emitted when a lasso selection changes
 */
export interface SelectionChangedEvent {
  hasSelection: boolean;
  selectedCount: number;
  selectedStrokeIds?: string[];
}

/**
 * Continuous S-Pen Air View / Proximity Hover Event (5-20 mm)
 */
export interface HoverEvent {
  worldX: number;
  worldY: number;
  screenX: number;
  screenY: number;
  isHovering: boolean;
}

/**
 * Discrete S-Pen Hover Dwell Event (ADR 3.1 & Master Spec 4)
 * Emitted when stylus hovers within 15px radius for >= 800 ms over an entity or point,
 * automatically triggering the semantic anchor input micro-tooltip.
 */
export interface HoverTimeoutEvent {
  worldX: number;
  worldY: number;
  screenX: number;
  screenY: number;
  dwellDurationMs: number; // Configured at 800 ms
  targetEntityId?: string; // Entity ID if hovered over an existing Visual AST entity
}
