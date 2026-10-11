# DECISION RATIONALE & COGNITIVE DESIGN LOGIC (ADR)
Registro de Decisiones Arquitectónicas, Principios Pedagógicos y Trade-offs Técnicos

================================================================================
1. ARQUITECTURA DEL MOTOR GRÁFICO Y COMPONENTE NATIVO (FRONTEND)
================================================================================

1.1 Decisión: Native UI Component (androidx.ink / PencilKit) vs. Canvas Web / React Native Skia
- Contexto: Selección del pipeline de renderizado para trazos a mano alzada.
- Decisión: Implementar un TurboModule / Native UI Component que consuma directamente las APIs nativas de bajo nivel del sistema operativo (`androidx.ink` + `GLFrontBufferedRenderer` en Android; `PencilKit` en iOS) en lugar de soluciones basadas en JavaScript, WebViews o librerías puente multiplataforma como Skia.
- Rationale Técnico:
  * El "Budget" de Latencia (La barrera de los 10 ms): Para que la escritura a mano alzada emule el papel real en pantallas de 90/120 Hz, el trazo debe aparecer en pantalla en menos de 10-16 ms. 
  * Cuello de botella del puente JS: Enviar eventos táctiles (`touchMove`) desde el hilo de la UI a través del puente de React Native hacia JavaScript para calcular splines introduce una latencia intrínseca de 30 a 70 ms, produciendo un retraso visual evidente (el trazo persigue al lápiz con retraso).
  * Front-Buffer Rendering: `androidx.graphics` en Android permite omitir el pipeline habitual de composición de ventana de Android y pintar directamente sobre el buffer frontal de la GPU.
  * Motion Prediction: `androidx.input` ejecuta modelos de aceleración por hardware que predicen la trayectoria del lápiz en los siguientes 5-10 ms, reduciendo la latencia percibida a prácticamente cero.
- Trade-offs & Mitigación:
  * Inconveniente: Mayor complejidad al requerir código nativo en Kotlin y Swift.
  * Mitigación: El componente nativo se aísla exclusivamente a la superficie del lienzo (trazos, zoom y pan). Toda la lógica de negocio, navegación, tooltips, modales y panel lateral se mantiene en React Native / Expo estándar.

1.2 Decisión: Arquitectura Híbrida (Edge Parsing + Cloud Reasoning)
- Contexto: Dónde se ejecuta la interpretación del mapa mental.
- Decisión: Separar el procesamiento en dos fases:
  1. Fase Local (Edge): Clasificación de trazos, agrupamiento espacio-temporal (Stroke Clustering), OCR de palabras manuscritas y topología de conectores (Visual AST).
  2. Fase Remota (Cloud): Inferencia semántica profunda, auditoría pedagógica GRINDE, clasificación PACER y generación de intervenciones cognitivas mediante Gemini 2.0 Flash.
- Rationale de Rendimiento y Costes:
  * Autonomía Offline: El usuario puede dibujar, mover ramas con el lazo, corregir y consultar notas pasivas sin depender de conectividad a internet ni incurrir en costes de API.
  * Reducción de Alucinaciones en el LLM: Pedir a un modelo multimodal que extraiga coordenadas exactas de píxeles para conectar flechas suele derivar en fallos de docking. Al resolver la topología localmente en el dispositivo, el LLM recibe un grafo ya delimitado y dedica el 100% de su atención al razonamiento conceptual.


================================================================================
2. INFRAESTRUCTURA BACKEND (SERVERLESS EN AWS CON SST ION)
================================================================================

