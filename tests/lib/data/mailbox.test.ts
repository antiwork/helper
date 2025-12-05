import { userFactory } from "@tests/support/factories/users";
import { expect, test } from "vitest";
import { getMailboxInfo } from "@/lib/data/mailbox";
import { env } from "@/lib/env";

test("getMailboxInfo", async () => {
  const { mailbox } = await userFactory.createRootUser();
  const info = getMailboxInfo(mailbox);
  expect(info).toEqual({
    id: mailbox.id,
    name: mailbox.name,
    slug: mailbox.slug,
    preferences: {},
    widgetHMACSecret: mailbox.widgetHMACSecret,
    widgetDisplayMode: "always",
    widgetDisplayMinValue: null,
    widgetHost: null,
    vipThreshold: null,
    vipExpectedResponseHours: null,
    githubConnectUrl: null,
    githubConnected: false,
    githubRepoName: null,
    githubRepoOwner: null,
    autoCloseDaysOfInactivity: 14,
    autoCloseEnabled: false,
    firecrawlEnabled: false,
  });
});
