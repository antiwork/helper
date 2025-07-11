import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export const useNewConversation = (token: string | null) => {
  const [conversationSlug, setConversationSlug] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const createConversationMutation = useMutation({
    mutationFn: async ({ isPrompt }: { isPrompt: boolean }) => {
      if (!token) {
        throw new Error("Authentication token is required");
      }

      const response = await fetch("/api/chat/conversation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isPrompt }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create conversation: ${response.status}`);
      }

      const data = await response.json();
      return data.conversationSlug || null;
    },
    onSuccess: (newSlug) => {
      setConversationSlug(newSlug);
      queryClient.removeQueries({ queryKey: ["conversations"] });
    },
  });

  return {
    conversationSlug,
    setConversationSlug,
    createConversation: createConversationMutation.mutateAsync,
  };
};
