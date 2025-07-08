import { Frown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Message } from "@/app/types/global";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/trpc/react";

interface FlagAsBadActionProps {
  message: Message;
  conversationSlug: string;
}

export const FlagAsBadAction = ({ message, conversationSlug }: FlagAsBadActionProps) => {
  const [badReplyReason, setBadReplyReason] = useState("");
  const utils = api.useUtils();
  const { mutateAsync: flagAsBad } = api.mailbox.conversations.messages.flagAsBad.useMutation({
    onError: (error) => {
      toast.error(`Error flagging message as bad`, {
        description: error.message,
      });
    },
  });

  const handleMarkBad = (reason: string) => {
    flagAsBad({
      id: message.id,
      reason,
      conversationSlug,
    });
    utils.mailbox.conversations.get.setData({ conversationSlug }, (data) => {
      return data
        ? {
            ...data,
            messages: data.messages.map((m) =>
              m.type === "message" && m.id === message.id
                ? {
                    ...m,
                    isFlaggedAsBad: true,
                    reason,
                  }
                : m,
            ),
          }
        : data;
    });
  };

  if (message.isFlaggedAsBad) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <Frown size={14} /> Flag as bad
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(calc(100vw-2rem),400px)]"
        align="start"
        side="top"
        avoidCollisions
        collisionPadding={16}
      >
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleMarkBad(badReplyReason);
          }}
        >
          <div className="grid gap-1">
            <Label htmlFor="badReplyReason">Reason</Label>
            <Textarea
              name="badReplyReason"
              value={badReplyReason}
              rows={3}
              required
              onChange={(e) => setBadReplyReason(e.target.value)}
            />
          </div>
          <Button variant="bright">Flag as bad</Button>
        </form>
      </PopoverContent>
    </Popover>
  );
};
