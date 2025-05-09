import { HandThumbDownIcon, HandThumbUpIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ReactionFilter({
  reactionType,
  onChange,
}: {
  reactionType: "thumbs-up" | "thumbs-down" | null;
  onChange: (reactionType: "thumbs-up" | "thumbs-down" | null) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={reactionType ? "bright" : "outlined_subtle"} className="whitespace-nowrap">
          {reactionType === "thumbs-down" ? (
            <HandThumbDownIcon className="h-4 w-4 mr-2" />
          ) : (
            <HandThumbUpIcon className="h-4 w-4 mr-2" />
          )}
          {reactionType === "thumbs-up"
            ? "Positive reaction"
            : reactionType === "thumbs-down"
              ? "Negative reaction"
              : "Reaction"}
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
}
