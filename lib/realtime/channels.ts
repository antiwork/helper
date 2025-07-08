export const conversationsListChannelId = () => `conversations`;

export const conversationChannelId = (conversationSlug: string) => `conversation-${conversationSlug}`;

export const publicConversationChannelId = (conversationSlug: string) => `public:conversation-${conversationSlug}`;

export const dashboardChannelId = () => `dashboard`;
