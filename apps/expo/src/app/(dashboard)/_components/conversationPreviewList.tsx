import { Link } from "expo-router";
import React from "react";
import { ActivityIndicator, FlatList, RefreshControl, Text, TouchableOpacity, View } from "react-native";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CreditCardIcon,
  StarIcon,
  UserCircleIcon,
  UserIcon,
  UserPlusIcon,
  XCircleIcon,
} from "react-native-heroicons/outline";
import { api, RouterOutputs } from "@/utils/api";
import { cssIconInterop } from "@/utils/css";
import { humanizeTime } from "@/utils/humanizeTime";

cssIconInterop(UserIcon);
cssIconInterop(StarIcon);
cssIconInterop(ChevronRightIcon);
cssIconInterop(ChevronLeftIcon);
cssIconInterop(UserCircleIcon);
cssIconInterop(CreditCardIcon);
cssIconInterop(UserPlusIcon);
cssIconInterop(XCircleIcon);

type Conversation = RouterOutputs["mailbox"]["conversations"]["listWithPreview"]["conversations"][number];

export function ConversationPreviewList({
  conversations,
  onRefresh,
  isRefreshing = false,
  isLoading = false,
  mailboxSlug,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
}: {
  conversations?: Conversation[];
  onRefresh?: () => void;
  isRefreshing?: boolean;
  isLoading?: boolean;
  mailboxSlug: string;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
}) {
  const { data: members } = api.organization.getMembers.useQuery(undefined, {
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const renderItem = ({ item }: { item: Conversation }) => {
    const assigneeName = item.assignedToClerkId
      ? (members?.find((m) => m.id === item.assignedToClerkId)?.displayName?.split(" ")[0] ?? null)
      : null;

    return (
      <View className="mx-4 mb-4 rounded border border-border bg-muted">
        <Link href={{ pathname: "/conversations/[id]", params: { id: item.slug, mailboxSlug } }} asChild>
          <TouchableOpacity className="w-full p-4">
            <View className="flex-row items-center justify-between gap-6">
              <Text numberOfLines={1} className="text-base font-medium text-foreground flex-1">
                {item.platformCustomer?.name ?? item.platformCustomer?.email ?? item.emailFrom ?? "Anonymous"}
              </Text>
              <View className="flex-row items-center gap-4 flex-shrink-0">
                {assigneeName && (
                  <View className="flex-row items-center gap-1">
                    <UserIcon size={12} className="text-muted-foreground" />
                    <Text className="text-sm text-muted-foreground">{assigneeName}</Text>
                  </View>
                )}
                {item.platformCustomer?.value && parseFloat(item.platformCustomer.value) > 0 && (
                  <Text className="text-sm text-muted-foreground flex-shrink-0">
                    ${(parseFloat(item.platformCustomer.value) / 100).toFixed(2)}
                  </Text>
                )}
                {item.platformCustomer?.isVip && (
                  <View className="bg-yellow-200 px-2 py-0.5 rounded">
                    <Text className="text-xs text-yellow-800 font-medium">VIP</Text>
                  </View>
                )}
                <Text className="text-sm text-muted-foreground">
                  {humanizeTime(item.lastUserEmailCreatedAt ?? item.createdAt)}
                </Text>
              </View>
            </View>

            <View className="mt-2">
              {item.userMessageText && (
                <View className="flex-row gap-2 mt-1">
                  <ChevronRightIcon size={12} className="mt-1 text-muted-foreground" />
                  <Text numberOfLines={3} className="text-sm text-muted-foreground flex-1">
                    {item.userMessageText.replace(/\s+/g, " ")}
                  </Text>
                </View>
              )}
              {item.staffMessageText && (
                <View className="flex-row gap-2 mt-4">
                  <ChevronLeftIcon size={12} className="mt-1 text-muted-foreground" />
                  <Text numberOfLines={3} className="text-sm text-muted-foreground flex-1">
                    {item.staffMessageText.replace(/\s+/g, " ")}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </Link>

        <View className="border-t border-border flex-row p-2 gap-2">
          <ActionButton
            label="Assign"
            onPress={() => {
              // Assign functionality will be implemented later
            }}
          />
          <ActionButton
            label="Close"
            onPress={() => {
              // Close functionality will be implemented later
            }}
          />
          <ActionButton
            label="Impersonate"
            onPress={() => {
              // Impersonate functionality will be implemented later
            }}
          />
          <ActionButton
            label="View Stripe account"
            onPress={() => {
              // View Stripe account functionality will be implemented later
            }}
          />
        </View>
      </View>
    );
  };

  const renderFooter = () => {
    if (!isLoadingMore) return null;

    return (
      <View className="py-4">
        <ActivityIndicator size="small" />
      </View>
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const handleEndReached = () => {
    if (hasMore && !isLoadingMore && onLoadMore) {
      onLoadMore();
    }
  };

  return (
    <View className="flex-1">
      <FlatList
        data={conversations}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        className="pt-4 flex-1"
        refreshControl={onRefresh ? <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} /> : undefined}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          !isLoading ? (
            <View className="py-8 items-center">
              <Text className="text-muted-foreground">No conversations found</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const ActionButton = ({ label, onPress }: { label: string; onPress: () => void }) => {
  return (
    <TouchableOpacity
      className="rounded-md py-2 px-3 flex-row items-center gap-1"
      onPress={(e) => {
        e.stopPropagation();
        onPress();
      }}
    >
      <Text className="text-xs font-medium text-muted-foreground">{label}</Text>
    </TouchableOpacity>
  );
};
