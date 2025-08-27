import { cn } from "@/lib/utils";

interface UnreadIndicatorProps {
  hasUnread: boolean;
  className?: string;
}

export const UnreadIndicator = ({ hasUnread, className }: UnreadIndicatorProps) => {
  if (!hasUnread) return null;

  return (
    <div
      className={cn("w-3 h-3 bg-yellow-500 rounded-full", className)}
      title="Has unread messages"
      data-testid="unread-indicator"
    />
  );
};
