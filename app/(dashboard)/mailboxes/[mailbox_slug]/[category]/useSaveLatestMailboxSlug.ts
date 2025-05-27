import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export const useSaveLatestMailboxSlug = (mailboxSlug: string | undefined) => {
  const lastMailboxSlug = useRef<string | null>(null);
  useEffect(() => {
    if (mailboxSlug && lastMailboxSlug.current !== mailboxSlug) {
      lastMailboxSlug.current = mailboxSlug;
      supabase.auth.updateUser({ data: { lastMailboxSlug: mailboxSlug } });
    }
  }, [mailboxSlug]);
};
