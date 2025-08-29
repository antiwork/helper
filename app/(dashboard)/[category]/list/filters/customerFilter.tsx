import { UserCircle } from "lucide-react";
import { memo, useState, useTransition } from "react";
import LoadingSpinner from "@/components/loadingSpinner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDebouncedCallback } from "@/components/useDebouncedCallback";
import { api } from "@/trpc/react";

export const CustomerFilter = memo(function CustomerFilter({
  selectedCustomers,
  onChange,
}: {
  selectedCustomers: string[];
  onChange: (customers: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [isPending, startTransition] = useTransition();

  const { data: customers, isFetching } = api.mailbox.customers.list.useQuery({
    search: debouncedSearchTerm,
  });

  const debouncedSearch = useDebouncedCallback((term: string) => {
    startTransition(() => {
      setDebouncedSearchTerm(term);
    });
  }, 300);

  const buttonText =
    selectedCustomers.length === 1
      ? selectedCustomers[0]
      : selectedCustomers.length > 1
        ? `${selectedCustomers.length} customers`
        : "Customer";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant={selectedCustomers.length ? "bright" : "outlined_subtle"} className="whitespace-nowrap">
          <UserCircle className="h-4 w-4 mr-2" />
          <span className="max-w-40 truncate">{buttonText}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search customers..."
            value={searchTerm}
            onValueChange={(value) => {
              setSearchTerm(value);
              debouncedSearch(value);
            }}
          />
          <div className="max-h-[300px] overflow-y-auto">
            {isFetching || isPending ? (
              <div className="flex justify-center p-4">
                <LoadingSpinner size="sm" />
              </div>
            ) : (
              <>
                <CommandEmpty>No customers found</CommandEmpty>
                <CommandGroup>
                  {(customers ?? []).map((customer) => {
                    const isSelected = selectedCustomers.includes(customer.email);
                    return (
                      <CommandItem
                        key={customer.id}
                        onSelect={() => {
                          onChange(
                            isSelected
                              ? selectedCustomers.filter((c) => c !== customer.email)
                              : [...selectedCustomers, customer.email],
                          );
                        }}
                      >
                        <Checkbox
                          checked={isSelected}
                          onClick={(e) => e.stopPropagation()}
                          onCheckedChange={() => {
                            onChange(
                              isSelected
                                ? selectedCustomers.filter((c) => c !== customer.email)
                                : [...selectedCustomers, customer.email],
                            );
                          }}
                          aria-label={`Select ${customer.email}`}
                        />
                        <span className="truncate">{customer.email}</span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </>
            )}
          </div>
          {selectedCustomers.length > 0 && (
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
});
