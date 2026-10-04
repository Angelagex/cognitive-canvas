# MASTER SPECIFICATION: COGNITIVE CANVAS (AURA MIND)
Compilador Semántico y Motor de Aprendizaje de Alto Orden para Tinta Digital

================================================================================
1. FUNDAMENTOS Y MISIÓN DEL SISTEMA
================================================================================

1.1 Misión
Cognitive Canvas es un entorno de toma de notas visuales a mano alzada y compilación cognitiva. Transforma el acto físico de dibujar mapas mentales en un grafo semántico estructurado y ejecutable en memoria a largo plazo, combatiendo el conocimiento inerte y la sobrememorización superficial.

1.2 Marco Teórico de Aprendizaje
El sistema se rige estrictamente por dos pilares de la ciencia del aprendizaje:

A. Metodología del Dr. Justin Sung (iCanStudy):
- Mapeo Relacional Espejo (Mirror Mapping): Representación externa de esquemas mentales internos, superando la estructura de árbol rígida y jerárquica de Tony Buzan.
- Método GRINDE:
  * G (Grouped): Agrupado lógicamente por afinidad semántica y no por orden secuencial de clase/libro.
  * R (Reflective): Elaborado con palabras, síntesis y analogías propias.
  * I (Interconnected): Alta densidad de conexiones transversales entre ramas distantes.
  * N (Non-verbal): Uso deliberado de iconos, diagramas y metáforas gráficas abstractas.
  * D (Directional): Flechas que indican mecanismos causales y verbos explícitos (inhibe, amplifica, compensa).
  * E (Emphasized): Jerarquía visual clara (diferenciación por escala, color y peso de trazo).
- Taxonomía PACER: Clasificación estricta de cada elemento en Procedural, Analogous, Conceptual, Evidence o Reference.
- Regla Anti-Sobrecarga Mnémica: Prohibido memorizar principios abstractos o conceptos aislados en tarjetas de memoria. Límite estricto de menos de 100 a 150 tarjetas de Anki por semana, reservadas únicamente para datos empíricos y terminología pura no deducible lógicamente.

B. Ciencia Cognitiva del Aprendizaje Complejo:
- Reconciliación Integrativa y Diferenciación Progresiva (Ausubel / Novak): Validación de enlaces cruzados (cross-links) entre ramas semánticas distantes para evitar la fragmentación de esquemas.
- Transferencia de Vía Alta (High-Road Transfer - Perkins & Salomon): Desacoplamiento deliberado de la estructura profunda respecto de los detalles superficiales para aplicar principios en dominios no estructurados.
- Efecto de la Comisión Deliberada de Errores (The Derring Effect - Wong & Lim): Generación y rectificación de premisas conceptualmente erróneas pero plausibles para podar alternativas espurias.
- Invención con Casos Contrastantes (ICC - Schwartz & Chase): Matrices de casos que comparten la misma regla de fondo bajo narrativas distintas para inducir la abstracción de leyes invariantes.


================================================================================
2. ARQUITECTURA TÉCNICA Y STACK TECNOLÓGICO
================================================================================

2.1 Flujo de Información de Extremo a Extremo:
1. El usuario dibuja trazos libres en la tablet con su lápiz táctil a 90 Hz / 120 Hz.
2. La capa nativa procesa la tinta con Front-Buffer Rendering para latencia de 4 a 10 ms.
3. El motor local ejecuta Stroke Clustering en segundo plano y genera el Visual AST.
4. El usuario ancla atributos pasivos a iconos o bocetos mediante el botón lateral del lápiz o dictado de voz.
5. Al pulsar "Compilar Mapa", el cliente renderiza un PNG de alta resolución y lo sube a AWS S3 vía pre-signed URL.
6. El cliente invoca el endpoint POST /compile-map en AWS Lambda enviando el S3 Key y el Visual AST.
7. AWS Lambda envía el payload híbrido a Gemini 2.0 Flash con Structured Outputs (JSON Schema estricto).
8. La respuesta compilada actualiza la capa semántica local y despliega el panel de auditoría GRINDE.
9. Los nodos Evidence y Reference no deducibles se envían opcionalmente a AnkiConnect en localhost:8765.

