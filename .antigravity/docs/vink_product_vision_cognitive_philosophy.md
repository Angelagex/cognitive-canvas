# Vink: Visión de Producto, Marco Metodológico y Filosofía Cognitiva

## 1. La Tesis Central: "Ink Meets Link"

La mayoría del software educativo y de toma de notas digital comete uno de dos pecados fundamentales:
1. **La ilusión analógica:** Trata la pantalla táctil como un pedazo de papel infinito sin estructura (GoodNotes, Notability). El estudiante dibuja y escribe, pero los conceptos quedan congelados en píxeles o vectores mudos; no hay validación epistémica, no hay relaciones causales computables y el estudiante cae en el repaso pasivo.
2. **La trampa digital/lineal:** Obliga al estudiante a teclear en estructuras de árbol rígidas, listas de viñetas o tarjetas aisladas (Notion, Obsidian, Anki). Esto rompe la cognición espacial y fuerza una jerarquización artificial antes de que el modelo mental haya madurado.

**Vink (Ink + Link)** nace para resolver esta fractura ontológica:
* **Ink (El rastro humano y gestual):** La entrada natural e imperfecta del estudiante (trazos con stylus S-Pen, voz espontánea, garabatos no estructurados). Es el modo de menor fricción para vaciar la memoria de trabajo sin censura cognitiva previa.
* **Link (La causalidad computada):** La transformación semántica de esa tinta en un Grafo Acíclico Dirigido (DAG) causal, estructurado en niveles ontológicos (**Tier 0: Primitives / Sustratos**, **Tier 1: Mechanisms / Causalidad**, **Tier 2: Systems / Macrosistemas**) con categorización PACER (`PROCEDURAL`, `ANALOGOUS`, `CONCEPTUAL`, `EVIDENCE`, `REFERENCE`) y validación socrática en tiempo real.

---

## 2. Marco Metodológico e Investigación de Soporte

### 2.1. El Enfoque de Dr. Justin Sung: Aprendizaje de Alto Orden (Higher-Order Learning)

El marco cognitivo de Vink se apoya directamente en la investigación pedagógica del **Dr. Justin Sung** sobre procesamiento profundo, codificación y esquemas conceptuales:

* **Codificación no lineal (Non-Linear Relationship Mapping):** El cerebro humano no almacena información técnica como listas secuenciales. Construye redes o *schemas*. Una sesión de estudio efectiva en Vink nunca debe incentivar resúmenes lineales; debe exigir al estudiante identificar cómo un concepto A *limita*, *dispara* (`TRIGGERS`), *inhibe* (`INHIBITS`) o es *prerrequisito* (`PREREQUISITE_OF`) de un concepto B.
* **Evitar la ilusión de competencia (The Illusion of Fluency):** Releer notas o subrayar textos activa el reconocimiento pasivo, engañando al estudiante haciéndole creer que domina el tema. Vink introduce **resistencia deliberada** (*desirable difficulties*): interroga al estudiante sobre las dependencias causales no evidentes.
* **Priorizar Codificación sobre Recuerdo Aislado:** En lugar de memorizar definiciones atómicas (estilo flashcards tradicionales de texto plano), el estudiante debe entender la posición topológica e invariantes de una entidad dentro del sistema antes de someterla a repetición espaciada.

### 2.2. Concepto de "Learning Harness" (El Arnés Cognitivo)

Un *arnés* no hace el esfuerzo por el atleta; le impide caer en precipicios fatales y canaliza su fuerza. 
* Vink **no** es un asistente de IA que "explica todo con analogías infantiles" o que genera resúmenes automáticos para que el estudiante no lea.
* Vink actúa como un arnés: extrae el Grafo Cognitivo Abstracto (Cognitive AST) de los trazos y la voz, pero deja intactos los vacíos analíticos deliberados (**Ghost Nodes**) para obligar al estudiante a reflexionar: *"Has conectado A con C, pero omitiste el mecanismo intermediario B; ¿por qué?"*.

### 2.3. Similitudes Estructurales y Ecosistemas de Extensión
* **Paralelo tipo "Cydia" / Entorno No Confinado:** En sistemas abiertos de paquetes, las extensiones no existen aisladas; declaran dependencias duras y conflictos de incompatibilidad con el resto del sistema. En Vink, los conceptos operan de forma análoga: un nodo técnico posee invariantes y precondiciones que invalidan hipótesis contradictorias si se conectan sin justificación causal.

---

## 3. Principios de Validación Epistémica y Modo Socrático

El pipeline de inteligencia artificial (impulsado por Gemini multimodal) no evalúa estilo ni ortografía; evalúa **invariantes de causalidad**:

1. **Detección de Falacias Conceptuales:** Si en un mapa de arquitectura el usuario dibuja una conexión directa sincrónica donde el kernel delega operaciones vía I/O asíncrono, el sistema marca el nodo en estado no verificado (`unverified` / `needs_defense`).
2. **Defensa Socrática de Baja Fricción (Voice First):** Escribir explicaciones técnicas largas en una tableta destruye el estado de flujo. Vink implementa auditoría socrática por voz: el estudiante presiona el micrófono y defiende verbalmente en 30 segundos la causalidad.
3. **Rúbrica Estricta de Promoción:** Un nodo solo transiciona a `verified` (con halo esmeralda `#2E8B6A`) si la transcripción de voz valida la invariante requerida y descarta la falacia identificada.

---

## 4. Filosofía de Interacción y Sensibilidad Háptica

Vink concibe la pantalla táctil no como un cristal resbaladizo, sino como una mesa de trabajo con **gravedad y textura**:
* **Feedback Háptico Físico (`expo-haptics`):**
  * Micro-impacto medio al anclar un nodo (`ImpactFeedbackStyle.Medium`).
  * Micro-click ligero al alternar niveles o filtros (`ImpactFeedbackStyle.Light`).
  * Notificación háptica sutil de éxito al verificar un concepto o resolver una defensa socrática (`NotificationFeedbackType.Success`).
* **Carga Cognitiva Cero en Navegación:** El lienzo permite paneo y zoom fluidos con prevención estricta de conflictos de gestos (`GestureDetector`), priorizando el lápiz activo (S-Pen) para el trazo nativo a baja latencia y los dedos para la manipulación espacial.
