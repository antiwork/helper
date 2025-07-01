import { createContext, useCallback, useContext } from "react";
import { useConversationListContext } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/[category]/list/conversationListContext";
import { toast } from "@/components/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { assertDefined } from "@/components/utils/assert";
import { captureExceptionAndThrowIfDevelopment } from "@/lib/shared/sentry";
import { RouterInputs, RouterOutputs } from "@/trpc";
import { api } from "@/trpc/react";

type ConversationContextType = {
  conversationSlug: string;
  mailboxSlug: string;
  data: RouterOutputs["mailbox"]["conversations"]["get"] | null;
  isPending: boolean;
  error: { message: string } | null;
  refetch: () => void;
  updateStatus: (status: "closed" | "spam" | "open") => Promise<void>;
  updateConversation: (inputs: Partial<RouterInputs["mailbox"]["conversations"]["update"]>) => Promise<void>;
  isUpdating: boolean;
};

const ConversationContext = createContext<ConversationContextType | null>(null);

export function useConversationQuery(mailboxSlug: string, conversationSlug: string | null) {
  const result = api.mailbox.conversations.get.useQuery(
    {
      mailboxSlug,
      conversationSlug: conversationSlug ?? "",
    },
    {
      enabled: !!conversationSlug,
    },
  );

  return conversationSlug ? result : null;
}

export const ConversationContextProvider = ({ children }: { children: React.ReactNode }) => {
  const {
    mailboxSlug,
    currentConversationSlug,
    removeConversation,
    removeConversationKeepActive,
    navigateToConversation,
  } = useConversationListContext();
  const conversationSlug = assertDefined(
    currentConversationSlug,
    "ConversationContext can only be used when currentConversationSlug is defined",
  );
  const {
    data = null,
    isPending,
    error,
    refetch,
  } = assertDefined(useConversationQuery(mailboxSlug, currentConversationSlug));

  const utils = api.useUtils();
  const { mutateAsync: updateConversation, isPending: isUpdating } = api.mailbox.conversations.update.useMutation({
    onMutate: (variables) => {
      const previousData = utils.mailbox.conversations.get.getData({
        mailboxSlug,
        conversationSlug: variables.conversationSlug,
      });

      if (previousData && variables.status) {
        utils.mailbox.conversations.get.setData(
          {
            mailboxSlug,
            conversationSlug: variables.conversationSlug,
          },
          { ...previousData, status: variables.status },
        );
      }

      return { previousData };
    },
    onError: (error, variables, context) => {
      if (context?.previousData) {
        utils.mailbox.conversations.get.setData(
          {
            mailboxSlug,
            conversationSlug: variables.conversationSlug,
          },
          context.previousData,
        );
      }

      toast({
        variant: "destructive",
        title: "Error updating conversation",
        description: error.message,
      });
    },
    onSuccess: (data, variables) => {
      utils.mailbox.conversations.get.invalidate({
        mailboxSlug,
        conversationSlug: variables.conversationSlug,
      });
      utils.mailbox.openCount.invalidate({ mailboxSlug });
      utils.mailbox.statusCounts.invalidate({ mailboxSlug });
    },
  });

  const update = async (inputs: Partial<RouterInputs["mailbox"]["conversations"]["update"]>) => {
    await updateConversation({ mailboxSlug, conversationSlug, ...inputs });
  };

  const updateStatus = useCallback(
    async (status: "closed" | "spam" | "open") => {
      const previousStatus = data?.status;

      await update({ status });

      if (status === "open") {
        toast({
          title: "Conversation reopened",
          variant: "success",
        });
      } else {
        removeConversation();
        if (status === "closed") {
          toast({
            title: "Conversation closed",
            variant: "success",
          });
        }
      }

      if (status === "spam") {
        const undoStatus = previousStatus ?? "open";
        toast({
          title: "Marked as spam",
          action: (
            <ToastAction
              altText="Undo"
              onClick={async () => {
                try {
                  await update({ status: undoStatus });
                  navigateToConversation(conversationSlug);
                  toast({
                    title: "No longer marked as spam",
                  });
                } catch (e) {
                  captureExceptionAndThrowIfDevelopment(e);
                  toast({
                    variant: "destructive",
                    title: "Failed to undo",
                  });
                }
              }}
            >
              Undo
            </ToastAction>
          ),
        });
      }
    },
    [update, removeConversation, navigateToConversation, conversationSlug, data],
  );

  return (
    <ConversationContext.Provider
      value={{
        conversationSlug,
        mailboxSlug,
        data,
        isPending,
        error,
        refetch,
        updateStatus,
        updateConversation: update,
        isUpdating,
      }}
    >
      {children}
    </ConversationContext.Provider>
  );
};

export const useConversationContext = () =>
  assertDefined(
    useContext(ConversationContext),
    "useConversationContext must be used within a ConversationContextProvider",
  );
