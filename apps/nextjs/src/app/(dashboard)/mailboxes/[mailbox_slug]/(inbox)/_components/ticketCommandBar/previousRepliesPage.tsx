import { ComponentType } from "react";
import { RouterOutputs } from "@/trpc";
import { CommandGroup } from "./types";

const EmptyIcon: ComponentType<{ className?: string }> = () => null;

type PreviousRepliesPageProps = {
  previousReplies: RouterOutputs["mailbox"]["conversations"]["messages"]["previousReplies"] | undefined;
  onInsertReply: (content: string) => void;
  onOpenChange: (open: boolean) => void;
  setPage: (page: "main" | "previous-replies" | "assignees") => void;
};

export const usePreviousRepliesPage = ({
  previousReplies,
  onInsertReply,
  onOpenChange,
  setPage,
}: PreviousRepliesPageProps): CommandGroup[] => [
  {
    heading: "Previous Replies",
    items: (previousReplies || [])
      .sort((a, b) => b.similarity - a.similarity)
      .map((reply) => ({
        id: reply.id,
        label: reply.cleanedUpText.slice(0, 60) + (reply.cleanedUpText.length > 60 ? "..." : ""),
        icon: EmptyIcon,
        onSelect: () => {
          onInsertReply(reply.content ?? "");
          setPage("main");
          onOpenChange(false);
        },
      })),
  },
];
