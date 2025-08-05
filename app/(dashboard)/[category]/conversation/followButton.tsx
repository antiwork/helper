import { Bell, BellOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

interface FollowButtonProps {
  conversationSlug: string;
  className?: string;
}

export const FollowButton = ({ conversationSlug, className }: FollowButtonProps) => {
  const [isOptimistic, setIsOptimistic] = useState<boolean | null>(null);

  const { data: followStatus, isLoading } = api.mailbox.conversations.isFollowing.useQuery({ conversationSlug });

  const utils = api.useUtils();

  const followMutation = api.mailbox.conversations.follow.useMutation({
    onMutate: () => {
      setIsOptimistic(true);
    },
    onSuccess: () => {
      toast.success("Following conversation");
      utils.mailbox.conversations.isFollowing.invalidate();
      setIsOptimistic(null);
    },
    onError: (_error) => {
      toast.error("Failed to follow conversation");
      setIsOptimistic(null);
    },
  });

  const unfollowMutation = api.mailbox.conversations.unfollow.useMutation({
    onMutate: () => {
      setIsOptimistic(false);
    },
    onSuccess: () => {
      toast.success("Unfollowed conversation");
      utils.mailbox.conversations.isFollowing.invalidate();
      setIsOptimistic(null);
    },
    onError: (_error) => {
      toast.error("Failed to unfollow conversation");
      setIsOptimistic(null);
    },
  });

  const isFollowing = isOptimistic ?? followStatus?.following ?? false;
  const isPending = followMutation.isPending || unfollowMutation.isPending;

  const handleToggleFollow = () => {
    if (isPending) return;

    if (isFollowing) {
      unfollowMutation.mutate({ conversationSlug });
    } else {
      followMutation.mutate({ conversationSlug });
    }
  };

  const buttonText = isFollowing ? "Following" : "Follow";
  const Icon = isFollowing ? Bell : BellOff;
  const tooltipText = isFollowing
    ? "Click to stop receiving notifications for this conversation"
    : "Click to receive notifications when this conversation is updated";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isFollowing ? "default" : "outlined"}
            size="sm"
            onClick={handleToggleFollow}
            disabled={isLoading || isPending}
            className={cn(
              "transition-all duration-200",
              isFollowing && "bg-blue-600 hover:bg-blue-700 text-white",
              className,
            )}
          >
            <Icon className="h-4 w-4 mr-2" />
            {buttonText}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
