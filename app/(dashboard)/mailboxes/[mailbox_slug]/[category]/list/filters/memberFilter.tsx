import { Check } from "@/components/icons";
import { LucideIcon } from "lucide-react";
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
import { api } from "@/trpc/react";

interface MemberFilterProps {
  selectedMembers: string[];
  onChange: (members: string[]) => void;
  icon: LucideIcon;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  singleSelectionDisplay?: (memberName: string) => string;
  multiSelectionDisplay?: (count: number) => string;
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
}: MemberFilterProps) {
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

  const singleMemberName =
    selectedMembers.length === 1 ? members?.find((m) => m.id === selectedMembers[0])?.displayName : undefined;

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
              {filteredMembers
                ?.toSorted((a, b) => a.displayName.localeCompare(b.displayName))
                .map((member) => (
                  <CommandItem
                    key={member.id}
                    onSelect={() => {
                      const isSelected = selectedMembers.includes(member.id);
                      onChange(
                        isSelected ? selectedMembers.filter((m) => m !== member.id) : [...selectedMembers, member.id],
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
