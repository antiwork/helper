import { userFactory } from "@tests/support/factories/users";
import { createTestTRPCContext } from "@tests/support/trpcUtils";
import { TRPCError } from "@trpc/server";
import { describe, expect, it, vi } from "vitest";
import * as slackClient from "@/lib/slack/client";
import { createCaller } from "@/trpc";

vi.mock("@/lib/slack/client");

describe("slackRouter", () => {
  describe("channels", () => {
    it("throws an error when Slack is not connected", async () => {
      const { user } = await userFactory.createRootUser();

      const caller = createCaller(await createTestTRPCContext(user));
      await expect(caller.mailbox.slack.channels()).rejects.toThrow(
        new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Slack is not connected to this mailbox",
        }),
      );
    });

    it("returns a list of channels when Slack is connected", async () => {
      const { user } = await userFactory.createRootUser({
        mailboxOverrides: { slackBotToken: "xoxb-123" },
      });

      const mockChannels = [
        { id: "channel1", name: "general" },
        { id: "channel2", name: "random" },
        { id: undefined, name: "invalid" },
        { id: "channel3", name: undefined },
      ];

      vi.mocked(slackClient.listSlackChannels).mockResolvedValue(mockChannels);

      const caller = createCaller(await createTestTRPCContext(user));
      const result = await caller.mailbox.slack.channels();

      expect(slackClient.listSlackChannels).toHaveBeenCalledWith("xoxb-123");
      expect(result).toEqual([
        { id: "channel1", name: "general" },
        { id: "channel2", name: "random" },
      ]);
    });
  });
});
