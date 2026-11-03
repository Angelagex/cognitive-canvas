# ADR-006: Pipeline Asíncrono Desacoplado de Compilación y Gestor Nativo en Knowledge Matrix

- **Status:** Aprobado e Implementado
- **Fecha:** 2026-11-03
- **Ámbito:** `infra/api.ts`, `packages/functions/src/compile/`, `packages/functions/prompts/compilerPrompt.ts`, `apps/expo/src/features/matrix/`

---

## 1. Contexto y Diagnóstico

### 1.1 Síntomas en Tiempo de Ejecución
1. **HTTP 504 Gateway Timeout a los 30.00 segundos:** Al procesar mapas complejos con análisis socrático exhaustivo, inferencia de invariantes/fragilidades y visión multimodal con Gemini 3.8 Flash, API Gateway HTTP API forzaba el cierre de conexión a exactamente 30s (límite duro no configurable de AWS para integraciones HTTP API).
2. **Congelamiento y Saltos Táctiles en MatrixGraphView:** En Android, los contenedores padre de navegación (`react-navigation`) interceptaban prematuramente los eventos `MotionEvent` al arrastrar el grafo con `PanResponder`. Además, cuando el puntero pasaba sobre sub-elementos SVG (`Rect`, `Circle`, `Text`), `evt.nativeEvent.locationX/locationY` cambiaba de marco de referencia al elemento local, provocando congelamiento visual y saltos erráticos.
3. **Colapso de Altura en Knowledge Matrix:** El contenedor `graphViewport` colapsaba a altura 0 ante configuraciones puras de `flex: 1` sin dimensiones explícitas ancladas al layout.
4. **Interrupción de la Observación del Mapa al Dictar:** El modal de justificación razonada bloqueaba la visibilidad completa del lienzo, impidiendo al usuario ver y explorar sus trazos mientras grababa el audio.

---

## 2. Decisiones Arquitectónicas (ADR)

### 2.1 Desacoplamiento Asíncrono de Compilación (Queue + Polling)
- **POST /compile Inmediato:** Registra el trabajo en DynamoDB con estado `RUNNING`, invoca la función de fondo mediante `InvocationType: "Event"` de AWS Lambda SDK v3, y responde en < 400 ms con `202 Accepted` y `jobId`.
- **Worker Lambda Extendido:** Ejecuta la inferencia de Gemini 3.8 Flash con timeout de 120 segundos. Al finalizar, persiste el resultado estructurado en la tabla de jobs con estado `COMPLETED`.
- **GET /compile/status/{jobId}:** Endpoint ultraligero consultado mediante polling adaptativo por el cliente cada 2 segundos hasta resolución (`COMPLETED` o `FAILED`).

### 2.2 Optimización de Payload de Imagen Fuera de Pantalla
- **OffscreenDocumentRenderer.kt:** Cota del borde máximo a $1536 \text{ px}$ y compresión JPEG al $85\%$.
- **Preservación Canónica:** Se transmiten las cotas canónicas exactas de mundo (`renderedRect: { minX, minY, maxX, maxY }`), garantizando correspondencia matemática 1:1 entre coordenadas visuales y puntos de trazo.
- **Eliminación de Redundancia de Esquema:** Se eliminó la doble envoltura en `compilerPrompt.ts`, emitiendo directamente el payload estructurado.

### 2.3 Migración de PanResponder a RNGH (`GestureDetector`)
- **Gestos Simultáneos:** En `MatrixGraphView.tsx`, se unificaron `Gesture.Pan()` y `Gesture.Pinch()` en `Gesture.Simultaneous(panGesture, pinchGesture)`.
- **Coordenadas de Traslación Globales:** La actualización de coordenadas utiliza `translationX` y `translationY` del gesto nativo, prescindiendo de `locationX`/`locationY` de nodos SVG.
- **Límites de Zoom:** Escala acotada entre $0.35$ y $2.5$.
- **Preservación del Archivo:** Archivo modular con 205 líneas (< 250 líneas y < 300 líneas).

### 2.4 Ontología Jerárquica y Auras Ambientales
- **Carriles SVG Sincronizados:** Tres bandas ontológicas: Tier 2 (Sistemas, $Y \in [0, 240]$), Tier 1 (Mecanismos, $Y \in [270, 530]$), Tier 0 (Primitivas, $Y \in [560, 820]$), sincronizadas en el espacio de mundo del lienzo.
- **Auras Radiales Suaves:** Sustitución de barras rectangulares rígidas por gradientes radiales suaves en el centro de masa de cada dominio.
- **Hashing Determinista de Colores (`getDomainColor`):** Asignación armónica y determinista de paletas a cualquier dominio sin diccionarios estáticos.
- **Tríada Analítica por Componente:** Cada nodo provee `invariant`, `fragility` y `tradeoff`.

### 2.5 Ergonomía del Modal de Explicación Razonada
- Ocultamiento temporal del diálogo durante la grabación con visualización de botón flotante de detención, permitiendo inspección e interacción con el lienzo durante el dictado.
- Reaparición automática y anexado secuencial del texto dictado en el campo de justificación.

---

## 3. Consecuencias y Validación

- **Estabilidad de Red:** Tasa de fallo por timeout reducida al 0% en compilaciones de alta complejidad.
- **Interactividad Táctil:** Paneo y zoom 2D fluido a 60-120 FPS en dispositivos Android.
- **Verificación de Tipos:** `npx tsc --noEmit` completado con 0 errores en todos los módulos (`packages/core`, `packages/functions`, `apps/expo`).

