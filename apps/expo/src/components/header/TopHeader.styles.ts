import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  header: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    zIndex: 20,
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  menuButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    gap: 4,
  },
  menuText: {
    fontSize: 12,
  },
  divider: {
    width: 1,
    height: 22,
    marginRight: 10,
  },
  titleDisplayButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 8,
    gap: 6,
    maxWidth: 240,
  },
  titleDisplayText: {
    fontSize: 16,
    letterSpacing: 0.5,
  },
  titleEditContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    paddingLeft: 8,
    paddingRight: 4,
    paddingVertical: 2,
    gap: 4,
  },
  titleInputActive: {
    fontSize: 15,
    minWidth: 150,
    paddingVertical: 2,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
  },
  titleConfirmBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  titleCancelBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  saveBadgeContainer: {
    marginLeft: 10,
    justifyContent: "center",
  },
  savingBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  savingText: {
    fontSize: 11,
  },
  savedBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  savedText: {
    fontSize: 11,
  },
  centerSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 8,
  },
  historyButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.35,
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  // Explicación adjunta pill
  explanationAttachedPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 10,
    paddingRight: 4,
    height: 34,
    gap: 6,
  },
  explanationAttachedTouch: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  explanationAttachedText: {
    fontSize: 12,
  },
  clearExplanationBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  // Explicar simple
  explainButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    height: 34,
    gap: 6,
  },
  explainText: {
    fontSize: 12,
  },
  // Compilar Split button
  compileGroup: {
    position: "relative",
  },
  splitCompileBtn: {
    flexDirection: "row",
    alignItems: "center",
    height: 34,
    overflow: "hidden",
  },
  splitCompileMain: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 12,
    paddingRight: 8,
    height: "100%",
  },
  compileBtnLabel: {
    fontSize: 12,
    letterSpacing: 0.3,
  },
  splitCompileChevron: {
    height: "100%",
    width: 26,
    justifyContent: "center",
    alignItems: "center",
    borderLeftWidth: 1,
  },
  // Análisis
  inspectionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    height: 34,
    gap: 6,
    position: "relative",
  },
  inspectionButtonText: {
    fontSize: 12,
  },
  blindSpotBadge: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
    marginLeft: 2,
  },
  blindSpotBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontFamily: "SpaceMono_700Bold",
  },
  iconButton: {
    width: 34,
    height: 34,
    justifyContent: "center",
    alignItems: "center",
  },
  // Popover modal
  popoverBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 56,
    paddingRight: 100,
  },
  popoverCard: {
    width: 320,
    padding: 14,
  },
  popoverHeader: {
    fontSize: 10,
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  popoverRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    gap: 12,
  },
  popoverRowText: {
    flex: 1,
  },
  popoverRowTitle: {
    fontSize: 13,
    marginBottom: 2,
  },
  popoverRowSubtitle: {
    fontSize: 11,
    lineHeight: 14,
  },
  toggleSwitch: {
    width: 38,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    padding: 2,
    justifyContent: "center",
  },
  toggleThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  popoverActionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
    gap: 10,
  },
  popoverActionTitle: {
    fontSize: 13,
    marginBottom: 2,
  },
  popoverActionSubtitle: {
    fontSize: 11,
    lineHeight: 14,
  },
});
