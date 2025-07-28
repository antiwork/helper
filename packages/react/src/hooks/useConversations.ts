"use client";

import { useMutation, UseMutationOptions, useQuery, useQueryClient, UseQueryOptions } from "@tanstack/react-query";
import { useEffect } from "react";
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
  options?: { markRead?: boolean; enableRealtime?: boolean },
  queryOptions?: Partial<UseQueryOptions<ConversationDetails>>,
) => {
  const client = useHelperClient();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (options?.enableRealtime === false) return;

    const unlisten = client.conversations.listen(slug, {
      onSubjectChanged: (subject) => {
        queryClient.setQueryData(["conversation", slug], (old: ConversationDetails | undefined) => {
          if (!old) return old;
          return { ...old, subject };
        });
      },
    });

    return unlisten;
  }, [slug, options?.enableRealtime]);

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
