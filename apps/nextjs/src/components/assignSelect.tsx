import { useUser } from "@clerk/nextjs";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { Bot, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { api } from "@/trpc/react";

export type AssigneeOption =
  | {
      id: string;
      displayName: string;
    }
  | { ai: true };

interface AssignSelectProps {
  selectedUserId?: string | null;
  onChange: (assignee: AssigneeOption | null) => void;
  aiOption?: boolean;
  aiOptionSelected?: boolean;
}

export const AssignSelect = ({ selectedUserId, onChange, aiOption, aiOptionSelected }: AssignSelectProps) => {
  const { user: currentUser } = useUser();
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const { data: orgMembers } = api.organization.getMembers.useQuery(undefined, {
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const sortedMembers =
    orgMembers?.sort((a, b) => {
      if (a.id === currentUser?.id) return -1;
      if (b.id === currentUser?.id) return 1;
      return a.displayName.localeCompare(b.displayName);
    }) || [];
  const filteredMembers = sortedMembers.filter((member) =>
    member.displayName.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const aiItem = {
    id: "ai",
    displayName: "Helper agent",
  };

  const allItems = [
    ...(!searchTerm || "anyone".includes(searchTerm.toLowerCase()) ? [{ id: null, displayName: "Anyone" }] : []),
    ...(aiOption && (!searchTerm || aiItem.displayName.toLowerCase().includes(searchTerm.toLowerCase()))
      ? [aiItem]
      : []),
    ...filteredMembers,
  ];

  const selectedMember = aiOptionSelected ? aiItem : sortedMembers.find((m) => m.id === selectedUserId);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [open, searchTerm]);

  const selectOption = (option: AssigneeOption | null) => {
    onChange(option);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;

    const updateSelection = (newIndex: number) => {
      e.preventDefault();
      setHighlightedIndex(newIndex);
    };

    switch (e.key) {
      case "ArrowDown":
        updateSelection((highlightedIndex + 1) % allItems.length);
        break;
      case "ArrowUp":
        updateSelection((highlightedIndex - 1 + allItems.length) % allItems.length);
        break;
      case "Enter":
        if (highlightedIndex !== -1) {
          e.preventDefault();
          const selectedItem = allItems[highlightedIndex];
          if (selectedItem) selectOption(selectedItem.id === null ? null : selectedItem);
        }
        break;
      case "Escape":
        setOpen(false);
        break;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button variant="outlined_subtle" className="whitespace-nowrap justify-between">
          {selectedMember?.displayName || "Anyone"}
          <ChevronDownIcon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0" align="start" onKeyDown={handleKeyDown}>
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search assignees..." value={searchTerm} onValueChange={setSearchTerm} autoFocus />
          <div className="max-h-[300px] overflow-y-auto">
            <CommandEmpty>No assignees found</CommandEmpty>
            <CommandGroup>
              {allItems.map((item, index) => (
                <CommandItem
                  key={item.id ?? "anyone"}
                  onSelect={() => selectOption(item.id === null ? null : item.id === "ai" ? { ai: true } : item)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  data-highlighted={highlightedIndex === index}
                  className={highlightedIndex === index ? "bg-accent text-accent-foreground" : ""}
                >
                  <Check className={`mr-2 h-4 w-4 ${selectedMember?.id === item.id ? "opacity-100" : "opacity-0"}`} />
                  <span className="flex items-center gap-1">
                    {item.id === "ai" ? <Bot className="h-4 w-4" /> : null}
                    <span className="flex-1 min-w-0 truncate">
                      {item.displayName}
                      {item.id === currentUser?.id && " (You)"}
                    </span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
