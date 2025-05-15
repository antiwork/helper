import { data } from "motion/react-client";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { api } from "@/trpc/server";

const Page = async () => {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  console.log(data, error);
  if (!user) return redirect("/auth/login");

  const mailboxes = await api.mailbox.list();
  if (mailboxes.find(({ slug }) => slug === user.user_metadata.lastMailboxSlug))
    return redirect(`/mailboxes/${user.user_metadata.lastMailboxSlug}/mine`);
  else if (mailboxes[0]) return redirect(`/mailboxes/${mailboxes[0].slug}/mine`);
  throw new Error("No mailbox found");
};

export default Page;
