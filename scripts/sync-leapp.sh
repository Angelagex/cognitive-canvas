#!/bin/bash
# Sync Leapp AWS credentials from Windows to WSL

WINDOWS_AWS_DIR="/mnt/c/Users/Angel/.aws"
WSL_AWS_DIR="$HOME/.aws"

echo "🔗 Sincronizando credenciales de Leapp (Windows -> WSL)..."

if [ ! -d "$WINDOWS_AWS_DIR" ]; then
  echo "❌ Error: No se encontró el directorio de AWS en Windows: $WINDOWS_AWS_DIR"
  exit 1
fi

mkdir -p "$WSL_AWS_DIR"

# Crear o actualizar symlinks forzados (-sf)
ln -sf "$WINDOWS_AWS_DIR/credentials" "$WSL_AWS_DIR/credentials"
ln -sf "$WINDOWS_AWS_DIR/config" "$WSL_AWS_DIR/config"

echo "✅ Enlaces simbólicos vinculados correctamente:"
echo "   $WSL_AWS_DIR/credentials -> $WINDOWS_AWS_DIR/credentials"
echo "   $WSL_AWS_DIR/config      -> $WINDOWS_AWS_DIR/config"

# Comprobar identidad en AWS si aws-cli está instalado
if command -v aws &> /dev/null; then
  echo ""
  echo "🔍 Verificando sesión activa en AWS..."
  IDENTITY=$(aws sts get-caller-identity 2>&1)
  if [ $? -eq 0 ]; then
    echo "🎉 ¡Sesión de Leapp activa y detectada en WSL!"
    echo "$IDENTITY" | grep -E '("UserId"|"Account"|"Arn")'
  else
    echo "⚠️ Advertencia: No se pudo verificar la sesión de AWS:"
    echo "$IDENTITY"
    echo "Asegúrate de tener una sesión activa encendida en la app de Leapp."
  fi
fi
