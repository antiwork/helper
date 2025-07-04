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

  const mailbox = await api.mailbox.get();
  if (mailbox) {
    return redirect(`/mailboxes/${mailbox.slug}/mine`);
  }
  return redirect("/login");
};

export default Page;
