import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, Dimensions, ScrollView, TouchableOpacity } from "react-native";
import { MatrixGraphView } from "../components/MatrixGraphView";
import { getDomainColor } from "../utils/domainColors";

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
  const [selectedDomain, setSelectedDomain] = useState<string>("All");

  const availableDomains = useMemo(() => {
    const domains = new Set<string>();
    matrixData?.nodes?.forEach((n: any) => {
      if (n.domain && n.domain.trim().length > 0 && n.domain !== "<3") {
        domains.add(n.domain);
      }
    });
    return ["All", ...Array.from(domains)];
  }, [matrixData]);

  const filteredNodes = useMemo(() => {
    if (!matrixData?.nodes) return [];
    if (selectedDomain === "All") {
      return matrixData.nodes.filter((n: any) => n.domain !== "<3");
    }
    return matrixData.nodes.filter((n: any) => n.domain === selectedDomain);
  }, [matrixData, selectedDomain]);

  const filteredEdges = useMemo(() => {
    if (!matrixData?.edges) return [];
    const visibleIds = new Set(filteredNodes.map((n: any) => n.id));
    return matrixData.edges.filter(
      (e: any) => visibleIds.has(e.fromNodeId) && visibleIds.has(e.toNodeId)
    );
  }, [matrixData, filteredNodes]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Knowledge Matrix · Force-Directed DAG</Text>
          <Text style={styles.subtitle}>
            {filteredNodes.length} conceptos canónicos activos
          </Text>
        </View>
        <TouchableOpacity onPress={onExport} style={styles.exportBtn} activeOpacity={0.8}>
          <Text style={styles.exportBtnText}>Exportar Matriz (JSON)</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterBar}>
        <ScrollView contentContainerStyle={styles.filterScroll} horizontal showsHorizontalScrollIndicator={false}>
          {availableDomains.map((domain) => {
            const isSelected = selectedDomain === domain;
            const domainColor = domain === "All" ? "#38BDF8" : getDomainColor(domain).stroke;
            return (
              <TouchableOpacity
                key={domain}
                onPress={() => setSelectedDomain(domain)}
                style={[
                  styles.chip,
                  isSelected && { backgroundColor: domainColor + "25", borderColor: domainColor },
                ]}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, { color: domainColor, fontWeight: isSelected ? "700" : "500" }]}>
                  {domain}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.graphContainer}>
        {filteredNodes.length > 0 ? (
          <MatrixGraphView
            nodes={filteredNodes}
            edges={filteredEdges}
            width={SCREEN_WIDTH}
            height={SCREEN_HEIGHT - 160}
            onSelectNode={(nodeId: string | null) => {
              if (nodeId) {
                const node = filteredNodes.find((n: any) => n.id === nodeId);
                if (node?.provenance && node.provenance[0]) {
                  onNavigateToCanvas?.(node.provenance[0].canvasId, node.provenance[0].boundingBox);
                }
              }
            }}
          />
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No hay conceptos para el dominio seleccionado.</Text>
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
    height: 64,
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
    fontSize: 16,
    fontWeight: "700",
  },
  subtitle: {
    color: "#94A3B8",
    fontSize: 12,
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
  filterBar: {
    height: 48,
    backgroundColor: "#0B132B",
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
    justifyContent: "center",
  },
  filterScroll: {
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 8,
  },
  chip: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 15,
    backgroundColor: "#1E293B",
    borderWidth: 1,
    borderColor: "#334155",
    justifyContent: "center",
    alignItems: "center",
  },
  chipText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "500",
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

