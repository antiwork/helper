# Helper - End-to-End Testing

Playwright e2e tests for the Helper application.

## 🚀 Quick Start

```bash
# 1. Install dependencies
pnpm install
pnpm exec playwright install

# 2. Generate auth state (once per developer)
pnpm exec playwright test tests/e2e/setup/auth.setup.ts --project=setup

# 3. Run tests
pnpm test:e2e
```

## 🧪 Running Tests

```bash
# All tests (headless)
pnpm test:e2e

# With visible browser (development)
pnpm test:e2e:headed

# Interactive mode
pnpm test:e2e:ui

# Debug mode
pnpm test:e2e:debug
```

## 🔧 Prerequisites

- Local Helper app running at `https://helperai.dev`
- Supabase running locally
- Test account: `support@gumroad.com`

## 🔍 Debugging

### When Tests Fail

1. **Regenerate auth state**:

```bash
pnpm exec playwright test tests/e2e/setup/auth.setup.ts --project=setup
```

2. **Run in debug mode**:

```bash
pnpm test:e2e:debug
```

3. **View test report**:

```bash
pnpm exec playwright show-report
```

### Common Issues

- **Auth expired**: Re-run auth setup
- **SSL errors**: Check helperai.dev SSL certificates
- **Timeouts**: Verify all services are running
- **Element not found**: UI may have changed, update selectors

## 📁 Structure

- `auth/` - Login and authentication tests
- `dashboard/` - Conversations and workflow tests
- `setup/` - Authentication state generation
- `utils/` - Page objects and test helpers

## 🎯 Notes

- Tests use real DOM selectors (not test IDs)
- Authentication state is cached locally (`.auth/` directory)
- Screenshots and videos saved on test failures
- Designed for local development environment
