import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  Pressable,
  FlatList,
} from "react-native";
import Svg, { Polyline } from "react-native-svg";
import { X, Search } from "@sketchyicons/react-native";
import type { VectorSticker } from "@cognitive-canvas/core";
import {
  getStickerCategories,
  type StickerCategoryTab,
} from "../../services/StickerCatalogService";
import { insertStickerInSelectionMode } from "../../components/JetpackInkCanvas";
import { styles } from "./StickerPickerModal.styles";

export { type StickerCategoryTab };

export interface StickerPickerModalProps {
  visible: boolean;
  targetWorld: { x: number; y: number };
  onClose: () => void;
  onSelectSticker?: (
    sticker: VectorSticker,
    targetWorld: { x: number; y: number }
  ) => void;
}

export const StickerPickerModal: React.FC<StickerPickerModalProps> = ({
  visible,
  targetWorld,
  onClose,
  onSelectSticker,
}) => {
  const [selectedTab, setSelectedTab] = useState<StickerCategoryTab>("cognitive");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedQuery, setDebouncedQuery] = useState<string>("");

  // Categorías de la pestaña activa
  const activeCategories = useMemo(
    () => getStickerCategories(selectedTab),
    [selectedTab]
  );

  // Al alternar pestaña, reiniciar filtro de categoría
  const handleTabChange = (tab: StickerCategoryTab) => {
    setSelectedTab(tab);
    setSelectedCategory("ALL");
  };

  // Debounce de 150 ms para el buscador reactivo
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim().toLowerCase());
    }, 150);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filtrado de stickers por pestaña, categoría y búsqueda
  const filteredStickers = useMemo(() => {
    const pool =
      selectedCategory === "ALL"
        ? activeCategories.flatMap((c) => c.stickers)
        : activeCategories.find((c) => c.id === selectedCategory)?.stickers || [];

    if (!debouncedQuery) return pool;

    return pool.filter(
      (s) =>
        s.name.toLowerCase().includes(debouncedQuery) ||
        s.id.toLowerCase().includes(debouncedQuery)
    );
  }, [activeCategories, selectedCategory, debouncedQuery]);

  const handlePickSticker = (sticker: VectorSticker) => {
    onClose();
    // Inyección nativa en World DP y activación de selección
    insertStickerInSelectionMode(sticker, targetWorld.x, targetWorld.y);
    onSelectSticker?.(sticker, targetWorld);
  };

  const renderStickerItem = ({ item }: { item: VectorSticker }) => (
    <TouchableOpacity
      style={styles.gridItem}
      activeOpacity={0.7}
      onPress={() => handlePickSticker(item)}
    >
      <View style={styles.svgPreviewContainer}>
        <Svg viewBox="0 0 100 100" width={48} height={48}>
          {item.strokes.map((stroke, sIdx) => {
            const pointsStr = stroke.points
              .map((p) => `${p.rx},${p.ry}`)
              .join(" ");
            return (
              <Polyline
                key={sIdx}
                points={pointsStr}
                fill="none"
                stroke="#38BDF8"
                strokeWidth={stroke.relative_width * 2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}
        </Svg>
      </View>
      <Text style={styles.stickerName} numberOfLines={1}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
      navigationBarTranslucent={true}
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <View
          style={styles.popoverWindow}
          onStartShouldSetResponder={() => true}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          {/* Header con Buscador y Botón Cerrar */}
          <View style={styles.headerRow}>
            <View style={styles.searchBar}>
              <Search size={16} color="#94A3B8" strokeWidth={2.0} />
              <TextInput
                style={styles.searchInput}
                placeholder={
                  selectedTab === "cognitive"
                    ? "Buscar en stickers cognitivos..."
                    : "Buscar en biblioteca general..."
                }
                placeholderTextColor="#64748B"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
              />
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <X size={18} color="#94A3B8" strokeWidth={2.0} />
            </TouchableOpacity>
          </View>

          {/* Selector de Pestañas (Segmented Tab Bar) */}
          <View style={styles.tabBarContainer}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                selectedTab === "cognitive" && styles.tabButtonActive,
              ]}
              onPress={() => handleTabChange("cognitive")}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  selectedTab === "cognitive" && styles.tabButtonTextActive,
                ]}
              >
                Cognitivos
              </Text>
              <View style={styles.tabBadge}>
                <Text
                  style={[
                    styles.tabBadgeText,
                    selectedTab === "cognitive" && styles.tabBadgeTextActive,
                  ]}
                >
                  8
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabButton,
                selectedTab === "general" && styles.tabButtonActive,
              ]}
              onPress={() => handleTabChange("general")}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  selectedTab === "general" && styles.tabButtonTextActive,
                ]}
              >
                Biblioteca General
              </Text>
              <View style={styles.tabBadge}>
                <Text
                  style={[
                    styles.tabBadgeText,
                    selectedTab === "general" && styles.tabBadgeTextActive,
                  ]}
                >
                  Todos
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Categorías Horizontales (Pills) */}
          <View style={styles.categoryScrollContainer}>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={[{ id: "ALL", name: "Todos" }, ...activeCategories]}
              keyExtractor={(cat) => cat.id}
              contentContainerStyle={styles.categoryPillsList}
              renderItem={({ item: cat }) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <TouchableOpacity
                    style={[
                      styles.catPill,
                      isSelected && styles.catPillSelected,
                    ]}
                    onPress={() => setSelectedCategory(cat.id)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.catPillText,
                        isSelected && styles.catPillTextSelected,
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>

          {/* Grilla Virtualizada de Stickers (4 Columnas) */}
          <FlatList
            data={filteredStickers}
            keyExtractor={(s) => s.id}
            numColumns={4}
            renderItem={renderStickerItem}
            contentContainerStyle={styles.gridContent}
            showsVerticalScrollIndicator={true}
            initialNumToRender={24}
            maxToRenderPerBatch={24}
            windowSize={5}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  No se encontraron stickers para "{searchQuery}"
                </Text>
              </View>
            }
          />
        </View>
      </Pressable>
    </Modal>
  );
};
