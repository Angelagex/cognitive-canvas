# IMPLEMENTATION PLAN: COGNITIVE CANVAS
**Ruta de Ejecución por Fases, Estado de Avance y Brecha Técnica**
Basado en: `MASTER_SPEC.md`, `DECISION_RATIONALE.md` y `UI_AND_CANVAS_SPEC.md`.

---
## 📊 RESUMEN EJECUTIVO DE ESTADO
- **Fase 1: Infraestructura & Tipos Compartidos:** 100% Completada (Contratos formalizados).
- **Fase 2: Motor Nativo de Tinta Digital (120Hz / S-Pen):** 100% Completada (Jetpack Ink, RDP shapes, flechas compuestas, borrador de precisión, S-Pen Air View, gesto Scratch-out, Draw-and-Hold Snapping 450ms, Puntero Láser Efímero 1.5s y exportador PNG de alta resolución fuera de pantalla).
- **Fase 3: Motor Local Visual AST & Persistencia (.cmn):** 100% Completada (Motor de 5 niveles en tiempo real, persistencia bidireccional .cmn en Expo FileSystem, puente nativo de carga/restauración de trazos en Jetpack Ink, auto-guardado 1.5s, Bóveda unificada y refactorización modular Facade).
- **Fase 4: Backend Serverless SST & Compilador Gemini 2.0 Flash:** 95% Completada (Integración híbrida completada: `CompilationService` conectado a backend SST y evaluador local grounded en el Visual AST real del usuario, pre-signed URLs en S3, auto-captura PNG, persistencia de auditoría y Anki).
- **Fase 5: UI/UX, Auditoría GRINDE & Práctica Deliberada (Anki/ICC):** 100% Completada (Dock flotante configurable, popovers modulares, editor de título, Bóveda integrada, Drawer conectado con auditoría GRINDE en vivo, capa interactiva PACER en lienzo, sincronización AnkiConnect Wi-Fi y exportador de texto AnkiDroid).

---

## 🛠️ HERRAMIENTAS DE DESARROLLO Y DESPLIEGUE EN HARDWARE (GALAXY TAB S10 LITE)
- **Script de Build & Install Automático:** `scripts/install-app.sh`
  - Ejecución rápida desde la raíz: `npm run tablet` o `npm run build:android`.
  - Detección de dispositivo por ADB (Samsung Galaxy Tab S10 Lite `SM-X400`).
  - Compilación incremental con Gradle (`./gradlew installDebug` ~14-20s) e inicio automático de la app en la pantalla de la tablet (`am start -n com.cognitivecanvas.app/.MainActivity`).

---

## 🗓️ DESGLOSE DETALLADO POR FASES

### FASE 1: CONTRATOS TYPESCRIPT & ESQUEMAS FORMALES (COMPLETADA ✅)
- [x] **1.1 Contrato del Visual AST (`visualAst.ts`):**
  - Entidades agrupadas (`VisualEntity`) con cajas normalizadas `NormalizedBoundingBox`.
  - Conectores dirigidos (`ConnectorEdge`) con acoplamiento magnético y etiquetas.
  - Objeto tipado `SemanticAnchor` (`MECHANISM`, `ANALOGY`, `EVIDENCE`) con notas de contexto.
- [x] **1.2 Contrato de Persistencia Local (`persistence.ts`):**
  - Estructura desacoplada en 3 capas: `raw_ink_layer`, `visual_ast_layer`, `compiled_cognitive_layer`.
  - Formato de documento `.cmn` con metadatos de mapa y bóveda.
- [x] **1.3 Contrato del Puente Nativo (`inkBridge.ts`):**
  - Interfaz de comandos nativos `InkCanvasRef` (`loadedStrokesJson`, `loadStrokesTrigger`, `clearTrigger`, etc.).
  - Eventos de hardware: `StrokeEndEvent`, `TransformEvent`, `BarrelButtonEvent`, `HoverEvent`, `HoverTimeoutEvent`, `FingerTapEvent`.
