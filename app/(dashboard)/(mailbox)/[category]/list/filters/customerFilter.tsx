import { Check, UserCircle } from "lucide-react";
import { useState } from "react";
import LoadingSpinner from "@/components/loadingSpinner";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDebouncedCallback } from "@/components/useDebouncedCallback";
import { api } from "@/trpc/react";

export function CustomerFilter({
  selectedCustomers,
  onChange,
}: {
  selectedCustomers: string[];
  onChange: (customers: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  const { data: customers, isFetching } = api.mailbox.customers.list.useQuery({
    search: debouncedSearchTerm,
  });

  const debouncedSearch = useDebouncedCallback((term: string) => {
    setDebouncedSearchTerm(term);
  }, 300);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant={selectedCustomers.length ? "bright" : "outlined_subtle"} className="whitespace-nowrap">
          <UserCircle className="h-4 w-4 mr-2" />
          <span className="max-w-40 truncate">
            {selectedCustomers.length === 1
              ? selectedCustomers[0]
              : selectedCustomers.length
                ? `${selectedCustomers.length} customers`
                : "Customer"}
          </span>
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
            {isFetching ? (
              <div className="flex justify-center p-4">
                <LoadingSpinner size="sm" />
              </div>
            ) : (
              <>
                <CommandEmpty>No customers found</CommandEmpty>
                <CommandGroup>
                  {(customers ?? []).map((customer) => (
                    <CommandItem
                      key={customer.id}
                      onSelect={() => {
                        const isSelected = selectedCustomers.includes(customer.email);
                        onChange(
                          isSelected
                            ? selectedCustomers.filter((c) => c !== customer.email)
                            : [...selectedCustomers, customer.email],
                        );
                      }}
                    >
                      <Check
                        className={`mr-2 h-4 w-4 ${
                          selectedCustomers.includes(customer.email) ? "opacity-100" : "opacity-0"
                        }`}
                      />
                      <span className="truncate">{customer.email}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
