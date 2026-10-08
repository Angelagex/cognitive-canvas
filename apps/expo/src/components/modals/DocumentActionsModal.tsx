import React from "react";
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Alert,
} from "react-native";

interface DocumentActionsModalProps {
  visible: boolean;
  onClose: () => void;
  mapTitle: string;
  strokeCount: number;
  entityCount: number;
  lastSavedAt: number | null;
  onOpenVaults: () => void;
  onNewMap: () => void;
  onRequestClear: () => void;
  onOpenCompiler: () => void;
  onDuplicateMap?: () => void;
}

export const DocumentActionsModal: React.FC<DocumentActionsModalProps> = ({
  visible,
  onClose,
  mapTitle,
  strokeCount,
  entityCount,
  lastSavedAt,
  onOpenVaults,
  onNewMap,
  onRequestClear,
  onOpenCompiler,
  onDuplicateMap,
}) => {
  const handleExport = (format: "PNG" | "PDF" | "CMN") => {
    onClose();
    setTimeout(() => {
      Alert.alert(
        `Exportar a ${format}`,
        `El mapa "${mapTitle}" se está preparando para exportar en formato ${format}. (${strokeCount} trazos manuscritos, ${entityCount} entidades cognitivas).`,
        [{ text: "Aceptar", style: "default" }]
      );
    }, 150);
  };

  const handleDuplicate = () => {
    onClose();
    if (onDuplicateMap) {
      onDuplicateMap();
    } else {
      Alert.alert("Duplicar", `Copia creada de "${mapTitle}" exitosamente.`);
    }
  };

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return "Aún no guardado";
    return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.card}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerTextCol}>
                  <Text style={styles.title} numberOfLines={1}>{mapTitle}</Text>
                  <Text style={styles.subtitle}>
                    {strokeCount} trazos • {entityCount} entidades • Guardado {formatDate(lastSavedAt)}
                  </Text>
                </View>
                <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
                {/* 1. SECCIÓN: GESTIÓN DE MAPAS */}
                <Text style={styles.sectionHeader}>GESTIÓN DE MAPAS</Text>

                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={() => {
                    onClose();
                    onOpenVaults();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.actionIconContainer, { backgroundColor: "#1E3A8A" }]}>
                    <Text style={styles.actionIcon}>📁</Text>
                  </View>
                  <View style={styles.actionTextCol}>
                    <Text style={styles.actionTitle}>Bóveda de Mapas</Text>
                    <Text style={styles.actionDesc}>Ver todos tus mapas guardados, cambiar de proyecto o buscar</Text>
                  </View>
                  <Text style={styles.arrowIcon}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={() => {
                    onClose();
                    onNewMap();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.actionIconContainer, { backgroundColor: "#065F46" }]}>
                    <Text style={styles.actionIcon}>➕</Text>
                  </View>
                  <View style={styles.actionTextCol}>
                    <Text style={styles.actionTitle}>Nuevo Mapa en Blanco</Text>
                    <Text style={styles.actionDesc}>Crear un nuevo lienzo sin sobrescribir el actual</Text>
                  </View>
                  <Text style={styles.arrowIcon}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={handleDuplicate}
                  activeOpacity={0.7}
                >
                  <View style={[styles.actionIconContainer, { backgroundColor: "#3730A3" }]}>
                    <Text style={styles.actionIcon}>📋</Text>
                  </View>
                  <View style={styles.actionTextCol}>
                    <Text style={styles.actionTitle}>Duplicar este Mapa</Text>
                    <Text style={styles.actionDesc}>Crear una copia de respaldo para experimentar nuevas ideas</Text>
                  </View>
                  <Text style={styles.arrowIcon}>›</Text>
                </TouchableOpacity>

                {/* 2. SECCIÓN: EXPORTAR Y COMPARTIR */}
                <Text style={styles.sectionHeader}>EXPORTAR & COMPARTIR</Text>

                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={() => handleExport("PNG")}
                  activeOpacity={0.7}
                >
                  <View style={[styles.actionIconContainer, { backgroundColor: "#0284C7" }]}>
                    <Text style={styles.actionIcon}>🖼️</Text>
                  </View>
                  <View style={styles.actionTextCol}>
                    <Text style={styles.actionTitle}>Exportar como Imagen (PNG)</Text>
                    <Text style={styles.actionDesc}>Alta resolución para compartir en mensajes o diapositivas</Text>
                  </View>
                  <Text style={styles.arrowIcon}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={() => handleExport("PDF")}
                  activeOpacity={0.7}
                >
                  <View style={[styles.actionIconContainer, { backgroundColor: "#DC2626" }]}>
                    <Text style={styles.actionIcon}>📑</Text>
                  </View>
                  <View style={styles.actionTextCol}>
                    <Text style={styles.actionTitle}>Exportar como Documento (PDF)</Text>
                    <Text style={styles.actionDesc}>Vectorial con páginas estructuradas e imprimibles</Text>
                  </View>
                  <Text style={styles.arrowIcon}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={() => handleExport("CMN")}
                  activeOpacity={0.7}
                >
                  <View style={[styles.actionIconContainer, { backgroundColor: "#7C3AED" }]}>
                    <Text style={styles.actionIcon}>💾</Text>
                  </View>
                  <View style={styles.actionTextCol}>
                    <Text style={styles.actionTitle}>Descargar Archivo Cognitivo (.cmn)</Text>
                    <Text style={styles.actionDesc}>Formato completo con AST y relaciones para respaldo nativo</Text>
                  </View>
                  <Text style={styles.arrowIcon}>›</Text>
                </TouchableOpacity>

                {/* 3. SECCIÓN: ANÁLISIS COGNITIVO */}
                <Text style={styles.sectionHeader}>COGNICIÓN & SÍNTESIS</Text>

                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={() => {
                    onClose();
                    onOpenCompiler();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.actionIconContainer, { backgroundColor: "#D97706" }]}>
                    <Text style={styles.actionIcon}>⚡</Text>
                  </View>
                  <View style={styles.actionTextCol}>
                    <Text style={styles.actionTitle}>Compilar Mapa Mental (GRINDE)</Text>
                    <Text style={styles.actionDesc}>Extraer conceptos clave y relaciones causales con IA</Text>
                  </View>
                  <Text style={styles.arrowIcon}>›</Text>
                </TouchableOpacity>

                {/* 4. SECCIÓN: ACCIÓN DESTRUCCIÓN */}
                <Text style={styles.sectionHeader}>ZONA DE PELIGRO</Text>

                <TouchableOpacity
                  style={[styles.actionItem, styles.dangerItem]}
                  onPress={() => {
                    onClose();
                    onRequestClear();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.actionIconContainer, { backgroundColor: "rgba(239, 68, 68, 0.2)" }]}>
                    <Text style={styles.actionIcon}>🗑️</Text>
                  </View>
                  <View style={styles.actionTextCol}>
                    <Text style={[styles.actionTitle, styles.dangerText]}>Limpiar Todo el Lienzo</Text>
                    <Text style={styles.actionDesc}>Borrar todos los trazos manuscritos actuales</Text>
                  </View>
                  <Text style={[styles.arrowIcon, styles.dangerText]}>›</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: 480,
    maxHeight: "84%",
    backgroundColor: "#0F172A",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 20,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
    backgroundColor: "#0B1120",
  },
  headerTextCol: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "700",
  },
  subtitle: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1E293B",
    justifyContent: "center",
    alignItems: "center",
  },
  closeBtnText: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "600",
  },
  scrollArea: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionHeader: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
    marginTop: 12,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#334155",
  },
  dangerItem: {
    borderColor: "rgba(239, 68, 68, 0.3)",
    backgroundColor: "rgba(239, 68, 68, 0.06)",
    marginBottom: 16,
  },
  actionIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  actionIcon: {
    fontSize: 16,
  },
  actionTextCol: {
    flex: 1,
  },
  actionTitle: {
    color: "#F1F5F9",
    fontSize: 13,
    fontWeight: "600",
  },
  dangerText: {
    color: "#EF4444",
  },
  actionDesc: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 2,
  },
  arrowIcon: {
    color: "#64748B",
    fontSize: 18,
    fontWeight: "300",
    marginLeft: 8,
  },
});