- [x] **1.4 Contrato de IA Gemini 2.0 Flash (`compiledGraph.ts`):**
  - Interfaces estrictas 1:1 con el JSON Schema de la Master Spec: `MapMetadata`, `CompiledNode`, `CompiledEdge`, `GrindeAudit` y `LearningEngineOutputs`.
  - Validación con suite de pruebas unitarias (`schema.test.ts` y `visualAST.test.ts`, 32/32 tests pasando).

---

### FASE 2: MOTOR DE TINTA NATIVO Y HARDWARE S-PEN (COMPLETADA ✅ - 100%)
- [x] **2.1 Pipeline de Baja Latencia (Jetpack Ink 120Hz):**
  - Integración nativa de `androidx.ink` con `InProgressStrokesView` y `ViewStrokeRenderer`.
  - Rechazo de palma a nivel de hardware Wacom EMR (`StylusInputHandler`).
  - Detección del botón físico de barril del S-Pen y modo Solo Stylus conmutable.
- [x] **2.2 Reconocimiento Geométrico (Shape Detection):**
  - Algoritmo Ramer-Douglas-Peucker (RDP) para simplificación poligonal.
  - Cociente isoperimétrico ($Q = 4\pi A / P^2$) para discriminar círculos de polígonos/rectángulos.
  - Detección de flechas por análisis de ángulo de pliegue (> 75°) con cabezal delta simétrico interpolado.
- [x] **2.3 Herramientas de Dibujo Esenciales:**
  - Pluma con sensibilidad a presión Wacom EMR y velocidad.
  - Resaltador translúcido y selector de grosor/color con retención de color por trazo (`strokeColorMap`).
  - Borrador dual (Stroke Eraser por trazo completo + Precision Eraser por segmento).
  - Selección por Lazo con algoritmo *Point-in-Polygon* y traslación/recoloreado en tiempo real.
- [x] **2.4 S-Pen Air View (Proximidad 1–2 cm):**
  - Intercepción global de `MotionEvent.TOOL_TYPE_STYLUS` en `MainActivity.kt`.
  - Normalización de píxeles físicos a DP con throttling de 30 FPS en bridge.
  - Halo perimetral uniforme ceñido a la píldora (*Distance-to-Box* de 14 dp).
- [x] **2.5 Gestos Dinámicos de Tinta en Hardware:**
  - [x] **Temporizador de Hover 800 ms (`onHoverTimeout`):** Detección nativa con Haptic feedback para inspección de entidades.
  - [x] **Gesto de Borrado (Scratch-out):** Detección nativa en `JetpackInkView` de patrón en zigzag (3+ oscilaciones, 45dp) con expansión por proximidad (40dp) para eliminar palabras completas.
  - [x] **Auto-Snapping Geométrico (Draw-and-Hold 450 ms):** Dwell de 450 ms con punta sostenida para regularizar trazos con haptic feedback sin cambiar a modo Formas.
  - [x] **Puntero Láser Efímero:** Trazo visual que desaparece tras 1.5 segundos con auto-desvanecimiento alfa continuo (`LaserStroke`, degradado temporal 1500ms, punto de mira brillante perimetral en la punta del S-Pen y píldora contextual). No altera el árbol de trazos ni ensucia el guardado.
  - [x] **Exportación PNG de Alta Resolución (`exportHighResPng`):** Módulo nativo `JetpackInkModule` con puente Promise React Native (`exportHighResPng`) que renderiza un Bitmap fuera de pantalla con super-muestreo (escala configurable, 2.0x por defecto), guardado asíncrono en disco y auto-captura en `CompilationService.ts` antes de la llamada multimodal a Gemini 2.0 Flash.

---

### FASE 3: PARSING LOCAL (VISUAL AST) Y PERSISTENCIA .CMN (COMPLETADA ✅ - 100%)
- [x] **3.1 Motor Avanzado de 5 Niveles y Topología Causal (`VisualASTEngine.ts`):**
  - Modularizado bajo `packages/core/src/parser/` (clasificación, agrupamiento adaptativo $\tilde{H}$, conectores, contención, bucles causales).
  - Suite de 32 tests unitarios pasando en Vitest.
- [x] **3.2 Conexión en Tiempo Real del Visual AST con el Lienzo:**
  - Serialización de trazos normalizados en `onStrokeEnd` con decimation (1.5dp) y debounce de 280ms para escritura rápida fluida a 120Hz.
  - Caché $O(1)$ de bounding boxes de trazos para eliminar latencia de renderizado.
