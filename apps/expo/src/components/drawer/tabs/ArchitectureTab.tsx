import React, { useState } from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { ChevronDown, ChevronRight, Crosshair } from "@sketchyicons/react-native";
import { KnowledgeNode, ConceptTier } from "@cognitive-canvas/core";
import { useSkin, fonts, radius, border, domainColors } from "../../../theme";

export interface ArchitectureTabProps {
  nodes: KnowledgeNode[];
  onFocus: (node: KnowledgeNode) => void;
}

const TIER_META: Record<
  ConceptTier,
  { label: string; tierNum: string; defaultColor: string }
> = {
  system: { label: "Sistemas & Topología Macro", tierNum: "NIVEL 2", defaultColor: "#A855F7" },
  mechanism: { label: "Mecanismos Causales", tierNum: "NIVEL 1", defaultColor: "#2563EB" },
  primitive: { label: "Fundamentos & Primitivas", tierNum: "NIVEL 0", defaultColor: "#10B981" },
};

export const ArchitectureTab: React.FC<ArchitectureTabProps> = ({ nodes, onFocus }) => {
  const { skin } = useSkin();
  const tiers: ConceptTier[] = ["system", "mechanism", "primitive"];

  // Niveles colapsables: por defecto todos abiertos
  const [collapsedTiers, setCollapsedTiers] = useState<Record<ConceptTier, boolean>>({
    system: false,
    mechanism: false,
    primitive: false,
  });

  // Tarjetas secundarias colapsadas por id de nodo
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  const toggleTier = (tier: ConceptTier) => {
    setCollapsedTiers((prev) => ({ ...prev, [tier]: !prev[tier] }));
  };

  const toggleNodeExpand = (nodeId: string) => {
    setExpandedNodes((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  return (
    <View style={styles.container}>
      {tiers.map((tierKey) => {
        const tierNodes = nodes.filter((n) => n.tier === tierKey);
        if (tierNodes.length === 0) return null;
        const meta = TIER_META[tierKey];
        const isCollapsed = collapsedTiers[tierKey];

        return (
          <View key={tierKey} style={styles.tierSection}>
            {/* Header del Nivel (Colapsable) */}
            <TouchableOpacity
              style={[
                styles.tierHeaderRow,
                {
                  backgroundColor: skin.surfaceAlt,
                  borderColor: skin.borderSoft,
                  borderWidth: border.soft,
                  borderRadius: radius.pill,
                },
              ]}
              onPress={() => toggleTier(tierKey)}
              activeOpacity={0.75}
            >
              <View style={styles.tierLeftCol}>
                <View
                  style={[
                    styles.tierNumBadge,
                    {
                      backgroundColor: `${meta.defaultColor}22`,
                      borderColor: meta.defaultColor,
                      borderWidth: border.soft,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.tierNumBadgeText,
                      { color: meta.defaultColor, fontFamily: fonts.monoBold },
                    ]}
                  >
                    {meta.tierNum}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.tierTitle,
                    { color: skin.text, fontFamily: fonts.uiBold },
                  ]}
                >
                  {meta.label}
                </Text>
              </View>

              <View style={styles.tierRightCol}>
                <Text
                  style={[
                    styles.tierCountText,
                    { color: skin.textMuted, fontFamily: fonts.mono },
                  ]}
                >
                  {tierNodes.length}
                </Text>
                {isCollapsed ? (
                  <ChevronRight size={14} color={skin.textMuted} strokeWidth={2.0} />
                ) : (
                  <ChevronDown size={14} color={skin.textMuted} strokeWidth={2.0} />
                )}
              </View>
            </TouchableOpacity>

            {/* Lista de nodos del nivel */}
            {!isCollapsed && (
              <View style={styles.nodesList}>
                {tierNodes.map((node) => {
                  const domainHash = Math.abs(
                    (node.domain || "General").split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
                  );
                  const domainColor: string = domainColors[domainHash % domainColors.length] || skin.primary;
                  const isExpanded = expandedNodes[node.id] ?? false;
                  const hasDetails = Boolean(
                    node.invariant || node.fragility || node.tradeoff || node.summary
                  );

                  return (
                    <View
                      key={node.id}
                      style={[
                        styles.nodeCard,
                        {
                          backgroundColor: skin.surface,
                          borderColor: skin.borderSoft,
                          borderWidth: border.soft,
                          borderRadius: radius.card,
                        },
                      ]}
                    >
                      {/* Cabecera del Nodo: Título, Dominio y Acción Enfocar */}
                      <View style={styles.nodeHeader}>
                        <TouchableOpacity
                          style={styles.nodeTitleTouch}
                          onPress={() => hasDetails && toggleNodeExpand(node.id)}
                          activeOpacity={hasDetails ? 0.7 : 1}
                        >
                          <Text
                            style={[
                              styles.nodeLabel,
                              {
                                color: skin.text,
                                fontFamily: fonts.display,
                                letterSpacing: 0.5,
                              },
                            ]}
                          >
                            {node.label.toUpperCase()}
                          </Text>
                          {!!node.domain && (
                            <View
                              style={[
                                styles.domainBadge,
                                {
                                  borderColor: domainColor,
                                  backgroundColor: `${domainColor}16`,
                                  borderRadius: radius.pill,
                                  borderWidth: border.soft,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.domainBadgeText,
                                  { color: domainColor, fontFamily: fonts.monoBold },
                                ]}
                              >
                                {node.domain}
                              </Text>
                            </View>
                          )}
                        </TouchableOpacity>

                        {/* Botón Enfocar en Lienzo */}
                        <TouchableOpacity
                          onPress={() => onFocus(node)}
                          style={[
                            styles.focusIconButton,
                            {
                              backgroundColor: skin.surfaceAlt,
                              borderColor: skin.borderSoft,
                              borderWidth: border.soft,
                              borderRadius: radius.pill,
                            },
                          ]}
                          activeOpacity={0.75}
                          accessibilityLabel={`Enfocar ${node.label} en lienzo`}
                        >
                          <Crosshair size={14} color={skin.primary} strokeWidth={2.0} />
                        </TouchableOpacity>
                      </View>

                      {/* Tres contratos (Triada Causal Vink):
                          INVARIANTE (Cobalto) · PUNTO DE QUIEBRE (Coral) · TRADE-OFF (Ámbar)
                      */}
                      {node.invariant ? (
                        <View style={styles.contractRow}>
                          <Text
                            style={[
                              styles.contractTag,
                              {
                                color: skin.primary,
                                fontFamily: fonts.monoBold,
                              },
                            ]}
                          >
                            INVARIANTE
                          </Text>
                          <Text
                            style={[
                              styles.contractBody,
                              { color: skin.text, fontFamily: fonts.ui },
                            ]}
                          >
                            {node.invariant}
                          </Text>
                        </View>
                      ) : null}

                      {/* Fragility y Trade-off se muestran siempre o al expandir si el nodo tiene invariant */}
                      {(!node.invariant || isExpanded) && node.fragility ? (
                        <View style={styles.contractRow}>
                          <Text
                            style={[
                              styles.contractTag,
                              {
                                color: skin.alert,
                                fontFamily: fonts.monoBold,
                              },
                            ]}
                          >
                            PUNTO DE QUIEBRE
                          </Text>
                          <Text
                            style={[
                              styles.contractBody,
                              { color: skin.text, fontFamily: fonts.ui },
                            ]}
                          >
                            {node.fragility}
                          </Text>
                        </View>
                      ) : null}

                      {(!node.invariant || isExpanded) && node.tradeoff ? (
                        <View style={styles.contractRow}>
                          <Text
                            style={[
                              styles.contractTag,
                              {
                                color: skin.warm,
                                fontFamily: fonts.monoBold,
                              },
                            ]}
                          >
                            TRADE-OFF
                          </Text>
                          <Text
                            style={[
                              styles.contractBody,
                              { color: skin.text, fontFamily: fonts.ui },
                            ]}
                          >
                            {node.tradeoff}
                          </Text>
                        </View>
                      ) : null}

                      {node.summary && !node.invariant ? (
                        <View style={styles.contractRow}>
                          <Text
                            style={[
                              styles.contractTag,
                              {
                                color: skin.textMuted,
                                fontFamily: fonts.monoBold,
                              },
                            ]}
                          >
                            SÍNTESIS
                          </Text>
                          <Text
                            style={[
                              styles.contractBody,
                              { color: skin.text, fontFamily: fonts.ui },
                            ]}
                          >
                            {node.summary}
                          </Text>
                        </View>
                      ) : null}

                      {/* Si hay contratos adicionales colapsados, botón sutil para ver más */}
                      {Boolean(node.invariant && (node.fragility || node.tradeoff)) && (
                        <TouchableOpacity
                          style={styles.expandToggle}
                          onPress={() => toggleNodeExpand(node.id)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.expandToggleText,
                              { color: skin.textMuted, fontFamily: fonts.mono },
                            ]}
                          >
                            {isExpanded
                              ? "Menos contratos ▴"
                              : `+${Number(!!node.fragility) + Number(!!node.tradeoff)} contratos (quiebre / trade-off) ▾`}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  tierSection: {
    gap: 8,
  },
  tierHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  tierLeftCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  tierNumBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tierNumBadgeText: {
    fontSize: 10,
    letterSpacing: 0.8,
  },
  tierTitle: {
    fontSize: 12,
    letterSpacing: 0.2,
  },
  tierRightCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tierCountText: {
    fontSize: 11,
  },
  nodesList: {
    gap: 8,
  },
  nodeCard: {
    padding: 12,
    gap: 8,
  },
  nodeHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  nodeTitleTouch: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  nodeLabel: {
    fontSize: 15,
  },
  domainBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  domainBadgeText: {
    fontSize: 9,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  focusIconButton: {
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  contractRow: {
    gap: 2,
    paddingTop: 4,
  },
  contractTag: {
    fontSize: 10,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  contractBody: {
    fontSize: 12,
    lineHeight: 17,
  },
  expandToggle: {
    paddingTop: 4,
  },
  expandToggleText: {
    fontSize: 10,
  },
});
