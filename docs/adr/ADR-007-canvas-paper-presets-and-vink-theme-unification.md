# ADR-007: Consolidación de 5 Presets Canónicos de Papel, Migración de Esquemas y Unificación de Identidad Visual Vink

- **Status:** Aprobado e Implementado
- **Fecha:** 2026-11-04
- **Ámbito:** `apps/expo/src/types/canvas.ts`, `apps/expo/src/theme/`, `apps/expo/src/components/toolbar/`, `apps/expo/src/components/header/`, `apps/expo/src/components/modals/`, `apps/expo/src/features/hub/tabs/SettingsTab.tsx`

---

## 1. Contexto y Diagnóstico

### 1.1 Síntomas y Fragmentación de Presets
1. **Proliferación y Duplicidad de Temas de Papel:** El sistema acumulaba hasta 10 identificadores con duplicaciones explícitas (`tinta` vs `tinta_papel`, `folio` vs `pure_white`, `cobalto_crema` claro vs oscuro sin nombres diferenciados), sobrecargando cognitivamente la barra de herramientas.
2. **Discrepancias de Contraste:** Algunos fondos y ternas no cumplían de manera predecible con los umbrales ergonómicos de contraste visual ($\ge 13:1$ para texto y $\Delta E \ge 35$ para diferenciación perceptual).
3. **Desincronización de Skins de Interfaz:** Pantallas clave como el encabezado del Hub (`WorkspaceHubScreen`), la pestaña de configuración (`SettingsTab`) y los modales del Canvas (`DocumentActionsModal`) no reaccionaban al cambio de skin global (`useSkin()`), manteniendo fondos oscuros estáticos.
4. **Desplazamiento Vertical Asimétrico de Fuentes en Android:** Debido a `includeFontPadding: true` por defecto en React Native Android, las fuentes como *Plus Jakarta Sans*, *Barlow Condensed* y *Space Mono* presentaban un relleno superior excesivo, haciendo que el texto en botones, pestañas y chips con iconos se renderizara perceptiblemente por debajo de la línea central.
5. **Redundancia Visual en la Cabecera del Canvas:** El botón de regreso decía "Hub" (que se leía "HV") y tenía adyacente un logotipo de Vink redundante, en lugar de un único control de identidad y navegación cohesionado.

---

## 2. Decisiones Arquitectónicas (ADR)

### 2.1 Cinco Presets Canónicos de Papel de Lienzo
Se consolida el sistema exclusivamente en **5 presets canónicos** calibrados matemáticamente:

1. **Cobalto y Crema (`crema`):** Fondo `#F3EDE0`, Puntos `#C9C5BB` (1.48:1), Tinta `#0C0E14` (16.5:1), Tríada `["#0C0E14", "#2F3DFF", "#C92500"]`.
2. **Niebla (`niebla`):** Fondo `#E8ECF3`, Puntos `#C0C4CD` (1.47:1), Tinta `#151B2B` (14.5:1), Tríada `["#151B2B", "#2F3DFF", "#267458"]`.
3. **Obsidiana (`obsidiana`):** Fondo `#0C0E14`, Puntos `#363639` (1.60:1), Tinta `#F3EDE0` (16.5:1), Tríada `["#F3EDE0", "#6471FF", "#FFB320"]`.
4. **Tinta y Papel (`tinta`):** Fondo `#10142A`, Puntos `#393B4B` (1.65:1), Tinta `#F3EEE3` (15.7:1), Tríada `["#F3EEE3", "#7C93FF", "#FF6B4A"]`.
5. **Pizarra (`pizarra`):** Fondo `#15241F`, Puntos `#3A463F` (1.63:1), Tinta `#EFEBDD` (13.5:1), Tríada `["#EFEBDD", "#7FD6B0", "#F2C75C"]`.

### 2.2 Migración de Esquemas en Caliente (`migrateCanvasTheme`)
Para garantizar cero regresión en lienzos almacenados en la base de datos o archivos `.cmn` existentes, se implementó una función de resolución canónica pura:
- `crema`, `warm_ivory` $\rightarrow$ `crema`
- `folio`, `pure_white` $\rightarrow$ `niebla`
- `cobalto_crema`, `noche`, `charcoal_dark` $\rightarrow$ `obsidiana`
- `dark_slate`, `tinta_papel`, `tinta` $\rightarrow$ `tinta`
- `pizarra` $\rightarrow$ `pizarra`

### 2.3 Separación de Preferencia Global vs Estado del Documento
- **Preferencia Global (`default_theme`):** Almacenado en `user_preferences.json`. La configuración en `SettingsTab` permite al estudiante predeterminar el papel inicial con el que se instanciarán todos los nuevos lienzos creados.
- **Metadatos por Mapa (`canvas_theme`):** Persistido dentro de `ExtendedDocumentMetadata`. Cada documento retiene su identidad cromática única al ser recargado.

### 2.4 Control Unificado de Retorno en Canvas (`[ < Vink ]`)
Se sustituyó la etiqueta textual "Hub" y el logo contiguo por un único botón con forma de cápsula que integra el icono de retorno (`ArrowLeft`) y la marca denominativa de Vink (`VinkLogo`). Actúa simultáneamente como control táctil de navegación y recordatorio de la identidad visual de la aplicación.

### 2.5 Invariante de Renderizado Tipográfico en Android
Se impone como estándar de diseño en la capa de componentes:
- `includeFontPadding: false` en todos los estilos de texto para anular la holgura nativa de Android.
- `textAlignVertical: "center"` en botones, tarjetas y chips de navegación.
- Contenedores flex con `justifyContent: "center"` y `alignItems: "center"`.

### 2.6 Sincronización Reactiva de Skins (`useSkin()`)
Se eliminó la selección dual estática de dirección de identidad visual en Configuración, dejando fija la identidad Cobalto y Crema. Todo el árbol visual (`WorkspaceHubScreen`, `SettingsTab`, `KnowledgeMatrixTab`, `DocumentActionsModal`, `ClearCanvasConfirmModal`) se suscribió reactivamente a `useSkin()`, asegurando repintado inmediato al alternar entre las skins **Crema**, **Noche** y **Tinta**.

---

## 3. Consecuencias y Validación

1. **Cero regresión en datos existentes:** Todos los mapas creados bajo versiones previas se abren automáticamente en el preset normativo correspondiente sin alteración de trazos ni pérdida de estado.
2. **Legibilidad garantizada:** Toda combinación de trazo y fondo cumple holgadamente WCAG AAA ($\ge 13:1$ en tinta primaria y $\ge 4.5:1$ en acentos).
3. **Alineación visual simétrica:** Eliminado el defecto de texto desplazado hacia abajo en botones de tabletas Android.
4. **Verificación técnica:** Suite de tipos aprobada con 0 errores (`npx tsc --noEmit -p apps/expo/tsconfig.json`).

