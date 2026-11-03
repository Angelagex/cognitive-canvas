import * as FileSystem from "expo-file-system";

const MATRIX_FILE_PATH = `${FileSystem.documentDirectory}matrix_knowledge_graph.json`;

export async function getGlobalKnowledgeMatrix(): Promise<any | null> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(MATRIX_FILE_PATH);
    if (!fileInfo.exists) return null;
    const content = await FileSystem.readAsStringAsync(MATRIX_FILE_PATH, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    return JSON.parse(content);
  } catch (err) {
    console.warn("[StorageService] Failed to load global knowledge matrix:", err);
    return null;
  }
}

export async function saveGlobalKnowledgeMatrix(matrix: any): Promise<void> {
  try {
    const content = JSON.stringify(matrix, null, 2);
    await FileSystem.writeAsStringAsync(MATRIX_FILE_PATH, content, {
      encoding: FileSystem.EncodingType.UTF8,
    });
  } catch (err) {
    console.error("[StorageService] Failed to save global knowledge matrix:", err);
  }
}

