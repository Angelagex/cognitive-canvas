import { domainColors as vinkDomainColors } from "../../../theme/vink-theme";

export interface DomainColorTheme {
  stroke: string;
  glow: string;
  text: string;
  tint?: string;
  symbol: string;
}

export const DOMAIN_SYMBOLS = ["◆", "▲", "●", "■", "◈"] as const;

// 5 temas canónicos para los 5 dominios cognitivos
const CANONICAL_DOMAINS: DomainColorTheme[] = [
  {
    stroke: vinkDomainColors[0], // Cobalto #2F3DFF
    glow: "rgba(47, 61, 255, 0.16)",
    text: "#E0E7FF",
    tint: "rgba(47, 61, 255, 0.09)",
    symbol: "◆",
  },
  {
    stroke: vinkDomainColors[1], // Ámbar #FFB320
    glow: "rgba(255, 179, 32, 0.16)",
    text: "#FEF3C7",
    tint: "rgba(255, 179, 32, 0.09)",
    symbol: "▲",
  },
  {
    stroke: vinkDomainColors[2], // Coral #FF6B4A
    glow: "rgba(255, 107, 74, 0.16)",
    text: "#FFE4E6",
    tint: "rgba(255, 107, 74, 0.09)",
    symbol: "●",
  },
  {
    stroke: vinkDomainColors[3], // Salvia #2E8B6A
    glow: "rgba(46, 139, 106, 0.16)",
    text: "#D1FAE5",
    tint: "rgba(46, 139, 106, 0.09)",
    symbol: "■",
  },
  {
    stroke: "#A855F7", // Púrpura editorial (calibrado para alta visibilidad y contraste en skins)
    glow: "rgba(168, 85, 247, 0.16)",
    text: "#F3E8FF",
    tint: "rgba(168, 85, 247, 0.09)",
    symbol: "◈",
  },
];

export function getDomainColor(domainName?: string): DomainColorTheme {
  if (!domainName || domainName.trim().length === 0) {
    return CANONICAL_DOMAINS[0];
  }

  let hash = 0;
  for (let i = 0; i < domainName.length; i++) {
    hash = domainName.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % CANONICAL_DOMAINS.length;
  return CANONICAL_DOMAINS[index];
}
