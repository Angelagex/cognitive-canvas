import React from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { KnowledgeNode, ConceptTier } from "@cognitive-canvas/core";
import { DOMAIN_THEMES } from "../../../features/matrix/components/MatrixGraphView";

export interface ArchitectureTabProps {
  nodes: KnowledgeNode[];
  onFocus: (node: KnowledgeNode) => void;
}

const TIER_HEADERS: Record<ConceptTier, { title: string; color: string; badge: string }> = {
  system: { title: "Sistemas y Topología Macro", color: "#C084FC", badge: "Tier 2" },
  mechanism: { title: "Mecanismos y Protocolos Causales", color: "#38BDF8", badge: "Tier 1" },
  primitive: { title: "Primitivas y Definiciones Atómicas", color: "#34D399", badge: "Tier 0" },
};

export const ArchitectureTab: React.FC<ArchitectureTabProps> = ({ nodes, onFocus }) => {
  const tiers: ConceptTier[] = ["system", "mechanism", "primitive"];

  return (
    <View style={styles.container}>
      {tiers.map((tierKey) => {
        const tierNodes = nodes.filter((n) => n.tier === tierKey);
        if (tierNodes.length === 0) return null;
        const tierInfo = TIER_HEADERS[tierKey];

        return (
          <View key={tierKey} style={styles.tierSection}>
            <View style={styles.tierHeaderRow}>
              <View style={[styles.tierPill, { borderColor: tierInfo.color }]}>
                <Text style={[styles.tierPillText, { color: tierInfo.color }]}>{tierInfo.badge}</Text>
              </View>
              <Text style={styles.tierTitle}>
                {tierInfo.title} ({tierNodes.length})
              </Text>
            </View>

            {tierNodes.map((node) => {
              const theme = DOMAIN_THEMES[node.domain] || { stroke: "#38BDF8" };

              return (
                <View key={node.id} style={styles.nodeCard}>
                  <View style={styles.nodeHeader}>
                    <Text style={styles.nodeLabel}>{node.label}</Text>
                    {!!node.domain && (
                      <View style={[styles.domainBadge, { borderColor: theme.stroke }]}>
                        <Text style={[styles.domainBadgeText, { color: theme.stroke }]}>
                          {node.domain}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Deep Systems Triad */}
                  {node.invariant ? (
                    <View style={styles.sectionRow}>
                      <Text style={styles.sectionTitle}>⚖️ Invariante Causal:</Text>
                      <Text style={styles.sectionBody}>{node.invariant}</Text>
                    </View>
                  ) : null}

                  {node.fragility ? (
                    <View style={styles.sectionRow}>
                      <Text style={styles.sectionTitle}>💥 Punto de Quiebre:</Text>
                      <Text style={styles.sectionBody}>{node.fragility}</Text>
                    </View>
                  ) : null}

                  {node.tradeoff ? (
                    <View style={styles.sectionRow}>
                      <Text style={styles.sectionTitle}>🔄 Compensación (Trade-off):</Text>
                      <Text style={styles.sectionBody}>{node.tradeoff}</Text>
                    </View>
                  ) : null}

                  {node.summary && !node.invariant ? (
                    <View style={styles.sectionRow}>
                      <Text style={styles.sectionTitle}>📝 Síntesis Mecánica:</Text>
                      <Text style={styles.sectionBody}>{node.summary}</Text>
                    </View>
                  ) : null}

                  <TouchableOpacity
                    onPress={() => onFocus(node)}
                    style={styles.focusButton}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.focusButtonText}>🎯 Enfocar en Lienzo</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: 16 },
  tierSection: { gap: 10 },
  tierHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4, marginBottom: 2 },
  tierPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5, borderWidth: 1, backgroundColor: "#0F172A" },
  tierPillText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  tierTitle: { color: "#F8FAFC", fontSize: 13, fontWeight: "700" },
  nodeCard: {
    backgroundColor: "#0F172A",
    borderColor: "#1E293B",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  nodeHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  nodeLabel: { color: "#F8FAFC", fontSize: 14, fontWeight: "700", flex: 1 },
  domainBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, backgroundColor: "#090D16" },
  domainBadgeText: { fontSize: 10, fontWeight: "700" },
  sectionRow: { gap: 2, marginTop: 2 },
  sectionTitle: { color: "#94A3B8", fontSize: 11, fontWeight: "700" },
  sectionBody: { color: "#E2E8F0", fontSize: 12, lineHeight: 17 },
  focusButton: {
    marginTop: 6,
    alignSelf: "flex-start",
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    borderColor: "#38BDF8",
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  focusButtonText: { color: "#38BDF8", fontSize: 12, fontWeight: "700" },
});

