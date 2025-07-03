import { capitalize } from "lodash-es";
import { ArrowDownUp, Filter, Loader2, Search } from "lucide-react";
import { useQueryState } from "nuqs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const statuses = [
  {
    value: "open",
    label: "Open",
  },
  {
    value: "closed",
    label: "Closed",
  },
  {
    value: "spam",
    label: "Spam",
  },
] satisfies { value: StatusOption; label: string }[];

export const ConversationSearchBar = ({
  toggleAllConversations,
  allConversationsSelected,
  activeFilterCount,
  defaultSort,
  showFilters,
  setShowFilters,
  conversationCount,
}: ConversationSearchBarProps) => {
  const { input, searchParams, setSearchParams } = useConversationsListInput();
  const [, setId] = useQueryState("id");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState(searchParams.search || "");

  const { data: countData, isLoading: isCountLoading } = api.mailbox.conversations.count.useQuery(input);

  const debouncedSetSearch = useDebouncedCallback((val: string) => {
    setSearchParams({ search: val || null });
    searchInputRef.current?.focus();
  }, 300);

  useEffect(() => {
    debouncedSetSearch(search);
  }, [search]);

  useHotkeys("mod+k", () => {
    searchInputRef.current?.focus();
  });

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

  const statusOptions = useMemo(() => {
    const arr = statuses.flatMap((s) => ({
      ...s,
      selected: searchParams.status ? searchParams.status == s.value : s.value === "open",
    }));

    if (searchParams.status) {
      if (!arr.some((s) => s.value === searchParams.status)) {
        arr.push({
          value: searchParams.status,
          label: capitalize(searchParams.status),
          selected: true,
        });
      }
    }

    return arr;
  }, [searchParams]);

  const sortOptions = useMemo(
    () => [
      ...(defaultSort === "highest_value"
        ? [
            {
              value: `highest_value` as const,
              label: `Highest Value`,
              selected: searchParams.sort ? searchParams.sort == "highest_value" : true,
            },
          ]
        : []),
      {
        value: `oldest` as const,
        label: `Oldest`,
        selected: searchParams.sort ? searchParams.sort === "oldest" : defaultSort === "oldest",
      },
      {
        value: `newest` as const,
        label: `Newest`,
        selected: searchParams.sort == "newest",
      },
    ],
    [defaultSort, searchParams],
  );

  return (
    <div className="flex items-center justify-between gap-2 py-1 md:grid md:grid-cols-3 md:gap-6">
      <div className="flex items-center gap-4">
        <Select
          value={statusOptions.find(({ selected }) => selected)?.value || ""}
          onValueChange={handleStatusFilterChange}
        >
          <SelectTrigger className="w-auto min-w-[120px] text-foreground [&>svg]:text-foreground text-sm">
            <SelectValue placeholder="Select status">
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    "w-2 h-2 rounded-full",
                    statusOptions.find(({ selected }) => selected)?.value === "open"
                      ? "bg-success"
                      : statusOptions.find(({ selected }) => selected)?.value === "closed"
                        ? "bg-muted-foreground"
                        : statusOptions.find(({ selected }) => selected)?.value === "spam"
                          ? "bg-destructive"
                          : "bg-muted",
                  )}
                />
                {countData ? `${countData.total} ` : isCountLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                {statusOptions.find(({ selected }) => selected)?.label}
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value} className="">
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button
          onClick={toggleAllConversations}
          className="hidden md:block text-sm text-muted-foreground hover:text-foreground cursor-pointer"
        >
          {allConversationsSelected ? "Select none" : "Select all"}
        </button>
      </div>
      <div className="flex-1 max-w-[400px] flex items-center gap-2 md:justify-center">
        <Input
          ref={searchInputRef}
          placeholder="Search conversations"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 h-10 rounded-full text-sm"
          iconsPrefix={<Search className="ml-1 h-4 w-4 text-foreground" />}
          autoFocus
        />
        <Button
          data-testid="filter-toggle"
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className={cn("h-8 w-auto px-2", showFilters && "bg-bright text-bright-foreground hover:bg-bright/90")}
        >
          <Filter className="h-4 w-4" />
          {activeFilterCount > 0 && <span className="text-xs ml-1">({activeFilterCount})</span>}
        </Button>
      </div>
      <div className="flex justify-end">
        <Select value={sortOptions.find(({ selected }) => selected)?.value || ""} onValueChange={handleSortChange}>
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
              <span className="hidden md:block">{sortOptions.find(({ selected }) => selected)?.label}</span>
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
    </div>
  );
};