2.1 Decisión: Serverless Efímero (AWS Lambda + S3) vs. Servidor Dedicado (EC2 / VPS)
- Contexto: Alojamiento del pipeline de compilación cognitiva y webhook hacia Gemini.
- Decisión: Construir la infraestructura con SST (v3 / Ion) sobre AWS Lambda y S3, descartando servidores persistentes.
- Rationale Técnico:
  * Perfil de Tráfico de Cero a Picos: La compilación de un mapa es un evento puntual. Durante la sesión de estudio (1-2 horas), el usuario dibuja en local sin generar llamadas de backend; la Lambda solo se despierta al pulsar `[Compilar Mapa]`. Un servidor dedicado representaría un costo ocioso del 99% del tiempo.
  * Timeouts y Concurrencia: La inferencia multimodal con Structured Outputs de mapas densos puede tardar de 5 a 15 segundos. AWS Lambda con timeout configurado a >= 60 segundos absorbe estas esperas sin riesgo de saturar hilos de un servidor Node tradicional.
  * Subida Segura sin Pasar por el Servidor: La app solicita una pre-signed URL a S3 para subir la captura PNG directamente desde la tablet a S3, descargando a la Lambda de manejar streams pesados de imágenes en memoria.


================================================================================
3. ERGONOMÍA, HARDWARE Y FLUJO NATURAL DE ESTUDIO (FRONTEND)
================================================================================

3.1 Decisión: Anclaje Semántico por Temporizador de Hover (800 ms) vs. Botón en Toolbar
- Contexto: Cómo asociar significado no verbal (metáforas, analogías, mecanismos) a los trazos.
- Decisión: Eliminar cualquier botón manual de la barra superior y utilizar la detección de proximidad (Hover a 5-20 mm) sostenida por 800 ms (o Barrel Button + tap).
- Rationale Cognitivo:
  * Preservación del Estado de Flujo: Cambiar de herramienta en una barra de herramientas superior interrumpe el bucle de codificación interna. El anclaje por Hover permite registrar el contexto en el mismo punto de fijación visual.
  * Umbral Anticolisión: Se fija en 800 ms con una tolerancia máxima de movimiento de 15 px para evitar disparos accidentales mientras se reposa la mano en el aire.

3.2 Decisión: Hardware Wacom EMR (Galaxy Tab S10 Lite) vs. Stylus Capacitivo / Bluetooth
- Contexto: Selección de la plataforma física de desarrollo y uso diario.
- Decisión: Uso de digitalizador activo Wacom EMR.
- Rationale Ergonómico:
  * Rechazo de Palma por Hardware: Permite apoyar la mano de forma idéntica a una libreta real sin disparar toques fantasmas.
  * Resonancia Electromagnética Pasiva: El S-Pen no depende de carga de batería ni emparejamiento Bluetooth para escribir, eliminando desconexiones y garantizando una tasa de refresco fluida y continua a 90 Hz.


================================================================================
4. SISTEMA DE ARCHIVOS Y PERSISTENCIA LOCAL (.cmn / JSON)
================================================================================

4.1 Decisión: Formato de Persistencia en 3 Capas Independientes
- Contexto: Cómo guardar los archivos del mapa en almacenamiento local.
- Decisión: Desacoplar la estructura en `raw_ink_layer`, `visual_ast_layer` y `compiled_cognitive_layer`.
- Rationale de Mantenibilidad:
  * `raw_ink_layer` almacena trazos atómicos vectoriales ($x, y, p, t$). Permite deshacer/rehacer ilimitado y renderizar a resolución nativa sin importar el nivel de zoom.
  * `visual_ast_layer` almacena la semántica local (clusters, flechas y atributos pasivos). Permite manipular entidades completas con el lazo sin recalcular la física de los trazos.
  * `compiled_cognitive_layer` almacena la respuesta de la IA. Si el usuario modifica trazos después de una compilación, la capa de compilación anterior no corrompe los trazos originales y puede invalidarse o actualizarse de forma diferencial.


================================================================================
5. RAZONAMIENTO Y PROMPTING DE GEMINI (BACKEND & COGNITIVE ENGINE)
================================================================================

