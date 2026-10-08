import React, { useState, useEffect } from "react";
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
  onOpenDocumentMenu: () => void;
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
  onOpenDocumentMenu,
  isSaving = false,
  lastSavedAt = null,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(mapTitle);

  useEffect(() => {
    if (!isEditingTitle) {
      setTempTitle(mapTitle);
    }
  }, [mapTitle, isEditingTitle]);

  const handleStartEditing = () => {
    setTempTitle(mapTitle);
    setIsEditingTitle(true);
  };

  const handleSaveTitle = () => {
    const trimmed = tempTitle.trim();
    if (trimmed.length > 0 && trimmed !== mapTitle) {
      onTitleChange(trimmed);
    } else {
      setTempTitle(mapTitle);
    }
    setIsEditingTitle(false);
  };

  const handleCancelEditing = () => {
    setTempTitle(mapTitle);
    setIsEditingTitle(false);
  };

  return (
    <View style={styles.header}>
      {/* Left: Document Menu (Vault, Export, New), Title & Save Indicator */}
      <View style={styles.leftSection}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={onOpenDocumentMenu}
          activeOpacity={0.75}
          accessibilityLabel="Abrir menú del documento y bóveda"
        >
          <Text style={styles.menuIcon}>☰</Text>
          <Text style={styles.menuText}>Menú</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Interactive Title with Explicit Editing Mode */}
        {isEditingTitle ? (
          <View style={styles.titleEditContainer}>
            <TextInput
              style={styles.titleInputActive}
              value={tempTitle}
              onChangeText={setTempTitle}
              placeholder="Nombre del mapa..."
              placeholderTextColor="#64748B"
              autoFocus
              selectTextOnFocus
              onSubmitEditing={handleSaveTitle}
              onBlur={handleSaveTitle}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={styles.titleConfirmBtn}
              onPress={handleSaveTitle}
              activeOpacity={0.7}
              accessibilityLabel="Guardar nombre"
            >
              <Text style={styles.titleConfirmText}>✓</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.titleCancelBtn}
              onPress={handleCancelEditing}
              activeOpacity={0.7}
              accessibilityLabel="Cancelar edición"
            >
              <Text style={styles.titleCancelText}>✕</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.titleDisplayButton}
            onPress={handleStartEditing}
            activeOpacity={0.75}
            accessibilityLabel="Tocar para editar nombre del mapa"
          >
            <Text style={styles.titleDisplayText} numberOfLines={1}>
              {mapTitle}
            </Text>
            <Text style={styles.titleEditIcon}>✏️</Text>
          </TouchableOpacity>
        )}

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
  menuButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginRight: 10,
    gap: 6,
  },
  menuIcon: {
    color: "#38BDF8",
    fontSize: 14,
    fontWeight: "800",
  },
  menuText: {
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
  titleDisplayButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: "transparent",
    gap: 6,
    maxWidth: 260,
  },
  titleDisplayText: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "700",
  },
  titleEditIcon: {
    fontSize: 11,
    opacity: 0.6,
  },
  titleEditContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#38BDF8",
    paddingLeft: 8,
    paddingRight: 4,
    paddingVertical: 2,
    gap: 4,
  },
  titleInputActive: {
    color: "#F8FAFC",
    fontSize: 13,
    fontWeight: "700",
    minWidth: 150,
    paddingVertical: 2,
  },
  titleConfirmBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(16, 185, 129, 0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  titleConfirmText: {
    color: "#34D399",
    fontSize: 12,
    fontWeight: "800",
  },
  titleCancelBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  titleCancelText: {
    color: "#F87171",
    fontSize: 10,
    fontWeight: "800",
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
