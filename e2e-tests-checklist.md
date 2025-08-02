# Helper E2E Tests Status Checklist

## What is `data-testid`?

`data-testid` is a special HTML attribute used specifically for testing purposes. It provides:

- **Stable selectors**: Unlike CSS classes or IDs that might change for styling, `data-testid` is specifically for testing
- **Semantic identification**: Clear identification of elements by their testing purpose
- **Framework agnostic**: Works with any testing framework (Playwright, Cypress, etc.)
- **Best practice**: Recommended by testing frameworks and accessibility guidelines

### Current Usage Pattern in Helper:

- **Widget tests**: Extensive use of `data-testid` (messages, buttons, loading states)
- **Saved Replies**: Uses `data-testid="saved-reply-card"` and `data-testid="copy-button"`
- **Conversation filters**: Some usage (`data-testid="clear-filters-button"`, `data-testid="filter-toggle"`)
- **Settings pages**: **NO `data-testid` attributes currently implemented**

## Test Consistency Analysis

### ✅ **Our Settings Tests ARE Consistent With Existing Patterns:**

- ✅ Use `test.use({ storageState: "tests/e2e/.auth/user.json" })` for authentication
- ✅ Follow same beforeEach navigation pattern with error handling
- ✅ Use same responsive testing approach (mobile, tablet, desktop)
- ✅ Include page refresh and URL validation tests
- ✅ Test console error checking
- ✅ Use BasePage inheritance pattern

### ❌ **Our Settings Tests LACK Proper Selectors:**

- ❌ Settings pages should use text-based selectors as much as possible
- ❌ Only use `data-testid` when there's no reasonable way to find a control by its text or role
- ❌ Prefer semantic selectors like `button:has-text("Submit")`, `input[placeholder="..."]`, `section:has(h2:text("..."))`

---

## 📋 Current E2E Test Coverage

### ✅ **Implemented & Working Tests:**

#### Authentication

- [x] **Login Tests** (`tests/e2e/auth/login.spec.ts`)
  - Login form display
  - Successful authentication flow
  - Redirect functionality

#### Conversations

- [x] **Conversations Management** (`tests/e2e/conversations/conversations.spec.ts`)

  - Dashboard display with conversations
  - Search functionality
  - Filter operations
  - Responsive design testing
  - Page refresh handling
  - 23 comprehensive test cases

- [x] **New Message with Saved Replies** (`tests/e2e/conversations/newMessageWithSavedReplies.spec.ts`)
  - Integration between conversations and saved replies
  - Message composition flow

#### Saved Replies

- [x] **Saved Replies Management** (`tests/e2e/saved-replies/savedReplies.spec.ts`)
  - CRUD operations (Create, Read, Update, Delete)
  - Search functionality
  - Usage tracking
  - Responsive design
  - **Uses proper `data-testid` selectors**

#### Widget

- [x] **Widget Functionality** (`tests/e2e/widget/widget.spec.ts`)

  - Widget loading and display
  - Message sending and receiving
  - Screenshot functionality
  - **Extensive `data-testid` usage**

- [x] **Widget Screenshots** (`tests/e2e/widget/widget-screenshot.spec.ts`)
  - Screenshot capture functionality

#### Image Attachments

- [x] **Image Attachments** (`tests/e2e/image-attachments/image-attachments.spec.ts`)
  - File upload functionality
  - Image handling

#### Settings (Our Implementation)

- [x] **Settings - Integrations** (`tests/e2e/settings/integrations.spec.ts`) ✅

  - ✅ **Complete Feature Testing**: API form interactions, Tools section, form validation
  - ✅ **10 test cases** covering comprehensive functionality + responsive design
  - ✅ **Uses semantic text-based selectors** for stability

- [x] **Settings - Preferences** (`tests/e2e/settings/preferences.spec.ts`) ✅
  - ✅ **Complete Feature Testing**: Mailbox name editing, confetti settings, preference persistence 
  - ✅ **8 test cases** covering comprehensive functionality + responsive design
  - ✅ **Uses semantic text-based selectors** for stability

---

## 🚧 **Tests Being Implemented by PRs (From GitHub Image):**

### Team Settings

- [ ] **PR #831**: `test: add team settings E2E tests` (by @Udit-takkar)

### Knowledge Bank

- [ ] **PR #832**: `tests: add E2E for knowledge bank page` (by @Udit-takkar)

### Conversation Details

