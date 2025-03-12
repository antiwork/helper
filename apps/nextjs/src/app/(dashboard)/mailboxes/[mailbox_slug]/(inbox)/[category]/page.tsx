import Inbox from "@/app/(dashboard)/mailboxes/[mailbox_slug]/(inbox)/_components/inbox";
import { getUrlParams } from "@/components/utils/urls";
import { captureExceptionAndLogIfDevelopment } from "@/lib/shared/sentry";
import { api } from "@/trpc/server";

type PageProps = {
  category: "conversations" | "mine" | "assigned";
  mailbox_slug: string;
};
const Page = async (props: {
  params: Promise<PageProps>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) => {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const urlParams = getUrlParams(searchParams);
  const conversationSlug = urlParams.get("id");
  const status = urlParams.get("status");
  try {
    void api.mailbox.conversations.list.prefetch({
      mailboxSlug: params.mailbox_slug,
      status: status ? [status] : null,
      cursor: null,
      sort: urlParams.get("sort") ?? null,
      search: urlParams.get("search") ?? null,
      category: params.category,
    });
    if (conversationSlug) {
      void api.mailbox.conversations.get.prefetch({ mailboxSlug: params.mailbox_slug, conversationSlug });
    }
  } catch (error) {
    captureExceptionAndLogIfDevelopment(error);
  }
  return <Inbox />;
};

export default Page;
