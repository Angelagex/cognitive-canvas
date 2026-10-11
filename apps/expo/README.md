# Cognitive Canvas - Cliente Móvil Android (`apps/expo`) 📱✍️

Este paquete contiene la aplicación móvil principal de **Cognitive Canvas**, desarrollada con **Expo SDK 52 / React Native 0.76** y un motor de tinta nativo de alto rendimiento implementado en **Kotlin con AndroidX Ink**.

Está optimizada para dispositivos con stylus activo **Wacom EMR / S-Pen a 120 Hz** (e.g. Samsung Galaxy Tab S9, S10 Lite, S10+).

---

## 🛠️ Requisitos Previos

* **Node.js:** v20+
* **JDK:** OpenJDK 17 (`JAVA_HOME` apuntando a Java 17)
* **Android SDK:** Platform API 34 o 35, Build-Tools 34.0.0+
* **Dispositivo Físico:** Tablet Samsung Galaxy con S-Pen habilitado y depuración USB/Wi-Fi activada.

---

## 🚀 Flujo de Trabajo y Comandos

### 1. Iniciar el Servidor Metro (JavaScript / TypeScript)
Permite desarrollo con recarga en caliente (Fast Refresh) para componentes de interfaz, hooks y capas SVG:
```bash
# Dentro de apps/expo:
npx expo start -c

# O desde la raíz del monorepo:
npm run dev --workspace=@cognitive-canvas/app
```

### 2. Compilar e Instalar el Build Nativo en la Tablet
Cada vez que se modifica código en `android/` (Kotlin, recursos nativos o dependencias de Gradle), se debe compilar e instalar el APK de depuración:
```bash
# Desde la raíz del monorepo:
npm run tablet
# O directamente el script:
./scripts/install-app.sh
```

El script `install-app.sh`:
1. Verifica la conexión activa con la tablet (`adb devices`).
2. Ejecuta `./gradlew installDebug` de forma incremental (~10-15 segundos).
3. Lanza la actividad principal automáticamente en pantalla.

---

## 🏛️ Arquitectura del Módulo Nativo (`android/`)

El puente entre React Native y el motor AndroidX Ink reside en:
`android/app/src/main/java/com/cognitivecanvas/app/ink/`

| Componente | Responsabilidad |
| :--- | :--- |
| `JetpackInkView.kt` | Vista raíz nativa. Orquesta el pipeline táctil a 120 FPS, handoff sin parpadeo (Zero-Flicker) y el ciclo de vida de los trazos. |
| `JetpackInkViewManager.kt` | `SimpleViewManager` de React Native que expone comandos de control (`clear`, `undo`, `redo`, `loadStrokes`, `exportHighResPng`) y despacha eventos hacia JS. |
| `tools/CanvasTransformManager.kt` | Gestiona el zoom ($25\% \dots 400\%$) y paneo 2D, desacoplando la matriz de captura de pantalla de la matriz de GPU. |
| `tools/SpatialHashGrid.kt` | Grilla bidimensional hash con celdas de $64\text{ dp}$ en World DP para detección $O(1)$ de colisiones en hover, borrador y lazo. |
| `tools/LassoSelectionManager.kt` | Detección Point-in-Polygon en World DP y manipulación visual afín a 120 Hz sin recrear objetos `Stroke` en memoria. |
| `tools/StrokeEraser.kt` | Algoritmo de borrado vectorial rápido por trazo completo. |
| `tools/DrawAndHoldManager.kt` | Detección de dwell ($450\text{ ms}$) con vibración háptica para regularizar líneas, flechas y rectángulos a mano alzada. |
| `events/InkEventEmitter.kt` | Canal unificado para emitir eventos sintéticos tipados (`topStrokeEnd`, `topSelectionChanged`, `topHover`, `topFingerTap`). |

---

## 🎨 Capas de Interfaz de Usuario (`src/`)

La interfaz del lienzo está dividida en capas ortogonales superpuestas con `pointerEvents="box-none"`:

1. **`components/JetpackInkCanvas.tsx`:** Componente anfitrión que enlaza la vista nativa de Android con las propiedades reactivas del estado.
2. **`components/toolbar/GoodnotesToolbar.tsx`:** Barra superior ergonómica con herramientas (`pen`, `highlighter`, `eraser`, `lasso`, `pan`), selectores de grosor y paletas de color armónicas sincronizadas.
3. **`components/toolbar/popovers/ContextualToolPill.tsx`:** Barra flotante contextual de selección por lazo con accesos directos para etiquetar atributos, duplicar, cambiar color o borrar.
4. **`components/canvas/SemanticAnchorTooltip.tsx`:** Píldora compacta `[🏷️ Atributo]` que se despliega sobre entidades en Single-Finger Tap y da acceso al modal de anclaje conceptual.
5. **`components/canvas/PlacedAttributeBadges.tsx`:** Resplandor suave difuso (Under-Glow Shading) e insignias interactivas (`⚙️`, `💡`, `📊`) ancladas en la esquina superior derecha.
6. **`components/canvas/GhostOverlay.tsx`:** Capa de proyección analítica HUD que renderiza macro-islas temáticas y puentes cognitivos generados por Gemini.
7. **`components/canvas/FloatingFooter.tsx`:** Barra inferior discreta para alternar el modo *Solo Stylus* y reiniciar el zoom a $100\%$.

---

## 🪝 Hooks de Coordinación (`src/hooks/`)

* **`useCanvasState.ts`:** Coordina la persistencia del documento (`.cmn`), el historial de deshacer/rehacer y las herramientas activas.
* **`useCanvasHover.ts`:** Procesa eventos de S-Pen Air View Hover, detecta clústeres de trazos y gestiona la apertura contextual de tooltips semánticos.
* **`useCanvasAst.ts`:** Mantiene sincronizado el Visual AST local con las selecciones y mutaciones del usuario.
