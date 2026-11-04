import React, { useState } from "react";
import { View, Text, TouchableOpacity, Pressable, Alert, Platform } from "react-native";
import * as FileSystem from "expo-file-system";
import { X, Image, Download, BrainCircuit, Trash2, ChevronRight, Check, BookOpen } from "@sketchyicons/react-native";
import { exportHighResPng, getCanvasStrokes } from "../JetpackInkCanvas";
import { MapDocumentSummary, loadDocument, getCompilationForCanvas } from "../../services/StorageService";
import { styles } from "./DocumentActionsModal.styles";
import { useAppTheme } from "../../theme";

export interface DocumentActionsModalProps {
  visible: boolean;
  onClose: () => void;
  mapTitle: string;
  strokeCount: number;
  entityCount: number;
  lastSavedAt: number | null;
  savedMaps?: MapDocumentSummary[];
  currentMapId: string;
  compilation?: any | null;
  onSelectMap?: (mapId: string) => void;
  onNewMap?: () => void;
  onDeleteMap?: (mapId: string) => void;
  onRequestClear: () => void;
  onOpenCompiler?: () => void;
  onDuplicateMap?: () => void;
  onOpenGuide?: () => void;
}

const EXPORTS_DIR = `${FileSystem.documentDirectory}exports/`;
const { StorageAccessFramework } = FileSystem;

async function ensureExportsDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(EXPORTS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(EXPORTS_DIR, { intermediates: true });
  }
}

function sanitizeFileName(title: string): string {
  return (
    (title || "untitled")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "canvas"
  );
}

/**
 * Saves a physical file to internal exports/ and, on Android, opens the native
 * Storage Access Framework (SAF) directory picker to save directly to Downloads/Files.
 */
async function savePhysicalFileWithSAF(params: {
  fileName: string;
  mimeType: string;
  content: string;
  encoding: FileSystem.EncodingType;
}): Promise<{ savedLocation: string; usedSaf: boolean }> {
  await ensureExportsDir();
  const fallbackUri = `${EXPORTS_DIR}${params.fileName}`;
  await FileSystem.writeAsStringAsync(fallbackUri, params.content, { encoding: params.encoding });

  if (Platform.OS === "android" && StorageAccessFramework) {
    const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (permissions.granted) {
      const safFileUri = await StorageAccessFramework.createFileAsync(
        permissions.directoryUri,
        params.fileName,
        params.mimeType
      );
      await FileSystem.writeAsStringAsync(safFileUri, params.content, { encoding: params.encoding });
      return { savedLocation: decodeURIComponent(safFileUri), usedSaf: true };
    }
  }
  return { savedLocation: fallbackUri.replace("file://", ""), usedSaf: false };
}

