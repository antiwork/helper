import { useParams } from "next/navigation";
import { parseAsArrayOf, parseAsBoolean, parseAsInteger, parseAsString, parseAsStringEnum, useQueryStates } from "nuqs";

export const useConversationsListInput = () => {
  const params = useParams<{
    category: "all" | "assigned" | "unassigned" | "mine";
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
    events: parseAsArrayOf(parseAsStringEnum(["request_human_support"] as const)),
    issueGroupId: parseAsInteger,
    isAssigned: parseAsBoolean,
    hasUnreadMessages: parseAsBoolean,
  });

  const input = {
    status: searchParams.status ? [searchParams.status] : ["open"],
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
    issueGroupId: searchParams.issueGroupId ?? undefined,
    isAssigned: searchParams.isAssigned ?? undefined,
    hasUnreadMessages: searchParams.hasUnreadMessages ?? undefined,
    displayUnreadBehavior: ["mine", "assigned"].includes(params.category),
  };

  return { input, searchParams, setSearchParams };
};
