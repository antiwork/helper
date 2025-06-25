"use client";

import { useMemo, useState } from "react";
import { DateRange } from "react-day-picker";
import { Bar, BarChart, ReferenceLine, XAxis, YAxis } from "recharts";
import ConversationsModal from "@/app/(dashboard)/mailboxes/[mailbox_slug]/[category]/conversationsModal";
import { timeRangeToQuery } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/dashboard/timeRangeSelector";
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

export function ReactionsChart({
  mailboxSlug,
  timeRange,
  customDate,
}: {
  mailboxSlug: string;
  timeRange: TimeRange;
  customDate?: DateRange;
}) {
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
    mailboxSlug,
    startDate,
    endDate,
    period,
  });

  const { data: selectedConversations, isLoading: isLoadingConversations } = api.mailbox.conversations.list.useQuery(
    {
      mailboxSlug,
      createdAfter: selectedBar ? selectedBar.startTime.toISOString() : startDate.toISOString(),
      createdBefore: selectedBar ? selectedBar.endTime.toISOString() : endDate.toISOString(),
      reactionType: selectedBar?.reactionType ?? "thumbs-up",
    },
    { enabled: !!selectedBar },
  );

  if (isLoading || !data) {
    return <div className="w-full h-full flex items-center justify-center">Loading...</div>;
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
    <>
      <ChartContainer config={chartConfig} className="h-[300px]">
        <BarChart data={Object.values(chartData)} stackOffset="sign" barGap={16}>
          <XAxis dataKey="label" axisLine={false} tickLine={false} />
          <YAxis width={20} domain={["dataMin", "dataMax"]} axisLine={false} tickLine={false} />
          <ReferenceLine y={0} stroke="var(--border)" strokeWidth={1} />
          <ChartTooltip
            position={{ y: 0 }}
            content={<ChartTooltipContent valueFormatter={(value) => Math.abs(value).toLocaleString()} />}
          />
          <ChartLegend content={<ChartLegendContent />} />
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
      </ChartContainer>

      <ConversationsModal
        open={!!selectedBar}
        onOpenChange={(open) => !open && setSelectedBar(null)}
        mailboxSlug={mailboxSlug}
        title={`${selectedBar?.reactionType === "thumbs-up" ? "Positive" : "Negative"} Reactions - ${selectedBar?.label}`}
        conversations={selectedConversations?.conversations ?? []}
        isLoading={isLoadingConversations}
      />
    </>
  );
}
