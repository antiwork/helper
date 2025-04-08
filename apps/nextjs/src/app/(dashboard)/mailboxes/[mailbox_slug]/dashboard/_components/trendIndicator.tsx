"use client";

import { Minus, TrendingDown, TrendingUp } from "lucide-react";

type Props = {
  trend: { direction: string; percentageChange: number; previousCount: number } | null;
};

export function TrendIndicator({ trend }: Props) {
  if (!trend) return null;

  const Icon = trend.direction === "up" ? TrendingUp : trend.direction === "down" ? TrendingDown : Minus;
  const color =
    trend.direction === "up"
      ? "text-success"
      : trend.direction === "down"
        ? "text-destructive"
        : "text-muted-foreground";

  const showPercentage = !isNaN(trend.percentageChange) && trend.previousCount > 0;

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-col items-start gap-1">
        <div className="flex items-center gap-1">
          <Icon className={`h-4 w-4 ${color}`} strokeWidth={2.5} />
          {showPercentage && <span className={`text-sm ${color}`}>{trend.percentageChange.toFixed(1)}%</span>}
        </div>
        {trend.previousCount > 0 ? (
          <span className="text-xs text-muted-foreground">prev. {trend.previousCount.toLocaleString()}</span>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        )}
      </div>
    </div>
  );
}