5.1 Decisión: Anclas Semánticas Tipadas (Mechanism, Analogy, Evidence) en el Prompt
- Contexto: Interpretación de bocetos no verbales e iconos abstractos (la 'N' de GRINDE).
- Decisión: Forzar un objeto tipado `semantic_anchor` en la entrada hacia Gemini en lugar de un texto plano desestructurado.
- Impacto en el Razonamiento de Gemini:
  * Sesgo Heurístico Guiado: Un nodo marcado con `anchor_type: "MECHANISM"` dirige la atención del modelo hacia relaciones causales profundas (clasificándolo como `CONCEPTUAL` o `PROCEDURAL`).
  * Interpretación No Literal: Si el ancla es `ANALOGY`, evita que Gemini interprete iconos de forma superficial (ej. evita clasificar un embudo como objeto de cocina y lo interpreta como saturación de atención).

5.2 Decisión: Regla Anti-Sobrecarga Mnémica y Filtro Estricto de Anki
- Contexto: Generación automatizada de flashcards desde el grafo semántico.
- Decisión: PROHIBIR terminantemente la creación de flashcards para nodos Conceptuales, Procedimentales o Analógicos. Solo permitir tarjetas para nodos Evidence y Reference que tengan `deducible_from_context: false`.
- Rationale Neurocognitivo (Dr. Justin Sung):
  * La Ilusión de Competencia: Convertir principios y conceptos en tarjetas de preguntas y respuestas fragmenta el conocimiento en datos atómicos aislados (conocimiento inerte) y atrofia la comprensión de red.
  * Límite de Sostenibilidad: Máximo 100-150 tarjetas semanales. Los conceptos deben consolidarse mediante reconstrucción de grafos y retos de transferencia lejana, no mediante repetición espaciada ciega.

5.3 Decisión: Detección Activa de Pensamiento Lineal en la Auditoría GRINDE
- Contexto: Tendencia común a utilizar aplicaciones visuales para crear listas con viñetas o árboles rígidos disfrazados de mapas.
- Decisión: Incluir la métrica `cross_link_density_score` y la bandera `linear_thinking_risk` (< 0.20 de ratio cross-links / edges).
- Rationale Pedagógico (Ausubel / Novak):
  * Reconciliación Integrativa: La asimilación de esquemas complejos exige que el aprendiz descubra relaciones entre ramas conceptuales lejanas. Si el mapa carece de conexiones transversales, Gemini emite un feedback correctivo indicando la presencia de pensamiento lineal no integrado.


================================================================================
6. PARSING LOCAL DE TINTA DIGITAL Y VISUAL AST (FRONTEND & CORE)
================================================================================

6.1 Decisión: Segmentación Espacial por Línea Base (Componentes Conexas) vs. Umbral Temporal Rígido (< 600 ms)
- Contexto: Agrupamiento de trazos manuscritos en entidades lógicas (palabras, contenedores, conectores).
- Decisión: Sustituir la regla temporal rígida (`timeDiff <= 600 ms`) por un algoritmo de Componentes Conexas (BFS) basado en alineación de línea base (eje Y) y proximidad inter-carácter horizontal ($\Delta x \le 42\text{ px}$), absorbiendo trazos retardados (*delayed strokes*) independientemente del tiempo transcurrido.
- Rationale Biomecánico y Topológico:
  * Variabilidad Biomecánica: Al escribir a mano, el ser humano realiza pausas naturales de 0.8 a 2.5 segundos para pensar, mover la muñeca o trazar sílabas complejas. Un umbral de 600 ms fracturaba palabras largas (ej. "Photography") en fragmentos semánticos rotos (`Pho`, `otography`).
  * Integridad de la Topología: El docking magnético de flechas ($\le 30\text{ px}$), la contención en cajas jerárquicas y el anclaje semántico por Hover 800 ms operan sobre la caja envolvente (`bbox`) de la entidad completa. La fragmentación de palabras arruinaba el cálculo de distancias al romper los bordes de la entidad.
  * Trazos Retardados (Delayed Strokes): Cruzar la `t`, tildar vocales o poner puntos sobre la `i` son trazos ejecutados segundos después. Deben absorberse automáticamente en el clúster espacial existente sin forzar una nueva entidad.