- [x] **3.3 Servicio de Persistencia Local Bidireccional (`StorageService.ts`):**
  - Guardado y carga atómica de archivos canónicos `.cmn` (JSON 3 capas) en Expo FileSystem.
  - Auto-guardado debounced de 1.5 segundos con control de estado modificado (*dirty state*).
  - Reconstrucción nativa de trazos en Kotlin (`JetpackInkView.kt` -> `loadStrokesFromJson`) usando `InputToolType.STYLUS` y `MutableStrokeInputBatch`.
  - Carga segura con *flush-save* automático al cambiar de mapa y restauración del último mapa activo al abrir la app.
  - Gestión de preferencias del usuario (`user_preferences.json`).
- [x] **3.4 Arquitectura Modular y Limpia (Refactorización Facade):**
  - `useCanvasState.ts` desacoplado en 6 sub-hooks (`useCanvasTools`, `useCanvasViewport`, `useCanvasDocument`, `useCanvasAst`, `useCanvasHover`, `useCognitiveCompilation`).
  - Popovers de toolbar extraídos en componentes independientes (`StrokeWidthPopover`, `ColorPickerPopover`, `PaperTemplatePopover`, `ContextualToolPill`).

---

### FASE 4: PIPELINE SERVERLESS EN AWS & GEMINI 2.0 FLASH (COMPLETADA EN SU BASE ✅ - 95%)
- [x] **4.1 Infraestructura Serverless Base (SST v3 / Ion):**
  - Bucket S3 (`Storage`) para imágenes del lienzo.
  - DynamoDB (`Database`) para persistir mapas, compilaciones y nodos.
  - Lambda de compilación (`packages/functions/src/compile.ts`).
- [x] **4.2 Tareas de Fase 4 (Completadas):**
  - [x] **Sincronización del System Prompt Oficial:** Prompt en `compilerPrompt.ts` alineado con Master Spec Sección 7 (Justin Sung GRINDE, PACER, deducción no inerte).
  - [x] **Sincronización del JSON Schema Estricto:** Tipos y `COMPILER_JSON_SCHEMA` formalizados con `learning_engine_outputs` y campos de compatibilidad retroactiva.
  - [x] **Robustez de Extracción y Persistencia en Lambda:** `compile.ts` actualizado para persistir tanto flashcards canónicas como planas, y almacenar `non_verbal_balance_score`.
  - [x] **Flujo de Pre-Signed URLs:** Implementado endpoint (`packages/functions/src/uploadUrl.ts`) y rutas `POST/GET /canvases/{id}/upload-url` en `infra/api.ts` para subida directa de capturas de lienzo a S3.
  - [x] **Conexión Real Tablet -> SST Backend & Evaluación Local:** Implementado `CompilationService.ts` y conectado en `useCognitiveCompilation` en la tablet para compilar con el backend SST o evaluar localmente en el dispositivo utilizando el `VisualASTLayer` real, notas pasivas y métricas topológicas de la sesión.

---

### FASE 5: UI/UX, AUDITORÍA GRINDE & INTEGRACIÓN ANKI (COMPLETADA ✅ - 100%)
- [x] **5.1 Interfaz Base de Lienzo:**
  - Dock vertical flotante conmutador izquierda/derecha con memoria de posición.
  - Editor de título integrado en Header con confirmación explícita y descarte.
  - Bóveda de documentos integrada en el modal de acciones con navegación `← Menú`.
  - Modal de confirmación de borrado seguro (*danger confirmation*).
  - Componente `RetrievalPanel` con renderizado flexible de intervenciones de alto orden (`learning_engine_outputs`).
