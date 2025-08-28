import { createContext, useCallback, useContext, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useConversationListContext } from "@/app/(dashboard)/[category]/list/conversationListContext";
import { assertDefined } from "@/components/utils/assert";
import { captureExceptionAndThrowIfDevelopment } from "@/lib/shared/sentry";
import { RouterInputs, RouterOutputs } from "@/trpc";
import { api } from "@/trpc/react";

type ConversationContextType = {
  conversationSlug: string;
  data: RouterOutputs["mailbox"]["conversations"]["get"] | null;
  isPending: boolean;
  error: { message: string } | null;
  refetch: () => void;
  updateStatus: (status: "closed" | "spam" | "open") => Promise<void>;
  updateConversation: (inputs: Partial<RouterInputs["mailbox"]["conversations"]["update"]>) => Promise<void>;
  isUpdating: boolean;
};

const ConversationContext = createContext<ConversationContextType | null>(null);

export function useConversationQuery(conversationSlug: string | null) {
  const utils = api.useUtils();
  const hasMarkedAsRead = useRef<string | null>(null);

  const { mutate: markAsRead, isPending: isMarkingAsRead } = api.mailbox.conversations.markAsRead.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.mailbox.conversations.list.invalidate(),
        utils.mailbox.conversations.listWithPreview.invalidate(),
        utils.mailbox.conversations.count.invalidate(),
      ]);
    },
  });

  const result = api.mailbox.conversations.get.useQuery(
    {
      conversationSlug: conversationSlug ?? "",
    },
    {
      enabled: !!conversationSlug,
    },
  );

  // Mark conversation as read as soon as it loads (user opened it)
  useEffect(() => {
    if (
      result?.data &&
      conversationSlug &&
      !result.isPending &&
      !isMarkingAsRead &&
      hasMarkedAsRead.current !== conversationSlug
    ) {
      hasMarkedAsRead.current = conversationSlug;
      markAsRead({ conversationSlug });
    }
  }, [conversationSlug, result?.isPending, markAsRead, isMarkingAsRead]);

  // Reset the ref when conversationSlug changes
  useEffect(() => {
    if (hasMarkedAsRead.current !== conversationSlug) {
      hasMarkedAsRead.current = null;
    }
  }, [conversationSlug]);

  return conversationSlug ? result : null;
}

export const ConversationContextProvider = ({ children }: { children: React.ReactNode }) => {
  const { currentConversationSlug, removeConversation, navigateToConversation } = useConversationListContext();
  const conversationSlug = assertDefined(
    currentConversationSlug,
    "ConversationContext can only be used when currentConversationSlug is defined",
  );
  const { data = null, isPending, error, refetch } = assertDefined(useConversationQuery(currentConversationSlug));

  const utils = api.useUtils();
  const { mutateAsync: updateConversation, isPending: isUpdating } = api.mailbox.conversations.update.useMutation({
    onMutate: (variables) => {
      const previousData = utils.mailbox.conversations.get.getData({
        conversationSlug: variables.conversationSlug,
      });

      if (previousData && variables.status) {
        utils.mailbox.conversations.get.setData(
          {
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
            conversationSlug: variables.conversationSlug,
          },
          context.previousData,
        );
      }

      toast.error("Error updating conversation", {
        description: error.message,
      });
    },
    onSuccess: (_data, variables) => {
      utils.mailbox.conversations.get.invalidate({
        conversationSlug: variables.conversationSlug,
      });
    },
  });

  const update = async (inputs: Partial<RouterInputs["mailbox"]["conversations"]["update"]>) => {
    await updateConversation({ conversationSlug, ...inputs });
  };

  const updateStatus = useCallback(
    async (status: "closed" | "spam" | "open") => {
      const previousStatus = data?.status;

      await update({ status });

      if (status === "open") {
        toast.success("Conversation reopened");
      } else {
        removeConversation();
        if (status === "closed") {
          toast.success("Conversation closed", {
            action: {
              label: "Undo",
              onClick: async () => {
                try {
                  await update({ status: previousStatus ?? "open" });
                  navigateToConversation(conversationSlug);
                  toast.success("Conversation reopened");
                } catch (e) {
                  captureExceptionAndThrowIfDevelopment(e);
                  toast.error("Failed to undo");
                }
              },
            },
          });
        }
      }

      if (status === "spam") {
        const undoStatus = previousStatus ?? "open";
        toast.info("Marked as spam", {
          action: {
            label: "Undo",
            onClick: async () => {
              try {
                await update({ status: undoStatus });
                navigateToConversation(conversationSlug);
                toast.success("No longer marked as spam");
              } catch (e) {
                captureExceptionAndThrowIfDevelopment(e);
                toast.error("Failed to undo");
              }
            },
          },
        });
      }
    },
    [update, removeConversation, navigateToConversation, conversationSlug, data],
  );

  return (
    <ConversationContext.Provider
      value={{
        conversationSlug,
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
