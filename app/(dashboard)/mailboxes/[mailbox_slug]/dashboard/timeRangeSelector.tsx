"use client";

import { DateRange as DayPickerDateRange } from "react-day-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CustomTimeRangePicker } from "./customTimeRangePicker";
import { type TimeRange } from "./dashboardContent";

const timeRangeOptions: { value: TimeRange; label: string }[] = [
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "1y", label: "Last 12 months" },
  { value: "custom", label: "Custom" },
];

type DateRange = DayPickerDateRange;

type Props = {
  value: TimeRange;
  onValueChange: (value: TimeRange) => void;
  className?: string;
  customDate?: DateRange;
  onCustomDateChange?: (date: DateRange) => void;
  mailboxSlug: string;
};

export function TimeRangeSelector({
  value,
  onValueChange,
  className,
  customDate,
  onCustomDateChange,
  mailboxSlug,
}: Props) {
  return (
    <div className="flex items-center gap-2">
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={className ?? "w-[140px] border-none"}>
          <SelectValue placeholder="Select time range" className="text-right" />
        </SelectTrigger>
        <SelectContent>
          {timeRangeOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {value === "custom" && onCustomDateChange && (
        <CustomTimeRangePicker onSelect={onCustomDateChange} selectedDate={customDate} mailboxSlug={mailboxSlug} />
      )}
    </div>
  );
}

export const timeRangeToQuery = (
  timeRange: TimeRange,
  customDate?: DateRange,
): { startDate: Date; endDate: Date; period: "hourly" | "daily" | "monthly" } => {
  const now = new Date();
  const endOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

  switch (timeRange) {
    case "custom":
      if (!customDate?.from || !customDate?.to) {
        // Fall back to 24h if no custom date selected
        return timeRangeToQuery("24h");
      }
      return {
        startDate: customDate.from,
        endDate: customDate.to,
        period: "daily" as const,
      };
    case "24h":
      return {
        startDate: new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours() - 24),
        ),
        endDate: endOfDay,
        period: "hourly" as const,
      };
    case "7d":
      return {
        startDate: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 7, 0)),
        endDate: endOfDay,
        period: "daily" as const,
      };
    case "30d":
      return {
        startDate: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 30, 0)),
        endDate: endOfDay,
        period: "daily" as const,
      };
    case "1y":
      return {
        startDate: new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), now.getUTCDate(), 0)),
        endDate: endOfDay,
        period: "monthly" as const,
      };
  }
};
