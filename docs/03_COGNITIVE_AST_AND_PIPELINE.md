# 03. Pipeline Cognitivo, Visual AST y Compilación Macro

## 1. Marco Teórico de Aprendizaje

Cognitive Canvas no es una aplicación de toma de notas pasiva ni un lienzo de dibujo convencional; es un entorno de trabajo para el **desarrollo de esquemas de pensamiento de alto orden**.

```
    Lineal / Pasivo (Tradicional)               Red No-Lineal (Cognitive Canvas)
    ─────────────────────────────               ────────────────────────────────
    Árbol jerárquico rígido                     Red emergente de macro-islas
    Listas y viñetas ordenadas                  Conexiones multidireccionales
    Memorización de definiciones                Atributos causales y analogías
    Sobrecarga de flashcards Anki               Síntesis activa y retención deducible
```

### 1.1 Metodología de Justin Sung (iCanStudy / Mirror Mapping)

El motor implementa las bases científicas del aprendizaje de orden superior formuladas por el Dr. Justin Sung:
1. **Superación del Modelo Jerárquico:** El aprendizaje profundo no ocurre en esquemas ramificados descendentes (tipo índice de libro), sino mediante la construcción de **redes no lineales (Mirror Maps)** que reflejan la interconexión conceptual del dominio de estudio.
2. **Síntesis Activa sobre Recolección Pasiva:** Cada concepto plasmado en el lienzo debe relacionarse activamente con al menos otros dos nodos mediante mecanismos de causa-efecto, contrastes o analogías funcionales.

### 1.2 Principios GRINDE y Taxonomía PACER

Para clasificar y estructurar el conocimiento, el sistema evalúa el mapa bajo las dimensiones **GRINDE**:
* **G** (Grouping): Densidad y cohesión de macro-islas temáticas.
* **R** (Reflective): Capacidad de auto-cuestionamiento y justificación de enlaces.
* **I** (Interconnected): Número y validez de puentes entre macro-islas distintas.
* **N** (Non-linear): Topología de red que evita secuencias lineales unidireccionales.
* **D** (Distinct): Diferenciación clara entre hechos superficiales y principios nucleares.
* **E** (Effortful): Demanda cognitiva en la estructuración visual.

La taxonomía funcional **PACER** categoriza los componentes del mapa en:
* **Procedural:** Pasos algorítmicos o flujos de ejecución técnica.
* **Analogous:** Metáforas y modelos mentales que anclan conceptos abstractos en dominios intuitivos.
* **Conceptual (Mecanismo Causal):** Principios funcionales que explican *por qué* y *cómo* ocurre un fenómeno.
* **Evidence:** Datos empíricos, experimentos, fuentes y fórmulas que respaldan la hipótesis.
* **Reference:** Terminología, referencias y glosario de soporte.

### 1.3 Regla Estricta Anti-Sobrecarga de Anki

Uno de los errores más comunes en la preparación académica es convertir cada línea de texto en una flashcard de repetición espaciada, generando colapso de revisión (Anki Hell).

Cognitive Canvas aplica una regla estricta:
* **Límite Semanal Acotado:** Solo se pueden generar flashcards de alto impacto a partir de un mapa completado.
* **Prohibición de Memorización Deducible:** Si un hecho o fórmula puede deducirse directamente a partir de un **Mecanismo Causal** o una **Analogía** anclada en el mapa, el sistema prohíbe crear una tarjeta de memorización memorística, forzando la recuperación por deducción activa.

---

## 2. Pipeline Híbrido de Comprensión (Local + Nube)

Para ofrecer interactividad a latencia cero y simultáneamente razonamiento profundo de nivel doctoral, el sistema implementa un pipeline dividido en dos etapas:

```
               Trazo Stylus
                    │
                    ▼
       ┌─────────────────────────┐
       │   SpatialHashGrid (O1)  │
       └────────────┬────────────┘
                    │
        Clustering Pasivo / Selección
                    │
                    ▼
       ┌─────────────────────────┐
       │ ML Kit Digital Ink OCR  │ (Corrutina Local Offline, Escala 160 dp)
       └────────────┬────────────┘
                    │
               Visual AST
                    │
                    ▼
       ┌─────────────────────────┐
       │      Atributos UI       │ (Under-Glow + Insignias Ancladas)
       └────────────┬────────────┘
                    │
           Compilación Macro
                    ▼
       ┌─────────────────────────┐
       │   Gemini 2.5 Flash/Pro  │ (Cloud Async via AWS S3 / Lambda)
       └────────────┬────────────┘
                    │
                    ▼
       ┌─────────────────────────┐
       │      Ghost Overlay      │ (HUD Interactivo en Tiempo Real)
       └─────────────────────────┘
```

