import { useState, useCallback, useRef } from "react";
import {
  BrushType,
  CanvasBackgroundType,
  CanvasThemePreset,
  CANVAS_THEMES,
  EraserMode,
  ToolbarDockEdge,
} from "../../types/canvas";
import { getUserPreferences, saveUserPreferences } from "../../services/StorageService";

// Helper to determine if a hex color is white or near-white
const isNearWhite = (color: string): boolean => {
  const c = color.toUpperCase();
  return c === "#FFFFFF" || c === "#F8FAFC" || c === "#F1F5F9" || c === "#E2E8F0" || c === "#FBF9F5";
};

// Helper to determine if a hex color is dark charcoal or near-black
const isNearDark = (color: string): boolean => {
  const c = color.toUpperCase();
  return c === "#0F172A" || c === "#1E293B" || c === "#020617" || c === "#000000" || c === "#18181B";
};

export const useCanvasTools = () => {
  const [toolWidths, setToolWidths] = useState<Record<BrushType, number>>({
    pen: 8,
    marker: 12,
    highlighter: 24,
    eraser: 24,
    lasso: 4,
    laser: 16,
    pan: 4,
  });
  const [activeBrush, setActiveBrushState] = useState<BrushType>("pen");
  const [activeColor, setActiveColor] = useState<string>(CANVAS_THEMES.dark_slate.defaultInkColor);
  const [activeWidth, setActiveWidthState] = useState<number>(8);
  const activeWidthRef = useRef<number>(8);
  const activeBrushRef = useRef<BrushType>("pen");

  // Keep refs in sync with current state
  activeWidthRef.current = activeWidth;
  activeBrushRef.current = activeBrush;

  const [eraserMode, setEraserMode] = useState<EraserMode>("stroke");
  const [backgroundType, setBackgroundType] = useState<CanvasBackgroundType>("dot_grid");
  const [canvasTheme, setCanvasThemeState] = useState<CanvasThemePreset>("dark_slate");
  const [favoriteColors, setFavoriteColors] = useState<string[]>([
    ...CANVAS_THEMES.dark_slate.favoriteColors,
  ]);
  const [stylusOnly, setStylusOnly] = useState<boolean>(true); // S-Pen palm rejection by default
  const [toolbarDockEdge, setToolbarDockEdge] = useState<ToolbarDockEdge>("left");
  const toolbarDockSide: "left" | "right" = toolbarDockEdge === "right" ? "right" : "left";

  const handleSelectBrush = useCallback((nextBrush: BrushType) => {
    setActiveBrushState((prevBrush) => {
      if (prevBrush === nextBrush) return prevBrush;
      setToolWidths((prevWidths) => {
        const currentW = activeWidthRef.current;
        const updated = { ...prevWidths, [prevBrush]: currentW };
        const nextW = updated[nextBrush] ?? 8;
        setActiveWidthState(nextW);
        activeWidthRef.current = nextW;
        return updated;
      });
      return nextBrush;
    });
  }, []);

  const handleSetWidth = useCallback((newWidth: number) => {
    setActiveWidthState(newWidth);
    activeWidthRef.current = newWidth;
    setToolWidths((prev) => ({
      ...prev,
      [activeBrushRef.current]: newWidth,
    }));
  }, []);

  // Sincronización dinámica de tema, favoritos y mapeo de color activo
  const setCanvasTheme = useCallback((newTheme: CanvasThemePreset) => {
    setCanvasThemeState((prevTheme) => {
      const prevConfig = CANVAS_THEMES[prevTheme];
      const newConfig = CANVAS_THEMES[newTheme];

      // 1. Sincroniza favoriteColors con CANVAS_THEMES[newTheme].favoriteColors
      setFavoriteColors([...newConfig.favoriteColors]);

      // 2. Mapeo contextual del color activo para garantizar contraste sobre el nuevo fondo
      setActiveColor((currActive) => {
        const prevFavs = prevConfig.favoriteColors;
        const newFavs = newConfig.favoriteColors;
        const upperActive = currActive.toUpperCase();

        // Si coincide con el defaultInkColor del tema anterior
        if (upperActive === prevConfig.defaultInkColor.toUpperCase()) {
          return newConfig.defaultInkColor;
        }

        // Si es el acento secundario (índice 1)
        if (upperActive === prevFavs[1].toUpperCase()) {
          return newFavs[1];
        }

        // Si es el acento terciario/resaltado (índice 2)
        if (upperActive === prevFavs[2].toUpperCase()) {
          return newFavs[2];
        }

        // Regla de salvaguarda armónica si es un color personalizado claro/oscuro
        if (!newConfig.isDark && isNearWhite(currActive)) {
          return newConfig.defaultInkColor;
        }
        if (newConfig.isDark && isNearDark(currActive)) {
          return newConfig.defaultInkColor;
        }

        return currActive;
      });

      return newTheme;
    });
  }, []);

  const updateFavoriteColor = useCallback((index: number, newColor: string) => {
    setFavoriteColors((prev) => {
      const next = [...prev];
      if (index >= 0 && index < next.length) {
        next[index] = newColor;
      }
      return next;
    });
    setActiveColor(newColor);
  }, []);

  const handleToggleStylusOnly = useCallback(() => {
    setStylusOnly((prev) => !prev);
  }, []);

  const handleToggleDockSide = useCallback(() => {
    setToolbarDockEdge((prev) => {
      const next = prev === "left" ? "right" : "left";
      saveUserPreferences({ toolbar_dock_edge: next, toolbar_dock_side: next });
      return next;
    });
  }, []);

  const handleChangeDockSide = useCallback((side: "left" | "right") => {
    setToolbarDockEdge(side);
    saveUserPreferences({ toolbar_dock_edge: side, toolbar_dock_side: side });
  }, []);

  const handleChangeDockEdge = useCallback((edge: ToolbarDockEdge) => {
    setToolbarDockEdge(edge);
    saveUserPreferences({
      toolbar_dock_edge: edge,
      toolbar_dock_side: edge === "right" ? "right" : "left",
    });
  }, []);

  const canvasBackgroundColor = CANVAS_THEMES[canvasTheme].backgroundColor;
  const canvasGridColor = CANVAS_THEMES[canvasTheme].gridColor;

  return {
    activeBrush,
    setActiveBrush: handleSelectBrush,
    activeColor,
    setActiveColor,
    activeWidth,
    setActiveWidth: handleSetWidth,
    eraserMode,
    setEraserMode,
    backgroundType,
    setBackgroundType,
    canvasTheme,
    setCanvasTheme,
    canvasBackgroundColor,
    canvasGridColor,
    favoriteColors,
    setFavoriteColors,
    updateFavoriteColor,
    stylusOnly,
    setStylusOnly,
    handleToggleStylusOnly,
    toolbarDockSide,
    toolbarDockEdge,
    setToolbarDockEdge,
    handleToggleDockSide,
    handleChangeDockSide,
    handleChangeDockEdge,
  };
};
