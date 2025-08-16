#!/bin/bash

set -e

REQUIRED_NODE_VERSION="v$(cat .node-version)"
REQUIRED_PNPM_VERSION="10.8.0"

cleanup() {
    echo "Shutting down..."
    echo -e "\033[34mℹ️ The app will be stopped, but background services are still running. Use pnpm services:stop to stop them.\033[0m"

    pkill -P $$
    exit 0
}

trap cleanup SIGINT SIGTERM

# Node.js version check
current_node_version=$(node -v 2>/dev/null || echo "nothing")
required_major=$(echo "$REQUIRED_NODE_VERSION" | cut -d'.' -f1)
current_major=$(echo "$current_node_version" | cut -d'.' -f1)

if [ "$current_node_version" = "nothing" ] || [ "$current_major" != "$required_major" ]; then
    echo -e "\033[31m✖ Required Node.js major version is $required_major, but found $current_node_version.\033[0m"
    echo "Please install a compatible version using nvm or your preferred version manager."
    exit 1
fi

corepack enable

# PNPM version check
current_pnpm_version=$(pnpm -v 2>/dev/null || echo "nothing")
if [ "$current_pnpm_version" != "$REQUIRED_PNPM_VERSION" ]; then
    echo -e "\033[31m✖ Required PNPM version is $REQUIRED_PNPM_VERSION, but found $current_pnpm_version.\033[0m"
    echo "Please install the correct version using: corepack prepare pnpm@$REQUIRED_PNPM_VERSION --activate"
    exit 1
fi

pnpm install

pnpm ensure-ssl-certificates

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
