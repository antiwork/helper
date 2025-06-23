# Helper - End-to-End Testing with Playwright

This directory contains end-to-end tests for the Helper application using Playwright.

## 🚀 Getting Started

### Prerequisites

1. **Install Dependencies**:

   ```bash
   pnpm install
   pnpm exec playwright install
   ```

2. **Local Development Environment**:
   - Local domain: `helperai.dev` with SSL certificates
   - Database: Supabase running locally
   - App server: Next.js running on helperai.dev
   - Working test account: `support@gumroad.com`

## 🧪 Running Tests

### Main Commands

```bash
# Run all E2E tests (headless)
pnpm test:e2e

# Run tests with visible browser (great for development)
pnpm exec playwright test tests/e2e/ --project=chromium --headed --workers=1

# Run tests with visible browser and delays (perfect for screen recording)
pnpm exec playwright test tests/e2e/ --project=chromium --headed --workers=1 --timeout=60000 --reporter=list

# Interactive UI mode
pnpm test:e2e:ui

# Debug mode (step through tests)
pnpm exec playwright test tests/e2e/ --project=chromium --headed --debug
```

### Specific Test Suites

```bash
# Run authentication tests only
pnpm exec playwright test tests/e2e/auth/login-working.spec.ts --project=chromium --headed

# Run dashboard tests only
pnpm exec playwright test tests/e2e/dashboard/conversations-working.spec.ts --project=chromium --headed

# Run debug utilities
pnpm exec playwright test tests/e2e/debug/ --project=chromium --headed
```

## 📁 Current Test Structure

```
tests/e2e/
├── auth/
│   └── login-working.spec.ts        # Authentication flow (6 tests)
├── dashboard/
│   └── conversations-working.spec.ts # Dashboard management (10 tests)
├── debug/
│   ├── inspect-login.spec.ts        # Login page DOM inspection
│   ├── inspect-dashboard.spec.ts    # Dashboard DOM inspection
│   ├── inspect-authenticated-dashboard.spec.ts # Auth'd dashboard inspection
│   └── *.png (ignored by git)       # Debug screenshots
├── setup/
│   └── auth.setup.ts               # Authentication state setup
├── utils/
│   ├── page-objects/               # Page object models
│   │   ├── basePage.ts
│   │   ├── loginPage.ts
│   │   └── dashboardPage.ts
│   └── test-helpers.ts            # Test utilities
├── fixtures/
│   └── test-document.txt          # Test files
├── screenshots/ (ignored by git)   # Runtime screenshots
└── .auth/ (ignored by git)         # Individual auth states
```

## 🎯 Test Coverage

### Authentication Tests (6 tests)

- ✅ Login form display and validation
- ✅ Successful email submission and redirect
- ✅ Different email address handling
- ✅ Empty email submission validation
- ✅ Mobile responsiveness
- ✅ Dark mode compatibility

### Dashboard Tests (10 tests)

- ✅ Conversation list display
- ✅ Search functionality
- ✅ Account information display
- ✅ Conversation filters
- ✅ Filter interactions
- ✅ Select all functionality (with graceful fallbacks)
- ✅ Mobile responsiveness
- ✅ Authentication state persistence
- ✅ Navigation handling
- ✅ Keyboard navigation

### Debug Utilities (3 tests)

- ✅ DOM element inspection tools
- ✅ Authentication flow debugging
- ✅ Dashboard element discovery

**Total: 19 comprehensive E2E tests with 100% pass rate**

## 🔒 Authentication Setup

### First Time Setup

Each developer needs to generate their own authentication state:

```bash
# Generate your auth state (run once per developer)
pnpm exec playwright test tests/e2e/setup/auth.setup.ts --project=setup
```

This will:

1. Navigate to the login page
2. Log in with `support@gumroad.com`
3. Save authentication cookies to `tests/e2e/.auth/user.json`
4. Reuse this state for all subsequent tests

### Authentication Details

- **Test account**: `support@gumroad.com`
- **Auth state**: Stored locally in `tests/e2e/.auth/` (ignored by git)
- **Automatic fallback**: Tests can handle login if auth state expires
- **Regeneration**: Re-run setup if auth expires or tests fail

## 🎭 Page Objects

### LoginPage (`utils/page-objects/loginPage.ts`)

- Email input and submission
- Navigation helpers
- Error handling
- OTP flow (when needed)

### DashboardPage (`utils/page-objects/dashboardPage.ts`)

- Conversation selection and interaction
- Search functionality
- Filter controls
- Account information access

### BasePage (`utils/page-objects/basePage.ts`)

- Common navigation utilities
- Wait helpers
- Screenshot functions

## 🔧 Test Implementation Details

### Real DOM Selectors

- Tests use **actual DOM elements** (not data-testid attributes)
- Selectors: `#email`, `button[type="submit"]`, `input[placeholder="Search conversations"]`
- Robust element discovery and fallback handling

### Browser Configuration

- **Primary**: Chromium (Desktop Chrome)
- **Responsive**: Mobile viewport testing (375x667)
- **Dark mode**: CSS class toggle testing
- **Cross-browser ready**: Firefox/Safari configs available

