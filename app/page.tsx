import { redirect } from "next/navigation";
import { getMailbox } from "@/lib/data/mailbox";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import { createClient } from "@/lib/supabase/server";

export default async function Page() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) captureExceptionAndLog(error);
  if (!user) return redirect("/login");

  const mailbox = await getMailbox();
  if (mailbox) return redirect("/mine");
  return redirect("/login");
}
