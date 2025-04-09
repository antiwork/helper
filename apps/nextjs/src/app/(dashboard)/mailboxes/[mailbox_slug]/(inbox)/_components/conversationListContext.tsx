import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import { createContext, useContext, useEffect, useMemo } from "react";
import { ConversationListItem } from "@/app/types/global";
import { useBreakpoint } from "@/components/useBreakpoint";
import { useDebouncedCallback } from "@/components/useDebouncedCallback";
import { getExpoPlatform } from "@/components/useNativePlatform";
import { assertDefined } from "@/components/utils/assert";
import { conversationsListChannelId } from "@/lib/ably/channels";
import { useAblyEvent } from "@/lib/ably/hooks";
import { RouterOutputs } from "@/trpc";
import { api } from "@/trpc/react";
import { useConversationsListInput } from "./shared/queries";

export type ConversationListContextType = {
  mailboxSlug: string;
  conversationListData: RouterOutputs["mailbox"]["conversations"]["list"] | null;
  isPending: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  currentConversationSlug: string | null;
  minimize: () => void;
  moveToNextConversation: () => void;
  removeConversation: () => void;
  removeConversationKeepActive: () => void;
  navigateToConversation: (conversationSlug: string) => void;
};

const ConversationListContext = createContext<ConversationListContextType | null>(null);

export const ConversationListContextProvider = ({
  currentConversationSlug,
  children,
}: {
  currentConversationSlug: string | null;
  children: React.ReactNode;
}) => {
  const { input, searchParams } = useConversationsListInput();
  const { data, isPending, isFetchingNextPage, fetchNextPage, hasNextPage } =
    api.mailbox.conversations.list.useInfiniteQuery(input, {
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? null,
      refetchOnWindowFocus: false,
    });
  const { isAboveLg } = useBreakpoint("lg");
  const [, setId] = useQueryState("id", { history: "push" });

  const conversations = useMemo(() => data?.pages.flatMap((page) => page.conversations) ?? [], [data]);
  const lastPage = useMemo(() => data?.pages[data?.pages.length - 1], [data]);

  useEffect(() => {
    if (!isPending && !currentConversationSlug && conversations[0] && isAboveLg) {
      setId(conversations[0].slug);
    }
  }, [isPending, searchParams]);

  const moveToNextConversation = () => {
    if (!conversations.length) return setId(null);
    if (getExpoPlatform()) return; // In Expo the conversation is effectively a modal so it's confusing to navigate within it

    let nextConversation;
    const currentIndex = conversations.findIndex((c) => c.slug === currentConversationSlug);
    if (currentIndex === -1) {
      nextConversation = conversations[0];
    } else {
      nextConversation =
        currentIndex === conversations.length - 1 ? conversations[currentIndex - 1] : conversations[currentIndex + 1];
    }
    setId(nextConversation?.slug ?? null);
  };

  const router = useRouter();
  const utils = api.useUtils();
  const debouncedInvalidate = useDebouncedCallback(() => {
    // Updates the left sidebar counts immediately
    router.refresh();

    utils.mailbox.conversations.list.invalidate();
    utils.mailbox.openCount.invalidate();
  }, 1000);

  const removeConversationFromList = (condition: (conversation: ConversationListItem) => boolean) => {
    const updatedTotal = lastPage ? lastPage.total - 1 : 0;

    if (currentConversationSlug) {
      utils.mailbox.conversations.list.setInfiniteData(input, (data) => {
        if (!data) return data;
        return {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            conversations: page.conversations.filter((c) => !condition(c)),
            total: updatedTotal,
          })),
        };
      });
    }
    if (!input.status || input.status[0] === "open") {
      utils.mailbox.openCount.setData({ mailboxSlug: input.mailboxSlug }, (data) => {
        if (!data) return data;
        return {
          ...data,
          [input.category]: data[input.category] - 1,
        };
      });
    }
  };

  const removeConversationKeepActive = () => {
    debouncedInvalidate();
    removeConversationFromList((c) => c.slug === currentConversationSlug);
  };

  const removeConversation = () => {
    debouncedInvalidate();
    removeConversationFromList((c) => c.slug === currentConversationSlug);
    moveToNextConversation();
  };

  useAblyEvent(conversationsListChannelId(input.mailboxSlug), "conversation.statusChanged", (message) => {
    const statusChanged = searchParams.status !== message.data.status;
    const assigneeChanged =
      (input.category === "assigned" && message.data.assignedToClerkId === null) ||
      (input.category === "unassigned" && message.data.assignedToClerkId !== null) ||
      (input.category === "mine" && message.data.assignedToClerkId !== data?.pages[0]?.assignedToClerkIds?.[0]);
    if (!statusChanged && !assigneeChanged) return;

    removeConversationFromList((c) => c.id === message.data.id);
  });

  const value = useMemo(
    () => ({
      mailboxSlug: input.mailboxSlug,
      conversationListData: lastPage
        ? {
            conversations,
            total: lastPage.total,
            hasGmailSupportEmail: lastPage.hasGmailSupportEmail,
            defaultSort: lastPage.defaultSort,
            assignedToClerkIds: lastPage.assignedToClerkIds,
            nextCursor: lastPage.nextCursor,
          }
        : null,
      isPending,
      isFetchingNextPage,
      hasNextPage,
      fetchNextPage,
      currentConversationSlug,
      minimize: () => setId(null),
      moveToNextConversation,
      removeConversation,
      removeConversationKeepActive,
      navigateToConversation: setId,
    }),
    [input.mailboxSlug, currentConversationSlug, conversations, lastPage, isPending, isFetchingNextPage, hasNextPage],
  );

  return <ConversationListContext.Provider value={value}>{children}</ConversationListContext.Provider>;
};

export const useConversationListContext = () =>
  assertDefined(
    useContext(ConversationListContext),
    "useConversationContext must be used within a ConversationContextProvider",
  );
