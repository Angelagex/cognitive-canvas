import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Modal,
  StyleSheet,
  StyleProp,
  ViewStyle,
  DimensionValue,
} from "react-native";
import { X } from "@sketchyicons/react-native";
import { useSkin, radius, border, fonts } from "../../theme";

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  maxHeight?: DimensionValue;
}

export const Sheet: React.FC<SheetProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  children,
  style,
  contentStyle,
  maxHeight = "85%",
}) => {
  const { skin } = useSkin();

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheetContainer,
            {
              backgroundColor: skin.surface,
              borderColor: skin.borderSoft,
              borderWidth: border.soft,
              borderTopLeftRadius: radius.sheet,
              borderTopRightRadius: radius.sheet,
              maxHeight,
            },
            style,
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Indicador superior de arrastre */}
          <View style={styles.handleContainer}>
            <View
              style={[
                styles.handleBar,
                { backgroundColor: skin.borderSoft },
              ]}
            />
          </View>

          {/* Encabezado */}
          {(title || subtitle) && (
            <View
              style={[
                styles.headerRow,
                { borderBottomColor: skin.borderSoft },
              ]}
            >
              <View style={styles.headerTextCol}>
                {title && (
                  <Text
                    style={[
                      styles.title,
                      {
                        color: skin.text,
                        fontFamily: fonts.display,
                        fontWeight: "normal",
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {title}
                  </Text>
                )}
                {subtitle && (
                  <Text
                    style={[
                      styles.subtitle,
                      {
                        color: skin.textMuted,
                        fontFamily: fonts.ui,
                        fontWeight: "normal",
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {subtitle}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={[
                  styles.closeBtn,
                  {
                    backgroundColor: skin.surfaceAlt,
                    borderColor: skin.borderSoft,
                  },
                ]}
                activeOpacity={0.7}
              >
                <X size={16} color={skin.textMuted} strokeWidth={2.0} />
              </TouchableOpacity>
            </View>
          )}

          {/* Cuerpo */}
          <View style={[styles.body, contentStyle]}>{children}</View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(12, 14, 20, 0.65)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    width: "100%",
    paddingBottom: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 20,
  },
  handleContainer: {
    alignItems: "center",
    paddingVertical: 10,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTextCol: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    letterSpacing: -0.2,
    textTransform: "uppercase",
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  body: {
    padding: 20,
  },
});
