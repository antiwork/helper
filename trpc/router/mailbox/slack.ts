import { TRPCError } from "@trpc/server";
import { disconnectSlack } from "@/lib/data/mailbox";
import { listSlackChannels } from "@/lib/slack/client";
import { mailboxProcedure } from "./procedure";

export const slackRouter = {
  channels: mailboxProcedure.query(async ({ ctx }) => {
    if (!ctx.mailbox.slackBotToken) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Slack is not connected to this mailbox",
      });
    }

    const channels = await listSlackChannels(ctx.mailbox.slackBotToken);
    return channels.flatMap((channel) => (channel.id && channel.name ? [{ id: channel.id, name: channel.name }] : []));
  }),
  disconnect: mailboxProcedure.mutation(async ({ ctx }) => {
    await disconnectSlack(ctx.mailbox.id);
  }),
};
