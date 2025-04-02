import { useChat } from "@ai-sdk/react";
import { useEffect, useState } from "react";

type GuideInstructions = {
  instructions: string;
  callId: string | null;
};

export default function HelpingHand({
  guideInstructions,
  token,
}: {
  guideInstructions: GuideInstructions;
  token: string;
}) {
  const { messages, append } = useChat({
    api: "/api/ai-guide",
    maxSteps: 20,
    generateId: () => `client_${Math.random().toString(36).slice(-6)}`,
    onToolCall({ toolCall }) {
      console.log(toolCall);
    },
    experimental_prepareRequestBody({ messages, id, requestBody }) {
      return {
        id,
        messages,
        ...requestBody,
      };
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  useEffect(() => {
    append({ role: "user", content: guideInstructions.instructions });
  }, [guideInstructions]);

  return (
    <div className="flex flex-col h-72 w-full items-center justify-center px-4 text-sm text-gray-500 overflow-y-scroll">
      <div className="flex flex-col gap-2">
        {messages.map((message) => (
          <div className="flex flex-col gap-2 rounded-lg p-2 border border-gray-200" key={message.id}>
            <div className="text-sm text-gray-500">{message.role}</div>
            <div className="text-sm text-gray-500">{message.content}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
