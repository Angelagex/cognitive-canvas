# PLAN DE IMPLEMENTACIÓN: VISUAL AST V2 (PIPELINE HÍBRIDO DE COMPRENSIÓN DE TINTA)

**Superando la Paradoja de Sayre mediante Segmentación Morfológica Local, ML Kit Digital Ink y Resolución Semántica en Gemini**  
*Documento de Ingeniería y Hoja de Ruta Ejecutable — Cognitive Canvas*  
*Basado en: `MASTER_SPEC.md`, `DECISION_RATIONALE.md` y Arquitecturas de la Industria (MyScript iink, Goodnotes, Apple PencilKit).*

---

## 1. DIAGNÓSTICO Y MOTIVACIÓN TÉCNICA

### 1.1 El Fracaso del "Parser Mecánico Determinista" (V1)
El motor inicial (`VisualASTEngine` en TypeScript) segmentaba e interpretaba trazos mediante reglas geométricas fijas y estáticas:
* Cocientes de linealidad ($R = d_{\text{direct}} / L_{\text{total}}$), cosenos angulares y límites de oscilación vertical.
* Agrupamiento temporal dependiente del reloj ($\Delta t \le 600\text{ ms}$).
* Detección heurística de arcos y flechas compuestas.

Este enfoque colapsa en la práctica debido a la **Paradoja de Sayre (1973)**:
> *"No se puede segmentar la caligrafía sin haberla reconocido, ni se puede reconocer sin haberla segmentado previamente."*

#### Casos de fallo reales en el hardware (Galaxy Tab S10 Lite):
1. **Palabras complejas (ej. *"Photography"*):** La curva superior de la `P`, la panza de la `h` y el lazo inferior de la `y` satisfacen las condiciones matemáticas de un conector curvo Bézier (`CURVED`). El motor extrae esos trazos como falsas flechas huérfanas y fractura la palabra en 3 o 4 entidades rotas.
2. **Escritura pausada:** El usuario escribe *"photo"*, hace una pausa biomecánica natural de 1 segundo para mover la muñeca o pensar, y escribe *"graphy"*. El umbral temporal fijo crea dos nodos inconexos en lugar de un único concepto.
3. **Puntos y tildes retardados (Delayed strokes):** Cruzar la `t` o poner el punto sobre la `i` segundos después genera trazos aislados o los asocia con flechas cercanas.
4. **Bocetos e iconos no verbales (GRINDE):** Se intentaba forzar su interpretación como cajas o líneas cuando en realidad son metáforas visuales.

### 1.2 El Estándar de la Industria
Los líderes de la industria (MyScript, Goodnotes) emplean una **arquitectura híbrida de dos niveles desacoplados**:
1. **Front-Buffer GPU (120 Hz):** Captura y renderizado atómico de trazos en GPU sin intervención del hilo de cómputo.
2. **Modelo Neuronal Ligero On-Device (< 30 ms en background):** Reconocimiento de trazos vectoriales y agrupación de palabras en tiempo real.
3. **Resolución Semántica Multimodal (Nube):** Gemini 3.8 Flash en el backend recibe un grafo ya estructurado con texto transcrito y bounding boxes confiables, dedicando el 100% de su capacidad al razonamiento cognitivo (PACER, GRINDE, Anki).

---

## 2. ARQUITECTURA GENERAL DEL PIPELINE EN CUATRO FASES

