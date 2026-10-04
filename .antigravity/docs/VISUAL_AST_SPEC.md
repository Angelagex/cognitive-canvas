# ESPECIFICACIÓN TÉCNICA Y ARQUITECTURA: VISUAL AST ENGINE

**Motor Local de Segmentación, Regularización Geométrica y Topología Causal**  
*Documento de Referencia de Ingeniería — Cognitive Canvas Core*  
*Basado en: `MASTER_SPEC.md` (Sección 5), `DECISION_RATIONALE.md` (Sección 6) y `packages/core/src/parser/VisualASTEngine.ts`.*

---

## 1. Misión y Rol en la Arquitectura de 3 Capas (.cmn)

El documento nativo de Cognitive Canvas (`.cmn`) desacopla estrictamente los datos del mapa en tres capas independientes:
1. **Capa 1: Raw Vector Ink Layer (`raw_ink_layer`):** Trazos vectoriales atómicos capturados a 120 Hz desde el hardware Wacom EMR / S-Pen con sensibilidad a presión y tiempo relativo.
2. **Capa 2: Visual AST Layer (`visual_ast_layer`):** Representación sintáctica determinista, calculada 100% offline y en tiempo real (< 2 ms) en TypeScript puro, que agrupa físicamente los trazos en palabras, cajas, flechas y topología de red.
3. **Capa 3: Compiled Cognitive Layer (`compiled_cognitive_layer`):** Grafo semántico enriquecido y auditado generado asíncronamente por Gemini 2.0 Flash en la nube.

```
┌────────────────────────────────────────────────────────┐
│  Hardware S-Pen / Wacom EMR (120 Hz, Galaxy Tab S10)   │
└──────────────────────────┬─────────────────────────────┘
                           │ RawInkStroke[] (onStrokeEnd)
                           ▼
┌────────────────────────────────────────────────────────┐
│               VisualASTEngine (Core)                   │
│   • Nivel 1: Clasificación de Trazos & Regularización │
│   • Nivel 2: Agrupamiento Adaptativo por Línea Base    │
│   • Nivel 3: Conectores Avanzados & Cajas Multi-Trazo  │
│   • Nivel 4: Contención Jerárquica Espacial            │
│   • Nivel 5: Docking, Etiquetas & Bucles Causales      │
└──────────────────────────┬─────────────────────────────┘
                           │ VisualAST Layer
                           ▼
┌────────────────────────────────────────────────────────┐
│ UI React Native: Halo Perimetral, Air View, Tooltips   │
│ Backend SST: S3 + Prompting Estructurado Gemini 2.0   │
└────────────────────────────────────────────────────────┘
```

### ¿Por qué un Visual AST determinista en lugar de OCR directo (Google ML Kit)?
- **Cero Dependencias Pesadas:** No requiere binarios nativos ni modelos de 40 MB por idioma. El motor ocupa < 10 KB de TypeScript minificado.
- **Topología vs Texto:** El OCR ordinario sólo transcribe caracteres a texto ASCII; no comprende flechas compuestas (tallo + punta), contención de nodos dentro de cajas, acoplamiento magnético a bordes ni bucles causales.
- **Inmediatez Interactiva:** Debe responder en menos de 2 ms tras levantar el lápiz para proyectar el halo perimetral ceñido al nodo durante el Air View Hover (a 1–2 cm de la pantalla). La transcripción profunda del contenido la realiza Gemini sobre el bitmap PNG de alta resolución.

---

## 2. Pipeline de Procesamiento de 5 Niveles

El procesamiento de trazos en `VisualASTEngine.parseVisualAST(strokes)` opera mediante una arquitectura de capas ascendentes (*bottom-up*):

### Nivel 1: Clasificación Geométrica de Trazos Individuales
Cada trazo individual $S = \{P_0, P_1, \dots, P_n\}$ se clasifica analizando su longitud acumulada $L_{\text{total}} = \sum \|P_i - P_{i-1}\|$ y su distancia directa $d_{\text{direct}} = \|P_n - P_0\|$.

