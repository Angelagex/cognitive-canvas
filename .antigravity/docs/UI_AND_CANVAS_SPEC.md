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
- **Izquierda:** Menú de acciones del documento `[...]` y título del mapa actual.
  - **Editor de Título Ergonómico:** En reposo muestra el nombre del documento con botón `✏️`. Al editar, muestra un `TextInput` enfocado con botones explícitos de confirmación `[✓]` y cancelación `[✕]`, con guardado automático al desenfocar (*onBlur*).
- **Centro-Derecha:** Botones `Deshacer` y `Rehacer` con historial ilimitado de trazos.
- **Extremo Derecho:** Botón de acción principal `[⚡ Compilar Mapa]` (despliega el panel lateral de auditoría) y selector de plantilla de papel.

### B. Barra de Herramientas Flotante (Dock Vertical Lateral - Ancho 56dp)
Ubicada verticalmente en el lateral izquierdo o derecho (conmutable dinámicamente mediante botón `⇄` y recordada en preferencias del usuario) para maximizar la superficie útil vertical de dibujo en tablets Landscape:
- **Conmutador de Lado:** Botón superior `⇄` para alternar la barra entre el flanco izquierdo y derecho.
- **Herramientas Principales:**
  1. `Pluma / Pen`: Trazos sensibles a presión y velocidad.
  2. `Resaltador / Highlighter`: Trazos translúcidos con mezcla multiplicativa.
  3. `Borrador / Eraser`: Conmutador de modo (trazo completo *Stroke* vs. *Precision Eraser*).
  4. `Lazo / Lasso`: Selección libre para mover y manipular clústeres.
  5. `Formas / Shapes`: Regularización geométrica de líneas, elipses y flechas.
- **Popovers Contextuales y Desplegables:**
  - **Selector de Grosor Único:** Botón compacto que despliega un popover flotante (`StrokeWidthPopover`) con 5 calibres milimétricos (fino a extra grueso).
  - **Paleta de Color Rápida:** Botón de color activo que despliega un popover flotante (`ColorPickerPopover`) con 12 tonos armónicos de alta visibilidad.
  - **Plantilla de Papel:** Popover flotante (`PaperTemplatePopover`) para alternar entre lienzo en blanco, cuadrícula de puntos (*dot grid*) y líneas pautadas.

### C. Navegación Unificada de Documentos y Bóveda
- **Modal de Acciones Integrado (`DocumentActionsModal`):**
  - Integra la visualización de la Bóveda de Mapas directamente en la misma vista modal, eliminando modales anidados o solapados.
  - Botón de retroceso fluido `[← Menú]` para regresar a las opciones del documento sin cerrar el modal.
  - Modal de confirmación de acción peligrosa (*Danger confirmation*) al limpiar o descartar el lienzo para evitar pérdida accidental de trabajo.

### D. Lienzo Central (Canvas Infinito)
- Zoom continuo (10% a 1000%) y Pan inercial de dos dedos.
- Renderizado de trazos por GPU a 120Hz con `androidx.ink`.
- Fondos intercambiables: Blanco puro, cuadrícula de puntos (*dot grid*), milimetrado.

### E. Barra Inferior Flotante (Footer)
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