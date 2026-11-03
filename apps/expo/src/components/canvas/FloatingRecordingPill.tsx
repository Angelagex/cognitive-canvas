import React from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { Square, Mic } from "@sketchyicons/react-native";

export interface FloatingRecordingPillProps {
  elapsedSeconds: number;
  maxSeconds?: number;
  onStop: () => void;
  statusMessage?: string | null;
}

export const FloatingRecordingPill: React.FC<FloatingRecordingPillProps> = ({
  elapsedSeconds,
  maxSeconds = 180,
  onStop,
  statusMessage,
}) => {
  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainder = sec % 60;
    return `${mins}:${remainder < 10 ? "0" : ""}${remainder}`;
  };

  return (
    <View style={styles.outerContainer} pointerEvents="box-none">
      <View style={styles.pillCard} pointerEvents="auto">
        <View style={styles.indicatorRow}>
          <View style={styles.pulseDot} />
          <Mic size={16} color="#EF4444" strokeWidth={2.2} />
          <Text style={styles.timerText}>
            {formatTime(elapsedSeconds)} / {formatTime(maxSeconds)}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.messageBox}>
          <Text style={styles.instructionText} numberOfLines={1}>
            {statusMessage || "Grabando tu razonamiento — recorre tu mapa libremente"}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.stopButton, Boolean(statusMessage) && styles.stopButtonDisabled]}
          onPress={onStop}
          disabled={Boolean(statusMessage)}
          activeOpacity={0.8}
          accessibilityLabel="Detener grabación de explicación"
        >
          <Square size={13} color="#FFFFFF" strokeWidth={2.4} fill="#FFFFFF" />
          <Text style={styles.stopButtonText}>Detener</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    position: "absolute",
    top: 68,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 9999,
  },
  pillCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F172A",
    borderColor: "#EF4444",
    borderWidth: 1.5,
    borderRadius: 30,
    paddingVertical: 8,
    paddingHorizontal: 16,
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    gap: 12,
  },
  indicatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#EF4444",
  },
  timerText: {
    color: "#F8FAFC",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  divider: {
    width: 1,
    height: 18,
    backgroundColor: "#334155",
  },
  messageBox: {
    maxWidth: 240,
  },
  instructionText: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "600",
  },
  stopButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DC2626",
    borderColor: "#EF4444",
    borderWidth: 1,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 6,
  },
  stopButtonDisabled: {
    opacity: 0.5,
  },
  stopButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
});

