import { capitalize } from "lodash-es";
import { ArrowDownUp, Filter, Search } from "lucide-react";
import { useQueryState } from "nuqs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useAlternateHotkeyInEditor } from "@/app/(dashboard)/[category]/conversation/messageActions";
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

  const { data: openCount } = api.mailbox.openCount.useQuery();

  const status = openCount
    ? [
        { status: "open", count: openCount[input.category] },
        { status: "closed", count: 0 },
        { status: "spam", count: 0 },
      ]
    : [];

  const debouncedSetSearch = useDebouncedCallback((val: string) => {
    setSearchParams({ search: val || null });
    searchInputRef.current?.focus();
  }, 300);

  useEffect(() => {
    debouncedSetSearch(search);
  }, [search]);

  useHotkeys("mod+k", (e) => {
    e.preventDefault();
    searchInputRef.current?.focus();
  });

  useAlternateHotkeyInEditor("f", "mod+shift+f", () => {
    setShowFilters(!showFilters);
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
    const statuses = status.flatMap((s) => ({
      value: s.status as StatusOption,
      label: s.count ? `${s.count} ${s.status}` : capitalize(s.status),
      selected: searchParams.status ? searchParams.status == s.status : s.status === "open",
    }));

    if (searchParams.status) {
      if (!statuses.some((s) => s.value === searchParams.status)) {
        statuses.push({
          value: searchParams.status as StatusOption,
          label: capitalize(searchParams.status),
          selected: true,
        });
      }
    }

    return statuses;
  }, [status, searchParams]);

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
    <div className="flex items-center justify-between gap-2 md:gap-6 py-1">
      <div className="flex items-center gap-4">
        {statusOptions.length > 1 ? (
          <Select
            value={statusOptions.find(({ selected }) => selected)?.value || ""}
            onValueChange={handleStatusFilterChange}
          >
            <SelectTrigger className="w-auto text-foreground [&>svg]:text-foreground text-sm">
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
        ) : statusOptions[0] ? (
          <div className="text-sm text-foreground">{statusOptions[0].label}</div>
        ) : null}
        {conversationCount > 0 && (
          <button
            onClick={() => toggleAllConversations()}
            className="hidden md:block text-sm text-muted-foreground hover:text-foreground cursor-pointer min-w-[80px] text-left"
          >
            {allConversationsSelected ? "Select none" : "Select all"}
          </button>
        )}
      </div>
      <div className="flex-1 max-w-[400px] flex items-center gap-2">
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
          aria-label="Filter Toggle"
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
  );
};
