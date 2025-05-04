#!/bin/bash

if [ "$#" -lt 2 ]; then
    echo "Usage: $0 <preview|production> <command...>"
    exit 1
fi

if ! command -v vercel &> /dev/null; then
    echo "Installing Vercel CLI..."
    npm install -g vercel
fi

if [ ! -d ".vercel" ]; then
    vercel link --scope gumroad-dbdbd10c --project helperai --yes
fi

# First argument is the environment
ENV=$1
shift  # Remove first argument, leaving remaining command

if [ "$ENV" != "preview" ] && [ "$ENV" != "production" ]; then
    echo "Environment must be either 'preview' or 'production'"
    exit 1
fi

echo "Pulling Vercel $ENV environment variables..."
vercel env pull .env.$ENV.local --environment=$ENV --yes

if [ ! -f .env.$ENV.local ]; then
    echo "Failed to pull environment variables"
    exit 1
fi

echo "Running command: $@"
dotenv -e .env.$ENV.local -- "$@"
RESULT=$?

rm .env.$ENV.local

exit $RESULT
