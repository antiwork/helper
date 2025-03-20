import React from "react";
import { View } from "react-native";
import { UserIcon } from "react-native-heroicons/outline";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMailbox } from "@/components/mailboxContext";
import { api } from "@/utils/api";
import { cssIconInterop } from "@/utils/css";
import { ConversationList } from "../_components/conversationList";
import { Header } from "../_components/header";
import { TabBar } from "../_components/tabBar";

cssIconInterop(UserIcon);

export default function AssignedScreen() {
  const { selectedMailbox } = useMailbox();

  const { data, isLoading, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } =
    api.mailbox.conversations.list.useInfiniteQuery(
      {
        mailboxSlug: selectedMailbox?.slug ?? "",
        category: "assigned",
        sort: null,
        search: null,
        status: null,
        limit: 25,
      },
      {
        enabled: !!selectedMailbox?.slug,
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
    <SafeAreaView edges={["top"]} className="flex-1 bg-background">
      <View className="py-3">
        <Header />
      </View>
      <View className="flex-1">
        <ConversationList
          conversations={conversations}
          onRefresh={refetch}
          isRefreshing={isRefetching}
          isLoading={isLoading}
          mailboxSlug={selectedMailbox?.slug ?? ""}
          onLoadMore={handleLoadMore}
          hasMore={!!hasNextPage}
          isLoadingMore={isFetchingNextPage}
        />
      </View>
      <TabBar />
    </SafeAreaView>
  );
}