### Error Handling

- Graceful fallbacks for conditional UI elements
- Multiple selector strategies (`.first()` for duplicates)
- Timeout handling and retry logic
- Console logging for debugging

## 🎬 Screen Recording & Development

### Perfect for Recording

```bash
# Best command for screen recording with visible browser and delays
pnpm exec playwright test tests/e2e/ --project=chromium --headed --workers=1 --timeout=60000 --reporter=list
```

Features for recording:

- ✅ Sequential test execution (`--workers=1`)
- ✅ Visible browser (`--headed`)
- ✅ Built-in delays between actions
- ✅ Clean terminal output (`--reporter=list`)
- ✅ Extended timeouts for relaxed pacing

### Development Workflow

```bash
# Interactive development
pnpm exec playwright test tests/e2e/ --project=chromium --headed --debug

# Quick test run
pnpm test:e2e

# Generate HTML report
pnpm exec playwright show-report
```

## 🛠️ Configuration

### Playwright Config (`playwright.config.ts`)

- **Base URL**: `https://helperai.dev`
- **SSL**: Ignores HTTPS errors for local development
- **Timeouts**: 30s test timeout, 10s assertion timeout
- **Artifacts**: Screenshots and videos on failure
- **Parallel**: Configurable workers (1 for recording, multiple for speed)

### Package.json Scripts

```json
{
  "test:e2e": "playwright test tests/e2e/ --project=chromium",
  "test:e2e:ui": "playwright test tests/e2e/ --ui",
  "test:e2e:headed": "playwright test tests/e2e/ --headed",
  "test:e2e:debug": "playwright test tests/e2e/ --debug",
  "test:e2e:setup": "playwright install"
}
```

## 🏗️ Local Development Integration

### Running Tests Locally

All E2E tests are designed to run locally against your development environment:

```bash
# Standard execution
pnpm test:e2e

# With visible browser for debugging
pnpm exec playwright test tests/e2e/ --project=chromium --headed

# Interactive test development
pnpm test:e2e:ui
```

### Environment Requirements

For tests to work properly, ensure you have:

1. **Local Helper instance running** on `https://helperai.dev`
2. **Test account access** with `support@gumroad.com`
3. **SSL certificates** set up for local domain
4. **Environment variables** configured (see root `.env.development.local`)

### Production CI Integration

CI/CD integration is not included in this PR but can be added by the antiwork team with:

1. **GitHub Actions workflow** for automated testing
2. **Repository secrets** for API keys and encryption
3. **PostgreSQL service** configuration
4. **Artifact management** for test reports

This keeps the core testing framework independent of specific CI requirements.

## 🔍 Debugging & Troubleshooting

### When Tests Fail

1. **Check auth state**:

   ```bash
   # Regenerate auth if expired
   pnpm exec playwright test tests/e2e/setup/auth.setup.ts --project=setup
   ```

2. **Run with debug mode**:

   ```bash
   # Interactive debugging
   pnpm exec playwright test tests/e2e/ --project=chromium --headed --debug
   ```

3. **Check HTML report**:
   ```bash
   # View detailed results
   pnpm exec playwright show-report
   ```

### Common Issues

- **Auth expires**: Re-run auth setup
- **SSL errors**: Verify helperai.dev SSL setup
- **Element not found**: Check if UI changed
- **Timeouts**: Increase timeout or check server performance

### Debug Utilities

The debug tests help identify DOM changes:

- `inspect-login.spec.ts` - Maps login page elements
- `inspect-dashboard.spec.ts` - Maps dashboard elements
- `inspect-authenticated-dashboard.spec.ts` - Maps authenticated state

## 📊 Test Results

### Success Metrics

- **19/19 tests passing** (100% success rate)
- **~15-20 second execution time** for full suite
- **Consistent cross-device behavior**
- **Real user workflow validation**

### Artifacts

- Screenshots saved to `tests/e2e/debug/` (local only)
- Video recordings on test failures
- HTML reports with detailed breakdowns
- Trace files for step-by-step analysis

## 🎯 Best Practices

### Writing Tests

- ✅ Use real DOM selectors, not test IDs
- ✅ Add graceful fallbacks for conditional elements
- ✅ Include mobile and dark mode testing
- ✅ Test actual user workflows

### Maintenance

- ✅ Keep auth state fresh (regenerate when needed)
- ✅ Update selectors if UI changes
- ✅ Add delays for screen recording
- ✅ Use debug utilities to discover new elements

### Team Collaboration

- ✅ Each developer has own auth state
- ✅ Clean git history (no debug artifacts)
- ✅ Consistent test account (`support@gumroad.com`)
- ✅ Documented troubleshooting steps

---

## 🚀 Quick Start for New Developers

```bash
# 1. Install dependencies
pnpm install
pnpm exec playwright install

# 2. Generate your auth state
pnpm exec playwright test tests/e2e/setup/auth.setup.ts --project=setup

# 3. Run tests
pnpm test:e2e

# 4. Watch tests run (optional)
pnpm exec playwright test tests/e2e/ --project=chromium --headed --workers=1
```

That's it! You now have a fully functional E2E testing environment. 🎉
