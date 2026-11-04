/**
 * Vink · Cognitive Canvas — design tokens
 * Fuente de verdad visual. Úsalo tal cual; no hardcodees colores en componentes.
 *
 * Fuentes (Google Fonts, vía @expo-google-fonts/*):
 *   - Barlow Condensed (700, 800)       -> display (títulos, números grandes). SIEMPRE en MAYÚSCULAS.
 *   - Plus Jakarta Sans (400, 600, 700) -> interfaz y cuerpo
 *   - Space Mono (400, 700)             -> etiquetas, metadatos, contadores
 *   - Instrument Serif (italic)         -> display SOLO en el skin "tinta"
 */

// ───────────────────────── Paleta base ─────────────────────────
export const palette = {
  // Neutros cálidos
  cream: '#F3EDE0',
  creamSurface: '#FBF7EE',
  creamDeep: '#EBE3D1',
  inkBlack: '#0C0E14',
  night: '#0E1018',
  nightSurface: '#171A26',
  fog: '#B9BDD0',
  muted: '#6B6F80',
  mutedOnDark: '#8A8EA3', // subir si falla contraste (ver guía)
  // Skin "tinta" (azul-tinta editorial)
  ink: '#10142A',
  inkSurface: '#1A2040',
  inkLine: '#2B3363',
  paper: '#F3EEE3',
  // Acentos
  cobalt: '#2F3DFF',
  cobaltOnDark: '#5A68FF', // cobalto aclarado para fondos oscuros
  cobaltSoft: '#4C6FFF', // skin "tinta"
  amber: '#FFB320',
  highlighter: '#FFD23F', // skin "tinta"
  coral: '#FF6B4A',
  vermilion: '#FF5A3C', // skin "tinta"
  purple: '#A855F7', // Analogía cognitiva (Doc 03: previene colisión con coral de alarma)
  purpleOnDark: '#C084FC',
  moss: '#2E8B6A', // 5.º dominio / "Verificado" en claro
  mossOnDark: '#3DBE92',
} as const;

// ───────────────────────── Skins ─────────────────────────
export type SkinId = 'crema' | 'noche' | 'tinta';

export type Skin = {
  id: SkinId;
  name: string;
  tagline: string;
  concept: string;
  mode: 'light' | 'dark';
  bg: string; // fondo de pantalla / papel del lienzo
  surface: string; // tarjetas, barras, paneles
  surfaceAlt: string; // bandas alternas (matriz)
  text: string;
  textMuted: string;
  border: string; // borde fuerte (tarjetas, botones outline)
  borderSoft: string; // separadores
  shadow: string; // sombra sólida desplazada
  primary: string; // acción principal (Compilar)
  onPrimary: string;
  warm: string; // acento cálido: lo que la IA señala
  alert: string; // errores de modelo, borrar
  success: string; // Verificado
  gridDot: string; // cuadrícula de puntos del lienzo
  defaultInk: string; // color de tinta por defecto sobre este papel
  displayFont: 'barlow' | 'serif';
  swatches: string[];
};

