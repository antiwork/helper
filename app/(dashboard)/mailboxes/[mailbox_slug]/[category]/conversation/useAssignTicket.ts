import { useConversationContext } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/[category]/conversation/conversationContext";
import { useConversationListContext } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/[category]/list/conversationListContext";
import { useConversationsListInput } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/[category]/shared/queries";
import { toast } from "@/components/hooks/use-toast";
import { api } from "@/trpc/react";

export const useAssignTicket = () => {
  const utils = api.useUtils();
  const { input } = useConversationsListInput();
  const { currentConversationSlug, conversationListData, moveToNextConversation, removeConversation } =
    useConversationListContext();
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
    toast({
      title: assignedToAI
        ? "Assigned to Helper agent"
        : assignedTo
          ? `Assigned ${assignedTo.displayName}`
          : "Unassigned ticket",
    });
    if (
      (input.category === "mine" && assignedToId !== conversationListData?.assignedToIds?.[0]) ||
      (input.category === "unassigned" && assignedToId) ||
      (input.category === "assigned" && !assignedToId)
    ) {
      removeConversation();
    } else {
      moveToNextConversation();
    }
  };

  return { assignTicket };
};
