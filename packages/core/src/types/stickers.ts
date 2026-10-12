/**
 * Tipos formales para el Catálogo de Stickers Vectoriales Precompilados
 * Esquema canónico para assets/vector_stickers.json
 */

export interface VectorStickerPoint {
  /** Coordenada X normalizada (0.0 a 100.0) */
  rx: number;
  /** Coordenada Y normalizada (0.0 a 100.0) */
  ry: number;
  /** Presión ergonómica del trazo (0.0 a 1.0) */
  p: number;
}

export interface VectorStickerStroke {
  /** Ancho relativo del trazo */
  relative_width: number;
  /** Puntos muestreados a lo largo del path */
  points: VectorStickerPoint[];
}

export interface VectorSticker {
  /** Identificador único del icono (ej. "icon_gear") */
  id: string;
  /** Nombre semántico legible en español */
  name: string;
  /** Ancho estándar en World DP */
  default_width: number;
  /** Alto estándar en World DP */
  default_height: number;
  /** Trazos constitutivos del icono */
  strokes: VectorStickerStroke[];
}

export interface VectorStickerCategory {
  /** Identificador de la categoría cognitiva (ej. "CAUSAL_MECHANISMS") */
  id: string;
  /** Nombre en español de la categoría */
  name: string;
  /** Lista de stickers curados en esta categoría */
  stickers: VectorSticker[];
}

export interface VectorStickerCatalog {
  /** Versión del esquema */
  version: string;
  /** Categorías cognitivas que organizan los stickers */
  categories: VectorStickerCategory[];
}
