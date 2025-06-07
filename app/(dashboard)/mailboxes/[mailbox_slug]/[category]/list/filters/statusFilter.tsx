import { upperFirst } from "lodash-es";
import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Status = "open" | "spam" | "closed";

export function StatusFilter({
  selectedStatuses,
  onChange,
}: {
  selectedStatuses: Status[];
  onChange: (statuses: Status[]) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={selectedStatuses.length ? "bright" : "outlined_subtle"} className="whitespace-nowrap">
          <Inbox className="h-4 w-4 mr-2" />
          {selectedStatuses.length ? selectedStatuses.map((status) => upperFirst(status)).join(", ") : "Status"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {(["open", "closed", "spam"] as const).map((status) => (
          <DropdownMenuCheckboxItem
            key={status}
            onSelect={(e) => e.preventDefault()}
            checked={selectedStatuses.includes(status)}
            onCheckedChange={(checked) =>
              onChange(checked ? [...selectedStatuses, status] : selectedStatuses.filter((s) => s !== status))
            }
          >
            {upperFirst(status)}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
