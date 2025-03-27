import { Link } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Modal,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  StarIcon,
  UserIcon,
  XMarkIcon,
  EnvelopeIcon,
} from "react-native-heroicons/outline";
import { api, RouterOutputs } from "@/utils/api";
import { cssIconInterop } from "@/utils/css";
import { humanizeTime } from "@/utils/humanizeTime";

cssIconInterop(UserIcon);
cssIconInterop(StarIcon);
cssIconInterop(ChevronRightIcon);
cssIconInterop(ChevronLeftIcon);
cssIconInterop(CheckIcon);
cssIconInterop(XMarkIcon);
cssIconInterop(EnvelopeIcon);

export type Conversation = RouterOutputs["mailbox"]["conversations"]["listWithPreview"]["conversations"][number];

type Member = {
  id: string;
  displayName: string;
};

export function ConversationPreviewList({
  conversations,
  onUpdate,
  onRefresh,
  isRefreshing = false,
  isLoading = false,
  mailboxSlug,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
}: {
  conversations?: Conversation[];
  onUpdate: (conversation: Conversation) => void;
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

  const [showMemberSelector, setShowMemberSelector] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  const updateConversationMutation = api.mailbox.conversations.update.useMutation();

  const handleCloseConversation = (item: Conversation) => {
    updateConversationMutation.mutate({ mailboxSlug, conversationSlug: item.slug, status: "closed" });
    onUpdate({ ...item, status: "closed" });
  };

  const handleReopenConversation = (item: Conversation) => {
    updateConversationMutation.mutate({ mailboxSlug, conversationSlug: item.slug, status: "open" });
    onUpdate({ ...item, status: "open" });
  };

  const handleAssignConversation = (item: Conversation) => {
    setSelectedConversation(item);
    setShowMemberSelector(true);
  };

  const handleSelectMember = (member: Member | null) => {
    if (selectedConversation) {
      updateConversationMutation.mutate({
        mailboxSlug,
        conversationSlug: selectedConversation.slug,
        assignedToId: member?.id ?? null,
      });
      onUpdate({ ...selectedConversation, assignedToClerkId: member?.id ?? null });
    }
  };

  const renderItem = ({ item }: { item: Conversation }) => {
    const assigneeName = item.assignedToClerkId
      ? (members?.find((m) => m.id === item.assignedToClerkId)?.displayName?.split(" ")[0] ?? null)
      : null;

    return (
      <View className="mx-4 mb-4 rounded-2xl border border-border bg-muted">
        <Link href={{ pathname: "/conversations/[id]", params: { id: item.slug, mailboxSlug } }} asChild>
          <TouchableOpacity className="w-full p-4">
            <View className="flex-row items-center justify-between gap-6">
              <Text numberOfLines={1} className="text-base font-medium text-foreground flex-1">
                {item.platformCustomer?.name ?? item.platformCustomer?.email ?? item.emailFrom ?? "Anonymous"}
              </Text>
              <View className="flex-row items-center gap-4 flex-shrink-0">
                {assigneeName && (
                  <View className="flex-row items-center gap-1">
                    <UserIcon size={14} className="text-muted-foreground" />
                    <Text className="text-sm text-muted-foreground">{assigneeName}</Text>
                  </View>
                )}
                <View className={`flex-row items-center gap-1.5 px-3 py-1 rounded-full ${item.platformCustomer?.isVip ? 'bg-amber-400' : 'bg-muted'}`}>
                  {item.platformCustomer?.isVip && <StarIcon size={14} className="text-background" />}
                  <Text className={`text-sm font-medium ${item.platformCustomer?.isVip ? 'text-background' : 'text-muted-foreground'}`}>
                    ${item.platformCustomer?.value ? (parseFloat(item.platformCustomer.value) / 100).toFixed(2) : '0.00'}
                  </Text>
                </View>
              </View>
            </View>

            <View className="mt-4">
              {item.userMessageText && (
                <View className="flex-row gap-2 items-start">
                  <View className="mt-1">
                    <EnvelopeIcon size={12} className="text-muted-foreground" />
                  </View>
                  <View className="flex-1 flex-row items-start justify-between">
                    <Text numberOfLines={3} className="text-sm text-muted-foreground flex-1 mr-4">
                      {item.userMessageText.replace(/\s+/g, " ")}
                    </Text>
                    <Text className="text-xs text-muted-foreground flex-shrink-0">
                      {humanizeTime(item.lastUserEmailCreatedAt ?? item.createdAt)}
                    </Text>
                  </View>
                </View>
              )}
              {item.staffMessageText && (
                <View className="flex-row gap-2 items-start mt-4">
                  <View className="mt-1">
                    <UserIcon size={12} className="text-muted-foreground" />
                  </View>
                  <View className="flex-1 flex-row items-start justify-between">
                    <Text numberOfLines={3} className="text-sm text-muted-foreground flex-1 mr-4">
                      {item.staffMessageText.replace(/\s+/g, " ")}
                    </Text>
                    <Text className="text-xs text-muted-foreground flex-shrink-0">
                      {humanizeTime(item.lastStaffEmailCreatedAt ?? item.createdAt)}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </Link>

        <View className="border-t border-border flex-row p-2 gap-2">
          {item.status === "closed" ? (
            <>
              <View className="flex-1 pl-2 flex-row items-center opacity-60">
                <CheckIcon size={12} className="text-muted-foreground mr-1" />
                <Text className="text-xs text-muted-foreground">Closed</Text>
              </View>
              <ActionButton label="Undo" onPress={() => handleReopenConversation(item)} />
            </>
          ) : (
            <>
              <ActionButton label="Assign" onPress={() => handleAssignConversation(item)} />
              <ActionButton label="Close" onPress={() => handleCloseConversation(item)} />
              {Object.entries(item.platformCustomer?.links ?? {}).map(([key, value]) => (
                <ActionButton key={key} label={key} onPress={() => Linking.openURL(value)} />
              ))}
            </>
          )}
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

      {members && (
        <MemberSelector
          visible={showMemberSelector}
          onClose={() => setShowMemberSelector(false)}
          members={members}
          onSelectMember={handleSelectMember}
        />
      )}
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

const MemberSelector = ({
  visible,
  onClose,
  members,
  onSelectMember,
}: {
  visible: boolean;
  onClose: () => void;
  members: Member[];
  onSelectMember: (member: Member | null) => void;
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity
        activeOpacity={1}
        className="flex-1 bg-black/50 justify-center items-center p-4"
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          className="bg-background rounded-lg w-full my-8 shadow-lg max-h-[85%]"
          onPress={(e) => {
            // Prevent clicks on the modal content from closing the modal
            e.stopPropagation();
          }}
        >
          <View className="flex-row justify-between items-center p-4 border-b border-border">
            <Text className="text-lg font-medium text-foreground">Assign to</Text>
            <TouchableOpacity onPress={onClose}>
              <XMarkIcon size={24} className="text-muted-foreground" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={[{ id: "", displayName: "Anyone" }, ...members]}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                className="p-4 border-b border-border flex-row items-center"
                onPress={() => {
                  onSelectMember(item.id ? item : null);
                  onClose();
                }}
              >
                <Text className="text-foreground">{item.displayName}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View className="p-4">
                <Text className="text-muted-foreground text-center">No members available</Text>
              </View>
            }
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};
