import { useLocalSearchParams } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { api } from "@/utils/api";
import { type TimeRange } from "./_components/timeRangeSelector";

export default function AgentsScreen() {
  const { mailboxSlug, timeRange } = useLocalSearchParams<{ mailboxSlug: string; timeRange: TimeRange }>();

  const { data: membersData, isLoading } = api.mailbox.members.stats.useQuery(
    { mailboxSlug, period: timeRange },
    { enabled: !!mailboxSlug },
  );

  const sortedMembersData = membersData ? [...membersData].sort((a, b) => b.replyCount - a.replyCount) : [];

  return (
    <ScrollView className="flex-1 bg-background">
      {isLoading ? (
        <View className="flex flex-col gap-4 px-6 py-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <View key={i} className="bg-muted rounded-lg h-20" />
          ))}
        </View>
      ) : !sortedMembersData.length ? (
        <Text className="text-muted-foreground text-center py-8">No agents available</Text>
      ) : (
        sortedMembersData.map((member) => (
          <View key={member.id} className="flex-row items-center justify-between p-6 border-b border-border">
            <View className="flex-1">
              <Text className="text-foreground font-medium text-lg">{member.displayName}</Text>
              <Text className="text-muted-foreground text-sm">{member.replyCount.toLocaleString()} replies</Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}
