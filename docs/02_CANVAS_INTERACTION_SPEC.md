# 02. Especificación de Interacción Ergonómica y Gestos en el Lienzo

## 1. Ergonomía de Entrada y Rechazo de Palma

Cognitive Canvas está diseñado siguiendo el principio ergonómico de **desacoplamiento total entre herramientas de marcado (Stylus) y navegación/manipulación (Dedos)**.

```
       ┌────────────────────────┐         ┌────────────────────────┐
       │   S-PEN / STYLUS EMR   │         │    TOQUES CON DEDOS    │
       ├────────────────────────┤         ├────────────────────────┤
       │ • Pluma (Ballpoint)    │         │ • Rechazo de Palma     │
       │ • Resaltador           │         │ • Zoom & Pan (2 Dedos) │
       │ • Lazo (Barrel Button) │         │ • Undo / Redo Gestual  │
       │ • Detección Hover      │         │ • Tap: Pill Atributo   │
       └────────────────────────┘         └────────────────────────┘
```

### 1.1 Stylus (S-Pen / Wacom EMR)

El lápiz digital es el único instrumento autorizado para generar trazos de tinta sobre el lienzo:
* **Pluma (Ballpoint Pen):**
  - Trazo opaco nítido con grosor estándar calibrado de **4.5 dp**.
  - Respuesta dinámica a la presión y velocidad para trazos tipográficos y conectores sin retraso perceptible.
* **Resaltador (Highlighter):**
  - Trazo translúcido de base ancha con composición alfa controlada (`rgba(..., 0.35)` o `ColorFilter` en modo multiplicativo/mezcla de capas) que permite leer notas subyacentes sin obscurecer la tinta negra o blanca.
* **S-Pen Barrel Button (Botón Lateral):**
  - **Lazo Momentáneo:** Mantener pulsado el botón lateral activa la herramienta de lazo de forma instantánea mientras el lápiz esté sobre la pantalla. Al levantarlo o soltar el botón, el sistema retorna automáticamente a la herramienta anterior (`pen` o `highlighter`) sin necesidad de tocar la barra de herramientas.
* **Air View (Hover):**
  - Detección del puntero a $15 \text{ mm}$ de la pantalla sin tocarla. Permite inspeccionar insignias de atributos, resaltar entidades cognitivas y activar micro-previsualizaciones semánticas sin generar marcas.
* **Borrador de Precisión con Feedback Visual de Radio Real:**
  - El motor nativo proyecta el radio exacto de acción ($r = \frac{\text{strokeWidth}}{2} \cdot s \cdot \rho$) directamente sobre la posición del cursor tanto en el aire como en contacto físico:
    * **Air View Hover:** Círculo punteado fino (`DashPathEffect`, ~8% de opacidad), anticipando con precisión milimétrica qué trazos serán alcanzados antes de tocar la pantalla.
    * **Touch Activo (Erasing):** Anillo sólido visible de 3 px con relleno translúcido dinámico (~20% de opacidad), proporcionando confirmación visual continua del área de impacto destructivo mientras se barre la superficie.

### 1.2 Gestos con Dedos y Rechazo de Palma Estricto

Para evitar trazos accidentales producidos por apoyar la mano en la pantalla al escribir:
1. **Rechazo Estricto (`stylusOnly == true`):**
   - En `ACTION_DOWN`, si el tipo de herramienta en `MotionEvent` no es stylus (`!stylusHandler.isStylus(event)`), el evento es descartado del motor de tinta y nunca invoca `inProgressStrokesView.startStroke()`.
2. **Gesto Multitáctil de 2 Dedos (Pinch-to-Zoom & Pan):**
   - Cuando se detecta un segundo dedo (`ACTION_POINTER_DOWN` o `pointerCount >= 2`):
     * Si existía algún trazo en progreso con el primer dedo, se cancela atómicamente con `inProgressStrokesView.cancelUnfinishedStrokes()`.
     * `CanvasTransformManager` asume el control continuo del lienzo aplicando escalado suave y paneo 2D.
