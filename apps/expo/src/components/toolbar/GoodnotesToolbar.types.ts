import {
  BrushType,
  CanvasBackgroundType,
  CanvasThemePreset,
  EraserMode,
  ToolbarDockEdge,
} from "../../types/canvas";

export interface GoodnotesToolbarProps {
  activeBrush: BrushType;
  onSelectBrush: (brush: BrushType) => void;
  activeColor: string;
  onSelectColor: (color: string) => void;
  activeWidth: number;
  onSelectWidth: (width: number) => void;
  eraserMode: EraserMode;
  onSelectEraserMode: (mode: EraserMode) => void;
  backgroundType: CanvasBackgroundType;
  onSelectBackgroundType: (type: CanvasBackgroundType) => void;
  canvasTheme?: CanvasThemePreset;
  onSelectCanvasTheme?: (theme: CanvasThemePreset) => void;
  favoriteColors: string[];
  onUpdateFavoriteColor: (slotIndex: number, newColor: string) => void;
  dockSide?: "left" | "right";
  dockEdge?: ToolbarDockEdge;
  initialDockEdge?: ToolbarDockEdge;
  onToggleDockSide?: () => void;
  onDockSideChange?: (side: "left" | "right") => void;
  onDockEdgeChange?: (edge: ToolbarDockEdge) => void;
  canvasScale?: number;
  canvasTranslateX?: number;
  canvasTranslateY?: number;
  onOpenStickerPicker?: (
    targetWorld: { x: number; y: number },
    anchorScreen?: { x: number; y: number }
  ) => void;
  onStickerDragChange?: (
    dragState: { isDragging: boolean; screenX: number; screenY: number } | null
  ) => void;
  isZenMode?: boolean;
}

export const TOOLBAR_TOOLS: { id: BrushType; label: string }[] = [
  { id: "pen", label: "Bolígrafo" },
  { id: "highlighter", label: "Resaltador" },
  { id: "eraser", label: "Borrador" },
  { id: "lasso", label: "Lazo" },
  { id: "laser", label: "Láser" },
  { id: "pan", label: "Mover" },
];