```
+-----------------------------------------------------------------------------+
| FASE 1: CAPTURA Y BUFFERING A 120 HZ (UI Thread / Native / GPU)            |
| - androidx.ink + InProgressStrokesView (Renderizado con latencia < 10 ms)   |
| - Almacenamiento continuo de Stroke(x, y, t, p) en memoria nativa           |
+--------------------------------------+--------------------------------------+
                                       |
                                       | Evento: onStrokeEnd + Debounce 500 ms
                                       v
+-----------------------------------------------------------------------------+
| FASE 2: PIPELINE LOCAL EN SEGUNDO PLANO (Kotlin Background Coroutine)       |
|                                                                             |
|  [Paso 2.1: Filtro Gestual]                                                 |
|  - Patrón en zigzag denso ---> ¿Scratch-out? ---> Poda del buffer y aborta  |
|                                                                             |
|  [Paso 2.2: Separación Morfológica Previa]                                  |
|  - Aspect ratio >> 1, baja tortuosidad, abierto ---> CANDIDATE_CONNECTOR    |
|  - Trazo compacto, bucles, densidad de curvatura ---> CANDIDATE_CLUSTER     |
|                                                                             |
|  [Paso 2.3: Inferencia ML Kit Digital Ink Recognition]                     |
|  - Modelo On-Device ('es' / 'en') procesa CANDIDATE_CLUSTER                 |
|    * Confianza >= 0.70 ---> TEXT_BLOCK (Palabra/Línea + BBox + Texto)       |
|    * Confianza <  0.70 ---> SKETCH_ICON (Metáfora visual / Icono AABB)      |
|                                                                             |
|  [Paso 2.4: Fusión Espacial Incremental (Spatial Cluster Merging)]          |
|  - ¿Nuevo trazo adyacente a TEXT_BLOCK existente?                           |
|    (Distancia X <= 1.5 * H, Solapamiento Y >= 50%)                          |
|    ---> Re-evalúa con ML Kit y fusiona in-place ("photo" + "graphy")       |
|  - ¿Texto superpuesto sobre CANDIDATE_CONNECTOR?                            |
|    ---> Promueve a label de la arista (ej. "inhibe" en la flecha)           |
+--------------------------------------+--------------------------------------+
                                       |
                                       | Emite evento a React Native
                                       v
+-----------------------------------------------------------------------------+
| FASE 3: CAPTURA CONTEXTUAL Y HOVER (S-Pen Air View / UI React Native)       |
| - Air View Hover (1-2 cm) sobre Bounding Box ---> Resplandor ceñido al nodo |
| - Dwell 800 ms ---> Popover [Mecanismo | Analogía | Evidencia]              |
| - Anclaje de SemanticAnchor sin alterar el lienzo                           |
+--------------------------------------+--------------------------------------+
                                       |
                                       | Usuario pulsa [Compilar Mapa]
                                       v
+-----------------------------------------------------------------------------+
| FASE 4: RESOLUCIÓN SEMÁNTICA MULTIMODAL (AWS Lambda + Gemini 3.8 Flash)     |
| - Entrada: Render PNG Nativo + Visual AST V2 enriquecido (con texto y bbox) |
| - Gemini valida el grafo con la imagen real sin alucinaciones de lectura    |
| - Salida: CompiledCognitiveMap (PACER, GRINDE, Anki Flashcards, Transfer)   |
+-----------------------------------------------------------------------------+
```

---

## 3. PLAN DETALLADO DE IMPLEMENTACIÓN POR ETAPAS

### ETAPA 1: Actualización de Contratos y Esquemas (`packages/core`)
**Objetivo:** Adaptar las interfaces TypeScript del monorepo para soportar metadatos probabilísticos de ML Kit sin romper la retrocompatibilidad.

* [ ] **1.1 Extensión de `VisualEntity` en `packages/core/src/types/visualAst.ts`:**
  ```typescript
  export interface MLKitPayload {
    transcription: string | null;
    confidence: number;
    language?: string;
  }

  export interface VisualEntity {
    id: string;
    type: "TEXT_BLOCK" | "CONTAINER_BOX" | "SKETCH_ICON";
    stroke_ids: string[];
    bbox: NormalizedBoundingBox;
    passive_context?: string | null;
    child_ids?: string[];
    context_window?: string | null;
    is_scratched_out?: boolean;
    ml_kit_payload?: MLKitPayload | null; // Nuevo en V2
    transcribed_text?: string | null;     // Sincronizado desde ML Kit
  }
  ```

* [ ] **1.2 Extensión de `ConnectorEdge` para soportar etiquetas inferidas:**
  ```typescript
  export interface ConnectorEdge {
    id: string;
    type: "ARROW" | "LINE" | "INHIBITION";
    stroke_ids: string[];
    directionality: "FORWARD" | "BIDIRECTIONAL" | "UNDIRECTED";
    is_curved: boolean;
    geometry_type: "STRAIGHT" | "CURVED" | "ELBOW";
    polarity: "POSITIVE" | "NEGATIVE" | "UNKNOWN";
    source_entity_id?: string;
    target_entity_id?: string;
    inferred_label?: string | null;       // Texto capturado sobre la arista
  }
  ```

