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
    assignedTo: { id: string; displayName: string } | { ai: true } | null,
    message?: string | null,
  ) => {
    const assignedToId = !!assignedTo && "id" in assignedTo ? assignedTo.id : null;
    const assignedToAI = !!assignedTo && "ai" in assignedTo;
    update({
      mailboxSlug,
      conversationSlug: assertDefined(currentConversationSlug),
      assignedToId,
      message,
      assignedToAI,
    });

    utils.mailbox.conversations.list.setInfiniteData(input, (data) => {
      if (!data) return data;
      return {
        ...data,
        pages: data.pages.map((page) => ({
          ...page,
          conversations: page.conversations.map((c) =>
            c.slug === currentConversationSlug ? { ...c, assignedToClerkId: assignedToId, assignedToAI } : c,
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
      (input.category === "mine" && assignedToId !== conversationListData?.assignedToClerkIds?.[0]) ||
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
