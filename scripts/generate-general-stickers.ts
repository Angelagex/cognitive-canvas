#!/usr/bin/env tsx

/**
 * Script de compilación de la biblioteca extendida de stickers vectoriales
 * Fuente: @sketchyicons/react-native (dist/esm/icons)
 * Destino: apps/expo/src/assets/stickers/general_library_stickers.json
 */

import fs from "node:fs";
import path from "node:path";
import { svgPathProperties } from "svg-path-properties";

const ROOT_DIR = process.cwd();
const ICONS_DIR = path.join(
  ROOT_DIR,
  "node_modules/@sketchyicons/react-native/dist/esm/icons"
);
const LUCIDE_CATEGORIES_PATH = path.join(ROOT_DIR, "scripts/lucide-categories.json");

interface VectorStickerPoint {
  rx: number;
  ry: number;
  p: number;
}

interface VectorStickerStroke {
  relative_width: number;
  points: VectorStickerPoint[];
}

interface VectorSticker {
  id: string;
  name: string;
  default_width: number;
  default_height: number;
  strokes: VectorStickerStroke[];
}

interface VectorStickerCategory {
  id: string;
  name: string;
  stickers: VectorSticker[];
}

interface VectorStickerCatalog {
  version: string;
  categories: VectorStickerCategory[];
}

// Categorías nativas estructuradas para la biblioteca general
const GENERAL_CATEGORIES_CONFIG = [
  {
    id: "DEVICES",
    name: "Dispositivos",
    keys: ["devices", "connectivity"],
  },
  {
    id: "INTERFACE",
    name: "Interfaz",
    keys: ["layout", "cursors", "navigation", "accessibility", "notifications"],
  },
  {
    id: "PEOPLE",
    name: "Personas",
    keys: ["people", "account"],
  },
  {
    id: "SYMBOLS",
    name: "Símbolos",
    keys: ["shapes", "emoji"],
  },
  {
    id: "COMMUNICATION",
    name: "Comunicación",
    keys: ["communication", "mail", "social"],
  },
  {
    id: "MULTIMEDIA",
    name: "Multimedia",
    keys: ["multimedia", "photography"],
  },
  {
    id: "FILES",
    name: "Archivos y Documentos",
    keys: ["files"],
  },
  {
    id: "DEVELOPMENT",
    name: "Desarrollo",
    keys: ["development"],
  },
  {
    id: "FINANCE",
    name: "Finanzas y Comercio",
    keys: ["finance", "shopping"],
  },
  {
    id: "NATURE",
    name: "Naturaleza y Clima",
    keys: ["nature", "animals", "seasons", "weather", "sustainability"],
  },
  {
    id: "TRAVEL",
    name: "Transporte y Viajes",
    keys: ["transportation", "travel"],
  },
  {
    id: "SCIENCE",
    name: "Ciencia y Salud",
    keys: ["science", "medical", "math", "charts"],
  },
  {
    id: "OBJECTS",
    name: "Objetos",
    keys: ["tools", "design", "food-beverage", "home", "buildings", "sports", "gaming", "time", "text"],
  },
];

function extractPathsFromIcon(iconFileName: string): string[] | null {
  const filePath = path.join(ICONS_DIR, `${iconFileName}.js`);
  if (!fs.existsSync(filePath)) return null;

  const content = fs.readFileSync(filePath, "utf8");
  const dMatches = Array.from(content.matchAll(/d:\s*'([^']+)'/g));
  if (!dMatches || dMatches.length === 0) return null;

  return dMatches.map((m) => m[1]);
}

function sampleStrokePoints(dString: string): VectorStickerStroke[] {
  const subPaths = dString.split(/(?=M)/).filter((p) => p.trim().length > 0);
  const strokeSegments: VectorStickerStroke[] = [];

  for (const subD of subPaths) {
    try {
      const properties = new svgPathProperties(subD);
      const totalLength = properties.getTotalLength();
      if (totalLength < 0.1) continue;

      const numPoints = totalLength < 4 ? 8 : Math.max(12, Math.min(26, Math.round(totalLength * 1.0)));
      const points: VectorStickerPoint[] = [];

      for (let i = 0; i < numPoints; i++) {
        const lengthAlong = (i / (numPoints - 1)) * totalLength;
        const pt = properties.getPointAtLength(lengthAlong);

        const rx = Math.max(0, Math.min(100, Math.round(((pt.x / 24) * 100) * 10) / 10));
        const ry = Math.max(0, Math.min(100, Math.round(((pt.y / 24) * 100) * 10) / 10));
        const p = 0.8;

        points.push({ rx, ry, p });
      }

      if (points.length >= 2) {
        strokeSegments.push({
          relative_width: 2.2,
          points,
        });
      }
    } catch {}
  }

  return strokeSegments;
}

