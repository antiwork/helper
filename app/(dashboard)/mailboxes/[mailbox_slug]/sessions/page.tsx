import { api } from "@/trpc/server";
import SessionsList from "./sessionsList";

type PageProps = {
  mailbox_slug: string;
};

const Page = async (props: { params: Promise<PageProps> }) => {
  const { mailbox_slug } = await props.params;
  const limit = 10;
  const mailboxData = await api.mailbox.get({ mailboxSlug: mailbox_slug });

  return (
    <div className="flex flex-col h-full">
      <SessionsList mailbox={mailboxData} limit={limit} />
    </div>
  );
};

export default Page;
