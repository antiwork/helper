import { UserCircle } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useDebouncedCallback } from "@/components/useDebouncedCallback";
import { api } from "@/trpc/react";
import { FilterBase } from "./filterBase";

export function CustomerFilter({
  selectedCustomers,
  onChange,
}: {
  selectedCustomers: string[];
  onChange: (customers: string[]) => void;
}) {
  const params = useParams<{ mailbox_slug: string }>();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  const { data: customers, isFetching } = api.mailbox.customers.list.useQuery({
    mailboxSlug: params.mailbox_slug,
    search: debouncedSearchTerm,
  });

  const debouncedSearch = useDebouncedCallback((term: string) => {
    setDebouncedSearchTerm(term);
  }, 300);

  const customerItems = (customers ?? []).map((customer) => ({
    id: customer.id.toString(),
    displayName: customer.email,
  }));

  return (
    <FilterBase
      selectedItems={selectedCustomers}
      onChange={onChange}
      icon={UserCircle}
      placeholder="Customer"
      searchPlaceholder="Search customers..."
      emptyText="No customers found"
      items={customerItems}
      isLoading={isFetching}
      searchTerm={searchTerm}
      onSearchChange={(value) => {
        setSearchTerm(value);
        debouncedSearch(value);
      }}
      getItemValue={(item) => item.displayName}
      singleSelectionDisplay={(email) => email}
      multiSelectionDisplay={(count) => `${count} customers`}
      disableClientFiltering
    />
  );
}
