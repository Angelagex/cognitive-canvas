export interface DomainColorTheme {
  stroke: string;
  glow: string;
  text: string;
  tint?: string;
}

const PALETTE: DomainColorTheme[] = [
  { stroke: "#38BDF8", glow: "rgba(56, 189, 248, 0.25)", text: "#E0F2FE", tint: "rgba(12, 74, 110, 0.85)" },
  { stroke: "#A855F7", glow: "rgba(168, 85, 247, 0.25)", text: "#F3E8FF", tint: "rgba(59, 7, 100, 0.85)" },
  { stroke: "#F59E0B", glow: "rgba(245, 158, 11, 0.25)", text: "#FEF3C7", tint: "rgba(69, 26, 3, 0.85)" },
  { stroke: "#10B981", glow: "rgba(16, 185, 129, 0.25)", text: "#D1FAE5", tint: "rgba(6, 78, 59, 0.85)" },
  { stroke: "#EC4899", glow: "rgba(236, 72, 153, 0.25)", text: "#FCE7F3", tint: "rgba(80, 7, 36, 0.85)" },
  { stroke: "#06B6D4", glow: "rgba(6, 182, 212, 0.25)", text: "#CFFAFE", tint: "rgba(8, 51, 68, 0.85)" },
  { stroke: "#F97316", glow: "rgba(249, 115, 22, 0.25)", text: "#FFEDD5", tint: "rgba(67, 20, 7, 0.85)" },
];

export function getDomainColor(domainName?: string): DomainColorTheme {
  if (!domainName || domainName.trim().length === 0) {
    return PALETTE[0];
  }

  let hash = 0;
  for (let i = 0; i < domainName.length; i++) {
    hash = domainName.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % PALETTE.length;
  return PALETTE[index];
}

