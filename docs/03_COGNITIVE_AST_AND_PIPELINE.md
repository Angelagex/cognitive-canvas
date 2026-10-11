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

---

## 4. Compilación Macro con Gemini

Cuando el estudiante concluye una fase de construcción del mapa, solicita una **Compilación Cognitiva**:

### 4.1 Exportación de Alta Resolución Fuera de Pantalla

El método nativo `exportHighResPng` renderiza la totalidad de los trazos del lienzo (independientemente del viewport actual del usuario) en un bitmap fuera de pantalla de $2048 \times 2048 \text{ px}$ con fondo transparente o sólido. Este archivo se transmite directamente a Amazon S3 mediante una URL prefirmada.

### 4.2 Prompt del Evaluador Macro y Diagnóstico de Madurez

El backend serverless en AWS invoca a Google Gemini con un prompt multimodal estricto que analiza la imagen renderizada y el Visual AST, respondiendo bajo un esquema JSON rígido:

```json
{
  "maturity_level": 3,
  "macro_islands": [
    {
      "id": "island_fotosistemas",
      "label": "Complejos de Captación de Luz",
      "bbox": { "xmin": 100, "ymin": 150, "xmax": 450, "ymax": 520 },
      "concept_density": "HIGH"
    }
  ],
  "linear_thinking_risk": "LOW",
  "isolated_islands": [],
  "cognitive_interventions": [
    {
      "type": "CROSS_ISLAND_QUESTION",
      "prompt": "¿Qué ocurriría con la fijación de carbono en el Estroma si se inhibe la Plastocianina en el Tilacoide?",
      "target_islands": ["island_fotosistemas", "island_ciclo_calvin"]
    },
    {
      "type": "HIGH_ROAD_TRANSFER",
      "prompt": "¿Cómo se asemeja este gradiente de protones a una presa hidroeléctrica en términos de energía potencial y disipación entrópica?"
    }
  ]
}
```

#### Escala de Madurez (Niveles 1 al 4)
* **Nivel 1 (Listado Fragmentado):** Nodos dispersos, sin conectores claros; alto riesgo de pensamiento lineal.
* **Nivel 2 (Árbol Jerárquico):** Estructura lógica pero unidireccional; falta de enlaces cruzados y analogías.
* **Nivel 3 (Red Emergente):** Múltiples macro-islas bien diferenciadas con conectores de causa-efecto y al menos un atributo causal/análogo.
* **Nivel 4 (Mirror Map Avanzado):** Red densa no lineal; transferencia de alto orden evidente; conceptos interconectados con evidencias y cero redundancia pasiva.

### 4.3 Visualización en Ghost Overlay

Los resultados de la compilación macro regresan al cliente y se proyectan sobre el componente reactivo `GhostOverlay.tsx`:
* **Auras de Macro-Islas:** Polígonos de resplandor suave que delimitan las agrupaciones temáticas detectadas.
* **Puentes Inter-Isla:** Líneas fantasma vectoriales animadas que sugieren conexiones que el estudiante pasó por alto.
* **Invarianza Gráfica:** Toda la proyección de Ghost Overlay se realiza en una capa HUD independiente; los trazos manuscritos del usuario permanecen $100\%$ intactos y no modificados.