* [ ] **1.3 Tests unitarios en `@cognitive-canvas/core`:**
  - Validar serialización y deserialización de documentos `.cmn` con el payload de ML Kit.

---

### ETAPA 2: Módulo Nativo de ML Kit Digital Ink en Android (`apps/expo/android`)
**Objetivo:** Integrar Google ML Kit Digital Ink Recognition en Kotlin y ejecutar la segmentación en una corrutina de fondo desacoplada del pipeline de 120 Hz.

* [ ] **2.1 Dependencia en `apps/expo/android/app/build.gradle`:**
  ```groovy
  dependencies {
      // Google ML Kit Digital Ink Recognition
      implementation 'com.google.mlkit:digital-ink-recognition:18.1.0'
      // Corrutinas para procesamiento en segundo plano
      implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3'
  }
  ```

* [ ] **2.2 Gestor de Modelos Offline (`DigitalInkModelManager.kt`):**
  - Implementar la descarga/verificación del modelo de idioma (`es` y `en`):
  ```kotlin
  package com.cognitivecanvas.app.ink

  import com.google.mlkit.vision.digitalink.*

  object DigitalInkModelManager {
      private var recognizer: DigitalInkRecognizer? = null

      fun getRecognizer(languageTag: String = "es", onReady: (DigitalInkRecognizer) -> Unit) {
          if (recognizer != null) {
              onReady(recognizer!!)
              return
          }
          val modelIdentifier = DigitalInkRecognitionModelIdentifier.fromLanguageTag(languageTag)
              ?: DigitalInkRecognitionModelIdentifier.fromLanguageTag("en")!!
          val model = DigitalInkRecognitionModel.builder(modelIdentifier).build()
          val remoteModelManager = com.google.mlkit.common.model.RemoteModelManager.getInstance()

          remoteModelManager.download(model, com.google.mlkit.common.model.DownloadConditions.Builder().build())
              .addOnSuccessListener {
                  val options = DigitalInkRecognizerOptions.builder(model).build()
                  recognizer = DigitalInkRecognition.getClient(options)
                  onReady(recognizer!!)
              }
      }
  }
  ```

* [ ] **2.3 Worker de Segmentación en Background (`DigitalInkWorker.kt`):**
  - Lógica de conversión de trazos vectoriales a objetos `Ink` de ML Kit.
  - Clasificación morfológica previa:
    * Trazo alargado/abierto ($L > 100\text{ px}$, $R > 0.8$) $\rightarrow$ `CANDIDATE_CONNECTOR`.
    * Trazos compactos con oscilación $\rightarrow$ `CANDIDATE_TEXT`.
  - Invocación de ML Kit con threshold de confianza (0.70):
    * $\ge 0.70 \rightarrow$ `TEXT_BLOCK` con `transcription`.
    * $< 0.70 \rightarrow$ `SKETCH_ICON`.

* [ ] **2.4 Algoritmo de Fusión Espacial Incremental (Spatial Cluster Merging):**
  - Si un nuevo clúster de trazos se ubica horizontalmente a una distancia $\le 1.5 \times \text{altura}$ con solapamiento vertical $\ge 50\%$ de un `TEXT_BLOCK` previo:
    1. Se fusionan sus trazos en un solo objeto `Ink.Builder`.
    2. Se re-invoca a ML Kit.
    3. Se actualiza la entidad existente (*"photo"* $\to$ *"photography"*).

* [ ] **2.5 Integración en `JetpackInkView.kt`:**
  - Al recibir `onStrokeEnd`, lanzar la corrutina de evaluación con `debounce(500ms)`.
  - Emitir el AST V2 procesado hacia React Native vía evento del módulo nativo (`onVisualASTUpdated`).

---

### ETAPA 3: Integración en el Puente de React Native (`apps/expo`)
**Objetivo:** Conectar los eventos de ML Kit con el estado de la aplicación y la persistencia local.

