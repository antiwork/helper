import { MessageActions } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/[category]/conversation/messageActions";

export const MessageActionsPanel = () => {
  return (
    <div
      className="h-full bg-muted px-4 pb-4"
      onKeyDown={(e) => {
        // Prevent keypress events from triggering the global inbox view keyboard shortcuts
        e.stopPropagation();
      }}
    >
      <MessageActions />
    </div>
  );
};