# ESPECIFICACIÓN TÉCNICA: GHOST OVERLAY HUD Y PIPELINE MACRO-COGNITIVO V2
Contratos de Integración, Rendering de Capas Semánticas y Ciclo de Vida Reactivo

================================================================================
1. VISIÓN GENERAL DE LA IMPLEMENTACIÓN
================================================================================

Este módulo implementa el sistema de visualización HUD ("Ghost Overlay") sobre el lienzo infinito y reestructura el pipeline de inferencia con Gemini 3.8 / Flash para operar a nivel macro (islas conceptuales, diagnóstico de madurez 1-4, y retrieval guiado), sustituyendo el etiquetado exhaustivo de entidades aisladas.

Componentes clave:
1. Capa de proyección semántica independiente estilo toggle (no destructiva, desacoplada de la GPU).
2. Store reactivo de estado de compilación y control de visibilidad de capas.
3. Actualización de contratos de TypeScript para el nuevo schema de compilación.
4. Prompt de compilación macro y JSON Schema de salida compacta.


================================================================================
2. CONTRATOS TYPESCRIPT DEL NUEVO ESQUEMA MACRO (types/compiledGraph.ts)
================================================================================

export type MaturityLevel = 1 | 2 | 3 | 4;

export interface MapOverview {
  core_theme: string;
  maturity_level: MaturityLevel;
  maturity_diagnosis: string;
  bridge_to_next_level: string;
}

export interface MacroIsland {
  island_name: string;
  associated_entity_ids: string[];
  is_isolated: boolean;
}

export interface ProceduralZone {
  zone_name: string;
  entity_ids: string[];
  deliberate_practice_prompt: string;
}

export interface RelationalAnchoringSuggestion {
  target_content: string;
  suggested_connection: string;
}

export interface AnkiException {
  front: string;
  back: string;
  why_not_deducible: string;
}

export interface HighRoadTransfer {
  unstructured_scenario: string;
  guiding_question: string;
}

export interface DerringEffectChallenge {
  flawed_premise: string;
  challenge_prompt: string;
  canonical_resolution: string;
}

export interface HighOrderRetrieval {
  cross_island_causal_question: string;
  high_road_transfer: HighRoadTransfer;
  derring_effect: DerringEffectChallenge;
}

export interface PedagogicalInterventions {
  procedural_zones: ProceduralZone[];
  relational_anchoring_suggestions: RelationalAnchoringSuggestion[];
  anki_exceptions: AnkiException[];
}

export interface CompiledMacroCognitiveMap {
  map_overview: MapOverview;
  macro_islands: MacroIsland[];
  pedagogical_interventions: PedagogicalInterventions;
  high_order_retrieval: HighOrderRetrieval;
}


================================================================================
3. CONTRATO DE ESTADO Y GESTIÓN DE CAPAS (stores/useCognitiveLayerStore.ts)
================================================================================

El estado de la proyección cognitiva se desacopla del motor de dibujo de tinta:

export interface CognitiveSubLayers {
  showIslands: boolean;
  showProceduralZones: boolean;
  showAnchoringGlow: boolean;
}

export interface CognitiveLayerState {
  hasCompiledData: boolean;
  isOverlayVisible: boolean;
  isDirty: boolean; // True si el usuario modificó el mapa post-compilación
  compiledData: CompiledMacroCognitiveMap | null;
  subLayers: CognitiveSubLayers;
  activeInspectTarget: string | null; // ID de isla o entidad enfocada
  
  // Acciones
  setCompiledData: (data: CompiledMacroCognitiveMap) => void;
  toggleOverlay: () => void;
  setOverlayVisibility: (visible: boolean) => void;
  toggleSubLayer: (subLayer: keyof CognitiveSubLayers) => void;
  markAsDirty: () => void;
  focusInspectionTarget: (targetId: string | null) => void;
  clearCompilation: () => void;
}


================================================================================
4. ARQUITECTURA DE RENDERING: GHOST OVERLAY EN WORLD SPACE
================================================================================

4.1 Jerarquía del Árbol de Componentes:

