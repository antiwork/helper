import { redirect } from "next/navigation";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import { createClient } from "@/lib/supabase/server";
import { api } from "@/trpc/server";

const Page = async () => {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) captureExceptionAndLog(error);
  if (!user) return redirect("/login");

  const lastMailboxSlug = user.user_metadata.lastMailboxSlug;
  if (lastMailboxSlug) {
    try {
      await api.mailbox.get({ mailboxSlug: lastMailboxSlug });
      return redirect(`/mailboxes/${lastMailboxSlug}/mine`);
    } catch (error) {
      captureExceptionAndLog(error);
    }
  }

  try {
    await api.mailbox.get({ mailboxSlug: "mailbox" });
    return redirect(`/mailboxes/mailbox/mine`);
  } catch (error) {
    captureExceptionAndLog(error);
  }

  return redirect("/login");
};

export default Page;
