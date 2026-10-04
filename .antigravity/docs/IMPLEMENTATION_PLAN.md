# IMPLEMENTATION PLAN: COGNITIVE CANVAS
**Ruta de Ejecución por Fases, Estado de Avance y Brecha Técnica**
Basado en: `MASTER_SPEC.md`, `DECISION_RATIONALE.md` y `UI_AND_CANVAS_SPEC.md`.

---

## 📊 RESUMEN EJECUTIVO DE ESTADO
- **Fase 1: Infraestructura & Tipos Compartidos:** 100% Completada (Contratos formalizados).
- **Fase 2: Motor Nativo de Tinta Digital (120Hz / S-Pen):** 85% Completada (Jetpack Ink, RDP shapes, flechas compuestas, borrador de precisión, S-Pen Air View funcionando en hardware real).
- **Fase 3: Motor Local Visual AST & Persistencia (.cmn):** 75% Completada (Motor de 5 niveles probado con tests unitarios; falta persistencia a disco en Expo FileSystem y anclaje semántico por hover 800ms).
- **Fase 4: Backend Serverless SST & Compilador Gemini 2.0 Flash:** 70% Completada (Lambda y DynamoDB funcionales; falta sincronizar prompt/schema con Master Spec Sección 7-8 y pre-signed URLs en S3).
- **Fase 5: UI/UX, Auditoría GRINDE & Práctica Deliberada (Anki/ICC):** 60% Completada (Toolbar Goodnotes, lienzo infinito, Air View tooltip y Drawer funcional; falta adaptar a schema v2, gestos avanzados y AnkiConnect RPC).

---

## 🗓️ DESGLOSE DETALLADO POR FASES

### FASE 1: CONTRATOS TYPESCRIPT & ESQUEMAS FORMALES (COMPLETADA ✅)
- [x] **1.1 Contrato del Visual AST (`visualAst.ts`):**
  - Entidades agrupadas (`VisualEntity`) con cajas normalizadas `NormalizedBoundingBox`.
  - Conectores dirigidos (`ConnectorEdge`) con acoplamiento magnético y etiquetas.
  - Objeto tipado `SemanticAnchor` (`MECHANISM`, `ANALOGY`, `EVIDENCE`) con transcripción de voz y notas de usuario.
- [x] **1.2 Contrato de Persistencia Local (`persistence.ts`):**
  - Estructura desacoplada en 3 capas: `raw_ink_layer`, `visual_ast_layer`, `compiled_cognitive_layer`.
  - Formato de documento `.cmn` con metadatos de mapa y bóveda.
- [x] **1.3 Contrato del Puente Nativo (`inkBridge.ts`):**
  - Interfaz de comandos nativos `InkCanvasRef` (`setTool`, `exportHighResPng`, `exportRawInk`, etc.).
  - Eventos de hardware: `StrokeEndEvent`, `TransformEvent`, `BarrelButtonEvent`, `HoverEvent` y `HoverTimeoutEvent` (800 ms dwell).
- [x] **1.4 Contrato de IA Gemini 2.0 Flash (`compiledGraph.ts`):**
  - Interfaces estrictas 1:1 con el JSON Schema de la Master Spec: `MapMetadata`, `CompiledNode`, `CompiledEdge`, `GrindeAudit` y `LearningEngineOutputs`.
  - Validación con suite de pruebas unitarias (`schema.test.ts` y `visualAST.test.ts`).

---

### FASE 2: MOTOR DE TINTA NATIVO Y HARDWARE S-PEN (EN PROGRESO 🟡 - 85%)
- [x] **2.1 Pipeline de Baja Latencia (Jetpack Ink 120Hz):**
  - Integración nativa de `androidx.ink` con `InProgressStrokesView` y `GLFrontBufferedRenderer`.
  - Rechazo de palma a nivel de hardware Wacom EMR (`StylusInputHandler`).
  - Detección del botón físico de barril del S-Pen.
- [x] **2.2 Reconocimiento Geométrico (Shape Detection):**
  - Algoritmo Ramer-Douglas-Peucker (RDP) para simplificación poligonal.
  - Cociente isoperimétrico ($Q = 4\pi A / P^2$) para discriminar círculos de polígonos/rectángulos.
  - Detección de flechas por análisis de ángulo de pliegue (> 75°) con cabezal delta simétrico interpolado.
- [x] **2.3 Herramientas de Dibujo Esenciales:**
  - Pluma con sensibilidad a presión y velocidad.
  - Resaltador translúcido y selector de grosor/color.
  - Borrador dual (Stroke Eraser por trazo completo + Precision Eraser por segmento).
  - Selección por Lazo con algoritmo *Point-in-Polygon* y traslación en tiempo real.
- [x] **2.4 S-Pen Air View (Proximidad 1–2 cm):**
  - Intercepción global de `MotionEvent.TOOL_TYPE_STYLUS` en `MainActivity.kt`.
  - Normalización de píxeles físicos a DP.
  - Halo perimetral uniforme ceñido a la píldora (*Distance-to-Box* de 14 dp).
- [ ] **2.5 Tareas Pendientes de Fase 2:**
  - [ ] **Temporizador de Hover 800 ms (`onHoverTimeout`):** Disparar evento nativo tras 800 ms de quietud ($\le 15\text{px}$) del S-Pen sobre una entidad o punto del lienzo (ADR 3.1).
  - [ ] **Exportación PNG de Alta Resolución (`exportHighResPng`):** Renderizar bitmap nativo fuera de pantalla para subida a S3.
  - [ ] **Gestos Dinámicos de Tinta (Spec 5.2):** Gesto de borrado *Scratch-out* (zigzag rápido) y *Canvas Break* (apertura de espacio).
  - [ ] **Herramienta Puntero Láser Efímero:** Trazo visual que desaparece tras 1.5 segundos.

