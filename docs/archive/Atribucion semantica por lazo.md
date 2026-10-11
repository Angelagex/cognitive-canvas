# ESPECIFICACIÓN TÉCNICA Y ADR: ATRIBUCIÓN SEMÁNTICA POR LAZO (V6)
*Delimitación Espacial Libre de Unidades Conceptuales Compuestas, Traslación Solidaria y Sinergia con Hardware S-Pen*

================================================================================
1. CONTEXTO, MOTIVACIÓN Y FUNDAMENTOS COGNITIVOS
================================================================================

1.1 Limitaciones del Finger Tap y la Granularidad Léxica
- En la especificación V5 se introdujo el anclaje semántico mediante *Finger Tap* sobre entidades individuales detectadas por el AST.
- Sin embargo, en el aprendizaje relacional profundo (metodología iCanStudy / Mirror Mapping de Justin Sung), un concepto rara vez se reduce a una sola palabra aislada.
- Con frecuencia, una idea o hipótesis causal se compone de:
  1. Un término clave acompañado de un esquema visual o boceto no verbal (ej. "Difracción" + dibujo de rendija y frente de onda).
  2. Una ecuación o desarrollo algebraico distribuido en múltiples líneas.
  3. Una sub-red de varios nodos conectados que, en conjunto, forman un *Mecanismo Causal* único.
- Con *Finger Tap*, el usuario solo puede tocar una caja delimitadora a la vez, lo que fuerza una atomización artificial del pensamiento y genera anclajes fragmentados.

1.2 La Potencia Ergonómica del Lazo como Delimitador Semántico
- El lazo de selección libre (activado con la herramienta de la barra o manteniendo pulsado el *Barrel Button* del S-Pen) permite al estudiante rodear de un solo trazo continuo cualquier conjunto arbitrario de trazos, palabras e ilustraciones.
- Al cerrar el lazo sobre un área:
  * El usuario define visual y cognitivamente: *"Todo lo que está dentro de este lazo conforma una única unidad de significado"*.
  * No se restringe a lo que el algoritmo de clustering predijo en local: el estudiante ejerce control directo sobre los límites del concepto.

1.3 Desincronización Topológica Actual en la Traslación
- Actualmente, cuando un usuario selecciona trazos con el lazo y los traslada por el lienzo (`selectionMatrix.postTranslate()`), los atributos semánticos (`placedAttributes`: pins, notas pasivas, resplandores under-glow) permanecen anclados a sus coordenadas absolutas originales en World Space.
- Esto provoca que los trazos se muevan pero sus insignias semánticas queden flotando en el vacío ("anclajes huérfanos"), rompiendo la integridad visual y la coherencia del compilador.


================================================================================
2. DECISIONES ARQUITECTÓNICAS Y FUNDAMENTOS (ADR)
================================================================================

2.1 Decisión: El Lazo como Mecanismo Dual (Manipulación Espacial + Atribución Semántica)
- Justificación: No crear una herramienta nueva en la barra de herramientas. El Lazo ya existente (`brushType = "lasso"`) amplía sus capacidades:
  1. Si hay trazos seleccionados, la pastilla contextual (`ContextualToolPill`) no solo ofrece `[Borrar]` y `[Deseleccionar]`, sino que expone directamente las 3 píldoras de atribución semántica:
     `[⚙️ Mecanismo]` `[💡 Analogía]` `[📊 Evidencia]`
  2. Además, se añade la opción de añadir una nota rápida o dictado por voz para registrar la lógica profunda del bloque encerrado.

2.2 Decisión: Emisión de Bounding Box y Coordenadas en `topSelectionChanged`
- Justificación: Anteriormente, `JetpackInkView.kt` emitía únicamente `{ hasSelection, selectedCount }`. Para posicionar la interfaz de anclaje contextual en React Native y asociar el atributo a la región seleccionada, el evento nativo debe propagar los límites de mundo de la selección:
  * `bounds: { minX, minY, maxX, maxY }`
  * `centroid: { worldX, worldY }`

2.3 Decisión: Traslación Solidaria de Atributos Semánticos con la Matriz del Lazo
- Justificación: Cuando el usuario arrastra la selección en el lienzo (`LassoSelectionManager.kt` aplica `totalDragDx` y `totalDragDy` al soltar el lápiz):
  * `JetpackInkView` debe emitir un evento `topStrokesTransformed` con el desplazamiento acumulado `(dx, dy)` y los identificadores de trazos afectados.
  * En React Native, el hook `useCanvasDocument` traslada automáticamente cualquier `PlacedAttribute` cuyo centroide o `entityBounds` esté contenido dentro de la selección activa, sumando `(dx, dy)` a `worldX`, `worldY` y sus límites.

2.4 Decisión: Agrupación y Fusión Semántica en el Visual AST
- Justificación: Cuando se atribuye una etiqueta semántica a una selección de lazo:
  1. Se crea un `PlacedAttribute` que abarca el Bounding Box unificado de todos los trazos seleccionados.
  2. Las entidades del Visual AST contenidas total o parcialmente en la selección reciben un `semantic_anchor` común o se marcan con `cluster_id` compartido.
  3. Al compilar con Gemini 3.8 / Flash, este clúster se inyecta como una macro-unidad en el `passiveContext` con prioridad sobre las palabras sueltas.

