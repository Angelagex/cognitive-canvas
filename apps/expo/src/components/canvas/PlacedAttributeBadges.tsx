import React, { useState } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Pressable } from "react-native";
import { Settings, Lightbulb, FlaskConical, X, Trash2, Zap, ExternalLink } from "@sketchyicons/react-native";
import { PlacedAttribute, EntityBoundingBox, SynthesisReferenceCard } from "../../types/canvas";
import type { VisualASTEntity } from "@cognitive-canvas/core";
import { styles } from "./PlacedAttributeBadges.styles";

const ATTRIBUTE_STYLE_MAP = {
  ANALOGY: {
    bgColor: "#312E81",
    borderColor: "#818CF8",
    textColor: "#C7D2FE",
    label: "Analogía",
    underGlowColor: "rgba(168, 85, 247, 0.12)",
    underGlowBorder: "rgba(168, 85, 247, 0.35)",
    pinBg: "#3B0764",
    pinBorder: "#C084FC",
  },
  CAUSAL_MECHANISM: {
    bgColor: "#0C4A6E",
    borderColor: "#38BDF8",
    textColor: "#BAE6FD",
    label: "Mecanismo Causal",
    underGlowColor: "rgba(56, 189, 248, 0.12)",
    underGlowBorder: "rgba(56, 189, 248, 0.35)",
    pinBg: "#0C4A6E",
    pinBorder: "#38BDF8",
  },
  EVIDENCE: {
    bgColor: "#064E3B",
    borderColor: "#34D399",
    textColor: "#A7F3D0",
    label: "Evidencia Empírica",
    underGlowColor: "rgba(251, 191, 36, 0.12)",
    underGlowBorder: "rgba(251, 191, 36, 0.35)",
    pinBg: "#78350F",
    pinBorder: "#FBBF24",
  },
} as const;

const renderAttributeIcon = (type: PlacedAttribute["type"], size: number, color: string) => {
  if (type === "ANALOGY") return <Lightbulb size={size} color={color} strokeWidth={1.8} />;
  if (type === "CAUSAL_MECHANISM") return <Settings size={size} color={color} strokeWidth={1.8} />;
  return <FlaskConical size={size} color={color} strokeWidth={1.8} />;
};

export interface PlacedAttributeBadgesProps {
  attributes: PlacedAttribute[];
  synthesisCards?: SynthesisReferenceCard[];
  canvasScale: number;
  canvasTranslateX: number;
  canvasTranslateY: number;
  hoveredAttribute?: PlacedAttribute | null;
  activeAnchorEntityId?: string | null;
  hoveredEntityBounds?: EntityBoundingBox | null;
  activeEntityBounds?: EntityBoundingBox | null;
  hoveredEntity?: VisualASTEntity | null;
  unclusteredStrokesInEntity?: Array<{ id: string; bbox: EntityBoundingBox }> | null;
  anchorTooltip?: { visible: boolean; worldX: number; worldY: number } | null;
  hoverScreenX?: number;
  hoverScreenY?: number;
  onDeleteAttribute: (id: string) => void;
  onOpenCompiler: () => void;
  onBadgeHover?: (attr: PlacedAttribute | null, screenX?: number, screenY?: number) => void;
  onOpenConsolidatedCanvas?: (targetCanvasId: string) => void;
}