1. **Cociente de Linealidad ($R$):**
   $$R = \frac{d_{\text{direct}}}{L_{\text{total}} + 10^{-4}}$$
2. **Caja Cerrada Monotrazo (`BOX`):**
   - Condición: $R < 0.28$ (el trazo cierra sobre sí mismo) con ancho $W > 50\text{ px}$ y alto $H > 35\text{ px}$.
3. **Puntas de Flecha (`ARROW_HEAD`):**
   - Trazo corto ($L_{\text{total}} < 60\text{ px}$, $3 \le n \le 14$ puntos) con giro agudo:
     $$\vec{v}_1 = P_{\text{mid}} - P_0, \quad \vec{v}_2 = P_n - P_{\text{mid}}$$
     $$\cos \theta = \frac{\vec{v}_1 \cdot \vec{v}_2}{\|\vec{v}_1\| \|\vec{v}_2\|} < 0.5 \quad (\theta > 60^\circ)$$
4. **Tapa Perpendicular en T (`T_BAR`):**
   - Trazo recto ($R \ge 0.80$) con longitud corta de $10\text{ px} \le L_{\text{total}} \le 55\text{ px}$.
5. **Gesto de Borrado en Zigzag (`SCRATCH_OUT`):**
   - Detecta $\ge 4$ inversiones de signo en la velocidad horizontal ($dx_i = x_i - x_{i-1}$) en un tramo denso con $L_{\text{total}} \ge 70\text{ px}$ y ancho $\ge 30\text{ px}$.
6. **Líneas y Conectores Abiertos (`LINE`):**
   - **Recta (`STRAIGHT`):** $R \ge 0.82$ y $L_{\text{total}} \ge 65\text{ px}$.
   - **Curva Bézier (`CURVED`):** $R \ge 0.38$, $L_{\text{total}} \ge 75\text{ px}$, $d_{\text{direct}} \ge 50\text{ px}$, abierto y con **a lo sumo 1 inversión vertical en $Y$** ($y_{\text{reversals}} \le 1$). Este filtro previene que palabras cursivas (cuyas astas oscilan $\ge 2$ veces en $Y$) sean clasificadas como conectores.
   - **Codo Ortogonal (`ELBOW`):** Cumple las condiciones de curva pero presenta un vértice de giro ortogonal donde dos segmentos consecutivos satisfacen:
     $$|\cos \theta| \le 0.35 \quad (70^\circ \le \theta \le 110^\circ)$$
7. **Trazos de Contenido (`TEXT` vs `ICON`):**
   - Trazos pequeños no lineales ($L < 240\text{ px}$, $W < 140\text{ px}$, $H < 80\text{ px}$) se tipifican como `TEXT`. Dibujos no horizontales más extensos se clasifican como `ICON`.

---

### Nivel 2: Agrupamiento Adaptativo por Línea Base (Adaptive Stroke Clustering)

#### El Problema del Umbral Temporal Fijo (< 600 ms)
La heurística temporal clásica fusionaba trazos únicamente si el intervalo entre ellos era menor a 600 ms. Al escribir palabras complejas a mano (ej. *"Photography"*), el usuario hace pausas biomecánicas naturales de 0.8 a 2.5 segundos para mover la muñeca o pensar, lo que fracturaba palabras individuales en 3 o 4 entidades rotas.

#### Algoritmo de Componentes Conexas con Escala Dinámica ($\tilde{H}$)
Se utiliza una búsqueda en anchura (BFS) para calcular la clausura transitiva de trazos vecinos a lo largo de la línea base de escritura:

1. **Cálculo de la Escala Local $\tilde{H}$:**
   Para cualquier par de trazos $A$ y $B$:
   $$\tilde{H} = \max(14, \min(H_A, H_B))$$
2. **Umbrales Dinámicos Adaptativos:**
   $$\Delta x_{\max} = \max(24, \min(65, 1.25 \times \tilde{H}))$$
   $$\Delta y_{\max} = \max(16, 0.85 \times \tilde{H})$$
