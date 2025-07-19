"use client";

import { useCallback, useEffect, useState } from "react";
import { Message } from "@helperai/client";
import { useHelperContext } from "../context/HelperContext";

interface UseConversationResult {
  messages: Message[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useConversation(conversationSlug: string): UseConversationResult {
  const { client } = useHelperContext();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConversation = useCallback(async () => {
    if (!conversationSlug) {
      setError("No conversation slug provided");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = await client.conversations.get(conversationSlug);
      setMessages(data.messages || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch conversation");
    } finally {
      setLoading(false);
    }
  }, [client, conversationSlug]);

  useEffect(() => {
    fetchConversation();
  }, [fetchConversation]);

  return {
    messages,
    loading,
    error,
    refetch: fetchConversation,
  };
}
