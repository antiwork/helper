import { Text, View } from "react-native";
import { Panel } from "@/app/(dashboard)/_components/panel";
import { api } from "@/utils/api";
import { type TimeRange } from "./timeRangeSelector";

export function PeopleTable({ mailboxSlug, timeRange }: { mailboxSlug: string; timeRange: TimeRange }) {
  const { data: membersData, isLoading } = api.mailbox.members.stats.useQuery(
    { mailboxSlug, period: timeRange },
    { enabled: !!mailboxSlug },
  );

  const sortedMembersData = membersData ? [...membersData].sort((a, b) => b.replyCount - a.replyCount) : [];

  if (isLoading) {
    return (
      <Panel title="Replies by Agent" isSkeleton href={null}>
        <View className="flex-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <View key={i} className="flex-row items-center py-3">
              <View className="flex-1 h-4 bg-muted rounded" />
              <View className="w-16 h-4 bg-muted rounded ml-4" />
            </View>
          ))}
        </View>
      </Panel>
    );
  }

  if (!sortedMembersData.length) {
    return (
      <Panel title="Replies by Agent" href={null}>
        <View className="flex-1 items-center justify-center py-8">
          <Text className="text-bright-foreground">No data available.</Text>
        </View>
      </Panel>
    );
  }

  return (
    <Panel title="Replies by Agent" href={{ pathname: "/agents", params: { mailboxSlug, timeRange } }}>
      <View className="flex-1 pb-2">
        {sortedMembersData.slice(0, 3).map((member) => (
          <View key={member.id} className="flex-row items-center pl-4 pr-5 h-10">
            <Text className="flex-1 text-foreground">{member.displayName ?? member.email}</Text>
            <Text className="w-16 text-right text-foreground tabular-nums">{member.replyCount.toLocaleString()}</Text>
          </View>
        ))}
        {sortedMembersData.length > 3 && (
          <View className="px-4 h-10 flex-row items-center">
            <Text className="text-muted-foreground tabular-nums">{sortedMembersData.length - 3} more</Text>
          </View>
        )}
      </View>
    </Panel>
  );
}
