import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useDebouncedCallback } from "@/components/useDebouncedCallback";
import { useConversationsListInput } from "../shared/queries";
import { AssigneeFilter } from "./filters/assigneeFilter";
import { CustomerFilter } from "./filters/customerFilter";
import { DateFilter } from "./filters/dateFilter";
import { EventFilter } from "./filters/eventFilter";
import { PromptFilter } from "./filters/promptFilter";
import { ReactionFilter } from "./filters/reactionFilter";
import { ResponderFilter } from "./filters/responderFilter";
import { VipFilter } from "./filters/vipFilter";

interface FilterValues {
  assignee: string[];
  createdAfter: string | null;
  createdBefore: string | null;
  repliedBy: string[];
  customer: string[];
  isVip: boolean | undefined;
  isPrompt: boolean | undefined;
  reactionType: "thumbs-up" | "thumbs-down" | null;
  events: ("request_human_support" | "resolved_by_ai")[];
}

interface ConversationFiltersProps {
  filterValues: FilterValues;
  onUpdateFilter: (updates: Partial<FilterValues>) => void;
  onClearFilters: () => void;
  activeFilterCount: number;
}

export const useConversationFilters = () => {
  const { searchParams, setSearchParams } = useConversationsListInput();

  const [filterValues, setFilterValues] = useState<FilterValues>({
    assignee: searchParams.assignee ?? [],
    createdAfter: searchParams.createdAfter ?? null,
    createdBefore: searchParams.createdBefore ?? null,
    repliedBy: searchParams.repliedBy ?? [],
    customer: searchParams.customer ?? [],
    isVip: searchParams.isVip ?? undefined,
    isPrompt: searchParams.isPrompt ?? undefined,
    reactionType: searchParams.reactionType ?? null,
    events: searchParams.events ?? [],
  });

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterValues.assignee.length > 0) count++;
    if (filterValues.createdAfter || filterValues.createdBefore) count++;
    if (filterValues.repliedBy.length > 0) count++;
    if (filterValues.customer.length > 0) count++;
    if (filterValues.isVip !== undefined) count++;
    if (filterValues.isPrompt !== undefined) count++;
    if (filterValues.reactionType !== null) count++;
    if (filterValues.events.length > 0) count++;
    return count;
  }, [filterValues]);

  const debouncedSetFilters = useDebouncedCallback((newFilters: Partial<FilterValues>) => {
    setSearchParams((prev) => ({ ...prev, ...newFilters }));
  }, 300);

  useEffect(() => {
    setFilterValues({
      assignee: searchParams.assignee ?? [],
      createdAfter: searchParams.createdAfter ?? null,
      createdBefore: searchParams.createdBefore ?? null,
      repliedBy: searchParams.repliedBy ?? [],
      customer: searchParams.customer ?? [],
      isVip: searchParams.isVip ?? undefined,
      isPrompt: searchParams.isPrompt ?? undefined,
      reactionType: searchParams.reactionType ?? null,
      events: searchParams.events ?? [],
    });
  }, [searchParams]);

  const updateFilter = (updates: Partial<FilterValues>) => {
    setFilterValues((prev) => ({ ...prev, ...updates }));
    debouncedSetFilters(updates);
  };

  const clearFilters = () => {
    const clearedFilters = {
      assignee: null,
      createdAfter: null,
      createdBefore: null,
      repliedBy: null,
      customer: null,
      isVip: null,
      isPrompt: null,
      reactionType: null,
      events: null,
    };
    setSearchParams((prev) => ({ ...prev, ...clearedFilters }));
  };

  return {
    filterValues,
    activeFilterCount,
    updateFilter,
    clearFilters,
  };
};

export const ConversationFilters = ({
  filterValues,
  onUpdateFilter,
  activeFilterCount,
  onClearFilters,
}: ConversationFiltersProps) => {
  return (
    <div className="flex flex-wrap items-center justify-center gap-1 md:gap-2">
      <DateFilter
        // A hack to force the date filter to re-render when the date changes
        key={`${filterValues.createdAfter}-${filterValues.createdBefore}`}
        initialStartDate={filterValues.createdAfter}
        initialEndDate={filterValues.createdBefore}
        onSelect={(startDate, endDate) => {
          onUpdateFilter({ createdAfter: startDate, createdBefore: endDate });
        }}
      />
      <AssigneeFilter
        selectedAssignees={filterValues.assignee}
        onChange={(assignees) => onUpdateFilter({ assignee: assignees })}
      />
      <ResponderFilter
        selectedResponders={filterValues.repliedBy}
        onChange={(responders) => onUpdateFilter({ repliedBy: responders })}
      />
      <CustomerFilter
        selectedCustomers={filterValues.customer}
        onChange={(customers) => onUpdateFilter({ customer: customers })}
      />
      <VipFilter isVip={filterValues.isVip} onChange={(isVip) => onUpdateFilter({ isVip })} />
      <ReactionFilter
        reactionType={filterValues.reactionType ?? null}
        onChange={(reactionType) => onUpdateFilter({ reactionType })}
      />
      <EventFilter selectedEvents={filterValues.events} onChange={(events) => onUpdateFilter({ events })} />
      <PromptFilter isPrompt={filterValues.isPrompt} onChange={(isPrompt) => onUpdateFilter({ isPrompt })} />
      {activeFilterCount > 0 && (
        <Button variant="ghost" onClick={onClearFilters}>
          Clear
        </Button>
      )}
    </div>
  );
};
