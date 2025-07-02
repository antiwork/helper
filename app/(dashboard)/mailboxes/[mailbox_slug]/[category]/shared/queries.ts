import { useParams } from "next/navigation";
import { parseAsArrayOf, parseAsBoolean, parseAsString, parseAsStringEnum, useQueryStates } from "nuqs";

export const useConversationsListInput = () => {
  const params = useParams<{
    mailbox_slug: string;
    category: "conversations" | "assigned" | "unassigned" | "mine";
  }>();
  const [searchParams, setSearchParams] = useQueryStates({
    status: parseAsStringEnum(["open", "closed", "spam"] as const),
    sort: parseAsStringEnum(["oldest", "newest", "highest_value"] as const),
    search: parseAsString,
    assignee: parseAsArrayOf(parseAsString),
    createdAfter: parseAsString,
    createdBefore: parseAsString,
    repliedBy: parseAsArrayOf(parseAsString),
    customer: parseAsArrayOf(parseAsString),
    isVip: parseAsBoolean,
    isPrompt: parseAsBoolean,
    reactionType: parseAsStringEnum(["thumbs-up", "thumbs-down"] as const),
    events: parseAsArrayOf(parseAsStringEnum(["request_human_support", "resolved_by_ai"] as const)),
    closedBy: parseAsStringEnum(["ai", "human"] as const),
  });

  const input = {
    mailboxSlug: params.mailbox_slug,
    status: searchParams.status ? [searchParams.status] : null,
    sort: searchParams.sort,
    category: params.category,
    search: searchParams.search ?? null,
    assignee: searchParams.assignee ?? undefined,
    createdAfter: searchParams.createdAfter ?? undefined,
    createdBefore: searchParams.createdBefore ?? undefined,
    repliedBy: searchParams.repliedBy ?? undefined,
    customer: searchParams.customer ?? undefined,
    isVip: searchParams.isVip ?? undefined,
    isPrompt: searchParams.isPrompt ?? undefined,
    reactionType: searchParams.reactionType ?? undefined,
    events: searchParams.events ?? undefined,
    closedBy: searchParams.closedBy ?? undefined,
  };

  return { input, searchParams, setSearchParams };
};