function formatIconName(rawName: string): string {
  return rawName
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function generateGeneralStickersCatalog(): void {
  console.log("🚀 Generando catálogo completo de biblioteca general (incluyendo todos los iconos)...");

  if (!fs.existsSync(ICONS_DIR)) {
    throw new Error(`Directorio de iconos no encontrado: ${ICONS_DIR}`);
  }

  // 1. Cargar mapeo de categorías nativas de Lucide/Sketchy
  let lucideCatsMap: Record<string, string[]> = {};
  if (fs.existsSync(LUCIDE_CATEGORIES_PATH)) {
    lucideCatsMap = JSON.parse(fs.readFileSync(LUCIDE_CATEGORIES_PATH, "utf8"));
  }

  // 2. Inicializar catálogo general
  const generalCatalog: VectorStickerCatalog = {
    version: "1.0.0",
    categories: GENERAL_CATEGORIES_CONFIG.map((cfg) => ({
      id: cfg.id,
      name: cfg.name,
      stickers: [],
    })),
  };

  const categoryMap = new Map<string, VectorStickerCategory>();
  for (const cat of generalCatalog.categories) {
    categoryMap.set(cat.id, cat);
  }

  const allIconFiles = fs
    .readdirSync(ICONS_DIR)
    .filter((f) => f.endsWith(".js"))
    .map((f) => f.replace(".js", ""))
    .sort();

  const processedIcons = new Set<string>();
  let totalAdded = 0;

  for (const iconName of allIconFiles) {
    const stickerId = `icon_${iconName.replace(/-/g, "_")}`;

    // Descartar solo si ya fue procesado en otra categoría del catálogo general
    if (processedIcons.has(iconName)) {
      continue;
    }

    const paths = extractPathsFromIcon(iconName);
    if (!paths || paths.length === 0) continue;

    const allStrokes: VectorStickerStroke[] = [];
    for (const d of paths) {
      allStrokes.push(...sampleStrokePoints(d));
    }

    if (allStrokes.length === 0) continue;

    // Determinar categoría destino sin duplicaciones
    const iconNativeCats = lucideCatsMap[iconName] || [];
    let targetCatId = "OBJECTS";

    for (const cfg of GENERAL_CATEGORIES_CONFIG) {
      if (cfg.id === "OBJECTS") continue;
      if (cfg.keys.some((k) => iconNativeCats.includes(k))) {
        targetCatId = cfg.id;
        break;
      }
    }

    const targetCategory = categoryMap.get(targetCatId) || categoryMap.get("OBJECTS")!;
    targetCategory.stickers.push({
      id: stickerId,
      name: formatIconName(iconName),
      default_width: 64.0,
      default_height: 64.0,
      strokes: allStrokes,
    });

    processedIcons.add(iconName);
    totalAdded++;
  }

  // 4. Escribir resultados
  const outputJson = JSON.stringify(generalCatalog);

  const targetDirs = [
    path.join(ROOT_DIR, "apps/expo/src/assets/stickers"),
    path.join(ROOT_DIR, "apps/expo/assets"),
    path.join(ROOT_DIR, "assets"),
  ];

  for (const dir of targetDirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const outFile = path.join(dir, "general_library_stickers.json");
    fs.writeFileSync(outFile, outputJson, "utf8");
    console.log(`📁 Catálogo general guardado en: ${outFile}`);
  }

  console.log(`✅ Catálogo general generado con éxito: ${totalAdded} stickers en ${generalCatalog.categories.length} categorías.`);
}

// Ejecutar si es invocado directamente
if (process.argv[1] && process.argv[1].endsWith("generate-general-stickers.ts")) {
  generateGeneralStickersCatalog();
}
