import { Check, User } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { api } from "@/trpc/react";

export function AssigneeFilter({
  selectedAssignees,
  onChange,
}: {
  selectedAssignees: string[];
  onChange: (assignees: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { data: members } = api.organization.getMembers.useQuery(undefined, {
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const filteredMembers = members?.filter((member) =>
    member.displayName.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={selectedAssignees.length ? "bright" : "outlined_subtle"}
          className="whitespace-nowrap"
          title={
            selectedAssignees.length === 1
              ? members?.find((m) => m.id === selectedAssignees[0])?.displayName
              : undefined
          }
        >
          <User className="h-4 w-4 mr-2 flex-shrink-0" />
          <span className="truncate">
            {selectedAssignees.length === 1
              ? members?.find((m) => m.id === selectedAssignees[0])?.displayName
              : selectedAssignees.length
                ? `${selectedAssignees.length} assignees`
                : "Assignee"}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search assignees..." value={searchTerm} onValueChange={setSearchTerm} />
          <div className="max-h-[300px] overflow-y-auto">
            <CommandEmpty>No assignees found</CommandEmpty>
            <CommandGroup>
              {filteredMembers
                ?.toSorted((a, b) => a.displayName.localeCompare(b.displayName))
                .map((member) => (
                  <CommandItem
                    key={member.id}
                    onSelect={() => {
                      const isSelected = selectedAssignees.includes(member.id);
                      onChange(
                        isSelected
                          ? selectedAssignees.filter((a) => a !== member.id)
                          : [...selectedAssignees, member.id],
                      );
                    }}
                  >
                    <Check
                      className={`mr-2 h-4 w-4 ${selectedAssignees.includes(member.id) ? "opacity-100" : "opacity-0"}`}
                    />
                    <span className="truncate">{member.displayName}</span>
                  </CommandItem>
                ))}
            </CommandGroup>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
