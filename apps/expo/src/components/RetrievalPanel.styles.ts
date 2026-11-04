import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 6,
  },
  monoStatsLine: {
    fontSize: 10,
    letterSpacing: 0.8,
  },
  mapTitle: {
    fontSize: 18,
    letterSpacing: 0.5,
    lineHeight: 22,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 10,
  },
  layerToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
  },
  layerToggleText: {
    fontSize: 10,
    letterSpacing: 0.4,
  },
  pacerScroll: {
    flex: 1,
  },
  pacerScrollContent: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  pacerChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  pacerChipText: {
    fontSize: 10,
    letterSpacing: 0.5,
  },
  tabsRow: {
    flexDirection: "row",
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 6,
  },
  tabLabel: {
    fontSize: 12,
  },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  tabBadgeText: {
    fontSize: 10,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  sectionStack: {
    gap: 18,
  },
  subSection: {
    gap: 8,
  },
  subSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  subSectionTitle: {
    fontSize: 10,
    letterSpacing: 0.8,
  },
  emptyNotice: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  emptyNoticeText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  // Falacias
  misconceptionCard: {
    padding: 14,
    gap: 8,
  },
  cardCategoryLabel: {
    fontSize: 9,
    letterSpacing: 0.8,
  },
  quoteBlock: {
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: "rgba(255, 255, 255, 0.2)",
    gap: 2,
  },
  quoteLabel: {
    fontSize: 9,
    letterSpacing: 0.5,
  },
  studentClaimText: {
    fontSize: 13,
    lineHeight: 18,
    fontStyle: "italic",
  },
  flawBlock: {
    gap: 2,
  },
  flawLabel: {
    fontSize: 9,
    letterSpacing: 0.5,
  },
  flawExplanationText: {
    fontSize: 12,
    lineHeight: 18,
  },
  remediationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  remediationTag: {
    fontSize: 10,
    letterSpacing: 0.5,
  },
  remediationText: {
    fontSize: 12,
  },
  // Omisiones
  omissionCard: {
    padding: 14,
    gap: 6,
  },
  omissionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  omissionConceptName: {
    fontSize: 14,
    letterSpacing: 0.5,
  },
  omissionSignificanceText: {
    fontSize: 12,
    lineHeight: 17,
  },
  // Ghost links
  ghostCard: {
    padding: 12,
    gap: 8,
  },
  ghostClusterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  clusterPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  clusterPillText: {
    fontSize: 10,
  },
  ghostTensionText: {
    fontSize: 12,
    lineHeight: 17,
  },
  // Auditoría socrática
  socraticCard: {
    padding: 14,
    gap: 10,
  },
  socraticHeaderRow: {
    gap: 2,
  },
  socraticTargetTag: {
    fontSize: 9,
    letterSpacing: 0.8,
  },
  socraticTargetName: {
    fontSize: 15,
    letterSpacing: 0.5,
  },
  socraticQuestionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  socraticInvariantFooter: {
    paddingTop: 8,
    gap: 2,
  },
  socraticInvariantLabel: {
    fontSize: 9,
    letterSpacing: 0.6,
  },
  socraticInvariantBody: {
    fontSize: 11,
    lineHeight: 16,
    fontStyle: "italic",
  },
  socraticActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
    flexWrap: "wrap",
  },
  socraticActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  socraticActionBtnText: {
    fontSize: 11,
  },
});
