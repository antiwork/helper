import { useNavigation } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { api } from "@/utils/api";
import { ConversationList } from "./_components/conversationList";
import { PaginationControls } from "./_components/paginationControls";

function FilteredConversations({
  mailboxSlug,
  category,
  startDate,
  now,
  topicId,
}: {
  mailboxSlug: string;
  category?: string;
  startDate: Date;
  now: Date;
  topicId?: string;
}) {
  const navigation = useNavigation();
  const [page, setPage] = useState(1);

  const { data, refetch, isRefetching, isLoading } = api.mailbox.conversations.list.useQuery({
    mailboxSlug,
    category,
    createdAfter: startDate.toISOString(),
    createdBefore: now.toISOString(),
    sort: null,
    search: null,
    status: null,
    topic: topicId ? [topicId] : undefined,
    page,
  });

  useEffect(() => {
    navigation.setOptions({
      title: category === "mine" ? "Assigned to me" : "Conversations",
    });
  }, [navigation, category, topicId]);

  const totalPages = data?.total ? Math.ceil(data.total / 25) : 0;

  return (
    <>
      <ConversationList
        conversations={data?.conversations}
        onRefresh={refetch}
        isRefreshing={isRefetching}
        isLoading={isLoading}
        mailboxSlug={mailboxSlug}
      />
      <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
    </>
  );
}

function ReactionConversations({ mailboxSlug, startDate, now }: { mailboxSlug: string; startDate: Date; now: Date }) {
  const navigation = useNavigation();
  const [reactionType, setReactionType] = useState<"thumbs-up" | "thumbs-down">("thumbs-up");
  const [page, setPage] = useState(1);

  useEffect(() => {
    navigation.setOptions({
      title: "Reactions",
    });
  }, [navigation]);

  const { data, refetch, isRefetching } = api.mailbox.conversations.list.useQuery({
    mailboxSlug,
    createdAfter: startDate.toISOString(),
    createdBefore: now.toISOString(),
    reactionType,
    category: null,
    sort: null,
    search: null,
    status: null,
    page,
  });

  const totalPages = data?.total ? Math.ceil(data.total / 25) : 0;

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
        conversations={data?.conversations}
        onRefresh={refetch}
        isRefreshing={isRefetching}
        mailboxSlug={mailboxSlug}
      />
      <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
    </View>
  );
}

export default function ConversationsByCategory() {
  const { category, mailboxSlug, topicId } = useLocalSearchParams<{
    mailboxSlug: string;
    category?: string;
    topicId?: string;
  }>();

  const now = useMemo(() => new Date(), []);
  const startDate = useMemo(() => new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), [now]);

  return (
    <View className="flex-1 pb-4 bg-background">
      {category === "reactions" ? (
        <ReactionConversations mailboxSlug={mailboxSlug} startDate={startDate} now={now} />
      ) : (
        <FilteredConversations
          mailboxSlug={mailboxSlug}
          category={category}
          startDate={startDate}
          now={now}
          topicId={topicId}
        />
      )}
    </View>
  );
}