3. **Gestos de Dos y Tres Dedos para Historial:**
   - **Doble tap con 2 dedos:** Dispara la acción de **Deshacer (Undo)**.
   - **Doble tap con 3 dedos:** Dispara la acción de **Rehacer (Redo)**.
4. **Single-Finger Tap:**
   - Un toque breve con un solo dedo ($< 500 \text{ ms}$ y desplazamiento $< 30 \text{ dp}$) se reserva estrictamente para la apertura de la píldora contextual `[🏷️ Atributo]` si y solo si el toque impacta sobre una entidad de tinta previamente reconocida en el lienzo.

---

## 2. Herramienta Lazo y Transformación Desacoplada

### 2.1 Selección y Algoritmo Point-in-Polygon

La herramienta de Lazo permite delimitar regiones continuas o discontinuas de tinta mediante un trazado libre:
* **Cierre Automático del Lazo:** Al soltar el lápiz (`onTouchUp`), el algoritmo une automáticamente el punto final con el inicial mediante un segmento recto, garantizando que el polígono sea matemáticamente cerrado.
* **Coordenadas Normalizadas en World DP:**
  Los puntos del trazo (`stroke.inputs.get(i)`) y el contorno del lazo se evalúan en el mismo espacio canónico:
  ```kotlin
  val strokePtX = pt.x / density
  val strokePtY = pt.y / density
  val isInside = isPointInPolygon(strokePtX, strokePtY, closedLoop)
  ```
* **Criterio de Selección:** Un trazo se considera seleccionado si más del **30% de sus puntos de muestra** quedan contenidos dentro del polígono, o si el centroide del trazo se encuentra en su interior.

### 2.2 Manipulación Visual O(1) Desacoplada

Tradicionalmente, mover una selección en aplicaciones de dibujo implica recalcular o recrear los trazos vectoriales en cada cuadro, degradando el rendimiento por debajo de 60 FPS.

Cognitive Canvas resuelve esto desacoplando la transformación visual de la mutación física:
1. **Durante el arrastre / redimensionamiento (120 Hz):**
   - Los trazos seleccionados se renderizan a través de una matriz afín temporal (`selectionMatrix.postTranslate(dx, dy)`).
   - No se crea ni se clona ningún objeto `Stroke` en memoria.
2. **Al soltar el lápiz (`onTouchUp`):**
   - Se ejecuta una única mutación física atómica sobre los trazos afectados.
   - Se actualizan sus cajas delimitadoras en `SpatialHashGrid`.
   - Se notifica a la capa de React Native el cambio final de posición y dimensión mediante `onSelectionChanged` y `onStrokesTransformed`.

### 2.3 Barra de Acciones Flotante (`ContextualToolPill`)

Una vez confirmada una selección por lazo, aparece una barra flotante inmediatamente adyacente a los límites de la selección (`selectionBounds`):

```
┌─────────────────────────────────────────────────────────────┐
│  [🌀 3 trazos]  │  [🏷️ Atributo]  │  [📋]  │  [🎨]  │  [🗑️] │
└─────────────────────────────────────────────────────────────┘
```

* **Conteo de Trazos:** Indicador que muestra la cantidad de trazos agrupados.
* **`[🏷️ Atributo]`:** Abre el modal de anclaje semántico (`SemanticAnchorModal`), asociando el clúster a un concepto GRINDE/PACER.
* **`[📋 Duplicar]`:** Clona instantáneamente los trazos con un desplazamiento diagonal de $+20 \text{ dp}$.
* **`[🎨 Color]`:** Aplica uno de los 3 colores armónicos del tema actual a los trazos seleccionados.
* **`[🗑️ Eliminar]`:** Remueve atómicamente los trazos de la vista y del índice espacial.

---

## 3. Gestos Nativos Inteligentes

