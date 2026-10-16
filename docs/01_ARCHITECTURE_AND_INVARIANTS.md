# 01. Arquitectura del Motor y Sistema de Invariantes Espaciales

## 1. Stack Tecnológico

El núcleo de Cognitive Canvas está construido sobre una arquitectura desacoplada y de ultra-bajo retardo (low-latency ink engine) diseñada para dispositivos con soporte para stylus activo (Samsung S-Pen / Wacom EMR) y capacidades de síntesis cognitiva:

* **Cliente / Frontend (Capa React Native & Expo):**
  - **Expo SDK 52 / React Native 0.76.9** con arquitectura híbrida de puente nativo optimizado.
  - Orquestación de estado reactivo mediante hooks especializados (`useCanvasState`, `useCanvasHover`, `useCanvasAst`).
  - Capas de renderizado analítico en SVG/React Native (`PlacedAttributeBadges`, `GhostOverlay`, `PacerOverlayLayer`).
  - Componentes de UI flotantes ergonómicos contextuales con sombras y bordes de alta fidelidad estética (`ContextualToolPill`, `SemanticAnchorTooltip`, `FloatingFooter`).

* **Motor de Tinta Nativo (Android High-Performance Inking):**
  - **Android Jetpack Ink v1.0.0 Estable** (`androidx.ink.strokes:strokes:1.0.0`, `androidx.ink.brush:brush:1.0.0`, `androidx.ink.authoring:authoring:1.0.0`, `androidx.ink.rendering.android:rendering-android:1.0.0`). Formalización de la versión oficial estable, descartando ramas `alpha` incompatibles con el toolchain de Kotlin 1.9 de Expo/React Native.
  - Componente de captura en tiempo real acelerado por hardware: `InProgressStrokesView` ejecutando pipelines de baja latencia con predicción de trazos.
  - Renderizado estático en búfer GPU: `ViewStrokeRenderer` dibujando directamente sobre el `Canvas` de Android en `dispatchDraw()`.
  - Herramientas nativas especializadas: `LassoSelectionManager`, `StrokeEraser`, `DrawAndHoldManager`, `CanvasTransformManager`, `SpatialHashGrid`, `ShapeDetector`.
  - **Mitigación de Race Conditions en Búfer Frontal:** Sincronización segura de hilos entre el S-Pen barrel button, React Native JS bridge y `FrontBufferedRenderer` / `CanvasBufferedRenderer`. La alternancia rápida de herramientas (lápiz a lazo o borrador) y los eventos asíncronos del bridge ejecutan verificaciones atómicas de ciclo de vida antes de solicitar llamadas a `drawAsync()`, previniendo excepciones críticas (`IllegalStateException: Attempt to draw after renderer has been closed`) ante cambios de estado concurrentes.

* **Infraestructura Cloud Serverless (AWS via SST Ion):**
  - **SST Ion (v3)** orquestando infraestructura como código basada en Pulumi/Terraform.
  - **AWS Lambda** para procesamiento asíncrono y endpoints HTTP de compilación cognitiva.
  - **Amazon S3** para almacenamiento de imágenes de exportación de alta resolución (`HighResPngExport`) y snapshots vectoriales de mapas `.cmn`.
  - **Amazon DynamoDB** para metadatos de documentos, índices de auditoría GRINDE y sesiones de usuario.
  - **Google Gemini 2.5 Flash / Pro** como motor de razonamiento multimodal y diagnóstico de esquemas cognitivos.

---

## 2. Invariante Espacial Canónico (World DP)

### 2.1 Definición Formal del Espacio Canónico

Uno de los pilares de estabilidad matemática en Cognitive Canvas es la **invarianza absoluta de las coordenadas de tinta frente al zoom, desplazamiento (pan) y densidad física de la pantalla (DPI)**.

