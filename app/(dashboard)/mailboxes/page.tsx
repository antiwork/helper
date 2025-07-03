import { redirect } from "next/navigation";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import { createClient } from "@/lib/supabase/server";

const Page = async () => {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) captureExceptionAndLog(error);
  if (!user) return redirect("/login");

  // Since we removed mailbox switching, redirect to the default mailbox
  const mailboxSlug = user.user_metadata.lastMailboxSlug || "mailbox";
  return redirect(`/mailboxes/${mailboxSlug}/mine`);
};

export default Page;
