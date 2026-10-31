import React, { useState } from "react";
import { StyleSheet, View, Text, TouchableOpacity, TextInput, Pressable } from "react-native";
import { X, Sparkles, GitMerge } from "@sketchyicons/react-native";
import { KnowledgeNode, CanvasCompiledPayload } from "@cognitive-canvas/core";
import { createNonDestructiveSynthesisCanvas } from "../../../services/CompiledGraphStorage";
import { SynthesisReferenceCard } from "../../../types/canvas";

export interface ConsolidationModalProps {
  visible: boolean;
  overlappingNode: KnowledgeNode | null;
  allPayloads: CanvasCompiledPayload[];
  onClose: () => void;
  onSynthesisCreated: (newCanvasId: string) => void;
}

export const ConsolidationModal: React.FC<ConsolidationModalProps> = ({
  visible,
  overlappingNode,
  allPayloads,
  onClose,
  onSynthesisCreated,
}) => {
  const [hypothesisNote, setHypothesisNote] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  if (!visible || !overlappingNode || overlappingNode.provenance.length < 2) {
    return null;
  }

  const provA = overlappingNode.provenance[0];
  const provB = overlappingNode.provenance[1];
  const payloadA = allPayloads.find((p) => p.canvasId === provA.canvasId);
  const payloadB = allPayloads.find((p) => p.canvasId === provB.canvasId);

  const mechA =
    payloadA?.nodes.find((n) => n.tier === "mechanism")?.label ||
    payloadA?.nodes[0]?.label ||
    "el mecanismo primario";
  const failureB =
    payloadB?.nodes.find((n) => n.tier === "system" || n.tier === "mechanism")?.label ||
    payloadB?.nodes[0]?.label ||
    "el modo de fallo límite";

  const challengePrompt = `Canvases "${provA.canvasTitle}" and "${provB.canvasTitle}" both reference "${overlappingNode.label}". How does "${mechA}" in "${provA.canvasTitle}" interact with "${failureB}" in "${provB.canvasTitle}"?`;

  const handleCreateSynthesis = async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const leftNodes = (payloadA?.nodes || [overlappingNode]).slice(0, 3);
      const rightNodes = (payloadB?.nodes || [overlappingNode]).slice(0, 3);

      const leftCards: SynthesisReferenceCard[] = leftNodes.map((n, i) => ({
        id: `left_${n.id}_${i}`,
        nodeId: n.id,
        label: n.label,
        summary: n.summary,
        sourceCanvasId: provA.canvasId,
        sourceCanvasTitle: provA.canvasTitle,
        side: "left",
      }));

      const rightCards: SynthesisReferenceCard[] = rightNodes.map((n, i) => ({
        id: `right_${n.id}_${i}`,
        nodeId: n.id,
        label: n.label,
        summary: n.summary,
        sourceCanvasId: provB.canvasId,
        sourceCanvasTitle: provB.canvasTitle,
        side: "right",
      }));

      const newCanvasId = await createNonDestructiveSynthesisCanvas({
        topic: overlappingNode.label,
        sharedNodeLabel: overlappingNode.label,
        leftCards,
        rightCards,
        sourceCanvasIds: [provA.canvasId, provB.canvasId],
      });

      onClose();
      onSynthesisCreated(newCanvasId);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Pressable style={styles.backdrop} onPress={onClose}>
      <Pressable style={styles.modalCard} onPress={() => {}}>
        <View style={styles.headerRow}>
          <View style={styles.titleBadge}>
            <GitMerge size={16} color="#38BDF8" strokeWidth={2.0} />
            <Text style={styles.headerTitle}>Non-Destructive Consolidation Protocol</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={16} color="#94A3B8" strokeWidth={2.0} />
          </TouchableOpacity>
        </View>

        <Text style={styles.ConceptHeader}>Shared Concept: {overlappingNode.label}</Text>

        <View style={styles.challengeBox}>
          <Text style={styles.challengeLabel}>⚡ DESIRABLE DIFFICULTY SYNTHESIS CHALLENGE</Text>
          <Text style={styles.challengeText}>{challengePrompt}</Text>
        </View>

        <Text style={styles.subHint}>
          Source .cmn maps remain immutable. Creating a synthesis canvas pins terminal nodes to the
          left and right margins and tags source clusters with [↗ Consolidated in Master].
        </Text>

        <TextInput
          style={styles.hypothesisInput}
          value={hypothesisNote}
          onChangeText={setHypothesisNote}
          placeholder="Formulate your initial causal prediction before sketching..."
          placeholderTextColor="#64748B"
          multiline
        />

        <View style={styles.footerRow}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>Postpone</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.createBtn}
            onPress={handleCreateSynthesis}
            activeOpacity={0.85}
          >
            <Sparkles size={15} color="#FFFFFF" strokeWidth={2.0} />
            <Text style={styles.createBtnText}>
              {isCreating ? "Spawning..." : "[ Create Synthesis Canvas ]"}
            </Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(11, 17, 32, 0.78)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 200,
  },
  modalCard: {
    width: 520,
    maxWidth: "92%",
    backgroundColor: "#0F172A",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
    padding: 20,
    elevation: 18,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  titleBadge: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: {
    color: "#38BDF8",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#1E293B",
    alignItems: "center",
    justifyContent: "center",
  },
  ConceptHeader: { color: "#F8FAFC", fontSize: 17, fontWeight: "700", marginBottom: 10 },
  challengeBox: {
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderColor: "#F59E0B",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  challengeLabel: { color: "#FBBF24", fontSize: 10, fontWeight: "700", marginBottom: 4 },
  challengeText: { color: "#FEF3C7", fontSize: 13, lineHeight: 19, fontWeight: "600" },
  subHint: { color: "#94A3B8", fontSize: 11, lineHeight: 16, marginBottom: 10 },
  hypothesisInput: {
    backgroundColor: "#1E293B",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 10,
    color: "#F8FAFC",
    fontSize: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 54,
    marginBottom: 14,
  },
  footerRow: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#1E293B",
  },
  cancelBtnText: { color: "#94A3B8", fontSize: 12, fontWeight: "600" },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#0284C7",
  },
  createBtnText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
});