```
                           Pantalla Física (Pixels / Hardware)
                                       │
                                       ▼  ÷ density (DisplayMetrics)
                           Espacio de Pantalla Lógico (Screen DP)
                                       │
                                       ▼  - (translateX / density)
                                       │  ÷ canvasScale
                                       ▼
                              Mundo Canónico (World DP)
```

La ecuación formal de transformación entre el contacto del stylus y las coordenadas almacenadas es:

$$\mathbf{x}_{\text{world}} = \frac{\mathbf{x}_{\text{screen\_px}} - t_x}{s \cdot \rho}$$

$$\mathbf{y}_{\text{world}} = \frac{\mathbf{y}_{\text{screen\_px}} - t_y}{s \cdot \rho}$$

Donde:
* $\mathbf{x}_{\text{screen\_px}}, \mathbf{y}_{\text{screen\_px}}$: Coordenadas brutas provistas por `MotionEvent` de Android.
* $t_x, t_y$: Desplazamiento actual del lienzo en píxeles físicos (`canvasTranslateX`, `canvasTranslateY`).
* $s$: Factor de escala actual (`canvasScale`, donde $1.0 = 100\%$).
* $\rho$: Densidad de pantalla del dispositivo (`resources.displayMetrics.density`).

### 2.2 Invariante de Almacenamiento y Operaciones

1. **La tinta (`Stroke.inputs`), el índice espacial (`SpatialHashGrid`), las cajas delimitadoras (`StrokeBBox`) y el Visual AST residen única y exclusivamente en World DP.**
2. Ni el zoom ni el paneo modifican los puntos de los trazos completados. Únicamente la herramienta de **Lazo** altera las coordenadas físicas de un trazo cuando el usuario realiza una traslación o reescalado deliberado.
3. El borrador por trazo (`StrokeEraser`) y el cálculo de áreas no sufren desfases ni dilataciones ficticias a zooms altos ($300\%$) o bajos ($25\%$), ya que la detección se evalúa en el espacio normalizado de mundo.

### 2.3 Matrices Desacopladas en `CanvasTransformManager.kt`

Para garantizar un rendimiento de 120 FPS sin bloqueos, `CanvasTransformManager` mantiene dos matrices ortogonales:

1. **Matriz de Captura (`getScreenToWorldMatrix()`):**
   Calcula la transformación inversa para proyectar eventos de entrada táctil y hover directamente en coordenadas World DP:
   ```kotlin
   fun getScreenToWorldMatrix(): Matrix {
       val m = Matrix()
       m.postTranslate(-canvasTranslateX, -canvasTranslateY)
       m.postScale(1f / canvasScale, 1f / canvasScale)
       m.postScale(1f / density, 1f / density)
       return m
   }
   ```

2. **Matriz de Renderizado en GPU (`getRenderMatrix()`):**
   Aplica la escala y traslación directa al contexto gráfico del `Canvas` antes de delegar el redibujado a `ViewStrokeRenderer` o a las capas de HUD:
   ```kotlin
   fun getRenderMatrix(): Matrix {
       val m = Matrix()
       m.postScale(density, density)
       m.postScale(canvasScale, canvasScale)
       m.postTranslate(canvasTranslateX, canvasTranslateY)
       return m
   }
   ```

---

## 3. Indexación Espacial O(1) con `SpatialHashGrid.kt`

Para habilitar detección instantánea de colisiones sin realizar barridos exhaustivos $O(N)$ sobre miles de trazos a 120 Hz, el motor nativo implementa una grilla espacial hash en dos dimensiones.

### 3.1 Estructura y Parámetros

* **Tamaño de Celda Canónico:** $64 \text{ dp}$ en World DP. Este tamaño coincide con el radio empírico de un trazo de escritura estándar o palabra pequeña.
* **Clave de Hash:** Empaquetamiento entero único `hash(cellX, cellY) = (cellX * 73856093) ^ (cellY * 19349663)` o índice bidimensional compuesto en tabla de dispersión `LongSparseArray` / `HashMap<Long, MutableList<String>>`.

