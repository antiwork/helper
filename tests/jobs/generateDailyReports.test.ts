import { faker } from "@faker-js/faker";
import { conversationFactory } from "@tests/support/factories/conversations";
import { platformCustomerFactory } from "@tests/support/factories/platformCustomers";
import { userFactory } from "@tests/support/factories/users";
import { subHours } from "date-fns";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateMailboxDailyReport } from "@/jobs/generateDailyReports";
import { getMailbox } from "@/lib/data/mailbox";
import { postSlackMessage } from "@/lib/slack/client";

vi.mock("@/lib/data/mailbox", () => ({
  getMailbox: vi.fn(),
}));

vi.mock("@/lib/slack/client", () => ({
  postSlackMessage: vi.fn(),
}));

describe("generateMailboxDailyReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips when mailbox has no slack configuration", async () => {
    vi.mocked(getMailbox).mockResolvedValue({
      id: 1,
      name: "Test Mailbox",
      slackBotToken: null,
      slackAlertChannel: null,
      vipThreshold: null,
    } as any);

    const result = await generateMailboxDailyReport();

    expect(result).toBeUndefined();
    expect(postSlackMessage).not.toHaveBeenCalled();
  });

  it("skips when there are no open tickets", async () => {
    const { mailbox } = await userFactory.createRootUser({
      mailboxOverrides: {
        slackBotToken: "test-token",
        slackAlertChannel: "test-channel",
      },
    });

    vi.mocked(getMailbox).mockResolvedValue(mailbox);

    const result = await generateMailboxDailyReport();

    expect(result).toEqual({
      skipped: true,
      reason: "No open tickets",
    });
    expect(postSlackMessage).not.toHaveBeenCalled();
  });

  it("calculates correct metrics for basic scenarios", async () => {
    const { mailbox, user } = await userFactory.createRootUser({
      mailboxOverrides: {
        slackBotToken: "test-token",
        slackAlertChannel: "test-channel",
      },
    });

    vi.mocked(getMailbox).mockResolvedValue(mailbox);

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

    const result = await generateMailboxDailyReport();

    expect(result).toEqual({
      success: true,
      openCountMessage: "• Open tickets: 2",
      answeredCountMessage: "• Tickets answered: 2",
      openTicketsOverZeroMessage: null,
      answeredTicketsOverZeroMessage: null,
      avgReplyTimeMessage: "• Average reply time: 1h 30m",
      vipAvgReplyTimeMessage: null,
      avgWaitTimeMessage: "• Average time existing open tickets have been open: 12h 0m",
    });

    expect(postSlackMessage).toHaveBeenCalledWith("test-token", {
      channel: "test-channel",
      text: `Daily summary for ${mailbox.name}`,
      blocks: expect.any(Array),
    });
  });

  it("calculates correct metrics with VIP customers", async () => {
    const { mailbox, user } = await userFactory.createRootUser({
      mailboxOverrides: {
        slackBotToken: "test-token",
        slackAlertChannel: "test-channel",
        vipThreshold: 100,
      },
    });

    vi.mocked(getMailbox).mockResolvedValue(mailbox);

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

    const result = await generateMailboxDailyReport();

    expect(result).toEqual({
      success: true,
      openCountMessage: "• Open tickets: 2",
      answeredCountMessage: "• Tickets answered: 2",
      openTicketsOverZeroMessage: "• Open tickets over $0: 2",
      answeredTicketsOverZeroMessage: "• Tickets answered over $0: 2",
      avgReplyTimeMessage: "• Average reply time: 0h 45m",
      vipAvgReplyTimeMessage: "• VIP average reply time: 0h 30m",
      avgWaitTimeMessage: "• Average time existing open tickets have been open: 12h 0m",
    });
  });

  it("handles scenarios with no platform customers", async () => {
    const { mailbox, user } = await userFactory.createRootUser({
      mailboxOverrides: {
        slackBotToken: "test-token",
        slackAlertChannel: "test-channel",
      },
    });

    vi.mocked(getMailbox).mockResolvedValue(mailbox);

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

    const result = await generateMailboxDailyReport();

    expect(result).toEqual({
      success: true,
      openCountMessage: "• Open tickets: 1",
      answeredCountMessage: "• Tickets answered: 1",
      openTicketsOverZeroMessage: null,
      answeredTicketsOverZeroMessage: null,
      avgReplyTimeMessage: "• Average reply time: 1h 0m",
      vipAvgReplyTimeMessage: null,
      avgWaitTimeMessage: "• Average time existing open tickets have been open: 12h 0m",
    });
  });

  it("handles zero-value platform customers correctly", async () => {
    const { mailbox, user } = await userFactory.createRootUser({
      mailboxOverrides: {
        slackBotToken: "test-token",
        slackAlertChannel: "test-channel",
      },
    });

    vi.mocked(getMailbox).mockResolvedValue(mailbox);

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

    const result = await generateMailboxDailyReport();

    expect(result).toEqual({
      success: true,
      openCountMessage: "• Open tickets: 1",
      answeredCountMessage: "• Tickets answered: 1",
      openTicketsOverZeroMessage: null,
      answeredTicketsOverZeroMessage: null,
      avgReplyTimeMessage: "• Average reply time: 1h 0m",
      vipAvgReplyTimeMessage: null,
      avgWaitTimeMessage: "• Average time existing open tickets have been open: 12h 0m",
    });
  });

  it("excludes merged conversations from counts", async () => {
    const { mailbox, user } = await userFactory.createRootUser({
      mailboxOverrides: {
        slackBotToken: "test-token",
        slackAlertChannel: "test-channel",
      },
    });

    vi.mocked(getMailbox).mockResolvedValue(mailbox);

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

    const result = await generateMailboxDailyReport();

    expect(result).toEqual({
      success: true,
      openCountMessage: "• Open tickets: 1",
      answeredCountMessage: "• Tickets answered: 1",
      openTicketsOverZeroMessage: null,
      answeredTicketsOverZeroMessage: null,
      avgReplyTimeMessage: "• Average reply time: 1h 0m",
      vipAvgReplyTimeMessage: null,
      avgWaitTimeMessage: "• Average time existing open tickets have been open: 12h 0m",
    });
  });

  it("only counts messages within the 24-hour window", async () => {
    const { mailbox, user } = await userFactory.createRootUser({
      mailboxOverrides: {
        slackBotToken: "test-token",
        slackAlertChannel: "test-channel",
      },
    });

    vi.mocked(getMailbox).mockResolvedValue(mailbox);

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

    const result = await generateMailboxDailyReport();

    expect(result).toEqual({
      success: true,
      openCountMessage: "• Open tickets: 1",
      answeredCountMessage: "• Tickets answered: 1",
      openTicketsOverZeroMessage: null,
      answeredTicketsOverZeroMessage: null,
      avgReplyTimeMessage: "• Average reply time: 1h 0m",
      vipAvgReplyTimeMessage: null,
      avgWaitTimeMessage: "• Average time existing open tickets have been open: 12h 0m",
    });
  });
});
