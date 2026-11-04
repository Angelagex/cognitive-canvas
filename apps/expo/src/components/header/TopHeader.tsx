import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
  ActivityIndicator,
} from "react-native";
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
  ChevronDown,
  RefreshCw,
} from "@sketchyicons/react-native";
import { styles } from "./TopHeader.styles";
import { useCognitiveLayerStore } from "../../stores/useCognitiveLayerStore";
import { VinkLogo } from "../brand";
import { useSkin, fonts, radius, border } from "../../theme";
import { Button, HardShadow } from "../ui";

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
  onCompileFromScratch?: () => void;
  onStartExplanation?: () => void;
  explanationTranscript?: string | null;
  onClearExplanation?: () => void;
  isIncremental?: boolean;
  onToggleIncremental?: () => void;
  isCompiling?: boolean;
  blindSpotsCount?: number;
  onOpenDocumentMenu?: () => void;
  onReturnToHub?: () => void;
  isSaving?: boolean;
  lastSavedAt?: number | null;
  isZenMode?: boolean;
  onToggleZenMode?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  mapTitle,
  onTitleChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  isDrawerOpen = false,
  onToggleDrawer,
  onFastCompile,
  onCompileFromScratch,
  onStartExplanation,
  explanationTranscript,
  onClearExplanation,
  isIncremental = true,
  onToggleIncremental,
  isCompiling = false,
  blindSpotsCount = 0,
  onOpenDocumentMenu,
  onReturnToHub,
  isSaving = false,
  lastSavedAt = null,
  isZenMode = false,
  onToggleZenMode,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(mapTitle);
  const [showCompileMenu, setShowCompileMenu] = useState(false);
  const { skin } = useSkin();
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

  const handleCompileAction = () => {
    if (isCompiling) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onFastCompile?.();
  };

  const handleCompileFromScratchAction = () => {
    setShowCompileMenu(false);
    if (isCompiling) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    onCompileFromScratch?.();
  };

  const hasExplanation = Boolean(explanationTranscript && explanationTranscript.trim().length > 0);

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: skin.surface,
          borderBottomColor: skin.borderSoft,
          borderBottomWidth: border.soft,
        },
      ]}
    >
      {/* ──────────────── Left: Hub, Logo, Título & Estado Guardado ──────────────── */}
      <View style={styles.leftSection}>
        <TouchableOpacity
          style={[
            styles.menuButton,
            {
              backgroundColor: skin.surfaceAlt,
              borderColor: skin.borderSoft,
              borderWidth: border.soft,
              borderRadius: radius.pill,
            },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            onReturnToHub?.();
          }}
          activeOpacity={0.75}
          accessibilityLabel="Volver al Workspace Hub"
        >
          <ArrowLeft size={16} color={skin.primary} strokeWidth={2.2} />
          <Text
            style={[
              styles.menuText,
              {
                color: skin.text,
                fontFamily: fonts.uiBold,
                fontWeight: "normal",
              },
            ]}
          >
            Hub
          </Text>
        </TouchableOpacity>

        <VinkLogo
          showIcon={false}
          wordmarkHeight={18}
          wordmarkColor={skin.text}
          style={{ marginRight: 8, marginLeft: 2 }}
        />

        <View style={[styles.divider, { backgroundColor: skin.borderSoft }]} />

        {isEditingTitle ? (
          <View style={styles.titleEditContainer}>
            <TextInput
              style={[
                styles.titleInputActive,
                {
                  fontFamily: fonts.display,
                  fontWeight: "normal",
                  color: skin.text,
                  backgroundColor: skin.bg,
                  borderColor: skin.primary,
                },
              ]}
              value={tempTitle}
              onChangeText={setTempTitle}
              placeholder="Nombre del mapa..."
              placeholderTextColor={skin.textMuted}
              autoFocus
              selectTextOnFocus
              onSubmitEditing={handleSaveTitle}
              onBlur={handleSaveTitle}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={[styles.titleConfirmBtn, { backgroundColor: skin.primary }]}
              onPress={handleSaveTitle}
              activeOpacity={0.7}
              accessibilityLabel="Guardar nombre"
            >
              <Check size={14} color={skin.onPrimary} strokeWidth={2.4} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.titleCancelBtn}
              onPress={handleCancelEditing}
              activeOpacity={0.7}
              accessibilityLabel="Cancelar edición"
            >
              <X size={14} color={skin.textMuted} strokeWidth={2.0} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.titleDisplayButton}
            onPress={handleStartEditing}
            activeOpacity={0.75}
            accessibilityLabel="Tocar para editar nombre del mapa"
          >
            <Text
              style={[
                styles.titleDisplayText,
                {
                  color: skin.text,
                  fontFamily: fonts.display,
                  fontWeight: "normal",
                },
              ]}
              numberOfLines={1}
            >
              {mapTitle}
            </Text>
            <Pencil size={12} color={skin.textMuted} strokeWidth={1.8} style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        )}

        <View style={styles.saveBadgeContainer}>
          {isSaving ? (
            <View style={styles.savingBadge}>
              <ActivityIndicator size="small" color={skin.warm} style={{ marginRight: 4, transform: [{ scale: 0.7 }] }} />
              <Text
                style={[
                  styles.savingText,
                  { color: skin.warm, fontFamily: fonts.mono, fontWeight: "normal" },
                ]}
              >
                Guardando...
              </Text>
            </View>
          ) : lastSavedAt ? (
            <View style={styles.savedBadge}>
              <Cloud size={13} color={skin.success} strokeWidth={2.0} />
              <Text
                style={[
                  styles.savedText,
                  { color: skin.success, fontFamily: fonts.mono, fontWeight: "normal" },
                ]}
              >
                Guardado
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* ──────────────── Center-Right: Deshacer / Rehacer ──────────────── */}
      <View style={styles.centerSection}>
        <TouchableOpacity
          style={[styles.historyButton, !canUndo && styles.buttonDisabled]}
          onPress={() => {
            if (canUndo) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              onUndo();
            }
          }}
          disabled={!canUndo}
          activeOpacity={0.7}
          accessibilityLabel="Deshacer"
        >
          <Undo2 size={17} color={canUndo ? skin.text : skin.textMuted} strokeWidth={2.0} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.historyButton, !canRedo && styles.buttonDisabled]}
          onPress={() => {
            if (canRedo) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              onRedo();
            }
          }}
          disabled={!canRedo}
          activeOpacity={0.7}
          accessibilityLabel="Rehacer"
        >
          <Redo2 size={17} color={canRedo ? skin.text : skin.textMuted} strokeWidth={2.0} />
        </TouchableOpacity>
      </View>

      {/* ──────────────── Right Section: Reorganización (§4) ────────────────
          Orden: Explicar · Compilar ▾ · Análisis · 👁 · ⛶ · ⋮
      */}
      <View style={styles.rightSection}>
        {/* 1. EXPLICAR / EXPLICADO ✓ (La explicación se adjunta, no compite) */}
        {hasExplanation ? (
          <View
            style={[
              styles.explanationAttachedPill,
              {
                backgroundColor: `${skin.warm}1E`,
                borderColor: skin.warm,
                borderRadius: radius.pill,
                borderWidth: border.soft,
              },
            ]}
          >
            <TouchableOpacity
              onPress={onStartExplanation}
              style={styles.explanationAttachedTouch}
              activeOpacity={0.8}
            >
              <Mic size={13} color={skin.warm} strokeWidth={2.0} />
              <Text
                style={[
                  styles.explanationAttachedText,
                  {
                    color: skin.warm,
                    fontFamily: fonts.monoBold,
                    fontWeight: "normal",
                  },
                ]}
              >
                Explicado ✓
              </Text>
            </TouchableOpacity>
            {onClearExplanation && (
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  onClearExplanation();
                }}
                style={styles.clearExplanationBtn}
                accessibilityLabel="Quitar explicación adjunta"
              >
                <X size={12} color={skin.warm} strokeWidth={2.2} />
              </TouchableOpacity>
            )}
          </View>
        ) : (
          onStartExplanation && (
            <TouchableOpacity
              style={[
                styles.explainButton,
                {
                  backgroundColor: skin.surfaceAlt,
                  borderColor: skin.borderSoft,
                  borderWidth: border.soft,
                  borderRadius: radius.pill,
                },
                isCompiling && styles.buttonDisabled,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                onStartExplanation();
              }}
              disabled={isCompiling}
              activeOpacity={0.8}
            >
              <Mic size={14} color={skin.text} strokeWidth={2.0} />
              <Text
                style={[
                  styles.explainText,
                  {
                    color: skin.text,
                    fontFamily: fonts.uiBold,
                    fontWeight: "normal",
                  },
                ]}
              >
                Explicar
              </Text>
            </TouchableOpacity>
          )
        )}

        {/* 2. COMPILAR ▾ (Acción principal única, botón primary con HardShadow) */}
        <View style={styles.compileGroup}>
          <HardShadow offset="sm" radius={radius.pill} shadowColor={skin.shadow}>
            <View
              style={[
                styles.splitCompileBtn,
                {
                  backgroundColor: skin.primary,
                  borderRadius: radius.pill,
                },
                isCompiling && styles.buttonDisabled,
              ]}
            >
              <TouchableOpacity
                onPress={handleCompileAction}
                disabled={isCompiling}
                style={styles.splitCompileMain}
                activeOpacity={0.85}
              >
                {isCompiling ? (
                  <ActivityIndicator size="small" color={skin.onPrimary} style={{ marginRight: 6 }} />
                ) : (
                  <Zap size={14} color={skin.onPrimary} strokeWidth={2.2} style={{ marginRight: 6 }} />
                )}
                <Text
                  style={[
                    styles.compileBtnLabel,
                    {
                      color: skin.onPrimary,
                      fontFamily: fonts.uiBold,
                      fontWeight: "normal",
                    },
                  ]}
                >
                  {isCompiling
                    ? "Compilando..."
                    : hasExplanation
                    ? "Compilar con explicación"
                    : "Compilar"}
                </Text>
              </TouchableOpacity>

              {/* Selector ▾ para popover de opciones */}
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  setShowCompileMenu(true);
                }}
                disabled={isCompiling}
                style={[
                  styles.splitCompileChevron,
                  { borderLeftColor: "rgba(255, 255, 255, 0.25)" },
                ]}
                activeOpacity={0.7}
                accessibilityLabel="Opciones de compilación"
              >
                <ChevronDown size={14} color={skin.onPrimary} strokeWidth={2.4} />
              </TouchableOpacity>
            </View>
          </HardShadow>
        </View>

        {/* 3. ANÁLISIS (Solo resultados, con insignia numérica de puntos ciegos) */}
        <TouchableOpacity
          style={[
            styles.inspectionButton,
            {
              backgroundColor: isDrawerOpen ? `${skin.primary}1A` : skin.surfaceAlt,
              borderColor: isDrawerOpen ? skin.primary : skin.borderSoft,
              borderWidth: border.soft,
              borderRadius: radius.pill,
            },
            isCompiling && { opacity: 0.45 },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            onToggleDrawer?.();
          }}
          disabled={isCompiling}
          activeOpacity={0.75}
        >
          <BrainCircuit
            size={16}
            color={isDrawerOpen ? skin.primary : skin.text}
            strokeWidth={2.0}
          />
          <Text
            style={[
              styles.inspectionButtonText,
              {
                color: isDrawerOpen ? skin.primary : skin.text,
                fontFamily: fonts.uiBold,
                fontWeight: "normal",
              },
            ]}
          >
            Análisis
          </Text>
          {blindSpotsCount > 0 && (
            <View
              style={[
                styles.blindSpotBadge,
                { backgroundColor: skin.alert, borderColor: skin.surface },
              ]}
            >
              <Text style={styles.blindSpotBadgeText}>{blindSpotsCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* 4. 👁 Capa Cognitiva HUD */}
        <TouchableOpacity
          style={[
            styles.iconButton,
            {
              backgroundColor: isCognitiveLayerVisible ? `${skin.primary}1A` : skin.surfaceAlt,
              borderColor: isCognitiveLayerVisible ? skin.primary : skin.borderSoft,
              borderWidth: border.soft,
              borderRadius: radius.pill,
            },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            toggleCognitiveLayer();
          }}
          activeOpacity={0.7}
          accessibilityLabel={
            isCognitiveLayerVisible ? "Ocultar capa cognitiva" : "Mostrar capa cognitiva"
          }
        >
          {isCognitiveLayerVisible ? (
            <Eye size={16} color={skin.primary} strokeWidth={2.0} />
          ) : (
            <EyeOff size={16} color={skin.textMuted} strokeWidth={2.0} />
          )}
        </TouchableOpacity>

        {/* 5. ⛶ Modo Enfoque / Zen */}
        {onToggleZenMode && (
          <TouchableOpacity
            style={[
              styles.iconButton,
              {
                backgroundColor: isZenMode ? `${skin.primary}1A` : skin.surfaceAlt,
                borderColor: isZenMode ? skin.primary : skin.borderSoft,
                borderWidth: border.soft,
                borderRadius: radius.pill,
              },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              onToggleZenMode();
            }}
            activeOpacity={0.7}
            accessibilityLabel={isZenMode ? "Salir de modo enfoque" : "Modo enfoque"}
          >
            {isZenMode ? (
              <Minimize2 size={16} color={skin.primary} strokeWidth={2.0} />
            ) : (
              <Maximize2 size={16} color={skin.textMuted} strokeWidth={2.0} />
            )}
          </TouchableOpacity>
        )}

        {/* 6. ⋮ Menú de Acciones de Documento */}
        {onOpenDocumentMenu && (
          <TouchableOpacity
            style={[
              styles.iconButton,
              {
                backgroundColor: skin.surfaceAlt,
                borderColor: skin.borderSoft,
                borderWidth: border.soft,
                borderRadius: radius.pill,
              },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              onOpenDocumentMenu();
            }}
            activeOpacity={0.7}
            accessibilityLabel="Acciones de documento"
          >
            <MoreVertical size={18} color={skin.text} strokeWidth={2.0} />
          </TouchableOpacity>
        )}
      </View>

      {/* ──────────────── Popover de Opciones de Compilación ▾ (§4 regla 4) ──────────────── */}
      <Modal
        visible={showCompileMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCompileMenu(false)}
      >
        <Pressable
          style={styles.popoverBackdrop}
          onPress={() => setShowCompileMenu(false)}
        >
          <Pressable
            style={[
              styles.popoverCard,
              {
                backgroundColor: skin.surface,
                borderColor: skin.border,
                borderWidth: border.strong,
                borderRadius: radius.card,
                shadowColor: skin.shadow,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text
              style={[
                styles.popoverHeader,
                { color: skin.textMuted, fontFamily: fonts.monoBold, fontWeight: "normal" },
              ]}
            >
              MODO DE COMPILACIÓN
            </Text>

            {/* Interruptor Actualización incremental (ON por defecto) */}
            <TouchableOpacity
              style={[
                styles.popoverRow,
                { borderBottomColor: skin.borderSoft, borderBottomWidth: border.soft },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                onToggleIncremental?.();
              }}
              activeOpacity={0.75}
            >
              <View style={styles.popoverRowText}>
                <Text style={[styles.popoverRowTitle, { color: skin.text, fontFamily: fonts.uiBold, fontWeight: "normal" }]}>
                  Actualización incremental
                </Text>
                <Text style={[styles.popoverRowSubtitle, { color: skin.textMuted, fontFamily: fonts.ui, fontWeight: "normal" }]}>
                  Conserva y refina los nodos y relaciones previas.
                </Text>
              </View>
              <View
                style={[
                  styles.toggleSwitch,
                  {
                    backgroundColor: isIncremental ? skin.primary : skin.surfaceAlt,
                    borderColor: isIncremental ? skin.primary : skin.borderSoft,
                  },
                ]}
              >
                <View
                  style={[
                    styles.toggleThumb,
                    {
                      backgroundColor: isIncremental ? skin.onPrimary : skin.textMuted,
                      transform: [{ translateX: isIncremental ? 14 : 0 }],
                    },
                  ]}
                />
              </View>
            </TouchableOpacity>

            {/* Acción: Compilar desde cero */}
            <TouchableOpacity
              style={styles.popoverActionRow}
              onPress={handleCompileFromScratchAction}
              activeOpacity={0.75}
            >
              <RefreshCw size={14} color={skin.alert} strokeWidth={2.2} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.popoverActionTitle, { color: skin.alert, fontFamily: fonts.uiBold, fontWeight: "normal" }]}>
                  Compilar desde cero
                </Text>
                <Text style={[styles.popoverActionSubtitle, { color: skin.textMuted, fontFamily: fonts.ui, fontWeight: "normal" }]}>
                  Descarta el análisis previo y reconstruye el grafo completamente.
                </Text>
              </View>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};
