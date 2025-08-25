import { toast } from "sonner";
import { useConversationContext } from "@/app/(dashboard)/[category]/conversation/conversationContext";
import { useConversationListContext } from "@/app/(dashboard)/[category]/list/conversationListContext";
import { useConversationsListInput } from "@/app/(dashboard)/[category]/shared/queries";
import { api } from "@/trpc/react";

export const useAssignTicket = () => {
  const utils = api.useUtils();
  const { input } = useConversationsListInput();
  const { currentConversationSlug, conversationListData, removeConversation } = useConversationListContext();
  const { updateConversation } = useConversationContext();

  const assignTicket = (
    assignedTo: { id: string; displayName: string } | { ai: true } | null,
    message?: string | null,
  ) => {
    const assignedToId = !!assignedTo && "id" in assignedTo ? assignedTo.id : null;
    const assignedToAI = !!assignedTo && "ai" in assignedTo;
    updateConversation({ assignedToId, assignedToAI, message });

    utils.mailbox.conversations.list.setInfiniteData(input, (data) => {
      if (!data) return data;
      return {
        ...data,
        pages: data.pages.map((page) => ({
          ...page,
          conversations: page.conversations.map((c) =>
            c.slug === currentConversationSlug ? { ...c, assignedToId, assignedToAI } : c,
          ),
        })),
      };
    });
    toast.success(
      assignedToAI
        ? "Assigned to Helper agent"
        : assignedTo
          ? `Assigned ${assignedTo.displayName}`
          : "Unassigned ticket",
    );
    if (
      (input.category === "mine" && assignedToId !== conversationListData?.assignedToIds?.[0]) ||
      (input.category === "unassigned" && assignedToId) ||
      (input.category === "assigned" && !assignedToId)
    ) {
      removeConversation({ moveToNext: false });
    }
  };

  return { assignTicket };
};
