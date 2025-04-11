import { getGuideSessionsForMailbox } from "@/lib/data/guide";
import { api } from "@/trpc/server";
import SessionsList from "./_components/sessions-list";

type PageProps = {
  mailbox_slug: string;
};

const Page = async (props: { params: Promise<PageProps> }) => {
  const params = await props.params;
  const mailboxPath = `/mailboxes/${params.mailbox_slug}` as const;

  const [mailboxData] = await Promise.all([api.mailbox.get({ mailboxSlug: params.mailbox_slug })]);
  const guideSessions = await getGuideSessionsForMailbox(mailboxData.id);

  return (
    <>
      <title>Guide Sessions</title>
      <SessionsList mailbox={mailboxData} guideSessions={guideSessions} />
    </>
  );
};

export default Page;
