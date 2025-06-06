import { capitalize } from "lodash-es";
import { Bot, DollarSign, Search, Send, User, Check, Star, Filter } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { parseAsArrayOf, parseAsBoolean, parseAsString, parseAsStringEnum, useQueryState, useQueryStates } from "nuqs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import scrollIntoView from "scroll-into-view-if-needed";
import { ConversationListItem } from "@/app/types/global";
import HumanizedTime from "@/components/humanizedTime";
import LoadingSpinner from "@/components/loadingSpinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/components/utils/currency";
import { conversationsListChannelId } from "@/lib/realtime/channels";
import { useRealtimeEvent } from "@/lib/realtime/hooks";
import { generateSlug } from "@/lib/shared/slug";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { useConversationsListInput } from "../shared/queries";
import { useConversationListContext } from "./conversationListContext";
import NewConversationModalContent from "./newConversationModal";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { useDebouncedCallback } from "@/components/useDebouncedCallback";
import { highlightKeywords } from "../../search/highlightKeywords";
import { AssigneeFilter } from "../../search/assigneeFilter";
import { CustomerFilter } from "../../search/customerFilter";
import { DateFilter } from "../../search/dateFilter";
import { EventFilter } from "../../search/eventFilter";
import { PromptFilter } from "../../search/promptFilter";
import { ReactionFilter } from "../../search/reactionFilter";
import { ResponderFilter } from "../../search/responderFilter";
import { VipFilter } from "../../search/vipFilter";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/hooks/use-toast";

type ListItem = ConversationListItem & { isNew?: boolean };

type ListItemProps = {
  conversation: ListItem;
  isActive: boolean;
  onSelectConversation: (slug: string) => void;
  variant: "desktop" | "mobile";
  isSelected: boolean;
  onToggleSelect: () => void;
};

type StatusOption = "open" | "closed" | "spam";
type SortOption = "oldest" | "newest" | "highest_value";

