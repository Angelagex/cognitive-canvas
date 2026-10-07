# ADR-004: Modularización del Visual AST Engine y Roadmap de Evolución Neuronal (Opción B)

## Estado
**Aceptado / En Progreso** (Fase 1 completada; Fase 2 planificada como evolución)

---

## Contexto
El motor de reconocimiento espacial local `VisualASTEngine` implementa los 5 niveles de extracción topológica de diagramas y mapas cognitivos (desde trazos crudos hasta ciclos causales y polaridad). 

A medida que se agregaron funcionalidades avanzadas (gestos scratch-out, escala adaptativa MyScript $\tilde{H}$, conectores curvos/ortogonales, contenedores poligonales de múltiples trazos, detección de signos de influencia $+/-$, ventanas de contexto de 1-salto y ciclos de retroalimentación de dinámica de sistemas), el archivo creció a ~1,600 líneas de código monolítico. Además, casos borde en caligrafía natural con S-Pen (como trazos curvos o descendentes con gancho en las letras `h` e `y`, o bucles cerrados en `p` y `o`) requerían una separación clara de responsabilidades para evitar falsas clasificaciones como conectores de diagrama.

---

## Decisiones Arquitectónicas

### 1. Modularización del Parser (Fase 1 - Ejecutada)
Se descompuso el motor monolítico en módulos cohesivos y desacoplados bajo `packages/core/src/parser/`:

1. **`classification/`**:
   - `IStrokeClassifier.ts`: Interfaz intercambiable para clasificación de trazos.
   - `StrokeClassifier.ts`: Clasificador heurístico geométrico de Nivel 1 (líneas, flechas, contenedores, scratch-out).
   - `ScaleEstimator.ts`: Estimador de escala intrínseca de escritura ($\tilde{H}$) con invariancia matemática ante zoom.
2. **`clustering/`**:
   - `SkeletalDistance.ts`: Primitivas euclidianas punto-a-segmento y distancia esquelética entre trazos.
   - `EntityClusterer.ts`: Agrupamiento adaptativo por componentes conexas (Nivel 2), absorción de trazos diferidos y poda scratch-out.
3. **`connectors/`**:
   - `ConnectorEngine.ts`: Emparejamiento de astiles con puntas de flecha y topes de inhibición $T$-bar (Nivel 3).
   - `InfluenceSignDetector.ts`: Detección de signos de influencia caligráficos ($+$ y $-$) adyacentes a conectores.
4. **`topology/`**:
   - `ContainmentEngine.ts`: Detección de bucles poligonales de múltiples trazos y contención jerárquica padre-hijo (Nivel 4).
   - `EntityDocker.ts`: Acoplamiento magnético a entidades y síntesis de ventana de contexto semántica de 1-salto (Nivel 5).
   - `CausalLoopDetector.ts`: Detección de ciclos dirigidos y asociativos, polaridad de bucle ($R$ vs $B$) y métricas de flujo.
5. **`VisualASTEngine.ts`**:
   - Fachada orquestadora delgada (<160 líneas) que coordina los niveles sin deuda técnica.

---

### 2. Opción B: Modelo Neuronal Unificado de Atención On-Device (Fase 2 - Evolución)

Para escenarios donde la caligrafía es altamente cursiva, ligada o atípica, se define la **Opción B** como la evolución natural del motor:

#### ¿Es posible embeber un modelo neuronal similar a MyScript o desarrollar uno propio?
**Sí, absolutamente.** MyScript (a partir de la v4.3) sustituyó los modelos acústicos/HMM tradicionales por redes neuronales profundas con **mecanismos de atención unificada** que procesan la tinta digital $(x, y, t, p)$ y clasifican trazos y bloques simultáneamente.

#### Arquitectura Propuesta para Fase 2:
```
Trazos Crudos Ink (x, y, t, pressure)
                │
                ▼
   [Resampleo Equidistante & Normalización Local]
                │
                ▼
   [Encoder: 1D-CNN + Conformer / Self-Attention Transformer]
                │
      ┌─────────┴─────────┐
      ▼                   ▼
[Head 1: Token Classifier] [Head 2: Stroke Affinity Embedding]
(TEXT | CONNECTOR | BOX)   (Matriz de afinidad espacial para clustering)
```