<InfiniteCanvasContainer>
  |-- <NativeInkSurface/>         [GPU Front-Buffer / Tinta pura a 10ms]
  |-- <GhostOverlayContainer>     [SVG / Skia Overlay en World Space]
  |     |-- <IslandPolygons/>     [Nubes convexas semitransparentes]
  |     |-- <BrokenBridgesLines/> [Líneas punteadas con animación]
  |     |-- <ProceduralBadges/>   [Badges de práctica deliberada]
  |     `-- <AnchoringGlows/>     [Resplandores de referencia]
  `-- <ScreenSpaceUI>
        |-- <Toolbar/>
        |-- <FloatingHUDControls/>[Toggle Ojo Capa + Nivel Madurez]
        `-- <CognitiveDrawer/>    [Pestañas de análisis e interacción]

4.2 Cálculo de Polígonos de Isla (Convex Hull + Padding):
1. Cada MacroIsland referencia una lista de associated_entity_ids.
2. El componente consulta en el visual_ast_layer las cajas delimitadoras (bbox) de esas entidades en coordenadas de mundo (World Space).
3. Se extraen los vértices de todas las entidades del grupo y se calcula su envolvente convexa (Convex Hull con algoritmo Graham Scan o Monotone Chain).
4. Se aplica un padding de dilatación espacial de +30 unidades de mundo con esquinas redondeadas (fillet spline).
5. Renderizado:
   - Relleno: rgba(99, 102, 241, 0.08) (azul índigo sutil).
   - Borde: rgba(99, 102, 241, 0.40) con strokeDasharray: [8, 4].
   - Si is_isolated === true: Tono ámbar/naranja rgba(245, 158, 11, 0.12) con pulsación continua de opacidad periódica (1.5s).

4.3 Renderizado de Puentes Rotos (Líneas Fantasma):
- Si dos islas están desconectadas y la IA sugiere un puente causal (bridge_to_next_level), se traza una curva Bezier cúbica punteada entre los centroides de ambas islas.
- En el punto medio de la curva se dibuja un badge interactivo circular [ ? ].
- Al pulsar el badge [ ? ], se abre el micro-popover con la pregunta socrática correspondiente (cross_island_causal_question).


================================================================================
5. PROMPT DE COMPILACIÓN Y CONFIGURACIÓN DEL MODELO
================================================================================

5.1 System Prompt Refinado:

export const SYSTEM_COMPILER_PROMPT = `
Eres un evaluador neurocognitivo experto en la Ciencia del Aprendizaje Complejo y la metodología de mapas relacionales del Dr. Justin Sung (iCanStudy).

Tu objetivo NO es clasificar palabras sueltas ni etiquetar entidades individuales. Asume que todo el contenido del mapa es intrínsecamente conceptual por defecto. Tu misión es evaluar la arquitectura relacional global del mapa a nivel macro (islas, puentes causales, nivel de madurez), identificar excepciones procedimentales o de memorización estricta, y formular intervenciones de recuperación activa de alto orden.

Recibirás:
1. IMAGEN DEL LIENZO: Render visual del mapa mental.
2. VISUAL AST: Diccionario espacial con texto transcrito preliminar y metadatos del usuario.

Responde ÚNICAMENTE con un JSON válido que cumpla estrictamente con el esquema provisto.

---

### DIRECTRICES DE EVALUACIÓN COGNITIVA

#### 1. TOPOLOGÍA DE RED Y NIVEL DE MADUREZ (MACRO-NIVEL)
Analiza el mapa como un sistema de cúmulos o "islas":
- Identifica las macro-islas semánticas presentes y diagnostica si el mapa sufre de fragmentación (islas aisladas sin puentes causales).
- Asigna el nivel de madurez relacional (1 a 4 según Justin Sung):
  * Nivel 1: Jerárquico/Buzan (árbol lineal rígido, ramas sin cruces).
  * Nivel 2: Conexiones básicas entre ramas vecinas.
  * Nivel 3: Red integrada con múltiples enlaces cruzados y relaciones bidireccionales.
  * Nivel 4: Esquema dinámico complejo con alta síntesis no verbal y bucles causales.
- Formula una recomendación concreta de cómo conectar dos islas específicas para subir de nivel.

#### 2. DETECCIÓN SELECTIVA DE EXCEPCIONES PACER
- ZONAS PROCEDIMENTALES: Si detectas una secuencia de pasos, flujo de decisión o algoritmo motriz/técnico, identifica el conjunto de entidades que lo componen y prescribe una tarea de práctica deliberada/simulación en lugar de estudio teórico.
- REGLA ESTRICTA DE ANKI (ANTI-SOBRECARGA): 
  * Justin Sung desaconseja el uso habitual de flashcards. PROHIBIDO generar tarjetas de Anki salvo que se trate de terminología arbitraria o constantes numéricas que NO PUEDAN deducirse ni integrarse causalmente en el mapa.
  * Antes de sugerir una tarjeta, evalúa si el dato puede anclarse a una regla del mapa. Si puede integrarse, prescribe en su lugar un "anclaje relacional" para que el usuario lo dibuje/conecte en el mapa.
  * Máximo 2 tarjetas por compilación, únicamente en casos indispensables.

#### 3. INTERVENCIONES DE ALTO ORDEN (RETRIEVAL GUIADO)
Formula desafíos breves (máximo 2 oraciones por campo) para consolidar el modelo mental:
- Pregunta de Puente Causal: Una pregunta socrática que obligue a razonar sobre la frontera o interacción entre dos islas del mapa.
- Transferencia Lejana (High-Road Transfer): Un escenario no estructurado en un dominio completamente ajeno pero gobernado por el mismo principio causal del mapa.
- Detección de Falla (Derring Effect): Una premisa con un error conceptual sutil sobre una de las relaciones del mapa para que el aprendiz identifique la falla y restaure el principio invariante.
`;

5.2 Configuración de Llamada (Generative AI SDK):
- Modelo: gemini-2.0-flash (o alias compatible del entorno).
- temperature: 0.2 (alta consistencia determinista en topología).
- responseMimeType: "application/json".
- responseSchema: JSON Schema correspondiente al contrato CompiledMacroCognitiveMap.