export const skins: Record<SkinId, Skin> = {
  crema: {
    id: 'crema',
    name: 'Cobalto y Crema',
    tagline: 'Piensa en trazos. · Think in strokes.',
    concept: 'Casi monocromo, con un azul que grita y un ámbar que remata. Pide bloques grandes y tipografía grande.',
    mode: 'light',
    bg: palette.cream,
    surface: palette.creamSurface,
    surfaceAlt: palette.creamDeep,
    text: palette.inkBlack,
    textMuted: palette.muted,
    border: palette.inkBlack,
    borderSoft: palette.inkBlack + '33',
    shadow: palette.inkBlack,
    primary: palette.cobalt,
    onPrimary: palette.cream,
    warm: palette.amber,
    alert: palette.coral,
    success: palette.moss,
    gridDot: palette.inkBlack + '22',
    defaultInk: palette.inkBlack,
    displayFont: 'barlow',
    swatches: [palette.cream, palette.creamSurface, palette.cobalt, palette.amber, palette.coral, palette.inkBlack],
  },
  noche: {
    id: 'noche',
    name: 'Noche Obsidiana',
    tagline: 'Claridad en la penumbra. · Night cognition.',
    concept: 'Obsidiana profunda con cobalto brillante y acentos ámbar. Diseñado para sesiones de estudio nocturno sin fatiga.',
    mode: 'dark',
    bg: palette.night,
    surface: palette.nightSurface,
    surfaceAlt: '#12141D',
    text: palette.cream,
    textMuted: palette.mutedOnDark,
    border: palette.cream + '66',
    borderSoft: palette.cream + '22',
    shadow: '#262B45', // en oscuro la sombra NO es negra: negro sobre negro no se ve
    primary: palette.cobaltOnDark,
    onPrimary: palette.cream,
    warm: palette.amber,
    alert: palette.coral,
    success: palette.mossOnDark,
    gridDot: palette.cream + '22',
    defaultInk: palette.cream,
    displayFont: 'barlow',
    swatches: [palette.night, palette.nightSurface, palette.cobaltOnDark, palette.amber, palette.coral, palette.cream],
  },
  tinta: {
    id: 'tinta',
    name: 'Tinta y Papel',
    tagline: 'Ink that links. · Tinta que enlaza.',
    concept: 'Azul-tinta profundo editorial con serifa y bermellón. Elegancia libresca y contraste clásico.',
    mode: 'dark',
    bg: palette.ink,
    surface: palette.inkSurface,
    surfaceAlt: '#141934',
    text: palette.paper,
    textMuted: '#9AA0C4',
    border: palette.paper + '66',
    borderSoft: palette.paper + '22',
    shadow: palette.inkLine,
    primary: palette.cobaltSoft,
    onPrimary: palette.paper,
    warm: palette.highlighter,
    alert: palette.vermilion,
    success: palette.mossOnDark,
    gridDot: palette.paper + '22',
    defaultInk: palette.paper,
    displayFont: 'serif',
    swatches: [palette.ink, palette.inkSurface, palette.inkLine, palette.paper, palette.vermilion, palette.highlighter, palette.cobaltSoft],
  },
};

// Presets de papel del lienzo (4 presets canónicos; removidos Pizarra Azulada y Marfil Cálido)
export const canvasPapers = {
  crema: { id: 'crema', label: 'Cobalto y Crema', bg: palette.cream, ink: palette.inkBlack, grid: palette.inkBlack + '22', isDark: false },
  noche: { id: 'noche', label: 'Noche Obsidiana', bg: palette.night, ink: palette.cream, grid: palette.cream + '22', isDark: true },
  tinta: { id: 'tinta', label: 'Tinta y Papel', bg: palette.ink, ink: palette.paper, grid: palette.paper + '22', isDark: true },
  folio: { id: 'folio', label: 'Blanco Puro', bg: '#FFFFFF', ink: '#111111', grid: '#E2E8F0', isDark: false },
} as const;

export type CanvasPaperPreset = keyof typeof canvasPapers;

// ───────────────────────── Color funcional ─────────────────────────
// Validado contra 03_COGNITIVE_AST_AND_PIPELINE.md §3.1:
// - Mecanismo causal = Cobalto / Azul profundo
// - Analogía = Púrpura místico (#A855F7, previene colisión con Coral de Alerta)
// - Evidencia = Ámbar / Oro
export const nodeKind = {
  mecanismo: palette.cobalt, // invariante / mecanismo causal
  analogia: palette.purple,  // analogía cognitiva según Doc 03
  evidencia: palette.amber,  // evidencia empírica
} as const;

// Contratos del nodo en el panel de análisis
export const contractColors = {
  invariante: palette.cobalt,
  puntoDeQuiebre: palette.coral,
  tradeoff: palette.amber,
} as const;

// Dominios de la Matriz (5 colores). NO depender solo del color: añadir símbolo/forma.
export const domainColors = [palette.amber, palette.coral, palette.cobalt, palette.inkBlack, palette.moss] as const;

