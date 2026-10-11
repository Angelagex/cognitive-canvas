import { useState, useCallback } from "react";
import {
  BrushType,
  CanvasBackgroundType,
  CanvasThemePreset,
  CANVAS_THEMES,
  EraserMode,
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
  const [activeBrush, setActiveBrushState] = useState<BrushType>("pen");
  const [activeColor, setActiveColor] = useState<string>("#38BDF8");
  const [activeWidth, setActiveWidth] = useState<number>(4.5);
  const [eraserMode, setEraserMode] = useState<EraserMode>("stroke");
  const [backgroundType, setBackgroundType] = useState<CanvasBackgroundType>("dot_grid");
  const [canvasTheme, setCanvasThemeState] = useState<CanvasThemePreset>("dark_slate");
  const [favoriteColors, setFavoriteColors] = useState<string[]>([
    "#38BDF8", // Electric Blue
    "#F43F5E", // Rose Carmine
    "#10B981", // Emerald Green
  ]);
  const [stylusOnly, setStylusOnly] = useState<boolean>(true); // S-Pen palm rejection by default
  const [toolbarDockSide, setToolbarDockSide] = useState<"left" | "right">("left");

  // Ballpoint Pen (bolígrafo uniforme) standard size: 4.5 dp
  const handleSelectBrush = useCallback((brush: BrushType) => {
    setActiveBrushState(brush);
    if (brush === "pen") {
      setActiveWidth(4.5);
    } else if (brush === "highlighter") {
      setActiveWidth(24.0);
    }
  }, []);

  // Step 1: Harmonic inversion rule when changing themes
  const setCanvasTheme = useCallback((newTheme: CanvasThemePreset) => {
    setCanvasThemeState((prevTheme) => {
      const prevConfig = CANVAS_THEMES[prevTheme];
      const newConfig = CANVAS_THEMES[newTheme];

      // If transitioning between dark and light substrates
      if (prevConfig.isDark !== newConfig.isDark) {
        if (!newConfig.isDark) {
          // Transitioned from DARK -> LIGHT: Invert white/near-white to dark charcoal
          setActiveColor((prevColor) => {
            if (isNearWhite(prevColor)) {
              return newConfig.defaultInkColor; // #1E293B or #0F172A
            }
            return prevColor;
          });
          setFavoriteColors((prevFavs) =>
            prevFavs.map((c) => (isNearWhite(c) ? newConfig.defaultInkColor : c))
          );
        } else {
          // Transitioned from LIGHT -> DARK: Invert dark charcoal/near-black to crisp white
          setActiveColor((prevColor) => {
            if (isNearDark(prevColor)) {
              return newConfig.defaultInkColor; // #F8FAFC
            }
            return prevColor;
          });
          setFavoriteColors((prevFavs) =>
            prevFavs.map((c) => (isNearDark(c) ? newConfig.defaultInkColor : c))
          );
        }
      }

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
    setToolbarDockSide((prev) => {
      const next = prev === "left" ? "right" : "left";
      saveUserPreferences({ toolbar_dock_side: next });
      return next;
    });
  }, []);

  const handleChangeDockSide = useCallback((side: "left" | "right") => {
    setToolbarDockSide(side);
    saveUserPreferences({ toolbar_dock_side: side });
  }, []);

  const canvasBackgroundColor = CANVAS_THEMES[canvasTheme].backgroundColor;

  return {
    activeBrush,
    setActiveBrush: handleSelectBrush,
    activeColor,
    setActiveColor,
    activeWidth,
    setActiveWidth,
    eraserMode,
    setEraserMode,
    backgroundType,
    setBackgroundType,
    canvasTheme,
    setCanvasTheme,
    canvasBackgroundColor,
    favoriteColors,
    setFavoriteColors,
    updateFavoriteColor,
    stylusOnly,
    setStylusOnly,
    handleToggleStylusOnly,
    toolbarDockSide,
    setToolbarDockSide,
    handleToggleDockSide,
    handleChangeDockSide,
  };
};