- [x] **5.2 Tareas de Fase 5 (Completadas):**
  - [x] **Filtros por colores PACER interactivos en lienzo y drawer:** Implementada capa de superposición `PacerOverlayLayer.tsx` sobre el lienzo con cajas delimitadoras translúcidas y badges según el color oficial de la Master Spec Sec 9 (Conceptual: Azul, Procedimental: Verde, Analógico: Púrpura, Evidencia: Naranja, Referencia: Gris), y pestaña interactiva PACER en `RetrievalPanel.tsx` con conteos, chips filtrables y alternancia de visibilidad en lienzo.
  - [x] **Sincronización AnkiConnect & AnkiDroid:**
    - Conexión por red local Wi-Fi vía JSON-RPC a AnkiConnect Desktop (puerto 8765).
    - Generador y exportador nativo de archivos de texto TSV (`exportToTsv`) compatible directamente con la app móvil AnkiDroid en Android.

---

### FASE 6: VISUAL AST V2 — PIPELINE HÍBRIDO (ML KIT + GEMINI) (PLANIFICADA 📋)
*Basado en la especificación detallada: `.antigravity/docs/VISUAL_AST_V2_PLAN.md`.*
- [ ] **6.1 Contratos y Tipos (`packages/core`):**
  - Incorporación de `ml_kit_payload` (`transcription`, `confidence`) en `VisualEntity`.
  - Soporte de etiquetas inferidas (`inferred_label`) en `ConnectorEdge`.
- [ ] **6.2 Módulo Nativo de ML Kit Digital Ink en Kotlin (`apps/expo/android`):**
  - Dependencia de Google ML Kit Digital Ink Recognition (`digital-ink-recognition:18.1.0`).
  - Gestor de modelos offline `DigitalInkModelManager.kt` (`es` / `en`).
  - Worker en corrutina en segundo plano con debounce de 500 ms tras `ACTION_UP`.
  - Algoritmo de Fusión Espacial Incremental (Spatial Cluster Merging) para escritura pausada.
  - Clasificación de trazos por confianza (>= 0.70 `TEXT_BLOCK`, < 0.70 `SKETCH_ICON`).
- [ ] **6.3 Puente Nativo y Sincronización en React Native (`apps/expo`):**
  - Evento de emisión de AST enriquecido en `useCanvasAst.ts`.
  - Persistencia de `ml_kit_payload` en archivos `.cmn`.
- [ ] **6.4 Optimización del Compilador Gemini en la Nube (`packages/functions`):**
  - Actualización de prompt y conciliación de cajas PACER sobre el texto transcrito de ML Kit.
- [ ] **6.5 Validación en Hardware Real (Galaxy Tab S10 Lite):**
  - Casos de prueba: *"Photography"*, escritura pausada *"photo"* + *"graphy"*, flechas con etiqueta *"inhibe"*.

---

## 🎯 PRÓXIMOS PASOS PRIORITARIOS (ORDEN DE EJECUCIÓN)
1. [COMPLETADO ✅] **Persistencia Bidireccional `.cmn` y Restauración Nativa:** Trazos y documentos restaurados sin pérdida en Android con cambio de mapas en la Bóveda.
2. [COMPLETADO ✅] **Refactorización y Componentización:** `useCanvasState` y `GoodnotesToolbar` limpios, modulares y desacoplados.
3. [COMPLETADO ✅] **Backend SST & Compilador Híbrido Asíncrono:** Job Pattern 202 Accepted + Polling implementado; límite de 29s de API Gateway eliminado.
4. [COMPLETADO ✅] **Filtros por Colores PACER en el Lienzo:** Capa `PacerOverlayLayer` y pestaña PACER con filtrado interactivo en tiempo real en la tablet.
5. [COMPLETADO ✅] **Sincronización AnkiConnect / AnkiDroid:** Exportación fluida de flashcards de Evidencia/Referencia directamente a la colección de Anki y archivos TSV para AnkiDroid.
6. [COMPLETADO ✅] **Puntero Láser Efímero y Exportación PNG:** Herramienta de láser Feynman y captura fuera de pantalla nativa.
7. [COMPLETADO ✅] **Soporte de Rotación Completa:** Habilitada orientación `fullSensor` (portrait y landscape hacia ambos lados).
8. [SIGUIENTE 🔜] **Ejecución de Fase 6 — Visual AST V2 (Pipeline Híbrido ML Kit + Gemini):**
   - Implementar el clasificador de texto on-device en Kotlin (`DigitalInkRecognition`) y Spatial Cluster Merging para erradicar las falsas flechas en palabras como *"Photography"*.

