export interface AnchorRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PopoverDimensions {
  width: number;
  height: number;
}

export type PopoverSize = PopoverDimensions;

// Alturas reales medidas de los componentes montados
export const POPOVER_SIZES = {
  eraser: { width: 170, height: 42 },
  color: { width: 210, height: 188 }, // Altura real exacta de favoritos + grid de presets
  stroke: { width: 210, height: 360 }, // 6 elementos de grosor x 42dp + headers
  template: { width: 210, height: 384 }, // 4 tipos de papel + 4 temas de papel + headers
  // Alias de compatibilidad
  eraserMode: { width: 170, height: 42 },
  colorPicker: { width: 210, height: 188 },
  strokeWidth: { width: 210, height: 360 },
  paperTemplate: { width: 210, height: 384 },
};

export const STANDARD_GAP = 8; // Distancia estándar idéntica para todos los popovers

export function computePopoverPosition(
  anchor: AnchorRect,
  popover: PopoverDimensions,
  edge: "left" | "right" | "top" | "bottom",
  screenWidth: number,
  screenHeight: number,
  gap: number = STANDARD_GAP
): { left: number; top: number } {
  let left = 0;
  let top = 0;

  switch (edge) {
    case "left":
      left = anchor.x + anchor.width + gap;
      top = anchor.y + (anchor.height - popover.height) / 2;
      break;

    case "right":
      left = anchor.x - popover.width - gap;
      top = anchor.y + (anchor.height - popover.height) / 2;
      break;

    case "top":
      top = anchor.y + anchor.height + gap;
      left = anchor.x + (anchor.width - popover.width) / 2;
      break;

    case "bottom":
      // Nace exactamente arriba del botón disparador, separado por STANDARD_GAP
      top = anchor.y - popover.height - gap;
      left = anchor.x + (anchor.width - popover.width) / 2;
      break;
  }

  // Clamping seguro contra bordes físicos de pantalla
  const safeLeft = Math.max(12, Math.min(screenWidth - popover.width - 12, left));
  const safeTop = Math.max(12, Math.min(screenHeight - popover.height - 12, top));

  return { left: safeLeft, top: safeTop };
}

export const calculatePopoverPosition = (
  anchorRect: AnchorRect,
  popoverSize: PopoverDimensions,
  dockEdge: "left" | "right" | "top" | "bottom",
  screenDimensions: { width: number; height: number },
  gap: number = STANDARD_GAP
): { left: number; top: number } =>
  computePopoverPosition(
    anchorRect,
    popoverSize,
    dockEdge,
    screenDimensions.width,
    screenDimensions.height,
    gap
  );