### 3.1 Gesto Scratch-out (Tachadura Invariante al Zoom y Borrado Estricto)

Permite borrar palabras o notas dibujando un zigzag rápido sobre ellas, sustituyendo la necesidad de cambiar a la herramienta de borrador.

* **Detección Geométrica de Zigzag:**
  1. **Reversiones de Velocidad Angular:** Mínimo de $\ge 4$ inversiones abruptas en la dirección de la componente principal de movimiento, con un desplazamiento mínimo por rama de `minDelta = 3.5f` Screen DP.
  2. **Tortuosidad Elevada:** La relación entre la longitud acumulada del trazo y la distancia directa euclidiana de sus extremos debe satisfacer $\text{tortuosity} \ge 1.6f$.
  3. **Acotamiento Vertical:** Bounding box con altura restringida para no solaparse con líneas de texto contiguas arriba o abajo.
* **Política de Borrado por Intersección Estricta:**
  - **Eliminación Exclusiva de Trazos Colisionantes:** Solo se eliminan aquellos trazos cuya geometría física intersecta de manera real y directa con la envolvente del scratch-out.
  - **Prohibición de Propagación por Cercanía (Anti-BFS):** Se prohíben terminantemente las búsquedas de proximidad artificial (como colas BFS o expansiones radiales por clúster), previniendo la eliminación accidental de palabras adyacentes o conectores cercanos que no fueron tachados intencionalmente.
  - **Padding Delimitado a 6-8 World DP:** El margen de tolerancia perimetral se encuentra estrictamente acotado entre 6 y 8 World DP.
  - El propio trazo de la tachadura se descarta de forma instantánea de la memoria y nunca llega a persistirse.

### 3.2 Draw-and-hold (Regularización Geométrica con Dwell)

Facilita la creación de mapas limpios permitiendo regularizar líneas, flechas y figuras geométricas a mano alzada:
* **Dwell Sostenido (450 ms):** Si al terminar una figura el usuario mantiene la punta del lápiz inmóvil durante 450 milisegundos:
  - Se activa un **feedback háptico sutil**.
  - El motor analiza la trayectoria de puntos (`ShapeDetector.kt` / `DrawAndHoldManager`).
* **Figuras Reconocidas:**
  - **Líneas Rectas y Arcos Curvos:** Regularización a recta ortogonal/diagonal o a curvas suaves cuadráticas de Bézier si $\text{sagittaRatio} \ge 0.12$.
  - **Puntas de Flecha Proporcionales (Viewport-Calibrated Head Scaling):**
    * La longitud de las aletas de la punta se desvincula de valores fijos en pantalla y se calibra armónicamente con el grosor del trazo (`strokeWidth`) y la escala del viewport (`canvasScale` y densidad $\rho$):
      $$\text{baseHeadScreenDp} = \text{clamp}(14.0 + \text{strokeWidth} \times 0.4, 12.0, 24.0)$$
      $$\text{headLengthWorld} = \frac{\text{baseHeadScreenDp}}{\max(\text{canvasScale} \times \rho, 0.001)}$$
      $$\text{wingAngle} = 0.48 \text{ rad } (\approx 27.5^\circ)$$
    * Esto previene que a zooms $\ge 200\%$ la punta se dibuje gigante y a zooms reducidos ($< 50\%$) resulte ilegible.
  - **Flechas Bidireccionales ($\longleftrightarrow$):**
    * **Detección de Doble Vértice Agudo:** En trazos abiertos (`!isClosed`), el reconocedor evalúa la existencia simultánea de dos quiebres agudos ($\le 60^\circ$, $\cos \alpha \ge 0.50$): uno cerca del inicio ($\le 22\%$ de la longitud del trazo) y otro cerca del final ($\ge 78\%$).
    * **Generación Continua:** Si se detectan ambos extremos, el cuerpo conecta los puntos interiores (recto o arco cuadrático según `sagittaRatio`) y proyecta dos aletas en $p_{start}$ orientadas hacia el cuerpo y dos aletas en $p_{end}$ orientadas hacia el cuerpo, retornando un `Stroke` continuo regularizado sin saltos visuales.
  - **Rectángulos y Cajas de Concepto:** Regularización ortogonal con esquinas nítidas.
  - **Círculos y Elipses:** Modelado mediante 4 curvas cúbicas de Bézier tangenciales con coeficiente $\kappa = 0.55228475$.
  - **Triángulos:** Reconocimiento de 3 vértices dominantes RDP.

