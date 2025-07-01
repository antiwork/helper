import { useConversationContext } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/[category]/conversation/conversationContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export const ErrorContent = () => {
  const { error, refetch } = useConversationContext();
  if (!error) return null;

  return (
    <div className="flex items-center justify-center grow">
      <Alert variant="destructive" className="max-w-lg text-center">
        <AlertTitle>Failed to load conversation</AlertTitle>
        <AlertDescription className="flex flex-col gap-4">
          Error loading this conversation: {error.message}
          <Button variant="destructive_outlined" onClick={() => refetch()}>
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
};