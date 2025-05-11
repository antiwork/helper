"use client";

import { omit } from "lodash-es";
import { ArrowLeft, Check, DollarSign, Filter, Search, Star } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { parseAsArrayOf, parseAsBoolean, parseAsString, parseAsStringEnum, useQueryStates } from "nuqs";
import { useEffect, useRef, useState } from "react";
import { AssignedToLabel } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/[category]/list/conversationList";
import { ConversationListItem } from "@/app/types/global";
import { DEFAULT_CONVERSATIONS_PER_PAGE } from "@/components/constants";
import { toast } from "@/components/hooks/use-toast";
import HumanizedTime from "@/components/humanizedTime";
import LoadingSpinner from "@/components/loadingSpinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useDebouncedCallback } from "@/components/useDebouncedCallback";
import { formatCurrency } from "@/components/utils/currency";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { AssigneeFilter } from "./assigneeFilter";
import { CustomerFilter } from "./customerFilter";
import { DateFilter } from "./dateFilter";
import { EventFilter } from "./eventFilter";
import { highlightKeywords } from "./highlightKeywords";
import { PromptFilter } from "./promptFilter";
import { ReactionFilter } from "./reactionFilter";
import { ResponderFilter } from "./responderFilter";
import { StatusFilter } from "./statusFilter";
import { VipFilter } from "./vipFilter";

