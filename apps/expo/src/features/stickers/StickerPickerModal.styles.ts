import { StyleSheet, Dimensions } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
export const MODAL_WIDTH = Math.min(520, SCREEN_WIDTH - 32);
export const MODAL_HEIGHT = Math.min(560, SCREEN_HEIGHT - 64);

export const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(11, 17, 32, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  popoverWindow: {
    width: MODAL_WIDTH,
    height: MODAL_HEIGHT,
    backgroundColor: "#0F172A",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1E293B",
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  searchBar: {
    flex: 1,
    height: 40,
    backgroundColor: "#1E293B",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: "#F8FAFC",
    fontSize: 13,
    marginLeft: 8,
    paddingVertical: 0,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1E293B",
    alignItems: "center",
    justifyContent: "center",
  },
  tabBarContainer: {
    flexDirection: "row",
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 3,
    marginBottom: 10,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 9,
  },
  tabButtonActive: {
    backgroundColor: "#0284C7",
    shadowColor: "#0284C7",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  tabButtonText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
  },
  tabButtonTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  tabBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  tabBadgeText: {
    color: "#CBD5E1",
    fontSize: 10,
    fontWeight: "600",
  },
  tabBadgeTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  categoryScrollContainer: {
    height: 36,
    marginBottom: 12,
  },
  categoryPillsList: {
    paddingRight: 8,
  },
  catPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#1E293B",
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  catPillSelected: {
    backgroundColor: "#0284C7",
  },
  catPillText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
  },
  catPillTextSelected: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  gridContent: {
    paddingBottom: 16,
  },
  gridItem: {
    flex: 1 / 4,
    aspectRatio: 1,
    margin: 4,
    backgroundColor: "#1E293B",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.1)",
  },
  svgPreviewContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stickerName: {
    color: "#94A3B8",
    fontSize: 9,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 2,
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: "#64748B",
    fontSize: 13,
    textAlign: "center",
  },
});
