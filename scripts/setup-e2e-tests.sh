#!/bin/bash

# Helper - E2E Testing Environment Setup Script
# This script sets up everything needed for E2E testing including Supabase, database migrations, and Playwright

set -e

echo "🎭 Setting up E2E Testing Environment for Helper"
echo "================================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the root of the Helper project"
    exit 1
fi

echo "Current directory: $(pwd)"

# Ensure test environment files exist
if [ ! -f ".env.test" ]; then
    echo "⚠️ .env.test not found. Please create it from .env.local.sample."
    echo "📁 Files in current directory:"
    ls -la .env* 2>/dev/null || echo "No .env files found"
    exit 1
fi

echo "✅ .env.test found"

# Create .env.test.local by copying .env.test only if it doesn't exist
if [ "$CI" != "true" ]; then
    if [ ! -f ".env.test.local" ]; then
        echo "📝 Creating .env.test.local from .env.test..."
        cp .env.test .env.test.local
        echo "✅ Created .env.test.local - you can customize it with local values if needed"
    else
        echo "✅ .env.test.local already exists"
    fi
fi

# Source the environment files to get SUPABASE_PROJECT_ID
echo "🔧 Loading environment variables..."
set -o allexport
source .env.test
if [ "$CI" != "true" ] && [ -f ".env.test.local" ]; then
  source .env.test.local
fi
set +o allexport

CI="${CI:-false}"
echo "CI is set to $CI"

# Stop any previously running instances to ensure a clean slate
echo "🛑 Ensuring no Supabase services are running..."
pnpm run with-test-env pnpm supabase stop --no-backup 2>/dev/null || true

# Check for existing Supabase containers and clean them up if found
echo "🔍 Checking for existing Supabase containers for project ${SUPABASE_PROJECT_ID}..."
EXISTING_CONTAINERS=$(docker ps -a -q --filter "name=${SUPABASE_PROJECT_ID}" 2>/dev/null || true)
if [ ! -z "$EXISTING_CONTAINERS" ]; then
    echo "🧹 Found existing Supabase containers for project ${SUPABASE_PROJECT_ID}, cleaning up..."
    echo "🛑 Stopping containers..."
    docker stop $EXISTING_CONTAINERS || true
    echo "🗑️ Removing containers..."
    docker rm $EXISTING_CONTAINERS || true
    echo "✅ Existing containers cleaned up"
else
    echo "✅ No existing Supabase containers found for project ${SUPABASE_PROJECT_ID}"
fi

# Start Supabase services
echo "🎉 Starting Supabase services..."
pnpm run with-test-env pnpm supabase start -x vector

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

echo "📦 Building packages..."
pnpm run-on-packages build

# Install and setup Playwright
echo "📦 Installing Playwright and dependencies..."
pnpm install

echo "🎭 Installing Playwright browsers..."
pnpm run with-test-env playwright install --with-deps chromium

echo ""
echo "🎉 E2E Testing Environment Setup Complete!"
echo ""
echo "📋 Next Steps:"
echo "   1. Run your tests using:"
echo "      ./scripts/e2e.sh                   # Run all tests"
echo "      ./scripts/e2e.sh playwright test tests/e2e/widget/widget-screenshot.spec.ts  # Interactive test runner"
echo ""
echo "   2. Or use pnpm commands directly:"
echo "      pnpm test:e2e                      # Run all tests"
echo "      pnpm test:e2e:debug                # Debug mode"
echo ""
echo "📖 Documentation:"
echo "   • Test documentation: tests/e2e/README.md"
echo "   • Playwright docs: https://playwright.dev/"
echo ""
echo "🐛 Troubleshooting:"
echo "   • Verify all services are running"
echo "   • Check test credentials in .env.test.local"
echo "   • Ensure Docker is running for Supabase"
echo ""
echo "Happy testing! 🚀" 