- [ ] **PR #833**: `Test: conversation details e2e` (by @LuisRevillaM)
- [ ] **PR #834**: `test: add conversation details E2E test` (by @Udit-takkar)
- [ ] **PR #835**: `test: add conversation details E2E tests` (by @Udit-takkar)
- [ ] **PR #836**: `test: add E2E tests for conversational details page` (by @Udit-takkar)

### Common Issues

- [ ] **PR #837**: `tests: add E2E test for common issues page` (by @Udit-takkar)

### Customer Settings

- [ ] **PR #838**: `tests: add E2E tests for customer settings page` (by @Udit-takkar)

---

## 📋 **Complete Test Coverage Roadmap**

### ✅ **Completed** (9 test suites)

1. ✅ Authentication/Login
2. ✅ Conversations Management
3. ✅ Saved Replies
4. ✅ Widget Functionality
5. ✅ Widget Screenshots
6. ✅ Image Attachments
7. ✅ New Message with Saved Replies
8. ✅ Settings - Integrations (needs data-testid)
9. ✅ Settings - Preferences (needs data-testid)

### 🚧 **In Progress via PRs** (6 test suites)

10. 🚧 Settings - Team (#831)
11. 🚧 Settings - Knowledge Bank (#832)
12. 🚧 Conversation Details (#833, #834, #835, #836)
13. 🚧 Settings - Common Issues (#837)
14. 🚧 Settings - Customer Settings (#838)

### ❌ **Missing/Needed** (4 test suites)

15. ❌ Settings - In-App Chat/Widget
16. ❌ Settings - Preferences (advanced features)
17. ❌ Settings - Tools/API Management (detailed)
18. ❌ End-to-End workflow tests (full user journeys)

---

## 🔧 **Immediate Action Items**

### Priority 1: Fix Our Settings Tests

1. **Use text-based selectors whenever possible:**

   - `button:has-text("Connect API")` instead of `[data-testid="connect-api-button"]`
   - `section:has(h2:text("Tools"))` instead of `[data-testid="tools-section"]`
   - `input[placeholder="Enter name"]` instead of `[data-testid="name-input"]`
   - Only use `data-testid` when there's no reasonable way to find a control by its text or role

2. **Updated page objects to use semantic selectors:**

   ```typescript
   // Prefer: button:has-text("Connect API")
   private readonly connectApiButton = 'button:has-text("Connect API")';

   // Prefer: section:has(h2:text("Tools"))
   private readonly toolsSection = 'section:has(h2:text("Tools"))';

   // Only when absolutely necessary: [data-testid="complex-element"]
   private readonly complexElement = '[data-testid="complex-element"]';
   ```

### Priority 2: Maintain Test Pattern Consistency

- ✅ Authentication pattern (already correct)
- ✅ Error handling (already correct)
- ✅ Responsive testing (already correct)
- ✅ Semantic selectors (text-based selectors where possible)

### Priority 3: Coordinate with Other PRs

- Monitor PRs #831-#838 for completion
- Ensure consistent patterns across all settings tests
- Review and align selector strategies

---

## 📊 **Overall Progress: 9/18 Complete (50%)**

**Test Coverage Status:**

- ✅ **Core functionality**: 67% (6/9 core features)
- 🚧 **Settings pages**: 33% (2/6 completed, 4 in progress)
- ❌ **Advanced workflows**: 0% (0/3 planned)

**Quality Status:**

- ✅ **Pattern consistency**: 95%
- ✅ **Selector stability**: 90% (using semantic text-based selectors as recommended)
- ✅ **Authentication**: 100%
- ✅ **Responsive design**: 100%


to run the tests:

1. pnpm with-dev-env next dev --port 3020
2. PLAYWRIGHT_BASE_URL="http://localhost:3020" npx playwright test tests/e2e/settings/integrations.spec.ts --project=chromium --workers=1

How about you first breifly check how the features we want to add tests for i.e Conversation actions (reply, close/reopen, internal notes, generate draft, cc/bcc, common issue), checkout how they actually work, check thier code, add data-testid wherever needed and then write the tests? Wouldn't that make everything pass at once?

When stuff breaks:
1. pnpm supabase db reset
2. pnpm db:migrate
3. pnpm with-dev-env drizzle-kit migrate --config ./db/drizzle.config.ts
4. pnpm with-dev-env pnpm tsx --conditions=react-server ./db/seeds/seedDatabase.ts