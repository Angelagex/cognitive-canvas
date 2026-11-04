import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, Dimensions, ScrollView, TouchableOpacity } from "react-native";
import * as Haptics from "expo-haptics";
import { MatrixGraphView } from "../components/MatrixGraphView";
import { getDomainColor } from "../utils/domainColors";
import { VinkLogo } from "../../../components/brand";
import { useAppTheme } from "../../../theme";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export interface KnowledgeMatrixScreenProps {
  matrixData: any;
  onExport?: () => void;
  onNavigateToCanvas?: (canvasId: string, boundingBox?: any) => void;
}

export const KnowledgeMatrixScreen: React.FC<KnowledgeMatrixScreenProps> = ({
  matrixData,
  onExport,
  onNavigateToCanvas,
}) => {
  const { theme } = useAppTheme();
  const [selectedField, setSelectedField] = useState<string>("Todos los Campos");
  const [, setRenderTrigger] = useState(0);

  const handleNodeDragStart = (nodeId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const node = matrixData?.nodes?.find((n: any) => n.id === nodeId);
    if (node) {
      node.fx = node.x;
      node.fy = node.y;
    }
  };

  const handleNodeDragMove = (nodeId: string, currentWorldX: number, currentWorldY: number) => {
    const node = matrixData?.nodes?.find((n: any) => n.id === nodeId);
    if (node) {
      node.fx = currentWorldX;
      node.fy = currentWorldY;
      setRenderTrigger((prev) => prev + 1);
    }
  };

  const handleNodeDragEnd = (nodeId: string) => {
    const node = matrixData?.nodes?.find((n: any) => n.id === nodeId);
    if (node) {
      node.fx = null;
      node.fy = null;
      setRenderTrigger((prev) => prev + 1);
    }
  };

  // Extraer Campos únicos (Level 1 de Ontología)
  const availableFields = useMemo(() => {
    const fields = new Set<string>();
    matrixData?.nodes?.forEach((n: any) => {
      const f = n.field || n.domain;
      if (f && f !== "<3" && f !== "node" && f.trim().length > 0) {
        fields.add(f);
      }
    });
    return ["Todos los Campos", ...Array.from(fields)];
  }, [matrixData]);

  // Filtrado de nodos por Campo
  const filteredNodes = useMemo(() => {
    if (!matrixData?.nodes) return [];
    if (selectedField === "Todos los Campos") {
      return matrixData.nodes.filter((n: any) => n.domain !== "<3");
    }
    return matrixData.nodes.filter((n: any) => (n.field || n.domain) === selectedField);
  }, [matrixData, selectedField]);

  const filteredEdges = useMemo(() => {
    if (!matrixData?.edges) return [];
    const visibleIds = new Set(filteredNodes.map((n: any) => n.id));
    return matrixData.edges.filter(
      (e: any) => visibleIds.has(e.fromNodeId || e.source) && visibleIds.has(e.toNodeId || e.target)
    );
  }, [matrixData, filteredNodes]);

  const activeMacroDomain = useMemo(() => {
    const node = filteredNodes.find((n: any) => n.macroDomain);
    return node?.macroDomain || "Ciencias de la Computación & Software";
  }, [filteredNodes]);

  const activeScheme = useMemo(() => {
    if (selectedField === "Todos los Campos") return null;
    const node = filteredNodes.find((n: any) => n.scheme);
    return node?.scheme || null;
  }, [filteredNodes, selectedField]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bgApp }]}>
      {/* 1. Header con métricas y exportación */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.colors.bgHeader,
            borderBottomColor: theme.colors.borderSubtle,
          },
        ]}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <VinkLogo
            showIcon={false}
            wordmarkHeight={18}
            wordmarkColor={theme.colors.textPrimary}
          />
          <View style={{ width: 1, height: 22, backgroundColor: theme.colors.borderSubtle }} />
          <View>
            <Text
              style={[
                styles.title,
                theme.typography.display,
                { color: theme.colors.textPrimary },
              ]}
            >
              Knowledge Matrix · Force-Directed DAG
            </Text>
            <Text
              style={[
                styles.subtitle,
                theme.typography.body,
                { color: theme.colors.textSecondary },
              ]}
            >
              {filteredNodes.length} conceptos canónicos activos
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            onExport?.();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          }}
          style={[
            styles.exportBtn,
            {
              backgroundColor: theme.colors.badgeBg,
              borderColor: theme.colors.badgeBorder,
            },
          ]}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.exportBtnText,
              theme.typography.bodyBold,
              { color: theme.colors.accentPrimary },
            ]}
          >
            Exportar Matriz (JSON)
          </Text>
        </TouchableOpacity>
      </View>

      {/* 2. Barra de Ontología Jerárquica (MacroDomain > Field > Scheme) */}
      <View
        style={[
          styles.ontologyHeader,
          {
            backgroundColor: theme.colors.bgHeader,
            borderBottomColor: theme.colors.borderSubtle,
          },
        ]}
      >
        <View style={styles.breadcrumbRow}>
          <Text
            style={[
              styles.macroDomainLabel,
              theme.typography.monoBold,
              { color: theme.colors.textMuted },
            ]}
          >
            {activeMacroDomain}
          </Text>
          {activeScheme && (
            <Text
              style={[
                styles.schemeLabel,
                theme.typography.mono,
                { color: theme.colors.accentPrimary },
              ]}
            >
              {" › "}
              {activeScheme}
            </Text>
          )}
        </View>
        <ScrollView
          contentContainerStyle={styles.fieldScroll}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {availableFields.map((field) => {
            const isSelected = selectedField === field;
            const fieldColor = field === "Todos los Campos" ? theme.colors.accentPrimary : getDomainColor(field).stroke;
            return (
              <TouchableOpacity
                key={field}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  setSelectedField(field);
                }}
                style={[
                  styles.fieldChip,
                  {
                    backgroundColor: isSelected ? fieldColor + "20" : theme.colors.pillInactiveBg,
                    borderColor: isSelected ? fieldColor : theme.colors.borderSubtle,
                  },
                ]}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.fieldChipText,
                    isSelected ? theme.typography.bodyBold : theme.typography.body,
                    { color: isSelected ? "#FFFFFF" : fieldColor },
                  ]}
                >
                  {field}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 3. Viewport del Grafo garantizando dimensiones no nulas */}
      <View style={styles.graphContainer}>
        {filteredNodes.length > 0 ? (
          <MatrixGraphView
            nodes={filteredNodes}
            edges={filteredEdges}
            width={SCREEN_WIDTH}
            height={SCREEN_HEIGHT - 170}
            onNodeDragStart={handleNodeDragStart}
            onNodeDragMove={handleNodeDragMove}
            onNodeDragEnd={handleNodeDragEnd}
            onSelectNode={(nodeOrId: any) => {
              const node =
                typeof nodeOrId === "string"
                  ? filteredNodes.find((n: any) => n.id === nodeOrId)
                  : nodeOrId;
              if (node?.provenance && node.provenance[0]) {
                onNavigateToCanvas?.(node.provenance[0].canvasId, node.provenance[0].boundingBox);
              }
            }}
          />
        ) : (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, theme.typography.body, { color: theme.colors.textMuted }]}>
              No hay conceptos para el campo seleccionado.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0F1D",
  },
  header: {
    height: 60,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
    backgroundColor: "#0F172A",
  },
  title: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "700",
  },
  subtitle: {
    color: "#94A3B8",
    fontSize: 11,
  },
  exportBtn: {
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#38BDF8",
  },
  exportBtnText: {
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: "600",
  },
  ontologyHeader: {
    backgroundColor: "#0B132B",
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
    paddingVertical: 6,
  },
  breadcrumbRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  macroDomainLabel: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  schemeLabel: {
    color: "#38BDF8",
    fontSize: 11,
    fontWeight: "600",
  },
  fieldScroll: {
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 8,
  },
  fieldChip: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 15,
    backgroundColor: "#1E293B",
    borderWidth: 1,
    borderColor: "#334155",
    justifyContent: "center",
    alignItems: "center",
  },
  fieldChipText: {
    fontSize: 12,
  },
  graphContainer: {
    flex: 1,
    width: "100%",
    height: "100%",
    position: "relative",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: "#64748B",
    fontSize: 14,
  },
});
