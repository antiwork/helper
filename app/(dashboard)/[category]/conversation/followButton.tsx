import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

interface FollowButtonProps {
  conversationSlug: string;
  className?: string;
  size?: "sm" | "default";
}

export const FollowButton = ({ conversationSlug, className, size = "sm" }: FollowButtonProps) => {
  const { data: followStatus, isLoading } = api.mailbox.conversations.isFollowing.useQuery({ conversationSlug });

  const utils = api.useUtils();

  const followMutation = api.mailbox.conversations.follow.useMutation({
    onMutate: () => {
      utils.mailbox.conversations.isFollowing.setData({ conversationSlug }, (data) =>
        data ? { ...data, following: true } : data,
      );
    },
    onSuccess: () => {
      toast.success("Following conversation");
      utils.mailbox.conversations.isFollowing.invalidate({ conversationSlug });
    },
    onError: (_error) => {
      toast.error("Failed to follow conversation");
      utils.mailbox.conversations.isFollowing.invalidate({ conversationSlug });
    },
  });

  const unfollowMutation = api.mailbox.conversations.unfollow.useMutation({
    onMutate: () => {
      utils.mailbox.conversations.isFollowing.setData({ conversationSlug }, (data) =>
        data ? { ...data, following: false } : data,
      );
    },
    onSuccess: () => {
      toast.success("Unfollowed conversation");
      utils.mailbox.conversations.isFollowing.invalidate({ conversationSlug });
    },
    onError: (_error) => {
      toast.error("Failed to unfollow conversation");
      utils.mailbox.conversations.isFollowing.invalidate({ conversationSlug });
    },
  });

  const isFollowing = followStatus?.following ?? false;
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
    ? "Stop receiving notifications for this conversation"
    : "Receive notifications when this conversation is updated";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isFollowing ? "default" : "outlined"}
            size={size}
            onClick={handleToggleFollow}
            disabled={isLoading || isPending}
            aria-pressed={isFollowing}
            aria-label={isFollowing ? "Unfollow conversation" : "Follow conversation"}
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
