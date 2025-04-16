import React, { useState, useMemo } from "react";
import { View, Text, TouchableOpacity, TextInput, useColorScheme } from "react-native";
import { UserIcon, MagnifyingGlassIcon } from "react-native-heroicons/outline";
import { SafeAreaView } from "react-native-safe-area-context";
import { Conversation, ConversationPreviewList } from "@/app/(dashboard)/_components/conversationPreviewList";
import { useMailbox } from "@/components/mailboxContext";
import { api } from "@/utils/api";
import { cn, cssIconInterop } from "@/utils/css";
import { Header } from "../_components/header";
import { TabBar } from "../_components/tabBar";

cssIconInterop(UserIcon);
cssIconInterop(MagnifyingGlassIcon);

export default function AssignedScreen() {
  const { selectedMailbox } = useMailbox();
  const colorScheme = useColorScheme();
  const [searchQuery, setSearchQuery] = useState("");

  const params = useMemo(
    () => ({
      mailboxSlug: selectedMailbox?.slug ?? "",
      category: "mine",
      sort: "oldest",
      search: searchQuery || null,
      status: ["open"],
      limit: 25,
    }),
    [selectedMailbox?.slug, searchQuery],
  );

  const { data, isLoading, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } =
    api.mailbox.conversations.listWithPreview.useInfiniteQuery(params, {
      enabled: !!selectedMailbox?.slug,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    });
  const utils = api.useUtils();

  const conversations = data?.pages.flatMap((page) => page.conversations) || [];

  const handleUpdate = (conversation: Conversation) => {
    utils.mailbox.conversations.listWithPreview.setInfiniteData(params, (data) => {
      if (!data) return undefined;
      return {
        ...data,
        pages: data.pages.map((page) => ({
          ...page,
          conversations: page.conversations.map((c) => (c.id === conversation.id ? conversation : c)),
        })),
      };
    });
  };

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
      <View className="px-4 py-2">
        <Text className="text-xl font-semibold text-foreground">
          Mine ({conversations.length})
        </Text>
      </View>
      <View className="px-4 gap-2">
        <View className={cn(
          "flex-row items-center rounded-lg px-3 py-2",
          colorScheme === "light" ? "border border-border bg-muted" : "bg-muted"
        )}>
          <MagnifyingGlassIcon size={20} className="text-muted-foreground mr-2" />
          <TextInput
            placeholder="Search messages..."
            placeholderTextColor={colorScheme === "dark" ? "hsla(0, 0%, 100%, 0.7)" : "hsla(224, 8%, 46%, 1)"}
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 text-muted-foreground"
          />
        </View>
      </View>
      <View className="flex-1 mt-2">
        <ConversationPreviewList
          conversations={conversations}
          onUpdate={handleUpdate}
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
