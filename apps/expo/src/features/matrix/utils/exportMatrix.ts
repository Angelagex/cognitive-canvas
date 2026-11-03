import { Alert, Platform, Share } from "react-native";
import * as FileSystem from "expo-file-system";
import { StorageAccessFramework } from "expo-file-system";
import { CanvasCompiledPayload, KnowledgeNode, KnowledgeEdge } from "@cognitive-canvas/core";

export async function exportKnowledgeMatrix(
  nodes: KnowledgeNode[],
  edges: KnowledgeEdge[],
  payloads: CanvasCompiledPayload[]
): Promise<void> {
  try {
    if (nodes.length === 0) {
      Alert.alert("Matriz Vacía", "No hay nodos ni estructura compilada para exportar.");
      return;
    }
    const matrixData = {
      exportedAt: Date.now(),
      totalNodes: nodes.length,
      totalEdges: edges.length,
      canvasesCount: payloads.length,
      nodes,
      edges,
      payloads,
    };
    const filename = `knowledge_matrix_${Date.now()}.json`;
    const fileUri = `${FileSystem.cacheDirectory}${filename}`;
    const jsonContent = JSON.stringify(matrixData, null, 2);
    await FileSystem.writeAsStringAsync(fileUri, jsonContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    let shared = false;
    try {
      const dynamicRequire = typeof require !== "undefined" ? require : null;
      const expoSharing = dynamicRequire ? dynamicRequire("expo-sharing") : null;
      if (expoSharing && (await expoSharing.isAvailableAsync())) {
        await expoSharing.shareAsync(fileUri, {
          mimeType: "application/json",
          dialogTitle: "Exportar Matriz de Conocimiento",
          UTI: "public.json",
        });
        shared = true;
      }
    } catch {}

    if (!shared && Platform.OS === "android" && StorageAccessFramework) {
      const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (permissions.granted) {
        const safUri = await StorageAccessFramework.createFileAsync(
          permissions.directoryUri,
          filename,
          "application/json"
        );
        await FileSystem.writeAsStringAsync(safUri, jsonContent, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        Alert.alert("Matriz Guardada", `Archivo guardado exitosamente:\n${filename}`);
        shared = true;
      }
    }

    if (!shared) {
      await Share.share({ title: "Exportar Matriz de Conocimiento", message: jsonContent });
    }
  } catch (error: any) {
    console.error("Error al exportar matriz:", error);
    Alert.alert("Error", error?.message || "No se pudo exportar el archivo de la Matriz.");
  }
}

