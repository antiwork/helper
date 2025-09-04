import { describe, expect, it } from "vitest";
import { customerInfoPrompt } from "@/lib/ai/customerInfoPrompt";
import { CustomerInfo } from "@/lib/metadataApiClient";

describe("formatCustomerMetadata", () => {
  // Since formatCustomerMetadata is not exported, we'll test it through customerInfoPrompt
  // by examining the output when customerInfo.metadata is provided

  it("handles null and undefined metadata", () => {
    const customerInfo: CustomerInfo = { metadata: null };
    const result = customerInfoPrompt("test@example.com", customerInfo);
    expect(result).toEqual(["Current user details:", "- Email: test@example.com", "-"].join("\n"));
  });

  it("handles primitive values in metadata", () => {
    const customerInfo: CustomerInfo = {
      metadata: {
        plan: "premium",
        age: 25,
        active: true,
      },
    };
    const result = customerInfoPrompt("test@example.com", customerInfo);
    expect(result).toEqual(
      ["Current user details:", "- Email: test@example.com", "- plan: premium", "- age: 25", "- active: true"].join(
        "\n",
      ),
    );
  });

  it("handles array metadata", () => {
    const customerInfo: CustomerInfo = {
      metadata: {
        tags: ["vip", "enterprise", "priority"],
      },
    };
    const result = customerInfoPrompt("test@example.com", customerInfo);
    expect(result).toEqual(
      [
        "Current user details:",
        "- Email: test@example.com",
        "- tags: ",
        "  1. vip",
        "  2. enterprise",
        "  3. priority",
      ].join("\n"),
    );
  });

  it("handles nested object metadata", () => {
    const customerInfo: CustomerInfo = {
      metadata: {
        subscription: {
          plan: "pro",
          billing: {
            amount: 99.99,
            currency: "USD",
          },
        },
      },
    };
    const result = customerInfoPrompt("test@example.com", customerInfo);
    expect(result).toEqual(
      [
        "Current user details:",
        "- Email: test@example.com",
        "- subscription: ",
        "  - plan: pro",
        "  - billing: ",
        "    - amount: 99.99",
        "    - currency: USD",
      ].join("\n"),
    );
  });

  it("handles mixed arrays with objects", () => {
    const customerInfo: CustomerInfo = {
      metadata: {
        orders: [
          { id: 1, total: 50.0 },
          { id: 2, total: 75.5 },
        ],
      },
    };
    const result = customerInfoPrompt("test@example.com", customerInfo);
    expect(result).toEqual(
      [
        "Current user details:",
        "- Email: test@example.com",
        "- orders: ",
        "  1. ",
        "    - id: 1",
        "    - total: 50",
        "  2. ",
        "    - id: 2",
        "    - total: 75.5",
      ].join("\n"),
    );
  });

  it("handles empty arrays and objects", () => {
    const customerInfo: CustomerInfo = {
      metadata: {
        tags: [],
        settings: {},
      },
    };
    const result = customerInfoPrompt("test@example.com", customerInfo);
    expect(result).toEqual(
      ["Current user details:", "- Email: test@example.com", "- tags: ", "", "- settings:"].join("\n"),
    );
  });
});

describe("customerInfoPrompt", () => {
  it("formats complete customer info with email", () => {
    const customerInfo: CustomerInfo = {
      name: "John Doe",
      value: 1000,
      metadata: {
        plan: "premium",
        value: 1000,
      },
    };
    const result = customerInfoPrompt("john@example.com", customerInfo);

    expect(result).toEqual(
      [
        "Current user details:",
        "- Email: john@example.com",
        "- Name: John Doe",
        "- Customer Value: $10.00",
        "- plan: premium",
        "- value: 1000",
      ].join("\n"),
    );
  });

  it("formats customer info without email", () => {
    const customerInfo: CustomerInfo = {
      name: "Jane Smith",
      metadata: { plan: "basic" },
    };
    const result = customerInfoPrompt(null, customerInfo);

    expect(result).toEqual(["Current user details:", "- Name: Jane Smith", "- plan: basic"].join("\n"));
  });

  it("formats customer info without name", () => {
    const customerInfo: CustomerInfo = {
      name: null,
      metadata: { plan: "basic" },
    };
    const result = customerInfoPrompt("test@example.com", customerInfo);

    expect(result).toEqual(["Current user details:", "- Email: test@example.com", "- plan: basic"].join("\n"));
  });

  it("handles customer info with empty metadata", () => {
    const customerInfo: CustomerInfo = {
      name: "Test User",
      metadata: null,
    };
    const result = customerInfoPrompt("test@example.com", customerInfo);

    expect(result).toEqual(["Current user details:", "- Email: test@example.com", "- Name: Test User", "-"].join("\n"));
  });

  it("handles email only (no customer info)", () => {
    const result = customerInfoPrompt("user@example.com", null);
    expect(result).toEqual("\nCurrent user email: user@example.com");
  });

  it("handles email only with undefined customer info", () => {
    const result = customerInfoPrompt("user@example.com", undefined);
    expect(result).toEqual("\nCurrent user email: user@example.com");
  });

  it("handles anonymous user (no email, no customer info)", () => {
    const result = customerInfoPrompt(null, null);
    expect(result).toEqual("Anonymous user");
  });

  it("handles empty string email (no customer info)", () => {
    const result = customerInfoPrompt("", null);
    expect(result).toEqual("Anonymous user");
  });

  it("handles complex nested metadata structure", () => {
    const customerInfo: CustomerInfo = {
      name: "Enterprise User",
      metadata: {
        account: {
          type: "enterprise",
          features: ["advanced-analytics", "custom-integrations"],
          billing: {
            plan: "enterprise-annual",
            seats: 100,
            addons: [
              { name: "extra-storage", price: 50 },
              { name: "priority-support", price: 200 },
            ],
          },
        },
        preferences: {
          notifications: true,
          theme: "dark",
        },
      },
    };

    const result = customerInfoPrompt("enterprise@company.com", customerInfo);

    expect(result).toEqual(
      [
        "Current user details:",
        "- Email: enterprise@company.com",
        "- Name: Enterprise User",
        "- account: ",
        "  - type: enterprise",
        "  - features: ",
        "    1. advanced-analytics",
        "    2. custom-integrations",
        "  - billing: ",
        "    - plan: enterprise-annual",
        "    - seats: 100",
        "    - addons: ",
        "      1. ",
        "        - name: extra-storage",
        "        - price: 50",
        "      2. ",
        "        - name: priority-support",
        "        - price: 200",
        "- preferences: ",
        "  - notifications: true",
        "  - theme: dark",
      ].join("\n"),
    );
  });

  it("handles all CustomerInfo fields", () => {
    const customerInfo: CustomerInfo = {
      name: "Full User",
      value: 2500,
      metadata: { plan: "premium" },
      actions: { "view-account": "/account", upgrade: "/upgrade" },
    };

    const result = customerInfoPrompt("full@example.com", customerInfo);

    expect(result).toEqual(
      [
        "Current user details:",
        "- Email: full@example.com",
        "- Name: Full User",
        "- Customer Value: $25.00",
        "- plan: premium",
      ].join("\n"),
    );
    // Note: The function currently only uses name and metadata, not value or actions
  });
});