### 2.1 Rol de ML Kit Digital Ink Recognition en Kotlin

* **Inferencia Offline en Hilo de Fondo:** Al completarse una palabra o selección, `JetpackInkView` transfiere los trazos a un despachador de corrutinas (`Dispatchers.Default`).
* **Escala Canónica Isotrópica (160 dp):** Para evitar que el reconocimiento falle si el usuario escribe con un zoom de $300\%$ o $40\%$, los trazos se normalizan a un lienzo virtual isotrópico de $160 \text{ dp}$ de altura antes de alimentarse al reconocedor de ML Kit.
* **Sin Bloqueo del Hilo de Renderizado:** El OCR opera de forma completamente asíncrona; el trazo de tinta nunca espera el resultado de la transcripción para estar visible en pantalla.

### 2.2 Modelo de Atribución Híbrido (Precedencia Semántica)

1. **Clustering Pasivo:** Algoritmo local de agrupación por proximidad espacial ($45 \text{ dp}$ adaptativo) que sugiere agrupaciones preliminares de trazos contiguos.
2. **Selección Explícita (Máxima Precedencia):**
   - Cuando el usuario encierra una región con el **Lazo** o realiza un **Finger Tap** sobre una palabra/diagrama, esa acción tiene precedencia jerárquica total sobre el clustering pasivo o los saltos de línea de ML Kit.
   - La selección sella el clúster como una entidad atómica única dentro del Visual AST.

### 2.3 Semántica de Conectores y Aristas Bidireccionales (`visual_ast_layer.connectors`)

Tradicionalmente, las herramientas de diagramación se limitan a flechas dirigidas unidireccionales ($A \longrightarrow B$), induciendo al estudiante a pensar en cadenas lineales de causa única. Sin embargo, en la metodología de Justin Sung y los principios GRINDE, los conceptos avanzados operan en redes de **influencia recíproca y bucles de retroalimentación (Feedback Loops)**.

El Visual AST formaliza tres tipos de aristas en `visual_ast_layer.connectors`:
1. `DIRECTED_CAUSAL` ($\longrightarrow$): Flujo causa-efecto unidireccional estándar.
2. `ASSOCIATIVE_LINK` (—): Relación de proximidad conceptual sin jerarquía causal.
3. `BIDIRECTIONAL_RELATION` ($\longleftrightarrow$): Relación de influencia mutua, acoplamiento dinámico o bucle de retroalimentación (positivo/reforzador o negativo/homeostático).

```json
{
  "id": "conn_01_bidi",
  "type": "BIDIRECTIONAL_RELATION",
  "source_entity_id": "ent_tilacoide",
  "target_entity_id": "ent_estroma_atp",
  "curvature": "ARC_QUADRATIC",
  "semantic_role": "FEEDBACK_LOOP",
  "stroke_id": "stroke_arrow_bidi_98"
}
```

* **Impacto en el Diagnóstico GRINDE:**
  - La presencia de aristas `BIDIRECTIONAL_RELATION` es una señal de alta ponderación para la dimensión **N** (Non-linear) y **I** (Interconnected).
  - Habilita al evaluador de Gemini a identificar cuándo un estudiante comprende la cibernética del sistema (ej. cómo el gradiente de protones y la síntesis de ATP se modulan recíprocamente) frente a una mera memorización de pasos secuenciales.

---

## 3. Feedback Visual de Atributos Cognitivos

En lugar de recuadros o marcos invasivos que ensucian el mapa, Cognitive Canvas utiliza un sistema sutil de dos capas visuales:

### 3.1 Under-Glow Shading (Cápsulas Difusas de Fondo)

Se proyectan cápsulas redondeadas y suaves detrás de los trazos (`PlacedAttributeBadges.tsx`), permitiendo distinguir de un vistazo la tipología del conocimiento sin interferir con la legibilidad:

