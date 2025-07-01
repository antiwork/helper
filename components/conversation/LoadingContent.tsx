import { useConversationContext } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/[category]/conversation/conversationContext";
import LoadingSpinner from "@/components/loadingSpinner";

export const LoadingContent = () => {
  const { isPending } = useConversationContext();
  if (!isPending) return null;

  return (
    <div className="flex items-center justify-center grow">
      <LoadingSpinner size="md" />
    </div>
  );
};