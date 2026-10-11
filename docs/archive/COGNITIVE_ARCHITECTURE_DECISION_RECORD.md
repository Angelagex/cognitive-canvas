# COGNITIVE ARCHITECTURE DECISION RECORD (CADR)
Fundamentos Pedagógicos, Psicología Cognitiva y Justificación de Diseño del Sistema

================================================================================
1. LA FALACIA DE LA GRANULARIDAD: POR QUÉ DEJAR DE ETIQUETAR PALABRAS
================================================================================

1.1 El Problema Observado
En la iteración previa del compilador, se exigió a la IA clasificar cada entidad del AST (entity_1, entity_2, ...) dentro de la taxonomía PACER. Esto causó dos fallos estructurales:
1. Ruptura Epistemológica: Una palabra léxica ("lente", "apertura", "foco") no es un concepto. Es una unidad de vocabulario. El concepto real es la ley óptica de difracción o la relación causal entre el tamaño físico del diafragma y la dispersión del círculo de confusión.
2. Degradación del LLM e Inflación de Tokens: Al obligar al modelo a emitir 40 objetos JSON independientes con campos repetitivos, el modelo agotaba su ventana de atención en tareas administrativas de etiquetado en lugar de dedicar cómputo al razonamiento relacional profundo. La respuesta tardaba hasta 15-20 segundos y costaba un volumen desproporcionado de tokens.

1.2 Justificación Teórica (Framework de Justin Sung / iCanStudy)
En el modelo de Mapeo Espejo (Mirror Mapping):
- Todo mapa mental construido bajo el método iCanStudy es intrínsecamente conceptual en su estructura general. El estudiante vuelca principios y relaciones, no diccionarios.
- El valor del mapa no reside en auditar la semántica de cada palabra, sino en auditar la arquitectura del esquema: ¿Existen ramas aisladas? ¿El pensamiento fluye en árbol jerárquico o en grafo de red interconectada? ¿Hay bucles de retroalimentación causal?
- Por tanto, la IA opera como un diagnosticador de esquemas macro, no como un corrector ortográfico-taxonómico.


================================================================================
2. NIVELES DE MADUREZ DEL MAPA (1 AL 4)
================================================================================

El sistema adopta explícitamente la rúbrica de madurez relacional de iCanStudy:

- Nivel 1 (Jerárquico Lineal / Estilo Buzan):
  * Síntoma: Concepto central en el medio y ramas radiales rígidas que se bifurcan hacia afuera sin tocarse entre sí.
  * Diagnóstico Cognitivo: Pensamiento pasivo y compartimentado. El estudiante replica el índice del libro o la estructura cronológica de la clase.
  * Intervención de la IA: Alertar sobre riesgo lineal (linear_thinking_risk: true) y forzar la búsqueda de causas transversales entre ramas opuestas.

- Nivel 2 (Conectividad Local):
  * Síntoma: Aparecen algunas flechas entre sub-ramas vecinas de un mismo tronco, pero los grandes temas siguen separados en silos.
  * Diagnóstico Cognitivo: Comprensión de causalidad inmediata, pero incapacidad de ver el sistema como un todo integrado.

- Nivel 3 (Red Integrada / Reconciliación Ausubeliana):
  * Síntoma: Múltiples enlaces cruzados (cross-links) que unen temas lejanos del lienzo. Presencia de etiquetas explícitas con mecanismos causales (inhibe, satura, cataliza).
  * Diagnóstico Cognitivo: El estudiante ha alcanzado la reconciliación integrativa. Comprende cómo un cambio en el extremo A perturba el estado del extremo B.

- Nivel 4 (Esquema Dinámico Complejo de Alto Orden):
  * Síntoma: Alta densidad no verbal (diagramas abstractos, modelos visuales propios), bucles causales bidireccionales y simplificación elegante de ideas complejas.
  * Diagnóstico Cognitivo: Comprensión experta intuitiva. Preparado para retos de transferencia lejana y aplicación clínica/práctica no estructurada.