// Tipos PACER (filtros). Mostrar los 5.
export const pacerTypes = ['TODOS', 'PROC', 'ANAL', 'CONC', 'EVID', 'REFE'] as const;

// ───────────────────────── Tipografía ─────────────────────────
export const fonts = {
  display: 'BarlowCondensed_800ExtraBold',
  displayBold: 'BarlowCondensed_700Bold',
  displaySerif: 'InstrumentSerif_400Regular_Italic', // solo skin "tinta"
  ui: 'PlusJakartaSans_400Regular',
  uiSemi: 'PlusJakartaSans_600SemiBold',
  uiBold: 'PlusJakartaSans_700Bold',
  mono: 'SpaceMono_400Regular',
  monoBold: 'SpaceMono_700Bold',
} as const;

export const type = {
  // escala: 12 · 14 · 16 · 20 · 28 · 40 · 64 · 96
  display96: { fontFamily: fonts.display, fontWeight: 'normal' as const, fontSize: 96, lineHeight: 94, textTransform: 'uppercase' as const, letterSpacing: -1 },
  display64: { fontFamily: fonts.display, fontWeight: 'normal' as const, fontSize: 64, lineHeight: 62, textTransform: 'uppercase' as const, letterSpacing: -0.5 },
  display40: { fontFamily: fonts.display, fontWeight: 'normal' as const, fontSize: 40, lineHeight: 40, textTransform: 'uppercase' as const },
  title28: { fontFamily: fonts.display, fontWeight: 'normal' as const, fontSize: 28, lineHeight: 29, textTransform: 'uppercase' as const },
  title20: { fontFamily: fonts.uiBold, fontWeight: 'normal' as const, fontSize: 20, lineHeight: 26 },
  body16: { fontFamily: fonts.ui, fontWeight: 'normal' as const, fontSize: 16, lineHeight: 24 },
  body14: { fontFamily: fonts.ui, fontWeight: 'normal' as const, fontSize: 14, lineHeight: 21 },
  label12: { fontFamily: fonts.mono, fontWeight: 'normal' as const, fontSize: 12, lineHeight: 16, letterSpacing: 1, textTransform: 'uppercase' as const },
  micro10: { fontFamily: fonts.monoBold, fontWeight: 'normal' as const, fontSize: 10, lineHeight: 14, letterSpacing: 1.2, textTransform: 'uppercase' as const },
} as const;

// ───────────────────────── Espaciado, forma, profundidad ─────────────────────────
export const space = { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48, 8: 64 } as const;
export const radius = { chip: 8, tool: 12, card: 16, panel: 22, sheet: 28, pill: 999 } as const;
export const border = { strong: 1.5, soft: 1 } as const;
export const touch = { min: 48, penSafeMargin: 16, toolbarButton: 40, barHeight: 56 } as const;

// Sombra "sticker": sólida y desplazada, sin blur.
// iOS: shadowRadius 0 + shadowOffset. ANDROID: elevation NO soporta sombra dura;
// implementar con una View hermana desplazada (ver guía §3).
export const hardShadow = { sm: 2, md: 3, lg: 4 } as const;

// ───────────────────────── Movimiento y háptica ─────────────────────────
export const motion = {
  tap: 120, // ms
  nodeInk: 160, // un nodo "se entinta"
  sheet: 280,
  inkDry: 400, // el trazo recién dibujado oscurece ligeramente
} as const; // Respetar "reducir movimiento" del sistema. NUNCA bloquear ni retrasar la pluma.

export const haptics = {
  penCrossNode: 'selection', // tick suave
  macroIslandDone: 'double-pulse',
  scratchOrError: 'short-sharp',
  drawAndHold: 'ramp-to-confirm', // ya existe (450 ms)
  verified: 'success',
} as const;

export const theme = {
  palette,
  skins,
  canvasPapers,
  nodeKind,
  contractColors,
  domainColors,
  pacerTypes,
  fonts,
  type,
  space,
  radius,
  border,
  touch,
  hardShadow,
  motion,
  haptics,
};

export default theme;

