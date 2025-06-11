import { capitalize, escape } from "lodash-es";
import { Bot, Filter, Search, Send, User } from "lucide-react";
import { useParams } from "next/navigation";
import { useQueryState } from "nuqs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import scrollIntoView from "scroll-into-view-if-needed";
import { ConversationListItem } from "@/app/types/global";
import { toast } from "@/components/hooks/use-toast";
import HumanizedTime from "@/components/humanizedTime";
import LoadingSpinner from "@/components/loadingSpinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useDebouncedCallback } from "@/components/useDebouncedCallback";
import { formatCurrency } from "@/components/utils/currency";
import { conversationsListChannelId } from "@/lib/realtime/channels";
import { useRealtimeEvent } from "@/lib/realtime/hooks";
import { generateSlug } from "@/lib/shared/slug";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { useConversationsListInput } from "../shared/queries";
import { ConversationFilters, useConversationFilters } from "./conversationFilters";
import { useConversationListContext } from "./conversationListContext";
import { NoConversations } from "./emptyState";
import { highlightKeywords } from "./filters/highlightKeywords";
import NewConversationModalContent from "./newConversationModal";

type ListItem = ConversationListItem & { isNew?: boolean };

type ListItemProps = {
  conversation: ListItem;
  isActive: boolean;
  onSelectConversation: (slug: string) => void;
  isSelected: boolean;
  onToggleSelect: () => void;
};

type StatusOption = "open" | "closed" | "spam";
type SortOption = "oldest" | "newest" | "highest_value";

