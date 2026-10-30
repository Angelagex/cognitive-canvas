import vectorStickersRaw from "../assets/stickers/vector_stickers.json";
import generalStickersRaw from "../assets/stickers/general_library_stickers.json";
import type {
  VectorStickerCatalog,
  VectorSticker,
  VectorStickerCategory,
} from "@cognitive-canvas/core";

export type StickerCategoryTab = "cognitive" | "general";

export const COGNITIVE_CATALOG = vectorStickersRaw as unknown as VectorStickerCatalog;
export const GENERAL_CATALOG = generalStickersRaw as unknown as VectorStickerCatalog;

// Alias para compatibilidad regresiva
export const STICKER_CATALOG = COGNITIVE_CATALOG;

/**
 * Obtiene un sticker por su ID único (ej. "icon_gear") buscando primero
 * en el catálogo cognitivo y luego en la biblioteca general extendida.
 */
export function getStickerById(id: string): VectorSticker | undefined {
  for (const category of COGNITIVE_CATALOG.categories) {
    const found = category.stickers.find((s) => s.id === id);
    if (found) return found;
  }
  for (const category of GENERAL_CATALOG.categories) {
    const found = category.stickers.find((s) => s.id === id);
    if (found) return found;
  }
  return undefined;
}

/**
 * Retorna las categorías asociadas a la pestaña activa (cognitiva o general).
 */
export function getStickerCategories(tab: StickerCategoryTab = "cognitive"): VectorStickerCategory[] {
  return tab === "cognitive" ? COGNITIVE_CATALOG.categories : GENERAL_CATALOG.categories;
}

/**
 * Retorna todas las categorías con sus respectivos stickers (por defecto cognitivas).
 */
export function getAllStickerCategories(tab: StickerCategoryTab = "cognitive"): VectorStickerCategory[] {
  return getStickerCategories(tab);
}