```
        ┌───────────┬───────────┬───────────┐
        │  Cell 0,1 │  Cell 1,1 │  Cell 2,1 │
        │           │   ╭───╮   │           │
        ├───────────┼───│─S1│───┼───────────┤
        │  Cell 0,0 │   ╰───╯   │  Cell 2,0 │
        │    ╭───╮  │           │           │
        │    │ S2│  │   Hover   │           │
        └────╰───╯──┴─────▲─────┴───────────┘
                          │
                   Radio de Búsqueda
```

### 3.2 Casos de Uso y Complejidad

1. **S-Pen Air View Hover:** Al pasar el puntero a 1.5 cm del cristal, se consultan las celdas circundantes en un radio de $48 \text{ dp}$ en tiempo constante $O(1)$, identificando el trazo o entidad subyacente de forma inmediata.
2. **Stroke Eraser:** Al deslizar el borrador, el motor no itera todos los trazos; solo consulta las celdas que intersectan con el segmento de borrado `(lastX, lastY) -> (curX, curY)`.
3. **Lazo Inteligente:** Pre-filtra qué trazos están dentro o cerca del polígono antes de ejecutar la prueba analítica de contención.

---

## 4. Ciclo de Vida de Trazos y Handoff Sin Parpadeo (Zero-Flicker)

El problema clásico de integración entre `InProgressStrokesView` (búfer de renderizado temporal rápido) y `ViewStrokeRenderer` (búfer persistente en Android View) es el **parpadeo de un cuadro (1-frame handoff glitch)**: si el trazo temporal se elimina antes de que el búfer persistente termine su dibujo en pantalla, el usuario percibe un destello negro o salto visual.

### 4.1 Pipeline de Doble Búfer Protegido

El motor implementa un ciclo de sincronización atómica en dos etapas en `JetpackInkView.kt`:

```
1. Stylus UP ──────────► InProgressStrokesFinishedListener
                               │
                               ├─► completedStrokes.put(id, finishedStroke)
                               ├─► synchronized(strokesToHandOff) {
                               │       strokesToHandOff.addAll(strokeKeys)
                               │   }
                               └─► postInvalidateOnAnimation()
                                           │
2. Frame Render ◄──────────────────────────┘
       │
       ▼
dispatchDraw(canvas)
       │
       ├─► viewStrokeRenderer.drawWithStrokes(canvas)  [Tinta visible en pantalla]
       │
       └─► synchronized(strokesToHandOff) {
               inProgressStrokesView.removeFinishedStrokes(strokesToHandOff)
               strokesToHandOff.clear()
           } [Liberación segura sin pérdida de fotograma]
```

### 4.2 Garantías de Robustez

* Si el trazo es cancelado (e.g. se detecta que el usuario colocó un segundo dedo para hacer zoom o pan), se invoca `inProgressStrokesView.cancelUnfinishedStrokes()` y se descarta cualquier ID sin pasarlo al almacenamiento persistente.
* Al borrar o deshacer (`undoStroke()`), se invocan cancelaciones atómicas tanto en el búfer temporal como en el mapa de trazos completos, invalidando la pantalla de manera inmediata.

---

## 5. Persistencia en 3 Capas (.cmn)

El formato de guardado universal de los mapas en Cognitive Canvas utiliza la extensión `.cmn` (Cognitive Map Network), implementando un archivo JSON estructurado en tres capas jerárquicas:

```json
{
  "version": "1.0.0",
  "mapId": "map_2026_10_11_abc123",
  "title": "Fotosíntesis y Transporte de Electrones",
  "updatedAt": "2026-10-11T23:15:00Z",
  "canvas": {
    "backgroundColor": "#0F172A",
    "themePreset": "dark_slate",
    "scale": 1.0,
    "translateX": 0.0,
    "translateY": 0.0
  },
  "raw_ink_layer": {
    "strokes": [
      {
        "id": "stroke_01_a9f8",
        "brushType": "pen",
        "color": "#F8FAFC",
        "baseWidth": 4.5,
        "flatPoints": [120.5, 230.1, 0.85, 1728688500120, 121.2, 232.0, 0.90, 1728688500136],
        "bounds": { "xmin": 120.5, "ymin": 230.1, "xmax": 210.4, "ymax": 280.9 }
      }
    ]
  },
  "visual_ast_layer": {
    "entities": [
      {
        "id": "ent_tilacoide",
        "type": "CONCEPT_CARD",
        "stroke_ids": ["stroke_01_a9f8", "stroke_02_b1c2"],
        "bbox": { "xmin": 115.0, "ymin": 225.0, "xmax": 320.0, "ymax": 380.0 },
        "ocr_label": "Membrana del Tilacoide"
      }
    ],
    "connectors": [],
    "attributes": [
      {
        "id": "attr-1728688599",
        "type": "CAUSAL_MECHANISM",
        "title": "Mecanismo Causal",
        "note": "Gradiente electroquímico impulsa ATP sintasa",
        "worldX": 217.5,
        "worldY": 225.0,
        "strokeIds": ["stroke_01_a9f8", "stroke_02_b1c2"]
      }
    ]
  },
  "compiled_cognitive_layer": {
    "evaluation": {
      "level": 3,
      "macro_islands": 4,
      "linear_thinking_risk": "LOW"
    }
  }
}
```

### 5.1 Serialización Plana Compacta (`flatPoints`)

Para maximizar la velocidad de I/O y reducir el tamaño del payload sobre la red en un $70\%$, los puntos de cada trazo no se guardan como arreglos de objetos JSON redundantes (`[{"x": 1, "y": 2}]`), sino como arreglos numéricos contiguos de 4 floats intercalados:

$$[x_0, y_0, p_0, t_0, \quad x_1, y_1, p_1, t_1, \quad \dots, \quad x_n, y_n, p_n, t_n]$$

Donde:
* $x, y$: Coordenadas en World DP.
* $p$: Presión normalizada del stylus ($0.0 \dots 1.0$).
* $t$: Marca de tiempo en milisegundos.

### 5.2 Reconstrucción Atómica en Kotlin

Al cargar un documento `.cmn`, `JetpackInkView` procesa el JSON nativamente en un hilo de fondo:
1. Instancia un `MutableStrokeInputBatch`.
2. Itera el arreglo plano de 4 en 4 elementos creando puntos nativos.
3. Construye el trazo inmutable `androidx.ink.strokes.Stroke(brush, batch)`.
4. Indexa el trazo en `SpatialHashGrid` y lo agrega a `completedStrokes`.
5. Emite un único redibujado `postInvalidateOnAnimation()` al concluir la carga, garantizando apertura instantánea de documentos complejos.

### 5.3 Persistencia de Preferencias de Usuario (`user_preferences.json`)

Para mantener una experiencia ergonómica personalizada e instantánea entre sesiones de trabajo, `StorageService` gestiona un almacén de configuración local independiente en `user_preferences.json`:

```json
{
  "toolbar_dock_edge": "bottom",
  "tool_widths": {
    "pen": 8.0,
    "marker": 12.0,
    "highlighter": 24.0,
    "eraser": 24.0,
    "lasso": 4.0,
    "laser": 16.0,
    "pan": 4.0
  },
  "theme_palettes": {
    "dark_slate": ["#F8FAFC", "#38BDF8", "#F43F5E"],
    "charcoal_dark": ["#F4F4F5", "#34D399", "#FBBF24"],
    "warm_ivory": ["#1E293B", "#1D4ED8", "#BE123C"],
    "pure_white": ["#0F172A", "#0284C7", "#E11D48"]
  }
}
```