export default function SearchPage() {
  const params = useParams<{ mailbox_slug: string }>();
  const router = useRouter();

  const [searchParams, setSearchParams] = useQueryStates({
    search: parseAsString,
    status: parseAsArrayOf(parseAsStringEnum(["open", "closed", "spam"] as const)),
    assignee: parseAsArrayOf(parseAsString),
    createdAfter: parseAsString,
    createdBefore: parseAsString,
    repliedBy: parseAsArrayOf(parseAsString),
    customer: parseAsArrayOf(parseAsString),
    isVip: parseAsBoolean,
    isPrompt: parseAsBoolean,
    reactionType: parseAsStringEnum(["thumbs-up", "thumbs-down"] as const),
    events: parseAsArrayOf(parseAsStringEnum(["request_human_support", "resolved_by_ai"] as const)),
  });
  const debouncedSetSearchParams = useDebouncedCallback((newParams: Partial<typeof searchParams>) => {
    setSearchParams((params) => ({ ...params, ...newParams }));
  }, 300);
  const [filterValues, setFilterValues] = useState<typeof searchParams>(searchParams);
  const [selectedConversations, setSelectedConversations] = useState<number[]>([]);
  const [allConversationsSelected, setAllConversationsSelected] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const isSearching = Object.values(omit(searchParams, "page")).some((value) =>
    Array.isArray(value) ? value.length > 0 : !!value,
  );

  const utils = api.useUtils();
  const searchOptions = {
    sort: "newest",
    category: null,
    search: searchParams.search ?? null,
    status: searchParams.status ?? null,
    assignee: searchParams.assignee ?? undefined,
    createdAfter: searchParams.createdAfter ?? undefined,
    createdBefore: searchParams.createdBefore ?? undefined,
    repliedBy: searchParams.repliedBy ?? undefined,
    customer: searchParams.customer ?? undefined,
    isVip: searchParams.isVip ?? undefined,
    isPrompt: searchParams.isPrompt ?? undefined,
    reactionType: searchParams.reactionType ?? undefined,
    events: searchParams.events ?? undefined,
  };
  const { data, isFetching, hasNextPage, fetchNextPage } = api.mailbox.conversations.list.useInfiniteQuery(
    { mailboxSlug: params.mailbox_slug, ...searchOptions },
    {
      enabled: isSearching,
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? null,
    },
  );

  const { mutateAsync: bulkUpdate, isPending: isBulkUpdating } = api.mailbox.conversations.bulkUpdate.useMutation({
    onError: () => {
      toast({
        variant: "destructive",
        title: "Failed to update conversations",
      });
    },
  });

  const searchResults = data?.pages.flatMap((page) => page.conversations) ?? [];
  const totalResults = data?.pages[data.pages.length - 1]?.total ?? 0;

  const updateFilter = (updates: Partial<typeof searchParams>) => {
    setFilterValues((prev) => ({ ...prev, ...updates }));
    debouncedSetSearchParams(updates);
  };

  const loadMoreRef = useRef<HTMLDivElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetching) {
          void fetchNextPage();
        }
      },
      { rootMargin: "500px", root: resultsContainerRef.current },
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetching, fetchNextPage]);

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
      setSelectedConversations(searchResults.flatMap((c) => (c.id === id ? [] : [c.id])));
    } else {
      setSelectedConversations(
        selectedConversations.includes(id)
          ? selectedConversations.filter((selectedId) => selectedId !== id)
          : [...selectedConversations, id],
      );
    }
  };

  const handleBulkUpdate = async (status: "closed" | "spam") => {
    const conversationFilter = allConversationsSelected
      ? totalResults <= DEFAULT_CONVERSATIONS_PER_PAGE
        ? searchResults.map((c) => c.id)
        : searchOptions
      : selectedConversations;
    const { updatedImmediately } = await bulkUpdate({ conversationFilter, status, mailboxSlug: params.mailbox_slug });
    setAllConversationsSelected(false);
    setSelectedConversations([]);
    void utils.mailbox.conversations.list.invalidate();
    if (!updatedImmediately) {
      toast({ title: "Starting update, refresh to see status." });
    }
  };

  const getActiveFilterCount = () => {
    return Object.values(omit(filterValues, ["search"])).reduce((count, value) => {
      if (Array.isArray(value)) {
        return count + (value.length > 0 ? 1 : 0);
      }
      return count + (value ? 1 : 0);
    }, 0);
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex  justify-between border-b border-border px-2 py-4">
        <Button
          variant="ghost"
          iconOnly
          className="mt-1 hidden md:flex"
          onClick={() => {
            if (window.history.length > 1) {
              router.back();
            } else {
              router.push(`/mailboxes/${params.mailbox_slug}/conversations`);
            }
          }}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 max-w-5xl mx-auto flex flex-col gap-3 md:px-0">
          <div className="flex items-center gap-2 px-2 md:px-0">
            <Button
              variant="ghost"
              iconOnly
              className="md:hidden"
              onClick={() => {
                if (window.history.length > 1) {
                  router.back();
                } else {
                  router.push(`/mailboxes/${params.mailbox_slug}/conversations`);
                }
              }}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1">
              <Input
                value={filterValues.search ?? ""}
                onChange={(e) => updateFilter({ search: e.target.value })}
                placeholder="Search conversations..."
                iconsSuffix={
                  <div className="flex items-center gap-2">
                    <Search className="hidden md:block h-5 w-5 text-muted-foreground" />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowFilters(!showFilters)}
                      className="md:hidden gap-1.5"
                    >
                      <Filter className="h-5 w-5" />
                      {getActiveFilterCount() > 0 && <span className="text-xs">({getActiveFilterCount()})</span>}
                    </Button>
                  </div>
                }
                className="text-base px-4 py-3"
                autoFocus
              />
            </div>
          </div>
          <div className={cn("md:hidden", !showFilters && "hidden")}>
            <div className="flex flex-wrap gap-2 justify-center">
              <StatusFilter
                selectedStatuses={filterValues.status ?? []}
                onChange={(statuses) => updateFilter({ status: statuses })}
              />
              <DateFilter
                initialStartDate={filterValues.createdAfter}
                initialEndDate={filterValues.createdBefore}
                onSelect={(startDate, endDate) => {
                  updateFilter({ createdAfter: startDate, createdBefore: endDate });
                }}
              />
              <AssigneeFilter
                selectedAssignees={filterValues.assignee ?? []}
                onChange={(assignees) => updateFilter({ assignee: assignees })}
              />
              <ResponderFilter
                selectedResponders={filterValues.repliedBy ?? []}
                onChange={(responders) => updateFilter({ repliedBy: responders })}
              />
              <CustomerFilter
                selectedCustomers={filterValues.customer ?? []}
                onChange={(customers) => updateFilter({ customer: customers })}
              />
              <VipFilter isVip={filterValues.isVip ?? undefined} onChange={(isVip) => updateFilter({ isVip })} />
              <ReactionFilter
                reactionType={filterValues.reactionType}
                onChange={(reactionType) => updateFilter({ reactionType })}
              />
              <EventFilter selectedEvents={filterValues.events ?? []} onChange={(events) => updateFilter({ events })} />
              <PromptFilter
                isPrompt={filterValues.isPrompt ?? undefined}
                onChange={(isPrompt) => updateFilter({ isPrompt })}
              />
            </div>
          </div>
          <div className="hidden md:flex gap-3 overflow-x-auto">
            <StatusFilter
              selectedStatuses={filterValues.status ?? []}
              onChange={(statuses) => updateFilter({ status: statuses })}
            />
            <DateFilter
              initialStartDate={filterValues.createdAfter}
              initialEndDate={filterValues.createdBefore}
              onSelect={(startDate, endDate) => {
                updateFilter({ createdAfter: startDate, createdBefore: endDate });
              }}
            />
            <AssigneeFilter
              selectedAssignees={filterValues.assignee ?? []}
              onChange={(assignees) => updateFilter({ assignee: assignees })}
            />
            <ResponderFilter
              selectedResponders={filterValues.repliedBy ?? []}
              onChange={(responders) => updateFilter({ repliedBy: responders })}
            />
            <CustomerFilter
              selectedCustomers={filterValues.customer ?? []}
              onChange={(customers) => updateFilter({ customer: customers })}
            />
            <VipFilter isVip={filterValues.isVip ?? undefined} onChange={(isVip) => updateFilter({ isVip })} />
            <ReactionFilter
              reactionType={filterValues.reactionType}
              onChange={(reactionType) => updateFilter({ reactionType })}
            />
            <EventFilter selectedEvents={filterValues.events ?? []} onChange={(events) => updateFilter({ events })} />
            <PromptFilter
              isPrompt={filterValues.isPrompt ?? undefined}
              onChange={(isPrompt) => updateFilter({ isPrompt })}
            />
          </div>
        </div>
        <div className="w-1 lg:w-10" />
      </div>

      <div className="flex-1 overflow-y-auto md:p-4" ref={resultsContainerRef}>
        {isSearching ? (
          searchResults.length === 0 && !isFetching ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
              <Search className="h-12 w-12 mb-4" />
              <p className="text-lg">No conversations found</p>
            </div>
          ) : (
            <div className="max-w-5xl mx-auto">
              {searchResults.length > 0 && (
                <div className="flex items-center gap-4 mb-4 px-4 pt-4 md:pt-0">
                  <div className="w-5 flex items-center">
                    <Checkbox
                      checked={allConversationsSelected || selectedConversations.length > 0}
                      onCheckedChange={toggleAllConversations}
                      id="select-all"
                      disabled={!allConversationsSelected && !selectedConversations.length && totalResults > 10_000}
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
                              : "Select all"}
                        </label>
                      </TooltipTrigger>
                      {!allConversationsSelected && !selectedConversations.length && totalResults > 10_000 && (
                        <TooltipContent side="right">Up to 10,000 conversations can be updated at once</TooltipContent>
                      )}
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
                  <span className="ml-auto text-sm text-muted-foreground">{totalResults} results</span>
                </div>
              )}
              <div className="flex flex-col gap-0.5">
                {searchResults.map((conversation) => (
                  <SearchResultItem
                    key={conversation.id}
                    conversation={conversation}
                    searchTerms={searchParams.search?.split(" ").filter(Boolean) ?? []}
                    isSelected={allConversationsSelected || selectedConversations.includes(conversation.id)}
                    onToggleSelect={() => toggleConversation(conversation.id)}
                  />
                ))}
              </div>
              {isFetching && (
                <div className="flex justify-center p-4">
                  <LoadingSpinner size="md" />
                </div>
              )}
              {hasNextPage && <div ref={loadMoreRef} className="h-10" />}
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}