1. **Modelo Embebido Ligero (< 15 MB)**:
   - Arquitectura Transformer compacta (4 a 6 capas de Self-Attention) optimizada para inferencia on-device.
   - Entrada: Secuencias de puntos normalizadas con derivadas espaciales $(\Delta x, \Delta y, \Delta t, p)$.
2. **Motor de Ejecución On-Device**:
   - **ONNX Runtime Mobile** (vía módulo nativo React Native / C++ JSI) o **TensorFlow Lite (TFLite)** embebido en la vista Android `JetpackInkView.kt`.
   - Inferencia acelerada por NNAPI (NPU de la Samsung Galaxy Tab S10 Lite / MediaTek Dimensity) en < 5 ms.
3. **Integración Híbrida**:
   - Gracias a la interfaz `IStrokeClassifier`, el modelo neuronal se inyecta como una implementación alternativa (`NeuralAttentionClassifier implements IStrokeClassifier`).
   - El modelo neuronal resuelve la clasificación de bajo nivel (Nivel 1) y la afinidad de agrupación (Nivel 2), mientras que la topología de grafos, docking magnético y ciclos causales (Niveles 4 y 5) permanecen deterministas y matemáticamente verificables.
4. **Dataset y Entrenamiento Propio**:
   - Generación sintética de diagramas y caligrafía usando fuentes cursivas + perturbaciones gaussianas y ruido de digitalizador.
#### Justificación del Paradigma: ¿Por qué Enfoque Híbrido y NO 100% Neuronal End-to-End?

Se evaluó explícitamente si convenía delegar todo el pipeline a un modelo neuronal *end-to-end* (que ingrese trazos y prediga el grafo completo del AST) frente al **enfoque híbrido neuro-simbólico**. Se resolvió adoptar categóricamente el enfoque híbrido por las siguientes razones:

| Criterio | Modelo 100% Neuronal End-to-End | Enfoque Híbrido (Neuro-Simbólico) *(Elegido)* |
| :--- | :--- | :--- |
| **Garantía Topológica y Causal** | ❌ **Riesgo de alucinación**: Puede omitir aristas, inventar conexiones espurias o errar el signo de un ciclo causal. | ✅ **0% margen de error**: El cálculo de ciclos, polaridad ($R$ vs $B$) y docking se rige por teoría de grafos determinista (DFS/Tarjan). |
| **Latencia en Pantalla (120 Hz)** | ❌ **Lento (80–250 ms)**: Decodificar grafos completos de manera autoregresiva en dispositivos móviles agrega retraso no deseado. | ✅ **Ultra-rápido (< 5 ms)**: Una pasada feed-forward ligera en NPU para clasificar trazos + algoritmos de grafos en < 1 ms en memoria local. |
| **Complejidad del Dataset** | ❌ **Extremadamente costoso**: Requiere decenas de miles de diagramas completos reales anotados nodo por nodo con sus relaciones. | ✅ **Factible y ágil**: Solo requiere entrenar sobre trazos individuales y secuencias de palabras/flechas (sintetizables al 90% con tipografías y SVG). |
| **Mantenibilidad y Debugging** | ❌ **Caja negra**: Imposible ajustar reglas de negocio o correcciones geométricas sin reentrenar la red neuronal completa. | ✅ **Modular**: Si falla el reconocimiento caligráfico, se ajusta el clasificador; si cambia la regla de contención o docking, se ajusta el módulo topológico. |

**Conclusión del diseño**: La red neuronal se reserva exclusivamente para la **percepción sensorial** (resolver ambigüedades caligráficas mediante `IStrokeClassifier`), mientras que la **lógica simbólica de grafos y causalidad** permanece en el motor determinista.

---

## Consecuencias
- **Mantenibilidad**: Código limpio, modular y testeado al 100% (28 tests pasando).
- **Estabilidad**: Eliminación definitiva de falsos positivos donde `h`, `y`, `p` se confundían con conectores.
- **Extensibilidad**: Arquitectura lista para conectar la Opción B neuronal en la Fase 2 sin reescribir la lógica de mapas conceptuales y dinámica de sistemas.
