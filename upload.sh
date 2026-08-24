#!/usr/bin/env bash
set -e

KEY_DIR="$HOME/.appstoreconnect/private_keys"
mkdir -p "$KEY_DIR"
KEY_FILE="$KEY_DIR/AuthKey_${APP_STORE_CONNECT_KEY_IDENTIFIER}.p8"

# Raw key se Header/Footer/Newlines saaf karke pure Base64 decode karna
echo "$APP_STORE_CONNECT_PRIVATE_KEY" | \
  sed 's/-----BEGIN PRIVATE KEY-----//g' | \
  sed 's/-----END PRIVATE KEY-----//g' | \
  tr -d '\n\r ' | \
  base64 --decode > "$KEY_FILE"

xcrun altool --upload-app \
  -f "ios/App/build/ipa/BinUsman.ipa" \
  -t ios \
  --apiKey "$APP_STORE_CONNECT_KEY_IDENTIFIER" \
  --apiIssuer "$APP_STORE_CONNECT_ISSUER_ID"
