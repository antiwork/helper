import { Skeleton } from "@/components/ui/skeleton";
import { RouterOutputs } from "@/trpc";
import MailboxNameSetting from "./mailboxNameSetting";

const MailboxSetting = ({ mailbox }: { mailbox: RouterOutputs["mailbox"]["get"] }) => {
  return (
    <div className="space-y-6">
      {mailbox ? <MailboxNameSetting mailbox={mailbox} /> : <Skeleton className="h-12 w-full" />}
    </div>
  );
};

export default MailboxSetting;
