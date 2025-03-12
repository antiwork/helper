import { createContext, useCallback, useContext } from "react";
import { useConversationListContext } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/(inbox)/_components/conversationListContext";
import { toast } from "@/components/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { assertDefined } from "@/components/utils/assert";
import { captureExceptionAndThrowIfDevelopment } from "@/lib/shared/sentry";
import { RouterInputs, RouterOutputs } from "@/trpc";
import { api } from "@/trpc/react";

export type ConversationContextType = {
  conversationSlug: string;
  mailboxSlug: string;
  data: RouterOutputs["mailbox"]["conversations"]["get"] | null;
  isPending: boolean;
  error: { message: string } | null;
  refetch: () => void;
  updateStatus: (status: "closed" | "spam" | "open") => void;
};

const ConversationContext = createContext<ConversationContextType | null>(null);

export const ConversationContextProvider = ({ children }: { children: React.ReactNode }) => {
  const { mailboxSlug, currentConversationSlug, removeConversation, navigateToConversation } =
    useConversationListContext();
  const conversationSlug = assertDefined(
    currentConversationSlug,
    "ConversationContext can only be used when currentConversationSlug is defined",
  );
  const {
    data = null,
    isPending,
    error,
    refetch,
  } = api.mailbox.conversations.get.useQuery(
    {
      mailboxSlug,
      conversationSlug,
    },
    {
      // Leaves some buffer to avoid a duplicate request on initial load (where we prefetch data).
      // Otherwise, this is close to zero to ensure that the latest messages get shown.
      staleTime: 6 * 1000,
    },
  );

  const { mutate: updateConversation } = api.mailbox.conversations.update.useMutation();
  const update = (inputs: Partial<RouterInputs["mailbox"]["conversations"]["update"]>) =>
    updateConversation({ mailboxSlug, conversationSlug, ...inputs });

  const updateStatus = useCallback(
    (status: "closed" | "spam" | "open") => {
      try {
        const previousStatus = data?.status;
        update({ status });
        if (status !== "open") {
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
      value={{ conversationSlug, mailboxSlug, data, isPending, error, refetch, updateStatus }}
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
