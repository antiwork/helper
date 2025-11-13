import { faker } from "@faker-js/faker";
import { render } from "@react-email/render";
import { conversationFactory } from "@tests/support/factories/conversations";
import { platformCustomerFactory } from "@tests/support/factories/platformCustomers";
import { userFactory } from "@tests/support/factories/users";
import { subHours } from "date-fns";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db/client";
import { userProfiles } from "@/db/schema";
import { generateMailboxEmailReport } from "@/jobs/generateDailyReports";
import { sentEmailViaResend } from "@/lib/resend/client";

vi.mock("@/lib/resend/client", () => ({
  sentEmailViaResend: vi.fn(),
}));
vi.mocked(sentEmailViaResend).mockResolvedValue([{ success: true }]);

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const expectEmailTableRow = (html: string, label: string, value: string | number) => {
  const v = String(value);
  const rx = new RegExp(
    `<tr[^>]*>\\s*<td[^>]*>\\s*${escapeRegExp(label)}\\s*<\\/td>\\s*<td[^>]*>\\s*${escapeRegExp(v)}\\s*<\\/td>\\s*<\\/tr>`,
    "i",
  );
  expect(rx.test(html)).toBe(true);
};

describe("generateMailboxEmailReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips when there are no open tickets", async () => {
    const { mailbox } = await userFactory.createRootUser();

    const result = await generateMailboxEmailReport({ mailbox });

    expect(result).toEqual({
      skipped: true,
      reason: "No open tickets",
    });
    expect(sentEmailViaResend).not.toHaveBeenCalled();
  });

  it("calculates correct metrics for basic scenarios", async () => {
    const { mailbox, user } = await userFactory.createRootUser();

    const endTime = new Date();
    const midTime = subHours(endTime, 12);

    const { conversation: openConv1 } = await conversationFactory.create({
      status: "open",
      lastUserEmailCreatedAt: midTime,
    });
    const { conversation: openConv2 } = await conversationFactory.create({
      status: "open",
      lastUserEmailCreatedAt: midTime,
    });
    const { conversation: _closedConv } = await conversationFactory.create({
      status: "closed",
    });

    const userMsg1 = await conversationFactory.createUserEmail(openConv1.id, {
      createdAt: midTime,
    });
    const userMsg2 = await conversationFactory.createUserEmail(openConv2.id, {
      createdAt: midTime,
    });

    await conversationFactory.createStaffEmail(openConv1.id, user.id, {
      createdAt: new Date(midTime.getTime() + 3600000),
      responseToId: userMsg1.id,
    });
    await conversationFactory.createStaffEmail(openConv2.id, user.id, {
      createdAt: new Date(midTime.getTime() + 7200000),
      responseToId: userMsg2.id,
    });

    const result = await generateMailboxEmailReport({ mailbox });

    expect(result).toEqual({
      success: true,
      openTicketCount: 2,
      answeredTicketCount: 2,
      openTicketsOverZeroCount: 0,
      answeredTicketsOverZeroCount: 0,
      avgReplyTimeResult: "1h 30m",
      vipAvgReplyTime: null,
      avgWaitTime: "12h 0m",
    });

    expect(sentEmailViaResend).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: `Daily summary for ${mailbox.name}`,
        memberList: expect.arrayContaining([{ email: user.email! }]),
        react: expect.anything(),
      }),
    );
    const call = vi.mocked(sentEmailViaResend).mock.calls[0]![0];
    const html = await render(call.react);
    expectEmailTableRow(html, "Open tickets", 2);
    expectEmailTableRow(html, "Tickets answered", 2);
    expectEmailTableRow(html, "Open tickets over $0", 0);
    expectEmailTableRow(html, "Tickets answered over $0", 0);
    expectEmailTableRow(html, "Average reply time", "1h 30m");
    expectEmailTableRow(html, "VIP average reply time", "—");
    expectEmailTableRow(html, "Average time existing open tickets have been open", "12h 0m");
  });

  it("calculates correct metrics with VIP customers", async () => {
    const { mailbox, user } = await userFactory.createRootUser({ mailboxOverrides: { vipThreshold: 100 } });

    const endTime = new Date();
    const midTime = subHours(endTime, 12);

    const customerEmail = faker.internet.email();
    const vipCustomerEmail = faker.internet.email();

    await platformCustomerFactory.create({
      email: customerEmail,
      value: "50.00",
    });
    await platformCustomerFactory.create({
      email: vipCustomerEmail,
      value: "25000.00",
    });

    const { conversation: normalConv } = await conversationFactory.create({
      status: "open",
      emailFrom: customerEmail,
      lastUserEmailCreatedAt: midTime,
    });
    const { conversation: vipConv } = await conversationFactory.create({
      status: "open",
      emailFrom: vipCustomerEmail,
      lastUserEmailCreatedAt: midTime,
    });

    const normalUserMsg = await conversationFactory.createUserEmail(normalConv.id, {
      createdAt: midTime,
    });
    const vipUserMsg = await conversationFactory.createUserEmail(vipConv.id, {
      createdAt: midTime,
    });

    await conversationFactory.createStaffEmail(normalConv.id, user.id, {
      createdAt: new Date(midTime.getTime() + 3600000),
      responseToId: normalUserMsg.id,
    });
    await conversationFactory.createStaffEmail(vipConv.id, user.id, {
      createdAt: new Date(midTime.getTime() + 1800000),
      responseToId: vipUserMsg.id,
    });

    const result = await generateMailboxEmailReport({ mailbox });

    expect(result).toEqual({
      success: true,
      openTicketCount: 2,
      answeredTicketCount: 2,
      openTicketsOverZeroCount: 2,
      answeredTicketsOverZeroCount: 2,
      avgReplyTimeResult: "0h 45m",
      vipAvgReplyTime: "0h 30m",
      avgWaitTime: "12h 0m",
    });

    const call = vi.mocked(sentEmailViaResend).mock.calls[0]![0];
    const html = await render(call.react);
    expectEmailTableRow(html, "Open tickets", 2);
    expectEmailTableRow(html, "Tickets answered", 2);
    expectEmailTableRow(html, "Open tickets over $0", 2);
    expectEmailTableRow(html, "Tickets answered over $0", 2);
    expectEmailTableRow(html, "Average reply time", "0h 45m");
    expectEmailTableRow(html, "VIP average reply time", "0h 30m");
    expectEmailTableRow(html, "Average time existing open tickets have been open", "12h 0m");
  });

  it("handles scenarios with no platform customers", async () => {
    const { mailbox, user } = await userFactory.createRootUser();

    const endTime = new Date();
    const midTime = subHours(endTime, 12);

    const { conversation: openConv } = await conversationFactory.create({
      status: "open",
      lastUserEmailCreatedAt: midTime,
    });

    const userMsg = await conversationFactory.createUserEmail(openConv.id, {
      createdAt: midTime,
    });

    await conversationFactory.createStaffEmail(openConv.id, user.id, {
      createdAt: new Date(midTime.getTime() + 3600000),
      responseToId: userMsg.id,
    });

    const result = await generateMailboxEmailReport({ mailbox });

    expect(result).toEqual({
      success: true,
      openTicketCount: 1,
      answeredTicketCount: 1,
      openTicketsOverZeroCount: 0,
      answeredTicketsOverZeroCount: 0,
      avgReplyTimeResult: "1h 0m",
      vipAvgReplyTime: null,
      avgWaitTime: "12h 0m",
    });

    const call = vi.mocked(sentEmailViaResend).mock.calls[0]![0];
    const html = await render(call.react);
    expectEmailTableRow(html, "Open tickets", 1);
    expectEmailTableRow(html, "Tickets answered", 1);
    expectEmailTableRow(html, "Open tickets over $0", 0);
    expectEmailTableRow(html, "Tickets answered over $0", 0);
    expectEmailTableRow(html, "Average reply time", "1h 0m");
    expectEmailTableRow(html, "VIP average reply time", "—");
    expectEmailTableRow(html, "Average time existing open tickets have been open", "12h 0m");
  });

  it("handles zero-value platform customers correctly", async () => {
    const { mailbox, user } = await userFactory.createRootUser();

    const endTime = new Date();
    const midTime = subHours(endTime, 12);

    const customerEmail = faker.internet.email();

    await platformCustomerFactory.create({
      email: customerEmail,
      value: "0.00",
    });

    const { conversation: openConv } = await conversationFactory.create({
      status: "open",
      emailFrom: customerEmail,
      lastUserEmailCreatedAt: midTime,
    });

    const userMsg = await conversationFactory.createUserEmail(openConv.id, {
      createdAt: midTime,
    });

    await conversationFactory.createStaffEmail(openConv.id, user.id, {
      createdAt: new Date(midTime.getTime() + 3600000),
      responseToId: userMsg.id,
    });

    const result = await generateMailboxEmailReport({ mailbox });

    expect(result).toEqual({
      success: true,
      openTicketCount: 1,
      answeredTicketCount: 1,
      openTicketsOverZeroCount: 0,
      answeredTicketsOverZeroCount: 0,
      avgReplyTimeResult: "1h 0m",
      vipAvgReplyTime: null,
      avgWaitTime: "12h 0m",
    });

    const call = vi.mocked(sentEmailViaResend).mock.calls[0]![0];
    const html = await render(call.react);
    expectEmailTableRow(html, "Open tickets", 1);
    expectEmailTableRow(html, "Tickets answered", 1);
    expectEmailTableRow(html, "Open tickets over $0", 0);
    expectEmailTableRow(html, "Tickets answered over $0", 0);
    expectEmailTableRow(html, "Average reply time", "1h 0m");
    expectEmailTableRow(html, "VIP average reply time", "—");
    expectEmailTableRow(html, "Average time existing open tickets have been open", "12h 0m");
  });

  it("excludes merged conversations from counts", async () => {
    const { mailbox, user } = await userFactory.createRootUser();

    const endTime = new Date();
    const midTime = subHours(endTime, 12);

    const { conversation: openConv } = await conversationFactory.create({
      status: "open",
      lastUserEmailCreatedAt: midTime,
    });
    const { conversation: _mergedConv } = await conversationFactory.create({
      status: "open",
      mergedIntoId: openConv.id,
      lastUserEmailCreatedAt: midTime,
    });

    const userMsg = await conversationFactory.createUserEmail(openConv.id, {
      createdAt: midTime,
    });

    await conversationFactory.createStaffEmail(openConv.id, user.id, {
      createdAt: new Date(midTime.getTime() + 3600000),
      responseToId: userMsg.id,
    });

    const result = await generateMailboxEmailReport({ mailbox });

    expect(result).toEqual({
      success: true,
      openTicketCount: 1,
      answeredTicketCount: 1,
      openTicketsOverZeroCount: 0,
      answeredTicketsOverZeroCount: 0,
      avgReplyTimeResult: "1h 0m",
      vipAvgReplyTime: null,
      avgWaitTime: "12h 0m",
    });

    const call = vi.mocked(sentEmailViaResend).mock.calls[0]![0];
    const html = await render(call.react);
    expectEmailTableRow(html, "Open tickets", 1);
    expectEmailTableRow(html, "Tickets answered", 1);
    expectEmailTableRow(html, "Open tickets over $0", 0);
    expectEmailTableRow(html, "Tickets answered over $0", 0);
    expectEmailTableRow(html, "Average reply time", "1h 0m");
    expectEmailTableRow(html, "VIP average reply time", "—");
    expectEmailTableRow(html, "Average time existing open tickets have been open", "12h 0m");
  });

  it("only counts messages within the 24-hour window", async () => {
    const { mailbox, user } = await userFactory.createRootUser();

    const endTime = new Date();
    const beforeWindow = subHours(endTime, 30);
    const withinWindow = subHours(endTime, 12);

    const { conversation: openConv } = await conversationFactory.create({
      status: "open",
      lastUserEmailCreatedAt: withinWindow,
    });

    const userMsg = await conversationFactory.createUserEmail(openConv.id, {
      createdAt: withinWindow,
    });

    await conversationFactory.createStaffEmail(openConv.id, user.id, {
      createdAt: beforeWindow,
      responseToId: userMsg.id,
    });

    await conversationFactory.createStaffEmail(openConv.id, user.id, {
      createdAt: new Date(withinWindow.getTime() + 3600000),
      responseToId: userMsg.id,
    });

    const result = await generateMailboxEmailReport({ mailbox });

    expect(result).toEqual({
      success: true,
      openTicketCount: 1,
      answeredTicketCount: 1,
      openTicketsOverZeroCount: 0,
      answeredTicketsOverZeroCount: 0,
      avgReplyTimeResult: "1h 0m",
      vipAvgReplyTime: null,
      avgWaitTime: "12h 0m",
    });

    const call = vi.mocked(sentEmailViaResend).mock.calls[0]![0];
    const html = await render(call.react);
    expectEmailTableRow(html, "Open tickets", 1);
    expectEmailTableRow(html, "Tickets answered", 1);
    expectEmailTableRow(html, "Open tickets over $0", 0);
    expectEmailTableRow(html, "Tickets answered over $0", 0);
    expectEmailTableRow(html, "Average reply time", "1h 0m");
    expectEmailTableRow(html, "VIP average reply time", "—");
    expectEmailTableRow(html, "Average time existing open tickets have been open", "12h 0m");
  });

  it("excludes users with allowDailyEmail=false from recipients", async () => {
    const { mailbox, user: u1 } = await userFactory.createRootUser({
      userOverrides: { email: "a@example.com" },
    });
    const { user: u2 } = await userFactory.createRootUser({
      userOverrides: { email: "b@example.com" },
    });
    await userFactory.createRootUser({
      userOverrides: { email: "c@example.com" },
    });

    await db
      .update(userProfiles)
      .set({ preferences: { allowDailyEmail: false } })
      .where(eq(userProfiles.id, u1.id));
    await db
      .update(userProfiles)
      .set({ preferences: { allowDailyEmail: false } })
      .where(eq(userProfiles.id, u2.id));

    // Ensure there is at least one open ticket so the report is sent
    await conversationFactory.create({ status: "open", lastUserEmailCreatedAt: subHours(new Date(), 6) });

    const result = await generateMailboxEmailReport({ mailbox });

    expect(sentEmailViaResend).toHaveBeenCalledTimes(1);
    const call = vi.mocked(sentEmailViaResend).mock.calls[0]![0];
    expect(call.memberList).toEqual([{ email: "c@example.com" }]);
    expect(result).toEqual(expect.objectContaining({ success: true }));
  });
});
