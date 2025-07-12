import React, { useEffect, useMemo, useState, useCallback } from "react";
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

  const updateFilter = useCallback((updates: Partial<FilterValues>) => {
    setFilterValues((prev) => ({ ...prev, ...updates }));
    debouncedSetFilters(updates);
  }, [debouncedSetFilters]);

  const clearFilters = useCallback(() => {
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
  }, [setSearchParams]);

  return {
    filterValues,
    activeFilterCount,
    updateFilter,
    clearFilters,
  };
};

export const ConversationFilters = React.memo<ConversationFiltersProps>(({
  filterValues,
  onUpdateFilter,
  activeFilterCount,
  onClearFilters,
}) => {
  // Memoize individual filter callbacks to prevent unnecessary re-renders
  const handleDateSelect = useCallback((startDate: string | null, endDate: string | null) => {
    onUpdateFilter({ createdAfter: startDate, createdBefore: endDate });
  }, [onUpdateFilter]);

  const handleAssigneeChange = useCallback((assignees: string[]) => {
    onUpdateFilter({ assignee: assignees });
  }, [onUpdateFilter]);

  const handleResponderChange = useCallback((responders: string[]) => {
    onUpdateFilter({ repliedBy: responders });
  }, [onUpdateFilter]);

  const handleCustomerChange = useCallback((customers: string[]) => {
    onUpdateFilter({ customer: customers });
  }, [onUpdateFilter]);

  const handleVipChange = useCallback((isVip: boolean | undefined) => {
    onUpdateFilter({ isVip });
  }, [onUpdateFilter]);

  const handleReactionChange = useCallback((reactionType: "thumbs-up" | "thumbs-down" | null) => {
    onUpdateFilter({ reactionType });
  }, [onUpdateFilter]);

  const handleEventChange = useCallback((events: ("request_human_support" | "resolved_by_ai")[]) => {
    onUpdateFilter({ events });
  }, [onUpdateFilter]);

  const handlePromptChange = useCallback((isPrompt: boolean | undefined) => {
    onUpdateFilter({ isPrompt });
  }, [onUpdateFilter]);

  return (
    <div className="flex flex-wrap items-center justify-center gap-1 md:gap-2">
      <DateFilter
        startDate={filterValues.createdAfter}
        endDate={filterValues.createdBefore}
        onSelect={handleDateSelect}
      />
      <AssigneeFilter
        selectedAssignees={filterValues.assignee}
        onChange={handleAssigneeChange}
      />
      <ResponderFilter
        selectedResponders={filterValues.repliedBy}
        onChange={handleResponderChange}
      />
      <CustomerFilter
        selectedCustomers={filterValues.customer}
        onChange={handleCustomerChange}
      />
      <VipFilter 
        isVip={filterValues.isVip} 
        onChange={handleVipChange} 
      />
      <ReactionFilter
        reactionType={filterValues.reactionType ?? null}
        onChange={handleReactionChange}
      />
      <EventFilter 
        selectedEvents={filterValues.events} 
        onChange={handleEventChange} 
      />
      <PromptFilter 
        isPrompt={filterValues.isPrompt} 
        onChange={handlePromptChange} 
      />
      {activeFilterCount > 0 && (
        <Button data-testid="clear-filters-button" variant="ghost" onClick={onClearFilters}>
          Clear filters
        </Button>
      )}
    </div>
  );
});
