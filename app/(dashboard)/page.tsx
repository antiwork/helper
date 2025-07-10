import { redirect } from "next/navigation";
import { getAllMailboxes } from "@/lib/data/mailbox";
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

  const mailboxes = await getAllMailboxes();
  if (mailboxes.length > 0) {
    return redirect("/mine");
  }

  return redirect("/login");
};

export default Page;
