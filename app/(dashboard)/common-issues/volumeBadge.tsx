import { Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface VolumeBadgeProps {
  todayCount?: number;
  weekCount?: number;
  monthCount?: number;
}

export function VolumeBadge({ todayCount, weekCount, monthCount }: VolumeBadgeProps) {
  const today = Number(todayCount ?? 0);
  const week = Number(weekCount ?? 0);
  const month = Number(monthCount ?? 0);

  if (today > 0) {
    const variant = today >= 10 ? "destructive" : "gray";
    return (
      <Badge variant={variant} className="text-xs flex items-center gap-1">
        <Calendar className="h-3 w-3" />
        {today} new ticket{today !== 1 ? "s" : ""} today
      </Badge>
    );
  } else if (week > 0) {
    const variant = week >= 10 ? "destructive" : "gray";
    return (
      <Badge variant={variant} className="text-xs flex items-center gap-1">
        <Calendar className="h-3 w-3" />
        {week} new ticket{week !== 1 ? "s" : ""} this week
      </Badge>
    );
  } else if (month > 0) {
    const variant = month >= 10 ? "destructive" : "gray";
    return (
      <Badge variant={variant} className="text-xs flex items-center gap-1">
        <Calendar className="h-3 w-3" />
        {month} new ticket{month !== 1 ? "s" : ""} this month
      </Badge>
    );
  }
  return (
    <Badge variant="gray" className="text-xs flex items-center gap-1">
      <Calendar className="h-3 w-3" />
      No new tickets
    </Badge>
  );
}
