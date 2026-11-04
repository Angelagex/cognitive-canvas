import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, TextInput } from "react-native";
import * as Haptics from "expo-haptics";
import {
  ArrowLeft,
  Pencil,
  Check,
  X,
  Cloud,
  Undo2,
  Redo2,
  BrainCircuit,
  Zap,
  Mic,
  Maximize2,
  Minimize2,
  MoreVertical,
  Eye,
  EyeOff,
} from "@sketchyicons/react-native";
import { styles } from "./TopHeader.styles";
import { useCognitiveLayerStore } from "../../stores/useCognitiveLayerStore";
import { VinkLogo } from "../brand";

export interface TopHeaderProps {
  mapTitle: string;
  onTitleChange: (newTitle: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onRequestClear?: () => void;
  isDrawerOpen?: boolean;
  onToggleDrawer?: () => void;
  onFastCompile?: () => void;
  onLongPressFastCompile?: () => void;
  onStartExplanation?: () => void;
  isCompiling?: boolean;
  isRecordingWalkthrough?: boolean;
  onOpenCompiler?: () => void;
  onOpenDocumentMenu?: () => void;
  onReturnToHub?: () => void;
  isSaving?: boolean;
  lastSavedAt?: number | null;
  isZenMode?: boolean;
  onToggleZenMode?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  mapTitle, onTitleChange, canUndo, canRedo, onUndo, onRedo,
  isDrawerOpen = false, onToggleDrawer, onFastCompile, onLongPressFastCompile,
  onStartExplanation, isCompiling = false, isRecordingWalkthrough = false, onOpenCompiler,
  onOpenDocumentMenu, onReturnToHub, isSaving = false, lastSavedAt = null,
  isZenMode = false, onToggleZenMode,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(mapTitle);
  const isCognitiveLayerVisible = useCognitiveLayerStore((s) => s.isCognitiveLayerVisible);
  const toggleCognitiveLayer = useCognitiveLayerStore((s) => s.toggleCognitiveLayer);

  useEffect(() => {
    if (!isEditingTitle) setTempTitle(mapTitle);
  }, [mapTitle, isEditingTitle]);

  const handleStartEditing = () => {
    setTempTitle(mapTitle);
    setIsEditingTitle(true);
  };

  const handleSaveTitle = () => {
    const trimmed = tempTitle.trim();
    if (trimmed.length > 0 && trimmed !== mapTitle) onTitleChange(trimmed);
    else setTempTitle(mapTitle);
    setIsEditingTitle(false);
  };

  const handleCancelEditing = () => {
    setTempTitle(mapTitle);
    setIsEditingTitle(false);
  };

  const handleDrawerToggle = () => {
    if (onToggleDrawer) onToggleDrawer();
    else if (onOpenCompiler) onOpenCompiler();
  };

  const handleFastCompileAction = () => {
    if (onFastCompile) onFastCompile();
    else if (onOpenCompiler) onOpenCompiler();
  };

  return (
    <View style={styles.header}>
      {/* Left: [ ← Hub ] Button, Interactive Title & Auto-Save Status */}
      <View style={styles.leftSection}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            onReturnToHub?.();
          }}
          activeOpacity={0.75}
          accessibilityLabel="Auto-guardar y volver al Workspace Hub"
        >
          <ArrowLeft size={18} color="#38BDF8" strokeWidth={2.2} />
          <Text style={styles.menuText}>Hub</Text>
        </TouchableOpacity>

        <VinkLogo showIcon={false} wordmarkHeight={18} style={{ marginRight: 10 }} />

