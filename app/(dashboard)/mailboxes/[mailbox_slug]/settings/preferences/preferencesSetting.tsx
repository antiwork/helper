import { Skeleton } from "@/components/ui/skeleton";
import { RouterOutputs } from "@/trpc";
import ConfettiSetting from "./confettiSetting";
import MailboxNameSetting from "./mailboxNameSetting";

const PreferencesSetting = ({ mailbox }: { mailbox: RouterOutputs["mailbox"]["get"] }) => {
  return (
    <div className="space-y-6">
      {mailbox ? (
        <>
          <MailboxNameSetting mailbox={mailbox} />
          <ConfettiSetting mailbox={mailbox} />
        </>
      ) : (
        <>
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </>
      )}
    </div>
  );
};

export default PreferencesSetting;
