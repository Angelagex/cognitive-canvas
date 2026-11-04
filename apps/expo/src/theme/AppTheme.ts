export type AppThemeId = "cobalto_crema" | "tinta_papel";

export interface AppThemeColors {
  bgApp: string;
  bgHeader: string;
  bgCard: string;
  bgCardHover: string;
  bgInput: string;
  borderSubtle: string;
  borderActive: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accentPrimary: string;
  accentSecondary: string;
  accentDanger: string;
  pillActiveBg: string;
  pillActiveText: string;
  pillInactiveBg: string;
  pillInactiveText: string;
  badgeBg: string;
  badgeBorder: string;
  swatches: string[];
}

export interface AppThemeFonts {
  display: string;
  displayItalic?: string;
  displayWeight?: "normal" | "bold" | "700" | "800";
  body: string;
  bodyBold: string;
  mono: string;
  monoBold: string;
}

export interface TextStyleObject {
  fontFamily: string;
  fontWeight: "normal";
}

export interface AppThemeTypography {
  display: TextStyleObject;
  displayItalic: TextStyleObject;
  body: TextStyleObject;
  bodyBold: TextStyleObject;
  mono: TextStyleObject;
  monoBold: TextStyleObject;
}

export interface AppThemeConfig {
  id: AppThemeId;
  name: string;
  tagline: string;
  direction: "A" | "B";
  concept: string;
  colors: AppThemeColors;
  fonts: AppThemeFonts;
  typography: AppThemeTypography;
}

export const APP_THEMES: Record<AppThemeId, AppThemeConfig> = {
  cobalto_crema: {
    id: "cobalto_crema",
    name: "Cobalto y Crema",
    tagline: "Piensa en trazos. · Think in strokes.",
    direction: "B",
    concept:
      "Casi monocromo, con un azul que grita y un ámbar que remata. Pide bloques grandes y tipografía grande.",
    colors: {
      bgApp: "#0C0E14",
      bgHeader: "#131622",
      bgCard: "#161925",
      bgCardHover: "#1E2232",
      bgInput: "#10131E",
      borderSubtle: "rgba(185, 189, 208, 0.12)",
      borderActive: "#2F3DFF",
      textPrimary: "#F3EDE0",
      textSecondary: "#B9BDD0",
      textMuted: "#686C80",
      accentPrimary: "#2F3DFF",
      accentSecondary: "#FFB320",
      accentDanger: "#FF6B4A",
      pillActiveBg: "#2F3DFF",
      pillActiveText: "#FFFFFF",
      pillInactiveBg: "#1C1F2B",
      pillInactiveText: "#B9BDD0",
      badgeBg: "rgba(47, 61, 255, 0.16)",
      badgeBorder: "#2F3DFF",
      swatches: ["#0C0E14", "#1C1F2B", "#2F3DFF", "#FFB320", "#FF6B4A", "#B9BDD0", "#F3EDE0"],
    },
    fonts: {
      display: "BarlowCondensed_800ExtraBold",
      displayWeight: "800",
      body: "PlusJakartaSans_500Medium",
      bodyBold: "PlusJakartaSans_700Bold",
      mono: "SpaceMono_400Regular",
      monoBold: "SpaceMono_700Bold",
    },
    typography: {
      display: { fontFamily: "BarlowCondensed_800ExtraBold", fontWeight: "normal" },
      displayItalic: { fontFamily: "BarlowCondensed_700Bold", fontWeight: "normal" },
      body: { fontFamily: "PlusJakartaSans_500Medium", fontWeight: "normal" },
      bodyBold: { fontFamily: "PlusJakartaSans_700Bold", fontWeight: "normal" },
      mono: { fontFamily: "SpaceMono_400Regular", fontWeight: "normal" },
      monoBold: { fontFamily: "SpaceMono_700Bold", fontWeight: "normal" },
    },
  },
  tinta_papel: {
    id: "tinta_papel",
    name: "Tinta y Papel",
    tagline: "Ink that links. · Tinta que enlaza.",
    direction: "A",
    concept:
      "Azul-tinta profundo, no gris-pizarra. Un solo color de alarma (bermellón) y dos acentos que se ganan su lugar.",
    colors: {
      bgApp: "#10142A",
      bgHeader: "#151B38",
      bgCard: "#1A2040",
      bgCardHover: "#222B54",
      bgInput: "#0D1124",
      borderSubtle: "#2B3363",
      borderActive: "#4C6FFF",
      textPrimary: "#F3EEE3",
      textSecondary: "rgba(243, 238, 227, 0.72)",
      textMuted: "rgba(243, 238, 227, 0.42)",
      accentPrimary: "#4C6FFF",
      accentSecondary: "#FFD23F",
      accentDanger: "#FF5A3C",
      pillActiveBg: "#4C6FFF",
      pillActiveText: "#FFFFFF",
      pillInactiveBg: "#1A2040",
      pillInactiveText: "rgba(243, 238, 227, 0.72)",
      badgeBg: "rgba(76, 111, 255, 0.16)",
      badgeBorder: "#4C6FFF",
      swatches: ["#10142A", "#1A2040", "#2B3363", "#F3EEE3", "#FF5A3C", "#FFD23F", "#4C6FFF"],
    },
    fonts: {
      display: "InstrumentSerif_400Regular",
      displayItalic: "InstrumentSerif_400Regular_Italic",
      displayWeight: "normal",
      body: "PlusJakartaSans_400Regular",
      bodyBold: "PlusJakartaSans_600SemiBold",
      mono: "SpaceMono_400Regular",
      monoBold: "SpaceMono_700Bold",
    },
    typography: {
      display: { fontFamily: "InstrumentSerif_400Regular", fontWeight: "normal" },
      displayItalic: { fontFamily: "InstrumentSerif_400Regular_Italic", fontWeight: "normal" },
      body: { fontFamily: "PlusJakartaSans_400Regular", fontWeight: "normal" },
      bodyBold: { fontFamily: "PlusJakartaSans_600SemiBold", fontWeight: "normal" },
      mono: { fontFamily: "SpaceMono_400Regular", fontWeight: "normal" },
      monoBold: { fontFamily: "SpaceMono_700Bold", fontWeight: "normal" },
    },
  },
};

