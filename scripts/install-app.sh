#!/usr/bin/env bash

# ==============================================================================
# Cognitive Canvas - Build & Install Script for Galaxy Tab S10 Lite
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ANDROID_DIR="$ROOT_DIR/apps/expo/android"
PACKAGE_NAME="com.cognitivecanvas.app"
MAIN_ACTIVITY=".MainActivity"

echo "🎨 ========================================================"
echo "   COGNITIVE CANVAS - BUILD & INSTALL (Android / S-Pen)"
echo "   Target: Samsung Galaxy Tab S10 Lite (Wacom EMR 120Hz)"
echo "=========================================================="

# 1. Check ADB connection
if ! command -v adb &> /dev/null; then
    echo "❌ Error: 'adb' no está instalado o no se encuentra en el PATH."
    exit 1
fi

echo "🔍 Buscando dispositivos Android conectados..."
DEVICES=$(adb devices | grep -v "List" | grep "device$" | awk '{print $1}')

if [ -z "$DEVICES" ]; then
    echo "⚠️  No se encontró ninguna tablet o dispositivo Android conectado por ADB."
    echo "   Por favor conecta tu Galaxy Tab por cable USB o Wi-Fi debugging:"
    echo "   1. Activa 'Opciones de desarrollador' y 'Depuración por USB' en la tablet."
    echo "   2. Ejecuta 'adb devices' para autorizar la conexión."
    exit 1
fi

DEVICE_MODEL=$(adb -s "$DEVICES" shell getprop ro.product.model 2>/dev/null || echo "$DEVICES")
DEVICE_NAME=$(adb -s "$DEVICES" shell getprop ro.product.name 2>/dev/null || echo "")
echo "✅ Dispositivo detectado: $DEVICE_MODEL ($DEVICE_NAME) [ID: $DEVICES]"

# 2. Parse arguments
DO_CLEAN=false
DO_LAUNCH=true

for arg in "$@"; do
    case $arg in
        --clean)
            DO_CLEAN=true
            shift
            ;;
        --no-launch)
            DO_LAUNCH=false
            shift
            ;;
        *)
            ;;
    esac
done

# 3. Build & Install APK via Gradle
cd "$ANDROID_DIR"

if [ "$DO_CLEAN" = true ]; then
    echo "🧹 Limpiando build cache de Gradle..."
    ./gradlew clean
fi

echo "⚙️  Compilando e instalando APK Debug en la tablet..."
START_TIME=$(date +%s)

./gradlew installDebug

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
echo "⚡ Build e instalación completados exitosamente en ${DURATION}s."

# 4. Auto-launch the app on the tablet
if [ "$DO_LAUNCH" = true ]; then
    echo "🚀 Abriendo Cognitive Canvas en tu Galaxy Tab..."
    adb -s "$DEVICES" shell am start -n "$PACKAGE_NAME/$MAIN_ACTIVITY" > /dev/null
    echo "✨ ¡App iniciada en pantalla!"
fi

echo "🎉 Listo para dibujar y probar con el S-Pen."