function SearchResultItem({
  conversation,
  searchTerms,
  isSelected,
  onToggleSelect,
}: {
  conversation: ConversationListItem;
  searchTerms: string[];
  isSelected: boolean;
  onToggleSelect: () => void;
}) {
  const params = useParams<{ mailbox_slug: string }>();
  const status = conversation.status ?? "open";

  let highlightedText = highlightKeywords(conversation.matchedMessageText?.replace(/\s+/g, " ") ?? "", searchTerms);
  const highlightIndex = highlightedText.indexOf("<mark");
  if (highlightIndex > 100) {
    const splitIndex = highlightedText.slice(0, highlightIndex - 100).lastIndexOf(" ");
    highlightedText = `...${highlightedText.slice(splitIndex === -1 ? 0 : splitIndex)}`;
  }

  return (
    <div
      className={cn(
        "flex items-start gap-4 py-4 px-4 md:px-4 transition-colors",
        isSelected
          ? "bg-amber-50 dark:bg-white/5 border-l-4 border-l-amber-400"
          : "hover:bg-gray-50 dark:hover:bg-white/[0.02]",
      )}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={onToggleSelect}
        onClick={(e) => e.stopPropagation()}
        className="mt-1"
      />
      <Link
        href={`/mailboxes/${params.mailbox_slug}/conversations?id=${conversation.slug}`}
        className="flex-1 min-w-0 overflow-hidden"
      >
        <div className="flex items-start justify-between gap-4 md:gap-4 gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground">{conversation.emailFrom}</p>
            <p
              className="text-base font-medium text-foreground mb-2"
              dangerouslySetInnerHTML={{ __html: highlightKeywords(conversation.subject, searchTerms) }}
            />
            <div className="flex items-center gap-2 mb-2">
              {status === "open" ? (
                <Badge variant="success-light" className="gap-1.5 dark:bg-success dark:text-success-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-success dark:bg-white" />
                  Open
                </Badge>
              ) : (
                status === "closed" && (
                  <Badge variant="gray" className="gap-1.5">
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
                        <Badge variant="bright" className="gap-1">
                          <Star className="h-3.5 w-3.5" />
                          {formatCurrency(parseFloat(conversation.platformCustomer.value))}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="left">VIP</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <Badge variant="gray" className="gap-1">
                    <DollarSign className="h-3 w-3" />
                    {formatCurrency(parseFloat(conversation.platformCustomer.value))}
                  </Badge>
                ))}
            </div>
            {highlightedText && (
              <p
                className="text-sm text-muted-foreground line-clamp-2 whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: highlightedText }}
              />
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {conversation.assignedToClerkId && (
              <AssignedToLabel
                className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400"
                assignedToClerkId={conversation.assignedToClerkId}
              />
            )}
            <div className="text-xs text-gray-500 dark:text-gray-400">
              <HumanizedTime
                time={conversation.lastUserEmailCreatedAt ?? conversation.updatedAt}
                titlePrefix="Last email received on"
              />
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
