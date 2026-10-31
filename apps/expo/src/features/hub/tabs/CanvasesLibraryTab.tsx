import React from "react";
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Plus, Sparkles, Check, Clock, FileText, Trash2 } from "@sketchyicons/react-native";
import { MapDocumentSummary } from "../../../services/StorageService";

export interface CanvasesLibraryTabProps {
  canvases: MapDocumentSummary[];
  currentMapId: string;
  currentMapTitle: string;
  currentStrokeCount: number;
  onOpenCanvas: (mapId: string) => void;
  onCreateNewCanvas: () => void;
  onDeleteCanvas?: (mapId: string) => void;
}

const formatDate = (ts: number) => {
  try {
    return new Date(ts).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Reciente";
  }
};

export const CanvasesLibraryTab: React.FC<CanvasesLibraryTabProps> = ({
  canvases,
  currentMapId,
  currentMapTitle,
  currentStrokeCount,
  onOpenCanvas,
  onCreateNewCanvas,
  onDeleteCanvas,
}) => {
  const displayList: MapDocumentSummary[] =
    canvases.length > 0
      ? canvases
      : [
          {
            map_id: currentMapId,
            title: currentMapTitle || "Mapa Mental Activo",
            created_at: Date.now(),
            updated_at: Date.now(),
            stroke_count: currentStrokeCount,
            entity_count: Math.max(1, Math.ceil(currentStrokeCount / 4)),
            is_compiled: false,
          },
        ];
  const hero = displayList[0];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.sectionHeading}>Workspace Library</Text>
          <Text style={styles.sectionSub}>Immutable .cmn canvases & causal mental models</Text>
        </View>
        <TouchableOpacity style={styles.newCanvasBtn} onPress={onCreateNewCanvas} activeOpacity={0.85}>
          <Plus size={16} color="#FFFFFF" strokeWidth={2.2} />
          <Text style={styles.newCanvasBtnText}>[ + New Canvas ]</Text>
        </TouchableOpacity>
      </View>

      {hero && (
        <TouchableOpacity style={styles.heroCard} onPress={() => onOpenCanvas(hero.map_id)} activeOpacity={0.88}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroTag}>
              <Sparkles size={13} color="#38BDF8" strokeWidth={2.0} />
              <Text style={styles.heroTagText}>CONTINUE STUDYING</Text>
            </View>
            <View style={[styles.statusBadge, hero.is_compiled ? styles.statusVerified : styles.statusUnverified]}>
              <Text style={[styles.statusText, hero.is_compiled ? styles.statusTextVerified : styles.statusTextUnverified]}>
                {hero.is_compiled ? "✓ Verified" : "⚡ Unverified"}
              </Text>
            </View>
          </View>
          <Text style={styles.heroTitle}>{hero.title}</Text>
          <View style={styles.heroMetaRow}>
            <Text style={styles.heroMetaItem}>{Math.max(hero.entity_count, 1)} Knowledge Nodes</Text>
            <Text style={styles.heroMetaDot}>•</Text>
            <Text style={styles.heroMetaItem}>{hero.stroke_count} Ink Strokes</Text>
            <Text style={styles.heroMetaDot}>•</Text>
            <Text style={styles.heroMetaItem}>Updated {formatDate(hero.updated_at)}</Text>
          </View>
        </TouchableOpacity>
      )}

      <Text style={styles.gridHeader}>All Cognitive Canvases ({displayList.length})</Text>
      <View style={styles.grid}>
        {displayList.map((item) => {
          const nodeCount = Math.max(item.entity_count, item.stroke_count > 0 ? 1 : 0);
          return (
            <TouchableOpacity
              key={item.map_id}
              style={styles.canvasCard}
              onPress={() => onOpenCanvas(item.map_id)}
              activeOpacity={0.85}
            >
              <View style={styles.cardTopRow}>
                <View style={styles.iconCircle}>
                  <FileText size={15} color="#38BDF8" strokeWidth={1.9} />
                </View>
                <View style={[styles.statusBadge, item.is_compiled ? styles.statusVerified : styles.statusUnverified]}>
                  {item.is_compiled ? (
                    <Check size={11} color="#10B981" strokeWidth={2.2} />
                  ) : (
                    <Clock size={11} color="#F59E0B" strokeWidth={2.0} />
                  )}
                  <Text style={[styles.statusText, item.is_compiled ? styles.statusTextVerified : styles.statusTextUnverified]}>
                    {item.is_compiled ? "Verified" : "Unverified"}
                  </Text>
                </View>
              </View>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <View style={styles.cardFooter}>
                <View>
                  <Text style={styles.cardNodeCount}>{nodeCount} nodes</Text>
                  <Text style={styles.cardDate}>{formatDate(item.updated_at)}</Text>
                </View>
                {onDeleteCanvas && displayList.length > 1 && (
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => onDeleteCanvas(item.map_id)}>
                    <Trash2 size={13} color="#EF4444" strokeWidth={1.8} />
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B1120" },
  content: { padding: 24, paddingBottom: 48 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  sectionHeading: { color: "#F8FAFC", fontSize: 20, fontWeight: "700" },
  sectionSub: { color: "#94A3B8", fontSize: 12, marginTop: 2 },
  newCanvasBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0284C7",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  newCanvasBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  heroCard: {
    backgroundColor: "#0F172A",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#38BDF8",
    padding: 20,
    marginBottom: 24,
  },
  heroTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  heroTag: { flexDirection: "row", alignItems: "center", gap: 6 },
  heroTagText: { color: "#38BDF8", fontSize: 11, fontWeight: "700", letterSpacing: 0.7 },
  heroTitle: { color: "#F8FAFC", fontSize: 22, fontWeight: "700", marginBottom: 10 },
  heroMetaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  heroMetaItem: { color: "#CBD5E1", fontSize: 12, fontWeight: "600" },
  heroMetaDot: { color: "#475569", fontSize: 12 },
  gridHeader: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  canvasCard: {
    width: "31%",
    minWidth: 230,
    backgroundColor: "#0F172A",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1E293B",
    padding: 16,
    justifyContent: "space-between",
    minHeight: 140,
  },
  cardTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#1E293B",
    alignItems: "center",
    justifyContent: "center",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusVerified: { backgroundColor: "rgba(16, 185, 129, 0.12)", borderColor: "#10B981" },
  statusUnverified: { backgroundColor: "rgba(245, 158, 11, 0.12)", borderColor: "#F59E0B" },
  statusText: { fontSize: 10, fontWeight: "700" },
  statusTextVerified: { color: "#10B981" },
  statusTextUnverified: { color: "#F59E0B" },
  cardTitle: { color: "#F8FAFC", fontSize: 15, fontWeight: "700", marginBottom: 12 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  cardNodeCount: { color: "#38BDF8", fontSize: 12, fontWeight: "700" },
  cardDate: { color: "#64748B", fontSize: 11, marginTop: 2 },
  deleteBtn: { padding: 6, backgroundColor: "#1E293B", borderRadius: 8 },
});
