import React from "react";
import { StyleSheet, View, Text, TouchableOpacity, TextInput } from "react-native";

interface TopHeaderProps {
  mapTitle: string;
  onTitleChange: (newTitle: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onOpenCompiler: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  mapTitle,
  onTitleChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClear,
  onOpenCompiler,
}) => {
  return (
    <View style={styles.header}>
      {/* Left: Vaults menu & Editable Title */}
      <View style={styles.leftSection}>
        <TouchableOpacity style={styles.vaultButton}>
          <Text style={styles.vaultIcon}>📁</Text>
          <Text style={styles.vaultText}>Libretas</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TextInput
          style={styles.titleInput}
          value={mapTitle}
          onChangeText={onTitleChange}
          placeholder="Nombre del mapa..."
          placeholderTextColor="#64748B"
          selectTextOnFocus
        />
      </View>

      {/* Center-Right: Undo / Redo & Clear */}
      <View style={styles.centerSection}>
        <TouchableOpacity
          style={[styles.historyButton, !canUndo && styles.buttonDisabled]}
          onPress={onUndo}
          disabled={!canUndo}
        >
          <Text style={[styles.historyIcon, !canUndo && styles.iconDisabled]}>↶</Text>
          <Text style={[styles.historyLabel, !canUndo && styles.iconDisabled]}>Deshacer</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.historyButton, !canRedo && styles.buttonDisabled]}
          onPress={onRedo}
          disabled={!canRedo}
        >
          <Text style={[styles.historyIcon, !canRedo && styles.iconDisabled]}>↷</Text>
          <Text style={[styles.historyLabel, !canRedo && styles.iconDisabled]}>Rehacer</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.clearButton} onPress={onClear}>
          <Text style={styles.clearIcon}>🗑️</Text>
        </TouchableOpacity>
      </View>

      {/* Far Right: [⚡ Compilar Mapa] */}
      <View style={styles.rightSection}>
        <TouchableOpacity style={styles.compileButton} onPress={onOpenCompiler}>
          <Text style={styles.compileLightning}>⚡</Text>
          <Text style={styles.compileText}>Compilar Mapa</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    height: 48,
    backgroundColor: "#0B1120",
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    zIndex: 20,
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  vaultButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginRight: 10,
  },
  vaultIcon: {
    fontSize: 13,
    marginRight: 4,
  },
  vaultText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: "#334155",
    marginRight: 12,
  },
  titleInput: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "700",
    minWidth: 180,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    backgroundColor: "transparent",
  },
  centerSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  historyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  historyIcon: {
    color: "#38BDF8",
    fontSize: 15,
    fontWeight: "800",
    marginRight: 4,
  },
  historyLabel: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "500",
  },
  iconDisabled: {
    color: "#64748B",
  },
  clearButton: {
    backgroundColor: "#1E293B",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  clearIcon: {
    fontSize: 13,
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 16,
  },
  compileButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D97706",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#F59E0B",
    shadowColor: "#F59E0B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  compileLightning: {
    fontSize: 14,
    color: "#FEF08A",
    marginRight: 5,
  },
  compileText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
