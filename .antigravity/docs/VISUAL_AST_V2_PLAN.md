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
| - getScreenToWorldMatrix(): Entrada transformada directamente a World Space |
| - Almacenamiento continuo de Stroke(x, y, t, p) en coordenadas de mundo     |
+--------------------------------------+--------------------------------------+
                                       |
                                       | Evento: onStrokeEnd + Debounce 280 ms
                                       v
+-----------------------------------------------------------------------------+
| FASE 2: PIPELINE LOCAL EN SEGUNDO PLANO (Kotlin Background Coroutine)       |
|                                                                             |
|  [Paso 2.1: Normalización Canónica Zoom-Invariante (DigitalInkWorker)]       |
|  - Cálculo de Bounding Box envolvente [minX, minY, maxX, maxY]              |
|  - Traslación al origen: (x - minX, y - minY)                               |
|  - Escala canónica isotrópica: factor = 160dp / height (Aspect Ratio fijo)  |
|                                                                             |
|  [Paso 2.2: Inferencia ML Kit Digital Ink Recognition]                     |
|  - Modelo On-Device ('es' / 'en') procesa trazos normalizados canónicos     |
|    * Confianza >= 0.65 ---> TEXT_BLOCK (Palabra/Línea + BBox + Texto)       |
|    * Confianza <  0.65 ---> SKETCH_ICON (Metáfora visual / Icono AABB)      |
|                                                                             |
|  [Paso 2.3: Fusión Espacial Incremental (Spatial Cluster Merging)]          |
|  - Tolerancia adaptativa proporcional a altura intrínseca H-tilde           |
|    (Distancia X <= 1.5 * H, Solapamiento Y >= 50%)                          |
|    ---> Re-evalúa con ML Kit y fusiona in-place ("photo" + "graphy")       |
+--------------------------------------+--------------------------------------+
                                       |
                                       | Emite evento a React Native
                                       v
+-----------------------------------------------------------------------------+
| FASE 3: CAPTURA CONTEXTUAL Y HOVER (S-Pen Air View / UI React Native)       |
| - Air View Hover proyectado a World Space: (touch - pan) / zoom             |
| - Bounding Box collision exacta inmune al nivel de zoom                     |
| - Dwell 800 ms ---> Popover [Mecanismo | Analogía | Evidencia]              |
+--------------------------------------+--------------------------------------+
                                       |
                                       | Usuario pulsa [Compilar Mapa]
                                       v
