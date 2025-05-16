#!/bin/bash

set -e

cleanup() {
    echo "Shutting down..."

    pkill -P $$

    echo -e "\033[34mℹ️ The app is stopped, but background services are still running. Use pnpm services:stop to stop them.\033[0m"

    exit 0
}

trap cleanup SIGINT SIGTERM

if [ ! -f "scripts/docker/local-nginx/certs/helperai_dev.crt" ]; then
    pnpm generate-ssl-certificates
fi

corepack enable
pnpm install

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo ".env.local file not found."
    read -p "Would you like to pull environment variables from Vercel? (y/n) " answer

    if [ "$answer" = "y" ] || [ "$answer" = "Y" ]; then
        echo "Pulling environment variables from Vercel..."
        pnpm vercel link && pnpm vercel env pull --environment=development
    else
        echo "Please set up your .env.local file by copying .env.local.sample to .env.local and filling in the required values"
        exit 1
    fi
elif [ -f ".vercel/project.json" ]; then
    echo "Found existing Vercel project configuration. Pulling latest environment variables..."
    pnpm vercel env pull --environment=development
fi

pnpm db:migrate

# Add the local CA to the Node.js environment
export NODE_EXTRA_CA_CERTS="$(mkcert -CAROOT)/rootCA.pem"

pnpm with-dev-env pnpm heroku local -f scripts/Procfile.dev
