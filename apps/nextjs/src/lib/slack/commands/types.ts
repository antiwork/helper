export type SlackCommandParams = {
  text: string;
  userId: string;
  channelId: string;
  responseUrl: string;
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

export type CommandArgs = {
  command: string;
  search?: string;
  [key: string]: string | undefined;
};