================================================================================
3. RESTRICCIÓN RADICAL DE ANKI: COMBATIENDO EL CONOCIMIENTO INERTE
================================================================================

3.1 La Trampa de la Sobrememorización
El uso indiscriminado de tarjetas de repetición espaciada (Anki) genera una "ilusión de competencia": el estudiante recuerda la respuesta a una tarjeta atómica de dos líneas, pero es incapaz de diagnosticar un problema complejo en el mundo real porque los datos están desvinculados de su red de significado (conocimiento inerte).

3.2 La Política Estricta del Sistema
- Justin Sung prescribe un máximo de 100-150 tarjetas por semana, reservadas únicamente a lo estrictamente arbitrario.
- La IA tiene terminantemente prohibido convertir conceptos, causas o analogías en tarjetas de Anki.
- Algoritmo de Decisión para la IA:

  ¿El dato es deducible del modelo causal presente en el mapa?
  |-- SÍ ---> NO GENERAR TARJETA. (Se deduce pensando, no memorizando).
  `-- NO ---> ¿Puede el dato conectarse a una regla existente del mapa?
             |-- SÍ ---> Prescribir "relational_anchoring_suggestion".
             |          (Indicar al usuario cómo dibujarlo conectado).
             `-- NO ---> AnkiException (Máximo 2 tarjetas por mapa:
                        nombres propios arbitrarios, valores de constantes).


================================================================================
4. DISEÑO DE INTERACCIÓN: GHOST OVERLAY (BENCHMARKING DE LA INDUSTRIA)
================================================================================

4.1 Por qué un Modal Lateral Cerrado Destruye el Aprendizaje
Si el diagnóstico de la IA se presenta únicamente como un reporte en un panel lateral (Drawer de 380dp) con texto plano:
- Se induce una alta carga cognitiva dividida (Split-Attention Effect, Sweller): el estudiante debe leer en el panel, voltear a buscar en su dibujo a qué parte se refería la IA, y luego volver al texto.
- Se rompe el carácter espacial de la memoria humana.

4.2 Benchmarking y Solución Adoptada
- Modelos de Referencia:
  * Figma / FigJam: La colaboración visual y los comentarios no ocultan el canvas; flotan en el punto geométrico exacto de la discusión.
  * Miro / Mural: Mapas de calor y agrupaciones automáticas que proyectan halos semánticos sobre los post-its sin moverlos.
  * Photoshop / Procreate: La metáfora universal de capas independientes.
- La Capa Fantasma ("Ghost Overlay"):
  * La tinta del usuario permanece sagrada e inmutable en su Front-Buffer de baja latencia.
  * La retroalimentación de la IA se proyecta como una capa vectorial traslúcida que se puede encender y apagar a voluntad (toggleOverlay).
  * Los problemas estructurales (islas aisladas, datos flotando sin causa) se visualizan directamente donde ocurren en el espacio físico de la pantalla.


================================================================================
5. MATRIZ DE RETRIEVAL DE ALTO ORDEN: CÓMO SE CONSOLIDA LA MEMORIA
================================================================================

La IA no hace preguntas de memoria reproductiva ("¿Qué es la apertura del diafragma?"). Genera tres intervenciones basadas en evidencia neurocognitiva:

1. Pregunta de Puente Causal (Cross-Island Question):
   - Mecanismo: Obliga a activar dos áreas del esquema mental simultáneamente, forzando la sinaptogénesis entre redes neuronales que estaban desconectadas.
2. Transferencia de Vía Alta (High-Road Transfer - Perkins & Salomon):
   - Mecanismo: Despoja el principio de sus nombres técnicos y lo sitúa en un contexto ajeno. Si el estudiante entiende cómo el triángulo de exposición se comporta como un sistema de oferta y demanda o como la regulación de glucosa e insulina, ha dominado la regla invariante de fondo.
3. Detección de Falla Intencionada (Derring Effect - Wong & Lim):
   - Mecanismo: Presentar un error conceptual plausible y forzar al estudiante a explicar por qué falla activa la detección de discrepancias y previene falsos positivos en el razonamiento intuitivo.