import { useMemo } from "react";
import { Cell, Label, Pie, PieChart, ResponsiveContainer } from "recharts";
import { timeRangeToQuery } from "@/app/(dashboard)/(mailbox)/dashboard/timeRangeSelector";
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

const COLORS = {
  OPEN: "var(--chart-open)",
  CLOSED_MANUAL: "var(--chart-closed-manual)",
  CLOSED_AI: "var(--chart-closed-ai)",
};

const chartConfig = {
  open: {
    label: "Open",
    color: COLORS.OPEN,
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

interface StatusByTypeChartProps {
  timeRange: TimeRange;
  customDate?: Date;
}

export function StatusByTypeChart({ timeRange, customDate }: StatusByTypeChartProps) {
  const { startDate } = useMemo(() => timeRangeToQuery(timeRange, customDate), [timeRange, customDate]);

  const { data, isLoading } = api.mailbox.conversations.messages.statusByTypeCount.useQuery({
    startDate,
  });

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

  const chartData = data.map(({ type, count }) => ({
    name: type,
    value: count,
    fill: chartConfig[type as keyof typeof chartConfig].color,
  }));

  const totalTickets = chartData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="flex flex-col w-full h-full min-h-[300px]">
      <div className="relative flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <ChartContainer className="mx-auto aspect-square max-h-[400px]" config={chartConfig}>
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    valueFormatter={(value) => `${value.toLocaleString()} tickets`}
                    labelFormatter={(label) => chartConfig[label as keyof typeof chartConfig]?.label || label}
                    labelClassName="flex items-center gap-2"
                  />
                }
              />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={85}
                startAngle={90}
                endAngle={450}
              >
                {chartData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={entry.fill}
                    className="transition-opacity duration-100 hover:opacity-90 cursor-pointer"
                  />
                ))}
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                          <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-3xl font-bold">
                            {totalTickets.toLocaleString()}
                          </tspan>
                          <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 24} className="fill-muted-foreground">
                            Total
                          </tspan>
                        </text>
                      );
                    }
                  }}
                />
              </Pie>
              <ChartLegend content={<ChartLegendContent />} verticalAlign="bottom" className="text-xs" />
            </PieChart>
          </ChartContainer>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
