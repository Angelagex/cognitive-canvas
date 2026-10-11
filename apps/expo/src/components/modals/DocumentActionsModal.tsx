import React, { useState } from "react";
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
import {
  ArrowLeft,
  X,
  Plus,
  Folder,
  Copy,
  Image,
  FileText,
  Download,
  Zap,
  Trash2,
  ChevronRight,
  BrainCircuit,
  Pen,
  Tag,
} from "@sketchyicons/react-native";
import { MapDocumentSummary } from "../../services/StorageService";

interface DocumentActionsModalProps {
  visible: boolean;
  onClose: () => void;
  mapTitle: string;
  strokeCount: number;
  entityCount: number;
  lastSavedAt: number | null;
  savedMaps: MapDocumentSummary[];
  currentMapId: string;
  onSelectMap: (mapId: string) => void;
  onNewMap: () => void;
  onDeleteMap: (mapId: string) => void;
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
  savedMaps,
  currentMapId,
  onSelectMap,
  onNewMap,
  onDeleteMap,
  onRequestClear,
  onOpenCompiler,
  onDuplicateMap,
}) => {
  const [currentView, setCurrentView] = useState<"menu" | "vault">("menu");
  const [mapToDelete, setMapToDelete] = useState<MapDocumentSummary | null>(null);

  // Reset view to "menu" when modal closes
  const handleClose = () => {
    setCurrentView("menu");
    setMapToDelete(null);
    onClose();
  };

  const handleExport = (format: "PNG" | "PDF" | "CMN") => {
    handleClose();
    setTimeout(() => {
      Alert.alert(
        `Exportar a ${format}`,
        `El mapa "${mapTitle}" se está preparando para exportar en formato ${format}. (${strokeCount} trazos, ${entityCount} conceptos).`,
        [{ text: "Aceptar", style: "default" }]
      );
    }, 150);
  };

  const handleDuplicate = () => {
    handleClose();
    if (onDuplicateMap) {
      onDuplicateMap();
    } else {
      Alert.alert("Duplicar", `Copia creada de "${mapTitle}" exitosamente.`);
    }
  };

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return "Desconocido";
    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffHours < 1) {
      const mins = Math.max(1, Math.round(diffHours * 60));
      return `Hace ${mins} min`;
    }
    if (diffHours < 24) {
      return `Hoy, ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    }
    return date.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
  };

  const handleConfirmDelete = () => {
    if (mapToDelete) {
      onDeleteMap(mapToDelete.map_id);
      setMapToDelete(null);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={[styles.card, currentView === "vault" && styles.cardVault]}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  {currentView === "vault" ? (
                    <TouchableOpacity
                      style={styles.backButton}
                      onPress={() => setCurrentView("menu")}
                      activeOpacity={0.7}
                    >
                      <ArrowLeft size={16} color="#38BDF8" strokeWidth={2.0} />
                      <Text style={styles.backButtonText}>Menú</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.headerTextCol}>
                      <Text style={styles.title} numberOfLines={1}>{mapTitle}</Text>
                      <Text style={styles.subtitle}>
                        {strokeCount} trazos • {entityCount} entidades • Guardado {formatDate(lastSavedAt)}
                      </Text>
                    </View>
                  )}
                </View>

                {currentView === "vault" && (
                  <View style={styles.vaultHeaderCenter}>
                    <Text style={styles.vaultTitle}>Bóveda de Mapas</Text>
                    <Text style={styles.vaultSubtitle}>{savedMaps.length} documentos .cmn</Text>
                  </View>
                )}

                <View style={styles.headerRight}>
                  {currentView === "vault" && (
                    <TouchableOpacity
                      style={styles.newMapBtn}
                      onPress={() => {
                        onNewMap();
                        handleClose();
                      }}
                      activeOpacity={0.8}
                    >
                      <Plus size={14} color="#FFFFFF" strokeWidth={2.2} />
                      <Text style={styles.newMapBtnText}>Nuevo</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.closeBtn} onPress={handleClose} activeOpacity={0.7}>
                    <X size={16} color="#94A3B8" strokeWidth={2.0} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* VIEW 1: Menú Principal de Acciones */}
              {currentView === "menu" ? (
                <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
                  {/* SECCIÓN 1: GESTIÓN */}
                  <Text style={styles.sectionHeader}>DOCUMENTO & PROYECTOS</Text>

                  <TouchableOpacity
                    style={styles.actionItem}
                    onPress={() => setCurrentView("vault")}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.actionIconContainer, { backgroundColor: "#1E3A8A" }]}>
                      <Folder size={18} color="#FFFFFF" strokeWidth={1.8} />
                    </View>
                    <View style={styles.actionTextCol}>
                      <Text style={styles.actionTitle}>Bóveda de Mapas ({savedMaps.length})</Text>
                      <Text style={styles.actionDesc}>Explorar todos tus proyectos, cambiar de mapa o gestionar copias</Text>
                    </View>
                    <ChevronRight size={18} color="#64748B" strokeWidth={2.0} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionItem}
                    onPress={() => {
                      handleClose();
                      onNewMap();
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.actionIconContainer, { backgroundColor: "#065F46" }]}>
                      <Plus size={18} color="#FFFFFF" strokeWidth={2.0} />
                    </View>
                    <View style={styles.actionTextCol}>
                      <Text style={styles.actionTitle}>Nuevo Mapa en Blanco</Text>
                      <Text style={styles.actionDesc}>Iniciar un nuevo lienzo sin sobrescribir el actual</Text>
                    </View>
                    <ChevronRight size={18} color="#64748B" strokeWidth={2.0} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionItem}
                    onPress={handleDuplicate}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.actionIconContainer, { backgroundColor: "#3730A3" }]}>
                      <Copy size={18} color="#FFFFFF" strokeWidth={1.8} />
                    </View>
                    <View style={styles.actionTextCol}>
                      <Text style={styles.actionTitle}>Duplicar este Mapa</Text>
                      <Text style={styles.actionDesc}>Crear una copia de respaldo para experimentar nuevas ramas</Text>
                    </View>
                    <ChevronRight size={18} color="#64748B" strokeWidth={2.0} />
                  </TouchableOpacity>

                  {/* SECCIÓN 2: EXPORTAR */}
                  <Text style={styles.sectionHeader}>EXPORTAR & COMPARTIR</Text>

                  <TouchableOpacity
                    style={styles.actionItem}
                    onPress={() => handleExport("PNG")}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.actionIconContainer, { backgroundColor: "#0284C7" }]}>
                      <Image size={18} color="#FFFFFF" strokeWidth={1.8} />
                    </View>
                    <View style={styles.actionTextCol}>
                      <Text style={styles.actionTitle}>Exportar como Imagen (PNG)</Text>
                      <Text style={styles.actionDesc}>Alta resolución para compartir en mensajes o diapositivas</Text>
                    </View>
                    <ChevronRight size={18} color="#64748B" strokeWidth={2.0} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionItem}
                    onPress={() => handleExport("PDF")}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.actionIconContainer, { backgroundColor: "#DC2626" }]}>
                      <FileText size={18} color="#FFFFFF" strokeWidth={1.8} />
                    </View>
                    <View style={styles.actionTextCol}>
                      <Text style={styles.actionTitle}>Exportar como Documento (PDF)</Text>
                      <Text style={styles.actionDesc}>Vectorial con páginas estructuradas e imprimibles</Text>
                    </View>
                    <ChevronRight size={18} color="#64748B" strokeWidth={2.0} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionItem}
                    onPress={() => handleExport("CMN")}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.actionIconContainer, { backgroundColor: "#7C3AED" }]}>
                      <Download size={18} color="#FFFFFF" strokeWidth={1.8} />
                    </View>
                    <View style={styles.actionTextCol}>
                      <Text style={styles.actionTitle}>Descargar Archivo Cognitivo (.cmn)</Text>
                      <Text style={styles.actionDesc}>Respaldo nativo con capas de tinta y árbol AST completo</Text>
                    </View>
                    <ChevronRight size={18} color="#64748B" strokeWidth={2.0} />
                  </TouchableOpacity>

                  {/* SECCIÓN 3: SÍNTESIS */}
                  <Text style={styles.sectionHeader}>COGNICIÓN & SÍNTESIS</Text>

                  <TouchableOpacity
                    style={styles.actionItem}
                    onPress={() => {
                      handleClose();
                      onOpenCompiler();
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.actionIconContainer, { backgroundColor: "#D97706" }]}>
                      <Zap size={18} color="#FFFFFF" strokeWidth={2.0} />
                    </View>
                    <View style={styles.actionTextCol}>
                      <Text style={styles.actionTitle}>Compilar Mapa Mental (GRINDE)</Text>
                      <Text style={styles.actionDesc}>Extraer conceptos clave y relaciones causales con IA</Text>
                    </View>
                    <ChevronRight size={18} color="#64748B" strokeWidth={2.0} />
                  </TouchableOpacity>

                  {/* SECCIÓN 4: ACCIÓN PELIGROSA */}
                  <Text style={styles.sectionHeader}>ZONA DE PELIGRO</Text>

                  <TouchableOpacity
                    style={[styles.actionItem, styles.dangerItem]}
                    onPress={() => {
                      handleClose();
                      onRequestClear();
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.actionIconContainer, { backgroundColor: "rgba(239, 68, 68, 0.2)" }]}>
                      <Trash2 size={18} color="#EF4444" strokeWidth={1.8} />
                    </View>
                    <View style={styles.actionTextCol}>
                      <Text style={[styles.actionTitle, styles.dangerText]}>Limpiar Todo el Lienzo</Text>
                      <Text style={styles.actionDesc}>Borrar todos los trazos manuscritos actuales</Text>
                    </View>
                    <ChevronRight size={18} color="#EF4444" strokeWidth={2.0} />
                  </TouchableOpacity>
                </ScrollView>
              ) : (
                /* VIEW 2: Bóveda de Mapas Integrada */
                <View style={styles.vaultContainer}>
                  {mapToDelete && (
                    <View style={styles.deleteConfirmBanner}>
                      <Text style={styles.deleteConfirmText}>
                        ¿Eliminar permanentemente "{mapToDelete.title}"?
                      </Text>
                      <View style={styles.deleteConfirmActions}>
                        <TouchableOpacity
                          style={styles.deleteCancelBtn}
                          onPress={() => setMapToDelete(null)}
                        >
                          <Text style={styles.deleteCancelText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.deleteProceedBtn}
                          onPress={handleConfirmDelete}
                        >
                          <Text style={styles.deleteProceedText}>Eliminar</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  <ScrollView
                    style={styles.vaultList}
                    contentContainerStyle={styles.vaultListContent}
                    showsVerticalScrollIndicator={false}
                  >
                    {savedMaps.length === 0 ? (
                      <View style={styles.emptyContainer}>
                        <Folder size={36} color="#64748B" strokeWidth={1.5} />
                        <Text style={styles.emptyTitle}>No hay mapas en la bóveda</Text>
                        <Text style={styles.emptySubtitle}>
                          Tus mapas mentales se guardarán automáticamente aquí conforme dibujes.
                        </Text>
                      </View>
                    ) : (
                      savedMaps.map((map) => {
                        const isCurrent = map.map_id === currentMapId;
                        return (
                          <View
                            key={map.map_id}
                            style={[styles.mapCard, isCurrent && styles.mapCardActive]}
                          >
                            <TouchableOpacity
                              style={styles.mapCardMain}
                              onPress={() => {
                                onSelectMap(map.map_id);
                                handleClose();
                              }}
                              activeOpacity={0.7}
                            >
                              <View style={styles.mapCardThumbnail}>
                                <BrainCircuit size={22} color="#38BDF8" strokeWidth={1.8} />
                                {isCurrent && (
                                  <View style={styles.activePill}>
                                    <Text style={styles.activePillText}>Abierto</Text>
                                  </View>
                                )}
                              </View>

                              <View style={styles.mapCardDetails}>
                                <Text style={styles.mapCardTitle} numberOfLines={1}>
                                  {map.title || "Mapa sin título"}
                                </Text>
                                <Text style={styles.mapCardDate}>
                                  {formatDate(map.updated_at)}
                                </Text>

                                <View style={styles.mapCardBadges}>
                                  <View style={styles.mapBadge}>
                                    <Pen size={10} color="#94A3B8" strokeWidth={1.8} />
                                    <Text style={styles.mapBadgeText}>
                                      {map.stroke_count} trazos
                                    </Text>
                                  </View>
                                  <View style={styles.mapBadge}>
                                    <Tag size={10} color="#94A3B8" strokeWidth={1.8} />
                                    <Text style={styles.mapBadgeText}>
                                      {map.entity_count} conceptos
                                    </Text>
                                  </View>
                                  {map.is_compiled && (
                                    <View style={[styles.mapBadge, styles.compiledBadge]}>
                                      <Zap size={10} color="#FBBF24" strokeWidth={2.0} />
                                      <Text style={styles.compiledBadgeText}>Compilado</Text>
                                    </View>
                                  )}
                                </View>
                              </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.deleteButton}
                              onPress={() => setMapToDelete(map)}
                              activeOpacity={0.7}
                              accessibilityLabel="Eliminar mapa"
                            >
                              <Trash2 size={16} color="#EF4444" strokeWidth={1.8} />
                            </TouchableOpacity>
                          </View>
                        );
                      })
                    )}
                  </ScrollView>
                </View>
              )}
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
    width: 490,
    maxHeight: "86%",
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
  cardVault: {
    width: 600,
    height: 520,
    maxHeight: "88%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
    backgroundColor: "#0B1120",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerTextCol: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "700",
  },
  subtitle: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 2,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  backButtonIcon: {
    color: "#38BDF8",
    fontSize: 14,
    fontWeight: "700",
  },
  backButtonText: {
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: "700",
  },
  vaultHeaderCenter: {
    alignItems: "center",
    flex: 2,
  },
  vaultTitle: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "700",
  },
  vaultSubtitle: {
    color: "#64748B",
    fontSize: 11,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  newMapBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0284C7",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  newMapBtnIcon: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  newMapBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#1E293B",
    justifyContent: "center",
    alignItems: "center",
  },
  closeBtnText: {
    color: "#94A3B8",
    fontSize: 13,
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
    marginTop: 10,
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

  // Vault Styles
  vaultContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  deleteConfirmBanner: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.4)",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  deleteConfirmText: {
    color: "#FCA5A5",
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  deleteConfirmActions: {
    flexDirection: "row",
    gap: 8,
  },
  deleteCancelBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: "#1E293B",
  },
  deleteCancelText: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "600",
  },
  deleteProceedBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: "#DC2626",
  },
  deleteProceedText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  vaultList: {
    flex: 1,
  },
  vaultListContent: {
    paddingBottom: 28,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyTitle: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "600",
  },
  emptySubtitle: {
    color: "#64748B",
    fontSize: 11,
    textAlign: "center",
    marginTop: 4,
    maxWidth: 280,
  },
  mapCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#334155",
    padding: 10,
    marginBottom: 8,
  },
  mapCardActive: {
    borderColor: "#0284C7",
    backgroundColor: "rgba(2, 132, 199, 0.08)",
  },
  mapCardMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  mapCardThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#0F172A",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    position: "relative",
    borderWidth: 1,
    borderColor: "#334155",
  },
  mapCardThumbnailIcon: {
    fontSize: 20,
  },
  activePill: {
    position: "absolute",
    bottom: -4,
    backgroundColor: "#0284C7",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  activePillText: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "800",
  },
  mapCardDetails: {
    flex: 1,
  },
  mapCardTitle: {
    color: "#F1F5F9",
    fontSize: 13,
    fontWeight: "700",
  },
  mapCardDate: {
    color: "#64748B",
    fontSize: 10,
    marginTop: 2,
  },
  mapCardBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  mapBadge: {
    backgroundColor: "#0F172A",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  mapBadgeText: {
    color: "#94A3B8",
    fontSize: 9,
    fontWeight: "600",
  },
  compiledBadge: {
    backgroundColor: "rgba(217, 119, 6, 0.2)",
  },
  compiledBadgeText: {
    color: "#FBBF24",
    fontSize: 9,
    fontWeight: "700",
  },
  deleteButton: {
    padding: 8,
    marginLeft: 6,
  },
  deleteIcon: {
    fontSize: 14,
    opacity: 0.6,
  },
});
