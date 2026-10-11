# ESPECIFICACIÓN TÉCNICA: MOTOR GRÁFICO DE TINTA V3 (HIGH-PERFORMANCE INK ENGINE)
*Indexación Espacial O(1), Desacoplamiento de Recolección de Basura (GC) y Serialización Contigua*

## Resumen Ejecutivo
Esta versión migra la arquitectura gráfica de React Native / Android Jetpack Ink a un modelo industrial de alto desempeño equivalente a Goodnotes y Concepts:
1. **Spatial Hash Grid:** Indexación espacial $O(1)$ en World Space (64dp) para detección de clústeres en Hover (S-Pen Air View) y borrado rápido.
2. **Transformación Afín por Matriz en Lazo:** Eliminación del 100% del GC Churn en el arrastre mediante `selectionMatrix.postTranslate()` y renderizado directo con `canvas.concat()`.
3. **Contrato de Serialización Plana:** Reemplazo de miles de mapas de puntos por arreglos planos contiguos `[x0, y0, p0, t0, ...]`, acelerando la transferencia a < 5 ms.
4. **Aislamiento de Dirty Bounds en Puntero Láser:** Renderizado acotado para evitar capas de pantalla completa a 120 Hz.
5. **Telemetría de Borrado con Swap:** Registro explícito en Logcat y consola de React Native (`onScratchOut`) en cada ejecución de borrado gestual o barrido.

Ver documento formal en [`docs/adr/ADR-005-high-performance-ink-engine-v3.md`](../../docs/adr/ADR-005-high-performance-ink-engine-v3.md).