6.2 Decisión: Motor AST Topológico Local vs. Google ML Kit Digital Ink Recognition
- Contexto: Elección entre un modelo de reconocimiento de escritura (OCR) neuronal empaquetado vs. un motor sintáctico y topológico determinista en TypeScript.
- Decisión: Mantener `VisualASTEngine` en TypeScript puro para la construcción del grafo del lienzo (topología, flechas compuestas, contención, cajas) y delegar el razonamiento semántico y lectura caligráfica multimodal a Gemini 2.0 Flash en la nube, prescindiendo de ML Kit en el núcleo del AST.
- Rationale Arquitectónico:
  * Disparidad de Propósito: ML Kit es un transcriptor OCR de texto plano a caracteres ASCII; desconoce la topología gráfica (no entiende flechas compuestas de tallo + punta, ni docking magnético, ni contención padre-hijo, ni iconos abstractos de GRINDE).
  * Peso y Autonomía: ML Kit requiere dependencias nativas de Google Play Services y descarga de modelos binarios de 25-40 MB por idioma. `VisualASTEngine` corre en TypeScript puro (< 5 KB), se ejecuta en < 2 ms, funciona 100% offline y es universalmente testeable en Vitest y ejecutable en la tablet y en Lambdas sin dependencias externas.
  * Visión Multimodal Nativa de Gemini 2.0 Flash: La lectura OCR exhaustiva y el entendimiento profundo de la caligrafía los realiza Gemini sobre el bitmap PNG de alta resolución. El motor local solo necesita saber qué trazos forman una unidad física, no su valor textual transcrito.

6.3 Decisión: Umbrales Adaptativos de Escala Caligráfica ($\tilde{H}$) vs. Píxeles Fijos
- Contexto: Los usuarios alternan entre escribir notas pequeñas al margen (altura ~14-18 px) y títulos de conceptos grandes (~50-80 px).
- Decisión: Sustituir umbrales estáticos por factores adaptativos escalados según $\tilde{H} = \max(14, \min(h_A, h_B))$.
  * $\Delta x_{\max} = \max(24, \min(65, 1.25 \times \tilde{H}))$.
  * $\Delta y_{\max} = \max(16, 0.85 \times \tilde{H})$.
- Rationale Biomecánico:
  * En caligrafía pequeña, un $\Delta x$ estático de 42 px fusionaba accidentalmente palabras distintas separadas por espacios cortos.
  * En titulares grandes, un $\Delta x$ de 42 px fracturaba una misma palabra si el espaciado inter-letra superaba 45 px. La escala adaptativa normaliza la variabilidad caligráfica en tiempo real.

6.4 Decisión: Conectores Curvos Bézier y Ortogonales (Codo) con Filtro de Inflexión Vertical
- Contexto: Los mapas mentales y diagramas causales utilizan flechas arqueadas para rodear nodos y flechas en ángulo recto (codo) para organizar flujos.
- Decisión: Integrar clasificación geométrica de conectores curvos (`CURVED`) y ortogonales (`ELBOW`) con `is_curved: true`.
- Rationale Geométrico y Discriminación de Texto:
  * Inflexión Vertical: Una flecha curva es un arco suave que presenta a lo sumo 1 inversión vertical en $Y$ ($\le 1$ extremo local). La escritura manuscrita o cursiva oscila verticalmente trazando astas y lazos ($\ge 2$ inversiones en $Y$). Este invariante geométrico evita que palabras cursivas sean erróneamente clasificadas como tallos de flecha.
  * Detección de Codo: Identifica vértices ortogonales donde dos segmentos consecutivos giran a $90^\circ \pm 20^\circ$ ($|\cos \theta| \le 0.35$).

6.5 Decisión: Detección de Contenedores Multi-Trazo por Ciclos Poligonales (3 a 6 Trazos)
- Contexto: Los usuarios frecuentemente dibujan cajas delimitadoras trazando 4 líneas rectas separadas (arriba, derecha, abajo, izquierda) en lugar de un único rectángulo cerrado sin levantar el lápiz.
- Decisión: Implementar un detector de ciclos simples en el grafo de conectividad de extremos de líneas rectas (tolerancia $\le 35\text{ px}$), fusionándolas en una única entidad `CONTAINER_BOX`.
- Rationale Topológico:
  * Exclusión de Puntas de Flecha: Solo se consideran líneas rectas cuyos extremos no contengan puntas de flecha (`ARROW_HEAD`), evitando que ciclos de flechas causales se confundan con una caja.
  * Jerarquía Automática: Permite que el Nivel 4 (Contención Jerárquica) capture inmediatamente cualquier entidad dibujada dentro de una caja de 4 trazos como `child_ids`.