---

### FASE 3: PARSING LOCAL (VISUAL AST) Y PERSISTENCIA .CMN (EN PROGRESO 🟡 - 75%)
- [x] **3.1 Motor de 5 Niveles (`VisualASTEngine.ts`):**
  - Nivel 1: Clasificación de trazos (cajas cerradas, líneas/conectores, trazos de texto).
  - Nivel 2: Clúster espacio-temporal (< 600 ms e intersección espacial).
  - Nivel 3: Flechas compuestas (unificación de tallo y cabeza).
  - Nivel 4: Contención jerárquica (nodos dentro de `CONTAINER_BOX`).
  - Nivel 5: Acoplamiento magnético a nodos más cercanos (<= 30px) y enlace de etiquetas textuales.
- [ ] **3.2 Tareas Pendientes de Fase 3:**
  - [ ] **Alineación de Entidades Semánticas:** Refactorizar `VisualASTEngine` para que produzca objetos `SemanticAnchor` tipados (`MECHANISM`, `ANALOGY`, `EVIDENCE`).
  - [ ] **Servicio de Persistencia Local (`StorageService.ts`):**
    - Guardar y cargar archivos `.cmn` (JSON 3 capas) en `expo-file-system`.
    - Auto-guardado con debounce de 2 segundos tras finalizar trazo.
    - Carga/recuperación de mapa al iniciar la app.
  - [ ] **Micro-Tooltip de Entrada de Atributo:**
    - Modal/tooltip contextual que se abre al recibir `onHoverTimeout` (800 ms) o botón de barril.
    - Integración de dictado por voz rápido (Android `SpeechRecognizer`) para transcribir notas pasivas en 2 segundos.

---

### FASE 4: PIPELINE SERVERLESS EN AWS & GEMINI 2.0 FLASH (EN PROGRESO 🟡 - 70%)
- [x] **4.1 Infraestructura Serverless (SST v3 / Ion):**
  - Bucket S3 (`Storage`) para imágenes del lienzo.
  - DynamoDB (`Database`) para persistir mapas, compilaciones y nodos.
  - Lambda de compilación (`packages/functions/src/compile.ts`).
- [ ] **4.2 Tareas Pendientes de Fase 4:**
  - [ ] **Sincronización del System Prompt:** Reemplazar el prompt actual en `compilerPrompt.ts` por el texto oficial de producción de la Master Spec (Sección 7).
  - [ ] **Sincronización del JSON Schema:** Actualizar el schema de la Lambda al `COMPILER_JSON_SCHEMA` estricto (Sección 8, con `learning_engine_outputs` y `map_metadata`).
  - [ ] **Flujo de Pre-Signed URLs:** Implementar endpoint para generar URL pre-firmada de subida a S3 desde la tablet, evitando transferir imágenes pesadas por la Lambda.

---

### FASE 5: UI/UX, AUDITORÍA GRINDE & INTEGRACIÓN ANKI (EN PROGRESO 🟡 - 60%)
- [x] **5.1 Interfaz Base de Lienzo:**
  - Barra estilo Goodnotes (56dp), paleta rápida y barra inferior flotante (36dp).
  - Lienzo infinito con pan, pinch-to-zoom (10% a 1000%) y ajuste de fondo (puntos/milimetrado/liso).
  - Air View tarjeta flotante con atributos de causalidad/analogía.
- [x] **5.2 Drawer Lateral de Compilación:**
  - Pestañas para Auditoría GRINDE y Clasificación PACER.
  - Integración básica con cliente AnkiConnect.
- [ ] **5.3 Tareas Pendientes de Fase 5:**
  - [ ] **Actualización del Drawer a Schema v2:**
    - Pestaña 1: Semáforo de pensamiento lineal con `linear_thinking_risk` y score de densidad de cross-links.
    - Pestaña 2: Filtros interactivos por colores PACER (Azul/Verde/Púrpura/Naranja/Gris) sobre el mapa.
    - Pestaña 3: Tarjetas interactivas de Desafíos de Transferencia Lejana (*High-Road*), Efecto Derring (*Error Rectification*) y Casos Contrastantes (*ICC*).
  - [ ] **Sincronización AnkiConnect:**
    - Sincronización estricta respetando el filtro anti-rote (solo nodos Evidence/Reference con `deducible_from_context: false`).
    - Alerta de límite semanal saludable (máximo 100-150 tarjetas).

---

## 🎯 PRÓXIMOS PASOS PRIORITARIOS
1. **Refactorizar `useCanvasState` y `VisualASTEngine`** para consumir los 4 nuevos contratos (`visualAst.ts`, `persistence.ts`, `inkBridge.ts`, `compiledGraph.ts`).
2. **Implementar el temporizador de Hover a los 800 ms** en `JetpackInkView.kt` (`onHoverTimeout`) y conectar el micro-tooltip de anclaje semántico.
3. **Crear el `StorageService.ts`** para guardar/cargar archivos `.cmn` en la tablet Galaxy Tab.
4. **Actualizar el backend SST (`compile.ts` y `compilerPrompt.ts`)** con el System Prompt y JSON Schema estricto de Gemini 2.0 Flash.
