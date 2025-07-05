import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { api } from "@/trpc/react";

export const useSaveLatestMailboxSlug = (mailboxSlug: string | undefined) => {
  const lastMailboxSlug = useRef<string | null>(null);
  const updateLastMailboxSlug = api.organization.updateLastMailboxSlug.useMutation();
  useEffect(() => {
    if (mailboxSlug && lastMailboxSlug.current !== mailboxSlug) {
      lastMailboxSlug.current = mailboxSlug;
      updateLastMailboxSlug.mutate({ mailboxSlug });
    }
  }, [mailboxSlug]);
};
