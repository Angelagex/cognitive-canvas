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

### 3.1 Gesto Scratch-out (Tachadura Invariante al Zoom)

Permite borrar palabras o notas dibujando un zigzag rápido sobre ellas, sustituyendo la necesidad de cambiar a la herramienta de borrador.

* **Condiciones de Activación:**
  1. $\ge 5$ inversiones de dirección horizontal (zigzags en el eje X).
  2. Densidad de longitud acumulada $\ge 4.5$ veces el ancho de su bounding box.
  3. Desplazamiento mínimo por segmento de al menos **4 dp en World Space** (para evitar que trazos pequeños de caligrafía o sombras sean confundidos con tachaduras).
  4. Bounding box acotado verticalmente para no eliminar líneas de texto contiguas arriba o abajo.
* **Efecto:**
  - Los trazos bajo el bounding box del scratch-out son eliminados de inmediato.
  - El propio trazo de la tachadura es descartado sin llegar a persistirse.

### 3.2 Draw-and-hold (Regularización Geométrica con Dwell)

Facilita la creación de mapas limpios permitiendo dibujar líneas, flechas y figuras geométricas a mano alzada:
* **Dwell sostenido (450 ms):** Si al terminar una figura el usuario mantiene la punta del lápiz inmóvil durante 450 milisegundos:
  - Se activa un **feedback háptico sutil**.
  - El motor analiza la trayectoria de puntos (`DrawAndHoldManager`).
* **Figuras reconocidas:**
  - **Líneas rectas y Flechas:** Alineación automática del vector y adición de punta triangular limpia.
  - **Rectángulos y Cajas de Concepto:** Regularización ortogonal con esquinas redondeadas.
  - **Elipses y Círculos:** Ajuste de ejes mayor y menor.

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
