# UI & Canvas Specification - Cognitive Canvas

## 1. Dispositivo y Target de Pantalla
- **Dispositivo Primario:** Tablet Android con digitalizador Wacom EMR (Samsung Galaxy Tab S10 Lite / S9 FE) y iPad (PencilKit).
- **Relación de Aspecto:** 10.9 pulgadas en orientación horizontal (Landscape).
- **Frecuencia de Refresco:** 90 Hz / 120 Hz.
- **Hardware de Entrada:** S-Pen / Apple Stylus con soporte nativo de:
  - Rechazo de palma por hardware.
  - Hover / Proximidad (Air View a 1–2 cm de la pantalla).
  - Botón físico lateral (Barrel button).

---

## 2. Distribución Espacial de la Interfaz (Layout)

### A. Barra Superior (Header - 48dp)
- **Izquierda:** Menú de libretas/bóvedas de mapas y título editable del mapa actual.
- **Centro-Derecha:** Botones `Deshacer` y `Rehacer` con historial ilimitado de trazos.
- **Extremo Derecho:** Botón de acción principal `[⚡ Compilar Mapa]` (despliega el panel lateral de auditoría).

### B. Barra de Herramientas Principal (Estilo Goodnotes - 56dp)
Ubicada horizontalmente debajo del header:
- **Selector de Herramientas (Izquierda):**
  1. `Pluma / Pen`: Trazos sensibles a presión y velocidad.
  2. `Resaltador / Highlighter`: Trazos translúcidos que renderizan por debajo de la tinta negra.
  3. `Borrador / Eraser`: Modos borrado por trazo completo (*Stroke*) o por píxel.
  4. `Lazo / Lasso`: Selección libre para mover, escalar y duplicar clústeres de trazos.
  5. `Formas / Shapes`: Detección automática al mantener quieto el trazo (rectas, flechas, elipses).
  6. `Atributo Pasivo`: Selector manual para anclar metadatos.
  7. `Imágenes`: Importación de archivos multimedia como soporte.
- **Controles Rápidos (Derecha):**
  - 3 accesos directos a paleta de color favorita.
  - 3 accesos directos a grosor de plumilla (fino, medio, grueso).

### C. Lienzo Central (Canvas Infinito)
- Zoom continuo (10% a 1000%) y Pan inercial de dos dedos.
- Fondos intercambiables: Blanco puro, cuadrícula de puntos (*dot grid*), milimetrado.

### D. Barra Inferior Flotante (Footer)
- Selector de modo: `Solo Stylus` (bloquea toques accidentales de dedos en dibujo).
- Nivel de zoom actual con reset a 100% y botón de ajuste global (*Fit to Screen*).

---

## 3. Dinámica del Canvas y Atributos Pasivos

1. **Captura sin fricción:** Durante el dibujo libre, el usuario solo genera trazos vectoriales (sin llamadas a red ni modales pesados).
2. **Invocación de Atributo Pasivo:**
   - Mantener presionado el botón lateral del S-Pen y tocar un icono/trazo.
   - O doble toque rápido con el stylus sobre un clúster de trazos.
3. **Micro-Tooltip de Entrada:**
   - Botón de dictado rápido por voz (Voice-to-Text local de Android).
   - Chips rápidos de un solo tap (`[Analogía]`, `[Mecanismo Causal]`, `[Fórmula/Evidencia]`).
4. **Affordance de Hover (Air View):**
   - Al acercar el stylus a 1-2 cm sobre un nodo con atributo, aparece un tooltip flotante translúcido con el texto pasivo. Desaparece al alejar el lápiz.

---

## 4. Panel Lateral de Compilación (Drawer Derecho - 380dp)
Se abre tras presionar `[⚡ Compilar Mapa]`:
- **Pestaña 1: Auditoría GRINDE:**
  - Semáforo de pensamiento lineal (alerta de árbol pasivo vs. red integrada).
  - Ratio de densidad de enlaces cruzados (*cross-links*).
  - Feedback crítico de la IA para mejorar el modelo mental.
- **Pestaña 2: Clasificación PACER:**
  - Visualización del mapa coloreado por rol (Procedural, Analogous, Conceptual, Evidence, Reference).
- **Pestaña 3: Anki & Desafíos Cognitivos:**
  - Sincronización directa vía AnkiConnect de nodos Evidence/Reference no deducibles.
  - Desafíos de Transferencia Lejana (*High-Road*).
  - Retos de Comisión de Errores (*Derring Effect*).
  - Casos Contrastantes (*ICC*).