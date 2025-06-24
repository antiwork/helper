import { MessageSquare } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function PromptFilter({
  isPrompt,
  onChange,
}: {
  isPrompt: boolean | undefined;
  onChange: (isPrompt: boolean | undefined) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={isPrompt !== undefined ? "bright" : "outlined_subtle"} className="whitespace-nowrap">
          <MessageSquare className="h-4 w-4 mr-2" />
          {isPrompt === true ? "From a prompt" : isPrompt === false ? "Not from a prompt" : "Prompt"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuRadioGroup
          value={isPrompt === undefined ? "undefined" : isPrompt.toString()}
          onValueChange={(value) => onChange(value === "undefined" ? undefined : value === "true")}
          className="flex flex-col"
        >
          <DropdownMenuRadioItem value="undefined">Any</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="true">From a prompt</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="false">Not from a prompt</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
