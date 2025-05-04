import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";
import { Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { api } from "@/trpc/react";

export function ResponderFilter({
  selectedResponders,
  onChange,
}: {
  selectedResponders: string[];
  onChange: (responders: string[]) => void;
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
        <Button variant={selectedResponders.length ? "bright" : "outlined_subtle"} className="whitespace-nowrap">
          <ChatBubbleLeftRightIcon className="h-4 w-4 mr-2" />
          {selectedResponders.length === 1
            ? members?.find((m) => m.id === selectedResponders[0])?.displayName
            : selectedResponders.length
              ? `${selectedResponders.length} responders`
              : "Replied by"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search responders..." value={searchTerm} onValueChange={setSearchTerm} />
          <div className="max-h-[300px] overflow-y-auto">
            <CommandEmpty>No responders found</CommandEmpty>
            <CommandGroup>
              {filteredMembers
                ?.toSorted((a, b) => a.displayName.localeCompare(b.displayName))
                .map((member) => (
                  <CommandItem
                    key={member.id}
                    onSelect={() => {
                      const isSelected = selectedResponders.includes(member.id);
                      onChange(
                        isSelected
                          ? selectedResponders.filter((r) => r !== member.id)
                          : [...selectedResponders, member.id],
                      );
                    }}
                  >
                    <Check
                      className={`mr-2 h-4 w-4 ${selectedResponders.includes(member.id) ? "opacity-100" : "opacity-0"}`}
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
