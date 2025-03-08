import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMailbox } from "@/components/mailboxContext";
import { api } from "@/utils/api";
import { ConversationList } from "../_components/conversationList";
import { Header } from "../_components/header";
import { PaginationControls } from "../_components/paginationControls";

export default function InboxScreen() {
  const { selectedMailbox } = useMailbox();
  const [selectedTab, setSelectedTab] = useState<"conversations" | "mine" | "assigned">("mine");
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch, isRefetching } = api.mailbox.conversations.list.useQuery(
    {
      mailboxSlug: selectedMailbox?.slug ?? "",
      category: selectedTab,
      sort: null,
      search: null,
      status: null,
      page,
    },
    {
      enabled: !!selectedMailbox?.slug,
    },
  );

  const totalPages = data?.total ? Math.ceil(data.total / 25) : 0;

  const tabs: { id: typeof selectedTab; label: string }[] = [
    { id: "mine", label: "Mine" },
    { id: "conversations", label: "Open" },
    { id: "assigned", label: "Assigned" },
  ];

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
        conversations={data?.conversations}
        onRefresh={refetch}
        isRefreshing={isRefetching}
        isLoading={isLoading}
        mailboxSlug={selectedMailbox?.slug ?? ""}
      />
      <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
    </SafeAreaView>
  );
}
