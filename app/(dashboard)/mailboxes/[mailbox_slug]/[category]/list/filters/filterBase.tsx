import { Check, LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";
import LoadingSpinner from "@/components/loadingSpinner";
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
import { cn } from "@/lib/utils";

interface FilterItem {
  id: string;
  displayName: string;
}

interface FilterBaseProps<T extends FilterItem> {
  selectedItems: string[];
  onChange: (items: string[]) => void;
  icon: LucideIcon;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  items?: T[];
  isLoading?: boolean;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  getItemValue?: (item: T) => string;
  singleSelectionDisplay?: (itemName: string) => string;
  multiSelectionDisplay?: (count: number) => string;
}

export function FilterBase<T extends FilterItem>({
  selectedItems,
  onChange,
  icon: Icon,
  placeholder,
  searchPlaceholder,
  emptyText,
  items = [],
  isLoading = false,
  searchTerm,
  onSearchChange,
  getItemValue = (item) => item.id,
  singleSelectionDisplay = (name) => name,
  multiSelectionDisplay = (count) => `${count} selected`,
}: FilterBaseProps<T>) {
  const [open, setOpen] = useState(false);
  const [localSearchTerm, setLocalSearchTerm] = useState("");
  const actualSearchTerm = searchTerm ?? localSearchTerm;
  const actualOnSearchChange = onSearchChange ?? setLocalSearchTerm;

  const filteredItems = useMemo(() => {
    return items.filter((item) => item.displayName.toLowerCase().includes(actualSearchTerm.toLowerCase()));
  }, [items, actualSearchTerm]);

  const singleItemName =
    selectedItems.length === 1 ? items.find((item) => getItemValue(item) === selectedItems[0])?.displayName : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={selectedItems.length ? "bright" : "outlined_subtle"}
          className="whitespace-nowrap"
          title={singleItemName}
        >
          <Icon className="h-4 w-4 mr-2 flex-shrink-0" />
          <span className="truncate">
            {selectedItems.length === 1
              ? singleSelectionDisplay(singleItemName || "")
              : selectedItems.length
                ? multiSelectionDisplay(selectedItems.length)
                : placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder={searchPlaceholder} value={actualSearchTerm} onValueChange={actualOnSearchChange} />
          <div className="max-h-[300px] overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center p-4">
                <LoadingSpinner size="sm" />
              </div>
            ) : (
              <>
                <CommandEmpty>{emptyText}</CommandEmpty>
                <CommandGroup>
                  {filteredItems
                    .toSorted((a, b) => a.displayName.localeCompare(b.displayName))
                    .map((item) => {
                      const itemValue = getItemValue(item);
                      return (
                        <CommandItem
                          key={item.id}
                          onSelect={() => {
                            const isSelected = selectedItems.includes(itemValue);
                            onChange(
                              isSelected ? selectedItems.filter((i) => i !== itemValue) : [...selectedItems, itemValue],
                            );
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedItems.includes(itemValue) ? "opacity-100" : "opacity-0",
                            )}
                          />
                          <span className="truncate">{item.displayName}</span>
                        </CommandItem>
                      );
                    })}
                </CommandGroup>
              </>
            )}
          </div>
          {selectedItems.length > 0 && (
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