+-----------------------------------------------------------------------------+
| FASE 4: RESOLUCIÓN SEMÁNTICA MULTIMODAL (AWS Lambda + Gemini 3.8 Flash)     |
| - Entrada: Render PNG Nativo + Visual AST V2 enriquecido (con texto y bbox) |
| - Gemini prioriza transcribed_text de ML Kit como verdad OCR de los trazos  |
| - Salida: CompiledCognitiveMap (PACER, GRINDE, Anki Flashcards, Transfer)   |
+-----------------------------------------------------------------------------+
```

---

### 2.5 Tratamiento de Escala, Zoom Infinito y Normalización Canónica

En un lienzo infinito con zoom libre (10% a 1000%), los píxeles de pantalla (*Screen Space*) destruyen los umbrales estáticos si no se manejan con una separación estricta:

#### 1. Los Dos Espacios de Coordenadas
* **Screen Space (Pantalla):** Exclusivo para captura de eventos `MotionEvent`, visualización de tooltips flotantes en la UI y el Front-Buffer de renderizado inmediato.
* **World Space (Mundo Virtual):** Todos los puntos de los trazos en `JetpackInkView` se transforman inmediatamente con `transformManager.getScreenToWorldMatrix()`. El Visual AST, las cajas delimitadoras (`bbox`), las colisiones de borrador y la persistencia en formato `.cmn` residen **estricta y exclusivamente en World Space (dp)**.

#### 2. Heurísticas Espaciales con Escala Intrínseca ($\tilde{H}$)
En lugar de emplear umbrales fijos en píxeles (ej. `distancia <= 25 px`), `ScaleEstimator` y `EntityClusterer` calculan la altura intrínseca de caligrafía $\tilde{H}$ (enfoque MyScript):
$$\text{distancia\_max} = 1.2 \times \tilde{H}$$
Si el usuario escribe con zoom al 400%, la altura de la letra en el mundo es menor, por lo que la tolerancia se contrae proporcionalmente; si escribe un titular gigante, la tolerancia se expande. Las heurísticas son 100% autoadaptables a la caligrafía real.

#### 3. Normalización Canónica Isotrópica en `DigitalInkWorker` (Google ML Kit)
Google ML Kit fue entrenado con muestras caligráficas a escala estándar de pantalla móvil (altura típica entre 120 y 240 dp). Si se envían coordenadas de mundo crudas tras navegar a coordenadas lejanas (ej. $X=15000, Y=25000$) o con zoom extremo, el reconocedor pierde precisión.
Para neutralizar por completo el zoom y el pan:
1. Se calcula el bounding box del clúster de trazos: $[x_{\min}, y_{\min}, x_{\max}, y_{\max}]$.
2. Se trasladan los puntos al origen: $(x - x_{\min}, y - y_{\min})$.
3. Se calcula el factor de escala canónico isotrópico para una altura objetivo de $160\text{ dp}$:
   $$\text{scale} = \frac{160.0}{\max(y_{\max} - y_{\min}, 5.0)}$$
4. Se proyectan los puntos normalizados:
   $$x' = (x - x_{\min}) \times \text{scale}, \quad y' = (y - y_{\min}) \times \text{scale}$$
5. Se preserva el timestamp temporal $t$.
Esto garantiza que la red neuronal de ML Kit siempre "ve" la palabra en la proporción y resolución óptima de inferencia, sin importar si el usuario escribió en zoom al 15% o al 800%.

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

* [x] **2.1 Dependencia en `apps/expo/android/app/build.gradle`:**
  - Google ML Kit Digital Ink Recognition (`18.1.0`) y kotlinx-coroutines-android integrados.

* [x] **2.2 Gestor de Modelos Offline (`DigitalInkModelManager.kt`):**
  - Descarga bajo demanda y verificación offline del modelo de reconocimiento de caligrafía (`es` y `en`).

* [x] **2.3 Worker de Segmentación en Background (`DigitalInkWorker.kt`):**
  - Inferencia asíncrona mediante corrutinas de Kotlin (`suspendCancellableCoroutine`).
  - **Normalización Canónica Zoom-Invariante:** Traslación al origen $(0,0)$ y escalamiento isotrópico a altura canónica estándar ($160\text{ dp}$), garantizando máxima precisión de la red neuronal en cualquier nivel de zoom (10% a 1000%).
  - Clasificación de bloques con umbral de confianza $\ge 0.65$ (`isTextBlock: true`).

* [x] **2.4 Exposición en Módulo Nativo (`JetpackInkModule.kt`):**
  - Métodos React `@ReactMethod` `initializeDigitalInk` y `recognizeInkStrokes`.

---

### ETAPA 3: Integración en el Puente de React Native (`apps/expo`)
**Objetivo:** Conectar los eventos de ML Kit con el estado de la aplicación y la persistencia local.

* [x] **3.1 Inicialización e Inferencia en `useCanvasAst.ts`:**
  - Inicialización automática al montar el lienzo (`initializeDigitalInk("es")`).
  - Enriquecimiento asíncrono en segundo plano de entidades `TEXT_BLOCK` con `transcribed_text` y `ml_kit_payload`.

* [x] **3.2 Exportación de Métodos en `JetpackInkCanvas.tsx`:**
  - Tipado de `recognizeInkStrokes` e `initializeDigitalInk`.

---

### ETAPA 4: Adaptación del Prompt y Compilador Gemini en la Nube (`packages/functions`)
**Objetivo:** Configurar Gemini 3.8 Flash como Resolutor Semántico que aprovecha la transcripción local de ML Kit.

* [x] **4.1 Actualización de `compilerPrompt.ts`:**
  - Instrucción explícita a Gemini para utilizar como verdad base el `transcribed_text` del Visual AST Layer, usando la imagen multimodal para resolver la taxonomía PACER y relaciones GRINDE sin alucinaciones.

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
