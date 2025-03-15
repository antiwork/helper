export type SlackMentionParams = {
  text: string;
  userId: string;
  channelId: string;
  messageTs: string;
  mailbox: {
    id: number;
    slug: string;
    slackBotToken: string;
    clerkOrganizationId: string;
  };
};

export type SlackUser = {
  id: string;
  fullName?: string;
};
