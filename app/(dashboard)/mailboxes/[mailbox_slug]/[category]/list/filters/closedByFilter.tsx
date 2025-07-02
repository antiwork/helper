import { UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ClosedByFilter({
  closedBy,
  onChange,
}: {
  closedBy: "ai" | "human" | null;
  onChange: (closedBy: "ai" | "human" | null) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={closedBy ? "bright" : "outlined_subtle"} className="whitespace-nowrap">
          <UserCheck className="h-4 w-4 mr-2" />
          {closedBy === "ai" ? "Closed by AI" : closedBy === "human" ? "Closed manually" : "Closed by"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuRadioGroup
          value={closedBy ?? "null"}
          onValueChange={(value) => onChange(value === "null" ? null : (value as "ai" | "human"))}
          className="flex flex-col"
        >
          <DropdownMenuRadioItem value="null">Any</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="ai">Closed by AI</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="human">Closed manually</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
