#!/bin/bash

# Configure App Store Connect API key settings
ISSUER_ID="18e19531-f1a6-4489-93ec-016e4260b4fd"
KEY_ID="9F33Z6XYHY"
PRIVATE_KEY_PATH="AuthKey_9F33Z6XYHY.p8"

IPA_FILE=$(find . -name "*.ipa" -o -name "App.ipa" | head -n 1)

if [ -z "$IPA_FILE" ]; then
  echo "Error: IPA file nahi mili!"
  exit 1
fi

echo "Uploading $IPA_FILE to App Store Connect..."
pip3 install codemagic-cli-tools
if app-store-connect publish \
  --issuer-id "$ISSUER_ID" \
  --key-id "$KEY_ID" \
  --private-key "$(cat "$PRIVATE_KEY_PATH")" \
  --path "$IPA_FILE"; then
  echo "Upload complete! Check TestFlight in 10-15 minutes."
else
  echo "Upload failed."
  exit 1
fi