3. **Criterios de Fusión en la Misma Entidad (`areStrokesInSameEntity`):**
   - **Solapamiento Directo:** Si $\Delta x = 0$ y $\Delta y \le \max(28, 0.95\tilde{H})$ (ligaduras cursivas, cruce de `t`, punto de la `i`).
   - **Alineación de Línea Base:** Si $\Delta y \le \Delta y_{\max}$ y $\Delta x \le \Delta x_{\max}$.
   - **Absorción de Trazos Retardados (*Delayed Strokes*):** Si un trazo se sitúa dentro de la proyección horizontal del otro ($x_A \approx x_B \pm 0.35\tilde{H}$) con separación vertical moderada, se absorbe sin importar el tiempo transcurrido (cruces de `t` o tildes dibujadas segundos después).
   - **Expansión Temporal Rápida:** Si $\Delta t \le 650\text{ ms}$, el umbral horizontal se expande hasta $1.35 \times \Delta x_{\max}$.
4. **Regla de Vecindad de Texto para Líneas Sin Cabeza (Anti-Robo de Astas):**
   Las astas verticales de letras como `P`, `h`, `t`, `p`, `l` o `d` en pantallas de alta resolución miden entre 100 y 250 px de alto con $R > 0.95$. Si una línea recta no tiene punta de flecha ni tapa en T, el motor verifica si tiene vecinos de texto a lo largo de la línea base (`hasTextNeighbor`). Si tiene vecinos próximos, **se retiene como trazo de texto** y se incluye en el clúster de la palabra en lugar de sustraerse como conector.
5. **Poda In-AST de Gestos Scratch-out:**
   Cualquier entidad cuyo bounding box tenga $\ge 35\%$ de área cubierta por un trazo `SCRATCH_OUT` es marcada como `is_scratched_out: true` y excluida del AST activo.

---

### Nivel 3: Conectores Avanzados y Cajas Multi-Trazo

1. **Ensamblado de Cajas Multi-Trazo (`detectMultiStrokeContainers`):**
   - Muchos usuarios dibujan rectángulos trazando 4 líneas separadas (arriba, derecha, abajo, izquierda).
   - Se construye un grafo de adyacencia de extremos de líneas rectas (tolerancia $\le 35\text{ px}$).
   - Se buscan ciclos simples de longitud $k \in [3, 6]$.
   - **Invariante Crítico:** Se excluyen del análisis aquellas líneas que tengan puntas de flecha en sus extremos. Esto garantiza que un ciclo causal triangular ($A \to B \to C \to A$) jamás sea confundido con una caja.
   - Las líneas del ciclo se consolidan en una única entidad `CONTAINER_BOX`.
2. **Asignación de Puntas por Extremidad Más Cercana:**
   - Para cada punta de flecha (`ARROW_HEAD`), se evalúa la distancia euclidiana hacia los extremos de todos los tallos disponibles. Se acopla a la extremidad más cercana ($\le 40\text{ px}$). Esto resuelve el problema de flechas adyacentes donde una punta podría asignarse por error al origen de la flecha vecina.
3. **Conectores Inhibitorios ($\bot$):**
   - Si un tallo no tiene punta de flecha en su extremo final, se busca una tapa recta perpendicular (`isPerpendicularCap`) dentro de $40\text{ px}$.
   - Se verifica el ángulo de perpendicularidad entre el vector del tallo $\vec{v}_{\text{shaft}}$ y el de la tapa $\vec{v}_{\text{cap}}$:
     $$\cos \theta = \frac{|\vec{v}_{\text{shaft}} \cdot \vec{v}_{\text{cap}}|}{\|\vec{v}_{\text{shaft}}\| \|\vec{v}_{\text{cap}}\|} \le 0.5 \quad (60^\circ \le \theta \le 120^\circ)$$
   - Se clasifica como `type: "INHIBITION"`, `directionality: "FORWARD"`.
4. **Flechas Bidireccionales ($\leftrightarrow$):**
   - Si un tallo presenta puntas acopladas tanto en el inicio como en el final, se clasifica como `type: "ARROW"`, `directionality: "BIDIRECTIONAL"`.

---

### Nivel 4: Contención Jerárquica Espacial