2.5 Decisión: Feedback Visual Inmediato (Under-Glow de Selección y Auto-Deselección Suave)
- Justificación: Al pulsar un chip semántico en la pastilla del lazo:
  1. Se aplica inmediatamente el resplandor suave (*Under-Glow Shading*) con el color temático del atributo:
     * Mecanismo: Azul zafiro (`rgba(56, 189, 248, 0.14)`).
     * Analogía: Púrpura amatista (`rgba(168, 85, 247, 0.14)`).
     * Evidencia: Ámbar cálido (`rgba(251, 191, 36, 0.14)`).
  2. Se fija la micro-insignia en la esquina superior derecha del Bounding Box.
  3. Se deselecciona el lazo suavemente sin obligar al usuario a dar un tap adicional fuera de la selección, devolviendo el control al modo de escritura.


================================================================================
3. INTERACCIÓN Y FLUJO DE USUARIO (WORKFLOW)
================================================================================

3.1 Flujo Rápido con S-Pen Hardware (0 Toques en Barra):
1. El estudiante redacta o dibuja libremente con el S-Pen.
2. Mantiene presionado el botón lateral (*Barrel Button*) y rodea un conjunto de trazos (ej. un esquema con flechas y palabras).
3. Levanta el S-Pen: el lazo se cierra automáticamente y los trazos quedan rodeados por la línea discontinua cian.
4. Aparece la pastilla contextual flotante directamente sobre o junto a la selección con:
   `[3 trazos] | [⚙️ Mecanismo] [💡 Analogía] [📊 Evidencia] | [🗑️] [✕]`
5. El estudiante toca con el S-Pen o con el dedo la píldora deseada (ej. `[⚙️ Mecanismo]`):
   - Si desea dejarlo como etiqueta rápida de un tap: se crea inmediatamente el atributo con título por defecto ("Mecanismo Causal").
   - Si desea añadir una nota o voz: un toque largo o pulsar `[...]` despliega el modal de nota contextual.
6. La selección se desactiva y el área queda iluminada con el Under-Glow correspondiente.

3.2 Flujo con Herramienta Lazo del Dock:
1. El usuario selecciona la herramienta Lazo en el dock vertical.
2. Traza el lazo alrededor del contenido.
3. Se despliegan las opciones de movimiento, borrado y atribución semántica.
4. Al pulsar una categoría semántica, se asigna el anclaje y el lienzo queda listo para seguir operando.


================================================================================
4. MODIFICACIONES TÉCNICAS Y CONTRATOS DE CÓDIGO
================================================================================

4.1 Contratos TypeScript (`types/canvas.ts`):
```typescript
export interface SelectionBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  centerX: number;
  centerY: number;
}

export interface SelectionChangedEvent {
  hasSelection: boolean;
  selectedCount: number;
  bounds?: SelectionBounds;
}

export interface StrokesTransformedEvent {
  dx: number;
  dy: number;
  affectedStrokeCount: number;
}
```

4.2 Motor Nativo Android (`LassoSelectionManager.kt` y `JetpackInkView.kt`):
- En `notifySelectionChanged()`: calcular y enviar `bounds` (`minX`, `minY`, `maxX`, `maxY`, `centerX`, `centerY`) en el payload de `topSelectionChanged`.
- En `onTouchUp()` tras arrastre: invocar callback de transformación para disparar `topStrokesTransformed` con `totalDragDx` y `totalDragDy`.

4.3 Pastilla Contextual (`ContextualToolPill.tsx`):
- Expandir cuando `activeBrush === "lasso" && hasSelection`:
  * Mostrar contador de trazos seleccionados.
  * Añadir botones rápidos: `Mecanismo`, `Analogía`, `Evidencia`.
  * Mantener acciones de `Borrar` y `Cancelar Selección`.
  * Props añadidas: `onAssignSemanticAttribute?: (type: PassiveAttributeType) => void`.

4.4 Hook de Estado del Lienzo (`useCanvasDocument.ts` / `useCanvasAst.ts`):
- Implementar `handleStrokesTransformed(dx, dy)`:
  * Desplaza los `placedAttributes` cuya posición se encuentre dentro del área de la selección antes del desplazamiento.
- Implementar `handleAssignAttributeToSelection(type)`:
  * Genera un nuevo `PlacedAttribute` centrado en el bounding box de la selección activa, con `entityBounds` que cubre exactamente todos los trazos encerrados.
  * Dispara `clearSelectionTrigger` para limpiar el lazo y volver al flujo de dibujo.


================================================================================
5. PLAN DE IMPLEMENTACIÓN
================================================================================

- Paso 1: Actualizar `types/canvas.ts` con los campos enriquecidos de selección y transformación.
- Paso 2: Modificar `LassoSelectionManager.kt` y `JetpackInkView.kt` para emitir límites y el evento de transformación de coordenadas.
- Paso 3: Actualizar `ContextualToolPill.tsx` para incluir las píldoras de atribución semántica `[⚙️]`, `[💡]`, `[📊]`.
- Paso 4: Implementar en `useCanvasAst.ts` y `useCanvasDocument.ts` la lógica de asignación semántica y arrastre solidario de anclajes.
- Paso 5: Conectar los handlers en `App.tsx` y validar la compilación y tests sin regresiones.