import React from "react";
import { StyleSheet, View, Text, Modal, TouchableOpacity, TouchableWithoutFeedback } from "react-native";
import { AlertTriangle, Trash2 } from "@sketchyicons/react-native";
import { useSkin, fonts, radius, border } from "../../theme";

interface ClearCanvasConfirmModalProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ClearCanvasConfirmModal: React.FC<ClearCanvasConfirmModalProps> = ({
  visible,
  onConfirm,
  onCancel,
}) => {
  const { skin } = useSkin();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
      navigationBarTranslucent={true}
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.dialogCard,
                {
                  backgroundColor: skin.surface,
                  borderColor: skin.borderSoft,
                  borderWidth: border.strong,
                  borderRadius: radius.card,
                },
              ]}
            >
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: `${skin.alert}1A`,
                    borderColor: `${skin.alert}44`,
                  },
                ]}
              >
                <AlertTriangle size={26} color={skin.alert} strokeWidth={2.0} />
              </View>

              <Text
                style={[
                  styles.title,
                  {
                    color: skin.text,
                    fontFamily: fonts.display,
                  },
                ]}
              >
                ¿LIMPIAR TODO EL LIENZO?
              </Text>
              <Text
                style={[
                  styles.description,
                  {
                    color: skin.textMuted,
                    fontFamily: fonts.ui,
                  },
                ]}
              >
                Esta acción eliminará todos los trazos manuscritos y notas cognitivas actuales de la pantalla. Los mapas guardados previamente en tu bóveda no se verán afectados.
              </Text>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[
                    styles.cancelButton,
                    {
                      backgroundColor: skin.surfaceAlt,
                      borderColor: skin.borderSoft,
                      borderRadius: radius.pill,
                    },
                  ]}
                  onPress={onCancel}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.cancelText,
                      {
                        color: skin.text,
                        fontFamily: fonts.uiBold,
                      },
                    ]}
                  >
                    Cancelar
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.confirmButton,
                    {
                      backgroundColor: skin.alert,
                      borderRadius: radius.pill,
                    },
                  ]}
                  onPress={onConfirm}
                  activeOpacity={0.7}
                >
                  <Trash2 size={16} color="#FFFFFF" strokeWidth={1.8} />
                  <Text
                    style={[
                      styles.confirmText,
                      {
                        fontFamily: fonts.uiBold,
                      },
                    ]}
                  >
                    Borrar Lienzo
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(3, 7, 18, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  dialogCard: {
    width: "100%",
    maxWidth: 420,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    letterSpacing: 0.5,
    marginBottom: 8,
    textAlign: "center",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginBottom: 24,
    includeFontPadding: false,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  cancelText: {
    fontSize: 13,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  confirmText: {
    color: "#FFFFFF",
    fontSize: 13,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
});