2.2 Tecnologías del Frontend:
- Plataforma: React Native + Expo con TypeScript.
- Dispositivo Primario: Samsung Galaxy Tab S10 Lite (10.9 pulgadas, 90 Hz, digitalizador Wacom EMR).
- Plataforma Secundaria: iPadOS con Apple Pencil (PencilKit).
- Tinta de Baja Latencia: Módulo nativo (Native UI Component / TurboModule) que puentea:
  * Android: androidx.ink (Jetpack Ink API), androidx.graphics (GLFrontBufferedRenderer) y androidx.input (Motion Prediction).
  * iOS: PencilKit (PKCanvasView).
- Reconocimiento de Escritura Local (Offline): Google Digital Ink Recognition API (ML Kit).
- Reconocimiento de Voz Local: API nativa de voz (Android SpeechRecognizer / iOS Speech Framework).

2.3 Tecnologías del Backend (Serverless AWS con SST Ion / v3):
- Infraestructura como Código: SST con TypeScript.
- Cómputo: AWS Lambda (Node.js/TypeScript) configurada con memoria de 1024 MB y timeout >= 60 segundos.
- Almacenamiento: Bucket AWS S3 para renders visuales temporales.
- Modelo de Inteligencia Artificial: Gemini 2.0 Flash mediante el SDK oficial de Google Gen AI con respuesta forzada por JSON Schema estricto.


================================================================================
3. DISEÑO DE INTERFAZ, DISTRIBUCIÓN ESPACIAL Y HERRAMIENTAS
================================================================================

La interfaz está diseñada para orientación horizontal (Landscape) en pantallas de 10.9 pulgadas:

