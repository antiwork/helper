import Link from "next/link";
import { useConversationContext } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/[category]/conversation/conversationContext";
import { Button } from "@/components/ui/button";

export const MergedContent = () => {
  const { mailboxSlug, data: conversationInfo } = useConversationContext();
  if (!conversationInfo?.mergedInto?.slug) return null;

  return (
    <div className="absolute inset-0 z-50 bg-background/75 flex flex-col items-center justify-center gap-4 h-full text-lg">
      Merged into another conversation.
      <Button variant="subtle" asChild>
        <Link href={`/mailboxes/${mailboxSlug}/conversations?id=${conversationInfo.mergedInto.slug}`}>View</Link>
      </Button>
    </div>
  );
};