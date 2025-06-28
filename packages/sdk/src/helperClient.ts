import { CreateConversationParams } from "./apiTypes";

export const createHelperClient = ({ host }: { host: string }) => {
  return {
    conversations: {
      unreadCount: () => null,
      create: (params: CreateConversationParams = {}) => null,
      list: () => null,
      get: () => null,
    },
    replies: {
      create: () => null,
    },
    useChat: () => null,
  };
};
