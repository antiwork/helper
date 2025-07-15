import { ThumbsDown, ThumbsUp } from "lucide-react";
import { memo, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const ReactionFilter = memo(function ReactionFilter({
  reactionType,
  onChange,
}: {
  reactionType: "thumbs-up" | "thumbs-down" | null;
  onChange: (reactionType: "thumbs-up" | "thumbs-down" | null) => void;
}) {
  const buttonContent = useMemo(() => {
    const icon =
      reactionType === "thumbs-down" ? <ThumbsDown className="h-4 w-4 mr-2" /> : <ThumbsUp className="h-4 w-4 mr-2" />;

    const text =
      reactionType === "thumbs-up"
        ? "Positive reaction"
        : reactionType === "thumbs-down"
          ? "Negative reaction"
          : "Reaction";

    return { icon, text };
  }, [reactionType]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={reactionType ? "bright" : "outlined_subtle"} className="whitespace-nowrap">
          {buttonContent.icon}
          {buttonContent.text}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuRadioGroup
          value={reactionType ?? "null"}
          onValueChange={(value) => onChange(value === "null" ? null : (value as "thumbs-up" | "thumbs-down"))}
          className="flex flex-col"
        >
          <DropdownMenuRadioItem value="null">All conversations</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="thumbs-up">Positive reaction</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="thumbs-down">Negative reaction</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
