"use client";

import { useCallback, useState } from "react";
import { useHelperContext } from "../context/HelperContext";

interface CreateConversationParams {
  isPrompt?: boolean;
}

interface CreateConversationResult {
  conversationSlug: string;
}

interface UseCreateConversationResult {
  createConversation: (params?: CreateConversationParams) => Promise<CreateConversationResult>;
  loading: boolean;
  error: string | null;
}

export function useCreateConversation(): UseCreateConversationResult {
  const { host, getToken } = useHelperContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createConversation = useCallback(
    async (params: CreateConversationParams = {}) => {
      const token = await getToken();

      if (!token) {
        throw new Error("No authentication token provided");
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${host}/api/chat/conversation`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(params),
        });

        if (!response.ok) {
          throw new Error(`Failed to create conversation: ${response.statusText}`);
        }

        const data = await response.json();
        return data;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to create conversation";
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [host, getToken],
  );

  return {
    createConversation,
    loading,
    error,
  };
}
