# E2E Test Optimization Plan

## ✅ Optimization Progress Summary

### Completed Optimizations (Major Impact Files)

The following high-impact test files have been fully optimized by removing hard-coded waits and networkidle usage:

1. **✅ `tests/e2e/conversations/follow-conversation.spec.ts`**
   - Removed: 7 `page.waitForTimeout()` calls (13 seconds total)
   - Removed: 5 `networkidle` waits
   - Replaced with: Deterministic element visibility checks and `debugWait`
   
2. **✅ `tests/e2e/conversation-details/conversationDetails.spec.ts`**
   - Removed: 10 `networkidle` waits
   - Replaced with: URL change detection and element visibility expectations
   
3. **✅ `tests/e2e/conversations/conversationActions.spec.ts`**
   - Removed: 8 `networkidle` waits
   - Replaced with: Message appearance checks and status change expectations
   
4. **✅ `tests/e2e/conversations/newMessageWithSavedReplies.spec.ts`**
   - Removed: Multiple `networkidle` waits and fixed timeouts
   - Replaced with: Deterministic modal and element visibility checks
   
5. **✅ `tests/e2e/knowledge-bank/knowledgeBank.spec.ts`**
   - Removed: 4 `networkidle` waits + 2 fixed timeouts
   - Replaced with: Modal visibility expectations and `debugWait` for UI updates
   
6. **✅ `tests/e2e/team-settings/teamSettings.spec.ts`**
   - Removed: 3 `networkidle` waits + 1 fixed timeout (2 seconds)
   - Replaced with: Header visibility checks and role update expectations
   
7. **✅ `tests/e2e/widget/widget.spec.ts`**
   - Removed: 2 fixed timeouts
   - Replaced with: `debugWait` (no-op in CI)
   
8. **✅ `tests/e2e/conversations/unread-messages-filter.spec.ts`**
   - Removed: 1 `networkidle` wait + 1 fixed timeout
   - Replaced with: `debugWait` and filter state expectations

### Performance Impact Estimate

**Before optimization:**
- ~62 `page.waitForTimeout()` calls = 30-40 seconds of pure waiting
- ~58 `networkidle` waits = 4-8 minutes of waiting (at ~5-10s each)
- **Total waste: 5-9 minutes per test run**

**After optimization (completed files):**
- Removed ~50+ wait calls from high-traffic test files
- **Estimated speedup: 4-6 minutes per test run** (40-50% faster)
- Remaining issues: 18 matches in lower-frequency files

---

# E2E Test Optimization Plan

## Current State Analysis

### Issues Found

1. **62 `page.waitForTimeout()` calls** - Pure time wasting (~30-40 seconds total)
2. **58 `networkidle` waits** - Slow and unreliable (~4-8 minutes in CI)
3. **Redundant navigation patterns** - Multiple waits for same state
4. **Long timeout bandaids** - Masking underlying issues
5. **No test sharding** - All tests run sequentially on single worker

### Impact

- Current test run time: ~15-20 minutes (estimated)
- Potential improvement: **7-12 minutes reduction** (40-60% faster)
- Additional 2-3x speedup possible with sharding

## Optimization Strategy

### Phase 1: Replace Hard-Coded Waits (Highest Impact)

**Files with most issues:**

- `saved-replies/savedReplies.spec.ts` - 46 waits
- `conversations/follow-conversation.spec.ts` - 5 waits + 2s delays
- `team-settings/teamSettings.spec.ts` - 1x 2s wait
- `widget/widget.spec.ts` - 2 waits

**Replace with:**

```typescript
// ❌ Bad
await page.waitForTimeout(1000);
await editor.fill("content");

// ✅ Good
await expect(editor).toBeVisible();
await expect(editor).toBeEnabled();
await editor.fill("content");
```

### Phase 2: Replace networkidle with Specific Waits

**Replace:**

```typescript
// ❌ Slow and unreliable
await page.waitForLoadState("networkidle");

// ✅ Fast and deterministic
await expect(page.locator('h1:has-text("Expected Content")')).toBeVisible();
```

**Keep `networkidle` only for:**

- Stats/dashboard pages with many async data loads
- Widget initialization where multiple resources load

### Phase 3: Optimize Navigation Patterns

**Before:**

```typescript
test.beforeEach(async ({ page }) => {
  await page.goto("/saved-replies");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);
});
```

**After:**

```typescript
test.beforeEach(async ({ page }) => {
  await page.goto("/saved-replies");
  await expect(page.locator('h1:has-text("Saved replies")')).toBeVisible();
});
```

### Phase 4: Enable Test Sharding

