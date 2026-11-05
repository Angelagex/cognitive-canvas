import React, { useState } from "react";
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from "react-native";
import * as Haptics from "expo-haptics";
import { Plus, BookOpen, Clock, Layers, Trash2, ArrowRight } from "@sketchyicons/react-native";
import { MapDocumentSummary } from "../../../services/StorageService";
import { useSkin, fonts, radius, border } from "../../../theme";
import { Button, Badge, HardShadow } from "../../../components/ui";
import { OnboardingGuideModal } from "../../../components/modals/OnboardingGuideModal";

export interface CanvasesLibraryTabProps {
  canvases: MapDocumentSummary[];
  currentMapId: string;
  currentMapTitle: string;
  currentStrokeCount: number;
  onOpenCanvas: (mapId: string) => void;
  onCreateNewCanvas: () => void;
  onDeleteCanvas?: (mapId: string) => void;
  onOpenGuide?: () => void;
}

const formatDate = (ts: number) => {
  try {
    return new Date(ts).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Reciente";
  }
};

export const CanvasesLibraryTab: React.FC<CanvasesLibraryTabProps> = ({
  canvases,
  currentMapId,
  currentMapTitle,
  currentStrokeCount,
  onOpenCanvas,
  onCreateNewCanvas,
  onDeleteCanvas,
  onOpenGuide,
}) => {
  const { skin } = useSkin();
  const [guideVisible, setGuideVisible] = useState(false);

  const displayList: MapDocumentSummary[] =
    canvases.length > 0
      ? canvases
      : [
          {
            map_id: currentMapId,
            title: currentMapTitle || "Mapa Mental Activo",
            created_at: Date.now(),
            updated_at: Date.now(),
            stroke_count: currentStrokeCount,
            entity_count: Math.max(1, Math.ceil(currentStrokeCount / 4)),
            is_compiled: false,
          },
        ];

  const hero = displayList[0];

  const handleOpenGuide = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (onOpenGuide) onOpenGuide();
    else setGuideVisible(true);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: skin.bg }]}
      contentContainerStyle={styles.content}
    >
      {/* ──────────────── Encabezado de Biblioteca (§7) ──────────────── */}
      <View style={styles.headerRow}>
        <View style={styles.headerTextCol}>
          <Text
            style={[
              styles.sectionHeading,
              { color: skin.text, fontFamily: fonts.display },
            ]}
          >
            BIBLIOTECA
          </Text>
          <Text
            style={[
              styles.sectionSub,
              { color: skin.textMuted, fontFamily: fonts.ui },
            ]}
          >
            Modelos mentales causales y lienzos .cmn
          </Text>
        </View>

        <View style={styles.headerButtonsRow}>
          {/* Botón Guía en la barra (§7 & §8) */}
          <Button
            label="Guía"
            variant="outline"
            size="md"
            icon={<BookOpen size={14} color={skin.text} strokeWidth={2.0} />}
            onPress={handleOpenGuide}
          />

          {/* Botón Nuevo Lienzo (primary con HardShadow) */}
          <Button
            label="Nuevo lienzo"
            variant="primary"
            size="md"
            icon={<Plus size={16} color={skin.onPrimary} strokeWidth={2.2} />}
            onPress={onCreateNewCanvas}
          />
        </View>
      </View>

      {/* ──────────────── Tarjeta "Continuar estudiando" (§7) ──────────────── */}
      {hero && (
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            onOpenCanvas(hero.map_id);
          }}
          activeOpacity={0.88}
          style={styles.heroWrapper}
        >
          <HardShadow offset="md" radius={radius.card} shadowColor={skin.shadow}>
            <View
              style={[
                styles.heroCard,
                {
                  backgroundColor: skin.surface,
                  borderColor: skin.borderSoft,
                  borderWidth: border.strong,
                  borderRadius: radius.card,
                },
              ]}
            >
              <View style={styles.heroTopRow}>
                <View
                  style={[
                    styles.heroTag,
                    {
                      backgroundColor: `${skin.primary}16`,
                      borderColor: skin.primary,
                      borderWidth: border.soft,
                      borderRadius: radius.pill,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.heroTagText,
                      { color: skin.primary, fontFamily: fonts.monoBold },
                    ]}
                  >
                    CONTINUAR ESTUDIANDO
                  </Text>
                </View>

                {/* Insignia Verificado / Sin verificar */}
                <Badge
                  variant={hero.is_compiled ? "verified" : "unverified"}
                />
              </View>

              <Text
                style={[
                  styles.heroTitle,
                  { color: skin.text, fontFamily: fonts.display },
                ]}
                numberOfLines={2}
              >
                {hero.title.toUpperCase()}
              </Text>

              <View style={styles.heroMetaRow}>
                <View style={styles.metaCol}>
                  <Text
                    style={[
                      styles.heroMetaValue,
                      { color: skin.primary, fontFamily: fonts.monoBold },
                    ]}
                  >
                    {Math.max(hero.entity_count, 1)} NODOS
                  </Text>
                </View>
                <Text style={[styles.heroMetaDot, { color: skin.textMuted }]}>·</Text>
                <View style={styles.metaCol}>
                  <Text
                    style={[
                      styles.heroMetaValue,
                      { color: skin.textMuted, fontFamily: fonts.mono },
                    ]}
                  >
                    {hero.stroke_count} TRAZOS
                  </Text>
                </View>
                <Text style={[styles.heroMetaDot, { color: skin.textMuted }]}>·</Text>
                <View style={styles.metaCol}>
                  <Text
                    style={[
                      styles.heroMetaValue,
                      { color: skin.textMuted, fontFamily: fonts.mono },
                    ]}
                  >
                    Actualizado {formatDate(hero.updated_at)}
                  </Text>
                </View>
                <View style={{ flex: 1 }} />
                <ArrowRight size={16} color={skin.primary} strokeWidth={2.0} />
              </View>
            </View>
          </HardShadow>
        </TouchableOpacity>
      )}

      {/* ──────────────── Cuadrícula de Lienzos (§7) ──────────────── */}
      <Text
        style={[
          styles.gridHeader,
          { color: skin.textMuted, fontFamily: fonts.monoBold },
        ]}
      >
        TODOS LOS LIENZOS ({displayList.length})
      </Text>

      <View style={styles.grid}>
        {displayList.map((item) => {
          const nodeCount = Math.max(item.entity_count, item.stroke_count > 0 ? 1 : 0);
          return (
            <TouchableOpacity
              key={item.map_id}
              style={styles.cardTouchWrapper}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                onOpenCanvas(item.map_id);
              }}
              activeOpacity={0.85}
            >
              <HardShadow offset="sm" radius={radius.card} shadowColor={skin.shadow}>
                <View
                  style={[
                    styles.canvasCard,
                    {
                      backgroundColor: skin.surface,
                      borderColor: skin.borderSoft,
                      borderWidth: border.soft,
                      borderRadius: radius.card,
                    },
                  ]}
                >
                  <View style={styles.cardTopRow}>
                    <View
                      style={[
                        styles.iconCircle,
                        {
                          backgroundColor: skin.surfaceAlt,
                          borderColor: skin.borderSoft,
                          borderWidth: border.soft,
                        },
                      ]}
                    >
                      <Layers size={14} color={skin.primary} strokeWidth={2.0} />
                    </View>

                    <Badge
                      variant={item.is_compiled ? "verified" : "unverified"}
                    />
                  </View>

                  <Text
                    style={[
                      styles.cardTitle,
                      { color: skin.text, fontFamily: fonts.display },
                    ]}
                    numberOfLines={2}
                  >
                    {item.title.toUpperCase()}
                  </Text>

                  <View style={styles.cardFooter}>
                    <View>
                      <Text
                        style={[
                          styles.cardNodeCount,
                          { color: skin.primary, fontFamily: fonts.monoBold },
                        ]}
                      >
                        {nodeCount} NODOS · {item.stroke_count} TRAZOS
                      </Text>
                      <Text
                        style={[
                          styles.cardDate,
                          { color: skin.textMuted, fontFamily: fonts.mono },
                        ]}
                      >
                        {formatDate(item.updated_at)}
                      </Text>
                    </View>

                    {onDeleteCanvas && displayList.length > 1 && (
                      <TouchableOpacity
                        style={[
                          styles.deleteBtn,
                          { backgroundColor: skin.surfaceAlt },
                        ]}
                        onPress={(e) => {
                          e.stopPropagation();
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                          onDeleteCanvas(item.map_id);
                        }}
                        accessibilityLabel="Eliminar lienzo"
                      >
                        <Trash2 size={13} color={skin.alert} strokeWidth={1.8} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </HardShadow>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Modal de Guía de uso (§8) */}
      <OnboardingGuideModal
        visible={guideVisible}
        onClose={() => setGuideVisible(false)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 48,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    gap: 12,
  },
  headerTextCol: {
    flex: 1,
  },
  sectionHeading: {
    fontSize: 26,
    letterSpacing: 0.8,
  },
  sectionSub: {
    fontSize: 13,
    marginTop: 2,
  },
  headerButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  heroWrapper: {
    marginBottom: 24,
  },
  heroCard: {
    padding: 20,
    gap: 12,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTagText: {
    fontSize: 10,
    letterSpacing: 0.8,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  heroTitle: {
    fontSize: 22,
    letterSpacing: 0.5,
    lineHeight: 26,
    includeFontPadding: false,
  },
  heroMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 4,
  },
  metaCol: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  heroMetaValue: {
    fontSize: 11,
    letterSpacing: 0.5,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  heroMetaDot: {
    fontSize: 12,
  },
  gridHeader: {
    fontSize: 11,
    letterSpacing: 1.0,
    marginBottom: 12,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  cardTouchWrapper: {
    width: "31.5%",
    minWidth: 230,
  },
  canvasCard: {
    padding: 16,
    justifyContent: "space-between",
    minHeight: 145,
    gap: 10,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 15,
    letterSpacing: 0.5,
    lineHeight: 19,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingTop: 4,
  },
  cardNodeCount: {
    fontSize: 10,
    letterSpacing: 0.5,
  },
  cardDate: {
    fontSize: 10,
    marginTop: 2,
  },
  deleteBtn: {
    padding: 6,
    borderRadius: 6,
  },
});
