"use client";

import { Message } from "@ai-sdk/react";
import { useCallback, useEffect, useState } from "react";
import { useHelperContext } from "../context/HelperContext";

// TODO: Make this return custom types rather than forcing everything into the Message interface

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
  const { host, getToken } = useHelperContext();
  const [conversation, setConversation] = useState<Conversation | null>(null);
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
      setConversation(data);
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
    conversation,
    loading,
    error,
    refetch: fetchConversation,
  };
}
