import { getGuideSessionsForMailbox } from "@/lib/data/guide";
import { api } from "@/trpc/server";
import SessionsList from "./_components/sessions-list";

type PageProps = {
  mailbox_slug: string;
};

// Define search params type
type SearchParams = {
  page?: string;
  limit?: string;
};

const Page = async (props: {
  params: PageProps;
  searchParams: SearchParams; // Keep SearchParams for potential future filtering/sorting
}) => {
  const { params, searchParams } = props;

  // Define the limit/page size
  const limit = 10; // Or read from searchParams if you want it configurable

  // Fetch mailbox data (still needed for header etc.)
  const mailboxData = await api.mailbox.get({ mailboxSlug: params.mailbox_slug });

  return (
    <div className="flex flex-col h-full">
      {/* <title>Guide Sessions</title> - Title should be handled by layout.tsx or metadata */}
      <SessionsList
        mailbox={mailboxData}
        limit={limit}
      />
    </div>
  );
};

export default Page;