* **Mecanismo Causal (`CAUSAL_MECHANISM`):**
  - Resplandor azul profundo: `rgba(56, 189, 248, 0.12)`.
  - Borde sutil delimitador: `rgba(56, 189, 248, 0.35)`.
* **Analogía Cognitiva (`ANALOGY`):**
  - Resplandor púrpura místico: `rgba(168, 85, 247, 0.12)`.
  - Borde sutil delimitador: `rgba(168, 85, 247, 0.35)`.
* **Evidencia Empírica (`EVIDENCE`):**
  - Resplandor ámbar / oro: `rgba(251, 191, 36, 0.12)`.
  - Borde sutil delimitador: `rgba(251, 191, 36, 0.35)`.

### 3.2 Micro-Insignias Ancladas

En la esquina superior derecha de cada entidad delimitada se sitúa un pin interactivo compacto ($20 \text{ dp}$):
* Icono identificador: `⚙️` para Mecanismo, `💡` para Analogía, `📊` para Evidencia.
* Al pulsar o interactuar vía S-Pen Air View Hover, se despliega la nota conceptual y notas de voz asociadas (`Verbal Retrieval`), permitiendo una revisión rápida durante la sesión de estudio.

### 3.3 Contraste y Separación Estricta entre Color de Tinta y Semántica del AST

Una limitación habitual en aplicaciones de notas convencionales es sobrecargar el color del lápiz con significado semántico (e.g. "rojo es importante, azul es mecanismo, verde es ejemplo"). Este esquema resulta frágil:
- Si el usuario cambia el papel a fondo oscuro, el azul oscuro o negro se vuelve ilegible o invisible.
- El estudiante agota energía cognitiva eligiendo colores de trazo en lugar de sintetizar relaciones.

Cognitive Canvas implementa una **separación ortogonal estricta**:
1. **El Color del Trazo (`stroke.color`) se subordina exclusivamente al Contraste Ergonómico:**
   - Las paletas de colores persisten independientemente por tema de papel (`theme_palettes` en `user_preferences.json`).
   - Cada preset de fondo (`dark_slate`, `charcoal_dark`, `warm_ivory`, `pure_white`) ofrece únicamente tintas calibradas con ratios de contraste WCAG AAA para garantizar legibilidad prolongada y descanso visual.
2. **La Semántica Cognitiva reside en el Visual AST (`visual_ast_layer.attributes`):**
   - El rol funcional de un nodo (Mecanismo Causal, Analogía, Evidencia) se asigna a través de la taxonomía PACER y se manifiesta mediante los **Under-Glow Shaders** difusos y las **Micro-Insignias** ancladas.
   - Un concepto atribuido como `CAUSAL_MECHANISM` conservará su resplandor azul característico y su insignia `⚙️` independientemente de si el trazo de tinta original fue dibujado en blanco hueso, tiza suave o negro pizarra.
3. **Resiliencia de Conmutación de Tema:**
   El estudiante puede alternar libremente entre modo nocturno y diurno en cualquier momento sin comprometer la legibilidad del texto ni distorsionar la evaluación semántica de su mapa mental.

---

## 4. Pipeline de Compilación Asíncrono y Gemini 3.8 Flash

Cuando el estudiante concluye una fase de construcción del mapa, solicita una **Compilación Cognitiva**. Para superar el límite no configurable de 30 segundos de integración en AWS API Gateway HTTP API ante inferencias multimodales complejas, el pipeline opera de forma completamente desacoplada y asíncrona:

### 4.1 Exportación Optimizada Fuera de Pantalla (`OffscreenDocumentRenderer.kt`)

* **Escalado Acotado (Max Edge 1536 px):** La totalidad de los trazos del documento se proyecta en un buffer fuera de pantalla con su arista mayor acotada a $1536 \text{ px}$ y compresión JPEG al $85\%$. Esto reduce drásticamente el consumo de tokens visuales y la latencia de subida sin sacrificar legibilidad.
* **Invariante de Mapeo de Coordenadas:** Se preservan con exactitud las cotas canónicas en World DP (`renderedRect: { minX, minY, maxX, maxY }`), asegurando un mapeo afín 1:1 estricto entre el espacio visual proyectado y las coordenadas reales de tinta en el cliente.

### 4.2 Arquitectura de Trabajos Asíncronos (Queue & Polling)

