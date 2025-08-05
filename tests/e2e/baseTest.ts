import { test as base, expect, Page } from "@playwright/test";
import { JSErrorTracker } from "./utils/jsErrorTracker";

export const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    const tracker = new JSErrorTracker(page);
    
    await use(page);
    
    const errors = await tracker.getAllErrors();
    if (errors.length > 0) {
      const errorDetails = await tracker.getErrorsAsString();
      
      await testInfo.attach("javascript-errors.txt", {
        body: errorDetails,
        contentType: "text/plain",
      });
      
      console.error(`JavaScript errors detected in test "${testInfo.title}":\n${errorDetails}`);
      
      if (process.env.FAIL_ON_JS_ERRORS !== "false") {
        expect(errors.length, `Found ${errors.length} JavaScript error(s) during test execution. Set FAIL_ON_JS_ERRORS=false to disable this check.\n\nErrors:\n${errorDetails}`).toBe(0);
      } else {
        console.warn(`JavaScript errors were detected but test will continue due to FAIL_ON_JS_ERRORS=false`);
      }
    }
  },
});

export { expect } from "@playwright/test";
