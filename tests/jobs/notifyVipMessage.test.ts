import { render } from "@react-email/render";
import { conversationFactory } from "@tests/support/factories/conversations";
import { platformCustomerFactory } from "@tests/support/factories/platformCustomers";
import { userFactory } from "@tests/support/factories/users";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, inject, it, vi } from "vitest";
import { db } from "@/db/client";
import { mailboxes, userProfiles } from "@/db/schema";
import { notifyVipMessageEmail } from "@/jobs/notifyVipMessage";
import { sentEmailViaResend } from "@/lib/resend/client";

vi.mock("@/lib/env", () => ({
  env: {
    POSTGRES_URL: inject("TEST_DATABASE_URL"),
    RESEND_API_KEY: "test-api-key",
    RESEND_FROM_ADDRESS: "test@example.com",
    AUTH_URL: "https://helperai.dev",
  },
}));

// Mock email sender
vi.mock("@/lib/resend/client", () => ({
  sentEmailViaResend: vi.fn(),
}));

vi.mocked(sentEmailViaResend).mockResolvedValue([{ success: true }]);

describe("notifyVipMessageEmail", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Ensure any existing mailboxes will qualify and have a threshold
    // so VIP determination can be made deterministically in tests.
    try {
      await db.update(mailboxes).set({ vipThreshold: 500 });
    } catch (_) {
      // ignore if no rows yet
    }
  });

  it("sends a VIP email for a new user message", async () => {
    const { user } = await userFactory.createRootUser({
      userOverrides: { email: "agent@example.com" },
    });

    // Make sure the selected mailbox has a threshold
    await db.update(mailboxes).set({ vipThreshold: 500 });

    // VIP customer record with high value so they pass threshold
    const vipEmail = "vip@example.com";
    await platformCustomerFactory.create({
      email: vipEmail,
      name: "Acme VIP",
      value: "60000", // 600.00
      links: { Dashboard: "https://example.com/dashboard" },
    });

    const { conversation } = await conversationFactory.create({
      emailFrom: vipEmail,
      status: "open",
    });
    const userMsg = await conversationFactory.createUserEmail(conversation.id, {
      cleanedUpText: "Hello from the VIP!",
    });

    const result = await notifyVipMessageEmail({ messageId: userMsg.id });

    expect(result).toBe("Email sent");
    expect(sentEmailViaResend).toHaveBeenCalledTimes(1);
    expect(sentEmailViaResend).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "VIP Customer: Acme VIP",
        memberList: expect.arrayContaining([{ email: user.email! }]),
        react: expect.anything(),
      }),
    );

    const call = vi.mocked(sentEmailViaResend).mock.calls[0]![0];
    const html = await render(call.react);
    const normalized = html
      .replace(/<!--.*?-->/g, "")
      .replace(/\s+/g, " ")
      .trim();

    expect(normalized).toContain("VIP Customer");
    expect(normalized).toContain("Original message:");
    expect(normalized).toContain("Hello from the VIP!");
    expect(normalized).toContain("View in Helper");
  });

  it("sends a VIP email for a staff reply and shows Closed by", async () => {
    await userFactory.createRootUser({ userOverrides: { email: "team@example.com" } });
    const { user: staffUser } = await userFactory.createRootUser({ userOverrides: { email: "staff@example.com" } });

    await db.update(userProfiles).set({ displayName: "Agent Smith" }).where(eq(userProfiles.id, staffUser.id));
    await db.update(mailboxes).set({ vipThreshold: 500 });

    const vipEmail = "vip2@example.com";
    await platformCustomerFactory.create({ email: vipEmail, name: "VIP 2", value: "99999" });

    const { conversation } = await conversationFactory.create({ emailFrom: vipEmail, status: "closed" });
    const original = await conversationFactory.createUserEmail(conversation.id, {
      cleanedUpText: "Customer said hi",
    });
    const staffReply = await conversationFactory.createStaffEmail(conversation.id, staffUser.id, {
      responseToId: original.id,
      cleanedUpText: "Replying to your message",
      status: "sent",
    });

    const result = await notifyVipMessageEmail({ messageId: staffReply.id });
    expect(result).toBe("Email sent");

    const call = vi.mocked(sentEmailViaResend).mock.calls.at(-1)![0];
    expect(call.subject).toBe("VIP Customer: VIP 2");
    const html = await render(call.react);
    const normalized = html
      .replace(/<!--.*?-->/g, "")
      .replace(/\s+/g, " ")
      .trim();
    expect(normalized).toContain("Original message:");
    expect(normalized).toContain("Customer said hi");
    expect(normalized).toContain("Reply:");
    expect(normalized).toContain("Replying to your message");
    expect(normalized).toContain("Closed by Agent Smith");
  });

  it("skips when customer is not VIP", async () => {
    await userFactory.createRootUser();
    await db.update(mailboxes).set({ vipThreshold: 1000 });

    // No platform customer record for this email => not VIP
    const { conversation } = await conversationFactory.create({ emailFrom: "random@example.com", status: "open" });
    const userMsg = await conversationFactory.createUserEmail(conversation.id);

    const result = await notifyVipMessageEmail({ messageId: userMsg.id });
    expect(result).toEqual({ skipped: true, reason: "Not a VIP customer" });
    expect(sentEmailViaResend).not.toHaveBeenCalled();
  });

  it("excludes users with allowVipMessageEmail=false from recipients", async () => {
    const { user: u1 } = await userFactory.createRootUser({ userOverrides: { email: "a@example.com" } });
    const { user: u2 } = await userFactory.createRootUser({ userOverrides: { email: "b@example.com" } });
    await userFactory.createRootUser({ userOverrides: { email: "c@example.com" } });

    // u1 and u2 opt out; u3 should receive
    await db
      .update(userProfiles)
      .set({ preferences: { allowVipMessageEmail: false } })
      .where(eq(userProfiles.id, u1.id));
    await db
      .update(userProfiles)
      .set({ preferences: { allowVipMessageEmail: false } })
      .where(eq(userProfiles.id, u2.id));

    // Ensure VIP threshold low enough to qualify
    await db.update(mailboxes).set({ vipThreshold: 100 });

    const vipEmail = "vip3@example.com";
    await platformCustomerFactory.create({ email: vipEmail, name: "VIP 3", value: "50000" });

    const { conversation } = await conversationFactory.create({ emailFrom: vipEmail });
    const msg = await conversationFactory.createUserEmail(conversation.id);

    const result = await notifyVipMessageEmail({ messageId: msg.id });

    expect(sentEmailViaResend).toHaveBeenCalledTimes(1);
    const call = vi.mocked(sentEmailViaResend).mock.calls[0]![0];
    expect(call.memberList).toEqual([{ email: "c@example.com" }]);
    expect(result).toBe("Email sent");
  });

  it("skips for anonymous conversations", async () => {
    await userFactory.createRootUser();
    await db.update(mailboxes).set({ vipThreshold: 100 });

    const { conversation } = await conversationFactory.create({ emailFrom: null });
    const msg = await conversationFactory.createUserEmail(conversation.id);

    const result = await notifyVipMessageEmail({ messageId: msg.id });
    expect(result).toEqual({ skipped: true, reason: "Anonymous conversation" });
    expect(sentEmailViaResend).not.toHaveBeenCalled();
  });
});
