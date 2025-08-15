import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface UnreadMessagesBadgeProps {
  count: number;
  className?: string;
}

export const UnreadMessagesBadge = ({ count, className }: UnreadMessagesBadgeProps) => {
  if (count <= 0) return null;

  const displayText = count > 10 ? "10+ unread messages" : `${count} unread message${count === 1 ? "" : "s"}`;

  return (
    <Badge 
      variant="bright" 
      className={cn("text-xs px-3 py-1 rounded-full whitespace-nowrap", className)}
    >
      {displayText}
    </Badge>
  );
};