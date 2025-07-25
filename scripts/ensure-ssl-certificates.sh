#!/usr/bin/env bash

set -euo pipefail

if [ ! -f "scripts/docker/local-nginx/certs/helperai_dev.crt" ]; then
    pnpm generate-ssl-certificates

    # Check if uname exists (to avoid errors on native Windows)
    if command -v uname >/dev/null 2>&1; then
        OS_TYPE="$(uname)"
        IS_WSL=false

        # Detect WSL via /proc/version (works for WSL1 and WSL2)
        # and any future variant with similar kernel signatures.
        if grep -qiE 'microsoft|wsl' /proc/version 2>/dev/null; then
            IS_WSL=true
        fi

        # Run chown on native Linux or WSL
        # Set correct ownership
        if [[ "$OS_TYPE" == "Linux" || "$IS_WSL" == true ]]; then
            target_dir="scripts/docker/local-nginx/certs"

            # Change ownership only if we have the rights or can elevate.
            if [ "$(id -u)" -eq 0 ]; then
                # Running as root – give the files back to the invoking user when possible
                chown -R "${SUDO_USER:-$USER}:${SUDO_USER:-$USER}" "$target_dir"
            elif command -v sudo >/dev/null 2>&1; then
                sudo chown -R "$USER:$USER" "$target_dir" || echo "⚠️  Could not change ownership, continuing…"
            else
                echo "Skipping chown: insufficient privileges (not root and no sudo)"
            fi
        fi
    else
        echo "Skipping chown: 'uname' not available (likely native Windows)"
    fi
fi
