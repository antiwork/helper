#!/bin/bash
# This script runs the E2E tests using Playwright

# Check if .env.test exists before attempting to source it
if [ ! -f ".env.test" ]; then
    echo "❌ .env.test not found. Please run ./scripts/setup-e2e-tests.sh first."
    exit 1
fi

# Load environment variables to get SUPABASE_PROJECT_ID and other config
set -o allexport
source .env.test
if [ "$CI" != "true" ] && [ -f ".env.test.local" ]; then
  source .env.test.local
fi
set +o allexport

if [ "$CI" = "true" ]; then
  export PLAYWRIGHT_USE_PREBUILT=1
fi

echo "🔍 Checking Supabase test environment setup..."

# Check if Supabase containers are running
if [ -z "$SUPABASE_PROJECT_ID" ]; then
    echo "❌ SUPABASE_PROJECT_ID not found in environment variables."
    echo "   Please run ./scripts/setup-e2e-tests.sh first."
    exit 1
fi

# Check if Supabase containers are running for this project
RUNNING_CONTAINERS=$(docker ps -q --filter "name=${SUPABASE_PROJECT_ID}" 2>/dev/null || true)
if [ -z "$RUNNING_CONTAINERS" ]; then
    echo "❌ Supabase test containers are not running for project: ${SUPABASE_PROJECT_ID}"
    echo "   Please run ./scripts/setup-e2e-tests.sh or pnpm test:e2e:setup first to start the test environment."
    exit 1
fi

echo "✅ Found running Supabase containers for project: ${SUPABASE_PROJECT_ID}"

echo "✅ Playwright authentication setup found"
echo "✅ All checks passed! Test environment is ready."

set -e

echo "===================="

# Parse command line arguments
PLAYWRIGHT_COMMAND=""

# Collect all arguments to pass to playwright
while [[ $# -gt 0 ]]; do
    PLAYWRIGHT_COMMAND="$PLAYWRIGHT_COMMAND $1"
    shift
done

# If no arguments provided, default to basic playwright test
if [ -z "$PLAYWRIGHT_COMMAND" ]; then
    PLAYWRIGHT_COMMAND="pnpm playwright test"
fi

# Ensure direct 'playwright' invocations go through the pnpm script wrapper
# which sets necessary Node conditions (e.g., react-server)
if [[ "$PLAYWRIGHT_COMMAND" =~ ^[[:space:]]*playwright[[:space:]] ]]; then
    PLAYWRIGHT_COMMAND="pnpm $PLAYWRIGHT_COMMAND"
fi

echo "🚀 Starting E2E test run..."
if [ "$PLAYWRIGHT_USE_PREBUILT" = "1" ]; then 
  echo "📦 Mode: Production build (pnpm with-test-env next start -p 3020)"
  else 
  echo "⚡ Mode: Development server (pnpm with-test-env next dev -p 3020 --turbopack)"
fi

# Run the e2e tests
echo "🧪 Running Playwright e2e tests..."
pnpm run with-test-env $PLAYWRIGHT_COMMAND

echo "✅ All tests completed successfully!"
echo "🎉 Test run complete!"