export const widgetConfigs = {
  anonymous: {
    token: "test-widget-token",
  },
  authenticated: {
    token: "test-widget-token",
    email: "authenticated@example.com",
    customerMetadata: {
      name: "Authenticated User",
      value: null,
      links: null,
    },
  },
  withCustomData: {
    token: "test-widget-token",
    email: "custom@example.com",
    customerMetadata: {
      name: "Custom User",
      value: null,
      links: {
        plan: "premium",
        role: "admin",
      },
    },
  },
  withMetadata: {
    token: "test-widget-token",
    email: "metadata@example.com",
    customerMetadata: {
      name: "Metadata Test User",
      value: 1000,
      links: {
        support: "https://example.com/support",
      },
      metadata: {
        customerId: "test-12345",
        tier: "premium",
        source: "e2e-test",
        experiments: ["metadata-feature", "new-ui"],
        sessionData: {
          testRun: true,
          timestamp: "2024-01-01T00:00:00Z",
        },
      },
    },
  },
};