+------------------------------------------------------------------------------+
| [Bóvedas] [Título del Mapa]                [Deshacer] [Rehacer] | [Compilar] |
+------------------------------------------------------------------------------+
| Barra de Herramientas Estilo Goodnotes (56dp)                                |
| [Pluma] [Resaltador] [Borrador] [Lazo] [Formas] [Atributo Pasivo] [Imagen]   |
| [Láser] [Ventana Zoom]                                                       |
| Paleta Rápida: (Color 1, Color 2, Color 3)  |  Grosores: (Fino, Medio, Grueso|
+------------------------------------------------------------------------------+
|                                                                              |
|                                                                              |
|                        CANVAS INFINITO VECTORIAL                             |
|                    (Pinch-to-zoom 10% a 1000%, Pan)                          |
|                                                                              |
|                                                                              |
+------------------------------------------------------------------------------+
| Barra Inferior Flotante (36dp)                                               |
| [Modo Solo Stylus]  [Fondo: Puntos/Milimetrado/Liso]  [Zoom: 100%] [Centrar] |
+------------------------------------------------------------------------------+

3.1 Componentes Principales:
- Header Superior (48dp):
  * Selector de libretas/bóvedas y título editable del mapa actual.
  * Buscador global de texto manuscrito integrado con OCR local.
  * Botones Deshacer y Rehacer con historial ilimitado.
  * Botón principal de acción: [Compilar Mapa].
- Barra de Herramientas Principal (56dp):
  * Pluma (Pen): Sensible a presión y velocidad con interpolación de curvas Bezier.
  * Resaltador: Tinta translúcida con renderizado estricto detrás de la tinta negra (behind-ink composite).
  * Borrador: Modos por trazo completo (Stroke) o por píxel, con filtro "Borrar solo resaltador".
  * Lazo (Lasso): Selección libre con filtros selectivos (solo texto, solo formas, solo imágenes) para trasladar o redimensionar.
  * Formas: Regularización geométrica automática al mantener quieto el trazo por 400 ms.
  * Atributo Pasivo: Herramienta manual para anclar metadatos.
  * Inserción de Imágenes: Importación multimedia como referencia visual.
  * Paleta Rápida: 3 accesos directos configurables de color y 3 de grosor de trazo.
- Barra Inferior Flotante (36dp):
  * Modo Solo Stylus: Desactiva eventos de un solo dedo para dibujo, garantizando rechazo de palma total a nivel de UI.
  * Selector de fondo: Cuadrícula de puntos (dot-grid), milimetrado o blanco puro.
  * Control y reseteo de zoom con opción de ajuste global (Fit to Screen).

3.2 Herramientas de Flujo de Trabajo Avanzado (Workflow Enhancements):
1. Ventana de Zoom con Auto-Avance (Zoom Window):
   - Área ampliada de escritura en la zona inferior para caligrafía de alta precisión.
   - Rectángulo guía en el canvas global con desplazamiento automático continuo al aproximar el trazo al margen derecho.
2. Puntero Láser Efímero (Laser Pointer Tool):
   - Trazo de alta visibilidad para auto-explicación (repaso Feynman) que se disuelve automáticamente tras 1.5 segundos sin alterar el árbol de trazos.
3. Motor de Capas Básico (Layer Engine):
   - Capa 0 (Inmutable/Referencia): Imágenes y fondos bloqueables inmunes al borrador.
   - Capa 1 (Semántica): Nodos, trazos e iconos vectoriales.
   - Capa 2 (Anotaciones): Resaltadores y marcas temporales de estudio.
4. Búsqueda Indexada de Tinta Manuscrita (In-Canvas Handwriting Search):
   - Barra de búsqueda de texto conectada a la indexación de Digital Ink Recognition local.
   - Centrado dinámico de cámara (auto-pan y zoom) hacia la caja delimitadora de la palabra encontrada.


================================================================================
4. DINÁMICA DE ENTRADA Y CAPTURA DE ATRIBUTOS PASIVOS
================================================================================

Para no interrumpir el flujo de pensamiento durante el dibujo:
1. Gesto de Activación:
   - Mantener presionado el botón lateral físico del S-Pen y tocar un icono o dibujo.
   - O dar doble toque rápido con la punta del stylus sobre la entidad gráfica.
2. Micro-Tooltip Flotante:
   - Aparece pegado al trazo sin tapar el resto del mapa.
   - Opción 1: Tocar el icono de micrófono y dictar por voz en 2 segundos (ej. "Analogía de cuello de botella por saturación de memoria de trabajo").
   - Opción 2: Tocar un chip rápido de clasificación previa (Analogía, Causalidad, Evidencia).
3. Affordance Pasiva y Air View (Hover):
   - El nodo muestra un punto translúcido muy discreto para no sobrecargar visualmente el mapa.
   - Al aproximar la punta del S-Pen a 1 o 2 cm de la pantalla sobre el nodo (Air View), se despliega un globo flotante semitransparente con el texto pasivo. Desaparece de inmediato al alejar el lápiz.


================================================================================
5. SUBSISTEMA DE TINTA DIGITAL (INK PARSING, GESTOS Y PERSISTENCIA)
================================================================================

5.1 Motor Local de Segmentación y Topología (Visual AST):
> *Especificación completa y formalización matemática en: [VISUAL_AST_SPEC.md](file:///home/angel/personal/cognitive-canvas/.antigravity/docs/VISUAL_AST_SPEC.md)*

Antes de llamar a la IA, el motor local organiza los trazos en un árbol sintáctico determinista y de alto rendimiento:
1. Clasificación de trazos: Discrimina texto manuscrito, conectores lineales (rectos, curvos Bézier, ortogonales en codo), puntas de flecha, tapas inhibitorias en T ($\bot$), contenedores cerrados y gestos de tachado (*scratch-out*).
2. Agrupamiento Adaptativo por Línea Base (Adaptive Stroke Clustering):
   - Elimina la fractura por pausas temporales (> 600 ms) usando Componentes Conexas (BFS) con escala dinámica $\tilde{H} = \max(14, \min(h_A, h_B))$.
   - Umbrales dinámicos: $\Delta x_{\max} = \max(24, \min(65, 1.25 \tilde{H}))$, $\Delta y_{\max} = \max(16, 0.85 \tilde{H})$.
   - Absorción automática de trazos retardados (*delayed strokes*: cruces de `t`, diacríticos, tildes, puntos sobre la `i`).
   - Poda en tiempo de AST de entidades tachadas por gestos en zigzag horizontal (*scratch-out*).
3. Formas compuestas y Conectores Avanzados:
   - Asignación de puntas de flecha (`ARROW_HEAD`) por proximidad a extremos de tallos rectos, curvos u ortogonales.
   - Conectores dirigidos (`FORWARD`), bidireccionales (`BIDIRECTIONAL`) e inhibitorios (`INHIBITION`, tapa perpendicular en T).
   - Ensamblado de contenedores multi-trazo (3 a 6 líneas rectas formando un ciclo poligonal cerrado sin levantar el lápiz).
4. Topología Espacial y Bucles Causales:
   - Contención Jerárquica: Si los límites de un nodo o palabra están dentro de un `CONTAINER_BOX`, se asigna a `child_ids`.
   - Detección de Ciclos Causales (`causal_loops`): Encuentra y normaliza bucles de retroalimentación dirigidos ($A \to B \to C \to A$) para modelos de sistemas y mapas conceptuales de Novak.
   - Métricas de Red (`topology_metrics`): Identifica premisas generadoras raíz (in-degree 0), conclusiones terminales (out-degree 0) y densidad de enlaces cruzados (*cross-links*).
5. Docking Magnético y Etiquetas Relacionales:
   - Los extremos de los conectores se acoplan al borde del bounding box de los nodos más cercanos (distancia <= 100 px).
   - El texto manuscrito adyacente al punto medio del tallo se enlaza como etiqueta de relación (ej. "inhibe", "restringe a").

5.2 Reconocimiento de Gestos Dinámicos con Stylus (Ink Gestures):
El motor nativo intercepta patrones gestuales en tiempo real antes de persistir los trazos:
1. Gesto de Borrado (Scratch-out): Un patrón en zigzag horizontal rápido de alta frecuencia (mínimo 3 oscilaciones en un área delimitada) sobre cualquier entidad o palabra elimina automáticamente los trazos subyacentes sin necesidad de conmutar al borrador.
2. Gesto de Selección (Draw-to-Lasso): Trazar un lazo cerrado alrededor de un conjunto de trazos activa la selección flotante para traslación o reescalado inmediato.
3. Gesto de Inserción de Espacio (Canvas Break): Trazar una línea recta y mantener un instante hacia abajo o a la derecha desplaza los clústeres adyacentes para abrir espacio en el lienzo sin romper la topología del grafo.
4. Auto-Snapping Geométrico: Mantener quieta la punta del S-Pen durante 400 ms al finalizar cualquier figura abierta o cerrada la regulariza en una primitiva vectorial perfecta (recta, elipse, rectángulo o flecha dirigida).

5.3 Formato de Persistencia Local (.cmn / JSON):
Cada mapa mental se guarda localmente en un archivo estructurado en tres capas independientes:

{
  "map_id": "map_neurocognicion_01",
  "version": "1.0.0",
  "metadata": {
    "title": "Arquitectura de Memoria de Trabajo",
    "created_at": 1727989200000,
    "updated_at": 1727992800000
  },
  "raw_ink_layer": {
    "strokes": [
      {
        "id": "strk_01",
        "points": [
          { "x": 120.5, "y": 340.2, "p": 0.6, "t": 12 },
          { "x": 125.0, "y": 342.1, "p": 0.8, "t": 24 }
        ],
        "color": "#1E1E1E",
        "width": 2.5
      }
    ]
  },
  "visual_ast_layer": {
    "entities": [
      {
        "id": "entity_01",
        "type": "TEXT_BLOCK",
        "transcribed_text": "Working Memory",
        "stroke_ids": ["strk_01"],
        "bbox": { "ymin": 330, "xmin": 110, "ymax": 380, "xmax": 260 },
        "passive_context": null
      },
      {
        "id": "entity_02",
        "type": "SKETCH_ICON",
        "transcribed_text": "Icono de embudo",
        "stroke_ids": ["strk_02", "strk_03"],
        "bbox": { "ymin": 320, "xmin": 340, "ymax": 400, "xmax": 420 },
        "passive_context": "Cuello de botella por saturación atencional"
      }
    ],
    "connectors": [
      {
        "id": "conn_01",
        "type": "ARROW",
        "stroke_ids": ["strk_04"],
        "source_entity_id": "entity_01",
        "target_entity_id": "entity_02",
        "directionality": "FORWARD",
        "label": "restringe a"
      }
    ]
  },
  "compiled_cognitive_layer": null
}


================================================================================
6. PIPELINE DE COMPILACIÓN COGNITIVA (PAYLOAD HÍBRIDO)
================================================================================

Al presionar [Compilar Mapa], el cliente ejecuta:
1. Renderizado en memoria del canvas a PNG de alta resolución.
2. Subida directa del PNG a un bucket S3 mediante URL pre-firmada.
3. Llamada al endpoint POST /compile-map enviando el s3_image_key y el JSON del visual_ast_layer.
4. La Lambda de SST invoca la API de Gemini 2.0 Flash con el System Prompt y el JSON Schema estricto.
5. El resultado compila el grafo cognitivo y lo guarda en compiled_cognitive_layer, desplegando el Drawer lateral en la tablet.


================================================================================
7. SYSTEM PROMPT DE PRODUCCIÓN PARA GEMINI 2.0 FLASH
================================================================================

A continuación se define la instrucción exacta que el backend enviará al modelo:

Eres un evaluador neurocognitivo experto y compilador semántico basado en la Ciencia Cognitiva del Aprendizaje Complejo (Ausubel, Novak, Perkins & Salomon, Schwartz, Bjork) y la metodología de aprendizaje profundo del Dr. Justin Sung (iCanStudy).

Tu misión es transformar una imagen de un mapa mental manuscrito no lineal y un diccionario de metadatos pasivos / Visual AST en un grafo semántico estructurado, auditar la calidad del proceso de codificación (encoding) y generar intervenciones de recuperación activa (retrieval) de alto orden.

Recibirás dos entradas:
1. IMAGEN DEL LIENZO: Render visual del mapa mental con trazos, flechas, palabras clave manuscritas, cajas y metáforas visuales/iconos.
2. DICCIONARIO TOPOLÓGICO Y METADATOS PASIVOS (Visual AST): Lista de entidades segmentadas por el parser local, incluyendo cajas delimitadoras, texto transcrito preliminarmente y atributos pasivos ingresados por el usuario para clarificar analogías y símbolos.

Debes responder EXCLUSIVAMENTE con un objeto JSON válido que cumpla estrictamente con el JSON Schema proporcionado. No incluyas preámbulos, explicaciones en texto plano ni bloques de código markdown fuera del JSON estructurado.

REGLAS DE EJECUCIÓN Y DIRECTRICES TAXONÓMICAS:

1. EXTRACCIÓN Y ALINEACIÓN DE ENTIDADES
- Valida y complementa las entidades provistas en el Visual AST contra la imagen visual.
- Asigna coordenadas normalizadas [0-1000] en visual_bounding_box para cada nodo.
- Si una entidad es un icono o dibujo gráfico, sintetiza la descripción visual objetiva con el passive_context aportado por el usuario.

2. CLASIFICACIÓN ESTRICTA PACER (Framework Dr. Justin Sung)
Clasifica cada nodo en EXACTAMENTE una de las siguientes 5 categorías:
- PROCEDURAL: Pasos de acción secuenciales, algoritmos, metodologías o flujos de trabajo.
- ANALOGOUS: Metáforas, alegorías o isomorfismos estructurales que conectan el concepto con dominios conocidos.
- CONCEPTUAL: Principios rectores, modelos abstractos, mecanismos causales y el fundamento de "por qué funciona".
- EVIDENCE: Datos empíricos específicos, estudios científicos, experimentos, métricas numéricas o fórmulas matemáticas.
- REFERENCE: Terminología específica, nombres propios, definiciones unívocas, fechas o sintaxis pura.

3. FILTRO DE DEDUCCIÓN LÓGICA Y ANKI FLASHCARDS (Regla Crítica Anti-Sobrecarga)
Para evitar la saturación de memoria y el conocimiento inerte:
- Evalúa el atributo booleano deducible_from_context: Un nodo es true si su contenido puede inferirse lógicamente a partir de los nodos CONCEPTUAL o PROCEDURAL presentes en el mapa. Es false si es un dato arbitrario, métrica, constante o término que DEBE memorizarse porque no se puede deducir.
- REGLA DE ORO DE ANKI: Genera anki_flashcards ÚNICAMENTE para nodos clasificados como EVIDENCE o REFERENCE que tengan deducible_from_context = false.
- PROHIBIDO generar tarjetas de Anki para nodos CONCEPTUAL, ANALOGOUS o PROCEDURAL.
- Estructura las tarjetas para AnkiConnect con campos claros:
  * BASIC: Pregunta concisa y directa en el front; respuesta precisa y anclada en el back.
  * CLOZE: Oración contextual con la terminología o dato crítico entre dobles llaves: {{c1::dato}}.

4. AUDITORÍA RELACIONAL GRINDE (Detección de Pensamiento Lineal)
Evalúa la calidad del modelo mental en grinde_audit:
- Detecta todas las flechas y conectores dirigidos. Etiqueta el verbo conector (label) y clasifica su naturaleza causal o jerárquica.
- is_cross_link: Marca como true ÚNICAMENTE los enlaces que conectan dos ramas conceptualmente distantes del mapa (evidencia de Reconciliación Integrativa). Si una flecha solo conecta un nodo padre con su hijo inmediato dentro de la misma rama, es false.
- cross_link_density_score: Calcula el ratio: (Número de cross-links) / (Total de edges).
- linear_thinking_risk: Marca como true si el mapa presenta una estructura puramente arborescente (tipo Buzan/resumen lineal) con baja densidad de enlaces cruzados (< 0.20) o ausencia de relaciones causales bidireccionales.
- feedback_critique: Formula una crítica pedagógica constructiva señalando dónde faltan conexiones causales o dónde se recurrió a viñetas lineales disfrazadas.

5. MÓDULO DE INTERVENCIONES DE ALTO ORDEN
Genera desafíos cognitivos basados en la ciencia del aprendizaje:
- high_road_transfer_prompts: Selecciona al menos un nodo CONCEPTUAL o ANALOGOUS nuclear y formula un escenario desestructurado en un dominio completamente disímil pero estructuralmente isomorfo, forzando la abstracción consciente de la regla profunda.
- derring_effect_challenges: Diseña un escenario con un error conceptual intencionado, plausible pero sutil, basado en alterar la relación entre dos nodos del mapa. Exige al aprendiz identificar la anomalía y restaurar la solución canónica.
- contrasting_cases_icc: Diseña una matriz de dos casos contrastantes (Caso A vs. Caso B) que compartan el mismo principio causal subyacente pero difieran en rasgos superficiales, pidiendo al usuario inducir la regla invariante común.


================================================================================
8. ESQUEMA FORMAL DE RESPUESTA (JSON SCHEMA)
================================================================================

{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "CompiledCognitiveMap",
  "type": "object",
  "properties": {
    "map_metadata": {
      "type": "object",
      "properties": {
        "title": { "type": "string" },
        "domain_theme": { "type": "string" },
        "total_nodes": { "type": "integer" },
        "total_edges": { "type": "integer" }
      },
      "required": ["title", "domain_theme", "total_nodes", "total_edges"]
    },
    "nodes": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "visual_bounding_box": {
            "type": "object",
            "properties": {
              "ymin": { "type": "number" },
              "xmin": { "type": "number" },
              "ymax": { "type": "number" },
              "xmax": { "type": "number" }
            },
            "required": ["ymin", "xmin", "ymax", "xmax"]
          },
          "detected_content": { "type": "string" },
          "passive_context": { "type": "string" },
          "pacer_classification": {
            "type": "string",
            "enum": ["PROCEDURAL", "ANALOGOUS", "CONCEPTUAL", "EVIDENCE", "REFERENCE"]
          },
          "grinde_traits": {
            "type": "array",
            "items": {
              "type": "string",
              "enum": ["GROUPED", "REFLECTIVE", "INTERCONNECTED", "NON_VERBAL", "DIRECTIONAL", "EMPHASIZED"]
            }
          },
          "deducible_from_context": { "type": "boolean" }
        },
        "required": [
          "id",
          "visual_bounding_box",
          "detected_content",
          "pacer_classification",
          "deducible_from_context"
        ]
      }
    },
    "edges": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "source_node_id": { "type": "string" },
          "target_node_id": { "type": "string" },
          "label": { "type": "string" },
          "is_cross_link": { "type": "boolean" },
          "relation_nature": {
            "type": "string",
            "enum": [
              "CAUSAL",
              "CONDITIONAL",
              "HIERARCHICAL",
              "OPPOSITION_CONTRAST",
              "ANALOGICAL_ISOMORPHISM",
              "EVIDENTIAL_SUPPORT"
            ]
          }
        },
        "required": [
          "source_node_id",
          "target_node_id",
          "label",
          "is_cross_link",
          "relation_nature"
        ]
      }
    },
    "grinde_audit": {
      "type": "object",
      "properties": {
        "cross_link_density_score": { "type": "number" },
        "non_verbal_balance_score": { "type": "number" },
        "linear_thinking_risk": { "type": "boolean" },
        "feedback_critique": { "type": "string" }
      },
      "required": [
        "cross_link_density_score",
        "non_verbal_balance_score",
        "linear_thinking_risk",
        "feedback_critique"
      ]
    },
    "learning_engine_outputs": {
      "type": "object",
      "properties": {
        "anki_flashcards": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "source_node_id": { "type": "string" },
              "card_type": { "type": "string", "enum": ["BASIC", "CLOZE"] },
              "front": { "type": "string" },
              "back": { "type": "string" }
            },
            "required": ["source_node_id", "card_type", "front", "back"]
          }
        },
        "high_road_transfer_prompts": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "core_concept_ids": { "type": "array", "items": { "type": "string" } },
              "unstructured_scenario": { "type": "string" },
              "guiding_question": { "type": "string" }
            },
            "required": ["core_concept_ids", "unstructured_scenario", "guiding_question"]
          }
        },
        "derring_effect_challenges": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "flawed_premise": { "type": "string" },
              "corrective_task": { "type": "string" },
              "canonical_solution": { "type": "string" }
            },
            "required": ["flawed_premise", "corrective_task", "canonical_solution"]
          }
        },
        "contrasting_cases_icc": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "case_a": { "type": "string" },
              "case_b": { "type": "string" },
              "invariant_discovery_prompt": { "type": "string" }
            },
            "required": ["case_a", "case_b", "invariant_discovery_prompt"]
          }
        }
      },
      "required": [
        "anki_flashcards",
        "high_road_transfer_prompts",
        "derring_effect_challenges",
        "contrasting_cases_icc"
      ]
    }
  },
  "required": [
    "map_metadata",
    "nodes",
    "edges",
    "grinde_audit",
    "learning_engine_outputs"
  ]
}