1. **Posición de Acoplamiento Magnético (`toolbar_dock_edge`):**
   Persiste el borde de anclaje físico de la barra (`"left" | "right" | "top" | "bottom"`), restaurándola en su posición exacta al reabrir la app.
2. **Memoria de Grosor por Herramienta (`tool_widths`):**
   Elimina reseteos arbitrarios al alternar entre herramientas. Cada instrumento (`pen`, `highlighter`, `eraser`, etc.) retiene su grosor independiente calibrado por el usuario.
3. **Paletas Favoritas por Tema de Fondo (`theme_palettes`):**
   Mantiene la tríada de tintas preferidas de forma contextual para cada uno de los 4 temas de papel (`dark_slate`, `charcoal_dark`, `warm_ivory`, `pure_white`). Al cambiar de fondo, se cargan los colores asignados a ese papel específico para salvaguardar el contraste y la armonía visual.

---

## 6. Topología de Ventana, Inmersión del Sistema y Layout

Cognitive Canvas es una aplicación de inmersión total concebida para transformar la tablet en una superficie de papel infinito digital, libre de distracciones periféricas y fricción del sistema operativo.

### 6.1 Invariante de Pantalla Completa Nativa

1. **Inmersión Permanente vía `WindowInsetsControllerCompat`:**
   - La ventana de la aplicación configura el controlador de insets del sistema en modo:
     `WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE`.
   - Se ocultan tanto la barra de estado (`Type.statusBars()`) como la barra de navegación (`Type.navigationBars()`).
   - Si el usuario desliza desde el borde para ver la hora o notificaciones del sistema, las barras aparecen de forma translúcida y efímera, ocultándose automáticamente tras 2 segundos sin alterar el viewport ni desplazar los elementos del lienzo.

2. **Invariante de Superficie de Lienzo al 100%:**
   - El contenedor nativo `JetpackInkCanvas` ocupa permanentemente el **100% físico** del display (`StyleSheet.absoluteFillObject`).
   - Los elementos de chrome (`TopHeader`, `FloatingFooter`, `GoodnotesToolbar`, overlays de HUD) no reducen ni recortan la superficie del canvas; flotan estrictamente en capas superiores con valores controlados de `zIndex` y punteros traslúcidos.

3. **Prohibición Estricta del Componente `<Modal>` Nativo de Android:**
   - En Android, el componente `<Modal>` de React Native instancia un `android.app.Dialog` nativo con su propia ventana subordinada (`Window`).
   - La apertura y cierre de un `Dialog` resetea los flags de inmersión de la ventana principal, provocando que la barra de navegación del sistema parpadee, emerja forzadamente o empuje el contenido hacia arriba.
   - **Regla Arquitectónica:** Todos los popovers, selectores, menús contextuales y paletas de herramientas deben construirse mediante componentes `View` absolutos controlados dentro del árbol principal de React Native (`position: 'absolute'`), preservando intacta la inmersión de la ventana única.

---

## 7. Estándares de Calidad de Código y Modularidad

Para evitar la degradación arquitectónica (código espagueti y archivos masivos monolíticos):

* **Límite Estricto de 300 Líneas por Archivo:**
  Ningún componente de React Native, hook personalizado, archivo de estilos o clase nativa de Kotlin debe exceder las **300 líneas de código**.
* **Principio de Responsabilidad Única (SRP):**
  - Si un módulo de UI gestiona renderizado, lógica de estado y cálculo geométrico, debe descomponerse en:
    1. Componente de vista puro (`ComponentName.tsx`).
    2. Hook de orquestación de estado (`useComponentState.ts`).
    3. Funciones puras de cálculo matemático o posicionamiento (`componentPlacement.ts`).
    4. Estilos atómicos desacoplados (`ComponentName.styles.ts`).
* **Mantenimiento Continuo de la Deuda Técnica:**
  Toda refactorización o incorporación de funcionalidad debe preservar este límite mediante extracción de submódulos antes de fusionar cambios al codebase principal.
