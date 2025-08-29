import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import { createContext, useContext, useMemo } from "react";
import { ConversationListItem } from "@/app/types/global";
import { useDebouncedCallback } from "@/components/useDebouncedCallback";
import { assertDefined } from "@/components/utils/assert";
import { conversationsListChannelId } from "@/lib/realtime/channels";
import { useRealtimeEventOnce } from "@/lib/realtime/hooks";
import { RouterOutputs } from "@/trpc";
import { api } from "@/trpc/react";
import { useConversationsListInput } from "../shared/queries";

type ConversationListContextType = {
  conversationListData: RouterOutputs["mailbox"]["conversations"]["list"] | null;
  isPending: boolean;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  currentIndex: number;
  currentTotal: number;
  fetchNextPage: () => void;
  currentConversationSlug: string | null;
  minimize: () => void;
  moveToNextConversation: () => void;
  moveToPreviousConversation: () => void;
  removeConversation: (options?: { moveToNext?: boolean }) => void;
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
  const { input } = useConversationsListInput();
  const { data, isPending, isFetching, isFetchingNextPage, fetchNextPage, hasNextPage } =
    api.mailbox.conversations.list.useInfiniteQuery(input, {
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? null,
      refetchOnWindowFocus: false,
    });
  const [, setId] = useQueryState("id", { history: "push" });

  const conversations = useMemo(() => data?.pages.flatMap((page) => page.conversations) ?? [], [data]);
  const lastPage = useMemo(() => data?.pages[data?.pages.length - 1], [data]);
  const currentTotal = useMemo(
    () => data?.pages.reduce((acc, page) => acc + page.conversations.length, 0) ?? 0,
    [data],
  );
  const currentIndex = useMemo(
    () => conversations.findIndex((c) => c.slug === currentConversationSlug),
    [conversations, currentConversationSlug],
  );

  const moveToNextConversation = () => {
    if (!conversations.length) return setId(null);

    let nextConversation;
    if (currentIndex === -1) {
      nextConversation = conversations[0];
    } else {
      nextConversation = currentIndex === conversations.length - 1 ? conversations[0] : conversations[currentIndex + 1];
    }
    setId(nextConversation?.slug ?? null);
  };

  const moveToPreviousConversation = () => {
    if (!conversations.length) return setId(null);

    let previousConversation;
    if (currentIndex === -1) {
      previousConversation = conversations[0];
    } else {
      previousConversation =
        currentIndex === 0 ? conversations[conversations.length - 1] : conversations[currentIndex - 1];
    }
    setId(previousConversation?.slug ?? null);
  };

  const router = useRouter();
  const utils = api.useUtils();
  const debouncedInvalidate = useDebouncedCallback(() => {
    router.refresh();
    utils.mailbox.conversations.list.invalidate();
    utils.mailbox.openCount.invalidate();
  }, 1000);

  const removeConversationFromList = (condition: (conversation: ConversationListItem) => boolean) => {
    utils.mailbox.conversations.list.setInfiniteData(input, (data) => {
      if (!data) return data;
      return {
        ...data,
        pages: data.pages.map((page) => ({
          ...page,
          conversations: page.conversations.filter((c) => !condition(c)),
        })),
      };
    });
    if (!input.status || input.status[0] === "open") {
      utils.mailbox.openCount.setData(undefined, (data) => {
        if (!data) return data;
        return {
          ...data,
          [input.category]: data[input.category] - 1,
        };
      });
      utils.mailbox.openCount.invalidate();
    }
  };

  const removeConversationKeepActive = () => {
    debouncedInvalidate();
    removeConversationFromList((c) => c.slug === currentConversationSlug);
  };

  const removeConversation = ({ moveToNext = true }: { moveToNext?: boolean } = {}) => {
    debouncedInvalidate();
    removeConversationFromList((c) => c.slug === currentConversationSlug);
    if (moveToNext) moveToNextConversation();
  };

  useRealtimeEventOnce<{
    id: number;
    status: string;
    assignedToId: string | null;
    assignedToAI: boolean;
    previousValues: {
      status: string;
      assignedToId: string | null;
      assignedToAI: boolean;
    };
  }>(
    conversationsListChannelId(),
    "conversation.statusChanged",
    ({ data: { id, status, assignedToId, previousValues } }) => {
      const selectedStatus = input.status?.[0] ?? "open";
      if (previousValues.status !== selectedStatus) return;
      if (input.category === "assigned" && previousValues.assignedToId === null) return;
      if (input.category === "unassigned" && previousValues.assignedToId !== null) return;
      if (input.category === "mine" && previousValues.assignedToId !== data?.pages[0]?.assignedToIds?.[0]) return;

      if (
        status !== selectedStatus ||
        (input.category === "assigned" && assignedToId === null) ||
        (input.category === "unassigned" && assignedToId !== null) ||
        (input.category === "mine" && assignedToId !== data?.pages[0]?.assignedToIds?.[0])
      )
        removeConversationFromList((c) => c.id === id);
    },
  );

  const value = useMemo(
    () => ({
      conversationListData: lastPage
        ? {
            conversations,
            onboardingState: lastPage.onboardingState,
            defaultSort: lastPage.defaultSort,
            assignedToIds: lastPage.assignedToIds,
            nextCursor: lastPage.nextCursor,
          }
        : null,
      isPending,
      isFetching,
      isFetchingNextPage,
      hasNextPage,
      currentTotal,
      currentIndex,
      fetchNextPage,
      currentConversationSlug,
      minimize: () => setId(null),
      moveToNextConversation,
      moveToPreviousConversation,
      removeConversation,
      removeConversationKeepActive,
      navigateToConversation: setId,
    }),
    [currentConversationSlug, conversations, lastPage, isPending, isFetching, isFetchingNextPage, hasNextPage],
  );

  return <ConversationListContext.Provider value={value}>{children}</ConversationListContext.Provider>;
};

export const useConversationListContext = () =>
  assertDefined(
    useContext(ConversationListContext),
    "useConversationContext must be used within a ConversationContextProvider",
  );