export const PlacedAttributeBadges: React.FC<PlacedAttributeBadgesProps> = ({
  attributes,
  synthesisCards = [],
  canvasScale,
  canvasTranslateX,
  canvasTranslateY,
  hoveredAttribute,
  activeAnchorEntityId,
  hoverScreenX = 0,
  hoverScreenY = 0,
  onDeleteAttribute,
  onOpenCompiler,
  onBadgeHover,
  onOpenConsolidatedCanvas,
}) => {
  const [selectedAttr, setSelectedAttr] = useState<PlacedAttribute | null>(null);
  const leftCards = synthesisCards.filter((c) => c.side === "left");
  const rightCards = synthesisCards.filter((c) => c.side === "right");

  const renderSynthesisMargin = (cards: SynthesisReferenceCard[], style: object) =>
    cards.length > 0 ? (
      <View style={style} pointerEvents="box-none">
        {cards.map((c) => (
          <View key={c.id} style={styles.synthesisCard}>
            <Text style={styles.synthesisCardSource}>{c.sourceCanvasTitle}</Text>
            <Text style={styles.synthesisCardTitle}>{c.label}</Text>
            <Text style={styles.synthesisCardSummary} numberOfLines={3}>{c.summary}</Text>
          </View>
        ))}
      </View>
    ) : null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {attributes.map((attr) => {
        if (!attr.entityBounds) return null;
        const s = ATTRIBUTE_STYLE_MAP[attr.type];
        const left = (attr.entityBounds.xmin - 12) * canvasScale + canvasTranslateX;
        const top = (attr.entityBounds.ymin - 12) * canvasScale + canvasTranslateY;
        const width = Math.max(24, (attr.entityBounds.xmax - attr.entityBounds.xmin + 24) * canvasScale);
        const height = Math.max(24, (attr.entityBounds.ymax - attr.entityBounds.ymin + 24) * canvasScale);
        return (
          <View
            key={`underglow_${attr.id}`}
            pointerEvents="none"
            style={[styles.underGlowCapsule, { left, top, width, height, backgroundColor: s.underGlowColor, borderColor: s.underGlowBorder }]}
          />
        );
      })}

      {attributes.map((attr) => {
        if (!attr.consolidatedRef) return null;
        const left = (attr.entityBounds ? attr.entityBounds.xmin : attr.worldX) * canvasScale + canvasTranslateX;
        const top = (attr.entityBounds ? attr.entityBounds.ymin : attr.worldY) * canvasScale + canvasTranslateY - 34;
        return (
          <TouchableOpacity
            key={`consolidated_${attr.id}`}
            style={[styles.consolidatedBadgeBtn, { left, top }]}
            onPress={() => onOpenConsolidatedCanvas?.(attr.consolidatedRef!.targetCanvasId)}
            activeOpacity={0.85}
          >
            <ExternalLink size={11} color="#38BDF8" strokeWidth={2.0} />
            <Text style={styles.consolidatedBadgeText}>[↗ Consolidated in Master]</Text>
          </TouchableOpacity>
        );
      })}

      {renderSynthesisMargin(leftCards, styles.synthesisMarginLeft)}
      {renderSynthesisMargin(rightCards, styles.synthesisMarginRight)}

      {attributes.map((attr) => {
        const s = ATTRIBUTE_STYLE_MAP[attr.type];
        if (attr.entityBounds) {
          const left = attr.entityBounds.xmax * canvasScale + canvasTranslateX - 4;
          const top = attr.entityBounds.ymin * canvasScale + canvasTranslateY - 12;
          return (
            <TouchableOpacity
              key={`pin_${attr.id}`}
              style={[styles.anchorPinBtn, { left, top, backgroundColor: s.pinBg, borderColor: s.pinBorder }]}
              onPress={() => setSelectedAttr(attr)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.8}
            >
              {renderAttributeIcon(attr.type, 11, s.textColor)}
            </TouchableOpacity>
          );
        }

        const screenX = attr.worldX * canvasScale + canvasTranslateX;
        const screenY = attr.worldY * canvasScale + canvasTranslateY;
        const hasHalo = hoveredAttribute?.id === attr.id || activeAnchorEntityId === attr.id;
        return (
          <View
            key={attr.id}
            style={[styles.badgeWrapper, { left: screenX, top: screenY, transform: [{ scale: Math.min(1.2, Math.max(0.7, canvasScale)) }] }]}
          >
            {hasHalo && <View style={styles.haloAura} pointerEvents="none" />}
            <Pressable
              style={[
                styles.badgeContainer,
                { backgroundColor: s.bgColor, borderColor: hasHalo ? "#38BDF8" : s.borderColor, borderWidth: hasHalo ? 2 : 1.5 },
                hasHalo && styles.badgeHaloGlow,
              ]}
              onPress={() => setSelectedAttr(attr)}
              onHoverIn={() => onBadgeHover?.(attr, screenX, screenY)}
              onHoverOut={() => onBadgeHover?.(null)}
            >
              {renderAttributeIcon(attr.type, 11, s.textColor)}
              <Text style={[styles.badgeText, { color: s.textColor }]}>{attr.title}</Text>
            </Pressable>
          </View>
        );
      })}

      {hoveredAttribute && (
        <View
          pointerEvents="none"
          style={[styles.hoverCard, { left: Math.max(16, hoverScreenX - 100), top: Math.max(16, hoverScreenY - 110) }]}
        >
          <View style={styles.hoverHeader}>
            {renderAttributeIcon(hoveredAttribute.type, 12, ATTRIBUTE_STYLE_MAP[hoveredAttribute.type].textColor)}
            <Text style={styles.hoverType}>{ATTRIBUTE_STYLE_MAP[hoveredAttribute.type].label}</Text>
          </View>
          <Text style={styles.hoverTitle} numberOfLines={1}>{hoveredAttribute.title}</Text>
          {hoveredAttribute.note ? <Text style={styles.hoverNote} numberOfLines={2}>{hoveredAttribute.note}</Text> : null}
        </View>
      )}

      {selectedAttr !== null && (
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedAttr(null)}>
          <Pressable style={styles.card} onPress={() => {}}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                {renderAttributeIcon(selectedAttr.type, 16, ATTRIBUTE_STYLE_MAP[selectedAttr.type].textColor)}
                <Text style={styles.cardTitle}>{ATTRIBUTE_STYLE_MAP[selectedAttr.type].label}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedAttr(null)} style={styles.closeBtn}>
                <X size={16} color="#94A3B8" strokeWidth={2.0} />
              </TouchableOpacity>
            </View>
            <Text style={styles.cardConceptTitle}>{selectedAttr.title}</Text>
            <Text style={styles.cardNote}>{selectedAttr.thinkingMemo?.transcript || selectedAttr.note}</Text>
            <View style={styles.cardFooter}>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => {
                  onDeleteAttribute(selectedAttr.id);
                  setSelectedAttr(null);
                }}
              >
                <Trash2 size={13} color="#EF4444" strokeWidth={1.8} />
                <Text style={styles.deleteBtnText}>Eliminar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.inspectBtn}
                onPress={() => {
                  setSelectedAttr(null);
                  onOpenCompiler();
                }}
              >
                <Zap size={13} color="#FBBF24" strokeWidth={2.0} />
                <Text style={styles.inspectBtnText}>Auditar en GRINDE</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      )}
    </View>
  );
};
