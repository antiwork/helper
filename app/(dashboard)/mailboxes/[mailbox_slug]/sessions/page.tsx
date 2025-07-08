import { api } from "@/trpc/server";
import SessionsList from "./sessionsList";

const Page = async () => {
  const limit = 10;
  const mailboxData = await api.mailbox.get();

  return (
    <div className="flex flex-col h-full">
      <SessionsList mailbox={mailboxData} limit={limit} />
    </div>
  );
};

export default Page;
