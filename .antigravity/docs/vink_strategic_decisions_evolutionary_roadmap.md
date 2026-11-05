# Vink: Historial de Decisiones de Producto, Branding y Roadmap Evolutivo

## 1. Identidad de Marca y Post-Mortem de Naming

### 1.1. De "Cognitive Canvas" a "Vink"

* **Por qué se descartaron nombres anteriores:**
  * *Cognitive Canvas / Canvas Hub:* Demasiado descriptivo, largo, suena a proyecto académico o software corporativo genérico.
  * *Rizoma / Rhizome:* Filosóficamente brillante (Deleuze/Guattari), pero introduce fricción: evoca botánica, tiene problemas ortográficos (`Rizoma` vs `Rhizome`) y exige explicar la metáfora antes de vender el producto.
  * *Lazo / Lasso:* Confusión directa con la herramienta de selección en Photoshop e Illustrator.
* **Por qué ganó "Vink":**
  * Monosílabo contundente de 4 letras.
  * Síntesis fonética perfecta de **Ink** (tinta humana/analógica) + **Link** (vínculo causal/grafo computado).
  * Estética escandinava/técnica, moderna, ágil y fácil de recordar.

### 1.2. Especificación Visual del Isotipo Oficial

El logotipo de Vink huye del "AI slop" (renders 3D recargados, brillos volumétricos y exceso de líneas) para convertirse en un icono $1:1$ vectorial, funcional a $32\text{px}$ en un app launcher:

* **Fondo:** Obsidiana profundo (`#0C0E14` / `#0E1018`).
* **Trazo Descendente (Trazo Izquierdo):** 100% tinta caligráfica en ámbar/oro Vink (`#FFB320`). Muestra textura de pincelada húmeda, presión variable y desgarro analógico en los bordes.
* **Transición Temprana:** Al llegar a la base y comenzar el ascenso derecho, la tinta de oro se detiene de forma limpia tras recorrer apenas el **20%–25%** de la subida.
* **Trazo Ascendente (Trazo Derecho):** El 75%–80% restante de la subida de la "V" se completa exclusivamente con **4 a 5 nodos circulares limpios en cobalto eléctrico (`#2F3DFF` / `#5A68FF`)**, interconectados por aristas vectoriales nítidas. Los nodos forman el cuerpo de la letra, no un parche añadido por fuera.
* **Salpicaduras:** 2 pequeñas gotitas espontáneas de oro a la izquierda del trazo principal. Sin mallas complejas en el fondo que dificulten la vectorización.

## 2. Límites del Producto (Lo que Vink NO es)

Para preservar el foco del producto y no desenfocar el desarrollo:

1. **NO es un gestor de hábitos ni de estilo de vida general:** Vink no rastrea horas de sueño, agua o finanzas. Es un entorno de alto rendimiento para el **modelado y estudio de sistemas complejos** (desarrollo de software, ingeniería, medicina, ciencias teóricas).
2. **NO es un lienzo de dibujo artístico:** El motor de dibujo existe al servicio de la extracción conceptual y la externalización mental, no de la ilustración decorativa.
3. **NO es una base de datos documental estilo Notion:** No pretende almacenar manuales lineales de 100 páginas; estructura grafos de dependencias causales e invariantes de conocimiento deducible.

## 3. Roadmap Evolutivo por Fases

### Fase 1: Identidad, Sensibilidad Háptica y Sistema de Diseño (Completada)

* [x] Configuración de naming canónico "Vink" en `app.json` y assets de marca.
* [x] Vectorización de Logotipo e Isotipo (`VinkLogo.tsx`, `assets/icon.png`, `assets/adaptive-icon.png`).
* [x] Splash Screen nativa sobre fondo obsidiana (`#0C0E14`) para erradicar el parpadeo blanco en arranque.
* [x] Micro-interacciones hápticas con `expo-haptics` en `MatrixGraphView.tsx` y selectores de la Knowledge Matrix.
* [x] Botón de retorno unificado `[ < Vink ]` en la barra del lienzo, sustituyendo al legacy "HV" como ancla de identidad y regreso a la biblioteca.
* [x] Sincronización reactiva del tema de interfaz (`crema`, `noche`, `tinta`) en WorkspaceHub, Knowledge Matrix, Ajustes y modales.
* [x] Consolidación de los 5 presets de papel de lienzo canónicos (`crema`, `noche`, `tinta`, `grafito`, `obsidiana`) con matriz de contraste optimizada para S-Pen.

