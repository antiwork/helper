"use client";

import { Message } from "@helperai/client";
import { useCallback, useEffect, useState } from "react";
import { useHelperContext } from "../context/HelperContext";

export interface AttachmentAnnotation {
  attachment: {
    name: string;
    url: string;
  };
}

export interface UserAnnotation {
  user: {
    name: string;
  };
}

export interface Conversation {
  subject: string | null;
  messages: Message[];
  isEscalated: boolean;
}

interface UseConversationResult {
  conversation: Conversation | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useConversation(conversationSlug: string): UseConversationResult {
  const { client } = useHelperContext();
  const [conversation, setConversation] = useState<Conversation | null>(null);
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
      setConversation(data);
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
    conversation,
    loading,
    error,
    refetch: fetchConversation,
  };
}
