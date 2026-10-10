import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Modal,
} from "react-native";
import {
  CompiledMacroCognitiveMap,
  VisualASTLayer,
  MacroIsland,
  ProceduralZone,
  RelationalAnchoringSuggestion,
} from "@cognitive-canvas/core/types";
import { useCognitiveLayerStore } from "../../stores/useCognitiveLayerStore";

export interface GhostOverlayProps {
  visualAST?: VisualASTLayer | null;
  canvasScale: number;
  canvasTranslateX: number;
  canvasTranslateY: number;
}

interface IslandBounds {
  island: MacroIsland;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  centerX: number;
  centerY: number;
}

export const GhostOverlay: React.FC<GhostOverlayProps> = ({
  visualAST,
  canvasScale,
  canvasTranslateX,
  canvasTranslateY,
}) => {
  const {
    hasCompiledData,
    isOverlayVisible,
    compiledData,
    subLayers,
    activeInspectTarget,
    focusInspectionTarget,
  } = useCognitiveLayerStore();

  const [activeQuestionPopover, setActiveQuestionPopover] = useState<{
    visible: boolean;
    x: number;
    y: number;
    question: string;
    action: string;
  } | null>(null);

  // Animación de pulso continuo para islas aisladas
  const pulseAnim = useRef(new Animated.Value(0.7)).current;
  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.5,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [pulseAnim]);

  if (!hasCompiledData || !isOverlayVisible || !compiledData) {
    return null;
  }

  const { macro_islands, pedagogical_interventions, high_order_retrieval, map_overview } = compiledData;

  // 1. Calcular límites espaciales (World Space) para cada Macro-Isla
  const islandBoundsList: IslandBounds[] = (macro_islands || [])
    .map((island) => {
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      let foundAny = false;

      (island.associated_entity_ids || []).forEach((entId) => {
        const ent = visualAST?.entities?.find((e) => e.id === entId);
        if (ent?.bbox) {
          foundAny = true;
          if (ent.bbox.xmin < minX) minX = ent.bbox.xmin;
          if (ent.bbox.xmax > maxX) maxX = ent.bbox.xmax;
          if (ent.bbox.ymin < minY) minY = ent.bbox.ymin;
          if (ent.bbox.ymax > maxY) maxY = ent.bbox.ymax;
        }
      });

      if (!foundAny) return null;

      // Dilatación de padding espacial de +30 unidades de mundo
      const PADDING = 30;
      minX -= PADDING;
      maxX += PADDING;
      minY -= PADDING;
      maxY += PADDING;

      return {
        island,
        minX,
        maxX,
        minY,
        maxY,
        centerX: (minX + maxX) / 2,
        centerY: (minY + maxY) / 2,
      };
    })
    .filter((b): b is IslandBounds => b !== null);

  // 2. Puentes rotos: identificar enlaces hacia islas aisladas
  const isolatedIslands = islandBoundsList.filter((b) => b.island.is_isolated);
  const connectedIslands = islandBoundsList.filter((b) => !b.island.is_isolated);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* CAPA 1: Polígonos de Nubes Semánticas de Macro-Islas */}
      {subLayers.showIslands &&
        islandBoundsList.map((ib, idx) => {
          const left = ib.minX * canvasScale + canvasTranslateX;
          const top = ib.minY * canvasScale + canvasTranslateY;
          const width = (ib.maxX - ib.minX) * canvasScale;
          const height = (ib.maxY - ib.minY) * canvasScale;

          if (width <= 0 || height <= 0) return null;

          const isIsolated = ib.island.is_isolated;
          const isFocused = activeInspectTarget === ib.island.island_name;

          return (
            <Animated.View
              key={`island_${idx}`}
              style={[
                styles.islandCloud,
                {
                  left,
                  top,
                  width,
                  height,
                  backgroundColor: isIsolated
                    ? "rgba(245, 158, 11, 0.09)"
                    : "rgba(99, 102, 241, 0.08)",
                  borderColor: isIsolated ? "#F59E0B" : "rgba(99, 102, 241, 0.45)",
                  borderWidth: isFocused ? 2.5 : 1.5,
                  opacity: isIsolated ? pulseAnim : 1.0,
                },
              ]}
            >
              {/* Badge Identificador de Isla */}
              <TouchableOpacity
                style={[
                  styles.islandTag,
                  { backgroundColor: isIsolated ? "#B45309" : "#4338CA" },
                ]}
                onPress={() => focusInspectionTarget(ib.island.island_name)}
                activeOpacity={0.8}
              >
                <Text style={styles.islandTagText}>
                  {isIsolated ? "⚠️ Isla Aislada: " : "🏝️ Isla: "}
                  {ib.island.island_name}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}

      {/* CAPA 2: Puentes Rotos con Badge Socrático [ ? ] entre Islas Aisladas */}
      {subLayers.showIslands &&
        isolatedIslands.map((isolated, idx) => {
          // Conectar con la isla conectada más cercana o la primera disponible
          const target =
            connectedIslands.length > 0
              ? connectedIslands[0]
              : islandBoundsList.find((b) => b !== isolated);

          if (!target) return null;

          const startScreenX = isolated.centerX * canvasScale + canvasTranslateX;
          const startScreenY = isolated.centerY * canvasScale + canvasTranslateY;
          const endScreenX = target.centerX * canvasScale + canvasTranslateX;
          const endScreenY = target.centerY * canvasScale + canvasTranslateY;

          const midScreenX = (startScreenX + endScreenX) / 2;
          const midScreenY = (startScreenY + endScreenY) / 2;

          return (
            <View key={`bridge_${idx}`} style={StyleSheet.absoluteFill} pointerEvents="box-none">
              {/* Badge interactivo circular socrático [ ? ] en el punto medio */}
              <TouchableOpacity
                style={[
                  styles.questionBadge,
                  {
                    left: midScreenX - 22,
                    top: midScreenY - 22,
                  },
                ]}
                onPress={() => {
                  setActiveQuestionPopover({
                    visible: true,
                    x: midScreenX,
                    y: midScreenY,
                    question:
                      high_order_retrieval?.cross_island_causal_question ||
                      "¿Cómo influye esta isla en el resto del mapa?",
                    action:
                      map_overview?.bridge_to_next_level ||
                      "Dibuja un conector con verbo causal para unificar el esquema.",
                  });
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.questionBadgeIcon}>?</Text>
                <View style={styles.badgePulseGlow} />
              </TouchableOpacity>
            </View>
          );
        })}

      {/* CAPA 3: Zonas Procedimentales con Badge de Práctica Deliberada */}
      {subLayers.showProceduralZones &&
        (pedagogical_interventions?.procedural_zones || []).map((zone, zIdx) => {
          let zMinX = Infinity;
          let zMinY = Infinity;
          let found = false;

          (zone.entity_ids || []).forEach((eId) => {
            const ent = visualAST?.entities?.find((e) => e.id === eId);
            if (ent?.bbox) {
              found = true;
              if (ent.bbox.xmin < zMinX) zMinX = ent.bbox.xmin;
              if (ent.bbox.ymin < zMinY) zMinY = ent.bbox.ymin;
            }
          });

          if (!found) return null;

          const left = zMinX * canvasScale + canvasTranslateX;
          const top = zMinY * canvasScale + canvasTranslateY - 32;

          return (
            <View
              key={`zone_${zIdx}`}
              style={[styles.proceduralBadgeContainer, { left, top }]}
              pointerEvents="box-none"
            >
              <View style={styles.proceduralBadge}>
                <Text style={styles.proceduralIcon}>⚡</Text>
                <Text style={styles.proceduralText}>Práctica: {zone.zone_name}</Text>
              </View>
            </View>
          );
        })}

      {/* Micro-Popover Socrático Flotante al presionar [ ? ] */}
      {activeQuestionPopover?.visible && (
        <Modal
          transparent
          animationType="fade"
          visible={activeQuestionPopover.visible}
          onRequestClose={() => setActiveQuestionPopover(null)}
        >
          <TouchableOpacity
            style={styles.popoverBackdrop}
            activeOpacity={1}
            onPress={() => setActiveQuestionPopover(null)}
          >
            <View
              style={[
                styles.popoverCard,
                {
                  position: "absolute",
                  left: Math.max(20, Math.min(activeQuestionPopover.x - 160, 600)),
                  top: Math.max(80, activeQuestionPopover.y - 120),
                },
              ]}
            >
              <View style={styles.popoverHeader}>
                <Text style={styles.popoverHeaderIcon}>🌉</Text>
                <Text style={styles.popoverTitle}>Puente Causal Requerido</Text>
              </View>

              <Text style={styles.popoverQuestionText}>
                "{activeQuestionPopover.question}"
              </Text>

              <View style={styles.popoverActionBox}>
                <Text style={styles.popoverActionTitle}>Acción Pedagógica:</Text>
                <Text style={styles.popoverActionText}>
                  {activeQuestionPopover.action}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.popoverCloseBtn}
                onPress={() => setActiveQuestionPopover(null)}
              >
                <Text style={styles.popoverCloseText}>Entendido</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  islandCloud: {
    position: "absolute",
    borderRadius: 24,
    borderStyle: "dashed",
    padding: 8,
  },
  islandTag: {
    position: "absolute",
    top: -12,
    left: 16,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  islandTagText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  questionBadge: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F59E0B",
    borderWidth: 2.5,
    borderColor: "#FEF3C7",
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#F59E0B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    zIndex: 20,
  },
  questionBadgeIcon: {
    color: "#1E293B",
    fontSize: 22,
    fontWeight: "900",
  },
  badgePulseGlow: {
    position: "absolute",
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: "rgba(245, 158, 11, 0.4)",
  },
  proceduralBadgeContainer: {
    position: "absolute",
    zIndex: 15,
  },
  proceduralBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(6, 78, 59, 0.92)",
    borderColor: "#10B981",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    elevation: 2,
  },
  proceduralIcon: {
    fontSize: 12,
  },
  proceduralText: {
    color: "#6EE7B7",
    fontSize: 11,
    fontWeight: "700",
  },
  popoverBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
  },
  popoverCard: {
    width: 320,
    backgroundColor: "#0F172A",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#F59E0B",
    padding: 18,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  popoverHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  popoverHeaderIcon: {
    fontSize: 18,
  },
  popoverTitle: {
    color: "#FBBF24",
    fontSize: 14,
    fontWeight: "800",
  },
  popoverQuestionText: {
    color: "#F1F5F9",
    fontSize: 13,
    lineHeight: 19,
    fontStyle: "italic",
    marginBottom: 12,
  },
  popoverActionBox: {
    backgroundColor: "#1E293B",
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    borderLeftWidth: 3,
    borderLeftColor: "#38BDF8",
  },
  popoverActionTitle: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 4,
  },
  popoverActionText: {
    color: "#BAE6FD",
    fontSize: 12,
    lineHeight: 17,
  },
  popoverCloseBtn: {
    backgroundColor: "#334155",
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
  popoverCloseText: {
    color: "#F8FAFC",
    fontSize: 12,
    fontWeight: "700",
  },
});