6.6 Decisión: Detección Topológica de Bucles Causales ($A \to B \to C \to A$) y Métricas de Flujo
- Contexto: Los Mapas Conceptuales de Novak y los Diagramas de Bucles Causales de Senge basan su valor cognitivo en la identificación de ciclos de retroalimentación y premisas fundamentales.
- Decisión: Incorporar en el Visual AST la detección de ciclos dirigidos simples (`causal_loops`) y métricas de red (`topology_metrics`):
  * `root_entity_ids`: Nodos con grado de entrada 0 y salida > 0 (conceptos raíz / premisas generadoras).
  * `sink_entity_ids`: Nodos con grado de entrada > 0 y salida 0 (conclusiones o impactos terminales).
  * `cross_link_count`: Conexiones cruzadas convergentes, indicador empírico de aprendizaje significativo ausubeliano.
- Rationale de Aprendizaje:
  * Provee a Gemini de metadatos estructurales de alto nivel antes del prompting, permitiéndole generar retos de desaprendizaje (*Derring Effect*) y preguntas socráticas dirigidas exactamente a los bucles causales dibujados.

6.7 Decisión: Conectores Inhibitorios ($\bot$) y Flechas Bidireccionales ($\leftrightarrow$)
- Contexto: En modelos de sistemas complejos, bioquímica, neurociencia y lógica argumentativa, ciertas relaciones son de bloqueo, inhibición o supresión ($A \bot B$), o de influencia recíproca ($A \leftrightarrow B$).
- Decisión: Soportar `type: "INHIBITION"` (tapa perpendicular en T en el extremo del tallo, ángulo $60^\circ - 120^\circ$) y `directionality: "BIDIRECTIONAL"` (puntas en ambos extremos).
- Rationale Semántico:
  * Traduce directamente la semántica de la flecha al compilador: una arista inhibitoria mapea a relaciones semánticas de supresión o penalización en el grafo compilado sin requerir texto explicativo.

6.8 Decisión: Detección y Poda de Gestos de Tachado (*Scratch-Out*) In-AST
- Contexto: Corrección rápida de errores en el lienzo durante la sesión de dibujo sin necesidad de cambiar a la herramienta borrador.
- Decisión: Detectar trazos con $\ge 4$ inversiones rápidas de dirección horizontal ($dx$) en un área densa, identificándolos como `SCRATCH_OUT`. Las entidades cuyo bounding box tenga $\ge 35\%$ de solapamiento con el tachado son marcadas como `is_scratched_out: true` y podadas del AST activo.
- Rationale de Experiencia de Usuario:
  * Flujo de Pensamiento sin Fricción: El usuario tacha una palabra con un zig-zag rápido del S-Pen y continúa pensando sin interrumpir el flujo cambiando de modo de herramienta. El Visual AST ignora la entidad podada, impidiendo que contamine el grafo cognitivo o las tarjetas de Anki.


================================================================================
7. HIDRATACIÓN NATIVA, PERSISTENCIA Y REFACTORIZACIÓN MODULAR (FRONTEND & NATIVE)
================================================================================