================================================================================
9. PANEL LATERAL DE RESULTADOS (DRAWER TRAS COMPILACIÓN)
================================================================================

Al recibir el grafo compilado desde AWS Lambda, la app despliega un Drawer lateral derecho de 380dp con 3 pestañas:

1. Pestaña 1 (Auditoría GRINDE):
   - Semáforo de pensamiento lineal (alerta visual si linear_thinking_risk es true).
   - Indicador numérico de densidad de enlaces cruzados (cross-links).
   - Caja de retroalimentación pedagógica formulada por la IA para mejorar el modelo mental.

2. Pestaña 2 (Taxonomía PACER):
   - Código de colores visual aplicado sobre los nodos del mapa:
     * Azul: Conceptual (C)
     * Verde: Procedimental (P)
     * Púrpura: Analógico (A)
     * Naranja: Evidencia (E)
     * Gris: Referencial (R)
   - Filtros interactivos para resaltar u ocultar tipos de conocimiento en el lienzo.

3. Pestaña 3 (Práctica y Sincronización):
   - Contador de flashcards generadas con alerta si excede el límite saludable semanal.
   - Botón interactivo "Sincronizar con Anki" (llamada directa vía JSON-RPC a AnkiConnect).
   - Tarjetas interactivas para responder los desafíos de Transferencia de Vía Alta, Comisión de Errores (Derring Effect) y Casos Contrastantes (ICC).