import { capitalize } from "lodash-es";
import { ArrowDownUp, Filter, Search } from "lucide-react";
import { useQueryState } from "nuqs";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDebouncedCallback } from "@/components/useDebouncedCallback";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { useConversationsListInput } from "../shared/queries";

type StatusOption = "open" | "closed" | "spam";
type SortOption = "oldest" | "newest" | "highest_value";

interface ConversationSearchBarProps {
  toggleAllConversations: () => void;
  allConversationsSelected: boolean;
  activeFilterCount: number;
  defaultSort: string | undefined;
  showFilters: boolean;
  setShowFilters: (showFilters: boolean) => void;
  conversationCount: number;
}

export const ConversationSearchBar = React.memo<ConversationSearchBarProps>(({
  toggleAllConversations,
  allConversationsSelected,
  activeFilterCount,
  defaultSort,
  showFilters,
  setShowFilters,
  conversationCount,
}) => {
  const { input, searchParams, setSearchParams } = useConversationsListInput();
  const [, setId] = useQueryState("id");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState(searchParams.search || "");

  const { data: openCount } = api.mailbox.openCount.useQuery();

  const status = useMemo(() => {
    return openCount
      ? [
          { status: "open" as const, count: openCount[input.category] },
          { status: "closed" as const, count: 0 },
          { status: "spam" as const, count: 0 },
        ]
      : [];
  }, [openCount, input.category]);

  const debouncedSetSearch = useDebouncedCallback((val: string) => {
    setSearchParams({ search: val || null });
    searchInputRef.current?.focus();
  }, 300);

  useEffect(() => {
    debouncedSetSearch(search);
  }, [search, debouncedSetSearch]);

  const focusSearchInput = useCallback(() => {
    searchInputRef.current?.focus();
  }, []);

  useHotkeys("mod+k", focusSearchInput);

  const handleStatusFilterChange = useCallback(
    (status: StatusOption) => {
      setId(null);

      if (status === "open") {
        setSearchParams({ status: null });
      } else {
        setSearchParams({ status });
      }
    },
    [setId, setSearchParams],
  );

  const handleSortChange = useCallback(
    (sort: SortOption) => {
      setSearchParams({ sort });
      setId(null);
    },
    [setId, setSearchParams],
  );

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  }, []);

  const handleToggleFilters = useCallback(() => {
    setShowFilters(!showFilters);
  }, [showFilters, setShowFilters]);

  const statusOptions = useMemo(() => {
    const statuses = status.map((s) => ({
      value: s.status,
      label: s.count ? `${s.count} ${s.status}` : capitalize(s.status),
      selected: searchParams.status ? searchParams.status === s.status : s.status === "open",
    }));

    // Add current status if it's not in the default list
    if (searchParams.status && !statuses.some((s) => s.value === searchParams.status)) {
      statuses.push({
        value: searchParams.status as StatusOption,
        label: capitalize(searchParams.status),
        selected: true,
      });
    }

    return statuses;
  }, [status, searchParams.status]);

  const sortOptions = useMemo(() => {
    const options: Array<{
      value: SortOption;
      label: string;
      selected: boolean;
    }> = [
      {
        value: "oldest",
        label: "Oldest",
        selected: searchParams.sort ? searchParams.sort === "oldest" : defaultSort === "oldest",
      },
      {
        value: "newest",
        label: "Newest",
        selected: searchParams.sort === "newest",
      },
    ];

    // Add highest_value option if it's the default sort
    if (defaultSort === "highest_value") {
      options.unshift({
        value: "highest_value",
        label: "Highest Value",
        selected: searchParams.sort ? searchParams.sort === "highest_value" : true,
      });
    }

    return options;
  }, [defaultSort, searchParams.sort]);

  const selectedStatusOption = useMemo(() => 
    statusOptions.find(({ selected }) => selected),
    [statusOptions]
  );

  const selectedSortOption = useMemo(() => 
    sortOptions.find(({ selected }) => selected),
    [sortOptions]
  );

  const selectAllText = useMemo(() => 
    allConversationsSelected ? "Select none" : "Select all",
    [allConversationsSelected]
  );

  const statusIndicatorClass = useMemo(() => {
    const statusValue = selectedStatusOption?.value;
    return cn(
      "w-2 h-2 rounded-full",
      statusValue === "open"
        ? "bg-success"
        : statusValue === "closed"
          ? "bg-muted-foreground"
          : statusValue === "spam"
            ? "bg-destructive"
            : "bg-muted",
    );
  }, [selectedStatusOption?.value]);

  const filterButtonClass = useMemo(() => 
    cn("h-8 w-auto px-2", showFilters && "bg-bright text-bright-foreground hover:bg-bright/90"),
    [showFilters]
  );

  return (
    <div className="flex items-center justify-between gap-2 md:gap-6 py-1">
      <div className="flex items-center gap-4">
        {statusOptions.length > 1 ? (
          <Select
            value={selectedStatusOption?.value || ""}
            onValueChange={handleStatusFilterChange}
          >
            <SelectTrigger className="w-auto text-foreground [&>svg]:text-foreground text-sm">
              <SelectValue placeholder="Select status">
                {selectedStatusOption && (
                  <span className="flex items-center gap-2">
                    <span className={statusIndicatorClass} />
                    {selectedStatusOption.label}
                  </span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : statusOptions[0] ? (
          <div className="text-sm text-foreground">{statusOptions[0].label}</div>
        ) : null}
        
        <div className="hidden md:block min-w-[80px]">
          {conversationCount > 0 && (
            <button
              onClick={toggleAllConversations}
              className="text-sm text-muted-foreground hover:text-foreground cursor-pointer text-left"
              type="button"
            >
              {selectAllText}
            </button>
          )}
        </div>
      </div>
      
      <div className="flex-1 max-w-[400px] flex items-center gap-2">
        <Input
          ref={searchInputRef}
          placeholder="Search conversations"
          value={search}
          onChange={handleSearchChange}
          className="flex-1 h-10 rounded-full text-sm"
          iconsPrefix={<Search className="ml-1 h-4 w-4 text-foreground" />}
          autoFocus
        />
        <Button
          data-testid="filter-toggle"
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleToggleFilters}
          className={filterButtonClass}
        >
          <Filter className="h-4 w-4" />
          {activeFilterCount > 0 && <span className="text-xs ml-1">({activeFilterCount})</span>}
        </Button>
      </div>
      
      <Select 
        value={selectedSortOption?.value || ""} 
        onValueChange={handleSortChange}
      >
        <SelectTrigger
          variant="bare"
          className="w-auto text-foreground [&>svg]:text-foreground text-sm md:min-w-[110px] justify-center"
          hideArrow="mobileOnly"
        >
          <SelectValue
            placeholder={
              <>
                <ArrowDownUp className="h-4 w-4 md:hidden" />
                <span className="hidden md:block">Sort by</span>
              </>
            }
          >
            <ArrowDownUp className="h-4 w-4 md:hidden" />
            <span className="hidden md:block">{selectedSortOption?.label}</span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {sortOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
});

ConversationSearchBar.displayName = 'ConversationSearchBar';
