"use client";

import { useCallback, useEffect, useState } from "react";
import { useHelperContext } from "../context/HelperContext";

interface Message {
  id: string;
  content: string;
  role: string;
}

interface UseConversationResult {
  messages: Message[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useConversation(conversationSlug: string): UseConversationResult {
  const { host, getToken } = useHelperContext();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConversation = useCallback(async () => {
    const token = await getToken();

    if (!token) {
      setError("No authentication token provided");
      setLoading(false);
      return;
    }

    if (!conversationSlug) {
      setError("No conversation slug provided");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${host}/api/chat/conversation/${conversationSlug}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch conversation: ${response.statusText}`);
      }

      const data = await response.json();
      setMessages(data.messages || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch conversation");
    } finally {
      setLoading(false);
    }
  }, [host, getToken, conversationSlug]);

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
