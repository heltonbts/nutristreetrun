#!/usr/bin/env bash
#
# Esconde mobile/.env.local durante o Archive de produção para que o bundle
# use o .env (Railway prod) em vez do IP de LAN do dev local.
#
# Uso: npm run release:ios   (a partir de mobile/)
# Depois: no Xcode -> Product > Clean Build Folder > Archive > Distribute.
# Volte aqui e pressione ENTER para restaurar o .env.local.

set -euo pipefail

MOBILE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$MOBILE_DIR/.env.local"
BAK_FILE="$MOBILE_DIR/.env.local.release-bak"

restore() {
  if [ -f "$BAK_FILE" ]; then
    mv "$BAK_FILE" "$ENV_FILE"
    echo "✓ .env.local restaurado (dev local de volta ao normal)"
  fi
}
trap restore EXIT

if [ -f "$ENV_FILE" ]; then
  mv "$ENV_FILE" "$BAK_FILE"
  echo "✓ .env.local escondido — o build vai usar .env:"
  grep API_URL "$MOBILE_DIR/.env" || true
else
  echo "ℹ .env.local não existe — build já usaria .env. Nada a esconder."
fi

echo ""
echo "Abrindo o workspace no Xcode..."
open "$MOBILE_DIR/ios/NutriStreetRun.xcworkspace"

echo ""
echo "No Xcode:"
echo "  1. Product > Clean Build Folder"
echo "  2. Selecione 'Any iOS Device (arm64)'"
echo "  3. Product > Archive"
echo "  4. Distribute App > App Store Connect > Upload"
echo ""
read -r -p ">> Pressione ENTER AQUI somente DEPOIS que o Archive terminar para restaurar o .env.local... "
