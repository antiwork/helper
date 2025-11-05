import { getMailbox } from "@/lib/data/mailbox";

export const checkVipResponseTimes = async () => {
  const mailbox = await getMailbox();
  if (!mailbox) return { success: true, skipped: "no_mailbox" };

  return { success: true, skipped: "slack_removed" };
};
