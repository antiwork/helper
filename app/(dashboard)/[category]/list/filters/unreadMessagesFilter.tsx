import { Button } from "@/components/ui/button";

interface UnreadMessagesFilterProps {
  hasUnreadMessages: boolean | undefined;
  onChange: (hasUnreadMessages: boolean | undefined) => void;
}

export const UnreadMessagesFilter = ({ hasUnreadMessages, onChange }: UnreadMessagesFilterProps) => {
  return (
    <Button
      variant={hasUnreadMessages ? "bright" : "outlined_subtle"}
      onClick={() => onChange(hasUnreadMessages ? undefined : true)}
      className="whitespace-nowrap"
    >
      Unread
    </Button>
  );
};
