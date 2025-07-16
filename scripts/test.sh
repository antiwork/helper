#!/bin/bash
# This script automates the process of setting up the test environment and running e2e tests.
# It ensures services are running, the database is migrated and seeded, and then executes the Playwright test suite.
set -e

# Stop any previously running instances to ensure a clean slate.
# Use --no-backup to avoid creating a new backup that might be used on start.
echo "🛑 Ensuring no Supabase services are running..."
pnpm run with-test-env pnpm supabase stop --no-backup

# Parse command line arguments
PLAYWRIGHT_COMMAND=""

# Collect all arguments to pass to playwright
while [[ $# -gt 0 ]]; do
    PLAYWRIGHT_COMMAND="$PLAYWRIGHT_COMMAND $1"
    shift
done

# If no arguments provided, default to basic playwright test
if [ -z "$PLAYWRIGHT_COMMAND" ]; then
    PLAYWRIGHT_COMMAND="playwright test"
fi

# Trap to ensure cleanup on exit
CLEANUP_NEEDED=false

cleanup() {
    if [ "$CLEANUP_NEEDED" = true ]; then
        echo "🧹 Cleaning up services..."
        echo "🛑 Stopping Supabase services..."
        pnpm run with-test-env pnpm supabase stop --no-backup 2>/dev/null || true
    fi
}
trap cleanup EXIT

echo "🚀 Starting e2e test setup..."

# Debug: Check current directory and file existence
echo "📍 Current directory: $(pwd)"
echo "🔍 Checking for .env.test.local..."

# Ensure local environment variables are sourced
if [ ! -f ".env.test.local" ]; then
    echo "⚠️ .env.test.local not found. Please create it from .env.local.sample."
    echo "📁 Files in current directory:"
    ls -la .env* 2>/dev/null || echo "No .env files found"
    exit 1
else
    echo "✅ .env.test.local found"
fi

# Source the environment file to get SUPABASE_PROJECT_ID
set -o allexport
source .env.test
source .env.test.local
set +o allexport

# Check for existing Supabase containers and clean them up if found
echo "🔍 Checking for existing Supabase containers for project ${SUPABASE_PROJECT_ID}..."
EXISTING_CONTAINERS=$(docker ps -a -q --filter "name=${SUPABASE_PROJECT_ID}" 2>/dev/null || true)
if [ ! -z "$EXISTING_CONTAINERS" ]; then
    echo "🧹 Found existing Supabase containers for project ${SUPABASE_PROJECT_ID}, cleaning up..."\
    echo "🛑 Stopping containers..."
    docker stop $EXISTING_CONTAINERS || true
    echo "🗑️ Removing containers..."
    docker rm $EXISTING_CONTAINERS || true
    echo "✅ Existing containers cleaned up"
else
    echo "✅ No existing Supabase containers found for project ${SUPABASE_PROJECT_ID}"
fi

# Start Supabase services
echo "🔄 Starting Supabase services..."
pnpm run with-test-env pnpm supabase start
CLEANUP_NEEDED=true

# Additional wait for Auth service to be fully ready
echo "⏳ Waiting for Auth service to initialize..."
sleep 5

echo "🔄 Resetting database..."
pnpm run with-test-env pnpm supabase db reset

# Apply database migrations to the test database
echo "📦 Applying database migrations..."
pnpm run with-test-env drizzle-kit migrate --config ./db/drizzle.config.ts

# Seed the database with test data
echo "🌱 Seeding the database..."
pnpm run with-test-env pnpm tsx --conditions=react-server ./db/seeds/seedDatabase.ts

echo "📦 Build packages.."
pnpm run-on-packages build

# Setup Playwright
echo "🎭 Setting up Playwright..."
pnpm run with-test-env playwright install --with-deps

# Run auth setup for Playwright
echo "🔐 Setting up authentication for tests..."
pnpm run with-test-env playwright test tests/e2e/setup/auth.setup.ts --project=setup

# Run the e2e tests
echo "🧪 Running Playwright e2e tests..."
pnpm run with-test-env $PLAYWRIGHT_COMMAND

echo "✅ All tests completed successfully!"
echo "🎉 Test run complete!"