export const List = () => {
  const [conversationSlug] = useQueryState("id");
  const { searchParams, setSearchParams, input } = useConversationsListInput();
  const { conversationListData, navigateToConversation, isPending, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useConversationListContext();
  const category =
    useParams<{ category: "conversations" | "mine" | "assigned" | "unassigned" | undefined }>().category ||
    "conversations";

  const [search, setSearch] = useState(searchParams.search || "");
  const [showFilters, setShowFilters] = useState(false);
  const { filterValues, activeFilterCount, updateFilter } = useConversationFilters();
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

  useEffect(() => {
    debouncedSetSearch(search);
  }, [search]);

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

  const searchBar = (
    <div className="flex items-center justify-between gap-6 py-1">
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
                      statusOptions.find(({ selected }) => selected)?.value === "open" ? "bg-success" : "bg-muted",
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
        {statusOptions.length > 0 && (
          <button
            onClick={toggleAllConversations}
            className="hidden md:block text-sm text-muted-foreground hover:text-foreground cursor-pointer"
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
        <SelectTrigger variant="bare" className="w-auto text-foreground [&>svg]:text-foreground text-sm">
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
  );

  const handleBulkUpdate = (status: "closed" | "spam") => {
    setIsBulkUpdating(true);
    try {
      const conversationFilter = allConversationsSelected ? conversations.map((c) => c.id) : selectedConversations;
      bulkUpdate(
        {
          conversationFilter,
          status,
          mailboxSlug: input.mailboxSlug,
        },
        {
          onSuccess: ({ updatedImmediately }) => {
            setAllConversationsSelected(false);
            setSelectedConversations([]);
            void utils.mailbox.conversations.list.invalidate();
            void utils.mailbox.conversations.count.invalidate();
            if (!updatedImmediately) {
              toast({ title: "Starting update, refresh to see status." });
            }
          },
        },
      );
    } finally {
      setIsBulkUpdating(false);
    }
  };

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

  return (
    <div className="flex flex-col w-full h-full">
      <div className="px-3 md:px-6 py-2 md:py-4 shrink-0 border-b border-border">
        <div className="flex flex-col gap-2 md:gap-4">
          {searchBar}
          {(allConversationsSelected || selectedConversations.length > 0) && (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <label htmlFor="select-all" className="text-sm text-muted-foreground flex items-center">
                        {allConversationsSelected
                          ? "All conversations selected"
                          : `${selectedConversations.length} selected`}
                      </label>
                    </TooltipTrigger>
                  </Tooltip>
                </TooltipProvider>
                <div className="flex items-center gap-2">
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
              </div>
            </div>
          )}
          {showFilters && <ConversationFilters filterValues={filterValues} onUpdateFilter={updateFilter} />}
        </div>
      </div>
      {isPending ? (
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : conversations.length === 0 ? (
        <NoConversations />
      ) : (
        <div ref={resultsContainerRef} className="flex-1 overflow-y-auto">
          {conversations.map((conversation) => (
            <ListItem
              key={conversation.slug}
              conversation={conversation}
              isActive={conversationSlug === conversation.slug}
              onSelectConversation={navigateToConversation}
              isSelected={allConversationsSelected || selectedConversations.includes(conversation.id)}
              onToggleSelect={() => toggleConversation(conversation.id)}
            />
          ))}
          <div ref={loadMoreRef} />
          {isFetchingNextPage && (
            <div className="flex justify-center py-4">
              <LoadingSpinner size="md" />
            </div>
          )}
        </div>
      )}
      <NewConversationModal />
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
        setSearchParams({ status: null });
      } else {
        setSearchParams({ status });
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
          className="absolute bottom-6 right-6 rounded-full text-primary-foreground dark:bg-bright dark:text-bright-foreground bg-bright hover:bg-bright/90 hover:text-background"
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

const ListItem = ({ conversation, isActive, onSelectConversation, isSelected, onToggleSelect }: ListItemProps) => {
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

  let highlightedSubject = escape(conversation.subject);
  let highlightedBody = escape(conversation.matchedMessageText ?? conversation.recentMessageText ?? "");
  if (searchTerms.length > 0) {
    highlightedSubject = highlightKeywords(highlightedSubject, searchTerms);
    if (conversation.matchedMessageText) {
      highlightedBody = highlightKeywords(highlightedBody, searchTerms);
    }
  }

  return (
    <div className="px-1 md:px-2">
      <div
        className={cn(
          "flex w-full cursor-pointer flex-col  transition-colors border-b border-border py-3 md:py-4",
          isActive
            ? "bg-amber-50 dark:bg-white/5 border-l-4 border-l-amber-400"
            : "hover:bg-gray-50 dark:hover:bg-white/[0.02]",
        )}
      >
        <div className="flex items-start gap-4 px-2 md:px-4">
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
                <div className="flex items-center gap-2">
                  <p className="text-muted-foreground truncate text-xs md:text-sm">
                    {conversation.emailFrom ?? "Anonymous"}
                  </p>
                  {conversation.platformCustomer?.value &&
                    (conversation.platformCustomer.isVip ? (
                      <TooltipProvider delayDuration={0}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="bright" className="gap-1 text-xs">
                              {formatCurrency(parseFloat(conversation.platformCustomer.value))}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="text-xs">
                            VIP
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <Badge variant="gray" className="gap-1 text-xs">
                        {formatCurrency(parseFloat(conversation.platformCustomer.value))}
                      </Badge>
                    ))}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {(conversation.assignedToId || conversation.assignedToAI) && (
                    <AssignedToLabel
                      className="flex items-center gap-1 text-muted-foreground text-[10px] md:text-xs"
                      assignedToId={conversation.assignedToId}
                      assignedToAI={conversation.assignedToAI}
                    />
                  )}
                  <div className="text-muted-foreground text-[10px] md:text-xs">
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
                <p
                  className="font-medium text-foreground text-sm md:text-base"
                  dangerouslySetInnerHTML={{ __html: highlightedSubject }}
                />
                {highlightedBody && (
                  <p
                    className="text-muted-foreground truncate max-w-4xl text-xs md:text-sm"
                    dangerouslySetInnerHTML={{ __html: highlightedBody }}
                  />
                )}
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
