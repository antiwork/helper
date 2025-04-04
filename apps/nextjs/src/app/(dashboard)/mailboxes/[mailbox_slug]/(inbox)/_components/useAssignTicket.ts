import { useConversationListContext } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/(inbox)/_components/conversationListContext";
import { useConversationsListInput } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/(inbox)/_components/shared/queries";
import { toast } from "@/components/hooks/use-toast";
import { assertDefined } from "@/components/utils/assert";
import { api } from "@/trpc/react";

export const useAssignTicket = () => {
  const { mutate: update } = api.mailbox.conversations.update.useMutation();
  const utils = api.useUtils();
  const { input } = useConversationsListInput();
  const { mailboxSlug, currentConversationSlug, conversationListData, moveToNextConversation, removeConversation } =
    useConversationListContext();

  const assignTicket = (
    assignedTo: { id: string; displayName: string } | null, 
    message?: string | null,
    assignedToAI?: boolean
  ) => {
    const assignedToId = assignedTo?.id ?? null;
    update({ 
      mailboxSlug, 
      conversationSlug: assertDefined(currentConversationSlug), 
      assignedToId, 
      message,
      assignedToAI 
    });

    utils.mailbox.conversations.list.setInfiniteData(input, (data) => {
      if (!data) return data;
      return {
        ...data,
        pages: data.pages.map((page) => ({
          ...page,
          conversations: page.conversations.map((c) =>
            c.slug === currentConversationSlug ? { 
              ...c, 
              assignedToClerkId: assignedToId ?? null,
              assignedToAI: assignedToAI ?? false
            } : c,
          ),
        })),
      };
    });
    toast({
      title: assignedToAI ? "Assigned to Helper agent" : (assignedTo ? `Assigned ${assignedTo.displayName}` : "Unassigned ticket"),
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