export const DocumentActionsModal: React.FC<DocumentActionsModalProps> = ({
  visible,
  onClose,
  mapTitle,
  strokeCount,
  entityCount,
  lastSavedAt,
  currentMapId,
  compilation,
  onRequestClear,
  onOpenGuide,
}) => {
  const { theme } = useAppTheme();
  const [busyAction, setBusyAction] = useState<"PNG" | "JSON" | "AI_JSON" | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!visible) return null;

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return "Sin guardar";
    return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const handleExportPng = async () => {
    try {
      setBusyAction("PNG");
      const capture = await exportHighResPng(1.0, true);
      const fileName = `${sanitizeFileName(mapTitle)}_${Date.now()}.png`;
      const base64Png = await FileSystem.readAsStringAsync(capture.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const result = await savePhysicalFileWithSAF({
        fileName,
        mimeType: "image/png",
        content: base64Png,
        encoding: FileSystem.EncodingType.Base64,
      });
      const msg = `PNG (${capture.width}×${capture.height}px) guardado en:\n${result.savedLocation}`;
      setToastMessage(msg);
      Alert.alert("Snapshot PNG Exportado", msg);
    } catch (err: any) {
      Alert.alert("Error al exportar PNG", err?.message || "No se pudo capturar el lienzo.");
    } finally {
      setBusyAction(null);
    }
  };

  const handleExportJson = async () => {
    try {
      setBusyAction("JSON");
      const savedDoc = await loadDocument(currentMapId);
      const payload = savedDoc || {
        map_id: currentMapId,
        version: "1.0.0",
        metadata: { title: mapTitle, exported_at: Date.now() },
        raw_ink_layer: { strokes: await getCanvasStrokes() },
      };
      const fileName = `${sanitizeFileName(mapTitle)}_${Date.now()}.cmn.json`;
      const result = await savePhysicalFileWithSAF({
        fileName,
        mimeType: "application/json",
        content: JSON.stringify(payload, null, 2),
        encoding: FileSystem.EncodingType.UTF8,
      });
      const msg = `Archivo .cmn JSON guardado en:\n${result.savedLocation}`;
      setToastMessage(msg);
      Alert.alert("Datos .cmn JSON Exportados", msg);
    } catch (err: any) {
      Alert.alert("Error al exportar JSON", err?.message || "No se pudo serializar el documento.");
    } finally {
      setBusyAction(null);
    }
  };

  const handleExportAiAnalysis = async () => {
    try {
      setBusyAction("AI_JSON");
      const storedCompilation = await getCompilationForCanvas(currentMapId);
      const compilationData = storedCompilation || compilation || null;

      if (!compilationData) {
        const noCompMsg = "Please compile this canvas with AI first before exporting the analysis.";
        setToastMessage(noCompMsg);
        Alert.alert("No Compilation Available", noCompMsg);
        return;
      }

      const fileName = `${sanitizeFileName(mapTitle)}_ai_analysis.json`;
      const result = await savePhysicalFileWithSAF({
        fileName,
        mimeType: "application/json",
        content: JSON.stringify(compilationData, null, 2),
        encoding: FileSystem.EncodingType.UTF8,
      });

      const msg = `Archivo ${fileName} guardado en:\n${result.savedLocation}`;
      setToastMessage(msg);
      Alert.alert("AI Analysis Exported", msg);
    } catch (error) {
      console.error("Failed to export AI analysis file:", error);
      Alert.alert("Export Error", "Failed to generate the AI analysis document.");
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <Pressable style={styles.backdrop} onPress={onClose}>
      <Pressable
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.bgCard,
            borderColor: theme.colors.borderSubtle,
          },
        ]}
        onPress={() => {}}
      >
        <View style={[styles.header, { borderBottomColor: theme.colors.borderSubtle }]}>
          <View style={styles.headerTextCol}>
            <Text
              style={[
                styles.title,
                theme.typography.display,
                { color: theme.colors.textPrimary },
              ]}
              numberOfLines={1}
            >
              {mapTitle}
            </Text>
            <Text
              style={[
                styles.subtitle,
                theme.typography.body,
                { color: theme.colors.textSecondary },
              ]}
            >
              {strokeCount} trazos • {entityCount} entidades • Guardado {formatDate(lastSavedAt)}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: theme.colors.pillInactiveBg }]}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <X size={16} color={theme.colors.textMuted} strokeWidth={2.0} />
          </TouchableOpacity>
        </View>

        {toastMessage && (
          <View style={styles.toastBanner}>
            <Check size={14} color="#10B981" strokeWidth={2.2} />
            <Text style={[styles.toastText, theme.typography.mono]} numberOfLines={2}>
              {toastMessage}
            </Text>
          </View>
        )}

        <View style={styles.body}>
          <Text
            style={[
              styles.sectionHeader,
              theme.typography.monoBold,
              { color: theme.colors.textMuted },
            ]}
          >
            EXPORTAR & COMPARTIR
          </Text>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={handleExportPng}
            disabled={busyAction !== null}
            activeOpacity={0.75}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: "#0284C7" }]}>
              <Image size={18} color="#FFFFFF" strokeWidth={1.8} />
            </View>
            <View style={styles.actionTextCol}>
              <Text
                style={[
                  styles.actionTitle,
                  theme.typography.bodyBold,
                  { color: theme.colors.textPrimary },
                ]}
              >
                {busyAction === "PNG" ? "Capturando Snapshot..." : "Export as PNG"}
              </Text>
              <Text
                style={[
                  styles.actionDesc,
                  theme.typography.body,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Captura offscreen idéntica al pipeline de compilación IA (fullDocument, 1.0x)
              </Text>
            </View>
            <ChevronRight size={18} color={theme.colors.textMuted} strokeWidth={2.0} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={handleExportJson}
            disabled={busyAction !== null}
            activeOpacity={0.75}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: "#7C3AED" }]}>
              <Download size={18} color="#FFFFFF" strokeWidth={1.8} />
            </View>
            <View style={styles.actionTextCol}>
              <Text
                style={[
                  styles.actionTitle,
                  theme.typography.bodyBold,
                  { color: theme.colors.textPrimary },
                ]}
              >
                {busyAction === "JSON" ? "Exportando JSON..." : "Export Canvas Data (.cmn JSON)"}
              </Text>
              <Text
                style={[
                  styles.actionDesc,
                  theme.typography.body,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Exporta el payload crudo de trazos vectoriales, stickers y árbol AST
              </Text>
            </View>
            <ChevronRight size={18} color={theme.colors.textMuted} strokeWidth={2.0} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={handleExportAiAnalysis}
            disabled={busyAction !== null}
            activeOpacity={0.75}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: "#059669" }]}>
              <BrainCircuit size={18} color="#FFFFFF" strokeWidth={1.8} />
            </View>
            <View style={styles.actionTextCol}>
              <Text
                style={[
                  styles.actionTitle,
                  theme.typography.bodyBold,
                  { color: theme.colors.textPrimary },
                ]}
              >
                {busyAction === "AI_JSON" ? "Exportando Análisis IA..." : "Export AI Analysis (JSON)"}
              </Text>
              <Text
                style={[
                  styles.actionDesc,
                  theme.typography.body,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Exporta el grafo cognitivo compilado, flashcards SRS, niveles y dominios
              </Text>
            </View>
            <ChevronRight size={18} color={theme.colors.textMuted} strokeWidth={2.0} />
          </TouchableOpacity>

          <Text
            style={[
              styles.sectionHeader,
              theme.typography.monoBold,
              { color: theme.colors.textMuted },
            ]}
          >
            AYUDA & GUÍA
          </Text>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => {
              onClose();
              onOpenGuide?.();
            }}
            activeOpacity={0.75}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: "#F59E0B" }]}>
              <BookOpen size={18} color="#FFFFFF" strokeWidth={1.8} />
            </View>
            <View style={styles.actionTextCol}>
              <Text
                style={[
                  styles.actionTitle,
                  theme.typography.bodyBold,
                  { color: theme.colors.textPrimary },
                ]}
              >
                Guía de uso
              </Text>
              <Text
                style={[
                  styles.actionDesc,
                  theme.typography.body,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Tres pasos clave: dibuja en red, explica tu razonamiento y compila
              </Text>
            </View>
            <ChevronRight size={18} color={theme.colors.textMuted} strokeWidth={2.0} />
          </TouchableOpacity>

          <Text
            style={[
              styles.sectionHeader,
              theme.typography.monoBold,
              { color: theme.colors.textMuted },
            ]}
          >
            ZONA DE PELIGRO
          </Text>

          <TouchableOpacity
            style={[styles.actionItem, styles.dangerItem]}
            onPress={() => {
              onClose();
              onRequestClear();
            }}
            activeOpacity={0.75}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: "rgba(239, 68, 68, 0.2)" }]}>
              <Trash2 size={18} color="#EF4444" strokeWidth={1.8} />
            </View>
            <View style={styles.actionTextCol}>
              <Text style={[styles.actionTitle, theme.typography.bodyBold, styles.dangerText]}>
                Clear All Strokes
              </Text>
              <Text
                style={[
                  styles.actionDesc,
                  theme.typography.body,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Borrar todos los trazos manuscritos del lienzo actual
              </Text>
            </View>
            <ChevronRight size={18} color="#EF4444" strokeWidth={2.0} />
          </TouchableOpacity>
        </View>
      </Pressable>
    </Pressable>
  );
};
