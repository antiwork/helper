#!/bin/bash
# This script runs the E2E tests using Playwright

# Load environment variables to get SUPABASE_PROJECT_ID and other config
set -o allexport
source .env.test
if [ "$CI" != "true" ] && [ -f ".env.test.local" ]; then
  source .env.test.local
fi
set +o allexport

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
    echo "   Please run ./scripts/setup-e2e-tests.sh first to start the test environment."
    exit 1
fi

echo "✅ Found running Supabase containers for project: ${SUPABASE_PROJECT_ID}"

echo "✅ Playwright authentication setup found"
echo "✅ All checks passed! Test environment is ready."

set -e

echo "🧪 Running E2E Tests"
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
    PLAYWRIGHT_COMMAND="playwright test"
fi

# Check if .env.test exists
if [ ! -f ".env.test" ]; then
    echo "❌ .env.test not found. Please run ./scripts/setup-e2e-tests.sh first."
    exit 1
fi

echo "🚀 Starting E2E test run..."

# Run the e2e tests
echo "🧪 Running Playwright e2e tests..."
pnpm run with-test-env $PLAYWRIGHT_COMMAND

echo "✅ All tests completed successfully!"
echo "🎉 Test run complete!"