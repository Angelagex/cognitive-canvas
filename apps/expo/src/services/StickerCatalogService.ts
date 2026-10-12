import vectorStickersRaw from "../../assets/vector_stickers.json";
import type { VectorStickerCatalog, VectorSticker, VectorStickerCategory } from "@cognitive-canvas/core";

export const STICKER_CATALOG = vectorStickersRaw as unknown as VectorStickerCatalog;

/**
 * Obtiene un sticker por su ID único (ej. "icon_gear")
 */
export function getStickerById(id: string): VectorSticker | undefined {
  for (const category of STICKER_CATALOG.categories) {
    const found = category.stickers.find((s) => s.id === id);
    if (found) return found;
  }
  return undefined;
}

/**
 * Retorna todas las categorías con sus respectivos stickers
 */
export function getAllStickerCategories(): VectorStickerCategory[] {
  return STICKER_CATALOG.categories;
}