Para cada entidad de tipo `CONTAINER_BOX`:
1. Se iteran las demás entidades del lienzo.
2. Si el bounding box de una entidad candidata está completamente contenido dentro del contenedor (con margen de holgura de 5 px):
   $$\text{box.xmin} - 5 \le \text{cand.xmin} \quad \land \quad \text{cand.xmax} \le \text{box.xmax} + 5$$
   $$\text{box.ymin} - 5 \le \text{cand.ymin} \quad \land \quad \text{cand.ymax} \le \text{box.ymax} + 5$$
3. Se agrega el `candidate.id` a la lista `box.child_ids`.

---

### Nivel 5: Docking Magnético, Etiquetas Relacionales y Topología Causal

1. **Docking Magnético Euclidiano:**
   - Para cada conector, se evalúa la distancia mínima desde su punto inicial $P_{\text{start}}$ y final $P_{\text{end}}$ hacia el contorno perimetral (`distancePointToBBox`) de todas las entidades.
   - Si la distancia es $\le 100\text{ px}$, se enlazan formalmente:
     $$conn.source\_entity\_id = \text{nearestSource.id}, \quad conn.target\_entity\_id = \text{nearestTarget.id}$$
2. **Enlace de Etiquetas Relacionales Adyacentes:**
   - Se calcula el punto medio del conector $P_{\text{mid}} = \frac{P_{\text{start}} + P_{\text{end}}}{2}$.
   - Si existe una entidad de tipo `TEXT_BLOCK` a una distancia $\le 40\text{ px}$ de $P_{\text{mid}}$ (y no es el nodo origen ni destino), se asocia como etiqueta relacional (`conn.label = ent.transcribed_text || "relacionado con"`).
3. **Detección de Bucles Causales de Retroalimentación (`causal_loops`):**
   - Se construye el grafo dirigido $G = (V, E)$ a partir de los conectores acoplados.
   - Mediante DFS con detección de retrocesos en camino, se descubren todos los ciclos dirigidos cerrados ($A \to B \to \dots \to A$) de longitud $3 \le k \le 12$.
   - **Normalización Lexicográfica:** Cada ciclo se rota de forma determinista para que comience con el identificador de nodo lexicográficamente menor (ej. `[entity_1, entity_3, entity_2, entity_1]`), eliminando duplicados de rotación en el conjunto resultante.
4. **Métricas de Flujo Topológico (`topology_metrics`):**
   - **Premisas Raíz (`root_entity_ids`):** Nodos con grado de entrada 0 y grado de salida $> 0$ (conceptos nucleares / axiomas generadores).
   - **Sumideros Terminales (`sink_entity_ids`):** Nodos con grado de entrada $> 0$ y grado de salida 0 (conclusiones o impactos finales).
   - **Densidad de Enlaces Cruzados (`cross_link_count`):** Nodos con grado de entrada $> 1$, indicador empírico de reconciliación integrativa en la teoría de aprendizaje significativo de Novak.

---

## 3. Contratos TypeScript Formales

