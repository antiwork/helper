"use client";

import { useCallback, useState } from "react";
import { CreateConversationParams, CreateConversationResult } from "@helperai/client";
import { useHelperContext } from "../context/HelperContext";

interface UseCreateConversationResult {
  createConversation: (params?: CreateConversationParams) => Promise<CreateConversationResult>;
  loading: boolean;
  error: string | null;
}

export function useCreateConversation(): UseCreateConversationResult {
  const { client } = useHelperContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createConversation = useCallback(
    async (params: CreateConversationParams = {}) => {
      try {
        setLoading(true);
        setError(null);

        return await client.conversations.create(params);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to create conversation";
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client],
  );

  return {
    createConversation,
    loading,
    error,
  };
}
