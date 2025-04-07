import { useConversationContext } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/(inbox)/_components/conversationContext";
import { useConversationListContext } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/(inbox)/_components/conversationListContext";
import { useConversationsListInput } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/(inbox)/_components/shared/queries";
import { toast } from "@/components/hooks/use-toast";
import { api } from "@/trpc/react";

export const useAssignTicket = () => {
  const utils = api.useUtils();
  const { input } = useConversationsListInput();
  const { currentConversationSlug, conversationListData, moveToNextConversation, removeConversation } =
    useConversationListContext();
  const { updateConversation } = useConversationContext();

  const assignTicket = (assignedTo: { id: string; displayName: string } | null, message?: string | null) => {
    const assignedToId = assignedTo?.id ?? null;
    updateConversation({ assignedToId, message });

    utils.mailbox.conversations.list.setInfiniteData(input, (data) => {
      if (!data) return data;
      return {
        ...data,
        pages: data.pages.map((page) => ({
          ...page,
          conversations: page.conversations.map((c) =>
            c.slug === currentConversationSlug ? { ...c, assignedToClerkId: assignedToId ?? null } : c,
          ),
        })),
      };
    });
    toast({
      title: assignedTo ? `Assigned ${assignedTo.displayName}` : "Unassigned ticket",
    });
    if (
      (input.category === "mine" && assignedTo?.id !== conversationListData?.assignedToClerkIds?.[0]) ||
      (input.category === "unassigned" && assignedTo) ||
      (input.category === "assigned" && !assignedTo)
    ) {
      removeConversation();
    } else {
      moveToNextConversation();
    }
  };

  return { assignTicket };
};
