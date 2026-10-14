import React, { useEffect, useRef, useState } from "react";
import { Animated, Text, StyleSheet } from "react-native";

export interface ZenZoomToastProps {
  displayZoom: number;
  visible: boolean;
}

export const ZenZoomToast: React.FC<ZenZoomToastProps> = ({ displayZoom, visible }) => {
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [shouldRender, setShouldRender] = useState(visible);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setShouldRender(false);
        }
      });
    }
  }, [visible, opacityAnim]);

  if (!shouldRender) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.container, { opacity: opacityAnim }]}
    >
      <Text style={styles.text}>{Math.round(displayZoom * 100)}%</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 24,
    alignSelf: "center",
    backgroundColor: "rgba(15, 23, 42, 0.92)",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
    zIndex: 60,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  text: {
    color: "#F8FAFC",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});
