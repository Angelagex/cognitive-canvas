# ESPECIFICACIÓN TÉCNICA Y ADR: ERGONOMÍA DEL LIENZO, GESTOS S-PEN Y WORKFLOW VISUAL (V4)
*Normalización de Escala en World Space, Rediseño del Lazo por Hardware y Desacoplamiento de Ruido Visual*

================================================================================
1. CONTEXTO Y MOTIVACIÓN DEL CAMBIO
================================================================================

1.1 Deficiencias de Escala y Scratch-Out Actuales
- Iniciar el lienzo al 10% con trazo de 16 px fuerza una escala macro distorsionada, obligando al usuario a compensar con zooms extremos y produciendo inconsistencias en la densidad de los datos vectoriales.
- El algoritmo actual de Scratch-Out en `JetpackInkView.kt` evalúa umbrales en píxeles de pantalla sin normalizar por `canvasScale`. Al escribir con zoom al 150-200%, el recorrido en píxeles es insuficiente para alcanzar los umbrales de pantalla, mientras que el radio de proximidad estático (40 dp) absorbe y borra palabras vecinas legítimas.

1.2 Ruido Atencional y Saturación de Herramientas
- El resaltado visual del bounding box durante el S-Pen Hover actúa como un artefacto intrusivo de depuración que interrumpe el flujo cognitivo mientras el usuario redacta.
- La redundancia en mecanismos de borrador (botón flotante, botón del S-Pen y scratch-out) penaliza la ergonomía. En un mapa de aprendizaje relacional, la reorganización topológica (lazo/mover) es significativamente más prioritaria que el borrado repetitivo.


================================================================================
2. DECISIONES ARQUITECTÓNICAS Y FUNDAMENTOS (ADR)
================================================================================

2.1 Decisión: Escala Inicial Canónica (100% / 125%) y Trazo Base Fino
- Justificación: Configurar la inicialización en `canvasScale = 1.0` (100%) o `1.25` (125%) con calibre de trazo en coordenadas de mundo de 4.5 dp (para pen regular).
- Rango de Zoom: 10% (visión panorámica de toda la red) hasta 600% (anotaciones detalladas en nodos secundarios).

2.2 Decisión: Scratch-Out Invariante a la Escala y Delimitación de Palabras
- Justificación: Todos los cálculos de distancia, longitud y desplazamiento delta dentro de `isScratchOutStroke()` deben operar en coordenadas de mundo dividiendo por `canvasScale`:
  * `minDeltaWorld = (4.0f * density) / canvasScale`
  * `totalLengthWorld >= (40.0f * density) / canvasScale`
- Eliminación de Borrado Indiscriminado:
  * Reducir el umbral de expansión de clúster a `min(15f, alturaTrazo * 0.35f)`.
  * Exigir que no se crucen vacíos horizontales superiores a 1.2 veces el ancho de letra media, evitando que tachar una palabra corta borre el término contiguo.

2.3 Decisión: Reasignación del Botón del S-Pen a Selección por Lazo (Momentary Tool)
- Justificación: En lugar de alternar al borrador, mantener presionado el botón lateral del S-Pen activa temporalmente el modo Lazo (`brushType = "lasso"`).
- Comportamiento:
  * Stylus con botón presionado en contacto con pantalla -> Trazar contorno de selección.
  * Soltar botón -> Retener selección activa para mover/trasladar con el lápiz.
  * Toque simple fuera de la selección -> Deseleccionar y retornar a la herramienta previa.

2.4 Decisión: Supresión de la Caja Visual en Hover (Eliminación de Debug Artifacts)
- Justificación: El aeropuntero de S-Pen no debe renderizar contornos rectangulares sobre el texto en pantalla. La detección de hover de 800 ms opera en silencio en segundo plano y únicamente despliega la pastilla o menú semántico cuando se completa el tiempo de espera.

2.5 Decisión: Paletas de Contraste Armónico y Fondos
- Presets de Fondo:
  1. `Dark Slate`: Fondo `#0F172A`, Tinta principal `#F8FAFC`, Rejilla `#334155`.
  2. `Warm Ivory`: Fondo `#FBF9F5`, Tinta principal `#1E293B`, Rejilla `#E2D9C8`.
  3. `Pure White`: Fondo `#FFFFFF`, Tinta principal `#0F172A`, Rejilla `#E2E8F0`.
- Inversión Inteligente: Al alternar el tema de fondo, la tinta blanca sobre fondo oscuro se proyecta automáticamente a tinta carbón sobre fondo claro para preservar la visibilidad del documento.

2.6 Decisión: Stickers de Dibujo a Mano como Trazos Nativos (Pre-baked Vectors)
- Justificación: Los iconos no son imágenes de mapa de bits (PNG) ni capas superpuestas ajenas. Se almacenan como definiciones vectoriales JSON locales.
- Al insertarse en el lienzo, se inyectan como instancias de `Stroke` en `completedStrokes`, haciéndolos compatibles con la selección de lazo, borrado por trazo y exportación de alta resolución.


================================================================================
3. PLAN DE ACCIÓN PARA EL AGENTE DEL IDE
================================================================================

Paso 1: Normalización de Zoom y Trazos en Viewport
- En `useCanvasViewport.ts` y `useCanvasTools.ts`, fijar el valor por defecto de `canvasScale` en `1.0` y `activeWidth` en `4.5f`.

Paso 2: Corrección Invariante del Scratch-Out en `JetpackInkView.kt`
- Ajustar `isScratchOutStroke()` para proyectar las coordenadas de los inputs mediante la matriz inversa de cámara (`transformManager.getScreenToWorldMatrix()`).
- Evaluar reversiones (`xReversals >= 5`), densidad de longitud (`totalLength / boxDiag >= 4.5f`) y limitar el radio de borrado en `handleScratchOut()` para no absorber palabras con separación espacial.

Paso 3: Redirección del Barrel Button a Lasso
- En `JetpackInkView.kt`, actualizar el manejo de eventos para que la detección de `BUTTON_STYLUS_PRIMARY` active `brushType = "lasso"` mientras el botón permanezca pulsado.

Paso 4: Limpieza de UI en Hover
- En `useCanvasHover.ts` y componentes de renderizado asociados, eliminar el dibujo del contorno azul sobre las entidades bajo el cursor (`hoveredEntityBounds`), manteniendo únicamente la activación del anclaje a los 800 ms.

Paso 5: Modernización de Iconografía de UI
- Sustituir iconos estáticos genéricos por la librería `lucide-react-native` o `phosphor-react-native` en los docks de herramientas y cabecera del lienzo.