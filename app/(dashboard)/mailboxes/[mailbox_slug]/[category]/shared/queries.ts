import { useParams } from "next/navigation";
import { parseAsStringEnum, useQueryStates } from "nuqs";

export const useConversationsListInput = () => {
  const params = useParams<{
    mailbox_slug: string;
    category: "conversations" | "assigned" | "unassigned" | "mine";
  }>();
  const [searchParams, setSearchParams] = useQueryStates({
    status: parseAsStringEnum(["open", "closed", "spam"] as const),
    sort: parseAsStringEnum(["oldest", "newest", "highest_value"] as const),
  });

  const input = {
    mailboxSlug: params.mailbox_slug,
    status: searchParams.status ? [searchParams.status] : null,
    sort: searchParams.sort,
    category: params.category,
    search: null,
  };

  return { input, searchParams, setSearchParams };
};
