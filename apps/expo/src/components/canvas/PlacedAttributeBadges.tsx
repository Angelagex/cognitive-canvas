import React, { useState } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Pressable, Modal, TouchableWithoutFeedback } from "react-native";
import { PlacedAttribute } from "../../types/canvas";

interface PlacedAttributeBadgesProps {
  attributes: PlacedAttribute[];
  canvasScale: number;
  canvasTranslateX: number;
  canvasTranslateY: number;
  hoveredAttribute?: PlacedAttribute | null;
  hoverScreenX?: number;
  hoverScreenY?: number;
  onDeleteAttribute: (id: string) => void;
  onOpenCompiler: () => void;
  onBadgeHover?: (attr: PlacedAttribute | null, screenX?: number, screenY?: number) => void;
}

export const PlacedAttributeBadges: React.FC<PlacedAttributeBadgesProps> = ({
  attributes,
  canvasScale,
  canvasTranslateX,
  canvasTranslateY,
  hoveredAttribute,
  hoverScreenX = 0,
  hoverScreenY = 0,
  onDeleteAttribute,
  onOpenCompiler,
  onBadgeHover,
}) => {
  const [selectedAttr, setSelectedAttr] = useState<PlacedAttribute | null>(null);

  const getAttributeStyle = (type: PlacedAttribute["type"]) => {
    switch (type) {
      case "ANALOGY":
        return {
          icon: "💡",
          bgColor: "#312E81",
          borderColor: "#818CF8",
          textColor: "#C7D2FE",
          label: "Analogía",
        };
      case "CAUSAL_MECHANISM":
        return {
          icon: "⚙️",
          bgColor: "#0C4A6E",
          borderColor: "#38BDF8",
          textColor: "#BAE6FD",
          label: "Mecanismo Causal",
        };
      case "EVIDENCE":
        return {
          icon: "🔬",
          bgColor: "#064E3B",
          borderColor: "#34D399",
          textColor: "#A7F3D0",
          label: "Evidencia Empírica",
        };
    }
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {attributes.map((attr) => {
        const screenX = attr.worldX * canvasScale + canvasTranslateX;
        const screenY = attr.worldY * canvasScale + canvasTranslateY;
        const styleInfo = getAttributeStyle(attr.type);

        return (
          <Pressable
            key={attr.id}
            style={[
              styles.badgeContainer,
              {
                left: screenX,
                top: screenY,
                backgroundColor: styleInfo.bgColor,
                borderColor: styleInfo.borderColor,
                transform: [{ scale: Math.min(1.2, Math.max(0.7, canvasScale)) }],
              },
            ]}
            onPress={() => setSelectedAttr(attr)}
            onHoverIn={() => onBadgeHover?.(attr, screenX, screenY)}
            onHoverOut={() => onBadgeHover?.(null)}
            onPointerEnter={() => onBadgeHover?.(attr, screenX, screenY)}
            onPointerLeave={() => onBadgeHover?.(null)}
          >
            <Text style={styles.badgeIcon}>{styleInfo.icon}</Text>
            <Text style={[styles.badgeText, { color: styleInfo.textColor }]}>
              {attr.title}
            </Text>
          </Pressable>
        );
      })}

      {/* Air View / S-Pen Hover Affordance Floating Tooltip (Spec 4.3) */}
      {hoveredAttribute && (
        <View
          pointerEvents="none"
          style={[
            styles.hoverCard,
            {
              left: Math.max(16, hoverScreenX - 100),
              top: Math.max(16, hoverScreenY - 110),
            },
          ]}
        >
          <View style={styles.hoverHeader}>
            <Text style={styles.hoverIcon}>
              {getAttributeStyle(hoveredAttribute.type).icon}
            </Text>
            <Text style={styles.hoverType}>
              {getAttributeStyle(hoveredAttribute.type).label}
            </Text>
          </View>
          <Text style={styles.hoverTitle} numberOfLines={1}>
            {hoveredAttribute.title}
          </Text>
          {hoveredAttribute.note ? (
            <Text style={styles.hoverNote} numberOfLines={2}>
              {hoveredAttribute.note}
            </Text>
          ) : null}
        </View>
      )}

      {/* Detail / Quick Inspection Modal */}
      <Modal
        visible={selectedAttr !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedAttr(null)}
      >
        <TouchableWithoutFeedback onPress={() => setSelectedAttr(null)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.card}>
                {selectedAttr && (
                  <>
                    <View style={styles.cardHeader}>
                      <View style={styles.cardTitleRow}>
                        <Text style={styles.cardIcon}>
                          {getAttributeStyle(selectedAttr.type).icon}
                        </Text>
                        <Text style={styles.cardTitle}>
                          {getAttributeStyle(selectedAttr.type).label}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => setSelectedAttr(null)}
                        style={styles.closeBtn}
                      >
                        <Text style={styles.closeBtnText}>✕</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.cardConceptTitle}>{selectedAttr.title}</Text>
                    <Text style={styles.cardNote}>{selectedAttr.note}</Text>

                    <View style={styles.cardFooter}>
                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => {
                          onDeleteAttribute(selectedAttr.id);
                          setSelectedAttr(null);
                        }}
                      >
                        <Text style={styles.deleteBtnText}>🗑️ Eliminar</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.inspectBtn}
                        onPress={() => {
                          setSelectedAttr(null);
                          onOpenCompiler();
                        }}
                      >
                        <Text style={styles.inspectBtnText}>⚡ Auditar en GRINDE</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  badgeContainer: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 6,
    zIndex: 5,
  },
  badgeIcon: {
    fontSize: 14,
    marginRight: 5,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: 360,
    backgroundColor: "#0F172A",
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: "#334155",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardIcon: {
    fontSize: 18,
  },
  cardTitle: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  closeBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#1E293B",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "700",
  },
  cardConceptTitle: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  cardNote: {
    color: "#CBD5E1",
    fontSize: 13,
    lineHeight: 19,
    backgroundColor: "#1E293B",
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  deleteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: "#334155",
  },
  deleteBtnText: {
    color: "#F87171",
    fontSize: 12,
    fontWeight: "600",
  },
  inspectBtn: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: "#4F46E5",
    alignItems: "center",
  },
  inspectBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  hoverCard: {
    position: "absolute",
    width: 220,
    backgroundColor: "rgba(15, 23, 42, 0.92)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: "#6366F1",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 99,
  },
  hoverHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  hoverIcon: {
    fontSize: 14,
  },
  hoverType: {
    fontSize: 10,
    fontWeight: "700",
    color: "#A5B4FC",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  hoverTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#F8FAFC",
    marginBottom: 4,
  },
  hoverNote: {
    fontSize: 11,
    color: "#CBD5E1",
    lineHeight: 15,
  },
});
