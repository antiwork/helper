import React, { useMemo } from "react";
import { Text, View } from "react-native";
import { HandThumbDownIcon, HandThumbUpIcon } from "react-native-heroicons/solid";
import { CartesianChart, StackedBar } from "victory-native";
import { generateTimePeriods } from "@/app/(dashboard)/_components/generateTimePeriods";
import { Panel } from "@/app/(dashboard)/_components/panel";
import { api } from "@/utils/api";
import { cssIconInterop } from "@/utils/css";
import { timeRangeToQuery, type TimeRange } from "./timeRangeSelector";

cssIconInterop(HandThumbUpIcon);
cssIconInterop(HandThumbDownIcon);

export function ReactionsChart({ mailboxSlug, timeRange }: { mailboxSlug: string; timeRange: TimeRange }) {
  const { startDate, period } = useMemo(() => timeRangeToQuery(timeRange), [timeRange]);

  const { data, isLoading } = api.mailbox.conversations.messages.reactionCount.useQuery({
    mailboxSlug,
    startDate,
    period,
  });

  const chartData = generateTimePeriods(period, startDate, () => ({ positive: 0, negative: 0 }));
  data?.forEach(({ timePeriod, reactionType, count }) => {
    if (chartData[timePeriod]) {
      if (reactionType === "thumbs-up") {
        chartData[timePeriod].positive = count;
      } else {
        chartData[timePeriod].negative = count;
      }
    }
  });

  const formattedData = Object.entries(chartData).map(([_, item]) => ({
    label: item.label,
    positive: Number(item.positive),
    negative: -Number(item.negative),
  }));

  return (
    <Panel
      title="Reactions"
      action={
        data && data.length > 0 ? (
          <>
            <HandThumbUpIcon className="h-4 w-4 text-success" />
            <Text className="text-sm text-success">
              {data?.reduce((acc, { reactionType, count }) => acc + (reactionType === "thumbs-up" ? count : 0), 0)}
            </Text>
            <HandThumbDownIcon className="h-4 w-4 text-destructive" />
            <Text className="text-sm text-destructive">
              {data?.reduce((acc, { reactionType, count }) => acc + (reactionType === "thumbs-down" ? count : 0), 0)}
            </Text>
          </>
        ) : null
      }
      href={{ pathname: "/conversations", params: { category: "reactions", mailboxSlug } }}
      isSkeleton={isLoading}
    >
      <View className="p-4">
        {data && data.length > 0 ? (
          <View className="h-[100px]">
            <CartesianChart
              data={formattedData}
              xKey="label"
              yKeys={["positive", "negative"]}
              domainPadding={0}
              axisOptions={{ lineColor: "transparent" }}
              frame={{ lineColor: "transparent" }}
            >
              {({ points, chartBounds }) => (
                <StackedBar
                  innerPadding={timeRange === "7d" ? 0.3 : 0.1}
                  chartBounds={chartBounds}
                  points={[points.positive, points.negative]}
                  colors={["#157F3C", "#BC1010"]}
                  barOptions={({ isBottom, isTop }) => ({
                    roundedCorners: isTop
                      ? { topLeft: 4, topRight: 4 }
                      : isBottom
                        ? { bottomLeft: 4, bottomRight: 4 }
                        : undefined,
                  })}
                />
              )}
            </CartesianChart>
          </View>
        ) : (
          <View className="mb-4 items-center justify-center">
            {isLoading ? (
              <View className="w-48 h-4 rounded bg-muted" />
            ) : (
              <Text className="text-muted-foreground">No data available.</Text>
            )}
          </View>
        )}
      </View>
    </Panel>
  );
}
