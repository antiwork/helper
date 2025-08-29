import { Layers } from "lucide-react";
import { memo } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/trpc/react";

export const IssueGroupFilter = memo(function IssueGroupFilter({
  issueGroupId,
  onChange,
}: {
  issueGroupId: number | null;
  onChange: (issueGroupId: number | null) => void;
}) {
  const { data: issueGroups, isLoading, isError } = api.mailbox.issueGroups.listAll.useQuery();

  const selectedGroup = issueGroups?.groups.find((group) => group.id === issueGroupId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={issueGroupId ? "bright" : "outlined_subtle"} className="whitespace-nowrap">
          <Layers className="h-4 w-4 mr-2" />
          {selectedGroup ? selectedGroup.title : "Common issue"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-w-xs">
        <DropdownMenuRadioGroup
          value={issueGroupId?.toString() ?? "all"}
          onValueChange={(value) => {
            if (value === "all") {
              onChange(null);
            } else {
              const numValue = parseInt(value, 10);
              if (!isNaN(numValue)) {
                onChange(numValue);
              }
            }
          }}
          className="flex flex-col"
        >
          <DropdownMenuRadioItem value="all">Open conversations</DropdownMenuRadioItem>
          {isLoading ? (
            <DropdownMenuRadioItem value="loading" disabled>
              Loading...
            </DropdownMenuRadioItem>
          ) : isError ? (
            <DropdownMenuRadioItem value="error" disabled>
              <span className="text-red-500">Failed to load issue groups</span>
            </DropdownMenuRadioItem>
          ) : issueGroups?.groups.length === 0 ? (
            <DropdownMenuRadioItem value="empty" disabled>
              No issue groups found
            </DropdownMenuRadioItem>
          ) : (
            issueGroups?.groups.map((group) => (
              <DropdownMenuRadioItem key={group.id} value={group.id.toString()}>
                <span className="truncate">{group.title}</span>
              </DropdownMenuRadioItem>
            ))
          )}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
