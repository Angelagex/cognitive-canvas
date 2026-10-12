import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  dockWrapper: {
    position: "absolute",
    top: 16,
    zIndex: 90,
  },
  dockWrapperLeft: {
    left: 14,
  },
  dockWrapperRight: {
    right: 14,
  },
  dockPill: {
    width: 48,
    backgroundColor: "#0B1120",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#1E293B",
    paddingVertical: 8,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 12,
  },
  switchSideButton: {
    width: 34,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "#1E293B",
  },
  horizontalDivider: {
    width: 28,
    height: 1,
    backgroundColor: "#1E293B",
    marginVertical: 6,
  },
  toolButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    marginVertical: 2,
    position: "relative",
  },
  toolButtonActive: {
    backgroundColor: "rgba(56, 189, 248, 0.16)",
  },
  toolActiveIndicator: {
    position: "absolute",
    width: 3,
    height: 18,
    borderRadius: 2,
    backgroundColor: "#38BDF8",
  },
  indicatorLeft: {
    left: 0,
  },
  indicatorRight: {
    right: 0,
  },
  templateButton: {
    width: 38,
    height: 38,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#1E293B",
  },
  templateButtonActive: {
    backgroundColor: "rgba(56, 189, 248, 0.2)",
    borderWidth: 1,
    borderColor: "#38BDF8",
  },
  colorButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorButtonActive: {
    borderColor: "#FFFFFF",
  },
  colorButtonCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  sizeButton: {
    width: 38,
    height: 38,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    marginVertical: 4,
    backgroundColor: "#1E293B",
  },
  sizeButtonActive: {
    backgroundColor: "rgba(56, 189, 248, 0.2)",
    borderWidth: 1,
    borderColor: "#38BDF8",
  },
  sizeIndicatorDot: {
    marginBottom: 2,
  },
  sizeLabel: {
    color: "#94A3B8",
    fontSize: 9,
    fontWeight: "700",
  },
});