7.1 Decisión: Reconstrucción e Hidratación de Trazos Nativos en Jetpack Ink (`loadStrokesFromJson`)
- Contexto: Al guardar y restaurar mapas mentales en formato `.cmn`, el motor nativo de Android (`JetpackInkView.kt`) debe reconstruir los trazos con idéntica fidelidad, color y sensibilidad a presión que cuando fueron dibujados originalmente.
- Decisión: Implementar la deserialización directa en Kotlin recreando instancias de `androidx.ink.strokes.Stroke` a través de `MutableStrokeInputBatch` y `StrokeInput.create(px, py, t, InputToolType.STYLUS, 0f, pressure, 0f, 0f)`.
- Rationale Técnico:
  * Preservación del Pipeline 120Hz: Al reinsertar los trazos directamente en el buffer nativo de Jetpack Ink (`strokes.add(stroke)`), el lienzo conserva la capacidad de selección con lazo, borrado por trazo o precisión, y renderizado por GPU sin intermediación del hilo de JavaScript.
  * Mapeo de Color por Trazo (`strokeColorMap`): Cada trazo persistido conserva su color hexadecimal original asignado en el diccionario nativo, evitando que al recargar un documento todos los trazos adopten el color del pincel actualmente seleccionado.

7.2 Decisión: Ciclo de Vida Atómico con Flush-Save en Bóveda y Último Mapa Activo
- Contexto: Pérdida potencial de trazos al cambiar de mapa mental o reiniciar la aplicación, así como contaminación cruzada de trazos dibujados entre distintos mapas.
- Decisión: Implementar una estrategia de persistencia atómica:
  1. *Flush-Save* antes de descarga: Al abrir un mapa en la Bóveda o pulsar "Nuevo Mapa", el hook fuerza un guardado inmediato y síncrono del documento activo actual en `.cmn`.
  2. Limpieza y Rehidratación Segura: Se vacía el lienzo nativo (`clearCanvas()`), se resetea el historial de deshacer/rehacer y se inyecta el JSON de trazos del nuevo mapa vía `loadStrokesTrigger`.
  3. Memoria de Último Mapa Activo: `StorageService` almacena el `lastActiveMapId` en `user_preferences.json`, permitiendo que al reiniciar la aplicación se reanude automáticamente la sesión en el mapa correspondiente sin presentar un lienzo en blanco.

7.3 Decisión: Arquitectura Modular Limpia (Patrón Facade en Hooks y Popovers Modulares)
- Contexto: Crecimiento de archivos monolíticos (`useCanvasState.ts` superó 1,140 líneas y `GoodnotesToolbar.tsx` superó 890 líneas), generando alto acoplamiento y dificultad para depurar el ciclo de vida de React Native.
- Decisión: Desacoplar `useCanvasState` en 6 sub-hooks cohesivos (< 300 líneas cada uno) bajo un Facade transparente, y modularizar la barra de herramientas extrayendo sus popovers:
  * Sub-hooks: `useCanvasTools`, `useCanvasViewport`, `useCanvasDocument`, `useCanvasAst`, `useCanvasHover`, `useCognitiveCompilation`.
  * Popovers: `StrokeWidthPopover`, `ColorPickerPopover`, `PaperTemplatePopover`, `ContextualToolPill`.
- Rationale de Mantenibilidad y Rendimiento:
  * Aislamiento de Re-renders: Los cambios frecuentes de viewport (zoom/pan) o hover no invalidan la lógica de persistencia de documentos ni la compilación de AST.
  * 100% Retrocompatibilidad: El API devuelto por `useCanvasState` se mantiene intacto hacia `App.tsx`, garantizando estabilidad total sin regresiones en las 32 pruebas unitarias de `packages/core`.

7.4 Decisión: Dock Lateral Flotante Conmutable (Left/Right) con Ahorro de Eje Vertical
- Contexto: En tablets de 10.9" en orientación Landscape (horizontal), la barra superior tradicional de dos filas (Header + Toolbar horizontal) restaba más de 100dp de altura útil de dibujo.
- Decisión: Convertir la barra de herramientas en un dock vertical flotante conmutador de lado izquierdo/derecho mediante un botón rápido `⇄`, persistiendo la preferencia en `user_preferences.json`.
- Rationale Ergonómico:
  * Máximo Espacio Vertical: Se recupera toda la altura vertical para el lienzo de trabajo.
  * Accesibilidad para Zurdos y Diestros: El usuario zurdo puede situar las herramientas en el lateral derecho para evitar toques accidentales con la mano de apoyo mientras dibuja en el centro, y viceversa.