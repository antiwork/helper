export const conversationsListChannelId = () => ({ name: `conversations`, private: true });

export const conversationChannelId = (conversationSlug: string) => ({
  name: `conversation-${conversationSlug}`,
  private: true,
});

export const publicConversationChannelId = (conversationSlug: string) => ({
  name: `public:conversation-${conversationSlug}`,
  private: false,
});

export const issueGroupsChannelId = () => `issue-groups`;
export const dashboardChannelId = () => ({ name: `dashboard`, private: true });
