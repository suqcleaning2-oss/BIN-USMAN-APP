#!/usr/bin/env bash
set -e

mkdir -p ~/.appstoreconnect/private_keys

# Python se private key ki formatting aur line breaks clean karna
python3 -c "
import os
raw_key = os.environ.get('APP_STORE_CONNECT_PRIVATE_KEY', '')
key_id = os.environ.get('APP_STORE_CONNECT_KEY_IDENTIFIER', '')
formatted_key = raw_key.replace('\\n', '\n').strip()
file_path = f'/Users/builder/.appstoreconnect/private_keys/AuthKey_{key_id}.p8'
with open(file_path, 'w') as f:
    f.write(formatted_key + '\n')
"

# Upload via altool
xcrun altool --upload-app \
  -f "ios/App/build/ipa/BinUsman.ipa" \
  -t ios \
  --apiKey "$APP_STORE_CONNECT_KEY_IDENTIFIER" \
  --apiIssuer "$APP_STORE_CONNECT_ISSUER_ID"