### Fase 2: Auditoría Socrática Activa por Voz (Próximo Sprint)

* **Objetivo:** Eliminar el teclado en la tableta durante el estudio profundo.
* **Detalle de Implementación:**
  * Reemplazar la entrada de texto en defensas socráticas por un trigger de grabación de voz rápida (límite de 30-45s) apalancado en el arnés existente (`DeepgramService` Nova 2 / streaming multimodal de Gemini).
  * Evaluar el audio frente a la rúbrica epistemológica:
    * `invariant_detected`: ¿Explica el principio subyacente que gobierna el mecanismo?
    * `fallacy_present`: ¿Comete la confusión clásica o inversión causal de este concepto?
  * Si la defensa es aprobada, el estado transiciona de `unverified` a `verified` con pulso esmeralda (`#2E8B6A`) y confirmación háptica (`NotificationFeedbackType.Success`).

### Fase 3: Counterfactual Sandbox (Simulación de Fallos en Cascada)

* **Objetivo:** Transformar el grafo estático en un simulador dinámico de tensiones de arquitectura.
* **Detalle de Implementación:**
  * *Long press* sobre cualquier nodo del grafo causal (ej. `Libuv Thread Pool`).
  * El nodo se tiñe de carmesí (`#E85A3F` / `#EF4444`) simulando una partición o fallo total.
  * El algoritmo recorre las aristas `TRIGGERS` y `PREREQUISITE_OF` aguas abajo, marcando en estado de alerta parpadeante los nodos afectados.
  * Gemini sintetiza un micro-escenario de estrés: qué síntoma real y observable experimentaría el sistema ante ese colapso.

### Fase 4: Repetición Espaciada Causal & "Causal Diff"

* **Objetivo:** Retención a largo plazo y medición empírica de madurez conceptual.
* **Detalle de Implementación:**
  * **Daily Causal Puzzle:** Al iniciar sesión, oculta una arista crítica entre dos nodos estudiados previamente y reta al estudiante a reconstruir la relación causal antes de abrir el lienzo.
  * **Causal Diff:** Comparativa temporal entre dos lienzos del mismo tema realizados con semanas de diferencia. Destaca cómo los puntos ciegos (`ghost nodes`) se convirtieron en entidades consolidadas.

## 4. Protocolo de Rehidratación de Contexto (Prompt para Nuevos Chats)

Al abrir un nuevo hilo de conversación con un agente o modelo de IA, utiliza el siguiente bloque de inicialización:

```text
Actúa como co-founder, arquitecto técnico y diseñador de producto de Vink (Vink = Ink + Link), un sistema de síntesis no lineal y matrices de conocimiento socráticas para estudiantes técnicos e ingenieros.

Conoces a profundidad:
1. El marco de aprendizaje de alto orden del Dr. Justin Sung (codificación profunda sobre retención aislada, esquemas causales no lineales).
2. El concepto de "Learning Harness" y la validación epistémica socrática basada en invariantes técnicas y taxonomía PACER.
3. El stack técnico y los invariantes de la arquitectura (Expo SDK 52, React Native 0.76+, Android Jetpack Ink API v1.0.0 nativo en Kotlin, React Native SVG, Gesture Handler, AWS SST Ion + Gemini Multimodal Pipeline).
4. La identidad visual de Vink (obsidiana #0C0E14, oro caligráfico #FFB320 y cobalto #2F3DFF con corte al 25% de la V).

A continuación tienes los documentos fundacionales y las especificaciones técnicas del proyecto. Asume este rol con rigor de ingeniería y visión pedagógica.
```
