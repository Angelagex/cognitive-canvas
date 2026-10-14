import { useState, useCallback, useRef, useEffect } from "react";
import {
  BrushType,
  CanvasBackgroundType,
  CanvasThemePreset,
  CANVAS_THEMES,
  DEFAULT_TOOL_WIDTHS,
  DEFAULT_THEME_PALETTES,
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
  const [toolWidths, setToolWidths] = useState<Record<BrushType, number>>(DEFAULT_TOOL_WIDTHS);
  const [activeBrush, setActiveBrushState] = useState<BrushType>("pen");
  const [activeColor, setActiveColor] = useState<string>(CANVAS_THEMES.dark_slate.defaultInkColor);
  const [activeWidth, setActiveWidthState] = useState<number>(DEFAULT_TOOL_WIDTHS.pen);
  const activeWidthRef = useRef<number>(DEFAULT_TOOL_WIDTHS.pen);
  const activeBrushRef = useRef<BrushType>("pen");

  const [eraserMode, setEraserMode] = useState<EraserMode>("stroke");
  const [backgroundType, setBackgroundType] = useState<CanvasBackgroundType>("dot_grid");
  const [canvasTheme, setCanvasThemeState] = useState<CanvasThemePreset>("dark_slate");
  const canvasThemeRef = useRef<CanvasThemePreset>("dark_slate");

  const [themePalettes, setThemePalettes] =
    useState<Record<CanvasThemePreset, string[]>>(DEFAULT_THEME_PALETTES);
  const themePalettesRef =
    useRef<Record<CanvasThemePreset, string[]>>(DEFAULT_THEME_PALETTES);

  const [favoriteColors, setFavoriteColors] = useState<string[]>([
    ...DEFAULT_THEME_PALETTES.dark_slate,
  ]);
  const [stylusOnly, setStylusOnly] = useState<boolean>(true); // S-Pen palm rejection by default
  const [toolbarDockEdge, setToolbarDockEdge] = useState<ToolbarDockEdge>("left");
  const toolbarDockSide: "left" | "right" = toolbarDockEdge === "right" ? "right" : "left";

  // Keep refs in sync with current state
  activeWidthRef.current = activeWidth;
  activeBrushRef.current = activeBrush;
  canvasThemeRef.current = canvasTheme;
  themePalettesRef.current = themePalettes;

  // Carga inicial asíncrona de preferencias de usuario
  useEffect(() => {
    let isMounted = true;
    getUserPreferences().then((prefs) => {
      if (!isMounted) return;
      if (prefs.toolbar_dock_edge) {
        setToolbarDockEdge(prefs.toolbar_dock_edge);
      }
      if (prefs.tool_widths) {
        setToolWidths(prefs.tool_widths);
        const currentBrush = activeBrushRef.current;
        const initialWidth = prefs.tool_widths[currentBrush] ?? DEFAULT_TOOL_WIDTHS[currentBrush] ?? 8;
        setActiveWidthState(initialWidth);
        activeWidthRef.current = initialWidth;
      }
      if (prefs.theme_palettes) {
        setThemePalettes(prefs.theme_palettes);
        const currentTheme = canvasThemeRef.current;
        const savedPalette = prefs.theme_palettes[currentTheme];
        if (savedPalette && savedPalette.length > 0) {
          setFavoriteColors([...savedPalette]);
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSelectBrush = useCallback((nextBrush: BrushType) => {
    setActiveBrushState((prevBrush) => {
      if (prevBrush === nextBrush) return prevBrush;
      setToolWidths((prevWidths) => {
        const currentW = activeWidthRef.current;
        const updated = { ...prevWidths, [prevBrush]: currentW };
        const nextW = updated[nextBrush] ?? DEFAULT_TOOL_WIDTHS[nextBrush] ?? 8;
        setActiveWidthState(nextW);
        activeWidthRef.current = nextW;
        saveUserPreferences({ tool_widths: updated });
        return updated;
      });
      return nextBrush;
    });
  }, []);

  const handleSetWidth = useCallback((newWidth: number) => {
    setActiveWidthState(newWidth);
    activeWidthRef.current = newWidth;
    setToolWidths((prev) => {
      const updated = {
        ...prev,
        [activeBrushRef.current]: newWidth,
      };
      saveUserPreferences({ tool_widths: updated });
      return updated;
    });
  }, []);

  // Sincronización dinámica de tema, favoritos guardados y mapeo de color activo
  const setCanvasTheme = useCallback((newTheme: CanvasThemePreset) => {
    setCanvasThemeState((prevTheme) => {
      const prevConfig = CANVAS_THEMES[prevTheme];
      const newConfig = CANVAS_THEMES[newTheme];

      // 1. Obtener la paleta guardada para el nuevo tema desde themePalettes
      const newPalette = themePalettesRef.current[newTheme] || [...newConfig.favoriteColors];
      setFavoriteColors([...newPalette]);

      // 2. Mapeo contextual del color activo para garantizar contraste y legibilidad
      setActiveColor((currActive) => {
        const prevFavs = themePalettesRef.current[prevTheme] || prevConfig.favoriteColors;
        const upperActive = currActive.toUpperCase();

        // Si coincide con el color principal del tema anterior
        if (prevFavs[0] && upperActive === prevFavs[0].toUpperCase()) {
          return newPalette[0] || newConfig.defaultInkColor;
        }

        // Si coincide con el acento secundario (índice 1)
        if (prevFavs[1] && upperActive === prevFavs[1].toUpperCase()) {
          return newPalette[1] || newPalette[0] || newConfig.defaultInkColor;
        }

        // Si coincide con el acento terciario/resaltado (índice 2)
        if (prevFavs[2] && upperActive === prevFavs[2].toUpperCase()) {
          return newPalette[2] || newPalette[0] || newConfig.defaultInkColor;
        }

        // Regla de salvaguarda armónica si es un color personalizado claro/oscuro
        if (!newConfig.isDark && isNearWhite(currActive)) {
          return newPalette[0] || newConfig.defaultInkColor;
        }
        if (newConfig.isDark && isNearDark(currActive)) {
          return newPalette[0] || newConfig.defaultInkColor;
        }

        // Si ya coincide con alguno de los favoritos de la nueva paleta, conservarlo
        const matchesNewPalette = newPalette.some((c) => c.toUpperCase() === upperActive);
        if (matchesNewPalette) {
          return currActive;
        }

        // Si no, aplicar el color principal para asegurar legibilidad
        return newPalette[0] || newConfig.defaultInkColor;
      });

      return newTheme;
    });
  }, []);

  const updateFavoriteColor = useCallback((index: number, newColor: string) => {
    const currentTheme = canvasThemeRef.current;
    setFavoriteColors((prev) => {
      const next = [...prev];
      if (index >= 0 && index < next.length) {
        next[index] = newColor;
      }
      setThemePalettes((prevPalettes) => {
        const updatedPalettes = {
          ...prevPalettes,
          [currentTheme]: next,
        };
        saveUserPreferences({ theme_palettes: updatedPalettes });
        return updatedPalettes;
      });
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
