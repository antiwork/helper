"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ConversationDetails,
  ConversationsResult,
  CreateConversationParams,
  UnreadConversationsCountResult,
  UpdateConversationParams,
} from "@helperai/client";
import { useHelperClient } from "../components/helperClientProvider";

export const useConversations = () => {
  const client = useHelperClient();
  return useQuery({
    queryKey: ["conversations"],
    queryFn: () => client.conversations.list(),
  });
};

export const useConversation = (slug: string, options?: { markRead?: boolean }) => {
  const client = useHelperClient();
  return useQuery({
    queryKey: ["conversation", slug],
    queryFn: () => client.conversations.get(slug, options),
    enabled: !!slug,
  });
};

export const useUnreadConversationsCount = () => {
  const client = useHelperClient();
  return useQuery({
    queryKey: ["conversations", "unread"],
    queryFn: () => client.conversations.unread(),
  });
};

export const useCreateConversation = () => {
  const client = useHelperClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateConversationParams = {}) => client.conversations.create(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};

export const useUpdateConversation = () => {
  const client = useHelperClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ slug, params }: { slug: string; params: UpdateConversationParams }) =>
      client.conversations.update(slug, params),
    onSuccess: (_, { slug }) => {
      queryClient.invalidateQueries({ queryKey: ["conversation", slug] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};
