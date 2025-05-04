#!/usr/bin/env bash

set -euo pipefail

# Check if mkcert is installed
if ! command -v mkcert &> /dev/null; then
  echo "mkcert is not installed. Please install it first:"
  echo "  brew install mkcert"
  exit 1
fi

# Install local CA if not already installed
mkcert -install

# Create certs directory if it doesn't exist
mkdir -p scripts/docker/local-nginx/certs
cd scripts/docker/local-nginx/certs

# Generate certificates
echo "Generating certificates for helperai.dev..."
mkcert helperai.dev "*.helperai.dev"
mv helperai.dev+1.pem helperai_dev.crt
mv helperai.dev+1-key.pem helperai_dev.key

echo "SSL certificates generated successfully in scripts/docker/local-nginx/certs/"
