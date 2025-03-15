import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMailbox } from "@/components/mailboxContext";
import { api } from "@/utils/api";
import { ConversationList } from "../_components/conversationList";
import { Header } from "../_components/header";

export default function InboxScreen() {
  const { selectedMailbox } = useMailbox();
  const [selectedTab, setSelectedTab] = useState<"conversations" | "mine" | "assigned">("mine");

  const { data, isLoading, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } =
    api.mailbox.conversations.list.useInfiniteQuery(
      {
        mailboxSlug: selectedMailbox?.slug ?? "",
        category: selectedTab,
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

  // Flatten the pages of conversations
  const conversations = data?.pages.flatMap((page) => page.conversations) || [];
  const totalItems = data?.pages[0]?.total || 0;

  const tabs: { id: typeof selectedTab; label: string }[] = [
    { id: "mine", label: "Mine" },
    { id: "conversations", label: "Open" },
    { id: "assigned", label: "Assigned" },
  ];

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
      <View className="flex-row border-b border-border">
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            onPress={() => setSelectedTab(tab.id)}
            className={`flex-1 py-3 px-4 ${selectedTab === tab.id ? "border-b-2 border-foreground" : ""}`}
          >
            <Text
              className={`text-center ${selectedTab === tab.id ? "text-foreground font-medium" : "text-foreground"}`}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <ConversationList
        conversations={conversations}
        onRefresh={refetch}
        isRefreshing={isRefetching}
        isLoading={isLoading}
        mailboxSlug={selectedMailbox?.slug ?? ""}
        onLoadMore={handleLoadMore}
        hasMore={!!hasNextPage}
        isLoadingMore={isFetchingNextPage}
        totalCount={totalItems}
      />
    </SafeAreaView>
  );
}
