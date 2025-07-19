"use client";

import { useCallback, useState } from "react";
import { PatchConversationParams, PatchConversationResult } from "@helperai/client";
import { useHelperContext } from "../context/HelperContext";

interface UseUpdateConversationResult {
  patchConversation: (slug: string, params: PatchConversationParams) => Promise<PatchConversationResult>;
  loading: boolean;
  error: string | null;
}

export function useUpdateConversation(): UseUpdateConversationResult {
  const { client } = useHelperContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patchConversation = useCallback(
    async (slug: string, params: PatchConversationParams) => {
      if (!slug) {
        throw new Error("Conversation slug is required");
      }

      try {
        setLoading(true);
        setError(null);

        return await client.conversations.update(slug, params);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to update conversation";
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client],
  );

  return {
    patchConversation,
    loading,
    error,
  };
}
