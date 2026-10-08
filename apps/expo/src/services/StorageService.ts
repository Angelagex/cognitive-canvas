import * as FileSystem from "expo-file-system";
import {
  CognitiveMapDocument,
  RawInkStroke,
  VisualASTLayer,
  CompiledCognitiveLayer,
} from "@cognitive-canvas/core";
import { PlacedAttribute } from "../types/canvas";

export interface ExtendedDocumentMetadata {
  title: string;
  created_at: number;
  updated_at: number;
  vault_id?: string;
  canvas_scale?: number;
  canvas_translate_x?: number;
  canvas_translate_y?: number;
  placed_attributes?: PlacedAttribute[];
}

export interface ExtendedCognitiveMapDocument extends Omit<CognitiveMapDocument, "metadata"> {
  metadata: ExtendedDocumentMetadata;
}

export interface MapDocumentSummary {
  map_id: string;
  title: string;
  created_at: number;
  updated_at: number;
  stroke_count: number;
  entity_count: number;
  is_compiled: boolean;
}

const MAPS_DIRECTORY = `${FileSystem.documentDirectory}maps/`;
const LAST_MAP_KEY_FILE = `${FileSystem.documentDirectory}last_active_map.txt`;

/**
 * Ensures the maps directory exists in Expo FileSystem
 */
async function ensureDirectoryExists(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(MAPS_DIRECTORY);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(MAPS_DIRECTORY, { intermediates: true });
  }
}

/**
 * Saves a 3-layer .cmn Cognitive Map Document to local disk storage
 */
export async function saveDocument(doc: ExtendedCognitiveMapDocument): Promise<void> {
  try {
    await ensureDirectoryExists();
    const filePath = `${MAPS_DIRECTORY}${doc.map_id}.cmn`;
    const content = JSON.stringify(doc, null, 2);
    await FileSystem.writeAsStringAsync(filePath, content, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    await FileSystem.writeAsStringAsync(LAST_MAP_KEY_FILE, doc.map_id, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    console.log(`[StorageService] 💾 Document saved: ${doc.map_id} (${doc.metadata.title})`);
  } catch (err) {
    console.error("[StorageService] Failed to save document:", err);
    throw err;
  }
}

/**
 * Loads a .cmn Cognitive Map Document by map ID
 */
export async function loadDocument(mapId: string): Promise<ExtendedCognitiveMapDocument | null> {
  try {
    const filePath = `${MAPS_DIRECTORY}${mapId}.cmn`;
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (!fileInfo.exists) {
      return null;
    }
    const content = await FileSystem.readAsStringAsync(filePath, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    const doc = JSON.parse(content) as ExtendedCognitiveMapDocument;
    console.log(`[StorageService] 📖 Document loaded: ${doc.map_id} (${doc.metadata.title})`);
    return doc;
  } catch (err) {
    console.error(`[StorageService] Failed to load document ${mapId}:`, err);
    return null;
  }
}

/**
 * Lists all saved .cmn maps in the local vault with summary metadata
 */
export async function listDocuments(): Promise<MapDocumentSummary[]> {
  try {
    await ensureDirectoryExists();
    const files = await FileSystem.readDirectoryAsync(MAPS_DIRECTORY);
    const cmnFiles = files.filter((f) => f.endsWith(".cmn"));

    const summaries: MapDocumentSummary[] = [];
    for (const fileName of cmnFiles) {
      try {
        const filePath = `${MAPS_DIRECTORY}${fileName}`;
        const content = await FileSystem.readAsStringAsync(filePath, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        const doc = JSON.parse(content) as ExtendedCognitiveMapDocument;
        summaries.push({
          map_id: doc.map_id,
          title: doc.metadata.title || "Sin título",
          created_at: doc.metadata.created_at,
          updated_at: doc.metadata.updated_at,
          stroke_count: doc.raw_ink_layer?.strokes?.length || 0,
          entity_count: doc.visual_ast_layer?.entities?.length || 0,
          is_compiled: doc.compiled_cognitive_layer !== null,
        });
      } catch (e) {
        console.warn(`[StorageService] Skipped corrupted document ${fileName}:`, e);
      }
    }

    return summaries.sort((a, b) => b.updated_at - a.updated_at);
  } catch (err) {
    console.error("[StorageService] Failed to list documents:", err);
    return [];
  }
}

/**
 * Deletes a .cmn document by map ID
 */
export async function deleteDocument(mapId: string): Promise<void> {
  try {
    const filePath = `${MAPS_DIRECTORY}${mapId}.cmn`;
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(filePath);
      console.log(`[StorageService] 🗑️ Deleted document: ${mapId}`);
    }
  } catch (err) {
    console.error(`[StorageService] Failed to delete document ${mapId}:`, err);
  }
}

/**
 * Gets the map ID of the last opened/edited document
 */
export async function getLastActiveMapId(): Promise<string | null> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(LAST_MAP_KEY_FILE);
    if (!fileInfo.exists) {
      return null;
    }
    const id = await FileSystem.readAsStringAsync(LAST_MAP_KEY_FILE, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    return id.trim() || null;
  } catch (err) {
    return null;
  }
}
