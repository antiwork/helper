import { createContext, useCallback, useContext } from "react";
import { useConversationListContext } from "@/app/(dashboard)/(mailbox)/[category]/list/conversationListContext";
import { toast } from "@/components/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { assertDefined } from "@/components/utils/assert";
import { captureExceptionAndThrowIfDevelopment } from "@/lib/shared/sentry";
import { RouterInputs, RouterOutputs } from "@/trpc";
import { api } from "@/trpc/react";

export type ConversationContextType = {
  conversationSlug: string;
  data: RouterOutputs["mailbox"]["conversations"]["get"] | null;
  isPending: boolean;
  error: { message: string } | null;
  refetch: () => void;
  updateStatus: (status: "closed" | "spam" | "open") => void;
  updateConversation: (inputs: Partial<RouterInputs["mailbox"]["conversations"]["update"]>) => void;
};

const ConversationContext = createContext<ConversationContextType | null>(null);

export function useConversationQuery(conversationSlug: string | null) {
  const result = api.mailbox.conversations.get.useQuery(
    { conversationSlug: conversationSlug ?? "" },
    { enabled: !!conversationSlug },
  );

  return conversationSlug ? result : null;
}

export const ConversationContextProvider = ({ children }: { children: React.ReactNode }) => {
  const { currentConversationSlug, removeConversation, removeConversationKeepActive, navigateToConversation } =
    useConversationListContext();
  const conversationSlug = assertDefined(
    currentConversationSlug,
    "ConversationContext can only be used when currentConversationSlug is defined",
  );
  const { data = null, isPending, error, refetch } = assertDefined(useConversationQuery(currentConversationSlug));

  const { mutate: updateConversation } = api.mailbox.conversations.update.useMutation();
  const update = (inputs: Partial<RouterInputs["mailbox"]["conversations"]["update"]>) =>
    updateConversation({ conversationSlug, ...inputs });

  const updateStatus = useCallback(
    (status: "closed" | "spam" | "open") => {
      try {
        const previousStatus = data?.status;
        update({ status });
        if (status === "open") {
          removeConversationKeepActive();
        } else {
          removeConversation();
        }
        if (status === "spam") {
          toast({
            title: "Marked as spam",
            action: (
              <ToastAction
                altText="Undo"
                onClick={() => {
                  try {
                    update({ status: previousStatus ?? "open" });
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
      } catch (e) {
        captureExceptionAndThrowIfDevelopment(e);
        toast({
          variant: "destructive",
          title: "Error closing conversation",
        });
      }
    },
    [data, removeConversation, navigateToConversation],
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