---

## 4. Sistemas de Papel y Paletas Armónicas

El lienzo abandona los colores planos genéricos e implementa cuatro fondos diseñados para ergonomía óptica prolongada, cada uno con su tríada de tintas favoritas contextuales:

| Preset ID | Fondo | Tinta Principal (Texto) | Tinta Secundaria (Relaciones) | Tinta de Acento (Destacado) | Retícula |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `dark_slate` | Pizarra Azulada (`#0F172A`) | Blanco Hueso (`#F8FAFC`) | Azul Eléctrico (`#38BDF8`) | Rosa Carmín (`#F43F5E`) | Puntos (`#27354A`) |
| `charcoal_dark` | Grafito Carbón (`#18181B`) | Tiza Suave (`#F4F4F5`) | Verde Esmeralda (`#34D399`) | Ámbar Dorado (`#FBBF24`) | Puntos (`#27272A`) |
| `warm_ivory` | Marfil Cálido (`#FBF9F5`) | Carbón Pizarra (`#1E293B`) | Azul Zafiro (`#1D4ED8`) | Borgoña Vino (`#BE123C`) | Guías (`#E5DEC9`) |
| `pure_white` | Blanco Puro (`#FFFFFF`) | Negro Pizarra (`#0F172A`) | Azul Cian (`#0284C7`) | Carmesí Vivo (`#E11D48`) | Cuadrícula (`#E2E8F0`) |

### Sincronización Dinámica
Al cambiar el preset de fondo del lienzo, la barra de herramientas (`GoodnotesToolbar`) actualiza automáticamente sus slots de color rápido para mantener el contraste óptimo y la armonía visual sin requerir ajustes manuales por parte del estudiante.

---

## 5. Barra Flotante Magnética (Docking a 4 Bordes)

La barra de herramientas (`GoodnotesToolbar.tsx`) implementa un sistema de acoplamiento magnético inteligente en los cuatro márgenes físicos de la pantalla (`left`, `right`, `top`, `bottom`):

### 5.1 Comportamiento de Pan & Snap
* **Arrastre Libre:** El usuario puede tomar el tirador de arrastre de la barra y desplazarla en dos dimensiones sobre la pantalla.
* **Evaluación de Distancias Ortogonales:** Al soltar la barra (`onTouchEnd`), el sistema calcula la distancia euclidiana de su centro hacia los cuatro bordes físicos y la acopla magnéticamente al borde más cercano.
* **Reorientación Automática de Layout:**
  - En los bordes laterales (`left` o `right`), la barra adopta una disposición vertical compacta ($56 \text{ dp}$ de ancho).
  - En los bordes superior o inferior (`top` o `bottom`), la barra se reorienta horizontalmente ($56 \text{ dp}$ de alto), optimizando el área útil de dibujo.

### 5.2 Calibración Ergonómica de Posición
* **Anclaje Inferior (`bottom: 18`):**
  Alineado a la misma cota física del `FloatingFooter` (`bottom: 18 dp`), manteniendo la barra centrada horizontalmente y dejando libres las esquinas para los botones flotantes de Zoom y Stylus, eliminando la sensación de flotación desconectada.
* **Anclaje Superior (`top: 56` o `top: 14` en Zen Mode):**
  Posicionado debajo del `TopHeader` ($56 \text{ dp}$) cuando el header es visible, o en $14 \text{ dp}$ en pantalla completa.
