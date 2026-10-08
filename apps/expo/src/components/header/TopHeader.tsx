import React from "react";
import { StyleSheet, View, Text, TouchableOpacity, TextInput } from "react-native";

interface TopHeaderProps {
  mapTitle: string;
  onTitleChange: (newTitle: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onRequestClear: () => void;
  onOpenCompiler: () => void;
  onOpenVaults: () => void;
  onOpenDocumentMenu?: () => void;
  isSaving?: boolean;
  lastSavedAt?: number | null;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  mapTitle,
  onTitleChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onRequestClear,
  onOpenCompiler,
  onOpenVaults,
  onOpenDocumentMenu,
  isSaving = false,
  lastSavedAt = null,
}) => {
  return (
    <View style={styles.header}>
      {/* Left: Vaults Manager, Title & Discreet Save Indicator */}
      <View style={styles.leftSection}>
        <TouchableOpacity style={styles.vaultButton} onPress={onOpenVaults} activeOpacity={0.75}>
          <Text style={styles.vaultIcon}>📁</Text>
          <Text style={styles.vaultText}>Bóveda</Text>
        </TouchableOpacity>

        {onOpenDocumentMenu && (
          <TouchableOpacity
            style={styles.menuButton}
            onPress={onOpenDocumentMenu}
            activeOpacity={0.7}
            accessibilityLabel="Opciones del documento"
          >
            <Text style={styles.menuIcon}>⋮</Text>
          </TouchableOpacity>
        )}

        <View style={styles.divider} />

        <TextInput
          style={styles.titleInput}
          value={mapTitle}
          onChangeText={onTitleChange}
          placeholder="Nombre del mapa..."
          placeholderTextColor="#64748B"
          selectTextOnFocus
        />

        {/* Unobtrusive Cloud Save Status Indicator */}
        <View style={styles.saveBadgeContainer}>
          {isSaving ? (
            <View style={styles.savingBadge}>
              <View style={styles.savingDot} />
              <Text style={styles.savingText}>Guardando...</Text>
            </View>
          ) : lastSavedAt ? (
            <View style={styles.savedBadge}>
              <Text style={styles.savedCheck}>☁️✓</Text>
              <Text style={styles.savedText}>Guardado</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Center-Right: Compact Icon-Only Undo / Redo & Safe Clear */}
      <View style={styles.centerSection}>
        <TouchableOpacity
          style={[styles.historyButton, !canUndo && styles.buttonDisabled]}
          onPress={onUndo}
          disabled={!canUndo}
          activeOpacity={0.7}
          accessibilityLabel="Deshacer"
        >
          <Text style={[styles.historyIcon, !canUndo && styles.iconDisabled]}>↶</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.historyButton, !canRedo && styles.buttonDisabled]}
          onPress={onRedo}
          disabled={!canRedo}
          activeOpacity={0.7}
          accessibilityLabel="Rehacer"
        >
          <Text style={[styles.historyIcon, !canRedo && styles.iconDisabled]}>↷</Text>
        </TouchableOpacity>

        <View style={styles.smallDivider} />

        {/* Clear with confirmation dialog */}
        <TouchableOpacity
          style={styles.clearButton}
          onPress={onRequestClear}
          activeOpacity={0.7}
          accessibilityLabel="Limpiar lienzo con confirmación"
        >
          <Text style={styles.clearIcon}>🗑️</Text>
        </TouchableOpacity>
      </View>

      {/* Far Right: [⚡ Compilar Mapa] */}
      <View style={styles.rightSection}>
        <TouchableOpacity style={styles.compileButton} onPress={onOpenCompiler} activeOpacity={0.8}>
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
  menuButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: "#1E293B",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  menuIcon: {
    color: "#94A3B8",
    fontSize: 16,
    fontWeight: "800",
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
  smallDivider: {
    width: 1,
    height: 16,
    backgroundColor: "#334155",
    marginHorizontal: 4,
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
  saveBadgeContainer: {
    marginLeft: 10,
    justifyContent: "center",
  },
  savingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    gap: 5,
  },
  savingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#F59E0B",
  },
  savingText: {
    color: "#FBBF24",
    fontSize: 11,
    fontWeight: "600",
  },
  savedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.25)",
    gap: 4,
  },
  savedCheck: {
    color: "#34D399",
    fontSize: 11,
    fontWeight: "800",
  },
  savedText: {
    color: "#34D399",
    fontSize: 11,
    fontWeight: "600",
  },
});
