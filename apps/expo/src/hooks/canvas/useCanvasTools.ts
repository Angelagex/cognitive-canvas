import { useState, useCallback } from "react";
import { BrushType, CanvasBackgroundType, EraserMode } from "../../types/canvas";
import { getUserPreferences, saveUserPreferences } from "../../services/StorageService";

export const useCanvasTools = () => {
  const [activeBrush, setActiveBrush] = useState<BrushType>("pen");
  const [activeColor, setActiveColor] = useState<string>("#38BDF8");
  const [activeWidth, setActiveWidth] = useState<number>(18);
  const [eraserMode, setEraserMode] = useState<EraserMode>("stroke");
  const [backgroundType, setBackgroundType] = useState<CanvasBackgroundType>("dot_grid");
  const [favoriteColors, setFavoriteColors] = useState<string[]>([
    "#38BDF8", // Electric Blue
    "#F43F5E", // Rose Carmine
    "#10B981", // Emerald Green
  ]);
  const [stylusOnly, setStylusOnly] = useState<boolean>(true); // S-Pen palm rejection by default
  const [toolbarDockSide, setToolbarDockSide] = useState<"left" | "right">("left");

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

  return {
    activeBrush,
    setActiveBrush,
    activeColor,
    setActiveColor,
    activeWidth,
    setActiveWidth,
    eraserMode,
    setEraserMode,
    backgroundType,
    setBackgroundType,
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
