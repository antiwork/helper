"use client";

import { useCallback, useState } from "react";
import { useHelperContext } from "../context/HelperContext";

interface PatchConversationParams {
  markRead: true;
}

interface PatchConversationResult {
  success: true;
}

interface UseUpdateConversationResult {
  patchConversation: (slug: string, params: PatchConversationParams) => Promise<PatchConversationResult>;
  loading: boolean;
  error: string | null;
}

export function useUpdateConversation(): UseUpdateConversationResult {
  const { host, getToken } = useHelperContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patchConversation = useCallback(
    async (slug: string, params: PatchConversationParams) => {
      const token = await getToken();

      if (!token) {
        throw new Error("No authentication token provided");
      }

      if (!slug) {
        throw new Error("Conversation slug is required");
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${host}/api/chat/conversation/${slug}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(params),
        });

        if (!response.ok) {
          throw new Error(`Failed to update conversation: ${response.statusText}`);
        }

        const data = await response.json();
        return data;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to update conversation";
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [host, getToken],
  );

  return {
    patchConversation,
    loading,
    error,
  };
}
