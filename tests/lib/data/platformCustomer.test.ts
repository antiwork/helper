import { platformCustomerFactory } from "@tests/support/factories/platformCustomers";
import { userFactory } from "@tests/support/factories/users";
import { describe, expect, it } from "vitest";
import { getPlatformCustomer } from "@/lib/data/platformCustomer";

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