Ubicados en [visualAst.ts](file:///home/angel/personal/cognitive-canvas/packages/core/src/types/visualAst.ts):

```typescript
export type VisualEntityType = "TEXT_BLOCK" | "SKETCH_ICON" | "CONTAINER_BOX";

export interface VisualEntity {
  id: string;
  type: VisualEntityType;
  stroke_ids: string[];
  bbox: NormalizedBoundingBox;
  transcribed_text?: string;
  semantic_anchor?: SemanticAnchor | null;
  passive_context?: string | null;
  child_ids?: string[];
  is_scratched_out?: boolean;
}

export type ConnectorDirectionality = "FORWARD" | "BIDIRECTIONAL" | "NONE";
export type ConnectorGeometryType = "STRAIGHT" | "CURVED" | "ELBOW";

export interface ConnectorEdge {
  id: string;
  type: "ARROW" | "LINE" | "INHIBITION";
  stroke_ids: string[];
  source_entity_id?: string;
  target_entity_id?: string;
  directionality: ConnectorDirectionality;
  label?: string;
  is_curved?: boolean;
  geometry_type?: ConnectorGeometryType;
}

export interface CausalLoop {
  cycle_ids: string[]; // [A, B, C, A]
  node_count: number;
}

export interface TopologyMetrics {
  root_entity_ids: string[];
  sink_entity_ids: string[];
  cross_link_count: number;
}

export interface VisualAST {
  entities: VisualEntity[];
  connectors: ConnectorEdge[];
  causal_loops?: CausalLoop[];
  topology_metrics?: TopologyMetrics;
}
```

---

## 4. Matriz de Validación y Pruebas Unitarias

La suite de pruebas automatizadas reside en [packages/core/test/visualAST.test.ts](file:///home/angel/personal/cognitive-canvas/packages/core/test/visualAST.test.ts) y se ejecuta con `npx vitest run`:

| ID Test | Nivel / Capacidad | Escenario Evaluado | Resultado |
| :--- | :--- | :--- | :--- |
| **TC-01** | Nivel 1 | Clasificación de trazos en cajas, líneas rectas y texto | ✅ Passed (2 ms) |
| **TC-02** | Nivel 2 | Agrupamiento temporal estándar (< 600 ms) | ✅ Passed (1 ms) |
| **TC-03** | Nivel 2 | Resistencia a pausas largas y absorción de cruce tardío de `t` (delayed stroke) | ✅ Passed (1 ms) |
| **TC-04** | Nivel 3 | Fusión de tallo y punta en primitiva compuesta `ARROW` | ✅ Passed (1 ms) |
| **TC-05** | Nivel 4 | Inferencia de contención jerárquica padre-hijo (`child_ids`) en caja monotrazo | ✅ Passed (1 ms) |
| **TC-06** | Nivel 5 | Docking magnético a entidades más cercanas y enlace de etiqueta relacional | ✅ Passed (2 ms) |
| **TC-07** | Persistencia | Generación del documento completo de 3 capas `.cmn` | ✅ Passed (1 ms) |
| **TC-08** | Feature 1 | Escalado adaptativo $\tilde{H}$ (titular grande 60px agrupado vs notas marginales 16px separadas) | ✅ Passed (2 ms) |
| **TC-09** | Feature 2 | Conectores curvos Bézier vs codos ortogonales en ángulo recto | ✅ Passed (1 ms) |
| **TC-10** | Feature 3 | Ensamblado de contenedor multi-trazo (4 líneas) y contención de nodos internos | ✅ Passed (1 ms) |
| **TC-11** | Feature 4 | Detección de bucle causal triangular ($A \to B \to C \to A$) y grados de red | ✅ Passed (2 ms) |
| **TC-12** | Feature 5 | Conectores inhibitorios con tapa en T ($\bot$) y flechas bidireccionales ($\leftrightarrow$) | ✅ Passed (1 ms) |
| **TC-13** | Feature 6 | Poda in-AST de entidades tachadas con gesto horizontal en zigzag (*scratch-out*) | ✅ Passed (1 ms) |
| **TC-14** | Caso Real | Palabra *"Photography"* (20 trazos en tablet de 11", $H \approx 280\text{ px}$) consolidada en 1 único `TEXT_BLOCK` | ✅ Passed (2 ms) |

---

## 5. Protocolo de Depuración en Hardware Real (Galaxy Tab S10 Lite)

1. **Inspección en Caliente por Terminal:**
   ```bash
   adb logcat | grep -i "VisualASTEngine"
   ```
   Cada vez que el usuario levanta el S-Pen, se emite el desglose en tiempo real:
   ```text
   [VisualASTEngine] Live AST updated: 1 entities, 0 connectors
     [Entity 1] (TEXT_BLOCK): 20 strokes, bbox: [650, 220 -> 1245, 500]
   ```
2. **Inspección Visual del Halo Perimetral (Air View):**
   - Al aproximar el lápiz a 1–2 cm de cualquier letra de una palabra, el halo rectangular resplandeciente debe abarcar uniformemente la totalidad de la palabra desde su primera letra hasta la última.
   - Al aproximar el lápiz al interior de una caja delimitadora, el halo debe abarcar el perímetro exterior de la caja sin desalinearse de los trazos.