* [ ] **3.1 Escucha de Eventos en `useCanvasAst.ts`:**
  - Escuchar la emisión del Visual AST V2 enriquecido desde el módulo nativo.
  - Actualizar el estado de entidades activas y alimentar el hover de Air View.

* [ ] **3.2 Integración en `StorageService.ts`:**
  - Guardar el `ml_kit_payload` en la capa `visual_ast_layer` de los archivos canónicos `.cmn`.

* [ ] **3.3 Sincronización con `CompilationService.ts`:**
  - El AST que se envía a la nube ya incluye el texto transcrito de cada entidad y los conectores desambiguados.

---

### ETAPA 4: Adaptación del Prompt y Compilador Gemini en la Nube (`packages/functions`)
**Objetivo:** Configurar Gemini 3.8 Flash como Resolutor Semántico que aprovecha la transcripción local de ML Kit.

* [ ] **4.1 Actualización de `compilerPrompt.ts`:**
  - Instruir al modelo que el Visual AST incluye transcripción caligráfica de alta fidelidad (`transcribed_text` y `ml_kit_payload`).
  - Indicarle que cruce la imagen PNG con las etiquetas transcritas para enfocar su razonamiento en la taxonomía PACER y relaciones GRINDE, sin tener que adivinar caligrafía borrosa.

* [ ] **4.2 Conciliación de Bounding Boxes en `compileWorker.ts`:**
  - Asegurar que las cajas de taxonomía PACER envolverán exactamente las coordenadas físicas de las palabras generadas por ML Kit.

---

### ETAPA 5: Validación y Pruebas en Hardware Real (Samsung Galaxy Tab S10 Lite)
**Objetivo:** Verificar la eliminación total de los errores de segmentación mediante pruebas en vivo con el S-Pen.

* [ ] **TC-V2-01: Prueba de Fuego *"Photography"*:**
  - Escribir *"photography"* con caligrafía fluida.
  - Verificar que la `P`, la `h` y la `y` permanecen unificadas dentro de un único `TEXT_BLOCK` sin generar ninguna flecha falsa.
* [ ] **TC-V2-02: Escritura Pausada Incremental:**
  - Escribir *"photo"*, esperar 2 segundos, y escribir *"graphy"*.
  - Verificar que el Spatial Cluster Merging fusiona ambos tramos en una sola entidad *"photography"*.
* [ ] **TC-V2-03: Flecha con Etiqueta Superpuesta:**
  - Dibujar una flecha entre dos palabras y escribir *"inhibe"* sobre el tallo.
  - Verificar que el conector adopta `inferred_label: "inhibe"` sin que la palabra se convierta en un nodo aislado.
* [ ] **TC-V2-04: Metáfora Visual / Icono (GRINDE):**
  - Dibujar un foco de luz o un icono abstracto.
  - Verificar que ML Kit detecta baja confianza (< 0.70) y lo clasifica como `SKETCH_ICON`.
* [ ] **TC-V2-05: Medición de Rendimiento y Latencia:**
  - Comprobar que el trazo de 120 Hz no tiene caída de cuadros por segundo durante la escritura.
  - Comprobar que el resultado de ML Kit se consolida en la UI en menos de 500 ms tras levantar el lápiz.

---

## 4. CRONOGRAMA DE EJECUCIÓN

| Fase | Tarea Principal | Archivos Involucrados | Estimación |
| :--- | :--- | :--- | :--- |
| **Fase 1** | Contratos de Tipos TypeScript | `packages/core/src/types/visualAst.ts` | 1 hora |
| **Fase 2** | Integración de ML Kit en Kotlin | `JetpackInkView.kt`, `DigitalInkWorker.kt` | 3 horas |
| **Fase 3** | Puente Nativo & Sincronización UI | `useCanvasAst.ts`, `StorageService.ts` | 1.5 horas |
| **Fase 4** | Prompt y Conciliación Backend | `compilerPrompt.ts`, `compileWorker.ts` | 1 hora |
| **Fase 5** | Build APK y Validación en Tablet | `./scripts/install-app.sh`, Hardware S-Pen | 1 hora |
