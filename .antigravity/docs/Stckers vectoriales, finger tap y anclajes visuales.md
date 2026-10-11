# ESPECIFICACIÓN TÉCNICA: STICKERS VECTORIALES, FINGER TAP Y ANCLAJES VISUALES (V5)
*Arquitectura de Glifos Nativos, Interacción Táctil Diferenciada y Feedback Visual de Atributos*

================================================================================
1. ESQUEMA DE DATOS PARA STICKERS VECTORIALES PRECOMPILADOS
================================================================================

1.1 Filosofía de Implementación
Para no romper el motor gráfico (`androidx.ink`) ni añadir capas WebView/SVG ajenas:
- Cada icono es una colección de trazos normalizados en una cuadrícula virtual de 100x100 unidades relativas.
- Cuando el usuario inserta un sticker (ej. "Engranaje", "Bombilla", "Cerebro"):
  1. Se escalan los puntos vectoriales al tamaño deseado en World Space (ej. 60x60 dp).
  2. Se posicionan en el centroide especificado `(worldX, worldY)`.
  3. Se instancian como objetos `Stroke` con `StockBrushes.pressurePenLatest` o `StockBrushes.markerLatest`.
  4. Se agregan directamente a `completedStrokes` con un identificador común.
- Resultado: El icono puede seleccionarse con el Lazo, moverse, borrarse y recibe atributos semánticos exactamente igual que un dibujo hecho a mano.

1.2 Contrato JSON del Catálogo de Stickers (`assets/vector_stickers.json`)

{
  "version": "1.0.0",
  "catalog": [
    {
      "id": "icon_gear",
      "name": "Engranaje (Mecanismo)",
      "category": "COGNITIVE_SYMBOLS",
      "default_width": 64.0,
      "default_height": 64.0,
      "strokes": [
        {
          "relative_width": 2.5,
          "points": [
            { "rx": 50.0, "ry": 20.0, "p": 0.8 },
            { "rx": 55.0, "ry": 20.0, "p": 0.8 },
            { "rx": 58.0, "ry": 25.0, "p": 0.8 }
          ]
        },
        {
          "relative_width": 2.0,
          "points": [
            { "rx": 50.0, "ry": 35.0, "p": 0.6 },
            { "rx": 65.0, "ry": 50.0, "p": 0.6 },
            { "rx": 50.0, "ry": 65.0, "p": 0.6 },
            { "rx": 35.0, "ry": 50.0, "p": 0.6 },
            { "rx": 50.0, "ry": 35.0, "p": 0.6 }
          ]
        }
      ]
    },
    {
      "id": "icon_lightbulb",
      "name": "Bombilla (Analogía/Idea)",
      "category": "COGNITIVE_SYMBOLS",
      "default_width": 56.0,
      "default_height": 72.0,
      "strokes": [
        {
          "relative_width": 2.2,
          "points": [
            { "rx": 50.0, "ry": 15.0, "p": 0.7 },
            { "rx": 70.0, "ry": 30.0, "p": 0.8 },
            { "rx": 65.0, "ry": 55.0, "p": 0.8 },
            { "rx": 58.0, "ry": 65.0, "p": 0.7 },
            { "rx": 42.0, "ry": 65.0, "p": 0.7 },
            { "rx": 35.0, "ry": 55.0, "p": 0.8 },
            { "rx": 30.0, "ry": 30.0, "p": 0.8 },
            { "rx": 50.0, "ry": 15.0, "p": 0.7 }
          ]
        }
      ]
    }
  ]
}

1.3 Inyección de Puntos en Kotlin (`JetpackInkView.kt`):
- `worldX_point = originWorldX + (rx / 100.0f) * targetWidth`
- `worldY_point = originWorldY + (ry / 100.0f) * targetHeight`
- Se construyen los inputs con `StrokeInput.create()` y se insertan en `completedStrokes` dentro de un lote atómico.


================================================================================
2. INTERACCIÓN DE ANCLAJE SEMÁNTICO POR FINGER TAP
================================================================================

2.1 Desacoplamiento de Dispositivos de Entrada
- S-Pen (Stylus): Dedicado exclusivamente a trazar tinta, conectar nodos y activar el Lazo con el botón de hardware. El Hover ya no dispara modales de entrada para evitar interrupciones visuales involuntarias.
- Dedo (Touch): Dedicado a manipulación de interfaz:
  * 2 dedos: Navegación de lienzo (Pinch-to-zoom y Pan).
  * 1 toque rápido (< 300 ms, desplazamiento < 15 dp): Selección de entidad para añadir/editar atributos semánticos (`onFingerTap`).

2.2 Flujo de Selección por Tap
1. El usuario toca con el dedo un bloque de texto o boceto.
2. `JetpackInkView.kt` emite `topFingerTap` con coordenadas en World Space.
3. Se detecta la entidad colisionante en `useCanvasHover.ts` y se activa el estado `activeSelectedEntityId`.
4. Respuesta Visual en el Lienzo:
   - Se dibuja una iluminación tenue (Focus Glow) sobre la caja de la entidad: `rgba(56, 189, 248, 0.15)`.
   - Se proyecta un micro-menú flotante adyacente a la entidad con las 3 pastillas semánticas:
     `[⚙️ Mecanismo]`  `[💡 Analogía]`  `[📊 Evidencia]`
5. Al pulsar una opción o dictar por voz, se guarda el atributo en `placedAttributes` y la caja de foco se desvanece suavemente.


================================================================================
3. IDENTIFICACIÓN PERMANENTE DE ENTIDADES CON ATRIBUTOS (FEEDBACK VISUAL)
================================================================================

Para que el usuario reconozca de un vistazo qué partes del mapa ya tienen profundidad semántica sin recargar el dibujo:

3.1 Capa de Iluminación Trasera (Under-Glow Shading)
- Se renderiza por debajo de la tinta nativa (en coordenadas de mundo):
  * `Mecanismo Causal`: Resplandor azul zafiro tenue (`rgba(56, 189, 248, 0.12)`).
  * `Analogía`: Resplandor púrpura amatista tenue (`rgba(168, 85, 247, 0.12)`).
  * `Evidencia`: Resplandor ámbar tenue (`rgba(251, 191, 36, 0.12)`).
- La forma no es un rectángulo rígido: es una cápsula redondeada con esquinas suaves (*Rounded Pill*) dilatada 12 dp alrededor de la entidad.

3.2 Micro-Insignia Flotante (Semantic Anchor Pin)
- En la esquina superior derecha del Bounding Box de la entidad se ancla un icono circular de 18x18 dp:
  * `⚙️` para Mecanismo.
  * `💡` para Analogía.
  * `📊` para Evidencia.
- Interacción:
  * Tocar la micro-insignia con el dedo abre el popover en modo lectura/edición de la nota semántica.
  * Durante la compilación con Gemini, estas etiquetas se agregan como contexto enriquecido en el payload, permitiendo a la IA validar si el mecanismo causal planteado por el estudiante es riguroso.