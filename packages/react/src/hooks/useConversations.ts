"use client";

import { useMutation, UseMutationOptions, useQuery, useQueryClient, UseQueryOptions } from "@tanstack/react-query";
import type {
  ConversationDetails,
  ConversationsResult,
  CreateConversationParams,
  UnreadConversationsCountResult,
  UpdateConversationParams,
} from "@helperai/client";
import { useHelperClient } from "../components/helperClientProvider";

export const useConversations = (queryOptions?: Partial<UseQueryOptions<ConversationsResult>>) => {
  const client = useHelperClient();
  return useQuery({
    queryKey: ["conversations"],
    queryFn: () => client.conversations.list(),
    ...queryOptions,
  });
};

export const useConversation = (
  slug: string,
  options?: { markRead?: boolean },
  queryOptions?: Partial<UseQueryOptions<ConversationDetails>>,
) => {
  const client = useHelperClient();
  return useQuery({
    queryKey: ["conversation", slug],
    queryFn: () => client.conversations.get(slug, options),
    enabled: !!slug,
    ...queryOptions,
  });
};

export const useUnreadConversationsCount = (
  queryOptions?: Partial<UseQueryOptions<UnreadConversationsCountResult>>,
) => {
  const client = useHelperClient();
  return useQuery({
    queryKey: ["conversations", "unread"],
    queryFn: () => client.conversations.unread(),
    ...queryOptions,
  });
};

export const useCreateConversation = (
  mutationOptions?: Partial<UseMutationOptions<any, Error, CreateConversationParams>>,
) => {
  const client = useHelperClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateConversationParams = {}) => client.conversations.create(params),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      mutationOptions?.onSuccess?.(data, variables, context);
    },
    ...mutationOptions,
  });
};

export const useUpdateConversation = (
  mutationOptions?: Partial<UseMutationOptions<any, Error, { slug: string; params: UpdateConversationParams }>>,
) => {
  const client = useHelperClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ slug, params }: { slug: string; params: UpdateConversationParams }) =>
      client.conversations.update(slug, params),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["conversation", variables.slug] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      mutationOptions?.onSuccess?.(data, variables, context);
    },
    ...mutationOptions,
  });
};