* **Anclaje Lateral Ergonómico (Tercio Medio-Superior):**
  En lugar de ubicarse en el centro vertical exacto ($50\%$), la barra se eleva hacia el tercio medio-superior libre:
  $$\text{topOffset} = \text{minTop} + \frac{\text{verticalCenter} - \text{minTop}}{2}$$
  Donde $\text{minTop}$ es $56 \text{ dp}$ (o $16 \text{ dp}$ en Zen Mode) y $\text{verticalCenter} = \frac{\text{screenHeight} - \text{toolbarHeight}}{2}$.
  Esto asegura dos ventajas ergonómicas críticas:
  1. **Alcance Óptimo del Pulgar:** Permite conmutar herramientas sin forzar la articulación de la mano no dominante que sostiene la tablet.
  2. **Protección de la Zona de Apoyo de la Palma (Palm Rejection):** Despeja la mitad inferior del lateral, impidiendo que la palma apoyada dispare toques falsos en la barra.

---

## 6. Motor Determinista de Popovers y Safe Insets

Para evitar que los menús emergentes (selector de color, selector de grosores, plantillas de papel, menú del borrador) aparezcan desfasados, cortados o tapen el botón que los invocó:

### 6.1 Posicionamiento Matemático Basado en Dimensiones Reales
* **Medición de Anclaje (`measureInWindow`):**
  Al pulsar un botón de la barra, se obtienen las coordenadas absolutas en pantalla del disparador (`anchorRect: { x, y, width, height }`).
* **Tabla Calibrada de Dimensiones Reales (`POPOVER_SIZES`):**
  Cada popover cuenta con su altura y anchura física exactas (medidas con padding y bordes reales incluidos):
  - `eraser`: $170 \times 42 \text{ dp}$
  - `color`: $210 \times 188 \text{ dp}$
  - `stroke`: $230 \times 364 \text{ dp}$ (alojando las 6 opciones completas sin desbordes)
  - `paper`: $240 \times 384 \text{ dp}$ (alojando 4 tipos de papel + 4 temas de color)
  - `undoHistory`: $170 \times 88 \text{ dp}$
  - `laser`: $180 \times 130 \text{ dp}$
* **Separación Estándar Unificada (`gap = 8 dp`):**
  Se elimina cualquier offset estático o hardcodeado. La proyección en los 4 bordes se rige por:
  - Dock Inferior: $\text{top} = \text{anchor.y} - \text{popover.height} - \text{gap}$
  - Dock Superior: $\text{top} = \text{anchor.y} + \text{anchor.height} + \text{gap}$
  - Dock Izquierdo: $\text{left} = \text{anchor.x} + \text{anchor.width} + \text{gap}$
  - Dock Derecho: $\text{left} = \text{anchor.x} - \text{popover.width} - \text{gap}$
* **Safe Insets y Clamping:** Se aplican cotas de seguridad (`16 dp` desde los límites del display) para evitar recortes accidentales en los extremos de la pantalla.

---

## 7. Modo Zen y Feedback de Zoom

### 7.1 Inmersión en Modo Zen
* **Desvanecimiento Total de Controles:** Mediante un solo toque o comando, los controles de chrome periféricos (`TopHeader` y `FloatingFooter`) se desvanecen completamente con transiciones de opacidad suaves.
* **Preservación de la Tinta:** El lienzo permanece 100% interactivo, con la barra de herramientas acoplada en su posición mínima.

### 7.2 Toast Efímero de Zoom
* Al realizar el gesto de pellizco para zoom (*pinch-to-zoom*) en modo Zen:
  - Como el indicador de zoom del footer está oculto, el motor activa un **toast flotante centralizado** que muestra el porcentaje entero actual:
    $$\text{zoomPercent} = \text{Math.round}(\text{canvasScale} \times 100)\%$$
  - Se activa un temporizador que desvanece suavemente el toast a los **1800 ms** de cesar el gesto multitáctil, manteniendo el espacio visual despejado.