```
 Cliente (App Expo)             API Gateway                Worker Lambda              DynamoDB / S3
      │                              │                          │                           │
      │── 1. POST /compile ─────────▶│                          │                           │
      │   (Payload + Audio Memo)     │── 2. Invoke Async ──────▶│                           │
      │                              │   (202 Accepted)         │── 3. PutJob(status=RUN) ─▶│
      │◀── 202 Accepted + jobId ─────│                          │                           │
      │                                                         │── 4. Gemini 3.8 Flash ───▶│ (Inferencia)
      │── 5. GET /compile/status/id ─▶                          │   (Timeout: 120s)         │
      │   (Polling cada 2s)          │                          │                           │
      │                              │                          │── 6. PutJob(status=DONE) ─▶│ (Resultado JSON)
      │── 7. GET /compile/status/id ─▶│                          │                           │
      │◀── 200 OK + Graph Payload ───│                          │                           │
```

1. **Ingreso Inmediato (`POST /compile`):** El cliente envía la imagen compilada y la justificación razonada (texto o audio). El endpoint registra el registro del job en DynamoDB (`status: "RUNNING"`), despierta al worker en segundo plano mediante invocación asíncrona (`InvocationType: "Event"`) y responde en menos de $400 \text{ ms}$ con `202 Accepted` y el `jobId`.
2. **Worker Lambda Extendido (120 s):** Ejecuta la inferencia de razonamiento profundo con Google Gemini 3.8 Flash, con un timeout configurado de $120 \text{ segundos}$, liberando la ejecución de la barrera de los $30 \text{ s}$ de API Gateway.
3. **Persistencia y Polling Liviano:** Al completar la inferencia, el worker almacena el resultado estructurado en DynamoDB (`status: "COMPLETED"`, `result: compiled_graph_payload`). El cliente sondea `GET /compile/status/{jobId}` cada $2 \text{ segundos}$ hasta recibir el estado terminal.

---

## 5. Ontología de la Matriz de Conocimiento (Knowledge Matrix DAG)

La compilación cognitiva no se limita a un resumen plano; sintetiza una estructura DAG profunda que clasifica los componentes del dominio en tres niveles de abstracción:

### 5.1 Niveles de Abstracción Ontológica (Tiers)
* **Tier 2 - Sistemas y Arquitectura Macro ($Y \in [0, 240]$):**
  Orquestadores, subsistemas globales y componentes de orden superior (ej. Node.js Event Loop, Motor V8, Runtime de Red).
* **Tier 1 - Mecanismos Causales y Algoritmos ($Y \in [270, 530]$):**
  Estructuras intermedias, canales de comunicación y tuberías de ejecución (ej. Call Stack, Libuv Thread Pool, Microtask Queue).
* **Tier 0 - Primitivas, Hardware y Estructuras Fundamentales ($Y \in [560, 820]$):**
  Llamadas al sistema, operaciones atómicas de memoria, timers del kernel y abstracciones de bajo nivel (ej. `epoll`/`kqueue`, Registros CPU, Descriptores de Archivo).

### 5.2 Estructura de Auditoría por Nodo: Invariante, Fragilidad y Tradeoff
Cada nodo card generado en la pestaña de arquitectura contiene tres contratos analíticos indispensables:
1. **`invariant` (Contrato No Negociable):** La regla fundamental o axioma operacional del componente que jamás debe violarse.
2. **`fragility` (Modo de Falla / Cuello de Botella):** El escenario exacto bajo el cual el mecanismo colapsa, satura memoria o entra en condición de carrera.
3. **`tradeoff` (Compromiso Arquitectónico):** Qué sacrificio explícito de diseño se realizó (ej. concurrencia monohilo simple vs. incapacidad de paralelizar cálculos intensivos en CPU).

### 5.3 Auras Ambientales y Trazado de Prerrequisitos
* **Auras Radiales por Clúster de Dominio:** Los nodos pertenecientes a un mismo dominio funcional (ej. V8, Asincronía, Seguridad) calculan su centro de gravedad $(cx, cy)$ y proyectan una tenue aura radial translúcida (opacidad $0.12 - 0.18$), erradicando divisiones artificiales de columnas rectangulares.
* **Trazado de Prerrequisitos (DAG Tracing):** Al seleccionar un nodo, el visor resalta su linaje causal: todos los nodos predecesores necesarios para comprenderlo (`prerequisites`) y los nodos dependientes de orden superior.
