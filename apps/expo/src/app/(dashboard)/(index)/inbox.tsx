import React, { useState, useMemo } from "react";
import { View, Text, TouchableOpacity, TextInput, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MagnifyingGlassIcon, FunnelIcon, XMarkIcon } from "react-native-heroicons/outline";
import { ConversationList } from "@/app/(dashboard)/_components/conversationList";
import { useMailbox } from "@/components/mailboxContext";
import { api } from "@/utils/api";
import { cn, cssIconInterop } from "@/utils/css";
import { Header } from "../_components/header";
import { TabBar } from "../_components/tabBar";

cssIconInterop(MagnifyingGlassIcon);
cssIconInterop(FunnelIcon);
cssIconInterop(XMarkIcon);

type FilterItem = "unassigned" | { type: "assigned"; userId: string };
type FilterOption = FilterItem[];

export default function InboxScreen() {
  const { selectedMailbox } = useMailbox();
  const colorScheme = useColorScheme();
  const [selectedFilters, setSelectedFilters] = useState<FilterOption>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: members } = api.organization.getMembers.useQuery();

  const params = useMemo(
    () => ({
      mailboxSlug: selectedMailbox?.slug ?? "",
      category: selectedFilters.includes("unassigned") ? "unassigned" : "conversations",
      assignee: selectedFilters
        .filter((f): f is { type: "assigned"; userId: string } => typeof f === "object")
        .map(f => f.userId),
      sort: "newest",
      search: searchQuery || null,
      status: null,
      limit: 25,
    }),
    [selectedMailbox?.slug, selectedFilters, searchQuery],
  );

  const { data, isLoading, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } =
    api.mailbox.conversations.list.useInfiniteQuery(params, {
      enabled: !!selectedMailbox?.slug,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    });

  const conversations = data?.pages.flatMap((page) => page.conversations) || [];

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  };

  const toggleFilter = (filter: FilterItem) => {
    setSelectedFilters(current => {
      const filterExists = current.find(f => 
        f === filter || 
        (typeof f === "object" && typeof filter === "object" && f.userId === filter.userId)
      );
      
      if (filterExists) {
        return current.filter(f => f !== filterExists);
      } else {
        return [...current, filter];
      }
    });
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background">
      <View className="py-3">
        <Header />
      </View>
      <View className="px-4 py-2">
        <Text className="text-xl font-semibold text-foreground">
          Inbox ({data?.pages[0]?.total.toLocaleString() ?? 0})
        </Text>
      </View>
      <View className="px-4 gap-2">
        <View className="flex-row gap-2">
          <View className={cn(
            "flex-1 flex-row items-center rounded-lg px-3 py-2",
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
          <TouchableOpacity
            onPress={() => setIsFilterOpen(!isFilterOpen)}
            className={cn(
              "items-center justify-center px-3 rounded-lg",
              colorScheme === "light" ? "border border-border bg-muted" : "bg-muted",
              selectedFilters.length > 0 && "bg-primary"
            )}
          >
            <FunnelIcon size={20} className={cn(
              "text-muted-foreground",
              selectedFilters.length > 0 && "text-primary-foreground"
            )} />
          </TouchableOpacity>
        </View>
        
        {selectedFilters.length > 0 && (
          <View className="flex-row flex-wrap gap-2">
            {selectedFilters.map((filter, index) => (
              <View key={index} className="flex-row items-center bg-muted rounded-full px-3 py-1.5">
                <Text className="text-sm text-foreground mr-2">
                  {filter === "unassigned" ? "Unassigned" : 
                    members?.find(m => filter.userId === m.id)?.displayName}
                </Text>
                <TouchableOpacity onPress={() => toggleFilter(filter)}>
                  <XMarkIcon className="size-4 text-muted-foreground" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        
        {isFilterOpen && (
          <View className="absolute top-[35px] right-4 w-64 z-10 mt-1 bg-background border border-border rounded-lg divide-y divide-border py-2">
            <TouchableOpacity
              onPress={() => {
                toggleFilter("unassigned");
                setIsFilterOpen(false);
              }}
              className={cn(
                "py-2 px-4",
                selectedFilters.includes("unassigned") && "bg-muted"
              )}
            >
              <Text className="text-foreground">Unassigned</Text>
            </TouchableOpacity>
            
            <View className="py-3 px-4">
              <Text className="text-xs text-muted-foreground mb-2">Assigned to</Text>
              <View className="gap-1.5">
                {members?.map((member) => {
                  const isSelected = selectedFilters.some(
                    f => typeof f === "object" && f.userId === member.id
                  );
                  return (
                    <TouchableOpacity
                      key={member.id}
                      onPress={() => {
                        toggleFilter({ type: "assigned", userId: member.id });
                        setIsFilterOpen(false);
                      }}
                      className={cn("py-1.5", isSelected && "bg-muted")}
                    >
                      <Text className="text-foreground">{member.displayName}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        )}
      </View>
      <View className="flex-1 mt-2">
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

