import { PixelRatio, Dimensions } from "react-native";
import { RawInkStroke } from "@cognitive-canvas/core";

export interface WorldBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface RenderWorldBounds {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

/**
 * Computes the bounding box of a single RawInkStroke from either `points` or `flatPoints`.
 */
export function computeStrokeWorldBox(stroke: RawInkStroke): WorldBox | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  if (stroke.points && stroke.points.length > 0) {
    for (let i = 0; i < stroke.points.length; i++) {
      const pt = stroke.points[i];
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.y > maxY) maxY = pt.y;
    }
  } else if (stroke.flatPoints && stroke.flatPoints.length >= 2) {
    const fp = stroke.flatPoints;
    for (let i = 0; i < fp.length; i += 4) {
      const x = fp[i];
      const y = fp[i + 1];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null;
  return { minX, minY, maxX, maxY };
}

/**
 * Computes the exact `renderWorldBounds` (in World DP) corresponding to the full
 * `[0..viewW, 0..viewH]` bitmap produced by `OffscreenDocumentRenderer.kt` when `fullDocument = true`.
 * Accounts for the 40f padding, aspect-ratio centering letterbox offsets (`offsetX`, `offsetY`),
 * and Android display pixel density (`stroke.inputs` in px vs `getStrokeBounds` in dp).
 */
export function computeRenderWorldBounds(
  strokes: RawInkStroke[],
  bitmapWidthPx?: number,
  bitmapHeightPx?: number
): RenderWorldBounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const stroke of strokes) {
    const box = computeStrokeWorldBox(stroke);
    if (!box) continue;
    if (box.minX < minX) minX = box.minX;
    if (box.maxX > maxX) maxX = box.maxX;
    if (box.minY < minY) minY = box.minY;
    if (box.maxY > maxY) maxY = box.maxY;
  }

  if (!Number.isFinite(minX) || minX >= maxX || minY >= maxY) {
    return { minX: 0, minY: 0, width: 1920, height: 1080 };
  }

  const padding = 40;
  const contentLeft = minX - padding;
  const contentTop = minY - padding;
  const contentRight = maxX + padding;
  const contentBottom = maxY + padding;
  const contentW = Math.max(50, contentRight - contentLeft);
  const contentH = Math.max(50, contentBottom - contentTop);

  const density = PixelRatio.get() || 1;
  const win = Dimensions.get("window");
  const viewW =
    bitmapWidthPx && bitmapWidthPx > 0
      ? bitmapWidthPx
      : Math.round((win.width || 1280) * density);
  const viewH =
    bitmapHeightPx && bitmapHeightPx > 0
      ? bitmapHeightPx
      : Math.round((win.height || 800) * density);

  const calculatedFit = Math.min(viewW / contentW, viewH / contentH);
  const offsetX = (viewW - contentW * calculatedFit) / 2;
  const offsetY = (viewH - contentH * calculatedFit) / 2;

  const worldMinX = (contentLeft - offsetX / calculatedFit) / density;
  const worldMinY = (contentTop - offsetY / calculatedFit) / density;
  const worldWidth = viewW / (calculatedFit * density);
  const worldHeight = viewH / (calculatedFit * density);

  return {
    minX: worldMinX,
    minY: worldMinY,
    width: Math.max(50, worldWidth),
    height: Math.max(50, worldHeight),
  };
}

/**
 * Uniform 2D Spatial Hash Grid for O(1) cell lookup of local vector ink strokes.
 * Used after Vision-First Gemini compilation to map normalized `box_2d` regions
 * back to local stroke IDs without sending `flatPoints` over the network.
 */
export class SpatialHashGrid {
  private readonly cellSize: number;
  private readonly buckets = new Map<string, Set<RawInkStroke>>();
  private readonly boundsMap = new Map<string, WorldBox>();

  constructor(cellSize = 64) {
    this.cellSize = cellSize;
  }

  insert(stroke: RawInkStroke, box?: WorldBox | null): void {
    const resolvedBox = box ?? computeStrokeWorldBox(stroke);
    if (!resolvedBox) return;
    this.boundsMap.set(stroke.id, resolvedBox);

    const startCellX = Math.floor(resolvedBox.minX / this.cellSize);
    const endCellX = Math.floor(resolvedBox.maxX / this.cellSize);
    const startCellY = Math.floor(resolvedBox.minY / this.cellSize);
    const endCellY = Math.floor(resolvedBox.maxY / this.cellSize);

    for (let cx = startCellX; cx <= endCellX; cx++) {
      for (let cy = startCellY; cy <= endCellY; cy++) {
        const key = `${cx}:${cy}`;
        let set = this.buckets.get(key);
        if (!set) {
          set = new Set();
          this.buckets.set(key, set);
        }
        set.add(stroke);
      }
    }
  }

  query(region: WorldBox): RawInkStroke[] {
    const startCellX = Math.floor(region.minX / this.cellSize);
    const endCellX = Math.floor(region.maxX / this.cellSize);
    const startCellY = Math.floor(region.minY / this.cellSize);
    const endCellY = Math.floor(region.maxY / this.cellSize);

    const candidates = new Set<RawInkStroke>();
    for (let cx = startCellX; cx <= endCellX; cx++) {
      for (let cy = startCellY; cy <= endCellY; cy++) {
        const cell = this.buckets.get(`${cx}:${cy}`);
        if (cell) {
          cell.forEach((s) => candidates.add(s));
        }
      }
    }

    const matches: RawInkStroke[] = [];
    candidates.forEach((stroke) => {
      const b = this.boundsMap.get(stroke.id);
      if (!b) return;
      const intersects =
        b.maxX >= region.minX &&
        b.minX <= region.maxX &&
        b.maxY >= region.minY &&
        b.minY <= region.maxY;
      if (intersects) {
        matches.push(stroke);
      }
    });

    return matches;
  }
}

