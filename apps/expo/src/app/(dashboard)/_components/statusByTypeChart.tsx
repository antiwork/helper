import React, { useMemo } from "react";
import { Text, View } from "react-native";
import { Pie, PolarChart } from "victory-native";
import { Panel } from "@/app/(dashboard)/_components/panel";
import { useColorScheme } from "@/hooks/useColorScheme";
import { api } from "@/utils/api";
import { timeRangeToQuery, type TimeRange } from "./timeRangeSelector";

const COLORS = {
  OPEN: {
    light: "#480F0E",
    dark: "#BC1010",
  },
  CLOSED_MANUAL: "#FEB81D",
  CLOSED_AI: "#C2D44B",
};

export function StatusByTypeChart({ mailboxSlug, timeRange }: { mailboxSlug: string; timeRange: TimeRange }) {
  const colorScheme = useColorScheme();

  const chartConfig = {
    open: {
      label: "Open",
      color: colorScheme === "dark" ? COLORS.OPEN.dark : COLORS.OPEN.light,
    },
    ai: {
      label: "Closed by AI",
      color: COLORS.CLOSED_AI,
    },
    human: {
      label: "Closed manually",
      color: COLORS.CLOSED_MANUAL,
    },
  };

  const { startDate } = useMemo(() => timeRangeToQuery(timeRange), [timeRange]);

  const { data, isLoading } = api.mailbox.conversations.messages.statusByTypeCount.useQuery({
    mailboxSlug,
    startDate,
  });

  if (isLoading || !data) {
    return (
      <Panel title="Ticket Status" href={null} isSkeleton>
        <View className="p-4">
          <View className="h-[150px] items-center justify-center">
            <View className="w-[150px] h-[150px] rounded-full border-[20px] border-muted" />
          </View>
          <View className="flex-row flex-wrap justify-center gap-4 mt-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <View key={i} className="flex-row items-center gap-2">
                <View className="w-3 h-3 bg-muted rounded" />
                <View className="w-16 h-4 bg-muted rounded" />
              </View>
            ))}
          </View>
        </View>
      </Panel>
    );
  }

  if (!data.length) {
    return (
      <Panel title="Ticket Status" href={null}>
        <View className="w-full h-full items-center justify-center">
          <Text>No data available.</Text>
        </View>
      </Panel>
    );
  }

  const chartData = data.map(({ type, count }) => ({
    value: count,
    label: chartConfig[type as keyof typeof chartConfig].label,
    color: chartConfig[type as keyof typeof chartConfig].color,
  }));

  const totalTickets = chartData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <Panel title="Ticket Status" href={{ pathname: "/conversations", params: { category: "all", mailboxSlug } }}>
      <View className="p-4">
        <View className="h-[150px]">
          <PolarChart data={chartData} labelKey="label" valueKey="value" colorKey="color">
            <Pie.Chart innerRadius="75%" />
          </PolarChart>
          <View className="absolute w-full h-full justify-center items-center">
            <Text className="text-2xl font-bold text-bright-foreground dark:text-muted-foreground">
              {totalTickets.toLocaleString()}
            </Text>
            <Text className="text-sm text-muted-foreground">Total</Text>
          </View>
        </View>
        <View className="flex-row flex-wrap justify-center gap-4 mt-4">
          {Object.entries(chartConfig).map(([key, { label, color }]) => (
            <View key={key} className="flex-row items-center gap-2">
              <View style={{ width: 12, height: 12, backgroundColor: color, borderRadius: 2 }} />
              <Text className="text-xs text-muted-foreground">{label}</Text>
            </View>
          ))}
        </View>
      </View>
    </Panel>
  );
}