        <View style={styles.divider} />

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
              <Check size={14} color="#38BDF8" strokeWidth={2.2} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.titleCancelBtn}
              onPress={handleCancelEditing}
              activeOpacity={0.7}
              accessibilityLabel="Cancelar edición"
            >
              <X size={14} color="#94A3B8" strokeWidth={2.0} />
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
            <Pencil size={13} color="#64748B" strokeWidth={1.75} style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        )}

        <View style={styles.saveBadgeContainer}>
          {isSaving ? (
            <View style={styles.savingBadge}>
              <View style={styles.savingDot} />
              <Text style={styles.savingText}>Guardando...</Text>
            </View>
          ) : lastSavedAt ? (
            <View style={styles.savedBadge}>
              <Cloud size={13} color="#34D399" strokeWidth={2.0} />
              <Text style={styles.savedText}>Guardado</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Center-Right: Compact Icon-Only Undo / Redo */}
      <View style={styles.centerSection}>
        <TouchableOpacity
          style={[styles.historyButton, !canUndo && styles.buttonDisabled]}
          onPress={onUndo}
          disabled={!canUndo}
          activeOpacity={0.7}
          accessibilityLabel="Deshacer"
        >
          <Undo2 size={18} color={canUndo ? "#94A3B8" : "#475569"} strokeWidth={2.0} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.historyButton, !canRedo && styles.buttonDisabled]}
          onPress={onRedo}
          disabled={!canRedo}
          activeOpacity={0.7}
          accessibilityLabel="Rehacer"
        >
          <Redo2 size={18} color={canRedo ? "#94A3B8" : "#475569"} strokeWidth={2.0} />
        </TouchableOpacity>
      </View>

      {/* Far Right: [🧠 Análisis], [⚡ Compilar], [🎙️ Explicar] & Controls */}
      <View style={styles.rightSection}>
        {/* 1. Drawer Toggle (Inspection) */}
        <TouchableOpacity
          style={[styles.inspectionButton, isDrawerOpen && styles.inspectionButtonActive]}
          onPress={handleDrawerToggle}
          activeOpacity={0.75}
        >
          <BrainCircuit size={17} color={isDrawerOpen ? "#38BDF8" : "#94A3B8"} strokeWidth={2.0} />
          <Text style={[styles.inspectionButtonText, isDrawerOpen && styles.inspectionButtonTextActive]}>
            Análisis
          </Text>
        </TouchableOpacity>

        {/* 2. Fast Direct Compilation */}
        <TouchableOpacity
          style={[styles.fastCompileButton, isCompiling && styles.buttonDisabled]}
          onPress={handleFastCompileAction}
          onLongPress={onLongPressFastCompile}
          delayLongPress={400}
          disabled={isCompiling}
          activeOpacity={0.8}
        >
          <Zap size={14} color="#FFFFFF" strokeWidth={2.2} />
          <Text style={styles.fastCompileText}>
            {isCompiling ? "Compilando..." : "Compilar"}
          </Text>
        </TouchableOpacity>

        {/* 3. Walkthrough Explanation Tool */}
        {onStartExplanation && (
          <TouchableOpacity
            style={[styles.explainButton, (isCompiling || isRecordingWalkthrough) && styles.buttonDisabled]}
            onPress={onStartExplanation}
            disabled={isCompiling || isRecordingWalkthrough}
            activeOpacity={0.8}
          >
            <Mic size={14} color="#38BDF8" strokeWidth={2.2} />
            <Text style={styles.explainText}>Explicar</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.zenButton}
          onPress={toggleCognitiveLayer}
          activeOpacity={0.7}
          accessibilityLabel={
            isCognitiveLayerVisible ? "Ocultar capa cognitiva" : "Mostrar capa cognitiva"
          }
        >
          {isCognitiveLayerVisible ? (
            <Eye size={16} color="#38BDF8" strokeWidth={2.0} />
          ) : (
            <EyeOff size={16} color="#94A3B8" strokeWidth={2.0} />
          )}
        </TouchableOpacity>

        {onToggleZenMode && (
          <TouchableOpacity
            style={styles.zenButton}
            onPress={onToggleZenMode}
            activeOpacity={0.7}
            accessibilityLabel={isZenMode ? "Salir del modo enfoque" : "Modo enfoque"}
          >
            {isZenMode ? (
              <Minimize2 size={16} color="#38BDF8" strokeWidth={2.0} />
            ) : (
              <Maximize2 size={16} color="#94A3B8" strokeWidth={2.0} />
            )}
          </TouchableOpacity>
        )}

        {onOpenDocumentMenu && (
          <TouchableOpacity
            style={styles.actionIconButton}
            onPress={onOpenDocumentMenu}
            activeOpacity={0.7}
            accessibilityLabel="Document Actions"
          >
            <MoreVertical size={20} color="#94A3B8" strokeWidth={2.0} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};
