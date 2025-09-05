import { platformCustomerFactory } from "@tests/support/factories/platformCustomers";
import { userFactory } from "@tests/support/factories/users";
import { describe, expect, it } from "vitest";
import { getPlatformCustomer, upsertPlatformCustomer } from "@/lib/data/platformCustomer";

describe("getPlatformCustomer", () => {
  const mockEmail = "test@example.com";

  it("returns platformCustomer if found for the given email", async () => {
    await userFactory.createRootUser();
    const { platformCustomer } = await platformCustomerFactory.create({ email: mockEmail });

    const result = await getPlatformCustomer(mockEmail);
    expect(result).toEqual({ ...platformCustomer, isVip: false });
  });

  it("returns null when platformCustomer is not found", async () => {
    const result = await getPlatformCustomer("nonexistent@example.com");
    expect(result).toEqual(null);
  });
});

describe("upsertPlatformCustomer", () => {
  const mockEmail = "test-upsert@example.com";

  it("saves actions to the links field", async () => {
    await userFactory.createRootUser();

    const actions = {
      "View Profile": "https://admin.example.com/user/123",
      "Edit User": "https://admin.example.com/user/123/edit",
      "Disable Account": "https://admin.example.com/user/123/disable",
    };

    await upsertPlatformCustomer({
      email: mockEmail,
      customerInfo: {
        name: "Test User",
        actions,
      },
    });

    const result = await getPlatformCustomer(mockEmail);
    expect(result?.links).toEqual(actions);
  });

  it("saves metadata to the metadata field", async () => {
    await userFactory.createRootUser();

    const metadata = {
      department: "Engineering",
      role: "Senior Developer",
      joinDate: "2023-01-15",
      customerId: 12345,
    };

    await upsertPlatformCustomer({
      email: mockEmail,
      customerInfo: {
        name: "Test User",
        metadata,
      },
    });

    const result = await getPlatformCustomer(mockEmail);
    expect(result?.metadata).toEqual(metadata);
  });

  it("saves both actions and metadata together", async () => {
    await userFactory.createRootUser();

    const actions = {
      Dashboard: "https://admin.example.com/dashboard",
      Reports: "https://admin.example.com/reports",
    };

    const metadata = {
      tier: "premium",
      lastLogin: "2024-01-15T10:30:00Z",
    };

    await upsertPlatformCustomer({
      email: mockEmail,
      customerInfo: {
        name: "Test User",
        value: 5000,
        actions,
        metadata,
      },
    });

    const result = await getPlatformCustomer(mockEmail);
    expect(result?.name).toBe("Test User");
    expect(result?.value).toBe("5000.00");
    expect(result?.links).toEqual(actions);
    expect(result?.metadata).toEqual(metadata);
  });

  it("updates existing customer with new actions and metadata", async () => {
    await userFactory.createRootUser();

    await platformCustomerFactory.create({
      email: mockEmail,
      name: "Original Name",
      links: { "Old Link": "https://old.example.com" },
      metadata: { oldKey: "oldValue" },
    });

    const newActions = {
      "New Action": "https://new.example.com/action",
    };

    const newMetadata = {
      newKey: "newValue",
      updatedAt: "2024-01-15",
    };

    await upsertPlatformCustomer({
      email: mockEmail,
      customerInfo: {
        actions: newActions,
        metadata: newMetadata,
      },
    });

    const result = await getPlatformCustomer(mockEmail);
    expect(result?.name).toBe("Original Name");
    expect(result?.links).toEqual(newActions);
    expect(result?.metadata).toEqual(newMetadata);
  });

  it("handles null and undefined actions/metadata gracefully", async () => {
    await userFactory.createRootUser();

    await upsertPlatformCustomer({
      email: mockEmail,
      customerInfo: {
        name: "Test User",
        actions: null,
        metadata: undefined,
      },
    });

    const result = await getPlatformCustomer(mockEmail);
    expect(result?.name).toBe("Test User");
    expect(result?.links).toBeNull();
    expect(result?.metadata).toBeNull();
  });

  it("skips upsert when customerMetadata is falsy", async () => {
    await userFactory.createRootUser();

    await upsertPlatformCustomer({
      email: mockEmail,
      customerInfo: null as any,
    });

    const result = await getPlatformCustomer(mockEmail);
    expect(result).toBeNull();
  });
});
