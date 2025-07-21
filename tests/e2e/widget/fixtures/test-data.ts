export const testData = {
  widget: {
    testToken: "test-widget-token",
    testEmail: "test@example.com",
    testName: "Test User",
    testUserId: "test-user-123",
  },
  messages: {
    simple: "What is the weather today?",
    withScreenshot: "Can you help me understand what's on my screen?",
    errorTrigger: "Trigger an error please",
  },
  selectors: {
    widgetIframe: "#helper-widget-iframe",
    chatInput: 'textarea[placeholder="Ask a question..."]',
    sendButton: 'button[type="submit"]',
    screenshotCheckbox: '[data-testid="screenshot-checkbox"]',
    messagesList: '[data-testid="messages-list"]',
    message: '[data-testid="message"]',
    aiMessage: '[data-testid="message"][data-message-role="assistant"]',
    userMessage: '[data-testid="message"][data-message-role="user"]',
    loadingSpinner: '[data-testid="loading-spinner"]',
    errorMessage: '[data-testid="error-message"]',
    emptyState: '[data-testid="empty-state"]',
  },
  timeouts: {
    widgetLoad: 10000,
    apiResponse: 30000,
    screenshotCapture: 10000,
    shortWait: 2000,
  },
};
