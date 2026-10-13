import React from "react";
import {
  Pen,
  Highlighter,
  Eraser,
  Lasso,
  Sparkles,
  Hand,
} from "@sketchyicons/react-native";
import { BrushType } from "../../types/canvas";

interface ToolbarToolIconProps {
  id: BrushType;
  isActive: boolean;
}

export const ToolbarToolIcon: React.FC<ToolbarToolIconProps> = ({ id, isActive }) => {
  const iconColor = isActive ? "#38BDF8" : "#94A3B8";
  const size = 22;

  switch (id) {
    case "pen":
      return <Pen size={size} color={iconColor} strokeWidth={2.0} />;
    case "highlighter":
      return <Highlighter size={size} color={iconColor} strokeWidth={2.0} />;
    case "eraser":
      return <Eraser size={size} color={iconColor} strokeWidth={2.0} />;
    case "lasso":
      return <Lasso size={size} color={iconColor} strokeWidth={2.0} />;
    case "laser":
      return <Sparkles size={size} color={iconColor} strokeWidth={2.0} />;
    case "pan":
      return <Hand size={size} color={iconColor} strokeWidth={2.0} />;
    default:
      return null;
  }
};
