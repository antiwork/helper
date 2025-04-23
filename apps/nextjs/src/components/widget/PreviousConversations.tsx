import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useInView } from "react-intersection-observer";
import HumanizedTime from "@/components/humanizedTime";

type Conversation = {
  slug: string;
  subject: string;
  createdAt: string;
  firstMessage: string | null;
};

type ConversationsResponse = {
  conversations: Conversation[];
  nextCursor: string | null;
};

type Props = {
  token: string | null;
  onSelectConversation: (slug: string) => void;
};

function ConversationSkeleton() {
  return (
    <div className="w-full rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="h-4 w-1/2 animate-skeleton rounded bg-gray-100" />
        <div className="h-3 w-16 animate-skeleton rounded bg-gray-100" />
      </div>
      <div className="mt-2 h-8 w-3/4 animate-skeleton rounded bg-gray-100" />
    </div>
  );
}

async function fetchConversations({
  token,
  cursor,
}: {
  token: string;
  cursor?: string;
}): Promise<ConversationsResponse> {
  const url = new URL("/api/chat/conversations", window.location.origin);
  if (cursor) {
    url.searchParams.set("cursor", cursor);
  }

  const response = await fetch(url.toString(), {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  return response.json();
}

export default function PreviousConversations({ token, onSelectConversation }: Props) {
  const { ref, inView } = useInView();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ["conversations"],
    queryFn: ({ pageParam }) => fetchConversations({ token: token!, cursor: pageParam! }),
    getNextPageParam: (lastPage: ConversationsResponse) => lastPage.nextCursor,
    enabled: !!token,
    initialPageParam: null,
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const conversations = data?.pages.flatMap((page) => page.conversations) ?? [];

  return (
    <div className="flex-1 overflow-y-auto">
      <h2 className="mb-4 text-lg font-medium text-foreground">History</h2>
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <ConversationSkeleton key={i} />
          ))}
        </div>
      ) : conversations.length === 0 ? (
        <div className="flex h-40 items-center justify-center text-gray-500">No previous conversations found</div>
      ) : (
        <div className="space-y-3">
          {conversations.map((conversation) => (
            <button
              key={conversation.slug}
              onClick={() => onSelectConversation(conversation.slug)}
              className="group w-full overflow-hidden rounded-lg border border-gray-200 bg-white p-4 text-left transition-all hover:border-black hover:shadow-xs"
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-foreground">{conversation.subject}</div>
                <div className="text-xs text-muted-foreground">
                  <HumanizedTime time={conversation.createdAt} />
                </div>
              </div>
              {conversation.firstMessage && (
                <div className="mt-2 line-clamp-2 text-sm text-gray-600 group-hover:text-gray-900">
                  {conversation.firstMessage}
                </div>
              )}
            </button>
          ))}
          {hasNextPage && (
            <div ref={ref} className="flex justify-center py-4">
              {isFetchingNextPage && (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-black" />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
