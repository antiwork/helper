import { platformCustomerFactory } from "@tests/support/factories/platformCustomers";
import { userFactory } from "@tests/support/factories/users";
import { describe, expect, it } from "vitest";
import { getPlatformCustomer } from "@/lib/data/platformCustomer";

describe("getPlatformCustomer", () => {
  const mockEmail = "test@example.com";

  it("returns platformCustomer if found for the given email", async () => {
    const { mailbox } = await userFactory.createRootUser();
    const { platformCustomer } = await platformCustomerFactory.create({ email: mockEmail });

    const result = await getPlatformCustomer(mockEmail);
    expect(result).toEqual({ ...platformCustomer, isVip: false });
  });

  it("does not return a platformCustomer for a different mailbox", async () => {
    const { mailbox } = await userFactory.createRootUser();
    await platformCustomerFactory.create({ email: mockEmail });

    const { mailbox: mailbox2 } = await userFactory.createRootUser();

    const result = await getPlatformCustomer(mockEmail);
    expect(result).toEqual(null);
  });
});
