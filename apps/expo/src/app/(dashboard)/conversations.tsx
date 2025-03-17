import { useNavigation } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { api } from "@/utils/api";
import { ConversationList } from "./_components/conversationList";

function FilteredConversations({
  mailboxSlug,
  category,
  startDate,
  now,
}: {
  mailboxSlug: string;
  category?: string;
  startDate: Date;
  now: Date;
}) {
  const navigation = useNavigation();

  const { data, refetch, isRefetching, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    api.mailbox.conversations.list.useInfiniteQuery(
      {
        mailboxSlug,
        category,
        createdAfter: startDate.toISOString(),
        createdBefore: now.toISOString(),
        sort: null,
        search: null,
        status: null,
        limit: 25,
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      },
    );

  useEffect(() => {
    navigation.setOptions({
      title: category === "mine" ? "Assigned to me" : "Conversations",
    });
  }, [navigation, category]);

  const conversations = data?.pages.flatMap((page) => page.conversations) || [];

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  };

  return (
    <>
      <ConversationList
        conversations={conversations}
        onRefresh={refetch}
        isRefreshing={isRefetching}
        isLoading={isLoading}
        mailboxSlug={mailboxSlug}
        onLoadMore={handleLoadMore}
        hasMore={!!hasNextPage}
        isLoadingMore={isFetchingNextPage}
      />
    </>
  );
}

function ReactionConversations({ mailboxSlug, startDate, now }: { mailboxSlug: string; startDate: Date; now: Date }) {
  const navigation = useNavigation();
  const [reactionType, setReactionType] = useState<"thumbs-up" | "thumbs-down">("thumbs-up");

  useEffect(() => {
    navigation.setOptions({
      title: "Reactions",
    });
  }, [navigation]);

  const { data, refetch, isRefetching, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    api.mailbox.conversations.list.useInfiniteQuery(
      {
        mailboxSlug,
        createdAfter: startDate.toISOString(),
        createdBefore: now.toISOString(),
        reactionType,
        category: null,
        sort: null,
        search: null,
        status: null,
        limit: 25,
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      },
    );

  const conversations = data?.pages.flatMap((page) => page.conversations) || [];

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  };

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row border-b border-border">
        <TouchableOpacity
          onPress={() => setReactionType("thumbs-up")}
          className={`flex-1 py-3 px-4 ${reactionType === "thumbs-up" ? "border-b-2 border-foreground" : ""}`}
        >
          <Text
            className={`text-center ${reactionType === "thumbs-up" ? "text-foreground font-medium" : "text-foreground"}`}
          >
            Positive
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setReactionType("thumbs-down")}
          className={`flex-1 py-3 px-4 ${reactionType === "thumbs-down" ? "border-b-2 border-foreground" : ""}`}
        >
          <Text
            className={`text-center ${reactionType === "thumbs-down" ? "text-foreground font-medium" : "text-foreground"}`}
          >
            Negative
          </Text>
        </TouchableOpacity>
      </View>
      <ConversationList
        conversations={conversations}
        onRefresh={refetch}
        isRefreshing={isRefetching}
        isLoading={isLoading}
        mailboxSlug={mailboxSlug}
        onLoadMore={handleLoadMore}
        hasMore={!!hasNextPage}
        isLoadingMore={isFetchingNextPage}
      />
    </View>
  );
}

export default function ConversationsByCategory() {
  const { category, mailboxSlug } = useLocalSearchParams<{
    mailboxSlug: string;
    category?: string;
  }>();

  const now = useMemo(() => new Date(), []);
  const startDate = useMemo(() => new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), [now]);

  return (
    <View className="flex-1 pb-4 bg-background">
      {category === "reactions" ? (
        <ReactionConversations mailboxSlug={mailboxSlug} startDate={startDate} now={now} />
      ) : (
        <FilteredConversations mailboxSlug={mailboxSlug} category={category} startDate={startDate} now={now} />
      )}
    </View>
  );
}
