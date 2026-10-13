import "react-native";

declare module "react-native" {
  interface ModalPropsAndroid {
    navigationBarTranslucent?: boolean;
  }
}
