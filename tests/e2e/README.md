# Helper - End-to-End Testing

Playwright e2e tests for the Helper application.

## 🚀 Quick Start

```bash
# 1. One-time setup (sets up Supabase, database, auth, and Playwright)
./scripts/setup-e2e-tests.sh

# 2. Run tests
./scripts/e2e.sh
```

## 🧪 Running Tests

```bash
# All tests (recommended)
./scripts/e2e.sh

# Specific test
./scripts/e2e.sh playwright test tests/e2e/widget/widget-screenshot.spec.ts

# Debug mode
./scripts/e2e.sh playwright test --debug

# Or use pnpm directly (after setup)
pnpm test:e2e
pnpm test:e2e:debug
pnpm test:e2e:headed
```

## 🔧 Setup Details

The `./scripts/setup-e2e-tests.sh` script handles:

- Environment file creation (`.env.test.local`)
- Supabase container management and startup
- Database migrations and seeding
- Package building
- Playwright browser installation
- Authentication state generation

## 🔍 Environment Requirements

- Docker (for Supabase containers)
- Node.js and pnpm
- `.env.test` or `.env.test.local` file
- `NEXT_PUBLIC_DEV_HOST` – override widget host (defaults to `https://helperai.dev`)

## 🔍 Debugging

### When Tests Fail

1. **Re-run full setup**:

```bash
./scripts/setup-e2e-tests.sh
```

1. **Check environment**:

```bash
# The e2e.sh script validates the setup automatically
./scripts/e2e.sh playwright test --debug
```

1. **View test report**:

```bash
pnpm exec playwright show-report
```

### Common Issues

- **"Supabase containers not running"**: Run `./scripts/setup-e2e-tests.sh`
- **"Auth setup not found"**: Setup script handles auth state automatically
- **Database issues**: Setup script resets and seeds the database
- **Container conflicts**: Setup script cleans up existing containers

## 📁 Structure

- `auth/` - Login and authentication tests
- `dashboard/` - Conversations and workflow tests
- `setup/` - Authentication state generation
- `utils/` - Page objects and test helpers

## 🎯 CI/CD

The GitHub Actions workflow:

- **Pull Requests**: Runs only changed tests for fast feedback
- **Main branch**: Runs full test suite for complete coverage
- **Setup**: Automatically handled by the CI workflow

## 🛠️ Development Workflow

```bash
# Initial setup (once)
./scripts/setup-e2e-tests.sh

# Daily development
./scripts/e2e.sh                    # Run all tests
./scripts/e2e.sh playwright test --debug              # debug mode
./scripts/e2e.sh playwright test specific.spec.ts  # Run specific test
```

## 📝 Notes

- Tests use the Supabase test environment (isolated from production)
- Database is reset and seeded on each setup run
- Authentication state is managed automatically
- Screenshots and videos saved on test failures
- Setup script creates `.env.test.local` from `.env.test`
