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

  const mailboxes = await api.mailbox.list();
  if (mailboxes.find(({ slug }) => slug === user.user_metadata.lastMailboxSlug))
    return redirect(`/mailboxes/${user.user_metadata.lastMailboxSlug}/mine`);
  else if (mailboxes[0]) return redirect(`/mailboxes/${mailboxes[0].slug}/mine`);
  return redirect("/login");
};

export default Page;
