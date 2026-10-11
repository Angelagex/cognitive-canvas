# Cognitive Canvas 🧠🎨

> **Lienzo de Pensamiento Visual Activo e Ingeniería Cognitiva**  
> Diseñado para hardware stylus activo (**Samsung Galaxy Tab / Wacom EMR / S-Pen a 120 Hz**), procesamiento espacial O(1) con **AndroidX Ink**, y compilación cognitiva multimodal con **Google Gemini**.

---

## 🧭 Visión del Producto

Cognitive Canvas es un entorno de trabajo para el desarrollo de **esquemas mentales de alto orden**, fundamentado en la metodología de aprendizaje no lineal (Mirror Mapping / iCanStudy del Dr. Justin Sung), la taxonomía **PACER** y los principios de auditoría **GRINDE**.

A diferencia de libretas de dibujo tradicionales o herramientas de notas lineales:
* Los trazos manuscritos se indexan espacialmente en **World DP** para habilitar reconocimiento semántico a latencia cero.
* El estudiante agrupa ideas en **macro-islas interconectadas**, ancla atributos funcionales (Mecanismos Causales, Analogías, Evidencias) y recibe diagnósticos cognitivos automatizados vía IA para evitar el pensamiento lineal pasivo y la sobrecarga de flashcards.

---

## 📁 Estructura del Monorepo

El proyecto está organizado como un monorepo gestionado con **npm workspaces**:

```text
cognitive-canvas/
├── apps/
│   └── expo/                 # Cliente móvil Android (React Native 0.76 + AndroidX Ink)
│       ├── android/          # Módulos nativos en Kotlin (Motor de 120 FPS, S-Pen EMR)
│       └── src/              # UI reactiva, Toolbars contextuales, Overlays HUD
├── packages/
│   ├── core/                 # Visual AST Engine, esquemas de tipos y contratos compartidos
│   └── functions/            # Lambdas serverless de compilación cognitiva
├── docs/                     # Documentación técnica canónica y especificaciones
│   ├── 01_ARCHITECTURE_AND_INVARIANTS.md
│   ├── 02_CANVAS_INTERACTION_SPEC.md
│   ├── 03_COGNITIVE_AST_AND_PIPELINE.md
│   └── archive/              # Historial de especificaciones previas archivadas
├── infra/                    # Infraestructura como código con SST Ion (AWS)
└── scripts/
    └── install-app.sh        # Script automatizado de compilación e instalación por ADB
```

---

## 🚀 Despliegue y Pruebas en Hardware Real (Galaxy Tab)

Dado que la aplicación aprovecha módulos nativos de bajo nivel (`androidx.ink.strokes`, `InProgressStrokesView`), se ejecuta como un **Development Build nativo** conectado a Metro:

### 1. Compilación e Instalación Rápida vía ADB
Con la tablet conectada por cable USB o Wi-Fi (`adb connect IP:5555`):
```bash
# Compila con Gradle de forma incremental e instala en la tablet en ~15s:
npm run tablet
# o alternativamente:
npm run build:android
```

### 2. Servidor de Desarrollo Metro (Fast Refresh)
Para editar TypeScript/React Native en tiempo real:
```bash
npm run dev --workspace=@cognitive-canvas/app
# o dentro del directorio apps/expo:
cd apps/expo && npx expo start -c
```

---

## 🧪 Pruebas Automatizadas

El paquete `@cognitive-canvas/core` cuenta con una suite completa de pruebas unitarias sobre clasificación geométrica, clustering de trazos y contratos de serialización:

```bash
# Ejecutar tests unitarios con Vitest:
cd packages/core && npx vitest run
```

---

## 📚 Documentación Técnica Canónica

Toda la arquitectura, reglas matemáticas e interacción ergonómica están formalizadas en la carpeta [`docs/`](file:///home/angel/personal/cognitive-canvas/docs):

1. **[01. Arquitectura del Motor y Sistema de Invariantes Espaciales](file:///home/angel/personal/cognitive-canvas/docs/01_ARCHITECTURE_AND_INVARIANTS.md):**
   * Coordenadas universales en World DP ($x = (screenX - tx) / (scale \cdot density)$).
   * Indexación espacial $O(1)$ con `SpatialHashGrid.kt` (celdas de $64\text{ dp}$).
   * Handoff sin parpadeo (Zero-Flicker) con doble búfer en `dispatchDraw()`.
   * Formato de persistencia en 3 capas (`.cmn`) con serialización plana `flatPoints: [x, y, p, t]`.

2. **[02. Especificación de Interacción Ergonómica y Gestos en el Lienzo](file:///home/angel/personal/cognitive-canvas/docs/02_CANVAS_INTERACTION_SPEC.md):**
   * Stylus vs. Dedos: Rechazo de palma estricto, navegación a 2 dedos y doble tap para Undo/Redo.
   * Lazo momentáneo mediante S-Pen Barrel Button y transformación desacoplada $O(1)$ a 120 Hz.
   * Gestos inteligentes: Scratch-out invariante al zoom y Draw-and-hold ($450\text{ ms}$) con háptica.
   * Presets de lienzo (`dark_slate`, `charcoal_dark`, `warm_ivory`, `pure_white`) y paletas contextuales.

3. **[03. Pipeline Cognitivo, Visual AST y Compilación Macro](file:///home/angel/personal/cognitive-canvas/docs/03_COGNITIVE_AST_AND_PIPELINE.md):**
   * Metodología de Justin Sung, auditoría GRINDE y taxonomía PACER.
   * OCR local offline con ML Kit Digital Ink a escala canónica ($160\text{ dp}$).
   * Feedback visual Under-Glow Shading e insignias funcionales.
   * Compilación macro con Google Gemini, diagnóstico de madurez y visualización en Ghost Overlay.
