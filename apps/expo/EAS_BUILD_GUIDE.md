# Guía de Compilación de Desarrollo con EAS Build (Android Development Build)

Esta guía documenta los pasos necesarios para realizar la compilación de desarrollo (**Development Build**) en Android utilizando **EAS Build**, asegurando que el scope de carga esté estrictamente delimitado al paquete de la app (`apps/expo`) y sus dependencias compartidas (`packages/core`).

---

## 🔒 Delimitación de Scope Monorepo en EAS

Para evitar que EAS suba todo el repositorio padre (como `infra/`, `packages/functions/` o archivos temporales de SST), la configuración se ha delimitado mediante dos mecanismos:

1. **`apps/expo/eas.json`**: Configurado con `"cli": { "appDir": "apps/expo" }` para indicar a la herramienta la raíz de la app dentro del monorepo.
2. **`apps/expo/.easignore` y `.easignore` raíz**: Excluye explícitamente `infra/`, `packages/functions/`, `.sst/`, `.antigravity/` y carpetas de `node_modules`.

---

## 🛠️ Pasos de Intervención del Usuario

### Paso 1: Iniciar Sesión en EAS CLI
Asegúrate de estar autenticado en tu cuenta de Expo:
```bash
npx eas-cli login
```

### Paso 2: Vincular el Proyecto en EAS
Navega a la carpeta de la app e inicializa el proyecto EAS (esto vinculará tu cuenta y agregará el `projectId` a `app.json`):
```bash
cd apps/expo
npx eas project:init
```

### Paso 3: Lanzar la Compilación de Desarrollo (Android APK)

#### Opción A: Compilación en la Nube de Expo (Recomendado)
Ejecuta el siguiente comando para generar el archivo APK de desarrollo en los servidores de EAS:
```bash
npx eas build --profile development --platform android
```

#### Opción B: Compilación Local en tu Computadora (Si tienes Android SDK local)
Si prefieres no usar créditos de la nube de Expo y tienes Android Studio / Android SDK instalado localmente:
```bash
npx eas build --profile development --platform android --local
```

---

### Paso 4: Instalar el APK en tu Celular Android
- Una vez finalizado el proceso, EAS te entregará un **código QR** y un **enlace directo de descarga del archivo `.apk`**.
- Escanea el código QR desde la cámara de tu teléfono Android para descargar e instalar el archivo APK directamente.

---

### Paso 5: Iniciar el Servidor Metro & Probar Jetpack Ink API
En tu computadora, dentro de la carpeta `apps/expo`, inicia el servidor de desarrollo en modo `--dev-client`:

```bash
cd apps/expo
npx expo start --dev-client
```

1. Abre la aplicación **Cognitive Canvas** que instalaste en tu celular Android.
2. La app se conectará automáticamente a tu servidor Metro en la computadora.
3. ¡Listo! Ya podrás dibujar en el lienzo nativo con **Jetpack Ink API** (`androidx.ink`) con baja latencia y respuesta háptica.
