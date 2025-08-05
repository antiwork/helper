import { Check, LucideIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useMembers } from "@/components/useMembers";

interface MemberFilterProps {
  selectedMembers: string[];
  onChange: (members: string[]) => void;
  icon: LucideIcon;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  singleSelectionDisplay?: (memberName: string) => string;
  multiSelectionDisplay?: (count: number) => string;
  includeUnassigned?: boolean;
}

export function MemberFilter({
  selectedMembers,
  onChange,
  icon: Icon,
  placeholder,
  searchPlaceholder,
  emptyText,
  singleSelectionDisplay = (name) => name,
  multiSelectionDisplay = (count) => `${count} selected`,
  includeUnassigned = false,
}: MemberFilterProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { data: members } = useMembers();

  const filteredMembers = members?.filter((member) =>
    member.displayName.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const unassignedItem = {
    id: "unassigned",
    displayName: "Unassigned",
  };

  const shouldShowUnassigned =
    includeUnassigned && (!searchTerm || unassignedItem.displayName.toLowerCase().includes(searchTerm.toLowerCase()));

  const singleMemberName =
    selectedMembers.length === 1
      ? selectedMembers[0] === "unassigned"
        ? "Unassigned"
        : members?.find((m) => m.id === selectedMembers[0])?.displayName
      : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={selectedMembers.length ? "bright" : "outlined_subtle"}
          className="whitespace-nowrap"
          title={singleMemberName}
        >
          <Icon className="h-4 w-4 mr-2 flex-shrink-0" />
          <span className="truncate">
            {selectedMembers.length === 1
              ? singleSelectionDisplay(singleMemberName || "")
              : selectedMembers.length
                ? multiSelectionDisplay(selectedMembers.length)
                : placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder={searchPlaceholder} value={searchTerm} onValueChange={setSearchTerm} />
          <div className="max-h-[300px] overflow-y-auto">
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {shouldShowUnassigned && (
                <CommandItem
                  key="unassigned"
                  onSelect={() => {
                    const isSelected = selectedMembers.includes("unassigned");
                    onChange(isSelected ? selectedMembers.filter((m) => m !== "unassigned") : ["unassigned"]);
                  }}
                >
                  <Check
                    className={`mr-2 h-4 w-4 ${selectedMembers.includes("unassigned") ? "opacity-100" : "opacity-0"}`}
                  />
                  <span className="truncate">Unassigned</span>
                </CommandItem>
              )}
              {filteredMembers
                ?.toSorted((a, b) => a.displayName.localeCompare(b.displayName))
                .map((member) => (
                  <CommandItem
                    key={member.id}
                    onSelect={() => {
                      const isSelected = selectedMembers.includes(member.id);
                      onChange(
                        isSelected
                          ? selectedMembers.filter((m) => m !== member.id)
                          : [...selectedMembers.filter((m) => m !== "unassigned"), member.id],
                      );
                    }}
                  >
                    <Check
                      className={`mr-2 h-4 w-4 ${selectedMembers.includes(member.id) ? "opacity-100" : "opacity-0"}`}
                    />
                    <span className="truncate">{member.displayName}</span>
                  </CommandItem>
                ))}
            </CommandGroup>
          </div>
          {selectedMembers.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem onSelect={() => onChange([])} className="cursor-pointer justify-center">
                  Clear
                </CommandItem>
              </CommandGroup>
            </>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
