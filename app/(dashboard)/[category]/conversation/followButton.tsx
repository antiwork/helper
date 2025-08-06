"use client";

import { Heart, HeartOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

interface FollowButtonProps {
  conversationSlug: string;
  className?: string;
}

export const FollowButton = ({ conversationSlug, className }: FollowButtonProps) => {
  const utils = api.useUtils();
  
  const { data: isFollowing = false, isLoading: isLoadingFollowStatus } = api.mailbox.conversations.isFollowing.useQuery(
    { conversationSlug },
    { retry: false }
  );

  const followMutation = api.mailbox.conversations.follow.useMutation({
    onSuccess: () => {
      toast.success("Following this conversation");
      void utils.mailbox.conversations.isFollowing.invalidate({ conversationSlug });
    },
    onError: () => {
      toast.error("Failed to follow conversation");
    },
  });

  const unfollowMutation = api.mailbox.conversations.unfollow.useMutation({
    onSuccess: () => {
      toast.success("Unfollowed conversation");
      void utils.mailbox.conversations.isFollowing.invalidate({ conversationSlug });
    },
    onError: () => {
      toast.error("Failed to unfollow conversation");
    },
  });

  const handleToggleFollow = () => {
    if (isFollowing) {
      unfollowMutation.mutate({ conversationSlug });
    } else {
      followMutation.mutate({ conversationSlug });
    }
  };

  const isLoading = isLoadingFollowStatus || followMutation.isPending || unfollowMutation.isPending;

  return (
    <Button
      variant="outlined"
      size="sm"
      onClick={handleToggleFollow}
      disabled={isLoading}
      className={cn("flex items-center gap-2", className)}
    >
      {isFollowing ? (
        <>
          <HeartOff className="h-4 w-4" />
          Unfollow
        </>
      ) : (
        <>
          <Heart className="h-4 w-4" />
          Follow
        </>
      )}
    </Button>
  );
};