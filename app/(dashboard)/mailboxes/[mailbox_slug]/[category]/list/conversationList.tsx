import { capitalize } from "lodash-es";
import { ArrowRight, Bot, Check, Circle, Filter, Search, Send, User } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQueryState } from "nuqs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import scrollIntoView from "scroll-into-view-if-needed";
import { HandHello } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/[category]/icons/handHello";
import { InboxZero } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/[category]/icons/inboxZero";
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
import { useConversationListContext } from "./conversationListContext";
import { AssigneeFilter } from "./filters/assigneeFilter";
import { CustomerFilter } from "./filters/customerFilter";
import { DateFilter } from "./filters/dateFilter";
import { EventFilter } from "./filters/eventFilter";
import { highlightKeywords } from "./filters/highlightKeywords";
import { PromptFilter } from "./filters/promptFilter";
import { ReactionFilter } from "./filters/reactionFilter";
import { ResponderFilter } from "./filters/responderFilter";
import { VipFilter } from "./filters/vipFilter";
import NewConversationModalContent from "./newConversationModal";

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
              <SelectTrigger variant="bare" className="text-foreground [&>svg]:text-foreground">
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
            <div className="text-sm text-foreground">{statusOptions[0].label}</div>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Select value={sortOptions.find(({ selected }) => selected)?.value || ""} onValueChange={onSortChange}>
            <SelectTrigger variant="bare" className="text-foreground [&>svg]:text-foreground">
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
    reactionType: searchParams.reactionType ?? null,
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
      reactionType: searchParams.reactionType ?? null,
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
    <div className="flex items-center justify-between gap-6 py-1">
      <div className="flex items-center gap-2">
        {statusOptions.length > 1 ? (
          <Select
            value={statusOptions.find(({ selected }) => selected)?.value || ""}
            onValueChange={handleStatusFilterChange}
          >
            <SelectTrigger variant="bare" className="text-foreground [&>svg]:text-foreground text-sm">
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
          <div className="text-sm text-foreground">{statusOptions[0].label}</div>
        ) : null}
      </div>
      <div className="flex-1 max-w-[400px]">
        <Input
          ref={searchInputRef}
          placeholder="Search conversations"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 rounded-full text-sm"
          iconsPrefix={<Search className="ml-1 h-4 w-4 text-foreground" />}
          autoFocus
        />
      </div>
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

  const isOnboarding =
    !conversationListData?.onboardingState.hasResend ||
    !conversationListData?.onboardingState.hasWidgetHost ||
    !conversationListData?.onboardingState.hasGmailSupportEmail;

  return (
    <div className="flex flex-col w-full h-full">
      <div className="px-3 md:px-6 py-2 md:py-4 shrink-0 border-b border-border">
        <div className="flex flex-col gap-2 md:gap-4">
          {searchBar}
          {showFilters && (
            <div className="flex flex-wrap justify-center gap-1 md:gap-2">
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
              <VipFilter isVip={filterValues.isVip} onChange={(isVip) => updateFilter({ isVip })} />
              <ReactionFilter
                reactionType={filterValues.reactionType ?? null}
                onChange={(reactionType) => updateFilter({ reactionType })}
              />
              <EventFilter selectedEvents={filterValues.events} onChange={(events) => updateFilter({ events })} />
              <PromptFilter isPrompt={filterValues.isPrompt} onChange={(isPrompt) => updateFilter({ isPrompt })} />
            </div>
          )}
        </div>
      </div>
      {isPending ? (
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : isOnboarding ? (
        <div className="mx-auto flex-1 flex flex-col items-center justify-center gap-6 text-muted-foreground">
          <HandHello className="w-36 h-36 -mb-10" />
          <h2 className="text-xl text-center font-semibold text-foreground">Welcome! Let's complete your setup.</h2>
          <div className="grid gap-2">
            <Link
              href={`/mailboxes/${input.mailboxSlug}/settings?tab=in-app-chat`}
              className="border transition-colors hover:border-foreground rounded-lg p-4"
            >
              <div className="flex items-center gap-2">
                {conversationListData?.onboardingState.hasWidgetHost ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Circle className="w-5 h-5" />
                )}
                <p className={cn(conversationListData?.onboardingState.hasWidgetHost && "line-through")}>
                  Add the chat widget to your website
                </p>
              </div>
              {!conversationListData?.onboardingState.hasWidgetHost && (
                <div className="mt-2 flex items-center gap-1 ml-7 text-sm text-bright">
                  Learn how <ArrowRight className="w-4 h-4" />
                </div>
              )}
            </Link>
            <Link
              href="https://helper.ai/docs/integrations#resend"
              target="_blank"
              className="border transition-colors hover:border-foreground rounded-lg p-4"
            >
              <div className="flex items-center gap-2">
                {conversationListData?.onboardingState.hasResend ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Circle className="w-5 h-5" />
                )}
                <p className={cn(conversationListData?.onboardingState.hasResend && "line-through")}>
                  Set up Resend to send emails from Helper
                </p>
              </div>
              {!conversationListData?.onboardingState.hasResend && (
                <div className="mt-2 flex items-center gap-1 ml-7 text-sm text-bright">
                  Learn how <ArrowRight className="w-4 h-4" />
                </div>
              )}
            </Link>
            <Link
              href="https://helper.ai/docs/integrations#gmail"
              className="border transition-colors hover:border-foreground rounded-lg p-4"
            >
              <div className="flex items-center gap-2">
                {conversationListData?.onboardingState.hasGmailSupportEmail ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Circle className="w-5 h-5" />
                )}
                <p className={cn(conversationListData?.onboardingState.hasGmailSupportEmail && "line-through")}>
                  Connect Gmail to handle your incoming emails
                </p>
              </div>
              {!conversationListData?.onboardingState.hasGmailSupportEmail && (
                <div className="mt-2 flex items-center gap-1 ml-7 text-sm text-bright">
                  Learn how <ArrowRight className="w-4 h-4" />
                </div>
              )}
            </Link>
          </div>
        </div>
      ) : conversations.length === 0 && (!input.status?.length || input.status?.[0] === "open") ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <InboxZero className="h-60 w-60 dark:text-bright" />
          <h2 className="font-semibold mb-2">No open tickets</h2>
          <p className="text-sm text-muted-foreground">You're all caught up!</p>
        </div>
      ) : (
        <div ref={resultsContainerRef} className="flex-1 overflow-y-auto">
          {conversations.length > 0 && (
            <div className="flex items-center justify-between gap-4 mb-4 px-3 md:px-6 pt-4">
              <div className="flex items-center gap-4">
                <div className="w-5 flex items-center">
                  <Checkbox
                    checked={allConversationsSelected || selectedConversations.length > 0}
                    onCheckedChange={toggleAllConversations}
                    id="select-all"
                  />
                </div>
                <div className="flex items-center gap-4">
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
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Select
                  value={sortOptions.find(({ selected }) => selected)?.value || ""}
                  onValueChange={handleSortChange}
                >
                  <SelectTrigger variant="bare" className="text-foreground [&>svg]:text-foreground text-sm">
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

const ListItem = ({
  conversation,
  isActive,
  onSelectConversation,
  variant,
  isSelected,
  onToggleSelect,
}: ListItemProps) => {
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
    <div className={cn("px-2", variant === "mobile" && "px-1")}>
      <div
        className={cn(
          "flex w-full cursor-pointer flex-col  transition-colors border-b border-border",
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
                      className={cn(
                        "flex items-center gap-1 text-muted-foreground",
                        variant === "mobile" ? "text-[10px]" : "text-xs",
                      )}
                      assignedToId={conversation.assignedToId}
                      assignedToAI={conversation.assignedToAI}
                    />
                  )}
                  <div className={cn("text-muted-foreground", variant === "mobile" ? "text-[10px]" : "text-xs")}>
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
                  className={cn("font-medium text-foreground", variant === "mobile" ? "text-sm" : "text-base")}
                  dangerouslySetInnerHTML={{ __html: highlightedSubject }}
                />
                {searchTerms.length > 0 && highlightedBody && (
                  <p
                    className={cn(
                      "text-muted-foreground line-clamp-2 whitespace-pre-wrap",
                      variant === "mobile" ? "text-xs" : "text-sm",
                    )}
                    dangerouslySetInnerHTML={{ __html: highlightedBody }}
                  />
                )}
                <div className="flex items-center gap-2">
                  {conversation.status === "open" ? (
                    <Badge
                      variant="success-light"
                      className={cn(
                        "gap-1.5 dark:bg-success dark:text-success-foreground",
                        variant === "mobile" && "text-xs",
                      )}
                    >
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
