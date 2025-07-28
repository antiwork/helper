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
      context: "VIP customer",
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
      context: "Custom data context",
    },
  },
};
