"use client";

import { useCallback, useEffect, useState } from "react";
import { Conversation } from "@helperai/client";
import { useHelperContext } from "../context/HelperContext";

interface UseConversationsResult {
  conversations: Conversation[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useConversations(): UseConversationsResult {
  const { client } = useHelperContext();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await client.conversations.list();
      setConversations(data.conversations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch conversations");
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return {
    conversations,
    loading,
    error,
    refetch: fetchConversations,
  };
}
