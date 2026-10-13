import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  dockWrapper: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  dockPill: {
    position: "absolute",
    backgroundColor: "#0B1120",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#1E293B",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 12,
  },
  dockPillVertical: {
    width: 48,
    flexDirection: "column",
    paddingVertical: 6,
    top: 16,
  },
  dockPillHorizontal: {
    height: 48,
    flexDirection: "row",
    paddingHorizontal: 6,
    alignSelf: "center",
  },
  dockPillLeft: {
    left: 14,
  },
  dockPillRight: {
    right: 14,
  },
  dockPillTop: {
    top: 14,
  },
  dockPillBottom: {
    bottom: 14,
  },
  dragHandle: {
    width: 34,
    height: 22,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 6,
  },
  dragHandleHorizontal: {
    width: 22,
    height: 34,
  },
  dividerVertical: {
    width: 28,
    height: 1,
    backgroundColor: "#1E293B",
    marginVertical: 4,
  },
  dividerHorizontal: {
    width: 1,
    height: 28,
    backgroundColor: "#1E293B",
    marginHorizontal: 4,
  },
  toolButton: {
    width: 38,
    height: 38,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 11,
    marginVertical: 1,
    marginHorizontal: 1,
    position: "relative",
  },
  toolButtonActive: {
    backgroundColor: "rgba(56, 189, 248, 0.16)",
  },
  toolActiveIndicator: {
    position: "absolute",
    backgroundColor: "#38BDF8",
    borderRadius: 2,
  },
  indicatorLeft: {
    left: 0,
    width: 3,
    height: 18,
  },
  indicatorRight: {
    right: 0,
    width: 3,
    height: 18,
  },
  indicatorTop: {
    top: 0,
    width: 18,
    height: 3,
  },
  indicatorBottom: {
    bottom: 0,
    width: 18,
    height: 3,
  },
  templateButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 11,
    backgroundColor: "#1E293B",
  },
  templateButtonActive: {
    backgroundColor: "rgba(56, 189, 248, 0.2)",
    borderWidth: 1,
    borderColor: "#38BDF8",
  },
  colorButton: {
    width: 34,
    height: 34,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 17,
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorButtonActive: {
    borderColor: "#FFFFFF",
  },
  colorButtonCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  sizeButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 11,
    marginVertical: 2,
    marginHorizontal: 2,
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
