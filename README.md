# Cognitive Canvas 🧠🎨

> **Lienzo de Pensamiento Visual Activo e Ingeniería Cognitiva**  
> Optimizado para **Samsung Galaxy Tab S10 Lite (Wacom EMR / S-Pen 120Hz)** y backend serverless con **Gemini 2.0 Flash**.

---

## 🚀 Despliegue y Pruebas en Hardware Real (Galaxy Tab S10 Lite)

Para probar la app en la tablet física sin lidiar con comandos manuales de ADB o esperas de Expo Go (que no soporta las librerías nativas `androidx.ink`), disponemos de un script de compilación y despliegue rápido automatizado:

### Comando de un solo paso:
```bash
npm run tablet
# o alternativamente:
npm run build:android
```

### ¿Qué hace el script (`scripts/install-app.sh`)?
1. **Verificación ADB:** Comprueba que la tablet esté conectada vía USB o Wi-Fi (`adb devices`) en modo depuración.
2. **Compilación Incremental con Gradle:** Ejecuta `./gradlew installDebug` dentro de `apps/expo/android/` (tiempo típico de build incremental: ~14 segundos).
3. **Arranque Automático:** Lanza la actividad principal de inmediato en la pantalla de la tablet (`am start -n com.cognitivecanvas.app/.MainActivity`).

---

## 📁 Estructura del Monorepo

El proyecto está organizado como un monorepo administrado con **npm workspaces**:

```text
cognitive-canvas/
├── apps/
│   └── expo/                 # App React Native 0.76 (New Architecture)
│       ├── android/          # Módulos nativos Android (Jetpack Ink, S-Pen EMR)
│       │   └── app/src/main/java/com/cognitivecanvas/app/ink/
│       │       ├── JetpackInkView.kt        # Renderizador 120Hz y gestión S-Pen
│       │       └── JetpackInkViewManager.kt # Puente de eventos nativos
│       └── src/
│           ├── components/   # UI: Toolbar, Halo, Tooltips, Drawer
│           └── hooks/        # useCanvasState (coordinación de lienzo y hardware)
├── packages/
│   ├── core/                 # Lógica compartida y contratos tipados
│   │   ├── src/
│   │   │   ├── parser/       # VisualASTEngine (Motor de 5 Niveles - ver VISUAL_AST_SPEC.md)
│   │   │   └── types/        # Contratos TypeScript canónicos (AST, Ink, Persistence, IA)
│   │   └── test/             # Tests unitarios Vitest para el Visual AST y esquemas
│   └── functions/            # Lambdas Serverless de SST v3 (Compilación Gemini 2.0 Flash)
├── scripts/
│   └── install-app.sh        # Automatización de build e instalación en Galaxy Tab
└── .antigravity/docs/        # Especificaciones maestras (MASTER_SPEC, VISUAL_AST_SPEC, DECISION_RATIONALE)
```

---

## 🛠️ Desarrollo Local

### 1. Servidor de Desarrollo Metro (Expo)
Para desarrollo de TypeScript/React en caliente (Fast Refresh):
```bash
npm run dev --workspace=@cognitive-canvas/app
# o dentro de apps/expo:
npx expo start
```

### 2. Pruebas Unitarias del Motor Visual AST
Para ejecutar los tests de clasificación geométrica, agrupamiento y acoplamiento magnético:
```bash
npm test --workspace=@cognitive-canvas/core
```

### 3. Backend Serverless (SST v3)
Para levantar la infraestructura local de AWS (S3, DynamoDB, Lambdas):
```bash
npx sst dev
```

---

## 📖 Especificaciones y Arquitectura
- Plan de Implementación: [IMPLEMENTATION_PLAN.md](file:///.antigravity/docs/IMPLEMENTATION_PLAN.md)
- Especificación Maestra: [MASTER_SPEC.md](file:///.antigravity/docs/MASTER_SPEC.md)
- Registro de Decisiones de Arquitectura: [DECISION_RATIONALE.md](file:///.antigravity/docs/DECISION_RATIONALE.md)
- Especificación de Lienzo y UI: [UI_AND_CANVAS_SPEC.md](file:///.antigravity/docs/UI_AND_CANVAS_SPEC.md)

