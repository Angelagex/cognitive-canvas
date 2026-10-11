import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
  Alert,
} from "react-native";
import {
  Folder,
  Plus,
  X,
  BrainCircuit,
  FileText,
  Trash2,
  Pen,
  Tag,
  Zap,
} from "@sketchyicons/react-native";
import { MapDocumentSummary } from "../../services/StorageService";

interface VaultsModalProps {
  visible: boolean;
  onClose: () => void;
  savedMaps: MapDocumentSummary[];
  currentMapId: string;
  onSelectMap: (mapId: string) => void;
  onNewMap: () => void;
  onDeleteMap: (mapId: string) => void;
}

export const VaultsModal: React.FC<VaultsModalProps> = ({
  visible,
  onClose,
  savedMaps,
  currentMapId,
  onSelectMap,
  onNewMap,
  onDeleteMap,
}) => {
  const [mapToDelete, setMapToDelete] = useState<MapDocumentSummary | null>(null);

  const formatDate = (timestamp: number) => {
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
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.modalCard}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <View style={styles.headerIconContainer}>
                    <Folder size={20} color="#38BDF8" strokeWidth={1.8} />
                  </View>
                  <View>
                    <Text style={styles.title}>Bóveda de Mapas Cognitivos</Text>
                    <Text style={styles.subtitle}>
                      Formatos locales .cmn con persistencia en 3 capas
                    </Text>
                  </View>
                </View>

                <View style={styles.headerRight}>
                  <TouchableOpacity
                    style={styles.newMapButton}
                    onPress={() => {
                      onNewMap();
                      onClose();
                    }}
                    activeOpacity={0.8}
                  >
                    <Plus size={14} color="#FFFFFF" strokeWidth={2.2} />
                    <Text style={styles.newMapText}>Nuevo Mapa</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={onClose}
                    activeOpacity={0.7}
                  >
                    <X size={16} color="#94A3B8" strokeWidth={2.0} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Body: Map List */}
              <ScrollView
                style={styles.body}
                contentContainerStyle={styles.bodyContent}
                showsVerticalScrollIndicator={false}
              >
                {savedMaps.length === 0 ? (
                  <View style={styles.emptyState}>
                    <BrainCircuit size={48} color="#475569" strokeWidth={1.5} />
                    <Text style={styles.emptyTitle}>No hay mapas guardados aún</Text>
                    <Text style={styles.emptySubtitle}>
                      Tus dibujos y diagramas se auto-guardan automáticamente aquí como documentos .cmn.
                    </Text>
                    <TouchableOpacity
                      style={styles.emptyButton}
                      onPress={() => {
                        onNewMap();
                        onClose();
                      }}
                    >
                      <Text style={styles.emptyButtonText}>Crear Primer Mapa</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.cardsGrid}>
                    {savedMaps.map((map) => {
                      const isCurrent = map.map_id === currentMapId;
                      return (
                        <TouchableOpacity
                          key={map.map_id}
                          style={[styles.mapCard, isCurrent && styles.mapCardCurrent]}
                          onPress={() => {
                            if (!isCurrent) {
                              onSelectMap(map.map_id);
                            }
                            onClose();
                          }}
                          activeOpacity={0.75}
                        >
                          <View style={styles.cardHeader}>
                            <View style={styles.mapBadge}>
                              <FileText size={12} color="#94A3B8" strokeWidth={1.8} />
                              <Text style={styles.mapBadgeText}>.cmn</Text>
                            </View>

                            <View style={styles.cardActions}>
                              {isCurrent && (
                                <View style={styles.currentBadge}>
                                  <Text style={styles.currentBadgeText}>Abierto</Text>
                                </View>
                              )}
                              <TouchableOpacity
                                style={styles.deleteButton}
                                onPress={(e) => {
                                  e.stopPropagation();
                                  setMapToDelete(map);
                                }}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              >
                                <Trash2 size={16} color="#EF4444" strokeWidth={1.8} />
                              </TouchableOpacity>
                            </View>
                          </View>

                          <Text style={styles.cardTitle} numberOfLines={2}>
                            {map.title}
                          </Text>

                          <View style={styles.cardFooter}>
                            <View style={styles.statsRow}>
                              <Pen size={11} color="#94A3B8" strokeWidth={1.8} />
                              <Text style={styles.statItem}>
                                {map.stroke_count} trazos
                              </Text>
                              <Text style={styles.statDot}>•</Text>
                              <Tag size={11} color="#94A3B8" strokeWidth={1.8} />
                              <Text style={styles.statItem}>
                                {map.entity_count} entidades
                              </Text>
                              {map.is_compiled && (
                                <>
                                  <Text style={styles.statDot}>•</Text>
                                  <Zap size={11} color="#F59E0B" strokeWidth={2.0} />
                                  <Text style={styles.statCompiled}>Compilado</Text>
                                </>
                              )}
                            </View>
                            <Text style={styles.dateText}>{formatDate(map.updated_at)}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </ScrollView>

              {/* Sub-Modal: Confirm Map Delete */}
              {mapToDelete && (
                <View style={styles.deleteOverlay}>
                  <View style={styles.deleteDialog}>
                    <Text style={styles.deleteTitle}>¿Eliminar este mapa?</Text>
                    <Text style={styles.deleteDescription}>
                      Se eliminará permanentemente "{mapToDelete.title}". Esta acción no se puede deshacer.
                    </Text>
                    <View style={styles.deleteButtonsRow}>
                      <TouchableOpacity
                        style={styles.deleteCancelBtn}
                        onPress={() => setMapToDelete(null)}
                      >
                        <Text style={styles.deleteCancelText}>Cancelar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteConfirmBtn}
                        onPress={handleConfirmDelete}
                      >
                        <Text style={styles.deleteConfirmText}>Eliminar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
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
    backgroundColor: "rgba(3, 7, 18, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 720,
    maxHeight: "85%",
    backgroundColor: "#0B1120",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1E293B",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 12,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
    backgroundColor: "#0F172A",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerIcon: {
    fontSize: 20,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 17,
    fontWeight: "700",
  },
  subtitle: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  newMapButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0284C7",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  newMapIcon: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  newMapText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#1E293B",
    justifyContent: "center",
    alignItems: "center",
  },
  closeText: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "700",
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 20,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  emptySubtitle: {
    color: "#64748B",
    fontSize: 13,
    textAlign: "center",
    maxWidth: 360,
    lineHeight: 18,
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: "#0284C7",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  cardsGrid: {
    gap: 12,
  },
  mapCard: {
    backgroundColor: "#131C31",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1E293B",
    padding: 16,
  },
  mapCardCurrent: {
    borderColor: "#38BDF8",
    backgroundColor: "rgba(56, 189, 248, 0.05)",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  mapBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(30, 41, 59, 0.8)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  mapBadgeIcon: {
    fontSize: 12,
  },
  mapBadgeText: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "600",
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  currentBadge: {
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.3)",
  },
  currentBadgeText: {
    color: "#38BDF8",
    fontSize: 11,
    fontWeight: "700",
  },
  deleteButton: {
    padding: 4,
  },
  deleteButtonText: {
    fontSize: 14,
    opacity: 0.6,
  },
  cardTitle: {
    color: "#F1F5F9",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
    paddingTop: 10,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statItem: {
    color: "#94A3B8",
    fontSize: 12,
  },
  statDot: {
    color: "#475569",
    fontSize: 12,
  },
  statCompiled: {
    color: "#F59E0B",
    fontSize: 12,
    fontWeight: "600",
  },
  dateText: {
    color: "#64748B",
    fontSize: 11,
  },
  deleteOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(3, 7, 18, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  deleteDialog: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#0F172A",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
    padding: 22,
    alignItems: "center",
  },
  deleteTitle: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  deleteDescription: {
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    marginBottom: 20,
  },
  deleteButtonsRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  deleteCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#1E293B",
    alignItems: "center",
  },
  deleteCancelText: {
    color: "#E2E8F0",
    fontSize: 13,
    fontWeight: "600",
  },
  deleteConfirmBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#DC2626",
    alignItems: "center",
  },
  deleteConfirmText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});
