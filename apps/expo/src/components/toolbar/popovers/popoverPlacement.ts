import { ToolbarDockEdge } from "../../../types/canvas";

export interface AnchorRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PopoverSize {
  width: number;
  height: number;
}

export interface ScreenDimensions {
  width: number;
  height: number;
}

export const POPOVER_SIZES = {
  strokeWidth: { width: 200, height: 330 },
  paperTemplate: { width: 200, height: 420 },
  colorPicker: { width: 200, height: 380 },
  eraserMode: { width: 170, height: 48 },
};

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function calculatePopoverPosition(
  anchorRect: AnchorRect,
  popoverSize: PopoverSize,
  dockEdge: ToolbarDockEdge,
  screenDimensions: ScreenDimensions
): { left: number; top: number } {
  const { width: popoverWidth, height: popoverHeight } = popoverSize;
  const { width: screenWidth, height: screenHeight } = screenDimensions;

  let left = 0;
  let top = 0;

  switch (dockEdge) {
    case "left":
      left = anchorRect.x + anchorRect.width + 10;
      top = clamp(
        anchorRect.y + (anchorRect.height - popoverHeight) / 2,
        60,
        screenHeight - popoverHeight - 20
      );
      break;
    case "right":
      left = anchorRect.x - popoverWidth - 10;
      top = clamp(
        anchorRect.y + (anchorRect.height - popoverHeight) / 2,
        60,
        screenHeight - popoverHeight - 20
      );
      break;
    case "top":
      top = anchorRect.y + anchorRect.height + 10;
      left = clamp(
        anchorRect.x + (anchorRect.width - popoverWidth) / 2,
        16,
        screenWidth - popoverWidth - 16
      );
      break;
    case "bottom":
      top = anchorRect.y - popoverHeight - 10;
      left = clamp(
        anchorRect.x + (anchorRect.width - popoverWidth) / 2,
        16,
        screenWidth - popoverWidth - 16
      );
      break;
  }

  return { left, top };
}
