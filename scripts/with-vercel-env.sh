#!/bin/bash

if [ "$#" -lt 2 ]; then
    echo "Usage: $0 <preview|production> <command...>"
    exit 1
fi

if ! command -v vercel &> /dev/null; then
    echo "Installing Vercel CLI..."
    npm install -g vercel
fi

# Set scope (default to anti-work if VERCEL_SCOPE is not set)
SCOPE=${VERCEL_SCOPE:-anti-work}

# Set up project directory structure
if [ -n "$VERCEL_PROJECT" ]; then
    PROJECT_DIR=".vercel/$VERCEL_PROJECT"
    mkdir -p "$PROJECT_DIR"
    
    if [ ! -f "$PROJECT_DIR/.vercel/project.json" ]; then
        echo "Linking Vercel project '$VERCEL_PROJECT'..."
        vercel link --cwd $PROJECT_DIR --scope $SCOPE --project "$VERCEL_PROJECT" --yes
    fi
else
    PROJECT_DIR="."
    if [ ! -d ".vercel" ]; then
        vercel link --scope $SCOPE --project helperai --yes
    fi
fi

# First argument is the environment
ENV=$1
shift  # Remove first argument, leaving remaining command

if [ "$ENV" != "preview" ] && [ "$ENV" != "production" ]; then
    echo "Environment must be either 'preview' or 'production'"
    exit 1
fi

echo "Pulling Vercel $ENV environment variables..."
vercel env pull --cwd $PROJECT_DIR .env.$ENV.local --environment=$ENV --yes

if [ ! -f "$PROJECT_DIR/.env.$ENV.local" ]; then
    echo "Failed to pull environment variables"
    exit 1
fi

echo "Running command: $@"
dotenv -e "$PROJECT_DIR/.env.$ENV.local" -- "$@"
RESULT=$?

# rm "$PROJECT_DIR/.env.$ENV.local"

exit $RESULT