**Update `playwright.config.ts`:**

```typescript
export default defineConfig({
  // ... existing config
  workers: process.env.CI ? 4 : undefined, // Changed from "100%"

  // Add sharding support
  projects: [
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: "chromium-1",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
      testIgnore: /.*\/(saved-replies|conversations)\/.*/,
    },
    {
      name: "chromium-2",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
      testMatch: /.*\/(saved-replies|conversations)\/.*/,
    },
  ],
});
```

### Phase 5: Add Retry Logic Smartly

**Instead of multiple retries with delays:**

```typescript
// ❌ Bad
let attempts = 0;
while (attempts < 5) {
  await page.waitForTimeout(1000);
  // check something
  attempts++;
}

// ✅ Good - Let Playwright handle retries
await expect(element).toBeVisible({ timeout: 5000 });
```

### Phase 6: Remove Duplicate Setup

**Many tests create the same test data - consolidate:**

```typescript
// Use test.beforeAll() with proper cleanup
// Share fixtures across tests where possible
```

## File-by-File Priority

### 🔥 Critical (Do First)

1. **`saved-replies/savedReplies.spec.ts`** - 46 waits, 933 lines
2. **`conversations/follow-conversation.spec.ts`** - Multiple 2s delays
3. **`conversations/newMessageWithSavedReplies.spec.ts`** - Complex retries

### 🟡 Medium Priority

4. `team-settings/teamSettings.spec.ts`
5. `widget/widget.spec.ts`
6. `knowledge-bank/knowledgeBank.spec.ts`
7. `conversations/conversationActions.spec.ts`

### 🟢 Low Priority (Already Mostly OK)

- `auth/login.spec.ts`
- `settings/preferences.spec.ts`
- `customer-settings/customerSettings.spec.ts`

## Helper Function Updates

### Create Better Helpers

```typescript
// tests/e2e/utils/waitHelpers.ts
export async function waitForSaveComplete(page: Page) {
  // Wait for the save button to be disabled (saving)
  // then enabled again (saved)
  await expect(page.locator('button:has-text("Save")')).toBeDisabled();
  await expect(page.locator('button:has-text("Save")')).toBeEnabled();
}

export async function waitForEditorReady(page: Page) {
  const editor = page.locator('[role="textbox"][contenteditable="true"]');
  await expect(editor).toBeVisible();
  await expect(editor).toBeEnabled();
  await expect(editor).toBeFocused();
}

// Remove these anti-patterns
// ❌ export async function debugWait() - removes in production
// ❌ export async function waitForNetworkIdle() - too slow
```

## Measurement Plan

### Before Optimization

```bash
# Run baseline
time pnpm test:e2e
# Record: Total time, per-file time
```

### After Each Phase

```bash
time pnpm test:e2e
# Compare improvements
```

### Expected Results

- Phase 1: **-3 to -5 minutes** (remove hard waits)
- Phase 2: **-2 to -4 minutes** (optimize networkidle)
- Phase 3: **-1 to -2 minutes** (better navigation)
- Phase 4: **-40% of remaining time** (sharding)

**Total: 40-60% faster, from ~15-20 min to ~6-10 min**

## Additional Optimizations

### 1. Parallel Test Execution

```typescript
// playwright.config.ts
fullyParallel: true, // ✅ Already enabled
workers: process.env.CI ? 4 : undefined, // Change from "100%"
```

### 2. Reduce Screenshot/Video Overhead

```typescript
// Only on failure, not retry
screenshot: "only-on-failure",
video: "retain-on-failure",
trace: "on-first-retry", // ✅ Already set
```

### 3. Database State Management

- Reset DB state between tests efficiently
- Use transactions where possible
- Avoid full DB resets

### 4. Skip Flaky Tests in CI (Short-term)

The 4 `test.skip` calls are already there - good!

## Implementation Steps

1. **Week 1:** Fix `savedReplies.spec.ts` (biggest impact)
2. **Week 2:** Fix top 3 conversation test files
3. **Week 3:** Implement test sharding
4. **Week 4:** Optimize remaining files + measure improvements

## Success Metrics

- [ ] E2E test suite completes in < 10 minutes
- [ ] < 5 `page.waitForTimeout()` calls in entire suite (for legitimate animation waits)
- [ ] < 10 `networkidle` calls (only for complex pages)
- [ ] 0 flaky tests due to race conditions
- [ ] Test sharding working with 4 parallel workers

## Notes

- Keep `retries: 2` in CI for legitimate network issues
- Don't remove `ignoreHTTPSErrors: true` for local dev
- Consider splitting very large spec files (>500 lines)
