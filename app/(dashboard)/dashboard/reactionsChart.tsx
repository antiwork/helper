"use client";

import { useMemo, useState } from "react";
import { DateRange } from "react-day-picker";
import { Bar, BarChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from "recharts";
import ConversationsModal from "@/app/(dashboard)/[category]/conversationsModal";
import { timeRangeToQuery } from "@/app/(dashboard)/dashboard/timeRangeSelector";
import LoadingSpinner from "@/components/loadingSpinner";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { api } from "@/trpc/react";
import { type TimeRange } from "./dashboardContent";
import { generateTimePeriods, type TimePeriod } from "./generateTimePeriods";

export type Period = "hourly" | "daily" | "monthly";

export function ReactionsChart({ timeRange, customDate }: { timeRange: TimeRange; customDate?: DateRange }) {
  const { startDate, endDate, period } = useMemo(
    () => timeRangeToQuery(timeRange, customDate),
    [timeRange, customDate],
  );
  const [selectedBar, setSelectedBar] = useState<{
    startTime: Date;
    endTime: Date;
    label: string;
    reactionType: "thumbs-up" | "thumbs-down";
  } | null>(null);

  const { data, isLoading } = api.mailbox.conversations.messages.reactionCount.useQuery({
    startDate,
    endDate,
    period,
  });

  const { data: selectedConversations, isLoading: isLoadingConversations } = api.mailbox.conversations.list.useQuery(
    {
      reactionAfter: selectedBar ? selectedBar.startTime.toISOString() : startDate.toISOString(),
      reactionBefore: selectedBar ? selectedBar.endTime.toISOString() : endDate.toISOString(),
      reactionType: selectedBar?.reactionType ?? "thumbs-up",
    },
    { enabled: !!selectedBar },
  );

  if (isLoading || !data) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }
  if (!data.length) {
    return <div className="w-full h-full flex items-center justify-center">No data available.</div>;
  }

  const chartData = generateTimePeriods(period, startDate, () => ({ positive: 0, negative: 0 }));
  data.forEach(({ timePeriod, reactionType, count }) => {
    if (chartData[timePeriod]) {
      if (reactionType === "thumbs-up") {
        chartData[timePeriod].positive = count;
      } else {
        chartData[timePeriod].negative = -count;
      }
    }
  });

  const chartConfig = {
    positive: {
      label: "Positive",
      color: "var(--success)",
    },
    negative: {
      label: "Negative",
      color: "var(--chart-negative)",
    },
  };

  const handleBarClick = (data: TimePeriod<any>, type: "positive" | "negative") => {
    if (!data.startTime) return;
    setSelectedBar({ ...data, reactionType: type === "positive" ? "thumbs-up" : "thumbs-down" });
  };

  return (
    <div className="flex flex-col w-full h-full">
      <div className="relative flex-1 min-h-0">
        <ChartContainer config={chartConfig} className="w-full h-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={Object.values(chartData)}
              stackOffset="sign"
              barGap={16}
              margin={{ top: 20, right: 10, left: 10, bottom: 40 }}
            >
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} height={60} />
              <YAxis
                width={40}
                domain={["dataMin", "dataMax"]}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
              />
              <ReferenceLine y={0} stroke="var(--border)" strokeWidth={1} />
              <ChartTooltip
                position={{ y: 0 }}
                content={<ChartTooltipContent valueFormatter={(value) => Math.abs(value).toLocaleString()} />}
              />
              <ChartLegend content={<ChartLegendContent />} wrapperStyle={{ paddingTop: "8px" }} />
              <Bar
                stackId="feedback"
                dataKey="positive"
                fill="var(--color-positive)"
                maxBarSize={32}
                radius={[4, 4, 0, 0]}
                onClick={(data) => handleBarClick(data, "positive")}
                className="cursor-pointer hover:opacity-90 transition-opacity duration-100"
              />
              <Bar
                stackId="feedback"
                dataKey="negative"
                fill="var(--color-negative)"
                maxBarSize={32}
                radius={[4, 4, 0, 0]}
                onClick={(data) => handleBarClick(data, "negative")}
                className="cursor-pointer hover:opacity-90 transition-opacity duration-100"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      <ConversationsModal
        open={!!selectedBar}
        onOpenChange={(open) => !open && setSelectedBar(null)}
        title={`${selectedBar?.reactionType === "thumbs-up" ? "Positive" : "Negative"} Reactions - ${selectedBar?.label}`}
        conversations={selectedConversations?.conversations ?? []}
        isLoading={isLoadingConversations}
      />
    </div>
  );
}
