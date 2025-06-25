#!/bin/bash

# Helper AI - Playwright E2E Testing Setup Script
# This script sets up everything needed for E2E testing

set -e

echo "🎭 Setting up Playwright E2E Testing for Helper AI"
echo "=================================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the root of the Helper AI project"
    exit 1
fi

echo "📦 Installing Playwright and dependencies..."
pnpm install

echo "🎭 Installing Playwright browsers..."
pnpm exec playwright install --with-deps

echo "🔧 Setting up test environment..."

# Create .env.test.local if it doesn't exist
if [ ! -f ".env.test.local" ]; then
    echo "📝 Creating .env.test.local file..."
    cat > .env.test.local << EOF
# E2E Testing Environment Variables
TEST_USER_EMAIL=test@example.com
TEST_OTP=123456
TEST_API_KEY=test-api-key

# Add your other environment variables here
EOF
    echo "✅ Created .env.test.local - please update with your actual values"
else
    echo "✅ .env.test.local already exists"
fi

# Create test directories if they don't exist
echo "📁 Creating test directories..."
mkdir -p tests/e2e/.auth
mkdir -p tests/e2e/screenshots
mkdir -p playwright-report
mkdir -p test-results

echo "🔒 Setting up authentication state directory..."
chmod 755 tests/e2e/.auth

echo "🚀 Starting local services..."
echo "   📊 Starting Supabase (if not already running)..."
pnpm services:start

echo "⏳ Waiting for services to be ready..."
sleep 5

echo "🧪 Running a quick test to verify setup..."
if pnpm test:e2e --grep="should display login form" > /dev/null 2>&1; then
    echo "✅ Test setup successful!"
else
    echo "⚠️  Initial test failed - this might be expected if your app isn't fully set up yet"
fi

echo ""
echo "🎉 Playwright E2E Testing Setup Complete!"
echo ""
echo "📋 Next Steps:"
echo "   1. Make sure your local development environment is running:"
echo "      • Helper AI app at https://helperai.dev"
echo "      • Supabase database"
echo "      • All required services"
echo ""
echo "   2. Update your .env.test.local file with correct test credentials"
echo ""
echo "   3. Run your first test:"
echo "      pnpm test:e2e"
echo ""
echo "   4. Explore the test suite:"
echo "      pnpm test:e2e:ui    # Interactive test runner"
echo "      pnpm test:e2e:debug # Debug mode"
echo ""
echo "📖 Documentation:"
echo "   • Test documentation: tests/e2e/README.md"
echo "   • Playwright docs: https://playwright.dev/"
echo ""
echo "🐛 Troubleshooting:"
echo "   • Check that helperai.dev resolves correctly"
echo "   • Verify SSL certificates are valid"
echo "   • Ensure all services are running"
echo "   • Check test credentials in .env.test.local"
echo ""
echo "Happy testing! 🚀" 