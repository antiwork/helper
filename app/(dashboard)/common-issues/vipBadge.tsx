import { Badge } from "@/components/ui/badge";

interface VipBadgeProps {
  vipCount?: number;
}

export function VipBadge({ vipCount }: VipBadgeProps) {
  const count = Number(vipCount ?? 0);
  if (count > 0) {
    return (
      <Badge variant="success-light" className="text-xs flex items-center gap-1">
        ⭐ {count} VIP user{count !== 1 ? "s" : ""}
      </Badge>
    );
  }
  return null;
}
