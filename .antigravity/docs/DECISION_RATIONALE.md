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