const SearchBar = ({
  statusOptions,
  sortOptions,
  onStatusChange,
  onSortChange,
  variant,
}: {
  statusOptions: { value: StatusOption; label: string; selected: boolean }[];
  sortOptions: { value: SortOption; label: string; selected: boolean }[];
  onStatusChange: (status: StatusOption) => void;
  onSortChange: (sort: SortOption) => void;
  variant: "desktop" | "mobile";
}) => {
  const params = useParams<{ mailbox_slug: string }>();

  return (
    <div className={cn("border-b", variant === "desktop" ? "border-border" : "border-border")}>
      <div className="flex items-center justify-between gap-2 pb-1">
        <div className="flex items-center gap-2">
          {statusOptions.length > 1 ? (
            <Select value={statusOptions.find(({ selected }) => selected)?.value || ""} onValueChange={onStatusChange}>
              <SelectTrigger
                variant="bare"
                className="text-foreground [&>svg]:text-foreground"
              >
                <SelectValue placeholder="Select status" />
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
            <div className="text-sm text-foreground">
              {statusOptions[0].label}
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Select value={sortOptions.find(({ selected }) => selected)?.value || ""} onValueChange={onSortChange}>
            <SelectTrigger
              variant="bare"
              className="text-foreground [&>svg]:text-foreground"
            >
              <SelectValue placeholder="Sort by" />
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
    </div>
  );
};

export const List = ({ variant }: { variant: "desktop" | "mobile" }) => {
  const [conversationSlug] = useQueryState("id");
  const { searchParams, setSearchParams, input } = useConversationsListInput();
  const { conversationListData, navigateToConversation, isPending, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useConversationListContext();
  const category =
    useParams<{ category: "conversations" | "mine" | "assigned" | "unassigned" | undefined }>().category ||
    "conversations";

  const [search, setSearch] = useState(searchParams.search || "");
  const [showFilters, setShowFilters] = useState(false);
  const [filterValues, setFilterValues] = useState({
    assignee: searchParams.assignee ?? [],
    createdAfter: searchParams.createdAfter ?? null,
    createdBefore: searchParams.createdBefore ?? null,
    repliedBy: searchParams.repliedBy ?? [],
    customer: searchParams.customer ?? [],
    isVip: searchParams.isVip ?? undefined,
    isPrompt: searchParams.isPrompt ?? undefined,
    reactionType: searchParams.reactionType ?? undefined,
    events: searchParams.events ?? [],
  });
  const [selectedConversations, setSelectedConversations] = useState<number[]>([]);
  const [allConversationsSelected, setAllConversationsSelected] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const utils = api.useUtils();
  const { mutate: bulkUpdate } = api.mailbox.conversations.bulkUpdate.useMutation({
    onError: () => {
      toast({
        variant: "destructive",
        title: "Failed to update conversations",
      });
    },
  });

  const debouncedSetSearch = useDebouncedCallback((val: string) => {
    setSearchParams({ search: val || null });
    searchInputRef.current?.focus();
  }, 300);

  const debouncedSetFilters = useDebouncedCallback((newFilters: Partial<typeof filterValues>) => {
    setSearchParams((prev) => ({ ...prev, ...newFilters }));
  }, 300);

  useEffect(() => {
    debouncedSetSearch(search);
  }, [search]);

  useEffect(() => {
    setFilterValues({
      assignee: searchParams.assignee ?? [],
      createdAfter: searchParams.createdAfter ?? null,
      createdBefore: searchParams.createdBefore ?? null,
      repliedBy: searchParams.repliedBy ?? [],
      customer: searchParams.customer ?? [],
      isVip: searchParams.isVip ?? undefined,
      isPrompt: searchParams.isPrompt ?? undefined,
      reactionType: searchParams.reactionType ?? undefined,
      events: searchParams.events ?? [],
    });
  }, [searchParams]);

  const updateFilter = (updates: Partial<typeof filterValues>) => {
    setFilterValues((prev) => ({ ...prev, ...updates }));
    debouncedSetFilters(updates);
  };

  const conversations = conversationListData?.conversations ?? [];
  const { data: openCount } = api.mailbox.openCount.useQuery({ mailboxSlug: input.mailboxSlug });

  const status = openCount
    ? [
        { status: "open", count: openCount[category] },
        { status: "closed", count: 0 },
        { status: "spam", count: 0 },
      ]
    : [];
  const defaultSort = conversationListData?.defaultSort;

  const { handleStatusFilterChange, handleSortChange } = useFilterHandlers();

  const loadMoreRef = useRef<HTMLDivElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentRef = loadMoreRef.current;
    if (!currentRef || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "500px", root: resultsContainerRef.current },
    );

    observer.observe(currentRef);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const statusOptions = useMemo(() => {
    const statuses = status.flatMap((s) => ({
      value: s.status as StatusOption,
      label: capitalize(s.status),
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

  useRealtimeEvent(conversationsListChannelId(input.mailboxSlug), "conversation.new", (message) => {
    const newConversation = message.data as ConversationListItem;
    if (newConversation.status !== (searchParams.status ?? "open")) return;
    const sort = searchParams.sort ?? defaultSort;
    if (!sort) return;

    utils.mailbox.conversations.list.setInfiniteData(input, (data) => {
      if (!data) return undefined;
      const firstPage = data.pages[0];
      if (!firstPage) return data;

      switch (input.category) {
        case "conversations":
          break;
        case "assigned":
          if (!newConversation.assignedToId) return data;
          break;
        case "unassigned":
          if (newConversation.assignedToId) return data;
          break;
        case "mine":
          if (newConversation.assignedToId !== firstPage.assignedToIds?.[0]) return data;
          break;
      }

      const existingConversationIndex = firstPage.conversations.findIndex(
        (conversation) => conversation.slug === newConversation.slug,
      );

      const newConversations: ListItem[] = [...firstPage.conversations];
      if (existingConversationIndex >= 0) newConversations.splice(existingConversationIndex, 1);

      switch (sort) {
        case "newest":
          newConversations.unshift({ ...newConversation, isNew: true });
          break;
        case "oldest":
          // Only add to first page if no other pages exist
          if (data.pages.length === 1) {
            newConversations.push({ ...newConversation, isNew: true });
          }
          break;
        case "highest_value":
          const indexToInsert =
            existingConversationIndex >= 0
              ? existingConversationIndex
              : newConversations.findIndex(
                  (c) => (c.platformCustomer?.value ?? 0) < (newConversation.platformCustomer?.value ?? 0),
                );
          if (indexToInsert < 0) return data;
          newConversations.splice(indexToInsert, 0, { ...newConversation, isNew: true });
          break;
      }

      return {
        ...data,
        pages: [{ ...firstPage, conversations: newConversations }, ...data.pages.slice(1)],
      };
    });
  });

  const searchBar = (
    <SearchBar
      statusOptions={statusOptions}
      sortOptions={sortOptions}
      onStatusChange={handleStatusFilterChange}
      onSortChange={handleSortChange}
      variant={variant}
    />
  );

  const toggleAllConversations = () => {
    if (allConversationsSelected || selectedConversations.length > 0) {
      setAllConversationsSelected(false);
      setSelectedConversations([]);
    } else {
      setAllConversationsSelected(true);
      setSelectedConversations([]);
    }
  };

  const toggleConversation = (id: number) => {
    if (allConversationsSelected) {
      setAllConversationsSelected(false);
      setSelectedConversations(conversations.flatMap((c) => (c.id === id ? [] : [c.id])));
    } else {
      setSelectedConversations(
        selectedConversations.includes(id)
          ? selectedConversations.filter((selectedId) => selectedId !== id)
          : [...selectedConversations, id],
      );
    }
  };

  const handleBulkUpdate = async (status: "closed" | "spam") => {
    setIsBulkUpdating(true);
    try {
      const conversationFilter = allConversationsSelected
        ? conversations.map((c) => c.id)
        : selectedConversations;
      bulkUpdate({ 
        conversationFilter, 
        status, 
        mailboxSlug: input.mailboxSlug 
      }, {
        onSuccess: ({ updatedImmediately }) => {
          setAllConversationsSelected(false);
          setSelectedConversations([]);
          void utils.mailbox.conversations.list.invalidate();
          void utils.mailbox.conversations.count.invalidate();
          if (!updatedImmediately) {
            toast({ title: "Starting update, refresh to see status." });
          }
        }
      });
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterValues.assignee.length > 0) count++;
    if (filterValues.createdAfter || filterValues.createdBefore) count++;
    if (filterValues.repliedBy.length > 0) count++;
    if (filterValues.customer.length > 0) count++;
    if (filterValues.isVip !== undefined) count++;
    if (filterValues.isPrompt !== undefined) count++;
    if (filterValues.reactionType !== undefined) count++;
    if (filterValues.events.length > 0) count++;
    return count;
  }, [filterValues]);

  return (
    <div className="flex flex-col w-full h-full">
      <div className="px-3 md:px-6 py-2 md:py-4 shrink-0 border-b border-border">
        <div className="flex flex-col gap-2 md:gap-4">
          <div className="flex items-center gap-1 md:gap-2">
            <div className="flex items-center gap-1 md:gap-2 shrink-0">
              {statusOptions.length > 1 ? (
                <Select value={statusOptions.find(({ selected }) => selected)?.value || ""} onValueChange={handleStatusFilterChange}>
                  <SelectTrigger
                    variant="bare"
                    className="text-foreground [&>svg]:text-foreground text-sm md:text-base"
                  >
                    <SelectValue placeholder="Select status" />
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
                <div className="text-xs md:text-sm text-foreground">
                  {statusOptions[0].label}
                </div>
              ) : null}
            </div>
            <div className="relative w-full flex justify-center">
              <div className="relative w-full max-w-2xl">
                <div className="flex w-full gap-1">
                  <Input
                    ref={searchInputRef}
                    placeholder="Search conversations"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="flex-1 rounded-md h-8 md:h-10 text-sm md:text-base"
                    iconsPrefix={<Search className="h-4 w-4 md:h-5 md:w-5 text-foreground" />}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowFilters(!showFilters)}
                    className={cn(
                      "flex items-center justify-center px-2 md:px-3 rounded-md border h-8 md:h-10 transition",
                      showFilters
                        ? "bg-bright text-bright-foreground"
                        : "bg-background text-foreground hover:bg-amber-50 dark:hover:bg-white/10"
                    )}
                    aria-label="Toggle filters"
                  >
                    <Filter className="h-4 w-4 md:h-5 md:w-5" />
                    {activeFilterCount > 0 && (
                      <span className="text-[10px] md:text-xs ml-0.5 md:ml-1">({activeFilterCount})</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 md:gap-2 shrink-0">
              <Select value={sortOptions.find(({ selected }) => selected)?.value || ""} onValueChange={handleSortChange}>
                <SelectTrigger
                  variant="bare"
                  className="text-foreground [&>svg]:text-foreground text-sm md:text-base"
                >
                  <SelectValue placeholder="Sort by" />
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
          {showFilters && (
            <div className="flex flex-wrap gap-1 md:gap-2">
              <DateFilter
                initialStartDate={filterValues.createdAfter}
                initialEndDate={filterValues.createdBefore}
                onSelect={(startDate, endDate) => {
                  updateFilter({ createdAfter: startDate, createdBefore: endDate });
                }}
              />
              <AssigneeFilter
                selectedAssignees={filterValues.assignee}
                onChange={(assignees) => updateFilter({ assignee: assignees })}
              />
              <ResponderFilter
                selectedResponders={filterValues.repliedBy}
                onChange={(responders) => updateFilter({ repliedBy: responders })}
              />
              <CustomerFilter
                selectedCustomers={filterValues.customer}
                onChange={(customers) => updateFilter({ customer: customers })}
              />
              <VipFilter
                isVip={filterValues.isVip}
                onChange={(isVip) => updateFilter({ isVip })}
              />
              <ReactionFilter
                reactionType={filterValues.reactionType ?? null}
                onChange={(reactionType) => updateFilter({ reactionType: reactionType ?? undefined })}
              />
              <EventFilter
                selectedEvents={filterValues.events}
                onChange={(events) => updateFilter({ events })}
              />
              <PromptFilter
                isPrompt={filterValues.isPrompt}
                onChange={(isPrompt) => updateFilter({ isPrompt })}
              />
            </div>
          )}
        </div>
      </div>
      <div ref={resultsContainerRef} className="flex-1 overflow-y-auto">
        {isPending ? (
          <div className="flex h-full items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <>
            {conversations.length > 0 && (
              <div className="flex items-center gap-4 mb-4 px-3 md:px-6 pt-4">
                <div className="w-5 flex items-center">
                  <Checkbox
                    checked={allConversationsSelected || selectedConversations.length > 0}
                    onCheckedChange={toggleAllConversations}
                    id="select-all"
                  />
                </div>
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <label htmlFor="select-all" className="text-sm text-muted-foreground flex items-center">
                        {allConversationsSelected
                          ? "All conversations selected"
                          : selectedConversations.length > 0
                            ? `${selectedConversations.length} selected`
                            : `${conversations.length} conversations`}
                      </label>
                    </TooltipTrigger>
                  </Tooltip>
                </TooltipProvider>
                {(allConversationsSelected || selectedConversations.length > 0) && (
                  <div className="flex items-center">
                    <Button
                      variant="link"
                      className="h-auto"
                      onClick={() => handleBulkUpdate("closed")}
                      disabled={isBulkUpdating}
                    >
                      Close
                    </Button>
                    <Button
                      variant="link"
                      className="h-auto"
                      onClick={() => handleBulkUpdate("spam")}
                      disabled={isBulkUpdating}
                    >
                      Mark as spam
                    </Button>
                  </div>
                )}
              </div>
            )}
            {conversations.map((conversation) => (
              <ListItem
                key={conversation.slug}
                conversation={conversation}
                isActive={conversationSlug === conversation.slug}
                onSelectConversation={navigateToConversation}
                variant={variant}
                isSelected={allConversationsSelected || selectedConversations.includes(conversation.id)}
                onToggleSelect={() => toggleConversation(conversation.id)}
              />
            ))}
            <div ref={loadMoreRef} />
            {isFetchingNextPage && <div className="flex justify-center py-4"><LoadingSpinner size="md" /></div>}
          </>
        )}
      </div>
    </div>
  );
};

function useFilterHandlers() {
  const { searchParams, setSearchParams } = useConversationsListInput();
  const [, setId] = useQueryState("id");

  const handleStatusFilterChange = useCallback(
    (status: StatusOption) => {
      setId(null);

      if (status === "open") {
        setSearchParams({ status: null, sort: null });
      } else {
        setSearchParams({ status, sort: "newest" });
      }
    },
    [searchParams, setId, setSearchParams],
  );

  const handleSortChange = useCallback(
    (sort: SortOption) => {
      setSearchParams({ sort });
      setId(null);
    },
    [setId, setSearchParams],
  );

  return { handleStatusFilterChange, handleSortChange };
}

const NewConversationModal = () => {
  const params = useParams<{ mailbox_slug: string }>();
  const mailboxSlug = params.mailbox_slug;

  const [newConversationModalOpen, setNewConversationModalOpen] = useState(false);
  const [newConversationSlug, setNewConversationSlug] = useState(generateSlug());
  useEffect(() => {
    if (newConversationModalOpen) setNewConversationSlug(generateSlug());
  }, [newConversationModalOpen]);

  const closeModal = () => setNewConversationModalOpen(false);

  return (
    <Dialog open={newConversationModalOpen} onOpenChange={setNewConversationModalOpen}>
      <DialogTrigger asChild>
        <Button
          variant="default"
          iconOnly
          className="rounded-full text-primary-foreground dark:bg-bright dark:text-bright-foreground bg-bright hover:bg-bright/90 hover:text-background"
        >
          <Send className="text-primary dark:text-primary-foreground h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New message</DialogTitle>
        </DialogHeader>
        <NewConversationModalContent
          mailboxSlug={mailboxSlug}
          conversationSlug={newConversationSlug}
          onSubmit={closeModal}
        />
      </DialogContent>
    </Dialog>
  );
};

const ListItem = ({ conversation, isActive, onSelectConversation, variant, isSelected, onToggleSelect }: ListItemProps) => {
  const listItemRef = useRef<HTMLAnchorElement>(null);
  const { mailboxSlug } = useConversationListContext();
  const { searchParams } = useConversationsListInput();
  const searchTerms = searchParams.search ? searchParams.search.split(/\s+/).filter(Boolean) : [];

  useEffect(() => {
    if (isActive && listItemRef.current) {
      scrollIntoView(listItemRef.current, {
        block: "nearest",
        scrollMode: "if-needed",
        behavior: "smooth",
      });
    }
  }, [conversation, isActive]);

  let highlightedSubject = conversation.subject;
  let highlightedBody = conversation.matchedMessageText;
  if (searchTerms.length > 0) {
    highlightedSubject = highlightKeywords(conversation.subject, searchTerms);
    if (conversation.matchedMessageText) {
      highlightedBody = highlightKeywords(conversation.matchedMessageText, searchTerms);
    }
  }

  return (
    <div className={cn("px-2 py-0.5", variant === "mobile" && "px-1")}>
      <div
        className={cn(
          "flex w-full cursor-pointer flex-col gap-2 rounded-lg transition-colors",
          variant === "mobile" ? "py-3" : "py-4",
          isActive
            ? "bg-amber-50 dark:bg-white/5 border-l-4 border-l-amber-400"
            : "hover:bg-gray-50 dark:hover:bg-white/[0.02]",
        )}
      >
        <div className={cn("flex items-start gap-4", variant === "mobile" ? "px-2" : "px-4")}>
          <div className="w-5 flex items-center">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onToggleSelect}
              onClick={(e) => e.stopPropagation()}
              className="mt-1"
            />
          </div>
          <a
            ref={listItemRef}
            className="flex-1 min-w-0"
            href={`/mailboxes/${mailboxSlug}/conversations?id=${conversation.slug}`}
            onClick={(e) => {
              if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                e.preventDefault();
                onSelectConversation(conversation.slug);
              }
            }}
            style={{ overflowAnchor: "none" }}
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-4">
                <p className={cn("text-muted-foreground truncate", variant === "mobile" ? "text-xs" : "text-sm")}>
                  {conversation.emailFrom ?? "Anonymous"}
                </p>
                <div className="flex items-center gap-3 shrink-0">
                  {(conversation.assignedToId || conversation.assignedToAI) && (
                    <AssignedToLabel
                      className={cn("flex items-center gap-1 text-gray-500 dark:text-gray-400", variant === "mobile" ? "text-[10px]" : "text-xs")}
                      assignedToId={conversation.assignedToId}
                      assignedToAI={conversation.assignedToAI}
                    />
                  )}
                  <div className={cn("text-gray-500 dark:text-gray-400", variant === "mobile" ? "text-[10px]" : "text-xs")}>
                    {conversation.status === "closed" ? (
                      <HumanizedTime time={conversation.closedAt ?? conversation.updatedAt} titlePrefix="Closed on" />
                    ) : (
                      <HumanizedTime
                        time={conversation.lastUserEmailCreatedAt ?? conversation.updatedAt}
                        titlePrefix="Last email received on"
                      />
                    )}
                  </div>
                  {conversation.isNew && <div className="h-[0.5rem] w-[0.5rem] rounded-full bg-blue-500" />}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <p className={cn("font-medium text-foreground", variant === "mobile" ? "text-sm" : "text-base")} 
                   dangerouslySetInnerHTML={{ __html: highlightedSubject }} />
                {searchTerms.length > 0 && highlightedBody && (
                  <p className={cn("text-muted-foreground line-clamp-2 whitespace-pre-wrap", variant === "mobile" ? "text-xs" : "text-sm")} 
                     dangerouslySetInnerHTML={{ __html: highlightedBody }} />
                )}
                <div className="flex items-center gap-2">
                  {conversation.status === "open" ? (
                    <Badge variant="success-light" className={cn("gap-1.5 dark:bg-success dark:text-success-foreground", variant === "mobile" && "text-xs")}>
                      <div className="w-1.5 h-1.5 rounded-full bg-success dark:bg-white" />
                      Open
                    </Badge>
                  ) : (
                    conversation.status === "closed" && (
                      <Badge variant="gray" className={cn("gap-1.5", variant === "mobile" && "text-xs")}>
                        <Check className="h-3 w-3" />
                        Closed
                      </Badge>
                    )
                  )}
                  {conversation.platformCustomer?.value &&
                    (conversation.platformCustomer.isVip ? (
                      <TooltipProvider delayDuration={0}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="bright" className={cn("gap-1", variant === "mobile" && "text-xs")}>
                              {formatCurrency(parseFloat(conversation.platformCustomer.value))}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent side="left">VIP</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <Badge variant="gray" className={cn("gap-1", variant === "mobile" && "text-xs")}>
                        {formatCurrency(parseFloat(conversation.platformCustomer.value))}
                      </Badge>
                    ))}
                </div>
              </div>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
};

export const AssignedToLabel = ({
  assignedToId,
  assignedToAI,
  className,
}: {
  assignedToId: string | null;
  assignedToAI?: boolean;
  className?: string;
}) => {
  const { data: members } = api.organization.getMembers.useQuery(undefined, {
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  if (assignedToAI) {
    return (
      <div className={className} title="Assigned to Helper agent">
        <Bot className="h-3 w-3" />
      </div>
    );
  }

  const displayName = members?.find((m) => m.id === assignedToId)?.displayName?.split(" ")[0];

  return displayName ? (
    <div className={className} title={`Assigned to ${displayName}`}>
      <User className="h-3 w-3" />
      {displayName}
    </div>
  ) : null;
};
